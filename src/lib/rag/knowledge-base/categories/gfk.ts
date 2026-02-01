import type { KnowledgeChunk } from "../../types";

/**
 * GFK knowledge chunks (3 chunks)
 *
 * Gewaltfreie Kommunikation nach Rosenberg (1999/2003):
 * - 4 components (Observation, Feeling, Need, Request)
 * - Pseudogefuehle vs. echte Gefuehle
 * - Rosenberg's philosophy
 *
 * @see {@link ../../types.ts} for KnowledgeChunk interface
 */
export const gfkChunks: KnowledgeChunk[] = [
  {
    id: "gfk_four_components",
    category: "gfk",
    title: "Gewaltfreie Kommunikation (GFK)",
    content:
      "Gewaltfreie Kommunikation (GFK) nach Rosenberg (1999/2003) besteht aus 4 Komponenten: 1) Beobachtung: Konkrete Fakten ohne Bewertung (Beispiel: 'Du kamst 20 Minuten später' statt 'Du bist unpünktlich'). 2) Gefühl: Emotionale Reaktion benennen (Beispiel: 'Ich bin frustriert' statt 'Du machst mich wütend'). 3) Bedürfnis: Zugrundeliegendes Bedürfnis identifizieren (Beispiel: 'Ich brauche Verlässlichkeit'). 4) Bitte: Konkrete, erfüllbare Bitte formulieren (Beispiel: 'Könntest du mir nächstes Mal Bescheid geben, wenn du später kommst?').",
    keywords: [
      "gfk",
      "gewaltfreie kommunikation",
      "rosenberg",
      "beobachtung",
      "gefühl",
      "bedürfnis",
      "bitte",
      "4 komponenten",
      "konflikt",
      "verständnis",
      "respekt",
      "empathie",
    ],
  },
  {
    id: "gfk_pseudogefuehle",
    category: "gfk",
    title: "Pseudogefühle vs. Echte Gefühle (GFK)",
    content:
      "Pseudogefühle enthalten Schuldzuweisung: 'Ich fühle mich ignoriert/manipuliert/verraten'. Echte Gefühle sind selbst-bezogen: 'Ich bin traurig/ängstlich/wütend'. Unterscheidung: Pseudogefühl = 'Ich fühle mich [von dir]...', Echtes Gefühl = 'Ich bin...'. Beispiele: ignoriert→traurig, manipuliert→ängstlich, verraten→verletzt, ungerecht behandelt→frustriert.",
    keywords: [
      "pseudogefühle",
      "echte gefühle",
      "schuldzuweisung",
      "gfk",
      "gefühl",
      "manipulation",
      "ignoriert",
    ],
  },
  {
    id: "gfk_rosenberg_philosophy",
    category: "gfk",
    title: "Rosenberg's GFK Philosophy",
    content:
      "Rosenberg (1999/2003) entwickelte GFK basierend auf der Annahme: Alle Menschen haben dieselben Grundbedürfnisse (Autonomie, Verbindung, Sinn, Wohlbefinden). Konflikte entstehen durch unerfüllte Bedürfnisse, nicht durch 'böse' Menschen. GFK-Philosophie: 1) Empathie statt Urteil, 2) Bedürfnisse statt Strategien, 3) Bitten statt Forderungen. Ziel: Win-Win-Lösungen durch gegenseitiges Verständnis. Hablará nutzt diesen Ansatz für Selbstreflexion.",
    keywords: [
      "rosenberg",
      "gfk philosophie",
      "grundbedürfnisse",
      "empathie",
      "win-win",
      "verständnis",
      "konflikte",
      "theorie",
    ],
  },
];
