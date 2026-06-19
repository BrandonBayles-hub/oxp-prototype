# QUICK-REFERENCE — DEV-291827: Renewals AI Follow-Up Cadence Settings

## 1. What Is This?

Per-property settings for Renewals AI that let operators control **when** the agent sends proactive messages (communication windows), **how often** it follows up on undecided renewal offers, and **how often** it nudges residents to sign accepted-but-unsigned renewal leases. Includes a clone feature to copy settings across properties.

## 2. Key Files

| File | Purpose |
|---|---|
| `components/renewals-ai-settings-panel.tsx` | Settings panel — Communication Windows, Offer Follow-Ups, Lease Follow-Ups |
| `app/agent-roster/page.tsx` | Clone dialog, Property Settings data, agent roster integration |
| `_handoff/DEV-291827/PROJECT-DETAILS.md` | Full solution document with data model, test gaps, and component inventory |
| `_handoff/DEV-291827/ENGINEERING-PROMPT.md` | Implementation starter prompt for Cursor |

## 3. How to Run

```bash
git checkout rjones/renewals-ai-follow-up-cadence
npm install && npm run dev
# http://localhost:3000 → Agent Roster → Renewal AI → click any Active property → Renewal AI Settings
```

## 4. Three Things to Know

1. **Three settings sections** — Communication Windows (send hour + days), Renewal Offer Follow-Ups (days + anchor for undecided offers), Renewal Lease Follow-Ups (days + anchor + target for unsigned leases)
2. **Clone settings** — "Clone Settings" button in the properties table lets operators copy any combination of the three sections from one property to selected target properties
3. **Property Settings links** — Contact Points and Property Policies deep-link to Entrata admin pages using URL templates with `DOMAIN` and `PROPERTYID` placeholders

## 5. Out of Scope

- Backend API / database persistence (prototype uses local React state)
- Agent runtime integration (agent still uses hardcoded cadence)
- Template-level defaults (settings are per-property only)
- Channel selection per follow-up (agent determines best channel)
- Role-based access control
