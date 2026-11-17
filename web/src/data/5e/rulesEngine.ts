import { CLASSES_5E } from "./classes";
import { ARMOR_5E, WEAPONS_5E } from "./equipment";

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;

export const POINT_BUY_COST_TABLE: Record<number, { cost: number; nextCost?: number }> = {
  8: { cost: 0, nextCost: 1 },
  9: { cost: 1, nextCost: 1 },
  10: { cost: 2, nextCost: 1 },
  11: { cost: 3, nextCost: 1 },
  12: { cost: 4, nextCost: 1 },
  13: { cost: 5, nextCost: 2 },
  14: { cost: 7, nextCost: 2 },
  15: { cost: 9 },
};

export const PACK_CONTENTS: Record<string, string[]> = {
  "Dungeoneer's Pack": [
    "Backpack",
    "Crowbar",
    "Hammer",
    "10 Pitons",
    "10 Torches",
    "Tinderbox",
    "10 Days of Rations",
    "Waterskin",
    "50 ft Hempen Rope",
  ],
  "Explorer's Pack": [
    "Backpack",
    "Bedroll",
    "Mess Kit",
    "Tinderbox",
    "10 Torches",
    "10 Days of Rations",
    "Waterskin",
    "50 ft Hempen Rope",
  ],
  "Priest's Pack": [
    "Backpack",
    "Blanket",
    "10 Candles",
    "Tinderbox",
    "Alms Box",
    "2 Blocks of Incense",
    "Censer",
    "Vestments",
    "2 Days of Rations",
    "Waterskin",
  ],
  "Burglar's Pack": [
    "Backpack",
    "Bag of 1,000 Ball Bearings",
    "10 ft String",
    "Bell",
    "5 Candles",
    "Crowbar",
    "Hammer",
    "10 Pitons",
    "Hooded Lantern",
    "2 Flasks of Oil",
    "5 Days of Rations",
    "Tinderbox",
    "Waterskin",
    "50 ft Hempen Rope",
  ],
  "Diplomat's Pack": [
    "Chest",
    "2 Cases for Maps and Scrolls",
    "Set of Fine Clothes",
    "Bottle of Ink",
    "Ink Pen",
    "Lamp",
    "2 Flasks of Oil",
    "5 Sheets of Paper",
    "Vial of Perfume",
    "Sealing Wax",
    "Soap",
  ],
  "Entertainer's Pack": [
    "Backpack",
    "Bedroll",
    "2 Costumes",
    "5 Candles",
    "5 Days of Rations",
    "Waterskin",
    "Disguise Kit",
  ],
  "Scholar's Pack": [
    "Backpack",
    "Book of Lore",
    "Bottle of Ink",
    "Ink Pen",
    "10 Sheets of Parchment",
    "Little Bag of Sand",
    "Small Knife",
  ],
  "Monster Hunter's Pack": [
    "Chest",
    "Crowbar",
    "Hammer",
    "3 Wooden Stakes",
    "Holy Symbol",
    "Flask of Holy Water",
    "Set of Manacles",
    "Steel Mirror",
    "Flask of Oil",
    "Tinderbox",
    "3 Torches",
  ],
};

