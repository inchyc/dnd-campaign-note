import { HttpError, handle, requireCtx } from "@/lib/auth";
import { GLOSSARY, gemini } from "@/lib/gemini";
import { currentSession, isValidSession } from "@/lib/scratch";

export const dynamic = "force-dynamic";

const EXTS: Record<string, string> = {
  webm: "audio/webm",
  ogg: "audio/ogg",
  mp4: "audio/mp4",
  m4a: "audio/mp4",
  wav: "audio/wav",
};
const MAX_BYTES = 40 * 1024 * 1024;

const pad = (n: number) => String(n).padStart(4, "0");

/** Lists recorded chunks for a session and which have been transcribed. */
export const GET = handle(async (req: Request) => {
  const ctx = await requireCtx({ scribe: true });
  const q = new URL(req.url).searchParams.get("session");
  const session = q && isValidSession(q) ? q : await currentSession(ctx);
  const entries = await ctx.storage.list(`.hub/audio/${session}`);
  const chunks = await Promise.all(
    entries
      .filter((e) => !e.isDir && /^chunk-\d+\.(webm|ogg|mp4|m4a|wav)$/.test(e.name))
      .map(async (e) => {
        const index = parseInt(e.name.match(/chunk-(\d+)/)![1], 10);
        const txtFile = `chunk-${pad(index)}.txt`;
        const transcribed = entries.some((x) => x.name === txtFile);
        let text: string | undefined;
        if (transcribed) {
          try {
            text = await ctx.storage.read(`.hub/audio/${session}/${txtFile}`);
          } catch {
            /* ignore */
          }
        }
        return { index, file: e.name, transcribed, text };
      })
  );
  chunks.sort((a, b) => a.index - b.index);
  return Response.json({ success: true, session, chunks });
});

/** Upload one recorded chunk (each chunk is a standalone audio file). */
export const PUT = handle(async (req: Request) => {
  const ctx = await requireCtx({ scribe: true });
  const url = new URL(req.url);
  const session = url.searchParams.get("session") || (await currentSession(ctx));
  const index = parseInt(url.searchParams.get("index") || "", 10);
  const ext = (url.searchParams.get("ext") || "webm").toLowerCase();
  if (!isValidSession(session) || !Number.isInteger(index) || index < 0 || !EXTS[ext]) throw new HttpError(400, "Bad upload");
  const data = Buffer.from(await req.arrayBuffer());
  if (!data.length) throw new HttpError(400, "Empty audio");
  if (data.length > MAX_BYTES) throw new HttpError(413, "Chunk too large");
  await ctx.storage.writeBinary(`.hub/audio/${session}/chunk-${pad(index)}.${ext}`, data);
  return Response.json({ success: true, bytes: data.length });
});

/** Transcribe one chunk with Gemini and save the text next to it. */
export const POST = handle(async (req: Request) => {
  const ctx = await requireCtx({ scribe: true });
  const { session: s, index } = await req.json();
  const session = s && isValidSession(s) ? s : await currentSession(ctx);
  if (!Number.isInteger(index)) throw new HttpError(400, "Bad chunk");
  const dir = `.hub/audio/${session}`;
  const file = (await ctx.storage.list(dir)).find((e) => e.name.startsWith(`chunk-${pad(index)}.`) && !e.name.endsWith(".txt"));
  if (!file) throw new HttpError(404, "Chunk not found");
  const ext = file.name.split(".").pop()!;
  const data = await ctx.storage.readBinary(`${dir}/${file.name}`);
  if (data.length > 14 * 1024 * 1024) throw new HttpError(413, "Chunk too large to transcribe in one go");

  const text = await gemini(
    [
      {
        text:
          `Transcribe this tabletop D&D session audio. Label speakers as "DM" or "Player" where it is clear; otherwise "Speaker". ` +
          `Mark clearly out-of-character chatter with (OOC). Use these spellings for names and terms: ${GLOSSARY} ` +
          `Output plain transcript text only, with no preamble. If a section is inaudible write [inaudible].`,
      },
      { inline_data: { mime_type: EXTS[ext], data: data.toString("base64") } },
    ],
    { timeoutMs: 280_000 }
  );
  await ctx.storage.write(`${dir}/chunk-${pad(index)}.txt`, text.trim());
  return Response.json({ success: true, characters: text.length });
});
