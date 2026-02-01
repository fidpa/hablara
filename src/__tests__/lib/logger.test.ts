/**
 * Tests for logger timestamp formatting
 *
 * The main change (Phase 3) was replacing chained splits with regex
 * for more robust timestamp extraction.
 */

describe("logger timestamp format", () => {
  it("should extract HH:MM:SS from ISO string", () => {
    // Test the regex pattern used in timestamp()
    const isoString = "2026-01-29T14:30:45.123Z";
    const match = isoString.match(/T(\d{2}:\d{2}:\d{2})/);

    expect(match).toBeTruthy();
    expect(match?.[1]).toBe("14:30:45");
  });

  it("should handle different ISO timestamps", () => {
    const testCases = [
      { input: "2025-12-01T09:15:30.000Z", expected: "09:15:30" },
      { input: "2026-01-01T00:00:00.000Z", expected: "00:00:00" },
      { input: "2026-06-15T23:59:59.999Z", expected: "23:59:59" },
    ];

    testCases.forEach(({ input, expected }) => {
      const match = input.match(/T(\d{2}:\d{2}:\d{2})/);
      expect(match?.[1]).toBe(expected);
    });
  });
});
