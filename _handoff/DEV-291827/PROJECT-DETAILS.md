# PROJECT-DETAILS — DEV-291827: Renewals AI Follow-Up Cadence Settings

| Field | Value |
|---|---|
| **Epic** | [DEV-291827](https://entrata.atlassian.net/browse/DEV-291827) |
| **Title** | OXP Integration — Implement Renewals AI Into Entrata Core Agent Framework |
| **Submitted by** | Robert Jones |
| **Product area** | OXP / Renewals AI |
| **Autonomy level** | Level 3 — Guided Automation |
| **Prototype branch** | `rjones/renewals-ai-follow-up-cadence` on `entrata-product/oxp-prototype-product` |
| **Video walkthrough** | [PENDING: run /create-video and paste the URL here] |

---

## 1. Summary

This feature adds per-property follow-up cadence and blackout date configuration to the Renewals AI settings panel in the OXP Agent Roster. Property managers can define when and how the Renewal AI agent follows up on renewal offers and unsigned renewal leases — including communication windows, blackout dates (bank holidays, property holidays, and custom dates), renewal offer follow-up schedules, renewal lease follow-up schedules, and the ability to clone these settings across properties.

The blackout dates section supports three tiers: standard US bank holidays (11 federal holidays with dynamic date computation), property-specific holidays pulled from Entrata's Property Hours & Holidays configuration, and unlimited custom blackout dates. When a property holiday overlaps with an enabled bank holiday, an overlap badge clearly indicates the dual coverage.

The codebase footprint is two files: a new `components/renewals-ai-settings-panel.tsx` component and modifications to `app/agent-roster/page.tsx` (clone dialog, Property Settings data updates, `propertyId` prop).

---

## 2. Why

Renewals AI currently operates without configurable follow-up timing. Every property gets the same behavior regardless of their resident demographics, lease structures, or operational preferences. Property managers need granular control over:

- **When** the agent sends proactive messages (communication windows by hour and day of week)
- **How often** to follow up on undecided renewal offers vs. unsigned renewal leases
- **Who** gets lease follow-ups (all responsible parties vs. only those who haven't signed)

Without these controls, properties either over-communicate (annoying residents) or under-communicate (missing renewals). Competitors like Knock, Funnel, and EliseAI offer similar cadence controls.

---

## 3. What Changed in the Codebase

### New files

| Path | Purpose |
|---|---|
| `components/renewals-ai-settings-panel.tsx` | Full Renewal AI settings panel with four configurable sections: Communication Windows, Blackout Dates (bank holidays, property holidays, custom dates), Renewal Offer Follow-Ups, and Renewal Lease Follow-Ups |
| `_handoff/DEV-291827/PROJECT-DETAILS.md` | This document |
| `_handoff/DEV-291827/ENGINEERING-PROMPT.md` | Engineering implementation starter prompt |
| `_handoff/DEV-291827/QUICK-REFERENCE.md` | Quick-reference card for engineering |
| `_handoff/DEV-291827/VIDEO-TRANSCRIPT.md` | Video walkthrough script |

### Modified files

| Path | Change |
|---|---|
| `app/agent-roster/page.tsx` | Added clone settings dialog (source selection, settings picker, target property multi-select), updated `AGENT_SETTINGS_TABS["Renewal AI"]` Property Settings data (removed Business Hours, removed Property Website, renamed Privacy Policy to Property Policies, updated Contact Points help text with deep links, added `link` field to `SettingItem` type), imported `ExternalLink` icon, updated rendering loop to support external links |

---

## 4. Components and Services Reused

| Type | Location | Reused for | Why this fits |
|---|---|---|---|
| UI — Button, Input, Badge, Select | `@/components/ui/*` | All interactive controls in the settings panel | Standard Shadcn component set already used across all agent settings panels |
| UI — Dialog | `@/components/ui/dialog` | Clone settings modal | Same pattern used in other agent roster interactions |
| Agent Roster Shell | `app/agent-roster/page.tsx` | Property list, flyout navigation, `SimplifiedSettingsDetail` routing | Renewals AI settings slot into the existing agent detail view alongside Leasing AI and Maintenance AI |
| `SectionShell` pattern | Internal to `renewals-ai-settings-panel.tsx` | Consistent card layout for each settings section | Mirrors the section-card pattern from `LeasingAISettingsPanel` |

---

## 5. New Components and Services Added

| Type | Location | Purpose | Open question |
|---|---|---|---|
| Component | `components/renewals-ai-settings-panel.tsx` — `RenewalsAISettingsPanel` | Top-level panel orchestrating state for communication windows + offer follow-ups + lease follow-ups | Should this component live at the route level or remain a standalone component? |
| Component | `renewals-ai-settings-panel.tsx` — `CommunicationWindowSection` | Hour selector + day-of-week toggle for proactive message timing | Should communication windows be shared across all ELI+ agents (not just Renewals AI)? |
| Component | `renewals-ai-settings-panel.tsx` — `OfferFollowUpList` | Configurable list of follow-up steps for undecided renewal offers | Should there be a max step count or is unlimited acceptable? |
| Component | `renewals-ai-settings-panel.tsx` — `LeaseFollowUpList` | Configurable list of follow-up steps for unsigned renewal leases with target audience selection | Should the target (all vs. unsigned-only) be per-step or per-section? Currently per-step. |
| Component | `page.tsx` — Clone Settings Dialog | Multi-step dialog to clone Communication Windows, Offer Follow-Ups, and/or Lease Follow-Ups from one property to others | Should cloning overwrite or merge with existing property settings? Currently overwrites. |

---

## 6. Migrations and Shared-System Changes

### Database

New settings require persistence. Suggested schema:

| Table | Columns | Notes |
|---|---|---|
| `renewals_ai_communication_window` | `property_id`, `send_hour` (TIME), `days_of_week` (TEXT[] or JSONB) | One row per property |
| `renewals_ai_offer_follow_up` | `property_id`, `sort_order`, `days` (INT), `anchor` (ENUM: `after_offer_sent`, `before_lease_end`) | Multiple rows per property |
| `renewals_ai_lease_follow_up` | `property_id`, `sort_order`, `days` (INT), `anchor` (ENUM: `after_lease_generated`, `before_lease_end`), `target` (ENUM: `all_residents`, `unsigned_only`) | Multiple rows per property |

### Feature flags

| Flag | Default | Toggle |
|---|---|---|
| `renewals_ai_follow_up_cadence` | OFF | OXP admin per-client |

### Cross-repo dependencies

- The Renewals AI agent runtime (separate service) must read these settings when determining follow-up timing. Currently uses hardcoded cadence.
- OXP API endpoints needed: GET/PUT for each settings section per property.

---

## 7. Test Gaps

### Existing test surfaces
- Agent roster E2E tests cover property list rendering and navigation
- Leasing AI settings panel has component tests that serve as a pattern

### New test surfaces needed
- Unit tests for `RenewalsAISettingsPanel` state management (add/remove/reorder follow-up steps)
- Unit tests for `CommunicationWindowSection` (hour selection, day toggle)
- Integration test for clone settings flow (source selection → settings selection → target selection → apply)
- Validation tests: prevent 0-day follow-ups, prevent duplicate anchors at same day count

### Intentionally skipped
- API integration tests (no real API in prototype)
- Cross-property clone persistence (requires backend)

---

## 8. How to Run the Prototype

```bash
# Clone and checkout
git clone https://github.com/entrata-product/oxp-prototype-product.git
cd oxp-prototype-product
git checkout rjones/renewals-ai-follow-up-cadence

# Install and run
npm install
npm run dev
# Opens at http://localhost:3000

# Navigate to the feature
# 1. Click "Agent Roster" in the sidebar
# 2. Click on a Renewal AI agent card (or navigate to ?agent=7)
# 3. Click any Active property row (e.g., "14th North Parkway")
# 4. Click "Renewal AI Settings" in the sidebar
# 5. Communication Windows, Offer Follow-Ups, and Lease Follow-Ups are displayed
#
# To test Clone Settings:
# 1. From the properties table view, click "Clone Settings" button
# 2. Select a source property, choose which settings to clone, select targets
```

### Known dev-environment caveats
- Node.js ≥18 required (Next.js 14)
- Hot module reload occasionally causes Radix UI Select portals to detach; full page reload fixes it

---

## 9. Out of Scope (Explicitly)

- **API endpoints** — Prototype uses local React state only. Backend API design is deferred to engineering.
- **Real-time agent behavior changes** — Saving settings in the UI does not propagate to the agent runtime in the prototype.
- **Audit logging** — No history of settings changes is tracked.
- **Role-based permissions** — All users with property access can modify settings. RBAC is deferred.
- **Template-level defaults** — Settings are per-property only. No account-wide or template-level defaults.
- **Channel selection per follow-up** — Intentionally removed per PM direction. The agent determines the best channel.
- **Cadence preview / timeline visualization** — Intentionally removed per PM direction to avoid duplicating the step list.

---

## 10. Links

| Resource | URL |
|---|---|
| Jira Epic | [DEV-291827](https://entrata.atlassian.net/browse/DEV-291827) |
| Prototype Branch | [rjones/renewals-ai-follow-up-cadence](https://github.com/entrata-product/oxp-prototype-product/tree/rjones/renewals-ai-follow-up-cadence) |
| Video Walkthrough | [PENDING: Phase 13] |
