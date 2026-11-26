import { HttpError, HubUser, handle, mutateUsers, publicUser, requireCtx } from "@/lib/auth";
import { getCampaignAsync, getStorage } from "@/lib/campaigns";

export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireCtx({ scribe: true });
  const { id } = await params;
  const campaign = await getCampaignAsync(id);
  if (!campaign) throw new HttpError(404, "Campaign not found");

  const { targetUserId, newRole } = await req.json();
  if (!targetUserId || (newRole !== "scribe" && newRole !== "player")) {
    throw new HttpError(400, "Invalid payload. Provide targetUserId and newRole ('scribe' | 'player').");
  }

  const storage = getStorage(campaign);
  let updatedTarget!: HubUser;

  const users = await mutateUsers(storage, campaign.id, (list) => {
    const target = list.find((u) => u.id === targetUserId);
    if (!target) throw new HttpError(404, "Target user not found");

    if (target.role === "scribe" && newRole === "player") {
      const activeScribes = list.filter((u) => u.role === "scribe");
      if (activeScribes.length <= 1) {
        throw new HttpError(
          400,
          "Cannot remove the last remaining Scribe. Promote another player to Scribe before demoting this one."
        );
      }
    }

    target.role = newRole;
    updatedTarget = target;
    return list;
  });

  return Response.json({
    success: true,
    users: users.map(publicUser),
    updatedUser: publicUser(updatedTarget),
  });
});
