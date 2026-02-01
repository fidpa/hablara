"use client";

import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from "react";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { sanitizeInput } from "@/lib/sanitize";

/**
 * ChatInput - Auto-Resizing Textarea mit Send Button
 *
 * Enter sendet (Shift+Enter für neue Zeile), IME-Support (Japanisch/Koreanisch/Chinesisch),
 * 1-3 Zeilen sichtbar (max 120px). Loading State mit Spinner. Basiert auf run-llama/chat-ui (MIT).
 *
 * Security:
 * - Input Sanitization: Control characters removed, Unicode normalized (OWASP A03:2021)
 * - Length Limit: 10,000 characters for RAG chat prompts
 */

/**
 * Layout and validation constants for ChatInput component
 * Exported for test access (Dynamic Values Pattern compliance)
 */
export const CHAT_INPUT_CONSTANTS = {
  /** Maximum height in pixels (~3 lines of text) */
  MAX_HEIGHT_PX: 120,
  /** Minimum height in pixels (1 line) */
  MIN_HEIGHT_PX: 40,
  /** Maximum input length (10,000 chars for RAG chat prompts) */
  MAX_LENGTH: 10000,
} as const;

interface ChatInputProps {
  onSend?: (text: string) => void | Promise<void>;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  isLoading = false,
  placeholder = "Frage mich etwas...",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [isComposing, setIsComposing] = useState(false); // IME composition
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get correct scrollHeight
    textarea.style.height = "auto";
    // Set height based on content (max ~3 lines)
    const newHeight = Math.min(textarea.scrollHeight, CHAT_INPUT_CONSTANTS.MAX_HEIGHT_PX);
    textarea.style.height = `${newHeight}px`;
  }, []);

  // Adjust height when value changes
  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // Handle send (async to wait for onSend completion)
  const handleSend = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || disabled || isLoading) return;

    // Sanitize input (remove control characters, normalize Unicode)
    const sanitized = sanitizeInput(trimmed);
    if (!sanitized) return; // Empty after sanitization

    try {
      // CRITICAL: Await onSend to prevent data loss on async errors
      await onSend?.(sanitized);

      // Only clear input if onSend succeeded
      setValue("");

      // Reset textarea height after send
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      });
    } catch (error: unknown) {
      // CRITICAL: Keep input value on error - user can retry without re-typing
      logger.error('ChatInput', 'Send failed - input preserved for retry', error);
      // Note: Error toast should be shown by parent component (e.g., handleChatQuestion)
    }
  }, [value, disabled, isLoading, onSend]);

  // Handle Enter key (IME-aware)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter without Shift = send (unless composing IME input)
      if (e.key === "Enter" && !e.shiftKey && !isComposing) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend, isComposing]
  );

  // IME composition events (for Japanese/Korean/Chinese input)
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false);
  }, []);

  const isDisabled = disabled || isLoading;

  return (
    <div data-tour-chat-input className="flex items-end gap-2 p-3 border-t border-border bg-background/50 backdrop-blur-sm">
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        placeholder={placeholder}
        disabled={isDisabled}
        rows={1}
        maxLength={CHAT_INPUT_CONSTANTS.MAX_LENGTH}
        className={cn(
          "flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2",
          "text-sm leading-relaxed placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-all duration-200 ease-out"
        )}
        style={{
          minHeight: `${CHAT_INPUT_CONSTANTS.MIN_HEIGHT_PX}px`,
          maxHeight: `${CHAT_INPUT_CONSTANTS.MAX_HEIGHT_PX}px`,
          overflowY: value.split("\n").length > 3 ? "auto" : "hidden",
        }}
      />

      {/* Send Button */}
      <button
        onClick={handleSend}
        disabled={isDisabled || !value.trim()}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg",
          "bg-primary text-primary-foreground hover:bg-primary/90",
          "transition-all duration-200",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
        aria-label="Nachricht senden"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <Send className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
