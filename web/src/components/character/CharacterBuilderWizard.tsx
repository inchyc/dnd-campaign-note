"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Shield,
  Heart,
  Swords,
  Scroll,
  Dices,
  Check,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Plus,
  Trash2,
  Wand2,
  RefreshCw,
  Sliders,
  Info,
  CheckCircle2,
  Dice5,
  Search,
  CheckSquare,
  Square,
} from "lucide-react";
import { CLASSES_5E, ClassDefinition, SubclassDefinition } from "@/data/5e/classes";
import { RACES_5E, RaceDefinition, SubraceDefinition, StatKey } from "@/data/5e/races";
import { BACKGROUNDS_5E, BackgroundDefinition } from "@/data/5e/backgrounds";
import { FEATS_5E, Feat5e } from "@/data/5e/feats";
import { SPELLS_5E, Spell5e } from "@/data/5e/spells";
import {
  STANDARD_ARRAY,
  POINT_BUY_COST_TABLE,
  PACK_CONTENTS,
  calcModifier,
  formatModifier,
  calcPointBuyCost,
  roll4d6DropLowest,
  calculateArmorClass,
  calculateTotalHitPoints,
  checkMulticlassPrereqs,
  calcMulticlassSpellSlots,
  calcWarlockPactSlots,
  calcProficiencyBonus,
} from "@/data/5e/rulesEngine";
import { STANDARD_AND_EXOTIC_LANGUAGES } from "@/data/5e/languages";
import type { CharacterSheetData, InventoryItemData, SpellItemData, MulticlassClassEntry } from "@/app/api/character/sheet/route";

interface CharacterBuilderWizardProps {
  userId: string;
  defaultCharacterName?: string;
  initialClass?: string;
  initialLevel?: number;
  initialRace?: string;
  initialSubclass?: string;
  onClose: () => void;
  onSave: (sheet: CharacterSheetData) => Promise<void>;
}

const STAT_NAMES: Record<StatKey, string> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

const STAT_KEYS: StatKey[] = ["str", "dex", "con", "int", "wis", "cha"];

const ALL_SKILLS_5E: Array<{ id: string; name: string; stat: StatKey }> = [
  { id: "acrobatics", name: "Acrobatics", stat: "dex" },
  { id: "animalHandling", name: "Animal Handling", stat: "wis" },
  { id: "arcana", name: "Arcana", stat: "int" },
  { id: "athletics", name: "Athletics", stat: "str" },
  { id: "deception", name: "Deception", stat: "cha" },
  { id: "history", name: "History", stat: "int" },
  { id: "insight", name: "Insight", stat: "wis" },
  { id: "intimidation", name: "Intimidation", stat: "cha" },
  { id: "investigation", name: "Investigation", stat: "int" },
  { id: "medicine", name: "Medicine", stat: "wis" },
  { id: "nature", name: "Nature", stat: "int" },
  { id: "perception", name: "Perception", stat: "wis" },
  { id: "performance", name: "Performance", stat: "cha" },
  { id: "persuasion", name: "Persuasion", stat: "cha" },
  { id: "religion", name: "Religion", stat: "int" },
  { id: "sleightOfHand", name: "Sleight of Hand", stat: "dex" },
  { id: "stealth", name: "Stealth", stat: "dex" },
  { id: "survival", name: "Survival", stat: "wis" },
];

const ALIGNMENTS = [
  { name: "Lawful Good", desc: "Acts with compassion, honor, and duty to society." },
  { name: "Neutral Good", desc: "Does the best a person can do to help others." },
  { name: "Chaotic Good", desc: "Acts as conscience directs, valuing freedom and kindness." },
  { name: "Lawful Neutral", desc: "Acts according to law, tradition, or personal codes." },
  { name: "True Neutral", desc: "Prefers balance and avoids taking strong moral sides." },
  { name: "Chaotic Neutral", desc: "Follows whim and desires, valuing personal independence above all." },
  { name: "Lawful Evil", desc: "Takes what they want within the bounds of order and loyalty." },
  { name: "Neutral Evil", desc: "Does whatever they can get away with for selfish gain." },
  { name: "Chaotic Evil", desc: "Acts with arbitrary violence, guided by greed or bloodlust." },
];

