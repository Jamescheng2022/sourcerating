# SourceRating Native Android Pilot

This is a real native Android pilot. It does not embed the SourceRating website and does not use WebView, TWA, or Capacitor.

## Stack
- Android platform Activity/View widgets
- Java 8 source compiled with the installed Android SDK/JDK
- Supabase Auth, PostgREST/RPC, and Storage through the same P1 backend/RLS
- 3-second polling fallback for room updates in the pilot

## Pilot flows
- Buyer/Supplier email/password login with identity from active room memberships
- Invitation bootstrap, sign-in, and claim
- RLS-filtered project rooms
- Native message timeline and composer
- append_room_event canonical message writes
- Needs You and staging proposal status
- Native document picker and room file upload
- File version history, server byte/type checks, and SHA-256 checked downloads
- Session persistence and refresh token
- Phone single-pane and >=720dp two-pane layout

## Build

Supply the backend origin and an outside-repo file containing its **public**
anon/publishable key. There is no built-in backend or key. For the Android
emulator, `10.0.2.2` reaches the Windows host's local Supabase stack:

```powershell
python build.py --supabase-url http://10.0.2.2:54321 --supabase-anon-key-file D:\AgentWorkspaces\sourcerating-app-l1\secrets\s2-anon-key.txt
```

The build generates `BuildConfig.java` inside ignored `build/`; checked-in Java
source is never rewritten. HTTPS targets retain the source manifest's cleartext
block. Local HTTP builds generate a network-security exception for only the
selected local host (10.0.2.2, 127.0.0.1 or localhost). Rebuild to change targets.
Secret/service-role keys and nonlocal HTTP targets are refused. The debug signing
keystore is generated outside Git at the workspace's `secrets/android-debug.keystore`.

Output:
pilot-artifacts/SourceRating-Native-debug.apk

If an existing APK has a different signing certificate, preserve it and its data
by adding `--application-id com.sourcerating.mobile.stage2`. This local-only
variant is labeled **SourceRating Local** and runs alongside the original app;
it uses the same Java source and separate Android app storage. No original
keystore is needed. Do not uninstall or clear an existing app to bypass signing.

For local runtime acceptance, boot the existing `SourceRating_API35` AVD with
`-read-only -no-snapshot-load -no-snapshot-save`, install the local
variant, and run from the repository root:

```powershell
python apps/android-native/scripts/s2-android-e2e.py --adb-port 5038
```

If read-only startup fails, use a dedicated `SourceRating_API35_L1` clone with
cold boot, `-wipe-data -no-snapshot-load -no-snapshot-save` and the test script's
`--avd-name SourceRating_API35_L1`. Wipe only that dedicated synthetic clone;
never load, save, restore or wipe the original AVD snapshot/data.

The script uses the existing outside-repo `[S2-TEST]` password/key files, drives
native widgets and the system document picker through ADB, and saves screenshots,
checks, a downloaded fixture and redacted app logs outside Git. It creates only
synthetic messages/files, uses localhost HTTP assertions as the counterpart,
and restores emulator connectivity after the offline/reconnect check. File
checks compare byte count, SHA-256 and detected type; they do not certify document
contents or scan for malware.
