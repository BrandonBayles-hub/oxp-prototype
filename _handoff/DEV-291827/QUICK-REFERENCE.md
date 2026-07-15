# QUICK-REFERENCE — DEV-291827: Renewals AI Follow-Up Cadence Settings

## 1. What Is This?

Per-property settings for Renewals AI that let operators control **when** the agent sends proactive messages (communication windows), **which days** to skip proactive outreach (blackout dates — a unified list of bank holidays, property holidays, and custom dates with source pills), **how often** it follows up on undecided renewal offers, and **how often** it nudges residents to sign accepted-but-unsigned renewal leases. Follow-up steps using "before lease end date" show a warning that they won't trigger for month-to-month leases. Includes a clone feature to copy settings across properties.

## 2. Key Files

| File | Purpose |
|---|---|
| `components/renewals-ai-settings-panel.tsx` | Settings panel — Communication Windows, Blackout Dates, Offer Follow-Ups, Lease Follow-Ups |
| `app/agent-roster/page.tsx` | Clone dialog, Property Settings data, agent roster integration |
| `_handoff/DEV-291827/PROJECT-DETAILS.md` | Full solution document with data model, test gaps, and component inventory |
| `_handoff/DEV-291827/ENGINEERING-PROMPT.md` | Implementation starter prompt for Cursor |

## 3. How to Run

```bash
git checkout rjones/renewals-ai-property-holidays
npm install && npm run dev
# http://localhost:3000 → Agent Roster → Renewal AI → click any Active property → Renewal AI Settings
```

## 4. Three Things to Know

1. **Four settings sections** — Communication Windows (send hour + days), Blackout Dates (unified holiday list + custom dates), Renewal Offer Follow-Ups (days + anchor for undecided offers), Renewal Lease Follow-Ups (days + anchor + target for unsigned leases)
2. **Unified blackout dates** — Bank holidays and property holidays are merged into a single chronologically sorted list. Each row has one checkbox and pill badges ("Federal", "Property", or both) indicating the source. Custom dates are entered separately below.
3. **Month-to-month warning** — Follow-up steps using "before lease end date" display an amber warning that they will not trigger for month-to-month leases (no lease end date)
4. **Clone settings** — "Clone Settings" button in the properties table lets operators copy any combination of the settings sections from one property to selected target properties

## 5. Out of Scope

- Backend API / database persistence (prototype uses local React state)
- Agent runtime integration (agent still uses hardcoded cadence)
- Template-level defaults (settings are per-property only)
- Channel selection per follow-up (agent determines best channel)
- Role-based access control