export function calcModifier(score: number): number {
  return Math.floor(((score || 10) - 10) / 2);
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function calcProficiencyBonus(totalLevel: number): number {
  const lvl = Math.max(1, Math.min(20, totalLevel || 1));
  return Math.ceil(1 + lvl / 4);
}

export function calcPointBuyCost(score: number): number {
  return POINT_BUY_COST_TABLE[score]?.cost ?? 0;
}

export function roll4d6DropLowest(): { total: number; rolls: number[]; dropped: number } {
  const rolls = [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ];
  rolls.sort((a, b) => a - b);
  const dropped = rolls[0];
  const kept = rolls.slice(1);
  const total = kept.reduce((a, b) => a + b, 0);
  return { total, rolls, dropped };
}

export function calculateTotalHitPoints(
  classes: Array<{ className: string; level: number }>,
  conModifier: number,
  options?: {
    hpMode?: "average" | "roll";
    rolledHpByLevel?: Record<string, number[]>;
    isHillDwarf?: boolean;
    hasToughFeat?: boolean;
    isDraconicSorcerer?: boolean;
  }
): { hpMax: number; breakdown: string } {
  if (!classes || classes.length === 0) {
    return { hpMax: 10 + conModifier, breakdown: `Base 10 + CON (${conModifier})` };
  }

  let totalHp = 0;
  const parts: string[] = [];
  const totalLevel = classes.reduce((sum, c) => sum + (c.level || 0), 0) || 1;

  classes.forEach((cEntry, classIdx) => {
    const cls = CLASSES_5E[cEntry.className];
    const hitDieNum = parseInt(cls?.hitDie?.replace("d", "") || "10", 10) || 10;
    const avgGain = Math.floor(hitDieNum / 2) + 1;

    for (let lvl = 1; lvl <= cEntry.level; lvl++) {
      if (classIdx === 0 && lvl === 1) {
        // First character level gets maximum hit die
        const base = hitDieNum + conModifier;
        totalHp += Math.max(1, base);
        parts.push(`Lv 1 ${cEntry.className}: max ${hitDieNum} + CON (${conModifier}) = ${Math.max(1, base)}`);
      } else {
        let rolledVal = avgGain;
        if (options?.hpMode === "roll" && options?.rolledHpByLevel?.[cEntry.className]?.[lvl - 2]) {
          rolledVal = options.rolledHpByLevel[cEntry.className][lvl - 2];
        }
        const base = rolledVal + conModifier;
        totalHp += Math.max(1, base);
        parts.push(`Lv ${lvl} ${cEntry.className}: ${rolledVal} + CON (${conModifier}) = ${Math.max(1, base)}`);
      }
    }
  });

  if (options?.isHillDwarf) {
    totalHp += totalLevel;
    parts.push(`Hill Dwarf: +${totalLevel} HP`);
  }
  if (options?.isDraconicSorcerer) {
    const sorcLevel = classes.find((c) => c.className === "Sorcerer")?.level || 0;
    if (sorcLevel > 0) {
      totalHp += sorcLevel;
      parts.push(`Draconic Resilience: +${sorcLevel} HP`);
    }
  }
  if (options?.hasToughFeat) {
    totalHp += totalLevel * 2;
    parts.push(`Tough Feat: +${totalLevel * 2} HP`);
  }

  return { hpMax: Math.max(1, totalHp), breakdown: parts.join("; ") };
}

export function checkMulticlassPrereqs(
  className: string,
  stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number }
): { allowed: boolean; missing: string[] } {
  const cls = CLASSES_5E[className];
  if (!cls) return { allowed: true, missing: [] };

  const missing: string[] = [];
  if (className === "Fighter") {
    if (stats.str < 13 && stats.dex < 13) {
      missing.push("STR 13 or DEX 13");
    }
  } else {
    for (const [stat, req] of Object.entries(cls.multiclassPrereqs)) {
      const current = stats[stat as keyof typeof stats] ?? 10;
      if (current < (req ?? 13)) {
        missing.push(`${stat.toUpperCase()} ${req}`);
      }
    }
  }

  return { allowed: missing.length === 0, missing };
}

// 5e Multiclass Spellcaster Table
const MULTICLASS_SPELL_SLOTS_TABLE: Record<number, number[]> = {
  1: [2],
  2: [3],
  3: [4, 2],
  4: [4, 3],
  5: [4, 3, 2],
  6: [4, 3, 3],
  7: [4, 3, 3, 1],
  8: [4, 3, 3, 2],
  9: [4, 3, 3, 3, 1],
  10: [4, 3, 3, 3, 2],
  11: [4, 3, 3, 3, 2, 1],
  12: [4, 3, 3, 3, 2, 1],
  13: [4, 3, 3, 3, 2, 1, 1],
  14: [4, 3, 3, 3, 2, 1, 1],
  15: [4, 3, 3, 3, 2, 1, 1, 1],
  16: [4, 3, 3, 3, 2, 1, 1, 1],
  17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
  18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
  19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
  20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
};

