# Engineering Kickoff — DEV-304165 / OXP Vanity Number Configuration Grid

> Paste this into Cursor as your first message when you start implementing DEV-304165. The full spec lives in the Jira epic description and the continuation comment — read that first, then use this file to anchor your implementation sequence.
>
> Jira: https://entrata.atlassian.net/browse/DEV-304165
> Companion epic (dependency): https://entrata.atlassian.net/browse/DEV-304152

---

## Mission

Ship the **Vanity Number Configuration** grid at the top of the OXP `/communications-setup/phone-numbers` page. The grid lets operators see and re-wire which vanity phone number is assigned to which AI product slot at each property — and lets them kick off carrier registration for properties that have not yet started.

This epic is the **viewing + re-wiring** half of the Vanity Number Settings page. DEV-304152 is the **CRUD-on-the-vanity-number-pool** half (Add / Edit / Retest / Delete on individual numbers). Together they make up the full Vanity Number Settings page. They ship behind two independent flags and they share the Add Vanity Number modal.

---

## Architectural Decisions (with rationale)

1. **One new database table, no schema changes to existing tables.** Add `ai_product_assignments` (property_id × product_key × channel → vanity_number_id) with an `etag` column for optimistic concurrency. Migration seeds from existing per-product defaults so the grid renders correctly on first load. **Rationale:** The current production model represents per-product number assignments via implicit defaults sprinkled across multiple Twilio/contact-methods records — too fragmented to query efficiently for a portfolio-wide grid. A dedicated normalized table reduces a 10+ JOIN query to a single index lookup per property.

2. **Server returns the entire portfolio grid in one payload** (`GET /api/oxp/properties/grid-state`). Polling endpoint (`GET /api/oxp/properties/registration-status?propertyIds=…`) is a lightweight follow-up. **Rationale:** Customers with up to 200 properties stay under a 50KB initial payload; clients above that virtualize. Per-row fetching would force N+1 patterns and break the at-a-glance summary counter.

3. **Optimistic concurrency via row-level ETag, not column-locking.** Each `ai_product_assignments` row has a `etag` (regenerated on every UPDATE via `gen_random_uuid()`). PATCH requests include `ifMatch`; mismatch returns 409 with the current value + actor email. **Rationale:** Optimistic concurrency keeps writes non-blocking; row-level ETag (not column-level) is sufficient because two cell changes on the same row are inherently sequential from a single user's perspective.

4. **Polling, not server-sent events / WebSockets.** Status polling at 60s while document.hidden === false. **Rationale:** Status changes are slow (carrier registration is 1–5 business days). SSE would be over-engineering. Polling pauses on tab-hidden to avoid background hammering. The 60s cadence is acceptable for the use case (operators waiting for a Pending → Done flip do not require sub-second feedback).

5. **Optimistic UI for cell changes, hard rollback on 4xx/5xx.** Show the new value immediately on user interaction; revert on error with a toast. **Rationale:** Sub-200ms perceived latency makes the grid feel like spreadsheet editing. Rollback semantics are obvious because each cell has a single source of truth.

6. **N/A is contract-driven, not registration-driven.** Click-to-Call N/A is computed from `properties.contract_features.click_to_call`. This is true even for Done or Pending rows. **Rationale:** N/A is a permanent state until the contract changes; conflating it with registration would mislead operators into thinking they can self-fix it.

---

## Implementation Sequence (build order)

Suggested order — each step has acceptance gates that should pass before moving on.

1. **Migration + seed.** Write `db/migrations/20260618_create_ai_product_assignments.sql`. Seed from existing per-product default tables in the same migration. Verify via `SELECT COUNT(*) FROM ai_product_assignments` — should equal `properties × distinct active product_slots` for the test company. Add rollback migration.

2. **Read API: `GET /api/oxp/properties/grid-state`.** Implement in the OXP BFF. Include per-property `registrationStatus`, `userPermissions`, `contractFlags`, and the full `assignments` map. Include the company `vanityNumberPool`. Unit test the SQL with golden snapshots for a 3-property fixture (one Active, one Pending, one Not-started). Latency target: P95 < 800ms for 100-property portfolios.

