export interface WeaponItem {
  id: string;
  name: string;
  category: "simple" | "martial";
  rangeType: "melee" | "ranged";
  damage: string; // e.g. "1d8"
  damageType: "slashing" | "piercing" | "bludgeoning" | "none";
  versatileDamage?: string; // e.g. "1d10"
  properties: string[]; // ["finesse", "light", "heavy", "two-handed", "versatile", "reach", "thrown", "ammunition"]
  range?: string; // e.g. "20/60" or "150/600"
  weight: number;
  cost: string;
}

export interface ArmorItem {
  id: string;
  name: string;
  category: "light" | "medium" | "heavy" | "shield";
  baseAc: number;
  addDex: boolean;
  maxDexMod?: number; // 2 for medium
  strReq?: number;
  stealthDisadvantage: boolean;
  weight: number;
  cost: string;
}

export interface GearItem {
  id: string;
  name: string;
  category: "gear" | "magic" | "potion" | "tool" | "shield";
  description: string;
  weight: number;
  cost: string;
  magicBonusAc?: number;
  magicBonusAttack?: number;
  magicBonusDamage?: number;
}

export interface PackItem {
  id: string;
  name: string;
  cost: string;
  weight: number;
  description: string;
  contents: Array<{ name: string; quantity: number; weight?: number }>;
}

export interface ToolItem {
  id: string;
  name: string;
  category: "artisan" | "kit" | "instrument" | "gaming" | "vehicle";
  cost: string;
  weight: number;
  description: string;
}

