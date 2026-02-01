"use client";

/**
 * ToneIndicator - 5-Dimensional Tone Visualization
 *
 * Displays horizontal bar charts for formality, professionalism, directness,
 * enthusiasm, and assertiveness (1-5 scale). Color-coded per dimension.
 */

import { TONE_DIMENSIONS, type ToneDimension, type ToneState } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ToneIndicatorProps {
  tone: ToneState;
  isActive?: boolean;
  className?: string;
}

/**
 * ToneIndicator Component
 *
 * Visualizes 5-dimensional tone analysis (1-5 scale)
 * - Horizontal bars showing level for each dimension
 * - Color-coded per dimension
 * - Low/High labels at bar ends
 * - Confidence display
 */
export function ToneIndicator({ tone, isActive = false, className }: ToneIndicatorProps): JSX.Element {
  const dimensions: ToneDimension[] = [
    "formality",
    "professionalism",
    "directness",
    "energy",
    "seriousness",
  ];

  return (
    <div
      className={cn(
        "rounded-lg border bg-white dark:bg-slate-800/50 p-4 transition-all duration-300 motion-reduce:transition-none",
        isActive && "ring-2 ring-primary/20",
        className
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-2 w-2 rounded-full transition-colors",
              isActive ? "bg-green-500 animate-pulse motion-reduce:animate-none" : "bg-slate-400"
            )}
          />
          <h3 className="text-sm font-semibold">Ton-Analyse</h3>
        </div>
        <span
          className="text-xs text-muted-foreground cursor-help"
          title="Konfidenz zeigt Signalstärke, nicht absolute Sicherheit. Ergebnisse dienen der Selbstreflexion."
        >
          {(tone.confidence * 100).toFixed(0)}% Konfidenz
        </span>
      </div>

      {/* Dimension Bars */}
      <div className="space-y-3">
        {dimensions.map((dim) => {
          const info = TONE_DIMENSIONS[dim];
          const value = tone[dim] as number;
          const percentage = ((value - 1) / 4) * 100; // Convert 1-5 to 0-100%

          return (
            <div key={dim} className="space-y-1">
              {/* Dimension Name */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{info.name}</span>
                <span className="text-muted-foreground">{value}/5</span>
              </div>

              {/* Bar Container */}
              <div className="relative h-6 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                {/* Low/High Labels (inside bar) */}
                <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] font-medium text-slate-700 dark:text-white z-10 [text-shadow:0_1px_2px_rgba(255,255,255,0.8)] dark:[text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
                  <span>{info.lowLabel}</span>
                  <span>{info.highLabel}</span>
                </div>

                {/* Filled Bar */}
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: info.color,
                    opacity: 0.7,
                  }}
                />

                {/* Value Indicator (circle) */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-white shadow-md transition-all duration-500 ease-out"
                  style={{
                    left: `calc(${percentage}% - 8px)`,
                    backgroundColor: info.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Collapsible Descriptions - Pattern from EmotionIndicator */}
      <details className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
        <summary
          className="cursor-pointer text-xs text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 list-none flex items-center gap-1 [&::-webkit-details-marker]:hidden"
          aria-label="Tonalitäts-Beschreibungen ein-/ausblenden"
        >
          <span className="text-[10px] transition-transform [[open]>&]:rotate-90" aria-hidden="true">
            ▶
          </span>
          Beschreibungen anzeigen
        </summary>
        <div className="mt-2 space-y-1.5">
          {dimensions.map((dim) => {
            const info = TONE_DIMENSIONS[dim];
            return (
              <p key={`desc-${dim}`} className="text-[10px] text-muted-foreground">
                <span className="font-medium" style={{ color: info.color }}>
                  {info.name}:
                </span>{" "}
                {info.description}
              </p>
            );
          })}
        </div>
      </details>

      {/* Theoretical/Technical Background - Collapsible Info */}
      <details className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
        <summary
          className="cursor-pointer text-xs text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 list-none flex items-center gap-1 [&::-webkit-details-marker]:hidden"
          aria-label="Theoretische Grundlage ein-/ausblenden"
        >
          <span className="text-[10px] transition-transform [[open]>&]:rotate-90" aria-hidden="true">
            ℹ️
          </span>
          Wie funktioniert die Tonanalyse?
        </summary>
        <div className="mt-2 space-y-3 text-[10px] text-muted-foreground">
          {/* Theoretical Background */}
          <div>
            <p className="font-medium text-slate-500 dark:text-slate-400 mb-1">Theoretische Grundlage</p>
            <p className="leading-relaxed">
              <strong>Dimensionales Modell</strong> basierend auf Kommunikationswissenschaft:
              Formalität (Joos 1961), Professionalität (Expertise-Kontinuum), Direktheit (kommunikative Explizitheit),
              Energie (Engagement-Level), Ernsthaftigkeit (Gravität des Inhalts).
            </p>
            <p className="mt-1.5 leading-relaxed">
              <strong>Abgrenzung:</strong> Ton ≠ Emotion. Emotion = affektiver Zustand (Stress, Freude).
              Ton = kommunikative Haltung (formell, direkt). Beide können kombiniert auftreten.
            </p>
          </div>

          {/* Technical Implementation */}
          <div>
            <p className="font-medium text-slate-500 dark:text-slate-400 mb-1">Technische Implementierung</p>
            <p className="leading-relaxed">
              <strong>Dual-Track Architektur:</strong>
            </p>
            <ul className="mt-1 space-y-1 list-disc list-inside ml-2">
              <li>
                <strong>Audio (40%):</strong> 12 prosodische Features (Pitch-Varianz, Energie, Pausen, Sprechrate)
                → schwellwertbasierte Klassifikation
              </li>
              <li>
                <strong>Text (60%):</strong> LLM-Analyse (Ollama/OpenAI/Anthropic) mit linguistischen Markern
                (Kontraktionen, Fachjargon, Syntax)
              </li>
              <li>
                <strong>Fusion:</strong> Gewichteter Durchschnitt (40/60) + Confidence-Boost (+10%) bei Übereinstimmung
              </li>
            </ul>
          </div>

          {/* Accuracy */}
          <div>
            <p className="font-medium text-slate-500 dark:text-slate-400 mb-1">Erwartete Genauigkeit</p>
            <p className="leading-relaxed">
              Text: 75-85% · Audio: 60-70% · Fusioniert: 80-90%
              (basierend auf GPT-4o/Claude Benchmarks und ACL 2021 Multi-Modal Forschung)
            </p>
          </div>

          {/* Sources */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <p className="text-[9px] italic">
              Quellen: Joos&apos;s Five Styles (1961), ACL 2021 Style-Transfer Transformer,
              Evidently AI LLM-as-a-judge Guide
            </p>
          </div>
        </div>
      </details>

      {/* Source Badge */}
      <div className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground">
        <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5">
          {tone.source === "audio" && "Audio"}
          {tone.source === "text" && "Text"}
          {tone.source === "fused" && "Audio + Text"}
        </span>
        <span>
          {tone.source === "fused"
            ? "(40% Audio, 60% Text)"
            : tone.source === "audio"
            ? "(nur Audio-Features)"
            : "(nur LLM-Analyse)"}
        </span>
      </div>
    </div>
  );
}