3. **Read API: `GET /api/oxp/properties/registration-status`.** Lightweight (status + timestamps only). Cache server-side for 30s to absorb the polling cost. Latency target: P95 < 150ms.

4. **Grid component skeleton in `app/communications-setup/phone-numbers/page.tsx`.** Replace the prototype's in-memory `INITIALLY_ACTIVE` / `INITIALLY_IN_REVIEW` Sets with React Query subscriptions to `/grid-state`. Keep the existing `renderCell()` interaction model. Add the loading skeleton (16 placeholder rows × 11 sub-columns of zinc-100 skeleton bars).

5. **Polling loop.** Add a 60-second `useEffect` that calls `/registration-status` and merges responses into the React Query cache. Pause/resume on `visibilitychange`. Fire `vanity_config_row_status_changed` on detected transitions.

6. **Write API: `PATCH /:property/:product/:channel/vanity-number`.** Include ETag check; respond with new ETag. Audit log writes go to `cell_change_audit` table (write-once table, append-only). Test 200 / 403 / 404 / 409 / 422 paths.

7. **Write API: `POST /privacy-policy/submit` + the cell-with-kickoff variant.** Same patterns; chain the two POSTs from the client when a Not-started cell is picked.

8. **Cell change UX wiring.** Wire dropdown `onChange` to PATCH, with optimistic UI and toast on failure. Wire Not-started cells to chain the privacy-policy POST + cell POST. Wire `+ New Vanity Number` to the DEV-304152 Add Vanity Number modal entry point.

9. **Permission gating.** Pass `userPermissions` through to the cell renderer. Render static `<span>` cells when `edit === false`. Hide dropdown chevrons. Replace Not-started em-dash with static span (no dropdown). Add `aria-label` and `title` tooltip for the gated state.

10. **N/A treatment.** Inspect `properties.contract_features.click_to_call`; render the N/A pill for false. Confirm the keyboard-focus + `aria-describedby` tooltip behavior matches the SDET TC-7.7.

11. **Amplitude instrumentation.** Wire every event in § 8 of the spec. Verify in the Amplitude DEBUG console that property names and values match the spec exactly (mismatches at this stage are cheap to fix).

12. **Accessibility pass.** Tab order, ARIA roles, focus management, `prefers-reduced-motion` for the row-color-fade transition, 44px touch targets. Run axe-core in CI.

---

## Key file paths

- `app/communications-setup/phone-numbers/page.tsx` — the grid component. The prototype lives here; production replaces in-memory state with React Query subscriptions. Preserve the `renderCell()` interaction model.
- `app/api/oxp/properties/grid-state/route.ts` — new BFF route (Next.js App Router).
- `app/api/oxp/properties/registration-status/route.ts` — new BFF route, polling endpoint.
- `app/api/oxp/properties/[propertyId]/ai-products/[productKey]/[channel]/vanity-number/route.ts` — PATCH + POST handlers (variant on the same path; method discriminates).
- `app/api/oxp/properties/[propertyId]/privacy-policy/submit/route.ts` — POST handler.
- `lib/oxp/vanity-grid/types.ts` — TypeScript types shared by client and BFF.
- `lib/oxp/vanity-grid/use-grid-state.ts` — React Query hook for grid-state + polling.
- `lib/oxp/vanity-grid/audit.ts` — audit log writer for `cell_change_audit`.
- `db/migrations/20260618_create_ai_product_assignments.sql` — schema + seed.
- `db/migrations/20260618_create_cell_change_audit.sql` — audit table.

---

## Definition of Done

