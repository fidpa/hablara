"use client";

/**
 * EmotionIndicator - Multi-Modal Emotion Visualization
 *
 * Zeigt detektierte Emotion mit Dual-Track Confidence (Audio 40% + Text 60%),
 * Emotion Blending (Stacked Bars + Circumplex Diamond), Audio Features,
 * und psychologische Methodologie-Erklärung (Plutchik + Russell Models).
 */

import { useMemo } from "react";
import type { EmotionState } from "@/lib/types";
import { EMOTION_INFO } from "@/lib/types";
import { cn, colorWithOpacity } from "@/lib/utils";
import EmotionCircumplex from "./EmotionCircumplex";
import EmotionBlendBars from "./EmotionBlendBars";

interface EmotionIndicatorProps {
  emotion: EmotionState;
  isActive: boolean;
}

export default function EmotionIndicator({ emotion, isActive }: EmotionIndicatorProps): JSX.Element {
  const emotionInfo = EMOTION_INFO[emotion.primary];
  const secondaryInfo = emotion.secondary ? EMOTION_INFO[emotion.secondary] : null;

  // Generate waveform bars based on audio features
  const waveformBars = useMemo(() => {
    const bars = [];
    const baseHeight = emotion.audioFeatures?.energy || 0.3;

    for (let i = 0; i < 5; i++) {
      const height = Math.max(0.2, Math.min(1, baseHeight + Math.sin(i * 0.8) * 0.2));
      bars.push(height);
    }
    return bars;
  }, [emotion.audioFeatures?.energy]);

  return (
    <div data-tour-emotion className="bg-white dark:bg-slate-800/50 rounded-xl p-6 border border-slate-200 dark:border-transparent">
      <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">Emotionale Analyse</h3>

      {/* Main emotion display */}
      <div className="flex items-center gap-4 mb-6">
        {/* Emotion color indicator */}
        <div
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 border-[3px]",
            isActive ? "animate-pulse-slow motion-reduce:animate-none" : ""
          )}
          style={{
            backgroundColor: colorWithOpacity(emotionInfo.color, 0.19),
            borderColor: emotionInfo.color,
          }}
        >
          {/* Waveform visualization */}
          {isActive && (
            <div className="flex items-end gap-1 h-8">
              {waveformBars.map((height, i) => (
                <div
                  key={i}
                  className="waveform-bar w-1 bg-current rounded-full"
                  style={{
                    height: `${height * 100}%`,
                    color: emotionInfo.color,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span
              className="text-xl font-semibold"
              style={{ color: emotionInfo.color }}
            >
              {emotionInfo.name}
            </span>
            <span
              className="text-sm text-slate-600 dark:text-slate-400 cursor-help"
              title="Konfidenz zeigt Signalstärke der erkannten Signale. KI-basierte Analyse (Plutchik, Russell)."
            >
              {Math.round(emotion.confidence * 100)}%
            </span>
          </div>

          {emotion.secondaryInfo ? (
            <div className="text-sm text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-2">
              <span className="text-slate-600 dark:text-slate-400">Sekundär:</span>
              <span style={{ color: EMOTION_INFO[emotion.secondaryInfo.type].color }}>
                {EMOTION_INFO[emotion.secondaryInfo.type].name}
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                ({Math.round(emotion.secondaryInfo.confidence * 100)}%)
              </span>
              <span
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded",
                  emotion.secondaryInfo.source === "audio"
                    ? "bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400"
                    : "bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400"
                )}
              >
                {emotion.secondaryInfo.source === "audio" ? "Audio" : "Text"}
              </span>
            </div>
          ) : secondaryInfo ? (
            <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Sekundär:{" "}
              <span style={{ color: secondaryInfo.color }}>
                {secondaryInfo.name}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Emotion Blending Visualization */}
      <EmotionBlendBars emotion={emotion} />

      {/* Confidence bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
          <span>Konfidenz</span>
          <span>{Math.round(emotion.confidence * 100)}%</span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${emotion.confidence * 100}%`,
              backgroundColor: emotionInfo.color,
            }}
          />
        </div>
      </div>

      {/* Audio features (if available) */}
      {emotion.audioFeatures && isActive && (
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <AudioFeature
            label="Tonhöhe"
            value={emotion.audioFeatures.pitch}
            unit="Hz"
            max={400}
          />
          <AudioFeature
            label="Energie"
            value={(emotion.audioFeatures.energy ?? 0) * 100}
            unit="%"
            max={100}
          />
          <AudioFeature
            label="Tempo"
            value={emotion.audioFeatures.speechRate}
            unit="x"
            max={2}
          />
        </div>
      )}

      {/* Info Section - Emotion Analysis Methodology */}
      <details className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
        <summary
          className="cursor-pointer text-xs text-slate-600 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-400 list-none flex items-center gap-1 [&::-webkit-details-marker]:hidden"
          aria-label="Informationen zur Emotionsanalyse ein-/ausblenden"
        >
          <span className="text-[10px] transition-transform [[open]>&]:rotate-90" aria-hidden="true">
            ℹ️
          </span>
          Wie funktioniert die Emotionsanalyse?
        </summary>
        <div className="mt-2 space-y-3 text-[10px] text-muted-foreground">
          {/* Section 1: Theoretical Foundation */}
          <div>
            <p className="font-medium text-slate-600 dark:text-slate-400 mb-1">Emotionale Modelle</p>
            <p className="leading-relaxed">
              Wir kombinieren zwei wissenschaftlich etablierte Emotionsmodelle:
            </p>
            <ul className="mt-1 space-y-1 list-disc list-inside ml-2">
              <li>
                <strong>Plutchiks Rad</strong> – 10 Emotionen in Gegensatzpaaren (z.B. Freude ↔ Trauer)
              </li>
              <li>
                <strong>Russells Circumplex</strong> – 2D-Raum mit Valence (positiv/negativ) und Arousal (ruhig/erregt)
              </li>
            </ul>
            <p className="mt-1.5 text-[9px] leading-relaxed">
              Diese Kombination ermöglicht sowohl kategorische Klassifikation als auch nuancierte Positionierung im emotionalen Raum.
            </p>
          </div>

          {/* Section 2: Dual-Track Methodology */}
          <div>
            <p className="font-medium text-slate-600 dark:text-slate-400 mb-1">Dual-Track Methodik</p>
            <p className="leading-relaxed">
              Hablará kombiniert zwei Analysepfade für höhere Genauigkeit:
            </p>
            <ul className="mt-1 space-y-1 list-disc list-inside ml-2">
              <li>
                <strong>Audio-Track (40%)</strong> – 12 Stimmmerkmale (Tonhöhe, Energie, Sprechtempo, Spektralanalyse)
              </li>
              <li>
                <strong>Text-Track (60%)</strong> – LLM-basierte semantische Analyse (Emotionswörter, Kontext)
              </li>
            </ul>
            <p className="mt-1.5 text-[9px] leading-relaxed">
              Die 40/60-Gewichtung basiert auf Multi-Modal Fusion Research (Poria et al., 2017): Text liefert klarere Hinweise auf bewusste Emotionen, Audio erfasst unbewusste prosodische Signale.
            </p>
          </div>

          {/* Section 3: 12 Audio Features */}
          <div>
            <p className="font-medium text-slate-600 dark:text-slate-400 mb-1">12 Audio-Merkmale</p>
            <p className="leading-relaxed">
              Der Audio-Track analysiert drei Kategorien von Stimmmerkmalen:
            </p>
            <ul className="mt-1 space-y-1 list-disc list-inside ml-2">
              <li>
                <strong>Legacy (3)</strong> – Tonhöhe, Energie, Sprechtempo
              </li>
              <li>
                <strong>Prosodisch (5)</strong> – Tonhöhen-Varianz/Spanne, Energie-Varianz, Pausendauer/-Häufigkeit
              </li>
              <li>
                <strong>Spektral (4)</strong> – Zero-Crossing-Rate, Spektraler Schwerpunkt, Rolloff, Flux (Klangfarben-Änderungen)
              </li>
            </ul>
            <p className="mt-1.5 text-[9px] leading-relaxed">
              Beispiel: Hohe Tonhöhen-Varianz + steiler Spektral-Flux unterscheiden Stress (unkontrolliert) von Aufregung (kontrolliert).
            </p>
          </div>

          {/* Section 4: Emotion Blending */}
          <div>
            <p className="font-medium text-slate-600 dark:text-slate-400 mb-1">Emotions-Blending</p>
            <p className="leading-relaxed">
              Wenn eine zweite Emotion mit ≥40% Confidence erkannt wird, entsteht eine Mischung:
            </p>
            <ul className="mt-1 space-y-1 list-disc list-inside ml-2">
              <li>
                <strong>Blend Ratio</strong> – Verhältnis zwischen Primär- und Sekundär-Emotion (z.B. 65% Stress + 35% Aufregung)
              </li>
              <li>
                <strong>Confidence Boost</strong> – Übereinstimmung von Audio + Text erhöht Gesamtconfidence um 15%
              </li>
              <li>
                <strong>Plutchik-Kontinuum</strong> – Fließende Übergänge zwischen benachbarten Emotionen
              </li>
            </ul>
            <p className="mt-1.5 text-[9px] leading-relaxed">
              Visualisierung: Gestapelte Balken (Blend Ratio) + gelber Diamant im Circumplex (interpolierte Position).
            </p>
          </div>

          {/* Section 5: Accuracy + Crisis Disclaimer */}
          <div>
            <p className="font-medium text-slate-600 dark:text-slate-400 mb-1">Erwartete Genauigkeit</p>
            <p className="leading-relaxed">
              Geschätzte Werte basierend auf internen Tests (30 deutsche Aufnahmen):
            </p>
            <ul className="mt-1 space-y-1 list-disc list-inside ml-2">
              <li>
                <strong>Audio-Track</strong> – 70-75% (prosodische Signale allein)
              </li>
              <li>
                <strong>Text-Track</strong> – ~85% (semantische Klarheit)
              </li>
              <li>
                <strong>Fusioniert</strong> – 85-90% (Dual-Track-Vorteil)
              </li>
            </ul>
            <p className="mt-1.5 text-[9px] leading-relaxed">
              <strong>Wichtig:</strong> KI-Analysen können ungenau sein und ersetzen keine professionelle Beratung. Bei Krisen: Telefonseelsorge 0800 111 0 111 (24/7, kostenlos).
            </p>
          </div>

          {/* Sources */}
          <div className="pt-2 border-t border-slate-300 dark:border-slate-800">
            <p className="text-[9px] italic">
              Quellen: Plutchik (1980), Russell (1980), Poria et al. (2017, Information Fusion),
              Hablará MULTI_MODAL_ANALYSIS.md (Phase A)
            </p>
          </div>
        </div>
      </details>

      {/* Emotion markers */}
      {emotion.markers && emotion.markers.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <span className="text-xs text-slate-600 dark:text-slate-400">Erkannte Marker:</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {emotion.markers.map((marker, i) => (
              <span
                key={i}
                className="px-2 py-1 text-xs rounded-full"
                style={{
                  backgroundColor: colorWithOpacity(emotionInfo.color, 0.13),
                  color: emotionInfo.color,
                }}
              >
                {marker}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Circumplex Visualization (Valence-Arousal 2D) */}
      <details className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <summary className="cursor-pointer text-xs text-slate-600 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-400 transition-colors">
          Dimensionale Ansicht (Valence-Arousal)
        </summary>
        <EmotionCircumplex emotion={emotion} size={180} />
      </details>
    </div>
  );
}

// Helper component for audio feature display
function AudioFeature({
  label,
  value,
  unit,
  max,
}: {
  label: string;
  value: number | undefined;
  unit: string;
  max: number;
}) {
  // Defensive: handle undefined value (can happen during state transitions)
  const safeValue = value ?? 0;
  const percentage = Math.min(100, (safeValue / max) * 100);

  return (
    <div className="text-center">
      <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">{label}</div>
      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {safeValue.toFixed(1)}{unit}
      </div>
      <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
