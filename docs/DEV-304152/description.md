# Engineering Spec — DEV-304152 — OXP Vanity Phone Numbers Section

> **Audience:** Engineers (EM, SDET, frontend, backend, telecom integration). This is the engineering spec that lives on the Jira epic description field. Non-engineer content (Before, After, FAQs, etc.) lives in the FE Doc custom fields on this same epic.
>
> **Scope:** Operator-facing CRUD surface for vanity phone numbers inside OXP (Communications Setup >> Vanity Number Settings >> bottom of page). Mirrors the existing legacy `Setup >> Property >> Contact Methods >> Vanity Phone Numbers` admin surface and adds a per-property filter that does not exist in legacy. Read/write goes through the existing Vanity Phone Numbers service that legacy Entrata already calls — this epic is **not** introducing a new datastore, a new Twilio integration, or new permissions.

---

## 1. Problem Definition

### 1.1 What does the production state look like today?

OXP (Entrata's dedicated Communications product, GA in [INSERT: actual GA quarter]) has no UI surface for managing vanity phone numbers. The data lives in the existing Entrata Vanity Phone Numbers store (backed by Twilio-provisioned numbers and the customer's carrier 10DLC campaign registrations). The only UI today is `Setup >> Property >> Contact Methods >> Vanity Phone Numbers` inside legacy Entrata.

Operators who live in OXP (property managers, marketing managers, regional leasing managers) must therefore round-trip to legacy Entrata every time a vanity number needs to be added, edited, retested, or deleted. The round-trip averages 6–10 minutes of pure navigation (sign in to legacy, find property, navigate to Contact Methods, find row, perform the edit, save, return to OXP) per change. Across a portfolio of 30 properties touched 3–6 times per property per month, this is an estimated 6–25 person-hours per month of pure context-switch overhead per portfolio.

### 1.2 What customer-visible behavior changes?

A new "Vanity Phone Numbers" section appears at the bottom of `Communications Setup >> Vanity Number Settings` in OXP. It contains:

- A property filter dropdown ("All Properties" default + every property the user has access to)
- A vanity number table mirroring the columns/data shown on the legacy Contact Methods Vanity Phone Numbers page
- "+ Add Vanity Number" button → modal (Select Preferences form)
- Pencil-icon row Edit action → modal (Edit Vanity Number form, with Retest + Delete inside)
- Delete confirmation modal (with carrier filtering warning)

The legacy `Setup >> Property >> Contact Methods >> Vanity Phone Numbers` page is unchanged and continues to work. Both surfaces read/write the same underlying records.

### 1.3 Quantified impact formula

`per-touch round-trip time × touches per property × properties per portfolio = monthly operator hours saved`

- Per-touch round-trip time saved: **6–10 minutes** → use midpoint 8 min.
- Touches per property per month: **3–6** → use midpoint 4.5.
- Properties per regional manager: **8–15**, per marketing manager: **portfolio-wide (30–120)**.

For a representative 30-property customer: 8 min × 4.5 × 30 = **18 hours/month saved on context switching per portfolio.** [INSERT: Customer-specific quantification if available.]

### 1.4 Strategic / "why now" pressure

- **OXP-first GA promise** — the OXP product narrative is that operators run their whole leasing/marketing/maintenance/renewals communication without legacy Entrata. Telephony admin is the single biggest remaining surface forcing them back to legacy. [INSERT: Sales-cycle objection data, design-partner cite, named ARR-at-risk customer.]
- **Competitive parity** — [INSERT: Named competitor that ships in-product telephony admin alongside communications.]
- **10DLC enforcement** — Carriers (T-Mobile, AT&T, Verizon) penalize unregistered or stale-registration SMS traffic with deliverability degradation. The SMS Registration Status badge surfaced in OXP makes it materially more likely that OXP-primary staff notice a stale registration before a campaign sends.

### 1.5 User personas (engineering view — see FE Doc "Who" for non-engineer detail)

- **Property Manager** — single-property read/write; uses property filter set to their property; ~3–6 touches/month/property.
- **Marketing Manager** — portfolio-wide read/write; uses "All Properties" view + lead-source attribution; ~10–30 touches/week portfolio-wide.
- **Regional Leasing Manager** — multi-property read; uses property filter to spot-check 8–15 properties.
- **Implementation Specialist (Entrata-internal)** — uses the section during customer onboarding to validate per-property vanity setup.
- **Telecom / Compliance Admin (Entrata-internal)** — uses the section to monitor registration freshness and trigger retests.

---

## 2. Solution — Workflows

Five workflows below cover the complete operator surface. Each flow is numbered step-by-step from entry to outcome.

### Flow 1 — View vanity numbers filtered to a single property

1. User navigates to `Communications Setup >> Vanity Number Settings` in OXP. (Existing route — this epic does not add a new route.)
2. Page renders the existing per-product number assignment table at the top, then renders the new "Vanity Phone Numbers" section below it when `oxp_communications_vanity_numbers_section` flag is ON.
3. Section header: "Vanity Phone Numbers" + a property-filter dropdown defaulted to "All Properties" + a "+ Add Vanity Number" button (hidden if the user lacks Edit permission).
4. User opens the property dropdown and selects "Cedar Ridge Estates".
5. Table updates client-side to show only rows where `propertyId === 'p10'` (Cedar Ridge in the seed data). Row count badge updates to reflect the filtered count. The filter selection is persisted to `sessionStorage` under key `oxp.vanity.filter.propertyId` for the user's current session.
6. User scrolls the table horizontally if needed (min-width 1540px ensures all columns render at full data density on a 1080p+ display).
7. Amplitude event `oxp_vanity_filter_applied` fires with `{ property_id: 'p10', visible_row_count: N, total_row_count: M, source: 'dropdown' }`.

### Flow 2 — Happy path: Add a new vanity number for a property

