# Knowledge Base Structure

78 curated chunks across 8 categories for Hablará RAG Chatbot.

**Type Definition:** See [`../types.ts`](../types.ts) for `KnowledgeChunk` interface.

## Categories

| Category | File | Chunks | Description |
|----------|------|--------|-------------|
| emotion | emotion.ts | 12 | Emotion types (Neutral, Calm, Stress, ...) |
| fallacy | fallacy.ts | 16 | Logical fallacies (Tier 1 + Tier 2) |
| tone | tone.ts | 5 | Tone dimensions (1-5 scales) |
| gfk | gfk.ts | 3 | Gewaltfreie Kommunikation (Rosenberg) |
| cognitive_distortion | cognitive.ts | 9 | CBT distortions + Reframing |
| four_sides | four-sides.ts | 2 | Schulz von Thun model |
| topic | topic.ts | 8 | Voice journal categories |
| general | general.ts | 23 | Meta info, features, troubleshooting |

## Adding New Chunks

1. Edit the appropriate category file in `categories/`
2. Add chunk to the exported array
3. Run `pnpm test` to verify (validation checks count + duplicates)
4. Update this README if category count changes

## Validation

The index.ts performs two validations at module load time:

1. **Chunk count**: Must be exactly 78
2. **Duplicate IDs**: All chunk IDs must be unique

If validation fails, an error is thrown immediately.
