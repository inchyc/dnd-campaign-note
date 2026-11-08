"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CheckSquare,
  Square,
  FileText,
  AlertTriangle,
  Info,
  Sparkles,
  ShieldAlert,
  BookOpen,
  Quote,
  Plus,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface MarkdownViewProps {
  content: string;
  filePath: string;
  onNavigate?: (target: string) => void;
  onToggleTask?: (line: number, lineText: string, checked: boolean) => Promise<void>;
  onAddTask?: (afterLine: number, text: string) => Promise<void>;
  readOnly?: boolean;
}

const CALLOUT_CONFIG: Record<
  string,
  { label: string; icon: any; border: string; bg: string; text: string }
> = {
  info: { label: "Info", icon: Info, border: "border-sky-500/40", bg: "bg-sky-950/20", text: "text-sky-300" },
  note: { label: "Note", icon: Info, border: "border-blue-500/40", bg: "bg-blue-950/20", text: "text-blue-300" },
  abstract: { label: "Abstract", icon: BookOpen, border: "border-purple-500/40", bg: "bg-purple-950/20", text: "text-purple-300" },
  summary: { label: "Summary", icon: BookOpen, border: "border-purple-500/40", bg: "bg-purple-950/20", text: "text-purple-300" },
  tldr: { label: "TL;DR", icon: BookOpen, border: "border-purple-500/40", bg: "bg-purple-950/20", text: "text-purple-300" },
  tip: { label: "Tip", icon: Sparkles, border: "border-emerald-500/40", bg: "bg-emerald-950/20", text: "text-emerald-300" },
  hint: { label: "Hint", icon: Sparkles, border: "border-emerald-500/40", bg: "bg-emerald-950/20", text: "text-emerald-300" },
  warning: { label: "Warning", icon: AlertTriangle, border: "border-amber-500/40", bg: "bg-amber-950/20", text: "text-amber-300" },
  caution: { label: "Caution", icon: AlertTriangle, border: "border-amber-500/40", bg: "bg-amber-950/20", text: "text-amber-300" },
  danger: { label: "Danger", icon: ShieldAlert, border: "border-rose-500/40", bg: "bg-rose-950/20", text: "text-rose-300" },
  error: { label: "Error", icon: ShieldAlert, border: "border-rose-500/40", bg: "bg-rose-950/20", text: "text-rose-300" },
  quote: { label: "Quote", icon: Quote, border: "border-slate-500/40", bg: "bg-slate-900/40", text: "text-slate-300" },
};

/** Preprocesses markdown: transforms Obsidian wikilinks [[Target|Label]] into markdown links */
function preprocessWikilinks(text: string): string {
  if (!text) return "";
  // Strip Dataview queries or Obsidian query markers
  let processed = text.replace(/<!--\s*QueryToSerialize:[\s\S]*?SerializedQuery\s*-->/g, "");
  processed = processed.replace(/<!--\s*SerializedQuery\s+END\s*-->/g, "");

  // Wikilinks: [[Target|Alias]] -> [Alias](#note:Target)
  // [[Target]] -> [Target](#note:Target)
  processed = processed.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, target, alias) => {
    const cleanTarget = target.trim();
    const label = (alias || cleanTarget).trim();
    return `[${label}](#note:${encodeURIComponent(cleanTarget)})`;
  });

  return processed;
}

