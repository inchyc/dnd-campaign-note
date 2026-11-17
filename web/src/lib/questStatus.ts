export type QuestBucket = "open" | "active" | "resolved" | "archived";

/** Single source of truth for mapping any raw quest status string to a canonical bucket. */
export function normalizeQuestStatus(status?: string | null): QuestBucket {
  const s = String(status ?? "").toLowerCase();
  if (/(archived|archive)/.test(s)) return "archived";
  if (/(complete|resolved|solved|closed|done)/.test(s)) return "resolved";
  if (/(active|progress|ongoing|investigating)/.test(s)) return "active";
  return "open";
}