export function calcMulticlassSpellSlots(
  classes: Array<{ className: string; level: number; subclass?: string }>
): Record<number, number> {
  let casterLevel = 0;
  let pactLevels = 0;

  for (const entry of classes) {
    const cls = CLASSES_5E[entry.className];
    if (!cls) continue;

    if (entry.className === "Warlock") {
      pactLevels += entry.level;
    } else if (cls.spellcastingType === "full") {
      casterLevel += entry.level;
    } else if (cls.spellcastingType === "half") {
      casterLevel += Math.floor(entry.level / 2);
    } else if (entry.subclass === "Eldritch Knight" || entry.subclass === "Arcane Trickster") {
      casterLevel += Math.floor(entry.level / 3);
    }
  }

  const slots: Record<number, number> = {};
  if (casterLevel > 0) {
    const row = MULTICLASS_SPELL_SLOTS_TABLE[Math.min(20, casterLevel)] || [];
    row.forEach((count, idx) => {
      slots[idx + 1] = count;
    });
  }

  return slots;
}

export function calcWarlockPactSlots(level: number): { slotLevel: number; count: number } {
  if (level <= 0) return { slotLevel: 1, count: 0 };
  const count = level >= 17 ? 4 : level >= 11 ? 3 : level >= 2 ? 2 : 1;
  const slotLevel = Math.min(5, Math.ceil(level / 2));
  return { slotLevel, count };
}

export interface ArmorCalculationResult {
  ac: number;
  formula: string;
  hasStealthDisadvantage: boolean;
}

export function calculateArmorClass(
  stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number },
  classes: Array<{ className: string; level: number }>,
  equippedArmor?: { name: string; baseAc: number; category: string; maxDexMod?: number; stealthDisadvantage?: boolean; magicBonus?: number },
  equippedShield?: { name: string; baseAc: number; magicBonus?: number },
  magicBonuses: number = 0,
  overrideAc?: number,
  customLineageOrRace?: string
): ArmorCalculationResult {
  if (overrideAc && overrideAc > 0) {
    return { ac: overrideAc, formula: "Custom Manual Override", hasStealthDisadvantage: false };
  }

  const dexMod = calcModifier(stats.dex);
  const conMod = calcModifier(stats.con);
  const wisMod = calcModifier(stats.wis);

  const shieldAc = equippedShield ? (equippedShield.baseAc || 2) + (equippedShield.magicBonus || 0) : 0;
  let base = 10;
  let formula = "10 + DEX";
  let hasStealthDisadvantage = false;

  const primaryClass = classes[0]?.className;

  if (customLineageOrRace === "Tortle") {
    // Tortle natural armor is flat 17, shields apply
    base = 17;
    formula = "Tortle Natural Armor (17)";
  } else if (equippedArmor) {
    hasStealthDisadvantage = !!equippedArmor.stealthDisadvantage;
    const magic = equippedArmor.magicBonus || 0;

    if (equippedArmor.category === "light") {
      base = equippedArmor.baseAc + dexMod + magic;
      formula = `${equippedArmor.name} (${equippedArmor.baseAc}) + DEX (${dexMod})${magic ? ` + ${magic}` : ""}`;
    } else if (equippedArmor.category === "medium") {
      const effDex = Math.min(dexMod, equippedArmor.maxDexMod ?? 2);
      base = equippedArmor.baseAc + effDex + magic;
      formula = `${equippedArmor.name} (${equippedArmor.baseAc}) + DEX [max 2] (${effDex})${magic ? ` + ${magic}` : ""}`;
    } else if (equippedArmor.category === "heavy") {
      base = equippedArmor.baseAc + magic;
      formula = `${equippedArmor.name} (${equippedArmor.baseAc})${magic ? ` + ${magic}` : ""}`;
    }
  } else {
    // Unarmored Defense check
    if (primaryClass === "Barbarian") {
      base = 10 + dexMod + conMod;
      formula = `Unarmored (Barbarian: 10 + DEX ${dexMod} + CON ${conMod})`;
    } else if (primaryClass === "Monk" && !equippedShield) {
      base = 10 + dexMod + wisMod;
      formula = `Unarmored (Monk: 10 + DEX ${dexMod} + WIS ${wisMod})`;
    } else {
      base = 10 + dexMod;
      formula = `Unarmored (10 + DEX ${dexMod})`;
    }
  }

  const totalAc = base + shieldAc + magicBonuses;
  if (shieldAc > 0) {
    formula += ` + Shield (${shieldAc})`;
  }
  if (magicBonuses > 0) {
    formula += ` + Magic (${magicBonuses})`;
  }

  return { ac: totalAc, formula, hasStealthDisadvantage };
}
