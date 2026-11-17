import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { preprocessWikilinks } from "../markdownUtils.ts";

describe("preprocessWikilinks", () => {
  it("converts simple [[Target]] wikilinks to markdown links", () => {
    const out = preprocessWikilinks("Met [[Marta Kell]] at the docks.");
    assert.equal(out, "Met [Marta Kell](#note:Marta%20Kell) at the docks.");
  });

  it("converts aliased [[Target|Alias]] wikilinks", () => {
    const out = preprocessWikilinks("Visit [[The Withered Reach|the Reach]].");
    assert.equal(out, "Visit [the Reach](#note:The%20Withered%20Reach).");
  });

  it("strips Dataview QueryToSerialize blocks", () => {
    const input = `Header\n<!-- QueryToSerialize: LIST FROM #npc SerializedQuery -->\n<!-- SerializedQuery END -->\nBody`;
    const out = preprocessWikilinks(input);
    assert.equal(out.includes("QueryToSerialize"), false);
    assert.equal(out.includes("SerializedQuery"), false);
    assert.equal(out.includes("Body"), true);
  });
});
