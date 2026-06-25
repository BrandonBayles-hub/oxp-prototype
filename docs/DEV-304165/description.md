# Engineering Spec — DEV-304165 / OXP Vanity Number Settings (Top Part)

> Per-property × per-AI-product vanity number assignment grid at the top of the **Vanity Number Settings** page (Setup >> Communications Setup >> Vanity Number Settings). This epic ships the **viewing** and **re-wiring** capability for the grid. Adjacent CRUD of the underlying vanity number pool is shipped in DEV-304152.

---

## 1. Problem Definition

### Before / After narrative

**Before (production today):** OXP-enabled operators have no single place inside OXP to see which vanity phone number is wired to which AI product at which property. The information lives in three legacy locations:

1. **Twilio** — the carrier-level list of numbers the customer owns.
2. **`Setup >> Property >> Contact Methods >> Vanity Phone Numbers`** — the per-property vanity number registry inside legacy Entrata (one page per property).
3. **`Marketing >> Lead Sources`** — the attribution layer that decides which campaign each number reports against.

Answering the single operational question — "is this property AI-ready for SMS and voice?" — requires opening all three pages, cross-referencing them mentally, and re-doing the reconciliation for each property. A regional manager at a 15-property portfolio spends an estimated 6–10 minutes per property per week on this reconciliation = ~90–150 minutes/week per regional manager.

**After (this release):** A single `Vanity Number Configuration` grid component renders at the top of the new **Vanity Number Settings** route (`/communications-setup/phone-numbers`) inside OXP. The grid is a table of `N` properties × `M` AI product slots (M = 11 sub-columns across 7 product groups at GA). Each intersection cell renders the wired vanity number, or a status indicator (Pending, Not started, N/A). Re-wiring is inline via dropdowns. Carrier registration status is pulled in real time from Twilio via Entrata's existing telephony service (polled every 60 seconds while the page is open).

### Quantified business value (formula)

```
reconciliation time saved per regional manager per week
= 6 min/property × 15 properties/regional manager = 90 min/week (low end)
to 10 min/property × 15 properties = 150 min/week (high end)

across a typical OXP customer:
~3 regional managers per customer (30–60 property portfolio)
× 90–150 min/week = 4.5–7.5 hours/week per customer
× 4.3 weeks/month = ~19–32 hours/month per customer reclaimed
```

After the grid: the same reconciliation task collapses to a single page load + visual scan, typically completed in under 60 seconds — a >95% reduction in routine AI-readiness verification time per customer.

### Strategic "why now"

Entrata is mid-rollout of seven AI agents (Leasing AI, Payments AI, Maintenance AI, Renewals AI, Click-to-Call, Outbound Default, Super Agent AI from DEV-301687). Every new agent introduces a new column to this grid and a new per-property assignment job. Without the grid, every agent launch creates a Telecom support spike ("please wire my N properties to the new slot"). The grid front-loads the wiring work onto the operator (one-time self-serve) and removes Entrata Telecom from the steady-state path.

### Personas

- **Regional Leasing Manager** — covers 8–20 properties, lives in the grid weekly for AI-readiness triage and re-wiring during campaign cutovers.
- **Marketing Manager** — owns campaign attribution; uses the grid to re-wire Click-to-Call Default and Outbound Default columns when launching new tracking numbers.
- **Property Manager** — single-property; checks the grid post-onboarding to confirm Pending → Done transition.
- **Entrata CSM** — uses the grid during QBRs to demonstrate AI coverage and surface upsell (Click-to-Call N/A pills).
- **Entrata Telecom (internal back-office)** — benefits indirectly via reduced ticket volume; their inbox today is dominated by "please re-wire my AI" tickets that this grid eliminates.

### Customer evidence

