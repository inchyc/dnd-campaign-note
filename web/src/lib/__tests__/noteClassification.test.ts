import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSessionNoteMarkdown,
  classifyVaultPath,
  escapeSqlLike,
  extractSessionDateFromMarkdown,
} from "../noteClassification.ts";

test("classifyVaultPath maps _Review, .hub, Session Notes, and Codex folders accurately", () => {
  assert.deepEqual(classifyVaultPath("_Review/Session_Notes_2026-11-25/00_SESSION_REVIEW.md", {}), {
    category: "review",
    subcategory: "Session_Notes_2026-11-25",
    secret: true,
    visibility: "dm",
  });

  assert.deepEqual(classifyVaultPath(".hub/scratch/2026-11-25/chris.json", {}), {
    category: "system",
    subcategory: "scratch",
    secret: true,
    visibility: "dm",
  });

  assert.deepEqual(classifyVaultPath("Notes/Session Notes/Session Notes 2026-11-25.md", {}), {
    category: "session",
    subcategory: null,
    secret: false,
    visibility: "party",
  });

  assert.deepEqual(
    classifyVaultPath("Notes/Session Notes/Session Notes 2026-11-25.md", { secret: true }),
    {
      category: "session",
      subcategory: null,
      secret: true,
      visibility: "dm",
    }
  );

  assert.deepEqual(classifyVaultPath("Notes/Factions/Faction - Vanguard.md", {}), {
    category: "lore",
    subcategory: "Factions",
    secret: false,
    visibility: "party",
  });

  assert.deepEqual(classifyVaultPath("Notes/NPCs/Secrets/Secret - Cultist.md", {}), {
    category: "npc",
    subcategory: "Secrets",
    secret: true,
    visibility: "dm",
  });

  assert.deepEqual(classifyVaultPath("Notes/PC Notes/Vex.md", { owner: "Vex" }), {
    category: "party",
    subcategory: null,
    secret: false,
    visibility: "pc",
  });

  assert.deepEqual(
    classifyVaultPath("Notes/PC Notes/Vex.md", { owner: "Vex", visible_to_party: true }),
    {
      category: "party",
      subcategory: null,
      secret: false,
      visibility: "party",
    }
  );
});

test("extractSessionDateFromMarkdown detects Obsidian session headings, frontmatter, and titles", () => {
  const obsidianPaste = `---
created: 2026-01-07T12:33
updated: 2026-11-25T20:50
campaign: The Starving Miracle
tags: session-logs 
---

# 📓 Session: 2026-11-25

## 📝 Rapid Fire Notes
Have Shadow Weasel (Wearing a collector mask)`;

  assert.equal(extractSessionDateFromMarkdown(obsidianPaste), "2026-11-25");
  assert.equal(extractSessionDateFromMarkdown("Just notes", "Session Notes 2026-11-11"), "2026-11-11");
  assert.equal(
    extractSessionDateFromMarkdown("---\nupdated: 2026-11-25T20:50\n---\nBody without heading"),
    "2026-11-25"
  );
  assert.equal(extractSessionDateFromMarkdown("No date here"), null);
});

test("buildSessionNoteMarkdown preserves Obsidian frontmatter verbatim and wraps plain text", () => {
  const fullObsidian = `---\r\ncreated: 2026-01-07T12:33\r\nupdated: 2026-11-25T20:50\r\n---\r\n\r\n# 📓 Session: 2026-11-25\r\n\r\nNotes here`;
  const preserved = buildSessionNoteMarkdown({
    sessionDate: "2026-11-25",
    campaignName: "Starving Vilgeismar",
    rawText: fullObsidian,
  });
  assert.equal(
    preserved,
    `---\ncreated: 2026-01-07T12:33\nupdated: 2026-11-25T20:50\n---\n\n# 📓 Session: 2026-11-25\n\nNotes here\n`
  );

  const wrapped = buildSessionNoteMarkdown({
    sessionDate: "2026-11-25",
    campaignName: "Starving Vilgeismar",
    rawText: "Entered the glacier.",
  });
  assert.match(wrapped, /^---\ncreated: /);
  assert.match(wrapped, /campaign: Starving Vilgeismar/);
  assert.match(wrapped, /# 📓 Session: 2026-11-25/);
  assert.match(wrapped, /Entered the glacier\./);
});

test("escapeSqlLike escapes underscore, percent, and backslash", () => {
  assert.equal(escapeSqlLike("_Review/"), "\\_Review/");
  assert.equal(escapeSqlLike("100%_test\\path"), "100\\%\\_test\\\\path");
});
