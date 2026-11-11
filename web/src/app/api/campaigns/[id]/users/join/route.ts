import { HttpError, handle, hashPin, loadUsers, publicUser, saveUsers, setSessionCookie, HubUser, Role } from "@/lib/auth";
import { getCampaign, getStorage } from "@/lib/campaigns";

export const dynamic = "force-dynamic";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const campaign = getCampaign(id);
  if (!campaign) throw new HttpError(404, `Campaign '${id}' not found`);

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const character = typeof body.character === "string" ? body.character.trim() : "";
  const pin = typeof body.pin === "string" ? body.pin.trim() : "";
  const role: Role = body.role === "scribe" ? "scribe" : "player";
  const characterClass = typeof body.class === "string" ? body.class.trim() : "Adventurer";
  const level = typeof body.level === "number" ? body.level : parseInt(body.level || "1", 10) || 1;
  const autoLogin = Boolean(body.autoLogin ?? true);

  if (!name) throw new HttpError(400, "Player name is required.");
  if (!character) throw new HttpError(400, "Character name is required.");
  if (!pin || pin.length < 3) throw new HttpError(400, "PIN must be at least 3 digits/characters.");

  const storage = getStorage(campaign);
  const users = await loadUsers(storage);

  // Generate unique userId based on name or character
  let baseId = slugify(character) || slugify(name);
  if (!baseId) baseId = `player-${Date.now()}`;
  let userId = baseId;
  let counter = 2;
  while (users.some((u) => u.id === userId)) {
    userId = `${baseId}-${counter++}`;
  }

  const hash = hashPin(pin);
  const characterPath = `Notes/PC Notes/${character}.md`;

  const newUser: HubUser = {
    id: userId,
    name,
    character,
    role,
    hash,
    characterNotes: [characterPath],
  };

  // Add to roster and save
  users.push(newUser);
  await saveUsers(storage, users);

  // Create character dossier note if not already existing
  try {
    const noteExists = await storage.exists(characterPath);
    if (!noteExists) {
      const nowIso = new Date().toISOString().replace(/\.\d+Z$/, "");
      const dossierContent = [
        "---",
        `role: Adventurer`,
        `disposition: Friendly`,
        `primary_stat: Adaptability`,
        `status: Alive`,
        `created: ${nowIso}`,
        `updated: ${nowIso}`,
        `owner: ${name}`,
        `player: ${name}`,
        `class: ${characterClass}`,
        `level: ${level}`,
        "---",
        `# 🫂 Party Member: [${character}]`,
        "",
        `> [!abstract] **Quick Summary**`,
        `> ${characterClass} travelling with the party in ${campaign.name}.`,
        "",
        `### ⚔️ Combat & Utility`,
        `- **Class & Level:** ${characterClass} (Level ${level})`,
        `- **Signature Move:** Tactical support and party collaboration.`,
        "",
        `### 🤝 Narrative & Connections`,
        `- **Player:** ${name}`,
        `- **Relationship with Party:** Trusted companion.`,
        `- **Motivations:** Exploring adventures and resolving ancient mysteries.`,
        "",
      ].join("\n");

      await storage.write(characterPath, dossierContent);
    }
  } catch (err) {
    console.warn("Could not create initial character dossier note:", err);
  }

  if (autoLogin) {
    await setSessionCookie({
      campaign: campaign.id,
      userId: newUser.id,
      role: newUser.role,
    });
  }

  return Response.json({
    success: true,
    user: publicUser(newUser),
    users: users.map(publicUser),
    campaign: { id: campaign.id, name: campaign.name },
  });
});
