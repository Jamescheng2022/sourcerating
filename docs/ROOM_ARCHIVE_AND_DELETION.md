# Room archive and deletion continuation

This extends the existing room-evidence index, not the retired supplier-rating prototype. The authorized scope remains project conversations, evidence and auditable human-confirmed actions. No production project, storage object, account or payment was changed.

## Complete room archive API

`POST /api/project-room/archive` accepts a caller Bearer session and `{roomId}`. The server validates Auth, obtains the existing `export_room_evidence` snapshot through **caller RLS**, and includes every file version in that snapshot or fails the whole request. Every file must first pass the existing authenticated `room-file-gateway` sign action with `verificationStatus=verified`. There is no direct-storage fallback around that gateway or its network/authorization policy.

The gateway URL must point to the configured Supabase backend and exact object path. Redirects, unexpected origins/credentials/paths, missing versions, size/hash mismatches and unavailable services prevent an archive. Signed download URLs and credentials are consumed in memory and are not added to the archive. A final caller-scoped room read checks access again after downloading, so a member removed mid-export cannot receive the completed artifact.

The response schema `sourcerating-room-archive-v1` contains the original evidence index and base64 file contents keyed by immutable file-version IDs, with byte sizes and SHA-256 values. It includes all versions visible in **one room snapshot**, not other rooms, previously deleted content or an automatic database restore. Base64 decoding with the declared hashes reconstructs those bytes; this is JSON, not an automatically extracted ZIP with attacker-controlled filenames. Integrity/byte verification does not establish document authenticity or malware safety.

For the existing preview response-size constraints, a request supports at most 50 versions, 512 KiB metadata, 2 MiB aggregate file bytes and a 4 MiB JSON response. Oversized rooms explicitly fail with 413; they are never silently truncated or returned as `complete:true`. Large-room streaming/object-store archives, project-wide aggregation and restore tooling remain unimplemented. The existing UI still labels its index download accurately; this continuation adds the server archive API without advertising an unverified full-file UI workflow.

## Verification boundaries

Synthetic isolation tests cover round-trip bytes, duplicate/cross-room identities, missing collections, hash/length mismatches, failed gateways, revocation during download, quotas, signed-URL origin/path constraints, stream cancellation and authorization failure. These tests do not count as live gateway readiness.

The local HTTP acceptance mode `archive` creates a new synthetic empty room through the original buyer RPC. It checks unauthenticated denial, owner success/private caching, unrelated supplier denial, removed-member denial and bounded/invalid requests. This intentionally makes **no** Edge Function call. A complete archive with real registered file bytes remains BLOCKED by the historical Edge Runtime backend access restriction until the existing network draft is applied and verified. This turn only read the network draft/status and did not retry that denial or modify the draft.

## Deletion design: no premature hard-delete API

Account erasure and deleting a shared project are different authorities. A client role, a successful export, or removal from a room is not permission to delete another organization's evidence. Reuse active organization/room memberships and database-derived ownership; never authorize by UI state or a service key supplied by the client.

A future destructive operation needs an explicitly confirmed scope, current ownership and revision, and an auditable request that becomes “deleted” only after both object storage and database state are verified. Postgres and object storage cannot be deleted atomically: use an idempotent durable operation journal with retry/reconciliation before exposing completion. Recheck authority when executing, reject stale confirmations and concurrent writers, preserve tenant isolation, and test crash/retry at each boundary. Removal must immediately revoke access; it must not silently erase shared business history.

Retention/legal holds, shared-message attribution, backup erasure propagation and which owner may delete a collaborative project remain unresolved launch-policy inputs. Do not invent a retention interval or implement irreversible cascades around those decisions. No deletion RPC, production purge or misleading “deleted” success was introduced. This document records the boundary so archive readiness cannot be mistaken for approval to erase data.

Committed current evidence: `evidence/cloud-20261023-archive/`. Historical reports and isolated fixtures remain distinct from new live-provider acceptance.
