"use client";

/**
 * TourSection - Onboarding Tour Restart
 *
 * Button zum Zurücksetzen der Onboarding Tour (localStorage-Flag löschen).
 * Tour wird beim nächsten App-Start erneut angezeigt.
 */

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { STORAGE_KEYS } from "@/lib/types";
import { RefreshCcw } from "lucide-react";

export function TourSection() {
  const { toast } = useToast();

  const handleRestartTour = () => {
    localStorage.removeItem(STORAGE_KEYS.TOUR_COMPLETED);
    toast({
      title: "Tour zurückgesetzt",
      description: "Die Willkommens-Tour wird beim nächsten Start angezeigt.",
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
          Willkommens-Tour
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Zeige die interaktive Einführung erneut an
        </p>
      </div>
      <Button variant="outline" onClick={handleRestartTour}>
        <RefreshCcw className="w-4 h-4 mr-2" />
        Tour erneut starten
      </Button>
    </div>
  );
}
