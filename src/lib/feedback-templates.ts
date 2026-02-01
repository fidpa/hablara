/**
 * Personalized Feedback Templates
 *
 * 20+ Templates für Baseline-relative Feedback. 3 Modi: generic (0-4), preliminary (5-9), personalized (10+).
 * Emotion-Kategorien: Stress, Calm, Excitement, Frustration, Uncertainty.
 * Reference: docs/reference/enrichment/PERSONALIZED_REFLECTION_PROMPT.md
 */

/**
 * Personalized feedback result from backend
 */
export interface PersonalizedFeedback {
  baselineEmotion: string;
  baselineConfidence: number;
  baselineSampleCount: number;
  currentEmotion: string;
  currentConfidence: number;
  confidenceDelta: number;
  shouldShowFeedback: boolean;
  feedbackMode: "generic" | "preliminary" | "personalized";
  feedbackText?: string;
}

/**
 * Growth Mindset feedback templates organized by emotion transition.
 * Key format: `${fromEmotion}_${toEmotion}`
 *
 * Design principles:
 * - Non-judgmental, curious tone
 * - Open questions that invite reflection
 * - Focus on awareness, not diagnosis
 * - German language (matching app locale)
 */
export const FEEDBACK_TEMPLATES: Record<string, string[]> = {
  // ========================================
  // Stress-Related Transitions (High Priority)
  // ========================================
  calm_stress: [
    "Du wirkst heute angespannter. Was beschäftigt dich?",
    "Ich bemerke mehr Anspannung. Was fordert dich gerade?",
    "Deine Stimme klingt anders als sonst. Magst du darüber nachdenken?",
  ],
  stress_calm: [
    "Du wirkst entspannter. Was hat dir geholfen?",
    "Ich höre mehr Ruhe. Welche Veränderung spürst du?",
    "Deine Stimme klingt gelassener. Was hat sich verändert?",
  ],
  neutral_stress: [
    "Ich bemerke mehr Anspannung als gewöhnlich. Was geht dir durch den Kopf?",
    "Deine Stimme wirkt belastet. Gibt es etwas, das dich beschäftigt?",
  ],
  stress_neutral: [
    "Du klingst ausgeglichener. Wie hast du das geschafft?",
    "Die Anspannung scheint nachgelassen zu haben. Was hat geholfen?",
  ],

  // ========================================
  // Frustration-Related Transitions
  // ========================================
  calm_frustration: [
    "Ich höre mehr Ungeduld. Was fordert dich gerade?",
    "Deine Stimme klingt frustriert. Was läuft nicht wie gewünscht?",
  ],
  frustration_neutral: [
    "Deine Stimme ist ausgeglichener. Wie hast du das geschafft?",
    "Die Frustration scheint nachgelassen zu haben. Was hat dir geholfen?",
  ],
  frustration_calm: [
    "Du wirkst viel entspannter. Was hat sich verändert?",
    "Von Frustration zu Ruhe - das ist eine bemerkenswerte Veränderung. Was war der Wendepunkt?",
  ],
  neutral_frustration: [
    "Ich höre Frustration in deiner Stimme. Was blockiert dich?",
    "Du klingst ungeduldig. Gibt es etwas, das nicht vorangeht?",
  ],

  // ========================================
  // Doubt/Conviction Transitions
  // ========================================
  neutral_doubt: [
    "Deine Stimme klingt unsicherer als gewöhnlich. Was verunsichert dich?",
    "Ich bemerke mehr Zögern. Gibt es offene Fragen?",
  ],
  doubt_conviction: [
    "Du klingst klarer und entschiedener. Was hat dir Gewissheit gegeben?",
    "Von Unsicherheit zu Überzeugung - was hat sich geklärt?",
  ],
  conviction_doubt: [
    "Ich höre mehr Unsicherheit. Hat sich etwas verändert?",
    "Deine Stimme klingt weniger sicher als sonst. Was beschäftigt dich?",
  ],
  doubt_neutral: [
    "Du klingst etwas sicherer. Was hat geholfen?",
    "Die Unsicherheit scheint nachgelassen zu haben. Was hat sich geklärt?",
  ],

  // ========================================
  // Uncertainty Transitions
  // ========================================
  calm_uncertainty: [
    "Du wirkst unsicherer als gewöhnlich. Gibt es offene Fragen?",
    "Ich höre mehr Zögern in deiner Stimme. Was ist unklar?",
  ],
  uncertainty_calm: [
    "Du klingst wieder sicherer. Was hat dir Klarheit gegeben?",
    "Die Unsicherheit ist gewichen. Was hat geholfen?",
  ],
  uncertainty_conviction: [
    "Du wirkst entschiedener. Was hat sich geklärt?",
    "Von Unsicherheit zu Überzeugung - eine interessante Entwicklung. Was war der Schlüssel?",
  ],

  // ========================================
  // Arousal Shifts (Excitement/Calm)
  // ========================================
  calm_excitement: [
    "Du wirkst energiegeladener. Was motiviert dich?",
    "Ich höre mehr Begeisterung. Was hat dich inspiriert?",
  ],
  excitement_calm: [
    "Deine Stimme ist ruhiger geworden. Brauchst du Erholung?",
    "Die Aufregung hat nachgelassen. Wie geht es dir jetzt?",
  ],
  neutral_excitement: [
    "Du wirkst begeistert. Was hat dich so motiviert?",
    "Ich höre mehr Energie in deiner Stimme. Was ist passiert?",
  ],
  excitement_neutral: [
    "Du klingst wieder ausgeglichener. Wie fühlst du dich?",
    "Die Begeisterung hat nachgelassen. Alles in Ordnung?",
  ],
  stress_excitement: [
    "Deine Energie wirkt positiver. Hat sich etwas zum Besseren gewandt?",
    "Von Anspannung zu Begeisterung - was hat sich verändert?",
  ],

  // ========================================
  // Joy-Related Transitions
  // ========================================
  neutral_joy: [
    "Ich höre mehr Leichtigkeit in deiner Stimme. Was freut dich?",
    "Du klingst fröhlicher. Was hat deine Stimmung gehoben?",
  ],
  joy_neutral: [
    "Deine Stimme klingt nachdenklicher. Was geht dir durch den Kopf?",
    "Die Freude ist etwas verflogen. Beschäftigt dich etwas?",
  ],
  calm_joy: [
    "Du wirkst fröhlicher. Was hat dich erfreut?",
    "Von Ruhe zu Freude - was ist Schönes passiert?",
  ],
  joy_calm: [
    "Du klingst entspannter. Eine angenehme Ruhe?",
    "Die Freude hat einer sanften Gelassenheit Platz gemacht. Wie fühlst du dich?",
  ],

  // ========================================
  // Aggression-Related Transitions
  // ========================================
  neutral_aggression: [
    "Ich höre starke Emotionen in deiner Stimme. Was hat dich so aufgebracht?",
    "Du klingst aufgebracht. Magst du erzählen, was passiert ist?",
  ],
  aggression_neutral: [
    "Du klingst wieder gelassener. Wie hast du dich beruhigt?",
    "Die starken Emotionen haben nachgelassen. Was hat geholfen?",
  ],
  aggression_calm: [
    "Du wirkst viel ruhiger. Was hat dir geholfen, dich zu beruhigen?",
    "Von Aufregung zu Ruhe - das ist eine große Veränderung. Was war der Schlüssel?",
  ],
  calm_aggression: [
    "Ich bemerke starke Emotionen. Was ist passiert?",
    "Deine Stimme klingt aufgebracht. Was beschäftigt dich so stark?",
  ],
  frustration_aggression: [
    "Die Frustration scheint stärker geworden zu sein. Was hat sich zugespitzt?",
    "Ich höre mehr Intensität. Magst du darüber sprechen?",
  ],
};

