---
diataxis-type: reference
status: production
version: 1.0.0
last_updated: 2026-02-04
---

# Knowledge Base Structure

## Übersicht (20 words)

78 kuratierte Knowledge-Chunks in 8 Kategorien (Emotion, Fallacy, GFK, Cognitive, etc.) fuer Hablará RAG Chatbot.

---

## Essential Context

> **DIATAXIS Category**: Reference (Information-Oriented)
> **Audience**: Entwickler, die RAG Knowledge Base erweitern oder verstehen wollen

**Zweck**: Dokumentiert die Struktur der 78 Knowledge-Chunks fuer semantische Suche im RAG Chatbot.

**Scope**: Kategorien-Uebersicht, Chunk-Hinzufuegen, Validierung.

**Key Points**:
- 78 Chunks in 8 Kategorien (emotion, fallacy, tone, gfk, cognitive, four_sides, topic, general)
- Validierung bei Module-Load (Count + Duplicate-Check)
- Type Definition in `../types.ts`

**Quick Access**:
- [Categories](#categories)
- [Adding New Chunks](#adding-new-chunks)
- [Validation](#validation)

---

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

**Type Definition:** See [`../types.ts`](../types.ts) for `KnowledgeChunk` interface.

---

## Adding New Chunks

1. Edit the appropriate category file in `categories/`
2. Add chunk to the exported array
3. Run `pnpm test` to verify (validation checks count + duplicates)
4. Update this README if category count changes

---

## Validation

The `index.ts` performs two validations at module load time:

1. **Chunk count**: Must be exactly 78
2. **Duplicate IDs**: All chunk IDs must be unique

If validation fails, an error is thrown immediately.

```bash
# Run tests to verify knowledge base
pnpm test src/__tests__/lib/rag/
```

---

## Cross-References

### Implementation
- **[../types.ts](../types.ts)** - KnowledgeChunk TypeScript Interface
- **[../rag-chatbot.ts](../rag-chatbot.ts)** - RAG Chatbot Implementation
- **[../embedding-service.ts](../embedding-service.ts)** - Embedding Generation

### Project Documentation
- **[../../../../CLAUDE.md](../../../../CLAUDE.md)** - Projekt-Einstiegspunkt

---

**Version**: 1.0.0
**Created**: 28. Januar 2026
**Last Updated**: 4. Februar 2026
**Status**: Production
