import { spawn } from "child_process";
import { Ctx, loadUsers } from "./auth";
import { ROOT } from "./config";
import { readAllLines } from "./scratch";
import { withLock } from "./storage";
import { invalidateIndex } from "./vault";

const START = "<!-- hub-collated:start -->";
const END = "<!-- hub-collated:end -->";

/** Joins every saved audio-chunk transcript for a session, in order. */
export async function readTranscript(ctx: Pick<Ctx, "storage">, session: string): Promise<string> {
  const dir = `.hub/audio/${session}`;
  const parts = (await ctx.storage.list(dir)).filter((e) => !e.isDir && e.name.endsWith(".txt")).map((e) => e.name).sort();
  const texts: string[] = [];
  for (const p of parts) texts.push((await ctx.storage.read(`${dir}/${p}`)).trim());
  return texts.filter(Boolean).join("\n\n");
}

/**
 * Merges everyone's scratchpad lines (plus any audio transcript) into
 * "Notes/Session Notes/Session Notes <date>.md", grouped by tag and attributed to each author.
 * Re-running replaces only the collated block, never the Scribe's own text.
 */
export async function collateSession(ctx: Ctx, session: string) {
  const users = await loadUsers(ctx.storage);
  const label = (id: string) => {
    const u = users.find((x) => x.id === id);
    return u ? `${u.name}/${u.character}` : id;
  };
  const everyone = await readAllLines(ctx, session);
  const lines = Object.entries(everyone)
    .flatMap(([uid, ls]) => ls.map((l) => ({ ...l, author: label(uid) })))
    .sort((a, b) => a.at - b.at);
  const transcript = await readTranscript(ctx, session);

  const fmt = (l: (typeof lines)[number]) => `- [${l.time}] (${l.author}) ${l.text.replace(/\n+/g, " / ")}`;
  const tag = (re: RegExp) => lines.filter((l) => re.test(l.text));
  const combat = tag(/!combat/i);
  const loot = tag(/#loot/i);
  const npc = tag(/@npc/i);
  const rest = lines.filter((l) => !/(!combat|#loot|@npc)/i.test(l.text));

  const block = [
    START,
    "## 📝 Rapid Fire Notes (collated from the table)",
    ...(rest.length ? rest.map(fmt) : ["- (no general notes)"]),
    "",
    "## ⚔️ Combat / Encounters (collated)",
    ...(combat.length ? combat.map(fmt) : ["- (none)"]),
    "",
    "## 💡 Rewards & Loot (collated)",
    ...(loot.length ? loot.map(fmt) : ["- (none)"]),
    "",
    "## 🔍 New Intel (collated, NPCs)",
    ...(npc.length ? npc.map(fmt) : ["- (none)"]),
    ...(transcript ? ["", "## 🎙️ Audio Transcript", transcript] : []),
    END,
  ].join("\n");

  const path = `Notes/Session Notes/Session Notes ${session}.md`;
  await withLock(path, async () => {
    let text: string;
    if (await ctx.storage.exists(path)) {
      text = await ctx.storage.read(path);
      const s = text.indexOf(START);
      const e = text.indexOf(END);
      if (s !== -1 && e > s) text = text.slice(0, s) + block + text.slice(e + END.length);
      else text = text.replace(/\s+$/, "") + `\n\n${block}\n`;
    } else {
      const now = new Date().toISOString().slice(0, 16);
      text =
        `---\ncreated: ${now}\nupdated: ${now}\ncampaign: ${ctx.campaign.name}\nlocation: \nsummary:\ntags: session-logs\n---\n\n` +
        `# 📓 Session: ${session}\n\n${block}\n`;
    }
    await ctx.storage.write(path, text);
  });
  invalidateIndex(ctx.campaign.id);
  return { path, lines: lines.length, hasTranscript: !!transcript, authors: Object.keys(everyone).length };
}

/**
 * Starts the existing Python Lore-Master on the collated session note (runs in the background and
 * stages drafts under _Review/). Local-hosting only; porting this step is part of the deployment work.
 */
export function startLoreMaster(session: string): { started: boolean; error?: string } {
  try {
    const child = spawn("python", ["scribe/lore_master.py", "parse", session], {
      cwd: ROOT,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.on("error", () => undefined);
    child.unref();
    return { started: true };
  } catch (e: any) {
    return { started: false, error: e?.message };
  }
}