/**
 * Get appropriate feedback text for an emotion transition.
 * Returns a randomly selected template or a generic fallback.
 */
export function getFeedbackText(from: string, to: string): string {
  const key = `${from}_${to}`;
  const templates = FEEDBACK_TEMPLATES[key];

  // Generic fallback with emotion names
  const fallback = `Ich bemerke eine Veränderung von ${getEmotionNameGerman(from)} zu ${getEmotionNameGerman(to)}. Was hat sich verändert?`;

  if (!templates || templates.length === 0) {
    return fallback;
  }

  // Return random template from available options (with fallback for safety)
  const index = Math.floor(Math.random() * templates.length);
  return templates[index] ?? fallback;
}

/**
 * Enrich feedback object with appropriate text based on emotion transition.
 * Only enriches if shouldShowFeedback is true.
 */
export function enrichFeedback(feedback: PersonalizedFeedback): PersonalizedFeedback {
  if (!feedback.shouldShowFeedback) {
    return feedback;
  }

  return {
    ...feedback,
    feedbackText: getFeedbackText(
      feedback.baselineEmotion,
      feedback.currentEmotion
    ),
  };
}

/**
 * German emotion names for display
 */
const EMOTION_NAMES_GERMAN: Record<string, string> = {
  neutral: "Neutral",
  calm: "Ruhig",
  stress: "Stress",
  excitement: "Aufregung",
  uncertainty: "Unsicherheit",
  frustration: "Frustration",
  joy: "Freude",
  doubt: "Zweifel",
  conviction: "Überzeugung",
  aggression: "Aggression",
};

/**
 * Get German emotion name for display
 */
export function getEmotionNameGerman(emotion: string): string {
  return EMOTION_NAMES_GERMAN[emotion] ?? emotion;
}
