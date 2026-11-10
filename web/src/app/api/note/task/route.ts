import { HttpError, handle, requireCtx } from "@/lib/auth";
import { cleanLine, getVisibleNote, mutateNote } from "@/lib/noteops";
import { TASK_RE, splitLines, stripComments } from "@/lib/vault";

export const dynamic = "force-dynamic";

/** Tick / untick a task. The client sends the file line number and the line text it saw; both must still match. */
export const POST = handle(async (req: Request) => {
  const ctx = await requireCtx();
  const { path, line, text, checked } = await req.json();
  const { note } = await getVisibleNote(ctx, path);
  if (!Number.isInteger(line) || line < 0) throw new HttpError(400, "Bad line");

  let ok = true;
  await mutateNote(ctx, note.path, (file) => {
    const { lines, eol } = splitLines(file);
    const cleanTarget = String(text || "").replace(/\r$/, "").trim();

    // 1. Direct index match
    let targetIdx = -1;
    if (lines[line] !== undefined && TASK_RE.test(lines[line]) && stripComments(lines[line]).trim() === cleanTarget) {
      targetIdx = line;
    }

    // 2. Scan file for exact match (handles line offsets caused by frontmatter)
    if (targetIdx === -1) {
      for (let i = 0; i < lines.length; i++) {
        if (TASK_RE.test(lines[i]) && stripComments(lines[i]).trim() === cleanTarget) {
          targetIdx = i;
          break;
        }
      }
    }

    // 3. Match task content body regardless of leading marker / checkbox state
    if (targetIdx === -1) {
      const targetBody = cleanTarget.replace(/^\s*[-*]\s+\[( |x|X)\]\s*/i, "").trim();
      if (targetBody) {
        for (let i = 0; i < lines.length; i++) {
          if (TASK_RE.test(lines[i])) {
            const body = stripComments(lines[i]).replace(/^\s*[-*]\s+\[( |x|X)\]\s*/i, "").trim();
            if (body === targetBody) {
              targetIdx = i;
              break;
            }
          }
        }
      }
    }

    if (targetIdx === -1) {
      ok = false;
      return file;
    }

    lines[targetIdx] = lines[targetIdx].replace(/\[( |x|X)\]/, checked ? "[x]" : "[ ]");
    return lines.join(eol);
  });
  if (!ok) throw new HttpError(409, "That line changed, reload the note and try again.", { conflict: true });
  return Response.json({ success: true });
});

/** Add a new task directly under an existing task list. */
export const PUT = handle(async (req: Request) => {
  const ctx = await requireCtx();
  const { path, afterLine, text } = await req.json();
  const { note } = await getVisibleNote(ctx, path);
  const task = cleanLine(text, 300);
  if (!task) throw new HttpError(400, "Task text is empty");
  if (!Number.isInteger(afterLine) || afterLine < 0) throw new HttpError(400, "Bad position");

  await mutateNote(ctx, note.path, (file) => {
    const { lines, eol } = splitLines(file);
    if (afterLine >= lines.length) throw new HttpError(409, "Note changed, reload and try again.", { conflict: true });
    lines.splice(afterLine + 1, 0, `- [ ] ${task}`);
    return lines.join(eol);
  });
  return Response.json({ success: true });
});
