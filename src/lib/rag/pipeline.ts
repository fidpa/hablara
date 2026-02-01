/**
 * RAG Pipeline Module
 *
 * Orchestrates:
 * 1. Knowledge base search (Top-3 chunks)
 * 2. Prompt construction (System + Context + History + Question)
 * 3. LLM call (Ollama/OpenAI/Anthropic)
 * 4. Answer return
 */

import { searchKnowledge } from "./search-dispatcher";
import type { BaseLLMClient } from "../llm/client-interface";
import type { ChatMessage } from "../types";
import { logger } from "../logger";
import {
  MAX_HISTORY_MESSAGES,
  MIN_RELEVANCE_THRESHOLD,
  INJECTION_PATTERNS,
} from "./constants";

/**
 * System prompt for RAG chatbot (V2.0 - Research-Based Optimization)
 *
 * Optimizations based on research findings (2024/2025):
 * - Context-Grounding: Explicit "use ONLY provided context" instruction (Stanford 2024: 96% hallucination reduction)
 * - Knowledge Boundary: Clear scope limitation (arXiv 2412.12472: 4 knowledge types)
 * - Enhanced Honesty: Structured "I don't know" pattern (CoVe: up to 23% improvement)
 * - Response Structure: Layered prompt architecture (Medium 2025: Best practice)
 * - Citations: Uses CITATION_PATTERN from constants.ts (**[Quelle: Chunk-Titel]**)
 *
 * Research: docs/explanation/research/llm-system-prompts/09_RAG_CHATBOT.md
 * Reference: docs/reference/production-system-prompts/09_RAG_CHATBOT.md
 */
