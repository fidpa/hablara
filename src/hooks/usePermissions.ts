"use client";

/**
 * usePermissions Hook - macOS Permission Management
 *
 * Provides permission status checking and request flow for microphone access.
 * Uses tauri-plugin-macos-permissions for native macOS permission handling.
 *
 * Features:
 * - Browser fallback (always "authorized" - browser has own dialog)
 * - Tauri: Native permission checking via plugin
 * - Error handling with graceful degradation
 * - Request flow with system dialog integration
 *
 * @see docs/explanation/implementation-logs/PHASE_49_PERMISSION_ONBOARDING.md
 */

import { useState, useCallback, useEffect } from "react";
import type { MicrophonePermissionStatus } from "@/lib/types";
import { logger } from "@/lib/logger";

interface UsePermissionsReturn {
  /** Current microphone permission status */
  microphoneStatus: MicrophonePermissionStatus;
  /** Whether permission check is in progress */
  isChecking: boolean;
  /** Request microphone permission (triggers system dialog) */
  requestMicrophone: () => Promise<boolean>;
  /** Re-check permissions (useful after settings change) */
  recheckPermissions: () => Promise<void>;
}

/**
 * Hook for managing macOS permissions
 *
 * @returns Permission state and control functions
 *
 * @example
 * ```tsx
 * const { microphoneStatus, requestMicrophone } = usePermissions();
 *
 * if (microphoneStatus === "not_determined") {
 *   const granted = await requestMicrophone();
 *   // Handle result
 * }
 * ```
 */
export function usePermissions(): UsePermissionsReturn {
  const [microphoneStatus, setMicrophoneStatus] = useState<MicrophonePermissionStatus>("checking");
  const [isChecking, setIsChecking] = useState(true);

  /**
   * Helper to check if in Tauri environment
   */
  const isTauri = (): boolean => {
    return typeof window !== "undefined" && "__TAURI__" in window && window.__TAURI__ !== undefined;
  };

  /**
   * Check microphone permission status
   * Browser: Always returns "authorized" (graceful fallback)
   * Tauri: Queries native permission status via plugin
   */
  const checkMicrophonePermission = useCallback(async (): Promise<MicrophonePermissionStatus> => {
    // Browser fallback - always authorized (browser handles own permission)
    if (!isTauri()) {
      logger.debug("usePermissions", "Browser environment - defaulting to authorized");
      return "authorized";
    }

    try {
      // Dynamic import for Tauri plugin (only available in Tauri context)
      // Plugin returns boolean: true = granted, false = not granted
      const { checkMicrophonePermission: checkMicPerm } = await import("tauri-plugin-macos-permissions-api");

      const isGranted = await checkMicPerm();

      logger.info("usePermissions", "Microphone permission checked", { isGranted });

      // Plugin returns boolean, not detailed status
      // We can only determine "authorized" or "not_determined" from boolean
      return isGranted ? "authorized" : "not_determined";
    } catch (error) {
      logger.error("usePermissions", "Failed to check microphone permission", error);
      // Graceful degradation - assume authorized to not block user
      return "authorized";
    }
  }, []);

  /**
   * Request microphone permission (triggers macOS system dialog)
   *
   * @returns true if permission granted, false otherwise
   */
  const requestMicrophone = useCallback(async (): Promise<boolean> => {
    // Browser fallback - always return true (browser handles own permission)
    if (!isTauri()) {
      logger.debug("usePermissions", "Browser environment - no permission request needed");
      return true;
    }

    try {
      setIsChecking(true);
      const { requestMicrophonePermission: requestMicPerm } = await import("tauri-plugin-macos-permissions-api");

      logger.info("usePermissions", "Requesting microphone permission");

      // Request permission (triggers system dialog)
      // Returns void/unknown - we need to re-check after
      await requestMicPerm();

      // Re-check permission status after request
      const { checkMicrophonePermission: checkMicPerm } = await import("tauri-plugin-macos-permissions-api");
      const isGranted = await checkMicPerm();

      const newStatus: MicrophonePermissionStatus = isGranted ? "authorized" : "denied";
      setMicrophoneStatus(newStatus);

      logger.info("usePermissions", "Microphone permission request completed", { granted: isGranted });

      return isGranted;
    } catch (error) {
      logger.error("usePermissions", "Failed to request microphone permission", error);
      // Graceful degradation
      setMicrophoneStatus("authorized");
      return true;
    } finally {
      setIsChecking(false);
    }
  }, []);

  /**
   * Re-check permissions (useful after user changed settings manually)
   */
  const recheckPermissions = useCallback(async () => {
    setIsChecking(true);
    const status = await checkMicrophonePermission();
    setMicrophoneStatus(status);
    setIsChecking(false);
  }, [checkMicrophonePermission]);

  // Initial permission check on mount
  useEffect(() => {
    let isMounted = true;

    const checkInitialPermissions = async () => {
      const status = await checkMicrophonePermission();
      if (isMounted) {
        setMicrophoneStatus(status);
        setIsChecking(false);
      }
    };

    checkInitialPermissions();

    return () => {
      isMounted = false;
    };
  }, [checkMicrophonePermission]);

  /**
   * Auto-recheck permissions when window regains focus or becomes visible.
   *
   * This handles the UX flow where:
   * 1. User clicks "Berechtigung erteilen" → System dialog appears
   * 2. User grants permission in system dialog
   * 3. App automatically detects the change without requiring another click
   *
   * Uses both visibilitychange and focus events for comprehensive coverage.
   */
  useEffect(() => {
    // SSR guard - document/window may not be available during SSR
    if (typeof document === "undefined" || typeof window === "undefined") {
      return;
    }

    // Only enable auto-recheck when permission is not yet granted
    // Once authorized, no need to keep polling
    if (microphoneStatus === "authorized") {
      return;
    }

    let isMounted = true;
    let isRechecking = false;

    const handleVisibilityOrFocus = async () => {
      // Prevent concurrent re-checks
      if (isRechecking || !isMounted) return;

      // Only check when document is visible (or on focus)
      if (document.visibilityState === "hidden") return;

      isRechecking = true;
      try {
        const status = await checkMicrophonePermission();
        // Use functional setState to avoid stale closure issues
        if (isMounted) {
          setMicrophoneStatus((prev) => {
            if (prev !== status) {
              logger.info("usePermissions", "Permission status changed on focus/visibility", {
                previous: prev,
                current: status,
              });
              return status;
            }
            return prev;
          });
        }
      } finally {
        isRechecking = false;
      }
    };

    // Listen for visibility changes (tab switch, window minimize/restore)
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    // Listen for window focus (more reliable for desktop apps)
    window.addEventListener("focus", handleVisibilityOrFocus);

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    };
  }, [microphoneStatus, checkMicrophonePermission]);

  return {
    microphoneStatus,
    isChecking,
    requestMicrophone,
    recheckPermissions,
  };
}
