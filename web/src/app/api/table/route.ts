import { HttpError, handle, requireCtx } from "@/lib/auth";
import { withLock } from "@/lib/storage";
import {
  EMPTY_TABLE_STATE,
  SharedRollEntry,
  SharedTableState,
  appendSharedRoll,
  normalizeTableState,
} from "@/lib/tableState";

export const dynamic = "force-dynamic";

const TABLE_PATH = ".hub/table-state.json";

async function readTableState(storage: { exists: (p: string) => Promise<boolean>; read: (p: string) => Promise<string> }): Promise<SharedTableState> {
  try {
    if (await storage.exists(TABLE_PATH)) {
      const parsed = JSON.parse(await storage.read(TABLE_PATH));
      return normalizeTableState(parsed);
    }
  } catch {
    /* ignore parse errors and return clean default */
  }
  return { ...EMPTY_TABLE_STATE };
}

export const GET = handle(async () => {
  const ctx = await requireCtx();
  const state = await readTableState(ctx.storage);
  return Response.json(
    { success: true, state },
    { headers: { "Cache-Control": "no-store" } }
  );
});

export const POST = handle(async (req: Request) => {
  const ctx = await requireCtx();
  const body = await req.json().catch(() => ({}));
  const action = body?.action;

  if (action !== "roll" && action !== "setInitiative" && action !== "clearRolls") {
    throw new HttpError(400, "Unsupported table action");
  }

  const nextState = await withLock(`table:${ctx.campaign.id}`, async () => {
    const current = await readTableState(ctx.storage);
    let updated: SharedTableState;

    if (action === "roll") {
      const rawRoll = body.roll;
      if (!rawRoll || typeof rawRoll !== "object" || !rawRoll.id) {
        throw new HttpError(400, "Invalid roll payload");
      }
      const normalizedRoll: SharedRollEntry = {
        id: String(rawRoll.id),
        formula: String(rawRoll.formula || "1d20").slice(0, 40),
        die: String(rawRoll.die || rawRoll.formula || "1d20").slice(0, 40),
        rolls: Array.isArray(rawRoll.rolls) ? rawRoll.rolls.map((n: unknown) => Number(n) || 0).slice(0, 30) : [],
        mod: Number(rawRoll.mod) || 0,
        total: Number(rawRoll.total) || 0,
        mode: rawRoll.mode === "advantage" || rawRoll.mode === "disadvantage" ? rawRoll.mode : "normal",
        label: typeof rawRoll.label === "string" ? rawRoll.label.slice(0, 80) : undefined,
        isCrit: Boolean(rawRoll.isCrit),
        isFumble: Boolean(rawRoll.isFumble),
        at: Number(rawRoll.at) || Date.now(),
        roller: ctx.user.name,
        character: ctx.user.character,
        private: false,
      };
      updated = appendSharedRoll(current, normalizedRoll);
    } else if (action === "setInitiative") {
      const normalized = normalizeTableState({
        ...current,
        combatants: body.combatants ?? current.combatants,
        currentTurnIdx: body.currentTurnIdx ?? current.currentTurnIdx,
        round: body.round ?? current.round,
        updatedAt: Date.now(),
      });
      updated = { ...normalized, rollLog: current.rollLog, updatedAt: Date.now() };
    } else {
      updated = { ...current, rollLog: [], updatedAt: Date.now() };
    }

    await ctx.storage.write(TABLE_PATH, JSON.stringify(updated, null, 2));
    return updated;
  });

  return Response.json({ success: true, state: nextState });
});
