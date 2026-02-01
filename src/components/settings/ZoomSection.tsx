"use client";

/**
 * ZoomSection - Zoom control in Settings (Erweitert Tab)
 *
 * Displays current zoom level and provides zoom controls.
 * Only shown in Tauri environment (not browser preview).
 */

import { ZoomIn, ZoomOut, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useZoom, MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM } from "@/hooks/useZoom";

export function ZoomSection(): JSX.Element | null {
  const { zoomLevel, zoomIn, zoomOut, resetZoom, isAvailable } = useZoom();

  // Don't render if zoom is not available (browser preview)
  if (!isAvailable) {
    return null;
  }

  const zoomPercentage = Math.round(zoomLevel * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h3 className="text-sm font-medium">Zoom</h3>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={zoomOut}
          disabled={zoomLevel <= MIN_ZOOM}
          title="Verkleinern (CMD+-)"
          aria-label="Verkleinern"
        >
          <ZoomOut className="h-4 w-4" aria-hidden="true" />
        </Button>

        <div className="min-w-[60px] text-center font-mono text-sm">
          {zoomPercentage}%
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={zoomIn}
          disabled={zoomLevel >= MAX_ZOOM}
          title="Vergrößern (CMD++)"
          aria-label="Vergrößern"
        >
          <ZoomIn className="h-4 w-4" aria-hidden="true" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={resetZoom}
          disabled={Math.abs(zoomLevel - DEFAULT_ZOOM) < 0.01}
          title="Zurücksetzen (CMD+0)"
          aria-label="Zoom zurücksetzen"
          className="ml-2"
        >
          <RotateCcw className="h-4 w-4 mr-1" aria-hidden="true" />
          100%
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Tastenkürzel: CMD+Plus (vergrößern), CMD+Minus (verkleinern), CMD+0
        (zurücksetzen)
      </p>

      <Separator className="mt-6" />
    </div>
  );
}
