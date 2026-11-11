"use client";

import React, { useState, useEffect } from "react";
import {
  Download,
  RefreshCw,
  Copy,
  Check,
  Terminal,
  Database,
  CheckCircle2,
  HardDrive,
  FileCode,
  Sparkles,
  Layers,
  HelpCircle,
  ExternalLink,
  FolderArchive,
  ArrowRight,
  ShieldCheck,
  Radio,
  Play,
  Infinity,
  Zap,
} from "lucide-react";

interface VaultStatus {
  campaign: {
    id: string;
    name: string;
    vault: string;
  };
  backend: string;
  backendLabel: string;
  notesCount: number;
  latestMtime: number;
  isScribe: boolean;
}

interface ObsidianSyncViewProps {
  activeCampaign?: { id: string; name: string } | null;
  isScribe?: boolean;
}

export function ObsidianSyncView({ activeCampaign, isScribe }: ObsidianSyncViewProps) {
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vault/status", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setStatus(data);
      }
    } catch (e) {
      console.error("Failed to load vault status:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [activeCampaign?.id]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleDownloadVault = async () => {
    setDownloading(true);
    try {
      const link = document.createElement("a");
      link.href = "/api/vault/export";
      link.download = `${status?.campaign.id || activeCampaign?.id || "campaign"}-obsidian-vault.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Vault download failed:", err);
    } finally {
      setTimeout(() => setDownloading(false), 1500);
    }
  };

  const syncCommands = [
    {
      id: "sync-watch",
      title: "⚡ Live Background Watcher (Recommended)",
      desc: "Watches your local Obsidian vault in real time. Whenever you save a note in Obsidian, it automatically pushes that single note to the cloud. When party members make edits in the app, it pulls them down into your Obsidian folder.",
      cmd: "npm run vault:watch",
      isPrimary: true,
    },
    {
      id: "sync-bidirectional",
      title: "One-Time Bidirectional Sync",
      desc: "Performs a single reconcile pass comparing timestamps between your local vault and Supabase, pushing local edits and pulling remote changes.",
      cmd: "npm run vault:sync",
    },
    {
      id: "sync-pull",
      title: "Pull from Cloud Only",
      desc: "Overwrites local files with the latest state from the cloud database without pushing any local edits.",
      cmd: "npm run vault:sync -- --pull",
    },
    {
      id: "sync-push",
      title: "Push to Cloud Only",
      desc: "Uploads all your local Obsidian markdown notes directly to the cloud database.",
      cmd: "npm run vault:sync -- --push",
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-fantasy-900 via-fantasy-850 to-fantasy-800 border border-amber-600/40 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Continuous Obsidian.md Integration
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-amber-100">
              Vault & Real-Time Sync
            </h1>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              Use Obsidian.md seamlessly alongside this app. Edits push and pull automatically in the background without needing to copy or export .zip files.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadVault}
              disabled={downloading}
              className="px-4 py-2.5 rounded-xl bg-fantasy-800 hover:bg-fantasy-700 border border-fantasy-700 text-slate-200 text-sm font-semibold shadow flex items-center gap-2 transition disabled:opacity-50"
              title="Download an offline .zip snapshot backup"
            >
              <Download className={`w-4 h-4 ${downloading ? "animate-bounce" : ""}`} />
              <span>{downloading ? "Zipping..." : "Backup Vault (.zip)"}</span>
            </button>
            <button
              type="button"
              onClick={fetchStatus}
              disabled={loading}
              className="px-3.5 py-2.5 rounded-xl bg-fantasy-800 hover:bg-fantasy-700 border border-fantasy-700 text-slate-300 hover:text-white text-sm font-semibold transition flex items-center gap-2"
              title="Refresh connection status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-400" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. Storage & Live Health Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Storage Engine Card */}
        <div className="p-4 rounded-xl bg-fantasy-850/90 border border-fantasy-700/60 shadow flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Storage Engine</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <p className="text-base font-bold text-slate-100 truncate">
                {status?.backendLabel || "Detecting..."}
              </p>
            </div>
            <p className="text-xs text-slate-400 mt-1">Multi-user cloud PostgreSQL</p>
          </div>
        </div>

        {/* Active Campaign Card */}
        <div className="p-4 rounded-xl bg-fantasy-850/90 border border-fantasy-700/60 shadow flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Active Campaign</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <p className="text-base font-bold text-amber-200 truncate">
              {status?.campaign.name || activeCampaign?.name || "Vilgeismar"}
            </p>
            <p className="text-xs font-mono text-slate-400 mt-1 truncate">
              ID: {status?.campaign.id || activeCampaign?.id || "starving-vilgeismar"}
            </p>
          </div>
        </div>

        {/* Total Indexed Notes */}
        <div className="p-4 rounded-xl bg-fantasy-850/90 border border-fantasy-700/60 shadow flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Campaign Notes</span>
            <div className="flex items-center gap-1 text-emerald-400 text-[11px] font-semibold">
              <Infinity className="w-3.5 h-3.5" />
              <span>No Limit</span>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold font-serif text-slate-100">
              {status ? status.notesCount : "..."}
            </p>
            <p className="text-xs text-emerald-400/90 mt-1">Unlimited capacity (No caps)</p>
          </div>
        </div>

        {/* Sync Status / Freshness */}
        <div className="p-4 rounded-xl bg-fantasy-850/90 border border-fantasy-700/60 shadow flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Cloud Sync</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <p className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Live & Synced
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {status?.latestMtime
                ? `Updated: ${new Date(status.latestMtime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Real-time updates active"}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Primary Feature: Real-Time Live Watcher Daemon */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-fantasy-850 to-fantasy-900 border border-amber-600/50 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-md">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-serif text-amber-100">
                  Live Background Watcher (`npm run vault:watch`)
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                  Recommended
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Type and edit normally in Obsidian on your computer. Your changes sync to the cloud automatically with zero manual steps!
              </p>
            </div>
          </div>
        </div>

        {/* How Live Watcher Works Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-fantasy-900/90 border border-fantasy-700/60 space-y-1">
            <p className="font-bold text-amber-300 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              1. Continuous File Watcher
            </p>
            <p className="text-slate-400 leading-relaxed">
              Watches your local vault folder. Whenever you edit and save a note in Obsidian, it debounces and pushes only that modified file.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-fantasy-900/90 border border-fantasy-700/60 space-y-1">
            <p className="font-bold text-amber-300 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              2. Real-Time Cloud Pulls
            </p>
            <p className="text-slate-400 leading-relaxed">
              When party members or the DM update notes on their phones, the watcher pulls the edits directly into your Obsidian markdown files.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-fantasy-900/90 border border-fantasy-700/60 space-y-1">
            <p className="font-bold text-amber-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              3. Conflict Safe
            </p>
            <p className="text-slate-400 leading-relaxed">
              Timestamp reconciliation ensures you never lose text. In the rare event of simultaneous edits, an automatic <code className="text-slate-300">.conflict.md</code> backup is preserved.
            </p>
          </div>
        </div>

        {/* Launch Options */}
        <div className="space-y-3 pt-2">
          {/* Option A: 1-Click Windows Launcher */}
          <div className="p-4 rounded-xl bg-fantasy-900 border border-amber-600/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">1-Click Windows Shortcut</h3>
              </div>
              <p className="text-xs text-slate-300">
                Double-click <code className="text-amber-300 font-mono bg-fantasy-800 px-1 py-0.5 rounded">start-vault-watcher.bat</code> in your app root folder to run the sync watcher silently in the background while you play.
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold shrink-0">
              Ready in Project Root
            </div>
          </div>

          {/* Option B: Terminal Command */}
          <div className="p-4 rounded-xl bg-fantasy-900 border border-fantasy-700/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-semibold text-slate-200">Terminal Command</h3>
              </div>
              <p className="text-xs text-slate-400">
                Run from either the root folder or the <code className="text-slate-300 font-mono">web/</code> directory.
              </p>
              <div className="pt-1">
                <code className="inline-block px-3 py-1 rounded bg-black/60 border border-slate-800 font-mono text-xs text-amber-300 select-all">
                  npm run vault:watch
                </code>
              </div>
            </div>

            <button
              type="button"
              onClick={() => copyToClipboard("npm run vault:watch", "cmd-watch")}
              className="self-start md:self-center px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shrink-0 shadow"
            >
              {copiedKey === "cmd-watch" ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Command</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Manual Sync CLI Commands */}
      <div className="p-6 rounded-2xl bg-fantasy-850 border border-fantasy-700/80 shadow-lg space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-serif text-slate-100">
              One-Shot Sync Commands (`vault:sync`)
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Useful for performing a single manual reconcile pass without leaving a continuous background process running.
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          {syncCommands
            .filter((c) => !c.isPrimary)
            .map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-fantasy-900/90 border border-fantasy-700/60 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-slate-200">{item.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">{item.desc}</p>
                  <code className="inline-block mt-0.5 px-2.5 py-0.5 rounded bg-black/50 border border-slate-800 font-mono text-xs text-amber-300 select-all">
                    {item.cmd}
                  </code>
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard(item.cmd, item.id)}
                  className="self-start md:self-center px-3 py-1.5 rounded-lg bg-fantasy-800 hover:bg-fantasy-700 border border-fantasy-700 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition shrink-0"
                >
                  {copiedKey === item.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* 4. Offline Snapshot Backup (.zip) */}
      <div className="p-6 rounded-2xl bg-fantasy-850 border border-fantasy-700/80 shadow-lg space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-serif text-amber-200">
                Offline Snapshot Backup (.zip)
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Download a complete, self-contained archive of your campaign's markdown files for offline viewing or external backups.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadVault}
            disabled={downloading}
            className="px-4 py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600/40 border border-amber-600/50 text-amber-200 text-xs font-semibold flex items-center gap-2 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading ? "Preparing ZIP..." : "Download Full Archive (.zip)"}</span>
          </button>
        </div>
      </div>

      {/* 5. How Obsidian Compatibility Works */}
      <div className="p-6 rounded-2xl bg-fantasy-850 border border-fantasy-700/80 shadow-lg space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-serif text-slate-100">
              How Obsidian Compatibility Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Native Markdown primitives that power both Obsidian and this campaign hub.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-fantasy-900/70 border border-fantasy-700/50 space-y-2">
            <h3 className="text-sm font-semibold text-amber-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              YAML Frontmatter Metadata
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Every note begins with a standard Obsidian YAML block (<code className="text-slate-200">---</code>) containing <code className="text-amber-300">type</code>, <code className="text-amber-300">status</code>, <code className="text-amber-300">tags</code>, and <code className="text-amber-300">aliases</code>. Both Obsidian Dataview and this app parse the exact same fields.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-fantasy-900/70 border border-fantasy-700/50 space-y-2">
            <h3 className="text-sm font-semibold text-amber-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Wikilinks & Graph Navigation
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Internal links use standard <code className="text-amber-300">[[Note Title]]</code> syntax. In Obsidian, clicking opens the linked file and generates the visual Graph View; in this app, it opens the interactive Codex modal.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-fantasy-900/70 border border-fantasy-700/50 space-y-2">
            <h3 className="text-sm font-semibold text-amber-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Interactive Task Checkboxes
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Quests and leads use standard Markdown task syntax (<code className="text-amber-300">- [ ]</code> and <code className="text-amber-300">- [x]</code>). Ticking a checkbox in Obsidian or in this app stays synchronized.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-fantasy-900/70 border border-fantasy-700/50 space-y-2">
            <h3 className="text-sm font-semibold text-amber-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Folder Hierarchy Parity
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Notes are organized into intuitive top-level directories: <code className="text-slate-200">NPCs/</code>, <code className="text-slate-200">Locations/</code>, <code className="text-slate-200">Quests/</code>, and <code className="text-slate-200">Lore/</code> matching Obsidian's standard file explorer layout.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
