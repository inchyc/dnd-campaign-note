import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { createClient } from "@supabase/supabase-js";

// Load environment variables from web/.env.local, web/.env, or root .env
function loadEnv() {
  const envFiles = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../.env"),
  ];
  for (const f of envFiles) {
    if (!fs.existsSync(f)) continue;
    const raw = fs.readFileSync(f, "utf-8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m || line.trim().startsWith("#")) continue;
      if (process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY.");
  console.error("Please configure these in your web/.env.local or .env file before running seed.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

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

function extractTasks(body) {
  const tasks = [];
  const lines = body.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*[-*]\s*\[([ xX])\]\s*)(.*)$/);
    if (m) {
      tasks.push({
        lineIndex: i,
        checked: m[2].toLowerCase() === "x",
        text: m[3].trim(),
      });
    }
  }
  return tasks;
}

function extractWikilinks(text) {
  const matches = text.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g) || [];
  return [...new Set(matches.map((m) => m.replace(/^\[\[/, "").replace(/\]\]$/, "").split("|")[0].trim()))];
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
  console.error("❌ Could not locate Starving Vilgeismar vault directory.");
  process.exit(1);
}

console.log(`📡 Connected to Supabase at: ${supabaseUrl}`);
console.log(`📂 Seeding from vault at: ${vaultRoot}`);

async function seed() {
  const campaignId = "starving-vilgeismar";

  // 1. Upsert Campaign
  const { error: campError } = await supabase.from("campaigns").upsert(
    {
      id: campaignId,
      name: "Starving Vilgeismar",
      tagline: "A gothic city under siege, hunger gnawing at the lower quarters while shadows stir in the canals.",
      system: "D&D 5e",
      chapter: "Chapter 1: The Withered Reach",
      vault_prefix: "Starving Vilgeismar",
    },
    { onConflict: "id" }
  );

  if (campError) {
    console.error("❌ Failed to upsert campaign:", campError.message);
    process.exit(1);
  }
  console.log("✅ Campaign 'starving-vilgeismar' verified.");

  // 2. Walk Notes directory
  const notesDir = path.join(vaultRoot, "Notes");
  const relFiles = walkDir(notesDir, "Notes");
  console.log(`Found ${relFiles.length} markdown notes to process...`);

  const records = [];

  for (const relFile of relFiles) {
    const parts = relFile.split("/");
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

      let visibility = "party";
      if (secret) {
        visibility = "dm";
      } else if (fm.owner || top.category === "party") {
        visibility = fm.visible_to_party ? "party" : "pc";
      }

      const tasks = extractTasks(parsed.content);
      const links = extractWikilinks(raw);

      records.push({
        campaign_id: campaignId,
        path: relFile,
        title: cleanTitle(stem),
        category: top.category,
        subcategory: sub || null,
        status: (fm.status || "active").toString().toLowerCase(),
        priority: (fm.priority || "medium").toString().toLowerCase(),
        lead: fm.lead || (fm.owner ? String(fm.owner) : null),
        summary: firstSummary(parsed.content),
        visibility,
        character: fm.owner ? String(fm.owner) : (fm.player ? String(fm.player) : null),
        tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
        aliases: Array.isArray(fm.aliases) ? fm.aliases.map(String) : [],
        raw_content: raw,
        body: parsed.content,
        frontmatter: fm,
        tasks: tasks,
        links: links,
        backlinks: [],
        mtime: Math.floor(stat.mtimeMs),
      });
    } catch (err) {
      console.warn(`⚠️ Warning: Failed reading note ${relFile}:`, err.message);
    }
  }

  // Calculate backlinks across all records
  const linkMap = new Map();
  for (const r of records) {
    for (const target of r.links) {
      if (!linkMap.has(target)) linkMap.set(target, []);
      linkMap.get(target).push(r.title);
    }
  }
  for (const r of records) {
    r.backlinks = linkMap.get(r.title) || [];
  }

  console.log(`Upserting ${records.length} parsed notes into Supabase...`);

  // Batch in chunks of 50 to avoid payload size constraints
  const CHUNK_SIZE = 50;
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from("notes").upsert(chunk, {
      onConflict: "campaign_id,path",
    });
    if (error) {
      console.error(`❌ Batch upsert error at index ${i}:`, error.message);
      process.exit(1);
    }
    console.log(`  Uploaded notes ${i + 1} - ${Math.min(i + CHUNK_SIZE, records.length)}`);
  }

  console.log(`\n🎉 Successfully seeded ${records.length} notes into Supabase!`);
}

seed().catch((err) => {
  console.error("❌ Fatal error during seed:", err);
  process.exit(1);
});
