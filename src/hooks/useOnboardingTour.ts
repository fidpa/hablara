"use client";

/**
 * Onboarding Tour Hook
 *
 * Manages the state and lifecycle of the onboarding tour for first-time users.
 * The tour automatically starts on first visit and persists completion state
 * in localStorage.
 *
 * Performance: Uses requestIdleCallback for optimal timing instead of fixed delay.
 *
 * @example
 * ```tsx
 * const { run, steps, handleJoyrideCallback } = useOnboardingTour({
 *   isModelLoading: false,
 * });
 * ```
 *
 * @see docs/reference/guidelines/REACT_TSX.md
 */

import { useState, useEffect, useCallback } from "react";
import type { CallBackProps } from "react-joyride";
import { STORAGE_KEYS } from "@/lib/types";
import { TOUR_STEPS } from "@/lib/tour-steps";

/** Minimum delay to allow initial paint (in milliseconds) */
const MIN_DELAY_MS = 300;

/** Maximum wait time before starting tour anyway (in milliseconds) */
const MAX_WAIT_MS = 1500;

/** First tour element selector to check for readiness */
const FIRST_TOUR_ELEMENT = "[data-tour-welcome]";

interface UseOnboardingTourOptions {
  /** If true, delays tour start until model loading completes */
  isModelLoading?: boolean;
  /** If provided, overrides auto-start logic and forces tour run state */
  forcedRun?: boolean;
  /** Called when tour ends (finished or skipped) */
  onTourEnd?: () => void;
}

interface UseOnboardingTourReturn {
  /** Whether the tour is currently running */
  run: boolean;
  /** Array of tour step configurations */
  steps: typeof TOUR_STEPS;
  /** Callback handler for Joyride events */
  handleJoyrideCallback: (data: CallBackProps) => void;
  /** Function to restart the tour from beginning */
  restartTour: () => void;
}

/**
 * Waits for the first tour element to be present in the DOM.
 * Returns immediately if element exists, otherwise polls until found or timeout.
 */
function waitForElement(selector: string, timeout: number): Promise<boolean> {
  return new Promise((resolve) => {
    // Check immediately
    if (document.querySelector(selector)) {
      resolve(true);
      return;
    }

    const startTime = Date.now();
    const checkInterval = 50; // Check every 50ms

    const intervalId = setInterval(() => {
      if (document.querySelector(selector)) {
        clearInterval(intervalId);
        resolve(true);
      } else if (Date.now() - startTime >= timeout) {
        clearInterval(intervalId);
        resolve(false); // Timeout - start anyway
      }
    }, checkInterval);
  });
}

/**
 * Hook for managing the onboarding tour lifecycle.
 *
 * Features:
 * - Auto-starts on first visit (checks localStorage)
 * - Waits for model loading to complete
 * - Uses requestIdleCallback for optimal performance
 * - Waits for first tour element to be in DOM
 * - Persists completion state
 * - Provides restart capability
 *
 * @param options - Configuration options
 * @returns Tour state and control functions
 */
export function useOnboardingTour(
  options: UseOnboardingTourOptions = {}
): UseOnboardingTourReturn {
  const { isModelLoading = false, forcedRun, onTourEnd } = options;
  const [run, setRun] = useState(false);

  // If forcedRun is provided, use it directly (controlled mode)
  useEffect(() => {
    if (forcedRun !== undefined) {
      setRun(forcedRun);
      return;
    }
  }, [forcedRun]);

  // Auto-start logic (only runs if forcedRun is undefined)
  useEffect(() => {
    // Skip auto-start if forcedRun is controlling the tour
    if (forcedRun !== undefined) {
      return;
    }

    // SSR safety check
    if (typeof window === "undefined" || isModelLoading) {
      return;
    }

    const completed = localStorage.getItem(STORAGE_KEYS.TOUR_COMPLETED);
    if (completed === "true") {
      return;
    }

    let cancelled = false;

    const startTour = async () => {
      // Minimum delay for initial paint to complete
      await new Promise((resolve) => setTimeout(resolve, MIN_DELAY_MS));

      if (cancelled) return;

      // Wait for first tour element to be in DOM (or timeout)
      await waitForElement(FIRST_TOUR_ELEMENT, MAX_WAIT_MS - MIN_DELAY_MS);

      if (cancelled) return;

      // Use requestIdleCallback if available for smoother start
      if ("requestIdleCallback" in window) {
        (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(
          () => {
            if (!cancelled) setRun(true);
          },
          { timeout: 100 } // Max 100ms additional wait
        );
      } else {
        // Fallback: use requestAnimationFrame
        requestAnimationFrame(() => {
          if (!cancelled) setRun(true);
        });
      }
    };

    startTour();

    return () => {
      cancelled = true;
    };
  }, [isModelLoading, forcedRun]);

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status } = data;

    if (status === "finished" || status === "skipped") {
      localStorage.setItem(STORAGE_KEYS.TOUR_COMPLETED, "true");
      setRun(false);
      onTourEnd?.();
    }
  }, [onTourEnd]);

  const restartTour = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.TOUR_COMPLETED);
    }
    setRun(true);
  }, []);

  return {
    run,
    steps: TOUR_STEPS,
    handleJoyrideCallback,
    restartTour,
  };
}
