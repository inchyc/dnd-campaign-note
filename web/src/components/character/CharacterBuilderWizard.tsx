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
} from "lucide-react";
import { CLASSES_5E } from "@/data/5e/classes";
import { RACES_5E } from "@/data/5e/races";
import { BACKGROUNDS_5E } from "@/data/5e/backgrounds";
import { WEAPONS_5E, ARMOR_5E, GEAR_5E } from "@/data/5e/equipment";
import {
  calcModifier,
  formatModifier,
  calcPointBuyCost,
  roll4d6DropLowest,
  calculateArmorClass,
} from "@/data/5e/rulesEngine";
import type { CharacterSheetData, InventoryItemData } from "@/app/api/character/sheet/route";

interface CharacterBuilderWizardProps {
  userId: string;
  defaultCharacterName?: string;
  onClose: () => void;
  onSave: (sheet: CharacterSheetData) => Promise<void>;
}

type StatKey = "str" | "dex" | "con" | "int" | "wis" | "cha";
const STAT_NAMES: Record<StatKey, string> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

export function CharacterBuilderWizard({
  userId,
  defaultCharacterName = "",
  onClose,
  onSave,
}: CharacterBuilderWizardProps) {
  const [step, setStep] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  // Form State
  const [characterName, setCharacterName] = useState(defaultCharacterName || "Hero");
  const [selectedClass, setSelectedClass] = useState<string>("Fighter");
  const [selectedRace, setSelectedRace] = useState<string>("Human");
  const [selectedSubrace, setSelectedSubrace] = useState<string>("standard_human");
  const [selectedBackground, setSelectedBackground] = useState<string>("Soldier");
  const [alignment, setAlignment] = useState<string>("Neutral Good");

  // Stat Generation Mode: "standard" | "pointbuy" | "roll"
  const [statMode, setStatMode] = useState<"standard" | "pointbuy" | "roll">("standard");

  // Base raw scores (before racial bonuses)
  const [baseStats, setBaseStats] = useState<Record<StatKey, number>>({
    str: 15,
    dex: 14,
    con: 13,
    int: 12,
    wis: 10,
    cha: 8,
  });

  // Rolled dice results
  const [rolledPool, setRolledPool] = useState<Array<{ total: number; rolls: number[]; dropped: number }>>([]);

  // Race data lookup
  const raceDef = RACES_5E[selectedRace] || RACES_5E["Human"];
  const subraceDef = raceDef.subraces.find((sr) => sr.id === selectedSubrace);
  const classDef = CLASSES_5E[selectedClass] || CLASSES_5E["Fighter"];
  const bgDef = BACKGROUNDS_5E[selectedBackground] || BACKGROUNDS_5E["Soldier"];

  // Compute racial ability bonuses
  const racialBonuses = useMemo(() => {
    const bonuses: Record<StatKey, number> = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
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
    return bonuses;
  }, [raceDef, subraceDef]);

  // Final stats = base + racial
  const finalStats = useMemo(() => {
    return {
      str: (baseStats.str || 10) + (racialBonuses.str || 0),
      dex: (baseStats.dex || 10) + (racialBonuses.dex || 0),
      con: (baseStats.con || 10) + (racialBonuses.con || 0),
      int: (baseStats.int || 10) + (racialBonuses.int || 0),
      wis: (baseStats.wis || 10) + (racialBonuses.wis || 0),
      cha: (baseStats.cha || 10) + (racialBonuses.cha || 0),
    };
  }, [baseStats, racialBonuses]);

  // Point Buy Remaining
  const pointBuySpent = useMemo(() => {
    let spent = 0;
    for (const val of Object.values(baseStats)) {
      spent += calcPointBuyCost(val);
    }
    return spent;
  }, [baseStats]);

  // Handle dice rolling
  const handleRollStats = () => {
    const pool = [
      roll4d6DropLowest(),
      roll4d6DropLowest(),
      roll4d6DropLowest(),
      roll4d6DropLowest(),
      roll4d6DropLowest(),
      roll4d6DropLowest(),
    ];
    setRolledPool(pool);
    // Sort descending and auto-assign
    const sorted = [...pool].sort((a, b) => b.total - a.total);
    setBaseStats({
      str: sorted[0].total,
      dex: sorted[1].total,
      con: sorted[2].total,
      int: sorted[3].total,
      wis: sorted[4].total,
      cha: sorted[5].total,
    });
  };

  // Switch Stat Mode
  const handleStatModeChange = (mode: "standard" | "pointbuy" | "roll") => {
    setStatMode(mode);
    if (mode === "standard") {
      setBaseStats({ str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 });
    } else if (mode === "pointbuy") {
      setBaseStats({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 });
    } else if (mode === "roll") {
      handleRollStats();
    }
  };

  // Level 1 HP
  const hitDieMax = parseInt(classDef.hitDie.replace("d", ""), 10) || 10;
  const conMod = calcModifier(finalStats.con);
  const hpMax = Math.max(1, hitDieMax + conMod + (subraceDef?.id === "hill_dwarf" ? 1 : 0));

  // Assemble starting equipment bundle
  const handleFinish = async () => {
    setSaving(true);
    try {
      const inventoryItems: InventoryItemData[] = [];
      let equippedArmorItem: InventoryItemData | undefined;
      let equippedShieldItem: InventoryItemData | undefined;

      // Class Starting Gear presets
      if (selectedClass === "Barbarian") {
        inventoryItems.push({
          id: "item-greataxe",
          name: "Greataxe",
          category: "weapon",
          quantity: 1,
          weight: 7,
          equipped: true,
          equippedSlot: "mainHand",
          damage: "1d12",
          damageType: "slashing",
          properties: ["heavy", "two-handed"],
        });
        inventoryItems.push({
          id: "item-handaxe-1",
          name: "Handaxe (2)",
          category: "weapon",
          quantity: 2,
          weight: 4,
          damage: "1d6",
          damageType: "slashing",
          properties: ["light", "thrown"],
          range: "20/60",
        });
      } else if (selectedClass === "Rogue") {
        equippedArmorItem = {
          id: "item-leather",
          name: "Leather Armor",
          category: "armor",
          quantity: 1,
          weight: 10,
          equipped: true,
          equippedSlot: "armor",
          baseAc: 11,
        };
        inventoryItems.push(equippedArmorItem);
        inventoryItems.push({
          id: "item-rapier",
          name: "Rapier",
          category: "weapon",
          quantity: 1,
          weight: 2,
          equipped: true,
          equippedSlot: "mainHand",
          damage: "1d8",
          damageType: "piercing",
          properties: ["finesse"],
        });
        inventoryItems.push({
          id: "item-shortbow",
          name: "Shortbow",
          category: "weapon",
          quantity: 1,
          weight: 2,
          damage: "1d6",
          damageType: "piercing",
          properties: ["two-handed", "ammunition"],
          range: "80/320",
        });
        inventoryItems.push({
          id: "item-thieves-tools",
          name: "Thieves' Tools",
          category: "tool",
          quantity: 1,
          weight: 1,
          description: "Essential for picking locks and disarming traps.",
        });
      } else if (selectedClass === "Wizard") {
        inventoryItems.push({
          id: "item-quarterstaff",
          name: "Quarterstaff",
          category: "weapon",
          quantity: 1,
          weight: 4,
          equipped: true,
          equippedSlot: "mainHand",
          damage: "1d6",
          damageType: "bludgeoning",
          versatileDamage: "1d8",
          properties: ["versatile"],
        });
        inventoryItems.push({
          id: "item-wand",
          name: "Arcane Focus (Wand)",
          category: "gear",
          quantity: 1,
          weight: 1,
        });
        inventoryItems.push({
          id: "item-spellbook",
          name: "Spellbook",
          category: "gear",
          quantity: 1,
          weight: 3,
          description: "Contains prepared spells and ritual inscriptions.",
        });
      } else {
        // Standard Fighter / Paladin / Cleric / Ranger
        equippedArmorItem = {
          id: "item-chainshirt",
          name: "Chain Shirt",
          category: "armor",
          quantity: 1,
          weight: 20,
          equipped: true,
          equippedSlot: "armor",
          baseAc: 13,
          maxDexMod: 2,
        };
        equippedShieldItem = {
          id: "item-shield",
          name: "Shield",
          category: "shield",
          quantity: 1,
          weight: 6,
          equipped: true,
          equippedSlot: "shield",
          baseAc: 2,
        };
        inventoryItems.push(equippedArmorItem);
        inventoryItems.push(equippedShieldItem);
        inventoryItems.push({
          id: "item-longsword",
          name: "Longsword",
          category: "weapon",
          quantity: 1,
          weight: 3,
          equipped: true,
          equippedSlot: "mainHand",
          damage: "1d8",
          damageType: "slashing",
          versatileDamage: "1d10",
          properties: ["versatile"],
        });
      }

      // Add background gear
      bgDef.startingEquipment.forEach((item, idx) => {
        inventoryItems.push({
          id: `item-bg-${idx}`,
          name: item,
          category: "gear",
          quantity: 1,
          weight: 2,
        });
      });

      // Calculate initial AC
      const acCalc = calculateArmorClass(
        finalStats,
        [{ className: selectedClass, level: 1 }],
        equippedArmorItem ? { name: equippedArmorItem.name, baseAc: equippedArmorItem.baseAc || 11, category: equippedArmorItem.name.includes("Chain") ? "medium" : "light" } : undefined,
        equippedShieldItem ? { name: equippedShieldItem.name, baseAc: 2 } : undefined
      );

      // Saves
      const savingThrows: Record<string, boolean> = {};
      classDef.savingThrows.forEach((st) => {
        savingThrows[st] = true;
      });

      // Skills
      const skills: Record<string, number> = {};
      bgDef.skills.forEach((sk) => {
        skills[sk] = 1;
      });
      if (raceDef.traits.some((t) => t.name === "Keen Senses")) {
        skills["perception"] = 1;
      }
      if (raceDef.traits.some((t) => t.name === "Menacing")) {
        skills["intimidation"] = 1;
      }

      // Class features at level 1
      const initialFeatures = classDef.features
        .filter((f) => f.level === 1)
        .map((f, i) => ({
          id: `feat-${i}-${f.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
          name: f.name,
          source: `${selectedClass} 1`,
          level: 1,
          description: f.description,
        }));

      // Initial attacks
      const attacks = inventoryItems
        .filter((it) => it.category === "weapon" && it.equipped)
        .map((wpn, i) => {
          const isFinesse = wpn.properties?.includes("finesse");
          const mod = isFinesse ? Math.max(calcModifier(finalStats.str), calcModifier(finalStats.dex)) : calcModifier(finalStats.str);
          const toHit = 2 + mod; // PB = 2 at lv 1
          return {
            id: `atk-${i + 1}`,
            name: wpn.name,
            atkBonus: formatModifier(toHit),
            damage: `${wpn.damage}${formatModifier(mod)} ${wpn.damageType || ""}`,
            notes: wpn.properties?.join(", "),
          };
        });

      const newSheet: CharacterSheetData = {
        userId,
        name: characterName,
        character: characterName,
        class: selectedClass,
        level: 1,
        classes: [
          {
            className: selectedClass,
            level: 1,
            hitDie: classDef.hitDie,
          },
        ],
        race: selectedRace,
        subrace: subraceDef?.name,
        background: selectedBackground,
        alignment,
        xp: 0,
        inspiration: false,
        stats: finalStats,
        savingThrows,
        hpCurrent: hpMax,
        hpMax,
        hpTemp: 0,
        ac: acCalc.ac,
        speed: raceDef.speed,
        initiativeBonus: calcModifier(finalStats.dex),
        hitDiceTotal: `1${classDef.hitDie}`,
        hitDiceCurrent: 1,
        deathSaves: { successes: 0, failures: 0 },
        skills,
        attacks,
        inventoryItems,
        equipped: {
          armorId: equippedArmorItem?.id,
          shieldId: equippedShieldItem?.id,
        },
        spellcastingAbility: classDef.spellcastingAbility || "none",
        spellSlots: {
          1: { total: classDef.spellcastingType === "full" ? 2 : 0, used: 0 },
          2: { total: 0, used: 0 },
          3: { total: 0, used: 0 },
          4: { total: 0, used: 0 },
          5: { total: 0, used: 0 },
          6: { total: 0, used: 0 },
          7: { total: 0, used: 0 },
          8: { total: 0, used: 0 },
          9: { total: 0, used: 0 },
        },
        pactSlots: selectedClass === "Warlock" ? { level: 1, total: 1, used: 0 } : undefined,
        spells: [],
        featureList: initialFeatures,
        features: initialFeatures.map((f) => `${f.name}: ${f.description}`).join("\n\n"),
        inventory: inventoryItems.map((i) => `${i.name} (x${i.quantity})`).join(", "),
        companions: [],
        notes: `Created with D&D 5e Character Builder. Alignment: ${alignment}.`,
        updatedAt: Date.now(),
      };

      await onSave(newSheet);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-stone-900 border border-amber-600/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-950/80 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-stone-950 font-bold shadow-lg shadow-amber-900/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-amber-100">
                5e Character Builder Wizard
              </h2>
              <p className="text-xs text-stone-400">
                Step {step} of 5: {step === 1 && "Choose Class & Concept"}
                {step === 2 && "Generate Ability Scores"}
                {step === 3 && "Select Race & Heritage"}
                {step === 4 && "Choose Background"}
                {step === 5 && "Review & Starting Equipment"}
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
        <div className="grid grid-cols-5 border-b border-stone-800 text-xs">
          {[
            { num: 1, label: "Class" },
            { num: 2, label: "Abilities" },
            { num: 3, label: "Race" },
            { num: 4, label: "Background" },
            { num: 5, label: "Review" },
          ].map((s) => (
            <button
              key={s.num}
              onClick={() => setStep(s.num)}
              className={`py-2.5 px-3 flex items-center justify-center gap-2 border-r last:border-r-0 border-stone-800 transition-colors ${
                step === s.num
                  ? "bg-amber-600/20 text-amber-300 font-bold border-b-2 border-b-amber-500"
                  : step > s.num
                  ? "text-stone-300 hover:bg-stone-800/40"
                  : "text-stone-500 hover:bg-stone-800/20"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  step === s.num
                    ? "bg-amber-500 text-stone-950 font-bold"
                    : step > s.num
                    ? "bg-emerald-600 text-white"
                    : "bg-stone-800 text-stone-400"
                }`}
              >
                {step > s.num ? "✓" : s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Step Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: CLASS SELECTION & GUIDANCE */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
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
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
                  Select Class
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {Object.keys(CLASSES_5E).map((cName) => {
                    const cls = CLASSES_5E[cName];
                    const isSelected = selectedClass === cName;
                    return (
                      <button
                        key={cName}
                        type="button"
                        onClick={() => setSelectedClass(cName)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "bg-amber-600/20 border-amber-500 shadow-md shadow-amber-900/30"
                            : "bg-stone-950/60 border-stone-800 hover:border-stone-700 hover:bg-stone-800/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-serif font-bold text-sm ${
                              isSelected ? "text-amber-300" : "text-stone-200"
                            }`}
                          >
                            {cls.name}
                          </span>
                          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-stone-800 text-stone-400">
                            {cls.hitDie}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-400 mt-1 truncate">
                          {cls.primaryAbility}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TACTICAL GUIDANCE HIGHLIGHT BOX */}
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                  <HelpCircle className="w-4 h-4" />
                  <span>Tactical Guidance: Building a {classDef.name}</span>
                </div>
                <p className="text-xs text-amber-200/90 leading-relaxed">
                  {classDef.recommendedStats}
                </p>
                <div className="flex flex-wrap gap-4 pt-2 text-xs text-stone-300">
                  <div>
                    <span className="text-stone-500">Hit Die:</span>{" "}
                    <span className="font-mono text-amber-300 font-bold">{classDef.hitDie}</span>
                  </div>
                  <div>
                    <span className="text-stone-500">Saves:</span>{" "}
                    <span className="font-mono text-amber-300">
                      {classDef.savingThrows.map((st) => st.toUpperCase()).join(", ")}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500">Armor:</span>{" "}
                    <span>{classDef.armorProficiencies.join(", ") || "None"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: ABILITY SCORES (POINT BUY / STANDARD ARRAY / ROLLING) */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-stone-200">
                    Ability Score Method
                  </h3>
                  <p className="text-xs text-stone-400">
                    Choose how you want to determine your base attributes.
                  </p>
                </div>
                <div className="flex rounded-xl bg-stone-950 p-1 border border-stone-800 text-xs">
                  <button
                    onClick={() => handleStatModeChange("standard")}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      statMode === "standard"
                        ? "bg-amber-600 text-stone-950 font-bold"
                        : "text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    Standard Array
                  </button>
                  <button
                    onClick={() => handleStatModeChange("pointbuy")}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      statMode === "pointbuy"
                        ? "bg-amber-600 text-stone-950 font-bold"
                        : "text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    Point Buy
                  </button>
                  <button
                    onClick={() => handleStatModeChange("roll")}
                    className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                      statMode === "roll"
                        ? "bg-amber-600 text-stone-950 font-bold"
                        : "text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    <Dices className="w-3.5 h-3.5" />
                    Roll 4d6
                  </button>
                </div>
              </div>

              {/* Point Buy Status Bar */}
              {statMode === "pointbuy" && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs">
                  <div>
                    <span className="text-stone-400">Budget: </span>
                    <span
                      className={`font-bold font-mono text-sm ${
                        pointBuySpent > 27 ? "text-red-400" : "text-amber-300"
                      }`}
                    >
                      {pointBuySpent} / 27 Points
                    </span>
                  </div>
                  <span className="text-stone-400">
                    {27 - pointBuySpent >= 0
                      ? `${27 - pointBuySpent} points remaining`
                      : `${pointBuySpent - 27} points over budget!`}
                  </span>
                </div>
              )}

              {/* Rolling Dice Re-roll button */}
              {statMode === "roll" && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs">
                  <div className="text-stone-400">
                    Rolled 4d6 drop lowest for each stat.
                  </div>
                  <button
                    type="button"
                    onClick={handleRollStats}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/20 text-amber-300 border border-amber-500/40 hover:bg-amber-600/30"
                  >
                    <Dices className="w-3.5 h-3.5" />
                    Reroll All Stats
                  </button>
                </div>
              )}

              {/* Guidance Reminder for current class */}
              <div className="text-xs text-amber-400/90 bg-amber-950/20 px-3 py-2 rounded-lg border border-amber-900/40 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                <span>
                  <strong>Tip for {classDef.name}:</strong> Prioritize{" "}
                  {classDef.recommendedStats.split(".")[0].replace("Primary: ", "")}!
                </span>
              </div>

              {/* 6 Stat Editors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {(["str", "dex", "con", "int", "wis", "cha"] as StatKey[]).map((stat) => {
                  const base = baseStats[stat];
                  const bonus = racialBonuses[stat] || 0;
                  const total = finalStats[stat];
                  const mod = calcModifier(total);
                  const isPrimary = classDef.primaryAbility.toLowerCase().includes(stat);

                  return (
                    <div
                      key={stat}
                      className={`p-3.5 rounded-xl border bg-stone-950/70 space-y-2 ${
                        isPrimary
                          ? "border-amber-500/60 ring-1 ring-amber-500/20"
                          : "border-stone-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-serif font-bold text-stone-200">
                            {STAT_NAMES[stat]}
                          </span>
                          {isPrimary && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                              Primary
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-bold text-lg text-amber-400">
                          {formatModifier(mod)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-stone-400">Base:</span>
                        {statMode === "pointbuy" ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={base <= 8}
                              onClick={() =>
                                setBaseStats((prev) => ({ ...prev, [stat]: prev[stat] - 1 }))
                              }
                              className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-stone-200 font-bold"
                            >
                              -
                            </button>
                            <span className="font-mono font-bold w-6 text-center text-stone-200">
                              {base}
                            </span>
                            <button
                              type="button"
                              disabled={base >= 15}
                              onClick={() =>
                                setBaseStats((prev) => ({ ...prev, [stat]: prev[stat] + 1 }))
                              }
                              className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-stone-200 font-bold"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <input
                            type="number"
                            min={3}
                            max={20}
                            value={base}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10) || 10;
                              setBaseStats((prev) => ({ ...prev, [stat]: val }));
                            }}
                            className="w-14 bg-stone-900 border border-stone-700 rounded px-2 py-0.5 text-center font-mono text-stone-100"
                          />
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-stone-400 border-t border-stone-800/80 pt-1.5">
                        <span>Racial Bonus:</span>
                        <span className={bonus > 0 ? "text-emerald-400 font-mono font-bold" : "text-stone-500 font-mono"}>
                          {bonus > 0 ? `+${bonus}` : "0"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs font-semibold text-stone-300 border-t border-stone-800/80 pt-1.5">
                        <span>Total Score:</span>
                        <span className="font-mono text-amber-300 font-bold text-sm">
                          {total}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: RACE & HERITAGE */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
                  Select Race
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {Object.keys(RACES_5E).map((rName) => {
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
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "bg-amber-600/20 border-amber-500 shadow-md shadow-amber-900/30"
                            : "bg-stone-950/60 border-stone-800 hover:border-stone-700 hover:bg-stone-800/40"
                        }`}
                      >
                        <div className="font-serif font-bold text-sm text-stone-200">
                          {r.name}
                        </div>
                        <div className="text-[11px] text-stone-400 mt-1">
                          Speed: {r.speed} ft
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subrace Picker if applicable */}
              {raceDef.subraces.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
                    Subrace / Lineage
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {raceDef.subraces.map((sr) => {
                      const isSelected = selectedSubrace === sr.id;
                      return (
                        <button
                          key={sr.id}
                          type="button"
                          onClick={() => setSelectedSubrace(sr.id)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "bg-amber-600/20 border-amber-500"
                              : "bg-stone-950/60 border-stone-800 hover:bg-stone-800/40"
                          }`}
                        >
                          <div className="font-serif font-bold text-sm text-stone-200">
                            {sr.name}
                          </div>
                          <p className="text-xs text-stone-400 mt-1">
                            {sr.traits.map((t) => t.name).join(", ")}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Racial Traits Showcase */}
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
                <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  Racial Traits & Abilities
                </div>
                <div className="space-y-2 text-xs">
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

          {/* STEP 4: BACKGROUND & ALIGNMENT */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
                  Moral Alignment
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    "Lawful Good",
                    "Neutral Good",
                    "Chaotic Good",
                    "Lawful Neutral",
                    "True Neutral",
                    "Chaotic Neutral",
                    "Lawful Evil",
                    "Neutral Evil",
                    "Chaotic Evil",
                  ].map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => setAlignment(align)}
                      className={`p-2 rounded-lg border text-xs font-serif transition-colors ${
                        alignment === align
                          ? "bg-amber-600/20 border-amber-500 text-amber-300 font-bold"
                          : "bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200"
                      }`}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
                  Select Background
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {Object.keys(BACKGROUNDS_5E).map((bgName) => {
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
                        <div className="font-serif font-bold text-sm text-stone-200">
                          {bg.name}
                        </div>
                        <div className="text-[11px] text-stone-400 mt-1 truncate">
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
                <p className="text-stone-300 leading-relaxed">
                  {bgDef.featureDescription}
                </p>
                <div className="pt-2 text-stone-400 border-t border-stone-800">
                  <span className="text-stone-500">Starting Gold:</span>{" "}
                  <span className="font-mono text-amber-300">{bgDef.startingGold} gp</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW & EQUIPMENT */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-gradient-to-r from-stone-950 to-stone-900 border border-amber-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif font-bold text-lg text-amber-100">
                      {characterName}
                    </h3>
                    <p className="text-xs text-stone-400">
                      Level 1 {subraceDef?.name || selectedRace} {selectedClass} • {selectedBackground} • {alignment}
                    </p>
                  </div>
                  <div className="flex gap-4 text-center">
                    <div className="px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800">
                      <div className="text-[10px] uppercase text-stone-500">Max HP</div>
                      <div className="font-mono font-bold text-base text-emerald-400">{hpMax}</div>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800">
                      <div className="text-[10px] uppercase text-stone-500">Speed</div>
                      <div className="font-mono font-bold text-base text-amber-400">{raceDef.speed} ft</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-2 pt-2 border-t border-stone-800 text-center">
                  {(["str", "dex", "con", "int", "wis", "cha"] as StatKey[]).map((st) => (
                    <div key={st} className="p-1.5 bg-stone-900/60 rounded border border-stone-800/80">
                      <div className="text-[10px] uppercase text-stone-400 font-bold">{st}</div>
                      <div className="font-mono font-bold text-sm text-stone-100">{finalStats[st]}</div>
                      <div className="text-[10px] text-amber-400">{formatModifier(calcModifier(finalStats[st]))}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Starting Gear Overview */}
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  <Swords className="w-4 h-4" />
                  <span>Automated Starting Equipment Package</span>
                </div>
                <p className="text-xs text-stone-300">
                  Based on your class ({selectedClass}) and background ({selectedBackground}), standard weapons, armor, tools, and adventuring supplies will be equipped automatically to calculate your Armor Class and Attack rolls.
                </p>
                <div className="text-xs text-stone-400 space-y-1">
                  <div>• {classDef.armorProficiencies.join(", ") || "No armor required"}</div>
                  <div>• Starting weapon proficiencies: {classDef.weaponProficiencies.join(", ")}</div>
                  <div>• Background pack: {bgDef.startingEquipment.join(", ")}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-950/80 border-t border-stone-800">
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

          {step < 5 ? (
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
              {saving ? "Creating Character..." : "Create Character (Level 1)"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
