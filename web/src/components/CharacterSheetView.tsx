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
} from "lucide-react";
import type { CharacterSheetData } from "@/app/api/character/sheet/route";

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

const SKILL_DEFINITIONS: Array<{ id: string; name: string; stat: "str" | "dex" | "int" | "wis" | "cha" }> = [
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

function calcMod(score: number): number {
  return Math.floor(((score || 10) - 10) / 2);
}

function formatMod(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function calcProfBonus(level: number): number {
  const lvl = Math.max(1, Math.min(20, level || 1));
  return Math.ceil(1 + lvl / 4);
}

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
      const res = await fetch(`/api/character/sheet?userId=${encodeURIComponent(userId)}`, { cache: "no-store" });
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

  // Auto-calculated statistics
  const pb = useMemo(() => calcProfBonus(sheet?.level || 1), [sheet?.level]);

  const mods = useMemo(() => {
    if (!sheet) return { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    return {
      str: calcMod(sheet.stats.str),
      dex: calcMod(sheet.stats.dex),
      con: calcMod(sheet.stats.con),
      int: calcMod(sheet.stats.int),
      wis: calcMod(sheet.stats.wis),
      cha: calcMod(sheet.stats.cha),
    };
  }, [sheet?.stats]);

  const saves = useMemo(() => {
    if (!sheet) return { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    return {
      str: mods.str + (sheet.savingThrows.str ? pb : 0),
      dex: mods.dex + (sheet.savingThrows.dex ? pb : 0),
      con: mods.con + (sheet.savingThrows.con ? pb : 0),
      int: mods.int + (sheet.savingThrows.int ? pb : 0),
      wis: mods.wis + (sheet.savingThrows.wis ? pb : 0),
      cha: mods.cha + (sheet.savingThrows.cha ? pb : 0),
    };
  }, [mods, sheet?.savingThrows, pb]);

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

  // Rest handlers
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
    const newDice = Math.max(0, sheet.hitDiceCurrent - 1);
    const updated: CharacterSheetData = {
      ...sheet,
      hpCurrent: Math.min(sheet.hpMax, sheet.hpCurrent + regained),
      hitDiceCurrent: newDice,
    };
    setSheet(updated);
    saveSheet(updated);
  };

  // Attacks management
  const addAttack = () => {
    if (!sheet || !canEdit) return;
    const newAtk = {
      id: `atk-${Date.now()}`,
      name: "New Attack",
      atkBonus: "+4",
      damage: "1d8 Slashing",
      notes: "Melee",
    };
    const updated: CharacterSheetData = {
      ...sheet,
      attacks: [...(sheet.attacks || []), newAtk],
    };
    setSheet(updated);
  };

  const removeAttack = (id: string) => {
    if (!sheet || !canEdit) return;
    const updated: CharacterSheetData = {
      ...sheet,
      attacks: (sheet.attacks || []).filter((a) => a.id !== id),
    };
    setSheet(updated);
  };

  const updateAttack = (id: string, key: "name" | "atkBonus" | "damage" | "notes", val: string) => {
    if (!sheet || !canEdit) return;
    const updated: CharacterSheetData = {
      ...sheet,
      attacks: (sheet.attacks || []).map((a) => (a.id === id ? { ...a, [key]: val } : a)),
    };
    setSheet(updated);
  };

  // Toggle spell slot spent
  const toggleSpellSlot = (level: number, slotIdx: number) => {
    if (!sheet || !canEdit) return;
    const curr = sheet.spellSlots?.[level] || { total: 0, used: 0 };
    // If clicking on an active slot, mark used
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

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        <p className="text-xs text-slate-400 font-mono">Inscribing adventurer codex...</p>
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="py-20 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
        <p className="text-sm text-slate-300">No character sheet found for this adventurer.</p>
        {currentUser && (
          <button
            type="button"
            onClick={() => fetchSheet(currentUser.id)}
            className="px-4 py-2 rounded-xl bg-amber-600 text-slate-950 font-bold text-xs"
          >
            Create My Character Sheet
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* TOP BAR / ROSTER SWITCHER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-fantasy-850 border border-fantasy-700/80 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-serif text-amber-100">
                {sheet.character || "Adventurer"}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Lvl {sheet.level} {sheet.class}
              </span>
              {!canEdit && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                  Read Only
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Player: <span className="text-slate-300 font-medium">{sheet.name}</span> • 5e (2014) Rules Sheet
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
                className="pl-3 pr-8 py-2 rounded-xl bg-fantasy-900 border border-fantasy-700 text-xs text-amber-200 focus:outline-none focus:border-amber-500 appearance-none font-medium"
              >
                {roster.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.character} ({u.name})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          )}

          {/* Rest Buttons */}
          {canEdit && (
            <>
              <button
                type="button"
                onClick={handleShortRest}
                className="px-3 py-2 rounded-xl bg-fantasy-800 hover:bg-fantasy-700 border border-fantasy-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition"
                title="Spend Hit Dice and reset short rest abilities"
              >
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Short Rest</span>
              </button>
              <button
                type="button"
                onClick={handleLongRest}
                className="px-3 py-2 rounded-xl bg-fantasy-800 hover:bg-fantasy-700 border border-fantasy-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition"
                title="Restore full HP and spell slots"
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Long Rest</span>
              </button>
            </>
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
                  : "bg-amber-600 hover:bg-amber-500 text-slate-950"
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
                  <span>Save Sheet</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* HEADER / DOSSIER GRID */}
      <div className="p-5 rounded-2xl bg-fantasy-900 border border-fantasy-700/80 shadow grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Character Name
          </label>
          <input
            type="text"
            disabled={!canEdit}
            value={sheet.character}
            onChange={(e) => updateField("character", e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-fantasy-800 border border-fantasy-700 text-xs text-amber-200 font-bold focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Class & Subclass
          </label>
          <input
            type="text"
            disabled={!canEdit}
            value={sheet.class}
            onChange={(e) => updateField("class", e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-fantasy-800 border border-fantasy-700 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Level (1-20)
          </label>
          <input
            type="number"
            min={1}
            max={20}
            disabled={!canEdit}
            value={sheet.level}
            onChange={(e) => updateField("level", parseInt(e.target.value, 10) || 1)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-fantasy-800 border border-fantasy-700 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Race / Ancestry
          </label>
          <input
            type="text"
            disabled={!canEdit}
            value={sheet.race}
            onChange={(e) => updateField("race", e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-fantasy-800 border border-fantasy-700 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Background
          </label>
          <input
            type="text"
            disabled={!canEdit}
            value={sheet.background}
            onChange={(e) => updateField("background", e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-fantasy-800 border border-fantasy-700 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Proficiency Bonus
          </label>
          <div className="w-full px-2.5 py-1.5 rounded-lg bg-amber-950/40 border border-amber-600/40 text-xs font-mono font-bold text-amber-300 flex items-center justify-between">
            <span>+{pb}</span>
            <span className="text-[10px] text-amber-400/70 font-sans">Auto 5e</span>
          </div>
        </div>
      </div>

      {/* COMBAT VITALS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3.5">
        {/* Armor Class */}
        <div className="p-4 rounded-xl bg-fantasy-900 border border-fantasy-700 text-center space-y-1 relative">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Armor Class</div>
          <div className="flex items-center justify-center gap-1">
            <Shield className="w-4 h-4 text-amber-400" />
            <input
              type="number"
              disabled={!canEdit}
              value={sheet.ac}
              onChange={(e) => updateField("ac", parseInt(e.target.value, 10) || 10)}
              className="w-14 text-center font-mono font-black text-xl text-amber-200 bg-transparent focus:outline-none focus:bg-fantasy-800 rounded"
            />
          </div>
          <div className="text-[10px] text-slate-500">AC</div>
        </div>

        {/* Speed */}
        <div className="p-4 rounded-xl bg-fantasy-900 border border-fantasy-700 text-center space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Walking Speed</div>
          <div className="flex items-center justify-center gap-1">
            <input
              type="number"
              step={5}
              disabled={!canEdit}
              value={sheet.speed}
              onChange={(e) => updateField("speed", parseInt(e.target.value, 10) || 30)}
              className="w-14 text-center font-mono font-black text-xl text-slate-200 bg-transparent focus:outline-none focus:bg-fantasy-800 rounded"
            />
            <span className="text-xs text-slate-400 font-mono">ft</span>
          </div>
          <div className="text-[10px] text-slate-500">Standard Movement</div>
        </div>

        {/* Initiative */}
        <div className="p-4 rounded-xl bg-fantasy-900 border border-fantasy-700 text-center space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Initiative</div>
          <div className="font-mono font-black text-xl text-emerald-400">
            {formatMod(mods.dex + (sheet.initiativeBonus || 0))}
          </div>
          <div className="text-[10px] text-slate-500">DEX ({formatMod(mods.dex)})</div>
        </div>

        {/* Passive Perception */}
        <div className="p-4 rounded-xl bg-fantasy-900 border border-fantasy-700 text-center space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Passive Perception</div>
          <div className="font-mono font-black text-xl text-sky-400">
            {passivePerception}
          </div>
          <div className="text-[10px] text-slate-500">10 + Perception</div>
        </div>

        {/* Inspiration */}
        <div className="p-4 rounded-xl bg-fantasy-900 border border-fantasy-700 text-center space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inspiration</div>
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => updateField("inspiration", !sheet.inspiration)}
            className={`w-full py-1.5 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              sheet.inspiration
                ? "bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20"
                : "bg-fantasy-800 text-slate-500 border-fantasy-700 hover:text-slate-300"
            }`}
          >
            <Dices className="w-4 h-4" />
            <span>{sheet.inspiration ? "ACTIVE" : "None"}</span>
          </button>
          <div className="text-[10px] text-slate-500">d20 Advantage Token</div>
        </div>

        {/* Hit Dice */}
        <div className="p-4 rounded-xl bg-fantasy-900 border border-fantasy-700 text-center space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hit Dice</div>
          <div className="flex items-center justify-center gap-1 font-mono text-base font-bold text-amber-200">
            <input
              type="number"
              min={0}
              disabled={!canEdit}
              value={sheet.hitDiceCurrent}
              onChange={(e) => updateField("hitDiceCurrent", parseInt(e.target.value, 10) || 0)}
              className="w-8 text-center bg-fantasy-800 rounded focus:outline-none"
            />
            <span>/</span>
            <input
              type="text"
              disabled={!canEdit}
              value={sheet.hitDiceTotal}
              onChange={(e) => updateField("hitDiceTotal", e.target.value)}
              className="w-12 text-center bg-fantasy-800 rounded focus:outline-none"
            />
          </div>
          <div className="text-[10px] text-slate-500">Current / Max Pool</div>
        </div>
      </div>

      {/* HIT POINTS & DEATH SAVES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* HP Tracker with Quick Steppers */}
        <div className="p-5 rounded-2xl bg-fantasy-900 border border-fantasy-700 space-y-3 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500/20" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-200">
                Hit Point Tracker
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Temp HP:{" "}
              <input
                type="number"
                min={0}
                disabled={!canEdit}
                value={sheet.hpTemp}
                onChange={(e) => updateField("hpTemp", parseInt(e.target.value, 10) || 0)}
                className="w-12 px-1.5 py-0.5 rounded bg-fantasy-800 border border-fantasy-700 text-sky-400 font-mono text-center focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-fantasy-850 border border-fantasy-700/80">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500">Current HP</span>
              <div className="flex items-baseline gap-2">
                <input
                  type="number"
                  min={0}
                  disabled={!canEdit}
                  value={sheet.hpCurrent}
                  onChange={(e) => updateField("hpCurrent", parseInt(e.target.value, 10) || 0)}
                  className="w-20 font-mono font-black text-3xl text-emerald-400 bg-transparent focus:outline-none focus:bg-fantasy-800 rounded"
                />
                <span className="text-slate-500 text-lg font-mono">/</span>
                <input
                  type="number"
                  min={1}
                  disabled={!canEdit}
                  value={sheet.hpMax}
                  onChange={(e) => updateField("hpMax", parseInt(e.target.value, 10) || 1)}
                  className="w-16 font-mono text-lg text-slate-400 bg-transparent focus:outline-none focus:bg-fantasy-800 rounded"
                />
                <span className="text-xs text-slate-500">Max HP</span>
              </div>
            </div>

            {/* Stepper Buttons */}
            {canEdit && (
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <button
                  type="button"
                  onClick={() => adjustHp(-5)}
                  className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800 text-rose-300 font-mono text-xs font-bold transition"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => adjustHp(-1)}
                  className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800 text-rose-300 font-mono text-xs font-bold transition"
                >
                  -1
                </button>
                <button
                  type="button"
                  onClick={() => adjustHp(1)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800 text-emerald-300 font-mono text-xs font-bold transition"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => adjustHp(5)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800 text-emerald-300 font-mono text-xs font-bold transition"
                >
                  +5
                </button>
              </div>
            )}
          </div>

          {/* HP Bar */}
          <div className="w-full bg-fantasy-950 rounded-full h-2.5 overflow-hidden border border-fantasy-700">
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
        <div className="p-5 rounded-2xl bg-fantasy-900 border border-fantasy-700 space-y-4">
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
                          ? "bg-emerald-500 border-emerald-400 text-slate-950"
                          : "bg-fantasy-800 border-fantasy-700 text-transparent"
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
                          : "bg-fantasy-800 border-fantasy-700 text-transparent"
                      }`}
                    >
                      ✕
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={!canEdit}
            onClick={() => updateField("deathSaves", { successes: 0, failures: 0 })}
            className="w-full py-1 text-[11px] rounded bg-fantasy-800 hover:bg-fantasy-700 text-slate-400 hover:text-slate-200 transition"
          >
            Clear Death Saves
          </button>
        </div>
      </div>

      {/* ABILITIES & SKILLS (MPMB STYLE COLUMN DENSITY) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Ability Scores & Saving Throws (Col 1 to 4) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-2xl bg-fantasy-900 border border-fantasy-700 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-200 flex items-center justify-between">
              <span>Ability Scores</span>
              <span className="text-[10px] text-slate-400 font-sans font-normal">Save Prof</span>
            </div>

            <div className="space-y-2.5">
              {(["str", "dex", "con", "int", "wis", "cha"] as const).map((stat) => {
                const val = sheet.stats[stat];
                const mod = mods[stat];
                const saveMod = saves[stat];
                const isProf = Boolean(sheet.savingThrows[stat]);

                return (
                  <div
                    key={stat}
                    className="p-2.5 rounded-xl bg-fantasy-850 border border-fantasy-700/80 flex items-center justify-between"
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
                        className="w-12 px-1.5 py-1 text-center font-mono text-sm bg-fantasy-800 border border-fantasy-700 rounded text-slate-100 focus:outline-none focus:border-amber-500"
                      />
                      <div className="w-12 text-center font-mono font-bold text-sm text-emerald-300">
                        {formatMod(mod)}
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
                          : "bg-fantasy-800 border-fantasy-700 text-slate-400 hover:text-slate-300"
                      }`}
                      title="Toggle saving throw proficiency"
                    >
                      <span className={`w-2 h-2 rounded-full ${isProf ? "bg-amber-400" : "bg-slate-600"}`} />
                      <span>{formatMod(saveMod)}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 18 Skills List (Col 5 to 12) */}
        <div className="lg:col-span-8 p-4 rounded-2xl bg-fantasy-900 border border-fantasy-700 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-200">
            <span>18 Skills (Auto-Calculated)</span>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-sans font-normal">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-600" /> None</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Prof (+{pb})</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Expertise (+{pb * 2})</span>
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
                      : "bg-fantasy-850 border-fantasy-700/60 hover:border-slate-500"
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
                          : "bg-slate-700"
                      }`}
                    />
                    <span className="text-xs text-slate-200 font-medium truncate">
                      {sk.name}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase font-mono">
                      ({sk.stat})
                    </span>
                  </div>

                  <span
                    className={`font-mono text-xs font-bold ${
                      profLevel === 2
                        ? "text-purple-300"
                        : profLevel === 1
                        ? "text-emerald-300"
                        : "text-slate-400"
                    }`}
                  >
                    {formatMod(bonus)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* WEAPONS & ATTACKS */}
      <div className="p-5 rounded-2xl bg-fantasy-900 border border-fantasy-700 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sword className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-200">
              Attacks & Spellcasting Actions
            </h2>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={addAttack}
              className="px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/50 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Attack</span>
            </button>
          )}
        </div>

        <div className="space-y-2">
          {(sheet.attacks || []).map((atk) => (
            <div
              key={atk.id}
              className="p-3 rounded-xl bg-fantasy-850 border border-fantasy-700/80 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
            >
              <div className="sm:col-span-4">
                <input
                  type="text"
                  disabled={!canEdit}
                  placeholder="Weapon or Spell Name"
                  value={atk.name}
                  onChange={(e) => updateAttack(atk.id, "name", e.target.value)}
                  className="w-full px-2.5 py-1 rounded-lg bg-fantasy-800 border border-fantasy-700 text-xs text-amber-200 font-bold focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  disabled={!canEdit}
                  placeholder="Atk Bonus (+5)"
                  value={atk.atkBonus}
                  onChange={(e) => updateAttack(atk.id, "atkBonus", e.target.value)}
                  className="w-full px-2.5 py-1 rounded-lg bg-fantasy-800 border border-fantasy-700 text-xs font-mono text-emerald-300 text-center focus:outline-none"
                />
              </div>
              <div className="sm:col-span-3">
                <input
                  type="text"
                  disabled={!canEdit}
                  placeholder="Damage & Type"
                  value={atk.damage}
                  onChange={(e) => updateAttack(atk.id, "damage", e.target.value)}
                  className="w-full px-2.5 py-1 rounded-lg bg-fantasy-800 border border-fantasy-700 text-xs text-slate-200 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  disabled={!canEdit}
                  placeholder="Notes / Range"
                  value={atk.notes || ""}
                  onChange={(e) => updateAttack(atk.id, "notes", e.target.value)}
                  className="w-full px-2.5 py-1 rounded-lg bg-fantasy-800 border border-fantasy-700 text-xs text-slate-400 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-1 flex justify-end">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => removeAttack(atk.id)}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SPELLCASTING & SPELL SLOT BUBBLE TRACKER */}
      <div className="p-5 rounded-2xl bg-fantasy-900 border border-fantasy-700 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-200">
              Spellcasting & Spell Slot Tracker
            </h2>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Spellcasting Ability:</span>
              <select
                disabled={!canEdit}
                value={sheet.spellcastingAbility || "none"}
                onChange={(e) => updateField("spellcastingAbility", e.target.value as any)}
                className="px-2 py-1 rounded-lg bg-fantasy-800 border border-fantasy-700 text-indigo-300 font-bold focus:outline-none"
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
          </div>
        </div>

        {/* 9 Spell Slot Levels */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => {
            const slotData = sheet.spellSlots?.[lvl] || { total: 0, used: 0 };

            return (
              <div
                key={lvl}
                className="p-3 rounded-xl bg-fantasy-850 border border-fantasy-700/80 text-center space-y-2"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Level {lvl}
                </div>

                <div className="flex items-center justify-center gap-1 text-xs">
                  <span className="text-slate-500">Slots:</span>
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
                    className="w-10 px-1 py-0.5 text-center font-mono rounded bg-fantasy-800 border border-fantasy-700 text-indigo-300 font-bold focus:outline-none"
                  />
                </div>

                {/* Slot Bubbles */}
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
                          className={`w-5 h-5 rounded-full border transition ${
                            isUsed
                              ? "bg-slate-800 border-slate-700 opacity-40"
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
      </div>

      {/* 5E.TOOLS QUICK LOOKUP DRAWER */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-fantasy-900 to-fantasy-950 border border-sky-600/40 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/40">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-sky-200">
                5e.tools Instant Compendium Lookup
              </h2>
              <p className="text-xs text-slate-400">
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
                    : "bg-fantasy-800 text-slate-400 hover:text-slate-200"
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
            className="flex-1 px-3 py-2 rounded-xl bg-black/60 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-sans"
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

      {/* FEATURES, TRAITS & INVENTORY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-5 rounded-2xl bg-fantasy-900 border border-fantasy-700 space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-amber-200">
            Features, Feats & Class Abilities
          </label>
          <textarea
            rows={6}
            disabled={!canEdit}
            value={sheet.features}
            onChange={(e) => updateField("features", e.target.value)}
            placeholder="Second Wind, Action Surge, Darkvision, War Caster..."
            className="w-full p-3 rounded-xl bg-fantasy-850 border border-fantasy-700 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-sans leading-relaxed resize-y"
          />
        </div>

        <div className="p-5 rounded-2xl bg-fantasy-900 border border-fantasy-700 space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-amber-200">
            Equipment & Personal Possessions
          </label>
          <textarea
            rows={6}
            disabled={!canEdit}
            value={sheet.inventory}
            onChange={(e) => updateField("inventory", e.target.value)}
            placeholder="Weapons, armor, potions, coin pouch, trinkets..."
            className="w-full p-3 rounded-xl bg-fantasy-850 border border-fantasy-700 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-sans leading-relaxed resize-y"
          />
        </div>
      </div>
    </div>
  );
}
