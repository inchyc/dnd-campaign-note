export interface SubraceDefinition {
  id: string;
  name: string;
  abilityBonuses: Partial<Record<"str" | "dex" | "con" | "int" | "wis" | "cha", number>>;
  speed?: number;
  traits: Array<{ name: string; description: string }>;
  extraSkills?: string[];
}

export interface RaceDefinition {
  id: string;
  name: string;
  speed: number;
  abilityBonuses: Partial<Record<"str" | "dex" | "con" | "int" | "wis" | "cha", number>>;
  hasFlexibleBonuses?: boolean; // e.g. Half-Elf (+2 Cha, +1 to any two others), Variant Human (+1 to any two)
  flexibleBonusCount?: number;
  traits: Array<{ name: string; description: string }>;
  subraces: SubraceDefinition[];
  languages: string[];
}

export const RACES_5E: Record<string, RaceDefinition> = {
  Human: {
    id: "human",
    name: "Human",
    speed: 30,
    abilityBonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    languages: ["Common", "One extra language"],
    traits: [
      { name: "Versatile", description: "Humans are the most adaptable and ambitious people among the common races." },
    ],
    subraces: [
      {
        id: "standard_human",
        name: "Standard Human",
        abilityBonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
        traits: [{ name: "Ability Score Increase", description: "Your ability scores each increase by 1." }],
      },
      {
        id: "variant_human",
        name: "Variant Human",
        abilityBonuses: {}, // +1 to two different ability scores of your choice
        traits: [
          { name: "Bonus Feat", description: "You gain one feat of your choice." },
          { name: "Skill Proficiency", description: "You gain proficiency in one skill of your choice." },
        ],
      },
    ],
  },
  Elf: {
    id: "elf",
    name: "Elf",
    speed: 30,
    abilityBonuses: { dex: 2 },
    languages: ["Common", "Elvish"],
    traits: [
      { name: "Darkvision", description: "Accustomed to twilit forests and the night sky, you have superior vision in dark and dim conditions (60 ft)." },
      { name: "Keen Senses", description: "You have proficiency in the Perception skill." },
      { name: "Fey Ancestry", description: "You have advantage on saving throws against being charmed, and magic can't put you to sleep." },
      { name: "Trance", description: "Elves don't need to sleep. Instead, they meditate deeply for 4 hours a day to gain the same benefit as 8 hours of sleep." },
    ],
    subraces: [
      {
        id: "high_elf",
        name: "High Elf",
        abilityBonuses: { int: 1 },
        traits: [
          { name: "Elf Weapon Training", description: "Proficiency with the longsword, shortsword, shortbow, and longbow." },
          { name: "Cantrip", description: "You know one cantrip of your choice from the wizard spell list (uses INT)." },
          { name: "Extra Language", description: "You can speak, read, and write one extra language." },
        ],
      },
      {
        id: "wood_elf",
        name: "Wood Elf",
        speed: 35,
        abilityBonuses: { wis: 1 },
        traits: [
          { name: "Elf Weapon Training", description: "Proficiency with the longsword, shortsword, shortbow, and longbow." },
          { name: "Fleet of Foot", description: "Your base walking speed increases to 35 feet." },
          { name: "Mask of the Wild", description: "You can attempt to hide even when you are only lightly obscured by foliage, heavy rain, falling snow, mist, or other natural phenomena." },
        ],
      },
      {
        id: "drow",
        name: "Drow (Dark Elf)",
        abilityBonuses: { cha: 1 },
        traits: [
          { name: "Superior Darkvision", description: "Your darkvision has a radius of 120 feet." },
          { name: "Sunlight Sensitivity", description: "Disadvantage on attack rolls and Perception checks that rely on sight when you or your target is in direct sunlight." },
          { name: "Drow Magic", description: "Dancing Lights cantrip. At 3rd level, Faerie Fire (1/day). At 5th level, Darkness (1/day)." },
          { name: "Drow Weapon Training", description: "Proficiency with rapiers, shortswords, and hand crossbows." },
        ],
      },
    ],
  },
  Dwarf: {
    id: "dwarf",
    name: "Dwarf",
    speed: 25,
    abilityBonuses: { con: 2 },
    languages: ["Common", "Dwarvish"],
    traits: [
      { name: "Darkvision", description: "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if dim light." },
      { name: "Dwarven Resilience", description: "Advantage on saving throws against poison, and resistance against poison damage." },
      { name: "Dwarven Combat Training", description: "Proficiency with battleaxe, handaxe, light hammer, and warhammer." },
      { name: "Tool Proficiency", description: "Proficiency with smith's tools, brewer's supplies, or mason's tools." },
      { name: "Stonecunning", description: "Add double proficiency bonus to History checks related to the origin of stonework." },
    ],
    subraces: [
      {
        id: "hill_dwarf",
        name: "Hill Dwarf",
        abilityBonuses: { wis: 1 },
        traits: [
          { name: "Dwarven Toughness", description: "Your hit point maximum increases by 1, and it increases by 1 every time you gain a level." },
        ],
      },
      {
        id: "mountain_dwarf",
        name: "Mountain Dwarf",
        abilityBonuses: { str: 2 },
        traits: [
          { name: "Dwarven Armor Training", description: "Proficiency with light and medium armor." },
        ],
      },
    ],
  },
  Halfling: {
    id: "halfling",
    name: "Halfling",
    speed: 25,
    abilityBonuses: { dex: 2 },
    languages: ["Common", "Halfling"],
    traits: [
      { name: "Lucky", description: "When you roll a 1 on the d20 for an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll." },
      { name: "Brave", description: "Advantage on saving throws against being frightened." },
      { name: "Halfling Nimbleness", description: "You can move through the space of any creature that is of a size larger than yours." },
    ],
    subraces: [
      {
        id: "lightfoot_halfling",
        name: "Lightfoot Halfling",
        abilityBonuses: { cha: 1 },
        traits: [
          { name: "Naturally Stealthy", description: "You can attempt to hide even when you are obscured only by a creature that is at least one size larger than you." },
        ],
      },
      {
        id: "stout_halfling",
        name: "Stout Halfling",
        abilityBonuses: { con: 1 },
        traits: [
          { name: "Stout Resilience", description: "Advantage on saves vs poison and resistance against poison damage." },
        ],
      },
    ],
  },
  Dragonborn: {
    id: "dragonborn",
    name: "Dragonborn",
    speed: 30,
    abilityBonuses: { str: 2, cha: 1 },
    languages: ["Common", "Draconic"],
    traits: [
      { name: "Draconic Ancestry", description: "Descendant of a dragon (Black/Acid, Blue/Lightning, Red/Fire, Gold/Fire, White/Cold, Silver/Cold, etc.)." },
      { name: "Breath Weapon", description: "Exhale destructive energy (2d6 damage at lv 1, scaling to 5d6 at lv 16; 1/short or long rest)." },
      { name: "Damage Resistance", description: "Resistance to the damage type associated with your draconic ancestry." },
    ],
    subraces: [],
  },
  Gnome: {
    id: "gnome",
    name: "Gnome",
    speed: 25,
    abilityBonuses: { int: 2 },
    languages: ["Common", "Gnomish"],
    traits: [
      { name: "Darkvision", description: "See in dim light within 60 ft as if bright light, and darkness as dim light." },
      { name: "Gnome Cunning", description: "Advantage on all Intelligence, Wisdom, and Charisma saving throws against magic." },
    ],
    subraces: [
      {
        id: "rock_gnome",
        name: "Rock Gnome",
        abilityBonuses: { con: 1 },
        traits: [
          { name: "Artificer's Lore", description: "Add double proficiency bonus to History checks related to magic items, alchemical objects, or technological devices." },
          { name: "Tinker", description: "Use tinker's tools to construct tiny clockwork devices (toy, fire starter, music box)." },
        ],
      },
      {
        id: "forest_gnome",
        name: "Forest Gnome",
        abilityBonuses: { dex: 1 },
        traits: [
          { name: "Natural Illusionist", description: "You know the Minor Illusion cantrip (uses INT)." },
          { name: "Speak with Small Beasts", description: "Through sounds and gestures, you can communicate simple ideas with Small or smaller beasts." },
        ],
      },
    ],
  },
  "Half-Elf": {
    id: "half_elf",
    name: "Half-Elf",
    speed: 30,
    abilityBonuses: { cha: 2 }, // plus +1 to two other stats of choice
    hasFlexibleBonuses: true,
    flexibleBonusCount: 2,
    languages: ["Common", "Elvish", "One extra language"],
    traits: [
      { name: "Darkvision", description: "See in dim light within 60 ft as bright light, and in darkness as dim light." },
      { name: "Fey Ancestry", description: "Advantage on saving throws against being charmed, and magic can't put you to sleep." },
      { name: "Skill Versatility", description: "You gain proficiency in two skills of your choice." },
    ],
    subraces: [],
  },
  "Half-Orc": {
    id: "half_orc",
    name: "Half-Orc",
    speed: 30,
    abilityBonuses: { str: 2, con: 1 },
    languages: ["Common", "Orc"],
    traits: [
      { name: "Darkvision", description: "See in dim light within 60 ft as bright light, and in darkness as dim light." },
      { name: "Menacing", description: "You gain proficiency in the Intimidation skill." },
      { name: "Relentless Endurance", description: "When you are reduced to 0 HP but not killed outright, you can drop to 1 HP instead (1/long rest)." },
      { name: "Savage Attacks", description: "When you score a critical hit with a melee weapon attack, roll one of the weapon's damage dice one additional time and add it to the extra damage." },
    ],
    subraces: [],
  },
  Tiefling: {
    id: "tiefling",
    name: "Tiefling",
    speed: 30,
    abilityBonuses: { cha: 2, int: 1 },
    languages: ["Common", "Infernal"],
    traits: [
      { name: "Darkvision", description: "See in dim light within 60 ft as bright light, and in darkness as dim light." },
      { name: "Hellish Resistance", description: "You have resistance to fire damage." },
      { name: "Infernal Legacy", description: "You know the Thaumaturgy cantrip. At 3rd level, cast Hellish Rebuke (2nd-level) once per long rest. At 5th level, cast Darkness once per long rest." },
    ],
    subraces: [],
  },
};
