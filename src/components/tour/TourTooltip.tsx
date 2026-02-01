"use client";

/**
 * Custom Tooltip Component for react-joyride
 *
 * Renders a styled tooltip for each tour step with navigation controls.
 * Follows WCAG 2.1 accessibility guidelines with proper ARIA attributes
 * and keyboard navigation support.
 *
 * @see docs/reference/guidelines/REACT_TSX.md
 */

import type { TooltipRenderProps } from "react-joyride";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

/**
 * Custom tooltip component for the onboarding tour.
 *
 * Features:
 * - Accessible dialog with ARIA attributes
 * - Keyboard navigable controls
 * - Step counter display
 * - Skip/Back/Next navigation
 *
 * @param props - TooltipRenderProps from react-joyride
 */
export function TourTooltip({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
  size,
}: TooltipRenderProps) {
  const isFirstStep = index === 0;
  const isLastStep = index === size - 1;

  return (
    <div
      {...tooltipProps}
      className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-2xl max-w-md"
      role="dialog"
      aria-labelledby="tour-tooltip-title"
      aria-describedby="tour-tooltip-content"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h3
          id="tour-tooltip-title"
          className="text-lg font-semibold text-white"
        >
          {step.title}
        </h3>
        <button
          {...closeProps}
          className="text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 rounded transition-colors p-1"
          aria-label="Tour schließen"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div
        id="tour-tooltip-content"
        className="text-slate-300 text-sm mb-4 leading-relaxed"
      >
        {step.content}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        {/* Step Counter */}
        <span className="text-xs text-slate-400">
          {index + 1} / {size}
        </span>

        {/* Buttons */}
        <div className="flex gap-2">
          {/* Skip Button (only if not last step) */}
          {!isLastStep && (
            <Button
              {...skipProps}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white"
            >
              Überspringen
            </Button>
          )}

          {/* Back Button */}
          {!isFirstStep && continuous && (
            <Button {...backProps} variant="outline" size="sm">
              Zurück
            </Button>
          )}

          {/* Primary Button */}
          <Button
            {...primaryProps}
            variant="default"
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLastStep ? "Fertig" : "Weiter"}
          </Button>
        </div>
      </div>
    </div>
  );
}
