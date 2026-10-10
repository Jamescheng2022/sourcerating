# SourceRating Native Android Pilot

This is a real native Android pilot. It does not embed the SourceRating website and does not use WebView, TWA, or Capacitor.

## Stack
- Android platform Activity/View widgets
- Java 8 source compiled with the installed Android SDK/JDK
- Supabase Auth, PostgREST/RPC, and Storage through the same P1 backend/RLS
- 3-second polling fallback for room updates in the pilot

## Pilot flows
- Buyer/Supplier demo login
- Invitation bootstrap, sign-in, and claim
- RLS-filtered project rooms
- Native message timeline and composer
- append_room_event canonical message writes
- Needs You and staging proposal status
- Native document picker and room file upload
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
