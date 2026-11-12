"use client";

import React, { useState, useMemo } from "react";
import { X, Search, Shield, Swords, Package, Plus, Sparkles, Check } from "lucide-react";
import { WEAPONS_5E, ARMOR_5E, GEAR_5E, WeaponItem, ArmorItem, GearItem } from "@/data/5e/equipment";
import type { InventoryItemData } from "@/app/api/character/sheet/route";

interface EquipmentCatalogModalProps {
  onClose: () => void;
  onAddItem: (item: InventoryItemData) => void;
}

export function EquipmentCatalogModal({ onClose, onAddItem }: EquipmentCatalogModalProps) {
  const [tab, setTab] = useState<"weapons" | "armor" | "gear" | "custom">("weapons");
  const [search, setSearch] = useState("");
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});

  // Custom Item state
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState<"weapon" | "armor" | "shield" | "gear" | "magic">("weapon");
  const [customDamage, setCustomDamage] = useState("1d8");
  const [customAc, setCustomAc] = useState(12);
  const [customWeight, setCustomWeight] = useState(1);
  const [customDesc, setCustomDesc] = useState("");

  const filteredWeapons = useMemo(() => {
    return WEAPONS_5E.filter((w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.category.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const filteredArmor = useMemo(() => {
    return ARMOR_5E.filter((a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const filteredGear = useMemo(() => {
    return GEAR_5E.filter((g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.description.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const handleAddWeapon = (w: WeaponItem) => {
    const item: InventoryItemData = {
      id: `wpn-${Date.now()}-${w.id}`,
      name: w.name,
      category: "weapon",
      quantity: 1,
      weight: w.weight,
      damage: w.damage,
      damageType: w.damageType,
      versatileDamage: w.versatileDamage,
      properties: w.properties,
      range: w.range,
      description: `Cost: ${w.cost} • Properties: ${w.properties.join(", ") || "None"}`,
    };
    onAddItem(item);
    setAddedItemIds((prev) => ({ ...prev, [w.id]: true }));
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [w.id]: false }));
    }, 1500);
  };

  const handleAddArmor = (a: ArmorItem) => {
    const item: InventoryItemData = {
      id: `arm-${Date.now()}-${a.id}`,
      name: a.name,
      category: a.category === "shield" ? "shield" : "armor",
      quantity: 1,
      weight: a.weight,
      baseAc: a.baseAc,
      maxDexMod: a.maxDexMod,
      stealthDisadvantage: a.stealthDisadvantage,
      description: `Cost: ${a.cost} • Base AC: ${a.baseAc} • Type: ${a.category}`,
    };
    onAddItem(item);
    setAddedItemIds((prev) => ({ ...prev, [a.id]: true }));
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [a.id]: false }));
    }, 1500);
  };

  const handleAddGear = (g: GearItem) => {
    const item: InventoryItemData = {
      id: `gear-${Date.now()}-${g.id}`,
      name: g.name,
      category: g.category as any,
      quantity: 1,
      weight: g.weight,
      magicBonusAc: g.magicBonusAc,
      magicBonusAttack: g.magicBonusAttack,
      magicBonusDamage: g.magicBonusDamage,
      description: g.description,
    };
    onAddItem(item);
    setAddedItemIds((prev) => ({ ...prev, [g.id]: true }));
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [g.id]: false }));
    }, 1500);
  };

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    const item: InventoryItemData = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      category: customCategory,
      quantity: 1,
      weight: customWeight,
      damage: customCategory === "weapon" ? customDamage : undefined,
      baseAc: customCategory === "armor" || customCategory === "shield" ? customAc : undefined,
      description: customDesc.trim(),
    };
    onAddItem(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-stone-900 border border-amber-600/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-950/80 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-serif font-bold text-amber-100">
              5e Equipment & Item Catalog
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab & Search Bar */}
        <div className="p-4 bg-stone-950 border-b border-stone-800 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex rounded-xl bg-stone-900 p-1 border border-stone-800 text-xs font-serif">
              <button
                type="button"
                onClick={() => setTab("weapons")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  tab === "weapons"
                    ? "bg-amber-600 text-stone-950 font-bold"
                    : "text-stone-400 hover:text-stone-200"
                }`}
              >
                <Swords className="w-3.5 h-3.5" />
                Weapons
              </button>
              <button
                type="button"
                onClick={() => setTab("armor")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  tab === "armor"
                    ? "bg-amber-600 text-stone-950 font-bold"
                    : "text-stone-400 hover:text-stone-200"
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Armor & Shields
              </button>
              <button
                type="button"
                onClick={() => setTab("gear")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  tab === "gear"
                    ? "bg-amber-600 text-stone-950 font-bold"
                    : "text-stone-400 hover:text-stone-200"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Gear & Magic Items
              </button>
              <button
                type="button"
                onClick={() => setTab("custom")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  tab === "custom"
                    ? "bg-amber-600 text-stone-950 font-bold"
                    : "text-stone-400 hover:text-stone-200"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                + Custom Item
              </button>
            </div>

            {tab !== "custom" && (
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Filter items..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-stone-900 border border-stone-700 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {tab === "weapons" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredWeapons.map((w) => (
                <div
                  key={w.id}
                  className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between gap-3 hover:border-stone-700"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-bold text-sm text-stone-100">
                        {w.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                        {w.damage} {w.damageType}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 truncate mt-0.5">
                      {w.properties.join(", ") || "Standard"} • {w.weight} lbs • {w.cost}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddWeapon(w)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                      addedItemIds[w.id]
                        ? "bg-emerald-600 text-white"
                        : "bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-stone-950 border border-amber-600/40"
                    }`}
                  >
                    {addedItemIds[w.id] ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Added
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" /> Add
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === "armor" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredArmor.map((a) => (
                <div
                  key={a.id}
                  className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between gap-3 hover:border-stone-700"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-bold text-sm text-stone-100">
                        {a.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                        AC {a.baseAc}
                        {a.addDex ? " + DEX" : ""}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 truncate mt-0.5">
                      {a.category} • {a.weight} lbs • {a.cost}
                      {a.stealthDisadvantage ? " • Stealth Disadv" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddArmor(a)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                      addedItemIds[a.id]
                        ? "bg-emerald-600 text-white"
                        : "bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-stone-950 border border-amber-600/40"
                    }`}
                  >
                    {addedItemIds[a.id] ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Added
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" /> Add
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === "gear" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredGear.map((g) => (
                <div
                  key={g.id}
                  className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between gap-3 hover:border-stone-700"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-bold text-sm text-stone-100">
                        {g.name}
                      </span>
                      {g.magicBonusAc && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                          +{g.magicBonusAc} AC
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-400 truncate mt-0.5">
                      {g.description} • {g.cost}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddGear(g)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                      addedItemIds[g.id]
                        ? "bg-emerald-600 text-white"
                        : "bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-stone-950 border border-amber-600/40"
                    }`}
                  >
                    {addedItemIds[g.id] ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Added
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" /> Add
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === "custom" && (
            <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-4 max-w-lg mx-auto">
              <h3 className="font-serif font-bold text-sm text-amber-200">
                Create Custom Item or Magic Weapon
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-stone-400 mb-1">Item Name</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Flame Tongue Greatsword"
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-400 mb-1">Category</label>
                    <select
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value as any)}
                      className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-100"
                    >
                      <option value="weapon">Weapon</option>
                      <option value="armor">Armor</option>
                      <option value="shield">Shield</option>
                      <option value="magic">Magic Item</option>
                      <option value="gear">Adventuring Gear</option>
                    </select>
                  </div>
                  {customCategory === "weapon" ? (
                    <div>
                      <label className="block text-stone-400 mb-1">Damage Formula</label>
                      <input
                        type="text"
                        value={customDamage}
                        onChange={(e) => setCustomDamage(e.target.value)}
                        placeholder="e.g. 2d6+2d6 fire"
                        className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-100"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-stone-400 mb-1">Base AC</label>
                      <input
                        type="number"
                        value={customAc}
                        onChange={(e) => setCustomAc(parseInt(e.target.value, 10) || 10)}
                        className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-100"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-stone-400 mb-1">Description / Notes</label>
                  <textarea
                    rows={3}
                    value={customDesc}
                    onChange={(e) => setCustomDesc(e.target.value)}
                    placeholder="Special properties, attunement, activation..."
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddCustom}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold transition shadow-lg shadow-amber-900/30"
                >
                  Create & Add to Inventory
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
