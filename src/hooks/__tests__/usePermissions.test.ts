/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePermissions } from "../usePermissions";

// Mock Tauri plugin with correct function names
const mockCheckMicrophonePermission = vi.fn();
const mockRequestMicrophonePermission = vi.fn();

vi.mock("tauri-plugin-macos-permissions-api", () => ({
  checkMicrophonePermission: mockCheckMicrophonePermission,
  requestMicrophonePermission: mockRequestMicrophonePermission,
}));

describe("usePermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.__TAURI__ for each test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__TAURI__ = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Browser Environment", () => {
    beforeEach(() => {
      // Ensure __TAURI__ is explicitly undefined
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__TAURI__ = undefined;
    });

    it("should default to authorized in browser environment", async () => {
      // Browser environment (no __TAURI__)
      const { result } = renderHook(() => usePermissions());

      // Wait for initial check to complete
      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      expect(result.current.microphoneStatus).toBe("authorized");
      expect(mockCheckMicrophonePermission).not.toHaveBeenCalled();
    });

    it("should return true when requesting permission in browser", async () => {
      const { result } = renderHook(() => usePermissions());

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      const granted = await result.current.requestMicrophone();

      expect(granted).toBe(true);
      // Note: Status may remain as-is since request didn't change it in browser mode
      expect(mockRequestMicrophonePermission).not.toHaveBeenCalled();
    });
  });

  describe("Tauri Environment", () => {
    beforeEach(() => {
      // Set Tauri environment
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__TAURI__ = {};
    });

    it("should check microphone permission on mount", async () => {
      mockCheckMicrophonePermission.mockResolvedValue(true);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.isChecking).toBe(true);

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      expect(result.current.microphoneStatus).toBe("authorized");
      expect(mockCheckMicrophonePermission).toHaveBeenCalled();
    });

    it("should handle not granted permission status", async () => {
      mockCheckMicrophonePermission.mockResolvedValue(false);

      const { result } = renderHook(() => usePermissions());

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      // Plugin returns boolean false = not_determined (could be denied or never asked)
      expect(result.current.microphoneStatus).toBe("not_determined");
    });

    it("should gracefully handle permission check errors", async () => {
      mockCheckMicrophonePermission.mockRejectedValue(new Error("Permission check failed"));

      const { result } = renderHook(() => usePermissions());

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      // Should default to authorized for graceful degradation
      expect(result.current.microphoneStatus).toBe("authorized");
    });
  });

  describe("Request Permission", () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__TAURI__ = {};
    });

    it("should request microphone permission successfully", async () => {
      mockCheckMicrophonePermission.mockResolvedValue(false); // Initial check
      mockRequestMicrophonePermission.mockResolvedValue(undefined);
      // After request, permission is granted
      mockCheckMicrophonePermission.mockResolvedValueOnce(false).mockResolvedValue(true);

      const { result } = renderHook(() => usePermissions());

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      const granted = await result.current.requestMicrophone();

      await waitFor(() => {
        expect(result.current.microphoneStatus).toBe("authorized");
      });

      expect(granted).toBe(true);
      expect(mockRequestMicrophonePermission).toHaveBeenCalled();
    });

    it("should handle denied permission request", async () => {
      mockCheckMicrophonePermission.mockResolvedValue(false); // Initial and after request
      mockRequestMicrophonePermission.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePermissions());

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      const granted = await result.current.requestMicrophone();

      await waitFor(() => {
        expect(result.current.microphoneStatus).toBe("denied");
      });

      expect(granted).toBe(false);
    });

    it("should handle permission request errors", async () => {
      mockCheckMicrophonePermission.mockResolvedValue(false);
      mockRequestMicrophonePermission.mockRejectedValue(new Error("Request failed"));

      const { result } = renderHook(() => usePermissions());

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      const granted = await result.current.requestMicrophone();

      // Graceful degradation - should return true and set authorized
      await waitFor(() => {
        expect(result.current.microphoneStatus).toBe("authorized");
      });

      expect(granted).toBe(true);
    });
  });

  describe("Recheck Permissions", () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__TAURI__ = {};
    });

    it("should recheck permissions when called", async () => {
      mockCheckMicrophonePermission.mockResolvedValueOnce(false);

      const { result } = renderHook(() => usePermissions());

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      expect(result.current.microphoneStatus).toBe("not_determined");

      // User manually grants permission in System Settings
      mockCheckMicrophonePermission.mockResolvedValueOnce(true);

      await result.current.recheckPermissions();

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      expect(result.current.microphoneStatus).toBe("authorized");
      expect(mockCheckMicrophonePermission).toHaveBeenCalledTimes(2);
    });
  });

  describe("Component Unmount Safety", () => {
    it("should not update state after unmount", async () => {
      // Delay the mock to simulate slow async operation
      mockCheckMicrophonePermission.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(true), 100))
      );

      const { result, unmount } = renderHook(() => usePermissions());

      // Unmount before async completes
      unmount();

      // Wait for async to complete
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should not throw or cause issues
      expect(result.current.isChecking).toBe(true); // State not updated after unmount
    });
  });

  describe("Auto-Recheck on Focus/Visibility", () => {
    beforeEach(() => {
      // Set Tauri environment
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__TAURI__ = {};
    });

    it("should recheck permissions when window gains focus", async () => {
      // Initial check returns not granted
      mockCheckMicrophonePermission.mockResolvedValueOnce(false);

      const { result } = renderHook(() => usePermissions());

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      expect(result.current.microphoneStatus).toBe("not_determined");

      // User grants permission in system dialog, then returns to app
      mockCheckMicrophonePermission.mockResolvedValueOnce(true);

      // Simulate window focus
      window.dispatchEvent(new Event("focus"));

      await waitFor(() => {
        expect(result.current.microphoneStatus).toBe("authorized");
      });

      // Should have been called twice: initial + on focus
      expect(mockCheckMicrophonePermission).toHaveBeenCalledTimes(2);
    });

    it("should recheck permissions on visibility change to visible", async () => {
      // Initial check returns not granted
      mockCheckMicrophonePermission.mockResolvedValueOnce(false);

      const { result } = renderHook(() => usePermissions());

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      expect(result.current.microphoneStatus).toBe("not_determined");

      // User grants permission, then switches back to app
      mockCheckMicrophonePermission.mockResolvedValueOnce(true);

      // Simulate visibility change
      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));

      await waitFor(() => {
        expect(result.current.microphoneStatus).toBe("authorized");
      });
    });

    it("should NOT recheck when already authorized (optimization)", async () => {
      // Initial check returns granted
      mockCheckMicrophonePermission.mockResolvedValueOnce(true);

      const { result } = renderHook(() => usePermissions());

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      expect(result.current.microphoneStatus).toBe("authorized");
      expect(mockCheckMicrophonePermission).toHaveBeenCalledTimes(1);

      // Simulate focus - should NOT trigger recheck
      window.dispatchEvent(new Event("focus"));

      // Give time for potential async operations
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should still only have been called once
      expect(mockCheckMicrophonePermission).toHaveBeenCalledTimes(1);
    });

    it("should NOT recheck when visibility is hidden", async () => {
      mockCheckMicrophonePermission.mockResolvedValueOnce(false);

      const { result } = renderHook(() => usePermissions());

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      // Simulate visibility change to hidden
      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));

      // Give time for potential async operations
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should NOT recheck when hidden
      expect(mockCheckMicrophonePermission).toHaveBeenCalledTimes(1);
    });

    it("should cleanup event listeners on unmount", async () => {
      mockCheckMicrophonePermission.mockResolvedValue(false);

      const addEventSpy = vi.spyOn(window, "addEventListener");
      const removeEventSpy = vi.spyOn(window, "removeEventListener");

      const { unmount } = renderHook(() => usePermissions());

      await waitFor(() => {
        expect(addEventSpy).toHaveBeenCalledWith("focus", expect.any(Function));
      });

      unmount();

      expect(removeEventSpy).toHaveBeenCalledWith("focus", expect.any(Function));

      addEventSpy.mockRestore();
      removeEventSpy.mockRestore();
    });
  });
});
