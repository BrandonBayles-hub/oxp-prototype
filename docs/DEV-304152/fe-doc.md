# DEV-304152 — OXP Vanity Phone Numbers Section — FE Doc Fields

> Each section below maps 1:1 to a Jira custom field on DEV-304152. Voice is non-engineer (PMM, Support, Training, Sales). All sections are publication-ready. Customer/competitor specifics that were not supplied by the requesting PM are kept as `[INSERT: …]` placeholders per the anti-fabrication rule.

---

## Before (`customfield_11005`)

Today, multifamily operators who have rolled out OXP — Entrata's new dedicated Communications product — still have no way to view, add, edit, retest, or delete a vanity phone number from inside OXP itself. Every vanity number action requires the user to leave OXP, sign into legacy Entrata, and navigate to `Setup >> Property >> Contact Methods >> Vanity Phone Numbers`. The vanity numbers themselves are provisioned in Twilio and managed by Entrata's Telecom team, so the operator-facing job is small (configure routing, SMS settings, expiration, lead source attribution) — but the context switch to a separate application makes it disproportionately painful for the OXP-first audience.

This creates three concrete operational problems:

- **Daily context switching for OXP-primary staff.** Property managers, marketing managers, and regional leads who live in OXP all day for inbox triage, AI escalation review, and outbound campaigns must sign into a second application — legacy Entrata — every time a vanity number needs to be added, retired, retested, or repointed. A regional manager covering 8–15 properties typically touches vanity number configuration 3–6 times per week (new lead-source attribution, campaign cutover, expiring carrier registration, SMS opt-in churn). Each round-trip — sign in to legacy Entrata, navigate to the property, find the vanity number, edit, save, sign back into OXP — takes an estimated 6–10 minutes per change, all spent on navigation rather than configuration. At portfolio scale this is 100–200+ minutes per week per regional manager on context switching alone. [INSERT: Customer name and CS ticket if available — e.g., "[Customer] (CS #XXXXX, Q1 2026) reported their two regional managers each lose an estimated 2–3 hours per week to the OXP-to-legacy round-trip on vanity number administration."]

- **No way to see vanity numbers filtered to a single property.** Legacy Entrata's `Contact Methods >> Vanity Phone Numbers` view shows the company-wide vanity number list with no built-in per-property filter — staff have to mentally scan a 50–500 row table to find the rows for one community, especially in mixed portfolios where some properties have 1 vanity number and others have 10+ (multiple lead-source attributions, separate SMS-only numbers, AI bailout numbers, maintenance numbers). A leasing manager onboarding a single new property cannot easily answer "show me only the vanity numbers tied to Cedar Ridge Estates" without exporting to CSV, sorting in Excel, and filtering. This export-sort-filter habit produces stale snapshots that get out of date the moment a teammate makes another change.

- **Missing OXP-resident telephony surface blocks pure-OXP customers.** Newer customers and net-new accounts in the OXP-first GA wave (post DEV-2937xx — OXP Communications GA) are increasingly told "you can run leasing communications without ever opening legacy Entrata." Today that promise breaks the first time their marketing team needs to swap a lead source on a vanity number after a campaign goes live, or the first time a property fails carrier 10DLC re-registration and needs to retest. The customer has to be told "open the old UI" — which is a credibility hit in the OXP-first rollout narrative, particularly during competitive evaluations against newer platforms. [INSERT: Specific design-partner or new-logo account that flagged this gap, if available — e.g., "[Customer] paused full OXP migration of 22 communities pending vanity number self-service in OXP (CS #XXXXX, ~$YK ARR pending)."]

The vanity numbers themselves still need to live in Twilio (we own the carrier relationship) and the data still needs to reflect into Marketing >> Lead Sources for attribution. What is missing today is simply the **operator-facing management surface inside OXP**.

---

## After (`customfield_11004`)

This release ships a new **Vanity Phone Numbers** section at the bottom of OXP's existing **Vanity Number Settings** page (Communications Setup >> Vanity Number Settings). It gives operators full lifecycle management of their company's vanity phone numbers without leaving OXP, and adds a per-property filter that legacy Entrata never offered.

