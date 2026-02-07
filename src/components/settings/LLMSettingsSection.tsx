"use client";

/**
 * LLMSettingsSection - LLM Provider & Model Settings
 *
 * Multi-Provider LLM Konfiguration: Ollama/OpenAI/Anthropic, Model-Select, API Key (Keyring).
 * Privacy Status Badge (Cloud/Offline), Consent Modal (GDPR Art. 13), Provider Status Check.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { Check, AlertCircle, AlertTriangle, Info } from "lucide-react";
import type { AppSettings, LLMProvider, CloudProviderConsent, LLMProviderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTauri } from "@/hooks/useTauri";
import {
  getApiKey,
  checkSecretServiceStatus,
  type SecretServiceStatus,
} from "@/lib/secure-storage";
import { logger } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConsentModal } from "./ConsentModal";
import { SecretServiceWarning } from "./SecretServiceWarning";
import { OllamaTroubleshootingSection } from "./OllamaTroubleshootingSection";

import { LLM_PROVIDERS, OLLAMA_MODELS, OLLAMA_MODEL_LABELS, PROVIDER_DEFAULT_MODELS } from "./settings-constants";

interface LLMSettingsSectionProps {
  settings: AppSettings;
  providerStatus: LLMProviderStatus;
  onSettingsChange: (settings: AppSettings) => void;
}

/**
 * Validate API Key format for cloud providers
 * @param provider - LLM provider (openai, anthropic)
 * @param key - API key to validate
 * @returns true if valid or empty, false if invalid format
 */
function validateApiKey(provider: LLMProvider, key: string): boolean {
  if (!key) return true; // Empty is OK (user might be clearing)

  // OpenAI: sk-... or sk-proj-...
  if (provider === "openai") {
    return key.startsWith("sk-");
  }

  // Anthropic: sk-ant-...
  if (provider === "anthropic") {
    return key.startsWith("sk-ant-");
  }

  return true; // Ollama doesn't need API key
}

