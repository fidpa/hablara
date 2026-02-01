/**
 * Markdown Code Block Stripping Helper
 *
 * Entfernt Markdown Code-Block Wrapper von LLM-Responses.
 * LLMs wrappen manchmal Markdown in ```markdown oder ```md Blöcken,
 * was ReactMarkdown daran hindert, Formatierung korrekt zu rendern.
 */

import { logger } from "../../logger";

/**
 * Strip Markdown code-block wrapper if LLM incorrectly wraps output
 *
 * @param response - Raw LLM response
 * @param clientName - Client name for logging (e.g., 'OllamaClient', 'OpenAIClient')
 * @returns Cleaned response without code-block wrapper
 */
export function stripMarkdownCodeBlock(response: string, clientName?: string): string {
  const trimmed = response.trim();

  const codeBlockMatch = trimmed.match(/^```(?:markdown|md)?\n?([\s\S]*?)\n?```\s*$/);
  if (codeBlockMatch && codeBlockMatch[1] !== undefined) {
    const cleaned = codeBlockMatch[1].trim();

    if (clientName) {
      logger.debug(clientName, "Stripped code-block wrapper from response", {
        originalPreview: response.substring(0, 50),
        cleanedPreview: cleaned.substring(0, 50),
      });
    }

    return cleaned;
  }

  return trimmed;
}
