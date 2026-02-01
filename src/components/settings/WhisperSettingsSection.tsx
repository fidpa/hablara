"use client";

/**
 * WhisperSettingsSection - Whisper Provider & Model Konfiguration
 *
 * Provider-Auswahl (whisper.cpp vs mlx-whisper) + Model-Dropdown.
 * Dynamic Model Discovery via useAvailableWhisperModels Hook bei MLX-Provider.
 */

import type { AppSettings, WhisperProvider } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAvailableWhisperModels } from "@/hooks/useAvailableWhisperModels";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import { WHISPER_PROVIDERS, WHISPER_MODELS } from "./settings-constants";

interface WhisperSettingsSectionProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export function WhisperSettingsSection({
  settings,
  onSettingsChange,
}: WhisperSettingsSectionProps) {
  const { models: mlxModels, isLoading: isLoadingModels, error: discoveryError } = useAvailableWhisperModels(
    settings.mlxPaths,
    settings.whisperProvider === "mlx-whisper"
  );

  return (
    <div className="space-y-4">
      {/* Whisper Provider */}
      <div className="space-y-2">
        <Label>Whisper Provider</Label>
        <div className="grid grid-cols-2 gap-2">
          {WHISPER_PROVIDERS.map((provider) => {
            const isActive = settings.whisperProvider === provider.value;
            return (
              <button
                type="button"
                key={provider.value}
                onClick={() =>
                  onSettingsChange({
                    ...settings,
                    whisperProvider: provider.value as WhisperProvider,
                  })
                }
                aria-pressed={isActive}
                className={cn(
                  "p-3 rounded-lg border text-center transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isActive
                    ? "border-primary bg-primary/20"
                    : "border-input hover:border-primary/50"
                )}
              >
                <div className="text-sm font-medium">{provider.label}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {provider.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Whisper Model (whisper.cpp) */}
      {settings.whisperProvider === "whisper-cpp" && (
        <div className="space-y-2">
          <Label>Whisper.cpp Modell</Label>
          {WHISPER_MODELS.length === 1 ? (
            // Single model: Show as static text (no dropdown needed)
            <div className="p-3 rounded-lg border border-input bg-muted/50">
              <div className="text-sm font-medium">{WHISPER_MODELS[0].label}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {WHISPER_MODELS[0].description}
              </div>
            </div>
          ) : (
            // Multiple models: Show dropdown
            <Select
              value={settings.whisperModel}
              onValueChange={(value) =>
                onSettingsChange({
                  ...settings,
                  whisperModel: value as typeof settings.whisperModel,
                })
              }
            >
              <SelectTrigger id="whisper-model">
                <SelectValue placeholder="Modell wählen" />
              </SelectTrigger>
              <SelectContent>
                {WHISPER_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label} - {model.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* MLX-Whisper Model */}
      {settings.whisperProvider === "mlx-whisper" && (
        <div className="space-y-2">
          <Label>MLX-Whisper Modell</Label>
          {isLoadingModels ? (
            <div className="p-3 rounded-lg border border-input bg-muted/50 animate-pulse">
              <div className="h-4 bg-muted-foreground/20 rounded w-32 mb-2" />
              <div className="h-3 bg-muted-foreground/10 rounded w-48" />
            </div>
          ) : mlxModels.length === 1 ? (
            <div className="p-3 rounded-lg border border-input bg-muted/50">
              <div className="text-sm font-medium">
                {mlxModels[0]?.displayName} {mlxModels[0]?.sizeEstimate && `(${mlxModels[0].sizeEstimate})`}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{mlxModels[0]?.description}</div>
            </div>
          ) : (
            <Select
              value={settings.mlxWhisperModel}
              onValueChange={(value) => onSettingsChange({ ...settings, mlxWhisperModel: value })}
            >
              <SelectTrigger id="mlx-model">
                <SelectValue placeholder="Modell wählen" />
              </SelectTrigger>
              <SelectContent>
                {mlxModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.displayName} {model.sizeEstimate && `(${model.sizeEstimate})`} - {model.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {discoveryError && (
            <div className="text-xs text-destructive mt-1">
              Fehler bei der Model-Erkennung: {discoveryError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
