"use client";

/**
 * useOnboarding - Manages the first-time user onboarding flow
 *
 * Handles the three-stage onboarding process:
 * 1. Permission Onboarding (microphone access)
 * 2. Setup Hints Modal (LLM provider setup)
 * 3. Onboarding Tour (UI walkthrough)
 *
 * @see docs-dev/explanation/implementation-logs/PHASE_40_SETUP_HINTS_MODAL.md
 * @see docs-dev/explanation/implementation-logs/PHASE_49_PERMISSION_ONBOARDING.md
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { STORAGE_KEYS, ONBOARDING_TIMINGS, PERMISSION_TIMINGS } from "@/lib/types";
import { logger } from "@/lib/logger";

interface UseOnboardingReturn {
  // State
  showPermissions: boolean;
  showSetupHints: boolean;
  showTour: boolean;
  showShortcuts: boolean;

  // Handlers
  handlePermissionsComplete: () => void;
  handlePermissionsSkip: () => void;
  handleSetupHintsClose: (startTour: boolean) => void;
  handleRestartSetupHints: () => void;
  handleOpenSettingsFromSetupHints: (openSettings: () => void) => void;
  setShowShortcuts: (show: boolean) => void;
  setShowTour: (show: boolean) => void;
}

export function useOnboarding(): UseOnboardingReturn {
  const [showPermissions, setShowPermissions] = useState(false);
  const [showSetupHints, setShowSetupHints] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const tourDelayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // First-time detection: Permission onboarding → Setup hints modal → Tour
  useEffect(() => {
    // SSR safety check
    if (typeof window === "undefined") return;

    try {
      const permissionsGranted = localStorage.getItem(STORAGE_KEYS.PERMISSIONS_GRANTED);
      const setupHintsSeen = localStorage.getItem(STORAGE_KEYS.SETUP_HINTS_SEEN);
      const tourCompleted = localStorage.getItem(STORAGE_KEYS.TOUR_COMPLETED);

      // Stage 0: Permission onboarding (before everything)
      if (permissionsGranted !== "true") {
        const timer = setTimeout(() => {
          setShowPermissions(true);
        }, PERMISSION_TIMINGS.checkDelayMs);
        return () => clearTimeout(timer);
      }
      // Stage 1: Setup hints
      else if (setupHintsSeen !== "true") {
        // Fresh user (permissions granted) → Show modal after delay
        const timer = setTimeout(() => {
          setShowSetupHints(true);
        }, ONBOARDING_TIMINGS.setupHintsDelayMs);
        return () => clearTimeout(timer);
      }
      // Stage 2: Tour
      else if (tourCompleted !== "true") {
        // Returning user (setup hints seen, but tour not completed)
        // Direct tour after delay
        const timer = setTimeout(() => {
          setShowTour(true);
        }, ONBOARDING_TIMINGS.tourStartDelayMs);
        return () => clearTimeout(timer);
      }
    } catch (error) {
      logger.error("Onboarding", "localStorage check failed", error);
    }
  }, []);

  // Cleanup tour delay timer on unmount
  useEffect(() => {
    return () => {
      if (tourDelayTimerRef.current) {
        clearTimeout(tourDelayTimerRef.current);
      }
    };
  }, []);

  // Permission onboarding complete handler
  const handlePermissionsComplete = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PERMISSIONS_GRANTED, "true");
    } catch (error) {
      logger.error("Onboarding", "Failed to save permissions granted flag", error);
    }
    setShowPermissions(false);

    // Continue to Stage 1: Setup Hints
    setTimeout(() => {
      setShowSetupHints(true);
    }, ONBOARDING_TIMINGS.setupHintsDelayMs);
  }, []);

  // Permission onboarding skip handler (hidden "Später" link)
  const handlePermissionsSkip = useCallback(() => {
    // CRITICAL: Do NOT set localStorage flag - screen will appear again on next launch
    setShowPermissions(false);
    logger.info("Onboarding", "Permission onboarding skipped by user");

    // Continue to Stage 1: Setup Hints anyway (graceful degradation)
    setTimeout(() => {
      setShowSetupHints(true);
    }, ONBOARDING_TIMINGS.setupHintsDelayMs);
  }, []);

  // Setup hints close handler
  const handleSetupHintsClose = useCallback((startTour: boolean) => {
    setShowSetupHints(false);

    if (startTour) {
      // Clear any existing timer
      if (tourDelayTimerRef.current) {
        clearTimeout(tourDelayTimerRef.current);
      }

      // Delay before starting tour (smooth transition)
      tourDelayTimerRef.current = setTimeout(() => {
        setShowTour(true);
        tourDelayTimerRef.current = null;
      }, ONBOARDING_TIMINGS.modalToTourTransitionMs);
    }
  }, []);

  // Setup hints → Settings navigation handler
  const handleOpenSettingsFromSetupHints = useCallback((openSettings: () => void) => {
    setShowSetupHints(false);
    openSettings();
  }, []);

  // Restart setup hints handler (called from Settings)
  const handleRestartSetupHints = useCallback(() => {
    setShowTour(false); // Close tour if running
    setShowSetupHints(true);
  }, []);

  return {
    showPermissions,
    showSetupHints,
    showTour,
    showShortcuts,
    handlePermissionsComplete,
    handlePermissionsSkip,
    handleSetupHintsClose,
    handleRestartSetupHints,
    handleOpenSettingsFromSetupHints,
    setShowShortcuts,
    setShowTour,
  };
}
