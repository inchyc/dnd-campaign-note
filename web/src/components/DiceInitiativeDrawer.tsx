"use client";

import React, { useState } from "react";
import {
  Dices,
  Shield,
  Plus,
  Trash2,
  RotateCcw,
  ChevronRight,
  ExternalLink,
  X,
  Sparkles,
  Heart,
} from "lucide-react";

interface Combatant {
  id: string;
  name: string;
  initiative: number;
  currentHp?: number;
  maxHp?: number;
  isNpc?: boolean;
}

interface DiceInitiativeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  partyMembers: Array<{ character: string; name: string }>;
}

export function DiceInitiativeDrawer({
  isOpen,
  onClose,
  partyMembers,
}: DiceInitiativeDrawerProps) {
  const [activeTab, setActiveTab] = useState<"dice" | "initiative">("dice");

  // Dice Roller State
  const [rollMode, setRollMode] = useState<"normal" | "advantage" | "disadvantage">("normal");
  const [modifier, setModifier] = useState<number>(0);
  const [rollLog, setRollLog] = useState<
    Array<{ id: string; die: string; rolls: number[]; mod: number; total: number; timestamp: string }>
  >([]);

  // Initiative State
  const [combatants, setCombatants] = useState<Combatant[]>(() =>
    partyMembers.map((p, idx) => ({
      id: `pc-${idx}`,
      name: p.character,
      initiative: 10 + Math.floor(Math.random() * 10),
      currentHp: 28,
      maxHp: 28,
      isNpc: false,
    }))
  );
  const [currentTurnIdx, setCurrentTurnIdx] = useState<number>(0);
  const [round, setRound] = useState<number>(1);
  const [newCombatantName, setNewCombatantName] = useState("");
  const [newCombatantInit, setNewCombatantInit] = useState("");
  const [newCombatantHp, setNewCombatantHp] = useState("20");
  const [isNewNpc, setIsNewNpc] = useState(true);

  if (!isOpen) return null;

  const rollDie = (sides: number) => {
    const r1 = Math.floor(Math.random() * sides) + 1;
    const r2 = Math.floor(Math.random() * sides) + 1;
    let chosen = r1;
    let rolls = [r1];

    if (sides === 20 && rollMode === "advantage") {
      chosen = Math.max(r1, r2);
      rolls = [r1, r2];
    } else if (sides === 20 && rollMode === "disadvantage") {
      chosen = Math.min(r1, r2);
      rolls = [r1, r2];
    }

    const total = chosen + modifier;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    setRollLog((prev) => [
      {
        id: Math.random().toString(),
        die: `d${sides}`,
        rolls,
        mod: modifier,
        total,
        timestamp: time,
      },
      ...prev.slice(0, 19),
    ]);
  };

  const handleNextTurn = () => {
    if (combatants.length === 0) return;
    if (currentTurnIdx + 1 >= combatants.length) {
      setCurrentTurnIdx(0);
      setRound((r) => r + 1);
    } else {
      setCurrentTurnIdx((idx) => idx + 1);
    }
  };

  const handleAddCombatant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCombatantName.trim()) return;
    const initVal = parseInt(newCombatantInit, 10) || Math.floor(Math.random() * 20) + 1;
    const hpVal = parseInt(newCombatantHp, 10) || 20;
    const newEntry: Combatant = {
      id: Math.random().toString(),
      name: newCombatantName.trim(),
      initiative: initVal,
      currentHp: hpVal,
      maxHp: hpVal,
      isNpc: isNewNpc,
    };
    const updated = [...combatants, newEntry].sort((a, b) => b.initiative - a.initiative);
    setCombatants(updated);
    setNewCombatantName("");
    setNewCombatantInit("");
    setNewCombatantHp("20");
  };

  const handleDeleteCombatant = (id: string) => {
    setCombatants((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSortInitiative = () => {
    setCombatants((prev) => [...prev].sort((a, b) => b.initiative - a.initiative));
    setCurrentTurnIdx(0);
  };

  const adjustHp = (id: string, delta: number) => {
    setCombatants((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, currentHp: Math.max(0, (c.currentHp ?? (c.maxHp || 30)) + delta) }
          : c
      )
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Clickable Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-y-0 right-0 w-full sm:w-96 bg-fantasy-850 border-l border-fantasy-700 shadow-2xl flex flex-col text-slate-200 animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-fantasy-700 flex items-center justify-between bg-fantasy-900">
          <div className="flex items-center gap-2">
            <Dices className="w-5 h-5 text-amber-400" />
            <h3 className="font-serif font-bold text-base text-amber-200">
              Table Tools
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-fantasy-800 transition"
            title="Close (Esc or click outside)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation tabs */}
        <div className="flex border-b border-fantasy-700 bg-fantasy-900/60 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("dice")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === "dice"
                ? "bg-amber-600 text-slate-950 shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Dice Roller
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("initiative")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === "initiative"
                ? "bg-amber-600 text-slate-950 shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Initiative Tracker
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === "dice" ? (
            /* TAB 1: DICE ROLLER */
            <div className="space-y-4">
              {/* Mode & Modifiers */}
              <div className="p-3 rounded-lg bg-fantasy-900/80 border border-fantasy-700 space-y-2 text-xs">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  d20 Roll Advantage:
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["normal", "advantage", "disadvantage"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setRollMode(mode)}
                      className={`py-1 text-xs capitalize rounded border transition ${
                        rollMode === mode
                          ? "bg-amber-500/20 border-amber-500 text-amber-300 font-semibold"
                          : "bg-fantasy-800 border-fantasy-700 text-slate-400 hover:text-white"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400">Modifier:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setModifier((m) => m - 1)}
                      className="w-6 h-6 rounded bg-fantasy-800 border border-fantasy-700 flex items-center justify-center text-slate-300 hover:text-white"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-mono font-bold text-amber-300 text-sm">
                      {modifier >= 0 ? `+${modifier}` : modifier}
                    </span>
                    <button
                      type="button"
                      onClick={() => setModifier((m) => m + 1)}
                      className="w-6 h-6 rounded bg-fantasy-800 border border-fantasy-700 flex items-center justify-center text-slate-300 hover:text-white"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Die Grid */}
              <div className="grid grid-cols-4 gap-2">
                {[4, 6, 8, 10, 12, 20, 100].map((sides) => (
                  <button
                    key={sides}
                    type="button"
                    onClick={() => rollDie(sides)}
                    className={`p-3 rounded-lg border font-serif font-bold text-base shadow transition hover:scale-105 active:scale-95 ${
                      sides === 20
                        ? "bg-amber-600/30 border-amber-500/70 text-amber-200 hover:bg-amber-600/40"
                        : "bg-fantasy-800 border-fantasy-700 text-slate-200 hover:bg-fantasy-700"
                    }`}
                  >
                    d{sides}
                  </button>
                ))}
              </div>

              {/* Roll History */}
              <div className="space-y-2 pt-2 border-t border-fantasy-700/60">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Roll History
                </span>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {rollLog.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2 text-center">No rolls yet.</p>
                  ) : (
                    rollLog.map((log) => (
                      <div
                        key={log.id}
                        className="p-2 rounded bg-fantasy-900 border border-fantasy-700/60 flex items-center justify-between text-xs font-mono"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-amber-400 font-bold">{log.die}</span>
                          {log.rolls.length > 1 && (
                            <span className="text-slate-500 text-[10px]">
                              [{log.rolls.join(", ")}]
                            </span>
                          )}
                          {log.mod !== 0 && (
                            <span className="text-slate-400 text-[10px]">
                              {log.mod > 0 ? `+${log.mod}` : log.mod}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-bold text-amber-200 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                          = {log.total}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: INITIATIVE TRACKER */
            <div className="space-y-4">
              <div className="flex items-center justify-between p-2 rounded bg-fantasy-900 border border-fantasy-700 text-xs">
                <span className="font-semibold text-amber-300">Round {round}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSortInitiative}
                    className="px-2 py-1 text-[11px] rounded bg-fantasy-800 hover:bg-fantasy-700 border border-fantasy-700"
                  >
                    Sort High-Low
                  </button>
                  <button
                    type="button"
                    onClick={handleNextTurn}
                    className="px-2.5 py-1 text-[11px] font-bold rounded bg-amber-600 hover:bg-amber-500 text-slate-950 flex items-center gap-1"
                  >
                    Next Turn <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Combatants List */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {combatants.map((c, idx) => {
                  const isCurrent = idx === currentTurnIdx;
                  return (
                    <div
                      key={c.id}
                      className={`p-2.5 rounded-lg border space-y-1.5 transition ${
                        isCurrent
                          ? "bg-amber-950/40 border-amber-500 shadow"
                          : "bg-fantasy-900 border-fantasy-700/60"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-xs ${
                              isCurrent
                                ? "bg-amber-500 text-slate-950"
                                : "bg-fantasy-800 text-slate-400"
                            }`}
                          >
                            {c.initiative}
                          </span>
                          <span className={`font-semibold ${c.isNpc ? "text-rose-300" : "text-amber-200"}`}>
                            {c.name} {c.isNpc ? "(NPC/Enemy)" : ""}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteCombatant(c.id)}
                          className="p-1 text-slate-500 hover:text-rose-400"
                          title="Remove combatant"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* HP Bar & Quick Adjustment */}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-fantasy-700/40">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                          <span className="font-mono font-bold text-slate-200">
                            {c.currentHp ?? 30}
                          </span>
                          <span className="text-[10px] text-slate-500">HP</span>
                        </div>

                        <div className="flex items-center gap-1 font-mono text-[10px]">
                          <button
                            type="button"
                            onClick={() => adjustHp(c.id, -5)}
                            className="px-1.5 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 font-bold"
                            title="-5 HP"
                          >
                            -5
                          </button>
                          <button
                            type="button"
                            onClick={() => adjustHp(c.id, -1)}
                            className="px-1 py-0.5 rounded bg-fantasy-800 hover:bg-fantasy-700 text-slate-300 border border-fantasy-700"
                            title="-1 HP"
                          >
                            -1
                          </button>
                          <button
                            type="button"
                            onClick={() => adjustHp(c.id, 1)}
                            className="px-1 py-0.5 rounded bg-fantasy-800 hover:bg-fantasy-700 text-slate-300 border border-fantasy-700"
                            title="+1 HP"
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            onClick={() => adjustHp(c.id, 5)}
                            className="px-1.5 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 font-bold"
                            title="+5 HP"
                          >
                            +5
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Combatant Form */}
              <form onSubmit={handleAddCombatant} className="space-y-2 p-2.5 rounded bg-fantasy-900 border border-fantasy-700 text-xs">
                <span className="font-semibold text-slate-400 text-[10px] uppercase">
                  Add Combatant / Monster
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCombatantName}
                    onChange={(e) => setNewCombatantName(e.target.value)}
                    placeholder="Name (e.g. Cultist)..."
                    className="flex-1 px-2.5 py-1 text-xs bg-fantasy-850 border border-fantasy-700 rounded text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="number"
                    value={newCombatantInit}
                    onChange={(e) => setNewCombatantInit(e.target.value)}
                    placeholder="Init"
                    className="w-12 px-1.5 py-1 text-xs bg-fantasy-850 border border-fantasy-700 rounded text-slate-200 text-center focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="number"
                    value={newCombatantHp}
                    onChange={(e) => setNewCombatantHp(e.target.value)}
                    placeholder="HP"
                    className="w-12 px-1.5 py-1 text-xs bg-fantasy-850 border border-fantasy-700 rounded text-slate-200 text-center focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isNewNpc}
                      onChange={(e) => setIsNewNpc(e.target.checked)}
                      className="rounded border-fantasy-700 text-amber-600 focus:ring-0"
                    />
                    <span>Mark as Enemy / NPC</span>
                  </label>
                  <button
                    type="submit"
                    disabled={!newCombatantName.trim()}
                    className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 5e.tools Quick Link */}
          <div className="pt-4 border-t border-fantasy-700/60">
            <a
              href="https://5e.tools"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 rounded-lg bg-fantasy-900 hover:bg-fantasy-800 border border-fantasy-700 text-xs text-amber-300 font-medium flex items-center justify-center gap-2 transition shadow group"
            >
              <ExternalLink className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Open 5e.tools (Spells, Rules, Bestiary)</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
