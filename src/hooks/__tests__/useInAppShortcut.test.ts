/**
 * Tests for useInAppShortcut hook
 *
 * Tests the in-app keyboard shortcut functionality used in App Store builds
 * where global hotkeys don't work due to macOS sandbox restrictions.
 */

import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useInAppShortcut } from "../useInAppShortcut";

// Mock logger to avoid console noise in tests
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useInAppShortcut", () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(window, "addEventListener");
    removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("when enabled", () => {
    it("registers keydown listener on mount", () => {
      const callback = vi.fn();
      renderHook(() => useInAppShortcut("Control+Shift+D", callback, true));

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
        { capture: true }
      );
    });

    it("unregisters keydown listener on unmount", () => {
      const callback = vi.fn();
      const { unmount } = renderHook(() =>
        useInAppShortcut("Control+Shift+D", callback, true)
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
        { capture: true }
      );
    });

    it("calls callback when shortcut is triggered", () => {
      const callback = vi.fn();
      renderHook(() => useInAppShortcut("Control+Shift+D", callback, true));

      // Simulate Ctrl+Shift+D keydown
      act(() => {
        const event = new KeyboardEvent("keydown", {
          key: "d",
          ctrlKey: true,
          shiftKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("does not call callback for non-matching keys", () => {
      const callback = vi.fn();
      renderHook(() => useInAppShortcut("Control+Shift+D", callback, true));

      // Simulate wrong key (E instead of D)
      act(() => {
        const event = new KeyboardEvent("keydown", {
          key: "e",
          ctrlKey: true,
          shiftKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it("does not call callback when modifiers don't match", () => {
      const callback = vi.fn();
      renderHook(() => useInAppShortcut("Control+Shift+D", callback, true));

      // Simulate D without Shift
      act(() => {
        const event = new KeyboardEvent("keydown", {
          key: "d",
          ctrlKey: true,
          shiftKey: false,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it("handles CommandOrControl modifier (accepts Ctrl)", () => {
      const callback = vi.fn();
      renderHook(() =>
        useInAppShortcut("CommandOrControl+Shift+D", callback, true)
      );

      act(() => {
        const event = new KeyboardEvent("keydown", {
          key: "d",
          ctrlKey: true,
          shiftKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("handles CommandOrControl modifier (accepts Meta/Cmd)", () => {
      const callback = vi.fn();
      renderHook(() =>
        useInAppShortcut("CommandOrControl+Shift+D", callback, true)
      );

      act(() => {
        const event = new KeyboardEvent("keydown", {
          key: "d",
          metaKey: true,
          shiftKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("prevents default and stops propagation", () => {
      const callback = vi.fn();
      renderHook(() => useInAppShortcut("Control+Shift+D", callback, true));

      const event = new KeyboardEvent("keydown", {
        key: "d",
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");
      const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

      act(() => {
        window.dispatchEvent(event);
      });

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  describe("when disabled", () => {
    it("does not register listener when enabled=false", () => {
      const callback = vi.fn();
      renderHook(() => useInAppShortcut("Control+Shift+D", callback, false));

      expect(addEventListenerSpy).not.toHaveBeenCalled();
    });

    it("does not call callback when disabled", () => {
      const callback = vi.fn();
      renderHook(() => useInAppShortcut("Control+Shift+D", callback, false));

      act(() => {
        const event = new KeyboardEvent("keydown", {
          key: "d",
          ctrlKey: true,
          shiftKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("callback updates", () => {
    it("uses latest callback when triggered", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const { rerender } = renderHook(
        ({ cb }) => useInAppShortcut("Control+Shift+D", cb, true),
        { initialProps: { cb: callback1 } }
      );

      // Update callback
      rerender({ cb: callback2 });

      // Trigger shortcut
      act(() => {
        const event = new KeyboardEvent("keydown", {
          key: "d",
          ctrlKey: true,
          shiftKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });
});