export const WEAPONS_5E: WeaponItem[] = [
  // Simple Melee
  { id: "club", name: "Club", category: "simple", rangeType: "melee", damage: "1d4", damageType: "bludgeoning", properties: ["light"], weight: 2, cost: "1 sp" },
  { id: "dagger", name: "Dagger", category: "simple", rangeType: "melee", damage: "1d4", damageType: "piercing", properties: ["finesse", "light", "thrown"], range: "20/60", weight: 1, cost: "2 gp" },
  { id: "greatclub", name: "Greatclub", category: "simple", rangeType: "melee", damage: "1d8", damageType: "bludgeoning", properties: ["two-handed"], weight: 10, cost: "2 sp" },
  { id: "handaxe", name: "Handaxe", category: "simple", rangeType: "melee", damage: "1d6", damageType: "slashing", properties: ["light", "thrown"], range: "20/60", weight: 2, cost: "5 gp" },
  { id: "javelin", name: "Javelin", category: "simple", rangeType: "melee", damage: "1d6", damageType: "piercing", properties: ["thrown"], range: "30/120", weight: 2, cost: "5 sp" },
  { id: "light_hammer", name: "Light Hammer", category: "simple", rangeType: "melee", damage: "1d4", damageType: "bludgeoning", properties: ["light", "thrown"], range: "20/60", weight: 2, cost: "2 gp" },
  { id: "mace", name: "Mace", category: "simple", rangeType: "melee", damage: "1d6", damageType: "bludgeoning", properties: [], weight: 4, cost: "5 gp" },
  { id: "quarterstaff", name: "Quarterstaff", category: "simple", rangeType: "melee", damage: "1d6", damageType: "bludgeoning", versatileDamage: "1d8", properties: ["versatile"], weight: 4, cost: "2 sp" },
  { id: "sickle", name: "Sickle", category: "simple", rangeType: "melee", damage: "1d4", damageType: "slashing", properties: ["light"], weight: 2, cost: "1 gp" },
  { id: "spear", name: "Spear", category: "simple", rangeType: "melee", damage: "1d6", damageType: "piercing", versatileDamage: "1d8", properties: ["thrown", "versatile"], range: "20/60", weight: 3, cost: "1 gp" },
  // Simple Ranged
  { id: "light_crossbow", name: "Light Crossbow", category: "simple", rangeType: "ranged", damage: "1d8", damageType: "piercing", properties: ["ammunition", "loading", "two-handed"], range: "80/320", weight: 5, cost: "25 gp" },
  { id: "dart", name: "Dart", category: "simple", rangeType: "ranged", damage: "1d4", damageType: "piercing", properties: ["finesse", "thrown"], range: "20/60", weight: 0.25, cost: "5 cp" },
  { id: "shortbow", name: "Shortbow", category: "simple", rangeType: "ranged", damage: "1d6", damageType: "piercing", properties: ["ammunition", "two-handed"], range: "80/320", weight: 2, cost: "25 gp" },
  { id: "sling", name: "Sling", category: "simple", rangeType: "ranged", damage: "1d4", damageType: "bludgeoning", properties: ["ammunition"], range: "30/120", weight: 0, cost: "1 sp" },
  // Martial Melee
  { id: "battleaxe", name: "Battleaxe", category: "martial", rangeType: "melee", damage: "1d8", damageType: "slashing", versatileDamage: "1d10", properties: ["versatile"], weight: 4, cost: "10 gp" },
  { id: "flail", name: "Flail", category: "martial", rangeType: "melee", damage: "1d8", damageType: "bludgeoning", properties: [], weight: 2, cost: "10 gp" },
  { id: "glaive", name: "Glaive", category: "martial", rangeType: "melee", damage: "1d10", damageType: "slashing", properties: ["heavy", "reach", "two-handed"], weight: 6, cost: "20 gp" },
  { id: "greataxe", name: "Greataxe", category: "martial", rangeType: "melee", damage: "1d12", damageType: "slashing", properties: ["heavy", "two-handed"], weight: 7, cost: "30 gp" },
  { id: "greatsword", name: "Greatsword", category: "martial", rangeType: "melee", damage: "2d6", damageType: "slashing", properties: ["heavy", "two-handed"], weight: 6, cost: "50 gp" },
  { id: "halberd", name: "Halberd", category: "martial", rangeType: "melee", damage: "1d10", damageType: "slashing", properties: ["heavy", "reach", "two-handed"], weight: 6, cost: "20 gp" },
  { id: "lance", name: "Lance", category: "martial", rangeType: "melee", damage: "1d12", damageType: "piercing", properties: ["reach", "special"], weight: 6, cost: "10 gp" },
  { id: "longsword", name: "Longsword", category: "martial", rangeType: "melee", damage: "1d8", damageType: "slashing", versatileDamage: "1d10", properties: ["versatile"], weight: 3, cost: "15 gp" },
  { id: "maul", name: "Maul", category: "martial", rangeType: "melee", damage: "2d6", damageType: "bludgeoning", properties: ["heavy", "two-handed"], weight: 10, cost: "10 gp" },
  { id: "morningstar", name: "Morningstar", category: "martial", rangeType: "melee", damage: "1d8", damageType: "piercing", properties: [], weight: 4, cost: "15 gp" },
  { id: "pike", name: "Pike", category: "martial", rangeType: "melee", damage: "1d10", damageType: "piercing", properties: ["heavy", "reach", "two-handed"], weight: 18, cost: "5 gp" },
  { id: "rapier", name: "Rapier", category: "martial", rangeType: "melee", damage: "1d8", damageType: "piercing", properties: ["finesse"], weight: 2, cost: "25 gp" },
  { id: "scimitar", name: "Scimitar", category: "martial", rangeType: "melee", damage: "1d6", damageType: "slashing", properties: ["finesse", "light"], weight: 3, cost: "25 gp" },
  { id: "shortsword", name: "Shortsword", category: "martial", rangeType: "melee", damage: "1d6", damageType: "piercing", properties: ["finesse", "light"], weight: 2, cost: "10 gp" },
  { id: "trident", name: "Trident", category: "martial", rangeType: "melee", damage: "1d6", damageType: "piercing", versatileDamage: "1d8", properties: ["thrown", "versatile"], range: "20/60", weight: 4, cost: "5 gp" },
  { id: "war_pick", name: "War Pick", category: "martial", rangeType: "melee", damage: "1d8", damageType: "piercing", properties: [], weight: 2, cost: "5 gp" },
  { id: "warhammer", name: "Warhammer", category: "martial", rangeType: "melee", damage: "1d8", damageType: "bludgeoning", versatileDamage: "1d10", properties: ["versatile"], weight: 2, cost: "15 gp" },
  { id: "whip", name: "Whip", category: "martial", rangeType: "melee", damage: "1d4", damageType: "slashing", properties: ["finesse", "reach"], weight: 3, cost: "2 gp" },
  // Martial Ranged
  { id: "blowgun", name: "Blowgun", category: "martial", rangeType: "ranged", damage: "1", damageType: "piercing", properties: ["ammunition", "loading"], range: "25/100", weight: 1, cost: "10 gp" },
  { id: "hand_crossbow", name: "Hand Crossbow", category: "martial", rangeType: "ranged", damage: "1d6", damageType: "piercing", properties: ["ammunition", "finesse", "light", "loading"], range: "30/120", weight: 3, cost: "75 gp" },
  { id: "heavy_crossbow", name: "Heavy Crossbow", category: "martial", rangeType: "ranged", damage: "1d10", damageType: "piercing", properties: ["ammunition", "heavy", "loading", "two-handed"], range: "100/400", weight: 18, cost: "50 gp" },
  { id: "longbow", name: "Longbow", category: "martial", rangeType: "ranged", damage: "1d8", damageType: "piercing", properties: ["ammunition", "heavy", "two-handed"], range: "150/600", weight: 2, cost: "50 gp" },
  { id: "net", name: "Net", category: "martial", rangeType: "ranged", damage: "0", damageType: "none", properties: ["special", "thrown"], range: "5/15", weight: 3, cost: "1 gp" },
];

