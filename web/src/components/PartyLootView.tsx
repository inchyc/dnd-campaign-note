"use client";

import React, { useState } from "react";
import {
  Users,
  Backpack,
  Shield,
  Eye,
  EyeOff,
  UserCheck,
  ChevronRight,
  PackageCheck,
  PackageX,
  FileText,
  Sparkles,
  Lock,
  Plus,
  Search,
} from "lucide-react";
import { getStatusBadge } from "@/lib/statusConfig";

interface CharacterMeta {
  path: string;
  title: string;
  summary?: string;
  mine?: boolean;
  visibleToParty?: boolean;
  status?: string;
  class?: string;
  level?: string;
}

interface ItemMeta {
  path: string;
  title: string;
  summary?: string;
  owner?: string;
  quantity?: string;
  status?: string;
}

interface PartyLootViewProps {
  characters: CharacterMeta[];
  loot: ItemMeta[];
  myItems: ItemMeta[];
  claimedItems: ItemMeta[];
  inventoryPath?: string;
  currentUser: { id: string; name: string; character: string; role: "scribe" | "player" } | null;
  isScribe?: boolean;
  onOpenManageRoles?: () => void;
  onSelectNote: (path: string) => void;
  onClaimItem: (path: string, owner: string) => Promise<void>;
  onToggleCharacterVisibility: (path: string, currentVisible: boolean) => Promise<void>;
}

