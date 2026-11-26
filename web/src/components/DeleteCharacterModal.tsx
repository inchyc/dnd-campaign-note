"use client";

import React, { useState, useEffect } from "react";
import { Trash2, Loader2, AlertTriangle, Archive } from "lucide-react";
import { useFeedback } from "./FeedbackContext";

export interface DeleteCharacterTarget {
  id: string;
  name: string;
  character: string;
  role?: "scribe" | "player";
}

export interface DeleteCharacterResult {
  deletedUserId: string;
  character: string;
  permanent: boolean;
  remainingUsers: Array<{
    id: string;
    name: string;
    character: string;
    role: "scribe" | "player";
    class?: string;
    level?: number;
  }>;
  wasSelf: boolean;
}

interface DeleteCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  target: DeleteCharacterTarget | null;
  onDeleted: (result: DeleteCharacterResult) => void;
}

export function DeleteCharacterModal({
  isOpen,
  onClose,
  campaignId,
  target,
  onDeleted,
}: DeleteCharacterModalProps) {
  const { toast } = useFeedback();
  const [permanent, setPermanent] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPermanent(false);
      setError(null);
      setDeleting(false);
    }
  }, [isOpen, target?.id]);

  if (!isOpen || !target) return null;

  const handleConfirmDelete = async () => {
    if (!campaignId || !target.id || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${encodeURIComponent(campaignId)}/users`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: target.id, permanent }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        const msg = data.error || `Failed to delete character (HTTP ${res.status})`;
        setError(msg);
        toast(msg, { type: "error" });
        return;
      }

      try {
        localStorage.removeItem(`dnd_codex_cache_char_sheet_${target.id}`);
        localStorage.removeItem("dnd_codex_cache_party_data");
        localStorage.removeItem("dnd_codex_cache_home_dashboard");
      } catch {
        /* ignore */
      }

      toast(
        permanent
          ? `Permanently deleted ${target.character}.`
          : `Removed ${target.character} and archived their note.`,
        { type: "success" }
      );
      onClose();
      if (data.wasSelf) {
        window.location.reload();
        return;
      }
      onDeleted({
        deletedUserId: data.deletedUserId || target.id,
        character: data.character || target.character,
        permanent: Boolean(data.permanent),
        remainingUsers: data.remainingUsers || [],
        wasSelf: Boolean(data.wasSelf),
      });
    } catch (e: any) {
      const msg = e?.message || "Network error deleting character";
      setError(msg);
      toast(msg, { type: "error" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      onClick={() => !deleting && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-stone-900 border border-red-800/80 shadow-2xl p-6 space-y-4 text-slate-200"
      >
        <div className="flex items-center gap-3 text-red-400">
          <div className="p-2.5 rounded-xl bg-red-950 border border-red-800">
            {permanent ? <Trash2 className="w-6 h-6" /> : <Archive className="w-6 h-6 text-amber-400" />}
          </div>
          <div>
            <h3 className="text-base font-serif font-bold text-red-200">
              {permanent ? "Permanently Delete Character?" : "Remove Character?"}
            </h3>
            <p className="text-xs text-stone-400">
              Remove {target.character} ({target.name}) from this campaign
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-300 space-y-2">
          <p>
            You are about to remove <strong className="text-amber-300">{target.character}</strong>{" "}
            <span className="text-stone-400">(Player: {target.name})</span>.
          </p>
          <div className="text-stone-400 space-y-1 text-[11px] pt-1">
            <div>• Removes character from the campaign roster & login screen.</div>
            <div>• Deletes their active 5e character sheet and combat stats.</div>
            {permanent ? (
              <div className="text-rose-300 font-medium">
                • Permanently deletes their Obsidian note with no archive copy.
              </div>
            ) : (
              <div>
                • Archives their Obsidian note to{" "}
                <code className="text-amber-400">Notes/PC Notes/Archive/</code> (marked{" "}
                <code className="text-amber-400">archived</code> so it stays hidden from Party & Loot).
              </div>
            )}
          </div>
        </div>

        <label className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-950/30 border border-rose-800/50 text-xs text-rose-200 cursor-pointer hover:bg-rose-950/45 transition">
          <input
            type="checkbox"
            checked={permanent}
            onChange={(e) => setPermanent(e.target.checked)}
            disabled={deleting}
            className="mt-0.5 rounded border-rose-700 text-rose-600 focus:ring-0"
          />
          <span>
            <strong>Permanently delete character note instead of archiving</strong>
            <span className="block text-[11px] text-rose-300/80 mt-0.5">
              Recommended for test or mistake characters you never want to see again.
            </span>
          </span>
        </label>

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-700/70 text-rose-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={handleConfirmDelete}
            className={`px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow disabled:opacity-50 ${
              permanent ? "bg-red-600 hover:bg-red-500" : "bg-amber-600 hover:bg-amber-500 text-slate-950"
            }`}
          >
            {deleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{permanent ? "Deleting..." : "Removing..."}</span>
              </>
            ) : (
              <>
                {permanent ? <Trash2 className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                <span>{permanent ? "Permanently Delete" : "Archive & Remove"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