export const ARMOR_5E: ArmorItem[] = [
  // Light Armor (AC + DEX)
  { id: "padded", name: "Padded Armor", category: "light", baseAc: 11, addDex: true, stealthDisadvantage: true, weight: 8, cost: "5 gp" },
  { id: "leather", name: "Leather Armor", category: "light", baseAc: 11, addDex: true, stealthDisadvantage: false, weight: 10, cost: "10 gp" },
  { id: "studded_leather", name: "Studded Leather Armor", category: "light", baseAc: 12, addDex: true, stealthDisadvantage: false, weight: 13, cost: "45 gp" },
  // Medium Armor (AC + min(DEX, 2))
  { id: "hide", name: "Hide Armor", category: "medium", baseAc: 12, addDex: true, maxDexMod: 2, stealthDisadvantage: false, weight: 12, cost: "10 gp" },
  { id: "chain_shirt", name: "Chain Shirt", category: "medium", baseAc: 13, addDex: true, maxDexMod: 2, stealthDisadvantage: false, weight: 20, cost: "50 gp" },
  { id: "scale_mail", name: "Scale Mail", category: "medium", baseAc: 14, addDex: true, maxDexMod: 2, stealthDisadvantage: true, weight: 45, cost: "50 gp" },
  { id: "breastplate", name: "Breastplate", category: "medium", baseAc: 14, addDex: true, maxDexMod: 2, stealthDisadvantage: false, weight: 20, cost: "400 gp" },
  { id: "half_plate", name: "Half Plate Armor", category: "medium", baseAc: 15, addDex: true, maxDexMod: 2, stealthDisadvantage: true, weight: 40, cost: "750 gp" },
  // Heavy Armor (Flat AC)
  { id: "ring_mail", name: "Ring Mail", category: "heavy", baseAc: 14, addDex: false, stealthDisadvantage: true, weight: 40, cost: "30 gp" },
  { id: "chain_mail", name: "Chain Mail", category: "heavy", baseAc: 16, addDex: false, strReq: 13, stealthDisadvantage: true, weight: 55, cost: "75 gp" },
  { id: "splint", name: "Splint Armor", category: "heavy", baseAc: 17, addDex: false, strReq: 15, stealthDisadvantage: true, weight: 60, cost: "200 gp" },
  { id: "plate", name: "Plate Armor", category: "heavy", baseAc: 18, addDex: false, strReq: 15, stealthDisadvantage: true, weight: 65, cost: "1,500 gp" },
  // Shield (+2 AC)
  { id: "shield", name: "Shield", category: "shield", baseAc: 2, addDex: false, stealthDisadvantage: false, weight: 6, cost: "10 gp" },
];

