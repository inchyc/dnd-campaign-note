---
name: build-and-release-apk
description: Build and test the Next.js web app and package/copy the Android release APK locally on Windows.
---

# Build Web App & Release Android APK

1. **Run Web Unit Tests** (inside sandbox):
   ```powershell
   npm --prefix web test
   ```
2. **Build Next.js Web App**:
   - Try `npm --prefix web run build` in the sandbox first.
   - On Windows, if `next build` fails with `EPERM: operation not permitted, mkdir ...\.next\...\api\campaigns\[id]` after retrying, rerun `npm --prefix web run build` with `BypassSandbox: true`.
3. **Build Android Release APK**:
   - The Android SDK (`sdk.dir` in `android/local.properties`) lives outside the workspace, so run Gradle with `BypassSandbox: true`:
     ```powershell
     .\android\gradlew.bat -p android assembleRelease
     ```
4. **Distribute APK Locally**:
   - Copy `android\app\build\outputs\apk\release\app-release.apk` to:
     - `D&D-Campaign-Notes.apk` (workspace root)
     - `release\D&D-Campaign-Notes.apk`
     - `$env:USERPROFILE\Downloads\D&D-Campaign-Notes.apk` (when requested locally, with `BypassSandbox: true`)