1. User clicks "+ Add Vanity Number" (requires Edit permission).
2. **Add Vanity Number** modal opens with title "Add Vanity Number" + a "Select Preferences" tab selected by default.
3. Form fields (top → bottom):
   - **Phone Number Type:** read-only label "Company Vanity Number" with an info tooltip explaining "A company vanity number is a shared number that can be assigned across multiple properties and configured for various purposes, including Super Agent AI, Click To Call Default, and Outbound Default." This release does not support Property-only vanity numbers — that variant is planned for a later epic.
   - **Toll-Free:** boolean toggle (default `No`).
   - **Area Code:** 3-digit numeric input, visible only when Toll-Free = No. Allowed: any valid US/Canada area code; validation `/^[2-9][0-8][0-9]$/` (NANP rules).
   - **Forward Preference:** dropdown (`Office Contacts` | `IVR` | `Specific Number`). Default `Specific Number`.
   - **Use for SMS:** toggle. **Locked to Yes** in this release (all new vanity numbers ship SMS-enabled). Future epic adds the ability to provision SMS-disabled voice-only numbers.
   - **Outbound Default:** conditional toggle visible only when Use for SMS = Yes. Default `No`. If toggled `Yes`, the current Outbound Default for the same property is automatically demoted on submit.
   - **Expiration Date:** date picker, optional. If provided, must be ≥ today.
4. User clicks "Submit" (or "Save").
5. Frontend validates client-side: required fields present, area code matches NANP regex (or Toll-Free = Yes), expiration date in the future or empty.
6. Frontend submits `POST /api/v1/oxp/vanity-numbers` with the payload (see § 4.2).
7. Backend forwards to the existing Vanity Phone Numbers service which (a) queues a Twilio number-allocation request and a 10DLC/short-code carrier registration request, (b) writes a new `vanity_phone_numbers` row in `state = pending_carrier_review`, (c) returns 201 with the new row.
8. Modal closes. New row appears at the top of the table with SMS Registration Status = "In Review (submitted just now)" badge.
9. Amplitude event `oxp_vanity_added` fires with `{ vanity_number_id, property_id, toll_free, forward_preference, use_for_sms, outbound_default, has_expiration }`.
10. Toast "Vanity number request submitted — typical carrier approval is 1–2 business days." appears for 5 seconds.

### Flow 3 — Edit + Retest existing vanity number

1. User clicks the pencil icon on row `v17` (Cedar Ridge Estates, `(844) 449-7340`, Type = Lead).
2. **Edit Vanity Number** modal opens, prefilled with the row's current configuration: Forward Preference, Route Calls (formatted `(360) 743-7837` from raw `3607437837`), Lead Source ("Internet-Zumper"), Use for SMS (toggle = on), Outbound Default (toggle = off — not visible because Outbound Default only renders when current toggle state lets it; actually rendered conditionally below the SMS toggle), Expiration Date (empty), AI Bailout Number (toggle = off).
3. If the row is associated with at least one lead source, an inline yellow warning text appears below the header: "This vanity number is associated with at least one lead source, please disassociate before changing the number type."
4. User clicks "Retest Vanity Number" button (top-right of modal body). An inline green success banner appears: "We are now testing `(844) 449-7340` which can take up to ten minutes." The banner persists until the modal is closed.
5. Backend kicks off a `POST /api/v1/oxp/vanity-numbers/{id}/retest` request which queues a Twilio number-health re-check + SMS registration freshness check.
6. User edits Lead Source — opens the dropdown, selects "Internet-ApartmentList".
7. User edits Forward Preference — leaves at "Specific Number".
8. User clicks "Save".
9. Frontend submits `PUT /api/v1/oxp/vanity-numbers/{id}` with `{ leadSource: 'Internet-ApartmentList', forwardPreference: 'Specific Number', ... }`.
10. Modal closes. Table row updates client-side with new Lead Source value. Server-side updates `Marketing >> Lead Sources` attribution accordingly.
11. Amplitude `oxp_vanity_edited` fires with `{ vanity_number_id, fields_changed: ['leadSource'], property_id }`.
12. Within 10 minutes, the SMS Registration Status badge refreshes (from server push or table-level polling) to show "Verified on MM/DD/YYYY" if the retest passed.

### Flow 4 — Delete vanity number (with carrier warning)

