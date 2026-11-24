import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return Response.json(
      { ok: true, supabase: "not_configured", timestamp: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("notes").select("id").limit(1);
    if (error) {
      return Response.json(
        { ok: false, supabase: "error", error: error.message, timestamp: new Date().toISOString() },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    return Response.json(
      { ok: true, supabase: "awake", timestamp: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    return Response.json(
      { ok: false, supabase: "error", error: err?.message || "Unknown error", timestamp: new Date().toISOString() },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
