"use client";

/**
 * AudioFileImportPanel - Audio-Datei-Import mit Drag & Drop
 *
 * Drag & Drop Zone + File Dialog (Tauri native/Browser fallback). Validiert Format/Size.
 * Zeigt Duration-Preview. Max-Size-Limit via DEFAULT_INPUT_LIMITS.maxAudioFileMB.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Headphones, X, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isValidAudioFormat } from "@/lib/audio-convert";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { InputLimits } from "@/lib/types";

interface AudioFileImportPanelProps {
  onSubmit: (file: File) => void;
  disabled: boolean;
  isTauri: boolean;
  limits?: InputLimits;
}

/**
 * Audio file import panel with drag & drop and file dialog support.
 * Validates file format and size before allowing submission.
 *
 * Features:
 * - Drag & drop zone with visual feedback
 * - File dialog (Tauri native or browser fallback)
 * - File validation (format + size)
 * - File info display (name + size)
 * - Clear button
 * - Analyze button
 */
export function AudioFileImportPanel({
  onSubmit,
  disabled,
  isTauri,
  limits,
}: AudioFileImportPanelProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const maxAudioSizeMB = limits?.maxAudioFileSizeMB ?? 50;

  // Debug: Log when component mounts
  useEffect(() => {
    logger.info("AudioFileImportPanel", "Component mounted", { disabled, isTauri });
  }, [disabled, isTauri]);

  /**
   * Format file size in human-readable format
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  /**
   * Handle file selection (from drop or dialog)
   */
  const handleFileSelection = useCallback((file: File | null) => {
    logger.info("AudioFileImportPanel", "File selection triggered", {
      hasFile: !!file,
      name: file?.name,
      size: file?.size,
    });

    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Size check with dynamic limit
    if (!isValidAudioFormat(file, maxAudioSizeMB)) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      logger.warn("AudioFileImportPanel", "Invalid audio file", {
        name: file.name,
        sizeMB,
        maxSizeMB: maxAudioSizeMB,
      });
      toast({
        variant: "destructive",
        title: "Ungültige Audiodatei",
        description: `Datei zu groß (${sizeMB} MB) oder falsches Format. Max: ${maxAudioSizeMB} MB`,
      });
      return;
    }

    logger.info("AudioFileImportPanel", "File selected successfully", {
      name: file.name,
      size: file.size,
      type: file.type,
    });
    setSelectedFile(file);
  }, [maxAudioSizeMB, toast]);

  /**
   * Handle drag enter event (fires when drag enters the element)
   */
  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      logger.info("AudioFileImportPanel", "DragEnter event fired", { disabled });
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  /**
   * Handle drag over event (fires continuously while dragging over)
   */
  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      // Note: Don't log here - fires too frequently
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  /**
   * Handle drag leave event
   */
  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      logger.info("AudioFileImportPanel", "DragLeave event fired");
      setIsDragging(false);
    },
    []
  );

  /**
   * Handle drop event
   */
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      logger.info("AudioFileImportPanel", "Drop event triggered", {
        disabled,
        filesCount: e.dataTransfer.files.length,
      });

      if (disabled) {
        logger.warn("AudioFileImportPanel", "Drop ignored (disabled)");
        return;
      }

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelection(files[0] || null);
      } else {
        logger.warn("AudioFileImportPanel", "Drop event but no files");
      }
    },
    [disabled, handleFileSelection]
  );

  /**
   * Handle file input change (from dialog)
   */
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      logger.info("AudioFileImportPanel", "File input change event", {
        filesCount: e.target.files?.length ?? 0,
      });

      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileSelection(files[0] || null);
      } else {
        logger.warn("AudioFileImportPanel", "File input changed but no files");
      }
      // Reset input value to allow selecting the same file again
      e.target.value = "";
    },
    [handleFileSelection]
  );

  /**
   * Open file dialog (browser or Tauri)
   */
  const openFileDialog = useCallback(async () => {
    logger.info("AudioFileImportPanel", "Opening file dialog", { isTauri });

    if (isTauri) {
      // Tauri file dialog
      try {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const { invoke } = await import("@tauri-apps/api/core");

        const selected = await open({
          multiple: false,
          filters: [
            {
              name: "Audio",
              extensions: ["wav", "mp3", "m4a", "ogg"],
            },
          ],
        });

        if (!selected) {
          logger.info("AudioFileImportPanel", "File dialog cancelled");
          return;
        }

        logger.info("AudioFileImportPanel", "Tauri file selected", { path: selected });

        // Read file via custom Tauri command (avoids CORS issues)
        const filePath = selected as string;
        const base64Data = await invoke<string>("read_audio_file", { filePath });

        // Convert base64 to Uint8Array
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Convert to Blob
        const blob = new Blob([bytes]);
        const fileName = filePath.split("/").pop() ?? "audio";

        // Determine MIME type from extension
        const ext = fileName.split(".").pop()?.toLowerCase();
        const mimeType =
          ext === "wav" ? "audio/wav" :
          ext === "mp3" ? "audio/mpeg" :
          ext === "m4a" ? "audio/mp4" :
          ext === "ogg" ? "audio/ogg" :
          "audio/wav"; // fallback

        const file = new File([blob], fileName, { type: mimeType });

        logger.info("AudioFileImportPanel", "File loaded successfully", {
          fileName,
          size: file.size,
          type: file.type,
        });

        handleFileSelection(file);
      } catch (error: unknown) {
        logger.error("AudioFileImportPanel", "Tauri file dialog failed", error);
        // Fallback to browser input
        logger.info("AudioFileImportPanel", "Falling back to browser file input");
        fileInputRef.current?.click();
      }
    } else {
      // Browser file input
      logger.info("AudioFileImportPanel", "Using browser file input");
      fileInputRef.current?.click();
    }
  }, [isTauri, handleFileSelection]);

  /**
   * Clear selected file
   */
  const handleClear = useCallback(() => {
    setSelectedFile(null);
    logger.info("AudioFileImport", "File cleared");
  }, []);

  /**
   * Handle analyze button click
   */
  const handleAnalyze = useCallback(() => {
    if (selectedFile) {
      logger.info("AudioFileImport", "Starting analysis", {
        name: selectedFile.name,
      });
      onSubmit(selectedFile);
    } else {
      logger.warn("AudioFileImport", "Analyze clicked but no file selected");
    }
  }, [selectedFile, onSubmit]);

  return (
    <div className="flex flex-col gap-4">
      {/* Disabled state warning */}
      {disabled && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm">
          <Clock className="h-4 w-4" />
          <span>Verarbeitung läuft - bitte warten...</span>
        </div>
      )}

      {/* Drop Zone */}
      <div
        data-testid="audio-drop-zone"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors",
          "min-h-[200px]", // Ensure minimum height for drop target
          isDragging && "border-primary bg-primary/5",
          !isDragging && "border-muted-foreground/25",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Headphones className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium">Audio-Datei hierher ziehen</p>
          <p className="text-xs text-muted-foreground mt-1">oder Datei auswählen</p>
          <p className="text-xs text-muted-foreground mt-2">
            Unterstützte Formate: WAV, MP3, M4A, OGG (max. {maxAudioSizeMB} MB)
          </p>
        </div>
      </div>

      {/* Hidden file input for browser fallback */}
      <input
        ref={fileInputRef}
        data-testid="audio-file-input"
        type="file"
        accept=".wav,.mp3,.m4a,.ogg,audio/wav,audio/mpeg,audio/mp4,audio/ogg"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* File Info */}
      {selectedFile && (
        <>
          <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={disabled}
              aria-label="Clear file"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Large file warning */}
          {selectedFile && selectedFile.size > (maxAudioSizeMB * 0.8 * 1024 * 1024) && (
            <div className="flex items-center gap-2 text-xs text-amber-500">
              <AlertTriangle className="h-3 w-3" />
              Große Datei - Verarbeitung kann länger dauern
            </div>
          )}
        </>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={openFileDialog}
          disabled={disabled}
          className="flex-1"
        >
          Datei wählen
        </Button>
        <Button
          variant="default"
          onClick={handleAnalyze}
          disabled={disabled || !selectedFile}
          className="flex-1"
        >
          Analysieren
        </Button>
      </div>
    </div>
  );
}
