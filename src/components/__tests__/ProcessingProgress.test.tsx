/**
 * Tests for ProcessingProgress component
 *
 * P1-3: Cancel State UX Improvement
 *
 * Tests the cancelled state UI:
 * - Rendering "Verarbeitung abgebrochen" message
 * - Retry button appearance after 1s delay
 * - Timer cleanup on unmount
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProcessingProgress } from "../ProcessingProgress";
import type { ProcessingState } from "@/lib/types";

describe("ProcessingProgress - Cancelled State (P1-3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createMockState = (overrides?: Partial<ProcessingState>): ProcessingState => ({
    isProcessing: false,
    isShowingCompletion: false,
    isCancelled: false,
    steps: [],
    currentStepId: null,
    startedAt: null,
    ...overrides,
  });

  describe("Cancelled state rendering", () => {
    it("should render cancelled message when isCancelled=true", () => {
      const state = createMockState({
        isCancelled: true,
        steps: [
          {
            id: "transcription",
            label: "Transkription",
            estimatedMs: 2000,
            status: "skipped",
          },
        ],
      });

      render(<ProcessingProgress state={state} onCancel={vi.fn()} />);

      expect(screen.getByText("Verarbeitung abgebrochen")).toBeInTheDocument();
    });

    it("should hide timer when cancelled", () => {
      const state = createMockState({
        isCancelled: true,
        startedAt: Date.now() - 5000, // 5s ago
        steps: [
          {
            id: "transcription",
            label: "Transkription",
            estimatedMs: 2000,
            status: "skipped",
          },
        ],
      });

      render(<ProcessingProgress state={state} onCancel={vi.fn()} />);

      // Timer text should NOT be visible
      const timerRegex = /\d+\.\d+s/;
      expect(screen.queryByText(timerRegex)).not.toBeInTheDocument();
    });

    it("should hide cancel button when cancelled", () => {
      const state = createMockState({
        isCancelled: true,
        steps: [
          {
            id: "transcription",
            label: "Transkription",
            estimatedMs: 2000,
            status: "skipped",
          },
        ],
      });

      render(<ProcessingProgress state={state} onCancel={vi.fn()} />);

      expect(
        screen.queryByRole("button", { name: /verarbeitung abbrechen/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("Retry button behavior", () => {
    it("should show retry button after 1s delay when cancelled", async () => {
      vi.useFakeTimers();
      const onRetry = vi.fn();
      const state = createMockState({
        isCancelled: true,
        steps: [
          {
            id: "transcription",
            label: "Transkription",
            estimatedMs: 2000,
            status: "skipped",
          },
        ],
      });

      render(<ProcessingProgress state={state} onRetry={onRetry} />);

      // Initially, retry button should NOT be visible
      expect(
        screen.queryByRole("button", { name: /erneut versuchen/i })
      ).not.toBeInTheDocument();

      // Advance timers by 1s
      vi.advanceTimersByTime(1000);

      // Wait for React to update (flush promises)
      await vi.runAllTimersAsync();

      // Retry button should now be visible
      expect(screen.getByRole("button", { name: /erneut versuchen/i })).toBeInTheDocument();

      vi.useRealTimers();
    });

    it("should call onRetry when retry button is clicked", async () => {
      vi.useFakeTimers();
      const onRetry = vi.fn();
      const state = createMockState({
        isCancelled: true,
        steps: [
          {
            id: "transcription",
            label: "Transkription",
            estimatedMs: 2000,
            status: "skipped",
          },
        ],
      });

      render(<ProcessingProgress state={state} onRetry={onRetry} />);

      // Advance timer to show retry button
      vi.advanceTimersByTime(1000);
      await vi.runAllTimersAsync();

      // Click retry button (use fireEvent with fake timers)
      const retryButton = screen.getByRole("button", { name: /erneut versuchen/i });
      fireEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it("should cleanup retry button timer on unmount", () => {
      vi.useFakeTimers();
      const state = createMockState({
        isCancelled: true,
        steps: [
          {
            id: "transcription",
            label: "Transkription",
            estimatedMs: 2000,
            status: "skipped",
          },
        ],
      });

      const { unmount } = render(<ProcessingProgress state={state} onRetry={vi.fn()} />);

      // Unmount before timer fires
      unmount();

      // Advance timer - no errors should occur (cleanup worked)
      expect(() => {
        vi.advanceTimersByTime(1000);
      }).not.toThrow();

      vi.useRealTimers();
    });

    it("should hide retry button when isCancelled becomes false", async () => {
      vi.useFakeTimers();
      const state = createMockState({
        isCancelled: true,
        steps: [
          {
            id: "transcription",
            label: "Transkription",
            estimatedMs: 2000,
            status: "skipped",
          },
        ],
      });

      const { rerender } = render(<ProcessingProgress state={state} onRetry={vi.fn()} />);

      // Show retry button
      vi.advanceTimersByTime(1000);
      await vi.runAllTimersAsync();

      expect(screen.getByRole("button", { name: /erneut versuchen/i })).toBeInTheDocument();

      // Change state to isCancelled=false
      const newState = createMockState({
        isProcessing: true,
        isCancelled: false,
        steps: [
          {
            id: "transcription",
            label: "Transkription",
            estimatedMs: 2000,
            status: "active",
          },
        ],
      });

      rerender(<ProcessingProgress state={newState} onRetry={vi.fn()} />);

      // Retry button should disappear immediately (useEffect cleanup)
      expect(
        screen.queryByRole("button", { name: /erneut versuchen/i })
      ).not.toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  describe("Normal processing state (regression)", () => {
    it("should render normal processing UI when not cancelled", () => {
      const state = createMockState({
        isProcessing: true,
        startedAt: Date.now() - 2000,
        steps: [
          {
            id: "transcription",
            label: "Transkription",
            estimatedMs: 2000,
            status: "active",
          },
        ],
      });

      render(<ProcessingProgress state={state} onCancel={vi.fn()} />);

      // Normal header
      expect(screen.getByText("Verarbeitung")).toBeInTheDocument();
      // Timer visible
      expect(screen.getByText(/\d+\.\d+s/)).toBeInTheDocument();
      // Cancel button visible
      expect(screen.getByRole("button", { name: /verarbeitung abbrechen/i })).toBeInTheDocument();
      // No retry button
      expect(
        screen.queryByRole("button", { name: /erneut versuchen/i })
      ).not.toBeInTheDocument();
    });
  });
});
