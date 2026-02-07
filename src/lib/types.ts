// TypeScript Type Definitions Entry Point
// Guidelines: docs/reference/guidelines/TYPESCRIPT.md

/**
 * Application version constant.
 * Single source of truth for version display across the app.
 * Must be kept in sync with package.json version.
 */
export const APP_VERSION = "1.1.3" as const;

/**
 * Application developer information.
 * Single source of truth for developer attribution.
 */
export const APP_DEVELOPER = "Dipl.-Psych. Marc Allgeier" as const;

/**
 * Emotion types supported by the dual-track analysis system.
 * 10 types based on Plutchik's emotion wheel and Russell's circumplex model.
 */
export type EmotionType =
  | "neutral"
  | "calm"
  | "stress"
  | "excitement"
  | "uncertainty"
  | "frustration"
  | "joy"
  | "doubt"
  | "conviction"
  | "aggression";

export type InputSource = "recording" | "text" | "file" | "audio-file";

export interface AudioFeatures {
  // Legacy features (3)
  pitch: number;
  energy: number;
  speechRate: number;
  mfcc: number[];

  // Prosodic features (5)
  pitchVariance: number;
  pitchRange: number;
  energyVariance: number;
  pauseDurationAvg: number;
  pauseFrequency: number;

  // Spectral features (4)
  zcrMean: number;
  spectralCentroid: number;
  spectralRolloff: number;
  spectralFlux: number;
}

// Rust V2 Emotion Result (from analyze_audio_from_wav)
export interface EmotionResultFromRust {
  primary: EmotionType;
  confidence: number;
  secondary: EmotionType | null;
  features: { pitch: number; energy: number; speech_rate: number } | null;
}

export interface SecondaryEmotionInfo {
  type: EmotionType;
  confidence: number;
  source: "audio" | "text" | "conflict";
  blendRatio?: number;  // 0.0 - 0.5 (percentage of secondary in blend)
}

export interface EmotionState {
  primary: EmotionType;
  confidence: number;
  audioFeatures: AudioFeatures | null;
  secondary?: EmotionType;
  secondaryInfo?: SecondaryEmotionInfo;
  markers?: string[];
  blendedCoordinates?: {  // Blended valence/arousal position (Russell's Circumplex)
    valence: number;  // -1 (negative) to 1 (positive)
    arousal: number;  // 0 (deactivated) to 1 (activated)
  };
}

/**
 * Logical fallacy types detected by CEG (Chain of Evidence Gathering) prompting.
 * Tier 1: Core 6 fallacies. Tier 2: High voice-relevance additions (16 total).
 */
export type FallacyType =
  // Tier 1 (Kern-6)
  | "ad_hominem"
  | "straw_man"
  | "false_dichotomy"
  | "appeal_authority"
  | "circular_reasoning"
  | "slippery_slope"
  // Tier 2 (High Voice-Relevance)
  | "red_herring"
  | "tu_quoque"
  | "hasty_generalization"
  | "post_hoc"
  | "bandwagon"
  | "appeal_emotion"
  | "appeal_ignorance"
  | "loaded_question"
  | "no_true_scotsman"
  | "false_cause";

export interface Fallacy {
  type: FallacyType;
  confidence: number;
  quote: string;
  explanation: string;
  suggestion: string;
  startIndex: number;
  endIndex: number;
}

/** Voice journal topic categories for content classification (7 types). */
export type TopicType =
  | "work_career"
  | "health_wellbeing"
  | "relationships_social"
  | "finances"
  | "personal_development"
  | "creativity_hobbies"
  | "other";

export interface TopicResult {
  topic: TopicType;
  confidence: number;
  keywords?: string[];
}

export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: number;
  emotion: EmotionState;
  fallacies: Fallacy[];
  enrichment?: string;
}

export interface AnalysisResult {
  fallacies: Fallacy[];
  enrichment: string;
  summary?: string;
}

export type WhisperProvider = "whisper-cpp" | "mlx-whisper";
export type MlxWhisperModel = "german-turbo" | (string & {}); // Allow dynamic model IDs while keeping known ones for autocomplete

export interface MlxWhisperPaths {
  pythonPath: string; // Path to Python interpreter in venv
  modelsDir: string; // Directory containing MLX models
}

/** MLX model metadata from backend runtime discovery */
export interface MlxModelInfo {
  id: string;
  displayName: string;
  directory: string;
  sizeEstimate: string | null;
  description: string | null;
}

export type LLMProvider = "ollama" | "openai" | "anthropic";

export type LLMProviderStatus = "checking" | "online" | "offline" | "no-key" | "model-missing";

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  baseUrl?: string;
  apiKey?: string;
  useMlx?: boolean; // Use MLX acceleration for 3-4x performance boost
}

// Cloud Provider Consent (GDPR Compliance)
export interface CloudProviderConsent {
  provider: "openai" | "anthropic";
  agreed: boolean;
  timestamp: string; // ISO 8601 timestamp
  version: string; // Consent version for future updates
}

export interface AppSettings {
  hotkey: string;
  llm: LLMConfig;
  whisperModel: "tiny" | "base" | "small" | "medium" | "large" | "german-turbo";
  whisperProvider: WhisperProvider;
  mlxWhisperModel: MlxWhisperModel;
  mlxPaths: MlxWhisperPaths;
  language: string;
  emotionAnalysisEnabled: boolean;
  fallacyDetectionEnabled: boolean;
  toneAnalysisEnabled: boolean;
  topicClassificationEnabled: boolean;
  storage: StorageSettings;
  psychological: PsychologicalFeatureSettings;
  audio: AudioSettings;
  limits: InputLimits;
  cloudConsent: CloudProviderConsent[]; // GDPR consent tracking
}

