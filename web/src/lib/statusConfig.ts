export interface StatusOption {
  value: string;
  label: string;
  color: string;
  badgeClass: string;
  icon: string;
}

export function getCategoryStatuses(category: string, sub?: string): StatusOption[] {
  const cat = (category || "").toLowerCase();
  const subNorm = (sub || "").toLowerCase();

  // Character & Party Notes (PCs & NPCs)
  if (cat === "npc" || cat === "party") {
    return [
      {
        value: "alive",
        label: "Alive",
        color: "text-emerald-300",
        badgeClass: "bg-emerald-950/80 border-emerald-500/50 text-emerald-300",
        icon: "💚",
      },
      {
        value: "deceased",
        label: "Deceased",
        color: "text-rose-300",
        badgeClass: "bg-rose-950/80 border-rose-500/50 text-rose-300",
        icon: "💀",
      },
      {
        value: "missing",
        label: "Missing",
        color: "text-amber-300",
        badgeClass: "bg-amber-950/80 border-amber-500/50 text-amber-300",
        icon: "❓",
      },
      {
        value: "unknown",
        label: "Unknown",
        color: "text-slate-300",
        badgeClass: "bg-slate-900/80 border-slate-600/50 text-slate-300",
        icon: "👤",
      },
    ];
  }

  // Quests & Investigations
  if (cat === "quest") {
    return [
      {
        value: "active",
        label: "Active",
        color: "text-amber-300",
        badgeClass: "bg-amber-950/80 border-amber-500/50 text-amber-300",
        icon: "🧭",
      },
      {
        value: "resolved",
        label: "Resolved",
        color: "text-emerald-300",
        badgeClass: "bg-emerald-950/80 border-emerald-500/50 text-emerald-300",
        icon: "✓",
      },
      {
        value: "open",
        label: "Open Lead",
        color: "text-sky-300",
        badgeClass: "bg-sky-950/80 border-sky-500/50 text-sky-300",
        icon: "📜",
      },
      {
        value: "archived",
        label: "Archived",
        color: "text-slate-400",
        badgeClass: "bg-slate-900/80 border-slate-600/50 text-slate-400",
        icon: "📦",
      },
    ];
  }

  // Locations / Places
  if (cat === "location") {
    return [
      {
        value: "accessible",
        label: "Accessible",
        color: "text-sky-300",
        badgeClass: "bg-sky-950/80 border-sky-500/50 text-sky-300",
        icon: "🏰",
      },
      {
        value: "dangerous",
        label: "Dangerous",
        color: "text-rose-300",
        badgeClass: "bg-rose-950/80 border-rose-500/50 text-rose-300",
        icon: "⚔️",
      },
      {
        value: "cleared",
        label: "Cleared",
        color: "text-emerald-300",
        badgeClass: "bg-emerald-950/80 border-emerald-500/50 text-emerald-300",
        icon: "🛡️",
      },
      {
        value: "ruined",
        label: "Ruined",
        color: "text-stone-400",
        badgeClass: "bg-stone-900/80 border-stone-600/50 text-stone-400",
        icon: "🏚️",
      },
    ];
  }

  // Inventory & Items
  if (cat === "item") {
    return [
      {
        value: "carried",
        label: "Carried",
        color: "text-amber-300",
        badgeClass: "bg-amber-950/80 border-amber-500/50 text-amber-300",
        icon: "🎒",
      },
      {
        value: "equipped",
        label: "Equipped",
        color: "text-emerald-300",
        badgeClass: "bg-emerald-950/80 border-emerald-500/50 text-emerald-300",
        icon: "⚔️",
      },
      {
        value: "stored",
        label: "Stored",
        color: "text-indigo-300",
        badgeClass: "bg-indigo-950/80 border-indigo-500/50 text-indigo-300",
        icon: "📦",
      },
      {
        value: "lost",
        label: "Lost / Depleted",
        color: "text-rose-300",
        badgeClass: "bg-rose-950/80 border-rose-500/50 text-rose-300",
        icon: "🥀",
      },
    ];
  }

  // Factions
  if (cat === "lore" && subNorm === "factions") {
    return [
      {
        value: "allied",
        label: "Allied",
        color: "text-emerald-300",
        badgeClass: "bg-emerald-950/80 border-emerald-500/50 text-emerald-300",
        icon: "🤝",
      },
      {
        value: "neutral",
        label: "Neutral",
        color: "text-sky-300",
        badgeClass: "bg-sky-950/80 border-sky-500/50 text-sky-300",
        icon: "⚖️",
      },
      {
        value: "hostile",
        label: "Hostile",
        color: "text-rose-300",
        badgeClass: "bg-rose-950/80 border-rose-500/50 text-rose-300",
        icon: "⚔️",
      },
      {
        value: "defunct",
        label: "Defunct",
        color: "text-slate-400",
        badgeClass: "bg-slate-900/80 border-slate-600/50 text-slate-400",
        icon: "⚰️",
      },
    ];
  }

  return [];
}

export function getStatusBadge(category: string, status?: string, sub?: string): StatusOption | undefined {
  if (!status) return undefined;
  const s = status.toLowerCase().trim();
  const options = getCategoryStatuses(category, sub);

  // Exact match
  const found = options.find((o) => o.value === s);
  if (found) return found;

  // Fuzzy mapping for existing legacy notes
  if (category === "npc" || category === "party") {
    if (/(dead|deceased|fallen|killed)/.test(s)) return options.find((o) => o.value === "deceased");
    if (/(missing|lost|kidnapped)/.test(s)) return options.find((o) => o.value === "missing");
    if (/(alive|living|healthy|active)/.test(s)) return options.find((o) => o.value === "alive");
    return options.find((o) => o.value === "alive"); // default to Alive for PCs and NPCs
  }

  if (category === "quest") {
    if (/(resolved|complete|solved|done|closed)/.test(s)) return options.find((o) => o.value === "resolved");
    if (/(archived|archive)/.test(s)) return options.find((o) => o.value === "archived");
    if (/(open|lead|rumor)/.test(s)) return options.find((o) => o.value === "open");
    return options.find((o) => o.value === "active");
  }

  return options[0];
}
