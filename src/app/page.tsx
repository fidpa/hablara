"use client";

/**
 * Home - Hauptseite der Hablará Voice Intelligence Platform
 *
 * Zentrale UI-Komponente die alle Features orchestriert: Audio-Aufnahme,
 * Transkription, Emotion/Fallacy/Tone Analysis, Chat-Verlauf, Settings,
 * Recordings-Library. Verwaltet globalen State und koordiniert alle Child-Components.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import AudioRecorder from "@/components/AudioRecorder";
import TextImportPanel from "@/components/TextImportPanel";
import { AudioFileImportPanel } from "@/components/AudioFileImportPanel";
import { ChatHistory } from "@/components/ChatHistory";
import EmotionIndicator from "@/components/EmotionIndicator";
import { SegmentLevelMeter } from "@/components/SegmentLevelMeter";
import { SettingsPanel } from "@/components/settings";
import { RecordingsLibrary } from "@/components/RecordingsLibrary";
import { useHotkey } from "@/hooks/useHotkey";
import { useTextImport } from "@/hooks/useTextImport";
import { useAudioFileImport } from "@/hooks/useAudioFileImport";
import { useTauri } from "@/hooks/useTauri";
import { useToast } from "@/hooks/use-toast";
import { useProcessingState } from "@/hooks/useProcessingState";
import { useWindowState } from "@/hooks/useWindowState";
import { Toaster } from "@/components/ui/toaster";
import { OnboardingTour } from "@/components/tour/OnboardingTour";
import { SetupHintsModal } from "@/components/SetupHintsModal";
import { PermissionOnboarding } from "@/components/PermissionOnboarding";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PersonalizedFeedbackPanel } from "@/components/PersonalizedFeedbackPanel";
import { ToneIndicator } from "@/components/ToneIndicator";
import { WindowSizeLogger } from "@/components/WindowSizeLogger";
import type { TranscriptSegment, EmotionState, AnalysisResult, AppSettings, ToneState, InputSource, ChatMessage, TopicResult, GFKAnalysis, CognitiveDistortionResult, FourSidesAnalysis } from "@/lib/types";
import { DEFAULT_SETTINGS, PROCESSING_UI_TIMINGS, ONBOARDING_TIMINGS, PERMISSION_TIMINGS, STORAGE_KEYS } from "@/lib/types";
import { Settings, Mic, MicOff, AlertCircle, Folder, FileText, Headphones } from "lucide-react";
import { logger } from "@/lib/logger";
import { cn, formatTimestamp } from "@/lib/utils";
import { storeApiKey, getApiKey } from "@/lib/secure-storage";
import { getLLMClient, type LLMError } from "@/lib/llm";
import { executeRAGQuery } from "@/lib/rag";
import { showLLMErrorToast } from "@/lib/ui/toast-utils";

export default function Home(): JSX.Element {
  const [isRecording, setIsRecording] = useState(false);
  const [inputMode, setInputMode] = useState<"recording" | "text" | "audio-file">("recording");
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionState>({
    primary: "neutral",
    confidence: 0,
    audioFeatures: null,
  });
  const [currentTone, setCurrentTone] = useState<ToneState>({
    formality: 3,
    professionalism: 3,
    directness: 3,
    energy: 3,
    seriousness: 3,
    confidence: 0,
    source: "fused",
  });
  const [_currentTopic, setCurrentTopic] = useState<TopicResult | null>(null);
  const [_analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [_currentGFK, setCurrentGFK] = useState<GFKAnalysis | null>(null);
  const [_currentCognitive, setCurrentCognitive] = useState<CognitiveDistortionResult | null>(null);
  const [_currentFourSides, setCurrentFourSides] = useState<FourSidesAnalysis | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showRecordings, setShowRecordings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isHotkeyTriggered, setIsHotkeyTriggered] = useState(false);
  const [lastInputMode, setLastInputMode] = useState<
    "audio" | "text" | "audioFile" | null
  >(null);
  const [lastRecordingId, setLastRecordingId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isRAGLoading, setIsRAGLoading] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showSetupHints, setShowSetupHints] = useState(false);
  const [showTour, setShowTour] = useState(false);

  const { isTauri, isReady: _isReady, bringToFront } = useTauri();
  const { toast } = useToast();
  const processing = useProcessingState();
  const windowState = useWindowState();
  const [srAnnouncement, setSrAnnouncement] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const tourDelayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastHotkeyTimeRef = useRef<number>(0); // Debounce recording hotkey

  // Ref for stable chat history access in RAG callbacks (prevents stale closure)
  const chatHistoryRef = useRef(chatHistory);
  chatHistoryRef.current = chatHistory;

  // Ref for RAG loading state to prevent parallel requests
  const isRAGLoadingRef = useRef(false);

  // LLM Error Handler - shows toast when LLM calls fail (P0)
  const handleLLMError = useCallback((error: LLMError) => {
    logger.warn('LLMError', `${error.provider} error in ${error.method}`, {
      type: error.type,
      message: error.message,
    });
    showLLMErrorToast(toast, error);
  }, [toast]);

  // Play recording sound if enabled (Web Audio API - no files required)
  const playSound = useCallback((type: "start" | "stop") => {
    // Early return if sounds disabled
    if (!appSettings.audio?.playStartStopSounds) {
      return;
    }

    // Dynamic import to avoid SSR issues
    import("@/lib/audio-feedback")
      .then(({ playRecordingSound }) => {
        const volume = appSettings.audio.soundVolume || 0.5;
        return playRecordingSound(type, volume);
      })
      .catch((err) => {
        // Warn if feature enabled but fails (helps debugging)
        // Silent to user (no toast), but logged for developer awareness
        logger.warn("Audio", `Failed to play ${type} sound (feature enabled)`, err);
      });
  }, [appSettings.audio]);

  // Load settings from localStorage with migration from old "vip-settings" key
  useEffect(() => {
    const loadSettings = async () => {
      // Try new key first
      let stored = localStorage.getItem("hablara-settings");

      // Migrate from old "vip-settings" key if new key doesn't exist
      if (!stored) {
        const oldStored = localStorage.getItem("vip-settings");
        if (oldStored) {
          stored = oldStored;
          // Remove old key after successful migration
          localStorage.removeItem("vip-settings");
        }
      }

      let merged = DEFAULT_SETTINGS;

      if (stored) {
        try {
          const parsed = JSON.parse(stored);

          // Merge with defaults to ensure new fields exist
          merged = {
            ...DEFAULT_SETTINGS,
            ...parsed,
            // Ensure mlxPaths exists
            mlxPaths: parsed.mlxPaths || DEFAULT_SETTINGS.mlxPaths,
            // Ensure storage exists with proper defaults
            storage: {
              ...DEFAULT_SETTINGS.storage,
              ...parsed.storage,
            },
            // Ensure psychological settings exist with proper defaults
            psychological: {
              ...DEFAULT_SETTINGS.psychological,
              ...parsed.psychological,
            },
            // Ensure audio settings exist with proper defaults
            audio: {
              ...DEFAULT_SETTINGS.audio,
              ...parsed.audio,
            },
          };

          // Model migration: Replace deprecated Anthropic models with current ones
          if (merged.llm.provider === "anthropic") {
            const deprecatedModels: Record<string, string> = {
              "claude-3-5-sonnet-20241022": "claude-sonnet-4-20250514",
              "claude-3-opus-20240229": "claude-opus-4-20250514",
            };
            const currentModel = merged.llm.model;
            if (currentModel && deprecatedModels[currentModel]) {
              merged = {
                ...merged,
                llm: { ...merged.llm, model: deprecatedModels[currentModel] },
              };
              logger.info("Migration", `Anthropic model migrated: ${currentModel} → ${deprecatedModels[currentModel]}`);
            }
          }

          // One-time migration: localStorage apiKey → Keyring
          if (parsed.llm?.apiKey) {
            const provider = parsed.llm.provider;
            if (provider === "openai" || provider === "anthropic") {
              // Type assertion safe: we checked provider is openai or anthropic
              const cloudProvider = provider as "openai" | "anthropic";

              // Check if key already exists in keyring (idempotent)
              const existing = await getApiKey(cloudProvider);
              if (!existing) {
                await storeApiKey(cloudProvider, parsed.llm.apiKey);
                logger.info("Migration", `API key migrated to Keyring for ${provider}`);
              }
            }
          }
        } catch (error: unknown) {
          logger.error("Settings", "Failed to parse settings", error);
          // Use defaults
        }
      }

      // Load API key from Keyring (authoritative source for cloud providers)
      if (merged.llm.provider === "openai" || merged.llm.provider === "anthropic") {
        // Type assertion safe: we checked provider is openai or anthropic
        const cloudProvider = merged.llm.provider as "openai" | "anthropic";
        const key = await getApiKey(cloudProvider);
        if (key) {
          merged = { ...merged, llm: { ...merged.llm, apiKey: key } };
        }
      }

      setAppSettings(merged);

      // Write back WITHOUT apiKey (Keyring is authoritative for cloud providers)
      localStorage.setItem("hablara-settings", JSON.stringify({
        ...merged,
        llm: { ...merged.llm, apiKey: undefined },
      }));
    };

    loadSettings();
  }, []);

  // Log window state availability (debug only)
  useEffect(() => {
    if (windowState.isAvailable) {
      logger.debug("App", "Window state persistence enabled");
    }
  }, [windowState.isAvailable]);

  // Pre-load embedding model if Semantic RAG is enabled (prevents 20s latency on first query)
  useEffect(() => {
    const preloadModel = async () => {
      // Only pre-load if Semantic RAG is enabled (build-time env var)
      const isSemanticEnabled = process.env.NEXT_PUBLIC_ENABLE_SEMANTIC_RAG === "true";

      if (!isSemanticEnabled) {
        logger.debug("ModelPreload", "Semantic RAG disabled, skipping model pre-load");
        return;
      }

      try {
        setIsModelLoading(true);
        logger.info("ModelPreload", "Pre-loading embedding model in background...");

        // Dynamically import embeddings module (browser-only)
        const { initEmbedder } = await import("@/lib/rag/embeddings");

        // Pre-load model (downloads ~50MB on first run, then cached in IndexedDB)
        await initEmbedder();

        logger.info("ModelPreload", "Model pre-loaded successfully");
      } catch (error: unknown) {
        // Non-critical error: Model will be loaded on first query instead
        logger.warn("ModelPreload", "Model pre-load failed (will load on first query)", error);
      } finally {
        setIsModelLoading(false);
      }
    };

    // Run pre-load after a short delay to avoid blocking UI initialization
    const timeoutId = setTimeout(() => {
      preloadModel();
    }, 1000); // 1s delay to let UI settle

    return () => clearTimeout(timeoutId);
  }, []);

  // Keyboard shortcuts: Escape to close Settings panel (H1: Ref pattern for stable dependency)
  useEffect(() => {
    const showSettingsRef = { current: showSettings };
    showSettingsRef.current = showSettings;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showSettingsRef.current) {
        setShowSettings(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSettings]);

  // First-time detection: Permission onboarding → Setup hints modal → Tour
  useEffect(() => {
    // SSR safety check
    if (typeof window === "undefined") return;

    try {
      const permissionsGranted = localStorage.getItem(STORAGE_KEYS.PERMISSIONS_GRANTED);
      const setupHintsSeen = localStorage.getItem(STORAGE_KEYS.SETUP_HINTS_SEEN);
      const tourCompleted = localStorage.getItem(STORAGE_KEYS.TOUR_COMPLETED);

      // Stage 0: Permission onboarding (before everything)
      if (permissionsGranted !== "true") {
        const timer = setTimeout(() => {
          setShowPermissions(true);
        }, PERMISSION_TIMINGS.checkDelayMs);
        return () => clearTimeout(timer);
      }
      // Stage 1: Setup hints
      else if (setupHintsSeen !== "true") {
        // Fresh user (permissions granted) → Show modal after delay
        const timer = setTimeout(() => {
          setShowSetupHints(true);
        }, ONBOARDING_TIMINGS.setupHintsDelayMs);
        return () => clearTimeout(timer);
      }
      // Stage 2: Tour
      else if (tourCompleted !== "true") {
        // Returning user (setup hints seen, but tour not completed)
        // Direct tour after delay
        const timer = setTimeout(() => {
          setShowTour(true);
        }, ONBOARDING_TIMINGS.tourStartDelayMs);
        return () => clearTimeout(timer);
      }
    } catch (error) {
      logger.error("Home", "localStorage check failed", error);
    }
  }, []);

  // Permission onboarding complete handler
  const handlePermissionsComplete = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PERMISSIONS_GRANTED, "true");
    } catch (error) {
      logger.error("Home", "Failed to save permissions granted flag", error);
    }
    setShowPermissions(false);

    // Continue to Stage 1: Setup Hints
    setTimeout(() => {
      setShowSetupHints(true);
    }, ONBOARDING_TIMINGS.setupHintsDelayMs);
  }, []);

  // Permission onboarding skip handler (hidden "Später" link)
  const handlePermissionsSkip = useCallback(() => {
    // CRITICAL: Do NOT set localStorage flag - screen will appear again on next launch
    setShowPermissions(false);
    logger.info("Home", "Permission onboarding skipped by user");

    // Continue to Stage 1: Setup Hints anyway (graceful degradation)
    setTimeout(() => {
      setShowSetupHints(true);
    }, ONBOARDING_TIMINGS.setupHintsDelayMs);
  }, []);

  // Setup hints close handler
  const handleSetupHintsClose = useCallback((startTour: boolean) => {
    setShowSetupHints(false);

    if (startTour) {
      // Clear any existing timer
      if (tourDelayTimerRef.current) {
        clearTimeout(tourDelayTimerRef.current);
      }

      // Delay before starting tour (smooth transition)
      tourDelayTimerRef.current = setTimeout(() => {
        setShowTour(true);
        tourDelayTimerRef.current = null;
      }, ONBOARDING_TIMINGS.modalToTourTransitionMs);
    }
  }, []);

  // Restart setup hints handler (called from Settings)
  const handleRestartSetupHints = useCallback(() => {
    setShowTour(false); // Close tour if running
    setShowSetupHints(true);
  }, []);

  // Cleanup tour delay timer on unmount
  useEffect(() => {
    return () => {
      if (tourDelayTimerRef.current) {
        clearTimeout(tourDelayTimerRef.current);
      }
    };
  }, []);

  // Toggle recording
  const toggleRecording = useCallback((fromHotkey?: boolean) => {
    // Hotkey feedback: Set flash state (P2-3)
    if (fromHotkey) {
      setIsHotkeyTriggered(true);

      // Bring window to front if enabled (fire-and-forget, non-blocking)
      if (appSettings.audio?.bringToFrontOnHotkey) {
        bringToFront(); // Graceful degradation: recording continues even if focus fails
      }
    } else {
      // Button click: ensure no flash animation
      setIsHotkeyTriggered(false);
    }

    setIsRecording((prev) => !prev);
    if (!isRecording) {
      setError(null);
      setLastInputMode("audio");
      playSound("start");
      toast({
        title: "Aufnahme gestartet",
        description: `Hotkey: ${appSettings.hotkey}`,
        duration: 2000,
      });
    } else {
      // Recording stopped - start processing steps
      setRecordingDuration(0);
      playSound("stop");

      // Create new AbortController for this processing session
      abortControllerRef.current = new AbortController();

      // Determine which steps to run based on settings (immutable pattern)
      const steps = [
        "transcription",
        "audioEmotion",
        ...(appSettings.toneAnalysisEnabled ? ["toneAnalysis"] : []),
        ...(appSettings.emotionAnalysisEnabled ? ["textEmotion"] : []),
        ...(appSettings.fallacyDetectionEnabled ? ["fallacyDetection"] : []),
        ...(appSettings.psychological.gfkAnalysisEnabled ? ["gfkAnalysis"] : []),
        ...(appSettings.psychological.cognitiveDistortionEnabled ? ["cognitiveDistortions"] : []),
        ...(appSettings.psychological.fourSidesAnalysisEnabled ? ["fourSidesAnalysis"] : []),
        ...(appSettings.topicClassificationEnabled ? ["topicClassification"] : []),
        "chatSummary", // Always the final step - generates chat response
      ];

      processing.startProcessing(steps);

      toast({
        title: "Aufnahme gestoppt",
        description: "Verarbeitung läuft...",
        duration: 2000,
      });
    }
  }, [isRecording, appSettings.hotkey, appSettings.audio, appSettings.emotionAnalysisEnabled, appSettings.fallacyDetectionEnabled, appSettings.toneAnalysisEnabled, appSettings.psychological.gfkAnalysisEnabled, appSettings.psychological.cognitiveDistortionEnabled, appSettings.psychological.fourSidesAnalysisEnabled, appSettings.topicClassificationEnabled, toast, playSound, processing, bringToFront]);

  // Register global hotkey from settings with debounce (prevents rapid double-triggers)
  useHotkey(appSettings.hotkey, () => {
    const now = Date.now();
    const timeSinceLastHotkey = now - lastHotkeyTimeRef.current;

    // Debounce: Ignore hotkey if triggered within debounce interval
    if (timeSinceLastHotkey < PROCESSING_UI_TIMINGS.hotkeyDebounceMs) {
      logger.debug('Home', 'Hotkey debounced (too fast)', { timeSinceLastHotkey });
      return;
    }

    lastHotkeyTimeRef.current = now;
    toggleRecording(true);
  });

  // Auto-reset hotkey flash after animation (P2-3)
  useEffect(() => {
    if (!isHotkeyTriggered) return;

    const timeoutId = setTimeout(() => {
      setIsHotkeyTriggered(false);
    }, PROCESSING_UI_TIMINGS.hotkeyFlashDurationMs);

    return () => clearTimeout(timeoutId);
  }, [isHotkeyTriggered]);

  // Update screen reader announcements based on app state
  useEffect(() => {
    if (isRecording) {
      setSrAnnouncement(`Aufnahme läuft. ${Math.floor(audioLevel * 100)} Prozent Audio-Level.`);
    } else if (processing.state.isProcessing) {
      // Announce current step
      const currentStep = processing.state.steps.find(s => s.status === "active");
      if (currentStep) {
        setSrAnnouncement(currentStep.labelActive || currentStep.label);
      } else {
        setSrAnnouncement("Verarbeitung läuft");
      }
    } else if (segments.length > 0) {
      const lastSegment = segments[segments.length - 1];
      if (lastSegment) {
        const text = lastSegment.text;
        setSrAnnouncement(`Transkription abgeschlossen: ${text.slice(0, 100)}${text.length > 100 ? "..." : ""}`);
      }
    } else {
      setSrAnnouncement("Bereit für Aufnahme.");
    }
  }, [isRecording, processing.state, segments, audioLevel]);

  // Auto-cleanup cancelled state after delay
  useEffect(() => {
    if (processing.state.isCancelled) {
      const timer = setTimeout(() => {
        // Clear UI state (NOT abortControllerRef!)
        processing.reset();
        setLastInputMode(null);
      }, PROCESSING_UI_TIMINGS.autoCleanupDelayMs);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processing.state.isCancelled, processing.reset]);

  // Ref to track the latest transcript text for chat summary generation
  const latestTranscriptRef = useRef<{ text: string; segmentId: string } | null>(null);

  // Handle new transcript segment - also add user message to chat
  const handleTranscript = useCallback((text: string, timestamp: number) => {
    const segmentId = crypto.randomUUID();
    const newSegment: TranscriptSegment = {
      id: segmentId,
      text,
      timestamp,
      // Emotion will be updated by the onAnalysis callback when it receives the fresh data
      emotion: { primary: "neutral", confidence: 0, audioFeatures: null },
      fallacies: [],
    };
    setSegments((prev) => [...prev, newSegment]);

    // Store for chat summary generation
    latestTranscriptRef.current = { text, segmentId };

    // Add user message to chat history
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
      transcriptSegmentId: segmentId,
      // Audio features will be updated in onAnalysis
      audioFeatures: undefined,
    };
    setChatHistory((prev) => [...prev, userMessage]);
    // Note: Processing state will be managed by AudioRecorder via onProcessingUpdate callback
  }, []);

  // Handle emotion update from audio analysis
  const handleEmotionUpdate = useCallback((emotion: EmotionState) => {
    setCurrentEmotion(emotion);
  }, []);

  // Handle tone update from audio/text analysis
  const handleToneUpdate = useCallback((tone: ToneState) => {
    setCurrentTone(tone);
  }, []);

  // Handle topic update from text classification
  const handleTopicUpdate = useCallback((topic: TopicResult) => {
    setCurrentTopic(topic);
  }, []);

  // Refs for psychological data (avoids stale closure in handleAnalysis)
  const currentGFKRef = useRef<GFKAnalysis | null>(null);
  const currentCognitiveRef = useRef<CognitiveDistortionResult | null>(null);
  const currentFourSidesRef = useRef<FourSidesAnalysis | null>(null);

  // Handle psychological enrichment updates
  const handleGFKUpdate = useCallback((gfk: GFKAnalysis) => {
    setCurrentGFK(gfk);
    currentGFKRef.current = gfk;
  }, []);

  const handleCognitiveUpdate = useCallback((cognitive: CognitiveDistortionResult) => {
    setCurrentCognitive(cognitive);
    currentCognitiveRef.current = cognitive;
  }, []);

  const handleFourSidesUpdate = useCallback((fourSides: FourSidesAnalysis) => {
    setCurrentFourSides(fourSides);
    currentFourSidesRef.current = fourSides;
  }, []);

  // Handle analysis result (fallacies, enrichment) + generate chat summary
  const handleAnalysis = useCallback(async (result: AnalysisResult, emotion: EmotionState) => {
    setAnalysisResult(result);

    // Update the last segment with the correct emotion and fallacies
    setSegments((prev) => {
      if (prev.length === 0) return prev;
      const lastSegment = prev[prev.length - 1];
      if (!lastSegment) return prev;
      const updated = [...prev];
      updated[updated.length - 1] = {
        ...lastSegment,
        emotion: emotion, // Use fresh emotion from parameter
        fallacies: result.fallacies,
      };
      return updated;
    });

    // Generate chat summary (assistant message)
    // Check if we have transcript text to summarize
    if (!latestTranscriptRef.current) return;

    const { text, segmentId } = latestTranscriptRef.current;

    try {
      // Update processing step if available
      processing.updateStep("chatSummary", "active");

      const llmClient = getLLMClient({
        config: appSettings.llm,
        onError: handleLLMError,
      });
      const summary = await llmClient.generateChatSummary(
        text,
        emotion, // Use fresh emotion from parameter
        result.fallacies
      );

      // Check if aborted after LLM call
      if (abortControllerRef.current?.signal.aborted) {
        logger.debug("ChatSummary", "Processing aborted after summary generation");
        return;
      }

      // Snapshot psychological data from refs (avoids stale closure)
      const gfkSnapshot = currentGFKRef.current ?? undefined;
      const cognitiveSnapshot = currentCognitiveRef.current ?? undefined;
      const fourSidesSnapshot = currentFourSidesRef.current ?? undefined;

      // Add assistant message to chat history
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: summary,
        timestamp: new Date(),
        analysisSourceId: segmentId,
                gfk: gfkSnapshot,
        cognitive: cognitiveSnapshot,
        fourSides: fourSidesSnapshot,
        processingDurationMs: processing.getElapsedMs(),
      };
      setChatHistory((prev) => [...prev, assistantMessage]);

      // Reset refs after consumption
      currentGFKRef.current = null;
      currentCognitiveRef.current = null;
      currentFourSidesRef.current = null;

      processing.updateStep("chatSummary", "completed");
    } catch (error: unknown) {
      logger.error("ChatSummary", "Failed to generate summary", error);
      processing.updateStep("chatSummary", "error", "Zusammenfassung fehlgeschlagen");

      // Snapshot psychological data from refs (avoids stale closure)
      const gfkSnapshot = currentGFKRef.current ?? undefined;
      const cognitiveSnapshot = currentCognitiveRef.current ?? undefined;
      const fourSidesSnapshot = currentFourSidesRef.current ?? undefined;

      // Add fallback message
      const fallbackMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `**Analyse abgeschlossen**\n\nEmotion: ${emotion.primary} (${Math.round(emotion.confidence * 100)}%)\n\n${result.fallacies.length > 0 ? `Erkannte Fehlschlüsse: ${result.fallacies.length}` : "Keine Fehlschlüsse erkannt."}`,
        timestamp: new Date(),
        analysisSourceId: segmentId,
                gfk: gfkSnapshot,
        cognitive: cognitiveSnapshot,
        fourSides: fourSidesSnapshot,
      };
      setChatHistory((prev) => [...prev, fallbackMessage]);

      // Reset refs after consumption
      currentGFKRef.current = null;
      currentCognitiveRef.current = null;
      currentFourSidesRef.current = null;
    }

    // Clear the ref
    latestTranscriptRef.current = null;
  }, [appSettings.llm, processing, handleLLMError]);

  // Handle errors
  const handleError = useCallback((err: string) => {
    setError(err);
    setIsRecording(false);
  }, []);

  // Handle recording saved - for personalized feedback
  const handleRecordingSaved = useCallback((recordingId: string) => {
    setLastRecordingId(recordingId);
  }, []);

  // Handle cancel processing
  const handleCancelProcessing = useCallback(() => {
    // Abort any ongoing fetch requests
    // Note: Don't set to null - the signal needs to stay aborted for checks in AudioRecorder
    abortControllerRef.current?.abort();

    // Update processing state
    processing.cancel();

    toast({
      title: "Verarbeitung abgebrochen",
      description: "Die Analyse wurde gestoppt.",
    });
  }, [processing, toast]);

  // Handle retry after cancellation
  const handleRetry = useCallback(() => {
    // Reset processing state
    processing.reset();

    // Create NEW AbortController (old one is aborted, cannot be reused)
    abortControllerRef.current = new AbortController();

    // Restart based on last input mode
    switch (lastInputMode) {
      case "audio":
        // Restart audio recording
        if (!isRecording) {
          toggleRecording();
        }
        break;

      case "text":
        // Re-focus text import panel (user re-submits manually)
        setTimeout(() => {
          const textInput = document.querySelector(
            'textarea[placeholder*="Text"]'
          ) as HTMLTextAreaElement;
          textInput?.focus();
        }, 100);
        break;

      case "audioFile":
        // Re-open file picker (browser security prevents auto-submit)
        setTimeout(() => {
          const fileInput = document.querySelector(
            'input[type="file"][accept*="audio"]'
          ) as HTMLInputElement;
          fileInput?.click();
        }, 100);
        break;

      default:
        logger.warn("Retry", "No last input mode available");
        break;
    }
  }, [lastInputMode, processing, isRecording, toggleRecording]);

  // Calculate enabled steps based on settings (shared by both hooks - immutable pattern)
  const getEnabledStepsForTextImport = useCallback(() => {
    return [
      "textImport",
      ...(appSettings.toneAnalysisEnabled ? ["toneAnalysis"] : []),
      ...(appSettings.emotionAnalysisEnabled ? ["textEmotion"] : []),
      ...(appSettings.fallacyDetectionEnabled ? ["fallacyDetection"] : []),
      ...(appSettings.psychological.gfkAnalysisEnabled ? ["gfkAnalysis"] : []),
      ...(appSettings.psychological.cognitiveDistortionEnabled ? ["cognitiveDistortions"] : []),
      ...(appSettings.psychological.fourSidesAnalysisEnabled ? ["fourSidesAnalysis"] : []),
      ...(appSettings.topicClassificationEnabled ? ["topicClassification"] : []),
      "chatSummary", // Always the final step - generates chat response
    ];
  }, [appSettings.emotionAnalysisEnabled, appSettings.fallacyDetectionEnabled, appSettings.toneAnalysisEnabled, appSettings.psychological.gfkAnalysisEnabled, appSettings.psychological.cognitiveDistortionEnabled, appSettings.psychological.fourSidesAnalysisEnabled, appSettings.topicClassificationEnabled]);

  const getEnabledStepsForAudioImport = useCallback(() => {
    return [
      "audioFileImport",
      "transcription",
      "audioEmotion",
      ...(appSettings.toneAnalysisEnabled ? ["toneAnalysis"] : []),
      ...(appSettings.emotionAnalysisEnabled ? ["textEmotion"] : []),
      ...(appSettings.fallacyDetectionEnabled ? ["fallacyDetection"] : []),
      ...(appSettings.psychological.gfkAnalysisEnabled ? ["gfkAnalysis"] : []),
      ...(appSettings.psychological.cognitiveDistortionEnabled ? ["cognitiveDistortions"] : []),
      ...(appSettings.psychological.fourSidesAnalysisEnabled ? ["fourSidesAnalysis"] : []),
      ...(appSettings.topicClassificationEnabled ? ["topicClassification"] : []),
      "chatSummary", // Always the final step - generates chat response
    ];
  }, [appSettings.emotionAnalysisEnabled, appSettings.fallacyDetectionEnabled, appSettings.toneAnalysisEnabled, appSettings.psychological.gfkAnalysisEnabled, appSettings.psychological.cognitiveDistortionEnabled, appSettings.psychological.fourSidesAnalysisEnabled, appSettings.topicClassificationEnabled]);

  // Text import hook (for text/file import mode)
  const textImport = useTextImport({
    onEmotionUpdate: handleEmotionUpdate,
    onTopicUpdate: handleTopicUpdate,
    onGFKUpdate: handleGFKUpdate,
    onCognitiveUpdate: handleCognitiveUpdate,
    onFourSidesUpdate: handleFourSidesUpdate,
    onAnalysis: (text: string, result: AnalysisResult, emotion: EmotionState) => {
      // Create segment for text import
      const segmentId = crypto.randomUUID();
      const newSegment: TranscriptSegment = {
        id: segmentId,
        text,
        timestamp: Date.now(),
        emotion: emotion, // Use fresh emotion from callback
        fallacies: result.fallacies,
      };
      setSegments((prev) => [...prev, newSegment]);

      // Store transcript ref for chat summary
      latestTranscriptRef.current = { text, segmentId };

      // Add user message to chat
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        timestamp: new Date(),
        transcriptSegmentId: segmentId,
      };
      setChatHistory((prev) => [...prev, userMessage]);

      // Now handle the analysis (which generates assistant message)
      handleAnalysis(result, emotion);
    },
    onToneUpdate: handleToneUpdate,
    onProcessingStepUpdate: processing.updateStep,
    abortSignal: abortControllerRef.current?.signal,
    enabledSteps: getEnabledStepsForTextImport(),
    llmConfig: appSettings.llm,
    settings: appSettings,
  });

  // Audio file import hook (for audio-file import mode)
  const audioFileImport = useAudioFileImport({
    onEmotionUpdate: handleEmotionUpdate,
    onTopicUpdate: handleTopicUpdate,
    onGFKUpdate: handleGFKUpdate,
    onCognitiveUpdate: handleCognitiveUpdate,
    onFourSidesUpdate: handleFourSidesUpdate,
    onAnalysis: (text: string, result: AnalysisResult, emotion: EmotionState) => {
      // Create segment for audio file import
      const segmentId = crypto.randomUUID();
      const newSegment: TranscriptSegment = {
        id: segmentId,
        text,
        timestamp: Date.now(),
        emotion: emotion, // Use fresh emotion from callback
        fallacies: result.fallacies,
      };
      setSegments((prev) => [...prev, newSegment]);

      // Store transcript ref for chat summary
      latestTranscriptRef.current = { text, segmentId };

      // Add user message to chat
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        timestamp: new Date(),
        transcriptSegmentId: segmentId,
      };
      setChatHistory((prev) => [...prev, userMessage]);

      // Now handle the analysis (which generates assistant message)
      handleAnalysis(result, emotion);
    },
    onToneUpdate: handleToneUpdate,
    onProcessingStepUpdate: processing.updateStep,
    abortSignal: abortControllerRef.current?.signal,
    enabledSteps: getEnabledStepsForAudioImport(),
    whisperProvider: appSettings.whisperProvider,
    whisperModel: appSettings.whisperProvider === "mlx-whisper"
      ? appSettings.mlxWhisperModel
      : appSettings.whisperModel,
    llmConfig: appSettings.llm,
    settings: appSettings,
  });

  // Handle text import submission
  const handleTextSubmit = useCallback(
    async (text: string, source: InputSource) => {
      setError(null);
      setLastInputMode("text");

      // Create new AbortController for this processing session
      abortControllerRef.current = new AbortController();

      // Start processing - uses flushSync internally for immediate state commit
      processing.startProcessing(getEnabledStepsForTextImport());

      try {
        await textImport.processText(text, source);

        toast({
          title: "Text analysiert",
          description: `${text.length} Zeichen verarbeitet`,
          duration: 2000,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Text-Import fehlgeschlagen";
        setError(message);
        toast({
          variant: "destructive",
          title: "Fehler",
          description: message,
        });
      }
    },
    [
      textImport,
      processing,
      getEnabledStepsForTextImport,
      toast,
    ]
  );

  // Handle audio file import submission
  const handleAudioFileSubmit = useCallback(
    async (file: File) => {
      logger.info("Page", "Audio file submit handler called", {
        fileName: file.name,
        fileSize: file.size,
      });

      setError(null);
      setLastInputMode("audioFile");

      // Create new AbortController for this processing session
      abortControllerRef.current = new AbortController();

      // Start processing - uses flushSync internally for immediate state commit
      const steps = getEnabledStepsForAudioImport();
      logger.info("Page", "Starting audio file processing", {
        stepsCount: steps.length,
        steps,
      });
      processing.startProcessing(steps);

      try {
        logger.info("Page", "Calling processAudioFile");
        await audioFileImport.processAudioFile(file);

        logger.info("Page", "Audio file processed successfully");
        toast({
          title: "Audio-Datei analysiert",
          description: `${file.name} erfolgreich verarbeitet`,
          duration: 2000,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Audio-Import fehlgeschlagen";
        logger.error("Page", "Audio file processing failed", err);
        setError(message);
        toast({
          variant: "destructive",
          title: "Fehler",
          description: message,
        });
      }
    },
    [
      audioFileImport,
      processing,
      getEnabledStepsForAudioImport,
      toast,
    ]
  );

  // Clipboard import hotkey (Ctrl+Shift+T)
  const handleClipboardHotkey = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        // Switch to text mode and populate textarea
        setInputMode("text");
        // Trigger text import
        handleTextSubmit(text, "text");
      }
    } catch (err) {
      logger.error("ClipboardHotkey", "Failed to read clipboard", err);
      toast({
        variant: "destructive",
        title: "Zwischenablage-Fehler",
        description: "Konnte nicht auf Zwischenablage zugreifen",
      });
    }
  }, [handleTextSubmit, toast]);

  useHotkey("Control+Shift+T", handleClipboardHotkey);

  // Handle clear chat history
  const handleClearChat = useCallback(() => {
    setSegments([]);
    setChatHistory([]);
    setAnalysisResult(null);
    setCurrentEmotion({
      primary: "neutral",
      confidence: 0,
      audioFeatures: null,
    });
    setCurrentGFK(null);
    setCurrentCognitive(null);
    setCurrentFourSides(null);
    currentGFKRef.current = null;
    currentCognitiveRef.current = null;
    currentFourSidesRef.current = null;
    processing.reset();
    toast({
      title: "Verlauf geloescht",
      description: "Alle Nachrichten wurden entfernt.",
    });
  }, [toast, processing]);

  // Handle RAG chatbot question
  const handleChatQuestion = useCallback(async (question: string) => {
    if (!question.trim()) return;

    // Prevent parallel RAG requests (race condition protection)
    if (isRAGLoadingRef.current) {
      logger.warn('RAGChatbot', 'Request already in progress, ignoring new request');
      return;
    }

    // 1. Add user message to chat history
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
      timestamp: new Date(),
      source: "rag",
    };
    setChatHistory((prev) => [...prev, userMessage]);

    // 2. Execute RAG query
    isRAGLoadingRef.current = true;
    setIsRAGLoading(true);
    try {
      const llmClient = getLLMClient({
        config: appSettings.llm,
        onError: handleLLMError,
      });
      const answer = await executeRAGQuery(question, chatHistoryRef.current, llmClient);

      // 3. Add assistant message to chat history
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: answer,
        timestamp: new Date(),
        source: "rag",
      };
      setChatHistory((prev) => [...prev, assistantMessage]);
    } catch (error: unknown) {
      logger.error('RAGChatbot', 'RAG query failed', error);
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Entschuldigung, ich konnte deine Frage nicht beantworten. Bitte versuche es erneut.",
        timestamp: new Date(),
        source: "rag",
      };
      setChatHistory((prev) => [...prev, errorMessage]);
      toast({
        title: "Fehler",
        description: "Die Frage konnte nicht beantwortet werden.",
        variant: "destructive",
      });
    } finally {
      isRAGLoadingRef.current = false;
      setIsRAGLoading(false);
    }
  }, [appSettings.llm, toast, handleLLMError]);

  return (
    <ErrorBoundary
      name="RootApp"
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="max-w-md w-full bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-8">
            <h1 className="text-2xl font-bold text-red-900 dark:text-red-100 mb-4">
              Kritischer Fehler
            </h1>
            <p className="text-sm text-red-800 dark:text-red-200 mb-6">
              Die Anwendung konnte nicht geladen werden. Bitte laden Sie die Seite neu.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
            >
              Seite neu laden
            </button>
          </div>
        </div>
      }
    >
      {/* Development only: Log window size on mount */}
      {process.env.NODE_ENV === 'development' && <WindowSizeLogger />}

      <main className="min-h-screen p-6 flex flex-col">
      {/* Screen Reader Only - ARIA Live Region */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {srAnnouncement}
      </div>

      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-16">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Hablará
          </h1>
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Finde heraus, was du sagst</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Recordings button */}
          <button
            data-tour-recordings
            onClick={() => setShowRecordings(!showRecordings)}
            className={cn(
              "p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:ring-offset-slate-800"
            )}
            aria-label="Aufnahmen-Bibliothek"
            aria-pressed={showRecordings}
          >
            <Folder className="w-5 h-5 text-slate-600 dark:text-slate-400" aria-hidden="true" />
          </button>

          {/* Settings button */}
          <button
            data-tour-settings
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:ring-offset-slate-800"
            )}
            aria-label="Einstellungen"
            aria-pressed={showSettings}
          >
            <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-500/50 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" aria-hidden="true" />
          <span className="text-sm text-red-700 dark:text-red-200">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            aria-label="Fehlermeldung schließen"
          >
            Schließen
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recording control & Emotion */}
        <div className="lg:col-span-1 space-y-6">
          {/* Input Mode Selector */}
          <div data-tour-input-mode className="bg-white dark:bg-slate-800/50 rounded-xl p-4 flex gap-2 border border-slate-200 dark:border-transparent">
            <button
              onClick={() => setInputMode("recording")}
              aria-label="Aufnahme-Modus"
              aria-pressed={inputMode === "recording"}
              className={cn(
                "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:ring-offset-slate-800",
                inputMode === "recording"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              <Mic className="w-4 h-4" aria-hidden="true" />
              Aufnahme
            </button>
            <button
              onClick={() => setInputMode("text")}
              aria-label="Text-Import-Modus"
              aria-pressed={inputMode === "text"}
              className={cn(
                "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:ring-offset-slate-800",
                inputMode === "text"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              <FileText className="w-4 h-4" aria-hidden="true" />
              Text-Import
            </button>
            <button
              onClick={() => setInputMode("audio-file")}
              aria-label="Audio-Import-Modus"
              aria-pressed={inputMode === "audio-file"}
              className={cn(
                "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:ring-offset-slate-800",
                inputMode === "audio-file"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              <Headphones className="w-4 h-4" aria-hidden="true" />
              Audio-Import
            </button>
          </div>

          {/* Recording button - only show in recording mode */}
          {inputMode === "recording" && (
            <div data-tour-record-button className="bg-white dark:bg-slate-800/50 rounded-xl p-4 flex flex-col items-center gap-3 border border-slate-200 dark:border-transparent">
              {/* Recording Button */}
              <button
                onClick={() => toggleRecording(false)} // false = button click (no flash), true = hotkey (with flash)
                aria-label={isRecording ? "Aufnahme stoppen" : "Aufnahme starten"}
                aria-pressed={isRecording}
                className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:ring-offset-slate-800",
                  isRecording
                    ? "bg-red-500 hover:bg-red-600 animate-pulse motion-reduce:animate-none"
                    : "bg-blue-500 hover:bg-blue-600",
                  // Hotkey flash animation - P2-3
                  isHotkeyTriggered &&
                    "animate-hotkey-flash motion-reduce:animate-none"
                )}
              >
                {isRecording ? (
                  <MicOff className="w-8 h-8 text-white" aria-hidden="true" />
                ) : (
                  <Mic className="w-8 h-8 text-white" aria-hidden="true" />
                )}
              </button>

              {/* LED Segment Level Meter (10 segments: 6 green, 2 orange, 2 red) */}
              <SegmentLevelMeter
                level={audioLevel}
                isActive={isRecording}
                segments={10}
                className="w-full max-w-[200px]"
              />

              {/* Status Text + Duration */}
              <div className="text-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {isRecording
                    ? "Aufnahme..."
                    : isTauri
                      ? "Zum Starten klicken oder Hotkey drücken"
                      : "Zum Starten klicken"
                  }
                </span>
                {isRecording && (
                  <span className="block text-xs text-slate-500 dark:text-slate-500 font-mono mt-1">
                    {formatTimestamp(recordingDuration)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Text Import Panel - only show in text mode */}
          {inputMode === "text" && (
            <ErrorBoundary name="TextImportPanel">
              <TextImportPanel
                onSubmit={handleTextSubmit}
                disabled={processing.state.isProcessing}
                limits={appSettings.limits}
              />
            </ErrorBoundary>
          )}

          {/* Audio File Import Panel - only show in audio-file mode */}
          {inputMode === "audio-file" && (
            <ErrorBoundary name="AudioFileImportPanel">
              <AudioFileImportPanel
                onSubmit={handleAudioFileSubmit}
                disabled={processing.state.isProcessing || processing.state.isShowingCompletion}
                isTauri={isTauri}
                limits={appSettings.limits}
              />
            </ErrorBoundary>
          )}

          {/* Emotion indicator */}
          <EmotionIndicator emotion={currentEmotion} isActive={isRecording} />

          {/* Tone indicator */}
          <ToneIndicator tone={currentTone} isActive={isRecording} />

          {/* Personalized feedback - shows after recording if emotion differs from baseline */}
          {lastRecordingId && !isRecording && (
            <PersonalizedFeedbackPanel recordingId={lastRecordingId} />
          )}
        </div>

        {/* Center: Chat History */}
        <div className="lg:col-span-2">
          <ErrorBoundary name="ChatHistory">
            <ChatHistory
              messages={chatHistory}
              isRecording={isRecording}
              processingState={processing.state}
              onClear={handleClearChat}
              onCancelProcessing={handleCancelProcessing}
              onRetry={handleRetry}
              onSendMessage={handleChatQuestion}
              isRAGLoading={isRAGLoading}
              isModelLoading={isModelLoading}
              hotkey={appSettings.hotkey}
            />
          </ErrorBoundary>
        </div>
      </div>

      {/* Audio recorder (hidden, handles actual recording logic) */}
      <AudioRecorder
        isRecording={isRecording}
        onTranscript={handleTranscript}
        onEmotionUpdate={handleEmotionUpdate}
        onToneUpdate={handleToneUpdate}
        onTopicUpdate={handleTopicUpdate}
        onGFKUpdate={handleGFKUpdate}
        onCognitiveUpdate={handleCognitiveUpdate}
        onFourSidesUpdate={handleFourSidesUpdate}
        onAnalysis={handleAnalysis}
        onError={handleError}
        onAudioLevel={setAudioLevel}
        onDurationUpdate={setRecordingDuration}
        onRecordingSaved={handleRecordingSaved}
        onProcessingUpdate={processing.updateStep}
        abortSignal={abortControllerRef.current?.signal}
        settings={appSettings}
      />

      {/* Settings panel (Dialog) */}
      <ErrorBoundary name="SettingsPanel">
        <SettingsPanel
          open={showSettings}
          onOpenChange={setShowSettings}
          settings={appSettings}
          onSettingsChange={setAppSettings}
          onRestartSetupHints={handleRestartSetupHints}
        />
      </ErrorBoundary>

      {/* Recordings sidebar (Drawer) */}
      {showRecordings && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowRecordings(false)}
          />
          {/* Drawer */}
          <aside className="fixed inset-y-0 right-0 w-96 max-w-full bg-background border-l shadow-lg z-50">
            <ErrorBoundary name="RecordingsLibrary">
              <RecordingsLibrary onClose={() => setShowRecordings(false)} />
            </ErrorBoundary>
          </aside>
        </>
      )}

      {/* Toast notifications */}
      <Toaster />

      {/* Permission Onboarding (Stage 0) */}
      <ErrorBoundary name="PermissionOnboarding">
        <PermissionOnboarding
          isOpen={showPermissions}
          onComplete={handlePermissionsComplete}
          onSkip={handlePermissionsSkip}
        />
      </ErrorBoundary>

      {/* Setup Hints Modal (Stage 1) */}
      <SetupHintsModal
        isOpen={showSetupHints}
        onClose={handleSetupHintsClose}
      />

      {/* Onboarding Tour */}
      <OnboardingTour
        isModelLoading={isModelLoading}
        forcedRun={showTour}
        onTourEnd={() => setShowTour(false)}
      />
    </main>
    </ErrorBoundary>
  );
}
