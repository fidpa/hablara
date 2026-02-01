import type { KnowledgeChunk } from "../../types";

/**
 * Cognitive distortion knowledge chunks (9 chunks)
 *
 * 7 CBT distortion types (Beck 1976) + Reframing Guide + Beck's Framework.
 * Used by RAG chatbot for cognitive distortion queries and reframing suggestions.
 *
 * @see {@link ../../types.ts} for KnowledgeChunk interface
 */
export const cognitiveDistortionChunks: KnowledgeChunk[] = [
  {
    id: "cd_black_white_thinking",
    category: "cognitive_distortion",
    title: "Schwarz-Weiß-Denken",
    content:
      "Schwarz-Weiß-Denken bedeutet, dass man nur in Extremen denkt (alles oder nichts, perfekt oder Versagen). Beispiel: 'Wenn ich nicht perfekt bin, bin ich ein totaler Versager.' Reframing: Erkenne, dass es viele Graustufen gibt zwischen Extremen. Die meisten Situationen sind nicht komplett gut oder komplett schlecht. Nach Beck (1976).",
    keywords: [
      "schwarz weiß denken",
      "dichotom",
      "extrem",
      "alles oder nichts",
      "perfekt",
      "kognitive verzerrung",
      "denkmuster",
      "cbt",
    ],
  },
  {
    id: "cd_overgeneralization",
    category: "cognitive_distortion",
    title: "Übergeneralisierung",
    content:
      "Übergeneralisierung bedeutet, dass man von einem einzelnen Ereignis auf eine allgemeine Regel schließt. Beispiel: 'Ich habe einmal versagt, also bin ich immer ein Versager.' Reframing: Erkenne, dass ein einzelnes Ereignis keine allgemeine Regel ist. Jede Situation ist einzigartig. Nach Beck (1976).",
    keywords: [
      "übergeneralisierung",
      "overgeneralization",
      "allgemeine regel",
      "immer",
      "nie",
      "kognitive verzerrung",
    ],
  },
  {
    id: "cd_catastrophizing",
    category: "cognitive_distortion",
    title: "Katastrophisierung",
    content:
      "Katastrophisierung bedeutet unrealistisches Worst-Case-Denken ohne Grundlage. Beispiel: 'Ein kleiner Fehler → kompletter Untergang.' Reframing: Wie wahrscheinlich ist das Worst-Case-Szenario? Was ist realistisch? Keine Übertreibung. Nach Beck (1976).",
    keywords: [
      "katastrophisierung",
      "catastrophizing",
      "worst case",
      "unrealistisch",
      "übertreibung",
      "kognitive verzerrung",
    ],
  },
  {
    id: "cd_mind_reading",
    category: "cognitive_distortion",
    title: "Gedankenlesen",
    content:
      "Gedankenlesen bedeutet, dass man annimmt, zu wissen, was andere denken, ohne es zu überprüfen. Beispiel: 'Sie denkt bestimmt, ich bin inkompetent.' Reframing: Du kannst nicht wissen, was andere denken. Frage nach oder überprüfe deine Annahmen. Nach Beck (1976).",
    keywords: [
      "gedankenlesen",
      "mind reading",
      "annahme",
      "denkt bestimmt",
      "weiß was andere denken",
      "kognitive verzerrung",
    ],
  },
  {
    id: "cd_emotional_reasoning",
    category: "cognitive_distortion",
    title: "Emotionales Schlussfolgern",
    content:
      "Emotionales Schlussfolgern bedeutet, dass man seine Gefühle als Beweis für Fakten nimmt. Beispiel: 'Ich fühle mich inkompetent, also bin ich inkompetent.' Reframing: Gefühle sind keine Fakten. Prüfe objektive Evidenz statt nur auf deine Emotionen zu hören. Nach Beck (1976).",
    keywords: [
      "emotionales schlussfolgern",
      "emotional reasoning",
      "gefühl als fakt",
      "fühle mich also bin ich",
      "kognitive verzerrung",
    ],
  },
  {
    id: "cd_should_statements",
    category: "cognitive_distortion",
    title: "Sollte-Aussagen",
    content:
      "Sollte-Aussagen bedeuten, dass man starre Regeln aufstellt ('Ich sollte...', 'Ich müsste...'). Beispiel: 'Ich sollte immer perfekt sein.' Reframing: Ersetze 'sollte' durch 'möchte' oder 'es wäre schön, wenn'. Das reduziert Druck und Schuldgefühle. Nach Beck (1976).",
    keywords: [
      "sollte aussagen",
      "should statements",
      "sollte",
      "müsste",
      "starre regeln",
      "kognitive verzerrung",
    ],
  },
  {
    id: "cd_personalization",
    category: "cognitive_distortion",
    title: "Personalisierung",
    content:
      "Personalisierung bedeutet, dass man sich für Dinge verantwortlich fühlt, die man nicht kontrollieren kann. Beispiel: 'Mein Team hat versagt, das ist meine Schuld.' Reframing: Erkenne, was du kontrollieren kannst und was nicht. Nicht alles ist deine Verantwortung. Nach Beck (1976).",
    keywords: [
      "personalisierung",
      "personalization",
      "alles meine schuld",
      "verantwortung",
      "kontrolle",
      "kognitive verzerrung",
    ],
  },
  {
    id: "cd_reframing_guide",
    category: "cognitive_distortion",
    title: "Reframing Guide für Kognitive Verzerrungen",
    content:
      "Reframing-Strategien nach Beck (1976), CBT-basiert: 1) Black-White: Grautöne erkennen. 2) Overgeneralization: 'Immer'→'Manchmal' ersetzen. 3) Catastrophizing: Realistische Wahrscheinlichkeit prüfen. 4) Mind-Reading: Annahmen hinterfragen. 5) Emotional Reasoning: Gefühl ≠ Fakt. 6) Should Statements: 'Sollte'→'Möchte' ersetzen. 7) Personalization: Kontrolle vs. keine Kontrolle unterscheiden. Ziel: Realistische, ausgewogene Perspektive entwickeln.",
    keywords: [
      "reframing",
      "kognitive verzerrungen",
      "cbt",
      "umdeuten",
      "perspektive",
      "realismus",
      "ausgewogen",
      "strategien",
    ],
  },
  {
    id: "cd_beck_framework",
    category: "cognitive_distortion",
    title: "Beck's Cognitive Distortions Framework",
    content:
      "Beck (1976), Begründer der Kognitiven Verhaltenstherapie, identifizierte systematische Denkmuster, die zu psychischem Leiden führen. Kernkonzept: Automatische negative Gedanken (ANTs) basieren auf kognitiven Verzerrungen. CBT-Ansatz: 1) Identifizieren der Verzerrung, 2) Evidenz sammeln (für/gegen), 3) Alternative Interpretation entwickeln. Hablará nutzt 7 häufige Verzerrungen aus Beck's Framework für Selbstreflexion (nicht-klinisch).",
    keywords: [
      "aaron beck",
      "cbt",
      "kognitive verhaltenstherapie",
      "framework",
      "automatische gedanken",
      "ants",
      "evidenz",
      "theorie",
    ],
  },
];
