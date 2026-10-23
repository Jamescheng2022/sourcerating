# Cloud acceptance 2026-10-23

Implementation: `1f7c998232b70ba66fe9ae79c2b1abba9b3052d2` on codex/cloud-launch-20261023.

PASS: python /workspace/tools/run-sr.py build (Next production build/type checking); npm run lint in apps/web; Deno test --sloppy-imports --allow-env --allow-read --allow-net supabase/functions/tests supabase/scripts/target_guard_test.ts (60 passed: 48 existing + 12 archive); python /workspace/tools/run-sr.py archive (6 local HTTP/browser checks). See committed logs and archive-report.json.

HTTP checks use actual local Auth/RLS with synthetic fixtures: anonymous denial, authorized complete empty-room response, unrelated supplier denial, removed-member denial, invalid/oversize input, and buyer UI login. They do not invoke the blocked file gateway. Byte/hash/size/revocation/URL/stream limits are isolated tests, not proof of the live attachment chain.

Archive is API-only, one room current snapshot/all visible file versions, max 50 files and 2 MiB original bytes; fail closed, no partial success. Existing UI continues to describe a metadata index. Real attachment export remains blocked by the existing kong policy. Large/project-wide archive, restore/import and irreversible deletion are not implemented. Deletion safety/retention/ownership gates are documented in docs/ROOM_ARCHIVE_AND_DELETION.md; no destructive API was introduced.

Network draft remains unpublished; see network-observation.json for exact IDs, setting and existing draft changes. No retry/bypass, production operation or public preview URL. Local internal browser/HTTP preview only. This evidence commit changes no implementation source.
