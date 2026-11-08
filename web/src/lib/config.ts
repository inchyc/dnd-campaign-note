import fs from "fs";
import path from "path";

/** Project root (the folder that contains `web/`, `scribe/` and the vault folders). */
export const ROOT = path.resolve(process.cwd(), "..");

let envLoaded = false;

/** Loads KEY=VALUE pairs from the project-root `.env` (does not override real env vars). */
export function loadRootEnv() {
  if (envLoaded) return;
  envLoaded = true;
  try {
    const raw = fs.readFileSync(path.join(ROOT, ".env"), "utf-8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m || line.trim().startsWith("#")) continue;
      if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no .env, fine */
  }
}

export function getEnv(name: string): string | undefined {
  loadRootEnv();
  return process.env[name];
}
