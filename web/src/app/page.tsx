"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  MapPin,
  BookOpen,
  Backpack,
  Edit3,
  Bot,
  Mic,
  Shield,
  Search,
  Sparkles,
  CheckCircle,
  Clock,
  Compass,
  FileText,
  Plus,
  RefreshCw,
  LogOut,
  Dices,
  ExternalLink,
  ChevronRight,
  Eye,
  EyeOff,
  Filter,
  Flame,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { LoginView } from "@/components/LoginView";
import { NoteModal } from "@/components/NoteModal";
import { MarkdownView } from "@/components/MarkdownView";
import { QuestBoard, questBucket } from "@/components/QuestBoard";
import { PartyLootView } from "@/components/PartyLootView";
import { ScratchpadView } from "@/components/ScratchpadView";
import { AudioScribe } from "@/components/AudioScribe";
import { ScribeReviewsView } from "@/components/ScribeReviewsView";
import { DiceInitiativeDrawer } from "@/components/DiceInitiativeDrawer";
import { GlobalSearchModal } from "@/components/GlobalSearchModal";

interface CurrentUser {
  id: string;
  name: string;
  character: string;
  role: "scribe" | "player";
}

interface NoteMeta {
  path: string;
  title: string;
  category: string;
  sub?: string;
  summary?: string;
  secret?: boolean;
  revealed?: boolean;
  status?: string;
  priority?: string;
  owner?: string;
  visibleToParty?: boolean;
}

interface HomeData {
  recap?: { session: string; text: string; generatedAt: string };
  quests: NoteMeta[];
  roster: Array<{
    id: string;
    name: string;
    character: string;
    role: string;
    class?: string;
    level?: string;
  }>;
  recent: NoteMeta[];
  activeSessionDate: string;
}

