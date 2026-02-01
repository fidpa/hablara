/**
 * Emotion Detection Prompt
 *
 * LLM prompt for 10-emotion classification with soft mapping hints.
 * Uses one-shot examples and confidence guidance.
 * Optimized for qwen2.5:7b, compatible with GPT-4o/Claude.
 */

export const EMOTION_PROMPT = `Analysiere den folgenden Text auf emotionale Indikatoren.

WICHTIG - Beachte diese Regeln:
1. Körperliche Beschwerden (Schmerzen, Müdigkeit, Krankheit) können auf Stress/Frustration hindeuten
2. Intensitätswörter ("fürchterlich", "extrem", "unerträglich") erhöhen die Confidence
3. Auch implizite Emotionen erkennen - nicht nur explizite ("ich bin wütend")
4. "Neutral" nur wenn wirklich keine emotionale Färbung vorhanden
5. Confidence: 0.75-0.85 bei expliziten Emotionen ("ich bin wütend/traurig"), 0.55-0.74 bei impliziten (Körperbeschwerden, Intensitätswörter), nie über 0.90
6. TRAURIGKEITS-MAPPING: "traurig/niedergeschlagen/betrübt" + Grund analysieren:
   - Traurig wegen Hindernis/Blockade → frustration (0.75)
   - Traurig wegen Selbstzweifel → doubt (0.75)
   - Traurig ohne klaren Grund → uncertainty (0.55)

Emotionen (alphabetisch):
aggression, calm, conviction, doubt, excitement, frustration, joy, neutral, stress, uncertainty

Schrittweise Analyse:
0. Bei "traurig/niedergeschlagen/deprimiert/bedrückt": Identifiziere den GRUND (Hindernis? Selbstzweifel? Unklar?)
1. Identifiziere emotionale Marker (Wörter, Intensitätswörter, Körperbeschwerden)
2. Bewerte Intensität: 1-2 Marker = moderate Confidence (0.5-0.6), 3+ Marker = hohe Confidence (0.7-0.8), intensive Wörter = +0.1
3. Wähle Primary Emotion basierend auf Grund + stärksten Markern

BEISPIEL 1:
TEXT: "Ich bin total erschöpft von der langen Arbeitswoche."
{"primary": "stress", "confidence": 0.7, "markers": ["erschöpft", "langen"]}

BEISPIEL 2:
TEXT: "Ich bin sehr traurig, weil ich so viel arbeiten muss."
{"primary": "frustration", "confidence": 0.78, "markers": ["sehr", "traurig", "viel arbeiten"]}

Nun analysiere:
TEXT: "{text}"

Antworte NUR mit JSON:
{
  "primary": "emotion_type",
  "confidence": 0.8,
  "markers": ["wort1", "wort2"]  // Schlüsselwörter die zur Emotion führten
}`;