export const GEAR_5E: GearItem[] = [
  { id: "potion_healing", name: "Potion of Healing", category: "potion", description: "Regains 2d4 + 2 hit points when consumed.", weight: 0.5, cost: "50 gp" },
  { id: "potion_greater_healing", name: "Potion of Greater Healing", category: "potion", description: "Regains 4d4 + 4 hit points when consumed.", weight: 0.5, cost: "150 gp" },
  { id: "potion_superior_healing", name: "Potion of Superior Healing", category: "potion", description: "Regains 8d4 + 8 hit points when consumed.", weight: 0.5, cost: "500 gp" },
  { id: "antitoxin", name: "Antitoxin (vial)", category: "potion", description: "Grants advantage on saving throws against poison for 1 hour.", weight: 0, cost: "50 gp" },
  { id: "thieves_tools", name: "Thieves' Tools", category: "tool", description: "Essential set of tools for picking locks and disarming traps.", weight: 1, cost: "25 gp" },
  // Ammunition
  { id: "arrows_20", name: "Arrows (20)", category: "gear", description: "Standard quiver complement of 20 arrows for shortbows and longbows.", weight: 1, cost: "1 gp" },
  { id: "crossbow_bolts_20", name: "Crossbow Bolts (20)", category: "gear", description: "Case of 20 bolts for light, hand, or heavy crossbows.", weight: 1.5, cost: "1 gp" },
  { id: "sling_bullets_20", name: "Sling Bullets (20)", category: "gear", description: "Pouch of 20 lead bullets for a sling.", weight: 1.5, cost: "4 cp" },
  { id: "blowgun_needles_50", name: "Blowgun Needles (50)", category: "gear", description: "Case of 50 needles for a blowgun.", weight: 1, cost: "1 gp" },
  { id: "quiver", name: "Quiver", category: "gear", description: "Holds up to 20 arrows.", weight: 1, cost: "1 gp" },
  { id: "crossbow_bolt_case", name: "Case, Crossbow Bolt", category: "gear", description: "Wooden case holding up to 20 crossbow bolts.", weight: 1, cost: "1 gp" },
  // Spellcasting Foci & Books
  { id: "arcane_focus_crystal", name: "Arcane Focus (Crystal)", category: "gear", description: "Channel arcane spells using a faceted crystal focus.", weight: 1, cost: "10 gp" },
  { id: "arcane_focus_orb", name: "Arcane Focus (Orb)", category: "gear", description: "Channel arcane spells using a glass or crystal orb.", weight: 3, cost: "20 gp" },
  { id: "arcane_focus_rod", name: "Arcane Focus (Rod)", category: "gear", description: "Channel arcane spells using a carved metal or wooden rod.", weight: 2, cost: "10 gp" },
  { id: "arcane_focus_staff", name: "Arcane Focus (Staff)", category: "gear", description: "Channel arcane spells using a specially crafted staff (can double as quarterstaff).", weight: 4, cost: "5 gp" },
  { id: "arcane_focus_wand", name: "Arcane Focus (Wand)", category: "gear", description: "Special item used to channel arcane spells.", weight: 1, cost: "10 gp" },
  { id: "component_pouch", name: "Component Pouch", category: "gear", description: "Watertight leather belt pouch with compartments for material spell components.", weight: 2, cost: "25 gp" },
  { id: "druidic_focus_mistletoe", name: "Druidic Focus (Sprig of Mistletoe)", category: "gear", description: "Natural charm used to channel druid spells.", weight: 0, cost: "1 gp" },
  { id: "druidic_focus_totem", name: "Druidic Focus (Totem)", category: "gear", description: "Carved totem of feathers, fur, or bone to channel druid spells.", weight: 0, cost: "1 gp" },
  { id: "druidic_focus_wooden_staff", name: "Druidic Focus (Wooden Staff)", category: "gear", description: "Carved wooden staff drawn from a living tree to channel druid spells.", weight: 4, cost: "5 gp" },
  { id: "druidic_focus_yew_wand", name: "Druidic Focus (Yew Wand)", category: "gear", description: "Wand carved from yew wood to channel druid spells.", weight: 1, cost: "10 gp" },
  { id: "holy_symbol_amulet", name: "Holy Symbol (Amulet)", category: "gear", description: "Sacred symbol channeling divine power.", weight: 1, cost: "5 gp" },
  { id: "holy_symbol_emblem", name: "Holy Symbol (Emblem)", category: "gear", description: "Sacred emblem engraved or inlaid on armor or a shield.", weight: 0, cost: "5 gp" },
  { id: "holy_symbol_reliquary", name: "Holy Symbol (Reliquary)", category: "gear", description: "Small box holding a fragment of a sacred relic.", weight: 2, cost: "5 gp" },
  { id: "spellbook", name: "Spellbook", category: "gear", description: "Leather-bound tome with 100 blank vellum pages for recording wizard spells.", weight: 3, cost: "50 gp" },
  // Adventuring Gear
  { id: "backpack", name: "Backpack", category: "gear", description: "Holds up to 30 lbs or 1 cubic foot of gear.", weight: 5, cost: "2 gp" },
  { id: "bedroll", name: "Bedroll", category: "gear", description: "Warm sleeping roll for camping.", weight: 7, cost: "1 gp" },
  { id: "rope_hempen", name: "Hempen Rope (50 ft)", category: "gear", description: "Sturdy rope with 2 HP that can be burst with a DC 17 Strength check.", weight: 10, cost: "1 gp" },
  { id: "rope_silk", name: "Silk Rope (50 ft)", category: "gear", description: "Strong and lightweight climbing rope.", weight: 5, cost: "10 gp" },
  { id: "torch", name: "Torch (10)", category: "gear", description: "Provides bright light in a 20-ft radius for 1 hour.", weight: 10, cost: "1 sp" },
  { id: "rations", name: "Rations (10 days)", category: "gear", description: "Dry food supplies for extended travel.", weight: 20, cost: "5 gp" },
  { id: "waterskin", name: "Waterskin", category: "gear", description: "Holds up to 4 pints of liquid.", weight: 5, cost: "2 sp" },
  { id: "healers_kit", name: "Healer's Kit", category: "gear", description: "10 uses; stabilize a creature at 0 HP as an action without a Medicine check.", weight: 3, cost: "5 gp" },
  { id: "climbers_kit", name: "Climber's Kit", category: "gear", description: "Pitons, boot tips, gloves, and harness; anchor yourself as an action so you cannot fall more than 25 ft.", weight: 12, cost: "25 gp" },
  { id: "crowbar", name: "Crowbar", category: "gear", description: "Grants advantage on Strength checks where leverage can be applied.", weight: 5, cost: "2 gp" },
  { id: "grappling_hook", name: "Grappling Hook", category: "gear", description: "Iron hook for securing a climbing rope.", weight: 4, cost: "2 gp" },
  { id: "lantern_hooded", name: "Lantern, Hooded", category: "gear", description: "Casts bright light 30 ft and dim light 30 ft for 6 hours per flask of oil.", weight: 2, cost: "5 gp" },
  { id: "lantern_bullseye", name: "Lantern, Bullseye", category: "gear", description: "Casts bright light in a 60-ft cone and dim light another 60 ft.", weight: 2, cost: "10 gp" },
  { id: "oil_flask", name: "Oil (flask)", category: "gear", description: "Burns in lanterns or splashes an area for fire damage.", weight: 1, cost: "1 sp" },
  { id: "tinderbox", name: "Tinderbox", category: "gear", description: "Flint, fire steel, and tinder for lighting fires.", weight: 1, cost: "5 sp" },
  { id: "tent_two_person", name: "Tent, Two-Person", category: "gear", description: "Simple canvas shelter sleeping two.", weight: 20, cost: "2 gp" },
  { id: "spyglass", name: "Spyglass", category: "gear", description: "Objects viewed through it are magnified to twice their size.", weight: 1, cost: "1,000 gp" },
  { id: "manacles", name: "Manacles", category: "gear", description: "Metal restraints requiring DC 20 DEX/STR to escape.", weight: 6, cost: "2 gp" },
  { id: "caltrops", name: "Caltrops (bag of 20)", category: "gear", description: "Cover a 5-ft square; creatures must succeed on DC 15 DEX save or stop and take 1 piercing damage.", weight: 2, cost: "1 gp" },
  { id: "ball_bearings", name: "Ball Bearings (bag of 1,000)", category: "gear", description: "Cover a 10-ft square; creatures must succeed on DC 10 DEX save or fall prone.", weight: 2, cost: "1 gp" },
  { id: "acid_vial", name: "Acid (vial)", category: "gear", description: "Thrown 20 ft improvised weapon dealing 2d6 acid damage on a hit.", weight: 1, cost: "25 gp" },
  { id: "alchemists_fire", name: "Alchemist's Fire (flask)", category: "gear", description: "Thrown 20 ft improvised weapon igniting target for 1d4 fire damage at start of its turns.", weight: 1, cost: "50 gp" },
  { id: "holy_water", name: "Holy Water (flask)", category: "gear", description: "Deals 2d6 radiant damage to fiends and undead when splashed.", weight: 1, cost: "25 gp" },
  // Magic items
  { id: "weapon_plus_1", name: "+1 Weapon", category: "magic", description: "+1 bonus to attack and damage rolls made with this magic weapon.", weight: 3, cost: "500 gp", magicBonusAttack: 1, magicBonusDamage: 1 },
  { id: "weapon_plus_2", name: "+2 Weapon", category: "magic", description: "+2 bonus to attack and damage rolls made with this magic weapon.", weight: 3, cost: "2,000 gp", magicBonusAttack: 2, magicBonusDamage: 2 },
  { id: "shield_plus_1", name: "+1 Shield", category: "shield", description: "+1 bonus to AC in addition to the shield's normal bonus (+3 AC total).", weight: 6, cost: "500 gp", magicBonusAc: 1 },
  { id: "armor_plus_1", name: "+1 Armor", category: "magic", description: "+1 bonus to AC in addition to the armor's base AC.", weight: 20, cost: "1,500 gp", magicBonusAc: 1 },
  { id: "ring_of_protection", name: "Ring of Protection", category: "magic", description: "Requires attunement. You gain a +1 bonus to AC and saving throws.", weight: 0.1, cost: "3,500 gp", magicBonusAc: 1 },
  { id: "bracers_of_defense", name: "Bracers of Defense", category: "magic", description: "Requires attunement. While you are wearing no armor and using no shield, you gain a +2 bonus to AC.", weight: 0.5, cost: "4,000 gp", magicBonusAc: 2 },
  { id: "cloak_of_protection", name: "Cloak of Protection", category: "magic", description: "Requires attunement. You gain a +1 bonus to AC and saving throws.", weight: 1, cost: "3,500 gp", magicBonusAc: 1 },
];

