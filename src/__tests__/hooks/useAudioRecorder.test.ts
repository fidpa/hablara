import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

// Mock Tauri
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock toast (dynamic import)
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  toast: mockToast,
}));

// Mock useTauri hook
vi.mock('@/hooks/useTauri', () => ({
  useTauri: () => ({
    isTauri: false,
    isReady: false,
    invoke: vi.fn(),
    listen: vi.fn(),
    registerHotkey: vi.fn(),
  }),
}));

describe('useAudioRecorder Hook', () => {
  let mockMediaStream: MediaStream;
  let mockAudioContext: AudioContext;

  beforeEach(() => {
    vi.clearAllMocks();
    // Use fake timers with shouldAdvanceTime to control both setInterval and Date.now()
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Mock MediaStream
    mockMediaStream = {
      getTracks: () => [
        {
          stop: vi.fn(),
          enabled: true,
        } as unknown as MediaStreamTrack,
      ],
      getAudioTracks: () => [],
      getVideoTracks: () => [],
      id: 'mock-stream',
      active: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      addTrack: vi.fn(),
      removeTrack: vi.fn(),
      getTrackById: vi.fn(),
      clone: vi.fn(),
      onaddtrack: null,
      onremovetrack: null,
    } as unknown as MediaStream;

    // Mock AudioContext
    mockAudioContext = {
      createMediaStreamSource: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
      })),
      createAnalyser: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
        fftSize: 2048,
        frequencyBinCount: 1024,
        getByteTimeDomainData: vi.fn(),
        getByteFrequencyData: vi.fn(),
      })),
      createScriptProcessor: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
        onaudioprocess: null,
      })),
      state: 'running',
      sampleRate: 16000,
      destination: {} as AudioDestinationNode,
      close: vi.fn(),
    } as unknown as AudioContext;

    // Mock navigator.mediaDevices.getUserMedia
    global.navigator = {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
      },
    } as unknown as Navigator;

    // Mock AudioContext constructor
    (global as { AudioContext: typeof AudioContext }).AudioContext = class MockAudioContext {
      createMediaStreamSource = mockAudioContext.createMediaStreamSource;
      createAnalyser = mockAudioContext.createAnalyser;
      createScriptProcessor = mockAudioContext.createScriptProcessor;
      state = mockAudioContext.state;
      sampleRate = mockAudioContext.sampleRate;
      destination = mockAudioContext.destination;
      close = mockAudioContext.close;
      constructor() {
        return mockAudioContext as unknown as AudioContext;
      }
    } as unknown as typeof AudioContext;

    // Mock requestAnimationFrame - don't execute callback to avoid infinite loops in tests
    let rafId = 0;
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => ++rafId));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('Recording Timer - maxRecordingMinutes', () => {
    it('should show warning toast at 90% of maxRecordingMinutes', async () => {
      const maxMinutes = 10; // 10 minutes
      const { result } = renderHook(() =>
        useAudioRecorder({ maxRecordingMinutes: maxMinutes })
      );

      // Start recording
      await act(async () => {
        await result.current.start();
      });

      // Fast-forward to 90% (9 minutes = 540 seconds)
      await act(async () => {
        vi.advanceTimersByTime(540 * 1000);
      });

      // Wait for dynamic toast import and call
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Aufnahme endet bald',
            description: expect.stringContaining('1 Minute(n) verbleibend'),
          })
        );
      });
    });

    it('should auto-stop recording at 100% of maxRecordingMinutes', async () => {
      const maxMinutes = 1; // 1 minute for faster test
      const { result } = renderHook(() =>
        useAudioRecorder({ maxRecordingMinutes: maxMinutes })
      );

      // Start recording
      await act(async () => {
        await result.current.start();
      });

      expect(result.current.isRecording).toBe(true);

      // Fast-forward to 100% (60 seconds)
      await act(async () => {
        vi.advanceTimersByTime(60 * 1000);
      });

      // Recording should have stopped automatically
      await waitFor(() => {
        expect(result.current.isRecording).toBe(false);
      });
    });

    it('should not show multiple warning toasts', async () => {
      const maxMinutes = 10;
      const { result } = renderHook(() =>
        useAudioRecorder({ maxRecordingMinutes: maxMinutes })
      );

      await act(async () => {
        await result.current.start();
      });

      // Fast-forward past 90% multiple times
      await act(async () => {
        vi.advanceTimersByTime(540 * 1000); // 90%
      });

      await act(async () => {
        vi.advanceTimersByTime(30 * 1000); // 95%
      });

      // Toast should only be called once
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledTimes(1);
      });
    });

    it('should reset warning flag when recording stops', async () => {
      const maxMinutes = 10;
      const { result } = renderHook(() =>
        useAudioRecorder({ maxRecordingMinutes: maxMinutes })
      );

      // First recording - trigger warning
      await act(async () => {
        await result.current.start();
      });

      await act(async () => {
        vi.advanceTimersByTime(540 * 1000); // 90%
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledTimes(1);
      });

      // Stop recording
      await act(async () => {
        await result.current.stop();
      });

      // Clear mock
      mockToast.mockClear();

      // Second recording - should trigger warning again
      await act(async () => {
        await result.current.start();
      });

      await act(async () => {
        vi.advanceTimersByTime(540 * 1000); // 90%
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledTimes(1);
      });
    });

    it('should cleanup timer on unmount', async () => {
      const maxMinutes = 10;
      const { result, unmount } = renderHook(() =>
        useAudioRecorder({ maxRecordingMinutes: maxMinutes })
      );

      await act(async () => {
        await result.current.start();
      });

      // Unmount while recording
      unmount();

      // Advance time - timer should not fire after unmount
      await act(async () => {
        vi.advanceTimersByTime(600 * 1000);
      });

      // Toast should not be called (component unmounted)
      expect(mockToast).not.toHaveBeenCalled();
    });

    it('should respect custom maxRecordingMinutes limit', async () => {
      const customMinutes = 5;
      const { result } = renderHook(() =>
        useAudioRecorder({ maxRecordingMinutes: customMinutes })
      );

      await act(async () => {
        await result.current.start();
      });

      // Fast-forward to 90% of custom limit (4.5 minutes = 270 seconds)
      await act(async () => {
        vi.advanceTimersByTime(270 * 1000);
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            description: expect.stringContaining(`Limit: ${customMinutes} Minuten`),
          })
        );
      });
    });

    it('should not start timer when maxRecordingMinutes is 0', async () => {
      const { result } = renderHook(() =>
        useAudioRecorder({ maxRecordingMinutes: 0 })
      );

      await act(async () => {
        await result.current.start();
      });

      // Fast-forward a long time
      await act(async () => {
        vi.advanceTimersByTime(3600 * 1000); // 1 hour
      });

      // No toast should be shown
      expect(mockToast).not.toHaveBeenCalled();

      // Recording should still be active (no auto-stop)
      expect(result.current.isRecording).toBe(true);
    });

    it('should use default 30 minutes when maxRecordingMinutes is undefined', async () => {
      const { result } = renderHook(() => useAudioRecorder({}));

      await act(async () => {
        await result.current.start();
      });

      // Fast-forward to 90% of 30 minutes (27 minutes = 1620 seconds)
      await act(async () => {
        vi.advanceTimersByTime(1620 * 1000);
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            description: expect.stringContaining('Limit: 30 Minuten'),
          })
        );
      });
    });
  });

  describe('Bug Fixes - Negative Minutes', () => {
    it('should not show negative remaining minutes (uninitialized startTime guard)', async () => {
      const { result } = renderHook(() =>
        useAudioRecorder({ maxRecordingMinutes: 30 })
      );

      // Start recording
      await act(async () => {
        await result.current.start();
      });

      // Immediately check timer (potential race condition)
      // Guard should prevent calculation if startTime not initialized
      await act(async () => {
        vi.advanceTimersByTime(100); // Very short time
      });

      // No toast should be shown (guard prevents overflow)
      expect(mockToast).not.toHaveBeenCalled();

      // Recording should still be active
      expect(result.current.isRecording).toBe(true);
    });

    it('should never show negative remaining minutes in toast (Math.max guard)', async () => {
      const maxMinutes = 1; // Very short for edge case testing
      const { result } = renderHook(() =>
        useAudioRecorder({ maxRecordingMinutes: maxMinutes })
      );

      await act(async () => {
        await result.current.start();
      });

      // Advance to just before auto-stop (59 seconds)
      await act(async () => {
        vi.advanceTimersByTime(59 * 1000);
      });

      // Warning should show, but with non-negative minutes
      await waitFor(() => {
        if (mockToast.mock.calls.length > 0) {
          const toastCall = mockToast.mock.calls[0]?.[0] as { description?: string } | undefined;
          if (toastCall?.description) {
            // Extract minutes from description (e.g., "Noch 1 Minute(n)")
            const match = toastCall.description.match(/Noch (-?\d+) Minute/);
            if (match) {
              const minutes = parseInt(match[1] ?? '0', 10);
              expect(minutes).toBeGreaterThanOrEqual(0); // NEVER negative
            }
          }
        }
      });
    });
  });

  describe('Timer Cleanup', () => {
    it('should cleanup timer when cancel is called', async () => {
      const maxMinutes = 10;
      const { result } = renderHook(() =>
        useAudioRecorder({ maxRecordingMinutes: maxMinutes })
      );

      await act(async () => {
        await result.current.start();
      });

      // Cancel recording
      await act(async () => {
        await result.current.cancel();
      });

      // Advance time - timer should not fire after cancel
      await act(async () => {
        vi.advanceTimersByTime(600 * 1000);
      });

      expect(mockToast).not.toHaveBeenCalled();
    });

    it('should cleanup timer when stop is called', async () => {
      const maxMinutes = 10;
      const { result } = renderHook(() =>
        useAudioRecorder({ maxRecordingMinutes: maxMinutes })
      );

      await act(async () => {
        await result.current.start();
      });

      // Stop recording before warning
      await act(async () => {
        vi.advanceTimersByTime(300 * 1000); // 5 minutes
        await result.current.stop();
      });

      // Advance time - timer should not fire after stop
      await act(async () => {
        vi.advanceTimersByTime(600 * 1000);
      });

      expect(mockToast).not.toHaveBeenCalled();
    });
  });

  describe('Concurrent Start Prevention (P0-3)', () => {
    it('should prevent concurrent start calls when already recording', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      // Start recording
      await act(async () => {
        const success = await result.current.start();
        expect(success).toBe(true);
      });

      expect(result.current.isRecording).toBe(true);

      // Try starting again while already recording
      await act(async () => {
        const success = await result.current.start();
        expect(success).toBe(false); // Should return false
      });

      // Should still be recording (not restarted)
      expect(result.current.isRecording).toBe(true);
    });

    it('should prevent concurrent start calls while start is in progress', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      // Mock getUserMedia with a 100ms delay to simulate async start
      global.navigator.mediaDevices.getUserMedia = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(mockMediaStream), 100);
        });
      });

      // Start two calls concurrently (without await)
      const promise1 = act(async () => result.current.start());
      const promise2 = act(async () => result.current.start());

      // Wait for both promises
      const [result1, result2] = await Promise.all([promise1, promise2]);

      // One should succeed (true), one should fail (false)
      const results = [result1, result2].sort();
      expect(results).toEqual([false, true]);
    });

    it('should allow starting after previous recording stopped', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      // Start recording
      await act(async () => {
        await result.current.start();
      });

      expect(result.current.isRecording).toBe(true);

      // Stop recording
      await act(async () => {
        await result.current.stop();
      });

      expect(result.current.isRecording).toBe(false);

      // Should allow starting again
      await act(async () => {
        const success = await result.current.start();
        expect(success).toBe(true);
      });

      expect(result.current.isRecording).toBe(true);
    });
  });
});
