"use client";

/**
 * HotkeySection - Hotkey Configuration Sektion
 *
 * Zeigt aktuellen Recording Hotkey (z.B. "Ctrl+Shift+D"). Nur informativ in MVP,
 * Edit-Feature geplant für Post-Deadline. Nutzt DEFAULT_SETTINGS.hotkey.
 */

import type { AppSettings } from "@/lib/types";
import { Label } from "@/components/ui/label";

interface HotkeySectionProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export function HotkeySection({
  settings,
  onSettingsChange,
}: HotkeySectionProps): JSX.Element {
  return (
    <div className="space-y-2">
      <Label htmlFor="hotkey">Hotkey</Label>
      <input
        id="hotkey"
        type="text"
        value={settings.hotkey}
        onChange={(e) =>
          onSettingsChange({ ...settings, hotkey: e.target.value })
        }
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      <p className="text-xs text-muted-foreground">
        Format: Control+Shift+D (macOS: Control-Taste, Windows: Ctrl)
      </p>
    </div>
  );
}
