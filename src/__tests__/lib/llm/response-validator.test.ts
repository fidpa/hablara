import {
  extractAnthropicContent,
  extractOpenAIContent,
} from "@/lib/llm/response-validator";

describe("extractAnthropicContent", () => {
  it("should extract text from valid response", () => {
    const response = { content: [{ type: "text", text: "Hello" }] };
    expect(extractAnthropicContent(response, "test")).toBe("Hello");
  });

  it("should return empty for empty content array", () => {
    expect(extractAnthropicContent({ content: [] }, "test")).toBe("");
  });

  it("should throw on undefined response", () => {
    expect(() =>
      extractAnthropicContent(undefined as unknown, "test")
    ).toThrow(/Invalid Anthropic response.*undefined/);
  });

  it("should throw on non-array content", () => {
    expect(() =>
      extractAnthropicContent({ content: "wrong" } as unknown, "test")
    ).toThrow(/content is not array/);
  });

  it("should throw on undefined content[0] (defensive)", () => {
    expect(() =>
      extractAnthropicContent({ content: [undefined] } as unknown, "test")
    ).toThrow(/content\[0\] undefined/);
  });

  it("should return empty for non-text type", () => {
    const response = { content: [{ type: "image", data: "..." }] };
    expect(extractAnthropicContent(response as unknown, "test")).toBe("");
  });

  it("should throw on non-string text", () => {
    const response = { content: [{ type: "text", text: 123 }] };
    expect(() =>
      extractAnthropicContent(response as unknown, "test")
    ).toThrow(/text is number, expected string/);
  });
});

describe("extractOpenAIContent", () => {
  it("should extract content from valid response", () => {
    const response = { choices: [{ message: { content: "Hello" } }] };
    expect(extractOpenAIContent(response, "test")).toBe("Hello");
  });

  it("should return empty for null content", () => {
    const response = { choices: [{ message: { content: null } }] };
    expect(extractOpenAIContent(response, "test")).toBe("");
  });

  it("should return empty for empty choices", () => {
    expect(extractOpenAIContent({ choices: [] }, "test")).toBe("");
  });

  it("should throw on undefined response", () => {
    expect(() =>
      extractOpenAIContent(undefined as unknown, "test")
    ).toThrow(/Invalid OpenAI response.*undefined/);
  });

  it("should throw on non-array choices", () => {
    expect(() =>
      extractOpenAIContent({ choices: "wrong" } as unknown, "test")
    ).toThrow(/choices is not array/);
  });

  it("should throw on undefined choices[0]", () => {
    expect(() =>
      extractOpenAIContent({ choices: [undefined] } as unknown, "test")
    ).toThrow(/choices\[0\] undefined/);
  });

  it("should throw on missing message", () => {
    expect(() =>
      extractOpenAIContent({ choices: [{}] } as unknown, "test")
    ).toThrow(/message is undefined, expected object/);
  });

  it("should throw on non-string content", () => {
    const response = { choices: [{ message: { content: 123 } }] };
    expect(() =>
      extractOpenAIContent(response as unknown, "test")
    ).toThrow(/content is number, expected string or null/);
  });
});
