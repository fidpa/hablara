"use client";

/**
 * Four-Sides Display Component
 *
 * Displays Schulz von Thun's Four-Sides Model (Vier-Seiten-Modell)
 * communication analysis.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  User,
  Users,
  Megaphone,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FourSidesAnalysis } from "@/lib/types";
import { FourSidesInfo } from "./info/FourSidesInfo";

interface FourSidesDisplayProps {
  /** Four-Sides analysis data */
  fourSides: FourSidesAnalysis;
  /** Optional custom class name */
  className?: string;
}

/**
 * Four-Sides Display Component
 *
 * Features:
 * - 4-quadrant layout (Sachinhalt, Selbstoffenbarung, Beziehung, Appell)
 * - Color-coded icons and badges
 * - Collapsible misunderstandings section (accordion)
 * - Responsive grid layout
 */
export function FourSidesDisplay({ fourSides, className }: FourSidesDisplayProps) {
  const [isMissverstaendnisseExpanded, setIsMissverstaendnisseExpanded] = useState(false);

  // Check if any quadrant has content
  const hasQuadrantContent =
    fourSides.sachinhalt ||
    fourSides.selbstoffenbarung ||
    fourSides.beziehung ||
    fourSides.appell;

  // Check if there are any misunderstandings
  const hasMissverstaendnisse = fourSides.potentielleMissverstaendnisse.length > 0;

  // Render if there's ANY content (quadrants OR misunderstandings)
  if (!hasQuadrantContent && !hasMissverstaendnisse) return null;

  // Define quadrants with their content
  const quadrants = [
    {
      key: "sachinhalt",
      title: "Sachinhalt",
      content: fourSides.sachinhalt,
      icon: FileText,
      borderColor: "border-l-blue-500 dark:border-l-blue-400",
      textColor: "text-blue-600 dark:text-blue-400",
      iconColor: "text-blue-500 dark:text-blue-400",
    },
    {
      key: "selbstoffenbarung",
      title: "Selbstoffenbarung",
      content: fourSides.selbstoffenbarung,
      icon: User,
      borderColor: "border-l-purple-500 dark:border-l-purple-400",
      textColor: "text-purple-600 dark:text-purple-400",
      iconColor: "text-purple-500 dark:text-purple-400",
    },
    {
      key: "beziehung",
      title: "Beziehung",
      content: fourSides.beziehung,
      icon: Users,
      borderColor: "border-l-pink-500 dark:border-l-pink-400",
      textColor: "text-pink-600 dark:text-pink-400",
      iconColor: "text-pink-500 dark:text-pink-400",
    },
    {
      key: "appell",
      title: "Appell",
      content: fourSides.appell,
      icon: Megaphone,
      borderColor: "border-l-orange-500 dark:border-l-orange-400",
      textColor: "text-orange-600 dark:text-orange-400",
      iconColor: "text-orange-500 dark:text-orange-400",
    },
  ];

  const visibleQuadrants = quadrants.filter((q) => q.content);

  return (
    <Card className={cn("border-indigo-200 dark:border-indigo-900", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          Vier-Seiten-Modell (Schulz von Thun)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 4-Quadrant Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visibleQuadrants.map((quadrant) => {
            const Icon = quadrant.icon;
            return (
              <div
                key={quadrant.key}
                className={cn(
                  "rounded-lg border border-l-4 p-3 space-y-2",
                  "bg-white dark:bg-slate-800/50",
                  "transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/70 motion-reduce:transition-none",
                  quadrant.borderColor
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-4 w-4", quadrant.iconColor)} aria-hidden="true" />
                  <Badge
                    variant="outline"
                    className={cn("font-medium", quadrant.textColor)}
                  >
                    {quadrant.title}
                  </Badge>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-200">{quadrant.content}</p>
              </div>
            );
          })}
        </div>

        {/* Collapsible Misunderstandings Section */}
        {hasMissverstaendnisse && (
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMissverstaendnisseExpanded((prev) => !prev)}
              className="w-full justify-between"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" aria-hidden="true" />
                <span className="font-medium">Potenzielle Missverständnisse</span>
                <Badge variant="secondary" className="ml-1">
                  {fourSides.potentielleMissverstaendnisse.length}
                </Badge>
              </div>
              {isMissverstaendnisseExpanded ? (
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>

            {isMissverstaendnisseExpanded && (
              <div className="mt-2 space-y-2">
                {fourSides.potentielleMissverstaendnisse.map((missverstaendnis, index) => (
                  <div
                    key={index}
                    className={cn(
                      "rounded-md border border-l-4 p-3",
                      "bg-white dark:bg-slate-800/50",
                      "border-l-yellow-500 dark:border-l-yellow-400",
                      "border-yellow-500/20 dark:border-yellow-400/20",
                      "transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/70 motion-reduce:transition-none"
                    )}
                  >
                    <p className="text-sm text-slate-700 dark:text-slate-200">{missverstaendnis}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <FourSidesInfo />
      </CardContent>
    </Card>
  );
}