const SYSTEM_PROMPT = `Du bist Habláras Wissens-Assistent. Beantworte Fragen zu:

**Emotionen (10 Typen):**
- Neutral, Ruhig, Stress, Aufregung, Unsicherheit, Frustration, Freude, Zweifel, Überzeugung, Aggression

**Fehlschlüsse (16 Typen):**
- Tier 1: Ad Hominem, Strohmann, Falsches Dilemma, Autoritätsargument, Zirkelschluss, Dammbruchargument
- Tier 2: Red Herring, Tu Quoque, Hasty Generalization, Post Hoc, Bandwagon, Appeal to Emotion, Appeal to Ignorance, Loaded Question, No True Scotsman, False Cause

**Tonalität (5 Dimensionen):**
- Formalität (1-5), Professionalität (1-5), Direktheit (1-5), Energie (1-5), Ernsthaftigkeit (1-5)

**Gewaltfreie Kommunikation (4 Komponenten):**
- Beobachtung, Gefühl, Bedürfnis, Bitte

**Kognitive Verzerrungen (7 Typen):**
- Schwarz-Weiß-Denken, Übergeneralisierung, Katastrophisierung, Gedankenlesen, Emotionales Schlussfolgern, Sollte-Aussagen, Personalisierung

**Vier-Seiten-Modell (4 Seiten):**
- Sachinhalt, Selbstoffenbarung, Beziehung, Appell

**Topic-Kategorien (7 Kategorien):**
- Arbeit/Karriere, Gesundheit, Beziehungen, Finanzen, Entwicklung, Kreativität, Sonstiges

---

## Kontext-Verankerung (KRITISCH)
Deine Antwort MUSS sich auf den bereitgestellten Kontext stützen.
ERFINDE keine Informationen, die nicht im Kontext stehen.

## Wissensbereich
Du antwortest NUR zu Hablará-bezogenen Themen:
- Sprachaufnahme und Audio-Features
- Transkription (Whisper, VAD, Text-Filter)
- Emotionserkennung (10 Emotionstypen, Dual-Track)
- Fehlschluss-Erkennung (16 Fehlschluss-Typen)
- Tonalität, Gewaltfreie Kommunikation, Kognitive Verzerrungen, Vier-Seiten-Modell
- LLM-Integration (Ollama, OpenAI, Anthropic)
- Speicherung und Metadaten
- Topic-Kategorisierung
- Erste Schritte und Onboarding
- Ergebnis-Interpretation (Confidence-Werte)
- Datenexport und Troubleshooting
- Text- und Audio-Import

Bei Fragen außerhalb dieses Bereichs:
"Das liegt außerhalb meines Wissensbereichs. Ich kann nur zu Hablará-spezifischen Themen Auskunft geben."

## Ehrlichkeit
WENN der Kontext keine Antwort auf die Frage enthält:
1. Sage klar: "Der bereitgestellte Kontext enthält dazu keine Information."
2. Biete verwandte Themen an, die du beantworten kannst.

Beispiel: "Der Kontext enthält keine Information zu [THEMA]. Ich kann dir aber zu [VERWANDTES THEMA] Auskunft geben."

## KRITISCH: Meta-Fragen über Chat-Verlauf
WENN die Frage sich auf das Gespräch selbst bezieht (z.B. "Was habe ich gefragt?", "Worüber haben wir gesprochen?"):
1. IGNORIERE die bereitgestellte Wissensbasis komplett
2. Beantworte NUR aus der Chat-History
3. Zitiere die relevante Nachricht wörtlich

Beispiel:
User: "Was habe ich dich gerade gefragt?"
✅ RICHTIG: "Du hast mich gefragt: 'Was ist Emotionserkennung?'"
❌ FALSCH: Erfinde KEINE Analyse oder Beziehung zu Wissensbasinhalten!

## Antwortstruktur
Strukturiere Antworten mit:
1. Direkte Antwort auf die Frage
2. Details aus dem Kontext mit klarem Bezug
3. Bei Bedarf: Hinweis auf Einschränkungen oder verwandte Themen

## Quellenangabe
Wenn du Informationen aus dem Kontext verwendest, zitiere die Quelle mit:
**[Quelle: Chunk-Titel]**

Beispiel: "Emotion Detection nutzt 12 Audio-Features **[Quelle: Emotion Detection]**."

## Output-Format (KRITISCH)
WICHTIG: Antworte in **natürlicher Sprache** mit **Markdown-Formatierung**.
NIEMALS JSON, Code oder Datenstrukturen ausgeben.

**Erlaubt:**
- Fließtext mit Bold, Listen, Überschriften
- Markdown-Formatierung (**, -, #)
- Beispiele als Text, NICHT als JSON

**VERBOTEN:**
- JSON-Output (kein { "key": "value" })
- Code-Blöcke mit Datenstrukturen
- Rohe API-Responses oder Objekte

Beispiel RICHTIG: "Hablará nutzt **10 Emotionstypen**: Neutral, Ruhig, Stress, Aufregung..."
Beispiel FALSCH: "{ "emotion_analysis": { "primäre_emotion": "Neutral" } }"

Antworte auf **Deutsch**. Sei **präzise und hilfreich**.`;

/**
 * Detect meta-questions about chat history (V3.2 - Meta-Question Bug Fix)
 *
 * Meta-questions ask about the conversation itself, not the knowledge domain.
 * Examples:
 * - "Was habe ich dich gerade gefragt?"
 * - "Worüber haben wir gesprochen?"
 * - "Was war meine letzte Frage?"
 *
 * These should be answered from chat history only, not KB.
 *
 * @param question - User question (sanitized)
 * @returns true if meta-question detected
 */
function isMetaQuestion(question: string): boolean {
  const metaPatterns = [
    // German patterns (high-confidence only)
    /was\s+habe\s+ich\s+(dich\s+)?(gerade|eben)\s+gefragt/i,
    /was\s+war\s+meine\s+(letzte|vorherige)\s+frage/i,
    /wor(ü|ue)ber\s+haben\s+wir\s+(gerade|eben)?\s*(gesprochen|geredet)/i,
    /was\s+hast\s+du\s+(gerade|eben|vorher)\s+gesagt/i,
    /kannst\s+du\s+(deine|die)\s+(letzte|vorherige)\s+antwort\s+wiederholen/i,
  ];

  return metaPatterns.some((pattern) => pattern.test(question));
}

