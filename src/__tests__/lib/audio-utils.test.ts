import { describe, it, expect } from 'vitest';
import { blobToBase64 } from '@/lib/audio-utils';

describe('audio-utils.ts - Audio Utility Functions', () => {
  describe('blobToBase64', () => {
    it('should convert small blob to base64', async () => {
      const text = 'Hello, World!';
      const blob = new Blob([text], { type: 'text/plain' });

      const result = await blobToBase64(blob);

      // Decode and verify
      const decoded = atob(result);
      expect(decoded).toBe(text);
    });

    it('should handle empty blob', async () => {
      const blob = new Blob([], { type: 'text/plain' });

      const result = await blobToBase64(blob);

      expect(result).toBe('');
    });

    it('should handle blob with binary data', async () => {
      const uint8Array = new Uint8Array([0, 1, 2, 3, 4, 5, 255]);
      const blob = new Blob([uint8Array], { type: 'application/octet-stream' });

      const result = await blobToBase64(blob);

      // Verify it's valid base64
      expect(result).toBeTruthy();
      expect(() => atob(result)).not.toThrow();

      // Verify decoded matches original
      const decoded = atob(result);
      const decodedArray = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) {
        decodedArray[i] = decoded.charCodeAt(i);
      }
      expect(Array.from(decodedArray)).toEqual([0, 1, 2, 3, 4, 5, 255]);
    });

    it('should handle large blob (chunked processing)', async () => {
      // Create 16KB of data (2x chunk size)
      const largeData = new Uint8Array(16 * 1024);
      for (let i = 0; i < largeData.length; i++) {
        largeData[i] = i % 256;
      }

      const blob = new Blob([largeData], { type: 'application/octet-stream' });

      const result = await blobToBase64(blob);

      // Verify it's valid base64
      expect(result).toBeTruthy();
      expect(() => atob(result)).not.toThrow();

      // Verify length (base64 is ~4/3 of original)
      const expectedLength = Math.ceil((largeData.length * 4) / 3);
      expect(result.length).toBeCloseTo(expectedLength, -1);
    });

    it('should handle very large blob without stack overflow', async () => {
      // Create 100KB of data (should trigger chunking)
      const veryLargeData = new Uint8Array(100 * 1024);
      for (let i = 0; i < veryLargeData.length; i++) {
        veryLargeData[i] = i % 256;
      }

      const blob = new Blob([veryLargeData], {
        type: 'application/octet-stream',
      });

      // Should not throw "Maximum call stack size exceeded"
      const result = await blobToBase64(blob);

      expect(result).toBeTruthy();
      expect(() => atob(result)).not.toThrow();
    });

    it('should handle audio/wav blob type', async () => {
      // Simulate small WAV data
      const wavData = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, // "RIFF"
        0x24, 0x00, 0x00, 0x00, // Chunk size
        0x57, 0x41, 0x56, 0x45, // "WAVE"
      ]);

      const blob = new Blob([wavData], { type: 'audio/wav' });

      const result = await blobToBase64(blob);

      // Verify it's valid base64
      expect(result).toBeTruthy();
      expect(() => atob(result)).not.toThrow();

      // Verify first 4 bytes decode to "RIFF"
      const decoded = atob(result);
      expect(decoded.substring(0, 4)).toBe('RIFF');
    });

    it('should produce consistent output for same input', async () => {
      const text = 'Consistent test data';
      const blob1 = new Blob([text], { type: 'text/plain' });
      const blob2 = new Blob([text], { type: 'text/plain' });

      const result1 = await blobToBase64(blob1);
      const result2 = await blobToBase64(blob2);

      expect(result1).toBe(result2);
    });

    it('should handle unicode characters', async () => {
      const text = 'Ü€™😀'; // Various unicode chars
      const blob = new Blob([text], { type: 'text/plain' });

      const result = await blobToBase64(blob);

      // Should not throw
      expect(result).toBeTruthy();
      expect(() => atob(result)).not.toThrow();
    });
  });
});
