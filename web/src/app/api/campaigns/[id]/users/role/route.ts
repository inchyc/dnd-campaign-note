import { HttpError, handle, loadUsers, publicUser, requireCtx, saveUsers } from "@/lib/auth";
import { getCampaign, getStorage } from "@/lib/campaigns";

export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireCtx({ scribe: true });
  const { id } = await params;
  const campaign = getCampaign(id);
  if (!campaign) throw new HttpError(404, "Campaign not found");

  const storage = getStorage(campaign);
  const users = await loadUsers(storage);

  const { targetUserId, newRole } = await req.json();
  if (!targetUserId || (newRole !== "scribe" && newRole !== "player")) {
    throw new HttpError(400, "Invalid payload. Provide targetUserId and newRole ('scribe' | 'player').");
  }

  const target = users.find((u) => u.id === targetUserId);
  if (!target) throw new HttpError(404, "Target user not found");

  // Safeguard: Ensure at least one scribe remains in the campaign
  if (target.role === "scribe" && newRole === "player") {
    const activeScribes = users.filter((u) => u.role === "scribe");
    if (activeScribes.length <= 1) {
      throw new HttpError(
        400,
        "Cannot remove the last remaining Scribe. Promote another player to Scribe before demoting this one."
      );
    }
  }

  target.role = newRole;
  await saveUsers(storage, users);

  return Response.json({
    success: true,
    users: users.map(publicUser),
    updatedUser: publicUser(target),
  });
});
