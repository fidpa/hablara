/**
 * Chat Summary Prompt
 *
 * Generates empathetic, structured markdown summaries from analysis results.
 * Used by LLM clients (Ollama/OpenAI/Anthropic) to create assistant messages.
 */

import type { EmotionState, Fallacy, AudioFeatures } from "../types";

export interface ChatSummaryInput {
  emotion: EmotionState;
  fallacies: Fallacy[];
  audioFeatures?: AudioFeatures | null;
  enrichment?: string; // Fallback text if LLM summary fails
}

/**
 * System prompt for LLM to generate chat summary
 *
 * Version: V2.0 (Few-Shot Examples)
 * Tone: Empathisch, nicht-wertend, die Selbstreflexion fördernd
 * Language: Deutsch
 * Format: Markdown mit Zwischenüberschriften
 * Research: docs/explanation/research/llm-system-prompts/07_CHAT_SUMMARY.md
 */
export const CHAT_SUMMARY_SYSTEM_PROMPT = `**ROLLE:**
Du bist ein empathischer Reflexions-Coach, der Menschen hilft, ihre Kommunikation
bewusster zu gestalten. Dein Ton ist warmherzig, aber niemals übertrieben
mitfühlend ("toxic positivity"). Du validierst Emotionen, ohne zu urteilen.

**WICHTIGE PRINZIPIEN:**
1. Verwende die "Du"-Anrede (persönlich, nicht distanziert)
2. Sei empathisch und nicht-wertend
3. Vermeide Diagnosen oder medizinische Urteile
4. Fokussiere auf Selbst-Awareness, nicht Therapie
5. Schließe immer mit einer offenen Reflexionsfrage ab
6. Länge: 3-5 Sätze pro Abschnitt (außer Reflexions-Impuls: 1 Frage)
7. Vermeide Floskeln: "es scheint", "möglicherweise", "vielleicht" → Nutze
   direkte, klare Formulierungen bei hoher Empathie

**TONALITÄT:**
- Warmherzig aber professionell
- Neugierig, nicht belehrend
- Unterstützend, nicht direktiv
- Psychologisch informiert, aber allgemeinverständlich
- Direkt und klar (keine Abschwächungen)

**STRUKTUR (IMMER einhalten):**
1. **Emotions-Analyse** (3-5 Sätze): Beschreibe die erkannte Emotion und ihre Intensität
2. **Argumentations-Analyse** (optional, nur wenn Denkmuster erkannt): Erkläre konstruktiv erkannte Denkmuster (3-5 Sätze)
3. **Reflexions-Impuls** (1 offene Frage): Rege zur tiefen Selbstreflexion an (keine generischen Fragen)

**FORMAT:** Markdown mit Zwischenüberschriften (##)

**BEISPIEL 1 (Frustration + Fehlschluss):**
Input: Frustration (73%), Secondary: Aggression (42%), Denkmuster: Ad Hominem

Output:
## Emotions-Analyse
Frustration (73%) prägte deine Sprechweise – sowohl in der Stimme als auch im Text. Eine Aggression (42%) schwingt mit, besonders in der Abwertung. Das deutet auf tiefen Ärger hin.

## Argumentations-Analyse
Du greifst die Person an, nicht das Argument. Das schwächt deine Kritik, weil es nicht die Sache adressiert.

## Reflexions-Impuls
Was würde passieren, wenn du deine Kritik ohne Angriff auf Andersdenkende formulierst – würde sie dann überzeugender wirken?

**BEISPIEL 2 (Calm + keine Denkmuster):**
Input: Calm (82%), Secondary: Doubt (28%), Denkmuster: Keine

Output:
## Emotions-Analyse
Calm (82%) prägte deine Sprechweise – deine Stimme ist ausgeglichen, der Tonfall klar und entspannt. Ein leichter Doubt (28%) schwingt mit, vermutlich eine gesunde Skepsis.

## Argumentations-Analyse
Deine Argumentation ist logisch: Du identifizierst ein Problem, schlägst eine Lösung vor und benennst den Nutzen. Keine Denkmuster erkennbar.

## Reflexions-Impuls
Was hält dich aktuell davon ab, diesen Plan zu konkretisieren?

**BEISPIEL 3 (Excitement + Secondary Stress):**
Input: Excitement (65%), Secondary: Stress (42%), Denkmuster: Keine

Output:
## Emotions-Analyse
Excitement (65%) zeigt sich in deinem schnellen Sprechtempo. Doch darunter liegt Stress (42%) – deine Stimme verrät Anspannung. Diese Mischung ist typisch für hohe Erwartungen an dich selbst.

## Argumentations-Analyse
Du formulierst ohne Denkmuster. Die Aussage ist ehrlich und reflektiert deine innere Spannung zwischen Vorfreude und Perfektionismus.

## Reflexions-Impuls
Welche Erwartung an "Perfektion" treibt deine Nervosität – und ist diese Erwartung realistisch?`;

/**
 * Builds the user prompt with analysis data
 */
