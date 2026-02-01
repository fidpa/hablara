import { describe, it, expect } from "vitest";
import {
  isValidAudioFormat,
  encodeWav,
  mixToMono,
  convertToWav16kMono,
} from "@/lib/audio-convert";

describe("audio-convert", () => {
  describe("isValidAudioFormat", () => {
    it("should accept valid audio formats", () => {
      const validFiles = [
        new File([], "test.wav", { type: "audio/wav" }),
        new File([], "test.mp3", { type: "audio/mpeg" }),
        new File([], "test.m4a", { type: "audio/mp4" }),
        new File([], "test.ogg", { type: "audio/ogg" }),
      ];

      validFiles.forEach((file) => {
        expect(isValidAudioFormat(file)).toBe(true);
      });
    });

    it("should reject invalid formats", () => {
      const invalidFiles = [
        new File([], "test.txt", { type: "text/plain" }),
        new File([], "test.pdf", { type: "application/pdf" }),
        new File([], "test.jpg", { type: "image/jpeg" }),
        new File([], "test.mp4", { type: "video/mp4" }),
      ];

      invalidFiles.forEach((file) => {
        expect(isValidAudioFormat(file)).toBe(false);
      });
    });

    it("should accept files without explicit MIME type but with valid extension", () => {
      const file = new File([], "test.wav", { type: "" });
      expect(isValidAudioFormat(file)).toBe(true);
    });

    it("should reject files larger than 50 MB (default)", () => {
      const largeBuffer = new ArrayBuffer(51 * 1024 * 1024); // 51 MB
      const file = new File([largeBuffer], "large.wav", { type: "audio/wav" });
      expect(isValidAudioFormat(file)).toBe(false);
    });

    it("should accept file at custom limit (100 MB)", () => {
      const buffer = new ArrayBuffer(99 * 1024 * 1024); // 99 MB
      const file = new File([buffer], "test.wav", { type: "audio/wav" });
      expect(isValidAudioFormat(file, 100)).toBe(true);
    });

    it("should reject file exceeding custom limit (100 MB)", () => {
      const largeBuffer = new ArrayBuffer(101 * 1024 * 1024); // 101 MB
      const file = new File([largeBuffer], "large.wav", { type: "audio/wav" });
      expect(isValidAudioFormat(file, 100)).toBe(false);
    });

    it("should use default 50 MB when maxSizeMB is not specified", () => {
      const buffer = new ArrayBuffer(49 * 1024 * 1024); // 49 MB
      const file = new File([buffer], "test.wav", { type: "audio/wav" });
      expect(isValidAudioFormat(file)).toBe(true);
    });

    it("should accept small custom limit (10 MB)", () => {
      const smallBuffer = new ArrayBuffer(9 * 1024 * 1024); // 9 MB
      const file = new File([smallBuffer], "test.wav", { type: "audio/wav" });
      expect(isValidAudioFormat(file, 10)).toBe(true);
    });

    it("should reject file exceeding small custom limit (10 MB)", () => {
      const buffer = new ArrayBuffer(11 * 1024 * 1024); // 11 MB
      const file = new File([buffer], "test.wav", { type: "audio/wav" });
      expect(isValidAudioFormat(file, 10)).toBe(false);
    });
  });

  describe("mixToMono", () => {
    it("should return single channel for mono input", () => {
      const samples = new Float32Array([0.1, 0.2, 0.3, 0.4]);
      const mockBuffer = {
        numberOfChannels: 1,
        length: samples.length,
        getChannelData: (_channel: number) => samples,
      } as AudioBuffer;

      const result = mixToMono(mockBuffer);
      expect(result).toEqual(samples);
    });

    it("should average channels for stereo input", () => {
      const left = new Float32Array([0.2, 0.4, 0.6]);
      const right = new Float32Array([0.0, 0.2, 0.4]);
      const mockBuffer = {
        numberOfChannels: 2,
        length: left.length,
        getChannelData: (channel: number) => (channel === 0 ? left : right),
      } as AudioBuffer;

      const result = mixToMono(mockBuffer);
      expect(result).toHaveLength(3);
      expect(result[0]).toBeCloseTo(0.1); // (0.2 + 0.0) / 2
      expect(result[1]).toBeCloseTo(0.3); // (0.4 + 0.2) / 2
      expect(result[2]).toBeCloseTo(0.5); // (0.6 + 0.4) / 2
    });

    it("should average all channels for multi-channel input", () => {
      const ch1 = new Float32Array([0.3]);
      const ch2 = new Float32Array([0.6]);
      const ch3 = new Float32Array([0.9]);
      const mockBuffer = {
        numberOfChannels: 3,
        length: 1,
        getChannelData: (channel: number) => {
          if (channel === 0) return ch1;
          if (channel === 1) return ch2;
          return ch3;
        },
      } as AudioBuffer;

      const result = mixToMono(mockBuffer);
      expect(result[0]).toBeCloseTo(0.6); // (0.3 + 0.6 + 0.9) / 3
    });
  });

  describe("encodeWav", () => {
    it("should create valid WAV blob", () => {
      const samples = new Float32Array([0.0, 0.5, -0.5, 1.0, -1.0]);
      const sampleRate = 16000;

      const blob = encodeWav(samples, sampleRate);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("audio/wav");
      expect(blob.size).toBe(44 + samples.length * 2); // WAV header + 16-bit samples
    });

    it("should encode correct WAV header", async () => {
      const samples = new Float32Array(100);
      const sampleRate = 16000;

      const blob = encodeWav(samples, sampleRate);
      const arrayBuffer = await blob.arrayBuffer();
      const view = new DataView(arrayBuffer);

      // Check RIFF header
      expect(String.fromCharCode(view.getUint8(0))).toBe("R");
      expect(String.fromCharCode(view.getUint8(1))).toBe("I");
      expect(String.fromCharCode(view.getUint8(2))).toBe("F");
      expect(String.fromCharCode(view.getUint8(3))).toBe("F");

      // Check WAVE format
      expect(String.fromCharCode(view.getUint8(8))).toBe("W");
      expect(String.fromCharCode(view.getUint8(9))).toBe("A");
      expect(String.fromCharCode(view.getUint8(10))).toBe("V");
      expect(String.fromCharCode(view.getUint8(11))).toBe("E");

      // Check sample rate
      expect(view.getUint32(24, true)).toBe(sampleRate);

      // Check format (PCM)
      expect(view.getUint16(20, true)).toBe(1);

      // Check channels (Mono)
      expect(view.getUint16(22, true)).toBe(1);

      // Check bits per sample (16-bit)
      expect(view.getUint16(34, true)).toBe(16);
    });
  });

  describe("convertToWav16kMono", () => {
    it("should reject file larger than 50 MB (default)", async () => {
      const largeBuffer = new ArrayBuffer(51 * 1024 * 1024);
      const file = new File([largeBuffer], "large.wav", { type: "audio/wav" });

      await expect(convertToWav16kMono(file)).rejects.toThrow(
        /Datei zu gro[sß] \(51\.0 MB\)\. Maximal 50 MB erlaubt/
      );
    });

    it("should reject invalid audio format", async () => {
      const file = new File([], "test.txt", { type: "text/plain" });

      await expect(convertToWav16kMono(file)).rejects.toThrow(
        /Ung[üu]ltiges Audioformat/
      );
    });

    it("should reject file exceeding custom limit (20 MB)", async () => {
      const largeBuffer = new ArrayBuffer(21 * 1024 * 1024); // 21 MB
      const file = new File([largeBuffer], "large.wav", { type: "audio/wav" });

      await expect(convertToWav16kMono(file, 20)).rejects.toThrow(
        /Datei zu gro[sß] \(21\.0 MB\)\. Maximal 20 MB erlaubt/
      );
    });

    it("should accept file within custom limit (100 MB)", async () => {
      const buffer = new ArrayBuffer(99 * 1024 * 1024); // 99 MB
      const file = new File([buffer], "test.wav", { type: "audio/wav" });

      // This will still fail in test environment due to missing AudioContext,
      // but it should pass the size validation
      await expect(convertToWav16kMono(file, 100)).rejects.not.toThrow(
        /Datei zu gro[sß]/
      );
    });

    // Note: Actual decoding tests would require browser AudioContext mock
    // which is complex. These tests verify error handling and size validation.
  });
});
