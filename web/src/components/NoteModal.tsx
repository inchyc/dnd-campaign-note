"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  FileText,
  Edit3,
  BookOpen,
  MessageSquarePlus,
  Save,
  RotateCcw,
  CheckCircle,
  Eye,
  EyeOff,
  Tag,
  MapPin,
  Shield,
  User,
  Compass,
  AlertCircle,
  Loader2,
  Plus,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Archive,
  CheckCircle2,
} from "lucide-react";
import { MarkdownView } from "./MarkdownView";
import { getCachedData, setCachedData } from "@/lib/cache";

interface NoteModalProps {
  path: string | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (target: string) => void;
  isScribe: boolean;
  currentUser?: { id: string; name: string; character: string; role: "scribe" | "player" } | null;
  onNoteUpdated?: () => void;
}

interface NoteData {
  meta: {
    path: string;
    title: string;
    category: string;
    sub?: string;
    summary?: string;
    secret?: boolean;
    revealed?: boolean;
    status?: string;
    priority?: string;
    owner?: string;
    visibleToParty?: boolean;
    ownerType?: "dm" | "shared" | "private";
    ownerLabel?: string;
    archiveVotes?: string[];
  };
  frontmatter: Record<string, string>;
  body: string;
  links: string[];
  backlinks: Array<{ path: string; title: string; category: string }>;
  canEdit: boolean;
  canPlayerNote: boolean;
  mtime: number;
  raw?: string;
}

function questBucket(status?: string): "open" | "active" | "resolved" | "archived" {
  const s = (status || "").toLowerCase();
  if (/(archived|archive)/.test(s)) return "archived";
  if (/(complete|resolved|solved|closed|done)/.test(s)) return "resolved";
  if (/(active|progress|ongoing|investigating)/.test(s)) return "active";
  return "open";
}

