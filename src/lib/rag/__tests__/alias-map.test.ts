/**
 * Tests for RAG Query Alias Expansion
 */

import { expandQuery, QUERY_ALIASES } from "../alias-map";

describe("expandQuery", () => {
  it("expands GFK to Gewaltfreie Kommunikation", () => {
    const result = expandQuery("Was ist GFK?");
    expect(result).toContain("gewaltfreie kommunikation");
    expect(result).toContain("Was ist GFK?"); // Original preserved
  });

  it("expands CBT to full terms", () => {
    const result = expandQuery("Erkläre CBT");
    expect(result).toContain("kognitive verhaltenstherapie");
    expect(result).toContain("cognitive behavioral therapy");
  });

  it("expands NVC to Gewaltfreie Kommunikation", () => {
    const result = expandQuery("Was ist NVC?");
    expect(result).toContain("nonviolent communication");
    expect(result).toContain("gewaltfreie kommunikation");
  });

  it("handles multiple aliases in one query", () => {
    const result = expandQuery("GFK und CBT");
    expect(result).toContain("gewaltfreie kommunikation");
    expect(result).toContain("kognitive verhaltenstherapie");
  });

  it("returns original query if no aliases found", () => {
    const result = expandQuery("Was sind Emotionen?");
    expect(result).toBe("Was sind Emotionen?");
  });

  it("is case-insensitive", () => {
    expect(expandQuery("gfk")).toContain("gewaltfreie kommunikation");
    expect(expandQuery("GFK")).toContain("gewaltfreie kommunikation");
    expect(expandQuery("Gfk")).toContain("gewaltfreie kommunikation");
  });

  it("handles punctuation in queries", () => {
    expect(expandQuery("GFK?")).toContain("gewaltfreie kommunikation");
    expect(expandQuery("Was ist GFK!")).toContain("gewaltfreie kommunikation");
    expect(expandQuery("CBT.")).toContain("kognitive verhaltenstherapie");
  });

  it("expands Vier-Seiten-Modell aliases", () => {
    const result = expandQuery("Was ist das Kommunikationsquadrat?");
    expect(result).toContain("vier-seiten-modell");
    expect(result).toContain("schulz von thun");
  });

  it("expands VAD to full term", () => {
    const result = expandQuery("Erkläre VAD");
    expect(result).toContain("valence arousal dominance");
  });

  it("preserves whitespace structure", () => {
    const result = expandQuery("Was ist GFK und warum?");
    expect(result).toContain("Was ist GFK und warum?");
  });

  it("handles empty query", () => {
    expect(expandQuery("")).toBe("");
  });

  it("handles single-word query with alias", () => {
    const result = expandQuery("GFK");
    expect(result).toContain("GFK");
    expect(result).toContain("gewaltfreie kommunikation");
  });
});

describe("QUERY_ALIASES", () => {
  it("has no duplicate keys", () => {
    const keys = Object.keys(QUERY_ALIASES);
    const uniqueKeys = new Set(keys);
    expect(keys.length).toBe(uniqueKeys.size);
  });

  it("all values are non-empty arrays", () => {
    Object.values(QUERY_ALIASES).forEach((aliases) => {
      expect(Array.isArray(aliases)).toBe(true);
      expect(aliases.length).toBeGreaterThan(0);
    });
  });

  it("all expansion strings are lowercase", () => {
    Object.values(QUERY_ALIASES).forEach((aliases) => {
      aliases.forEach((alias) => {
        expect(alias).toBe(alias.toLowerCase());
      });
    });
  });
});
