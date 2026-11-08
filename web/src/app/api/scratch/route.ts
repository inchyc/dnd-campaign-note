import crypto from "crypto";
import { HttpError, handle, loadUsers, requireCtx } from "@/lib/auth";
import { currentSession, mutateLines, nowHHMM, readAllLines, readLines } from "@/lib/scratch";

export const dynamic = "force-dynamic";

/**
 * Personal scratchpad for the current session. Everyone (players and Scribe) gets their own.
 * Lines are private until shared. `?all=1` (Scribe) returns every person's lines.
 */
export const GET = handle(async (req: Request) => {
  const ctx = await requireCtx();
  const session = await currentSession(ctx);
  const users = await loadUsers(ctx.storage);
  const label = (id: string) => {
    const u = users.find((x) => x.id === id);
    return u ? `${u.name} (${u.character})` : id;
  };

  const everyone = await readAllLines(ctx, session);
  const mine = await readLines(ctx, session, ctx.user.id);
  const shared = Object.entries(everyone)
    .flatMap(([uid, lines]) => lines.filter((l) => l.shared).map((l) => ({ ...l, author: label(uid), authorId: uid })))
    .sort((a, b) => a.at - b.at);

  const wantAll = new URL(req.url).searchParams.get("all") === "1";
  const all =
    wantAll && ctx.isScribe
      ? Object.entries(everyone).map(([uid, lines]) => ({ userId: uid, author: label(uid), lines }))
      : undefined;

  return Response.json({ success: true, session, mine, shared, all });
});

export const POST = handle(async (req: Request) => {
  const ctx = await requireCtx();
  const { text, shared } = await req.json();
  const clean = String(text || "").replace(/\r/g, "").trim().slice(0, 2000);
  if (!clean) throw new HttpError(400, "Note is empty");
  const session = await currentSession(ctx);
  const line = { id: crypto.randomUUID(), time: nowHHMM(), text: clean, shared: !!shared, at: Date.now() };
  await mutateLines(ctx, session, ctx.user.id, (l) => [...l, line]);
  return Response.json({ success: true, line });
});

export const PATCH = handle(async (req: Request) => {
  const ctx = await requireCtx();
  const { id, shared, text } = await req.json();
  const session = await currentSession(ctx);
  await mutateLines(ctx, session, ctx.user.id, (l) =>
    l.map((x) =>
      x.id === id
        ? { ...x, ...(typeof shared === "boolean" ? { shared } : {}), ...(typeof text === "string" && text.trim() ? { text: text.trim().slice(0, 2000) } : {}) }
        : x
    )
  );
  return Response.json({ success: true });
});

export const DELETE = handle(async (req: Request) => {
  const ctx = await requireCtx();
  const { id } = await req.json();
  const session = await currentSession(ctx);
  await mutateLines(ctx, session, ctx.user.id, (l) => l.filter((x) => x.id !== id));
  return Response.json({ success: true });
});
