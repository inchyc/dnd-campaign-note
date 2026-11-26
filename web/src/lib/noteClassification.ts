/**
 * Deterministic path classification, SQL LIKE escaping, and Obsidian session note helpers.
 * Kept dependency-free so both Next.js runtime and Node unit tests can import it directly.
 */

export interface PathClassification {
  category: string;
  subcategory: string | null;
  secret: boolean;
  visibility: "dm" | "party" | "pc";
}

/** Replaces %% hidden comments %% with matching newlines so line numbers remain intact. */
export function stripHiddenComments(text: string): string {
  return text.replace(/%%[\s\S]*?%%/g, (m) => m.replace(/[^\r\n]/g, ""));
}

/** Extracts a concise summary snippet from note body markdown. */
export function extractFirstSummary(body: string): string {
  for (const line of stripHiddenComments(body).split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || t.startsWith("---")) continue;
    const clean = t
      .replace(/^[>\-*\s]+/, "")
      .replace(/^\[![^\]]+\][+-]?\s*/, "")
      .replace(/[*_`]/g, "")
      .replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, "$2")
      .trim();
    if (clean.length > 12 && !/^(quick bio|description|atmosphere)$/i.test(clean)) {
      return clean.slice(0, 220);
    }
  }
  return "";
}

/** Escapes SQL LIKE wildcards (`\`, `%`, `_`) so `_Review/` does not match arbitrary chars. */
export function escapeSqlLike(prefix: string): string {
  return prefix.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** Classifies a vault-relative POSIX path and parsed frontmatter into Supabase metadata fields. */
export function classifyVaultPath(cleanPath: string, fm: Record<string, any> = {}): PathClassification {
  const clean = cleanPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = clean.split("/").filter(Boolean);

  if (clean.startsWith("_Review/") || parts[0] === "_Review") {
    return {
      category: "review",
      subcategory: parts[1] || null,
      secret: true,
      visibility: "dm",
    };
  }

  if (clean.startsWith(".hub/") || parts[0] === ".hub") {
    return {
      category: "system",
      subcategory: parts[1] || null,
      secret: true,
      visibility: "dm",
    };
  }

  const hasNotesRoot = parts[0] === "Notes";
  const topFolder = (hasNotesRoot ? parts[1] : parts[0]) || "";
  const topLower = topFolder.toLowerCase();

  let category = "lore";
  let subcategory: string | null = hasNotesRoot
    ? parts.length > 3
      ? parts[2]
      : null
    : parts.length > 2
    ? parts[1]
    : null;

  if (topLower === "npcs") category = "npc";
  else if (topLower === "locations") category = "location";
  else if (topLower === "lore") category = "lore";
  else if (topLower === "factions") {
    category = "lore";
    subcategory = "Factions";
  } else if (topLower === "investigations") category = "quest";
  else if (topLower === "inventory & gear") category = "item";
  else if (topLower === "pc notes") category = "party";
  else if (topLower === "session notes") category = "session";

  const stem = (parts[parts.length - 1] || "").replace(/\.md$/i, "");
  const isSecretPath = parts.includes("Secrets") || stem.startsWith("Secret - ");
  const secret =
    isSecretPath ||
    fm.secret === true ||
    fm.secret === "true" ||
    fm.dm_only === true ||
    fm.dm_only === "true";

  let visibility: "dm" | "party" | "pc" = "party";
  if (secret) {
    visibility = "dm";
  } else if (category === "session") {
    visibility = "party";
  } else if (fm.owner || category === "party") {
    const visibleToParty = fm.visible_to_party === true || fm.visible_to_party === "true";
    visibility = visibleToParty ? "party" : "pc";
  }

  return { category, subcategory, secret, visibility };
}

/** Extracts a YYYY-MM-DD session date from Obsidian markdown headings, title, or frontmatter. */
export function extractSessionDateFromMarkdown(text: string, fallbackTitle?: string): string | null {
  const normalized = String(text || "");

  const headingMatch = normalized.match(/^#\s+.*Session[:\s]+(\d{4}-\d{2}-\d{2})/im);
  if (headingMatch) return headingMatch[1];

  if (fallbackTitle) {
    const titleMatch = fallbackTitle.match(/(\d{4}-\d{2}-\d{2})/);
    if (titleMatch) return titleMatch[1];
  }

  const fmMatch = normalized.match(/^(?:updated|date)\s*:\s*["']?(\d{4}-\d{2}-\d{2})/im);
  if (fmMatch) return fmMatch[1];

  const sessionNoteMatch = normalized.match(/Session Notes\s+(\d{4}-\d{2}-\d{2})/i);
  if (sessionNoteMatch) return sessionNoteMatch[1];

  return null;
}

/** Builds clean Obsidian session markdown, preserving pasted YAML frontmatter verbatim when present. */
export function buildSessionNoteMarkdown(opts: {
  sessionDate: string;
  campaignName: string;
  rawText: string;
}): string {
  const normalized = String(opts.rawText || "").replace(/\r\n/g, "\n");
  const trimmedStart = normalized.trimStart();

  if (trimmedStart.startsWith("---\n") || trimmedStart === "---") {
    return normalized.trimEnd() + "\n";
  }

  const now = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}T${p(now.getHours())}:${p(now.getMinutes())}`;
  const body = normalized.trim();

  const header =
    `---\n` +
    `created: ${stamp}\n` +
    `updated: ${stamp}\n` +
    `campaign: ${opts.campaignName}\n` +
    `location: \n` +
    `summary:\n` +
    `tags: session-logs\n` +
    `---\n\n`;

  if (/^#\s+📓?\s*Session:/im.test(body)) {
    return `${header}${body}\n`;
  }

  return `${header}# 📓 Session: ${opts.sessionDate}\n\n${body || "## 📝 Rapid Fire Notes\n\n"}\n`;
}
