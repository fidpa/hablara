/**
 * Tests for useTauri hook - bringToFront() functionality
 *
 * Verifies window focus-stealing logic with mocked Tauri window API.
 * Actual Tauri integration tested through manual E2E testing.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTauri } from "../useTauri";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock TAURI_FOCUS_TIMINGS for test isolation
vi.mock("@/lib/types", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/types")>();
  return {
    ...actual,
    TAURI_FOCUS_TIMINGS: {
      focusDelayMs: 50,
    },
  };
});

// Mock Tauri window API
const mockShow = vi.fn().mockResolvedValue(undefined);
const mockUnminimize = vi.fn().mockResolvedValue(undefined);
const mockSetFocus = vi.fn().mockResolvedValue(undefined);
const mockGetCurrentWindow = vi.fn(() => ({
  show: mockShow,
  unminimize: mockUnminimize,
  setFocus: mockSetFocus,
}));

vi.mock("@tauri-apps/api/window", async () => {
  return {
    getCurrentWindow: mockGetCurrentWindow,
  };
});

describe("useTauri - bringToFront()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Tauri environment
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      value: {},
      configurable: true,
    });
  });

  afterEach(() => {
    // Clean up Tauri mock
    delete (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  });

  it("should successfully bring window to front with Multi-Strategy Pattern", async () => {
    const { result } = renderHook(() => useTauri());

    // Wait for isTauri to be true after useEffect runs
    await waitFor(() => {
      expect(result.current.isTauri).toBe(true);
    });

    let success = false;
    await act(async () => {
      success = await result.current.bringToFront();
    });

    expect(success).toBe(true);
    expect(mockShow).toHaveBeenCalledTimes(1);
    expect(mockUnminimize).toHaveBeenCalledTimes(1);
    expect(mockSetFocus).toHaveBeenCalledTimes(1);

    // Verify call order (Multi-Strategy Pattern)
    const callOrder = [
      mockShow.mock.invocationCallOrder[0],
      mockUnminimize.mock.invocationCallOrder[0],
      mockSetFocus.mock.invocationCallOrder[0],
    ];
    expect(callOrder[0]).toBeLessThan(callOrder[1]); // show before unminimize
    expect(callOrder[1]).toBeLessThan(callOrder[2]); // unminimize before setFocus
  });

  it("should return false when not in Tauri environment", async () => {
    // Remove Tauri mock
    delete (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;

    const { result } = renderHook(() => useTauri());

    // Wait for isTauri to be false after useEffect runs
    await waitFor(() => {
      expect(result.current.isTauri).toBe(false);
    });

    let success = false;
    await act(async () => {
      success = await result.current.bringToFront();
    });

    expect(success).toBe(false);
    expect(mockShow).not.toHaveBeenCalled();
    expect(mockUnminimize).not.toHaveBeenCalled();
    expect(mockSetFocus).not.toHaveBeenCalled();
  });

  it("should gracefully handle errors and return false", async () => {
    // Mock error on setFocus
    mockSetFocus.mockRejectedValueOnce(new Error("Focus failed"));

    const { result } = renderHook(() => useTauri());

    // Wait for isTauri to be true
    await waitFor(() => {
      expect(result.current.isTauri).toBe(true);
    });

    let success = false;
    await act(async () => {
      success = await result.current.bringToFront();
    });

    expect(success).toBe(false);
    expect(mockShow).toHaveBeenCalledTimes(1);
    expect(mockUnminimize).toHaveBeenCalledTimes(1);
    // Error thrown at setFocus, so it was called
    expect(mockSetFocus).toHaveBeenCalledTimes(1);
  });

  it("should include 50ms delay between unminimize and setFocus (Bug #2061 workaround)", async () => {
    const { result } = renderHook(() => useTauri());

    await waitFor(() => {
      expect(result.current.isTauri).toBe(true);
    });

    const startTime = Date.now();
    await act(async () => {
      await result.current.bringToFront();
    });
    const elapsed = Date.now() - startTime;

    // Should take at least 50ms due to setTimeout(50)
    expect(elapsed).toBeGreaterThanOrEqual(40); // Allow 10ms tolerance for timer precision
    expect(mockSetFocus).toHaveBeenCalledTimes(1);
  });

  it("should handle show() failure gracefully", async () => {
    mockShow.mockRejectedValueOnce(new Error("Show failed"));

    const { result } = renderHook(() => useTauri());

    await waitFor(() => {
      expect(result.current.isTauri).toBe(true);
    });

    let success = false;
    await act(async () => {
      success = await result.current.bringToFront();
    });

    expect(success).toBe(false);
    expect(mockShow).toHaveBeenCalledTimes(1);
    // Subsequent calls should not happen if show() fails
    expect(mockUnminimize).not.toHaveBeenCalled();
    expect(mockSetFocus).not.toHaveBeenCalled();
  });
});
