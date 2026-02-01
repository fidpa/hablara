"use client";

/**
 * SpeicherTab - Speicher-Settings Tab
 *
 * Konfiguration für Storage (Enable/Disable, Max Recordings, Auto-Cleanup) und
 * Input Limits (Max Recording Minutes, Max Text/Audio File Zeichen).
 */

import type { AppSettings } from "@/lib/types";
import { StorageSettingsSection } from "../StorageSettingsSection";
import { InputLimitsSection } from "../InputLimitsSection";
import { Separator } from "@/components/ui/separator";

interface SpeicherTabProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export function SpeicherTab({
  settings,
  onSettingsChange,
}: SpeicherTabProps): JSX.Element {
  return (
    <div className="space-y-6 py-4">
      {/* Storage Settings */}
      <StorageSettingsSection
        settings={settings}
        onSettingsChange={onSettingsChange}
      />

      <Separator />

      {/* Input Limits */}
      <InputLimitsSection
        settings={settings}
        onSettingsChange={onSettingsChange}
      />
    </div>
  );
}
