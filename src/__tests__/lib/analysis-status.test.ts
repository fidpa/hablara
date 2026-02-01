import { describe, it, expect } from "vitest";
import type { AnalysisStatus } from "@/lib/types";

describe("AnalysisPipeline - analysisStatus tracking", () => {
  // Integration tests are in the hook test files
  // Here we just test the type structure and basic validation

  it("tracks partial failure status structure", () => {
    const status: AnalysisStatus = {
      emotion: "failed",
      fallacy: "success",
      tone: "success",
      gfk: "skipped",
      cognitive: "success",
      fourSides: "skipped",
      topic: "success",
    };

    // Verify all required fields exist
    expect(status.emotion).toBe("failed");
    expect(status.fallacy).toBe("success");
    expect(status.tone).toBe("success");
    expect(status.gfk).toBe("skipped");
    expect(status.cognitive).toBe("success");
    expect(status.fourSides).toBe("skipped");
    expect(status.topic).toBe("success");
  });

  it("marks disabled features as skipped", () => {
    const status: AnalysisStatus = {
      emotion: "success",
      fallacy: "skipped", // Disabled
      tone: "skipped", // Disabled
      gfk: "skipped", // Disabled
      cognitive: "skipped", // Disabled
      fourSides: "skipped", // Disabled
      topic: "skipped", // Disabled
    };

    // Verify disabled features are skipped
    expect(status.emotion).toBe("success");
    expect(status.fallacy).toBe("skipped");
    expect(status.tone).toBe("skipped");
    expect(status.topic).toBe("skipped");
    expect(status.gfk).toBe("skipped");
    expect(status.cognitive).toBe("skipped");
    expect(status.fourSides).toBe("skipped");
  });

  it("tracks all failed status", () => {
    const status: AnalysisStatus = {
      emotion: "failed",
      fallacy: "failed",
      tone: "failed",
      gfk: "failed",
      cognitive: "failed",
      fourSides: "failed",
      topic: "failed",
    };

    // Verify all marked as failed
    expect(status.emotion).toBe("failed");
    expect(status.fallacy).toBe("failed");
    expect(status.tone).toBe("failed");
    expect(status.topic).toBe("failed");
    expect(status.gfk).toBe("failed");
    expect(status.cognitive).toBe("failed");
    expect(status.fourSides).toBe("failed");
  });
});
