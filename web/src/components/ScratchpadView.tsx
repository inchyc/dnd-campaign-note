"use client";

import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";

interface ScratchLine {
  id: string;
  time: string;
  text: string;
  shared: boolean;
  at: number;
  author?: string;
  authorId?: string;
}

interface ScratchpadViewProps {
  isScribe: boolean;
  currentUser: { id: string; name: string; character: string; role: "scribe" | "player" } | null;
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

export function ScratchpadView({ isScribe, currentUser }: ScratchpadViewProps) {
  const [activeTab, setActiveTab] = useState<"mine" | "table">("mine");
  const [sessionDate, setSessionDate] = useState<string>("");
  const [myLines, setMyLines] = useState<ScratchLine[]>([]);
  const [tableLines, setTableLines] = useState<ScratchLine[]>([]);
  const [newNoteText, setNewNoteText] = useState("");
  const [shareImmediately, setShareImmediately] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyText = (id: string, text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Scribe collation state
  const [collateDate, setCollateDate] = useState("");
  const [runAiLoreMaster, setRunAiLoreMaster] = useState(true);
  const [collating, setCollating] = useState(false);
  const [collateResult, setCollateResult] = useState<string | null>(null);

  const fetchScratchpad = useCallback(async () => {
    try {
      const res = await fetch("/api/scratch");
      const data = await res.json();
      if (data.success) {
        setSessionDate(data.session);
        if (!collateDate) setCollateDate(data.session);
        setMyLines(data.mine || []);
        setTableLines(data.shared || []);
      }
    } catch (e) {
      console.error("Failed to load scratchpad", e);
    } finally {
      setLoading(false);
    }
  }, [collateDate]);

  useEffect(() => {
    fetchScratchpad();
    const interval = setInterval(fetchScratchpad, 10000); // 10s auto-refresh
    return () => clearInterval(interval);
  }, [fetchScratchpad]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/scratch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: newNoteText.trim(),
          shared: shareImmediately,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewNoteText("");
        await fetchScratchpad();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleShare = async (id: string, currentShared: boolean) => {
    const res = await fetch("/api/scratch", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, shared: !currentShared }),
    });
    if (res.ok) {
      await fetchScratchpad();
    }
  };

  const handleDeleteNote = async (id: string) => {
    const res = await fetch("/api/scratch", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      await fetchScratchpad();
    }
  };

  const handleCollateSession = async () => {
    if (!isScribe || collating) return;
    setCollating(true);
    setCollateResult(null);
    try {
      const res = await fetch("/api/scribe/collate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session: collateDate,
          runAi: runAiLoreMaster,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCollateResult(
          `Successfully collated into ${data.path}! ${
            data.ai?.started ? "AI Lore-Master started in background." : ""
          }`
        );
      } else {
        alert(data.error || "Collation failed");
      }
    } catch (e: any) {
      alert(e.message || "Collation failed");
    } finally {
      setCollating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-fantasy-700/60 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-serif font-bold text-amber-200 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-amber-400" />
              Live Scratchpad & Table Feed
            </h2>
            {sessionDate && (
              <span className="px-2 py-0.5 text-xs font-mono rounded bg-fantasy-800 text-amber-300 border border-fantasy-700 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-400" /> Session: {sessionDate}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time notes during play. Keep private thoughts or share key clues with the table.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
              onClick={() => setActiveTab("mine")}
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
              onClick={() => setActiveTab("table")}
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

      {/* Scribe Collation Controls (Chris / Vex only) */}
      {isScribe && (
        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-700/50 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-sm text-amber-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Scribe Session Collation
            </h3>
            <span className="text-[11px] text-amber-400 font-mono">Vex (Scribe) Action</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Session Date:</label>
              <input
                type="date"
                value={collateDate}
                onChange={(e) => setCollateDate(e.target.value)}
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
              <span>Run AI Lore-Master to stage vault updates</span>
            </label>

            <button
              type="button"
              onClick={handleCollateSession}
              disabled={collating || !collateDate}
              className="px-4 py-1.5 text-xs font-semibold rounded bg-amber-600 hover:bg-amber-500 text-slate-950 flex items-center gap-1.5 disabled:opacity-50 transition shadow"
            >
              {collating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
              Collate Session Notes
            </button>
          </div>

          {collateResult && (
            <div className="p-2.5 rounded bg-emerald-950/50 border border-emerald-700/60 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{collateResult}</span>
            </div>
          )}
        </div>
      )}

      {/* Note Input Box */}
      <form onSubmit={handleAddNote} className="space-y-3 p-4 rounded-xl bg-fantasy-900/60 border border-fantasy-700">
        <textarea
          value={newNoteText}
          onChange={(e) => setNewNoteText(e.target.value)}
          placeholder={`Add a quick note or observation as ${currentUser?.character || "Adventurer"}...`}
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

          <button
            type="submit"
            disabled={submitting || !newNoteText.trim()}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 flex items-center gap-1.5 disabled:opacity-50 transition shadow"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Save Note
          </button>
        </div>
      </form>

      {/* Main Tab Views */}
      {loading ? (
        <div className="py-20 flex justify-center text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        </div>
      ) : activeTab === "mine" ? (
        /* TAB 1: My Scratchpad */
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
                  line.shared
                    ? "bg-emerald-950/20 border-emerald-700/40"
                    : "bg-fantasy-850 border-fantasy-700/80"
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" /> {line.time}
                    </span>
                    {line.shared ? (
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
        /* TAB 2: Shared Table Feed */
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
