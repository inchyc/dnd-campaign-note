import matter from "gray-matter";
import type { Ctx, HubUser } from "./auth";
import { walk } from "./storage";

export type Category = "npc" | "location" | "lore" | "quest" | "item" | "party" | "session";

export interface NoteMeta {
  path: string; // vault-relative, e.g. "Notes/NPCs/Rooprecht.md"
  title: string;
  category: Category;
  sub?: string;
  summary: string;
  status?: string;
  faction?: string;
  location?: string;
  priority?: string;
  secret: boolean;
  revealed: boolean;
  owner?: string; // for items: who claimed it (empty / "party" = unclaimed)
  visibleToParty: boolean;
  playerField?: string; // character-note owner (frontmatter `player:`)
  mtime: number;
}

export interface IndexedNote extends NoteMeta {
  raw: string; // full file text
  body: string; // markdown body without frontmatter
  frontmatter: Record<string, any>;
}

const PREFIXES = ["NPC - ", "Lore - ", "Item - ", "Faction - ", "Secret - ", "Location - "];

export function cleanTitle(stem: string): string {
  for (const p of PREFIXES) if (stem.startsWith(p)) return stem.slice(p.length);
  return stem;
}

export function normKey(s: string): string {
  return cleanTitle(
    s
      .replace(/\\/g, "/")
      .split("/")
      .pop()!
      .replace(/\.md$/i, "")
      .split("#")[0]
      .trim()
  )
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const TOP_FOLDERS: Record<string, { category: Category; sub?: string }> = {
  NPCs: { category: "npc" },
  Locations: { category: "location" },
  Lore: { category: "lore" },
  Factions: { category: "lore", sub: "Factions" },
  Investigations: { category: "quest" },
  "Inventory & Gear": { category: "item" },
  "PC Notes": { category: "party" },
  "Session Notes": { category: "session" },
};

/** Replaces %% hidden comments %% with the same number of newlines so line numbers still match the file. */
export function stripComments(text: string): string {
  return text.replace(/%%[\s\S]*?%%/g, (m) => m.replace(/[^\r\n]/g, ""));
}

/**
 * The text the browser renders: the whole file with the frontmatter lines blanked and
 * %% comments removed. Line N here is line N of the file, so tasks can be edited by line number.
 */
export function displayText(raw: string): string {
  const lines = raw.split(/\r?\n/);
  if (lines[0]?.trim() === "---") {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "---") {
        for (let j = 0; j <= i; j++) lines[j] = "";
        break;
      }
    }
  }
  return stripComments(lines.join("\n"));
}

function str(v: any): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (Array.isArray(v)) return v.flat().map(String).join(", ");
  return String(v);
}

