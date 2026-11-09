import { handle } from "@/lib/auth";
import { listCampaigns } from "@/lib/campaigns";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  return Response.json({
    success: true,
    campaigns: listCampaigns().map((c) => ({
      id: c.id,
      name: c.name,
      tagline: c.tagline,
      system: c.system || "D&D 5e",
      chapter: c.chapter || "Campaign Active",
    })),
  });
});
