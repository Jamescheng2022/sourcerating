# Cloud launch acceptance — 2026-10-23

## Authority and execution
User authorizes continuing existing frontend/backend work entirely in cloud; user handles payments and account authorization. Never access their local computer, Paseo or local disks. Preserve existing production/payment/credential restrictions. No production deployment or real charge in this setup stage. Work on this isolated branch, retain original history, inspect repository instructions and existing plans before changes, coordinate one writer per project. Do not replace working code with a new scaffold.

## Current gate
Codex Tasks list_environments returned an empty list on 2026-10-23. No durable task has started and no test has been rerun in this session. Create and publish a separate Codex Cloud environment for this repository through the product UI. Then run setup and implementation here. Read secrets from the approved vault; never commit secrets. Dependency downloads and required test services need authorized network access.

## Definition of launch-ready
Build, type checks and relevant automated tests pass on the exact release commit. Demonstrate the real end-to-end user scenario on an isolated preview. Verify two-account isolation, failed requests, refresh/relogin, mobile layout, data export/deletion, backup and restore, error visibility and rollback. Mark every criterion PASS / FAIL / BLOCKED with evidence; historical reports and mocks do not establish current readiness. Provide release commit, preview URL, test report, remaining account authorizations and explicit service prices before any purchase. Prepare deployment and reversible migrations, then respect existing production release gates.

## SourceRating App
Base: l1/stage2-continuation, not main and not sourcerating-website.
Product: AI-native conversational workspace for procurement and engineering; retain natural conversation as primary interaction.
Scenario: user signs in, creates a project, invites a second member, chats and uploads evidence; AI proposes a business action with source references; user confirms; action and audit history persist; project evidence exports successfully. Another account cannot access the project or its files, and removed members lose access.
Acceptance: real auth/session recovery; server-persisted messages and attachments; enforced project/tenant permissions; usable pending-action confirm/reject flow; source-linked AI output with failure fallback; confirmation before business side effects; accurate export and auditable history. No simulated success presented as live completion.
First execution: inspect actual tree and repository instructions, locate app root and package manager, read existing stage2 plans/migrations/runtime/tests, run baseline tests, then fix highest-priority missing vertical slice. Branch existence verified; root README.md and package.json fetches returned 404, so app directory and runtime remain unverified. Do not infer missing backend from those root lookups.
