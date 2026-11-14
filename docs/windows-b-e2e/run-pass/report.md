# SourceRating Windows B E2E — PASS

Run 20261114T040604 · target http://localhost:3100 · commit 3c8584fc4bd82c33204072cb3e067d52fe68429c

All required checks and oracle checks passed.

Coverage: 97% of required UI+oracle checks plus the 2 declared gaps (100% of the executable ones). UI 37/37, oracle 29/29, requirements 11/11.

| Req | Title | Result |
|---|---|---|
| R1 | Two companies invite each other in both directions; colleagues join their own organisation | PASS |
| R2 | Multi-person real chat: delivery, reload persistence, fresh sign-in, paging | PASS |
| R3 | Sub rooms, internal rooms and deliberate sharing back | PASS |
| R4 | File upload, versions, hash verification, compare, restore | PASS |
| R5 | Per-organisation approval bound to one file version and hash | PASS |
| R6 | AI analysis is private to the asker, sourced, never auto-published (stub model) | PASS |
| R7 | Permission isolation with 2 organisations and 4 accounts; removal takes effect | PASS |
| R8 | Evidence export matches stored messages, hashes, organisations and people | PASS |
| R9 | Mobile 390 / 768 / 1440 layouts | PASS |
| R10 | Network loss and recovery: unsent message kept, resent once, catch-up, order preserved | PASS |
| R11 | Scope integrity of the synthetic tenant | PASS |

## Not run (declared gaps)
- AI with the real model (answer quality, latency): the workspace cannot reach the preview site or the model provider; only the stubbed-model path was exercised
- T6 soft keyboard on a physical phone: only simulated by shrinking the viewport

Blocked requests: 0 (forbidden hosts: 0)
