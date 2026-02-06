/**
 * Tests for Tauri HTTP Plugin Fetch Helper
 *
 * Validates corsSafeFetch() behavior:
 * - Prefers Tauri HTTP plugin when available
 * - Falls back to native fetch in non-Tauri env
 * - Logs plugin errors with URL (not AbortError)
 * - Handles plugin load failures gracefully
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock logger before importing module
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { logger } from "@/lib/logger";

const mockLogger = vi.mocked(logger);

// We need to control the module state between tests
// Use dynamic import + module reset to avoid stale singleton
async function freshImport() {
  // Reset module registry so tauriFetchPromise resets to null
  vi.resetModules();

  // Re-mock logger after reset
  vi.doMock("@/lib/logger", () => ({
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  }));

  const mod = await import("@/lib/llm/helpers/tauri-fetch");
  const loggerMod = await import("@/lib/logger");
  return { ...mod, logger: vi.mocked(loggerMod.logger) };
}

describe("tauri-fetch", () => {
  const originalWindow = globalThis.window;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetAllMocks();
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    // Restore window state
    if (!originalWindow) {
      // @ts-expect-error -- test cleanup
      delete globalThis.window;
    }
  });

  describe("corsSafeFetch - non-Tauri environment", () => {
    it("should fall back to native fetch when __TAURI_INTERNALS__ is absent", async () => {
      const { corsSafeFetch, logger: log } = await freshImport();

      // Ensure window exists but without Tauri
      // @ts-expect-error -- test setup
      globalThis.window = {};

      const mockResponse = new Response("ok", { status: 200 });
      fetchSpy.mockResolvedValueOnce(mockResponse);

      const result = await corsSafeFetch(
        "http://localhost:11434/api/tags",
        { method: "GET" },
        "TestCaller"
      );

      expect(result).toBe(mockResponse);
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:11434/api/tags",
        { method: "GET" }
      );
      expect(log.debug).toHaveBeenCalledWith(
        "TestCaller",
        "Using native fetch (non-Tauri environment)"
      );
    });

    it("should fall back to native fetch in SSR (no window)", async () => {
      const { corsSafeFetch } = await freshImport();

      // Simulate SSR: window is undefined
      // @ts-expect-error -- test setup
      const savedWindow = globalThis.window;
      // @ts-expect-error -- test setup
      delete globalThis.window;

      const mockResponse = new Response("ok");
      fetchSpy.mockResolvedValueOnce(mockResponse);

      const result = await corsSafeFetch(
        "https://api.openai.com/v1/models",
        { method: "GET" },
        "TestCaller"
      );

      expect(result).toBe(mockResponse);
      expect(fetchSpy).toHaveBeenCalled();

      // Restore
      globalThis.window = savedWindow;
    });
  });

  describe("corsSafeFetch - Tauri environment", () => {
    it("should use Tauri plugin when available", async () => {
      const mockTauriFetch = vi.fn().mockResolvedValue(
        new Response("tauri-ok", { status: 200 })
      );

      // Mock the dynamic import
      vi.doMock("@tauri-apps/plugin-http", () => ({
        fetch: mockTauriFetch,
      }));

      const { corsSafeFetch } = await freshImport();

      // Simulate Tauri env
      // @ts-expect-error -- test setup
      globalThis.window = { __TAURI_INTERNALS__: {} };

      const result = await corsSafeFetch(
        "http://localhost:11434/api/generate",
        { method: "POST", body: "{}" },
        "OllamaClient"
      );

      expect(result.status).toBe(200);
      expect(mockTauriFetch).toHaveBeenCalledWith(
        "http://localhost:11434/api/generate",
        { method: "POST", body: "{}" }
      );
      // Native fetch should NOT be called
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("should log non-abort plugin errors with URL", async () => {
      const scopeError = new Error("url not allowed on the configured scope");

      const mockTauriFetch = vi.fn().mockRejectedValue(scopeError);

      vi.doMock("@tauri-apps/plugin-http", () => ({
        fetch: mockTauriFetch,
      }));

      const { corsSafeFetch, logger: log } = await freshImport();

      // @ts-expect-error -- test setup
      globalThis.window = { __TAURI_INTERNALS__: {} };

      await expect(
        corsSafeFetch(
          "http://localhost:11434/api/tags",
          { method: "GET" },
          "OllamaClient"
        )
      ).rejects.toThrow("url not allowed on the configured scope");

      expect(log.error).toHaveBeenCalledWith(
        "OllamaClient",
        "Tauri HTTP plugin error for URL: http://localhost:11434/api/tags",
        scopeError
      );
    });

    it("should NOT log AbortError (expected cancellation)", async () => {
      const abortError = new DOMException("The operation was aborted", "AbortError");

      const mockTauriFetch = vi.fn().mockRejectedValue(abortError);

      vi.doMock("@tauri-apps/plugin-http", () => ({
        fetch: mockTauriFetch,
      }));

      const { corsSafeFetch, logger: log } = await freshImport();

      // @ts-expect-error -- test setup
      globalThis.window = { __TAURI_INTERNALS__: {} };

      await expect(
        corsSafeFetch(
          "http://localhost:11434/api/generate",
          { method: "POST" },
          "OllamaClient"
        )
      ).rejects.toThrow();

      // AbortError should NOT be logged
      expect(log.error).not.toHaveBeenCalled();
    });

    it("should re-throw plugin errors (not swallow them)", async () => {
      const networkError = new Error("network error");

      const mockTauriFetch = vi.fn().mockRejectedValue(networkError);

      vi.doMock("@tauri-apps/plugin-http", () => ({
        fetch: mockTauriFetch,
      }));

      const { corsSafeFetch } = await freshImport();

      // @ts-expect-error -- test setup
      globalThis.window = { __TAURI_INTERNALS__: {} };

      await expect(
        corsSafeFetch(
          "https://api.openai.com/v1/models",
          { method: "GET" },
          "OpenAIClient"
        )
      ).rejects.toThrow("network error");
    });
  });

  describe("getTauriFetch - plugin load failure", () => {
    it("should return null when plugin import fails", async () => {
      vi.doMock("@tauri-apps/plugin-http", () => {
        throw new Error("Module not found");
      });

      const { getTauriFetch } = await freshImport();

      // @ts-expect-error -- test setup
      globalThis.window = { __TAURI_INTERNALS__: {} };

      const result = await getTauriFetch();
      expect(result).toBeNull();
    });
  });
});
