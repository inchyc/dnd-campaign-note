import { HttpError, handle, hashPin } from "@/lib/auth";
import { addCampaign, getStorage, listCampaigns } from "@/lib/campaigns";

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

export const POST = handle(async (req: Request) => {
  const { name, tagline, system, creatorName, creatorCharacter, creatorPin } = await req.json();
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    throw new HttpError(400, "Campaign name must be at least 2 characters");
  }
  if (!creatorName || typeof creatorName !== "string" || !creatorName.trim()) {
    throw new HttpError(400, "DM / Creator name is required");
  }
  if (!creatorPin || typeof creatorPin !== "string" || creatorPin.trim().length < 4) {
    throw new HttpError(400, "Creator PIN must be at least 4 digits");
  }

  const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!id) throw new HttpError(400, "Invalid campaign name");

  const existing = listCampaigns();
  if (existing.some((c) => c.id === id)) {
    throw new HttpError(409, `A campaign with ID '${id}' already exists`);
  }

  const newCampaign = {
    id,
    name: name.trim(),
    tagline: tagline?.trim() || "An epic realm awaits your party.",
    vault: name.trim(),
    system: system?.trim() || "D&D 5e",
    chapter: "Chapter 1: The Journey Begins",
  };

  addCampaign(newCampaign);

  // Initialize storage with users.json (creator as Scribe) and starter notes
  const storage = getStorage(newCampaign);
  const charName = (creatorCharacter || creatorName).trim();
  const userId = creatorName.trim().toLowerCase().replace(/[^a-z0-9]/g, "") || "dm";

  const usersData = {
    users: [
      {
        id: userId,
        name: creatorName.trim(),
        character: charName,
        role: "scribe",
        hash: hashPin(creatorPin.trim()),
        characterNotes: [`Notes/PC Notes/${charName}.md`],
      },
    ],
  };

  await storage.write(".hub/users.json", JSON.stringify(usersData, null, 2));

  const sessionZero = `---
title: Session 0 - Campaign Prelude
category: session
created: ${new Date().toISOString().slice(0, 10)}
status: active
---
# Session 0: The Journey Begins
Welcome to ${newCampaign.name}! The world is waiting for your heroes.
`;
  await storage.write("Notes/Sessions/Session 0.md", sessionZero);

  const pcNote = `---
title: ${charName}
category: pc
visible_to_party: true
---
# ${charName}
Campaign founder and adventurer.
`;
  await storage.write(`Notes/PC Notes/${charName}.md`, pcNote);

  const starterQuest = `---
title: First Steps
category: quest
status: open
priority: normal
---
# First Steps
The adventure begins. Gather your party and investigate your first mystery.
`;
  await storage.write("Notes/Quests/First Steps.md", starterQuest);

  return Response.json({ success: true, campaign: newCampaign });
});
