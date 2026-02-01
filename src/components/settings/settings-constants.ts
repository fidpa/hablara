/**
 * Settings Panel Constants
 *
 * Shared constants for Whisper, LLM, and other configuration options
 */

// NOTE: Only german-turbo is bundled with Hablará. Other models would require manual installation.
// Showing only available models to avoid user confusion.
export const WHISPER_MODELS = [
  { value: "german-turbo", label: "German Turbo (~1.6GB)", description: "Optimiert fuer Deutsch" },
] as const;

export const WHISPER_PROVIDERS = [
  { value: "whisper-cpp", label: "Whisper.cpp", description: "Stabil, kompiliert" },
  { value: "mlx-whisper", label: "MLX-Whisper", description: "Apple Silicon optimiert" },
] as const;

// DEPRECATED: Models are now discovered dynamically via useAvailableWhisperModels hook
export const MLX_WHISPER_MODELS = [
  { value: "german-turbo", label: "German Turbo (~1.6GB)", description: "Optimiert fuer Deutsch" },
  // large-v3 removed: too large for live transcription (~2.9GB)
] as const;

export const LLM_PROVIDERS = [
  { value: "ollama", label: "Ollama (Lokal)", description: "Privat, keine Cloud" },
  { value: "openai", label: "OpenAI", description: "GPT-4, Cloud" },
  { value: "anthropic", label: "Anthropic", description: "Claude, Cloud" },
] as const;

// LLM Models by provider
// NOTE: Only Hablará-optimized Custom Models (8K Context, Temp 0.3, Custom System Message)
// Basis-Models (qwen2.5:7b/14b/32b) removed - use Custom Models for best performance
export const LLM_MODELS = {
  ollama: [
    "qwen2.5:7b-custom",   // Custom-optimized Qwen 2.5 7B (see docs/how-to/LLM_SETUP.md)
    "qwen2.5:14b-custom",  // Custom-optimized Qwen 2.5 14B
    "qwen2.5:32b-custom",  // Custom-optimized Qwen 2.5 32B
  ],
  openai: [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
  ],
  anthropic: [
    "claude-sonnet-4-20250514",      // Claude Sonnet 4 (aktuell, schnell)
    "claude-3-5-haiku-20241022",     // Claude Haiku 3.5 (günstig)
    "claude-opus-4-20250514",        // Claude Opus 4 (höchste Qualität)
  ],
} as const;

// For backwards compatibility
export const OLLAMA_MODELS = LLM_MODELS.ollama;

/**
 * Default models per provider
 * Used when switching providers to ensure valid model selection
 */
export const PROVIDER_DEFAULT_MODELS = {
  ollama: "qwen2.5:7b-custom",
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-20250514",
} as const satisfies Record<"ollama" | "openai" | "anthropic", string>;
