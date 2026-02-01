"use client";

/**
 * EmotionDetectionModeSelector - Audio/Text-Balance für Emotion Analysis
 *
 * 3 Preset-Modi: Ausgewogen (40/60 research-optimiert), Stimmbetonung (60/40 prosody focus),
 * Inhaltsfokus (20/80 semantics focus). Conditional rendering nur bei aktivierter Emotion Analysis.
 */

import { useCallback } from "react";
import { Scale, Mic, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EmotionDetectionMode, AppSettings } from "@/lib/types";
import { EMOTION_DETECTION_MODE_INFO } from "@/lib/types";

const ICONS = {
  Scale,
  Mic,
  FileText,
};

interface EmotionDetectionModeSelectorProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export function EmotionDetectionModeSelector({
  settings,
  onSettingsChange,
}: EmotionDetectionModeSelectorProps) {
  const currentMode = settings.audio.emotionDetectionMode ?? "balanced";

  const handleModeChange = useCallback(
    (mode: EmotionDetectionMode) => {
      onSettingsChange({
        ...settings,
        audio: {
          ...settings.audio,
          emotionDetectionMode: mode,
        },
      });
    },
    [settings, onSettingsChange]
  );

  const modes: EmotionDetectionMode[] = ["balanced", "voice-focus", "content-focus"];

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">
        Erkennungsmodus
      </label>

      <div className="grid grid-cols-3 gap-2">
        {modes.map((mode) => {
          const info = EMOTION_DETECTION_MODE_INFO[mode];
          const Icon = ICONS[info.icon as keyof typeof ICONS];
          const isActive = currentMode === mode;

          return (
            <button
              type="button"
              key={mode}
              onClick={() => handleModeChange(mode)}
              className={cn(
                "p-3 rounded-lg border text-center transition-colors",
                "flex flex-col items-center justify-center gap-2",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isActive
                  ? "border-primary bg-primary/20"
                  : "border-input hover:border-primary/50 hover:bg-accent/50"
              )}
              aria-pressed={isActive}
            >
              <Icon className="h-4 w-4" />
              <div>
                <div className="text-sm font-medium">{info.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {info.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Betrifft: Emotionsanalyse, Ton-Analyse
      </p>
    </div>
  );
}
