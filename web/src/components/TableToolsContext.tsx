"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { DiceRollResult, RollMode, rollDiceFormula } from "@/lib/dice";
import { useFeedback } from "./FeedbackContext";

export interface Combatant {
  id: string;
  name: string;
  initiative: number;
  currentHp?: number;
  maxHp?: number;
  isNpc?: boolean;
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
  rollLog: DiceRollResult[];
  rollDice: (
    formulaOrSides: string | number,
    options?: { label?: string; modeOverride?: RollMode; applyGlobalModifier?: boolean; silentToast?: boolean }
  ) => DiceRollResult;
  clearRollLog: () => void;
  combatants: Combatant[];
  setCombatants: React.Dispatch<React.SetStateAction<Combatant[]>>;
  currentTurnIdx: number;
  setCurrentTurnIdx: React.Dispatch<React.SetStateAction<number>>;
  round: number;
  setRound: React.Dispatch<React.SetStateAction<number>>;
  seedPartyInitiative: (party: Array<{ character: string; name: string }>) => void;
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

export function TableToolsProvider({
  campaignId,
  partyMembers,
  children,
}: {
  campaignId?: string;
  partyMembers: Array<{ character: string; name: string }>;
  children: React.ReactNode;
}) {
  const { toast } = useFeedback();
  const storageKey = `${STORAGE_KEY_PREFIX}${campaignId || "default"}`;

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"dice" | "initiative">("dice");

  const [rollMode, setRollMode] = useState<RollMode>("normal");
  const [modifier, setModifier] = useState<number>(0);
  const [rollLog, setRollLog] = useState<DiceRollResult[]>([]);

  const [combatants, setCombatants] = useState<Combatant[]>([]);
  const [currentTurnIdx, setCurrentTurnIdx] = useState<number>(0);
  const [round, setRound] = useState<number>(1);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate persisted combat tracker & roll log on campaign change
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.combatants) && parsed.combatants.length > 0) {
          setCombatants(parsed.combatants);
        } else if (partyMembers.length > 0) {
          setCombatants(
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
        if (typeof parsed.currentTurnIdx === "number") setCurrentTurnIdx(parsed.currentTurnIdx);
        if (typeof parsed.round === "number") setRound(parsed.round);
        if (Array.isArray(parsed.rollLog)) setRollLog(parsed.rollLog.slice(0, 30));
      } else if (partyMembers.length > 0) {
        setCombatants(
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
      setCombatants(
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
          rollLog: rollLog.slice(0, 30),
        })
      );
    } catch {
      // Ignore quota errors
    }
  }, [hydrated, storageKey, combatants, currentTurnIdx, round, rollLog]);

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
    ): DiceRollResult => {
      const effectiveMode = options?.modeOverride ?? rollMode;
      const extraMod = options?.applyGlobalModifier ? modifier : 0;

      const result = rollDiceFormula(formulaOrSides, {
        label: options?.label,
        mode: effectiveMode,
        extraModifier: extraMod,
      });

      setRollLog((prev) => [result, ...prev.slice(0, 29)]);

      if (!options?.silentToast) {
        const rollsStr = result.rolls.join(", ");
        const modText =
          result.mod > 0 ? ` + ${result.mod}` : result.mod < 0 ? ` - ${Math.abs(result.mod)}` : "";
        const tag = result.isCrit ? " — CRITICAL!" : result.isFumble ? " — NAT 1!" : "";
        toast(`${result.label || result.formula}: ${result.total}${tag}`, {
          type: result.isCrit ? "success" : result.isFumble ? "error" : "info",
          description: `Rolled [${rollsStr}]${modText}${result.mode !== "normal" ? ` (${result.mode})` : ""}`,
          durationMs: 3500,
        });
      }

      return result;
    },
    [rollMode, modifier, toast]
  );

  const clearRollLog = useCallback(() => {
    setRollLog([]);
  }, []);

  const seedPartyInitiative = useCallback(
    (party: Array<{ character: string; name: string }>) => {
      setCombatants(
        party.map((p, idx) => ({
          id: `pc-${idx}-${Date.now()}`,
          name: p.character,
          initiative: 10 + Math.floor(Math.random() * 10),
          currentHp: 28,
          maxHp: 28,
          isNpc: false,
        }))
      );
      setCurrentTurnIdx(0);
      setRound(1);
    },
    []
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
      }}
    >
      {children}
    </TableToolsContext.Provider>
  );
}
