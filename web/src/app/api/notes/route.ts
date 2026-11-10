import { handle, requireCtx } from "@/lib/auth";
import { Category, displayText, normKey, toMeta, visibleNotes } from "@/lib/vault";

export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request) => {
  const ctx = await requireCtx();
  const url = new URL(req.url);
  const cat = url.searchParams.get("category") as Category | null;
  const forceFresh = url.searchParams.get("refresh") === "1" || url.searchParams.get("fresh") === "1";
  const includeArchived = url.searchParams.get("archived") === "1";
  const notes = (await visibleNotes(ctx, forceFresh, includeArchived)).filter((n) => {
    if (cat && n.category !== cat) return false;
    if (includeArchived) return n.status === "archived";
    return n.status !== "archived";
  });
  return Response.json({ success: true, notes: notes.map(toMeta) });
});

/** Search across titles and bodies of notes the caller is allowed to see. */
export const POST = handle(async (req: Request) => {
  const ctx = await requireCtx();
  const { q } = await req.json();
  const query = String(q || "").trim().toLowerCase();
  if (query.length < 2) return Response.json({ success: true, results: [] });
  const key = normKey(query);
  const results: { meta: ReturnType<typeof toMeta>; snippet: string; score: number }[] = [];
  for (const n of await visibleNotes(ctx)) {
    const title = n.title.toLowerCase();
    let score = 0;
    if (title === query || normKey(n.title) === key) score += 100;
    else if (title.includes(query)) score += 60;
    const text = displayText(n.raw).replace(/\s+/g, " ");
    const idx = text.toLowerCase().indexOf(query);
    if (idx >= 0) score += 10;
    if (!score) continue;
    const snippet = idx >= 0 ? text.slice(Math.max(0, idx - 50), idx + 110).trim() : n.summary;
    results.push({ meta: toMeta(n), snippet, score });
  }
  results.sort((a, b) => b.score - a.score);
  return Response.json({ success: true, results: results.slice(0, 30) });
});
