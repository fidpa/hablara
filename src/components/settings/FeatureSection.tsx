"use client";

/**
 * FeatureSection - Collapsible Section für Feature-Kategorien
 *
 * Accordion-UI mit Icon, Title, Feature-Count-Badge, Expand/Collapse-Toggle.
 * Rendert FeatureCards als Children. ARIA-konform mit stable useId-IDs.
 */

import { useState, useCallback, useId } from "react";
import { ChevronDown, Sparkles, Brain, Volume2, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeatureCategory } from "@/lib/features";

const ICONS: Record<string, React.ElementType> = {
  Sparkles,
  Brain,
  Volume2,
  HardDrive,
};

interface FeatureSectionProps {
  category: FeatureCategory;
  title: string;
  description: string;
  iconName: string;
  featureCount: number;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export function FeatureSection({
  category,
  title,
  description,
  iconName,
  featureCount,
  defaultExpanded = true,
  children,
}: FeatureSectionProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const Icon = ICONS[iconName] || Sparkles;

  // Generate stable IDs for ARIA attributes
  const headerId = useId();
  const panelId = useId();

  // Memoized toggle handler (MEDIUM-001)
  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <div
      className="border border-border rounded-lg overflow-hidden"
      data-feature-category={category}
    >
      {/* Header */}
      <button
        id={headerId}
        onClick={toggleExpanded}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3",
          "bg-muted/30 hover:bg-muted/50 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
        aria-expanded={isExpanded}
        aria-controls={panelId}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">{title}</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {featureCount}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-200",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      {/* Content Panel */}
      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        hidden={!isExpanded}
        className={cn(
          "overflow-hidden transition-all duration-200 ease-out",
          isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="p-4 pt-2 space-y-3">
          <p className="text-xs text-muted-foreground mb-3">{description}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
