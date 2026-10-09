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
python build.py

Output:
pilot-artifacts/SourceRating-Native-debug.apk
