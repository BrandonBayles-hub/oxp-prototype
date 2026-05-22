# Engineering Starter Prompt — DEV-294483: L3 Agent — Post Recurring Charges

> Paste this into Cursor as your first message when starting implementation.

---

## Context

I'm implementing DEV-294483: surfacing the existing "Auto Post Recurring Charges" automation as a properly named L3 agent in the OXP Agent Roster. The prototype is complete in `entrata-product/oxp-prototype-product` on `main`. I need to build the production version.

## What the prototype does

1. **Agent rename:** L3 agent (id: 33) renamed from "Auto Post Recurring Charges" → "Post Recurring Charges" in the agent registry and L3 flyout config
2. **Settings config:** Single user-facing setting — "What day do you want charges to auto post each month?" (1-31 dropdown)
3. **Derived settings:** When user selects a day, two settings are auto-set:
   - `scheduled_charge_auto_post_through` = 31 (always)
   - `post_through_next_month` = FALSE if day=1, TRUE if day≠1
4. **Agent/Manual toggle:** Per-property enable/disable controlled by the existing L3 flyout property table toggle

## Backend mapping (verified from source)

All settings read/write to `property_charge_settings` via `Eos\Entrata\Base\CBasePropertyChargeSetting`:

| Setting | DB Column | PHP Member | Type | Default |
|---------|-----------|------------|------|---------|
| Agent enabled/disabled | `auto_post_scheduled_charges` | `m_boolAutoPostScheduledCharges` | boolean | false |
| Auto post day | `scheduled_charge_auto_post_day` | `m_intScheduledChargeAutoPostDay` | integer (1-31) | 1 |
| Through the (derived) | `scheduled_charge_auto_post_through` | `m_intScheduledChargeAutoPostThrough` | integer | 31 |
| Of the month (derived) | `post_through_next_month` | `m_boolPostThroughNextMonth` | boolean | false |

## What I need to build

1. **OXP API endpoint** to read/write `property_charge_settings` for a given property — bridging OXP → Entrata Core
2. **Wire the prototype's mock data** to real API calls
3. **Feature flag:** `oxp_l3_agent_post_recurring_charges` (boolean, per-client)
4. **Permission gating:** Property settings write permission required for toggle and configuration

## Files to reference

- **Prototype source:** `components/l3-agent-flyout.tsx` (config at line 48, derived settings display in `PropertySettingsView`)
- **Agent registry:** `lib/agents-context.tsx` (line 279, id: 33)
- **Backend model:** `Eos/Entrata/Base/CBasePropertyChargeSetting.class.php`
- **Psi plural:** `Psi/Eos/Entrata/CPropertyChargeSettings.php`
- **Spec:** See Jira DEV-294483 description for full acceptance criteria

## Acceptance criteria

1. Agent appears in OXP roster as "Post Recurring Charges" at L3
2. Flyout shows which properties have agent enabled/disabled (reads `auto_post_scheduled_charges`)
3. Toggling a property writes `auto_post_scheduled_charges` to the backend
4. Property settings view shows day dropdown (1-31) that writes `scheduled_charge_auto_post_day`
5. Saving day=1 sets `scheduled_charge_auto_post_through=31, post_through_next_month=FALSE`
6. Saving day≠1 sets `scheduled_charge_auto_post_through=31, post_through_next_month=TRUE`
