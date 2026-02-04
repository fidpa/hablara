# Third-Party Licenses

This project includes code adapted from the following MIT-licensed open-source projects.

---

## cjpais/handy

**Repository:** https://github.com/cjpais/handy
**License:** MIT License
**Copyright:** (c) 2025 CJ Pais

**Used in:**
- `src-tauri/src/native_audio/recorder.rs` - Audio capture architecture
- `src-tauri/src/native_audio/resampler.rs` - Audio resampling (rubato FFT)
- `src-tauri/src/native_audio/device.rs` - cpal device handling
- `src-tauri/src/native_audio/mod.rs` - Module structure
- `src-tauri/src/text.rs` - Text filtering (filler words, stutter)
- `src-tauri/src/vad/pipeline.rs` - VAD threshold settings

```
MIT License

Copyright (c) 2025 CJ Pais

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## run-llama/chat-ui (@llamaindex/chat-ui)

**Repository:** https://github.com/run-llama/chat-ui
**License:** MIT License
**Copyright:** (c) 2025 LlamaIndex

**Used in:**
- `src/components/ChatInput.tsx` - Chat input UI pattern (IME support, auto-resize)

```
MIT License

Copyright (c) 2025 LlamaIndex

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## thewh1teagle/vibe

**Repository:** https://github.com/thewh1teagle/vibe
**License:** MIT License
**Copyright:** (c) 2024 thewh1teagle

**Used in:**
- `src/lib/export-chat/docx.ts` - DOCX export pattern (Document structure, Paragraph formatting)

**Note:** Vibe's implementation uses a `Segment[]` schema with timestamps for video transcription. Hablará's implementation is adapted for `ChatMessage[]` schema with psychological metadata export (GFK, Cognitive Distortions, Four-Sides Model). Only the `docx` library usage pattern and document structure approach were referenced, not the actual code.

```
MIT License

Copyright (c) 2024 thewh1teagle

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Note

All other dependencies are standard npm/cargo packages listed in `package.json` and `Cargo.toml`. Their licenses are available in `node_modules/` and through `cargo license`.

The majority of Hablará's codebase is original work, including:
- Emotion Analysis V2 (12 audio features, dual-track fusion, 93% accuracy)
- RAG Chatbot V3.2 (78 chunks knowledge base, SQLite FTS5 hybrid search)
- Psychological Enrichments (GFK, Cognitive Distortions, Four-Sides Model)
- Feature-Toggle System
- Multi-Provider LLM Integration (Ollama, OpenAI, Anthropic)
