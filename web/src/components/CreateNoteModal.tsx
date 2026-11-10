"use client";

import React, { useState } from "react";
import { X, Plus, FileText, Loader2, EyeOff, Shield } from "lucide-react";

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: string; // "npc" | "location" | "lore" | "quest"
  isScribe: boolean;
  onNoteCreated: (path: string) => void;
}

export function CreateNoteModal({
  isOpen,
  onClose,
  defaultCategory = "npc",
  isScribe,
  onNoteCreated,
}: CreateNoteModalProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [subfolder, setSubfolder] = useState("");
  const [secret, setSecret] = useState(false);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          create: true,
          category,
          title: title.trim(),
          sub: subfolder.trim() || undefined,
          secret: isScribe ? secret : false,
          body: body.trim() || `# ${title.trim()}\n\nNew record added to the codex.`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to create note");
        return;
      }

      onNoteCreated(data.path);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create note");
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
            <FileText className="w-5 h-5 text-amber-400" />
            Add New Codex Record
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Title / Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Captain Vaelor or The Weeping Crypt"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-fantasy-900 border border-fantasy-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-fantasy-900 border border-fantasy-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="npc">NPC / Person</option>
                <option value="location">Location / Place</option>
                <option value="lore">Lore / Faction / Relic</option>
                <option value="quest">Quest / Inquiry</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Sub-folder (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Factions, Inns"
                value={subfolder}
                onChange={(e) => setSubfolder(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-fantasy-900 border border-fantasy-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {isScribe && (
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={secret}
                onChange={(e) => setSecret(e.target.checked)}
                className="rounded border-fantasy-700 text-amber-600 focus:ring-0"
              />
              <span className="flex items-center gap-1.5 text-rose-300 font-semibold">
                <EyeOff className="w-3.5 h-3.5" /> Secret / DM Eyes Only (hidden from players)
              </span>
            </label>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Initial Notes & Markdown Content
            </label>
            <textarea
              rows={4}
              placeholder="Record known details, description, dialogue, or secrets..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-fantasy-900 border border-fantasy-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 font-mono text-xs"
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
              disabled={submitting || !title.trim()}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 flex items-center gap-1.5 transition disabled:opacity-50 shadow"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
