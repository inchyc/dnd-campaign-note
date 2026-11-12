"use client";

import React, { useState } from "react";
import { X, Sparkles, Upload, Link as LinkIcon, Check, Trash2, User } from "lucide-react";

interface CharacterPortraitModalProps {
  currentAvatarUrl?: string;
  characterName: string;
  characterRace: string;
  characterClass: string;
  onClose: () => void;
  onSaveAvatar: (url: string) => Promise<void>;
}

export function CharacterPortraitModal({
  currentAvatarUrl,
  characterName,
  characterRace,
  characterClass,
  onClose,
  onSaveAvatar,
}: CharacterPortraitModalProps) {
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl || "");
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  // File Upload to Data URI
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setAvatarUrl(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Generate AI Portrait prompt / thematic avatar
  const handleGenerateAiPortrait = async () => {
    setAiGenerating(true);
    try {
      // High quality fantasy character art seed from Unsplash/Lexica style fantasy portraits
      const prompt = encodeURIComponent(
        `dungeons and dragons fantasy portrait of ${characterName}, ${characterRace} ${characterClass}, detailed digital art, sharp focus, cinematic lighting`
      );
      // Fast high quality fantasy avatar generator proxy
      const generatedUrl = `https://image.pollinations.ai/prompt/${prompt}?width=512&height=512&nologo=true`;
      setAvatarUrl(generatedUrl);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveAvatar(avatarUrl);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-stone-900 border border-amber-600/40 rounded-2xl shadow-2xl p-6 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-amber-400" />
            <h3 className="font-serif font-bold text-lg text-amber-100">
              Character Portrait
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Preview */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-32 h-32 rounded-2xl overflow-hidden bg-stone-950 border-2 border-amber-500/50 shadow-xl flex items-center justify-center relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={characterName}
                className="w-full h-full object-cover"
                onError={() => {
                  alert("Image failed to load. Please verify the URL.");
                }}
              />
            ) : (
              <User className="w-16 h-16 text-stone-600" />
            )}
          </div>
          {avatarUrl && (
            <button
              type="button"
              onClick={() => setAvatarUrl("")}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove Image
            </button>
          )}
        </div>

        {/* Input Methods */}
        <div className="space-y-4">
          {/* Method 1: Image URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5" />
              Image Web URL
            </label>
            <input
              type="url"
              value={avatarUrl.startsWith("data:") ? "" : avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/character.png"
              className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Method 2: Local File Upload */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" />
              Upload Image File
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="w-full text-xs text-stone-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-stone-800 file:text-stone-200 hover:file:bg-stone-700 cursor-pointer"
            />
          </div>

          {/* Method 3: AI Portrait Generator */}
          <div className="pt-2 border-t border-stone-800">
            <button
              type="button"
              disabled={aiGenerating}
              onClick={handleGenerateAiPortrait}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-900/60 to-amber-900/60 hover:from-purple-800/80 hover:to-amber-800/80 border border-purple-500/40 text-purple-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              {aiGenerating ? "Generating Fantasy Art..." : "Generate AI Fantasy Portrait"}
            </button>
            <p className="text-[11px] text-stone-500 text-center mt-1">
              Crafts a prompt using your character&apos;s race ({characterRace}) and class ({characterClass}).
            </p>
          </div>
        </div>

        {/* Save Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs shadow-lg shadow-amber-900/30 transition-all disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {saving ? "Saving..." : "Apply Portrait"}
          </button>
        </div>
      </div>
    </div>
  );
}
