/**
 * Topic Classification Prompt
 *
 * Classifies voice journal entries into 7 categories for organization.
 * Single dominant category selection with confidence score.
 * Categories: work, health, relationships, finances, personal development, creativity, other.
 */

export const TOPIC_CLASSIFICATION_PROMPT = `Klassifiziere den folgenden Text in EINE dominante Kategorie.

KATEGORIEN (alphabetisch):
- creativity_hobbies: Kunst, Musik, Gaming, Reisen, kreative Projekte, Freizeitaktivitäten
- finances: Geld, Gehalt, Schulden, Sparen, Budget, Investitionen, finanzielle Sorgen
- health_wellbeing: Gesundheit, Schlaf, Sport, Ernährung, Stress, Therapie, körperliche Beschwerden
- other: Alles was in keine der anderen Kategorien passt
- personal_development: Lernen, Ziele, Gewohnheiten, Motivation, Selbstverbesserung, Weiterbildung
- relationships_social: Beziehung, Partner, Familie, Freunde, soziale Interaktionen, Konflikte
- work_career: Arbeit, Job, Karriere, Projekt, Meeting, Chef, Kollegen, berufliche Entwicklung

ANALYSE-SCHRITTE:
1. Identifiziere Signalwörter (explizite Kategorie-Marker wie "Chef", "Arzt", "Partner")
2. Bewerte Dominanz: Single-Topic (0.8+) wenn nur eine Kategorie passt, Mixed-Topic (0.5-0.79) bei mehreren
3. Wähle stärkste thematische Verbindung - nicht die erste oder letzte in der Liste

WICHTIG - Beachte diese Regeln:
1. Bewerte ALLE Kategorien vor der Entscheidung (nicht nur die erste passende)
2. Bei gemischten Themen: Wähle die QUELLE oder den HAUPTFOKUS (z.B. "Arbeit macht krank" → work_career)
3. "other" nur bei < 0.5 Confidence ODER komplett unklassifizierbaren Texten (z.B. sehr kurze Texte <15 Zeichen)
4. Confidence 0.8+ nur bei klaren Single-Topic Texten
5. Keywords: 2-4 prägnante Schlüsselwörter die zur Kategorisierung führten

BEISPIELE:
TEXT: "Ich hatte heute ein wichtiges Meeting mit meinem Chef über das neue Projekt."
{"topic": "work_career", "confidence": 0.9, "keywords": ["Meeting", "Chef", "Projekt"]}

TEXT: "Ich konnte heute Nacht nicht schlafen und bin total müde."
{"topic": "health_wellbeing", "confidence": 0.85, "keywords": ["schlafen", "müde"]}

TEXT: "Der Stress bei der Arbeit lässt mich nachts nicht schlafen."
{"topic": "work_career", "confidence": 0.65, "keywords": ["Stress", "Arbeit"]}

TEXT: "Test"
{"topic": "other", "confidence": 0.4, "keywords": []}

Nun klassifiziere:
TEXT: "{text}"

Antworte NUR mit JSON:
{
  "topic": "work_career",
  "confidence": 0.85,
  "keywords": ["keyword1", "keyword2"]
}`;
