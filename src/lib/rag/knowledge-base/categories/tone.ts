import type { KnowledgeChunk } from "../../types";

/**
 * Tone knowledge chunks (5 chunks)
 *
 * All 5 tone dimensions: Formality, Professionalism, Directness, Energy, Seriousness.
 * Each dimension uses a 1-5 scale. Used by RAG chatbot for tone analysis queries.
 *
 * @see {@link ../../types.ts} for KnowledgeChunk interface
 */
export const toneChunks: KnowledgeChunk[] = [
  {
    id: "tone_formality",
    category: "tone",
    title: "Formalität (Skala 1-5)",
    content:
      "Formality misst die Förmlichkeit der Sprache auf einer Skala von 1-5. 1 = Sehr informell (Slang, Umgangssprache, 'Hey', 'krass'), 3 = Neutral (Standard-Deutsch), 5 = Sehr formell (Akademisch, 'Sehr geehrte*r', 'diesbezüglich'). Beispiele: 1='Alter, was geht?', 3='Wie geht es dir?', 5='Ich möchte Sie höflichst um eine Stellungnahme bitten.'",
    keywords: [
      "formality",
      "formalität",
      "förmlichkeit",
      "slang",
      "akademisch",
      "höflichkeit",
      "1-5 skala",
      "umgangssprache",
      "register",
    ],
  },
  {
    id: "tone_professionalism",
    category: "tone",
    title: "Professionalität (Skala 1-5)",
    content:
      "Professionalism misst den beruflichen Kontext der Sprache auf einer Skala von 1-5. 1 = Sehr persönlich (Emotionen, private Details), 3 = Neutral (sachlich, aber nicht steif), 5 = Sehr professionell (Business-Sprache, objektiv, distanziert). Beispiele: 1='Ich bin total fertig', 3='Ich habe viel gearbeitet', 5='Die Ressourcen wurden effizient eingesetzt.'",
    keywords: [
      "professionalism",
      "professionalität",
      "business",
      "sachlich",
      "objektiv",
      "persönlich",
      "1-5 skala",
      "beruflich",
      "distanz",
    ],
  },
  {
    id: "tone_directness",
    category: "tone",
    title: "Direktheit (Skala 1-5)",
    content:
      "Directness misst wie direkt oder indirekt eine Aussage ist, auf einer Skala von 1-5. 1 = Sehr indirekt (Andeutungen, Umschweife), 3 = Neutral (klar, aber höflich), 5 = Sehr direkt (explizit, unverblümt). Beispiele: 1='Vielleicht wäre es möglich...', 3='Ich schlage vor...', 5='Mach das sofort.'",
    keywords: [
      "directness",
      "direktheit",
      "klar",
      "explizit",
      "indirekt",
      "andeutung",
      "1-5 skala",
    ],
  },
  {
    id: "tone_energy",
    category: "tone",
    title: "Energie (Skala 1-5)",
    content:
      "Energy misst die sprachliche Energie und Lebhaftigkeit auf einer Skala von 1-5. 1 = Sehr ruhig (monoton, langsam), 3 = Neutral (normal), 5 = Sehr energetisch (dynamisch, begeistert). Beispiele: 1='Es ist okay...', 3='Das ist gut', 5='Das ist fantastisch, ich liebe es!'",
    keywords: [
      "energy",
      "energie",
      "lebhaftigkeit",
      "dynamisch",
      "begeistert",
      "ruhig",
      "monoton",
      "1-5 skala",
      "sprachliche energie",
      "tempo",
    ],
  },
  {
    id: "tone_seriousness",
    category: "tone",
    title: "Ernsthaftigkeit (Skala 1-5)",
    content:
      "Seriousness misst wie ernst oder locker der Ton ist, auf einer Skala von 1-5. 1 = Sehr locker (humorvoll, spielerisch), 3 = Neutral (sachlich), 5 = Sehr ernst (feierlich, gewichtig). Beispiele: 1='Haha, das ist lustig', 3='Das ist interessant', 5='Dies ist eine kritische Angelegenheit.'",
    keywords: [
      "seriousness",
      "ernsthaftigkeit",
      "ernst",
      "humorvoll",
      "locker",
      "spielerisch",
      "sachlich",
      "1-5 skala",
    ],
  },
];
