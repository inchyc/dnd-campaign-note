"use client";

import React, { useState, useMemo } from "react";
import { X, Search, Wand2, Plus, Check, Flame, Heart, Sparkles } from "lucide-react";
import { SPELLS_5E, Spell5e } from "@/data/5e/spells";
import type { SpellItemData } from "@/app/api/character/sheet/route";

interface SpellCatalogModalProps {
  onClose: () => void;
  onAddSpell: (spell: SpellItemData) => void;
  defaultClassFilter?: string;
}

const CASTER_CLASSES = [
  "all",
  "Artificer",
  "Bard",
  "Cleric",
  "Druid",
  "Paladin",
  "Ranger",
  "Sorcerer",
  "Warlock",
  "Wizard",
];

const SPELL_SCHOOLS: Spell5e["school"][] = [
  "Evocation",
  "Abjuration",
  "Conjuration",
  "Divination",
  "Enchantment",
  "Illusion",
  "Necromancy",
  "Transmutation",
];

export function SpellCatalogModal({ onClose, onAddSpell, defaultClassFilter = "all" }: SpellCatalogModalProps) {
  const [mode, setMode] = useState<"browse" | "custom">("browse");
  const [search, setSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<number | "all">("all");
  const [classFilter, setClassFilter] = useState<string>(defaultClassFilter);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  // Custom spell form
  const [customName, setCustomName] = useState("");
  const [customLevel, setCustomLevel] = useState(1);
  const [customSchool, setCustomSchool] = useState<Spell5e["school"]>("Evocation");
  const [customCastingTime, setCustomCastingTime] = useState("1 action");
  const [customRange, setCustomRange] = useState("60 feet");
  const [customComponents, setCustomComponents] = useState("V, S");
  const [customDuration, setCustomDuration] = useState("Instantaneous");
  const [customConcentration, setCustomConcentration] = useState(false);
  const [customRitual, setCustomRitual] = useState(false);
  const [customIsAttack, setCustomIsAttack] = useState(false);
  const [customSaveStat, setCustomSaveStat] = useState<"" | "str" | "dex" | "con" | "int" | "wis" | "cha">("");
  const [customDamageDice, setCustomDamageDice] = useState("");
  const [customDamageType, setCustomDamageType] = useState("");
  const [customHealingDice, setCustomHealingDice] = useState("");
  const [customDesc, setCustomDesc] = useState("");

  const filteredSpells = useMemo(() => {
    const q = search.toLowerCase();
    return SPELLS_5E.filter((s) => {
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.school.toLowerCase().includes(q) ||
        s.classes.some((c) => c.toLowerCase().includes(q)) ||
        s.description.toLowerCase().includes(q);
      const matchLevel = selectedLevel === "all" || s.level === selectedLevel;
      const matchClass = classFilter === "all" || s.classes.includes(classFilter);
      return matchSearch && matchLevel && matchClass;
    });
  }, [search, selectedLevel, classFilter]);

  const handleAdd = (s: Spell5e) => {
    const item: SpellItemData = {
      id: `spell-${Date.now()}-${s.id}`,
      name: s.name,
      level: s.level,
      school: s.school,
      castingTime: s.castingTime,
      range: s.range,
      components: s.components,
      duration: s.duration,
      concentration: s.concentration,
      ritual: s.ritual,
      isAttack: s.isAttack,
      saveStat: s.saveStat,
      damageDice: s.damageDice,
      damageType: s.damageType,
      healingDice: s.healingDice,
      description: s.description,
      prepared: true,
    };
    onAddSpell(item);
    setAddedIds((prev) => ({ ...prev, [s.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [s.id]: false }));
    }, 1500);
  };

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    const customItem: SpellItemData = {
      id: `spell-custom-${Date.now()}`,
      name: customName.trim(),
      level: customLevel,
      school: customSchool,
      castingTime: customCastingTime.trim() || "1 action",
      range: customRange.trim() || "60 feet",
      components: customComponents.trim() || "V, S",
      duration: customDuration.trim() || "Instantaneous",
      concentration: customConcentration,
      ritual: customRitual,
      isAttack: customIsAttack || undefined,
      saveStat: customSaveStat || undefined,
      damageDice: customDamageDice.trim() || undefined,
      damageType: customDamageType.trim() || undefined,
      healingDice: customHealingDice.trim() || undefined,
      description: customDesc.trim() || "Custom spell.",
      prepared: true,
    };
    onAddSpell(customItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-stone-900 border border-amber-600/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-950/80 border-b border-stone-800">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-indigo-400" />
              <h2 className="text-xl font-serif font-bold text-amber-100">
                5e Spellbook Compendium ({SPELLS_5E.length} Spells)
              </h2>
            </div>
            <div className="flex rounded-lg bg-stone-900 p-0.5 border border-stone-800 text-xs">
              <button
                type="button"
                onClick={() => setMode("browse")}
                className={`px-3 py-1 rounded-md transition ${
                  mode === "browse" ? "bg-indigo-600 text-white font-bold" : "text-stone-400 hover:text-stone-200"
                }`}
              >
                Browse Catalog
              </button>
              <button
                type="button"
                onClick={() => setMode("custom")}
                className={`px-3 py-1 rounded-md transition flex items-center gap-1 ${
                  mode === "custom" ? "bg-amber-600 text-stone-950 font-bold" : "text-stone-400 hover:text-stone-200"
                }`}
              >
                <Sparkles className="w-3 h-3" /> + Custom Spell
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {mode === "browse" ? (
          <>
            {/* Filters */}
            <div className="p-4 bg-stone-950 border-b border-stone-800 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search spells by name, school, class, or effect (e.g. Fireball, Counterspell, Wish)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-stone-900 border border-stone-700 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-sans"
                  />
                </div>

                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="bg-stone-900 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                >
                  {CASTER_CLASSES.map((c) => (
                    <option key={c} value={c}>
                      {c === "all" ? "All Classes" : `${c} Spells`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex rounded-xl bg-stone-900 p-1 border border-stone-800 text-xs overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setSelectedLevel("all")}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    selectedLevel === "all"
                      ? "bg-amber-600 text-stone-950 font-bold"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  All ({filteredSpells.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLevel(0)}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    selectedLevel === 0
                      ? "bg-amber-600 text-stone-950 font-bold"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  Cantrips
                </button>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSelectedLevel(lvl)}
                    className={`px-2.5 py-1 rounded-lg transition font-mono ${
                      selectedLevel === lvl
                        ? "bg-amber-600 text-stone-950 font-bold"
                        : "text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    Lv {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Spells List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredSpells.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <p className="text-xs text-stone-400">No spells matched your current filters.</p>
                  <button
                    type="button"
                    onClick={() => setMode("custom")}
                    className="px-4 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-stone-950 border border-amber-600/40 text-xs font-bold transition"
                  >
                    + Create Custom Spell
                  </button>
                </div>
              ) : (
                filteredSpells.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2 hover:border-stone-700 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-serif font-bold text-base text-amber-200">
                            {s.name}
                          </h3>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-950/70 border border-indigo-700/50 text-indigo-300">
                            {s.level === 0 ? "Cantrip" : `Level ${s.level}`} • {s.school}
                          </span>
                          {s.concentration && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-700/40">
                              Concentration
                            </span>
                          )}
                          {s.ritual && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-900/40 text-sky-300 border border-sky-700/40">
                              Ritual
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-400 mt-1">
                          Casting: <span className="text-stone-300">{s.castingTime}</span> • Range:{" "}
                          <span className="text-stone-300">{s.range}</span> • Duration:{" "}
                          <span className="text-stone-300">{s.duration}</span> • Classes:{" "}
                          <span className="text-stone-300">{s.classes.join(", ")}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAdd(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                          addedIds[s.id]
                            ? "bg-emerald-600 text-white"
                            : "bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-stone-950 border border-amber-600/40"
                        }`}
                      >
                        {addedIds[s.id] ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> In Spellbook
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" /> Add to Spellbook
                          </>
                        )}
                      </button>
                    </div>

                    {(s.isAttack || s.saveStat || s.damageDice || s.healingDice) && (
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        {s.isAttack && (
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Spell Attack Roll vs AC
                          </span>
                        )}
                        {s.saveStat && (
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase">
                            {s.saveStat} Saving Throw
                          </span>
                        )}
                        {s.damageDice && (
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5" />
                            {s.damageDice} {s.damageType || ""}
                          </span>
                        )}
                        {s.healingDice && (
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                            <Heart className="w-3.5 h-3.5" />
                            {s.healingDice} Healing
                          </span>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-stone-300 leading-relaxed pt-1">
                      {s.description}
                    </p>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-xl mx-auto p-5 rounded-xl bg-stone-950 border border-stone-800 space-y-4 text-xs">
              <h3 className="font-serif font-bold text-base text-amber-200">
                Create Custom / Homebrew Spell
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-stone-400 mb-1">Spell Name *</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Chronal Lance"
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1">Level</label>
                  <select
                    value={customLevel}
                    onChange={(e) => setCustomLevel(parseInt(e.target.value, 10))}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-100"
                  >
                    <option value={0}>Cantrip (0)</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => (
                      <option key={l} value={l}>
                        Level {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-stone-400 mb-1">School</label>
                  <select
                    value={customSchool}
                    onChange={(e) => setCustomSchool(e.target.value as Spell5e["school"])}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-100"
                  >
                    {SPELL_SCHOOLS.map((sch) => (
                      <option key={sch} value={sch}>
                        {sch}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-stone-400 mb-1">Casting Time</label>
                  <input
                    type="text"
                    value={customCastingTime}
                    onChange={(e) => setCustomCastingTime(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1">Range</label>
                  <input
                    type="text"
                    value={customRange}
                    onChange={(e) => setCustomRange(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1">Duration</label>
                  <input
                    type="text"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-stone-400 mb-1">Components</label>
                  <input
                    type="text"
                    value={customComponents}
                    onChange={(e) => setCustomComponents(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1">Damage Dice</label>
                  <input
                    type="text"
                    value={customDamageDice}
                    onChange={(e) => setCustomDamageDice(e.target.value)}
                    placeholder="e.g. 3d8"
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1">Damage Type</label>
                  <input
                    type="text"
                    value={customDamageType}
                    onChange={(e) => setCustomDamageType(e.target.value)}
                    placeholder="e.g. radiant"
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1">Healing Dice</label>
                  <input
                    type="text"
                    value={customHealingDice}
                    onChange={(e) => setCustomHealingDice(e.target.value)}
                    placeholder="e.g. 2d8"
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-100"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-1.5 text-stone-300 cursor-pointer">
                  <input type="checkbox" checked={customConcentration} onChange={(e) => setCustomConcentration(e.target.checked)} />
                  Concentration
                </label>
                <label className="flex items-center gap-1.5 text-stone-300 cursor-pointer">
                  <input type="checkbox" checked={customRitual} onChange={(e) => setCustomRitual(e.target.checked)} />
                  Ritual
                </label>
                <label className="flex items-center gap-1.5 text-stone-300 cursor-pointer">
                  <input type="checkbox" checked={customIsAttack} onChange={(e) => setCustomIsAttack(e.target.checked)} />
                  Spell Attack Roll
                </label>
                <select
                  value={customSaveStat}
                  onChange={(e) => setCustomSaveStat(e.target.value as any)}
                  className="bg-stone-900 border border-stone-700 rounded-lg px-2 py-1 text-stone-200"
                >
                  <option value="">No Save</option>
                  <option value="str">STR Save</option>
                  <option value="dex">DEX Save</option>
                  <option value="con">CON Save</option>
                  <option value="int">INT Save</option>
                  <option value="wis">WIS Save</option>
                  <option value="cha">CHA Save</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-400 mb-1">Spell Description</label>
                <textarea
                  rows={4}
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  placeholder="Describe the spell's exact effects, area, and higher-level scaling..."
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-100"
                />
              </div>

              <button
                type="button"
                onClick={handleAddCustom}
                disabled={!customName.trim()}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-stone-950 font-bold transition shadow-lg shadow-amber-900/30"
              >
                Create & Add to Spellbook
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
