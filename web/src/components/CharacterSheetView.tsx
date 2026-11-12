"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Shield,
  Heart,
  Zap,
  Sparkles,
  Search,
  ExternalLink,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Moon,
  Sun,
  Dices,
  ChevronDown,
  User,
  Check,
  AlertCircle,
  Loader2,
  Sword,
  Wand2,
  BookOpen,
  Info,
  Package,
  Flame,
  ArrowUpCircle,
  Wrench,
} from "lucide-react";
import type {
  CharacterSheetData,
  InventoryItemData,
  SpellItemData,
  CompanionData,
} from "@/app/api/character/sheet/route";
import { CharacterBuilderWizard } from "./character/CharacterBuilderWizard";
import { LevelUpModal } from "./character/LevelUpModal";
import { CompanionSheet } from "./character/CompanionSheet";
import { CharacterPortraitModal } from "./character/CharacterPortraitModal";
import { EquipmentCatalogModal } from "./character/EquipmentCatalogModal";
import { SpellCatalogModal } from "./character/SpellCatalogModal";
import {
  calcModifier,
  formatModifier,
  calcProficiencyBonus,
  calculateArmorClass,
} from "@/data/5e/rulesEngine";

interface CharacterSheetViewProps {
  currentUser: {
    id: string;
    name: string;
    character: string;
    role: "scribe" | "player";
  } | null;
  activeCampaign?: { id: string; name: string } | null;
  isScribe?: boolean;
}

