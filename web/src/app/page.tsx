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
  Smartphone,
  Download,
} from "lucide-react";
import { LoginView } from "@/components/LoginView";
import { NoteModal } from "@/components/NoteModal";
import { MarkdownView } from "@/components/MarkdownView";
import { QuestBoard, questBucket } from "@/components/QuestBoard";
import { PartyLootView } from "@/components/PartyLootView";
import { ScratchpadView } from "@/components/ScratchpadView";
import { AudioScribe } from "@/components/AudioScribe";
import { ScribeReviewsView } from "@/components/ScribeReviewsView";
import { ObsidianSyncView } from "@/components/ObsidianSyncView";
import { DiceInitiativeDrawer } from "@/components/DiceInitiativeDrawer";
import { GlobalSearchModal } from "@/components/GlobalSearchModal";
import { NetworkStatusBar } from "@/components/NetworkStatusBar";
import { CreateNoteModal } from "@/components/CreateNoteModal";
import { CreateCampaignModal } from "@/components/CreateCampaignModal";
import { ManageRolesModal } from "@/components/ManageRolesModal";
import { setCachedData, getCachedData } from "@/lib/cache";
import { getStatusBadge } from "@/lib/statusConfig";
import { applyJournalToNotes } from "@/lib/mutationJournal";

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
  ownerType?: "dm" | "shared" | "private";
  ownerLabel?: string;
  archiveVotes?: string[];
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
  const [currentCampaign, setCurrentCampaign] = useState<{ id: string; name: string } | null>(null);
  const [isCampaignMenuOpen, setIsCampaignMenuOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "home" | "npcs" | "locations" | "lore" | "quests" | "party" | "scratchpad" | "audio" | "reviews" | "sync"
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
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Party & Loot data
  const [partyData, setPartyData] = useState<any>(null);

  // Modals & Drawers
  const [selectedNotePath, setSelectedNotePath] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDiceOpen, setIsDiceOpen] = useState(false);
  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false);
  const [createNoteCategory, setCreateNoteCategory] = useState("npc");
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false);
  const [isManageRolesOpen, setIsManageRolesOpen] = useState(false);
  const [isPlayerViewActive, setIsPlayerViewActive] = useState(false);

  // Check login on mount
  const checkAuth = useCallback(async () => {
    setAuthLoading(true);
    if (typeof document !== "undefined") {
      setIsPlayerViewActive(document.cookie.includes("hub_view_as_player=1"));
    }
    // Pre-seed cached home dashboard immediately for instant mobile display
    const cached = getCachedData<HomeData>("home_dashboard");
    if (cached?.data) setHomeData(cached.data);
    try {
      const res = await fetch("/api/me");
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUser(data.user);
        if (data.campaign) setCurrentCampaign(data.campaign);
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

  // Multi-tier Android hardware back button dispatcher
  useEffect(() => {
    (window as any).__handleAndroidBack = () => {
      // Tier 1: Modals
      if (selectedNotePath) {
        setSelectedNotePath(null);
        return true;
      }
      if (isCreateNoteOpen) {
        setIsCreateNoteOpen(false);
        return true;
      }
      if (isCreateCampaignOpen) {
        setIsCreateCampaignOpen(false);
        return true;
      }
      // Tier 2: Search Dialog
      if (isSearchOpen) {
        setIsSearchOpen(false);
        return true;
      }
      // Tier 3: Dice & Initiative Drawer
      if (isDiceOpen) {
        setIsDiceOpen(false);
        return true;
      }
      // Tier 4: Campaign Menu Dropdown
      if (isCampaignMenuOpen) {
        setIsCampaignMenuOpen(false);
        return true;
      }
      // Tier 5: Sub-tab navigation -> Return to Home
      if (activeTab !== "home") {
        setActiveTab("home");
        return true;
      }
      // Tier 6: At root Home screen -> allow Android native exit confirmation
      return false;
    };
    return () => {
      (window as any).__handleAndroidBack = undefined;
    };
  }, [selectedNotePath, isCreateNoteOpen, isCreateCampaignOpen, isSearchOpen, isDiceOpen, isCampaignMenuOpen, activeTab]);

  // Fetch Home dashboard
  const fetchHome = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/home");
      const data = await res.json();
      if (data.success) {
        if (data.quests) data.quests = applyJournalToNotes(data.quests);
        if (data.recent) data.recent = applyJournalToNotes(data.recent);
        setHomeData(data);
        setCachedData("home_dashboard", data);
      } else {
        const cached = getCachedData<HomeData>("home_dashboard");
        if (cached?.data) {
          const c = cached.data;
          if (c.quests) c.quests = applyJournalToNotes(c.quests);
          if (c.recent) c.recent = applyJournalToNotes(c.recent);
          setHomeData(c);
        }
      }
    } catch (e) {
      console.warn("Loading cached home dashboard", e);
      const cached = getCachedData<HomeData>("home_dashboard");
      if (cached?.data) {
        const c = cached.data;
        if (c.quests) c.quests = applyJournalToNotes(c.quests);
        if (c.recent) c.recent = applyJournalToNotes(c.recent);
        setHomeData(c);
      }
    }
  }, [currentUser]);

  // Fetch Category Notes (NPCs, Locations, Lore, Quests)
  const fetchCategory = useCallback(async (cat: string) => {
    setCategoryLoading(true);
    setFilterQuery("");
    setFilterSub("all");
    setStatusFilter("all");
    try {
      const res = await fetch(`/api/notes?category=${cat}&archived=1`);
      const data = await res.json();
      if (data.success) {
        const merged = applyJournalToNotes<NoteMeta>(data.notes || []);
        setCategoryNotes(merged);
        setCachedData(`cat_${cat}`, merged);
      }
    } catch (e) {
      console.warn(`Loading cached notes for ${cat}`, e);
      const cached = getCachedData<NoteMeta[]>(`cat_${cat}`);
      if (cached?.data) setCategoryNotes(applyJournalToNotes(cached.data));
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
        if (data.characters) data.characters = applyJournalToNotes(data.characters);
        setPartyData(data);
        setCachedData("party_data", data);
      }
    } catch (e) {
      console.warn("Loading cached party data", e);
      const cached = getCachedData<any>("party_data");
      if (cached?.data) {
        const c = cached.data;
        if (c.characters) c.characters = applyJournalToNotes(c.characters);
        setPartyData(c);
      }
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

  const handleTogglePlayerView = () => {
    const next = !isPlayerViewActive;
    setIsPlayerViewActive(next);
    if (typeof document !== "undefined") {
      if (next) {
        document.cookie = "hub_view_as_player=1; path=/; max-age=86400";
      } else {
        document.cookie = "hub_view_as_player=0; path=/; max-age=0";
      }
    }
    fetchHome();
    if (["npcs", "locations", "lore", "quests"].includes(activeTab)) {
      const catMap: Record<string, string> = {
        npcs: "npc",
        locations: "location",
        lore: "lore",
        quests: "quest",
      };
      fetchCategory(catMap[activeTab]);
    }
    if (activeTab === "party") {
      fetchParty();
    }
  };

  const handleOpenCreateNote = (tab: string) => {
    const catMap: Record<string, string> = {
      npcs: "npc",
      locations: "location",
      lore: "lore",
      quests: "quest",
    };
    setCreateNoteCategory(catMap[tab] || "npc");
    setIsCreateNoteOpen(true);
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
    // Optimistic UI toggle
    if (partyData?.characters) {
      setPartyData({
        ...partyData,
        characters: partyData.characters.map((c: any) =>
          c.path === path ? { ...c, visibleToParty: !currentVisible } : c
        ),
      });
    }
    try {
      const res = await fetch("/api/note/meta", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, key: "visible_to_party", value: !currentVisible }),
      });
      if (res.ok) {
        await fetchParty();
      } else {
        const err = await res.json().catch(() => ({}));
        alert("Could not update visibility: " + (err.error || res.statusText));
        await fetchParty();
      }
    } catch (e: any) {
      alert("Error updating visibility: " + e.message);
      await fetchParty();
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
    if (n.status === "archived") return false;
    const matchesQuery =
      !filterQuery.trim() ||
      n.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (n.summary || "").toLowerCase().includes(filterQuery.toLowerCase());
    const matchesSub = filterSub === "all" || n.sub === filterSub;
    if (!matchesQuery || !matchesSub) return false;

    if (statusFilter !== "all") {
      const s = (n.status || "").toLowerCase().trim();
      if (statusFilter === "alive") {
        return !s || s === "alive" || s === "living" || s === "active";
      }
      if (statusFilter === "deceased") {
        return /(dead|deceased|fallen|killed)/.test(s);
      }
      if (statusFilter === "missing") {
        return /(missing|lost|kidnapped)/.test(s);
      }
      return s === statusFilter;
    }

    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-fantasy-900 text-slate-200">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-fantasy-850/95 backdrop-blur-md border-b border-fantasy-700/80 px-4 sm:px-6 py-2.5 pt-safe">
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
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCampaignMenuOpen(!isCampaignMenuOpen);
                  }}
                  className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-amber-300 transition"
                  title="Click to view or switch campaign"
                >
                  <span className="text-amber-400 font-semibold underline decoration-dotted">
                    {currentCampaign?.name || "Starving Vilgeismar"}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                  <span className="hidden sm:inline">• Codex</span>
                </button>

                {isCampaignMenuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-0 top-full mt-2 w-64 p-2.5 rounded-xl bg-fantasy-850 border border-fantasy-700 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 space-y-2"
                  >
                    <div className="p-2 border-b border-fantasy-700/60">
                      <div className="text-[10px] uppercase font-semibold text-slate-400">Active Campaign</div>
                      <div className="font-serif font-bold text-sm text-amber-200">
                        {currentCampaign?.name || "Starving Vilgeismar"}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsCampaignMenuOpen(false);
                        setIsCreateCampaignOpen(true);
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-lg text-xs bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-600/40 flex items-center justify-between transition group/btn font-semibold"
                    >
                      <span className="flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-amber-400" /> Create New Campaign
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsCampaignMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-slate-400 hover:bg-fantasy-800 hover:text-slate-200 flex items-center justify-between transition group/btn font-medium"
                    >
                      <span>Switch Campaign</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>

                    <div className="pt-1 border-t border-fantasy-700/60">
                      <a
                        href="https://github.com/inchyc/dnd-campaign-note/raw/main/release/D&D-Campaign-Notes.apk"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full text-left px-2.5 py-2 rounded-lg text-xs bg-fantasy-800 hover:bg-fantasy-750 text-slate-300 hover:text-white border border-fantasy-700 flex items-center justify-between transition group/btn font-medium"
                        title="Download Android APK directly"
                      >
                        <span className="flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-amber-400" /> Get Android App (v1.1.3)
                        </span>
                        <Download className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-amber-400" />
                      </a>
                    </div>
                  </div>
                )}
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

            {/* Player View Toggle (Scribe / DM Only) */}
            {isScribe && (
              <button
                type="button"
                onClick={handleTogglePlayerView}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
                  isPlayerViewActive
                    ? "bg-rose-950/70 border-rose-500 text-rose-300 shadow-sm"
                    : "bg-fantasy-800 hover:bg-fantasy-700 border-fantasy-700 text-slate-300"
                }`}
                title={
                  isPlayerViewActive
                    ? "Player View is ACTIVE: DM secrets and private notes are hidden. Click to restore DM view."
                    : "Switch to Player View to preview exactly what players see."
                }
              >
                {isPlayerViewActive ? <EyeOff className="w-3.5 h-3.5 text-rose-400" /> : <Eye className="w-3.5 h-3.5 text-amber-400" />}
                <span className="hidden sm:inline">
                  {isPlayerViewActive ? "Player View: ON" : "Player View"}
                </span>
              </button>
            )}

            {/* Manage Roles Button (Scribes Only) */}
            {isScribe && (
              <button
                type="button"
                onClick={() => setIsManageRolesOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-fantasy-800 hover:bg-fantasy-700 border border-fantasy-700 text-xs text-amber-200 font-semibold transition"
                title="Manage Scribes and assign party duties"
              >
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Party Roles</span>
              </button>
            )}

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
            { id: "sync", label: "Sync & Vault", icon: RefreshCw },
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
                    <div className="p-6 rounded-xl bg-fantasy-900/60 border border-fantasy-700/50 text-center space-y-2">
                      <Compass className="w-6 h-6 text-amber-500/40 mx-auto" />
                      <p className="text-xs text-slate-400 font-medium">No active inquiries recorded.</p>
                      <button
                        type="button"
                        onClick={() => setActiveTab("quests")}
                        className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold underline"
                      >
                        Explore all campaign quests
                      </button>
                    </div>
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
                    <div className="p-6 rounded-xl bg-fantasy-900/60 border border-fantasy-700/50 text-center space-y-2">
                      <Shield className="w-6 h-6 text-amber-500/40 mx-auto" />
                      <p className="text-xs text-slate-400 font-medium">No registered adventurers.</p>
                      <button
                        type="button"
                        onClick={() => setActiveTab("party")}
                        className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold underline"
                      >
                        Open Party Hub
                      </button>
                    </div>
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
          <div className="space-y-4 sm:space-y-6">
            {/* Mobile Sub-category Switcher (Codex Pill Selector) */}
            <div className="md:hidden flex items-center justify-center p-1 bg-fantasy-800/80 rounded-xl border border-fantasy-700/60 max-w-sm mx-auto w-full">
              <button
                type="button"
                onClick={() => setActiveTab("npcs")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                  activeTab === "npcs" ? "bg-amber-600 text-slate-950 shadow font-bold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>NPCs</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("locations")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                  activeTab === "locations" ? "bg-amber-600 text-slate-950 shadow font-bold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Places</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("lore")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                  activeTab === "lore" ? "bg-amber-600 text-slate-950 shadow font-bold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Lore</span>
              </button>
            </div>
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

              {/* Search & Sub-category Filter & + New Note */}
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

                <button
                  type="button"
                  onClick={() => handleOpenCreateNote(activeTab)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 flex items-center gap-1.5 transition shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    New {activeTab === "npcs" ? "NPC" : activeTab === "locations" ? "Location" : "Lore"}
                  </span>
                </button>
              </div>
            </div>

            {/* Status Filter Pills (NPCs & Places) */}
            {activeTab === "npcs" && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mr-1">Status:</span>
                {[
                  { id: "all", label: "All NPCs" },
                  { id: "alive", label: "💚 Alive" },
                  { id: "deceased", label: "💀 Deceased" },
                  { id: "missing", label: "❓ Missing" },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setStatusFilter(pill.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                      statusFilter === pill.id
                        ? "bg-amber-600 text-slate-950 font-bold shadow"
                        : "bg-fantasy-850 hover:bg-fantasy-800 text-slate-300 border border-fantasy-700/60"
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            )}

            {activeTab === "locations" && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mr-1">Status:</span>
                {[
                  { id: "all", label: "All Places" },
                  { id: "accessible", label: "🏰 Accessible" },
                  { id: "dangerous", label: "⚔️ Dangerous" },
                  { id: "cleared", label: "🛡️ Cleared" },
                  { id: "ruined", label: "🏚️ Ruined" },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setStatusFilter(pill.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                      statusFilter === pill.id
                        ? "bg-amber-600 text-slate-950 font-bold shadow"
                        : "bg-fantasy-850 hover:bg-fantasy-800 text-slate-300 border border-fantasy-700/60"
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            )}

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
                        <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
                          {(() => {
                            const badge = getStatusBadge(note.category, note.status, note.sub);
                            if (!badge) return null;
                            return (
                              <span className={`px-1.5 py-0.2 text-[9px] font-semibold rounded border flex items-center gap-0.5 ${badge.badgeClass}`}>
                                <span>{badge.icon}</span>
                                <span>{badge.label}</span>
                              </span>
                            );
                          })()}
                          {note.sub && (
                            <span className="px-1.5 py-0.2 text-[9px] rounded bg-fantasy-800 text-amber-400 border border-fantasy-700">
                              {note.sub}
                            </span>
                          )}
                          {note.ownerType === "dm" && (
                            <span className="px-1.5 py-0.2 text-[9px] font-semibold rounded bg-rose-950/70 text-rose-300 border border-rose-800/70 flex items-center gap-0.5" title="DM Secret (hidden from players)">
                              <EyeOff className="w-2.5 h-2.5" /> Secret
                            </span>
                          )}
                          {note.ownerType === "private" && (
                            <span className="px-1.5 py-0.2 text-[9px] font-semibold rounded bg-purple-950/70 text-purple-300 border border-purple-800/70 flex items-center gap-0.5" title="Private Character Note">
                              👤 {note.ownerLabel || "Private"}
                            </span>
                          )}
                          {note.ownerType === "shared" && (
                            <span className="px-1.5 py-0.2 text-[9px] font-semibold rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/70 flex items-center gap-0.5" title="Party Shared Note">
                              👥 Shared
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
            currentUser={currentUser}
            onStatusChange={handleQuestStatusChange}
            onRefresh={() => fetchCategory("quest")}
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
            isScribe={isScribe}
            onOpenManageRoles={() => setIsManageRolesOpen(true)}
            onSelectNote={(path) => setSelectedNotePath(path)}
            onClaimItem={handleClaimItem}
            onToggleCharacterVisibility={handleToggleCharacterVisibility}
          />
        )}

        {/* VIEW 5: LIVE SCRATCHPAD & SCRIBE TOOLS */}
        {activeTab === "scratchpad" && (
          <div className="space-y-4">
            {isScribe && (
              <div className="md:hidden flex items-center justify-center p-1 bg-fantasy-800/80 rounded-xl border border-fantasy-700/60 max-w-sm mx-auto w-full mb-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("scratchpad")}
                  className="flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 bg-amber-600 text-slate-950 shadow font-bold"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Scratchpad</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("audio")}
                  className="flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 text-slate-400 hover:text-slate-200"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Audio</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("reviews")}
                  className="flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 text-slate-400 hover:text-slate-200"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Reviews</span>
                </button>
              </div>
            )}
            <ScratchpadView isScribe={isScribe} currentUser={currentUser} />
          </div>
        )}

        {/* VIEW 6: AUDIO SCRIBE (Scribe only) */}
        {activeTab === "audio" && isScribe && (
          <div className="space-y-4">
            <div className="md:hidden flex items-center justify-center p-1 bg-fantasy-800/80 rounded-xl border border-fantasy-700/60 max-w-sm mx-auto w-full mb-3">
              <button
                type="button"
                onClick={() => setActiveTab("scratchpad")}
                className="flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 text-slate-400 hover:text-slate-200"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Scratchpad</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("audio")}
                className="flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 bg-amber-600 text-slate-950 shadow font-bold"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Audio</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("reviews")}
                className="flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 text-slate-400 hover:text-slate-200"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Reviews</span>
              </button>
            </div>
            <AudioScribe
              isScribe={isScribe}
              sessionDate={homeData?.activeSessionDate || "2026-11-04"}
            />
          </div>
        )}

        {/* VIEW 7: AI REVIEWS (Scribe only) */}
        {activeTab === "reviews" && isScribe && (
          <div className="space-y-4">
            <div className="md:hidden flex items-center justify-center p-1 bg-fantasy-800/80 rounded-xl border border-fantasy-700/60 max-w-sm mx-auto w-full mb-3">
              <button
                type="button"
                onClick={() => setActiveTab("scratchpad")}
                className="flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 text-slate-400 hover:text-slate-200"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Scratchpad</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("audio")}
                className="flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 text-slate-400 hover:text-slate-200"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Audio</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("reviews")}
                className="flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 bg-amber-600 text-slate-950 shadow font-bold"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Reviews</span>
              </button>
            </div>
            <ScribeReviewsView />
          </div>
        )}

        {/* VIEW 9: OBSIDIAN SYNC & VAULT */}
        {activeTab === "sync" && (
          <ObsidianSyncView activeCampaign={currentCampaign} isScribe={isScribe} />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Clean Ergonomic Tabs) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-fantasy-900/95 backdrop-blur-md border-t border-fantasy-700/80 px-2 pt-2 pb-safe flex items-center justify-around text-[10px]">
        {[
          {
            id: "home",
            label: "Home",
            icon: Sparkles,
            active: activeTab === "home",
            onClick: () => setActiveTab("home"),
          },
          {
            id: "quests",
            label: "Quests",
            icon: Compass,
            active: activeTab === "quests",
            onClick: () => setActiveTab("quests"),
          },
          {
            id: "codex",
            label: "Codex",
            icon: BookOpen,
            active: ["npcs", "locations", "lore"].includes(activeTab),
            onClick: () => {
              if (!["npcs", "locations", "lore"].includes(activeTab)) {
                setActiveTab("npcs");
              }
            },
          },
          {
            id: "party",
            label: "Party",
            icon: Backpack,
            active: activeTab === "party",
            onClick: () => setActiveTab("party"),
          },
          {
            id: "scratchpad",
            label: "Notes",
            icon: Edit3,
            active: ["scratchpad", "audio", "reviews"].includes(activeTab),
            onClick: () => setActiveTab("scratchpad"),
          },
          {
            id: "sync",
            label: "Sync",
            icon: RefreshCw,
            active: activeTab === "sync",
            onClick: () => setActiveTab("sync"),
          },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={tab.onClick}
              className={`flex-1 flex flex-col items-center gap-1 py-1 px-1 rounded-xl transition ${
                tab.active ? "text-amber-400 font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className={`p-1 rounded-lg ${tab.active ? "bg-amber-500/15" : ""}`}>
                <Icon className={`w-5 h-5 ${tab.active ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
              </div>
              <span className="text-[10px] leading-tight">{tab.label}</span>
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

      {/* Create Note Modal */}
      <CreateNoteModal
        isOpen={isCreateNoteOpen}
        onClose={() => setIsCreateNoteOpen(false)}
        defaultCategory={createNoteCategory}
        isScribe={isScribe}
        onNoteCreated={(newPath) => {
          setSelectedNotePath(newPath);
          fetchCategory(createNoteCategory);
        }}
      />

      {/* Create Campaign Modal */}
      <CreateCampaignModal
        isOpen={isCreateCampaignOpen}
        onClose={() => setIsCreateCampaignOpen(false)}
        onCampaignCreated={async () => {
          setIsCreateCampaignOpen(false);
          await handleLogout();
        }}
      />

      {/* Manage Party Roles Modal */}
      <ManageRolesModal
        isOpen={isManageRolesOpen}
        onClose={() => setIsManageRolesOpen(false)}
        campaignId={currentCampaign?.id || "starving-vilgeismar"}
        currentUserId={currentUser.id}
        onRolesUpdated={(updatedUsers) => {
          const self = updatedUsers.find((u) => u.id === currentUser.id);
          if (self && self.role !== currentUser.role) {
            setCurrentUser({ ...currentUser, role: self.role });
          }
          fetchParty();
        }}
      />

      {/* Network & Offline Status Pill */}
      <NetworkStatusBar />
    </div>
  );
}
