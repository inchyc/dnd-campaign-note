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
} from "lucide-react";

interface QuestMeta {
  path: string;
  title: string;
  category: string;
  summary?: string;
  status?: string;
  priority?: string;
  sub?: string;
}

interface QuestBoardProps {
  quests: QuestMeta[];
  onSelectQuest: (path: string) => void;
  isScribe: boolean;
  onStatusChange?: (path: string, status: string) => Promise<void>;
}

export function questBucket(status?: string): "open" | "active" | "resolved" {
  const s = (status || "").toLowerCase();
  if (/(complete|resolved|solved|closed|done)/.test(s)) return "resolved";
  if (/(active|progress|ongoing|investigating)/.test(s)) return "active";
  return "open";
}

export function QuestBoard({
  quests,
  onSelectQuest,
  isScribe,
  onStatusChange,
}: QuestBoardProps) {
  const [filterPriority, setFilterPriority] = useState<string>("all");

  const filtered = quests.filter((q) => {
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

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-fantasy-700/60">
        <div>
          <h2 className="text-xl font-serif font-bold text-amber-200 flex items-center gap-2">
            <Compass className="w-5 h-5 text-amber-400" />
            Investigations & Quest Board
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Track mysteries, ongoing threads, and dangerous inquiries across Starving Vilgeismar
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-1.5 text-xs bg-fantasy-900 border border-fantasy-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((col) => {
          const colQuests = filtered.filter((q) => questBucket(q.status) === col.id);
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
                          <span className="flex items-center gap-1 text-slate-500">
                            {quest.status || "Open"}
                          </span>
                          <span className="flex items-center gap-1 text-amber-400 group-hover:translate-x-0.5 transition-transform font-medium">
                            Details <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>

                        {/* Scribe Status Dropdown */}
                        {isScribe && onStatusChange && (
                          <div
                            className="pt-2 border-t border-fantasy-700/40 flex items-center justify-between text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-[10px] text-slate-500 uppercase font-semibold">Change Status:</span>
                            <select
                              value={quest.status || "Open"}
                              onChange={(e) => onStatusChange(quest.path, e.target.value)}
                              className="px-2 py-0.5 text-[11px] bg-fantasy-900 border border-fantasy-700 rounded text-slate-300 focus:outline-none"
                            >
                              <option value="Open">Open</option>
                              <option value="Active">Active</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Resolved">Resolved</option>
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
