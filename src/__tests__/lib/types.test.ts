import { describe, it, expect } from 'vitest';
import {
  EMOTION_INFO,
  FALLACY_INFO,
  COGNITIVE_DISTORTION_INFO,
  DEFAULT_SETTINGS,
  EMOTION_COORDINATES,
  COGNITIVE_LOAD_INFO,
  DEFAULT_MLX_PATHS,
  DEFAULT_STORAGE_SETTINGS,
  DEFAULT_PSYCHOLOGICAL_SETTINGS,
  DEFAULT_AUDIO_SETTINGS,
  PROCESSING_STEPS_REGISTRY,
  type EmotionType,
  type FallacyType,
  type CognitiveDistortionType,
  type CognitiveLoadLevel,
  type ChatMessage,
} from '@/lib/types';

describe('types.ts - Type Definitions', () => {
  describe('EMOTION_INFO', () => {
    const emotionTypes: EmotionType[] = [
      'neutral',
      'calm',
      'stress',
      'excitement',
      'uncertainty',
      'frustration',
      'joy',
      'doubt',
      'conviction',
      'aggression',
    ];

    it('should have entries for all 10 emotion types', () => {
      emotionTypes.forEach((type) => {
        expect(EMOTION_INFO[type]).toBeDefined();
      });
    });

    it('should have name and color for each emotion', () => {
      emotionTypes.forEach((type) => {
        expect(EMOTION_INFO[type].name).toBeTruthy();
        expect(EMOTION_INFO[type].color).toBeTruthy();
        expect(EMOTION_INFO[type].color).toMatch(/^var\(--color-emotion-/);
      });
    });

    it('should have exactly 10 emotion types', () => {
      expect(Object.keys(EMOTION_INFO)).toHaveLength(10);
    });
  });

  describe('FALLACY_INFO', () => {
    // Tier 1 + Tier 2 (16 total fallacy types)
    const fallacyTypes: FallacyType[] = [
      // Tier 1 (Kern-6)
      'ad_hominem',
      'straw_man',
      'false_dichotomy',
      'appeal_authority',
      'circular_reasoning',
      'slippery_slope',
      // Tier 2 (High Voice-Relevance)
      'red_herring',
      'tu_quoque',
      'hasty_generalization',
      'post_hoc',
      'bandwagon',
      'appeal_emotion',
      'appeal_ignorance',
      'loaded_question',
      'no_true_scotsman',
      'false_cause',
    ];

    it('should have entries for all 16 fallacy types (Tier 1 + Tier 2)', () => {
      fallacyTypes.forEach((type) => {
        expect(FALLACY_INFO[type]).toBeDefined();
      });
    });

    it('should have name, color, and description for each fallacy', () => {
      fallacyTypes.forEach((type) => {
        expect(FALLACY_INFO[type].name).toBeTruthy();
        expect(FALLACY_INFO[type].color).toBeTruthy();
        expect(FALLACY_INFO[type].description).toBeTruthy();
        expect(FALLACY_INFO[type].color).toMatch(/^var\(--color-fallacy-/);
      });
    });

    it('should have exactly 16 fallacy types (6 Tier 1 + 10 Tier 2)', () => {
      expect(Object.keys(FALLACY_INFO)).toHaveLength(16);
    });
  });

  describe('EMOTION_COORDINATES', () => {
    const emotionTypes: EmotionType[] = [
      'neutral',
      'calm',
      'stress',
      'excitement',
      'uncertainty',
      'frustration',
      'joy',
      'doubt',
      'conviction',
      'aggression',
    ];

    it('should have coordinates for all 10 emotion types', () => {
      emotionTypes.forEach((type) => {
        expect(EMOTION_COORDINATES[type]).toBeDefined();
      });
    });

    it('should have valid valence and arousal values', () => {
      emotionTypes.forEach((type) => {
        const coord = EMOTION_COORDINATES[type];
        expect(coord.valence).toBeGreaterThanOrEqual(-1);
        expect(coord.valence).toBeLessThanOrEqual(1);
        expect(coord.arousal).toBeGreaterThanOrEqual(0);
        expect(coord.arousal).toBeLessThanOrEqual(1);
      });
    });

    it('should have exactly 10 coordinate mappings', () => {
      expect(Object.keys(EMOTION_COORDINATES)).toHaveLength(10);
    });
  });

  describe('COGNITIVE_DISTORTION_INFO', () => {
    const distortionTypes: CognitiveDistortionType[] = [
      'catastrophizing',
      'all_or_nothing',
      'overgeneralization',
      'mind_reading',
      'personalization',
      'emotional_reasoning',
      'should_statements',
    ];

    it('should have entries for all 7 distortion types', () => {
      distortionTypes.forEach((type) => {
        expect(COGNITIVE_DISTORTION_INFO[type]).toBeDefined();
      });
    });

    it('should have name, color, and description for each distortion', () => {
      distortionTypes.forEach((type) => {
        expect(COGNITIVE_DISTORTION_INFO[type].name).toBeTruthy();
        expect(COGNITIVE_DISTORTION_INFO[type].color).toBeTruthy();
        expect(COGNITIVE_DISTORTION_INFO[type].description).toBeTruthy();
        expect(COGNITIVE_DISTORTION_INFO[type].color).toMatch(/^var\(--color-distortion-/);
      });
    });

    it('should have exactly 7 distortion types', () => {
      expect(Object.keys(COGNITIVE_DISTORTION_INFO)).toHaveLength(7);
    });

    it('should have German names for all distortions', () => {
      // Verify German localization
      expect(COGNITIVE_DISTORTION_INFO.catastrophizing.name).toBe('Katastrophisieren');
      expect(COGNITIVE_DISTORTION_INFO.all_or_nothing.name).toBe('Schwarz-Weiß-Denken');
      expect(COGNITIVE_DISTORTION_INFO.overgeneralization.name).toBe('Übergeneralisierung');
      expect(COGNITIVE_DISTORTION_INFO.mind_reading.name).toBe('Gedankenlesen');
      expect(COGNITIVE_DISTORTION_INFO.personalization.name).toBe('Personalisierung');
      expect(COGNITIVE_DISTORTION_INFO.emotional_reasoning.name).toBe('Emotionales Schlussfolgern');
      expect(COGNITIVE_DISTORTION_INFO.should_statements.name).toBe('Sollte-Aussagen');
    });
  });

  describe('COGNITIVE_LOAD_INFO', () => {
    const loadLevels: CognitiveLoadLevel[] = ['low', 'medium', 'high'];

    it('should have entries for all 3 cognitive load levels', () => {
      loadLevels.forEach((level) => {
        expect(COGNITIVE_LOAD_INFO[level]).toBeDefined();
      });
    });

    it('should have name, color, and description for each level', () => {
      loadLevels.forEach((level) => {
        expect(COGNITIVE_LOAD_INFO[level].name).toBeTruthy();
        expect(COGNITIVE_LOAD_INFO[level].color).toBeTruthy();
        expect(COGNITIVE_LOAD_INFO[level].description).toBeTruthy();
        expect(COGNITIVE_LOAD_INFO[level].color).toMatch(/^var\(--color-emotion-/);
      });
    });

    it('should have exactly 3 load levels', () => {
      expect(Object.keys(COGNITIVE_LOAD_INFO)).toHaveLength(3);
    });
  });

  describe('DEFAULT_SETTINGS', () => {
    it('should have all required properties', () => {
      expect(DEFAULT_SETTINGS.hotkey).toBe('Control+Shift+D');
      expect(DEFAULT_SETTINGS.llm).toBeDefined();
      expect(DEFAULT_SETTINGS.whisperModel).toBeDefined();
      expect(DEFAULT_SETTINGS.whisperProvider).toBeDefined();
      expect(DEFAULT_SETTINGS.mlxWhisperModel).toBeDefined();
      expect(DEFAULT_SETTINGS.mlxPaths).toBeDefined();
      expect(DEFAULT_SETTINGS.language).toBe('de');
      expect(DEFAULT_SETTINGS.emotionAnalysisEnabled).toBe(true);
      expect(DEFAULT_SETTINGS.fallacyDetectionEnabled).toBe(true);
      expect(DEFAULT_SETTINGS.storage).toBeDefined();
      expect(DEFAULT_SETTINGS.psychological).toBeDefined();
      expect(DEFAULT_SETTINGS.audio).toBeDefined();
    });

    it('should have valid LLM config', () => {
      expect(DEFAULT_SETTINGS.llm.provider).toBe('ollama');
      expect(DEFAULT_SETTINGS.llm.model).toBe('qwen2.5:7b-custom');
      expect(DEFAULT_SETTINGS.llm.baseUrl).toBe('http://127.0.0.1:11434');
      expect(DEFAULT_SETTINGS.llm.useMlx).toBe(false);
    });

    it('should reference DEFAULT_STORAGE_SETTINGS', () => {
      expect(DEFAULT_SETTINGS.storage).toBe(DEFAULT_STORAGE_SETTINGS);
    });

    it('should reference DEFAULT_PSYCHOLOGICAL_SETTINGS', () => {
      expect(DEFAULT_SETTINGS.psychological).toBe(DEFAULT_PSYCHOLOGICAL_SETTINGS);
    });

    it('should reference DEFAULT_AUDIO_SETTINGS', () => {
      expect(DEFAULT_SETTINGS.audio).toBe(DEFAULT_AUDIO_SETTINGS);
    });

    it('should reference DEFAULT_MLX_PATHS', () => {
      expect(DEFAULT_SETTINGS.mlxPaths).toBe(DEFAULT_MLX_PATHS);
    });
  });

  describe('DEFAULT_STORAGE_SETTINGS', () => {
    it('should have all required properties', () => {
      expect(DEFAULT_STORAGE_SETTINGS.storageEnabled).toBe(true);
      expect(DEFAULT_STORAGE_SETTINGS.userModeEnabled).toBe(false);
      expect(DEFAULT_STORAGE_SETTINGS.maxRecordings).toBe(100);
      expect(DEFAULT_STORAGE_SETTINGS.maxUserStorageMb).toBe(500);
    });
  });

  describe('DEFAULT_PSYCHOLOGICAL_SETTINGS', () => {
    it('should have all required properties', () => {
      // Phase 21 enabled GFK, Cognitive Distortion, and Four-Sides by default
      expect(DEFAULT_PSYCHOLOGICAL_SETTINGS.gfkAnalysisEnabled).toBe(true);
      expect(DEFAULT_PSYCHOLOGICAL_SETTINGS.cognitiveLoadEnabled).toBe(false);
      expect(DEFAULT_PSYCHOLOGICAL_SETTINGS.dimensionalEmotionEnabled).toBe(true);
      expect(DEFAULT_PSYCHOLOGICAL_SETTINGS.cognitiveDistortionEnabled).toBe(true);
      expect(DEFAULT_PSYCHOLOGICAL_SETTINGS.fourSidesAnalysisEnabled).toBe(true);
      expect(DEFAULT_PSYCHOLOGICAL_SETTINGS.reflexionNudgesEnabled).toBe(false);
    });

    it('should have production-ready features enabled by default', () => {
      // Phase 21: GFK, Dimensional Emotion, Cognitive Distortion, Four-Sides are production-ready
      const enabled = Object.entries(DEFAULT_PSYCHOLOGICAL_SETTINGS).filter(
        ([, value]) => value === true
      );
      expect(enabled).toHaveLength(4);
      expect(enabled.map(([key]) => key).sort()).toEqual([
        'cognitiveDistortionEnabled',
        'dimensionalEmotionEnabled',
        'fourSidesAnalysisEnabled',
        'gfkAnalysisEnabled',
      ]);
    });
  });

  describe('DEFAULT_AUDIO_SETTINGS', () => {
    it('should have all required properties', () => {
      expect(DEFAULT_AUDIO_SETTINGS.playStartStopSounds).toBe(false);
      expect(DEFAULT_AUDIO_SETTINGS.soundVolume).toBe(0.5);
    });

    it('should have sound volume between 0 and 1', () => {
      expect(DEFAULT_AUDIO_SETTINGS.soundVolume).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_AUDIO_SETTINGS.soundVolume).toBeLessThanOrEqual(1);
    });
  });

  describe('DEFAULT_MLX_PATHS', () => {
    it('should have pythonPath and modelsDir', () => {
      expect(DEFAULT_MLX_PATHS.pythonPath).toBe('~/.venvs/mlx-whisper/bin/python');
      expect(DEFAULT_MLX_PATHS.modelsDir).toBe('~/mlx-whisper');
    });

    it('should use tilde expansion', () => {
      expect(DEFAULT_MLX_PATHS.pythonPath).toMatch(/^~/);
      expect(DEFAULT_MLX_PATHS.modelsDir).toMatch(/^~/);
    });
  });

  describe('ChatMessage', () => {
    it('erlaubt processingDurationMs als optional field', () => {
      const message: ChatMessage = {
        id: '1',
        role: 'assistant',
        content: 'Test',
        timestamp: new Date(),
        processingDurationMs: 4200,
      };
      expect(message.processingDurationMs).toBe(4200);
    });

    it('erlaubt ChatMessage ohne processingDurationMs', () => {
      const message: ChatMessage = {
        id: '1',
        role: 'user',
        content: 'Test',
        timestamp: new Date(),
      };
      expect(message.processingDurationMs).toBeUndefined();
    });
  });

  describe('PROCESSING_STEPS_REGISTRY - Validation', () => {
    it('all steps should have non-empty labelActive', () => {
      Object.entries(PROCESSING_STEPS_REGISTRY).forEach(([_key, step]) => {
        expect(step.labelActive).toBeTruthy();
        expect(step.labelActive!.length).toBeGreaterThan(0);
      });
    });

    it('all labelActive fields should be ≤25 characters (mobile-friendly)', () => {
      Object.entries(PROCESSING_STEPS_REGISTRY).forEach(([_key, step]) => {
        expect(step.labelActive!.length).toBeLessThanOrEqual(25);
      });
    });

    it('no verb should appear more than 2 times (verb diversity)', () => {
      const labels = Object.values(PROCESSING_STEPS_REGISTRY).map((s) => s.labelActive!);
      const verbs = labels.map((label) => label.split(' ')[0].replace('...', ''));

      const verbCounts = verbs.reduce((acc, verb) => {
        acc[verb] = (acc[verb] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      Object.entries(verbCounts).forEach(([_verb, count]) => {
        expect(count).toBeLessThanOrEqual(2); // Max 2x same verb
      });
    });

    it('all labelActive fields should follow "..." convention', () => {
      Object.entries(PROCESSING_STEPS_REGISTRY).forEach(([_key, step]) => {
        expect(step.labelActive).toMatch(/\.\.\.$/);
      });
    });

    it('should have exactly 12 active processing steps', () => {
      expect(Object.keys(PROCESSING_STEPS_REGISTRY)).toHaveLength(12);
    });
  });
});
