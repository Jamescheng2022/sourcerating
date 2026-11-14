# Project Room B on a real backend — status 2026-11-14

Branch `feature/project-room-b-real-core-20261113`. Route `/project-room-b`.
`/project-room` (A) and `/project-room-lab` (DEMO) are unchanged in behaviour.

## Environment
- Backend: Supabase project `sourcerating-b-staging` (ref `nunojlfangvnjlwggvvb`, ap-southeast-1), created for this work.
  `sourcerating-p1` was not read or written.
- Schema: `supabase/migrations/*.sql` applied in file order from commit `f08d413` (one wrapper migration that fetched each
  file from the public repo at that SHA). The two scheduler migrations applied but schedule nothing (no worker secret).
- Preview: Vercel project `sourcerating-room-lab`, public URL + anon key of the staging project only.
- Auth: Site URL set to the preview address. E-mail confirmation is on (Supabase default mailer, low hourly limit).

## What changed in the database (202611130001)
One new table, `room_confirmations` (append-only, per organisation, bound to file version id + sha256).
Columns: `rooms.parent_room_id`, `rooms.purpose`, `room_members.last_read_seq`, `organization_memberships.display_name`,
`project_invites.target_organization_name/project_role` (and `target_organization_id` nullable).
Four CHECK lists widened (room kind, project role, invite kind, event type). 19 `sr_*` security-definer RPCs.
Every public table has RLS; `room_confirmations` is select-only for room members, writes go through `sr_record_confirmation`.

## Acceptance — REAL BACKEND, not DEMO
`apps/web/scripts/project-room-b-real-e2e.cjs`, four synthetic accounts, four browser contexts, app served locally
against staging. Result in `docs/project-room-b/real-acceptance.json`: **25 passed, 0 failed, 4 not run**.

| Journey | Result |
|---|---|
| 1 Two-way companies: A creates → invites B → B joins with own org → both chat → reload + fresh sign-in keep history → reverse | pass |
| 2 Sub rooms: chosen members only, independent history, no leak to main, deliberate summary back to main | pass (manual creation) |
| 2 AI proposes the split | **not run** – no AI key on staging |
| 3 Versions: v1 → v2 → A confirms → B confirms independently → v3 has none, v2 keeps both | pass |
| 3 Side-by-side diff, original download | **not run** – file gateway not deployed to staging |
| 4 Evidence export: raw events, 3 hashes, 2 confirmations bound to v2, organisations and users consistent | pass |
| 5 Isolation: internal room invisible; uninvited colleague cannot see sub room; removed room member loses it; removed organisation member gets `[]` for rows and an error for the storage object | pass |
| 5 AI cannot read other rooms | **not run** – AI not configured |
| 6 1440 / 768 / 390: no overflow, send, panel as column / drawer / bottom sheet, paging over 70+ real messages, back to list | pass |
| 6 Soft keyboard | simulated by shrinking the viewport only |

Also run on real Postgres with RLS (local and on staging, rolled back): `supabase/tests/room_core_generalization.test.sql`.

## Not done
- AI: summarise, open questions, contradictions, translation, sub-room suggestion. Entry points exist; server has no provider key.
- File gateway (verify + signed download) and version compare view. Uploaded versions stay `pending`.
- Message search is client-side over loaded history. Restore-as-new-version has no button yet.
- Realtime was not observed in the test run (proxy); the 12 s catch-up poll delivered messages. Needs a check on the preview.
- Storage objects of test uploads are not cleaned up. Security review covers the new RPCs only by the tests above.
- Changing member roles and revoking invitations have RPCs but no UI.

## Owner actions
- AI provider key and worker secret on the preview project (never in chat).
- Decide whether staging should keep e-mail confirmation (custom SMTP) for real pilots.