export const PACKS_5E: PackItem[] = [
  {
    id: "burglars_pack",
    name: "Burglar's Pack",
    cost: "16 gp",
    weight: 47.5,
    description: "Backpack, 1,000 ball bearings, 10 ft string, bell, 5 candles, crowbar, hammer, 10 pitons, hooded lantern, 2 flasks oil, 5 days rations, tinderbox, waterskin, 50 ft hempen rope.",
    contents: [
      { name: "Backpack", quantity: 1, weight: 5 },
      { name: "Ball Bearings (bag of 1,000)", quantity: 1, weight: 2 },
      { name: "String (10 ft)", quantity: 1, weight: 0 },
      { name: "Bell", quantity: 1, weight: 0 },
      { name: "Candle", quantity: 5, weight: 0 },
      { name: "Crowbar", quantity: 1, weight: 5 },
      { name: "Hammer", quantity: 1, weight: 3 },
      { name: "Piton", quantity: 10, weight: 0.25 },
      { name: "Lantern, Hooded", quantity: 1, weight: 2 },
      { name: "Oil (flask)", quantity: 2, weight: 1 },
      { name: "Rations (1 day)", quantity: 5, weight: 2 },
      { name: "Tinderbox", quantity: 1, weight: 1 },
      { name: "Waterskin", quantity: 1, weight: 5 },
      { name: "Hempen Rope (50 ft)", quantity: 1, weight: 10 },
    ],
  },
  {
    id: "diplomats_pack",
    name: "Diplomat's Pack",
    cost: "39 gp",
    weight: 46,
    description: "Chest, 2 cases for maps/scrolls, fine clothes, bottle of ink, ink pen, lamp, 2 flasks oil, 5 sheets paper, vial of perfume, sealing wax, soap.",
    contents: [
      { name: "Chest", quantity: 1, weight: 25 },
      { name: "Case, Map or Scroll", quantity: 2, weight: 1 },
      { name: "Fine Clothes", quantity: 1, weight: 6 },
      { name: "Ink (1 oz bottle)", quantity: 1, weight: 0 },
      { name: "Ink Pen", quantity: 1, weight: 0 },
      { name: "Lamp", quantity: 1, weight: 1 },
      { name: "Oil (flask)", quantity: 2, weight: 1 },
      { name: "Paper (sheet)", quantity: 5, weight: 0 },
      { name: "Perfume (vial)", quantity: 1, weight: 0 },
      { name: "Sealing Wax", quantity: 1, weight: 0 },
      { name: "Soap", quantity: 1, weight: 0 },
    ],
  },
  {
    id: "dungeoneers_pack",
    name: "Dungeoneer's Pack",
    cost: "12 gp",
    weight: 61.5,
    description: "Backpack, crowbar, hammer, 10 pitons, 10 torches, tinderbox, 10 days rations, waterskin, 50 ft hempen rope.",
    contents: [
      { name: "Backpack", quantity: 1, weight: 5 },
      { name: "Crowbar", quantity: 1, weight: 5 },
      { name: "Hammer", quantity: 1, weight: 3 },
      { name: "Piton", quantity: 10, weight: 0.25 },
      { name: "Torch", quantity: 10, weight: 1 },
      { name: "Tinderbox", quantity: 1, weight: 1 },
      { name: "Rations (1 day)", quantity: 10, weight: 2 },
      { name: "Waterskin", quantity: 1, weight: 5 },
      { name: "Hempen Rope (50 ft)", quantity: 1, weight: 10 },
    ],
  },
  {
    id: "entertainers_pack",
    name: "Entertainer's Pack",
    cost: "40 gp",
    weight: 38,
    description: "Backpack, bedroll, 2 costumes, 5 candles, 5 days rations, waterskin, disguise kit.",
    contents: [
      { name: "Backpack", quantity: 1, weight: 5 },
      { name: "Bedroll", quantity: 1, weight: 7 },
      { name: "Costume", quantity: 2, weight: 4 },
      { name: "Candle", quantity: 5, weight: 0 },
      { name: "Rations (1 day)", quantity: 5, weight: 2 },
      { name: "Waterskin", quantity: 1, weight: 5 },
      { name: "Disguise Kit", quantity: 1, weight: 3 },
    ],
  },
  {
    id: "explorers_pack",
    name: "Explorer's Pack",
    cost: "10 gp",
    weight: 59,
    description: "Backpack, bedroll, mess kit, tinderbox, 10 torches, 10 days rations, waterskin, 50 ft hempen rope.",
    contents: [
      { name: "Backpack", quantity: 1, weight: 5 },
      { name: "Bedroll", quantity: 1, weight: 7 },
      { name: "Mess Kit", quantity: 1, weight: 1 },
      { name: "Tinderbox", quantity: 1, weight: 1 },
      { name: "Torch", quantity: 10, weight: 1 },
      { name: "Rations (1 day)", quantity: 10, weight: 2 },
      { name: "Waterskin", quantity: 1, weight: 5 },
      { name: "Hempen Rope (50 ft)", quantity: 1, weight: 10 },
    ],
  },
  {
    id: "monster_hunters_pack",
    name: "Monster Hunter's Pack",
    cost: "33 gp",
    weight: 41,
    description: "Chest, crowbar, hammer, 3 wooden stakes, holy symbol, flask of holy water, manacles, steel mirror, flask of oil, tinderbox, 3 torches.",
    contents: [
      { name: "Chest", quantity: 1, weight: 25 },
      { name: "Crowbar", quantity: 1, weight: 5 },
      { name: "Hammer", quantity: 1, weight: 3 },
      { name: "Wooden Stake", quantity: 3, weight: 0.5 },
      { name: "Holy Symbol", quantity: 1, weight: 1 },
      { name: "Holy Water (flask)", quantity: 1, weight: 1 },
      { name: "Manacles", quantity: 1, weight: 6 },
      { name: "Mirror, Steel", quantity: 1, weight: 0.5 },
      { name: "Oil (flask)", quantity: 1, weight: 1 },
      { name: "Tinderbox", quantity: 1, weight: 1 },
      { name: "Torch", quantity: 3, weight: 1 },
    ],
  },
  {
    id: "priests_pack",
    name: "Priest's Pack",
    cost: "19 gp",
    weight: 24,
    description: "Backpack, blanket, 10 candles, tinderbox, alms box, 2 blocks of incense, censer, vestments, 2 days rations, waterskin.",
    contents: [
      { name: "Backpack", quantity: 1, weight: 5 },
      { name: "Blanket", quantity: 1, weight: 3 },
      { name: "Candle", quantity: 10, weight: 0 },
      { name: "Tinderbox", quantity: 1, weight: 1 },
      { name: "Alms Box", quantity: 1, weight: 1 },
      { name: "Incense (block)", quantity: 2, weight: 0 },
      { name: "Censer", quantity: 1, weight: 1 },
      { name: "Vestments", quantity: 1, weight: 4 },
      { name: "Rations (1 day)", quantity: 2, weight: 2 },
      { name: "Waterskin", quantity: 1, weight: 5 },
    ],
  },
  {
    id: "scholars_pack",
    name: "Scholar's Pack",
    cost: "40 gp",
    weight: 10,
    description: "Backpack, book of lore, bottle of ink, ink pen, 10 sheets of parchment, little bag of sand, small knife.",
    contents: [
      { name: "Backpack", quantity: 1, weight: 5 },
      { name: "Book of Lore", quantity: 1, weight: 5 },
      { name: "Ink (1 oz bottle)", quantity: 1, weight: 0 },
      { name: "Ink Pen", quantity: 1, weight: 0 },
      { name: "Parchment (sheet)", quantity: 10, weight: 0 },
      { name: "Little Bag of Sand", quantity: 1, weight: 0.5 },
      { name: "Small Knife", quantity: 1, weight: 0.5 },
    ],
  },
];

