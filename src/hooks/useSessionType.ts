"use client";

/**
 * useSessionType - Display Session Type Detection (Linux Wayland/X11)
 *
 * Calls the Tauri `get_session_type` command to detect the display server.
 * Used to show Wayland warnings (global hotkeys don't work on Wayland).
 *
 * Returns:
 * - Linux: "wayland", "x11", or "unknown"
 * - Windows: "windows"
 * - macOS: "aqua"
 * - Browser/SSR: null
 */

import { useState, useEffect, useMemo } from "react";
import { useTauri } from "./useTauri";
import { isLinux } from "@/lib/utils";

export type SessionType = "wayland" | "x11" | "windows" | "aqua" | "unknown";

interface UseSessionTypeReturn {
  sessionType: SessionType | null;
  isWayland: boolean;
  isLoading: boolean;
  isLinuxPlatform: boolean;
}

export function useSessionType(): UseSessionTypeReturn {
  const { isTauri, isReady, invoke } = useTauri();
  const [sessionType, setSessionType] = useState<SessionType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Memoize platform check to avoid re-evaluation on each render
  const isLinuxPlatform = useMemo(() => isLinux(), []);

  useEffect(() => {
    if (!isReady) return;

    // Only fetch on Linux in Tauri (other platforms have known session types)
    if (!isTauri || !isLinuxPlatform) {
      setIsLoading(false);
      return;
    }

    const fetchSessionType = async () => {
      try {
        const result = await invoke<string>("get_session_type");
        if (result) {
          setSessionType(result as SessionType);
        }
      } catch {
        // Fallback to unknown on error
        setSessionType("unknown");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessionType();
  }, [isTauri, isReady, invoke, isLinuxPlatform]);

  return {
    sessionType,
    isWayland: sessionType === "wayland",
    isLoading,
    isLinuxPlatform,
  };
}
