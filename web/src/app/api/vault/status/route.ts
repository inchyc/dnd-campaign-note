import { handle, requireCtx } from "@/lib/auth";
import { visibleNotes } from "@/lib/vault";
import { getEnv } from "@/lib/config";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const ctx = await requireCtx();
  const notes = await visibleNotes(ctx, false, true);

  let backend = "local";
  if (
    getEnv("STORAGE_BACKEND") === "supabase" ||
    (getEnv("STORAGE_BACKEND") !== "github" && getEnv("STORAGE_BACKEND") !== "local" && isSupabaseConfigured())
  ) {
    backend = "supabase";
  } else if (getEnv("STORAGE_BACKEND") === "github" || !!getEnv("GITHUB_TOKEN") || process.env.VERCEL === "1") {
    backend = "github";
  }

  // Find latest mtime across visible notes
  let latestMtime = 0;
  for (const n of notes) {
    if (n.mtime && n.mtime > latestMtime) {
      latestMtime = n.mtime;
    }
  }

  return Response.json({
    success: true,
    campaign: {
      id: ctx.campaign.id,
      name: ctx.campaign.name,
      vault: ctx.campaign.vault,
    },
    backend,
    backendLabel:
      backend === "supabase"
        ? "Supabase Cloud PostgreSQL"
        : backend === "github"
        ? "GitHub Repository"
        : "Local Filesystem Vault",
    notesCount: notes.length,
    latestMtime,
    isScribe: ctx.isScribe,
  });
});
