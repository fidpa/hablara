/**
 * LLM Error Classification System
 *
 * Strukturierte Error-Typen für LLM-Client-Fehler mit
 * automatischer Klassifizierung basierend auf Error-Messages.
 *
 * Referenz: docs/reference/ui/TOAST_NOTIFICATIONS.md
 */

import type { LLMProvider } from "../types";

// Re-export LLMProvider for consumers of error-types.ts
export type { LLMProvider };

export type LLMErrorType =
  | "offline"      // Provider nicht erreichbar (LLM-001)
  | "auth"         // API Key fehlt/ungültig (LLM-003, LLM-004)
  | "timeout"      // Request timeout (LLM-002)
  | "rate_limit"   // Rate Limit erreicht (API-001)
  | "server_error" // Server-Fehler (LLM-006)
  | "keychain"     // Keychain gesperrt (LLM-005)
  | "unknown";     // Unbekannter Fehler (Fallback)

export interface LLMError {
  type: LLMErrorType;
  provider: LLMProvider;
  method: string;
  message: string;
  userMessage: string;  // User-freundliche Nachricht (Deutsch)
  action?: string;      // Empfohlene Aktion
  timestamp: number;
}

/**
 * Type Guard für LLMError
 */
export function isLLMError(error: unknown): error is LLMError {
  return (
    error !== null &&
    typeof error === "object" &&
    "type" in error &&
    "provider" in error &&
    "userMessage" in error
  );
}

/**
 * Provider-Namen für User-facing Messages
 */
const PROVIDER_NAMES: Record<LLMProvider, string> = {
  ollama: "Ollama",
  openai: "OpenAI",
  anthropic: "Anthropic",
};

/**
 * User-Messages für jeden Error-Typ (Deutsch)
 */
function getUserMessage(type: LLMErrorType, provider: LLMProvider): string {
  const name = PROVIDER_NAMES[provider];

  switch (type) {
    case "offline":
      return provider === "ollama"
        ? "Ollama ist nicht erreichbar. Bitte stellen Sie sicher, dass Ollama läuft."
        : `${name} ist nicht erreichbar. Bitte Internetverbindung prüfen.`;
    case "auth":
      return `${name} API-Key ungültig. Bitte in den Einstellungen prüfen.`;
    case "timeout":
      return `${name} antwortet nicht (Timeout). Bitte erneut versuchen.`;
    case "rate_limit":
      return "Zu viele Anfragen. Bitte 30 Sekunden warten.";
    case "server_error":
      return `${name} Server-Fehler. Bitte später erneut versuchen.`;
    case "keychain":
      return "Schlüsselbund gesperrt oder Zugriff verweigert. Bitte entsperren und erneut versuchen.";
    default:
      return "Ein unbekannter Fehler ist aufgetreten. Bitte erneut versuchen.";
  }
}

/**
 * Optionale Aktionen für Error-Typen
 */
function getAction(type: LLMErrorType, provider: LLMProvider): string | undefined {
  switch (type) {
    case "offline":
      return provider === "ollama" ? "Terminal: ollama serve" : undefined;
    case "auth":
      return "Einstellungen öffnen";
    default:
      return undefined;
  }
}

/**
 * Extract HTTP status code from error message
 * @param error - Raw Error Object
 * @returns HTTP status code or null if not found
 */
function extractHttpStatus(error: unknown): number | null {
  const msg = String(error);
  const statusMatch = msg.match(/\b(4\d{2}|5\d{2})\b/);
  return statusMatch && statusMatch[1] ? parseInt(statusMatch[1], 10) : null;
}

/**
 * Klassifiziert einen Error basierend auf Message-Content
 *
 * @param error - Raw Error Object (TypeError, Error, String, etc.)
 * @param provider - LLM Provider Name
 * @returns LLMErrorType
 */
export function classifyLLMErrorType(error: unknown, _provider: LLMProvider): LLMErrorType {
  const msg = String(error).toLowerCase();
  const httpStatus = extractHttpStatus(error);

  // HTTP Status first (more reliable than string matching)
  if (httpStatus === 429) return "rate_limit";
  if (httpStatus === 401 || httpStatus === 403) return "auth";
  if (httpStatus && httpStatus >= 500) return "server_error";

  // Offline: TypeError mit "fetch" oder "network" oder "connection"
  if (error instanceof TypeError && (msg.includes("fetch") || msg.includes("network"))) {
    return "offline";
  }
  if (msg.includes("connection refused") || msg.includes("econnrefused")) {
    return "offline";
  }
  if (msg.includes("failed to fetch") || msg.includes("network error")) {
    return "offline";
  }

  // Keychain: Keyring/Keychain-spezifische Fehler (LLM-005)
  if (msg.includes("keychain") || msg.includes("keyring") || msg.includes("locked") || msg.includes("denied")) {
    return "keychain";
  }

  // Auth: API Key nicht konfiguriert oder ungültig
  if (msg.includes("api key") || msg.includes("unauthorized") || msg.includes("401")) {
    return "auth";
  }
  if (msg.includes("not configured") || msg.includes("missing key")) {
    return "auth";
  }
  if (msg.includes("invalid_api_key") || msg.includes("incorrect api key")) {
    return "auth";
  }

  // Timeout: Aborted oder Timeout-Messages
  if (msg.includes("timeout") || msg.includes("aborted")) {
    return "timeout";
  }
  if (msg.includes("timed out") || msg.includes("deadline exceeded")) {
    return "timeout";
  }

  // Rate Limit: 429 oder "too many requests"
  if (msg.includes("429") || msg.includes("rate limit") || msg.includes("too many requests")) {
    return "rate_limit";
  }

  // Server Error: 500er Codes oder "internal error"
  if (msg.includes("500") || msg.includes("503") || msg.includes("502") || msg.includes("504")) {
    return "server_error";
  }
  if (msg.includes("internal error") || msg.includes("service unavailable")) {
    return "server_error";
  }

  // Unknown: Fallback für unbekannte Fehlertypen
  return "unknown";
}

/**
 * Erstellt ein strukturiertes LLMError-Objekt mit User-Message
 *
 * @param error - Raw Error Object
 * @param provider - LLM Provider Name
 * @param method - Name der fehlgeschlagenen Methode
 * @returns LLMError Object mit userMessage und optionaler action
 */
export function createLLMError(
  error: unknown,
  provider: LLMProvider,
  method: string
): LLMError {
  const type = classifyLLMErrorType(error, provider);
  const message = error instanceof Error ? error.message : String(error);

  return {
    type,
    provider,
    method,
    message,
    userMessage: getUserMessage(type, provider),
    action: getAction(type, provider),
    timestamp: Date.now(),
  };
}

/**
 * Legacy-Alias für Kompatibilität
 * @deprecated Nutze classifyLLMErrorType stattdessen
 */
export const classifyLLMError = classifyLLMErrorType;
