"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Plus,
  Trash2,
  Tag,
} from "lucide-react";

interface RosterMember {
  player: string;
  character: string;
  role?: string;
}

interface CustomAlias {
  id: string;
  title: string;
  alias: string;
}

interface SessionQuickRefProps {
  onInsertText?: (text: string) => void;
  defaultExpanded?: boolean;
}

const DEFAULT_PARTY_ROSTER: RosterMember[] = [
  { player: "Chris", character: "Vex", role: "Scribe / DM" },
  { player: "Travis", character: "Cedric", role: "Paladin" },
  { player: "Johno", character: "Colm", role: "Fighter" },
  { player: "Jess", character: "Vola", role: "Barbarian" },
  { player: "Damon", character: "Everan", role: "Ranger" },
  { player: "Vik", character: "Aewren", role: "Rogue" },
  { player: "Jake", character: "Ruik", role: "Warlock" },
];

const DEFAULT_KEY_ENTITIES: Array<{ title: string; alias: string }> = [
  { title: "Cat Demi-God", alias: "Demire" },
  { title: "Monkey Captain", alias: "Glutenboss" },
  { title: "Treasure Finder", alias: "Nub Nub, The Collector" },
  { title: "Boats Name", alias: "The Eternal Wake" },
  { title: "Prince of Elves", alias: "Prince Kaleen" },
  { title: "Elven Queen", alias: "The Queen (Vain, quartz nails)" },
  { title: "City Guard Captain", alias: "Roddrick" },
  { title: "Shadow Familiar", alias: "Shadow Weasel / Shadow Noodle" },
  { title: "Missing Queen Sorcerous", alias: "Elyndra" },
  { title: "Elven King", alias: "King Valefare the Winter Crowned" },
];

const STORAGE_KEY = "dnd_session_quickref_custom";

export function SessionQuickRef({ onInsertText, defaultExpanded = true }: SessionQuickRefProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [customEntities, setCustomEntities] = useState<CustomAlias[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newAlias, setNewAlias] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCustomEntities(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleCopyOrInsert = (label: string, value: string, id: string) => {
    const textToUse = `${value}`;
    if (onInsertText) {
      onInsertText(textToUse);
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(textToUse);
    }
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAlias.trim()) return;
    const next = [
      ...customEntities,
      { id: "custom-" + Date.now(), title: newTitle.trim(), alias: newAlias.trim() },
    ];
    setCustomEntities(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setNewTitle("");
    setNewAlias("");
    setIsAdding(false);
  };

  const handleDeleteCustom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = customEntities.filter((c) => c.id !== id);
    setCustomEntities(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const allEntities = [
    ...DEFAULT_KEY_ENTITIES.map((e, i) => ({ id: `default-${i}`, ...e, isCustom: false })),
    ...customEntities.map((e) => ({ ...e, isCustom: true })),
  ];

  return (
    <div className="rounded-xl border border-amber-600/30 bg-fantasy-900/90 shadow-md overflow-hidden transition-all duration-200">
      {/* Header Bar / Toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2.5 bg-fantasy-850 hover:bg-fantasy-800/80 border-b border-fantasy-700/60 flex items-center justify-between text-left transition"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="font-serif font-bold text-xs sm:text-sm text-amber-200">
            Session Quick Reference
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            (Party Roster & Key Entities • Click any chip to copy/insert)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
            {DEFAULT_PARTY_ROSTER.length} Players • {allEntities.length} Entities
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="p-3.5 space-y-3.5 text-xs">
          {/* Party Roster */}
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5 mb-1.5">
              <Users className="w-3 h-3 text-amber-400" />
              Party Roster (Player ↔ Character)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_PARTY_ROSTER.map((m) => {
                const key = `roster-${m.player}`;
                const isCopied = copiedKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleCopyOrInsert(m.player, m.character, key)}
                    title={`Click to copy ${m.character} (Played by ${m.player})`}
                    className={`px-2.5 py-1 rounded-lg border text-xs flex items-center gap-1.5 transition ${
                      isCopied
                        ? "bg-emerald-950/80 border-emerald-500 text-emerald-200 scale-95"
                        : "bg-fantasy-850 hover:bg-fantasy-800 border-fantasy-700 text-slate-300 hover:text-white"
                    }`}
                  >
                    <span className="text-slate-400 text-[11px]">{m.player} =</span>
                    <span className="font-semibold text-amber-300">{m.character}</span>
                    {isCopied ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-2.5 h-2.5 text-slate-500 group-hover:text-slate-300" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Key Entities & NPCs */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                <Tag className="w-3 h-3 text-amber-400" />
                Active Session Entities & NPCs
              </div>
              <button
                type="button"
                onClick={() => setIsAdding(!isAdding)}
                className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> {isAdding ? "Cancel" : "Add Entity"}
              </button>
            </div>

            {isAdding && (
              <form onSubmit={handleAddCustom} className="mb-2 p-2 rounded-lg bg-fantasy-850 border border-amber-600/40 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Role / Title (e.g. Guard)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="flex-1 px-2 py-1 text-xs bg-fantasy-900 border border-fantasy-700 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <span className="text-slate-400">=</span>
                <input
                  type="text"
                  placeholder="Name (e.g. Captain Bob)"
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  className="flex-1 px-2 py-1 text-xs bg-fantasy-900 border border-fantasy-700 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-600 hover:bg-amber-500 text-slate-950 transition"
                >
                  Save
                </button>
              </form>
            )}

            <div className="flex flex-wrap gap-1.5">
              {allEntities.map((ent) => {
                const isCopied = copiedKey === ent.id;
                return (
                  <div
                    key={ent.id}
                    onClick={() => handleCopyOrInsert(ent.title, ent.alias, ent.id)}
                    title={`Click to copy: ${ent.alias}`}
                    className={`cursor-pointer px-2.5 py-1 rounded-lg border text-xs flex items-center gap-1.5 transition ${
                      isCopied
                        ? "bg-emerald-950/80 border-emerald-500 text-emerald-200 scale-95"
                        : "bg-fantasy-850 hover:bg-fantasy-800 border-fantasy-700 text-slate-300 hover:text-white"
                    }`}
                  >
                    <span className="text-slate-400 text-[11px]">{ent.title} =</span>
                    <span className="font-semibold text-amber-300">{ent.alias}</span>
                    {ent.isCustom && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCustom(ent.id, e)}
                        className="ml-1 text-slate-500 hover:text-rose-400 transition"
                        title="Delete custom alias"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                    {isCopied ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-2.5 h-2.5 text-slate-500" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
