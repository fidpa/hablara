/**
 * LLM Error Toast Messages (Deutsch)
 *
 * Zentrale Sammlung aller Toast-Nachrichten für LLM-Fehler.
 * Nutzt globale toast() Funktion aus use-toast.ts (Listener-Pattern).
 */

import { toast } from "@/hooks/use-toast";
import type { LLMError } from "./error-types";

interface ErrorToastConfig {
  title: string;
  description: string;
  variant: "destructive";
  duration: number;
}

/**
 * Error Messages Map
 * Key: `${type}-${provider}` (z.B. "offline-ollama")
 * Value: Toast-Konfiguration (Titel, Beschreibung, Variant, Duration)
 */
const ERROR_MESSAGES: Record<string, ErrorToastConfig> = {
  // ===== OFFLINE =====
  "offline-ollama": {
    title: "Ollama nicht erreichbar",
    description: "Bitte Ollama starten: brew services start ollama",
    variant: "destructive",
    duration: 6000,
  },
  "offline-openai": {
    title: "OpenAI nicht erreichbar",
    description: "Keine Internetverbindung oder OpenAI-Server nicht verfügbar.",
    variant: "destructive",
    duration: 5000,
  },
  "offline-anthropic": {
    title: "Anthropic nicht erreichbar",
    description: "Keine Internetverbindung oder Anthropic-Server nicht verfügbar.",
    variant: "destructive",
    duration: 5000,
  },

  // ===== AUTH =====
  "auth-ollama": {
    title: "Ollama Authentifizierung fehlgeschlagen",
    description: "Bitte Ollama-Konfiguration in den Einstellungen prüfen.",
    variant: "destructive",
    duration: 6000,
  },
  "auth-openai": {
    title: "OpenAI API Key fehlt oder ungültig",
    description: "Bitte in Einstellungen einen gültigen API Key hinterlegen.",
    variant: "destructive",
    duration: 8000,
  },
  "auth-anthropic": {
    title: "Anthropic API Key fehlt oder ungültig",
    description: "Bitte in Einstellungen einen gültigen API Key hinterlegen.",
    variant: "destructive",
    duration: 8000,
  },

  // ===== TIMEOUT =====
  "timeout-ollama": {
    title: "Ollama Request Timeout",
    description: "Die Anfrage hat zu lange gedauert. Bitte erneut versuchen.",
    variant: "destructive",
    duration: 5000,
  },
  "timeout-openai": {
    title: "OpenAI Request Timeout",
    description: "Die Anfrage hat zu lange gedauert. Bitte erneut versuchen.",
    variant: "destructive",
    duration: 5000,
  },
  "timeout-anthropic": {
    title: "Anthropic Request Timeout",
    description: "Die Anfrage hat zu lange gedauert. Bitte erneut versuchen.",
    variant: "destructive",
    duration: 5000,
  },

  // ===== RATE_LIMIT =====
  "rate_limit-ollama": {
    title: "Ollama Rate Limit erreicht",
    description: "Zu viele Anfragen. Bitte kurz warten und erneut versuchen.",
    variant: "destructive",
    duration: 6000,
  },
  "rate_limit-openai": {
    title: "OpenAI Rate Limit erreicht",
    description: "Zu viele Anfragen. Bitte kurz warten oder API-Limit in OpenAI-Dashboard prüfen.",
    variant: "destructive",
    duration: 7000,
  },
  "rate_limit-anthropic": {
    title: "Anthropic Rate Limit erreicht",
    description: "Zu viele Anfragen. Bitte kurz warten oder API-Limit in Anthropic-Dashboard prüfen.",
    variant: "destructive",
    duration: 7000,
  },

  // ===== SERVER_ERROR =====
  "server_error-ollama": {
    title: "Ollama Server-Fehler",
    description: "Interner Server-Fehler. Bitte Ollama neu starten: brew services restart ollama",
    variant: "destructive",
    duration: 6000,
  },
  "server_error-openai": {
    title: "OpenAI Server-Fehler",
    description: "Interner Server-Fehler bei OpenAI. Bitte später erneut versuchen.",
    variant: "destructive",
    duration: 5000,
  },
  "server_error-anthropic": {
    title: "Anthropic Server-Fehler",
    description: "Interner Server-Fehler bei Anthropic. Bitte später erneut versuchen.",
    variant: "destructive",
    duration: 5000,
  },

  // ===== UNKNOWN =====
  "unknown-ollama": {
    title: "Unbekannter Ollama-Fehler",
    description: "Ein unerwarteter Fehler ist aufgetreten. Bitte Logs prüfen.",
    variant: "destructive",
    duration: 5000,
  },
  "unknown-openai": {
    title: "Unbekannter OpenAI-Fehler",
    description: "Ein unerwarteter Fehler ist aufgetreten. Bitte Logs prüfen.",
    variant: "destructive",
    duration: 5000,
  },
  "unknown-anthropic": {
    title: "Unbekannter Anthropic-Fehler",
    description: "Ein unerwarteter Fehler ist aufgetreten. Bitte Logs prüfen.",
    variant: "destructive",
    duration: 5000,
  },
};

/**
 * Zeigt einen Toast für LLM-Fehler an
 *
 * Nutzt globale toast() Funktion aus use-toast.ts.
 * Fallback auf Generic-Message wenn ErrorType + Provider nicht in Map.
 *
 * @param error - LLMError Object (aus createLLMError)
 */
export function showLLMErrorToast(error: LLMError): void {
  const key = `${error.type}-${error.provider}`;
  const config = ERROR_MESSAGES[key];

  if (config) {
    // Passende Nachricht gefunden
    toast({
      title: config.title,
      description: config.description,
      variant: config.variant,
      duration: config.duration,
    });
  } else {
    // Fallback: Generic-Nachricht
    toast({
      title: `${error.provider.toUpperCase()} Fehler`,
      description: `Ein Fehler ist bei ${error.method} aufgetreten: ${error.message}`,
      variant: "destructive",
      duration: 5000,
    });
  }
}
