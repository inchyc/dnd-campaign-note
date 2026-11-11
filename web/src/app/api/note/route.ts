import matter from "gray-matter";
import { HttpError, handle, requireCtx } from "@/lib/auth";
import { getVisibleNote, mutateNote } from "@/lib/noteops";
import {
  backlinksFor,
  buildLinkMap,
  canEdit,
  displayText,
  invalidateIndex,
  resolveLinks,
  setFrontmatterKey,
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

  let raw = note.raw;
  try {
    raw = await ctx.storage.read(note.path);
  } catch {
    /* fallback to note.raw */
  }

  const parsed = matter(raw);
  const fm = (parsed.data || {}) as Record<string, any>;

  const frontmatter: Record<string, string> = {};
  for (const [k, v] of Object.entries(fm)) {
    if (HIDDEN_KEYS.has(k)) continue;
    if (!ctx.isScribe && !PLAYER_KEYS.has(k)) continue;
    if (v === null || v === undefined || v === "") continue;
    frontmatter[k] = Array.isArray(v) ? v.flat().join(", ") : String(v);
  }

  const body = displayText(parsed.content);
  return Response.json({
    success: true,
    note: {
      meta: {
        ...toMeta(note),
        status: fm.status ? String(fm.status) : note.status,
        priority: fm.priority ? String(fm.priority) : note.priority,
      },
      frontmatter,
      body,
      links: resolveLinks(body, map),
      backlinks: backlinksFor(note, visible, map),
      canEdit: editable,
      canPlayerNote: ["npc", "location", "lore"].includes(note.category),
      mtime: await ctx.storage.mtime(note.path).catch(() => note.mtime),
      raw: editable ? raw : undefined,
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

/** Create a new note or append a player note to a shared world note. */
export const POST = handle(async (req: Request) => {
  const ctx = await requireCtx();
  const body = await req.json();

  // Mode 1: Create a brand new note
  if (body.create) {
    const { category, title, content, priority, location, status, secret, visibleToParty, sub } = body;
    const cleanTitle = String(title || "").replace(/[/\\?%*:|"<>]/g, "").trim();
    if (!cleanTitle) throw new HttpError(400, "Title is required");

    let folder = "Notes/Lore";
    if (category === "quest") folder = "Notes/Investigations";
    else if (category === "npc") folder = "Notes/NPCs";
    else if (category === "location") folder = "Notes/Locations";
    else if (category === "lore") folder = sub ? `Notes/Lore/${sub}` : "Notes/Lore";
    else if (category === "item") folder = "Notes/Inventory & Gear";
    else if (category === "party") folder = "Notes/PC Notes";

    const targetPath = `${folder}/${cleanTitle}.md`;
    if (await ctx.storage.exists(targetPath)) {
      throw new HttpError(409, "A note with this title already exists");
    }

    const today = new Date().toISOString().slice(0, 10);
    const yamlLines = [
      "---",
      `type: ${category === "quest" ? "Investigation" : category === "npc" ? "NPC" : category === "location" ? "Location" : "Codex"}`,
      `category: ${category}`,
      ...(priority ? [`priority: ${priority}`] : []),
      ...(status ? [`status: ${status}`] : []),
      ...(location ? [`location: "[[${location}]]"`] : []),
      `created: ${today}`,
      `visible_to_party: ${visibleToParty ?? true}`,
      `secret: ${secret ?? false}`,
      `owner: "${ctx.user.character}"`,
      `player: "${ctx.user.name}"`,
      "---",
      "",
      `# ${cleanTitle}`,
      "",
      String(content || "").trim() || `> [!abstract] Overview of ${cleanTitle}\n`,
      "",
    ];

    const markdown = yamlLines.join("\n");
    await ctx.storage.write(targetPath, markdown);
    invalidateIndex(ctx.campaign.id);
    return Response.json({ success: true, path: targetPath });
  }

  // Mode 2: Append player note to an existing shared world note
  const { path, text } = body;
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

export const DELETE = handle(async (req: Request) => {
  const ctx = await requireCtx();
  const path = new URL(req.url).searchParams.get("path");
  const { note } = await getVisibleNote(ctx, path);
  if (!canEdit(ctx, note)) throw new HttpError(403, "You can't archive or delete this note");

  await mutateNote(ctx, note.path, (t) => setFrontmatterKey(t, "status", "archived"));
  return Response.json({ success: true, archived: true });
});
