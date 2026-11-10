import fs from "fs";
import path from "path";

/**
 * Storage adapter. Everything in the app reads/writes the vault through this
 * interface so a different backend (LocalFs, GitHub, WebDAV)
 * can be dropped in without touching the rest of the code.
 * All paths are POSIX-style and relative to the vault root.
 */
export interface DirEntry {
  name: string;
  isDir: boolean;
}

export interface Storage {
  read(p: string): Promise<string>;
  write(p: string, content: string): Promise<void>;
  readBinary(p: string): Promise<Buffer>;
  writeBinary(p: string, data: Buffer): Promise<void>;
  exists(p: string): Promise<boolean>;
  list(dir: string): Promise<DirEntry[]>;
  mtime(p: string): Promise<number>;
}

// Serialises writes per file so concurrent requests cannot interleave.
const locks = new Map<string, Promise<unknown>>();
export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) || Promise.resolve();
  const next = prev.catch(() => undefined).then(fn);
  locks.set(key, next);
  try {
    return await next;
  } finally {
    if (locks.get(key) === next) locks.delete(key);
  }
}

export class LocalFsStorage implements Storage {
  constructor(private root: string) {}

  private abs(p: string): string {
    const full = path.resolve(this.root, p);
    const rel = path.relative(this.root, full);
    if (rel.startsWith("..") || path.isAbsolute(rel)) throw new Error("Path escapes vault");
    return full;
  }

  async read(p: string) {
    return fs.promises.readFile(this.abs(p), "utf-8");
  }

  async write(p: string, content: string) {
    const full = this.abs(p);
    await fs.promises.mkdir(path.dirname(full), { recursive: true });
    // Atomic write: temp file then rename, to avoid half-written files being synced.
    const tmp = `${full}.${process.pid}.${Date.now()}.tmp`;
    await fs.promises.writeFile(tmp, content, "utf-8");
    await fs.promises.rename(tmp, full);
  }

  async readBinary(p: string) {
    return fs.promises.readFile(this.abs(p));
  }

  async writeBinary(p: string, data: Buffer) {
    const full = this.abs(p);
    await fs.promises.mkdir(path.dirname(full), { recursive: true });
    await fs.promises.writeFile(full, data);
  }

  async exists(p: string) {
    try {
      await fs.promises.access(this.abs(p));
      return true;
    } catch {
      return false;
    }
  }

  async list(dir: string): Promise<DirEntry[]> {
    try {
      const ents = await fs.promises.readdir(this.abs(dir), { withFileTypes: true });
      return ents.map((e) => ({ name: e.name, isDir: e.isDirectory() }));
    } catch {
      return [];
    }
  }

  async mtime(p: string) {
    const st = await fs.promises.stat(this.abs(p));
    return Math.floor(st.mtimeMs);
  }
}

/**
 * Cloud Storage Adapter: Reads & Writes vault markdown files directly to a GitHub Repository
 * via the GitHub REST API. This enables full cloud deployment on Vercel while syncing directly
 * with desktop Obsidian via Obsidian Git plugin.
 */
export class GitHubStorage implements Storage {
  private repo: string; // "owner/repo"
  private token?: string;
  private branch: string;
  private prefix: string;
  private treeCache: { at: number; tree: Array<{ path: string; type: string; sha: string }> } | null = null;
  private localMtimes = new Map<string, number>();

  constructor(opts: { repo: string; token?: string; branch?: string; prefix?: string }) {
    this.repo = opts.repo;
    this.token = opts.token;
    this.branch = opts.branch || "main";
    this.prefix = (opts.prefix || "").replace(/^\/+|\/+$/g, "");
  }

