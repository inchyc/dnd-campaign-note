import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseDiceFormula, rollDiceFormula } from "../dice.ts";

describe("parseDiceFormula", () => {
  it("parses standard formulas with and without spaces or counts", () => {
    assert.deepEqual(parseDiceFormula("1d20+5"), {
      count: 1,
      sides: 20,
      modifier: 5,
      normalized: "1d20+5",
    });

    assert.deepEqual(parseDiceFormula("2d6 - 1"), {
      count: 2,
      sides: 6,
      modifier: -1,
      normalized: "2d6-1",
    });

    assert.deepEqual(parseDiceFormula("d8"), {
      count: 1,
      sides: 8,
      modifier: 0,
      normalized: "1d8",
    });
  });

  it("returns null for invalid formulas", () => {
    assert.equal(parseDiceFormula("invalid"), null);
    assert.equal(parseDiceFormula("20"), null);
  });
});

describe("rollDiceFormula", () => {
  it("computes deterministic rolls with custom rng and detects crit/fumble", () => {
    const crit = rollDiceFormula("1d20+3", { rng: () => 0.99 });
    assert.equal(crit.chosen, 20);
    assert.equal(crit.total, 23);
    assert.equal(crit.isCrit, true);
    assert.equal(crit.isFumble, false);

    const fumble = rollDiceFormula("1d20+3", { rng: () => 0.0 });
    assert.equal(fumble.chosen, 1);
    assert.equal(fumble.total, 4);
    assert.equal(fumble.isCrit, false);
    assert.equal(fumble.isFumble, true);
  });

  it("applies advantage and disadvantage on 1d20", () => {
    const seq = [0.1, 0.9]; // rolls 3 and 19
    let idx = 0;
    const adv = rollDiceFormula("1d20+2", {
      mode: "advantage",
      rng: () => seq[idx++],
    });
    assert.deepEqual(adv.rolls, [3, 19]);
    assert.equal(adv.chosen, 19);
    assert.equal(adv.total, 21);

    idx = 0;
    const dis = rollDiceFormula("1d20+2", {
      mode: "disadvantage",
      rng: () => seq[idx++],
    });
    assert.deepEqual(dis.rolls, [3, 19]);
    assert.equal(dis.chosen, 3);
    assert.equal(dis.total, 5);
  });

  it("sums multiple dice for damage rolls", () => {
    const dmg = rollDiceFormula("2d6+4", { rng: () => 0.5 }); // each d6 = 4
    assert.deepEqual(dmg.rolls, [4, 4]);
    assert.equal(dmg.total, 12);
  });
});
