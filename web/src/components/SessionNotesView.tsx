"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Calendar,
  BookOpen,
  Edit3,
  Bot,
  RefreshCw,
  Loader2,
  ChevronRight,
  CheckCircle2,
  FileText,
  Plus,
  Upload,
  X,
  AlertCircle,
  EyeOff,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { MarkdownView } from "./MarkdownView";
import { SessionQuickRef } from "./SessionQuickRef";
import { useFeedback } from "./FeedbackContext";
import { applyJournalToBody } from "@/lib/mutationJournal";
import { getCachedData, setCachedData } from "@/lib/cache";
import { extractSessionDateFromMarkdown, filterAndSortSessionNotes } from "@/lib/noteClassification";

interface SessionNoteMeta {
  path: string;
  title: string;
  category: string;
  summary?: string;
  date?: string;
  mtime?: number;
  secret?: boolean;
}

interface SessionNotesViewProps {
  isScribe: boolean;
  onOpenScratchpad: () => void;
  onSelectNote: (path: string) => void;
  onNavigateToWikilink: (target: string) => void;
  initialSessionPath?: string | null;
  refreshKey?: number;
  onOpenReviews?: () => void;
}

function localTodayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function SessionNotesView({
  isScribe,
  onOpenScratchpad,
  onSelectNote,
  onNavigateToWikilink,
  initialSessionPath,
  refreshKey = 0,
  onOpenReviews,
}: SessionNotesViewProps) {
  const { toast } = useFeedback();
  const [sessions, setSessions] = useState<SessionNoteMeta[]>([]);
  const [selectedSessionPath, setSelectedSessionPath] = useState<string | null>(
    initialSessionPath || null
  );
  const [noteContent, setNoteContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  // AI Lore-Master state
  const [aiRunning, setAiRunning] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiTargetDate, setAiTargetDate] = useState<string | null>(null);

  // Direct save confirmation banner
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  // Direct New / Paste Session Note modal state
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerDate, setComposerDate] = useState<string>(localTodayISO());
  const [dateManuallyEdited, setDateManuallyEdited] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [composerRunAi, setComposerRunAi] = useState(true);
  const [composerSecret, setComposerSecret] = useState(false);
  const [composerSaving, setComposerSaving] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [conflictPath, setConflictPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const contentAbortRef = useRef<AbortController | null>(null);
  const contentReqIdRef = useRef(0);

  const fetchSessionList = useCallback(
    async (hasCache = false, forceFresh = false, preferPath?: string | null) => {
      if (!hasCache) setLoading(true);
      setListError(null);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      try {
        const res = await fetch(
          `/api/notes?category=session${forceFresh ? "&fresh=1" : ""}`,
          { signal: controller.signal, cache: "no-store" }
        );
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || `Failed to load session notes (HTTP ${res.status})`);
        }
        const parsed = filterAndSortSessionNotes((data.notes || []) as SessionNoteMeta[]);

        setSessions(parsed);
        setCachedData("session_list_v2", parsed);
        if (parsed.length > 0) {
          setSelectedSessionPath((prev) => {
            if (preferPath && parsed.some((p) => p.path === preferPath)) return preferPath;
            if (prev && parsed.some((p) => p.path === prev)) return prev;
            return parsed[0].path;
          });
        }
      } catch (e: any) {
        const msg =
          e?.name === "AbortError"
            ? "Timed out loading session notes. Please retry."
            : e?.message || "Failed to load session list.";
        console.error("Failed to load session list", e);
        setListError(msg);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    try {
      localStorage.removeItem("dnd_codex_cache_session_list");
    } catch {
      /* ignore */
    }
    const cached = getCachedData<SessionNoteMeta[]>("session_list_v2");
    const filteredCached = cached?.data ? filterAndSortSessionNotes(cached.data) : [];
    if (filteredCached.length > 0 && refreshKey === 0) {
      setSessions(filteredCached);
      setSelectedSessionPath((prev) => {
        if (initialSessionPath && filteredCached.some((p) => p.path === initialSessionPath)) return initialSessionPath;
        if (prev && filteredCached.some((p) => p.path === prev)) return prev;
        return filteredCached[0].path;
      });
      setLoading(false);
      fetchSessionList(true, false, initialSessionPath);
    } else {
      fetchSessionList(false, refreshKey > 0, initialSessionPath);
    }
  }, [fetchSessionList, initialSessionPath, refreshKey]);

  const loadSelectedNoteContent = useCallback(
    async (notePath: string, forceFresh = false) => {
      contentAbortRef.current?.abort();
      const controller = new AbortController();
      contentAbortRef.current = controller;
      const reqId = ++contentReqIdRef.current;

      const cacheKey = `session_note_${notePath}`;
      const cachedNote = !forceFresh ? getCachedData<string>(cacheKey) : null;
      if (cachedNote?.data !== undefined) {
        setNoteContent(applyJournalToBody(notePath, cachedNote.data));
        setContentLoading(false);
      } else {
        setContentLoading(true);
      }
      setContentError(null);

      let timedOut = false;
      const timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, 15000);
      try {
        const res = await fetch(`/api/note?path=${encodeURIComponent(notePath)}&lite=1`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = await res.json();
        if (reqId !== contentReqIdRef.current) return;
        if (!res.ok || !data.success) {
          throw new Error(data.error || `Failed to load note (HTTP ${res.status})`);
        }
        const body = data.note?.body || data.note?.raw || data.content || "";
        setCachedData(cacheKey, body);
        setNoteContent(applyJournalToBody(notePath, body));
      } catch (err: any) {
        if (reqId !== contentReqIdRef.current) return;
        if (err?.name === "AbortError" && !timedOut) return;
        const msg =
          err?.name === "AbortError"
            ? "Timed out loading session note content."
            : err?.message || "Failed loading session note.";
        console.error("Failed loading session note", err);
        setContentError(msg);
      } finally {
        clearTimeout(timeoutId);
        if (reqId === contentReqIdRef.current) {
          setContentLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!selectedSessionPath) return;
    setAiResult(null);
    setAiError(null);
    loadSelectedNoteContent(selectedSessionPath, refreshKey > 0);
    return () => {
      contentAbortRef.current?.abort();
    };
  }, [selectedSessionPath, refreshKey, loadSelectedNoteContent]);

  const runLoreMasterForDate = async (sessionDate: string) => {
    if (!sessionDate || aiRunning) return;
    setAiRunning(true);
    setAiResult(null);
    setAiError(null);
    setAiTargetDate(sessionDate);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    try {
      const res = await fetch("/api/scribe/lore-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: sessionDate }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || `AI Lore-Master failed (HTTP ${res.status})`);
      }
      setAiResult(
        `AI Lore-Master completed for ${sessionDate}! Staged ${data.newCount ?? 0} new notes and ${data.updateCount ?? 0} updates in _Review.`
      );
      try {
        localStorage.removeItem("dnd_codex_cache_scribe_reviews");
      } catch {
        /* ignore */
      }
    } catch (e: any) {
      const msg =
        e?.name === "AbortError"
          ? "AI Lore-Master timed out while analyzing the session. Your session note is saved; click Retry to run AI analysis again."
          : e?.message || "Failed running AI Lore-Master";
      setAiError(msg);
      toast(msg, { type: "error" });
    } finally {
      clearTimeout(timeoutId);
      setAiRunning(false);
    }
  };

  const handleRunAiLoreMaster = async () => {
    if (!selectedSessionPath || aiRunning) return;
    const dateMatch = selectedSessionPath.match(/(\d{4}-\d{2}-\d{2})/);
    const sessionDate = dateMatch ? dateMatch[1] : "";
    if (!sessionDate) {
      toast("Could not identify session date from note path.", { type: "warning" });
      return;
    }
    await runLoreMasterForDate(sessionDate);
  };

  const openComposer = () => {
    setComposerDate(localTodayISO());
    setDateManuallyEdited(false);
    setComposerText("");
    setComposerRunAi(true);
    setComposerSecret(false);
    setComposerError(null);
    setConflictPath(null);
    setIsComposerOpen(true);
  };

  const handleComposerTextChange = (nextText: string) => {
    setComposerText(nextText);
    setConflictPath(null);
    if (!dateManuallyEdited) {
      const detected = extractSessionDateFromMarkdown(nextText);
      if (detected) setComposerDate(detected);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setComposerText(text);
      setConflictPath(null);
      if (!dateManuallyEdited) {
        const detected = extractSessionDateFromMarkdown(text, file.name);
        if (detected) setComposerDate(detected);
      }
    } catch (err: any) {
      setComposerError(err?.message || "Failed to read markdown file.");
    } finally {
      e.target.value = "";
    }
  };

  const handleSaveSessionNote = async (overwrite = false) => {
    if (!composerText.trim() || !composerDate || composerSaving) return;
    setComposerSaving(true);
    setComposerError(null);
    if (!overwrite) setConflictPath(null);

    try {
      const res = await fetch("/api/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          create: true,
          category: "session",
          sessionDate: composerDate,
          title: `Session Notes ${composerDate}`,
          content: composerText,
          secret: composerSecret,
          overwrite,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 409 && data.exists) {
        setConflictPath(data.path || `Notes/Session Notes/Session Notes ${composerDate}.md`);
        return;
      }

      if (!res.ok || !data.success) {
        setComposerError(data.error || `Failed to save session note (HTTP ${res.status})`);
        return;
      }

      try {
        localStorage.removeItem("dnd_codex_cache_session_list");
        localStorage.removeItem("dnd_codex_cache_session_list_v2");
        if (data.path) {
          localStorage.removeItem(`dnd_codex_cache_session_note_${data.path}`);
        }
      } catch {
        /* ignore */
      }

      const savedPath = data.path as string;
      const savedDate = (data.sessionDate as string) || composerDate;
      const shouldRunAi = composerRunAi;

      setIsComposerOpen(false);
      setSavedBanner(`Saved session note to cloud: ${savedPath}`);
      toast(`Session ${savedDate} saved!`, { type: "success" });

      setSelectedSessionPath(savedPath);
      await fetchSessionList(false, true, savedPath);
      await loadSelectedNoteContent(savedPath, true);

      if (shouldRunAi) {
        await runLoreMasterForDate(savedDate);
      }
    } catch (err: any) {
      setComposerError(err?.message || "Network error while saving session note.");
    } finally {
      setComposerSaving(false);
    }
  };

  const activeSessionMeta = sessions.find((s) => s.path === selectedSessionPath);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-fantasy-700/60 gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
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

        <div className="flex items-center gap-2 flex-wrap">
          {isScribe && (
            <button
              type="button"
              onClick={openComposer}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              New / Paste Session Note
            </button>
          )}
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
            onClick={() => fetchSessionList(false, true)}
            className="p-1.5 rounded-lg bg-fantasy-800 text-slate-400 hover:text-slate-200 border border-fantasy-700 transition"
            title="Refresh sessions"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Session Quick Reference Banner */}
      <SessionQuickRef defaultExpanded={false} />

      {/* Direct Save Confirmation */}
      {savedBanner && (
        <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-600/60 text-emerald-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{savedBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSavedBanner(null)}
            className="text-emerald-300/70 hover:text-emerald-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* List Fetch Error */}
      {listError && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-700/60 text-rose-200 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{listError}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchSessionList(false, true)}
            className="px-3 py-1 rounded-lg bg-rose-800/70 hover:bg-rose-700 text-white font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Dual-Pane Layout */}
      {loading && sessions.length === 0 ? (
        <div className="py-24 flex justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="py-20 text-center text-slate-500 space-y-3 bg-fantasy-900/40 rounded-xl border border-fantasy-700 px-4">
          <BookOpen className="w-10 h-10 mx-auto text-slate-600" />
          <p className="font-serif text-slate-300">No session notes found in vault.</p>
          <p className="text-xs text-slate-500">
            Paste an Obsidian session log directly or collate notes from the Live Scratchpad.
          </p>
          {isScribe && (
            <button
              type="button"
              onClick={openComposer}
              className="mt-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 transition shadow"
            >
              <Plus className="w-4 h-4" />
              New / Paste Session Note
            </button>
          )}
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
                        <span>{sess.date || sess.title}</span>
                        {sess.secret && <EyeOff className="w-3 h-3 text-rose-400 flex-shrink-0" />}
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
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-serif font-bold text-lg text-amber-200">
                      {activeSessionMeta.date ? `Session: ${activeSessionMeta.date}` : activeSessionMeta.title}
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] rounded bg-fantasy-800 text-slate-300 border border-fantasy-700 font-mono truncate max-w-full">
                      {activeSessionMeta.path}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Official Obsidian campaign session log
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {isScribe && (
                    <button
                      type="button"
                      onClick={handleRunAiLoreMaster}
                      disabled={aiRunning}
                      className="px-3 py-1.5 rounded-lg bg-fantasy-800 hover:bg-fantasy-700 border border-amber-600/40 text-amber-300 hover:text-amber-200 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition shadow-sm"
                      title="Run AI Lore-Master on this session note to stage entity updates in _Review"
                    >
                      {aiRunning ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Bot className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      {aiRunning ? "Running AI Lore-Master..." : "Run AI Lore-Master"}
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

            {/* AI Running Banner */}
            {aiRunning && (
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/50 text-amber-200 text-xs flex items-center gap-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400 flex-shrink-0" />
                <span>
                  Running AI Lore-Master on {aiTargetDate || "session"}… extracting entities and staging _Review drafts.
                </span>
              </div>
            )}

            {/* AI Status Banner */}
            {aiResult && (
              <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-600/60 text-emerald-200 text-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{aiResult}</span>
                </div>
                {onOpenReviews && (
                  <button
                    type="button"
                    onClick={onOpenReviews}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1 transition"
                  >
                    Open AI Reviews
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* AI Error Banner */}
            {aiError && (
              <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-700/60 text-rose-200 text-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{aiError}</span>
                </div>
                {aiTargetDate && (
                  <button
                    type="button"
                    onClick={() => runLoreMasterForDate(aiTargetDate)}
                    className="px-3 py-1 rounded-lg bg-rose-800/70 hover:bg-rose-700 text-white font-semibold"
                  >
                    Retry AI Lore-Master
                  </button>
                )}
              </div>
            )}

            {/* Content Error Banner */}
            {contentError && (
              <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-700/60 text-rose-200 text-xs flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{contentError}</span>
                </div>
                {selectedSessionPath && (
                  <button
                    type="button"
                    onClick={() => loadSelectedNoteContent(selectedSessionPath, true)}
                    className="px-3 py-1 rounded-lg bg-rose-800/70 hover:bg-rose-700 text-white font-semibold"
                  >
                    Retry
                  </button>
                )}
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

      {/* New / Paste Session Note Modal */}
      {isComposerOpen && (
        <div
          onClick={() => !composerSaving && setIsComposerOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-fantasy-850 border border-fantasy-700 rounded-2xl shadow-2xl overflow-hidden text-slate-200"
          >
            <div className="px-6 py-4 border-b border-fantasy-700 bg-fantasy-900 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-lg text-amber-200 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-400" />
                  New / Paste Session Note
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Paste full Obsidian markdown (including YAML frontmatter) or upload a <code>.md</code> file.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !composerSaving && setIsComposerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-fantasy-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {composerError && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{composerError}</span>
                </div>
              )}

              {conflictPath && (
                <div className="p-3.5 rounded-xl bg-amber-950/50 border border-amber-500/70 text-amber-200 text-xs space-y-2.5">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>A session note already exists at {conflictPath}.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveSessionNote(true)}
                      disabled={composerSaving}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
                    >
                      Overwrite Existing Session Note
                    </button>
                    <button
                      type="button"
                      onClick={() => setConflictPath(null)}
                      className="px-3 py-1.5 rounded-lg bg-fantasy-800 hover:bg-fantasy-700 text-slate-300 text-xs"
                    >
                      Change Date Instead
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Session Date *
                  </label>
                  <input
                    type="date"
                    value={composerDate}
                    onChange={(e) => {
                      setComposerDate(e.target.value);
                      setDateManuallyEdited(true);
                      setConflictPath(null);
                    }}
                    className="px-3 py-2 text-sm bg-fantasy-900 border border-fantasy-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.txt,text/markdown,text/plain"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-lg bg-fantasy-800 hover:bg-fantasy-700 border border-fantasy-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    Upload .md File
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Session Markdown Content *
                </label>
                <textarea
                  rows={14}
                  value={composerText}
                  onChange={(e) => handleComposerTextChange(e.target.value)}
                  placeholder={`Paste your Obsidian session note here (with or without --- frontmatter)...\n\nExample:\n# 📓 Session: ${composerDate}\n\n## 📝 Rapid Fire Notes\n...`}
                  className="w-full p-3 rounded-xl bg-fantasy-900 border border-fantasy-700 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={composerRunAi}
                    onChange={(e) => setComposerRunAi(e.target.checked)}
                    className="rounded border-fantasy-700 text-amber-600 focus:ring-0"
                  />
                  <span>Run AI Lore-Master after saving (stages _Review updates)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={composerSecret}
                    onChange={(e) => setComposerSecret(e.target.checked)}
                    className="rounded border-fantasy-700 text-rose-600 focus:ring-0"
                  />
                  <span className="flex items-center gap-1 text-rose-300">
                    <EyeOff className="w-3.5 h-3.5" /> DM Secret (hide from players)
                  </span>
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-fantasy-700 bg-fantasy-900 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                disabled={composerSaving}
                className="px-4 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveSessionNote(false)}
                disabled={composerSaving || !composerText.trim() || !composerDate}
                className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 flex items-center gap-2 transition disabled:opacity-50 shadow"
              >
                {composerSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {composerSaving ? "Saving to Cloud..." : "Save Session Note"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
