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
import { CLASSES_5E, ClassDefinition, SubclassDefinition, EquipmentPickFrom } from "@/data/5e/classes";
import { RACES_5E, RaceDefinition, SubraceDefinition, StatKey } from "@/data/5e/races";
import { BACKGROUNDS_5E, BackgroundDefinition } from "@/data/5e/backgrounds";
import { FEATS_5E, Feat5e } from "@/data/5e/feats";
import { SPELLS_5E, Spell5e } from "@/data/5e/spells";
import { WEAPONS_5E, ARMOR_5E, GEAR_5E, PACKS_5E, TOOLS_5E } from "@/data/5e/equipment";
import { COMPANION_PRESETS } from "@/data/5e/companions";
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
  getMaxCastableSpellLevel,
  parseCostToGp,
  resolveArmorCategory,
  calcWeaponAttackMod,
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
  const [subclassSearch, setSubclassSearch] = useState<string>("");
  const [isCustomSubclass, setIsCustomSubclass] = useState<boolean>(false);
  const [customSubclassName, setCustomSubclassName] = useState<string>("");

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
  const [chosenExpertise, setChosenExpertise] = useState<string[]>([]);
  const [chosenRaceLanguages, setChosenRaceLanguages] = useState<string[]>([]);
  const [chosenBgLanguages, setChosenBgLanguages] = useState<string[]>([]);
  const [chosenToolProficiencies, setChosenToolProficiencies] = useState<string[]>([]);

  // ----------------------------------------------------
  // STEP 6 STATE: FEATS & ASIs
  // ----------------------------------------------------
  const [enableDmBonusFeat, setEnableDmBonusFeat] = useState<boolean>(false);
  const [selectedFeatId, setSelectedFeatId] = useState<string>("alert");
  const [featStatChoice, setFeatStatChoice] = useState<StatKey>("dex");
  const [asiChoicesByLevel, setAsiChoicesByLevel] = useState<
    Record<string, { type: "stats" | "feat"; stat1?: StatKey; stat2?: StatKey; featId?: string; featStatChoice?: StatKey }>
  >({});

  // ----------------------------------------------------
  // STEP 7 STATE: EQUIPMENT & GOLD SHOP
  // ----------------------------------------------------
  const [equipmentSelections, setEquipmentSelections] = useState<Record<string, number>>({});
  const [equipmentPickSelections, setEquipmentPickSelections] = useState<Record<string, string[]>>({});
  const [extraPurchasedItems, setExtraPurchasedItems] = useState<Array<InventoryItemData & { _costGp?: number; _boughtWithGold?: boolean }>>([]);
  const [equipCatalogTab, setEquipCatalogTab] = useState<"weapons" | "armor" | "packs" | "tools" | "gear" | "custom">("weapons");
  const [equipCatalogSearch, setEquipCatalogSearch] = useState<string>("");
  const [customEquipName, setCustomEquipName] = useState<string>("");
  const [customEquipCategory, setCustomEquipCategory] = useState<"weapon" | "armor" | "shield" | "gear">("weapon");
  const [customEquipDamage, setCustomEquipDamage] = useState<string>("1d8");
  const [customEquipAc, setCustomEquipAc] = useState<number>(14);
  const [useStartingGold, setUseStartingGold] = useState(false);
  const [customGold, setCustomGold] = useState(125);

  // ----------------------------------------------------
  // STEP 8 STATE: SPELLS (CONTEXTUAL)
  // ----------------------------------------------------
  const [selectedCantrips, setSelectedCantrips] = useState<string[]>([]);
  const [selectedSpells, setSelectedSpells] = useState<string[]>([]);
  const [customSpells, setCustomSpells] = useState<SpellItemData[]>([]);
  const [spellLevelTab, setSpellLevelTab] = useState<number | "all">(0);
  const [spellSearch, setSpellSearch] = useState<string>("");
  const [spellClassFilter, setSpellClassFilter] = useState<string>("caster");
  const [showCustomSpellForm, setShowCustomSpellForm] = useState<boolean>(false);
  const [customSpellName, setCustomSpellName] = useState<string>("");
  const [customSpellLevel, setCustomSpellLevel] = useState<number>(1);
  const [customSpellSchool, setCustomSpellSchool] = useState<Spell5e["school"]>("Evocation");
  const [customSpellDesc, setCustomSpellDesc] = useState<string>("");
  const [customSpellDamage, setCustomSpellDamage] = useState<string>("");
  const [customSpellDamageType, setCustomSpellDamageType] = useState<string>("");
  const [customSpellHealing, setCustomSpellHealing] = useState<string>("");

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

  const effectivePrimarySubclass = isCustomSubclass
    ? customSubclassName.trim() || "Custom Subclass"
    : primarySubclass || primaryClassDef.subclasses[0]?.name || undefined;

  // Combined Classes list
  const combinedClasses: MulticlassClassEntry[] = useMemo(() => {
    const list: MulticlassClassEntry[] = [
      {
        className: primaryClass,
        subclass: effectivePrimarySubclass,
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
  }, [primaryClass, effectivePrimarySubclass, primaryClassDef, startingLevel, multiclassEntries]);

  // Total Level
  const totalLevel = useMemo(() => {
    return combinedClasses.reduce((sum, c) => sum + c.level, 0);
  }, [combinedClasses]);

  // Max castable spell level across classes
  const maxCastableSpellLevel = useMemo(() => {
    return getMaxCastableSpellLevel(combinedClasses);
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
      const subNorm = (c.subclass || "").toLowerCase().replace(/[\s_-]+/g, "");
      if (subNorm === "eldritchknight" || subNorm === "arcanetrickster") return c.level >= 3;
      return false;
    });
  }, [combinedClasses]);

  // ASI Milestones unlocked across classes
  const asiMilestones = useMemo(() => {
    const list: Array<{ key: string; className: string; classLevel: number }> = [];
    combinedClasses.forEach((c) => {
      const def = CLASSES_5E[c.className];
      if (!def) return;
      def.asiLevels
        .filter((lvl) => lvl <= c.level)
        .forEach((lvl) => {
          list.push({ key: `${c.className}-${lvl}`, className: c.className, classLevel: lvl });
        });
    });
    return list;
  }, [combinedClasses]);

  // Has Bonus Feat from Race (or optional DM house rule)
  const hasRacialFeat = raceDef.grantsFeat || selectedSubrace === "variant_human" || selectedRace === "Custom Lineage";
  const hasLevel1Feat = hasRacialFeat || enableDmBonusFeat;

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
    for (const [s, b] of Object.entries(flexibleBonuses)) {
      bonuses[s as StatKey] = (bonuses[s as StatKey] || 0) + (b || 0);
    }
    return bonuses;
  }, [raceDef, subraceDef, flexibleBonuses, enableTashaSwap, tashaSwappedBonuses]);

  // Combined ASI & Feat Stat Boosts
  const featAndAsiStatBoost = useMemo(() => {
    const boost: Record<StatKey, number> = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    const defaultPrimaryStat: StatKey =
      primaryClassDef.primaryAbility.toLowerCase().includes("dex") ? "dex"
      : primaryClassDef.primaryAbility.toLowerCase().includes("int") ? "int"
      : primaryClassDef.primaryAbility.toLowerCase().includes("wis") ? "wis"
      : primaryClassDef.primaryAbility.toLowerCase().includes("cha") ? "cha"
      : "str";

    if (hasLevel1Feat) {
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

    asiMilestones.forEach((m) => {
      const choice = asiChoicesByLevel[m.key];
      if (!choice || choice.type === "stats") {
        const s1 = choice?.stat1 || defaultPrimaryStat;
        const s2 = choice?.stat2 || defaultPrimaryStat;
        boost[s1] += 1;
        boost[s2] += 1;
      } else if (choice.type === "feat" && choice.featId) {
        const feat = FEATS_5E.find((f) => f.id === choice.featId);
        if (feat) {
          if (feat.allowsStatChoice && choice.featStatChoice) {
            boost[choice.featStatChoice] += 1;
          } else if (feat.statBoost) {
            for (const [s, b] of Object.entries(feat.statBoost)) {
              boost[s as StatKey] += b || 0;
            }
          }
        }
      }
    });

    return boost;
  }, [hasLevel1Feat, selectedFeatId, featStatChoice, asiMilestones, asiChoicesByLevel, primaryClassDef]);

  // Final Ability Scores = base + racial + feat/ASI
  const finalStats = useMemo(() => {
    return {
      str: (baseStats.str || 10) + (racialBonuses.str || 0) + (featAndAsiStatBoost.str || 0),
      dex: (baseStats.dex || 10) + (racialBonuses.dex || 0) + (featAndAsiStatBoost.dex || 0),
      con: (baseStats.con || 10) + (racialBonuses.con || 0) + (featAndAsiStatBoost.con || 0),
      int: (baseStats.int || 10) + (racialBonuses.int || 0) + (featAndAsiStatBoost.int || 0),
      wis: (baseStats.wis || 10) + (racialBonuses.wis || 0) + (featAndAsiStatBoost.wis || 0),
      cha: (baseStats.cha || 10) + (racialBonuses.cha || 0) + (featAndAsiStatBoost.cha || 0),
    };
  }, [baseStats, racialBonuses, featAndAsiStatBoost]);

  // Point Buy Spent
  const pointBuySpent = useMemo(() => {
    let spent = 0;
    for (const val of Object.values(baseStats)) {
      spent += calcPointBuyCost(val);
    }
    return spent;
  }, [baseStats]);

  // Chosen Feats list (Lv 1 + ASI milestones)
  const chosenFeatIds = useMemo(() => {
    const ids: string[] = [];
    if (hasLevel1Feat && selectedFeatId) ids.push(selectedFeatId);
    asiMilestones.forEach((m) => {
      const c = asiChoicesByLevel[m.key];
      if (c?.type === "feat" && c.featId) ids.push(c.featId);
    });
    return ids;
  }, [hasLevel1Feat, selectedFeatId, asiMilestones, asiChoicesByLevel]);

  // HP Calculation
  const isHillDwarf = selectedSubrace === "hill_dwarf";
  const hasTough = chosenFeatIds.includes("tough");
  const isDraconicSorcerer = combinedClasses.some(
    (c) => c.className === "Sorcerer" && c.subclass === "Draconic Bloodline"
  );
  const conMod = calcModifier(finalStats.con);
  const hpResult = useMemo(() => {
    return calculateTotalHitPoints(combinedClasses, conMod, {
      hpMode,
      rolledHpByLevel: rolledHpMap,
      isHillDwarf,
      hasToughFeat: hasTough,
      isDraconicSorcerer,
    });
  }, [combinedClasses, conMod, hpMode, rolledHpMap, isHillDwarf, hasTough, isDraconicSorcerer]);

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

  // Skill & Expertise Counts
  const innateSkillsWithDupes = useMemo(() => {
    const bgSet = new Set<string>(bgDef.skills);
    const raceSet = new Set<string>();
    if (raceDef.traits.some((t) => t.name === "Keen Senses")) raceSet.add("perception");
    if (raceDef.traits.some((t) => t.name === "Menacing")) raceSet.add("intimidation");
    if (raceDef.traits.some((t) => t.name === "Cat's Talent")) {
      raceSet.add("perception");
      raceSet.add("stealth");
    }
    if (raceDef.traits.some((t) => t.name === "Natural Athlete")) raceSet.add("athletics");
    if (raceDef.traits.some((t) => t.name === "Sneaky")) raceSet.add("stealth");
    if (selectedRace === "Custom Lineage" && customLineagePerk === "skill") {
      raceSet.add(customLineageSkill);
    }
    let duplicateCount = 0;
    raceSet.forEach((sk) => {
      if (bgSet.has(sk)) duplicateCount++;
    });
    const merged = Array.from(new Set([...bgSet, ...raceSet]));
    return { merged, duplicateCount };
  }, [bgDef, raceDef, selectedRace, customLineagePerk, customLineageSkill]);

  const innateSkills = innateSkillsWithDupes.merged;

  const bonusSkillPicks = useMemo(() => {
    let bonus = innateSkillsWithDupes.duplicateCount;
    // Half-Elf Skill Versatility
    if (selectedRace === "Half-Elf") bonus += 2;
    // Skilled feat
    if (chosenFeatIds.includes("skilled")) bonus += 3;
    if (chosenFeatIds.includes("skill_expert")) bonus += 1;
    // Subclass & Multiclass bonus skills
    combinedClasses.forEach((c, idx) => {
      const def = CLASSES_5E[c.className];
      const sub = def?.subclasses.find((s) => s.name === c.subclass);
      if (sub?.bonusProficiencies?.skillsCount && c.level >= (def?.subclassLevel || 99)) {
        bonus += sub.bonusProficiencies.skillsCount;
      }
      if (idx > 0 && (c.className === "Bard" || c.className === "Ranger" || c.className === "Rogue")) {
        bonus += 1;
      }
    });
    return bonus;
  }, [innateSkillsWithDupes.duplicateCount, selectedRace, chosenFeatIds, combinedClasses]);

  const maxClassSkillPicks = (primaryClassDef.skillChoices?.count || 2) + bonusSkillPicks;

  const maxExpertisePicks = useMemo(() => {
    let count = 0;
    combinedClasses.forEach((c) => {
      if (c.className === "Rogue") {
        if (c.level >= 1) count += 2;
        if (c.level >= 6) count += 2;
      }
      if (c.className === "Bard") {
        if (c.level >= 3) count += 2;
        if (c.level >= 10) count += 2;
      }
      if (c.className === "Ranger" && c.level >= 1) {
        // Canny option allows 1 expertise
      }
    });
    if (chosenFeatIds.includes("skill_expert")) count += 1;
    return count;
  }, [combinedClasses, chosenFeatIds]);

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

  // Gold Shop math
  const goldSpentInShop = useMemo(() => {
    return extraPurchasedItems
      .filter((i) => i._boughtWithGold)
      .reduce((sum, i) => sum + (i._costGp || 0), 0);
  }, [extraPurchasedItems]);

  const remainingStartingGold = Math.max(0, Math.round((customGold - goldSpentInShop) * 100) / 100);

  // Assemble Starting Equipment Items
  const startingEquipmentBundle = useMemo(() => {
    const items: InventoryItemData[] = [];

    const addWeaponByName = (wpnName: string, qty: number, idPrefix: string) => {
      const w = WEAPONS_5E.find((x) => x.name === wpnName);
      if (w) {
        items.push({
          id: `${idPrefix}-${w.id}`,
          name: w.name,
          category: "weapon",
          quantity: qty,
          weight: w.weight * qty,
          equipped: true,
          equippedSlot: "mainHand",
          damage: w.damage,
          damageType: w.damageType,
          versatileDamage: w.versatileDamage,
          properties: w.properties,
          range: w.range,
          description: `Cost: ${w.cost} • ${w.properties.join(", ") || "Standard"}`,
        });
      }
    };

    if (!useStartingGold) {
      // 1. Fixed class equipment
      if (primaryClassDef.fixedEquipment) {
        primaryClassDef.fixedEquipment.forEach((fe, idx) => {
          items.push({
            id: `fixed-${idx}-${fe.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
            name: fe.name,
            category: fe.category,
            armorCategory: fe.armorCategory,
            quantity: fe.quantity,
            weight: fe.category === "armor" ? 20 : fe.category === "shield" ? 6 : 3,
            equipped: fe.category === "armor" || fe.category === "shield" || fe.category === "weapon",
            equippedSlot: fe.category === "armor" ? "armor" : fe.category === "shield" ? "shield" : "mainHand",
            baseAc: fe.baseAc,
            maxDexMod: fe.maxDexMod,
            damage: fe.damage,
            damageType: fe.damageType,
            versatileDamage: fe.versatileDamage,
            properties: fe.properties,
            range: fe.range,
          });
        });
      }

      // 2. Chosen class equipment options (including dynamic weapon/pack/tool pickFrom)
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
                armorCategory: it.armorCategory,
                quantity: it.quantity,
                weight: it.category === "armor" ? 25 : it.category === "shield" ? 6 : 3,
                equipped: it.category === "armor" || it.category === "shield" || it.category === "weapon",
                equippedSlot: it.category === "armor" ? "armor" : it.category === "shield" ? "shield" : "mainHand",
                baseAc: it.baseAc,
                maxDexMod: it.maxDexMod,
                damage: it.damage,
                damageType: it.damageType,
                versatileDamage: it.versatileDamage,
                properties: it.properties,
                range: it.range,
              });
            });

            if (opt.pickFrom) {
              const count = opt.pickCount || 1;
              const pickedNames = equipmentPickSelections[`${ch.id}-${selectedOptIdx}`] || [];
              if (opt.pickFrom === "any_pack") {
                const chosenPackName = pickedNames[0] || "Explorer's Pack";
                const packObj = PACKS_5E.find((p) => p.name === chosenPackName) || PACKS_5E[4];
                items.push({
                  id: `choice-${ch.id}-pack`,
                  name: packObj.name,
                  category: "gear",
                  quantity: 1,
                  weight: packObj.weight,
                  description: `Contents: ${packObj.description}`,
                });
              } else if (opt.pickFrom === "any_instrument" || opt.pickFrom === "any_artisan_tool") {
                const pool = TOOLS_5E.filter((t) =>
                  opt.pickFrom === "any_instrument" ? t.category === "instrument" : t.category === "artisan"
                );
                const chosenToolName = pickedNames[0] || pool[0]?.name || "Lute";
                const toolObj = TOOLS_5E.find((t) => t.name === chosenToolName);
                items.push({
                  id: `choice-${ch.id}-tool`,
                  name: chosenToolName,
                  category: "tool",
                  quantity: 1,
                  weight: toolObj?.weight || 2,
                  description: toolObj?.description,
                });
              } else {
                const fallback = opt.pickFrom.includes("martial") ? "Longsword" : "Quarterstaff";
                for (let slotIdx = 0; slotIdx < count; slotIdx++) {
                  const chosenWpn = pickedNames[slotIdx] || fallback;
                  addWeaponByName(chosenWpn, 1, `choice-${ch.id}-pick-${slotIdx}`);
                }
              }
            }
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
    } else {
      items.push({
        id: "item-gold-pouch",
        name: `Coin Pouch (${remainingStartingGold} gp)`,
        category: "gear",
        quantity: 1,
        weight: Math.max(0.5, Math.round((remainingStartingGold / 50) * 10) / 10),
        description: `Remaining starting wealth from ${customGold} gp budget.`,
      });
    }

    // 5. Extra items added or bought in catalog
    extraPurchasedItems.forEach((item) => {
      const { _costGp, _boughtWithGold, ...cleanItem } = item;
      items.push(cleanItem);
    });

    return items;
  }, [primaryClassDef, equipmentSelections, equipmentPickSelections, bgDef, useStartingGold, remainingStartingGold, customGold, extraPurchasedItems]);

  // AC Calculation
  const armorItem = startingEquipmentBundle.find((i) => i.category === "armor" && i.equipped);
  const shieldItem = startingEquipmentBundle.find((i) => i.category === "shield" && i.equipped);
  const acCalc = useMemo(() => {
    return calculateArmorClass(
      finalStats,
      combinedClasses,
      armorItem
        ? {
            name: armorItem.name,
            baseAc: armorItem.baseAc || 11,
            category: resolveArmorCategory(armorItem),
            maxDexMod: armorItem.maxDexMod,
            stealthDisadvantage: armorItem.stealthDisadvantage,
          }
        : undefined,
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
        const mod = calcWeaponAttackMod(wpn, finalStats);
        const toHit = pb + mod;
        return {
          id: `atk-${idx + 1}`,
          name: wpn.name,
          atkBonus: formatModifier(toHit),
          damage: `${wpn.damage || "1d8"}${formatModifier(mod)} ${wpn.damageType || ""}`,
          notes: wpn.properties?.join(", ") || "",
        };
      });

      // Saving Throws (primary class + Resilient feat + Monk Diamond Soul)
      const savingThrows: Record<string, boolean> = {};
      primaryClassDef.savingThrows.forEach((st) => {
        savingThrows[st] = true;
      });
      if (hasLevel1Feat && selectedFeatId === "resilient") {
        savingThrows[featStatChoice] = true;
      }
      asiMilestones.forEach((m) => {
        const choice = asiChoicesByLevel[m.key];
        if (choice?.type === "feat" && choice.featId === "resilient" && choice.featStatChoice) {
          savingThrows[choice.featStatChoice] = true;
        }
      });
      if (combinedClasses.some((c) => c.className === "Monk" && c.level >= 14)) {
        STAT_KEYS.forEach((st) => (savingThrows[st] = true));
      }

      // Skills mapping (1 = proficient, 2 = expertise)
      const skills: Record<string, number> = {};
      innateSkills.forEach((s) => (skills[s] = 1));
      chosenClassSkills.forEach((s) => (skills[s] = 1));
      chosenExpertise.forEach((s) => {
        skills[s] = 2;
      });

      // Combined features: Class features + Subclass features + Racial traits + Background feature + Feats
      const featureList: Array<{ id: string; name: string; source: string; level: number; description: string }> = [];
      const starterCompanions: any[] = [];

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

          if (c.level >= def.subclassLevel && c.subclass) {
            const subDef = def.subclasses.find((s) => s.name === c.subclass);
            if (subDef) {
              subDef.features
                .filter((sf) => sf.level <= c.level)
                .forEach((sf, sIdx) => {
                  featureList.push({
                    id: `subfeat-${c.className}-${subDef.id}-${sf.level}-${sIdx}`,
                    name: `${subDef.name}: ${sf.name}`,
                    source: `${subDef.name} (${c.className} ${sf.level})`,
                    level: sf.level,
                    description: sf.description,
                  });
                });

              if (subDef.hasCompanion) {
                const preset = COMPANION_PRESETS.find((p) => p.type === subDef.companionType) || COMPANION_PRESETS[3];
                starterCompanions.push({
                  id: `comp-${subDef.id}-${Date.now()}`,
                  name: `${characterName}'s ${preset.name}`,
                  type: preset.type,
                  creatureType: preset.creatureType,
                  hpCurrent: preset.hpMax,
                  hpMax: preset.hpMax,
                  ac: preset.ac,
                  speed: preset.speed,
                  stats: preset.stats,
                  attacks: preset.attacks,
                  features: preset.features,
                  notes: `Granted by ${subDef.name}.`,
                });
              }
            }
          }
        }
      });

      // Race traits & Background feature
      raceDef.traits.forEach((t, idx) => {
        featureList.push({
          id: `racetrait-${idx}`,
          name: t.name,
          source: subraceDef?.name || raceDef.name,
          level: 1,
          description: t.description,
        });
      });
      subraceDef?.traits?.forEach((t, idx) => {
        featureList.push({
          id: `subracetrait-${idx}`,
          name: t.name,
          source: subraceDef.name,
          level: 1,
          description: t.description,
        });
      });
      if (bgDef.featureName) {
        featureList.push({
          id: `bgfeat-${bgDef.id}`,
          name: `Background Feature: ${bgDef.featureName}`,
          source: bgDef.name,
          level: 1,
          description: bgDef.featureDescription,
        });
      }

      // Level 1 Bonus Feat
      if (hasLevel1Feat) {
        const f = FEATS_5E.find((x) => x.id === selectedFeatId);
        if (f) {
          featureList.push({
            id: `feat-lv1-${f.id}`,
            name: `Feat: ${f.name}`,
            source: hasRacialFeat ? (selectedRace === "Custom Lineage" ? "Custom Lineage" : "Variant Human") : "Level 1 Bonus Feat",
            level: 1,
            description: f.description,
          });
        }
      }

      // ASI Milestone Feats
      asiMilestones.forEach((m) => {
        const c = asiChoicesByLevel[m.key];
        if (c?.type === "feat" && c.featId) {
          const f = FEATS_5E.find((x) => x.id === c.featId);
          if (f) {
            featureList.push({
              id: `feat-asi-${m.key}-${f.id}`,
              name: `Feat: ${f.name}`,
              source: `${m.className} ${m.classLevel} (ASI)`,
              level: m.classLevel,
              description: f.description,
            });
          }
        }
      });

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
      customSpells.forEach((cs) => spells.push(cs));

      // Combine proficiencies across classes + subclasses + backgrounds + tools
      const mergedArmorProfs = new Set<string>(primaryClassDef.armorProficiencies);
      const mergedWeaponProfs = new Set<string>(primaryClassDef.weaponProficiencies);
      const mergedToolProfs = new Set<string>([
        ...(bgDef.tools || []),
        ...(primaryClassDef.toolProficiencies || []),
        ...chosenToolProficiencies,
      ]);
      combinedClasses.forEach((c) => {
        const def = CLASSES_5E[c.className];
        const sub = def?.subclasses.find((s) => s.name === c.subclass);
        if (sub?.bonusProficiencies && c.level >= (def?.subclassLevel || 99)) {
          sub.bonusProficiencies.armor?.forEach((a) => mergedArmorProfs.add(a));
          sub.bonusProficiencies.weapons?.forEach((w) => mergedWeaponProfs.add(w));
          sub.bonusProficiencies.tools?.forEach((t) => mergedToolProfs.add(t));
        }
      });

      const speedBonus = chosenFeatIds.includes("mobile") ? 10 : 0;
      const initFeatBonus = chosenFeatIds.includes("alert") ? 5 : 0;

      // Hit dice total string
      const hitDiceTotal = combinedClasses.map((c) => `${c.level}${c.hitDie}`).join(" + ");

      const newSheet: CharacterSheetData = {
        userId,
        name: characterName,
        character: characterName,
        class: combinedClasses.map((c) => `${c.className}${c.level !== totalLevel ? ` ${c.level}` : ""}`).join(" / "),
        subclass: effectivePrimarySubclass,
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
        speed: raceDef.speed + speedBonus,
        initiativeBonus: calcModifier(finalStats.dex) + initFeatBonus,
        hitDiceTotal,
        hitDiceCurrent: totalLevel,
        deathSaves: { successes: 0, failures: 0 },
        skills,
        languages: finalLanguages,
        toolProficiencies: Array.from(mergedToolProfs),
        armorProficiencies: Array.from(mergedArmorProfs),
        weaponProficiencies: Array.from(mergedWeaponProfs),
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
        companions: starterCompanions,
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
                          setIsCustomSubclass(false);
                          setEquipmentPickSelections({});
                          setCustomGold(cls.startingGoldAvg || 100);
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
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
                      <Sparkles className="w-4 h-4" />
                      <span>Choose Primary Subclass ({primaryClass} Level {combinedClasses[0].level} &ge; {primaryClassDef.subclassLevel} — {primaryClassDef.subclasses.length} available)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCustomSubclass(!isCustomSubclass)}
                      className="text-xs text-amber-300 hover:underline font-medium"
                    >
                      {isCustomSubclass ? "Browse Official Subclasses" : "+ Custom Subclass"}
                    </button>
                  </div>

                  {isCustomSubclass ? (
                    <input
                      type="text"
                      value={customSubclassName}
                      onChange={(e) => setCustomSubclassName(e.target.value)}
                      placeholder="Enter custom or homebrew subclass name..."
                      className="w-full bg-stone-950 border border-amber-500/50 rounded-xl px-4 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-400"
                    />
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={subclassSearch}
                          onChange={(e) => setSubclassSearch(e.target.value)}
                          placeholder={`Filter ${primaryClassDef.subclasses.length} ${primaryClass} subclasses by name or source (PHB, XGtE, TCoE)...`}
                          className="w-full pl-9 pr-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                        {primaryClassDef.subclasses
                          .filter(
                            (sub) =>
                              !subclassSearch.trim() ||
                              sub.name.toLowerCase().includes(subclassSearch.toLowerCase()) ||
                              (sub.source || "").toLowerCase().includes(subclassSearch.toLowerCase()) ||
                              sub.description.toLowerCase().includes(subclassSearch.toLowerCase())
                          )
                          .map((sub) => {
                            const isSubSelected =
                              primarySubclass === sub.name ||
                              (!primarySubclass && primaryClassDef.subclasses[0]?.name === sub.name);
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
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className="font-serif font-bold text-sm text-amber-200">{sub.name}</span>
                                  {sub.source && (
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-800 text-stone-300">
                                      {sub.source}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-stone-300 mt-1 leading-relaxed">{sub.description}</p>
                              </button>
                            );
                          })}
                      </div>
                    </>
                  )}
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
                  const featBonus = featAndAsiStatBoost[stat] || 0;
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
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-stone-200">Skills, Expertise & Proficiencies</h3>
                    <p className="text-xs text-stone-400">
                      Review background/race proficiencies, choose class & bonus skills, Expertise, tools, and languages.
                    </p>
                  </div>
                  <div className="text-xs px-2.5 py-1 rounded-lg bg-stone-950 border border-stone-800 text-stone-300">
                    Skill Picks:{" "}
                    <span className="font-mono font-bold text-amber-400">
                      {chosenClassSkills.length} / {maxClassSkillPicks}
                    </span>
                  </div>
                </div>

                {/* 5e Duplicate & Bonus Skill Rule Helper */}
                <div className="text-xs text-amber-300 bg-amber-950/20 px-3 py-2 rounded-lg border border-amber-900/40 flex items-center gap-2">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>
                    <strong>5e Rule:</strong> Background ({bgDef.name}) & racial skills are locked in.
                    {innateSkillsWithDupes.duplicateCount > 0 && (
                      <> Notice: <strong>{innateSkillsWithDupes.duplicateCount}</strong> overlapping skill(s) unlocked {innateSkillsWithDupes.duplicateCount} extra replacement pick(s) from ANY skill!</>
                    )}
                    {bonusSkillPicks > innateSkillsWithDupes.duplicateCount && (
                      <> Plus <strong>{bonusSkillPicks - innateSkillsWithDupes.duplicateCount}</strong> bonus skill pick(s) from Race/Subclass/Feats.</>
                    )}
                  </span>
                </div>

                {/* Skill Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {ALL_SKILLS_5E.map((sk) => {
                    const isInnate = innateSkills.includes(sk.id);
                    const isClassAvailable = primaryClassDef.skillChoices?.availableSkills.includes(sk.id);
                    const allowAnySkill = bonusSkillPicks > 0 || isClassAvailable;
                    const isChosenClass = chosenClassSkills.includes(sk.id);
                    const isChecked = isInnate || isChosenClass;

                    return (
                      <button
                        key={sk.id}
                        type="button"
                        disabled={isInnate || (!isChecked && (chosenClassSkills.length >= maxClassSkillPicks || !allowAnySkill))}
                        onClick={() => {
                          if (isInnate) return;
                          if (isChosenClass) {
                            setChosenClassSkills((prev) => prev.filter((s) => s !== sk.id));
                            setChosenExpertise((prev) => prev.filter((s) => s !== sk.id));
                          } else if (chosenClassSkills.length < maxClassSkillPicks) {
                            setChosenClassSkills((prev) => [...prev, sk.id]);
                          }
                        }}
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                          isInnate
                            ? "bg-stone-900/90 border-emerald-600/50 text-emerald-300 cursor-default"
                            : isChosenClass
                            ? "bg-amber-600/20 border-amber-500 text-amber-200"
                            : allowAnySkill
                            ? "bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700"
                            : "bg-stone-950/40 border-stone-900 text-stone-600 opacity-50"
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
                          <span className="text-[10px] text-amber-400/80 font-mono">Class</span>
                        )}
                        {!isInnate && !isClassAvailable && allowAnySkill && (
                          <span className="text-[10px] text-sky-400/80 font-mono">Bonus/Swap</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Expertise Picker (Rogue / Bard / Skill Expert) */}
              {maxExpertisePicks > 0 && (
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-600/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-amber-200">
                        Expertise (Double Proficiency Bonus)
                      </h4>
                      <p className="text-xs text-stone-400">
                        Choose {maxExpertisePicks} proficient skills (or Thieves&apos; Tools for Rogue) to double your proficiency bonus.
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-300">
                      {chosenExpertise.length} / {maxExpertisePicks}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set([...innateSkills, ...chosenClassSkills])).map((skId) => {
                      const sk = ALL_SKILLS_5E.find((x) => x.id === skId);
                      if (!sk) return null;
                      const isExp = chosenExpertise.includes(skId);
                      return (
                        <button
                          key={skId}
                          type="button"
                          onClick={() => {
                            if (isExp) {
                              setChosenExpertise((prev) => prev.filter((s) => s !== skId));
                            } else if (chosenExpertise.length < maxExpertisePicks) {
                              setChosenExpertise((prev) => [...prev, skId]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                            isExp
                              ? "bg-amber-600 text-stone-950 border-amber-500"
                              : "bg-stone-950 border-stone-800 text-stone-300 hover:border-amber-500/40"
                          }`}
                        >
                          {sk.name} {isExp ? "★★" : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Armor, Weapon & Tool Proficiencies */}
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3 text-xs">
                <h4 className="text-sm font-semibold text-stone-200">Armor, Weapon & Tool Proficiencies</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-stone-900/70 border border-stone-800 space-y-1">
                    <div className="text-stone-400 font-semibold">Armor Proficiencies</div>
                    <div className="text-stone-200">{primaryClassDef.armorProficiencies.join(", ") || "None"}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-stone-900/70 border border-stone-800 space-y-1">
                    <div className="text-stone-400 font-semibold">Weapon Proficiencies</div>
                    <div className="text-stone-200">{primaryClassDef.weaponProficiencies.join(", ") || "None"}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-stone-300 font-semibold">
                    Tool, Kit & Instrument Proficiencies{" "}
                    <span className="text-stone-400 font-normal">
                      (Granted: {[...(bgDef.tools || []), ...(primaryClassDef.toolProficiencies || [])].join(", ") || "None"})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-lg bg-stone-900/60 border border-stone-800">
                    {TOOLS_5E.map((tool) => {
                      const isGranted =
                        (bgDef.tools || []).some((t) => t.toLowerCase() === tool.name.toLowerCase()) ||
                        (primaryClassDef.toolProficiencies || []).some((t) => t.toLowerCase() === tool.name.toLowerCase());
                      const isPicked = chosenToolProficiencies.includes(tool.name);
                      return (
                        <button
                          key={tool.id}
                          type="button"
                          disabled={isGranted}
                          onClick={() => {
                            if (isGranted) return;
                            setChosenToolProficiencies((prev) =>
                              isPicked ? prev.filter((t) => t !== tool.name) : [...prev, tool.name]
                            );
                          }}
                          className={`px-2.5 py-1 rounded-md border text-[11px] transition ${
                            isGranted
                              ? "bg-emerald-950/60 border-emerald-600/40 text-emerald-300"
                              : isPicked
                              ? "bg-amber-600 text-stone-950 font-bold border-amber-500"
                              : "bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-600"
                          }`}
                        >
                          {tool.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Languages Selection */}
              <div className="space-y-3 pt-3 border-t border-stone-800">
                <div>
                  <h4 className="text-sm font-semibold text-stone-200">Known Languages</h4>
                  <p className="text-xs text-stone-400">Standard and bonus languages from your race, class, and background.</p>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-3 text-xs">
                  <div>
                    <span className="text-stone-400 font-semibold">Innate Languages:</span>{" "}
                    <span className="text-amber-300 font-mono">
                      {[...raceDef.languages, ...(combinedClasses.some((c) => c.className === "Druid") ? ["Druidic"] : []), ...(combinedClasses.some((c) => c.className === "Rogue") ? ["Thieves' Cant"] : [])].join(", ") || "Common"}
                    </span>
                  </div>

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
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-stone-200">Ability Score Improvements (ASI) &amp; Feats</h3>
                  <p className="text-xs text-stone-400">
                    For each ASI milestone unlocked by your level, choose +2 Ability Scores (+2/+1+1) OR a Feat. Feats are completely optional!
                  </p>
                </div>
                {!hasRacialFeat && (
                  <label className="flex items-center gap-2 text-xs text-amber-300 bg-stone-950 border border-stone-800 px-3 py-1.5 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableDmBonusFeat}
                      onChange={(e) => setEnableDmBonusFeat(e.target.checked)}
                      className="rounded border-stone-700 bg-stone-900 text-amber-600 focus:ring-0"
                    />
                    <span>DM House Rule: Grant Lv 1 Bonus Feat</span>
                  </label>
                )}
              </div>

              {/* ASI Milestones (Levels 4, 6, 8, 10, 12, 14, 16, 19) */}
              {asiMilestones.length === 0 && !hasLevel1Feat ? (
                <div className="p-6 rounded-xl bg-stone-950 border border-stone-800 text-center space-y-2">
                  <Sparkles className="w-7 h-7 text-stone-600 mx-auto" />
                  <div className="text-sm font-semibold text-stone-200">
                    No ASI or Feat Required at Level {totalLevel}
                  </div>
                  <p className="text-xs text-stone-400 max-w-lg mx-auto">
                    Your race ({subraceDef?.name || raceDef.name}) does not force a Level 1 feat, and {primaryClass} unlocks its first Ability Score Improvement at Level {primaryClassDef.asiLevels[0] || 4}. You can enable the DM House Rule checkbox above if your campaign uses a free Level 1 feat, or click Next!
                  </p>
                </div>
              ) : null}

              {asiMilestones.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                    Unlocked Class ASI Milestones ({asiMilestones.length})
                  </div>
                  {asiMilestones.map((m) => {
                    const defaultPrimaryStat: StatKey =
                      primaryClassDef.primaryAbility.toLowerCase().includes("dex") ? "dex"
                      : primaryClassDef.primaryAbility.toLowerCase().includes("int") ? "int"
                      : primaryClassDef.primaryAbility.toLowerCase().includes("wis") ? "wis"
                      : primaryClassDef.primaryAbility.toLowerCase().includes("cha") ? "cha"
                      : "str";
                    const entry = asiChoicesByLevel[m.key] || { type: "stats", stat1: defaultPrimaryStat, stat2: defaultPrimaryStat };
                    const chosenMilestoneFeat = entry.featId ? FEATS_5E.find((f) => f.id === entry.featId) : undefined;

                    return (
                      <div key={m.key} className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="font-serif font-bold text-sm text-amber-200">
                            {m.className} Level {m.classLevel} Milestone
                          </span>
                          <div className="flex rounded-lg bg-stone-900 p-0.5 border border-stone-800 text-xs">
                            <button
                              type="button"
                              onClick={() =>
                                setAsiChoicesByLevel((prev) => ({
                                  ...prev,
                                  [m.key]: { ...entry, type: "stats", stat1: entry.stat1 || defaultPrimaryStat, stat2: entry.stat2 || defaultPrimaryStat },
                                }))
                              }
                              className={`px-3 py-1 rounded transition ${
                                entry.type === "stats" ? "bg-amber-600 text-stone-950 font-bold" : "text-stone-400"
                              }`}
                            >
                              +2 ASI (Stats)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setAsiChoicesByLevel((prev) => ({
                                  ...prev,
                                  [m.key]: { ...entry, type: "feat", featId: entry.featId || FEATS_5E[0].id, featStatChoice: entry.featStatChoice || "str" },
                                }))
                              }
                              className={`px-3 py-1 rounded transition ${
                                entry.type === "feat" ? "bg-amber-600 text-stone-950 font-bold" : "text-stone-400"
                              }`}
                            >
                              Choose a Feat
                            </button>
                          </div>
                        </div>

                        {entry.type === "stats" ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                              <label className="block text-stone-400 mb-1">First +1 Ability Score</label>
                              <select
                                value={entry.stat1 || defaultPrimaryStat}
                                onChange={(e) =>
                                  setAsiChoicesByLevel((prev) => ({
                                    ...prev,
                                    [m.key]: { ...entry, type: "stats", stat1: e.target.value as StatKey, stat2: entry.stat2 || defaultPrimaryStat },
                                  }))
                                }
                                className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-100"
                              >
                                {STAT_KEYS.map((st) => (
                                  <option key={st} value={st}>+1 {STAT_NAMES[st]}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-stone-400 mb-1">Second +1 Ability Score</label>
                              <select
                                value={entry.stat2 || defaultPrimaryStat}
                                onChange={(e) =>
                                  setAsiChoicesByLevel((prev) => ({
                                    ...prev,
                                    [m.key]: { ...entry, type: "stats", stat1: entry.stat1 || defaultPrimaryStat, stat2: e.target.value as StatKey },
                                  }))
                                }
                                className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-100"
                              >
                                {STAT_KEYS.map((st) => (
                                  <option key={st} value={st}>+1 {STAT_NAMES[st]}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2.5 text-xs">
                            <select
                              value={entry.featId || FEATS_5E[0].id}
                              onChange={(e) => {
                                const fObj = FEATS_5E.find((f) => f.id === e.target.value);
                                setAsiChoicesByLevel((prev) => ({
                                  ...prev,
                                  [m.key]: {
                                    ...entry,
                                    type: "feat",
                                    featId: e.target.value,
                                    featStatChoice: fObj?.statChoices?.[0] || "str",
                                  },
                                }));
                              }}
                              className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-100 font-serif text-sm"
                            >
                              {FEATS_5E.map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.name} {f.prerequisite ? `(Req: ${f.prerequisite})` : ""}
                                </option>
                              ))}
                            </select>
                            {chosenMilestoneFeat?.allowsStatChoice && chosenMilestoneFeat.statChoices && (
                              <div className="flex flex-wrap gap-1.5 items-center">
                                <span className="text-amber-300 font-semibold">Half-Feat +1 Stat:</span>
                                {chosenMilestoneFeat.statChoices.map((st) => (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() =>
                                      setAsiChoicesByLevel((prev) => ({
                                        ...prev,
                                        [m.key]: { ...entry, type: "feat", featStatChoice: st },
                                      }))
                                    }
                                    className={`px-2.5 py-1 rounded border uppercase font-mono ${
                                      (entry.featStatChoice || chosenMilestoneFeat.statChoices?.[0]) === st
                                        ? "bg-amber-600 text-stone-950 font-bold border-amber-500"
                                        : "bg-stone-900 text-stone-300 border-stone-700"
                                    }`}
                                  >
                                    +1 {st}
                                  </button>
                                ))}
                              </div>
                            )}
                            {chosenMilestoneFeat && (
                              <p className="text-xs text-stone-300 leading-relaxed bg-stone-900/70 p-3 rounded-lg border border-stone-800">
                                {chosenMilestoneFeat.description}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Level 1 Bonus Feat Picker (Only when granted by Race or DM House Rule) */}
              {hasLevel1Feat && (
                <div className="space-y-3 pt-2 border-t border-stone-800">
                  <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                    {hasRacialFeat
                      ? `Level 1 Starting Feat (${selectedRace === "Custom Lineage" ? "Custom Lineage" : "Variant Human"})`
                      : "Level 1 DM House-Rule Bonus Feat"}
                  </div>

                  {/* Full Unclipped Feats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                    {FEATS_5E.map((feat) => {
                      const isSelected = selectedFeatId === feat.id;
                      return (
                        <button
                          key={feat.id}
                          type="button"
                          onClick={() => {
                            setSelectedFeatId(feat.id);
                            if (feat.statChoices?.length && !feat.statChoices.includes(featStatChoice)) {
                              setFeatStatChoice(feat.statChoices[0]);
                            }
                          }}
                          className={`p-3.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "bg-amber-600/20 border-amber-500 shadow-md shadow-amber-900/30"
                              : "bg-stone-950/60 border-stone-800 hover:border-stone-700 hover:bg-stone-800/40"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className={`font-serif font-bold text-sm ${isSelected ? "text-amber-300" : "text-stone-200"}`}>
                              {feat.name}
                            </span>
                            {feat.prerequisite && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-400">
                                Req: {feat.prerequisite}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-300 mt-1.5 leading-relaxed">{feat.description}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Feat Half-Stat Picker if applicable */}
                  {(() => {
                    const currentFeat = FEATS_5E.find((f) => f.id === selectedFeatId);
                    if (currentFeat?.allowsStatChoice && currentFeat.statChoices) {
                      return (
                        <div className="p-3.5 rounded-xl bg-stone-950 border border-amber-500/40 space-y-2 text-xs">
                          <div className="text-amber-300 font-semibold">
                            {currentFeat.name} Stat Boost Choice:
                          </div>
                          <div className="flex flex-wrap gap-2">
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
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 7: EQUIPMENT SELECTION                                     */}
          {/* ============================================================== */}
          {step === 7 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-stone-200">Starting Equipment &amp; Gold Shop</h3>
                  <p className="text-xs text-stone-400">
                    Choose starting gear packages (with full weapon/armor/pack selection) or buy gear using Starting Gold.
                  </p>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-amber-300 bg-stone-950 border border-stone-800 px-3 py-1.5 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useStartingGold}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setUseStartingGold(next);
                      if (next && primaryClassDef.startingGoldAvg) {
                        setCustomGold(primaryClassDef.startingGoldAvg);
                      }
                    }}
                    className="rounded border-stone-700 bg-stone-900 text-amber-600 focus:ring-0"
                  />
                  <span>Starting Gold Shop ({primaryClassDef.startingGoldFormula || "Class Wealth"})</span>
                </label>
              </div>

              {!useStartingGold ? (
                <div className="space-y-4">
                  {/* Guided Class Choices (supporting any martial/simple weapon, pack, instrument) */}
                  {primaryClassDef.startingEquipmentChoices?.map((choice) => {
                    const selectedIdx = equipmentSelections[choice.id] ?? 0;
                    const chosenOpt = choice.options[selectedIdx];
                    const pickKey = `${choice.id}-${selectedIdx}`;
                    const pickedList = equipmentPickSelections[pickKey] || [];
                    const weaponPool =
                      chosenOpt?.pickFrom === "any_martial_weapon"
                        ? WEAPONS_5E.filter((w) => w.category === "martial")
                        : chosenOpt?.pickFrom === "any_martial_melee"
                        ? WEAPONS_5E.filter((w) => w.category === "martial" && w.rangeType === "melee")
                        : chosenOpt?.pickFrom === "any_simple_weapon"
                        ? WEAPONS_5E.filter((w) => w.category === "simple")
                        : chosenOpt?.pickFrom === "any_simple_melee"
                        ? WEAPONS_5E.filter((w) => w.category === "simple" && w.rangeType === "melee")
                        : [];

                    return (
                      <div key={choice.id} className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2.5">
                        <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                          {choice.name}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {choice.options.map((opt, optIdx) => {
                            const isSelected = selectedIdx === optIdx;
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

                        {chosenOpt?.pickFrom && weaponPool.length > 0 && (
                          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {Array.from({ length: chosenOpt.pickCount || 1 }).map((_, slotIdx) => (
                              <select
                                key={slotIdx}
                                value={pickedList[slotIdx] || weaponPool[0]?.name || ""}
                                onChange={(e) => {
                                  const next = [...pickedList];
                                  next[slotIdx] = e.target.value;
                                  setEquipmentPickSelections((prev) => ({ ...prev, [pickKey]: next }));
                                }}
                                className="bg-stone-900 border border-amber-500/40 rounded-lg px-3 py-2 text-xs text-stone-100"
                              >
                                {weaponPool.map((w) => (
                                  <option key={w.id} value={w.name}>
                                    {w.name} ({w.damage} {w.damageType} • {w.properties.join(", ") || "Standard"})
                                  </option>
                                ))}
                              </select>
                            ))}
                          </div>
                        )}

                        {chosenOpt?.pickFrom === "any_pack" && (
                          <div className="pt-2">
                            <select
                              value={pickedList[0] || "Explorer's Pack"}
                              onChange={(e) =>
                                setEquipmentPickSelections((prev) => ({ ...prev, [pickKey]: [e.target.value] }))
                              }
                              className="w-full sm:w-80 bg-stone-900 border border-amber-500/40 rounded-lg px-3 py-2 text-xs text-stone-100"
                            >
                              {PACKS_5E.map((p) => (
                                <option key={p.id} value={p.name}>
                                  {p.name} ({p.cost}) — {p.description.slice(0, 65)}...
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {chosenOpt?.pickFrom === "any_instrument" && (
                          <div className="pt-2">
                            <select
                              value={pickedList[0] || "Lute"}
                              onChange={(e) =>
                                setEquipmentPickSelections((prev) => ({ ...prev, [pickKey]: [e.target.value] }))
                              }
                              className="w-full sm:w-72 bg-stone-900 border border-amber-500/40 rounded-lg px-3 py-2 text-xs text-stone-100"
                            >
                              {TOOLS_5E.filter((t) => t.category === "instrument").map((t) => (
                                <option key={t.id} value={t.name}>
                                  {t.name} ({t.cost})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Background Gear Summary */}
                  <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2 text-xs">
                    <div className="font-semibold text-amber-400 uppercase tracking-wider">
                      Background &amp; Fixed Gear ({bgDef.name})
                    </div>
                    <div className="text-stone-300 space-y-1">
                      {primaryClassDef.fixedEquipment?.map((fe, i) => (
                        <div key={`fx-${i}`}>• {fe.name} (x{fe.quantity})</div>
                      ))}
                      {bgDef.startingEquipment.map((item, i) => (
                        <div key={`bg-${i}`}>• {item}</div>
                      ))}
                      <div>• Pouch containing {bgDef.startingGold} gp</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-stone-950 border border-amber-600/40 space-y-3 text-xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="font-semibold text-amber-400 uppercase tracking-wider">
                        Starting Gold Budget ({primaryClassDef.name})
                      </div>
                      <p className="text-stone-400">
                        Buy any Weapons, Armor, Shields, Packs, Tools, or Gear below—costs deduct automatically.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-stone-400">Budget:</span>
                        <input
                          type="number"
                          min={0}
                          max={5000}
                          value={customGold}
                          onChange={(e) => setCustomGold(parseInt(e.target.value, 10) || 0)}
                          className="w-20 bg-stone-900 border border-stone-700 rounded px-2 py-1 font-mono font-bold text-amber-300"
                        />
                        <span className="text-amber-400 font-bold">gp</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCustomGold(primaryClassDef.startingGoldAvg || 100)}
                        className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700"
                      >
                        Use {primaryClassDef.name} Avg ({primaryClassDef.startingGoldAvg || 100} gp)
                      </button>
                      <div className="px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-600/40 font-mono font-bold text-emerald-300">
                        Remaining: {remainingStartingGold} gp
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Embedded Equipment Catalog (Always Available: Gold Shop OR Extra Gear) */}
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                    {useStartingGold ? "Equipment Shop (Spend Gold)" : "Add Extra Weapons, Armor, Packs &amp; Gear"}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(["weapons", "armor", "packs", "tools", "gear", "custom"] as const).map((tb) => (
                      <button
                        key={tb}
                        type="button"
                        onClick={() => setEquipCatalogTab(tb)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition ${
                          equipCatalogTab === tb
                            ? "bg-amber-600 text-stone-950"
                            : "bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800"
                        }`}
                      >
                        {tb}
                      </button>
                    ))}
                  </div>
                </div>

                {equipCatalogTab !== "custom" && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={equipCatalogSearch}
                      onChange={(e) => setEquipCatalogSearch(e.target.value)}
                      placeholder={`Filter ${equipCatalogTab}...`}
                      className="w-full pl-9 pr-3 py-1.5 bg-stone-900 border border-stone-800 rounded-lg text-xs text-stone-200"
                    />
                  </div>
                )}

                <div className="max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1">
                  {equipCatalogTab === "weapons" &&
                    WEAPONS_5E.filter(
                      (w) =>
                        !equipCatalogSearch.trim() ||
                        w.name.toLowerCase().includes(equipCatalogSearch.toLowerCase()) ||
                        w.category.toLowerCase().includes(equipCatalogSearch.toLowerCase())
                    ).map((w) => {
                      const costGp = parseCostToGp(w.cost);
                      const canAfford = !useStartingGold || remainingStartingGold >= costGp;
                      return (
                        <div key={w.id} className="p-2.5 rounded-lg bg-stone-900/70 border border-stone-800 flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <div className="font-semibold text-stone-100 truncate">{w.name}</div>
                            <div className="text-[11px] text-stone-400">
                              {w.damage} {w.damageType} • {w.category} • <span className="text-amber-300">{w.cost}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() =>
                              setExtraPurchasedItems((prev) => [
                                ...prev,
                                {
                                  id: `shop-${w.id}-${Date.now()}-${Math.random()}`,
                                  name: w.name,
                                  category: "weapon",
                                  quantity: 1,
                                  weight: w.weight,
                                  equipped: true,
                                  equippedSlot: "mainHand",
                                  damage: w.damage,
                                  damageType: w.damageType,
                                  versatileDamage: w.versatileDamage,
                                  properties: w.properties,
                                  range: w.range,
                                  _costGp: costGp,
                                  _boughtWithGold: useStartingGold,
                                },
                              ])
                            }
                            className="px-2.5 py-1 rounded bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-stone-950 border border-amber-600/40 disabled:opacity-35 font-bold shrink-0"
                          >
                            {useStartingGold ? `Buy (${w.cost})` : "+ Add"}
                          </button>
                        </div>
                      );
                    })}

                  {equipCatalogTab === "armor" &&
                    ARMOR_5E.filter(
                      (a) =>
                        !equipCatalogSearch.trim() ||
                        a.name.toLowerCase().includes(equipCatalogSearch.toLowerCase()) ||
                        a.category.toLowerCase().includes(equipCatalogSearch.toLowerCase())
                    ).map((a) => {
                      const costGp = parseCostToGp(a.cost);
                      const canAfford = !useStartingGold || remainingStartingGold >= costGp;
                      return (
                        <div key={a.id} className="p-2.5 rounded-lg bg-stone-900/70 border border-stone-800 flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <div className="font-semibold text-stone-100 truncate">{a.name}</div>
                            <div className="text-[11px] text-stone-400">
                              AC {a.baseAc}{a.addDex ? " + DEX" : ""} • {a.category} • <span className="text-amber-300">{a.cost}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() =>
                              setExtraPurchasedItems((prev) => [
                                ...prev,
                                {
                                  id: `shop-${a.id}-${Date.now()}-${Math.random()}`,
                                  name: a.name,
                                  category: a.category === "shield" ? "shield" : "armor",
                                  armorCategory: a.category === "shield" ? undefined : a.category,
                                  quantity: 1,
                                  weight: a.weight,
                                  equipped: true,
                                  equippedSlot: a.category === "shield" ? "shield" : "armor",
                                  baseAc: a.baseAc,
                                  maxDexMod: a.maxDexMod,
                                  stealthDisadvantage: a.stealthDisadvantage,
                                  _costGp: costGp,
                                  _boughtWithGold: useStartingGold,
                                },
                              ])
                            }
                            className="px-2.5 py-1 rounded bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-stone-950 border border-amber-600/40 disabled:opacity-35 font-bold shrink-0"
                          >
                            {useStartingGold ? `Buy (${a.cost})` : "+ Add"}
                          </button>
                        </div>
                      );
                    })}

                  {equipCatalogTab === "packs" &&
                    PACKS_5E.filter(
                      (p) => !equipCatalogSearch.trim() || p.name.toLowerCase().includes(equipCatalogSearch.toLowerCase())
                    ).map((p) => {
                      const costGp = parseCostToGp(p.cost);
                      const canAfford = !useStartingGold || remainingStartingGold >= costGp;
                      return (
                        <div key={p.id} className="p-2.5 rounded-lg bg-stone-900/70 border border-stone-800 flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <div className="font-semibold text-stone-100">{p.name} <span className="text-amber-300">({p.cost})</span></div>
                            <div className="text-[11px] text-stone-400 truncate">{p.description}</div>
                          </div>
                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() =>
                              setExtraPurchasedItems((prev) => [
                                ...prev,
                                {
                                  id: `shop-${p.id}-${Date.now()}-${Math.random()}`,
                                  name: p.name,
                                  category: "gear",
                                  quantity: 1,
                                  weight: p.weight,
                                  description: `Contents: ${p.description}`,
                                  _costGp: costGp,
                                  _boughtWithGold: useStartingGold,
                                },
                              ])
                            }
                            className="px-2.5 py-1 rounded bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-stone-950 border border-amber-600/40 disabled:opacity-35 font-bold shrink-0"
                          >
                            {useStartingGold ? `Buy (${p.cost})` : "+ Add"}
                          </button>
                        </div>
                      );
                    })}

                  {equipCatalogTab === "tools" &&
                    TOOLS_5E.filter(
                      (t) => !equipCatalogSearch.trim() || t.name.toLowerCase().includes(equipCatalogSearch.toLowerCase())
                    ).map((t) => {
                      const costGp = parseCostToGp(t.cost);
                      const canAfford = !useStartingGold || remainingStartingGold >= costGp;
                      return (
                        <div key={t.id} className="p-2.5 rounded-lg bg-stone-900/70 border border-stone-800 flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <div className="font-semibold text-stone-100 truncate">{t.name}</div>
                            <div className="text-[11px] text-stone-400">{t.category} • <span className="text-amber-300">{t.cost}</span></div>
                          </div>
                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() =>
                              setExtraPurchasedItems((prev) => [
                                ...prev,
                                {
                                  id: `shop-${t.id}-${Date.now()}-${Math.random()}`,
                                  name: t.name,
                                  category: "tool",
                                  quantity: 1,
                                  weight: t.weight,
                                  description: t.description,
                                  _costGp: costGp,
                                  _boughtWithGold: useStartingGold,
                                },
                              ])
                            }
                            className="px-2.5 py-1 rounded bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-stone-950 border border-amber-600/40 disabled:opacity-35 font-bold shrink-0"
                          >
                            {useStartingGold ? `Buy (${t.cost})` : "+ Add"}
                          </button>
                        </div>
                      );
                    })}

                  {equipCatalogTab === "gear" &&
                    GEAR_5E.filter(
                      (g) => !equipCatalogSearch.trim() || g.name.toLowerCase().includes(equipCatalogSearch.toLowerCase())
                    ).map((g) => {
                      const costGp = parseCostToGp(g.cost);
                      const canAfford = !useStartingGold || remainingStartingGold >= costGp;
                      return (
                        <div key={g.id} className="p-2.5 rounded-lg bg-stone-900/70 border border-stone-800 flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <div className="font-semibold text-stone-100 truncate">{g.name}</div>
                            <div className="text-[11px] text-stone-400 truncate">{g.cost} • {g.description}</div>
                          </div>
                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() =>
                              setExtraPurchasedItems((prev) => [
                                ...prev,
                                {
                                  id: `shop-${g.id}-${Date.now()}-${Math.random()}`,
                                  name: g.name,
                                  category: g.category as any,
                                  quantity: 1,
                                  weight: g.weight,
                                  magicBonusAc: g.magicBonusAc,
                                  magicBonusAttack: g.magicBonusAttack,
                                  magicBonusDamage: g.magicBonusDamage,
                                  description: g.description,
                                  _costGp: costGp,
                                  _boughtWithGold: useStartingGold,
                                },
                              ])
                            }
                            className="px-2.5 py-1 rounded bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-stone-950 border border-amber-600/40 disabled:opacity-35 font-bold shrink-0"
                          >
                            {useStartingGold ? `Buy (${g.cost})` : "+ Add"}
                          </button>
                        </div>
                      );
                    })}

                  {equipCatalogTab === "custom" && (
                    <div className="col-span-full p-3 rounded-lg bg-stone-900 border border-stone-800 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                      <input
                        type="text"
                        value={customEquipName}
                        onChange={(e) => setCustomEquipName(e.target.value)}
                        placeholder="Custom item name"
                        className="sm:col-span-2 bg-stone-950 border border-stone-700 rounded px-2.5 py-1.5 text-stone-100"
                      />
                      <select
                        value={customEquipCategory}
                        onChange={(e) => setCustomEquipCategory(e.target.value as any)}
                        className="bg-stone-950 border border-stone-700 rounded px-2 py-1.5 text-stone-100"
                      >
                        <option value="weapon">Weapon</option>
                        <option value="armor">Armor</option>
                        <option value="shield">Shield</option>
                        <option value="gear">Gear</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          if (!customEquipName.trim()) return;
                          setExtraPurchasedItems((prev) => [
                            ...prev,
                            {
                              id: `custom-wiz-${Date.now()}`,
                              name: customEquipName.trim(),
                              category: customEquipCategory,
                              quantity: 1,
                              weight: 2,
                              equipped: customEquipCategory !== "gear",
                              damage: customEquipCategory === "weapon" ? customEquipDamage : undefined,
                              baseAc: customEquipCategory === "armor" || customEquipCategory === "shield" ? customEquipAc : undefined,
                              _costGp: 0,
                              _boughtWithGold: false,
                            },
                          ]);
                          setCustomEquipName("");
                        }}
                        className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded px-3 py-1.5"
                      >
                        + Add Custom
                      </button>
                    </div>
                  )}
                </div>

                {/* Purchased / Added Gear List */}
                {extraPurchasedItems.length > 0 && (
                  <div className="pt-2 border-t border-stone-800 space-y-1.5 text-xs">
                    <div className="text-stone-400 font-semibold">
                      Added / Purchased Gear ({extraPurchasedItems.length} items):
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {extraPurchasedItems.map((it) => (
                        <span
                          key={it.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/40 border border-amber-600/40 text-amber-200"
                        >
                          {it.name}
                          {it._boughtWithGold && it._costGp ? ` (-${it._costGp} gp)` : ""}
                          <button
                            type="button"
                            onClick={() => setExtraPurchasedItems((prev) => prev.filter((x) => x.id !== it.id))}
                            className="text-stone-400 hover:text-red-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 8: SPELLS (CONTEXTUAL)                                     */}
          {/* ============================================================== */}
          {step === 8 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-stone-200">
                    Spellbook &amp; Prepared Spells (Up to Level {maxCastableSpellLevel})
                  </h3>
                  <p className="text-xs text-stone-400">
                    {isSpellcaster
                      ? `Select cantrips and spells up to Level ${maxCastableSpellLevel}, or add custom homebrew spells.`
                      : "Your class does not use spells. You can proceed to the Review step."}
                  </p>
                </div>
                {isSpellcaster && (
                  <button
                    type="button"
                    onClick={() => setShowCustomSpellForm(!showCustomSpellForm)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-bold transition"
                  >
                    {showCustomSpellForm ? "Back to Spell List" : "+ Custom Spell"}
                  </button>
                )}
              </div>

              {isSpellcaster ? (
                <div className="space-y-4">
                  {/* Live Slot Calculation Preview */}
                  {(() => {
                    const previewSlots = calcMulticlassSpellSlots(combinedClasses);
                    const warlockEntry = combinedClasses.find((c) => c.className === "Warlock");
                    const pactPreview = warlockEntry ? calcWarlockPactSlots(warlockEntry.level) : null;
                    return (
                      <div className="p-3 rounded-xl bg-stone-950 border border-indigo-500/30 flex items-center gap-2 flex-wrap text-xs">
                        <span className="text-indigo-300 font-semibold">Unlocked Spell Slots:</span>
                        {Object.entries(previewSlots)
                          .filter(([, count]) => count > 0)
                          .map(([lvl, count]) => (
                            <span key={lvl} className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-700/50 font-mono text-indigo-200">
                              Lv {lvl}: {count}
                            </span>
                          ))}
                        {pactPreview && pactPreview.count > 0 && (
                          <span className="px-2 py-0.5 rounded bg-purple-950 border border-purple-700/50 font-mono text-purple-200">
                            Pact (Short Rest): {pactPreview.count} × Lv {pactPreview.slotLevel}
                          </span>
                        )}
                      </div>
                    );
                  })()}

                  {showCustomSpellForm ? (
                    <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3 text-xs">
                      <div className="font-semibold text-amber-300">Add Custom Spell</div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <input
                          type="text"
                          value={customSpellName}
                          onChange={(e) => setCustomSpellName(e.target.value)}
                          placeholder="Spell Name..."
                          className="sm:col-span-2 bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-100"
                        />
                        <select
                          value={customSpellLevel}
                          onChange={(e) => setCustomSpellLevel(parseInt(e.target.value, 10))}
                          className="bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-100"
                        >
                          <option value={0}>Cantrip (0)</option>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => (
                            <option key={l} value={l}>Level {l}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <select
                          value={customSpellSchool}
                          onChange={(e) => setCustomSpellSchool(e.target.value as Spell5e["school"])}
                          className="bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-100"
                        >
                          {["Evocation", "Abjuration", "Conjuration", "Divination", "Enchantment", "Illusion", "Necromancy", "Transmutation"].map((sch) => (
                            <option key={sch} value={sch}>{sch}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={customSpellDamage}
                          onChange={(e) => setCustomSpellDamage(e.target.value)}
                          placeholder="Damage (e.g. 3d8)"
                          className="bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-100"
                        />
                        <input
                          type="text"
                          value={customSpellHealing}
                          onChange={(e) => setCustomSpellHealing(e.target.value)}
                          placeholder="Healing (e.g. 2d6)"
                          className="bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-100"
                        />
                      </div>
                      <textarea
                        rows={3}
                        value={customSpellDesc}
                        onChange={(e) => setCustomSpellDesc(e.target.value)}
                        placeholder="Describe what the spell does..."
                        className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-100"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!customSpellName.trim()) return;
                          setCustomSpells((prev) => [
                            ...prev,
                            {
                              id: `custom-spell-${Date.now()}`,
                              name: customSpellName.trim(),
                              level: customSpellLevel,
                              school: customSpellSchool,
                              castingTime: "1 action",
                              range: "60 feet",
                              components: "V, S",
                              duration: "Instantaneous",
                              concentration: false,
                              ritual: false,
                              damageDice: customSpellDamage.trim() || undefined,
                              damageType: customSpellDamageType.trim() || undefined,
                              healingDice: customSpellHealing.trim() || undefined,
                              description: customSpellDesc.trim() || "Custom spell.",
                              prepared: true,
                            },
                          ]);
                          setCustomSpellName("");
                          setCustomSpellDesc("");
                          setCustomSpellDamage("");
                          setCustomSpellHealing("");
                          setShowCustomSpellForm(false);
                        }}
                        className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold"
                      >
                        Save Custom Spell
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Filters & Level Tabs */}
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="relative flex-1 min-w-[200px]">
                            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                            <input
                              type="text"
                              value={spellSearch}
                              onChange={(e) => setSpellSearch(e.target.value)}
                              placeholder="Search spells by name, school, or description..."
                              className="w-full pl-9 pr-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200"
                            />
                          </div>
                          <select
                            value={spellClassFilter}
                            onChange={(e) => setSpellClassFilter(e.target.value)}
                            className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200"
                          >
                            <option value="caster">My Class List ({combinedClasses.map((c) => c.className).join("/")})</option>
                            <option value="all">All Class Lists (Incl. Magical Secrets)</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1 flex-wrap bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs">
                          <button
                            type="button"
                            onClick={() => setSpellLevelTab("all")}
                            className={`px-2.5 py-1 rounded-lg transition ${spellLevelTab === "all" ? "bg-amber-600 text-stone-950 font-bold" : "text-stone-400 hover:text-stone-200"}`}
                          >
                            All Unlocked (0–{maxCastableSpellLevel})
                          </button>
                          <button
                            type="button"
                            onClick={() => setSpellLevelTab(0)}
                            className={`px-2.5 py-1 rounded-lg transition ${spellLevelTab === 0 ? "bg-amber-600 text-stone-950 font-bold" : "text-stone-400 hover:text-stone-200"}`}
                          >
                            Cantrips ({selectedCantrips.length})
                          </button>
                          {Array.from({ length: maxCastableSpellLevel }, (_, idx) => idx + 1).map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => setSpellLevelTab(lvl)}
                              className={`px-2.5 py-1 rounded-lg transition font-mono ${spellLevelTab === lvl ? "bg-amber-600 text-stone-950 font-bold" : "text-stone-400 hover:text-stone-200"}`}
                            >
                              Lv {lvl}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Spell Cards with Full Descriptions */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                        {SPELLS_5E.filter((sp) => {
                          if (sp.level > maxCastableSpellLevel) return false;
                          if (spellLevelTab !== "all" && sp.level !== spellLevelTab) return false;
                          if (spellClassFilter === "caster") {
                            const casterNames = combinedClasses.map((c) =>
                              c.subclass === "Eldritch Knight" || c.subclass === "Arcane Trickster" ? "Wizard" : c.className
                            );
                            if (!sp.classes.some((c) => casterNames.includes(c))) return false;
                          }
                          if (spellSearch.trim()) {
                            const q = spellSearch.toLowerCase();
                            return (
                              sp.name.toLowerCase().includes(q) ||
                              sp.school.toLowerCase().includes(q) ||
                              sp.description.toLowerCase().includes(q)
                            );
                          }
                          return true;
                        }).map((sp) => {
                          const isCantrip = sp.level === 0;
                          const isSelected = isCantrip
                            ? selectedCantrips.includes(sp.id)
                            : selectedSpells.includes(sp.id);
                          return (
                            <button
                              key={sp.id}
                              type="button"
                              onClick={() => {
                                if (isCantrip) {
                                  setSelectedCantrips((prev) =>
                                    isSelected ? prev.filter((id) => id !== sp.id) : [...prev, sp.id]
                                  );
                                } else {
                                  setSelectedSpells((prev) =>
                                    isSelected ? prev.filter((id) => id !== sp.id) : [...prev, sp.id]
                                  );
                                }
                              }}
                              className={`p-3 rounded-xl border text-left text-xs transition-all space-y-1.5 ${
                                isSelected
                                  ? "bg-amber-600/20 border-amber-500 text-amber-100"
                                  : "bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="font-serif font-bold text-sm text-amber-200">{sp.name}</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-700/50 text-indigo-300">
                                  {sp.level === 0 ? "Cantrip" : `Lv ${sp.level}`} • {sp.school}
                                </span>
                              </div>
                              <div className="text-[11px] text-stone-400">
                                {sp.castingTime} • {sp.range} • {sp.duration}
                                {sp.concentration ? " • Concentration" : ""}
                                {sp.ritual ? " • Ritual" : ""}
                                {sp.damageDice ? ` • ${sp.damageDice} ${sp.damageType || ""}` : ""}
                                {sp.healingDice ? ` • Heal ${sp.healingDice}` : ""}
                              </div>
                              <p className="text-[11px] text-stone-300 leading-relaxed">{sp.description}</p>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {customSpells.length > 0 && (
                    <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-1.5 text-xs">
                      <div className="text-amber-300 font-semibold">Custom Spells Added ({customSpells.length}):</div>
                      <div className="flex flex-wrap gap-1.5">
                        {customSpells.map((cs) => (
                          <span key={cs.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-950/60 border border-indigo-700/50 text-indigo-200">
                            {cs.name} ({cs.level === 0 ? "Cantrip" : `Lv ${cs.level}`})
                            <button
                              type="button"
                              onClick={() => setCustomSpells((prev) => prev.filter((x) => x.id !== cs.id))}
                              className="text-stone-400 hover:text-red-400"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
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
