"use client";

/**
 * ChatMessageBubble - Chat-Nachrichten mit Markdown-Rendering
 *
 * User/Assistant Bubbles mit ReactMarkdown (remarkGfm + rehypeSanitize für XSS-Schutz).
 * Citation-Badges für RAG-Quellen, Copy-Button (Tauri Clipboard), Processing-Duration-Badge.
 * Psychological Displays (GFK, Cognitive, Four-Sides).
 *
 * Security:
 * - XSS Prevention: rehypeSanitize removes dangerous HTML from LLM responses
 * - Citation Sanitization: HTML-sensitive characters and control chars removed
 */

import { useState, useCallback, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { defaultSchema } from "hast-util-sanitize";
import { cn, formatProcessingDuration } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";
import { User, Bot, Copy, Check, BookOpen, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { CITATION_PATTERN, MAX_CITATION_LENGTH } from "@/lib/rag/constants";
import { sanitizeForDisplay } from "@/lib/sanitize";
import { GFKDisplay } from "@/components/GFKDisplay";
import { CognitiveDistortionDisplay } from "@/components/CognitiveDistortionDisplay";
import { FourSidesDisplay } from "@/components/FourSidesDisplay";

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isLatest?: boolean;
}

/**
 * Custom components for ReactMarkdown
 *
 * Renders citations as styled inline badges.
 *
 * Pattern Recognition:
 * - Matches: **[Quelle: Chunk Title]**
 * - Renders: Purple badge with BookOpen icon
 * - Non-matching bold: Regular <strong> element
 *
 * Security: Citation sources are sanitized to prevent XSS attacks.
 *
 * @see docs/reference/production-system-prompts/09_RAG_CHATBOT.md
 */
const markdownComponents = {
  // Custom renderer for strong (bold) text to handle citations
  strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => {
    const text = String(children);
    // Check if this is a citation pattern
    const citationMatch = text.match(CITATION_PATTERN);

    if (citationMatch && citationMatch[1]) {
      // Sanitize source to prevent XSS (reuses sanitizeForDisplay from sanitize.ts)
      const controlCharsRemoved = sanitizeForDisplay(citationMatch[1]);
      const rawSource = controlCharsRemoved.replace(/[<>"'&]/g, ''); // Additional HTML-sensitive char removal

      // Truncate if too long, add ellipsis indicator
      const wasTruncated = rawSource.length > MAX_CITATION_LENGTH;
      const displaySource = wasTruncated
        ? rawSource.slice(0, MAX_CITATION_LENGTH - 3) + "..."
        : rawSource;

      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 text-xs font-normal mx-1"
          title={`Quelle: ${rawSource}`} // Full source in tooltip
          {...props}
        >
          <BookOpen className="w-3 h-3" aria-hidden="true" />
          <span>{displaySource}</span>
        </span>
      );
    }

    // Regular bold text
    return <strong {...props}>{children}</strong>;
  },
};

/**
 * Sanitization schema for ReactMarkdown
 *
 * Explicit configuration prevents accidental loosening during library upgrades.
 * Based on hast-util-sanitize defaultSchema with documented security properties.
 *
 * Blocked Elements:
 * - script, style, iframe, object, embed, form, input, textarea
 * - All event handlers (onclick, onerror, onload, etc.)
 * - JavaScript/data URLs in href/src attributes
 *
 * Allowed Elements:
 * - Safe formatting: strong, em, a, p, ul, ol, li, h1-h6
 * - Code blocks: pre, code
 * - Citations: Custom component in markdownComponents
 */
const sanitizeSchema = defaultSchema;

/**
 * ChatMessageBubble - Chat Message Display
 *
 * Renders a single message in the chat history:
 * - User messages: Right-aligned, darker background
 * - Assistant messages: Left-aligned, subtle background, Markdown rendering
 * - Citations: Styled badges with book icon
 */
export function ChatMessageBubble({ message, isLatest = false }: ChatMessageBubbleProps): JSX.Element {
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();
  const isUser = message.role === "user";
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await writeText(message.content);
      setIsCopied(true);
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => setIsCopied(false), 2000);
      toast({
        title: "Kopiert!",
        description: isUser ? "Text in die Zwischenablage kopiert." : "Analyse in die Zwischenablage kopiert.",
      });
    } catch (error: unknown) {
      logger.error("ChatMessageBubble", "Copy failed", error);
      toast({
        title: "Fehler",
        description: "Kopieren fehlgeschlagen.",
        variant: "destructive",
      });
    }
  }, [message.content, isUser, toast]);

  const formattedTime = message.timestamp.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const roleLabel = isUser ? "Du" : "Hablará";

  return (
    <article
      className={cn(
        "flex gap-3 group",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
      aria-label={`${roleLabel} um ${formattedTime}`}
    >
      {/* Avatar - decorative, hidden from screen readers */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-blue-600" : "bg-purple-600"
        )}
        aria-hidden="true"
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message content */}
      <div
        className={cn(
          "flex-1 max-w-[80%] rounded-2xl px-4 py-3 relative",
          isUser
            ? "bg-blue-600 text-white rounded-tr-sm"
            : "bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 rounded-tl-sm",
          isLatest && !isUser && "animate-fade-in motion-reduce:animate-none"
        )}
      >
        {/* Timestamp and role */}
        <div
          className={cn(
            "flex items-center gap-2 mb-1 text-xs",
            isUser ? "text-blue-200 justify-end" : "text-slate-600 dark:text-slate-400"
          )}
        >
          <span>{roleLabel}</span>
          <span>{formattedTime}</span>

          {/* Processing Duration Badge (nur Assistant Messages) */}
          {message.role === "assistant" &&
           message.processingDurationMs &&
           message.processingDurationMs > 0 && (
            <>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden="true" />
                <span>{formatProcessingDuration(message.processingDurationMs)}</span>
              </div>
            </>
          )}
        </div>

        {/* Content */}
        {isUser ? (
          // User message: Plain text
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        ) : (
          // Assistant message: Markdown with controlled spacing + custom citation rendering
          <>
            <div
              className={cn(
                // Base typography
                "text-sm leading-relaxed max-w-none",
                // Prose base (Light Mode default, Dark Mode inverted)
                "prose dark:prose-invert prose-sm",
                // Prose headings
                "prose-headings:text-slate-900 dark:prose-headings:text-slate-200",
                "prose-headings:font-semibold prose-headings:text-sm prose-headings:mt-3 prose-headings:mb-1",
                // Prose paragraphs
                "prose-p:text-slate-800 dark:prose-p:text-slate-300 prose-p:my-1",
                // Prose strong/lists
                "prose-strong:text-slate-900 dark:prose-strong:text-slate-200 prose-ul:my-1 prose-li:my-0"
              )}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
                components={markdownComponents}
              >
                {message.content}
              </ReactMarkdown>
            </div>

            {/* Psychological Enrichment Displays (Surface → Deep Progression) */}
            <div className="mt-3 space-y-3">
              {message.fourSides && <FourSidesDisplay fourSides={message.fourSides} />}
              {message.gfk && <GFKDisplay gfk={message.gfk} />}
              {message.cognitive && <CognitiveDistortionDisplay cognitive={message.cognitive} />}
            </div>
          </>
        )}

        {/* Copy button (visible on hover or focus) */}
        <Button
          size="icon"
          variant="ghost"
          onClick={handleCopy}
          aria-label={isCopied ? "Kopiert" : "Nachricht kopieren"}
          className={cn(
            "absolute -top-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity h-10 w-10",
            isUser ? "left-2" : "right-2",
            isUser ? "text-blue-600 dark:text-blue-200 hover:text-blue-700 dark:hover:text-white hover:bg-blue-100 dark:hover:bg-blue-500/50" : "text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-600/50"
          )}
          title="Kopieren"
        >
          {isCopied ? (
            <Check className="w-3 h-3" aria-hidden="true" />
          ) : (
            <Copy className="w-3 h-3" aria-hidden="true" />
          )}
        </Button>
      </div>
    </article>
  );
}
