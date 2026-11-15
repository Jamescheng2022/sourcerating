# Local room lineage tests

Windows x64, Node.js, npm and a local-only port 55439 are required. From the
repository root, install the disposable runtime without changing product
package files, then run:

    npm install --prefix .localdb --no-save --no-package-lock embedded-postgres@17.11.0-beta.19
    node supabase/tests/room_lineage_local_runner.mjs

The runner starts PostgreSQL 17 on 127.0.0.1, creates a new isolated cluster and
synthetic database under the ignored .localdb directory, and always stops the
server. It executes every repository migration through 202611130001, verifies
that the actual fix migration rejects and rolls back a pre-existing fork, then
applies it on the clean database and runs the room SQL suite. Finally it starts
two independent authenticated connections, requires PostgreSQL to report a
lock wait, and checks v1-v2-v3 links and confirmations.

The shim is test-only. Auth claim functions and storage tables are minimal,
pg_net and pg_cron are stub extensions and HTTP is disabled, and there is no
Supabase API, real Storage service or Realtime worker. The test demonstrates
PostgreSQL migration, RPC, locking and RLS behavior under this fixture; it does
not replace acceptance on a real Supabase environment. Failed runs leave their
isolated cluster directories in .localdb for inspection. No hosted connection
is made by this runner.

The concurrency test can also run separately against a fully migrated,
disposable local database named sr_lineage_test_* using Node's pg package.
Set SR_LINEAGE_NODE_MODULES to its node_modules directory and set
SR_LINEAGE_TEST_DATABASE_URL to a postgresql URL with host 127.0.0.1 and the
local postgres role. The script commits synthetic fixture data, so do not use a
shared database. URLs with non-loopback hosts, query parameters, or other
database names are rejected.

For the review-button DOM regression, install a temporary test-only dependency
and run the real FileCard component test:

    npm install --prefix .localdb/ui --no-save --no-package-lock jsdom@26.1.0
    cd apps/web
    node scripts/project-room-review-button.test.cjs

The PostgreSQL runner also applies 202611150002 and checks repeated and
concurrent same-key review requests, task counts, and retries after resolution.
