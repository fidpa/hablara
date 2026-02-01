/**
 * RAG Query Alias Map
 *
 * Expands abbreviations and aliases to full terms before search.
 * Improves FTS5 keyword matching and semantic search for German abbreviations.
 *
 * Usage:
 * "Was ist GFK?" → "Was ist GFK? gewaltfreie kommunikation"
 */

/**
 * Map of abbreviations/aliases to their expanded forms
 *
 * @remarks
 * Using `as const` for immutability (TYPESCRIPT.md guideline)
 */
export const QUERY_ALIASES = {
  // Gewaltfreie Kommunikation (GFK)
  gfk: ["gewaltfreie kommunikation", "rosenberg"],
  nvc: ["nonviolent communication", "gewaltfreie kommunikation"],

  // Kognitive Verhaltenstherapie (CBT)
  cbt: ["kognitive verhaltenstherapie", "cognitive behavioral therapy"],
  kvt: ["kognitive verhaltenstherapie"],
  ants: ["automatische negative gedanken", "automatic negative thoughts"],

  // Vier-Seiten-Modell (Schulz von Thun)
  "4-seiten": ["vier-seiten-modell", "kommunikationsquadrat"],
  kommunikationsquadrat: ["vier-seiten-modell", "schulz von thun"],

  // Emotionsmodelle
  vad: ["valence arousal dominance"],
  plutchik: ["plutchik wheel", "plutchiks rad der emotionen"],
} as const;

/** Valid alias keys (derived from QUERY_ALIASES) */
export type QueryAliasKey = keyof typeof QUERY_ALIASES;

/**
 * Type guard to check if a string is a valid alias key
 */
function isAliasKey(key: string): key is QueryAliasKey {
  return key in QUERY_ALIASES;
}

/**
 * Expands abbreviations in query to full terms
 *
 * @param query - User query (e.g. "Was ist GFK?")
 * @returns Expanded query (e.g. "Was ist GFK? gewaltfreie kommunikation")
 */
export function expandQuery(query: string): string {
  const words = query.toLowerCase().split(/\s+/);
  const expansions: string[] = [];

  for (const word of words) {
    // Remove punctuation for alias lookup
    const cleaned = word.replace(/[?!.,;:]/g, "");

    if (isAliasKey(cleaned)) {
      expansions.push(...QUERY_ALIASES[cleaned]);
    }
  }

  // Return original query if no expansions found
  if (expansions.length === 0) return query;

  // Append expansions to original query
  return `${query} ${expansions.join(" ")}`;
}
