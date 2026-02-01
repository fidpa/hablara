import type { KnowledgeChunk } from "../../types";

/**
 * Fallacy knowledge chunks (16 chunks)
 *
 * Tier 1 (6 classical) + Tier 2 (10 high voice-relevance) logical fallacies.
 * Used by RAG chatbot for fallacy detection and explanation queries.
 *
 * @see {@link ../../types.ts} for KnowledgeChunk interface
 */
export const fallacyChunks: KnowledgeChunk[] = [
  {
    id: "fallacy_ad_hominem",
    category: "fallacy",
    title: "Ad Hominem",
    content:
      "Ad Hominem bedeutet 'Angriff auf die Person statt auf das Argument'. Definition: Die Argumentation richtet sich gegen die Person, die das Argument vorbringt, statt gegen das Argument selbst. Beispiel: 'Du bist inkompetent, also ist dein Vorschlag falsch.' Erkennungsmerkmale: Persönliche Angriffe, Diskreditierung des Sprechers, Ablenkung vom eigentlichen Sachverhalt. Empfehlung: Konzentriere dich auf das Argument, nicht auf die Person. Logischer Fehlschluss (klassisch).",
    keywords: [
      "ad hominem",
      "persönlicher angriff",
      "diskreditierung",
      "fehlschluss",
      "person statt argument",
    ],
  },
  {
    id: "fallacy_straw_man",
    category: "fallacy",
    title: "Strohmann (Straw Man)",
    content:
      "Strohmann bedeutet 'Verzerrung der Gegenposition'. Definition: Die Position des Gegenübers wird verzerrt oder überspitzt dargestellt, um sie leichter angreifen zu können. Beispiel: 'Du willst die Steuern erhöhen? Also willst du alle Menschen arm machen!' Erkennungsmerkmale: Übertreibung, Vereinfachung, Falschdarstellung der Gegenposition. Empfehlung: Stelle die Position deines Gegenübers korrekt dar, bevor du sie kritisierst. Logischer Fehlschluss (klassisch).",
    keywords: [
      "strohmann",
      "straw man",
      "verzerrung",
      "überspitzung",
      "fehlschluss",
      "falschdarstellung",
    ],
  },
  {
    id: "fallacy_false_dichotomy",
    category: "fallacy",
    title: "Falsche Dichotomie (False Dichotomy)",
    content:
      "Falsche Dichotomie bedeutet 'Entweder-Oder ohne Alternativen'. Definition: Es werden nur zwei Optionen präsentiert, obwohl es weitere Möglichkeiten gibt. Beispiel: 'Entweder wir machen es so, oder das Projekt scheitert komplett.' Erkennungsmerkmale: Schwarz-Weiß-Denken, 'Entweder-Oder'-Sprache, Ignorieren von Grautönen. Empfehlung: Erkenne, dass es meist mehr als zwei Optionen gibt. Logischer Fehlschluss (klassisch).",
    keywords: [
      "falsche dichotomie",
      "false dichotomy",
      "entweder oder",
      "schwarz weiß",
      "fehlschluss",
      "nur zwei optionen",
      "argumentation",
      "rhetoric",
    ],
  },
  {
    id: "fallacy_appeal_authority",
    category: "fallacy",
    title: "Autoritätsargument (Appeal to Authority)",
    content:
      "Autoritätsargument bedeutet 'Unberechtigter Verweis auf Autorität'. Definition: Eine Aussage wird als wahr angenommen, nur weil eine Autorität sie getroffen hat, auch wenn die Autorität kein Experte im relevanten Bereich ist. Beispiel: 'Ein berühmter Schauspieler sagt, dieses Produkt ist gut, also muss es stimmen.' Erkennungsmerkmale: 'Experte X sagt', 'Autorität Y behauptet', Verweis auf Status statt Argumente. Empfehlung: Prüfe, ob die Autorität im relevanten Bereich qualifiziert ist. Logischer Fehlschluss (klassisch).",
    keywords: [
      "autoritätsargument",
      "appeal authority",
      "experte",
      "autorität",
      "fehlschluss",
      "verweis",
    ],
  },
  {
    id: "fallacy_circular_reasoning",
    category: "fallacy",
    title: "Zirkelschluss (Circular Reasoning)",
    content:
      "Zirkelschluss bedeutet 'Die Aussage begründet sich selbst'. Definition: Die Schlussfolgerung ist bereits in der Prämisse enthalten, es gibt keine unabhängige Begründung. Beispiel: 'Dieses Buch ist wahr, weil es in diesem Buch steht.' Erkennungsmerkmale: Prämisse = Schlussfolgerung, keine externe Evidenz, Tautologie. Empfehlung: Suche nach unabhängigen Belegen für deine Aussage. Logischer Fehlschluss (klassisch).",
    keywords: [
      "zirkelschluss",
      "circular reasoning",
      "selbstbegründung",
      "tautologie",
      "fehlschluss",
      "prämisse gleich schlussfolgerung",
    ],
  },
  {
    id: "fallacy_slippery_slope",
    category: "fallacy",
    title: "Dammbruchargument (Slippery Slope)",
    content:
      "Dammbruchargument bedeutet 'Übertriebene Kausalitätskette'. Definition: Es wird behauptet, dass ein kleiner Schritt zwangsläufig zu extremen Konsequenzen führt, ohne dass die Kausalität belegt ist. Beispiel: 'Wenn wir heute eine Ausnahme machen, wird morgen alles zusammenbrechen.' Erkennungsmerkmale: 'Dann passiert X, dann Y, dann Z', übertriebene Konsequenzen, fehlende Begründung für die Kette. Empfehlung: Prüfe jeden Schritt der Kausalitätskette einzeln. Logischer Fehlschluss (klassisch).",
    keywords: [
      "dammbruchargument",
      "slippery slope",
      "kausalitätskette",
      "übertreibung",
      "fehlschluss",
      "extreme konsequenzen",
    ],
  },
  // Tier 2 Fallacies (High Voice-Relevance)
  {
    id: "fallacy_red_herring",
    category: "fallacy",
    title: "Red Herring (Ablenkung)",
    content:
      "Red Herring bedeutet Ablenkung vom eigentlichen Thema durch irrelevantes Material. Beispiel: 'Warum haben wir das Budget überschritten?' → 'Schauen Sie, letzte Woche hatten wir großartige Kundenfeedbacks!' Erkennungsmerkmale: Themenwechsel, irrelevante Information, Ursprungsfrage bleibt unbeantwortet. Logischer Fehlschluss (klassisch).",
    keywords: [
      "red herring",
      "ablenkung",
      "themenwechsel",
      "irrelevant",
      "fehlschluss",
      "vermeidung",
    ],
  },
  {
    id: "fallacy_tu_quoque",
    category: "fallacy",
    title: "Tu Quoque (Du auch)",
    content:
      "Tu Quoque bedeutet 'Du auch' - Hypocrisy als Gegenargument. Beispiel: 'Rauchen ist gesundheitsschädlich' → 'Du rauchst selbst!' Warum Fehlschluss? Hypocrisy macht das Argument nicht falsch. Das Argument kann trotz Widerspruch zwischen Aussage und Verhalten wahr sein. Logischer Fehlschluss (klassisch).",
    keywords: [
      "tu quoque",
      "du auch",
      "hypocrisy",
      "doppelmoral",
      "fehlschluss",
      "ad hominem",
    ],
  },
  {
    id: "fallacy_hasty_generalization",
    category: "fallacy",
    title: "Hasty Generalization (Übergeneralisierung)",
    content:
      "Hasty Generalization bedeutet Generalisierung aus unzureichender Stichprobe. Beispiel: 'Ich habe zwei Leute getroffen, beide waren nett. Alle sind nett.' Warum Fehlschluss? Stichprobengröße zu klein oder nicht repräsentativ. Lösung: Größere, repräsentative Stichproben nutzen. Logischer Fehlschluss (klassisch).",
    keywords: [
      "hasty generalization",
      "übergeneralisierung",
      "stichprobe",
      "stichprobengröße",
      "fehlschluss",
      "induktion",
    ],
  },
  {
    id: "fallacy_post_hoc",
    category: "fallacy",
    title: "Post Hoc (Nach dem, also wegen dem)",
    content:
      "Post Hoc bedeutet 'nach dem, also wegen dem' - zeitliche Abfolge ≠ Kausalität. Beispiel: 'Seit wir die Software eingeführt haben, sinken die Verkaufszahlen. Die Software ist schuld.' Warum Fehlschluss? Korrelation ≠ Kausalität. Könnte saisonale Schwankung oder andere Ursache sein. Logischer Fehlschluss (klassisch).",
    keywords: [
      "post hoc",
      "korrelation kausalität",
      "zeitliche abfolge",
      "fehlschluss",
      "ursache",
    ],
  },
  {
    id: "fallacy_bandwagon",
    category: "fallacy",
    title: "Bandwagon (Mitläufer-Effekt)",
    content:
      "Bandwagon bedeutet 'Alle machen es, also ist es richtig'. Beispiel: '90% der Leute nutzen diese App, also muss sie gut sein.' Warum Fehlschluss? Popularität ≠ Qualität. Lösung: Objektive Qualitätskriterien prüfen statt Popularität. Logischer Fehlschluss (klassisch).",
    keywords: [
      "bandwagon",
      "ad populum",
      "popularität",
      "mitläufer",
      "fehlschluss",
      "mehrheit",
    ],
  },
  {
    id: "fallacy_appeal_emotion",
    category: "fallacy",
    title: "Appeal to Emotion (Emotionale Manipulation)",
    content:
      "Appeal to Emotion bedeutet emotionale Manipulation statt logischer Argumente. Beispiel: 'Denken Sie an die Kinder! Wenn wir nicht handeln, leiden sie.' Warum Fehlschluss? Emotionen ≠ Argumente. Lösung: Objektive Fakten prüfen statt nur Emotionen. Logischer Fehlschluss (klassisch).",
    keywords: [
      "appeal emotion",
      "emotionale manipulation",
      "mitleid",
      "angst",
      "fehlschluss",
      "pathos",
    ],
  },
  {
    id: "fallacy_appeal_ignorance",
    category: "fallacy",
    title: "Appeal to Ignorance (Fehlender Beweis)",
    content:
      "Appeal to Ignorance bedeutet 'Nicht bewiesen falsch = wahr' (oder umgekehrt). Beispiel: 'Niemand hat bewiesen, dass Gott nicht existiert, also existiert Gott.' Warum Fehlschluss? Fehlender Beweis ≠ Beweis des Gegenteils. Burden of Proof liegt beim Behauptenden. Logischer Fehlschluss (klassisch).",
    keywords: [
      "appeal ignorance",
      "fehlender beweis",
      "burden of proof",
      "beweislast",
      "fehlschluss",
    ],
  },
  {
    id: "fallacy_loaded_question",
    category: "fallacy",
    title: "Loaded Question (Suggestivfrage)",
    content:
      "Loaded Question bedeutet Frage mit kontroversen Vorannahmen. Beispiel: 'Wann werden Sie aufhören, Steuergelder zu verschwenden?' Warum Fehlschluss? Prämisse 'Sie verschwenden Steuergelder' ist nicht bewiesen. Jede Antwort akzeptiert Prämisse implizit. Logischer Fehlschluss (klassisch).",
    keywords: [
      "loaded question",
      "suggestivfrage",
      "prämisse",
      "vorannahme",
      "fehlschluss",
      "manipulation",
    ],
  },
  {
    id: "fallacy_no_true_scotsman",
    category: "fallacy",
    title: "No True Scotsman (Ad-hoc Neudefinition)",
    content:
      "No True Scotsman bedeutet ad-hoc Definition-Änderung zur Ausschluss von Gegenbeispielen. Beispiel: 'Kein Schotte nimmt Zucker' → Gegenbeispiel → 'Kein echter Schotte nimmt Zucker.' Warum Fehlschluss? Arbiträre Neudefinition zur Rettung der Behauptung. Logischer Fehlschluss (klassisch).",
    keywords: [
      "no true scotsman",
      "ad hoc",
      "neudefinition",
      "gegenbeispiel",
      "fehlschluss",
      "definition",
    ],
  },
  {
    id: "fallacy_false_cause",
    category: "fallacy",
    title: "False Cause (Falsche Kausalität)",
    content:
      "False Cause bedeutet falsche Kausalattribution. Beispiel: 'Regenschirm-Verkäufe steigen → Unfälle steigen. Regenschirme verursachen Unfälle!' Warum Fehlschluss? Common Cause (Regen) verursacht beides. Korrelation ≠ Kausalität. Alternative Erklärungen prüfen. Logischer Fehlschluss (klassisch).",
    keywords: [
      "false cause",
      "falsche kausalität",
      "korrelation",
      "common cause",
      "fehlschluss",
      "ursache",
    ],
  },
];
