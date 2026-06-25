# Engineering Kickoff Prompt — DEV-304152 — OXP Vanity Phone Numbers Section

> Paste this entire file into Cursor as your first message when you start implementation. It is a compressed orientation prompt; the full engineering spec lives in the Jira epic [`DEV-304152`](https://entrata.atlassian.net/browse/DEV-304152) description + the continuation comment (which contains User Stories, SDET tests, Amplitude events, AARRR metrics, feature flag rollback, vertical impact matrix, accessibility, and Appendix A open questions). Read the Jira epic for the source of truth — this file is the orientation.

---

## What you are building (one sentence)

A new "Vanity Phone Numbers" section at the bottom of `Communications Setup >> Vanity Number Settings` inside OXP that gives operators the same Add / Edit / Retest / Delete capabilities the legacy `Setup >> Property >> Contact Methods >> Vanity Phone Numbers` page already has, plus a per-property filter that legacy never offered.

## Architecture decisions

- **No new datastore.** Read/write goes through the existing Vanity Phone Numbers service that legacy Entrata already calls. The OXP API layer is a thin gateway under `/api/v1/oxp/vanity-numbers/*` that forwards to the legacy service. Do **not** duplicate the data.
- **No new permission system.** Reuse `Setup >> Property >> Contact Methods >> Vanity Phone Numbers >> View | Edit` and `Marketing >> Lead Sources >> View`. There is no OXP-specific permission and there should not be one.
- **Single company-level feature flag** — `oxp_communications_vanity_numbers_section`. OFF default during phased rollout, ON for all OXP-enabled companies at GA. Rollback = flip flag off (data stays intact in the underlying tables and continues to be readable by legacy UI).
- **Client-side property filter.** The filter is a `sessionStorage`-persisted client state — selecting a property does not trigger a server round-trip. The initial GET pulls the user's full accessible-property vanity list (default cap 500, cursor-paged beyond).
- **Optimistic concurrency on edits via `If-Unmodified-Since`.** No long-held locks. Conflicts surface as a 412 with a "reloaded — try again" toast.
- **Transactional Outbound Default + AI Bailout Number demotion.** Promoting one row to Outbound Default = true demotes the existing default for that property in the same DB transaction; partial unique indexes back this up at the column level.

## Implementation sequence (suggested build order)

1. **Backend gateway** — Stand up the OXP-namespaced `/api/v1/oxp/vanity-numbers` endpoints (GET list, POST add, PUT edit, DELETE, POST retest). Pass-through to the existing Vanity Phone Numbers service. Hook into the existing audit table. Add the new `propertyId` query parameter on GET.
2. **Feature flag plumbing** — Wire `oxp_communications_vanity_numbers_section` into the OXP frontend bootstrap. Default OFF; render no section. Add an internal admin path to flip it for a single company during QA.
3. **Frontend section shell** — Render the section header, the property filter dropdown, and the table skeleton on the existing `Communications Setup >> Vanity Number Settings` page. Wire it to the GET endpoint. Empty state + loading state per § 3.5 of the spec.
4. **Add Vanity Number modal** — Build the Select Preferences form. Connect to POST. Handle 409 (duplicate) and 422 (carrier reject) error paths with the inline messages from § 3.
5. **Edit Vanity Number modal** — Build the full edit form including Retest button, Save, Delete buttons. Handle Outbound Default toggle's automatic-demotion advisory copy with the current default's number filled in (look it up on modal open).
6. **Delete confirmation modal** — Build the confirmation with the carrier-filtering warning copy verbatim. Wire to DELETE; handle the 409 sole-outbound-default error inline.
7. **Retest workflow** — POST retest 202, inline banner, audit row. Handle 429 with countdown.
8. **Permission gating** — Conditionally render the "+ Add Vanity Number" button and per-row pencil-icon based on the user's Edit permission. Read-only mode should be a DOM-level omission, not a `disabled` flag.
9. **Amplitude events** — Wire every event from § 8 of the spec. Use the existing OXP Amplitude wrapper.
10. **Accessibility pass** — Tab order, ARIA labels, focus management, screen reader announcements per § 12.
11. **SDET coverage** — Implement TC-7.1 through TC-7.10 from § 7 of the spec.
12. **Phased rollout** — Coordinate with Telecom on which companies get flag enabled in week 1, 2, 3 post-GA.

## Key file paths (suggested — adjust to your repo conventions)

- **OXP frontend page** — `app/communications-setup/phone-numbers/page.tsx` already exists in the prototype with the upper section. Add the new "Vanity Phone Numbers" section component below.
- **New components** — `components/vanity-numbers/vanity-table.tsx`, `components/vanity-numbers/add-vanity-modal.tsx`, `components/vanity-numbers/edit-vanity-modal.tsx`, `components/vanity-numbers/delete-vanity-modal.tsx`.
- **API client** — `lib/api/oxp/vanity-numbers.ts` exposing typed `listVanityNumbers`, `addVanityNumber`, `editVanityNumber`, `deleteVanityNumber`, `retestVanityNumber`.
- **Backend gateway controller** — service repo equivalent of `controllers/oxp/VanityNumbersController.{ts|kt|whatever}`.
- **Feature flag check** — wherever the existing `oxp_*` flag helpers live.

## Definition of Done (explicit checklist)

- [ ] All API endpoints (4.1 – 4.5 from spec) implemented + return shapes match the spec's JSON examples.
- [ ] Frontend renders the section only when `oxp_communications_vanity_numbers_section = ON` AND the user has View permission.
- [ ] Property filter persists in `sessionStorage`, resets on next sign-in.
- [ ] Add, Edit, Delete, Retest round-trips work against the QA stack with the QA company "OXP Vanity Demo Co" (16 seeded properties).
- [ ] Outbound Default promotion demotes the prior default transactionally and shows the "moved to" toast.
- [ ] Delete is blocked with 409 when the row is the sole Outbound Default and surfaces the inline error message verbatim.
- [ ] Retest is rate-limited at 3/hour/number and the UI countdown matches `Retry-After`.
- [ ] All Amplitude events from § 8 fire with the correct property shape — verified via the Amplitude inspector in QA.
- [ ] Audit rows appear in `vanity_phone_numbers_audit` for every Add / Edit / Delete / Retest from OXP, with `user_id` set to the OXP-authenticated user.
- [ ] Accessibility — keyboard navigation, focus trapping, screen-reader announcements verified with VoiceOver + NVDA spot-checks.
- [ ] Feature-flag rollback verified: flipping the flag OFF mid-session hides the section on next render and does not corrupt any in-flight data.
- [ ] SDET TC-7.1 through TC-7.10 all pass in QA.
- [ ] FE Doc-grader and Epic-Manager-grader rubric audits both pass (see `SELF-AUDIT.md`).
- [ ] Customer-facing release note published in OXP Release Notes channel + Entrata KB article updated.

## Constraints, gotchas, and explicit "do NOT" items

- **DO NOT** create a new "OXP Vanity Numbers" datastore or new Twilio integration. Reuse the existing service.
- **DO NOT** introduce a new permission key. Reuse the legacy `Setup >> Property >> Contact Methods >> Vanity Phone Numbers >> View | Edit`.
- **DO NOT** allow `Use for SMS = No` in the Add request in this release — server must reject with 400. Future epic adds voice-only provisioning.
- **DO NOT** delete a row whose `outbound_default = true` if it's the only one for the property — return 409, surface the inline error, require the user to promote another row first.
- **DO NOT** let a user change a vanity number's `type` while it has a `lead_source_id IS NOT NULL` — return 422 with `reason: 'lead_source_attached'`. Frontend already shows the yellow warning copy.
- **DO NOT** poll the table aggressively — initial GET + manual Retest result push (or 60s background refresh) is enough. We do not want a 5s poll loop hammering the carrier registration status endpoint.
- **DO NOT** ship without the Outbound Default demotion advisory copy — that wording was negotiated with Marketing to prevent the campaign-attribution incident class that motivated this requirement.
- **DO NOT** assume the property filter resets on each navigation — it must persist in `sessionStorage` for the user's session so a regional manager can hop between OXP pages and come back to their filter selection.
- **GOTCHA:** Phone-number display formatting (`(XXX) XXX-XXXX`) is purely a presentation concern — the API stores 10-digit raw. Normalize on every PUT/POST submit. Do not regex-validate the formatted string anywhere — validate the raw.
- **GOTCHA:** Lead Source list is cached for 60s per company on the client. If the user adds a new lead source in `Marketing >> Lead Sources` and immediately returns to this section, they may have to refresh once.
- **GOTCHA:** The "AI Bailout Number" toggle does **not** affect call routing. Routing is Forward Preference + Route Calls. AI Bailout is metadata for the ELI+ AI transfer-to-human flow. Do not "helpfully" auto-update Route Calls when the user toggles AI Bailout = Yes.

## Pattern references (existing code to follow)

- For modal layout / focus trap / a11y — reuse the modal patterns already used by the Add Lead modal (DEV-293306) and the ELI+ AI escalation modal (DEV-301687). Both ship in production OXP.
- For the property dropdown — reuse the property selector from the existing per-product number assignment table at the top of this same `Vanity Number Settings` page (it already filters properties to those the user has access to).
- For the feature-flag boot pattern — see how `oxp_super_agent_1_0` is wired into the Conversations page in DEV-301687.
- For the Amplitude event wrapper — reuse `useOxpAmplitude()` hook (already in OXP utils).
- For the optimistic-concurrency / `If-Unmodified-Since` pattern — see the existing OXP renewal-offer editor (DEV-2925xx) which does the same conflict-detection on a row-by-row basis.

## Coordination needed before code review

- **Telecom** — confirm the carrier review SLA assumptions (48h toll-free / 96h 10DLC) and the exact rejection-reason taxonomy the gateway should pass through verbatim.
- **Design** — confirm the empty-state copy when filter has zero rows ("+ Add Vanity Number for {Property Name}") and the Outbound Default demotion advisory copy in the Edit modal.
- **Marketing** — confirm the lead-source rename / deactivate edge cases (what happens to the dropdown if a lead source is deactivated mid-session).
- **Sales / Customer Success** — sign off on the customer-facing release note framing (this is presented as an OXP-native upgrade of the existing legacy feature; do not over-promise net-new capability).
- **Compliance** — confirm audit retention period for `vanity_phone_numbers_audit` rows (current default 7 years).

## Estimated lift

Frontend: 6–9 dev-days. Backend gateway + audit wiring: 4–6 dev-days. SDET coverage: 3–4 dev-days. Total ~13–19 dev-days for a single engineer; ~7–10 elapsed days with 2 engineers + 1 SDET in parallel.
