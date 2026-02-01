/**
 * GFKInfo - Methoden-Erklärung Modal
 *
 * Collapsible Details-Element mit GFK-Theorie (Rosenberg) + 6 Sections-Erklärung.
 * Zeigt Beobachtung, Gefühle, Bedürfnisse, Bitten. Accessibility: aria-label.
 */

export function GFKInfo() {
  return (
    <details className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
      <summary
        className="cursor-pointer text-xs text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300
                   list-none flex items-center gap-1
                   [&::-webkit-details-marker]:hidden"
        aria-label="GFK-Analyse - Methodenerklärung ein-/ausblenden"
      >
        <span
          className="text-[10px] transition-transform [[open]>&]:rotate-90"
          aria-hidden="true"
        >
          ℹ️
        </span>
        Wie funktioniert die GFK-Analyse?
      </summary>

      <div className="mt-2 space-y-3 text-[10px] text-muted-foreground">
        {/* Section 1: Theoretical Foundation */}
        <div>
          <p className="font-medium text-slate-500 dark:text-slate-400 mb-1">Theoretische Grundlage</p>
          <p className="leading-relaxed">
            Die GFK-Analyse basiert auf <strong>Marshall Rosenbergs Nonviolent Communication</strong> (1960er-2000er Jahre),
            einem psychologischen Kommunikationsmodell mit 4 Kernkomponenten:
          </p>
          <ul className="mt-1 space-y-1 list-disc list-inside ml-2">
            <li><strong>Beobachtung</strong> – Fakten ohne Bewertung</li>
            <li><strong>Gefühle</strong> – Emotionale Reaktionen</li>
            <li><strong>Bedürfnisse</strong> – Zugrundeliegende Werte</li>
            <li><strong>Bitten</strong> – Konkrete Handlungsvorschläge</li>
          </ul>
          <p className="mt-1.5 text-[9px] leading-relaxed">
            Hablará erweitert das Modell um zwei Komponenten: <strong>GFK-Übersetzung</strong> (Reframing in GFK-Sprache)
            und <strong>Reflexionsfrage</strong> (Vertiefung der Selbstreflexion).
          </p>
        </div>

        {/* Section 2: Dual-Track Methodology */}
        <div>
          <p className="font-medium text-slate-500 dark:text-slate-400 mb-1">Dual-Track Methodik</p>
          <p className="leading-relaxed">
            Die Analyse kombiniert <strong>Audio- und Text-Track</strong> für höhere Genauigkeit:
          </p>
          <ul className="mt-1 space-y-1 list-disc list-inside ml-2">
            <li>
              <strong>Audio-Track (55-65%)</strong> – Pitch Variance (Emotionen), Pause Duration (Reflexion),
              Energy Dynamics (Bedürfnis-Intensität)
            </li>
            <li>
              <strong>Text-Track (75-85%)</strong> – LLM-basiert (qwen2.5:7b-custom), CEG-Prompting
              (Chain of Evidence Gathering), semantische GFK-Struktur-Erkennung
            </li>
            <li>
              <strong>Fusion (80-90%)</strong> – Weighted Combination (Audio 40%, Text 60%), Audio-Signale
              bestätigen Text-Struktur oder decken Diskrepanzen auf
            </li>
          </ul>
          <p className="mt-1.5 text-[9px] leading-relaxed">
            Die Audio-Features sind für GFK-Struktur limitiert (prosodische Signale zeigen Emotionen,
            aber nicht explizit Bedürfnisse/Bitten). Text-Track dominiert daher bei GFK.
          </p>
        </div>

        {/* Section 3: Implementation Details */}
        <div>
          <p className="font-medium text-slate-500 dark:text-slate-400 mb-1">Technische Implementation</p>
          <p className="leading-relaxed">
            Die GFK-Analyse nutzt folgende Komponenten:
          </p>
          <ul className="mt-1 space-y-1 list-disc list-inside ml-2">
            <li><strong>Model</strong> – qwen2.5:7b-custom (Ollama Default), OpenAI/Anthropic optional</li>
            <li><strong>Prompt</strong> – GFK_ANALYSIS_PROMPT mit CEG-Pattern (Chain of Evidence Gathering)</li>
            <li>
              <strong>Output</strong> – JSON mit 6 Sections: observations (Beobachtungen), feelings (Gefühle),
              needs (Bedürfnisse), requests (Bitten), translation (GFK-Übersetzung), reflectionQuestion
            </li>
          </ul>
          <p className="mt-1.5 text-[9px] leading-relaxed">
            Audio-Features (Pitch Variance, Pause Duration, Energy) werden via Rust-Backend extrahiert,
            Text-Analyse erfolgt LLM-basiert via Ollama/OpenAI/Anthropic API.
          </p>
        </div>

        {/* Section 4: Expected Accuracy */}
        <div>
          <p className="font-medium text-slate-500 dark:text-slate-400 mb-1">Erwartete Genauigkeit</p>
          <p className="leading-relaxed">
            Basierend auf Benchmarks und psychologischer Forschung:
          </p>
          <ul className="mt-1 space-y-1 list-disc list-inside ml-2">
            <li><strong>Audio-Track</strong> – 55-65% (prosodische Signale limitiert für GFK-Struktur)</li>
            <li><strong>Text-Track</strong> – 75-85% (semantische Klarheit, LLM-Fähigkeiten)</li>
            <li><strong>Fused Output</strong> – 80-90% (Dual-Track-Vorteil, Divergenz-Erkennung)</li>
          </ul>
          <p className="mt-1.5 text-[9px] leading-relaxed">
            Accuracy variiert je nach Sprechstil (klar strukturierte Aussagen vs. Stream-of-Consciousness),
            Audio-Qualität und LLM-Provider. Ollama (lokal) tendiert zu niedrigerer Accuracy als OpenAI/Anthropic.
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
            Quellen: Rosenberg (1999/2003) | Beck (1976) |
            Hablará PHASE_21_PSYCHOLOGICAL_ENRICHMENTS.md
          </p>
        </div>
      </div>
    </details>
  );
}
