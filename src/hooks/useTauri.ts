"use client";

/**
 * useTauri - Tauri 2.0 Runtime Detection & Wrapper
 *
 * Detektiert Tauri via __TAURI_INTERNALS__, bietet invoke/listen/registerHotkey Wrapper.
 * SSR-safe (hydration mismatch prevention), Fallback-Ready für Browser-Development.
 * Zentrale Abstraktion für alle Tauri Commands.
 */

import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";
import { TAURI_FOCUS_TIMINGS } from "@/lib/types";

// Tauri 2.0 detection - check for __TAURI_INTERNALS__
declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

interface UseTauriReturn {
  isTauri: boolean;
  isReady: boolean;
  invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T | null>;
  listen: <T>(event: string, handler: (payload: T) => void) => Promise<(() => void) | null>;
  registerHotkey: (shortcut: string, handler: () => void) => Promise<(() => Promise<void>) | null>;
  bringToFront: () => Promise<boolean>;
}

export function useTauri(): UseTauriReturn {
  // Initialize to false to match SSR (prevents hydration mismatch)
  const [isTauri, setIsTauri] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Only run once on mount
    const hasTauri = typeof window !== "undefined" && !!window.__TAURI_INTERNALS__;

    // Log only once globally to avoid spam from multiple components
    if (process.env.NODE_ENV === "development" && !(window as { __TAURI_LOGGED__?: boolean }).__TAURI_LOGGED__) {
      logger.info('useTauri', `Runtime detected: ${hasTauri ? 'Tauri Desktop ✓' : 'Web (Development Fallback)'}`);
      (window as { __TAURI_LOGGED__?: boolean }).__TAURI_LOGGED__ = true;
    }

    setIsTauri(hasTauri);
    setIsReady(true);
  }, []); // Empty deps - only run once

  const invoke = useCallback(async <T,>(cmd: string, args?: Record<string, unknown>): Promise<T | null> => {
    if (!isTauri) {
      logger.warn('useTauri', `Tauri not available, cannot invoke: ${cmd}`);
      return null;
    }
    try {
      const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
      return await tauriInvoke<T>(cmd, args);
    } catch (error: unknown) {
      logger.error('useTauri', `Tauri invoke error (${cmd})`, error);
      throw error;
    }
  }, [isTauri]);

  const listen = useCallback(async <T,>(
    event: string,
    handler: (payload: T) => void
  ): Promise<(() => void) | null> => {
    if (!isTauri) {
      logger.warn('useTauri', `Tauri not available, cannot listen: ${event}`);
      return null;
    }
    try {
      const { listen: tauriListen } = await import("@tauri-apps/api/event");
      return await tauriListen<T>(event, (e) => handler(e.payload));
    } catch (error: unknown) {
      logger.error('useTauri', `Tauri listen error (${event})`, error);
      return null;
    }
  }, [isTauri]);

  const registerHotkey = useCallback(async (
    shortcut: string,
    handler: () => void
  ): Promise<(() => Promise<void>) | null> => {
    if (!isTauri) return null;

    try {
      // Dynamic import for Tauri plugin
      const { register, unregister } = await import("@tauri-apps/plugin-global-shortcut");
      await register(shortcut, handler);
      logger.info('useTauri', `Hotkey registered: ${shortcut}`);

      /**
       * Async cleanup function (fire-and-forget pattern).
       *
       * React's useEffect cleanup must be synchronous, but Tauri's unregister()
       * is async. Errors are logged but not re-thrown to avoid breaking React's
       * cleanup chain.
       *
       * @see .claude/patterns.md - "Fire-and-forget Pattern"
       */
      return async () => {
        try {
          await unregister(shortcut);
          logger.info('useTauri', `Hotkey unregistered: ${shortcut}`);
        } catch (error) {
          logger.error('useTauri', `Failed to unregister hotkey: ${shortcut}`, error);
        }
      };
    } catch (error: unknown) {
      logger.error('useTauri', 'Failed to register hotkey', error);
      return null;
    }
  }, [isTauri]);

  /**
   * Bring Tauri window to front when hotkey is pressed.
   *
   * Multi-Strategy Pattern to handle macOS focus issues:
   * 1. show() - Unhide window if hidden
   * 2. unminimize() - Restore from Dock if minimized
   * 3. Delay (TAURI_FOCUS_TIMINGS.focusDelayMs) - Workaround for Tauri 2.3+ bug (#2061)
   * 4. setFocus() - Activate window and steal focus
   *
   * Graceful degradation: Returns false on failure, but doesn't throw.
   * Recording will continue even if focus fails.
   *
   * @see https://github.com/tauri-apps/tauri/issues/2061
   * @see https://github.com/tauri-apps/tauri/issues/12834
   * @returns true if successful, false if focus failed (graceful degradation)
   */
  const bringToFront = useCallback(async (): Promise<boolean> => {
    if (!isTauri) {
      logger.warn('useTauri', 'Cannot bring to front: not in Tauri environment');
      return false;
    }

    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const appWindow = getCurrentWindow();

      // Multi-Strategy Pattern (order matters!)
      await appWindow.show();
      await appWindow.unminimize();
      await new Promise(resolve => setTimeout(resolve, TAURI_FOCUS_TIMINGS.focusDelayMs));
      await appWindow.setFocus();

      logger.info('useTauri', 'Window brought to front successfully');
      return true;
    } catch (error) {
      // Graceful degradation: Log but don't throw (recording continues)
      logger.warn('useTauri', 'Failed to bring window to front (non-critical)', error);
      return false;
    }
  }, [isTauri]);

  return {
    isTauri,
    isReady,
    invoke,
    listen,
    registerHotkey,
    bringToFront,
  };
}
