import { zipSync, strToU8 } from "fflate";
import { handle, requireCtx } from "@/lib/auth";
import { visibleNotes } from "@/lib/vault";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const ctx = await requireCtx();
  const notes = await visibleNotes(ctx, true, true);

  const files: Record<string, Uint8Array> = {};

  for (const n of notes) {
    let raw = n.raw;
    try {
      raw = await ctx.storage.read(n.path);
    } catch {
      // fallback to in-memory n.raw
    }
    // Clean path and ensure it's relative to vault root
    const cleanPath = n.path.replace(/^\/+/, "");
    files[cleanPath] = strToU8(raw);
  }

  // Include a README.md for Obsidian
  const readme = [
    `# ${ctx.campaign.name} - Obsidian Vault Backup`,
    "",
    `Exported from D&D Campaign Notes on ${new Date().toLocaleString()}.`,
    "",
    "## How to open in Obsidian:",
    "1. Extract this ZIP file into a folder on your computer.",
    "2. Open **Obsidian** (desktop or mobile).",
    "3. Click **Open folder as vault** and select the extracted folder.",
    "4. All notes, folders (NPCs, Locations, Quests, Lore), frontmatter, and wikilinks will render natively!",
    "",
    `Total notes included: ${notes.length}`,
  ].join("\n");

  files["README.md"] = strToU8(readme);

  const zipped = zipSync(files, { level: 6 });
  const filename = `${ctx.campaign.id}-obsidian-vault.zip`;

  return new Response(Buffer.from(zipped), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
