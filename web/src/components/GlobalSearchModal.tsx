"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, X, ArrowRight, Loader2, Sparkles, Command } from "lucide-react";

interface SearchResult {
  meta: {
    path: string;
    title: string;
    category: string;
    sub?: string;
    summary?: string;
  };
  snippet: string;
  score: number;
}

export interface CommandAction {
  id: string;
  label: string;
  hint?: string;
  keywords?: string;
  icon?: React.ReactNode;
  onExecute: () => void;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNote: (path: string) => void;
  actions?: CommandAction[];
}

const SUGGESTIONS = ["Vaust", "Church", "Lucas", "Marta Kell", "Demire", "The Faces", "Ruik"];

export function GlobalSearchModal({
  isOpen,
  onClose,
  onSelectNote,
  actions = [],
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  const filteredActions = useMemo(() => {
    const clean = query.trim().replace(/^>/, "").trim().toLowerCase();
    if (!clean) return actions.slice(0, 6);
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(clean) ||
        (a.hint && a.hint.toLowerCase().includes(clean)) ||
        (a.keywords && a.keywords.toLowerCase().includes(clean))
    );
  }, [actions, query]);

  const totalItems = filteredActions.length + results.length;

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredActions.length, results.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((idx) => (totalItems > 0 ? Math.min(totalItems - 1, idx + 1) : 0));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((idx) => Math.max(0, idx - 1));
      }
      if (e.key === "Enter" && totalItems > 0) {
        e.preventDefault();
        if (selectedIndex < filteredActions.length) {
          const act = filteredActions[selectedIndex];
          if (act) {
            onClose();
            act.onExecute();
          }
        } else {
          const noteIdx = selectedIndex - filteredActions.length;
          const note = results[noteIdx];
          if (note) {
            onSelectNote(note.meta.path);
            onClose();
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, totalItems, selectedIndex, filteredActions, results, onClose, onSelectNote]);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    const trimmed = val.trim();
    if (trimmed.startsWith(">") || trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: trimmed }),
        });
        const data = await res.json();
        if (data.success) {
          setResults(data.results || []);
          setSelectedIndex(0);
        }
      } catch (e) {
        console.error("Search error", e);
      } finally {
        setLoading(false);
      }
    }, 180);
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-fantasy-850 border border-fantasy-700 rounded-2xl shadow-2xl overflow-hidden text-slate-200"
      >
        {/* Search & Command Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-fantasy-700/80 bg-fantasy-900">
          <Search className="w-5 h-5 text-amber-400 mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search notes or run a command (e.g. 'Roll d20', 'New Note')..."
            className="flex-1 bg-transparent border-none text-slate-100 text-sm focus:outline-none placeholder-slate-500"
          />
          {loading && <Loader2 className="w-4 h-4 text-amber-400 animate-spin mr-2" />}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-fantasy-800 transition"
            aria-label="Close command palette"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Suggestion Chips when query is empty */}
        {query.trim().length === 0 && (
          <div className="px-4 py-3 space-y-2 border-b border-fantasy-700/40 bg-fantasy-900/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" /> Suggested Searches
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => handleQueryChange(term)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-fantasy-800 hover:bg-fantasy-700 border border-fantasy-700 text-slate-300 hover:text-amber-300 transition"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Unified Results & Quick Actions */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-3">
          {/* Quick Actions */}
          {filteredActions.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Command className="w-3 h-3 text-amber-400" /> Quick Actions
              </div>
              {filteredActions.map((act, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      act.onExecute();
                    }}
                    className={`w-full px-3 py-2 rounded-lg text-left transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-amber-950/50 border border-amber-500/50 text-amber-100"
                        : "hover:bg-fantasy-800 text-slate-200 border border-transparent"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 text-xs font-semibold">
                      <span className="text-amber-400">{act.icon}</span>
                      <span>{act.label}</span>
                    </span>
                    {act.hint && (
                      <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-fantasy-900 border border-fantasy-700">
                        {act.hint}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Note Search Results */}
          {results.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Archive Notes
              </div>
              {results.map((result, idx) => {
                const globalIdx = filteredActions.length + idx;
                const isSelected = globalIdx === selectedIndex;
                return (
                  <div
                    key={result.meta.path}
                    onClick={() => {
                      onSelectNote(result.meta.path);
                      onClose();
                    }}
                    className={`p-3 rounded-lg cursor-pointer transition flex items-start justify-between gap-3 ${
                      isSelected
                        ? "bg-amber-950/40 border border-amber-600/50 text-amber-100"
                        : "hover:bg-fantasy-800 text-slate-300 border border-transparent"
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-serif font-semibold text-sm text-amber-200 truncate">
                          {result.meta.title}
                        </span>
                        <span className="px-1.5 py-0.5 text-[10px] uppercase font-semibold rounded bg-fantasy-800 text-slate-400 border border-fantasy-700">
                          {result.meta.category}
                        </span>
                        {result.meta.sub && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-fantasy-900 text-amber-400">
                            {result.meta.sub}
                          </span>
                        )}
                      </div>
                      {result.snippet && (
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {result.snippet}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-slate-500 text-xs self-center">
                      <ArrowRight className="w-4 h-4 text-amber-400 opacity-60" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {query.trim().length >= 2 &&
            !query.trim().startsWith(">") &&
            results.length === 0 &&
            filteredActions.length === 0 &&
            !loading && (
              <div className="py-10 text-center text-slate-500 text-sm">
                No matching notes or commands found.
              </div>
            )}
        </div>

        {/* Keyboard hints footer */}
        <div className="px-4 py-2 bg-fantasy-900 border-t border-fantasy-700/60 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>↑↓ navigate</span>
            <span>↵ select</span>
            <span>esc close</span>
          </div>
          <span>Command Palette</span>
        </div>
      </div>
    </div>
  );
}
