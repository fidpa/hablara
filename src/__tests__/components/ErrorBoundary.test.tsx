/**
 * ErrorBoundary Component Tests
 *
 * Test strategy: "Fail small, recover fast"
 * - Verify error catching at component level
 * - Test recovery mechanisms (reset, reload)
 * - Validate logging integration
 * - Prove error isolation between boundaries
 *
 * Coverage target: 90-95% (minimum 80%)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { logger } from "@/lib/logger";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

/**
 * Throwing component for testing
 * Throws error when shouldThrow is true
 */
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>No error</div>;
};

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Normal Rendering", () => {
    it("renders children when no error", () => {
      render(
        <ErrorBoundary name="TestComponent">
          <div>Test content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText("Test content")).toBeInTheDocument();
    });
  });

  describe("Error Catching", () => {
    it("catches render errors and shows default fallback", () => {
      render(
        <ErrorBoundary name="TestComponent">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Verify fallback UI appears
      expect(screen.getByText("Etwas ist schief gelaufen")).toBeInTheDocument();
      expect(screen.getByText("Test error")).toBeInTheDocument();
    });

    it("shows error message in fallback UI", () => {
      render(
        <ErrorBoundary name="TestComponent">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Verify error message displays
      expect(screen.getByText("Test error")).toBeInTheDocument();
    });

    it("shows generic message when error has no message", () => {
      const ThrowEmptyError = () => {
        throw new Error("");
      };

      render(
        <ErrorBoundary name="TestComponent">
          <ThrowEmptyError />
        </ErrorBoundary>
      );

      // Verify generic message appears
      expect(screen.getByText("Ein unerwarteter Fehler ist aufgetreten")).toBeInTheDocument();
    });
  });

  describe("Error Recovery", () => {
    it("resets error state when 'Erneut versuchen' clicked", () => {
      let throwError = true;

      const ToggleErrorComponent = () => {
        if (throwError) {
          throw new Error("Test error");
        }
        return <div>No error</div>;
      };

      const { rerender } = render(
        <ErrorBoundary name="TestComponent">
          <ToggleErrorComponent />
        </ErrorBoundary>
      );

      // Verify error UI appears
      expect(screen.getByText("Etwas ist schief gelaufen")).toBeInTheDocument();

      // Click reset button
      const resetButton = screen.getByRole("button", { name: /erneut versuchen/i });
      throwError = false; // Stop throwing error
      fireEvent.click(resetButton);

      // Force re-render
      rerender(
        <ErrorBoundary name="TestComponent">
          <ToggleErrorComponent />
        </ErrorBoundary>
      );

      // Verify children render again
      expect(screen.getByText("No error")).toBeInTheDocument();
    });

    it("reloads page when 'Seite neu laden' clicked", () => {
      // Mock window.location.reload
      const reloadMock = vi.fn();
      Object.defineProperty(window, "location", {
        value: { reload: reloadMock },
        writable: true,
      });

      render(
        <ErrorBoundary name="TestComponent">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Click reload button
      const reloadButton = screen.getByRole("button", { name: /seite neu laden/i });
      fireEvent.click(reloadButton);

      // Verify reload was called
      expect(reloadMock).toHaveBeenCalledOnce();
    });
  });

  describe("Custom Fallback", () => {
    it("renders custom fallback when provided", () => {
      const customFallback = <div>Custom error UI</div>;

      render(
        <ErrorBoundary name="TestComponent" fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Verify custom fallback appears
      expect(screen.getByText("Custom error UI")).toBeInTheDocument();

      // Verify default fallback does NOT appear
      expect(screen.queryByText("Etwas ist schief gelaufen")).not.toBeInTheDocument();
    });
  });

  describe("Logging Integration", () => {
    it("logs error via logger.error (not console.error)", () => {
      render(
        <ErrorBoundary name="ChatHistory">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Verify logger.error was called
      expect(logger.error).toHaveBeenCalledWith(
        "ChatHistory",
        "Component error caught by boundary",
        expect.objectContaining({
          error: "Test error",
          stack: expect.any(String),
          componentStack: expect.any(String),
        })
      );
    });

    it("calls onError callback when provided", () => {
      const onErrorMock = vi.fn();

      render(
        <ErrorBoundary name="TestComponent" onError={onErrorMock}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Verify onError was called
      expect(onErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Test error" }),
        expect.objectContaining({ componentStack: expect.any(String) })
      );
    });

    it("uses default name 'UnknownComponent' when name not provided", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Verify logger was called with default name
      expect(logger.error).toHaveBeenCalledWith(
        "UnknownComponent",
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe("Error Isolation (Integration)", () => {
    it("isolates ChatHistory error without crashing other boundaries", () => {
      // Simulate page.tsx with multiple boundaries
      const PageWithBoundaries = () => (
        <div>
          <ErrorBoundary name="ChatHistory">
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>

          <ErrorBoundary name="SettingsPanel">
            <div>Settings working</div>
          </ErrorBoundary>

          <ErrorBoundary name="RecordingsLibrary">
            <div>Recordings working</div>
          </ErrorBoundary>
        </div>
      );

      render(<PageWithBoundaries />);

      // Verify ChatHistory shows error
      expect(screen.getByText("Etwas ist schief gelaufen")).toBeInTheDocument();

      // Verify other boundaries still render normally
      expect(screen.getByText("Settings working")).toBeInTheDocument();
      expect(screen.getByText("Recordings working")).toBeInTheDocument();

      // Verify logger was called only for ChatHistory
      expect(logger.error).toHaveBeenCalledWith(
        "ChatHistory",
        expect.any(String),
        expect.any(Object)
      );
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
  });
});
