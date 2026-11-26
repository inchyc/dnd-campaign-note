"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Calendar,
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
  Menu,
} from "lucide-react";
import { LoginView } from "@/components/LoginView";
import { NoteModal } from "@/components/NoteModal";
import { MarkdownView } from "@/components/MarkdownView";
import { QuestBoard, questBucket } from "@/components/QuestBoard";
import { PartyLootView } from "@/components/PartyLootView";
import { ScratchpadView } from "@/components/ScratchpadView";
import { SessionNotesView } from "@/components/SessionNotesView";
import { AudioScribe } from "@/components/AudioScribe";
import { ScribeReviewsView } from "@/components/ScribeReviewsView";
import { ObsidianSyncView } from "@/components/ObsidianSyncView";
import { CharacterSheetView } from "@/components/CharacterSheetView";
import { DiceInitiativeDrawer } from "@/components/DiceInitiativeDrawer";
import { GlobalSearchModal, CommandAction } from "@/components/GlobalSearchModal";
import { NetworkStatusBar } from "@/components/NetworkStatusBar";
import { CreateNoteModal } from "@/components/CreateNoteModal";
import { CreateCampaignModal } from "@/components/CreateCampaignModal";
import { ManageRolesModal } from "@/components/ManageRolesModal";
import { FeedbackProvider, useFeedback } from "@/components/FeedbackContext";
import { TableToolsProvider, useTableTools } from "@/components/TableToolsContext";
import { AppSidebar, HubTabId } from "@/components/AppSidebar";
import { MobileNavDrawer } from "@/components/MobileNavDrawer";
import { invalidateWikiLinkSuggestions } from "@/components/WikiLinkTextarea";
import { setCachedData, getCachedData } from "@/lib/cache";
import { getStatusBadge } from "@/lib/statusConfig";
import { applyJournalToNotes } from "@/lib/mutationJournal";
import { useSupabaseRealtime, RealtimeNoteEvent } from "@/lib/useSupabaseRealtime";

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
  return (
    <FeedbackProvider>
      <TableToolsProvider partyMembers={[]}>
        <CampaignHubInner />
      </TableToolsProvider>
    </FeedbackProvider>
  );
}

