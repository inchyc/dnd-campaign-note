import matter from "gray-matter";
import type { Ctx } from "./auth";
import { gemini } from "./gemini";
import { loadIndex, cleanTitle } from "./vault";
import { walk } from "./storage";

interface ExtractedEntity {
  filename: string;
  folder: string;
  entity_type: string;
  markdown_content: string;
}

interface UpdatedEntity {
  target_path: string;
  filename: string;
  rationale: string;
  status_update?: string | null;
  section_to_update?: string;
  markdown_append: string;
}

interface LoreMasterResponse {
  session_summary: string;
  new_entities: ExtractedEntity[];
  updated_entities: UpdatedEntity[];
  checklist_actions: {
    checked_off: string[];
    new_tasks: string[];
  };
}

export async function runLoreMasterService(
  ctx: Ctx,
  sessionDate: string
): Promise<{ success: boolean; newCount: number; updateCount: number; summary: string }> {
  // 1. Locate session note
  const sessionPath = `Notes/Session Notes/Session Notes ${sessionDate}.md`;
  if (!(await ctx.storage.exists(sessionPath))) {
    throw new Error(`Session note not found at ${sessionPath}`);
  }
  const sessionText = await ctx.storage.read(sessionPath);

  // 2. Gather known entities from vault index
  const index = await loadIndex(ctx);
  const knownEntities = index.map((n) => ({
    path: n.path,
    title: n.title,
    category: n.category,
    summary: n.summary || "",
  }));

  // 3. Gather templates
  const templates: Record<string, string> = {};
  for (const tName of [
    "NPC Template.md",
    "Item & Loot Template.md",
    "Lore Template.md",
    "Investigation Template.md",
    "Location Template.md",
  ]) {
    const tPath = `Templates/${tName}`;
    if (await ctx.storage.exists(tPath)) {
      templates[tName.replace(/\.md$/, "")] = await ctx.storage.read(tPath);
    }
  }

  // 4. Changes todo if present
  let changesTodo = "";
  if (await ctx.storage.exists("Changes to be Made.md")) {
    changesTodo = await ctx.storage.read("Changes to be Made.md");
  }

  const systemInstruction = `You are the master lore scribe for a dark fantasy D&D campaign named 'The Starving Miracle' set in the city of Vilgeismar.
Your task is to analyze raw, rapid-fire session notes, cross-reference them against existing known entities, and extract structured notes strictly adhering to the campaign's Obsidian vault templates.

CRITICAL RULES FOR ENTITY RESOLUTION & ACCURACY:
1. DO NOT duplicate existing entities! Always check the 'KNOWN VAULT ENTITIES' list thoroughly.
   - Demire AKA The Traveller turns into a black cat or changes size ('Cat Demi-God', 'Big Cat'). Mentions of 'Black Cat' or 'Big Cat' are Demire, NOT a new NPC!
   - Glutenboss is the Monkey Captain.
   - Nub Nub / The Collector / Hounds is the Treasure Finder.
   - Boats Name = The Eternal Wake.
   - Player Characters: Travis = Cedric, Johno = Colm, Jess = Vola, Damon = Everan, Vik = Aewren, Jake = Ruik, Chris = Vex/Vesper.
2. PRODUCING NEW ENTITIES:
   - Only create a new entity when it is genuinely a new NPC, item, or lore concept not already represented in the vault.
   - Match the exact YAML frontmatter and section format from the corresponding template.
3. PRODUCING UPDATES:
   - When an existing NPC dies or undergoes status changes, specify status_update (e.g. 'Deceased').
   - Provide exact contextual markdown text to append to the existing note.
4. Output strict, valid JSON matching the schema provided.`;

  const prompt = `### KNOWN VAULT ENTITIES (Check to prevent duplicates):
${JSON.stringify(knownEntities.slice(0, 100), null, 2)}

### VAULT TEMPLATES:
- NPC Template:
${templates["NPC Template"] || ""}

- Item & Loot Template:
${templates["Item & Loot Template"] || ""}

- Lore Template:
${templates["Lore Template"] || ""}

- Investigation Template:
${templates["Investigation Template"] || ""}

- Location Template:
${templates["Location Template"] || ""}

### CURRENT 'CHANGES TO BE MADE' CHECKLIST:
${changesTodo}

### RAW SESSION NOTES TO PROCESS (${sessionPath}):
${sessionText}

### INSTRUCTIONS:
Return a single JSON object with this exact structure:
{
  "session_summary": "1-3 paragraph summary of narrative events, key revelations, and developments",
  "new_entities": [
    {
      "filename": "Exact file name, e.g. 'NPC - Prince Kaleen.md' or 'Item - Collector Mask.md'",
      "folder": "Target subfolder: 'NPCs', 'Lore', 'Locations', 'Inventory & Gear', or 'Investigations'",
      "entity_type": "NPC | Item | Lore | Location | Investigation",
      "markdown_content": "Full markdown note with frontmatter, wikilinks, and headers following the template."
    }
  ],
  "updated_entities": [
    {
      "target_path": "Path from Notes/, e.g. 'NPCs/Old Marta Kell.md' or 'Notes/NPCs/NPC - Demire.md'",
      "filename": "Target file name",
      "rationale": "Why this entity needs updating based on the session",
      "status_update": "e.g. 'Deceased' or null",
      "section_to_update": "Section title to append under",
      "markdown_append": "Precise markdown text to append"
    }
  ],
  "checklist_actions": {
    "checked_off": ["Tasks resolved by this session"],
    "new_tasks": ["New tasks/leads discovered"]
  }
}`;

  const rawJson = await gemini([{ text: prompt }], {
    system: systemInstruction,
    timeoutMs: 120_000,
  });

  // Parse JSON response safely
  let data: LoreMasterResponse;
  try {
    const cleaned = rawJson
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/\s*```$/, "")
      .trim();
    data = JSON.parse(cleaned);
  } catch (err: any) {
    throw new Error(`Failed to parse AI Lore-Master JSON: ${err.message}`);
  }

  // 5. Stage files into _Review/Session_Notes_${sessionDate}/
  const reviewId = `Session_Notes_${sessionDate}`;
  const reviewDir = `_Review/${reviewId}`;

  // Write new entities
  for (const item of data.new_entities || []) {
    const targetFolder = (item.folder || "NPCs").replace(/^Notes\/?/, "");
    const cleanFilename = item.filename.endsWith(".md") ? item.filename : `${item.filename}.md`;
    const destPath = `${reviewDir}/New/${targetFolder}/${cleanFilename}`;
    await ctx.storage.write(destPath, item.markdown_content);
  }

  // Write updates
  for (const upd of data.updated_entities || []) {
    const safeName = cleanTitle(upd.filename.replace(/\.md$/, ""));
    const destPath = `${reviewDir}/Updates/Update_${safeName}.md`;
    const updateContent =
      `---\n` +
      `target_file: ${upd.target_path || upd.filename}\n` +
      `status_update: ${upd.status_update || ""}\n` +
      `section: ${upd.section_to_update || ""}\n` +
      `---\n\n` +
      `# Proposed Update for [[${safeName}]]\n\n` +
      `> [!info] Rationale\n` +
      `> ${upd.rationale || "Updated from session notes"}\n\n` +
      `### Content to Append / Update:\n` +
      `${upd.markdown_append || ""}\n`;
    await ctx.storage.write(destPath, updateContent);
  }

  // Write master 00_SESSION_REVIEW.md
  const newEntitiesList = (data.new_entities || [])
    .map(
      (e) =>
        `- [ ] **${e.entity_type}:** [[${cleanTitle(e.filename.replace(/\.md$/, ""))}]] (\`New/${e.folder}/${e.filename}\`)`
    )
    .join("\n");

  const updatesList = (data.updated_entities || [])
    .map((u) => {
      const name = cleanTitle(u.filename.replace(/\.md$/, ""));
      return (
        `- [ ] **Update for:** [[${name}]] (\`Updates/Update_${name}.md\`)\n` +
        `  - *Target:* \`${u.target_path || u.filename}\`\n` +
        `  - *Reason:* ${u.rationale}`
      );
    })
    .join("\n");

  const resolvedTasksList = (data.checklist_actions?.checked_off || [])
    .map((t) => `- [x] ${t}`)
    .join("\n");

  const newTasksList = (data.checklist_actions?.new_tasks || [])
    .map((t) => `- [ ] ${t}`)
    .join("\n");

  const masterReview =
    `---\n` +
    `session: Session Notes ${sessionDate}.md\n` +
    `status: pending_review\n` +
    `---\n\n` +
    `# ⚔️ Session Review: Session Notes ${sessionDate}\n\n` +
    `## 📖 Executive Summary\n` +
    `${data.session_summary || "Session analysis complete."}\n\n` +
    `---\n\n` +
    `## 🆕 New Entities Staged for Vault\n` +
    `${newEntitiesList || "- (No new entities staged)"}\n\n` +
    `---\n\n` +
    `## 📝 Proposed Updates to Existing Notes\n` +
    `${updatesList || "- (No existing entities updated)"}\n\n` +
    `---\n\n` +
    `## ✅ Checklist & Todo Actions\n` +
    `### Resolved / Checked Off:\n` +
    `${resolvedTasksList || "- (None)"}\n\n` +
    `### New Tasks / Leads:\n` +
    `${newTasksList || "- (None)"}\n`;

  await ctx.storage.write(`${reviewDir}/00_SESSION_REVIEW.md`, masterReview);

  return {
    success: true,
    newCount: (data.new_entities || []).length,
    updateCount: (data.updated_entities || []).length,
    summary: data.session_summary || "",
  };
}
