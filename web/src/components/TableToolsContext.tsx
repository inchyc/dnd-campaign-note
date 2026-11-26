"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { DiceRollResult, RollMode, rollDiceFormula } from "@/lib/dice";
import type { SharedCombatant, SharedRollEntry, SharedTableState } from "@/lib/tableState";
import { useFeedback } from "./FeedbackContext";

export type Combatant = SharedCombatant;

export interface TableRollLogItem extends DiceRollResult {
  at?: number;
  roller?: string;
  character?: string;
  private?: boolean;
}

export interface TableSessionUser {
  id: string;
  name: string;
  character: string;
  role: "scribe" | "player";
}

interface TableToolsContextValue {
  isDrawerOpen: boolean;
  drawerTab: "dice" | "initiative";
  openDrawer: (tab?: "dice" | "initiative") => void;
  closeDrawer: () => void;
  rollMode: RollMode;
  setRollMode: (mode: RollMode) => void;
  modifier: number;
  setModifier: React.Dispatch<React.SetStateAction<number>>;
  isPrivateRoll: boolean;
  setIsPrivateRoll: React.Dispatch<React.SetStateAction<boolean>>;
  rollLog: TableRollLogItem[];
  rollDice: (
    formulaOrSides: string | number,
    options?: { label?: string; modeOverride?: RollMode; applyGlobalModifier?: boolean; silentToast?: boolean }
  ) => TableRollLogItem;
  clearRollLog: () => void;
  combatants: Combatant[];
  setCombatants: React.Dispatch<React.SetStateAction<Combatant[]>>;
  currentTurnIdx: number;
  setCurrentTurnIdx: React.Dispatch<React.SetStateAction<number>>;
  round: number;
  setRound: React.Dispatch<React.SetStateAction<number>>;
  seedPartyInitiative: (party: Array<{ character: string; name: string }>) => void;
  tableSyncedAt: number | null;
  refreshTableState: () => Promise<void>;
  configureTableSession: (cfg: {
    campaignId?: string;
    currentUser?: TableSessionUser | null;
    partyMembers?: Array<{ character: string; name: string }>;
  }) => void;
}

const TableToolsContext = createContext<TableToolsContextValue | null>(null);

export function useTableTools(): TableToolsContextValue {
  const ctx = useContext(TableToolsContext);
  if (!ctx) {
    throw new Error("useTableTools must be used within TableToolsProvider");
  }
  return ctx;
}

const STORAGE_KEY_PREFIX = "dnd_table_tools_v1_";

function toLogItem(r: SharedRollEntry): TableRollLogItem {
  return {
    id: r.id,
    formula: r.formula,
    die: r.die,
    rolls: r.rolls,
    chosen: r.total - r.mod,
    mod: r.mod,
    total: r.total,
    mode: r.mode,
    label: r.label,
    isCrit: r.isCrit,
    isFumble: r.isFumble,
    at: r.at,
    timestamp: new Date(r.at || Date.now()).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    roller: r.roller,
    character: r.character,
    private: r.private,
  };
}

