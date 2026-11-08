import { HttpError, handle, requireCtx } from "@/lib/auth";
import { collateSession, startLoreMaster } from "@/lib/collate";
import { currentSession, isValidSession, setSession } from "@/lib/scratch";

export const dynamic = "force-dynamic";

/** Merge all scratchpads (+ transcript) into the session note, optionally kick off the AI Lore-Master. */
export const POST = handle(async (req: Request) => {
  const ctx = await requireCtx({ scribe: true });
  const body = await req.json().catch(() => ({}));
  const session = body.session && isValidSession(body.session) ? body.session : await currentSession(ctx);
  const result = await collateSession(ctx, session);
  const ai = body.runAi ? startLoreMaster(session) : { started: false };
  return Response.json({ success: true, session, ...result, ai });
});

/** Set the active session date (everyone's scratchpads follow it). */
export const PUT = handle(async (req: Request) => {
  const ctx = await requireCtx({ scribe: true });
  const { session } = await req.json();
  if (!isValidSession(String(session))) throw new HttpError(400, "Use YYYY-MM-DD");
  await setSession(ctx, session);
  return Response.json({ success: true, session });
});
