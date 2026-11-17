"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";

interface NoteSuggestion {
  path: string;
  title: string;
  category: string;
}

let cachedSuggestions: NoteSuggestion[] | null = null;
let fetchPromise: Promise<NoteSuggestion[]> | null = null;

async function loadNoteSuggestions(): Promise<NoteSuggestion[]> {
  if (cachedSuggestions) return cachedSuggestions;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch("/api/notes?archived=all")
    .then((res) => res.json())
    .then((data) => {
      if (data.success && Array.isArray(data.notes)) {
        cachedSuggestions = data.notes.map((n: any) => ({
          path: n.path,
          title: n.title,
          category: n.category,
        }));
        return cachedSuggestions!;
      }
      return [];
    })
    .catch(() => [])
    .finally(() => {
      fetchPromise = null;
    });

  return fetchPromise;
}

interface WikiLinkTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
}

export function WikiLinkTextarea({
  value,
  onChange,
  className = "",
  onKeyDown,
  ...rest
}: WikiLinkTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [notes, setNotes] = useState<NoteSuggestion[]>(cachedSuggestions || []);
  const [triggerRange, setTriggerRange] = useState<{ start: number; end: number; query: string } | null>(
    null
  );
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    loadNoteSuggestions().then((list) => {
      if (list.length > 0) setNotes(list);
    });
  }, []);

  const matches = useMemo(() => {
    if (!triggerRange) return [];
    const q = triggerRange.query.trim().toLowerCase();
    const filtered = q
      ? notes.filter((n) => n.title.toLowerCase().includes(q) || n.category.toLowerCase().includes(q))
      : notes;
    return filtered.slice(0, 8);
  }, [triggerRange, notes]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [triggerRange?.query]);

  const detectTrigger = (text: string, cursorPos: number) => {
    const before = text.slice(0, cursorPos);
    const openIdx = before.lastIndexOf("[[");
    if (openIdx === -1) {
      setTriggerRange(null);
      return;
    }
    const between = before.slice(openIdx + 2);
    if (between.includes("]]") || between.includes("\n")) {
      setTriggerRange(null);
      return;
    }
    setTriggerRange({ start: openIdx, end: cursorPos, query: between });
  };

  const insertLink = (note: NoteSuggestion) => {
    if (!triggerRange) return;
    const before = value.slice(0, triggerRange.start);
    const after = value.slice(triggerRange.end);
    const insertion = `[[${note.title}]]`;
    const nextValue = `${before}${insertion}${after}`;
    onChange(nextValue);
    setTriggerRange(null);

    const nextCursor = before.length + insertion.length;
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(nextCursor, nextCursor);
      }
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    const pos = e.target.selectionStart ?? next.length;
    onChange(next);
    detectTrigger(next, pos);
  };

  const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (triggerRange && matches.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(matches.length - 1, i + 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertLink(matches[selectedIdx]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setTriggerRange(null);
        return;
      }
    }
    onKeyDown?.(e);
  };

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDownInternal}
        onClick={(e) => {
          const pos = (e.target as HTMLTextAreaElement).selectionStart ?? value.length;
          detectTrigger(value, pos);
        }}
        className={className}
        {...rest}
      />

      {triggerRange && matches.length > 0 && (
        <div className="absolute left-0 right-0 bottom-full mb-1.5 z-40 rounded-xl bg-fantasy-850 border border-amber-500/40 shadow-2xl overflow-hidden animate-in fade-in duration-100">
          <div className="px-3 py-1.5 bg-fantasy-900 border-b border-fantasy-700/70 flex items-center justify-between text-[10px] text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-amber-300">
              Link Note [[WikiLink]]
            </span>
            <span>↑↓ select · ↵ insert · esc dismiss</span>
          </div>
          <div className="max-h-48 overflow-y-auto p-1 space-y-0.5">
            {matches.map((m, idx) => {
              const active = idx === selectedIdx;
              return (
                <button
                  key={m.path}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertLink(m);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between gap-2 transition ${
                    active
                      ? "bg-amber-600/25 text-amber-200 border border-amber-500/40"
                      : "text-slate-300 hover:bg-fantasy-800 border border-transparent"
                  }`}
                >
                  <span className="font-serif font-semibold truncate">{m.title}</span>
                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-fantasy-900 text-slate-400 border border-fantasy-700 flex-shrink-0">
                    {m.category}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
