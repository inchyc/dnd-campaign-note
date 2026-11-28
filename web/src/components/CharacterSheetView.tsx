"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import { useFeedback } from "./FeedbackContext";
import { useTableTools } from "./TableToolsContext";
import { getCachedData, setCachedData } from "@/lib/cache";
import { EquipmentCatalogModal } from "./character/EquipmentCatalogModal";
import { SpellCatalogModal } from "./character/SpellCatalogModal";
import { DeleteCharacterModal } from "./DeleteCharacterModal";
import {
  calcModifier,
  formatModifier,
  calcProficiencyBonus,
  calculateArmorClass,
  calcMulticlassSpellSlots,
  calcWarlockPactSlots,
  resolveArmorCategory,
  calcWeaponAttackMod,
} from "@/data/5e/rulesEngine";
import { CLASSES_5E } from "@/data/5e/classes";
import { SPELLS_5E } from "@/data/5e/spells";
import { WEAPONS_5E, ARMOR_5E, GEAR_5E, PACKS_5E, TOOLS_5E } from "@/data/5e/equipment";
import { FEATS_5E } from "@/data/5e/feats";

interface CharacterSheetViewProps {
  currentUser: {
    id: string;
    name: string;
    character: string;
    role: "scribe" | "player";
  } | null;
  activeCampaign?: { id: string; name: string } | null;
  isScribe?: boolean;
  onRosterUpdated?: (users: any[]) => void;
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
  onRosterUpdated,
}: CharacterSheetViewProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser?.id || "");
  const [roster, setRoster] = useState<Array<{ id: string; name: string; character: string; role?: "scribe" | "player" }>>([]);
  const [sheet, setSheet] = useState<CharacterSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "dirty" | "saving" | "saved" | "error" | "conflict">("idle");
  const [conflictSheet, setConflictSheet] = useState<CharacterSheetData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastSyncedAtRef = useRef<number>(0);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sub-Tab: "character" or companion ID
  const [activeTab, setActiveTab] = useState<string>("character");

  // Modals
  const [showWizard, setShowWizard] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showPortrait, setShowPortrait] = useState(false);
  const [showEquipCatalog, setShowEquipCatalog] = useState(false);
  const [showSpellCatalog, setShowSpellCatalog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Live Dice Roll Banner
  const { toast, confirm: confirmDialog, prompt: promptDialog } = useFeedback();
  const { rollDice } = useTableTools();
  const [lastRoll, setLastRoll] = useState<{ formula: string; label: string; result: number } | null>(null);

  // 5e.tools lookup & sheet UI controls state
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupCategory, setLookupCategory] = useState<"spells" | "items" | "bestiary" | "feats" | "classes">("spells");
  const [showAllSpellSlots, setShowAllSpellSlots] = useState(false);
  const [castSlotChoiceBySpell, setCastSlotChoiceBySpell] = useState<Record<string, string>>({});
  const [profInputByCategory, setProfInputByCategory] = useState<{
    languages: string;
    armor: string;
    weapons: string;
    tools: string;
  }>({ languages: "", armor: "", weapons: "", tools: "" });
  const [featureSearch, setFeatureSearch] = useState("");
  const [featureSourceFilter, setFeatureSourceFilter] = useState<"all" | "class" | "feat" | "race" | "custom">("all");
  const [showAddFeatureForm, setShowAddFeatureForm] = useState(false);
  const [newFeatureName, setNewFeatureName] = useState("");
  const [newFeatureSource, setNewFeatureSource] = useState("Custom / DM");
  const [newFeatureDesc, setNewFeatureDesc] = useState("");

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
    const cacheKey = `char_sheet_${userId}`;
    const cached = getCachedData<CharacterSheetData>(cacheKey);
    if (cached?.data) {
      setSheet(cached.data);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await fetch(`/api/character/sheet?userId=${encodeURIComponent(userId)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success && data.sheet) {
        setSheet(data.sheet);
        setCachedData(cacheKey, data.sheet);
        lastSyncedAtRef.current = data.sheet.updatedAt || 0;
        setSaveStatus("idle");
        setConflictSheet(null);
        if (data.isNew && userId === currentUser?.id) {
          setShowWizard(true);
        }
      } else if (!cached?.data) {
        setError(data.error || "Failed to load character sheet");
      }
    } catch (e: any) {
      if (!cached?.data) {
        setError(e.message || "Failed to fetch character sheet");
      }
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
  const saveSheet = useCallback(async (updatedSheet?: CharacterSheetData, force = false) => {
    const toSave = updatedSheet || sheet;
    if (!toSave) return;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    setSaving(true);
    setSaveStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/character/sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...toSave,
          baseUpdatedAt: lastSyncedAtRef.current || undefined,
          force,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.conflict) {
        setSaveStatus("conflict");
        setConflictSheet(data.serverSheet || null);
        toast("Sheet changed on another device — resolve conflict above.", { type: "warning" });
        return;
      }
      if (data.success) {
        setSheet(data.sheet);
        setCachedData(`char_sheet_${toSave.userId}`, data.sheet);
        lastSyncedAtRef.current = data.sheet.updatedAt || Date.now();
        setConflictSheet(null);
        setSaveStatus("saved");
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        setSaveStatus("error");
        setError(data.error || "Failed to save sheet");
      }
    } catch (e: any) {
      setSaveStatus("error");
      setError(e.message || "Failed to save sheet");
    } finally {
      setSaving(false);
    }
  }, [sheet, toast]);

  const applyLocalEdit = useCallback(
    (updated: CharacterSheetData) => {
      setSheet(updated);
      setCachedData(`char_sheet_${updated.userId}`, updated);
      setSaveStatus("dirty");
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        saveSheet(updated);
      }, 1200);
    },
    [saveSheet]
  );

  // Ctrl+S / Cmd+S shortcut & beforeunload unsaved guard
  useEffect(() => {
    if (!canEdit) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveSheet();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canEdit, saveSheet]);

  useEffect(() => {
    if (saveStatus !== "dirty" && saveStatus !== "saving") return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Character sheet changes are still saving.";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saveStatus]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  const updateField = <K extends keyof CharacterSheetData>(key: K, val: CharacterSheetData[K]) => {
    if (!sheet || !canEdit) return;
    const updated = { ...sheet, [key]: val };
    applyLocalEdit(updated);
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
    applyLocalEdit(updated);
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
    applyLocalEdit(updated);
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
    applyLocalEdit(updated);
  };

  // HP Adjustments
  const adjustHp = (delta: number) => {
    if (!sheet || !canEdit) return;
    const newHp = Math.max(0, Math.min(sheet.hpMax, sheet.hpCurrent + delta));
    const updated = { ...sheet, hpCurrent: newHp };
    applyLocalEdit(updated);
  };

  // Rest Handlers
  const handleLongRest = async () => {
    if (!sheet || !canEdit) return;
    const ok = await confirmDialog({
      title: "Take a Long Rest?",
      message: "This restores full HP, resets death saves, and recovers all spell slots and half your Hit Dice.",
      confirmLabel: "Long Rest",
    });
    if (!ok) return;

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
    toast("Long Rest complete — HP & spell slots restored!", { type: "success" });
  };

  const handleShortRest = async () => {
    if (!sheet || !canEdit) return;
    const roll = await promptDialog({
      title: "Short Rest — Spend Hit Dice",
      message: "Enter HP regained from Hit Dice (or 0 to only reset short-rest abilities & pact slots):",
      defaultValue: "0",
      inputType: "number",
      confirmLabel: "Complete Short Rest",
    });
    if (roll === null) return;
    const regained = Math.max(0, parseInt(roll, 10) || 0);
    const newDice = Math.max(0, sheet.hitDiceCurrent - (regained > 0 ? 1 : 0));

    const updated: CharacterSheetData = {
      ...sheet,
      hpCurrent: Math.min(sheet.hpMax, sheet.hpCurrent + regained),
      hitDiceCurrent: newDice,
      pactSlots: sheet.pactSlots ? { ...sheet.pactSlots, used: 0 } : undefined,
    };
    setSheet(updated);
    saveSheet(updated);
    toast(`Short Rest complete${regained > 0 ? ` (+${regained} HP)` : ""}`, { type: "success" });
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
            category: resolveArmorCategory(equippedArmor),
            maxDexMod: equippedArmor.maxDexMod,
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
      .map((wpn) => {
        const mod = calcWeaponAttackMod(wpn, sheet.stats);
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
    applyLocalEdit(updated);
  };

  // Recalculate 5e Spell Slots & Pact Slots from classes
  const handleRecalculateSpellSlots = () => {
    if (!sheet || !canEdit) return;
    const classEntries =
      sheet.classes && sheet.classes.length > 0
        ? sheet.classes.map((c) => ({
            className: c.className,
            level: c.level,
            subclass: c.subclass || sheet.subclass,
          }))
        : [{ className: sheet.class, level: sheet.level, subclass: sheet.subclass }];

    const calculated = calcMulticlassSpellSlots(classEntries);
    const updatedSlots: Record<number, { total: number; used: number }> = {};
    for (let lvl = 1; lvl <= 9; lvl++) {
      const total = calculated[lvl] || 0;
      updatedSlots[lvl] = {
        total,
        used: Math.min(sheet.spellSlots?.[lvl]?.used || 0, total),
      };
    }

    const warlockEntry = classEntries.find((c) => c.className === "Warlock");
    const updatedPact = warlockEntry
      ? {
          level: calcWarlockPactSlots(warlockEntry.level).slotLevel,
          total: calcWarlockPactSlots(warlockEntry.level).count,
          used: Math.min(sheet.pactSlots?.used || 0, calcWarlockPactSlots(warlockEntry.level).count),
        }
      : undefined;

    const updated: CharacterSheetData = {
      ...sheet,
      spellSlots: updatedSlots,
      pactSlots: updatedPact,
    };
    applyLocalEdit(updated);
    toast("Spell slots recalculated from 5e class levels!", { type: "success" });
  };

  // Available cast slot choices for a leveled spell
  const getCastSlotOptions = (spell: SpellItemData) => {
    if (!sheet || spell.level === 0) return [];
    const options: Array<{ value: string; label: string }> = [];
    for (let lvl = spell.level; lvl <= 9; lvl++) {
      const slot = sheet.spellSlots?.[lvl];
      if (slot && slot.total > 0 && slot.used < slot.total) {
        const remaining = slot.total - slot.used;
        options.push({
          value: String(lvl),
          label: lvl === spell.level ? `Lv ${lvl} Slot (${remaining} left)` : `Upcast Lv ${lvl} (${remaining} left)`,
        });
      }
    }
    if (sheet.pactSlots && sheet.pactSlots.total > 0 && sheet.pactSlots.used < sheet.pactSlots.total && sheet.pactSlots.level >= spell.level) {
      const remaining = sheet.pactSlots.total - sheet.pactSlots.used;
      options.push({
        value: "pact",
        label: `Pact Lv ${sheet.pactSlots.level} (${remaining} left)`,
      });
    }
    if (spell.ritual) {
      options.push({ value: "ritual", label: "Ritual (No Slot)" });
    }
    return options;
  };

  // Quick Cast Spell & Slot expenditure (supports regular slots, upcasting, Warlock Pact slots, & Ritual)
  const handleQuickCastSpell = (spell: SpellItemData) => {
    if (!sheet) return;
    let updatedSheet: CharacterSheetData | null = null;
    let castLabelNote = `Level ${spell.level}`;

    if (spell.level > 0) {
      const options = getCastSlotOptions(spell);
      const selectedChoice = castSlotChoiceBySpell[spell.id];
      const chosenOption =
        options.find((o) => o.value === selectedChoice) || options[0];

      if (!chosenOption) {
        const hasAnyConfiguredSlots =
          Object.values(sheet.spellSlots || {}).some((s) => s.total > 0) ||
          Boolean(sheet.pactSlots && sheet.pactSlots.total > 0);
        toast(
          hasAnyConfiguredSlots
            ? `No remaining Level ${spell.level}+ or Pact spell slots available!`
            : `Spell slots are currently 0. Click "Recalculate Slots (5e)" first.`,
          { type: "warning" }
        );
        return;
      }

      if (chosenOption.value === "ritual") {
        castLabelNote = "Ritual";
      } else if (chosenOption.value === "pact" && sheet.pactSlots) {
        castLabelNote = `Pact Lv ${sheet.pactSlots.level}`;
        updatedSheet = {
          ...sheet,
          pactSlots: {
            ...sheet.pactSlots,
            used: Math.min(sheet.pactSlots.total, (sheet.pactSlots.used || 0) + 1),
          },
        };
      } else {
        const slotLvl = parseInt(chosenOption.value, 10) || spell.level;
        const currSlot = sheet.spellSlots?.[slotLvl] || { total: 0, used: 0 };
        castLabelNote = `Lv ${slotLvl} Slot`;
        updatedSheet = {
          ...sheet,
          spellSlots: {
            ...sheet.spellSlots,
            [slotLvl]: {
              ...currSlot,
              used: Math.min(currSlot.total, (currSlot.used || 0) + 1),
            },
          },
        };
      }

      if (updatedSheet && canEdit) {
        applyLocalEdit(updatedSheet);
      }
    }

    // Roll damage or healing or spell attack if present
    if (spell.damageDice) {
      handleRollDice(spell.damageDice, `${spell.name} Damage (${castLabelNote})`);
    } else if (spell.healingDice) {
      handleRollDice(spell.healingDice, `${spell.name} Healing (${castLabelNote})`);
    } else if (spell.isAttack) {
      handleRollDice(`1d20+${spellMetrics.atkMod}`, `${spell.name} Attack (${castLabelNote})`);
    } else {
      setLastRoll({
        formula: spell.name,
        label: `Cast ${spell.name} (${castLabelNote})`,
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
    applyLocalEdit(updated);
  };

  // Dice Roller (integrated with Table Tools drawer & roll log)
  const handleRollDice = (formula: string, label: string) => {
    const res = rollDice(formula, { label });
    setLastRoll({ formula: res.formula, label, result: res.total });
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
            initialClass={(currentUser as any)?.class || "Fighter"}
            initialLevel={(currentUser as any)?.level || 1}
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

          {/* Delete Character */}
          {canEdit && (() => {
            const targetMember = roster.find((r) => r.id === selectedUserId);
            const scribeCount = roster.filter((r) => r.role === "scribe").length;
            const isLastScribe = targetMember?.role === "scribe" && scribeCount <= 1;
            return (
              <button
                type="button"
                disabled={isLastScribe}
                onClick={() => setShowDeleteConfirm(true)}
                className="px-2.5 py-2 rounded-xl bg-stone-800 hover:bg-red-950/60 border border-stone-700 hover:border-red-600/60 text-stone-300 hover:text-red-300 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-30 disabled:cursor-not-allowed"
                title={isLastScribe ? "Cannot delete the last remaining Scribe" : "Delete this character from campaign"}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            );
          })()}

          {/* Save Status & Save Button */}
          {canEdit && (
            <div className="flex items-center gap-2">
              {saveStatus === "dirty" && (
                <span className="text-[11px] font-mono text-amber-300">Auto-saving…</span>
              )}
              {saveStatus === "error" && (
                <span className="text-[11px] font-mono text-rose-400">Save failed</span>
              )}
              <button
                type="button"
                onClick={() => saveSheet()}
                disabled={saving}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow transition ${
                  saveSuccess || saveStatus === "saved"
                    ? "bg-emerald-600 text-white"
                    : saveStatus === "dirty"
                    ? "bg-amber-500 hover:bg-amber-400 text-stone-950 ring-2 ring-amber-400/50"
                    : "bg-amber-600 hover:bg-amber-500 text-stone-950"
                }`}
                title="Save character sheet (Ctrl+S)"
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
            </div>
          )}
        </div>
      </div>

      {/* SHEET SAVE ERROR OR CONFLICT BANNER */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-700/60 text-rose-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => saveSheet()}
            className="px-3 py-1 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-semibold"
          >
            Retry Save
          </button>
        </div>
      )}

      {saveStatus === "conflict" && (
        <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-500/70 text-amber-200 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>This character sheet was updated on another device while you were editing.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (conflictSheet) {
                  setSheet(conflictSheet);
                  setCachedData(`char_sheet_${conflictSheet.userId}`, conflictSheet);
                  lastSyncedAtRef.current = conflictSheet.updatedAt || Date.now();
                  setConflictSheet(null);
                  setSaveStatus("idle");
                  toast("Loaded latest sheet from server.", { type: "info" });
                } else {
                  fetchSheet(selectedUserId);
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold"
            >
              Reload Server Version
            </button>
            <button
              type="button"
              onClick={() => saveSheet(sheet, true)}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold"
            >
              Keep Mine & Overwrite
            </button>
          </div>
        </div>
      )}

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
                          <button
                            type="button"
                            onClick={() =>
                              handleRollDice(
                                `1d20${mod >= 0 ? `+${mod}` : mod}`,
                                `${stat.toUpperCase()} Check`
                              )
                            }
                            className="w-12 text-center font-mono font-bold text-sm text-emerald-300 hover:text-emerald-200 hover:bg-emerald-950/40 rounded py-1 transition"
                            title={`Roll ${stat.toUpperCase()} Check`}
                          >
                            {formatModifier(mod)}
                          </button>
                        </div>

                        {/* Saving Throw Proficiency Dot + Roll Button */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => toggleSaveProf(stat)}
                            className="p-1.5 rounded-lg hover:bg-stone-800 transition"
                            title="Toggle saving throw proficiency"
                          >
                            <span
                              className={`block w-2.5 h-2.5 rounded-full ${
                                isProf ? "bg-amber-400 shadow shadow-amber-500/40" : "bg-stone-600"
                              }`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleRollDice(
                                `1d20${saveMod >= 0 ? `+${saveMod}` : saveMod}`,
                                `${stat.toUpperCase()} Save`
                              )
                            }
                            className={`px-2 py-1 rounded-lg border text-xs font-mono font-bold transition ${
                              isProf
                                ? "bg-amber-600/30 border-amber-500 text-amber-300 hover:bg-amber-600/40"
                                : "bg-stone-800 border-stone-700 text-stone-300 hover:border-amber-500/50 hover:text-amber-200"
                            }`}
                            title={`Roll ${stat.toUpperCase()} Saving Throw`}
                          >
                            {formatModifier(saveMod)}
                          </button>
                        </div>
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
                    <div
                      key={sk.id}
                      className={`p-2 rounded-xl border flex items-center justify-between transition group ${
                        profLevel === 2
                          ? "bg-purple-950/20 border-purple-600/50 hover:border-purple-400"
                          : profLevel === 1
                          ? "bg-emerald-950/20 border-emerald-600/50 hover:border-emerald-400"
                          : "bg-stone-950 border-stone-800 hover:border-stone-600"
                      }`}
                    >
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => cycleSkillProf(sk.id)}
                        className="flex items-center gap-2 min-w-0 text-left"
                        title="Click to cycle proficiency: None -> Proficient -> Expertise"
                      >
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
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleRollDice(
                            `1d20${bonus >= 0 ? `+${bonus}` : bonus}`,
                            `${sk.name} Check`
                          )
                        }
                        className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold border transition flex items-center gap-1 ${
                          profLevel === 2
                            ? "text-purple-300 bg-purple-950/40 border-purple-500/40 hover:bg-purple-900/50"
                            : profLevel === 1
                            ? "text-emerald-300 bg-emerald-950/40 border-emerald-500/40 hover:bg-emerald-900/50"
                            : "text-stone-300 bg-stone-900 border-stone-700 hover:border-amber-500/50 hover:text-amber-200"
                        }`}
                        title={`Roll ${sk.name} (${formatModifier(bonus)})`}
                      >
                        <Dices className="w-3 h-3 opacity-70" />
                        <span>{formatModifier(bonus)}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* LANGUAGES & PROFICIENCIES (Full-width across the 12-col grid) */}
            <div className="lg:col-span-12 p-4 rounded-2xl bg-stone-900 border border-stone-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {(
                [
                  {
                    key: "languages" as const,
                    label: "Languages",
                    items: sheet.languages && sheet.languages.length > 0 ? sheet.languages : ["Common"],
                    placeholder: "Add language...",
                    field: "languages" as const,
                  },
                  {
                    key: "armor" as const,
                    label: "Armor Proficiencies",
                    items: sheet.armorProficiencies || [],
                    placeholder: "Add armor prof...",
                    field: "armorProficiencies" as const,
                  },
                  {
                    key: "weapons" as const,
                    label: "Weapon Proficiencies",
                    items: sheet.weaponProficiencies || [],
                    placeholder: "Add weapon prof...",
                    field: "weaponProficiencies" as const,
                  },
                  {
                    key: "tools" as const,
                    label: "Tool Proficiencies",
                    items: sheet.toolProficiencies || [],
                    placeholder: "Add tool / kit...",
                    field: "toolProficiencies" as const,
                  },
                ] as const
              ).map((group) => (
                <div key={group.key} className="p-3 rounded-xl bg-stone-950 border border-stone-800/80 space-y-2 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                      {group.label}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {group.items.length === 0 ? (
                        <span className="text-stone-500 italic">None</span>
                      ) : (
                        group.items.map((entry, idx) => (
                          <span
                            key={`${entry}-${idx}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-900 border border-stone-700/80 text-stone-200 font-medium"
                          >
                            <span>{entry}</span>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => {
                                  const next = group.items.filter((_, i) => i !== idx);
                                  updateField(group.field, next as any);
                                }}
                                className="text-stone-500 hover:text-red-400 leading-none"
                                title={`Remove ${entry}`}
                              >
                                ×
                              </button>
                            )}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const val = profInputByCategory[group.key].trim();
                        if (!val) return;
                        if (!group.items.some((x) => x.toLowerCase() === val.toLowerCase())) {
                          updateField(group.field, [...group.items, val] as any);
                        }
                        setProfInputByCategory((prev) => ({ ...prev, [group.key]: "" }));
                      }}
                      className="flex gap-1 pt-1"
                    >
                      <input
                        type="text"
                        value={profInputByCategory[group.key]}
                        onChange={(e) =>
                          setProfInputByCategory((prev) => ({ ...prev, [group.key]: e.target.value }))
                        }
                        placeholder={group.placeholder}
                        className="flex-1 min-w-0 px-2 py-1 rounded bg-stone-900 border border-stone-800 text-[11px] text-stone-200 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="submit"
                        className="px-2 py-1 rounded bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-stone-950 border border-amber-600/40 text-[11px] font-bold"
                      >
                        +
                      </button>
                    </form>
                  )}
                </div>
              ))}
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

              <div className="flex items-center gap-3 flex-wrap text-xs">
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
                  <>
                    <button
                      type="button"
                      onClick={handleRecalculateSpellSlots}
                      className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition"
                      title="Recalculate regular and Warlock Pact spell slots using official 5e rules"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Recalculate Slots (5e)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSpellCatalog(true)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold text-xs flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Spell</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Spell Slot Bubbles */}
            {(() => {
              const slotLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9];
              const activeSlotLevels = slotLevels.filter((l) => (sheet.spellSlots?.[l]?.total || 0) > 0);
              const visibleLevels = showAllSpellSlots
                ? slotLevels
                : activeSlotLevels.length > 0
                ? activeSlotLevels
                : [];

              return (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-400">
                      {activeSlotLevels.length > 0
                        ? `Active Spell Slot Levels: ${activeSlotLevels.join(", ")}`
                        : sheet.pactSlots && sheet.pactSlots.total > 0
                        ? "Pact Magic Caster (Warlock Slots below)"
                        : "No standard spell slots configured yet."}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAllSpellSlots(!showAllSpellSlots)}
                      className="text-indigo-300 hover:text-indigo-200 underline"
                    >
                      {showAllSpellSlots ? "Show Active Levels Only" : "Edit All Levels (1–9)"}
                    </button>
                  </div>

                  {activeSlotLevels.length === 0 && !sheet.pactSlots?.total && sheet.spellcastingAbility !== "none" && canEdit && (
                    <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 flex items-center justify-between gap-2 text-xs">
                      <span className="text-amber-200">
                        Your spellcaster has 0 slots stored—click to calculate official 5e slots for your level/class!
                      </span>
                      <button
                        type="button"
                        onClick={handleRecalculateSpellSlots}
                        className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold shrink-0"
                      >
                        Fix 5e Spell Slots
                      </button>
                    </div>
                  )}

                  {visibleLevels.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2.5">
                      {visibleLevels.map((lvl) => {
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
                              <span className="text-stone-500">
                                {slotData.total - slotData.used}/{slotData.total}
                              </span>
                              {canEdit && (
                                <input
                                  type="number"
                                  min={0}
                                  max={6}
                                  value={slotData.total}
                                  onChange={(e) => {
                                    const total = parseInt(e.target.value, 10) || 0;
                                    updateField("spellSlots", {
                                      ...sheet.spellSlots,
                                      [lvl]: { total, used: Math.min(slotData.used, total) },
                                    });
                                  }}
                                  className="w-9 text-center font-mono rounded bg-stone-900 border border-stone-700 text-indigo-300 font-bold"
                                  title="Edit total slots for this level"
                                />
                              )}
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
                  )}
                </div>
              );
            })()}

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
                  {(sheet.spells || []).map((spell) => {
                    const castOptions = getCastSlotOptions(spell);
                    const selectedCastVal = castSlotChoiceBySpell[spell.id] || castOptions[0]?.value || "";
                    return (
                      <div
                        key={spell.id}
                        className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-serif font-bold text-base text-amber-200">
                                {spell.name}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/40">
                                {spell.level === 0 ? "Cantrip" : `Level ${spell.level}`}
                              </span>
                              {spell.concentration && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-700/40 font-bold">
                                  Conc.
                                </span>
                              )}
                              {spell.ritual && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-900/40 text-sky-300 border border-sky-700/40 font-bold">
                                  Ritual
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-stone-400 mt-0.5">
                              {spell.castingTime} • Range: {spell.range} • {spell.duration}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {spell.level > 0 && castOptions.length > 0 && (
                              <select
                                value={selectedCastVal}
                                onChange={(e) =>
                                  setCastSlotChoiceBySpell((prev) => ({
                                    ...prev,
                                    [spell.id]: e.target.value,
                                  }))
                                }
                                className="bg-stone-900 border border-stone-700 rounded-lg px-2 py-1 text-[11px] text-indigo-200 focus:outline-none"
                                title="Choose spell slot level or Pact/Ritual cast"
                              >
                                {castOptions.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            )}
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
                        {(spell.isAttack || spell.saveStat || spell.damageDice || spell.healingDice) && (
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
                            {spell.healingDice && (
                              <span className="font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                <Heart className="w-3 h-3" />
                                {spell.healingDice} Heal
                              </span>
                            )}
                          </div>
                        )}

                        <p className="text-xs text-stone-300 leading-relaxed">
                          {spell.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 5E.TOOLS QUICK LOOKUP DRAWER + INSTANT LOCAL COMPENDIUM */}
          <div className="p-5 rounded-2xl bg-stone-900 border border-sky-600/40 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-sky-200">
                    5e Compendium &amp; 5e.tools Lookup
                  </h2>
                  <p className="text-xs text-stone-400">
                    Search local 5e spells, weapons, armor, packs, tools &amp; feats to add in 1 click, or search 5e.tools directly.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {(["spells", "items", "feats", "bestiary", "classes"] as const).map((cat) => (
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

            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Search local compendium & 5e.tools (e.g. Fireball, Longbow, Resilient, Burglar's Pack)..."
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && lookupQuery.trim()) {
                    const q = encodeURIComponent(lookupQuery.trim());
                    window.open(`https://5e.tools/search.html?q=${q}`, "_blank");
                  }
                }}
                className="flex-1 min-w-[220px] px-3 py-2 rounded-xl bg-black/60 border border-stone-700 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-sky-500 font-sans"
              />
              <button
                type="button"
                onClick={() => {
                  const q = lookupQuery.trim();
                  const url = q
                    ? `https://5e.tools/search.html?q=${encodeURIComponent(q)}`
                    : `https://5e.tools/${lookupCategory}.html`;
                  window.open(url, "_blank");
                }}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{lookupQuery.trim() ? "Search on 5e.tools" : `Open ${lookupCategory} on 5e.tools`}</span>
              </button>
            </div>

            {/* Instant Local Matches */}
            {lookupQuery.trim().length >= 2 && (() => {
              const q = lookupQuery.trim().toLowerCase();
              const matchedSpells = SPELLS_5E.filter((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)).slice(0, 4);
              const matchedWeapons = WEAPONS_5E.filter((w) => w.name.toLowerCase().includes(q)).slice(0, 4);
              const matchedArmor = ARMOR_5E.filter((a) => a.name.toLowerCase().includes(q)).slice(0, 4);
              const matchedGear = [...GEAR_5E, ...PACKS_5E, ...TOOLS_5E].filter((g) => g.name.toLowerCase().includes(q)).slice(0, 4);
              const matchedFeats = FEATS_5E.filter((f) => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)).slice(0, 4);
              const totalMatches = matchedSpells.length + matchedWeapons.length + matchedArmor.length + matchedGear.length + matchedFeats.length;

              return (
                <div className="space-y-2 pt-2 border-t border-stone-800 text-xs">
                  <div className="text-[11px] font-semibold text-sky-300">
                    Instant Local Compendium Matches ({totalMatches})
                  </div>
                  {totalMatches === 0 ? (
                    <p className="text-stone-400">
                      No exact local match for &ldquo;{lookupQuery}&rdquo;—click &ldquo;Search on 5e.tools&rdquo; to view full official results.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {matchedSpells.map((s) => (
                        <div key={`lk-sp-${s.id}`} className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-indigo-300">{s.name} <span className="text-[10px] text-stone-400 font-normal">({s.level === 0 ? "Cantrip" : `Lv ${s.level}`} Spell)</span></div>
                            <p className="text-[11px] text-stone-400 mt-0.5">{s.description}</p>
                          </div>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleAddSpell({ ...s, prepared: true })}
                              className="px-2 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 text-[11px] font-bold shrink-0"
                            >
                              + Spell
                            </button>
                          )}
                        </div>
                      ))}
                      {matchedWeapons.map((w) => (
                        <div key={`lk-wp-${w.id}`} className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-amber-300">{w.name} <span className="text-[10px] text-stone-400 font-normal">({w.damage} {w.damageType} • {w.cost})</span></div>
                            <p className="text-[11px] text-stone-400 mt-0.5">{w.properties.join(", ") || "Standard weapon"}</p>
                          </div>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() =>
                                handleAddItemToInventory({
                                  id: `lk-${w.id}-${Date.now()}`,
                                  name: w.name,
                                  category: "weapon",
                                  quantity: 1,
                                  weight: w.weight,
                                  damage: w.damage,
                                  damageType: w.damageType,
                                  versatileDamage: w.versatileDamage,
                                  properties: w.properties,
                                  range: w.range,
                                })
                              }
                              className="px-2 py-1 rounded bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-stone-950 border border-amber-500/40 text-[11px] font-bold shrink-0"
                            >
                              + Item
                            </button>
                          )}
                        </div>
                      ))}
                      {matchedArmor.map((a) => (
                        <div key={`lk-ar-${a.id}`} className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-blue-300">{a.name} <span className="text-[10px] text-stone-400 font-normal">(AC {a.baseAc}{a.addDex ? "+DEX" : ""} • {a.cost})</span></div>
                            <p className="text-[11px] text-stone-400 mt-0.5">{a.category} armor{a.stealthDisadvantage ? " • Stealth Disadv" : ""}</p>
                          </div>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() =>
                                handleAddItemToInventory({
                                  id: `lk-${a.id}-${Date.now()}`,
                                  name: a.name,
                                  category: a.category === "shield" ? "shield" : "armor",
                                  armorCategory: a.category === "shield" ? undefined : a.category,
                                  quantity: 1,
                                  weight: a.weight,
                                  baseAc: a.baseAc,
                                  maxDexMod: a.maxDexMod,
                                  stealthDisadvantage: a.stealthDisadvantage,
                                })
                              }
                              className="px-2 py-1 rounded bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 text-[11px] font-bold shrink-0"
                            >
                              + Item
                            </button>
                          )}
                        </div>
                      ))}
                      {matchedGear.map((g) => (
                        <div key={`lk-gr-${g.id}`} className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-stone-200">{g.name} <span className="text-[10px] text-stone-400 font-normal">({g.cost})</span></div>
                            <p className="text-[11px] text-stone-400 mt-0.5">{g.description}</p>
                          </div>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() =>
                                handleAddItemToInventory({
                                  id: `lk-${g.id}-${Date.now()}`,
                                  name: g.name,
                                  category: "gear",
                                  quantity: 1,
                                  weight: g.weight,
                                  description: g.description,
                                })
                              }
                              className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-[11px] font-bold shrink-0"
                            >
                              + Item
                            </button>
                          )}
                        </div>
                      ))}
                      {matchedFeats.map((f) => (
                        <div key={`lk-ft-${f.id}`} className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-emerald-300">Feat: {f.name}</div>
                            <p className="text-[11px] text-stone-400 mt-0.5">{f.description}</p>
                          </div>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                const list = [...(sheet.featureList || [])];
                                list.push({
                                  id: `lk-feat-${f.id}-${Date.now()}`,
                                  name: `Feat: ${f.name}`,
                                  source: f.source || "Feat",
                                  level: sheet.level,
                                  description: f.description,
                                });
                                applyLocalEdit({ ...sheet, featureList: list });
                                toast(`Added Feat: ${f.name}`, { type: "success" });
                              }}
                              className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-stone-950 border border-emerald-500/40 text-[11px] font-bold shrink-0"
                            >
                              + Feat
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* FULL-WIDTH CLASS FEATURES, SUBCLASS TRAITS & FEATS */}
          <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-amber-200">
                  Class Features, Subclass Traits &amp; Feats ({(sheet.featureList || []).length})
                </h2>
                <p className="text-xs text-stone-400">
                  Full-width codex of unlocked class, subclass, racial, background, and feat abilities.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={featureSearch}
                  onChange={(e) => setFeatureSearch(e.target.value)}
                  placeholder="Filter features..."
                  className="px-3 py-1.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                />
                <select
                  value={featureSourceFilter}
                  onChange={(e) => setFeatureSourceFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200"
                >
                  <option value="all">All Sources</option>
                  <option value="class">Class Features</option>
                  <option value="feat">Feats</option>
                  <option value="race">Race &amp; Background</option>
                  <option value="custom">Custom</option>
                </select>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setShowAddFeatureForm(!showAddFeatureForm)}
                    className="px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-stone-950 border border-amber-600/40 text-xs font-bold flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Feature</span>
                  </button>
                )}
              </div>
            </div>

            {showAddFeatureForm && canEdit && (
              <div className="p-4 rounded-xl bg-stone-950 border border-amber-500/40 space-y-2.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={newFeatureName}
                    onChange={(e) => setNewFeatureName(e.target.value)}
                    placeholder="Feature or Boon Name..."
                    className="bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-100"
                  />
                  <input
                    type="text"
                    value={newFeatureSource}
                    onChange={(e) => setNewFeatureSource(e.target.value)}
                    placeholder="Source (e.g. Custom / Boon / Class)"
                    className="bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-100"
                  />
                </div>
                <textarea
                  rows={2}
                  value={newFeatureDesc}
                  onChange={(e) => setNewFeatureDesc(e.target.value)}
                  placeholder="Describe the mechanical effect..."
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-100"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddFeatureForm(false)}
                    className="px-3 py-1.5 rounded-lg bg-stone-800 text-stone-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newFeatureName.trim()) return;
                      const list = [...(sheet.featureList || [])];
                      list.push({
                        id: `feat-custom-${Date.now()}`,
                        name: newFeatureName.trim(),
                        source: newFeatureSource.trim() || "Custom",
                        level: sheet.level,
                        description: newFeatureDesc.trim(),
                      });
                      applyLocalEdit({ ...sheet, featureList: list });
                      setNewFeatureName("");
                      setNewFeatureDesc("");
                      setShowAddFeatureForm(false);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold"
                  >
                    Save Feature
                  </button>
                </div>
              </div>
            )}

            {(sheet.featureList || []).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
                {(sheet.featureList || [])
                  .filter((f) => {
                    const q = featureSearch.trim().toLowerCase();
                    if (
                      q &&
                      !f.name.toLowerCase().includes(q) &&
                      !f.source.toLowerCase().includes(q) &&
                      !f.description.toLowerCase().includes(q)
                    ) {
                      return false;
                    }
                    if (featureSourceFilter === "feat") {
                      return f.name.toLowerCase().includes("feat:") || f.source.toLowerCase().includes("asi") || f.source.toLowerCase().includes("feat");
                    }
                    if (featureSourceFilter === "custom") {
                      return f.id.includes("custom") || f.source.toLowerCase().includes("custom") || f.source.toLowerCase().includes("dm");
                    }
                    if (featureSourceFilter === "race") {
                      return f.id.startsWith("racetrait") || f.id.startsWith("subracetrait") || f.id.startsWith("bgfeat");
                    }
                    if (featureSourceFilter === "class") {
                      return f.id.startsWith("feat-") || f.id.startsWith("subfeat-");
                    }
                    return true;
                  })
                  .map((f) => (
                    <div key={f.id} className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 text-xs flex flex-col justify-between gap-2">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <strong className="text-amber-300 font-serif text-sm">{f.name}</strong>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-400">
                              {f.source}
                            </span>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => {
                                  const next = (sheet.featureList || []).filter((x) => x.id !== f.id);
                                  applyLocalEdit({ ...sheet, featureList: next });
                                }}
                                className="text-stone-500 hover:text-red-400 p-0.5"
                                title="Remove feature"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-stone-300 mt-1.5 leading-relaxed">{f.description}</p>
                      </div>
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

          {/* PERSONAL NOTES & CODEX */}
          <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-200">
              Personal Notes &amp; Codex
            </label>
            <textarea
              rows={5}
              disabled={!canEdit}
              value={sheet.notes || ""}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Backstory, campaign bonds, allies, secret goals..."
              className="w-full p-3 rounded-xl bg-stone-950 border border-stone-700 text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-sans leading-relaxed resize-y"
            />
          </div>
        </div>
      )}

      {/* MODALS */}
      {showWizard && (
        <CharacterBuilderWizard
          userId={sheet.userId}
          defaultCharacterName={sheet.character}
          initialClass={sheet.class || (currentUser as any)?.class}
          initialLevel={sheet.level || (currentUser as any)?.level}
          initialRace={sheet.race}
          initialSubclass={sheet.subclass}
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
          defaultClassFilter={(() => {
            const casterCls =
              sheet.classes?.find((c) => {
                const def = CLASSES_5E[c.className];
                return def?.spellcastingType && def.spellcastingType !== "none";
              })?.className || sheet.class;
            const def = CLASSES_5E[casterCls];
            return def?.spellcastingType && def.spellcastingType !== "none" ? casterCls : "all";
          })()}
        />
      )}

      {/* Delete Character Confirmation Modal */}
      <DeleteCharacterModal
        isOpen={showDeleteConfirm && !!sheet}
        onClose={() => setShowDeleteConfirm(false)}
        campaignId={activeCampaign?.id || "starving-vilgeismar"}
        target={
          sheet
            ? {
                id: sheet.userId,
                name: sheet.name,
                character: sheet.character,
                role: roster.find((r) => r.id === sheet.userId)?.role,
              }
            : null
        }
        onDeleted={(result) => {
          const remaining = result.remainingUsers || [];
          setRoster(remaining);
          onRosterUpdated?.(remaining);
          if (remaining.length > 0) {
            setSelectedUserId(remaining[0].id);
          }
        }}
      />
    </div>
  );
}
