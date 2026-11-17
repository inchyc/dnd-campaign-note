import { HttpError, handle, loadUsers, requireCtx } from "@/lib/auth";
import { setFrontmatterKey } from "@/lib/vault";

export const dynamic = "force-dynamic";

export interface MulticlassClassEntry {
  className: string;
  subclass?: string;
  level: number;
  hitDie: string;
}

export interface InventoryItemData {
  id: string;
  name: string;
  category: "weapon" | "armor" | "shield" | "gear" | "magic" | "potion" | "tool";
  quantity: number;
  weight: number;
  equipped?: boolean;
  equippedSlot?: "armor" | "shield" | "mainHand" | "offHand";
  baseAc?: number;
  maxDexMod?: number;
  stealthDisadvantage?: boolean;
  damage?: string;
  damageType?: string;
  versatileDamage?: string;
  properties?: string[];
  range?: string;
  magicBonusAc?: number;
  magicBonusAttack?: number;
  magicBonusDamage?: number;
  description?: string;
}

export interface SpellItemData {
  id: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  isAttack?: boolean;
  saveStat?: "str" | "dex" | "con" | "int" | "wis" | "cha";
  damageDice?: string;
  damageType?: string;
  healingDice?: string;
  description: string;
  prepared?: boolean;
}

export interface CompanionData {
  id: string;
  name: string;
  type: "familiar" | "beast" | "steeldeffender" | "mount" | "sidekick";
  creatureType: string;
  hpCurrent: number;
  hpMax: number;
  ac: number;
  speed: string;
  stats: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  attacks: Array<{
    name: string;
    atkBonus: string;
    damage: string;
    notes?: string;
  }>;
  features: string;
  notes?: string;
}

export interface CharacterSheetData {
  userId: string;
  name: string;
  character: string;
  avatarUrl?: string;

  // Class & Multiclassing
  class: string;
  subclass?: string;
  level: number;
  classes?: MulticlassClassEntry[];

  race: string;
  subrace?: string;
  customLineage?: boolean;
  background: string;
  alignment: string;
  xp: number;
  inspiration: boolean;

  // Abilities (10 default)
  stats: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };

  // Saving throw proficiencies
  savingThrows: {
    str?: boolean;
    dex?: boolean;
    con?: boolean;
    int?: boolean;
    wis?: boolean;
    cha?: boolean;
  };

  // Combat
  hpCurrent: number;
  hpMax: number;
  hpTemp: number;
  ac: number;
  acOverride?: number;
  speed: number;
  initiativeBonus?: number;
  hitDiceTotal: string; // e.g. "5d10"
  hitDiceCurrent: number;
  deathSaves: {
    successes: number;
    failures: number;
  };

  // Skills: 0 = none, 1 = proficient, 2 = expertise
  skills: Record<string, number>;

  // Proficiencies & Languages
  languages?: string[];
  toolProficiencies?: string[];
  armorProficiencies?: string[];
  weaponProficiencies?: string[];

  // Attacks
  attacks: Array<{
    id: string;
    name: string;
    atkBonus: string;
    damage: string;
    notes?: string;
  }>;

  // Equipment & Inventory
  inventory?: string;
  inventoryItems?: InventoryItemData[];
  equipped?: {
    armorId?: string;
    shieldId?: string;
    mainHandId?: string;
    offHandId?: string;
    attunedItemIds?: string[];
  };

  // Spellcasting
  spellcastingAbility?: "int" | "wis" | "cha" | "none";
  spellSlots: Record<number, { total: number; used: number }>;
  pactSlots?: { level: number; total: number; used: number };
  spells?: SpellItemData[];

  // Class Features & Feats
  features?: string;
  featureList?: Array<{
    id: string;
    name: string;
    source: string;
    level: number;
    description: string;
  }>;

  // Companions
  companions?: CompanionData[];
  activeCompanionId?: string;

  notes: string;
  updatedAt: number;
}

