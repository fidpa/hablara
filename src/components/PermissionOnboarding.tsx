"use client";

/**
 * PermissionOnboarding - macOS Permission Request Screen
 *
 * Professional permission onboarding inspired by Bartender app.
 * Shows required permissions (Microphone) before main onboarding flow.
 * Displays status, provides request buttons, and recovery paths.
 *
 * Flow:
 * 1. Fresh user: Screen appears before SetupHintsModal
 * 2. Microphone status: authorized, denied, not_determined, checking
 * 3. User grants permission → "Weiter" button active → onComplete
 * 4. User skips (hidden "Später" link) → onSkip
 *
 * Features:
 * - Two-card layout (Microphone + Input Monitoring info)
 * - Status badges (Checking/Authorized/Denied)
 * - Request button (triggers system dialog)
 * - Recovery link (opens System Settings)
 * - Focus trap, Escape key, WCAG 2.1 AA
 *
 * @see docs/explanation/implementation-logs/PHASE_49_PERMISSION_ONBOARDING.md
 */

import { useCallback, useEffect, useState } from "react";
import { X, Mic, Keyboard, CheckCircle2, XCircle, Loader2, Lock, Info } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { logger } from "@/lib/logger";

interface PermissionOnboardingProps {
  /** Whether the modal is currently visible */
  isOpen: boolean;
  /** Called when user completes permission setup */
  onComplete: () => void;
  /** Called when user skips (hidden "Später" link) */
  onSkip: () => void;
}

/**
 * Permission Onboarding Component
 *
 * Renders a modal dialog with permission cards for Microphone and Input Monitoring.
 * Includes focus trap, keyboard navigation, and WCAG 2.1 AA compliance.
 */
