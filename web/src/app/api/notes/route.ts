import { handle, requireCtx } from "@/lib/auth";
import { Category, displayText, normKey, toMeta, visibleNotes } from "@/lib/vault";

export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request) => {
  const ctx = await requireCtx();
  const cat = new URL(req.url).searchParams.get("category") as Category | null;
  const notes = (await visibleNotes(ctx)).filter((n) => !cat || n.category === cat);
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
