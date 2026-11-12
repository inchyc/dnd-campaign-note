"use client";

import React, { useState } from "react";
import {
  Heart,
  Shield,
  Zap,
  Trash2,
  Plus,
  Sparkles,
  Swords,
  ChevronDown,
  X,
  Check,
} from "lucide-react";
import type { CompanionData } from "@/app/api/character/sheet/route";
import { COMPANION_PRESETS } from "@/data/5e/companions";
import { calcModifier, formatModifier } from "@/data/5e/rulesEngine";

interface CompanionSheetProps {
  companions: CompanionData[];
  activeCompanionId?: string;
  canEdit: boolean;
  onUpdateCompanions: (updated: CompanionData[]) => void;
  onDiceRoll?: (formula: string, label: string) => void;
}

export function CompanionSheet({
  companions,
  activeCompanionId,
  canEdit,
  onUpdateCompanions,
  onDiceRoll,
}: CompanionSheetProps) {
  const [selectedId, setSelectedId] = useState<string>(
    activeCompanionId || companions[0]?.id || ""
  );
  const [showAddModal, setShowAddModal] = useState(false);

  const activeCompanion = companions.find((c) => c.id === selectedId) || companions[0];

  const handleAdjustHp = (delta: number) => {
    if (!activeCompanion || !canEdit) return;
    const next = Math.max(0, Math.min(activeCompanion.hpMax, activeCompanion.hpCurrent + delta));
    const updated = companions.map((c) =>
      c.id === activeCompanion.id ? { ...c, hpCurrent: next } : c
    );
    onUpdateCompanions(updated);
  };

  const handleDeleteCompanion = (id: string) => {
    if (!canEdit) return;
    if (confirm("Are you sure you want to dismiss this companion?")) {
      const updated = companions.filter((c) => c.id !== id);
      onUpdateCompanions(updated);
      if (selectedId === id) {
        setSelectedId(updated[0]?.id || "");
      }
    }
  };

  const handleAddPreset = (presetId: string) => {
    const preset = COMPANION_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    const newCompanion: CompanionData = {
      id: `comp-${Date.now()}`,
      name: preset.name,
      type: preset.type,
      creatureType: preset.creatureType,
      hpCurrent: preset.hpMax,
      hpMax: preset.hpMax,
      ac: preset.ac,
      speed: preset.speed,
      stats: preset.stats,
      attacks: preset.attacks,
      features: preset.features,
      notes: `Added from ${preset.source}.`,
    };

    const updated = [...companions, newCompanion];
    onUpdateCompanions(updated);
    setSelectedId(newCompanion.id);
    setShowAddModal(false);
  };

  if (!activeCompanion) {
    return (
      <div className="p-8 text-center rounded-2xl bg-stone-900/60 border border-stone-800 space-y-4">
        <Sparkles className="w-10 h-10 text-amber-500/40 mx-auto" />
        <div className="space-y-1">
          <h3 className="font-serif font-bold text-lg text-stone-200">
            No Companion or Familiar Active
          </h3>
          <p className="text-xs text-stone-400 max-w-sm mx-auto">
            Classes like Beast Master Ranger, Battle Smith Artificer, Warlock with Pact of the Chain, or any caster with Find Familiar can bind a companion.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs shadow-lg shadow-amber-900/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            + Add Companion / Familiar
          </button>
        )}

        {showAddModal && (
          <AddCompanionModal
            onClose={() => setShowAddModal(false)}
            onSelect={handleAddPreset}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Companion Switcher & Add Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-stone-800">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {companions.map((comp) => (
            <button
              key={comp.id}
              onClick={() => setSelectedId(comp.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-serif transition-colors flex items-center gap-2 ${
                comp.id === activeCompanion.id
                  ? "bg-amber-600/20 border border-amber-500 text-amber-300 font-bold"
                  : "bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200"
              }`}
            >
              <span>{comp.name}</span>
              <span className="text-[10px] opacity-60">({comp.type})</span>
            </button>
          ))}
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-xs text-amber-400 hover:bg-stone-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Another
          </button>
        )}
      </div>

      {/* Active Companion Stat Block */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-stone-950 to-stone-900 border border-amber-500/30 space-y-6 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-serif font-bold text-amber-100">
                {activeCompanion.name}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-stone-800 text-amber-300 uppercase tracking-wider font-mono">
                {activeCompanion.type}
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              {activeCompanion.creatureType} • Speed: {activeCompanion.speed}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* HP Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800">
              <Heart className="w-4 h-4 text-red-500 fill-red-500/20" />
              <div className="font-mono text-sm font-bold text-stone-100">
                {activeCompanion.hpCurrent} / {activeCompanion.hpMax}
              </div>
              {canEdit && (
                <div className="flex items-center gap-1 ml-1">
                  <button
                    onClick={() => handleAdjustHp(-1)}
                    className="w-5 h-5 rounded bg-stone-800 text-stone-300 hover:bg-stone-700 text-xs font-bold"
                  >
                    -
                  </button>
                  <button
                    onClick={() => handleAdjustHp(1)}
                    className="w-5 h-5 rounded bg-stone-800 text-stone-300 hover:bg-stone-700 text-xs font-bold"
                  >
                    +
                  </button>
                </div>
              )}
            </div>

            {/* AC Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800">
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-stone-400">AC</span>
              <span className="font-mono text-sm font-bold text-stone-100">
                {activeCompanion.ac}
              </span>
            </div>

            {/* Dismiss Button */}
            {canEdit && (
              <button
                type="button"
                onClick={() => handleDeleteCompanion(activeCompanion.id)}
                className="p-2 text-stone-500 hover:text-red-400 hover:bg-stone-800 rounded-lg transition-colors"
                title="Dismiss Companion"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 6 Stats Grid */}
        <div className="grid grid-cols-6 gap-2 text-center">
          {(["str", "dex", "con", "int", "wis", "cha"] as const).map((st) => {
            const val = activeCompanion.stats[st] || 10;
            const mod = calcModifier(val);
            return (
              <div
                key={st}
                className="p-2 bg-stone-900/80 rounded-xl border border-stone-800"
              >
                <div className="text-[10px] font-bold uppercase text-stone-400">
                  {st}
                </div>
                <div className="font-mono text-sm font-bold text-stone-100">
                  {val}
                </div>
                <div className="text-[10px] text-amber-400 font-mono">
                  {formatModifier(mod)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Attacks & Actions */}
        {activeCompanion.attacks.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
              <Swords className="w-4 h-4" />
              <span>Actions & Attacks</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeCompanion.attacks.map((atk, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-stone-200">
                      {atk.name}
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                      {atk.atkBonus} to hit
                    </span>
                  </div>
                  <div className="font-mono text-xs text-stone-300">
                    Damage: {atk.damage}
                  </div>
                  {atk.notes && (
                    <div className="text-[11px] text-stone-400 leading-snug">
                      {atk.notes}
                    </div>
                  )}
                  {onDiceRoll && (
                    <button
                      type="button"
                      onClick={() => onDiceRoll(`1d20${atk.atkBonus}`, `${activeCompanion.name}: ${atk.name} Attack`)}
                      className="mt-2 w-full py-1 text-[11px] font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 rounded transition-colors"
                    >
                      Roll Attack
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Special Features Block */}
        {activeCompanion.features && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
              Traits & Special Abilities
            </div>
            <div className="p-3.5 rounded-xl bg-stone-950/80 border border-stone-800/80 text-xs text-stone-300 leading-relaxed whitespace-pre-wrap">
              {activeCompanion.features}
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddCompanionModal
          onClose={() => setShowAddModal(false)}
          onSelect={handleAddPreset}
        />
      )}
    </div>
  );
}

function AddCompanionModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (presetId: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-stone-900 border border-amber-600/40 rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <h3 className="font-serif font-bold text-lg text-amber-100">
            Choose Companion or Familiar
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {COMPANION_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="w-full p-3 rounded-xl bg-stone-950 border border-stone-800 hover:border-amber-500/60 hover:bg-stone-800/40 text-left transition-all space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-sm text-stone-200">
                  {p.name}
                </span>
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-stone-800 text-stone-400">
                  HP {p.hpMax} • AC {p.ac}
                </span>
              </div>
              <p className="text-xs text-stone-400">{p.features.split(".")[0]}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
