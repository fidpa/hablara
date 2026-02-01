"use client";

/**
 * ProcessingProgress - Multi-Step Progress Indicator
 *
 * Zeigt Verarbeitungs-Fortschritt für LLM Pipeline (Transcription, Emotion, Fallacy, etc.)
 * mit Status-Icons (pending/active/completed/error/skipped), Elapsed Timer, Progress %,
 * Cancel Button, Auto-Completion Display (1.2s). UX Best Practices für Progress UI.
 */

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, Circle, MinusCircle, X, RotateCcw } from "lucide-react";
import type { ProcessingState, ProcessingStep, ProcessingStepStatus } from "@/lib/types";
import { PROCESSING_UI_TIMINGS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ProcessingProgressProps {
  state: ProcessingState;
  onCancel?: () => void;
  onRetry?: () => void;
  className?: string;
}

/**
 * Calculate percentage for individual step (cumulative).
 * Counts all completed steps up to and including this step.
 *
 * @param steps - All processing steps
 * @param currentStepId - ID of the step to calculate percentage for
 * @returns Cumulative percentage (0-100), rounded to nearest 5%
 */
function getStepPercentage(steps: ProcessingStep[], currentStepId: string): number {
  const stepIndex = steps.findIndex((s) => s.id === currentStepId);
  if (stepIndex === -1) return 0;

  const currentStep = steps[stepIndex];
  if (!currentStep) return 0; // TypeScript guard

  const completedBeforeThis = steps.slice(0, stepIndex).filter((s) => s.status === "completed").length;
  const isThisCompleted = currentStep.status === "completed";
  const numerator = completedBeforeThis + (isThisCompleted ? 1 : 0);

  const rawPercent = (numerator / steps.length) * 100;
  // Round to nearest 5% for cleaner display
  return Math.round(rawPercent / 5) * 5;
}

/**
 * Multi-step progress indicator for LLM processing.
 * Shows current status of transcription, analysis, and storage steps.
 *
 * Status Icons:
 * - pending: Empty circle (slate)
 * - active: Spinning loader (blue, pulsing)
 * - completed: Check circle (green, with scale animation)
 * - error: X circle (red)
 * - skipped: Minus circle (slate)
 *
 * Reference: UX Best Practices for progress indicators
 * - https://www.uxpin.com/studio/blog/design-progress-trackers/
 * - https://lollypop.design/blog/2025/november/progress-indicator-design/
 */
export function ProcessingProgress({ state, onCancel, onRetry, className }: ProcessingProgressProps): JSX.Element | null {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [showRetryButton, setShowRetryButton] = useState(false);

  // Update elapsed time every 100ms
  useEffect(() => {
    if (!state.isProcessing || !state.startedAt) return;

    const interval = setInterval(() => {
      if (state.startedAt) {
        setElapsedMs(Date.now() - state.startedAt);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [state.isProcessing, state.startedAt]);

  // Show retry button after delay when cancelled
  useEffect(() => {
    if (state.isCancelled) {
      const timer = setTimeout(() => setShowRetryButton(true), PROCESSING_UI_TIMINGS.retryButtonDelayMs);
      return () => clearTimeout(timer);
    } else {
      setShowRetryButton(false);
    }
  }, [state.isCancelled]);

  if (!state.isProcessing && !state.isShowingCompletion && !state.isCancelled) return null;

  const formatElapsedTime = (ms: number): string => {
    const seconds = (ms / 1000).toFixed(1);
    return `${seconds}s`;
  };

  // Check if there are any active steps (to enable/disable cancel button)
  const hasActiveSteps = state.steps.some(
    (step) => step.status === "active" || step.status === "pending"
  );

  return (
    <div
      className={cn(
        "rounded-lg border border-border/40 bg-card/80 backdrop-blur-sm p-4 shadow-sm",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label="Verarbeitung läuft"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          {state.isCancelled ? (
            <span className="flex items-center gap-2 text-muted-foreground" role="status" aria-live="polite">
              <XCircle className="h-4 w-4" aria-hidden="true" />
              Verarbeitung abgebrochen
            </span>
          ) : (
            "Verarbeitung"
          )}
        </h3>

        {/* Timer: only if NOT cancelled */}
        {!state.isCancelled && (
          <span className="text-xs text-muted-foreground">
            {formatElapsedTime(elapsedMs)}
          </span>
        )}
      </div>

      {/* Steps List */}
      <div className="space-y-2" role="list">
        {state.steps.map((step) => (
          <StepItem key={step.id} step={step} allSteps={state.steps} />
        ))}
      </div>

      {/* Cancel Button: only if NOT cancelled */}
      {onCancel && !state.isCancelled && (
        <div className="mt-3 pt-3 border-t border-border/40">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={!hasActiveSteps}
            className="w-full text-xs text-slate-600 dark:text-slate-400 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
            aria-label="Verarbeitung abbrechen"
          >
            <X className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            Verarbeitung abbrechen
          </Button>
        </div>
      )}

      {/* Retry Button: only if cancelled AND 1s delay passed */}
      {state.isCancelled && showRetryButton && onRetry && (
        <div className="mt-3 pt-3 border-t border-border/40">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="w-full text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/10"
            aria-label="Verarbeitung erneut versuchen"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            Erneut versuchen
          </Button>
        </div>
      )}
    </div>
  );
}

interface StepItemProps {
  step: ProcessingStep;
  allSteps: ProcessingStep[]; // Needed for percentage calculation
}

function StepItem({ step, allSteps }: StepItemProps) {
  const { status, label, labelActive, errorMessage } = step;

  // Determine display label (use labelActive when active)
  const displayLabel = status === "active" && labelActive ? labelActive : label;

  // Calculate percentage for this step (cumulative)
  const percentText = `${getStepPercentage(allSteps, step.id)}%`;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-md px-2 py-1.5 transition-colors",
        status === "active" && "bg-blue-500/5"
      )}
      role="listitem"
      aria-label={`${displayLabel} - ${getStatusLabel(status)}`}
    >
      {/* Icon + Label */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <StatusIcon status={status} />
        <span
          className={cn(
            "text-sm truncate",
            status === "pending" && "text-muted-foreground",
            status === "active" && "text-foreground font-medium",
            status === "completed" && "text-foreground",
            status === "error" && "text-red-500",
            status === "skipped" && "text-muted-foreground"
          )}
        >
          {displayLabel}
        </span>
      </div>

      {/* Percentage */}
      <span
        className={cn(
          "text-xs tabular-nums flex-shrink-0",
          status === "pending" && "text-muted-foreground/70",
          status === "active" && "text-blue-500 font-medium",
          status === "completed" && "text-green-500 font-medium",
          status === "error" && "text-red-500",
          status === "skipped" && "text-muted-foreground/70"
        )}
      >
        {percentText}
      </span>

      {/* Error Message (if any) */}
      {status === "error" && errorMessage && (
        <span className="text-xs text-red-500 truncate ml-2" title={errorMessage}>
          {errorMessage}
        </span>
      )}
    </div>
  );
}

interface StatusIconProps {
  status: ProcessingStepStatus;
}

function StatusIcon({ status }: StatusIconProps) {
  const iconSize = 16;

  switch (status) {
    case "pending":
      return <Circle size={iconSize} className="text-slate-500 dark:text-slate-400 flex-shrink-0" />;

    case "active":
      return (
        <Loader2
          size={iconSize}
          className="animate-spin motion-reduce:animate-none text-blue-500 flex-shrink-0 step-active-pulse"
        />
      );

    case "completed":
      return (
        <CheckCircle2
          size={iconSize}
          className="text-green-500 flex-shrink-0 step-icon-complete"
        />
      );

    case "error":
      return <XCircle size={iconSize} className="text-red-500 flex-shrink-0" />;

    case "skipped":
      return <MinusCircle size={iconSize} className="text-slate-500 dark:text-slate-400 flex-shrink-0" />;

    default:
      return <Circle size={iconSize} className="text-slate-500 dark:text-slate-400 flex-shrink-0" />;
  }
}

function getStatusLabel(status: ProcessingStepStatus): string {
  switch (status) {
    case "pending":
      return "Ausstehend";
    case "active":
      return "In Bearbeitung";
    case "completed":
      return "Abgeschlossen";
    case "error":
      return "Fehler";
    case "skipped":
      return "Übersprungen";
    default:
      return "";
  }
}
