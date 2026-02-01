"use client";

/**
 * ChatExportButton - Chat-Verlauf exportieren
 *
 * Dropdown-Button mit 3 Formaten: TXT, Markdown, PDF. Verwendet exportChatHistory-Library.
 * Toast mit "In Finder zeigen"-Action (nur Tauri). Filename: "hablara-chat-YYYYMMDD-HHMMSS".
 */

import { useState, useCallback } from "react";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useTauri } from "@/hooks/useTauri";
import { revealInFinder } from "@/lib/ui/finder-utils";
import { showFinderErrorToast } from "@/lib/ui/toast-utils";
import { exportChatHistory, DEFAULT_EXPORT_OPTIONS } from "@/lib/export-chat";
import type { ChatMessage } from "@/lib/types";
import type { ExportFormat } from "@/lib/export-chat";

interface ChatExportButtonProps {
  messages: ChatMessage[];
  disabled?: boolean;
}

export function ChatExportButton({ messages, disabled }: ChatExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const { isTauri } = useTauri();

  const handleExport = useCallback(async (format: ExportFormat) => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      // Unified export - jsPDF handles all formats consistently
      const result = await exportChatHistory(messages, format, DEFAULT_EXPORT_OPTIONS);

      if (result.success && result.filePath) {
        let action: React.ReactElement | undefined;

        // "Im Finder anzeigen" nur für Tauri
        if (isTauri) {
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
          description: `Sprachanalyse als ${format.toUpperCase()} gespeichert`,
          action,
          duration: 5000,
        });
      } else if (result.error) {
        toast({
          title: "Export fehlgeschlagen",
          description: result.error,
          variant: "destructive",
        });
      }
      // User cancelled → silent (kein Toast)
    } finally {
      setIsExporting(false);
    }
  }, [messages, toast, isExporting, isTauri]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isExporting || messages.length === 0}
          title={messages.length === 0 ? "Keine Nachrichten zum Exportieren" : undefined}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Exportieren
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("markdown")}>
          <FileText className="mr-2 h-4 w-4" />
          Als Markdown (.md)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("txt")}>
          <FileText className="mr-2 h-4 w-4" />
          Als Text (.txt)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("pdf")}>
          <Download className="mr-2 h-4 w-4" />
          Als PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("docx")}>
          <FileText className="mr-2 h-4 w-4" />
          Als Word (.docx)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
