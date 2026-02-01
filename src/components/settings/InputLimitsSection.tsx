"use client";

/**
 * InputLimitsSection - Input Limits Configuration
 *
 * Konfiguration für Max Recording Minutes (Slider 1-60), Max Text Characters,
 * Max Audio File Size. Nutzt DEFAULT_INPUT_LIMITS. Dynamische Values (kein Hardcode).
 */

import type { AppSettings } from "@/lib/types";
import { DEFAULT_INPUT_LIMITS } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface InputLimitsSectionProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export function InputLimitsSection({
  settings,
  onSettingsChange,
}: InputLimitsSectionProps): JSX.Element {
  return (
    <div className="space-y-4">
      <Label className="text-base font-medium">Input-Limits</Label>

      {/* 1. Max Text Characters */}
      <div className="space-y-2">
        <Label htmlFor="max-text-chars">Maximale Textzeichen</Label>
        <input
          id="max-text-chars"
          type="number"
          value={settings.limits?.maxTextCharacters ?? DEFAULT_INPUT_LIMITS.maxTextCharacters}
          onChange={(e) => {
            const parsed = parseInt(e.target.value, 10);
            onSettingsChange({
              ...settings,
              limits: {
                ...DEFAULT_INPUT_LIMITS,
                ...settings.limits,
                maxTextCharacters: Number.isNaN(parsed) ? DEFAULT_INPUT_LIMITS.maxTextCharacters : Math.max(1000, parsed),
              },
            });
          }}
          min={1000}
          max={1000000}
          step={1000}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          Standard: {DEFAULT_INPUT_LIMITS.maxTextCharacters.toLocaleString()} Zeichen (≈ 50 Seiten Text)
        </p>
      </div>

      {/* 2. Max Text File Size */}
      <div className="space-y-2">
        <Label htmlFor="max-text-file-size">Maximale Textdateigröße (MB)</Label>
        <input
          id="max-text-file-size"
          type="number"
          value={settings.limits?.maxTextFileSizeMB ?? DEFAULT_INPUT_LIMITS.maxTextFileSizeMB}
          onChange={(e) => {
            const parsed = parseInt(e.target.value, 10);
            onSettingsChange({
              ...settings,
              limits: {
                ...DEFAULT_INPUT_LIMITS,
                ...settings.limits,
                maxTextFileSizeMB: Number.isNaN(parsed) ? DEFAULT_INPUT_LIMITS.maxTextFileSizeMB : Math.max(1, parsed),
              },
            });
          }}
          min={1}
          max={100}
          step={1}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          Standard: {DEFAULT_INPUT_LIMITS.maxTextFileSizeMB} MB für .txt/.md Dateien
        </p>
      </div>

      {/* 3. Max Audio File Size */}
      <div className="space-y-2">
        <Label htmlFor="max-audio-file-size">Maximale Audiodateigröße (MB)</Label>
        <input
          id="max-audio-file-size"
          type="number"
          value={settings.limits?.maxAudioFileSizeMB ?? DEFAULT_INPUT_LIMITS.maxAudioFileSizeMB}
          onChange={(e) => {
            const parsed = parseInt(e.target.value, 10);
            onSettingsChange({
              ...settings,
              limits: {
                ...DEFAULT_INPUT_LIMITS,
                ...settings.limits,
                maxAudioFileSizeMB: Number.isNaN(parsed) ? DEFAULT_INPUT_LIMITS.maxAudioFileSizeMB : Math.max(10, parsed),
              },
            });
          }}
          min={10}
          max={200}
          step={5}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          Standard: {DEFAULT_INPUT_LIMITS.maxAudioFileSizeMB} MB für Audio-Dateien
        </p>
      </div>

      {/* 4. Max Recording Duration */}
      <div className="space-y-2">
        <Label htmlFor="max-recording-minutes">Maximale Aufnahmedauer (Minuten)</Label>
        <input
          id="max-recording-minutes"
          type="number"
          value={settings.limits?.maxRecordingMinutes ?? DEFAULT_INPUT_LIMITS.maxRecordingMinutes}
          onChange={(e) => {
            const parsed = parseInt(e.target.value, 10);
            onSettingsChange({
              ...settings,
              limits: {
                ...DEFAULT_INPUT_LIMITS,
                ...settings.limits,
                maxRecordingMinutes: Number.isNaN(parsed) ? DEFAULT_INPUT_LIMITS.maxRecordingMinutes : Math.max(1, parsed),
              },
            });
          }}
          min={1}
          max={120}
          step={5}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          Standard: {DEFAULT_INPUT_LIMITS.maxRecordingMinutes} Minuten
        </p>
      </div>

      {/* Reset Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          onSettingsChange({
            ...settings,
            limits: DEFAULT_INPUT_LIMITS,
          })
        }
      >
        Auf Standard zurücksetzen
      </Button>
    </div>
  );
}
