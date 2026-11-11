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
  console.error("👉 To connect live sync to Supabase, add the following to your 'web/.env.local' file:");
  console.error("   SUPABASE_URL=https://your-project.supabase.co");
  console.error("   SUPABASE_SERVICE_ROLE_KEY=your-service-role-or-anon-key\n");
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
const isWatchMode = args.includes("--watch") || args.includes("-w");

let campaignId = "starving-vilgeismar";
const campaignArg = args.find((a) => a.startsWith("--campaign="));
if (campaignArg) {
  campaignId = campaignArg.split("=")[1];
}

console.log(`=======================================================`);
console.log(`🏰 D&D Campaign Hub <-> Obsidian.md Sync Engine`);
console.log(`🔗 Supabase URL : ${supabaseUrl}`);
console.log(`📂 Vault Path   : ${vaultRoot}`);
console.log(`⚔️ Campaign ID  : ${campaignId}`);
console.log(
  `⚙️ Mode         : ${
    isWatchMode
      ? "LIVE BACKGROUND WATCHER (Real-Time Bidirectional)"
      : isPullOnly
      ? "PULL ONLY (Cloud -> Local)"
      : isPushOnly
      ? "PUSH ONLY (Local -> Cloud)"
      : "TWO-WAY ONCE (Bidirectional Reconcile)"
  }`
);
console.log(`=======================================================\n`);

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

function buildRecordFromLocal(relPath, fullPath) {
  const stat = fs.statSync(fullPath);
  const raw = fs.readFileSync(fullPath, "utf-8");
  const parsed = matter(raw);
  const fm = parsed.data || {};
  const normalizedRel = relPath.replace(/\\/g, "/");
  const parts = normalizedRel.split("/");
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

  return {
    campaign_id: campaignId,
    path: normalizedRel,
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
    mtime: Math.floor(stat.mtimeMs),
  };
}

// In-memory set of paths being written by sync engine to prevent loopback
const writingPaths = new Set();

async function pushSingleFile(relPath) {
  const normalizedRel = relPath.replace(/\\/g, "/");
  const fullPath = path.join(vaultRoot, normalizedRel);
  if (!fs.existsSync(fullPath)) return false;

  try {
    const record = buildRecordFromLocal(normalizedRel, fullPath);
    const { error } = await supabase.from("notes").upsert(record, {
      onConflict: "campaign_id,path",
    });
    if (error) {
      console.warn(`[Sync Error] Push failed for ${normalizedRel}:`, error.message);
      return false;
    }
    console.log(`[Obsidian -> Cloud] ⬆️ Pushed: ${normalizedRel}`);
    return true;
  } catch (err) {
    console.warn(`[Sync Error] Error processing ${normalizedRel}:`, err.message);
    return false;
  }
}

async function pullSingleFile(remote) {
  const relPath = remote.path.replace(/\\/g, "/");
  const fullPath = path.join(vaultRoot, relPath);

  // Mark as writing to prevent echo
  writingPaths.add(relPath);

  try {
    // Check if local file exists and was also modified within threshold (conflict detection)
    if (fs.existsSync(fullPath)) {
      const localStat = fs.statSync(fullPath);
      const localMtime = Math.floor(localStat.mtimeMs);
      // If local was edited after the remote mtime, save conflict backup
      if (localMtime > remote.mtime + 2000) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const conflictBackup = fullPath.replace(/\.md$/i, `.conflict.${timestamp}.md`);
        fs.copyFileSync(fullPath, conflictBackup);
        console.warn(`[Conflict Alert] ⚠️ Local file was modified independently! Backup saved to: ${path.basename(conflictBackup)}`);
      }
    }

    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, remote.raw_content, "utf-8");

    // Set file modified time to match cloud mtime
    const s = remote.mtime / 1000;
    fs.utimesSync(fullPath, s, s);

    console.log(`[Cloud -> Obsidian] ⬇️ Pulled: ${relPath}`);
  } catch (err) {
    console.warn(`[Sync Error] Pull failed for ${relPath}:`, err.message);
  } finally {
    setTimeout(() => writingPaths.delete(relPath), 1200);
  }
}