1. User opens the Edit modal on row `v3` (a SMS Only number that's been deprecated).
2. User clicks "Delete" button (bottom-left of Edit modal footer).
3. Edit modal closes; **Delete Register Vanity Phone Number** confirmation modal opens.
4. Body text: "Please confirm that you want to delete registration of this number. After the registration is deleted any messages sent from this number will be at a higher risk of being blocked by carrier filtering."
5. User clicks "Yes Delete Registration".
6. Frontend submits `DELETE /api/v1/oxp/vanity-numbers/{id}`.
7. Backend (a) removes the row from `vanity_phone_numbers`, (b) submits a deregistration request to Twilio + the carrier, (c) preserves audit history (`vanity_phone_numbers_audit` table — who, when, prior state).
8. Modal closes. Row is removed from the OXP table immediately.
9. Amplitude `oxp_vanity_deleted` fires with `{ vanity_number_id, property_id, prior_type, prior_sms_status, days_since_creation }`.
10. Toast "Vanity number `(206) 785-3512` deregistration submitted." appears for 5 seconds.

### Flow 5 — Toggle Outbound Default (with automatic demotion advisory)

1. User edits row `v18` (Riverstone Landing, currently Outbound Default = No).
2. User toggles **Use for SMS** = Yes (if not already).
3. **Outbound Default** toggle becomes visible. User toggles Outbound Default = Yes.
4. Inline yellow advisory appears beneath the toggle: "By adding this number, Outbound Default will no longer be associated with `(360) 364-3810`." (Where `(360) 364-3810` is the property's current Outbound Default vanity number, looked up on the fly.)
5. User clicks "Save".
6. `PUT /api/v1/oxp/vanity-numbers/{id}` is submitted with `{ outboundDefault: true }`.
7. Backend transactionally (a) updates the current row → `outbound_default = true`, (b) demotes any other row for the same `property_id` where `outbound_default = true` to `false`.
8. Both rows in the table refresh client-side. Toast confirms: "Outbound Default moved to `(844) 878-3230`."
9. Amplitude `oxp_vanity_outbound_default_changed` fires with `{ vanity_number_id, property_id, demoted_vanity_number_id }`.

### Flow 6 — User without Edit permission

1. User navigates to `Communications Setup >> Vanity Number Settings`.
2. Section renders. Property filter is interactive.
3. "+ Add Vanity Number" button is **not rendered**.
4. Each row's pencil-icon Edit action is **not rendered**.
5. The table is read-only. Status badges and Caller ID indicators still render normally.
6. Amplitude `oxp_vanity_viewed` fires with `{ permission_level: 'view', visible_row_count, total_row_count }`.

---

## 3. Error & Failure States

| Trigger | UX Response | Recovery Path | Amplitude Event |
|---|---|---|---|
| Frontend client-side validation fails on Area Code (e.g., user enters `1XX` or non-numeric) | Inline red error under field: "Enter a valid US area code (e.g., 512)" + Save button disabled | User corrects the field | `oxp_vanity_validation_failed { field: 'area_code', reason }` |
| Add: backend returns 409 (number already exists in this customer's Twilio account) | Modal stays open + red error banner at top: "A vanity number with this configuration already exists. View existing." with a link that opens the existing row's Edit modal | User reviews existing row | `oxp_vanity_add_conflict { dup_vanity_number_id }` |
| Add: backend returns 422 (carrier rejected campaign registration) | Modal closes; toast "Carrier rejected this number request. See details." with a link to a server-rendered error detail panel that shows the carrier's rejection reason verbatim | User adjusts (e.g., privacy policy submission), retries Add | `oxp_vanity_carrier_reject { reason_code }` |
| Edit: PUT returns 422 (Route Calls destination is invalid, e.g., not a 10-digit US/Canada number) | Inline red error under Route Calls field: "Enter a valid 10-digit US/Canada number" + Save button stays enabled but submission is blocked | User corrects Route Calls | `oxp_vanity_validation_failed { field: 'route_calls', reason }` |
| Edit: PUT returns 422 (Expiration Date in the past) | Inline red error under Expiration Date: "Expiration date must be today or later" + Save blocked | User corrects | `oxp_vanity_validation_failed { field: 'expiration_date', reason }` |
| Edit: PUT returns 403 (user's permission was revoked between modal open and submit) | Modal closes; toast "Your permission to edit vanity numbers was revoked. Refreshing." + page auto-reloads | User contacts admin | `oxp_vanity_edit_forbidden { vanity_number_id }` |
| Retest: POST returns 429 (rate-limited — too many retests for this number in the last hour) | Banner inside Edit modal: "Retest is rate-limited — please wait `MM:SS` before retesting `(XXX) XXX-XXXX` again." (countdown driven by server-supplied `retry_after` header) | User waits or retests a different number | `oxp_vanity_retest_rate_limited { vanity_number_id, retry_after_seconds }` |
| Delete: confirmation modal is dismissed via `Esc` mid-deletion | Confirmation modal closes; no DELETE is sent; row remains in table | n/a | `oxp_vanity_delete_cancelled { vanity_number_id }` |
| Delete: DELETE returns 409 (number is the only Outbound Default for the property) | Confirmation modal stays open + red error banner: "This number is the property's Outbound Default. Promote another vanity number to Outbound Default before deleting." | User opens another row, toggles Outbound Default = Yes, then re-attempts delete | `oxp_vanity_delete_blocked_outbound_default { vanity_number_id, property_id }` |
| Any request: network failure / 5xx | Toast "Couldn't reach the vanity number service. Retrying…" + automatic retry up to 3 times with exponential backoff (1s, 3s, 9s). If all retries fail, the modal stays open with entered data preserved and the toast becomes a red "Unable to save — please try again later." | User tries again later | `oxp_vanity_network_error { method, status, attempt }` |
| Table load: GET /vanity-numbers returns 5xx | Section renders an empty state with retry button: "Couldn't load vanity numbers. [Retry]" instead of the table | User clicks Retry | `oxp_vanity_load_failed { status }` |
| Lead Source dropdown fails to load (Marketing >> Lead Sources unreachable) | Dropdown disabled with placeholder "Couldn't load lead sources — refresh to retry." + Save still allowed (Lead Source field remains unchanged on submit) | User refreshes the page | `oxp_vanity_lead_sources_load_failed { status }` |

---

## 3.5. Loading & Empty States

| State | UX |
|---|---|
| Section is mounting (initial GET in flight) | Section header renders immediately; table area shows skeleton placeholder (8 shimmer rows for 1.5s max) |
| Customer has zero vanity numbers (GET returns empty list) | Header still renders; below it, a card: "No vanity phone numbers yet. [+ Add Vanity Number]" with the same Add button affordance |
| Filter set to a property that has no rows | Table empty state: "No vanity numbers for {Property Name}. [+ Add Vanity Number for {Property Name}]" (Add prefills the property selection when opened from this state) |
| Add modal: in-flight POST | "Submit" button shows inline spinner + label changes to "Submitting…"; modal cannot be dismissed except via Cancel |
| Edit modal: in-flight PUT | "Save" button shows inline spinner + label "Saving…"; other interactive fields remain enabled but Save/Delete/Retest disabled |
| Retest in flight | Banner stays visible until the user closes the modal OR until the retest result fires (server push or 60s table-level poll picks it up, whichever first) |
| Lead Source dropdown loading | Dropdown shows placeholder "Loading lead sources…" + spinner; disabled until load completes |
| User without Edit permission | "+ Add Vanity Number" hidden; row Edit/Delete actions hidden; table renders normally |
| `oxp_communications_vanity_numbers_section` flag = OFF | Section does not render at all; existing per-product number assignment table at top of page is unaffected |

---

## 4. API Contracts

Endpoints are exposed under the OXP API gateway (`/api/v1/oxp/...`). All requests require a valid OXP session cookie and CSRF token. All responses are JSON with `Content-Type: application/json; charset=utf-8`. The OXP API gateway forwards each call to the existing Vanity Phone Numbers service — the underlying contract used by legacy Entrata is preserved; this epic adds an OXP-namespaced wrapper.

### 4.1 GET /api/v1/oxp/vanity-numbers

List vanity numbers for the calling user's company.

**Query parameters:**

| Param | Type | Required | Notes |
|---|---|---|---|
| `propertyId` | string | No | If provided, filter to that property only. Maps to internal `property_id`. Defaults to all properties the user has access to. |
| `limit` | integer | No | Default 500, max 2000. |
| `cursor` | string | No | Opaque pagination cursor returned by previous response. |
| `includeArchived` | boolean | No | Default `false`. If `true`, include rows where `state = deleted` (only available to Entrata-internal users with the `vanity_admin` flag). |

**Success response (200):**

```json
{
  "data": [
    {
      "id": "v17",
      "propertyId": "p10",
      "propertyName": "Cedar Ridge Estates",
      "phoneNumber": "(844) 449-7340",
      "rawPhoneNumber": "8444497340",
      "type": "Lead",
      "leadSource": "Internet-Zumper",
      "forwardPreference": "Specific Number",
      "routeCalls": "(360) 743-7837",
      "rawRouteCalls": "3607437837",
      "smsRegistrationStatus": "Verified",
      "smsRegistrationVerifiedAt": "2024-08-12T14:30:00Z",
      "smsEnabled": true,
      "outboundDefault": false,
      "expirationDate": null,
      "callerIdRegistered": true,
      "aiBailoutNumber": false,
      "tollFree": false,
      "createdAt": "2024-06-04T09:00:00Z",
      "updatedAt": "2026-02-11T16:45:00Z"
    }
  ],
  "pagination": { "nextCursor": null, "totalCount": 18 }
}
```

**Error responses:** 401 (unauthenticated), 403 (no `Setup >> Property >> Contact Methods >> Vanity Phone Numbers >> View` permission), 500.

**Rate limiting:** 60 requests / minute / user.

### 4.2 POST /api/v1/oxp/vanity-numbers

Create a new vanity number request (queued with Entrata Telecom + carrier).

**Request body:**

```json
{
  "propertyId": "p10",
  "tollFree": false,
  "areaCode": "512",
  "forwardPreference": "Specific Number",
  "useForSms": true,
  "outboundDefault": false,
  "expirationDate": null
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `propertyId` | string | Yes | Must be a property the user has Edit permission on. |
| `tollFree` | boolean | Yes | If `true`, `areaCode` must be omitted or null. |
| `areaCode` | string | Conditional | Required when `tollFree = false`. Must match `/^[2-9][0-8][0-9]$/`. |
| `forwardPreference` | enum | Yes | One of `Office Contact`, `IVR`, `Specific Number`. |
| `useForSms` | boolean | Yes | Locked to `true` in this release; server rejects `false` with 400. |
| `outboundDefault` | boolean | Yes | If `true`, the property's current Outbound Default is demoted in the same transaction. |
| `expirationDate` | string \| null | No | ISO-8601 date (YYYY-MM-DD). Must be ≥ today or null. |

**Success response (201):**

```json
{
  "data": {
    "id": "v_newly_provisioned_id",
    "state": "pending_carrier_review",
    "estimatedReviewCompletion": "2026-04-29T17:00:00Z",
    "row": { /* same shape as 4.1 row */ }
  }
}
```

**Error responses:**

- `400` — invalid payload (e.g., `useForSms: false`, bad area code). Body: `{ error: { code: 'INVALID_PAYLOAD', field, message } }`.
- `403` — no Edit permission on `propertyId`.
- `409` — duplicate (a vanity number for this property + area code + forward preference already exists in `pending_carrier_review`). Body includes `existingVanityNumberId`.
- `422` — carrier rejected the campaign registration (e.g., property hasn't submitted privacy policy). Body includes `carrierReason`.
- `429` — rate limited (> 10 Add requests per user per hour).
- `500` — internal.

### 4.3 PUT /api/v1/oxp/vanity-numbers/{id}

Edit an existing vanity number's configuration.

**Path:** `id` — vanity number id.

**Request body** (all fields optional; partial update; only provided fields are written):

```json
{
  "forwardPreference": "Specific Number",
  "routeCalls": "3607437837",
  "leadSource": "Internet-ApartmentList",
  "useForSms": true,
  "outboundDefault": false,
  "expirationDate": null,
  "aiBailoutNumber": false
}
```

| Field | Validation |
|---|---|
| `routeCalls` | 10-digit US/Canada number. Server normalizes to raw 10 digits before write. |
| `leadSource` | Must be an active lead source in `Marketing >> Lead Sources` for the same company. |
| `expirationDate` | Must be ≥ today or null. |

**Success response (200):** `{ "data": { /* updated row, same shape as 4.1 */ } }`.

**Error responses:** 400, 403, 404 (vanity number not found / not in user's company), 422 (validation), 409 (Outbound Default conflict on a different row in same property), 500.

### 4.4 DELETE /api/v1/oxp/vanity-numbers/{id}

Deregister and remove a vanity number.

**Success response (200):** `{ "data": { "id": "{id}", "state": "deletion_queued" } }`.

**Error responses:**

- `403` — no Edit permission.
- `404` — not found.
- `409` — number is the only Outbound Default for the property (`reason: 'sole_outbound_default'`). Frontend must surface the message and not retry.
- `500` — internal.

### 4.5 POST /api/v1/oxp/vanity-numbers/{id}/retest

Kick off a Twilio number-health + carrier registration re-check.

**Request body:** empty.

**Success response (202):** `{ "data": { "id": "{id}", "retestQueued": true, "estimatedCompletion": "2026-04-29T11:50:00Z" } }`.

**Error responses:**

- `403` — no Edit permission.
- `404` — not found.
- `429` — > 3 retests per number per hour. Body includes `Retry-After` header in seconds.
- `503` — Twilio API temporarily unavailable; safe to retry after 30s.

### 4.6 GET /api/v1/oxp/lead-sources

(Existing endpoint reused — documented here for completeness.) Returns the active lead source list for the company. Used to populate the Lead Source dropdown in the Edit modal.

**Success response (200):**

```json
{
  "data": [
    { "id": "ls_42", "name": "Internet-Zillow.com", "active": true },
    { "id": "ls_71", "name": "Email Campaign", "active": true }
  ]
}
```

---

## 5. Business Logic

### 5.1 Data model

The OXP-side service does **not** introduce a new datastore. It reads/writes the existing `vanity_phone_numbers` and `vanity_phone_numbers_audit` tables in the Entrata Contact Methods service.

**`vanity_phone_numbers`** (existing table — relevant columns):

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key. |
| `company_id` | UUID | Tenancy boundary. |
| `property_id` | UUID | Nullable for company-level vanity numbers; for this release always non-null. |
| `phone_number_e164` | varchar(15) | E.164 format (`+18444497340`). |
| `phone_number_display` | varchar(20) | Cached display format (`(844) 449-7340`). |
| `type` | enum | `Lead`, `SMS Only`, `Maintenance`. (Future: `Renewals`, `Payments`.) |
| `lead_source_id` | UUID | Nullable. Foreign key into `lead_sources`. |
| `forward_preference` | enum | `Office Contact`, `IVR`, `Specific Number`. |
| `route_calls_raw` | varchar(10) | 10-digit destination. Nullable when `forward_preference = IVR`. |
| `sms_enabled` | boolean | |
| `sms_registration_status` | enum | `Verified`, `In Review`, `Not Submitted`. |
| `sms_registration_status_at` | timestamp | When the status last changed. |
| `outbound_default` | boolean | At most one true per `(company_id, property_id)` — enforced by partial unique index. |
| `expiration_date` | date | Nullable. |
| `caller_id_registered` | boolean | Updated asynchronously by the carrier registration job. |
| `ai_bailout_number` | boolean | At most one true per `(company_id, property_id)` — enforced by partial unique index. |
| `toll_free` | boolean | |
| `state` | enum | `pending_carrier_review`, `active`, `deletion_queued`, `deleted`. |
| `created_by_user_id` | UUID | |
| `updated_by_user_id` | UUID | |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### 5.2 Validation rules

- `areaCode` (Add): must match `/^[2-9][0-8][0-9]$/` and pass NANP validity check (numverify lookup, cached 30 days).
- `routeCalls`: exactly 10 digits, strip non-numerics on submit, validate NANP.
- `expirationDate`: must be ≥ `current_date` or null.
- `leadSource`: must be active in `lead_sources` for the same `company_id`.
- `phoneNumber`: never user-editable post-creation. Carrier-assigned.
- `outboundDefault = true`: enforced via DB transaction — demote any other rows with `outbound_default = true` for the same `(company_id, property_id)` in the same PUT.
- `aiBailoutNumber = true`: same demotion rule as `outboundDefault`.
- Add request: rejected with 400 if `useForSms = false` in this release.
- Type changes are blocked at the API level if `lead_source_id IS NOT NULL` — server returns 422 `reason: 'lead_source_attached'` and frontend surfaces the yellow warning.

### 5.3 Computed values

- `smsRegistrationVerifiedAt` (response field): when `sms_registration_status = 'Verified'`, populated from `sms_registration_status_at`; otherwise null.
- `estimatedReviewCompletion` (Add response): `now + 48 hours` for toll-free, `now + 96 hours` for 10DLC long-codes.

### 5.4 Audit trail

Every Add / Edit / Delete / Retest writes a row to `vanity_phone_numbers_audit`:

```
vanity_phone_numbers_audit (id, vanity_phone_number_id, user_id, action, before_jsonb, after_jsonb, created_at)
```

`action` ∈ `add`, `edit`, `delete`, `retest`. The audit history is **not surfaced in this OXP epic** but remains available to Entrata Telecom support tools.

### 5.5 Concurrency / locking

PUT and DELETE use optimistic concurrency via the row's `updated_at` timestamp. Frontend includes the timestamp it loaded with in an `If-Unmodified-Since` header; if the row has been modified by another user, the server returns 412 `reason: 'concurrent_modification'` and the frontend re-loads the row + shows a toast "This vanity number was just updated by someone else — your view is now refreshed."

---

## 6. User Stories

### US-1: As a property manager, I want to see only the vanity numbers for the property I manage so that I can quickly verify and update them without scanning the company-wide list.

- AC-1.1: Given I am signed into OXP with `Setup >> Property >> Contact Methods >> Vanity Phone Numbers >> View` permission scoped to a single property, when I navigate to `Communications Setup >> Vanity Number Settings`, then I see the Vanity Phone Numbers section with the property filter defaulted to my property and the table showing only my property's rows.
- AC-1.2: When I change the property filter dropdown to "All Properties", I see all vanity numbers in the company that I have View permission on (no rows for properties I lack access to).
- AC-1.3: The property filter selection is preserved while I navigate around OXP in the same browser session, but resets to "All Properties" on next sign-in.
- AC-1.4: The filter is client-side — switching properties does not trigger a new GET request.

### US-2: As a marketing manager, I want to add a new vanity number for a property and attach it to a lead source in one workflow so that campaign attribution starts the day the number activates.

- AC-2.1: Given I have Edit permission on `propertyId = p10`, when I click "+ Add Vanity Number" and fill out the Select Preferences form with a valid US area code, then on submit the modal closes and a new row appears in the table for `p10` with SMS Registration Status = "In Review (submitted just now)".
- AC-2.2: After the carrier completes registration (status `Verified`), I can open the Edit modal on the new row and select a Lead Source from the dropdown and click Save.
- AC-2.3: The lead-source attribution becomes visible in `Marketing >> Lead Sources` within 30 seconds of save.
- AC-2.4: If I attempt to submit the Add form with no area code and Toll-Free = No, the area code field shows a red inline error and the Submit button is blocked.

### US-3: As a regional leasing manager, I want to retest a vanity number from the Edit modal so that I can verify SMS deliverability without filing a Telecom support ticket.

- AC-3.1: Given I have Edit permission, when I open the Edit modal on any row and click "Retest Vanity Number", then a green inline banner appears: "We are now testing `(XXX) XXX-XXXX` which can take up to ten minutes."
- AC-3.2: A `POST /vanity-numbers/{id}/retest` request is sent and a row is added to `vanity_phone_numbers_audit` with `action = 'retest'`.
- AC-3.3: Within 10 minutes, the SMS Registration Status badge on the row reflects the new status.
- AC-3.4: If I retest the same number more than 3 times in an hour, the Retest button is disabled and a rate-limit message shows the time remaining.

### US-4: As a property staff member, I want to be warned before promoting a vanity number to Outbound Default so that I don't accidentally orphan an active campaign on the previous default.

- AC-4.1: Given a vanity number row for a property where another vanity number is currently Outbound Default, when I open the Edit modal on the new row and toggle Outbound Default = Yes, then an inline yellow advisory appears: "By adding this number, Outbound Default will no longer be associated with `(XXX) XXX-XXXX`." with the previous default's number filled in.
- AC-4.2: When I click Save, the previous default is demoted to `outbound_default = false` in the same DB transaction.
- AC-4.3: A toast confirms: "Outbound Default moved to `(NEW) XXX-XXXX`."

### US-5: As a property staff member, I want to be blocked from deleting the sole Outbound Default number for a property so that outbound campaigns don't silently fall back to the shared short code.

- AC-5.1: Given a property has exactly one vanity number with `outbound_default = true`, when I attempt to delete that row, then the confirmation modal stays open and shows a red error: "This number is the property's Outbound Default. Promote another vanity number to Outbound Default before deleting."
- AC-5.2: The DELETE request is not sent.
- AC-5.3: After I promote another row to Outbound Default = Yes (via Edit), the original row's delete confirmation proceeds normally.

### US-6: As an Entrata Telecom admin, I want every Add / Edit / Delete / Retest event recorded in the audit trail so that I can investigate customer support tickets about lost campaigns or unexpected routing changes.

- AC-6.1: Every state-changing API call writes a row to `vanity_phone_numbers_audit` with the user id, action type, before-state JSON, after-state JSON, and timestamp.
- AC-6.2: The audit row is durable — surviving the row's eventual deletion (the audit table is not cascaded by `vanity_phone_numbers` row delete).
- AC-6.3: An internal-only API endpoint (`GET /api/v1/internal/vanity-numbers/{id}/audit`) returns the audit history for support tools. This endpoint is gated to users with the `vanity_admin` internal flag.

### US-7: As a user without Edit permission, I want to view the vanity number table in read-only mode so that I can verify configuration without being able to accidentally change it.

- AC-7.1: Given I have View but not Edit permission, when I open `Communications Setup >> Vanity Number Settings`, then I see the Vanity Phone Numbers section with the property filter and the table populated normally.
- AC-7.2: The "+ Add Vanity Number" button is not rendered (not just disabled — DOM omits it).
- AC-7.3: The pencil-icon Edit action on each row is not rendered.
- AC-7.4: If a backend race condition tries to send me through to an Edit modal (e.g., via stale state), the PUT returns 403 and a toast directs me to contact my administrator.

---

## 7. SDET Test Cases

### TC-7.1: Happy path — Add toll-free vanity number → row visible with "In Review" badge

- **Given:** User has Edit permission on `p10`, feature flag `oxp_communications_vanity_numbers_section` = ON.
- **When:** User opens Add modal, toggles Toll-Free = Yes, selects Forward Preference = Specific Number, leaves Use for SMS = Yes (locked), submits.
- **Then:** Modal closes, POST returns 201, table refreshes, new row appears at the top with `tollFree: true`, `smsRegistrationStatus: 'In Review'`, badge shows "In Review (submitted just now)", and Amplitude event `oxp_vanity_added` fires with `{ toll_free: true, ... }`.

### TC-7.2: Validation — Add fails on bad area code

- **Given:** User has Edit permission, Toll-Free = No, Area Code = "1AB" (invalid).
- **When:** User attempts to submit.
- **Then:** Inline red error appears under Area Code: "Enter a valid US area code (e.g., 512)". Submit button is disabled. No POST is sent. Amplitude `oxp_vanity_validation_failed` fires with `{ field: 'area_code', reason: 'pattern' }`.

### TC-7.3: Permission — User without Edit permission sees read-only table

- **Given:** User has View but not Edit permission.
- **When:** User loads `Communications Setup >> Vanity Number Settings`.
- **Then:** Section renders, property filter is interactive, "+ Add Vanity Number" button is **not in the DOM**, pencil-icon Edit action is **not in the DOM** for any row, and the keyboard tab-order skips from the property filter directly to the next section on the page.

### TC-7.4: Concurrent edit — PUT returns 412 on stale `updated_at`

- **Given:** User A and User B both open the Edit modal on `v17` at the same time.
- **When:** User A saves first (PUT 200), then User B saves.
- **Then:** User B's PUT returns 412 with `reason: 'concurrent_modification'`. Modal stays open, toast: "This vanity number was just updated by someone else — your view is now refreshed." Row data refreshes from the server to reflect User A's changes.

### TC-7.5: Outbound Default demotion — promoting another row demotes the previous default in same transaction

- **Given:** Property `p18` has row `v18` with `outbound_default = true` and row `v_new` with `outbound_default = false`.
- **When:** User edits `v_new`, toggles Outbound Default = Yes, saves.
- **Then:** Database shows `v18.outbound_default = false` and `v_new.outbound_default = true`, both updates committed in the same transaction (verify by inserting a barrier — kill the connection between the two writes and confirm rollback restores both rows to pre-edit state).

### TC-7.6: Delete blocked when row is sole Outbound Default

- **Given:** Property `p20` has exactly one vanity number, with `outbound_default = true`.
- **When:** User attempts to delete that row.
- **Then:** DELETE returns 409 with `reason: 'sole_outbound_default'`. Confirmation modal stays open with red error: "This number is the property's Outbound Default. Promote another vanity number to Outbound Default before deleting." Amplitude `oxp_vanity_delete_blocked_outbound_default` fires.

### TC-7.7: Retest rate limit — 4th retest in an hour returns 429

- **Given:** A user has called `POST /vanity-numbers/{id}/retest` 3 times in the past hour for `v17`.
- **When:** User clicks Retest a 4th time.
- **Then:** Server returns 429 with `Retry-After` header. UI shows a countdown banner inside the Edit modal: "Retest is rate-limited — please wait MM:SS before retesting again." Retest button is disabled until the countdown reaches 0.

### TC-7.8: Network failure — table load retries with backoff

- **Given:** GET `/vanity-numbers` returns 500 on first 2 attempts and 200 on the 3rd.
- **When:** User loads the section.
- **Then:** Section retries with 1s, 3s backoff. After successful 3rd attempt, table renders normally. Amplitude `oxp_vanity_load_failed` fires twice (for the 5xx attempts), then `oxp_vanity_loaded` fires on success with `{ retry_count: 2 }`.

### TC-7.9: Lead source filter — lead source change is rejected when source is inactive

- **Given:** A lead source `ls_42` was deactivated in `Marketing >> Lead Sources` after the dropdown loaded.
- **When:** User selects `ls_42` (still showing in stale dropdown) and saves.
- **Then:** PUT returns 422 with `reason: 'lead_source_inactive'`. Modal stays open with inline error under Lead Source: "This lead source has been deactivated — pick another."

### TC-7.10: Feature flag OFF — section does not render

- **Given:** Flag `oxp_communications_vanity_numbers_section` = OFF.
- **When:** User loads `Communications Setup >> Vanity Number Settings`.
- **Then:** Existing per-product number assignment table renders at the top. No Vanity Phone Numbers section renders below it. No GET `/vanity-numbers` request is sent.

---

## 8. Amplitude Events

| Event Name | Trigger | Properties |
|---|---|---|
| `oxp_vanity_section_viewed` | Section mounts | `permission_level: 'view' | 'edit'`, `property_filter: 'all' | property_id`, `total_row_count` |
| `oxp_vanity_loaded` | GET succeeds | `row_count`, `retry_count`, `load_ms` |
| `oxp_vanity_load_failed` | GET 5xx | `status`, `attempt`, `total_attempts_so_far` |
| `oxp_vanity_filter_applied` | User changes property filter | `property_id`, `visible_row_count`, `total_row_count`, `source: 'dropdown'` |
| `oxp_vanity_add_opened` | Add modal opens | `entry_point: 'header_button' | 'empty_state_cta'` |
| `oxp_vanity_added` | POST 201 | `vanity_number_id`, `property_id`, `toll_free`, `forward_preference`, `use_for_sms`, `outbound_default`, `has_expiration` |
| `oxp_vanity_add_conflict` | POST 409 | `dup_vanity_number_id`, `property_id`, `area_code` |
| `oxp_vanity_carrier_reject` | POST 422 carrier reason | `reason_code`, `property_id` |
| `oxp_vanity_validation_failed` | Client-side validation fail | `field`, `reason`, `entry_point: 'add' | 'edit'` |
| `oxp_vanity_edit_opened` | Edit modal opens | `vanity_number_id`, `property_id`, `lead_source_attached: boolean` |
| `oxp_vanity_edited` | PUT 200 | `vanity_number_id`, `property_id`, `fields_changed: string[]` |
| `oxp_vanity_outbound_default_changed` | PUT toggles outbound_default | `vanity_number_id`, `property_id`, `demoted_vanity_number_id` |
| `oxp_vanity_retest_started` | POST retest 202 | `vanity_number_id`, `property_id` |
| `oxp_vanity_retest_rate_limited` | POST retest 429 | `vanity_number_id`, `retry_after_seconds` |
| `oxp_vanity_delete_confirmed` | DELETE 200 | `vanity_number_id`, `property_id`, `prior_type`, `prior_sms_status`, `days_since_creation` |
| `oxp_vanity_delete_cancelled` | User dismisses confirm modal | `vanity_number_id`, `property_id` |
| `oxp_vanity_delete_blocked_outbound_default` | DELETE 409 sole_outbound_default | `vanity_number_id`, `property_id` |

---

## 9. Success Metrics (AARRR)

| Stage | Metric | Target | Measurement | Timeline |
|---|---|---|---|---|
| **Acquisition** | % of OXP-enabled companies whose users have visited the Vanity Phone Numbers section at least once | ≥ 70% | Unique `company_id`s emitting `oxp_vanity_section_viewed` ÷ total OXP-enabled companies | 30 days post-GA |
| **Activation** | % of visiting companies where ≥ 1 user has performed an Add / Edit / Retest / Delete from OXP (not legacy) | ≥ 50% | Companies with ≥ 1 `oxp_vanity_added | edited | retest_started | delete_confirmed` event divided by companies that fired `oxp_vanity_section_viewed` | 60 days post-GA |
| **Retention** | Median days between consecutive visits per company | ≤ 7 days | Median delta between consecutive `oxp_vanity_section_viewed` events per `company_id` | 90 days post-GA |
| **Revenue (proxy)** | Reduction in average vanity number administration time (self-reported via in-product micro-survey) | ≥ 50% reduction vs. baseline | One-question micro-survey ("How long did the last vanity number change take you?" — 1–5 minutes, 5–10 minutes, 10–20 minutes, more than 20 minutes) shown post-edit. Median bucket compared to baseline established in week 0 | 120 days post-GA |
| **Referral / Funnel impact** | New-logo deals where the OXP-first communications story was cited as a tipping point | [INSERT: target absolute count if Sales has one — e.g., "≥ 3 deals in the first quarter post-GA"] | Sales-tagged opportunities (CRM field `closed_won_factor` includes "OXP communications native") | Quarterly |
| **Risk mitigation** | % of customer-reported SMS deliverability incidents traceable to stale carrier registration | ≤ 50% of pre-feature baseline | Support ticket category `sms_deliverability_stale_carrier_registration` / month, baseline taken from prior 90 days | 180 days post-GA |

---

## 10. Feature Flag & Rollback

### 10.1 Flag

- **Key:** `oxp_communications_vanity_numbers_section`
- **Type:** Company-level feature flag
- **Default at GA:** ON for all OXP-enabled companies
- **OFF behavior:** Section does not render at the bottom of `Communications Setup >> Vanity Number Settings`. No `oxp_vanity_*` Amplitude events fire. No `/api/v1/oxp/vanity-numbers/*` requests are made from the page.
- **ON behavior:** Section renders for users with View permission; users without View permission do not see the section even when ON.

### 10.2 Rollback procedure

If a regression is found post-GA, the flag flip is the rollback:

1. Engineer-on-call sets `oxp_communications_vanity_numbers_section = OFF` for the affected company (or globally for everyone if the issue is broad).
2. The next page load does not render the section. Existing in-flight modals close on next render.
3. Users continue using `Setup >> Property >> Contact Methods >> Vanity Phone Numbers` in legacy Entrata as they do today.
4. **Data safety:** because the OXP section read/write through the existing Vanity Phone Numbers service, no data is OXP-resident. Any vanity numbers added, edited, or deleted before the rollback remain in the same `vanity_phone_numbers` table — they are immediately visible in the legacy UI. No data is orphaned.
5. **Audit safety:** `vanity_phone_numbers_audit` rows written during the OXP-enabled window remain intact and visible to Entrata Telecom support tools.

### 10.3 Emergency escalation path

| Severity | Who | Action |
|---|---|---|
| OXP section is rendering but operations fail silently | OXP Communications oncall | Page Telecom oncall; flip flag OFF for affected company within 30 min |
| Operations succeed in OXP but desync with Twilio (e.g., a number deleted in OXP still exists in Twilio) | Telecom oncall | Reconciliation job runs every 15 min; manual reconciliation via Telecom admin tools |
| Cross-property data leakage (Property A user sees Property B's vanity numbers) | OXP + Security oncall | Immediate company-wide flag OFF; Sev-1 incident; audit trail review |

---

## 11. Vertical Impact Deviation Matrix

| Vertical | Required? | Type of Change | Summary | Notes |
|---|---|---|---|---|
| **Residential (Conventional)** | Yes | New UI surface | Vanity Phone Numbers section added at bottom of `Communications Setup >> Vanity Number Settings`. Identical behavior across all properties. | Primary target. |
| **Affordable** | Yes | New UI surface (parity) | Same behavior. No Affordable-specific compliance fields. | OK to include in default rollout. |
| **Student** | Yes | New UI surface (parity) | Same behavior. Student campaigns frequently use vanity numbers for parent-vs-resident attribution — this surface makes parent-line management faster. | OK. |
| **Military** | Yes | New UI surface (parity) | Same behavior. Military properties have stricter call-handling expectations around quiet hours / on-base routing — those continue to be handled in IVR configuration (not in scope here). | OK. |
| **Senior** | Yes | New UI surface (parity) | Same behavior. | OK. |
| **HOA** | No | Not applicable | HOA properties do not own marketing vanity numbers. Section renders empty for HOA-only companies; no functional difference. | If the company has zero HOA-only properties this is moot. |
| **Manufactured Housing** | Yes | New UI surface (parity) | Same behavior. | OK. |
| **Self Storage** | No | Not applicable | Self Storage in OXP uses a different telephony surface; vanity numbers are not used the same way. Out of scope. | Future epic if needed. |
| **SFR (Single-Family Rental)** | Yes | New UI surface (parity) | Same behavior. SFR portfolios benefit most from the property filter because they often have 1 vanity number per home and the legacy list is unwieldy. | OK. |
| **Commercial** | Yes | New UI surface (parity) | Same behavior. Commercial properties typically have fewer vanity numbers per property. | OK. |

---

## 12. Accessibility

### 12.1 Tab order (within the section)

1. Property filter dropdown
2. "+ Add Vanity Number" button (when present)
3. Table cells in row order, left → right, top → bottom (status badges and indicators are skipped via `tabindex="-1"` because they're non-interactive)
4. Per-row pencil-icon Edit button (when present)
5. Page footer / next section

### 12.2 ARIA + semantic markup

- Section wrapped in `<section aria-labelledby="vanity-numbers-heading">` with `<h2 id="vanity-numbers-heading">Vanity Phone Numbers</h2>`.
- Property filter is a `<select>` with `<label>` for screen reader association.
- Table uses native `<table>` with `<thead>`, `<tbody>`, `<th scope="col">`, `<td>` — not divs. Each `<th>` includes `aria-sort` when columns are sortable (sortable in a future epic; for now `aria-sort="none"`).
- Status badges use `<span role="status">` with the human-readable text inside (e.g., "Verified on 08/04/2023"), so screen readers announce the status when the row gets focus.
- Add / Edit / Delete confirmation modals are `<dialog>` elements with focus trapping; opening focuses the first form field, closing restores focus to the triggering button.
- Toasts use `role="status"` with `aria-live="polite"` (success) or `aria-live="assertive"` (error).

### 12.3 Focus management

- Opening a modal moves focus to its first interactive element.
- Closing a modal returns focus to the element that opened it (Add button or row's Edit pencil).
- After successful Add, the new row gets keyboard focus to allow immediate inspection.

### 12.4 Color contrast

- All status badge colors satisfy WCAG AA against their background:
  - Green Verified pill — emerald-100 background, emerald-700 text (contrast ratio > 5.5).
  - Amber In Review pill — amber-100 background, amber-700 text.
  - Gray Not Submitted pill — zinc-100 background, zinc-600 text.
- Inline yellow advisories use amber-50 background + amber-800 text (contrast > 6.0).

### 12.5 Screen reader behavior

- Empty state announcement: when the filter results in 0 rows, the table announces "No vanity numbers for {Property Name}".
- Retest banner announcement: when retest starts, screen reader announces "We are now testing (XXX) XXX-XXXX which can take up to ten minutes." once.
- Delete confirmation announcement: when the confirmation modal opens, the warning text is announced before the action buttons.

### 12.6 Keyboard shortcuts

- No new keyboard shortcuts beyond OXP defaults. The `Esc` key closes any open modal as standard.

---

## Appendix A — Open questions to confirm before implementation

- **A.1** Confirm with Telecom: estimated carrier review SLA for 10DLC vs. toll-free. Spec currently assumes 48 hours toll-free / 96 hours 10DLC.
- **A.2** Confirm with Marketing: behavior when a lead source attached to a vanity number is renamed in `Marketing >> Lead Sources`. Spec assumes the dropdown reflects the new name on next load.
- **A.3** Confirm with Product: should the audit history (`vanity_phone_numbers_audit`) be surfaced in OXP in a follow-up epic, or remain Telecom-internal indefinitely?
- **A.4** Confirm with Compliance: minimum data retention for audit rows of deleted vanity numbers (current default: 7 years).
- **A.5** Confirm with Design: empty-state CTA copy when filter has zero rows. Spec currently shows "+ Add Vanity Number for {Property Name}".
- **A.6** Confirm with Engineering: whether the property filter should support multi-select in a follow-up (e.g., "show me Cedar Ridge + Skyline only"). Out of scope for v1.
- **A.7** Confirm pagination strategy. Spec assumes cursor-based with default limit 500. If a customer has > 500 vanity numbers in a single property (unlikely but possible), the table needs to support `cursor` flow on scroll.
