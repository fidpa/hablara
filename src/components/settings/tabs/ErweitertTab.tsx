"use client";

/**
 * ErweitertTab - Erweiterte Settings Tab
 *
 * Fortgeschrittene Einstellungen: Hotkey Agent, Microphone Permissions, MLX Paths,
 * Privacy Status, Delete Data. Settings Reset zu DEFAULT_SETTINGS.
 */

import { useCallback } from "react";
import type { AppSettings } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/types";
import { MicrophonePermissionSection } from "../MicrophonePermissionSection";
import { MLXPathsSection } from "../MLXPathsSection";
import { PrivacyStatusSection } from "../PrivacyStatusSection";
import { ThemeToggleSection } from "../ThemeToggleSection";
import { DeleteDataSection } from "../DeleteDataSection";
import { Separator } from "@/components/ui/separator";
import { isTauri } from "@/lib/utils";
import { useSessionType } from "@/hooks/useSessionType";
import { AlertTriangle } from "lucide-react";

interface ErweitertTabProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  storagePath?: string;
  onSettingsReset: () => void;
}

export function ErweitertTab({
  settings,
  onSettingsChange,
  storagePath,
  onSettingsReset,
}: ErweitertTabProps): JSX.Element {
  const showMLXLLMPaths =
    settings.llm.provider === "ollama" && settings.llm.useMlx;

  // Wayland detection for Linux (global hotkeys don't work on Wayland)
  const { isWayland, isLinuxPlatform } = useSessionType();
  const showWaylandWarning = isTauri() && isLinuxPlatform && isWayland;

  const handleSwitchToLocal = useCallback(() => {
    onSettingsChange({
      ...settings,
      llm: {
        ...settings.llm,
        provider: "ollama",
        model: DEFAULT_SETTINGS.llm.model,
      },
    });
  }, [settings, onSettingsChange]);

  return (
    <div className="space-y-6 py-4">
      {/* Microphone Permission Status (macOS only) */}
      {isTauri() && (
        <>
          <MicrophonePermissionSection />
          <Separator />
        </>
      )}

      {/* Hotkey Info */}
      {isTauri() && (
        <>
          <div className="space-y-2">
            <h3 className="text-base font-medium">Globaler Hotkey</h3>
            <p className="text-sm text-muted-foreground">
              Drücke <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl+Shift+D</kbd>{" "}
              um die Aufnahme zu starten/stoppen.
            </p>
            <p className="text-xs text-muted-foreground">
              Der Hotkey funktioniert, solange Hablará geöffnet ist.
            </p>

            {/* Wayland Warning (Linux only) */}
            {showWaylandWarning && (
              <div
                role="alert"
                aria-live="polite"
                className="mt-3 p-3 rounded-lg border border-yellow-500/50 bg-yellow-500/10"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                      Wayland-Session erkannt
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Globale Hotkeys funktionieren unter Wayland nicht.
                      Verwende &quot;Ubuntu on Xorg&quot; beim Login oder nutze den
                      manuellen Start-Button.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <Separator />
        </>
      )}

      {/* MLX Paths (conditional) */}
      {showMLXLLMPaths && (
        <>
          <MLXPathsSection
            settings={settings}
            onSettingsChange={onSettingsChange}
          />
          <Separator />
        </>
      )}

      {/* Privacy Status */}
      <PrivacyStatusSection
        settings={settings}
        storagePath={storagePath}
        onSwitchToLocal={handleSwitchToLocal}
      />

      <Separator />

      {/* Theme Toggle */}
      <ThemeToggleSection />

      <Separator />

      {/* Delete Data */}
      <DeleteDataSection
        settings={settings}
        onSettingsChange={onSettingsChange}
        onSettingsReset={onSettingsReset}
      />
    </div>
  );
}
