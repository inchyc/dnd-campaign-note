"use client";

import React, { useState } from "react";
import { X, Sparkles, User, Shield, KeyRound, Loader2, BookOpen, AlertCircle } from "lucide-react";

interface HubUserPublic {
  id: string;
  name: string;
  character: string;
  role: "scribe" | "player";
}

interface JoinCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  campaignName: string;
  onJoined: (user: HubUserPublic) => void;
  autoLogin?: boolean;
}

const COMMON_CLASSES = [
  "Barbarian",
  "Bard",
  "Cleric",
  "Druid",
  "Fighter",
  "Monk",
  "Paladin",
  "Ranger",
  "Rogue",
  "Sorcerer",
  "Warlock",
  "Wizard",
  "Artificer",
  "Blood Hunter",
];

export function JoinCampaignModal({
  isOpen,
  onClose,
  campaignId,
  campaignName,
  onJoined,
  autoLogin = true,
}: JoinCampaignModalProps) {
  const [name, setName] = useState("");
  const [character, setCharacter] = useState("");
  const [pin, setPin] = useState("");
  const [characterClass, setCharacterClass] = useState("Fighter");
  const [level, setLevel] = useState("1");
  const [role, setRole] = useState<"player" | "scribe">("player");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !character.trim()) {
      setError("Please enter both player name and character name.");
      return;
    }
    if (!pin.trim() || pin.length < 3) {
      setError("PIN must be at least 3 digits/characters.");
      return;
    }

    setLoading(true);
    setErrorLog: setError(null);

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/users/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          character: character.trim(),
          pin: pin.trim(),
          role,
          class: characterClass,
          level: parseInt(level, 10) || 1,
          autoLogin,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to register adventurer");
        return;
      }

      onJoined(data.user);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-fantasy-900 border border-emerald-600/50 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-fantasy-700/80 bg-fantasy-850 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-serif text-emerald-100">
                Join Campaign Roster
              </h2>
              <p className="text-xs text-slate-400">
                {campaignName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-fantasy-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Player Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Travis"
                className="w-full px-3 py-2 rounded-lg bg-fantasy-800 border border-fantasy-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Character Name *
              </label>
              <input
                type="text"
                required
                value={character}
                onChange={(e) => setCharacter(e.target.value)}
                placeholder="e.g. Cedric"
                className="w-full px-3 py-2 rounded-lg bg-fantasy-800 border border-fantasy-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Class
              </label>
              <select
                value={characterClass}
                onChange={(e) => setCharacterClass(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-fantasy-800 border border-fantasy-700 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                {COMMON_CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Starting Level
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-fantasy-800 border border-fantasy-700 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Personal PIN (3+ digits) *
            </label>
            <input
              type="password"
              inputMode="numeric"
              required
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="e.g. 1234"
              className="w-full px-3 py-2 rounded-lg bg-fantasy-800 border border-fantasy-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Used whenever you sign in as this character.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Party Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("player")}
                className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  role === "player"
                    ? "bg-emerald-600/30 border-emerald-500 text-emerald-200"
                    : "bg-fantasy-800 border-fantasy-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Player
              </button>
              <button
                type="button"
                onClick={() => setRole("scribe")}
                className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  role === "scribe"
                    ? "bg-amber-600/30 border-amber-500 text-amber-200"
                    : "bg-fantasy-800 border-fantasy-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Scribe (Co-DM)
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Scribes can edit DM secrets, assign party roles, and run audio transcription. Multiple scribes can exist at once!
            </p>
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-fantasy-700/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-fantasy-800 hover:bg-fantasy-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Joining...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Join Campaign</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
