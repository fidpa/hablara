/**
 * Secure Storage for API Keys
 *
 * OWASP CWE-522 (Insufficiently Protected Credentials):
 * Uses OS-native encrypted credential storage.
 *
 * Platform-specific encryption:
 * - macOS: Keychain (AES-256-GCM, hardware-backed if Secure Enclave available)
 * - Windows: Credential Manager (DPAPI - Data Protection API)
 * - Linux: Secret Service API (D-Bus, typically GNOME Keyring or KWallet)
 *
 * ⚠️ SECURITY WARNING - Browser Fallback:
 * sessionStorage is DEV-ONLY and UNSAFE for production!
 * - Vulnerable to XSS (any script on same origin can read)
 * - No encryption in RAM
 * - GDPR-relevant: unencrypted secrets in browser memory
 *
 * For production: Always use Tauri + OS Keychain.
 *
 * ⚠️ LINUX NOTE (Phase 55 + Audit 2026-02-05):
 * tauri-plugin-keyring uses sync-secret-service (D-Bus).
 * Requires GNOME Keyring, KWallet, or compatible Secret Service provider.
 * Does NOT work on minimal WMs without keyring daemon.
 *
 * Collection Behavior (Phase 55.1):
 * - Uses default Secret Service collection (typically "login")
 * - "login" collection persists across reboots (recommended)
 * - "session" collection is volatile (cleared on logout)
 * - keyring-rs v3.6.3 defaults to "login" collection for persistence
 *
 * KDE Plasma 6 (2024+):
 * - Uses ksecretd (Secret Service native implementation)
 * - Fully compatible with keyring-rs (no kwalletd wrapper needed)
 *
 * Flatpak/Snap Limitation:
 * - Direct D-Bus access (no XDG Portal Secret API in v1.0.x)
 * - May fail in sandboxed environments
 * - Graceful fallback to sessionStorage (volatile, dev-only warning shown)
 */

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export type CredentialProvider = "openai" | "anthropic";

/**
 * Secret Service availability status (Linux-specific)
 */
export type SecretServiceStatus =
  | "available"    // Secret Service is working
  | "unavailable"  // No Secret Service provider found
  | "timeout"      // Secret Service didn't respond in time
  | "not-linux"    // Not running on Linux (macOS/Windows always work)
  | "not-tauri";   // Running in browser (dev mode)

// ============================================================================
// Constants (Dynamic Values Pattern)
// ============================================================================

/**
 * Timeout for keyring store/get/delete operations in milliseconds.
 *
 * 5 seconds allows for:
 * - User keychain unlock prompts (macOS may show auth dialog)
 * - D-Bus round-trip latency on slower systems
 * - Secret Service daemon startup if not running
 *
 * Note: System D-Bus timeout is 25s, but we fail faster for better UX.
 */
const KEYRING_TIMEOUT_MS = 5000;

/**
 * Shorter timeout for Secret Service health/ping checks.
 *
 * 3 seconds is sufficient because:
 * - Ping is a simple read operation (no data to write)
 * - No user interaction expected (just checking if service responds)
 * - Faster feedback in Settings UI when checking status
 *
 * If ping fails, the full operation timeout still applies when user saves.
 */
const KEYRING_PING_TIMEOUT_MS = 3000;

/** Service name for keyring storage */
const KEYRING_SERVICE = "hablara-vip";

/**
 * Number of retry attempts for timed-out keyring operations.
 * 1 retry = 2 total attempts (initial + 1 retry).
 */
const KEYRING_RETRY_ATTEMPTS = 1;

/**
 * Delay between retry attempts in milliseconds.
 * 500ms gives D-Bus/Secret Service time to recover.
 */
const KEYRING_RETRY_DELAY_MS = 500;

// ============================================================================
// Internal Utilities
// ============================================================================

/**
 * Timeout wrapper for keyring operations.
 * D-Bus calls can hang indefinitely on misconfigured systems.
 *
 * @param operation - The async operation to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param operationName - Name for error messages
 */
async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    // Ensure timeout doesn't keep Node.js process alive
    if (typeof timeoutId === "object" && "unref" in timeoutId) {
      timeoutId.unref();
    }
  });

  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    // Clean up timeout on success or failure to prevent memory leaks
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Check if running in Tauri runtime
 * @returns true if running in Tauri desktop app
 */
function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && !!window.__TAURI_INTERNALS__;
}

/**
 * Sleep utility for retry delays
 * @param ms - milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * P2-2: Retry wrapper for operations that may timeout due to D-Bus issues.
 *
 * Retries only on timeout errors, not on other failures (locked, denied, not found).
 * This helps recover from transient D-Bus connectivity issues.
 *
 * @param operation - Function that returns the operation promise
 * @param operationName - Name for logging
 * @param retries - Number of retry attempts (default: KEYRING_RETRY_ATTEMPTS)
 */
