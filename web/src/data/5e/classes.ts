export interface ClassFeature {
  level: number;
  name: string;
  description: string;
}

export interface SubclassDefinition {
  id: string;
  name: string;
  source?: string;
  description: string;
  hasCompanion?: boolean;
  companionType?: "beast" | "steeldeffender" | "familiar";
  bonusProficiencies?: {
    armor?: string[];
    weapons?: string[];
    tools?: string[];
    skillsCount?: number;
  };
  features: ClassFeature[];
}

export interface StartingEquipmentItem {
  name: string;
  category: "weapon" | "armor" | "shield" | "gear" | "tool";
  quantity: number;
  armorCategory?: "light" | "medium" | "heavy";
  baseAc?: number;
  maxDexMod?: number;
  damage?: string;
  damageType?: string;
  versatileDamage?: string;
  properties?: string[];
  range?: string;
}

export type EquipmentPickFrom =
  | "any_martial_weapon"
  | "any_martial_melee"
  | "any_simple_weapon"
  | "any_simple_melee"
  | "any_pack"
  | "any_instrument"
  | "any_artisan_tool";

export interface StartingEquipmentChoice {
  id: string;
  name: string;
  options: Array<{
    label: string;
    pickFrom?: EquipmentPickFrom;
    pickCount?: number;
    items: StartingEquipmentItem[];
  }>;
}

export interface ClassSkillChoice {
  count: number;
  availableSkills: string[];
}

export interface ClassDefinition {
  skillChoices: ClassSkillChoice;
  startingEquipmentChoices?: StartingEquipmentChoice[];
  fixedEquipment?: StartingEquipmentItem[];
  multiclassGains?: string[];
  toolProficiencies?: string[];
  startingGoldFormula?: string;
  startingGoldAvg?: number;
  expertiseLevels?: number[];
  id: string;
  name: string;
  hitDie: string; // e.g. "d12"
  primaryAbility: string;
  recommendedStats: string;
  savingThrows: Array<"str" | "dex" | "con" | "int" | "wis" | "cha">;
  armorProficiencies: string[];
  weaponProficiencies: string[];
  multiclassPrereqs: Partial<Record<"str" | "dex" | "con" | "int" | "wis" | "cha", number>>;
  subclassLevel: number;
  subclasses: SubclassDefinition[];
  spellcastingType?: "full" | "half" | "third" | "pact" | "none";
  spellcastingAbility?: "int" | "wis" | "cha";
  asiLevels: number[];
  features: ClassFeature[];
}

