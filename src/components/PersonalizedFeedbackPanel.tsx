"use client";

/**
 * PersonalizedFeedbackPanel - Baseline-relative Feedback
 *
 * Zeigt Feedback nur bei Abweichung vom Baseline. 3 Modi: generic (0-4 Recordings),
 * preliminary (5-9), personalized (10+). 20+ Templates. Emotion-colored Badge.
 */

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTauri } from "@/hooks/useTauri";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, AlertCircle } from "lucide-react";
import {
  PersonalizedFeedback,
  enrichFeedback,
  getEmotionNameGerman,
} from "@/lib/feedback-templates";
import { EMOTION_INFO, type EmotionType } from "@/lib/types";
import { logger } from "@/lib/logger";

interface PersonalizedFeedbackPanelProps {
  recordingId: string;
}

/**
 * PersonalizedFeedbackPanel displays baseline-relative feedback for a recording.
 *
 * Features:
 * - Fetches personalized feedback from backend
 * - Shows feedback only when emotion differs from baseline
 * - Displays feedback mode (preliminary vs personalized)
 * - Uses emotion-colored styling
 *
 * Feedback modes:
 * - generic (0-4 recordings): No feedback shown
 * - preliminary (5-9 recordings): Badge indicates building baseline
 * - personalized (10+ recordings): Full personalized feedback
 */
export function PersonalizedFeedbackPanel({ recordingId }: PersonalizedFeedbackPanelProps): JSX.Element | null {
  const { isTauri } = useTauri();
  const [feedback, setFeedback] = useState<PersonalizedFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isTauri || !recordingId) {
      setLoading(false);
      return;
    }

    async function loadFeedback() {
      try {
        setLoading(true);
        setError(null);

        const result = await invoke<PersonalizedFeedback | null>(
          "get_personalized_feedback",
          { recordingId }
        );

        if (result) {
          setFeedback(enrichFeedback(result));
        } else {
          setFeedback(null);
        }
      } catch (err) {
        logger.error('PersonalizedFeedbackPanel', 'Failed to load feedback', err);
        setError(err instanceof Error ? err.message : String(err));
        setFeedback(null);
      } finally {
        setLoading(false);
      }
    }

    loadFeedback();
  }, [isTauri, recordingId]);

  // Don't render anything if:
  // - Still loading
  // - No feedback available
  // - Feedback says not to show
  // - Error occurred
  if (loading || !feedback || !feedback.shouldShowFeedback || error) {
    return null;
  }

  // Get emotion info for styling
  const currentEmotionInfo = EMOTION_INFO[feedback.currentEmotion as EmotionType];

  // Get colors with fallback
  const currentColor = currentEmotionInfo?.color || "var(--color-emotion-neutral)";

  return (
    <div className="rounded-lg border bg-white dark:bg-slate-800/50 border-slate-200 dark:border-transparent p-4 mt-3">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold">Persönliche Reflexion</h3>
        </div>
        <div className="flex items-center gap-2">
          {feedback.feedbackMode === "preliminary" && (
            <Badge variant="outline" className="text-xs">
              Vorlaeufig
            </Badge>
          )}
          <div className="flex items-center gap-1.5">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: currentColor }}
              title={`Aktuelle Emotion: ${getEmotionNameGerman(feedback.currentEmotion)}`}
            />
            <span className="text-xs text-muted-foreground">
              Baseline: {getEmotionNameGerman(feedback.baselineEmotion)}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        {/* Main feedback text */}
        <p className="text-sm text-foreground/80 leading-relaxed">
          {feedback.feedbackText}
        </p>

        {/* High deviation warning */}
        {feedback.confidenceDelta > 0.5 && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Diese Abweichung ist ungewöhnlich für dich.
          </p>
        )}

        {/* Preliminary mode info */}
        {feedback.feedbackMode === "preliminary" && (
          <p className="text-xs text-muted-foreground">
            Basierend auf {feedback.baselineSampleCount} Aufnahmen.
            Genauere Analysen ab 10 Aufnahmen.
          </p>
        )}
      </div>
    </div>
  );
}
