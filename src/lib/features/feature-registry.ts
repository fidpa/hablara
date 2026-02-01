/**
 * Feature Registry - Zentrale Feature-Definitionen
 *
 * Single Source of Truth für alle Features. 4 Kategorien (Analysis, Psychological, Audio, Storage),
 * 7 Features mit Badges (Neu/Beta/LLM). Nutzt für Collapsible Settings-UI.
 */

// Feature Kategorien
export type FeatureCategory = "analysis" | "psychological" | "storage";

// Feature Badge Types
export type FeatureBadgeType = "new" | "beta" | "llm";

// Feature Definition
export interface FeatureDefinition {
  id: string;
  name: string; // German label
  description: string; // German description
  category: FeatureCategory;
  settingsPath: string; // Path in AppSettings (e.g., "emotionAnalysisEnabled")
  defaultEnabled: boolean;
  badges?: FeatureBadgeType[];
  requires?: string[]; // Feature IDs that must be enabled
  processingStepId?: string; // Maps to PROCESSING_STEPS_REGISTRY
  estimatedLatencyMs?: number;
}

// Zentrale Registry
export const FEATURE_REGISTRY: Record<string, FeatureDefinition> = {
  // === ANALYSE-FEATURES ===
  emotion_analysis: {
    id: "emotion_analysis",
    name: "Emotionsanalyse",
    description: "Dual-Track Emotionserkennung (40% Audio + 60% Text) mit 10 Typen",
    category: "analysis",
    settingsPath: "emotionAnalysisEnabled",
    defaultEnabled: true,
    processingStepId: "textEmotion",
    estimatedLatencyMs: 1500,
  },
  fallacy_detection: {
    id: "fallacy_detection",
    name: "Fehlschluss-Erkennung",
    description: "Identifiziert 16 logische Fehlschlüsse in Argumentationen",
    category: "analysis",
    settingsPath: "fallacyDetectionEnabled",
    defaultEnabled: true,
    badges: ["llm"],
    processingStepId: "fallacyDetection",
    estimatedLatencyMs: 2500,
  },
  tone_analysis: {
    id: "tone_analysis",
    name: "Ton-Analyse",
    description: "5-dimensionaler Kommunikationsstil (Formalität, Direktheit, Energie)",
    category: "analysis",
    settingsPath: "toneAnalysisEnabled",
    defaultEnabled: true,
    badges: ["llm"],
    processingStepId: "toneAnalysis",
    estimatedLatencyMs: 2000,
  },
  topic_classification: {
    id: "topic_classification",
    name: "Themen-Klassifikation",
    description: "Kategorisiert Aufnahmen in 7 Voice-Journal-Kategorien",
    category: "analysis",
    settingsPath: "topicClassificationEnabled",
    defaultEnabled: true,
    badges: ["llm"],
    processingStepId: "topicClassification",
    estimatedLatencyMs: 1500,
  },

  // === PSYCHOLOGISCHE FEATURES (Surface → Deep Progression) ===
  four_sides_model: {
    id: "four_sides_model",
    name: "Vier-Seiten-Modell",
    description: "Schulz von Thun: Sachinhalt, Selbstoffenbarung, Beziehung, Appell",
    category: "psychological",
    settingsPath: "psychological.fourSidesAnalysisEnabled",
    defaultEnabled: true,
    badges: ["llm"],
    processingStepId: "fourSidesAnalysis",
    estimatedLatencyMs: 2000,
  },
  gfk_analysis: {
    id: "gfk_analysis",
    name: "GFK-Analyse",
    description: "Gewaltfreie Kommunikation: Beobachtungen, Gefühle, Bedürfnisse, Bitten",
    category: "psychological",
    settingsPath: "psychological.gfkAnalysisEnabled",
    defaultEnabled: true,
    badges: ["llm", "new"],
    processingStepId: "gfkAnalysis",
    estimatedLatencyMs: 2000,
  },
  cognitive_distortions: {
    id: "cognitive_distortions",
    name: "Kognitive Verzerrungen",
    description: "Erkennt Denkmuster wie Katastrophisieren, Schwarz-Weiß-Denken (CBT-basiert)",
    category: "psychological",
    settingsPath: "psychological.cognitiveDistortionEnabled",
    defaultEnabled: true,
    badges: ["llm"],
    processingStepId: "cognitiveDistortions",
    estimatedLatencyMs: 2000,
  },
};

// Kategorie-Metadaten für UI
export const CATEGORY_INFO: Record<
  FeatureCategory,
  {
    name: string;
    description: string;
    icon: string;
    order: number;
  }
> = {
  analysis: {
    name: "Kern-Analysen",
    description: "KI-gestützte Analyse deiner Spracheingaben",
    icon: "Sparkles",
    order: 1,
  },
  psychological: {
    name: "Psychologische Insights",
    description: "Erweiterte psychologisch-informierte Analysen (Selbstreflexion)",
    icon: "Brain",
    order: 2,
  },
  storage: {
    name: "Speicher",
    description: "Persistente Speicherung",
    icon: "HardDrive",
    order: 4,
  },
};
