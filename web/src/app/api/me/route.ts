import { handle, publicUser, requireCtx } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const ctx = await requireCtx();
  return Response.json({
    success: true,
    user: publicUser(ctx.user),
    campaign: { id: ctx.campaign.id, name: ctx.campaign.name },
  });
});
