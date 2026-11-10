"use client";

import React, { useState } from "react";
import { X, Plus, Shield, Loader2, Sparkles, BookOpen, KeyRound } from "lucide-react";

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCampaignCreated: (campaign: { id: string; name: string }) => void;
}

export function CreateCampaignModal({
  isOpen,
  onClose,
  onCampaignCreated,
}: CreateCampaignModalProps) {
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [system, setSystem] = useState("D&D 5e");
  const [creatorName, setCreatorName] = useState("");
  const [creatorCharacter, setCreatorCharacter] = useState("");
  const [creatorPin, setCreatorPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !creatorName.trim() || !creatorPin.trim() || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          tagline: tagline.trim(),
          system: system.trim(),
          creatorName: creatorName.trim(),
          creatorCharacter: creatorCharacter.trim() || creatorName.trim(),
          creatorPin: creatorPin.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to create campaign");
        return;
      }

      onCampaignCreated(data.campaign);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create campaign");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-fantasy-850 border border-fantasy-700 rounded-2xl shadow-2xl p-6 space-y-5 text-slate-200"
      >
        <div className="flex items-center justify-between border-b border-fantasy-700/60 pb-3">
          <h3 className="font-serif font-bold text-lg text-amber-200 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Create New Campaign & Vault
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Anyone in your party can start a new campaign. You will be initialized as the <strong>Campaign DM & Scribe</strong> with full vault authoring authority.
        </p>

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Campaign Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Curse of Strahd or Descent into Avernus"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-fantasy-900 border border-fantasy-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Game System
              </label>
              <input
                type="text"
                placeholder="D&D 5e"
                value={system}
                onChange={(e) => setSystem(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-fantasy-900 border border-fantasy-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Your DM / Player Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Chris"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-fantasy-900 border border-fantasy-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Character Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Dungeon Master or Vex"
                value={creatorCharacter}
                onChange={(e) => setCreatorCharacter(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-fantasy-900 border border-fantasy-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-amber-400" /> Scribe PIN (4+ digits) *
              </label>
              <input
                type="password"
                required
                minLength={4}
                placeholder="e.g. 1234"
                value={creatorPin}
                onChange={(e) => setCreatorPin(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-fantasy-900 border border-fantasy-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Campaign Tagline & Lore Hook
            </label>
            <textarea
              rows={2}
              placeholder="Under the shadow of Castle Ravenloft, mists gather..."
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-fantasy-900 border border-fantasy-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-fantasy-700/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim() || !creatorName.trim() || !creatorPin.trim()}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 flex items-center gap-1.5 transition disabled:opacity-50 shadow"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Launch Campaign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
