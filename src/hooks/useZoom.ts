"use client";

/**
 * useZoom - Persistent Zoom Control
 *
 * Provides CMD+=/CMD+-/CMD+0 zoom functionality with localStorage persistence.
 * Uses Tauri's native WebView zoom API for proper scaling.
 * Supports zoom range 50-200% in 10% increments.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { STORAGE_KEYS } from "@/lib/types";
import { logger } from "@/lib/logger";

// Zoom constants (exported for use in ZoomSection and tests)
// Using `as const` for type safety per TYPESCRIPT.md guidelines
export const ZOOM_STEP = 0.1 as const; // 10% increments
export const MIN_ZOOM = 0.5 as const; // 50%
export const MAX_ZOOM = 2.0 as const; // 200%
export const DEFAULT_ZOOM = 1.0 as const; // 100%

export interface UseZoomReturn {
  /** Current zoom level (0.5 - 2.0) */
  zoomLevel: number;
  /** Zoom in by 10% */
  zoomIn: () => Promise<void>;
  /** Zoom out by 10% */
  zoomOut: () => Promise<void>;
  /** Reset zoom to 100% */
  resetZoom: () => Promise<void>;
  /** Set specific zoom level (0.5 - 2.0) */
  setZoom: (level: number) => Promise<void>;
  /** Whether zoom is available (Tauri only) */
  isAvailable: boolean;
}

/**
 * Hook for managing WebView zoom with persistence.
 *
 * Features:
 * - 10% step size (50% - 200% range)
 * - Persists zoom level to localStorage
 * - Restores zoom on app start
 * - Works only in Tauri (browser returns isAvailable: false)
 *
 * Note: Built-in zoomHotkeysEnabled in tauri.conf.json provides CMD+=/CMD+-/CMD+0.
 * This hook adds persistence and programmatic control.
 */
export function useZoom(): UseZoomReturn {
  const [zoomLevel, setZoomLevelState] = useState<number>(DEFAULT_ZOOM);
  const [isAvailable, setIsAvailable] = useState(false);
  const webviewRef = useRef<Awaited<ReturnType<typeof import("@tauri-apps/api/webview").getCurrentWebview>> | null>(null);

  // Apply zoom level to WebView
  const applyZoom = useCallback(async (level: number) => {
    const clampedLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level));
    // Round to 1 decimal place to avoid floating point issues
    const roundedLevel = Math.round(clampedLevel * 10) / 10;

    try {
      if (webviewRef.current) {
        await webviewRef.current.setZoom(roundedLevel);
        setZoomLevelState(roundedLevel);
        // Persist to localStorage
        localStorage.setItem(STORAGE_KEYS.ZOOM_LEVEL, String(roundedLevel));
        logger.debug("Zoom", `Zoom set to ${Math.round(roundedLevel * 100)}%`);
      }
    } catch (error) {
      logger.error("Zoom", "Failed to set zoom level", error);
    }
  }, []);

  // Zoom in by step
  const zoomIn = useCallback(async () => {
    await applyZoom(zoomLevel + ZOOM_STEP);
  }, [zoomLevel, applyZoom]);

  // Zoom out by step
  const zoomOut = useCallback(async () => {
    await applyZoom(zoomLevel - ZOOM_STEP);
  }, [zoomLevel, applyZoom]);

  // Reset to default
  const resetZoom = useCallback(async () => {
    await applyZoom(DEFAULT_ZOOM);
  }, [applyZoom]);

  // Set specific level
  const setZoom = useCallback(async (level: number) => {
    await applyZoom(level);
  }, [applyZoom]);

  // Initialize: check for Tauri and restore saved zoom
  useEffect(() => {
    const initZoom = async () => {
      try {
        // Dynamic import for SSR safety
        const { getCurrentWebview } = await import("@tauri-apps/api/webview");
        const webview = getCurrentWebview();
        webviewRef.current = webview;
        setIsAvailable(true);

        // Restore saved zoom level
        const savedZoom = localStorage.getItem(STORAGE_KEYS.ZOOM_LEVEL);
        if (savedZoom) {
          const level = parseFloat(savedZoom);
          if (!isNaN(level) && level >= MIN_ZOOM && level <= MAX_ZOOM) {
            await webview.setZoom(level);
            setZoomLevelState(level);
            logger.info("Zoom", `Restored zoom to ${Math.round(level * 100)}%`);
          }
        }
      } catch {
        // Not in Tauri environment (browser preview)
        setIsAvailable(false);
        logger.debug("Zoom", "Zoom not available (not in Tauri)");
      }
    };

    initZoom();
  }, []);

  // Note: Tauri 2.0 doesn't have a getZoom() API, so we can't sync when
  // users use the built-in hotkeys (CMD+=/CMD+-/CMD+0). Our localStorage
  // persistence is the source of truth on app restart. When Tauri adds
  // getZoom(), we could add a focus listener to sync the state.

  return {
    zoomLevel,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoom,
    isAvailable,
  };
}
