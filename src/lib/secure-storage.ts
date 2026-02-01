/**
 * Secure Storage for API Keys
 *
 * OWASP CWE-522 (Insufficiently Protected Credentials):
 * Uses OS-native encrypted credential storage.
 *
 * Platform-specific encryption:
 * - macOS: Keychain (AES-256-GCM, hardware-backed if Secure Enclave available)
 * - Windows: Credential Manager (DPAPI - Data Protection API)
 * - Linux: Secret Service API (kernel-managed, typically GNOME Keyring)
 *
 * ⚠️ SECURITY WARNING - Browser Fallback:
 * sessionStorage is DEV-ONLY and UNSAFE for production!
 * - Vulnerable to XSS (any script on same origin can read)
 * - No encryption in RAM
 * - GDPR-relevant: unencrypted secrets in browser memory
 *
 * For production: Always use Tauri + OS Keychain.
 */

import { logger } from "@/lib/logger";

type CredentialProvider = "openai" | "anthropic";

/**
 * Check if running in Tauri runtime
 */
function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && !!window.__TAURI_INTERNALS__;
}

/**
 * Store API key securely in OS keychain (Tauri) or sessionStorage (browser)
 *
 * @param provider - LLM provider (openai, anthropic)
 * @param apiKey - API key to store
 */
export async function storeApiKey(
  provider: CredentialProvider,
  apiKey: string
): Promise<void> {
  if (isTauriRuntime()) {
    try {
      const { setPassword } = await import("tauri-plugin-keyring-api");
      const service = "hablara-vip";
      const account = `${provider}-api-key`;

      // setPassword is idempotent - overwrites existing key if present
      await setPassword(service, account, apiKey);
      logger.info("SecureStorage", `API key stored for ${provider} (OS Keychain)`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error("SecureStorage", `Failed to store API key for ${provider}`, error);
      } else {
        logger.error("SecureStorage", `Failed to store API key for ${provider}`, { error });
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
 * @param provider - LLM provider (openai, anthropic)
 * @param onKeychainLocked - Optional callback when keychain is locked/denied
 * @returns API key or null if not found
 */
export async function getApiKey(
  provider: CredentialProvider,
  onKeychainLocked?: () => void
): Promise<string | null> {
  if (isTauriRuntime()) {
    try {
      const { getPassword } = await import("tauri-plugin-keyring-api");
      const service = "hablara-vip";
      const account = `${provider}-api-key`;

      const key = await getPassword(service, account);
      return key;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);

      // Check for keychain lock/denial errors
      if (msg.includes("locked") || msg.includes("denied") || msg.includes("access")) {
        logger.warn("SecureStorage", `Keychain locked or access denied for ${provider}`);
        onKeychainLocked?.();
      } else {
        // Key not found (expected for first-time use)
        logger.info("SecureStorage", `No API key found for ${provider} (first-time use)`);
      }

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
      const service = "hablara-vip";
      const account = `${provider}-api-key`;

      await deletePassword(service, account);
      logger.info("SecureStorage", `API key deleted for ${provider}`);
    } catch (_error: unknown) {
      // Key doesn't exist - that's ok
      logger.info("SecureStorage", `API key not found for deletion: ${provider}`);
    }
  } else {
    // Browser fallback: sessionStorage
    sessionStorage.removeItem(`vip-temp-${provider}-key`);
  }
}
