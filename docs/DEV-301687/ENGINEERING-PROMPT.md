# ENGINEERING-PROMPT.md — DEV-301687 Super Agent 1.0

> Paste this as your first message in Cursor when you start implementation. It's a focused kickoff — the full spec lives in the Jira epic `description` field. This file is the entry ramp, not the source of truth.

## Mission

Ship Super Agent 1.0: a unified Communications inbox surface that turns ELI+ AI handoffs into a first-class conversational primitive. v1 is intentionally additive — no destructive changes to existing Communications behavior. The full spec is in the DEV-301687 `description` field; read that first, then come back here for the build order.

## Read first (in this order)

1. The Jira `description` field on DEV-301687 — full functional + technical spec.
2. `docs/DEV-301687/fe-doc.md` — non-engineer-facing description (you'll need this to write release notes and to QA the feature against PMM's expectations).
3. `lib/conversations-context.tsx` in this repo — current data shape, label activity discriminator, demo-thread seeds. The repo prototype is the authoritative design reference for v1 visual + interaction behavior.
4. `app/conversations/page.tsx` — Resolve picker, AI Summary panel, AI Activation popover branch, inbox-visibility predicate (`conversationMatchesAllThreadsInbox`). This file is large; jump via the section markers `// SA1 Resolve escalation picker modal` and `// Escalation context summary panel for Super Agent 1.0`.

## Architecture decisions (and why)

- **Add `conversation.source` enum (`super_agent_v1`, `super_agent_v2`, `manual`, `voice_ai`, ...).** Why: We need a denormalized source signal on the conversation row to make the inbox predicate cheap (no label-shape regex in the query plan) and to make rollback safe (toggling the flag changes future writes only — existing rows are still readable). Adding a column rather than overloading `labels` keeps the read path predictable.
- **Widen `label_activity.action` from `"added"` to `("added" | "context_provided" | "resolved_escalation")`.** Why: Resolution is a first-class event we need to surface in the timeline AND query against for analytics. Reusing the existing `label_activity` row shape avoids a parallel "resolution events" table that would have to be joined in the timeline renderer.
- **AI Summary content lives in `conversation_escalation_summaries`, written by the originating ELI+ AI product at handoff time.** Why: Each AI product owns its own summarization. The Communications service stays dumb. Avoids creating a "communications knows about renewals" coupling.
- **Per-conversation `ai_active` flag is separate from company/property AI activation policy.** Why: Staff need a precise per-thread override that does not bleed into company policy. Modeling these as separate fields is cleaner than overloading the company setting with a conversation-scoped exception table.
- **Idempotency on `POST /escalations` is required.** Why: AI products will retry on network failure. Without an idempotency key we get duplicate labels and duplicate timeline entries on every retry.
- **Inbox visibility predicate gains an OR branch keyed on `source`, not on label shape.** Why: Label-shape predicates (`labels @> ARRAY['... Escalation']`) are slower and don't roll back cleanly. Source-keyed predicates flip off cleanly when the flag is off.

## Implementation order

Build in this order. Each step is independently shippable behind the flag.

1. **DB migrations** — add `conversation.source`, `conversation.ai_active`, widen `label_activity.action` enum, create `conversation_escalation_summaries`. Behind the flag for now (no readers yet).
2. **`POST /v1/conversations/{id}/escalations` endpoint** — write path with idempotency key. Server-side flag check: if `oxp_super_agent_1 = false` for company, the endpoint still works (so AI products can call it safely) but sets `source` to the pre-Super-Agent default.
3. **`POST /v1/conversations/{id}/escalations/resolve` endpoint** — write path with optimistic concurrency on label state.
4. **`POST /v1/conversations/{id}/ai-activation` endpoint** — write path for per-conversation AI activation override.
5. **`GET /v1/conversations/{id}` envelope additions** — `escalation_summaries`, `ai_active`, `source` fields. Backward-compatible additive.
6. **Inbox predicate update** — add the OR branch keyed on `source = "super_agent_v1" AND any escalation label`. Behind the flag at the controller level.
7. **Front-end label_activity discriminator widening** — extend `EntrataMessage.labelActivity.action` to include the new values. Timeline renderer handles `resolved_escalation` with the green band.
8. **Front-end Resolve picker dialog** — Radix Dialog + selection state + POST + state reconciliation.
9. **Front-end AI Summary panel** — opens from header button; reads `escalation_summaries` from the conversation envelope.
10. **Front-end AI Activation popover branch** — simplified Switch + Phone/Email opt-ins + toast.
11. **Front-end inbox visibility wiring** — `conversationMatchesAllThreadsInbox`-equivalent predicate in the production code (the prototype implementation is the literal reference).
12. **Demo-control toggle removal / replacement with the real flag in production.**
13. **Amplitude instrumentation** — wire every event in § 8 of the spec.

