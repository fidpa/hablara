/**
 * Response Validation Utilities
 *
 * Defensive programming patterns for LLM API responses.
 * Follows embeddings.ts style: explicit validation, contextual errors.
 */

import { logger } from "../logger";

export function extractAnthropicContent(
  response: { content: Array<{ type?: string; text?: string }> },
  methodName: string
): string {
  // Layer 1: Validate response exists
  if (!response || typeof response !== "object") {
    throw new Error(
      `[${methodName}] Invalid Anthropic response: ${typeof response}`
    );
  }

  // Layer 2: Validate content array
  if (!Array.isArray(response.content)) {
    throw new Error(
      `[${methodName}] Invalid Anthropic response: content is not array (got ${typeof response.content})`
    );
  }

  if (response.content.length === 0) {
    logger.warn("ResponseValidator", `${methodName}: Empty content from API`);
    return "";
  }

  // Layer 3: Validate first block
  const firstBlock = response.content[0];

  if (firstBlock === undefined) {
    throw new Error(
      `[${methodName}] content[0] undefined despite length ${response.content.length}`
    );
  }

  // Layer 4: Validate text type
  if (firstBlock.type !== "text") {
    logger.warn("ResponseValidator", `${methodName}: Unexpected type ${firstBlock.type}`);
    return "";
  }

  // Layer 5: Extract text
  if (typeof firstBlock.text !== "string") {
    throw new Error(
      `[${methodName}] text is ${typeof firstBlock.text}, expected string`
    );
  }

  return firstBlock.text;
}

export function extractOpenAIContent(
  response: {
    choices: Array<{ message?: { content?: string | null } }>;
  },
  methodName: string
): string {
  // Layer 1: Validate response
  if (!response || typeof response !== "object") {
    throw new Error(
      `[${methodName}] Invalid OpenAI response: ${typeof response}`
    );
  }

  // Layer 2: Validate choices array
  if (!Array.isArray(response.choices)) {
    throw new Error(
      `[${methodName}] choices is not array (got ${typeof response.choices})`
    );
  }

  if (response.choices.length === 0) {
    logger.warn("ResponseValidator", `${methodName}: Empty choices from API`);
    return "";
  }

  // Layer 3: Validate first choice
  const firstChoice = response.choices[0];

  if (firstChoice === undefined) {
    throw new Error(
      `[${methodName}] choices[0] undefined despite length ${response.choices.length}`
    );
  }

  // Layer 4: Validate message
  if (!firstChoice.message || typeof firstChoice.message !== "object") {
    throw new Error(
      `[${methodName}] message is ${typeof firstChoice.message}, expected object`
    );
  }

  // Layer 5: Extract content (null is OK for OpenAI)
  const { content } = firstChoice.message;

  if (content === null) {
    logger.debug("ResponseValidator", `${methodName}: OpenAI returned null content`);
    return "";
  }

  if (typeof content !== "string") {
    throw new Error(
      `[${methodName}] content is ${typeof content}, expected string or null`
    );
  }

  return content;
}
