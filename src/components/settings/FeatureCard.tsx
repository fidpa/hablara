"use client";

/**
 * FeatureCard - Feature Toggle Card Component
 *
 * Card mit Switch, Name, Description, FeatureBadge. Standard-Element für
 * Feature-Settings. Nutzt FEATURE_REGISTRY für Display-Daten.
 */

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FeatureBadge } from "./FeatureBadge";
import { cn } from "@/lib/utils";
import type { FeatureDefinition } from "@/lib/features";

interface FeatureCardProps {
  feature: FeatureDefinition;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
  disabledReason?: string;
}

export function FeatureCard({
  feature,
  enabled,
  onToggle,
  disabled = false,
  disabledReason,
}: FeatureCardProps): JSX.Element {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 p-3 rounded-lg",
        "bg-card/50 border border-border/50",
        "hover:bg-card/80 transition-colors",
        disabled && "opacity-50"
      )}
    >
      {/* Left: Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Name + Badges Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Label
            htmlFor={`feature-${feature.id}`}
            className={cn(
              "text-sm font-medium cursor-pointer",
              disabled && "cursor-not-allowed"
            )}
          >
            {feature.name}
          </Label>
          {feature.badges?.map((badge) => (
            <FeatureBadge key={badge} type={badge} />
          ))}
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          {feature.description}
        </p>

        {/* Disabled Reason */}
        {disabled && disabledReason && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{disabledReason}</p>
        )}
      </div>

      {/* Right: Switch */}
      <Switch
        id={`feature-${feature.id}`}
        checked={enabled}
        onCheckedChange={onToggle}
        disabled={disabled}
      />
    </div>
  );
}