export function PartyLootView({
  characters,
  loot,
  myItems,
  claimedItems,
  inventoryPath,
  currentUser,
  isScribe,
  onOpenManageRoles,
  onSelectNote,
  onClaimItem,
  onToggleCharacterVisibility,
}: PartyLootViewProps) {
  const [activeTab, setActiveTab] = useState<"party" | "loot" | "myItems">("party");
  const [claimingPath, setClaimingPath] = useState<string | null>(null);
  const [lootSearchQuery, setLootSearchQuery] = useState<string>("");

  const filteredLoot = loot.filter((item) =>
    !lootSearchQuery.trim() ||
    item.title.toLowerCase().includes(lootSearchQuery.toLowerCase()) ||
    (item.summary || "").toLowerCase().includes(lootSearchQuery.toLowerCase())
  );

  const filteredMyItems = myItems.filter((item) =>
    !lootSearchQuery.trim() ||
    item.title.toLowerCase().includes(lootSearchQuery.toLowerCase()) ||
    (item.summary || "").toLowerCase().includes(lootSearchQuery.toLowerCase())
  );

  const handleClaim = async (path: string, newOwner: string) => {
    setClaimingPath(path);
    try {
      await onClaimItem(path, newOwner);
    } finally {
      setClaimingPath(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Top Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-fantasy-700/60 gap-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-amber-200 flex items-center gap-2">
            <Backpack className="w-5 h-5 text-amber-400" />
            Party & Camp Stash
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage the adventuring party, individual character dossiers, and shared spoils of war
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-fantasy-900 border border-fantasy-700 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab("party")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
              activeTab === "party"
                ? "bg-amber-600 text-slate-950 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Adventuring Party ({characters.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("loot")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
              activeTab === "loot"
                ? "bg-amber-600 text-slate-950 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Backpack className="w-3.5 h-3.5" /> Unclaimed Stash ({loot.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("myItems")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
              activeTab === "myItems"
                ? "bg-amber-600 text-slate-950 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> My Equipment ({myItems.length})
          </button>
        </div>
      </div>

      {/* TAB 1: Adventuring Party */}
      {activeTab === "party" && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-fantasy-900/60 border border-fantasy-700/60 text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>
              🔒 <strong>Privacy Rules:</strong> Each player's character note is private by default and visible only to them and the Scribe, unless they toggle it to <strong>Visible to Party</strong>.
            </span>
            {isScribe && onOpenManageRoles && (
              <button
                type="button"
                onClick={onOpenManageRoles}
                className="px-3 py-1.5 rounded-lg bg-amber-600/25 hover:bg-amber-600/40 border border-amber-600/50 text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
              >
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Manage Party Roles</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {characters.map((char) => {
              const isMine = char.mine || (currentUser && char.title.toLowerCase().includes(currentUser.character.toLowerCase()));
              const canToggle = isMine || currentUser?.role === "scribe";
              const isPublic = char.visibleToParty;

              return (
                <div
                  key={char.path}
                  onClick={() => onSelectNote(char.path)}
                  className={`p-5 rounded-xl border transition cursor-pointer flex flex-col justify-between group shadow ${
                    isMine
                      ? "bg-amber-950/20 border-amber-600/50 hover:border-amber-400"
                      : "bg-fantasy-850 hover:bg-fantasy-800 border-fantasy-700 hover:border-slate-500"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="p-2 rounded-lg bg-fantasy-800 text-amber-300 border border-fantasy-700">
                          <Users className="w-4 h-4" />
                        </span>
                        <div>
                          <h3 className="font-serif font-bold text-base text-amber-200 group-hover:text-amber-100 flex items-center gap-1.5 flex-wrap">
                            {char.title}
                            {isMine && (
                              <span className="px-1.5 py-0.2 text-[10px] bg-amber-500 text-slate-950 font-bold rounded uppercase">
                                You
                              </span>
                            )}
                            {(() => {
                              const badge = getStatusBadge("party", char.status);
                              if (!badge) return null;
                              return (
                                <span className={`px-1.5 py-0.2 text-[9px] font-semibold rounded border flex items-center gap-1 ${badge.badgeClass}`}>
                                  <span>{badge.icon}</span>
                                  <span>{badge.label}</span>
                                </span>
                              );
                            })()}
                          </h3>
                          {(char.class || char.level) && (
                            <p className="text-xs text-slate-400">
                              {char.class || "Adventurer"} {char.level ? `· Level ${char.level}` : ""}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Visibility indicator / toggle button */}
                      {canToggle ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleCharacterVisibility(char.path, !!isPublic);
                          }}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 ${
                            isPublic
                              ? "bg-emerald-950/70 border-emerald-500 text-emerald-300 hover:bg-emerald-900/60"
                              : "bg-fantasy-800 border-amber-600/50 text-amber-300 hover:bg-fantasy-750"
                          }`}
                          title={
                            isPublic
                              ? "Public to whole party. Click to make Private."
                              : "Private to you. Click to Share with party."
                          }
                        >
                          {isPublic ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-amber-400" />}
                          <span>{isPublic ? "Shared" : "Private"}</span>
                        </button>
                      ) : isPublic ? (
                        <span className="px-2 py-0.5 text-[10px] rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 flex items-center gap-1 font-medium">
                          <Eye className="w-3 h-3 text-emerald-400" /> 👥 Shared
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] rounded bg-slate-900 text-slate-500 border border-slate-700 flex items-center gap-1 font-medium">
                          <Lock className="w-3 h-3 text-slate-500" /> 👤 Private
                        </span>
                      )}
                    </div>

                    {char.summary && (
                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed pt-1">
                        {char.summary}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-fantasy-700/50 flex items-center justify-between text-xs text-slate-400">
                    <span className="text-[11px] text-slate-500">
                      {isMine ? "Edit or view dossier" : "View dossier"}
                    </span>
                    <span className="text-amber-400 font-medium group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                      Open <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Unclaimed Party Loot */}
      {activeTab === "loot" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg bg-fantasy-900/60 border border-fantasy-700/60 text-xs text-slate-300 gap-3">
            <span>
              📦 <strong>Unclaimed Loot:</strong> Spoils recovered from tombs, cultists, and ruins that haven't been claimed by a specific adventurer.
            </span>
            {inventoryPath && (
              <button
                type="button"
                onClick={() => onSelectNote(inventoryPath)}
                className="text-amber-400 hover:text-amber-300 underline font-medium flex items-center gap-1 flex-shrink-0"
              >
                <FileText className="w-3.5 h-3.5" /> Full Party Inventory Note
              </button>
            )}
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={lootSearchQuery}
              onChange={(e) => setLootSearchQuery(e.target.value)}
              placeholder="Filter stash items by name or description..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-fantasy-900 border border-fantasy-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {filteredLoot.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              {lootSearchQuery ? "No stash items match your search." : "The party stash is currently empty."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLoot.map((item) => (
                <div
                  key={item.path}
                  onClick={() => onSelectNote(item.path)}
                  className="p-4 rounded-xl bg-fantasy-850 hover:bg-fantasy-800 border border-fantasy-700/80 hover:border-amber-500/40 transition cursor-pointer flex flex-col justify-between shadow group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-serif font-semibold text-sm text-amber-200 group-hover:text-amber-100">
                        {item.title}
                      </h4>
                      <span className="px-2 py-0.5 text-[10px] rounded bg-fantasy-800 text-slate-400 border border-fantasy-700">
                        Unclaimed
                      </span>
                    </div>

                    {item.summary && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {item.summary}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-fantasy-700/40 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">General Stash</span>
                    {currentUser && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClaim(item.path, currentUser.character);
                        }}
                        disabled={claimingPath === item.path}
                        className="px-3 py-1 text-xs font-semibold rounded bg-amber-600 hover:bg-amber-500 text-slate-950 transition flex items-center gap-1 shadow"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        Claim Item
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: My Equipment */}
      {activeTab === "myItems" && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-fantasy-900/60 border border-fantasy-700/60 text-xs text-slate-300">
            ⚔️ <strong>{currentUser?.character || "Your"}'s Inventory:</strong> Items and equipment claimed by your character. You can return them to the party stash at any time.
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={lootSearchQuery}
              onChange={(e) => setLootSearchQuery(e.target.value)}
              placeholder="Filter your claimed gear..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-fantasy-900 border border-fantasy-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {filteredMyItems.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              {lootSearchQuery ? "No equipment matches your search." : "You haven't claimed any specific items yet. Check the Unclaimed Stash tab!"}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMyItems.map((item) => (
                <div
                  key={item.path}
                  onClick={() => onSelectNote(item.path)}
                  className="p-4 rounded-xl bg-fantasy-850 hover:bg-fantasy-800 border border-amber-600/40 hover:border-amber-400 transition cursor-pointer flex flex-col justify-between shadow group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-serif font-semibold text-sm text-amber-200 group-hover:text-amber-100">
                        {item.title}
                      </h4>
                      <span className="px-2 py-0.5 text-[10px] rounded bg-emerald-950/60 text-emerald-300 border border-emerald-700/50">
                        In Inventory
                      </span>
                    </div>

                    {item.summary && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {item.summary}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-fantasy-700/40 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Owner: {currentUser?.character}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClaim(item.path, "party");
                      }}
                      disabled={claimingPath === item.path}
                      className="px-2.5 py-1 text-xs font-medium rounded bg-fantasy-800 hover:bg-rose-950/50 hover:text-rose-300 border border-fantasy-700 text-slate-300 transition flex items-center gap-1"
                      title="Return item to party stash"
                    >
                      <PackageX className="w-3.5 h-3.5" />
                      Return to Stash
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
