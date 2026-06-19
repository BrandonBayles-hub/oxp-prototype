# ENGINEERING-PROMPT — DEV-291827: Renewals AI Follow-Up Cadence Settings

> **Paste this into Cursor as your first message to bootstrap implementation.**

## Context

You are implementing per-property follow-up cadence settings for Renewals AI in the Entrata OXP platform. The prototype lives on branch `rjones/renewals-ai-follow-up-cadence` in `entrata-product/oxp-prototype-product`. The Jira epic is [DEV-291827](https://entrata.atlassian.net/browse/DEV-291827).

Read `_handoff/DEV-291827/PROJECT-DETAILS.md` for full context including component inventory, data model suggestions, and test gaps.

## What This Feature Does

Each property using Renewals AI can configure three settings areas:

### 1. Communication Windows
- A single **send hour** (0–23, displayed in 12-hour AM/PM format) when the agent generates and sends proactive outbound messages
- **Days of week** toggles (Mon–Sun) controlling which days the agent sends proactive messages
- Default: 9:00 AM, Monday–Saturday
- Reactive replies (when a resident messages first) are not constrained by this window

### 2. Renewal Offer Follow-Ups
- A list of follow-up steps for residents who received a renewal offer but haven't decided
- Each step has: `days` (positive integer) and `anchor` (either `after_offer_sent` or `before_lease_end`)
- Steps can be added, removed, and reordered (move up/down)
- Goal: learn resident intent (renew or not) as early as possible
- Default cadence: 3d after sent, 7d after sent, 14d after sent, 60d before end, 30d before end

### 3. Renewal Lease Follow-Ups
- A list of follow-up steps for residents who accepted renewal but haven't signed the lease
- Each step has: `days`, `anchor` (either `after_lease_generated` or `before_lease_end`), and `target` (either `all_residents` or `unsigned_only`)
- The `target` field allows differentiating between nudging all responsible parties vs. only those who haven't signed yet
- Default cadence: 2d after generated (unsigned), 5d after generated (unsigned), 14d before end (unsigned), 7d before end (all)

### 4. Clone Settings (Agent Roster Level)
- From the properties table, a "Clone Settings" button opens a dialog
- User selects a source property, picks which setting groups to clone (Communication Windows, Offer Follow-Ups, Lease Follow-Ups), then selects target properties
- Only properties with Renewals AI active are shown as targets

### 5. Property Settings Updates
- Contact Points: Updated help text explains Renewals AI handles communication directly but deterministic notifications (offer generated, accepted, lease approved) may still need contact points configured in Entrata
- Property Policies (renamed from Privacy Policy): Links to property general policies in Entrata
- Removed: Business Hours (covered by Communication Windows), Property Website

## Architecture Decisions

1. **Per-property, not template-level** — Each property has its own settings. Template-level defaults are a future enhancement.
2. **Per-step targeting on lease follow-ups** — The `target` field (all vs. unsigned-only) is per follow-up step, not per section. This gives operators flexibility to send broad reminders early and targeted ones closer to lease end.
3. **Single send hour, not time range** — Communication windows use a single hour rather than a range. Simpler UX and avoids questions about message distribution within a range.
4. **Clone overwrites, does not merge** — Cloning settings replaces the target property's settings entirely for the selected categories. No merge logic.
5. **No channel selection** — The agent determines the best communication channel per follow-up. Channel selection was intentionally excluded.

## Implementation Sequence

1. **Database schema** — Create the three settings tables (`renewals_ai_communication_window`, `renewals_ai_offer_follow_up`, `renewals_ai_lease_follow_up`) with the column definitions in PROJECT-DETAILS.md Section 6
2. **API endpoints** — Build CRUD endpoints for each settings area, scoped by property ID. GET returns current settings (or defaults if none saved). PUT replaces the full settings for a given section.
3. **Clone endpoint** — Build a bulk-copy endpoint that reads settings from a source property and writes them to N target properties for the specified setting types
4. **Wire the React panel** — Replace the local `useState` in `RenewalsAISettingsPanel` with API calls. The component structure and UX are production-ready from the prototype.
5. **Wire Property Settings links** — The `link` field on `SettingItem` should resolve `DOMAIN` and `PROPERTYID` placeholders to actual values at render time
6. **Agent runtime integration** — Update the Renewals AI agent to read follow-up cadence from the new settings tables instead of using hardcoded timing
7. **Feature flag** — Gate behind `renewals_ai_follow_up_cadence` flag, default OFF

## Integration Points

| System | Integration | Notes |
|---|---|---|
| OXP API | REST endpoints for settings CRUD | Scoped by `oxpClientId` + `propertyId` |
| Renewals AI Agent Runtime | Reads follow-up cadence on each evaluation cycle | Must fall back to hardcoded defaults if no settings exist |
| Entrata Core | Deep links from Property Settings to Entrata admin pages | Contact Points, Property Policies use URL templates with `DOMAIN` and `PROPERTYID` placeholders |
| OXP Agent Roster | Clone dialog integrates into existing property table view | Uses the same `AGENT_FLYOUT_PROPERTIES` data source |

## Key Prototype Files to Reference

| File | Lines | What to look at |
|---|---|---|
| `components/renewals-ai-settings-panel.tsx` | 813 | Full component tree, types, default values, UX patterns |
| `app/agent-roster/page.tsx` | Search for `"Renewal AI"` | Clone dialog JSX, Property Settings data, `SettingItem` type with `link` field |

## Data Model (TypeScript from Prototype)

```typescript
type OfferFollowUpAnchor = "after_offer_sent" | "before_lease_end"
type LeaseFollowUpAnchor = "after_lease_generated" | "before_lease_end"
type LeaseFollowUpTarget = "all_residents" | "unsigned_only"

interface CommunicationWindow {
  sendHour: string        // "09:00" format (HH:00)
  days: DayOfWeek[]       // ["mon","tue","wed","thu","fri","sat"]
}

interface OfferFollowUpStep {
  id: string
  days: number            // positive integer
  anchor: OfferFollowUpAnchor
}

interface LeaseFollowUpStep {
  id: string
  days: number
  anchor: LeaseFollowUpAnchor
  target: LeaseFollowUpTarget
}
```

## Definition of Done

- [ ] Communication windows (send hour + days of week) are configurable per property and persisted
- [ ] Renewal offer follow-up steps are configurable (add/remove/reorder, days + anchor) and persisted
- [ ] Renewal lease follow-up steps are configurable (add/remove/reorder, days + anchor + target) and persisted
- [ ] Clone settings dialog allows copying settings from one property to multiple target properties
- [ ] Property Settings page shows updated Contact Points help text with deep link to Entrata
- [ ] Property Settings page shows "Property Policies" (renamed from Privacy Policy) with deep link
- [ ] Business Hours and Property Website removed from Property Settings
- [ ] Renewals AI agent runtime reads follow-up cadence from settings instead of hardcoded values
- [ ] Feature flagged behind `renewals_ai_follow_up_cadence`
- [ ] Default cadence values seed on first property activation
