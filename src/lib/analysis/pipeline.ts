/**
 * Analysis Pipeline
 *
 * Zentrale Analyse-Engine für Text + Audio. Koordiniert Emotion Detection
 * (Dual-Track Fusion), Fallacy Analysis (CEG-Prompting), Tone Analysis,
 * psychologische Enrichments (GFK, CBT, Vier-Seiten), Topic Classification.
 * Nutzt LLM Clients (Ollama/OpenAI/Anthropic) für semantische Analyse.
 */

import type {
  EmotionState,
  AudioFeatures,
  AnalysisResult,
  ToneResult,
  ToneState,
  LLMConfig,
  TopicResult,
  GFKAnalysis,
  CognitiveDistortionResult,
  FourSidesAnalysis,
  AppSettings,
  AnalysisStatus,
} from "../types";
import { DEFAULT_SETTINGS } from "../types";
import { getLLMClient, type LLMClient } from "../llm";
import { buildAnalysisPromises } from "./promise-builder";
import { extractAnalysisResults } from "./result-extractor";
import { logFailedAnalyses, handleTopicClassification, buildAnalysisStatus } from "./status-helpers";
import { fuseEmotions, fuseTones } from "./fusion";
import { analyzeAudioEmotion } from "./audio-emotion";
import { shouldAnalyzeFallacies, type AnalysisOptions, type UnifiedAnalysisOptions } from "./types";

// Full analysis pipeline
export class AnalysisPipeline {
  private llm: LLMClient;
  private settings: AppSettings;
  public lastAudioEmotion: EmotionState = {
    primary: "neutral",
    confidence: 0,
    audioFeatures: null,
  };

  constructor(llmConfig?: LLMConfig, settings?: AppSettings) {
    this.llm = getLLMClient(llmConfig);
    this.settings = settings || DEFAULT_SETTINGS;
  }

  public lastAudioTone: ToneResult = {
    formality: 3,
    professionalism: 3,
    directness: 3,
    energy: 3,
    seriousness: 3,
    confidence: 0,
  };

  /**
   * Process audio features for real-time emotion detection.
   * Uses legacy 3-feature rule-based detection. Updates lastAudioEmotion for fusion.
   * @param features - Audio features (pitch, energy, speech rate)
   * @returns Emotion state with confidence
   * @deprecated Use Rust V2 analyze_audio_from_wav (12 features, 93% accuracy)
   */
  processAudioFeatures(features: AudioFeatures): EmotionState {
    this.lastAudioEmotion = analyzeAudioEmotion(features);
    return this.lastAudioEmotion;
  }

  /**
   * Reset audio emotion to neutral state.
   * Call before text-only analysis to clear stale audio data.
   */
  resetAudioEmotion(): void {
    this.lastAudioEmotion = {
      primary: "neutral",
      confidence: 0,
      audioFeatures: null,
    };
  }

  /**
   * Analyze text with emotion and fallacy detection.
   * Includes: Emotion (dual-track fusion), Fallacies (6 types), Topic (7 categories).
   * Excludes tone, GFK, cognitive, four-sides. Use analyzeTextFull() for full analysis.
   * @param text - Text to analyze (min 40 chars for fallacies)
   * @param options - Analysis configuration
   * @returns Emotion, fallacy analysis, optional topic
   */
  async analyzeText(
    text: string,
    options: AnalysisOptions = {}
  ): Promise<{
    emotion: EmotionState;
    analysis: AnalysisResult;
    topic?: TopicResult;
  }> {
    const result = await this._analyzeTextUnified(text, {
      ...options,
      includeTone: false,
      includeGFK: false,
      includeCognitive: false,
      includeFourSides: false,
    });

    return {
      emotion: result.emotion,
      analysis: result.analysis,
      topic: result.topic,
    };
  }

  /**
   * Analyze text with emotion, fallacies, and optional tone.
   * Adds tone analysis (5 dimensions) with dual-track fusion.
   * Excludes GFK, cognitive, four-sides. Use analyzeTextFull() for full analysis.
   * @param text - Text to analyze
   * @param options - Config with toneEnabled flag
   * @returns Emotion, fallacies, optional tone and topic
   */
  async analyzeTextWithTone(
    text: string,
    options: AnalysisOptions & { toneEnabled?: boolean } = {}
  ): Promise<{
    emotion: EmotionState;
    analysis: AnalysisResult;
    tone?: ToneState;
    topic?: TopicResult;
  }> {
    const result = await this._analyzeTextUnified(text, {
      ...options,
      includeTone: options.toneEnabled,
      includeGFK: false,
      includeCognitive: false,
      includeFourSides: false,
    });

    return {
      emotion: result.emotion,
      analysis: result.analysis,
      tone: result.tone,
      topic: result.topic,
    };
  }

