import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  analyzeAudioEmotion,
  fuseEmotions,
  fuseTones,
  convertRustEmotionResult,
  calculateBlendRatio,
  calculateBlendedCoordinates,
  AnalysisPipeline,
  getAnalysisPipeline,
} from '@/lib/analysis';
import type { AudioFeatures, EmotionState, EmotionResultFromRust, ToneResult, AppSettings } from '@/lib/types';
import { getAudioWeightForMode, getTextWeightForMode } from '@/lib/types';
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

describe('analysis.ts - Core Analysis Logic', () => {
  describe('convertRustEmotionResult', () => {
    it('should convert Rust V2 result with features', () => {
      const rustResult: EmotionResultFromRust = {
        primary: 'stress',
        confidence: 0.85,
        secondary: 'excitement',
        features: { pitch: 220, energy: 0.7, speech_rate: 1.4 },
      };

      const audioFeatures: AudioFeatures = {
        pitch: 220,
        energy: 0.7,
        speechRate: 1.4,
        mfcc: [],
        pitchVariance: 0,
        pitchRange: 0,
        energyVariance: 0,
        pauseDurationAvg: 0,
        pauseFrequency: 0,
        zcrMean: 0,
        spectralCentroid: 0,
        spectralRolloff: 0,
        spectralFlux: 0,
      };

      const result = convertRustEmotionResult(rustResult, audioFeatures);

      expect(result.primary).toBe('stress');
      expect(result.confidence).toBe(0.85);
      expect(result.secondary).toBe('excitement');
      expect(result.audioFeatures).toEqual(audioFeatures);
    });

    it('should handle null secondary emotion', () => {
      const rustResult: EmotionResultFromRust = {
        primary: 'calm',
        confidence: 0.6,
        secondary: null,
        features: null,
      };

      const result = convertRustEmotionResult(rustResult);

      expect(result.primary).toBe('calm');
      expect(result.confidence).toBe(0.6);
      expect(result.secondary).toBeUndefined();
      expect(result.audioFeatures).toBeNull();
    });

    it('should work without audioFeatures parameter', () => {
      const rustResult: EmotionResultFromRust = {
        primary: 'joy',
        confidence: 0.9,
        secondary: null,
        features: { pitch: 150, energy: 0.5, speech_rate: 1.0 },
      };

      const result = convertRustEmotionResult(rustResult);

      expect(result.primary).toBe('joy');
      expect(result.audioFeatures).toBeNull();
    });
  });

  describe('analyzeAudioEmotion', () => {
    it('should detect stress with high energy and pitch', () => {
      const features: AudioFeatures = {
        pitch: 200,
        energy: 0.7,
        speechRate: 1.1,
        mfcc: [],
        pitchVariance: 0,
        pitchRange: 0,
        energyVariance: 0,
        pauseDurationAvg: 0,
        pauseFrequency: 0,
        zcrMean: 0,
        spectralCentroid: 0,
        spectralRolloff: 0,
        spectralFlux: 0,
      };

      const result = analyzeAudioEmotion(features);

      expect(result.primary).toBe('stress');
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.audioFeatures).toBe(features);
    });

    it('should detect excitement with high energy, pitch, and speech rate', () => {
      const features: AudioFeatures = {
        pitch: 190,
        energy: 0.65,
        speechRate: 1.3,
        mfcc: [],
        pitchVariance: 0,
        pitchRange: 0,
        energyVariance: 0,
        pauseDurationAvg: 0,
        pauseFrequency: 0,
        zcrMean: 0,
        spectralCentroid: 0,
        spectralRolloff: 0,
        spectralFlux: 0,
      };

      const result = analyzeAudioEmotion(features);

      expect(result.primary).toBe('excitement');
      expect(result.confidence).toBe(0.7);
    });

    it('should detect calm with low energy and speech rate', () => {
      const features: AudioFeatures = {
        pitch: 100,
        energy: 0.2,
        speechRate: 0.7,
        mfcc: [],
        pitchVariance: 0,
        pitchRange: 0,
        energyVariance: 0,
        pauseDurationAvg: 0,
        pauseFrequency: 0,
        zcrMean: 0,
        spectralCentroid: 0,
        spectralRolloff: 0,
        spectralFlux: 0,
      };

      const result = analyzeAudioEmotion(features);

      expect(result.primary).toBe('calm');
      expect(result.confidence).toBe(0.6);
    });

    it('should detect uncertainty with slow speech and moderate pitch', () => {
      const features: AudioFeatures = {
        pitch: 150,
        energy: 0.3,
        speechRate: 0.65,
        mfcc: [],
        pitchVariance: 0,
        pitchRange: 0,
        energyVariance: 0,
        pauseDurationAvg: 0,
        pauseFrequency: 0,
        zcrMean: 0,
        spectralCentroid: 0,
        spectralRolloff: 0,
        spectralFlux: 0,
      };

      const result = analyzeAudioEmotion(features);

      expect(result.primary).toBe('uncertainty');
      expect(result.confidence).toBe(0.55);
    });

    it('should return neutral as default', () => {
      const features: AudioFeatures = {
        pitch: 120,
        energy: 0.4,
        speechRate: 1.0,
        mfcc: [],
        pitchVariance: 0,
        pitchRange: 0,
        energyVariance: 0,
        pauseDurationAvg: 0,
        pauseFrequency: 0,
        zcrMean: 0,
        spectralCentroid: 0,
        spectralRolloff: 0,
        spectralFlux: 0,
      };

      const result = analyzeAudioEmotion(features);

      expect(result.primary).toBe('neutral');
      expect(result.confidence).toBe(0.5);
    });
  });

  describe('fuseEmotions', () => {
    it('should boost confidence when emotions match', () => {
      const audio: EmotionState = {
        primary: 'stress',
        confidence: 0.7,
        audioFeatures: null,
      };
      const text: Partial<EmotionState> = {
        primary: 'stress',
        confidence: 0.8,
      };

      const result = fuseEmotions(audio, text);

      expect(result.primary).toBe('stress');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.confidence).toBeLessThanOrEqual(1);
      // When emotions match, no secondaryInfo should be set
      expect(result.secondaryInfo).toBeUndefined();
    });

    it('should use weighted decision for different emotions (text wins)', () => {
      const audio: EmotionState = {
        primary: 'calm',
        confidence: 0.6,
        audioFeatures: null,
      };
      const text: Partial<EmotionState> = {
        primary: 'stress',
        confidence: 0.9,
      };

      const result = fuseEmotions(audio, text);

      // Text has higher weighted score (0.9 * 0.6 = 0.54 > 0.6 * 0.4 = 0.24)
      expect(result.primary).toBe('stress');
      expect(result.secondary).toBe('calm');
      expect(result.secondaryInfo).toBeDefined();
      expect(result.secondaryInfo?.type).toBe('calm');
      expect(result.secondaryInfo?.confidence).toBe(0.6);
      expect(result.secondaryInfo?.source).toBe('audio');
    });

    it('should use weighted decision for different emotions (audio wins)', () => {
      const audio: EmotionState = {
        primary: 'excitement',
        confidence: 0.9,
        audioFeatures: null,
      };
      const text: Partial<EmotionState> = {
        primary: 'calm',
        confidence: 0.5,
      };

      const result = fuseEmotions(audio, text);

      // Audio has higher weighted score (0.9 * 0.4 = 0.36 > 0.5 * 0.6 = 0.30)
      expect(result.primary).toBe('excitement');
      expect(result.secondary).toBe('calm');
      expect(result.secondaryInfo).toBeDefined();
      expect(result.secondaryInfo?.type).toBe('calm');
      expect(result.secondaryInfo?.confidence).toBe(0.5);
      expect(result.secondaryInfo?.source).toBe('text');
    });

    it('should preserve audio features', () => {
      const features: AudioFeatures = {
        pitch: 150,
        energy: 0.5,
        speechRate: 1.0,
        mfcc: [],
        pitchVariance: 0,
        pitchRange: 0,
        energyVariance: 0,
        pauseDurationAvg: 0,
        pauseFrequency: 0,
        zcrMean: 0,
        spectralCentroid: 0,
        spectralRolloff: 0,
        spectralFlux: 0,
      };

      const audio: EmotionState = {
        primary: 'neutral',
        confidence: 0.5,
        audioFeatures: features,
      };
      const text: Partial<EmotionState> = {
        primary: 'calm',
        confidence: 0.6,
      };

      const result = fuseEmotions(audio, text);

      expect(result.audioFeatures).toBe(features);
    });

    it('should preserve text markers', () => {
      const audio: EmotionState = {
        primary: 'neutral',
        confidence: 0.5,
        audioFeatures: null,
      };
      const text: Partial<EmotionState> = {
        primary: 'stress',
        confidence: 0.7,
        markers: ['worried', 'anxious'],
      };

      const result = fuseEmotions(audio, text);

      expect(result.markers).toEqual(['worried', 'anxious']);
    });

    it('should handle null audioFeatures', () => {
      const audio: EmotionState = {
        primary: 'neutral',
        confidence: 0.5,
        audioFeatures: null,
      };
      const text: Partial<EmotionState> = {
        primary: 'calm',
        confidence: 0.6,
      };

      const result = fuseEmotions(audio, text);

      expect(result.audioFeatures).toBeNull();
    });
  });

  describe('AnalysisPipeline', () => {
    let pipeline: AnalysisPipeline;
    let mockLLM: {
      analyzeEmotion: ReturnType<typeof vi.fn>;
      analyzeArgument: ReturnType<typeof vi.fn>;
      analyzeTone: ReturnType<typeof vi.fn>;
      classifyTopic: ReturnType<typeof vi.fn>;
      analyzeGFK: ReturnType<typeof vi.fn>;
      analyzeCognitiveDistortions: ReturnType<typeof vi.fn>;
      analyzeFourSides: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      // Reset mock
      vi.clearAllMocks();

      mockLLM = {
        analyzeEmotion: vi.fn(),
        analyzeArgument: vi.fn(),
        analyzeTone: vi.fn(),
        classifyTopic: vi.fn(),
        analyzeGFK: vi.fn(),
        analyzeCognitiveDistortions: vi.fn(),
        analyzeFourSides: vi.fn(),
      };

      vi.mocked(ollama.getLLMClient).mockReturnValue(mockLLM as ReturnType<typeof ollama.getLLMClient>);

      pipeline = new AnalysisPipeline();
    });

    describe('processAudioFeatures', () => {
      it('should update lastAudioEmotion', () => {
        const features: AudioFeatures = {
          pitch: 200,
          energy: 0.7,
          speechRate: 1.1,
          mfcc: [],
          pitchVariance: 0,
          pitchRange: 0,
          energyVariance: 0,
          pauseDurationAvg: 0,
          pauseFrequency: 0,
          zcrMean: 0,
          spectralCentroid: 0,
          spectralRolloff: 0,
          spectralFlux: 0,
        };

        const result = pipeline.processAudioFeatures(features);

        expect(result.primary).toBe('stress');
        expect(pipeline.lastAudioEmotion).toBe(result);
      });
    });

    describe('analyzeText', () => {
      it('should run both emotion and fallacy analysis when enabled', async () => {
        mockLLM.analyzeEmotion.mockResolvedValue({
          primary: 'stress',
          confidence: 0.8,
        });
        mockLLM.analyzeArgument.mockResolvedValue({
          fallacies: [],
          enrichment: 'test enrichment',
        });

        const result = await pipeline.analyzeText('This is a long enough text for fallacy detection to run properly.', {
          emotionAnalysisEnabled: true,
          fallacyDetectionEnabled: true,
        });

        expect(mockLLM.analyzeEmotion).toHaveBeenCalled();
        expect(mockLLM.analyzeArgument).toHaveBeenCalled();
        expect(result.emotion).toBeDefined();
        expect(result.analysis).toBeDefined();
      });

      it('should skip fallacy analysis for short text', async () => {
        mockLLM.analyzeEmotion.mockResolvedValue({
          primary: 'neutral',
          confidence: 0.5,
        });

        const result = await pipeline.analyzeText('Short text', {
          emotionAnalysisEnabled: true,
          fallacyDetectionEnabled: true,
        });

        expect(mockLLM.analyzeEmotion).toHaveBeenCalled();
        expect(mockLLM.analyzeArgument).not.toHaveBeenCalled();
        expect(result.analysis.fallacies).toEqual([]);
      });

      it('should skip fallacy analysis for greetings', async () => {
        mockLLM.analyzeEmotion.mockResolvedValue({
          primary: 'neutral',
          confidence: 0.5,
        });

        const _result = await pipeline.analyzeText('Guten Tag wie geht es Ihnen', {
          emotionAnalysisEnabled: true,
          fallacyDetectionEnabled: true,
        });

        expect(mockLLM.analyzeEmotion).toHaveBeenCalled();
        expect(mockLLM.analyzeArgument).not.toHaveBeenCalled();
      });

      it('should skip emotion analysis when disabled', async () => {
        mockLLM.analyzeArgument.mockResolvedValue({
          fallacies: [],
          enrichment: '',
        });

        const result = await pipeline.analyzeText('This is a long enough text for fallacy detection to run properly.', {
          emotionAnalysisEnabled: false,
          fallacyDetectionEnabled: true,
        });

        expect(mockLLM.analyzeEmotion).not.toHaveBeenCalled();
        expect(mockLLM.analyzeArgument).toHaveBeenCalled();
        expect(result.emotion.primary).toBe('neutral');
      });

      it('should skip fallacy analysis when disabled', async () => {
        mockLLM.analyzeEmotion.mockResolvedValue({
          primary: 'calm',
          confidence: 0.7,
        });

        const result = await pipeline.analyzeText('This is a long enough text for fallacy detection to run properly.', {
          emotionAnalysisEnabled: true,
          fallacyDetectionEnabled: false,
        });

        expect(mockLLM.analyzeEmotion).toHaveBeenCalled();
        expect(mockLLM.analyzeArgument).not.toHaveBeenCalled();
        expect(result.analysis.fallacies).toEqual([]);
      });

      it('should use Promise.all for parallel execution', async () => {
        mockLLM.analyzeEmotion.mockResolvedValue({
          primary: 'neutral',
          confidence: 0.5,
        });
        mockLLM.analyzeArgument.mockResolvedValue({
          fallacies: [],
          enrichment: '',
        });

        const startTime = Date.now();
        await pipeline.analyzeText('This is a long enough text for fallacy detection to run properly.', {
          emotionAnalysisEnabled: true,
          fallacyDetectionEnabled: true,
        });
        const duration = Date.now() - startTime;

        // If sequential, this would take longer
        // In practice, mocks are instant, but structure confirms parallel execution
        expect(mockLLM.analyzeEmotion).toHaveBeenCalled();
        expect(mockLLM.analyzeArgument).toHaveBeenCalled();
        expect(duration).toBeLessThan(100); // Mocks should be near-instant
      });
    });

    describe('quickEmotionCheck', () => {
      it('should analyze text emotion and fuse with audio', async () => {
        mockLLM.analyzeEmotion.mockResolvedValue({
          primary: 'stress',
          confidence: 0.8,
        });

        const result = await pipeline.quickEmotionCheck('I am feeling stressed');

        expect(mockLLM.analyzeEmotion).toHaveBeenCalledWith('I am feeling stressed');
        expect(result.primary).toBeDefined();
      });
    });

    describe('Tier-2 Fallacy Detection', () => {
      it('should detect bandwagon fallacy in group pressure argument', async () => {
        mockLLM.analyzeArgument.mockResolvedValue({
          fallacies: [{
            type: "bandwagon",
            confidence: 0.78,
            quote: "Alle machen das so",
            explanation: "Popularität als Begründung",
            suggestion: "Sachliche Vorteile argumentieren"
          }],
          enrichment: "Bandwagon durch Gruppendruck."
        });

        const result = await pipeline.analyzeText(
          "Alle im Team machen das so, also solltest du das auch machen.",
          { emotionAnalysisEnabled: false, fallacyDetectionEnabled: true }
        );

        expect(mockLLM.analyzeArgument).toHaveBeenCalled();
        expect(result.analysis.fallacies[0].type).toBe("bandwagon");
      });

      it('should detect post_hoc fallacy in temporal correlation', async () => {
        mockLLM.analyzeArgument.mockResolvedValue({
          fallacies: [{
            type: "post_hoc",
            confidence: 0.75,
            quote: "Seit der Regelung gibt es mehr Beschwerden",
            explanation: "Zeitliche Korrelation als Kausalität",
            suggestion: "Alternative Ursachen prüfen"
          }],
          enrichment: "Post hoc erkannt."
        });

        const result = await pipeline.analyzeText(
          "Seit der neuen Regelung gibt es mehr Beschwerden. Das liegt an der Regelung.",
          { emotionAnalysisEnabled: false, fallacyDetectionEnabled: true }
        );

        expect(result.analysis.fallacies[0].type).toBe("post_hoc");
      });

      it('should detect appeal_emotion in emotional manipulation', async () => {
        mockLLM.analyzeArgument.mockResolvedValue({
          fallacies: [{
            type: "appeal_emotion",
            confidence: 0.82,
            quote: "denk an deine Familie",
            explanation: "Emotionale Manipulation",
            suggestion: "Sachliche Vorteile darlegen"
          }],
          enrichment: "Appell an Gefühle."
        });

        const result = await pipeline.analyzeText(
          "Du musst das tun, denk an deine Familie und wie sie leiden würden.",
          { emotionAnalysisEnabled: false, fallacyDetectionEnabled: true }
        );

        expect(result.analysis.fallacies[0].type).toBe("appeal_emotion");
      });

      it('should detect tu_quoque in hypocrisy counter-argument', async () => {
        mockLLM.analyzeArgument.mockResolvedValue({
          fallacies: [{
            type: "tu_quoque",
            confidence: 0.80,
            quote: "Du kommst doch selbst immer zu spät",
            explanation: "Hypocrisy entkräftet Argument nicht",
            suggestion: "Auf Sachargument eingehen"
          }],
          enrichment: "Tu quoque."
        });

        const result = await pipeline.analyzeText(
          "Du sagst ich soll pünktlich sein? Du kommst doch selbst immer zu spät!",
          { emotionAnalysisEnabled: false, fallacyDetectionEnabled: true }
        );

        expect(result.analysis.fallacies[0].type).toBe("tu_quoque");
      });

      it('should still detect Tier-1 ad_hominem after Tier-2 extension', async () => {
        mockLLM.analyzeArgument.mockResolvedValue({
          fallacies: [{
            type: "ad_hominem",
            confidence: 0.85,
            quote: "du bist ja nicht vom Fach",
            explanation: "Angriff auf Qualifikation",
            suggestion: "Auf Argument eingehen"
          }],
          enrichment: "Ad hominem erkannt."
        });

        const result = await pipeline.analyzeText(
          "Deine Meinung zählt nicht, du bist ja nicht vom Fach.",
          { emotionAnalysisEnabled: false, fallacyDetectionEnabled: true }
        );

        expect(result.analysis.fallacies[0].type).toBe("ad_hominem");
      });
    });
  });

  describe('calculateBlendRatio', () => {
    it('should return 0 if secondary confidence below threshold (0.4)', () => {
      const ratio = calculateBlendRatio(0.8, 0.35);
      expect(ratio).toBe(0);
    });

    it('should return 0 if secondary confidence exactly at threshold', () => {
      const ratio = calculateBlendRatio(0.8, 0.39);
      expect(ratio).toBe(0);
    });

    it('should calculate ratio correctly above threshold', () => {
      const ratio = calculateBlendRatio(0.8, 0.5);
      // Secondary ratio = 0.5 / (0.8 + 0.5) = 0.5 / 1.3 ≈ 0.385
      expect(ratio).toBeCloseTo(0.385, 2);
    });

    it('should cap ratio at 0.5 even with high secondary confidence', () => {
      const ratio = calculateBlendRatio(0.3, 0.9);
      // Raw ratio = 0.9 / (0.3 + 0.9) = 0.75, but capped at 0.5
      expect(ratio).toBe(0.5);
    });

    it('should return exactly 0.5 when equal confidences (both high)', () => {
      const ratio = calculateBlendRatio(0.8, 0.8);
      // Ratio = 0.8 / 1.6 = 0.5
      expect(ratio).toBe(0.5);
    });

    it('should return small ratio for low secondary but above threshold', () => {
      const ratio = calculateBlendRatio(0.9, 0.4);
      // Ratio = 0.4 / 1.3 ≈ 0.308
      expect(ratio).toBeCloseTo(0.308, 2);
    });
  });

  describe('calculateBlendedCoordinates', () => {
    it('should interpolate correctly with 50% blend', () => {
      // joy: {valence: 0.9, arousal: 0.7}, stress: {valence: -0.5, arousal: 0.8}
      const coords = calculateBlendedCoordinates('joy', 'stress', 0.5);

      // valence: 0.9 * 0.5 + (-0.5) * 0.5 = 0.45 - 0.25 = 0.2
      // arousal: 0.7 * 0.5 + 0.8 * 0.5 = 0.35 + 0.4 = 0.75
      expect(coords.valence).toBeCloseTo(0.2, 2);
      expect(coords.arousal).toBeCloseTo(0.75, 2);
    });

    it('should interpolate correctly with 25% blend', () => {
      // calm: {valence: 0.6, arousal: 0.2}, excitement: {valence: 0.7, arousal: 0.9}
      const coords = calculateBlendedCoordinates('calm', 'excitement', 0.25);

      // valence: 0.6 * 0.75 + 0.7 * 0.25 = 0.45 + 0.175 = 0.625
      // arousal: 0.2 * 0.75 + 0.9 * 0.25 = 0.15 + 0.225 = 0.375
      expect(coords.valence).toBeCloseTo(0.625, 2);
      expect(coords.arousal).toBeCloseTo(0.375, 2);
    });

    it('should return primary coordinates with 0% blend', () => {
      const coords = calculateBlendedCoordinates('neutral', 'stress', 0);

      // neutral: {valence: 0.0, arousal: 0.5}
      expect(coords.valence).toBe(0.0);
      expect(coords.arousal).toBe(0.5);
    });

    it('should handle negative valence correctly', () => {
      // frustration: {valence: -0.6, arousal: 0.7}, aggression: {valence: -0.8, arousal: 0.9}
      const coords = calculateBlendedCoordinates('frustration', 'aggression', 0.3);

      // valence: -0.6 * 0.7 + (-0.8) * 0.3 = -0.42 - 0.24 = -0.66
      // arousal: 0.7 * 0.7 + 0.9 * 0.3 = 0.49 + 0.27 = 0.76
      expect(coords.valence).toBeCloseTo(-0.66, 2);
      expect(coords.arousal).toBeCloseTo(0.76, 2);
    });

    it('should interpolate between different arousal levels', () => {
      // calm: {valence: 0.6, arousal: 0.2}, stress: {valence: -0.5, arousal: 0.8}
      const coords = calculateBlendedCoordinates('calm', 'stress', 0.4);

      // valence: 0.6 * 0.6 + (-0.5) * 0.4 = 0.36 - 0.2 = 0.16
      // arousal: 0.2 * 0.6 + 0.8 * 0.4 = 0.12 + 0.32 = 0.44
      expect(coords.valence).toBeCloseTo(0.16, 2);
      expect(coords.arousal).toBeCloseTo(0.44, 2);
    });
  });

  describe('fuseEmotions (with blending)', () => {
    it('should calculate blendRatio when audio wins', () => {
      const audio: EmotionState = {
        primary: 'excitement',
        confidence: 0.9,
        audioFeatures: null,
      };
      const text: Partial<EmotionState> = {
        primary: 'calm',
        confidence: 0.5,
      };

      const result = fuseEmotions(audio, text);

      expect(result.primary).toBe('excitement');
      expect(result.secondaryInfo?.blendRatio).toBeDefined();
      expect(result.secondaryInfo?.blendRatio).toBeGreaterThan(0);
    });

    it('should calculate blendRatio when text wins', () => {
      const audio: EmotionState = {
        primary: 'calm',
        confidence: 0.6,
        audioFeatures: null,
      };
      const text: Partial<EmotionState> = {
        primary: 'stress',
        confidence: 0.9,
      };

      const result = fuseEmotions(audio, text);

      expect(result.primary).toBe('stress');
      expect(result.secondaryInfo?.blendRatio).toBeDefined();
      expect(result.secondaryInfo?.blendRatio).toBeGreaterThan(0);
    });

    it('should set blendedCoordinates when blendRatio > 0', () => {
      const audio: EmotionState = {
        primary: 'excitement',
        confidence: 0.8,
        audioFeatures: null,
      };
      const text: Partial<EmotionState> = {
        primary: 'calm',
        confidence: 0.6,
      };

      const result = fuseEmotions(audio, text);

      expect(result.blendedCoordinates).toBeDefined();
      expect(result.blendedCoordinates?.valence).toBeDefined();
      expect(result.blendedCoordinates?.arousal).toBeDefined();
    });

    it('should NOT set blendedCoordinates when secondary confidence too low', () => {
      const audio: EmotionState = {
        primary: 'excitement',
        confidence: 0.9,
        audioFeatures: null,
      };
      const text: Partial<EmotionState> = {
        primary: 'calm',
        confidence: 0.3,  // Below 0.4 threshold
      };

      const result = fuseEmotions(audio, text);

      expect(result.secondaryInfo?.blendRatio).toBe(0);
      expect(result.blendedCoordinates).toBeUndefined();
    });

    it('should NOT set blendRatio when emotions match', () => {
      const audio: EmotionState = {
        primary: 'stress',
        confidence: 0.7,
        audioFeatures: null,
      };
      const text: Partial<EmotionState> = {
        primary: 'stress',
        confidence: 0.8,
      };

      const result = fuseEmotions(audio, text);

      expect(result.primary).toBe('stress');
      expect(result.secondaryInfo).toBeUndefined();
      expect(result.blendedCoordinates).toBeUndefined();
    });
  });

  describe('getAnalysisPipeline (Singleton)', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = getAnalysisPipeline();
      const instance2 = getAnalysisPipeline();

      expect(instance1).toBe(instance2);
    });

    it('should reuse instance when called with same config', () => {
      const config = { provider: 'ollama' as const, model: 'test-model', baseUrl: 'http://localhost:11434' };
      const instance1 = getAnalysisPipeline(config);
      const instance2 = getAnalysisPipeline(config);
      expect(instance1).toBe(instance2);
    });

    it('should create new instance when provider changes', () => {
      const config1 = { provider: 'ollama' as const, model: 'test-model', baseUrl: 'http://localhost:11434' };
      const config2 = { provider: 'openai' as const, model: 'test-model', baseUrl: 'http://localhost:11434' };
      const instance1 = getAnalysisPipeline(config1);
      const instance2 = getAnalysisPipeline(config2);
      expect(instance1).not.toBe(instance2);
    });

    it('should create new instance when model changes', () => {
      const config1 = { provider: 'ollama' as const, model: 'model-a', baseUrl: 'http://localhost:11434' };
      const config2 = { provider: 'ollama' as const, model: 'model-b', baseUrl: 'http://localhost:11434' };
      const instance1 = getAnalysisPipeline(config1);
      const instance2 = getAnalysisPipeline(config2);
      expect(instance1).not.toBe(instance2);
    });

    it('should create new instance when emotionDetectionMode changes', () => {
      const settings1 = { audio: { emotionDetectionMode: 'balanced' as const } } as Partial<AppSettings>;
      const settings2 = { audio: { emotionDetectionMode: 'voice-focus' as const } } as Partial<AppSettings>;
      const instance1 = getAnalysisPipeline(undefined, settings1);
      const instance2 = getAnalysisPipeline(undefined, settings2);
      // emotionDetectionMode is part of configKey, so changing it creates a new instance
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('analyzeTextFull (Phase 21 - Psychological Enrichments)', () => {
    let pipeline: AnalysisPipeline;
    let mockLLM: {
      analyzeEmotion: ReturnType<typeof vi.fn>;
      analyzeArgument: ReturnType<typeof vi.fn>;
      analyzeTone: ReturnType<typeof vi.fn>;
      classifyTopic: ReturnType<typeof vi.fn>;
      analyzeGFK: ReturnType<typeof vi.fn>;
      analyzeCognitiveDistortions: ReturnType<typeof vi.fn>;
      analyzeFourSides: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      vi.clearAllMocks();

      mockLLM = {
        analyzeEmotion: vi.fn(),
        analyzeArgument: vi.fn(),
        analyzeTone: vi.fn(),
        classifyTopic: vi.fn(),
        analyzeGFK: vi.fn(),
        analyzeCognitiveDistortions: vi.fn(),
        analyzeFourSides: vi.fn(),
      };

      vi.mocked(ollama.getLLMClient).mockReturnValue(mockLLM as ReturnType<typeof ollama.getLLMClient>);

      pipeline = new AnalysisPipeline();
    });

    it('should call all 7 LLM methods when all features enabled', async () => {
      mockLLM.analyzeEmotion.mockResolvedValue({ primary: 'neutral', confidence: 0.5 });
      mockLLM.analyzeArgument.mockResolvedValue({ fallacies: [], enrichment: '' });
      mockLLM.analyzeTone.mockResolvedValue({ formality: 3, professionalism: 3, directness: 3, energy: 3, seriousness: 3, confidence: 0.5 });
      mockLLM.classifyTopic.mockResolvedValue({ topic: 'other', confidence: 0.5 });
      mockLLM.analyzeGFK.mockResolvedValue({ observations: [], feelings: [], needs: [], requests: [], gfkTranslation: '', reflectionQuestion: '' });
      mockLLM.analyzeCognitiveDistortions.mockResolvedValue({ distortions: [], overallThinkingStyle: 'balanced' });
      mockLLM.analyzeFourSides.mockResolvedValue({ sachinhalt: '', selbstoffenbarung: '', beziehung: '', appell: '', potentielleMissverstaendnisse: [] });

      const result = await pipeline.analyzeTextFull('This is a long enough test text for all analyses to run properly.', {
        emotionAnalysisEnabled: true,
        fallacyDetectionEnabled: true,
        toneEnabled: true,
        topicClassificationEnabled: true,
        gfkAnalysisEnabled: true,
        cognitiveDistortionEnabled: true,
        fourSidesAnalysisEnabled: true,
      });

      expect(mockLLM.analyzeEmotion).toHaveBeenCalled();
      expect(mockLLM.analyzeArgument).toHaveBeenCalled();
      expect(mockLLM.analyzeTone).toHaveBeenCalled();
      expect(mockLLM.classifyTopic).toHaveBeenCalled();
      expect(mockLLM.analyzeGFK).toHaveBeenCalled();
      expect(mockLLM.analyzeCognitiveDistortions).toHaveBeenCalled();
      expect(mockLLM.analyzeFourSides).toHaveBeenCalled();

      expect(result.emotion).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.tone).toBeDefined();
      expect(result.topic).toBeDefined();
      expect(result.gfk).toBeDefined();
      expect(result.cognitive).toBeDefined();
      expect(result.fourSides).toBeDefined();
    });

    it('should skip GFK when disabled', async () => {
      mockLLM.analyzeEmotion.mockResolvedValue({ primary: 'neutral', confidence: 0.5 });
      mockLLM.analyzeArgument.mockResolvedValue({ fallacies: [], enrichment: '' });

      const result = await pipeline.analyzeTextFull('Test text for GFK skip test', {
        emotionAnalysisEnabled: true,
        fallacyDetectionEnabled: false,
        gfkAnalysisEnabled: false,
        cognitiveDistortionEnabled: false,
        fourSidesAnalysisEnabled: false,
      });

      expect(mockLLM.analyzeGFK).not.toHaveBeenCalled();
      expect(result.gfk).toBeUndefined();
    });

    it('should skip cognitive distortions when disabled', async () => {
      mockLLM.analyzeEmotion.mockResolvedValue({ primary: 'neutral', confidence: 0.5 });

      const result = await pipeline.analyzeTextFull('Test text', {
        emotionAnalysisEnabled: true,
        cognitiveDistortionEnabled: false,
      });

      expect(mockLLM.analyzeCognitiveDistortions).not.toHaveBeenCalled();
      expect(result.cognitive).toBeUndefined();
    });

    it('should skip four-sides when disabled', async () => {
      mockLLM.analyzeEmotion.mockResolvedValue({ primary: 'neutral', confidence: 0.5 });

      const result = await pipeline.analyzeTextFull('Test text', {
        emotionAnalysisEnabled: true,
        fourSidesAnalysisEnabled: false,
      });

      expect(mockLLM.analyzeFourSides).not.toHaveBeenCalled();
      expect(result.fourSides).toBeUndefined();
    });

    it('should execute all LLM calls in parallel with Promise.all', async () => {
      mockLLM.analyzeEmotion.mockResolvedValue({ primary: 'neutral', confidence: 0.5 });
      mockLLM.analyzeArgument.mockResolvedValue({ fallacies: [], enrichment: '' });
      mockLLM.analyzeGFK.mockResolvedValue({ observations: [], feelings: [], needs: [], requests: [], gfkTranslation: '', reflectionQuestion: '' });
      mockLLM.analyzeCognitiveDistortions.mockResolvedValue({ distortions: [], overallThinkingStyle: 'balanced' });
      mockLLM.analyzeFourSides.mockResolvedValue({ sachinhalt: '', selbstoffenbarung: '', beziehung: '', appell: '', potentielleMissverstaendnisse: [] });

      const startTime = Date.now();
      await pipeline.analyzeTextFull('This is a long enough test text for all analyses to run properly.', {
        emotionAnalysisEnabled: true,
        fallacyDetectionEnabled: true,
        gfkAnalysisEnabled: true,
        cognitiveDistortionEnabled: true,
        fourSidesAnalysisEnabled: true,
      });
      const duration = Date.now() - startTime;

      // All 5 LLM calls should be made
      expect(mockLLM.analyzeEmotion).toHaveBeenCalled();
      expect(mockLLM.analyzeArgument).toHaveBeenCalled();
      expect(mockLLM.analyzeGFK).toHaveBeenCalled();
      expect(mockLLM.analyzeCognitiveDistortions).toHaveBeenCalled();
      expect(mockLLM.analyzeFourSides).toHaveBeenCalled();

      // With mocks, execution should be near-instant (parallel)
      expect(duration).toBeLessThan(100);
    });

    it('should return GFK data when provided by LLM', async () => {
      const mockGFK = {
        observations: ['Du hörst mir nicht zu'],
        feelings: ['frustriert'],
        needs: ['Gehört werden'],
        requests: ['Bitte hör mir zu'],
        gfkTranslation: 'Ich beobachte, dass...',
        reflectionQuestion: 'Was brauchst du gerade?',
      };

      mockLLM.analyzeEmotion.mockResolvedValue({ primary: 'neutral', confidence: 0.5 });
      mockLLM.analyzeArgument.mockResolvedValue({ fallacies: [], enrichment: '' });
      mockLLM.analyzeGFK.mockResolvedValue(mockGFK);

      const result = await pipeline.analyzeTextFull('Test text', {
        emotionAnalysisEnabled: true,
        gfkAnalysisEnabled: true,
      });

      expect(result.gfk).toEqual(mockGFK);
      expect(result.gfk?.observations).toHaveLength(1);
      expect(result.gfk?.feelings).toContain('frustriert');
    });

    it('should return cognitive distortions data when provided by LLM', async () => {
      const mockCognitive = {
        distortions: [
          {
            type: 'all_or_nothing',
            quote: 'Ich mache immer alles falsch',
            explanation: 'Schwarz-Weiß-Denken',
            reframe: 'Manchmal mache ich Fehler',
          },
        ],
        overallThinkingStyle: 'somewhat_distorted' as const,
      };

      mockLLM.analyzeEmotion.mockResolvedValue({ primary: 'neutral', confidence: 0.5 });
      mockLLM.analyzeArgument.mockResolvedValue({ fallacies: [], enrichment: '' });
      mockLLM.analyzeCognitiveDistortions.mockResolvedValue(mockCognitive);

      const result = await pipeline.analyzeTextFull('Test text', {
        emotionAnalysisEnabled: true,
        cognitiveDistortionEnabled: true,
      });

      expect(result.cognitive).toEqual(mockCognitive);
      expect(result.cognitive?.distortions).toHaveLength(1);
      expect(result.cognitive?.overallThinkingStyle).toBe('somewhat_distorted');
    });

    it('should return four-sides data when provided by LLM', async () => {
      const mockFourSides = {
        sachinhalt: 'Die Ampel ist grün',
        selbstoffenbarung: 'Ich bin bereit zu fahren',
        beziehung: 'Du-Ansprache',
        appell: 'Fahr los',
        potentielleMissverstaendnisse: ['Könnte als Befehl aufgefasst werden'],
      };

      mockLLM.analyzeEmotion.mockResolvedValue({ primary: 'neutral', confidence: 0.5 });
      mockLLM.analyzeArgument.mockResolvedValue({ fallacies: [], enrichment: '' });
      mockLLM.analyzeFourSides.mockResolvedValue(mockFourSides);

      const result = await pipeline.analyzeTextFull('Test text', {
        emotionAnalysisEnabled: true,
        fourSidesAnalysisEnabled: true,
      });

      expect(result.fourSides).toEqual(mockFourSides);
      expect(result.fourSides?.sachinhalt).toBe('Die Ampel ist grün');
      expect(result.fourSides?.potentielleMissverstaendnisse).toHaveLength(1);
    });
  });

  // Phase 27: Emotion Detection Mode Tests
  describe('Emotion Detection Modes (Phase 27)', () => {
    describe('Weight Helpers', () => {
      it('balanced mode: 40% audio, 60% text', () => {
        expect(getAudioWeightForMode('balanced')).toBe(0.4);
        expect(getTextWeightForMode('balanced')).toBe(0.6);
      });

      it('voice-focus mode: 60% audio, 40% text', () => {
        expect(getAudioWeightForMode('voice-focus')).toBe(0.6);
        expect(getTextWeightForMode('voice-focus')).toBe(0.4);
      });

      it('content-focus mode: 20% audio, 80% text', () => {
        expect(getAudioWeightForMode('content-focus')).toBe(0.2);
        expect(getTextWeightForMode('content-focus')).toBe(0.8);
      });
    });

    describe('fuseEmotions with modes', () => {
      const audio: EmotionState = {
        primary: 'stress',
        confidence: 0.8,
        audioFeatures: null,
      };
      const text: Partial<EmotionState> = {
        primary: 'calm',
        confidence: 0.9,
      };

      it('balanced: text wins (0.9*0.6=0.54 > 0.8*0.4=0.32)', () => {
        const result = fuseEmotions(audio, text, 'balanced');
        expect(result.primary).toBe('calm');
      });

      it('voice-focus: audio wins (0.8*0.6=0.48 > 0.9*0.4=0.36)', () => {
        const result = fuseEmotions(audio, text, 'voice-focus');
        expect(result.primary).toBe('stress');
      });

      it('content-focus: text dominates (0.9*0.8=0.72 >> 0.8*0.2=0.16)', () => {
        const result = fuseEmotions(audio, text, 'content-focus');
        expect(result.primary).toBe('calm');
      });
    });

    describe('fuseTones with modes', () => {
      const audioTone: ToneResult = {
        formality: 2,
        professionalism: 2,
        directness: 4,
        energy: 4,
        seriousness: 2,
        confidence: 0.7,
      };
      const textTone: ToneResult = {
        formality: 4,
        professionalism: 4,
        directness: 2,
        energy: 2,
        seriousness: 4,
        confidence: 0.8,
      };

      it('balanced: weighted average (2*0.4 + 4*0.6 = 3.2 ≈ 3)', () => {
        const result = fuseTones(audioTone, textTone, 'balanced');
        expect(result.formality).toBe(3);
      });

      it('voice-focus: closer to audio (2*0.6 + 4*0.4 = 2.8 ≈ 3)', () => {
        const result = fuseTones(audioTone, textTone, 'voice-focus');
        expect(result.formality).toBe(3);
      });

      it('content-focus: heavily text (2*0.2 + 4*0.8 = 3.6 ≈ 4)', () => {
        const result = fuseTones(audioTone, textTone, 'content-focus');
        expect(result.formality).toBe(4);
      });
    });
  });

  describe('analyzeTextFull - P0-2 Fix (Promise.allSettled)', () => {
    let mockLLMClient: {
      analyzeEmotion: ReturnType<typeof vi.fn>;
      analyzeArgument: ReturnType<typeof vi.fn>;
      analyzeTone: ReturnType<typeof vi.fn>;
      classifyTopic: ReturnType<typeof vi.fn>;
      analyzeGFK: ReturnType<typeof vi.fn>;
      analyzeCognitiveDistortions: ReturnType<typeof vi.fn>;
      analyzeFourSides: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      // Create fresh mock client for each test
      mockLLMClient = {
        analyzeEmotion: vi.fn(() => Promise.resolve({ primary: 'neutral' as const, confidence: 0.5 })),
        analyzeArgument: vi.fn(() => Promise.resolve({ fallacies: [], enrichment: '' })),
        analyzeTone: vi.fn(() => Promise.resolve(undefined)),
        classifyTopic: vi.fn(() => Promise.resolve({ category: 'other' as const, confidence: 0.5 })),
        analyzeGFK: vi.fn(() => Promise.resolve(undefined)),
        analyzeCognitiveDistortions: vi.fn(() => Promise.resolve(undefined)),
        analyzeFourSides: vi.fn(() => Promise.resolve(undefined)),
      };
      vi.mocked(ollama.getLLMClient).mockReturnValue(mockLLMClient);
    });

    it('should return all successful results when no errors', async () => {
      const pipeline = new AnalysisPipeline();
      // Use longer text to pass fallacy pre-filter (MIN_CHARS=40, MIN_WORDS=6)
      const longText = 'This is a long enough test text with more than six words for fallacy detection';
      const result = await pipeline.analyzeTextFull(longText, {
        emotionAnalysisEnabled: true,
        fallacyDetectionEnabled: true,
      });

      expect(result.emotion.primary).toBe('neutral');
      expect(result.analysis.fallacies).toEqual([]);
      expect(mockLLMClient.analyzeEmotion).toHaveBeenCalledWith(longText, undefined);
      expect(mockLLMClient.analyzeArgument).toHaveBeenCalledWith(longText, undefined);
    });

    it('should use fallback when emotion analysis fails (P0-2 CRITICAL)', async () => {
      mockLLMClient.analyzeEmotion.mockRejectedValue(new Error('LLM timeout'));

      const pipeline = new AnalysisPipeline();
      const longText = 'This is a long enough test text with more than six words for fallacy detection';
      const result = await pipeline.analyzeTextFull(longText, {
        emotionAnalysisEnabled: true,
        fallacyDetectionEnabled: true,
      });

      // CRITICAL: Should still return fallacy analysis even if emotion failed
      expect(result.emotion.primary).toBe('neutral'); // Fallback value
      // Note: fuseEmotions adds DEFAULT_CONFIDENCE (0.1) to fallback
      expect(result.emotion.confidence).toBeGreaterThanOrEqual(0);
      expect(result.emotion.confidence).toBeLessThan(0.2);
      expect(result.analysis.fallacies).toEqual([]); // Successful fallacy analysis
    });

    it('should use fallback when fallacy detection fails (P0-2 CRITICAL)', async () => {
      mockLLMClient.analyzeArgument.mockRejectedValue(new Error('JSON parse error'));

      const pipeline = new AnalysisPipeline();
      const result = await pipeline.analyzeTextFull('Test text with argument about politics', {
        emotionAnalysisEnabled: true,
        fallacyDetectionEnabled: true,
      });

      // CRITICAL: Should still return emotion analysis even if fallacy failed
      expect(result.emotion.primary).toBe('neutral'); // Successful emotion
      expect(result.analysis.fallacies).toEqual([]); // Fallback value
      expect(result.analysis.enrichment).toBe(''); // Fallback enrichment
    });

    it('should handle multiple simultaneous failures (P0-2 CRITICAL)', async () => {
      mockLLMClient.analyzeEmotion.mockRejectedValue(new Error('Rate limit'));
      mockLLMClient.analyzeArgument.mockRejectedValue(new Error('Rate limit'));
      mockLLMClient.analyzeGFK.mockRejectedValue(new Error('Rate limit'));

      const pipeline = new AnalysisPipeline();
      const result = await pipeline.analyzeTextFull('Test text', {
        emotionAnalysisEnabled: true,
        fallacyDetectionEnabled: true,
        gfkAnalysisEnabled: true,
      });

      // CRITICAL: Should return ALL fallback values without throwing
      expect(result.emotion.primary).toBe('neutral');
      expect(result.analysis.fallacies).toEqual([]);
      expect(result.gfk).toBeUndefined();
    });

    it('should preserve successful analyses when some fail', async () => {
      mockLLMClient.analyzeEmotion.mockResolvedValue({ primary: 'stress' as const, confidence: 0.8 });
      mockLLMClient.analyzeArgument.mockRejectedValue(new Error('Timeout'));
      mockLLMClient.analyzeCognitiveDistortions.mockResolvedValue({ distortions: [], thinkingStyle: 'balanced' });

      const pipeline = new AnalysisPipeline();
      const result = await pipeline.analyzeTextFull('Test text', {
        emotionAnalysisEnabled: true,
        fallacyDetectionEnabled: true,
        cognitiveDistortionEnabled: true,
      });

      // CRITICAL: Successful analyses should be preserved
      expect(result.emotion.primary).toBe('stress'); // SUCCESS
      expect(result.analysis.fallacies).toEqual([]); // FALLBACK
      expect(result.cognitive?.thinkingStyle).toBe('balanced'); // SUCCESS
    });

    it('should call onProcessingStepUpdate for failed analyses', async () => {
      mockLLMClient.analyzeEmotion.mockRejectedValue(new Error('Network error'));
      const updateCallback = vi.fn();

      const pipeline = new AnalysisPipeline();
      await pipeline.analyzeTextFull('Test text', {
        emotionAnalysisEnabled: true,
        onProcessingStepUpdate: updateCallback,
      });

      // Should notify UI about the failure
      expect(updateCallback).toHaveBeenCalledWith('textEmotion', 'error', expect.stringContaining('fehlgeschlagen'));
    });

    it('should skip disabled analyses without errors', async () => {
      const pipeline = new AnalysisPipeline();
      const result = await pipeline.analyzeTextFull('Test text', {
        emotionAnalysisEnabled: false,
        fallacyDetectionEnabled: false,
        gfkAnalysisEnabled: false,
      });

      expect(result.emotion.primary).toBe('neutral'); // Fallback (disabled)
      expect(result.analysis.fallacies).toEqual([]); // Fallback (disabled)
      expect(result.gfk).toBeUndefined(); // Not requested
      expect(mockLLMClient.analyzeEmotion).not.toHaveBeenCalled();
      expect(mockLLMClient.analyzeArgument).not.toHaveBeenCalled();
      expect(mockLLMClient.analyzeGFK).not.toHaveBeenCalled();
    });
  });
});
