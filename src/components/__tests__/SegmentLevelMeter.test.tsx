import { render, screen } from "@testing-library/react";
import { SegmentLevelMeter } from "../SegmentLevelMeter";

describe("SegmentLevelMeter", () => {
  it("renders correct number of segments", () => {
    const { container } = render(
      <SegmentLevelMeter level={0.5} isActive={true} segments={10} />
    );

    const segments = container.querySelectorAll('[aria-hidden="true"]');
    expect(segments).toHaveLength(10);
  });

  it("renders with correct ARIA attributes", () => {
    render(<SegmentLevelMeter level={0.75} isActive={true} />);

    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("aria-label", "Audio-Pegel");
    expect(meter).toHaveAttribute("aria-valuenow", "75");
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
  });

  it("clamps level to [0, 1] range", () => {
    const { rerender } = render(
      <SegmentLevelMeter level={1.5} isActive={true} />
    );

    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "100");

    rerender(<SegmentLevelMeter level={-0.5} isActive={true} />);

    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "0");
  });

  describe("Segment lighting", () => {
    it("lights correct number of segments based on level", () => {
      const { container } = render(
        <SegmentLevelMeter level={0.5} isActive={true} segments={10} />
      );

      // 50% of 10 segments = 5 segments lit, all green (below 60% threshold)
      const greenSegments = container.querySelectorAll(".bg-green-500");
      expect(greenSegments.length).toBe(5);
    });

    it("shows all segments dim when inactive", () => {
      const { container } = render(
        <SegmentLevelMeter level={0.8} isActive={false} segments={10} />
      );

      // All segments should be dim (inactive appearance) - use attribute selector for classes with /
      const dimSegments = container.querySelectorAll('[class*="bg-slate-600"]');
      expect(dimSegments.length).toBe(10);

      // No colored segments
      const greenSegments = container.querySelectorAll(".bg-green-500");
      const amberSegments = container.querySelectorAll(".bg-amber-500");
      const redSegments = container.querySelectorAll(".bg-red-500");
      expect(greenSegments.length).toBe(0);
      expect(amberSegments.length).toBe(0);
      expect(redSegments.length).toBe(0);
    });

    it("shows no lit segments at 0% level", () => {
      const { container } = render(
        <SegmentLevelMeter level={0} isActive={true} segments={10} />
      );

      // All segments should be dim - use attribute selector for classes with /
      const dimSegments = container.querySelectorAll('[class*="bg-slate-600"]');
      expect(dimSegments.length).toBe(10);
    });
  });

  describe("Color zones", () => {
    it("shows green for low levels (< 60%)", () => {
      const { container } = render(
        <SegmentLevelMeter level={0.5} isActive={true} segments={10} />
      );

      // 50% level with 10 segments = 5 segments, all should be green (below 60% threshold)
      const greenSegments = container.querySelectorAll(".bg-green-500");
      expect(greenSegments.length).toBe(5);
    });

    it("shows amber for medium-high levels (60-80%)", () => {
      // Use 10 segments for clearer threshold testing
      const { container } = render(
        <SegmentLevelMeter level={0.7} isActive={true} segments={10} />
      );

      // 70% level with 10 segments = 7 segments lit
      // Positions: 0/10=0%, 1/10=10%, ..., 5/10=50%, 6/10=60%, 7/10=70%
      // Green: positions < 0.60 (indices 0-5)
      // Amber: positions 0.60-0.80 (index 6)
      const greenSegments = container.querySelectorAll(".bg-green-500");
      const amberSegments = container.querySelectorAll(".bg-amber-500");

      expect(greenSegments.length).toBeGreaterThan(0);
      expect(amberSegments.length).toBeGreaterThan(0);
    });

    it("shows red for high levels (>= 80%)", () => {
      const { container } = render(
        <SegmentLevelMeter level={1.0} isActive={true} segments={10} />
      );

      // 100% level with 10 segments = all 10 segments lit
      // Red zone: positions >= 0.80 (indices 8-9)
      const redSegments = container.querySelectorAll(".bg-red-500");
      expect(redSegments.length).toBeGreaterThan(0);
    });
  });

  describe("Accessibility", () => {
    it("provides descriptive valuetext for inactive state", () => {
      render(<SegmentLevelMeter level={0.5} isActive={false} />);

      const meter = screen.getByRole("meter");
      expect(meter).toHaveAttribute(
        "aria-valuetext",
        expect.stringContaining("Inaktiv")
      );
    });

    it("provides descriptive valuetext for quiet level", () => {
      render(<SegmentLevelMeter level={0.1} isActive={true} />);

      const meter = screen.getByRole("meter");
      expect(meter).toHaveAttribute(
        "aria-valuetext",
        expect.stringContaining("Sehr leise")
      );
    });

    it("provides descriptive valuetext for good level", () => {
      render(<SegmentLevelMeter level={0.5} isActive={true} />);

      const meter = screen.getByRole("meter");
      expect(meter).toHaveAttribute(
        "aria-valuetext",
        expect.stringContaining("Gut")
      );
    });

    it("provides warning for clipping danger", () => {
      render(<SegmentLevelMeter level={0.95} isActive={true} />);

      const meter = screen.getByRole("meter");
      expect(meter).toHaveAttribute(
        "aria-valuetext",
        expect.stringContaining("Clipping-Gefahr")
      );
    });
  });

  it("applies custom className", () => {
    const { container } = render(
      <SegmentLevelMeter
        level={0.5}
        isActive={true}
        className="custom-class w-full"
      />
    );

    const meterContainer = container.firstChild as HTMLElement;
    expect(meterContainer).toHaveClass("custom-class");
    expect(meterContainer).toHaveClass("w-full");
  });

  it("uses default 10 segments when not specified", () => {
    const { container } = render(
      <SegmentLevelMeter level={0.5} isActive={true} />
    );

    const segments = container.querySelectorAll('[aria-hidden="true"]');
    expect(segments).toHaveLength(10);
  });
});
