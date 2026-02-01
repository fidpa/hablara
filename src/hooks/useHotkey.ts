"use client";

/**
 * useHotkey - Global Keyboard Shortcut Registration
 *
 * Registriert globale Hotkeys via Tauri Plugin (Desktop) oder KeyboardEvent (Browser-Fallback).
 * Unterstützt CommandOrControl+Shift+Key Kombinationen. Auto-Cleanup bei Unmount.
 * Pending-State Pattern für sauberes Cleanup bei Shortcut-Änderungen.
 */

import { useEffect, useRef } from "react";
import { useTauri } from "./useTauri";
import { logger } from "@/lib/logger";

/**
 * Registriert einen globalen Hotkey via Tauri (Desktop) oder KeyboardEvent (Browser-Fallback).
 *
 * @param shortcut - Tastenkombination im Format "Modifier+Key" (z.B. "Control+Shift+D")
 * @param callback - Handler-Funktion bei Hotkey-Aktivierung
 *
 * @example
 * useHotkey("Control+Shift+D", () => toggleRecording());
 */
export function useHotkey(shortcut: string, callback: () => void): void {
  const { isTauri, isReady, registerHotkey } = useTauri();
  const callbackRef = useRef(callback);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!isReady) return;

    // Pending registration state - tracks cleanup and abort status
    const pending = {
      cleanup: null as (() => Promise<void>) | null,
      aborted: false,
    };

    if (isTauri) {
      // Async registration with abort handling
      registerHotkey(shortcut, () => callbackRef.current())
        .then(async (cleanup) => {
          if (pending.aborted) {
            // Effect was cleaned up before registration completed
            // Immediately unregister to prevent orphaned hotkey
            if (cleanup) {
              logger.info('useHotkey', `Aborting pending registration: ${shortcut}`);
              await cleanup();
            }
          } else {
            pending.cleanup = cleanup;
          }
        })
        .catch((error) => {
          logger.error('useHotkey', `Hotkey registration failed: ${shortcut}`, error);
        });
    } else {
      // Browser fallback: keyboard event listener
      const handleKeyDown = (e: KeyboardEvent) => {
        const parts = shortcut.toLowerCase().split("+");
        const key = parts[parts.length - 1];
        const needsMeta = parts.includes("commandorcontrol") || parts.includes("command") || parts.includes("cmd");
        const needsShift = parts.includes("shift");
        const needsAlt = parts.includes("alt") || parts.includes("option");
        const needsCtrl = parts.includes("control") || parts.includes("ctrl");

        const metaOrCtrl = e.metaKey || e.ctrlKey;

        if (
          e.key.toLowerCase() === key &&
          (needsMeta ? metaOrCtrl : true) &&
          (needsShift ? e.shiftKey : true) &&
          (needsAlt ? e.altKey : true) &&
          (!needsMeta && needsCtrl ? e.ctrlKey : true)
        ) {
          e.preventDefault();
          callbackRef.current();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      // Browser fallback: wrap sync cleanup as Promise for type consistency
      pending.cleanup = () => {
        window.removeEventListener("keydown", handleKeyDown);
        return Promise.resolve();
      };
    }

    return () => {
      pending.aborted = true;
      // Fire-and-forget async cleanup (React cleanup must be sync)
      if (pending.cleanup) {
        pending.cleanup().catch((error) => {
          logger.error('useHotkey', `Hotkey cleanup failed: ${shortcut}`, error);
        });
      }
    };
  }, [isTauri, isReady, shortcut, registerHotkey]);
}
