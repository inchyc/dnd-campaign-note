import { HttpError, handle, loadUsers, publicUser } from "@/lib/auth";
import { getCampaign, getStorage } from "@/lib/campaigns";

export const dynamic = "force-dynamic";

export const GET = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const campaign = getCampaign(id);
  if (!campaign) throw new HttpError(404, "Campaign not found");
  const users = await loadUsers(getStorage(campaign));
  return Response.json({
    success: true,
    campaign: { id: campaign.id, name: campaign.name },
    users: users.map(publicUser),
    needsSetup: users.length === 0,
  });
});
