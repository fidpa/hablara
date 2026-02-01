<!-- TODO: Before submission - Update app name "Hablará" if renamed! See NAME_CHANGE_CHECKLIST.md -->

# Hablará v[VERSION] - [RELEASE_NAME]

**Release Date:** [YYYY-MM-DD]

---

## 🎯 Highlights

<!-- Brief summary of this release (2-3 sentences) -->

---

## ✨ New Features

<!-- List new features with brief descriptions -->

- **Feature Name** - Description of what it does and why it's useful
  - Example: Enhanced emotion blending with continuous mixing
  - Example: Multi-step processing UI with cancel support

---

## 🐛 Bug Fixes

<!-- List bug fixes -->

- **Issue #[NUMBER]** - Brief description of the fix
  - Example: Fixed audio level meter flickering on M4 chips
  - Example: Resolved race condition in WebView loading

---

## ⚡ Performance Improvements

<!-- List performance optimizations -->

- Improvement description
  - Example: 20% faster LLM inference with qwen-vip model
  - Example: Reduced memory usage in audio processing

---

## 📚 Documentation

<!-- List documentation updates -->

- Documentation update description
  - Example: Added comprehensive multi-modal analysis guide (3200 lines)
  - Example: Updated troubleshooting guide with macOS-specific issues

---

## 🔒 Security

<!-- List security fixes (if any) -->

- Security fix description (or "No security issues addressed in this release")

---

## 📦 Dependencies

<!-- List notable dependency updates -->

### Updated
- `dependency-name` from `X.Y.Z` to `A.B.C`

### Added
- `new-dependency` `X.Y.Z`

### Removed
- `old-dependency` (reason for removal)

---

## 💔 Breaking Changes

<!-- List breaking changes (or "No breaking changes in this release") -->

- Breaking change description
  - **Migration:** Steps to migrate from previous version

---

## 🚀 Installation

### macOS (Apple Silicon)
```bash
# Download DMG
curl -L -O https://github.com/fidpa/hablara/releases/download/v[VERSION]/Hablará_[VERSION]_aarch64.dmg

# Open and install
open Hablará_[VERSION]_aarch64.dmg
```

### macOS (Intel)
```bash
# Download DMG
curl -L -O https://github.com/fidpa/hablara/releases/download/v[VERSION]/Hablará_[VERSION]_x64.dmg

# Open and install
open Hablará_[VERSION]_x64.dmg
```

### From Source
```bash
git clone https://github.com/fidpa/hablara.git
cd challenge
git checkout v[VERSION]
pnpm install
./scripts/setup-whisper.sh
pnpm dev:safe
```

---

## 📋 System Requirements

- **macOS:** 13.0+ (Ventura or later)
- **Chip:** Apple Silicon (M1/M2/M3/M4) or Intel
- **RAM:** 8 GB minimum, 16 GB recommended
- **Disk:** 2 GB free space (5 GB with Ollama models)
- **Microphone:** Required for audio recording

---

## 🔗 Full Changelog

See the full list of changes: [v[PREVIOUS_VERSION]...v[VERSION]](https://github.com/fidpa/hablara/compare/v[PREVIOUS_VERSION]...v[VERSION])

---

## 🙏 Contributors

<!-- List contributors (if any external contributions) -->

Special thanks to:
- @username - Contribution description

---

## 📝 Notes

<!-- Additional notes, known issues, upcoming features -->

### Known Issues
- Issue description (workaround if available)

### Coming Next
- Planned feature for next release

---

**Feedback?** Open an [issue](https://github.com/fidpa/hablara/issues) or start a [discussion](https://github.com/fidpa/hablara/discussions)!
