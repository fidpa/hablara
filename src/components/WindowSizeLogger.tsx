/**
 * Window Size Logger Component
 *
 * Logs the current window size on mount and on resize (development only).
 * Uses Tauri's get_window_size command to retrieve actual window dimensions.
 *
 * Usage: Add <WindowSizeLogger /> to page.tsx (dev mode only)
 *
 * @see docs/reference/guidelines/REACT_TSX.md
 */

"use client";

import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { logger } from "@/lib/logger";

/**
 * WindowSizeLogger - Development utility component
 *
 * Retrieves and logs the current window size via Tauri command.
 * Only runs in development mode to avoid production overhead.
 *
 * Features:
 * - Automatic size logging on mount
 * - Live updates on window resize (debounced 300ms)
 * - Error handling with fallback
 * - Development-only (conditional render)
 * - No UI rendering (invisible component)
 */
export function WindowSizeLogger() {
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    const logWindowSize = async () => {
      try {
        const size = await invoke<{
          innerPhysicalWidth: number;
          innerPhysicalHeight: number;
          innerLogicalWidth: number;
          innerLogicalHeight: number;
          outerPhysicalWidth: number;
          outerPhysicalHeight: number;
          outerLogicalWidth: number;
          outerLogicalHeight: number;
          scaleFactor: number;
        }>("get_window_size");

        const outerW = Math.round(size.outerLogicalWidth);
        const outerH = Math.round(size.outerLogicalHeight);
        const innerW = Math.round(size.innerLogicalWidth);
        const innerH = Math.round(size.innerLogicalHeight);

        logger.info("WindowSizeLogger", `Window - Outer: ${outerW}x${outerH}, Inner: ${innerW}x${innerH}, Scale: ${size.scaleFactor}`, {
          outer: { width: outerW, height: outerH },
          inner: { width: innerW, height: innerH },
          scaleFactor: size.scaleFactor,
        });

        // Also log to browser console for easy visibility (Outer = what user sets in macOS)
        console.log(
          `%c🪟 Window (Outer): ${outerW} x ${outerH}%c | Content (Inner): ${innerW} x ${innerH} | Scale: ${size.scaleFactor.toFixed(2)}x`,
          "color: #3b82f6; font-weight: bold; font-size: 14px;",
          "color: #64748b; font-weight: normal; font-size: 12px;"
        );
      } catch (error) {
        logger.warn("WindowSizeLogger", "Failed to get window size (Tauri command not available)", error);
      }
    };

    // Log immediately on mount
    logWindowSize();

    // Listen for window resize events (debounced)
    const handleResize = () => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer (debounce 300ms)
      debounceTimerRef.current = setTimeout(() => {
        logWindowSize();
      }, 300);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // No UI - invisible component
  return null;
}
