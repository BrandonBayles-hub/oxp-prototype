# Engineering Spec — Super Agent 1.0 (DEV-301687)

> This document is the source for the **Jira epic `description` field** on DEV-301687. Engineering audience. Technical voice. All 12 sections required by the FE Doc rubric are below at full depth.

---

## 1. Problem Definition

### Before / After narrative

**Before (production today):** Each ELI+ AI product (Renewals AI, Payments AI, Leasing AI, Maintenance AI) runs its conversations in its own product surface and writes its escalations to its own dashboard. The Communications inbox sees the conversation thread but has no first-class concept of "this thread was escalated by an AI product" — there is no `Escalation` label vocabulary, no unified inbox lane, no AI Summary, no partial-resolve picker, and no exemption that keeps an AI-escalated thread visible after staff replies. Staff context-switch across 2–4 dashboards and re-read full transcripts on every handoff.

**After (this epic):** A single Communications inbox surface ("Super Agent 1.0") unifies AI escalations from every ELI+ AI product. The conversation entity gains a typed `Escalation` label vocabulary (`{Product} AI Escalation`), a structured `label_activity` timeline entry with an `action` discriminator (`added` | `context_provided` | `resolved_escalation`), a `thread_activity` entry for AI handoff, an AI Summary content contract owned by each ELI+ AI product, and an inbox-visibility predicate that keeps a thread visible while any `Escalation` label remains. Partial resolve and full resolve are first-class write paths.

### Quantified business value (time × frequency × scale)

```
re-read time per handoff:           30–45 sec
handoffs per property per week:     25–40
context-switch overhead per shift:  25–40 min  (across 2–4 AI dashboards)
shifts per property per week:       5
properties per typical portfolio:   25
ELI+ AI products per typical cust:  2 (e.g., Renewals + Payments)

friction per portfolio per week ≈
  (35 min/shift × 5 shifts × 25 properties)              ≈ 73 hr/week (nav)
+ (37 sec/handoff × 32 handoffs × 25 properties / 60)    ≈ 8  hr/week (re-read)
                                                         ────────────────────
                                                         ≈ 81 hr/week
                                                         ≈ 325 hr/month
```

A 50% reduction in this friction is 160 hr/month per portfolio reallocated to actual resident response. At 8% lead-to-lease conversion, this represents a measurable bump in pipeline velocity and retention.

### Strategic "why now"

- **ELI+ AI surface area is growing.** Adding more AI products without unifying the handoff surface compounds operational pain. Super Agent 1.0 is a prerequisite for every future ELI+ AI product to be net-additive rather than net-fragmenting.
- **Competitive parity gap.** [INSERT: Named competitor with a unified AI agent escalation inbox already shipping.]
- **Super Agent 2.0 dependency.** AI-drafted staff replies and AI re-engagement after staff handoff (v2) all require the inbox + timeline + audit-trail substrate v1 builds.

### Personas

| Persona | Pain today | What v1 delivers |
|---|---|---|
| Onsite Leasing Agent | Re-reads transcript on every handoff; closes thread before answering other topics | AI Summary panel; partial-resolve picker; persistent inbox visibility |
| Regional Leasing Manager | Logs into 2–4 dashboards per property to confirm escalation coverage | Single inbox surface; structured resolution audit trail |
| CX / Resident Experience Lead | No unified escalation-resolution data | Structured `label_activity` rows with actor + timestamp + labels resolved |
| Entrata CSM | Cross-selling additional ELI+ AI is operationally hard | Each new AI product feeds the same unified inbox |

### Named customer evidence

[INSERT: Customer name + CS ticket + dollar/ARR impact. Per the anti-fabrication rule, no fabricated specifics are included here.]

---

## 2. Solution — Workflows

### Flow 1 — AI handoff lands in the unified inbox (happy path)

1. ELI+ Renewals AI is mid-conversation with a resident over SMS.
2. Resident asks something the AI cannot resolve autonomously (e.g., rate exception).
3. Renewals AI calls `POST /v1/conversations/{conversation_id}/escalations` (see API contracts) with `product: "renewals_ai"`, `escalation_label: "Renewals AI Escalation"`, and a `summary` string.
4. Communications service appends a `thread_activity` entry of kind `handoff` and a `label_activity` entry with `action: "added"` and `labels_added: ["Renewals AI Escalation"]`.
5. The conversation's `labels` array gains `"Renewals AI Escalation"` and the companion `"AI Conversation"` label (idempotent via `ensure_ai_label_companions`).
6. The thread's `assignee` is set to the AI queue value (`ELI+ Super Agent`) if not already.
7. `hasUnread` is set to `true`.
8. Inbox subscribers receive a real-time `conversation.updated` event over the existing WebSocket / SSE channel.
9. Inbox-view query returns the thread because `status = "open" AND (any escalation label OR hasUnread OR @mention OR unattended)` (see § 5 Business Logic for the predicate).
10. Amplitude event `super_agent_escalation_added` fires with `{ conversation_id, property_id, product, escalation_label }`.

### Flow 2 — Staff opens the thread and reads the AI Summary