- [INSERT: Customer name + CS ticket # for the "we can't tell when AI is on without a Telecom ticket" pattern.]
- [INSERT: Quantified support-ticket volume tagged "vanity number assignment" or "AI not responding" that traces back to misconfigured/pending registration, if available from Tier-2 support reporting.]
- [INSERT: Competitor name shipping a comparable per-property assignment matrix at GA, if available.]

---

## 2. Solution — Workflows

### Flow 1 — Happy path: Operator re-wires Leasing AI / SMS at one property

1. User navigates to `Setup >> Communications Setup >> Vanity Number Settings` (route: `/communications-setup/phone-numbers`). The grid loads with status counters above ("X Pending Vanity Numbers · Y Properties Not Started") and the row for "Cambridge Suites (Phoenix, AZ 602)" shows an amber Pending row.
2. User locates the Leasing AI / SMS column intersection with Cambridge Suites: cell value `(602) 542-1500` rendered as a dropdown trigger.
3. User clicks the cell. Dropdown opens with the current value `(602) 542-1500` highlighted, followed by an optgroup labeled `— Cambridge Suites —` listing other vanity numbers attached to property `p5` (e.g., `(844) 815-0570`, `(844) 623-5218`), followed by an optgroup labeled `— Company —` listing all other unique numbers in the company pool, and a **+ New Vanity Number** action at the top.
4. User selects `(844) 815-0570`. The page calls `PATCH /api/oxp/properties/p5/ai-products/leasing/sms/vanity-number` with body `{ phoneNumber: "(844) 815-0570" }`.
5. API responds 200 with the updated assignment record. The cell value updates to `(844) 815-0570`. Because the row is still in `Pending` carrier-registration status, the PENDING pill below the new number is preserved.
6. Amplitude event `vanity_config_cell_changed` fires with properties `{ property_id: "p5", product_slot: "leasing_sms", old_number: "(602) 542-1500", new_number: "(844) 815-0570", row_status: "pending" }`.
7. Server-side audit log appended: `actor=user_id, action=cell_change, scope=property:p5/slot:leasing_sms, before=v_old_id, after=v_new_id, at=ISO8601`.

### Flow 2 — Operator kicks off carrier registration from a Not-started cell

1. User clicks a `—` cell in the Lakeside Commons (Columbus, OH 614) row, e.g., Super Agent AI column.
2. Dropdown opens with placeholder text `—` (disabled, hidden once value picked), the **+ New Vanity Number** action at top in blue, and an optgroup `— Company Vanity Numbers —` listing every unique company-wide vanity number.
3. User picks `(206) 785-3512`.
4. The client first calls `POST /api/oxp/properties/p8/privacy-policy/submit` with body `{ policySource: "company_default" }`. Server-side: the company's default privacy policy text is loaded from `companies.default_privacy_policy_id`, submitted to the carrier registration service, and the property's `privacy_policy_submitted_at` is set to `now()`.
5. On 201 response from the privacy-policy submission, the client calls `POST /api/oxp/properties/p8/ai-products/super-agent/sms/vanity-number` with body `{ phoneNumber: "(206) 785-3512", kickoffRegistration: true }`. This wires the slot and triggers the carrier campaign for any of the property's slots that don't yet have an active carrier registration.
6. The entire row flips to `Pending` state immediately (optimistic UI). All cells in the row update from `—` to their assigned numbers, and a "Pending · Submitted recently" timestamp appears in the sticky property column. The summary counter "Properties Not Started" decrements by 1 and "Pending Vanity Numbers" increments by the count of distinct numbers in the row.
7. Amplitude events: `vanity_config_registration_kicked_off` `{ property_id, picked_number, slot, total_distinct_numbers_in_row }`.
8. The grid's `useEffect` polling loop (60-second interval, started on mount) continues — the row will flip from Pending → Done within 1–5 business days when Twilio reports the campaign as registered.

### Flow 3 — Operator creates a brand-new vanity number from any cell

1. User clicks a cell — Done, Pending, or Not-started — and selects **+ New Vanity Number** from the top of the dropdown.
2. The grid opens the Add Vanity Number modal (the same component shipped in DEV-304152). The modal's area-code input is pre-filled with the property's area code looked up from `AREA_CODES[prop.city]`.
3. User completes the modal (Toll-Free flag, Area Code, Forward Preference, Use for SMS, Outbound Default, Expiration) and clicks "Submit Request."
4. DEV-304152's `POST /api/oxp/vanity-numbers` runs and adds the new row to the company pool. The grid's `vanityNumbers` state (via React Query subscription to the vanity-number pool) updates and the new number becomes selectable in subsequent dropdown openings.
5. The original cell that triggered the modal does not auto-update — the user must click it again and pick the new number. This is deliberate: adding a number ≠ assigning it.
6. Amplitude event `vanity_config_new_number_initiated_from_cell` `{ property_id, slot, was_row_status: "active" | "review" | "awaiting" }`.

### Flow 4 — User with View-only permission opens the grid

1. User navigates to `/communications-setup/phone-numbers`. Server-side render checks user's permissions for `Setup >> Property >> Contact Methods >> Vanity Phone Numbers`.
2. Permission resolved as `View=true, Edit=false`. The grid renders with all rows, all cells, all status pills, and all summary counters — but every cell is a static `<span>` instead of a `<select>` and the dropdown chevrons are not shown.
3. The **+ New Vanity Number** button on the Add modal does not render (the modal itself does not open via this grid for View-only users).
4. Not-started cells render their `—` em-dashes as a static `<span>`, not a dropdown. Hovering shows tooltip "Edit permission required to start registration."
5. Amplitude event `vanity_config_grid_viewed_readonly` `{ user_id, read_only_reason: "missing_edit_permission" }`.

### Flow 5 — Carrier registration polls succeed; Pending → Done

1. User loads the grid; Cambridge Suites is in Pending state.
2. Every 60 seconds the grid calls `GET /api/oxp/properties/registration-status?propertyIds=p1,p2,…,p16`. Response is a map `{ p5: { status: "review", submittedAt: "2026-06-16T14:23:11Z" }, p7: { status: "active", … }, p1: { status: "active", … }, … }`.
3. On poll N, Cambridge Suites' status flips from `review` to `active` server-side (carrier cleared the campaign). The client's React Query cache updates.
4. The row's amber background fades to white over 800ms (CSS transition), the PENDING pills under each cell are removed, and the "Pending · Submitted 2 days ago" timestamp in the sticky column is replaced with no text.
5. The summary counter "Pending Vanity Numbers" decrements by the number of distinct numbers in that row.
6. Amplitude event `vanity_config_row_status_changed` `{ property_id: "p5", from: "review", to: "active", time_in_review_seconds }` fires once per row transition.

---

## 3. Error & Failure States

| Trigger | UX Response | Recovery Path | Amplitude Event |
|---|---|---|---|
| Cell change request returns 403 (user lost Edit permission mid-session) | Cell snaps back to original value. Red toast: "You don't have permission to change this. Refresh the page." | Refresh; permission state will reload from server. | `vanity_config_cell_change_denied` `{ reason: "permission_lost" }` |
| Cell change returns 409 (concurrent edit conflict — another user changed the same cell within the last 60s) | Cell snaps back. Amber toast: "This number was changed by [user] X seconds ago. Refresh to see the latest." | User clicks Refresh in toast or reloads page. | `vanity_config_cell_change_conflict` `{ property_id, slot, conflict_actor }` |
| Privacy-policy submission for a Not-started row returns 422 (no default company privacy policy on file) | Cell snaps back to `—`. Red toast with action button: "No default company privacy policy. Set one up in Marketing >> Privacy Policy." | User clicks toast action → opens new tab to `Marketing >> Privacy Policy >> Default`. | `vanity_config_registration_kickoff_failed` `{ reason: "no_default_privacy_policy" }` |
| Privacy-policy submission returns 403 (user lacks Privacy Policy Edit permission) | Cell snaps back. Red toast: "You don't have permission to submit a privacy policy. Contact your administrator." | User contacts admin; admin grants permission; user retries. | `vanity_config_registration_kickoff_failed` `{ reason: "missing_privacy_policy_edit" }` |
| Network failure during cell change (offline / 5xx / timeout > 8s) | Cell shows a small inline red dot indicator next to the chevron; old value preserved. Red toast: "Unable to save. Check your connection and try again." | Auto-retry up to 3 times with exponential backoff (1s, 3s, 8s). If still failing after retries, the inline indicator persists until the user retries manually. | `vanity_config_cell_change_failed` `{ reason: "network", retry_count }` |
| Registration-status polling returns 5xx for 3 consecutive polls | Header banner appears: "Live registration status is unavailable. Showing last known state from [timestamp]." | Polling continues in background; banner clears on next successful poll. | `vanity_config_status_poll_degraded` `{ consecutive_failures }` |
| User picks an existing number that is itself in `review` (Pending) status | Cell change succeeds; the cell now shows the picked number + PENDING pill (the pill reflects the picked number's status, not the row). Information toast: "This number is also Pending carrier registration. AI traffic will start when both clear." | No action required; both clear in their own time. | `vanity_config_assigned_pending_number` `{ assigned_number, slot }` |
| Click-to-Call N/A cell is clicked by a power user via keyboard navigation | N/A pill receives focus but Enter/Space does nothing. Tooltip "Not Contracted — contact your CSM to add Click-to-Call to this property's contract" is announced via `aria-describedby`. | User can use the tooltip to know to contact CSM. | `vanity_config_na_pill_focused` `{ property_id, slot: "click_to_call" }` |
| Grid loads but the user's session contains no properties (account with portfolio = 0) | Empty state replaces the grid: "No properties found. Vanity number assignment requires at least one property." | Admin adds a property in Setup; user reloads. | `vanity_config_empty_portfolio` |
| Add Vanity Number modal opened from a cell, but DEV-304152 is not deployed | The **+ New Vanity Number** option is not shown in any dropdown (server-side feature gate detection); a tooltip on the chevron explains "New number creation requires the Vanity Phone Numbers section — contact Entrata Support." | Wait for DEV-304152 to be deployed; the option re-appears. | `vanity_config_new_number_unavailable` `{ reason: "dev_304152_not_deployed" }` |

---

### Loading & Empty States (sub-section of § 3)

- **Initial load:** Grid skeleton renders within 80ms with: 16 placeholder rows (skeleton bars matching property name + city/state badge), 11 sub-columns of skeleton bars matching number-cell width, and the summary counter shows `—Pending Vanity Numbers · — Properties Not Started`. Real data replaces skeleton when `GET /api/oxp/properties/grid-state` resolves (target: P95 < 800ms for portfolios up to 100 properties).
- **Per-row loading:** When a user changes a cell, the cell's `<select>` is disabled with `aria-busy="true"` and a 10px spinner overlays the chevron position for the duration of the PATCH request (typically 200–400ms).
- **Polling refresh:** Status polling does not show a loading indicator. The poll either completes silently in the background or, after 3 consecutive failures, triggers the degraded-status header banner.
- **Empty portfolio (0 properties):** Grid is replaced by an empty state with an icon, headline "No properties found," subhead "Vanity number assignment requires at least one property," and a button "Go to Setup >> Properties" (only renders if user has property-management permission).
- **Empty rows (portfolio of 1):** Grid renders the single row exactly the same as a multi-row portfolio. No special small-portfolio treatment.
- **Filter / search:** This release does NOT include a property search box. With 100+ properties the grid is paginated via browser scroll only — there is no client-side filter input. Pagination via virtualized rendering is in scope for a future epic.

---

## 4. API Contracts

All endpoints are inside Entrata's existing OXP BFF (Backend-for-Frontend) at `https://api.oxp.entrata.com`. Authentication is the existing OXP session cookie + CSRF header. Rate limiting per the existing OXP gateway policy: 60 requests/minute/user for read endpoints, 30 requests/minute/user for write endpoints.

### `GET /api/oxp/properties/grid-state`

Returns the full grid render payload — all properties, all product slots, all current vanity number assignments, all registration statuses.

**Request:** (no body)

**Headers:** `Authorization: Bearer <session-token>` (via cookie), `X-CSRF-Token: <token>`

**Success response (200):**
```json
{
  "properties": [
    {
      "id": "p1",
      "name": "Harvest Peak Capital",
      "city": "Austin",
      "state": "TX",
      "areaCode": "512",
      "registrationStatus": "active",
      "registrationSubmittedAt": null,
      "privacyPolicySubmittedAt": "2026-02-14T10:23:11Z",
      "userPermissions": { "view": true, "edit": true, "privacyPolicyEdit": true },
      "contractFlags": { "clickToCallContracted": true },
      "assignments": {
        "super_agent_sms": "(877) 428-0948",
        "click_to_call_sms": "(877) 428-0948",
        "outbound_default_sms": "(877) 428-0948",
        "leasing_sms": "(512) 423-1100",
        "leasing_voice": "(512) 483-2200",
        "leasing_ivr_text": "(512) 856-3300",
        "payments_sms": "(512) 763-1400",
        "maintenance_sms": "(512) 542-1500",
        "maintenance_voice": "(512) 677-2200",
        "renewals_sms": "(512) 934-2500"
      }
    }
  ],
  "vanityNumberPool": [
    { "id": "v1", "phoneNumber": "(877) 428-0948", "propertyIdOriginal": "p1" },
    { "id": "v2", "phoneNumber": "(855) 716-5354", "propertyIdOriginal": "p1" }
  ],
  "summary": {
    "totalProperties": 16,
    "activeProperties": 4,
    "pendingProperties": 4,
    "notStartedProperties": 8,
    "uniquePendingVanityNumbers": 32
  }
}
```

**Error responses:**
- `401 Unauthorized` — session expired. Body: `{ "error": "session_expired", "redirect": "/sign-in" }`
- `403 Forbidden` — user lacks View permission on the entire feature. Body: `{ "error": "missing_permission", "permission": "vanity_numbers_view" }`
- `429 Too Many Requests` — Body: `{ "error": "rate_limited", "retryAfterSeconds": 60 }`
- `500 Internal Server Error` — Body: `{ "error": "internal", "requestId": "req_abc123" }`

### `GET /api/oxp/properties/registration-status?propertyIds=p1,p2,…`

Lightweight polling endpoint that returns only status, not full assignments. Used by the 60-second polling loop.

**Request:** `?propertyIds=p1,p2,…,p16` (max 200 ids per request, comma-separated)

**Success response (200):**
```json
{
  "statuses": {
    "p1": { "status": "active", "submittedAt": null, "lastCheckedAt": "2026-06-18T19:42:00Z" },
    "p5": { "status": "review", "submittedAt": "2026-06-16T14:23:11Z", "lastCheckedAt": "2026-06-18T19:42:00Z" },
    "p8": { "status": "awaiting", "submittedAt": null, "lastCheckedAt": "2026-06-18T19:42:00Z" }
  }
}
```

**Error responses:**
- `400 Bad Request` — `propertyIds` empty or > 200 entries. Body: `{ "error": "invalid_request", "field": "propertyIds" }`
- `403 Forbidden` — user lacks View on at least one requested property. Response includes only properties they can view; no error returned for partial access.
- `429`, `500` — same as above.

### `PATCH /api/oxp/properties/:propertyId/ai-products/:productKey/:channel/vanity-number`

Re-wires a single cell of the grid. `productKey ∈ { super_agent, click_to_call, outbound_default, leasing, payments, maintenance, renewals }`. `channel ∈ { sms, voice, ivr_text }`.

**Request body:**
```json
{
  "phoneNumber": "(844) 815-0570",
  "ifMatch": "etag-from-grid-state-response"
}
```

`ifMatch` is the row-level ETag returned in `GET /api/oxp/properties/grid-state`. Used for optimistic concurrency.

**Success response (200):**
```json
{
  "propertyId": "p5",
  "productKey": "leasing",
  "channel": "sms",
  "previousPhoneNumber": "(602) 542-1500",
  "newPhoneNumber": "(844) 815-0570",
  "auditEventId": "audit_xyz789",
  "etag": "new-etag-value"
}
```

**Error responses:**
- `400 Bad Request` — invalid `productKey` / `channel` / phoneNumber format. Body: `{ "error": "invalid_input", "field": "phoneNumber" }`
- `403 Forbidden` — missing Edit permission. Body: `{ "error": "missing_permission", "permission": "vanity_numbers_edit" }`
- `404 Not Found` — property doesn't exist or product slot is not active for this property. Body: `{ "error": "not_found" }`
- `409 Conflict` — ETag mismatch (concurrent edit). Body: `{ "error": "etag_mismatch", "currentEtag": "...", "currentPhoneNumber": "...", "conflictActor": "user_id_or_email" }`
- `422 Unprocessable Entity` — phone number not in the company's vanity pool. Body: `{ "error": "phone_not_in_pool", "phoneNumber": "..." }`
- `429`, `500` — same as above.

### `POST /api/oxp/properties/:propertyId/privacy-policy/submit`

Submits the company's default privacy policy on behalf of a property. Used by the Not-started → Pending kickoff flow.

**Request body:**
```json
{ "policySource": "company_default" }
```

`policySource` is restricted to `"company_default"` in this release. Future epics may add `"custom"` with a `policyText` field.

**Success response (201):**
```json
{
  "propertyId": "p8",
  "policyDocumentId": "policy_abc123",
  "submittedAt": "2026-06-18T19:45:01Z",
  "carrierCampaignId": "tw_camp_xyz789"
}
```

**Error responses:**
- `403 Forbidden` — missing `privacy_policy_edit` permission. Body: `{ "error": "missing_permission", "permission": "privacy_policy_edit" }`
- `409 Conflict` — privacy policy already submitted for this property. Body: `{ "error": "already_submitted", "submittedAt": "..." }`
- `422 Unprocessable Entity` — no default privacy policy configured at the company level. Body: `{ "error": "no_default_policy", "remediation": "Marketing >> Privacy Policy >> Default" }`
- `429`, `500` — same as above.

### `POST /api/oxp/properties/:propertyId/ai-products/:productKey/:channel/vanity-number`

Variant of PATCH that also triggers carrier registration if the property is in Not-started state. Used by Flow 2.

**Request body:**
```json
{
  "phoneNumber": "(206) 785-3512",
  "kickoffRegistration": true
}
```

**Success response (201):**
```json
{
  "propertyId": "p8",
  "productKey": "super_agent",
  "channel": "sms",
  "newPhoneNumber": "(206) 785-3512",
  "registrationKicked": true,
  "carrierCampaignId": "tw_camp_xyz789",
  "estimatedClearAt": "2026-06-21T08:00:00Z",
  "etag": "new-etag-value"
}
```

**Error responses:** same as the PATCH variant plus the privacy-policy submission errors.

### Pagination

Not applicable in this release. The grid loads the entire portfolio. Customers with > 200 properties trigger client-side virtualization via `react-window` (rows only — columns are always fully rendered because column count is fixed at M=11).

### Rate limiting

OXP gateway limit: 60 RPM/user for GETs, 30 RPM/user for write methods. The polling loop (60s interval) consumes exactly 1 read request/minute per user. A user re-wiring all 16 properties × 11 sub-columns = 176 PATCH calls would be paced via the 30 RPM cap = ~6 minutes minimum for full re-wire (acceptable for one-time setup).

---

## 5. Business Logic

### Database tables (existing — read by this epic; no schema changes)

| Table | Field | Type | Notes |
|---|---|---|---|
| `properties` | `id` | UUID PK | |
| `properties` | `name` | varchar(255) | |
| `properties` | `city` | varchar(120) | |
| `properties` | `state` | varchar(2) | |
| `properties` | `area_code` | char(3) | computed from city → AREA_CODES map |
| `properties` | `privacy_policy_submitted_at` | timestamptz | NULL = Not-started; non-null = Pending or Done |
| `properties` | `registration_status` | enum(active, review, awaiting) | mirrored from carrier service |
| `properties` | `registration_submitted_at` | timestamptz | NULL until first kickoff |
| `properties` | `contract_features` | jsonb | includes `{ click_to_call: true \| false }` |
| `vanity_numbers` | `id` | UUID PK | |
| `vanity_numbers` | `phone_number` | varchar(20) | format `(XXX) XXX-XXXX` |
| `vanity_numbers` | `property_id_original` | UUID FK → properties | the property that purchased the number |
| `vanity_numbers` | `company_id` | UUID FK → companies | the company that owns the number pool |
| `vanity_numbers` | `sms_registration_status` | varchar | matches carrier campaign status |
| `vanity_numbers` | `caller_id_registered` | bool | |
| `ai_product_assignments` (new — see below) | `id` | UUID PK | |
| `ai_product_assignments` | `property_id` | UUID FK → properties | |
| `ai_product_assignments` | `product_key` | varchar | e.g., `super_agent`, `leasing`, … |
| `ai_product_assignments` | `channel` | varchar | `sms` \| `voice` \| `ivr_text` |
| `ai_product_assignments` | `vanity_number_id` | UUID FK → vanity_numbers | |
| `ai_product_assignments` | `etag` | varchar(64) | UUIDv4, regenerated on update |
| `ai_product_assignments` | `updated_at` | timestamptz | |
| `ai_product_assignments` | `updated_by_user_id` | UUID FK → users | |

The `ai_product_assignments` table is the one schema change required by this epic. Migration: `db/migrations/20260618_create_ai_product_assignments.sql`. The migration also seeds the table from existing per-product number defaults (`DEFAULT_NUMBERS`, `DEFAULT_LEASING_EXTRAS`, `DEFAULT_MAINTENANCE_VOICE`, `DEFAULT_SUPER_AGENT`, `DEFAULT_CLICK_TO_CALL`, `DEFAULT_OUTBOUND`) so the grid renders correctly on first load.

### Default values and constants

- **Product slots at GA (M=11):** `super_agent_sms`, `click_to_call_sms`, `outbound_default_sms`, `leasing_sms`, `leasing_voice`, `leasing_ivr_text`, `payments_sms`, `maintenance_sms`, `maintenance_voice`, `renewals_sms`. (Click-to-Call has Voice routed by the same SMS-channel record per current Entrata Telecom convention; this single record represents both channels.)
- **N/A determination:** `properties.contract_features.click_to_call === false ⇒ Click-to-Call cell renders as N/A pill (read-only) regardless of registration status.`
- **Row status derivation:**
  ```
  if (registration_status === "active")  ⇒ row state = "Done"  (white background)
  else if (registration_status === "review") ⇒ row state = "Pending" (amber-50 background, PENDING pills per cell)
  else if (registration_status === "awaiting" || privacy_policy_submitted_at === null) ⇒ row state = "Not started" (zinc-50/60 background, em-dash cells)
  ```
- **Unique pending vanity number count (summary chip):**
  ```
  uniquePendingVanityNumbers = COUNT(DISTINCT ai_product_assignments.vanity_number_id)
    WHERE ai_product_assignments.property_id IN (properties WHERE registration_status = 'review')
  ```

### Validation rules

- `phoneNumber` in a PATCH/POST request must match regex `^\(\d{3}\) \d{3}-\d{4}$` and must exist in the company's vanity_numbers pool.
- `productKey` must be one of the GA product slots above.
- `channel` must be one of `sms`, `voice`, `ivr_text` and must be valid for the given `productKey` (e.g., `payments_voice` is rejected because the Payments AI product does not have a voice channel at GA).
- `ifMatch` must match the current `etag` on the `ai_product_assignments` row; otherwise 409.

### Polling cadence and concurrency

- Polling interval: 60 seconds, fixed.
- Polling stops when document is hidden (`document.hidden === true`) and resumes within 500ms of `visibilitychange` event when document becomes visible. This avoids hammering the backend when the user has the tab in the background.
- Polling does NOT poll while a write (PATCH/POST) is in flight; the next scheduled poll is deferred until the write resolves.
- Concurrency on the server side: cell updates use Postgres row-level locking (`SELECT ... FOR UPDATE`) on the `ai_product_assignments` row. The `etag` field is regenerated on every UPDATE via `gen_random_uuid()`.

---

## 6. User Stories

**US-1: As a Regional Leasing Manager, I want to see at-a-glance which of my properties are AI-ready so that I can triage my Monday morning portfolio review in under 5 minutes.**
- AC-1.1: The page shows a summary counter "X Pending Vanity Numbers · Y Properties Not Started" at the top, where X and Y reflect the current portfolio state.
- AC-1.2: The Pending count reflects DISTINCT vanity numbers in flight, not pending properties (so 1 property with 5 pending numbers = 5, not 1).
- AC-1.3: Properties with `registration_status === "active"` render with a white background and no status pills.
- AC-1.4: Properties with `registration_status === "review"` render with amber-50 background and a PENDING pill under every cell, plus a "Pending · Submitted X ago" line in the sticky column.
- AC-1.5: Properties with `registration_status === "awaiting"` render with zinc-50/60 background and `—` em-dashes in every cell.
- AC-1.6: Summary counters update in real time when polling detects a status transition (e.g., Pending → Done).

**US-2: As a Marketing Manager, I want to re-wire the Click-to-Call Default column at multiple properties to a new tracking number so that a launching campaign reports against the right source.**
- AC-2.1: Clicking a Click-to-Call Default cell (when the property has the Click-to-Call contract) opens a dropdown.
- AC-2.2: The dropdown's first option is the cell's current value, followed by an optgroup of the property's other vanity numbers, then an optgroup labeled "— Company —" of the rest of the pool.
- AC-2.3: Selecting a number issues a PATCH and updates the cell value optimistically.
- AC-2.4: An audit log entry is recorded with actor, before/after, and timestamp.
- AC-2.5: An Amplitude event `vanity_config_cell_changed` fires with all the relevant context.

**US-3: As a Property Manager at a freshly-onboarded property, I want to kick off carrier registration from the grid so that I do not need to file a Telecom ticket.**
- AC-3.1: A Not-started cell renders as a dropdown with `—` placeholder, "+ New Vanity Number" at the top, and the company's existing vanity numbers below.
- AC-3.2: Selecting an existing number submits the company's default privacy policy via POST /api/oxp/properties/:id/privacy-policy/submit AND wires the cell.
- AC-3.3: On success, the row flips to Pending immediately (optimistic UI) and all cells show the assigned numbers with PENDING pills.
- AC-3.4: On 422 (no default privacy policy), the cell snaps back to `—` and a red toast surfaces the remediation path.
- AC-3.5: Selecting "+ New Vanity Number" from a Not-started cell opens the Add Vanity Number modal pre-filled with the property's area code — and does NOT submit a privacy policy.

**US-4: As an Entrata CSM, I want to identify properties without Click-to-Call so that I can surface upsell conversations during my customer's QBR.**
- AC-4.1: Properties with `contract_features.click_to_call === false` render an "N/A" pill (gray background, zinc-400 text) in the Click-to-Call column.
- AC-4.2: The N/A pill has a tooltip "Not Contracted" rendered via Radix UI.
- AC-4.3: The N/A pill is keyboard-focusable and the tooltip is announced via `aria-describedby`.
- AC-4.4: Clicking the N/A pill does nothing and does not change focus or fire an Amplitude event (other than the focus-tracking event below).

**US-5: As a View-only user, I want to see the grid render with the same data as Edit-permission users so that I can audit configuration without risk of accidental change.**
- AC-5.1: Every cell renders as a static `<span>` with the same number, status pill, or em-dash that an Edit user sees.
- AC-5.2: No dropdown chevrons render; cells are not keyboard-interactive beyond Tab traversal.
- AC-5.3: The **+ New Vanity Number** entry point is not available from any cell.
- AC-5.4: Not-started cells render `—` as a static span with tooltip "Edit permission required to start registration."
- AC-5.5: Summary counters render identically.

**US-6: As a Regional Leasing Manager polling the grid while waiting for carrier registration to clear, I want the row to transition from Pending to Done without a page reload so that I do not waste time refreshing.**
- AC-6.1: The grid polls `GET /api/oxp/properties/registration-status` every 60 seconds while the document is visible.
- AC-6.2: When a property's status changes from `review` to `active`, the row's background fades from amber-50 to white over 800ms.
- AC-6.3: The PENDING pills under that row's cells are removed.
- AC-6.4: The "Pending · Submitted X ago" line in the sticky column is replaced with empty content.
- AC-6.5: The summary counter "Pending Vanity Numbers" decrements by the number of distinct numbers in that row.
- AC-6.6: An Amplitude event `vanity_config_row_status_changed` fires once per transition with `from`, `to`, and `time_in_review_seconds`.
- AC-6.7: Polling pauses when `document.hidden === true` and resumes within 500ms of `visibilitychange` with `document.hidden === false`.

**US-7: As an Entrata Telecom support engineer investigating a customer's "AI not responding" ticket, I want a comprehensive audit log of who changed which cell when, so that I can correlate misconfigurations to specific operator actions.**
- AC-7.1: Every successful PATCH/POST writes a row to the `cell_change_audit` table with `actor_user_id`, `property_id`, `product_key`, `channel`, `previous_vanity_number_id`, `new_vanity_number_id`, `at`, and `request_id`.
- AC-7.2: The audit log is queryable by Telecom support tooling (existing internal admin panel; out-of-scope for this epic to surface to operators).
- AC-7.3: Audit entries are retained for 7 years per Entrata's standard retention policy.

---

## 7. SDET Test Cases

**TC-7.1: Happy path — Edit user changes a cell in an Active row**
- **Given:** User has `vanity_numbers_edit` permission. Property `p1` has `registration_status = 'active'`. The Leasing AI / SMS cell currently shows `(512) 423-1100`. The company vanity pool contains `(512) 856-3300`.
- **When:** User clicks the cell and selects `(512) 856-3300` from the dropdown.
- **Then:** Client issues `PATCH /api/oxp/properties/p1/ai-products/leasing/sms/vanity-number` with body `{ phoneNumber: "(512) 856-3300", ifMatch: <etag> }`. Server returns 200. The cell renders `(512) 856-3300`. `ai_product_assignments` row updated; `etag` regenerated; `cell_change_audit` row inserted. Amplitude event `vanity_config_cell_changed` fires with the expected properties.

**TC-7.2: Happy path — Edit user kicks off registration from a Not-started row**
- **Given:** Property `p8` has `registration_status = 'awaiting'` and `privacy_policy_submitted_at = NULL`. Company has a default privacy policy on file (`companies.default_privacy_policy_id` is set). User has both `vanity_numbers_edit` and `privacy_policy_edit` permissions.
- **When:** User clicks any cell in the p8 row and selects an existing number `(206) 785-3512`.
- **Then:** Client issues `POST /api/oxp/properties/p8/privacy-policy/submit` with body `{ policySource: "company_default" }` and receives 201. Client then issues `POST /api/oxp/properties/p8/ai-products/super-agent/sms/vanity-number` with body `{ phoneNumber: "(206) 785-3512", kickoffRegistration: true }` and receives 201. The row's background fades to amber-50, all `—` em-dashes are replaced with their assigned vanity numbers (with PENDING pills), the sticky column shows "Pending · Submitted recently", the summary counter "Properties Not Started" decrements by 1 and "Pending Vanity Numbers" increments by the count of distinct numbers in that row. Amplitude event `vanity_config_registration_kicked_off` fires.

**TC-7.3: Error path — Cell change fails with 409 etag mismatch**
- **Given:** User A and User B both have the grid open for the same property's cell. User B changes the cell first (server etag updates). User A's client still holds the stale etag.
- **When:** User A selects a new number from their dropdown and the PATCH issues with the stale `ifMatch`.
- **Then:** Server returns 409 with body `{ "error": "etag_mismatch", "currentEtag": "...", "currentPhoneNumber": "...", "conflictActor": "user_b@example.com" }`. Client snaps the cell back to its original value. Amber toast appears: "This number was changed by user_b@example.com X seconds ago. Refresh to see the latest." Amplitude `vanity_config_cell_change_conflict` fires.

**TC-7.4: Permission gating — View-only user sees grid without dropdowns**
- **Given:** User has `vanity_numbers_view = true` and `vanity_numbers_edit = false`.
- **When:** User navigates to `/communications-setup/phone-numbers`.
- **Then:** Grid renders with all 16 properties, all 11 sub-columns, all status pills and counters. Every cell is rendered as a static `<span>` with no `<select>` and no chevron icon. Not-started cells render `—` as a static `<span>` with tooltip "Edit permission required to start registration." Amplitude `vanity_config_grid_viewed_readonly` fires with `read_only_reason = "missing_edit_permission"`.

**TC-7.5: Polling — Pending row flips to Done without page reload**
- **Given:** Property `p5` is in `registration_status = 'review'`. User has the grid open. The polling interval is mocked to 1 second for the test.
- **When:** On poll N, the test harness flips `p5.registration_status` to `'active'` server-side. The next poll returns the new status.
- **Then:** Within 1 second of the next successful poll, the row's background fades from amber-50 to white over 800ms, PENDING pills are removed, the "Pending · Submitted X ago" line in the sticky column is replaced with empty content, and the summary counter "Pending Vanity Numbers" decrements. Amplitude `vanity_config_row_status_changed` fires exactly once with `from: 'review'`, `to: 'active'`, and a numeric `time_in_review_seconds`.

**TC-7.6: Polling pause on tab hidden**
- **Given:** User has the grid open and visible; polling has run at least once.
- **When:** Test harness dispatches `document.dispatchEvent(new Event("visibilitychange"))` with `document.hidden = true`.
- **Then:** No further polling requests are issued (network interceptor records 0 GET `/registration-status` calls in next 60 seconds). When the test then sets `document.hidden = false` and dispatches `visibilitychange` again, a polling request is issued within 500ms.

**TC-7.7: N/A pill — Click-to-Call cell is not interactive for not-contracted properties**
- **Given:** Property `p2` has `contract_features.click_to_call = false`. User has Edit permission.
- **When:** User navigates to the grid and inspects the Click-to-Call column for p2.
- **Then:** Cell renders an "N/A" pill (zinc-100 background, zinc-400 text). The element has `role="status"` and `aria-describedby` pointing to a tooltip element with text "Not Contracted". Clicking or pressing Enter on the pill does NOT open a dropdown, does NOT issue any API call, and does NOT fire `vanity_config_cell_changed`. Keyboard focus is accepted and the tooltip is announced via the `aria-describedby` reference.

**TC-7.8: + New Vanity Number — opens modal pre-filled with property area code**
- **Given:** User has Edit permission. Property `p5` (Cambridge Suites, Phoenix, AZ, area code 602) row is rendered.
- **When:** User clicks any cell in the p5 row and selects "+ New Vanity Number" from the top of the dropdown.
- **Then:** The DEV-304152 Add Vanity Number modal opens. The modal's Area Code input is pre-filled with `602`. The Toll-Free toggle is off. The modal's other defaults are the DEV-304152 defaults. Amplitude `vanity_config_new_number_initiated_from_cell` fires with `was_row_status` set to the row's current status. The cell that triggered the modal does NOT update on modal close — the user has to click the cell again to assign the new number.

---

## 8. Amplitude Events

| Event Name | Trigger | Properties (name: type) |
|---|---|---|
| `vanity_config_page_viewed` | Grid component mounts | `company_id: string`, `user_role: string`, `portfolio_size: number`, `summary_pending_count: number`, `summary_not_started_count: number` |
| `vanity_config_grid_viewed_readonly` | Grid renders with no Edit permission | `user_id: string`, `read_only_reason: string` |
| `vanity_config_cell_changed` | Successful PATCH on a cell | `property_id: string`, `product_slot: string`, `old_number: string`, `new_number: string`, `row_status: string` |
| `vanity_config_cell_change_denied` | PATCH returns 403 | `property_id: string`, `slot: string`, `reason: string` |
| `vanity_config_cell_change_conflict` | PATCH returns 409 (etag mismatch) | `property_id: string`, `slot: string`, `conflict_actor: string` |
| `vanity_config_cell_change_failed` | PATCH fails after retries (network / 5xx) | `property_id: string`, `slot: string`, `reason: string`, `retry_count: number` |
| `vanity_config_registration_kicked_off` | Successful Not-started → Pending kickoff | `property_id: string`, `picked_number: string`, `slot: string`, `total_distinct_numbers_in_row: number` |
| `vanity_config_registration_kickoff_failed` | Privacy-policy submission fails (422/403) | `property_id: string`, `slot: string`, `reason: string` |
| `vanity_config_row_status_changed` | Polling detects status transition | `property_id: string`, `from: string`, `to: string`, `time_in_review_seconds: number` |
| `vanity_config_status_poll_degraded` | 3 consecutive polling failures | `consecutive_failures: number`, `last_successful_poll_at: ISO8601` |
| `vanity_config_new_number_initiated_from_cell` | User selects "+ New Vanity Number" from a cell | `property_id: string`, `slot: string`, `was_row_status: string` |
| `vanity_config_assigned_pending_number` | User picks a number that is itself Pending | `property_id: string`, `assigned_number: string`, `slot: string` |
| `vanity_config_na_pill_focused` | N/A pill receives keyboard focus | `property_id: string`, `slot: string` |
| `vanity_config_empty_portfolio` | Grid loads with 0 properties | `user_id: string`, `company_id: string` |
| `vanity_config_new_number_unavailable` | Cell dropdown opened but DEV-304152 not deployed | `reason: string` |

---

## 9. Success Metrics (AARRR)

| Stage | Metric | Target | Measurement | Timeline |
|---|---|---|---|---|
| **Acquisition** | % of OXP-enabled users who visit the Vanity Number Settings page in the first 14 days post-enablement | ≥ 65% | Amplitude `vanity_config_page_viewed` unique users / total OXP-enabled users with View permission | 14 days post-GA |
| **Activation** | % of visiting Edit-permissioned users who change at least 1 cell within 14 days | ≥ 40% | Amplitude `vanity_config_cell_changed` unique users / `vanity_config_page_viewed` unique users (Edit-permissioned subset) | 14 days post-GA |
| **Activation** | Median time-to-first-cell-change after first page view | ≤ 90 seconds | Time delta between user's first `vanity_config_page_viewed` and first `vanity_config_cell_changed` | 14 days post-GA |
| **Activation** | % of Not-started rows where user kicks off registration via the grid (vs. via Telecom ticket) | ≥ 70% | Count of `vanity_config_registration_kicked_off` events / total Not-started → Pending transitions in same period | 30 days post-GA |
| **Retention** | % of users who view the page in week 1 who also view in weeks 2, 3, 4 | ≥ 50% | Cohort retention from Amplitude `vanity_config_page_viewed` | 30 days post-GA |
| **Retention** | Median sessions per user per month after first cell change | ≥ 4 | `vanity_config_page_viewed` events grouped per user per calendar month | 90 days post-GA |
| **Referral** | Net Promoter Score delta on the "Vanity Number Management" sub-survey | +15 NPS points vs. baseline | Existing OXP NPS sub-survey added 90 days post-GA, compared to the 90 days pre-enablement baseline | 90 days post-GA |
| **Revenue** | Reduction in Entrata Telecom support tickets tagged "vanity number assignment" | -75% vs. 30-day pre-enablement baseline | Zendesk / Salesforce ticket volume tagged `vanity_number_assignment` | 60 days post-GA |
| **Revenue** | Click-to-Call upsell conversions sourced from the grid (CSM identifies N/A pills during QBR → contract amendment) | ≥ 8 conversions in first quarter | CSM-tagged opportunities in Salesforce with source = "OXP Vanity Grid QBR Discovery" | 90 days post-GA |

---

## 10. Feature Flag & Rollback

**Flag key:** `oxp_vanity_number_configuration_grid`
**Type:** Company-level
**Default at GA:** ON for all OXP-enabled companies

### ON behavior

- Vanity Number Configuration grid renders at the top of `/communications-setup/phone-numbers`.
- All described endpoints are reachable.
- Polling loop starts on mount.
- Audit logging on every PATCH/POST.

### OFF behavior

- Grid does not render. The page falls back to showing only the DEV-304152 lower section (if that flag is also ON).
- All endpoints continue to return 200 (do not 404 endpoints — internal tooling and the DEV-304152 lower table also depend on `GET /api/oxp/properties/grid-state` for the company vanity pool).
- No polling.
- No new Amplitude events fire (the page-load `vanity_config_page_viewed` event does not fire when the grid does not render).

### Rollback procedure

1. **Identify the problem.** Monitor PagerDuty alert `oxp_vanity_grid_error_rate_5xx` (target: < 0.5% of requests). If 5xx rate exceeds 2% sustained for 5 minutes, page on-call.
2. **Disable the flag.** Internal admin tool: `Setup >> Internal >> Feature Flags >> oxp_vanity_number_configuration_grid >> Disable`. Takes effect for new page loads within 30 seconds (active sessions continue to render the grid until their next navigation).
3. **Validate the rollback.** Check Datadog dashboard `OXP Vanity Grid` → "Page Views Last 5 min" should drop to baseline within 10 minutes. 5xx rate should return to < 0.5%.
4. **Communicate the rollback.** PagerDuty post-mortem channel; CSM notification template (`templates/csm_outage_vanity_grid.md`) for affected customers.

### Data safety

- Disabling the flag does NOT remove or modify any `ai_product_assignments` records. All cell wirings remain in the database; they simply are not surfaced via the OXP grid.
- Legacy Entrata's `Contact Methods` page reads the same `ai_product_assignments` table (post-migration) and continues to function regardless of the OXP grid's flag state.
- No vanity numbers are unregistered with the carrier on rollback. AI traffic continues to flow.

### Emergency escalation

- On-call rotation: `#oxp-platform-on-call` (PagerDuty).
- Secondary: Entrata Telecom on-call.
- Tertiary: VP Engineering (Slack DM).
- Communications playbook: `playbooks/vanity_grid_incident.md`.

---

## 11. Vertical Impact Deviation Matrix

| Vertical | Required? | Type | Summary | Notes |
|---|---|---|---|---|
| Residential (conventional multifamily) | Yes | Standard | Full grid renders with all GA product slots. No vertical-specific deviation. | Primary GA target. |
| Commercial (office, retail) | Yes | Reduced | Grid renders but the AI product columns are different — Commercial-AI agents replace the Residential set per the Commercial product roadmap. Column set is driven by `product_slots_for_vertical("commercial")` server-side. | Out of scope to ship the Commercial columns in this epic — the grid component supports a per-vertical column set, but only the Residential column set is shipped at GA. Commercial column set lands in a follow-up. |
| Affordable | Yes | Standard | Same as Residential. Privacy-policy submission flow uses the company's default privacy policy — affordable-specific privacy policy language is on the same `Marketing >> Privacy Policy >> Default` field. | No deviation. |
| Student | Yes | Standard | Same as Residential. | No deviation. |
| Military | Yes | Standard | Same as Residential. | No deviation. |
| Senior | Yes | Standard | Same as Residential. | No deviation. |
| HOA | No | N/A | HOA customers do not have OXP enabled at this time. The grid is gated by the OXP enablement flag at the company level. | Out of scope. |

---

## 12. Accessibility

### Keyboard navigation

- Tab order: summary counters → sticky property name link → first row, first cell → continues across the row, then to next row. Sticky column is skipped on subsequent rows (the property name is announced via screen reader as part of the row context, not re-Tabbed every time).
- Arrow keys: within an open `<select>` dropdown, Up/Down navigates options, Enter selects, Escape closes without selecting.
- Page Up / Page Down inside the table: scrolls one viewport vertically; focus follows the visible row.
- Cmd/Ctrl + F: standard browser find; does not override.

### Focus management

- After a cell change PATCH completes (success or failure), focus returns to the same cell that triggered the change.
- After the Add Vanity Number modal closes (success or cancel), focus returns to the cell that triggered it.
- After the privacy-policy kickoff toast appears, focus does not move (the user is still in the cell); the toast has `role="status"` and is announced by screen readers.

### ARIA roles and labels

- `<table>` has `role="grid"` and `aria-label="Vanity Number Configuration. Rows are properties; columns are AI product slots."`.
- Each `<select>` has `aria-label="Assign vanity number for {propertyName} {slotLabel}"` (e.g., "Assign vanity number for Cambridge Suites Leasing AI SMS").
- N/A pills have `role="status"` and `aria-describedby` pointing to the tooltip element.
- The summary counters have `aria-live="polite"` so screen readers announce changes when polling updates them.
- Each pending pill has `aria-label="Pending carrier registration. Submitted {humanReadableTime}."`.
- The sticky column's "Pending · Submitted X ago" text uses `<time datetime="ISO8601">` for assistive parsing.

### Color contrast (WCAG AA / AAA targets)

- Property name (zinc-900 on white): contrast ratio 16.0:1 (AAA).
- City/state + area code badge (zinc-500 on zinc-100): contrast ratio 4.8:1 (AA).
- Pending pill amber-700 on amber-50: contrast ratio 4.7:1 (AA).
- Not started em-dash (zinc-400/70 on zinc-50/60): contrast ratio 3.4:1 — **below AA for text but acceptable for non-essential decorative state indicator**. Not-started status is also conveyed by the row background color and the summary counter, so the em-dash is not the sole signal.
- N/A pill (zinc-400 on zinc-100): contrast ratio 3.6:1 — **same caveat: state also conveyed by tooltip and column header.**
- Active number cells (zinc-900 on white): contrast ratio 16.0:1 (AAA).

### Screen reader behavior

- Grid loads: NVDA / JAWS / VoiceOver announce "Vanity Number Configuration. 16 rows. 12 columns. Row 1 of 16: Harvest Peak Capital, Austin, TX, 512. Status: active. …"
- Cell change: announces "Leasing AI SMS for Cambridge Suites updated from 6 0 2 5 4 2 1 5 0 0 to 8 4 4 8 1 5 0 5 7 0."
- Status transition (Pending → Done): announces "Cambridge Suites status changed from Pending to active."

### Reduced motion

- The row background fade from amber-50 to white on status transition respects `prefers-reduced-motion: reduce`. When set, the transition is instant (0ms) instead of 800ms.

### Touch / pointer

- All `<select>` triggers have a minimum touch target of 44×44 CSS pixels per WCAG 2.2 (despite the visual cell height being smaller, the click target extends to fill the cell).

---

## Appendix A — Existing Codebase References

The Vanity Number Configuration grid is implemented in `app/communications-setup/phone-numbers/page.tsx`. Existing patterns to follow:

- **Status state machine.** `INITIALLY_ACTIVE`, `INITIALLY_IN_REVIEW`, and the derived `awaitingIds` set demonstrate the three-state model. The production implementation replaces these in-memory Sets with the `properties.registration_status` field read from the API.
- **Status pill rendering.** `renderCell()` in `page.tsx` (the inline function inside the `PROPERTIES.map` block) is the single source of truth for the three rendering branches: awaiting (dropdown with em-dash placeholder), review (pending pill under the value), active (plain content). Production should preserve this pattern.
- **N/A treatment.** `CLICK_TO_CALL_NOT_CONTRACTED` is a hardcoded `Set` in the prototype; production replaces with `properties.contract_features.click_to_call`.
- **Dropdown options.** `vanityOptionsForProperty(propId, currentValue)` returns `{ propNums, companyNums }` — the per-property optgroup + the company-wide optgroup. Production uses the API-loaded `vanityNumberPool` and the property's own `assignments` map.
- **Sticky left column.** The property column uses `position: sticky; left: 0;` with a per-row background color override (`stickyBg`) so the sticky column visually merges with its row's background. Production preserves this CSS approach.
- **Add Vanity Number modal entry point.** `openAddVanityModal()` is invoked from every cell's `+ New Vanity Number` option. The modal itself is the one shipped in DEV-304152.

The prototype uses in-memory React state for `vanityNumbers`, `activeIds`, `inReviewIds`. The production implementation replaces those with React Query subscriptions to `/api/oxp/properties/grid-state` and `/api/oxp/properties/registration-status`. The component's render logic and interaction model are otherwise identical.