// Default MLX paths (uses ~ expansion on backend)
export const DEFAULT_MLX_PATHS: MlxWhisperPaths = {
  pythonPath: "~/.venvs/mlx-whisper/bin/python",
  modelsDir: "~/mlx-whisper",
};

export interface AudioValidationMeta {
  rmsEnergy: number;
  durationMs: number;
  sampleCount: number;
  passed: boolean;
}

export interface VadStatsMeta {
  originalSamples: number;
  filteredSamples: number;
  speechRatio: number;
  framesProcessed: number;
  speechFrames: number;
}

/** Metadata from transcription process (provider, model, timings) */
export interface TranscriptionMeta {
  text: string;
  provider: string;
  model: string;
  language: string;
  processingTimeMs: number;
}

/** Metadata from text filtering (filler word removal, hallucination detection) */
export interface TextFilterMeta {
  originalText: string;
  filteredText: string;
  fillerWordsRemoved: number;
  hallucinationsDetected: boolean;
}

/** Fallacy data stored with recording */
export interface FallacyData {
  type: FallacyType;
  confidence: number;
  quote: string;
  explanation: string;
  suggestion: string;
}

/** Analysis result stored with recording (emotion + fallacies + enrichment + topic) */
export interface AnalysisResultData {
  emotion?: {
    primary: EmotionType;
    confidence: number;
    secondary?: EmotionType;
  };
  fallacies: FallacyData[];
  enrichment: string;
  topic?: {
    topic: TopicType;
    confidence: number;
    keywords?: string[];
  };
}

export interface RecordingMetadata {
  id: string;
  createdAt: string;
  durationMs: number;
  sampleRate: number;
  fileSize: number;
  audioValidation: AudioValidationMeta;
  vadStats: VadStatsMeta | null;
  transcription: TranscriptionMeta | null;
  textFilter: TextFilterMeta | null;
  provider: string;
  model: string;
  appVersion: string;

  // Input source (recording/text/file) - optional for backward compatibility
  source?: InputSource;

  // Emotion analysis result (optional, added when recording is analyzed)
  emotion?: {
    primary: EmotionType;
    confidence: number;
    secondary?: EmotionType;
  };

  // Full analysis result (emotion + fallacies + enrichment)
  analysisResult?: AnalysisResultData;

  // Tone analysis result (5-dimensional communication style)
  tone?: ToneResult;

  // Psychological Enrichment Results
  gfk?: GFKAnalysis;
  cognitive?: CognitiveDistortionResult;
  fourSides?: FourSidesAnalysis;

  // Analysis Status Tracking (P1-4: LLM Error Fallback UX)
  analysisStatus?: AnalysisStatus;
}

/**
 * Analysis Status Value - Ternary status for LLM analyses (P1-4)
 * - success: Analysis completed successfully
 * - failed: Analysis failed (LLM timeout, network error, etc.)
 * - skipped: Analysis disabled by user settings
 */
export type AnalysisStatusValue = "success" | "failed" | "skipped";

/**
 * Analysis Status - Tracks success/failure/skipped for all 7 LLM analyses (P1-4)
 *
 * Used in RecordingMetadata to show warning banner when partial failures occur.
 * This enables users to see which specific analyses failed without losing successful results.
 *
 * @example Pure success (all analyses succeeded)
 * const status: AnalysisStatus = {
 *   emotion: "success",
 *   fallacy: "success",
 *   tone: "success",
 *   gfk: "success",
 *   cognitive: "success",
 *   fourSides: "success",
 *   topic: "success",
 * };
 * hasPartialFailure(status); // false
 *
 * @example Partial failure (mixed results)
 * const status: AnalysisStatus = {
 *   emotion: "success",
 *   fallacy: "failed", // LLM timeout
 *   tone: "success",
 *   gfk: "skipped", // User disabled
 *   cognitive: "success",
 *   fourSides: "skipped",
 *   topic: "success",
 * };
 * hasPartialFailure(status); // true (has both success and failed)
 *
 * @example Pure skipped (all features disabled)
 * const status: AnalysisStatus = {
 *   emotion: "skipped",
 *   fallacy: "skipped",
 *   tone: "skipped",
 *   gfk: "skipped",
 *   cognitive: "skipped",
 *   fourSides: "skipped",
 *   topic: "skipped",
 * };
 * hasPartialFailure(status); // false (no success + failed mix)
 */
export interface AnalysisStatus {
  emotion: AnalysisStatusValue;
  fallacy: AnalysisStatusValue;
  tone: AnalysisStatusValue;
  gfk: AnalysisStatusValue;
  cognitive: AnalysisStatusValue;
  fourSides: AnalysisStatusValue;
  topic: AnalysisStatusValue;
}

/**
 * Check if analysis has partial failure (some success, some failed).
 *
 * Returns true only when there are BOTH success AND failed statuses present.
 * Returns false for:
 * - Pure success (all features succeeded)
 * - Pure failure (all features failed)
 * - Pure skipped (all features disabled)
 * - Mixed success/skipped (no failures)
 *
 * @param status - Analysis status object (optional)
 * @returns true if partial failure detected, false otherwise
 *
 * @example
 * hasPartialFailure({ emotion: "success", fallacy: "failed", ...rest }); // true
 * hasPartialFailure({ emotion: "success", fallacy: "success", ...rest }); // false
 * hasPartialFailure({ emotion: "skipped", fallacy: "skipped", ...rest }); // false
 * hasPartialFailure(undefined); // false
 */