export const CLASSES_5E: Record<string, ClassDefinition> = {
  Artificer: {
    id: "artificer",
    name: "Artificer",
    hitDie: "d8",
    primaryAbility: "Intelligence",
    recommendedStats: "Primary: Intelligence (for Infusions, spellcasting, & Battle Smith/Armorer attacks). Secondary: Constitution (HP & concentration) and Dexterity (medium armor AC).",
    savingThrows: ["con", "int"],
    armorProficiencies: ["Light armor", "Medium armor", "Shields"],
    weaponProficiencies: ["Simple weapons"],
    toolProficiencies: ["Thieves' tools", "Tinker's tools", "One type of artisan's tools"],
    startingGoldFormula: "5d4 × 10 gp",
    startingGoldAvg: 125,
    skillChoices: { count: 2, availableSkills: ["arcana", "history", "investigation", "medicine", "nature", "perception", "sleightOfHand"] },
    multiclassPrereqs: { int: 13 },
    multiclassGains: ["Light armor", "Medium armor", "Shields", "Thieves' tools", "Tinker's tools"],
    subclassLevel: 3,
    spellcastingType: "half",
    spellcastingAbility: "int",
    asiLevels: [4, 8, 12, 16, 19],
    startingEquipmentChoices: [
      {
        id: "artificer-1",
        name: "Two Simple Weapons",
        options: [
          {
            label: "Light Crossbow & Dagger",
            items: [
              { name: "Light Crossbow", category: "weapon", quantity: 1, damage: "1d8", damageType: "piercing", properties: ["ammunition", "loading", "two-handed"], range: "80/320" },
              { name: "Dagger", category: "weapon", quantity: 1, damage: "1d4", damageType: "piercing", properties: ["finesse", "light", "thrown"], range: "20/60" },
            ],
          },
          { label: "Choose Any 2 Simple Weapons", pickFrom: "any_simple_weapon", pickCount: 2, items: [] },
        ],
      },
      {
        id: "artificer-2",
        name: "Armor",
        options: [
          { label: "Studded Leather Armor (AC 12 + DEX)", items: [{ name: "Studded Leather Armor", category: "armor", armorCategory: "light", quantity: 1, baseAc: 12 }] },
          { label: "Scale Mail (AC 14 + DEX max 2)", items: [{ name: "Scale Mail", category: "armor", armorCategory: "medium", quantity: 1, baseAc: 14, maxDexMod: 2 }] },
        ],
      },
      {
        id: "artificer-3",
        name: "Adventuring Pack",
        options: [
          { label: "Dungeoneer's Pack", items: [{ name: "Dungeoneer's Pack", category: "gear", quantity: 1 }] },
          { label: "Choose Any Pack", pickFrom: "any_pack", items: [] },
        ],
      },
    ],
    fixedEquipment: [
      { name: "Light Crossbow", category: "weapon", quantity: 1, damage: "1d8", damageType: "piercing", properties: ["ammunition", "loading", "two-handed"], range: "80/320" },
      { name: "Crossbow Bolts (20)", category: "gear", quantity: 20 },
      { name: "Thieves' Tools", category: "tool", quantity: 1 },
      { name: "Tinker's Tools", category: "tool", quantity: 1 },
    ],
    subclasses: [
      {
        id: "alchemist",
        name: "Alchemist",
        source: "TCoE",
        description: "Combines reagents to produce mystical elixirs that heal allies, sharpen minds, and empower attacks.",
        bonusProficiencies: { tools: ["Alchemist's supplies"] },
        features: [
          { level: 3, name: "Experimental Elixir", description: "After a long rest (or by spending a spell slot), magically produce elixirs granting Healing (2d4+INT), Swiftness (+10 ft speed), Resilience (+1 AC), Boldness (+1d4 attack/saves), Flight (10 ft), or Transformation." },
          { level: 5, name: "Alchemical Savant", description: "Add INT mod to one healing or acid/fire/necrotic/poison damage roll when casting through alchemist's supplies." },
          { level: 9, name: "Restorative Reagents", description: "Experimental Elixirs grant temporary HP equal to 2d6 + INT mod; cast Lesser Restoration INT mod times per long rest without a slot." },
          { level: 15, name: "Chemical Mastery", description: "Gain resistance to acid and poison damage, immunity to the poisoned condition, and cast Greater Restoration and Heal once per long rest." },
        ],
      },
      {
        id: "armorer",
        name: "Armorer",
        source: "TCoE",
        description: "Bonds with arcane power armor as a second skin—switching between frontline Guardian gauntlets or stealthy Infiltrator lightning.",
        bonusProficiencies: { armor: ["Heavy armor"], tools: ["Smith's tools"] },
        features: [
          { level: 3, name: "Arcane Armor", description: "Turn worn armor into Arcane Armor: ignore STR requirement, use it as a spellcasting focus, and don/doff as an action." },
          { level: 3, name: "Armor Model (Guardian / Infiltrator)", description: "Guardian gains Thunder Gauntlets (1d8 thunder, imposes disadvantage on attacks against others) and Defensive Field temp HP. Infiltrator gains Lightning Launcher (1d6+1d6 lightning), +5 ft speed, and Stealth advantage." },
          { level: 5, name: "Extra Attack", description: "Attack twice whenever taking the Attack action." },
          { level: 9, name: "Armor Modifications", description: "Arcane Armor counts as separate chest, boots, helmet, and weapon pieces for Infusions, granting +2 maximum infused items." },
          { level: 15, name: "Perfected Armor", description: "Guardian can pull enemies 30 ft and strike as a reaction; Infiltrator lightning grants advantage on next attack and +1d6 lightning." },
        ],
      },
      {
        id: "artillerist",
        name: "Artillerist",
        source: "TCoE",
        description: "Hurls explosive magic and deploys a mobile Eldritch Cannon armed with Force Ballista, Flamethrower, or Protector shields.",
        bonusProficiencies: { tools: ["Woodcarver's tools"] },
        features: [
          { level: 3, name: "Eldritch Cannon", description: "Action with woodcarver's tools to create a Tiny/Small magical cannon (Flamethrower 2d8 fire cone, Force Ballista 2d8 force + push 5 ft, or Protector 1d8+INT temp HP aura); fire as bonus action." },
          { level: 5, name: "Arcane Firearm", description: "Turn a wand, staff, or rod into an Arcane Firearm, adding 1d8 extra damage to one roll of artificer spells cast through it." },
          { level: 9, name: "Explosive Cannon", description: "Eldritch Cannon damage rolls increase by 1d8, and you can detonate it for 3d8 force damage in a 20-ft radius." },
          { level: 15, name: "Fortified Position", description: "Deploy two Eldritch Cannons at once, and grant half cover (+2 AC/DEX saves) to allies within 10 ft of a cannon." },
        ],
      },
      {
        id: "battle_smith",
        name: "Battle Smith",
        source: "TCoE",
        description: "Combines martial readiness with a loyal mechanical Steel Defender construct in battle.",
        hasCompanion: true,
        companionType: "steeldeffender",
        bonusProficiencies: { weapons: ["Martial weapons"], tools: ["Smith's tools"] },
        features: [
          { level: 3, name: "Battle Ready", description: "Gain martial weapon proficiency, and use your Intelligence modifier for attack and damage rolls with magic weapons." },
          { level: 3, name: "Steel Defender", description: "Construct an obedient mechanical defender that shares your initiative and takes its turn right after yours; commands via your bonus action and imposes disadvantage with Deflect Attack." },
          { level: 5, name: "Extra Attack", description: "Attack twice whenever you take the Attack action." },
          { level: 9, name: "Arcane Jolt", description: "When you hit with a magic weapon or your Steel Defender hits, channel an extra 2d6 force damage OR 2d6 healing (INT mod/long rest)." },
          { level: 15, name: "Improved Defender", description: "Arcane Jolt increases to 4d6, Steel Defender gains +2 AC, and Deflect Attack deals 1d4 + INT mod force damage back." },
        ],
      },
    ],
    features: [
      { level: 1, name: "Magical Tinkering", description: "Imbue Tiny nonmagical objects with light, recorded messages, odors/sounds, or static visuals (up to INT mod objects)." },
      { level: 1, name: "Spellcasting", description: "Cast artificer spells using Intelligence (rounded UP for spell slots starting at level 1!)." },
      { level: 2, name: "Infuse Item", description: "Learn 4 infusions (scaling to 12); infuse nonmagical objects into +1/+2 weapons, armor, or wondrous items after a long rest." },
      { level: 3, name: "Artificer Specialist & Right Tool for the Job", description: "Choose a specialist discipline and conjure a set of artisan's tools over 1 hour." },
      { level: 6, name: "Tool Expertise", description: "Double your proficiency bonus for any ability check you make that uses your proficiency with a tool." },
      { level: 7, name: "Flash of Genius", description: "Reaction when you or a creature within 30 ft makes an ability check or saving throw to add your INT mod to the roll (INT mod/long rest)." },
      { level: 10, name: "Magic Item Adept", description: "Attune to up to 4 magic items at once; craft common/uncommon magic items in a quarter the time and half the gold." },
      { level: 11, name: "Spell-Storing Item", description: "Store a 1st- or 2nd-level artificer spell in a weapon or focus, usable INT mod × 2 times." },
      { level: 14, name: "Magic Item Savant", description: "Attune to up to 5 magic items at once and ignore all class, race, spell, and level requirements on magic items." },
      { level: 18, name: "Magic Item Master", description: "Attune to up to 6 magic items at once." },
      { level: 20, name: "Soul of Artifice", description: "Gain +1 bonus to all saving throws per magic item currently attuned; reaction to end an infusion to drop to 1 HP instead of 0 HP." },
    ],
  },

  Barbarian: {
    id: "barbarian",
    name: "Barbarian",
    hitDie: "d12",
    primaryAbility: "Strength",
    recommendedStats: "Primary: Strength (for damage & rage attacks). Secondary: Constitution (for Unarmored Defense & massive HP) and Dexterity (for initiative & AC).",
    savingThrows: ["str", "con"],
    armorProficiencies: ["Light armor", "Medium armor", "Shields"],
    weaponProficiencies: ["Simple weapons", "Martial weapons"],
    toolProficiencies: [],
    startingGoldFormula: "2d4 × 10 gp",
    startingGoldAvg: 50,
    skillChoices: { count: 2, availableSkills: ["animalHandling", "athletics", "intimidation", "nature", "perception", "survival"] },
    multiclassGains: ["Shields", "Simple weapons", "Martial weapons"],
    multiclassPrereqs: { str: 13 },
    subclassLevel: 3,
    spellcastingType: "none",
    asiLevels: [4, 8, 12, 16, 19],
    startingEquipmentChoices: [
      {
        id: "barb-1",
        name: "Primary Weapon",
        options: [
          { label: "Greataxe", items: [{ name: "Greataxe", category: "weapon", quantity: 1, damage: "1d12", damageType: "slashing", properties: ["heavy", "two-handed"] }] },
          { label: "Choose Any Martial Melee Weapon", pickFrom: "any_martial_melee", items: [] },
        ],
      },
      {
        id: "barb-2",
        name: "Secondary Weapons",
        options: [
          { label: "Two Handaxes", items: [{ name: "Handaxe", category: "weapon", quantity: 2, damage: "1d6", damageType: "slashing", properties: ["light", "thrown"], range: "20/60" }] },
          { label: "Choose Any Simple Weapon", pickFrom: "any_simple_weapon", items: [] },
        ],
      },
      {
        id: "barb-3",
        name: "Pack",
        options: [
          { label: "Explorer's Pack", items: [{ name: "Explorer's Pack", category: "gear", quantity: 1 }] },
          { label: "Choose Any Pack", pickFrom: "any_pack", items: [] },
        ],
      },
    ],
    fixedEquipment: [
      { name: "Javelin", category: "weapon", quantity: 4, damage: "1d6", damageType: "piercing", properties: ["thrown"], range: "30/120" },
    ],
    subclasses: [
      {
        id: "berserker",
        name: "Path of the Berserker",
        source: "PHB",
        description: "For some barbarians, rage is a means to an end. Violence is the path to supreme strength.",
        features: [
          { level: 3, name: "Frenzy", description: "You can go into a frenzy when you rage. For the duration of your rage you can make a single melee weapon attack as a bonus action on each of your turns." },
          { level: 6, name: "Mindless Rage", description: "You can't be charmed or frightened while raging." },
          { level: 10, name: "Intimidating Presence", description: "You can use your action to frighten someone with your menacing presence." },
          { level: 14, name: "Retaliation", description: "When you take damage from a creature within 5 ft, you can use your reaction to make a melee weapon attack against that creature." },
        ],
      },
      {
        id: "totem",
        name: "Path of the Totem Warrior",
        source: "PHB",
        description: "Attune yourself with the natural world and take on the spirits of fierce animal totems.",
        features: [
          { level: 3, name: "Spirit Seeker", description: "You gain the ability to cast Beast Sense and Speak with Animals as rituals." },
          { level: 3, name: "Totem Spirit (Bear / Eagle / Wolf)", description: "Bear: Resistance to all damage except psychic while raging. Eagle: Opportunity attacks against you have disadvantage; Dash as bonus action. Wolf: Allies gain advantage on melee attacks against foes within 5 ft." },
          { level: 6, name: "Aspect of the Beast", description: "Gain a magical benefit based on your chosen totem animal (Double carrying capacity, 1-mile eagle sight, or fast tracking)." },
          { level: 10, name: "Spirit Walker", description: "Cast Commune with Nature as a ritual." },
          { level: 14, name: "Totemic Attunement", description: "Gain an ultimate magical benefit based on your chosen totem animal." },
        ],
      },
      {
        id: "ancestral_guardian",
        name: "Path of the Ancestral Guardian",
        source: "XGtE",
        description: "Calls upon spectral warrior ancestors to protect allies and hinder enemies targeted by your fury.",
        features: [
          { level: 3, name: "Ancestral Protectors", description: "While raging, the first creature you hit on your turn has disadvantage on attack rolls against targets other than you, and those targets resist its damage." },
          { level: 6, name: "Spirit Shield", description: "Reaction while raging to reduce damage dealt to an ally within 30 ft by 2d6 (scales to 4d6)." },
          { level: 10, name: "Consult the Spirits", description: "Cast Augury or Clairvoyance without slots or components (1/short or long rest)." },
          { level: 14, name: "Vengeful Ancestors", description: "When Spirit Shield reduces damage, the attacker takes force damage equal to the damage prevented." },
        ],
      },
      {
        id: "storm_herald",
        name: "Path of the Storm Herald",
        source: "XGtE",
        description: "Channels primal fury into a roaring tempest aura of Desert fire, Sea lightning, or Tundra frost.",
        features: [
          { level: 3, name: "Storm Aura (Desert / Sea / Tundra)", description: "When you rage and as a bonus action each turn, unleash a 10-ft elemental aura: Desert fire damage, Sea 1d6+ lightning bolt, or Tundra temporary HP for allies." },
          { level: 6, name: "Storm Soul", description: "Gain elemental damage resistance and thematic exploration boon matching your storm environment." },
          { level: 10, name: "Shielding Storm", description: "Allies within your Storm Aura gain your Storm Soul damage resistance." },
          { level: 14, name: "Raging Storm", description: "Enhance your aura to burn attackers as a reaction, knock creatures prone on hits, or reduce enemy speed to 0." },
        ],
      },
      {
        id: "zealot",
        name: "Path of the Zealot",
        source: "XGtE",
        description: "Fueled by divine zeal and righteous fury, dealing radiant or necrotic blows and defying death itself.",
        features: [
          { level: 3, name: "Divine Fury", description: "While raging, first creature you hit on each turn takes extra 1d6 + half barbarian level radiant or necrotic damage." },
          { level: 3, name: "Warrior of the Gods", description: "Spells restoring you to life (such as Revivify or Raise Dead) require no material components." },
          { level: 6, name: "Fanatical Focus", description: "Reroll a failed saving throw once per rage." },
          { level: 10, name: "Zealous Presence", description: "Bonus action battle cry granting up to 10 allies advantage on attacks and saves until your next turn (1/long rest)." },
          { level: 14, name: "Rage Beyond Death", description: "While raging, having 0 HP doesn't knock you unconscious; you still make death saves but stay standing until rage ends." },
        ],
      },
      {
        id: "beast",
        name: "Path of the Beast",
        source: "TCoE",
        description: "Manifests feral natural weapons—bite, claws, or lashing tail—when overtaken by primal rage.",
        features: [
          { level: 3, name: "Form of the Beast", description: "When raging, grow Bite (1d8 piercing + regain PB HP below half), Claws (1d6 slashing + 1 extra claw attack), or Tail (1d8 reach + reaction +1d8 AC)." },
          { level: 6, name: "Bestial Soul", description: "Natural weapons count as magical; choose swimming speed, climbing speed, or superhuman jump boost after each rest." },
          { level: 10, name: "Infectious Fury", description: "When hitting with natural weapons, force target WIS save or make it attack another creature or take 2d12 psychic damage." },
          { level: 14, name: "Call the Hunt", description: "Grant willing allies within 30 ft +1d6 bonus damage and gain 5 temp HP per ally." },
        ],
      },
      {
        id: "wild_magic_barbarian",
        name: "Path of Wild Magic",
        source: "TCoE",
        description: "Your rage taps into fey or extraplanar wild magic, triggering unpredictable surges and bolstering casters.",
        features: [
          { level: 3, name: "Magic Awareness & Wild Surge", description: "Detect magic within 60 ft (action). Roll on the Wild Magic table whenever you rage (teleport, laser beam, shadow tendrils, bolt of light, etc.)." },
          { level: 6, name: "Bolstering Magic", description: "Touch a creature to grant +1d3 on attacks/checks for 10 min OR restore a 1st-3rd level expended spell slot." },
          { level: 10, name: "Unstable Backlash", description: "Reaction when taking damage or failing a save while raging to trigger a new Wild Surge effect immediately." },
          { level: 14, name: "Controlled Surge", description: "Roll twice on the Wild Surge table and choose which magical effect occurs." },
        ],
      },
      {
        id: "battlerager",
        name: "Path of the Battlerager",
        source: "SCAG",
        description: "Dwarven-inspired shock warriors clad in spiked armor who throw themselves bodily into foes.",
        features: [
          { level: 3, name: "Battlerager Armor", description: "While wearing spiked armor and raging, make a bonus action melee attack with your armor spikes (1d4 + STR piercing) and deal 3 piercing damage on successful grapples." },
          { level: 6, name: "Reckless Abandon", description: "Using Reckless Attack while raging grants CON mod temporary hit points." },
          { level: 10, name: "Battlerager Charge", description: "Take the Dash action as a bonus action while raging." },
          { level: 14, name: "Spiked Retribution", description: "Creatures hitting you with a melee attack from within 5 ft take 3 piercing damage while you wear spiked armor and rage." },
        ],
      },
    ],
    features: [
      { level: 1, name: "Rage", description: "In battle, you fight with primal ferocity. Gain advantage on STR checks/saves, bonus melee damage (+2 scaling to +4), and resistance to bludgeoning, piercing, and slashing damage." },
      { level: 1, name: "Unarmored Defense (Barbarian)", description: "While not wearing armor, your AC equals 10 + DEX mod + CON mod. You can use a shield and still gain this benefit." },
      { level: 2, name: "Reckless Attack", description: "Throw aside all concern for defense. Gain advantage on melee weapon attack rolls using STR, but attack rolls against you have advantage until your next turn." },
      { level: 2, name: "Danger Sense", description: "Advantage on DEX saving throws against effects you can see, such as traps and spells, while not blinded, deafened, or incapacitated." },
      { level: 3, name: "Primal Path", description: "Choose a path that shapes the nature of your rage." },
      { level: 5, name: "Extra Attack", description: "You can attack twice, instead of once, whenever you take the Attack action on your turn." },
      { level: 5, name: "Fast Movement", description: "Your speed increases by 10 feet while not wearing heavy armor." },
      { level: 7, name: "Feral Instinct", description: "Advantage on initiative rolls. If surprised at combat start, you can act normally on your first turn if you enter a rage first." },
      { level: 9, name: "Brutal Critical (1 die)", description: "Roll one additional weapon damage die on a melee critical hit." },
      { level: 11, name: "Relentless Rage", description: "If you drop to 0 HP while raging and don't die outright, make a DC 10 CON save to drop to 1 HP instead." },
      { level: 13, name: "Brutal Critical (2 dice)", description: "Roll two additional weapon damage dice on a critical hit." },
      { level: 15, name: "Persistent Rage", description: "Your rage ends early only if you fall unconscious or choose to end it." },
      { level: 17, name: "Brutal Critical (3 dice)", description: "Roll three additional weapon damage dice on a critical hit." },
      { level: 18, name: "Indomitable Might", description: "If your total for a STR check is less than your STR score, use that score instead." },
      { level: 20, name: "Primal Champion", description: "Your Strength and Constitution scores increase by 4, and their maximums increase to 24." },
    ],
  },

  Bard: {
    id: "bard",
    name: "Bard",
    hitDie: "d8",
    primaryAbility: "Charisma",
    recommendedStats: "Primary: Charisma (for spellcasting & social checks). Secondary: Dexterity (for light armor AC & finesse weapons) and Constitution (for concentration & HP).",
    savingThrows: ["dex", "cha"],
    armorProficiencies: ["Light armor"],
    weaponProficiencies: ["Simple weapons", "Hand crossbows", "Longswords", "Rapiers", "Shortswords"],
    toolProficiencies: ["Three musical instruments of your choice"],
    startingGoldFormula: "5d4 × 10 gp",
    startingGoldAvg: 125,
    expertiseLevels: [3, 10],
    skillChoices: { count: 3, availableSkills: ["acrobatics", "animalHandling", "arcana", "athletics", "deception", "history", "insight", "intimidation", "investigation", "medicine", "nature", "perception", "performance", "persuasion", "religion", "sleightOfHand", "stealth", "survival"] },
    multiclassGains: ["Light armor", "One skill of choice", "One musical instrument"],
    multiclassPrereqs: { cha: 13 },
    subclassLevel: 3,
    spellcastingType: "full",
    spellcastingAbility: "cha",
    asiLevels: [4, 8, 12, 16, 19],
    startingEquipmentChoices: [
      {
        id: "bard-1",
        name: "Primary Weapon",
        options: [
          { label: "Rapier", items: [{ name: "Rapier", category: "weapon", quantity: 1, damage: "1d8", damageType: "piercing", properties: ["finesse"] }] },
          { label: "Longsword", items: [{ name: "Longsword", category: "weapon", quantity: 1, damage: "1d8", damageType: "slashing", versatileDamage: "1d10", properties: ["versatile"] }] },
          { label: "Choose Any Simple Weapon", pickFrom: "any_simple_weapon", items: [] },
        ],
      },
      {
        id: "bard-2",
        name: "Pack",
        options: [
          { label: "Diplomat's Pack", items: [{ name: "Diplomat's Pack", category: "gear", quantity: 1 }] },
          { label: "Entertainer's Pack", items: [{ name: "Entertainer's Pack", category: "gear", quantity: 1 }] },
          { label: "Choose Any Pack", pickFrom: "any_pack", items: [] },
        ],
      },
      {
        id: "bard-3",
        name: "Musical Instrument",
        options: [
          { label: "Lute", items: [{ name: "Lute", category: "tool", quantity: 1 }] },
          { label: "Choose Any Musical Instrument", pickFrom: "any_instrument", items: [] },
        ],
      },
    ],
    fixedEquipment: [
      { name: "Leather Armor", category: "armor", armorCategory: "light", quantity: 1, baseAc: 11 },
      { name: "Dagger", category: "weapon", quantity: 1, damage: "1d4", damageType: "piercing", properties: ["finesse", "light", "thrown"], range: "20/60" },
    ],
    subclasses: [
      {
        id: "lore",
        name: "College of Lore",
        source: "PHB",
        description: "Bards of the College of Lore know something about most everything, collecting lore, extra skills, and early Magical Secrets.",
        bonusProficiencies: { skillsCount: 3 },
        features: [
          { level: 3, name: "Bonus Proficiencies", description: "You gain proficiency with three skills of your choice." },
          { level: 3, name: "Cutting Words", description: "Use your reaction and a Bardic Inspiration die to subtract from an enemy's attack roll, ability check, or damage roll." },
          { level: 6, name: "Additional Magical Secrets", description: "Learn two spells of your choice from any class list." },
          { level: 14, name: "Peerless Skill", description: "When you make an ability check, you can roll a Bardic Inspiration die and add the result to your check." },
        ],
      },
      {
        id: "valor",
        name: "College of Valor",
        source: "PHB",
        description: "Skalds and battle-chanters who sing the deeds of the mighty and stride into combat in medium armor.",
        bonusProficiencies: { armor: ["Medium armor", "Shields"], weapons: ["Martial weapons"] },
        features: [
          { level: 3, name: "Bonus Proficiencies & Combat Inspiration", description: "Gain proficiency with medium armor, shields, and martial weapons. Allies can add Inspiration dice to weapon damage rolls or AC." },
          { level: 6, name: "Extra Attack", description: "You can attack twice whenever you take the Attack action on your turn." },
          { level: 14, name: "Battle Magic", description: "When you cast a bard spell with your action, you can make one weapon attack as a bonus action." },
        ],
      },
      {
        id: "glamour",
        name: "College of Glamour",
        source: "XGtE",
        description: "Weaves fey magic of awe and majesty, rallying allies across the battlefield and charming audiences.",
        features: [
          { level: 3, name: "Mantle of Inspiration & Enthralling Performance", description: "Bonus action Inspiration grants up to CHA mod allies 5 temp HP (scaling to 14) and a free reaction move without opportunity attacks." },
          { level: 6, name: "Mantle of Majesty", description: "Bonus action to cast Command as a bonus action on each turn for 1 minute without expending slots." },
          { level: 14, name: "Unbreakable Majesty", description: "Bonus action to force creatures targeting you with an attack to succeed on a CHA save or target someone else." },
        ],
      },
      {
        id: "swords",
        name: "College of Swords",
        source: "XGtE",
        description: "Dashing blade performers who weave Blade Flourishes directly into melee strikes.",
        bonusProficiencies: { armor: ["Medium armor"], weapons: ["Scimitars"] },
        features: [
          { level: 3, name: "Bonus Proficiencies & Fighting Style", description: "Gain medium armor, scimitar proficiency (and use melee weapons as spell foci); choose Dueling or Two-Weapon Fighting." },
          { level: 3, name: "Blade Flourish", description: "Gain +10 ft walking speed after attacking; expend Inspiration die on hits for Defensive (+AC), Slashing (cleave), or Mobile (push) flourish." },
          { level: 6, name: "Extra Attack", description: "Attack twice whenever taking the Attack action." },
          { level: 14, name: "Master's Flourish", description: "Roll a d6 for any Blade Flourish instead of expending a Bardic Inspiration die." },
        ],
      },
      {
        id: "whispers",
        name: "College of Whispers",
        source: "XGtE",
        description: "Spymasters and court intriguers who lace weapon strikes with psychic terror and steal shadows.",
        features: [
          { level: 3, name: "Psychic Blades & Words of Terror", description: "Expend Bardic Inspiration on a weapon hit to deal +2d6 psychic damage (scaling to 8d6); frighten targets through quiet conversation." },
          { level: 6, name: "Mantle of Whispers", description: "Capture the shadow of a humanoid who dies within 30 ft to assume their exact appearance and surface memories." },
          { level: 14, name: "Shadow Lore", description: "Whisper magic into a creature's ear, charming it into obeying you for 8 hours out of fear." },
        ],
      },
      {
        id: "creation",
        name: "College of Creation",
        source: "TCoE",
        description: "Draws on the primordial Song of Creation to manifest physical objects out of thin air and animate constructs.",
        features: [
          { level: 3, name: "Mote of Potential & Performance of Creation", description: "Inspiration dice grant bonus effects on checks, attacks, or saves. Create a nonmagical item worth up to 20 × bard level gp." },
          { level: 6, name: "Animating Performance", description: "Animate a Large or smaller nonmagical item into a Flying Dancing Item with slam attacks." },
          { level: 14, name: "Creative Crescendo", description: "Create multiple items of any gold value at once using Performance of Creation." },
        ],
      },
      {
        id: "eloquence",
        name: "College of Eloquence",
        source: "TCoE",
        description: "Masters of oratory and silver-tongued persuasion whose words almost never fail.",
        features: [
          { level: 3, name: "Silver Tongue & Unsettling Words", description: "Treat any d20 roll of 9 or lower as a 10 on Persuasion and Deception checks. Bonus action Inspiration subtracts from an enemy's next saving throw." },
          { level: 6, name: "Unfailing Inspiration & Universal Speech", description: "Allies don't expend your Inspiration die if they still fail the roll; make any creature understand your speech." },
          { level: 14, name: "Infectious Inspiration", description: "Reaction when an ally succeeds using your Inspiration to immediately inspire another creature for free." },
        ],
      },
      {
        id: "spirits",
        name: "College of Spirits",
        source: "VRGtR",
        description: "Convenes tales of spirits and ancestors through arcane spiritual foci like tarokka decks or spirit boards.",
        features: [
          { level: 3, name: "Guiding Whispers & Tales from Beyond", description: "Learn Guidance at 60 ft range. Roll on the Spirit Tales table using Bardic Inspiration to unleash ghostly tales." },
          { level: 6, name: "Spirit Session", description: "Conduct a 1-hour seance to temporarily prepare any divination or necromancy spell from any class." },
          { level: 14, name: "Mystical Connection", description: "Roll twice on the Spirit Tales table and choose which tale occurs." },
        ],
      },
    ],
    features: [
      { level: 1, name: "Spellcasting", description: "Cast bard spells using Charisma. Ritual casting and musical spell focus supported." },
      { level: 1, name: "Bardic Inspiration (d6)", description: "Bonus action to grant an Inspiration die to an ally within 60 ft to add to one ability check, attack roll, or saving throw." },
      { level: 2, name: "Jack of All Trades", description: "Add half your proficiency bonus, rounded down, to any ability check that doesn't already include your proficiency bonus." },
      { level: 2, name: "Song of Rest (d6)", description: "Allies regain extra HP (d6 scaling to d12) when spending Hit Dice on a short rest." },
      { level: 3, name: "Bard College & Expertise (2 skills)", description: "Choose a Bard College and double proficiency bonus for two skill proficiencies." },
      { level: 5, name: "Font of Inspiration & Bardic Inspiration (d8)", description: "Inspiration die increases to d8 and recharges on short or long rests." },
      { level: 6, name: "Countercharm", description: "Allies within 30 ft gain advantage on saves against being frightened or charmed." },
      { level: 10, name: "Magical Secrets & Expertise (2 more)", description: "Learn 2 spells from any class list, gain Expertise in 2 more skills, and Inspiration becomes d10." },
      { level: 14, name: "Magical Secrets (2 more)", description: "Learn two more spells from any class list." },
      { level: 15, name: "Bardic Inspiration (d12)", description: "Inspiration die increases to d12." },
      { level: 18, name: "Magical Secrets (2 more)", description: "Learn two final spells from any class list." },
      { level: 20, name: "Superior Inspiration", description: "Regain 1 use of Bardic Inspiration whenever you roll initiative with none remaining." },
    ],
  },

  Cleric: {
    id: "cleric",
    name: "Cleric",
    hitDie: "d8",
    primaryAbility: "Wisdom",
    recommendedStats: "Primary: Wisdom (for divine spellcasting & spell save DC). Secondary: Strength or Dexterity (for weapons/armor) and Constitution (for concentration & HP).",
    savingThrows: ["wis", "cha"],
    armorProficiencies: ["Light armor", "Medium armor", "Shields"],
    weaponProficiencies: ["Simple weapons"],
    toolProficiencies: [],
    startingGoldFormula: "5d4 × 10 gp",
    startingGoldAvg: 125,
    skillChoices: { count: 2, availableSkills: ["history", "insight", "medicine", "persuasion", "religion"] },
    multiclassGains: ["Light armor", "Medium armor", "Shields"],
    multiclassPrereqs: { wis: 13 },
    subclassLevel: 1,
    spellcastingType: "full",
    spellcastingAbility: "wis",
    asiLevels: [4, 8, 12, 16, 19],
    startingEquipmentChoices: [
      {
        id: "cleric-1",
        name: "Primary Weapon",
        options: [
          { label: "Mace", items: [{ name: "Mace", category: "weapon", quantity: 1, damage: "1d6", damageType: "bludgeoning" }] },
          { label: "Warhammer (if proficient)", items: [{ name: "Warhammer", category: "weapon", quantity: 1, damage: "1d8", damageType: "bludgeoning", versatileDamage: "1d10", properties: ["versatile"] }] },
        ],
      },
      {
        id: "cleric-2",
        name: "Armor",
        options: [
          { label: "Scale Mail (Medium, AC 14 + DEX max 2)", items: [{ name: "Scale Mail", category: "armor", armorCategory: "medium", quantity: 1, baseAc: 14, maxDexMod: 2 }] },
          { label: "Leather Armor (Light, AC 11 + DEX)", items: [{ name: "Leather Armor", category: "armor", armorCategory: "light", quantity: 1, baseAc: 11 }] },
          { label: "Chain Mail (Heavy, AC 16 if proficient)", items: [{ name: "Chain Mail", category: "armor", armorCategory: "heavy", quantity: 1, baseAc: 16 }] },
        ],
      },
      {
        id: "cleric-3",
        name: "Ranged / Secondary Weapon",
        options: [
          { label: "Light Crossbow & 20 Bolts", items: [{ name: "Light Crossbow", category: "weapon", quantity: 1, damage: "1d8", damageType: "piercing", properties: ["ammunition", "loading", "two-handed"], range: "80/320" }, { name: "Crossbow Bolts (20)", category: "gear", quantity: 20 }] },
          { label: "Choose Any Simple Weapon", pickFrom: "any_simple_weapon", items: [] },
        ],
      },
      {
        id: "cleric-4",
        name: "Pack",
        options: [
          { label: "Priest's Pack", items: [{ name: "Priest's Pack", category: "gear", quantity: 1 }] },
          { label: "Explorer's Pack", items: [{ name: "Explorer's Pack", category: "gear", quantity: 1 }] },
          { label: "Choose Any Pack", pickFrom: "any_pack", items: [] },
        ],
      },
    ],
    fixedEquipment: [
      { name: "Shield", category: "shield", quantity: 1, baseAc: 2 },
      { name: "Holy Symbol (Amulet)", category: "gear", quantity: 1 },
    ],
    subclasses: [
      {
        id: "life",
        name: "Life Domain",
        source: "PHB",
        description: "Focuses on vibrant positive energy that sustains all life, granting heavy armor and supreme healing output.",
        bonusProficiencies: { armor: ["Heavy armor"] },
        features: [
          { level: 1, name: "Bonus Proficiency & Disciple of Life", description: "Gain heavy armor proficiency. Your healing spells restore an extra 2 + spell level HP." },
          { level: 2, name: "Channel Divinity: Preserve Life", description: "Restore up to 5 × cleric level HP split among bloodied creatures within 30 ft (up to half max HP)." },
          { level: 6, name: "Blessed Healer", description: "When you cast a healing spell on another creature, you regain 2 + spell level HP yourself." },
          { level: 8, name: "Divine Strike", description: "Add 1d8 radiant damage to one weapon hit each turn (2d8 at 14th level)." },
          { level: 17, name: "Supreme Healing", description: "Instead of rolling dice for healing spells, use the maximum possible value for every die." },
        ],
      },
      {
        id: "light",
        name: "Light Domain",
        source: "PHB",
        description: "Channels searing radiance and holy flame to banish darkness and incinerate foes.",
        features: [
          { level: 1, name: "Bonus Cantrip & Warding Flare", description: "Gain the Light cantrip. Reaction to impose disadvantage on an attacker within 30 ft (WIS mod/long rest)." },
          { level: 2, name: "Channel Divinity: Radiance of the Dawn", description: "Dispel magical darkness and deal 2d10 + cleric level radiant damage in a 30-ft radius." },
          { level: 6, name: "Improved Flare", description: "Use Warding Flare when an enemy attacks an ally within 30 ft." },
          { level: 8, name: "Potent Spellcasting", description: "Add WIS modifier to damage dealt by any cleric cantrip." },
          { level: 17, name: "Corona of Light", description: "Emit bright sunlight (60 ft); enemies within have disadvantage on saves vs fire or radiant spells." },
        ],
      },
      {
        id: "knowledge",
        name: "Knowledge Domain",
        source: "PHB",
        description: "Reveres scholarship, secrets, and divination—gaining expertise in two lore skills and mind-reading.",
        bonusProficiencies: { skillsCount: 2 },
        features: [
          { level: 1, name: "Blessings of Knowledge", description: "Learn 2 extra languages and gain doubled proficiency in two chosen lore skills (Arcana, History, Nature, or Religion)." },
          { level: 2, name: "Channel Divinity: Knowledge of the Ages", description: "Gain temporary proficiency with any skill or tool for 10 minutes." },
          { level: 6, name: "Channel Divinity: Read Thoughts", description: "Read a creature's surface thoughts and cast Suggestion without a slot if it fails a WIS save." },
          { level: 8, name: "Potent Spellcasting", description: "Add WIS modifier to cleric cantrip damage." },
          { level: 17, name: "Visions of the Past", description: "Meditate to view ghostly visions of recent events tied to an object or location." },
        ],
      },
      {
        id: "nature",
        name: "Nature Domain",
        source: "PHB",
        description: "Wields primeval natural magic alongside heavy armor, calming beasts and elements.",
        bonusProficiencies: { armor: ["Heavy armor"], skillsCount: 1 },
        features: [
          { level: 1, name: "Acolyte of Nature", description: "Learn one druid cantrip, gain proficiency in Animal Handling, Nature, or Survival, plus heavy armor." },
          { level: 2, name: "Channel Divinity: Charm Animals and Plants", description: "Charm beasts and plant creatures within 30 ft for 1 minute." },
          { level: 6, name: "Dampen Elements", description: "Reaction to grant resistance against acid, cold, fire, lightning, or thunder damage to an ally within 30 ft." },
          { level: 8, name: "Divine Strike", description: "Deal +1d8 cold, fire, or lightning damage on one weapon hit per turn (2d8 at 14th)." },
          { level: 17, name: "Master of Nature", description: "Command charmed animals and plants with a bonus action." },
        ],
      },
      {
        id: "tempest",
        name: "Tempest Domain",
        source: "PHB",
        description: "Commands thunder, lightning, and crashing waves with martial armor and maximized storm blasts.",
        bonusProficiencies: { armor: ["Heavy armor"], weapons: ["Martial weapons"] },
        features: [
          { level: 1, name: "Bonus Proficiencies & Wrath of the Storm", description: "Gain heavy armor and martial weapons. Reaction when hit in melee to deal 2d8 lightning or thunder damage (DEX save half)." },
          { level: 2, name: "Channel Divinity: Destructive Wrath", description: "Maximize lightning or thunder damage rolls instead of rolling dice." },
          { level: 6, name: "Thunderbolt Strike", description: "When dealing lightning damage to a Large or smaller creature, push it up to 10 ft away." },
          { level: 8, name: "Divine Strike", description: "Deal +1d8 thunder damage on one weapon hit per turn (2d8 at 14th)." },
          { level: 17, name: "Stormborn", description: "Gain a flying speed equal to your walking speed whenever you are outdoors." },
        ],
      },
      {
        id: "trickery",
        name: "Trickery Domain",
        source: "PHB",
        description: "Patronage of mischief, illusion, stealth blessings, and illusory duplicates.",
        features: [
          { level: 1, name: "Blessing of the Trickster", description: "Action to grant another creature advantage on Stealth checks for 1 hour." },
          { level: 2, name: "Channel Divinity: Invoke Duplicity", description: "Create a perfect illusory duplicate within 30 ft, cast spells from its position, and gain advantage if both threaten a target." },
          { level: 6, name: "Channel Divinity: Cloak of Shadows", description: "Action to turn invisible until the end of your next turn." },
          { level: 8, name: "Divine Strike", description: "Deal +1d8 poison damage on one weapon hit per turn (2d8 at 14th)." },
          { level: 17, name: "Improved Duplicity", description: "Create up to four illusory duplicates at once." },
        ],
      },
      {
        id: "war",
        name: "War Domain",
        source: "PHB",
        description: "Empowers righteous steel and armor with extra bonus attacks and +10 precision strikes.",
        bonusProficiencies: { armor: ["Heavy armor"], weapons: ["Martial weapons"] },
        features: [
          { level: 1, name: "Bonus Proficiencies & War Priest", description: "Gain heavy armor and martial weapons. Make a bonus action weapon attack after Attacking (WIS mod/long rest)." },
          { level: 2, name: "Channel Divinity: Guided Strike", description: "Gain a +10 bonus to an attack roll after seeing the d20 roll." },
          { level: 6, name: "Channel Divinity: War God's Blessing", description: "Reaction to grant +10 to an ally's attack roll within 30 ft." },
          { level: 8, name: "Divine Strike", description: "Deal +1d8 extra weapon damage once per turn (2d8 at 14th)." },
          { level: 17, name: "Avatar of Battle", description: "Gain resistance to nonmagical bludgeoning, piercing, and slashing damage." },
        ],
      },
      {
        id: "forge",
        name: "Forge Domain",
        source: "XGtE",
        description: "Masters of hammer, anvil, and sacred flame who bless armor and weapons into +1 gear.",
        bonusProficiencies: { armor: ["Heavy armor"], tools: ["Smith's tools"] },
        features: [
          { level: 1, name: "Blessing of the Forge", description: "Gain heavy armor and smith's tools. Touch a nonmagical weapon or armor after a long rest to make it +1 magic gear." },
          { level: 2, name: "Channel Divinity: Artisan's Blessing", description: "Conduct a 1-hour ritual to craft metal objects worth up to 100 gp." },
          { level: 6, name: "Soul of the Forge", description: "Gain fire resistance and +1 AC while wearing heavy armor." },
          { level: 8, name: "Divine Strike", description: "Deal +1d8 fire damage on one weapon hit per turn (2d8 at 14th)." },
          { level: 17, name: "Saint of Forge and Fire", description: "Gain fire immunity and resistance to nonmagical bludgeoning/piercing/slashing damage in heavy armor." },
        ],
      },
      {
        id: "grave",
        name: "Grave Domain",
        source: "XGtE",
        description: "Guards the boundary between life and death—maximizing healing on dying allies and cursing foes with vulnerability.",
        features: [
          { level: 1, name: "Circle of Mortality & Eyes of the Grave", description: "Maximize healing dice on creatures at 0 HP; Spare the Dying becomes a 30-ft bonus action. Sense undead within 60 ft." },
          { level: 2, name: "Channel Divinity: Path to the Grave", description: "Curse a creature within 30 ft so the next hit against it deals double (vulnerable) damage." },
          { level: 6, name: "Sentinel at Death's Door", description: "Reaction to turn a critical hit against you or an ally within 30 ft into a normal hit (WIS mod/long rest)." },
          { level: 8, name: "Potent Spellcasting", description: "Add WIS mod to cleric cantrip damage." },
          { level: 17, name: "Keeper of Souls", description: "When an enemy dies within 60 ft, heal an ally for HP equal to its Hit Dice." },
        ],
      },
      {
        id: "order",
        name: "Order Domain",
        source: "TCoE",
        description: "Enforcers of cosmic law and hierarchy whose supportive spells command allies to strike immediately.",
        bonusProficiencies: { armor: ["Heavy armor"], skillsCount: 1 },
        features: [
          { level: 1, name: "Bonus Proficiencies & Voice of Authority", description: "Gain heavy armor and Intimidation or Persuasion. When you cast a 1st+ level spell targeting an ally, it can immediately make one weapon attack as a reaction." },
          { level: 2, name: "Channel Divinity: Order's Demand", description: "Charm creatures within 30 ft and force them to drop what they hold." },
          { level: 6, name: "Embodiment of the Law", description: "Cast Enchantment spells normally taking an action as a bonus action (WIS mod/long rest)." },
          { level: 8, name: "Divine Strike", description: "Deal +1d8 psychic damage on one weapon hit per turn (2d8 at 14th)." },
          { level: 17, name: "Order's Wrath", description: "Divine Strike curses the target so your allies deal an extra 2d8 psychic damage on its next hit." },
        ],
      },
      {
        id: "peace",
        name: "Peace Domain",
        source: "TCoE",
        description: "Forges supernatural Emboldening Bonds between companions to bolster every attack, check, and save.",
        bonusProficiencies: { skillsCount: 1 },
        features: [
          { level: 1, name: "Implement of Peace & Emboldening Bond", description: "Gain Insight, Performance, or Persuasion. Bond up to PB creatures within 30 ft so they can add +1d4 to one attack, check, or save per turn (PB/long rest)." },
          { level: 2, name: "Channel Divinity: Balm of Peace", description: "Move up to your speed without provoking opportunity attacks and heal any creature you pass for 2d6 + WIS mod HP." },
          { level: 6, name: "Protective Bond", description: "Bonded creatures within 30 ft can teleport to take damage for an injured ally." },
          { level: 8, name: "Potent Spellcasting", description: "Add WIS mod to cleric cantrip damage." },
          { level: 17, name: "Expansive Bond", description: "Emboldening and Protective Bond range increases to 60 ft and grants resistance to redirected damage." },
        ],
      },
      {
        id: "twilight",
        name: "Twilight Domain",
        source: "TCoE",
        description: "Stands watch in the soothing dusk—sharing 300-ft darkvision, Vigilant Initiative, and a regenerating temp HP sanctuary.",
        bonusProficiencies: { armor: ["Heavy armor"], weapons: ["Martial weapons"] },
        features: [
          { level: 1, name: "Eyes of Night & Vigilant Blessing", description: "Heavy armor & martial weapons; gain 300 ft darkvision shareable with allies. Grant advantage on initiative rolls to one creature." },
          { level: 2, name: "Channel Divinity: Twilight Sanctuary", description: "30-ft aura of dim twilight; allies ending their turn inside gain 1d6 + cleric level temp HP or end charmed/frightened." },
          { level: 6, name: "Steps of Night", description: "Bonus action while in dim light or darkness to gain a flying speed equal to your walking speed." },
          { level: 8, name: "Divine Strike", description: "Deal +1d8 radiant damage on one weapon hit per turn (2d8 at 14th)." },
          { level: 17, name: "Twilight Shroud", description: "Allies inside Twilight Sanctuary gain half cover (+2 AC and DEX saves)." },
        ],
      },
      {
        id: "arcana",
        name: "Arcana Domain",
        source: "SCAG",
        description: "Bridges divine faith and arcane mastery—adding Arcana proficiency, wizard cantrips, and high-level wizard secrets.",
        bonusProficiencies: { skillsCount: 1 },
        features: [
          { level: 1, name: "Arcane Initiate", description: "Gain Arcana proficiency and two wizard cantrips that count as cleric cantrips." },
          { level: 2, name: "Channel Divinity: Arcane Abjuration", description: "Turn or banish one celestial, elemental, fey, or fiend within 30 ft." },
          { level: 6, name: "Spell Breaker", description: "Healing spells you cast on an ally also end one active spell on them of equal or lower level." },
          { level: 8, name: "Potent Spellcasting", description: "Add WIS mod to cleric cantrip damage." },
          { level: 17, name: "Arcane Mastery", description: "Add one 6th-, 7th-, 8th-, and 9th-level wizard spell permanently to your domain spells." },
        ],
      },
      {
        id: "death",
        name: "Death Domain",
        source: "DMG",
        description: "Commands necrotic decay, twinned Chill Touch/Toll the Dead cantrips, and Touch of Death channel divinity.",
        bonusProficiencies: { weapons: ["Martial weapons"] },
        features: [
          { level: 1, name: "Bonus Proficiency & Reaper", description: "Gain martial weapon proficiency and one necromancy cantrip; target two adjacent creatures with single-target necromancy cantrips." },
          { level: 2, name: "Channel Divinity: Touch of Death", description: "On a melee hit, deal extra necrotic damage equal to 5 + twice your cleric level." },
          { level: 6, name: "Inescapable Destruction", description: "Your cleric spells and Channel Divinity necrotic damage ignore necrotic resistance." },
          { level: 8, name: "Divine Strike", description: "Deal +1d8 necrotic damage on one weapon hit per turn (2d8 at 14th)." },
          { level: 17, name: "Improved Reaper", description: "Necromancy spells of 1st–5th level targeting one creature can target two adjacent creatures." },
        ],
      },
    ],
    features: [
      { level: 1, name: "Spellcasting", description: "Cast cleric spells using Wisdom. Prepare spells daily equal to WIS mod + cleric level." },
      { level: 1, name: "Divine Domain", description: "Choose a domain related to your deity, granting always-prepared domain spells and 1st-level features." },
      { level: 2, name: "Channel Divinity & Turn Undead", description: "Channel divine energy (1/rest; 2/rest at 6th, 3/rest at 18th) for Turn Undead or domain powers." },
      { level: 5, name: "Destroy Undead (CR 1/2)", description: "Undead failing Turn Undead are instantly destroyed if at or below the CR threshold (up to CR 4 at 17th)." },
      { level: 10, name: "Divine Intervention", description: "Roll percentile dice equal to or under cleric level to summon direct aid from your deity (automatic at level 20)." },
    ],
  },

  Druid: {
    id: "druid",
    name: "Druid",
    hitDie: "d8",
    primaryAbility: "Wisdom",
    recommendedStats: "Primary: Wisdom (for nature spellcasting & wild shape spell DC). Secondary: Constitution (for HP & concentration) and Dexterity (for AC with non-metal armor).",
    savingThrows: ["int", "wis"],
    armorProficiencies: ["Light armor (non-metal)", "Medium armor (non-metal)", "Shields (non-metal)"],
    weaponProficiencies: ["Clubs", "Daggers", "Darts", "Javelins", "Maces", "Quarterstaffs", "Scimitars", "Sickles", "Slings", "Spears"],
    toolProficiencies: ["Herbalism kit"],
    startingGoldFormula: "2d4 × 10 gp",
    startingGoldAvg: 50,
    skillChoices: { count: 2, availableSkills: ["arcana", "animalHandling", "insight", "medicine", "nature", "perception", "religion", "survival"] },
    multiclassGains: ["Light armor", "Medium armor", "Shields (non-metal)"],
    multiclassPrereqs: { wis: 13 },
    subclassLevel: 2,
    spellcastingType: "full",
    spellcastingAbility: "wis",
    asiLevels: [4, 8, 12, 16, 19],
    startingEquipmentChoices: [
      {
        id: "druid-1",
        name: "Shield or Simple Weapon",
        options: [
          { label: "Wooden Shield", items: [{ name: "Shield", category: "shield", quantity: 1, baseAc: 2 }] },
          { label: "Choose Any Simple Weapon", pickFrom: "any_simple_weapon", items: [] },
        ],
      },
      {
        id: "druid-2",
        name: "Melee Weapon",
        options: [
          { label: "Scimitar", items: [{ name: "Scimitar", category: "weapon", quantity: 1, damage: "1d6", damageType: "slashing", properties: ["finesse", "light"] }] },
          { label: "Choose Any Simple Melee Weapon", pickFrom: "any_simple_melee", items: [] },
        ],
      },
      {
        id: "druid-3",
        name: "Pack",
        options: [
          { label: "Explorer's Pack", items: [{ name: "Explorer's Pack", category: "gear", quantity: 1 }] },
          { label: "Choose Any Pack", pickFrom: "any_pack", items: [] },
        ],
      },
    ],
    fixedEquipment: [
      { name: "Leather Armor", category: "armor", armorCategory: "light", quantity: 1, baseAc: 11 },
      { name: "Druidic Focus (Wooden Staff)", category: "gear", quantity: 1 },
    ],
    subclasses: [
      {
        id: "moon",
        name: "Circle of the Moon",
        source: "PHB",
        description: "Fierce guardians of the wilds who shift into powerful CR 1+ beast and elemental shapes in combat.",
        features: [
          { level: 2, name: "Combat Wild Shape & Circle Forms", description: "Wild Shape as a bonus action; expend spell slots to heal 1d8 HP per slot level. Transform into beasts up to CR 1 (later CR = druid level / 3)." },
          { level: 6, name: "Primal Strike", description: "Attacks in beast form count as magical for overcoming damage resistance and immunity." },
          { level: 10, name: "Elemental Wild Shape", description: "Expend two Wild Shape uses to become an Air, Earth, Fire, or Water Elemental." },
          { level: 14, name: "Thousand Forms", description: "Cast Alter Self at will." },
        ],
      },
      {
        id: "land",
        name: "Circle of the Land",
        source: "PHB",
        description: "Mystics and sages attuned to Arctic, Coast, Desert, Forest, Grassland, Mountain, Swamp, or Underdark magic.",
        features: [
          { level: 2, name: "Bonus Cantrip & Natural Recovery", description: "Learn one extra druid cantrip. During a short rest once per day, recover spell slots totaling up to half druid level (rounded up)." },
          { level: 3, name: "Circle Spells", description: "Gain always-prepared terrain spells based on your chosen land." },
          { level: 6, name: "Land's Stride", description: "Move effortlessly through nonmagical difficult terrain and nonmagical plants." },
          { level: 10, name: "Nature's Ward", description: "Immune to poison and disease, and can't be charmed or frightened by elementals or fey." },
          { level: 14, name: "Nature's Sanctuary", description: "Beasts and plants must pass a WIS save to attack you." },
        ],
      },
      {
        id: "dreams",
        name: "Circle of Dreams",
        source: "XGtE",
        description: "Guardians touched by the Summer Court of the Feywild, mending wounds with fey balm and shielding campsites.",
        features: [
          { level: 2, name: "Balm of the Summer Court", description: "Bonus action pool of d6 dice equal to druid level to heal allies within 120 ft and grant 1 temp HP per die." },
          { level: 6, name: "Hearth of Moonlight and Shadow", description: "Create a 30-ft invisible twilight dome during rests (+5 Stealth and Perception)." },
          { level: 10, name: "Hidden Paths", description: "Bonus action to teleport yourself 60 ft or an ally 30 ft (WIS mod/long rest)." },
          { level: 14, name: "Walker in Dreams", description: "Cast Dream, Scrying, or Teleportation Circle without slots after a short rest." },
        ],
      },
      {
        id: "shepherd",
        name: "Circle of the Shepherd",
        source: "XGtE",
        description: "Communes with beasts and summons mighty spirit totems—Bear, Hawk, or Unicorn—to bolster allies and conjured beasts.",
        features: [
          { level: 2, name: "Speech of the Woods & Spirit Totem", description: "Speak Sylvan and converse with beasts. Bonus action 30-ft aura of Bear (temp HP + STR adv), Hawk (reaction attack adv), or Unicorn (healing burst)." },
          { level: 6, name: "Mighty Summoner", description: "Conjured beasts and fey gain +2 HP per Hit Die and magical natural weapons." },
          { level: 10, name: "Guardian Spirit", description: "Summoned beasts/fey inside your Spirit Totem regain half druid level HP each turn." },
          { level: 14, name: "Faithful Summons", description: "If reduced to 0 HP or incapacitated, Conjure Animals triggers automatically at 9th level to protect you." },
        ],
      },
      {
        id: "spores",
        name: "Circle of Spores",
        source: "TCoE",
        description: "Channels fungal decomposition and life-death cycles, surrounding themselves with toxic spores and animated fungal zombies.",
        features: [
          { level: 2, name: "Halo of Spores & Symbiotic Entity", description: "Reaction 1d4 necrotic damage (scales to 1d10). Spend Wild Shape for 4 × druid level temp HP, doubled spore damage, and +1d6 necrotic melee hits." },
          { level: 6, name: "Fungal Infestation", description: "Reaction when a Small/Medium beast or humanoid dies within 10 ft to animate it as a spore-covered zombie." },
          { level: 10, name: "Spreading Spores", description: "Hurl a 10-ft cube of spores up to 30 ft away." },
          { level: 14, name: "Fungal Body", description: "Immune to blinded, deafened, frightened, poisoned, and critical hits." },
        ],
      },
      {
        id: "stars",
        name: "Circle of Stars",
        source: "TCoE",
        description: "Reads celestial constellations through a Star Map, taking luminous Archer, Chalice, or Dragon Starry Forms.",
        features: [
          { level: 2, name: "Star Map & Starry Form", description: "Gain Guidance and free Guiding Bolt casts (PB/long rest). Spend Wild Shape for Archer (1d8+WIS radiant bolt), Chalice (bonus 1d8+WIS heal), or Dragon (min 10 on Concentration saves)." },
          { level: 6, name: "Cosmic Omen", description: "Roll d6 after long rest: reaction Weal (+1d6) or Woe (-1d6) to rolls within 30 ft (PB/long rest)." },
          { level: 10, name: "Twinkling Constellations", description: "Archer/Chalice scale to 2d8, Dragon grants 20-ft fly speed, and you can switch constellations every turn." },
          { level: 14, name: "Full of Stars", description: "While in Starry Form, gain resistance to bludgeoning, piercing, and slashing damage." },
        ],
      },
      {
        id: "wildfire",
        name: "Circle of Wildfire",
        source: "TCoE",
        description: "Partners with a fiery Wildfire Spirit of renewal and controlled destruction, teleporting allies in bursts of flame.",
        hasCompanion: true,
        companionType: "familiar",
        features: [
          { level: 2, name: "Summon Wildfire Spirit", description: "Spend Wild Shape to summon a Wildfire Spirit (2d6 fire burst on arrival); bonus action to command it for 1d6+PB Flame Seed or 15-ft Fiery Teleportation." },
          { level: 6, name: "Enhanced Bond", description: "Add +1d8 to one fire damage or healing spell roll while your Wildfire Spirit is active, and cast spells from its space." },
          { level: 10, name: "Cauterizing Flames", description: "Reaction when a creature dies within 30 ft to leave a flame healing or burning creatures for 2d10 + WIS mod." },
          { level: 14, name: "Blazing Revival", description: "If reduced to 0 HP within 120 ft of your Wildfire Spirit, drop the spirit to 0 HP instead and recover with half HP." },
        ],
      },
    ],
    features: [
      { level: 1, name: "Druidic & Spellcasting", description: "Know the secret language Druidic. Cast druid spells using Wisdom (prepare WIS mod + druid level daily)." },
      { level: 2, name: "Wild Shape & Druid Circle", description: "Transform into beasts you have seen (2/short or long rest) and join a Druid Circle." },
      { level: 18, name: "Timeless Body & Beast Spells", description: "Age at 1/10th rate and cast somatic/verbal druid spells while Wild Shaped." },
      { level: 20, name: "Archdruid", description: "Use Wild Shape an unlimited number of times and ignore non-costed components." },
    ],
  },

  Fighter: {
    id: "fighter",
    name: "Fighter",
    hitDie: "d10",
    primaryAbility: "Strength or Dexterity",
    recommendedStats: "Primary: Strength (for heavy armor & greatswords) OR Dexterity (for archery/finesse). Secondary: Constitution (for massive HP).",
    savingThrows: ["str", "con"],
    armorProficiencies: ["All armor", "Shields"],
    weaponProficiencies: ["Simple weapons", "Martial weapons"],
    toolProficiencies: [],
    startingGoldFormula: "5d4 × 10 gp",
    startingGoldAvg: 125,
    skillChoices: { count: 2, availableSkills: ["acrobatics", "animalHandling", "athletics", "history", "insight", "intimidation", "perception", "survival"] },
    multiclassGains: ["Light armor", "Medium armor", "Shields", "Simple weapons", "Martial weapons"],
    multiclassPrereqs: { str: 13 }, // OR dex 13 handled in rulesEngine
    subclassLevel: 3,
    spellcastingType: "none",
    asiLevels: [4, 6, 8, 12, 14, 16, 19],
    startingEquipmentChoices: [
      {
        id: "fighter-1",
        name: "Armor",
        options: [
          { label: "Chain Mail (Heavy, AC 16)", items: [{ name: "Chain Mail", category: "armor", armorCategory: "heavy", quantity: 1, baseAc: 16 }] },
          { label: "Leather Armor, Longbow & 20 Arrows", items: [{ name: "Leather Armor", category: "armor", armorCategory: "light", quantity: 1, baseAc: 11 }, { name: "Longbow", category: "weapon", quantity: 1, damage: "1d8", damageType: "piercing", properties: ["ammunition", "heavy", "two-handed"], range: "150/600" }, { name: "Arrows (20)", category: "gear", quantity: 20 }] },
        ],
      },
      {
        id: "fighter-2",
        name: "Martial Weapon(s)",
        options: [
          { label: "Martial Weapon + Shield (Choose Weapon)", pickFrom: "any_martial_weapon", items: [{ name: "Shield", category: "shield", quantity: 1, baseAc: 2 }] },
          { label: "Two Martial Weapons (Choose Weapons)", pickFrom: "any_martial_weapon", pickCount: 2, items: [] },
        ],
      },
      {
        id: "fighter-3",
        name: "Ranged / Thrown Backup",
        options: [
          { label: "Light Crossbow & 20 Bolts", items: [{ name: "Light Crossbow", category: "weapon", quantity: 1, damage: "1d8", damageType: "piercing", properties: ["ammunition", "loading", "two-handed"], range: "80/320" }, { name: "Crossbow Bolts (20)", category: "gear", quantity: 20 }] },
          { label: "Two Handaxes", items: [{ name: "Handaxe", category: "weapon", quantity: 2, damage: "1d6", damageType: "slashing", properties: ["light", "thrown"], range: "20/60" }] },
        ],
      },
      {
        id: "fighter-4",
        name: "Pack",
        options: [
          { label: "Dungeoneer's Pack", items: [{ name: "Dungeoneer's Pack", category: "gear", quantity: 1 }] },
          { label: "Explorer's Pack", items: [{ name: "Explorer's Pack", category: "gear", quantity: 1 }] },
          { label: "Choose Any Pack", pickFrom: "any_pack", items: [] },
        ],
      },
    ],
    fixedEquipment: [],
    subclasses: [
      {
        id: "champion",
        name: "Champion",
        source: "PHB",
        description: "Focuses on raw physical athleticism, expanded 19–20 (then 18–20) critical range, and Survivor regeneration.",
        features: [
          { level: 3, name: "Improved Critical", description: "Your weapon attacks score a critical hit on a roll of 19 or 20." },
          { level: 7, name: "Remarkable Athlete", description: "Add half proficiency bonus to non-proficient STR, DEX, or CON checks; increase running long jump by STR mod feet." },
          { level: 10, name: "Additional Fighting Style", description: "Choose a second Fighting Style." },
          { level: 15, name: "Superior Critical", description: "Weapon attacks score a critical hit on a roll of 18–20." },
          { level: 18, name: "Survivor", description: "Regain 5 + CON mod HP at the start of your turn when at half HP or lower." },
        ],
      },
      {
        id: "battlemaster",
        name: "Battle Master",
        source: "PHB",
        description: "Tactical weapon virtuoso spending Superiority Dice on maneuvers like Riposte, Trip Attack, and Precision Attack.",
        bonusProficiencies: { tools: ["One type of artisan's tools"] },
        features: [
          { level: 3, name: "Combat Superiority & Student of War", description: "Gain 4 d8 Superiority Dice (short rest recharge) and 3 tactical maneuvers, plus one artisan's tool." },
          { level: 7, name: "Know Your Enemy", description: "Observe a creature for 1 minute to compare physical stats, AC, HP, or class levels." },
          { level: 10, name: "Improved Combat Superiority", description: "Superiority Dice increase to d10s (d12s at 18th)." },
          { level: 15, name: "Relentless", description: "Regain 1 Superiority Die when rolling initiative with none left." },
        ],
      },
      {
        id: "eldritch_knight",
        name: "Eldritch Knight",
        source: "PHB",
        description: "Blends heavy martial combat with abjuration and evocation wizard spells (1/3 caster) and bonded weapons.",
        features: [
          { level: 3, name: "Weapon Bond & Spellcasting", description: "Bond up to two weapons (cannot be disarmed; summon as bonus action). Cast wizard Abjuration/Evocation spells with Intelligence." },
          { level: 7, name: "War Magic", description: "When you use your action to cast a cantrip, make one weapon attack as a bonus action." },
          { level: 10, name: "Eldritch Strike", description: "Creatures hit by your weapon attack have disadvantage on their next save against a spell you cast." },
          { level: 15, name: "Arcane Charge", description: "Teleport up to 30 ft when using Action Surge." },
          { level: 18, name: "Improved War Magic", description: "When you cast any spell with your action, make one weapon attack as a bonus action." },
        ],
      },
      {
        id: "arcane_archer",
        name: "Arcane Archer",
        source: "XGtE",
        description: "Fuses elven archery mastery with magical Arcane Shot arrows like Grasping, Shadow, or Seeking Arrow.",
        bonusProficiencies: { skillsCount: 1 },
        features: [
          { level: 3, name: "Arcane Archer Lore & Arcane Shot", description: "Gain Arcana or Nature + Prestidigitation/Druidcraft. Infuse bow attacks with 2d6+ Arcane Shots (2/short rest)." },
          { level: 7, name: "Magic Arrow & Curving Shot", description: "All arrows count as magical; bonus action to redirect a missed arrow to another target within 60 ft." },
          { level: 15, name: "Ever-Ready Shot", description: "Regain 1 Arcane Shot use when rolling initiative with none remaining." },
        ],
      },
      {
        id: "cavalier",
        name: "Cavalier",
        source: "XGtE",
        description: "Master mounted defender who marks targets to shield nearby allies and locks down enemy movement.",
        bonusProficiencies: { skillsCount: 1 },
        features: [
          { level: 3, name: "Born to the Saddle & Unwavering Mark", description: "Advantage on saves vs falling off mount. Mark hit melee foes to impose disadvantage against allies and gain bonus punishing strikes." },
          { level: 7, name: "Warding Maneuver", description: "Reaction to grant +1d8 AC and resistance to damage for an ally within 5 ft (CON mod/long rest)." },
          { level: 10, name: "Hold the Line", description: "Creatures provoke opportunity attacks simply by moving 5 ft within your reach, stopping them at 0 speed on a hit." },
          { level: 18, name: "Vigilant Defender", description: "Gain a special reaction on every creature's turn solely for opportunity attacks." },
        ],
      },
      {
        id: "samurai",
        name: "Samurai",
        source: "XGtE",
        description: "Implacable warrior who unleashes Fighting Spirit for on-demand advantage, temp HP, and extra attacks.",
        bonusProficiencies: { skillsCount: 1 },
        features: [
          { level: 3, name: "Fighting Spirit & Bonus Proficiency", description: "Bonus action for advantage on all weapon attacks this turn plus 5 temp HP (scales to 15; 3/long rest). Gain one social/history skill." },
          { level: 7, name: "Elegant Courtier", description: "Add WIS modifier to Persuasion checks and gain proficiency in Wisdom saving throws." },
          { level: 10, name: "Tireless Spirit", description: "Regain 1 Fighting Spirit use when rolling initiative with none left." },
          { level: 15, name: "Rapid Strike", description: "Forgo advantage on one attack to make an additional weapon attack as part of the same action." },
          { level: 18, name: "Strength Before Death", description: "Reaction when reduced to 0 HP to immediately take an entire extra turn before falling unconscious." },
        ],
      },
      {
        id: "psi_warrior",
        name: "Psi Warrior",
        source: "TCoE",
        description: "Channels telekinetic Psionic Energy Dice for protective fields, kinetic strikes, and telekinetic leaps.",
        features: [
          { level: 3, name: "Psionic Power (Protective Field / Psionic Strike / Telekinetic Movement)", description: "Pool of Psionic Energy Dice (2 × PB d6s) to reduce damage by 1d6+INT, add 1d6+INT force damage, or lift objects/allies 30 ft." },
          { level: 7, name: "Telekinetic Adept", description: "Psi-Powered Leap grants fly speed equal to 2× speed; Telekinetic Thrust knocks hit foes prone or pushes 10 ft." },
          { level: 10, name: "Guarded Mind", description: "Gain psychic damage resistance and spend a Psi die to end charmed/frightened." },
          { level: 15, name: "Bulwark of Force", description: "Bonus action to grant INT mod creatures half cover (+2 AC/DEX saves) for 1 minute." },
          { level: 18, name: "Telekinetic Master", description: "Cast Telekinesis without components and attack as a bonus action while concentrating on it." },
        ],
      },
      {
        id: "rune_knight",
        name: "Rune Knight",
        source: "TCoE",
        description: "Carves giant runes into weapons and armor while growing Giant-sized in combat.",
        bonusProficiencies: { tools: ["Smith's tools"] },
        features: [
          { level: 3, name: "Giant's Might & Rune Carver", description: "Bonus action to grow Large size for 1 min (+1d6 weapon damage once/turn, STR adv). Inscribe passive+active Giant Runes (Cloud, Fire, Frost, Stone, etc.)." },
          { level: 7, name: "Runic Shield", description: "Reaction to force an attacker within 60 ft to reroll a hit against an ally (PB/long rest)." },
          { level: 10, name: "Great Stature", description: "Grow permanently taller; Giant's Might bonus damage increases to 1d8." },
          { level: 15, name: "Master of Runes", description: "Invoke each inscribed rune twice per short/long rest." },
          { level: 18, name: "Runic Juggernaut", description: "Grow Huge during Giant's Might with +5 ft reach and 1d10 bonus damage." },
        ],
      },
      {
        id: "echo_knight",
        name: "Echo Knight",
        source: "EGtW",
        description: "Manifests a translucent temporal duplicate (Echo) to attack from two places at once and swap positions.",
        features: [
          { level: 3, name: "Manifest Echo & Unleash Incarnation", description: "Bonus action to manifest an Echo within 15 ft (teleport-swap for 15 ft movement, attack/opportunity-attack from its space). Unleash extra melee attacks from your Echo (CON mod/long rest)." },
          { level: 7, name: "Echo Avatar", description: "See and hear through your Echo up to 1,000 ft away." },
          { level: 10, name: "Shadow Martyr", description: "Reaction to intercept an attack targeting an ally with your Echo." },
          { level: 15, name: "Reclaim Potential", description: "Gain 2d6 + CON mod temp HP when your Echo is destroyed." },
          { level: 18, name: "Legion of One", description: "Manifest two Echoes simultaneously and regain Unleash Incarnation uses on initiative." },
        ],
      },
      {
        id: "purple_dragon_knight",
        name: "Banneret (Purple Dragon Knight)",
        source: "SCAG",
        description: "Inspiring battlefield commander whose Second Wind, Action Surge, and Indomitable directly empower nearby allies.",
        features: [
          { level: 3, name: "Rallying Cry", description: "When you use Second Wind, up to 3 allies within 60 ft regain fighter level HP." },
          { level: 7, name: "Royal Envoy", description: "Gain Persuasion proficiency and doubled proficiency bonus on Persuasion checks." },
          { level: 10, name: "Inspiring Surge", description: "When using Action Surge, an ally within 60 ft can make one weapon attack as a reaction." },
          { level: 15, name: "Bulwark", description: "Extend your Indomitable save reroll to an ally within 60 ft." },
        ],
      },
    ],
    features: [
      { level: 1, name: "Fighting Style", description: "Choose Archery (+2 ranged attack), Defense (+1 AC in armor), Dueling (+2 1-handed damage), Great Weapon Fighting, Protection, or Two-Weapon Fighting." },
      { level: 1, name: "Second Wind", description: "Bonus action to regain 1d10 + fighter level HP (1/short or long rest)." },
      { level: 2, name: "Action Surge", description: "Take one additional action on your turn (1/rest; 2/rest at 17th)." },
      { level: 3, name: "Martial Archetype", description: "Choose an archetype that emulates your combat discipline." },
      { level: 5, name: "Extra Attack", description: "Attack twice whenever taking the Attack action (3× at 11th, 4× at 20th)." },
      { level: 9, name: "Indomitable", description: "Reroll a failed saving throw (1/long rest; 2× at 13th, 3× at 17th)." },
    ],
  },

  Monk: {
    id: "monk",
    name: "Monk",
    hitDie: "d8",
    primaryAbility: "Dexterity & Wisdom",
    recommendedStats: "Primary: Dexterity (for martial arts attack/damage & AC) and Wisdom (for Ki save DC & Unarmored Defense AC). Secondary: Constitution (for HP).",
    savingThrows: ["str", "dex"],
    armorProficiencies: [],
    weaponProficiencies: ["Simple weapons", "Shortswords"],
    toolProficiencies: ["One artisan's tool or one musical instrument"],
    startingGoldFormula: "5d4 gp",
    startingGoldAvg: 12,
    skillChoices: { count: 2, availableSkills: ["acrobatics", "athletics", "history", "insight", "religion", "stealth"] },
    multiclassGains: ["Simple weapons", "Shortswords"],
    multiclassPrereqs: { dex: 13, wis: 13 },
    subclassLevel: 3,
    spellcastingType: "none",
    asiLevels: [4, 8, 12, 16, 19],
    startingEquipmentChoices: [
      {
        id: "monk-1",
        name: "Primary Weapon",
        options: [
          { label: "Shortsword", items: [{ name: "Shortsword", category: "weapon", quantity: 1, damage: "1d6", damageType: "piercing", properties: ["finesse", "light"] }] },
          { label: "Choose Any Simple Weapon", pickFrom: "any_simple_weapon", items: [] },
        ],
      },
      {
        id: "monk-2",
        name: "Pack",
        options: [
          { label: "Dungeoneer's Pack", items: [{ name: "Dungeoneer's Pack", category: "gear", quantity: 1 }] },
          { label: "Explorer's Pack", items: [{ name: "Explorer's Pack", category: "gear", quantity: 1 }] },
          { label: "Choose Any Pack", pickFrom: "any_pack", items: [] },
        ],
      },
    ],
    fixedEquipment: [
      { name: "Dart", category: "weapon", quantity: 10, damage: "1d4", damageType: "piercing", properties: ["finesse", "thrown"], range: "20/60" },
    ],
    subclasses: [
      {
        id: "open_hand",
        name: "Way of the Open Hand",
        source: "PHB",
        description: "Masters of unarmed martial combat, knocking foes prone, shoving them across the battlefield, and mastering quivering palm.",
        features: [
          { level: 3, name: "Open Hand Technique", description: "Flurry of Blows hits can knock targets prone (DEX save), push 15 ft (STR save), or deny reactions until next turn." },
          { level: 6, name: "Wholeness of Body", description: "Action to heal yourself for 3 × monk level HP (1/long rest)." },
          { level: 11, name: "Tranquility", description: "Gain the effect of a Sanctuary spell after every long rest." },
          { level: 17, name: "Quivering Palm", description: "Spend 3 ki on a hit to set lethal vibrations; later use an action for a CON save or drop target to 0 HP (10d10 necrotic on success)." },
        ],
      },
      {
        id: "shadow",
        name: "Way of Shadow",
        source: "PHB",
        description: "Monastic ninja and shadow-dancers casting Darkness/Pass without Trace and teleporting from shadow to shadow.",
        features: [
          { level: 3, name: "Shadow Arts", description: "Gain Minor Illusion and spend 2 ki to cast Darkness, Darkvision, Pass without Trace, or Silence." },
          { level: 6, name: "Shadow Step", description: "Bonus action in dim light/darkness to teleport 60 ft to another shadow with advantage on your next melee attack." },
          { level: 11, name: "Cloak of Shadows", description: "Action to become invisible while in dim light or darkness." },
          { level: 17, name: "Opportunist", description: "Reaction to make a melee attack whenever a creature within 5 ft is hit by another attacker." },
        ],
      },
      {
        id: "four_elements",
        name: "Way of the Four Elements",
        source: "PHB",
        description: "Bends ki into elemental disciplines—whips of water, fangs of the fire snake, and elemental spells.",
        features: [
          { level: 3, name: "Disciple of the Elements", description: "Learn Elemental Attunement and elemental disciplines to channel gusts, flame, stone, and ice using ki." },
          { level: 6, name: "Extra Elemental Discipline", description: "Learn an additional elemental discipline (and more at 11th and 17th level)." },
        ],
      },
      {
        id: "drunken_master",
        name: "Way of the Drunken Master",
        source: "XGtE",
        description: "Sways and weaves unpredictably in combat—gaining free Disengage + speed during Flurry of Blows and redirecting misses.",
        bonusProficiencies: { tools: ["Brewer's supplies"], skillsCount: 1 },
        features: [
          { level: 3, name: "Bonus Proficiencies & Drunken Technique", description: "Gain Performance and brewer's supplies. Flurry of Blows grants free Disengage and +10 ft movement speed this turn." },
          { level: 6, name: "Tipsy Sway", description: "Stand from prone for 5 ft movement; spend 1 ki as a reaction when an enemy misses you in melee to redirect the attack into another foe." },
          { level: 11, name: "Drunkard's Luck", description: "Spend 2 ki to cancel disadvantage on an ability check, attack roll, or saving throw." },
          { level: 17, name: "Intoxicated Frenzy", description: "Make up to 3 additional Flurry of Blows attacks if each targets a different creature." },
        ],
      },
      {
        id: "kensei",
        name: "Way of the Kensei",
        source: "XGtE",
        description: "Treats chosen martial melee and ranged weapons like longsword or longbow as extensions of their martial arts.",
        bonusProficiencies: { tools: ["Calligrapher's supplies or Painter's supplies"] },
        features: [
          { level: 3, name: "Path of the Kensei", description: "Designate one melee and one ranged weapon as kensei weapons; gain +2 AC with Agile Parry or +1d4 damage on ranged kensei shots." },
          { level: 6, name: "One with the Blade", description: "Kensei weapons count as magical; spend 1 ki to add Martial Arts die damage with Deft Strike." },
          { level: 11, name: "Sharpen the Blade", description: "Bonus action (1–3 ki) to grant a nonmagical kensei weapon +1 to +3 bonus to attack and damage for 1 minute." },
          { level: 17, name: "Unerring Accuracy", description: "Reroll one missed monk weapon attack once on each of your turns." },
        ],
      },
      {
        id: "sun_soul",
        name: "Way of the Sun Soul",
        source: "XGtE",
        description: "Fires dazzling 30-ft Radiant Sun Bolts from range and hurls radiant Searing Sunbursts.",
        features: [
          { level: 3, name: "Radiant Sun Bolt", description: "Make ranged DEX spell attacks (30 ft) dealing Martial Arts die radiant damage; spend 1 ki to fire two bonus bolts." },
          { level: 6, name: "Searing Arc Strike", description: "Spend 2+ ki after Attacking to cast Burning Hands as a bonus action." },
          { level: 11, name: "Searing Sunburst", description: "Action to hurl a 20-ft radius radiant orb up to 150 ft (2d6 to 8d6 radiant, CON save)." },
          { level: 17, name: "Sun Shield", description: "Emit bright light and deal 5 + WIS mod radiant damage as a reaction when hit in melee." },
        ],
      },
      {
        id: "mercy",
        name: "Way of Mercy",
        source: "TCoE",
        description: "Masked wanderers manipulating life force with Hand of Healing and necrotic Hand of Harm.",
        bonusProficiencies: { tools: ["Herbalism kit"], skillsCount: 2 },
        features: [
          { level: 3, name: "Implements of Mercy, Hand of Healing & Hand of Harm", description: "Gain Insight, Medicine, and herbalism kit. Heal or deal Martial Arts die + WIS mod (plus auto-poisoned at 6th) with ki or Flurry strikes." },
          { level: 6, name: "Physician's Touch", description: "Hand of Healing cures diseases/conditions; Hand of Harm automatically inflicts Poisoned with no save." },
          { level: 11, name: "Flurry of Healing and Harm", description: "Replace Flurry unarmed strikes with Hand of Healing for free, and add Hand of Harm once per turn without extra ki." },
          { level: 17, name: "Hand of Ultimate Mercy", description: "Spend 5 ki to restore a creature that died within 24 hours to life with 4d10 + WIS mod HP." },
        ],
      },
      {
        id: "astral_self",
        name: "Way of the Astral Self",
        source: "TCoE",
        description: "Projects shimmering spectral Arms, Visage, and Body powered directly by Wisdom.",
        features: [
          { level: 3, name: "Arms of the Astral Self", description: "Spend 1 ki to summon 10-ft reach spectral arms for 10 min; use WIS for STR checks/saves and make force-damage unarmed strikes with WIS." },
          { level: 6, name: "Visage of the Astral Self", description: "Gain 120-ft magical Devil's Sight, 600-ft voice projection, and advantage on Insight/Intimidation." },
          { level: 11, name: "Body of the Astral Self", description: "Deflect elemental damage with Deflect Energy and add Martial Arts die extra force damage once per turn." },
          { level: 17, name: "Awakened Astral Self", description: "Spend 5 ki to gain +2 AC and make three unarmed strikes when using Attack action." },
        ],
      },
      {
        id: "long_death",
        name: "Way of the Long Death",
        source: "SCAG",
        description: "Students of mortality who siphon temporary hit points from dying foes and shrug off lethal blows with 1 ki.",
        features: [
          { level: 3, name: "Touch of Death", description: "Gain temporary HP equal to WIS mod + monk level whenever you reduce a creature within 5 ft to 0 HP." },
          { level: 6, name: "Hour of Reaping", description: "Action to frighten all creatures within 30 ft until the end of your next turn (WIS save)." },
          { level: 11, name: "Mastery of Death", description: "Spend 1 ki whenever you drop to 0 HP to have 1 HP instead." },
          { level: 17, name: "Touch of the Long Death", description: "Action (1–10 ki) to deal 2d10 necrotic damage per ki spent (CON save half)." },
        ],
      },
    ],
    features: [
      { level: 1, name: "Unarmored Defense (Monk) & Martial Arts", description: "AC = 10 + DEX + WIS unarmored/no shield. Use DEX for unarmed strikes & monk weapons (d4 scaling to d10) + bonus action unarmed strike." },
      { level: 2, name: "Ki & Unarmored Movement", description: "Ki points = monk level (short rest) for Flurry of Blows, Patient Defense, and Step of the Wind; +10 ft speed (up to +30 ft)." },
      { level: 3, name: "Monastic Tradition & Deflect Missiles", description: "Choose a Monastic Tradition. Reaction to reduce ranged weapon damage by 1d10 + DEX mod + monk level." },
      { level: 4, name: "Slow Fall", description: "Reaction to reduce fall damage by 5 × monk level." },
      { level: 5, name: "Extra Attack & Stunning Strike", description: "Attack twice; spend 1 ki on hit to force CON save or Stun target." },
      { level: 7, name: "Evasion & Stillness of Mind", description: "Half/0 damage on DEX saves; action to end charmed or frightened." },
      { level: 14, name: "Diamond Soul", description: "Proficiency in ALL saving throws; spend 1 ki to reroll failed saves." },
      { level: 18, name: "Empty Body", description: "Spend 4 ki for 1 min of invisibility and resistance to all damage except force." },
      { level: 20, name: "Perfect Self", description: "Regain 4 ki points when rolling initiative with 0 ki left." },
    ],
  },

  Paladin: {
    id: "paladin",
    name: "Paladin",
    hitDie: "d10",
    primaryAbility: "Strength & Charisma",
    recommendedStats: "Primary: Strength (for heavy armor & melee smites) and Charisma (for spellcasting & Aura of Protection). Secondary: Constitution (for frontline durability).",
    savingThrows: ["wis", "cha"],
    armorProficiencies: ["All armor", "Shields"],
    weaponProficiencies: ["Simple weapons", "Martial weapons"],
    toolProficiencies: [],
    startingGoldFormula: "5d4 × 10 gp",
    startingGoldAvg: 125,
    skillChoices: { count: 2, availableSkills: ["athletics", "insight", "intimidation", "medicine", "persuasion", "religion"] },
    multiclassGains: ["Light armor", "Medium armor", "Shields", "Simple weapons", "Martial weapons"],
    multiclassPrereqs: { str: 13, cha: 13 },
    subclassLevel: 3,
    spellcastingType: "half",
    spellcastingAbility: "cha",
    asiLevels: [4, 8, 12, 16, 19],
    startingEquipmentChoices: [
      {
        id: "paladin-1",
        name: "Martial Weapon(s)",
        options: [
          { label: "Martial Weapon + Shield (Choose Weapon)", pickFrom: "any_martial_weapon", items: [{ name: "Shield", category: "shield", quantity: 1, baseAc: 2 }] },
          { label: "Two Martial Weapons (Choose Weapons)", pickFrom: "any_martial_weapon", pickCount: 2, items: [] },
        ],
      },
      {
        id: "paladin-2",
        name: "Secondary Weapon",
        options: [
          { label: "Five Javelins", items: [{ name: "Javelin", category: "weapon", quantity: 5, damage: "1d6", damageType: "piercing", properties: ["thrown"], range: "30/120" }] },
          { label: "Choose Any Simple Melee Weapon", pickFrom: "any_simple_melee", items: [] },
        ],
      },
      {
        id: "paladin-3",
        name: "Pack",
        options: [
          { label: "Priest's Pack", items: [{ name: "Priest's Pack", category: "gear", quantity: 1 }] },
          { label: "Explorer's Pack", items: [{ name: "Explorer's Pack", category: "gear", quantity: 1 }] },
          { label: "Choose Any Pack", pickFrom: "any_pack", items: [] },
        ],
      },
    ],
    fixedEquipment: [
      { name: "Chain Mail", category: "armor", armorCategory: "heavy", quantity: 1, baseAc: 16 },
      { name: "Holy Symbol (Amulet)", category: "gear", quantity: 1 },
    ],
    subclasses: [
      {
        id: "devotion",
        name: "Oath of Devotion",
        source: "PHB",
        description: "The classic shining knight, upholding truth, courage, and immunity to charm.",
        features: [
          { level: 3, name: "Channel Divinity: Sacred Weapon & Turn the Unholy", description: "Action to add CHA mod to weapon attack rolls and emit bright light for 1 min; or turn fiends/undead." },
          { level: 7, name: "Aura of Devotion", description: "You and allies within 10 ft (30 ft at 18th) cannot be charmed." },
          { level: 15, name: "Purity of Spirit", description: "Always under the effects of Protection from Evil and Good." },
          { level: 20, name: "Holy Nimbus", description: "Action to radiate 30 ft of bright sunlight dealing 10 radiant damage per turn for 1 minute." },
        ],
      },
      {
        id: "ancients",
        name: "Oath of the Ancients",
        source: "PHB",
        description: "Fey-touched Wardens who protect the light of beauty and shelter the party with spell-damage resistance.",
        features: [
          { level: 3, name: "Channel Divinity: Nature's Wrath & Turn the Faithless", description: "Restrain an enemy with spectral vines; or turn fey and fiends within 30 ft." },
          { level: 7, name: "Aura of Warding", description: "You and friendly creatures within 10 ft (30 ft at 18th) have resistance to damage from all spells!" },
          { level: 15, name: "Undying Sentinel", description: "Drop to 1 HP instead of 0 HP once per long rest, and suffer no aging drawbacks." },
          { level: 20, name: "Elder Champion", description: "Regain 10 HP per turn and cast paladin spells as bonus actions for 1 minute." },
        ],
      },
      {
        id: "vengeance",
        name: "Oath of Vengeance",
        source: "PHB",
        description: "Relentless avengers swearing Vow of Enmity for on-demand advantage against bosses.",
        features: [
          { level: 3, name: "Channel Divinity: Vow of Enmity & Abjure Enemy", description: "Bonus action for advantage on all attack rolls against one foe within 10 ft for 1 min; or frighten and halve speed." },
          { level: 7, name: "Relentless Avenger", description: "Move up to half your speed without opportunity attacks when hitting with an opportunity attack." },
          { level: 15, name: "Soul of Vengeance", description: "Reaction to make a melee attack whenever your Vow of Enmity target makes an attack." },
          { level: 20, name: "Avenging Angel", description: "Gain 60-ft fly speed and a 30-ft menacing aura for 1 hour." },
        ],
      },
      {
        id: "conquest",
        name: "Oath of Conquest",
        source: "XGtE",
        description: "Iron-fisted warlords who shatter foes' morale—pinning frightened enemies at 0 speed inside Aura of Conquest.",
        features: [
          { level: 3, name: "Channel Divinity: Conquering Presence & Guided Strike", description: "Frighten foes in 30 ft; or add +10 to a melee attack roll." },
          { level: 7, name: "Aura of Conquest", description: "Frightened enemies within 10 ft have 0 speed and take half paladin level psychic damage each turn." },
          { level: 15, name: "Scornful Rebuke", description: "Attackers hitting you take psychic damage equal to your CHA mod." },
          { level: 20, name: "Invincible Conqueror", description: "Gain resistance to all damage, an extra Attack, and critical hits on 19–20 for 1 minute." },
        ],
      },
      {
        id: "redemption",
        name: "Oath of Redemption",
        source: "XGtE",
        description: "Pacifist guardians who absorb damage on allies' behalf and punish violent aggressors with Rebuke the Violent.",
        features: [
          { level: 3, name: "Channel Divinity: Emissary of Peace & Rebuke the Violent", description: "Gain +5 Persuasion for 10 min; or reaction to deal an attacker's own damage back to them as radiant." },
          { level: 7, name: "Aura of the Guardian", description: "Reaction to magically take any damage meant for an ally within 10 ft." },
          { level: 15, name: "Protective Spirit", description: "Regain 1d6 + half paladin level HP each turn while below half HP." },
          { level: 20, name: "Emissary of Redemption", description: "Gain resistance to all damage and deal half damage back to attackers when you refrain from attacking." },
        ],
      },
      {
        id: "glory",
        name: "Oath of Glory",
        source: "TCoE",
        description: "Heroic athletes performing feats of legend, boosting party movement speed and distributing Glorious Defense.",
        features: [
          { level: 3, name: "Channel Divinity: Peerless Athlete & Inspiring Smite", description: "Double jump distance & carry capacity + Athletics/Acrobatics adv; or distribute 2d8 + paladin level temp HP after a Divine Smite." },
          { level: 7, name: "Aura of Alacrity", description: "Walking speed increases by 10 ft for you and allies starting their turn within 5 ft (10 ft at 18th)." },
          { level: 15, name: "Glorious Defense", description: "Reaction to add CHA mod to AC of a creature hit within 10 ft and counterattack if the attack misses." },
          { level: 20, name: "Living Legend", description: "Gain CHA check advantage, auto-hit one miss per turn, and reroll failed saves for 1 minute." },
        ],
      },
      {
        id: "watchers",
        name: "Oath of the Watchers",
        source: "TCoE",
        description: "Sentinels against extraplanar incursions who grant mental save advantage and initiative boosts to the whole party.",
        features: [
          { level: 3, name: "Channel Divinity: Watcher's Will & Abjure the Extraplanar", description: "Grant INT/WIS/CHA save advantage to CHA mod creatures for 1 min; or turn aberrations, celestials, elementals, fey, and fiends." },
          { level: 7, name: "Aura of the Sentinel", description: "You and friendly creatures within 10 ft add your Proficiency Bonus to initiative rolls." },
          { level: 15, name: "Vigilant Rebuke", description: "Reaction to deal 2d8 + CHA mod force damage when someone succeeds on an INT/WIS/CHA save." },
          { level: 20, name: "Mortal Bulwark", description: "Gain 120-ft truesight, advantage against extraplanar foes, and banishment on melee hits." },
        ],
      },
      {
        id: "crown",
        name: "Oath of the Crown",
        source: "SCAG",
        description: "Sworn champions of civilization, law, and sovereigns who lock foes in place and intercept fatal hits.",
        features: [
          { level: 3, name: "Channel Divinity: Champion Challenge & Turn the Tide", description: "Compel enemies within 30 ft not to move beyond 30 ft of you; or heal injured allies 1d6 + CHA mod." },
          { level: 7, name: "Divine Allegiance", description: "Reaction to absorb damage dealt to a creature within 5 ft." },
          { level: 15, name: "Unyielding Spirit", description: "Advantage on saving throws against being paralyzed or stunned." },
          { level: 20, name: "Exalted Champion", description: "1 hour of nonmagical BPS resistance plus Wisdom/Death save advantage for allies." },
        ],
      },
      {
        id: "oathbreaker",
        name: "Oathbreaker",
        source: "DMG",
        description: "Fallen paladins commanding undead servants and projecting Aura of Hate to empower fiends and undead.",
        features: [
          { level: 3, name: "Channel Divinity: Control Undead & Dreadful Aspect", description: "Command an undead creature for 24 hours; or frighten foes within 30 ft." },
          { level: 7, name: "Aura of Hate", description: "Add your CHA modifier to melee weapon damage rolls for you and fiends/undead within 10 ft." },
          { level: 15, name: "Supernatural Resistance", description: "Resistance to nonmagical bludgeoning, piercing, and slashing damage." },
          { level: 20, name: "Dread Lord", description: "30-ft aura of gloom dealing 4d10 psychic damage and bonus shadow strikes." },
        ],
      },
    ],
    features: [
      { level: 1, name: "Divine Sense & Lay on Hands", description: "Detect celestials/fiends/undead within 60 ft; healing pool of 5 × paladin level HP (also cures disease/poison for 5 HP)." },
      { level: 2, name: "Fighting Style, Spellcasting & Divine Smite", description: "Choose a Fighting Style and cast CHA spells. Burn spell slots on melee hits for 2d8 (+1d8 per slot above 1st, +1d8 vs fiend/undead) radiant damage." },
      { level: 3, name: "Divine Health & Sacred Oath", description: "Immune to disease and swear a Sacred Oath." },
      { level: 5, name: "Extra Attack", description: "Attack twice whenever taking the Attack action." },
      { level: 6, name: "Aura of Protection", description: "You and friendly creatures within 10 ft add your CHA modifier (min +1) to ALL saving throws (30 ft at 18th)." },
      { level: 10, name: "Aura of Courage", description: "You and allies within 10 ft cannot be frightened while you are conscious." },
      { level: 11, name: "Improved Divine Smite", description: "All melee weapon hits deal an automatic +1d8 radiant damage." },
      { level: 14, name: "Cleansing Touch", description: "Action to end one spell on yourself or a willing creature (CHA mod/long rest)." },
    ],
  },

  Ranger: {
    id: "ranger",
    name: "Ranger",
    hitDie: "d10",
    primaryAbility: "Dexterity & Wisdom",
    recommendedStats: "Primary: Dexterity (for stealth, archery, or dual-wielding) and Wisdom (for nature spells & tracking). Secondary: Constitution (for survival & HP).",
    savingThrows: ["str", "dex"],
    armorProficiencies: ["Light armor", "Medium armor", "Shields"],
    weaponProficiencies: ["Simple weapons", "Martial weapons"],
    toolProficiencies: [],
    startingGoldFormula: "5d4 × 10 gp",
    startingGoldAvg: 125,
    skillChoices: { count: 3, availableSkills: ["animalHandling", "athletics", "insight", "investigation", "nature", "perception", "stealth", "survival"] },
    multiclassGains: ["Light armor", "Medium armor", "Shields", "Simple weapons", "Martial weapons", "One skill from Ranger list"],
    multiclassPrereqs: { dex: 13, wis: 13 },
    subclassLevel: 3,
    spellcastingType: "half",
    spellcastingAbility: "wis",
    asiLevels: [4, 8, 12, 16, 19],
    startingEquipmentChoices: [
      {
        id: "ranger-1",
        name: "Armor",
        options: [
          { label: "Scale Mail (Medium, AC 14 + DEX max 2)", items: [{ name: "Scale Mail", category: "armor", armorCategory: "medium", quantity: 1, baseAc: 14, maxDexMod: 2 }] },
          { label: "Leather Armor (Light, AC 11 + DEX)", items: [{ name: "Leather Armor", category: "armor", armorCategory: "light", quantity: 1, baseAc: 11 }] },
        ],
      },
      {
        id: "ranger-2",
        name: "Melee Weapons",
        options: [
          { label: "Two Shortswords", items: [{ name: "Shortsword", category: "weapon", quantity: 2, damage: "1d6", damageType: "piercing", properties: ["finesse", "light"] }] },
          { label: "Two Simple Melee Weapons (Choose Weapons)", pickFrom: "any_simple_melee", pickCount: 2, items: [] },
        ],
      },
      {
        id: "ranger-3",
        name: "Pack",
        options: [
          { label: "Dungeoneer's Pack", items: [{ name: "Dungeoneer's Pack", category: "gear", quantity: 1 }] },
          { label: "Explorer's Pack", items: [{ name: "Explorer's Pack", category: "gear", quantity: 1 }] },
          { label: "Choose Any Pack", pickFrom: "any_pack", items: [] },
        ],
      },
    ],
    fixedEquipment: [
      { name: "Longbow", category: "weapon", quantity: 1, damage: "1d8", damageType: "piercing", properties: ["ammunition", "heavy", "two-handed"], range: "150/600" },
      { name: "Arrows (20)", category: "gear", quantity: 20 },
    ],
    subclasses: [
      {
        id: "hunter",
        name: "Hunter",
        source: "PHB",
        description: "Versatile wilderness slayer choosing Colossus Slayer, Multiattack Defense, and Volley/Whirlwind strikes.",
        features: [
          { level: 3, name: "Hunter's Prey (Colossus Slayer / Giant Killer / Horde Breaker)", description: "Colossus Slayer adds +1d8 damage once per turn against an injured creature (or Horde Breaker / Giant Killer)." },
          { level: 7, name: "Defensive Tactics", description: "Choose Escape the Horde, Multiattack Defense (+4 AC after being hit), or Steel Will." },
          { level: 11, name: "Multiattack (Volley / Whirlwind Attack)", description: "Attack every creature in a 10-ft radius point (ranged) or within 5 ft (melee)." },
          { level: 15, name: "Superior Hunter's Defense", description: "Choose Evasion or Uncanny Dodge." },
        ],
      },
      {
        id: "beast_master",
        name: "Beast Master",
        source: "PHB",
        description: "Bonds with a loyal Beast of the Land, Sea, or Sky (or CR 1/4 beast) that fights seamlessly beside you.",
        hasCompanion: true,
        companionType: "beast",
        features: [
          { level: 3, name: "Ranger's Companion / Primal Companion", description: "Bond with a Primal Companion or CR 1/4 beast that adds your proficiency bonus to AC, attacks, damage, saves, and skills." },
          { level: 7, name: "Exceptional Training", description: "Command your companion to Dash, Disengage, or Help as a bonus action; its attacks count as magical." },
          { level: 11, name: "Bestial Fury", description: "Your beast companion makes two attacks when commanded to Attack." },
          { level: 15, name: "Share Spells", description: "Spells you cast targeting yourself also affect your beast within 30 ft." },
        ],
      },
      {
        id: "gloom_stalker",
        name: "Gloom Stalker",
        source: "XGtE",
        description: "Deadly ambushers invisible to darkvision who gain +WIS initiative and a bonus first-round Dread Ambusher strike.",
        features: [
          { level: 3, name: "Dread Ambusher & Umbral Sight", description: "Add WIS mod to initiative; on round 1 gain +10 ft speed and an extra weapon attack dealing +1d8 damage. Gain darkvision and invisibility to enemy darkvision in darkness." },
          { level: 7, name: "Iron Mind", description: "Gain proficiency in Wisdom saving throws." },
          { level: 11, name: "Stalker's Flurry", description: "Once per turn when you miss a weapon attack, make another weapon attack." },
          { level: 15, name: "Shadowy Dodge", description: "Reaction to impose disadvantage on an attack roll targeting you." },
        ],
      },
      {
        id: "horizon_walker",
        name: "Horizon Walker",
        source: "XGtE",
        description: "Planar guardians converting weapon strikes to force damage and blinking 10 ft between Distant Strikes.",
        features: [
          { level: 3, name: "Detect Portal & Planar Warrior", description: "Sense planar portals within 1 mile. Bonus action to make next hit all force damage + 1d8 extra (2d8 at 11th)." },
          { level: 7, name: "Ethereal Step", description: "Bonus action to cast Etherealness until end of turn (1/short rest)." },
          { level: 11, name: "Distant Strike", description: "Teleport 10 ft before each attack; attack a third different creature if attacking two distinct targets." },
          { level: 15, name: "Spectral Defense", description: "Reaction to gain resistance against an attack's damage." },
        ],
      },
      {
        id: "monster_slayer",
        name: "Monster Slayer",
        source: "XGtE",
        description: "Bane of supernatural fiends and spellcasters—exposing weaknesses and countering teleports and spells.",
        features: [
          { level: 3, name: "Hunter's Sense & Slayer's Prey", description: "Learn a target's immunities, resistances, and vulnerabilities; bonus action to add +1d6 damage once per turn to your quarry." },
          { level: 7, name: "Supernatural Defense", description: "Add +1d6 to saves and grapple escapes forced by your Slayer's Prey." },
          { level: 11, name: "Magic-User's Nemesis", description: "Reaction to thwart a spellcast or teleport within 60 ft." },
          { level: 15, name: "Slayer's Counter", description: "When your quarry forces a saving throw, reaction to attack it—if you hit, you automatically succeed on the save." },
        ],
      },
      {
        id: "fey_wanderer",
        name: "Fey Wanderer",
        source: "TCoE",
        description: "Infused with Feywild mirth and dread—adding psychic strikes and Wisdom bonus to every Charisma check.",
        features: [
          { level: 3, name: "Dreadful Strikes & Otherworldly Glamour", description: "Deal +1d4 psychic damage (+1d6 at 11th) once per turn per target; add WIS modifier to all Charisma checks + Deception/Performance/Persuasion proficiency." },
          { level: 7, name: "Beguiling Twist", description: "Advantage on charmed/frightened saves; reaction when a creature saves to bounce the condition to another foe." },
          { level: 11, name: "Fey Reinforcements", description: "Cast Summon Fey without material components and free once per long rest." },
          { level: 15, name: "Misty Wanderer", description: "Cast Misty Step WIS mod times per long rest without a slot and bring an ally." },
        ],
      },
      {
        id: "swarmkeeper",
        name: "Swarmkeeper",
        source: "TCoE",
        description: "Aided by a swirling swarm of nature spirits that lift you, shove foes 15 ft, or deal piercing damage.",
        features: [
          { level: 3, name: "Gathered Swarm", description: "Once per turn on a weapon hit, choose: +1d6 piercing damage, move target 15 ft (STR save), or move yourself 5 ft horizontally." },
          { level: 7, name: "Writhing Tide", description: "Bonus action to gain a 10-ft hovering fly speed for 1 minute (PB/long rest)." },
          { level: 11, name: "Mighty Swarm", description: "Swarm damage increases to 1d8, push knocks prone, and self-move grants half cover." },
          { level: 15, name: "Swarming Dispersal", description: "Reaction when taking damage to halve it and teleport 30 ft." },
        ],
      },
      {
        id: "drakewarden",
        name: "Drakewarden",
        source: "FToD",
        description: "Bonds with a elemental Drake companion that grows from Small to Large mount with elemental breath.",
        hasCompanion: true,
        companionType: "beast",
        features: [
          { level: 3, name: "Draconic Gift & Drake Companion", description: "Know Draconic & Thaumaturgy; summon a customizable elemental Drake (Acid, Cold, Fire, Lightning, or Poison) using a bonus action to command and reaction for +1d6 Infused Strikes." },
          { level: 7, name: "Bond of Fang and Scale", description: "Drake becomes Medium (can be ridden), gains fly or swim speed, resistance matching essence, and +1d6 bite damage." },
          { level: 11, name: "Drake's Breath", description: "Action for you or your Drake to exhale an 8d6 elemental 30-ft cone (10d6 at 15th)." },
          { level: 15, name: "Perfected Bond", description: "Drake grows Large (flying mount) and grants reaction resistance to damage." },
        ],
      },
    ],
    features: [
      { level: 1, name: "Favored Enemy & Natural Explorer (or Deft Explorer)", description: "Tracking/survival mastery in chosen terrain & foes (or Tasha's Canny Expertise + 2 languages)." },
      { level: 2, name: "Fighting Style & Spellcasting", description: "Choose Archery (+2), Defense, Dueling, Druidic Warrior, or Two-Weapon Fighting, and cast WIS spells." },
      { level: 3, name: "Ranger Archetype & Primeval Awareness", description: "Choose an archetype and sense aberrations, celestials, dragons, elementals, fey, fiends, and undead." },
      { level: 5, name: "Extra Attack", description: "Attack twice whenever taking the Attack action." },
      { level: 8, name: "Land's Stride", description: "Move through nonmagical difficult terrain with no extra cost." },
      { level: 10, name: "Hide in Plain Sight (or Nature's Veil)", description: "Camouflage for +10 Stealth or turn invisible until next turn as a bonus action." },
      { level: 14, name: "Vanish", description: "Hide as a bonus action and leave no nonmagical tracks." },
      { level: 18, name: "Feral Senses", description: "Ignore unseen-target disadvantage and sense invisible creatures within 30 ft." },
      { level: 20, name: "Foe Slayer", description: "Add WIS modifier to attack or damage roll once per turn against a favored enemy." },
    ],
  },

  Rogue: {
    id: "rogue",
    name: "Rogue",
    hitDie: "d8",
    primaryAbility: "Dexterity",
    recommendedStats: "Primary: Dexterity (for Sneak Attack, Stealth, Sleight of Hand, & AC). Secondary: Charisma (for deception/persuasion/swashbuckling) or Intelligence (for traps & Arcane Trickster spells).",
    savingThrows: ["dex", "int"],
    armorProficiencies: ["Light armor"],
    weaponProficiencies: ["Simple weapons", "Hand crossbows", "Longswords", "Rapiers", "Shortswords"],
    toolProficiencies: ["Thieves' tools"],
    startingGoldFormula: "4d4 × 10 gp",
    startingGoldAvg: 100,
    expertiseLevels: [1, 6],
    skillChoices: { count: 4, availableSkills: ["acrobatics", "athletics", "deception", "insight", "intimidation", "investigation", "perception", "performance", "persuasion", "sleightOfHand", "stealth"] },
    multiclassGains: ["Light armor", "One skill from Rogue list", "Thieves' tools"],
    multiclassPrereqs: { dex: 13 },
    subclassLevel: 3,
    spellcastingType: "none",
    asiLevels: [4, 8, 10, 12, 16, 19],
    startingEquipmentChoices: [
      {
        id: "rogue-1",
        name: "Primary Weapon",
        options: [
          { label: "Rapier", items: [{ name: "Rapier", category: "weapon", quantity: 1, damage: "1d8", damageType: "piercing", properties: ["finesse"] }] },
          { label: "Shortsword", items: [{ name: "Shortsword", category: "weapon", quantity: 1, damage: "1d6", damageType: "piercing", properties: ["finesse", "light"] }] },
        ],
      },
      {
        id: "rogue-2",
        name: "Secondary Weapon",
        options: [
          { label: "Shortbow & 20 Arrows", items: [{ name: "Shortbow", category: "weapon", quantity: 1, damage: "1d6", damageType: "piercing", properties: ["two-handed", "ammunition"], range: "80/320" }, { name: "Arrows (20)", category: "gear", quantity: 20 }] },
          { label: "Shortsword", items: [{ name: "Shortsword", category: "weapon", quantity: 1, damage: "1d6", damageType: "piercing", properties: ["finesse", "light"] }] },
        ],
      },
      {
        id: "rogue-3",
        name: "Pack",
        options: [
          { label: "Burglar's Pack", items: [{ name: "Burglar's Pack", category: "gear", quantity: 1 }] },
          { label: "Dungeoneer's Pack", items: [{ name: "Dungeoneer's Pack", category: "gear", quantity: 1 }] },
          { label: "Explorer's Pack", items: [{ name: "Explorer's Pack", category: "gear", quantity: 1 }] },
          { label: "Choose Any Pack", pickFrom: "any_pack", items: [] },
        ],
      },
    ],
    fixedEquipment: [
      { name: "Leather Armor", category: "armor", armorCategory: "light", quantity: 1, baseAc: 11 },
      { name: "Dagger", category: "weapon", quantity: 2, damage: "1d4", damageType: "piercing", properties: ["finesse", "light", "thrown"], range: "20/60" },
      { name: "Thieves' Tools", category: "tool", quantity: 1 },
    ],
    subclasses: [
      {
        id: "thief",
        name: "Thief",
        source: "PHB",
        description: "Acrobatic burglars using bonus-action Fast Hands, effortless climbing, and Use Magic Device.",
        features: [
          { level: 3, name: "Fast Hands & Second-Story Work", description: "Use Cunning Action for Sleight of Hand, Thieves' Tools, or Use an Object. Climbing costs no extra movement." },
          { level: 9, name: "Supreme Sneak", description: "Advantage on Stealth checks if moving no more than half speed." },
          { level: 13, name: "Use Magic Device", description: "Ignore all class, race, and level requirements on magic items." },
          { level: 17, name: "Thief's Reflexes", description: "Take two full turns during the first round of any combat." },
        ],
      },
      {
        id: "assassin",
        name: "Assassin",
        source: "PHB",
        description: "Master of poison, infiltration, and devastating automatic critical hits against surprised foes.",
        bonusProficiencies: { tools: ["Disguise kit", "Poisoner's kit"] },
        features: [
          { level: 3, name: "Assassinate & Bonus Proficiencies", description: "Gain Disguise Kit & Poisoner's Kit. Advantage against creatures that haven't acted yet; hits on surprised creatures are automatic critical hits." },
          { level: 9, name: "Infiltration Expertise", description: "Spend 7 days and 25 gp to establish an unassailable false identity." },
          { level: 13, name: "Impostor", description: "Unerringly mimic another creature's speech, writing, and behavior." },
          { level: 17, name: "Death Strike", description: "Surprised victims must pass a CON save or suffer doubled damage from your strike." },
        ],
      },
      {
        id: "arcane_trickster",
        name: "Arcane Trickster",
        source: "PHB",
        description: "Blends rogue stealth and invisible Mage Hand legerdemain with enchantment and illusion wizard spells (1/3 caster).",
        features: [
          { level: 3, name: "Spellcasting & Mage Hand Legerdemain", description: "Cast wizard Enchantment/Illusion spells using INT. Invisible Mage Hand picks pockets, disarms traps, and opens locks at 30 ft." },
          { level: 9, name: "Magical Ambush", description: "If hidden when casting a spell, targets have disadvantage on saves against it." },
          { level: 13, name: "Versatile Trickster", description: "Bonus action to distract a creature with Mage Hand for Sneak Attack advantage." },
          { level: 17, name: "Spell Thief", description: "Reaction to negate and steal a spell cast at you." },
        ],
      },
      {
        id: "inquisitive",
        name: "Inquisitive",
        source: "XGtE",
        description: "Sharp-eyed detectives who spot lies effortlessly and trigger Sneak Attack via Insightful Fighting.",
        features: [
          { level: 3, name: "Ear for Deceit, Eye for Detail & Insightful Fighting", description: "Min 8 roll on Insight to detect lies. Bonus action Insight vs Deception to gain Sneak Attack without advantage for 1 minute." },
          { level: 9, name: "Steady Eye", description: "Advantage on Perception and Investigation if moving no more than half speed." },
          { level: 13, name: "Unerring Eye", description: "Sense illusions, shapeshifters, and magic deceptions within 30 ft." },
          { level: 17, name: "Eye for Weakness", description: "Add +3d6 extra Sneak Attack damage against Insightful Fighting targets." },
        ],
      },
      {
        id: "mastermind",
        name: "Mastermind",
        source: "XGtE",
        description: "Tacticians and intriguers who grant allies advantage from 30 ft away using the Help action as a bonus action.",
        bonusProficiencies: { tools: ["Disguise kit", "Forgery kit", "One gaming set"] },
        features: [
          { level: 3, name: "Master of Intrigue & Master of Tactics", description: "Gain Disguise/Forgery kits & 2 languages. Use the Help action as a bonus action from 30 ft away!" },
          { level: 9, name: "Insightful Manipulator", description: "Study a creature for 1 minute to gauge INT/WIS/CHA or class levels." },
          { level: 13, name: "Misdirection", description: "Reaction to redirect an incoming attack to a creature providing you cover." },
          { level: 17, name: "Soul of Deceit", description: "Mind cannot be read; project false thoughts and auto-pass Deception vs Insight." },
        ],
      },
      {
        id: "scout",
        name: "Scout",
        source: "XGtE",
        description: "Skirmishing wilderness trackers with free Nature & Survival Expertise and reaction disengages.",
        bonusProficiencies: { skillsCount: 2 },
        features: [
          { level: 3, name: "Skirmisher & Survivalist", description: "Gain Nature & Survival proficiency + doubled bonus! Reaction to move half speed away without opportunity attacks when a foe ends its turn within 5 ft." },
          { level: 9, name: "Superior Mobility", description: "Walking speed increases by 10 ft." },
          { level: 13, name: "Ambush Master", description: "Advantage on initiative; first target hit grants allies advantage against it until your next turn." },
          { level: 17, name: "Sudden Strike", description: "Make an extra bonus action attack with full Sneak Attack against a second target." },
        ],
      },
      {
        id: "swashbuckler",
        name: "Swashbuckler",
        source: "XGtE",
        description: "Dashing duelists adding Charisma to initiative, slipping past foes freely, and Sneak Attacking 1-on-1.",
        features: [
          { level: 3, name: "Fancy Footwork & Rakish Audacity", description: "Targets you melee attack can't make opportunity attacks against you. Add CHA mod to initiative, and trigger Sneak Attack in 1v1 duels." },
          { level: 9, name: "Panache", description: "Persuasion check to goad hostile foes or charm friendly NPCs." },
          { level: 13, name: "Elegant Maneuver", description: "Bonus action to gain advantage on your next Acrobatics or Athletics check." },
          { level: 17, name: "Master Duelist", description: "Reroll a missed attack roll with advantage (1/short or long rest)." },
        ],
      },
      {
        id: "phantom",
        name: "Phantom",
        source: "TCoE",
        description: "Walks the line of death—borrowing phantom proficiencies, arcing Wails from the Grave, and trapping Soul Trinkets.",
        features: [
          { level: 3, name: "Whispers of the Dead & Wails from the Grave", description: "Gain any floating skill/tool proficiency after each rest. Deal half Sneak Attack dice necrotic damage to a second creature within 30 ft (PB/long rest)." },
          { level: 9, name: "Tokens of the Departed", description: "Reaction when a creature dies within 30 ft to capture a Soul Trinket granting death save advantage, questions, or free Wails." },
          { level: 13, name: "Ghost Walk", description: "Bonus action to become spectral with 10-ft fly speed and disadvantage on attacks against you." },
          { level: 17, name: "Death's Friend", description: "Wails from the Grave also damages your primary target." },
        ],
      },
      {
        id: "soulknife",
        name: "Soulknife",
        source: "TCoE",
        description: "Summons shimmering 1d6/1d4 psychic blades directly from thought and links party minds telepathically.",
        features: [
          { level: 3, name: "Psionic Power & Psychic Blades", description: "Pool of Psionic Energy Dice (2 × PB) for Psi-Bolstered Knack (+1d6+ on failed proficient checks) and telepathy. Conjure thrown/melee 1d6 psychic blades (plus 1d4 bonus attack)." },
          { level: 9, name: "Soul Blades", description: "Homing Strikes adds Psi die to missed blade attacks; Psychic Teleportation throws a blade to teleport." },
          { level: 13, name: "Psychic Veil", description: "Action to turn invisible for 1 hour." },
          { level: 17, name: "Rend Mind", description: "Stun a target for 1 minute when hitting with Psychic Blades." },
        ],
      },
    ],
    features: [
      { level: 1, name: "Expertise (2 skills), Sneak Attack (1d6) & Thieves' Cant", description: "Double proficiency for 2 skills/tools. Deal +1d6 Sneak Attack (scaling to 10d6 at 19th) once/turn with finesse or ranged weapons." },
      { level: 2, name: "Cunning Action", description: "Bonus action to Dash, Disengage, or Hide every turn." },
      { level: 3, name: "Roguish Archetype", description: "Choose an archetype that defines your roguish craft." },
      { level: 5, name: "Uncanny Dodge", description: "Reaction to halve damage from an attacker you can see." },
      { level: 6, name: "Expertise (2 more skills)", description: "Double proficiency for two more skills or thieves' tools." },
      { level: 7, name: "Evasion", description: "Take 0 damage on successful DEX saves and half on failures." },
      { level: 11, name: "Reliable Talent", description: "Treat any d20 roll of 9 or lower as 10 on proficient ability checks." },
      { level: 14, name: "Blindsense", description: "Sense invisible or hidden creatures within 10 ft if able to hear." },
      { level: 15, name: "Slippery Mind", description: "Gain proficiency in Wisdom saving throws." },
      { level: 18, name: "Elusive", description: "No attack roll can have advantage against you while not incapacitated." },
      { level: 20, name: "Stroke of Luck", description: "Turn a missed attack into a hit or treat a failed check as a 20 (1/short rest)." },
    ],
  },

  Sorcerer: {
    id: "sorcerer",
    name: "Sorcerer",
    hitDie: "d6",
    primaryAbility: "Charisma",
    recommendedStats: "Primary: Charisma (for spell attacks & save DC). Secondary: Constitution (for HP & concentration) and Dexterity (for armor-less AC).",
    savingThrows: ["con", "cha"],
    armorProficiencies: [],
    weaponProficiencies: ["Daggers", "Darts", "Slings", "Quarterstaffs", "Light crossbows"],
    toolProficiencies: [],
    startingGoldFormula: "3d4 × 10 gp",
    startingGoldAvg: 75,
    skillChoices: { count: 2, availableSkills: ["arcana", "deception", "insight", "intimidation", "persuasion", "religion"] },
    multiclassGains: [],
    multiclassPrereqs: { cha: 13 },
    subclassLevel: 1,
    spellcastingType: "full",
    spellcastingAbility: "cha",
    asiLevels: [4, 8, 12, 16, 19],
    startingEquipmentChoices: [
      {
        id: "sorc-1",
        name: "Weapon",
        options: [
          { label: "Light Crossbow & 20 Bolts", items: [{ name: "Light Crossbow", category: "weapon", quantity: 1, damage: "1d8", damageType: "piercing", properties: ["ammunition", "loading", "two-handed"], range: "80/320" }, { name: "Crossbow Bolts (20)", category: "gear", quantity: 20 }] },
          { label: "Choose Any Simple Weapon", pickFrom: "any_simple_weapon", items: [] },
        ],
      },
      {
        id: "sorc-2",
        name: "Spellcasting Focus",
        options: [
          { label: "Component Pouch", items: [{ name: "Component Pouch", category: "gear", quantity: 1 }] },
          { label: "Arcane Focus (Wand)", items: [{ name: "Arcane Focus (Wand)", category: "gear", quantity: 1 }] },
        ],
      },
      {
        id: "sorc-3",
        name: "Pack",
        options: [
          { label: "Dungeoneer's Pack", items: [{ name: "Dungeoneer's Pack", category: "gear", quantity: 1 }] },
          { label: "Explorer's Pack", items: [{ name: "Explorer's Pack", category: "gear", quantity: 1 }] },
          { label: "Choose Any Pack", pickFrom: "any_pack", items: [] },
        ],
      },
    ],
    fixedEquipment: [
      { name: "Dagger", category: "weapon", quantity: 2, damage: "1d4", damageType: "piercing", properties: ["finesse", "light", "thrown"], range: "20/60" },
    ],
    subclasses: [
      {
        id: "draconic",
        name: "Draconic Bloodline",
        source: "PHB",
        description: "Draconic scales grant natural 13 + DEX AC, bonus +1 HP per level, and amplified elemental spell damage.",
        features: [
          { level: 1, name: "Dragon Ancestor & Draconic Resilience", description: "Speak Draconic, +1 max HP per sorcerer level, and natural unarmored AC of 13 + DEX mod." },
          { level: 6, name: "Elemental Affinity", description: "Add CHA mod to damage of spells matching your dragon element; spend 1 sorcery point for resistance." },
          { level: 14, name: "Dragon Wings", description: "Bonus action to sprout wings gaining a flying speed equal to your walking speed." },
          { level: 18, name: "Draconic Presence", description: "Spend 5 sorcery points for a 60-ft aura of awe or fear for 1 minute." },
        ],
      },
      {
        id: "wild_magic",
        name: "Wild Magic",
        source: "PHB",
        description: "Taps raw chaotic magic with Tides of Chaos advantage and Bend Luck d4 fate twists.",
        features: [
          { level: 1, name: "Wild Magic Surge & Tides of Chaos", description: "Spells can trigger chaotic Wild Magic Surges. Gain advantage on one attack, check, or save per long rest (or Surge)." },
          { level: 6, name: "Bend Luck", description: "Reaction spending 2 sorcery points to add or subtract 1d4 from another creature's roll." },
          { level: 14, name: "Controlled Chaos", description: "Roll twice on the Wild Magic Surge table and choose either result." },
          { level: 18, name: "Spell Bombardment", description: "Roll an extra die when a spell's damage die rolls its maximum value." },
        ],
      },
      {
        id: "divine_soul",
        name: "Divine Soul",
        source: "XGtE",
        description: "Carries a spark of celestial power—unlocking the ENTIRE Cleric spell list alongside Sorcerer Metamagic.",
        features: [
          { level: 1, name: "Divine Magic & Favored by the Gods", description: "Learn Cleric AND Sorcerer spells! Add +2d4 to a failed saving throw or missed attack (1/short rest)." },
          { level: 6, name: "Empowered Healing", description: "Spend 1 sorcery point to reroll any healing dice rolled by you or an ally within 5 ft." },
          { level: 14, name: "Otherworldly Wings", description: "Bonus action to sprout spectral wings for a 30-ft fly speed." },
          { level: 18, name: "Unearthly Recovery", description: "Bonus action below half HP to regain half your max HP (1/long rest)." },
        ],
      },
      {
        id: "shadow_magic",
        name: "Shadow Magic",
        source: "XGtE",
        description: "Touched by the Shadowfell—seeing through your own 2-point Darkness and surviving lethal hits via Strength of the Grave.",
        features: [
          { level: 1, name: "Eyes of the Dark & Strength of the Grave", description: "120-ft darkvision; cast Darkness at 3rd level (2 sorcery points) and see through it. CHA save to drop to 1 HP instead of 0 HP." },
          { level: 6, name: "Hound of Ill Omen", description: "Spend 3 sorcery points to summon a dire-wolf shadow hound imposing disadvantage on its target's saves against your spells." },
          { level: 14, name: "Shadow Walk", description: "Bonus action to teleport 120 ft from shadow to shadow." },
          { level: 18, name: "Umbral Form", description: "Spend 6 sorcery points to pass through walls and gain resistance to all damage except force and radiant." },
        ],
      },
      {
        id: "storm_sorcery",
        name: "Storm Sorcery",
        source: "XGtE",
        description: "Rides swirling gusts after every leveled spell—flying 10 ft without provoking opportunity attacks and blasting thunder.",
        features: [
          { level: 1, name: "Wind Speaker & Tempestuous Magic", description: "Speak Primordial. Bonus action after casting any 1st+ level spell to fly 10 ft without provoking opportunity attacks." },
          { level: 6, name: "Heart of the Storm & Storm Guide", description: "Lightning/thunder resistance; deal half sorcerer level damage within 10 ft whenever casting lightning/thunder spells." },
          { level: 14, name: "Storm's Fury", description: "Reaction when hit in melee to deal sorcerer level lightning damage and push attacker 20 ft." },
          { level: 18, name: "Wind Soul", description: "Lightning/thunder immunity and 60-ft fly speed shareable with allies." },
        ],
      },
      {
        id: "aberrant_mind",
        name: "Aberrant Mind",
        source: "TCoE",
        description: "Awakened psionic sorcerer with expanded Psionic Spells, telepathy, and silent Subtle casting via sorcery points.",
        features: [
          { level: 1, name: "Psionic Spells & Telepathic Speech", description: "10 always-prepared extra psionic spells! Link telepathically up to 30 ft (scales to miles) with a creature." },
          { level: 6, name: "Psionic Sorcery & Psychic Defenses", description: "Cast Psionic Spells directly with sorcery points (zero verbal/somatic components!). Psychic resistance & charmed/frightened save adv." },
          { level: 14, name: "Revelation in Flesh", description: "Spend sorcery points for flight, truesight, squeezing, or swim speed." },
          { level: 18, name: "Warping Implosion", description: "Teleport 120 ft and pull foes into a 3d10 force singularity." },
        ],
      },
      {
        id: "clockwork_soul",
        name: "Clockwork Soul",
        source: "TCoE",
        description: "Channels Mechanus order—swapping spells with Abjuration/Transmutation, canceling advantage/disadvantage, and shielding allies.",
        features: [
          { level: 1, name: "Clockwork Magic & Restore Balance", description: "10 always-prepared Clockwork Spells (swappable for Abjuration/Transmutation)! Reaction to negate advantage or disadvantage within 60 ft (PB/long rest)." },
          { level: 6, name: "Bastion of Law", description: "Spend 1–5 sorcery points to ward a creature with d8 damage-absorbing dice." },
          { level: 14, name: "Trance of Order", description: "Bonus action for 1 min: attacks against you never have advantage, and your d20 rolls treat 9 or lower as 10." },
          { level: 18, name: "Clockwork Cavalcade", description: "30-ft cube bursts to restore 100 HP, repair objects, and dispel up to 6th-level magic." },
        ],
      },
    ],
    features: [
      { level: 1, name: "Spellcasting & Sorcerous Origin", description: "Cast sorcerer spells using Charisma and choose the bloodline/source of your innate magic." },
      { level: 2, name: "Font of Magic", description: "Pool of Sorcery Points equal to sorcerer level; convert points to spell slots and vice versa." },
      { level: 3, name: "Metamagic", description: "Twist spells with Quickened, Twinned, Subtle, Empowered, Careful, Distant, Heightened, or Seeking Spell (more options at 10th & 17th)." },
      { level: 20, name: "Sorcerous Restoration", description: "Regain 4 expended sorcery points on every short rest." },
    ],
  },

  Warlock: {
    id: "warlock",
    name: "Warlock",
    hitDie: "d8",
    primaryAbility: "Charisma",
    recommendedStats: "Primary: Charisma (for Eldritch Blast, spell DC, & social). Secondary: Constitution (for HP & concentration) and Dexterity (for light armor AC).",
    savingThrows: ["wis", "cha"],
    armorProficiencies: ["Light armor"],
    weaponProficiencies: ["Simple weapons"],
    toolProficiencies: [],
    startingGoldFormula: "4d4 × 10 gp",
    startingGoldAvg: 100,
    skillChoices: { count: 2, availableSkills: ["arcana", "deception", "history", "intimidation", "investigation", "nature", "religion"] },
    multiclassGains: ["Light armor", "Simple weapons"],
    multiclassPrereqs: { cha: 13 },
    subclassLevel: 1,
    spellcastingType: "pact",
    spellcastingAbility: "cha",
    asiLevels: [4, 8, 12, 16, 19],
    startingEquipmentChoices: [
      {
        id: "warlock-1",
        name: "Primary Weapon",
        options: [
          { label: "Light Crossbow & 20 Bolts", items: [{ name: "Light Crossbow", category: "weapon", quantity: 1, damage: "1d8", damageType: "piercing", properties: ["ammunition", "loading", "two-handed"], range: "80/320" }, { name: "Crossbow Bolts (20)", category: "gear", quantity: 20 }] },
          { label: "Choose Any Simple Weapon", pickFrom: "any_simple_weapon", items: [] },
        ],
      },
      {
        id: "warlock-2",
        name: "Spellcasting Focus",
        options: [
          { label: "Component Pouch", items: [{ name: "Component Pouch", category: "gear", quantity: 1 }] },
          { label: "Arcane Focus (Wand)", items: [{ name: "Arcane Focus (Wand)", category: "gear", quantity: 1 }] },
        ],
      },
      {
        id: "warlock-3",
        name: "Pack",
        options: [
          { label: "Scholar's Pack", items: [{ name: "Scholar's Pack", category: "gear", quantity: 1 }] },
          { label: "Dungeoneer's Pack", items: [{ name: "Dungeoneer's Pack", category: "gear", quantity: 1 }] },
          { label: "Choose Any Pack", pickFrom: "any_pack", items: [] },
        ],
      },
      {
        id: "warlock-4",
        name: "Additional Simple Weapon",
        options: [
          { label: "Choose Any Simple Weapon", pickFrom: "any_simple_weapon", items: [] },
        ],
      },
    ],
    fixedEquipment: [
      { name: "Leather Armor", category: "armor", armorCategory: "light", quantity: 1, baseAc: 11 },
      { name: "Dagger", category: "weapon", quantity: 2, damage: "1d4", damageType: "piercing", properties: ["finesse", "light", "thrown"], range: "20/60" },
    ],
    subclasses: [
      {
        id: "fiend",
        name: "The Fiend",
        source: "PHB",
        description: "Pact with an archdevil or demon lord granting temporary HP on kills and Hurl Through Hell.",
        features: [
          { level: 1, name: "Dark One's Blessing", description: "Reducing a hostile creature to 0 HP grants CHA mod + warlock level temporary HP." },
          { level: 6, name: "Dark One's Own Luck", description: "Add +1d10 to an ability check or saving throw (1/short or long rest)." },
          { level: 10, name: "Fiendish Resilience", description: "Choose one damage type after every rest to gain resistance against it." },
          { level: 14, name: "Hurl Through Hell", description: "Banish a hit target through the lower planes for 10d10 psychic damage (1/long rest)." },
        ],
      },
      {
        id: "archfey",
        name: "The Archfey",
        source: "PHB",
        description: "Pact with a whimsical or dread Feywild lord—beguiling rooms with Fey Presence and vanishing in mist.",
        features: [
          { level: 1, name: "Fey Presence", description: "Action to charm or frighten all creatures in a 10-ft cube until end of next turn (1/short rest)." },
          { level: 6, name: "Misty Escape", description: "Reaction when damaged to turn invisible and teleport 60 ft (1/short rest)." },
          { level: 10, name: "Beguiling Defenses", description: "Immune to charm; reflect charm attempts back at the caster." },
          { level: 14, name: "Dark Delirium", description: "Plunge a foe into an illusory realm of bliss or terror for 1 minute." },
        ],
      },
      {
        id: "great_old_one",
        name: "The Great Old One",
        source: "PHB",
        description: "Elder Far Realm patron granting Awakened Mind telepathy and psychic ward defenses.",
        features: [
          { level: 1, name: "Awakened Mind", description: "Speak telepathically with any creature you can see within 30 ft." },
          { level: 6, name: "Entropic Ward", description: "Reaction to impose disadvantage on an attack; if it misses, gain advantage on your next attack (1/short rest)." },
          { level: 10, name: "Thought Shield", description: "Thoughts cannot be read, psychic resistance, and psychic attackers take equal damage back." },
          { level: 14, name: "Create Thrall", description: "Charm an incapacitated humanoid indefinitely with telepathic link across planes." },
        ],
      },
      {
        id: "celestial",
        name: "The Celestial",
        source: "XGtE",
        description: "Covenant with a solar or unicorn—granting Sacred Flame, bonus-action Healing Light dice, and fiery/radiant magic.",
        features: [
          { level: 1, name: "Bonus Cantrips & Healing Light", description: "Learn Light & Sacred Flame. Bonus action pool of 1 + warlock level d6s to heal allies within 60 ft." },
          { level: 6, name: "Radiant Soul", description: "Gain radiant resistance and add CHA mod to one radiant or fire damage roll per spell." },
          { level: 10, name: "Celestial Resilience", description: "Grant temporary HP equal to level + CHA mod to yourself and 5 allies after every rest." },
          { level: 14, name: "Searing Vengeance", description: "Spring up from a death save with half HP, blinding nearby foes and dealing 2d8 + CHA radiant damage." },
        ],
      },
      {
        id: "hexblade",
        name: "The Hexblade",
        source: "XGtE",
        description: "Shadowfell blade pact granting medium armor, shields, martial weapons, and Charisma-based melee strikes.",
        bonusProficiencies: { armor: ["Medium armor", "Shields"], weapons: ["Martial weapons"] },
        features: [
          { level: 1, name: "Hexblade's Curse & Hex Warrior", description: "Gain medium armor, shields, and martial weapons; attack and damage with Charisma! Bonus action Curse adds +PB damage, 19–20 crits, and healing on kill." },
          { level: 6, name: "Accursed Specter", description: "Raise a slain humanoid's spirit as a loyal Specter until your next long rest." },
          { level: 10, name: "Armor of Hexes", description: "Reaction when cursed target hits you: roll d6, on 4+ the attack misses." },
          { level: 14, name: "Master of Hexes", description: "Transfer Hexblade's Curse to a new creature when the cursed target dies." },
        ],
      },
      {
        id: "fathomless",
        name: "The Fathomless",
        source: "TCoE",
        description: "Calls tentacles from the abyssal ocean depths to slap foes, reduce damage, and grant 40-ft swim speed.",
        features: [
          { level: 1, name: "Tentacle of the Deeps & Gift of the Sea", description: "Bonus action summon a 10-ft tentacle dealing 1d8 cold damage (2d8 at 10th) and slowing 10 ft; gain 40-ft swim speed and water breathing." },
          { level: 6, name: "Oceanic Soul & Guardian Coil", description: "Cold resistance and telepathy underwater; tentacle can reaction-reduce damage to allies by 1d8 (2d8 at 10th)." },
          { level: 10, name: "Grasping Tentacles", description: "Cast Evard's Black Tentacles once/long rest with unbreakable concentration." },
          { level: 14, name: "Fathomless Plunge", description: "Teleport up to 5 allies 1 mile to a known body of water." },
        ],
      },
      {
        id: "genie",
        name: "The Genie",
        source: "TCoE",
        description: "Vessel pact with a Dao, Djinni, Efreeti, or Marid—offering an extradimensional Genie's Vessel, elemental bonus damage, and Wish.",
        features: [
          { level: 1, name: "Genie's Vessel (Dao / Djinni / Efreeti / Marid)", description: "Step inside an extradimensional vessel; deal +PB elemental damage once per turn matching your patron's kind." },
          { level: 6, name: "Elemental Gift", description: "Gain elemental resistance and a bonus-action 30-ft hovering fly speed (PB/long rest)." },
          { level: 10, name: "Sanctuary Vessel", description: "Bring up to 5 allies into your vessel; gain short rest benefits in 10 minutes." },
          { level: 14, name: "Limited Wish", description: "Cast any 6th-level or lower spell from any class list with a single action." },
        ],
      },
      {
        id: "undying",
        name: "The Undying",
        source: "SCAG",
        description: "Pact with an immortal lich or undying entity that protects you against undead and restores limbs.",
        features: [
          { level: 1, name: "Among the Dead", description: "Learn Spare the Dying, advantage vs disease, and undead must save to attack you." },
          { level: 6, name: "Defy Death", description: "Regain 1d8 + CON mod HP when succeeding on a death save or casting Spare the Dying." },
          { level: 10, name: "Undying Nature", description: "No longer need food, water, air, or sleep, and age 10× slower." },
          { level: 14, name: "Indestructible Life", description: "Bonus action to heal 1d8 + warlock level HP and reattach severed limbs." },
        ],
      },
      {
        id: "undead",
        name: "The Undead",
        source: "VRGtR",
        description: "Assumes a terrifying Form of Dread—dealing extra necrotic dice and frightening struck targets.",
        features: [
          { level: 1, name: "Form of Dread", description: "Bonus action for 1 min: gain 1d10 + warlock level temp HP, frightened immunity, and frighten a hit target once per turn (PB/long rest)." },
          { level: 6, name: "Grave Touched", description: "Convert attack damage to necrotic and roll an extra damage die while in Form of Dread." },
          { level: 10, name: "Necrotic Husk", description: "Necrotic resistance (immunity in Dread form); drop to 1 HP instead of 0 and erupt in 2d10+level necrotic damage." },
          { level: 14, name: "Spirit Projection", description: "Project your spirit cleanly from your body for 1 hour with flight and necrotic healing." },
        ],
      },
    ],
    features: [
      { level: 1, name: "Otherworldly Patron & Pact Magic", description: "Choose a Patron. Cast Warlock spells using Charisma—all Pact Slots are highest level and recharge on a SHORT rest!" },
      { level: 2, name: "Eldritch Invocations (2)", description: "Customize with Agonizing Blast, Devil's Sight, Repelling Blast, Armor of Shadows, etc. (scales to 8 invocations)." },
      { level: 3, name: "Pact Boon", description: "Choose Pact of the Chain, Pact of the Blade, Pact of the Tome, or Pact of the Talisman." },
      { level: 11, name: "Mystic Arcanum (6th–9th)", description: "Gain one 6th-level (11th), 7th-level (13th), 8th-level (15th), and 9th-level (17th) daily spell without expending Pact slots." },
      { level: 20, name: "Eldritch Master", description: "Spend 1 minute entreating your patron to regain all Pact Magic slots (1/long rest)." },
    ],
  },

  Wizard: {
    id: "wizard",
    name: "Wizard",
    hitDie: "d6",
    primaryAbility: "Intelligence",
    recommendedStats: "Primary: Intelligence (for spell save DC, spell attack rolls, & knowledge skills). Secondary: Constitution (for concentration & HP) and Dexterity (for unarmored AC).",
    savingThrows: ["int", "wis"],
    armorProficiencies: [],
    weaponProficiencies: ["Daggers", "Darts", "Slings", "Quarterstaffs", "Light crossbows"],
    toolProficiencies: [],
    startingGoldFormula: "4d4 × 10 gp",
    startingGoldAvg: 100,
    skillChoices: { count: 2, availableSkills: ["arcana", "history", "insight", "investigation", "medicine", "religion"] },
    multiclassGains: [],
    multiclassPrereqs: { int: 13 },
    subclassLevel: 2,
    spellcastingType: "full",
    spellcastingAbility: "int",
    asiLevels: [4, 8, 12, 16, 19],
    startingEquipmentChoices: [
      {
        id: "wizard-1",
        name: "Weapon",
        options: [
          { label: "Quarterstaff", items: [{ name: "Quarterstaff", category: "weapon", quantity: 1, damage: "1d6", damageType: "bludgeoning", versatileDamage: "1d8", properties: ["versatile"] }] },
          { label: "Dagger", items: [{ name: "Dagger", category: "weapon", quantity: 1, damage: "1d4", damageType: "piercing", properties: ["finesse", "light", "thrown"], range: "20/60" }] },
        ],
      },
      {
        id: "wizard-2",
        name: "Focus",
        options: [
          { label: "Component Pouch", items: [{ name: "Component Pouch", category: "gear", quantity: 1 }] },
          { label: "Arcane Focus (Wand)", items: [{ name: "Arcane Focus (Wand)", category: "gear", quantity: 1 }] },
        ],
      },
      {
        id: "wizard-3",
        name: "Pack",
        options: [
          { label: "Scholar's Pack", items: [{ name: "Scholar's Pack", category: "gear", quantity: 1 }] },
          { label: "Explorer's Pack", items: [{ name: "Explorer's Pack", category: "gear", quantity: 1 }] },
          { label: "Choose Any Pack", pickFrom: "any_pack", items: [] },
        ],
      },
    ],
    fixedEquipment: [{ name: "Spellbook", category: "gear", quantity: 1 }],
    subclasses: [
      {
        id: "evocation",
        name: "School of Evocation",
        source: "PHB",
        description: "Shapes explosive elemental magic around allies with Sculpt Spells and maximizes spells via Overchannel.",
        features: [
          { level: 2, name: "Evocation Savant & Sculpt Spells", description: "Half cost/time to copy Evocation spells; shield 1 + spell level allies from area evocations (auto-save, 0 damage)." },
          { level: 6, name: "Potent Cantrip", description: "Save-based cantrips deal half damage on a successful save." },
          { level: 10, name: "Empowered Evocation", description: "Add INT modifier to one damage roll of any wizard evocation spell." },
          { level: 14, name: "Overchannel", description: "Deal maximum possible damage with a 1st- through 5th-level evocation spell." },
        ],
      },
      {
        id: "abjuration",
        name: "School of Abjuration",
        source: "PHB",
        description: "Surrounds themselves with a rechargeable Arcane Ward buffer and masters Counterspell and Dispel Magic.",
        features: [
          { level: 2, name: "Abjuration Savant & Arcane Ward", description: "Create a protective ward with HP = 2 × wizard level + INT mod that absorbs damage and recharges on Abjuration casts." },
          { level: 6, name: "Projected Ward", description: "Reaction to shield an ally within 30 ft using your Arcane Ward." },
          { level: 10, name: "Improved Abjuration", description: "Add your Proficiency Bonus to ability checks for Counterspell and Dispel Magic." },
          { level: 14, name: "Spell Resistance", description: "Advantage on saving throws against spells and resistance to spell damage." },
        ],
      },
      {
        id: "conjuration",
        name: "School of Conjuration",
        source: "PHB",
        description: "Summons objects out of nothing, swaps places via Benign Transposition, and bolsters summoned allies.",
        features: [
          { level: 2, name: "Conjuration Savant & Minor Conjuration", description: "Conjure a nonmagical Small/3-ft object into your hand for 1 hour." },
          { level: 6, name: "Benign Transposition", description: "Teleport 30 ft or swap spaces with a willing creature." },
          { level: 10, name: "Focused Conjuration", description: "Concentration on Conjuration spells cannot be broken by taking damage." },
          { level: 14, name: "Durable Summons", description: "Creatures you summon or create via conjuration gain +30 temporary HP." },
        ],
      },
      {
        id: "divination",
        name: "School of Divination",
        source: "PHB",
        description: "Replaces critical attack rolls and enemy saving throws with pre-rolled Portent d20 dice.",
        features: [
          { level: 2, name: "Divination Savant & Portent", description: "Roll two d20s after each long rest; replace any visible creature's attack, save, or check roll with a Portent roll." },
          { level: 6, name: "Expert Divination", description: "Casting a 2nd+ level divination spell restores a lower-level expended slot." },
          { level: 10, name: "The Third Eye", description: "Action to gain darkvision, ethereal sight, greater comprehension, or see invisibility." },
          { level: 14, name: "Greater Portent", description: "Roll three Portent d20s instead of two." },
        ],
      },
      {
        id: "enchantment",
        name: "School of Enchantment",
        source: "PHB",
        description: "Hypnotizes foes, redirects incoming attacks with Instinctive Charm, and splits enchantment spells.",
        features: [
          { level: 2, name: "Enchantment Savant & Hypnotic Gaze", description: "Action to incapacitate and charm an adjacent creature." },
          { level: 6, name: "Instinctive Charm", description: "Reaction to divert an attacker within 30 ft onto another creature (WIS save)." },
          { level: 10, name: "Split Enchantment", description: "Single-target enchantment spells can target a second creature." },
          { level: 14, name: "Alter Memories", description: "Charmed victims remain unaware they were charmed and lose memories." },
        ],
      },
      {
        id: "illusion",
        name: "School of Illusion",
        source: "PHB",
        description: "Shapes Minor Illusion with both sound and sight, alters illusions mid-combat, and weaves Illusory Reality.",
        features: [
          { level: 2, name: "Illusion Savant & Improved Minor Illusion", description: "Minor Illusion creates both sound and an image in one casting." },
          { level: 6, name: "Malleable Illusions", description: "Action to reshape the nature of an ongoing illusion spell." },
          { level: 10, name: "Illusory Self", description: "Reaction to create an illusory double forcing an attack to automatically miss (1/short rest)." },
          { level: 14, name: "Illusory Reality", description: "Bonus action to make one non-damaging inanimate object inside an illusion completely real for 1 minute." },
        ],
      },
      {
        id: "necromancy",
        name: "School of Necromancy",
        source: "PHB",
        description: "Siphons HP on spell kills and commands enhanced skeletons and zombies with +PB damage and extra HP.",
        features: [
          { level: 2, name: "Necromancy Savant & Grim Harvest", description: "Regain 2 × spell level HP (3× for necromancy) when killing a creature with a 1st+ level spell." },
          { level: 6, name: "Undead Thralls", description: "Animate Dead raises +1 undead; your undead gain +wizard level max HP and add your PB to damage." },
          { level: 10, name: "Inured to Undeath", description: "Necrotic resistance; max HP cannot be reduced." },
          { level: 14, name: "Command Undead", description: "Bring even powerful undead under your permanent control." },
        ],
      },
      {
        id: "transmutation",
        name: "School of Transmutation",
        source: "PHB",
        description: "Reshapes physical materials and creates a customizable Transmuter's Stone for Con save proficiency or speed.",
        features: [
          { level: 2, name: "Transmutation Savant & Minor Alchemy", description: "Temporarily transmute wood, stone, iron, copper, or silver over 10 minutes." },
          { level: 6, name: "Transmuter's Stone", description: "Grant darkvision, +10 ft speed, CON save proficiency, or elemental resistance to whoever holds the stone." },
          { level: 10, name: "Shapechanger", description: "Add Polymorph to your spellbook and cast it on yourself as a CR 1 beast once/short rest." },
          { level: 14, name: "Master Transmuter", description: "Destroy your Transmuter's Stone for Panacea full-heal, Raise Life, Restore Youth, or Major Transformation." },
        ],
      },
      {
        id: "war_magic",
        name: "War Magic",
        source: "XGtE",
        description: "Battlefield mage adding +INT to initiative, +2 AC / +4 saves on reaction, and +2 AC/saves while concentrating.",
        features: [
          { level: 2, name: "Arcane Deflection & Tactical Wit", description: "Add INT modifier to initiative! Reaction to gain +2 AC against one attack or +4 to a failed saving throw." },
          { level: 6, name: "Power Surge", description: "Store arcane charges on Counterspell/Dispel to deal extra half wizard level force damage." },
          { level: 10, name: "Durable Magic", description: "While concentrating on a spell, gain +2 bonus to AC and all saving throws." },
          { level: 14, name: "Deflecting Shroud", description: "Arcane Deflection arcs half wizard level force damage to up to 3 creatures within 60 ft." },
        ],
      },
      {
        id: "bladesinging",
        name: "Bladesinging",
        source: "TCoE / SCAG",
        description: "Elven sword-mage tradition weaving Light armor, Bladesong (+INT AC & Concentration), and cantrip-infused Extra Attacks.",
        bonusProficiencies: { armor: ["Light armor"], weapons: ["One type of one-handed melee weapon"], skillsCount: 1 },
        features: [
          { level: 2, name: "Training in War and Song & Bladesong", description: "Gain light armor, Performance, and a one-handed weapon. Bladesong (bonus action, PB/long rest) grants +INT to AC, +10 ft speed, Acrobatics adv, and +INT to Concentration saves." },
          { level: 6, name: "Extra Attack (Bladesinger)", description: "Attack twice whenever taking the Attack action, and replace one attack with casting a cantrip!" },
          { level: 10, name: "Song of Defense", description: "Reaction while Bladesong is active to expend a spell slot and reduce damage by 5 × slot level." },
          { level: 14, name: "Song of Victory", description: "Add INT modifier to melee weapon damage rolls while Bladesong is active." },
        ],
      },
      {
        id: "order_of_scribes",
        name: "Order of Scribes",
        source: "TCoE",
        description: "Awakens a sentient Spellbook—swapping spell damage elements at will, casting remotely through Manifest Mind, and scribing instantly.",
        features: [
          { level: 2, name: "Wizardly Quill & Awakened Spellbook", description: "Copy spells in 2 minutes per level; swap damage types of leveled spells to another spell's damage type in your book; cast 1 ritual/day at normal speed." },
          { level: 6, name: "Manifest Mind", description: "Project a spectral mind from your spellbook up to 300 ft and cast PB spells/day from its space." },
          { level: 10, name: "Master Scrivener", description: "Create a free upcasted magic scroll after every long rest." },
          { level: 14, name: "One with the Word", description: "Negate all damage when reduced to 0 HP by sacrificing spells temporarily." },
        ],
      },
      {
        id: "chronurgy",
        name: "Chronurgy Magic",
        source: "EGtW",
        description: "Exandrian time-bending wizard adding +INT initiative, Chronal Shift rerolls, and spell-bead stasis.",
        features: [
          { level: 2, name: "Chronal Shift & Temporal Awareness", description: "Add INT mod to initiative. Reaction (2/long rest) to force any creature within 30 ft to reroll an attack, check, or save." },
          { level: 6, name: "Momentary Stasis", description: "Action to freeze a Large or smaller creature in temporal stasis until end of your next turn." },
          { level: 10, name: "Arcane Abeyance", description: "Freeze a 4th-level or lower spell inside a mote bead for any ally (or familiar) to cast later!" },
          { level: 14, name: "Convergent Future", description: "Reaction to automatically force any d20 roll within 60 ft to succeed or fail in exchange for 1 exhaustion." },
        ],
      },
      {
        id: "graviturgy",
        name: "Graviturgy Magic",
        source: "EGtW",
        description: "Manipulates gravity and density—magnifying fall damage, moving targets 5 ft with gravity spells, and crushing enemies.",
        features: [
          { level: 2, name: "Adjust Density", description: "Action to halve or double a creature/object's weight (+10 ft speed or +2/-2 speed & STR adv/disadv)." },
          { level: 6, name: "Gravity Well", description: "Whenever you cast a spell on a creature, pull or push it 5 ft horizontally." },
          { level: 10, name: "Violent Attraction", description: "Reaction to add +1d10 damage to an ally's melee hit or +2d10 to fall damage." },
          { level: 14, name: "Event Horizon", description: "Action to lock enemies within 30 ft inside crushing gravity (2d10 force & 0 speed)." },
        ],
      },
    ],
    features: [
      { level: 1, name: "Spellcasting & Arcane Recovery", description: "Cast wizard spells using Intelligence (prepare INT mod + wizard level daily from Spellbook). Recover spell slots totaling up to half wizard level (rounded up) once/day on a short rest." },
      { level: 2, name: "Arcane Tradition", description: "Choose a specialized school or arcane tradition." },
      { level: 18, name: "Spell Mastery", description: "Pick one 1st-level and one 2nd-level spell in your spellbook to cast at will without expending slots." },
      { level: 20, name: "Signature Spells", description: "Two 3rd-level spells are always prepared and each castable once per short/long rest without slots." },
    ],
  },
};
