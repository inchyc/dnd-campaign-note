"use client";

import React, { useState, useEffect } from "react";
import {
  Bot,
  Sparkles,
  CheckCircle2,
  FolderCheck,
  FilePlus,
  Edit3,
  Clock,
  ArrowRight,
  Eye,
  Loader2,
  X,
  FileText,
  AlertCircle,
} from "lucide-react";
import { MarkdownView } from "./MarkdownView";

interface SessionReview {
  id: string;
  sessionName: string;
  status: "pending_review" | "applied";
  summary: string;
  newEntities: Array<{
    name: string;
    type: string;
    filePath: string;
    content: string;
  }>;
  updates: Array<{
    name: string;
    targetFile: string;
    statusUpdate?: string;
    rationale: string;
    content: string;
  }>;
  resolvedTasks: string[];
  newTasks: string[];
}

interface PreviewItem {
  title: string;
  type: "new" | "update";
  category?: string;
  targetFile?: string;
  statusUpdate?: string;
  rationale?: string;
  content: string;
}

export function ScribeReviewsView() {
  const [reviews, setReviews] = useState<SessionReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/scribe/reviews");
      const data = await res.json();
      if (data.success) {
        setReviews(data.reviews || []);
        if (data.reviews?.length > 0 && !selectedReviewId) {
          setSelectedReviewId(data.reviews[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load reviews", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleApplyReview = async (id: string) => {
    if (!confirm(`Are you sure you want to approve and apply all staged updates for ${id} directly into the Obsidian vault?`)) {
      return;
    }
    setApplyingId(id);
    try {
      const res = await fetch(`/api/scribe/reviews/${encodeURIComponent(id)}/apply`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to apply review");
        return;
      }
      alert(`Successfully applied! ${data.appliedNew} files created, ${data.appliedUpdates} files updated.`);
      await fetchReviews();
    } catch (e: any) {
      alert("Error applying review: " + e.message);
    } finally {
      setApplyingId(null);
    }
  };

  const activeReview = reviews.find((r) => r.id === selectedReviewId) || reviews[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-fantasy-700/60 gap-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-amber-200 flex items-center gap-2">
            <Bot className="w-5 h-5 text-amber-400" />
            AI Lore-Master Staged Reviews
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Review proposed new entities, lore updates, and task resolutions before applying them to Obsidian
          </p>
        </div>

        <button
          type="button"
          onClick={fetchReviews}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-fantasy-800 hover:bg-fantasy-700 border border-fantasy-700 text-slate-300 transition"
        >
          Refresh Staged Reviews
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-20 text-center text-slate-500 space-y-2 bg-fantasy-900/40 rounded-xl border border-fantasy-700">
          <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 opacity-60" />
          <p className="text-sm font-serif">All session notes have been processed and applied!</p>
          <p className="text-xs text-slate-600">No pending reviews in _Review/</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Sessions List */}
          <div className="lg:col-span-1 space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
              Staged Sessions ({reviews.length})
            </span>
            <div className="space-y-1.5">
              {reviews.map((rev) => {
                const isSelected = rev.id === activeReview?.id;
                const isApplied = rev.status === "applied";

                return (
                  <button
                    key={rev.id}
                    type="button"
                    onClick={() => {
                      setSelectedReviewId(rev.id);
                      setPreviewItem(null);
                    }}
                    className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between group ${
                      isSelected
                        ? "bg-amber-950/40 border-amber-500 text-amber-200"
                        : "bg-fantasy-850 hover:bg-fantasy-800 border-fantasy-700 text-slate-300"
                    }`}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="font-serif font-semibold text-xs truncate">
                        {rev.sessionName}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                        <span>{rev.newEntities.length} new</span>
                        <span>•</span>
                        <span>{rev.updates.length} updates</span>
                      </div>
                    </div>
                    {isApplied ? (
                      <span className="px-1.5 py-0.2 text-[9px] rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 font-semibold uppercase">
                        Applied
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 text-[9px] rounded bg-amber-950/60 text-amber-400 border border-amber-800/60 font-semibold uppercase">
                        Review
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Review Details & Diff Viewer */}
          <div className="lg:col-span-3 space-y-6">
            {activeReview && (
              <div className="p-6 rounded-2xl bg-fantasy-850 border border-fantasy-700 shadow-xl space-y-6">
                {/* Review Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-fantasy-700 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif font-bold text-lg text-amber-200">
                        {activeReview.sessionName}
                      </h3>
                      {activeReview.status === "applied" ? (
                        <span className="px-2 py-0.5 text-xs rounded bg-emerald-950/60 text-emerald-300 border border-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Applied to Vault
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs rounded bg-amber-950/60 text-amber-300 border border-amber-700 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Pending Your Approval
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      Staged in <code>_Review/{activeReview.id}</code>
                    </p>
                  </div>

                  {activeReview.status !== "applied" && (
                    <button
                      type="button"
                      onClick={() => handleApplyReview(activeReview.id)}
                      disabled={applyingId === activeReview.id}
                      className="px-5 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-lg flex items-center gap-2 transition disabled:opacity-50"
                    >
                      {applyingId === activeReview.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <FolderCheck className="w-4 h-4" />
                      )}
                      Approve & Apply to Vault
                    </button>
                  )}
                </div>

                {/* Synthesis Summary */}
                {activeReview.summary && (
                  <div className="p-4 rounded-xl bg-fantasy-900 border border-fantasy-700/80 space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Session Narrative Synthesis
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {activeReview.summary}
                    </p>
                  </div>
                )}

                {/* Tasks Impact */}
                {(activeReview.resolvedTasks.length > 0 || activeReview.newTasks.length > 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-2">
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Resolved Tasks ({activeReview.resolvedTasks.length})
                      </span>
                      {activeReview.resolvedTasks.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">None resolved</p>
                      ) : (
                        <ul className="space-y-1 pl-4 list-disc text-xs text-slate-300 marker:text-emerald-500">
                          {activeReview.resolvedTasks.map((t, idx) => (
                            <li key={idx}>{t}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/40 space-y-2">
                      <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                        <Clock className="w-4 h-4" /> New Follow-Ups / Leads ({activeReview.newTasks.length})
                      </span>
                      {activeReview.newTasks.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No new tasks</p>
                      ) : (
                        <ul className="space-y-1 pl-4 list-disc text-xs text-slate-300 marker:text-amber-500">
                          {activeReview.newTasks.map((t, idx) => (
                            <li key={idx}>{t}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {/* Proposed New Entities List */}
                <div className="space-y-3">
                  <h4 className="font-serif font-semibold text-sm text-slate-200 flex items-center gap-2">
                    <FilePlus className="w-4 h-4 text-emerald-400" />
                    Proposed New Codex Entries ({activeReview.newEntities.length})
                  </h4>

                  {activeReview.newEntities.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No new entities staged for this session.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeReview.newEntities.map((ent) => (
                        <div
                          key={ent.name}
                          onClick={() =>
                            setPreviewItem({
                              title: ent.name,
                              type: "new",
                              category: ent.type,
                              content: ent.content,
                            })
                          }
                          className="p-3.5 rounded-xl bg-fantasy-900 hover:bg-fantasy-800 border border-fantasy-700/80 hover:border-emerald-500/50 transition cursor-pointer flex items-center justify-between group shadow"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <h5 className="font-serif font-bold text-xs text-amber-200 group-hover:text-amber-100 truncate">
                              {ent.name}
                            </h5>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                              Folder: {ent.type}
                            </span>
                          </div>
                          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" /> View Text
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Proposed Updates List */}
                <div className="space-y-3">
                  <h4 className="font-serif font-semibold text-sm text-slate-200 flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-amber-400" />
                    Proposed Updates to Existing Notes ({activeReview.updates.length})
                  </h4>

                  {activeReview.updates.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No updates to existing files staged.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeReview.updates.map((up) => (
                        <div
                          key={up.name}
                          onClick={() =>
                            setPreviewItem({
                              title: up.name,
                              type: "update",
                              targetFile: up.targetFile,
                              statusUpdate: up.statusUpdate,
                              rationale: up.rationale,
                              content: up.content,
                            })
                          }
                          className="p-3.5 rounded-xl bg-fantasy-900 hover:bg-fantasy-800 border border-fantasy-700/80 hover:border-amber-500/50 transition cursor-pointer flex items-center justify-between group shadow"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <h5 className="font-serif font-bold text-xs text-amber-200 group-hover:text-amber-100 truncate">
                              {up.name}
                            </h5>
                            <span className="text-[10px] text-slate-400 truncate block">
                              Target: {up.targetFile}
                            </span>
                          </div>
                          <span className="text-xs text-amber-400 font-medium flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" /> View Diff
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Item Full Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col bg-fantasy-850 border border-fantasy-700 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-fantasy-700 bg-fantasy-900 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-base text-amber-200">
                    {previewItem.title}
                  </h3>
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded uppercase tracking-wider ${
                      previewItem.type === "new"
                        ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800"
                        : "bg-amber-950/60 text-amber-300 border border-amber-800"
                    }`}
                  >
                    {previewItem.type === "new" ? "New Note" : "Update to Existing Note"}
                  </span>
                </div>
                {previewItem.targetFile && (
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Target File: {previewItem.targetFile}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-fantasy-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {previewItem.statusUpdate && (
                <div className="p-2.5 rounded bg-amber-950/30 border border-amber-700/50 text-amber-300 text-xs">
                  <strong>Status Update:</strong> {previewItem.statusUpdate}
                </div>
              )}

              {previewItem.rationale && (
                <div className="p-3.5 rounded-xl bg-fantasy-900 border border-fantasy-700/80 text-xs text-slate-300 space-y-1">
                  <span className="font-semibold text-amber-400">Lore-Master Rationale:</span>
                  <p className="leading-relaxed">{previewItem.rationale}</p>
                </div>
              )}

              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Exact Staged Markdown Content:
                </span>
                <pre className="p-4 rounded-xl bg-fantasy-900 border border-fantasy-700 text-xs font-mono text-slate-200 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-96">
                  {previewItem.content}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
