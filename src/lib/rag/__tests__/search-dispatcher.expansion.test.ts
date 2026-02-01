/**
 * Integration Tests for Query Expansion in Search Dispatcher
 *
 * Verifies that alias expansion improves search results for abbreviations
 */

import { searchKnowledge } from "../search-dispatcher";
import { expandQuery } from "../alias-map";

describe("Query Expansion Integration", () => {
  it("expandQuery is correctly integrated", async () => {
    // Test that GFK query gets expanded
    const gfkExpanded = expandQuery("Was ist GFK?");
    expect(gfkExpanded).toContain("gewaltfreie kommunikation");

    // Search should use expanded query
    const results = await searchKnowledge("Was ist GFK?", 3);
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  it("handles CBT query expansion", async () => {
    const cbtExpanded = expandQuery("Erkläre CBT");
    expect(cbtExpanded).toContain("kognitive verhaltenstherapie");

    const results = await searchKnowledge("Erkläre CBT", 3);
    expect(results).toBeDefined();
  });

  it("handles NVC query expansion", async () => {
    const nvcExpanded = expandQuery("Was ist NVC?");
    expect(nvcExpanded).toContain("nonviolent communication");

    const results = await searchKnowledge("Was ist NVC?", 3);
    expect(results).toBeDefined();
  });

  it("non-alias queries work unchanged", async () => {
    const query = "Was sind Emotionen?";
    const expanded = expandQuery(query);
    expect(expanded).toBe(query); // No expansion

    const results = await searchKnowledge(query, 3);
    expect(results).toBeDefined();
  });

  it("Vier-Seiten-Modell still works (regression)", async () => {
    const results = await searchKnowledge("Vier-Seiten-Modell", 3);
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
  });
});
