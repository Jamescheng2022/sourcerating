# SourceRating Native Android — Acceptance Evidence Pack

Date: 2026-09-28

## Verdict

**PASS — ready for internal Android pilot testing.**

This acceptance covers the native Android pilot requested in the handoff. It does not claim production-store readiness.

## Deliverable

- Package: `com.sourcerating.mobile`
- Version: `0.2.2-native`
- versionCode: `4`
- minSdk: `26`
- targetSdk: `35`
- APK: `pilot-artifacts/SourceRating-Native-debug.apk`
- Size: `33,171 bytes`
- SHA256: `08666f77f6f86ff51d616afb5c26b1d8da15bc9a27c5213d6b30896aade0082c`
- APK Signature Scheme v2: PASS
- APK Signature Scheme v3: PASS
- Signer: debug/pilot key, not a production release key

## Native implementation check

- Android Activity/View implementation: PASS
- Real `TextView`, `Button`, `EditText`, `ListView`, and `Spinner` widgets were observed through the emulator UI hierarchy.
- No WebView/TWA/Capacitor runtime is used by the native source.
- The rejected WebView experiment remains separate under `apps/android-pilot/` and is not the deliverable.

## Test environment

- Dedicated AVD: `SourceRating_API35`
- API: Android 35, x86_64
- Emulator: Android Emulator 37.1.11
- Device serial: `emulator-5566`
- Acceleration: WHPX usable
- Final phone viewport: 1440 x 3120, density 560
- Foldable/large-screen validation viewport: 2208 x 1840, density 420

The Bangkok SDK has an environmental packaging defect: `D:\Android\Sdk\emulator` is incomplete while the full emulator package is in `D:\Android\Sdk\emulator-2`. The pilot was validated by explicitly starting the complete emulator binary and using a dedicated SourceRating AVD. This is an Android test-environment issue, not a SourceRating application failure.

## Real-user black-box acceptance

| Acceptance item | Result | Evidence |
| --- | --- | --- |
| APK upgrade install | PASS | `adb install -r` returned `Success`; existing app data/session preserved |
| Cold launch | PASS | `MainActivity` launched with `LaunchState: COLD` |
| Buyer login / RLS project access | PASS | Loaded `Bangkok Prefab Office - Pilot · BKK-PREFAB-PILOT` and permitted rooms/history |
| Native UI message send | PASS | Marker `SR_FINAL_NATIVE_022` became an Android `TextView` message bubble |
| Canonical backend persistence | PASS | After force-stop/relaunch the marker was loaded again from room history |
| Active-room persistence | PASS | Relaunch returned directly to `Buyer ↔ Supplier`, not room index 0 |
| Auth/session persistence | PASS | Force-stop/relaunch did not fall back to the login screen |
| Native attachment upload | PASS | System DocumentsUI selected `SR_FINAL_ATTACH_022.png`; attachment returned in SourceRating room history |
| Null attachment-caption rendering | PASS | Attachment renders without the literal `null` suffix |
| Real offline handling | PASS | Airplane mode + Wi-Fi/data disabled; network probe returned `Network is unreachable`; app showed `Offline — retrying automatically` |
| Automatic reconnect | PASS | Network restored; app returned to online state without restart |
| Foldable/large-screen two-pane layout | PASS | `PROJECT ROOMS` sidebar, room list, timeline/composer and Send control all present at 2208 x 1840 |
| Last room on large-screen relaunch | PASS | Wide-layout relaunch restored `Buyer ↔ Supplier` |
| Android crash check during acceptance | PASS | No fatal Android crash observed during the tested flows |

## Changes made in the final recovery

1. Replaced the unstable shared emulator path with a dedicated `SourceRating_API35` AVD for acceptance.
2. Persisted the last active room in the app's existing local session preferences.
3. Restored that room after room-list loading on relaunch.
4. Removed the literal `null` rendering for file events whose caption is JSON null.
5. Bumped the pilot build from `0.2.1-native` / versionCode 3 to `0.2.2-native` / versionCode 4.

## Scope preserved

- Existing dirty P1 Web/Supabase changes were not reset or rewritten.
- No production deployment was performed.
- No merge to `main` was performed.
- The native app continues to use Supabase Auth + RLS; no service-role secret is embedded.

## Known limitations

- This is an internal debug-signed pilot APK, not a Play Store release build.
- Room updates currently use the pilot 3-second polling fallback.
- Invitation onboarding and every possible permission role were not re-executed during this recovery pass; this pass specifically closed the handoff's pending native black-box items.
- The Bangkok Android SDK emulator package should later be repaired/reinstalled into the standard `D:\Android\Sdk\emulator` location so other Android projects do not depend on the `emulator-2` workaround.

## Rollback

- Source rollback: revert the focused native Android commit created for this acceptance.
- Installed pilot rollback: reinstall the prior `0.2.1-native` APK only after removing the newer build, because Android does not normally allow a lower versionCode to install as an in-place downgrade.
- No backend schema rollback is required for the final Android-only fixes in this acceptance pass.
