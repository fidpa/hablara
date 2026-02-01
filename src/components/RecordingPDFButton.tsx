"use client";

/**
 * Recording PDF Export Button
 *
 * Download button for exporting individual recording analyses as PDF.
 *
 * @see docs/explanation/decisions/ADR-040-recording-pdf-export.md
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { exportRecordingAsPDF } from "@/lib/export-recording";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useTauri } from "@/hooks/useTauri";
import { logger } from "@/lib/logger";
import { revealInFinder } from "@/lib/ui/finder-utils";
import { showFinderErrorToast } from "@/lib/ui/toast-utils";
import type { RecordingMetadata } from "@/lib/types";

interface RecordingPDFButtonProps {
  /** Recording metadata object */
  recording: RecordingMetadata;
  /** Optional custom class name */
  className?: string;
  /** Button size variant */
  size?: "default" | "sm" | "lg" | "icon";
}

/**
 * Button component for exporting a recording as PDF
 *
 * Features:
 * - Loading state during PDF generation
 * - Success/error toasts
 * - Silent handling of user cancellation
 * - Disabled when no transcript available
 */
export function RecordingPDFButton({
  recording,
  className,
  size = "icon",
}: RecordingPDFButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const { isTauri } = useTauri();

  // Check if transcript is available
  const hasTranscript =
    recording.transcription?.text && recording.transcription.text.length > 0;

  const handleExport = useCallback(async () => {
    if (isExporting || !hasTranscript) return;

    setIsExporting(true);
    try {
      logger.info("RecordingPDFButton", "Starting PDF export", {
        recordingId: recording.id,
      });

      const result = await exportRecordingAsPDF(recording.id);

      if (result.cancelled) {
        // User cancelled - silent (no toast)
        logger.info("RecordingPDFButton", "User cancelled PDF export");
        return;
      }

      if (result.success) {
        let action: React.ReactElement | undefined;

        // "Im Finder anzeigen" nur für Tauri mit filePath
        if (isTauri && result.filePath) {
          const filePath = result.filePath;
          action = (
            <ToastAction
              altText="Im Finder anzeigen"
              onClick={async () => {
                const revealResult = await revealInFinder(filePath);
                if (!revealResult.success && revealResult.error) {
                  showFinderErrorToast(toast, revealResult.error);
                }
              }}
            >
              Im Finder anzeigen
            </ToastAction>
          );
        }

        toast({
          title: "Export erfolgreich",
          description: result.filePath
            ? `Gespeichert: ${result.filePath.split("/").pop()}`
            : "Analyse als PDF gespeichert",
          action,
          duration: 5000,
        });

        logger.info("RecordingPDFButton", "PDF exported successfully", {
          filePath: result.filePath,
        });
      } else {
        toast({
          title: "Export fehlgeschlagen",
          description: result.error || "PDF-Export fehlgeschlagen",
          variant: "destructive",
        });
        logger.error("RecordingPDFButton", "PDF export failed", {
          error: result.error,
        });
      }
    } catch (error) {
      logger.error("RecordingPDFButton", "PDF export error", error);
      toast({
        title: "Fehler",
        description: "PDF-Export fehlgeschlagen",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, hasTranscript, recording.id, toast, isTauri]);

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleExport}
      disabled={isExporting || !hasTranscript}
      className={className}
      aria-label={
        !hasTranscript
          ? "PDF-Export nicht verfügbar (kein Transkript)"
          : isExporting
            ? "PDF wird generiert..."
            : "Als PDF exportieren"
      }
      title={
        !hasTranscript
          ? "Kein Transkript vorhanden"
          : isExporting
            ? "PDF wird generiert..."
            : "Als PDF exportieren"
      }
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <FileDown className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  );
}