export function hasPartialFailure(status?: AnalysisStatus): boolean {
  if (!status) return false;
  const values = Object.values(status);
  const hasSuccess = values.includes("success");
  const hasFailed = values.includes("failed");
  return hasSuccess && hasFailed;
}

export interface StorageConfig {
  storageEnabled: boolean;
  userModeEnabled: boolean;
  maxRecordings: number;
  maxUserStorageMb: number;
  storagePath: string;
}

export interface StorageStats {
  recordingCount: number;
  totalSizeBytes: number;
  totalDurationMs: number;
  storagePath: string;
  maxRecordings: number;
}

export interface StorageSettings {
  storageEnabled: boolean;
  userModeEnabled: boolean;
  maxRecordings: number;
  maxUserStorageMb: number;
}

export const DEFAULT_STORAGE_SETTINGS: StorageSettings = {
  storageEnabled: true,
  userModeEnabled: false,
  maxRecordings: 100,
  maxUserStorageMb: 500,
};

// New type for baseline result
export interface BaselineResult {
  emotion: EmotionType;
  confidence: number;
  sampleCount: number;
}

// Psychological Feature Settings (needed before DEFAULT_SETTINGS)
export interface PsychologicalFeatureSettings {
  gfkAnalysisEnabled: boolean;
  cognitiveLoadEnabled: boolean;
  dimensionalEmotionEnabled: boolean;
  cognitiveDistortionEnabled: boolean;
  fourSidesAnalysisEnabled: boolean;
  reflexionNudgesEnabled: boolean;
}

export const DEFAULT_PSYCHOLOGICAL_SETTINGS: PsychologicalFeatureSettings = {
  gfkAnalysisEnabled: true, // GFK analysis (Rosenberg) - production ready
  cognitiveLoadEnabled: false,
  dimensionalEmotionEnabled: true, // Low-risk, default on
  cognitiveDistortionEnabled: true, // Production-ready
  fourSidesAnalysisEnabled: true, // Production-ready
  reflexionNudgesEnabled: false,
};

// Emotion Detection Mode
// Outcome-oriented presets for Dual-Track Emotion/Tone Analysis
//
// Design Rationale for Weights (60/40 instead of 80/20):
// 1. Dual-Track Philosophy: Both audio AND text provide complementary information
// 2. Research-Based: Stays close to 40/60 baseline (Poria et al., 2017)
// 3. Tone Compatibility: 60/40 works for both Emotion and Tone analysis
// 4. Edge Case Handling: Avoids false negatives when text contradicts audio
// 5. Symmetry: Voice-Focus (60/40) is inverse of Balanced (40/60)
//
// For detailed rationale, see:
// docs/explanation/implementation-logs/PHASE_27_EMOTION_DETECTION_MODE.md
// Section 5: Weight Rationale
export type EmotionDetectionMode = "balanced" | "voice-focus" | "content-focus";

/**
 * Emotion Detection Mode Information
 *
 * Defines outcome-oriented presets for Dual-Track Emotion/Tone Analysis.
 *
 * Weight Rationale:
 * - balanced (40/60): Research-optimized baseline (Poria et al., 2017)
 * - voice-focus (60/40): Moderate audio emphasis, preserves text context
 * - content-focus (20/80): Strong text emphasis for text-import use-cases
 *
 * Why 60/40 instead of 80/20 for voice-focus?
 * - Preserves dual-track philosophy (both audio AND text contribute)
 * - Works for both Emotion (audio-strong) and Tone (text-strong) analysis
 * - Avoids false negatives when text explicitly contradicts audio
 * - Stays within ±20% of validated baseline for accuracy preservation
 *
 * @see docs/explanation/implementation-logs/PHASE_27_EMOTION_DETECTION_MODE.md
 */
export const EMOTION_DETECTION_MODE_INFO: Record<
  EmotionDetectionMode,
  { name: string; description: string; audioWeight: number; icon: string }
> = {
  balanced: {
    name: "Ausgewogen",
    description: "Audio + Text gleichmäßig (40/60)",
    audioWeight: 0.4,
    icon: "Scale",
  },
  "voice-focus": {
    name: "Stimmbetonung",
    description: "Fokus auf Tonfall (60/40)",
    audioWeight: 0.6,
    icon: "Mic",
  },
  "content-focus": {
    name: "Inhaltsfokus",
    description: "Fokus auf Wortwahl (20/80)",
    audioWeight: 0.2,
    icon: "FileText",
  },
};

/**
 * Get audio weight for given emotion detection mode.
 * @param mode - The emotion detection mode
 * @returns Audio weight (0.0 - 1.0)
 */
export function getAudioWeightForMode(mode: EmotionDetectionMode): number {
  return EMOTION_DETECTION_MODE_INFO[mode].audioWeight;
}

/**
 * Get text weight for given emotion detection mode.
 * @param mode - The emotion detection mode
 * @returns Text weight (0.0 - 1.0), derived as 1 - audioWeight
 */
export function getTextWeightForMode(mode: EmotionDetectionMode): number {
  return 1 - getAudioWeightForMode(mode);
}

