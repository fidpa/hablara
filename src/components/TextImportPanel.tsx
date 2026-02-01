"use client";

/**
 * TextImportPanel - Text-Eingabe mit Clipboard-Support
 *
 * Textarea mit RTF-Parsing, Character-Counter (70%/90% Threshold colors), Submit-Button.
 * Enter sendet (Shift+Enter neue Zeile), IME-Support. Max-Limit via DEFAULT_INPUT_LIMITS.maxTextCharacters.
 */

import { useState, useRef, useCallback, type KeyboardEvent, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Send, FileText, Clipboard, Loader2, AlertTriangle, Ban } from "lucide-react";
import { logger } from "@/lib/logger";
import type { InputSource, InputLimits } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { isRTF, rtfToText } from "@/lib/rtf-parser";

// Character count color thresholds
const CHARACTER_COUNT_THRESHOLDS = {
  WARNING: 0.7,   // 70% - amber zone starts
  CRITICAL: 0.9,  // 90% - red zone starts
} as const;

/**
 * Determines the color class for the character counter based on current length
 * and maximum allowed characters.
 *
 * @param currentLength - Current text length
 * @param maxLength - Maximum allowed characters
 * @returns Tailwind color class string
 */
export function getCharacterCountColor(currentLength: number, maxLength: number): string {
  const percentage = currentLength / maxLength;

  if (percentage >= CHARACTER_COUNT_THRESHOLDS.CRITICAL) {
    return "text-destructive font-medium"; // 90-100%: red + bold
  }

  if (percentage >= CHARACTER_COUNT_THRESHOLDS.WARNING) {
    return "text-amber-500"; // 70-90%: amber
  }

  return "text-muted-foreground"; // 0-70%: gray
}

interface TextImportPanelProps {
  onSubmit: (text: string, source: InputSource) => void;
  disabled: boolean;
  limits?: InputLimits;
}

/**
 * TextImportPanel Component
 *
 * Allows users to import text for analysis via three methods:
 * 1. Direct textarea input (type or paste)
 * 2. File upload (.txt, .md, .rtf) - RTF auto-converted to plain text
 * 3. Clipboard paste (via button)
 *
 * Supported File Formats:
 * - .txt - Plain text
 * - .md - Markdown
 * - .rtf - Rich Text Format (macOS TextEdit default) - automatically stripped to plain text
 *
 * Features:
 * - Character count with visual warnings (0-70% gray, 70-90% amber, 90-100% red)
 * - Ctrl+Enter submit shortcut
 * - Auto-clear after submit
 * - File size validation (from AppSettings.limits.maxTextFileSizeMB)
 * - Character limit validation (from AppSettings.limits.maxTextCharacters)
 * - Disabled state during processing
 */
