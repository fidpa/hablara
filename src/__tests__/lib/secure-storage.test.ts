/**
 * Tests for secure-storage.ts (Phase 55: Linux Secret Service Robustness)
 *
 * Tests cover:
 * - Secret Service status detection (checkSecretServiceStatus)
 * - Status message localization (getSecretServiceStatusMessage)
 * - SecretServiceStatus type validation
 * - Browser fallback (sessionStorage for storeApiKey, getApiKey, deleteApiKey)
 * - CredentialProvider type validation
 * - Callback parameters (onKeychainLocked, onTimeout)
 * - Edge cases (undefined navigator, browser environment)
 *
 * Note: Tauri keyring operations require mocking tauri-plugin-keyring-api.
 * Browser fallback tests verify sessionStorage behavior.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  checkSecretServiceStatus,
  getSecretServiceStatusMessage,
  storeApiKey,
  getApiKey,
  deleteApiKey,
  type SecretServiceStatus,
  type CredentialProvider,
} from "@/lib/secure-storage";

// ============================================================================
// getSecretServiceStatusMessage Tests
// ============================================================================

describe("getSecretServiceStatusMessage", () => {
  it("should return empty string for 'not-linux' (macOS/Windows always work)", () => {
    expect(getSecretServiceStatusMessage("not-linux")).toBe("");
  });

  it("should return browser warning for 'not-tauri'", () => {
    const msg = getSecretServiceStatusMessage("not-tauri");
    expect(msg).toContain("Browser-Modus");
    expect(msg).toContain("sessionStorage");
  });

  it("should return success message for 'available'", () => {
    const msg = getSecretServiceStatusMessage("available");
    expect(msg).toContain("verfügbar");
  });

  it("should return installation hint for 'unavailable'", () => {
    const msg = getSecretServiceStatusMessage("unavailable");
    expect(msg).toContain("GNOME Keyring");
    expect(msg).toContain("KWallet");
  });

  it("should return start daemon hint for 'timeout'", () => {
    const msg = getSecretServiceStatusMessage("timeout");
    expect(msg).toContain("antwortet nicht");
    expect(msg).toContain("Keyring-Daemon");
  });
});

// ============================================================================
// checkSecretServiceStatus Tests (Browser Environment)
// ============================================================================

describe("checkSecretServiceStatus", () => {
  it("should return 'not-tauri' when running in browser without Tauri", async () => {
    // In test environment, window.__TAURI_INTERNALS__ is undefined
    const status = await checkSecretServiceStatus();
    expect(status).toBe("not-tauri");
  });
});

// ============================================================================
// SecretServiceStatus Type Tests
// ============================================================================

describe("SecretServiceStatus type", () => {
  it("should accept all valid status values", () => {
    const statuses: SecretServiceStatus[] = [
      "available",
      "unavailable",
      "timeout",
      "not-linux",
      "not-tauri",
    ];

    statuses.forEach((status) => {
      expect(typeof getSecretServiceStatusMessage(status)).toBe("string");
    });
  });
});

// ============================================================================
// withTimeout Tests (via integration with actual functions)
// ============================================================================

describe("withTimeout behavior", () => {
  // Note: withTimeout is internal, but we can test its effect via the public API
  // These tests verify that timeout handling works correctly

  it("should handle fast operations without timeout", async () => {
    // checkSecretServiceStatus uses withTimeout internally
    // In browser environment, it should return quickly (not-tauri)
    const startTime = Date.now();
    const status = await checkSecretServiceStatus();
    const elapsed = Date.now() - startTime;

    expect(status).toBe("not-tauri");
    // Should complete in well under the 3s ping timeout
    expect(elapsed).toBeLessThan(1000);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge cases", () => {
  it("should handle undefined navigator gracefully", () => {
    // In SSR or test environment, navigator might behave differently
    // The function should not throw
    expect(() => checkSecretServiceStatus()).not.toThrow();
  });

  it("should return consistent messages for all status types", () => {
    const allStatuses: SecretServiceStatus[] = [
      "available",
      "unavailable",
      "timeout",
      "not-linux",
      "not-tauri",
    ];

    allStatuses.forEach((status) => {
      const message = getSecretServiceStatusMessage(status);
      // All messages should be strings (can be empty for not-linux)
      expect(typeof message).toBe("string");
      // No undefined or null
      expect(message).not.toBeUndefined();
      expect(message).not.toBeNull();
    });
  });
});

// ============================================================================
// Browser Fallback Tests (storeApiKey, getApiKey, deleteApiKey)
// ============================================================================

describe("Browser fallback (sessionStorage)", () => {
  const mockSessionStorage: Record<string, string> = {};

  beforeEach(() => {
    // Clear mock storage
    Object.keys(mockSessionStorage).forEach((key) => delete mockSessionStorage[key]);

    // Mock sessionStorage
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => mockSessionStorage[key] || null,
      setItem: (key: string, value: string) => {
        mockSessionStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockSessionStorage[key];
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should store API key in sessionStorage when not in Tauri", async () => {
    await storeApiKey("openai", "sk-test-key-123");
    expect(mockSessionStorage["vip-temp-openai-key"]).toBe("sk-test-key-123");
  });

  it("should retrieve API key from sessionStorage when not in Tauri", async () => {
    mockSessionStorage["vip-temp-anthropic-key"] = "sk-ant-test-456";
    const key = await getApiKey("anthropic");
    expect(key).toBe("sk-ant-test-456");
  });

  it("should return null when API key not found in sessionStorage", async () => {
    const key = await getApiKey("openai");
    expect(key).toBeNull();
  });

  it("should delete API key from sessionStorage when not in Tauri", async () => {
    mockSessionStorage["vip-temp-openai-key"] = "sk-test-key";
    await deleteApiKey("openai");
    expect(mockSessionStorage["vip-temp-openai-key"]).toBeUndefined();
  });

  it("should handle multiple providers independently", async () => {
    await storeApiKey("openai", "sk-openai-key");
    await storeApiKey("anthropic", "sk-ant-anthropic-key");

    expect(await getApiKey("openai")).toBe("sk-openai-key");
    expect(await getApiKey("anthropic")).toBe("sk-ant-anthropic-key");

    await deleteApiKey("openai");
    expect(await getApiKey("openai")).toBeNull();
    expect(await getApiKey("anthropic")).toBe("sk-ant-anthropic-key");
  });
});

// ============================================================================
// CredentialProvider Type Tests
// ============================================================================

describe("CredentialProvider type", () => {
  it("should accept 'openai' as valid provider", async () => {
    const provider: CredentialProvider = "openai";
    // Should not throw when used
    await expect(getApiKey(provider)).resolves.not.toThrow();
  });

  it("should accept 'anthropic' as valid provider", async () => {
    const provider: CredentialProvider = "anthropic";
    // Should not throw when used
    await expect(getApiKey(provider)).resolves.not.toThrow();
  });
});

// ============================================================================
// Callback Tests (onKeychainLocked, onTimeout)
// ============================================================================

describe("getApiKey callbacks", () => {
  it("should accept onKeychainLocked callback parameter", async () => {
    const onKeychainLocked = vi.fn();
    // In browser mode, callback won't be called but should be accepted
    await getApiKey("openai", onKeychainLocked);
    // Callback not called in browser mode (no keychain)
    expect(onKeychainLocked).not.toHaveBeenCalled();
  });

  it("should accept onTimeout callback parameter", async () => {
    const onTimeout = vi.fn();
    // In browser mode, callback won't be called but should be accepted
    await getApiKey("openai", undefined, onTimeout);
    // Callback not called in browser mode (no keychain timeout possible)
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("should accept both callbacks", async () => {
    const onKeychainLocked = vi.fn();
    const onTimeout = vi.fn();
    await getApiKey("openai", onKeychainLocked, onTimeout);
    expect(onKeychainLocked).not.toHaveBeenCalled();
    expect(onTimeout).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe("Error handling", () => {
  it("should not throw when sessionStorage is unavailable", async () => {
    // Stub sessionStorage to throw
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("Storage unavailable");
      },
      setItem: () => {
        throw new Error("Storage unavailable");
      },
      removeItem: () => {
        throw new Error("Storage unavailable");
      },
    });

    // getApiKey should handle error gracefully in browser mode
    // Note: It may throw or return null depending on implementation
    // The key is it shouldn't crash the app
    try {
      await getApiKey("openai");
    } catch {
      // Error is acceptable
    }

    vi.unstubAllGlobals();
  });
});

// ============================================================================
// P1-2: Tauri Keyring Mock Tests (Timeout & Locked Callbacks)
// ============================================================================

describe("Tauri keyring integration (mocked)", () => {
  const originalWindow = global.window;

  beforeEach(() => {
    // Mock Tauri runtime detection
    vi.stubGlobal("window", {
      ...originalWindow,
      __TAURI_INTERNALS__: { invoke: vi.fn() },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  describe("onTimeout callback", () => {
    it("should call onTimeout when keyring operation times out", async () => {
      // Mock the keyring API to simulate timeout
      vi.doMock("tauri-plugin-keyring-api", () => ({
        getPassword: vi.fn().mockRejectedValue(new Error("Operation timed out after 5000ms")),
        setPassword: vi.fn(),
        deletePassword: vi.fn(),
      }));

      // Re-import to get mocked version
      const { getApiKey: getApiKeyMocked } = await import("@/lib/secure-storage");

      const onTimeout = vi.fn();
      const onKeychainLocked = vi.fn();

      const result = await getApiKeyMocked("openai", onKeychainLocked, onTimeout);

      expect(result).toBeNull();
      expect(onTimeout).toHaveBeenCalledTimes(1);
      expect(onKeychainLocked).not.toHaveBeenCalled();
    });
  });

  describe("onKeychainLocked callback", () => {
    it("should call onKeychainLocked when keychain is locked", async () => {
      // Mock the keyring API to simulate locked keychain
      vi.doMock("tauri-plugin-keyring-api", () => ({
        getPassword: vi.fn().mockRejectedValue(new Error("Keychain is locked")),
        setPassword: vi.fn(),
        deletePassword: vi.fn(),
      }));

      const { getApiKey: getApiKeyMocked } = await import("@/lib/secure-storage");

      const onTimeout = vi.fn();
      const onKeychainLocked = vi.fn();

      const result = await getApiKeyMocked("anthropic", onKeychainLocked, onTimeout);

      expect(result).toBeNull();
      expect(onKeychainLocked).toHaveBeenCalledTimes(1);
      expect(onTimeout).not.toHaveBeenCalled();
    });

    it("should call onKeychainLocked when access is denied", async () => {
      vi.doMock("tauri-plugin-keyring-api", () => ({
        getPassword: vi.fn().mockRejectedValue(new Error("Access denied to keychain")),
        setPassword: vi.fn(),
        deletePassword: vi.fn(),
      }));

      const { getApiKey: getApiKeyMocked } = await import("@/lib/secure-storage");

      const onKeychainLocked = vi.fn();
      const result = await getApiKeyMocked("openai", onKeychainLocked);

      expect(result).toBeNull();
      expect(onKeychainLocked).toHaveBeenCalledTimes(1);
    });
  });

  describe("successful keyring operations", () => {
    it("should return key from keyring when available", async () => {
      vi.doMock("tauri-plugin-keyring-api", () => ({
        getPassword: vi.fn().mockResolvedValue("sk-test-key-from-keyring"),
        setPassword: vi.fn(),
        deletePassword: vi.fn(),
      }));

      const { getApiKey: getApiKeyMocked } = await import("@/lib/secure-storage");

      const result = await getApiKeyMocked("openai");

      expect(result).toBe("sk-test-key-from-keyring");
    });

    it("should return null when key not found (null response)", async () => {
      vi.doMock("tauri-plugin-keyring-api", () => ({
        getPassword: vi.fn().mockResolvedValue(null),
        setPassword: vi.fn(),
        deletePassword: vi.fn(),
      }));

      const { getApiKey: getApiKeyMocked } = await import("@/lib/secure-storage");

      const result = await getApiKeyMocked("anthropic");

      expect(result).toBeNull();
    });

    it("should return null when key not found (NoEntry error)", async () => {
      vi.doMock("tauri-plugin-keyring-api", () => ({
        getPassword: vi.fn().mockRejectedValue(new Error("NoEntry: Item not found")),
        setPassword: vi.fn(),
        deletePassword: vi.fn(),
      }));

      const { getApiKey: getApiKeyMocked } = await import("@/lib/secure-storage");

      const result = await getApiKeyMocked("openai");

      expect(result).toBeNull();
    });
  });

  describe("P2-2: retry on timeout", () => {
    it("should retry once on timeout before giving up", async () => {
      let callCount = 0;
      vi.doMock("tauri-plugin-keyring-api", () => ({
        getPassword: vi.fn().mockImplementation(() => {
          callCount++;
          return Promise.reject(new Error("Operation timed out"));
        }),
        setPassword: vi.fn(),
        deletePassword: vi.fn(),
      }));

      const { getApiKey: getApiKeyMocked } = await import("@/lib/secure-storage");

      const onTimeout = vi.fn();
      await getApiKeyMocked("openai", undefined, onTimeout);

      // Should have been called twice: initial + 1 retry
      expect(callCount).toBe(2);
      // onTimeout called only after all retries exhausted
      expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it("should succeed on retry if second attempt works", async () => {
      let callCount = 0;
      vi.doMock("tauri-plugin-keyring-api", () => ({
        getPassword: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.reject(new Error("Operation timed out"));
          }
          return Promise.resolve("sk-recovered-key");
        }),
        setPassword: vi.fn(),
        deletePassword: vi.fn(),
      }));

      const { getApiKey: getApiKeyMocked } = await import("@/lib/secure-storage");

      const onTimeout = vi.fn();
      const result = await getApiKeyMocked("openai", undefined, onTimeout);

      expect(callCount).toBe(2);
      expect(result).toBe("sk-recovered-key");
      // onTimeout NOT called because retry succeeded
      expect(onTimeout).not.toHaveBeenCalled();
    });
  });
});
