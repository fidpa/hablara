/**
 * LLM Timeout Configuration Tests
 *
 * Verifies provider-specific timeout injection from DEFAULT_LLM_TIMEOUTS constant.
 * Tests backward compatibility (optional timeoutMs parameter).
 */

import { OllamaClient } from "../providers/ollama";
import { OpenAIClient } from "../providers/openai";
import { AnthropicClient } from "../providers/anthropic";
import { DEFAULT_LLM_TIMEOUTS } from "@/lib/types";

describe("LLM Timeout Configuration", () => {
  describe("OllamaClient", () => {
    it("uses provider-specific timeout from constant", () => {
      const client = new OllamaClient({
        provider: "ollama",
        model: "qwen2.5:7b",
        timeoutMs: DEFAULT_LLM_TIMEOUTS.ollama,
      });

      expect(client["timeoutMs"]).toBe(60000); // Private field access
    });

    it("falls back to provider-specific default if no timeout provided", () => {
      const client = new OllamaClient({
        provider: "ollama",
        model: "qwen2.5:7b",
      });

      expect(client["timeoutMs"]).toBe(DEFAULT_LLM_TIMEOUTS.ollama); // 60s for Ollama
    });

    it("accepts custom timeout override", () => {
      const client = new OllamaClient({
        provider: "ollama",
        model: "qwen2.5:7b",
        timeoutMs: 90000, // Custom 90s
      });

      expect(client["timeoutMs"]).toBe(90000);
    });
  });

  describe("OpenAIClient", () => {
    it("uses provider-specific timeout", () => {
      const client = new OpenAIClient({
        provider: "openai",
        model: "gpt-4o-mini",
        timeoutMs: DEFAULT_LLM_TIMEOUTS.openai,
      });

      expect(client["timeoutMs"]).toBe(30000);
    });

    it("falls back to provider-specific default if no timeout provided", () => {
      const client = new OpenAIClient({
        provider: "openai",
        model: "gpt-4o-mini",
      });

      expect(client["timeoutMs"]).toBe(DEFAULT_LLM_TIMEOUTS.openai); // 30s for OpenAI
    });
  });

  describe("AnthropicClient", () => {
    it("uses provider-specific timeout", () => {
      const client = new AnthropicClient({
        provider: "anthropic",
        model: "claude-sonnet-4",
        timeoutMs: DEFAULT_LLM_TIMEOUTS.anthropic,
      });

      expect(client["timeoutMs"]).toBe(30000);
    });

    it("falls back to provider-specific default if no timeout provided", () => {
      const client = new AnthropicClient({
        provider: "anthropic",
        model: "claude-sonnet-4",
      });

      expect(client["timeoutMs"]).toBe(DEFAULT_LLM_TIMEOUTS.anthropic); // 30s for Anthropic
    });
  });

  describe("DEFAULT_LLM_TIMEOUTS constant", () => {
    it("defines 60s for Ollama (local inference)", () => {
      expect(DEFAULT_LLM_TIMEOUTS.ollama).toBe(60000);
    });

    it("defines 30s for OpenAI (cloud API)", () => {
      expect(DEFAULT_LLM_TIMEOUTS.openai).toBe(30000);
    });

    it("defines 30s for Anthropic (cloud API)", () => {
      expect(DEFAULT_LLM_TIMEOUTS.anthropic).toBe(30000);
    });
  });
});
