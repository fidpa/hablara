import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAvailableWhisperModels } from '../useAvailableWhisperModels';
import type { MlxModelInfo } from '@/lib/types';

// Mock useTauri hook
const mockInvoke = vi.fn();
vi.mock('../useTauri', () => ({
  useTauri: () => ({
    isTauri: true,
    invoke: mockInvoke,
  }),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('useAvailableWhisperModels', () => {
  const DEFAULT_MODEL: MlxModelInfo = {
    id: 'german-turbo',
    displayName: 'German Turbo',
    directory: 'whisper-large-v3-turbo-german-f16',
    sizeEstimate: '~1.6GB',
    description: 'Optimiert für Deutsch',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should return default model initially', () => {
      mockInvoke.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useAvailableWhisperModels());

      expect(result.current.models).toHaveLength(1);
      expect(result.current.models[0].id).toBe('german-turbo');
    });

    it('should set isLoading to true during fetch', async () => {
      mockInvoke.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useAvailableWhisperModels());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });
    });

    it('should have no error initially', () => {
      mockInvoke.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useAvailableWhisperModels());

      expect(result.current.error).toBeNull();
    });
  });

  describe('Successful Discovery', () => {
    it('should return discovered models after successful fetch', async () => {
      const discoveredModels: MlxModelInfo[] = [
        {
          id: 'german-turbo',
          displayName: 'German Turbo',
          directory: 'whisper-large-v3-turbo-german-f16',
          sizeEstimate: '~1.6GB',
          description: 'Optimiert für Deutsch',
        },
        {
          id: 'large-v3',
          displayName: 'Large V3',
          directory: 'whisper-large-v3',
          sizeEstimate: '~2.9GB',
          description: 'Höchste Qualität',
        },
      ];

      mockInvoke.mockResolvedValue(discoveredModels);

      const { result } = renderHook(() => useAvailableWhisperModels());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.models).toHaveLength(2);
      expect(result.current.models[0].id).toBe('german-turbo');
      expect(result.current.models[1].id).toBe('large-v3');
    });

    it('should call list_mlx_whisper_models command', async () => {
      mockInvoke.mockResolvedValue([DEFAULT_MODEL]);

      renderHook(() => useAvailableWhisperModels());

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('list_mlx_whisper_models', {
          mlxPaths: null,
        });
      });
    });

    it('should pass mlxPaths to command when provided', async () => {
      mockInvoke.mockResolvedValue([DEFAULT_MODEL]);

      const mlxPaths = {
        pythonPath: '/custom/python',
        modelsDir: '/custom/models',
      };

      renderHook(() => useAvailableWhisperModels(mlxPaths));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('list_mlx_whisper_models', {
          mlxPaths: mlxPaths,
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should fall back to default model on error', async () => {
      mockInvoke.mockRejectedValue(new Error('Discovery failed'));

      const { result } = renderHook(() => useAvailableWhisperModels());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.models).toHaveLength(1);
      expect(result.current.models[0].id).toBe('german-turbo');
      expect(result.current.error).toBe('Discovery failed');
    });

    it('should fall back to default model when empty array returned', async () => {
      mockInvoke.mockResolvedValue([]);

      const { result } = renderHook(() => useAvailableWhisperModels());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.models).toHaveLength(1);
      expect(result.current.models[0].id).toBe('german-turbo');
    });

    it('should handle non-Error rejection', async () => {
      mockInvoke.mockRejectedValue('String error');

      const { result } = renderHook(() => useAvailableWhisperModels());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Discovery failed');
    });
  });

  describe('Enabled Flag', () => {
    it('should not fetch when enabled is false', async () => {
      mockInvoke.mockResolvedValue([DEFAULT_MODEL]);

      renderHook(() => useAvailableWhisperModels(undefined, false));

      // Give it time to potentially call
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('should fetch when enabled becomes true', async () => {
      mockInvoke.mockResolvedValue([DEFAULT_MODEL]);

      const { rerender } = renderHook(
        ({ enabled }) => useAvailableWhisperModels(undefined, enabled),
        { initialProps: { enabled: false } }
      );

      expect(mockInvoke).not.toHaveBeenCalled();

      rerender({ enabled: true });

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalled();
      });
    });
  });

  describe('Refresh Function', () => {
    it('should provide refresh function', async () => {
      mockInvoke.mockResolvedValue([DEFAULT_MODEL]);

      const { result } = renderHook(() => useAvailableWhisperModels());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refresh).toBe('function');
    });

    it('should re-fetch models when refresh is called', async () => {
      mockInvoke.mockResolvedValue([DEFAULT_MODEL]);

      const { result } = renderHook(() => useAvailableWhisperModels());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockInvoke).toHaveBeenCalledTimes(1);

      await result.current.refresh();

      expect(mockInvoke).toHaveBeenCalledTimes(2);
    });
  });

  describe('Concurrent Call Prevention', () => {
    it('should not make concurrent calls', async () => {
      let resolveFirst: ((value: MlxModelInfo[]) => void) | null = null;
      mockInvoke.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          })
      );

      const { result } = renderHook(() => useAvailableWhisperModels());

      // First call is in progress
      expect(result.current.isLoading).toBe(true);

      // Try to refresh while loading
      result.current.refresh();

      // Should still only have one call pending
      expect(mockInvoke).toHaveBeenCalledTimes(1);

      // Resolve first call
      if (resolveFirst) {
        resolveFirst([DEFAULT_MODEL]);
      }

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});

describe('useAvailableWhisperModels - Non-Tauri Environment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Override mock for non-Tauri
    vi.doMock('../useTauri', () => ({
      useTauri: () => ({
        isTauri: false,
        invoke: vi.fn(),
      }),
    }));
  });

  // Note: This test would require dynamic import mocking
  // The hook should gracefully handle non-Tauri environments
  it.skip('should not attempt discovery in non-Tauri environment', async () => {
    // Implementation depends on how useTauri is mocked
  });
});
