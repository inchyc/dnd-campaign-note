import path from "path";
import { HttpError, handle, loadUsers, mutateUsers, publicUser, requireCtx, clearSessionCookie, HubUser } from "@/lib/auth";
import { getCampaignAsync, getStorage } from "@/lib/campaigns";
import { invalidateIndex } from "@/lib/vault";

export const dynamic = "force-dynamic";

export const GET = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const campaign = await getCampaignAsync(id);
  if (!campaign) throw new HttpError(404, "Campaign not found");
  const users = await loadUsers(getStorage(campaign));
  return Response.json({
    success: true,
    campaign: { id: campaign.id, name: campaign.name },
    users: users.map(publicUser),
    needsSetup: users.length === 0,
  });
});

export const DELETE = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireCtx();
  const { id } = await params;
  const campaign = await getCampaignAsync(id);
  if (!campaign) throw new HttpError(404, "Campaign not found");

  const body = await req.json().catch(() => ({}));
  const targetUserId = typeof body.userId === "string" ? body.userId : "";
  if (!targetUserId) throw new HttpError(400, "Missing userId");

  // Authorization: Scribe can delete anyone; player can delete their own character
  const isSelf = ctx.user.id === targetUserId;
  if (!ctx.isScribe && !isSelf) {
    throw new HttpError(403, "You do not have permission to delete this character.");
  }

  const storage = getStorage(campaign);
  let targetUser!: HubUser;

  const remainingUsers = await mutateUsers(storage, campaign.id, (users) => {
    const found = users.find((u) => u.id === targetUserId);
    if (!found) throw new HttpError(404, "User not found in campaign");
    if (found.role === "scribe" && users.filter((u) => u.role === "scribe").length <= 1) {
      throw new HttpError(400, "Cannot remove the last remaining Scribe.");
    }
    targetUser = found;
    return users.filter((u) => u.id !== targetUserId);
  });

  // 1. Archive Obsidian character note(s) to Notes/PC Notes/Archive/
  const characterNotes = targetUser.characterNotes || [`Notes/PC Notes/${targetUser.character}.md`];
  for (const notePath of characterNotes) {
    try {
      if (await storage.exists(notePath)) {
        const content = await storage.read(notePath);
        const fileName = path.basename(notePath);
        const archivePath = `Notes/PC Notes/Archive/${fileName}`;
        await storage.write(archivePath, content);
        await storage.delete(notePath);
      }
    } catch (err) {
      console.warn(`Could not archive character note ${notePath}:`, err);
    }
  }

  // 2. Remove character sheet from storage
  const safeId = targetUserId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const sheetPath = `.hub/sheets/${safeId}.json`;
  try {
    if (await storage.exists(sheetPath)) {
      await storage.delete(sheetPath);
    }
  } catch (err) {
    console.warn(`Could not delete character sheet ${sheetPath}:`, err);
  }

  invalidateIndex(campaign.id);

  // 4. If deleting self, clear session
  if (isSelf) {
    await clearSessionCookie();
  }

  return Response.json({
    success: true,
    deletedUserId: targetUserId,
    character: targetUser.character,
    remainingUsers: remainingUsers.map(publicUser),
    wasSelf: isSelf,
  });
});