const SKILL_DEFINITIONS: Array<{ id: string; name: string; stat: "str" | "dex" | "con" | "int" | "wis" | "cha" }> = [
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

export function CharacterSheetView({
  currentUser,
  activeCampaign,
  isScribe = false,
}: CharacterSheetViewProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser?.id || "");
  const [roster, setRoster] = useState<Array<{ id: string; name: string; character: string }>>([]);
  const [sheet, setSheet] = useState<CharacterSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sub-Tab: "character" or companion ID
  const [activeTab, setActiveTab] = useState<string>("character");

  // Modals
  const [showWizard, setShowWizard] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showPortrait, setShowPortrait] = useState(false);
  const [showEquipCatalog, setShowEquipCatalog] = useState(false);
  const [showSpellCatalog, setShowSpellCatalog] = useState(false);

  // Live Dice Roll Banner
  const [lastRoll, setLastRoll] = useState<{ formula: string; label: string; result: number } | null>(null);

  // 5e.tools lookup state
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupCategory, setLookupCategory] = useState<"spells" | "items" | "bestiary" | "feats">("spells");

  // Fetch party roster for switcher
  useEffect(() => {
    if (!activeCampaign?.id) return;
    fetch(`/api/campaigns/${activeCampaign.id}/users`)
      .then((res) => res.json())
      .then((data) => {
        if (data.users && Array.isArray(data.users)) {
          setRoster(data.users);
        }
      })
      .catch(() => {});
  }, [activeCampaign?.id]);

  // Load character sheet
  const fetchSheet = useCallback(async (userId: string) => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/character/sheet?userId=${encodeURIComponent(userId)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success && data.sheet) {
        setSheet(data.sheet);
      } else {
        setError(data.error || "Failed to load character sheet");
      }
    } catch (e: any) {
      setError(e.message || "Failed to fetch character sheet");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchSheet(selectedUserId);
    } else if (currentUser?.id) {
      setSelectedUserId(currentUser.id);
    }
  }, [selectedUserId, currentUser?.id, fetchSheet]);

  const canEdit = useMemo(() => {
    return isScribe || selectedUserId === currentUser?.id;
  }, [isScribe, selectedUserId, currentUser?.id]);

  // Proficiency Bonus
  const pb = useMemo(() => calcProficiencyBonus(sheet?.level || 1), [sheet?.level]);

  // Core Modifiers
  const mods = useMemo(() => {
    if (!sheet) return { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    return {
      str: calcModifier(sheet.stats.str),
      dex: calcModifier(sheet.stats.dex),
      con: calcModifier(sheet.stats.con),
      int: calcModifier(sheet.stats.int),
      wis: calcModifier(sheet.stats.wis),
      cha: calcModifier(sheet.stats.cha),
    };
  }, [sheet?.stats]);

  // Saving Throws
  const saves = useMemo(() => {
    if (!sheet) return { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    return {
      str: mods.str + (sheet.savingThrows?.str ? pb : 0),
      dex: mods.dex + (sheet.savingThrows?.dex ? pb : 0),
      con: mods.con + (sheet.savingThrows?.con ? pb : 0),
      int: mods.int + (sheet.savingThrows?.int ? pb : 0),
      wis: mods.wis + (sheet.savingThrows?.wis ? pb : 0),
      cha: mods.cha + (sheet.savingThrows?.cha ? pb : 0),
    };
  }, [mods, sheet?.savingThrows, pb]);

  // 18 Skills
  const skillTotals = useMemo(() => {
    const res: Record<string, number> = {};
    if (!sheet) return res;
    for (const sk of SKILL_DEFINITIONS) {
      const profLevel = sheet.skills?.[sk.id] || 0; // 0=none, 1=prof, 2=expertise
      res[sk.id] = mods[sk.stat] + profLevel * pb;
    }
    return res;
  }, [sheet?.skills, mods, pb]);

  const passivePerception = useMemo(() => {
    return 10 + (skillTotals["perception"] || 0);
  }, [skillTotals]);

  // Spell Save DC & Attack
  const spellMetrics = useMemo(() => {
    if (!sheet || !sheet.spellcastingAbility || sheet.spellcastingAbility === "none") {
      return { saveDc: 8 + pb, atkMod: pb };
    }
    const abilityMod = mods[sheet.spellcastingAbility] || 0;
    return {
      saveDc: 8 + pb + abilityMod,
      atkMod: pb + abilityMod,
    };
  }, [sheet?.spellcastingAbility, mods, pb]);

  // Save changes
  const saveSheet = async (updatedSheet?: CharacterSheetData) => {
    const toSave = updatedSheet || sheet;
    if (!toSave) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/character/sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSave),
      });
      const data = await res.json();
      if (data.success) {
        setSheet(data.sheet);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        setError(data.error || "Failed to save sheet");
      }
    } catch (e: any) {
      setError(e.message || "Failed to save sheet");
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof CharacterSheetData>(key: K, val: CharacterSheetData[K]) => {
    if (!sheet || !canEdit) return;
    const updated = { ...sheet, [key]: val };
    setSheet(updated);
  };

  const updateStat = (stat: "str" | "dex" | "con" | "int" | "wis" | "cha", val: number) => {
    if (!sheet || !canEdit) return;
    const updated: CharacterSheetData = {
      ...sheet,
      stats: {
        ...sheet.stats,
        [stat]: Math.max(1, Math.min(30, val || 10)),
      },
    };
    setSheet(updated);
  };

  const toggleSaveProf = (stat: "str" | "dex" | "con" | "int" | "wis" | "cha") => {
    if (!sheet || !canEdit) return;
    const updated: CharacterSheetData = {
      ...sheet,
      savingThrows: {
        ...sheet.savingThrows,
        [stat]: !sheet.savingThrows[stat],
      },
    };
    setSheet(updated);
  };

  const cycleSkillProf = (skillId: string) => {
    if (!sheet || !canEdit) return;
    const current = sheet.skills?.[skillId] || 0;
    const next = (current + 1) % 3; // 0 -> 1 -> 2 -> 0
    const updated: CharacterSheetData = {
      ...sheet,
      skills: {
        ...sheet.skills,
        [skillId]: next,
      },
    };
    setSheet(updated);
  };

  // HP Adjustments
  const adjustHp = (delta: number) => {
    if (!sheet || !canEdit) return;
    const newHp = Math.max(0, Math.min(sheet.hpMax, sheet.hpCurrent + delta));
    const updated = { ...sheet, hpCurrent: newHp };
    setSheet(updated);
  };

  // Rest Handlers
  const handleLongRest = () => {
    if (!sheet || !canEdit) return;
    if (!window.confirm("Take a Long Rest? This restores full HP, resets death saves, and recovers all spell slots.")) return;

    const resetSlots = { ...sheet.spellSlots };
    for (const lvl in resetSlots) {
      resetSlots[lvl] = { ...resetSlots[lvl], used: 0 };
    }

    const updated: CharacterSheetData = {
      ...sheet,
      hpCurrent: sheet.hpMax,
      hpTemp: 0,
      deathSaves: { successes: 0, failures: 0 },
      spellSlots: resetSlots,
      pactSlots: sheet.pactSlots ? { ...sheet.pactSlots, used: 0 } : undefined,
      hitDiceCurrent: Math.min(
        parseInt(sheet.hitDiceTotal, 10) || 1,
        sheet.hitDiceCurrent + Math.max(1, Math.floor((parseInt(sheet.hitDiceTotal, 10) || 1) / 2))
      ),
    };
    setSheet(updated);
    saveSheet(updated);
  };

  const handleShortRest = () => {
    if (!sheet || !canEdit) return;
    const roll = window.prompt("Spend Hit Dice? Enter HP regained (or 0 for just ability reset):", "0");
    if (roll === null) return;
    const regained = parseInt(roll, 10) || 0;
    const newDice = Math.max(0, sheet.hitDiceCurrent - (regained > 0 ? 1 : 0));

    const updated: CharacterSheetData = {
      ...sheet,
      hpCurrent: Math.min(sheet.hpMax, sheet.hpCurrent + regained),
      hitDiceCurrent: newDice,
      pactSlots: sheet.pactSlots ? { ...sheet.pactSlots, used: 0 } : undefined,
    };
    setSheet(updated);
    saveSheet(updated);
  };

  // Equipment Management & Automated AC / Attack Sync
  const handleToggleEquipItem = (item: InventoryItemData) => {
    if (!sheet || !canEdit) return;
    const items = [...(sheet.inventoryItems || [])];
    const targetIdx = items.findIndex((i) => i.id === item.id);
    if (targetIdx < 0) return;

    const willEquip = !items[targetIdx].equipped;
    items[targetIdx] = { ...items[targetIdx], equipped: willEquip };

    // If equipping armor, unequip other armors
    if (willEquip && items[targetIdx].category === "armor") {
      items.forEach((it, idx) => {
        if (idx !== targetIdx && it.category === "armor") {
          items[idx] = { ...items[idx], equipped: false };
        }
      });
    }

    // Recalculate AC
    const equippedArmor = items.find((i) => i.category === "armor" && i.equipped);
    const equippedShield = items.find((i) => i.category === "shield" && i.equipped);
    const magicBonusAc = items
      .filter((i) => i.equipped && i.magicBonusAc)
      .reduce((sum, i) => sum + (i.magicBonusAc || 0), 0);

    const acCalc = calculateArmorClass(
      sheet.stats,
      sheet.classes || [{ className: sheet.class, level: sheet.level }],
      equippedArmor
        ? {
            name: equippedArmor.name,
            baseAc: equippedArmor.baseAc || 11,
            category: equippedArmor.name.includes("Chain") || equippedArmor.name.includes("Scale") ? "medium" : equippedArmor.name.includes("Plate") ? "heavy" : "light",
            stealthDisadvantage: equippedArmor.stealthDisadvantage,
            magicBonus: equippedArmor.magicBonusAc,
          }
        : undefined,
      equippedShield ? { name: equippedShield.name, baseAc: equippedShield.baseAc || 2, magicBonus: equippedShield.magicBonusAc } : undefined,
      magicBonusAc,
      sheet.acOverride
    );

    // Rebuild attack actions based on equipped weapons
    const weaponAttacks = items
      .filter((i) => i.category === "weapon" && i.equipped)
      .map((wpn, idx) => {
        const isFinesse = wpn.properties?.includes("finesse");
        const mod = isFinesse ? Math.max(mods.str, mods.dex) : mods.str;
        const toHit = pb + mod + (wpn.magicBonusAttack || 0);
        return {
          id: `atk-auto-${wpn.id}`,
          name: wpn.name,
          atkBonus: formatModifier(toHit),
          damage: `${wpn.damage}${formatModifier(mod + (wpn.magicBonusDamage || 0))} ${wpn.damageType || ""}`,
          notes: wpn.properties?.join(", "),
        };
      });

    const updated: CharacterSheetData = {
      ...sheet,
      inventoryItems: items,
      ac: acCalc.ac,
      attacks: weaponAttacks.length > 0 ? weaponAttacks : sheet.attacks,
    };

    setSheet(updated);
    saveSheet(updated);
  };

  const handleAddItemToInventory = (item: InventoryItemData) => {
    if (!sheet || !canEdit) return;
    const items = [...(sheet.inventoryItems || []), item];
    const updated = { ...sheet, inventoryItems: items };
    setSheet(updated);
    saveSheet(updated);
  };

  const handleRemoveInventoryItem = (id: string) => {
    if (!sheet || !canEdit) return;
    const items = (sheet.inventoryItems || []).filter((i) => i.id !== id);
    const updated = { ...sheet, inventoryItems: items };
    setSheet(updated);
    saveSheet(updated);
  };

  // Spellcasting Management
  const handleAddSpell = (spell: SpellItemData) => {
    if (!sheet || !canEdit) return;
    const spells = [...(sheet.spells || []), spell];
    const updated = { ...sheet, spells };
    setSheet(updated);
    saveSheet(updated);
  };

  const handleRemoveSpell = (id: string) => {
    if (!sheet || !canEdit) return;
    const spells = (sheet.spells || []).filter((s) => s.id !== id);
    const updated = { ...sheet, spells };
    setSheet(updated);
    saveSheet(updated);
  };

  const handleToggleSpellPrepared = (id: string) => {
    if (!sheet || !canEdit) return;
    const spells = (sheet.spells || []).map((s) =>
      s.id === id ? { ...s, prepared: !s.prepared } : s
    );
    const updated = { ...sheet, spells };
    setSheet(updated);
  };

  // Quick Cast Spell & Slot expenditure
  const handleQuickCastSpell = (spell: SpellItemData) => {
    if (!sheet) return;
    if (spell.level > 0) {
      const slot = sheet.spellSlots?.[spell.level];
      if (slot && slot.total > 0 && slot.used >= slot.total) {
        alert(`No remaining Level ${spell.level} spell slots!`);
        return;
      }
      // Deduct slot
      if (slot && slot.total > 0) {
        toggleSpellSlot(spell.level, slot.used);
      }
    }

    // Roll damage dice if present
    if (spell.damageDice) {
      handleRollDice(spell.damageDice, `${spell.name} Damage`);
    } else if (spell.isAttack) {
      handleRollDice(`1d20+${spellMetrics.atkMod}`, `${spell.name} Attack Roll`);
    } else {
      setLastRoll({
        formula: `${spell.name}`,
        label: `Cast ${spell.name} (Level ${spell.level})`,
        result: 1,
      });
    }
  };

  // Toggle spell slot spent
  const toggleSpellSlot = (level: number, slotIdx: number) => {
    if (!sheet || !canEdit) return;
    const curr = sheet.spellSlots?.[level] || { total: 0, used: 0 };
    let newUsed = curr.used;
    if (slotIdx >= curr.used) {
      newUsed = slotIdx + 1;
    } else {
      newUsed = slotIdx;
    }
    const updated: CharacterSheetData = {
      ...sheet,
      spellSlots: {
        ...sheet.spellSlots,
        [level]: { ...curr, used: newUsed },
      },
    };
    setSheet(updated);
  };

  // Dice Roller
  const handleRollDice = (formula: string, label: string) => {
    // Simple d20/dX parser
    const match = formula.match(/(\d*)d(\d+)([+-]\d+)?/i);
    let total = 0;
    if (match) {
      const count = parseInt(match[1], 10) || 1;
      const sides = parseInt(match[2], 10);
      const mod = parseInt(match[3] || "0", 10);
      for (let i = 0; i < count; i++) {
        total += Math.floor(Math.random() * sides) + 1;
      }
      total += mod;
    } else {
      total = Math.floor(Math.random() * 20) + 1;
    }
    setLastRoll({ formula, label, result: total });
    setTimeout(() => {
      // Keep visible for 5s
    }, 5000);
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        <p className="text-xs text-stone-400 font-mono">Inscribing adventurer codex...</p>
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="py-20 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
        <p className="text-sm text-stone-300">No character sheet found for this adventurer.</p>
        {currentUser && (
          <button
            type="button"
            onClick={() => setShowWizard(true)}
            className="px-4 py-2 rounded-xl bg-amber-600 text-stone-950 font-bold text-xs"
          >
            Launch 5e Character Builder Wizard
          </button>
        )}
        {showWizard && (
          <CharacterBuilderWizard
            userId={currentUser?.id || "hero"}
            defaultCharacterName={currentUser?.character}
            onClose={() => setShowWizard(false)}
            onSave={async (newSheet) => {
              await saveSheet(newSheet);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* DICE ROLL FLOATING BANNER */}
      {lastRoll && (
        <div className="p-3.5 rounded-2xl bg-amber-950/80 border border-amber-500/80 shadow-2xl flex items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold text-lg font-mono shadow">
              <Dices className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-amber-300">{lastRoll.label}</div>
              <div className="text-[11px] text-stone-400 font-mono">Formula: {lastRoll.formula}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-stone-400">Total Result</div>
              <div className="text-2xl font-mono font-black text-amber-200">{lastRoll.result}</div>
            </div>
            <button
              onClick={() => setLastRoll(null)}
              className="p-1.5 text-stone-400 hover:text-stone-200 rounded"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* TOP BAR / ROSTER SWITCHER & MAIN ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-stone-900 border border-stone-800 shadow-lg">
        <div className="flex items-center gap-3">
          {/* Portrait Thumbnail */}
          <button
            type="button"
            onClick={() => setShowPortrait(true)}
            className="w-12 h-12 rounded-xl bg-stone-950 border border-amber-500/40 overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-amber-500 transition shrink-0 group relative"
            title="Change Avatar"
          >
            {sheet.avatarUrl ? (
              <img src={sheet.avatarUrl} alt={sheet.character} className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-stone-500 group-hover:text-amber-400" />
            )}
          </button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold font-serif text-amber-100">
                {sheet.character || "Adventurer"}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Lv {sheet.level} {sheet.class}
              </span>
              {!canEdit && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-800 text-stone-400 border border-stone-700">
                  Read Only
                </span>
              )}
            </div>
            <p className="text-xs text-stone-400">
              Player: <span className="text-stone-300 font-medium">{sheet.name}</span> • {sheet.race} • {sheet.background}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Party member sheet selector */}
          {roster.length > 1 && (
            <div className="relative">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="pl-3 pr-8 py-2 rounded-xl bg-stone-950 border border-stone-700 text-xs text-amber-200 focus:outline-none focus:border-amber-500 appearance-none font-medium"
              >
                {roster.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.character} ({u.name})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          )}

          {/* Level Up Button */}
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowLevelUp(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-900/30 transition"
              title="Level Up (1-20) and pick features/multiclassing"
            >
              <ArrowUpCircle className="w-4 h-4" />
              <span>Level Up</span>
            </button>
          )}

          {/* Rest Buttons */}
          {canEdit && (
            <>
              <button
                type="button"
                onClick={handleShortRest}
                className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs font-semibold text-stone-200 flex items-center gap-1.5 transition"
                title="Spend Hit Dice and reset short rest abilities"
              >
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Short Rest</span>
              </button>
              <button
                type="button"
                onClick={handleLongRest}
                className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs font-semibold text-stone-200 flex items-center gap-1.5 transition"
                title="Restore full HP, hit dice, and spell slots"
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Long Rest</span>
              </button>
            </>
          )}

          {/* Wizard Rebuild */}
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowWizard(true)}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 transition"
              title="Open 5e Character Builder Wizard"
            >
              <Wrench className="w-4 h-4" />
            </button>
          )}

          {/* Save Button */}
          {canEdit && (
            <button
              type="button"
              onClick={() => saveSheet()}
              disabled={saving}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow transition ${
                saveSuccess
                  ? "bg-emerald-600 text-white"
                  : "bg-amber-600 hover:bg-amber-500 text-stone-950"
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* COMPANION SUB-TABS BAR */}
      <div className="flex items-center gap-2 border-b border-stone-800 pb-2 text-xs font-serif overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("character")}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
            activeTab === "character"
              ? "bg-amber-600/20 border border-amber-500 text-amber-300 font-bold"
              : "bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>{sheet.character} (Adventurer)</span>
        </button>

        {(sheet.companions || []).map((comp) => (
          <button
            key={comp.id}
            type="button"
            onClick={() => setActiveTab(comp.id)}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === comp.id
                ? "bg-amber-600/20 border border-amber-500 text-amber-300 font-bold"
                : "bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>{comp.name}</span>
          </button>
        ))}

        {canEdit && (
          <button
            type="button"
            onClick={() => setActiveTab("add_companion")}
            className="px-2.5 py-1.5 rounded-lg bg-stone-900/60 border border-stone-800 text-stone-400 hover:text-amber-300 transition text-[11px]"
          >
            + Add Companion / Pet
          </button>
        )}
      </div>

      {/* CONDITIONAL: COMPANION TAB VIEW */}
      {activeTab !== "character" ? (
        <CompanionSheet
          companions={sheet.companions || []}
          activeCompanionId={activeTab === "add_companion" ? undefined : activeTab}
          canEdit={canEdit}
          onUpdateCompanions={(updated) => {
            const next = { ...sheet, companions: updated };
            setSheet(next);
            saveSheet(next);
          }}
          onDiceRoll={handleRollDice}
        />
      ) : (
        /* MAIN CHARACTER SHEET VIEW */
        <div className="space-y-6">
          {/* COMBAT VITALS ROW */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {/* Armor Class */}
            <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 text-center space-y-1 relative">
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Armor Class</div>
              <div className="flex items-center justify-center gap-1">
                <Shield className="w-4 h-4 text-amber-400" />
                <span className="font-mono font-black text-2xl text-amber-200">
                  {sheet.ac}
                </span>
              </div>
              <div className="text-[10px] text-stone-500">Auto 5e Armor & Dex</div>
            </div>

            {/* Speed */}
            <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 text-center space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Walking Speed</div>
              <div className="flex items-center justify-center gap-1">
                <span className="font-mono font-black text-2xl text-stone-200">{sheet.speed}</span>
                <span className="text-xs text-stone-400 font-mono">ft</span>
              </div>
              <div className="text-[10px] text-stone-500">Movement</div>
            </div>

            {/* Initiative */}
            <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 text-center space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Initiative</div>
              <div className="font-mono font-black text-2xl text-emerald-400">
                {formatModifier(mods.dex + (sheet.initiativeBonus || 0))}
              </div>
              <div className="text-[10px] text-stone-500">DEX Modifier</div>
            </div>

            {/* Passive Perception */}
            <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 text-center space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Passive Perception</div>
              <div className="font-mono font-black text-2xl text-sky-400">
                {passivePerception}
              </div>
              <div className="text-[10px] text-stone-500">10 + Perception</div>
            </div>

            {/* Inspiration */}
            <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 text-center space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Inspiration</div>
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => updateField("inspiration", !sheet.inspiration)}
                className={`w-full py-1.5 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  sheet.inspiration
                    ? "bg-amber-500 text-stone-950 border-amber-400 shadow-lg shadow-amber-500/20"
                    : "bg-stone-800 text-stone-500 border-stone-700 hover:text-stone-300"
                }`}
              >
                <Dices className="w-4 h-4" />
                <span>{sheet.inspiration ? "ACTIVE" : "None"}</span>
              </button>
              <div className="text-[10px] text-stone-500">Advantage Token</div>
            </div>

            {/* Hit Dice */}
            <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 text-center space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Hit Dice Pool</div>
              <div className="flex items-center justify-center gap-1 font-mono text-base font-bold text-amber-200">
                <input
                  type="number"
                  min={0}
                  disabled={!canEdit}
                  value={sheet.hitDiceCurrent}
                  onChange={(e) => updateField("hitDiceCurrent", parseInt(e.target.value, 10) || 0)}
                  className="w-8 text-center bg-stone-800 rounded focus:outline-none"
                />
                <span>/</span>
                <span className="text-xs text-stone-400">{sheet.hitDiceTotal}</span>
              </div>
              <div className="text-[10px] text-stone-500">Current / Max</div>
            </div>
          </div>

          {/* HIT POINTS & DEATH SAVES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* HP Tracker */}
            <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-3 md:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-500 fill-rose-500/20" />
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-200">
                    Hit Point Tracker
                  </span>
                </div>
                <div className="text-xs text-stone-400">
                  Temp HP:{" "}
                  <input
                    type="number"
                    min={0}
                    disabled={!canEdit}
                    value={sheet.hpTemp}
                    onChange={(e) => updateField("hpTemp", parseInt(e.target.value, 10) || 0)}
                    className="w-12 px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 text-sky-400 font-mono text-center focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-stone-950 border border-stone-800">
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-500">Current HP</span>
                  <div className="flex items-baseline gap-2">
                    <input
                      type="number"
                      min={0}
                      disabled={!canEdit}
                      value={sheet.hpCurrent}
                      onChange={(e) => updateField("hpCurrent", parseInt(e.target.value, 10) || 0)}
                      className="w-20 font-mono font-black text-3xl text-emerald-400 bg-transparent focus:outline-none focus:bg-stone-850 rounded"
                    />
                    <span className="text-stone-500 text-lg font-mono">/</span>
                    <span className="font-mono text-lg text-stone-400">{sheet.hpMax} Max</span>
                  </div>
                </div>

                {/* Quick Steppers */}
                {canEdit && (
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <button
                      type="button"
                      onClick={() => adjustHp(-5)}
                      className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800 text-rose-300 font-mono text-xs font-bold"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustHp(-1)}
                      className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800 text-rose-300 font-mono text-xs font-bold"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustHp(1)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800 text-emerald-300 font-mono text-xs font-bold"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustHp(5)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800 text-emerald-300 font-mono text-xs font-bold"
                    >
                      +5
                    </button>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div className="w-full bg-stone-950 rounded-full h-2.5 overflow-hidden border border-stone-800">
                <div
                  className={`h-full transition-all duration-300 ${
                    sheet.hpCurrent / sheet.hpMax > 0.5
                      ? "bg-emerald-500"
                      : sheet.hpCurrent / sheet.hpMax > 0.2
                      ? "bg-amber-500"
                      : "bg-rose-600 animate-pulse"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, (sheet.hpCurrent / sheet.hpMax) * 100))}%` }}
                />
              </div>
            </div>

            {/* Death Saves */}
            <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-200">
                Death Saves
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-400 font-medium">Successes</span>
                  <div className="flex items-center gap-2">
                    {[0, 1, 2].map((idx) => {
                      const checked = (sheet.deathSaves?.successes || 0) > idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!canEdit}
                          onClick={() => {
                            const cur = sheet.deathSaves?.successes || 0;
                            updateField("deathSaves", {
                              ...sheet.deathSaves,
                              successes: cur === idx + 1 ? idx : idx + 1,
                            });
                          }}
                          className={`w-6 h-6 rounded-full border flex items-center justify-center transition ${
                            checked
                              ? "bg-emerald-500 border-emerald-400 text-stone-950"
                              : "bg-stone-800 border-stone-700 text-transparent"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-rose-400 font-medium">Failures</span>
                  <div className="flex items-center gap-2">
                    {[0, 1, 2].map((idx) => {
                      const checked = (sheet.deathSaves?.failures || 0) > idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!canEdit}
                          onClick={() => {
                            const cur = sheet.deathSaves?.failures || 0;
                            updateField("deathSaves", {
                              ...sheet.deathSaves,
                              failures: cur === idx + 1 ? idx : idx + 1,
                            });
                          }}
                          className={`w-6 h-6 rounded-full border flex items-center justify-center transition ${
                            checked
                              ? "bg-rose-600 border-rose-500 text-white font-bold text-xs"
                              : "bg-stone-800 border-stone-700 text-transparent"
                          }`}
                        >
                          ✕
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ABILITIES & SKILLS (2-COLUMN LAYOUT) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Ability Scores & Saving Throws (Col 1 to 4) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-200 flex items-center justify-between">
                  <span>Ability Scores</span>
                  <span className="text-[10px] text-stone-400 font-sans font-normal">Save Prof</span>
                </div>

                <div className="space-y-2.5">
                  {(["str", "dex", "con", "int", "wis", "cha"] as const).map((stat) => {
                    const val = sheet.stats[stat];
                    const mod = mods[stat];
                    const saveMod = saves[stat];
                    const isProf = Boolean(sheet.savingThrows?.[stat]);

                    return (
                      <div
                        key={stat}
                        className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 text-center font-bold uppercase text-xs text-amber-400">
                            {stat}
                          </div>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            disabled={!canEdit}
                            value={val}
                            onChange={(e) => updateStat(stat, parseInt(e.target.value, 10) || 10)}
                            className="w-12 px-1.5 py-1 text-center font-mono text-sm bg-stone-900 border border-stone-700 rounded text-stone-100 focus:outline-none focus:border-amber-500"
                          />
                          <div className="w-12 text-center font-mono font-bold text-sm text-emerald-300">
                            {formatModifier(mod)}
                          </div>
                        </div>

                        {/* Saving Throw Checkbox */}
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => toggleSaveProf(stat)}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition ${
                            isProf
                              ? "bg-amber-600/30 border-amber-500 text-amber-300"
                              : "bg-stone-800 border-stone-700 text-stone-400 hover:text-stone-300"
                          }`}
                          title="Toggle saving throw proficiency"
                        >
                          <span className={`w-2 h-2 rounded-full ${isProf ? "bg-amber-400" : "bg-stone-600"}`} />
                          <span>{formatModifier(saveMod)}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 18 Skills List (Col 5 to 12) */}
            <div className="lg:col-span-8 p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-200">
                <span>18 Skills (Auto-Math)</span>
                <div className="flex items-center gap-2 text-[10px] text-stone-400 font-sans font-normal">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-stone-600" /> None</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Prof (+{pb})</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Exp (+{pb * 2})</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SKILL_DEFINITIONS.map((sk) => {
                  const profLevel = sheet.skills?.[sk.id] || 0;
                  const bonus = skillTotals[sk.id];

                  return (
                    <button
                      key={sk.id}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => cycleSkillProf(sk.id)}
                      className={`p-2 rounded-xl border text-left flex items-center justify-between transition group ${
                        profLevel === 2
                          ? "bg-purple-950/20 border-purple-600/50 hover:border-purple-400"
                          : profLevel === 1
                          ? "bg-emerald-950/20 border-emerald-600/50 hover:border-emerald-400"
                          : "bg-stone-950 border-stone-800 hover:border-stone-600"
                      }`}
                      title="Click to cycle: None -> Proficient -> Expertise"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            profLevel === 2
                              ? "bg-purple-400 shadow shadow-purple-500/50"
                              : profLevel === 1
                              ? "bg-emerald-400 shadow shadow-emerald-500/50"
                              : "bg-stone-700"
                          }`}
                        />
                        <span className="text-xs text-stone-200 font-medium truncate">
                          {sk.name}
                        </span>
                        <span className="text-[10px] text-stone-500 uppercase font-mono">
                          ({sk.stat})
                        </span>
                      </div>

                      <span
                        className={`font-mono text-xs font-bold ${
                          profLevel === 2
                            ? "text-purple-300"
                            : profLevel === 1
                            ? "text-emerald-300"
                            : "text-stone-400"
                        }`}
                      >
                        {formatModifier(bonus)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* COMBAT ATTACKS & ACTIONS */}
          <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sword className="w-5 h-5 text-amber-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-amber-200">
                  Combat Attacks & Actions
                </h2>
              </div>
              <p className="text-xs text-stone-400">
                Populated automatically from equipped weapons in your inventory.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(sheet.attacks || []).map((atk) => (
                <div
                  key={atk.id}
                  className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-stone-100">
                      {atk.name}
                    </span>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {atk.atkBonus} to Hit
                    </span>
                  </div>
                  <div className="font-mono text-xs text-stone-300">
                    Damage: <strong>{atk.damage}</strong>
                  </div>
                  {atk.notes && (
                    <div className="text-[11px] text-stone-400 truncate">
                      {atk.notes}
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleRollDice(`1d20${atk.atkBonus}`, `${atk.name} Attack Roll`)}
                      className="flex-1 py-1 text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg transition"
                    >
                      Roll Atk
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRollDice(atk.damage.split(" ")[0], `${atk.name} Damage`)}
                      className="flex-1 py-1 text-xs font-semibold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-lg transition"
                    >
                      Roll Dmg
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* INTERACTIVE EQUIPMENT & INVENTORY */}
          <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-amber-200">
                  Equipment, Weapons & Armor
                </h2>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setShowEquipCatalog(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Search & Add Item</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {(sheet.inventoryItems || []).length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-500 border border-dashed border-stone-800 rounded-xl">
                  No items in inventory. Click &quot;Search &amp; Add Item&quot; to equip weapons, armor, or magic gear.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {(sheet.inventoryItems || []).map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border transition-all ${
                        item.equipped
                          ? "bg-amber-950/20 border-amber-500/60 ring-1 ring-amber-500/30"
                          : "bg-stone-950 border-stone-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-serif font-bold text-sm text-stone-100 truncate">
                              {item.name}
                            </span>
                            {item.quantity > 1 && (
                              <span className="text-[10px] font-mono px-1 rounded bg-stone-800 text-stone-400">
                                x{item.quantity}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-stone-400 mt-0.5">
                            {item.damage ? `${item.damage} ${item.damageType || ""}` : item.baseAc ? `AC ${item.baseAc}` : item.category}
                          </div>
                        </div>

                        {canEdit && (
                          <div className="flex items-center gap-1 shrink-0">
                            {(item.category === "weapon" || item.category === "armor" || item.category === "shield") && (
                              <button
                                type="button"
                                onClick={() => handleToggleEquipItem(item)}
                                className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                                  item.equipped
                                    ? "bg-amber-500 text-stone-950"
                                    : "bg-stone-800 text-stone-400 hover:text-stone-200"
                                }`}
                              >
                                {item.equipped ? "Equipped" : "Equip"}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveInventoryItem(item.id)}
                              className="p-1 text-stone-500 hover:text-red-400 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SPELLCASTING & SPELLBOOK COMPENDIUM */}
          <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-indigo-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-amber-200">
                  Spell Slots & Spellbook
                </h2>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-stone-400">Spellcasting Ability:</span>
                  <select
                    disabled={!canEdit}
                    value={sheet.spellcastingAbility || "none"}
                    onChange={(e) => updateField("spellcastingAbility", e.target.value as any)}
                    className="px-2 py-1 rounded-lg bg-stone-950 border border-stone-700 text-indigo-300 font-bold focus:outline-none"
                  >
                    <option value="none">None (Martial)</option>
                    <option value="int">INT (Wizard, Artificer)</option>
                    <option value="wis">WIS (Cleric, Druid, Ranger)</option>
                    <option value="cha">CHA (Bard, Paladin, Sorcerer, Warlock)</option>
                  </select>
                </div>

                {sheet.spellcastingAbility !== "none" && (
                  <>
                    <div className="px-2.5 py-1 rounded-lg bg-indigo-950/40 border border-indigo-600/40 text-indigo-200 font-mono">
                      Save DC: <strong className="text-indigo-400">{spellMetrics.saveDc}</strong>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-indigo-950/40 border border-indigo-600/40 text-indigo-200 font-mono">
                      Spell Atk: <strong className="text-indigo-400">+{spellMetrics.atkMod}</strong>
                    </div>
                  </>
                )}

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setShowSpellCatalog(true)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Spell</span>
                  </button>
                )}
              </div>
            </div>

            {/* Spell Slot Bubbles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-2.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => {
                const slotData = sheet.spellSlots?.[lvl] || { total: 0, used: 0 };
                return (
                  <div
                    key={lvl}
                    className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-center space-y-1.5"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Level {lvl}
                    </div>
                    <div className="flex items-center justify-center gap-1 text-xs">
                      <span className="text-stone-500">Slots:</span>
                      <input
                        type="number"
                        min={0}
                        max={6}
                        disabled={!canEdit}
                        value={slotData.total}
                        onChange={(e) => {
                          const total = parseInt(e.target.value, 10) || 0;
                          updateField("spellSlots", {
                            ...sheet.spellSlots,
                            [lvl]: { total, used: Math.min(slotData.used, total) },
                          });
                        }}
                        className="w-8 text-center font-mono rounded bg-stone-900 border border-stone-700 text-indigo-300 font-bold"
                      />
                    </div>
                    {slotData.total > 0 && (
                      <div className="flex items-center justify-center gap-1.5 flex-wrap pt-1">
                        {Array.from({ length: slotData.total }).map((_, idx) => {
                          const isUsed = idx < slotData.used;
                          return (
                            <button
                              key={idx}
                              type="button"
                              disabled={!canEdit}
                              onClick={() => toggleSpellSlot(lvl, idx)}
                              className={`w-4 h-4 rounded-full border transition ${
                                isUsed
                                  ? "bg-stone-800 border-stone-700 opacity-40"
                                  : "bg-indigo-500 border-indigo-400 shadow shadow-indigo-500/40"
                              }`}
                              title={isUsed ? "Slot Expended (Click to restore)" : "Slot Available (Click to expend)"}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Warlock Pact Magic Slots if applicable */}
            {sheet.pactSlots && (
              <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/40 flex items-center justify-between text-xs">
                <span className="font-serif font-bold text-purple-300">
                  Warlock Pact Magic (Level {sheet.pactSlots.level} Slots):
                </span>
                <div className="flex items-center gap-2">
                  {Array.from({ length: sheet.pactSlots.total }).map((_, i) => {
                    const isUsed = i < (sheet.pactSlots?.used || 0);
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={!canEdit}
                        onClick={() => {
                          const nextUsed = isUsed ? i : i + 1;
                          updateField("pactSlots", { ...sheet.pactSlots!, used: nextUsed });
                        }}
                        className={`w-5 h-5 rounded-full border transition ${
                          isUsed
                            ? "bg-stone-800 border-stone-700 opacity-40"
                            : "bg-purple-500 border-purple-400 shadow shadow-purple-500/40"
                        }`}
                        title="Recharges on a Short Rest!"
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Known & Prepared Spells List */}
            <div className="space-y-3 pt-2">
              {(sheet.spells || []).length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-500 border border-dashed border-stone-800 rounded-xl">
                  No spells added yet. Click &quot;+ Add Spell&quot; to search the official 5e spellbook.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(sheet.spells || []).map((spell) => (
                    <div
                      key={spell.id}
                      className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-serif font-bold text-base text-amber-200">
                              {spell.name}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/40">
                              {spell.level === 0 ? "Cantrip" : `Level ${spell.level}`}
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-400 mt-0.5">
                            {spell.castingTime} • Range: {spell.range}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleQuickCastSpell(spell)}
                            className="px-3 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40 text-xs font-bold transition flex items-center gap-1"
                          >
                            <Zap className="w-3 h-3" />
                            <span>Cast</span>
                          </button>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSpell(spell.id)}
                              className="p-1 text-stone-500 hover:text-red-400 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Prominent Action Bar */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        {spell.isAttack && (
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            +{spellMetrics.atkMod} vs AC
                          </span>
                        )}
                        {spell.saveStat && (
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase">
                            DC {spellMetrics.saveDc} {spell.saveStat}
                          </span>
                        )}
                        {spell.damageDice && (
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1">
                            <Flame className="w-3 h-3" />
                            {spell.damageDice} {spell.damageType || ""}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-stone-300 leading-relaxed">
                        {spell.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 5E.TOOLS QUICK LOOKUP DRAWER */}
          <div className="p-5 rounded-2xl bg-stone-900 border border-sky-600/40 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-sky-200">
                    5e.tools Instant Compendium Lookup
                  </h2>
                  <p className="text-xs text-stone-400">
                    Direct lookup for D&D 5e spells, items, monsters, and feats.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(["spells", "items", "bestiary", "feats"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setLookupCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase transition ${
                      lookupCategory === cat
                        ? "bg-sky-600 text-white shadow"
                        : "bg-stone-800 text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={`Search 5e.tools ${lookupCategory}... (e.g. Fireball, Shield, Bag of Holding)`}
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && lookupQuery.trim()) {
                    const encoded = encodeURIComponent(lookupQuery.trim().toLowerCase());
                    window.open(`https://5e.tools/${lookupCategory}.html#${encoded}`, "_blank");
                  }
                }}
                className="flex-1 px-3 py-2 rounded-xl bg-black/60 border border-stone-700 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-sky-500 font-sans"
              />
              <button
                type="button"
                disabled={!lookupQuery.trim()}
                onClick={() => {
                  const encoded = encodeURIComponent(lookupQuery.trim().toLowerCase());
                  window.open(`https://5e.tools/${lookupCategory}.html#${encoded}`, "_blank");
                }}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-40"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open on 5e.tools</span>
              </button>
            </div>
          </div>

          {/* FEATURES, TRAITS & NOTES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-200">
                Class Features & Feats Unlocked
              </label>
              {(sheet.featureList || []).length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {(sheet.featureList || []).map((f) => (
                    <div key={f.id} className="p-2.5 rounded-lg bg-stone-950 border border-stone-800 text-xs">
                      <div className="flex items-center justify-between">
                        <strong className="text-amber-300 font-serif">{f.name}</strong>
                        <span className="text-[10px] font-mono text-stone-500">{f.source}</span>
                      </div>
                      <p className="text-stone-300 mt-1 leading-relaxed">{f.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <textarea
                  rows={6}
                  disabled={!canEdit}
                  value={sheet.features || ""}
                  onChange={(e) => updateField("features", e.target.value)}
                  placeholder="Second Wind, Action Surge, Darkvision, War Caster..."
                  className="w-full p-3 rounded-xl bg-stone-950 border border-stone-700 text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-sans leading-relaxed resize-y"
                />
              )}
            </div>

            <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-200">
                Personal Notes & Codex
              </label>
              <textarea
                rows={6}
                disabled={!canEdit}
                value={sheet.notes || ""}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Backstory, campaign bonds, allies, secret goals..."
                className="w-full p-3 rounded-xl bg-stone-950 border border-stone-700 text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-sans leading-relaxed resize-y"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {showWizard && (
        <CharacterBuilderWizard
          userId={sheet.userId}
          defaultCharacterName={sheet.character}
          onClose={() => setShowWizard(false)}
          onSave={async (newSheet) => {
            await saveSheet(newSheet);
          }}
        />
      )}

      {showLevelUp && (
        <LevelUpModal
          sheet={sheet}
          onClose={() => setShowLevelUp(false)}
          onSave={async (updatedSheet) => {
            await saveSheet(updatedSheet);
          }}
        />
      )}

      {showPortrait && (
        <CharacterPortraitModal
          currentAvatarUrl={sheet.avatarUrl}
          characterName={sheet.character}
          characterRace={sheet.race}
          characterClass={sheet.class}
          onClose={() => setShowPortrait(false)}
          onSaveAvatar={async (url) => {
            const updated = { ...sheet, avatarUrl: url };
            setSheet(updated);
            await saveSheet(updated);
          }}
        />
      )}

      {showEquipCatalog && (
        <EquipmentCatalogModal
          onClose={() => setShowEquipCatalog(false)}
          onAddItem={handleAddItemToInventory}
        />
      )}

      {showSpellCatalog && (
        <SpellCatalogModal
          onClose={() => setShowSpellCatalog(false)}
          onAddSpell={handleAddSpell}
        />
      )}
    </div>
  );
}