const CLASS_PROFILES: Record<string, { hitDie: string; saves: [string, string]; spellAbility?: "int" | "wis" | "cha" | "none" }> = {
  Barbarian: { hitDie: "d12", saves: ["str", "con"] },
  Bard: { hitDie: "d8", saves: ["dex", "cha"], spellAbility: "cha" },
  Cleric: { hitDie: "d8", saves: ["wis", "cha"], spellAbility: "wis" },
  Druid: { hitDie: "d8", saves: ["int", "wis"], spellAbility: "wis" },
  Fighter: { hitDie: "d10", saves: ["str", "con"] },
  Monk: { hitDie: "d8", saves: ["str", "dex"] },
  Paladin: { hitDie: "d10", saves: ["wis", "cha"], spellAbility: "cha" },
  Ranger: { hitDie: "d10", saves: ["str", "dex"], spellAbility: "wis" },
  Rogue: { hitDie: "d8", saves: ["dex", "int"] },
  Sorcerer: { hitDie: "d6", saves: ["con", "cha"], spellAbility: "cha" },
  Warlock: { hitDie: "d8", saves: ["wis", "cha"], spellAbility: "cha" },
  Wizard: { hitDie: "d6", saves: ["int", "wis"], spellAbility: "int" },
  Artificer: { hitDie: "d8", saves: ["con", "int"], spellAbility: "int" },
  "Blood Hunter": { hitDie: "d10", saves: ["dex", "int"] },
};

const DEFAULT_SHEET = (
  userId: string,
  character: string,
  name: string,
  userClass: string = "Fighter",
  userLevel: number = 1
): CharacterSheetData => {
  const className = userClass || "Fighter";
  const prof = CLASS_PROFILES[className] || CLASS_PROFILES.Fighter;
  const level = Math.max(1, Math.min(20, userLevel || 1));
  const hitDieNum = parseInt(prof.hitDie.slice(1), 10) || 10;
  const conMod = 2;
  const hp = hitDieNum + conMod + (level - 1) * (Math.floor(hitDieNum / 2) + 1 + conMod);

  return {
    userId,
    name,
    character,
    class: className,
    subclass: "",
    level,
    classes: [{ className, level, hitDie: prof.hitDie }],
    race: "Human",
    background: "Soldier",
    alignment: "Neutral Good",
    xp: 0,
    inspiration: false,
    stats: {
      str: 15,
      dex: 14,
      con: 14,
      int: 10,
      wis: 12,
      cha: 8,
    },
    savingThrows: {
      [prof.saves[0]]: true,
      [prof.saves[1]]: true,
    },
    hpCurrent: hp,
    hpMax: hp,
    hpTemp: 0,
    ac: 14,
    speed: 30,
    initiativeBonus: 0,
    hitDiceTotal: `${level}${prof.hitDie}`,
    hitDiceCurrent: level,
    deathSaves: {
      successes: 0,
      failures: 0,
    },
    skills: {
      athletics: 1,
      survival: 1,
      perception: 1,
    },
    languages: ["Common"],
    toolProficiencies: [],
    armorProficiencies: ["Light armor", "Medium armor"],
    weaponProficiencies: ["Simple weapons", "Martial weapons"],
    attacks: [
      {
        id: "atk-1",
        name: "Primary Weapon",
        atkBonus: `+${2 + Math.floor((level - 1) / 4) + 2}`,
        damage: "1d8+2 Slashing",
        notes: "Melee",
      },
    ],
    inventoryItems: [],
    equipped: {},
    spellcastingAbility: prof.spellAbility || "none",
    spellSlots: {
      1: { total: level >= 2 && className === "Paladin" ? (level >= 5 ? 4 : level >= 3 ? 3 : 2) : 0, used: 0 },
      2: { total: level >= 5 && className === "Paladin" ? 2 : 0, used: 0 },
      3: { total: 0, used: 0 },
      4: { total: 0, used: 0 },
      5: { total: 0, used: 0 },
      6: { total: 0, used: 0 },
      7: { total: 0, used: 0 },
      8: { total: 0, used: 0 },
      9: { total: 0, used: 0 },
    },
    spells: [],
    featureList: [],
    features: "",
    inventory: "Adventurer's Pack",
    companions: [],
    notes: "New adventurer ready to explore.",
    updatedAt: Date.now(),
  };
};

