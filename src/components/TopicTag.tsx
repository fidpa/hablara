"use client";

/**
 * TopicTag - Voice Journal Topic Badge
 *
 * Farbcodierter Badge mit Icon für 7 Topics (Work, Health, Relationships, Finances, Personal Dev,
 * Creativity, Other). 2 Sizes (sm/md), optional Confidence-Anzeige. Icon-Mapping via ICONS const.
 */

import { TOPIC_INFO, type TopicResult } from "@/lib/types";
import { Briefcase, Heart, Users, DollarSign, TrendingUp, Palette, MoreHorizontal } from "lucide-react";
import { cn, colorWithOpacity } from "@/lib/utils";

const ICONS = {
  work_career: Briefcase,
  health_wellbeing: Heart,
  relationships_social: Users,
  finances: DollarSign,
  personal_development: TrendingUp,
  creativity_hobbies: Palette,
  other: MoreHorizontal,
} as const;

interface TopicTagProps {
  topic: TopicResult;
  size?: "sm" | "md";
  showConfidence?: boolean;
}

export function TopicTag({ topic, size = "md", showConfidence = true }: TopicTagProps): JSX.Element {
  const info = TOPIC_INFO[topic.topic];
  const Icon = ICONS[topic.topic];
  const isSmall = size === "sm";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border",
        isSmall ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
      style={{
        backgroundColor: colorWithOpacity(info.color, 0.2),
        borderColor: colorWithOpacity(info.color, 0.5),
        color: info.color,
      }}
    >
      <Icon className={isSmall ? "w-3 h-3" : "w-4 h-4"} />
      <span className="font-medium">{info.name}</span>
      {showConfidence && (
        <span className="opacity-70">({Math.round(topic.confidence * 100)}%)</span>
      )}
    </div>
  );
}
