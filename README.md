# 🎲 D&D Campaign Notes

An agentic, cross-platform tabletop operations hub and Obsidian markdown vault bridge designed for live D&D campaign management.

[![Web App](https://img.shields.io/badge/Web_App-Live_on_Vercel-success?style=for-the-badge&logo=vercel)](https://dnd-campaign-notes-hub.vercel.app)
[![Android APK](https://img.shields.io/badge/Download_APK-v1.1.0-amber?style=for-the-badge&logo=android)](release/D&D-Campaign-Notes.apk)
[![Release](https://img.shields.io/badge/Latest_Release-v1.1.0-blue?style=for-the-badge&logo=github)](https://github.com/inchyc/dnd-campaign-note/releases/tag/v1.1.0)

---

## 📱 Android App Installation

You can download and install the Android app directly onto any Android device:

👉 **[Download Latest Android APK (v1.1.0)](release/D&D-Campaign-Notes.apk)** (Direct repository link)  
👉 **[GitHub Releases Page](https://github.com/inchyc/dnd-campaign-note/releases)** (Tagged releases & asset downloads)

### How to Install:
1. Tap the download link above on your Android phone or tablet.
2. If prompted, select **"Download anyway"**.
3. Tap the downloaded file and choose **"Install"** (enable *Install unknown apps* for your browser if prompted).
4. Launch **D&D Campaign Notes**!

---

## 🔄 Version Control & Updates

This repository enforces semantic versioning (`vMAJOR.MINOR.PATCH`) across both the web app and Android native builds.

### Current Version: `v1.1.0` (versionCode `2`)

| Component | Version | Location |
|---|---|---|
| **Android Native App** | `1.1.0` (versionCode `2`) | [`android/app/build.gradle.kts`](android/app/build.gradle.kts) |
| **Web Hub App** | `1.1.0` | [`web/package.json`](web/package.json) |
| **Latest APK Asset** | `v1.1.0` | [`release/D&D-Campaign-Notes.apk`](release/D&D-Campaign-Notes.apk) |
| **Release Changelog** | Detailed history | [`release/CHANGELOG.md`](release/CHANGELOG.md) |

### How to Release a New Update:
1. **Bump Version Numbers**:
   - In `android/app/build.gradle.kts`, increment `versionCode` (e.g. `3`) and `versionName` (e.g. `"1.2.0"`).
   - In `web/package.json`, bump `"version": "1.2.0"`.
2. **Build and Commit**:
   ```bash
   cd android
   ./gradlew assembleDebug
   cd ..
   cp android/app/build/outputs/apk/debug/app-debug.apk release/D&D-Campaign-Notes.apk
   cp android/app/build/outputs/apk/debug/app-debug.apk release/D&D-Campaign-Notes-v1.2.0.apk
   git add -A
   git commit -m "chore: release v1.2.0"
   ```
3. **Push Git Tag**:
   ```bash
   git tag -a v1.2.0 -m "Release v1.2.0"
   git push origin main --tags
   ```
4. **Automated CI/CD**:
   - GitHub Actions (`.github/workflows/android-release.yml`) will automatically trigger, build the APK, generate release notes, and publish the official GitHub Release with attached APK binaries.

---

## ✨ Features

- **Multi-Campaign Creator**: Any party member can launch a new campaign and vault, acting as DM/Scribe.
- **Three-Tier Privacy**: Clear badges for `🔒 DM Secret`, `👤 Private (Character)`, and `👥 Party Shared` records.
- **DM "Player View" Mode**: Scribe can preview the exact view players have with one click.
- **Investigation & Quest Board**: Move quests between Open, Active, and Resolved, with 2-player archive voting consensus.
- **Live Scratchpad & Table Feed**: Real-time scratchpad with optimistic UI and persistent local fallback.
- **Audio Scribe & Lore Transcripts**: In-browser audio recording stored in device IndexedDB, with Gemini AI lore-aware transcripts.
- **Full Offline Resilience**: Cached notes and service worker assets keep campaign dossiers available even without internet access.
