"use client";

/**
 * OllamaTroubleshootingSection - Ollama setup troubleshooting UI
 *
 * Displays setup instructions when Ollama is offline or model is missing.
 * Shows platform-specific terminal commands (bash/PowerShell).
 */

import { useCallback } from "react";
import { isTauri, isWindows } from "@/lib/utils";
import { logger } from "@/lib/logger";
import type { LLMProviderStatus } from "@/lib/types";

interface OllamaTroubleshootingSectionProps {
  providerStatus: LLMProviderStatus;
  model: string;
}

/**
 * Ollama setup troubleshooting section
 * @returns Troubleshooting UI or null if not needed
 */
export function OllamaTroubleshootingSection({
  providerStatus,
  model,
}: OllamaTroubleshootingSectionProps): JSX.Element | null {
  // Only show for offline or model-missing states
  if (providerStatus !== "offline" && providerStatus !== "model-missing") {
    return null;
  }

  // Open external URL (Tauri-safe)
  const openExternalUrl = useCallback(async (url: string): Promise<void> => {
    if (isTauri()) {
      try {
        const { open } = await import("@tauri-apps/plugin-shell");
        await open(url);
      } catch (error) {
        logger.error("OllamaTroubleshootingSection", "Failed to open external URL", error);
      }
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, []);

  // Generate terminal command based on model and platform
  const getTerminalCommand = (): string => {
    if (model.includes("custom")) {
      return isWindows()
        ? 'Invoke-WebRequest -Uri "https://raw.githubusercontent.com/fidpa/hablara/main/scripts/setup-ollama-win.ps1" -OutFile "$env:TEMP\\setup-ollama-win.ps1"; & "$env:TEMP\\setup-ollama-win.ps1"'
        : "curl -fsSL https://raw.githubusercontent.com/fidpa/hablara/main/scripts/setup-ollama-linux.sh | bash";
    }
    return `ollama pull ${model}`;
  };

  return (
    <div className="mt-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
      <div className="font-semibold text-slate-700 dark:text-slate-200">
        Ollama Setup erforderlich:
      </div>

      {providerStatus === "offline" ? (
        <>
          <p className="text-slate-500 dark:text-slate-400">
            Ollama läuft nicht oder ist nicht installiert.
          </p>
          <button
            type="button"
            onClick={() => openExternalUrl("https://ollama.com/download")}
            className="text-blue-600 dark:text-blue-400 hover:underline block text-left"
          >
            1. Ollama herunterladen & installieren
          </button>
        </>
      ) : (
        <p className="text-slate-500 dark:text-slate-400">
          Ollama läuft, aber das Modell fehlt.
        </p>
      )}

      <p className="text-slate-500 dark:text-slate-400">
        2. Terminal öffnen und Befehl ausführen:
      </p>
      <div className="bg-black p-2 rounded font-mono text-slate-600 dark:text-slate-300 select-all overflow-x-auto whitespace-nowrap">
        {getTerminalCommand()}
      </div>

      {model.includes("custom") && (
        <div className="text-slate-500 dark:text-slate-400 mt-1 italic">
          (Installiert Ollama + qwen2.5 + Custom Model)
        </div>
      )}
    </div>
  );
}
