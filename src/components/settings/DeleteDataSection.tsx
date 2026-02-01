"use client";

/**
 * DeleteDataSection - Delete All Data Danger Zone
 *
 * Rot-highlightete Section mit Confirm-Dialog für komplettes Löschen aller Aufnahmen.
 * Zeigt Storage Path, Count, Total Size. Nur sichtbar wenn Storage aktiviert.
 */

import { useState } from "react";
import { useTheme } from "next-themes";
import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useRecordings } from "@/hooks/useRecordings";
import { deleteApiKey } from "@/lib/secure-storage";
import type { AppSettings, LLMProvider } from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/types";

interface DeleteDataSectionProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  onSettingsReset: () => void;
}

type ConfirmDialog = "recordings" | "apiKeys" | "settings" | null;

export function DeleteDataSection({
  settings,
  onSettingsChange,
  onSettingsReset,
}: DeleteDataSectionProps): JSX.Element {
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { stats, clearAllRecordings } = useRecordings();
  const { setTheme } = useTheme(); // Extract setTheme for theme reset

  // Storage stats from hook (count + size)
  const storageCount = stats?.recordingCount ?? 0;
  const storageSizeMB = stats ? stats.totalSizeBytes / (1024 * 1024) : 0;

  const handleDeleteRecordings = async () => {
    setIsDeleting(true);
    try {
      await clearAllRecordings();
      toast({
        title: "Aufnahmen gelöscht",
        description: `${storageCount} Aufnahmen (${storageSizeMB.toFixed(1)} MB) erfolgreich gelöscht.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler beim Löschen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
      });
    } finally {
      setIsDeleting(false);
      setConfirmDialog(null);
    }
  };

  const handleDeleteApiKeys = async () => {
    setIsDeleting(true);
    try {
      // Delete API keys for all cloud providers
      const cloudProviders: Array<LLMProvider & ("openai" | "anthropic")> = ["openai", "anthropic"];
      const deletePromises = cloudProviders.map((provider) =>
        deleteApiKey(provider).catch(() => {
          // Ignore errors if key doesn't exist
        })
      );
      await Promise.all(deletePromises);

      // Clear apiKey from settings state to prevent re-saving old key
      onSettingsChange({
        ...settings,
        llm: {
          ...settings.llm,
          apiKey: "",
        },
      });

      toast({
        title: "API-Schlüssel entfernt",
        description: "Alle gespeicherten API-Schlüssel wurden aus dem Schlüsselbund gelöscht.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler beim Löschen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
      });
    } finally {
      setIsDeleting(false);
      setConfirmDialog(null);
    }
  };

  const handleResetSettings = async () => {
    setIsDeleting(true);
    // Note: localStorage.removeItem can throw in private browsing mode
    try {
      // Delete API keys from Keychain first
      const cloudProviders: Array<LLMProvider & ("openai" | "anthropic")> = ["openai", "anthropic"];
      const deletePromises = cloudProviders.map((provider) =>
        deleteApiKey(provider).catch(() => {
          // Ignore errors if key doesn't exist
        })
      );
      await Promise.all(deletePromises);

      // Reset to defaults
      onSettingsReset();

      // Clear localStorage (settings + zoom level)
      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
      localStorage.removeItem(STORAGE_KEYS.ZOOM_LEVEL);

      // Reset theme to dark (default) - next-themes manages its own localStorage
      setTheme("dark");

      toast({
        title: "Einstellungen zurückgesetzt",
        description: "Alle Optionen, API-Schlüssel und Theme wurden auf Standardwerte zurückgesetzt.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler beim Zurücksetzen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
      });
    } finally {
      setIsDeleting(false);
      setConfirmDialog(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trash2 className="w-4 h-4 text-muted-foreground" />
        <h4 className="font-medium text-foreground">Ihre Daten löschen</h4>
      </div>

      <p className="text-sm text-muted-foreground">
        Löschen Sie Ihre lokal gespeicherten Daten unwiderruflich:
      </p>

      <div className="space-y-3">
        {/* Delete All Recordings */}
        <div className="flex items-start justify-between gap-4 p-3 rounded-lg border">
          <div className="flex-1">
            <h5 className="font-medium text-sm">Alle Aufnahmen löschen</h5>
            <p className="text-xs text-muted-foreground mt-1">
              Entfernt alle Audio-Dateien und Metadaten
              {storageCount > 0 && (
                <span className="font-medium">
                  {" "}({storageCount} Aufnahmen, {storageSizeMB.toFixed(1)} MB)
                </span>
              )}
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setConfirmDialog("recordings")}
            disabled={storageCount === 0}
          >
            Löschen
          </Button>
        </div>

        {/* Delete API Keys */}
        <div className="flex items-start justify-between gap-4 p-3 rounded-lg border">
          <div className="flex-1">
            <h5 className="font-medium text-sm">API-Schlüssel entfernen</h5>
            <p className="text-xs text-muted-foreground mt-1">
              Löscht gespeicherte API-Schlüssel aus dem Schlüsselbund
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setConfirmDialog("apiKeys")}
          >
            Entfernen
          </Button>
        </div>

        {/* Reset Settings */}
        <div className="flex items-start justify-between gap-4 p-3 rounded-lg border">
          <div className="flex-1">
            <h5 className="font-medium text-sm">Einstellungen zurücksetzen</h5>
            <p className="text-xs text-muted-foreground mt-1">
              Setzt alle Optionen, API-Schlüssel und Theme auf Standardwerte zurück
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setConfirmDialog("settings")}
          >
            Zurücksetzen
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          <strong>Hinweis:</strong> Nach dem Löschen können Daten nicht wiederhergestellt werden.
        </p>
      </div>

      {/* Confirmation Dialogs */}

      {/* Delete Recordings Confirmation */}
      <AlertDialog open={confirmDialog === "recordings"} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alle Aufnahmen löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion löscht {storageCount} Aufnahmen ({storageSizeMB.toFixed(1)} MB)
              dauerhaft von Ihrem Gerät. Diese Daten können nicht wiederhergestellt werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRecordings}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Löschen..." : "Alle löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete API Keys Confirmation */}
      <AlertDialog open={confirmDialog === "apiKeys"} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>API-Schlüssel entfernen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion entfernt alle gespeicherten API-Schlüssel (OpenAI, Anthropic) aus dem
              macOS Schlüsselbund. Sie müssen die Schlüssel erneut eingeben, um Cloud-Dienste zu nutzen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteApiKeys}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Entfernen..." : "Entfernen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Settings Confirmation */}
      <AlertDialog open={confirmDialog === "settings"} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Einstellungen zurücksetzen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion setzt alle Einstellungen (inkl. Dark Mode und API-Schlüssel) auf die Standardwerte zurück.
              Ihre Aufnahmen bleiben erhalten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetSettings} disabled={isDeleting}>
              {isDeleting ? "Zurücksetzen..." : "Zurücksetzen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
