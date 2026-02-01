"use client";

/**
 * AudioFeedbackSection - Audio & Window Feedback Settings
 *
 * Toggle für Recording Sounds (Web Audio API Tones), Volume Slider (0-100%).
 * Toggle für "Bring to Front on Hotkey" (Tauri only).
 * Sounds sind optional, standardmäßig deaktiviert. Keine Dateien nötig.
 */

import { useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Volume2, Focus } from "lucide-react";
import { useTauri } from "@/hooks/useTauri";
import type { AppSettings } from "@/lib/types";
import { DEFAULT_AUDIO_SETTINGS } from "@/lib/types";

interface AudioFeedbackSectionProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

/**
 * AudioFeedbackSection - Controls for audio & window feedback
 *
 * Allows users to:
 * 1. Enable/disable start/stop recording sounds and adjust volume
 * 2. Enable/disable window focus-stealing when hotkey is pressed (Tauri only)
 *
 * Volume slider is only visible when sounds are enabled.
 * Focus toggle is only visible in Tauri desktop environment.
 */
export function AudioFeedbackSection({
  settings,
  onSettingsChange,
}: AudioFeedbackSectionProps) {
  const { isTauri } = useTauri();
  const enabled = settings.audio?.playStartStopSounds ?? false;
  const volume = settings.audio?.soundVolume ?? 0.5;
  const bringToFront = settings.audio?.bringToFrontOnHotkey ?? true;

  // Defensive spread: fallback to defaults if audio settings undefined (migration edge case)
  const audioSettings = settings.audio ?? DEFAULT_AUDIO_SETTINGS;

  const handleToggle = useCallback(
    (checked: boolean) => {
      onSettingsChange({
        ...settings,
        audio: { ...audioSettings, playStartStopSounds: checked },
      });
    },
    [settings, audioSettings, onSettingsChange]
  );

  const handleVolumeChange = useCallback(
    (value: number[]) => {
      onSettingsChange({
        ...settings,
        audio: { ...audioSettings, soundVolume: value[0] ?? 0.5 },
      });
    },
    [settings, audioSettings, onSettingsChange]
  );

  const handleBringToFrontToggle = useCallback(
    (checked: boolean) => {
      onSettingsChange({
        ...settings,
        audio: { ...audioSettings, bringToFrontOnHotkey: checked },
      });
    },
    [settings, audioSettings, onSettingsChange]
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Volume2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h3 className="text-sm font-medium">Audio-Feedback</h3>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="audio-feedback-toggle" className="text-sm">
          Start/Stop-Töne
        </Label>
        <Switch
          id="audio-feedback-toggle"
          checked={enabled}
          onCheckedChange={handleToggle}
        />
      </div>

      {/* Volume Slider (conditional) */}
      {enabled && (
        <div className="ml-3 mt-3 pt-3 border-t border-border/50 space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="volume-slider" className="text-xs text-muted-foreground">
              Lautstärke
            </Label>
            <span className="text-xs text-muted-foreground font-mono">
              {Math.round(volume * 100)}%
            </span>
          </div>
          <Slider
            id="volume-slider"
            aria-label={`Lautstärke: ${Math.round(volume * 100)} Prozent`}
            min={0}
            max={1}
            step={0.1}
            value={[volume]}
            onValueChange={handleVolumeChange}
            className="w-full"
          />
        </div>
      )}

      {/* Bring to Front Toggle (Tauri only) */}
      {isTauri && (
        <>
          <div className="pt-3 border-t border-border/50" />
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Focus className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <h3 className="text-sm font-medium">Fenster-Fokus</h3>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="bring-to-front-toggle" className="text-sm">
                  Fenster in Vordergrund
                </Label>
                <p id="bring-to-front-description" className="text-xs text-muted-foreground">
                  Fenster erscheint automatisch bei Hotkey-Druck (auch wenn minimiert)
                </p>
              </div>
              <Switch
                id="bring-to-front-toggle"
                checked={bringToFront}
                onCheckedChange={handleBringToFrontToggle}
                aria-describedby="bring-to-front-description"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