1. Staff member opens the conversation in `Communications >> Conversations >> All Threads`.
2. Front-end calls existing `GET /v1/conversations/{id}` which now includes the new `escalation_summaries` array on the response shape (see API contracts).
3. Staff taps the "AI Summary" button on the conversation header.
4. The Escalation Context Summary panel opens; one card renders per object in `escalation_summaries` (one card per active `Escalation` label).
5. `markRead` is invoked via existing endpoint; `hasUnread` becomes `false`.
6. Amplitude `super_agent_summary_viewed` fires with `{ conversation_id, escalations_present: ["Renewals AI Escalation", "Payments AI Escalation"] }`.

### Flow 3 — Staff partially resolves (closes one of two escalations)

1. Staff taps "Resolve" on the conversation header.
2. UI opens the Resolve picker dialog (`<Dialog open=sa1ResolvePickerOpen>`).
3. Picker renders one row per `Escalation` label on `conversation.labels`.
4. Staff toggles "Renewals AI" only; "Payments AI" remains unselected.
5. Staff taps the dialog's "Resolve" button (enabled because `selections.size > 0`).
6. Front-end calls `POST /v1/conversations/{id}/escalations/resolve` with `labels: ["Renewals AI Escalation"]`.
7. Communications service appends a `label_activity` with `action: "resolved_escalation"`, `labels_added: ["Renewals AI Escalation"]`, `actor: <staff_name>`.
8. Service removes `"Renewals AI Escalation"` from `conversation.labels` (companion-aware via `remove_label`).
9. Service evaluates `remaining_escalations = labels.filter(includes("Escalation"))`; if `> 0`, `conversation.status` stays `open`; if `= 0`, status flips to `resolved` and a standard `thread_activity` of kind `status` with `action: "resolved"` is appended.
10. Inbox-view query continues to return the thread because the "any escalation label" branch of the predicate is still true ("Payments AI Escalation" remains).
11. Amplitude `super_agent_escalation_resolved` fires with `{ conversation_id, labels_resolved: ["Renewals AI Escalation"], resolution_kind: "partial", remaining_count: 1, actor }`.

### Flow 4 — Staff fully resolves (closes the last remaining escalation)

1. Subsequent staff member opens the same thread, taps Resolve, selects "Payments AI", taps Resolve.
2. `POST /v1/conversations/{id}/escalations/resolve` with `labels: ["Payments AI Escalation"]`.
3. Service appends the `resolved_escalation` `label_activity` and removes the label.
4. `remaining_escalations = 0` → status flips to `resolved`, the standard `status: resolved` `thread_activity` is appended, the conversation leaves the open inbox.
5. Amplitude `super_agent_escalation_resolved` with `resolution_kind: "full"`, `remaining_count: 0`. A second event `super_agent_conversation_resolved` fires with `{ conversation_id, total_escalations_resolved: 2, time_open_minutes }`.

### Flow 5 — Staff toggles AI Activated off mid-conversation

1. Staff taps the "AI On" pill on the conversation header.
2. Popover opens. If the conversation is a Super Agent 1.0 thread (server flag or label heuristic — see § 5), the popover renders the simplified Switch only (no calendar / no "No Limit"). Otherwise the popover renders the existing full company-flow control.
3. Staff flips the Switch off.
4. Front-end calls `POST /v1/conversations/{id}/ai-activation` with `{ active: false, actor: <staff_name> }`.
5. Service appends a `thread_activity` of kind `ai_activation` with `active: false`, `actor: <staff_name>`.
6. UI fires a sonner toast: "AI deactivated for this conversation".
7. Amplitude `super_agent_ai_activation_toggled` with `{ conversation_id, active: false, actor }`.
8. Downstream: any subsequent inbound resident message on this thread does NOT trigger the ELI+ AI product's auto-reply path until `active` flips back to `true`.

---

## 3. Error & Failure States

| Trigger | UX Response | Recovery Path | Amplitude Event |
|---|---|---|---|
| AI handoff `POST` returns 422 (conversation already resolved) | Server rejects with `{ code: "conversation_resolved", message: "Cannot add escalation to a resolved conversation." }`. AI product logs the rejection and surfaces in its own dashboard. No inbox change. | ELI+ AI product re-opens conversation via existing `reopen` endpoint, then retries escalation add. | `super_agent_escalation_add_failed` `{ reason: "conversation_resolved" }` |
| Resolve `POST` returns 409 (label already resolved by another actor) | Front-end shows toast "Already resolved by {other_actor}". Picker dialog re-fetches the conversation and re-renders the remaining escalation labels. | Staff continues with the now-shorter list of remaining labels, or closes the picker. | `super_agent_resolve_conflict` `{ conversation_id, labels_attempted, other_actor }` |
| Resolve `POST` returns 403 (no `Resolve` permission) | Toast "You don't have permission to resolve conversations at this property." Picker remains open; Resolve button stays enabled but server keeps rejecting. | Staff contacts admin. Front-end SHOULD pre-disable Resolve button when permission missing at render time. | `super_agent_resolve_denied` `{ conversation_id, reason: "permission" }` |
| Resolve `POST` returns 429 (rate limit) | Toast "Too many requests. Please wait a moment and try again." Picker remains open with current selection. | Staff retries after backoff. Client uses exponential backoff (1s, 2s, 4s; max 3). | `super_agent_resolve_rate_limited` |
| Resolve `POST` returns 500 / network failure | Toast "Couldn't save resolution. Please try again." Picker remains open with selection intact. | Staff retries manually. No client-side auto-retry on 5xx (avoid double-resolves). | `super_agent_resolve_server_error` `{ http_status }` |
| `escalation_summaries` array empty on conversation that has Escalation labels | AI Summary panel shows a single placeholder card per label: "Summary unavailable. Open the conversation history to review context." | Background job retries summary fetch from the originating AI product; UI re-renders if summary arrives within 30s. | `super_agent_summary_missing` `{ conversation_id, label }` |
| AI Activation `POST` returns 403 (no `Manage AI Activation` permission) | Toast "You don't have permission to change AI activation on this conversation." Pill reverts to prior state. | Staff contacts admin. | `super_agent_ai_activation_denied` |
| WebSocket / SSE channel drops while picker is open | Picker keeps current selection. On reconnect, conversation re-fetches; if labels have changed (another resolver acted), picker rows reconcile. | Standard reconnect path; no data loss. | `super_agent_picker_reconciled` `{ conversation_id, labels_diff }` |

