# VIDEO-TRANSCRIPT — DEV-294483: L3 Agent — Post Recurring Charges

> Clean narration transcript. Stakeholder-facing deliverable and TTS input.

---

## Section 1 — Title

Project Title: "L3 Agent — Post Recurring Charges." Jira Epic DEV-294483, prototyped in the OXP prototype repository.

---

## Section 2 — Problem & Pathway

Property managers managing large portfolios have no centralized view of which properties have recurring charge auto-posting enabled. Today, checking or changing this setting requires navigating to **Setup**, then **Properties**, then **Financial**, then **Charges**, then **General** — one property at a time. This automation already runs across 1,842+ properties, posting charges automatically each month. It qualifies as an L3 agent and belongs in the OXP Agent Roster.

The pathway is straightforward: **Agent Roster**, then **Post Recurring Charges**. *Navigate to the Agent Roster page.*

---

## Section 3 — Screen-by-Screen Flow

### 3A — Finding the Agent in the Roster

The Agent Roster displays all agents across every level and category. *Scroll or filter to find "Post Recurring Charges."* The agent displays the badge **L3 · Processing at Scale** and shows its current status — **Active**. It is categorized under **Revenue & Financial Management** with an **Accounting** label. *Click the agent row to open the flyout.*

### 3B — L3 Flyout Overview

The L3 Agent Sheet opens from the right side of the screen. The flyout header displays the agent name **Post Recurring Charges** with the badge **L3 · Processing at Scale** and the current status. A **Turn Off** button in the top-right corner provides a global agent toggle — its label changes to **Turn On** when the agent is off.

Below the header, the module tag reads **Accounting · Charges**. A description card is titled **Automate Recurring Charge Posting** and reads: "This agent automatically posts recurring charges on your configured schedule each month — eliminating the need for manual charge posting across your entire portfolio."

Two action links follow. **Watch Agent Walkthrough** with a play icon opens the video walkthrough. **Navigate to Accounting in Entrata** with an external link icon links to the corresponding Entrata module.

### 3C — Property Configuration Table

The **Property Configuration** section displays a table of all permissioned properties. The subheading reads: "Activate this agent per property and configure settings for each. Click a property row to open its settings."

A search bar labeled **Search properties…** allows operators to filter by name. The table has five columns: **Property**, **Vertical**, **Units**, **Status**, and **Settings**. Active properties display the ELI cube icon with **Agent** in purple text. Inactive properties show a person icon with **Manual** in gray. Each row includes a **Configure** button with a gear icon.

### 3D — Property Search

*Type "Harvest" in the search bar.* The table filters to show only **Harvest Peak Capital**. *Clear the search.* All 10 properties reappear.

### 3E — Bulk Toggle

Below the table, the **All Properties** section provides bulk actions. When not all properties are active, the description reads: "Enable this agent across all properties at once." *Click **Turn on all**.* A confirmation dialog appears with the title "Turn on Post Recurring Charges?" and the message: "You are turning on Post Recurring Charges for all properties. This will start the agent across every property in your portfolio." Two buttons are available: **No, cancel** and **Yes, turn on**. *Click **No, cancel** to dismiss.*

### 3F — Drilling into Property Settings

*Click **Configure** on Harvest Peak Capital.* The Property Settings View replaces the flyout content. A **Back to all properties** link with an arrow icon appears at the top left. The header shows the property name **Harvest Peak Capital**, a **Conventional** vertical tag, and **312 units**. Below it: "Post Recurring Charges settings for this property." A **Save Changes** button with a save icon sits at the top right.

### 3G — Agent/Manual Toggle

An Agent/Manual toggle controls whether this property uses automated or manual posting. When the toggle is on, the ELI cube icon and **Agent** label appear in purple. When off, a person icon and **Manual** label appear in gray, and the message reads: "This property is managed manually. Toggle to Agent to automate this workflow." When set to Manual, all settings below are dimmed and non-interactive.

### 3H — Recurring Charge Posting Settings

