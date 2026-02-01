/**
 * GFKDisplay - Gewaltfreie Kommunikation (Rosenberg) Analyse
 *
 * 6 Sections: Beobachtungen, Gefühle, Bedürfnisse, Bitten, GFK-Übersetzung, Reflexionsfrage.
 * Farbcodiert (Blau/Pink/Grün/Amber). Info-Modal via GFKInfo Component.
 */

import type { GFKAnalysis } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Heart, MessageSquare } from "lucide-react";
import { GFKInfo } from "./info/GFKInfo";

interface GFKDisplayProps {
  gfk: GFKAnalysis;
  className?: string;
}

interface SectionProps {
  title: string;
  items: string[];
  color: string;
}

function Section({ title, items, color }: SectionProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className={cn("text-sm font-medium", color)}>{title}</h4>
      <ul className="space-y-1 ml-4">
        {items.map((item, idx) => (
          <li key={idx} className="text-sm text-slate-700 dark:text-slate-200 list-disc list-inside">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GFKDisplay({ gfk, className }: GFKDisplayProps): JSX.Element | null {
  // Check if GFK analysis has any content
  const hasContent =
    gfk.observations.length > 0 ||
    gfk.feelings.length > 0 ||
    gfk.needs.length > 0 ||
    gfk.requests.length > 0 ||
    gfk.gfkTranslation ||
    gfk.reflectionQuestion;

  if (!hasContent) {
    return null;
  }

  return (
    <div className={cn("space-y-4 p-4 bg-purple-50 dark:bg-slate-800/50 rounded-lg border border-purple-200 dark:border-purple-500/20", className)}>
      <div className="flex items-center gap-2">
        <Heart className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-400">GFK-Analyse (Gewaltfreie Kommunikation)</h3>
      </div>

      <div className="space-y-4">
        {/* Observations */}
        <Section title="Beobachtungen" items={gfk.observations} color="text-blue-600 dark:text-blue-400" />

        {/* Feelings */}
        <Section title="Gefühle" items={gfk.feelings} color="text-pink-600 dark:text-pink-400" />

        {/* Needs */}
        <Section title="Bedürfnisse" items={gfk.needs} color="text-green-600 dark:text-green-400" />

        {/* Requests */}
        <Section title="Bitten" items={gfk.requests} color="text-amber-600 dark:text-amber-400" />

        {/* GFK Translation */}
        {gfk.gfkTranslation && (
          <div className="mt-4 p-3 bg-purple-100 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-700/30 transition-colors hover:bg-purple-200 dark:hover:bg-purple-900/30 motion-reduce:transition-none">
            <h4 className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-2">GFK-Übersetzung</h4>
            <p className="text-sm text-slate-700 dark:text-slate-200 italic">{gfk.gfkTranslation}</p>
          </div>
        )}

        {/* Reflection Question */}
        {gfk.reflectionQuestion && (
          <div className="mt-2 p-3 bg-purple-50 dark:bg-purple-900/10 rounded transition-colors hover:bg-purple-100 dark:hover:bg-purple-900/20 motion-reduce:transition-none">
            <div className="flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-purple-700 dark:text-purple-300">{gfk.reflectionQuestion}</p>
            </div>
          </div>
        )}
      </div>

      <GFKInfo />
    </div>
  );
}