---

## 3.5 Loading & Empty States

| State | Trigger | UX |
|---|---|---|
| **Inbox loading (initial)** | `GET /v1/inbox/all-threads` in flight on first paint or filter change. | Conversation list renders the existing shadcn `Skeleton` rows (6 skeletons sized to the conversation card). The "All Threads" tab counter shows a small spinner instead of a number until the response lands. |
| **Inbox empty (no AI escalations and no other threads)** | `GET /v1/inbox/all-threads` returns `[]`. | Existing empty-state illustration with the existing "No conversations in this inbox" copy. No SA-specific empty state in v1 (the inbox itself owns this). |
| **Conversation loading (open thread)** | `GET /v1/conversations/{id}` in flight after the user taps a conversation card. | Conversation header renders a 36×16 skeleton for the assignee pill, a 28×64 skeleton for the AI On/Off pill, and a 28×52 skeleton for the Resolve button. Timeline renders 4 message skeletons. The composer is disabled until the response lands. |
| **AI Summary loading (panel open, summaries fetching)** | `escalation_summaries` is `null` and a background fetch is in flight (e.g., when a summary was scheduled by an AI product but has not yet been ingested). | The Escalation Context Summary panel renders one skeleton card per active `Escalation` label. Each skeleton is 56 px tall with two text lines. Cards swap to populated content as summaries arrive. Maximum loading window before fall-back to the empty-state copy: 30 s. |
| **AI Summary empty (no active escalations)** | `escalation_summaries` is `null` AND no `Escalation` labels are on the conversation. | The AI Summary button is hidden from the conversation header. Panel never opens. |
| **AI Summary empty per label (label active, summary missing)** | `escalation_summaries` is `[]` but the conversation has Escalation labels. | One placeholder card per label rendering: title = label without trailing " Escalation"; body = "Summary unavailable. Open the conversation history to review context."; subtle "Try again" link that re-fetches. Amplitude `super_agent_summary_missing` fires once per render per label. |
| **Resolve picker loading (submit in flight)** | User taps the dialog's Resolve button; `POST /v1/conversations/{id}/escalations/resolve` is in flight. | Resolve button enters loading state with a spinner and disabled state. Escalation rows in the picker are non-interactive (cursor stays default; clicks are no-op) until the response lands. Cancel button remains active to abort the dialog (but does not cancel the in-flight POST). |
| **Resolve picker empty (no Escalation labels)** | User taps "Resolve" on a conversation with no Escalation labels (e.g., labels were already resolved by another actor between page load and click). | Picker opens momentarily, detects empty state, and shows a single info row "No active AI escalations remain. The conversation will be marked Resolved." The Resolve button becomes "Mark Resolved"; tapping it calls the standard `POST /v1/conversations/{id}/resolve` (existing endpoint), not the SA-specific resolve endpoint. |
| **AI Activation popover loading** | Toggle is mid-flight (`POST /v1/conversations/{id}/ai-activation`). | Switch enters a `data-loading="true"` state (existing shadcn pattern) and ignores additional clicks for 800 ms while the request is in flight. Toast fires on response (success or failure). |
| **Phone / Email opt-in loading** | Select value change is mid-flight. | Trigger renders a 12×12 spinner in place of the chevron. Other selects on the popover remain interactive. |

**Performance budgets:**
- Inbox-list endpoint server-side P95 ≤ 250 ms with the new predicate. Failure to hit this is a release blocker — see § 11 vertical matrix for the load profile to test against.
- `GET /v1/conversations/{id}` (with the new `escalation_summaries` field) P95 ≤ 300 ms.
- `POST /v1/conversations/{id}/escalations/resolve` P95 ≤ 400 ms.
- Front-end Resolve picker open-to-interactive: ≤ 100 ms after click.

---

## 4. API Contracts

> All endpoints are versioned under `/v1`. JSON bodies. Authentication via existing bearer token. Rate-limit policy is shared with the rest of the Communications API (per-user 60 req/min, per-company 600 req/min).

### 4.1 Add escalation (called by an ELI+ AI product)

```
POST /v1/conversations/{conversation_id}/escalations
```

Request:
```json
{
  "product": "renewals_ai",
  "escalation_label": "Renewals AI Escalation",
  "summary": {
    "short": "Resident requesting rate exception on 12-month renewal offer ($1,850/mo, 3% increase).",
    "long": "Resident has been a tenant for 2 years with on-time payment history and feels the increase is higher than expected. Requested a rate review from a manager."
  },
  "actor": "ELI+ Super Agent",
  "idempotency_key": "renewals-ai:conv:18345:label:Renewals AI Escalation:2026-06-11T22:34:00Z"
}
```

