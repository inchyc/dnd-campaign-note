import { handle, loadUsers, requireCtx } from "@/lib/auth";
import { currentSession } from "@/lib/scratch";
import { loadIndex, ownsCharacterNote, toMeta, visibleNotes } from "@/lib/vault";

export const dynamic = "force-dynamic";

function questBucket(status?: string): "open" | "active" | "resolved" {
  const s = (status || "").toLowerCase();
  if (/(complete|resolved|solved|closed|done)/.test(s)) return "resolved";
  if (/(active|progress|ongoing|investigating)/.test(s)) return "active";
  return "open";
}

export const GET = handle(async () => {
  const ctx = await requireCtx();
  const visible = await visibleNotes(ctx);
  const all = await loadIndex(ctx);
  const users = await loadUsers(ctx.storage);

  let recap: unknown = null;
  if (await ctx.storage.exists(".hub/recap.json")) {
    try {
      recap = JSON.parse(await ctx.storage.read(".hub/recap.json"));
    } catch {
      /* ignore */
    }
  }

  const weight: Record<string, number> = { high: 3, urgent: 3, medium: 2, normal: 2, low: 1 };
  const quests = visible
    .filter((n) => n.category === "quest" && questBucket(n.status) !== "resolved")
    .sort((a, b) => (weight[(b.priority || "").toLowerCase()] || 0) - (weight[(a.priority || "").toLowerCase()] || 0))
    .slice(0, 5)
    .map(toMeta);

  const roster = users
    .filter((u) => u.role === "player" || u.role === "scribe")
    .map((u) => {
      const note = all.find((n) => ownsCharacterNote(u, n) || (u.characterNotes || []).includes(n.path));
      return {
        id: u.id,
        name: u.name,
        character: u.character,
        role: u.role,
        class: note?.frontmatter?.class ? String(note.frontmatter.class) : undefined,
        level: note?.frontmatter?.level ? String(note.frontmatter.level) : undefined,
      };
    });

  const recent = visible
    .filter((n) => n.category !== "session")
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, 6)
    .map(toMeta);

  return Response.json({ success: true, recap, quests, roster, recent, session: await currentSession(ctx) });
});
