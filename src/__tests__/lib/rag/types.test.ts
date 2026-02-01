import {
  isKnowledgeCategory,
  assertKnowledgeCategory,
  type KnowledgeCategory,
} from "@/lib/rag/types";

describe("isKnowledgeCategory", () => {
  it("should return true for valid categories", () => {
    const valid: KnowledgeCategory[] = [
      "emotion", "fallacy", "tone", "gfk",
      "cognitive_distortion", "four_sides", "topic", "general",
    ];
    valid.forEach((cat) => expect(isKnowledgeCategory(cat)).toBe(true));
  });

  it("should return false for invalid strings", () => {
    expect(isKnowledgeCategory("invalid")).toBe(false);
    expect(isKnowledgeCategory("")).toBe(false);
  });

  it("should return false for non-strings", () => {
    expect(isKnowledgeCategory(123)).toBe(false);
    expect(isKnowledgeCategory(null)).toBe(false);
    expect(isKnowledgeCategory(undefined)).toBe(false);
  });
});

describe("assertKnowledgeCategory", () => {
  it("should return valid category unchanged", () => {
    expect(assertKnowledgeCategory("emotion", "test")).toBe("emotion");
  });

  it("should throw descriptive error for invalid", () => {
    expect(() => assertKnowledgeCategory("bad", "test")).toThrow(
      /Invalid knowledge category.*bad.*Expected/
    );
  });

  it("should include context in error", () => {
    expect(() => assertKnowledgeCategory("bad", "hybrid-search")).toThrow(
      /\[hybrid-search\]/
    );
  });
});
