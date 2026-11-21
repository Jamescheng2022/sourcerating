# SourceRating branch-binding candidate — offline only

Five isolated test groups passed against the actual current Next relay source and its one-literal candidate. [Proposal](../../docs/proposals/INVITE_RELAY_BRANCH_20261024.md), [raw results](isolated-tests.txt), [commands/status](run.json), [inputs](input-hashes.json).

The current application still binds `l1/stage2-continuation`; the `codex/cloud-launch-20261023` patch is **not applied**. `git apply --check` confirms it can apply cleanly. Exact project/Preview/branch/Host/Origin restrictions, HMAC validation and `enable_signup=false` are preserved. Synthetic Vercel-named fields are ordinary function arguments in isolated VM contexts; no runtime/platform environment variable was changed. Random signing values stay in process memory and are never configured or printed.

No HTTP request, Edge Function invocation, nonce RPC, email, backend restoration or hosted configuration change occurred. Protocol tests do not establish nonce RPC behavior or working invitations. Stage2 remains INACTIVE with no approved available Free slot; p1 and LUSHUPAI were untouched. Kong remains unapplied. Missing public Supabase build settings, actual Preview binding/access and real-user acceptance remain external gates. This commit is a review proposal/test/evidence change, not an application guard change or public deployment.
