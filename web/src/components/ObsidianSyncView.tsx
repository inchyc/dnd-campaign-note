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
  FolderArchive,
  ArrowRight,
  ShieldCheck,
  Play,
  Infinity,
  GitBranch,
  ChevronDown,
  ChevronUp,
  Settings,
  Puzzle,
  Clock,
  ExternalLink,
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
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

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

  const advancedCommands = [
    {
      id: "sync-watch",
      title: "Live Background Watcher",
      desc: "Watches your local vault folder. Edits push automatically to Supabase on save, and party edits pull down every 12 seconds.",
      cmd: "npm run vault:watch",
    },
    {
      id: "sync-bidirectional",
      title: "One-Time Reconciliation",
      desc: "Compares timestamps between your local vault and the database, pushing edits and pulling updates in one pass.",
      cmd: "npm run vault:sync",
    },
    {
      id: "sync-pull",
      title: "Pull from Cloud Only",
      desc: "Fetches latest changes from the cloud database into your local markdown files.",
      cmd: "npm run vault:sync -- --pull",
    },
    {
      id: "sync-push",
      title: "Push to Cloud Only",
      desc: "Uploads your local Obsidian markdown notes to the cloud database.",
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
              Obsidian.md Synchronization
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-amber-100">
              Vault & Automatic Sync
            </h1>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              Connect Obsidian.md with your campaign hub. All notes, folders, wikilinks, task checkboxes, and frontmatter stay synchronized across your devices.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadVault}
              disabled={downloading}
              className="px-4 py-2.5 rounded-xl bg-fantasy-800 hover:bg-fantasy-700 border border-fantasy-700 text-slate-200 text-sm font-semibold shadow flex items-center gap-2 transition disabled:opacity-50"
              title="Download an offline backup archive"
            >
              <Download className={`w-4 h-4 ${downloading ? "animate-bounce" : ""}`} />
              <span>{downloading ? "Creating Archive..." : "Backup Vault (.zip)"}</span>
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
              <span>Unlimited</span>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold font-serif text-slate-100">
              {status ? status.notesCount : "..."}
            </p>
            <p className="text-xs text-emerald-400/90 mt-1">Full capacity (No limits)</p>
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

      {/* 2. PRIMARY RECOMMENDED SETUP: Obsidian Git Plugin */}
      <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-fantasy-850 to-fantasy-900 border border-amber-600/50 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-md">
              <GitBranch className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-serif text-amber-100">
                  Automatic Sync via Obsidian Git Plugin
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                  Recommended Plugin
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                The standard, official community plugin used by hundreds of thousands of Obsidian users. Syncs automatically in the background without any terminal commands or batch files.
              </p>
            </div>
          </div>
        </div>

        {/* Git Remote Repository Box */}
        <div className="p-4 rounded-xl bg-fantasy-900 border border-amber-600/40 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-200">
                Campaign Git Remote Repository
              </span>
            </div>
            <a
              href="https://github.com/inchyc/dnd-campaign-note"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 transition"
            >
              <span>View on GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg bg-black/60 border border-slate-800 font-mono text-xs text-amber-300 select-all overflow-x-auto">
              https://github.com/inchyc/dnd-campaign-note.git
            </code>
            <button
              type="button"
              onClick={() => copyToClipboard("https://github.com/inchyc/dnd-campaign-note.git", "repo-url")}
              className="px-3 py-2 rounded-lg bg-fantasy-800 hover:bg-fantasy-700 border border-fantasy-700 text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1.5 transition shrink-0"
            >
              {copiedKey === "repo-url" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy URL</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Use this repository URL to link any Obsidian vault on any player's computer or laptop.
          </p>
        </div>

        {/* 4-Step Visual Walkthrough */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-fantasy-900/90 border border-fantasy-700/60 space-y-2 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-300">
                  1
                </span>
                <span>Open or Clone Vault on Any PC</span>
              </div>
              <FolderArchive className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-xs text-slate-300 leading-relaxed pt-1">
              On any computer, clone the repository or open your existing vault folder:
            </p>
            <div className="space-y-1.5 text-xs text-slate-300 bg-fantasy-800/80 p-2.5 rounded-lg border border-fantasy-700">
              <p className="text-[11px] text-slate-400 font-semibold">Option A (New Setup):</p>
              <code className="block font-mono text-[11px] text-amber-300 select-all">git clone https://github.com/inchyc/dnd-campaign-note.git</code>
              <p className="text-[11px] text-slate-400 font-semibold pt-1">Option B (Existing Vault Folder):</p>
              <code className="block font-mono text-[11px] text-slate-300 select-all">git init && git remote add origin https://github.com/inchyc/dnd-campaign-note.git</code>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl bg-fantasy-900/90 border border-fantasy-700/60 space-y-2 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-300">
                  2
                </span>
                <span>Install "Obsidian Git" Plugin</span>
              </div>
              <Puzzle className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-xs text-slate-300 leading-relaxed pt-1">
              Inside Obsidian on that computer:
            </p>
            <div className="p-2.5 rounded-lg bg-fantasy-800/80 border border-fantasy-700 text-xs text-slate-300 space-y-1">
              <div>1. Go to <strong>Settings (⚙️) → Community Plugins</strong>.</div>
              <div>2. Turn off <strong>Restricted Mode</strong>.</div>
              <div className="flex items-center justify-between pt-0.5">
                <span>3. Browse and search <strong>"Git"</strong> (by Denis Olehov).</span>
                <span className="text-[11px] text-emerald-400 font-semibold">Install & Enable</span>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl bg-fantasy-900/90 border border-fantasy-700/60 space-y-2 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-300">
                  3
                </span>
                <span>Authenticate with GitHub</span>
              </div>
              <Settings className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-xs text-slate-300 leading-relaxed pt-1">
              In Obsidian under <strong>Community Plugins → Git Settings</strong>:
            </p>
            <div className="space-y-1.5 text-xs text-slate-300 bg-fantasy-800/80 p-2.5 rounded-lg border border-fantasy-700">
              <div className="text-[11px] text-slate-300">
                Under <strong>Authentication</strong>, enter your GitHub Username and a <strong>Personal Access Token (PAT)</strong> with <code className="text-amber-300">repo</code> permissions.
              </div>
              <div className="text-[11px] text-slate-400 pt-0.5">
                (Generate token in GitHub: Settings → Developer Settings → Personal Access Tokens).
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl bg-fantasy-900/90 border border-fantasy-700/60 space-y-2 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-300">
                  4
                </span>
                <span>Set Auto-Backup & Done</span>
              </div>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-xs text-slate-300 leading-relaxed pt-1">
              Still in Git settings, configure automatic background intervals:
            </p>
            <div className="space-y-1 text-xs text-slate-300 bg-fantasy-800/80 p-2.5 rounded-lg border border-fantasy-700">
              <div className="flex items-center justify-between">
                <span>Vault backup interval:</span>
                <span className="text-amber-300 font-semibold font-mono">5 or 10 minutes</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Backup on save:</span>
                <span className="text-emerald-400 font-semibold">Enabled (ON)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Offline Snapshot Backup (.zip) */}
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
                Download a clean, portable archive of your campaign's markdown notes for offline use or safe keeping.
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
            <span>{downloading ? "Preparing ZIP..." : "Download Vault Archive (.zip)"}</span>
          </button>
        </div>
      </div>

      {/* 4. COLLAPSIBLE ADVANCED DEVELOPER TOOLS */}
      <div className="rounded-2xl bg-fantasy-850 border border-fantasy-700/80 shadow-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className="w-full p-5 flex items-center justify-between text-left hover:bg-fantasy-800/40 transition"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200">
                Advanced Tools: Windows Launcher & Terminal Sync
              </h3>
              <p className="text-xs text-slate-400">
                Optional scripts and CLI commands for automated local syncing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{isAdvancedOpen ? "Collapse" : "Show Options"}</span>
            {isAdvancedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {isAdvancedOpen && (
          <div className="p-5 pt-2 border-t border-fantasy-700/60 space-y-4 bg-fantasy-900/60">
            {/* 1-Click Windows Shortcut */}
            <div className="p-4 rounded-xl bg-fantasy-900 border border-amber-600/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-slate-100">1-Click Windows Launcher</h4>
                </div>
                <p className="text-xs text-slate-400">
                  Double-click <code className="text-amber-300 font-mono bg-fantasy-800 px-1 py-0.5 rounded">start-vault-watcher.bat</code> in the project root to run the background sync daemon without opening a terminal.
                </p>
              </div>
              <div className="px-3 py-1 rounded bg-fantasy-800 border border-fantasy-700 text-slate-300 text-xs font-mono shrink-0">
                start-vault-watcher.bat
              </div>
            </div>

            {/* Custom Vault Path Tip */}
            <div className="p-3 rounded-xl bg-fantasy-900/60 border border-fantasy-700/50 text-[11px] text-slate-300 space-y-1">
              <span className="font-semibold text-amber-300">💡 Custom Vault Location for Any PC:</span>
              <p className="text-slate-400">
                To run the sync watcher pointing directly at any personal vault folder on any computer, pass the <code className="text-amber-300 font-mono">--vault="&lt;path&gt;"</code> parameter:
              </p>
              <code className="block p-1.5 rounded bg-black/40 border border-slate-800 font-mono text-[10px] text-amber-300 select-all overflow-x-auto">
                npm run vault:watch -- --vault="C:\Users\icinc\Documents\Obsidian Vault\Chris\TTRPG\D&D\Starving Vilgeismar"
              </code>
            </div>

            {/* CLI Commands */}
            <div className="space-y-2.5">
              {advancedCommands.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-fantasy-900 border border-fantasy-700/60 flex flex-col md:flex-row md:items-center justify-between gap-2.5"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-slate-200">{item.title}</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{item.desc}</p>
                    <code className="inline-block mt-0.5 px-2 py-0.5 rounded bg-black/60 border border-slate-800 font-mono text-[11px] text-amber-300 select-all">
                      {item.cmd}
                    </code>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(item.cmd, item.id)}
                    className="self-start md:self-center px-3 py-1 rounded-lg bg-fantasy-800 hover:bg-fantasy-700 border border-fantasy-700 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition shrink-0"
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
        )}
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
              Standard Markdown formatting shared natively between Obsidian and this campaign hub.
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
