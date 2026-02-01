/**
 * RAG (Retrieval-Augmented Generation) Module
 *
 * Barrel exports for knowledge base, search, and pipeline.
 */

export * from "./types";
export { KNOWLEDGE_BASE } from "./knowledge-base";
export { searchKnowledge } from "./search-dispatcher";
export { executeRAGQuery } from "./pipeline";