  private fullPath(p: string): string {
    const clean = p.replace(/^\/+/, "");
    return this.prefix ? `${this.prefix}/${clean}` : clean;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "CampaignHub-Vercel",
    };
    if (this.token) {
      h.Authorization = `Bearer ${this.token}`;
    }
    return h;
  }

  private async fetchTree() {
    // Cache git tree for 10 minutes to prevent exhausting API limits
    if (this.treeCache && Date.now() - this.treeCache.at < 600_000) {
      return this.treeCache.tree;
    }
    try {
      const res = await fetch(
        `https://api.github.com/repos/${this.repo}/git/trees/${this.branch}?recursive=1`,
        { headers: this.headers(), redirect: "follow", next: { revalidate: 600 } }
      );
      if (!res.ok) return this.treeCache?.tree || [];
      const data = await res.json();
      const tree = (data.tree || []) as Array<{ path: string; type: string; sha: string }>;
      this.treeCache = { at: Date.now(), tree };
      return tree;
    } catch {
      return this.treeCache?.tree || [];
    }
  }

  async read(p: string): Promise<string> {
    const fp = this.fullPath(p);
    // 1. Try raw.githubusercontent.com CDN (zero 60 req/hr rate limits, fast global edge)
    try {
      const rawUrl = `https://raw.githubusercontent.com/${this.repo}/${this.branch}/${encodeURI(fp)}`;
      const h: Record<string, string> = { "User-Agent": "CampaignHub" };
      if (this.token) h.Authorization = `Bearer ${this.token}`;
      const res = await fetch(rawUrl, { headers: h, redirect: "follow" });
      if (res.ok) {
        return await res.text();
      }
    } catch {
      /* fallback to REST API */
    }

    // 2. Fallback to GitHub REST API (handles private repos if token is provided)
    const res = await fetch(
      `https://api.github.com/repos/${this.repo}/contents/${encodeURIComponent(fp).replace(/%2F/g, "/")}?ref=${this.branch}`,
      { headers: this.headers(), redirect: "follow" }
    );
    if (!res.ok) throw new Error(`GitHub file not found: ${p}`);
    const data = await res.json();
    return Buffer.from(data.content, "base64").toString("utf-8");
  }

  async write(p: string, content: string): Promise<void> {
    const fp = this.fullPath(p);
    // Find existing sha if present
    let sha: string | undefined;
    try {
      const checkRes = await fetch(
        `https://api.github.com/repos/${this.repo}/contents/${encodeURIComponent(fp).replace(/%2F/g, "/")}?ref=${this.branch}`,
        { headers: this.headers(), redirect: "follow" }
      );
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        sha = checkData.sha;
      }
    } catch {
      /* ignore */
    }

    const body: Record<string, any> = {
      message: `Update ${p} via Campaign Hub`,
      content: Buffer.from(content).toString("base64"),
      branch: this.branch,
    };
    if (sha) body.sha = sha;

    const res = await fetch(
      `https://api.github.com/repos/${this.repo}/contents/${encodeURIComponent(fp).replace(/%2F/g, "/")}`,
      {
        method: "PUT",
        headers: {
          ...this.headers(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        redirect: "follow",
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to commit to GitHub: ${errText}`);
    }

    this.localMtimes.set(p, Date.now());
    this.treeCache = null; // Invalidate cache
  }

  async readBinary(p: string): Promise<Buffer> {
    const fp = this.fullPath(p);
    try {
      const rawUrl = `https://raw.githubusercontent.com/${this.repo}/${this.branch}/${encodeURI(fp)}`;
      const h: Record<string, string> = { "User-Agent": "CampaignHub" };
      if (this.token) h.Authorization = `Bearer ${this.token}`;
      const res = await fetch(rawUrl, { headers: h, redirect: "follow" });
      if (res.ok) {
        const ab = await res.arrayBuffer();
        return Buffer.from(ab);
      }
    } catch {
      /* fallback */
    }

    const res = await fetch(
      `https://api.github.com/repos/${this.repo}/contents/${encodeURIComponent(fp).replace(/%2F/g, "/")}?ref=${this.branch}`,
      { headers: this.headers(), redirect: "follow" }
    );
    if (!res.ok) throw new Error(`GitHub file not found: ${p}`);
    const data = await res.json();
    return Buffer.from(data.content, "base64");
  }

  async writeBinary(p: string, data: Buffer): Promise<void> {
    await this.write(p, data.toString("base64"));
  }

  async exists(p: string): Promise<boolean> {
    const fp = this.fullPath(p);
    const tree = await this.fetchTree();
    if (tree.length > 0) {
      return tree.some((item) => item.path === fp);
    }
    // Fallback if tree was rate limited: check raw CDN directly
    try {
      const rawUrl = `https://raw.githubusercontent.com/${this.repo}/${this.branch}/${encodeURI(fp)}`;
      const res = await fetch(rawUrl, { method: "HEAD", redirect: "follow" });
      return res.ok;
    } catch {
      return false;
    }
  }

  async list(dir: string): Promise<DirEntry[]> {
    const fp = this.fullPath(dir);
    const tree = await this.fetchTree();
    const prefix = fp ? `${fp}/` : "";
    const directChildren = new Map<string, boolean>();

    for (const item of tree) {
      if (!item.path.startsWith(prefix)) continue;
      const rest = item.path.slice(prefix.length);
      if (!rest) continue;
      const parts = rest.split("/");
      const name = parts[0];
      const isDir = parts.length > 1 || item.type === "tree";
      if (!directChildren.has(name) || isDir) {
        directChildren.set(name, isDir);
      }
    }

    return Array.from(directChildren.entries()).map(([name, isDir]) => ({ name, isDir }));
  }

  async mtime(p: string): Promise<number> {
    return this.localMtimes.get(p) || Date.now();
  }
}

/** Recursively lists files (relative POSIX paths) under `dir`, skipping dot-folders. */
export async function walk(storage: Storage, dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const ent of await storage.list(dir)) {
    if (ent.name.startsWith(".")) continue;
    const rel = dir ? `${dir}/${ent.name}` : ent.name;
    if (ent.isDir) out.push(...(await walk(storage, rel)));
    else out.push(rel);
  }
  return out;
}
