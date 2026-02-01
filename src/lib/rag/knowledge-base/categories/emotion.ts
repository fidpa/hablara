import type { KnowledgeChunk } from "../../types";

/**
 * Emotion knowledge chunks (12 chunks)
 *
 * Includes all 10 emotion types plus Plutchik's Wheel and Russell's Circumplex.
 * Used by RAG chatbot for emotion-related queries.
 *
 * @see {@link ../../types.ts} for KnowledgeChunk interface
 */
export const emotionChunks: KnowledgeChunk[] = [
  {
    id: "emotion_neutral",
    category: "emotion",
    title: "Neutral",
    content:
      "Neutral ist eine Baseline-Emotion ohne starke positive oder negative Färbung. Valence: 0.0 (neutral), Arousal: 0.5 (mittel) nach Russell (1980). Audio-Marker: Moderate Pitch (~120-180 Hz), moderate Energie, normale Sprechgeschwindigkeit (0.9-1.1x). Text-Marker: Sachliche Sprache, keine emotionalen Ausdrücke, neutrale Wortwahl.",
    keywords: [
      "neutral",
      "baseline",
      "sachlich",
      "valence 0",
      "moderate",
      "keine emotion",
    ],
  },
  {
    id: "emotion_calm",
    category: "emotion",
    title: "Ruhig (Calm)",
    content:
      "Ruhig ist eine positive Emotion mit niedriger Aktivierung. Valence: 0.6 (positiv), Arousal: 0.2 (niedrig) nach Russell (1980). Audio-Marker: Niedrige Pitch-Varianz, niedrige Energie, langsame Sprechgeschwindigkeit (<0.9x), lange Pausen. Text-Marker: Worte wie 'entspannt', 'gelassen', 'friedlich', 'ruhig'. Zustand von Gelassenheit und innerer Ruhe.",
    keywords: [
      "ruhig",
      "calm",
      "entspannt",
      "gelassen",
      "friedlich",
      "niedrige arousal",
      "positiv",
      "langsam",
    ],
  },
  {
    id: "emotion_stress",
    category: "emotion",
    title: "Stress",
    content:
      "Stress ist eine negative Emotion mit hoher Aktivierung. Valence: -0.5 (negativ), Arousal: 0.8 (hoch) nach Russell (1980). Audio-Marker: Schnelles Sprechen (>1.2x), hohe Pitch-Varianz, hohe Energie, kurze Pausen. Text-Marker: Worte wie 'gestresst', 'unter Druck', 'Deadline', 'Überforderung', 'Zeitdruck'. Zustand von psychischer Belastung und Anspannung.",
    keywords: [
      "stress",
      "gestresst",
      "unter druck",
      "deadline",
      "überforderung",
      "hohe arousal",
      "negativ",
      "schnell",
      "pitch varianz",
    ],
  },
  {
    id: "emotion_excitement",
    category: "emotion",
    title: "Aufregung (Excitement)",
    content:
      "Aufregung ist eine positive Emotion mit hoher Aktivierung. Valence: 0.7 (positiv), Arousal: 0.9 (sehr hoch) nach Russell (1980). Audio-Marker: Sehr schnelles Sprechen, hohe Pitch-Varianz, sehr hohe Energie. Text-Marker: Worte wie 'aufgeregt', 'gespannt', 'begeistert', 'kann es kaum erwarten'. Zustand von freudiger Erwartung und Enthusiasmus.",
    keywords: [
      "aufregung",
      "excitement",
      "aufgeregt",
      "gespannt",
      "begeistert",
      "enthusiasmus",
      "hohe arousal",
      "positiv",
      "schnell",
    ],
  },
  {
    id: "emotion_uncertainty",
    category: "emotion",
    title: "Unsicherheit (Uncertainty)",
    content:
      "Unsicherheit ist eine leicht negative Emotion mit moderater Aktivierung. Valence: -0.2 (leicht negativ), Arousal: 0.4 (moderat) nach Russell (1980). Audio-Marker: Zögerndes Sprechen, viele Pausen, moderate Energie. Text-Marker: Worte wie 'unsicher', 'vielleicht', 'ich weiß nicht', 'könnte sein', 'bin mir nicht sicher'. Zustand von Zweifel und mangelnder Klarheit.",
    keywords: [
      "unsicherheit",
      "uncertainty",
      "unsicher",
      "vielleicht",
      "zweifel",
      "weiß nicht",
      "zögernd",
      "pausen",
    ],
  },
  {
    id: "emotion_frustration",
    category: "emotion",
    title: "Frustration",
    content:
      "Frustration ist eine negative Emotion mit hoher Aktivierung. Valence: -0.6 (negativ), Arousal: 0.7 (hoch) nach Russell (1980). Audio-Marker: Angespannte Stimme, hohe Energie, schnelles Sprechen. Text-Marker: Worte wie 'frustrierend', 'nervt', 'ärgerlich', 'genervt', 'es funktioniert nicht'. Zustand von Ärger durch Hindernisse oder Misserfolg.",
    keywords: [
      "frustration",
      "frustriert",
      "genervt",
      "ärgerlich",
      "nervt",
      "angespannt",
      "negativ",
      "hohe arousal",
    ],
  },
  {
    id: "emotion_joy",
    category: "emotion",
    title: "Freude (Joy)",
    content:
      "Freude ist eine stark positive Emotion mit hoher Aktivierung. Valence: 0.9 (sehr positiv), Arousal: 0.7 (hoch) nach Russell (1980). Audio-Marker: Höhere Pitch, hohe Energie, lebhafte Sprechweise. Text-Marker: Worte wie 'glücklich', 'freue mich', 'toll', 'wunderbar', 'großartig'. Zustand von Glück und positiver Stimmung.",
    keywords: [
      "freude",
      "joy",
      "glücklich",
      "freue mich",
      "toll",
      "wunderbar",
      "großartig",
      "positiv",
      "höhere pitch",
    ],
  },
  {
    id: "emotion_doubt",
    category: "emotion",
    title: "Zweifel (Doubt)",
    content:
      "Zweifel ist eine negative Emotion mit moderater Aktivierung. Valence: -0.3 (negativ), Arousal: 0.5 (mittel) nach Russell (1980). Audio-Marker: Zögernde Intonation, Pausen vor wichtigen Worten, moderate Energie. Text-Marker: Worte wie 'zweifeln', 'fraglich', 'skeptisch', 'unsicher', 'glaube nicht'. Zustand von Misstrauen und Infragestellung.",
    keywords: [
      "zweifel",
      "doubt",
      "zweifeln",
      "skeptisch",
      "fraglich",
      "misstrauen",
      "zögernd",
      "pausen",
    ],
  },
  {
    id: "emotion_conviction",
    category: "emotion",
    title: "Überzeugung (Conviction)",
    content:
      "Überzeugung ist eine positive Emotion mit moderater bis hoher Aktivierung. Valence: 0.4 (positiv), Arousal: 0.6 (moderat-hoch) nach Russell (1980). Audio-Marker: Feste Stimme, klare Artikulation, moderate Energie, stabile Pitch. Text-Marker: Worte wie 'überzeugt', 'sicher', 'definitiv', 'absolut', 'ohne Zweifel'. Zustand von Gewissheit und Entschlossenheit.",
    keywords: [
      "überzeugung",
      "conviction",
      "überzeugt",
      "sicher",
      "definitiv",
      "absolut",
      "fest",
      "klar",
    ],
  },
  {
    id: "emotion_aggression",
    category: "emotion",
    title: "Aggression",
    content:
      "Aggression ist eine stark negative Emotion mit sehr hoher Aktivierung. Valence: -0.8 (stark negativ), Arousal: 0.9 (sehr hoch) nach Russell (1980). Audio-Marker: Sehr hohe Energie, laute Stimme, schnelles Sprechen, hohe Spectral Flux (harsche Frequenzen). Text-Marker: Worte wie 'wütend', 'aggressiv', 'sauer', 'hasse', 'Konflikt'. Zustand von Feindseligkeit und Angriffslust.",
    keywords: [
      "aggression",
      "aggressiv",
      "wütend",
      "sauer",
      "hasse",
      "feindseligkeit",
      "hohe energie",
      "laut",
      "spectral flux",
    ],
  },
  {
    id: "emotion_plutchik_wheel",
    category: "emotion",
    title: "Plutchik's Wheel of Emotions",
    content:
      "Plutchik's Wheel beschreibt 8 Basis-Emotionen in Gegensatzpaaren: Freude↔Trauer, Vertrauen↔Ekel, Angst↔Wut, Überraschung↔Erwartung. Sekundäre Emotionen entstehen durch Mischung benachbarter Emotionen: Liebe = Freude + Vertrauen, Unterwerfung = Vertrauen + Angst, Ehrfurcht = Angst + Überraschung. Intensität variiert radial (z.B. Verärgerung → Wut → Raserei). Hablará nutzt dieses Modell für Emotion Blending.",
    keywords: [
      "plutchik",
      "wheel of emotions",
      "8 basis emotionen",
      "mischung",
      "sekundär",
      "intensität",
      "blending",
      "gegensatzpaare",
    ],
  },
  {
    id: "emotion_russell_circumplex",
    category: "emotion",
    title: "Russell's Circumplex Model",
    content:
      "Russell's Circumplex Model ordnet Emotionen auf 2 Dimensionen: Valence (negativ ↔ positiv) und Arousal (deaktiviert ↔ aktiviert). Beispiele: Stress = negativ + aktiviert (-0.5, 0.8), Ruhig = positiv + deaktiviert (0.6, 0.2). Hablará nutzt dieses Modell für Dimensional Emotion und Blended Coordinates (Interpolation zwischen Primär/Sekundär Emotionen im 2D-Raum).",
    keywords: [
      "russell",
      "circumplex model",
      "valence arousal",
      "2 dimensionen",
      "dimensional emotion",
      "blended coordinates",
      "interpolation",
    ],
  },
];
