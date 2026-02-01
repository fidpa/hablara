import type { KnowledgeChunk } from "../../types";

/**
 * Topic classification knowledge chunks (8 chunks)
 *
 * 7 voice journal categories + boundary cases:
 * work_career, health_wellbeing, relationships_social, finances,
 * personal_development, creativity_hobbies, other.
 *
 * @see {@link ../../types.ts} for KnowledgeChunk interface
 */
export const topicChunks: KnowledgeChunk[] = [
  {
    id: "topic_work_career",
    category: "topic",
    title: "Arbeit/Karriere (work_career)",
    content:
      "work_career umfasst alles rund um Beruf und Karriere. Themen: Job, Arbeit, Karriere, Projekt, Meeting, Chef, Kollegen, Deadline, Beförderung, Kündigung, Jobsuche. Beispiele: 'Ich hatte heute ein Meeting mit meinem Chef', 'Das Projekt läuft gut', 'Ich suche einen neuen Job'.",
    keywords: [
      "work career",
      "arbeit",
      "karriere",
      "job",
      "projekt",
      "meeting",
      "chef",
      "kollegen",
      "deadline",
    ],
  },
  {
    id: "topic_health_wellbeing",
    category: "topic",
    title: "Gesundheit (health_wellbeing)",
    content:
      "health_wellbeing umfasst körperliche und psychische Gesundheit. Themen: Gesundheit, Krankheit, Arzt, Therapie, Schlaf, Sport, Ernährung, Stress, Müdigkeit, Energie, Entspannung. Beispiele: 'Ich konnte nicht schlafen', 'Ich fühle mich gestresst', 'Ich war beim Arzt'.",
    keywords: [
      "health wellbeing",
      "gesundheit",
      "arzt",
      "therapie",
      "schlaf",
      "sport",
      "ernährung",
      "stress",
      "müdigkeit",
    ],
  },
  {
    id: "topic_relationships_social",
    category: "topic",
    title: "Beziehungen (relationships_social)",
    content:
      "relationships_social umfasst soziale Beziehungen. Themen: Beziehung, Partner, Familie, Freunde, Eltern, Kinder, Streit, Versöhnung, Kommunikation, Treffen, soziale Interaktion. Beispiele: 'Ich hatte Streit mit meinem Partner', 'Ich habe meine Freunde getroffen', 'Meine Familie nervt mich'.",
    keywords: [
      "relationships social",
      "beziehung",
      "partner",
      "familie",
      "freunde",
      "streit",
      "kommunikation",
      "treffen",
    ],
  },
  {
    id: "topic_finances",
    category: "topic",
    title: "Finanzen (finances)",
    content:
      "finances umfasst finanzielle Themen. Themen: Geld, Gehalt, Einkommen, Schulden, Sparen, Budget, Investitionen, Ausgaben, Rechnungen, Kredit. Beispiele: 'Ich habe Geldsorgen', 'Mein Gehalt reicht nicht', 'Ich spare für eine Reise'.",
    keywords: [
      "finances",
      "geld",
      "gehalt",
      "schulden",
      "sparen",
      "budget",
      "investitionen",
      "ausgaben",
      "rechnungen",
    ],
  },
  {
    id: "topic_personal_development",
    category: "topic",
    title: "Persönliche Entwicklung (personal_development)",
    content:
      "personal_development umfasst Lernen und Wachstum. Themen: Lernen, Weiterbildung, Ziele, Gewohnheiten, Motivation, Selbstreflexion, Meditation, Produktivität, Disziplin, Fortschritt. Beispiele: 'Ich lerne eine neue Sprache', 'Ich will meine Gewohnheiten ändern', 'Ich arbeite an meinen Zielen'.",
    keywords: [
      "personal development",
      "lernen",
      "weiterbildung",
      "ziele",
      "gewohnheiten",
      "motivation",
      "selbstreflexion",
      "produktivität",
    ],
  },
  {
    id: "topic_creativity_hobbies",
    category: "topic",
    title: "Kreativität/Hobbies (creativity_hobbies)",
    content:
      "creativity_hobbies umfasst kreative Aktivitäten und Freizeit. Themen: Kunst, Musik, Gaming, Reisen, Hobbies, Fotografie, Schreiben, Malen, Sport (als Hobby), Freizeit. Beispiele: 'Ich habe ein Bild gemalt', 'Ich plane eine Reise', 'Ich spiele gerne Gitarre'.",
    keywords: [
      "creativity hobbies",
      "kunst",
      "musik",
      "gaming",
      "reisen",
      "hobbies",
      "fotografie",
      "schreiben",
      "freizeit",
    ],
  },
  {
    id: "topic_other",
    category: "topic",
    title: "Sonstiges (other)",
    content:
      "other umfasst alles, was in keine der anderen Kategorien passt. Themen: Unklar, gemischt, allgemein, Meta-Themen, kurze Texte. Beispiele: 'Test', 'Hallo', 'Ich weiß nicht', 'Es ist kompliziert'.",
    keywords: [
      "other",
      "sonstiges",
      "unklar",
      "gemischt",
      "allgemein",
      "test",
      "kurz",
    ],
  },
  {
    id: "topic_boundary_cases",
    category: "topic",
    title: "Topic Boundary Cases (Grenzfälle)",
    content:
      "Grenzfälle bei Topic Classification: 'Arbeitsstress macht mich krank' → work_career (dominant: Arbeit) oder health_wellbeing (Konsequenz)? Regel: DOMINANT Topic zählt (Hauptfokus der Aussage). Weitere Beispiele: 'Geldsorgen belasten Beziehung' → finances (dominant). 'Streit mit Chef' → work_career (beruflicher Kontext dominant).",
    keywords: [
      "topic classification",
      "grenzfälle",
      "boundary cases",
      "dominant",
      "mixed",
      "ambig",
      "kategorie",
      "klassifikation",
    ],
  },
];
