import test from "node:test";
import assert from "node:assert/strict";
import { normalizeQuestStatus } from "../questStatus.ts";

test("normalizes legacy and canonical quest statuses", () => {
  assert.equal(normalizeQuestStatus("Completed"), "resolved");
  assert.equal(normalizeQuestStatus("done"), "resolved");
  assert.equal(normalizeQuestStatus("resolved"), "resolved");
  assert.equal(normalizeQuestStatus("Active"), "active");
  assert.equal(normalizeQuestStatus("archived"), "archived");
  assert.equal(normalizeQuestStatus("open"), "open");
  assert.equal(normalizeQuestStatus(undefined), "open");
});
