import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock the logger module BEFORE importing useTauri
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-global-shortcut', () => ({
  register: vi.fn(),
  unregister: vi.fn(),
}));

// Import AFTER mocks are set up
import { useTauri } from '@/hooks/useTauri';
import { logger } from '@/lib/logger';
import { invoke } from '@tauri-apps/api/core';
import { listen as tauriListen } from '@tauri-apps/api/event';
import { register, unregister } from '@tauri-apps/plugin-global-shortcut';

// Get mocked logger for assertions
const mockLogger = vi.mocked(logger);

describe('useTauri Hook', () => {
  beforeEach(() => {
    // Reset logger mocks
    mockLogger.debug.mockClear();
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
  });

  afterEach(() => {
    // Clean up window properties and mocks after each test
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    delete (window as unknown as { __TAURI_LOGGED__?: boolean }).__TAURI_LOGGED__;
    vi.clearAllMocks();
  });

  describe('isTauri Detection', () => {
    it('should detect Tauri environment when __TAURI_INTERNALS__ exists', async () => {
      Object.defineProperty(window, '__TAURI_INTERNALS__', {
        value: {},
        configurable: true,
      });

      const { result } = renderHook(() => useTauri());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.isTauri).toBe(true);
    });

    it('should detect non-Tauri environment when __TAURI_INTERNALS__ is missing', async () => {
      const { result } = renderHook(() => useTauri());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.isTauri).toBe(false);
    });

    it('should eventually set isReady to true', async () => {
      const { result } = renderHook(() => useTauri());

      // Eventually isReady should become true
      await waitFor(() => expect(result.current.isReady).toBe(true));

      // isTauri should be false (no __TAURI_INTERNALS__ set)
      expect(result.current.isTauri).toBe(false);
    });

    it('should set isReady=true after detection', async () => {
      const { result } = renderHook(() => useTauri());

      // isReady might be set synchronously or asynchronously depending on timing
      // Just verify it becomes true eventually
      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });
    });
  });

  describe('invoke', () => {
    it('should warn and return null when not in Tauri environment', async () => {
      const { result } = renderHook(() => useTauri());
      await waitFor(() => expect(result.current.isReady).toBe(true));

      const response = await result.current.invoke('test_command');

      expect(response).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'useTauri',
        'Tauri not available, cannot invoke: test_command'
      );
      expect(invoke).not.toHaveBeenCalled();
    });

    it('should call tauri-apps/api/core invoke when in Tauri environment', async () => {
      Object.defineProperty(window, '__TAURI_INTERNALS__', {
        value: {},
        configurable: true,
      });
      vi.mocked(invoke).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useTauri());
      await waitFor(() => expect(result.current.isReady).toBe(true));

      const response = await result.current.invoke('test_cmd', {
        data: 'test',
      });

      expect(invoke).toHaveBeenCalledWith('test_cmd', { data: 'test' });
      expect(response).toEqual({ success: true });
    });

    it('should throw errors from tauri invoke', async () => {
      Object.defineProperty(window, '__TAURI_INTERNALS__', {
        value: {},
        configurable: true,
      });
      const testError = new Error('Invoke failed');
      vi.mocked(invoke).mockRejectedValue(testError);

      const { result } = renderHook(() => useTauri());
      await waitFor(() => expect(result.current.isReady).toBe(true));

      await expect(result.current.invoke('failing_cmd')).rejects.toThrow(
        'Invoke failed'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'useTauri',
        'Tauri invoke error (failing_cmd)',
        testError
      );
    });
  });

  describe('listen', () => {
    it('should warn and return null when not in Tauri environment', async () => {
      const { result } = renderHook(() => useTauri());
      await waitFor(() => expect(result.current.isReady).toBe(true));

      const unlisten = await result.current.listen('test_event', vi.fn());

      expect(unlisten).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'useTauri',
        'Tauri not available, cannot listen: test_event'
      );
      expect(tauriListen).not.toHaveBeenCalled();
    });

    it('should call tauri-apps/api/event listen when in Tauri environment', async () => {
      Object.defineProperty(window, '__TAURI_INTERNALS__', {
        value: {},
        configurable: true,
      });
      const mockUnlisten = vi.fn();
      vi.mocked(tauriListen).mockResolvedValue(mockUnlisten);
      const handler = vi.fn();

      const { result } = renderHook(() => useTauri());
      await waitFor(() => expect(result.current.isReady).toBe(true));

      const unlisten = await result.current.listen('test_event', handler);

      expect(tauriListen).toHaveBeenCalledWith(
        'test_event',
        expect.any(Function)
      );

      // Check that the returned function is the one from the mock
      expect(unlisten).toBe(mockUnlisten);
    });
  });

  describe('registerHotkey', () => {
    it('should return null when not in Tauri environment', async () => {
      const { result } = renderHook(() => useTauri());
      await waitFor(() => expect(result.current.isReady).toBe(true));

      const unregister = await result.current.registerHotkey('Ctrl+C', vi.fn());

      expect(unregister).toBeNull();
      expect(register).not.toHaveBeenCalled();
    });

    it('should call tauri-apps/plugin-global-shortcut register and return unregister fn', async () => {
      Object.defineProperty(window, '__TAURI_INTERNALS__', {
        value: {},
        configurable: true,
      });
      vi.mocked(register).mockResolvedValue(undefined);

      const { result } = renderHook(() => useTauri());
      await waitFor(() => expect(result.current.isReady).toBe(true));

      const handler = vi.fn();
      const unregisterFn = await result.current.registerHotkey(
        'Ctrl+C',
        handler
      );

      expect(register).toHaveBeenCalledWith('Ctrl+C', handler);
      expect(unregisterFn).toBeInstanceOf(Function);

      // Test the returned async unregister function
      const unregisterResult = unregisterFn!();
      expect(unregisterResult).toBeInstanceOf(Promise);
      await unregisterResult;
      expect(unregister).toHaveBeenCalledWith('Ctrl+C');
    });
  });

  describe('Stability', () => {
    it('should have stable function references', async () => {
      const { result, rerender } = renderHook(() => useTauri());
      await waitFor(() => expect(result.current.isReady).toBe(true));

      const firstInvoke = result.current.invoke;
      const firstListen = result.current.listen;
      const firstRegisterHotkey = result.current.registerHotkey;

      rerender();

      expect(result.current.invoke).toBe(firstInvoke);
      expect(result.current.listen).toBe(firstListen);
      expect(result.current.registerHotkey).toBe(firstRegisterHotkey);
    });
  });

  describe('Development Logging', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
      // Reset the global flag so logging happens
      delete (window as unknown as { __TAURI_LOGGED__?: boolean }).__TAURI_LOGGED__;
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('should log runtime detection in development', async () => {
      renderHook(() => useTauri());

      await waitFor(() => {
        expect(mockLogger.info).toHaveBeenCalledWith(
          'useTauri',
          'Runtime detected: Web (Development Fallback)'
        );
      });
    });

    it('should only log once globally', async () => {
      renderHook(() => useTauri());
      renderHook(() => useTauri());

      await waitFor(() => {
        expect(mockLogger.info).toHaveBeenCalledTimes(1);
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'useTauri',
        'Runtime detected: Web (Development Fallback)'
      );
    });
  });
});

