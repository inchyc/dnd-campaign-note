import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "./config";

let serverClient: SupabaseClient | null = null;
let browserClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const url = getEnv("SUPABASE_URL") || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_ANON_KEY") || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key);
}

/**
 * Returns a server-side Supabase client with administrative or service privileges.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (serverClient) return serverClient;

  const url = getEnv("SUPABASE_URL") || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    getEnv("SUPABASE_SERVICE_ROLE_KEY") ||
    getEnv("SUPABASE_ANON_KEY") ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in your environment."
    );
  }

  serverClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return serverClient;
}

/**
 * Returns a browser-side Supabase client for realtime subscriptions.
 */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  browserClient = createClient(url, key, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return browserClient;
}
