import { HttpError, handle, requireCtx } from "@/lib/auth";
import { runLoreMasterService } from "@/lib/loreMasterService";
import { currentSession, isValidSession } from "@/lib/scratch";

export const dynamic = "force-dynamic";

/** Runs the native TypeScript AI Lore-Master for a session note. */
export const POST = handle(async (req: Request) => {
  const ctx = await requireCtx({ scribe: true });
  const body = await req.json().catch(() => ({}));
  const session = body.session && isValidSession(body.session) ? body.session : await currentSession(ctx);

  try {
    const result = await runLoreMasterService(ctx, session);
    return Response.json(result);
  } catch (err: any) {
    throw new HttpError(500, err?.message || "Failed running AI Lore-Master");
  }
});
