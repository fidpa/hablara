"use client";

/**
 * OllamaTroubleshootingSection - Ollama setup troubleshooting UI
 *
 * Displays setup instructions when Ollama is offline or model is missing.
 * Shows platform-specific terminal commands (bash/PowerShell).
 */

import { useCallback, useState, useRef, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import { isTauri, isWindows, isMacOS } from "@/lib/utils";
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
  const [isCopied, setIsCopied] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

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

  // Only show for offline or model-missing states
  if (providerStatus !== "offline" && providerStatus !== "model-missing") {
    return null;
  }

  const handleCopy = async (text: string) => {
    try {
      if (isTauri()) {
        const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
        await writeText(text);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setIsCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      logger.error("OllamaTroubleshootingSection", "Copy failed", error);
    }
  };

  // Generate terminal command based on model and platform
  const getTerminalCommand = (): string => {
    if (model.includes("custom")) {
      if (isWindows()) {
        return 'Invoke-WebRequest -Uri "https://raw.githubusercontent.com/fidpa/hablara/main/scripts/setup-ollama-win.ps1" -OutFile "$env:TEMP\\setup-ollama-win.ps1"; & "$env:TEMP\\setup-ollama-win.ps1"';
      }
      const script = isMacOS() ? "setup-ollama-mac.sh" : "setup-ollama-linux.sh";
      return `curl -fsSL https://raw.githubusercontent.com/fidpa/hablara/main/scripts/${script} | bash`;
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

      <div className="flex items-center justify-between">
        <p className="text-slate-500 dark:text-slate-400">
          2. Terminal öffnen und Befehl ausführen:
        </p>
        <button
          type="button"
          onClick={() => handleCopy(getTerminalCommand())}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          aria-label="Befehl kopieren"
          title="In Zwischenablage kopieren"
        >
          {isCopied ? (
            <>
              <Check className="w-3 h-3 text-green-500" />
              <span>Kopiert</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Kopieren</span>
            </>
          )}
        </button>
      </div>
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
