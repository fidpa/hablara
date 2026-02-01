/**
 * JSON Response Parser - Shared Utility
 *
 * Parses JSON from potentially messy LLM output.
 * Handles markdown code blocks, malformed JSON, and common LLM formatting issues.
 */

import { logger } from "../../logger";

/**
 * Parse JSON from potentially messy LLM output
 * Handles markdown code blocks, malformed JSON, etc.
 * @param response - Raw LLM response string
 * @param defaultValue - Fallback value if parsing fails
 * @returns Parsed JSON object or default value
 */
export function parseJsonResponse<T>(response: string, defaultValue?: T): T {
  // Handle empty or undefined response
  if (!response || response.trim() === "") {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error("Empty response from LLM");
  }

  // Try multiple extraction strategies
  let jsonString: string | null = null;

  // Strategy 1: Extract from markdown code blocks (```json ... ``` or ``` ... ```)
  const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    const innerJson = codeBlockMatch[1].match(/\{[\s\S]*\}/);
    if (innerJson) {
      jsonString = innerJson[0];
    }
  }

  // Strategy 2: Direct JSON object extraction
  if (!jsonString) {
    const directMatch = response.match(/\{[\s\S]*\}/);
    if (directMatch) {
      jsonString = directMatch[0];
    }
  }

  if (!jsonString) {
    logger.warn("parseJsonResponse", `No JSON found in LLM response (${response.length} chars)`, {
      preview: response.substring(0, 100),
    });
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error("No JSON found in response");
  }

  try {
    return JSON.parse(jsonString) as T;
  } catch (parseError) {
    // Common JSON issues from LLMs (especially local models like qwen, llama):
    // - Single quotes: Python dict output habit ("{'key': 'val'}")
    // - Trailing commas: Natural language trailing from lists
    // - Control chars: Tokenizer artifacts (ASCII 0x00-0x1F)
    // - Unquoted keys: JavaScript object literal style ({key: "val"})
    try {
      const fixed = jsonString
        .replace(/'/g, '"') // Python dict syntax -> JSON
        .replace(/,\s*}/g, "}") // Trailing commas in objects
        .replace(/,\s*]/g, "]") // Trailing commas in arrays
        .replace(/[\x00-\x1F\x7F]/g, " ") // Remove control characters
        .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3'); // Unquoted keys

      return JSON.parse(fixed) as T;
    } catch {
      logger.warn("parseJsonResponse", "Failed to parse JSON after fixes", {
        preview: jsonString.substring(0, 50), // Truncated to minimize info leak in logs
      });
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw parseError;
    }
  }
}
