import fs from "fs";
import path from "path";
import { ROOT, getEnv } from "./config";
import { LocalFsStorage, GitHubStorage, SupabaseStorage, Storage } from "./storage";
import { isSupabaseConfigured } from "./supabaseClient";

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

/** Campaign registry: `campaigns.json` in the project root, falling back to runtime/defaults. */
export function listCampaigns(): Campaign[] {
  try {
    const raw = fs.readFileSync(path.join(ROOT, "campaigns.json"), "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) {
      // Merge with runtimeCampaigns to keep any dynamically created ones
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

export function addCampaign(campaign: Campaign): void {
  const existing = listCampaigns();
  if (existing.some((c) => c.id === campaign.id)) {
    throw new Error(`Campaign with ID '${campaign.id}' already exists.`);
  }
  runtimeCampaigns.push(campaign);
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
