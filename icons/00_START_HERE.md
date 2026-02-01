# 🎨 Hablará App Icon - Start Here

**⚠️ DU SUCHST DAS FINALE ICON?** → `hablara-icon-1024.png`

---

## 📍 Quick Navigation

### 🎯 Für Nutzer des Icons

**Du willst wissen:**
- Was das Icon darstellt? → `README.md` (Abschnitt "Was das Icon darstellt")
- Welche Farben verwendet werden? → `README.md` (Abschnitt "Farbcodes")
- Wie man es nutzt? → `README.md` (Abschnitt "Verwendung")

### 🔧 Für Entwickler/Designer

**Du willst:**
- Das Icon replizieren? → `../docs/how-to/icon/CREATE_MACOS_APP_ICON.md` (1000+ Zeilen Vollständiger Workflow)
- Icon-Größen neu generieren? → `./generate-sizes.sh` (Automatisches Script)
- Verstehen warum bestimmte Designs verworfen wurden? → `concepts/README.md` (Archiv)

---

## ✅ Finale Dateien (Production)

```
icons/
├── hablara-icon-1024.png      ← MASTER (1024x1024, RGBA)
├── 16x16.png                  ← Dock Mini, Browser Tab
├── 32x32.png                  ← Dock 1x
├── 64x64.png                  ← Dock 2x
├── 128x128.png                ← Large 1x
├── 128x128@2x.png             ← Large 2x (256x256)
├── 256x256.png                ← App Icon 1x
├── 256x256@2x.png             ← App Icon 2x (512x512)
├── 512x512.png                ← Large App Icon 1x
├── 512x512@2x.png             ← Large App Icon 2x (1024x1024)
└── icon.icns                  ← macOS Bundle (alle Größen)
```

**Status:** Production Ready (2026-01-28, 10:30 Uhr)

---

## ❌ Was du NICHT verwenden solltest

- `concepts/A1.png` bis `C3.png` - **ARCHIV!** Alte verworfene Konzepte
- Diese sind nur für historischen Kontext, **nicht für Production**

---

## 🎨 Was das finale Icon darstellt

**In einem Satz:**
> "Deine Sprache wird zu strukturierten Insights"

**Visuell:**
- **2 große glänzende Kugeln** (Liquid Glass Stil) = AI Intelligence, neuronales Netzwerk
- **3-4 dicke Wellenlinien** (Blau→Cyan Gradient) = Voice Input, Schallwellen

**Transformation:** Wellen fließen von links → transformieren zu Kugeln rechts

Das Icon visualisiert Hablará's Kernversprechen: Voice Intelligence durch Transformation von Sprache zu Insights.

---

## 📚 Vollständige Dokumentation

| Dokument | Zweck | Umfang |
|----------|-------|--------|
| `README.md` | Icon-Übersicht, Rationale, Farbcodes | ~60 Zeilen |
| `concepts/README.md` | Archiv alter Konzepte (A1-C3) | ~80 Zeilen |
| `../docs/how-to/icon/CREATE_MACOS_APP_ICON.md` | Vollständiger Replizierungs-Workflow | 1000+ Zeilen |

---

## 🚀 Quick-Start

### Nur Icon nutzen
```bash
# Icon ist fertig! Nutze die PNG-Dateien oder .icns
open icons/512x512.png
```

### Icon replizieren
```bash
# 1. Lies vollständigen Workflow
open docs/how-to/icon/CREATE_MACOS_APP_ICON.md

# 2. Folge Abschnitt 9 "Vollständiger Workflow"
#    (Design → Nachbearbeitung → Größen generieren → Tauri-Integration)
```

### Icon-Größen neu generieren
```bash
# Aus hablara-icon-1024.png alle Größen neu erstellen
./icons/generate-sizes.sh
```

---

**⚡ TL;DR:**
- **Production Icon:** `hablara-icon-1024.png` + generierte Größen
- **Rationale:** `README.md`
- **Vollständiger Workflow:** `../docs/how-to/icon/CREATE_MACOS_APP_ICON.md`
- **Alte Konzepte:** `concepts/` (NUR Archiv, nicht verwenden!)
