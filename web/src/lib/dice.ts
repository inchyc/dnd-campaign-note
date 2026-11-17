export type RollMode = "normal" | "advantage" | "disadvantage";

export interface ParsedDiceFormula {
  count: number;
  sides: number;
  modifier: number;
  normalized: string;
}

export interface DiceRollResult {
  id: string;
  formula: string;
  label?: string;
  die: string;
  rolls: number[];
  chosen: number;
  mod: number;
  total: number;
  mode: RollMode;
  isCrit: boolean;
  isFumble: boolean;
  timestamp: string;
}

/**
 * Parses a D&D dice formula like "1d20+5", "2d6 - 1", "d8", "1d20-2".
 * Returns null if the formula cannot be parsed.
 */
export function parseDiceFormula(raw: string): ParsedDiceFormula | null {
  const cleaned = raw.trim().replace(/\s+/g, "").toLowerCase();
  const match = cleaned.match(/^(\d*)d(\d+)([+-]\d+)?$/);
  if (!match) return null;

  const count = Math.max(1, Math.min(100, match[1] ? parseInt(match[1], 10) : 1));
  const sides = Math.max(2, Math.min(1000, parseInt(match[2], 10)));
  const modifier = match[3] ? parseInt(match[3], 10) : 0;
  const modStr = modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : "";

  return {
    count,
    sides,
    modifier,
    normalized: `${count}d${sides}${modStr}`,
  };
}

/**
 * Executes a dice roll for a parsed formula (or raw string).
 * Advantage / Disadvantage applies to single d20 rolls (1d20...).
 */
export function rollDiceFormula(
  formulaOrSides: string | number,
  options?: {
    label?: string;
    mode?: RollMode;
    extraModifier?: number;
    rng?: () => number;
  }
): DiceRollResult {
  const rng = options?.rng ?? Math.random;
  const mode: RollMode = options?.mode ?? "normal";
  const extraMod = options?.extraModifier ?? 0;

  let count = 1;
  let sides = 20;
  let mod = extraMod;
  let normalized = `1d20`;

  if (typeof formulaOrSides === "number") {
    sides = Math.max(2, formulaOrSides);
    const modStr = mod > 0 ? `+${mod}` : mod < 0 ? `${mod}` : "";
    normalized = `1d${sides}${modStr}`;
  } else {
    const parsed = parseDiceFormula(formulaOrSides);
    if (parsed) {
      count = parsed.count;
      sides = parsed.sides;
      mod = parsed.modifier + extraMod;
      const modStr = mod > 0 ? `+${mod}` : mod < 0 ? `${mod}` : "";
      normalized = `${count}d${sides}${modStr}`;
    } else {
      // Fallback: treat as flat d20 if unparseable
      sides = 20;
      normalized = formulaOrSides;
    }
  }

  const rollOnce = () => Math.floor(rng() * sides) + 1;
  let rolls: number[] = [];
  let chosen = 0;

  if (count === 1 && sides === 20 && (mode === "advantage" || mode === "disadvantage")) {
    const r1 = rollOnce();
    const r2 = rollOnce();
    rolls = [r1, r2];
    chosen = mode === "advantage" ? Math.max(r1, r2) : Math.min(r1, r2);
  } else {
    for (let i = 0; i < count; i++) {
      rolls.push(rollOnce());
    }
    chosen = rolls.reduce((sum, r) => sum + r, 0);
  }

  const total = chosen + mod;
  const isCrit = count === 1 && sides === 20 && chosen === 20;
  const isFumble = count === 1 && sides === 20 && chosen === 1;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    formula: normalized,
    label: options?.label,
    die: `${count}d${sides}`,
    rolls,
    chosen,
    mod,
    total,
    mode: count === 1 && sides === 20 ? mode : "normal",
    isCrit,
    isFumble,
    timestamp: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };
}