export function LLMSettingsSection({
  settings,
  providerStatus,
  onSettingsChange,
}: LLMSettingsSectionProps) {
  const { isTauri: isTauriEnv } = useTauri();
  const { toast } = useToast();
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<"openai" | "anthropic" | null>(null);
  const [secretServiceStatus, setSecretServiceStatus] = useState<SecretServiceStatus | null>(null);

  // Track previous provider to avoid redundant updates
  const prevProviderRef = useRef(settings.llm.provider);

  // P2-1: Request ID to handle race conditions on rapid provider switches
  const providerLoadRequestIdRef = useRef(0);

  // Check Secret Service availability on Linux (Phase 55)
  // P1-1 Optimization: Early-exit for non-Linux platforms to avoid unnecessary async calls
  useEffect(() => {
    // Fast synchronous check: Skip async call on macOS/Windows (95%+ of users)
    if (typeof navigator !== "undefined") {
      const platform = navigator.platform?.toLowerCase() ?? "";
      if (!platform.includes("linux")) {
        setSecretServiceStatus("not-linux");
        return;
      }
    }

    // Linux-only: Actually check Secret Service availability
    let cancelled = false;

    const checkStatus = async () => {
      const status = await checkSecretServiceStatus();
      if (!cancelled) {
        setSecretServiceStatus(status);
        // Log only for actionable statuses
        if (status === "unavailable" || status === "timeout") {
          logger.warn("LLMSettingsSection", `Secret Service status: ${status}`);

          // P2-3: User notification on Secret Service unavailable (Audit 2026-02-05)
          if (status === "unavailable") {
            toast({
              title: "Kein Schlüsselbund-Dienst gefunden",
              description: "Bitte installieren Sie GNOME Keyring (gnome-keyring) oder KWallet (kwalletmanager) für sichere API Key-Speicherung.",
              variant: "destructive",
            });
          } else if (status === "timeout") {
            toast({
              title: "Schlüsselbund-Dienst antwortet nicht",
              description: "Der Keyring-Daemon reagiert nicht. Bitte starten Sie gnome-keyring-daemon oder kwalletd.",
              variant: "destructive",
            });
          }
        }
      }
    };

    checkStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Load correct API key when provider changes
   * Prevents showing wrong provider's key as dots
   *
   * P2-1: Uses request ID pattern to handle race conditions when user
   * rapidly switches providers (e.g., OpenAI → Anthropic → Ollama).
   * Only the most recent request's result is applied.
   */
  useEffect(() => {
    const provider = settings.llm.provider;

    // Skip if provider hasn't actually changed (prevents redundant calls)
    if (prevProviderRef.current === provider) {
      return;
    }
    prevProviderRef.current = provider;

    // P2-1: Increment request ID - only latest request will be applied
    const currentRequestId = ++providerLoadRequestIdRef.current;

    const loadKeyForProvider = async () => {
      // Only cloud providers need API keys
      if (provider === "openai" || provider === "anthropic") {
        try {
          const key = await getApiKey(provider);
          // P2-1: Only apply if this is still the latest request
          if (currentRequestId !== providerLoadRequestIdRef.current) {
            logger.debug("LLMSettingsSection", `Ignoring stale API key load for ${provider}`);
            return;
          }
          onSettingsChange({
            ...settings,
            llm: {
              ...settings.llm,
              apiKey: key || "",
            },
          });
        } catch (error) {
          logger.error('LLMSettingsSection', `Failed to load API key for ${provider}`, error);
          // P2-1: Only apply if this is still the latest request
          if (currentRequestId !== providerLoadRequestIdRef.current) return;
          // Clear key on error to show empty field
          onSettingsChange({
            ...settings,
            llm: {
              ...settings.llm,
              apiKey: "",
            },
          });
        }
      } else {
        // Ollama: Clear any stale key
        // P2-1: Only apply if this is still the latest request
        if (currentRequestId === providerLoadRequestIdRef.current && settings.llm.apiKey) {
          onSettingsChange({
            ...settings,
            llm: {
              ...settings.llm,
              apiKey: "",
            },
          });
        }
      }
    };

    loadKeyForProvider();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.llm.provider]);

  /**
   * Handle provider change with consent check
   * REACT_TSX Rule #3: Event handlers wrapped in useCallback
   */
  const handleProviderChange = useCallback(
    (newProvider: LLMProvider) => {
      // Ollama: No consent needed
      if (newProvider === "ollama") {
        onSettingsChange({
          ...settings,
          llm: { ...settings.llm, provider: newProvider, model: PROVIDER_DEFAULT_MODELS.ollama },
        });
        return;
      }

      // Cloud provider: Check if consent already given
      const existingConsent = settings.cloudConsent.find(
        (c) => c.provider === newProvider && c.agreed
      );

      if (existingConsent) {
        // Consent already given, allow switch
        onSettingsChange({
          ...settings,
          llm: { ...settings.llm, provider: newProvider, model: PROVIDER_DEFAULT_MODELS[newProvider] },
        });
      } else {
        // No consent yet, show modal
        setPendingProvider(newProvider as "openai" | "anthropic");
        setShowConsentModal(true);
      }
    },
    [settings, onSettingsChange]
  );

  /**
   * Handle consent acceptance
   * REACT_TSX Rule #3: Event handlers wrapped in useCallback
   */
  const handleConsent = useCallback(
    (consent: CloudProviderConsent) => {
      if (!pendingProvider) return;

      // Add consent to settings
      const updatedConsent = [
        ...settings.cloudConsent.filter((c) => c.provider !== pendingProvider),
        consent,
      ];

      // Switch to cloud provider with provider-specific default model
      onSettingsChange({
        ...settings,
        llm: { ...settings.llm, provider: pendingProvider, model: PROVIDER_DEFAULT_MODELS[pendingProvider] },
        cloudConsent: updatedConsent,
      });

      // Reset modal state
      setShowConsentModal(false);
      setPendingProvider(null);
    },
    [pendingProvider, settings, onSettingsChange]
  );

  /**
   * Handle consent decline
   * REACT_TSX Rule #3: Event handlers wrapped in useCallback
   */
  const handleDecline = useCallback(() => {
    // Stay on current provider (usually Ollama)
    setShowConsentModal(false);
    setPendingProvider(null);
  }, []);

  return (
    <div className="space-y-4">
      {/* LLM Provider */}
      <div className="space-y-2">
        <Label>LLM Provider</Label>
        <div className="grid grid-cols-3 gap-2">
          {LLM_PROVIDERS.map((provider) => {
            const isActive = settings.llm.provider === provider.value;
            return (
              <button
                type="button"
                key={provider.value}
                onClick={() => handleProviderChange(provider.value as LLMProvider)}
                aria-pressed={isActive}
                className={cn(
                  "p-3 rounded-lg border text-center transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isActive
                    ? "border-primary bg-primary/20"
                    : "border-input hover:border-primary/50"
                )}
              >
                <div className="text-sm font-medium">{provider.label}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {provider.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Provider Status (for all providers) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          {providerStatus === "checking" && (
            <Badge variant="secondary" aria-label="Provider-Status wird geprüft">Prüfe...</Badge>
          )}
          {providerStatus === "online" && (
            <Badge variant="success" className="flex items-center gap-1" aria-label="Provider ist verbunden">
              <Check className="w-3 h-3" aria-hidden="true" /> Verbunden
            </Badge>
          )}
          {providerStatus === "offline" && (
            <Badge variant="destructive" className="flex items-center gap-1" aria-label="Provider ist nicht erreichbar">
              <AlertCircle className="w-3 h-3" aria-hidden="true" /> Nicht erreichbar
            </Badge>
          )}
          {providerStatus === "no-key" && (
            <Badge variant="warning" className="flex items-center gap-1" aria-label="API Key fehlt für diesen Provider">
              <AlertTriangle className="w-3 h-3" aria-hidden="true" /> API Key fehlt
            </Badge>
          )}
          {providerStatus === "model-missing" && (
            <Badge variant="warning" className="flex items-center gap-1" aria-label="KI-Modell nicht gefunden">
              <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Modell fehlt
            </Badge>
          )}
        </div>

        {/* P2-3: Linux Secret Service Status Badge (Audit 2026-02-05) */}
        {isTauriEnv &&
          (settings.llm.provider === "openai" || settings.llm.provider === "anthropic") &&
          secretServiceStatus &&
          (secretServiceStatus === "unavailable" || secretServiceStatus === "timeout") && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Schlüsselbund:</span>
            {secretServiceStatus === "unavailable" && (
              <Badge variant="destructive" className="flex items-center gap-1" aria-label="Secret Service nicht gefunden">
                <AlertCircle className="w-3 h-3" aria-hidden="true" /> Nicht installiert
              </Badge>
            )}
            {secretServiceStatus === "timeout" && (
              <Badge variant="warning" className="flex items-center gap-1" aria-label="Secret Service antwortet nicht">
                <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Nicht gestartet
              </Badge>
            )}
          </div>
        )}

        {/* Ollama Troubleshooting (extracted component) */}
        {settings.llm.provider === "ollama" && (
          <OllamaTroubleshootingSection
            providerStatus={providerStatus}
            model={settings.llm.model}
          />
        )}
      </div>

      {/* Privacy Notice for Cloud Providers */}
      {(settings.llm.provider === "openai" || settings.llm.provider === "anthropic") && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-500/50">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700 dark:text-blue-200">
            <strong>Cloud-Verarbeitung:</strong> Transkripte werden an{" "}
            {settings.llm.provider === "openai" ? "OpenAI" : "Anthropic"} Server übertragen.
            <br />
            Datenfluss: Voice → Whisper (lokal) → Transkript → {settings.llm.provider === "openai" ? "OpenAI" : "Anthropic"} API
            <br />
            <span className="text-blue-600/80 dark:text-blue-300/70">
              Ollama (Standard) ist vollständig lokal und sendet keine Daten an externe Server.
            </span>
          </div>
        </div>
      )}

      {/* Ollama-specific settings */}
      {settings.llm.provider === "ollama" && (
        <>
          {/* Ollama Model */}
          <div className="space-y-2">
            <Label htmlFor="ollama-model">Ollama Modell</Label>
            <Select
              value={settings.llm.model}
              onValueChange={(value) =>
                onSettingsChange({
                  ...settings,
                  llm: { ...settings.llm, model: value },
                })
              }
            >
              <SelectTrigger id="ollama-model">
                <SelectValue placeholder="Modell wählen" />
              </SelectTrigger>
              <SelectContent>
                {OLLAMA_MODELS.map((model) => (
                  <SelectItem key={model} value={model}>
                    {OLLAMA_MODEL_LABELS[model] ?? model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ollama URL */}
          <div className="space-y-2">
            <Label htmlFor="ollama-url">Ollama URL</Label>
            <input
              id="ollama-url"
              type="text"
              value={settings.llm.baseUrl || ""}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  llm: { ...settings.llm, baseUrl: e.target.value },
                })
              }
              placeholder="http://127.0.0.1:11434"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </>
      )}

      {/* Linux Secret Service Warning (Phase 55, extracted component) */}
      {secretServiceStatus &&
        (settings.llm.provider === "openai" || settings.llm.provider === "anthropic") && (
        <SecretServiceWarning status={secretServiceStatus} />
      )}

      {/* API Key for cloud providers */}
      {(settings.llm.provider === "openai" ||
        settings.llm.provider === "anthropic") && (
        <div className="space-y-2">
          <Label htmlFor="api-key">API Key</Label>
          <input
            id="api-key"
            type="password"
            value={settings.llm.apiKey || ""}
            onChange={(e) => {
              const newKey = e.target.value;
              const isValid = validateApiKey(settings.llm.provider, newKey);

              // Set error message if invalid format
              if (!isValid) {
                const expectedPrefix = settings.llm.provider === "openai"
                  ? "sk-"
                  : "sk-ant-";
                setApiKeyError(`API Key muss mit "${expectedPrefix}" beginnen`);
              } else {
                setApiKeyError(null);
              }

              onSettingsChange({
                ...settings,
                llm: { ...settings.llm, apiKey: newKey },
              });
            }}
            placeholder={
              settings.llm.provider === "openai"
                ? "sk-proj-..."
                : "sk-ant-..."
            }
            className={cn(
              "flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              apiKeyError
                ? "border-red-500 focus-visible:ring-red-500"
                : "border-input"
            )}
          />

          {/* Validation Error */}
          {apiKeyError && (
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-3 h-3" />
              <span>{apiKeyError}</span>
            </div>
          )}

          {/* Browser Security Warning */}
          {!isTauriEnv && settings.llm.apiKey && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-500/50">
              <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-yellow-700 dark:text-yellow-200">
                <strong>Sicherheitshinweis:</strong> API Key nur temporär im Speicher (sessionStorage), wird bei Tab-Schließung gelöscht.
                Verwende die Desktop-App (Tauri) für verschlüsselte Speicherung im OS-Schlüsselbund.
              </div>
            </div>
          )}

          {/* Tauri Keychain Info */}
          {isTauriEnv && settings.llm.apiKey && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-500/50">
              <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-green-700 dark:text-green-200">
                <strong>Verschlüsselt im OS-Schlüsselbund gespeichert</strong><br />
                <span className="text-green-600/80 dark:text-green-300/80">
                  Hinweis: API Keys verbleiben im Schlüsselbund nach App-Deinstallation.
                  Manuelles Löschen über Schlüsselbundverwaltung (macOS) möglich.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Consent Modal */}
      {pendingProvider && (
        <ConsentModal
          provider={pendingProvider}
          isOpen={showConsentModal}
          onConsent={handleConsent}
          onDecline={handleDecline}
        />
      )}
    </div>
  );
}
