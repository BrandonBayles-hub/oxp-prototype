# PROJECT-DETAILS — DEV-294483: L3 Agent — Post Recurring Charges

| Field | Value |
|-------|-------|
| **Jira** | [DEV-294483](https://entrata.atlassian.net/browse/DEV-294483) |
| **Submitted by** | Robert Jones |
| **Target repo** | `entrata-product/oxp-prototype-product` |
| **Target branch** | `main` (local changes — cherry-pick to feature branch) |
| **Autonomy level** | L3 — Processing at Scale |
| **Product area** | OXP Agent Roster — Revenue & Financial Management |
| **T-Shirt size** | Small (10 story points) |

---

## 1. Summary

Surface Entrata's existing recurring charge auto-posting automation as a properly named L3 agent ("Post Recurring Charges") in the OXP Agent Roster with per-property enable/disable controls, a configurable auto-post day, and behind-the-scenes derived settings. The codebase footprint is two files in the OXP prototype: the agent registry (`lib/agents-context.tsx`) and the L3 flyout config/UI (`components/l3-agent-flyout.tsx`).

## 2. Why

Property managers managing 50+ properties cannot audit which properties have automated charge posting enabled without visiting each property's deeply nested settings individually (`Setup >> Properties >> Financial >> Charges >> General`). This automation already runs across 1,842+ properties — it qualifies as an L3 agent but wasn't surfaced in OXP with the correct name, level, or settings UX. Surfacing it in OXP gives operators centralized visibility and control.

## 3. What changed in the codebase

**Modified files:**

- `lib/agents-context.tsx` — Renamed L3 agent (id: 33) from "Auto Post Recurring Charges" to "Post Recurring Charges"
- `components/l3-agent-flyout.tsx` — Updated `L3_AGENT_CONFIGS["Post Recurring Charges"]`:
  - Renamed config key from `"Auto Post Recurring Charges"` to `"Post Recurring Charges"`
  - Removed standalone toggle field (`auto-post-enabled`) — agent on/off is already controlled by the property-level Agent/Manual toggle in the flyout
  - Updated day selector label to match Jira AC: "What day do you want charges to auto post each month?"
  - Updated dropdown option labels from `"1"` to `"Day 1"` through `"Day 31"`
  - Updated settings group description to mention auto-configured posting window
  - Added derived settings display panel showing auto-computed `scheduled_charge_auto_post_through` (always 31) and `post_through_next_month` (Current/Next Month based on day selection)

**New files:**
- None

**Deleted/replaced:**
- None

**Config/migration:**
- None (prototype-only changes; production will require OXP API ↔ Entrata Core API bridge)

> **Note:** The diff also includes pre-existing local changes to two other agents ("Generate Renewal Offers" and "Rebuild Renewal Offers When Prices Change") that are NOT part of this epic. Those should be committed separately.

## 4. Components and services reused

| Type | Location in repo | Reused for | Why this fits |
|------|-----------------|------------|---------------|
| Component | `components/l3-agent-flyout.tsx` → `L3AgentFlyoutContent` | Rendering the full L3 flyout (header, property table, settings view) | All L3 agents share this same flyout component — config-driven |
| Component | `components/l3-agent-flyout.tsx` → `PropertySettingsView` | Per-property settings drill-in with Agent/Manual toggle | Already renders settings groups from config; no changes needed to the component itself |
| Component | `components/l3-agent-flyout.tsx` → `SettingFieldRenderer` | Rendering the day select dropdown | Generic field renderer supports `select`, `toggle`, `radio`, `number` types |
| Data | `L3_PROPERTIES` array in `components/l3-agent-flyout.tsx` | Mock property list for the flyout table | Shared across all L3 agents |

## 5. New components and services added

| Type | Location in repo | Purpose | Open question |
|------|-----------------|---------|---------------|
| UI element | Inline in `PropertySettingsView` (conditional on `agentName === "Post Recurring Charges"`) | Derived settings display panel — shows auto-computed "Post charges through day: 31" and "Of the: Current/Next Month" | Should this be extracted into a reusable `DerivedSettingsPanel` component if other L3 agents need similar derived-settings displays? |

## 6. Migrations and shared-system changes

**Database migrations:** None for the prototype. Production will read/write these existing columns via OXP API:

| Table | Column | Type | Default | Notes |
|-------|--------|------|---------|-------|
| `property_charge_settings` | `auto_post_scheduled_charges` | boolean | false | Agent enabled/disabled |
| `property_charge_settings` | `scheduled_charge_auto_post_day` | integer (1-31) | 1 | User-configurable |
| `property_charge_settings` | `scheduled_charge_auto_post_through` | integer | 31 | Derived (always 31) |
| `property_charge_settings` | `post_through_next_month` | boolean | false | Derived (day=1 → false, day≠1 → true) |

**Feature flag:** `oxp_l3_agent_post_recurring_charges` (boolean, per-client). Not yet plumbed in the prototype.

**Cross-repo dependencies:** Production will need an OXP API endpoint to read/write `property_charge_settings` via `Eos\Entrata\Base\CBasePropertyChargeSetting`.

## 7. Test gaps

**Existing test surfaces:** None identified in the OXP prototype repo for L3 agent flyout behavior.

**New test surfaces this change should add:**
- Unit test: config key `"Post Recurring Charges"` exists in `L3_AGENT_CONFIGS` and has expected structure
- Unit test: derived settings logic — day=1 → Current Month, day≠1 → Next Month
- E2E test: clicking "Post Recurring Charges" in roster opens the L3 flyout (not the OperationsAgentSheet)
- E2E test: property settings view renders the day dropdown and derived settings panel

**Intentionally skipped:**
- API integration tests (no real backend calls in prototype)
- Permission/feature-flag gating (not implemented in prototype)

## 8. How to run the prototype

```bash
# Clone and checkout
git clone git@github.com:entrata-product/oxp-prototype-product.git
cd oxp-prototype-product
git checkout main

# Install and run
npm install
npm run dev
# → http://localhost:3000

# Navigate to
# http://localhost:3000/agent-roster
# Click "Post Recurring Charges" (L3 · Processing at Scale)
# Click "Configure" on any property to see settings + derived values
```

**Known caveats:**
- Port 3000 may be occupied; Next.js will auto-select 3001
- All data is mock — no backend API calls

## 9. Out of scope (explicitly)

- No changes to the actual charge posting engine or job scheduler
- No new backend API endpoints (production will add OXP API ↔ Core bridge)
- No changes to the L2 "Post Recurring Charges" manual bulk agent (same name, different level)
- No mobile/responsive adaptations beyond existing OXP responsive behavior
- No Amplitude telemetry instrumentation in the prototype (events defined in spec for production)
- No feature flag or permission gating in the prototype

## 10. Links

- **Jira Epic:** [DEV-294483](https://entrata.atlassian.net/browse/DEV-294483)
- **Spec:** `specs/oxp-l3-agents/prc-e001-post-recurring-charges.md` (in rjones-entrata-workspace)
- **Engineering Standards:** `specs/oxp-l3-agents/_engineering-standards.md` (in rjones-entrata-workspace)
- **Task:** `Tasks/prc-e001-post-recurring-charges.md` (in rjones-entrata-workspace)
- **Signal Intake:** `audit/PRC-E001/signal-intake.md` (in rjones-entrata-workspace)
- **Backend Model:** `Eos/Entrata/Base/CBasePropertyChargeSetting.class.php` (in core--product-copy)