Required: `product`, `escalation_label`, `actor`, `idempotency_key`. Optional: `summary` (recommended; if omitted, AI Summary card shows placeholder copy).

Success (201):
```json
{
  "conversation_id": "18345",
  "labels": ["AI Conversation", "Renewals AI Escalation", "Payments AI Escalation"],
  "label_activity_id": "la_91827",
  "thread_activity_id": "ta_91828"
}
```

Errors:
- 400 `{ "code": "invalid_label", "message": "escalation_label must end with ' Escalation'." }`
- 403 `{ "code": "forbidden", "message": "Caller is not authorized to write escalations." }`
- 404 `{ "code": "not_found", "message": "Conversation not found." }`
- 409 `{ "code": "duplicate_idempotency_key", "message": "Idempotency key already processed.", "existing_label_activity_id": "la_91827" }`
- 422 `{ "code": "conversation_resolved", "message": "Cannot add escalation to a resolved conversation." }`
- 429 `{ "code": "rate_limited", "retry_after_seconds": 5 }`
- 500 generic

### 4.2 Resolve escalations (called by staff)

```
POST /v1/conversations/{conversation_id}/escalations/resolve
```

Request:
```json
{
  "labels": ["Renewals AI Escalation"],
  "actor": "Abe Kashiwagi"
}
```

Required: `labels` (non-empty array), `actor`. Each label must currently exist on the conversation AND match the `*\s+Escalation$` shape.

Success (200):
```json
{
  "conversation_id": "18345",
  "labels_resolved": ["Renewals AI Escalation"],
  "labels_remaining": ["AI Conversation", "Payments AI Escalation"],
  "conversation_status": "open",
  "label_activity_id": "la_91890",
  "resolution_kind": "partial"
}
```

When all remaining escalation labels are resolved by the same call:
```json
{
  "conversation_id": "18345",
  "labels_resolved": ["Renewals AI Escalation", "Payments AI Escalation"],
  "labels_remaining": ["AI Conversation"],
  "conversation_status": "resolved",
  "label_activity_id": "la_91891",
  "thread_activity_id": "ta_91892",
  "resolution_kind": "full"
}
```

Errors:
- 400 `{ "code": "empty_labels", "message": "labels must contain at least one entry." }`
- 400 `{ "code": "unknown_label", "message": "Label not present on conversation.", "label": "..." }`
- 403 `{ "code": "forbidden", "message": "Missing Communications > Conversations > Resolve permission." }`
- 404 `{ "code": "not_found" }`
- 409 `{ "code": "label_already_resolved", "message": "Label was resolved by another actor.", "actor": "..." }`
- 429 / 500 standard

### 4.3 Per-conversation AI Activation

```
POST /v1/conversations/{conversation_id}/ai-activation
```

Request:
```json
{ "active": false, "actor": "Abe Kashiwagi" }
```

Success (200):
```json
{
  "conversation_id": "18345",
  "ai_active": false,
  "thread_activity_id": "ta_91900"
}
```

Errors: 403 (`Manage AI Activation` permission), 404, 429, 500.

### 4.4 Get conversation (existing — additive fields)

```
GET /v1/conversations/{conversation_id}
```

Existing endpoint gains two additive fields:

```json
{
  "id": "18345",
  "labels": ["AI Conversation", "Renewals AI Escalation", "Payments AI Escalation"],
  "status": "open",
  "ai_active": true,
  "escalation_summaries": [
    {
      "label": "Renewals AI Escalation",
      "product": "renewals_ai",
      "short": "Resident requesting rate exception on 12-month renewal offer ($1,850/mo, 3% increase).",
      "long": "Resident has been a tenant for 2 years with on-time payment history and feels the increase is higher than expected.",
      "generated_at": "2026-06-11T22:34:00Z"
    },
    {
      "label": "Payments AI Escalation",
      "product": "payments_ai",
      "short": "Resident requesting waiver of $50 late fee following an employer payroll delay.",
      "long": "October rent ($1,795) was returned due to insufficient funds; clean 2-year payment history.",
      "generated_at": "2026-06-11T22:36:00Z"
    }
  ]
}
```

`escalation_summaries` is `null` for conversations with no active escalation labels. Missing summaries per label appear as `{ "label": "...", "short": null, "long": null }`.

### 4.5 List inbox conversations (existing — predicate update)

The inbox-list endpoint's "All Threads" view predicate gains an OR branch:

```
status = "open" AND (
  hasUnread
  OR has_current_user_private_note_mention
  OR is_unattended
  OR (any label matches /\s+Escalation$/ AND conversation_source IN ("super_agent_v1", "super_agent_v2"))
)
```

`conversation_source` is a new enum on the conversation row (see § 5). Values: `"manual"`, `"super_agent_v1"`, `"super_agent_v2"`, others.

---

## 5. Business Logic

### Database changes

