import { handle, requireCtx } from "@/lib/auth";
import { applyReview } from "@/lib/reviews";

export const dynamic = "force-dynamic";

export const POST = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireCtx({ scribe: true });
  const { id } = await params;
  const result = await applyReview(ctx, id);
  return Response.json({ success: true, ...result });
});
