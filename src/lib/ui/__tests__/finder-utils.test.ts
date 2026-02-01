/**
 * Tests für Finder Reveal Utilities
 *
 * @since Phase 48 (Finder Reveal Fix)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { revealInFinder, getFinderErrorMessage } from "../finder-utils";
import type { RevealResult } from "../finder-utils";

// Mock @tauri-apps/plugin-fs
const mockExists = vi.fn();
vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: () => mockExists(),
}));

// Mock @tauri-apps/plugin-opener
const mockRevealItemInDir = vi.fn();
vi.mock("@tauri-apps/plugin-opener", () => ({
  revealItemInDir: (path: string) => mockRevealItemInDir(path),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("revealInFinder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return success when file exists and reveal succeeds", async () => {
    const testPath = "/Users/test/Downloads/test.pdf";
    mockExists.mockResolvedValue(true);
    mockRevealItemInDir.mockResolvedValue(undefined);

    const result: RevealResult = await revealInFinder(testPath);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(mockExists).toHaveBeenCalled();
    expect(mockRevealItemInDir).toHaveBeenCalledWith(testPath);
  });

  it("should return file_not_found when file does not exist", async () => {
    const testPath = "/Users/test/Downloads/nonexistent.pdf";
    mockExists.mockResolvedValue(false);

    const result: RevealResult = await revealInFinder(testPath);

    expect(result.success).toBe(false);
    expect(result.error).toBe("file_not_found");
    expect(mockExists).toHaveBeenCalled();
    expect(mockRevealItemInDir).not.toHaveBeenCalled();
  });

  it("should return reveal_failed when revealItemInDir throws", async () => {
    const testPath = "/Users/test/Downloads/test.pdf";
    mockExists.mockResolvedValue(true);
    mockRevealItemInDir.mockRejectedValue(new Error("Reveal failed"));

    const result: RevealResult = await revealInFinder(testPath);

    expect(result.success).toBe(false);
    expect(result.error).toBe("reveal_failed");
    expect(mockExists).toHaveBeenCalled();
    expect(mockRevealItemInDir).toHaveBeenCalledWith(testPath);
  });

  it("should handle special characters in path (umlauts)", async () => {
    const testPath = "/Users/Müller/Downloads/Übersicht.pdf";
    mockExists.mockResolvedValue(true);
    mockRevealItemInDir.mockResolvedValue(undefined);

    const result: RevealResult = await revealInFinder(testPath);

    expect(result.success).toBe(true);
    expect(mockRevealItemInDir).toHaveBeenCalledWith(testPath);
  });

  it("should handle spaces in path", async () => {
    const testPath = "/Users/test/My Documents/Important File.pdf";
    mockExists.mockResolvedValue(true);
    mockRevealItemInDir.mockResolvedValue(undefined);

    const result: RevealResult = await revealInFinder(testPath);

    expect(result.success).toBe(true);
    expect(mockRevealItemInDir).toHaveBeenCalledWith(testPath);
  });

  it("should handle exists() throwing gracefully", async () => {
    const testPath = "/Users/test/Downloads/test.pdf";
    mockExists.mockRejectedValue(new Error("Permission denied"));

    const result: RevealResult = await revealInFinder(testPath);

    // Should return file_not_found (defensive fallback)
    expect(result.success).toBe(false);
    expect(result.error).toBe("file_not_found");
    expect(mockRevealItemInDir).not.toHaveBeenCalled();
  });

  it("should handle empty path gracefully", async () => {
    mockExists.mockResolvedValue(false);

    const result: RevealResult = await revealInFinder("");

    expect(result.success).toBe(false);
    expect(result.error).toBe("file_not_found");
    expect(mockRevealItemInDir).not.toHaveBeenCalled();
  });
});

describe("getFinderErrorMessage", () => {
  it("should return German message for file_not_found", () => {
    const message = getFinderErrorMessage("file_not_found");
    expect(message).toBe("Datei nicht gefunden. Möglicherweise verschoben oder gelöscht.");
  });

  it("should return German message for reveal_failed", () => {
    const message = getFinderErrorMessage("reveal_failed");
    expect(message).toBe("Finder konnte nicht geöffnet werden.");
  });
});
