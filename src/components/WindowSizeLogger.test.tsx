/**
 * WindowSizeLogger Component Tests
 *
 * Tests for the development-only window size logging component.
 *
 * @see docs/reference/guidelines/REACT_TSX.md - Testing Patterns
 */

import { describe, it, expect, vi, beforeEach, afterEach, afterAll, type Mock } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { WindowSizeLogger } from "./WindowSizeLogger";
import { invoke } from "@tauri-apps/api/core";
import { logger } from "@/lib/logger";

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock console.log to verify styled output
const originalConsoleLog = console.log;
let consoleLogSpy: ReturnType<typeof vi.spyOn>;

// Helper to create mock window size response
const createMockWindowSize = (outerW: number, outerH: number, innerW?: number, innerH?: number, scale?: number) => ({
  innerPhysicalWidth: (innerW ?? outerW) * (scale ?? 2),
  innerPhysicalHeight: (innerH ?? outerH) * (scale ?? 2),
  innerLogicalWidth: innerW ?? outerW,
  innerLogicalHeight: innerH ?? outerH,
  outerPhysicalWidth: outerW * (scale ?? 2),
  outerPhysicalHeight: outerH * (scale ?? 2),
  outerLogicalWidth: outerW,
  outerLogicalHeight: outerH,
  scaleFactor: scale ?? 2,
});

describe("WindowSizeLogger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  afterAll(() => {
    console.log = originalConsoleLog;
  });

  describe("Development Mode", () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = "development";
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it("should call get_window_size command on mount", async () => {
      (invoke as Mock).mockResolvedValue(createMockWindowSize(1200, 900));

      render(<WindowSizeLogger />);

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("get_window_size");
      });
    });

    it("should log window size via logger.info", async () => {
      (invoke as Mock).mockResolvedValue(createMockWindowSize(1200, 900, 1200, 850, 2));

      render(<WindowSizeLogger />);

      await waitFor(() => {
        expect(logger.info).toHaveBeenCalledWith(
          "WindowSizeLogger",
          "Window - Outer: 1200x900, Inner: 1200x850, Scale: 2",
          {
            outer: { width: 1200, height: 900 },
            inner: { width: 1200, height: 850 },
            scaleFactor: 2,
          }
        );
      });
    });

    it("should log styled output to browser console", async () => {
      (invoke as Mock).mockResolvedValue(createMockWindowSize(1200, 900, 1200, 850, 2));

      render(<WindowSizeLogger />);

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining("🪟 Window (Outer): 1200 x 900"),
          expect.stringContaining("color: #3b82f6"),
          expect.stringContaining("color: #64748b")
        );
      });
    });

    it("should handle different window sizes", async () => {
      (invoke as Mock).mockResolvedValue(createMockWindowSize(1600, 1200, 1600, 1150, 2));

      render(<WindowSizeLogger />);

      await waitFor(() => {
        expect(logger.info).toHaveBeenCalledWith(
          "WindowSizeLogger",
          "Window - Outer: 1600x1200, Inner: 1600x1150, Scale: 2",
          expect.objectContaining({
            outer: { width: 1600, height: 1200 },
            inner: { width: 1600, height: 1150 },
          })
        );
      });
    });

    it("should log warning when Tauri command fails", async () => {
      const error = new Error("Command not available");
      (invoke as Mock).mockRejectedValue(error);

      render(<WindowSizeLogger />);

      await waitFor(() => {
        expect(logger.warn).toHaveBeenCalledWith(
          "WindowSizeLogger",
          "Failed to get window size (Tauri command not available)",
          error
        );
      });
    });

    it("should not crash when invoke returns unexpected format", async () => {
      (invoke as Mock).mockResolvedValue(null);

      render(<WindowSizeLogger />);

      // Should handle gracefully (error caught by try-catch)
      await waitFor(() => {
        expect(logger.warn).toHaveBeenCalled();
      });
    });

    it("should render nothing (no UI)", () => {
      (invoke as Mock).mockResolvedValue(createMockWindowSize(1200, 900));

      const { container } = render(<WindowSizeLogger />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe("Production Mode", () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = "production";
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it("should not call get_window_size in production", () => {
      render(<WindowSizeLogger />);

      expect(invoke).not.toHaveBeenCalled();
    });

    it("should not log anything in production", () => {
      render(<WindowSizeLogger />);

      expect(logger.info).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it("should render nothing in production", () => {
      const { container } = render(<WindowSizeLogger />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe("Edge Cases", () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = "development";
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it("should handle very large window sizes (4K)", async () => {
      (invoke as Mock).mockResolvedValue(createMockWindowSize(3840, 2160, 3840, 2110, 2));

      render(<WindowSizeLogger />);

      await waitFor(() => {
        expect(logger.info).toHaveBeenCalledWith(
          "WindowSizeLogger",
          "Window - Outer: 3840x2160, Inner: 3840x2110, Scale: 2",
          expect.objectContaining({
            outer: { width: 3840, height: 2160 },
          })
        );
      });
    });

    it("should handle minimum window sizes", async () => {
      (invoke as Mock).mockResolvedValue(createMockWindowSize(800, 600, 800, 550, 1));

      render(<WindowSizeLogger />);

      await waitFor(() => {
        expect(logger.info).toHaveBeenCalledWith(
          "WindowSizeLogger",
          "Window - Outer: 800x600, Inner: 800x550, Scale: 1",
          expect.objectContaining({
            outer: { width: 800, height: 600 },
          })
        );
      });
    });

    it("should only log once on mount (no re-renders)", async () => {
      (invoke as Mock).mockResolvedValue(createMockWindowSize(1200, 900));

      const { rerender } = render(<WindowSizeLogger />);

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledTimes(1);
      });

      // Rerender should not trigger another log
      rerender(<WindowSizeLogger />);

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledTimes(1); // Still only once
      });
    });
  });
});
