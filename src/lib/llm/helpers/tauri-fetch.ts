/**
 * Tauri HTTP Plugin Fetch Helper
 *
 * Provides a CORS-safe fetch function that uses the Tauri HTTP plugin
 * when running in a Tauri desktop environment. Falls back to native
 * fetch() in browser/SSR contexts.
 *
 * WHY: WebView2 (Windows) enforces strict CORS policies. Requests from
 * http://tauri.localhost to external APIs (OpenAI, Anthropic) or even
 * http://localhost:11434 (Ollama) are blocked by CORS preflight failures.
 * The Tauri HTTP plugin routes requests through the Rust backend,
 * completely bypassing WebView CORS enforcement.
 *
 * macOS WebKit is lenient with custom protocol origins, which is why
 * native fetch() works there but fails on Windows.
 */

import { logger } from "../../logger";

// Tauri fetch lazy-loaded to avoid SSR issues
let tauriFetchPromise: Promise<typeof fetch | null> | null = null;

/**
 * Get Tauri fetch function (lazy-loaded)
 * Returns null in non-Tauri environment (browser, SSR)
 */
export async function getTauriFetch(): Promise<typeof fetch | null> {
  // SSR guard
  if (typeof window === "undefined") {
    return null;
  }

  // Check for Tauri environment
  const hasTauri = "__TAURI_INTERNALS__" in window;

  if (!hasTauri) {
    return null;
  }

  // Lazy load the plugin (reset on failure to allow retry)
  if (!tauriFetchPromise) {
    tauriFetchPromise = import("@tauri-apps/plugin-http")
      .then((m) => {
        logger.info("TauriFetch", "Tauri HTTP plugin loaded successfully");
        return m.fetch;
      })
      .catch((err) => {
        logger.error("TauriFetch", "Failed to load Tauri HTTP plugin", err);
        // Reset promise to allow retry on next call
        tauriFetchPromise = null;
        return null;
      });
  }

  return tauriFetchPromise;
}

/**
 * CORS-safe fetch that prefers Tauri HTTP plugin over native fetch.
 *
 * Priority:
 * 1. Tauri HTTP plugin (bypasses CORS entirely - works on all platforms)
 * 2. Native fetch (fallback for browser/dev mode)
 *
 * If the Tauri plugin rejects the URL (scope mismatch), the error is logged
 * with the URL for debugging and re-thrown. This catches misconfigured
 * capability URL patterns (e.g., missing port wildcard).
 *
 * @param url - Request URL
 * @param init - Standard RequestInit options
 * @param callerName - Caller identifier for logging
 * @returns Response from either Tauri plugin or native fetch
 */
export async function corsSafeFetch(
  url: string,
  init: RequestInit,
  callerName: string
): Promise<Response> {
  const tauriFetch = await getTauriFetch();

  if (tauriFetch) {
    logger.debug(callerName, "Using Tauri HTTP plugin for request");
    try {
      return await tauriFetch(url, init);
    } catch (error: unknown) {
      // Log plugin errors with URL for easier debugging (skip abort - expected)
      if (error instanceof Error && error.name !== "AbortError") {
        logger.error(callerName, `Tauri HTTP plugin error for URL: ${url}`, error);
      }
      throw error;
    }
  }

  // Browser/dev fallback
  logger.debug(callerName, "Using native fetch (non-Tauri environment)");
  return fetch(url, init);
}
