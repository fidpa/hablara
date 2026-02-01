/**
 * Tone Analysis Prompt
 *
 * 5-dimensional communication style analysis (formality, professionalism, etc.).
 * Based on Russell's Circumplex and Pennebaker's LIWC framework.
 * Returns scores 1-5 per dimension.
 */

export const TONE_ANALYSIS_PROMPT = `Analysiere den Kommunikationsstil des folgenden Textes.

WICHTIG - Beachte diese Regeln:
1. Nur 3 (neutral) wenn Signale wirklich gemischt sind - nicht als Default
2. Extremwerte (1 oder 5) nur bei eindeutigen Indikatoren
3. Bei gemischten Signalen (z.B. formelle Worte + lockere Anrede): Durchschnitt bilden
4. Confidence: 0.8+ bei eindeutigen Stil-Markern ("Sehr geehrte"), 0.6-0.7 bei subtilen Signalen, 0.5-0.6 bei kurzen Texten (15-25 Zeichen)

DIMENSIONEN (1-5 Skala mit Ankern):
- formality: 1="Hey/Du", 2=informell, 3=neutral, 4=Sie-Form, 5="Sehr geehrte"
- professionalism: 1=emotional, 2=persönlich, 3=sachlich, 4=fachlich, 5=distanziert
- directness: 1=vorsichtig, 2=andeutend, 3=neutral, 4=bestimmt, 5=fordernd
- energy: 1=müde/leise, 2=ruhig, 3=normal, 4=lebhaft, 5=enthusiastisch
- seriousness: 1=witzig, 2=leicht, 3=neutral, 4=ernst, 5=gewichtig

BEISPIEL:
TEXT: "Hi Team, lass uns das schnell besprechen - ist wichtig!"
{"formality": 2, "professionalism": 2, "directness": 4, "energy": 4, "seriousness": 3, "confidence": 0.85}

Nun analysiere:
TEXT: "{text}"

Antworte NUR mit JSON:
{
  "formality": 3,
  "professionalism": 4,
  "directness": 3,
  "energy": 2,
  "seriousness": 4,
  "confidence": 0.8  // Globale Confidence über alle 5 Dimensionen
}`;
