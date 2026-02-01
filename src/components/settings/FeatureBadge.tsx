"use client";

/**
 * FeatureBadge - Feature Status Badge Component
 *
 * Kleine Badge für Feature-Status: "Neu" (blau), "Beta" (orange), "LLM" (violett).
 * Verwendet in FeatureCard für visuelle Feature-Kategorisierung.
 */

import { cn } from "@/lib/utils";
import type { FeatureBadgeType } from "@/lib/features";

interface FeatureBadgeProps {
  type: FeatureBadgeType;
}

const BADGE_CONFIG: Record<FeatureBadgeType, { label: string; className: string }> = {
  new: {
    label: "Neu",
    className: "bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30",
  },
  beta: {
    label: "Beta",
    className: "bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30",
  },
  llm: {
    label: "LLM",
    className: "bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
  },
};

export function FeatureBadge({ type }: FeatureBadgeProps): JSX.Element {
  const config = BADGE_CONFIG[type];

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium",
        "rounded border",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
