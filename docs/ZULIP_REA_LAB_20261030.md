# SourceRating × Zulip × REA isolated evaluation — 2026-10-30

## Outcome and scope

A separate, real Zulip 12.3 instance is running at:
https://clear-nec-serves-are.trycloudflare.com

This is a synthetic integration sample, not a replacement of the existing SourceRating app or an approved production architecture migration. Three test humans (buyer, supplier A, supplier B) and one bot use three private channels. Test passwords are delivered privately to the owner; this repository contains no credentials.

The mature Zulip client handles chat, navigation, message search and native account controls. A small adapter forwards authorized synthetic messages to the existing SourceRating room/event API, reuses its scoped DeepSeek worker and human-review RPC, and returns draft/decision notices to the original Zulip topic.

## REA was actually used

The owner's intended tool was [REA — Reverse Engineer Anything](https://github.com/morluto/rea), not GitNexus. Official npm package `rea-agents@6.8.0` (MIT) was installed in a separate analysis-tools directory, with Node 22.23.4. Static CLI analysis was executed; no global Agent configuration, paid native decompiler or additional MCP connection was installed.

Target: official Zulip release 12.3, commit `b31982251ff82d0b02e59f63ad21f19204e37aea`.

Selected sources:
- `web/src/stream_list.ts`
- `web/src/sidebar_ui.ts`
- `web/src/left_sidebar_navigation_area.ts`
- `web/src/buddy_list.ts`
- `web/src/compose.ts`
- `web/src/message_store.ts`
- `web/src/stream_data.ts`

Actual result: 7 parsed files, 238367 source bytes read, 22054 visited AST nodes, 618 findings, zero parse failures. The complete local evidence bundle is 32231586 bytes; its digest and tool coverage are in `tools/zulip-lab/rea-evidence-receipt.json`.

**Coverage is partial:** 658 inventoried files were outside selection, and semantic analysis reached the configured 12000-node budget. This is not a complete reconstruction of Zulip. DeepWiki's public source map (indexed March 2026) was used for navigation only; release-specific code and live tests were the authority for the actual findings.

## Feature → implementation → reuse decision

| Feature | Exact upstream area checked | Result |
| --- | --- | --- |
| Sidebar folding, navigation state, unread counts | selected sidebar/stream files above | Reuse the existing client instead of rebuilding this logic |
| Message composition and storage | selected compose/message_store files, upstream browser-test selectors | Reuse native compose and message delivery |
| Right sidebar | `buddy_list.ts`, `web/templates/right_sidebar.hbs` | Primarily people/presence; a procurement AI sidebar is still custom work |
| Channel/message authorization | `zerver/lib/streams.py:access_stream_common`, `zerver/lib/message.py:access_message` | Keep native private-channel/guest checks and verify API access, not just hidden UI |
| AI summaries | `zerver/actions/message_summary.py:do_summarize_narrow`, `zerver/views/message_summary.py` | Native user-requested summaries can call DeepSeek; they are not the continuous procurement workflow |
| Continuous extraction and approval | existing SourceRating worker and `review_staging_proposal` | Reuse the existing implementation through an adapter |
| Both companies confirming an identical version | neither sample has implemented this | Remains a separate product requirement |

The native summary code reads at most 100 messages and explicitly notes that rolling summaries/cache invalidation are not implemented. The beta summary endpoint is intentionally undocumented upstream; the procurement adapter does not depend on that endpoint.

## Runtime and boundaries