The settings group is titled **Recurring Charge Posting** with the description: "Configure when recurring charges are automatically posted each month. The posting window is automatically determined based on your selected day."

One setting is exposed: **What day do you want charges to auto post each month?** The description reads: "Select the day of the month recurring charges will be automatically posted to resident ledgers." A dropdown shows options from **Day 1** through **Day 31**. The default selection is **Day 1**.

*Select **Day 15** from the dropdown.*

### 3I — Derived Settings Display

Below the user-facing settings, a dashed-border panel shows the **Derived Settings (auto-configured)** heading. Two rows display: **Post charges through day** with value **31**, and **Of the** with value **Next Month**. An explanation reads: "Posting on the 15th: charges are posted through the end of the following month to cover the full billing period."

*Change the dropdown back to **Day 1**.* The **Of the** value changes from **Next Month** to **Current Month**. The explanation updates to: "Posting on the 1st: charges are posted through the end of the current month." This demonstrates the derived settings logic — day 1 posts through the current month; any other day posts through the next month.

### 3J — Save and Navigate Back

*Click **Save Changes**.* A **Saved** confirmation appears briefly next to the button. *Click **Back to all properties**.* The view returns to the full property configuration table.

---

## Section 4 — Accessibility

The flyout uses semantic HTML with proper heading hierarchy. The search input includes a placeholder label. Toggle buttons are standard button elements. The settings view uses native select elements and label associations for form accessibility.

---

## Section 5 — Out of Scope & Permissions

**Out of scope:** No changes to the actual charge posting engine or job scheduler. No new backend API endpoints in this prototype phase. No changes to the L2 **Post Recurring Charges** manual bulk agent (same name, different level). No mobile-specific adaptations beyond existing OXP responsive behavior.

**Permissions:** OXP access plus property settings write permission. Read-only users can view agent status but cannot toggle or configure.

---

## Section 6 — Feature Flag & Rollout

The feature flag is `oxp_l3_agent_post_recurring_charges`, a boolean flag per client. Rollout plan: internal first on CID 17211 and 235, then pilot customers, then general availability at R2 2026.

---

## Section 7 — Telemetry

Ten Amplitude events track the adoption funnel: **agent_roster_viewed**, **l3_agent_opened**, **l3_agent_property_toggled**, **l3_agent_property_configured**, **l3_agent_setting_changed**, **l3_agent_settings_saved**, **l3_agent_bulk_toggle**, **l3_agent_bulk_toggle_confirmed**, **l3_agent_video_clicked**, and **l3_agent_navigate_entrata_clicked**.

The success metric is 60% of OXP users who view the roster clicking into this agent within 30 days of GA.

---

## Section 8 — SDET Test Cases

Ten test cases cover the full surface: agent appears in the roster with correct metadata; flyout opens with the property list; property toggle updates agent status; auto post day selection persists with correct derived values; day = 1 sets current month posting; configure button is disabled for off properties; bulk toggle works with confirmation dialog; property search filters correctly; back navigation returns to the property list; agent name is consistent across all UI surfaces.

---

## Section 9 — Engineering Checklist

Engineering deliverables: rename the agent in the registry; update the L3 config key; wire the OXP API to property charge settings CRUD via `CBasePropertyChargeSetting`; implement derived settings logic on the backend; add feature flag gating with `oxp_l3_agent_post_recurring_charges`; instrument all ten Amplitude events.

---

## Section 10 — Cross-Product Dependencies

Production will require an OXP API bridge endpoint to read and write `property_charge_settings` via the existing `CBasePropertyChargeSetting` Eos model. No other cross-product dependencies exist.

---

## Section 11 — APIs

No new APIs exist in the prototype. Production will need GET and PUT endpoints for property charge settings through the OXP API layer, reading from and writing to `property_charge_settings` columns: `auto_post_scheduled_charges`, `scheduled_charge_auto_post_day`, `scheduled_charge_auto_post_through`, and `post_through_next_month`.

