"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  KeyRound,
  Users,
  Lock,
  ChevronRight,
  Loader2,
  Sparkles,
  Info,
} from "lucide-react";

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
}

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [campaigns, setCampaigns] = useState<CampaignInfo[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("starving-miracle");
  const [users, setUsers] = useState<HubUserPublic[]>([]);
  const [selectedUser, setSelectedUser] = useState<HubUserPublic | null>(null);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch campaigns
  useEffect(() => {
    fetch("/api/campaigns")
      .then((res) => res.json())
      .then((data) => {
        if (data.campaigns?.length) {
          setCampaigns(data.campaigns);
          setSelectedCampaignId(data.campaigns[0].id);
        }
      })
      .catch((err) => console.error("Error loading campaigns", err));
  }, []);

  // Fetch users for selected campaign
  useEffect(() => {
    if (!selectedCampaignId) return;
    setLoading(true);
    fetch(`/api/campaigns/${selectedCampaignId}/users`)
      .then((res) => res.json())
      .then((data) => {
        if (data.users) {
          setUsers(data.users);
        }
      })
      .catch((err) => console.error("Error loading campaign users", err))
      .finally(() => setLoading(false));
  }, [selectedCampaignId]);

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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/40 border border-amber-600/30 text-amber-300 text-xs font-medium">
            <span>Campaign:</span>
            <span className="text-amber-100 font-semibold">Starving Vilgeismar</span>
          </div>
          <p className="text-xs text-slate-400">
            Obsidian Scribe & Tabletop Operations Hub
          </p>
        </div>

        {/* Step 1: Choose Character / Player */}
        {!selectedUser ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-fantasy-700/60 pb-2">
              <span className="font-semibold uppercase tracking-wider text-amber-300">
                Select Your Character
              </span>
              <span>{users.length} Adventurers Registered</span>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
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
        ) : (
          /* Step 2: Enter PIN */
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
                onClick={() => setSelectedUser(null)}
                className="text-xs text-amber-400 hover:text-amber-300 underline"
              >
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
      </div>
    </div>
  );
}
