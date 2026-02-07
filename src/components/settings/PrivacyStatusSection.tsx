"use client";

/**
 * PrivacyStatusSection - Datenschutz-Status-Anzeige
 *
 * Dynamisches Badge: Grün (offline/Ollama) oder Gelb (cloud/OpenAI/Anthropic).
 * GDPR Art. 13 Info: Data Location, Cloud Provider Warning, One-Click Switch-to-Local.
 */

import { ShieldCheck, Cloud, Lock, Info, AlertTriangle } from "lucide-react";
import type { AppSettings } from "@/lib/types";
import { DEFAULT_STORAGE_PATH } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { isTauri } from "@/lib/utils";
import { useCallback } from "react";
import { logger } from "@/lib/logger";

interface PrivacyStatusSectionProps {
  settings: AppSettings;
  storagePath?: string;
  onSwitchToLocal?: () => void;
}

export function PrivacyStatusSection({
  settings,
  storagePath,
  onSwitchToLocal,
}: PrivacyStatusSectionProps): JSX.Element {
  const isCloudActive = settings.llm.provider === "openai" || settings.llm.provider === "anthropic";
  const cloudProviderName = settings.llm.provider === "openai" ? "OpenAI" : settings.llm.provider === "anthropic" ? "Anthropic" : null;

  // Open external URL (Tauri-safe)
  const openExternalUrl = useCallback(async (url: string) => {
    if (isTauri()) {
      try {
        const { open } = await import("@tauri-apps/plugin-shell");
        await open(url);
      } catch (error) {
        logger.error("PrivacyStatusSection", "Failed to open external URL", error);
      }
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Privacy Status Badge */}
      <div className={`rounded-lg border p-4 ${isCloudActive ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
        <div className="flex items-start gap-3">
          {isCloudActive ? (
            <Cloud className="w-5 h-5 text-amber-600 mt-0.5" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-green-600 mt-0.5" />
          )}
          <div className="flex-1 space-y-2">
            <h3 className={`font-medium ${isCloudActive ? 'text-amber-900' : 'text-green-900'}`}>
              {isCloudActive ? "Cloud-Analyse aktiv" : "Vollständig offline"}
            </h3>
            <p className={`text-sm ${isCloudActive ? 'text-amber-700' : 'text-green-700'}`}>
              {isCloudActive
                ? `Texte werden zur KI-Analyse an ${cloudProviderName} gesendet. Audio-Aufnahmen bleiben lokal auf Ihrem Gerät.`
                : "Alle Ihre Daten bleiben auf diesem Gerät. Keine Informationen werden an externe Server übermittelt."}
            </p>

            {/* Cloud Warning with Action */}
            {isCloudActive && onSwitchToLocal && (
              <div className="mt-3 pt-3 border-t border-amber-200">
                <div className="flex items-start gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    {cloudProviderName} kann diese Daten für Modellverbesserungen nutzen.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onSwitchToLocal}
                    className="text-xs h-7"
                  >
                    Zu Ollama (lokal) wechseln
                  </Button>
                  {cloudProviderName === "OpenAI" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => openExternalUrl("https://openai.com/privacy")}
                    >
                      <Info className="w-3 h-3 mr-1" />
                      Privacy Policy
                    </Button>
                  )}
                  {cloudProviderName === "Anthropic" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => openExternalUrl("https://www.anthropic.com/privacy")}
                    >
                      <Info className="w-3 h-3 mr-1" />
                      Privacy Policy
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Location Info */}
      <div className="space-y-3 text-sm text-muted-foreground">
        <h4 className="font-medium text-foreground flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Wo werden meine Daten gespeichert?
        </h4>
        <div className="space-y-2 pl-6">
          <div>
            <span className="font-medium">Audio-Aufnahmen:</span>{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded break-all">
              {storagePath || DEFAULT_STORAGE_PATH}
            </code>
          </div>
          <div>
            <span className="font-medium">Transkripte & Analysen:</span> Zusammen mit den Audio-Dateien als JSON-Metadaten (lokal)
          </div>
          <div>
            <span className="font-medium">API-Schlüssel:</span> Im macOS Schlüsselbund (AES-256 verschlüsselt, nie im Klartext)
          </div>
          <div>
            <span className="font-medium">App-Einstellungen:</span> Im Browser localStorage (lokal, ohne Synchronisation)
          </div>
        </div>
        <p className="text-xs italic pl-6">
          Hablará ist eine Desktop-App ohne eigene Server - alle Daten bleiben vollständig auf Ihrem Gerät.
        </p>
      </div>
    </div>
  );
}