// Audio Settings (Recording Sounds, etc.)
export interface AudioSettings {
  playStartStopSounds: boolean;
  soundVolume: number; // 0.0 - 1.0
  emotionDetectionMode: EmotionDetectionMode; // Audio/text weight balance
  bringToFrontOnHotkey: boolean; // Bring window to front when hotkey pressed (Tauri only)
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  playStartStopSounds: false, // Default: off (privacy-friendly)
  soundVolume: 0.5,
  emotionDetectionMode: "balanced", // Research-optimized default (Audio 40% / Text 60%)
  bringToFrontOnHotkey: true, // Default: on (competitive parity with Everlast AI)
};

// Input Limits (P1 + P2 Feature)
export interface InputLimits {
  // Text import limits
  maxTextCharacters: number; // Max characters for textarea/clipboard (default: 100k)
  maxTextFileSizeMB: number; // Max file size for .txt/.md files (default: 10 MB)

  // Audio import limits
  maxAudioFileSizeMB: number; // Max file size for audio files (default: 50 MB)

  // Recording limits
  maxRecordingMinutes: number; // Max recording duration (default: 30 minutes)
}

export const DEFAULT_INPUT_LIMITS: InputLimits = {
  maxTextCharacters: 100000, // 100k chars ≈ 50 pages
  maxTextFileSizeMB: 10, // 10 MB text file
  maxAudioFileSizeMB: 50, // 50 MB audio file
  maxRecordingMinutes: 30, // 30 minutes recording
};

/**
 * Error Boundary Types
 * React Error Boundaries for component-level error isolation.
 *
 * @see docs/explanation/architecture/ERROR_BOUNDARIES.md
 */
export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  name?: string; // Logging context (e.g., "ChatHistory")
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Emotion Analysis Thresholds
 * Centralized configuration for emotion detection and blending.
 */
export const EMOTION_THRESHOLDS = {
  // Emotion Blending
  BLEND_CONFIDENCE_MIN: 0.4, // Minimum secondary confidence for blending (below this: no blend)
  BLEND_RATIO_MAX: 0.5, // Cap blend ratio at 50% to preserve primary dominance
  BOOST_CONFIDENCE: 0.1, // Confidence boost when audio and text emotions match
  DEFAULT_CONFIDENCE: 0.5, // Fallback confidence when text emotion is undefined

  // Tone Fusion
  TONE_AGREEMENT_BOOST_PER_DIM: 0.02, // +2% confidence per matching dimension (max +10% for 5 dims)

  // Legacy Audio Analysis (Deprecated - Remove after V2 full migration to Rust)
  // These thresholds are for analyzeAudioEmotion() (3-feature fallback)
  LEGACY_ENERGY_HIGH: 0.6, // Energy threshold for high-energy emotions (stress, excitement)
  LEGACY_ENERGY_LOW: 0.25, // Energy threshold for low-energy emotions (calm)
  LEGACY_PITCH_HIGH: 180, // Pitch (Hz) threshold for high-pitch emotions (stress, excitement)
  LEGACY_PITCH_MEDIUM: 140, // Pitch (Hz) threshold for medium-pitch emotions (uncertainty)
  LEGACY_SPEECH_RATE_HIGH: 1.2, // Speech rate threshold for fast speech (excitement)
  LEGACY_SPEECH_RATE_LOW: 0.8, // Speech rate threshold for slow speech (calm)
  LEGACY_SPEECH_RATE_VERY_LOW: 0.7, // Speech rate threshold for very slow speech (uncertainty)
  LEGACY_CONFIDENCE_STRESS: 0.65, // Confidence for detected stress
  LEGACY_CONFIDENCE_EXCITEMENT: 0.7, // Confidence for detected excitement
  LEGACY_CONFIDENCE_CALM: 0.6, // Confidence for detected calm
  LEGACY_CONFIDENCE_UNCERTAINTY: 0.55, // Confidence for detected uncertainty
} as const;

// Storage keys for localStorage
export const STORAGE_KEYS = {
  SETTINGS: "hablara-settings",
  OLD_SETTINGS: "vip-settings", // For migration from old key
  TOUR_COMPLETED: "hablara-tour-completed", // For onboarding tour
  SETUP_HINTS_SEEN: "hablara-setup-hints-seen", // Setup hints modal state
  ZOOM_LEVEL: "hablara-zoom-level", // Persistent zoom level
  PERMISSIONS_GRANTED: "hablara-permissions-granted", // For permission onboarding
  // WINDOW_STATE removed - now uses Tauri filesystem persistence (window_state.json)
} as const;

// Window state interface for persistence
export interface WindowState {
  width: number;
  height: number;
  x: number;
  y: number;
  maximized: boolean;
}

// Window state constants (using `as const` for type safety per TYPESCRIPT.md)
export const DEFAULT_WINDOW_STATE: WindowState = {
  width: 1280,
  height: 1440,
  x: -1, // -1 = center on screen (Tauri default)
  y: -1,
  maximized: false,
} as const;

export const MIN_WINDOW_WIDTH = 1024 as const;
export const MIN_WINDOW_HEIGHT = 768 as const;
export const MAX_WINDOW_WIDTH = 3840 as const;
export const MAX_WINDOW_HEIGHT = 2160 as const;

// Default storage path (macOS)
export const DEFAULT_STORAGE_PATH = "~/Library/Application Support/Hablara/recordings/";

