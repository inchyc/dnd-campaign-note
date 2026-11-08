"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, FileText, X, ArrowRight, Loader2, Sparkles } from "lucide-react";

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

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNote: (path: string) => void;
}

const SUGGESTIONS = ["Vaust", "Church", "Lucas", "Marta Kell", "Demire", "The Faces", "Ruik"];

export function GlobalSearchModal({
  isOpen,
  onClose,
  onSelectNote,
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
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((idx) => Math.min(results.length - 1, idx + 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((idx) => Math.max(0, idx - 1));
      }
      if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        onSelectNote(results[selectedIndex].meta.path);
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose, onSelectNote]);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (val.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: val.trim() }),
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
    }, 200);
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-fantasy-850 border border-fantasy-700 rounded-xl shadow-2xl overflow-hidden text-slate-200"
      >
        {/* Search Bar Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-fantasy-700/80 bg-fantasy-900">
          <Search className="w-5 h-5 text-amber-400 mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search characters, factions, locations, rumors, or lore... (Ctrl+K)"
            className="flex-1 bg-transparent border-none text-slate-200 text-sm focus:outline-none placeholder-slate-500"
          />
          {loading && <Loader2 className="w-4 h-4 text-amber-400 animate-spin mr-2" />}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Suggestion Chips when query is empty */}
        {query.trim().length === 0 && (
          <div className="p-4 space-y-2 border-b border-fantasy-700/40">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Suggested Searches
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

        {/* Results list */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
          {query.trim().length >= 2 && results.length === 0 && !loading && (
            <div className="py-12 text-center text-slate-500 text-sm">
              No matching records found in the Vilgeismar archives.
            </div>
          )}

          {results.map((result, idx) => {
            const isSelected = idx === selectedIndex;
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
                    : "hover:bg-fantasy-800 text-slate-300"
                }`}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-semibold text-sm text-amber-200 truncate">
                      {result.meta.title}
                    </span>
                    <span className="px-1.5 py-0.2 text-[10px] uppercase font-semibold rounded bg-fantasy-800 text-slate-400 border border-fantasy-700">
                      {result.meta.category}
                    </span>
                    {result.meta.sub && (
                      <span className="px-1.5 py-0.2 text-[10px] rounded bg-fantasy-900 text-amber-400">
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

        {/* Keyboard hints footer */}
        <div className="px-4 py-2 bg-fantasy-900 border-t border-fantasy-700/60 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
            <span>esc / click outside to close</span>
          </div>
          <span>Vilgeismar Archive Search</span>
        </div>
      </div>
    </div>
  );
}
