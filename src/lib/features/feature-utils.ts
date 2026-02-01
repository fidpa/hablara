/**
 * Feature Utilities
 *
 * Getter/Setter functions for feature toggle state (isFeatureEnabled, toggleFeature).
 * Supports nested settings (psychological.*, audio.*). Uses FEATURE_REGISTRY as SSOT.
 */

import { FEATURE_REGISTRY, type FeatureDefinition } from "./feature-registry";
import type { AppSettings, PsychologicalFeatureSettings, AudioSettings } from "@/lib/types";
import { logger } from "@/lib/logger";

/**
 * Valid top-level settings keys that contain boolean feature flags.
 * Used for path validation in isFeatureEnabled().
 */
const VALID_TOP_LEVEL_KEYS: ReadonlySet<string> = new Set([
  "emotionAnalysisEnabled",
  "fallacyDetectionEnabled",
  "toneAnalysisEnabled",
  "topicClassificationEnabled",
]);

/**
 * Valid nested settings paths (parent.child format).
 * Used for path validation in isFeatureEnabled().
 */
const VALID_NESTED_PATHS: ReadonlySet<string> = new Set([
  "psychological.gfkAnalysisEnabled",
  "psychological.cognitiveDistortionEnabled",
  "psychological.fourSidesAnalysisEnabled",
  "audio.playStartStopSounds",
]);

/**
 * Validates if a settings path is known and supported.
 *
 * @param settingsPath - The path to validate (e.g., "emotionAnalysisEnabled" or "psychological.gfkAnalysisEnabled")
 * @returns true if the path is valid
 */
function isValidSettingsPath(settingsPath: string): boolean {
  if (VALID_TOP_LEVEL_KEYS.has(settingsPath)) return true;
  if (VALID_NESTED_PATHS.has(settingsPath)) return true;
  return false;
}

/**
 * Checks if a feature is enabled in the current settings.
 * Supports nested paths like "psychological.gfkAnalysisEnabled".
 *
 * @param featureId - The feature ID from FEATURE_REGISTRY
 * @param settings - Current application settings
 * @returns true if feature is enabled, false if disabled or feature not found
 *
 * @example
 * isFeatureEnabled("emotion_analysis", settings) // checks emotionAnalysisEnabled
 * isFeatureEnabled("gfk_analysis", settings) // checks psychological.gfkAnalysisEnabled
 */
export function isFeatureEnabled(featureId: string, settings: AppSettings): boolean {
  const feature = FEATURE_REGISTRY[featureId];
  if (!feature) {
    logger.warn("FeatureUtils", `Unknown feature ID: ${featureId}`);
    return false;
  }

  const { settingsPath } = feature;

  // Runtime validation
  if (!isValidSettingsPath(settingsPath)) {
    logger.warn("FeatureUtils", `Invalid settings path: ${settingsPath} for feature ${featureId}`);
    return false;
  }

  const path = settingsPath.split(".");

  // Handle top-level boolean keys
  if (path.length === 1) {
    const key = path[0] as keyof AppSettings;
    return Boolean(settings[key]);
  }

  // Handle nested paths (e.g., psychological.gfkAnalysisEnabled)
  if (path.length === 2) {
    const parent = path[0] as string;
    const nestedKey = path[1] as string;
    const parentValue = settings[parent as keyof AppSettings];

    if (typeof parentValue === "object" && parentValue !== null && !Array.isArray(parentValue)) {
      return Boolean((parentValue as unknown as Record<string, unknown>)[nestedKey]);
    }
  }

  return false;
}

/**
 * Checks if all dependencies for a feature are satisfied.
 *
 * @param featureId - The feature ID to check dependencies for
 * @param settings - Current application settings
 * @returns true if all required features are enabled, or if feature has no dependencies
 */
export function areDependenciesMet(featureId: string, settings: AppSettings): boolean {
  const feature = FEATURE_REGISTRY[featureId];
  if (!feature?.requires) return true;

  return feature.requires.every((depId) => isFeatureEnabled(depId, settings));
}

/**
 * Gets features that depend on a given feature (reverse dependency lookup).
 *
 * @param featureId - The feature ID to find dependents for
 * @returns Array of feature IDs that require this feature
 */
export function getDependentFeatures(featureId: string): string[] {
  return Object.values(FEATURE_REGISTRY)
    .filter((f) => f.requires?.includes(featureId))
    .map((f) => f.id);
}

/**
 * Groups all features by their category.
 *
 * @returns Map of category names to arrays of feature definitions
 */
export function getFeaturesByCategory(): Map<string, FeatureDefinition[]> {
  const grouped = new Map<string, FeatureDefinition[]>();

  for (const feature of Object.values(FEATURE_REGISTRY)) {
    const existing = grouped.get(feature.category) || [];
    grouped.set(feature.category, [...existing, feature]);
  }

  return grouped;
}

/**
 * Updates a feature setting via its path (immutable).
 * Supports top-level keys and nested paths up to 2 levels.
 *
 * @param settings - Current application settings
 * @param settingsPath - Path to the setting (e.g., "emotionAnalysisEnabled" or "psychological.gfkAnalysisEnabled")
 * @param value - The new boolean value
 * @returns Updated settings object (new reference)
 *
 * @example
 * updateFeatureSetting(settings, "emotionAnalysisEnabled", false)
 * updateFeatureSetting(settings, "psychological.gfkAnalysisEnabled", true)
 */
export function updateFeatureSetting(
  settings: AppSettings,
  settingsPath: string,
  value: boolean
): AppSettings {
  // Runtime validation
  if (!isValidSettingsPath(settingsPath)) {
    logger.warn("FeatureUtils", `Cannot update invalid settings path: ${settingsPath}`);
    return settings;
  }

  const path = settingsPath.split(".");

  // Handle top-level boolean keys
  if (path.length === 1) {
    const key = path[0] as keyof AppSettings;
    return { ...settings, [key]: value };
  }

  // Handle nested paths (2 levels only)
  if (path.length === 2) {
    const parent = path[0];
    const nestedKey = path[1] as string;

    if (parent === "psychological") {
      return {
        ...settings,
        psychological: {
          ...settings.psychological,
          [nestedKey]: value,
        } as PsychologicalFeatureSettings,
      };
    }

    if (parent === "audio") {
      return {
        ...settings,
        audio: {
          ...settings.audio,
          [nestedKey]: value,
        } as AudioSettings,
      };
    }
  }

  // Unsupported path depth
  logger.warn("FeatureUtils", `Unsupported path depth for: ${settingsPath}`);
  return settings;
}
