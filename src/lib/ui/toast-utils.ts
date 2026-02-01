/**
 * Toast Utility Functions
 *
 * Zentrale Hilfsfunktionen für Toast-Benachrichtigungen.
 * Referenz: docs/reference/ui/TOAST_NOTIFICATIONS.md
 */

import type { LLMError } from "../llm/error-types";
import type { FinderRevealError } from "./finder-utils";
import { getFinderErrorMessage } from "./finder-utils";

/**
 * Toast-Funktion Interface (von use-toast.ts)
 */
export type ToastFn = (props: {
  variant?: "default" | "destructive";
  title: string;
  description?: string;
  duration?: number;
}) => void;

/**
 * Provider-Namen für Titel
 */
const PROVIDER_TITLES: Record<string, string> = {
  ollama: "Ollama",
  openai: "OpenAI",
  anthropic: "Anthropic",
};

/**
 * Zeigt einen Error-Toast (P0 - Kritisch)
 * Duration: undefined = User muss schließen
 */
export function showErrorToast(
  toast: ToastFn,
  title: string,
  description: string
): void {
  toast({
    variant: "destructive",
    title,
    description,
    duration: undefined, // User muss schließen
  });
}

/**
 * Zeigt einen Warning-Toast (P1)
 * Duration: 5 Sekunden
 */
export function showWarningToast(
  toast: ToastFn,
  title: string,
  description: string
): void {
  toast({
    variant: "default",
    title: `${title}`,
    description,
    duration: 5000,
  });
}

/**
 * Zeigt einen Info-Toast (P2)
 * Duration: 2 Sekunden
 */
export function showInfoToast(
  toast: ToastFn,
  title: string,
  description?: string
): void {
  toast({
    variant: "default",
    title,
    description,
    duration: 2000,
  });
}

/**
 * Zeigt einen Success-Toast (P2)
 * Duration: 2 Sekunden
 */
export function showSuccessToast(
  toast: ToastFn,
  title: string,
  description?: string
): void {
  toast({
    variant: "default",
    title,
    description,
    duration: 2000,
  });
}

/**
 * Zeigt LLM-spezifischen Error-Toast (P0)
 *
 * @param toast - Toast-Funktion von useToast Hook
 * @param error - Strukturierter LLMError
 */
export function showLLMErrorToast(toast: ToastFn, error: LLMError): void {
  const providerName = PROVIDER_TITLES[error.provider] || error.provider;
  const title = `${providerName} Fehler`;

  // Action als Teil der Description anhängen wenn vorhanden
  const description = error.action
    ? `${error.userMessage}\n${error.action}`
    : error.userMessage;

  showErrorToast(toast, title, description);
}

/**
 * Zeigt Audio-Fehler-Toast (P0)
 */
export function showAudioErrorToast(
  toast: ToastFn,
  errorType: "no_device" | "permission_denied" | "capture_failed" | "buffer_overflow",
  details?: string
): void {
  const messages: Record<string, { title: string; description: string }> = {
    no_device: {
      title: "Kein Mikrofon",
      description: "Kein Eingabegerät gefunden. Bitte Mikrofon prüfen.",
    },
    permission_denied: {
      title: "Zugriff verweigert",
      description: "Mikrofon-Berechtigung verweigert. Bitte in Systemeinstellungen aktivieren.",
    },
    capture_failed: {
      title: "Aufnahme fehlgeschlagen",
      description: "Audioaufnahme fehlgeschlagen. Bitte App neu starten.",
    },
    buffer_overflow: {
      title: "Audiopuffer voll",
      description: "Audiopuffer voll. Aufnahme abgebrochen.",
    },
  };

  const msg = messages[errorType] || {
    title: "Audio-Fehler",
    description: details || "Ein Audiofehler ist aufgetreten.",
  };

  showErrorToast(toast, msg.title, msg.description);
}

/**
 * Zeigt Transkription-Fehler-Toast (P0)
 */
export function showTranscriptionErrorToast(
  toast: ToastFn,
  errorType: "whisper_unavailable" | "transcription_failed",
  details?: string
): void {
  const messages: Record<string, { title: string; description: string }> = {
    whisper_unavailable: {
      title: "Whisper nicht verfügbar",
      description: "Whisper nicht installiert. Bitte Setup ausführen.",
    },
    transcription_failed: {
      title: "Transkription fehlgeschlagen",
      description: details || "Transkription fehlgeschlagen. Audio möglicherweise beschädigt.",
    },
  };

  const msg = messages[errorType] || {
    title: "Transkription-Fehler",
    description: details || "Ein Transkriptionsfehler ist aufgetreten.",
  };

  showErrorToast(toast, msg.title, msg.description);
}

/**
 * Zeigt Storage-Fehler-Toast (P0)
 */
export function showStorageErrorToast(
  toast: ToastFn,
  errorType: "disk_full" | "save_failed",
  details?: string
): void {
  const messages: Record<string, { title: string; description: string }> = {
    disk_full: {
      title: "Speicher voll",
      description: "Kein Speicherplatz verfügbar. Bitte alte Aufnahmen löschen.",
    },
    save_failed: {
      title: "Speichern fehlgeschlagen",
      description: details || "Aufnahme konnte nicht gespeichert werden.",
    },
  };

  const msg = messages[errorType] || {
    title: "Speicher-Fehler",
    description: details || "Ein Speicherfehler ist aufgetreten.",
  };

  showErrorToast(toast, msg.title, msg.description);
}

/**
 * Zeigt Finder-Fehler-Toast (P1)
 *
 * @param toast - Toast-Funktion von useToast Hook
 * @param error - FinderRevealError Type
 */
export function showFinderErrorToast(
  toast: ToastFn,
  error: FinderRevealError
): void {
  showWarningToast(toast, "Datei nicht verfügbar", getFinderErrorMessage(error));
}