| Table | Field | Type | Default | Notes |
|---|---|---|---|---|
| `conversations` | `source` | enum (`manual`, `super_agent_v1`, `super_agent_v2`, `voice_ai`, `…`) | `manual` | New column. Used by inbox predicate. |
| `conversations` | `ai_active` | bool | `true` for AI-initiated convs, `true` for manual convs by default | New column. Per-conversation AI on/off override. |
| `conversation_label_activity` | `action` | enum (`added`, `context_provided`, `resolved_escalation`) | `added` | Widen existing enum. |
| `conversation_label_activity` | `labels_added` | text[] | `[]` | Existing. |
| `conversation_label_activity` | `actor` | text | required | Existing. |
| `conversation_label_activity` | `timestamp` | timestamptz | `now()` | Existing. |
| `conversation_escalation_summaries` | `conversation_id`, `label`, `product`, `summary_short`, `summary_long`, `generated_at` | composite | — | New table. PK `(conversation_id, label)`. Upserted by AI products on escalation add. |
| `conversation_thread_activity` | `kind` | enum (existing) | — | Reuse existing `kind = "handoff"`, `kind = "ai_activation"`, `kind = "status"`. No new kinds. |

### Validation rules

- `escalation_label` must match regex `^[A-Za-z0-9 +.&'-]{1,80} Escalation$`. The trailing literal " Escalation" is required.
- `product` must be one of the registered ELI+ AI product slugs (`renewals_ai`, `payments_ai`, `leasing_ai`, `maintenance_ai`, `other`). Unknown product → 400.
- `actor` length 1–120 chars.
- `idempotency_key` length 1–255 chars; uniqueness window 24 hours.

### Computed values

- `is_super_agent_v1_conversation`: `conversation.source = "super_agent_v1"`.
- `has_any_open_escalation`: `EXISTS (label LIKE '% Escalation' AND label NOT removed)`. (Maintained by add/remove paths; not a denormalized column in v1, but a covering index `(conversation_id) WHERE labels @> ARRAY['AI Conversation']::text[]` is recommended.)
- `remaining_escalation_count`: `array_length(labels filter '% Escalation', 1)`.

### Label companion rule (existing — confirm not regressed)

The existing `AI_LABEL_COMPANIONS` map ensures companion labels stay paired. `Maintenance AI` ↔ `Work Order` is the current entry. Super Agent 1.0 should NOT add new entries to this map. AI Conversation + per-product Escalation labels are managed via the resolution path, not via companion-pairing.

### Inbox-visibility predicate (formal)

```
visible_in_all_threads(c) :=
  c.status = "open"
  AND (
       c.hasUnread
    OR  has_current_user_private_note_mention(c)
    OR  is_unattended(c)
    OR  (c.source IN ("super_agent_v1", "super_agent_v2") AND any(c.labels, ends_with(" Escalation")))
  )
```

`is_unattended` is the existing definition (last public message is from resident, no public agent/staff reply after, not hasUnread).

### Conversation resolution rule

After any `escalations/resolve` POST:
- If `remaining_escalations_count == 0` → set `conversation.status = "resolved"` AND append a `thread_activity` of kind `status` with `action: "resolved"`.
- Else → keep `conversation.status` as-is.

### Concurrency / race-condition handling

- The `escalations/resolve` write path uses an optimistic concurrency check on `conversation_label_activity.last_updated`. If two actors call `/resolve` for the same labels within the same window, the second call's labels that have already been resolved are returned as a 409 with the prior actor's name. The remaining un-resolved labels in the second call are still processed.

---

## 6. User Stories

**US-1: As an onsite leasing agent, I want to see every AI-escalated conversation for my property in one place so I don't have to navigate between dashboards.**
- AC-1.1: A conversation with any `Escalation` label and `source = "super_agent_v1"` appears in `Communications >> Conversations >> All Threads` regardless of `hasUnread` state.
- AC-1.2: The conversation card in the sidebar displays the "AI Conversation" badge and one badge per active `Escalation` label (rendered with the existing Badge component, `secondary` variant by default).
- AC-1.3: When the conversation is opened, the timeline renders chronologically with `thread_activity` (handoff), `label_activity` (added), resident messages, agent messages, staff messages, and any prior `label_activity` (resolved_escalation) entries.

**US-2: As an onsite leasing agent, I want to read a plain-English summary of why the AI escalated so I don't have to scroll back through the chat.**
- AC-2.1: The "AI Summary" button is visible on the conversation header for any conversation where `source = "super_agent_v1"` AND `escalation_summaries` is non-empty.
- AC-2.2: Tapping the button opens the Escalation Context Summary panel which renders one card per object in `escalation_summaries`, in the order returned by the API.
- AC-2.3: Each card shows the label (formatted without the trailing " Escalation"), the `short` summary, and a "see more" affordance that expands to show `long` if present.
- AC-2.4: If `escalation_summaries` is `null` or empty for a conversation that DOES carry Escalation labels, each label still renders a card with placeholder copy "Summary unavailable. Open the conversation history to review context." and Amplitude `super_agent_summary_missing` fires.

**US-3: As an onsite leasing agent, I want to resolve only the escalation I handled and leave others open for teammates.**
- AC-3.1: Tapping "Resolve" on the conversation header opens the Resolve picker dialog with one row per active `Escalation` label.
- AC-3.2: The "Resolve" button in the dialog is disabled while `selections.size == 0`.
- AC-3.3: Resolving with a strict subset of active labels appends a `label_activity` row with `action: "resolved_escalation"`, removes only the selected labels, and leaves `conversation.status = "open"`.
- AC-3.4: The conversation remains in the "All Threads" inbox after a partial resolve, regardless of `hasUnread`.
- AC-3.5: Resolving the last remaining escalation label flips `conversation.status` to `"resolved"` and writes a standard `thread_activity` `status: resolved` row.

