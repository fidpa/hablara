import { describe, it, expect } from "vitest";
import { hasPartialFailure, type AnalysisStatus } from "@/lib/types";

describe("hasPartialFailure", () => {
  it("returns false when status is undefined", () => {
    expect(hasPartialFailure(undefined)).toBe(false);
  });

  it("returns false for all success", () => {
    const status: AnalysisStatus = {
      emotion: "success",
      fallacy: "success",
      tone: "success",
      gfk: "success",
      cognitive: "success",
      fourSides: "success",
      topic: "success",
    };
    expect(hasPartialFailure(status)).toBe(false);
  });

  it("returns false for all failed", () => {
    const status: AnalysisStatus = {
      emotion: "failed",
      fallacy: "failed",
      tone: "failed",
      gfk: "failed",
      cognitive: "failed",
      fourSides: "failed",
      topic: "failed",
    };
    expect(hasPartialFailure(status)).toBe(false);
  });

  it("returns false for all skipped", () => {
    const status: AnalysisStatus = {
      emotion: "skipped",
      fallacy: "skipped",
      tone: "skipped",
      gfk: "skipped",
      cognitive: "skipped",
      fourSides: "skipped",
      topic: "skipped",
    };
    expect(hasPartialFailure(status)).toBe(false);
  });

  it("returns true for mixed (success + failed)", () => {
    const status: AnalysisStatus = {
      emotion: "success",
      fallacy: "failed",
      tone: "success",
      gfk: "skipped",
      cognitive: "success",
      fourSides: "failed",
      topic: "success",
    };
    expect(hasPartialFailure(status)).toBe(true);
  });

  it("returns true for minimal partial (1 success, 1 failed)", () => {
    const status: AnalysisStatus = {
      emotion: "success",
      fallacy: "failed",
      tone: "skipped",
      gfk: "skipped",
      cognitive: "skipped",
      fourSides: "skipped",
      topic: "skipped",
    };
    expect(hasPartialFailure(status)).toBe(true);
  });
});
