"use client";

/**
 * Onboarding Tour Component
 *
 * Wrapper component for react-joyride that provides the interactive
 * onboarding experience for first-time users.
 *
 * Uses dynamic import for SSR-safety since react-joyride requires
 * browser APIs (window, document).
 *
 * @see docs/reference/guidelines/REACT_TSX.md
 */

import dynamic from "next/dynamic";
import { useOnboardingTour } from "@/hooks/useOnboardingTour";
import { TourTooltip } from "./TourTooltip";

// Dynamic import for SSR-safety (react-joyride uses browser APIs)
const Joyride = dynamic(() => import("react-joyride"), { ssr: false });

interface OnboardingTourProps {
  /** If true, delays tour until model loading completes */
  isModelLoading?: boolean;
  /** If provided, overrides auto-start logic and forces tour run state */
  forcedRun?: boolean;
  /** Called when tour ends (finished or skipped) */
  onTourEnd?: () => void;
}

/**
 * Renders the onboarding tour overlay.
 *
 * The tour automatically starts for first-time users and guides them
 * through the main features of the application.
 *
 * @param props - Component props
 * @returns Tour component or null if not running
 */
export function OnboardingTour({ isModelLoading, forcedRun, onTourEnd }: OnboardingTourProps) {
  const { run, steps, handleJoyrideCallback } = useOnboardingTour({
    isModelLoading,
    forcedRun,
    onTourEnd,
  });

  if (!run) {
    return null;
  }

  return (
    <Joyride
      run={run}
      steps={steps}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      tooltipComponent={TourTooltip}
      styles={{
        options: {
          zIndex: 10000,
          overlayColor: "rgba(0, 0, 0, 0.7)",
        },
        spotlight: {
          borderRadius: 12,
        },
      }}
      locale={{
        back: "Zurück",
        close: "Schließen",
        last: "Fertig",
        next: "Weiter",
        skip: "Überspringen",
      }}
    />
  );
}
