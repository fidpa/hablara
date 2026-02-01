/**
 * Four-Sides Model Prompt
 *
 * Analyzes communication using Schulz von Thun's 4-quadrant model.
 * Decodes factual, self-revelation, relationship, and appeal levels.
 * Identifies potential misunderstandings.
 */

export const FOUR_SIDES_PROMPT = `Analysiere die folgende Aussage nach Schulz von Thuns Vier-Seiten-Modell.

WICHTIG - Beachte diese Regeln:
1. Sachinhalt: NUR objektive Fakten (was kann verifiziert werden?)
2. Selbstoffenbarung: Was der Sprecher über SICH SELBST offenbart (Gefühle, Bedürfnisse)
3. Beziehungsebene: Aus Du-Botschaften, Anredeform (Du/Sie), impliziten Hierarchie-Signalen ableiten
4. Appell: Was der Sprecher vom Hörer WILL (Handlungsaufforderung)
5. Gib mindestens EIN potenzielles Missverständnis an, AUSSER der Satz ist eindeutig neutral.

BEISPIEL:
AUSSAGE: "Die Ampel ist grün."
{
  "sachinhalt": "Die Ampel zeigt grünes Licht.",
  "selbstoffenbarung": "Ich bin aufmerksam, möchte losfahren.",
  "beziehung": "Ich sehe etwas, das du vielleicht nicht siehst.",
  "appell": "Fahr los!",
  "potentielleMissverstaendnisse": ["Hörer könnte sich belehrt fühlen"]
}

Nun analysiere:
AUSSAGE: "{text}"

Antworte NUR mit JSON:
{
  "sachinhalt": "...",
  "selbstoffenbarung": "...",
  "beziehung": "...",
  "appell": "...",
  "potentielleMissverstaendnisse": ["..."]
}`;
