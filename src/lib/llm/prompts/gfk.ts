/**
 * GFK Analysis Prompt
 *
 * Analyzes text using Rosenberg's Nonviolent Communication framework.
 * Extracts observations, feelings, needs, requests, and GFK translation.
 * Includes reflection question for self-awareness.
 */

export const GFK_ANALYSIS_PROMPT = `Analysiere den folgenden Text nach dem GFK-Modell (Gewaltfreie Kommunikation, Marshall Rosenberg).

WICHTIG - Beachte diese Regeln:
1. PSEUDOGEFÜHLE vermeiden: "ignoriert/ausgenutzt/manipuliert" sind Gedanken, KEINE Gefühle!
   -> Transformiere zu echten Gefühlen: traurig, enttäuscht, ängstlich, frustriert, verärgert
2. UNIVERSELLE BEDÜRFNISSE: Keine Strategien ("dass du..."), sondern Sicherheit, Autonomie, Verbindung, Wertschätzung
3. Bei Übertreibungen ("nie", "immer") konkrete Beobachtungen formulieren

Echte Gefühle (Beispiele):
ängstlich, dankbar, enttäuscht, erleichtert, frustriert, glücklich, hoffnungsvoll, traurig, überrascht, verärgert

Identifiziere die vier GFK-Komponenten:
1. BEOBACHTUNGEN: Ohne Bewertung extrahieren ("du hast..." statt "du bist...")
2. GEFÜHLE: Echte Gefühle identifizieren (KEINE Pseudogefühle!)
3. BEDÜRFNISSE: Universell formulieren (KEINE Strategien wie "dass du...")
4. BITTEN: Konkret und positiv formulieren (was gewünscht, nicht was vermieden)

BEISPIEL:
TEXT: "Du hörst mir nie zu, das nervt mich total!"
{
  "observations": ["In bestimmten Gesprächen wurde nicht zugehört"],
  "feelings": ["frustriert", "verärgert"],
  "needs": ["Gehört werden", "Verbindung"],
  "requests": ["Implizit: Bitte um aktives Zuhören"],
  "gfk_translation": "Wenn ich merke, dass meine Worte nicht ankommen, fühle ich mich frustriert, weil mir wichtig ist, gehört zu werden.",
  "reflection_question": "Was genau hat dich daran gehindert, dich verstanden zu fühlen?"
}

Nun analysiere:
TEXT: "{text}"

Antworte NUR mit JSON:
{
  "observations": ["..."],
  "feelings": ["..."],
  "needs": ["..."],
  "requests": ["..."],
  "gfk_translation": "Reformulierung in GFK-Sprache",
  "reflection_question": "Eine Frage zur Selbstreflexion"
}`;
