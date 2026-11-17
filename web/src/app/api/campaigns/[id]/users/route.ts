import path from "path";
import { HttpError, handle, loadUsers, publicUser, requireCtx, saveUsers, clearSessionCookie } from "@/lib/auth";
import { getCampaign, getStorage } from "@/lib/campaigns";
import { invalidateIndex } from "@/lib/vault";

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

export const DELETE = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireCtx();
  const { id } = await params;
  const campaign = getCampaign(id);
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
  const users = await loadUsers(storage);
  const targetUser = users.find((u) => u.id === targetUserId);
  if (!targetUser) throw new HttpError(404, "User not found in campaign");

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

  // 3. Remove user from roster and save
  const remainingUsers = users.filter((u) => u.id !== targetUserId);
  await saveUsers(storage, remainingUsers);
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
