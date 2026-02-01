"use client";

/**
 * HotkeyAgentSection - Hotkey Agent Toggle (Experimental)
 *
 * Erweiterte Hotkey-Features (geplant). Aktuell nur Placeholder mit Coming Soon Notice.
 * Für Zukunft: Multi-Hotkey-Support, Custom Actions.
 */

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PlayCircle, StopCircle, AlertCircle, CheckCircle2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { logger } from "@/lib/logger";

/**
 * Hotkey Agent Section
 *
 * Manages the background LaunchAgent that listens for Ctrl+Shift+D
 * and launches Hablará even when the app is closed.
 *
 * Features:
 * - Install/Uninstall agent
 * - Status indicator (running/stopped)
 * - Permission instructions
 */
export function HotkeyAgentSection(): JSX.Element {
  const [agentStatus, setAgentStatus] = useState<"checking" | "running" | "stopped">("checking");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check agent status
  const checkStatus = useCallback(async () => {
    try {
      const isRunning = await invoke<boolean>("is_hotkey_agent_running");
      setAgentStatus(isRunning ? "running" : "stopped");
      setError(null);
    } catch (err) {
      logger.error("HotkeyAgentSection", "Failed to check agent status", err);
      setAgentStatus("stopped");
    }
  }, []);

  // Install agent
  const installAgent = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    try {
      await invoke<void>("install_hotkey_agent");
      logger.info("HotkeyAgentSection", "Agent installed successfully");
      await checkStatus();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error("HotkeyAgentSection", "Failed to install agent", err);
      setError(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  }, [checkStatus]);

  // Uninstall agent
  const uninstallAgent = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    try {
      await invoke<void>("uninstall_hotkey_agent");
      logger.info("HotkeyAgentSection", "Agent uninstalled successfully");
      await checkStatus();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error("HotkeyAgentSection", "Failed to uninstall agent", err);
      setError(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  }, [checkStatus]);

  // Check status on mount
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-medium">Globaler Hotkey</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Startet Hablará auch wenn die App geschlossen ist
        </p>
      </div>

      {/* Status Indicator */}
      <div
        className="flex items-center gap-2 text-sm"
        role="status"
        aria-live="polite"
      >
        {agentStatus === "checking" && (
          <>
            <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" aria-hidden="true" />
            <span className="text-muted-foreground">Status wird geprüft...</span>
          </>
        )}
        {agentStatus === "running" && (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />
            <span className="text-green-500">Agent läuft</span>
          </>
        )}
        {agentStatus === "stopped" && (
          <>
            <div className="h-2 w-2 rounded-full bg-muted-foreground" aria-hidden="true" />
            <span className="text-muted-foreground">Agent gestoppt</span>
          </>
        )}
      </div>

      {/* Action Button */}
      <div>
        {agentStatus === "running" ? (
          <Button
            variant="outline"
            onClick={uninstallAgent}
            disabled={isProcessing}
          >
            <StopCircle className="mr-2 h-4 w-4" />
            {isProcessing ? "Wird deaktiviert..." : "Autostart deaktivieren"}
          </Button>
        ) : (
          <Button onClick={installAgent} disabled={isProcessing}>
            <PlayCircle className="mr-2 h-4 w-4" />
            {isProcessing ? "Wird aktiviert..." : "Autostart aktivieren"}
          </Button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Fehler</p>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Permission Notice */}
      <div className="p-3 bg-muted/50 rounded-md space-y-2 text-sm">
        <p className="font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Berechtigung erforderlich
        </p>
        <p className="text-muted-foreground">
          Der Agent benötigt die <span className="font-medium">Accessibility</span>-Berechtigung für globale Hotkeys.
        </p>
        <p className="text-muted-foreground">
          Gehe zu: <span className="font-mono text-xs">Systemeinstellungen → Datenschutz &amp; Sicherheit → Accessibility</span>
        </p>
        <p className="text-muted-foreground">
          Aktiviere dort <span className="font-medium">Hablará</span> (oder <span className="font-medium">hablara-agent</span>).
        </p>
      </div>

      {/* Hotkey Info */}
      {agentStatus === "running" && (
        <div className="p-3 bg-primary/5 rounded-md text-sm">
          <p className="text-muted-foreground">
            Drücke <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl+Shift+D</kbd>{" "}
            um Hablará zu starten (auch wenn die App geschlossen ist)
          </p>
        </div>
      )}
    </div>
  );
}
