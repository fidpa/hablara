"use client";

/**
 * useWindowState Hook - Window State Management (Plugin-based)
 *
 * Provides manual reset-to-defaults functionality.
 * Automatic save/restore is handled by tauri-plugin-window-state.
 *
 * Features:
 * - Plugin-managed automatic save on resize/move/close
 * - Plugin-managed automatic restore before window display (no flash)
 * - Manual reset to defaults (delete state + apply DEFAULT_WINDOW_STATE)
 * - Graceful browser fallback (isAvailable: false)
 *
 * Migration from custom implementation:
 * - Removed: saveState(), restoreState(), event listeners, debounce logic
 * - Plugin handles: STATE_FLAGS (SIZE | POSITION | MAXIMIZED)
 * - Benefits: -200 LOC, eliminates race conditions, no flash on startup
 *
 * @see docs/explanation/decisions/ADR-045-window-state-plugin-migration.md
 */

import { useState, useCallback, useEffect } from "react";
import {
  DEFAULT_WINDOW_STATE,
  type WindowState,
} from "@/lib/types";
import { logger } from "@/lib/logger";

/** Delay before running post-restore validation (ms) */
const POST_RESTORE_VALIDATION_DELAY_MS = 500;

/**
 * Flag to ensure validation runs only once per app session.
 * Prevents fullscreen exit when navigating within the app.
 * Module-level to persist across hook instances.
 */
let hasValidatedThisSession = false;

export interface UseWindowStateReturn {
  /** Current window state (informational, managed by plugin) */
  state: WindowState;
  /** Reset window state to defaults (delete persisted state + apply DEFAULT_WINDOW_STATE) */
  resetToDefaults: () => Promise<void>;
  /** Whether window state persistence is available (Tauri only) */
  isAvailable: boolean;
}

/**
 * Hook for managing window state with tauri-plugin-window-state.
 *
 * Pattern: Plugin handles automatic persistence, hook provides manual reset.
 *
 * Note: Plugin restores state BEFORE window display, eliminating the flash
 * present in the previous localStorage-based implementation.
 */
export function useWindowState(): UseWindowStateReturn {
  const [state, setState] = useState<WindowState>(DEFAULT_WINDOW_STATE);
  const [isAvailable, setIsAvailable] = useState(false);

  /**
   * Check Tauri availability
   */
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        await import("@tauri-apps/api/window");
        setIsAvailable(true);
        logger.debug("WindowState", "Plugin-managed window state available");
      } catch {
        setIsAvailable(false);
      }
    };
    checkAvailability();
  }, []);

  /**
   * Post-restore validation (defensive layer on top of plugin)
   *
   * Validates window state after plugin restore completes.
   * Handles edge cases:
   * - DPI scaling issues (PhysicalSize vs LogicalSize)
   * - Multi-monitor position out of bounds
   * - Fullscreen state restoration bug (GitHub Issue #3215)
   * - Size constraints (MIN/MAX bounds)
   *
   * Delay: 500ms ensures plugin restore has completed before validation.
   *
   * @see docs/explanation/debugging/WINDOW_STATE_EDGE_CASES_ANALYSIS.md
   * @see docs/explanation/debugging/WINDOW_STATE_IMPLEMENTATION_VERIFICATION.md
   */
  useEffect(() => {
    if (!isAvailable) return;

    // Skip validation if already done this session
    // (prevents fullscreen exit when navigating within the app)
    if (hasValidatedThisSession) {
      logger.debug("WindowState", "Skipping validation (already done this session)");
      return;
    }

    // Validate window state after plugin restore
    const timer: ReturnType<typeof setTimeout> = setTimeout(async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("validate_window_state");
        hasValidatedThisSession = true;
        logger.debug("WindowState", "Post-restore validation completed");
      } catch (error) {
        logger.error("WindowState", "Post-restore validation failed", error);
        // Non-critical: Log error but don't throw (app remains functional)
      }
    }, POST_RESTORE_VALIDATION_DELAY_MS);

    return () => clearTimeout(timer);
  }, [isAvailable]);

  /**
   * Reset window state to defaults (delete persisted state + apply DEFAULT_WINDOW_STATE)
   *
   * Steps:
   * 1. Apply default dimensions (1280×1440)
   * 2. Center window on screen
   * 3. Save current (default) state via plugin
   * 4. Update React state
   *
   * Note: We save the default state explicitly rather than deleting
   * the state file, as the plugin will restore these defaults on next launch.
   *
   * @throws {Error} If Tauri not available, window operations fail, or plugin save fails
   */
  const resetToDefaults = useCallback(async () => {
    if (!isAvailable) {
      logger.warn("WindowState", "Reset attempted but Tauri not available");
      return;
    }

    try {
      logger.info("WindowState", "Resetting window state to defaults");

      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const { LogicalSize } = await import("@tauri-apps/api/dpi");
      const window = getCurrentWindow();

      // Apply defaults using LogicalSize for DPI-independent sizing
      // (PhysicalSize would be halved on 2x Retina displays: 1280x1440 → 640x720)
      await window.setSize(
        new LogicalSize(DEFAULT_WINDOW_STATE.width, DEFAULT_WINDOW_STATE.height)
      );
      await window.center();

      // Save current (default) state via plugin
      const { saveWindowState, StateFlags } = await import(
        "@tauri-apps/plugin-window-state"
      );
      await saveWindowState(StateFlags.ALL);

      setState(DEFAULT_WINDOW_STATE);
      logger.info(
        "WindowState",
        `Reset successful: ${DEFAULT_WINDOW_STATE.width}×${DEFAULT_WINDOW_STATE.height}, centered`
      );
    } catch (error: unknown) {
      // Type guard for proper error handling
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("WindowState", "Failed to reset window state", error);
      throw new Error(`Window state reset failed: ${errorMessage}`);
    }
  }, [isAvailable]);

  return {
    state,
    resetToDefaults,
    isAvailable,
  };
}
