/**
 * Audio File Utilities
 *
 * Validierung für Audio-Dateiformate (.wav, .mp3, .m4a, .ogg) + MIME-Types.
 * Nutzt für Audio-Import (Drag & Drop + File Dialog).
 */

import { logger } from "@/lib/logger";

const VALID_AUDIO_EXTENSIONS = [".wav", ".mp3", ".m4a", ".ogg"];
const VALID_AUDIO_MIME_TYPES = [
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/ogg",
  "audio/vorbis",
];

export interface ConversionResult {
  wavBlob: Blob;
  durationSec: number;
  originalFormat: string;
}

/**
 * Check if file is valid audio format
 * @param file File to validate
 * @param maxSizeMB Maximum file size in MB (default: 50)
 * @returns true if valid audio file within size limit
 */
export function isValidAudioFormat(file: File, maxSizeMB: number = 50): boolean {
  const MAX_FILE_SIZE_BYTES = maxSizeMB * 1024 * 1024;

  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    logger.warn("AudioConvert", "File too large", { size: file.size, maxMB: maxSizeMB });
    return false;
  }

  // Check MIME type
  if (file.type && VALID_AUDIO_MIME_TYPES.includes(file.type)) {
    return true;
  }

  // Check file extension as fallback
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  return VALID_AUDIO_EXTENSIONS.includes(extension);
}

/**
 * Mix multi-channel audio to mono by averaging channels
 * @param audioBuffer Decoded audio buffer
 * @returns Mono audio samples
 */
export function mixToMono(audioBuffer: AudioBuffer): Float32Array {
  const { numberOfChannels, length } = audioBuffer;

  // Already mono
  if (numberOfChannels === 1) {
    return audioBuffer.getChannelData(0);
  }

  // Mix channels by averaging
  const mono = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = audioBuffer.getChannelData(channel)[i];
      if (sample !== undefined) {
        sum += sample;
      }
    }
    mono[i] = sum / numberOfChannels;
  }

  return mono;
}

/**
 * Encode Float32Array samples as WAV blob
 * @param samples Mono audio samples
 * @param sampleRate Sample rate (e.g., 16000)
 * @returns WAV blob
 */
export function encodeWav(
  samples: Float32Array,
  sampleRate: number
): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // Helper to write string to buffer
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF chunk descriptor
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true); // File size - 8
  writeString(8, "WAVE");

  // fmt sub-chunk
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true); // NumChannels (Mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true); // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true); // BitsPerSample (16-bit)

  // data sub-chunk
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true); // Subchunk2Size

  // Write samples (convert Float32 [-1, 1] to Int16 [-32768, 32767])
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const rawSample = samples[i] ?? 0; // Fallback to 0 if undefined
    const sample = Math.max(-1, Math.min(1, rawSample)); // Clamp to [-1, 1]
    const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(offset, int16, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Convert audio file to 16kHz mono WAV using Web Audio API
 * @param file Audio file to convert
 * @returns Conversion result with WAV blob and metadata
 * @throws Error if file is invalid or conversion fails
 */
export async function convertToWav16kMono(
  file: File,
  maxSizeMB: number = 50
): Promise<ConversionResult> {
  const MAX_FILE_SIZE_BYTES = maxSizeMB * 1024 * 1024;

  // Validate file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `Datei zu groß (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximal ${maxSizeMB} MB erlaubt.`
    );
  }

  // Validate format
  if (!isValidAudioFormat(file, maxSizeMB)) {
    throw new Error(
      `Ungültiges Audioformat. Unterstützt: ${VALID_AUDIO_EXTENSIONS.join(", ")}`
    );
  }

  logger.info("AudioConvert", "Converting audio file", {
    name: file.name,
    size: file.size,
    type: file.type,
  });

  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Decode audio using Web Audio API
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const duration = audioBuffer.duration ?? 0;

    logger.debug("AudioConvert", "Audio decoded", {
      duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
    });

    // Mix to mono
    const monoSamples = mixToMono(audioBuffer);

    // Resample to 16kHz if needed (AudioContext does this automatically)
    const targetSampleRate = 16000;
    let resampled: Float32Array;

    if (audioBuffer.sampleRate === targetSampleRate) {
      resampled = monoSamples;
    } else {
      // AudioContext already resampled during decode (sampleRate: 16000)
      // But if source was different, we need to resample
      const ratio = targetSampleRate / audioBuffer.sampleRate;
      const newLength = Math.floor(monoSamples.length * ratio);
      resampled = new Float32Array(newLength);

      for (let i = 0; i < newLength; i++) {
        const srcIndex = i / ratio;
        const srcIndexFloor = Math.floor(srcIndex);
        const srcIndexCeil = Math.min(
          srcIndexFloor + 1,
          monoSamples.length - 1
        );
        const fraction = srcIndex - srcIndexFloor;

        // Linear interpolation
        const sampleFloor = monoSamples[srcIndexFloor] ?? 0;
        const sampleCeil = monoSamples[srcIndexCeil] ?? 0;
        resampled[i] = sampleFloor * (1 - fraction) + sampleCeil * fraction;
      }
    }

    // Encode as WAV
    const wavBlob = encodeWav(resampled, targetSampleRate);

    // Close audio context
    await audioContext.close();

    const originalFormat =
      file.name.toLowerCase().slice(file.name.lastIndexOf(".") + 1) || "unknown";

    logger.info("AudioConvert", "Conversion complete", {
      originalFormat,
      duration: audioBuffer.duration,
      outputSize: wavBlob.size,
    });

    return {
      wavBlob,
      durationSec: duration,
      originalFormat,
    };
  } catch (error: unknown) {
    logger.error("AudioConvert", "Conversion failed", error);
    throw new Error("Audio-Datei konnte nicht gelesen werden");
  }
}
