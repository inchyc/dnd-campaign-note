import { HttpError, handle, requireCtx } from "@/lib/auth";
import { setFrontmatterKey } from "@/lib/vault";

export const dynamic = "force-dynamic";

export interface CharacterSheetData {
  userId: string;
  name: string;
  character: string;
  class: string;
  subclass?: string;
  level: number;
  race: string;
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
  // Attacks
  attacks: Array<{
    id: string;
    name: string;
    atkBonus: string;
    damage: string;
    notes?: string;
  }>;
  // Spellcasting
  spellcastingAbility?: "int" | "wis" | "cha" | "none";
  spellSlots: Record<number, { total: number; used: number }>;
  // Text blocks
  features: string;
  inventory: string;
  notes: string;
  updatedAt: number;
}

const DEFAULT_SHEET = (userId: string, character: string, name: string): CharacterSheetData => ({
  userId,
  name,
  character,
  class: "Fighter",
  subclass: "Champion",
  level: 1,
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
    str: true,
    con: true,
  },
  hpCurrent: 12,
  hpMax: 12,
  hpTemp: 0,
  ac: 16,
  speed: 30,
  initiativeBonus: 0,
  hitDiceTotal: "1d10",
  hitDiceCurrent: 1,
  deathSaves: {
    successes: 0,
    failures: 0,
  },
  skills: {
    athletics: 1,
    survival: 1,
    perception: 1,
  },
  attacks: [
    {
      id: "atk-1",
      name: "Longsword",
      atkBonus: "+4",
      damage: "1d8+2 Slashing (Versatile 1d10)",
      notes: "Melee Weapon",
    },
    {
      id: "atk-2",
      name: "Light Crossbow",
      atkBonus: "+4",
      damage: "1d8+2 Piercing",
      notes: "Range 80/320 ft, Loading",
    },
  ],
  spellcastingAbility: "none",
  spellSlots: {
    1: { total: 0, used: 0 },
    2: { total: 0, used: 0 },
    3: { total: 0, used: 0 },
    4: { total: 0, used: 0 },
    5: { total: 0, used: 0 },
    6: { total: 0, used: 0 },
    7: { total: 0, used: 0 },
    8: { total: 0, used: 0 },
    9: { total: 0, used: 0 },
  },
  features: "Second Wind (1d10+1 hp bonus action, 1/short rest)\nFighting Style: Dueling (+2 damage with 1-handed weapon)",
  inventory: "Chain shirt, Longsword, Light Crossbow & 20 bolts, Explorer's Pack, 10 gp",
  notes: "Loyal to the party. Keeps watch during night camp.",
  updatedAt: Date.now(),
});

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

  // Non-scribes can view their own sheet or party sheets
  const sheetPath = getSheetPath(targetUserId);

  let sheetData: CharacterSheetData;

  try {
    const raw = await ctx.storage.read(sheetPath);
    sheetData = JSON.parse(raw);
  } catch {
    // Generate default sheet
    sheetData = DEFAULT_SHEET(
      targetUserId,
      targetUserId === ctx.user.id ? ctx.user.character : targetUserId,
      targetUserId === ctx.user.id ? ctx.user.name : targetUserId
    );
  }

  return Response.json({
    success: true,
    sheet: sheetData,
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
