import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { createClient } from "@supabase/supabase-js";

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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// Identify local vault path
const customPath = process.env.OBSIDIAN_VAULT_PATH;
const defaultLiveObsidian = "C:\\Users\\icinc\\Documents\\Obsidian Vault\\Chris\\TTRPG\\D&D\\Starving Vilgeismar";
const candidates = [
  customPath,
  defaultLiveObsidian,
  path.resolve(process.cwd(), "../Starving Vilgeismar"),
  path.resolve(process.cwd(), "Starving Vilgeismar"),
];

let vaultRoot = candidates.find((p) => p && fs.existsSync(p));
if (!vaultRoot) {
  console.error("❌ Could not locate local Obsidian vault directory.");
  process.exit(1);
}

const args = process.argv.slice(2);
const isPullOnly = args.includes("--pull");
const isPushOnly = args.includes("--push");

console.log(`🔗 Supabase: ${supabaseUrl}`);
console.log(`📂 Local Vault: ${vaultRoot}`);
console.log(`Mode: ${isPullOnly ? "PULL ONLY" : isPushOnly ? "PUSH ONLY" : "TWO-WAY BIDIRECTIONAL SYNC"}`);

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

async function sync() {
  const campaignId = "starving-vilgeismar";

  // 1. Fetch remote notes from Supabase
  const { data: remoteNotes, error } = await supabase
    .from("notes")
    .select("*")
    .eq("campaign_id", campaignId);

  if (error) {
    console.error("❌ Failed to query remote notes from Supabase:", error.message);
    process.exit(1);
  }

  const remoteMap = new Map();
  for (const n of remoteNotes || []) {
    remoteMap.set(n.path, n);
  }

  // 2. Scan local vault files
  const notesDir = path.join(vaultRoot, "Notes");
  const localFiles = walkDir(notesDir, "Notes");
  const localMap = new Map();

  for (const rel of localFiles) {
    const fullPath = path.join(vaultRoot, rel);
    const stat = fs.statSync(fullPath);
    localMap.set(rel, {
      path: rel,
      fullPath,
      mtime: Math.floor(stat.mtimeMs),
    });
  }

  let pulled = 0;
  let pushed = 0;
  let upToDate = 0;

  // Process Remote -> Local (Pull)
  if (!isPushOnly) {
    for (const [relPath, remote] of remoteMap.entries()) {
      const local = localMap.get(relPath);
      const fullPath = path.join(vaultRoot, relPath);

      if (!local || remote.mtime > local.mtime) {
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, remote.raw_content, "utf-8");
        // Update local file mtime to match remote
        const s = remote.mtime / 1000;
        fs.utimesSync(fullPath, s, s);
        pulled++;
        console.log(`⬇️ PULL: ${relPath}`);
      }
    }
  }

  // Process Local -> Remote (Push)
  if (!isPullOnly) {
    for (const [relPath, local] of localMap.entries()) {
      const remote = remoteMap.get(relPath);

      if (!remote || local.mtime > remote.mtime) {
        const raw = fs.readFileSync(local.fullPath, "utf-8");
        const parsed = matter(raw);
        const fm = parsed.data || {};
        const parts = relPath.split("/");
        const top = TOP_FOLDERS[parts[1]] || { category: "general" };
        const stem = parts[parts.length - 1].replace(/\.md$/i, "");
        const isSecretPath = parts.includes("Secrets") || stem.startsWith("Secret - ");
        const secret = isSecretPath || fm.secret === true || fm.dm_only === true;

        let visibility = "party";
        if (secret) {
          visibility = "dm";
        } else if (fm.owner || top.category === "party") {
          visibility = fm.visible_to_party ? "party" : "pc";
        }

        const record = {
          campaign_id: campaignId,
          path: relPath,
          title: cleanTitle(stem),
          category: top.category,
          subcategory: top.sub || (parts.length > 3 ? parts[2] : null),
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
          tasks: extractTasks(parsed.content),
          mtime: local.mtime,
        };

        const { error: pushErr } = await supabase.from("notes").upsert(record, {
          onConflict: "campaign_id,path",
        });

        if (pushErr) {
          console.warn(`❌ Push failed for ${relPath}:`, pushErr.message);
        } else {
          pushed++;
          console.log(`⬆️ PUSH: ${relPath}`);
        }
      } else {
        upToDate++;
      }
    }
  }

  console.log(`\n✨ Sync Complete!`);
  console.log(`   ⬇️ Pulled from Supabase to Obsidian: ${pulled}`);
  console.log(`   ⬆️ Pushed from Obsidian to Supabase: ${pushed}`);
  console.log(`   ✅ In Sync: ${upToDate}`);
}

sync().catch((err) => {
  console.error("❌ Sync error:", err);
  process.exit(1);
});
