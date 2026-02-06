/**
 * LLM Client Factory Tests (Phase 33 + Phase 40)
 *
 * Tests for getLLMClient singleton cache behavior:
 * - Cache hit/miss based on config
 * - Provider-specific model checking (Ollama vs OpenAI/Anthropic)
 * - Config-based cache key generation
 * - Timeout injection (Phase 40)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DEFAULT_LLM_TIMEOUTS } from '@/lib/types';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock fetch for client availability checks
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Fresh module import for each test
let getLLMClient: typeof import('@/lib/llm').getLLMClient;

describe('LLM Client Factory - Singleton Cache (Phase 33)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockFetch.mockReset();

    // Reset modules to get fresh singleton state
    vi.resetModules();
    const llmModule = await import('@/lib/llm');
    getLLMClient = llmModule.getLLMClient;
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('Cache Behavior', () => {
    it('should return same instance on repeated calls without config', () => {
      const client1 = getLLMClient();
      const client2 = getLLMClient();

      expect(client1).toBe(client2);
    });

    it('should return same instance when called with identical config', () => {
      const config = {
        provider: 'ollama' as const,
        model: 'qwen2.5:7b',
        baseUrl: 'http://localhost:11434',
      };

      const client1 = getLLMClient(config);
      const client2 = getLLMClient(config);

      expect(client1).toBe(client2);
    });

    it('should create new instance when provider changes', () => {
      const ollamaConfig = {
        provider: 'ollama' as const,
        model: 'qwen2.5:7b',
        baseUrl: 'http://localhost:11434',
      };

      const openaiConfig = {
        provider: 'openai' as const,
        model: 'gpt-4o-mini',
      };

      const ollamaClient = getLLMClient(ollamaConfig);
      const openaiClient = getLLMClient(openaiConfig);

      expect(ollamaClient).not.toBe(openaiClient);
      expect(ollamaClient.provider).toBe('ollama');
      expect(openaiClient.provider).toBe('openai');
    });
  });

  describe('Ollama Model Sensitivity', () => {
    it('should create new instance when Ollama model changes', () => {
      const config1 = {
        provider: 'ollama' as const,
        model: 'qwen2.5:7b',
        baseUrl: 'http://localhost:11434',
      };

      const config2 = {
        provider: 'ollama' as const,
        model: 'llama3.1:8b',
        baseUrl: 'http://localhost:11434',
      };

      const client1 = getLLMClient(config1);
      const client2 = getLLMClient(config2);

      // Different models should create different instances
      expect(client1).not.toBe(client2);
      expect(client1.model).toBe('qwen2.5:7b');
      expect(client2.model).toBe('llama3.1:8b');
    });
  });

  describe('OpenAI/Anthropic Model Insensitivity', () => {
    it('should REUSE instance when OpenAI model config differs', () => {
      // First call creates OpenAI client
      const config1 = {
        provider: 'openai' as const,
        model: 'gpt-4o', // Config says gpt-4o
      };

      const config2 = {
        provider: 'openai' as const,
        model: 'gpt-4o-mini', // Config says gpt-4o-mini
      };

      const client1 = getLLMClient(config1);
      const client2 = getLLMClient(config2);

      // Both should be same instance because OpenAI ignores config.model
      // and uses its internal fixed model
      expect(client1).toBe(client2);
      expect(client1.provider).toBe('openai');
    });

    it('should REUSE instance when Anthropic model config differs', () => {
      const config1 = {
        provider: 'anthropic' as const,
        model: 'claude-3-opus',
      };

      const config2 = {
        provider: 'anthropic' as const,
        model: 'claude-sonnet-4',
      };

      const client1 = getLLMClient(config1);
      const client2 = getLLMClient(config2);

      // Both should be same instance because Anthropic ignores config.model
      expect(client1).toBe(client2);
      expect(client1.provider).toBe('anthropic');
    });
  });

  describe('Provider Property', () => {
    it('should set correct provider for Ollama', () => {
      const client = getLLMClient({
        provider: 'ollama',
        model: 'qwen2.5:7b',
      });

      expect(client.provider).toBe('ollama');
    });

    it('should set correct provider for OpenAI', () => {
      const client = getLLMClient({
        provider: 'openai',
        model: 'gpt-4o-mini',
      });

      expect(client.provider).toBe('openai');
    });

    it('should set correct provider for Anthropic', () => {
      const client = getLLMClient({
        provider: 'anthropic',
        model: 'claude-sonnet-4',
      });

      expect(client.provider).toBe('anthropic');
    });
  });

  describe('Default Configuration', () => {
    it('should use Ollama as default provider', () => {
      const client = getLLMClient();

      expect(client.provider).toBe('ollama');
    });

    it('should use qwen2.5:7b-custom as default model for Ollama', () => {
      const client = getLLMClient();

      expect(client.model).toBe('qwen2.5:7b-custom');
    });
  });

  describe('Options Object Support', () => {
    it('should accept config via options object', () => {
      const client = getLLMClient({
        config: {
          provider: 'ollama',
          model: 'test-model',
        },
        onError: vi.fn(),
      });

      expect(client.provider).toBe('ollama');
      expect(client.model).toBe('test-model');
    });

    it('should handle options with only onError', () => {
      const client = getLLMClient({
        onError: vi.fn(),
      });

      // Should use defaults
      expect(client.provider).toBe('ollama');
    });
  });
});

describe('LLM Client Factory - Cross-Provider Switching', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const llmModule = await import('@/lib/llm');
    getLLMClient = llmModule.getLLMClient;
  });

  it('should correctly switch from Ollama to OpenAI and back', () => {
    const ollamaConfig = { provider: 'ollama' as const, model: 'qwen2.5:7b' };
    const openaiConfig = { provider: 'openai' as const, model: 'gpt-4o-mini' };

    const ollama1 = getLLMClient(ollamaConfig);
    expect(ollama1.provider).toBe('ollama');

    const openai = getLLMClient(openaiConfig);
    expect(openai.provider).toBe('openai');
    expect(openai).not.toBe(ollama1);

    const ollama2 = getLLMClient(ollamaConfig);
    expect(ollama2.provider).toBe('ollama');
    // New Ollama instance because we switched providers
    expect(ollama2).not.toBe(ollama1);
  });

  it('should correctly switch through all three providers', () => {
    const configs = [
      { provider: 'ollama' as const, model: 'qwen2.5:7b' },
      { provider: 'openai' as const, model: 'gpt-4o-mini' },
      { provider: 'anthropic' as const, model: 'claude-sonnet-4' },
    ];

    const clients = configs.map((config) => getLLMClient(config));

    // All should have different providers
    expect(clients[0].provider).toBe('ollama');
    expect(clients[1].provider).toBe('openai');
    expect(clients[2].provider).toBe('anthropic');

    // All should be different instances
    expect(clients[0]).not.toBe(clients[1]);
    expect(clients[1]).not.toBe(clients[2]);
  });
});

describe('LLM Client Factory - Timeout Injection (Phase 40)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const llmModule = await import('@/lib/llm');
    getLLMClient = llmModule.getLLMClient;
  });

  it('should inject 120s timeout for Ollama', () => {
    const client = getLLMClient({ provider: 'ollama', model: 'qwen2.5:7b' });
    expect(client['timeoutMs']).toBe(120000);
  });

  it('should inject 30s timeout for OpenAI', () => {
    const client = getLLMClient({ provider: 'openai', model: 'gpt-4o-mini' });
    expect(client['timeoutMs']).toBe(30000);
  });

  it('should inject 30s timeout for Anthropic', () => {
    const client = getLLMClient({ provider: 'anthropic', model: 'claude-sonnet-4' });
    expect(client['timeoutMs']).toBe(30000);
  });

  it('should use default provider timeout when no config', () => {
    const client = getLLMClient();
    const defaultProvider = 'ollama'; // DEFAULT_LLM_CONFIG.provider
    expect(client['timeoutMs']).toBe(DEFAULT_LLM_TIMEOUTS[defaultProvider]);
  });

  it('should inject correct timeout after provider switch', () => {
    // Start with Ollama (120s)
    const ollama = getLLMClient({ provider: 'ollama', model: 'qwen2.5:7b' });
    expect(ollama['timeoutMs']).toBe(120000);

    // Switch to OpenAI (30s)
    const openai = getLLMClient({ provider: 'openai', model: 'gpt-4o-mini' });
    expect(openai['timeoutMs']).toBe(30000);

    // Back to Ollama (120s again)
    const ollama2 = getLLMClient({ provider: 'ollama', model: 'qwen2.5:7b' });
    expect(ollama2['timeoutMs']).toBe(120000);
  });
});
