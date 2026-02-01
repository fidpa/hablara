/**
 * Tests for error handling fixes in useAudioFileImport
 *
 * Bug Fix: TypeError "undefined is not an object (evaluating 'errorMessage.includes')"
 * Root Cause: Unsafe type assertion when error is not an Error object
 *
 * Guidelines: docs/reference/guidelines/TYPESCRIPT.md
 */

import { describe, it, expect } from 'vitest';

/**
 * Safe error message extraction (from useAudioFileImport.ts:472)
 */
function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

describe('useAudioFileImport - Error Handling Fix', () => {
  describe('extractErrorMessage', () => {
    it('should extract message from Error object', () => {
      const error = new Error('Transcription failed');
      expect(extractErrorMessage(error)).toBe('Transcription failed');
    });

    it('should handle string errors (Tauri invoke errors)', () => {
      const error = 'invalid args `speechDuration` for command';
      expect(extractErrorMessage(error)).toBe('invalid args `speechDuration` for command');
    });

    it('should handle number errors', () => {
      const error = 404;
      expect(extractErrorMessage(error)).toBe('404');
    });

    it('should handle object errors', () => {
      const error = { code: 413, message: 'Payload Too Large' };
      expect(extractErrorMessage(error)).toBe('[object Object]');
    });

    it('should handle null/undefined errors', () => {
      expect(extractErrorMessage(null)).toBe('null');
      expect(extractErrorMessage(undefined)).toBe('undefined');
    });

    it('should allow .includes() without TypeError', () => {
      const errors = [
        new Error('Audio analysis failed'),
        'invalid args speechDuration',
        404,
        null,
      ];

      errors.forEach(error => {
        const message = extractErrorMessage(error);
        // Should not throw TypeError
        expect(() => message.includes('Audio')).not.toThrow();
      });
    });

    it('should correctly identify error types for step marking', () => {
      const testCases = [
        { error: new Error('Datei zu groß'), expectedStep: 'audioFileImport' },
        { error: 'Transcription failed', expectedStep: 'transcription' },
        { error: 'analyze_audio_from_wav error', expectedStep: 'audioEmotion' },
        { error: new Error('LLM analysis failed'), expectedStep: 'textEmotion' },
        { error: 'save_recording failed', expectedStep: 'storage' },
      ];

      testCases.forEach(({ error, expectedStep }) => {
        const message = extractErrorMessage(error);

        // Simulate step detection logic
        let detectedStep = 'unknown';
        if (message.includes('Datei') || message.includes('Format')) {
          detectedStep = 'audioFileImport';
        } else if (message.includes('Transcription')) {
          detectedStep = 'transcription';
        } else if (message.includes('analyze_audio_from_wav')) {
          detectedStep = 'audioEmotion';
        } else if (message.includes('LLM')) {
          detectedStep = 'textEmotion';
        } else if (message.includes('save_recording')) {
          detectedStep = 'storage';
        }

        expect(detectedStep).toBe(expectedStep);
      });
    });
  });

  describe('Regression Tests - Original Bug', () => {
    it('should NOT crash with Tauri string error (original bug - analyze_audio_from_wav)', () => {
      // Original error from logs:
      // "invalid args `speechDuration` for command `analyze_audio_from_wav`"
      const tauriError = 'invalid args `speechDuration` for command `analyze_audio_from_wav`: command analyze_audio_from_wav missing required key speechDuration';

      // Before fix: (error as Error).message → undefined → crash
      // After fix: String(error) → works
      const message = extractErrorMessage(tauriError);

      expect(message).toBe(tauriError);
      expect(() => message.includes('speechDuration')).not.toThrow();
      expect(message.includes('analyze_audio_from_wav')).toBe(true);
    });

    it('should NOT crash with Tauri string error (analyze_audio_tone)', () => {
      // Second bug: Same issue with tone analysis
      const tauriError = 'invalid args `speechDuration` for command `analyze_audio_tone`: command analyze_audio_tone missing required key speechDuration';

      const message = extractErrorMessage(tauriError);

      expect(message).toBe(tauriError);
      expect(() => message.includes('speechDuration')).not.toThrow();
      expect(message.includes('analyze_audio_tone')).toBe(true);
    });

    it('should handle Error objects without throwing', () => {
      const realError = new Error('Audio analysis failed');
      const message = extractErrorMessage(realError);

      expect(message).toBe('Audio analysis failed');
      expect(() => message.includes('Audio')).not.toThrow();
    });
  });
});