export default function CampaignHub() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "home" | "npcs" | "locations" | "lore" | "quests" | "party" | "scratchpad" | "audio" | "reviews"
  >("home");

  // Home dashboard data
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [recapGenerating, setRecapGenerating] = useState(false);
  const [isRecapExpanded, setIsRecapExpanded] = useState(true);

  // Category notes cache
  const [categoryNotes, setCategoryNotes] = useState<NoteMeta[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [filterSub, setFilterSub] = useState<string>("all");

  // Party & Loot data
  const [partyData, setPartyData] = useState<any>(null);

  // Modals & Drawers
  const [selectedNotePath, setSelectedNotePath] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDiceOpen, setIsDiceOpen] = useState(false);

  // Check login on mount
  const checkAuth = useCallback(async () => {
    setAuthLoading(true);
    try {
      const res = await fetch("/api/me");
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUser(data.user);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Keyboard shortcut for search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch Home dashboard
  const fetchHome = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/home");
      const data = await res.json();
      if (data.success) {
        setHomeData(data);
      }
    } catch (e) {
      console.error("Failed to load home data", e);
    }
  }, [currentUser]);

  // Fetch Category Notes (NPCs, Locations, Lore, Quests)
  const fetchCategory = useCallback(async (cat: string) => {
    setCategoryLoading(true);
    setFilterQuery("");
    setFilterSub("all");
    try {
      const res = await fetch(`/api/notes?category=${cat}`);
      const data = await res.json();
      if (data.success) {
        setCategoryNotes(data.notes || []);
      }
    } catch (e) {
      console.error("Failed to load category notes", e);
    } finally {
      setCategoryLoading(false);
    }
  }, []);

  // Fetch Party & Loot
  const fetchParty = useCallback(async () => {
    try {
      const res = await fetch("/api/party");
      const data = await res.json();
      if (data.success) {
        setPartyData(data);
      }
    } catch (e) {
      console.error("Failed to load party data", e);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    if (activeTab === "home") fetchHome();
    else if (["npcs", "locations", "lore", "quests"].includes(activeTab)) {
      const catMap: Record<string, string> = {
        npcs: "npc",
        locations: "location",
        lore: "lore",
        quests: "quest",
      };
      fetchCategory(catMap[activeTab]);
    } else if (activeTab === "party") {
      fetchParty();
    }
  }, [currentUser, activeTab, fetchHome, fetchCategory, fetchParty]);

  const handleLogout = async () => {
    await fetch("/api/login", { method: "DELETE" });
    setCurrentUser(null);
  };

  const handleGenerateRecap = async () => {
    setRecapGenerating(true);
    try {
      const res = await fetch("/api/scribe/recap", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        fetchHome();
      } else {
        alert(data.error || "Recap generation failed");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setRecapGenerating(false);
    }
  };

  const handleClaimItem = async (path: string, owner: string) => {
    const res = await fetch("/api/note/meta", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, key: "owner", value: owner }),
    });
    if (res.ok) {
      fetchParty();
    }
  };

  const handleToggleCharacterVisibility = async (path: string, currentVisible: boolean) => {
    const res = await fetch("/api/note/meta", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, key: "visible_to_party", value: !currentVisible }),
    });
    if (res.ok) {
      fetchParty();
    }
  };

  const handleQuestStatusChange = async (path: string, status: string) => {
    const res = await fetch("/api/note/meta", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, key: "status", value: status }),
    });
    if (res.ok) {
      fetchCategory("quest");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-fantasy-900 flex items-center justify-center text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView onLoginSuccess={checkAuth} />;
  }

  const isScribe = currentUser.role === "scribe";

  // Filtered category notes
  const subFolders = Array.from(new Set(categoryNotes.map((n) => n.sub).filter(Boolean))) as string[];
  const filteredNotes = categoryNotes.filter((n) => {
    const matchesQuery =
      !filterQuery.trim() ||
      n.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (n.summary || "").toLowerCase().includes(filterQuery.toLowerCase());
    const matchesSub = filterSub === "all" || n.sub === filterSub;
    return matchesQuery && matchesSub;
  });

  return (
    <div className="min-h-screen flex flex-col bg-fantasy-900 text-slate-200">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-fantasy-850/95 backdrop-blur-md border-b border-fantasy-700/80 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Campaign Title */}
          <div
            onClick={() => setActiveTab("home")}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <span className="p-2 rounded-xl bg-amber-950/50 border border-amber-700/50 text-amber-400 group-hover:scale-105 transition-transform shadow-inner">
              <Flame className="w-5 h-5" />
            </span>
            <div>
              <h1 className="font-serif font-bold text-base sm:text-lg text-amber-200 group-hover:text-amber-100 tracking-wide flex items-center gap-2">
                D&D Campaign Notes
              </h1>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 hidden sm:flex">
                <span className="text-amber-400/90 font-medium">Starving Vilgeismar</span>
                <span>•</span>
                <span>Codex & Operations</span>
              </div>
            </div>
          </div>

          {/* Search Bar Button */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-fantasy-900 border border-fantasy-700 hover:border-amber-500/50 text-slate-400 text-xs w-64 justify-between transition group shadow-inner"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Search lore, NPCs...</span>
            </span>
            <kbd className="px-1.5 py-0.5 rounded bg-fantasy-800 border border-fantasy-700 text-[10px] text-slate-500 font-mono">
              Ctrl+K
            </kbd>
          </button>

          {/* Right Actions: 5e.tools, Table Tools, User Profile, Sign Out */}
          <div className="flex items-center gap-2">
            {/* Mobile search icon */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="md:hidden p-2 rounded-lg bg-fantasy-800 text-slate-300 hover:text-amber-300 border border-fantasy-700"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* 5e.tools link */}
            <a
              href="https://5e.tools"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-fantasy-800 hover:bg-fantasy-700 border border-fantasy-700 text-xs text-amber-300 font-medium transition"
              title="Open 5e.tools rules and spells in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              <span>5e.tools</span>
            </a>

            {/* Dice & Initiative Drawer Toggle */}
            <button
              type="button"
              onClick={() => setIsDiceOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-fantasy-800 hover:bg-fantasy-700 border border-fantasy-700 text-xs text-amber-200 font-semibold transition shadow-sm"
              title="Open Dice Roller and Initiative Tracker"
            >
              <Dices className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Table Tools</span>
            </button>

            {/* Active User Badge */}
            <div className="flex items-center gap-2 pl-2 border-l border-fantasy-700/80">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-serif font-bold text-amber-200 leading-tight">
                  {currentUser.character}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                  <span>{currentUser.name}</span>
                  {isScribe && (
                    <span className="px-1 py-0.2 text-[8px] bg-amber-500 text-slate-950 font-bold rounded uppercase">
                      Scribe
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-fantasy-800 transition"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Tab Navigation Bar */}
        <div className="max-w-7xl mx-auto pt-3 hidden md:flex items-center gap-1 overflow-x-auto text-xs font-medium">
          {[
            { id: "home", label: "Dashboard", icon: Sparkles },
            { id: "npcs", label: "NPCs", icon: Users },
            { id: "locations", label: "Locations", icon: MapPin },
            { id: "lore", label: "Lore", icon: BookOpen },
            { id: "quests", label: "Quests & Rumors", icon: Compass },
            { id: "party", label: "Party & Camp Loot", icon: Backpack },
            { id: "scratchpad", label: "Live Scratchpad", icon: Edit3 },
            ...(isScribe
              ? [
                  { id: "audio", label: "Audio Scribe", icon: Mic },
                  { id: "reviews", label: "AI Reviews", icon: Bot },
                ]
              : []),
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  isActive
                    ? "bg-amber-600 text-slate-950 font-semibold shadow"
                    : "text-slate-400 hover:text-slate-200 hover:bg-fantasy-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-24 md:pb-8">
        {/* VIEW 1: HOME DASHBOARD */}
        {activeTab === "home" && (
          <div className="space-y-6">
            {/* "Previously On..." Narrative Recap Card */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-fantasy-850 to-fantasy-800 border border-amber-700/40 shadow-xl space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-amber-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Previously in Vilgeismar...
                    {homeData?.recap?.session && (
                      <span className="text-[11px] text-slate-400 font-mono font-normal">
                        (Session {homeData.recap.session})
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsRecapExpanded(!isRecapExpanded)}
                    className="p-1 rounded text-slate-400 hover:text-amber-300 transition"
                    title={isRecapExpanded ? "Collapse recap" : "Expand recap"}
                  >
                    {isRecapExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {isScribe && (
                  <button
                    type="button"
                    onClick={handleGenerateRecap}
                    disabled={recapGenerating}
                    className="px-3 py-1 text-xs font-semibold rounded-lg bg-amber-600/30 hover:bg-amber-600/40 border border-amber-600/50 text-amber-200 transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    {recapGenerating ? "Synthesizing with Gemini..." : "Regenerate Recap"}
                  </button>
                )}
              </div>

              {isRecapExpanded ? (
                <p className="text-sm sm:text-base font-serif italic text-amber-100/90 leading-relaxed pt-1">
                  {homeData?.recap?.text ||
                    "The siege of Vilgeismar tightens. Hunger gnaws at the lower quarters while the nobility hides behind iron gates. Whispers of the Starving Miracle echo from the flooded canals to the crypts beneath the Church..."}
                </p>
              ) : (
                <p
                  onClick={() => setIsRecapExpanded(true)}
                  className="text-xs font-serif italic text-slate-400 truncate cursor-pointer hover:text-slate-300 pt-0.5"
                >
                  {(homeData?.recap?.text || "The siege of Vilgeismar tightens...").slice(0, 120)}... (click to expand)
                </p>
              )}
            </div>

            {/* Quick Overview Grid: Priority Quests & Party Roster */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Priority Quests */}
              <div className="lg:col-span-2 p-5 rounded-2xl bg-fantasy-850 border border-fantasy-700 space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-bold text-base text-amber-200 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-amber-400" />
                    Priority Inquiries & Quests
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab("quests")}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-0.5"
                  >
                    View All Quests <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {!homeData?.quests?.length ? (
                    <p className="text-xs text-slate-500 italic py-4 text-center">
                      No active investigations recorded.
                    </p>
                  ) : (
                    homeData.quests.map((q) => (
                      <div
                        key={q.path}
                        onClick={() => setSelectedNotePath(q.path)}
                        className="p-3.5 rounded-xl bg-fantasy-900 hover:bg-fantasy-800 border border-fantasy-700/80 hover:border-amber-500/50 transition cursor-pointer flex items-center justify-between group"
                      >
                        <div className="space-y-1 min-w-0 pr-2">
                          <h4 className="font-serif font-semibold text-sm text-amber-200 group-hover:text-amber-100 truncate">
                            {q.title}
                          </h4>
                          {q.summary && (
                            <p className="text-xs text-slate-400 line-clamp-1">
                              {q.summary}
                            </p>
                          )}
                        </div>
                        {q.priority && (
                          <span className="px-2 py-0.5 text-[10px] rounded uppercase font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/60 flex-shrink-0">
                            {q.priority}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Active Adventurers Roster */}
              <div className="p-5 rounded-2xl bg-fantasy-850 border border-fantasy-700 space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-bold text-base text-amber-200 flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    Adventuring Roster
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab("party")}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-0.5"
                  >
                    Party Hub <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  {!homeData?.roster?.length ? (
                    <p className="text-xs text-slate-500 italic py-4 text-center">
                      No registered adventurers.
                    </p>
                  ) : (
                    homeData.roster.map((pc) => (
                      <div
                        key={pc.id}
                        className="p-2.5 rounded-lg bg-fantasy-900 border border-fantasy-700/60 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-serif font-bold text-amber-200">
                            {pc.character}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {pc.class || "Adventurer"} {pc.level ? `· Lvl ${pc.level}` : ""}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500">Player: {pc.name}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Recent Codex Updates */}
            {homeData?.recent && homeData.recent.length > 0 && (
              <div className="p-5 rounded-2xl bg-fantasy-850 border border-fantasy-700 space-y-3 shadow-lg">
                <h3 className="font-serif font-bold text-sm text-slate-300 uppercase tracking-wider">
                  Recently Updated Codex Records
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {homeData.recent.slice(0, 8).map((note) => (
                    <button
                      key={note.path}
                      type="button"
                      onClick={() => setSelectedNotePath(note.path)}
                      className="p-3 rounded-xl bg-fantasy-900 hover:bg-fantasy-800 border border-fantasy-700/80 hover:border-amber-500/40 text-left transition flex items-center justify-between group shadow"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-serif font-semibold text-xs text-amber-200 group-hover:text-amber-100 truncate">
                          {note.title}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                          {note.category}
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: CATEGORY DIRECTORIES (NPCs, Locations, Lore) */}
        {["npcs", "locations", "lore"].includes(activeTab) && (
          <div className="space-y-6">
            {/* Category Header & Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-fantasy-700/60 gap-4">
              <div>
                <h2 className="text-xl font-serif font-bold text-amber-200 capitalize flex items-center gap-2">
                  {activeTab === "npcs" && <Users className="w-5 h-5 text-amber-400" />}
                  {activeTab === "locations" && <MapPin className="w-5 h-5 text-amber-400" />}
                  {activeTab === "lore" && <BookOpen className="w-5 h-5 text-amber-400" />}
                  {activeTab === "lore" ? "Campaign Lore & Church" : `${activeTab} Codex`}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activeTab === "npcs" && "Dossiers on allies, villains, informants, and nobles of Vilgeismar"}
                  {activeTab === "locations" && "Districts, canals, crypts, and strongholds of the starved city"}
                  {activeTab === "lore" && "Church archives, hymns, sacred relics, factions, and secret histories"}
                </p>
              </div>

              {/* Search & Sub-category Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder={`Filter ${activeTab}...`}
                    className="pl-8 pr-3 py-1.5 text-xs bg-fantasy-900 border border-fantasy-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-44"
                  />
                </div>

                {subFolders.length > 0 && (
                  <select
                    value={filterSub}
                    onChange={(e) => setFilterSub(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-fantasy-900 border border-fantasy-700 rounded-lg text-slate-300 focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">All Subfolders</option>
                    {subFolders.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Notes Grid */}
            {categoryLoading ? (
              <div className="py-20 flex justify-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-sm italic">
                No matching records found in this category.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredNotes.map((note) => (
                  <div
                    key={note.path}
                    onClick={() => setSelectedNotePath(note.path)}
                    className="p-4 rounded-xl bg-fantasy-850 hover:bg-fantasy-800 border border-fantasy-700/80 hover:border-amber-500/50 transition cursor-pointer flex flex-col justify-between shadow group space-y-2"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-serif font-bold text-sm text-amber-200 group-hover:text-amber-100 leading-snug">
                          {note.title}
                        </h4>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {note.sub && (
                            <span className="px-1.5 py-0.2 text-[9px] rounded bg-fantasy-800 text-amber-400 border border-fantasy-700">
                              {note.sub}
                            </span>
                          )}
                          {note.secret && (
                            <span className="p-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-800/60" title="Secret / DM only">
                              <EyeOff className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </div>

                      {note.summary && (
                        <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                          {note.summary}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-fantasy-700/40 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{note.path.split("/").slice(1, -1).join(" / ")}</span>
                      <span className="text-amber-400 font-medium group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                        Read Note <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: QUESTS & INVESTIGATIONS */}
        {activeTab === "quests" && (
          <QuestBoard
            quests={categoryNotes}
            onSelectQuest={(path) => setSelectedNotePath(path)}
            isScribe={isScribe}
            onStatusChange={handleQuestStatusChange}
          />
        )}

        {/* VIEW 4: PARTY & LOOT */}
        {activeTab === "party" && partyData && (
          <PartyLootView
            characters={partyData.characters || []}
            loot={partyData.loot || []}
            myItems={partyData.mine || []}
            claimedItems={partyData.claimed || []}
            inventoryPath={partyData.inventoryPath}
            currentUser={currentUser}
            onSelectNote={(path) => setSelectedNotePath(path)}
            onClaimItem={handleClaimItem}
            onToggleCharacterVisibility={handleToggleCharacterVisibility}
          />
        )}

        {/* VIEW 5: LIVE SCRATCHPAD */}
        {activeTab === "scratchpad" && (
          <ScratchpadView isScribe={isScribe} currentUser={currentUser} />
        )}

        {/* VIEW 6: AUDIO SCRIBE (Scribe only) */}
        {activeTab === "audio" && isScribe && (
          <AudioScribe
            isScribe={isScribe}
            sessionDate={homeData?.activeSessionDate || "2026-11-04"}
          />
        )}

        {/* VIEW 7: AI REVIEWS (Scribe only) */}
        {activeTab === "reviews" && isScribe && <ScribeReviewsView />}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-fantasy-900/95 backdrop-blur-md border-t border-fantasy-700/80 px-2 py-2 flex items-center justify-around text-[10px]">
        {[
          { id: "home", label: "Home", icon: Sparkles },
          { id: "npcs", label: "NPCs", icon: Users },
          { id: "locations", label: "Places", icon: MapPin },
          { id: "lore", label: "Lore", icon: BookOpen },
          { id: "quests", label: "Quests", icon: Compass },
          { id: "party", label: "Party", icon: Backpack },
          { id: "scratchpad", label: "Notes", icon: Edit3 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg transition ${
                isActive ? "text-amber-400 font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Note Reading / Editing Modal */}
      <NoteModal
        path={selectedNotePath}
        isOpen={!!selectedNotePath}
        onClose={() => setSelectedNotePath(null)}
        onNavigate={(target) => {
          // Normalize target and find in index
          const candidate = categoryNotes.find(
            (n) => n.title.toLowerCase() === target.toLowerCase()
          );
          if (candidate) {
            setSelectedNotePath(candidate.path);
          } else {
            // Search or fallback
            fetch("/api/notes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ q: target }),
            })
              .then((res) => res.json())
              .then((data) => {
                if (data.results?.length > 0) {
                  setSelectedNotePath(data.results[0].meta.path);
                } else {
                  alert(`Note not found: ${target}`);
                }
              });
          }
        }}
        isScribe={isScribe}
        currentUser={currentUser}
        onNoteUpdated={() => {
          if (activeTab === "home") fetchHome();
          else if (["npcs", "locations", "lore", "quests"].includes(activeTab)) {
            const catMap: Record<string, string> = {
              npcs: "npc",
              locations: "location",
              lore: "lore",
              quests: "quest",
            };
            fetchCategory(catMap[activeTab]);
          } else if (activeTab === "party") {
            fetchParty();
          }
        }}
      />

      {/* Global Search Modal (Ctrl+K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectNote={(path) => setSelectedNotePath(path)}
      />

      {/* Table Tools (Dice & Initiative Drawer) */}
      <DiceInitiativeDrawer
        isOpen={isDiceOpen}
        onClose={() => setIsDiceOpen(false)}
        partyMembers={
          homeData?.roster || [
            { character: "Vex", name: "Chris" },
            { character: "Cedric", name: "Travis" },
            { character: "Colm", name: "Johno" },
            { character: "Vola", name: "Jess" },
            { character: "Erevan", name: "Damon" },
            { character: "Aewren", name: "Victoria" },
            { character: "Ruik", name: "Jake" },
          ]
        }
      />
    </div>
  );
}
