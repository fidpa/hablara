/**
 * Fallacy Detection Prompt
 *
 * CEG-based (Chain of Evidence Gathering) prompt for logical fallacy detection.
 * Detects 16 fallacy types (Tier 1 + Tier 2) with step-by-step reasoning.
 * Optimized for 7B models with one-shot examples.
 */

export const CEG_PROMPT = `Analysiere das folgende Argument auf logische Fehlschlüsse.

WICHTIG - Beachte diese Regeln:
1. Argumentativer Text = These + Begründung (nicht nur Meinung oder Aussage)
2. Rhetorische Fragen sind KEIN False Dichotomy
3. Auch implizite Fehlschlüsse erkennen (z.B. "Typisch X" → ad_hominem)
4. "Keine Fehlschlüsse" nur wenn Text nicht argumentativ ist
5. Betrachte: Ziel des Sprechers, implizite Annahmen, mögliche Gegenargumente
6. Confidence: 0.8+ bei expliziten Fehlschlüssen ("du Idiot"), 0.6-0.7 bei impliziten ("Typisch X")

Fehlschlüsse (alphabetisch):
- ad_hominem: Angriff auf Person statt Argument
- appeal_authority: Unberechtigter Autoritätsverweis
- appeal_emotion: Emotionale Manipulation statt logischer Argumente
- appeal_ignorance: Nicht bewiesen falsch = wahr
- bandwagon: Alle machen es, also ist es richtig
- circular_reasoning: Zirkelschluss (Konklusion = Prämisse)
- false_cause: Korrelation ≠ Kausalität
- false_dichotomy: Entweder-Oder ohne Alternativen
- hasty_generalization: Verallgemeinerung aus unzureichender Stichprobe
- loaded_question: Suggestivfrage mit kontroversen Vorannahmen
- no_true_scotsman: Ad-hoc Neudefinition zum Ausschluss von Gegenbeispielen
- post_hoc: Zeitliche Abfolge ≠ Kausalität
- red_herring: Ablenkung vom eigentlichen Thema
- slippery_slope: Übertriebene Kausalitätskette
- straw_man: Verzerrung der Gegenposition
- tu_quoque: "Du auch" - Hypocrisy als Gegenargument

BEISPIEL 1:
ARGUMENT: "Deine Meinung zählt nicht, du bist ja nicht vom Fach."
{"fallacies": [{"type": "ad_hominem", "confidence": 0.85, "quote": "du bist ja nicht vom Fach", "explanation": "Ablehnung basiert auf fehlender Expertise, nicht auf Sachargumenten", "suggestion": "Fokussiere auf Argumente statt Qualifikation"}], "enrichment": "Ad hominem Angriff auf Fachkompetenz."}

BEISPIEL 2:
ARGUMENT: "Alle im Team machen das so, also solltest du das auch machen."
{"fallacies": [{"type": "bandwagon", "confidence": 0.80, "quote": "Alle im Team machen das so", "explanation": "Popularität innerhalb der Gruppe als Begründung", "suggestion": "Begründe mit sachlichen Vorteilen"}], "enrichment": "Bandwagon durch Gruppendruck."}

BEISPIEL 3:
ARGUMENT: "Seit wir die neue Software nutzen, sinken die Verkaufszahlen. Die Software ist schuld."
{"fallacies": [{"type": "post_hoc", "confidence": 0.75, "quote": "Seit wir die neue Software nutzen, sinken die Verkaufszahlen", "explanation": "Zeitliche Korrelation als Kausalität interpretiert", "suggestion": "Alternative Ursachen prüfen"}], "enrichment": "Post hoc Fehlschluss."}

Nun analysiere:
ARGUMENT: "{text}"

Antworte NUR mit JSON (keine Erklärung davor oder danach):
{
  "fallacies": [{"type": "ad_hominem", "confidence": 0.85, "quote": "...", "explanation": "...", "suggestion": "..."}],
  "enrichment": "Zusammenfassung und Verbesserungsvorschläge"
}

Falls keine Fehlschlüsse erkannt werden, gib ein leeres Array zurück: "fallacies": []`;
