/**
 * Client-side cache for offline reading and resilience during cloud updates.
 * Safely persists note data in localStorage so players can read character sheets,
 * NPC dossiers, and quest logs even when offline or during a Vercel redeployment.
 */

const CACHE_PREFIX = "dnd_codex_cache_";

export function setCachedData<T>(key: string, data: T): void {
  try {
    if (typeof window === "undefined") return;
    const payload = {
      timestamp: Date.now(),
      data,
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(payload));
  } catch (err) {
    // LocalStorage quota exceeded or disabled
    console.warn("Codex cache save skipped:", err);
  }
}

export function getCachedData<T>(key: string): { data: T; timestamp: number } | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

export function clearCodexCache(): void {
  try {
    if (typeof window === "undefined") return;
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX));
    for (const k of keys) {
      localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}