## Key file paths (production codebase analogs)

| Concern | Likely file (verify in production codebase) |
|---|---|
| Conversation entity shape | wherever `Conversation` / `ConversationItem` is defined today in the Communications service |
| Inbox predicate | wherever `is_open_inbox(c)` / "All Threads" filter lives |
| Resolve / reopen endpoints | existing `/conversations/{id}/resolve` controller |
| Label-write path | existing `/conversations/{id}/labels` controller (extend to support `added` vs `resolved_escalation` discriminator on the activity row) |
| ELI+ AI product handoff write | each AI product's escalation-emit code path (Renewals AI, Payments AI, etc.) |

## Definition of Done

- [ ] All DB migrations applied to staging and verified rollback-safe.
- [ ] All five API endpoints (`POST /escalations`, `POST /escalations/resolve`, `POST /ai-activation`, updated `GET /conversations/{id}`, updated inbox-list endpoint) shipped and contract-tested.
- [ ] Front-end Resolve picker, AI Summary panel, simplified AI Activation popover, inbox visibility predicate, and all timeline renderers shipped.
- [ ] At least one ELI+ AI product (Renewals AI as design partner) is calling `POST /escalations` in staging end-to-end.
- [ ] All Amplitude events from § 8 of the spec are firing in staging and visible in the Amplitude `super_agent_v1` workspace.
- [ ] SDET test cases from § 7 pass in CI.
- [ ] Flag toggle ON/OFF tested for both the AI write path and the staff resolve path; rollback procedure executed cleanly in staging.
- [ ] Accessibility checks pass: tab order, ARIA roles on Resolve picker and AI Activation popover, color contrast on new emerald/orange palette tokens.
- [ ] Performance: inbox-list query plan reviewed; no regression vs. pre-Super-Agent baseline.

## Constraints and gotchas

- **Do NOT introduce a second "AI escalation" inbox tab.** SA 1.0 ships into the existing "All Threads" inbox with the visibility predicate doing the work. A new tab is explicitly out of scope and would create a second source of truth.
- **Do NOT add new entries to `AI_LABEL_COMPANIONS`.** Companion-pairing is reserved for label vocabularies that strictly co-occur (e.g., `Maintenance AI` ↔ `Work Order`). Per-product Escalation labels are managed by the resolve path, not companion-pairing.
- **Do NOT modify the company-level / property-level AI activation policy from the per-conversation toggle.** Those are independent. The per-conversation `ai_active` is a thread-scoped override only.
- **Do NOT pre-disable Resolve based on label state alone.** The button is disabled only when `selections.size === 0`. Server returns 409 if a label was already resolved by another actor between picker-open and submit; client reconciles.
- **Do NOT auto-resolve a conversation when staff sends a message.** Conversation resolves only via the explicit resolve picker. This is intentional — see the FE Doc rationale for partial resolve.
- **Do NOT silently swallow `super_agent_summary_missing`.** Surface the placeholder card AND fire Amplitude so we can monitor AI products that aren't generating summaries.

## Patterns to follow (from the prototype)

- The Resolve picker UI uses Radix `<Dialog>` + shadcn `<Button>` + `<Check />` icons. Follow the same component composition.
- The AI Summary panel uses a collapsible affordance (gradient blue header + body); see `app/conversations/page.tsx` for the gradient class composition.
- The simplified AI Activation popover is a branched render inside the existing AI activation `<Popover>` — DO NOT introduce a second popover. Branch on `source = "super_agent_v1"`.
- Sonner toasts are mounted globally via `components/ui/sonner.tsx` + `<Toaster />` in `app/layout.tsx`. Use `toast.success(...)` for confirmations; no new toast component needed.
- The `label_activity` discriminator widening is the established pattern for adding new activity row variants — see prior PR widening it from `"added"` to include `"context_provided"`.

## Open questions to confirm with PM before code

- Confirm the exact set of ELI+ AI product slugs the v1 endpoint should accept (`renewals_ai`, `payments_ai`, `leasing_ai`, `maintenance_ai`, `other`?). Out-of-scope products that try to write an escalation should get 400.
- Confirm whether `escalation_summaries.long` is required or optional in v1. The spec models it as optional with a graceful fall-back; double-check that's the chosen behavior.
- Confirm the Phase 3 default-ON criteria (≥40% Phase 2 adoption + 0 rollback events) with the PM before flipping the default.

## Out of scope (for the avoidance of doubt)

See § "NOT Included" in the FE Doc (`docs/DEV-301687/fe-doc.md`). Do not build any of those v1.

---
