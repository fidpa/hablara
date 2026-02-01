"use client";

import { Bot, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Chat Thinking Indicator
 *
 * Visual feedback component shown during LLM response generation in chat.
 * Displays an animated spinner with "Denkt nach..." text in an assistant-style bubble.
 *
 * @returns JSX.Element - The rendered thinking indicator component
 *
 * @example
 * ```tsx
 * {isRAGLoading && <ChatThinkingIndicator />}
 * ```
 */
export function ChatThinkingIndicator(): JSX.Element {
  return (
    <article
      className="flex gap-3 flex-row"
      role="status"
      aria-live="polite"
      aria-label="Hablará denkt nach"
      data-testid="chat-thinking-indicator"
    >
      {/* Avatar - matches ChatMessageBubble assistant style */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-purple-600"
        aria-hidden="true"
      >
        <Bot className="w-4 h-4 text-white" />
      </div>

      {/* Thinking bubble */}
      <div
        className={cn(
          "flex-1 max-w-[80%] rounded-2xl px-4 py-3",
          "bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 rounded-tl-sm border border-slate-200 dark:border-transparent",
          "animate-fade-in motion-reduce:animate-none"
        )}
      >
        {/* Header with Hablará label */}
        <div className="flex items-center gap-2 mb-1 text-xs text-slate-600 dark:text-slate-400">
          <span>Hablará</span>
        </div>

        {/* Thinking indicator with spinner */}
        <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <Loader2
            className="h-4 w-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          <span>Denkt nach...</span>
        </div>
      </div>
    </article>
  );
}