async function withRetryOnTimeout<T>(
  operation: () => Promise<T>,
  operationName: string,
  retries: number = KEYRING_RETRY_ATTEMPTS
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    // Only retry on timeout errors
    if (retries > 0 && msg.includes("timed out")) {
      logger.info(
        "SecureStorage",
        `${operationName} timed out, retrying (${retries} attempt(s) left)`
      );
      await sleep(KEYRING_RETRY_DELAY_MS);
      return withRetryOnTimeout(operation, operationName, retries - 1);
    }

    // Non-timeout error or no retries left - propagate
    throw error;
  }
}

/**
 * Check if running on Linux platform
 * @returns true if navigator.platform indicates Linux
 */
function isLinuxPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform = navigator.platform?.toLowerCase() ?? "";
  return platform.includes("linux");
}

// ============================================================================
// Secret Service Detection (Linux)
// ============================================================================

/**
 * Check if Secret Service is available on Linux.
 *
 * On macOS/Windows, always returns "not-linux" (native keystores always work).
 * In browser, returns "not-tauri".
 *
 * Uses a test read operation with timeout to verify connectivity.
 */
export async function checkSecretServiceStatus(): Promise<SecretServiceStatus> {
  if (!isTauriRuntime()) {
    return "not-tauri";
  }

  if (!isLinuxPlatform()) {
    return "not-linux";
  }

  try {
    const { getPassword } = await import("tauri-plugin-keyring-api");

    // Try to read a non-existent key as a connectivity test
    // This will return null if Secret Service works (key not found),
    // or timeout/error if Secret Service is unavailable
    await withTimeout(
      getPassword(KEYRING_SERVICE, "__secret_service_ping__"),
      KEYRING_PING_TIMEOUT_MS,
      "Secret Service ping"
    );

    // If we get here without error, Secret Service is working
    return "available";
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    if (msg.includes("timed out")) {
      logger.warn("SecureStorage", "Secret Service timeout - may be unavailable");
      return "timeout";
    }

    // Common "not found" responses indicate Secret Service IS working
    // (the key doesn't exist, but the service responded)
    const notFoundPatterns = [
      "No matching",
      "not found",
      "NoEntry",
      "ItemNotFound",
      "no result",
    ];
    if (notFoundPatterns.some((p) => msg.toLowerCase().includes(p.toLowerCase()))) {
      return "available";
    }

    // Any other error = Secret Service likely unavailable
    logger.warn("SecureStorage", "Secret Service unavailable", { error: msg });
    return "unavailable";
  }
}

/**
 * Human-readable status message for UI (German)
 */
