import test from "node:test";
import assert from "node:assert/strict";
import {
  recordStatusMutation,
  getJournaledStatus,
  applyJournalToNotes,
} from "../mutationJournal.ts";

function setupMockWindow() {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  };
  (globalThis as any).window = {};
  (globalThis as any).localStorage = mockStorage;
  return store;
}

test("journal overrides status while server mtime is older, but yields to newer server mtime", () => {
  const store = setupMockWindow();
  const path = "Notes/Investigations/The Disappearances.md";

  recordStatusMutation(path, "open");
  const raw = JSON.parse(store.get("dnd_mutation_journal_v1")!);
  const recordedAt = raw.statuses[path].timestamp;

  // Older server mtime: journal wins
  assert.equal(getJournaledStatus(path, recordedAt - 1000), "open");

  // Newer server mtime: server wins
  assert.equal(getJournaledStatus(path, recordedAt + 1000), undefined);

  const list = [
    { path, status: "resolved", mtime: recordedAt + 5000 },
    { path: "Notes/Investigations/Other.md", status: "active", mtime: recordedAt - 5000 },
  ];
  const applied = applyJournalToNotes(list);
  assert.equal(applied[0].status, "resolved");
  assert.equal(applied[1].status, "active");
});

test("journal status expires after 24 hours", () => {
  const store = setupMockWindow();
  const path = "Notes/Investigations/Old.md";
  store.set(
    "dnd_mutation_journal_v1",
    JSON.stringify({
      statuses: {
        [path]: { status: "open", timestamp: Date.now() - 25 * 60 * 60 * 1000 },
      },
      tasks: {},
    })
  );

  assert.equal(getJournaledStatus(path), undefined);
});
