"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Edit3,
  Users,
  Eye,
  EyeOff,
  Trash2,
  Send,
  Sparkles,
  Bot,
  RefreshCw,
  Info,
  Calendar,
  CheckCircle2,
  Loader2,
  Clock,
  Copy,
  Check,
  Download,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { SessionQuickRef } from "./SessionQuickRef";
import { WikiLinkTextarea } from "./WikiLinkTextarea";
import { useFeedback } from "./FeedbackContext";
import { getCachedData, setCachedData } from "@/lib/cache";

interface ScratchLine {
  id: string;
  time: string;
  text: string;
  shared: boolean;
  at: number;
  author?: string;
  authorId?: string;
  pending?: boolean;
  session?: string;
}

interface ScratchpadViewProps {
  isScribe: boolean;
  currentUser: { id: string; name: string; character: string; role: "scribe" | "player" } | null;
  onOpenSession?: (path: string) => void;
  onOpenReviews?: () => void;
}

const DRAFT_KEY = "dnd_scratchpad_draft";
const PENDING_KEY = "dnd_scratchpad_pending";

function loadPendingLines(): ScratchLine[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as ScratchLine[]) : [];
  } catch {
    return [];
  }
}

function savePendingLines(lines: ScratchLine[]) {
  try {
    if (typeof window === "undefined") return;
    if (lines.length === 0) localStorage.removeItem(PENDING_KEY);
    else localStorage.setItem(PENDING_KEY, JSON.stringify(lines));
  } catch {
    /* ignore */
  }
}

function getCharacterStyle(author?: string) {
  const a = (author || "").toLowerCase();
  if (a.includes("vex")) return { border: "border-amber-500/60", bg: "bg-amber-950/30", text: "text-amber-300", chip: "bg-amber-500 text-slate-950" };
  if (a.includes("cedric")) return { border: "border-rose-500/60", bg: "bg-rose-950/30", text: "text-rose-300", chip: "bg-rose-600 text-white" };
  if (a.includes("colm")) return { border: "border-emerald-500/60", bg: "bg-emerald-950/30", text: "text-emerald-300", chip: "bg-emerald-600 text-white" };
  if (a.includes("vola")) return { border: "border-orange-500/60", bg: "bg-orange-950/30", text: "text-orange-300", chip: "bg-orange-600 text-white" };
  if (a.includes("erevan") || a.includes("everan")) return { border: "border-purple-500/60", bg: "bg-purple-950/30", text: "text-purple-300", chip: "bg-purple-600 text-white" };
  if (a.includes("aewren")) return { border: "border-sky-500/60", bg: "bg-sky-950/30", text: "text-sky-300", chip: "bg-sky-600 text-white" };
  if (a.includes("ruik")) return { border: "border-slate-500/60", bg: "bg-slate-800/80", text: "text-slate-200", chip: "bg-slate-700 text-white" };
  return { border: "border-fantasy-700", bg: "bg-fantasy-850", text: "text-amber-300", chip: "bg-fantasy-700 text-slate-300" };
}

