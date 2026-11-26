/**
 * Pure, dependency-free shared Table Tools state helpers (Initiative Tracker + Table Dice Feed).
 */

export interface SharedCombatant {
  id: string;
  name: string;
  initiative: number;
  currentHp?: number;
  maxHp?: number;
  isNpc?: boolean;
}

export interface SharedRollEntry {
  id: string;
  formula: string;
  die: string;
  rolls: number[];
  mod: number;
  total: number;
  mode: "normal" | "advantage" | "disadvantage";
  label?: string;
  isCrit: boolean;
  isFumble: boolean;
  at: number;
  roller?: string;
  character?: string;
  private?: boolean;
}

export interface SharedTableState {
  combatants: SharedCombatant[];
  currentTurnIdx: number;
  round: number;
  rollLog: SharedRollEntry[];
  updatedAt: number;
}

export const EMPTY_TABLE_STATE: SharedTableState = {
  combatants: [],
  currentTurnIdx: 0,
  round: 1,
  rollLog: [],
  updatedAt: 0,
};

/** Sanitizes and normalizes parsed table state from storage or network payloads. */
export function normalizeTableState(raw: unknown): SharedTableState {
  if (!raw || typeof raw !== "object") return { ...EMPTY_TABLE_STATE };
  const obj = raw as Record<string, unknown>;

  const combatants: SharedCombatant[] = Array.isArray(obj.combatants)
    ? obj.combatants
        .slice(0, 50)
        .filter((c): c is Record<string, unknown> => Boolean(c && typeof c === "object" && (c as any).name))
        .map((c, idx) => ({
          id: typeof c.id === "string" && c.id ? c.id : `c-${idx}`,
          name: String(c.name).slice(0, 80),
          initiative: Number.isFinite(Number(c.initiative)) ? Number(c.initiative) : 10,
          currentHp: c.currentHp !== undefined && Number.isFinite(Number(c.currentHp)) ? Math.max(0, Number(c.currentHp)) : undefined,
          maxHp: c.maxHp !== undefined && Number.isFinite(Number(c.maxHp)) ? Math.max(1, Number(c.maxHp)) : undefined,
          isNpc: Boolean(c.isNpc),
        }))
    : [];

  const rollLog: SharedRollEntry[] = Array.isArray(obj.rollLog)
    ? obj.rollLog
        .slice(0, 40)
        .filter((r): r is Record<string, unknown> => Boolean(r && typeof r === "object" && (r as any).id))
        .map((r) => ({
          id: String(r.id),
          formula: String(r.formula || "1d20"),
          die: String(r.die || r.formula || "1d20"),
          rolls: Array.isArray(r.rolls) ? r.rolls.map((n) => Number(n) || 0).slice(0, 30) : [],
          mod: Number(r.mod) || 0,
          total: Number(r.total) || 0,
          mode: r.mode === "advantage" || r.mode === "disadvantage" ? r.mode : "normal",
          label: typeof r.label === "string" ? r.label.slice(0, 80) : undefined,
          isCrit: Boolean(r.isCrit),
          isFumble: Boolean(r.isFumble),
          at: Number(r.at) || Date.now(),
          roller: typeof r.roller === "string" ? r.roller.slice(0, 60) : undefined,
          character: typeof r.character === "string" ? r.character.slice(0, 60) : undefined,
          private: false,
        }))
    : [];

  const maxTurn = Math.max(0, combatants.length - 1);
  const rawTurn = Number.isInteger(Number(obj.currentTurnIdx)) ? Number(obj.currentTurnIdx) : 0;
  const currentTurnIdx = combatants.length === 0 ? 0 : Math.min(Math.max(0, rawTurn), maxTurn);
  const round = Math.max(1, Number.isInteger(Number(obj.round)) ? Number(obj.round) : 1);
  const updatedAt = Number(obj.updatedAt) || 0;

  return { combatants, currentTurnIdx, round, rollLog, updatedAt };
}

/** Prepends a shared roll entry (deduplicated by id) and caps history length. */
export function appendSharedRoll(
  state: SharedTableState,
  roll: SharedRollEntry,
  maxEntries = 40
): SharedTableState {
  const deduped = state.rollLog.filter((r) => r.id !== roll.id);
  const nextLog = [{ ...roll, private: false }, ...deduped].slice(0, maxEntries);
  return {
    ...state,
    rollLog: nextLog,
    updatedAt: Date.now(),
  };
}

/** Advances initiative to the next combatant, incrementing round when wrapping. */
export function advanceCombatTurn(state: SharedTableState): SharedTableState {
  if (state.combatants.length === 0) return state;
  if (state.currentTurnIdx + 1 >= state.combatants.length) {
    return {
      ...state,
      currentTurnIdx: 0,
      round: state.round + 1,
      updatedAt: Date.now(),
    };
  }
  return {
    ...state,
    currentTurnIdx: state.currentTurnIdx + 1,
    updatedAt: Date.now(),
  };
}
