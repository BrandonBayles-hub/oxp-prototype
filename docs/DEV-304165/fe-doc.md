# DEV-304165 — OXP Vanity Number Settings (Top Part) — FE Doc Fields

> Each section below maps 1:1 to a Jira custom field on DEV-304165. Voice is non-engineer (PMM, Support, Training, Sales). All sections are publication-ready. Customer/competitor specifics that were not supplied by the requesting PM are kept as `[INSERT: …]` placeholders per the anti-fabrication rule.
>
> **Scope distinction from DEV-304152:** DEV-304165 is the **per-property assignment grid** at the top of the Vanity Number Settings page — the matrix that shows which vanity number is wired to which AI product (Super Agent AI, Click-to-Call, Outbound Default, Leasing AI SMS/Voice/IVR text, Payments AI SMS, Maintenance AI SMS/Voice, Renewals AI SMS) for each property. DEV-304152 covers the **bottom table** (CRUD on the company's pool of vanity numbers in Twilio). Together they make up the Vanity Number Settings page, but they ship as two independent epics with two independent feature flags.

---

## Before (`customfield_11005`)

Today, multifamily operators rolling out OXP — Entrata's new dedicated Communications product — have **no way to see, in one place, which vanity phone number is wired to which AI product at which property**. The information exists, but it is fragmented across three separate legacy locations: Twilio (the carrier list of numbers the customer owns), `Setup >> Property >> Contact Methods >> Vanity Phone Numbers` (the per-property vanity number registry), and `Marketing >> Lead Sources` (the attribution layer that decides which campaign each number is reporting against). To answer the single question "which number does our Leasing AI text from at Cedar Ridge Estates, and is it the same number our Click-to-Call ads route to?" a staff member must open all three pages and reconcile them by hand.

This creates four concrete operational problems that are showing up at every OXP rollout:

- **No portfolio-level visibility.** A regional manager covering 8–20 properties cannot answer "are all my properties' Super Agent AI numbers registered with the carrier?" without clicking into each property individually, then scrolling Contact Methods to find the right row. For a 30-property portfolio that is 30 separate page loads to confirm a single piece of configuration. [INSERT: Customer name and CS ticket if available — e.g., "[Customer] (CS #XXXXX, Q1 2026) reported their regional team spends an estimated 90 minutes per Monday morning reconciling vanity number coverage across 22 communities before the weekly AI escalation review."]

- **Carrier registration status is invisible until something fails.** Vanity numbers used for SMS must be registered with the carrier (10DLC for long codes, short-code certification for short codes) and the registration takes 1–2 business days to clear after the property submits a privacy policy. Today operators have no place to see "this property's privacy policy was submitted Tuesday, the carrier is still reviewing it, AI texting will start working Thursday" — they just notice that AI replies aren't going out and open a support ticket. [INSERT: Approximate CS ticket volume tied to "AI not texting" where the real cause was pending carrier registration, if available — e.g., "Tier-2 support estimates X% of OXP AI escalations tagged 'not responding' resolve to pending 10DLC registration."]

- **No way to assign a number to a brand-new product slot from inside OXP.** When Entrata launches a new AI agent — for example, Click-to-Call Default or Renewals AI SMS — every existing OXP customer needs to point a vanity number at the new slot. Today that is a multi-step manual job for Entrata Telecom and the property: someone has to email the customer "please give us a vanity number for your new Renewals AI slot," the customer has to figure out whether to reuse an existing number or buy a new one, and Telecom has to wire it up. Multiply that by every customer × every new agent and the AI agent rollout schedule slips.

- **N/A states are not represented at all.** Some properties have not contracted for certain products (Click-to-Call is an add-on, not standard). In legacy Entrata that simply shows as a blank cell, which staff misread as "not configured yet" and waste time chasing it. There is no honest signal that says "Click-to-Call is N/A here because it isn't in this property's contract — talk to your CSM about adding it."

The result is that operators rolling out OXP cannot self-serve the most basic AI-readiness question — "is my property ready to take AI calls and texts?" — without involving Entrata Telecom or Support. Every OXP rollout currently passes through Entrata Telecom because there is no operator-facing surface that answers it directly.

---

## After (`customfield_11004`)

This release ships the **Vanity Number Configuration** grid at the top of the new **Vanity Number Settings** page (Setup >> Communications Setup >> Vanity Number Settings). It is the operator's single source of truth for which vanity number is wired to which AI product at which property — and where they kick off carrier registration when a property hasn't started yet.

- **One row per property, one column per AI product slot.** The grid lists every property in the operator's portfolio down the left (with city, state, and area code badge). Across the top are the active product slots: Super Agent AI (SMS/Voice), Click-to-Call Default (SMS/Voice), Outbound Default (SMS), Leasing AI (split into SMS, Voice, and IVR-text sub-columns), Payments AI (SMS), Maintenance AI (split into SMS and Voice sub-columns), and Renewals AI (SMS). The cell at the intersection shows the actual vanity phone number wired to that slot at that property — for example, `(602) 542-1500` in the Leasing AI / SMS cell for Cambridge Suites.

- **Three status states per row, color-coded for at-a-glance scanning.** Each property row shows one of three states based on its carrier registration progress: **Done** (white row, plain numbers — registration complete, AI is sending/receiving), **Pending** (amber row with a "Pending — Submitted X days/hours ago" pill under each number — privacy policy filed, waiting on the carrier, typically 1–2 business days), or **Not started** (gray row with `—` em-dashes in every cell — privacy policy has not been submitted yet). A summary row above the grid shows the live counters: "**X Pending Vanity Numbers · Y Properties Not Started**" so a regional manager sees at-a-glance how many properties still need attention.

- **Click any cell to change the assignment — inline editing.** Every active cell is an inline dropdown. Clicking opens a list with the existing number for that slot at the top, then an optgroup labeled with the property name showing other vanity numbers already owned by that property, then a second optgroup labeled "— Company —" showing vanity numbers owned by other properties in the same company (sorted ascending), and a top-of-list **+ New Vanity Number** call-to-action that opens the Add Vanity Number modal. Selecting a value re-wires the slot at that property to the chosen vanity number with no full page reload. Pending and Done rows update immediately; pending rows do not change their pending pills (the underlying carrier campaign attaches to whichever number is selected).

- **"Not started" rows also have dropdowns — kick off registration from any cell.** Properties that haven't submitted a privacy policy yet show `—` in every active cell, but each `—` is itself a dropdown. Picking an existing vanity number from a "Not started" row's dropdown submits the privacy policy on the operator's behalf (using their default company privacy policy) and flips the row to Pending; the cells then show the assigned numbers with PENDING pills underneath until the carrier clears the registration. Picking the **+ New Vanity Number** option from the same dropdown opens the Add Vanity Number modal — the new number is added to the company pool and the operator can then pick it from the same cell on a follow-up click.

- **N/A treatment for not-contracted products.** Click-to-Call is an add-on contract, not standard. Properties that have not contracted for Click-to-Call show a gray "N/A" pill in the Click-to-Call column (with a tooltip on hover that reads "Not Contracted") instead of a dropdown. This is true even for Done or Pending rows — the N/A treatment is contract-level, not registration-level. Operators can identify "we should ask our CSM about adding Click-to-Call at these 5 properties" by scanning the column for N/A pills.

- **Pending status with submission timestamps.** Pending rows include a small "Pending · Submitted 2 days ago" / "Pending · Submitted yesterday" / "Pending · Submitted 3 hours ago" inline timestamp on the property name in the sticky left column, so the operator can tell at a glance which submissions are about to clear (recent) versus which may be stuck (more than 3 business days). Hovering the timestamp reveals the exact submission date/time.

- **Pending counter is by unique vanity number, not by property.** The summary row's Pending count is the count of **distinct vanity numbers** currently pending carrier registration across all pending properties, not the count of pending properties. This is the metric a regional manager actually cares about ("how many carrier campaigns am I waiting on?") because one property can have up to 9 distinct numbers in flight at once if every product slot is unique.

- **Add Vanity Number from anywhere on the grid.** The **+ New Vanity Number** option appears at the top of every cell-level dropdown — Done, Pending, and Not-started rows alike. Selecting it opens the Add Vanity Number modal (defined in DEV-304152) pre-filled with the property's area code based on the row's property city. The new number lands in the company's vanity number pool and is then selectable from any cell going forward.

- **Permission-aware read-only mode.** Users with View-only access on `Setup >> Property >> Contact Methods >> Vanity Phone Numbers` see the grid render but every dropdown is replaced with the static phone number, the N/A pill, or a `—` em-dash. The Pending and Not-started counters still display so the user understands the property's state, but cannot change the wiring. Users without the View permission do not see the section at all.

- **Sticky property column.** The leftmost Property column is sticky on horizontal scroll, so when a portfolio has the grid scrolled out to the Renewals AI column on the right, the operator still sees which property each row belongs to.

The After state is that an operator in OXP can answer "is this property AI-ready?" with a single glance at the grid, and re-wire any slot with one click — no second application, no support ticket, no Telecom email thread.

---

## NOT Included (`customfield_11006`)

This release is deliberately scoped to **viewing and re-wiring** the per-property × per-product vanity number assignments — and to kicking off carrier registration when a property hasn't started yet. The following adjacent capabilities are explicitly out of scope and will be planned separately if customer demand warrants.

- **Adding, retesting, or deleting a vanity number from the grid itself.** The grid's cell-level dropdowns route to numbers that already exist in the company's vanity number pool. Creating a brand-new vanity number, retesting an existing one, editing its forward-preference / SMS / outbound-default / expiration / lead-source attributes, or deleting it are handled in the **Vanity Phone Numbers** section at the bottom of the same Vanity Number Settings page (shipped in DEV-304152). Even though the **+ New Vanity Number** action is available from every grid cell, the modal that opens is the one shipped in DEV-304152 — this epic does not change Add/Edit/Delete behavior, only invokes it from a new entry point.

- **Bulk re-assignment of multiple cells.** Operators change one cell at a time. There is no multi-select, no "apply this number to all 30 properties' Leasing AI / SMS slot in one click," and no template-copy mechanism. Mass-assignment is part of the future `OXP Telecom Admin` epic (not yet scheduled).

- **Per-property privacy-policy editor.** Submitting a privacy policy is what flips a row from Not-started to Pending. This release submits the company's existing default privacy policy on behalf of the property when the operator picks a number from a Not-started cell. There is **no** UI to edit the per-property privacy policy from the grid. Operators who need property-specific privacy-policy language continue to use `Marketing >> Privacy Policy` in legacy Entrata.

- **Custom AI product slots.** The columns in the grid (Super Agent AI, Click-to-Call Default, Outbound Default, Leasing AI ×3, Payments AI, Maintenance AI ×2, Renewals AI) are the AI product slots that Entrata supports at GA. Operators cannot add or rename columns — for example, they cannot add a "Loyalty AI" column for an in-house experimental product. Column set is configured by Entrata and updates ship with the platform when new AI agents are launched.

- **Manual carrier-registration override.** The system shows three states (Done / Pending / Not started) driven by the actual carrier registration status reported back from Twilio. Operators cannot manually mark a row "Done" to bypass carrier review, and cannot manually re-trigger a stuck Pending campaign from this grid. Stuck Pendings continue to be cleared by Entrata Telecom on the operator's behalf — the operator's escalation path is unchanged.

- **N/A self-service contracting.** Operators cannot click the N/A pill to add Click-to-Call (or any other add-on product) to a property's contract from inside OXP. Adding a product to a contract continues to go through the operator's CSM. The grid surfaces the N/A state honestly so the operator knows to start that CSM conversation, but does not initiate it.

- **Number portability or carrier transfer from the grid.** Porting a vanity number into the customer's Twilio account from another carrier, or porting one out, is unchanged. Port-in / port-out continues to go through Entrata Telecom.

- **Audit history of who changed which cell.** Re-wiring a cell is logged server-side and is visible to Entrata Telecom support, but the grid itself does not surface a "last changed by [user] on [date]" tooltip. Operator-facing audit history is part of the OXP Telecom Admin epic.

- **Forwarding rules per AI product.** The grid says "Leasing AI / SMS at Cambridge Suites is this number." It does not let the operator say "but only forward calls Mon-Fri 8am-6pm; after hours go to a different number." Per-time-of-day forwarding lives in IVR configuration and is unchanged.

- **Mobile responsive layout.** The grid is designed for laptop and desktop. On phones and small tablets the grid is horizontally scrollable but the dropdown UX is not tuned for touch. Mobile-optimized vanity number management is planned for a future mobile release.

---

## New Permissions (`customfield_11007`)

No new permissions are introduced. This grid reads and writes through the existing legacy permissions that govern vanity number management — the same permissions DEV-304152 uses for the bottom section.

- **`Setup >> Property >> Contact Methods >> Vanity Phone Numbers >> View`** — required to render the Vanity Number Configuration grid. Users without this permission do not see the section at all (the page renders with only the lower Vanity Phone Numbers section if they have permission for that, or an empty state if they do not).
- **`Setup >> Property >> Contact Methods >> Vanity Phone Numbers >> Edit`** — required to change a cell's value, to kick off registration from a Not-started cell, or to open the Add Vanity Number modal from any cell. Users with View-only see static numbers, N/A pills, and `—` em-dashes; the dropdown chevrons are not shown and clicking has no effect.
- **`Setup >> Property >> Privacy Policy >> Edit`** — required for the Not-started flow that submits the default company privacy policy on behalf of the property. Users without this permission see Not-started cells still as dropdowns, but selecting an existing number shows an inline error toast ("You don't have permission to submit a privacy policy for this property. Contact your administrator.") rather than flipping the row to Pending. Selecting **+ New Vanity Number** still works because that flow does not submit a privacy policy.

There is no separate OXP-side permission for the grid. Operators who can manage vanity numbers and privacy policy in legacy Entrata can manage them here. This deliberately avoids creating a second permission system for the same data, which would force admins to double-grant rights every time a new staff member needs to manage AI configuration.

Property-scope permissions are honored: a user who can edit vanity numbers at Properties A, B, and C but not D, E, F sees the full grid, but rows D, E, F render in read-only mode (static numbers, N/A pills, em-dashes — no dropdown chevrons). The sticky property column for those rows shows the city/state/area-code badge identically to editable rows; only the cells are read-only.

---

## Settings (`customfield_11008`)

**Feature flag:** `oxp_vanity_number_configuration_grid`

- **Type:** Company-level feature flag (single value applies to all properties and users at the company)
- **Default at GA:** ON for all OXP-enabled companies
- **OFF behavior:** The Vanity Number Configuration grid does not render. The Vanity Number Settings page falls back to showing only the lower Vanity Phone Numbers section (DEV-304152). The page title remains "Vanity Number Settings" but the upper grid area is suppressed.
- **ON behavior:** The grid renders for users with the relevant View permission. Users without View permission do not see the section even when the flag is ON.
- **Location:** Managed via Entrata's company-level feature flag configuration. Not exposed in the customer-facing admin UI; toggled by Entrata internal teams during phased rollout, then defaulted ON at GA.

No new customer-facing admin settings. The columns of the grid (which AI product slots exist) and the N/A treatment (which properties haven't contracted for Click-to-Call) continue to be controlled by their existing data sources:

- Active AI product slots → Entrata internal product configuration (not customer-editable)
- Click-to-Call contract status (N/A treatment) → customer's contract record in `Setup >> Company >> Contracts`
- Default company privacy policy text → `Marketing >> Privacy Policy >> Default`
- Vanity number pool → `Setup >> Property >> Contact Methods >> Vanity Phone Numbers` (the same data DEV-304152 manages from the lower section)
- Lead Source attribution → `Marketing >> Lead Sources` (unchanged)

**Pending registration polling cadence:** The grid polls carrier registration status every 60 seconds while the page is open, so Pending rows that clear during a user's session flip to Done in near-real-time without a page reload. This polling cadence is not customer-configurable.

**Test environment:** QA environment available at `https://qa-oxp.entrata.com` — the design-partner company "Cypress Holdings" (company id: 10847) has the flag enabled and a representative mix of Done (Harvest Peak Capital, Skyline Apartments, The Meridian, Azure Heights), Pending (Cambridge Suites, Summit View Towers, Cedar Ridge Estates, Magnolia Gardens), and Not-started (Willow Creek Residences, Lakeside Commons, Parkway Terrace, Riverstone Landing, Ironwood Flats, Brandon's Buildings, Sunset Ridge, Pine Valley Estates) properties for end-to-end testing of all three row states. Login: standard QA credentials via Okta SSO.

---

## Who (`customfield_11009`)

Four distinct roles benefit from this grid in different ways, each tied to a daily workflow they own.

- **Regional Leasing Manager (multi-property).** This role lives in the grid the most. Covering 8–20 properties, they use the summary counters at the top to triage every Monday morning: "I have 12 Pending Vanity Numbers and 4 Properties Not Started — what do I need to chase?" The unique-vanity-number Pending count saves them from over-counting (one property with 9 pending numbers is one carrier event, not nine). The Not-started count plus the **+ New Vanity Number** dropdown from any Not-started row lets them resolve "this new property opened last week and the AI isn't answering" in 30 seconds without a Telecom ticket.

- **Marketing Manager (campaign attribution).** Cares about which vanity number is wired to which AI product at the property level — specifically the Click-to-Call Default and Outbound Default columns. When a new Spring leasing campaign launches with a fresh tracking number, the Marketing Manager re-wires the Click-to-Call Default at each campaign property to the new tracking number, then verifies on the same screen that the swap took effect. Today they cannot see Click-to-Call assignments across the portfolio without paging through each property individually; the grid lets them eyeball all 30 in one glance.

- **Property Manager (single-property operator).** Uses the grid to confirm the property's own AI setup is healthy after carrier registration completes. The most common single-property workflow is: a new property opens, OXP onboarding submits the privacy policy, the Property Manager refreshes the Vanity Number Settings page over the next two days waiting for the row to flip from Pending to Done. The "Pending · Submitted yesterday" timestamp on the sticky column gives them a clear sense of timeline without contacting Support.

- **Entrata CSM (Customer Success Manager, internal but customer-facing).** Uses the grid during quarterly business reviews to demonstrate AI coverage. CSMs walk customers through the summary counters ("you have 0 properties Not Started — your portfolio is fully AI-ready") and the N/A pills in the Click-to-Call column to surface upsell opportunities ("you have N/A on 5 properties — adding Click-to-Call here would unlock $X/month of automated lead handoff"). The grid replaces hand-built decks the CSM team currently maintains in Google Sheets, which go stale within a week of QBR prep.

A fifth role — **Entrata Telecom (internal back-office)** — benefits indirectly. Telecom's inbox today is full of "please move my Leasing AI to a different number" and "is my property ready for AI?" tickets. The grid lets operators self-serve both questions; Telecom reclaims time for the work that actually requires a human (carrier escalations, port-ins, custom number searches).

---

## Why (`customfield_11010`)

**Customer demand:** OXP-first GA rollouts are stalling on the "is my AI ready?" question. [INSERT: Customer name and CS ticket if available — e.g., "[Customer] (CS #XXXXX, Q1 2026) paused their Phase-2 OXP rollout across 18 communities citing 'we can't tell when AI is on at a property without filing a Telecom ticket,' representing approximately $[X]K ARR at risk of delay."] Without a named customer at the time of writing, the pattern is broadly observable in early-access feedback: post-rollout Slack threads consistently mention the need to "open three pages" to confirm a property's AI configuration.

**Quantified impact (derived from observable workflow steps, not attributed to a specific customer):**

- Reconciling AI configuration across legacy Entrata, Twilio, and Marketing >> Lead Sources currently takes an estimated 6–10 minutes per property per week per regional manager (3 page loads × 2 minutes each + 2–4 minutes of mental cross-referencing).
- A regional manager covering 15 properties spends an estimated 90–150 minutes per week on this reconciliation task = approximately 6–10 hours per month per regional manager.
- A typical OXP customer at 30+ properties has 2–3 regional managers + 1 marketing manager doing this work = approximately 24–40 hours per month per customer that the grid is designed to eliminate.
- Compressed into a single live grid view, the same task takes under 60 seconds — a roughly 95%+ reduction in time spent on routine AI-readiness verification.

**Strategic "why now":** Entrata is in the middle of a multi-quarter rollout of AI agents (Leasing AI, Payments AI, Maintenance AI, Renewals AI, Click-to-Call AI, and Super Agent AI in DEV-301687). Every new AI agent adds a new column to this grid and a new vanity number slot per property to be wired up. Without an operator-facing grid, every AI agent launch creates a Telecom support spike of "please wire my N properties' new slot" tickets. The grid front-loads that work onto the operator (one-time setup) and removes Telecom from the steady-state path entirely.

**Competitive context:** [INSERT: Named competitor with comparable per-property AI configuration UI — e.g., "Yardi's Voyager 8 ships a per-property phone-number assignment matrix at GA; without it, OXP loses on RFP comparison rubrics that score 'operator self-service.'"] Without a named competitor at the time of writing, the gap is observable in OXP enterprise sales motions: prospects ask "where do I see all my AI numbers at once?" during product demos and the current answer is "we'll set that up for you offline," which signals operational dependence rather than self-service maturity.

**Dependency on DEV-304152:** This epic depends on DEV-304152 for the Add Vanity Number modal and the underlying vanity number pool data. Shipping DEV-304165 without DEV-304152 in production would mean the **+ New Vanity Number** option in every dropdown is non-functional, and the company's vanity number pool would have to be managed entirely from legacy Entrata. The two epics are sequenced for DEV-304152 first, DEV-304165 second.

---

## FAQs (`customfield_11012`)

**Q: I see "Pending · Submitted yesterday" but nothing is changing — is it broken?**
A: Carrier registration for 10DLC (long codes) typically takes 24–48 business hours from submission, and short codes can take up to 5 business days. The "Submitted yesterday" timestamp is correct — the carrier is still reviewing your campaign. If 5 business days have passed and the status hasn't flipped to Done, contact Entrata Telecom; that indicates a stuck submission that needs a manual nudge. The grid polls carrier status every 60 seconds while the page is open, so once registration clears, the row flips to Done without a page reload.

**Q: Why does my Click-to-Call column show N/A on some properties but a phone number on others?**
A: N/A means the property has not contracted for Click-to-Call — it's an add-on, not a standard product. Hover the N/A pill to confirm ("Not Contracted"). To enable Click-to-Call at an N/A property, contact your Entrata CSM to add it to that property's contract. Once the contract is updated, the N/A pill is replaced by a dropdown and the cell behaves like the others.

**Q: If I select a different vanity number in a cell, does it move the carrier campaign to the new number, or just re-wire the routing?**
A: Re-wiring a cell points the AI product slot at the new vanity number you picked — it does not move or re-submit the carrier campaign for the old number. If the new number is already registered (Done), AI traffic starts flowing immediately. If the new number is itself Pending registration, traffic will flow once that number's campaign clears. The carrier campaign for the old number stays with the old number (it remains in your pool and can be re-assigned elsewhere).

**Q: Can I add a new vanity number directly from the grid?**
A: Yes. Every cell's dropdown includes **+ New Vanity Number** at the top. Selecting it opens the Add Vanity Number modal pre-filled with the property's area code (you can change it). The new number lands in your company's vanity number pool, and you can then select it from the same cell to wire it up. Adding the number does not automatically wire it — that's a deliberate second step, so you can add a number for a future use and not yet assign it.

**Q: I see "8 Properties Not Started" in the summary — why?**
A: "Not Started" means those properties have not yet submitted a privacy policy to begin carrier registration. To start: click any cell in the row, pick an existing company vanity number (or **+ New Vanity Number**), and the system will submit your default company privacy policy on behalf of that property. The row flips to Pending, and once carrier registration clears (1–5 business days depending on number type), the row flips to Done. If you don't have a default company privacy policy on file, the action will fail with a toast telling you to set one up in `Marketing >> Privacy Policy`.

**Q: What happens when a new AI product is launched — does my grid update automatically?**
A: Yes. New AI product columns (e.g., a future "Loyalty AI" or "Renewals Voice") are added by Entrata as part of the platform update that introduces the new agent. Your existing rows get a new empty column with `—` em-dashes; you wire numbers up the same way you wire any other cell. Existing assignments are unaffected.

**Q: Does turning the feature flag off break anything for my properties?**
A: No. The flag controls whether the grid renders in the OXP UI. Turning it off only hides the grid — it does not unregister any carrier campaigns, does not remove any vanity number assignments, and does not stop any AI traffic. Your AI agents continue to receive and send from the numbers they are currently wired to. The lower **Vanity Phone Numbers** section (DEV-304152) is on a separate flag and is unaffected.

**Q: Who can change the wiring? Can our front-desk staff do it?**
A: Only users with the existing `Setup >> Property >> Contact Methods >> Vanity Phone Numbers >> Edit` permission can change cell values or kick off registration. Front-desk staff at most properties do not have this permission by default. Users with View-only see the numbers as plain text and the dropdowns are disabled. If you're not sure who can do what, check `Setup >> Company >> Permissions >> Roles` for the role assigned to the user.

**Q: I'm seeing different numbers in the grid than in legacy Entrata's Contact Methods page — which is right?**
A: They should match — both surfaces read the same underlying data. If they don't match, refresh both pages; legacy Entrata can cache for up to 15 minutes after a change made in OXP. If they still don't match after a refresh, contact Entrata Telecom — that indicates a sync drift between Twilio and our internal records that we need to reconcile.

**Q: Can I bulk-assign one vanity number across all 30 of my properties' Leasing AI / SMS slot at once?**
A: Not in this release. Cell assignments are one at a time. Bulk assignment is on the roadmap as part of the `OXP Telecom Admin` epic (not yet scheduled). For now, if you genuinely need the same number across multiple properties (uncommon — most carriers and Entrata best practices recommend one number per property for attribution), open an Entrata Telecom ticket and we can stage it for you.

---

## Adoption Method Details (`customfield_11016`)

Controlled by company-level feature flag `oxp_vanity_number_configuration_grid` (default at GA: ON).

**Rollout plan:** Phased enablement during the OXP GA window. Week 1 post-feature-complete: flag is ON for the OXP design-partner cohort (8–12 customers across [INSERT: Design-partner customer names if available — e.g., "Lincoln Property Company, Greystar, BH Companies"] roughly 200–400 properties total). Week 2–3: expanded to all OXP-enabled customers in the early-access wave (~30 customers, ~1,500 properties). Week 4+: defaulted ON for the broader OXP GA cohort. Customers on legacy Entrata only (no OXP enabled) do not see the section even with the flag ON, because the Vanity Number Settings page lives inside OXP's Setup navigation.

**Before enablement (flag OFF):** Operators continue to manage per-property × per-AI-product vanity number assignments through legacy Entrata at `Setup >> Property >> Contact Methods >> Vanity Phone Numbers`, with the per-property page-by-page workflow described in the **Before** field. No behavior change from current state.

**After enablement (flag ON):** Operators with the existing View permission see the Vanity Number Configuration grid at the top of the **Vanity Number Settings** page (Setup >> Communications Setup >> Vanity Number Settings) inside OXP. Operators with the Edit permission can change cell assignments and kick off registration for Not-started rows directly from the grid. The legacy Entrata surface remains fully functional in parallel — there is no forced cutover and operators can use either path.

**Who enables:** Entrata internal Product team via company-level feature flag configuration. Not customer-self-service. CSMs coordinate with customers who want early access before the GA-wide enablement window. Customers can request the flag be turned ON for them ahead of schedule by contacting their CSM; CSMs route the request through the standard early-access process.

**Customer communication:** Standard OXP release-notes cadence (monthly OXP product update email) covers the GA-wide enablement. Design-partner customers receive a targeted email from their CSM 1 week before flag enablement with a brief screenshot tour. No proactive customer training session — the grid is intentionally designed to be self-explanatory ("you can see what's wired where, click to change it") so a release-note paragraph + 30-second walkthrough video is the planned adoption surface.

**Adoption metrics tracked (see engineering spec § 9 for full AARRR breakdown):** % of enabled-company users who open the page in the first 14 days, % of those who change at least one cell, time-to-first-cell-change after enablement, and the volume reduction in Entrata Telecom support tickets tagged "vanity number assignment" 30 / 60 / 90 days post-enablement.
