import type { Ctx } from "./auth";
import { withLock } from "./storage";

export interface ScratchLine {
  id: string;
  time: string; // HH:MM
  text: string;
  shared: boolean;
  at: number;
}

interface StateFile {
  session: string; // YYYY-MM-DD
}

const STATE = ".hub/state.json";

function today() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export async function currentSession(ctx: Pick<Ctx, "storage">): Promise<string> {
  try {
    if (await ctx.storage.exists(STATE)) {
      const s = JSON.parse(await ctx.storage.read(STATE)) as StateFile;
      if (s.session) return s.session;
    }
  } catch {
    /* ignore */
  }
  return today();
}

export async function setSession(ctx: Pick<Ctx, "storage">, session: string) {
  await ctx.storage.write(STATE, JSON.stringify({ session }, null, 2));
}

export function isValidSession(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

const file = (session: string, userId: string) => `.hub/scratch/${session}/${userId}.json`;

export async function readLines(ctx: Pick<Ctx, "storage">, session: string, userId: string): Promise<ScratchLine[]> {
  const p = file(session, userId);
  if (!(await ctx.storage.exists(p))) return [];
  try {
    return JSON.parse(await ctx.storage.read(p)) as ScratchLine[];
  } catch {
    return [];
  }
}

export async function mutateLines(
  ctx: Pick<Ctx, "storage">,
  session: string,
  userId: string,
  fn: (lines: ScratchLine[]) => ScratchLine[]
): Promise<ScratchLine[]> {
  const p = file(session, userId);
  return withLock(p, async () => {
    const next = fn(await readLines(ctx, session, userId));
    await ctx.storage.write(p, JSON.stringify(next, null, 1));
    return next;
  });
}

/** All scratch lines for a session, keyed by user id. */
export async function readAllLines(ctx: Pick<Ctx, "storage">, session: string): Promise<Record<string, ScratchLine[]>> {
  const out: Record<string, ScratchLine[]> = {};
  for (const ent of await ctx.storage.list(`.hub/scratch/${session}`)) {
    if (ent.isDir || !ent.name.endsWith(".json")) continue;
    const userId = ent.name.replace(/\.json$/, "");
    out[userId] = await readLines(ctx, session, userId);
  }
  return out;
}

export function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
