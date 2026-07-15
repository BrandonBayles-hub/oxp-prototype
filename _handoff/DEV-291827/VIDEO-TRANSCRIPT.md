# VIDEO-TRANSCRIPT — DEV-291827: Renewals AI Follow-Up Cadence Settings

## Scene 1: Introduction

**[SAY]** Project Title: "Renewals AI Follow-Up Cadence Settings"

This walkthrough demonstrates how property managers configure when and how the Renewal AI agent follows up on renewal offers and unsigned leases — all from within the OXP Agent Roster.

**[PAUSE 1s]**

---

## Scene 2: Navigation to Renewal AI

*Navigate to http://localhost:3000/agent-roster → scroll to Renewal AI card*

The Renewal AI agent card appears in the Agent Roster alongside Leasing AI, Maintenance AI, and other ELI+ agents. Clicking the card opens the Renewal AI flyout, which shows all properties in the portfolio with their activation status.

**[PAUSE 1s]**

---

## Scene 3: Properties Table and Clone Settings

*Show the Renewal AI properties table with the "Clone Settings" button visible*

The properties table shows each property's name, vertical, and activation status. Above the table, the "Clone Settings" button allows operators to copy follow-up configurations from one property to others — useful when rolling out a standardized cadence across a portfolio.

**[PAUSE 1s]**

---

## Scene 4: Entering Property Settings

*Click on "14th North Parkway" row → Property Settings page loads*

Clicking an active property opens the property detail view. The left sidebar shows two groups: Property settings and Agent settings. The Property Settings page surfaces key Entrata configuration items — Primary Address, Contact Points, ELI+ Dashboard Permissions, Prospect Portal, and Property Policies.

Contact Points now includes updated guidance explaining that Renewal AI handles resident communication directly, but operators may still want to configure renewal contact points in Entrata for deterministic notifications like offer-generated or lease-approved emails. The arrow icon indicates items that link out to the Entrata platform.

**[PAUSE 1s]**

---

## Scene 5: Renewal AI Settings — Communication Windows

*Click "Renewal AI Settings" in the sidebar → Communication Windows section visible*

The Renewal AI Settings panel opens with three configurable sections. The first section — Communication Windows — defines when the agent is allowed to send proactive outbound messages.

A single hour selector lets the operator choose when follow-ups are generated each day. The default is 9:00 AM in the property's timezone. Below that, day-of-week toggles control which days the agent sends proactive messages. The default includes Monday through Saturday with Sunday excluded.

If a resident replies outside this window, the agent responds promptly. Only proactive outreach — follow-ups, reminders, and notifications — is constrained to the configured window.

**[PAUSE 1s]**

---

## Scene 6: Renewal Offer Follow-Ups

*Scroll down to the Renewal Offer Follow-Ups section*

The second section configures follow-ups for residents who received a renewal offer but haven't yet decided. The goal is to learn their intent as early as possible — whether they plan to renew and which lease term they prefer, or if they're moving out so the unit can be re-leased.

Each follow-up step has two fields: the number of days and an anchor point — either "after renewal offer sent" or "before lease end date." The default cadence includes five steps: 3, 7, and 14 days after the offer is sent, then 60 and 30 days before the lease ends.

Operators can add new steps with the "Add follow-up" button, remove steps with the trash icon, and reorder steps using the up and down arrows.

**[PAUSE 1s]**

---

## Scene 7: Renewal Lease Follow-Ups

*Scroll down to the Renewal Lease Follow-Ups section*

The third section handles follow-ups for residents who accepted a renewal offer but haven't signed the lease. Each step has three fields: the number of days, an anchor point (either "after renewal lease generated" or "before lease end date"), and a target audience.

The target audience is configurable per step. "Only residents who haven't signed" targets the specific responsible parties who still need to sign, while "All residents on lease" sends a broader reminder. This allows operators to start with targeted nudges and escalate to a full reminder closer to the deadline.

The default cadence includes four steps: 2 and 5 days after lease generation targeting unsigned residents, then 14 days before lease end targeting unsigned residents, and finally 7 days before lease end targeting all residents.

**[PAUSE 1s]**

---

## Scene 8: Save and Discard

*Modify a setting → show the footer action bar appear*

When any setting is changed, a footer action bar slides into view with Save and Discard buttons. Saving locks in the changes, while discarding reverts to the last saved state. The "Property scope" badge in the header confirms that all settings apply to the specific property being configured.

**[PAUSE 1s]**

---

## Scene 9: Clone Settings Flow

*Navigate back to properties table → click "Clone Settings" → walk through the dialog*

Back at the properties table, the Clone Settings button opens a multi-step dialog. Step one asks the operator to select a source property — the property whose settings will be copied. Once selected, step two presents checkboxes for which settings to clone: Communication Windows, Renewal Offer Follow-Ups, and Renewal Lease Follow-Ups.

Step three shows all other active Renewal AI properties as potential targets. Select All and Deselect All buttons make bulk selection easy. Clicking "Clone to selected properties" applies the source settings to every selected target.

A success message confirms which settings were cloned and to how many properties.

**[PAUSE 1s]**

---

## Scene 10: Close-Out

*Return to the Renewal AI properties table*

This completes the Renewals AI Follow-Up Cadence settings prototype. Property managers now have granular control over communication timing, renewal offer follow-up cadence, and renewal lease follow-up cadence — all configurable per property and cloneable across the portfolio.

For full implementation details, see the engineering handoff at `_handoff/DEV-291827/ENGINEERING-PROMPT.md` and the project details at `_handoff/DEV-291827/PROJECT-DETAILS.md`.

Jira: [DEV-291827](https://entrata.atlassian.net/browse/DEV-291827)
