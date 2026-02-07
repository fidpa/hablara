"use client";

/**
 * SettingsPanel - Hauptdialog für App-Einstellungen
 *
 * Tab-basierte Settings UI (4 Tabs: Allgemein, Analyse, KI-Modelle, Speicher, Erweitert).
 * Verwaltet Settings-State, API Key Storage (Keyring), LLM Provider Status, Save Confirmation.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Check, Loader2, AlertCircle } from "lucide-react";
import type { AppSettings, SaveState } from "@/lib/types";
import { DEFAULT_SETTINGS, DEFAULT_STORAGE_SETTINGS, STORAGE_KEYS, SETTINGS_UI_TIMINGS } from "@/lib/types";
import { useRecordings } from "@/hooks/useRecordings";
import { useLLMProviderStatus } from "@/hooks/useLLMProviderStatus";
import { storeApiKey, deleteApiKey } from "@/lib/secure-storage";
import { useTauri } from "@/hooks/useTauri";
import { logger } from "@/lib/logger";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { AllgemeinTab, AnalyseTab, KIModelleTab, SpeicherTab, ErweitertTab } from "./tabs";

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  onRestartSetupHints?: () => void;
}

export function SettingsPanel({ open, onOpenChange, settings, onSettingsChange, onRestartSetupHints }: SettingsPanelProps): JSX.Element {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [isSaving, setIsSaving] = useState(false);
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Local settings state - changes are applied only when user clicks "Save"
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  // Sync local settings when dialog opens (reset to current app settings)
  useEffect(() => {
    if (open) {
      setLocalSettings(settings);
    }
  }, [open, settings]);

  // Tauri runtime detection
  const { isTauri } = useTauri();

  // LLM provider status check (for all providers) - use local settings for real-time updates
  const { status: providerStatus } = useLLMProviderStatus(localSettings.llm, open);

  // Recording storage management
  const { config, updateConfig } = useRecordings();
  const { toast } = useToast();

  // Cleanup timeout on unmount + track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
    };
  }, []);

  // Reset settings to defaults (updates local state, applied on Save)
  const handleResetSettings = useCallback(() => {
    setLocalSettings(DEFAULT_SETTINGS);
  }, []);

  // Save settings with enhanced visual feedback
  const handleSave = useCallback(async () => {
    // Guard against concurrent saves (race condition prevention)
    if (isSaving) return;

    // Clear any pending timeout
    if (savedTimeoutRef.current) {
      clearTimeout(savedTimeoutRef.current);
    }

    setIsSaving(true);
    setSaveState("saving");

    try {
      // 1. Strip apiKey from localStorage (will be stored in keyring)
      const settingsForStorage = {
        ...localSettings,
        llm: { ...localSettings.llm, apiKey: undefined },
      };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settingsForStorage));

      // 2. Save API key to Keyring (cloud providers only)
      const isCloudProvider =
        localSettings.llm.provider === "openai" || localSettings.llm.provider === "anthropic";

      if (isCloudProvider) {
        // Type assertion safe: we checked provider is openai or anthropic
        const provider = localSettings.llm.provider as "openai" | "anthropic";

        if (localSettings.llm.apiKey) {
          // Store API key in keyring
          await storeApiKey(provider, localSettings.llm.apiKey);
        } else {
          // Empty key = delete from keyring
          await deleteApiKey(provider);
        }
      }

      // 3. Sync storage config with backend
      if (config) {
        await updateConfig({
          ...config,
          storageEnabled: localSettings.storage?.storageEnabled ?? DEFAULT_STORAGE_SETTINGS.storageEnabled,
          maxRecordings: localSettings.storage?.maxRecordings ?? DEFAULT_STORAGE_SETTINGS.maxRecordings,
        });
      }

      // 4. Force unregister ALL hotkeys (fixes hotkey change bug in Tauri)
      if (isTauri) {
        try {
          const { unregisterAll } = await import("@tauri-apps/plugin-global-shortcut");
          await unregisterAll();
          logger.info('SettingsPanel', 'All hotkeys unregistered before settings save (ensures clean re-registration)');
        } catch (error: unknown) {
          // Non-critical: useHotkey will still try to unregister old hotkey
          logger.warn('SettingsPanel', 'Failed to unregister hotkeys', error);
        }
      }

      // 5. Trigger page.tsx state update via callback (will re-register hotkey with new shortcut)
      onSettingsChange(localSettings);

      // 6. Success state with auto-reset
      setSaveState("success");

      // Auto-reset to idle state after success feedback duration
      savedTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setSaveState("idle");
        }
      }, SETTINGS_UI_TIMINGS.saveSuccessFeedbackMs);
    } catch (error: unknown) {
      // Sanitize error messages (no internal details to user)
      const sanitizedMessage = (() => {
        if (!(error instanceof Error)) return "Unbekannter Fehler";
        if (error.message.includes("Keychain")) {
          return "Schlüsselbund nicht verfügbar. Bitte entsperren Sie den Schlüsselbund und versuchen Sie es erneut.";
        }
        if (error.message.includes("quota")) return "Speicher voll";
        // Default: generic message (log raw error, don't show to user)
        logger.error('SettingsPanel', 'Settings save failed', error);
        return "Speichern fehlgeschlagen. Bitte erneut versuchen.";
      })();

      toast({
        variant: "destructive",
        title: "Fehler beim Speichern",
        description: sanitizedMessage,
      });

      // Error state with auto-reset to idle
      setSaveState("error");
      savedTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setSaveState("idle");
        }
      }, SETTINGS_UI_TIMINGS.saveErrorResetMs);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, localSettings, config, updateConfig, toast, onSettingsChange, isTauri]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Einstellungen</DialogTitle>
          <DialogDescription>
            Konfiguriere Whisper-Provider, LLM-Modell und Storage-Optionen
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="allgemein" className="w-full min-w-0">
          <TabsList className="grid w-full grid-cols-5" aria-label="Einstellungskategorien">
            <TabsTrigger value="allgemein">Allgemein</TabsTrigger>
            <TabsTrigger value="analyse">Analyse</TabsTrigger>
            <TabsTrigger value="ki-modelle">KI-Modelle</TabsTrigger>
            <TabsTrigger value="speicher">Speicher</TabsTrigger>
            <TabsTrigger value="erweitert">Erweitert</TabsTrigger>
          </TabsList>

          <TabsContent value="allgemein" tabIndex={0}>
            <AllgemeinTab
              settings={localSettings}
              onSettingsChange={setLocalSettings}
              onRestartSetupHints={onRestartSetupHints}
              onOpenChange={onOpenChange}
            />
          </TabsContent>

          <TabsContent value="analyse" tabIndex={0}>
            <AnalyseTab settings={localSettings} onSettingsChange={setLocalSettings} />
          </TabsContent>

          <TabsContent value="ki-modelle" tabIndex={0}>
            <KIModelleTab
              settings={localSettings}
              onSettingsChange={setLocalSettings}
              providerStatus={providerStatus}
            />
          </TabsContent>

          <TabsContent value="speicher" tabIndex={0}>
            <SpeicherTab settings={localSettings} onSettingsChange={setLocalSettings} />
          </TabsContent>

          <TabsContent value="erweitert" tabIndex={0}>
            <ErweitertTab
              settings={localSettings}
              onSettingsChange={setLocalSettings}
              storagePath={config?.storagePath}
              onSettingsReset={handleResetSettings}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          {/* Accessibility: aria-live announcements + Loading spinner */}
          <Button
            type="button"
            onClick={handleSave}
            disabled={saveState === "saving"}
            aria-busy={saveState === "saving"}
            aria-describedby="save-status"
          >
            {saveState === "saving" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                Speichere...
              </>
            ) : saveState === "success" ? (
              <>
                <Check className="w-4 h-4 mr-2" aria-hidden="true" />
                Gespeichert
              </>
            ) : saveState === "error" ? (
              <>
                <AlertCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                Fehler - Erneut versuchen
              </>
            ) : (
              "Speichern"
            )}
          </Button>

          {/* Screen reader announcements */}
          <span id="save-status" className="sr-only" aria-live="polite">
            {saveState === "success" && "Einstellungen gespeichert"}
            {saveState === "error" && "Fehler beim Speichern"}
            {saveState === "saving" && "Speichere Einstellungen..."}
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