export function ScratchpadView({
  isScribe,
  currentUser,
  onOpenSession,
  onOpenReviews,
}: ScratchpadViewProps) {
  const { toast } = useFeedback();
  const [activeTab, setActiveTab] = useState<"mine" | "table">("mine");
  const [sessionDate, setSessionDate] = useState<string>("");
  const [myLines, setMyLines] = useState<ScratchLine[]>([]);
  const [tableLines, setTableLines] = useState<ScratchLine[]>([]);
  const [newNoteText, setNewNoteText] = useState("");
  const [shareImmediately, setShareImmediately] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [retryingSync, setRetryingSync] = useState(false);

  // Restore saved tab and unsent draft on mount
  useEffect(() => {
    try {
      const savedTab = localStorage.getItem("dnd_scratchpad_tab");
      if (savedTab === "mine" || savedTab === "table") {
        setActiveTab(savedTab);
      }
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) setNewNoteText(savedDraft);
    } catch {
      // ignore
    }
  }, []);

  const handleDraftChange = (val: string) => {
    setNewNoteText(val);
    try {
      if (val) localStorage.setItem(DRAFT_KEY, val);
      else localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  };

  const handleTabChange = (tab: "mine" | "table") => {
    setActiveTab(tab);
    try {
      localStorage.setItem("dnd_scratchpad_tab", tab);
    } catch {
      // ignore
    }
  };

  const handleCopyText = (id: string, text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInsertFromQuickRef = (text: string) => {
    handleDraftChange(
      !newNoteText.trim() ? text + ": " : newNoteText.trimEnd() + " " + text + " "
    );
  };

  // Scribe collation state (two-step decoupled)
  const [collateDate, setCollateDate] = useState("");
  const collateDateManualRef = useRef(false);
  const [runAiLoreMaster, setRunAiLoreMaster] = useState(true);
  const [collating, setCollating] = useState(false);
  const [collateResult, setCollateResult] = useState<string | null>(null);
  const [collateError, setCollateError] = useState<string | null>(null);
  const [collatedPath, setCollatedPath] = useState<string | null>(null);
  const [aiRunning, setAiRunning] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Scribe session date changer
  const [isEditingSessionDate, setIsEditingSessionDate] = useState(false);
  const [targetSessionDate, setTargetSessionDate] = useState("");

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleSetSessionDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSessionDate || !isScribe) return;
    try {
      const res = await fetch("/api/scribe/collate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: targetSessionDate }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSessionDate(targetSessionDate);
        collateDateManualRef.current = false;
        setCollateDate(targetSessionDate);
        setIsEditingSessionDate(false);
        showStatus(`Active session updated to ${targetSessionDate}`);
        fetchScratchpad();
      } else {
        toast(data.error || "Failed to update session date", { type: "error" });
      }
    } catch (err: any) {
      toast(err.message || "Failed to update session date", { type: "error" });
    }
  };

  const handleExportMarkdown = (downloadFile = false) => {
    const linesToExport = activeTab === "mine" ? myLines : tableLines;
    const title = activeTab === "mine" ? `Scratchpad - ${currentUser?.character || "Player"}` : "Shared Table Feed";
    const content =
      `# 📓 ${title} (Session: ${sessionDate || "Active"})\n\n` +
      linesToExport
        .map((l) => `- [${l.time}] ${l.author ? `(${l.author}) ` : ""}${l.text}`)
        .join("\n\n");

    if (downloadFile) {
      const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Scratchpad_${sessionDate || "session"}_${activeTab}.md`;
      a.click();
      URL.revokeObjectURL(url);
      showStatus("Downloaded scratchpad markdown file!");
    } else {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(content);
        showStatus("Copied all scratchpad notes to clipboard!");
      }
    }
  };

  const fetchScratchpad = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch("/api/scratch", {
        signal: controller.signal,
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (res.status === 401) {
          setSyncError("Session expired — please sign in again so your notes can sync to the cloud.");
        }
        return;
      }

      setSessionDate(data.session);
      if (!collateDateManualRef.current) {
        setCollateDate(data.session);
      }

      const serverMine = (data.mine || []).slice().sort((a: ScratchLine, b: ScratchLine) => b.at - a.at);
      const serverShared = (data.shared || []).slice().sort((a: ScratchLine, b: ScratchLine) => b.at - a.at);

      // Merge any unsynced local pending lines so polling never erases them
      const pendingAll = loadPendingLines();
      const pendingForSession = pendingAll.filter(
        (p) => (!p.session || p.session === data.session) && !serverMine.some((s: ScratchLine) => s.id === p.id)
      );
      const mergedMine = [...pendingForSession, ...serverMine].sort((a, b) => b.at - a.at);
      const pendingShared = pendingForSession.filter((p) => p.shared);
      const mergedShared = [...pendingShared, ...serverShared].sort((a, b) => b.at - a.at);

      setMyLines(mergedMine);
      setTableLines(mergedShared);
      setCachedData("scratchpad_state", {
        session: data.session,
        mine: mergedMine,
        shared: mergedShared,
      });
    } catch (e) {
      console.error("Failed to load scratchpad", e);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = getCachedData<{ session: string; mine: ScratchLine[]; shared: ScratchLine[] }>("scratchpad_state");
    if (cached?.data) {
      if (cached.data.session) {
        setSessionDate(cached.data.session);
        if (!collateDateManualRef.current) {
          setCollateDate(cached.data.session);
        }
      }
      setMyLines(cached.data.mine || []);
      setTableLines(cached.data.shared || []);
      setLoading(false);
    }
    fetchScratchpad();
    const interval = setInterval(fetchScratchpad, 10000);
    return () => clearInterval(interval);
  }, [fetchScratchpad]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const textToSave = newNoteText.trim();
    if (!textToSave || submitting) return;

    setSubmitting(true);
    setSyncError(null);
    const optimisticId = "local-" + Date.now();
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const optimisticLine: ScratchLine = {
      id: optimisticId,
      time: nowTime,
      text: textToSave,
      shared: shareImmediately,
      at: Date.now(),
      author: currentUser ? `${currentUser.name} (${currentUser.character})` : undefined,
      authorId: currentUser?.id,
      pending: true,
      session: sessionDate || undefined,
    };

    if (!shareImmediately && activeTab === "table") {
      handleTabChange("mine");
    }

    // Persist locally as pending immediately so a refresh/poll never loses it
    const currentPending = loadPendingLines();
    savePendingLines([optimisticLine, ...currentPending]);

    setMyLines((prev) => [optimisticLine, ...prev]);
    if (shareImmediately) {
      setTableLines((prev) => [optimisticLine, ...prev]);
    }
    handleDraftChange("");

    try {
      const res = await fetch("/api/scratch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSave,
          shared: shareImmediately,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.line) {
        savePendingLines(loadPendingLines().filter((p) => p.id !== optimisticId));
        setMyLines((prev) => prev.map((l) => (l.id === optimisticId ? data.line : l)));
        if (shareImmediately) {
          setTableLines((prev) =>
            prev.map((l) =>
              l.id === optimisticId
                ? {
                    ...data.line,
                    author: currentUser ? `${currentUser.name} (${currentUser.character})` : undefined,
                    authorId: currentUser?.id,
                  }
                : l
            )
          );
        }
        showStatus(`Note saved to cloud (${data.session || sessionDate || "active session"})!`);
      } else {
        const msg =
          res.status === 401
            ? "Your sign-in session expired. Note is preserved locally — sign back in or click Retry Sync."
            : data.error || `Cloud sync failed (HTTP ${res.status}). Note kept safely in pending queue.`;
        setSyncError(msg);
        toast(msg, { type: "error" });
      }
    } catch (e: any) {
      const msg = "Network offline — note kept safely in local pending queue. Click Retry Sync when reconnected.";
      console.warn("Scratchpad network sync fallback:", e);
      setSyncError(msg);
      toast(msg, { type: "warning" });
    } finally {
      setSubmitting(false);
    }
  };

  const retryPendingSync = async () => {
    const pending = loadPendingLines();
    if (pending.length === 0 || retryingSync) return;
    setRetryingSync(true);
    setSyncError(null);

    const remaining: ScratchLine[] = [];
    let syncedCount = 0;

    for (const item of pending) {
      try {
        const res = await fetch("/api/scratch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: item.text, shared: item.shared }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          syncedCount++;
        } else {
          remaining.push(item);
          if (res.status === 401) {
            setSyncError("Session expired — please sign out and sign back in to sync pending notes.");
          }
        }
      } catch {
        remaining.push(item);
      }
    }

    savePendingLines(remaining);
    if (remaining.length === 0) {
      setSyncError(null);
      showStatus(`Synced ${syncedCount} pending note(s) to cloud!`);
    } else if (!syncError) {
      setSyncError(`${remaining.length} note(s) still waiting to sync.`);
    }
    await fetchScratchpad();
    setRetryingSync(false);
  };

  const handleToggleShare = async (id: string, currentShared: boolean) => {
    const nextShared = !currentShared;
    setMyLines((prev) => prev.map((l) => (l.id === id ? { ...l, shared: nextShared } : l)));
    try {
      const res = await fetch("/api/scratch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, shared: nextShared }),
      });
      if (res.ok) {
        await fetchScratchpad();
      }
    } catch {
      /* ignore */
    }
  };

  const handleDeleteNote = async (id: string) => {
    savePendingLines(loadPendingLines().filter((p) => p.id !== id));
    setMyLines((prev) => prev.filter((l) => l.id !== id));
    setTableLines((prev) => prev.filter((l) => l.id !== id));
    if (id.startsWith("local-")) return;
    try {
      const res = await fetch("/api/scratch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        await fetchScratchpad();
      }
    } catch {
      /* ignore */
    }
  };

  const runAiForDate = async (targetDate: string) => {
    if (!targetDate || aiRunning) return;
    setAiRunning(true);
    setAiError(null);
    setAiResult(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    try {
      const res = await fetch("/api/scribe/lore-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: targetDate }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || `AI Lore-Master failed (HTTP ${res.status})`);
      }
      setAiResult(
        `AI Lore-Master staged ${data.newCount ?? 0} new notes and ${data.updateCount ?? 0} updates in _Review.`
      );
      try {
        localStorage.removeItem("dnd_codex_cache_scribe_reviews");
      } catch {
        /* ignore */
      }
    } catch (e: any) {
      const msg =
        e?.name === "AbortError"
          ? "AI Lore-Master timed out. Your session note is safely saved — click Retry AI Lore-Master."
          : e?.message || "AI Lore-Master failed.";
      setAiError(msg);
      toast(msg, { type: "error" });
    } finally {
      clearTimeout(timeoutId);
      setAiRunning(false);
    }
  };

  const handleCollateSession = async () => {
    if (!isScribe || collating || !collateDate) return;
    setCollating(true);
    setCollateResult(null);
    setCollateError(null);
    setCollatedPath(null);
    setAiResult(null);
    setAiError(null);

    try {
      // Step 1: Save & confirm session note immediately (decoupled from AI Lore-Master)
      const res = await fetch("/api/scribe/collate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session: collateDate,
          sourceSession: sessionDate || collateDate,
          runAi: false,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        const msg = data.error || `Collation failed (HTTP ${res.status})`;
        setCollateError(msg);
        toast(msg, { type: "error" });
        return;
      }

      try {
        localStorage.removeItem("dnd_codex_cache_session_list");
        if (data.path) {
          localStorage.removeItem(`dnd_codex_cache_session_note_${data.path}`);
        }
      } catch {
        /* ignore */
      }

      setCollatedPath(data.path);
      setCollateResult(
        `Saved ${data.lines ?? 0} note(s) into ${data.path}!`
      );
      toast(`Collated session note to ${data.path}`, { type: "success" });

      // Step 2: Run AI Lore-Master independently if checked
      if (runAiLoreMaster) {
        await runAiForDate(collateDate);
      }
    } catch (e: any) {
      const msg = e?.message || "Collation failed";
      setCollateError(msg);
      toast(msg, { type: "error" });
    } finally {
      setCollating(false);
    }
  };

  const pendingCount = myLines.filter((l) => l.pending).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-fantasy-700/60 gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-serif font-bold text-amber-200 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-amber-400" />
              Live Scratchpad & Table Feed
            </h2>
            {isScribe ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setTargetSessionDate(sessionDate);
                    setIsEditingSessionDate(!isEditingSessionDate);
                  }}
                  className="px-2 py-0.5 text-xs font-mono rounded bg-fantasy-800 hover:bg-fantasy-700 text-amber-300 border border-fantasy-700 flex items-center gap-1.5 transition shadow-sm"
                  title="Click to set or advance the active table session date"
                >
                  <Calendar className="w-3 h-3 text-amber-400" /> Session: {sessionDate || "Active"}
                  <span className="text-[10px] text-amber-400 underline">Change</span>
                </button>

                {isEditingSessionDate && (
                  <form
                    onSubmit={handleSetSessionDate}
                    className="absolute left-0 top-full mt-1.5 p-3 rounded-xl bg-fantasy-850 border border-amber-500/70 shadow-2xl z-50 flex items-center gap-2 animate-in fade-in zoom-in-95 duration-100"
                  >
                    <input
                      type="date"
                      value={targetSessionDate}
                      onChange={(e) => setTargetSessionDate(e.target.value)}
                      className="px-2.5 py-1 text-xs bg-fantasy-900 border border-fantasy-700 rounded text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs font-semibold rounded bg-amber-600 hover:bg-amber-500 text-slate-950 transition"
                    >
                      Set Date
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingSessionDate(false)}
                      className="text-xs text-slate-400 hover:text-slate-200 px-1"
                    >
                      ✕
                    </button>
                  </form>
                )}
              </div>
            ) : (
              sessionDate && (
                <span className="px-2 py-0.5 text-xs font-mono rounded bg-fantasy-800 text-amber-300 border border-fantasy-700 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-amber-400" /> Session: {sessionDate}
                </span>
              )
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time notes during play. Keep private thoughts or share key clues with the table.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-fantasy-900 border border-fantasy-700 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => handleExportMarkdown(false)}
              className="p-1.5 rounded text-slate-400 hover:text-amber-300 hover:bg-fantasy-800 transition"
              title="Copy all notes for this session to clipboard (Obsidian Markdown)"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleExportMarkdown(true)}
              className="p-1.5 rounded text-slate-400 hover:text-emerald-300 hover:bg-fantasy-800 transition"
              title="Download scratchpad notes as .md file (Emergency Backup)"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={fetchScratchpad}
            className="p-1.5 rounded-lg bg-fantasy-800 text-slate-400 hover:text-slate-200 border border-fantasy-700 transition"
            title="Refresh notes"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="flex items-center p-1 bg-fantasy-900 border border-fantasy-700 rounded-lg">
            <button
              type="button"
              onClick={() => handleTabChange("mine")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
                activeTab === "mine"
                  ? "bg-amber-600 text-slate-950 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" /> My Scratchpad ({myLines.length})
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("table")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
                activeTab === "table"
                  ? "bg-amber-600 text-slate-950 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Shared Table Feed ({tableLines.length})
            </button>
          </div>
        </div>
      </div>

      {/* Sync Failure / Pending Queue Warning Banner */}
      {(syncError || pendingCount > 0) && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-600/70 text-rose-200 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>
              {syncError || `${pendingCount} note(s) waiting to sync to cloud.`}
            </span>
          </div>
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={retryPendingSync}
              disabled={retryingSync}
              className="px-3 py-1 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              {retryingSync ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Retry Sync ({pendingCount})
            </button>
          )}
        </div>
      )}

      {/* Session Quick Reference Banner */}
      <SessionQuickRef onInsertText={handleInsertFromQuickRef} />

      {/* Instructions Card */}
      <div className="p-4 rounded-xl bg-fantasy-900/80 border border-amber-600/30 text-xs text-slate-300 space-y-2">
        <div className="flex items-center gap-2 font-serif font-semibold text-amber-300 text-sm">
          <Info className="w-4 h-4 text-amber-400" />
          How the Live Scratchpad Works
        </div>
        <p className="leading-relaxed">
          • <strong>Private by default:</strong> Everything you type in &quot;My Scratchpad&quot; is visible only to you. You can take messy, private notes without cluttering anyone else&apos;s screen.
        </p>
        <p className="leading-relaxed">
          • <strong>Share to Table:</strong> Hear an NPC say an important name or solve a puzzle? Click the <Eye className="w-3 h-3 inline text-emerald-400" /> <strong>Share</strong> button on any note, and it instantly broadcasts to everyone&apos;s <strong>Shared Table Feed</strong>.
        </p>
        <p className="leading-relaxed">
          • <strong>End-of-Session Collation:</strong> At the end of the session, the Scribe collates all player notes and transcripts into the official Obsidian Session Note, feeding the AI Lore-Master to stage updates!
        </p>
      </div>

      {/* Scribe Collation Controls */}
      {isScribe ? (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-700/60 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-sm text-amber-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Scribe Session Collation (DM & Scribe Only)
            </h3>
            <span className="px-2 py-0.5 text-[10px] bg-amber-500 text-slate-950 font-bold rounded uppercase">
              Scribe Authority
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Players do <strong>not</strong> need to click this. At the end of the session, only the Scribe (or DM) clicks this button to bundle all scratchpad notes and audio transcripts into the permanent Obsidian vault session file.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Save To Session Date:</label>
              <input
                type="date"
                value={collateDate}
                onChange={(e) => {
                  collateDateManualRef.current = true;
                  setCollateDate(e.target.value);
                }}
                className="px-2.5 py-1 text-xs bg-fantasy-900 border border-fantasy-700 rounded text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={runAiLoreMaster}
                onChange={(e) => setRunAiLoreMaster(e.target.checked)}
                className="rounded border-fantasy-700 text-amber-600 focus:ring-0"
              />
              <span>Run AI Lore-Master after saving</span>
            </label>

            <button
              type="button"
              onClick={handleCollateSession}
              disabled={collating || aiRunning || !collateDate}
              className="px-4 py-1.5 text-xs font-semibold rounded bg-amber-600 hover:bg-amber-500 text-slate-950 flex items-center gap-1.5 disabled:opacity-50 transition shadow"
            >
              {collating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
              {collating ? "Saving Session Note..." : "Collate Session Notes"}
            </button>
          </div>

          {sessionDate && collateDate && collateDate !== sessionDate && myLines.length > 0 && (
            <div className="p-2.5 rounded bg-amber-950/50 border border-amber-600/60 text-amber-200 text-[11px] flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>
                Active scratchpad is on <strong>{sessionDate}</strong> — collating will pull your {myLines.length} active note(s) into <strong>Session Notes {collateDate}.md</strong>.
              </span>
            </div>
          )}

          {collateError && (
            <div className="p-2.5 rounded bg-rose-950/60 border border-rose-700/60 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{collateError}</span>
            </div>
          )}

          {collateResult && (
            <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-700/60 text-emerald-200 text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{collateResult}</span>
              </div>
              {collatedPath && onOpenSession && (
                <button
                  type="button"
                  onClick={() => onOpenSession(collatedPath)}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1 transition"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  View Session Note
                </button>
              )}
            </div>
          )}

          {aiRunning && (
            <div className="p-2.5 rounded bg-amber-950/40 border border-amber-600/50 text-amber-200 text-xs flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400 flex-shrink-0" />
              <span>Session note saved! Running AI Lore-Master in the background to stage _Review updates...</span>
            </div>
          )}

          {aiResult && (
            <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-700/60 text-emerald-200 text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{aiResult}</span>
              </div>
              {onOpenReviews && (
                <button
                  type="button"
                  onClick={onOpenReviews}
                  className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition"
                >
                  Open AI Reviews
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {aiError && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-700/60 text-rose-200 text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{aiError}</span>
              </div>
              <button
                type="button"
                onClick={() => runAiForDate(collateDate)}
                className="px-3 py-1 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-semibold text-xs"
              >
                Retry AI Lore-Master
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-3.5 rounded-lg bg-fantasy-900/60 border border-fantasy-700/60 text-xs text-slate-400 flex items-center gap-2">
          <Info className="w-4 h-4 text-sky-400 flex-shrink-0" />
          <span>
            <strong>Collation notice:</strong> You do not need to do anything at the end of the session. The Scribe will collate your shared notes directly into the campaign records!
          </span>
        </div>
      )}

      {/* Status Toast */}
      {statusMessage && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Note Input Box */}
      <form onSubmit={handleAddNote} className="space-y-3 p-4 rounded-xl bg-fantasy-900/60 border border-fantasy-700">
        <WikiLinkTextarea
          value={newNoteText}
          onChange={handleDraftChange}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              handleAddNote(e);
            }
          }}
          placeholder={`Add a quick note or observation as ${currentUser?.character || "Adventurer"}... Type [[ to link notes · Ctrl+Enter to save`}
          rows={3}
          className="w-full p-3 text-sm bg-fantasy-850 border border-fantasy-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={shareImmediately}
              onChange={(e) => setShareImmediately(e.target.checked)}
              className="rounded border-fantasy-700 text-amber-600 focus:ring-0"
            />
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-amber-400" /> Share directly to Shared Table Feed
            </span>
          </label>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 hidden sm:inline font-mono">Ctrl + Enter</span>
            <button
              type="submit"
              disabled={submitting || !newNoteText.trim()}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 flex items-center gap-1.5 disabled:opacity-50 transition shadow"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Save Note
            </button>
          </div>
        </div>
      </form>

      {/* Main Tab Views */}
      {loading ? (
        <div className="py-20 flex justify-center text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        </div>
      ) : activeTab === "mine" ? (
        <div className="space-y-3">
          {myLines.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              Your scratchpad is empty for this session. Start typing notes above!
            </div>
          ) : (
            myLines.map((line) => (
              <div
                key={line.id}
                className={`p-4 rounded-xl border transition flex items-start justify-between gap-4 group ${
                  line.pending
                    ? "bg-rose-950/20 border-rose-700/60"
                    : line.shared
                    ? "bg-emerald-950/20 border-emerald-700/40"
                    : "bg-fantasy-850 border-fantasy-700/80"
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" /> {line.time}
                    </span>
                    {line.pending ? (
                      <span className="px-1.5 py-0.2 text-[10px] rounded bg-rose-950/60 text-rose-300 border border-rose-700/60 flex items-center gap-1">
                        <AlertCircle className="w-2.5 h-2.5" /> Unsynced (Local)
                      </span>
                    ) : line.shared ? (
                      <span className="px-1.5 py-0.2 text-[10px] rounded bg-emerald-950/60 text-emerald-300 border border-emerald-700/50 flex items-center gap-1">
                        <Eye className="w-2.5 h-2.5" /> Shared to Table
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 text-[10px] rounded bg-fantasy-800 text-slate-400 border border-fantasy-700 flex items-center gap-1">
                        <EyeOff className="w-2.5 h-2.5" /> Private
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {line.text}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                  {!line.pending && (
                    <button
                      type="button"
                      onClick={() => handleToggleShare(line.id, line.shared)}
                      className={`px-2 py-1 text-xs rounded border transition flex items-center gap-1 ${
                        line.shared
                          ? "bg-fantasy-800 border-fantasy-600 text-slate-300 hover:text-white"
                          : "bg-emerald-950/50 border-emerald-600 text-emerald-300 hover:bg-emerald-900/50"
                      }`}
                      title={line.shared ? "Make private" : "Broadcast to table"}
                    >
                      {line.shared ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {line.shared ? "Unshare" : "Share"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteNote(line.id)}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 transition"
                    title="Delete note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {tableLines.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              No shared notes from the party yet. Share a note from your scratchpad to broadcast here!
            </div>
          ) : (
            tableLines.map((line) => {
              const charStyle = getCharacterStyle(line.author);
              const isCopied = copiedId === line.id;

              return (
                <div
                  key={line.id}
                  className={`p-4 rounded-xl ${charStyle.bg} border ${charStyle.border} shadow space-y-2.5 transition`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${charStyle.chip}`}>
                        {line.author || "Adventurer"}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" /> {line.time}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyText(line.id, line.text)}
                        className="px-2 py-1 text-[11px] rounded bg-fantasy-800/80 hover:bg-fantasy-700 text-slate-300 hover:text-white border border-fantasy-700 flex items-center gap-1 transition"
                        title="Copy note to clipboard"
                      >
                        {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                        <span>{isCopied ? "Copied!" : "Copy"}</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {line.text}
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