async function syncOnce() {
  const { data: remoteNotes, error } = await supabase
    .from("notes")
    .select("*")
    .eq("campaign_id", campaignId);

  if (error) {
    console.error("❌ Failed to query remote notes from Supabase:", error.message);
    return { pulled: 0, pushed: 0, upToDate: 0 };
  }

  const remoteMap = new Map();
  for (const n of remoteNotes || []) {
    remoteMap.set(n.path.replace(/\\/g, "/"), n);
  }

  const notesDir = path.join(vaultRoot, "Notes");
  const localFiles = walkDir(notesDir, "Notes");
  const localMap = new Map();

  for (const rel of localFiles) {
    const norm = rel.replace(/\\/g, "/");
    const fullPath = path.join(vaultRoot, norm);
    const stat = fs.statSync(fullPath);
    localMap.set(norm, {
      path: norm,
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
      if (!local || remote.mtime > local.mtime + 500) {
        await pullSingleFile(remote);
        pulled++;
      }
    }
  }

  // Process Local -> Remote (Push)
  if (!isPullOnly) {
    for (const [relPath, local] of localMap.entries()) {
      const remote = remoteMap.get(relPath);
      if (!remote || local.mtime > remote.mtime + 500) {
        const ok = await pushSingleFile(relPath);
        if (ok) pushed++;
      } else {
        upToDate++;
      }
    }
  }

  return { pulled, pushed, upToDate };
}

// Watcher state
const pendingChanges = new Map();

function startWatcher() {
  const notesDir = path.join(vaultRoot, "Notes");
  console.log(`👀 Watching directory for live edits: ${notesDir}`);
  console.log(`✨ Live two-way synchronization active. Press Ctrl+C to stop.\n`);

  let lastCloudPollTime = Date.now();

  // 1. Local File System Watcher
  try {
    fs.watch(notesDir, { recursive: true }, (eventType, filename) => {
      if (!filename || !filename.toLowerCase().endsWith(".md")) return;
      if (filename.includes(".conflict.")) return;

      const normRel = path.join("Notes", filename).replace(/\\/g, "/");

      // Skip if this event was caused by the sync engine writing to disk
      if (writingPaths.has(normRel)) return;

      // Debounce saving (600ms) to allow editor writes to complete
      if (pendingChanges.has(normRel)) {
        clearTimeout(pendingChanges.get(normRel));
      }

      const timer = setTimeout(async () => {
        pendingChanges.delete(normRel);
        const fullPath = path.join(vaultRoot, normRel);
        if (fs.existsSync(fullPath)) {
          await pushSingleFile(normRel);
        }
      }, 600);

      pendingChanges.set(normRel, timer);
    });
  } catch (watchErr) {
    console.warn(`[Watcher Notice] Recursive watch failed: ${watchErr.message}. Falling back to active polling.`);
  }

  // 2. Cloud Poll Loop (every 12 seconds)
  setInterval(async () => {
    try {
      const { data: cloudUpdates, error } = await supabase
        .from("notes")
        .select("*")
        .eq("campaign_id", campaignId)
        .gt("mtime", lastCloudPollTime - 2000);

      if (!error && cloudUpdates && cloudUpdates.length > 0) {
        for (const remote of cloudUpdates) {
          const normRel = remote.path.replace(/\\/g, "/");
          if (writingPaths.has(normRel)) continue;

          const fullPath = path.join(vaultRoot, normRel);
          if (!fs.existsSync(fullPath)) {
            await pullSingleFile(remote);
          } else {
            const localStat = fs.statSync(fullPath);
            const localMtime = Math.floor(localStat.mtimeMs);
            if (remote.mtime > localMtime + 500) {
              await pullSingleFile(remote);
            }
          }
        }
      }
      lastCloudPollTime = Date.now();
    } catch (pollErr) {
      // transient network interruption; will retry on next tick
    }
  }, 12000);
}

async function main() {
  const result = await syncOnce();
  console.log(`\nInitial Reconciliation Done:`);
  console.log(`   ⬇️ Pulled from Cloud: ${result.pulled}`);
  console.log(`   ⬆️ Pushed to Cloud  : ${result.pushed}`);
  console.log(`   ✅ Synced Notes     : ${result.upToDate}\n`);

  if (isWatchMode) {
    startWatcher();
  }
}

main().catch((err) => {
  console.error("❌ Sync error:", err);
  process.exit(1);
});
