"use client";

/**
 * OnboardingSection - Tour Restart + Setup Hints
 *
 * Buttons zum Zurücksetzen der Onboarding Tour (localStorage-Flag löschen) und
 * zum erneuten Anzeigen von Setup-Hinweisen. Schließt Settings-Panel automatisch vor Modal-Anzeige.
 */

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { STORAGE_KEYS } from "@/lib/types";
import { RefreshCcw, Info } from "lucide-react";

interface OnboardingSectionProps {
  onRestartSetupHints?: () => void;
  onCloseSettings?: () => void;
}

export function OnboardingSection({ onRestartSetupHints, onCloseSettings }: OnboardingSectionProps) {
  const { toast } = useToast();

  const handleRestartTour = () => {
    localStorage.removeItem(STORAGE_KEYS.TOUR_COMPLETED);
    toast({
      title: "Tour zurückgesetzt",
      description: "Die Willkommens-Tour wird beim nächsten Start angezeigt.",
    });
  };

  const handleShowSetupHints = () => {
    // Close Settings FIRST so modal isn't covered
    onCloseSettings?.();

    // Trigger Setup Hints Modal
    onRestartSetupHints?.();

    toast({
      title: "Setup-Hinweise",
      description: "Die Einrichtungshinweise werden angezeigt.",
      duration: 2000,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
          Einführung
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Zeige die Willkommens-Tour oder Setup-Hinweise erneut an
        </p>
      </div>

      {/* Tour Restart Button */}
      <Button variant="outline" onClick={handleRestartTour} className="w-full">
        <RefreshCcw className="w-4 h-4 mr-2" aria-hidden="true" />
        Tour erneut starten
      </Button>

      {/* Setup Hints Button */}
      <Button variant="outline" onClick={handleShowSetupHints} className="w-full">
        <Info className="w-4 h-4 mr-2" aria-hidden="true" />
        Setup-Hinweise anzeigen
      </Button>
    </div>
  );
}
