"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Shield,
  Calendar,
  Users,
  MapPin,
  BookOpen,
  Compass,
  Backpack,
  Edit3,
  Mic,
  Bot,
  RefreshCw,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Dices,
} from "lucide-react";

export type HubTabId =
  | "home"
  | "sheet"
  | "sessions"
  | "npcs"
  | "locations"
  | "lore"
  | "quests"
  | "party"
  | "scratchpad"
  | "audio"
  | "reviews"
  | "sync";

interface AppSidebarProps {
  activeTab: HubTabId;
  onSelectTab: (tab: HubTabId) => void;
  isScribe: boolean;
  onNewNote: () => void;
  onOpenTableTools: () => void;
  activeQuestCount?: number;
}

export interface NavItem {
  id: HubTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export function getNavGroups(isScribe: boolean, activeQuestCount?: number): NavGroup[] {
  return [
    {
      title: "Table",
      items: [
        { id: "home", label: "Dashboard", icon: Sparkles },
        { id: "sheet", label: "Character Sheet", icon: Shield },
        { id: "party", label: "Party & Camp Loot", icon: Backpack },
        { id: "scratchpad", label: "Live Scratchpad", icon: Edit3 },
      ],
    },
    {
      title: "Codex",
      items: [
        { id: "sessions", label: "Session Notes", icon: Calendar },
        { id: "npcs", label: "NPCs", icon: Users },
        { id: "locations", label: "Locations", icon: MapPin },
        { id: "lore", label: "Lore", icon: BookOpen },
        { id: "quests", label: "Quests & Rumors", icon: Compass, badge: activeQuestCount },
      ],
    },
    {
      title: "Scribe & Vault",
      items: [
        ...(isScribe
          ? [
              { id: "audio" as HubTabId, label: "Audio Scribe", icon: Mic },
              { id: "reviews" as HubTabId, label: "AI Reviews", icon: Bot },
            ]
          : []),
        { id: "sync", label: "Sync & Vault", icon: RefreshCw },
      ],
    },
  ];
}

export function AppSidebar({
  activeTab,
  onSelectTab,
  isScribe,
  onNewNote,
  onOpenTableTools,
  activeQuestCount,
}: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dnd_sidebar_collapsed");
      if (saved === "1") setCollapsed(true);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("dnd_sidebar_collapsed", next ? "1" : "0");
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const groups = getNavGroups(isScribe, activeQuestCount);

  return (
    <aside
      aria-label="Campaign Navigation"
      className={`hidden md:flex flex-col flex-shrink-0 border-r border-fantasy-700/80 bg-fantasy-850/95 transition-all duration-200 sticky top-[57px] h-[calc(100vh-57px)] ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Top Quick Actions & Collapse Toggle */}
      <div className="p-2.5 border-b border-fantasy-700/60 flex items-center justify-between gap-1.5">
        {!collapsed && (
          <button
            type="button"
            onClick={onNewNote}
            className="flex-1 px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow transition"
            title="Create a new Codex note"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Note</span>
          </button>
        )}
        {collapsed && (
          <button
            type="button"
            onClick={onNewNote}
            className="w-full p-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 flex items-center justify-center shadow transition"
            title="New Note"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
        {!collapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-fantasy-800 border border-transparent hover:border-fantasy-700 transition"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Grouped Navigation Items */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-4">
        {groups.map((group) => (
          <div key={group.title} className="space-y-1">
            {!collapsed && (
              <div className="px-2.5 pt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {group.title}
              </div>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition relative group ${
                    collapsed ? "justify-center" : "justify-between"
                  } ${
                    isActive
                      ? "bg-amber-600/20 text-amber-200 border border-amber-500/40 font-semibold shadow-sm"
                      : "text-slate-400 hover:text-slate-100 hover:bg-fantasy-800/90 border border-transparent"
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 ${
                        isActive ? "text-amber-400" : "text-slate-400 group-hover:text-amber-300"
                      }`}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </span>
                  {!collapsed && typeof item.badge === "number" && item.badge > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom Footer: Table Tools & Expand Button */}
      <div className="p-2.5 border-t border-fantasy-700/60 space-y-1.5">
        <button
          type="button"
          onClick={onOpenTableTools}
          title="Open Dice Roller & Initiative Tracker"
          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold bg-fantasy-800/80 hover:bg-fantasy-700 text-amber-200 border border-fantasy-700 transition ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <Dices className="w-4 h-4 text-amber-400 flex-shrink-0" />
          {!collapsed && <span>Dice & Initiative</span>}
        </button>

        {collapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="w-full p-2 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-fantasy-800 transition flex items-center justify-center"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
