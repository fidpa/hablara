"use client";

/**
 * EmotionCircumplex - Russell's Circumplex Visualisierung
 *
 * 2D-Plot (Valence/Arousal) mit Primary/Secondary Emotions. Gelber Diamant zeigt Blend-Position.
 * Quadrant-Labels: Positiv Energetisch, Positiv Ruhig, Negativ Energetisch, Negativ Ruhig.
 */

import { useMemo } from "react";
import type { EmotionState } from "@/lib/types";
import { EMOTION_INFO, EMOTION_COORDINATES } from "@/lib/types";
import { colorWithOpacity } from "@/lib/utils";

interface EmotionCircumplexProps {
  emotion: EmotionState;
  size?: number;
}

export default function EmotionCircumplex({ emotion, size = 180 }: EmotionCircumplexProps): JSX.Element | null {
  const primaryInfo = EMOTION_INFO[emotion.primary];
  const primaryCoords = EMOTION_COORDINATES[emotion.primary];

  const secondaryInfo = emotion.secondaryInfo
    ? EMOTION_INFO[emotion.secondaryInfo.type]
    : null;
  const secondaryCoords = emotion.secondaryInfo
    ? EMOTION_COORDINATES[emotion.secondaryInfo.type]
    : null;

  // Compute positions with memoization (inline transform functions for stable deps)
  const primaryPos = useMemo(() => ({
    x: (primaryCoords.valence + 1) * (size / 2),
    y: size - primaryCoords.arousal * size,
  }), [primaryCoords.valence, primaryCoords.arousal, size]);

  const secondaryPos = useMemo(() => {
    if (!secondaryCoords) return null;
    return {
      x: (secondaryCoords.valence + 1) * (size / 2),
      y: size - secondaryCoords.arousal * size,
    };
  }, [secondaryCoords, size]);

  // Blended position (if blending is active)
  const blendedPos = useMemo(() => {
    if (!emotion.blendedCoordinates) return null;
    return {
      x: (emotion.blendedCoordinates.valence + 1) * (size / 2),
      y: size - emotion.blendedCoordinates.arousal * size,
    };
  }, [emotion.blendedCoordinates, size]);

  return (
    <div className="mt-2">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-100 dark:bg-slate-900/30"
      >
        {/* Grid lines */}
        <line
          x1={size / 2}
          y1="0"
          x2={size / 2}
          y2={size}
          stroke="var(--color-border-muted)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        <line
          x1="0"
          y1={size / 2}
          x2={size}
          y2={size / 2}
          stroke="var(--color-border-muted)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* Axis labels */}
        <text x="5" y={size / 2 - 5} fill="var(--color-text-disabled)" fontSize="10">
          Negativ
        </text>
        <text x={size - 40} y={size / 2 - 5} fill="var(--color-text-disabled)" fontSize="10">
          Positiv
        </text>
        <text x={size / 2 - 35} y="12" fill="var(--color-text-disabled)" fontSize="10">
          Hoch
        </text>
        <text x={size / 2 - 45} y={size - 5} fill="var(--color-text-disabled)" fontSize="10">
          Niedrig
        </text>

        {/* Quadrant labels - psychologische Bedeutung */}
        <text x={size - 45} y="18" fill="var(--color-text-disabled)" fontSize="9" fontStyle="italic">
          Freude
        </text>
        <text x="5" y="18" fill="var(--color-text-disabled)" fontSize="9" fontStyle="italic">
          Wut
        </text>
        <text x={size - 65} y={size - 8} fill="var(--color-text-disabled)" fontSize="9" fontStyle="italic">
          Zufriedenheit
        </text>
        <text x="5" y={size - 8} fill="var(--color-text-disabled)" fontSize="9" fontStyle="italic">
          Trauer
        </text>

        {/* Connection line (if secondary exists) */}
        {secondaryPos && (
          <line
            x1={primaryPos.x}
            y1={primaryPos.y}
            x2={secondaryPos.x}
            y2={secondaryPos.y}
            stroke="var(--color-text-disabled)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            opacity="0.5"
          />
        )}

        {/* Secondary emotion marker (smaller) */}
        {secondaryPos && secondaryInfo && (
          <g>
            <circle
              cx={secondaryPos.x}
              cy={secondaryPos.y}
              r="8"
              fill={secondaryInfo.color}
              opacity="0.4"
            />
            <circle
              cx={secondaryPos.x}
              cy={secondaryPos.y}
              r="8"
              fill="none"
              stroke={secondaryInfo.color}
              strokeWidth="2"
            />
          </g>
        )}

        {/* Primary emotion marker (larger) */}
        <g>
          <circle
            cx={primaryPos.x}
            cy={primaryPos.y}
            r="12"
            fill={primaryInfo.color}
            opacity="0.3"
          />
          <circle
            cx={primaryPos.x}
            cy={primaryPos.y}
            r="12"
            fill="none"
            stroke={primaryInfo.color}
            strokeWidth="3"
          />
          {/* Confidence ring */}
          <circle
            cx={primaryPos.x}
            cy={primaryPos.y}
            r="18"
            fill="none"
            stroke={primaryInfo.color}
            strokeWidth="2"
            opacity={emotion.confidence * 0.5}
            strokeDasharray={`${2 * Math.PI * 18 * emotion.confidence} ${2 * Math.PI * 18}`}
          />
        </g>

        {/* Blended emotion marker (diamond) */}
        {blendedPos && (
          <g>
            {/* Diamond shape (polygon) */}
            <polygon
              points={`${blendedPos.x},${blendedPos.y - 10} ${blendedPos.x + 8},${blendedPos.y} ${blendedPos.x},${blendedPos.y + 10} ${blendedPos.x - 8},${blendedPos.y}`}
              fill="var(--color-blend-indicator)"
              opacity="0.5"
            />
            <polygon
              points={`${blendedPos.x},${blendedPos.y - 10} ${blendedPos.x + 8},${blendedPos.y} ${blendedPos.x},${blendedPos.y + 10} ${blendedPos.x - 8},${blendedPos.y}`}
              fill="none"
              stroke="var(--color-blend-indicator)"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 flex-wrap">
        <div className="flex items-center gap-1">
          <div
            className="w-3 h-3 rounded-full border-2"
            style={{ borderColor: primaryInfo.color, backgroundColor: colorWithOpacity(primaryInfo.color, 0.3) }}
          />
          <span>Primär</span>
        </div>
        {secondaryInfo && (
          <div className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full border-2"
              style={{ borderColor: secondaryInfo.color, backgroundColor: colorWithOpacity(secondaryInfo.color, 0.4) }}
            />
            <span>Sekundär</span>
          </div>
        )}
        {blendedPos && (
          <div className="flex items-center gap-1">
            <div
              className="w-2.5 h-2.5 rotate-45 border-2"
              style={{ borderColor: "var(--color-blend-indicator)", backgroundColor: "var(--color-blend-indicator)", opacity: 0.5 }}
            />
            <span>Gemischt</span>
          </div>
        )}
      </div>
    </div>
  );
}
