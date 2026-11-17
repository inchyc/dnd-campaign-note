export interface LanguageDefinition {
  name: string;
  type: "standard" | "exotic" | "secret";
  script?: string;
  typicalSpeakers: string;
}

export const LANGUAGES_5E: LanguageDefinition[] = [
  // Standard Languages
  { name: "Common", type: "standard", script: "Common", typicalSpeakers: "Humans, halflings, half-elves, half-orcs" },
  { name: "Dwarvish", type: "standard", script: "Dwarvish", typicalSpeakers: "Dwarves" },
  { name: "Elvish", type: "standard", script: "Elvish", typicalSpeakers: "Elves" },
  { name: "Giant", type: "standard", script: "Dwarvish", typicalSpeakers: "Ogres, giants" },
  { name: "Gnomish", type: "standard", script: "Dwarvish", typicalSpeakers: "Gnomes" },
  { name: "Goblin", type: "standard", script: "Dwarvish", typicalSpeakers: "Goblinoids" },
  { name: "Halfling", type: "standard", script: "Common", typicalSpeakers: "Halflings" },
  { name: "Orc", type: "standard", script: "Dwarvish", typicalSpeakers: "Orcs" },

  // Exotic Languages
  { name: "Abyssal", type: "exotic", script: "Infernal", typicalSpeakers: "Demons" },
  { name: "Celestial", type: "exotic", script: "Celestial", typicalSpeakers: "Celestials" },
  { name: "Draconic", type: "exotic", script: "Draconic", typicalSpeakers: "Dragons, dragonborn, kobolds" },
  { name: "Deep Speech", type: "exotic", typicalSpeakers: "Mind flayers, beholders, aboleths" },
  { name: "Infernal", type: "exotic", script: "Infernal", typicalSpeakers: "Devils" },
  { name: "Primordial", type: "exotic", script: "Dwarvish", typicalSpeakers: "Elementals (Aquan, Auran, Ignan, Terran)" },
  { name: "Sylvan", type: "exotic", script: "Elvish", typicalSpeakers: "Fey creatures" },
  { name: "Undercommon", type: "exotic", script: "Elvish", typicalSpeakers: "Underdark traders, drow" },

  // Secret Languages
  { name: "Druidic", type: "secret", typicalSpeakers: "Druids only" },
  { name: "Thieves' Cant", type: "secret", typicalSpeakers: "Rogues only" },
];

export const ALL_LANGUAGE_NAMES = LANGUAGES_5E.map((l) => l.name);
export const STANDARD_AND_EXOTIC_LANGUAGES = LANGUAGES_5E.filter((l) => l.type !== "secret").map((l) => l.name);
