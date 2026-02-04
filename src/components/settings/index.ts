/**
 * Settings Panel Module
 *
 * Modular settings interface with focused sections
 */

// Components
export { SettingsPanel } from "./SettingsPanel";
export { LLMSettingsSection } from "./LLMSettingsSection";
export { WhisperSettingsSection } from "./WhisperSettingsSection";
export { MLXPathsSection } from "./MLXPathsSection";
export { StorageSettingsSection } from "./StorageSettingsSection";
export { FeatureSettingsSection } from "./FeatureSettingsSection";
export { FeatureSection } from "./FeatureSection";
export { FeatureCard } from "./FeatureCard";
export { FeatureBadge } from "./FeatureBadge";
export { HotkeySection } from "./HotkeySection";
export { InputLimitsSection } from "./InputLimitsSection";
export { MicrophonePermissionSection } from "./MicrophonePermissionSection";
export { PrivacyStatusSection } from "./PrivacyStatusSection";
export { DeleteDataSection } from "./DeleteDataSection";
export { TourSection } from "./TourSection";

// Tab Components
export { AnalyseTab, KIModelleTab, SpeicherTab, ErweitertTab } from "./tabs";

// Constants (named exports for better tree-shaking)
export {
  WHISPER_MODELS,
  WHISPER_PROVIDERS, // @deprecated - use getWhisperProviders()
  getWhisperProviders,
  MLX_WHISPER_MODELS,
  LLM_PROVIDERS,
  LLM_MODELS,
  OLLAMA_MODELS,
} from "./settings-constants";

// Types
export type { WhisperProviderOption } from "./settings-constants";
