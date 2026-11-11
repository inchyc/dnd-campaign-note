"use client";

/**
 * Persistent Client-Side Mutation Journal.
 * Stores task checkbox toggles and note status overrides in device localStorage.
 * Ensures the player's screen NEVER loses ticked quests or status changes even across
 * redeployments, serverless container recycles, or offline periods.
 */

const JOURNAL_KEY = "dnd_mutation_journal_v1";

export interface TaskMutation {
  lineIndex: number;
  checked: boolean;
  taskText?: string;
  timestamp: number;
}

export interface NoteStatusMutation {
  status: string;
  timestamp: number;
}

export interface JournalState {
  statuses: Record<string, NoteStatusMutation>; // path -> { status, timestamp }
  tasks: Record<string, Record<number, TaskMutation>>; // path -> lineIndex -> TaskMutation
}

function getStoredJournal(): JournalState {
  if (typeof window === "undefined") {
    return { statuses: {}, tasks: {} };
  }
  try {
    const raw = localStorage.getItem(JOURNAL_KEY);
    if (!raw) return { statuses: {}, tasks: {} };
    const parsed = JSON.parse(raw);
    return {
      statuses: parsed.statuses || {},
      tasks: parsed.tasks || {},
    };
  } catch (e) {
    console.warn("Failed reading mutation journal from localStorage:", e);
    return { statuses: {}, tasks: {} };
  }
}

function saveJournal(state: JournalState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Failed saving mutation journal to localStorage:", e);
  }
}

/**
 * Record a status change for a note.
 */
export function recordStatusMutation(path: string, status: string): void {
  if (!path) return;
  const journal = getStoredJournal();
  journal.statuses[path] = {
    status: status.toLowerCase().trim(),
    timestamp: Date.now(),
  };
  saveJournal(journal);
}

/**
 * Record a task checkbox toggle for a note.
 */
export function recordTaskMutation(
  path: string,
  lineIndex: number,
  checked: boolean,
  taskText?: string
): void {
  if (!path) return;
  const journal = getStoredJournal();
  if (!journal.tasks[path]) journal.tasks[path] = {};
  journal.tasks[path][lineIndex] = {
    lineIndex,
    checked,
    taskText,
    timestamp: Date.now(),
  };
  saveJournal(journal);
}

/**
 * Get the recorded status for a note, if any.
 */
export function getJournaledStatus(path: string): string | undefined {
  const journal = getStoredJournal();
  return journal.statuses[path]?.status;
}

/**
 * Applies local journal mutations to a note's markdown body (updating checkboxes).
 */
export function applyJournalToBody(path: string, body: string): string {
  if (!path || !body) return body;
  const journal = getStoredJournal();
  const noteTasks = journal.tasks[path];
  if (!noteTasks || Object.keys(noteTasks).length === 0) return body;

  const lines = body.split(/\r?\n/);
  let changed = false;

  for (const [idxStr, taskMut] of Object.entries(noteTasks)) {
    const idx = parseInt(idxStr, 10);
    if (idx >= 0 && idx < lines.length) {
      const line = lines[idx];
      const match = line.match(/^(\s*[-*]\s*\[)([ xX])(\]\s*.*)$/);
      if (match) {
        const currentChecked = match[2].toLowerCase() === "x";
        if (currentChecked !== taskMut.checked) {
          lines[idx] = `${match[1]}${taskMut.checked ? "x" : " "}${match[3]}`;
          changed = true;
        }
      }
    }
  }

  return changed ? lines.join("\n") : body;
}

/**
 * Overlays journaled statuses onto a list of notes.
 */
export function applyJournalToNotes<T extends { path: string; status?: string }>(notes: T[]): T[] {
  if (!notes || notes.length === 0) return notes;
  const journal = getStoredJournal();

  return notes.map((note): T => {
    const override = journal.statuses[note.path];
    if (override && override.status) {
      return {
        ...note,
        status: override.status,
      };
    }
    return note;
  });
}
