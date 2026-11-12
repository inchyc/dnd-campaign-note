export interface CompanionPreset {
  id: string;
  name: string;
  type: "familiar" | "beast" | "steeldeffender" | "mount" | "sidekick";
  creatureType: string;
  size: "Tiny" | "Small" | "Medium" | "Large";
  hpMax: number;
  ac: number;
  speed: string;
  stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  attacks: Array<{ name: string; atkBonus: string; damage: string; notes?: string }>;
  features: string;
  source: string;
}

export const COMPANION_PRESETS: CompanionPreset[] = [
  // --- Familiars ---
  {
    id: "familiar_owl",
    name: "Owl (Familiar)",
    type: "familiar",
    creatureType: "Beast (Celestial/Fey/Fiend)",
    size: "Tiny",
    hpMax: 1,
    ac: 11,
    speed: "5 ft., fly 60 ft.",
    stats: { str: 3, dex: 13, con: 8, int: 2, wis: 12, cha: 7 },
    attacks: [{ name: "Talons", atkBonus: "+3", damage: "1 slashing", notes: "Familiars normally cannot attack except via Warlock Pact of Chain or reaction spell delivery." }],
    features: "Flyby: The owl doesn't provoke opportunity attacks when it flies out of an enemy's reach. Keen Hearing and Sight: Advantage on Perception checks relying on hearing or sight. Darkvision: 120 ft.",
    source: "Find Familiar",
  },
  {
    id: "familiar_cat",
    name: "Cat (Familiar)",
    type: "familiar",
    creatureType: "Beast (Celestial/Fey/Fiend)",
    size: "Tiny",
    hpMax: 2,
    ac: 12,
    speed: "40 ft., climb 30 ft.",
    stats: { str: 3, dex: 15, con: 10, int: 3, wis: 12, cha: 7 },
    attacks: [{ name: "Claws", atkBonus: "+0", damage: "1 slashing" }],
    features: "Keen Smell: Advantage on Wisdom (Perception) checks that rely on smell. Stealth +4, Perception +3.",
    source: "Find Familiar",
  },
  {
    id: "familiar_imp",
    name: "Imp (Pact of the Chain)",
    type: "familiar",
    creatureType: "Fiend (Devil)",
    size: "Tiny",
    hpMax: 10,
    ac: 13,
    speed: "20 ft., fly 40 ft.",
    stats: { str: 6, dex: 17, con: 13, int: 11, wis: 12, cha: 14 },
    attacks: [
      { name: "Sting", atkBonus: "+5", damage: "1d4+3 piercing + 3d6 poison", notes: "DC 11 CON save or take 3d6 poison damage (half on success)." },
    ],
    features: "Shapechanger: Can polymorph into a rat, raven, or spider. Invisibility: Turns magically invisible until it attacks or concentration ends. Magic Resistance: Advantage on saves vs spells and magical effects. Devil's Sight: 120 ft see through magical darkness.",
    source: "Pact of the Chain",
  },

  // --- Ranger Beasts ---
  {
    id: "beast_wolf",
    name: "Wolf (Primal Companion)",
    type: "beast",
    creatureType: "Beast",
    size: "Medium",
    hpMax: 11, // scales with Ranger level: 4x Ranger level
    ac: 13, // adds Ranger PB
    speed: "40 ft.",
    stats: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 },
    attacks: [
      { name: "Bite", atkBonus: "+4", damage: "2d4+2 piercing", notes: "Target must succeed on a DC 11 STR save or be knocked prone." },
    ],
    features: "Pack Tactics: The wolf has advantage on attack rolls against a creature if at least one of the wolf's allies is within 5 ft of the creature and isn't incapacitated. Keen Hearing and Smell: Advantage on Perception checks relying on hearing/smell.",
    source: "Beast Master Ranger",
  },
  {
    id: "beast_panther",
    name: "Panther (Beast Companion)",
    type: "beast",
    creatureType: "Beast",
    size: "Medium",
    hpMax: 13,
    ac: 12,
    speed: "50 ft., climb 40 ft.",
    stats: { str: 14, dex: 15, con: 10, int: 3, wis: 14, cha: 7 },
    attacks: [
      { name: "Bite", atkBonus: "+4", damage: "1d6+2 piercing" },
      { name: "Claw", atkBonus: "+4", damage: "1d4+2 slashing" },
    ],
    features: "Pounce: If the panther moves at least 20 ft straight toward a creature and hits with a claw attack, target must succeed on DC 12 STR save or be knocked prone. If prone, panther can make a bite attack as a bonus action.",
    source: "Beast Master Ranger",
  },

  // --- Artificer Companion ---
  {
    id: "steel_defender",
    name: "Steel Defender",
    type: "steeldeffender",
    creatureType: "Construct",
    size: "Medium",
    hpMax: 16, // 2 + INT mod + 5x Artificer level
    ac: 15, // scales with PB
    speed: "40 ft.",
    stats: { str: 14, dex: 12, con: 14, int: 4, wis: 10, cha: 6 },
    attacks: [
      { name: "Force-Empowered Rend", atkBonus: "+4", damage: "1d8+2 force", notes: "Adds Artificer PB to hit." },
    ],
    features: "Repair (3/Day): Magical mechanism restores 2d8 + PB hit points to itself or one construct/object within 5 ft. Deflect Attack: Impose disadvantage on an attack roll made against a creature within 5 ft of the defender.",
    source: "Battle Smith Artificer",
  },

  // --- Mounts ---
  {
    id: "mount_warhorse",
    name: "Warhorse",
    type: "mount",
    creatureType: "Beast",
    size: "Large",
    hpMax: 19,
    ac: 11,
    speed: "60 ft.",
    stats: { str: 18, dex: 12, con: 13, int: 2, wis: 12, cha: 7 },
    attacks: [
      { name: "Hooves", atkBonus: "+6", damage: "2d6+4 bludgeoning", notes: "If moving 20 ft straight towards target, DC 14 STR save or knocked prone; can make bonus action hooves attack." },
    ],
    features: "Trampling Charge: Can overrun knocked prone targets with bonus action hooves attack. Carrying capacity: 540 lbs.",
    source: "Mounts & Vehicles",
  },
];
