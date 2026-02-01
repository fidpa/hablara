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
