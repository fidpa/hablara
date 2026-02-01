"use client";

/**
 * FeatureSettingsSection - Analyse-Features Toggle Section
 *
 * Kategorisierte Feature-Toggles (Analysis, Psychological, Audio) mit Collapsible Sections.
 * Nutzt FEATURE_REGISTRY als Single Source of Truth. 7 Features: Emotion, Fallacy,
 * Tone, GFK, Cognitive, Four-Sides, Topic.
 */

import { useCallback, useMemo } from "react";
import type { AppSettings } from "@/lib/types";
import {
  FEATURE_REGISTRY,
  CATEGORY_INFO,
  getFeaturesByCategory,
  isFeatureEnabled,
  areDependenciesMet,
  updateFeatureSetting,
  type FeatureCategory,
} from "@/lib/features";
import { FeatureSection } from "./FeatureSection";
import { FeatureCard } from "./FeatureCard";
import { EmotionDetectionModeSelector } from "./EmotionDetectionModeSelector";

interface FeatureSettingsSectionProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export function FeatureSettingsSection({
  settings,
  onSettingsChange,
}: FeatureSettingsSectionProps): JSX.Element {
  // Memoize feature grouping (static, never changes)
  const featuresByCategory = useMemo(() => getFeaturesByCategory(), []);

  // Memoize sorted categories (depends on featuresByCategory)
  const sortedCategories = useMemo(
    () =>
      [...featuresByCategory.entries()].sort(
        ([a], [b]) =>
          CATEGORY_INFO[a as FeatureCategory].order - CATEGORY_INFO[b as FeatureCategory].order
      ),
    [featuresByCategory]
  );

  const handleFeatureToggle = useCallback(
    (featureId: string, enabled: boolean) => {
      const feature = FEATURE_REGISTRY[featureId];
      if (!feature) return;

      const newSettings = updateFeatureSetting(settings, feature.settingsPath, enabled);
      onSettingsChange(newSettings);
    },
    [settings, onSettingsChange]
  );

  return (
    <div className="space-y-4">
      {sortedCategories.map(([category, features]) => {
        const categoryInfo = CATEGORY_INFO[category as FeatureCategory];

        return (
          <FeatureSection
            key={category}
            category={category as FeatureCategory}
            title={categoryInfo.name}
            description={categoryInfo.description}
            iconName={categoryInfo.icon}
            featureCount={features.length}
            defaultExpanded={category === "analysis" || category === "psychological"}
          >
            {features.map((feature) => {
              const enabled = isFeatureEnabled(feature.id, settings);
              const dependenciesMet = areDependenciesMet(feature.id, settings);

              return (
                <div key={feature.id} className="space-y-3">
                  <FeatureCard
                    feature={feature}
                    enabled={enabled}
                    onToggle={(checked) => handleFeatureToggle(feature.id, checked)}
                    disabled={!dependenciesMet}
                    disabledReason={
                      !dependenciesMet
                        ? `Benötigt: ${feature.requires
                            ?.map((id) => FEATURE_REGISTRY[id]?.name)
                            .join(", ")}`
                        : undefined
                    }
                  />

                  {/* Emotion Detection Mode Selector */}
                  {feature.id === "emotion_analysis" && enabled && (
                    <div className="ml-3 mt-3 pt-3 border-t border-border/50">
                      <EmotionDetectionModeSelector
                        settings={settings}
                        onSettingsChange={onSettingsChange}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </FeatureSection>
        );
      })}
    </div>
  );
}
