import fs from "fs";
import path from "path";
import { ROOT, getEnv } from "./config";
import { LocalFsStorage, GitHubStorage, SupabaseStorage, Storage } from "./storage";
import { getSupabaseAdmin, isSupabaseConfigured } from "./supabaseClient";

export interface Campaign {
  id: string;
  name: string;
  tagline?: string;
  vault: string; // folder (relative to project root) that holds the Obsidian vault
  system?: string;
  chapter?: string;
}

const DEFAULT_CAMPAIGNS: Campaign[] = [
  {
    id: "starving-vilgeismar",
    name: "Starving Vilgeismar",
    tagline: "A gothic city under siege, hunger gnawing at the lower quarters while shadows stir in the canals.",
    vault: "Starving Vilgeismar",
    system: "D&D 5e",
    chapter: "Chapter 1: The Withered Reach",
  },
];

const runtimeCampaigns: Campaign[] = [...DEFAULT_CAMPAIGNS];
let supabaseCampaignsCache: { at: number; list: Campaign[] } | null = null;
const CAMPAIGN_CACHE_TTL = 15 * 1000;

/** Campaign registry: `campaigns.json` in the project root, falling back to runtime/defaults. */
export function listCampaigns(): Campaign[] {
  try {
    const raw = fs.readFileSync(path.join(ROOT, "campaigns.json"), "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) {
      for (const c of parsed) {
        if (!runtimeCampaigns.some((x) => x.id === c.id)) runtimeCampaigns.push(c);
      }
      return runtimeCampaigns;
    }
  } catch {
    /* fall through */
  }
  return runtimeCampaigns;
}

/** Async campaign registry backed by Supabase `campaigns` table merged with local config. */
export async function listCampaignsAsync(forceFresh = false): Promise<Campaign[]> {
  const base = listCampaigns();
  if (!isSupabaseConfigured()) return base;

  if (!forceFresh && supabaseCampaignsCache && Date.now() - supabaseCampaignsCache.at < CAMPAIGN_CACHE_TTL) {
    return supabaseCampaignsCache.list;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("campaigns")
      .select("id, name, tagline, system, chapter, vault_prefix");

    if (!error && Array.isArray(data)) {
      const merged: Campaign[] = [...base];
      for (const row of data) {
        if (!row?.id) continue;
        const idx = merged.findIndex((c) => c.id === row.id);
        const mapped: Campaign = {
          id: String(row.id),
          name: String(row.name || row.id),
          tagline: row.tagline ? String(row.tagline) : undefined,
          vault: String(row.vault_prefix || row.name || row.id),
          system: row.system ? String(row.system) : undefined,
          chapter: row.chapter ? String(row.chapter) : undefined,
        };
        if (idx >= 0) merged[idx] = { ...merged[idx], ...mapped };
        else merged.push(mapped);
      }
      supabaseCampaignsCache = { at: Date.now(), list: merged };
      return merged;
    }
  } catch (err) {
    console.warn("Supabase listCampaignsAsync failed, using fallback:", err);
  }

  return base;
}

export function addCampaign(campaign: Campaign): void {
  const existing = listCampaigns();
  if (existing.some((c) => c.id === campaign.id)) {
    throw new Error(`Campaign with ID '${campaign.id}' already exists.`);
  }
  runtimeCampaigns.push(campaign);
  supabaseCampaignsCache = null;
  try {
    fs.writeFileSync(path.join(ROOT, "campaigns.json"), JSON.stringify(runtimeCampaigns, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not persist campaigns.json locally:", e);
  }
}

export async function addCampaignAsync(campaign: Campaign): Promise<void> {
  const existing = await listCampaignsAsync(true);
  if (existing.some((c) => c.id === campaign.id)) {
    throw new Error(`Campaign with ID '${campaign.id}' already exists.`);
  }

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("campaigns").upsert(
      {
        id: campaign.id,
        name: campaign.name,
        tagline: campaign.tagline || null,
        system: campaign.system || "D&D 5e",
        chapter: campaign.chapter || null,
        vault_prefix: campaign.vault,
      },
      { onConflict: "id" }
    );
    if (error) {
      throw new Error(`Failed to persist campaign to Supabase: ${error.message}`);
    }
  }

  if (!runtimeCampaigns.some((c) => c.id === campaign.id)) {
    runtimeCampaigns.push(campaign);
  }
  supabaseCampaignsCache = null;
  try {
    fs.writeFileSync(path.join(ROOT, "campaigns.json"), JSON.stringify(runtimeCampaigns, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not persist campaigns.json locally:", e);
  }
}

export function getCampaign(id: string): Campaign | undefined {
  const all = listCampaigns();
  return all.find((c) => c.id === id) || (id === "starving-miracle" ? all[0] : undefined);
}

export async function getCampaignAsync(id: string): Promise<Campaign | undefined> {
  const all = await listCampaignsAsync();
  return all.find((c) => c.id === id) || (id === "starving-miracle" ? all[0] : undefined);
}

const storages = new Map<string, Storage>();

export function getStorage(campaign: Campaign): Storage {
  let s = storages.get(campaign.id);
  if (s) return s;

  // Supabase Mode (Preferred Cloud Database backend)
  const useSupabase =
    getEnv("STORAGE_BACKEND") === "supabase" ||
    (getEnv("STORAGE_BACKEND") !== "github" && getEnv("STORAGE_BACKEND") !== "local" && isSupabaseConfigured());

  if (useSupabase) {
    s = new SupabaseStorage(campaign.id);
    storages.set(campaign.id, s);
    return s;
  }

  // Cloud Mode: GitHub REST API storage (for Vercel deployment without database)
  const isCloud = getEnv("STORAGE_BACKEND") === "github" || !!getEnv("GITHUB_TOKEN") || process.env.VERCEL === "1";
  let repo = getEnv("GITHUB_REPO") || "inchyc/dnd-campaign-note";
  if (!repo || repo.includes("starving-miracle-hub")) {
    repo = "inchyc/dnd-campaign-note";
  }
  if (isCloud && repo) {
    s = new GitHubStorage({
      repo,
      token: getEnv("GITHUB_TOKEN"),
      branch: getEnv("GITHUB_BRANCH") || "main",
      prefix: campaign.vault,
    });
    storages.set(campaign.id, s);
    return s;
  }

  // Local Mode: Prefer the live Obsidian Vault path if it exists, otherwise project folder
  const customPath = getEnv("OBSIDIAN_VAULT_PATH");
  const defaultLiveObsidian = "C:\\Users\\icinc\\Documents\\Obsidian Vault\\Chris\\TTRPG\\D&D\\Starving Vilgeismar";

  let vaultRoot = path.resolve(ROOT, campaign.vault);
  if (customPath && fs.existsSync(customPath)) {
    vaultRoot = customPath;
  } else if (fs.existsSync(defaultLiveObsidian)) {
    vaultRoot = defaultLiveObsidian;
  }

  s = new LocalFsStorage(vaultRoot);
  storages.set(campaign.id, s);
  return s;
}