export function MarkdownView({
  content,
  filePath,
  onNavigate,
  onToggleTask,
  onAddTask,
  readOnly = false,
}: MarkdownViewProps) {
  const [togglingLines, setTogglingLines] = useState<Record<number, boolean>>({});
  const [addingAfterLine, setAddingAfterLine] = useState<number | null>(null);
  const [newTaskText, setNewTaskText] = useState("");
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  const rawLines = content.split(/\r?\n/);
  const processed = preprocessWikilinks(content);

  const handleToggle = async (line: number, lineText: string, currentChecked: boolean) => {
    if (!onToggleTask || readOnly || togglingLines[line]) return;
    setTogglingLines((prev) => ({ ...prev, [line]: true }));
    try {
      await onToggleTask(line, lineText, !currentChecked);
    } finally {
      setTogglingLines((prev) => ({ ...prev, [line]: false }));
    }
  };

  const handleAddTaskSubmit = async (afterLine: number) => {
    if (!newTaskText.trim() || !onAddTask || isSubmittingTask) return;
    setIsSubmittingTask(true);
    try {
      await onAddTask(afterLine, newTaskText.trim());
      setNewTaskText("");
      setAddingAfterLine(null);
    } finally {
      setIsSubmittingTask(false);
    }
  };

  return (
    <div className="markdown-body space-y-4 text-slate-200 leading-relaxed text-[15px]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-2xl font-serif font-bold text-amber-200/90 pt-4 pb-2 border-b border-fantasy-700/60 flex items-center gap-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-serif font-semibold text-amber-300/80 pt-4 pb-1 border-b border-fantasy-700/40">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-serif font-medium text-amber-100/80 pt-3 pb-1">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold text-slate-300 pt-2 pb-0.5">
              {children}
            </h4>
          ),

          // Paragraphs
          p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,

          // Links & Wikilinks
          a: ({ href, children }) => {
            if (href?.startsWith("#note:")) {
              const target = decodeURIComponent(href.replace(/^#note:/, ""));
              return (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onNavigate) onNavigate(target);
                  }}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/40 text-amber-300 text-sm font-medium transition duration-150 cursor-pointer group shadow-sm"
                  title={`Open note: ${target}`}
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span>{children}</span>
                </button>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:text-sky-300 underline underline-offset-2 inline-flex items-center gap-0.5 hover:opacity-90"
              >
                {children}
                <ExternalLink className="w-3 h-3 inline ml-0.5 opacity-70" />
              </a>
            );
          },

          // Lists and Interactive Tasks
          ul: ({ children }) => <ul className="my-2 space-y-1 pl-4 list-disc marker:text-amber-500/50">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 space-y-1 pl-4 list-decimal marker:text-amber-500/50">{children}</ol>,

          li: ({ node, children, ...props }) => {
            // Check if this list item is a task checkbox
            const line = node?.position?.start?.line ? node.position.start.line - 1 : -1;
            const lineText = line >= 0 && line < rawLines.length ? rawLines[line] : "";
            const isTaskMatch = lineText.match(/^\s*[-*]\s+\[( |x|X)\]\s*(.*)$/);

            if (isTaskMatch) {
              const isChecked = isTaskMatch[1].toLowerCase() === "x";
              const taskBody = isTaskMatch[2];
              const isToggling = line >= 0 && !!togglingLines[line];

              return (
                <li className="list-none -ml-4 my-1.5 flex items-start gap-2.5 group">
                  <button
                    type="button"
                    disabled={readOnly || isToggling}
                    onClick={() => handleToggle(line, lineText, isChecked)}
                    className="mt-1 flex-shrink-0 text-slate-400 hover:text-amber-400 focus:outline-none transition-colors"
                    title={isChecked ? "Mark incomplete" : "Mark complete"}
                  >
                    {isToggling ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    ) : isChecked ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 fill-emerald-950/60" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 hover:text-amber-400" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className={isChecked ? "line-through text-slate-500" : "text-slate-200"}>
                      {children}
                    </span>
                    {onAddTask && !readOnly && addingAfterLine === line && (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={newTaskText}
                          onChange={(e) => setNewTaskText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddTaskSubmit(line);
                            if (e.key === "Escape") setAddingAfterLine(null);
                          }}
                          placeholder="New follow-up task..."
                          className="flex-1 px-2.5 py-1 text-xs bg-fantasy-900 border border-amber-600/40 rounded text-slate-200 focus:outline-none focus:border-amber-500"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleAddTaskSubmit(line)}
                          disabled={isSubmittingTask || !newTaskText.trim()}
                          className="px-2.5 py-1 text-xs bg-amber-600 hover:bg-amber-500 text-slate-900 font-semibold rounded disabled:opacity-50"
                        >
                          {isSubmittingTask ? "Adding..." : "Add"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddingAfterLine(null)}
                          className="text-xs text-slate-400 hover:text-slate-200 px-1"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  {onAddTask && !readOnly && addingAfterLine !== line && (
                    <button
                      type="button"
                      onClick={() => {
                        setAddingAfterLine(line);
                        setNewTaskText("");
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-amber-400 rounded hover:bg-fantasy-800"
                      title="Add follow-up task below this"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </li>
              );
            }

            return <li className="my-0.5">{children}</li>;
          },

          // Blockquotes & Obsidian Callouts
          blockquote: ({ node, children }) => {
            // Check if first child paragraph starts with [!type]
            const firstP = node?.children?.find((c: any) => c.tagName === "p") as any;
            const firstText = firstP?.children?.find((c: any) => c.type === "text")?.value || "";
            const calloutMatch = firstText.match(/^\[!([a-zA-Z_-]+)\]\s*(.*)$/);

            if (calloutMatch) {
              const type = calloutMatch[1].toLowerCase();
              const customTitle = calloutMatch[2];
              const config = CALLOUT_CONFIG[type] || CALLOUT_CONFIG.info;
              const Icon = config.icon;

              return (
                <div
                  className={`my-3 p-3.5 rounded-lg border-l-4 ${config.border} ${config.bg} bg-opacity-30 space-y-1.5 shadow-sm`}
                >
                  <div className={`flex items-center gap-2 font-medium text-sm ${config.text}`}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{customTitle || config.label}</span>
                  </div>
                  <div className="text-slate-300 text-sm pl-6">{children}</div>
                </div>
              );
            }

            return (
              <blockquote className="my-3 pl-3.5 border-l-2 border-slate-600 text-slate-400 italic bg-fantasy-850/40 py-1 rounded-r">
                {children}
              </blockquote>
            );
          },

          // Tables
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-lg border border-fantasy-700/60 shadow">
              <table className="w-full text-left text-sm border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-fantasy-800 text-amber-200/90 font-medium">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-fantasy-700/40 bg-fantasy-850/40">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-fantasy-800/40 transition-colors">{children}</tr>,
          th: ({ children }) => <th className="p-2.5 border-b border-fantasy-700/60 font-semibold">{children}</th>,
          td: ({ children }) => <td className="p-2.5 text-slate-300">{children}</td>,

          // Code blocks
          code: ({ className, children }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 rounded bg-fantasy-800 text-amber-300 font-mono text-[13px] border border-fantasy-700/50">
                  {children}
                </code>
              );
            }
            return (
              <pre className="p-3 my-3 rounded-lg bg-fantasy-900 border border-fantasy-700/60 text-slate-200 font-mono text-xs overflow-x-auto">
                <code>{children}</code>
              </pre>
            );
          },

          // Horizontal rule
          hr: () => <hr className="my-6 border-fantasy-700/60" />,
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