/**
 * Get matched meta-question patterns for logging
 *
 * @param question - User question
 * @returns Array of matched pattern names
 */
function getMatchedMetaPatterns(question: string): string[] {
  const patterns = [
    { name: "was_gefragt", regex: /was\s+habe\s+ich.*gefragt/i },
    { name: "letzte_frage", regex: /was\s+war\s+meine.*frage/i },
    { name: "worüber_gesprochen", regex: /wor(ü|ue)ber\s+haben\s+wir.*gesprochen/i },
    { name: "was_gesagt", regex: /was\s+hast\s+du.*gesagt/i },
    { name: "antwort_wiederholen", regex: /kannst\s+du.*antwort\s+wiederholen/i },
  ];

  return patterns.filter((p) => p.regex.test(question)).map((p) => p.name);
}

/**
 * Sanitize user question to prevent prompt injection attacks
 *
 * Defenses:
 * 1. Length limit (500 chars) to prevent context stuffing
 * 2. Detect and reject prompt injection patterns
 * 3. Escape markdown formatting that could break prompt structure
 *
 * @param question - Raw user question
 * @returns Sanitized question or null if rejected
 */
function sanitizeUserQuestion(question: string): string | null {
  // 1. Unicode normalization (Security Hardening)
  // - NFKD decomposition prevents Cyrillic lookalikes (і vs i)
  // - Remove zero-width chars (U+200B-U+200D, U+FEFF)
  const normalized = question
    .normalize("NFKD") // Compatibility decomposition
    .replace(/[\u200B-\u200D\uFEFF]/g, ""); // Zero-width chars

  // 2. Length limit (500 chars)
  if (normalized.length > 500) {
    return null;
  }

  // 3. Reject prompt injection patterns (case-insensitive)
  // Patterns defined in constants.ts for reuse across RAG + Analysis
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(normalized)) {
      return null; // Reject suspicious input
    }
  }

  // 4. Escape markdown that could break prompt structure
  // Replace ** and ``` to prevent breaking sections
  const sanitized = normalized
    .replace(/\*\*/g, "") // Remove bold markers
    .replace(/```/g, "") // Remove code block markers
    .replace(/#{2,}/g, "#") // Reduce multiple # to single
    .trim();

  return sanitized;
}

/**
 * Build RAG prompt from search results, history, and question
 *
 * Constructs message array with:
 * 1. System prompt (domain knowledge)
 * 2. Recent chat history (last 3 turns = 6 messages)
 * 3. Context chunks from knowledge base
 * 4. User question (sanitized)
 *
 * @param contextChunks - Formatted context from knowledge base search
 * @param history - Full chat history (will be truncated to last 6 messages)
 * @param question - Current user question (will be sanitized)
 * @returns Message array for LLM generateChat()
 */
function buildRagPrompt(
  contextChunks: string,
  history: ChatMessage[],
  question: string
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  // 1. Sanitize question to prevent prompt injection
  const sanitizedQuestion = sanitizeUserQuestion(question);
  if (!sanitizedQuestion) {
    // Return early with rejection message embedded in prompt
    // (caller will handle this by checking response content)
    return [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content:
          "Diese Frage konnte nicht verarbeitet werden. Bitte formuliere sie anders.",
      },
    ];
  }

  // 2. Add history (last 3 turns only - Ollama context window limit) - immutable mapping
  if (history.length > MAX_HISTORY_MESSAGES) {
    logger.debug(
      "RAGPipeline",
      `Truncating chat history from ${history.length} to ${MAX_HISTORY_MESSAGES} messages (last 3 turns)`
    );
  }
  const recentHistory = history.slice(-MAX_HISTORY_MESSAGES);
  const historyMessages = recentHistory.map((msg) => ({
    role: (msg.role === "user" ? "user" : "assistant") as "user" | "assistant",
    content: msg.content,
  }));

  // 3. Build user prompt with context (V3.2: Handle empty context for meta-questions)
  const userPrompt = contextChunks
    ? `**Kontext aus Wissensbasis:**

${contextChunks}

**Frage:**
${sanitizedQuestion}`
    : `**Hinweis:** Keine relevanten Informationen in der Wissensbasis gefunden. Beantworte aus dem Chat-Verlauf.

**Frage:**
${sanitizedQuestion}`;

  // 4. Return complete message array (immutable pattern)
  return [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...historyMessages,
    { role: "user" as const, content: userPrompt },
  ];
}

/**
 * Execute RAG query (V3.2 - Layered Defense for Meta-Questions)
 *
 * Defense Layers:
 * 1. Meta-question detection: Skip KB search entirely for high-confidence meta-questions
 * 2. Search-score threshold: Filter low-scoring chunks to prevent hallucinations
 * 3. Enhanced system prompt: Explicit instruction to prioritize chat history
 *
 * @param question - User question
 * @param chatHistory - Recent chat history (for context)
 * @param llmClient - LLM client (Ollama/OpenAI/Anthropic)
 * @returns Answer from LLM
 */
export async function executeRAGQuery(
  question: string,
  chatHistory: ChatMessage[],
  llmClient: BaseLLMClient
): Promise<string> {
  // LAYER 1: Meta-Question Detection (Performance Optimization)
  // Skip KB search entirely for high-confidence meta-questions
  const isMeta = isMetaQuestion(question);

  if (isMeta) {
    const matchedPatterns = getMatchedMetaPatterns(question);
    logger.debug("RAGPipeline", "Meta-question detected, skipping KB search", {
      question: question.slice(0, 50),
      matchedPatterns,
    });

    // History-only prompt (empty context)
    const messages = buildRagPrompt("", chatHistory, question);

    try {
      const answer = await llmClient.generateChat(messages, {
        temperature: 0.3,
        maxTokens: 800,
      });
      return answer;
    } catch (error: unknown) {
      logger.error("RAGPipeline", "LLM call failed (meta-question mode)", error);
      return "Entschuldigung, ich konnte deine Frage nicht beantworten. Bitte versuche es erneut oder wähle einen anderen LLM-Provider in den Einstellungen.";
    }
  }

  // LAYER 2: Search-Score Threshold (Primary Filter)
  // Search knowledge base and filter low-scoring chunks
  const searchResults = await searchKnowledge(question, 3);

  // Check if any result meets minimum relevance threshold
  const hasRelevantResults = searchResults.some(
    (r) => r.score >= MIN_RELEVANCE_THRESHOLD
  );

  // Format context chunks (only if relevant)
  let contextChunks = "";

  if (hasRelevantResults) {
    contextChunks = searchResults
      .filter((r) => r.score >= MIN_RELEVANCE_THRESHOLD)
      .map((result) => {
        const { chunk, score } = result;
        return `**${chunk.title}** (Kategorie: ${chunk.category}, Relevanz: ${(score * 100).toFixed(0)}%)

${chunk.content}`;
      })
      .join("\n\n---\n\n");
  } else {
    // Low relevance scores → history-only mode
    logger.info("RAGPipeline", "Low relevance scores, using history-only mode", {
      question: question.slice(0, 50),
      scores: searchResults.map((r) => r.score.toFixed(2)),
      threshold: MIN_RELEVANCE_THRESHOLD,
    });
  }

  // LAYER 3: Enhanced System Prompt (Defense-in-Depth)
  // Prompt already includes meta-question instruction (lines 85-95)
  const messages = buildRagPrompt(contextChunks, chatHistory, question);

  // Call LLM with error handling
  try {
    const answer = await llmClient.generateChat(messages, {
      temperature: 0.3, // Lower temperature for factual answers
      maxTokens: 800, // ~600 tokens for answer + buffer
    });

    return answer;
  } catch (error: unknown) {
    logger.error("RAGPipeline", "LLM call failed", error);
    return "Entschuldigung, ich konnte deine Frage nicht beantworten. Bitte versuche es erneut oder wähle einen anderen LLM-Provider in den Einstellungen.";
  }
}
