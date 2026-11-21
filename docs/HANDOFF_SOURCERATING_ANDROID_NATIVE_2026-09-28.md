# SourceRating Native Android — HANDOFF (2026-09-28)

## Goal
Deliver a real native Android SourceRating internal pilot. User explicitly rejected WebView/TWA/Capacitor shells.

## Project
- WebCodex project: agent:bangkok-agent:source-rating-v4-bd345f52
- Git branch: feat/project-room-p1
- HEAD observed: 89011298ec5d241efe84cc9bc2088fe9f2d3c8d8
- Existing P1 web/Supabase worktree is dirty and MUST be preserved. Do not reset/revert unrelated P1 files.

## Native implementation completed
New native source exists under:
- apps/android-native/

Implementation:
- Android native Activity/View UI (NO WebView)
- package: com.sourcerating.mobile
- minSdk 26 / targetSdk 35
- phone single-pane + >=720dp two-pane/foldable layout
- Buyer/Supplier demo login
- supplier invitation onboarding
- RLS room list
- native message timeline/composer
- append_room_event RPC
- Needs You / staging proposal state
- native file picker + Storage upload + register_room_file_version
- persisted auth/refresh token
- 3-second polling fallback for room updates
- no service-role secrets

Backend reused:
- Supabase: https://qnozpurjtgkmwtvsrjoi.supabase.co
- only public publishable/anon key is client-side
- canonical permissions remain Supabase Auth + RLS

## Edge-function native compatibility fix
p1-demo-auth and project-invite currently enforce allowed browser Origin.
Native client now sends:
Origin: https://sourcerating.com
for those onboarding Edge Function calls only.
Direct REST/RPC remains bearer-authenticated under RLS.

## APK
Current native APK:
pilot-artifacts/SourceRating-Native-debug.apk

Last successful build:
- versionCode: 3
- versionName: 0.2.1-native
- package: com.sourcerating.mobile
- signature v2/v3: PASS
- SHA256: 471f12aee7dd3d1d4a3859079551e27878ddcecc8e33b76021174b0a163a0993
- build script: apps/android-native/build.py
- Android SDK: D:\Android\Sdk
- JDK17: C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot

Build command:
python apps/android-native/build.py

Important: build.py was changed to keep a persistent apps/android-native/debug.keystore instead of generating a new signing key on every build, so future APK upgrades can install over prior pilot builds.

## Runtime evidence already obtained
Before the latest Runner/emulator failure, real Android emulator testing succeeded for:
1. APK install: PASS
2. Cold app launch: PASS
3. UI tree proved native widgets (TextView/Button/EditText/ListView), no WebView: PASS
4. Buyer demo login: PASS after Origin compatibility fix
5. Entered real project: "Bangkok Prefab Office - Pilot" / code BKK-PREFAB-PILOT
6. Entered real room: "Buyer Internal"
7. RLS-loaded existing room history: PASS
8. RLS-loaded existing attachment Buyer_Internal_Confidential.pdf: PASS
9. Needs You / AI proposal state loaded: PASS (0/0 during test)
10. No Android crash observed during those steps

Backend direct diagnostic also proved the exact canonical send path:
- Demo auth -> Supabase password sign-in -> claim_p1_demo_role -> rooms -> append_room_event
- append_room_event returned HTTP 200
- diagnostic event seq=3 in Buyer Internal

## Message send test status
Automated UI send is NOT fully accepted yet.
Earlier automated text entry left text in EditText; the coordinate automation likely hit the soft keyboard instead of Send.
MainActivity was updated so real API send failures now show an explicit "Message not sent" dialog and are no longer silently overwritten by the 3-second polling status.

Next emulator test MUST:
1. tap composer
2. input marker
3. close soft keyboard (BACK)
4. tap visible Send button
5. assert marker exists as TextView message bubble, not EditText
6. force-stop app
7. relaunch
8. assert project room restored and marker remains in history

## Current blocker
The SourceRating code is NOT the current blocker.

Current blocker is the Bangkok Android AVD:
- AVD: BangkokAI_API35
- AVD config path: D:\Android\avd\BangkokAI_API35.avd
- emulator binary: D:\Android\Sdk\emulator-2\emulator.exe
- Android Emulator 37.1.11
- ADB: D:\Android\Sdk\platform-tools\adb.exe

Earlier, emulator-5554 successfully booted and ran the app.
After Runner interruptions/restarts, emulator startup repeatedly fails to register in ADB within 150 seconds.
Stale locks hardware-qemu.ini.lock and multiinstance.lock were found and safely removed when no emulator/qemu process existed, but a fresh launch still did not come online.

There are/were other Bangkok Android jobs using the same default ADB/emulator environment (bangkok-ai-mobile), which likely contributed to ADB instability.

## Recommended next action
Do NOT restart development or rewrite the app.

Repair/replace the test environment first:
Option A:
- create a fresh clean API35 AVD dedicated to SourceRating, e.g. SourceRating_API35
- use standard emulator directory or fix the current SDK emulator path mismatch (installed package is under emulator-2 while SDK expects emulator)

Option B:
- repair/move D:\Android\Sdk\emulator-2 -> standard D:\Android\Sdk\emulator safely through sdkmanager reinstall
- then boot BangkokAI_API35

Once an emulator is online, install the existing APK and finish the 8-step send/session test above.

## Obsolete experiment
apps/android-pilot/ and pilot-artifacts/SourceRating-Pilot-debug.apk are the rejected WebView experiment.
Do not deliver them.
Remove them only after the native APK reaches final acceptance, so no useful evidence is accidentally lost during recovery.

## Acceptance still pending
- native send via UI
- restart/session persistence with sent message
- attachment upload on emulator
- offline/reconnect behavior
- optional foldable/tablet layout smoke

## Safety
Do not touch/reset the existing dirty P1 web/Supabase changes.
Do not merge main or deploy production merely to finish Android testing.
