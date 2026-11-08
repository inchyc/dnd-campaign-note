import { HttpError, handle, requireCtx } from "@/lib/auth";
import { getVisibleNote, mutateNote } from "@/lib/noteops";
import {
  backlinksFor,
  buildLinkMap,
  canEdit,
  displayText,
  invalidateIndex,
  resolveLinks,
  toMeta,
  visibleNotes,
} from "@/lib/vault";

export const dynamic = "force-dynamic";

const HIDDEN_KEYS = new Set(["created", "updated", "banner", "banner_y", "cssclasses", "tags", "obsidianUIMode", "notes"]);
const PLAYER_KEYS = new Set([
  "status", "faction", "location", "disposition", "priority", "type", "category", "source",
  "identified", "quantity", "owner", "class", "level", "race", "player", "summary", "lead",
]);

export const GET = handle(async (req: Request) => {
  const ctx = await requireCtx();
  const path = new URL(req.url).searchParams.get("path");
  const { note } = await getVisibleNote(ctx, path);
  const visible = await visibleNotes(ctx);
  const map = buildLinkMap(visible);
  const editable = canEdit(ctx, note);

  const frontmatter: Record<string, string> = {};
  for (const [k, v] of Object.entries(note.frontmatter)) {
    if (HIDDEN_KEYS.has(k)) continue;
    if (!ctx.isScribe && !PLAYER_KEYS.has(k)) continue;
    if (v === null || v === undefined || v === "") continue;
    frontmatter[k] = Array.isArray(v) ? v.flat().join(", ") : String(v);
  }

  const body = displayText(note.raw);
  return Response.json({
    success: true,
    note: {
      meta: toMeta(note),
      frontmatter,
      body,
      links: resolveLinks(body, map),
      backlinks: backlinksFor(note, visible, map),
      canEdit: editable,
      canPlayerNote: ["npc", "location", "lore"].includes(note.category),
      mtime: note.mtime,
      raw: editable ? note.raw : undefined,
    },
  });
});

/** Full-note save (Scribe: any note; players: their own character note). */
export const PUT = handle(async (req: Request) => {
  const ctx = await requireCtx();
  const { path, content, baseMtime, force } = await req.json();
  const { note } = await getVisibleNote(ctx, path);
  if (!canEdit(ctx, note)) throw new HttpError(403, "You can't edit this note");
  if (typeof content !== "string" || content.length > 500_000) throw new HttpError(400, "Bad content");

  const current = await ctx.storage.mtime(note.path);
  if (!force && typeof baseMtime === "number" && Math.abs(current - baseMtime) > 1) {
    // Changed in Obsidian / another device since this editor was opened.
    throw new HttpError(409, "This note changed elsewhere since you opened it.", { conflict: true, currentMtime: current });
  }
  await mutateNote(ctx, note.path, () => content);
  invalidateIndex(ctx.campaign.id);
  return Response.json({ success: true, mtime: await ctx.storage.mtime(note.path) });
});

/** Append a player note to a shared world note. */
export const POST = handle(async (req: Request) => {
  const ctx = await requireCtx();
  const { path, text } = await req.json();
  const { note } = await getVisibleNote(ctx, path);
  if (!["npc", "location", "lore", "quest", "item"].includes(note.category)) {
    throw new HttpError(400, "Player notes can only be added to shared world notes");
  }
  const clean = String(text || "").trim();
  if (!clean) throw new HttpError(400, "Note text is empty");

  const today = new Date().toISOString().slice(0, 10);
  const header = `#### 📝 Player Notes: ${ctx.user.name} (${ctx.user.character}), ${today}`;
  const block = `\n\n${header}\n${clean}\n`;

  await mutateNote(ctx, note.path, (file) => {
    return file.trimEnd() + block;
  });

  return Response.json({ success: true });
});