- Official Docker configuration source: `zulip/docker-zulip@916aeb2348c9648ad2271225f54560ae4c31b655`.
- Official app image: `ghcr.io/zulip/zulip-server:12.3-0`. All five running app/dependency images are pinned to observed repository digests in private deployment configuration.
- Separate Compose project, network, Postgres, Redis, RabbitMQ, memcached and volumes. Only loopback port 18080 is published.
- Separate unprivileged Quick Tunnel process. SMTP uses the dummy backend, public realm creation is disabled, and test realm invitations are required.
- Suppliers are guests in distinct private channels. Guest directory visibility is restricted; shared bots are authorized observers, not independent companies.
- The existing SourceRating backend received a NEW synthetic project, three companies, three accounts and three rooms in the 53000000 UUID namespace. Existing room memberships were not changed.
- The existing worker/app allowlist retains its original live pilot room and adds only these three new synthetic rooms. Before-change private env snapshots are retained for rollback.
- The bridge authenticates to SourceRating as the actual mapped test sender and lets existing RLS/RPC checks authorize writes. It does not use service-role credentials at runtime.
- At processing time it rechecks the native actor and current native channel subscription. Runtime identity mapping is fixed to the three test accounts; complete production SSO, lifecycle synchronization and distributed authorization races remain unimplemented.
- A deterministic UUID derived from native origin/message ID is used as `client_msg_id`; source-event correlation, checkpoint and notification IDs are persisted in owner-only SQLite.
- Drafts return to the original private channel/topic with a link to the original native message. The assigned user replies `approve <proposal UUID>` or `dismiss <proposal UUID>`.
- Repeat approvals use the existing idempotent RPC and return an already-processed notice; they do not attribute another person's original approval to the repeat requester.
- Standard message editing is disabled in the synthetic realm. This is not a claim of immutable/legal-grade evidence; administrator deletion, edit/history reconciliation and formal bilateral version acceptance need further design.

## Acceptance actually completed

| Test group | Passed | What was checked |
| --- | ---: | --- |
| Native app/API | 13 | Three authenticated accounts; each supplier's channel scope; inaccessible other-supplier channel queries and exact message IDs; hidden other-supplier identity; persisted native message; real native DeepSeek summary |
| Existing backend integration | 8 | Sender-bound event mirror; exact-source real DeepSeek proposal; native draft notification; other-supplier and wrong-company approvals denied; buyer approval; duplicate idempotency; fresh login/source readback |
| Public-HTTPS browser | 6 | Two password logins; hidden unauthorized navigation; native compose/peer receipt; full reload persistence; 390px layout without horizontal overflow; no unhandled browser exceptions |

Native API narrows for an inaccessible private channel may return HTTP 200 with an empty message list; exact message-ID access was also tested and denied. An empty query alone was not treated as proof of isolation.

The final adapter pass was rerun after current-native-subscription and idempotent-notice handling were added. The server model key is not shipped in the test-account file or browser.

GCP receipts: `native-acceptance.json`, `bridge-acceptance.json`, `qa-output/browser-acceptance.json`, REA evidence/summary/doctor output, image digests and QA screenshots. These are synthetic tests, not external customer acceptance or physical Android/iPhone testing.

Two owner-only PostgreSQL custom-format dumps and an atomic SQLite backup were made. Both database archive indexes parsed and SQLite integrity passed. A full restore drill was not run.

## What the sample does not yet provide

- No custom right-hand procurement AI panel in the native client; approvals currently use bot notices and commands.
- No shared single-sign-on or production user provisioning between the two systems.
- No bilateral signatures/identical-version confirmation, purchase-order lifecycle or supplier marketplace.
- Native attachment/engineering-version migration and file-to-analysis ingestion were not accepted in this sample.
- Mobile push is not configured. Physical phone keyboard/touch and push delivery remain untested.
- Quick Tunnel and bridge processes are trial processes, not a boot-persistent production ingress/service deployment.
- Notifications are at-least-once around process/network failures; business decision uniqueness is enforced by the existing backend.
- No commercial traffic, production data migration, subscription purchase, production deployment or merge was performed.

## Engineering conclusion

The integration sample demonstrates that mature chat can carry the existing procurement worker and approval rules. It does NOT demonstrate that adopting Zulip immediately is cheaper overall: custom AI sidebar/mobile experience, identity/permission lifecycle, attachment/source reconciliation and upgrades still need evaluation.

Keep both samples available for the owner to compare. Stop adding generic chat features to the original client while this choice is being evaluated. Reuse the existing procurement backend; any major architecture switch or real-data migration still requires a concrete owner decision.

Current VM lab directory: `~/sourcerating-zulip-lab/`. Operation-specific prototype scripts are preserved in `tools/zulip-lab/`. They are for this synthetic lab, not a production installer. Runtime private config, API keys, passwords, provider secrets, databases and upstream checkouts must stay outside git.

For rollback, stop only the sr-zulip-lab Compose project and its exact bridge/tunnel processes; keep volumes/backups. The private before-Zulip worker/app env snapshots can restore the original allowlist without deleting synthetic data. Do not pause or repoint any managed Supabase or other business project.