export const TOOLS_5E: ToolItem[] = [
  // Artisan's Tools
  { id: "alchemists_supplies", name: "Alchemist's Supplies", category: "artisan", cost: "50 gp", weight: 8, description: "Glass beakers, flasks, and reagents to identify or craft potions and alchemical substances." },
  { id: "brewers_supplies", name: "Brewer's Supplies", category: "artisan", cost: "20 gp", weight: 9, description: "Glass jug, hops, siphon, and mash paddle for brewing beer, ale, and detecting poisons in drink." },
  { id: "calligraphers_supplies", name: "Calligrapher's Supplies", category: "artisan", cost: "10 gp", weight: 5, description: "Inks, quills, and parchment for fine lettering, forgery analysis, and scroll transcription." },
  { id: "carpenters_tools", name: "Carpenter's Tools", category: "artisan", cost: "8 gp", weight: 6, description: "Saw, hammer, nails, level, and chisel for building or inspecting wooden structures." },
  { id: "cartographers_tools", name: "Cartographer's Tools", category: "artisan", cost: "15 gp", weight: 6, description: "Quill, ink, parchment, compass, and calipers for drafting accurate maps and navigating." },
  { id: "cobblers_tools", name: "Cobbler's Tools", category: "artisan", cost: "5 gp", weight: 5, description: "Awls, leather scraps, and knives for crafting and repairing footwear." },
  { id: "cooks_utensils", name: "Cook's Utensils", category: "artisan", cost: "1 gp", weight: 8, description: "Metal pot, knives, forks, ladle, and spoon for preparing nourishing meals." },
  { id: "glassblowers_tools", name: "Glassblower's Tools", category: "artisan", cost: "30 gp", weight: 5, description: "Blowpipe, marver, blocks, and tweezers for shaping molten glass." },
  { id: "jewelers_tools", name: "Jeweler's Tools", category: "artisan", cost: "25 gp", weight: 2, description: "Small saw, files, pliers, and tweezers for appraising gems and crafting jewelry." },
  { id: "leatherworkers_tools", name: "Leatherworker's Tools", category: "artisan", cost: "5 gp", weight: 5, description: "Knife, mallet, edger, hole punch, and thread for working hides and leather armor." },
  { id: "masons_tools", name: "Mason's Tools", category: "artisan", cost: "10 gp", weight: 8, description: "Trowel, hammer, chisel, brushes, and square for inspecting or working stonework." },
  { id: "painters_supplies", name: "Painter's Supplies", category: "artisan", cost: "10 gp", weight: 5, description: "Easel, canvas, paints, brushes, and charcoal sticks." },
  { id: "potters_tools", name: "Potter's Tools", category: "artisan", cost: "10 gp", weight: 3, description: "Potters' needles, ribs, scrapers, knife, and calipers for shaping clay vessels." },
  { id: "smiths_tools", name: "Smith's Tools", category: "artisan", cost: "20 gp", weight: 8, description: "Hammers, tongs, charcoal, rags, and whetstone for forging and repairing metal arms and armor." },
  { id: "tinkers_tools", name: "Tinker's Tools", category: "artisan", cost: "50 gp", weight: 10, description: "Hand tools, thread, needles, whetstone, and scraps for repairing tiny mechanisms." },
  { id: "weavers_tools", name: "Weaver's Tools", category: "artisan", cost: "1 gp", weight: 5, description: "Thread, needles, and scraps for weaving and mending cloth." },
  { id: "woodcarvers_tools", name: "Woodcarver's Tools", category: "artisan", cost: "1 gp", weight: 5, description: "Knife, gouge, and small saw for carving wood, arrows, and bows." },
  // Kits & Specialty Tools
  { id: "disguise_kit", name: "Disguise Kit", category: "kit", cost: "25 gp", weight: 3, description: "Cosmetics, hair dye, and small props to alter your physical appearance." },
  { id: "forgery_kit", name: "Forgery Kit", category: "kit", cost: "15 gp", weight: 5, description: "Papers, parchments, pens, inks, seals, and wax to imitate documents and handwriting." },
  { id: "herbalism_kit", name: "Herbalism Kit", category: "kit", cost: "5 gp", weight: 3, description: "Clippers, mortar and pestle, pouches, and vials needed to brew Potions of Healing and Antitoxin." },
  { id: "navigators_tools", name: "Navigator's Tools", category: "kit", cost: "25 gp", weight: 2, description: "Sextant, compass, calipers, ruler, and sea charts for charting courses at sea." },
  { id: "poisoners_kit", name: "Poisoner's Kit", category: "kit", cost: "50 gp", weight: 2, description: "Glass vials, mortar and pestle, chemicals, and stirring rod for crafting and handling poisons." },
  { id: "thieves_tools_item", name: "Thieves' Tools", category: "kit", cost: "25 gp", weight: 1, description: "Small file, lock picks, mirror, narrow-bladed scissors, and pliers for locks and traps." },
  // Musical Instruments
  { id: "bagpipes", name: "Bagpipes", category: "instrument", cost: "30 gp", weight: 6, description: "Musical instrument usable as a Bard spellcasting focus." },
  { id: "drum", name: "Drum", category: "instrument", cost: "6 gp", weight: 3, description: "Percussion instrument usable as a Bard spellcasting focus." },
  { id: "dulcimer", name: "Dulcimer", category: "instrument", cost: "25 gp", weight: 10, description: "Stringed instrument usable as a Bard spellcasting focus." },
  { id: "flute", name: "Flute", category: "instrument", cost: "2 gp", weight: 1, description: "Woodwind instrument usable as a Bard spellcasting focus." },
  { id: "lute", name: "Lute", category: "instrument", cost: "35 gp", weight: 2, description: "Stringed instrument usable as a Bard spellcasting focus." },
  { id: "lyre", name: "Lyre", category: "instrument", cost: "30 gp", weight: 2, description: "Classic harp-like instrument usable as a Bard spellcasting focus." },
  { id: "horn", name: "Horn", category: "instrument", cost: "3 gp", weight: 2, description: "Brass/wind instrument usable as a Bard spellcasting focus." },
  { id: "pan_flute", name: "Pan Flute", category: "instrument", cost: "12 gp", weight: 2, description: "Reed instrument usable as a Bard spellcasting focus." },
  { id: "shawm", name: "Shawm", category: "instrument", cost: "2 gp", weight: 1, description: "Double-reed woodwind usable as a Bard spellcasting focus." },
  { id: "viol", name: "Viol", category: "instrument", cost: "30 gp", weight: 1, description: "Bowed string instrument usable as a Bard spellcasting focus." },
  // Gaming Sets & Vehicles
  { id: "dice_set", name: "Dice Set", category: "gaming", cost: "1 sp", weight: 0, description: "Set of carved bone or wooden dice." },
  { id: "dragonchess_set", name: "Dragonchess Set", category: "gaming", cost: "1 gp", weight: 0.5, description: "Three-tiered board game of strategy." },
  { id: "playing_card_set", name: "Playing Card Set", category: "gaming", cost: "5 sp", weight: 0, description: "Painted deck of playing cards." },
  { id: "three_dragon_ante_set", name: "Three-Dragon Ante Set", category: "gaming", cost: "1 gp", weight: 0, description: "Popular tavern card game featuring dragons and mortals." },
  { id: "vehicles_land", name: "Vehicles (Land)", category: "vehicle", cost: "50 gp", weight: 0, description: "Proficiency operating carts, wagons, carriages, and land mounts." },
  { id: "vehicles_water", name: "Vehicles (Water)", category: "vehicle", cost: "50 gp", weight: 0, description: "Proficiency sailing rowboats, keelboats, galleys, and ships." },
];
