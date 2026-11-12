"use client";

import React, { useState, useMemo } from "react";
import { X, Search, Wand2, Plus, Check, Sparkles, BookOpen, Flame, Heart } from "lucide-react";
import { SPELLS_5E, Spell5e } from "@/data/5e/spells";
import type { SpellItemData } from "@/app/api/character/sheet/route";

interface SpellCatalogModalProps {
  onClose: () => void;
  onAddSpell: (spell: SpellItemData) => void;
}

export function SpellCatalogModal({ onClose, onAddSpell }: SpellCatalogModalProps) {
  const [search, setSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<number | "all">("all");
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  const filteredSpells = useMemo(() => {
    return SPELLS_5E.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.school.toLowerCase().includes(search.toLowerCase()) ||
        s.classes.some((c) => c.toLowerCase().includes(search.toLowerCase())) ||
        s.description.toLowerCase().includes(search.toLowerCase());

      const matchLevel = selectedLevel === "all" || s.level === selectedLevel;
      return matchSearch && matchLevel;
    });
  }, [search, selectedLevel]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-stone-900 border border-amber-600/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-950/80 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-serif font-bold text-amber-100">
              5e Spellbook Compendium
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 bg-stone-950 border-b border-stone-800 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search spells by name, school, class, or text (e.g. Fireball, Cure Wounds)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-stone-900 border border-stone-700 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-sans"
              />
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
                All
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
                  className={`px-2 py-1 rounded-lg transition font-mono ${
                    selectedLevel === lvl
                      ? "bg-amber-600 text-stone-950 font-bold"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Spells List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredSpells.map((s) => (
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
                    <span className="text-stone-300">{s.duration}</span>
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

              {/* ACTION STATS PROMINENT HIGHLIGHT */}
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
          ))}
        </div>
      </div>
    </div>
  );
}
