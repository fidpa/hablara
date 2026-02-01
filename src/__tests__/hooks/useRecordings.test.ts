import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useRecordings,
  createAudioValidationMeta,
  formatDuration,
  formatFileSize,
  formatDate,
} from '@/hooks/useRecordings';
import * as useTauriModule from '@/hooks/useTauri';
import type { RecordingMetadata, StorageConfig, StorageStats } from '@/lib/types';

// Mock useTauri
vi.mock('@/hooks/useTauri');

describe('useRecordings Hook', () => {
  let mockInvoke: ReturnType<typeof vi.fn>;

  const mockRecording: RecordingMetadata = {
    id: 'test-id-1',
    createdAt: '2026-01-27T10:00:00.000Z',
    durationMs: 5000,
    sampleRate: 16000,
    fileSize: 160000,
    audioValidation: {
      rmsEnergy: 0.5,
      durationMs: 5000,
      sampleCount: 80000,
      passed: true,
    },
    vadStats: null,
    transcription: null,
    textFilter: null,
    provider: 'mlx-whisper',
    model: 'german-turbo',
    appVersion: '0.0.1',
  };

  const mockStats: StorageStats = {
    recordingCount: 1,
    totalSizeBytes: 160000,
    totalDurationMs: 5000,
    storagePath: '~/Hablara/recordings',
    maxRecordings: 100,
  };

  const mockConfig: StorageConfig = {
    storageEnabled: true,
    userModeEnabled: false,
    maxRecordings: 100,
    maxUserStorageMb: 500,
    storagePath: '~/Hablara/recordings',
  };

  beforeEach(() => {
    mockInvoke = vi.fn();

    vi.mocked(useTauriModule.useTauri).mockReturnValue({
      isTauri: true,
      isReady: true,
      invoke: mockInvoke as never,
      listen: vi.fn() as never,
      registerHotkey: vi.fn() as never,
    });

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Load', () => {
    it('should load recordings on mount', async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'list_recordings') return Promise.resolve([mockRecording]);
        if (cmd === 'get_storage_stats') return Promise.resolve(mockStats);
        if (cmd === 'get_storage_config') return Promise.resolve(mockConfig);
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useRecordings());

      await waitFor(() => {
        expect(result.current.recordings).toHaveLength(1);
      });

      expect(result.current.recordings[0]).toEqual(mockRecording);
      expect(result.current.stats).toEqual(mockStats);
      expect(result.current.config).toEqual(mockConfig);
    });

    it('should not load if not in Tauri', async () => {
      vi.mocked(useTauriModule.useTauri).mockReturnValue({
        isTauri: false,
        isReady: true,
        invoke: mockInvoke as never,
        listen: vi.fn() as never,
        registerHotkey: vi.fn() as never,
      });

      renderHook(() => useRecordings());

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('should not load if not ready', async () => {
      vi.mocked(useTauriModule.useTauri).mockReturnValue({
        isTauri: true,
        isReady: false,
        invoke: mockInvoke as never,
        listen: vi.fn() as never,
        registerHotkey: vi.fn() as never,
      });

      renderHook(() => useRecordings());

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockInvoke.mockRejectedValue(new Error('Failed to load'));

      const { result } = renderHook(() => useRecordings());

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error).toContain('Failed to load');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('saveRecording', () => {
    it('should save recording and refresh list', async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'save_recording') return Promise.resolve('new-id');
        if (cmd === 'list_recordings') return Promise.resolve([mockRecording]);
        if (cmd === 'get_storage_stats') return Promise.resolve(mockStats);
        if (cmd === 'get_storage_config') return Promise.resolve(mockConfig);
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useRecordings());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const metadata = {
        durationMs: 5000,
        sampleRate: 16000,
        fileSize: 160000,
        audioValidation: mockRecording.audioValidation,
        vadStats: null,
        transcription: null,
        textFilter: null,
        provider: 'mlx-whisper' as const,
        model: 'german-turbo',
      };

      const id = await result.current.saveRecording('base64data', metadata);

      expect(id).toBe('new-id');
      expect(mockInvoke).toHaveBeenCalledWith('save_recording', {
        audioData: 'base64data',
        metadata: expect.objectContaining({
          ...metadata,
          id: '',
          createdAt: '',
          appVersion: '',
        }),
      });
    });

    it('should return null on error', async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'save_recording') return Promise.reject(new Error('Save failed'));
        if (cmd === 'list_recordings') return Promise.resolve([]);
        if (cmd === 'get_storage_stats') return Promise.resolve(mockStats);
        if (cmd === 'get_storage_config') return Promise.resolve(mockConfig);
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useRecordings());

      // Wait for initial load
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const metadata = {
        durationMs: 5000,
        sampleRate: 16000,
        fileSize: 160000,
        audioValidation: mockRecording.audioValidation,
        vadStats: null,
        transcription: null,
        textFilter: null,
        provider: 'mlx-whisper' as const,
        model: 'german-turbo',
      };

      const id = await result.current.saveRecording('base64data', metadata);

      expect(id).toBeNull();

      // Wait for error state
      await waitFor(() => expect(result.current.error).not.toBeNull());
      expect(result.current.error).toContain('Save failed');
    });

    it('should return null if not in Tauri', async () => {
      vi.mocked(useTauriModule.useTauri).mockReturnValue({
        isTauri: false,
        isReady: true,
        invoke: mockInvoke as never,
        listen: vi.fn() as never,
        registerHotkey: vi.fn() as never,
      });

      const { result } = renderHook(() => useRecordings());

      const metadata = {
        durationMs: 5000,
        sampleRate: 16000,
        fileSize: 160000,
        audioValidation: mockRecording.audioValidation,
        vadStats: null,
        transcription: null,
        textFilter: null,
        provider: 'mlx-whisper' as const,
        model: 'german-turbo',
      };

      const id = await result.current.saveRecording('base64data', metadata);

      expect(id).toBeNull();
    });
  });

  describe('getRecordingAudio', () => {
    it('should return audio data', async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'get_recording_audio') return Promise.resolve('base64audiodata');
        if (cmd === 'list_recordings') return Promise.resolve([]);
        if (cmd === 'get_storage_stats') return Promise.resolve(mockStats);
        if (cmd === 'get_storage_config') return Promise.resolve(mockConfig);
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useRecordings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const audio = await result.current.getRecordingAudio('test-id');

      expect(audio).toBe('base64audiodata');
      expect(mockInvoke).toHaveBeenCalledWith('get_recording_audio', {
        id: 'test-id',
      });
    });

    it('should return null on error', async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'get_recording_audio') return Promise.reject(new Error('Not found'));
        if (cmd === 'list_recordings') return Promise.resolve([]);
        if (cmd === 'get_storage_stats') return Promise.resolve(mockStats);
        if (cmd === 'get_storage_config') return Promise.resolve(mockConfig);
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useRecordings());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const audio = await result.current.getRecordingAudio('invalid-id');

      expect(audio).toBeNull();
      await waitFor(() => expect(result.current.error).not.toBeNull());
      expect(result.current.error).toContain('Not found');
    });
  });

  describe('downloadRecording', () => {
    it('should return error when audio not found', async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'get_recording_audio') return Promise.resolve(null);
        if (cmd === 'list_recordings') return Promise.resolve([]);
        if (cmd === 'get_storage_stats') return Promise.resolve(mockStats);
        if (cmd === 'get_storage_config') return Promise.resolve(mockConfig);
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useRecordings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const downloadResult = await result.current.downloadRecording('nonexistent-id', '2026-01-29T15:30:00Z');

      expect(downloadResult.success).toBe(false);
      expect(downloadResult.error).toBe('Audio nicht gefunden');
    });

    it('should handle invalid Base64 gracefully', async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'get_recording_audio') return Promise.resolve('!!!invalid-base64!!!');
        if (cmd === 'list_recordings') return Promise.resolve([]);
        if (cmd === 'get_storage_stats') return Promise.resolve(mockStats);
        if (cmd === 'get_storage_config') return Promise.resolve(mockConfig);
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useRecordings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const downloadResult = await result.current.downloadRecording('test-id', '2026-01-29T15:30:00Z');

      expect(downloadResult.success).toBe(false);
      expect(downloadResult.error).toBe('Audio-Daten ungültig');
    });

    it('should call getRecordingAudio with correct id', async () => {
      // Mock valid base64 audio data
      const mockAudioData = btoa('RIFF....WAV');

      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'get_recording_audio') return Promise.resolve(mockAudioData);
        if (cmd === 'list_recordings') return Promise.resolve([]);
        if (cmd === 'get_storage_stats') return Promise.resolve(mockStats);
        if (cmd === 'get_storage_config') return Promise.resolve(mockConfig);
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useRecordings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // The function will fail trying to import Tauri plugins, but that's expected in tests
      await result.current.downloadRecording('test-id', '2026-01-29T15:30:00Z');

      expect(mockInvoke).toHaveBeenCalledWith('get_recording_audio', { id: 'test-id' });
    });

    it('should handle invalid createdAt timestamp', async () => {
      const mockAudioData = btoa('RIFF....WAV');
      const consoleWarnSpy = vi.spyOn(console, 'warn');

      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'get_recording_audio') return Promise.resolve(mockAudioData);
        if (cmd === 'list_recordings') return Promise.resolve([]);
        if (cmd === 'get_storage_stats') return Promise.resolve(mockStats);
        if (cmd === 'get_storage_config') return Promise.resolve(mockConfig);
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useRecordings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Pass invalid date string
      await result.current.downloadRecording('test-id', 'invalid-date-string');

      // Should log warning but not crash
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should return null if not in Tauri environment', async () => {
      vi.mocked(useTauriModule.useTauri).mockReturnValue({
        isTauri: false,
        isReady: true,
        invoke: mockInvoke as never,
        listen: vi.fn() as never,
        registerHotkey: vi.fn() as never,
      });

      const { result } = renderHook(() => useRecordings());

      const downloadResult = await result.current.downloadRecording('test-id', '2026-01-29T15:30:00Z');

      // In browser environment, getRecordingAudio returns null
      expect(downloadResult.success).toBe(false);
      expect(downloadResult.error).toBe('Audio nicht gefunden');
    });
  });

  describe('deleteRecording', () => {
    it('should delete recording and refresh list', async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'delete_recording') return Promise.resolve(undefined);
        if (cmd === 'list_recordings') return Promise.resolve([]);
        if (cmd === 'get_storage_stats') return Promise.resolve(mockStats);
        if (cmd === 'get_storage_config') return Promise.resolve(mockConfig);
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useRecordings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const success = await result.current.deleteRecording('test-id');

      expect(success).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('delete_recording', {
        id: 'test-id',
      });
    });

    it('should return false on error', async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'delete_recording') return Promise.reject(new Error('Delete failed'));
        if (cmd === 'list_recordings') return Promise.resolve([]);
        if (cmd === 'get_storage_stats') return Promise.resolve(mockStats);
        if (cmd === 'get_storage_config') return Promise.resolve(mockConfig);
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useRecordings());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const success = await result.current.deleteRecording('test-id');

      expect(success).toBe(false);
      await waitFor(() => expect(result.current.error).not.toBeNull());
      expect(result.current.error).toContain('Delete failed');
    });
  });

  describe('clearAllRecordings', () => {
    it('should clear all recordings and return count', async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'clear_all_recordings') return Promise.resolve(5);
        if (cmd === 'list_recordings') return Promise.resolve([]);
        if (cmd === 'get_storage_stats') return Promise.resolve(mockStats);
        if (cmd === 'get_storage_config') return Promise.resolve(mockConfig);
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useRecordings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const count = await result.current.clearAllRecordings();

      expect(count).toBe(5);
      expect(mockInvoke).toHaveBeenCalledWith('clear_all_recordings');
    });

    it('should return 0 on error', async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'clear_all_recordings') return Promise.reject(new Error('Clear failed'));
        if (cmd === 'list_recordings') return Promise.resolve([]);
        if (cmd === 'get_storage_stats') return Promise.resolve(mockStats);
        if (cmd === 'get_storage_config') return Promise.resolve(mockConfig);
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useRecordings());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const count = await result.current.clearAllRecordings();

      expect(count).toBe(0);
      await waitFor(() => expect(result.current.error).not.toBeNull());
      expect(result.current.error).toContain('Clear failed');
    });
  });

  describe('updateConfig', () => {
    it('should update config', async () => {
      const newConfig = { ...mockConfig, maxRecordings: 200 };

      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'update_storage_config') return Promise.resolve(undefined);
        if (cmd === 'list_recordings') return Promise.resolve([]);
        if (cmd === 'get_storage_stats') return Promise.resolve(mockStats);
        // Return original config first, then newConfig after update
        if (cmd === 'get_storage_config') return Promise.resolve(mockConfig);
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useRecordings());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Note: updateConfig doesn't trigger a refresh, it just sets state locally
      const success = await result.current.updateConfig(newConfig);

      expect(success).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('update_storage_config', {
        config: newConfig,
      });

      // The config is set directly in the hook, not from a refresh
      await waitFor(() => expect(result.current.config).toEqual(newConfig));
    });

    it('should return false on error', async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'update_storage_config') return Promise.reject(new Error('Update failed'));
        if (cmd === 'list_recordings') return Promise.resolve([]);
        if (cmd === 'get_storage_stats') return Promise.resolve(mockStats);
        if (cmd === 'get_storage_config') return Promise.resolve(mockConfig);
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useRecordings());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const success = await result.current.updateConfig(mockConfig);

      expect(success).toBe(false);
      await waitFor(() => expect(result.current.error).not.toBeNull());
      expect(result.current.error).toContain('Update failed');
    });
  });
});

