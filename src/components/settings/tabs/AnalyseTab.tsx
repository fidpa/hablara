"use client";

/**
 * AnalyseTab - Analyse-Features Settings Tab
 *
 * Zeigt FeatureSettingsSection für Toggle von Emotion Analysis, Fallacy Detection,
 * Tone Analysis, Psychological Enrichments (GFK, Cognitive, Four-Sides), Topic Classification.
 */

import type { AppSettings } from "@/lib/types";
import { FeatureSettingsSection } from "../FeatureSettingsSection";

interface AnalyseTabProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export function AnalyseTab({
  settings,
  onSettingsChange,
}: AnalyseTabProps): JSX.Element {
  return (
    <div className="space-y-4 py-4">
      <FeatureSettingsSection
        settings={settings}
        onSettingsChange={onSettingsChange}
      />
    </div>
  );
}
