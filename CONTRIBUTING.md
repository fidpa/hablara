# Mitwirken bei Hablará (Voice Intelligence Platform)

Zunächst einmal: Vielen Dank, dass Sie erwägen, zu Hablará beizutragen!

## Inhaltsverzeichnis

- [Verhaltenskodex](#verhaltenskodex)
- [Erste Schritte](#erste-schritte)
- [Wie Sie beitragen können](#wie-sie-beitragen-können)
- [Entwicklungsumgebung einrichten](#entwicklungsumgebung-einrichten)
- [Stilrichtlinien](#stilrichtlinien)
- [Commit-Nachrichten](#commit-nachrichten)
- [Pull-Request-Prozess](#pull-request-prozess)

## Verhaltenskodex

Dieses Projekt folgt dem [Contributor Covenant Verhaltenskodex](CODE_OF_CONDUCT.md).
Durch Ihre Teilnahme erklären Sie sich bereit, diesen Kodex einzuhalten.

## Erste Schritte

- Stellen Sie sicher, dass Sie ein [GitHub-Konto](https://github.com/signup) haben
- Prüfen Sie bestehende [Issues](https://github.com/fidpa/hablara/issues), bevor Sie neue erstellen
- Forken Sie das Repository auf GitHub

## Wie Sie beitragen können

### Fehler melden

Bevor Sie Fehlerberichte erstellen, prüfen Sie bitte bestehende Issues.

**Gute Fehlerberichte enthalten:**
- Einen klaren, beschreibenden Titel
- Schritte zur Reproduktion des Problems
- Erwartetes vs. tatsächliches Verhalten
- Systeminformationen (macOS-Version, Node.js-Version, Rust-Version)
- Relevante Logs oder Fehlermeldungen

### Features vorschlagen

Feature-Vorschläge sind willkommen! Bitte:
- Prüfen Sie, ob das Feature bereits angefragt wurde
- Beschreiben Sie den Anwendungsfall klar
- Erklären Sie, warum dies den Nutzern nützen würde

### Sicherheitslücken

Erstellen Sie **KEINE** öffentlichen Issues für Sicherheitslücken.

Siehe [SECURITY.md](SECURITY.md) für verantwortungsvolle Offenlegung.

### Pull Requests

1. Forken Sie das Repo und erstellen Sie Ihren Branch von `main`
2. Nehmen Sie Ihre Änderungen vor
3. Stellen Sie sicher, dass TypeScript ohne Fehler kompiliert
4. Stellen Sie sicher, dass Rust ohne Warnungen kompiliert
5. Führen Sie Tests aus: `pnpm test`
6. Aktualisieren Sie die Dokumentation bei Bedarf
7. Reichen Sie einen Pull Request ein

## Entwicklungsumgebung einrichten

### Voraussetzungen

- **Node.js** 20+ (empfohlen via [fnm](https://github.com/Schniz/fnm))
- **pnpm** 9+ (`npm install -g pnpm`)
- **Rust** 1.75+ (via [rustup](https://rustup.rs))
- **macOS** 13+ (Apple Silicon empfohlen)

### Klonen und Installieren

```bash
# Ihren Fork klonen
git clone https://github.com/IHR_BENUTZERNAME/challenge.git
cd challenge

# Abhängigkeiten installieren
pnpm install

# Whisper einrichten (erforderlich für Transkription)
./scripts/setup-whisper.sh
```

### Entwicklungsbefehle

```bash
# Entwicklungsserver starten (empfohlen)
pnpm dev:safe

# Tests ausführen
pnpm test

# Typprüfung
pnpm tsc --noEmit

# Lint
pnpm lint

# Für Produktion bauen
pnpm tauri build
```

### Testumgebung

Hablará ist eine Desktop-Anwendung, die mit Tauri erstellt wurde. Zum Testen benötigen Sie:

- **macOS** mit Mikrofonzugriffsberechtigungen
- **Ollama** lokal laufend für LLM-Features (optional)
- **Audio-Eingabegerät** für Aufnahmetests

```bash
# Rust-Toolchain überprüfen
rustc --version
cargo --version

# Tauri CLI überprüfen
cargo tauri --version

# Rust-Tests ausführen
cd src-tauri && cargo test

# Frontend-Tests ausführen
pnpm test
```

## Stilrichtlinien

### TypeScript

- TypeScript Strict-Modus verwenden
- `interface` gegenüber `type` für Objektformen bevorzugen
- Explizite Rückgabetypen für Funktionen verwenden
- Keine `any`-Typen - verwenden Sie Generics oder `unknown`
- Unveränderlichkeit: Objekte nie mutieren, neue erstellen

```typescript
// Gut
function updateSettings(settings: AppSettings, key: string, value: string): AppSettings {
  return { ...settings, [key]: value };
}

// Schlecht
function updateSettings(settings: AppSettings, key: string, value: string): void {
  settings[key] = value; // Mutation!
}
```

### Rust

- `rustfmt`-Konventionen befolgen
- `#[serde(rename_all = "camelCase")]` für Structs verwenden (JS-Interop)
- Fehler mit `Result<T, String>` in Tauri-Commands behandeln
- `spawn_blocking` für Datei-I/O in async Commands verwenden

```rust
// Gut: Non-blocking Datei-I/O
#[tauri::command]
pub async fn list_recordings() -> Result<Vec<Recording>, String> {
    tokio::task::spawn_blocking(|| {
        // Datei-I/O hier
    }).await.map_err(|e| e.to_string())?
}
```

### React-Komponenten

- Funktionale Komponenten mit Hooks verwenden
- Komplexe Logik in eigene Hooks extrahieren
- Komponenten unter 400 Zeilen halten
- `useCallback` und `useMemo` angemessen verwenden

### Dokumentation

- Markdown verwenden
- Code-Beispiele einbinden
- Zeilen unter 100 Zeichen halten
- TL;DR für lange Dokumente hinzufügen

## Commit-Nachrichten

Konventionelles Format befolgen:

```
typ: kurze beschreibung

Längere Erklärung bei Bedarf.

Fixes #123
```

Typen: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`

**Beispiele:**
- `feat: Emotions-Blending-Visualisierung hinzugefügt`
- `fix: Audio-Level-Meter-Flackern behoben`
- `docs: Transkriptions-Architektur aktualisiert`
- `refactor: ProcessingProgress-Komponente extrahiert`

## Pull-Request-Prozess

1. README.md bei Bedarf aktualisieren
2. CHANGELOG.md mit Ihren Änderungen aktualisieren
3. Sicherstellen, dass CI durchläuft (Lint, Typprüfung, Tests)
4. PRs erfordern eine Maintainer-Genehmigung
5. Commits vor dem Mergen squashen

### PR-Checkliste

- [ ] Code folgt den Stilrichtlinien
- [ ] TypeScript kompiliert ohne Fehler (`pnpm tsc --noEmit`)
- [ ] Rust kompiliert ohne Warnungen (`cargo clippy`)
- [ ] Tests bestehen (`pnpm test`)
- [ ] Dokumentation aktualisiert (falls zutreffend)
- [ ] CHANGELOG.md aktualisiert

## Dokumentations-Links prüfen

Alle Pull Requests mit Änderungen an `.md`-Dateien triggern einen automatischen Link-Check.

**Warum?** Defekte Links schaden der Benutzererfahrung, SEO und wirken unprofessionell.

### Falls der Link-Check fehlschlägt

1. **Workflow-Logs prüfen**: Gehen Sie zum [Actions Tab](https://github.com/fidpa/hablara/actions/workflows/links-check.yml) und schauen Sie sich die Details an.

2. **Manuell verifizieren**: Ist der Link wirklich kaputt? Öffnen Sie ihn in Ihrem Browser.

3. **False Positive?** Wenn der Link funktioniert, aber der Check fehlschlägt, fügen Sie ihn zur `.lycheeignore` hinzu:
   ```bash
   echo "^https://example\\.com/.*$" >> .lycheeignore
   git add .lycheeignore
   git commit -m "chore: ignoriere False Positive Link"
   ```
   **Wichtig:** Doppelte Backslashes für Shell-Escaping verwenden!

4. **Echtes Problem?** Fixe den defekten Link oder entferne ihn aus der Dokumentation.

### Fail-Threshold

Der Link-Check schlägt **nur bei ≥5 defekten Links** fehl. 1-4 False Positives blockieren Ihren PR nicht.

**Scheduled Check:** Täglich um 02:00 UTC läuft eine automatische Prüfung. Bei defekten Links wird ein GitHub Issue erstellt.

### Wann zur .lycheeignore hinzufügen?

**Hinzufügen wenn:**
- Localhost-URLs (nur zur Laufzeit verfügbar)
- Login-geschützte Seiten (401/403 erwartet)
- Dynamische Badges (shields.io)
- Crawler-Blocks (raw.githubusercontent.com)

**NICHT hinzufügen wenn:**
- Link ist wirklich kaputt (404, 500)
- Tippfehler im URL
- Domain existiert nicht mehr

### Häufige False Positives

Diese URLs können False Positives auslösen:

- **Localhost**: `http://localhost:*` (nur zur Laufzeit verfügbar)
- **Badges**: `https://img.shields.io/*` (dynamischer Content)
- **API Keys**: `https://platform.openai.com/api-keys` (Login-Required)
- **HuggingFace**: `https://huggingface.co/cstr/whisper-large-v3-turbo-german-ggml/resolve/*` (Rate-Limiting)

### Lokales Testing

Vor dem Push können Sie Links lokal testen:

```bash
# Lychee installieren (einmalig)
cargo install lychee

# Alle Markdown-Dateien prüfen
lychee --verbose --exclude-path 'docs-dev/' '**/*.md'

# Mit Custom User-Agent (empfohlen)
lychee --user-agent 'Mozilla/5.0' --verbose '**/*.md'
```

## Fragen?

- Starten Sie eine [Diskussion](https://github.com/fidpa/hablara/discussions)
- Prüfen Sie die bestehende Dokumentation in `/docs`

---

Vielen Dank für Ihren Beitrag zu Hablará!

---

**Version:** 1.0.0