export function TableToolsProvider({
  campaignId: initialCampaignId,
  partyMembers: initialPartyMembers,
  children,
}: {
  campaignId?: string;
  partyMembers: Array<{ character: string; name: string }>;
  children: React.ReactNode;
}) {
  const { toast } = useFeedback();

  const [campaignId, setCampaignId] = useState<string | undefined>(initialCampaignId);
  const [currentUser, setCurrentUser] = useState<TableSessionUser | null>(null);
  const [partyMembers, setPartyMembers] = useState<Array<{ character: string; name: string }>>(initialPartyMembers);

  const storageKey = `${STORAGE_KEY_PREFIX}${campaignId || "default"}`;

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"dice" | "initiative">("dice");

  const [rollMode, setRollMode] = useState<RollMode>("normal");
  const [modifier, setModifier] = useState<number>(0);
  const [isPrivateRoll, setIsPrivateRoll] = useState<boolean>(false);
  const [rollLog, setRollLog] = useState<TableRollLogItem[]>([]);

  const [combatants, rawSetCombatants] = useState<Combatant[]>([]);
  const [currentTurnIdx, rawSetCurrentTurnIdx] = useState<number>(0);
  const [round, rawSetRound] = useState<number>(1);
  const [hydrated, setHydrated] = useState(false);
  const [tableSyncedAt, setTableSyncedAt] = useState<number | null>(null);

  const lastLocalInitWriteRef = useRef<number>(0);
  const initSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestInitRef = useRef<{ combatants: Combatant[]; currentTurnIdx: number; round: number }>({
    combatants: [],
    currentTurnIdx: 0,
    round: 1,
  });

  useEffect(() => {
    latestInitRef.current = { combatants, currentTurnIdx, round };
  }, [combatants, currentTurnIdx, round]);

  const configureTableSession = useCallback(
    (cfg: {
      campaignId?: string;
      currentUser?: TableSessionUser | null;
      partyMembers?: Array<{ character: string; name: string }>;
    }) => {
      if (cfg.campaignId !== undefined) setCampaignId(cfg.campaignId);
      if (cfg.currentUser !== undefined) setCurrentUser(cfg.currentUser);
      if (cfg.partyMembers !== undefined) setPartyMembers(cfg.partyMembers);
    },
    []
  );

  // Hydrate persisted combat tracker & roll log on campaign change
  useEffect(() => {
    setHydrated(false);
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.combatants) && parsed.combatants.length > 0) {
          rawSetCombatants(parsed.combatants);
        } else if (partyMembers.length > 0) {
          rawSetCombatants(
            partyMembers.map((p, idx) => ({
              id: `pc-${idx}`,
              name: p.character,
              initiative: 10,
              currentHp: 28,
              maxHp: 28,
              isNpc: false,
            }))
          );
        }
        if (typeof parsed.currentTurnIdx === "number") rawSetCurrentTurnIdx(parsed.currentTurnIdx);
        if (typeof parsed.round === "number") rawSetRound(parsed.round);
        if (Array.isArray(parsed.rollLog)) setRollLog(parsed.rollLog.slice(0, 40));
      } else if (partyMembers.length > 0) {
        rawSetCombatants(
          partyMembers.map((p, idx) => ({
            id: `pc-${idx}`,
            name: p.character,
            initiative: 10,
            currentHp: 28,
            maxHp: 28,
            isNpc: false,
          }))
        );
      }
    } catch {
      // Ignore storage errors
    } finally {
      setHydrated(true);
    }
  }, [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Seed party if combatants are empty when partyMembers arrive
  useEffect(() => {
    if (hydrated && combatants.length === 0 && partyMembers.length > 0) {
      rawSetCombatants(
        partyMembers.map((p, idx) => ({
          id: `pc-${idx}`,
          name: p.character,
          initiative: 10,
          currentHp: 28,
          maxHp: 28,
          isNpc: false,
        }))
      );
    }
  }, [hydrated, combatants.length, partyMembers]);

  // Persist to localStorage
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          combatants,
          currentTurnIdx,
          round,
          rollLog: rollLog.slice(0, 40),
        })
      );
    } catch {
      // Ignore quota errors
    }
  }, [hydrated, storageKey, combatants, currentTurnIdx, round, rollLog]);

  const refreshTableState = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/table", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.state) return;
      const remote = data.state as SharedTableState;

      // Merge remote shared rolls with local private rolls
      setRollLog((prev) => {
        const privateOnes = prev.filter((r) => r.private);
        const remoteShared = (remote.rollLog || []).map(toLogItem);
        const byId = new Map<string, TableRollLogItem>();
        for (const r of [...remoteShared, ...privateOnes]) {
          if (!byId.has(r.id)) byId.set(r.id, r);
        }
        return Array.from(byId.values())
          .sort((a, b) => (b.at ?? 0) - (a.at ?? 0))
          .slice(0, 40);
      });

      if (remote.updatedAt > lastLocalInitWriteRef.current && remote.combatants.length > 0) {
        rawSetCombatants(remote.combatants);
        rawSetCurrentTurnIdx(remote.currentTurnIdx);
        rawSetRound(remote.round);
      }

      setTableSyncedAt(Date.now());
    } catch {
      /* keep local state */
    }
  }, [currentUser]);

  // Initial sync on sign-in & gentle background poll when drawer is open
  useEffect(() => {
    if (!currentUser) return;
    refreshTableState();
  }, [currentUser?.id, campaignId, refreshTableState]);

  useEffect(() => {
    if (!currentUser || !isDrawerOpen) return;
    refreshTableState();
    const timer = setInterval(refreshTableState, 8000);
    return () => clearInterval(timer);
  }, [currentUser, isDrawerOpen, refreshTableState]);

  const scheduleInitiativePush = useCallback(() => {
    if (!currentUser) return;
    lastLocalInitWriteRef.current = Date.now();
    if (initSyncTimerRef.current) clearTimeout(initSyncTimerRef.current);
    initSyncTimerRef.current = setTimeout(async () => {
      try {
        const snap = latestInitRef.current;
        const res = await fetch("/api/table", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "setInitiative",
            combatants: snap.combatants,
            currentTurnIdx: snap.currentTurnIdx,
            round: snap.round,
          }),
        });
        if (res.ok) setTableSyncedAt(Date.now());
      } catch {
        /* ignore offline error */
      }
    }, 350);
  }, [currentUser]);

  useEffect(() => {
    return () => {
      if (initSyncTimerRef.current) clearTimeout(initSyncTimerRef.current);
    };
  }, []);

  const setCombatants: React.Dispatch<React.SetStateAction<Combatant[]>> = useCallback(
    (action) => {
      rawSetCombatants((prev) => {
        const next = typeof action === "function" ? action(prev) : action;
        latestInitRef.current = { ...latestInitRef.current, combatants: next };
        return next;
      });
      scheduleInitiativePush();
    },
    [scheduleInitiativePush]
  );

  const setCurrentTurnIdx: React.Dispatch<React.SetStateAction<number>> = useCallback(
    (action) => {
      rawSetCurrentTurnIdx((prev) => {
        const next = typeof action === "function" ? action(prev) : action;
        latestInitRef.current = { ...latestInitRef.current, currentTurnIdx: next };
        return next;
      });
      scheduleInitiativePush();
    },
    [scheduleInitiativePush]
  );

  const setRound: React.Dispatch<React.SetStateAction<number>> = useCallback(
    (action) => {
      rawSetRound((prev) => {
        const next = typeof action === "function" ? action(prev) : action;
        latestInitRef.current = { ...latestInitRef.current, round: next };
        return next;
      });
      scheduleInitiativePush();
    },
    [scheduleInitiativePush]
  );

  const openDrawer = useCallback((tab?: "dice" | "initiative") => {
    if (tab) setDrawerTab(tab);
    setIsDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const rollDice = useCallback(
    (
      formulaOrSides: string | number,
      options?: {
        label?: string;
        modeOverride?: RollMode;
        applyGlobalModifier?: boolean;
        silentToast?: boolean;
      }
    ): TableRollLogItem => {
      const effectiveMode = options?.modeOverride ?? rollMode;
      const extraMod = options?.applyGlobalModifier ? modifier : 0;

      const baseResult = rollDiceFormula(formulaOrSides, {
        label: options?.label,
        mode: effectiveMode,
        extraModifier: extraMod,
      });

      const result: TableRollLogItem = {
        ...baseResult,
        at: Date.now(),
        roller: currentUser?.name,
        character: currentUser?.character,
        private: isPrivateRoll,
      };

      setRollLog((prev) => [result, ...prev.slice(0, 39)]);

      if (!isPrivateRoll && currentUser) {
        fetch("/api/table", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "roll", roll: result }),
        })
          .then((res) => {
            if (res.ok) setTableSyncedAt(Date.now());
          })
          .catch(() => {});
      }

      if (!options?.silentToast) {
        const rollsStr = result.rolls.join(", ");
        const modText =
          result.mod > 0 ? ` + ${result.mod}` : result.mod < 0 ? ` - ${Math.abs(result.mod)}` : "";
        const tag = result.isCrit ? " — CRITICAL!" : result.isFumble ? " — NAT 1!" : "";
        toast(`${result.label || result.formula}: ${result.total}${tag}`, {
          type: result.isCrit ? "success" : result.isFumble ? "error" : "info",
          description: `Rolled [${rollsStr}]${modText}${result.mode !== "normal" ? ` (${result.mode})` : ""}${
            isPrivateRoll ? " · Private" : ""
          }`,
          durationMs: 3500,
        });
      }

      return result;
    },
    [rollMode, modifier, toast, currentUser, isPrivateRoll]
  );

  const clearRollLog = useCallback(() => {
    setRollLog([]);
    if (currentUser) {
      fetch("/api/table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clearRolls" }),
      }).catch(() => {});
    }
  }, [currentUser]);

  const seedPartyInitiative = useCallback(
    (party: Array<{ character: string; name: string }>) => {
      const next = party.map((p, idx) => ({
        id: `pc-${idx}-${Date.now()}`,
        name: p.character,
        initiative: 10 + Math.floor(Math.random() * 10),
        currentHp: 28,
        maxHp: 28,
        isNpc: false,
      }));
      rawSetCombatants(next);
      rawSetCurrentTurnIdx(0);
      rawSetRound(1);
      latestInitRef.current = { combatants: next, currentTurnIdx: 0, round: 1 };
      scheduleInitiativePush();
    },
    [scheduleInitiativePush]
  );

  return (
    <TableToolsContext.Provider
      value={{
        isDrawerOpen,
        drawerTab,
        openDrawer,
        closeDrawer,
        rollMode,
        setRollMode,
        modifier,
        setModifier,
        isPrivateRoll,
        setIsPrivateRoll,
        rollLog,
        rollDice,
        clearRollLog,
        combatants,
        setCombatants,
        currentTurnIdx,
        setCurrentTurnIdx,
        round,
        setRound,
        seedPartyInitiative,
        tableSyncedAt,
        refreshTableState,
        configureTableSession,
      }}
    >
      {children}
    </TableToolsContext.Provider>
  );
}