export default function TextImportPanel({ onSubmit, disabled, limits }: TextImportPanelProps): JSX.Element {
  const [text, setText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const maxChars = limits?.maxTextCharacters ?? 100000;
  const maxFileSizeMB = limits?.maxTextFileSizeMB ?? 10;

  const hasText = text.trim().length > 0;

  const handleTextChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;

    // Character limit check
    if (trimmed.length > maxChars) {
      toast({
        variant: "destructive",
        title: "Text zu lang",
        description: `Maximal ${maxChars.toLocaleString()} Zeichen erlaubt. Aktuell: ${trimmed.length.toLocaleString()}`,
      });
      return;
    }

    logger.info("TextImportPanel", "Submitting text", { length: trimmed.length });
    onSubmit(trimmed, "text");
    setText(""); // Clear after submit
  }, [text, onSubmit, maxChars, toast]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (hasText && !disabled) {
          handleSubmit();
        }
      }
    },
    [hasText, disabled, handleSubmit]
  );

  const handleFileImport = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      logger.info("TextImportPanel", "Reading file", { name: file.name, size: file.size });

      // WHY check file size BEFORE reading into memory:
      // - DoS Prevention: Malicious 1GB+ files would crash browser (OOM)
      // - Memory Protection: Avoid loading large files that exceed maxTextFileSizeMB limit
      // - OWASP A05:2021 (Security Misconfiguration): Validate input size at boundary
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxFileSizeMB) {
        toast({
          variant: "destructive",
          title: "Datei zu groß",
          description: `Textdateien dürfen maximal ${maxFileSizeMB} MB groß sein.`,
        });
        e.target.value = "";
        return;
      }

      const reader = new FileReader();

      reader.onload = (event) => {
        const rawContent = event.target?.result as string;
        if (!rawContent) return;

        let content = rawContent;

        // RTF Detection and Conversion
        if (isRTF(rawContent)) {
          try {
            logger.info("TextImportPanel", "RTF detected, converting to plain text");
            content = rtfToText(rawContent);
            logger.info("TextImportPanel", "RTF converted successfully", {
              originalLength: rawContent.length,
              textLength: content.length,
            });
          } catch (error: unknown) {
            logger.error("TextImportPanel", "RTF parsing failed", error);
            toast({
              variant: "destructive",
              title: "RTF-Konvertierung fehlgeschlagen",
              description: "Die Datei konnte nicht gelesen werden. Bitte als .txt speichern.",
            });
            return;
          }
        }

        // Character count check
        if (content.length > maxChars) {
          toast({
            variant: "destructive",
            title: "Datei-Inhalt zu lang",
            description: `Maximal ${maxChars.toLocaleString()} Zeichen erlaubt. Datei enthält: ${content.length.toLocaleString()}`,
          });
          return;
        }

        setText(content);
        logger.info("TextImportPanel", "File content loaded", { length: content.length });
      };

      reader.onerror = () => {
        logger.error("TextImportPanel", "Failed to read file");
      };

      reader.readAsText(file);

      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [maxFileSizeMB, maxChars, toast]
  );

  const handleClipboardImport = useCallback(async () => {
    if (disabled) return;

    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText) return;

      // Character count check
      if (clipboardText.length > maxChars) {
        toast({
          variant: "destructive",
          title: "Zwischenablage zu lang",
          description: `Maximal ${maxChars.toLocaleString()} Zeichen erlaubt. Zwischenablage enthält: ${clipboardText.length.toLocaleString()}`,
        });
        return;
      }

      setText(clipboardText);
      logger.info("TextImportPanel", "Clipboard content imported", {
        length: clipboardText.length,
      });

      // Focus textarea to show user the imported content
      const textarea = document.getElementById("text-import-textarea");
      if (textarea) {
        textarea.focus();
      }

      // Provide feedback on successful import
      toast({
        title: "Text eingefügt",
        description: `${clipboardText.length.toLocaleString()} Zeichen geladen`,
      });
    } catch (error: unknown) {
      logger.error("TextImportPanel", "Failed to read clipboard", error);
      toast({
        variant: "destructive",
        title: "Zwischenablage-Zugriff fehlgeschlagen",
        description: "Bitte Text manuell in das Textfeld einfügen (Ctrl+V)",
      });
    }
  }, [disabled, maxChars, toast]);

  return (
    <Card className="p-6 space-y-4">
      <div className="space-y-2">
        <label htmlFor="text-import-textarea" className="text-sm font-medium">
          Text für Analyse
        </label>
        <textarea
          id="text-import-textarea"
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Text hier eingeben oder über Datei/Zwischenablage importieren..."
          className={cn(
            "w-full min-h-[200px] p-3 rounded-md border border-input bg-background",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "resize-y font-mono text-sm"
          )}
        />
        <div className="flex items-center justify-between text-xs">
          <span className={getCharacterCountColor(text.length, maxChars)}>
            {text.length.toLocaleString()} / {maxChars.toLocaleString()} Zeichen
            {text.length >= maxChars && <Ban className="inline h-3 w-3 ml-1" />}
            {text.length >= maxChars * CHARACTER_COUNT_THRESHOLDS.CRITICAL && text.length < maxChars && (
              <AlertTriangle className="inline h-3 w-3 ml-1" />
            )}
          </span>
          <span className="text-muted-foreground">Ctrl+Enter zum Absenden</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={handleSubmit}
          disabled={!hasText || disabled || text.trim().length > maxChars}
          className="flex-1"
          size="lg"
          aria-label={disabled ? "Text wird analysiert" : "Text analysieren"}
          aria-busy={disabled}
        >
          {disabled ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Verarbeite...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" aria-hidden="true" />
              Analysieren
            </>
          )}
        </Button>

        <Button
          onClick={handleFileImport}
          disabled={disabled}
          variant="outline"
          size="lg"
          title="Datei importieren (.txt, .md, .rtf)"
          aria-label="Datei importieren"
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
        </Button>

        <Button
          onClick={handleClipboardImport}
          disabled={disabled}
          variant="outline"
          size="lg"
          title="Aus Zwischenablage einfügen"
          aria-label="Aus Zwischenablage einfügen"
        >
          <Clipboard className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.rtf"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
    </Card>
  );
}