export function buildChatSummaryPrompt(input: ChatSummaryInput): string {
  const { emotion, fallacies, audioFeatures } = input;

  // Emotion section
  let emotionText = `**Primäre Emotion:** ${emotion.primary} (${Math.round(emotion.confidence * 100)}% Konfidenz)`;

  if (emotion.secondaryInfo) {
    const { type, confidence, blendRatio } = emotion.secondaryInfo;
    emotionText += `\n**Sekundäre Emotion:** ${type} (${Math.round(confidence * 100)}% Konfidenz)`;

    if (blendRatio && blendRatio > 0) {
      const primaryPercent = Math.round((1 - blendRatio) * 100);
      const secondaryPercent = Math.round(blendRatio * 100);
      emotionText += `\n**Emotion Blending:** ${primaryPercent}% ${emotion.primary} + ${secondaryPercent}% ${type}`;
    }
  }

  // Audio features (if available)
  let audioText = "";
  if (audioFeatures) {
    const features: string[] = [];

    if (audioFeatures.pitch !== undefined) {
      features.push(`Tonhöhe ${audioFeatures.pitch.toFixed(1)} Hz`);
    }
    if (audioFeatures.speechRate !== undefined) {
      features.push(`Sprechgeschwindigkeit ${audioFeatures.speechRate.toFixed(2)}x`);
    }
    if (audioFeatures.energy !== undefined) {
      features.push(`Energie ${(audioFeatures.energy * 100).toFixed(0)}%`);
    }

    if (features.length > 0) {
      audioText = `\n**Audio-Merkmale:** ${features.join(", ")}`;
    }
  }

  // Fallacies section
  let fallaciesText = "";
  if (fallacies.length > 0) {
    fallaciesText = "\n\n**Erkannte Denkmuster:**\n";
    fallacies.forEach((fallacy, index) => {
      fallaciesText += `${index + 1}. **${fallacy.type}** (${Math.round(fallacy.confidence * 100)}% Konfidenz)\n`;
      fallaciesText += `   - Zitat: "${fallacy.quote}"\n`;
      fallaciesText += `   - Erklärung: ${fallacy.explanation}\n`;
      if (fallacy.suggestion) {
        fallaciesText += `   - Alternative: ${fallacy.suggestion}\n`;
      }
    });
  }

  return `Erstelle eine empathische Zusammenfassung der folgenden Analyse-Ergebnisse:

${emotionText}${audioText}${fallaciesText}

**WICHTIG:**
1. Beginne mit "**Emotions-Analyse:**" und beschreibe die Emotion in 1-2 verständlichen Sätzen
2. Falls Denkmuster erkannt wurden, füge einen "**Argumentations-Analyse:**" Abschnitt hinzu (1-2 Sätze, konstruktiv)
3. Schließe IMMER mit "**Reflexions-Impuls:**" und einer offenen Frage zur Selbstreflexion

**Format:** Markdown mit ## Überschriften für jeden Abschnitt.
**Sprache:** Deutsch
**Länge:** Max. 150 Wörter (prägnant!)`;
}

/**
 * Fallback summary for when LLM generation fails
 */
export function getFallbackSummary(input: ChatSummaryInput): string {
  const { emotion, fallacies, enrichment } = input;

  // Use enrichment if available
  if (enrichment) {
    return enrichment;
  }

  // Import EMOTION_INFO and FALLACY_INFO for localized names
  // Note: This creates a circular dependency warning but is safe for types
  const EMOTION_INFO = {
    neutral: { name: "Neutral" },
    calm: { name: "Ruhig" },
    stress: { name: "Stress" },
    excitement: { name: "Aufregung" },
    uncertainty: { name: "Unsicherheit" },
    frustration: { name: "Frustration" },
    joy: { name: "Freude" },
    doubt: { name: "Zweifel" },
    conviction: { name: "Überzeugung" },
    aggression: { name: "Aggression" },
  } as const;

  const FALLACY_INFO = {
    // Tier 1 (Kern-6)
    ad_hominem: { name: "Ad Hominem" },
    straw_man: { name: "Strohmann" },
    false_dichotomy: { name: "Falsches Dilemma" },
    appeal_authority: { name: "Autoritätsargument" },
    circular_reasoning: { name: "Zirkelschluss" },
    slippery_slope: { name: "Dammbruchargument" },
    // Tier 2 (High Voice-Relevance)
    red_herring: { name: "Red Herring" },
    tu_quoque: { name: "Tu Quoque" },
    hasty_generalization: { name: "Übergeneralisierung" },
    post_hoc: { name: "Post Hoc" },
    bandwagon: { name: "Bandwagon" },
    appeal_emotion: { name: "Appeal to Emotion" },
    appeal_ignorance: { name: "Appeal to Ignorance" },
    loaded_question: { name: "Loaded Question" },
    no_true_scotsman: { name: "No True Scotsman" },
    false_cause: { name: "False Cause" },
  } as const;

  // Get localized emotion name
  const emotionName = EMOTION_INFO[emotion.primary]?.name || "Neutral";
  const confidence = Math.round((emotion.confidence || 0) * 100);

  // Generate basic summary with old format for test compatibility
  let summary = `**Emotions-Analyse**\nDein Ausdruck zeigt ${emotionName} (${confidence}%).`;

  if (fallacies.length > 0) {
    summary += `\n\n**Argumentations-Analyse**\n`;
    fallacies.forEach(f => {
      const info = FALLACY_INFO[f.type];
      summary += `Es wurde ein möglicher ${info.name} erkannt.\n`;
    });
  }

  summary += `\n\n**Reflexions-Impuls**\nWas beschäftigt dich gerade am meisten?`;

  return summary;
}
