"use client";

/**
 * Cognitive Distortion Display Component
 *
 * Displays CBT (Cognitive Behavioral Therapy) based cognitive distortion analysis
 * based on Aaron Beck's cognitive therapy model.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Quote, Lightbulb, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CognitiveDistortionResult, CognitiveDistortionType } from "@/lib/types";
import { CognitiveDistortionInfo } from "./info/CognitiveDistortionInfo";

interface CognitiveDistortionDisplayProps {
  /** Cognitive distortion analysis data */
  cognitive: CognitiveDistortionResult;
  /** Optional custom class name */
  className?: string;
}

// Distortion type labels (German)
const DISTORTION_TYPE_LABELS: Record<CognitiveDistortionType, string> = {
  catastrophizing: "Katastrophisieren",
  all_or_nothing: "Schwarz-Weiß-Denken",
  overgeneralization: "Übergeneralisierung",
  mind_reading: "Gedankenlesen",
  personalization: "Personalisierung",
  emotional_reasoning: "Emotionales Schlussfolgern",
  should_statements: "Sollte-Aussagen",
};

// Thinking style labels (German)
const THINKING_STYLE_LABELS: Record<string, string> = {
  balanced: "Ausgewogen",
  somewhat_distorted: "Leicht verzerrt",
  highly_distorted: "Stark verzerrt",
};

// Thinking style colors
const THINKING_STYLE_COLORS: Record<string, string> = {
  balanced: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  somewhat_distorted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  highly_distorted: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

/**
 * Cognitive Distortion Display Component
 *
 * Features:
 * - Thinking style badge (Ausgewogen/Leicht verzerrt/Stark verzerrt)
 * - Card grid layout for distortions
 * - Quote, explanation, and reframe for each distortion
 * - Icon-based visual structure
 */
export function CognitiveDistortionDisplay({ cognitive, className }: CognitiveDistortionDisplayProps) {
  const hasDistortions = cognitive.distortions.length > 0;

  return (
    <Card className={cn("border-purple-200 dark:border-purple-900", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" aria-hidden="true" />
            Kognitive Verzerrungen
          </CardTitle>
          <Badge
            variant="outline"
            className={cn(
              "font-medium",
              THINKING_STYLE_COLORS[cognitive.overallThinkingStyle] ||
                THINKING_STYLE_COLORS.balanced
            )}
          >
            {THINKING_STYLE_LABELS[cognitive.overallThinkingStyle] || cognitive.overallThinkingStyle}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {!hasDistortions ? (
          <p className="text-sm text-muted-foreground">Keine kognitiven Verzerrungen erkannt</p>
        ) : (
          <div className="space-y-3">
            {cognitive.distortions.map((distortion, index) => (
              <Card key={index} className="border-l-4 border-l-purple-500 dark:border-l-purple-600 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/50 motion-reduce:transition-none">
                <CardContent className="pt-4 pb-3 space-y-2">
                  {/* Distortion Type Badge */}
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                    <Badge variant="secondary" className="font-medium">
                      {DISTORTION_TYPE_LABELS[distortion.type] || distortion.type}
                    </Badge>
                  </div>

                  {/* Quote */}
                  {distortion.quote && (
                    <div className="flex gap-2 items-start">
                      <Quote className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <p className="text-sm text-muted-foreground italic">
                        &ldquo;{distortion.quote}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Explanation */}
                  {distortion.explanation && (
                    <p className="text-sm text-foreground pl-6">{distortion.explanation}</p>
                  )}

                  {/* Reframe (Alternative) */}
                  {distortion.reframe && (
                    <div className="flex gap-2 items-start bg-white dark:bg-slate-800/50 border-l-2 border-purple-500 p-2 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/70 motion-reduce:transition-none">
                      <Lightbulb className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
                          Alternative:
                        </p>
                        <p className="text-sm text-foreground">{distortion.reframe}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <CognitiveDistortionInfo />
      </CardContent>
    </Card>
  );
}
