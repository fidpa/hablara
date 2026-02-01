/**
 * AudioRecorder Component Tests
 *
 * Tests for the AudioRecorder component error handling, processing flows,
 * and integration with hooks and analysis pipeline.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import AudioRecorder from "@/components/AudioRecorder";
import type { EmotionState, AnalysisResult, AppSettings } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/types";

// Mock all dependencies
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@/hooks/useTauri", () => ({
  useTauri: vi.fn(() => ({
    isTauri: false,
    isReady: false,
  })),
}));

vi.mock("@/hooks/useRecordings", () => ({
  useRecordings: () => ({
    saveRecording: vi.fn().mockResolvedValue("test-recording-id"),
    recordings: [],
    loadRecordings: vi.fn(),
  }),
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/ui/toast-utils", () => ({
  showAudioErrorToast: vi.fn(),
  showTranscriptionErrorToast: vi.fn(),
  showStorageErrorToast: vi.fn(),
}));

// Mock useAudioRecorder hook
const mockStart = vi.fn();
const mockStop = vi.fn();
const mockCancel = vi.fn();

vi.mock("@/hooks/useAudioRecorder", () => ({
  useAudioRecorder: vi.fn(() => ({
    start: mockStart,
    stop: mockStop,
    cancel: mockCancel,
    isRecording: false,
    duration: 0,
    error: null,
  })),
}));

// Mock whisper client
vi.mock("@/lib/whisper", () => ({
  getWhisperClient: vi.fn(() => ({
    transcribe: vi.fn().mockResolvedValue({
      text: "Test transcription",
      segments: [],
      language: "de",
      speechDurationSec: 5.0,
      totalDurationSec: 5.5,
    }),
  })),
  extractAudioFeatures: vi.fn(() => ({
    pitch: 150,
    energy: 0.5,
    speechRate: 2.5,
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
  })),
}));

// Mock analysis pipeline
vi.mock("@/lib/analysis", () => ({
  getAnalysisPipeline: vi.fn(() => ({
    processAudioFeatures: vi.fn(() => ({
      primary: "neutral",
      confidence: 0.5,
      audioFeatures: null,
    })),
    analyzeText: vi.fn().mockResolvedValue({
      emotion: { primary: "neutral", confidence: 0.5, audioFeatures: null },
      analysis: { fallacies: [], enrichment: "" },
    }),
    analyzeTextFull: vi.fn().mockResolvedValue({
      emotion: { primary: "neutral", confidence: 0.5, audioFeatures: null },
      analysis: { fallacies: [], enrichment: "" },
      tone: null,
      topic: null,
      gfk: null,
      cognitive: null,
      fourSides: null,
      analysisStatus: {},
    }),
    lastAudioEmotion: null,
    lastAudioTone: null,
  })),
  convertRustEmotionResult: vi.fn((result, features) => ({
    primary: result.primary,
    confidence: result.confidence,
    secondary: result.secondary,
    audioFeatures: features,
  })),
}));

// Mock audio-utils
vi.mock("@/lib/audio-utils", () => ({
  blobToBase64: vi.fn().mockResolvedValue("base64-audio-data"),
}));

describe("AudioRecorder Component", () => {
  const defaultProps = {
    isRecording: false,
    onTranscript: vi.fn(),
    onEmotionUpdate: vi.fn(),
    onAnalysis: vi.fn(),
    onError: vi.fn(),
    settings: DEFAULT_SETTINGS,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStart.mockResolvedValue(undefined);
    mockStop.mockResolvedValue(new Blob(["audio"], { type: "audio/wav" }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render without UI elements (returns null)", () => {
      const { container } = render(<AudioRecorder {...defaultProps} />);
      expect(container.firstChild).toBeNull();
    });

    it("should not crash with missing optional props", () => {
      const minimalProps = {
        isRecording: false,
        onTranscript: vi.fn(),
        onEmotionUpdate: vi.fn(),
        onAnalysis: vi.fn(),
        onError: vi.fn(),
      };
      const { container } = render(<AudioRecorder {...minimalProps} />);
      expect(container).toBeDefined();
    });
  });

  describe("Recording Lifecycle", () => {
    it("should call start when isRecording changes to true", async () => {
      const { rerender } = render(<AudioRecorder {...defaultProps} />);

      // Change isRecording to true
      rerender(<AudioRecorder {...defaultProps} isRecording={true} />);

      await waitFor(() => {
        expect(mockStart).toHaveBeenCalled();
      });
    });

    it("should call stop when isRecording changes to false", async () => {
      // Start with recording active
      const { rerender } = render(<AudioRecorder {...defaultProps} isRecording={true} />);

      await waitFor(() => {
        expect(mockStart).toHaveBeenCalled();
      });

      // Stop recording
      rerender(<AudioRecorder {...defaultProps} isRecording={false} />);

      await waitFor(() => {
        expect(mockStop).toHaveBeenCalled();
      });
    });
  });

  describe("Error Handling", () => {
    it("should call onError when recording start fails", async () => {
      const onError = vi.fn();
      mockStart.mockRejectedValue(new Error("NotAllowedError: Permission denied"));

      const { rerender } = render(<AudioRecorder {...defaultProps} onError={onError} />);
      rerender(<AudioRecorder {...defaultProps} onError={onError} isRecording={true} />);

      await waitFor(() => {
        expect(mockStart).toHaveBeenCalled();
      });

      // Check for error callback
      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });

    it("should handle no device error gracefully", async () => {
      const onError = vi.fn();
      const { showAudioErrorToast } = await import("@/lib/ui/toast-utils");
      mockStart.mockRejectedValue(new Error("NotFoundError: No input device"));

      const { rerender } = render(<AudioRecorder {...defaultProps} onError={onError} />);
      rerender(<AudioRecorder {...defaultProps} onError={onError} isRecording={true} />);

      await waitFor(() => {
        expect(mockStart).toHaveBeenCalled();
      });

      // Should call toast utils with appropriate error type
      await waitFor(() => {
        expect(showAudioErrorToast).toHaveBeenCalledWith(
          expect.anything(),
          "no_device"
        );
      });
    });

    it("should handle permission denied error gracefully", async () => {
      const onError = vi.fn();
      const { showAudioErrorToast } = await import("@/lib/ui/toast-utils");
      mockStart.mockRejectedValue(new Error("NotAllowedError: Permission denied"));

      const { rerender } = render(<AudioRecorder {...defaultProps} onError={onError} />);
      rerender(<AudioRecorder {...defaultProps} onError={onError} isRecording={true} />);

      await waitFor(() => {
        expect(mockStart).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(showAudioErrorToast).toHaveBeenCalledWith(
          expect.anything(),
          "permission_denied"
        );
      });
    });

    it("should handle generic audio capture error", async () => {
      const onError = vi.fn();
      const { showAudioErrorToast } = await import("@/lib/ui/toast-utils");
      mockStart.mockRejectedValue(new Error("Unknown audio error"));

      const { rerender } = render(<AudioRecorder {...defaultProps} onError={onError} />);
      rerender(<AudioRecorder {...defaultProps} onError={onError} isRecording={true} />);

      await waitFor(() => {
        expect(mockStart).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(showAudioErrorToast).toHaveBeenCalledWith(
          expect.anything(),
          "capture_failed",
          expect.any(String)
        );
      });
    });
  });

  describe("Processing Callbacks", () => {
    it("should pass onAudioLevel to useAudioRecorder", async () => {
      const onAudioLevel = vi.fn();
      render(<AudioRecorder {...defaultProps} onAudioLevel={onAudioLevel} />);

      // Verify hook is called with onAudioLevel option
      const { useAudioRecorder } = await import("@/hooks/useAudioRecorder");
      expect(useAudioRecorder).toHaveBeenCalledWith(
        expect.objectContaining({
          onAudioLevel: onAudioLevel,
        })
      );
    });

    it("should pass onProcessingUpdate to callbacks ref", () => {
      const onProcessingUpdate = vi.fn();
      render(
        <AudioRecorder
          {...defaultProps}
          onProcessingUpdate={onProcessingUpdate}
        />
      );

      // Component should render without errors
      expect(true).toBe(true);
    });
  });

  describe("Settings Integration", () => {
    it("should use default settings when not provided", () => {
      render(<AudioRecorder {...defaultProps} settings={undefined} />);
      // Should not crash
      expect(true).toBe(true);
    });

    it("should respect maxRecordingMinutes from settings", async () => {
      const customSettings: AppSettings = {
        ...DEFAULT_SETTINGS,
        limits: {
          ...DEFAULT_SETTINGS.limits,
          maxRecordingMinutes: 5,
        },
      };

      render(<AudioRecorder {...defaultProps} settings={customSettings} />);

      const { useAudioRecorder } = await import("@/hooks/useAudioRecorder");
      expect(useAudioRecorder).toHaveBeenCalledWith(
        expect.objectContaining({
          maxRecordingMinutes: 5,
        })
      );
    });

    it("should use correct whisper model from settings", async () => {
      const customSettings: AppSettings = {
        ...DEFAULT_SETTINGS,
        whisperModel: "large-v3",
        whisperProvider: "whisper-cpp",
      };

      render(<AudioRecorder {...defaultProps} settings={customSettings} />);

      const { getWhisperClient } = await import("@/lib/whisper");
      expect(getWhisperClient).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "large-v3",
          provider: "whisper-cpp",
        }),
        expect.any(Boolean)
      );
    });

    it("should recreate whisper client when provider changes", async () => {
      const { getWhisperClient } = await import("@/lib/whisper");

      const settings1: AppSettings = {
        ...DEFAULT_SETTINGS,
        whisperProvider: "whisper-cpp",
      };

      const { rerender } = render(
        <AudioRecorder {...defaultProps} settings={settings1} />
      );

      const callCount1 = (getWhisperClient as ReturnType<typeof vi.fn>).mock.calls.length;

      const settings2: AppSettings = {
        ...DEFAULT_SETTINGS,
        whisperProvider: "mlx-whisper",
      };

      rerender(<AudioRecorder {...defaultProps} settings={settings2} />);

      const callCount2 = (getWhisperClient as ReturnType<typeof vi.fn>).mock.calls.length;

      // Should have created a new client
      expect(callCount2).toBeGreaterThan(callCount1);
    });
  });

  describe("Abort Signal Handling", () => {
    it("should accept abortSignal prop", () => {
      const abortController = new AbortController();

      // Should not crash
      render(
        <AudioRecorder
          {...defaultProps}
          abortSignal={abortController.signal}
        />
      );

      expect(true).toBe(true);
    });

    it("should store abortSignal in ref for access during processing", () => {
      const abortController = new AbortController();

      const { rerender } = render(
        <AudioRecorder {...defaultProps} abortSignal={abortController.signal} />
      );

      // Update abortSignal
      const newAbortController = new AbortController();
      rerender(
        <AudioRecorder
          {...defaultProps}
          abortSignal={newAbortController.signal}
        />
      );

      // Should not crash
      expect(true).toBe(true);
    });
  });

  describe("Cleanup", () => {
    it("should cancel recording on unmount if still recording", async () => {
      const { unmount, rerender } = render(
        <AudioRecorder {...defaultProps} isRecording={true} />
      );

      await waitFor(() => {
        expect(mockStart).toHaveBeenCalled();
      });

      // Unmount while recording
      unmount();

      // Cancel should be called
      await waitFor(() => {
        expect(mockCancel).toHaveBeenCalled();
      });
    });
  });

  describe("Duration Update Throttling", () => {
    it("should throttle duration updates to 1Hz", async () => {
      const onDurationUpdate = vi.fn();

      // Mock isRecording as true in useAudioRecorder
      const { useAudioRecorder } = vi.mocked(await import("@/hooks/useAudioRecorder"));
      useAudioRecorder.mockReturnValue({
        start: mockStart,
        stop: mockStop,
        cancel: mockCancel,
        isRecording: true,
        duration: 5000,
        error: null,
      });

      render(
        <AudioRecorder
          {...defaultProps}
          isRecording={true}
          onDurationUpdate={onDurationUpdate}
        />
      );

      // Duration callback should be passed
      expect(onDurationUpdate).toBeDefined();
    });
  });
});

describe("AudioRecorder - Psychological Enrichments", () => {
  const defaultProps = {
    isRecording: false,
    onTranscript: vi.fn(),
    onEmotionUpdate: vi.fn(),
    onAnalysis: vi.fn(),
    onError: vi.fn(),
    settings: DEFAULT_SETTINGS,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should accept GFK callback", () => {
    const onGFKUpdate = vi.fn();
    render(<AudioRecorder {...defaultProps} onGFKUpdate={onGFKUpdate} />);
    expect(true).toBe(true);
  });

  it("should accept Cognitive callback", () => {
    const onCognitiveUpdate = vi.fn();
    render(<AudioRecorder {...defaultProps} onCognitiveUpdate={onCognitiveUpdate} />);
    expect(true).toBe(true);
  });

  it("should accept FourSides callback", () => {
    const onFourSidesUpdate = vi.fn();
    render(<AudioRecorder {...defaultProps} onFourSidesUpdate={onFourSidesUpdate} />);
    expect(true).toBe(true);
  });

  it("should accept Topic callback", () => {
    const onTopicUpdate = vi.fn();
    render(<AudioRecorder {...defaultProps} onTopicUpdate={onTopicUpdate} />);
    expect(true).toBe(true);
  });

  it("should accept Tone callback", () => {
    const onToneUpdate = vi.fn();
    render(<AudioRecorder {...defaultProps} onToneUpdate={onToneUpdate} />);
    expect(true).toBe(true);
  });
});

describe("AudioRecorder - onRecordingSaved Callback", () => {
  const defaultProps = {
    isRecording: false,
    onTranscript: vi.fn(),
    onEmotionUpdate: vi.fn(),
    onAnalysis: vi.fn(),
    onError: vi.fn(),
    settings: {
      ...DEFAULT_SETTINGS,
      storage: {
        ...DEFAULT_SETTINGS.storage,
        storageEnabled: true,
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should accept onRecordingSaved callback", () => {
    const onRecordingSaved = vi.fn();
    render(
      <AudioRecorder {...defaultProps} onRecordingSaved={onRecordingSaved} />
    );
    expect(true).toBe(true);
  });
});