// Default settings
export const DEFAULT_SETTINGS: AppSettings = {
  hotkey: "Control+Shift+D",
  llm: {
    provider: "ollama",
    model: "qwen2.5:7b-custom", // Custom-optimized Qwen 2.5 7B (see docs/how-to/LLM_SETUP.md)
    baseUrl: "http://127.0.0.1:11434",
    useMlx: false, // Ollama Default (persistent server, 2-4s). MLX optional für Power-User (siehe ADR-019)
  },
  whisperModel: "german-turbo",
  whisperProvider: "whisper-cpp",
  mlxWhisperModel: "german-turbo",
  mlxPaths: DEFAULT_MLX_PATHS,
  language: "de",
  emotionAnalysisEnabled: true,
  fallacyDetectionEnabled: true,
  toneAnalysisEnabled: true,
  topicClassificationEnabled: true,
  storage: DEFAULT_STORAGE_SETTINGS,
  psychological: DEFAULT_PSYCHOLOGICAL_SETTINGS,
  audio: DEFAULT_AUDIO_SETTINGS,
  limits: DEFAULT_INPUT_LIMITS,
  cloudConsent: [], // GDPR consent tracking (empty by default)
};

// Fallacy display info (colors reference CSS variables from globals.css)
// Note: Latin terms (Ad Hominem, Tu Quoque, Post Hoc) are preserved as internationally recognized terminology
export const FALLACY_INFO: Record<FallacyType, { name: string; color: string; description: string }> = {
  // Tier 1 (Kern-6)
  ad_hominem: {
    name: "Ad Hominem",
    color: "var(--color-fallacy-ad-hominem)",
    description: "Angriff auf die Person statt auf das Argument",
  },
  straw_man: {
    name: "Strohmann",
    color: "var(--color-fallacy-straw-man)",
    description: "Verzerrung der Gegenposition",
  },
  false_dichotomy: {
    name: "Falsche Dichotomie",
    color: "var(--color-fallacy-false-dichotomy)",
    description: "Entweder-Oder ohne Alternativen",
  },
  appeal_authority: {
    name: "Autoritätsargument",
    color: "var(--color-fallacy-appeal-authority)",
    description: "Unberechtigter Verweis auf Autorität",
  },
  circular_reasoning: {
    name: "Zirkelschluss",
    color: "var(--color-fallacy-circular)",
    description: "Die Aussage begründet sich selbst",
  },
  slippery_slope: {
    name: "Dammbruchargument",
    color: "var(--color-fallacy-slippery-slope)",
    description: "Übertriebene Kausalitätskette",
  },
  // Tier 2 (High Voice-Relevance)
  red_herring: {
    name: "Ablenkungsmanöver",
    color: "var(--color-fallacy-red-herring)",
    description: "Ablenkung vom eigentlichen Thema",
  },
  tu_quoque: {
    name: "Tu Quoque",
    color: "var(--color-fallacy-tu-quoque)",
    description: "Du auch - Hypocrisy als Gegenargument",
  },
  hasty_generalization: {
    name: "Übergeneralisierung",
    color: "var(--color-fallacy-hasty-generalization)",
    description: "Generalisierung aus unzureichender Stichprobe",
  },
  post_hoc: {
    name: "Post Hoc",
    color: "var(--color-fallacy-post-hoc)",
    description: "Nach dem, also wegen dem - zeitliche Abfolge ≠ Kausalität",
  },
  bandwagon: {
    name: "Mitläufereffekt",
    color: "var(--color-fallacy-bandwagon)",
    description: "Alle machen es, also ist es richtig",
  },
  appeal_emotion: {
    name: "Appell an Gefühle",
    color: "var(--color-fallacy-appeal-emotion)",
    description: "Emotionale Manipulation statt logischer Argumente",
  },
  appeal_ignorance: {
    name: "Appell an Unwissenheit",
    color: "var(--color-fallacy-appeal-ignorance)",
    description: "Nicht bewiesen falsch = wahr",
  },
  loaded_question: {
    name: "Suggestivfrage",
    color: "var(--color-fallacy-loaded-question)",
    description: "Suggestivfrage mit kontroversen Vorannahmen",
  },
  no_true_scotsman: {
    name: "Kein wahrer Schotte",
    color: "var(--color-fallacy-no-true-scotsman)",
    description: "Ad-hoc Neudefinition zur Ausschluss von Gegenbeispielen",
  },
  false_cause: {
    name: "Falsche Kausalität",
    color: "var(--color-fallacy-false-cause)",
    description: "Falsche Kausalattribution - Korrelation ≠ Kausalität",
  },
};

// Cognitive distortion display info
export const COGNITIVE_DISTORTION_INFO: Record<
  CognitiveDistortionType,
  { name: string; color: string; description: string }
> = {
  catastrophizing: {
    name: "Katastrophisieren",
    color: "var(--color-distortion-catastrophizing)",
    description: "Schlimmstes ohne Evidenz annehmen",
  },
  all_or_nothing: {
    name: "Schwarz-Weiß-Denken",
    color: "var(--color-distortion-all-or-nothing)",
    description: "Extreme ohne Graustufen",
  },
  overgeneralization: {
    name: "Übergeneralisierung",
    color: "var(--color-distortion-overgeneralization)",
    description: "Einzelfall verallgemeinern",
  },
  mind_reading: {
    name: "Gedankenlesen",
    color: "var(--color-distortion-mind-reading)",
    description: "Gedanken anderer ohne Beleg",
  },
  personalization: {
    name: "Personalisierung",
    color: "var(--color-distortion-personalization)",
    description: "Alles auf sich beziehen",
  },
  emotional_reasoning: {
    name: "Emotionales Schlussfolgern",
    color: "var(--color-distortion-emotional-reasoning)",
    description: "Gefühl als Faktenbeweis",
  },
  should_statements: {
    name: "Sollte-Aussagen",
    color: "var(--color-distortion-should-statements)",
    description: "Unrealistische Regeln an sich selbst",
  },
};