---

## Section 12 — AI

No AI components exist in this agent. **Post Recurring Charges** is a deterministic automation — it posts charges on a schedule — not an AI-driven feature.

---

## Section 13 — Verticals

This feature applies to all Entrata verticals: Conventional, Affordable, Student, Senior Living, and Mixed Use. No vertical-specific behavior differences exist.

---

## Section 14 — Close-Out

Jira Epic: [DEV-294483](https://entrata.atlassian.net/browse/DEV-294483). Prototype: `entrata-product/oxp-prototype-product` on the `main` branch. Thank you for watching.

---

## Appendix: Decision Extraction Table

| # | Timestamp | Decision | Category | Quote / Evidence | Impact |
|---|-----------|----------|----------|-----------------|--------|
| 1 | 0:00–0:15 | Entry point is Agent Roster → Post Recurring Charges | Navigation | "The pathway is: Agent Roster, then Post Recurring Charges" | Engineers know exact nav path; no new routes needed |
| 2 | 0:15–0:30 | Agent classified as L3 · Processing at Scale (efficiency type) | Data Model | Badge reads "L3 · Processing at Scale" in roster and flyout | Agent type must be `efficiency` in agents-context registry |
| 3 | 0:30–0:50 | Agent categorized under Revenue & Financial Management with Accounting label | Data Model | Roster shows bucket and label assignment | Agent bucket and labels must match in data seed |
| 4 | 0:50–1:15 | Flyout uses shared L3AgentSheet component (config-driven) | UX Pattern | Same flyout structure as other L3 agents | No custom flyout needed; add config to `L3_AGENT_CONFIGS` registry |
| 5 | 1:15–1:45 | Property status shows Agent (purple cube) vs Manual (person icon) | UX Pattern | Active = ELI cube + "Agent"; Off = person icon + "Manual" | Status rendering is shared across all L3 agents |
| 6 | 1:45–2:15 | Single user-facing setting: auto post day (1–31 dropdown) | Scope Boundary | Only one field in settings group; derived settings are hidden | Backend must accept day and compute through/month values |
| 7 | 2:15–2:45 | Day = 1 → Current Month; Day ≠ 1 → Next Month (derived logic) | Business Logic | Derived panel changes between "Current Month" and "Next Month" | Conditional logic required: `post_through_next_month = (day !== 1)` |
| 8 | 2:45–3:00 | `scheduled_charge_auto_post_through` is always 31 | Business Logic | Derived panel always shows "Post charges through day: 31" | Hardcoded value — no user input needed |
| 9 | 3:00–3:15 | Bulk toggle with confirmation dialog before applying | UX Pattern | Dialog: "You are turning on Post Recurring Charges for all properties" | Destructive action requires confirmation; no undo |
| 10 | 3:15–3:30 | Settings disabled when property toggle is set to Manual | UX Pattern | Settings area is "dimmed and non-interactive" when Manual | `pointer-events-none` + `opacity-50` pattern |
| 11 | 3:30–3:45 | No new permissions required — uses existing OXP + property write | Permissions | "OXP access plus property settings write permission" | No permission migration needed |
| 12 | 3:45–4:00 | Feature flag: `oxp_l3_agent_post_recurring_charges` (boolean, per-client) | Rollout | Flag name and type specified | Engineers implement flag check before rendering |
| 13 | 4:00–4:15 | Backend maps to `property_charge_settings` table, 4 columns | Data Model | Table mapping in spec: `auto_post_scheduled_charges`, `scheduled_charge_auto_post_day`, `scheduled_charge_auto_post_through`, `post_through_next_month` | OXP API must CRUD these 4 columns via CBasePropertyChargeSetting |
| 14 | 4:15–4:30 | L2 and L3 agents share the name "Post Recurring Charges" — level distinguishes them | Scope Boundary | "No changes to the L2 Post Recurring Charges manual bulk agent (same name, different level)" | Agent ID and type differentiate; no rename of L2 needed |
