import { handle, requireCtx } from "@/lib/auth";
import { ownsCharacterNote, toMeta, visibleNotes } from "@/lib/vault";

export const dynamic = "force-dynamic";

const isUnclaimed = (o?: string) => !o || /^(party|unclaimed)$/i.test(o);

export const GET = handle(async () => {
  const ctx = await requireCtx();
  const visible = await visibleNotes(ctx);

  const characters = visible
    .filter((n) => n.category === "party")
    .map((n) => ({
      ...toMeta(n),
      mine: ownsCharacterNote(ctx.user, n),
      class: n.frontmatter.class ? String(n.frontmatter.class) : undefined,
      level: n.frontmatter.level ? String(n.frontmatter.level) : undefined,
    }));

  const items = visible.filter((n) => n.category === "item");
  const inventoryNote = items.find((n) => /party inventory/i.test(n.title));
  const loot = items.filter((n) => n !== inventoryNote && isUnclaimed(n.owner)).map(toMeta);
  const mine = items
    .filter((n) => n.owner && n.owner.toLowerCase() === ctx.user.character.toLowerCase())
    .map(toMeta);
  const claimed = ctx.isScribe
    ? items.filter((n) => n !== inventoryNote && !isUnclaimed(n.owner) && n.owner!.toLowerCase() !== ctx.user.character.toLowerCase()).map(toMeta)
    : [];

  return Response.json({
    success: true,
    characters,
    loot,
    mine,
    claimed,
    inventoryPath: inventoryNote?.path,
    character: ctx.user.character,
  });
});
