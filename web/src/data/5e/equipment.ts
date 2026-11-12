export interface WeaponItem {
  id: string;
  name: string;
  category: "simple" | "martial";
  rangeType: "melee" | "ranged";
  damage: string; // e.g. "1d8"
  damageType: "slashing" | "piercing" | "bludgeoning";
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
  { id: "thieves_tools", name: "Thieves' Tools", category: "tool", description: "Essential set of tools for picking locks and disarming traps.", weight: 1, cost: "25 gp" },
  { id: "arcane_focus_wand", name: "Arcane Focus (Wand)", category: "gear", description: "Special item used to channel arcane spells.", weight: 1, cost: "10 gp" },
  { id: "holy_symbol_amulet", name: "Holy Symbol (Amulet)", category: "gear", description: "Sacred symbol channeling divine power.", weight: 1, cost: "5 gp" },
  { id: "backpack", name: "Backpack", category: "gear", description: "Holds up to 30 lbs or 1 cubic foot of gear.", weight: 5, cost: "2 gp" },
  { id: "bedroll", name: "Bedroll", category: "gear", description: "Warm sleeping roll for camping.", weight: 7, cost: "1 gp" },
  { id: "rope_silk", name: "Silk Rope (50 ft)", category: "gear", description: "Strong and lightweight climbing rope.", weight: 5, cost: "10 gp" },
  { id: "torch", name: "Torch (10)", category: "gear", description: "Provides bright light in a 20-ft radius for 1 hour.", weight: 10, cost: "1 sp" },
  { id: "rations", name: "Rations (10 days)", category: "gear", description: "Dry food supplies for extended travel.", weight: 20, cost: "5 gp" },
  // Magic items
  { id: "weapon_plus_1", name: "+1 Weapon", category: "magic", description: "+1 bonus to attack and damage rolls made with this magic weapon.", weight: 3, cost: "500 gp", magicBonusAttack: 1, magicBonusDamage: 1 },
  { id: "weapon_plus_2", name: "+2 Weapon", category: "magic", description: "+2 bonus to attack and damage rolls made with this magic weapon.", weight: 3, cost: "2,000 gp", magicBonusAttack: 2, magicBonusDamage: 2 },
  { id: "shield_plus_1", name: "+1 Shield", category: "shield", description: "+1 bonus to AC in addition to the shield's normal bonus (+3 AC total).", weight: 6, cost: "500 gp", magicBonusAc: 1 },
  { id: "armor_plus_1", name: "+1 Armor", category: "magic", description: "+1 bonus to AC in addition to the armor's base AC.", weight: 20, cost: "1,500 gp", magicBonusAc: 1 },
  { id: "ring_of_protection", name: "Ring of Protection", category: "magic", description: "Requires attunement. You gain a +1 bonus to AC and saving throws.", weight: 0.1, cost: "3,500 gp", magicBonusAc: 1 },
  { id: "bracers_of_defense", name: "Bracers of Defense", category: "magic", description: "Requires attunement. While you are wearing no armor and using no shield, you gain a +2 bonus to AC.", weight: 0.5, cost: "4,000 gp", magicBonusAc: 2 },
  { id: "cloak_of_protection", name: "Cloak of Protection", category: "magic", description: "Requires attunement. You gain a +1 bonus to AC and saving throws.", weight: 1, cost: "3,500 gp", magicBonusAc: 1 },
];