// Topic classification display info
export const TOPIC_INFO: Record<TopicType, { name: string; color: string; icon: string }> = {
  work_career: { name: "Arbeit/Karriere", color: "var(--color-topic-work-career)", icon: "briefcase" },
  health_wellbeing: { name: "Gesundheit", color: "var(--color-topic-health-wellbeing)", icon: "heart" },
  relationships_social: { name: "Beziehungen", color: "var(--color-topic-relationships-social)", icon: "users" },
  finances: { name: "Finanzen", color: "var(--color-topic-finances)", icon: "dollar-sign" },
  personal_development: { name: "Entwicklung", color: "var(--color-topic-personal-development)", icon: "trending-up" },
  creativity_hobbies: { name: "Kreativität", color: "var(--color-topic-creativity-hobbies)", icon: "palette" },
  other: { name: "Sonstiges", color: "var(--color-topic-other)", icon: "more-horizontal" },
};

// ============================================
// Welcome State Constants (P1-2: Chat Welcome State)
// Reference: Pre-Mortem Fixes - Chat Discoverability
// ============================================

/** Sample prompts for chat welcome state - discoverable examples for first-time users */
export const WELCOME_PROMPTS = [
  "Was genau bedeuten die Emotionen?",
  "Wie funktioniert die Fehlschluss-Erkennung?",
  "Welche Analysefunktionen gibt es?",
] as const;

// ============================================
// Tone Analysis Types (5-Dimensional Communication Style)
// Reference: docs/explanation/decisions/ADR-013-tone-analysis.md
// ============================================

// Tone analysis result with 5 dimensions (1-5 scale)
export interface ToneResult {
  formality: number;       // 1=casual, 5=formal
  professionalism: number; // 1=personal, 5=professional
  directness: number;      // 1=indirect, 5=direct
  energy: number;          // 1=calm, 5=energetic
  seriousness: number;     // 1=light, 5=serious
  confidence: number;      // 0.0-1.0 (overall confidence)
}

// Tone state with source tracking (audio/text/fused)
export interface ToneState extends ToneResult {
  source: "audio" | "text" | "fused";
}

// Tone dimension display info
export const TONE_DIMENSIONS = {
  formality: {
    name: "Formalität",
    lowLabel: "Locker",
    highLabel: "Formell",
    color: "var(--color-tone-formality)",
    description: "Grad der Förmlichkeit in der Kommunikation"
  },
  professionalism: {
    name: "Professionalität",
    lowLabel: "Persönlich",
    highLabel: "Professionell",
    color: "var(--color-tone-professionalism)",
    description: "Grad der beruflichen Distanz"
  },
  directness: {
    name: "Direktheit",
    lowLabel: "Indirekt",
    highLabel: "Direkt",
    color: "var(--color-tone-directness)",
    description: "Wie direkt die Botschaft kommuniziert wird"
  },
  energy: {
    name: "Energie",
    lowLabel: "Ruhig",
    highLabel: "Energisch",
    color: "var(--color-tone-energy)",
    description: "Energieniveau der Kommunikation"
  },
  seriousness: {
    name: "Ernsthaftigkeit",
    lowLabel: "Leicht",
    highLabel: "Ernst",
    color: "var(--color-tone-seriousness)",
    description: "Wie ernst oder spielerisch der Ton ist"
  },
} as const;

export type ToneDimension = keyof typeof TONE_DIMENSIONS;

// ============================================
// Psychological Enrichment Types (NEW)
// Reference: docs/reports/PSYCHOLOGICAL_ENRICHMENT.md
// ============================================

// GFK (Gewaltfreie Kommunikation / Nonviolent Communication) Analysis
export interface GFKAnalysis {
  observations: string[];
  feelings: string[];
  needs: string[];
  requests: string[];
  gfkTranslation: string;
  reflectionQuestion: string;
}

/**
 * @deprecated Use GFKAnalysis (Gewaltfreie Kommunikation) - the German term
 */
export type NVCAnalysis = GFKAnalysis;

// Cognitive Load Detection
export type CognitiveLoadLevel = "low" | "medium" | "high";

export interface CognitiveLoadState {
  level: CognitiveLoadLevel;
  confidence: number;
  indicators: string[];
}

export interface CognitiveLoadFeatures {
  pauseFrequency: number;
  fillerWordRatio: number;
  speechRateVariance: number;
  pitchVariance: number;
}

// Dimensional Emotion (Russell's Circumplex Model)
export interface DimensionalEmotion {
  valence: number; // -1 (negative) to 1 (positive)
  arousal: number; // 0 (deactivated) to 1 (activated)
  dominance?: number; // optional: 0 to 1
}

// Cognitive Distortion Detection
export type CognitiveDistortionType =
  | "catastrophizing"
  | "all_or_nothing"
  | "overgeneralization"
  | "mind_reading"
  | "personalization"
  | "emotional_reasoning"
  | "should_statements";

export interface CognitiveDistortion {
  type: CognitiveDistortionType;
  quote: string;
  explanation: string;
  reframe: string;
}

export interface CognitiveDistortionResult {
  distortions: CognitiveDistortion[];
  overallThinkingStyle: "balanced" | "somewhat_distorted" | "highly_distorted";
}