- [ ] All 7 acceptance criteria from US-1 through US-7 pass in the SDET regression suite.
- [ ] All 8 SDET test cases (TC-7.1 through TC-7.8) pass in CI.
- [ ] All 15 Amplitude events fire with the exact property names/types specified in § 8. Verified in Amplitude DEBUG console against the spec.
- [ ] `axe-core` passes with 0 violations on the Vanity Number Settings page.
- [ ] Keyboard-only navigation walkthrough completed and screen-recorded; recording attached to the epic before close.
- [ ] Feature flag `oxp_vanity_number_configuration_grid` exists; turning it OFF restores the page to the pre-DEV-304165 state (only DEV-304152 lower section renders or empty state).
- [ ] Rollback procedure rehearsed in QA: flag-disable returns the page to the pre-feature state in < 30 seconds.
- [ ] Latency P95 on grid-state ≤ 800ms for 100-property portfolios; P95 on registration-status ≤ 150ms.
- [ ] Audit log entries land in `cell_change_audit` for every PATCH/POST; verified in QA against TC-7.1 happy-path test.
- [ ] FE Doc fields on Jira DEV-304165 are populated and pass FE Doc Grader review.
- [ ] Engineering description in Jira reflects the as-built; any deviation from spec is added as comments to the epic.

---

## Constraints & Gotchas

- **DEV-304152 is a hard dependency.** The `+ New Vanity Number` action in every cell opens the modal shipped in DEV-304152. If DEV-304152 is not yet deployed when this epic ships, the menu option must be hidden (server-side feature-gate detection). Do not partial-ship without coordinating with the DEV-304152 owner.
- **Polling must respect `document.hidden`.** Background tabs in Chrome throttle setInterval significantly, but the API rate-limiter does not know that — pausing in JS keeps the budget intact.
- **Optimistic UI rollback is the only safe pattern.** If you skip rollback, a 409 leaves the user thinking their change was saved when it wasn't. Test this explicitly.
- **N/A is NOT the same as Not-started.** A Not-started property may still have Click-to-Call N/A (no contract). The two flags are independent.
- **Audit log is append-only.** Never DELETE from `cell_change_audit`. Compliance team relies on the 7-year retention.
- **Do not add a client-side property search box.** Out of scope; pagination via virtualized rendering is a follow-up epic.
- **Do not surface internal Twilio errors to the operator.** Carrier registration failures must be remediated by Entrata Telecom, not by the operator. UI shows "Pending" until it flips to Active or gets escalated to Telecom.

---

## Pattern References (existing code to follow)

- The prototype's `renderCell()` function (`app/communications-setup/phone-numbers/page.tsx`) defines the three rendering branches: awaiting (dropdown with em-dash placeholder), review (pending pill under the value), active (plain content). Production should preserve this control-flow exactly.
- The prototype's `vanityOptionsForProperty(propId, currentValue)` helper returns `{ propNums, companyNums }` optgroups. Production uses the API-loaded `vanityNumberPool` and the property's own `assignments` map; the optgroup labeling pattern is unchanged.
- The sticky-left-column technique (background-color override per row status) at lines 501–515 of the prototype is the canonical way to render the property-name column.
- Existing OXP React Query setup at `lib/api/queries/` shows the established hook pattern; follow it for `use-grid-state.ts`.
- DEV-304152's Add Vanity Number modal — `openAddVanityModal()` and `submitAddVanityNumber()` — is the entry point and submission flow. Do not re-implement; import.

---

## Don'ts (anti-patterns that have already cost us in similar epics)

- Do NOT mutate `ai_product_assignments` rows without writing a `cell_change_audit` row. Atomic transaction.
- Do NOT surface the carrier campaign ID or Twilio SID to the operator UI — those are internal-only.
- Do NOT use Server-Sent Events or WebSockets for status updates. Polling is sufficient; SSE adds infra complexity.
- Do NOT couple this epic's flag to DEV-304152's flag. They ship independently.
- Do NOT introduce a new permission system. Reuse the existing Vanity Phone Numbers and Privacy Policy permissions verbatim.
- Do NOT block the page render on the polling endpoint. Polling is a side-effect; render uses `grid-state`.

---

## Open questions for PM (call out in epic before kickoff)

- Confirm the GA product-slot list (M=11 columns) — is Click-to-Call's Voice channel really a SMS-channel-aliased record, or should Voice be its own row?
- Confirm whether `policySource: "custom"` is in scope for a near-term follow-up; if yes, design with that hook now.
- Confirm the Commercial vertical column set ship-date — does it block this epic's column-set abstraction or can Commercial extend the same component later?
- Confirm Amplitude property allow-list with the analytics team before instrumenting (some property names may need to map to existing taxonomies).
