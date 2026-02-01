"use client";

/**
 * AllgemeinTab - Allgemeine Settings Tab
 *
 * Basis-Einstellungen: Hotkey, Audio Feedback (Start/Stop Sounds), Zoom, Window Reset,
 * Onboarding Tour Restart, About Section (Version + Disclaimer + Krisenhotline).
 */

import type { AppSettings } from "@/lib/types";
import { HotkeySection } from "../HotkeySection";
import { AudioFeedbackSection } from "../AudioFeedbackSection";
import { ZoomSection } from "../ZoomSection";
import { WindowResetSection } from "../WindowResetSection";
import { OnboardingSection } from "../OnboardingSection";
import { AboutSection } from "../AboutSection";
import { Separator } from "@/components/ui/separator";

interface AllgemeinTabProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  onRestartSetupHints?: () => void;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Component definition
 *
 * Contains 6 sections: Hotkey, Audio Feedback, Zoom, Window Reset, Onboarding (Tour + Setup Hints), About.
 * This tab groups general UI settings that don't fit into specialized categories.
 */
export function AllgemeinTab({ settings, onSettingsChange, onRestartSetupHints, onOpenChange }: AllgemeinTabProps) {
  return (
    <div className="space-y-6 py-4">
      <HotkeySection settings={settings} onSettingsChange={onSettingsChange} />
      <Separator />

      <AudioFeedbackSection settings={settings} onSettingsChange={onSettingsChange} />
      <Separator />

      <ZoomSection />
      <Separator />

      <WindowResetSection />
      <Separator />

      <OnboardingSection
        onRestartSetupHints={onRestartSetupHints}
        onCloseSettings={() => onOpenChange?.(false)}
      />
      <Separator />

      <AboutSection />
    </div>
  );
}
