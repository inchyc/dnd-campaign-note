import { HttpError, handle, requireCtx } from "@/lib/auth";
import { collateSession } from "@/lib/collate";
import { runLoreMasterService } from "@/lib/loreMasterService";
import { currentSession, isValidSession, setSession } from "@/lib/scratch";

export const dynamic = "force-dynamic";

/** Merge all scratchpads (+ transcript) into the session note, optionally kick off the AI Lore-Master. */
export const POST = handle(async (req: Request) => {
  const ctx = await requireCtx({ scribe: true });
  const body = await req.json().catch(() => ({}));
  const session = body.session && isValidSession(body.session) ? body.session : await currentSession(ctx);
  const result = await collateSession(ctx, session);

  let ai = { started: false, error: undefined as string | undefined };
  if (body.runAi) {
    try {
      // Run AI Lore-Master directly on Vercel Node runtime
      await runLoreMasterService(ctx, session);
      ai = { started: true, error: undefined };
    } catch (err: any) {
      console.warn("AI Lore-Master collation warning:", err.message);
      ai = { started: false, error: err.message };
    }
  }

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
