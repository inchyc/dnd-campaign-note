import test from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_TABLE_STATE,
  advanceCombatTurn,
  appendSharedRoll,
  normalizeTableState,
} from "../tableState.ts";

test("normalizeTableState sanitizes combatants, turn bounds, and roll entries", () => {
  const state = normalizeTableState({
    combatants: [
      { id: "a", name: "Vex", initiative: 18, currentHp: -5, maxHp: 24, isNpc: false },
      { name: "Goblin", initiative: "12" },
    ],
    currentTurnIdx: 99,
    round: 0,
    rollLog: [{ id: "r1", formula: "1d20", rolls: [19], mod: 4, total: 23, isCrit: false, isFumble: false, private: true }],
    updatedAt: 12345,
  });

  assert.equal(state.combatants.length, 2);
  assert.equal(state.combatants[0].currentHp, 0);
  assert.equal(state.combatants[1].initiative, 12);
  assert.equal(state.currentTurnIdx, 1);
  assert.equal(state.round, 1);
  assert.equal(state.rollLog[0].private, false);
});

test("appendSharedRoll deduplicates by id and caps log length", () => {
  let state = { ...EMPTY_TABLE_STATE };
  for (let i = 0; i < 45; i++) {
    state = appendSharedRoll(state, {
      id: `roll-${i}`,
      formula: "1d20",
      die: "1d20",
      rolls: [10],
      mod: 0,
      total: 10,
      mode: "normal",
      isCrit: false,
      isFumble: false,
      at: 1000 + i,
      character: "Vex",
    });
  }
  assert.equal(state.rollLog.length, 40);
  assert.equal(state.rollLog[0].id, "roll-44");
});

test("advanceCombatTurn wraps turn index and increments round", () => {
  const base = normalizeTableState({
    combatants: [
      { id: "1", name: "Vex", initiative: 18 },
      { id: "2", name: "Cedric", initiative: 12 },
    ],
    currentTurnIdx: 1,
    round: 2,
  });
  const next = advanceCombatTurn(base);
  assert.equal(next.currentTurnIdx, 0);
  assert.equal(next.round, 3);
});
