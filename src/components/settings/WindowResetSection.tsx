"use client";

/**
 * WindowResetSection - Fenstergröße zurücksetzen
 *
 * Button zum Zurücksetzen von Fenstergröße/Position auf DEFAULT_WINDOW_STATE (1280x1440).
 * Nur in Tauri-Umgebung verfügbar. Pattern konsistent mit ZoomSection.
 */

import { useCallback } from "react";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useWindowState } from "@/hooks/useWindowState";
import { DEFAULT_WINDOW_STATE } from "@/lib/types";
import { logger } from "@/lib/logger";
export function WindowResetSection() {
  const { resetToDefaults, isAvailable } = useWindowState();
  const { toast } = useToast();

  const handleReset = useCallback(async () => {
    try {
      await resetToDefaults();

      toast({
        title: "Fenstergröße zurückgesetzt",
        description: `Das Fenster wurde auf die Standardgröße (${DEFAULT_WINDOW_STATE.width}×${DEFAULT_WINDOW_STATE.height}) zurückgesetzt.`,
      });

      logger.info('WindowResetSection', 'Window reset successful - user feedback shown');
    } catch (error) {
      logger.error('WindowResetSection', 'Reset failed - showing error toast', error);

      toast({
        variant: "destructive",
        title: "Fehler beim Zurücksetzen",
        description: "Die Fenstergröße konnte nicht zurückgesetzt werden. Bitte versuche es erneut.",
      });
    }
  }, [resetToDefaults, toast]);

  // Only show in Tauri environment
  if (!isAvailable) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Home className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h3 className="text-sm font-medium">Fenstergröße</h3>
      </div>

      <div className="space-y-2">
        <Button
          variant="outline"
          onClick={handleReset}
          className="w-full"
        >
          Fenstergröße zurücksetzen
        </Button>

        <p className="text-xs text-muted-foreground">
          Setzt Fenstergröße und -position auf Standardwerte zurück ({DEFAULT_WINDOW_STATE.width}×{DEFAULT_WINDOW_STATE.height} px, zentriert).
        </p>
      </div>

      <Separator className="mt-6" />
    </div>
  );
}
