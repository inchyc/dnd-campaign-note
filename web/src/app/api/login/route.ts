import { HttpError, clearSessionCookie, handle, loadUsers, setSessionCookie, throttle, verifyPin } from "@/lib/auth";
import { getCampaign, getStorage } from "@/lib/campaigns";

export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request) => {
  const { campaign: campaignId, userId, pin } = await req.json();
  const campaign = getCampaign(String(campaignId || ""));
  if (!campaign) throw new HttpError(404, "Campaign not found");
  throttle(`${campaign.id}:${userId}`);
  const users = await loadUsers(getStorage(campaign));
  if (!users || users.length === 0) {
    throw new HttpError(503, "Campaign user roster is temporarily unavailable. Please retry in a moment.");
  }
  const user = users.find((u) => u.id === userId);
  if (!user) {
    throw new HttpError(404, "Character or user not found in this campaign");
  }
  if (!verifyPin(String(pin || ""), user.hash)) {
    throw new HttpError(401, "Wrong PIN");
  }
  await setSessionCookie({ campaign: campaign.id, userId: user.id, role: user.role });
  return Response.json({ success: true });
});

export const DELETE = handle(async () => {
  await clearSessionCookie();
  return Response.json({ success: true });
});