function getSheetPath(userId: string): string {
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `.hub/sheets/${safeId}.json`;
}

/**
 * GET /api/character/sheet?userId=<optional>
 */
export const GET = handle(async (req: Request) => {
  const ctx = await requireCtx();
  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId") || ctx.user.id;

  const sheetPath = getSheetPath(targetUserId);

  let sheetData: CharacterSheetData;
  let isNew = false;

  try {
    const raw = await ctx.storage.read(sheetPath);
    sheetData = JSON.parse(raw);
    // Ensure classes array exists
    if (!sheetData.classes || sheetData.classes.length === 0) {
      sheetData.classes = [
        {
          className: sheetData.class || "Fighter",
          subclass: sheetData.subclass,
          level: sheetData.level || 1,
          hitDie: "d10",
        },
      ];
    }
    if (!sheetData.inventoryItems) {
      sheetData.inventoryItems = [];
    }
    if (!sheetData.spells) {
      sheetData.spells = [];
    }
    if (!sheetData.companions) {
      sheetData.companions = [];
    }
    if (!sheetData.featureList) {
      sheetData.featureList = [];
    }
  } catch {
    isNew = true;
    const users = await loadUsers(ctx.storage);
    const targetUser = users.find((u) => u.id === targetUserId);
    sheetData = DEFAULT_SHEET(
      targetUserId,
      targetUser?.character || (targetUserId === ctx.user.id ? ctx.user.character : targetUserId),
      targetUser?.name || (targetUserId === ctx.user.id ? ctx.user.name : targetUserId),
      targetUser?.class,
      targetUser?.level
    );
  }

  return Response.json({
    success: true,
    sheet: sheetData,
    isNew,
    isOwner: targetUserId === ctx.user.id,
    isScribe: ctx.isScribe,
  });
});

/**
 * POST /api/character/sheet
 * Saves sheet updates to storage & syncs summary stats to PC dossier note
 */
export const POST = handle(async (req: Request) => {
  const ctx = await requireCtx();
  const body = (await req.json()) as CharacterSheetData;

  if (!body || !body.userId) {
    throw new HttpError(400, "Missing sheet data or userId");
  }

  // Permission check: only the character owner or a Scribe can save changes
  if (body.userId !== ctx.user.id && !ctx.isScribe) {
    throw new HttpError(403, "You can only edit your own character sheet.");
  }

  const sheetPath = getSheetPath(body.userId);
  body.updatedAt = Date.now();

  // Save full JSON sheet
  await ctx.storage.write(sheetPath, JSON.stringify(body, null, 2));

  // Sync vital stats to the character markdown note frontmatter if it exists
  try {
    const pcNotePath = `Notes/PC Notes/${body.character}.md`;
    if (await ctx.storage.exists(pcNotePath)) {
      let rawNote = await ctx.storage.read(pcNotePath);
      if (body.class) rawNote = setFrontmatterKey(rawNote, "class", body.class);
      if (body.level) rawNote = setFrontmatterKey(rawNote, "level", String(body.level));
      if (body.hpMax) rawNote = setFrontmatterKey(rawNote, "max_hp", String(body.hpMax));
      if (body.ac) rawNote = setFrontmatterKey(rawNote, "ac", String(body.ac));
      await ctx.storage.write(pcNotePath, rawNote);
    }
  } catch (err) {
    console.warn("Could not sync sheet frontmatter to markdown note:", err);
  }

  return Response.json({
    success: true,
    sheet: body,
    savedAt: body.updatedAt,
  });
});