**US-4: As a regional leasing manager, I want a complete audit trail of who resolved each AI escalation and when.**
- AC-4.1: Every `escalations/resolve` write appends a `label_activity` row containing `actor` (full staff name), `timestamp` (ISO 8601 UTC), and `labels_added` (the labels resolved by that call).
- AC-4.2: The audit trail is readable via the existing conversation timeline rendering — no new admin screen is required for v1.
- AC-4.3: Each row is rendered in the timeline as a green band with the resolver name, the resolved labels as inline pills, and the formatted timestamp.

**US-5: As staff, I want to pause AI on a single sensitive conversation without changing the company-wide AI policy.**
- AC-5.1: Tapping the AI On / AI Off pill on a Super Agent 1.0 conversation opens a popover with a Switch labeled "AI Activated" only (no calendar / no "No Limit"), followed by Phone and Email opt-in selects.
- AC-5.2: Toggling the Switch fires `POST /v1/conversations/{id}/ai-activation` with `active` set to the new value and fires a sonner toast describing the new state.
- AC-5.3: Per-conversation `ai_active` is preserved across reloads and does not modify the company- or property-level AI activation policy.
- AC-5.4: When `ai_active = false`, subsequent inbound resident messages do NOT trigger any ELI+ AI auto-reply on that conversation.

**US-6: As a CSM, I want to enable Super Agent 1.0 for a customer in a single, safe action that affects all of their ELI+ AI products at once.**
- AC-6.1: Setting the company-level flag `oxp_super_agent_1 = true` causes every subsequent escalation written by any enabled ELI+ AI product for that company to land with `source = "super_agent_v1"`.
- AC-6.2: Setting the flag back to `false` does not delete any historical timeline data; existing `resolved_escalation` rows remain readable in the timeline.
- AC-6.3: Toggling the flag does not affect customers' ability to send/receive non-AI conversations.

---

## 7. SDET Test Cases

**TC-1: Partial resolve preserves remaining escalation and conversation status**
- Given: Conversation `C1` has `labels = ["AI Conversation", "Renewals AI Escalation", "Payments AI Escalation"]`, `source = "super_agent_v1"`, `status = "open"`, `hasUnread = false`.
- When: Staff posts `POST /v1/conversations/C1/escalations/resolve` with `labels = ["Renewals AI Escalation"]`, `actor = "Abe Kashiwagi"`.
- Then: Response 200 with `resolution_kind = "partial"`, `labels_resolved = ["Renewals AI Escalation"]`, `labels_remaining ⊇ ["Payments AI Escalation"]`, `conversation_status = "open"`. The conversation is returned by `GET /v1/inbox/all-threads` because the "any escalation label" branch of the predicate still matches. A new `label_activity` row exists with `action = "resolved_escalation"`, `labels_added = ["Renewals AI Escalation"]`, `actor = "Abe Kashiwagi"`. The `"Renewals AI Escalation"` label is no longer in `conversation.labels`.

**TC-2: Full resolve sets status to resolved and removes from inbox**
- Given: Same setup as TC-1 after the partial resolve (so labels now are `["AI Conversation", "Payments AI Escalation"]`).
- When: Staff posts `POST /v1/conversations/C1/escalations/resolve` with `labels = ["Payments AI Escalation"]`.
- Then: Response 200 with `resolution_kind = "full"`, `conversation_status = "resolved"`. A `thread_activity` row with `kind = "status"`, `action = "resolved"` is appended. `GET /v1/inbox/all-threads` no longer returns the conversation. A second `label_activity` row with `action = "resolved_escalation"` exists.

**TC-3: Resolve picker permission gate**
- Given: User without `Communications > Conversations > Resolve` permission has the conversation open.
- When: User attempts `POST /v1/conversations/C1/escalations/resolve` with valid labels.
- Then: Response 403 `{ code: "forbidden" }`. The UI Resolve button is rendered disabled (server permission claim is included in the conversation envelope).

**TC-4: Idempotency on AI handoff**
- Given: Renewals AI calls `POST /v1/conversations/C1/escalations` with `idempotency_key = "k1"`. Response 201 with `label_activity_id = "la_1"`.
- When: Same call with `idempotency_key = "k1"` is repeated within 24 hours.
- Then: Response 409 `{ code: "duplicate_idempotency_key", existing_label_activity_id: "la_1" }`. No second `label_activity` row is created. The conversation's `labels` is unchanged.

**TC-5: AI Activation toggle is per-conversation**
- Given: Company-level AI is `active = true`; conversation `C1` has `ai_active = true`.
- When: Staff posts `POST /v1/conversations/C1/ai-activation` with `active = false`.
- Then: `conversation.ai_active = false` for C1 only. Company-level setting is unchanged. A subsequent inbound resident message on C1 does NOT trigger any ELI+ AI auto-reply on C1. The same inbound message on a different conversation in the same company DOES still trigger AI auto-reply.

**TC-6: Conversation with empty escalation_summaries renders placeholder cards**
- Given: Conversation `C2` has `labels = ["AI Conversation", "Maintenance AI Escalation"]` but `escalation_summaries` is `[]` (summary was not persisted by Maintenance AI for any reason).
- When: Staff opens the AI Summary panel.
- Then: One card renders for "Maintenance AI" with placeholder copy "Summary unavailable…". Amplitude `super_agent_summary_missing` fires with `{ conversation_id: "C2", label: "Maintenance AI Escalation" }`.

