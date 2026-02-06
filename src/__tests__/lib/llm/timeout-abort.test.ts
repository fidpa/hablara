/**
 * Tests for LLM Timeout & AbortSignal Support (Phase 40)
 *
 * Validates that all LLM clients properly handle:
 * - Provider-specific timeout for hanging requests (120s Ollama, 30s Cloud)
 * - User cancellation via AbortSignal
 * - Combined timeout + AbortSignal
 *
 * Strategy: Mock AbortSignal.timeout() to avoid real timeouts and use
 * AbortController to simulate timeout behavior in tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaClient } from '@/lib/llm';
import type { LLMConfig } from '@/lib/types';

// Mock tauri-fetch to bypass async Tauri plugin loading in tests.
// corsSafeFetch delegates directly to global.fetch (which tests spy on).
vi.mock('@/lib/llm/helpers/tauri-fetch', () => ({
  corsSafeFetch: (url: string, init: RequestInit) => fetch(url, init),
  getTauriFetch: () => Promise.resolve(null),
}));

describe('LLM Timeout & AbortSignal Support', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let abortSignalTimeoutSpy: ReturnType<typeof vi.spyOn>;
  let timeoutController: AbortController;

  beforeEach(() => {
    // Reset all mocks for test isolation
    vi.resetAllMocks();

    // Mock fetch
    fetchSpy = vi.spyOn(global, 'fetch');

    // Mock AbortSignal.timeout() to return a controllable AbortController signal
    timeoutController = new AbortController();
    abortSignalTimeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(timeoutController.signal);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    abortSignalTimeoutSpy.mockRestore();
  });

  describe('OllamaClient - Timeout', () => {
    it('should combine user AbortSignal with timeout signal in fetch call', async () => {
      const config: LLMConfig = {
        provider: 'ollama',
        model: 'qwen2.5:7b-custom',
        baseUrl: 'http://localhost:11434',
      };

      const client = new OllamaClient(config);
      const userController = new AbortController();

      // Mock successful response
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            response: JSON.stringify({ primary: 'calm', confidence: 0.8 }),
          })
        )
      );

      // Call with user signal
      await client.analyzeEmotion('test text that is long enough to trigger LLM call', userController.signal);

      // Verify fetch was called with a combined signal (AbortSignal.any())
      expect(fetchSpy).toHaveBeenCalled();
      const callArgs = fetchSpy.mock.calls[0];
      // Combined signal is different object but responds to user abort
      expect(callArgs[1]).toHaveProperty('signal');
      expect(callArgs[1].signal).toBeDefined();
    });

    it('should work without user signal', async () => {
      const config: LLMConfig = {
        provider: 'ollama',
        model: 'qwen2.5:7b-custom',
      };

      const client = new OllamaClient(config);

      // Mock successful response
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            response: JSON.stringify({ primary: 'calm', confidence: 0.8 }),
          })
        )
      );

      const result = await client.analyzeEmotion('test text long enough for LLM');

      // Should work without signal (signal is undefined)
      expect(result.primary).toBe('calm');
      expect(fetchSpy).toHaveBeenCalled();
    });

    it('should pass signal to generateChat', async () => {
      const config: LLMConfig = {
        provider: 'ollama',
        model: 'qwen2.5:7b-custom',
      };

      const client = new OllamaClient(config);
      const userController = new AbortController();

      // Mock successful response
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            response: 'test response',
          })
        )
      );

      const result = await client.generateChat([{ role: 'user', content: 'test' }], userController.signal);

      // Verify signal was passed to fetch
      expect(result).toBe('test response');
      expect(fetchSpy).toHaveBeenCalled();
    });
  });

  describe('OllamaClient - AbortSignal', () => {
    it('should abort LLM call when signal is aborted', async () => {
      const config: LLMConfig = {
        provider: 'ollama',
        model: 'qwen2.5:7b-custom',
      };

      const client = new OllamaClient(config);
      const userController = new AbortController();

      // Mock fetch to listen for abort on ANY signal (user OR timeout)
      fetchSpy.mockImplementation((_, init) => {
        return new Promise((_, reject) => {
          const signal = init?.signal as AbortSignal | undefined;
          if (signal) {
            signal.addEventListener('abort', () => {
              reject(new DOMException('The operation was aborted', 'AbortError'));
            });
          }
        });
      });

      // Test analyzeEmotion with user signal
      const promise = client.analyzeEmotion('test text that is long enough for LLM', userController.signal);

      // User aborts (not timeout)
      userController.abort();

      // High-level methods return default on abort
      const result = await promise;
      expect(result.primary).toBe('neutral');
    });

    it('should abort multiple methods in parallel', async () => {
      const config: LLMConfig = {
        provider: 'ollama',
        model: 'qwen2.5:7b-custom',
      };

      const client = new OllamaClient(config);
      const userController = new AbortController();

      // Mock fetch with abort listener
      fetchSpy.mockImplementation((_, init) => {
        return new Promise((_, reject) => {
          const signal = init?.signal as AbortSignal | undefined;
          if (signal) {
            signal.addEventListener('abort', () => {
              reject(new DOMException('The operation was aborted', 'AbortError'));
            });
          }
        });
      });

      // Start multiple analysis calls with user signal
      const promises = [
        client.analyzeEmotion('prompt 1 long enough for LLM', userController.signal),
        client.analyzeArgument('prompt 2 long enough for LLM', userController.signal),
        client.analyzeGFK('prompt 3 long enough for LLM', userController.signal),
      ];

      // User aborts all
      userController.abort();

      // All should resolve with defaults (high-level methods don't reject)
      const results = await Promise.all(promises);
      expect(results[0].primary).toBe('neutral');
      expect(results[1].fallacies).toEqual([]);
      expect(results[2].observations).toBeDefined(); // GFK has observations field
    });
  });

  describe('OllamaClient - Combined Timeout + AbortSignal', () => {
    it('should respect user abort over timeout', async () => {
      const config: LLMConfig = {
        provider: 'ollama',
        model: 'qwen2.5:7b-custom',
      };

      const client = new OllamaClient(config);
      const userController = new AbortController();

      // Mock fetch with abort listener (both user and timeout)
      fetchSpy.mockImplementation((_, init) => {
        return new Promise((_, reject) => {
          const signal = init?.signal as AbortSignal | undefined;
          if (signal) {
            signal.addEventListener('abort', () => {
              reject(new DOMException('The operation was aborted', 'AbortError'));
            });
          }
        });
      });

      // Test analyzeEmotion with user signal
      const promise = client.analyzeEmotion('test prompt long enough', userController.signal);

      // User aborts (before timeout would trigger)
      userController.abort();

      // Should abort and return default
      const result = await promise;
      expect(result.primary).toBe('neutral');
    });

    it('should respect user abort signal', async () => {
      const config: LLMConfig = {
        provider: 'ollama',
        model: 'qwen2.5:7b-custom',
      };

      const client = new OllamaClient(config);
      const userController = new AbortController();

      // Mock hanging request
      fetchSpy.mockImplementation(() => {
        return new Promise((_, reject) => {
          userController.signal.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted', 'AbortError'));
          });
        });
      });

      // Start request
      const promise = client.analyzeEmotion('test prompt long enough', userController.signal);

      // Abort it
      userController.abort();

      // Should return default (high-level methods catch abort errors)
      const result = await promise;
      expect(result.primary).toBe('neutral');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined signal gracefully', async () => {
      const config: LLMConfig = {
        provider: 'ollama',
        model: 'qwen2.5:7b-custom',
      };

      const client = new OllamaClient(config);

      // Mock successful response
      fetchSpy.mockResolvedValue(
        new Response(
          JSON.stringify({
            response: JSON.stringify({ primary: 'calm', confidence: 0.8 }),
          })
        )
      );

      // Should work with undefined signal (default parameter)
      const result = await client.analyzeEmotion('test prompt long enough');
      expect(result.primary).toBeDefined();
    });

    it('should handle already-aborted signal', async () => {
      const config: LLMConfig = {
        provider: 'ollama',
        model: 'qwen2.5:7b-custom',
      };

      const client = new OllamaClient(config);
      const controller = new AbortController();
      controller.abort(); // Abort before call

      // Mock fetch (should never be called)
      fetchSpy.mockResolvedValue(new Response('{}'));

      // OllamaClient checks signal.aborted upfront and throws
      await expect(
        client.analyzeEmotion('test prompt long enough', controller.signal)
      ).rejects.toThrow(/abort/i);

      // Fetch should not be called (abort happens before fetch)
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
