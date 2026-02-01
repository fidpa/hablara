import { renderHook, waitFor } from "@testing-library/react";
import { vi, beforeEach, describe, it, expect } from "vitest";
import { useLLMProviderStatus } from "../useLLMProviderStatus";
import type { LLMConfig } from "@/lib/types";

// Mock dependencies
vi.mock("@/lib/secure-storage");
vi.mock("@/lib/llm");
vi.mock("@/lib/logger");

import { getApiKey } from "@/lib/secure-storage";
import { getLLMClient } from "@/lib/llm";

describe("useLLMProviderStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Cloud Providers (OpenAI/Anthropic)", () => {
    describe("OpenAI", () => {
      it("should return 'online' for OpenAI with valid API key", async () => {
        // Mock API key exists
        vi.mocked(getApiKey).mockResolvedValueOnce("sk-test-key");

        // Mock client available
        vi.mocked(getLLMClient).mockReturnValueOnce({
          isAvailable: vi.fn().mockResolvedValueOnce(true),
        } as never);

        const config: LLMConfig = {
          provider: "openai",
          model: "gpt-4o-mini",
          baseUrl: "",
        };

        const { result } = renderHook(() => useLLMProviderStatus(config));

        // Initially "checking"
        expect(result.current.status).toBe("checking");

        // Wait for async check to complete
        await waitFor(() => {
          expect(result.current.status).toBe("online");
        });

        expect(result.current.errorMessage).toBeNull();
      });

      it("should return 'no-key' for OpenAI without API key", async () => {
        // Mock no API key
        vi.mocked(getApiKey).mockResolvedValueOnce(null);

        const config: LLMConfig = {
          provider: "openai",
          model: "gpt-4o-mini",
          baseUrl: "",
        };

        const { result } = renderHook(() => useLLMProviderStatus(config));

        await waitFor(() => {
          expect(result.current.status).toBe("no-key");
        });

        expect(result.current.errorMessage).toContain("API Key");
        expect(result.current.errorMessage).toContain("openai");
      });

      it("should return 'offline' if OpenAI API key valid but service unreachable", async () => {
        // Mock API key exists
        vi.mocked(getApiKey).mockResolvedValueOnce("sk-test-key");

        // Mock client unavailable
        vi.mocked(getLLMClient).mockReturnValueOnce({
          isAvailable: vi.fn().mockResolvedValueOnce(false),
        } as never);

        const config: LLMConfig = {
          provider: "openai",
          model: "gpt-4o-mini",
          baseUrl: "",
        };

        const { result } = renderHook(() => useLLMProviderStatus(config));

        await waitFor(() => {
          expect(result.current.status).toBe("offline");
        });

        expect(result.current.errorMessage).toContain("nicht erreichbar");
      });
    });

    describe("Anthropic", () => {
      it("should return 'online' for Anthropic with valid API key", async () => {
        // Mock API key exists
        vi.mocked(getApiKey).mockResolvedValueOnce("sk-ant-test-key");

        // Mock client available
        vi.mocked(getLLMClient).mockReturnValueOnce({
          isAvailable: vi.fn().mockResolvedValueOnce(true),
        } as never);

        const config: LLMConfig = {
          provider: "anthropic",
          model: "claude-sonnet-4",
          baseUrl: "",
        };

        const { result } = renderHook(() => useLLMProviderStatus(config));

        await waitFor(() => {
          expect(result.current.status).toBe("online");
        });

        expect(result.current.errorMessage).toBeNull();
      });

      it("should return 'no-key' for Anthropic without API key", async () => {
        // Mock no API key
        vi.mocked(getApiKey).mockResolvedValueOnce(null);

        const config: LLMConfig = {
          provider: "anthropic",
          model: "claude-sonnet-4",
          baseUrl: "",
        };

        const { result } = renderHook(() => useLLMProviderStatus(config));

        await waitFor(() => {
          expect(result.current.status).toBe("no-key");
        });

        expect(result.current.errorMessage).toContain("API Key");
        expect(result.current.errorMessage).toContain("anthropic");
      });
    });
  });

  describe("Ollama Provider", () => {
    it("should return 'online' for Ollama with model installed", async () => {
      // Mock Ollama client with verifyModelStatus
      vi.mocked(getLLMClient).mockReturnValueOnce({
        isAvailable: vi.fn().mockResolvedValueOnce(true),
        verifyModelStatus: vi.fn().mockResolvedValueOnce({
          available: true,
          modelExists: true,
        }),
      } as never);

      const config: LLMConfig = {
        provider: "ollama",
        model: "qwen2.5:7b",
        baseUrl: "http://localhost:11434",
      };

      const { result } = renderHook(() => useLLMProviderStatus(config));

      await waitFor(() => {
        expect(result.current.status).toBe("online");
      });

      expect(result.current.errorMessage).toBeNull();
    });

    it("should return 'model-missing' for Ollama with model not installed", async () => {
      // Mock Ollama client - server available but model missing
      vi.mocked(getLLMClient).mockReturnValueOnce({
        isAvailable: vi.fn().mockResolvedValueOnce(true),
        verifyModelStatus: vi.fn().mockResolvedValueOnce({
          available: true,
          modelExists: false,
        }),
      } as never);

      const config: LLMConfig = {
        provider: "ollama",
        model: "qwen2.5:7b",
        baseUrl: "http://localhost:11434",
      };

      const { result } = renderHook(() => useLLMProviderStatus(config));

      await waitFor(() => {
        expect(result.current.status).toBe("model-missing");
      });

      expect(result.current.errorMessage).toContain("Modell");
      expect(result.current.errorMessage).toContain("qwen2.5:7b");
    });

    it("should return 'offline' for Ollama when service unreachable", async () => {
      // Mock Ollama client - server unavailable
      vi.mocked(getLLMClient).mockReturnValueOnce({
        isAvailable: vi.fn().mockResolvedValueOnce(true),
        verifyModelStatus: vi.fn().mockResolvedValueOnce({
          available: false,
          modelExists: false,
        }),
      } as never);

      const config: LLMConfig = {
        provider: "ollama",
        model: "qwen2.5:7b",
        baseUrl: "http://localhost:11434",
      };

      const { result } = renderHook(() => useLLMProviderStatus(config));

      await waitFor(() => {
        expect(result.current.status).toBe("offline");
      });

      expect(result.current.errorMessage).toContain("nicht erreichbar");
    });
  });

  describe("Error Handling", () => {
    it("should return 'offline' when getApiKey throws error", async () => {
      // Mock getApiKey failure
      vi.mocked(getApiKey).mockRejectedValueOnce(new Error("Keychain access denied"));

      const config: LLMConfig = {
        provider: "openai",
        model: "gpt-4o-mini",
        baseUrl: "",
      };

      const { result } = renderHook(() => useLLMProviderStatus(config));

      await waitFor(() => {
        expect(result.current.status).toBe("offline");
      });

      expect(result.current.errorMessage).toContain("Keychain access denied");
    });

    it("should return 'offline' when client.isAvailable throws error", async () => {
      // Mock API key exists
      vi.mocked(getApiKey).mockResolvedValueOnce("sk-test-key");

      // Mock client throws error
      vi.mocked(getLLMClient).mockReturnValueOnce({
        isAvailable: vi.fn().mockRejectedValueOnce(new Error("Network timeout")),
      } as never);

      const config: LLMConfig = {
        provider: "openai",
        model: "gpt-4o-mini",
        baseUrl: "",
      };

      const { result } = renderHook(() => useLLMProviderStatus(config));

      await waitFor(() => {
        expect(result.current.status).toBe("offline");
      });

      expect(result.current.errorMessage).toContain("Network timeout");
    });

    it("should return 'offline' when Ollama verifyModelStatus throws error", async () => {
      // Mock Ollama client throws
      vi.mocked(getLLMClient).mockReturnValueOnce({
        isAvailable: vi.fn().mockResolvedValueOnce(true),
        verifyModelStatus: vi.fn().mockRejectedValueOnce(new Error("Connection refused")),
      } as never);

      const config: LLMConfig = {
        provider: "ollama",
        model: "qwen2.5:7b",
        baseUrl: "http://localhost:11434",
      };

      const { result } = renderHook(() => useLLMProviderStatus(config));

      await waitFor(() => {
        expect(result.current.status).toBe("offline");
      });

      expect(result.current.errorMessage).toContain("Connection refused");
    });
  });

  describe("Race Condition Prevention", () => {
    it("should not update state if provider changes during async check", async () => {
      // Setup mocks to respond for multiple calls
      vi.mocked(getApiKey).mockResolvedValue("sk-test-key");
      vi.mocked(getLLMClient).mockReturnValue({
        isAvailable: vi.fn().mockResolvedValue(true),
      } as never);

      const { result, rerender } = renderHook(
        ({ config }: { config: LLMConfig }) => useLLMProviderStatus(config),
        {
          initialProps: {
            config: { provider: "openai", model: "gpt-4o-mini", baseUrl: "" } as LLMConfig,
          },
        }
      );

      // Status should initially be "checking"
      expect(result.current.status).toBe("checking");

      // Immediately change to Anthropic (triggers new check via useCallback dependency)
      rerender({
        config: { provider: "anthropic", model: "claude-sonnet-4", baseUrl: "" } as LLMConfig,
      });

      // Wait for checks to complete
      await waitFor(() => {
        expect(result.current.status).toBe("online");
      });

      // Status should reflect latest provider state
      expect(result.current.errorMessage).toBeNull();

      // Verify API key was fetched (at least once, possibly for both providers)
      expect(vi.mocked(getApiKey)).toHaveBeenCalled();
    });

    it("should prevent concurrent checks with checkingRef guard", async () => {
      let resolveCheck: ((value: boolean) => void) | null = null;
      const slowCheck = new Promise<boolean>((resolve) => {
        resolveCheck = resolve;
      });

      vi.mocked(getApiKey).mockResolvedValue("sk-test-key");
      vi.mocked(getLLMClient).mockReturnValue({
        isAvailable: vi.fn().mockReturnValue(slowCheck),
      } as never);

      const config: LLMConfig = {
        provider: "openai",
        model: "gpt-4o-mini",
        baseUrl: "",
      };

      const { result } = renderHook(() => useLLMProviderStatus(config));

      // Trigger manual recheck while first check is pending
      await result.current.recheck();

      // Verify isAvailable was called only once (concurrent guard worked)
      const mockClient = vi.mocked(getLLMClient).mock.results[0]?.value as {
        isAvailable: ReturnType<typeof vi.fn>;
      };
      expect(mockClient.isAvailable).toHaveBeenCalledTimes(1);

      // Resolve the slow check
      resolveCheck?.(true);

      await waitFor(() => {
        expect(result.current.status).toBe("online");
      });
    });
  });

  describe("Recheck Function", () => {
    it("should re-run status check when recheck is called", async () => {
      // First check: offline
      vi.mocked(getApiKey).mockResolvedValueOnce("sk-test-key");
      vi.mocked(getLLMClient).mockReturnValueOnce({
        isAvailable: vi.fn().mockResolvedValueOnce(false),
      } as never);

      const config: LLMConfig = {
        provider: "openai",
        model: "gpt-4o-mini",
        baseUrl: "",
      };

      const { result } = renderHook(() => useLLMProviderStatus(config));

      await waitFor(() => {
        expect(result.current.status).toBe("offline");
      });

      // Setup second check: online
      vi.mocked(getApiKey).mockResolvedValueOnce("sk-test-key");
      vi.mocked(getLLMClient).mockReturnValueOnce({
        isAvailable: vi.fn().mockResolvedValueOnce(true),
      } as never);

      // Call recheck
      await result.current.recheck();

      await waitFor(() => {
        expect(result.current.status).toBe("online");
      });

      expect(result.current.errorMessage).toBeNull();
    });
  });

  describe("Enabled Flag", () => {
    it("should not run check when enabled is false", async () => {
      const config: LLMConfig = {
        provider: "openai",
        model: "gpt-4o-mini",
        baseUrl: "",
      };

      const { result } = renderHook(() => useLLMProviderStatus(config, false));

      // Should stay in "checking" state
      expect(result.current.status).toBe("checking");
      expect(vi.mocked(getApiKey)).not.toHaveBeenCalled();
    });

    it("should run check when enabled changes from false to true", async () => {
      vi.mocked(getApiKey).mockResolvedValue("sk-test-key");
      vi.mocked(getLLMClient).mockReturnValue({
        isAvailable: vi.fn().mockResolvedValue(true),
      } as never);

      const config: LLMConfig = {
        provider: "openai",
        model: "gpt-4o-mini",
        baseUrl: "",
      };

      const { result, rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) => useLLMProviderStatus(config, enabled),
        { initialProps: { enabled: false } }
      );

      expect(result.current.status).toBe("checking");
      expect(vi.mocked(getApiKey)).not.toHaveBeenCalled();

      // Enable the check
      rerender({ enabled: true });

      await waitFor(() => {
        expect(result.current.status).toBe("online");
      });

      expect(vi.mocked(getApiKey)).toHaveBeenCalledWith("openai");
    });
  });
});