- **Vanity Number table** — A new section titled "Vanity Phone Numbers" appears below the existing per-product number assignment table on the **Communications Setup >> Vanity Number Settings** page. The table lists every vanity number registered to the customer's Twilio account, showing: Property (resolved to property name), Phone Number, Type (Lead / SMS Only / Maintenance), Lead Source attribution, Forward Preference (Office Contact / IVR / Specific Number), Route Calls (10-digit destination), SMS Registration Status (Verified / In Review / Not Submitted with timestamp), SMS Enabled toggle indicator, Outbound Default indicator, Expiration Date (blank for non-expiring), Caller ID Registered indicator, and a row Actions column (Edit pencil icon).
- **Property filter — new capability** — At the top of the Vanity Phone Numbers table, a Property dropdown lets the user filter the table to a single property (e.g., "Cedar Ridge Estates" shows only that property's vanity rows) or view "All Properties" (default). The filter is client-side and updates the visible rows instantly with no full page reload. The filter selection persists for the user's session and resets to "All Properties" on next sign-in.
- **Add Vanity Number** — A "+ Add Vanity Number" button at the top of the table opens a modal with a **Select Preferences** form: Phone Number Type (locked to "Company Vanity Number" for this release), Toll-Free toggle (Yes / No), Area Code 3-digit field (shown only when Toll-Free = No), Forward Preference dropdown (Office Contacts / IVR / Specific Number), Use for SMS toggle (defaults to Yes for new numbers), conditional Outbound Default toggle (shown only when Use for SMS = Yes), and Expiration Date picker. Submission queues the request with Entrata Telecom and the new row appears in the table with SMS Registration Status = "In Review" / Caller ID = pending until the carrier confirms registration (typically 1–2 business days for short codes and 3–5 business days for 10DLC).
- **Edit Vanity Number** — Clicking the pencil icon on any row opens the **Edit Vanity Number** modal pre-filled with the row's current configuration. Editable fields: Forward Preference, Route Calls (10-digit destination — auto-formatted as `(XXX) XXX-XXXX` on display, raw 10 digits on submit), Lead Source (single-select dropdown sourced from `Marketing >> Lead Sources`), Use for SMS toggle, conditional Outbound Default toggle (with a yellow advisory when toggling on: "By adding this number, Outbound Default will no longer be associated with `(XXX) XXX-XXXX`"), Expiration Date, AI Bailout Number toggle (signals which number ELI+ AI transfers to when the caller asks for a representative — does not change call routing), and a "Retest Vanity Number" button.
- **Retest** — The Edit modal includes a "Retest Vanity Number" button. Clicking it shows an inline success banner "We are now testing `(XXX) XXX-XXXX` which can take up to ten minutes." and kicks off a Twilio number-health re-check (caller ID, SMS reachability, carrier registration freshness). The result is appended to the row's audit log and updates the SMS Registration Status badge when complete.
- **Delete with carrier warning** — Inside the Edit modal a "Delete" button at the bottom-left opens a confirmation modal titled "Delete Register Vanity Phone Number" with the explicit warning: "Please confirm that you want to delete registration of this number. After the registration is deleted any messages sent from this number will be at a higher risk of being blocked by carrier filtering." Confirming removes the row from the table and de-registers the number with the carrier (the underlying Twilio number remains parked unless Telecom releases it).
- **Inline status badges** — The SMS Registration Status column renders one of three pill states: green "Verified on MM/DD/YYYY" when carrier 10DLC/short-code registration is current, amber "In Review (submitted X days ago)" while the carrier campaign is pending, or gray "Not Submitted" if the property hasn't completed privacy-policy submission. The Caller ID Registered column shows a green check or a gray dash.
- **Lead-source guardrail** — If a user tries to change the Type of a vanity number that is currently attached to a lead source in `Marketing >> Lead Sources`, the Edit modal shows a yellow warning: "This vanity number is associated with at least one lead source, please disassociate before changing the number type." This prevents silent attribution loss on live campaigns.
- **Permission gating** — Users without the existing `Setup >> Property >> Contact Methods >> Vanity Phone Numbers >> Edit` permission see the section in read-only mode (table renders, but the "+ Add Vanity Number" button, the pencil-icon Edit action, and the Delete button are hidden). Users without the corresponding `Read` permission do not see the section at all.

---

## NOT Included (`customfield_11006`)

This release is deliberately scoped to operator-facing management of vanity numbers that **already exist in the customer's Twilio account**. The following are explicitly out of scope and will be planned separately if customer demand warrants.

- **Bulk import / CSV upload of vanity numbers.** Operators add one vanity number at a time via the Add modal. Bulk provisioning of 10+ numbers in a single transaction is not part of this release — customers needing bulk setup at onboarding continue to use the Entrata Telecom onboarding workflow.
- **Self-service number purchasing from Twilio.** The Add modal queues a request with Entrata Telecom; it does **not** directly purchase a number from Twilio against the customer's account. Direct Twilio purchase, port-in, port-out, and SMS campaign sponsor registration remain managed by Entrata Telecom.
- **Voice IVR / call tree / business-hours configuration.** Forward Preference exposes three values (Office Contact / IVR / Specific Number). The IVR option points the call into the property's existing IVR flow — this release does **not** include editing the IVR tree, hours of operation, holiday overrides, or after-hours voicemail. Those live in `Setup >> Property >> IVR Configuration` and remain unchanged.
- **Conference / multi-line / call-queue management.** Vanity numbers in this release are 1:1 with a single destination (Office Contact, IVR endpoint, or Specific Number). Hunt groups, sequential dial, simultaneous ring across multiple destinations, and call-queue overflow are not configurable here.
- **International numbers, vanity number search, or "memorable number" picker.** The Add modal accepts a 3-digit area code or the Toll-Free flag and lets Entrata Telecom assign the next available number. There is no UI to browse, search, or reserve a specific "vanity" digit pattern (e.g., 1-800-FLOWERS) — those requests go through Entrata Telecom directly.
- **Cross-property bulk re-assignment.** Moving 10 vanity numbers from Property A to Property B at once is not supported here. Users edit one row at a time. Mass property re-assignment is part of the future `OXP Telecom Admin` epic (not yet scheduled).
- **Archive / historical view of deleted numbers.** Deleting a vanity number removes the row from the table. There is no "Deleted" tab or historical export in this release. Audit history of *who* deleted *which* number is still recorded server-side and visible to Entrata Telecom support, but it is not surfaced to operators in OXP. Operator-facing audit history is planned for the OXP Telecom Admin epic.
- **Lead source creation.** The Edit modal's Lead Source dropdown is populated from `Marketing >> Lead Sources`. Creating a brand-new lead source from inside this modal is not supported — staff still go to `Marketing >> Lead Sources` to add a new source, then return to the vanity number row to attach it.

---

## New Permissions (`customfield_11007`)

No new permissions are introduced. This OXP section reads and writes through the existing legacy permissions that govern vanity number management:

- `Setup >> Property >> Contact Methods >> Vanity Phone Numbers >> View` — required to render the section. Users without this permission do not see the Vanity Phone Numbers section at all.
- `Setup >> Property >> Contact Methods >> Vanity Phone Numbers >> Edit` — required to add, edit, retest, or delete a row. Users with only View see the section in read-only mode: the table renders, but the "+ Add Vanity Number" button is hidden, pencil-icon Edit actions are hidden, and the Delete button inside the Edit modal is hidden.
- `Marketing >> Lead Sources >> View` — required for the Lead Source dropdown to load values in the Edit modal. Users without this permission see "—" in the Lead Source column and the dropdown shows "No lead sources available — request access from your administrator."

Users who can manage vanity numbers in legacy Entrata can manage them here. Users who cannot, cannot. There is no separate OXP-side permission to grant. This avoids two permission systems for the same data.

---

## Settings (`customfield_11008`)

**Feature flag:** `oxp_communications_vanity_numbers_section`

- **Type:** Company-level feature flag (single value applies to all properties and users at the company)
- **Default at GA:** ON for all OXP-enabled companies
- **OFF behavior:** The Vanity Phone Numbers section does not render at the bottom of the Vanity Number Settings page. The existing per-product number assignment table above is unaffected.
- **ON behavior:** The Vanity Phone Numbers section renders for users with View permission. Users without View permission do not see the section even when the flag is ON.
- **Location:** Managed via Entrata's company-level feature flag configuration. Not exposed in the customer-facing admin UI; toggled by Entrata internal teams during phased rollout, then defaulted ON at GA.

No new customer-facing admin settings. Forward Preference values (Office Contact / IVR / Specific Number), Lead Source list, and IVR endpoint mapping continue to be controlled by their existing settings:

- Office Contact list → `Setup >> Property >> Contacts >> Office Contacts`
- IVR endpoint → `Setup >> Property >> IVR Configuration`
- Lead Source list → `Marketing >> Lead Sources`

**Test environment:** Available on the OXP QA stack — request access via the `#oxp-qa` Slack channel. The QA account "OXP Vanity Demo Co" (ID `[INSERT: QA company id]`) has 16 properties seeded with a mix of vanity number types (Lead, SMS Only, Maintenance), states (Verified, In Review, Not Submitted), and expiration scenarios. Test login via standard QA Okta SSO.

---

## Who (`customfield_11009`)

- **Property Manager** — Manages day-to-day vanity number routing for their property: swapping a forwarding destination when an Office Contact rolls off, retesting a number after a campaign hand-off, removing expired carrier registrations, and verifying SMS-enabled status before sending a property-wide outbound campaign. With the new property filter, a single-property PM sees only their property's rows by default — no more scanning a portfolio-wide list. Estimated 3–6 touches per property per month; this release saves 4–8 minutes per touch compared to the legacy round-trip.
- **Marketing Manager** — Owns lead-source attribution across the portfolio. Uses the Vanity Phone Numbers section to attach a new lead source to a freshly registered campaign number, change attribution when a paid ad campaign sunsets, and audit which vanity numbers are still pointed at retired lead sources. The lead-source attribution dropdown and the existing `Marketing >> Lead Sources` configuration remain the source of truth; this section makes the *attachment* operation a single in-OXP workflow rather than a legacy round-trip.
- **Regional Leasing Manager** — Audits multi-property vanity number health across their 8–15 properties: uses the property filter to spot-check each community's vanity registration status, confirms the AI Bailout Number setting before a Super Agent rollout, and pulls a quick visual of which properties still have SMS Registration Status = "Not Submitted" so they can chase down the privacy policy submissions blocking carrier approval. Estimated 30–60 minutes per week previously spent on legacy round-trips reduced to 5–10 minutes via the OXP filter.
- **Implementation / Onboarding Specialist (Entrata internal)** — Uses the section during customer onboarding to verify each property's vanity numbers, route preferences, and SMS opt-in settings line up before turning on Communications. The property filter accelerates the per-property go-live checklist by replacing the legacy Excel export step. Saves an estimated 30–45 minutes per onboarding by removing the legacy UI step from the playbook.
- **Compliance / Telecom Admin (Entrata internal)** — Uses the SMS Registration Status and Caller ID Registered indicators to find properties that need carrier re-registration before the 10DLC enforcement deadline, and to schedule retest runs on numbers showing degraded reachability. The retest button and inline status freshness reduce the legacy ticket back-and-forth previously needed for the same operation.

---

## Why (`customfield_11010`)

**Strategic context — OXP-first promise.** The OXP product narrative in 2026 is that operators can run their entire leasing, payments, maintenance, and renewals communication workflow from OXP without ever opening legacy Entrata. Today, the first place that narrative breaks is telephony administration — every vanity number change forces the user back to `Setup >> Property >> Contact Methods` in legacy. Closing this gap is a credibility prerequisite for the wave of OXP-first net-new customers expected in [INSERT: target quarter — e.g., "H2 2026"]. [INSERT: Named design-partner accounts that have explicitly cited the OXP-vs-legacy split as a blocker, if available — e.g., "[Customer] (CS #XXXXX) confirmed they would not migrate Property Management Module to OXP Communications until vanity number administration was native."]

**Quantified operator impact.** At the regional-manager and marketing-manager level: an estimated 4–8 minutes per round-trip × 3–6 touches per property per month × 8–15 properties per regional manager = roughly 100–700 minutes per regional manager per month spent on the legacy round-trip alone. Across a 30-property portfolio managed by 3 regional managers and 1 marketing manager, that's 6–25 person-hours per month redirected from administration to actual leasing/marketing work after this ships. [INSERT: Customer-specific impact if available — e.g., "[Customer] (~120 communities, 14 regional managers) projected a 200+ hour/month operational saving from the OXP-native vanity number flow."]

**Competitive parity.** [INSERT: Named competitor with native in-product telephony administration, if available — e.g., "Yardi RentCafé and AppFolio Stack both surface vanity number administration in their primary communications product, not in a separate admin portal."] OXP shipping without this surface is a recurring objection in enterprise sales cycles where the buyer expects "all telephony admin in one place."

**Risk mitigation.** Carrier 10DLC enforcement penalties and SMS deliverability degradation hit customers when SMS Registration Status falls out of "Verified." Today, OXP-primary staff often discover their property's status went stale only after a campaign sends and bounces — because they don't routinely log into legacy Entrata to check. Surfacing the SMS Registration Status badge inside OXP, where staff already live, dramatically increases the chance of proactive retest before deliverability is impacted. [INSERT: Customer who reported an SMS deliverability incident attributable to lapsed carrier registration that this surface would have caught earlier, if available.]

**Why now and not later.** The legacy Vanity Phone Numbers UI is unchanged and continues to work — there is no urgent functional gap. What is changing is the OXP rollout cadence: with OXP Communications now general availability ([INSERT: actual GA quarter]), every new customer cohort expects the OXP-first experience to be complete. Shipping this surface late means each new cohort gets the broken-promise experience before we fix it.

---

## FAQs (`customfield_11012`)

**Q: Do the vanity numbers I manage in OXP show up in legacy Entrata too?**
A: Yes. The OXP Vanity Phone Numbers section is a window onto the same underlying records that `Setup >> Property >> Contact Methods >> Vanity Phone Numbers` shows in legacy. Adding, editing, or deleting a number in OXP is the same as doing it in legacy — both surfaces stay in sync. There is no separate OXP-only list.

**Q: What's actually new compared to the legacy Vanity Phone Numbers page?**
A: Two things. First, you no longer need to leave OXP to do the work — the section lives at the bottom of `Communications Setup >> Vanity Number Settings`. Second, there is a per-property filter at the top of the table that legacy never had — you can show only the vanity numbers tied to one property instead of scanning the company-wide list.

**Q: Why can't I add a brand-new toll-free number with a custom digit pattern (like 1-800-FLOWERS) from this UI?**
A: The Add Vanity Number modal asks Entrata Telecom to assign the next available number for a given area code or toll-free range — it doesn't search Twilio's inventory for a memorable digit pattern. If you need a specific pattern, open a ticket with Entrata Telecom and we'll source it for you, then it will appear in your table automatically.

**Q: I clicked Retest — how long does it take?**
A: Up to 10 minutes. The banner inside the Edit modal confirms the retest started ("We are now testing `(XXX) XXX-XXXX` which can take up to ten minutes."). When it finishes, the SMS Registration Status column will refresh to show the current state. You can close the modal and come back — the retest runs in the background.

**Q: What happens if I delete a vanity number while a campaign is using it?**
A: Two things happen. The number's row is removed from your table immediately, and a deregistration request is sent to the carrier. The number itself remains parked in your Twilio account until Entrata Telecom explicitly releases it back to the carrier pool. **However**, any inbound call or text routed to that number after deletion is at a much higher risk of being blocked by carrier SMS filtering — the confirmation modal calls this out. If the number is currently attached to an active lead source, the system will warn you before allowing the delete.

**Q: What does "AI Bailout Number" do?**
A: It does not change call routing. The AI Bailout Number toggle marks which vanity number ELI+ AI considers when a resident or caller asks to speak to a human and the AI transfers the call. Routing itself is still controlled by the Forward Preference and Route Calls fields. Think of "AI Bailout Number" as a label that tells the AI which line is the right "escape hatch" for that property.

**Q: Why does the Outbound Default warning say it will move away from another number?**
A: Each property has exactly one Outbound Default vanity number — that's the number outgoing messages appear to come from when staff sends an SMS to a resident or lead. If you toggle Outbound Default = Yes on a new row, the previous Outbound Default for that property is automatically demoted (Outbound Default = No). The advisory inside the Edit modal tells you which number is being demoted so you're not surprised. Without an Outbound Default set, outgoing SMS falls back to the shared short code `51378`, which is less recognizable to recipients and worse for marketing attribution.

**Q: What if my property doesn't have the new OXP section yet?**
A: The Vanity Phone Numbers section is governed by the company-level feature flag `oxp_communications_vanity_numbers_section`. At GA the flag is ON for all OXP-enabled companies. If you don't see the section, either (a) your company isn't OXP-enabled yet, in which case you continue to use `Setup >> Property >> Contact Methods >> Vanity Phone Numbers` in legacy Entrata as you do today, or (b) you don't have the View permission — contact your administrator.

**Q: What permissions do I need to add or delete a vanity number from OXP?**
A: The same permissions that govern the legacy `Setup >> Property >> Contact Methods >> Vanity Phone Numbers` page. View permission shows you the section in read-only mode. Edit permission shows the "+ Add Vanity Number" button and the row-level Edit and Delete actions. No new OXP-specific permission is introduced.

**Q: Does turning the feature flag off lose any data?**
A: No. The flag controls only whether the OXP section renders. The underlying vanity number records continue to live in the same Entrata data store the legacy UI reads. Switching the flag back ON immediately re-displays the section with everything intact.

---

## Adoption Method Details (`customfield_11016`)

**Adoption method:** Required at GA. The Vanity Phone Numbers section ships ON by default for all OXP-enabled companies — there is no opt-in step required by the customer. Customers see the new section the first time they navigate to `Communications Setup >> Vanity Number Settings` in OXP after the release.

**Rollout plan:**

- **Week 0 (pre-GA):** Feature flag `oxp_communications_vanity_numbers_section` enabled on the OXP QA stack (1 internal company, "OXP Vanity Demo Co"). Internal QA + Entrata Telecom sign-off on add / edit / retest / delete round-trips against Twilio sandbox.
- **Week 1 post-GA (design partners):** Flag enabled for [INSERT: 2–4 design-partner companies — names if you have them, otherwise the placeholder]. Entrata Telecom and the OXP Engineering team monitor support ticket volume on Communications Setup. No customer-facing release note yet.
- **Week 2 post-GA (early adopters):** Flag enabled for all customers in the OXP "early adopter" cohort (defined in the OXP Communications GA distribution list). Customer-facing release note published.
- **Week 3 post-GA (general availability):** Flag flipped ON for all OXP-enabled companies. The legacy `Setup >> Property >> Contact Methods >> Vanity Phone Numbers` page is unchanged and remains the source of truth — both surfaces continue to work side by side.

**Before flag ON (any property):** The Vanity Number Settings page in OXP shows the existing per-product number assignment table (top half) and nothing below it. The legacy `Setup >> Property >> Contact Methods >> Vanity Phone Numbers` page is unchanged.

**After flag ON:** A new "Vanity Phone Numbers" section renders at the bottom of the same OXP page, with the property filter, the Vanity Number table, the "+ Add Vanity Number" button, and the row Edit / Retest / Delete actions. Behavior is identical to legacy Entrata except for the added property filter.

**Who enables it:** Entrata internal team (Engineering / Telecom) via company-level feature flag configuration. Not customer self-service. CSMs may request earlier enablement for a specific customer through the standard feature-flag request process.

**Communication:** Release note published in the OXP Release Notes channel + Entrata Customer Knowledge Base article (replacing or augmenting the existing "Vanity Phone Numbers" KB entry). Sales-enablement deck updated to remove the "you'll need to use legacy Entrata for telephony" caveat from the OXP demo flow.
