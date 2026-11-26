import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "./config";

export { getSupabaseBrowser } from "./supabaseBrowser";

let serverClient: SupabaseClient | null = null;

const DEFAULT_SUPABASE_URL = "https://djsvwbidijqyqdvwlwqh.supabase.co";

export function isSupabaseConfigured(): boolean {
  const url = getEnv("SUPABASE_URL") || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_ANON_KEY") || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key);
}

/**
 * Returns a server-side Supabase client with administrative or service privileges.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (serverClient) return serverClient;

  const url = getEnv("SUPABASE_URL") || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
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
