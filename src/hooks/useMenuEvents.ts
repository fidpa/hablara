"use client";

/**
 * useMenuEvents - Handles Tauri menu events
 *
 * Listens to menu events from the native Tauri menu bar and triggers
 * corresponding actions in the React app (open settings, show shortcuts).
 *
 * @param isTauri - Whether running in Tauri environment
 * @param onOpenSettings - Callback when "Einstellungen..." menu item is clicked
 * @param onShowShortcuts - Callback when "Tastaturkürzel" menu item is clicked
 */

import { useEffect } from "react";
import { logger } from "@/lib/logger";

interface UseMenuEventsOptions {
  isTauri: boolean;
  onOpenSettings: () => void;
  onShowShortcuts: () => void;
}

export function useMenuEvents({
  isTauri,
  onOpenSettings,
  onShowShortcuts,
}: UseMenuEventsOptions): void {
  useEffect(() => {
    if (!isTauri) return;

    // Use isMounted flag to prevent race condition on cleanup
    let isMounted = true;
    let unlistenSettings: (() => void) | undefined;
    let unlistenShortcuts: (() => void) | undefined;

    const setupListeners = async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");

        if (!isMounted) return;

        unlistenSettings = await listen("menu:open-settings", () => {
          logger.debug("Menu", "Open settings triggered from menu");
          onOpenSettings();
        });

        if (!isMounted) {
          unlistenSettings?.();
          return;
        }

        unlistenShortcuts = await listen("menu:show-shortcuts", () => {
          logger.debug("Menu", "Show shortcuts triggered from menu");
          onShowShortcuts();
        });

        if (!isMounted) {
          unlistenSettings?.();
          unlistenShortcuts?.();
        }
      } catch (error) {
        logger.error("Menu", "Failed to setup menu event listeners", error);
      }
    };

    setupListeners();

    return () => {
      isMounted = false;
      unlistenSettings?.();
      unlistenShortcuts?.();
    };
  }, [isTauri, onOpenSettings, onShowShortcuts]);
}
