# SourceRating Android Pilot — Acceptance Evidence (2026-09-27)

## Goal

Create an installable Android internal-pilot app without rewriting SourceRating or disturbing the in-progress P1 Project Room work.

## Preserved existing work

The pre-existing `feat/project-room-p1` worktree was intentionally left untouched. Existing modified/untracked P1 files under `apps/web`, `supabase/migrations`, and `e2e-tmp` were not reset, staged, or overwritten.

Android work is isolated under:

- `apps/android-pilot/`
- `pilot-artifacts/` (binary artifacts ignored by Git)

## Implementation

- Native Android WebView shell, package `com.sourcerating.pilot`
- App name: `SourceRating Pilot`
- minSdk 26 (Android 8.0), targetSdk 35
- Reuses the existing hosted SourceRating P1 Project Room; no duplicated procurement/chat business logic
- JavaScript + DOM storage enabled
- Persistent WebView cookies/session
- Android back button uses WebView history before exiting
- System file chooser wired to HTML file inputs
- External links handled through Android intents
- Cleartext HTTP disabled
- Main-frame network/server failure shows retry UI instead of crashing
- If the temporary Vercel pilot access entry expires, the error UI accepts a replacement HTTPS pilot URL and stores it locally
- Temporary access URL is generated only into ignored `build/` output; it is not stored in tracked source

## Hosted target validation

- P1 Vercel deployment: `feat/project-room-p1`
- Project Room route: `/project-room`
- Protected preview without bypass redirects to Vercel authentication
- Temporary pilot bypass URL was validated from the Bangkok runner and resolved to the Project Room with HTTP 200
- The current temporary bypass is intended for first-batch internal testing; its issuance is time-limited for new devices

## Build evidence

Built with the installed Bangkok toolchain:

- Android SDK: platform 35 / build-tools 35.0.0
- JDK: Eclipse Adoptium 17
- Python build driver: `apps/android-pilot/build.py`

APK:

- Path: `pilot-artifacts/SourceRating-Pilot-debug.apk`
- Size: 16,787 bytes
- SHA-256: `f51e4ae479dbbe6237f376e3a981d7fd4a4343604e0a2f3132a987369150a7d9`
- Version: 0.1.0 (versionCode 1)

Validation completed:

- javac compilation: PASS
- Android resource compile/link: PASS
- D8 dex generation: PASS
- zipalign: PASS
- APK signature v2/v3 verification: PASS
- package metadata: PASS
- package id / SDK / launcher activity: PASS
- application label `SourceRating Pilot`: PASS
- pilot target HTTP access with bypass: PASS

## Runtime validation status

No Android virtual device is installed on this Bangkok runner and `adb devices` returned no connected device. Therefore physical/emulator installation and touch-level WebView interaction were **not executed** here.

The APK is structurally installable and signed, but these steps remain real-device acceptance checks:

1. Install APK
2. Launch to Project Room
3. Enter Buyer/Supplier demo or invitation flow
4. Send/receive messages
5. Pick/upload a file
6. Background/reopen and confirm session persistence
7. Toggle network off/on and confirm retry/reconnect behavior

## Rollback

The Android pilot is isolated. Rollback is removal of `apps/android-pilot/`, `pilot-artifacts/`, and this evidence file. No existing P1 web/Supabase file needs to be reverted.
