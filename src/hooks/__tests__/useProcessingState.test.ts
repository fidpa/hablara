/**
 * Tests for useProcessingState hook
 *
 * P1-3: Cancel State UX Improvement
 *
 * Tests the isCancelled flag functionality:
 * - Setting isCancelled=true on cancel()
 * - Resetting isCancelled=false on reset()
 * - Cancel behavior during completion display
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProcessingState } from "../useProcessingState";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("useProcessingState - isCancelled flag (P1-3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("cancel() sets isCancelled flag", () => {
    it("should set isCancelled to true when cancel() is called during processing", () => {
      const { result } = renderHook(() => useProcessingState());

      // Start processing
      act(() => {
        result.current.startProcessing(["transcription"]);
      });

      expect(result.current.state.isProcessing).toBe(true);
      expect(result.current.state.isCancelled).toBe(false);

      // Cancel processing
      act(() => {
        result.current.cancel();
      });

      expect(result.current.state.isProcessing).toBe(false);
      expect(result.current.state.isCancelled).toBe(true);
      expect(result.current.state.isShowingCompletion).toBe(false);
    });

    it("should skip active/pending steps when cancelled", () => {
      const { result } = renderHook(() => useProcessingState());

      act(() => {
        result.current.startProcessing(["transcription", "textEmotion"]);
      });

      act(() => {
        result.current.updateStep("transcription", "active");
      });

      expect(result.current.state.steps[0].status).toBe("active");
      expect(result.current.state.steps[1].status).toBe("pending");

      act(() => {
        result.current.cancel();
      });

      expect(result.current.state.isCancelled).toBe(true);
      expect(result.current.state.steps[0].status).toBe("skipped");
      expect(result.current.state.steps[1].status).toBe("skipped");
    });
  });

  describe("reset() clears isCancelled flag", () => {
    it("should clear isCancelled when reset() is called", () => {
      const { result } = renderHook(() => useProcessingState());

      // Start and cancel
      act(() => {
        result.current.startProcessing(["transcription"]);
        result.current.cancel();
      });

      expect(result.current.state.isCancelled).toBe(true);

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.state.isCancelled).toBe(false);
      expect(result.current.state.isProcessing).toBe(false);
      expect(result.current.state.steps).toHaveLength(0);
    });

    it("should clear isCancelled when startProcessing() is called again", () => {
      const { result } = renderHook(() => useProcessingState());

      // Start, cancel, restart
      act(() => {
        result.current.startProcessing(["transcription"]);
        result.current.cancel();
      });

      expect(result.current.state.isCancelled).toBe(true);

      act(() => {
        result.current.startProcessing(["textEmotion"]);
      });

      expect(result.current.state.isCancelled).toBe(false);
      expect(result.current.state.isProcessing).toBe(true);
    });
  });

  describe("cancel during completion display", () => {
    it("should set isCancelled=true even if all steps completed", () => {
      const { result } = renderHook(() => useProcessingState());

      act(() => {
        result.current.startProcessing(["transcription"]);
      });

      // Complete step
      act(() => {
        result.current.updateStep("transcription", "completed");
      });

      // At this point, isShowingCompletion should be true (1.2s delay)
      expect(result.current.state.isProcessing).toBe(false);
      expect(result.current.state.isShowingCompletion).toBe(true);

      // Cancel during completion display
      act(() => {
        result.current.cancel();
      });

      expect(result.current.state.isCancelled).toBe(true);
      expect(result.current.state.isShowingCompletion).toBe(false);
    });

    it("should clear completion timer when cancelled", () => {
      const { result } = renderHook(() => useProcessingState());

      act(() => {
        result.current.startProcessing(["transcription"]);
        result.current.updateStep("transcription", "completed");
      });

      expect(result.current.state.isShowingCompletion).toBe(true);

      // Cancel (should clear timer)
      act(() => {
        result.current.cancel();
      });

      expect(result.current.state.isCancelled).toBe(true);

      // Advance timer - isShowingCompletion should NOT change
      act(() => {
        vi.advanceTimersByTime(1200);
      });

      expect(result.current.state.isShowingCompletion).toBe(false); // Still false (timer was cleared)
    });
  });

  describe("initial state", () => {
    it("should have isCancelled=false by default", () => {
      const { result } = renderHook(() => useProcessingState());

      expect(result.current.state.isCancelled).toBe(false);
      expect(result.current.state.isProcessing).toBe(false);
      expect(result.current.state.steps).toHaveLength(0);
    });
  });
});
