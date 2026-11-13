# SourceRating — Chat-First PDR v3.1 · Claude Review Entry Point

**Date:** 2026-11-13  
**Status:** Documentation-only review branch; not product approval, production release, or merge authorization.  
**Owner thesis:** Chat is the product. Cross-company work is the context. AI is the assistant. Evidence is the asset.

> **Owner scope clarification, 2026-11-13:** This is a universal chat-native B2B collaboration infrastructure — not just merchandise sourcing. The same low-friction Room must support customized goods, engineering testing, design/review services (including cross-border professionals), technical consulting, logistics and delivery coordination. Business workflows and organization capability profiles emerge from evidence-backed conversations and actual authorized project work; no compulsory platform supplier rating.

## Read in this order

1. [Master PDR v3.1](./SourceRating_Master_PDR_v3.1_Chat_First_Claude_Review_2026-11-13.md) — complete product constitution, buyer/supplier and client/provider flywheels, product/service/logistics workflows, evidence-backed organization profiles, the chat-first experience and integration boundaries.
2. [Independent Claude Audit Handoff](./Claude_SourceRating_v3.1_Independent_Review_Handoff_2026-11-13.md) — required code review, critical objections, architecture alternatives, acceptance and review deliverables.
3. [Existing Project Room Audit](./SourceRating_ProjectRoom_Audit_2026-11-13.md) — observed code and implementation gaps; verify independently.
4. [B2B Competitor Study](./SourceRating_B2B_Commerce_Competitor_Study_2026-11-13.md) — background only; do not let broad ERP/marketplace patterns override the chat-native thesis.

## Code the reviewer must inspect

**SourceRating:** [repository](https://github.com/Jamescheng2022/sourcerating)
- `main` — baseline website; Project Room draft is not merged here.
- [PR #1 — P1 Project Room](https://github.com/Jamescheng2022/sourcerating/pull/1): `feat/project-room-p1`
- [PR #3 — Real AI pilot](https://github.com/Jamescheng2022/sourcerating/pull/3): `pilot/real-ai-acceptance-20261028`, currently a draft based on `codex/cloud-launch-20261023` rather than `main`.
- Key paths on the pilot branch: `apps/web/src/app/project-room/page.tsx`, `apps/web/src/app/project-room/workspace-nav.tsx`, `apps/web/src/app/project-room/project-state-panel.tsx`, `apps/web/src/lib/room-files.ts`, `apps/web/src/lib/ai/runtime.ts`, `supabase/migrations/`, `docs/GCP_REAL_AI_PILOT_20261030.md`.

**Related projects:**
- [weprefab-world](https://github.com/Jamescheng2022/weprefab-world) — legacy/product engineering work, do not merge storage or databases by default.
- [weprefab-design-to-reality](https://github.com/Jamescheng2022/weprefab-design-to-reality) — **private** independent frontend prototype; access is required. Its price/supplier/compliance data is demonstrative.

## Review rules

- Inspect actual GitHub code and test receipts; do not infer production readiness from draft PRs.
- Compare at least three viable architecture approaches; retain audited working code where reasonable.
- Prioritize chat responsiveness, zero-learning UI, org-to-org permissions, reciprocal buyer/supplier/client/provider onboarding, service deliverables (not RFQ-only), file/message Ask AI, evidence-backed profiles without mandatory ratings, memory and AI non-blocking operation.
- Integrate mature external software through API, SDK, Webhooks, MCP or external deep links; do not rebuild full CAD, Zoom or Office.
- Reviewer is **read-only** by default. No merge, production changes, external invitations, or paid calls without explicit owner authorization.

## Repository upload note

The authoritative source and handoff documents are committed here as readable Markdown. Original Word/PDF/ZIP formats are maintained separately in the originating ChatGPT deliverables; the GitHub connector used for this commit supports text creation but not direct transfer of existing local binary attachments. This does not affect reviewing the complete design text and code.
