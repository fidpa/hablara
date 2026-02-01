# Name Change Checklist

**WICHTIG:** Vor Abgabe alle Referenzen auf "VIP", "challenge", und URLs anpassen!

**🎯 FINALER NAME: HABLARÁ**
- Spanisch "él/ella hablará" (er/sie wird sprechen, Futur von hablar)
- Bedeutung: Voice Intelligence Platform - Die App die für Sie sprechen wird
- Technical identifier: **hablara** (ohne Akzent, ASCII-only)
- Display name: **Hablará** (mit Akzent, user-facing)
- Details: `docs/explanation/decisions/ADR-027-app-naming-and-slogan.md`

**Inline-Kommentare gesetzt in:**
- `CONTRIBUTING.md` (HTML-Kommentar oben)
- `SECURITY.md` (HTML-Kommentar oben)
- `.github/ISSUE_TEMPLATE/config.yml` (YAML-Kommentar oben)
- `.github/workflows/release.yml` (YAML-Kommentar oben)

## Version auf 1.0.0 setzen

**Vor Abgabe alle Versionen synchronisieren:**

- [ ] `package.json` - Zeile 4: `"version": "0.0.2"` → `"version": "1.0.0"`
- [ ] `src-tauri/Cargo.toml` - Zeile 3: `version = "0.0.1"` → `version = "1.0.0"`
- [ ] `src-tauri/tauri.conf.json` - Zeile 4: `"version": "0.0.1"` → `"version": "1.0.0"`
- [ ] `README.md` - Badge bereits auf 1.0.0 gesetzt ✅
- [ ] `CHANGELOG.md` - Neuer Release-Eintrag für 1.0.0 hinzufügen

**Command für Sync:**
```bash
# package.json
npm version 1.0.0 --no-git-tag-version

# Dann manuell:
# - src-tauri/Cargo.toml
# - src-tauri/tauri.conf.json
# - CHANGELOG.md
```

## Repository & URLs

- [ ] GitHub Repository umbenannt
- [ ] Alle GitHub URLs aktualisiert (siehe unten)

## Dateien mit Namen-Referenzen

### Root-Level

- [ ] `README.md`
  - [ ] Projekt-Name im Titel: "VIP" → "Hablará"
  - [ ] GitHub URLs: challenge → hablara (falls Repository umbenannt wird)
  - [ ] Beschreibungen anpassen

- [ ] `CONTRIBUTING.md`
  - Zeile 1: `# Contributing to VIP (Voice Intelligence Platform)` → `# Contributing to Hablará`
  - Zeile 3: `thank you for considering contributing to VIP!` → `...to Hablará!`
  - [ ] GitHub URLs prüfen (nur falls Repository umbenannt wird)

- [ ] `SECURITY.md`
  - [ ] GitHub URLs prüfen (nur falls Repository umbenannt wird)

- [ ] `CHANGELOG.md`
  - Alle Referenzen auf "VIP" prüfen

- [ ] `package.json`
  - Zeile 2: `"name": "challenge"` (KANN bleiben oder → `"name": "hablara"`)
  - GitHub URLs im `repository` Feld (nur falls Repository umbenannt wird)

### .github/

- [ ] `.github/ISSUE_TEMPLATE/config.yml`
  - [ ] GitHub URLs prüfen (nur falls Repository umbenannt wird)

- [ ] `.github/workflows/release.yml`
  - Zeile 62: `releaseName: 'VIP ${{ github.ref_name }}'` → `releaseName: 'Hablará ${{ github.ref_name }}'`
  - Zeile 63: `releaseBody: 'See the assets below to download the app for macOS.'`

### Tauri/Rust

- [ ] `src-tauri/Cargo.toml`
  - Zeile 2: `name = "vip"` → `name = "hablara"` (ASCII-only, kein Akzent)

- [ ] `src-tauri/tauri.conf.json`
  - Zeile 3: `"productName": "VIP"` → `"productName": "Hablará"` (mit Akzent für Display)
  - Zeile 5: `"identifier": "com.vip.app"` → `"identifier": "com.hablara.app"` (ASCII-only)
  - Zeile 16: `"title": "VIP - Voice Intelligence"` → `"title": "Hablará - Voice Intelligence"`

### Dokumentation (optional, falls öffentlich)

- [ ] `CLAUDE.md`
  - Titel: `# VIP - Voice Intelligence Platform | Claude Code Navigation Hub` → `# Hablará - Voice Intelligence Platform | Claude Code Navigation Hub`
  - Zeile 2: `> **Everlast Challenge** - Voice Intelligence Desktop App` (kann bleiben)

- [ ] `.claude/context.md`
  - Titel: `# VIP (Voice Intelligence Platform) - Kontext` → `# Hablará (Voice Intelligence Platform) - Kontext`

## Änderungs-Strategie

### Option 1: Find & Replace
```bash
# Vorsicht: Erst in .git/ ausschließen!
# Beispiel für neuen Namen "MeinApp"
find . -type f -not -path "./.git/*" -not -path "./node_modules/*" \
  -exec sed -i '' 's/VIP/MeinApp/g' {} +
```

### Option 2: Manuelle Änderung
- Checklist abarbeiten
- Jede Datei einzeln prüfen und anpassen
- GitHub Repo umbenennen (Settings → Rename)
- Git remote URL aktualisieren:
  ```bash
  git remote set-url origin https://github.com/fidpa/NEUER_NAME.git
  ```

## Wichtige Hinweise

1. **Identifier ändern** (`com.vip.app` → `com.NEUE_DOMAIN.app`)
   - Einmaliger Wert pro App im macOS Ecosystem
   - Reverse DNS Notation verwenden

2. **GitHub Discussions/Issues**
   - Erst Repository umbenennen
   - Dann URLs aktualisieren (GitHub redirected automatisch)

3. **Branding**
   - App-Icons ggf. neu erstellen
   - Window-Titel anpassen
   - Über-Dialog aktualisieren (falls vorhanden)

---

**Nach Änderung testen:**
```bash
pnpm dev:safe   # Überprüfe Window-Titel
pnpm tauri build  # Überprüfe DMG-Name
```