export function CharacterBuilderWizard({
  userId,
  defaultCharacterName = "",
  initialClass,
  initialLevel,
  initialRace,
  initialSubclass,
  onClose,
  onSave,
}: CharacterBuilderWizardProps) {
  const [step, setStep] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  // ----------------------------------------------------
  // STEP 1 STATE: CLASS, STARTING LEVEL & MULTICLASSING
  // ----------------------------------------------------
  const [characterName, setCharacterName] = useState(defaultCharacterName || "Hero");
  const [startingLevel, setStartingLevel] = useState<number>(
    initialLevel && initialLevel >= 1 && initialLevel <= 20 ? initialLevel : 1
  );
  const [primaryClass, setPrimaryClass] = useState<string>(
    initialClass && CLASSES_5E[initialClass] ? initialClass : "Fighter"
  );
  const [multiclassEntries, setMulticlassEntries] = useState<Array<{ className: string; level: number; subclass?: string }>>([]);
  const [dmOverride, setDmOverride] = useState(false);
  const [primarySubclass, setPrimarySubclass] = useState<string>(initialSubclass || "");

  // ----------------------------------------------------
  // STEP 2 STATE: ABILITY SCORES
  // ----------------------------------------------------
  const [statMode, setStatMode] = useState<"standard" | "pointbuy" | "roll" | "manual">("standard");
  const [baseStats, setBaseStats] = useState<Record<StatKey, number>>({
    str: 15,
    dex: 14,
    con: 13,
    int: 12,
    wis: 10,
    cha: 8,
  });

  // Standard Array Auto-Swapping helper
  const handleStandardArrayChange = (targetStat: StatKey, newVal: number) => {
    setBaseStats((prev) => {
      const next = { ...prev };
      const oldVal = prev[targetStat];
      // Find other stat that currently has newVal
      const otherStat = (Object.keys(prev) as StatKey[]).find(
        (s) => s !== targetStat && prev[s] === newVal
      );
      if (otherStat) {
        next[otherStat] = oldVal;
      }
      next[targetStat] = newVal;
      return next;
    });
  };

  // Roll Mode State
  const [rolledPool, setRolledPool] = useState<Array<{ id: number; total: number; rolls: number[]; dropped: number }>>([]);
  const [rollAssignment, setRollAssignment] = useState<Record<StatKey, number>>({
    str: 0,
    dex: 1,
    con: 2,
    int: 3,
    wis: 4,
    cha: 5,
  });
  const [assignFreely, setAssignFreely] = useState(true);
  const [isRollingAnimation, setIsRollingAnimation] = useState(false);

  // Manual Table Roll inputs
  const [manualInputs, setManualInputs] = useState<Record<StatKey, number>>({
    str: 15,
    dex: 14,
    con: 13,
    int: 12,
    wis: 10,
    cha: 8,
  });

  // ----------------------------------------------------
  // STEP 3 STATE: RACE & LINEAGE
  // ----------------------------------------------------
  const [showAllRaces, setShowAllRaces] = useState<boolean>(true);
  const [raceSearch, setRaceSearch] = useState<string>("");
  const [selectedRace, setSelectedRace] = useState<string>(
    initialRace && RACES_5E[initialRace] ? initialRace : "Human"
  );
  const [selectedSubrace, setSelectedSubrace] = useState<string>("standard_human");
  const [customLineageSize, setCustomLineageSize] = useState<"Small" | "Medium">("Medium");
  const [customLineagePerk, setCustomLineagePerk] = useState<"darkvision" | "skill">("darkvision");
  const [customLineageSkill, setCustomLineageSkill] = useState<string>("perception");
  
  // Flexible Ability Score Allocations (+2 or +1)
  const [flexibleBonuses, setFlexibleBonuses] = useState<Partial<Record<StatKey, number>>>({});
  // Optional Tasha's Reassignment rule
  const [enableTashaSwap, setEnableTashaSwap] = useState(false);
  const [tashaSwappedBonuses, setTashaSwappedBonuses] = useState<Partial<Record<StatKey, number>>>({});

  // ----------------------------------------------------
  // STEP 4 STATE: BACKGROUND & ALIGNMENT
  // ----------------------------------------------------
  const [selectedBackground, setSelectedBackground] = useState<string>("Soldier");
  const [alignment, setAlignment] = useState<string>("Neutral Good");
  const [bgSearch, setBgSearch] = useState<string>("");

  // ----------------------------------------------------
  // STEP 5 STATE: PROFICIENCIES & LANGUAGES
  // ----------------------------------------------------
  const [chosenClassSkills, setChosenClassSkills] = useState<string[]>([]);
  const [chosenRaceLanguages, setChosenRaceLanguages] = useState<string[]>([]);
  const [chosenBgLanguages, setChosenBgLanguages] = useState<string[]>([]);
  const [chosenToolProficiencies, setChosenToolProficiencies] = useState<string[]>([]);

  // ----------------------------------------------------
  // STEP 6 STATE: FEATS
  // ----------------------------------------------------
  const [selectedFeatId, setSelectedFeatId] = useState<string>("alert");
  const [featStatChoice, setFeatStatChoice] = useState<StatKey>("dex");
  const [asiChoicesByLevel, setAsiChoicesByLevel] = useState<Record<number, { type: "stats" | "feat"; stat1?: StatKey; stat2?: StatKey; featId?: string }>>({});

  // ----------------------------------------------------
  // STEP 7 STATE: EQUIPMENT
  // ----------------------------------------------------
  const [equipmentSelections, setEquipmentSelections] = useState<Record<string, number>>({});
  const [useStartingGold, setUseStartingGold] = useState(false);
  const [customGold, setCustomGold] = useState(100);

  // ----------------------------------------------------
  // STEP 8 STATE: SPELLS (CONTEXTUAL)
  // ----------------------------------------------------
  const [selectedCantrips, setSelectedCantrips] = useState<string[]>([]);
  const [selectedSpells, setSelectedSpells] = useState<string[]>([]);

  // ----------------------------------------------------
  // HP MODE: AVERAGE OR ROLL
  // ----------------------------------------------------
  const [hpMode, setHpMode] = useState<"average" | "roll">("average");
  const [rolledHpMap, setRolledHpMap] = useState<Record<string, number[]>>({});

  // Lookup Definitions
  const raceDef: RaceDefinition = RACES_5E[selectedRace] || RACES_5E["Human"];
  const subraceDef: SubraceDefinition | undefined = raceDef.subraces.find((sr) => sr.id === selectedSubrace);
  const primaryClassDef: ClassDefinition = CLASSES_5E[primaryClass] || CLASSES_5E["Fighter"];
  const bgDef: BackgroundDefinition = BACKGROUNDS_5E[selectedBackground] || BACKGROUNDS_5E["Soldier"];

  // Combined Classes list
  const combinedClasses: MulticlassClassEntry[] = useMemo(() => {
    const list: MulticlassClassEntry[] = [
      {
        className: primaryClass,
        subclass: primarySubclass || primaryClassDef.subclasses[0]?.name || undefined,
        level: Math.max(1, startingLevel - multiclassEntries.reduce((s, m) => s + m.level, 0)),
        hitDie: primaryClassDef.hitDie,
      },
    ];
    for (const mc of multiclassEntries) {
      const def = CLASSES_5E[mc.className];
      if (def) {
        list.push({
          className: mc.className,
          subclass: mc.subclass || def.subclasses[0]?.name || undefined,
          level: mc.level,
          hitDie: def.hitDie,
        });
      }
    }
    return list;
  }, [primaryClass, primarySubclass, primaryClassDef, startingLevel, multiclassEntries]);

  // Total Level
  const totalLevel = useMemo(() => {
    return combinedClasses.reduce((sum, c) => sum + c.level, 0);
  }, [combinedClasses]);

  // Is Character a Spellcaster?
  const isSpellcaster = useMemo(() => {
    return combinedClasses.some((c) => {
      const def = CLASSES_5E[c.className];
      if (!def) return false;
      if (def.spellcastingType && def.spellcastingType !== "none") {
        if (c.className === "Paladin" || c.className === "Ranger") return c.level >= 2;
        return true;
      }
      if (c.subclass === "Eldritch Knight" || c.subclass === "Arcane Trickster") return c.level >= 3;
      return false;
    });
  }, [combinedClasses]);

  // Has Bonus Feat from Race
  const hasRacialFeat = raceDef.grantsFeat || selectedSubrace === "variant_human" || selectedRace === "Custom Lineage";

  // Calculate Racial Ability Bonuses
  const racialBonuses = useMemo(() => {
    const bonuses: Record<StatKey, number> = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    if (enableTashaSwap) {
      for (const [st, val] of Object.entries(tashaSwappedBonuses)) {
        bonuses[st as StatKey] += val || 0;
      }
      return bonuses;
    }

    if (raceDef.abilityBonuses) {
      for (const [s, b] of Object.entries(raceDef.abilityBonuses)) {
        bonuses[s as StatKey] = (bonuses[s as StatKey] || 0) + (b || 0);
      }
    }
    if (subraceDef?.abilityBonuses) {
      for (const [s, b] of Object.entries(subraceDef.abilityBonuses)) {
        bonuses[s as StatKey] = (bonuses[s as StatKey] || 0) + (b || 0);
      }
    }
    // Add chosen flexible bonuses
    for (const [s, b] of Object.entries(flexibleBonuses)) {
      bonuses[s as StatKey] = (bonuses[s as StatKey] || 0) + (b || 0);
    }
    return bonuses;
  }, [raceDef, subraceDef, flexibleBonuses, enableTashaSwap, tashaSwappedBonuses]);

  // Feat Half-Stat Boost
  const featStatBoost = useMemo(() => {
    const boost: Record<StatKey, number> = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    if (hasRacialFeat) {
      const feat = FEATS_5E.find((f) => f.id === selectedFeatId);
      if (feat) {
        if (feat.allowsStatChoice && featStatChoice) {
          boost[featStatChoice] += 1;
        } else if (feat.statBoost) {
          for (const [s, b] of Object.entries(feat.statBoost)) {
            boost[s as StatKey] += b || 0;
          }
        }
      }
    }
    return boost;
  }, [hasRacialFeat, selectedFeatId, featStatChoice]);

  // Final Ability Scores = base + racial + feat
  const finalStats = useMemo(() => {
    return {
      str: (baseStats.str || 10) + (racialBonuses.str || 0) + (featStatBoost.str || 0),
      dex: (baseStats.dex || 10) + (racialBonuses.dex || 0) + (featStatBoost.dex || 0),
      con: (baseStats.con || 10) + (racialBonuses.con || 0) + (featStatBoost.con || 0),
      int: (baseStats.int || 10) + (racialBonuses.int || 0) + (featStatBoost.int || 0),
      wis: (baseStats.wis || 10) + (racialBonuses.wis || 0) + (featStatBoost.wis || 0),
      cha: (baseStats.cha || 10) + (racialBonuses.cha || 0) + (featStatBoost.cha || 0),
    };
  }, [baseStats, racialBonuses, featStatBoost]);

  // Point Buy Spent
  const pointBuySpent = useMemo(() => {
    let spent = 0;
    for (const val of Object.values(baseStats)) {
      spent += calcPointBuyCost(val);
    }
    return spent;
  }, [baseStats]);

  // HP Calculation
  const isHillDwarf = selectedSubrace === "hill_dwarf";
  const hasTough = selectedFeatId === "tough" && hasRacialFeat;
  const conMod = calcModifier(finalStats.con);
  const hpResult = useMemo(() => {
    return calculateTotalHitPoints(combinedClasses, conMod, {
      hpMode,
      rolledHpByLevel: rolledHpMap,
      isHillDwarf,
      hasToughFeat: hasTough,
    });
  }, [combinedClasses, conMod, hpMode, rolledHpMap, isHillDwarf, hasTough]);

  // Proficiency Bonus
  const pb = useMemo(() => calcProficiencyBonus(totalLevel), [totalLevel]);

  // Multiclass Prerequisites Check
  const mcPrereqStatus = useMemo(() => {
    const issues: string[] = [];
    combinedClasses.forEach((c) => {
      const res = checkMulticlassPrereqs(c.className, finalStats);
      if (!res.allowed) {
        issues.push(`${c.className}: needs ${res.missing.join(", ")}`);
      }
    });
    return issues;
  }, [combinedClasses, finalStats]);

  // All Granted Skills from Race & Background
  const innateSkills = useMemo(() => {
    const list = new Set<string>();
    bgDef.skills.forEach((s) => list.add(s));
    if (raceDef.traits.some((t) => t.name === "Keen Senses")) list.add("perception");
    if (raceDef.traits.some((t) => t.name === "Menacing")) list.add("intimidation");
    if (raceDef.traits.some((t) => t.name === "Cat's Talent")) {
      list.add("perception");
      list.add("stealth");
    }
    if (raceDef.traits.some((t) => t.name === "Natural Athlete")) list.add("athletics");
    if (raceDef.traits.some((t) => t.name === "Sneaky")) list.add("stealth");
    if (selectedRace === "Custom Lineage" && customLineagePerk === "skill") {
      list.add(customLineageSkill);
    }
    return Array.from(list);
  }, [bgDef, raceDef, selectedRace, customLineagePerk, customLineageSkill]);

  // Combined Languages
  const finalLanguages = useMemo(() => {
    const langs = new Set<string>();
    raceDef.languages.forEach((l) => langs.add(l));
    chosenRaceLanguages.forEach((l) => langs.add(l));
    chosenBgLanguages.forEach((l) => langs.add(l));
    if (combinedClasses.some((c) => c.className === "Druid")) langs.add("Druidic");
    if (combinedClasses.some((c) => c.className === "Rogue")) langs.add("Thieves' Cant");
    return Array.from(langs);
  }, [raceDef, chosenRaceLanguages, chosenBgLanguages, combinedClasses]);

  // Handle Dice Rolling
  const handleRollStats = () => {
    setIsRollingAnimation(true);
    setTimeout(() => {
      const pool = [
        { id: 0, ...roll4d6DropLowest() },
        { id: 1, ...roll4d6DropLowest() },
        { id: 2, ...roll4d6DropLowest() },
        { id: 3, ...roll4d6DropLowest() },
        { id: 4, ...roll4d6DropLowest() },
        { id: 5, ...roll4d6DropLowest() },
      ];
      setRolledPool(pool);
      // Auto assign descending or direct
      const sorted = [...pool].sort((a, b) => b.total - a.total);
      setBaseStats({
        str: sorted[0].total,
        dex: sorted[1].total,
        con: sorted[2].total,
        int: sorted[3].total,
        wis: sorted[4].total,
        cha: sorted[5].total,
      });
      setIsRollingAnimation(false);
    }, 450);
  };

  // Switch Stat Mode
  const handleStatModeChange = (mode: "standard" | "pointbuy" | "roll" | "manual") => {
    setStatMode(mode);
    if (mode === "standard") {
      setBaseStats({ str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 });
    } else if (mode === "pointbuy") {
      setBaseStats({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 });
    } else if (mode === "roll") {
      if (rolledPool.length === 0) handleRollStats();
    } else if (mode === "manual") {
      setBaseStats({ ...manualInputs });
    }
  };

  // Assemble Starting Equipment Items
  const startingEquipmentBundle = useMemo(() => {
    const items: InventoryItemData[] = [];

    if (useStartingGold) {
      items.push({
        id: "item-gold-pouch",
        name: `Coin Pouch (${customGold} gp)`,
        category: "gear",
        quantity: 1,
        weight: 2,
        description: `Starting character wealth of ${customGold} gold pieces.`,
      });
      return items;
    }

    // 1. Fixed class equipment
    if (primaryClassDef.fixedEquipment) {
      primaryClassDef.fixedEquipment.forEach((fe, idx) => {
        items.push({
          id: `fixed-${idx}-${fe.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
          name: fe.name,
          category: fe.category,
          quantity: fe.quantity,
          weight: 3,
          equipped: fe.category === "armor" || fe.category === "shield" || fe.category === "weapon",
          equippedSlot: fe.category === "armor" ? "armor" : fe.category === "shield" ? "shield" : "mainHand",
          baseAc: fe.baseAc,
          maxDexMod: fe.maxDexMod,
          damage: fe.damage,
          damageType: fe.damageType,
          properties: fe.properties,
          range: fe.range,
        });
      });
    }

    // 2. Chosen class equipment options
    if (primaryClassDef.startingEquipmentChoices) {
      primaryClassDef.startingEquipmentChoices.forEach((ch) => {
        const selectedOptIdx = equipmentSelections[ch.id] || 0;
        const opt = ch.options[selectedOptIdx] || ch.options[0];
        if (opt) {
          opt.items.forEach((it, idx) => {
            items.push({
              id: `choice-${ch.id}-${idx}`,
              name: it.name,
              category: it.category,
              quantity: it.quantity,
              weight: 3,
              equipped: it.category === "armor" || it.category === "shield" || it.category === "weapon",
              equippedSlot: it.category === "armor" ? "armor" : it.category === "shield" ? "shield" : "mainHand",
              baseAc: it.baseAc,
              maxDexMod: it.maxDexMod,
              damage: it.damage,
              damageType: it.damageType,
              properties: it.properties,
              range: it.range,
            });
          });
        }
      });
    }

    // 3. Background starting equipment
    bgDef.startingEquipment.forEach((bgItem, idx) => {
      items.push({
        id: `bg-item-${idx}`,
        name: bgItem,
        category: "gear",
        quantity: 1,
        weight: 1,
      });
    });

    // 4. Background starting gold
    if (bgDef.startingGold > 0) {
      items.push({
        id: "item-bg-gold",
        name: `Coin Pouch (${bgDef.startingGold} gp)`,
        category: "gear",
        quantity: 1,
        weight: 1,
      });
    }

    return items;
  }, [primaryClassDef, equipmentSelections, bgDef, useStartingGold, customGold]);

  // AC Calculation
  const armorItem = startingEquipmentBundle.find((i) => i.category === "armor" && i.equipped);
  const shieldItem = startingEquipmentBundle.find((i) => i.category === "shield" && i.equipped);
  const acCalc = useMemo(() => {
    return calculateArmorClass(
      finalStats,
      combinedClasses,
      armorItem ? { name: armorItem.name, baseAc: armorItem.baseAc || 11, category: armorItem.name.includes("Chain") ? "heavy" : armorItem.name.includes("Scale") ? "medium" : "light" } : undefined,
      shieldItem ? { name: shieldItem.name, baseAc: shieldItem.baseAc || 2 } : undefined,
      0,
      undefined,
      selectedRace
    );
  }, [finalStats, combinedClasses, armorItem, shieldItem, selectedRace]);

  // Handle Save
  const handleFinish = async () => {
    setSaving(true);
    try {
      const equippedWeapons = startingEquipmentBundle.filter((i) => i.category === "weapon" && i.equipped);
      const attacks = equippedWeapons.map((wpn, idx) => {
        const isFinesse = wpn.properties?.includes("finesse");
        const mod = isFinesse ? Math.max(calcModifier(finalStats.str), calcModifier(finalStats.dex)) : calcModifier(finalStats.str);
        const toHit = pb + mod;
        return {
          id: `atk-${idx + 1}`,
          name: wpn.name,
          atkBonus: formatModifier(toHit),
          damage: `${wpn.damage || "1d8"}${formatModifier(mod)} ${wpn.damageType || ""}`,
          notes: wpn.properties?.join(", ") || "",
        };
      });

      // Saving Throws
      const savingThrows: Record<string, boolean> = {};
      primaryClassDef.savingThrows.forEach((st) => {
        savingThrows[st] = true;
      });

      // Skills mapping
      const skills: Record<string, number> = {};
      innateSkills.forEach((s) => (skills[s] = 1));
      chosenClassSkills.forEach((s) => (skills[s] = 1));

      // Class features
      const featureList: Array<{ id: string; name: string; source: string; level: number; description: string }> = [];
      combinedClasses.forEach((c) => {
        const def = CLASSES_5E[c.className];
        if (def) {
          def.features
            .filter((f) => f.level <= c.level)
            .forEach((f, idx) => {
              featureList.push({
                id: `feat-${c.className}-${f.level}-${idx}`,
                name: f.name,
                source: `${c.className} ${f.level}`,
                level: f.level,
                description: f.description,
              });
            });
        }
      });

      // Feat feature if chosen
      if (hasRacialFeat) {
        const f = FEATS_5E.find((x) => x.id === selectedFeatId);
        if (f) {
          featureList.push({
            id: `feat-racial-${f.id}`,
            name: `Feat: ${f.name}`,
            source: selectedRace === "Custom Lineage" ? "Custom Lineage" : "Variant Human",
            level: 1,
            description: f.description,
          });
        }
      }

      // Spell slots
      const spellSlots = calcMulticlassSpellSlots(combinedClasses);
      const warlockLevel = combinedClasses.find((c) => c.className === "Warlock")?.level || 0;
      const pactSlots = warlockLevel > 0 ? { level: calcWarlockPactSlots(warlockLevel).slotLevel, total: calcWarlockPactSlots(warlockLevel).count, used: 0 } : undefined;

      // Spells list
      const spells: SpellItemData[] = [];
      selectedCantrips.forEach((id) => {
        const s = SPELLS_5E.find((x) => x.id === id);
        if (s) spells.push({ ...s, prepared: true });
      });
      selectedSpells.forEach((id) => {
        const s = SPELLS_5E.find((x) => x.id === id);
        if (s) spells.push({ ...s, prepared: true });
      });

      // Hit dice total string
      const hitDiceTotal = combinedClasses.map((c) => `${c.level}${c.hitDie}`).join(" + ");

      const newSheet: CharacterSheetData = {
        userId,
        name: characterName,
        character: characterName,
        class: primaryClass,
        subclass: primarySubclass || primaryClassDef.subclasses[0]?.name,
        level: totalLevel,
        classes: combinedClasses,
        race: selectedRace,
        subrace: subraceDef?.name,
        customLineage: selectedRace === "Custom Lineage",
        background: selectedBackground,
        alignment,
        xp: 0,
        inspiration: false,
        stats: finalStats,
        savingThrows,
        hpCurrent: hpResult.hpMax,
        hpMax: hpResult.hpMax,
        hpTemp: 0,
        ac: acCalc.ac,
        speed: raceDef.speed,
        initiativeBonus: calcModifier(finalStats.dex),
        hitDiceTotal,
        hitDiceCurrent: totalLevel,
        deathSaves: { successes: 0, failures: 0 },
        skills,
        languages: finalLanguages,
        toolProficiencies: bgDef.tools || [],
        armorProficiencies: primaryClassDef.armorProficiencies,
        weaponProficiencies: primaryClassDef.weaponProficiencies,
        attacks,
        inventoryItems: startingEquipmentBundle,
        equipped: {
          armorId: armorItem?.id,
          shieldId: shieldItem?.id,
          mainHandId: equippedWeapons[0]?.id,
        },
        spellcastingAbility: primaryClassDef.spellcastingAbility || "none",
        spellSlots: {
          1: { total: spellSlots[1] || 0, used: 0 },
          2: { total: spellSlots[2] || 0, used: 0 },
          3: { total: spellSlots[3] || 0, used: 0 },
          4: { total: spellSlots[4] || 0, used: 0 },
          5: { total: spellSlots[5] || 0, used: 0 },
          6: { total: spellSlots[6] || 0, used: 0 },
          7: { total: spellSlots[7] || 0, used: 0 },
          8: { total: spellSlots[8] || 0, used: 0 },
          9: { total: spellSlots[9] || 0, used: 0 },
        },
        pactSlots,
        spells,
        featureList,
        features: featureList.map((f) => `${f.name}: ${f.description}`).join("\n\n"),
        inventory: startingEquipmentBundle.map((i) => `${i.name} (x${i.quantity})`).join(", "),
        companions: [],
        notes: `Created with Enhanced 5e Character Builder. Alignment: ${alignment}.`,
        updatedAt: Date.now(),
      };

      await onSave(newSheet);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-stone-900 border border-amber-600/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-stone-950 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-stone-950 font-bold shadow-lg shadow-amber-900/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-amber-100 flex items-center gap-2">
                <span>D&D 5e Character Builder Wizard</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-sans border border-amber-500/30">
                  Level {totalLevel}
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                Step {step} of 9:{" "}
                {step === 1 && "Class, Level & Multiclassing"}
                {step === 2 && "Ability Scores (Array / Point Buy / 4d6 Roll / Table)"}
                {step === 3 && "Race, Heritage & Flexible ASI"}
                {step === 4 && "Background & Alignment"}
                {step === 5 && "Proficiencies & Languages Guide"}
                {step === 6 && "Feats & Ability Score Improvements"}
                {step === 7 && "Equipment Packages & Starting Wealth"}
                {step === 8 && "Spellbook & Prepared Spells"}
                {step === 9 && "Review & Finalize"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Step Progress Tracker */}
        <div className="grid grid-cols-9 border-b border-stone-800 text-[11px] overflow-x-auto bg-stone-950/60">
          {[
            { num: 1, label: "Class & Lvl" },
            { num: 2, label: "Abilities" },
            { num: 3, label: "Race" },
            { num: 4, label: "Background" },
            { num: 5, label: "Proficiencies" },
            { num: 6, label: "Feats" },
            { num: 7, label: "Equipment" },
            { num: 8, label: "Spells" },
            { num: 9, label: "Review" },
          ].map((s) => (
            <button
              key={s.num}
              onClick={() => setStep(s.num)}
              className={`py-2 px-1 flex flex-col sm:flex-row items-center justify-center gap-1 border-r last:border-r-0 border-stone-800 transition-colors ${
                step === s.num
                  ? "bg-amber-600/25 text-amber-300 font-bold border-b-2 border-b-amber-500"
                  : step > s.num
                  ? "text-stone-300 hover:bg-stone-800/40"
                  : "text-stone-500 hover:bg-stone-800/20"
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  step === s.num
                    ? "bg-amber-500 text-stone-950 font-bold"
                    : step > s.num
                    ? "bg-emerald-600 text-white"
                    : "bg-stone-800 text-stone-400"
                }`}
              >
                {step > s.num ? "✓" : s.num}
              </span>
              <span className="hidden md:inline truncate">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Step Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* ============================================================== */}
          {/* STEP 1: CLASS, STARTING LEVEL & MULTICLASSING                  */}
          {/* ============================================================== */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
                    Character Name
                  </label>
                  <input
                    type="text"
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    placeholder="e.g. Cedric the Stalwart"
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-4 py-2.5 text-stone-100 font-serif text-lg focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
                    Starting Level (1–20)
                  </label>
                  <select
                    value={startingLevel}
                    onChange={(e) => {
                      const lvl = parseInt(e.target.value, 10) || 1;
                      setStartingLevel(lvl);
                    }}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-4 py-2.5 text-stone-100 font-mono font-bold text-base focus:outline-none focus:border-amber-500"
                  >
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((lvl) => (
                      <option key={lvl} value={lvl}>
                        Level {lvl} ({lvl === 1 ? "Beginner" : lvl < 5 ? "Tier 1: Local Hero" : lvl < 11 ? "Tier 2: Realm Hero" : lvl < 17 ? "Tier 3: Master" : "Tier 4: Legend"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Primary Class Selection */}
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
                  Select Primary Class
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {Object.keys(CLASSES_5E).map((cName) => {
                    const cls = CLASSES_5E[cName];
                    const isSelected = primaryClass === cName;
                    return (
                      <button
                        key={cName}
                        type="button"
                        onClick={() => {
                          setPrimaryClass(cName);
                          setPrimarySubclass(cls.subclasses[0]?.name || "");
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "bg-amber-600/20 border-amber-500 shadow-md shadow-amber-900/30"
                            : "bg-stone-950/60 border-stone-800 hover:border-stone-700 hover:bg-stone-800/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-serif font-bold text-sm ${isSelected ? "text-amber-300" : "text-stone-200"}`}>
                            {cls.name}
                          </span>
                          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-stone-800 text-stone-400">
                            {cls.hitDie}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-400 mt-1 truncate">{cls.primaryAbility}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subclass Selection if Level >= Subclass Requirement */}
              {combinedClasses[0]?.level >= primaryClassDef.subclassLevel && (
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-600/40 space-y-3">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>Choose Primary Subclass ({primaryClass} Level {combinedClasses[0].level} &ge; {primaryClassDef.subclassLevel})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {primaryClassDef.subclasses.map((sub) => {
                      const isSubSelected = primarySubclass === sub.name || (!primarySubclass && primaryClassDef.subclasses[0]?.name === sub.name);
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setPrimarySubclass(sub.name)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            isSubSelected
                              ? "bg-amber-600/25 border-amber-500 shadow"
                              : "bg-stone-950 border-stone-800 hover:border-stone-700"
                          }`}
                        >
                          <div className="font-serif font-bold text-sm text-amber-200">{sub.name}</div>
                          <p className="text-xs text-stone-400 mt-1 line-clamp-2">{sub.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Multiclassing Section (Active if Level > 1) */}
              {startingLevel > 1 && (
                <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-stone-200 flex items-center gap-2">
                        <Swords className="w-4 h-4 text-amber-400" />
                        <span>Multiclassing Level Distribution</span>
                      </h4>
                      <p className="text-xs text-stone-400">
                        Allocate your {startingLevel} starting levels across classes.
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-stone-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dmOverride}
                        onChange={(e) => setDmOverride(e.target.checked)}
                        className="rounded border-stone-700 bg-stone-900 text-amber-600 focus:ring-0"
                      />
                      <span>DM Override (Ignore Prereqs)</span>
                    </label>
                  </div>

                  {/* Level breakdown list */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-stone-900/80 border border-stone-800 text-xs">
                      <div className="font-bold text-stone-200 font-serif">
                        {primaryClass} (Primary Class)
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-stone-400">Level:</span>
                        <span className="font-mono font-bold text-amber-300 text-sm">
                          {combinedClasses[0]?.level}
                        </span>
                      </div>
                    </div>

                    {multiclassEntries.map((mc, idx) => {
                      const mcDef = CLASSES_5E[mc.className];
                      return (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-stone-900/80 border border-stone-800 text-xs gap-2">
                          <div className="flex items-center gap-2">
                            <select
                              value={mc.className}
                              onChange={(e) => {
                                const nextClass = e.target.value;
                                setMulticlassEntries((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, className: nextClass, subclass: CLASSES_5E[nextClass]?.subclasses[0]?.name } : item))
                                );
                              }}
                              className="bg-stone-950 border border-stone-700 rounded px-2 py-1 text-stone-200"
                            >
                              {Object.keys(CLASSES_5E).filter((c) => c !== primaryClass).map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                            {mcDef && mc.level >= mcDef.subclassLevel && (
                              <select
                                value={mc.subclass || mcDef.subclasses[0]?.name}
                                onChange={(e) => {
                                  const sub = e.target.value;
                                  setMulticlassEntries((prev) =>
                                    prev.map((item, i) => (i === idx ? { ...item, subclass: sub } : item))
                                  );
                                }}
                                className="bg-stone-950 border border-amber-600/40 rounded px-2 py-1 text-amber-300"
                              >
                                {mcDef.subclasses.map((s) => (
                                  <option key={s.id} value={s.name}>{s.name}</option>
                                ))}
                              </select>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-stone-400">Level:</span>
                              <input
                                type="number"
                                min={1}
                                max={startingLevel - 1}
                                value={mc.level}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10) || 1;
                                  setMulticlassEntries((prev) =>
                                    prev.map((item, i) => (i === idx ? { ...item, level: val } : item))
                                  );
                                }}
                                className="w-12 bg-stone-950 border border-stone-700 rounded px-1.5 py-0.5 text-center font-mono text-amber-300"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setMulticlassEntries((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-stone-400 hover:text-red-400 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Multiclass Button */}
                  {multiclassEntries.length < 3 && (
                    <button
                      type="button"
                      onClick={() => {
                        const available = Object.keys(CLASSES_5E).find(
                          (c) => c !== primaryClass && !multiclassEntries.some((m) => m.className === c)
                        );
                        if (available) {
                          setMulticlassEntries((prev) => [
                            ...prev,
                            { className: available, level: 1, subclass: CLASSES_5E[available]?.subclasses[0]?.name },
                          ]);
                        }
                      }}
                      className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Another Class
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 2: ABILITY SCORES                                         */}
          {/* ============================================================== */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-stone-200">
                    Ability Score Method
                  </h3>
                  <p className="text-xs text-stone-400">
                    Choose Standard Array, Point Buy, 4d6 Roll (with animation), or Table Roll.
                  </p>
                </div>
                <div className="flex flex-wrap rounded-xl bg-stone-950 p-1 border border-stone-800 text-xs">
                  <button
                    onClick={() => handleStatModeChange("standard")}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      statMode === "standard" ? "bg-amber-600 text-stone-950 font-bold" : "text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    Standard Array
                  </button>
                  <button
                    onClick={() => handleStatModeChange("pointbuy")}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      statMode === "pointbuy" ? "bg-amber-600 text-stone-950 font-bold" : "text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    Point Buy
                  </button>
                  <button
                    onClick={() => handleStatModeChange("roll")}
                    className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                      statMode === "roll" ? "bg-amber-600 text-stone-950 font-bold" : "text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    <Dices className="w-3.5 h-3.5" />
                    Roll 4d6
                  </button>
                  <button
                    onClick={() => handleStatModeChange("manual")}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      statMode === "manual" ? "bg-amber-600 text-stone-950 font-bold" : "text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    Table Roll
                  </button>
                </div>
              </div>

              {/* STANDARD ARRAY INTERACTIVE ALLOCATION BOARD */}
              {statMode === "standard" && (
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-600/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                      <Info className="w-4 h-4" />
                      <span>5e Standard Array Score Allocation</span>
                    </div>
                    <span className="text-[11px] text-stone-400">
                      Preset: <strong className="text-amber-300 font-mono">15, 14, 13, 12, 10, 8</strong>
                    </span>
                  </div>
                  <p className="text-xs text-stone-300">
                    Assign each of the six official scores to an ability. Selecting a score below automatically swaps values between abilities so each number is used exactly once.
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                    {STANDARD_ARRAY.map((val) => {
                      const assignedStat = (Object.keys(baseStats) as StatKey[]).find((s) => baseStats[s] === val);
                      return (
                        <div
                          key={val}
                          className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                            assignedStat
                              ? "bg-stone-900/90 border-amber-500/60 shadow-sm"
                              : "bg-stone-900/40 border-stone-800 text-stone-500"
                          }`}
                        >
                          <span className="text-lg font-mono font-bold text-amber-300">{val}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                              assignedStat
                                ? "bg-amber-500 text-stone-950 shadow"
                                : "bg-stone-800 text-stone-400"
                            }`}
                          >
                            {assignedStat ? STAT_NAMES[assignedStat].slice(0, 3) : "Free"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* POINT BUY COST TABLE & BUDGET BAR */}
              {statMode === "pointbuy" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs">
                    <div>
                      <span className="text-stone-400">Budget: </span>
                      <span className={`font-bold font-mono text-sm ${pointBuySpent > 27 ? "text-red-400" : "text-amber-300"}`}>
                        {pointBuySpent} / 27 Points
                      </span>
                    </div>
                    <span className="text-stone-400">
                      {27 - pointBuySpent >= 0 ? `${27 - pointBuySpent} points remaining` : `${pointBuySpent - 27} points over budget!`}
                    </span>
                  </div>

                  {/* Point Buy Cost Table */}
                  <div className="p-3 rounded-xl bg-stone-950/80 border border-stone-800 space-y-1.5 text-xs">
                    <div className="text-amber-400 font-semibold text-[11px] uppercase tracking-wider">
                      5e Point Buy Cost Table (Cost increases at higher tiers)
                    </div>
                    <div className="grid grid-cols-8 gap-1 text-center font-mono">
                      {[8, 9, 10, 11, 12, 13, 14, 15].map((score) => (
                        <div key={score} className="p-1 rounded bg-stone-900 border border-stone-800">
                          <div className="text-[10px] text-stone-400">Score {score}</div>
                          <div className="font-bold text-amber-300">{POINT_BUY_COST_TABLE[score].cost} pts</div>
                          {score >= 14 && <div className="text-[9px] text-amber-400">+2 cost</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ROLL 4D6 ANIMATION & ASSIGNMENT STATION */}
              {statMode === "roll" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-stone-950 border border-stone-800 gap-3">
                    <div>
                      <div className="text-xs font-semibold text-stone-200">
                        Rolled Pool (4d6 drop lowest for each stat)
                      </div>
                      <p className="text-[11px] text-stone-400">
                        Each roll consists of 4 dice, with the lowest die discarded.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-stone-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={assignFreely}
                          onChange={(e) => setAssignFreely(e.target.checked)}
                          className="rounded border-stone-700 bg-stone-900 text-amber-600 focus:ring-0"
                        />
                        <span>Assign Rolls Freely (Custom)</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleRollStats}
                        disabled={isRollingAnimation}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs transition-all ${
                          isRollingAnimation ? "animate-spin opacity-70" : ""
                        }`}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRollingAnimation ? "animate-spin" : ""}`} />
                        {isRollingAnimation ? "Rolling 4d6..." : "Roll All 6 Stats"}
                      </button>
                    </div>
                  </div>

                  {/* Rolled Dice Breakdown Card */}
                  {rolledPool.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                      {rolledPool.map((r, i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-center space-y-1">
                          <div className="text-[10px] text-stone-500 uppercase font-mono">Roll #{i + 1}</div>
                          <div className="font-mono font-bold text-lg text-amber-300">{r.total}</div>
                          <div className="flex justify-center gap-1 text-[11px] font-mono text-stone-400">
                            {r.rolls.map((die, dIdx) => {
                              const isDropped = die === r.dropped && dIdx === 0;
                              return (
                                <span
                                  key={dIdx}
                                  className={isDropped ? "line-through text-red-500/70 font-semibold" : "text-stone-200"}
                                >
                                  {die}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* MANUAL TABLE ROLL MODE */}
              {statMode === "manual" && (
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-600/40 space-y-2 text-xs text-stone-300">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold">
                    <Dice5 className="w-4 h-4" />
                    <span>Manual Table Rolls</span>
                  </div>
                  <p>
                    Roll your physical dice at the game table with your DM, then type each final score into the base boxes below.
                  </p>
                </div>
              )}

              {/* 6 ABILITY SCORE CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {STAT_KEYS.map((stat) => {
                  const base = baseStats[stat];
                  const bonus = racialBonuses[stat] || 0;
                  const featBonus = featStatBoost[stat] || 0;
                  const total = finalStats[stat];
                  const mod = calcModifier(total);
                  const isPrimary = primaryClassDef.primaryAbility.toLowerCase().includes(stat);

                  return (
                    <div
                      key={stat}
                      className={`p-3.5 rounded-xl border bg-stone-950/70 space-y-2.5 ${
                        isPrimary ? "border-amber-500/60 ring-1 ring-amber-500/20" : "border-stone-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-serif font-bold text-stone-200">{STAT_NAMES[stat]}</span>
                          {isPrimary && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                              Primary
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-bold text-lg text-amber-400">{formatModifier(mod)}</span>
                      </div>

                      {/* Base stat selection input */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-stone-400">Base:</span>
                        {statMode === "standard" ? (
                          <select
                            value={base}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              handleStandardArrayChange(stat, val);
                            }}
                            className="bg-stone-900 border border-stone-700 rounded px-2 py-1 text-center font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                          >
                            {STANDARD_ARRAY.map((v) => {
                              const other = (Object.keys(baseStats) as StatKey[]).find(
                                (s) => baseStats[s] === v && s !== stat
                              );
                              return (
                                <option key={v} value={v}>
                                  {v} {other ? `(Swaps with ${STAT_NAMES[other].slice(0, 3)})` : v === base ? "(Current)" : ""}
                                </option>
                              );
                            })}
                          </select>
                        ) : statMode === "pointbuy" ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={base <= 8}
                              onClick={() => setBaseStats((prev) => ({ ...prev, [stat]: prev[stat] - 1 }))}
                              className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-stone-200 font-bold"
                            >
                              -
                            </button>
                            <span className="font-mono font-bold w-6 text-center text-stone-200">{base}</span>
                            <button
                              type="button"
                              disabled={base >= 15}
                              onClick={() => setBaseStats((prev) => ({ ...prev, [stat]: prev[stat] + 1 }))}
                              className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-stone-200 font-bold"
                            >
                              +
                            </button>
                          </div>
                        ) : statMode === "roll" && assignFreely && rolledPool.length === 6 ? (
                          <select
                            value={base}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setBaseStats((prev) => ({ ...prev, [stat]: val }));
                            }}
                            className="bg-stone-900 border border-stone-700 rounded px-2 py-1 text-center font-mono font-bold text-amber-300"
                          >
                            {rolledPool.map((r, i) => (
                              <option key={i} value={r.total}>
                                Roll #{i + 1} ({r.total})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="number"
                            min={3}
                            max={20}
                            value={base}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10) || 10;
                              setBaseStats((prev) => ({ ...prev, [stat]: val }));
                              setManualInputs((prev) => ({ ...prev, [stat]: val }));
                            }}
                            className="w-14 bg-stone-900 border border-stone-700 rounded px-2 py-0.5 text-center font-mono text-stone-100"
                          />
                        )}
                      </div>

                      {/* Racial bonus breakdown */}
                      <div className="flex items-center justify-between text-[11px] text-stone-400 border-t border-stone-800/80 pt-1.5">
                        <span>Racial Bonus:</span>
                        <span className={bonus > 0 ? "text-emerald-400 font-mono font-bold" : "text-stone-500 font-mono"}>
                          {bonus > 0 ? `+${bonus}` : "0"}
                        </span>
                      </div>

                      {featBonus > 0 && (
                        <div className="flex items-center justify-between text-[11px] text-stone-400">
                          <span>Feat Bonus:</span>
                          <span className="text-cyan-400 font-mono font-bold">+{featBonus}</span>
                        </div>
                      )}

                      {/* Total score */}
                      <div className="flex items-center justify-between text-xs font-semibold text-stone-300 border-t border-stone-800/80 pt-1.5">
                        <span>Total Score:</span>
                        <span className="font-mono text-amber-300 font-bold text-sm">{total}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 3: RACE & HERITAGE                                        */}
          {/* ============================================================== */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-stone-200">Select Race / Species</h3>
                  <p className="text-xs text-stone-400">Choose your lineage and assign your racial bonuses.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Search race..."
                      value={raceSearch}
                      onChange={(e) => setRaceSearch(e.target.value)}
                      className="bg-stone-950 border border-stone-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500 w-36 sm:w-44"
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-stone-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showAllRaces}
                      onChange={(e) => setShowAllRaces(e.target.checked)}
                      className="rounded border-stone-700 bg-stone-900 text-amber-600 focus:ring-0"
                    />
                    <span>All 2014 Sources</span>
                  </label>
                </div>
              </div>

              {/* Race Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {Object.keys(RACES_5E)
                  .filter((rName) => {
                    const r = RACES_5E[rName];
                    if (!showAllRaces && r.isExpanded) return false;
                    if (raceSearch && !r.name.toLowerCase().includes(raceSearch.toLowerCase())) return false;
                    return true;
                  })
                  .map((rName) => {
                    const r = RACES_5E[rName];
                    const isSelected = selectedRace === rName;
                    return (
                      <button
                        key={rName}
                        type="button"
                        onClick={() => {
                          setSelectedRace(rName);
                          if (r.subraces.length > 0) {
                            setSelectedSubrace(r.subraces[0].id);
                          } else {
                            setSelectedSubrace("");
                          }
                          setFlexibleBonuses({});
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "bg-amber-600/20 border-amber-500 shadow-md shadow-amber-900/30"
                            : "bg-stone-950/60 border-stone-800 hover:border-stone-700 hover:bg-stone-800/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-serif font-bold text-sm ${isSelected ? "text-amber-300" : "text-stone-200"}`}>
                            {r.name}
                          </span>
                          <span className="text-[10px] px-1 py-0.5 rounded bg-stone-800 text-stone-400">
                            {r.source}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-400 mt-1">Speed: {r.speed} ft</div>
                      </button>
                    );
                  })}
              </div>

              {/* Subrace Picker if applicable */}
              {raceDef.subraces.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider">
                    Subrace / Heritage
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {raceDef.subraces.map((sr) => {
                      const isSelected = selectedSubrace === sr.id;
                      return (
                        <button
                          key={sr.id}
                          type="button"
                          onClick={() => setSelectedSubrace(sr.id)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            isSelected ? "bg-amber-600/20 border-amber-500" : "bg-stone-950/60 border-stone-800 hover:bg-stone-800/40"
                          }`}
                        >
                          <div className="font-serif font-bold text-sm text-stone-200">{sr.name}</div>
                          <p className="text-xs text-stone-400 mt-1">{sr.traits.map((t) => t.name).join(", ")}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CUSTOM LINEAGE OPTIONS (TASHA'S) */}
              {selectedRace === "Custom Lineage" && (
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-600/40 space-y-4 text-xs">
                  <div className="text-amber-300 font-semibold text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Custom Lineage Configuration</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-stone-400 mb-1">Character Size:</label>
                      <div className="flex gap-2">
                        {(["Medium", "Small"] as const).map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setCustomLineageSize(sz)}
                            className={`px-3 py-1.5 rounded-lg border ${
                              customLineageSize === sz ? "bg-amber-600 text-stone-950 font-bold border-amber-500" : "bg-stone-900 border-stone-700 text-stone-300"
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-stone-400 mb-1">Variable Perk:</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setCustomLineagePerk("darkvision")}
                          className={`px-3 py-1.5 rounded-lg border ${
                            customLineagePerk === "darkvision" ? "bg-amber-600 text-stone-950 font-bold border-amber-500" : "bg-stone-900 border-stone-700 text-stone-300"
                          }`}
                        >
                          Darkvision (60 ft)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomLineagePerk("skill")}
                          className={`px-3 py-1.5 rounded-lg border ${
                            customLineagePerk === "skill" ? "bg-amber-600 text-stone-950 font-bold border-amber-500" : "bg-stone-900 border-stone-700 text-stone-300"
                          }`}
                        >
                          Extra Skill
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* DEDICATED FLEXIBLE ABILITY SCORE ASSIGNER */}
              {(raceDef.hasFlexibleBonuses || selectedSubrace === "variant_human" || selectedRace === "Custom Lineage") && (
                <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
                  <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-4 h-4" />
                    <span>Assign Flexible Ability Score Increase</span>
                  </div>
                  <p className="text-xs text-stone-300">
                    {selectedRace === "Custom Lineage" && "Custom Lineage grants +2 to one ability score of your choice."}
                    {selectedSubrace === "variant_human" && "Variant Human grants +1 to two different ability scores of your choice."}
                    {selectedRace === "Half-Elf" && "Half-Elf grants +2 Charisma, and +1 to two other distinct ability scores."}
                    {selectedRace === "Changeling" && "Changeling grants +2 Charisma, and +1 to any other ability score."}
                    {selectedRace === "Warforged" && "Warforged grants +2 Constitution, and +1 to any other ability score."}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                    {STAT_KEYS.filter((st) => !raceDef.flexibleBonusDisallowed?.includes(st)).map((st) => {
                      const currentVal = flexibleBonuses[st] || 0;
                      return (
                        <div key={st} className="p-2.5 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-between text-xs">
                          <span className="font-semibold text-stone-200">{STAT_NAMES[st]}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={currentVal <= 0}
                              onClick={() => setFlexibleBonuses((prev) => ({ ...prev, [st]: Math.max(0, (prev[st] || 0) - 1) }))}
                              className="w-5 h-5 rounded bg-stone-800 disabled:opacity-30 text-stone-200 font-bold"
                            >
                              -
                            </button>
                            <span className="font-mono font-bold text-amber-300 w-5 text-center">+{currentVal}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const maxAllowed = selectedRace === "Custom Lineage" ? 2 : 1;
                                setFlexibleBonuses((prev) => ({ ...prev, [st]: Math.min(maxAllowed, (prev[st] || 0) + 1) }));
                              }}
                              className="w-5 h-5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Racial Traits Showcase */}
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2 text-xs">
                <div className="font-semibold text-amber-400 uppercase tracking-wider">
                  Racial Traits & Heritage Features
                </div>
                <div className="space-y-1.5">
                  {raceDef.traits.map((tr, idx) => (
                    <div key={idx} className="text-stone-300">
                      <strong className="text-amber-200">{tr.name}:</strong> {tr.description}
                    </div>
                  ))}
                  {subraceDef?.traits.map((tr, idx) => (
                    <div key={`sub-${idx}`} className="text-stone-300">
                      <strong className="text-amber-200">{tr.name}:</strong> {tr.description}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 4: BACKGROUND & ALIGNMENT                                 */}
          {/* ============================================================== */}
          {step === 4 && (
            <div className="space-y-6">
              {/* Moral Alignment */}
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
                  Moral Alignment
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ALIGNMENTS.map((align) => (
                    <button
                      key={align.name}
                      type="button"
                      onClick={() => setAlignment(align.name)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        alignment === align.name
                          ? "bg-amber-600/20 border-amber-500 shadow"
                          : "bg-stone-950 border-stone-800 hover:border-stone-700"
                      }`}
                    >
                      <div className={`font-serif font-bold text-xs ${alignment === align.name ? "text-amber-300" : "text-stone-300"}`}>
                        {align.name}
                      </div>
                      <p className="text-[10px] text-stone-400 mt-0.5 line-clamp-1">{align.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider">
                    Select Background (All 2014 Sources)
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Search background..."
                      value={bgSearch}
                      onChange={(e) => setBgSearch(e.target.value)}
                      className="bg-stone-950 border border-stone-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500 w-44"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {Object.keys(BACKGROUNDS_5E)
                    .filter((bgName) => !bgSearch || bgName.toLowerCase().includes(bgSearch.toLowerCase()))
                    .map((bgName) => {
                      const bg = BACKGROUNDS_5E[bgName];
                      const isSelected = selectedBackground === bgName;
                      return (
                        <button
                          key={bgName}
                          type="button"
                          onClick={() => setSelectedBackground(bgName)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "bg-amber-600/20 border-amber-500 shadow-md shadow-amber-900/30"
                              : "bg-stone-950/60 border-stone-800 hover:border-stone-700 hover:bg-stone-800/40"
                          }`}
                        >
                          <div className="font-serif font-bold text-sm text-stone-200 truncate">{bg.name}</div>
                          <div className="text-[10px] text-stone-400 mt-1 truncate">
                            Skills: {bg.skills.join(", ")}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Background Feature Details */}
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2 text-xs">
                <div className="text-amber-400 font-semibold">
                  Background Feature: {bgDef.featureName}
                </div>
                <p className="text-stone-300 leading-relaxed">{bgDef.featureDescription}</p>
                <div className="pt-2 text-stone-400 border-t border-stone-800 flex gap-4">
                  <div>
                    <span className="text-stone-500">Starting Gold:</span>{" "}
                    <span className="font-mono text-amber-300">{bgDef.startingGold} gp</span>
                  </div>
                  {bgDef.tools && (
                    <div>
                      <span className="text-stone-500">Tools:</span>{" "}
                      <span className="text-stone-300">{bgDef.tools.join(", ")}</span>
                    </div>
                  )}
                  {bgDef.languages && (
                    <div>
                      <span className="text-stone-500">Bonus Languages:</span>{" "}
                      <span className="text-amber-300 font-mono">+{bgDef.languages}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 5: PROFICIENCIES & LANGUAGES                              */}
          {/* ============================================================== */}
          {step === 5 && (
            <div className="space-y-6">
              {/* Skill Proficiencies Guide */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-stone-200">Skill Proficiencies Guide</h3>
                    <p className="text-xs text-stone-400">
                      Review skills from your background/race and pick your class skills.
                    </p>
                  </div>
                  <div className="text-xs px-2.5 py-1 rounded-lg bg-stone-950 border border-stone-800 text-stone-300">
                    Class Picks:{" "}
                    <span className="font-mono font-bold text-amber-400">
                      {chosenClassSkills.length} / {primaryClassDef.skillChoices?.count || 2}
                    </span>
                  </div>
                </div>

                {/* 5e Duplicate Rule Helper */}
                <div className="text-xs text-amber-300 bg-amber-950/20 px-3 py-2 rounded-lg border border-amber-900/40 flex items-center gap-2">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>
                    <strong>5e Rule:</strong> Skills already granted by your Background ({bgDef.name}) or Race are locked in. If a background gives a duplicate skill, you can pick any other skill.
                  </span>
                </div>

                {/* Skill Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {ALL_SKILLS_5E.map((sk) => {
                    const isInnate = innateSkills.includes(sk.id);
                    const isClassAvailable = primaryClassDef.skillChoices?.availableSkills.includes(sk.id);
                    const isChosenClass = chosenClassSkills.includes(sk.id);
                    const isChecked = isInnate || isChosenClass;

                    return (
                      <button
                        key={sk.id}
                        type="button"
                        disabled={isInnate || (!isChecked && chosenClassSkills.length >= (primaryClassDef.skillChoices?.count || 2))}
                        onClick={() => {
                          if (isInnate) return;
                          if (isChosenClass) {
                            setChosenClassSkills((prev) => prev.filter((s) => s !== sk.id));
                          } else {
                            if (chosenClassSkills.length < (primaryClassDef.skillChoices?.count || 2)) {
                              setChosenClassSkills((prev) => [...prev, sk.id]);
                            }
                          }
                        }}
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                          isInnate
                            ? "bg-stone-900/90 border-emerald-600/50 text-emerald-300 cursor-default"
                            : isChosenClass
                            ? "bg-amber-600/20 border-amber-500 text-amber-200"
                            : isClassAvailable
                            ? "bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700"
                            : "bg-stone-950/40 border-stone-900 text-stone-600 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isChecked ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4 text-stone-600" />}
                          <span className="font-semibold">{sk.name}</span>
                          <span className="text-[10px] font-mono text-stone-500 uppercase">({sk.stat})</span>
                        </div>
                        {isInnate && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                            Source
                          </span>
                        )}
                        {!isInnate && isClassAvailable && (
                          <span className="text-[10px] text-stone-500 font-mono">Class</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Languages Selection */}
              <div className="space-y-3 pt-3 border-t border-stone-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-stone-200">Known Languages</h4>
                    <p className="text-xs text-stone-400">
                      Standard and bonus languages from your race and background.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-3 text-xs">
                  <div>
                    <span className="text-stone-400 font-semibold">Innate Languages:</span>{" "}
                    <span className="text-amber-300 font-mono">{raceDef.languages.join(", ") || "Common"}</span>
                  </div>

                  {/* Race extra languages picker */}
                  {(raceDef.extraLanguagesCount || subraceDef?.extraLanguages) ? (
                    <div className="space-y-1">
                      <label className="text-stone-300 font-semibold">
                        Racial Bonus Language ({raceDef.name}):
                      </label>
                      <select
                        value={chosenRaceLanguages[0] || "Elvish"}
                        onChange={(e) => setChosenRaceLanguages([e.target.value])}
                        className="bg-stone-900 border border-stone-700 rounded px-3 py-1.5 text-stone-200 w-full sm:w-64"
                      >
                        {STANDARD_AND_EXOTIC_LANGUAGES.filter((l) => !raceDef.languages.includes(l)).map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  {/* Background extra languages picker */}
                  {bgDef.languages && bgDef.languages > 0 ? (
                    <div className="space-y-2">
                      <label className="text-stone-300 font-semibold">
                        Background Bonus Languages ({bgDef.name}: choose {bgDef.languages}):
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: bgDef.languages }).map((_, idx) => (
                          <select
                            key={idx}
                            value={chosenBgLanguages[idx] || STANDARD_AND_EXOTIC_LANGUAGES[idx + 1] || "Dwarvish"}
                            onChange={(e) => {
                              const val = e.target.value;
                              setChosenBgLanguages((prev) => {
                                const next = [...prev];
                                next[idx] = val;
                                return next;
                              });
                            }}
                            className="bg-stone-900 border border-stone-700 rounded px-3 py-1.5 text-stone-200"
                          >
                            {STANDARD_AND_EXOTIC_LANGUAGES.map((l) => (
                              <option key={l} value={l}>{l}</option>
                            ))}
                          </select>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 6: FEATS (VARIANT HUMAN / CUSTOM LINEAGE / ASI)            */}
          {/* ============================================================== */}
          {step === 6 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-stone-200">Feats & Talents</h3>
                  <p className="text-xs text-stone-400">
                    {hasRacialFeat
                      ? `Select your starting Level 1 bonus feat from ${selectedRace === "Custom Lineage" ? "Custom Lineage" : "Variant Human"}.`
                      : "Browse 2014 feats or view your ASI milestones."}
                  </p>
                </div>
              </div>

              {/* Feats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
                {FEATS_5E.map((feat) => {
                  const isSelected = selectedFeatId === feat.id;
                  return (
                    <button
                      key={feat.id}
                      type="button"
                      onClick={() => setSelectedFeatId(feat.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "bg-amber-600/20 border-amber-500 shadow-md shadow-amber-900/30"
                          : "bg-stone-950/60 border-stone-800 hover:border-stone-700 hover:bg-stone-800/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-serif font-bold text-sm ${isSelected ? "text-amber-300" : "text-stone-200"}`}>
                          {feat.name}
                        </span>
                        {feat.prerequisite && (
                          <span className="text-[10px] text-stone-500 truncate max-w-[120px]">
                            Req: {feat.prerequisite}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400 mt-1 line-clamp-3">{feat.description}</p>
                    </button>
                  );
                })}
              </div>

              {/* Feat Half-Stat Picker if applicable */}
              {(() => {
                const currentFeat = FEATS_5E.find((f) => f.id === selectedFeatId);
                if (currentFeat?.allowsStatChoice && currentFeat.statChoices) {
                  return (
                    <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-2 text-xs">
                      <div className="text-amber-300 font-semibold">
                        {currentFeat.name} Stat Boost Choice:
                      </div>
                      <div className="flex gap-2">
                        {currentFeat.statChoices.map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setFeatStatChoice(st)}
                            className={`px-3 py-1.5 rounded-lg border font-mono ${
                              featStatChoice === st
                                ? "bg-amber-600 text-stone-950 font-bold border-amber-500"
                                : "bg-stone-900 text-stone-300 border-stone-700"
                            }`}
                          >
                            +1 {STAT_NAMES[st]}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 7: EQUIPMENT SELECTION                                     */}
          {/* ============================================================== */}
          {step === 7 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-stone-200">Starting Equipment</h3>
                  <p className="text-xs text-stone-400">
                    Choose starting gear packages or opt for starting gold buy.
                  </p>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useStartingGold}
                    onChange={(e) => setUseStartingGold(e.target.checked)}
                    className="rounded border-stone-700 bg-stone-900 text-amber-600 focus:ring-0"
                  />
                  <span>Starting Gold Buy (Custom Wealth)</span>
                </label>
              </div>

              {!useStartingGold ? (
                <div className="space-y-4">
                  {/* Guided Class Choices */}
                  {primaryClassDef.startingEquipmentChoices?.map((choice) => (
                    <div key={choice.id} className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2.5">
                      <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                        {choice.name}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {choice.options.map((opt, optIdx) => {
                          const isSelected = (equipmentSelections[choice.id] ?? 0) === optIdx;
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => setEquipmentSelections((prev) => ({ ...prev, [choice.id]: optIdx }))}
                              className={`p-3 rounded-xl border text-left text-xs transition-all ${
                                isSelected
                                  ? "bg-amber-600/20 border-amber-500 text-amber-300 font-semibold"
                                  : "bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700"
                              }`}
                            >
                              <div>{opt.label}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Background Gear Summary */}
                  <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2 text-xs">
                    <div className="font-semibold text-amber-400 uppercase tracking-wider">
                      Background Items ({bgDef.name})
                    </div>
                    <div className="text-stone-300 space-y-1">
                      {bgDef.startingEquipment.map((item, i) => (
                        <div key={i}>• {item}</div>
                      ))}
                      <div>• Pouch containing {bgDef.startingGold} gp</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3 text-xs">
                  <div className="font-semibold text-amber-400 uppercase tracking-wider">
                    Starting Wealth Roll / Purchase
                  </div>
                  <p className="text-stone-300">
                    Instead of standard class starting gear, start with gold to purchase custom equipment from the sheet catalog later.
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-stone-400">Starting Gold:</span>
                    <input
                      type="number"
                      min={10}
                      max={1000}
                      value={customGold}
                      onChange={(e) => setCustomGold(parseInt(e.target.value, 10) || 100)}
                      className="w-24 bg-stone-900 border border-stone-700 rounded px-2 py-1 font-mono font-bold text-amber-300"
                    />
                    <span className="text-amber-400 font-bold">gp</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 8: SPELLS (CONTEXTUAL)                                     */}
          {/* ============================================================== */}
          {step === 8 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-stone-200">Spell Selection</h3>
                  <p className="text-xs text-stone-400">
                    {isSpellcaster
                      ? "Select your known cantrips and prepared spells for your class."
                      : "Your class does not use spells. You can proceed to the Review step."}
                  </p>
                </div>
              </div>

              {isSpellcaster ? (
                <div className="space-y-4">
                  {/* Cantrips */}
                  <div>
                    <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
                      Cantrips (Level 0)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {SPELLS_5E.filter((s) => s.level === 0).map((sp) => {
                        const isSelected = selectedCantrips.includes(sp.id);
                        return (
                          <button
                            key={sp.id}
                            type="button"
                            onClick={() => {
                              setSelectedCantrips((prev) =>
                                isSelected ? prev.filter((id) => id !== sp.id) : [...prev, sp.id]
                              );
                            }}
                            className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                              isSelected
                                ? "bg-amber-600/20 border-amber-500 text-amber-200"
                                : "bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700"
                            }`}
                          >
                            <div className="font-semibold">{sp.name}</div>
                            <div className="text-[10px] text-stone-400 mt-0.5">{sp.school} • {sp.castingTime}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Level 1 Spells */}
                  <div>
                    <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
                      Level 1 Spells
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {SPELLS_5E.filter((s) => s.level === 1).map((sp) => {
                        const isSelected = selectedSpells.includes(sp.id);
                        return (
                          <button
                            key={sp.id}
                            type="button"
                            onClick={() => {
                              setSelectedSpells((prev) =>
                                isSelected ? prev.filter((id) => id !== sp.id) : [...prev, sp.id]
                              );
                            }}
                            className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                              isSelected
                                ? "bg-amber-600/20 border-amber-500 text-amber-200"
                                : "bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700"
                            }`}
                          >
                            <div className="font-semibold">{sp.name}</div>
                            <div className="text-[10px] text-stone-400 mt-0.5">{sp.school} • {sp.castingTime}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-stone-400 text-xs bg-stone-950 rounded-xl border border-stone-800">
                  <Wand2 className="w-8 h-8 text-stone-600 mx-auto mb-2" />
                  No spellcasting required for your chosen class combination.
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 9: REVIEW & FINALIZE                                       */}
          {/* ============================================================== */}
          {step === 9 && (
            <div className="space-y-6">
              {/* Character Identity Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 border border-amber-500/50 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-serif font-bold text-2xl text-amber-100">{characterName}</h3>
                    <p className="text-xs text-stone-400 mt-1">
                      Level {totalLevel} {subraceDef?.name || selectedRace} •{" "}
                      {combinedClasses.map((c) => `${c.className} ${c.level}`).join(" / ")} • {selectedBackground} • {alignment}
                    </p>
                  </div>
                  <div className="flex gap-3 text-center">
                    <div className="px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-800">
                      <div className="text-[10px] uppercase text-stone-500 font-bold">Max HP</div>
                      <div className="font-mono font-bold text-lg text-emerald-400">{hpResult.hpMax}</div>
                    </div>
                    <div className="px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-800">
                      <div className="text-[10px] uppercase text-stone-500 font-bold">Armor Class</div>
                      <div className="font-mono font-bold text-lg text-amber-400">{acCalc.ac}</div>
                    </div>
                    <div className="px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-800">
                      <div className="text-[10px] uppercase text-stone-500 font-bold">Speed</div>
                      <div className="font-mono font-bold text-lg text-cyan-400">{raceDef.speed} ft</div>
                    </div>
                  </div>
                </div>

                {/* 6 Stats Banner */}
                <div className="grid grid-cols-6 gap-2 pt-2 border-t border-stone-800 text-center">
                  {STAT_KEYS.map((st) => (
                    <div key={st} className="p-2 bg-stone-900/80 rounded-lg border border-stone-800">
                      <div className="text-[10px] uppercase text-stone-400 font-bold">{st}</div>
                      <div className="font-mono font-bold text-base text-stone-100">{finalStats[st]}</div>
                      <div className="text-[11px] text-amber-400 font-bold">{formatModifier(calcModifier(finalStats[st]))}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Calculated Combat & Inventory Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Equipment & Armor Calculation */}
                <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
                  <div className="font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>Armor & Defense Formula</span>
                  </div>
                  <div className="text-stone-300">
                    <strong>AC:</strong> {acCalc.formula} = {acCalc.ac}
                  </div>
                  <div className="text-stone-400 pt-1">
                    <strong>Equipped Gear:</strong>{" "}
                    {startingEquipmentBundle.map((i) => i.name).join(", ")}
                  </div>
                </div>

                {/* HP & Hit Dice Breakdown */}
                <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
                  <div className="font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-400" />
                    <span>Hit Points & Hit Dice Formula</span>
                  </div>
                  <div className="text-stone-300">
                    <strong>Hit Dice Total:</strong>{" "}
                    {combinedClasses.map((c) => `${c.level}${c.hitDie}`).join(" + ")}
                  </div>
                  <div className="text-stone-400 text-[11px] leading-relaxed pt-1">
                    {hpResult.breakdown}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-950 border-t border-stone-800">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-800 text-stone-200 hover:bg-stone-700 text-sm font-semibold transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
          ) : (
            <div />
          )}

          {step < 9 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-sm shadow-lg shadow-amber-900/30 transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={handleFinish}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-stone-950 font-bold text-sm shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {saving ? "Creating Character..." : `Create Character (Level ${totalLevel})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
