import fs from "fs";
import path from "path";
import { ROOT, getEnv } from "./config";
import { LocalFsStorage, GitHubStorage, Storage } from "./storage";

export interface Campaign {
  id: string;
  name: string;
  tagline?: string;
  vault: string; // folder (relative to project root) that holds the Obsidian vault
}

const DEFAULT_CAMPAIGNS: Campaign[] = [
  {
    id: "starving-miracle",
    name: "The Starving Miracle",
    tagline: "Vilgeismar, a city under siege and starving",
    vault: "Starving Vilgeismar",
  },
];

/** Campaign registry: `campaigns.json` in the project root, falling back to the default. */
export function listCampaigns(): Campaign[] {
  try {
    const raw = fs.readFileSync(path.join(ROOT, "campaigns.json"), "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {
    /* fall through */
  }
  return DEFAULT_CAMPAIGNS;
}

export function getCampaign(id: string): Campaign | undefined {
  return listCampaigns().find((c) => c.id === id);
}

const storages = new Map<string, Storage>();

export function getStorage(campaign: Campaign): Storage {
  let s = storages.get(campaign.id);
  if (s) return s;

  // Cloud Mode: GitHub REST API storage (for Vercel deployment)
  const isCloud = getEnv("STORAGE_BACKEND") === "github" || !!getEnv("GITHUB_TOKEN");
  const repo = getEnv("GITHUB_REPO");
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
