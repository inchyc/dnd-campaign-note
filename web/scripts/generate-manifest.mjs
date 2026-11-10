import fs from "fs";
import path from "path";
import matter from "gray-matter";

const PREFIXES = ["NPC - ", "Lore - ", "Item - ", "Faction - ", "Secret - ", "Location - "];

function cleanTitle(stem) {
  for (const p of PREFIXES) if (stem.startsWith(p)) return stem.slice(p.length);
  return stem;
}

const TOP_FOLDERS = {
  NPCs: { category: "npc" },
  Locations: { category: "location" },
  Lore: { category: "lore" },
  Factions: { category: "lore", sub: "Factions" },
  Investigations: { category: "quest" },
  "Inventory & Gear": { category: "item" },
  "PC Notes": { category: "party" },
  "Session Notes": { category: "session" },
};

function stripComments(text) {
  return text.replace(/%%[\s\S]*?%%/g, (m) => m.replace(/[^\r\n]/g, ""));
}

function firstSummary(body) {
  for (const line of stripComments(body).split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || t.startsWith("---")) continue;
    const clean = t
      .replace(/^[>\-*\s]+/, "")
      .replace(/^\[![^\]]+\][+-]?\s*/, "")
      .replace(/[*_`]/g, "")
      .replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, "$2")
      .trim();
    if (clean.length > 12 && !/^(quick bio|description|atmosphere)$/i.test(clean)) return clean.slice(0, 220);
  }
  return "";
}

function str(v) {
  if (v === undefined || v === null || v === "") return undefined;
  if (Array.isArray(v)) return v.flat().map(String).join(", ");
  return String(v);
}

function walkDir(dir, baseDir = "") {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of list) {
    if (ent.name.startsWith(".")) continue;
    const rel = baseDir ? `${baseDir}/${ent.name}` : ent.name;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      results = results.concat(walkDir(full, rel));
    } else if (ent.name.toLowerCase().endsWith(".md")) {
      results.push(rel);
    }
  }
  return results;
}

// Find vault root
const candidates = [
  path.resolve(process.cwd(), "../Starving Vilgeismar"),
  path.resolve(process.cwd(), "Starving Vilgeismar"),
  path.resolve(process.cwd(), "../../Starving Vilgeismar"),
];

let vaultRoot = candidates.find((p) => fs.existsSync(path.join(p, "Notes")));
if (!vaultRoot) {
  console.warn("Could not find Starving Vilgeismar vault directory. Skipping manifest generation.");
  process.exit(0);
}

console.log(`Generating manifest from vault at: ${vaultRoot}`);

// Load users
let users = [];
const usersFile = path.join(vaultRoot, ".hub", "users.json");
if (fs.existsSync(usersFile)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(usersFile, "utf-8"));
    users = parsed.users || [];
  } catch (err) {
    console.error("Failed to parse users.json:", err);
  }
}

// Walk Notes
const notesDir = path.join(vaultRoot, "Notes");
const relFiles = walkDir(notesDir, "Notes");
const notes = [];

for (const relFile of relFiles) {
  const parts = relFile.split("/"); // Notes / <Top> / ...
  const top = TOP_FOLDERS[parts[1]];
  if (!top || parts.length < 3) continue;

  const fullPath = path.join(vaultRoot, relFile);
  try {
    const raw = fs.readFileSync(fullPath, "utf-8");
    const parsed = matter(raw);
    const fm = parsed.data || {};
    const stem = parts[parts.length - 1].replace(/\.md$/i, "");
    const isSecretPath = parts.includes("Secrets") || stem.startsWith("Secret - ");
    const secret = isSecretPath || fm.secret === true || fm.dm_only === true;
    const sub = top.sub || (parts.length > 3 ? parts[2] : undefined);
    const stat = fs.statSync(fullPath);

    notes.push({
      path: relFile,
      title: cleanTitle(stem),
      category: top.category,
      sub,
      summary: firstSummary(parsed.content),
      status: str(fm.status),
      faction: str(fm.faction)?.replace(/\[\[|\]\]/g, ""),
      location: str(fm.location)?.replace(/\[\[|\]\]/g, ""),
      priority: str(fm.priority),
      secret,
      revealed: fm.revealed === true || fm.revealed === "true",
      owner: str(fm.owner),
      visibleToParty: fm.visible_to_party === true || fm.visible_to_party === "true",
      playerField: str(fm.player),
      mtime: Math.floor(stat.mtimeMs),
      raw,
      body: parsed.content,
      frontmatter: fm,
    });
  } catch (err) {
    console.warn(`Failed reading note ${relFile}:`, err);
  }
}

notes.sort((a, b) => a.title.localeCompare(b.title));

const outDir = path.resolve(process.cwd(), "src/generated");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const manifest = {
  campaignId: "starving-vilgeismar",
  generatedAt: new Date().toISOString(),
  userCount: users.length,
  noteCount: notes.length,
  users,
  notes,
};

const outFile = path.join(outDir, "vault-manifest.json");
fs.writeFileSync(outFile, JSON.stringify(manifest), "utf-8");
console.log(`Successfully generated manifest with ${notes.length} notes and ${users.length} users to ${outFile}`);
