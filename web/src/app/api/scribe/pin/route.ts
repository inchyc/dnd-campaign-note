import { HttpError, handle, hashPin, loadUsers, publicUser, requireCtx, saveUsers } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const ctx = await requireCtx({ scribe: true });
  return Response.json({ success: true, users: (await loadUsers(ctx.storage)).map(publicUser) });
});

/** Reset a player's PIN (or the Scribe passcode). */
export const POST = handle(async (req: Request) => {
  const ctx = await requireCtx({ scribe: true });
  const { userId, pin } = await req.json();
  const value = String(pin || "");
  if (value.length < 4 || value.length > 64) throw new HttpError(400, "Use at least 4 characters");
  const users = await loadUsers(ctx.storage);
  const u = users.find((x) => x.id === userId);
  if (!u) throw new HttpError(404, "Unknown user");
  u.hash = hashPin(value);
  await saveUsers(ctx.storage, users);
  return Response.json({ success: true });
});
