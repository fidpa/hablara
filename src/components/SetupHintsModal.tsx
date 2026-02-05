"use client";

/**
 * SetupHintsModal - First-time user onboarding modal
 *
 * Displays Ollama setup instructions for new users on first launch.
 * Shows quick setup steps, terminal command, and feature highlights.
 * Can be re-opened from Settings → Allgemein → Setup-Hinweise anzeigen.
 *
 * Flow:
 * 1. Fresh user: Modal appears after 1s delay
 * 2. User clicks "Verstanden, Tour starten" → Modal closes → Tour starts (500ms delay)
 * 3. User closes via X button or Escape key → Modal closes, no tour
 *
 * @see docs-dev/explanation/implementation-logs/PHASE_40_SETUP_HINTS_MODAL.md
 * @see docs/reference/guidelines/REACT_TSX.md Section 11 (Accessibility)
 * @see docs-dev/explanation/implementation-logs/PHASE_54_APP_STORE_UI_COMPLIANCE.md
 */

import { useCallback, useEffect, useState, useRef } from "react";
import { X, CheckCircle2, Info, Lock, HardDrive, Copy, Check, Cloud, Monitor, Settings } from "lucide-react";
import { STORAGE_KEYS, ONBOARDING_TIMINGS } from "@/lib/types";
import { logger } from "@/lib/logger";

// Build-time feature detection for App Store compliance (Guideline 2.4.5(ii))
const isAppStore = process.env.NEXT_PUBLIC_APP_STORE === "true";

interface SetupHintsModalProps {
  /** Whether the modal is currently visible */
  isOpen: boolean;
  /** Called when modal closes. Parameter indicates if tour should start. */
  onClose: (startTour: boolean) => void;
  /** Optional callback to open settings panel (for App Store version) */
  onOpenSettings?: () => void;
}

/**
 * Setup Hints Modal Component
 *
 * Renders a modal dialog with Ollama setup instructions.
 * Includes focus trap, keyboard navigation, and WCAG 2.1 AA compliance.
 */
