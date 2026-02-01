import { vi } from 'vitest';

/**
 * Mock Tauri invoke function
 * Returns predefined responses for common commands
 */
export const createMockInvoke = () => {
  return vi.fn((cmd: string, _args?: Record<string, unknown>) => {
    switch (cmd) {
      // Storage commands
      case 'list_recordings':
        return Promise.resolve([]);
      case 'get_recording':
        return Promise.resolve(null);
      case 'delete_recording':
        return Promise.resolve();
      case 'clear_recordings':
        return Promise.resolve(0);
      case 'get_storage_stats':
        return Promise.resolve({
          count: 0,
          totalSize: 0,
          totalDuration: 0,
        });
      case 'get_storage_config':
        return Promise.resolve({
          storage_path: '~/Hablara/recordings',
          max_recordings: 100,
        });
      case 'update_storage_config':
        return Promise.resolve();

      // Audio commands
      case 'native_start_recording':
        return Promise.resolve();
      case 'native_stop_recording':
        return Promise.resolve('base64audiodata');
      case 'native_get_audio_level':
        return Promise.resolve(0.5);
      case 'list_audio_devices':
        return Promise.resolve([
          { name: 'Default Device', isDefault: true },
        ]);

      // Transcription commands
      case 'transcribe_audio':
        return Promise.resolve({
          text: 'Mock transcript',
          segments: [],
          language: 'de',
        });

      // Analysis commands
      case 'analyze_audio_emotion':
        return Promise.resolve({
          primary: 'neutral',
          confidence: 0.7,
          secondary: null,
          audioFeatures: null,
        });

      default:
        return Promise.reject(new Error(`Unknown command: ${cmd}`));
    }
  });
};

/**
 * Mock global shortcut registration
 */
export const createMockGlobalShortcut = () => ({
  register: vi.fn().mockResolvedValue(undefined),
  unregister: vi.fn().mockResolvedValue(undefined),
  isRegistered: vi.fn().mockResolvedValue(false),
});

/**
 * Mock clipboard manager
 */
export const createMockClipboard = () => ({
  writeText: vi.fn().mockResolvedValue(undefined),
});
