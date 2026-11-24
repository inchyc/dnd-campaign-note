"use client";

import React, { useEffect } from "react";
import { X, Plus, Dices, ExternalLink } from "lucide-react";
import { getNavGroups, HubTabId } from "./AppSidebar";

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: HubTabId;
  onSelectTab: (tab: HubTabId) => void;
  isScribe: boolean;
  onNewNote: () => void;
  onOpenTableTools: () => void;
  activeQuestCount?: number;
  campaignName?: string;
}

export function MobileNavDrawer({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  isScribe,
  onNewNote,
  onOpenTableTools,
  activeQuestCount,
  campaignName,
}: MobileNavDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const groups = getNavGroups(isScribe, activeQuestCount);

  return (
    <div className="md:hidden fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <aside
        aria-label="Mobile Campaign Navigation"
        className="relative z-10 w-72 max-w-[85vw] h-full bg-fantasy-850 border-r border-fantasy-700/80 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-fantasy-700/60 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-xs font-serif font-bold text-amber-200 truncate">
              {campaignName || "Campaign Hub"}
            </div>
            <div className="text-[10px] text-slate-400">Navigation</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-fantasy-800 transition"
            aria-label="Close navigation menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="p-3 border-b border-fantasy-700/60 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onNewNote();
            }}
            className="px-2.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Note</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenTableTools();
            }}
            className="px-2.5 py-2 rounded-lg bg-fantasy-800 hover:bg-fantasy-700 border border-fantasy-700 text-amber-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <Dices className="w-3.5 h-3.5 text-amber-400" />
            <span>Table Tools</span>
          </button>
        </div>

        {/* Grouped Navigation (mirrors AppSidebar) */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-4">
          {groups.map((group) => (
            <div key={group.title} className="space-y-1">
              <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {group.title}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                      isActive
                        ? "bg-amber-500/15 text-amber-300 border border-amber-500/40 font-semibold shadow-sm"
                        : "text-slate-300 hover:text-amber-100 hover:bg-fantasy-800/80 border border-transparent"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 ${
                          isActive ? "text-amber-400" : "text-slate-400"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer 5e.tools link */}
        <div className="p-3 border-t border-fantasy-700/60">
          <a
            href="https://5e.tools"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-fantasy-800 hover:bg-fantasy-700 border border-fantasy-700 text-xs text-amber-300 font-medium transition"
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            <span>Open 5e.tools Reference</span>
          </a>
        </div>
      </aside>
    </div>
  );
}