export function SetupHintsModal({ isOpen, onClose, onOpenSettings }: SetupHintsModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleStartTour = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);

    try {
      localStorage.setItem(STORAGE_KEYS.SETUP_HINTS_SEEN, "true");
      logger.info("SetupHintsModal", "Setup hints seen, starting tour");
    } catch (error) {
      logger.error("SetupHintsModal", "Failed to save setup hints seen flag", error);
      // Check for quota exceeded error
      if (error instanceof DOMException && error.name === "QuotaExceededError") {
        logger.warn("SetupHintsModal", "localStorage quota exceeded - modal may reappear on next launch");
      }
      // Proceed anyway - graceful degradation
    }

    onClose(true);
  }, [isClosing, onClose]);

  const handleSkip = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);

    try {
      localStorage.setItem(STORAGE_KEYS.SETUP_HINTS_SEEN, "true");
      logger.info("SetupHintsModal", "Setup hints seen, skipped tour");
    } catch (error) {
      logger.error("SetupHintsModal", "Failed to save setup hints seen flag", error);
      // Check for quota exceeded error
      if (error instanceof DOMException && error.name === "QuotaExceededError") {
        logger.warn("SetupHintsModal", "localStorage quota exceeded - modal may reappear on next launch");
      }
      // Proceed anyway - graceful degradation
    }

    onClose(false);
  }, [isClosing, onClose]);

  // Ollama download URL and model pull command
  const ollamaDownloadUrl = "https://ollama.com/download";
  const modelPullCommand = "ollama pull qwen2.5:7b";

  // Copy model pull command to clipboard
  const handleCopyCommand = useCallback(async () => {
    // Clear any existing timeout
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }

    try {
      await navigator.clipboard.writeText(modelPullCommand);
      setIsCopied(true);
      logger.info("SetupHintsModal", "Model pull command copied to clipboard");

      // Reset copied state after delay
      copyTimeoutRef.current = setTimeout(() => {
        setIsCopied(false);
        copyTimeoutRef.current = null;
      }, ONBOARDING_TIMINGS.copyFeedbackResetMs);
    } catch (error) {
      logger.error("SetupHintsModal", "Failed to copy command to clipboard", error);
    }
  }, [modelPullCommand]);

  // Open Ollama download page
  const handleOpenOllamaDownload = useCallback(async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-shell");
      await open(ollamaDownloadUrl);
      logger.info("SetupHintsModal", "Opened Ollama download page");
    } catch (error) {
      logger.error("SetupHintsModal", "Failed to open Ollama download page", error);
      // Fallback: try window.open
      window.open(ollamaDownloadUrl, "_blank");
    }
  }, [ollamaDownloadUrl]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleSkip();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, handleSkip]);

  // Cleanup copy timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // Focus trap - scoped to modal only
  useEffect(() => {
    if (!isOpen) return;

    const modalElement = document.querySelector('[role="dialog"]');
    if (!modalElement) return;

    const focusableElements = modalElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const focusableArray = Array.from(focusableElements) as HTMLElement[];
    const firstElement = focusableArray[0];
    const lastElement = focusableArray[focusableArray.length - 1];

    // Set initial focus when modal opens
    firstElement?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    window.addEventListener("keydown", handleTab);
    return () => window.removeEventListener("keydown", handleTab);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-hints-title"
      aria-describedby="setup-hints-description"
    >
      <div className="relative w-full max-w-2xl mx-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <h2 id="setup-hints-title" className="text-lg font-semibold text-slate-900 dark:text-white">
              Willkommen bei Hablará!
            </h2>
          </div>
          <button
            onClick={handleSkip}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            aria-label="Dialog schließen"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div id="setup-hints-description" className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {isAppStore ? (
            // =====================================================
            // App Store Version - No terminal commands (Guideline 2.4.5(ii))
            // =====================================================
            <>
              {/* Intro */}
              <div className="text-slate-600 dark:text-slate-300">
                <p className="text-base font-medium mb-2">
                  KI-Analyse einrichten
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Wähle deinen KI-Provider für die Analyse deiner Sprachaufnahmen:
                </p>
              </div>

              {/* Option 1: Cloud Provider */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                    <Cloud className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-900 dark:text-white">Cloud (OpenAI / Anthropic)</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Schnell eingerichtet, API-Key erforderlich</p>
                  </div>
                </div>
                {onOpenSettings && (
                  <button
                    onClick={() => {
                      onOpenSettings();
                      // Mark as seen when navigating to settings
                      try {
                        localStorage.setItem(STORAGE_KEYS.SETUP_HINTS_SEEN, "true");
                      } catch (error) {
                        logger.error("SetupHintsModal", "Failed to save setup hints seen flag", error);
                      }
                    }}
                    className="w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Settings className="w-4 h-4" aria-hidden="true" />
                    <span>Zu Einstellungen</span>
                    <span className="text-blue-200">→</span>
                  </button>
                )}
              </div>

              {/* Option 2: Local (Ollama) */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-lg">
                    <Monitor className="w-5 h-5 text-green-600 dark:text-green-400" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-900 dark:text-white">Lokal (Ollama)</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">100% privat, keine Cloud-Verbindung</p>
                  </div>
                </div>
                <button
                  onClick={handleOpenOllamaDownload}
                  className="w-full px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                >
                  <span>Ollama herunterladen</span>
                  <span className="text-emerald-200">→ ollama.com</span>
                </button>
              </div>

              {/* Feature Badges */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded text-xs">
                  <Lock className="w-4 h-4 text-green-600 dark:text-green-400" aria-hidden="true" />
                  <span className="text-green-700 dark:text-green-300 font-medium">Lokale Analyse möglich</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded text-xs">
                  <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  <span className="text-blue-700 dark:text-blue-300 font-medium">Cloud-Provider verfügbar</span>
                </div>
              </div>

              {/* Info note */}
              <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded p-3">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-medium text-amber-600 dark:text-amber-400">Hinweis:</span> Nach Einrichtung eines Providers Hablará neu starten, damit die Änderungen wirksam werden.
                </p>
              </div>
            </>
          ) : (
            // =====================================================
            // Direct Distribution Version - Full setup with terminal commands
            // =====================================================
            <>
              {/* Intro */}
              <div className="text-slate-600 dark:text-slate-300">
                <p className="text-base font-medium mb-2">
                  Einmalige Einrichtung für KI-Analysen mit einem lokalen Sprachmodell
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Hablará nutzt Ollama für die KI-Verarbeitung. Die Einrichtung erfordert einen{" "}
                  <span className="text-blue-600 dark:text-blue-400 font-medium">Internetzugang</span> und deren Dauer ist abhängig von der{" "}
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Download-Geschwindigkeit</span>.
                </p>
              </div>

              {/* Setup Steps */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Setup-Schritte:</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      <span className="font-medium">1. Ollama installieren</span>
                      <span className="text-slate-500 dark:text-slate-400 block">Von der offiziellen Website herunterladen</span>
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      <span className="font-medium">2. KI-Modell herunterladen</span>
                      <span className="text-slate-500 dark:text-slate-400 block">Terminal: ollama pull qwen2.5:7b (~4.7 GB)</span>
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      <span className="font-medium">3. Hablará neu starten</span>
                      <span className="text-slate-500 dark:text-slate-400 block">Ollama wird automatisch erkannt</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Ollama Download Button */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">Schritt 1: Ollama installieren</h3>
                <button
                  onClick={handleOpenOllamaDownload}
                  className="w-full px-4 py-3 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                >
                  <span>Ollama herunterladen</span>
                  <span className="text-emerald-200">→ ollama.com</span>
                </button>
              </div>

              {/* Model Pull Command */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">Schritt 2: Modell laden (Terminal)</h3>
                <div className="relative bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-3 pr-12">
                  <code className="text-sm text-green-700 dark:text-green-400 font-mono">
                    {modelPullCommand}
                  </code>
                  <button
                    onClick={handleCopyCommand}
                    className="absolute top-2 right-2 p-2 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                    aria-label="Befehl kopieren"
                    title={isCopied ? "Kopiert!" : "In Zwischenablage kopieren"}
                  >
                    {isCopied ? (
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" aria-hidden="true" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isCopied ? "In Zwischenablage kopiert!" : "Nach Ollama-Installation im Terminal ausführen"}
                </p>
              </div>

              {/* Feature Badges */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded text-xs">
                  <Lock className="w-4 h-4 text-green-600 dark:text-green-400" aria-hidden="true" />
                  <span className="text-green-700 dark:text-green-300 font-medium">100% offline & lokal</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded text-xs">
                  <HardDrive className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  <span className="text-amber-700 dark:text-amber-300 font-medium">~5 GB Speicher</span>
                </div>
              </div>

              {/* Alternative */}
              <div className="bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded p-3">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-medium text-blue-600 dark:text-blue-400">Tipp:</span> OpenAI oder Anthropic funktionieren auch (API Key erforderlich,
                  Cloud-basiert). Einstellung in Settings → KI-Modelle.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleStartTour}
            disabled={isClosing}
            className="px-4 py-2 text-sm font-medium text-slate-900 dark:text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Verstanden, Tour starten
          </button>
        </div>
      </div>
    </div>
  );
}
