"use client";

/**
 * MLXPathsSection - MLX-Whisper Custom Paths Configuration
 *
 * Konfiguration für Custom Python Path + Models Directory (~/mlx-whisper/models/).
 * File Picker Dialog (Tauri), Reset zu Defaults. Nur relevant für MLX-Whisper Provider.
 */

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { AppSettings } from "@/lib/types";
import { DEFAULT_MLX_PATHS } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface MLXPathsSectionProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export function MLXPathsSection({
  settings,
  onSettingsChange,
}: MLXPathsSectionProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {showAdvanced ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
        Erweiterte Pfadkonfiguration
      </button>

      {showAdvanced && (
        <div className="space-y-4 pl-6 pt-2 border-l-2 border-muted">
          <p className="text-xs text-muted-foreground">
            Umgebungsvariablen MLX_WHISPER_PYTHON und MLX_WHISPER_DIR haben Vorrang.
          </p>

          {/* Python Path */}
          <div className="space-y-2">
            <Label htmlFor="mlx-python-path">Python Interpreter</Label>
            <input
              id="mlx-python-path"
              type="text"
              value={settings.mlxPaths?.pythonPath || DEFAULT_MLX_PATHS.pythonPath}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  mlxPaths: {
                    ...settings.mlxPaths,
                    pythonPath: e.target.value,
                    modelsDir: settings.mlxPaths?.modelsDir || DEFAULT_MLX_PATHS.modelsDir,
                  },
                })
              }
              placeholder="~/.venvs/mlx-whisper/bin/python"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Pfad zum Python Interpreter im venv mit mlx-audio
            </p>
          </div>

          {/* Models Directory */}
          <div className="space-y-2">
            <Label htmlFor="mlx-models-dir">Modell-Verzeichnis</Label>
            <input
              id="mlx-models-dir"
              type="text"
              value={settings.mlxPaths?.modelsDir || DEFAULT_MLX_PATHS.modelsDir}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  mlxPaths: {
                    pythonPath: settings.mlxPaths?.pythonPath || DEFAULT_MLX_PATHS.pythonPath,
                    modelsDir: e.target.value,
                  },
                })
              }
              placeholder="~/mlx-whisper"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Verzeichnis mit MLX-Whisper Modell (german-turbo)
            </p>
          </div>

          {/* Reset to defaults */}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onSettingsChange({
                ...settings,
                mlxPaths: DEFAULT_MLX_PATHS,
              })
            }
          >
            Auf Standard zurücksetzen
          </Button>
        </div>
      )}
    </div>
  );
}