  /**
   * Full analysis with all psychologically-informed enrichments.
   * Includes: Emotion (10 types), Fallacies (6), Tone (5 dims), GFK (Rosenberg),
   * Cognitive Distortions (Beck, 7 types), Four Sides (Schulz von Thun), Topic (7).
   * All optional via feature flags. Failed analyses return undefined (graceful degradation).
   * @param text - Text to analyze
   * @param options - Full config with all feature flags
   * @returns Complete results with analysisStatus
   */
  async analyzeTextFull(
    text: string,
    options: AnalysisOptions & {
      toneEnabled?: boolean;
    } = {}
  ): Promise<{
    emotion: EmotionState;
    analysis: AnalysisResult;
    tone?: ToneState;
    topic?: TopicResult;
    gfk?: GFKAnalysis;
    cognitive?: CognitiveDistortionResult;
    fourSides?: FourSidesAnalysis;
    analysisStatus: AnalysisStatus;
  }> {
    return this._analyzeTextUnified(text, {
      ...options,
      includeTone: options.toneEnabled,
      includeGFK: options.gfkAnalysisEnabled,
      includeCognitive: options.cognitiveDistortionEnabled,
      includeFourSides: options.fourSidesAnalysisEnabled,
    });
  }

  /**
   * Quick text-only emotion check with fusion.
   * Lightweight detection without fallacies, tone, or psychological enrichments.
   * Fuses LLM text emotion with cached audio emotion. Use for real-time updates.
   * @param text - Text to analyze
   * @returns Fused emotion state
   */
  async quickEmotionCheck(text: string): Promise<EmotionState> {
    const textEmotion = await this.llm.analyzeEmotion(text);
    return fuseEmotions(
      this.lastAudioEmotion,
      textEmotion,
      this.settings.audio.emotionDetectionMode
    );
  }

  // ============================================================================
  // Private Unified Analysis Implementation
  // ============================================================================

  private async _analyzeTextUnified(
    text: string,
    options: UnifiedAnalysisOptions = {}
  ): Promise<{
    emotion: EmotionState;
    analysis: AnalysisResult;
    tone?: ToneState;
    topic?: TopicResult;
    gfk?: GFKAnalysis;
    cognitive?: CognitiveDistortionResult;
    fourSides?: FourSidesAnalysis;
    analysisStatus: AnalysisStatus;
  }> {
    const {
      emotionAnalysisEnabled = true,
      fallacyDetectionEnabled = true,
      topicClassificationEnabled = true,
      includeTone = false,
      includeGFK = false,
      includeCognitive = false,
      includeFourSides = false,
      abortSignal,
      onProcessingStepUpdate,
    } = options;

    const shouldCheckFallacies =
      fallacyDetectionEnabled && shouldAnalyzeFallacies(text);

    const analyses = buildAnalysisPromises(this.llm, text, {
      emotionAnalysisEnabled,
      shouldCheckFallacies,
      includeTone,
      includeGFK,
      includeCognitive,
      includeFourSides,
      abortSignal,
    });

    const results = await Promise.allSettled(analyses);

    const {
      textEmotion,
      fallacyAnalysis,
      textTone,
      gfkResult,
      cognitiveResult,
      fourSidesResult,
    } = extractAnalysisResults(results);

    logFailedAnalyses(results, {
      emotionAnalysisEnabled,
      shouldCheckFallacies,
      includeTone,
      includeGFK,
      includeCognitive,
      includeFourSides,
      onProcessingStepUpdate,
    });

    const topicResult = await handleTopicClassification(this.llm, text, {
      topicClassificationEnabled,
      onProcessingStepUpdate,
      abortSignal,
    });

    const fusedEmotion = fuseEmotions(
      this.lastAudioEmotion,
      textEmotion,
      this.settings.audio.emotionDetectionMode
    );

    const fusedTone = textTone
      ? fuseTones(
          this.lastAudioTone,
          textTone,
          this.settings.audio.emotionDetectionMode
        )
      : undefined;

    const analysisStatus = buildAnalysisStatus(results, {
      emotionAnalysisEnabled,
      shouldCheckFallacies,
      includeTone,
      includeGFK,
      includeCognitive,
      includeFourSides,
      topicResult,
      topicClassificationEnabled,
    });

    return {
      emotion: fusedEmotion,
      analysis: fallacyAnalysis,
      tone: fusedTone,
      topic: topicResult,
      gfk: gfkResult,
      cognitive: cognitiveResult,
      fourSides: fourSidesResult,
      analysisStatus,
    };
  }
}