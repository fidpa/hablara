"use client";

/**
 * useInAppShortcut - In-App Keyboard Shortcut for App Store Builds
 *
 * Provides keyboard shortcut functionality that works within the app window,
 * bypassing the Tauri global shortcut system which doesn't work in sandboxed
 * App Store builds (AXIsProcessTrusted() always returns false in sandbox).
 *
 * This hook registers a standard DOM keydown listener that only fires when
 * the app window is focused - unlike global hotkeys which work system-wide.
 *
 * @see Apple Developer Forums Thread 810677 - Sandbox vs Accessibility
 * @see ADR-051 - Hybrid Distribution Strategy
 */

import { useEffect, useRef } from "react";
import { logger } from "@/lib/logger";

/** Build-time detection for App Store build */
const IS_APP_STORE = process.env.NEXT_PUBLIC_APP_STORE === "true";

/**
 * Registers an in-app keyboard shortcut (window-scoped, not global).
 *
 * Only active in App Store builds where global hotkeys don't work due to
 * macOS sandbox restrictions. In direct distribution builds, this hook
 * does nothing (global hotkeys handle it instead).
 *
 * @param shortcut - Key combination in format "Modifier+Key" (e.g., "Control+Shift+D")
 * @param callback - Handler function called when shortcut is triggered
 * @param enabled - Optional flag to enable/disable (default: true in App Store builds)
 *
 * @example
 * // Automatically enabled only in App Store builds
 * useInAppShortcut("Control+Shift+D", () => toggleRecording());
 *
 * @example
 * // Explicitly control activation
 * useInAppShortcut("Control+Shift+D", handleAction, someCondition);
 */
export function useInAppShortcut(
  shortcut: string,
  callback: () => void,
  enabled: boolean = IS_APP_STORE
): void {
  const callbackRef = useRef(callback);

  // Keep callback ref updated to avoid stale closures
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    // Skip if not enabled (e.g., direct distribution has global hotkeys)
    if (!enabled) {
      return;
    }

    logger.debug("useInAppShortcut", `Registering in-app shortcut: ${shortcut}`);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Parse shortcut string (e.g., "Control+Shift+D")
      const parts = shortcut.toLowerCase().split("+");
      const key = parts[parts.length - 1];

      // Check modifiers
      const needsCtrl =
        parts.includes("control") ||
        parts.includes("ctrl") ||
        parts.includes("commandorcontrol");
      const needsShift = parts.includes("shift");
      const needsAlt = parts.includes("alt") || parts.includes("option");
      const needsMeta =
        parts.includes("command") ||
        parts.includes("cmd") ||
        parts.includes("meta");

      // For CommandOrControl, accept either Ctrl or Meta (Cmd on Mac)
      const ctrlOrMeta =
        parts.includes("commandorcontrol") && (e.ctrlKey || e.metaKey);

      const modifiersMatch =
        (needsCtrl ? (ctrlOrMeta || e.ctrlKey) : !e.ctrlKey || ctrlOrMeta) &&
        (needsShift ? e.shiftKey : true) &&
        (needsAlt ? e.altKey : true) &&
        (needsMeta ? e.metaKey : !e.metaKey || ctrlOrMeta);

      // Check if key matches (case-insensitive)
      const keyMatches = e.key.toLowerCase() === key;

      if (keyMatches && modifiersMatch) {
        e.preventDefault();
        e.stopPropagation();
        logger.debug("useInAppShortcut", `Triggered: ${shortcut}`);
        callbackRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      logger.debug("useInAppShortcut", `Unregistered: ${shortcut}`);
    };
  }, [shortcut, enabled]);
}