// Four-Sides Model (Schulz von Thun)
export interface FourSidesAnalysis {
  sachinhalt: string;
  selbstoffenbarung: string;
  beziehung: string;
  appell: string;
  potentielleMissverstaendnisse: string[];
}

// Emotion to Dimensional Coordinates Mapping
export const EMOTION_COORDINATES: Record<EmotionType, DimensionalEmotion> = {
  joy: { valence: 0.9, arousal: 0.7 },
  excitement: { valence: 0.7, arousal: 0.9 },
  calm: { valence: 0.6, arousal: 0.2 },
  conviction: { valence: 0.4, arousal: 0.6 },
  neutral: { valence: 0.0, arousal: 0.5 },
  uncertainty: { valence: -0.2, arousal: 0.4 },
  doubt: { valence: -0.3, arousal: 0.5 },
  frustration: { valence: -0.6, arousal: 0.7 },
  stress: { valence: -0.5, arousal: 0.8 },
  aggression: { valence: -0.8, arousal: 0.9 },
};

// Cognitive Load Level Display Info
export const COGNITIVE_LOAD_INFO: Record<
  CognitiveLoadLevel,
  { name: string; color: string; description: string }
> = {
  low: {
    name: "Niedrig",
    color: "var(--color-emotion-calm)",
    description: "Entspannte kognitive Belastung",
  },
  medium: {
    name: "Mittel",
    color: "var(--color-emotion-uncertainty)",
    description: "Moderate kognitive Belastung",
  },
  high: {
    name: "Hoch",
    color: "var(--color-emotion-stress)",
    description: "Hohe kognitive Belastung erkannt",
  },
};

// ============================================
// End Psychological Enrichment Types
// ============================================

// Emotion display info (colors reference CSS variables from globals.css)
export const EMOTION_INFO: Record<EmotionType, { name: string; color: string }> = {
  neutral: { name: "Neutral", color: "var(--color-emotion-neutral)" },
  calm: { name: "Ruhig", color: "var(--color-emotion-calm)" },
  stress: { name: "Stress", color: "var(--color-emotion-stress)" },
  excitement: { name: "Aufregung", color: "var(--color-emotion-excitement)" },
  uncertainty: { name: "Unsicherheit", color: "var(--color-emotion-uncertainty)" },
  frustration: { name: "Frustration", color: "var(--color-emotion-frustration)" },
  joy: { name: "Freude", color: "var(--color-emotion-joy)" },
  doubt: { name: "Zweifel", color: "var(--color-emotion-doubt)" },
  conviction: { name: "Überzeugung", color: "var(--color-emotion-conviction)" },
  aggression: { name: "Aggression", color: "var(--color-emotion-aggression)" },
};

// ============================================
// Chat History Types
// ============================================

export type ChatMessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: Date;
  // Message source (voice recording, text input, RAG chatbot answer)
  source?: "voice" | "text" | "rag";
  // Only for user messages
  transcriptSegmentId?: string;
  audioFeatures?: AudioFeatures;
  // Only for assistant messages
  analysisSourceId?: string;
  // Psychological Enrichment Results (attached to assistant messages)
  gfk?: GFKAnalysis;
  cognitive?: CognitiveDistortionResult;
  fourSides?: FourSidesAnalysis;
  // Processing duration (ms) - Optional for backward compatibility
  processingDurationMs?: number;
}

// ============================================
// End Chat History Types
// ============================================

// ============================================
// Processing Progress Types (Multi-Step UI)
// Reference: docs/explanation/decisions/ADR-011-multi-step-progress.md
// ============================================

// Processing Step Status
export type ProcessingStepStatus = "pending" | "active" | "completed" | "error" | "skipped";

// Settings Panel Save State
export type SaveState = "idle" | "saving" | "success" | "error";

// Processing Step Definition
export interface ProcessingStep {
  id: string;
  label: string;
  labelActive?: string;
  estimatedMs: number;
  actualMs?: number;
  status: ProcessingStepStatus;
  errorMessage?: string;
  startedAt?: number;
  completedAt?: number;
}

// Full Processing State
export interface ProcessingState {
  isProcessing: boolean;
  /** True while showing completion checkmarks after processing finished */
  isShowingCompletion: boolean;
  /** True when processing was cancelled (explicit cancel action) */
  isCancelled: boolean;
  steps: ProcessingStep[];
  currentStepId: string | null;
  startedAt: number | null;
}

// Steps Registry Definition (base for creating steps)
export interface StepDefinition {
  id: string;
  label: string;
  labelActive?: string;
  estimatedMs: number;
}

/**
 * Processing steps registry for multi-step UI progress tracking.
 * Extensible for future enrichments (coaching feedback, etc.).
 * Used by useProcessingState hook to create step definitions.
 */
