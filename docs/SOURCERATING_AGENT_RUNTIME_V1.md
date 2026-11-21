# SourceRating Agent Runtime v1

## Purpose

SourceRating needs a durable operations/coordination agent layer, but it must not sit in the synchronous chat delivery path.

The chat path remains:

User -> Supabase Auth/RLS -> append_room_event -> Postgres -> Realtime notification.

The agent path consumes persisted events asynchronously:

room_events / event_outbox -> durable agent runtime -> AI provider adapters -> staging proposal / alert / maintenance action -> human review -> canonical state.

## Runtime choice

Use Trigger.dev as the initial durable agent runtime for P1.5/P2 because it supports:

- long-running jobs without serverless timeouts;
- retries, queues, concurrency keys and idempotency;
- schedules and waitpoints;
- human-in-the-loop pauses;
- realtime progress/streaming;
- self-hosting later if compliance or cost requires it.

The runtime must be a separate service/package from apps/web. A Trigger.dev outage must never prevent users from sending or reading chat messages.

## Agent roles

### 1. Room Event Agent

Triggered by a pending room event/outbox item.

Responsibilities:
- classify the message/event;
- call JEV when configured;
- call the configured generator provider when deeper extraction is required;
- create staging proposals only;
- record provider/model/latency/error metadata;
- never write canonical commercial state.

### 2. Project Watchdog

Scheduled every 15-60 minutes.

Responsibilities:
- find stale pending actions;
- identify unanswered questions;
- identify documents/promises past due;
- create Needs You items or notifications;
- never send external messages automatically without an explicit project policy.

### 3. Document Agent

Triggered after a file is accepted.

Responsibilities:
- parse/OCR/extract metadata;
- classify document type;
- link versions/supersession;
- extract evidence references;
- prepare quote/spec/report staging proposals.

### 4. Memory/Compaction Agent

Scheduled or threshold-triggered.

Responsibilities:
- maintain ContextProjection;
- compact old conversation into evidence-linked project memory;
- preserve unresolved questions, approvals, current quote/spec, deadlines and risks;
- never mix data across RLS/organization boundaries.

### 5. Ops Health Agent

Scheduled hourly/daily.

Responsibilities:
- provider health and latency checks;
- failed outbox/run retry inspection;
- unusual error-rate alerts;
- model spend/budget alerts;
- stale webhook/realtime health checks;
- storage/database growth checks.

## AI provider policy

### System-1

Order:
1. JEV direct API when configured.
2. Deterministic rules fallback.

JEV must be optional. A missing/free/rate-limited JEV key cannot block SourceRating.

### Generator

Configurable provider abstraction.

Pilot preference:
1. OpenCode Go + DeepSeek V4.1 Flash when `SOURCERATING_OPENCODE_GO_API_KEY` is configured.
2. Direct DeepSeek API fallback when `SOURCERATING_DEEPSEEK_API_KEY` is configured.
3. Graceful degradation to human-only chat when neither is available.

Current switch:
`SOURCERATING_LLM_PROVIDER=auto|opencode-go|deepseek-direct`

Do not make Hermes, Bangkok Terminal, Codex, Claude Code, or any personal developer subscription part of the SourceRating production request path.

## Secret boundary

Runtime-only secrets:
- SOURCERATING_OPENCODE_GO_API_KEY
- SOURCERATING_DEEPSEEK_API_KEY
- SOURCERATING_JEV_API_KEY
- TRIGGER_SECRET_KEY / TRIGGER_PROJECT_REF
- Supabase service credentials needed by the agent worker

Never expose these through NEXT_PUBLIC_*, browser bundles, logs, room events, issue comments or chat transcripts.

## Human-in-the-loop rule

AI may create:
- staging proposals;
- suggested pending actions;
- document classifications;
- risk flags;
- summaries/translations.

AI may not silently commit:
- price;
- contractual scope;
- delivery dates;
- payment terms;
- acceptance/approval;
- compliance certification outcomes;
- cross-company permissions.

## Deployment phases

P1:
- live chat/RLS/realtime/offline retry;
- direct provider abstraction;
- agent runtime remains disabled.

P1.5:
- connect Trigger.dev in Preview only;
- Room Event Agent + Ops Health Agent;
- synthetic/demo events only;
- acceptance evidence before real-user enablement.

P2:
- Document Agent;
- file/version/evidence chain;
- real staging proposals and Needs You.

P3:
- Project Watchdog + Memory/Compaction Agent;
- organization memory and provider analytics.

## Acceptance

The agent layer is accepted only when:
- disabling the agent runtime leaves chat fully usable;
- duplicate outbox events do not create duplicate staging;
- every staging fact links back to source evidence;
- cross-room and cross-organization negative tests pass;
- provider failure degrades gracefully;
- retries are observable;
- per-provider cost/latency/error metrics exist;
- production canonical state still requires authorized human commit.
