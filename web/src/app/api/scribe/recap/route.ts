import { HttpError, handle, requireCtx } from "@/lib/auth";
import { gemini } from "@/lib/gemini";
import { walk } from "@/lib/storage";
import { displayText } from "@/lib/vault";

export const dynamic = "force-dynamic";

/** Generate the "Previously on..." recap from the most recent session note. */
export const POST = handle(async () => {
  const ctx = await requireCtx({ scribe: true });
  const files = (await walk(ctx.storage, "Notes/Session Notes"))
    .filter((f) => /Session Notes \d{4}-\d{2}-\d{2}\.md$/.test(f))
    .sort();
  const latest = files[files.length - 1];
  if (!latest) throw new HttpError(404, "No session notes found");
  const session = latest.match(/\d{4}-\d{2}-\d{2}/)![0];
  const text = displayText(await ctx.storage.read(latest))
    .replace(/!\[\[[^\]]*\]\]/g, "")
    .slice(0, 30000);

  const recap = await gemini(
    [
      {
        text:
          `Write a "Previously on…" recap of this D&D session for the players to read at the start of the next game. ` +
          `120-180 words, vivid but clear, third person, past tense. Only include what the party actually experienced. ` +
          `No headings, no bullet points, no preamble.\n\nSESSION NOTES:\n${text}`,
      },
    ],
    { system: "You are the party scribe for a dark-fantasy D&D campaign called The Starving Miracle." }
  );

  const saved = { session, text: recap.trim(), generatedAt: new Date().toISOString() };
  await ctx.storage.write(".hub/recap.json", JSON.stringify(saved, null, 2));
  return Response.json({ success: true, recap: saved });
});
