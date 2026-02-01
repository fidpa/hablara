"use client";

/**
 * useAudioRecorder - Native cpal Audio Recording mit Web Fallback
 *
 * Verwaltet Audio-Aufnahme via Native cpal (Desktop, 16kHz resampled) oder
 * Web Audio API (Development-Fallback). Bietet Real-time Level Metering,
 * Duration Tracking, Auto-Stop bei max Recording-Länge. Returns WAV Blob.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useTauri } from "./useTauri";
import { logger } from "@/lib/logger";

// Silence detection thresholds (permissive - Rust VAD does real filtering)
const SILENCE_THRESHOLD = 0.005; // RMS threshold - low to let most audio through
const MIN_SPEECH_SAMPLES = 4800; // Minimum samples (~0.3s at 16kHz)

// Native audio level polling interval (50ms = 20fps)
const NATIVE_LEVEL_POLL_INTERVAL = 50;

// Audio level normalization constants
// Based on professional audio standards (dBFS to linear conversion):
// - Silence/Noise: 0.01-0.03 RMS (-40 to -30 dBFS)
// - Normal speech: 0.10-0.20 RMS (-20 to -14 dBFS)
// - Loud speech:   0.20-0.50 RMS (-14 to -6 dBFS)
// Note: Microphone sensitivity varies - higher MAX = less sensitive meter
// See: https://mrmixandmaster.com/loudness-lufs-vs-rms-vs-dbfs/
const AUDIO_LEVEL_MIN = 0.02;  // Noise floor (-34 dBFS, below this = 0%)
const AUDIO_LEVEL_MAX = 0.65;  // Very loud speech (-4 dBFS, above this = 100%)

/**
 * Normalize raw RMS level to 0-1 range for meter display.
 * Uses logarithmic-like scaling for better perceptual accuracy.
 */
function normalizeAudioLevel(rawLevel: number): number {
  if (rawLevel <= AUDIO_LEVEL_MIN) return 0;
  if (rawLevel >= AUDIO_LEVEL_MAX) return 1;

  // Linear interpolation between min and max
  const normalized = (rawLevel - AUDIO_LEVEL_MIN) / (AUDIO_LEVEL_MAX - AUDIO_LEVEL_MIN);

  // Apply gentle curve for better visual response
  // sqrt makes quiet sounds more visible, loud sounds less exaggerated
  return Math.sqrt(normalized);
}

interface AudioRecorderState {
  isRecording: boolean;
  audioLevel: number;
  duration: number;
  isNative: boolean; // Whether using native cpal (PRIMARY) or Web Audio API (Emergency-Fallback)
}

interface UseAudioRecorderOptions {
  onAudioData?: (data: Float32Array) => void;
  onAudioChunk?: (blob: Blob) => void;
  onAudioLevel?: (level: number) => void; // Real-time level callback for UI
  chunkInterval?: number; // ms between chunks for streaming
  sampleRate?: number;
  preferNative?: boolean; // Prefer native cpal recording (default: true in Tauri)
  maxRecordingMinutes?: number; // Maximum recording duration in minutes (default: 30)
}

