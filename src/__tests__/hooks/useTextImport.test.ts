import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTextImport } from '@/hooks/useTextImport';
import * as useTauriModule from '@/hooks/useTauri';
import * as analysisModule from '@/lib/analysis';
import type {
  EmotionState,
  AnalysisResult,
  ToneState,
} from '@/lib/types';

// Mock modules
vi.mock('@/hooks/useTauri');
vi.mock('@/lib/analysis');

describe('useTextImport Hook', () => {
  let mockInvoke: ReturnType<typeof vi.fn>;
  let mockGetAnalysisPipeline: ReturnType<typeof vi.fn>;
  let mockPipeline: {
    lastAudioEmotion: EmotionState;
    analyzeTextFull: ReturnType<typeof vi.fn>;
    resetAudioEmotion: ReturnType<typeof vi.fn>;
  };

  const mockEmotion: EmotionState = {
    primary: 'stress',
    confidence: 0.8,
    audioFeatures: null,
  };

  const mockAnalysis: AnalysisResult = {
    fallacies: [],
    enrichment: 'Test enrichment',
  };

  const mockTone: ToneState = {
    formality: 3,
    professionalism: 4,
    directness: 2,
    energy: 3,
    seriousness: 4,
    confidence: 0.75,
    source: 'text',
  };

  beforeEach(() => {
    mockInvoke = vi.fn();

    // Mock useTauri
    vi.mocked(useTauriModule.useTauri).mockReturnValue({
      isTauri: true,
      isReady: true,
      invoke: mockInvoke as never,
      listen: vi.fn() as never,
      registerHotkey: vi.fn() as never,
    });

    // Mock Analysis Pipeline
    mockPipeline = {
      lastAudioEmotion: {
        primary: 'neutral',
        confidence: 0,
        audioFeatures: null,
      },
      analyzeTextFull: vi.fn().mockResolvedValue({
        emotion: mockEmotion,
        analysis: mockAnalysis,
        tone: mockTone,
        topic: undefined,
        gfk: undefined,
        cognitive: undefined,
        fourSides: undefined,
      }),
      resetAudioEmotion: vi.fn(),
    };

    mockGetAnalysisPipeline = vi.fn().mockReturnValue(mockPipeline);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(analysisModule).getAnalysisPipeline = mockGetAnalysisPipeline as any;

    // Mock save_recording to return ID
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'save_recording') return Promise.resolve('test-recording-id');
      return Promise.resolve(null);
    });

    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('processText', () => {
    it('should reject empty text', async () => {
      const { result } = renderHook(() =>
        useTextImport({
          onEmotionUpdate: vi.fn(),
          onAnalysis: vi.fn(),
          onToneUpdate: vi.fn(),
          onProcessingStepUpdate: vi.fn(),
          abortSignal: undefined,
        })
      );

      await expect(result.current.processText('', 'text')).rejects.toThrow('Text cannot be empty');
    });

    it('should reject whitespace-only text', async () => {
      const { result } = renderHook(() =>
        useTextImport({
          onEmotionUpdate: vi.fn(),
          onAnalysis: vi.fn(),
          onToneUpdate: vi.fn(),
          onProcessingStepUpdate: vi.fn(),
          abortSignal: undefined,
        })
      );

      await expect(result.current.processText('   \n\t  ', 'text')).rejects.toThrow(
        'Text cannot be empty'
      );
    });

    it('should call resetAudioEmotion before analysis', async () => {
      const onEmotionUpdate = vi.fn();

      const { result } = renderHook(() =>
        useTextImport({
          onEmotionUpdate,
          onAnalysis: vi.fn(),
          onToneUpdate: vi.fn(),
          onProcessingStepUpdate: vi.fn(),
          abortSignal: undefined,
        })
      );

      await result.current.processText('This is a test text.', 'text');

      // Verify resetAudioEmotion was called
      expect(mockPipeline.resetAudioEmotion).toHaveBeenCalled();
    });

    it('should call analyzeTextFull with correct options', async () => {
      const { result } = renderHook(() =>
        useTextImport({
          onEmotionUpdate: vi.fn(),
          onAnalysis: vi.fn(),
          onToneUpdate: vi.fn(),
          onProcessingStepUpdate: vi.fn(),
          abortSignal: undefined,
        })
      );

      await result.current.processText('This is a test text.', 'text');

      expect(mockPipeline.analyzeTextFull).toHaveBeenCalledWith('This is a test text.', expect.objectContaining({
        emotionAnalysisEnabled: true,
        fallacyDetectionEnabled: true,
        toneEnabled: true,
      }));
    });

    it('should call all callbacks with correct data', async () => {
      const onEmotionUpdate = vi.fn();
      const onAnalysis = vi.fn();
      const onToneUpdate = vi.fn();
      const onProcessingStepUpdate = vi.fn();

      const { result } = renderHook(() =>
        useTextImport({
          onEmotionUpdate,
          onAnalysis,
          onToneUpdate,
          onProcessingStepUpdate,
          abortSignal: undefined,
        })
      );

      await result.current.processText('This is a test text.', 'text');

      expect(onEmotionUpdate).toHaveBeenCalledWith(mockEmotion);
      expect(onAnalysis).toHaveBeenCalledWith('This is a test text.', mockAnalysis, mockEmotion);
      expect(onToneUpdate).toHaveBeenCalledWith(mockTone);
    });

    it('should update processing steps correctly', async () => {
      const onProcessingStepUpdate = vi.fn();

      const { result } = renderHook(() =>
        useTextImport({
          onEmotionUpdate: vi.fn(),
          onAnalysis: vi.fn(),
          onToneUpdate: vi.fn(),
          onProcessingStepUpdate,
          abortSignal: undefined,
        })
      );

      await result.current.processText('This is a test text.', 'text');

      // textImport step
      expect(onProcessingStepUpdate).toHaveBeenCalledWith('textImport', 'active');
      expect(onProcessingStepUpdate).toHaveBeenCalledWith('textImport', 'completed');

      // textEmotion step
      expect(onProcessingStepUpdate).toHaveBeenCalledWith('textEmotion', 'active');
      expect(onProcessingStepUpdate).toHaveBeenCalledWith('textEmotion', 'completed');

      // fallacyDetection step
      expect(onProcessingStepUpdate).toHaveBeenCalledWith('fallacyDetection', 'active');
      expect(onProcessingStepUpdate).toHaveBeenCalledWith('fallacyDetection', 'completed');

      // toneAnalysis step
      expect(onProcessingStepUpdate).toHaveBeenCalledWith('toneAnalysis', 'active');
      expect(onProcessingStepUpdate).toHaveBeenCalledWith('toneAnalysis', 'completed');

      // storage step
      expect(onProcessingStepUpdate).toHaveBeenCalledWith('storage', 'active');
      expect(onProcessingStepUpdate).toHaveBeenCalledWith('storage', 'completed');
    });

    it('should save recording with correct metadata', async () => {
      const { result } = renderHook(() =>
        useTextImport({
          onEmotionUpdate: vi.fn(),
          onAnalysis: vi.fn(),
          onToneUpdate: vi.fn(),
          onProcessingStepUpdate: vi.fn(),
          abortSignal: undefined,
        })
      );

      await result.current.processText('This is a test text.', 'text');

      expect(mockInvoke).toHaveBeenCalledWith('save_recording', {
        audioData: '', // Empty for text-import
        metadata: expect.objectContaining({
          id: '',
          createdAt: '',
          durationMs: 0,
          sampleRate: 16000,
          fileSize: 0,
          audioValidation: {
            rmsEnergy: 0,
            durationMs: 0,
            sampleCount: 0,
            passed: true,
          },
          vadStats: null,
          transcription: {
            text: 'This is a test text.',
            provider: 'text-import',
            model: 'manual',
            language: 'de',
            processingTimeMs: expect.any(Number),
          },
          textFilter: null,
          provider: 'text-import',
          model: 'manual',
          appVersion: '',
          source: 'text',
          analysisResult: {
            emotion: {
              primary: mockEmotion.primary,
              confidence: mockEmotion.confidence,
              secondary: undefined,
            },
            fallacies: [],
            enrichment: 'Test enrichment',
          },
          tone: {
            formality: 3,
            professionalism: 4,
            directness: 2,
            energy: 3,
            seriousness: 4,
            confidence: 0.75,
          },
        }),
      });
    });

    it('should respect AbortSignal', async () => {
      const abortController = new AbortController();
      const onEmotionUpdate = vi.fn();
      const onAnalysis = vi.fn();
      const onToneUpdate = vi.fn();

      const { result } = renderHook(() =>
        useTextImport({
          onEmotionUpdate,
          onAnalysis,
          onToneUpdate,
          onProcessingStepUpdate: vi.fn(),
          abortSignal: abortController.signal,
        })
      );

      // Abort immediately
      abortController.abort();

      await result.current.processText('This is a test text.', 'text');

      // Analysis should not have been called
      expect(mockPipeline.analyzeTextFull).not.toHaveBeenCalled();
      expect(onEmotionUpdate).not.toHaveBeenCalled();
      expect(onAnalysis).not.toHaveBeenCalled();
      expect(onToneUpdate).not.toHaveBeenCalled();
    });

    it('should handle pipeline errors gracefully', async () => {
      mockPipeline.analyzeTextFull.mockRejectedValue(new Error('Analysis failed'));

      const onProcessingStepUpdate = vi.fn();

      const { result } = renderHook(() =>
        useTextImport({
          onEmotionUpdate: vi.fn(),
          onAnalysis: vi.fn(),
          onToneUpdate: vi.fn(),
          onProcessingStepUpdate,
          abortSignal: undefined,
        })
      );

      await expect(result.current.processText('This is a test text.', 'text')).rejects.toThrow(
        'Analysis failed'
      );

      // Verify error status was set for relevant steps
      expect(onProcessingStepUpdate).toHaveBeenCalledWith(
        expect.stringMatching(/textEmotion|fallacyDetection|toneAnalysis/),
        'error'
      );
    });

    it('should handle storage errors gracefully', async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'save_recording') return Promise.reject(new Error('Storage failed'));
        return Promise.resolve(null);
      });

      const onProcessingStepUpdate = vi.fn();

      const { result } = renderHook(() =>
        useTextImport({
          onEmotionUpdate: vi.fn(),
          onAnalysis: vi.fn(),
          onToneUpdate: vi.fn(),
          onProcessingStepUpdate,
          abortSignal: undefined,
        })
      );

      await expect(result.current.processText('This is a test text.', 'text')).rejects.toThrow(
        'Storage failed'
      );

      // Verify storage step was marked as error
      expect(onProcessingStepUpdate).toHaveBeenCalledWith('storage', 'error');
    });

    it('should use correct source in metadata', async () => {
      const { result } = renderHook(() =>
        useTextImport({
          onEmotionUpdate: vi.fn(),
          onAnalysis: vi.fn(),
          onToneUpdate: vi.fn(),
          onProcessingStepUpdate: vi.fn(),
          abortSignal: undefined,
        })
      );

      // Test "text" source
      await result.current.processText('Text from textarea', 'text');
      expect(mockInvoke).toHaveBeenCalledWith(
        'save_recording',
        expect.objectContaining({
          metadata: expect.objectContaining({
            source: 'text',
          }),
        })
      );

      // Test "file" source
      await result.current.processText('Text from file', 'file');
      expect(mockInvoke).toHaveBeenCalledWith(
        'save_recording',
        expect.objectContaining({
          metadata: expect.objectContaining({
            source: 'file',
          }),
        })
      );
    });

    it('should not trigger transcription or audioEmotion steps', async () => {
      const onProcessingStepUpdate = vi.fn();

      const { result } = renderHook(() =>
        useTextImport({
          onEmotionUpdate: vi.fn(),
          onAnalysis: vi.fn(),
          onToneUpdate: vi.fn(),
          onProcessingStepUpdate,
          abortSignal: undefined,
        })
      );

      await result.current.processText('This is a test text.', 'text');

      // Verify transcription and audioEmotion were never called
      expect(onProcessingStepUpdate).not.toHaveBeenCalledWith('transcription', expect.any(String));
      expect(onProcessingStepUpdate).not.toHaveBeenCalledWith('audioEmotion', expect.any(String));
    });
  });

  describe('Ref-based callback pattern', () => {
    it('should use latest callback refs', async () => {
      let callCount = 0;
      const initialCallback = vi.fn(() => callCount++);
      const updatedCallback = vi.fn(() => callCount++);

      const { result, rerender } = renderHook(
        ({ callback }) =>
          useTextImport({
            onEmotionUpdate: callback,
            onAnalysis: vi.fn(),
            onToneUpdate: vi.fn(),
            onProcessingStepUpdate: vi.fn(),
            abortSignal: undefined,
          }),
        {
          initialProps: { callback: initialCallback },
        }
      );

      // Update callback
      rerender({ callback: updatedCallback });

      // Process text
      await result.current.processText('Test text', 'text');

      // Should use updated callback
      expect(updatedCallback).toHaveBeenCalled();
      expect(initialCallback).not.toHaveBeenCalled();
    });
  });
});