export const PROCESSING_STEPS_REGISTRY: Record<string, StepDefinition> = {
  transcription: {
    id: "transcription",
    label: "Transkription",
    labelActive: "Transkribiere...",
    estimatedMs: 1000,
  },
  audioEmotion: {
    id: "audioEmotion",
    label: "Audio-Emotion",
    labelActive: "Erkenne Stimmung...",
    estimatedMs: 10,
  },
  textEmotion: {
    id: "textEmotion",
    label: "Text-Emotion",
    labelActive: "Deute Gefühle...",
    estimatedMs: 1500,
  },
  fallacyDetection: {
    id: "fallacyDetection",
    label: "Fehlschluss-Erkennung",
    labelActive: "Prüfe Argumente...",
    estimatedMs: 2500,
  },
  toneAnalysis: {
    id: "toneAnalysis",
    label: "Ton-Analyse",
    labelActive: "Bewerte Tonfall...",
    estimatedMs: 2000,
    // Mobile UX: shortened 40 → 18 chars (-55%)
  },
  textImport: {
    id: "textImport",
    label: "Text-Import",
    labelActive: "Importiere Text...",
    estimatedMs: 100,
  },
  audioFileImport: {
    id: "audioFileImport",
    label: "Audio-Import",
    labelActive: "Lade Audio-Datei...",
    estimatedMs: 500,
  },
  chatSummary: {
    id: "chatSummary",
    label: "Chat-Zusammenfassung",
    labelActive: "Erstelle Antwort...",
    estimatedMs: 2500,
  },
  topicClassification: {
    id: "topicClassification",
    label: "Themen-Klassifikation",
    labelActive: "Klassifiziere Thema...",
    estimatedMs: 1800,
  },
  gfkAnalysis: {
    id: "gfkAnalysis",
    label: "GFK-Analyse",
    labelActive: "Übersetze in GFK...",
    estimatedMs: 2000,
  },
  cognitiveDistortions: {
    id: "cognitiveDistortions",
    label: "Denkverzerrungen",
    labelActive: "Finde Denkfehler...",
    estimatedMs: 2000,
  },
  fourSidesAnalysis: {
    id: "fourSidesAnalysis",
    label: "Vier-Seiten-Modell",
    labelActive: "Zerlege Botschaft...",
    estimatedMs: 2000,
  },
  // Future enrichments can be added here:
  // coachingFeedback: { id: "coachingFeedback", label: "Coaching-Feedback", labelActive: "Generiere Feedback...", estimatedMs: 2000 },
};

// Window state persistence timing constants
export const WINDOW_STATE_TIMINGS = {
  /** Debounce delay for auto-save on resize/move events (ms) */
  debounceDelayMs: 500,
} as const;

// Processing UI Timings (P1-3: Cancel State UX, P2-3: Hotkey Flash, P0-3: Concurrent Recording Guard)
export const PROCESSING_UI_TIMINGS = {
  /** Delay before retry button appears after cancellation (ms) */
  retryButtonDelayMs: 1000,
  /** Delay before auto-cleanup of cancelled state (ms) */
  autoCleanupDelayMs: 3000,
  /** Duration of hotkey flash animation (ms) - P2-3 */
  hotkeyFlashDurationMs: 300,
  /** Debounce interval for recording hotkey to prevent rapid double-triggers (ms) - P0-3 */
  hotkeyDebounceMs: 300,
} as const;

/**
 * Tauri Window Focus Workaround Timings
 *
 * These values work around known Tauri/macOS bugs with window focus-stealing.
 * @see https://github.com/tauri-apps/tauri/issues/2061
 * @see https://github.com/tauri-apps/tauri/issues/12834
 */
export const TAURI_FOCUS_TIMINGS = {
  /**
   * Delay between unminimize() and setFocus() calls (ms)
   *
   * Required workaround for Tauri 2.3+ bug where setFocus() fails
   * if called immediately after show()/unminimize() on macOS.
   *
   * @see https://github.com/tauri-apps/tauri/issues/2061
   */
  focusDelayMs: 50,
} as const;

// Onboarding Flow Timings
export const ONBOARDING_TIMINGS = {
  /** Delay before showing setup hints modal for first-time users (ms) */
  setupHintsDelayMs: 1000,
  /** Delay before auto-starting tour for returning users (ms) */
  tourStartDelayMs: 1500,
  /** Transition delay between modal close and tour start (ms) */
  modalToTourTransitionMs: 500,
  /** Duration to show "copied" feedback after copying setup command (ms) */
  copyFeedbackResetMs: 2000,
} as const;

// Permission Onboarding Timings
export const PERMISSION_TIMINGS = {
  /** Delay before showing permission onboarding screen (ms) */
  checkDelayMs: 500,
  /** Delay after permission denial before allowing retry (ms) */
  retryDelayMs: 1000,
} as const;

// Settings Panel Timings
export const SETTINGS_UI_TIMINGS = {
  /** Duration to show success feedback after save (ms) */
  saveSuccessFeedbackMs: 2000,
  /** Duration before auto-resetting error state (ms) */
  saveErrorResetMs: 5000,
} as const;

// Microphone Permission Status Type
export type MicrophonePermissionStatus =
  | "authorized"
  | "denied"
  | "not_determined"
  | "checking";

// LLM Timeout Configuration (Provider-Specific)
export const DEFAULT_LLM_TIMEOUTS: Record<LLMProvider, number> = {
  ollama: 120000, // 120s for local inference (CPU-only with 7B+ models needs >60s, especially with queued parallel analyses)
  openai: 30000, // 30s for cloud API (predictable latency)
  anthropic: 30000, // 30s for cloud API (predictable latency)
} as const;

// LLM Health Check & Special Timeouts
export const LLM_HEALTH_CHECK_TIMEOUT = 5000; // 5s for cloud provider availability checks
export const LLM_LOCAL_HEALTH_CHECK_TIMEOUT = 5000; // 5s for Ollama /api/tags check (increased from 2s for Windows IPv6 DNS fallback)
export const MLX_INVOKE_TIMEOUT = 30000; // 30s for MLX subprocess calls (MLX is faster than Ollama CPU inference)

// ============================================
// End Processing Progress Types
// ============================================
