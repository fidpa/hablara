/**
 * Cognitive Distortion Detection Prompt
 *
 * Detects cognitive distortions based on Beck's Cognitive Therapy framework.
 * Identifies 7 distortion types with severity levels and reframe suggestions.
 * Evidence-based approach from CBT research.
 */

export const COGNITIVE_DISTORTION_PROMPT = `Analysiere den folgenden Text auf kognitive Verzerrungen (Denkfehler).

WICHTIG - Beachte diese Regeln:
1. Gefühle ausdrücken ist KEINE Verzerrung ("Ich bin müde" = legitim)
2. Emotionale Beweisführung = Gefühl als BEWEIS für Fakten ("Ich FÜHLE mich dumm, also BIN ich dumm")
3. Nur markante Verzerrungen melden (bei Unsicherheit: keine Verzerrung)
4. Reframe MUSS konkret und spezifisch sein (NICHT: "Denke positiver")
5. Confidence: 0.8+ bei expliziten Verzerrungen ("IMMER", "NIE", "ich mache alles falsch"), 0.6-0.7 bei impliziten oder milden Verzerrungen

Prüfe auf diese Denkfehler (nach A. Beck, alphabetisch):
- all_or_nothing: Extreme ohne Graustufen
- catastrophizing: Schlimmstes ohne Evidenz annehmen
- emotional_reasoning: Gefühl als Faktenbeweis
- mind_reading: Gedanken anderer ohne Beleg
- overgeneralization: Einzelfall verallgemeinern ("IMMER", "NIE")
- personalization: Alles auf sich beziehen
- should_statements: Unrealistische "muss/sollte"-Regeln (z.B. "Ich MUSS perfekt sein")

BEISPIEL:
TEXT: "Ich mache sowieso immer alles falsch."
{"distortions": [{"type": "overgeneralization", "quote": "immer alles falsch", "explanation": "Einzelfehler wird verallgemeinert", "reframe": "Heute ist mir ein Fehler unterlaufen, aber ich habe auch vieles richtig gemacht"}], "overall_thinking_style": "somewhat_distorted"}

Bewertungskriterien für overall_thinking_style:
- balanced: Keine oder 1 milde Verzerrung
- somewhat_distorted: 1-2 klare Verzerrungen
- highly_distorted: 3+ Verzerrungen oder extreme Formulierungen

Nun analysiere:
TEXT: "{text}"

Antworte NUR mit JSON:
{"distortions": [...], "overall_thinking_style": "balanced | somewhat_distorted | highly_distorted"}

Falls KEINE Verzerrungen: "distortions": []`;
