import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAudioFileImport } from "@/hooks/useAudioFileImport";
import * as useTauriModule from "@/hooks/useTauri";
import * as analysisModule from "@/lib/analysis";
import * as audioConvertModule from "@/lib/audio-convert";
import * as whisperModule from "@/lib/whisper";
import type { TranscriptionResult } from "@/lib/whisper";
import type {
  EmotionState,
  AnalysisResult,
  ToneState,
} from "@/lib/types";

// Mock modules
vi.mock("@/hooks/useTauri");
vi.mock("@/lib/analysis");
vi.mock("@/lib/audio-convert");
vi.mock("@/lib/whisper");

describe("useAudioFileImport Hook", () => {
  let mockInvoke: ReturnType<typeof vi.fn>;
  let mockGetAnalysisPipeline: ReturnType<typeof vi.fn>;
  let mockPipeline: {
    lastAudioEmotion: EmotionState;
    analyzeTextFull: ReturnType<typeof vi.fn>;
  };
  let mockWhisperClient: {
    transcribe: ReturnType<typeof vi.fn>;
  };

  const mockEmotion: EmotionState = {
    primary: "stress",
    confidence: 0.8,
    audioFeatures: null,
  };

  const mockAnalysis: AnalysisResult = {
    fallacies: [],
    enrichment: "Test enrichment",
  };

  const mockTone: ToneState = {
    formality: 3,
    professionalism: 4,
    directness: 2,
    energy: 3,
    seriousness: 4,
    confidence: 0.75,
    source: "audio",
  };

  const mockTranscriptionResult: TranscriptionResult = {
    text: "Test transcription from audio file",
    segments: [],
    language: "de",
    speechDurationSec: 5.0,
    totalDurationSec: 5.0,
  };

  const mockAudioEmotionResult = {
    primary: "calm",
    confidence: 0.7,
    secondary: null,
    features: {
      pitch: 150.0,
      energy: 0.4,
      speech_rate: 1.0,
    },
  };

  const mockToneResult = {
    formality: 3,
    professionalism: 4,
    directness: 2,
    energy: 3,
    seriousness: 4,
    confidence: 0.75,
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
        primary: "neutral",
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
    };

    mockGetAnalysisPipeline = vi.fn().mockReturnValue(mockPipeline);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(analysisModule).getAnalysisPipeline = mockGetAnalysisPipeline as any;

    // Mock Whisper Client
    mockWhisperClient = {
      transcribe: vi.fn().mockResolvedValue(mockTranscriptionResult),
    };
    vi.mocked(whisperModule.getWhisperClient).mockReturnValue(
      mockWhisperClient as never
    );

    // Mock audio-convert
    vi.mocked(audioConvertModule.convertToWav16kMono).mockResolvedValue({
      wavBlob: new Blob(["mock wav"], { type: "audio/wav" }),
      durationSec: 5.0,
      originalFormat: "mp3",
    });

    // Mock Tauri commands
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "analyze_audio_from_wav") {
        return Promise.resolve(mockAudioEmotionResult);
      }
      if (cmd === "analyze_audio_tone") {
        return Promise.resolve(mockToneResult);
      }
      if (cmd === "save_recording") {
        return Promise.resolve("test-recording-id");
      }
      return Promise.resolve(null);
    });

    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("processAudioFile", () => {
    it("should reject file larger than 50 MB", async () => {
      vi.mocked(audioConvertModule.convertToWav16kMono).mockRejectedValue(
        new Error("Datei zu gross (max. 50 MB)")
      );

      const onProcessingStepUpdate = vi.fn();
      const { result } = renderHook(() =>
        useAudioFileImport({
          onEmotionUpdate: vi.fn(),
          onAnalysis: vi.fn(),
          onToneUpdate: vi.fn(),
          onProcessingStepUpdate,
          abortSignal: undefined,
        })
      );

      const largeFile = new File([], "large.mp3", { type: "audio/mpeg" });

      await expect(result.current.processAudioFile(largeFile)).rejects.toThrow(
        "Datei zu gross"
      );

      await waitFor(() => {
        expect(onProcessingStepUpdate).toHaveBeenCalledWith("audioFileImport", "error");
      });
    });

    it("should reject invalid audio format", async () => {
      vi.mocked(audioConvertModule.convertToWav16kMono).mockRejectedValue(
        new Error("Nicht unterstuetztes Format (WAV, MP3, M4A, OGG)")
      );

      const onProcessingStepUpdate = vi.fn();
      const { result } = renderHook(() =>
        useAudioFileImport({
          onEmotionUpdate: vi.fn(),
          onAnalysis: vi.fn(),
          onToneUpdate: vi.fn(),
          onProcessingStepUpdate,
          abortSignal: undefined,
        })
      );

      const invalidFile = new File([], "test.txt", { type: "text/plain" });

      await expect(result.current.processAudioFile(invalidFile)).rejects.toThrow(
        "Nicht unterstuetztes Format"
      );
    });

    it("should process valid audio file through full pipeline", async () => {
      const onEmotionUpdate = vi.fn();
      const onAnalysis = vi.fn();
      const onToneUpdate = vi.fn();
      const onProcessingStepUpdate = vi.fn();

      const { result } = renderHook(() =>
        useAudioFileImport({
          onEmotionUpdate,
          onAnalysis,
          onToneUpdate,
          onProcessingStepUpdate,
          abortSignal: undefined,
        })
      );

      const audioFile = new File(["audio data"], "test.mp3", {
        type: "audio/mpeg",
      });

      await result.current.processAudioFile(audioFile);

      await waitFor(() => {
        // Verify all steps completed
        expect(onProcessingStepUpdate).toHaveBeenCalledWith("audioFileImport", "active");
        expect(onProcessingStepUpdate).toHaveBeenCalledWith("audioFileImport", "completed");
        expect(onProcessingStepUpdate).toHaveBeenCalledWith("transcription", "active");
        expect(onProcessingStepUpdate).toHaveBeenCalledWith("transcription", "completed");
        expect(onProcessingStepUpdate).toHaveBeenCalledWith("audioEmotion", "active");
        expect(onProcessingStepUpdate).toHaveBeenCalledWith("audioEmotion", "completed");
        expect(onProcessingStepUpdate).toHaveBeenCalledWith("toneAnalysis", "active");
        expect(onProcessingStepUpdate).toHaveBeenCalledWith("toneAnalysis", "completed");
        expect(onProcessingStepUpdate).toHaveBeenCalledWith("textEmotion", "active");
        expect(onProcessingStepUpdate).toHaveBeenCalledWith("textEmotion", "completed");
        expect(onProcessingStepUpdate).toHaveBeenCalledWith("fallacyDetection", "completed");
        expect(onProcessingStepUpdate).toHaveBeenCalledWith("storage", "completed");

        // Verify callbacks called
        expect(onEmotionUpdate).toHaveBeenCalled();
        expect(onAnalysis).toHaveBeenCalled();
        expect(onToneUpdate).toHaveBeenCalled();

        // Verify save_recording called
        expect(mockInvoke).toHaveBeenCalledWith("save_recording", expect.any(Object));
      });
    });

    it("should abort processing when abortSignal is triggered", async () => {
      const abortController = new AbortController();
      const onProcessingStepUpdate = vi.fn();

      // Delay the transcription to allow abort to happen
      mockWhisperClient.transcribe.mockImplementation(async () => {
        abortController.abort();
        await new Promise((resolve) => setTimeout(resolve, 10));
        return mockTranscriptionResult;
      });

      const { result } = renderHook(() =>
        useAudioFileImport({
          onEmotionUpdate: vi.fn(),
          onAnalysis: vi.fn(),
          onToneUpdate: vi.fn(),
          onProcessingStepUpdate,
          abortSignal: abortController.signal,
        })
      );

      const audioFile = new File(["audio data"], "test.mp3", {
        type: "audio/mpeg",
      });

      await result.current.processAudioFile(audioFile);

      await waitFor(() => {
        // Verify processing was aborted (storage should not be called)
        expect(mockInvoke).not.toHaveBeenCalledWith("save_recording", expect.any(Object));
      });
    });

    it("should handle transcription failure gracefully", async () => {
      mockWhisperClient.transcribe.mockRejectedValue(
        new Error("Transcription failed")
      );

      const onProcessingStepUpdate = vi.fn();
      const { result } = renderHook(() =>
        useAudioFileImport({
          onEmotionUpdate: vi.fn(),
          onAnalysis: vi.fn(),
          onToneUpdate: vi.fn(),
          onProcessingStepUpdate,
          abortSignal: undefined,
        })
      );

      const audioFile = new File(["audio data"], "test.mp3", {
        type: "audio/mpeg",
      });

      await expect(result.current.processAudioFile(audioFile)).rejects.toThrow();

      await waitFor(() => {
        expect(onProcessingStepUpdate).toHaveBeenCalledWith("transcription", "error");
      });
    });

    it("should handle audio emotion analysis failure gracefully", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "analyze_audio_from_wav") {
          return Promise.reject(new Error("Audio analysis failed"));
        }
        if (cmd === "save_recording") {
          return Promise.resolve("test-recording-id");
        }
        return Promise.resolve(null);
      });

      const onProcessingStepUpdate = vi.fn();
      const { result } = renderHook(() =>
        useAudioFileImport({
          onEmotionUpdate: vi.fn(),
          onAnalysis: vi.fn(),
          onToneUpdate: vi.fn(),
          onProcessingStepUpdate,
          abortSignal: undefined,
        })
      );

      const audioFile = new File(["audio data"], "test.mp3", {
        type: "audio/mpeg",
      });

      await expect(result.current.processAudioFile(audioFile)).rejects.toThrow();

      await waitFor(() => {
        expect(onProcessingStepUpdate).toHaveBeenCalledWith("audioEmotion", "error");
      });
    });

    it("should skip storage in non-Tauri environment", async () => {
      vi.mocked(useTauriModule.useTauri).mockReturnValue({
        isTauri: false,
        isReady: false,
        invoke: mockInvoke as never,
        listen: vi.fn() as never,
        registerHotkey: vi.fn() as never,
      });

      const onProcessingStepUpdate = vi.fn();
      const { result } = renderHook(() =>
        useAudioFileImport({
          onEmotionUpdate: vi.fn(),
          onAnalysis: vi.fn(),
          onToneUpdate: vi.fn(),
          onProcessingStepUpdate,
          abortSignal: undefined,
        })
      );

      const audioFile = new File(["audio data"], "test.mp3", {
        type: "audio/mpeg",
      });

      await result.current.processAudioFile(audioFile);

      await waitFor(() => {
        expect(onProcessingStepUpdate).toHaveBeenCalledWith("storage", "skipped");
        expect(mockInvoke).not.toHaveBeenCalledWith("save_recording", expect.any(Object));
      });
    });
  });
});
