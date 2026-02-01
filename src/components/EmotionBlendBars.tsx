"use client";

/**
 * EmotionBlendBars - Stacked Bars für Emotion-Blending
 *
 * Visualisiert Primary/Secondary Emotion-Verhältnis (z.B. 65% Excitement / 35% Stress).
 * Nur gerendert wenn blendRatio > 0. Farbcodiert mit EMOTION_INFO colors.
 */

import type { EmotionState } from "@/lib/types";
import { EMOTION_INFO } from "@/lib/types";

interface EmotionBlendBarsProps {
  emotion: EmotionState;
}

export default function EmotionBlendBars({ emotion }: EmotionBlendBarsProps): JSX.Element | null {
  const { secondaryInfo, blendedCoordinates } = emotion;

  // Only render if blending is active
  if (!secondaryInfo?.blendRatio || secondaryInfo.blendRatio === 0 || !blendedCoordinates) {
    return null;
  }

  const primaryInfo = EMOTION_INFO[emotion.primary];
  const secondaryEmotionInfo = EMOTION_INFO[secondaryInfo.type];

  const primaryRatio = 1 - secondaryInfo.blendRatio;
  const secondaryRatio = secondaryInfo.blendRatio;

  const primaryPercent = Math.round(primaryRatio * 100);
  const secondaryPercent = Math.round(secondaryRatio * 100);

  return (
    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-600 dark:text-slate-400">Emotions-Mischung</span>
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {primaryPercent}% / {secondaryPercent}%
        </span>
      </div>

      {/* Stacked horizontal bars */}
      <div className="relative h-8 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 flex">
        {/* Primary emotion bar */}
        <div
          className="h-full flex items-center justify-center text-xs font-medium text-white transition-all duration-500"
          style={{
            width: `${primaryPercent}%`,
            backgroundColor: primaryInfo.color,
          }}
        >
          {primaryPercent > 15 && (
            <span className="drop-shadow-sm">{primaryInfo.name}</span>
          )}
        </div>

        {/* Secondary emotion bar */}
        <div
          className="h-full flex items-center justify-center text-xs font-medium text-white transition-all duration-500"
          style={{
            width: `${secondaryPercent}%`,
            backgroundColor: secondaryEmotionInfo.color,
          }}
        >
          {secondaryPercent > 15 && (
            <span className="drop-shadow-sm">{secondaryEmotionInfo.name}</span>
          )}
        </div>
      </div>

      {/* Blended position info */}
      <div className="flex items-center gap-3 mt-2 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-1">
          <span>Valenz:</span>
          <span className="text-slate-600 dark:text-slate-400 font-mono">
            {blendedCoordinates.valence.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span>Aktivierung:</span>
          <span className="text-slate-600 dark:text-slate-400 font-mono">
            {blendedCoordinates.arousal.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
