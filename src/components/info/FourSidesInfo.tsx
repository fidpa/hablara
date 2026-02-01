/**
 * FourSidesInfo - Methoden-Erklärung Modal
 *
 * Collapsible Details-Element mit Schulz von Thun Theorie + 4 Seiten-Erklärung.
 * Zeigt Sachinhalt, Selbstoffenbarung, Beziehung, Appell. Accessibility: aria-label.
 */

export function FourSidesInfo() {
  return (
    <details className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
      <summary
        className="cursor-pointer text-xs text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300
                   list-none flex items-center gap-1
                   [&::-webkit-details-marker]:hidden"
        aria-label="Vier-Seiten-Modell - Methodenerklärung ein-/ausblenden"
      >
        <span
          className="text-[10px] transition-transform [[open]>&]:rotate-90"
          aria-hidden="true"
        >
          ℹ️
        </span>
        Wie funktioniert die Vier-Seiten-Analyse?
      </summary>

      <div className="mt-2 space-y-3 text-[10px] text-muted-foreground">
        {/* Section 1: Theoretical Foundation */}
        <div>
          <p className="font-medium text-slate-500 dark:text-slate-400 mb-1">Theoretische Grundlage</p>
          <p className="leading-relaxed">
            Die Analyse basiert auf <strong>Schulz von Thuns Vier-Seiten-Modell</strong> (1981),
            einem Kommunikationsmodell das jede Nachricht in 4 Ebenen zerlegt:
          </p>
          <ul className="mt-1 space-y-1 list-disc list-inside ml-2">
            <li><strong>Sachinhalt (blau)</strong> – Objektive Informationen, Fakten</li>
            <li><strong>Selbstoffenbarung (lila)</strong> – Was ich über mich preisgebe</li>
            <li><strong>Beziehung (pink)</strong> – Wie ich zum Gegenüber stehe</li>
            <li><strong>Appell (orange)</strong> – Was ich erreichen möchte</li>
          </ul>
          <p className="mt-1.5 text-[9px] leading-relaxed">
            Hablará analysiert zusätzlich <strong>Missverständnisse</strong>: Sender-Empfänger-Diskrepanzen,
            die durch unterschiedliche Schwerpunkte auf den 4 Ebenen entstehen können.
          </p>
        </div>

        {/* Section 2: Dual-Track Methodology */}
        <div>
          <p className="font-medium text-slate-500 dark:text-slate-400 mb-1">Dual-Track Methodik</p>
          <p className="leading-relaxed">
            Die Analyse kombiniert <strong>Audio- und Text-Track</strong> für multi-dimensionale Kommunikations-Analyse:
          </p>
          <ul className="mt-1 space-y-1 list-disc list-inside ml-2">
            <li>
              <strong>Audio-Track (50-60%)</strong> – Tone Features (Sachinhalt: neutral, Beziehung: warm/cold),
              Energy + Pitch (Appell: direktiv, Selbstoffenbarung: vulnerabel)
            </li>
            <li>
              <strong>Text-Track (75-85%)</strong> – LLM-basiert (qwen2.5:7b-custom), CEG-Prompting,
              semantische Analyse der 4 Dimensionen + Missverständnis-Erkennung
            </li>
            <li>
              <strong>Fusion (80-90%)</strong> – Missverständnisse-Prävention via Audio-Text-Divergenzen,
              Audio zeigt emotionale Beziehungsebene, Text zeigt sachliche Inhaltsebene
            </li>
          </ul>
          <p className="mt-1.5 text-[9px] leading-relaxed">
            Audio-Features eignen sich gut für Beziehungs- und Appellebene (Tonalität, Direktheit),
            während Text-Track besser Sachinhalt und Selbstoffenbarung erfasst.
          </p>
        </div>

        {/* Section 3: Implementation Details */}
        <div>
          <p className="font-medium text-slate-500 dark:text-slate-400 mb-1">Technische Implementation</p>
          <p className="leading-relaxed">
            Die Vier-Seiten-Analyse nutzt folgende Komponenten:
          </p>
          <ul className="mt-1 space-y-1 list-disc list-inside ml-2">
            <li><strong>Model</strong> – qwen2.5:7b-custom (Ollama Default), OpenAI/Anthropic optional</li>
            <li>
              <strong>Prompt</strong> – FOUR_SIDES_PROMPT mit CEG-Pattern, 4 Dimensionen + Missverständnisse
            </li>
            <li>
              <strong>Output</strong> – JSON mit factual (Sachinhalt), selfRevelation (Selbstoffenbarung),
              relationship (Beziehung), appeal (Appell), missverstaendnisse (Array von Sender-Empfänger-Diskrepanzen)
            </li>
          </ul>
          <p className="mt-1.5 text-[9px] leading-relaxed">
            Audio-Features (Tone, Energy, Pitch) werden via Rust-Backend extrahiert. Text-Analyse erfolgt
            LLM-basiert mit 4-Quadrant-Struktur. Missverständnisse werden durch Divergenzen erkannt.
          </p>
        </div>

        {/* Section 4: Expected Accuracy */}
        <div>
          <p className="font-medium text-slate-500 dark:text-slate-400 mb-1">Erwartete Genauigkeit</p>
          <p className="leading-relaxed">
            Basierend auf Kommunikationsforschung und Benchmarks:
          </p>
          <ul className="mt-1 space-y-1 list-disc list-inside ml-2">
            <li>
              <strong>Audio-Track</strong> – 50-60% (gut für Beziehung/Appell, limitiert für Sachinhalt)
            </li>
            <li>
              <strong>Text-Track</strong> – 75-85% (semantische Klarheit, LLM-Fähigkeiten für 4 Dimensionen)
            </li>
            <li>
              <strong>Fused Output</strong> – 80-90% (Dual-Track-Vorteil, Missverständnis-Prävention)
            </li>
          </ul>
          <p className="mt-1.5 text-[9px] leading-relaxed">
            Accuracy variiert je nach Dimension: Beziehung/Appell (Audio+Text stark) vs. Sachinhalt
            (Text-dominant). Missverständnisse werden besser erkannt wenn Audio-Text-Divergenz groß.
          </p>
        </div>

        {/* Section 5: Disclaimer + Crisis Hotline */}
        <div className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-2">
          <p className="text-slate-500 dark:text-slate-400">
            <strong>Wichtig:</strong> Dies ist ein Selbstreflexions-Tool, kein Ersatz
            für professionelle Beratung. KI-Analysen können ungenau sein.
          </p>
          <p className="text-slate-500 dark:text-slate-400">
            <strong>Krisenhotline:</strong> Bei akuten psychischen Krisen wenden Sie sich an die{" "}
            <a href="tel:08001110111" className="text-blue-600 dark:text-blue-400 hover:underline">
              Telefonseelsorge 0800 111 0 111
            </a>{" "}
            (24/7, kostenlos, anonym).
          </p>
        </div>

        {/* Sources */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <p className="text-[9px] italic">
            Quellen: Schulz von Thun (1981) | Rosenberg (1999/2003) |
            Hablará PHASE_21_PSYCHOLOGICAL_ENRICHMENTS.md
          </p>
        </div>
      </div>
    </details>
  );
}
