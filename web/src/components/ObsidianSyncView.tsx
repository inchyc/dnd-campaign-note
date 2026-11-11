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
      id: "sync-bidirectional",
      title: "Bidirectional Sync (Recommended)",
      desc: "Compares file timestamps between your local Obsidian vault folder and Supabase. Automatically pulls cloud updates and pushes local edits.",
      cmd: "npm run vault:sync",
    },
    {
      id: "sync-pull",
      title: "Pull from Cloud",
      desc: "Safely overwrites local markdown files with the latest state from the cloud database.",
      cmd: "npm run vault:sync -- --pull",
    },
    {
      id: "sync-push",
      title: "Push to Cloud",
      desc: "Uploads all your local Obsidian markdown notes, folders, and frontmatter to the cloud database.",
      cmd: "npm run vault:sync -- --push",
    },
    {
      id: "sync-campaign",
      title: "Target Specific Campaign",
      desc: "Specify which campaign vault to sync when managing multiple campaigns.",
      cmd: `npm run vault:sync -- --campaign=${status?.campaign.id || "starving-vilgeismar"}`,
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
              Obsidian.md Ecosystem Integration
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-amber-100">
              Vault & Two-Way Sync
            </h1>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              Use Obsidian.md alongside this app seamlessly. All notes, folders, wikilinks, task checkboxes, and frontmatter stay 100% compatible.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadVault}
              disabled={downloading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold text-sm shadow-lg flex items-center gap-2 transition disabled:opacity-50"
            >
              <Download className={`w-4 h-4 ${downloading ? "animate-bounce" : ""}`} />
              <span>{downloading ? "Generating ZIP..." : "Download Vault (.zip)"}</span>
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
            <p className="text-xs text-slate-400 mt-1">Real-time cloud database</p>
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
            <span className="font-semibold uppercase tracking-wider">Notes In Vault</span>
            <FileCode className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold font-serif text-slate-100">
              {status ? status.notesCount : "..."}
            </p>
            <p className="text-xs text-slate-400 mt-1">NPCs, Locations, Quests & Lore</p>
          </div>
        </div>

        {/* Sync Status / Freshness */}
        <div className="p-4 rounded-xl bg-fantasy-850/90 border border-fantasy-700/60 shadow flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Cloud Health</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <p className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Fully Synced
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {status?.latestMtime
                ? `Last modified: ${new Date(status.latestMtime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Continuous cloud backup"}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Zero-Code Instant Export Walkthrough */}
      <div className="p-6 rounded-2xl bg-fantasy-850 border border-fantasy-700/80 shadow-lg space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <FolderArchive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-serif text-amber-200">
              Zero-Code Vault Export (Download & Open in Obsidian)
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              The easiest way to read or edit your notes offline in Obsidian on Windows, Mac, Linux, iOS, or Android.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-fantasy-900/80 border border-fantasy-700/50 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-xs">1</span>
              Download Archive
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Click the button below to generate a real-time <code className="text-amber-300 bg-fantasy-800 px-1 py-0.5 rounded">.zip</code> containing every markdown note, folder hierarchy, and frontmatter.
            </p>
            <button
              type="button"
              onClick={handleDownloadVault}
              disabled={downloading}
              className="mt-2 w-full py-2 px-3 rounded-lg bg-amber-600/30 hover:bg-amber-600/40 border border-amber-600/50 text-amber-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? "Downloading..." : "Export .zip Now"}</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-fantasy-900/80 border border-fantasy-700/50 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-xs">2</span>
              Extract Folder
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Extract the downloaded archive into your Obsidian vault directory (e.g. <code className="text-slate-300 bg-fantasy-800 px-1 py-0.5 rounded">Documents/Obsidian Vault/{status?.campaign.name || "Campaign"}</code>).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-fantasy-900/80 border border-fantasy-700/50 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-xs">3</span>
              Open Vault in Obsidian
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Launch Obsidian, click <strong className="text-slate-100">Open folder as vault</strong>, and pick the extracted folder. All wikilinks and graph views will connect immediately!
            </p>
          </div>
        </div>
      </div>

      {/* 3. CLI Automated Two-Way Sync */}
      <div className="p-6 rounded-2xl bg-fantasy-850 border border-fantasy-700/80 shadow-lg space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-serif text-slate-100">
                Command-Line Two-Way Sync (`vault:sync`)
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Keep your local desktop Obsidian vault continuously in sync with the live cloud database using our built-in sync CLI.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {syncCommands.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-fantasy-900/90 border border-fantasy-700/60 flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-200">{item.title}</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">{item.desc}</p>
                <div className="pt-1">
                  <code className="inline-block px-2.5 py-1 rounded bg-black/50 border border-slate-800 font-mono text-xs text-amber-300 select-all">
                    {item.cmd}
                  </code>
                </div>
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
                    <span>Copy Command</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-fantasy-900/50 border border-amber-600/30 text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-amber-300 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            Where is this run?
          </p>
          <p>
            Run these commands inside the app's <code className="text-slate-300 font-mono">web/</code> directory in your terminal. The script uses timestamp reconciliation so neither your local Obsidian edits nor your party's web app edits are lost.
          </p>
        </div>
      </div>

      {/* 4. How Obsidian Compatibility Works */}
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
              Category Folder Structure
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
