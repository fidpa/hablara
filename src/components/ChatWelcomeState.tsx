"use client";

/**
 * ChatWelcomeState - Chat-Willkommens-Bildschirm
 *
 * Feature-Cards (Emotion, Fallacy, Tonfall, GFK, Cognitive, Four-Sides) + Suggested Prompts.
 * Zeigt RAG-Wissensbasis-Umfang (78 Chunks). One-Click-Prompts für schnellen Einstieg.
 */

import { Brain, AlertTriangle, Heart, Sparkles, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WELCOME_PROMPTS } from "@/lib/types";

interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  badge?: string;
  badgeVariant?: "default" | "success" | "info";
  color: "blue" | "purple" | "pink" | "teal";
}

const FEATURE_CARD_COLORS = {
  blue: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400",
  purple: "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-400",
  pink: "bg-pink-50 dark:bg-pink-500/10 border-pink-200 dark:border-pink-500/30 text-pink-700 dark:text-pink-400",
  teal: "bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/30 text-teal-700 dark:text-teal-400",
} as const;

const BADGE_COLORS = {
  default: "bg-slate-100 dark:bg-slate-600/30 text-slate-700 dark:text-slate-300",
  success: "bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400",
  info: "bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400",
} as const;

/**
 * Feature card displaying a single capability with icon, title, and optional badge
 */
function FeatureCard({ icon: Icon, title, description, badge, badgeVariant = "default", color }: FeatureCardProps) {
  return (
    <div className={cn("p-4 rounded-lg border space-y-3", FEATURE_CARD_COLORS[color])}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" aria-hidden="true" />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        {badge && (
          <Badge variant="outline" className={cn("text-xs", BADGE_COLORS[badgeVariant])}>
            {badge}
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

interface ChatWelcomeStateProps {
  hotkey?: string;
  onSamplePromptClick?: (prompt: string) => void;
}

/**
 * Welcome state component showing Hablará's core features
 * Displayed when no messages exist and not recording
 *
 * Features (P1-2: Chat Welcome State):
 * - Welcome message with feature overview
 * - Clickable sample prompts for discoverability
 * - Keyboard hint for voice recording
 */
export function ChatWelcomeState({ hotkey = "Ctrl+Shift+D", onSamplePromptClick }: ChatWelcomeStateProps) {
  return (
    <div data-tour-welcome className="flex flex-col items-center justify-center h-full px-4">
      <div className="text-center mb-6">
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Willkommen bei Hablará
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Sprich oder tippe – deine Eingabe wird analysiert
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
        <FeatureCard
          icon={Brain}
          title="Emotionen erkennen"
          description="10 Emotionen via Audio + Text Dual-Track Analyse"
          badge="Multi-Modal"
          badgeVariant="info"
          color="blue"
        />
        <FeatureCard
          icon={AlertTriangle}
          title="Fehlschlüsse aufdecken"
          description="16 logische Argumentationsfehler erkennen"
          badge="CEG-Prompting"
          badgeVariant="info"
          color="purple"
        />
        <FeatureCard
          icon={Heart}
          title="Kommunikation verstehen"
          description="Vier-Seiten-Modell, GFK, Kognitive Muster"
          badge="3 Modelle"
          badgeVariant="info"
          color="pink"
        />
        <FeatureCard
          icon={Sparkles}
          title="Fragen beantworten"
          description="78 Chunks Wissensbasis über meine Funktionen"
          badge="Offline-fähig"
          badgeVariant="success"
          color="teal"
        />
      </div>

      {/* Sample prompts section (P1-2: Discoverability) */}
      {onSamplePromptClick && (
        <div className="mt-6 w-full max-w-3xl">
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 text-center">
            Oder probiere eine dieser Beispielfragen:
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {WELCOME_PROMPTS.map((prompt) => (
              <Button
                key={prompt}
                variant="outline"
                size="sm"
                onClick={() => onSamplePromptClick(prompt)}
                className="text-xs bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500"
                aria-label={`Beispielfrage: ${prompt}`}
              >
                <Send className="w-3 h-3 mr-1.5" aria-hidden="true" />
                {prompt}
              </Button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500 dark:text-slate-600 mt-6 text-center">
        Starte mit{" "}
        <kbd className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-300 text-xs border border-slate-300 dark:border-transparent">
          {hotkey}
        </kbd>{" "}
        oder tippe unten
      </p>
    </div>
  );
}
