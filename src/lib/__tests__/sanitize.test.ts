/**
 * Unit tests for input sanitization utilities
 *
 * Tests OWASP A03:2021 (Injection) defenses:
 * - Control character removal
 * - Unicode normalization (NFC)
 * - Length enforcement
 */

import { sanitizeInput, sanitizeForDisplay, enforceMaxLength } from '../sanitize';

describe('sanitizeInput', () => {
  describe('Control Character Removal', () => {
    it('should remove NULL bytes', () => {
      const input = 'Hello\x00World';
      expect(sanitizeInput(input)).toBe('HelloWorld');
    });

    it('should remove ESC sequences', () => {
      const input = 'Text\x1B[31mRed\x1B[0m';
      expect(sanitizeInput(input)).toBe('Text[31mRed[0m'); // ESC removed, brackets remain
    });

    it('should remove control characters (except tab, newline, carriage return)', () => {
      const input = 'A\x01B\x02C\x1FD';
      expect(sanitizeInput(input)).toBe('ABCD');
    });

    it('should preserve tab, newline, carriage return', () => {
      const input = 'Line1\nLine2\tTabbed\rCarriage';
      expect(sanitizeInput(input)).toBe('Line1\nLine2\tTabbed\rCarriage');
    });

    it('should remove DEL character (0x7F)', () => {
      const input = 'Text\x7FMore';
      expect(sanitizeInput(input)).toBe('TextMore');
    });
  });

  describe('Unicode Normalization', () => {
    it('should normalize to NFC', () => {
      // NFD: é as e + combining acute (U+0065 U+0301)
      const nfd = 'Café'.normalize('NFD');
      // NFC: é as single character (U+00E9)
      const nfc = 'Café'.normalize('NFC');

      expect(sanitizeInput(nfd)).toBe(nfc);
    });

    it('should handle combining diacritics', () => {
      const input = 'n\u0303'; // ñ as n + combining tilde
      const expected = '\u00F1'; // ñ as single character
      expect(sanitizeInput(input)).toBe(expected);
    });
  });

  describe('Whitespace Handling', () => {
    it('should trim leading whitespace', () => {
      expect(sanitizeInput('  Hello')).toBe('Hello');
    });

    it('should trim trailing whitespace', () => {
      expect(sanitizeInput('Hello  ')).toBe('Hello');
    });

    it('should trim both sides', () => {
      expect(sanitizeInput('  Hello  ')).toBe('Hello');
    });

    it('should preserve internal whitespace', () => {
      expect(sanitizeInput('Hello  World')).toBe('Hello  World');
    });
  });

  describe('Edge Cases', () => {
    it('should return empty string for only whitespace', () => {
      expect(sanitizeInput('   ')).toBe('');
    });

    it('should return empty string for only control characters', () => {
      expect(sanitizeInput('\x00\x01\x02')).toBe('');
    });

    it('should handle empty string', () => {
      expect(sanitizeInput('')).toBe('');
    });

    it('should handle already clean text', () => {
      const clean = 'Hello World';
      expect(sanitizeInput(clean)).toBe(clean);
    });
  });
});

describe('sanitizeForDisplay', () => {
  it('should remove control characters', () => {
    const input = 'Hello\x00World';
    expect(sanitizeForDisplay(input)).toBe('HelloWorld');
  });

  it('should normalize Unicode', () => {
    const nfd = 'Café'.normalize('NFD');
    const nfc = 'Café'.normalize('NFC');
    expect(sanitizeForDisplay(nfd)).toBe(nfc);
  });

  it('should NOT trim whitespace', () => {
    expect(sanitizeForDisplay('  Hello  ')).toBe('  Hello  ');
  });

  it('should preserve internal whitespace', () => {
    expect(sanitizeForDisplay('Hello  World')).toBe('Hello  World');
  });
});

describe('enforceMaxLength', () => {
  it('should return unchanged text when under limit', () => {
    const text = 'Hello';
    expect(enforceMaxLength(text, 10)).toBe(text);
  });

  it('should return unchanged text when exactly at limit', () => {
    const text = 'Hello';
    expect(enforceMaxLength(text, 5)).toBe(text);
  });

  it('should truncate text when over limit', () => {
    const text = 'Hello World';
    expect(enforceMaxLength(text, 5)).toBe('Hello');
  });

  it('should handle empty string', () => {
    expect(enforceMaxLength('', 10)).toBe('');
  });

  it('should handle zero max length', () => {
    expect(enforceMaxLength('Hello', 0)).toBe('');
  });

  it('should return empty string for negative max length', () => {
    expect(enforceMaxLength('Hello', -1)).toBe('');
    expect(enforceMaxLength('Hello', -100)).toBe('');
  });
});

describe('Integration: Combined Sanitization', () => {
  it('should sanitize and truncate in sequence', () => {
    const input = '  Hello\x00World  ';
    const sanitized = sanitizeInput(input);
    const truncated = enforceMaxLength(sanitized, 8);
    expect(truncated).toBe('HelloWor');
  });

  it('should handle complex multi-byte characters with truncation', () => {
    const input = '😀😁😂😃'; // Each emoji is 2 code units (surrogate pair)
    // maxLength=2 means 2 code units = 1 emoji
    expect(enforceMaxLength(input, 2)).toBe('😀');
    // maxLength=4 means 4 code units = 2 emojis
    expect(enforceMaxLength(input, 4)).toBe('😀😁');
  });
});
