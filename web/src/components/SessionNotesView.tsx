"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  BookOpen,
  Edit3,
  Bot,
  RefreshCw,
  Loader2,
  Clock,
  Sparkles,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { MarkdownView } from "./MarkdownView";
import { SessionQuickRef } from "./SessionQuickRef";

interface SessionNoteMeta {
  path: string;
  title: string;
  category: string;
  summary?: string;
  date?: string;
  mtime?: number;
}

interface SessionNotesViewProps {
  isScribe: boolean;
  onOpenScratchpad: () => void;
  onSelectNote: (path: string) => void;
  onNavigateToWikilink: (target: string) => void;
}

export function SessionNotesView({
  isScribe,
  onOpenScratchpad,
  onSelectNote,
  onNavigateToWikilink,
}: SessionNotesViewProps) {
  const [sessions, setSessions] = useState<SessionNoteMeta[]>([]);
  const [selectedSessionPath, setSelectedSessionPath] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [aiRunning, setAiRunning] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  const fetchSessionList = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notes?category=session");
      const data = await res.json();
      if (data.notes) {
        // Filter session notes and extract date
        const parsed = (data.notes as SessionNoteMeta[])
          .filter((n) => !n.path.includes("Notes - Archived") && !n.path.includes(".nomedia"))
          .map((n) => {
            const dateMatch = n.path.match(/(\d{4}-\d{2}-\d{2})/);
            return {
              ...n,
              date: dateMatch ? dateMatch[1] : "",
            };
          })
          .sort((a, b) => {
            if (a.date && b.date) return b.date.localeCompare(a.date);
            return (b.mtime || 0) - (a.mtime || 0);
          });

        setSessions(parsed);
        if (parsed.length > 0 && !selectedSessionPath) {
          setSelectedSessionPath(parsed[0].path);
        }
      }
    } catch (e) {
      console.error("Failed to load session list", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionList();
  }, []);

  useEffect(() => {
    if (!selectedSessionPath) return;

    let cancelled = false;
    setContentLoading(true);
    setAiResult(null);

    fetch(`/api/note?path=${encodeURIComponent(selectedSessionPath)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.content) {
          setNoteContent(data.content);
        }
      })
      .catch((err) => {
        console.error("Failed loading session note", err);
      })
      .finally(() => {
        if (!cancelled) setContentLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSessionPath]);

  const handleRunAiLoreMaster = async () => {
    if (!selectedSessionPath || aiRunning) return;
    const dateMatch = selectedSessionPath.match(/(\d{4}-\d{2}-\d{2})/);
    const sessionDate = dateMatch ? dateMatch[1] : "";
    if (!sessionDate) {
      alert("Could not identify session date from note path.");
      return;
    }

    setAiRunning(true);
    setAiResult(null);

    try {
      const res = await fetch("/api/scribe/lore-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: sessionDate }),
      });
      const data = await res.json();
      if (data.success) {
        setAiResult(
          `AI Lore-Master completed! Staged ${data.newCount || 0} new notes and ${data.updateCount || 0} updates in _Review. Check the 'AI Reviews' tab to approve.`
        );
      } else {
        alert(data.error || "AI Lore-Master failed to run.");
      }
    } catch (e: any) {
      alert(e.message || "Failed running AI Lore-Master");
    } finally {
      setAiRunning(false);
    }
  };

  const activeSessionMeta = sessions.find((s) => s.path === selectedSessionPath);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-fantasy-700/60 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-serif font-bold text-amber-200 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              Session Notes & Campaign Logs
            </h2>
            <span className="px-2 py-0.5 text-xs font-mono rounded bg-fantasy-800 text-amber-300 border border-fantasy-700">
              {sessions.length} Recorded Sessions
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Full chronological archive of all live sessions, rapid-fire observations, and table intel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenScratchpad}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition shadow"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Live Scratchpad
          </button>
          <button
            type="button"
            onClick={fetchSessionList}
            className="p-1.5 rounded-lg bg-fantasy-800 text-slate-400 hover:text-slate-200 border border-fantasy-700 transition"
            title="Refresh sessions"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Session Quick Reference Banner */}
      <SessionQuickRef defaultExpanded={false} />

      {/* Main Dual-Pane Layout */}
      {loading ? (
        <div className="py-24 flex justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="py-20 text-center text-slate-500 space-y-3 bg-fantasy-900/40 rounded-xl border border-fantasy-700">
          <BookOpen className="w-10 h-10 mx-auto text-slate-600" />
          <p className="font-serif text-slate-300">No session notes found in vault.</p>
          <p className="text-xs text-slate-500">
            Collate notes from the Live Scratchpad at the end of a session to generate your first log.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Left Column: Sessions Timeline List */}
          <div className="lg:col-span-1 space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
              Timeline ({sessions.length})
            </span>

            <div className="space-y-1 max-h-[75vh] overflow-y-auto pr-1">
              {sessions.map((sess) => {
                const isSelected = sess.path === selectedSessionPath;
                return (
                  <button
                    key={sess.path}
                    type="button"
                    onClick={() => setSelectedSessionPath(sess.path)}
                    className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between group ${
                      isSelected
                        ? "bg-amber-950/40 border-amber-500 text-amber-200 shadow-md"
                        : "bg-fantasy-850 hover:bg-fantasy-800 border-fantasy-700/80 text-slate-300 hover:text-white"
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-amber-300">
                        <Calendar className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        {sess.date || sess.title}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {sess.summary || sess.title}
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 flex-shrink-0 transition-transform ${
                        isSelected ? "text-amber-400 translate-x-0.5" : "text-slate-600 group-hover:text-slate-400"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Session Note Display */}
          <div className="lg:col-span-3 space-y-4">
            {activeSessionMeta && (
              <div className="p-4 rounded-xl bg-fantasy-850 border border-fantasy-700 flex flex-wrap items-center justify-between gap-3 shadow-md">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-bold text-lg text-amber-200">
                      {activeSessionMeta.date ? `Session: ${activeSessionMeta.date}` : activeSessionMeta.title}
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] rounded bg-fantasy-800 text-slate-300 border border-fantasy-700 font-mono">
                      {activeSessionMeta.path}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Official Obsidian campaign session log
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {isScribe && (
                    <button
                      type="button"
                      onClick={handleRunAiLoreMaster}
                      disabled={aiRunning}
                      className="px-3 py-1.5 rounded-lg bg-fantasy-800 hover:bg-fantasy-700 border border-amber-600/40 text-amber-300 hover:text-amber-200 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition shadow-sm"
                      title="Run AI Lore-Master on this session note to stage entity updates in _Review"
                    >
                      {aiRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5 text-amber-400" />}
                      Run AI Lore-Master
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onSelectNote(activeSessionMeta.path)}
                    className="px-3 py-1.5 rounded-lg bg-fantasy-800 hover:bg-fantasy-700 border border-fantasy-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
                    title="Open in full note editor"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Edit / View Raw
                  </button>
                </div>
              </div>
            )}

            {/* AI Status Banner */}
            {aiResult && (
              <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-600/60 text-emerald-200 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{aiResult}</span>
              </div>
            )}

            {/* Markdown Reader Pane */}
            <div className="p-6 rounded-2xl bg-fantasy-850/80 border border-fantasy-700/80 min-h-[500px] shadow-lg">
              {contentLoading ? (
                <div className="py-24 flex justify-center text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                </div>
              ) : noteContent ? (
                <MarkdownView
                  content={noteContent}
                  filePath={selectedSessionPath || ""}
                  onNavigate={onNavigateToWikilink}
                  readOnly={true}
                />
              ) : (
                <div className="py-20 text-center text-slate-500 text-xs">
                  Note is empty.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
