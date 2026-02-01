"use client";

/**
 * ConsentModal - GDPR Consent für Cloud LLM-Provider
 *
 * Modal zur Einholung expliziter Einwilligung vor Nutzung von OpenAI/Anthropic APIs.
 * Zeigt Provider-Name, Datenschutz-Links, Datenverarbeitung-Hinweis.
 */

import { useState, useCallback } from "react";
import { X, ExternalLink, AlertCircle } from "lucide-react";
import type { CloudProviderConsent } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ConsentModalProps {
  provider: "openai" | "anthropic";
  isOpen: boolean;
  onConsent: (consent: CloudProviderConsent) => void;
  onDecline: () => void;
}

// Provider info as const for performance (no re-creation on every render)
const PROVIDER_INFO = {
  openai: {
    name: "OpenAI",
    privacyUrl: "https://openai.com/policies/privacy-policy",
    termsUrl: "https://openai.com/policies/terms-of-use",
  },
  anthropic: {
    name: "Anthropic",
    privacyUrl: "https://www.anthropic.com/legal/privacy",
    termsUrl: "https://www.anthropic.com/legal/consumer-terms",
  },
} as const;

/**
 * GDPR Consent Modal for Cloud Providers
 *
 * Shows data processing notice and privacy policy links before
 * allowing user to switch to OpenAI or Anthropic.
 *
 * Compliance:
 * - GDPR Art. 6(1)(a): Consent must be freely given, specific, informed, and unambiguous
 * - GDPR Art. 7(3): User must be able to withdraw consent
 * - GDPR Art. 13: Information about data processing must be provided
 */
export function ConsentModal({
  provider,
  isOpen,
  onConsent,
  onDecline,
}: ConsentModalProps): JSX.Element | null {
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // REACT_TSX Rule #3: Event handlers should use useCallback
  const handleConsent = useCallback(() => {
    if (!agreedToTerms) return;

    const consent: CloudProviderConsent = {
      provider,
      agreed: true,
      timestamp: new Date().toISOString(),
      version: "1.0", // Consent version (for future updates)
    };

    onConsent(consent);
  }, [agreedToTerms, provider, onConsent]);

  if (!isOpen) return null;

  const info = PROVIDER_INFO[provider];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative w-full max-w-2xl mx-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Datenschutzhinweis: {info.name} Integration
          </h2>
          <button
            type="button"
            onClick={onDecline}
            aria-label="Dialog schließen"
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Data Processing Notice */}
          <div className="flex items-start gap-2 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/30 border-[1px] border-blue-200/50 dark:border-blue-500/50">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-200">
              <strong>Cloud-Verarbeitung:</strong> Bei Verwendung von {info.name} werden
              deine Transkripte an externe Server übertragen und verarbeitet.
            </div>
          </div>

          {/* Data Flow */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-900 dark:text-white">Datenfluss</h3>
            <ol className="text-sm text-slate-600 dark:text-slate-300 space-y-1 list-decimal list-inside">
              <li>Deine Sprachaufnahme wird lokal durch Whisper transkribiert</li>
              <li>Das Transkript wird an {info.name} API Server gesendet</li>
              <li>Die Analyse (Emotion, Fehlschlüsse, Ton) wird durchgeführt</li>
              <li>Das Ergebnis wird zurück an deine App gesendet</li>
            </ol>
          </div>

          {/* Data Not Sent */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-900 dark:text-white">Nicht übertragen</h3>
            <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
              <li>Audio-Dateien (nur Transkripte werden gesendet)</li>
              <li>Persönliche Einstellungen</li>
              <li>Gespeicherte Aufnahmen</li>
            </ul>
          </div>

          {/* Privacy & Terms Links */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-900 dark:text-white">Weitere Informationen</h3>
            <div className="flex flex-col gap-2">
              <a
                href={info.privacyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                {info.name} Datenschutzrichtlinie
              </a>
              <a
                href={info.termsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                {info.name} Nutzungsbedingungen
              </a>
            </div>
          </div>

          {/* Alternative: Ollama */}
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/30 border-[1px] border-green-200/50 dark:border-green-500/50">
            <p className="text-sm text-green-700 dark:text-green-200">
              <strong>Alternative:</strong> Ollama (Standard) ist vollständig lokal und sendet
              keine Daten an externe Server. Du kannst jederzeit zurückwechseln.
            </p>
          </div>

          {/* Consent Checkbox */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-primary focus-visible:ring-primary focus-visible:ring-offset-0"
              />
              <span className="text-sm text-slate-600 dark:text-slate-300">
                Ich habe die Datenschutzhinweise gelesen und stimme der Übertragung meiner
                Transkripte an {info.name} zu. Ich kann meine Einwilligung jederzeit durch
                Wechsel zu Ollama widerrufen.
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onDecline}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Ablehnen
          </button>
          <button
            type="button"
            onClick={handleConsent}
            disabled={!agreedToTerms}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              agreedToTerms
                ? "bg-primary text-white hover:bg-primary/90"
                : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
            )}
          >
            Zustimmen und fortfahren
          </button>
        </div>
      </div>
    </div>
  );
}
