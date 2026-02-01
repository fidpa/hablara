import { describe, it, expect, vi } from 'vitest';
import {
  cn,
  colorWithOpacity,
  formatTimestamp,
  formatProcessingDuration,
  debounce,
  throttle,
} from '@/lib/utils';

describe('utils.ts - Utility Functions', () => {
  describe('cn (className merge)', () => {
    it('should merge class names', () => {
      const result = cn('text-red-500', 'bg-blue-500');
      expect(result).toBeTruthy();
      expect(result).toContain('text-red-500');
      expect(result).toContain('bg-blue-500');
    });

    it('should handle conditional classes', () => {
      const result = cn('base-class', true && 'conditional-class');
      expect(result).toContain('base-class');
      expect(result).toContain('conditional-class');
    });

    it('should handle false conditional classes', () => {
      const result = cn('base-class', false && 'conditional-class');
      expect(result).toContain('base-class');
      expect(result).not.toContain('conditional-class');
    });

    it('should handle undefined and null', () => {
      const result = cn('base-class', undefined, null);
      expect(result).toContain('base-class');
    });
  });

  describe('colorWithOpacity', () => {
    it('should convert hex to rgba', () => {
      const result = colorWithOpacity('#ef4444', 0.3);
      expect(result).toBe('rgba(239, 68, 68, 0.3)');
    });

    it('should handle hex without hash', () => {
      const result = colorWithOpacity('ef4444', 0.5);
      expect(result).toBe('rgba(239, 68, 68, 0.5)');
    });

    it('should handle CSS variables', () => {
      const result = colorWithOpacity('var(--color-emotion-stress)', 0.3);
      expect(result).toBe('rgba(239, 68, 68, 0.3)');
    });

    it('should fallback to color-mix for unknown CSS variables', () => {
      const result = colorWithOpacity('var(--unknown-color)', 0.5);
      expect(result).toContain('color-mix');
      expect(result).toContain('50%');
    });

    it('should return original for invalid hex', () => {
      const result = colorWithOpacity('invalid', 0.5);
      expect(result).toBe('invalid');
    });

    it('should handle opacity bounds', () => {
      const result0 = colorWithOpacity('#ef4444', 0);
      expect(result0).toBe('rgba(239, 68, 68, 0)');

      const result1 = colorWithOpacity('#ef4444', 1);
      expect(result1).toBe('rgba(239, 68, 68, 1)');
    });
  });

  describe('formatTimestamp', () => {
    it('should format seconds', () => {
      expect(formatTimestamp(45000)).toBe('0:45');
    });

    it('should format minutes', () => {
      expect(formatTimestamp(125000)).toBe('2:05');
    });

    it('should format hours', () => {
      expect(formatTimestamp(3725000)).toBe('1:02:05');
    });

    it('should handle zero', () => {
      expect(formatTimestamp(0)).toBe('0:00');
    });

    it('should pad single digits', () => {
      expect(formatTimestamp(65000)).toBe('1:05');
      expect(formatTimestamp(3605000)).toBe('1:00:05');
    });
  });

  describe('formatProcessingDuration', () => {
    it('formatiert Duration >= 1000ms als Sekunden mit 1 Dezimalstelle', () => {
      expect(formatProcessingDuration(4200)).toBe('4.2s');
      expect(formatProcessingDuration(1000)).toBe('1.0s');
      expect(formatProcessingDuration(15730)).toBe('15.7s');
    });

    it('formatiert Duration < 1000ms als Millisekunden', () => {
      expect(formatProcessingDuration(850)).toBe('850ms');
      expect(formatProcessingDuration(42)).toBe('42ms');
      expect(formatProcessingDuration(999)).toBe('999ms');
    });

    it('rundet Millisekunden auf nächste Ganzzahl', () => {
      expect(formatProcessingDuration(42.7)).toBe('43ms');
    });

    it('handles zero duration', () => {
      expect(formatProcessingDuration(0)).toBe('0ms');
    });

    it('handles negative duration (defensive guard)', () => {
      expect(formatProcessingDuration(-100)).toBe('0ms');
      expect(formatProcessingDuration(-1)).toBe('0ms');
    });

    it('handles very large durations', () => {
      expect(formatProcessingDuration(999999)).toBe('1000.0s');
      expect(formatProcessingDuration(60000)).toBe('60.0s');
    });
  });

  describe('debounce', () => {
    it('should delay function execution', async () => {
      vi.useFakeTimers();

      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('should reset delay on multiple calls', async () => {
      vi.useFakeTimers();

      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      vi.advanceTimersByTime(50);
      debounced(); // Reset
      vi.advanceTimersByTime(50);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('should pass arguments to debounced function', async () => {
      vi.useFakeTimers();

      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('arg1', 'arg2');
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');

      vi.useRealTimers();
    });
  });

  describe('throttle', () => {
    it('should limit function execution', async () => {
      vi.useFakeTimers();

      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      expect(fn).toHaveBeenCalledTimes(1);

      throttled();
      expect(fn).toHaveBeenCalledTimes(1); // Still 1

      vi.advanceTimersByTime(100);
      throttled();
      expect(fn).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should pass arguments to throttled function', async () => {
      vi.useFakeTimers();

      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled('arg1', 'arg2');
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');

      vi.useRealTimers();
    });

    it('should allow execution after limit expires', async () => {
      vi.useFakeTimers();

      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      throttled();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      throttled();
      expect(fn).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(100);
      throttled();
      expect(fn).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });
  });
});
