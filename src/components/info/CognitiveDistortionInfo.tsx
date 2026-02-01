/**
 * CognitiveDistortionInfo - Methoden-Erklärung Modal
 *
 * Collapsible Details-Element mit CBT-Hintergrund (Aaron Beck) + 7 Distortion-Typen.
 * Zeigt Theorie, Beispiele, Reframe-Konzept. Accessibility: aria-label, semantic HTML.
 */

export function CognitiveDistortionInfo() {
  return (
    <details className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
      <summary
        className="cursor-pointer text-xs text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300
                   list-none flex items-center gap-1
                   [&::-webkit-details-marker]:hidden"
        aria-label="Kognitive Verzerrungen - Methodenerklärung ein-/ausblenden"
      >
        <span
          className="text-[10px] transition-transform [[open]>&]:rotate-90"
          aria-hidden="true"
        >
          ℹ️
        </span>
        Wie funktioniert die Analyse kognitiver Verzerrungen?
      </summary>

      <div className="mt-2 space-y-3 text-[10px] text-muted-foreground">
        {/* Section 1: Theoretical Foundation */}
        <div>
          <p className="font-medium text-slate-500 dark:text-slate-400 mb-1">Theoretische Grundlage</p>
          <p className="leading-relaxed">
            Die Analyse basiert auf <strong>Aaron Becks Cognitive Behavioral Therapy</strong> (1960er-1980er Jahre),
            die systematische Denkfehler (kognitive Verzerrungen) identifiziert:
          </p>
          <ul className="mt-1 space-y-1 list-disc list-inside ml-2">
            <li><strong>Catastrophizing</strong> – Übertreibung negativer Folgen</li>
            <li><strong>All-or-Nothing</strong> – Schwarz-Weiß-Denken</li>
            <li><strong>Overgeneralization</strong> – Einzelfall → Universelle Regel</li>
            <li><strong>Mind-Reading</strong> – Annahmen über Gedanken anderer</li>
            <li><strong>Personalization</strong> – Übernahme fremder Verantwortung</li>
            <li><strong>Emotional Reasoning</strong> – Gefühl = Tatsache</li>
            <li><strong>Should Statements</strong> – Rigide Erwartungen</li>
          </ul>
          <p className="mt-1.5 text-[9px] leading-relaxed">
            Hablará bewertet den <strong>Thinking Style</strong>: Ausgewogen (0-2 Verzerrungen),
            Leicht verzerrt (3-4), Stark verzerrt (5+) und liefert CBT-basierte Reframe-Vorschläge.
          </p>
        </div>

        {/* Section 2: Dual-Track Methodology */}
        <div>
          <p className="font-medium text-slate-500 dark:text-slate-400 mb-1">Dual-Track Methodik</p>
          <p className="leading-relaxed">
            Die Analyse kombiniert <strong>Audio- und Text-Track</strong> für präzisere Verzerrungserkennung:
          </p>
          <ul className="mt-1 space-y-1 list-disc list-inside ml-2">
            <li>
              <strong>Audio-Track (60-70%)</strong> – Speech Rate + Energy (Catastrophizing),
              Pitch Variance (All-or-Nothing), Pause Patterns (Emotional Reasoning)
            </li>
            <li>
              <strong>Text-Track (80-85%)</strong> – LLM-basiert (qwen2.5:7b-custom), CEG-Prompting,
              semantische Verzerrungsmuster-Erkennung mit Examples/Patterns/Reframes
            </li>
            <li>
              <strong>Fusion (85-90%)</strong> – Weighted Combination, Multi-Distortion Support,
              Audio bestätigt Text-Verzerrungen oder zeigt emotionale Intensität
            </li>
          </ul>
          <p className="mt-1.5 text-[9px] leading-relaxed">
            Audio-Features eignen sich besser für emotionale Verzerrungen (Catastrophizing, Emotional Reasoning)
            als für logische Fehler (Mind-Reading, Overgeneralization). Text-Track dominiert daher.
          </p>
        </div>

        {/* Section 3: Implementation Details */}
        <div>
          <p className="font-medium text-slate-500 dark:text-slate-400 mb-1">Technische Implementation</p>
          <p className="leading-relaxed">
            Die Verzerrungsanalyse nutzt folgende Komponenten:
          </p>
          <ul className="mt-1 space-y-1 list-disc list-inside ml-2">
            <li><strong>Model</strong> – qwen2.5:7b-custom (Ollama Default), OpenAI/Anthropic optional</li>
            <li>
              <strong>Prompt</strong> – COGNITIVE_DISTORTION_PROMPT mit CEG-Pattern, 7 Verzerrungstypen
            </li>
            <li>
              <strong>Output</strong> – JSON Array mit distortions (type, example, pattern, reframe)
              + thinkingStyle (balanced/slightly_distorted/heavily_distorted)
            </li>
          </ul>
          <p className="mt-1.5 text-[9px] leading-relaxed">
            Audio-Features (Speech Rate, Energy, Pitch Variance, Pause Patterns) werden via Rust-Backend extrahiert.
            Text-Analyse erfolgt LLM-basiert mit strukturiertem Output für Reframe-Vorschläge.
          </p>
        </div>

        {/* Section 4: Expected Accuracy */}
        <div>
          <p className="font-medium text-slate-500 dark:text-slate-400 mb-1">Erwartete Genauigkeit</p>
          <p className="leading-relaxed">
            Basierend auf CBT-Forschung und Benchmarks:
          </p>
          <ul className="mt-1 space-y-1 list-disc list-inside ml-2">
            <li><strong>Audio-Track</strong> – 60-70% (emotionale Verzerrungen besser als logische)</li>
            <li><strong>Text-Track</strong> – 80-85% (semantische Verzerrungsmuster gut erkennbar)</li>
            <li><strong>Fused Output</strong> – 85-90% (Dual-Track-Vorteil bei emotionalen Verzerrungen)</li>
          </ul>
          <p className="mt-1.5 text-[9px] leading-relaxed">
            Accuracy variiert je nach Verzerrungstyp: Catastrophizing/Emotional Reasoning (Audio+Text stark)
            vs. Mind-Reading/Overgeneralization (Text-dominant). Multi-Verzerrungen werden unterstützt.
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
            Quellen: Beck (1976) | Burns (1980) |
            Hablará PHASE_21_PSYCHOLOGICAL_ENRICHMENTS.md
          </p>
        </div>
      </div>
    </details>
  );
}
