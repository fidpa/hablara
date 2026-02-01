import type { KnowledgeChunk } from "../../types";

/**
 * Four-sides model knowledge chunks (2 chunks)
 *
 * Schulz von Thun's communication model (1981):
 * - Four sides: Sachinhalt, Selbstoffenbarung, Beziehung, Appell
 * - Common misunderstandings and how to resolve them
 *
 * @see {@link ../../types.ts} for KnowledgeChunk interface
 */
export const fourSidesChunks: KnowledgeChunk[] = [
  {
    id: "four_sides_model",
    category: "four_sides",
    title: "Vier-Seiten-Modell (Schulz von Thun)",
    content:
      "Das Vier-Seiten-Modell nach Schulz von Thun (1981) beschreibt, dass jede Nachricht 4 Seiten hat: 1) Sachinhalt: Die reine Information (Fakten, Daten). 2) Selbstoffenbarung: Was offenbart der Sprecher über sich selbst (Gefühle, Werte, Motive). 3) Beziehung: Wie sieht der Sprecher den Empfänger (Wertschätzung, Respekt, Hierarchie). 4) Appell: Was will der Sprecher erreichen (Aufforderung, Wunsch, Manipulation). Beispiel: 'Die Ampel ist grün.' - Sachinhalt: Ampel ist grün. Selbstoffenbarung: Ich bin aufmerksam. Beziehung: Du bist unaufmerksam. Appell: Fahr los!",
    keywords: [
      "vier seiten modell",
      "schulz von thun",
      "sachinhalt",
      "selbstoffenbarung",
      "beziehung",
      "appell",
      "kommunikationsmodell",
      "4 seiten",
      "framework",
      "schema",
      "interpretation",
    ],
  },
  {
    id: "four_sides_misunderstandings",
    category: "four_sides",
    title: "Häufige Missverständnisse (Four-Sides)",
    content:
      "Missverständnisse entstehen wenn Sender und Empfänger unterschiedliche Seiten betonen. Beispiel: 'Die Ampel ist grün.' Sender meint: Sachinhalt (Ampel-Status). Empfänger hört: Beziehung ('Du bist unaufmerksam'). → Konflikt. Lösung: Vier Seiten explizit machen. 'Ich sehe, die Ampel ist grün. Könnten wir losfahren?' (Sachinhalt + Appell klar).",
    keywords: [
      "missverständnisse",
      "vier seiten",
      "konflikt",
      "sender empfänger",
      "interpretation",
      "kommunikation",
      "beziehungsseite",
      "fehlinterpretation",
    ],
  },
];