export function PermissionOnboarding({ isOpen, onComplete, onSkip }: PermissionOnboardingProps) {
  const { microphoneStatus, isChecking, requestMicrophone, recheckPermissions } = usePermissions();
  const [isRequesting, setIsRequesting] = useState(false);

  /**
   * Handle microphone permission request
   * Triggers system dialog, updates status
   */
  const handleRequestMicrophone = useCallback(async () => {
    setIsRequesting(true);
    try {
      const granted = await requestMicrophone();
      logger.info("PermissionOnboarding", "Microphone permission request completed", { granted });

      if (!granted) {
        // Re-check status to ensure UI is in sync
        await recheckPermissions();
      }
    } catch (error) {
      logger.error("PermissionOnboarding", "Failed to request microphone permission", error);
    } finally {
      setIsRequesting(false);
    }
  }, [requestMicrophone, recheckPermissions]);

  /**
   * Open macOS System Settings to Privacy & Security → Microphone
   * User can manually grant permission if denied
   */
  const handleOpenSystemSettings = useCallback(async () => {
    try {
      // Check if in Tauri environment
      if (typeof window === "undefined" || !("__TAURI__" in window)) {
        logger.warn("PermissionOnboarding", "Not in Tauri environment - cannot open System Settings");
        return;
      }

      const { open } = await import("@tauri-apps/plugin-shell");
      await open("x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone");
      logger.info("PermissionOnboarding", "Opened System Settings for Microphone");
    } catch (error) {
      logger.error("PermissionOnboarding", "Failed to open System Settings", error);
    }
  }, []);

  /**
   * Handle "Weiter" button click
   * Only enabled when microphone is authorized
   */
  const handleContinue = useCallback(() => {
    logger.info("PermissionOnboarding", "User completed permission onboarding", {
      microphoneStatus,
    });
    onComplete();
  }, [microphoneStatus, onComplete]);

  /**
   * Handle "Später" link click (hidden)
   * Skips permission onboarding without setting localStorage flag
   * Screen will appear again on next launch
   */
  const handleSkip = useCallback(() => {
    logger.info("PermissionOnboarding", "User skipped permission onboarding");
    onSkip();
  }, [onSkip]);

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

  // Focus trap - scoped to modal only
  useEffect(() => {
    if (!isOpen) return;

    const modalElement = document.querySelector('[role="dialog"][aria-labelledby="permission-title"]');
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

  // Determine if user can continue (microphone authorized)
  const canContinue = microphoneStatus === "authorized";

  // Render status badge for microphone
  const renderMicrophoneStatus = (): React.ReactNode => {
    if (isChecking || isRequesting) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded text-sm">
          <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" aria-hidden="true" />
          <span className="text-blue-700 dark:text-blue-300 font-medium">Prüfe...</span>
        </div>
      );
    }

    if (microphoneStatus === "authorized") {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded text-sm">
          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" aria-hidden="true" />
          <span className="text-green-700 dark:text-green-300 font-medium">Autorisiert</span>
        </div>
      );
    }

    if (microphoneStatus === "denied") {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded text-sm">
          <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" aria-hidden="true" />
          <span className="text-red-700 dark:text-red-300 font-medium">Nicht autorisiert</span>
        </div>
      );
    }

    // not_determined
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded text-sm">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <span className="text-amber-700 dark:text-amber-300 font-medium">Berechtigung erforderlich</span>
        </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-labelledby="permission-title"
      aria-describedby="permission-description"
    >
      <div className="relative w-full max-w-3xl mx-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <h2 id="permission-title" className="text-lg font-semibold text-slate-900 dark:text-white">
              Hablará benötigt Berechtigungen
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

        {/* Content */}
        <div id="permission-description" className="p-6">
          {/* Permission Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Microphone Card */}
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Mikrofon</h3>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300">Erforderlich für Sprachaufnahmen</p>

              <ul className="space-y-1 text-sm text-slate-500 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400" aria-hidden="true">•</span>
                  <span>Lokale Verarbeitung</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400" aria-hidden="true">•</span>
                  <span>Keine Cloud-Upload</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400" aria-hidden="true">•</span>
                  <span>Daten verbleiben auf dem Gerät</span>
                </li>
              </ul>

              {/* Status Badge */}
              <div className="pt-2">{renderMicrophoneStatus()}</div>

              {/* Action Button */}
              {microphoneStatus === "not_determined" && (
                <button
                  onClick={handleRequestMicrophone}
                  disabled={isRequesting}
                  className="w-full px-4 py-2 text-sm font-medium text-slate-900 dark:text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRequesting ? "Anfrage läuft..." : "Berechtigung erteilen"}
                </button>
              )}

              {/* Recovery Link (Denied Status) */}
              {microphoneStatus === "denied" && (
                <div className="space-y-2">
                  <button
                    onClick={handleOpenSystemSettings}
                    className="w-full px-4 py-2 text-sm font-medium text-slate-900 dark:text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
                  >
                    Systemeinstellungen öffnen
                  </button>
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                    Mikrofonzugriff in Systemeinstellungen → Datenschutz & Sicherheit aktivieren
                  </p>
                </div>
              )}
            </div>

            {/* Input Monitoring Card (Info Only) */}
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Tastenkürzel</h3>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300">Optional - Wird vom Hotkey-Agent angefragt</p>

              <ul className="space-y-1 text-sm text-slate-500 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400" aria-hidden="true">•</span>
                  <span>Global Hotkey (Ctrl+Shift+D)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400" aria-hidden="true">•</span>
                  <span>Aufnahme starten aus jeder App</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400" aria-hidden="true">•</span>
                  <span>Später in Settings aktivierbar</span>
                </li>
              </ul>

              {/* Info Badge */}
              <div className="pt-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded text-sm">
                  <Info className="w-4 h-4 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                  <span className="text-purple-700 dark:text-purple-300 font-medium">Info</span>
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-500/5 border border-purple-200 dark:border-purple-500/20 rounded p-3">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Diese Berechtigung wird separat vom Hotkey-Agent angefragt. Sie können die App auch ohne Hotkey nutzen
                  (Button-basiert).
                </p>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleContinue}
              disabled={!canContinue}
              className="w-full max-w-md px-6 py-3 text-base font-medium text-slate-900 dark:text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
            >
              Weiter zur App
            </button>

            {/* Hidden "Später" Link */}
            <button
              onClick={handleSkip}
              className="text-sm text-slate-500 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition-colors underline"
            >
              Später einrichten
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