export function getSecretServiceStatusMessage(status: SecretServiceStatus): string {
  switch (status) {
    case "available":
      return "Secret Service verfügbar";
    case "unavailable":
      return "Kein Secret Service gefunden. Bitte GNOME Keyring oder KWallet installieren.";
    case "timeout":
      return "Secret Service antwortet nicht. Bitte Keyring-Daemon starten.";
    case "not-linux":
      return ""; // macOS/Windows always work
    case "not-tauri":
      return "Browser-Modus: API Keys nur temporär im Speicher (sessionStorage)";
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Store API key securely in OS keychain (Tauri) or sessionStorage (browser)
 *
 * @param provider - LLM provider (openai, anthropic)
 * @param apiKey - API key to store
 * @throws Error if keychain access fails or times out
 */
export async function storeApiKey(
  provider: CredentialProvider,
  apiKey: string
): Promise<void> {
  if (isTauriRuntime()) {
    try {
      const { setPassword } = await import("tauri-plugin-keyring-api");
      const account = `${provider}-api-key`;

      // setPassword is idempotent - overwrites existing key if present
      // Wrapped with timeout to prevent D-Bus hangs on Linux
      //
      // Linux Collection Note (Audit 2026-02-05):
      // keyring-rs v3.6.3 defaults to "login" collection (persistent across reboots).
      // We have no direct control over collection via plugin API, but library default is correct.
      await withTimeout(
        setPassword(KEYRING_SERVICE, account, apiKey),
        KEYRING_TIMEOUT_MS,
        `Store ${provider} API key`
      );
      logger.info("SecureStorage", `API key stored for ${provider} (OS Keychain)`, {
        service: KEYRING_SERVICE,
        account,
        platform: isLinuxPlatform() ? "linux" : "other",
        note: isLinuxPlatform() ? "Using default 'login' collection (persistent)" : undefined,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const isTimeout = msg.includes("timed out");

      logger.error("SecureStorage", `Failed to store API key for ${provider}`, {
        error: msg,
        isTimeout,
      });

      if (isTimeout) {
        throw new Error("Keychain timeout - Secret Service not responding");
      }
      throw new Error("Keychain access failed");
    }
  } else {
    // ⚠️ DEV-ONLY: Browser fallback (XSS-vulnerable, unencrypted!)
    // Production MUST use Tauri + OS Keychain
    sessionStorage.setItem(`vip-temp-${provider}-key`, apiKey);
    logger.warn(
      "SecureStorage",
      `API key in sessionStorage (dev only, volatile) for ${provider}`
    );
  }
}

/**
 * Get API key from OS keychain (Tauri) or sessionStorage (browser)
 *
 * P2-2: Includes automatic retry on timeout (1 retry after 500ms delay).
 * This helps recover from transient D-Bus connectivity issues on Linux.
 *
 * @param provider - LLM provider (openai, anthropic)
 * @param onKeychainLocked - Optional callback when keychain is locked/denied
 * @param onTimeout - Optional callback when keychain operation times out (Linux D-Bus issue)
 * @returns API key or null if not found
 */
export async function getApiKey(
  provider: CredentialProvider,
  onKeychainLocked?: () => void,
  onTimeout?: () => void
): Promise<string | null> {
  if (isTauriRuntime()) {
    try {
      const { getPassword } = await import("tauri-plugin-keyring-api");
      const account = `${provider}-api-key`;

      // P2-2: Wrapped with retry + timeout to handle transient D-Bus issues
      const key = await withRetryOnTimeout(
        () =>
          withTimeout(
            getPassword(KEYRING_SERVICE, account),
            KEYRING_TIMEOUT_MS,
            `Get ${provider} API key`
          ),
        `Get ${provider} API key`
      );

      if (key) {
        logger.info("SecureStorage", `API key retrieved for ${provider} from OS Keychain`, {
          service: KEYRING_SERVICE,
          account,
          platform: isLinuxPlatform() ? "linux" : "other",
        });
      } else {
        // This is the ideal case for a non-existent key
        logger.info("SecureStorage", `No API key found for ${provider} (null result)`, {
          service: KEYRING_SERVICE,
          account,
        });
      }
      return key;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const lowerMsg = msg.toLowerCase();

      // 1. Check for timeout (Linux D-Bus issue) - after retries exhausted
      if (lowerMsg.includes("timed out")) {
        logger.error("SecureStorage", `Keychain timeout for ${provider} (after retries)`);
        onTimeout?.();
        return null;
      }

      // 2. Check for keychain lock/denial errors
      if (lowerMsg.includes("locked") || lowerMsg.includes("denied") || lowerMsg.includes("access")) {
        logger.warn("SecureStorage", `Keychain locked or access denied for ${provider}`);
        onKeychainLocked?.();
        return null;
      }

      // 3. The underlying library may throw an error when entry is not found.
      // This is not ideal, but we must handle it gracefully.
      const notFoundPatterns = ["no matching", "not found", "noentry", "itemnotfound"];
      if (notFoundPatterns.some((p) => lowerMsg.includes(p))) {
        logger.info("SecureStorage", `No API key found for ${provider} (entry not found error)`);
        return null;
      }

      // 4. Any other error is unexpected and should be logged as a failure.
      // This prevents masking real issues like a broken D-Bus connection.
      logger.error("SecureStorage", `Failed to get API key for ${provider} due to an unexpected error.`, {
        error: msg,
      });
      return null;
    }
  }

  // ⚠️ DEV-ONLY: Browser fallback (XSS-vulnerable, unencrypted!)
  // Production MUST use Tauri + OS Keychain
  return sessionStorage.getItem(`vip-temp-${provider}-key`);
}

/**
 * Delete API key from OS keychain (Tauri) or sessionStorage (browser)
 *
 * @param provider - LLM provider (openai, anthropic)
 */
export async function deleteApiKey(provider: CredentialProvider): Promise<void> {
  if (isTauriRuntime()) {
    try {
      const { deletePassword } = await import("tauri-plugin-keyring-api");
      const account = `${provider}-api-key`;

      // Wrapped with timeout to prevent D-Bus hangs on Linux
      // Note: deletePassword returns void, throws on error
      await withTimeout(
        deletePassword(KEYRING_SERVICE, account),
        KEYRING_TIMEOUT_MS,
        `Delete ${provider} API key`
      );
      logger.info("SecureStorage", `API key deleted for ${provider}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const lowerMsg = msg.toLowerCase();

      // Deletion is best-effort, so we don't throw, but we log accurately.
      if (lowerMsg.includes("timed out")) {
        logger.error("SecureStorage", `Keychain timeout while deleting ${provider} key.`);
        return;
      }

      const notFoundPatterns = ["no matching", "not found", "noentry", "itemnotfound"];
      if (notFoundPatterns.some((p) => lowerMsg.includes(p))) {
        logger.info("SecureStorage", `No API key found for ${provider} to delete (entry not found error).`);
        return;
      }

      logger.error("SecureStorage", `Failed to delete API key for ${provider} due to an unexpected error.`, {
        error: msg,
      });
    }
  } else {
    // Browser fallback: sessionStorage
    sessionStorage.removeItem(`vip-temp-${provider}-key`);
  }
}