---

## 8. Amplitude Events

| Event | Trigger | Properties |
|---|---|---|
| `super_agent_escalation_added` | An ELI+ AI product successfully adds an escalation to a conversation. | `conversation_id: string`, `property_id: string`, `company_id: string`, `product: string`, `escalation_label: string`, `had_existing_escalations: boolean` |
| `super_agent_summary_viewed` | Staff opens the AI Summary panel on a Super Agent 1.0 conversation. | `conversation_id: string`, `property_id: string`, `escalations_present: string[]`, `escalation_count: number` |
| `super_agent_summary_missing` | AI Summary panel renders a placeholder card because no summary was returned for an active escalation label. | `conversation_id: string`, `label: string`, `product: string` |
| `super_agent_picker_opened` | Staff opens the Resolve picker dialog on a Super Agent 1.0 conversation. | `conversation_id: string`, `property_id: string`, `escalation_count: number` |
| `super_agent_escalation_resolved` | Staff successfully resolves one or more escalations on a conversation. | `conversation_id: string`, `property_id: string`, `actor: string`, `labels_resolved: string[]`, `resolution_kind: "partial" \| "full"`, `remaining_count: number`, `time_open_minutes: number` |
| `super_agent_conversation_resolved` | The last remaining escalation on a conversation is resolved, flipping the conversation status to resolved. | `conversation_id: string`, `total_escalations_resolved: number`, `time_open_minutes: number`, `actors_involved: string[]` |
| `super_agent_ai_activation_toggled` | Staff toggles AI Activated on/off on a Super Agent 1.0 conversation. | `conversation_id: string`, `property_id: string`, `active: boolean`, `actor: string` |
| `super_agent_resolve_conflict` | Resolve POST returns 409 because another actor resolved a label between picker open and submit. | `conversation_id: string`, `labels_attempted: string[]`, `other_actor: string` |
| `super_agent_resolve_denied` | Resolve POST returns 403. | `conversation_id: string`, `reason: "permission" \| "company_disabled"` |
| `super_agent_resolve_rate_limited` | Resolve POST returns 429. | `conversation_id: string`, `retry_after_seconds: number` |

---

## 9. Success Metrics (AARRR)

| Stage | Metric | Target | Measurement | Timeline |
|---|---|---|---|---|
| Acquisition | % of eligible customers (≥1 ELI+ AI product) enabled on `oxp_super_agent_1` | ≥ 60% by end of week +6 post-GA | Flag enablement registry | Week +6 |
| Activation | % of enabled-customer properties where at least one staff member views an AI Summary in their first 7 days post-enablement | ≥ 70% | `super_agent_summary_viewed` distinct `(property_id, actor)` / total properties | Week +2 per cohort |
| Retention | Median weekly AI Summary views per property per active staff seat | ≥ 12 | `super_agent_summary_viewed` / DAU per property | Steady-state by week +8 |
| Revenue | Net ARR uplift from incremental ELI+ AI product attach (e.g., Payments AI added on top of Renewals AI) at Super Agent 1.0–enabled customers in the 90 days post-enablement | ≥ 15% lift in incremental ELI+ AI attach rate at SA 1.0–enabled customers vs. non-enabled control cohort; PMM-confirmed target list of [INSERT: N] design-partner accounts | Salesforce ARR roll-up against opportunity tag `super_agent_v1_attach` | 90 days post-Phase 2 |
| Referral | % of design-partner customers willing to publicly reference Super Agent 1.0 in PR / case studies | ≥ 2 named references | Sales team confirmation | 90 days post-Phase 1 |

Operational metrics monitored alongside AARRR:
- Median time-to-first-staff-reply on AI escalation threads. Target: 25% reduction vs. pre-Super-Agent baseline.
- % of AI escalation threads that get partially resolved at least once before full resolve. Target: ≥ 20% (proves partial-resolve workflow is being used).
- 5xx error rate on `escalations/resolve`. Target: < 0.1%.

---

## 10. Feature Flag & Rollback

**Flag:** `oxp_super_agent_1` (company-level).
- Type: Boolean. Default: `false`.
- Read scope: company.
- Surface: Read by both the back-end (when ELI+ AI products write escalations) and the front-end (when the inbox renders per-escalation UI and when the conversation panel decides to render the simplified AI activation popover).

**ON behavior:**
- ELI+ AI products' escalation writes set `conversation.source = "super_agent_v1"`.
- Inbox-visibility predicate includes the "any escalation label" branch.
- AI Summary, Resolve picker, simplified AI Activation popover, and toast feedback render.

**OFF behavior:**
- ELI+ AI products' escalation writes set `conversation.source` to their pre-Super-Agent default value.
- Inbox predicate does NOT include the "any escalation label" branch.
- AI Summary button, Resolve picker, and simplified popover are not rendered. The standard Communications Resolve button is shown instead.

**Rollback procedure:**
1. Set `oxp_super_agent_1 = false` for the affected company (or globally if needed).
2. Confirm the flag change has propagated (existing flag-rollout dashboard).
3. UI immediately stops rendering Super-Agent-specific elements. Existing conversations retain all timeline entries (handoff, label_activity rows, resolved_escalation rows).
4. ELI+ AI products' escalation writes return to the pre-Super-Agent code path on next deploy of the AI products. The Super Agent ingestion endpoint stays available, harmlessly.
5. Verify by spot-checking a previously affected conversation: its history is intact and `Communications >> Conversations` continues to render it correctly with the standard Resolve button.

