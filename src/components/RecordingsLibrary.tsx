"use client";

/**
 * RecordingsLibrary - Gespeicherte Aufnahmen-Bibliothek
 *
 * Card-Grid mit Audio-Player, Metadata, Emotion/Fallacy/Tone/Topic Tags, PDF-Export, Delete.
 * Refresh-Button, Warning-Banner bei partial failures. "In Finder zeigen" Toast-Action (Tauri).
 */

import React, { useState, useCallback } from "react";
import { useRecordings, formatDuration, formatFileSize, formatDate } from "@/hooks/useRecordings";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useTauri } from "@/hooks/useTauri";
import { revealInFinder } from "@/lib/ui/finder-utils";
import { showFinderErrorToast } from "@/lib/ui/toast-utils";
import { AudioPlayer } from "./AudioPlayer";
import { TopicTag } from "./TopicTag";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  X,
  RefreshCw,
  Trash2,
  Play,
  Download,
  Folder,
  HardDrive,
  Clock,
  FileAudio,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { RecordingPDFButton } from "./RecordingPDFButton";
import { cn } from "@/lib/utils";
import type { RecordingMetadata, TopicType, AnalysisStatus } from "@/lib/types";
import { hasPartialFailure } from "@/lib/types";
import { FEATURE_REGISTRY } from "@/lib/features/feature-registry";

// Mapping from AnalysisStatus keys to FEATURE_REGISTRY IDs (P1-4: Dynamic Values Pattern)
const STATUS_TO_FEATURE_MAP: Record<keyof AnalysisStatus, string> = {
  emotion: "emotion_analysis",
  fallacy: "fallacy_detection",
  tone: "tone_analysis",
  gfk: "gfk_analysis",
  cognitive: "cognitive_distortions",
  fourSides: "four_sides_model",
  topic: "topic_classification",
};

interface RecordingsLibraryProps {
  onClose: () => void;
}

interface RecordingCardProps {
  recording: RecordingMetadata;
  isExpanded: boolean;
  onToggle: () => void;
  onPlay: () => void;
  onDownload: () => void;
  onDelete: () => void;
  playingId: string | null;
  audioData: string | null;
}

