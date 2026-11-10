"use client";

import React, { useState } from "react";
import {
  Compass,
  AlertCircle,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  ChevronRight,
  Filter,
  Plus,
  Archive,
  RotateCcw,
  Vote,
  X,
  Loader2,
} from "lucide-react";

export interface QuestMeta {
  path: string;
  title: string;
  category: string;
  summary?: string;
  status?: string;
  priority?: string;
  sub?: string;
  archiveVotes?: string[];
  ownerType?: "dm" | "shared" | "private";
  ownerLabel?: string;
}

interface QuestBoardProps {
  quests: QuestMeta[];
  onSelectQuest: (path: string) => void;
  isScribe: boolean;
  currentUser?: { id: string; name: string; character: string; role: "scribe" | "player" } | null;
  onStatusChange?: (path: string, status: string) => Promise<void>;
  onRefresh?: () => void;
}

export function questBucket(status?: string): "open" | "active" | "resolved" | "archived" {
  const s = (status || "").toLowerCase();
  if (/(archived|archive)/.test(s)) return "archived";
  if (/(complete|resolved|solved|closed|done)/.test(s)) return "resolved";
  if (/(active|progress|ongoing|investigating)/.test(s)) return "active";
  return "open";
}

export function QuestBoard({
  quests,
  onSelectQuest,
  isScribe,
  currentUser,
  onStatusChange,
  onRefresh,
}: QuestBoardProps) {
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [viewTab, setViewTab] = useState<"board" | "archived">("board");
  const [isNewQuestOpen, setIsNewQuestOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("normal");
  const [newSummary, setNewSummary] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter out archived unless on archived tab
  const activeQuests = quests.filter((q) => questBucket(q.status) !== "archived");
  const archivedQuests = quests.filter((q) => questBucket(q.status) === "archived");

  const displayedQuests = (viewTab === "board" ? activeQuests : archivedQuests).filter((q) => {
    if (filterPriority === "all") return true;
    return (q.priority || "normal").toLowerCase() === filterPriority.toLowerCase();
  });

  const columns: Array<{
    id: "open" | "active" | "resolved";
    title: string;
    icon: any;
    color: string;
    border: string;
    badgeBg: string;
    badgeText: string;
  }> = [
    {
      id: "active",
      title: "Active Investigations",
      icon: Clock,
      color: "text-amber-400",
      border: "border-amber-600/40",
      badgeBg: "bg-amber-950/60",
      badgeText: "text-amber-300",
    },
    {
      id: "open",
      title: "Open Leads & Rumors",
      icon: Compass,
      color: "text-sky-400",
      border: "border-sky-600/40",
      badgeBg: "bg-sky-950/60",
      badgeText: "text-sky-300",
    },
    {
      id: "resolved",
      title: "Resolved Mysteries",
      icon: CheckCircle2,
      color: "text-emerald-400",
      border: "border-emerald-600/40",
      badgeBg: "bg-emerald-950/60",
      badgeText: "text-emerald-300",
    },
  ];

  const handleCreateQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          create: true,
          category: "quest",
          title: newTitle.trim(),
          priority: newPriority,
          body: newSummary.trim() || `# ${newTitle.trim()}\n\nLead discovered by the party.`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to create quest");
        return;
      }
      setNewTitle("");
      setNewSummary("");
      setNewPriority("normal");
      setIsNewQuestOpen(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert("Error creating quest: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (path: string, nextStatus: string) => {
    if (onStatusChange) {
      await onStatusChange(path, nextStatus);
      return;
    }
    try {
      const res = await fetch("/api/note/meta", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, key: "status", value: nextStatus }),
      });
      if (res.ok && onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleArchiveOrVote = async (quest: QuestMeta) => {
    try {
      if (isScribe) {
        const res = await fetch("/api/note/meta", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: quest.path, key: "archive", value: true }),
        });
        if (res.ok && onRefresh) onRefresh();
      } else {
        const res = await fetch("/api/note/meta", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: quest.path, key: "archive_vote", value: true }),
        });
        const data = await res.json();
        if (data.archived) {
          alert("Consensus reached: Quest has been moved to Archive!");
        } else {
          alert(`Your vote to archive '${quest.title}' has been registered (${data.votes || 1}/2 votes needed).`);
        }
        if (onRefresh) onRefresh();
      }
    } catch (e: any) {
      alert("Failed to process archive: " + e.message);
    }
  };

  const handleRestoreQuest = async (path: string) => {
    await handleStatusUpdate(path, "open");
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-fantasy-700/60 gap-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-amber-200 flex items-center gap-2">
            <Compass className="w-5 h-5 text-amber-400" />
            Investigations & Quest Board
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Track mysteries, ongoing threads, and dangerous inquiries across the campaign
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Active vs Archived View Toggle */}
          <div className="flex items-center p-1 bg-fantasy-900 border border-fantasy-700 rounded-lg">
            <button
              type="button"
              onClick={() => setViewTab("board")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                viewTab === "board"
                  ? "bg-amber-600 text-slate-950 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Active Board ({activeQuests.length})
            </button>
            <button
              type="button"
              onClick={() => setViewTab("archived")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1 ${
                viewTab === "archived"
                  ? "bg-amber-600 text-slate-950 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Archive className="w-3.5 h-3.5" /> Archived ({archivedQuests.length})
            </button>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-fantasy-900 border border-fantasy-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* + New Quest Button */}
          <button
            type="button"
            onClick={() => setIsNewQuestOpen(true)}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 flex items-center gap-1.5 transition shadow"
          >
            <Plus className="w-4 h-4" /> New Quest
          </button>
        </div>
      </div>

      {/* VIEW 1: Active Board (Kanban Columns) */}
      {viewTab === "board" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map((col) => {
            const colQuests = displayedQuests.filter((q) => questBucket(q.status) === col.id);
            const Icon = col.icon;

            return (
              <div
                key={col.id}
                className={`flex flex-col rounded-xl bg-fantasy-900/60 border ${col.border} p-4 shadow-lg min-h-[420px]`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-fantasy-700/60">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${col.color}`} />
                    <h3 className="font-serif font-semibold text-sm text-slate-200">
                      {col.title}
                    </h3>
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${col.badgeBg} ${col.badgeText}`}>
                    {colQuests.length}
                  </span>
                </div>

                {/* Cards List */}
                <div className="flex-1 space-y-3 overflow-y-auto">
                  {colQuests.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-xs text-slate-500 italic">
                      No inquiries in this category
                    </div>
                  ) : (
                    colQuests.map((quest) => {
                      const priority = (quest.priority || "Normal").toLowerCase();
                      let priorityBadge = "bg-fantasy-800 text-slate-400 border-fantasy-700";
                      if (priority === "urgent") priorityBadge = "bg-rose-950/60 text-rose-300 border-rose-700/60 font-semibold";
                      else if (priority === "high") priorityBadge = "bg-amber-950/60 text-amber-300 border-amber-700/60 font-semibold";

                      const currentVotes = quest.archiveVotes?.length || 0;

                      return (
                        <div
                          key={quest.path}
                          onClick={() => onSelectQuest(quest.path)}
                          className="p-4 rounded-lg bg-fantasy-850 hover:bg-fantasy-800 border border-fantasy-700/80 hover:border-amber-500/50 transition cursor-pointer shadow group space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-serif font-semibold text-sm text-amber-200 group-hover:text-amber-100 leading-snug">
                              {quest.title}
                            </h4>
                            {quest.priority && (
                              <span className={`px-2 py-0.5 text-[10px] rounded border uppercase tracking-wider ${priorityBadge}`}>
                                {quest.priority}
                              </span>
                            )}
                          </div>

                          {quest.summary && (
                            <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                              {quest.summary}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-fantasy-700/40 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1 capitalize font-medium text-slate-300">
                              Status: {quest.status || "Open"}
                            </span>
                            <span className="flex items-center gap-1 text-amber-400 group-hover:translate-x-0.5 transition-transform font-medium">
                              Details <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>

                          {/* Status and Archive Controls (All Players & Scribe) */}
                          <div
                            className="pt-2 border-t border-fantasy-700/40 flex items-center justify-between gap-2 text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-500 uppercase font-semibold">Move:</span>
                              <select
                                value={quest.status || "open"}
                                onChange={(e) => handleStatusUpdate(quest.path, e.target.value)}
                                className="px-2 py-0.5 text-[11px] bg-fantasy-900 border border-fantasy-700 rounded text-slate-300 focus:outline-none"
                              >
                                <option value="open">Open</option>
                                <option value="active">Active</option>
                                <option value="resolved">Resolved</option>
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleArchiveOrVote(quest)}
                              className="px-2 py-0.5 text-[10px] font-medium rounded bg-fantasy-800 hover:bg-rose-950/50 hover:text-rose-300 text-slate-400 border border-fantasy-700 hover:border-rose-800/50 transition flex items-center gap-1"
                              title={isScribe ? "Archive quest directly" : "Vote to archive quest (2 player votes required)"}
                            >
                              <Archive className="w-3 h-3" />
                              {isScribe ? "Archive" : currentVotes > 0 ? `Vote (${currentVotes}/2)` : "Vote Archive"}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: Archived Quests */}
      {viewTab === "archived" && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-fantasy-900/60 border border-fantasy-700/60 text-xs text-slate-300 flex items-center justify-between">
            <span>
              📦 <strong>Quest Archive:</strong> Completed storylines and closed leads safely stored out of sight. You can restore any quest to the active board at any time.
            </span>
          </div>

          {displayedQuests.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs italic bg-fantasy-900/40 rounded-xl border border-fantasy-700">
              No archived quests found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedQuests.map((quest) => (
                <div
                  key={quest.path}
                  onClick={() => onSelectQuest(quest.path)}
                  className="p-4 rounded-xl bg-fantasy-850/60 border border-fantasy-700/60 hover:border-slate-500 transition cursor-pointer flex flex-col justify-between group space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-serif font-bold text-sm text-slate-300 group-hover:text-amber-200">
                        {quest.title}
                      </h4>
                      <span className="px-2 py-0.5 text-[10px] rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                        Archived
                      </span>
                    </div>
                    {quest.summary && (
                      <p className="text-xs text-slate-400 line-clamp-2">{quest.summary}</p>
                    )}
                  </div>

                  <div
                    className="flex items-center justify-between pt-2 border-t border-fantasy-700/40 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[11px] text-slate-500">Completed quest</span>
                    <button
                      type="button"
                      onClick={() => handleRestoreQuest(quest.path)}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-600/80 hover:bg-amber-500 text-slate-950 flex items-center gap-1 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Restore to Board
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* + New Quest Modal */}
      {isNewQuestOpen && (
        <div
          onClick={() => setIsNewQuestOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-fantasy-850 border border-fantasy-700 rounded-2xl shadow-2xl p-6 space-y-5 text-slate-200"
          >
            <div className="flex items-center justify-between border-b border-fantasy-700/60 pb-3">
              <h3 className="font-serif font-bold text-lg text-amber-200 flex items-center gap-2">
                <Compass className="w-5 h-5 text-amber-400" />
                Add New Quest or Investigation
              </h3>
              <button
                type="button"
                onClick={() => setIsNewQuestOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Quest Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. The Whispering Well"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-fantasy-900 border border-fantasy-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Priority Level
                </label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-fantasy-900 border border-fantasy-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="normal">Normal</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Summary & Clues
                </label>
                <textarea
                  rows={4}
                  placeholder="What rumor, lead, or bounty has the party discovered?"
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-fantasy-900 border border-fantasy-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-fantasy-700/60">
                <button
                  type="button"
                  onClick={() => setIsNewQuestOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newTitle.trim()}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create Quest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