interface UseAudioRecorderReturn extends AudioRecorderState {
  start: () => Promise<boolean>;
  stop: () => Promise<Blob | null>;
  cancel: () => void;
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}): UseAudioRecorderReturn {
  const {
    onAudioData,
    onAudioChunk,
    onAudioLevel,
    chunkInterval = 3000, // 3 second chunks for whisper
    sampleRate = 16000, // Whisper expects 16kHz
    preferNative = true, // Prefer native cpal recording in Tauri
    maxRecordingMinutes = 30, // Default: 30 minutes
  } = options;

  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    audioLevel: 0,
    duration: 0,
    isNative: false,
  });

  const { isTauri, invoke } = useTauri();

  // Native recording refs
  const nativeLevelPollRef = useRef<NodeJS.Timeout | null>(null);
  const nativeStartTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const chunkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Timer refs for recording duration limits
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef(false);

  // Collect raw samples for WAV conversion
  const samplesRef = useRef<Float32Array[]>([]);
  const isRecordingRef = useRef(false);
  const isStartingRef = useRef(false); // Prevent concurrent start operations
  const isNativeRef = useRef(false); // Track native mode without causing re-renders

  // Ref for level callback to avoid dependency loops
  const onAudioLevelRef = useRef(onAudioLevel);
  onAudioLevelRef.current = onAudioLevel;

  // Ref for stop function to avoid dependency loops in timer effect
  const stopRef = useRef<(() => Promise<Blob | null>) | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    // Web Audio cleanup (Emergency-Fallback)
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (chunkTimeoutRef.current) {
      clearInterval(chunkTimeoutRef.current);
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
    }

    // Native audio cleanup
    if (nativeLevelPollRef.current) {
      clearInterval(nativeLevelPollRef.current);
      nativeLevelPollRef.current = null;
    }

    // Timer cleanup
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    warningShownRef.current = false;

    audioContextRef.current = null;
    analyserRef.current = null;
    processorRef.current = null;
    streamRef.current = null;
    samplesRef.current = [];
    isRecordingRef.current = false;
  }, []);

  // Check if audio samples contain significant (non-silent) audio
  const hasSignificantAudio = useCallback((samples: Float32Array): boolean => {
    if (samples.length < MIN_SPEECH_SAMPLES) {
      return false;
    }

    // Calculate RMS energy
    let sumSquares = 0;
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i] ?? 0;
      sumSquares += sample * sample;
    }
    const rms = Math.sqrt(sumSquares / samples.length);

    return rms > SILENCE_THRESHOLD;
  }, []);

  // Create WAV blob from collected samples
  const createWavBlob = useCallback((samples: Float32Array[], targetSampleRate: number): Blob => {
    // Merge all sample arrays
    const totalLength = samples.reduce((acc, arr) => acc + arr.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const arr of samples) {
      merged.set(arr, offset);
      offset += arr.length;
    }

    // Create WAV buffer
    const buffer = new ArrayBuffer(44 + merged.length * 2);
    const view = new DataView(buffer);

    // Write WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + merged.length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, targetSampleRate, true);
    view.setUint32(28, targetSampleRate * 2, true); // ByteRate
    view.setUint16(32, 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    writeString(36, "data");
    view.setUint32(40, merged.length * 2, true);

    // Write samples
    let writeOffset = 44;
    for (let i = 0; i < merged.length; i++) {
      const sample = merged[i] ?? 0;
      const s = Math.max(-1, Math.min(1, sample));
      view.setInt16(writeOffset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      writeOffset += 2;
    }

    return new Blob([buffer], { type: "audio/wav" });
  }, []);

  // Analyze audio level
  const analyzeAudioLevel = useCallback(() => {
    if (!analyserRef.current || !isRecordingRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate RMS level
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const sample = dataArray[i] ?? 0;
      sum += sample * sample;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    const level = Math.min(1, rms / 128);

    // Call level callback (via ref for stability)
    onAudioLevelRef.current?.(level);

    setState((prev) => ({
      ...prev,
      audioLevel: level,
      duration: Date.now() - startTimeRef.current,
    }));

    animationFrameRef.current = requestAnimationFrame(analyzeAudioLevel);
  }, []);

  // Start recording with Web Audio API (Emergency-Fallback - VAD degraded)
  const startWebRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;

      // Create audio context
      audioContextRef.current = new AudioContext({ sampleRate });

      // Validate actual sample rate
      const actualRate = audioContextRef.current.sampleRate;
      logger.info('AudioRecorder', `Requested ${sampleRate}Hz, actual: ${actualRate}Hz`);
      if (actualRate !== sampleRate) {
        logger.error(
          'AudioRecorder',
          `CRITICAL: Browser uses ${actualRate}Hz instead of ${sampleRate}Hz! VAD may fail if Rust backend expects 16kHz`
        );
      }

      const source = audioContextRef.current.createMediaStreamSource(stream);

      // Analyser for level visualization
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // ScriptProcessor to capture raw samples
      // Note: ScriptProcessorNode is deprecated but AudioWorklet requires more setup
      const bufferSize = 4096;
      processorRef.current = audioContextRef.current.createScriptProcessor(bufferSize, 1, 1);

      processorRef.current.onaudioprocess = (event) => {
        if (!isRecordingRef.current) return;

        const inputData = event.inputBuffer.getChannelData(0);
        // Clone the data since the buffer is reused
        const samples = new Float32Array(inputData.length);
        samples.set(inputData);
        samplesRef.current.push(samples);

        // Call onAudioData for real-time analysis
        if (onAudioData) {
          onAudioData(samples);
        }
      };

      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      // Clear previous samples
      samplesRef.current = [];
      isRecordingRef.current = true;
      startTimeRef.current = Date.now();

      setState({
        isRecording: true,
        audioLevel: 0,
        duration: 0,
        isNative: false,
      });

      // Set up chunk interval for streaming transcription
      if (onAudioChunk && chunkInterval > 0) {
        chunkTimeoutRef.current = setInterval(() => {
          if (isRecordingRef.current && samplesRef.current.length > 0) {
            // Merge samples to check for significant audio
            const totalLength = samplesRef.current.reduce((acc, arr) => acc + arr.length, 0);
            const merged = new Float32Array(totalLength);
            let offset = 0;
            for (const arr of samplesRef.current) {
              merged.set(arr, offset);
              offset += arr.length;
            }

            // Only send chunk if it contains significant (non-silent) audio
            if (hasSignificantAudio(merged)) {
              const wavBlob = createWavBlob(samplesRef.current, sampleRate);
              logger.debug('AudioRecorder', `Sending WAV chunk: ${wavBlob.size} bytes`);
              onAudioChunk(wavBlob);
            } else {
              logger.debug('AudioRecorder', 'Skipping silent chunk');
            }
            // Clear samples for next chunk
            samplesRef.current = [];
          }
        }, chunkInterval);
      }

      // Start level analysis
      analyzeAudioLevel();

      return true;
    } catch (error: unknown) {
      logger.error('AudioRecorder', 'Failed to start web recording', error);
      throw error;
    }
  }, [sampleRate, chunkInterval, onAudioChunk, onAudioData, analyzeAudioLevel, createWavBlob, hasSignificantAudio]);

  // Start native (cpal) recording via Tauri
  const startNativeRecording = useCallback(async () => {
    try {
      // Start native recording
      await invoke<void>("native_start_recording");

      isRecordingRef.current = true;
      isNativeRef.current = true; // Track via ref for stable callbacks
      nativeStartTimeRef.current = Date.now();

      setState({
        isRecording: true,
        audioLevel: 0,
        duration: 0,
        isNative: true,
      });

      // Start level polling
      nativeLevelPollRef.current = setInterval(async () => {
        try {
          const rawLevel = await invoke<number>("native_get_audio_level");
          // Normalize raw RMS (~0.01-0.15) to display range (0-1)
          const normalizedLevel = normalizeAudioLevel(rawLevel ?? 0);

          // Call level callback (via ref for stability)
          onAudioLevelRef.current?.(normalizedLevel);

          setState((prev) => ({
            ...prev,
            audioLevel: normalizedLevel,
            duration: Date.now() - nativeStartTimeRef.current,
          }));
        } catch {
          // Ignore polling errors
        }
      }, NATIVE_LEVEL_POLL_INTERVAL);

      logger.info('AudioRecorder', 'Native recording started (cpal)');
      return true;
    } catch (error: unknown) {
      logger.error('AudioRecorder', 'Native recording failed', error);
      throw error;
    }
  }, [invoke]);

  // Stop native recording and return WAV blob
  const stopNativeRecording = useCallback(async (): Promise<Blob | null> => {
    isRecordingRef.current = false;
    isNativeRef.current = false; // Reset native flag

    // Stop level polling
    if (nativeLevelPollRef.current) {
      clearInterval(nativeLevelPollRef.current);
      nativeLevelPollRef.current = null;
    }

    try {
      // Stop recording and get Base64 WAV
      const base64Wav = await invoke<string>("native_stop_recording");

      if (!base64Wav) {
        logger.info('AudioRecorder', 'Native: No speech detected');
        setState({
          isRecording: false,
          audioLevel: 0,
          duration: 0,
          isNative: false,
        });
        return null;
      }

      // Convert Base64 to Blob
      const binaryString = atob(base64Wav);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const wavBlob = new Blob([bytes], { type: "audio/wav" });

      logger.info('AudioRecorder', `Native recording stopped: ${wavBlob.size} bytes`);

      setState({
        isRecording: false,
        audioLevel: 0,
        duration: 0,
        isNative: false,
      });

      return wavBlob;
    } catch (error: unknown) {
      logger.error('AudioRecorder', 'Failed to stop native recording', error);
      setState({
        isRecording: false,
        audioLevel: 0,
        duration: 0,
        isNative: false,
      });
      return null;
    }
  }, [invoke]);

  // Main start function - prefers native, falls back to Web Audio
  const start = useCallback(async () => {
    // Guard against concurrent start operations
    if (isRecordingRef.current || isStartingRef.current) {
      logger.warn('AudioRecorder', 'Start ignored - already recording/starting');
      return false;
    }

    isStartingRef.current = true;
    try {
      // Try native recording first if in Tauri and preferred
      if (isTauri && preferNative) {
        try {
          const result = await startNativeRecording();
          return result;
        } catch (error: unknown) {
          logger.warn('AudioRecorder', 'Native recording failed, falling back to Web Audio', error);
          // Fall through to Web Audio
        }
      }

      // Use Web Audio API
      return await startWebRecording();
    } finally {
      isStartingRef.current = false;
    }
  }, [isTauri, preferNative, startNativeRecording, startWebRecording]);

  // Stop recording (handles both native and web)
  const stop = useCallback(async (): Promise<Blob | null> => {
    if (!isRecordingRef.current) return null;

    // If using native recording, use native stop (check ref for stability)
    if (isNativeRef.current) {
      return stopNativeRecording();
    }

    isRecordingRef.current = false;

    // Stop chunk interval
    if (chunkTimeoutRef.current) {
      clearInterval(chunkTimeoutRef.current);
      chunkTimeoutRef.current = null;
    }

    // Stop level analysis
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Create final WAV blob from remaining samples (if not silent)
    let finalBlob: Blob | null = null;
    if (samplesRef.current.length > 0) {
      // Merge samples to check for significant audio
      const totalLength = samplesRef.current.reduce((acc, arr) => acc + arr.length, 0);
      const merged = new Float32Array(totalLength);
      let offset = 0;
      for (const arr of samplesRef.current) {
        merged.set(arr, offset);
        offset += arr.length;
      }

      if (hasSignificantAudio(merged)) {
        finalBlob = createWavBlob(samplesRef.current, sampleRate);
        logger.debug('AudioRecorder', `Final WAV: ${finalBlob.size} bytes`);
      } else {
        logger.debug('AudioRecorder', 'Skipping silent final chunk');
      }
    }

    // Cleanup
    if (processorRef.current) {
      processorRef.current.disconnect();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
    }

    audioContextRef.current = null;
    analyserRef.current = null;
    processorRef.current = null;
    streamRef.current = null;
    samplesRef.current = [];

    setState({
      isRecording: false,
      audioLevel: 0,
      duration: 0,
      isNative: false,
    });

    return finalBlob;
  }, [sampleRate, createWavBlob, hasSignificantAudio, stopNativeRecording]);

  // Keep stopRef in sync for use in timer effect (avoids dependency loop)
  stopRef.current = stop;

  // Cancel recording (handles both native and web)
  // Use refs instead of state to avoid dependency loops
  const cancel = useCallback(async () => {
    const wasNative = isNativeRef.current;
    isRecordingRef.current = false;
    isNativeRef.current = false;

    // Stop native level polling
    if (nativeLevelPollRef.current) {
      clearInterval(nativeLevelPollRef.current);
      nativeLevelPollRef.current = null;
    }

    // If was using native, close the audio device
    if (wasNative && isTauri) {
      try {
        await invoke<void>("native_close_audio");
      } catch {
        // Ignore errors during cancel
      }
    }

    cleanup();
    setState({
      isRecording: false,
      audioLevel: 0,
      duration: 0,
      isNative: false,
    });
  }, [cleanup, isTauri, invoke]);

  // Recording timer - check limits every second
  // Uses state.isRecording (not ref) to properly trigger effect on recording state changes
  useEffect(() => {
    if (!state.isRecording || !maxRecordingMinutes) {
      warningShownRef.current = false;
      return;
    }

    const intervalId = setInterval(() => {
      const startTime = isNativeRef.current
        ? nativeStartTimeRef.current
        : startTimeRef.current;

      // Guard: Skip if startTime not initialized (prevents overflow bug)
      if (startTime === 0) {
        return;
      }

      const elapsedMs = Date.now() - startTime;
      const elapsedMinutes = elapsedMs / (60 * 1000);

      // Warning at 90%
      if (elapsedMinutes >= maxRecordingMinutes * 0.9 && !warningShownRef.current) {
        const remainingMinutes = Math.max(0, Math.ceil(maxRecordingMinutes - elapsedMinutes));

        import("@/hooks/use-toast")
          .then(({ toast }) => {
            toast({
              title: "Aufnahme endet bald",
              description: `Noch ${remainingMinutes} Minute(n) verbleibend. Limit: ${maxRecordingMinutes} Minuten`,
              duration: 5000,
            });
          })
          .catch((err) => {
            logger.error('AudioRecorder', 'Failed to load toast module', err);
          });

        logger.warn('AudioRecorder', 'Recording time warning', {
          elapsed: elapsedMinutes,
          max: maxRecordingMinutes,
        });

        warningShownRef.current = true;
      }

      // Auto-stop at 100%
      if (elapsedMinutes >= maxRecordingMinutes) {
        logger.warn('AudioRecorder', 'Max recording duration reached, stopping', {
          elapsed: elapsedMinutes,
          max: maxRecordingMinutes,
        });

        stopRef.current?.();
      }
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [state.isRecording, maxRecordingMinutes]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Cleanup on window close/refresh to prevent audio system lockup
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Force cleanup of all audio resources
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
        streamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
      handleBeforeUnload(); // Also cleanup on effect cleanup
    };
  }, []);

  return {
    ...state,
    start,
    stop,
    cancel,
    isRecording: state.isRecording,
    isNative: state.isNative,
  };
}
