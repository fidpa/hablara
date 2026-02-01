"use client";

/**
 * StorageSettingsSection - Speicher-Verwaltung
 *
 * Toggle für Storage Enable/Disable, Max Recordings Dropdown, Auto-Cleanup-Info.
 * Storage Stats (Count, Size, Duration) mit "Alle löschen" Button. Zeigt aktuellen Pfad.
 */

import { useState, useCallback } from "react";
import { HardDrive, Trash2, Folder } from "lucide-react";
import type { AppSettings } from "@/lib/types";
import { DEFAULT_STORAGE_SETTINGS } from "@/lib/types";
import { useRecordings, formatFileSize, formatDuration } from "@/hooks/useRecordings";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface StorageSettingsSectionProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export function StorageSettingsSection({
  settings,
  onSettingsChange,
}: StorageSettingsSectionProps) {
  const [isClearing, setIsClearing] = useState(false);
  const { stats, clearAllRecordings, refresh } = useRecordings();

  const handleClearAll = useCallback(async () => {
    if (confirm("Alle Aufnahmen wirklich löschen?")) {
      setIsClearing(true);
      await clearAllRecordings();
      await refresh();
      setIsClearing(false);
    }
  }, [clearAllRecordings, refresh]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <HardDrive className="w-4 h-4" />
        <Label className="text-base font-medium">Speicher</Label>
      </div>

      {/* Storage Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="storage-toggle">Automatische Speicherung</Label>
          <p className="text-xs text-muted-foreground">
            Speichert alle Aufnahmen automatisch für spätere Analyse
          </p>
        </div>
        <Switch
          id="storage-toggle"
          checked={settings.storage?.storageEnabled ?? DEFAULT_STORAGE_SETTINGS.storageEnabled}
          onCheckedChange={(checked) =>
            onSettingsChange({
              ...settings,
              storage: {
                ...DEFAULT_STORAGE_SETTINGS,
                ...settings.storage,
                storageEnabled: checked,
              },
            })
          }
        />
      </div>

      {/* Storage Statistics */}
      {stats && (
        <div className="bg-muted/30 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Aufnahmen:</span>
            <span className="font-medium">{stats.recordingCount}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Speicher:</span>
            <span className="font-medium">{formatFileSize(stats.totalSizeBytes)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Dauer:</span>
            <span className="font-medium">{formatDuration(stats.totalDurationMs)}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1 border-t">
            <Folder className="w-3 h-3" />
            <span className="truncate">{stats.storagePath}</span>
          </div>
        </div>
      )}

      {/* Clear All Button */}
      {stats && stats.recordingCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearAll}
          disabled={isClearing}
          className="w-full text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {isClearing ? "Lösche..." : "Alle Aufnahmen löschen"}
        </Button>
      )}

      {/* Max Recordings Setting */}
      <div className="space-y-2">
        <Label htmlFor="max-recordings">Maximale Aufnahmen</Label>
        <Select
          value={String(settings.storage?.maxRecordings ?? DEFAULT_STORAGE_SETTINGS.maxRecordings)}
          onValueChange={(value) =>
            onSettingsChange({
              ...settings,
              storage: {
                ...DEFAULT_STORAGE_SETTINGS,
                ...settings.storage,
                maxRecordings: parseInt(value, 10),
              },
            })
          }
        >
          <SelectTrigger id="max-recordings">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[25, 50, 100, 200, 500].map((count) => (
              <SelectItem key={count} value={String(count)}>
                {count} Aufnahmen
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Ältere Aufnahmen werden automatisch gelöscht
        </p>
      </div>
    </div>
  );
}
