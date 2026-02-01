"use client";

/**
 * ChatHistory - Chat-Verlauf mit User & Assistant Messages
 *
 * Zeigt Chat-Historie (User: Transkripte, Assistant: LLM-Analysen),
 * Auto-Scroll, Copy/Clear Actions, RAG Chatbot Integration, Processing Progress,
 * Welcome State. Ersetzt TranscriptView.
 */

import { useRef, useEffect, useState, useCallback } from "react";
import type { ChatMessage, ProcessingState } from "@/lib/types";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { ChatThinkingIndicator } from "./ChatThinkingIndicator";
import { ProcessingProgress } from "./ProcessingProgress";
import { ChatInput } from "./ChatInput";
import { ChatExportButton } from "./ChatExportButton";
import { MessageSquare, Copy, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { logger } from "@/lib/logger";
import { ChatWelcomeState } from "./ChatWelcomeState";

const COPY_FEEDBACK_DURATION_MS = 2000;

interface ChatHistoryProps {
  messages: ChatMessage[];
  isRecording: boolean;
  processingState?: ProcessingState;
  onClear?: () => void;
  onCancelProcessing?: () => void;
  onRetry?: () => void;
  onSendMessage?: (text: string) => void;
  isRAGLoading?: boolean;
  isModelLoading?: boolean;
  hotkey?: string;
}

export function ChatHistory({
  messages,
  isRecording,
  processingState,
  onClear,
  onCancelProcessing,
  onRetry,
  onSendMessage,
  isRAGLoading = false,
  isModelLoading = false,
  hotkey = "Ctrl+Shift+D",
}: ChatHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevMessageCountRef = useRef(messages.length);
  const { toast } = useToast();
  const [copiedType, setCopiedType] = useState<'markdown' | 'plain' | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }

    // Announce new messages to screen readers
    if (messages.length > prevMessageCountRef.current) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage) {
        const sender = latestMessage.role === "user" ? "Du" : "Hablará";
        const preview = latestMessage.content.slice(0, 100);
        setLiveAnnouncement(`Neue Nachricht von ${sender}: ${preview}${latestMessage.content.length > 100 ? "..." : ""}`);
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const exportAsMarkdown = useCallback((): string => {
    return messages.map((msg) => {
      const timestamp = msg.timestamp.toLocaleString("de-DE");
      const role = msg.role === "user" ? "Du" : "Hablará";
      return `### ${role} (${timestamp})\n\n${msg.content}\n`;
    }).join("\n---\n\n");
  }, [messages]);

  const exportAsPlainText = useCallback((): string => {
    return messages.map((msg) => {
      const timestamp = msg.timestamp.toLocaleString("de-DE");
      const role = msg.role === "user" ? "Du" : "Hablará";
      return `[${timestamp}] ${role}:\n${msg.content}`;
    }).join("\n\n---\n\n");
  }, [messages]);

  const handleCopyMarkdown = useCallback(async () => {
    try {
      const markdown = exportAsMarkdown();
      await writeText(markdown);
      setCopiedType('markdown');
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => setCopiedType(null), COPY_FEEDBACK_DURATION_MS);
      toast({
        title: "Kopiert!",
        description: "Sprachanalyse als Markdown in die Zwischenablage kopiert.",
      });
    } catch (error: unknown) {
      logger.error('ChatHistory', 'Copy failed', error);
      toast({
        title: "Fehler",
        description: "Kopieren fehlgeschlagen. Bitte erneut versuchen.",
        variant: "destructive",
      });
    }
  }, [exportAsMarkdown, toast]);

  const handleCopyPlain = useCallback(async () => {
    try {
      const plainText = exportAsPlainText();
      await writeText(plainText);
      setCopiedType('plain');
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => setCopiedType(null), COPY_FEEDBACK_DURATION_MS);
      toast({
        title: "Kopiert!",
        description: "Sprachanalyse als Text in die Zwischenablage kopiert.",
      });
    } catch (error: unknown) {
      logger.error('ChatHistory', 'Copy failed', error);
      toast({
        title: "Fehler",
        description: "Kopieren fehlgeschlagen. Bitte erneut versuchen.",
        variant: "destructive",
      });
    }
  }, [exportAsPlainText, toast]);

  return (
    <div className="bg-white dark:bg-slate-800/50 rounded-xl p-6 h-full flex flex-col border border-slate-200 dark:border-transparent">
      {/* Live region for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {liveAnnouncement}
      </div>

      {/* Header */}
      <div data-tour-chat-header className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" aria-hidden="true" />
          Verlauf
        </h3>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyMarkdown}
                  disabled={copiedType === 'markdown'}
                  className="h-7 px-2 text-xs"
                  title="Als Markdown kopieren"
                  aria-label={copiedType === 'markdown' ? "Als Markdown kopiert" : "Als Markdown kopieren"}
                >
                  {copiedType === 'markdown' ? (
                    <Check className="w-3 h-3 text-green-600 dark:text-green-400" aria-hidden="true" />
                  ) : (
                    <Copy className="w-3 h-3" aria-hidden="true" />
                  )}
                  <span className="ml-1">Markdown</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyPlain}
                  disabled={copiedType === 'plain'}
                  className="h-7 px-2 text-xs"
                  title="Als Text kopieren"
                  aria-label={copiedType === 'plain' ? "Als Text kopiert" : "Als Text kopieren"}
                >
                  {copiedType === 'plain' ? (
                    <Check className="w-3 h-3 text-green-600 dark:text-green-400" aria-hidden="true" />
                  ) : (
                    <Copy className="w-3 h-3" aria-hidden="true" />
                  )}
                  <span className="ml-1">Text</span>
                </Button>
              </div>

              {/* Export Button */}
              <ChatExportButton messages={messages} />

              {/* Separator */}
              <div className="w-px h-5 bg-slate-300 dark:bg-slate-600" />

              {/* Clear Button with Confirmation */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                    title="Analyse-Verlauf löschen"
                    aria-label="Analyse-Verlauf löschen"
                  >
                    <Trash2 className="w-3 h-3" aria-hidden="true" />
                    <span className="ml-1">Löschen</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Verlauf löschen?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {messages.length === 1
                        ? "Diese Aktion löscht die Nachricht im Analyse-Verlauf."
                        : `Diese Aktion löscht alle ${messages.length} Nachrichten im Analyse-Verlauf.`}
                      {" "}Dies kann nicht rückgängig gemacht werden.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onClear}
                      className="bg-red-600 hover:bg-red-700 focus-visible:ring-red-600"
                    >
                      Verlauf löschen
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          {isRecording && (
            <span className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse motion-reduce:animate-none" />
              Aufnahme läuft
            </span>
          )}
        </div>
      </div>

      {/* Chat content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 min-h-[300px]"
      >
        {/* Processing indicator */}
        {(processingState?.isProcessing || processingState?.isShowingCompletion) && (
          <div className="flex items-center justify-center min-h-[200px]">
            <ProcessingProgress
              state={processingState}
              onCancel={onCancelProcessing}
              onRetry={onRetry}
              className="w-full max-w-md"
            />
          </div>
        )}

        {/* Empty state */}
        {!processingState?.isProcessing && !processingState?.isShowingCompletion && messages.length === 0 && (
          isRecording ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 dark:text-slate-400">
              <MessageSquare className="w-12 h-12 mb-4 opacity-30" aria-hidden="true" />
              <p className="text-sm text-center">Warte auf Spracheingabe...</p>
            </div>
          ) : (
            <ChatWelcomeState hotkey={hotkey} onSamplePromptClick={onSendMessage} />
          )
        )}

        {/* Messages */}
        {!processingState?.isProcessing && messages.length > 0 && (
          <ol role="list" aria-label="Analyse-Verlauf" className="space-y-4 list-none">
            {messages.map((message, index) => (
              <li key={message.id}>
                <ChatMessageBubble
                  message={message}
                  isLatest={index === messages.length - 1 && !isRAGLoading}
                />
              </li>
            ))}
            {/* Thinking indicator - shown when RAG is processing */}
            {isRAGLoading && (
              <li key="thinking-indicator">
                <ChatThinkingIndicator />
              </li>
            )}
          </ol>
        )}
      </div>

      {/* Chat Input (always visible) */}
      <ChatInput
        onSend={onSendMessage}
        disabled={isRecording || processingState?.isProcessing || isModelLoading || false}
        isLoading={isRAGLoading || isModelLoading}
        placeholder={
          isModelLoading
            ? "Wissensbasis wird vorbereitet..."
            : isRAGLoading
            ? "Suche nach Antwort..."
            : "Frage mich etwas..."
        }
      />
    </div>
  );
}
