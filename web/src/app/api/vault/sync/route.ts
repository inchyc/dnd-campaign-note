import { HttpError, handle, requireCtx, loadUsers, verifyPin } from "@/lib/auth";
import { getCampaign, getStorage } from "@/lib/campaigns";
import { visibleNotes, NoteMeta } from "@/lib/vault";
import type { Storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Resolves context either from standard signed session cookie or
 * from direct API headers: x-campaign-id, x-player-id, x-player-pin
 */
async function resolveAuth(req: Request) {
  // 1. Try session cookie first
  try {
    const ctx = await requireCtx();
    return {
      campaign: ctx.campaign,
      storage: ctx.storage,
      user: ctx.user,
      isScribe: ctx.isScribe,
    };
  } catch {
    // Session cookie not present or invalid, check headers / search params
  }

  const url = new URL(req.url);
  const campId = req.headers.get("x-campaign-id") || url.searchParams.get("campaign");
  const userId = req.headers.get("x-player-id") || url.searchParams.get("user");
  const pin = req.headers.get("x-player-pin") || url.searchParams.get("pin");

  if (!campId) {
    throw new HttpError(401, "Not authenticated. Sign in or provide x-campaign-id and credentials.");
  }

  const campaign = getCampaign(campId);
  if (!campaign) {
    throw new HttpError(404, `Campaign '${campId}' not found.`);
  }

  const storage = getStorage(campaign);
  const users = await loadUsers(storage);

  if (userId && pin) {
    const user = users.find((u) => u.id.toLowerCase() === userId.toLowerCase());
    if (!user || !verifyPin(pin, user.hash)) {
      throw new HttpError(403, "Invalid Player ID or PIN for direct cloud sync.");
    }
    return {
      campaign,
      storage,
      user,
      isScribe: user.role === "scribe",
    };
  }

  // If campaign has users but no credentials were provided
  if (users.length > 0) {
    throw new HttpError(401, "Please provide x-player-id and x-player-pin headers to sync with this campaign.");
  }

  // Fallback for fresh campaign before users are created
  return {
    campaign,
    storage,
    user: { id: "guest", name: "Guest", character: "Guest", role: "player" as const },
    isScribe: false,
  };
}

/**
 * GET /api/vault/sync
 * Pull notes from the cloud database / vault.
 * Optional query params:
 *   - includeContent=1 (returns full raw markdown for each note)
 *   - since=<mtime> (returns notes modified since that timestamp)
 */
export const GET = handle(async (req: Request) => {
  const auth = await resolveAuth(req);
  const url = new URL(req.url);
  const includeContent = url.searchParams.get("includeContent") === "1" || url.searchParams.get("content") === "1";
  const since = parseInt(url.searchParams.get("since") || "0", 10) || 0;

  const notes = await visibleNotes(
    {
      campaign: auth.campaign,
      storage: auth.storage,
      user: auth.user,
      isScribe: auth.isScribe,
    },
    true,
    true
  );

  const filtered = since > 0 ? notes.filter((n) => (n.mtime || 0) > since) : notes;

  const payloadNotes = await Promise.all(
    filtered.map(async (n) => {
      let raw = n.raw;
      if (includeContent && !raw) {
        try {
          raw = await auth.storage.read(n.path);
        } catch {
          raw = "";
        }
      }
      return {
        path: n.path.replace(/^\/+/, ""),
        title: n.title,
        category: n.category,
        mtime: n.mtime || 0,
        summary: n.summary,
        status: n.status,
        raw: includeContent ? raw : undefined,
      };
    })
  );

  return Response.json({
    success: true,
    campaign: {
      id: auth.campaign.id,
      name: auth.campaign.name,
    },
    user: {
      id: auth.user.id,
      character: auth.user.character,
      role: auth.user.role,
    },
    count: payloadNotes.length,
    totalNotesInVault: notes.length,
    syncedAt: Date.now(),
    notes: payloadNotes,
  });
});

/**
 * POST /api/vault/sync
 * Push updated notes directly to the cloud database / vault.
 * Request body:
 *   {
 *     notes: Array<{ path: string; raw: string; mtime?: number }>
 *   }
 */
export const POST = handle(async (req: Request) => {
  const auth = await resolveAuth(req);
  const body = await req.json();

  if (!body.notes || !Array.isArray(body.notes)) {
    throw new HttpError(400, "Invalid payload. 'notes' array is required.");
  }

  const results: { path: string; status: "saved" | "error"; error?: string }[] = [];

  for (const item of body.notes) {
    if (!item.path || typeof item.raw !== "string") {
      results.push({ path: item.path || "unknown", status: "error", error: "Missing path or raw content" });
      continue;
    }

    const cleanPath = item.path.replace(/^\/+/, "");
    // Prevent directory traversal
    if (cleanPath.includes("..")) {
      results.push({ path: cleanPath, status: "error", error: "Invalid path" });
      continue;
    }

    try {
      await auth.storage.write(cleanPath, item.raw);
      results.push({ path: cleanPath, status: "saved" });
    } catch (err: any) {
      results.push({ path: cleanPath, status: "error", error: err?.message || "Failed to write" });
    }
  }

  const savedCount = results.filter((r) => r.status === "saved").length;

  return Response.json({
    success: true,
    campaignId: auth.campaign.id,
    pushedCount: savedCount,
    failedCount: results.length - savedCount,
    syncedAt: Date.now(),
    results,
  });
});
