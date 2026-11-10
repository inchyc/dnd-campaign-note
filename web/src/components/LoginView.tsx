"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Shield,
  KeyRound,
  Users,
  Lock,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Sparkles,
  Info,
  Scroll,
  BookOpen,
  RefreshCw,
  Plus,
} from "lucide-react";
import { CreateCampaignModal } from "./CreateCampaignModal";

interface HubUserPublic {
  id: string;
  name: string;
  character: string;
  role: "scribe" | "player";
}

interface CampaignInfo {
  id: string;
  name: string;
  tagline?: string;
  system?: string;
  chapter?: string;
}

interface LoginViewProps {
  onLoginSuccess: () => void;
}

const FALLBACK_USERS: HubUserPublic[] = [
  { id: "chris", name: "Chris", character: "Vex", role: "scribe" },
  { id: "travis", name: "Travis", character: "Cedric", role: "player" },
  { id: "johno", name: "Johno", character: "Colm", role: "player" },
  { id: "jess", name: "Jess", character: "Vola", role: "player" },
  { id: "damon", name: "Damon", character: "Erevan", role: "player" },
  { id: "victoria", name: "Victoria", character: "Aewren", role: "player" },
  { id: "jake", name: "Jake", character: "Ruik", role: "player" },
];

const DEFAULT_CAMPAIGN: CampaignInfo = {
  id: "starving-vilgeismar",
  name: "Starving Vilgeismar",
  tagline: "A gothic city under siege, hunger gnawing at the lower quarters while shadows stir in the canals.",
  system: "D&D 5e",
  chapter: "Chapter 1: The Withered Reach",
};

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [campaigns, setCampaigns] = useState<CampaignInfo[]>([DEFAULT_CAMPAIGN]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("starving-vilgeismar");
  const [step, setStep] = useState<"campaign" | "character" | "pin">("character");
  const [users, setUsers] = useState<HubUserPublic[]>(FALLBACK_USERS);
  const [selectedUser, setSelectedUser] = useState<HubUserPublic | null>(null);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Load users for a given campaign
  const fetchUsersForCampaign = useCallback(async (campId: string) => {
    if (!campId) return;
    setUsersLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campId}/users`, { cache: "no-store" });
      const data = await res.json();
      if (data.users && Array.isArray(data.users) && data.users.length > 0) {
        setUsers(data.users);
      } else {
        // Keep fallback users so login is never blocked
        setUsers(FALLBACK_USERS);
      }
    } catch (err) {
      console.warn("Could not fetch remote users, using cached fallback roster:", err);
      setUsers(FALLBACK_USERS);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // Fetch campaigns and initialize selection on mount
  useEffect(() => {
    fetch("/api/campaigns", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.campaigns && Array.isArray(data.campaigns) && data.campaigns.length > 0) {
          setCampaigns(data.campaigns);
          const savedCampaign = localStorage.getItem("dnd_last_campaign");
          const match = data.campaigns.find((c: CampaignInfo) => c.id === savedCampaign);
          const activeId = match ? match.id : data.campaigns[0].id;
          setSelectedCampaignId(activeId);
          fetchUsersForCampaign(activeId);
        } else {
          fetchUsersForCampaign("starving-vilgeismar");
        }
      })
      .catch((err) => {
        console.warn("Using default campaign config:", err);
        fetchUsersForCampaign("starving-vilgeismar");
      });
  }, [fetchUsersForCampaign]);

  const activeCampaign = campaigns.find((c) => c.id === selectedCampaignId) || campaigns[0] || DEFAULT_CAMPAIGN;

  const handleSelectCampaign = (c: CampaignInfo) => {
    setSelectedCampaignId(c.id);
    localStorage.setItem("dnd_last_campaign", c.id);
    setSelectedUser(null);
    setPin("");
    setError(null);
    setStep("character");
    fetchUsersForCampaign(c.id);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !pin.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign: selectedCampaignId,
          userId: selectedUser.id,
          pin: pin.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Incorrect PIN");
      }
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-fantasy-900 bg-radial-gradient text-slate-200">
      <div className="w-full max-w-xl bg-fantasy-850 border border-fantasy-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-amber-950/40 border border-amber-700/40 text-amber-400 mb-2 shadow-inner">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-amber-200 tracking-wide">
            D&D Campaign Notes
          </h1>
          {activeCampaign && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/40 border border-amber-600/30 text-amber-300 text-xs font-medium">
              <span>Campaign:</span>
              <span className="text-amber-100 font-semibold">{activeCampaign.name}</span>
            </div>
          )}
          <p className="text-xs text-slate-400">
            Obsidian Scribe & Tabletop Operations Hub
          </p>
        </div>

        {/* Step 0: Choose Campaign */}
        {step === "campaign" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-fantasy-700/60 pb-2">
              <span className="font-semibold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Scroll className="w-3.5 h-3.5 text-amber-400" />
                Select Campaign
              </span>
              <span>{campaigns.length} World{campaigns.length === 1 ? "" : "s"} Available</span>
            </div>

            <div className="space-y-3">
              {campaigns.map((camp) => (
                <button
                  key={camp.id}
                  type="button"
                  onClick={() => handleSelectCampaign(camp)}
                  className="w-full text-left p-4 rounded-xl bg-fantasy-800/80 hover:bg-fantasy-700/90 border border-fantasy-700 hover:border-amber-500/60 transition group relative overflow-hidden shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-base text-amber-200 group-hover:text-amber-100">
                          {camp.name}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-950/60 text-amber-400 border border-amber-800/60">
                          {camp.system || "D&D 5e"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {camp.tagline || "Active campaign chronicle."}
                      </p>
                      {camp.chapter && (
                        <div className="text-[11px] text-amber-300/80 font-mono pt-1">
                          ⚔️ {camp.chapter}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all mt-1" />
                  </div>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="w-full p-3.5 rounded-xl border border-dashed border-amber-600/50 hover:border-amber-400 bg-amber-950/20 hover:bg-amber-950/40 text-amber-300 font-semibold text-xs flex items-center justify-center gap-2 transition shadow"
            >
              <Plus className="w-4 h-4" /> Create New Campaign & Vault
            </button>
          </div>
        )}

        {/* Step 1: Choose Character / Player */}
        {step === "character" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-fantasy-700/60 pb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep("campaign")}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-amber-300 transition"
                  title="Switch to another campaign"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="underline">Change Campaign</span>
                </button>
              </div>
              <span className="font-semibold uppercase tracking-wider text-amber-300">
                Select Your Character
              </span>
            </div>

            {usersLoading && users.length === 0 ? (
              <div className="py-12 flex justify-center text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-xs text-slate-400">No adventurers found for {activeCampaign.name}.</p>
                <button
                  type="button"
                  onClick={() => fetchUsersForCampaign(selectedCampaignId)}
                  className="px-4 py-2 rounded-lg bg-fantasy-800 border border-fantasy-700 text-amber-300 text-xs inline-flex items-center gap-1.5 hover:bg-fantasy-700"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reload Adventurers
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {users.map((u) => {
                  const isScribe = u.role === "scribe";
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setSelectedUser(u);
                        setPin("");
                        setError(null);
                        setStep("pin");
                      }}
                      className={`p-3.5 rounded-xl border text-left transition flex items-center justify-between group shadow ${
                        isScribe
                          ? "bg-amber-950/30 border-amber-600/60 hover:bg-amber-900/40 hover:border-amber-400"
                          : "bg-fantasy-800 hover:bg-fantasy-700 border-fantasy-700 hover:border-slate-500"
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-serif font-bold text-sm text-amber-200 group-hover:text-amber-100 flex items-center gap-1.5">
                          {u.character}
                          {isScribe && (
                            <span className="px-1.5 py-0.2 text-[9px] uppercase font-bold rounded bg-amber-500 text-slate-950">
                              Scribe
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">Player: {u.name}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Enter PIN */}
        {step === "pin" && selectedUser && (
          <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in duration-150">
            <div className="p-4 rounded-xl bg-fantasy-900/80 border border-fantasy-700 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Signing In As:
                </span>
                <h3 className="font-serif font-bold text-base text-amber-200">
                  {selectedUser.character}{" "}
                  <span className="text-xs text-slate-400 font-sans font-normal">
                    ({selectedUser.name})
                  </span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedUser(null);
                  setPin("");
                  setStep("character");
                }}
                className="text-xs text-amber-400 hover:text-amber-300 underline inline-flex items-center gap-1"
              >
                <ChevronLeft className="w-3 h-3" />
                Change Player
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Enter 4-Digit PIN</span>
                <span className="text-[11px] text-slate-500">(Default PIN: 1234)</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  maxLength={10}
                  className="w-full pl-9 pr-4 py-2.5 bg-fantasy-900 border border-fantasy-700 rounded-xl text-center text-lg tracking-widest font-mono text-amber-200 focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-700/60 text-rose-300 text-xs text-center font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !pin.trim()}
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-serif font-bold text-sm shadow-lg disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              Unlock Campaign Codex
            </button>
          </form>
        )}

        <CreateCampaignModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onCampaignCreated={(newCamp) => {
            setIsCreateOpen(false);
            fetch("/api/campaigns", { cache: "no-store" })
              .then((r) => r.json())
              .then((d) => {
                if (d.campaigns) setCampaigns(d.campaigns);
                setSelectedCampaignId(newCamp.id);
                fetchUsersForCampaign(newCamp.id);
                setStep("character");
              });
          }}
        />

        {/* Android App & Version Footer */}
        <div className="pt-2 text-center text-xs text-slate-500 flex items-center justify-center gap-3 border-t border-fantasy-700/50">
          <a
            href="https://github.com/inchyc/dnd-campaign-note/raw/main/release/D&D-Campaign-Notes.apk"
            className="hover:text-amber-400 transition flex items-center gap-1 font-medium"
          >
            <span>📱 Download Android App (v1.1.1)</span>
          </a>
          <span>•</span>
          <a
            href="https://github.com/inchyc/dnd-campaign-note/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-amber-400 transition"
          >
            Releases & Changelog
          </a>
        </div>
      </div>
    </div>
  );
}
