import fs from "fs";
import path from "path";

/** Project root (the folder that contains `web/`, `scribe/` and the vault folders). */
export const ROOT = path.resolve(process.cwd(), "..");

let envLoaded = false;

function parseEnvFile(filePath: string) {
  try {
    if (!fs.existsSync(filePath)) return;
    const raw = fs.readFileSync(filePath, "utf-8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m || line.trim().startsWith("#")) continue;
      if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* ignore */
  }
}

/** Loads KEY=VALUE pairs from `.env` or `.env.local` (does not override real env vars). */
export function loadRootEnv() {
  if (envLoaded) return;
  envLoaded = true;
  parseEnvFile(path.join(ROOT, ".env"));
  parseEnvFile(path.join(process.cwd(), ".env.local"));
  parseEnvFile(path.join(process.cwd(), ".env"));
}

export function getEnv(name: string): string | undefined {
  loadRootEnv();
  return process.env[name];
}
