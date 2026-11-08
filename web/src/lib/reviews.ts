import matter from "gray-matter";
import type { Ctx } from "./auth";
import { cleanTitle, invalidateIndex, loadIndex } from "./vault";
import { walk, withLock } from "./storage";

export interface SessionReview {
  id: string;
  sessionName: string;
  status: "pending_review" | "applied";
  summary: string;
  newEntities: { name: string; type: string; filePath: string; content: string }[];
  updates: { name: string; targetFile: string; statusUpdate?: string; rationale: string; content: string }[];
  resolvedTasks: string[];
  newTasks: string[];
}

const REVIEW = "_Review";

function section(content: string, heading: RegExp): string {
  const m = content.match(heading);
  return m ? m[1].trim() : "";
}

export async function readReviews(ctx: Ctx): Promise<SessionReview[]> {
  const out: SessionReview[] = [];
  for (const ent of await ctx.storage.list(REVIEW)) {
    if (!ent.isDir) continue;
    const dir = `${REVIEW}/${ent.name}`;
    const summaryPath = `${dir}/00_SESSION_REVIEW.md`;
    if (!(await ctx.storage.exists(summaryPath))) continue;
    const parsed = matter(await ctx.storage.read(summaryPath));
    const content = parsed.content;

    const newEntities: SessionReview["newEntities"] = [];
    for (const f of await walk(ctx.storage, `${dir}/New`)) {
      if (!f.endsWith(".md")) continue;
      const parts = f.split("/");
      newEntities.push({
        name: cleanTitle(parts[parts.length - 1].replace(/\.md$/, "")),
        type: parts[parts.length - 2],
        filePath: f.slice(dir.length + 1),
        content: await ctx.storage.read(f),
      });
    }

    const updates: SessionReview["updates"] = [];
    for (const f of await walk(ctx.storage, `${dir}/Updates`)) {
      if (!f.endsWith(".md")) continue;
      const p = matter(await ctx.storage.read(f));
      const rationale = (p.content.match(/> \[!info\] Rationale\s*\r?\n> ([\s\S]+?)(?:\r?\n\r?\n|\r?\n###)/) || [])[1] || "";
      const append = (p.content.match(/### Content to Append \/ Update:\s*\r?\n([\s\S]+)$/) || [])[1] || p.content;
      updates.push({
        name: f.split("/").pop()!.replace(/^Update_/, "").replace(/\.md$/, ""),
        targetFile: String(p.data.target_file || ""),
        statusUpdate: p.data.status_update ? String(p.data.status_update) : undefined,
        rationale: rationale.trim(),
        content: append.trim(),
      });
    }

    const resolved = section(content, /### Resolved \/ Checked Off:\s*\r?\n([\s\S]+?)(?=\r?\n###|\r?\n##|$)/)
      .split(/\r?\n/)
      .filter((l) => l.trim().startsWith("- [x]"))
      .map((l) => l.replace(/^\s*- \[x\]\s*/i, "").trim());
    const newTasks = section(content, /### New Tasks \/ Leads:\s*\r?\n([\s\S]+?)(?=\r?\n###|\r?\n##|$)/)
      .split(/\r?\n/)
      .filter((l) => l.trim().startsWith("- [ ]"))
      .map((l) => l.replace(/^\s*- \[ \]\s*/, "").trim());

    out.push({
      id: ent.name,
      sessionName: String(parsed.data.session || ent.name.replace("Session_Notes_", "Session ")),
      status: parsed.data.status === "applied" ? "applied" : "pending_review",
      summary: section(content, /## 📖 Executive Summary\s*\r?\n([\s\S]+?)(?=\r?\n---|\r?\n## )/),
      newEntities,
      updates,
      resolvedTasks: resolved,
      newTasks,
    });
  }
  return out.sort((a, b) => b.id.localeCompare(a.id));
}

export async function applyReview(ctx: Ctx, id: string): Promise<{ applied: string[]; skipped: string[] }> {
  if (!/^[\w.-]+$/.test(id)) throw new Error("Bad review id");
  const dir = `${REVIEW}/${id}`;
  if (!(await ctx.storage.exists(`${dir}/00_SESSION_REVIEW.md`))) throw new Error("Review not found");
  const applied: string[] = [];
  const skipped: string[] = [];
  const label = id.replace("Session_Notes_", "Session ");

  // 1. new notes (never overwrite an existing note)
  for (const f of await walk(ctx.storage, `${dir}/New`)) {
    if (!f.endsWith(".md")) continue;
    const dest = `Notes/${f.slice(`${dir}/New/`.length)}`;
    if (await ctx.storage.exists(dest)) {
      skipped.push(`${dest} (already exists)`);
      continue;
    }
    await ctx.storage.write(dest, await ctx.storage.read(f));
    applied.push(`New: ${dest}`);
  }

  // 2. updates appended to existing notes
  const index = await loadIndex(ctx);
  for (const f of await walk(ctx.storage, `${dir}/Updates`)) {
    if (!f.endsWith(".md")) continue;
    const p = matter(await ctx.storage.read(f));
    const target = String(p.data.target_file || "");
    const append = ((p.content.match(/### Content to Append \/ Update:\s*\r?\n([\s\S]+)$/) || [])[1] || "").trim();
    let dest = `Notes/${target}`;
    if (!target || !(await ctx.storage.exists(dest))) {
      const base = target.split("/").pop();
      const found = index.find((n) => n.path.split("/").pop() === base);
      if (!found) {
        skipped.push(`${target || f} (target note not found)`);
        continue;
      }
      dest = found.path;
    }
    await withLock(dest, async () => {
      let text = await ctx.storage.read(dest);
      const status = p.data.status_update ? String(p.data.status_update) : "";
      if (status && status.toLowerCase() !== "none") {
        text = text.replace(/^(status:[ \t]*).*$/m, `$1${status}`);
      }
      if (append && !text.includes(append)) {
        const eol = text.includes("\r\n") ? "\r\n" : "\n";
        text = text.replace(/\s+$/, "") + `${eol}${eol}#### Notes from ${label}${eol}${append}${eol}`;
      }
      await ctx.storage.write(dest, text);
    });
    applied.push(`Updated: ${dest}`);
  }

  // 3. tick resolved items in "Changes to be Made.md"
  const reviews = (await readReviews(ctx)).find((r) => r.id === id);
  if (reviews && (await ctx.storage.exists("Changes to be Made.md"))) {
    await withLock("Changes to be Made.md", async () => {
      let text = await ctx.storage.read("Changes to be Made.md");
      for (const item of reviews.resolvedTasks) {
        const re = new RegExp(`- \\[ \\](\\s+${item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "i");
        text = text.replace(re, "- [x]$1");
      }
      await ctx.storage.write("Changes to be Made.md", text);
    });
  }

  // 4. mark review as applied
  const sp = `${dir}/00_SESSION_REVIEW.md`;
  await ctx.storage.write(sp, (await ctx.storage.read(sp)).replace("status: pending_review", "status: applied"));

  invalidateIndex(ctx.campaign.id);
  return { applied, skipped };
}
