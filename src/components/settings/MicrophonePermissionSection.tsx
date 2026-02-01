"use client";

/**
 * MicrophonePermissionSection - Settings status display for microphone permission
 *
 * Displays current microphone permission status and provides a deep-link
 * to macOS System Settings for recovery if permission was denied.
 *
 * This is NOT a repeat of the onboarding flow - it's a status display
 * following Apple HIG: "Apps should display permission status and link
 * to System Settings, not replicate system dialogs."
 *
 * @see docs/explanation/implementation-logs/PHASE_49_PERMISSION_ONBOARDING.md
 */

import { useCallback, useRef, useEffect } from "react";
import { CheckCircle2, XCircle, Loader2, ExternalLink, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { logger } from "@/lib/logger";

// macOS System Settings deep-link for Microphone privacy
const MACOS_PRIVACY_MICROPHONE_URL =
  "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone";

// Delay before rechecking permission after opening System Settings
const RECHECK_DELAY_MS = 1000;

/**
 * Microphone Permission Section for Settings → Erweitert Tab
 *
 * Shows:
 * - Current permission status (Checking/Authorized/Denied)
 * - Deep-link button to System Settings (for recovery)
 * - Informational text about why microphone access is needed
 */
export function MicrophonePermissionSection(): JSX.Element {
  const { microphoneStatus, isChecking, recheckPermissions } = usePermissions();
  const recheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (recheckTimeoutRef.current) {
        clearTimeout(recheckTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Open macOS System Settings → Privacy & Security → Microphone
   * Uses Tauri shell plugin for deep-link
   */
  const handleOpenSystemSettings = useCallback(async () => {
    try {
      // Check if in Tauri environment
      if (typeof window === "undefined" || !("__TAURI__" in window)) {
        logger.warn("MicrophonePermissionSection", "Not in Tauri environment");
        return;
      }

      const { open } = await import("@tauri-apps/plugin-shell");
      await open(MACOS_PRIVACY_MICROPHONE_URL);
      logger.info("MicrophonePermissionSection", "Opened System Settings for Microphone");

      // Re-check permission after user might have changed it
      // Clear any existing timeout to avoid multiple rechecks
      if (recheckTimeoutRef.current) {
        clearTimeout(recheckTimeoutRef.current);
      }

      recheckTimeoutRef.current = setTimeout(() => {
        recheckPermissions();
        recheckTimeoutRef.current = null;
      }, RECHECK_DELAY_MS);
    } catch (error) {
      logger.error("MicrophonePermissionSection", "Failed to open System Settings", error);
    }
  }, [recheckPermissions]);

  /**
   * Render status indicator based on current permission state
   */
  const renderStatus = (): JSX.Element => {
    if (isChecking) {
      return (
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" aria-hidden="true" />
          <span className="text-muted-foreground">Status wird geprüft...</span>
        </div>
      );
    }

    if (microphoneStatus === "authorized") {
      return (
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />
          <span className="text-green-500">Erlaubt</span>
        </div>
      );
    }

    // not_determined or denied
    return (
      <div className="flex items-center gap-2 text-sm">
        <XCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
        <span className="text-destructive">
          {microphoneStatus === "denied" ? "Verweigert" : "Nicht erteilt"}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-base font-medium flex items-center gap-2">
          <Mic className="h-4 w-4" aria-hidden="true" />
          Mikrofon-Berechtigung
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Erforderlich für Sprachaufnahmen
        </p>
      </div>

      {/* Status Indicator */}
      <div role="status" aria-live="polite" aria-label="Mikrofon-Berechtigungsstatus">
        {renderStatus()}
      </div>

      {/* Recovery Button (only shown when not authorized) */}
      {microphoneStatus !== "authorized" && !isChecking && (
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenSystemSettings}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Systemeinstellungen öffnen
          </Button>
          <p className="text-xs text-muted-foreground">
            Aktiviere Mikrofon-Zugriff unter Datenschutz &amp; Sicherheit → Mikrofon
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="p-3 bg-muted/50 rounded-md text-sm space-y-1">
        <p className="text-muted-foreground">
          Hablará verarbeitet Audio <span className="font-medium">lokal</span> auf deinem Gerät.
        </p>
        <p className="text-muted-foreground">
          Keine Daten werden ohne Zustimmung in die Cloud übertragen.
        </p>
      </div>
    </div>
  );
}
