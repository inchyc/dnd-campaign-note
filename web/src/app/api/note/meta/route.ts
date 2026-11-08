import { HttpError, handle, requireCtx } from "@/lib/auth";
import { cleanLine, getVisibleNote, mutateNote } from "@/lib/noteops";
import { ownsCharacterNote, setFrontmatterKey, splitLines } from "@/lib/vault";

export const dynamic = "force-dynamic";

const HEADING = /^##\s+📝\s+Player Notes\s*$/;

function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Appends a labelled bullet to the note's "Player Notes" section. Never touches existing text. */
export const POST = handle(async (req: Request) => {
  const ctx = await requireCtx();
  const { path, text } = await req.json();
  const { note } = await getVisibleNote(ctx, path);
  if (!["npc", "location", "lore"].includes(note.category)) {
    throw new HttpError(403, "Player notes can only be added to NPC, Location and Lore notes");
  }
  const clean = cleanLine(text, 600);
  if (!clean) throw new HttpError(400, "Note is empty");
  const who = ctx.isScribe ? `${ctx.user.name} (${ctx.user.character})` : `${ctx.user.name} (${ctx.user.character})`;
  const entry = `- **${who}** · ${stamp()}: ${clean}`;

  await mutateNote(ctx, note.path, (file) => {
    const { lines, eol } = splitLines(file);
    const h = lines.findIndex((l) => HEADING.test(l.trim()));
    if (h === -1) {
      while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
      lines.push("", "## 📝 Player Notes", entry, "");
      return lines.join(eol);
    }
    // insert after the last bullet in the run that follows the heading
    let i = h + 1;
    let last = h;
    while (i < lines.length && (lines[i].trim() === "" || lines[i].trim().startsWith("- "))) {
      if (lines[i].trim().startsWith("- ")) last = i;
      i++;
    }
    lines.splice(last + 1, 0, entry);
    return lines.join(eol);
  });
  return Response.json({ success: true });
});

/** Small, whitelisted property changes (visibility, claiming loot, reveal, quest status). */
export const PUT = handle(async (req: Request) => {
  const ctx = await requireCtx();
  const { path, key, value } = await req.json();
  const { note } = await getVisibleNote(ctx, path);

  if (key === "visible_to_party") {
    if (note.category !== "party") throw new HttpError(400, "Only character notes have this setting");
    if (!ctx.isScribe && !ownsCharacterNote(ctx.user, note)) throw new HttpError(403, "Not your character");
    await mutateNote(ctx, note.path, (t) => setFrontmatterKey(t, "visible_to_party", !!value));
  } else if (key === "revealed") {
    if (!ctx.isScribe) throw new HttpError(403, "Scribe only");
    await mutateNote(ctx, note.path, (t) => setFrontmatterKey(t, "revealed", !!value));
  } else if (key === "status") {
    if (!ctx.isScribe || note.category !== "quest") throw new HttpError(403, "Scribe only, quests only");
    const v = cleanLine(value, 40);
    if (!v) throw new HttpError(400, "Bad status");
    await mutateNote(ctx, note.path, (t) => setFrontmatterKey(t, "status", v));
  } else if (key === "owner") {
    if (note.category !== "item") throw new HttpError(400, "Only items can be claimed");
    const v = cleanLine(value, 60);
    if (!ctx.isScribe) {
      const unclaimed = !note.owner || /^(party|unclaimed)$/i.test(note.owner);
      const mine = note.owner?.toLowerCase() === ctx.user.character.toLowerCase();
      const claiming = v.toLowerCase() === ctx.user.character.toLowerCase() && unclaimed;
      const releasing = /^party$/i.test(v) && mine;
      if (!claiming && !releasing) throw new HttpError(403, "You can only claim unclaimed items or release your own");
    }
    await mutateNote(ctx, note.path, (t) => setFrontmatterKey(t, "owner", v || "party"));
  } else {
    throw new HttpError(400, "Unsupported property");
  }
  return Response.json({ success: true });
});
