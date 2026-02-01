"use client";

/**
 * useProcessingState - Multi-Step Processing State Management
 *
 * Verwaltet Processing Pipeline State: Start/Stop, Step Updates (pending/active/completed/error/skipped),
 * Cancel/Retry Logic, Auto-Completion Display (1.2s delay). Nutzt flushSync für synchronen State-Commit
 * vor async Processing. Returns state + control functions (startProcessing, updateStep, cancel, reset).
 */

import { useState, useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import type {
  ProcessingState,
  ProcessingStep,
  ProcessingStepStatus,
  StepDefinition,
} from "@/lib/types";
import { PROCESSING_STEPS_REGISTRY } from "@/lib/types";
import { logger } from "@/lib/logger";

/** Delay before hiding progress after all steps complete (ms) */
const COMPLETION_DISPLAY_DELAY_MS = 1200;

interface UseProcessingStateReturn {
  state: ProcessingState;
  startProcessing: (stepIds: string[]) => void;
  updateStep: (stepId: string, status: ProcessingStepStatus, errorMessage?: string) => void;
  completeStep: (stepId: string) => void;
  skipStep: (stepId: string) => void;
  cancel: () => void;
  reset: () => void;
  getElapsedMs: () => number;
}

const INITIAL_STATE: ProcessingState = {
  isProcessing: false,
  isShowingCompletion: false,
  isCancelled: false,
  steps: [],
  currentStepId: null,
  startedAt: null,
};

/**
 * Hook for managing multi-step processing progress.
 * Uses useState for proper React re-rendering.
 */
export function useProcessingState(): UseProcessingStateReturn {
  const [state, setState] = useState<ProcessingState>(INITIAL_STATE);
  const startTimeRef = useRef<number | null>(null);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Check if all steps are in a terminal state.
   */
  const isAllStepsTerminal = (steps: ProcessingStep[]): boolean => {
    if (steps.length === 0) return false;
    return steps.every(
      (step) =>
        step.status === "completed" ||
        step.status === "error" ||
        step.status === "skipped"
    );
  };

  /**
   * Initialize processing with given step IDs.
   * Uses flushSync to ensure state is committed before processing begins.
   */
  const startProcessing = useCallback((stepIds: string[]) => {
    const now = Date.now();
    startTimeRef.current = now;

    const steps: ProcessingStep[] = stepIds.map((id) => {
      const definition: StepDefinition | undefined = PROCESSING_STEPS_REGISTRY[id];
      if (!definition) {
        logger.warn('useProcessingState', `Unknown step ID: ${id}`);
        return {
          id,
          label: id,
          estimatedMs: 0,
          status: "pending" as ProcessingStepStatus,
        };
      }
      return {
        ...definition,
        status: "pending" as ProcessingStepStatus,
      };
    });

    /**
     * flushSync ensures state is committed before async processing begins.
     *
     * WHY flushSync HERE (startProcessing):
     * - Without it, updateStep() would see an empty steps array due to React batching
     * - startProcessing() and processText() run in same synchronous block
     *
     * WHY NO flushSync in updateStep():
     * - Would break setInterval-Timer in ProcessingProgress child component
     * - Timer stops rendering updates, making step changes invisible
     * - updateStep() is called after `await`, so React doesn't batch across await boundaries
     */
    flushSync(() => {
      setState({
        isProcessing: true,
        isShowingCompletion: false,
        isCancelled: false,
        steps,
        currentStepId: null,
        startedAt: now,
      });
    });
  }, []);

  /**
   * Update step status and track timing.
   * When all steps reach a terminal state, isProcessing is set to false immediately
   * (so results are available), while isShowingCompletion stays true for 1.2s
   * to let the user see green checkmarks before the progress indicator disappears.
   */
  const updateStep = useCallback(
    (stepId: string, status: ProcessingStepStatus, errorMessage?: string) => {
      setState((prev) => {
        if (prev.steps.length === 0) {
          logger.warn('useProcessingState', `updateStep: steps array is EMPTY! Cannot update ${stepId}`);
          return prev;
        }

        const now = Date.now();
        const updatedSteps = prev.steps.map((step) => {
          if (step.id !== stepId) return step;

          const updates: Partial<ProcessingStep> = { status };

          if (status === "active" && !step.startedAt) {
            updates.startedAt = now;
          }
          if ((status === "completed" || status === "error" || status === "skipped") && step.startedAt) {
            updates.completedAt = now;
            updates.actualMs = now - step.startedAt;
          }
          if (status === "error" && errorMessage) {
            updates.errorMessage = errorMessage;
          }
          return { ...step, ...updates };
        });

        const newCurrentStepId =
          status === "active"
            ? stepId
            : (status === "completed" || status === "error" || status === "skipped") && prev.currentStepId === stepId
              ? null
              : prev.currentStepId;

        const allTerminal = isAllStepsTerminal(updatedSteps);

        if (allTerminal) {
          // Schedule delayed hide of completion summary
          if (completionTimerRef.current) {
            clearTimeout(completionTimerRef.current);
          }
          completionTimerRef.current = setTimeout(() => {
            setState((s) => ({
              ...s,
              isShowingCompletion: false,
            }));
            completionTimerRef.current = null;
          }, COMPLETION_DISPLAY_DELAY_MS);
        }

        return {
          ...prev,
          // isProcessing goes to false immediately so results are available
          isProcessing: allTerminal ? false : prev.isProcessing,
          // isShowingCompletion keeps the progress indicator visible briefly
          isShowingCompletion: allTerminal ? true : prev.isShowingCompletion,
          steps: updatedSteps,
          currentStepId: newCurrentStepId,
        };
      });
    },
    []
  );

  /**
   * Mark step as completed.
   */
  const completeStep = useCallback(
    (stepId: string) => {
      updateStep(stepId, "completed");
    },
    [updateStep]
  );

  /**
   * Mark step as skipped.
   */
  const skipStep = useCallback(
    (stepId: string) => {
      updateStep(stepId, "skipped");
    },
    [updateStep]
  );

  /**
   * Cancel processing.
   */
  const cancel = useCallback(() => {
    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
    setState((prev) => {
      // Allow cancel even if isProcessing=false (e.g., during completion display)
      if (!prev.isProcessing && !prev.isShowingCompletion) return prev;

      const now = Date.now();
      const updatedSteps = prev.steps.map((step) => {
        if (step.status === "active" || step.status === "pending") {
          const updates: Partial<ProcessingStep> = {
            status: "skipped" as ProcessingStepStatus,
          };
          if (step.status === "active" && step.startedAt) {
            updates.completedAt = now;
            updates.actualMs = now - step.startedAt;
          }
          return { ...step, ...updates };
        }
        return step;
      });

      return {
        ...prev,
        isProcessing: false,
        isShowingCompletion: false,
        isCancelled: true,
        steps: updatedSteps,
        currentStepId: null,
      };
    });
  }, []);

  /**
   * Reset processing state.
   */
  const reset = useCallback(() => {
    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
    setState(INITIAL_STATE);
    startTimeRef.current = null;
  }, []);

  /**
   * Get elapsed time since processing started.
   */
  const getElapsedMs = useCallback((): number => {
    if (!startTimeRef.current) return 0;
    return Date.now() - startTimeRef.current;
  }, []);

  return {
    state,
    startProcessing,
    updateStep,
    completeStep,
    skipStep,
    cancel,
    reset,
    getElapsedMs,
  };
}
