/**
 * Unit tests for base64 encoding fix in useAudioFileImport
 * Tests chunked processing to prevent "Maximum call stack size exceeded"
 *
 * Guidelines: docs/reference/guidelines/TYPESCRIPT.md
 */

import { describe, it, expect } from 'vitest';

/**
 * Chunked base64 encoding (extracted from useAudioFileImport.ts)
 * Prevents stack overflow for large Uint8Arrays
 */
function uint8ArrayToBase64Chunked(uint8Array: Uint8Array): string {
  const CHUNK_SIZE = 8192; // 8KB chunks (safe for call stack)
  let binary = '';

  for (let i = 0; i < uint8Array.length; i += CHUNK_SIZE) {
    const chunk = uint8Array.subarray(i, i + CHUNK_SIZE);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

/**
 * Naive approach (causes stack overflow for large arrays)
 */
function uint8ArrayToBase64Naive(uint8Array: Uint8Array): string {
  return btoa(String.fromCharCode(...uint8Array));
}

describe('useAudioFileImport - Base64 Encoding Fix', () => {
  describe('Chunked Base64 Encoding', () => {
    it('should encode small arrays correctly', () => {
      const small = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const result = uint8ArrayToBase64Chunked(small);
      expect(result).toBe(btoa('Hello'));
    });

    it('should encode medium arrays (10KB) without stack overflow', () => {
      const medium = new Uint8Array(10 * 1024); // 10KB
      for (let i = 0; i < medium.length; i++) {
        medium[i] = i % 256;
      }

      const result = uint8ArrayToBase64Chunked(medium);
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should encode large arrays (1MB) without stack overflow', () => {
      const large = new Uint8Array(1 * 1024 * 1024); // 1MB (typical for 59s audio)
      for (let i = 0; i < large.length; i++) {
        large[i] = i % 256;
      }

      const result = uint8ArrayToBase64Chunked(large);
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should match naive implementation for small arrays', () => {
      const small = new Uint8Array([1, 2, 3, 4, 5]);
      const chunked = uint8ArrayToBase64Chunked(small);
      const naive = uint8ArrayToBase64Naive(small);
      expect(chunked).toBe(naive);
    });

    it('should handle arrays at chunk boundary (8192 bytes)', () => {
      const exactChunk = new Uint8Array(8192);
      for (let i = 0; i < exactChunk.length; i++) {
        exactChunk[i] = i % 256;
      }

      const result = uint8ArrayToBase64Chunked(exactChunk);
      expect(result).toBeTruthy();
    });

    it('should handle arrays slightly over chunk boundary', () => {
      const overChunk = new Uint8Array(8192 + 100);
      for (let i = 0; i < overChunk.length; i++) {
        overChunk[i] = i % 256;
      }

      const result = uint8ArrayToBase64Chunked(overChunk);
      expect(result).toBeTruthy();
    });

    it('should handle empty array', () => {
      const empty = new Uint8Array(0);
      const result = uint8ArrayToBase64Chunked(empty);
      expect(result).toBe('');
    });

    it('should produce valid base64 output', () => {
      const data = new Uint8Array([65, 66, 67]); // "ABC"
      const result = uint8ArrayToBase64Chunked(data);

      // Valid base64 pattern: alphanumeric + / + = (padding)
      expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });
  });

  describe('Stack Overflow Prevention', () => {
    it('should NOT throw "Maximum call stack size exceeded" for 944KB file', () => {
      const large = new Uint8Array(944 * 1024); // 944KB (bug reproduction size)

      expect(() => {
        uint8ArrayToBase64Chunked(large);
      }).not.toThrow();
    });

    it('should handle maximum allowed file size (50MB)', () => {
      // Note: This test is memory-intensive and may be slow
      const maxSize = 50 * 1024 * 1024; // 50MB
      const huge = new Uint8Array(maxSize);

      expect(() => {
        uint8ArrayToBase64Chunked(huge);
      }).not.toThrow();
    }, 30000); // 30s timeout for large file
  });
});
