"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Shield,
  ShieldAlert,
  Users,
  Check,
  Feather,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  UserCheck,
} from "lucide-react";

interface UserItem {
  id: string;
  name: string;
  character: string;
  role: "scribe" | "player";
}

interface ManageRolesModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  currentUserId: string;
  onRolesUpdated?: (users: UserItem[]) => void;
}

export function ManageRolesModal({
  isOpen,
  onClose,
  campaignId,
  currentUserId,
  onRolesUpdated,
}: ManageRolesModalProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/users`, { cache: "no-store" });
      const data = await res.json();
      if (data.success && data.users) {
        setUsers(data.users);
      }
    } catch (e: any) {
      setErrorMsg("Failed to load party members: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, campaignId]);

  if (!isOpen) return null;

  const handleToggleRole = async (targetUser: UserItem) => {
    const newRole = targetUser.role === "scribe" ? "player" : "scribe";
    setUpdatingId(targetUser.id);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/users/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: targetUser.id, newRole }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to update role");
        return;
      }
      setUsers(data.users);
      if (onRolesUpdated) {
        onRolesUpdated(data.users);
      }
    } catch (e: any) {
      setErrorMsg("Network error: " + e.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const activeScribes = users.filter((u) => u.role === "scribe");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-fantasy-900 border border-amber-600/50 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-fantasy-700/80 bg-fantasy-850/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300">
              <Feather className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-serif text-amber-100">
                Manage Party & Scribe Roles
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Assign Scribing duties to one or multiple players
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-fantasy-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational Callout */}
        <div className="p-4 bg-amber-950/30 border-b border-amber-600/30 text-xs text-amber-200/90 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-amber-300">
            <Sparkles className="w-3.5 h-3.5" />
            Shared Scribe Collaboration
          </div>
          <p className="text-slate-300 leading-relaxed">
            Multiple players can hold the Scribe role at the same time. Scribes can record session audio, run AI reviews, synthesize recap notes, and edit campaign lore.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 mx-4 mt-3 rounded-xl bg-rose-950/50 border border-rose-600/50 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Player List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
              <span>Loading party members...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs italic">
              No players found in this campaign.
            </div>
          ) : (
            users.map((u) => {
              const isScribe = u.role === "scribe";
              const isYou = u.id === currentUserId;
              const isLastScribe = isScribe && activeScribes.length <= 1;
              const isUpdating = updatingId === u.id;

              return (
                <div
                  key={u.id}
                  className={`p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                    isScribe
                      ? "bg-amber-950/20 border-amber-600/40"
                      : "bg-fantasy-850/80 border-fantasy-700/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold font-serif text-sm border ${
                        isScribe
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                          : "bg-fantasy-800 border-fantasy-700 text-slate-300"
                      }`}
                    >
                      {u.character.charAt(0) || u.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-100">{u.character}</span>
                        {isYou && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">Player: {u.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Role Pill */}
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border ${
                        isScribe
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm"
                          : "bg-slate-800/80 border-slate-700 text-slate-400"
                      }`}
                    >
                      <Shield className={`w-3 h-3 ${isScribe ? "text-amber-400" : "text-slate-400"}`} />
                      <span>{isScribe ? "Scribe" : "Player"}</span>
                    </span>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleRole(u)}
                      disabled={isUpdating || isLastScribe}
                      title={
                        isLastScribe
                          ? "Cannot remove the only remaining Scribe"
                          : isScribe
                          ? "Make standard player"
                          : "Promote to Scribe"
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                        isScribe
                          ? "bg-fantasy-800 hover:bg-rose-950/40 border border-fantasy-700 hover:border-rose-600/50 text-slate-300 hover:text-rose-300"
                          : "bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold shadow"
                      }`}
                    >
                      {isUpdating ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : isScribe ? (
                        <span>Make Player</span>
                      ) : (
                        <>
                          <Feather className="w-3.5 h-3.5" />
                          <span>Make Scribe</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-fantasy-700/80 bg-fantasy-850/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {activeScribes.length} Active {activeScribes.length === 1 ? "Scribe" : "Scribes"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-fantasy-800 hover:bg-fantasy-700 border border-fantasy-700 text-xs font-semibold text-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