export function NoteModal({
  path,
  isOpen,
  onClose,
  onNavigate,
  isScribe,
  currentUser,
  onNoteUpdated,
}: NoteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteData, setNoteData] = useState<NoteData | null>(null);
  const [activeTab, setActiveTab] = useState<"read" | "edit" | "playerNote">("read");

  // Navigation History Stack
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Unsaved changes & Discard confirmation
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Edit mode state
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Player note state
  const [playerNoteText, setPlayerNoteText] = useState("");
  const [isSubmittingPlayerNote, setIsSubmittingPlayerNote] = useState(false);

  // Follow-up task state
  const [followupTask, setFollowupTask] = useState("");
  const [isAddingFollowup, setIsAddingFollowup] = useState(false);

  const fetchNote = useCallback(async (notePath: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/note?path=${encodeURIComponent(notePath)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load note");
      }
      setNoteData(data.note);
      setEditContent(data.note.raw || data.note.body);
      setCachedData("note_" + notePath, data.note);
    } catch (err: any) {
      const cached = getCachedData<any>("note_" + notePath);
      if (cached?.data) {
        setNoteData(cached.data);
        setEditContent(cached.data.raw || cached.data.body);
      } else {
        setError(err.message || "Failed to load note");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // When opened from outside
  useEffect(() => {
    if (isOpen && path) {
      setActiveTab("read");
      setSaveSuccess(false);
      setPlayerNoteText("");
      setFollowupTask("");
      setShowDiscardConfirm(false);
      setHistoryStack([path]);
      setHistoryIndex(0);
      fetchNote(path);
    } else {
      setNoteData(null);
      setHistoryStack([]);
      setHistoryIndex(0);
    }
  }, [isOpen, path, fetchNote]);

  // Check if user has unsubmitted text
  const isDirty = useCallback(() => {
    if (!noteData) return false;
    const hasEditChanges = activeTab === "edit" && editContent !== (noteData.raw || noteData.body);
    const hasPlayerNoteChanges = playerNoteText.trim().length > 0;
    const hasFollowupChanges = followupTask.trim().length > 0;
    return hasEditChanges || hasPlayerNoteChanges || hasFollowupChanges;
  }, [activeTab, editContent, noteData, playerNoteText, followupTask]);

  // Request close: guard unsubmitted changes
  const requestClose = useCallback(() => {
    if (isDirty()) {
      setShowDiscardConfirm(true);
    } else {
      handleForceClose();
    }
  }, [isDirty]);

  const handleForceClose = () => {
    setShowDiscardConfirm(false);
    setEditContent("");
    setPlayerNoteText("");
    setFollowupTask("");
    onClose();
  };

  // Keyboard shortcut: Escape to close (guarded)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, requestClose]);

  // Navigate to another note within the modal (updates history stack)
  const handleInternalNavigate = async (target: string) => {
    if (isDirty()) {
      if (!confirm("You have unsubmitted changes. Discard and proceed to " + target + "?")) {
        return;
      }
    }
    // Search or find target path
    let targetPath = target;
    if (!target.endsWith(".md")) {
      try {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: target }),
        });
        const data = await res.json();
        if (data.results?.length > 0) {
          targetPath = data.results[0].meta.path;
        } else {
          alert(`Note not found: ${target}`);
          return;
        }
      } catch {
        return;
      }
    }

    const nextStack = historyStack.slice(0, historyIndex + 1).concat([targetPath]);
    setHistoryStack(nextStack);
    setHistoryIndex(nextStack.length - 1);
    setActiveTab("read");
    setPlayerNoteText("");
    setFollowupTask("");
    await fetchNote(targetPath);
  };

  const handleGoBack = async () => {
    if (historyIndex > 0) {
      if (isDirty()) {
        if (!confirm("You have unsubmitted changes. Discard and go back?")) return;
      }
      const prevPath = historyStack[historyIndex - 1];
      setHistoryIndex((idx) => idx - 1);
      setActiveTab("read");
      setPlayerNoteText("");
      setFollowupTask("");
      await fetchNote(prevPath);
    }
  };

  const handleGoForward = async () => {
    if (historyIndex < historyStack.length - 1) {
      if (isDirty()) {
        if (!confirm("You have unsubmitted changes. Discard and go forward?")) return;
      }
      const nextPath = historyStack[historyIndex + 1];
      setHistoryIndex((idx) => idx + 1);
      setActiveTab("read");
      setPlayerNoteText("");
      setFollowupTask("");
      await fetchNote(nextPath);
    }
  };

  const currentPath = historyStack[historyIndex] || path;

  // Handle task toggling (Instant optimistic update + background persistence)
  const handleToggleTask = async (line: number, lineText: string, checked: boolean) => {
    if (!currentPath || !noteData) return;

    // Optimistically toggle checkbox in local body state
    const oldBody = noteData.body;
    const bodyLines = oldBody.split(/\r?\n/);
    if (line >= 0 && line < bodyLines.length && bodyLines[line].includes("[")) {
      bodyLines[line] = bodyLines[line].replace(/\[( |x|X)\]/, checked ? "[x]" : "[ ]");
    } else {
      const matchText = lineText.replace(/^\s*[-*]\s+\[( |x|X)\]\s*/i, "").trim();
      for (let i = 0; i < bodyLines.length; i++) {
        if (bodyLines[i].includes(matchText)) {
          bodyLines[i] = bodyLines[i].replace(/\[( |x|X)\]/, checked ? "[x]" : "[ ]");
          break;
        }
      }
    }
    const nextBody = bodyLines.join("\n");
    const updatedNote = { ...noteData, body: nextBody };
    setNoteData(updatedNote);
    setCachedData(`note_${currentPath}`, updatedNote);

    try {
      const res = await fetch("/api/note/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: currentPath, line, text: lineText, checked }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNoteData({ ...noteData, body: oldBody });
        alert(data.error || "Failed to toggle task");
        return;
      }
      if (onNoteUpdated) onNoteUpdated();
    } catch {
      setNoteData({ ...noteData, body: oldBody });
      alert("Network error updating task");
    }
  };

  // Handle adding task
  const handleAddTask = async (afterLine: number, text: string) => {
    if (!currentPath || !noteData) return;
    const oldBody = noteData.body;
    const bodyLines = oldBody.split(/\r?\n/);
    const insertIdx = Math.min(Math.max(0, afterLine + 1), bodyLines.length);
    bodyLines.splice(insertIdx, 0, `- [ ] ${text}`);
    const nextBody = bodyLines.join("\n");
    const updatedNote = { ...noteData, body: nextBody };
    setNoteData(updatedNote);
    setCachedData(`note_${currentPath}`, updatedNote);

    try {
      const res = await fetch("/api/note/task", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: currentPath, afterLine, text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNoteData({ ...noteData, body: oldBody });
        alert(data.error || "Failed to add task");
        return;
      }
      if (onNoteUpdated) onNoteUpdated();
    } catch {
      setNoteData({ ...noteData, body: oldBody });
      alert("Network error adding task");
    }
  };

  // Add a follow-up task at bottom of note
  const handleAddBottomTask = async () => {
    if (!currentPath || !followupTask.trim() || !noteData) return;
    const taskToAdd = followupTask.trim();
    setFollowupTask("");
    setIsAddingFollowup(true);

    const oldBody = noteData.body;
    const nextBody = oldBody.trimEnd() + `\n- [ ] ${taskToAdd}\n`;
    const updatedNote = { ...noteData, body: nextBody };
    setNoteData(updatedNote);
    setCachedData(`note_${currentPath}`, updatedNote);

    try {
      const lines = noteData.body.split(/\r?\n/);
      const afterLine = Math.max(0, lines.length - 1);
      const res = await fetch("/api/note/task", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: currentPath, afterLine, text: taskToAdd }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNoteData({ ...noteData, body: oldBody });
        alert(data.error || "Failed to add follow-up task");
        return;
      }
      if (onNoteUpdated) onNoteUpdated();
    } catch {
      setNoteData({ ...noteData, body: oldBody });
      alert("Network error adding task");
    } finally {
      setIsAddingFollowup(false);
    }
  };

  // Handle quest status update (Instant optimistic update + background persistence)
  const handleQuestStatusUpdate = async (nextStatus: string) => {
    if (!currentPath || !noteData) return;

    // Optimistically update status badges immediately
    const oldMeta = noteData.meta;
    const oldFm = noteData.frontmatter;
    const updatedNote = {
      ...noteData,
      meta: { ...oldMeta, status: nextStatus },
      frontmatter: { ...oldFm, status: nextStatus },
    };
    setNoteData(updatedNote);
    setCachedData(`note_${currentPath}`, updatedNote);

    try {
      const res = await fetch("/api/note/meta", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: currentPath, key: "status", value: nextStatus }),
      });
      if (res.ok) {
        if (onNoteUpdated) onNoteUpdated();
      } else {
        setNoteData({ ...noteData, meta: oldMeta, frontmatter: oldFm });
        const data = await res.json();
        alert(data.error || "Failed to update quest status");
      }
    } catch {
      setNoteData({ ...noteData, meta: oldMeta, frontmatter: oldFm });
      alert("Network error updating status");
    }
  };

  // Handle saving raw markdown
  const handleSaveEdit = async () => {
    if (!currentPath || !noteData) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/note", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: currentPath,
          content: editContent,
          baseMtime: noteData.mtime,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save note");
        return;
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      await fetchNote(currentPath);
      setActiveTab("read");
      if (onNoteUpdated) onNoteUpdated();
    } finally {
      setIsSaving(false);
    }
  };

  // Handle submitting player note
  const handleSubmitPlayerNote = async () => {
    if (!currentPath || !playerNoteText.trim()) return;
    setIsSubmittingPlayerNote(true);
    try {
      const res = await fetch("/api/note/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: currentPath,
          text: playerNoteText.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to add player note");
        return;
      }
      setPlayerNoteText("");
      await fetchNote(currentPath);
      setActiveTab("read");
      if (onNoteUpdated) onNoteUpdated();
    } finally {
      setIsSubmittingPlayerNote(false);
    }
  };

  // Toggle reveal to party (Scribe only)
  const handleToggleReveal = async () => {
    if (!currentPath || !noteData || !isScribe) return;
    const nextRevealed = !noteData.meta.revealed;
    const res = await fetch("/api/note/meta", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: currentPath,
        key: "revealed",
        value: nextRevealed,
      }),
    });
    if (res.ok) {
      await fetchNote(currentPath);
      if (onNoteUpdated) onNoteUpdated();
    }
  };

  // Toggle visible to party for character notes
  const handleToggleVisibleToParty = async () => {
    if (!currentPath || !noteData) return;
    const nextVisible = !noteData.meta.visibleToParty;
    const res = await fetch("/api/note/meta", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: currentPath,
        key: "visible_to_party",
        value: nextVisible,
      }),
    });
    if (res.ok) {
      await fetchNote(currentPath);
      if (onNoteUpdated) onNoteUpdated();
    }
  };

  const handleArchiveOrVote = async () => {
    if (!currentPath) return;
    try {
      if (isScribe || noteData?.canEdit) {
        if (!confirm("Are you sure you want to archive this note?")) return;
        const res = await fetch("/api/note/meta", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: currentPath, key: "archive", value: true }),
        });
        if (res.ok) {
          alert("Note has been archived.");
          handleForceClose();
          if (onNoteUpdated) onNoteUpdated();
        }
      } else {
        const res = await fetch("/api/note/meta", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: currentPath, key: "archive_vote", value: true }),
        });
        const data = await res.json();
        if (data.archived) {
          alert("Consensus reached: Note has been moved to Archive!");
          handleForceClose();
          if (onNoteUpdated) onNoteUpdated();
        } else {
          alert(`Your vote to archive has been recorded (${data.votes || 1}/2 votes needed).`);
          await fetchNote(currentPath);
        }
      }
    } catch (e: any) {
      alert("Failed to archive: " + e.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={requestClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col bg-fantasy-850 border-t sm:border border-fantasy-700 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden text-slate-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-fantasy-700/80 bg-fantasy-900/90">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* History Back/Forward Controls */}
            <div className="flex items-center gap-0.5 bg-fantasy-800 p-0.5 rounded-lg border border-fantasy-700 flex-shrink-0">
              <button
                type="button"
                onClick={handleGoBack}
                disabled={historyIndex <= 0}
                className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition"
                title="Back (history)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleGoForward}
                disabled={historyIndex >= historyStack.length - 1}
                className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition"
                title="Forward (history)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <span className="p-2 rounded-lg bg-amber-950/40 text-amber-400 border border-amber-800/40 flex-shrink-0 hidden sm:block">
              <FileText className="w-5 h-5" />
            </span>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-serif font-bold text-amber-200 truncate">
                  {noteData?.meta.title || currentPath?.split("/").pop()?.replace(/\.md$/, "")}
                </h2>
                {noteData?.meta.category && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-fantasy-700 text-slate-300 uppercase tracking-wider">
                    {noteData.meta.category}
                  </span>
                )}
                {noteData?.meta.sub && (
                  <span className="px-2 py-0.5 text-[10px] rounded bg-fantasy-800 text-amber-300 border border-fantasy-700 hidden sm:inline-block">
                    {noteData.meta.sub}
                  </span>
                )}
                {noteData?.meta.ownerType === "dm" && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-rose-950/70 text-rose-300 border border-rose-800/70 flex items-center gap-1">
                    <EyeOff className="w-3 h-3" /> 🔒 DM Secret
                  </span>
                )}
                {noteData?.meta.ownerType === "private" && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-purple-950/70 text-purple-300 border border-purple-800/70 flex items-center gap-1">
                    👤 Private ({noteData.meta.ownerLabel || "PC"})
                  </span>
                )}
                {noteData?.meta.ownerType === "shared" && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/70 flex items-center gap-1">
                    👥 Party Shared
                  </span>
                )}
                {noteData?.meta.secret && (
                  <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-rose-950/60 text-rose-300 border border-rose-800/50 flex items-center gap-1">
                    <EyeOff className="w-3 h-3" /> Secret
                  </span>
                )}
                {noteData?.meta.revealed && (
                  <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Revealed
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">{currentPath}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Quest Status Quick Toggle & Mark Complete */}
            {noteData?.meta.category === "quest" && (
              <div className="flex items-center gap-1.5">
                {questBucket(noteData.meta.status || noteData.frontmatter?.status) !== "resolved" ? (
                  <button
                    type="button"
                    onClick={() => handleQuestStatusUpdate("resolved")}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/60 text-emerald-200 transition flex items-center gap-1.5 shadow"
                    title="Mark this investigation as resolved/completed"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Mark Complete</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleQuestStatusUpdate("active")}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/60 text-amber-200 transition flex items-center gap-1.5 shadow"
                    title="Re-open this investigation as active"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Re-open</span>
                  </button>
                )}

                <div className="flex items-center gap-1 bg-fantasy-800 border border-fantasy-600 rounded-lg px-2 py-0.5 text-xs">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase hidden sm:inline">Status:</span>
                  <select
                    value={questBucket(noteData.meta.status || noteData.frontmatter?.status)}
                    onChange={(e) => handleQuestStatusUpdate(e.target.value)}
                    className="bg-transparent text-amber-300 font-semibold text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="open" className="bg-fantasy-900 text-sky-300">Open</option>
                    <option value="active" className="bg-fantasy-900 text-amber-300">Active</option>
                    <option value="resolved" className="bg-fantasy-900 text-emerald-300">Resolved</option>
                  </select>
                </div>
              </div>
            )}

            {/* Archive / Vote to Archive Button */}
            {noteData && (
              <button
                type="button"
                onClick={handleArchiveOrVote}
                className="px-2.5 py-1 text-xs font-medium rounded-lg border border-fantasy-600 bg-fantasy-800 text-slate-300 hover:text-rose-300 hover:border-rose-700/60 transition flex items-center gap-1.5"
                title={
                  isScribe || noteData.canEdit
                    ? "Archive this note"
                    : "Cast vote to archive note (2 player votes needed)"
                }
              >
                <Archive className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {isScribe || noteData.canEdit
                    ? "Archive"
                    : (noteData.meta as any).archiveVotes?.length
                    ? `Vote Archive (${(noteData.meta as any).archiveVotes.length}/2)`
                    : "Vote Archive"}
                </span>
              </button>
            )}

            {/* Scribe Secret Reveal Toggle */}
            {isScribe && noteData?.meta.secret && (
              <button
                type="button"
                onClick={handleToggleReveal}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition flex items-center gap-1.5 ${
                  noteData.meta.revealed
                    ? "bg-emerald-950/50 border-emerald-600 text-emerald-300 hover:bg-emerald-900/50"
                    : "bg-fantasy-800 border-fantasy-600 text-slate-300 hover:bg-fantasy-700"
                }`}
                title={noteData.meta.revealed ? "Hide from players" : "Reveal to players"}
              >
                {noteData.meta.revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{noteData.meta.revealed ? "Revealed to Party" : "Reveal to Party"}</span>
              </button>
            )}

            {/* Character Note Visibility Toggle */}
            {noteData?.meta.category === "party" && (isScribe || noteData.canEdit) && (
              <button
                type="button"
                onClick={handleToggleVisibleToParty}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition flex items-center gap-1.5 ${
                  noteData.meta.visibleToParty
                    ? "bg-emerald-950/50 border-emerald-600 text-emerald-300 hover:bg-emerald-900/50"
                    : "bg-fantasy-800 border-fantasy-600 text-slate-300 hover:bg-fantasy-700"
                }`}
              >
                {noteData.meta.visibleToParty ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{noteData.meta.visibleToParty ? "Public to Party" : "Private to You"}</span>
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={requestClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-fantasy-700 transition"
              title="Close note (Esc or click outside)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-4 sm:px-6 py-2 border-b border-fantasy-700/60 bg-fantasy-900/40">
          <button
            type="button"
            onClick={() => setActiveTab("read")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition ${
              activeTab === "read"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-fantasy-800"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Reading Mode
          </button>

          {noteData?.canEdit && (
            <button
              type="button"
              onClick={() => setActiveTab("edit")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition ${
                activeTab === "edit"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-fantasy-800"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Markdown
            </button>
          )}

          {noteData?.canPlayerNote && (
            <button
              type="button"
              onClick={() => setActiveTab("playerNote")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition ${
                activeTab === "playerNote"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-fantasy-800"
              }`}
            >
              <MessageSquarePlus className="w-3.5 h-3.5" /> + Add Player Note
            </button>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-6">
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              <p className="text-sm">Consulting the campaign archives...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg bg-rose-950/40 border border-rose-700/60 text-rose-300 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && noteData && (
            <>
              {/* Frontmatter Property Badges */}
              {Object.keys(noteData.frontmatter).length > 0 && (
                <div className="p-3.5 rounded-lg bg-fantasy-900/60 border border-fantasy-700/50 flex flex-wrap gap-2 items-center text-xs">
                  {Object.entries(noteData.frontmatter).map(([key, value]) => {
                    const formattedKey = key.replace(/_/g, " ");
                    let badgeColor = "bg-fantasy-800 border-fantasy-700 text-slate-300";
                    if (key === "status") badgeColor = "bg-amber-950/40 border-amber-700/50 text-amber-300";
                    if (key === "faction") badgeColor = "bg-blue-950/40 border-blue-700/50 text-blue-300";
                    if (key === "location") badgeColor = "bg-emerald-950/40 border-emerald-700/50 text-emerald-300";

                    if (key === "status") {
                      return (
                        <div
                          key={key}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-amber-950/40 border-amber-700/50 text-amber-300"
                        >
                          <span className="text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                            status:
                          </span>
                          <select
                            value={String(value || "").toLowerCase()}
                            onChange={(e) => handleQuestStatusUpdate(e.target.value)}
                            className="bg-transparent font-medium text-amber-300 text-xs focus:outline-none cursor-pointer underline"
                          >
                            <option value="open" className="bg-fantasy-900 text-sky-300">open</option>
                            <option value="active" className="bg-fantasy-900 text-amber-300">active</option>
                            <option value="resolved" className="bg-fantasy-900 text-emerald-300">resolved</option>
                            <option value="archived" className="bg-fantasy-900 text-slate-400">archived</option>
                          </select>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={key}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${badgeColor}`}
                      >
                        <span className="text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                          {formattedKey}:
                        </span>
                        <span className="font-medium">{value}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 1: Reading Mode */}
              {activeTab === "read" && (
                <div className="space-y-6">
                  <MarkdownView
                    content={noteData.body}
                    filePath={noteData.meta.path}
                    onNavigate={handleInternalNavigate}
                    onToggleTask={handleToggleTask}
                    onAddTask={handleAddTask}
                  />

                  {/* Add Follow-Up Task Bar */}
                  <div className="pt-4 border-t border-fantasy-700/50 flex items-center gap-2">
                    <input
                      type="text"
                      value={followupTask}
                      onChange={(e) => setFollowupTask(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddBottomTask();
                      }}
                      placeholder="+ Add follow-up task / action item to this note..."
                      className="flex-1 px-3 py-1.5 text-sm bg-fantasy-900 border border-fantasy-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddBottomTask}
                      disabled={isAddingFollowup || !followupTask.trim()}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-lg disabled:opacity-50 transition flex items-center gap-1 shadow"
                    >
                      {isAddingFollowup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Add Task
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: Edit Markdown */}
              {activeTab === "edit" && noteData.canEdit && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Editing Obsidian Markdown directly. Frontmatter and notes will be preserved.</span>
                    {saveSuccess && (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Saved successfully
                      </span>
                    )}
                  </div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={18}
                    className="w-full p-4 font-mono text-sm bg-fantasy-900 border border-fantasy-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 resize-y"
                    placeholder="Type Obsidian Markdown..."
                  />
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditContent(noteData.raw || noteData.body);
                        setActiveTab("read");
                      }}
                      className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-lg hover:bg-fantasy-800 transition"
                    >
                      Discard Changes
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                      className="px-5 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-lg flex items-center gap-1.5 disabled:opacity-50 transition shadow"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Note
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: Add Player Note */}
              {activeTab === "playerNote" && noteData.canPlayerNote && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-lg bg-amber-950/30 border border-amber-700/40 text-amber-200 text-xs leading-relaxed">
                    💡 <strong>Player Note Safety:</strong> Your note will be appended under a timestamped heading:
                    <div className="mt-1 font-mono text-slate-300">
                      - **{currentUser?.name || "Player"} ({currentUser?.character || "PC"})** · {new Date().toISOString().slice(0, 10)}: ...
                    </div>
                    It will never modify or overwrite DM descriptions.
                  </div>
                  <textarea
                    value={playerNoteText}
                    onChange={(e) => setPlayerNoteText(e.target.value)}
                    rows={6}
                    placeholder="Add observations, rumors heard, leads, or personal thoughts about this person, place, or lore..."
                    className="w-full p-4 text-sm bg-fantasy-900 border border-fantasy-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab("read")}
                      className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-lg hover:bg-fantasy-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitPlayerNote}
                      disabled={isSubmittingPlayerNote || !playerNoteText.trim()}
                      className="px-5 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-lg flex items-center gap-1.5 disabled:opacity-50 transition shadow"
                    >
                      {isSubmittingPlayerNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquarePlus className="w-4 h-4" />}
                      Append Note
                    </button>
                  </div>
                </div>
              )}

              {/* Backlinks Section */}
              {noteData.backlinks && noteData.backlinks.length > 0 && (
                <div className="pt-6 border-t border-fantasy-700/60 space-y-2.5">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-amber-400" />
                    Referenced in ({noteData.backlinks.length} notes)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {noteData.backlinks.map((bl) => (
                      <button
                        key={bl.path}
                        type="button"
                        onClick={() => handleInternalNavigate(bl.path)}
                        className="px-2.5 py-1 text-xs rounded-md bg-fantasy-900 hover:bg-fantasy-800 border border-fantasy-700 text-slate-300 hover:text-amber-300 flex items-center gap-1.5 transition"
                      >
                        <FileText className="w-3 h-3 text-amber-400" />
                        <span>{bl.title}</span>
                        <span className="text-[10px] text-slate-500 uppercase">({bl.category})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Discard Changes In-App Confirmation Modal */}
      {showDiscardConfirm && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-fantasy-900 border border-rose-600/50 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-rose-200">
                  Discard Unsaved Text?
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  You have unsubmitted changes in your draft
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-fantasy-850 p-3 rounded-lg border border-fantasy-700">
              You typed text in your editor, player note draft, or follow-up task that hasn't been submitted yet. If you close now, this text will be lost.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-fantasy-800 hover:bg-fantasy-700 text-slate-300 border border-fantasy-700 transition"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={handleForceClose}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition"
              >
                Discard & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