function RecordingCard({
  recording,
  isExpanded,
  onToggle,
  onPlay,
  onDownload,
  onDelete,
  playingId,
  audioData,
}: RecordingCardProps) {
  const hasTranscription = recording.transcription?.text && recording.transcription.text.length > 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium truncate">
              {formatDate(recording.createdAt)}
            </CardTitle>
            <CardDescription className="text-xs flex items-center gap-2 mt-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {formatDuration(recording.durationMs)}
              <span className="text-muted-foreground">|</span>
              <FileAudio className="h-3 w-3" aria-hidden="true" />
              {formatFileSize(recording.fileSize)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPlay}
              className={cn(
                "h-7 w-7",
                playingId === recording.id && "animate-pulse motion-reduce:animate-none"
              )}
              aria-label={playingId === recording.id ? "Wiedergabe stoppen" : "Aufnahme abspielen"}
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDownload}
              className="h-7 w-7"
              aria-label="Audio herunterladen"
              title="Audio herunterladen (.wav)"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <RecordingPDFButton
              recording={recording}
              className="h-7 w-7"
              size="icon"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-7 w-7 text-destructive hover:text-destructive"
              aria-label="Aufnahme löschen"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Badges + Topic Tag */}
        <div className="flex flex-wrap gap-1 mt-2">
          {recording.analysisResult?.topic && (
            <TopicTag
              topic={{
                topic: recording.analysisResult.topic.topic as TopicType,
                confidence: recording.analysisResult.topic.confidence,
                keywords: recording.analysisResult.topic.keywords,
              }}
              size="sm"
              showConfidence={false}
            />
          )}
          <Badge variant="outline" className="text-xs">
            {recording.provider}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {recording.model}
          </Badge>
          {recording.vadStats && (
            <Badge
              variant={recording.vadStats.speechRatio > 0.5 ? "default" : "secondary"}
              className="text-xs"
            >
              {Math.round(recording.vadStats.speechRatio * 100)}% Speech
            </Badge>
          )}
          {!recording.audioValidation.passed && (
            <Badge variant="destructive" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" aria-hidden="true" />
              Validierung fehlgeschlagen
            </Badge>
          )}
        </div>
      </CardHeader>

      {/* Transcription preview / expand */}
      <CardContent className="p-3 pt-0">
        {hasTranscription && (
          <div
            className={cn(
              "text-sm text-muted-foreground",
              !isExpanded && "line-clamp-2"
            )}
          >
            {recording.transcription!.text}
          </div>
        )}

        {!hasTranscription && (
          <div className="text-sm text-muted-foreground italic">
            Keine Transkription verfügbar
          </div>
        )}

        {/* Expand/collapse button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="w-full mt-2 h-7 text-xs"
          aria-expanded={isExpanded}
          aria-controls={`recording-details-${recording.id}`}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" aria-hidden="true" />
              Weniger anzeigen
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" aria-hidden="true" />
              Details anzeigen
            </>
          )}
        </Button>

        {/* Expanded details */}
        {isExpanded && (
          <div id={`recording-details-${recording.id}`} className="mt-3 pt-3 border-t space-y-2 text-xs">
            {/* WARNING BANNER - P1-4: LLM Error Fallback UX */}
            {recording.analysisStatus && hasPartialFailure(recording.analysisStatus) && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-2 mb-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                      Einige Analysen konnten nicht durchgeführt werden
                    </p>
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs text-muted-foreground">Nicht verfügbar:</p>
                      <ul className="text-xs text-muted-foreground list-disc list-inside pl-2">
                        {(Object.entries(recording.analysisStatus) as [keyof AnalysisStatus, string][])
                          .filter(([_, status]) => status === "failed")
                          .map(([key]) => {
                            const featureId = STATUS_TO_FEATURE_MAP[key];
                            const feature = FEATURE_REGISTRY[featureId];
                            return feature ? <li key={key}>{feature.name}</li> : null;
                          })}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Sample Rate:</span>{" "}
                {recording.sampleRate} Hz
              </div>
              <div>
                <span className="text-muted-foreground">Version:</span>{" "}
                {recording.appVersion}
              </div>
              {recording.vadStats && (
                <>
                  <div>
                    <span className="text-muted-foreground">Original Samples:</span>{" "}
                    {recording.vadStats.originalSamples}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Filtered Samples:</span>{" "}
                    {recording.vadStats.filteredSamples}
                  </div>
                </>
              )}
              {recording.audioValidation && (
                <div>
                  <span className="text-muted-foreground">RMS Energy:</span>{" "}
                  {recording.audioValidation.rmsEnergy.toFixed(4)}
                </div>
              )}
              {recording.textFilter && recording.textFilter.fillerWordsRemoved > 0 && (
                <div>
                  <span className="text-muted-foreground">Filler entfernt:</span>{" "}
                  {recording.textFilter.fillerWordsRemoved}
                </div>
              )}
            </div>

            {/* Processing time */}
            {recording.transcription?.processingTimeMs && (
              <div className="text-muted-foreground">
                Verarbeitung: {recording.transcription.processingTimeMs}ms
              </div>
            )}
          </div>
        )}

        {/* Inline Audio Player (when this card is playing) */}
        {playingId === recording.id && audioData && (
          <div
            className={cn(
              "mt-3 pt-3 border-t",
              "transition-all duration-300 ease-in-out",
              "motion-reduce:transition-none"
            )}
            role="region"
            aria-live="polite"
            aria-label="Audio Player"
            ref={(node) => {
              // Focus first interactive element when player appears
              if (node) {
                const playButton = node.querySelector('button[aria-label*="Play"]');
                if (playButton instanceof HTMLElement) {
                  setTimeout(() => playButton.focus(), 300);
                }
              }
            }}
          >
            <AudioPlayer
              audioData={audioData}
              autoPlay={true}
              onPlayStateChange={() => {
                // Optional: Additional logic when play state changes
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Memoize RecordingCard to prevent unnecessary re-renders
const MemoizedRecordingCard = React.memo(
  RecordingCard,
  (prevProps, nextProps) => {
    // Only re-render if relevant props changed
    return (
      prevProps.recording.id === nextProps.recording.id &&
      prevProps.isExpanded === nextProps.isExpanded &&
      prevProps.playingId === nextProps.playingId &&
      prevProps.audioData === nextProps.audioData
    );
  }
);
MemoizedRecordingCard.displayName = "RecordingCard";

export function RecordingsLibrary({ onClose }: RecordingsLibraryProps): JSX.Element {
  const {
    recordings,
    isLoading,
    error,
    stats,
    refresh,
    getRecordingAudio,
    downloadRecording,
    deleteRecording,
    clearAllRecordings,
  } = useRecordings();

  const { toast } = useToast();
  const { isTauri } = useTauri();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioData, setAudioData] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [recordingToDelete, setRecordingToDelete] = useState<string | null>(null);

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handlePlay = useCallback(
    async (id: string) => {
      if (playingId === id) {
        // Stop playing
        setPlayingId(null);
        setAudioData(null);
        return;
      }

      // Load and play
      const data = await getRecordingAudio(id);
      if (data) {
        setPlayingId(id);
        setAudioData(data);
      }
    },
    [playingId, getRecordingAudio]
  );

  const handleDownload = useCallback(
    async (id: string, createdAt: string) => {
      const result = await downloadRecording(id, createdAt);

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
          title: "Download erfolgreich",
          description: result.filePath
            ? `Gespeichert: ${result.filePath.split("/").pop()}`
            : "Aufnahme heruntergeladen",
          action,
          duration: 5000,
        });
      } else if (result.error) {
        toast({
          title: "Download fehlgeschlagen",
          description: result.error,
          variant: "destructive",
        });
      }
      // result.cancelled → silent (kein Toast)
    },
    [downloadRecording, toast, isTauri]
  );

  const handleDelete = useCallback((id: string) => {
    setRecordingToDelete(id);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!recordingToDelete) return;

    await deleteRecording(recordingToDelete);

    if (playingId === recordingToDelete) {
      setPlayingId(null);
      setAudioData(null);
    }

    setDeleteDialogOpen(false);
    setRecordingToDelete(null);
  }, [recordingToDelete, deleteRecording, playingId]);

  const handleClearAll = useCallback(() => {
    setClearDialogOpen(true);
  }, []);

  const confirmClearAll = useCallback(async () => {
    setIsClearing(true);
    await clearAllRecordings();
    setPlayingId(null);
    setAudioData(null);
    setIsClearing(false);
    setClearDialogOpen(false);
  }, [clearAllRecordings]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Folder className="h-5 w-5" aria-hidden="true" />
          <h2 className="font-semibold">Aufnahmen</h2>
          {recordings.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {recordings.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={refresh}
            disabled={isLoading}
            className="h-8 w-8"
            aria-label="Aufnahmen aktualisieren"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin motion-reduce:animate-none")} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
            aria-label="Aufnahmen-Bibliothek schließen"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted/30 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <HardDrive className="h-3 w-3" aria-hidden="true" />
              {formatFileSize(stats.totalSizeBytes)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {formatDuration(stats.totalDurationMs)}
            </span>
          </div>
          {recordings.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              disabled={isClearing}
              className="h-6 px-2 text-xs text-destructive hover:text-destructive"
              aria-label="Alle Aufnahmen löschen"
            >
              <Trash2 className="h-3 w-3 mr-1" aria-hidden="true" />
              Alle löschen
            </Button>
          )}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="p-4 text-sm text-destructive bg-destructive/10">
          <AlertCircle className="h-4 w-4 inline mr-2" aria-hidden="true" />
          {error}
        </div>
      )}

      {/* Recordings list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading && recordings.length === 0 && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin motion-reduce:animate-none mr-2" aria-hidden="true" />
            Lade Aufnahmen...
          </div>
        )}

        {!isLoading && recordings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FileAudio className="h-10 w-10 mb-3 opacity-50" aria-hidden="true" />
            <p className="text-sm">Keine Aufnahmen vorhanden</p>
            <p className="text-xs mt-1">
              Aufnahmen werden automatisch gespeichert, wenn die automatische Speicherung aktiviert ist.
            </p>
          </div>
        )}

        {recordings.map((recording) => (
          <MemoizedRecordingCard
            key={recording.id}
            recording={recording}
            isExpanded={expandedId === recording.id}
            onToggle={() => handleToggle(recording.id)}
            onPlay={() => handlePlay(recording.id)}
            onDownload={() => handleDownload(recording.id, recording.createdAt)}
            onDelete={() => handleDelete(recording.id)}
            playingId={playingId}
            audioData={audioData}
          />
        ))}
      </div>

      {/* Footer with storage path */}
      {stats && (
        <div className="p-3 border-t text-xs text-muted-foreground truncate">
          <Folder className="h-3 w-3 inline mr-1" aria-hidden="true" />
          {stats.storagePath}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aufnahme löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Die Aufnahme und alle zugehörigen Metadaten werden permanent gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear all confirmation dialog */}
      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alle Aufnahmen löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Alle {recordings.length} Aufnahmen und deren Metadaten werden permanent gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClearDialogOpen(false)}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Alle löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