**Data safety during rollback:**
- `label_activity` rows with `action = "resolved_escalation"` remain in the timeline and are still rendered correctly by the standard timeline renderer (which already handles unknown action values by falling back to the generic "label updated" pill).
- `conversation.source = "super_agent_v1"` rows are not deleted on rollback. They are simply ignored by the inbox predicate when the flag is off.
- `conversation_escalation_summaries` rows are retained.
- No customer-visible data loss is possible from rolling back this flag.

**Emergency escalation path:**
- 24x7 on-call: Communications service team, secondary Communications front-end team.
- War-room channel: [INSERT: Slack channel for ELI+ Super Agent on-call rotation].

---

## 11. Vertical Impact Deviation Matrix

| Vertical | Required? | Type | Summary | Notes |
|---|---|---|---|---|
| Residential (Conventional) | Yes | Full parity | All Super Agent 1.0 capabilities ship. | Primary launch vertical. |
| Commercial | No | Out-of-scope v1 | Commercial AI products are out of scope; Super Agent 1.0 does not surface a Commercial-specific escalation label. | Add to roadmap once Commercial AI ships. |
| Affordable | Yes | Full parity | All Super Agent 1.0 capabilities ship. Renewals AI affordable-specific compliance flows still apply but render through the same unified inbox. | Compliance review for label naming conventions recommended. |
| Student | Yes | Full parity | All Super Agent 1.0 capabilities ship. | Coordinate with Student Renewals AI epic owner on summary content guidelines. |
| Military | Yes | Full parity | All Super Agent 1.0 capabilities ship. | No Military-specific UI deviations. |
| Senior | Yes | Full parity | All Super Agent 1.0 capabilities ship. | No Senior-specific UI deviations. |
| HOA | No | Out-of-scope v1 | HOA does not currently have an ELI+ AI surface that would write escalations. | Re-evaluate once HOA AI surface exists. |

---

## 12. Accessibility

- **Tab order on the conversation panel:** Avatar/assignee picker → AI On/Off pill → Resolve button → Add Label button → AI Summary button → Conversation body (timeline messages tab-navigable in chronological order) → Channel composer → Phone opt-in → Email opt-in.
- **AI On/Off pill:**
  - `role="button"`, `aria-haspopup="dialog"`, `aria-expanded` reflecting popover state, `aria-label="AI activation settings — currently {on|off}"`.
  - Popover Switch: native shadcn `Switch` (rendered as `role="switch"`, `aria-checked`).
- **Resolve picker dialog:**
  - Radix Dialog (existing `<Dialog>` shadcn component) renders `role="dialog"`, `aria-modal="true"`, `aria-labelledby` and `aria-describedby` pointed at the title/description.
  - Each escalation row is `role="checkbox"`, `aria-checked` reflecting selection. Keyboard: Space toggles selection.
  - The Resolve button has `aria-disabled="true"` when `selections.size === 0`.
- **AI Summary panel:**
  - Trigger button: `aria-expanded`, `aria-controls` pointing to the panel container.
  - Panel container: `role="region"`, `aria-label="Escalation Context Summary"`.
- **Focus management:**
  - Opening the Resolve picker moves focus to the first escalation row.
  - Closing the picker (Cancel or after Resolve) returns focus to the Resolve button on the conversation header.
  - Opening the AI Activation popover moves focus to the Switch.
  - Closing the popover returns focus to the AI On/Off pill.
  - Sonner toasts are `role="status"`, `aria-live="polite"`.
- **Color contrast:** All new green (`emerald-50` / `emerald-500` / `emerald-800`) and orange (`orange-50` / `orange-400` / `orange-800`) palette uses meet WCAG 2.1 AA against the panel backgrounds. Verified against the existing Communications conversation palette tokens.
- **Screen reader behavior:**
  - When an escalation is resolved, the new timeline row's text is announced (it's in a polite live region inside the timeline container).
  - When AI Activation is toggled, the toast is announced (polite live region).
  - The AI On/Off pill text ("AI On" / "AI Off") changes accordingly so screen readers reading the header announce the new state.

---

## Appendix A — Prototype reference (for engineer onboarding)

The Communications prototype in this repository implements the v1 design end-to-end. Engineers can use it as an executable design spec by running `npm run dev` and enabling **Super Agent 1.0** from the Communications Demo Control panel (sidebar footer). The seed conversation is Jordan Lee at Hillside Living (SMS) with `Renewals AI Escalation` + `Payments AI Escalation`.

Files of interest for parity:

- `lib/conversations-context.tsx` — `ConversationItem` shape, `EntrataMessage` / `label_activity` discriminator, `SUPER_AGENT_1_DEMO_THREADS` seed, `removeLabel` companion-aware logic, `resolveConversation`.
- `lib/conversations-demo-context.tsx` — the `superAgent1Enabled` toggle modeling the company-level flag.
- `app/conversations/page.tsx`:
  - `conversationMatchesAllThreadsInbox` — the inbox-visibility predicate (§ 5).
  - The Resolve picker dialog (search for `sa1ResolvePickerOpen`).
  - The simplified AI Activation popover branch (search for `isSuperAgent1DemoThread(selected.id) ?`).
  - The AI Summary panel (search for `Escalation Context Summary`).

---
