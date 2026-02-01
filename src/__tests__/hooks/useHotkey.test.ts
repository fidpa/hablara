import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useHotkey } from '@/hooks/useHotkey';
import * as useTauriModule from '@/hooks/useTauri';

// Mock useTauri
vi.mock('@/hooks/useTauri');

describe('useHotkey Hook', () => {
  let mockRegisterHotkey: ReturnType<typeof vi.fn>;
  let mockUnregister: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockUnregister = vi.fn().mockResolvedValue(undefined);
    mockRegisterHotkey = vi.fn().mockResolvedValue(mockUnregister);

    // Clear all event listeners
    const eventListeners = (window as Window & { _eventListeners?: Record<string, unknown> })._eventListeners || {};
    Object.keys(eventListeners).forEach((event) => {
      delete eventListeners[event];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Tauri Environment', () => {
    beforeEach(() => {
      vi.mocked(useTauriModule.useTauri).mockReturnValue({
        isTauri: true,
        isReady: true,
        invoke: vi.fn() as never,
        listen: vi.fn() as never,
        registerHotkey: mockRegisterHotkey as never,
      });
    });

    it('should register hotkey via Tauri', async () => {
      const callback = vi.fn();

      renderHook(() => useHotkey('Control+Shift+D', callback));

      await waitFor(() => {
        expect(mockRegisterHotkey).toHaveBeenCalledWith(
          'Control+Shift+D',
          expect.any(Function)
        );
      });
    });

    it('should call callback when hotkey is triggered', async () => {
      const callback = vi.fn();
      let hotkeyHandler: (() => void) | undefined;

      mockRegisterHotkey.mockImplementation((shortcut, handler) => {
        hotkeyHandler = handler;
        return Promise.resolve(async () => {
          await mockUnregister();
        });
      });

      renderHook(() => useHotkey('Control+Shift+D', callback));

      await waitFor(() => {
        expect(hotkeyHandler).toBeDefined();
      });

      // Trigger hotkey
      hotkeyHandler!();

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should unregister hotkey on unmount', async () => {
      const callback = vi.fn();

      const { unmount } = renderHook(() => useHotkey('Control+Shift+D', callback));

      await waitFor(() => {
        expect(mockRegisterHotkey).toHaveBeenCalled();
      });

      unmount();

      await waitFor(() => {
        expect(mockUnregister).toHaveBeenCalled();
      });
    });

    it('should not register until isReady', async () => {
      vi.mocked(useTauriModule.useTauri).mockReturnValue({
        isTauri: true,
        isReady: false,
        invoke: vi.fn() as never,
        listen: vi.fn() as never,
        registerHotkey: mockRegisterHotkey as never,
      });

      const callback = vi.fn();

      renderHook(() => useHotkey('Control+Shift+D', callback));

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockRegisterHotkey).not.toHaveBeenCalled();
    });

    it('should update callback without re-registering', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      let hotkeyHandler: (() => void) | undefined;

      mockRegisterHotkey.mockImplementation((shortcut, handler) => {
        hotkeyHandler = handler;
        return Promise.resolve(async () => {
          await mockUnregister();
        });
      });

      const { rerender } = renderHook(
        ({ cb }) => useHotkey('Control+Shift+D', cb),
        { initialProps: { cb: callback1 } }
      );

      await waitFor(() => {
        expect(hotkeyHandler).toBeDefined();
      });

      const initialCallCount = mockRegisterHotkey.mock.calls.length;

      // Trigger with first callback
      hotkeyHandler!();
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled();

      // Update callback
      rerender({ cb: callback2 });

      // Should not re-register
      expect(mockRegisterHotkey).toHaveBeenCalledTimes(initialCallCount);

      // Trigger with new callback
      hotkeyHandler!();
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Shortcut Change Handling (Tauri)', () => {
    beforeEach(() => {
      vi.mocked(useTauriModule.useTauri).mockReturnValue({
        isTauri: true,
        isReady: true,
        invoke: vi.fn() as never,
        listen: vi.fn() as never,
        registerHotkey: mockRegisterHotkey as never,
      });
    });

    it('should unregister old hotkey before registering new one', async () => {
      const callback = vi.fn();
      const { rerender } = renderHook(
        ({ shortcut }) => useHotkey(shortcut, callback),
        { initialProps: { shortcut: 'Control+Shift+D' } }
      );

      await waitFor(() => {
        expect(mockRegisterHotkey).toHaveBeenCalledWith(
          'Control+Shift+D',
          expect.any(Function)
        );
      });

      // Change shortcut
      rerender({ shortcut: 'Control+Shift+X' });

      await waitFor(() => {
        expect(mockUnregister).toHaveBeenCalled();
        expect(mockRegisterHotkey).toHaveBeenCalledWith(
          'Control+Shift+X',
          expect.any(Function)
        );
      });
    });

    it('should cleanup pending registration if unmounted before completion', async () => {
      const callback = vi.fn();
      let resolveRegistration: ((cleanup: () => Promise<void>) => void) | undefined;

      mockRegisterHotkey.mockReturnValue(
        new Promise((resolve) => {
          resolveRegistration = resolve;
        })
      );

      const { unmount } = renderHook(() => useHotkey('Control+Shift+D', callback));

      // Unmount before registration completes
      unmount();

      // Now resolve the registration
      const cleanupFn = vi.fn().mockResolvedValue(undefined);
      resolveRegistration!(cleanupFn);

      await waitFor(() => {
        expect(cleanupFn).toHaveBeenCalled();
      });
    });

    it('should handle rapid shortcut changes without orphaned registrations', async () => {
      const callback = vi.fn();
      const registrations: string[] = [];
      const unregistrations: string[] = [];

      mockRegisterHotkey.mockImplementation((shortcut) => {
        registrations.push(shortcut);
        return Promise.resolve(async () => {
          unregistrations.push(shortcut);
        });
      });

      const { rerender, unmount } = renderHook(
        ({ shortcut }) => useHotkey(shortcut, callback),
        { initialProps: { shortcut: 'Control+Shift+A' } }
      );

      // Rapid changes
      rerender({ shortcut: 'Control+Shift+B' });
      rerender({ shortcut: 'Control+Shift+C' });

      unmount();

      await waitFor(() => {
        expect(unregistrations.length).toBe(registrations.length);
      });
    });

    it('should handle registration errors gracefully', async () => {
      mockRegisterHotkey.mockRejectedValue(new Error('Registration failed'));

      const callback = vi.fn();
      const { unmount } = renderHook(() => useHotkey('Control+Shift+D', callback));

      // Wait for registration attempt
      await waitFor(() => {
        expect(mockRegisterHotkey).toHaveBeenCalledWith(
          'Control+Shift+D',
          expect.any(Function)
        );
      });

      // Should not throw on unmount
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Browser Fallback', () => {
    let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
    let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      vi.mocked(useTauriModule.useTauri).mockReturnValue({
        isTauri: false,
        isReady: true,
        invoke: vi.fn() as never,
        listen: vi.fn() as never,
        registerHotkey: mockRegisterHotkey as never,
      });
      // Spy on window methods before each test in this block
      addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    });

    afterEach(() => {
      // Restore spies after each test
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    it('should register keyboard event listener', async () => {
      const callback = vi.fn();
      renderHook(() => useHotkey('Control+Shift+D', callback));

      await waitFor(() => {
        expect(addEventListenerSpy).toHaveBeenCalledWith(
          'keydown',
          expect.any(Function)
        );
      });
    });

    it('should trigger callback on correct key combination (Control+Shift+D)', async () => {
      const callback = vi.fn();
      renderHook(() => useHotkey('Control+Shift+D', callback));
      await waitFor(() => expect(addEventListenerSpy).toHaveBeenCalled());

      const event = new KeyboardEvent('keydown', {
        key: 'd',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not trigger on wrong key', async () => {
      const callback = vi.fn();
      renderHook(() => useHotkey('Control+Shift+D', callback));
      await waitFor(() => expect(addEventListenerSpy).toHaveBeenCalled());

      const event = new KeyboardEvent('keydown', {
        key: 'x',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should not trigger without shift key', async () => {
      const callback = vi.fn();
      renderHook(() => useHotkey('Control+Shift+D', callback));
      await waitFor(() => expect(addEventListenerSpy).toHaveBeenCalled());

      const event = new KeyboardEvent('keydown', {
        key: 'd',
        ctrlKey: true,
        shiftKey: false,
        bubbles: true,
      });
      window.dispatchEvent(event);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle CommandOrControl (Meta key)', async () => {
      const callback = vi.fn();
      renderHook(() => useHotkey('CommandOrControl+Shift+D', callback));
      await waitFor(() => expect(addEventListenerSpy).toHaveBeenCalled());

      const event = new KeyboardEvent('keydown', {
        key: 'd',
        metaKey: true,
        shiftKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle CommandOrControl (Ctrl key)', async () => {
      const callback = vi.fn();
      renderHook(() => useHotkey('CommandOrControl+Shift+D', callback));
      await waitFor(() => expect(addEventListenerSpy).toHaveBeenCalled());

      const event = new KeyboardEvent('keydown', {
        key: 'd',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should prevent default on hotkey trigger', async () => {
      const callback = vi.fn();
      renderHook(() => useHotkey('Control+Shift+D', callback));
      await waitFor(() => expect(addEventListenerSpy).toHaveBeenCalled());

      const event = new KeyboardEvent('keydown', {
        key: 'd',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      window.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should remove event listener on unmount', async () => {
      const callback = vi.fn();
      const { unmount } = renderHook(() =>
        useHotkey('Control+Shift+D', callback)
      );
      await waitFor(() => expect(addEventListenerSpy).toHaveBeenCalled());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
    });

    it('should be case-insensitive', async () => {
      const callback = vi.fn();
      renderHook(() => useHotkey('CONTROL+SHIFT+D', callback));
      await waitFor(() => expect(addEventListenerSpy).toHaveBeenCalled());

      const event = new KeyboardEvent('keydown', {
        key: 'd',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Shortcut Changes', () => {
    let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
    let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      vi.mocked(useTauriModule.useTauri).mockReturnValue({
        isTauri: false,
        isReady: true,
        invoke: vi.fn() as never,
        listen: vi.fn() as never,
        registerHotkey: mockRegisterHotkey as never,
      });
      addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    });

    afterEach(() => {
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    it('should re-register when shortcut changes', async () => {
      const callback = vi.fn();
      const { rerender } = renderHook(
        ({ shortcut }) => useHotkey(shortcut, callback),
        { initialProps: { shortcut: 'Control+Shift+D' } }
      );

      await waitFor(() => {
        expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
      });

      // Change shortcut
      rerender({ shortcut: 'Control+Shift+X' });

      // Should remove old listener and add new one
      await waitFor(() => {
        expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
        expect(addEventListenerSpy).toHaveBeenCalledTimes(2);
      });

      // Old shortcut should not trigger
      const oldEvent = new KeyboardEvent('keydown', {
        key: 'd',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      });
      window.dispatchEvent(oldEvent);
      expect(callback).not.toHaveBeenCalled();

      // New shortcut should trigger
      const newEvent = new KeyboardEvent('keydown', {
        key: 'x',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      });
      window.dispatchEvent(newEvent);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});