function CampaignHubInner() {
  const { toast } = useFeedback();
  const { isDrawerOpen, openDrawer, closeDrawer, rollDice, configureTableSession, refreshTableState } = useTableTools();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [currentCampaign, setCurrentCampaign] = useState<{ id: string; name: string } | null>(null);
  const [isCampaignMenuOpen, setIsCampaignMenuOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<HubTabId>("home");

  // Home dashboard data
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [recapGenerating, setRecapGenerating] = useState(false);
  const [isRecapExpanded, setIsRecapExpanded] = useState(true);

  // Category notes cache
  const notesByCategoryRef = useRef<Record<string, NoteMeta[]>>({});
  const [categoryNotes, setCategoryNotes] = useState<NoteMeta[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [filterSub, setFilterSub] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Party & Loot data
  const [partyData, setPartyData] = useState<any>(null);

  // Session Notes refresh & deep-link targeting
  const [targetSessionPath, setTargetSessionPath] = useState<string | null>(null);
  const [sessionRefreshKey, setSessionRefreshKey] = useState(0);

  // Modals & Drawers
  const [selectedNotePath, setSelectedNotePath] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false);
  const [createNoteCategory, setCreateNoteCategory] = useState("npc");
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false);
  const [isManageRolesOpen, setIsManageRolesOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
      if (isDrawerOpen) {
        closeDrawer();
        return true;
      }
      // Tier 4: Campaign Menu Dropdown & Mobile Nav Drawer
      if (isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        return true;
      }
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
  }, [selectedNotePath, isCreateNoteOpen, isCreateCampaignOpen, isSearchOpen, isDrawerOpen, closeDrawer, isMobileMenuOpen, isCampaignMenuOpen, activeTab]);

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

  // Fetch Category Notes (NPCs, Locations, Lore, Quests) with instant stale-while-revalidate
  const fetchCategory = useCallback(async (cat: string) => {
    setFilterQuery("");
    setFilterSub("all");
    setStatusFilter("all");

    const memHit = notesByCategoryRef.current[cat];
    const diskHit = memHit ? null : getCachedData<NoteMeta[]>(`cat_${cat}`);
    const seed = memHit || (diskHit?.data ? applyJournalToNotes(diskHit.data) : null);

    if (seed) {
      setCategoryNotes(seed);
      setCategoryLoading(false);
    } else {
      setCategoryLoading(true);
    }

    try {
      const res = await fetch(`/api/notes?category=${cat}&archived=1`);
      const data = await res.json();
      if (data.success) {
        const merged = applyJournalToNotes<NoteMeta>(data.notes || []);
        notesByCategoryRef.current[cat] = merged;
        setCategoryNotes(merged);
        setCachedData(`cat_${cat}`, merged);
      }
    } catch (e) {
      console.warn(`Using cached notes for ${cat}`, e);
    } finally {
      setCategoryLoading(false);
    }
  }, []);

  // Fetch Party & Loot with instant stale-while-revalidate
  const fetchParty = useCallback(async () => {
    const cached = getCachedData<any>("party_data");
    if (cached?.data) {
      const c = cached.data;
      if (c.characters) c.characters = applyJournalToNotes(c.characters);
      setPartyData((prev: any) => prev || c);
    }
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
    }
  }, []);

  // Quietly prefetch common categories in background after sign-in for instant tab switching
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const cats = ["npc", "location", "lore", "quest"];
      for (const cat of cats) {
        if (cancelled) break;
        if (notesByCategoryRef.current[cat]) continue;
        try {
          const res = await fetch(`/api/notes?category=${cat}&archived=1`);
          const data = await res.json();
          if (!cancelled && data.success) {
            const merged = applyJournalToNotes<NoteMeta>(data.notes || []);
            notesByCategoryRef.current[cat] = merged;
            setCachedData(`cat_${cat}`, merged);
          }
        } catch {
          // ignore background prefetch errors
        }
      }
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [currentUser]);

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

  // Keep shared TableToolsProvider synchronized with active campaign, user, and party roster
  useEffect(() => {
    configureTableSession({
      campaignId: currentCampaign?.id,
      currentUser,
      partyMembers: homeData?.roster || [],
    });
  }, [configureTableSession, currentCampaign?.id, currentUser, homeData?.roster]);

  // Live Supabase Realtime collaboration across notes, sessions, quests, loot, and table tools
  const realtimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRealtimePathsRef = useRef<Set<string>>(new Set());

  const handleRealtimeChange = useCallback(
    (event: RealtimeNoteEvent) => {
      if (!currentUser) return;
      const changedPath = String(event.new?.path || event.old?.path || "");
      if (changedPath) pendingRealtimePathsRef.current.add(changedPath);

      if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current);
      realtimeTimerRef.current = setTimeout(() => {
        const paths = Array.from(pendingRealtimePathsRef.current);
        pendingRealtimePathsRef.current.clear();

        if (paths.some((p) => p === ".hub/table-state.json")) {
          refreshTableState();
        }
        if (paths.some((p) => p.startsWith("Notes/Session Notes/"))) {
          try {
            localStorage.removeItem("dnd_codex_cache_session_list");
          } catch {
            /* ignore */
          }
          setSessionRefreshKey((k) => k + 1);
        }
        if (paths.some((p) => p.startsWith("Notes/"))) {
          invalidateWikiLinkSuggestions();
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
        }
      }, 600);
    },
    [currentUser, activeTab, fetchHome, fetchCategory, fetchParty, refreshTableState]
  );

  useSupabaseRealtime(currentUser && currentCampaign?.id ? currentCampaign.id : "", handleRealtimeChange);

  useEffect(() => {
    return () => {
      if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current);
    };
  }, []);

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
      sessions: "session",
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
        toast("Campaign recap regenerated!", { type: "success" });
      } else {
        toast(data.error || "Recap generation failed", { type: "error" });
      }
    } catch (e: any) {
      toast("Error: " + e.message, { type: "error" });
    } finally {
      setRecapGenerating(false);
    }
  };

  const handleClaimItem = async (path: string, owner: string) => {
    const prevParty = partyData;
    if (partyData && currentUser) {
      const isReleasing = /^party$/i.test(owner);
      const isMineTarget = owner.toLowerCase() === currentUser.character.toLowerCase();
      const allKnown = [...(partyData.loot || []), ...(partyData.mine || []), ...(partyData.claimed || [])];
      const targetItem = allKnown.find((it: any) => it.path === path);
      if (targetItem) {
        const updatedItem = { ...targetItem, owner };
        setPartyData({
          ...partyData,
          loot: isReleasing
            ? [...(partyData.loot || []).filter((i: any) => i.path !== path), updatedItem]
            : (partyData.loot || []).filter((i: any) => i.path !== path),
          mine: isMineTarget
            ? [...(partyData.mine || []).filter((i: any) => i.path !== path), updatedItem]
            : (partyData.mine || []).filter((i: any) => i.path !== path),
          claimed: !isReleasing && !isMineTarget
            ? [...(partyData.claimed || []).filter((i: any) => i.path !== path), updatedItem]
            : (partyData.claimed || []).filter((i: any) => i.path !== path),
        });
      }
    }

    try {
      const res = await fetch("/api/note/meta", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, key: "owner", value: owner }),
      });
      if (res.ok) {
        toast(/^party$/i.test(owner) ? "Returned item to party stash." : `Claimed for ${owner}.`, { type: "success" });
        await fetchParty();
      } else {
        setPartyData(prevParty);
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Could not update item ownership", { type: "error" });
      }
    } catch (e: any) {
      setPartyData(prevParty);
      toast(e?.message || "Network error updating item ownership", { type: "error" });
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
        toast("Could not update visibility: " + (err.error || res.statusText), { type: "error" });
        await fetchParty();
      }
    } catch (e: any) {
      toast("Error updating visibility: " + e.message, { type: "error" });
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
                          <Smartphone className="w-3.5 h-3.5 text-amber-400" /> Get Android App (v1.3.0)
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
            {/* Mobile drawer menu button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg bg-fantasy-800 text-amber-300 hover:bg-fantasy-700 border border-fantasy-700 transition"
              title="Open navigation menu"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>

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
              onClick={() => openDrawer("dice")}
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
      </header>

      {/* Desktop Sidebar + Main Page Body */}
      <div className="flex flex-1 min-h-0">
        <AppSidebar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          isScribe={isScribe}
          onNewNote={() => handleOpenCreateNote(activeTab)}
          onOpenTableTools={() => openDrawer("dice")}
          activeQuestCount={
            homeData?.quests?.filter((q) => {
              const b = questBucket(q.status);
              return b === "open" || b === "active";
            }).length
          }
        />

        <main className="flex-1 min-w-0 max-w-6xl w-full mx-auto p-4 sm:p-6 pb-24 md:pb-8">
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
            <ScratchpadView
              isScribe={isScribe}
              currentUser={currentUser}
              onOpenSession={(path) => {
                setTargetSessionPath(path);
                setSessionRefreshKey((k) => k + 1);
                setActiveTab("sessions");
              }}
              onOpenReviews={() => setActiveTab("reviews")}
            />
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
              sessionDate={homeData?.activeSessionDate || (homeData as any)?.session || new Date().toISOString().slice(0, 10)}
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

        {/* VIEW: SESSION NOTES */}
        {activeTab === "sessions" && (
          <SessionNotesView
            isScribe={isScribe}
            initialSessionPath={targetSessionPath}
            refreshKey={sessionRefreshKey}
            onOpenScratchpad={() => setActiveTab("scratchpad")}
            onOpenReviews={() => setActiveTab("reviews")}
            onSelectNote={(path) => setSelectedNotePath(path)}
            onNavigateToWikilink={(target) => {
              const candidate = categoryNotes.find(
                (n) => n.title.toLowerCase() === target.toLowerCase()
              );
              if (candidate) {
                setSelectedNotePath(candidate.path);
              } else {
                fetch("/api/notes", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ q: target }),
                })
                  .then((res) => res.json())
                  .then((data) => {
                    if (data.results?.length > 0) {
                      setSelectedNotePath(data.results[0].meta.path);
                    }
                  });
              }
            }}
          />
        )}

        {/* VIEW: 5E CHARACTER SHEET */}
        {activeTab === "sheet" && (
          <CharacterSheetView
            currentUser={currentUser}
            activeCampaign={currentCampaign}
            isScribe={isScribe}
          />
        )}

        {/* VIEW 9: OBSIDIAN SYNC & VAULT */}
        {activeTab === "sync" && (
          <ObsidianSyncView activeCampaign={currentCampaign} isScribe={isScribe} />
        )}
      </main>
      </div>

      {/* Mobile Slide-Out Navigation Drawer (mirrors desktop AppSidebar) */}
      <MobileNavDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        isScribe={isScribe}
        onNewNote={() => handleOpenCreateNote(activeTab)}
        onOpenTableTools={() => openDrawer("dice")}
        activeQuestCount={
          homeData?.quests?.filter((q) => {
            const b = questBucket(q.status);
            return b === "open" || b === "active";
          }).length
        }
        campaignName={currentCampaign?.name}
      />

      {/* Mobile Bottom Navigation Bar (Streamlined 5-tab bar + Menu drawer) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-fantasy-900/95 backdrop-blur-md border-t border-fantasy-700/80 px-2 pt-2 pb-safe flex items-center justify-around text-[10px]">
        {[
          {
            id: "home",
            label: "Home",
            icon: Sparkles,
            active: activeTab === "home" && !isMobileMenuOpen,
            onClick: () => {
              setIsMobileMenuOpen(false);
              setActiveTab("home");
            },
          },
          {
            id: "sheet",
            label: "Sheet",
            icon: Shield,
            active: activeTab === "sheet" && !isMobileMenuOpen,
            onClick: () => {
              setIsMobileMenuOpen(false);
              setActiveTab("sheet");
            },
          },
          {
            id: "quests",
            label: "Quests",
            icon: Compass,
            active: activeTab === "quests" && !isMobileMenuOpen,
            onClick: () => {
              setIsMobileMenuOpen(false);
              setActiveTab("quests");
            },
          },
          {
            id: "scratchpad",
            label: "Notes",
            icon: Edit3,
            active: activeTab === "scratchpad" && !isMobileMenuOpen,
            onClick: () => {
              setIsMobileMenuOpen(false);
              setActiveTab("scratchpad");
            },
          },
          {
            id: "menu",
            label: "Menu",
            icon: Menu,
            active:
              isMobileMenuOpen ||
              ["sessions", "npcs", "locations", "lore", "party", "audio", "reviews", "sync"].includes(activeTab),
            onClick: () => setIsMobileMenuOpen((prev) => !prev),
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
                  toast(`Note not found: ${target}`, { type: "warning" });
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
          } else if (activeTab === "sessions" || selectedNotePath?.includes("Session Notes/")) {
            try {
              localStorage.removeItem("dnd_codex_cache_session_list");
              if (selectedNotePath) {
                localStorage.removeItem(`dnd_codex_cache_session_note_${selectedNotePath}`);
              }
            } catch {
              /* ignore */
            }
            setSessionRefreshKey((k) => k + 1);
          }
        }}
      />

      {/* Global Command Palette (Ctrl+K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectNote={(path) => setSelectedNotePath(path)}
        localNotes={Object.values(notesByCategoryRef.current).flat()}
        actions={[
          {
            id: "roll-d20",
            label: "Roll d20",
            hint: "Dice",
            keywords: "dice roll d20 check",
            icon: <Dices className="w-4 h-4" />,
            onExecute: () => rollDice("1d20", { label: "Quick d20" }),
          },
          {
            id: "roll-adv",
            label: "Roll d20 with Advantage",
            hint: "Dice",
            keywords: "dice advantage d20",
            icon: <Dices className="w-4 h-4" />,
            onExecute: () => rollDice("1d20", { label: "Quick d20 (Advantage)", modeOverride: "advantage" }),
          },
          {
            id: "new-note",
            label: "Create New Codex Note",
            hint: "Action",
            keywords: "add create note npc location lore quest",
            icon: <Plus className="w-4 h-4" />,
            onExecute: () => handleOpenCreateNote(activeTab),
          },
          {
            id: "open-table-tools",
            label: "Open Table Tools (Dice & Initiative)",
            hint: "Drawer",
            keywords: "dice initiative combat tracker",
            icon: <Dices className="w-4 h-4" />,
            onExecute: () => openDrawer("dice"),
          },
          {
            id: "go-sheet",
            label: "Go to Character Sheet",
            hint: "Tab",
            keywords: "character stats hp spells",
            icon: <Shield className="w-4 h-4" />,
            onExecute: () => setActiveTab("sheet"),
          },
          {
            id: "go-quests",
            label: "Go to Quests & Rumors",
            hint: "Tab",
            keywords: "quests board tasks",
            icon: <Compass className="w-4 h-4" />,
            onExecute: () => setActiveTab("quests"),
          },
          {
            id: "go-scratchpad",
            label: "Go to Live Scratchpad",
            hint: "Tab",
            keywords: "notes table feed scratchpad",
            icon: <Edit3 className="w-4 h-4" />,
            onExecute: () => setActiveTab("scratchpad"),
          },
          ...(isScribe
            ? [
                {
                  id: "toggle-player-view",
                  label: isPlayerViewActive ? "Disable Player View (Restore DM)" : "Enable Player View",
                  hint: "Scribe",
                  keywords: "player view secret hide dm",
                  icon: isPlayerViewActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />,
                  onExecute: handleTogglePlayerView,
                } as CommandAction,
              ]
            : []),
        ]}
      />

      {/* Table Tools (Dice & Initiative Drawer) */}
      <DiceInitiativeDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
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
          if (newPath.includes("Session Notes/")) {
            try {
              localStorage.removeItem("dnd_codex_cache_session_list");
            } catch {
              /* ignore */
            }
            setTargetSessionPath(newPath);
            setSessionRefreshKey((k) => k + 1);
            setActiveTab("sessions");
          } else {
            setSelectedNotePath(newPath);
            fetchCategory(createNoteCategory);
          }
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
      <NetworkStatusBar
        onReconnect={() => {
          refreshTableState();
          if (activeTab === "home") fetchHome();
          else if (activeTab === "party") fetchParty();
          else if (activeTab === "sessions") setSessionRefreshKey((k) => k + 1);
          else if (["npcs", "locations", "lore", "quests"].includes(activeTab)) {
            const catMap: Record<string, string> = {
              npcs: "npc",
              locations: "location",
              lore: "lore",
              quests: "quest",
            };
            fetchCategory(catMap[activeTab]);
          }
        }}
      />
    </div>
  );
}
