"use client";

/**
 * AboutSection - App-Version & Disclaimer Sektion
 *
 * Zeigt App-Version (APP_VERSION), Developer Info, KI-Accuracy-Disclaimer,
 * Krisenhotline (Telefonseelsorge 0800 111 0 111). EU AI Act Art. 52 Compliance.
 */

import { Info, Heart } from "lucide-react";
import { APP_VERSION, APP_DEVELOPER } from "@/lib/types";

/**
 * AboutSection Component
 *
 * Displays app version, disclaimer about AI analysis accuracy,
 * and crisis hotline information for user safety.
 *
 * Fulfills EU AI Act Art. 52 transparency requirements for emotion recognition.
 */
export function AboutSection(): JSX.Element {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Info className="h-5 w-5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
        <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300">Über Hablará</h3>
      </div>

      <div className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
        <p>
          <span className="text-slate-600 dark:text-slate-300 font-medium">Version:</span> {APP_VERSION}
        </p>
        <p>
          <span className="text-slate-600 dark:text-slate-300 font-medium">Entwickelt von:</span> {APP_DEVELOPER}
        </p>

        <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
          <p className="text-xs leading-relaxed">
            Hablará nutzt KI-Modelle zur Analyse von Sprache und Text.
            Die Ergebnisse dienen der Selbstreflexion und können fehlerhaft sein.
            Diese App ersetzt keine professionelle psychologische oder medizinische Beratung.
          </p>
        </div>

        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          <Heart className="h-3 w-3" aria-hidden="true" />
          <span>Bei Krisen: Telefonseelsorge 0800 111 0 111 (24/7, kostenlos)</span>
        </div>
      </div>
    </div>
  );
}
