import { handle, requireCtx } from "@/lib/auth";
import { readReviews } from "@/lib/reviews";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const ctx = await requireCtx({ scribe: true });
  return Response.json({ success: true, reviews: await readReviews(ctx) });
});
