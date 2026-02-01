import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AnalysisPipeline,
} from '@/lib/analysis';
import * as ollama from '@/lib/llm';

// Mock LLM client
vi.mock('@/lib/llm', () => ({
  getOllamaClient: vi.fn(() => ({
    analyzeEmotion: vi.fn(),
    analyzeArgument: vi.fn(),
  })),
  getLLMClient: vi.fn(() => ({
    analyzeEmotion: vi.fn(),
    analyzeArgument: vi.fn(),
    analyzeTone: vi.fn(),
    classifyTopic: vi.fn(),
    analyzeGFK: vi.fn(),
    analyzeCognitiveDistortions: vi.fn(),
    analyzeFourSides: vi.fn(),
  })),
}));

describe('TIER 2 Refactoring Tests', () => {
  describe('analyzeTextWithTone - Coverage Gap Tests', () => {
    let pipeline: AnalysisPipeline;
    let mockLLMClient: {
      analyzeEmotion: ReturnType<typeof vi.fn>;
      analyzeArgument: ReturnType<typeof vi.fn>;
      analyzeTone: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      vi.clearAllMocks();
      mockLLMClient = {
        analyzeEmotion: vi.fn(() => Promise.resolve({ primary: 'neutral' as const, confidence: 0.5 })),
        analyzeArgument: vi.fn(() => Promise.resolve({ fallacies: [], enrichment: '' })),
        analyzeTone: vi.fn(() => Promise.resolve({
          formality: 3,
          emotion: 3,
          persuasiveness: 3,
          confidence: 3,
          urgency: 3,
        })),
        classifyTopic: vi.fn(() => Promise.resolve({ topic: 'work_career', confidence: 0.7 })),
        analyzeGFK: vi.fn(() => Promise.resolve(undefined)),
        analyzeCognitiveDistortions: vi.fn(() => Promise.resolve(undefined)),
        analyzeFourSides: vi.fn(() => Promise.resolve(undefined)),
      };
      vi.mocked(ollama.getLLMClient).mockReturnValue(mockLLMClient);
      pipeline = new AnalysisPipeline();
    });

    it('should run emotion + fallacy + tone when all enabled', async () => {
      const result = await pipeline.analyzeTextWithTone(
        'This is a long enough text for fallacy detection to run properly.',
        {
          emotionAnalysisEnabled: true,
          fallacyDetectionEnabled: true,
          toneEnabled: true,
        }
      );

      expect(result.emotion.primary).toBe('neutral');
      expect(result.analysis.fallacies).toEqual([]);
      expect(result.tone).toBeDefined();
      expect(mockLLMClient.analyzeEmotion).toHaveBeenCalled();
      expect(mockLLMClient.analyzeArgument).toHaveBeenCalled();
      expect(mockLLMClient.analyzeTone).toHaveBeenCalled();
    });

    it('should skip tone when toneEnabled=false', async () => {
      const result = await pipeline.analyzeTextWithTone(
        'This is a long enough text for fallacy detection to run properly.',
        {
          emotionAnalysisEnabled: true,
          fallacyDetectionEnabled: true,
          toneEnabled: false,
        }
      );

      expect(result.emotion.primary).toBe('neutral');
      expect(result.analysis.fallacies).toEqual([]);
      expect(result.tone).toBeUndefined();
      expect(mockLLMClient.analyzeTone).not.toHaveBeenCalled();
    });

    it('should fuse audio and text tone correctly', async () => {
      pipeline.lastAudioTone = {
        formality: 5,
        emotion: 5,
        persuasiveness: 5,
        confidence: 5,
        urgency: 5,
      };

      mockLLMClient.analyzeTone.mockResolvedValue({
        formality: 1,
        emotion: 1,
        persuasiveness: 1,
        confidence: 1,
        urgency: 1,
      });

      const result = await pipeline.analyzeTextWithTone('Test text', {
        toneEnabled: true,
      });

      expect(result.tone).toBeDefined();
      expect(result.tone!.formality).toBeGreaterThan(1);
      expect(result.tone!.formality).toBeLessThan(5);
    });
  });
});
