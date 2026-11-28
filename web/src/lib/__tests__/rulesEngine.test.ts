import test from "node:test";
import assert from "node:assert/strict";
import {
  calcMulticlassSpellSlots,
  calcWarlockPactSlots,
  getMaxCastableSpellLevel,
  parseCostToGp,
  resolveArmorCategory,
  calcWeaponAttackMod,
  calculateArmorClass,
} from "../../data/5e/rulesEngine.ts";
import { CLASSES_5E } from "../../data/5e/classes.ts";
import { SPELLS_5E } from "../../data/5e/spells.ts";
import { WEAPONS_5E, PACKS_5E, TOOLS_5E } from "../../data/5e/equipment.ts";

test("single-class full, half, Artificer, and third-caster spell slots follow 5e rules", () => {
  assert.deepEqual(calcMulticlassSpellSlots([{ className: "Wizard", level: 1 }]), {
    1: 2, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0,
  });
  assert.deepEqual(calcMulticlassSpellSlots([{ className: "Wizard", level: 5 }]), {
    1: 4, 2: 3, 3: 2, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0,
  });

  // Paladin & Ranger start at level 2 and round UP when single-classed
  assert.equal(calcMulticlassSpellSlots([{ className: "Paladin", level: 1 }])[1], 0);
  assert.equal(calcMulticlassSpellSlots([{ className: "Paladin", level: 2 }])[1], 2);
  assert.deepEqual(calcMulticlassSpellSlots([{ className: "Paladin", level: 5 }]), {
    1: 4, 2: 2, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0,
  });
  assert.deepEqual(calcMulticlassSpellSlots([{ className: "Ranger", level: 9 }]), {
    1: 4, 2: 3, 3: 2, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0,
  });

  // Artificer starts at level 1 and rounds UP even in multiclass
  assert.equal(calcMulticlassSpellSlots([{ className: "Artificer", level: 1 }])[1], 2);
  assert.deepEqual(calcMulticlassSpellSlots([{ className: "Artificer", level: 5 }]), {
    1: 4, 2: 2, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0,
  });

  // Eldritch Knight / Arcane Trickster start at level 3
  assert.equal(
    calcMulticlassSpellSlots([{ className: "Fighter", level: 2, subclass: "Eldritch Knight" }])[1],
    0
  );
  assert.equal(
    calcMulticlassSpellSlots([{ className: "Fighter", level: 3, subclass: "Eldritch Knight" }])[1],
    2
  );
  assert.deepEqual(
    calcMulticlassSpellSlots([{ className: "Fighter", level: 7, subclass: "Eldritch Knight" }]),
    { 1: 4, 2: 2, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }
  );
});

test("multiclass spell slot calculation distinguishes non-caster mixes from true multiclass casters", () => {
  // Paladin 3 / Thief Rogue 2 has only 1 spellcasting class -> uses single-class half-caster table (Lv 2 caster => 3 lv1 slots)
  assert.equal(
    calcMulticlassSpellSlots([
      { className: "Paladin", level: 3 },
      { className: "Rogue", level: 2, subclass: "Thief" },
    ])[1],
    3
  );

  // Paladin 5 / Sorcerer 3 has 2 spellcasting classes -> floor(5/2)=2 + 3 = 5th-level caster
  assert.deepEqual(
    calcMulticlassSpellSlots([
      { className: "Paladin", level: 5 },
      { className: "Sorcerer", level: 3 },
    ]),
    { 1: 4, 2: 3, 3: 2, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }
  );

  // Artificer 3 / Wizard 2 -> ceil(3/2)=2 + 2 = 4th-level caster (TCoE rule)
  assert.deepEqual(
    calcMulticlassSpellSlots([
      { className: "Artificer", level: 3 },
      { className: "Wizard", level: 2 },
    ]),
    { 1: 4, 2: 3, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }
  );
});

test("Warlock Pact Magic & getMaxCastableSpellLevel scale accurately", () => {
  assert.deepEqual(calcWarlockPactSlots(1), { slotLevel: 1, count: 1 });
  assert.deepEqual(calcWarlockPactSlots(5), { slotLevel: 3, count: 2 });
  assert.deepEqual(calcWarlockPactSlots(11), { slotLevel: 5, count: 3 });
  assert.deepEqual(calcWarlockPactSlots(17), { slotLevel: 5, count: 4 });

  assert.equal(getMaxCastableSpellLevel([{ className: "Wizard", level: 9 }]), 5);
  assert.equal(getMaxCastableSpellLevel([{ className: "Warlock", level: 5 }]), 3);
  assert.equal(getMaxCastableSpellLevel([{ className: "Warlock", level: 17 }]), 9);
});

test("armor category resolution, AC calculation, weapon attack stat, and cost parsing", () => {
  assert.equal(resolveArmorCategory({ name: "Chain Mail", baseAc: 16 }), "heavy");
  assert.equal(resolveArmorCategory({ name: "Breastplate", baseAc: 14 }), "medium");
  assert.equal(resolveArmorCategory({ name: "Studded Leather Armor", baseAc: 12 }), "light");

  const heavyAc = calculateArmorClass(
    { str: 16, dex: 14, con: 14, int: 10, wis: 10, cha: 10 },
    [{ className: "Paladin", level: 5 }],
    { name: "Chain Mail", baseAc: 16, category: resolveArmorCategory({ name: "Chain Mail", baseAc: 16 }) },
    { name: "Shield", baseAc: 2 }
  );
  assert.equal(heavyAc.ac, 18); // Chain Mail 16 + Shield 2 (no DEX)

  const stats = { str: 10, dex: 18, con: 14, int: 10, wis: 12, cha: 10 };
  assert.equal(calcWeaponAttackMod({ name: "Longbow", properties: ["ammunition", "heavy", "two-handed"] }, stats), 4);
  assert.equal(calcWeaponAttackMod({ name: "Rapier", properties: ["finesse"] }, stats), 4);
  assert.equal(calcWeaponAttackMod({ name: "Longsword", properties: ["versatile"] }, stats), 0);

  assert.equal(parseCostToGp("1,500 gp"), 1500);
  assert.equal(parseCostToGp("5 sp"), 0.5);
  assert.equal(parseCostToGp("5 cp"), 0.05);
});

test("expanded 5e catalogs include Artificer, full subclasses, weapons, packs, tools, and levels 0-9 spells", () => {
  assert.equal(Object.keys(CLASSES_5E).length, 13);
  assert.ok(CLASSES_5E.Artificer);

  const totalSubclasses = Object.values(CLASSES_5E).reduce((sum, c) => sum + c.subclasses.length, 0);
  assert.ok(totalSubclasses >= 95, `Expected >= 95 subclasses, got ${totalSubclasses}`);

  assert.ok(WEAPONS_5E.some((w) => w.name === "Net"));
  assert.equal(PACKS_5E.length, 8);
  assert.ok(TOOLS_5E.length >= 30);

  for (let lvl = 0; lvl <= 9; lvl++) {
    assert.ok(
      SPELLS_5E.some((sp) => sp.level === lvl),
      `Expected spells for level ${lvl}`
    );
  }
  assert.ok(SPELLS_5E.length >= 200, `Expected >= 200 spells, got ${SPELLS_5E.length}`);
});
