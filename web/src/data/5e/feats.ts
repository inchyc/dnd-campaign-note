export interface Feat5e {
  id: string;
  name: string;
  prerequisite?: string;
  statBoost?: Partial<Record<"str" | "dex" | "con" | "int" | "wis" | "cha", number>>;
  description: string;
}

export const FEATS_5E: Feat5e[] = [
  {
    id: "alert",
    name: "Alert",
    description: "Always on the lookout for danger. Gain a +5 bonus to initiative, can't be surprised while conscious, and other creatures don't gain advantage on attack rolls against you as a result of being unseen by you.",
  },
  {
    id: "great_weapon_master",
    name: "Great Weapon Master",
    prerequisite: "Proficiency with heavy weapons",
    description: "On your turn, when you score a critical hit with a melee weapon or reduce a creature to 0 HP, make one melee weapon attack as a bonus action. Before making a melee attack with a heavy weapon, you can choose to take a -5 penalty to the attack roll to add +10 to the damage roll.",
  },
  {
    id: "sharpshooter",
    name: "Sharpshooter",
    description: "Attacking at long range doesn't impose disadvantage on your ranged weapon attack rolls. Your ranged weapon attacks ignore half cover and three-quarters cover. Before you make an attack with a ranged weapon, you can choose to take a -5 penalty to the attack roll to add +10 to the damage roll.",
  },
  {
    id: "war_caster",
    name: "War Caster",
    prerequisite: "The ability to cast at least one spell",
    description: "Advantage on CON saving throws to maintain concentration on a spell when you take damage. Can perform somatic components even when holding weapons or a shield. When a hostile creature's movement provokes an opportunity attack, you can use your reaction to cast a spell at the creature instead.",
  },
  {
    id: "lucky",
    name: "Lucky",
    description: "You have 3 luck points per long rest. Whenever you make an attack roll, ability check, or saving throw, you can spend one luck point to roll an additional d20 and choose which to use. You can also spend a point when an attack roll is made against you to replace the enemy's roll.",
  },
  {
    id: "sentinel",
    name: "Sentinel",
    description: "When you hit a creature with an opportunity attack, its speed becomes 0 for the rest of the turn. Creatures provoke opportunity attacks even if they take the Disengage action. When a creature within 5 ft attacks an ally, you can use your reaction to make a melee weapon attack against the attacker.",
  },
  {
    id: "polearm_master",
    name: "Polearm Master",
    description: "When you take the Attack action with a glaive, halberd, pike, quarterstaff, or spear, you can use a bonus action to make a melee attack with the opposite end (1d4 bludgeoning). Other creatures provoke an opportunity attack when they enter the reach you have with that weapon.",
  },
  {
    id: "mobile",
    name: "Mobile",
    description: "Your speed increases by 10 feet. When you use the Dash action, difficult terrain doesn't cost extra movement that turn. When you make a melee attack against a creature, you don't provoke opportunity attacks from that creature for the rest of the turn, whether you hit or not.",
  },
  {
    id: "tough",
    name: "Tough",
    description: "Your hit point maximum increases by an amount equal to twice your level when you gain this feat. Whenever you gain a level thereafter, your hit point maximum increases by an additional 2 hit points.",
  },
  {
    id: "shield_master",
    name: "Shield Master",
    prerequisite: "Proficiency with shields",
    description: "If you take the Attack action on your turn, you can use a bonus action to shove a creature within 5 ft with your shield. Add shield's AC bonus to any DEX saving throw against spells targeting only you. If subjected to an effect allowing DEX save for half damage, use reaction to take 0 damage on success.",
  },
  {
    id: "crossbow_expert",
    name: "Crossbow Expert",
    description: "You ignore the loading quality of crossbows with which you are proficient. Being within 5 feet of a hostile creature doesn't impose disadvantage on your ranged attack rolls. When you attack with a one-handed weapon, you can use a bonus action to attack with a hand crossbow you are holding.",
  },
  {
    id: "resilient",
    name: "Resilient",
    description: "Choose one ability score: increase that score by 1, and you gain proficiency in saving throws using the chosen ability.",
  },
];