function firstSummary(body: string): string {
  for (const line of stripComments(body).split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || t.startsWith("---")) continue;
    const clean = t
      .replace(/^[>\-*\s]+/, "")
      .replace(/^\[![^\]]+\][+-]?\s*/, "")
      .replace(/[*_`]/g, "")
      .replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, "$2")
      .trim();
    if (clean.length > 12 && !/^(quick bio|description|atmosphere)$/i.test(clean)) return clean.slice(0, 220);
  }
  return "";
}

// ---------- index (cached briefly; invalidated on write) ----------

const cache = new Map<string, { at: number; notes: IndexedNote[] }>();
const TTL = 3000;

export function invalidateIndex(campaignId: string) {
  cache.delete(campaignId);
}

export async function loadIndex(ctx: Pick<Ctx, "campaign" | "storage">): Promise<IndexedNote[]> {
  const hit = cache.get(ctx.campaign.id);
  if (hit && Date.now() - hit.at < TTL) return hit.notes;

  const files = (await walk(ctx.storage, "Notes")).filter((f) => f.toLowerCase().endsWith(".md"));
  const notes: IndexedNote[] = [];
  await Promise.all(
    files.map(async (file) => {
      const parts = file.split("/"); // Notes / <Top> / ...
      const top = TOP_FOLDERS[parts[1]];
      if (!top || parts.length < 3) return;
      try {
        const raw = await ctx.storage.read(file);
        const parsed = matter(raw);
        const fm = (parsed.data || {}) as Record<string, any>;
        const stem = parts[parts.length - 1].replace(/\.md$/i, "");
        const isSecretPath = parts.includes("Secrets") || stem.startsWith("Secret - ");
        const secret = isSecretPath || fm.secret === true || fm.dm_only === true;
        const sub = top.sub || (parts.length > 3 ? parts[2] : undefined);
        notes.push({
          path: file,
          title: cleanTitle(stem),
          category: top.category,
          sub,
          summary: firstSummary(parsed.content),
          status: str(fm.status),
          faction: str(fm.faction)?.replace(/\[\[|\]\]/g, ""),
          location: str(fm.location)?.replace(/\[\[|\]\]/g, ""),
          priority: str(fm.priority),
          secret,
          revealed: fm.revealed === true || fm.revealed === "true",
          owner: str(fm.owner),
          visibleToParty: fm.visible_to_party === true || fm.visible_to_party === "true",
          playerField: str(fm.player),
          mtime: await ctx.storage.mtime(file),
          raw,
          body: parsed.content,
          frontmatter: fm,
        });
      } catch {
        /* skip unreadable file */
      }
    })
  );
  notes.sort((a, b) => a.title.localeCompare(b.title));
  cache.set(ctx.campaign.id, { at: Date.now(), notes });
  return notes;
}

// ---------- permissions ----------

function same(a?: string, b?: string) {
  return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Does this note belong to the given player's character? */
export function ownsCharacterNote(user: HubUser, n: Pick<NoteMeta, "path" | "playerField" | "category">): boolean {
  if (n.category !== "party") return false;
  if (user.characterNotes?.includes(n.path)) return true;
  const f = n.playerField;
  return same(f, user.name) || same(f, user.character) || same(f, user.id);
}

/** Players hide the DM version of an index note when a "- Player" twin exists. */
function hasPlayerTwin(n: NoteMeta, all: NoteMeta[]): boolean {
  if (/ - Player\.md$/i.test(n.path)) return false;
  const twin = n.path.replace(/\.md$/i, " - Player.md");
  return all.some((o) => o.path === twin);
}

export function canView(ctx: Ctx, n: NoteMeta, all: NoteMeta[]): boolean {
  if (ctx.isScribe) return true;
  if (n.category === "session") return false;
  if (n.secret && !n.revealed) return false;
  if (hasPlayerTwin(n, all)) return false;
  if (n.category === "party") return ownsCharacterNote(ctx.user, n) || n.visibleToParty;
  return true;
}

export function canEdit(ctx: Ctx, n: NoteMeta): boolean {
  if (ctx.isScribe) return true;
  return n.category === "party" && ownsCharacterNote(ctx.user, n);
}

export async function visibleNotes(ctx: Ctx): Promise<IndexedNote[]> {
  const all = await loadIndex(ctx);
  return all.filter((n) => canView(ctx, n, all));
}

export function toMeta(n: IndexedNote): NoteMeta {
  const { raw, body, frontmatter, ...meta } = n;
  return meta;
}

// ---------- wikilinks ----------

export function buildLinkMap(notes: IndexedNote[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const n of notes) {
    const stem = n.path.split("/").pop()!.replace(/\.md$/i, "");
    const keys = new Set<string>([normKey(stem)]);
    if (/ aka /i.test(stem)) stem.split(/ aka /i).forEach((p) => keys.add(normKey(p)));
    for (const k of keys) if (k && !map.has(k)) map.set(k, n.path);
  }
  return map;
}

export function extractLinks(body: string): string[] {
  const out: string[] = [];
  const text = stripComments(body);
  const re = /(?<!!)\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push(m[1]);
  return out;
}

export function resolveLinks(body: string, map: Map<string, string>): Record<string, string | null> {
  const res: Record<string, string | null> = {};
  for (const t of extractLinks(body)) res[t] = map.get(normKey(t)) ?? null;
  return res;
}

export function backlinksFor(target: IndexedNote, notes: IndexedNote[], map: Map<string, string>) {
  const out: { path: string; title: string; category: Category }[] = [];
  for (const n of notes) {
    if (n.path === target.path) continue;
    if (extractLinks(n.body).some((t) => map.get(normKey(t)) === target.path)) {
      out.push({ path: n.path, title: n.title, category: n.category });
    }
  }
  return out;
}

// ---------- frontmatter + line helpers (targeted text edits keep YAML formatting intact) ----------

export function setFrontmatterKey(text: string, key: string, value: string | boolean): string {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const v = typeof value === "boolean" ? String(value) : /[:#\[\]{}]|^\s|\s$/.test(value) ? JSON.stringify(value) : value;
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() === "---") {
    let end = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "---") {
        end = i;
        break;
      }
    }
    if (end > 0) {
      const re = new RegExp(`^${key}\\s*:`);
      for (let i = 1; i < end; i++) {
        if (re.test(lines[i])) {
          lines[i] = `${key}: ${v}`;
          return lines.join(eol);
        }
      }
      lines.splice(end, 0, `${key}: ${v}`);
      return lines.join(eol);
    }
  }
  return `---${eol}${key}: ${v}${eol}---${eol}${text}`;
}

export function splitLines(text: string): { lines: string[]; eol: string } {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  return { lines: text.split(/\r?\n/), eol };
}

export const TASK_RE = /^(\s*)([-*])\s+\[( |x|X)\]\s+(.*)$/;
