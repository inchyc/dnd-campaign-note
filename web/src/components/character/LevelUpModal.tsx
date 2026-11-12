"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Sparkles,
  ChevronRight,
  Shield,
  Heart,
  Swords,
  Dices,
  AlertTriangle,
  Check,
  Plus,
} from "lucide-react";
import { CLASSES_5E, SubclassDefinition } from "@/data/5e/classes";
import { FEATS_5E, Feat5e } from "@/data/5e/feats";
import {
  calcModifier,
  formatModifier,
  checkMulticlassPrereqs,
  calcMulticlassSpellSlots,
  calcWarlockPactSlots,
  calcProficiencyBonus,
} from "@/data/5e/rulesEngine";
import type { CharacterSheetData, MulticlassClassEntry, CompanionData } from "@/app/api/character/sheet/route";
import { COMPANION_PRESETS } from "@/data/5e/companions";

interface LevelUpModalProps {
  sheet: CharacterSheetData;
  onClose: () => void;
  onSave: (updatedSheet: CharacterSheetData) => Promise<void>;
}

type StatKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

export function LevelUpModal({ sheet, onClose, onSave }: LevelUpModalProps) {
  const [saving, setSaving] = useState(false);

  // Existing classes on sheet
  const existingClasses: MulticlassClassEntry[] = sheet.classes && sheet.classes.length > 0
    ? sheet.classes
    : [{ className: sheet.class || "Fighter", subclass: sheet.subclass, level: sheet.level || 1, hitDie: "d10" }];

  const currentTotalLevel = sheet.level || 1;
  const newTotalLevel = currentTotalLevel + 1;

  // Selected class to increase
  const [selectedClassToLevel, setSelectedClassToLevel] = useState<string>(existingClasses[0].className);
  const [isMulticlassNew, setIsMulticlassNew] = useState(false);
  const [dmOverride, setDmOverride] = useState(false);

  // Subclass choice (if applicable at this level)
  const existingEntry = existingClasses.find((c) => c.className === selectedClassToLevel);
  const nextClassLevel = (existingEntry?.level || 0) + 1;
  const classDef = CLASSES_5E[selectedClassToLevel] || CLASSES_5E["Fighter"];

  const needsSubclass = nextClassLevel === classDef.subclassLevel && (!existingEntry || !existingEntry.subclass);
  const [chosenSubclass, setChosenSubclass] = useState<string>(
    existingEntry?.subclass || (classDef.subclasses[0]?.name || "")
  );

  // ASI or Feat selection
  const isAsiLevel = classDef.asiLevels.includes(nextClassLevel);
  const [asiType, setAsiType] = useState<"stats" | "feat">("stats");
  const [statBoosts, setStatBoosts] = useState<Record<StatKey, number>>({
    str: 0,
    dex: 0,
    con: 0,
    int: 0,
    wis: 0,
    cha: 0,
  });
  const [selectedFeatId, setSelectedFeatId] = useState<string>(FEATS_5E[0].id);

  // HP Gain Mode
  const hitDieNum = parseInt(classDef.hitDie.replace("d", ""), 10) || 10;
  const defaultAverageHp = Math.floor(hitDieNum / 2) + 1;
  const conMod = calcModifier(sheet.stats.con);
  const [hpMode, setHpMode] = useState<"average" | "roll">("average");
  const [rolledHp, setRolledHp] = useState<number>(defaultAverageHp);

  const hpGain = Math.max(1, (hpMode === "average" ? defaultAverageHp : rolledHp) + conMod);

  // Multiclass Prerequisites Check
  const prereqCheck = useMemo(() => {
    return checkMulticlassPrereqs(selectedClassToLevel, sheet.stats);
  }, [selectedClassToLevel, sheet.stats]);

  // Roll Hit Die
  const handleRollHp = () => {
    const rolled = Math.floor(Math.random() * hitDieNum) + 1;
    setRolledHp(rolled);
    setHpMode("roll");
  };

  // ASI point allocation helper
  const totalAsiPoints = useMemo(() => {
    return Object.values(statBoosts).reduce((a, b) => a + b, 0);
  }, [statBoosts]);

  const handleAdjustStatBoost = (stat: StatKey, delta: number) => {
    const current = statBoosts[stat] || 0;
    const next = current + delta;
    if (next < 0) return;
    if (delta > 0 && totalAsiPoints >= 2) return;
    setStatBoosts((prev) => ({ ...prev, [stat]: next }));
  };

  // Features unlocked at this level
  const unlockedFeatures = useMemo(() => {
    return classDef.features.filter((f) => f.level === nextClassLevel);
  }, [classDef, nextClassLevel]);

  // Submit Level Up
  const handleConfirmLevelUp = async () => {
    if (newTotalLevel > 20) return;
    if (!prereqCheck.allowed && !dmOverride && isMulticlassNew) return;
    if (isAsiLevel && asiType === "stats" && totalAsiPoints !== 2) {
      alert("Please allocate exactly 2 ability score points (+2 to one stat or +1 to two stats).");
      return;
    }

    setSaving(true);
    try {
      // 1. Update Classes array
      const updatedClasses: MulticlassClassEntry[] = [...existingClasses];
      const matchIdx = updatedClasses.findIndex((c) => c.className === selectedClassToLevel);

      let companionToAdd: CompanionData | null = null;

      if (matchIdx >= 0) {
        const entry = updatedClasses[matchIdx];
        const newLevel = entry.level + 1;
        const sub = needsSubclass ? chosenSubclass : entry.subclass;
        updatedClasses[matchIdx] = {
          ...entry,
          level: newLevel,
          subclass: sub,
        };

        // Check companion trigger
        if (needsSubclass && sub) {
          const subDef = classDef.subclasses.find((s) => s.name === sub);
          if (subDef?.hasCompanion) {
            const preset = COMPANION_PRESETS.find((p) => p.type === subDef.companionType) || COMPANION_PRESETS[3];
            companionToAdd = {
              id: `comp-${Date.now()}`,
              name: `${sheet.character}'s Companion`,
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
            };
          }
        }
      } else {
        // Brand new multiclass!
        updatedClasses.push({
          className: selectedClassToLevel,
          level: 1,
          hitDie: classDef.hitDie,
          subclass: classDef.subclassLevel === 1 ? chosenSubclass : undefined,
        });
      }

      // 2. Ability Scores
      const newStats = { ...sheet.stats };
      if (isAsiLevel) {
        if (asiType === "stats") {
          for (const [st, val] of Object.entries(statBoosts)) {
            newStats[st as StatKey] += val;
          }
        } else {
          // Feat
          const feat = FEATS_5E.find((f) => f.id === selectedFeatId);
          if (feat?.statBoost) {
            for (const [st, val] of Object.entries(feat.statBoost)) {
              newStats[st as StatKey] += val || 0;
            }
          }
        }
      }

      // 3. HP Max
      const newHpMax = sheet.hpMax + hpGain;
      const newHpCurrent = Math.min(newHpMax, sheet.hpCurrent + hpGain);

      // 4. Hit Dice
      const hitDiceSummary = updatedClasses.map((c) => `${c.level}${c.hitDie}`).join(" + ");

      // 5. Spell Slots
      const multiclassSlots = calcMulticlassSpellSlots(updatedClasses);
      const newSpellSlots: Record<number, { total: number; used: number }> = { ...sheet.spellSlots };
      for (let lvl = 1; lvl <= 9; lvl++) {
        const total = multiclassSlots[lvl] || 0;
        newSpellSlots[lvl] = {
          total,
          used: Math.min(sheet.spellSlots[lvl]?.used || 0, total),
        };
      }

      // Warlock Pact Slots
      const warlockEntry = updatedClasses.find((c) => c.className === "Warlock");
      const pactSlots = warlockEntry
        ? {
            level: calcWarlockPactSlots(warlockEntry.level).slotLevel,
            total: calcWarlockPactSlots(warlockEntry.level).count,
            used: 0,
          }
        : undefined;

      // 6. Features List
      const newFeatures = [...(sheet.featureList || [])];
      unlockedFeatures.forEach((f) => {
        newFeatures.push({
          id: `feat-${newTotalLevel}-${f.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
          name: f.name,
          source: `${selectedClassToLevel} ${nextClassLevel}`,
          level: newTotalLevel,
          description: f.description,
        });
      });

      if (isAsiLevel && asiType === "feat") {
        const feat = FEATS_5E.find((f) => f.id === selectedFeatId);
        if (feat) {
          newFeatures.push({
            id: `feat-asi-${newTotalLevel}`,
            name: `Feat: ${feat.name}`,
            source: `${selectedClassToLevel} ${nextClassLevel} (ASI)`,
            level: newTotalLevel,
            description: feat.description,
          });
        }
      }

      // 7. Companions list
      const updatedCompanions = [...(sheet.companions || [])];
      if (companionToAdd) {
        updatedCompanions.push(companionToAdd);
      }

      // 8. Class summary string
      const classString = updatedClasses.map((c) => `${c.className} ${c.level}`).join(" / ");

      const updatedSheet: CharacterSheetData = {
        ...sheet,
        level: newTotalLevel,
        class: classString,
        classes: updatedClasses,
        stats: newStats,
        hpMax: newHpMax,
        hpCurrent: newHpCurrent,
        hitDiceTotal: hitDiceSummary,
        spellSlots: newSpellSlots,
        pactSlots,
        featureList: newFeatures,
        companions: updatedCompanions,
        updatedAt: Date.now(),
      };

      await onSave(updatedSheet);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-stone-900 border border-amber-600/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-950/80 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-stone-950 font-bold shadow-lg shadow-amber-900/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-amber-100">
                Level Up: Reaching Level {newTotalLevel}
              </h2>
              <p className="text-xs text-stone-400">
                Current Level {currentTotalLevel} • Proficiency Bonus: +{calcProficiencyBonus(newTotalLevel)}
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Class Selection / Multiclassing */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Select Class to Level Up
              </label>
              <button
                type="button"
                onClick={() => setIsMulticlassNew(!isMulticlassNew)}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 underline"
              >
                {isMulticlassNew ? "Level Existing Class" : "+ Multiclass into New Class"}
              </button>
            </div>

            {isMulticlassNew ? (
              <div className="space-y-3">
                <select
                  value={selectedClassToLevel}
                  onChange={(e) => setSelectedClassToLevel(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-4 py-2.5 text-stone-100 font-serif"
                >
                  {Object.keys(CLASSES_5E).map((c) => (
                    <option key={c} value={c}>
                      {c} (Hit Die: {CLASSES_5E[c].hitDie})
                    </option>
                  ))}
                </select>

                {/* Multiclass Warning & Override */}
                {!prereqCheck.allowed && (
                  <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/50 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-red-400 font-semibold">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>5e Multiclassing Prerequisite Warning:</span>
                    </div>
                    <p className="text-stone-300">
                      Standard 5e rules require <strong>{prereqCheck.missing.join(", ")}</strong> to multiclass into {selectedClassToLevel}.
                    </p>
                    <label className="flex items-center gap-2 text-amber-300 font-medium pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dmOverride}
                        onChange={(e) => setDmOverride(e.target.checked)}
                        className="rounded border-stone-700 text-amber-600 focus:ring-amber-500"
                      />
                      <span>DM Permission / Override (Allow multiclassing regardless)</span>
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {existingClasses.map((c) => (
                  <button
                    key={c.className}
                    type="button"
                    onClick={() => setSelectedClassToLevel(c.className)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedClassToLevel === c.className
                        ? "bg-amber-600/20 border-amber-500 font-bold"
                        : "bg-stone-950/60 border-stone-800 hover:bg-stone-800/40"
                    }`}
                  >
                    <div className="font-serif text-sm text-stone-200">
                      {c.className}
                    </div>
                    <div className="text-xs text-stone-400">
                      Level {c.level} → {c.level + 1}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Hit Point Gain */}
          <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Hit Point Increase
              </span>
              <span className="font-mono text-emerald-400 font-bold text-sm">
                +{hpGain} HP Max
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => setHpMode("average")}
                className={`flex-1 p-2.5 rounded-lg border transition-colors ${
                  hpMode === "average"
                    ? "bg-amber-600/20 border-amber-500 text-amber-300 font-bold"
                    : "bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200"
                }`}
              >
                Fixed Average ({defaultAverageHp} + CON {formatModifier(conMod)})
              </button>

              <button
                type="button"
                onClick={handleRollHp}
                className={`flex-1 p-2.5 rounded-lg border transition-colors flex items-center justify-center gap-1.5 ${
                  hpMode === "roll"
                    ? "bg-amber-600/20 border-amber-500 text-amber-300 font-bold"
                    : "bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200"
                }`}
              >
                <Dices className="w-4 h-4" />
                Roll {classDef.hitDie} {hpMode === "roll" ? `(${rolledHp})` : ""}
              </button>
            </div>
          </div>

          {/* Subclass Selection if unlocked at this level */}
          {needsSubclass && (
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/50 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Specialization: Choose your Subclass ({selectedClassToLevel})</span>
              </div>
              <p className="text-xs text-stone-300">
                You have reached Level {nextClassLevel} in {selectedClassToLevel}! Select your specialized archetype:
              </p>
              <div className="space-y-2">
                {classDef.subclasses.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setChosenSubclass(sc.name)}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      chosenSubclass === sc.name
                        ? "bg-amber-600/30 border-amber-500"
                        : "bg-stone-900/60 border-stone-800 hover:bg-stone-800"
                    }`}
                  >
                    <div className="font-serif font-bold text-sm text-amber-200">
                      {sc.name}
                      {sc.hasCompanion && (
                        <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-300">
                          Includes Companion
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-stone-400 mt-1">
                      {sc.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ASI / Feat Selection if applicable */}
          {isAsiLevel && (
            <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  Ability Score Improvement (ASI) or Feat
                </span>
                <div className="flex rounded-lg bg-stone-900 p-0.5 border border-stone-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setAsiType("stats")}
                    className={`px-3 py-1 rounded transition-colors ${
                      asiType === "stats"
                        ? "bg-amber-600 text-stone-950 font-bold"
                        : "text-stone-400"
                    }`}
                  >
                    +2 Ability Scores
                  </button>
                  <button
                    type="button"
                    onClick={() => setAsiType("feat")}
                    className={`px-3 py-1 rounded transition-colors ${
                      asiType === "feat"
                        ? "bg-amber-600 text-stone-950 font-bold"
                        : "text-stone-400"
                    }`}
                  >
                    Pick a Feat
                  </button>
                </div>
              </div>

              {asiType === "stats" ? (
                <div className="space-y-2">
                  <p className="text-xs text-stone-400">
                    Allocate 2 points (+2 to one stat or +1 to two different stats). Points allocated: {totalAsiPoints} / 2
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(["str", "dex", "con", "int", "wis", "cha"] as StatKey[]).map((st) => (
                      <div
                        key={st}
                        className="flex items-center justify-between p-2 rounded-lg bg-stone-900 border border-stone-800 text-xs"
                      >
                        <span className="font-bold uppercase text-stone-300">{st}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAdjustStatBoost(st, -1)}
                            disabled={statBoosts[st] === 0}
                            className="w-5 h-5 rounded bg-stone-800 text-stone-300 disabled:opacity-30 font-bold"
                          >
                            -
                          </button>
                          <span className="font-mono text-amber-400 font-bold w-4 text-center">
                            +{statBoosts[st]}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAdjustStatBoost(st, 1)}
                            disabled={totalAsiPoints >= 2}
                            className="w-5 h-5 rounded bg-stone-800 text-stone-300 disabled:opacity-30 font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    value={selectedFeatId}
                    onChange={(e) => setSelectedFeatId(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-100 text-sm font-serif"
                  >
                    {FEATS_5E.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} {f.prerequisite ? `(${f.prerequisite})` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-stone-300 leading-relaxed bg-stone-900/60 p-2.5 rounded-lg border border-stone-800">
                    {FEATS_5E.find((f) => f.id === selectedFeatId)?.description}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* New Features Unlocked Preview */}
          {unlockedFeatures.length > 0 && (
            <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Features Unlocked at Level {nextClassLevel}
              </span>
              <div className="space-y-2 text-xs">
                {unlockedFeatures.map((f, i) => (
                  <div key={i} className="text-stone-300">
                    <strong className="text-emerald-300">{f.name}:</strong> {f.description}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-950/80 border-t border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 text-sm font-semibold transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={saving || (!prereqCheck.allowed && !dmOverride && isMulticlassNew)}
            onClick={handleConfirmLevelUp}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-sm shadow-lg shadow-amber-900/30 transition-all disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {saving ? "Leveling Up..." : `Confirm Level Up to Lv ${newTotalLevel}`}
          </button>
        </div>
      </div>
    </div>
  );
}
