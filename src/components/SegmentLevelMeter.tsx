"use client";

/**
 * SegmentLevelMeter - LED-style Audio Level Visualization
 *
 * Industry-standard segmented meter (10 segments: 6 green, 2 amber, 2 red).
 * Based on dBFS standards used in DAWs and professional audio applications.
 */

import { cn } from "@/lib/utils";

interface SegmentLevelMeterProps {
  /** Normalized audio level (0-1) */
  level: number;
  /** Whether recording is active */
  isActive: boolean;
  /** Number of segments to display */
  segments?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * LED-style segmented audio level meter.
 * Industry-standard pattern used in DAWs, Discord, and professional audio apps.
 *
 * Color zones (based on dB standards):
 * - Green: Safe level (0-60% = -20 to -12 dBFS) - 6 of 10 segments
 * - Amber: Caution (60-80% = -12 to -8 dBFS) - 2 of 10 segments
 * - Red: Danger/Clipping (80-100% = -8 to 0 dBFS) - 2 of 10 segments
 *
 * Inactive state: All segments visible at 20% opacity ("ready" appearance)
 */
export function SegmentLevelMeter({
  level,
  isActive,
  segments = 10,
  className,
}: SegmentLevelMeterProps) {
  // Clamp level to [0, 1]
  const clampedLevel = Math.max(0, Math.min(1, level));

  // Calculate how many segments are "lit"
  const litSegments = Math.round(clampedLevel * segments);

  // Determine segment color based on position
  // With 10 segments: 6 green (0-60%), 2 yellow (60-80%), 2 red (80-100%)
  const getSegmentColor = (index: number, isLit: boolean): string => {
    if (!isLit) {
      // Inactive segments: very dim (visible but subtle)
      return "bg-slate-300/30 dark:bg-slate-600/20";
    }

    // Color thresholds based on segment position
    const position = index / segments;

    if (position < 0.60) {
      // Green zone: safe level (6 of 10 segments)
      return "bg-green-500";
    } else if (position < 0.80) {
      // Yellow/Orange zone: caution (2 of 10 segments)
      return "bg-amber-500";
    } else {
      // Red zone: danger/clipping (2 of 10 segments)
      return "bg-red-500";
    }
  };

  // ARIA attributes for accessibility
  const ariaValueNow = Math.round(clampedLevel * 100);

  // Determine level status for screen readers
  const getLevelStatus = (): string => {
    if (!isActive) return "Inaktiv";
    if (clampedLevel < 0.15) return "Sehr leise";
    if (clampedLevel < 0.40) return "Leise";
    if (clampedLevel < 0.65) return "Gut";
    if (clampedLevel < 0.85) return "Laut";
    return "Sehr laut - Clipping-Gefahr";
  };

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="meter"
      aria-label="Audio-Pegel"
      aria-valuenow={ariaValueNow}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${ariaValueNow} Prozent - ${getLevelStatus()}`}
    >
      {Array.from({ length: segments }, (_, index) => {
        const isLit = isActive && index < litSegments;

        return (
          <div
            key={index}
            className={cn(
              "h-3 flex-1 rounded-sm transition-all duration-75",
              getSegmentColor(index, isLit),
              // Pulse animation on red segments when active
              isLit && index >= segments * 0.85 && "animate-pulse motion-reduce:animate-none"
            )}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}
