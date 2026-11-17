/**
 * Preprocesses Obsidian-style markdown:
 * - Strips Dataview serialized query markers
 * - Transforms [[Target|Alias]] -> [Alias](#note:Target)
 * - Transforms [[Target]] -> [Target](#note:Target)
 */
export function preprocessWikilinks(text: string): string {
  if (!text) return "";
  let processed = text.replace(/<!--\s*QueryToSerialize:[\s\S]*?SerializedQuery\s*-->/g, "");
  processed = processed.replace(/<!--\s*SerializedQuery\s+END\s*-->/g, "");

  processed = processed.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, target, alias) => {
    const cleanTarget = target.trim();
    const label = (alias || cleanTarget).trim();
    return `[${label}](#note:${encodeURIComponent(cleanTarget)})`;
  });

  return processed;
}