describe('useRecordings - Helper Functions', () => {
  describe('createAudioValidationMeta', () => {
    it('should create AudioValidationMeta object', () => {
      const result = createAudioValidationMeta(0.5, 5000, 80000, true);

      expect(result).toEqual({
        rmsEnergy: 0.5,
        durationMs: 5000,
        sampleCount: 80000,
        passed: true,
      });
    });
  });

  describe('formatDuration', () => {
    it('should format seconds only', () => {
      expect(formatDuration(5000)).toBe('5s');
      expect(formatDuration(45000)).toBe('45s');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(65000)).toBe('1:05');
      expect(formatDuration(125000)).toBe('2:05');
    });

    it('should pad seconds with zero', () => {
      expect(formatDuration(60000)).toBe('1:00');
      expect(formatDuration(61000)).toBe('1:01');
    });

    it('should handle zero', () => {
      expect(formatDuration(0)).toBe('0s');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1023)).toBe('1023 B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(5120)).toBe('5.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1.0 MB');
      expect(formatFileSize(5242880)).toBe('5.0 MB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
    });

    it('should handle zero', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });
  });

  describe('formatDate', () => {
    it('should format ISO string to German locale', () => {
      const result = formatDate('2026-01-27T10:30:00.000Z');

      // Should contain date and time
      expect(result).toMatch(/\d{2}\.\d{2}\.\d{4}/); // DD.MM.YYYY
      expect(result).toMatch(/\d{2}:\d{2}/); // HH:MM
    });

    it('should handle different dates', () => {
      const result1 = formatDate('2026-12-31T23:59:00.000Z');
      const result2 = formatDate('2026-01-01T00:01:00.000Z');

      expect(result1).toBeTruthy();
      expect(result2).toBeTruthy();
      expect(result1).not.toBe(result2);
    });
  });
});
