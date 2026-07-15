# VIDEO-TRANSCRIPT-CUES — DEV-294483: L3 Agent — Post Recurring Charges

> Recording guide with production markers. Use while screen-recording the walkthrough.

---

## Section 1 — Title

[SAY] Project Title: "L3 Agent — Post Recurring Charges"
[PAUSE 1s]
[SAY] Jira: DEV-294483. Prototype in entrata-product/oxp-prototype-product.

---

## Section 2 — Problem & Pathway

[SAY] Property managers managing large portfolios have no centralized view of which properties have recurring charge auto-posting enabled.
[SAY] Today they navigate to Setup, Properties, Financial, Charges, General — one property at a time.
[SAY] This automation already runs across 1,842+ properties. It belongs in OXP as an L3 agent.
[PAUSE 1s]
[SAY] The pathway is: Agent Roster, then Post Recurring Charges.
[SHOW] Navigate to http://localhost:3000/agent-roster

---

## Section 3 — Screen-by-Screen Flow

### 3A — Agent Roster: Finding the Agent

[SAY] The Agent Roster displays all agents across every level and category.
[SHOW] Scroll or filter to find "Post Recurring Charges" in the roster.
[SAY] The agent shows the badge "L3 · Processing at Scale" and status "Active".
[SAY] It is categorized under Revenue & Financial Management with an "Accounting" label.
[SHOW] Click the "Post Recurring Charges" row to open the flyout.
[PAUSE 1s]

### 3B — L3 Flyout: Overview

STATE CHANGE: L3 Agent Sheet (flyout) opens from the right side.
[SAY] The flyout header shows the agent name "Post Recurring Charges" with the badge "L3 · Processing at Scale" and the current status — Active or Off.
[SAY] A "Turn Off" button in the header provides a global agent toggle.
[SAY] Below the header, the module tag reads "Accounting · Charges".
[PAUSE 0.5s]
[SAY] A description card reads: "Automate Recurring Charge Posting" with the full description: "This agent automatically posts recurring charges on your configured schedule each month — eliminating the need for manual charge posting across your entire portfolio."
[SAY] Below that, two action links: "Watch Agent Walkthrough" with a play icon, and "Navigate to Accounting in Entrata" with an external link icon.
[PAUSE 0.5s]

### 3C — L3 Flyout: Property Configuration Table

[SAY] The Property Configuration section shows a table of all permissioned properties.
[SAY] The header reads: "Activate this agent per property and configure settings for each. Click a property row to open its settings."
[SAY] A search bar labeled "Search properties…" lets operators filter by property name.
[SAY] The table columns are: Property, Vertical, Units, Status, and Settings.
[SHOW] Point to the Status column.
[SAY] Active properties show the ELI cube icon with "Agent" in purple. Inactive properties show a person icon with "Manual" in gray.
[SAY] Each row has a "Configure" button with a gear icon in the Settings column.
[PAUSE 0.5s]

### 3D — Property Search

[SHOW] Type "Harvest" in the search bar.
STATE CHANGE: Table filters to show only "Harvest Peak Capital".
[SAY] Typing "Harvest" filters the table to show only matching properties — in this case, Harvest Peak Capital.
[SHOW] Clear the search bar.
STATE CHANGE: All 10 properties reappear.
[PAUSE 0.5s]

### 3E — Bulk Toggle

[SAY] At the bottom, the All Properties section provides bulk actions.
[SAY] The description reads: "Enable this agent across all properties at once." when not all are active.
[SHOW] Click "Turn on all".
STATE CHANGE: Confirmation dialog appears.
[SAY] The dialog title reads: "Turn on Post Recurring Charges?" and the description warns: "You are turning on Post Recurring Charges for all properties."
[SHOW] Two buttons: "No, cancel" and "Yes, turn on".
[SHOW] Click "No, cancel" to dismiss.
STATE CHANGE: Dialog closes.
[PAUSE 0.5s]

### 3F — Drilling into Property Settings

[SHOW] Click "Configure" on "Harvest Peak Capital".
STATE CHANGE: Property Settings View replaces the flyout content.
[SAY] The settings view opens for Harvest Peak Capital. A "Back to all properties" link with an arrow icon appears at the top.
[SAY] The header shows the property name "Harvest Peak Capital", the vertical tag "Conventional", and "312 units".
[SAY] Below it: "Post Recurring Charges settings for this property".
[SAY] A "Save Changes" button appears at the top right.
[PAUSE 0.5s]

### 3G — Agent/Manual Toggle (Property Level)

