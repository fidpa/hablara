"use client";

/**
 * KIModelleTab - KI-Modelle Settings Tab
 *
 * Konfiguration für Whisper (Provider/Model), MLX Paths, LLM (Provider/Model/API Key).
 * Zeigt Provider Status Badge. Separatoren zwischen Sections.
 */

import type { AppSettings, LLMProviderStatus } from "@/lib/types";
import { WhisperSettingsSection } from "../WhisperSettingsSection";
import { MLXPathsSection } from "../MLXPathsSection";
import { LLMSettingsSection } from "../LLMSettingsSection";
import { Separator } from "@/components/ui/separator";

interface KIModelleTabProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  providerStatus: LLMProviderStatus;
}

export function KIModelleTab({
  settings,
  onSettingsChange,
  providerStatus,
}: KIModelleTabProps): JSX.Element {
  return (
    <div className="space-y-6 py-4">
      {/* Whisper Settings */}
      <WhisperSettingsSection
        settings={settings}
        onSettingsChange={onSettingsChange}
      />

      {/* MLX Paths (conditional) */}
      {settings.whisperProvider === "mlx-whisper" && (
        <>
          <Separator />
          <MLXPathsSection
            settings={settings}
            onSettingsChange={onSettingsChange}
          />
        </>
      )}

      <Separator />

      {/* LLM Settings */}
      <LLMSettingsSection
        settings={settings}
        providerStatus={providerStatus}
        onSettingsChange={onSettingsChange}
      />
    </div>
  );
}
