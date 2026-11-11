import { Ctx, HttpError } from "./auth";
import { withLock } from "./storage";
import { IndexedNote, canView, invalidateIndex, loadIndex, updateIndexedNote } from "./vault";

/** Finds a note by exact path and checks the caller may see it. Never trusts the client path. */
export async function getVisibleNote(ctx: Ctx, path: unknown): Promise<{ note: IndexedNote; all: IndexedNote[] }> {
  if (typeof path !== "string") throw new HttpError(400, "Missing path");
  const all = await loadIndex(ctx);
  const note = all.find((n) => n.path === path);
  // Same error for "missing" and "hidden" so secrets can't be probed.
  if (!note || !canView(ctx, note, all)) throw new HttpError(404, "Note not found");
  return { note, all };
}

/** Read-modify-write a note under a lock, then update the cached index. */
export async function mutateNote(ctx: Ctx, path: string, fn: (text: string) => string | Promise<string>) {
  await withLock(path, async () => {
    const text = await ctx.storage.read(path);
    const next = await fn(text);
    if (next !== text) {
      await ctx.storage.write(path, next);
      updateIndexedNote(ctx.campaign.id, path, next);
    }
  });
}

export function cleanLine(s: unknown, max = 400): string {
  return String(s ?? "")
    .replace(/%%/g, "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