[SAY] An Agent/Manual toggle controls whether this property uses the agent or manual posting.
[SAY] When the toggle is on (purple), the ELI cube icon and "Agent" label appear. When off, a person icon and "Manual" label appear.
[SAY] When set to Manual, the settings below are dimmed and non-interactive.
[PAUSE 0.5s]

### 3H — Recurring Charge Posting Settings

[SAY] The settings group is titled "Recurring Charge Posting" with the description: "Configure when recurring charges are automatically posted each month. The posting window is automatically determined based on your selected day."
[SAY] One setting field is shown: "What day do you want charges to auto post each month?"
[SAY] The description reads: "Select the day of the month recurring charges will be automatically posted to resident ledgers."
[SAY] A dropdown shows options from "Day 1" through "Day 31". The default is "Day 1".
[SHOW] Select "Day 15" from the dropdown.
STATE CHANGE: Dropdown value changes to "Day 15".
[PAUSE 0.5s]

### 3I — Derived Settings Display

[SAY] Below the user-facing settings, a dashed-border panel shows the derived settings.
[SAY] The header reads "Derived Settings (auto-configured)" in uppercase.
[SAY] Two rows display: "Post charges through day" with value "31", and "Of the" with value "Next Month".
[SAY] An explanation below reads: "Posting on the 15th: charges are posted through the end of the following month to cover the full billing period."
[SHOW] Change dropdown back to "Day 1".
STATE CHANGE: "Of the" value changes from "Next Month" to "Current Month".
[SAY] Switching back to Day 1 changes the derived setting to "Current Month" — posting on the 1st means charges cover through the end of the current month.
[SAY] The explanation updates: "Posting on the 1st: charges are posted through the end of the current month."
[PAUSE 0.5s]

### 3J — Save and Back

[SHOW] Click "Save Changes".
STATE CHANGE: "Saved" text appears briefly next to the button.
[SAY] A "Saved" confirmation appears next to the Save Changes button.
[SHOW] Click "Back to all properties".
STATE CHANGE: View returns to the property configuration table.
[SAY] The view returns to the full property list.
[PAUSE 0.5s]

---

## Section 4 — Accessibility

[SAY] The flyout uses semantic HTML with proper heading hierarchy. The search input has a placeholder label. Toggle buttons use standard button elements. The settings view uses native select and label elements for form accessibility.

---

## Section 5 — Out of Scope & Permissions

[SAY] Out of scope: No changes to the actual charge posting engine or job scheduler. No new backend API endpoints. No changes to the L2 Post Recurring Charges manual bulk agent. No mobile-specific adaptations.
[SAY] Permissions: OXP access plus property settings write permission. Read-only users can view but cannot toggle or configure.

---

## Section 6 — Feature Flag & Rollout

[SAY] Feature flag: oxp_l3_agent_post_recurring_charges, a boolean flag per client.
[SAY] Rollout plan: Internal first on CID 17211 and 235, then pilot, then general availability at R2 2026.

---

## Section 7 — Telemetry

[SAY] Ten Amplitude events track the adoption funnel: agent roster viewed, L3 agent opened, property toggled, property configured, setting changed, settings saved, bulk toggle initiated, bulk toggle confirmed, video clicked, and navigate to Entrata clicked.
[SAY] Success metric: 60% of OXP users who view the roster click into this agent within 30 days of GA.

---

## Section 8 — SDET Test Cases

[SAY] Ten test cases cover: agent appears in roster with correct metadata, flyout opens with property list, property toggle updates status, day selection persists with correct derived values, day equals 1 sets current month, configure button disabled for off properties, bulk toggle with confirmation, property search filters correctly, back navigation works, and agent name is consistent across all surfaces.

---

## Section 9 — Engineering Checklist

[SAY] Engineering needs: rename agent in registry, update L3 config key, wire OXP API to property charge settings CRUD, implement derived settings logic on the backend, add feature flag gating, instrument Amplitude events.

---

## Section 10 — Cross-Product Dependencies

[SAY] Production will require an OXP API bridge endpoint to read and write property charge settings via the existing CBasePropertyChargeSetting Eos model. No other cross-product dependencies.

---

## Section 11 — APIs

[SAY] No new APIs in the prototype. Production will need: GET and PUT endpoints for property charge settings through the OXP API layer.

---

## Section 12 — AI

[SAY] No AI components in this agent. Post Recurring Charges is a deterministic automation, not an AI-driven feature.

---

## Section 13 — Verticals

[SAY] Applies to all Entrata verticals: Conventional, Affordable, Student, Senior Living, Mixed Use. No vertical-specific behavior.

---

## Section 14 — Close-Out

[SAY] Jira Epic: DEV-294483. Prototype: entrata-product/oxp-prototype-product on main branch. Thank you for watching.
[PAUSE 1s]
