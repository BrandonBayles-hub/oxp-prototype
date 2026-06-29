# ELI+ Setup — Developer Handoff

**Project:** OXP Studio Prototype — ELI+ Setup feature  
**PM:** Brandon Bayles  
**Live prototype:** https://probable-dollop-7ppnpwg.pages.github.io/getting-started  
**Repo:** https://github.com/entrata-product/oxp-prototype-product  
**Jira Epic:** [DEV-283088](https://entrata.atlassian.net/browse/DEV-283088)  

---

## What this is

A fully navigable, zero-backend React/Next.js prototype of the **ELI+ Setup** feature — a guided onboarding flow that walks a property management company through configuring Entrata's AI and Agent products (Leasing AI, Payments AI, Maintenance AI, Renewals AI) before they go live.

The prototype lives at **`/getting-started`** and is accessible via the left nav: **AI & Agent Activation → ELI Plus Setup**.

This is not a toy — it was built to spec-quality to drive the Jira Epic. Every screen, field, workflow, and simulation reflects a real product requirement.

---

## How to run locally

### Option A — npm (fastest)

```bash
npm install
npm run dev
# → http://127.0.0.1:3000/getting-started
```

### Option B — Docker

```bash
docker compose up
# → http://localhost:3000/getting-started
```

### Option C — Serve the pre-built static output

The `out/` folder is the full static export (same as what GitHub Pages serves). You can serve it with any static file server:

```bash
npx serve out
# or: python3 -m http.server -d out 3000
```

---

## Project structure (ELI+ Setup)

All ELI+ Setup code lives in one directory:

```
components/eli-plus-setup/
├── index.tsx                    ← Root component — global state, routing between tabs
├── pages/
│   ├── OverviewPage.tsx         ← Dashboard with progress cards + action item cards
│   ├── CompanyPage.tsx          ← Carrier Compliance tab (10DLC registration)
│   ├── CommunicationsPage.tsx   ← SMS number assignment per property
│   ├── EmailPage.tsx            ← Email integration per property
│   ├── LeasingPage.tsx          ← Leasing AI settings
│   ├── MaintenancePage.tsx      ← Maintenance AI settings
│   ├── PaymentsSummaryPage.tsx  ← Payments AI settings
│   └── RenewalsPage.tsx         ← Renewals AI settings
└── components/
    ├── HybridShell.tsx          ← Left sidebar nav + overall progress bar
    ├── GlobalToast.tsx          ← Centralized top-center toast notifications
    ├── TaskSheet.tsx            ← Reusable right-sidebar (used for all action cards)
    ├── TenDlcSheetContent.tsx   ← "Add a Privacy Policy" sidebar content
    ├── CarrierComplianceSheetContent.tsx ← Carrier sim action sidebars
    ├── EmailSheetContent.tsx    ← Email integration sidebar
    ├── PropertyFilter.tsx       ← Reusable property filter/search dropdown
    └── [Other sheet components] ← Per-feature sidebars (payments, leasing, etc.)
```

---

## What was built (feature summary)

### Overview tab
- **Portfolio progress bar** — "48 of 52 properties pending" with live counter
- **Product progress cards** — Leasing AI, Payments AI, Maintenance AI, Renewals AI each show X/Y properties live
- **Action item cards** — dynamic list of things the user must complete:
  - **Privacy Policy / Carrier Compliance** — opens right sidebar
  - **Email Integration** — opens right sidebar  
  - **IVR Setup** — locked until Communications tab is complete
  - **Carrier sim cards** — appear only when simulation is active (see below)
- All action cards open a **right sidebar (TaskSheet)** — no full-page redirects

### Carrier Compliance tab (CompanyPage.tsx)
This is the most complex tab. Key features:

1. **Pre-filled fields** — Legal name, EIN, address, phone, website pre-populated from mock Entrata data
2. **Privacy Policy flow:**
   - System scans website URL for existing policy
   - If not found: amber "no policy found" section appears
   - User fills in message frequency + 5 data retention periods (both required, no defaults — legal requirement for active engagement)
   - Generated policy preview updates live as user fills fields
   - **Publish to my website** — for Entrata-hosted sites
   - **Copy policy text** — for third-party sites; enables "I've added it — verify my site" button
   - "Verify my site" shows inline spinner, then completes
3. **Simulation buttons** (top-right, developer/demo tool):
   - **"Missing fields"** — applies red borders + inline errors to all required fields
   - **"Carrier rejection"** — marks all fields as rejected with user-friendly rejection cards + "I've updated this" dismiss flow → resubmit spinner
   - **"Reset"** — clears simulation state
4. **Info icons** on every field label — hover to see Twilio A2P 10DLC guidance (what it is, why it matters, tip)
5. **Disclaimer tooltip** on generated policy — legal disclaimer, scrollable, persists on hover

### Action sidebar behavior (TaskSheet)
Every action card on Overview opens a right sidebar. The sidebar shows only the fields needed to complete that action — no full-page navigation. This mirrors the "Add a Privacy Policy" card experience:
- **Carrier Registration — Missing Required Fields** → `CarrierComplianceSheetContent` (mode: "missing")
- **Carrier Registration — Review and Resubmit** → `CarrierComplianceSheetContent` (mode: "rejected")
- **Add a Privacy Policy** → `TenDlcSheetContent` (amber form, same UX as CompanyPage)
- **Email Integration** → `EmailSheetContent`

### Toast notifications
All toasts use `GlobalToast.tsx` — fixed top-center (`fixed top-4 left-1/2 -translate-x-1/2`). Every save/complete action fires a toast. OverviewPage has a local toast that also uses top-center positioning.

---

## Mock data — what's fake vs. what needs real APIs

### Pre-populated from "Entrata system" (currently hardcoded — needs real data)

| Field | Where | Real source |
|---|---|---|
| Legal Business Name | CompanyPage | Client Admin → Merchant Services |
| EIN | CompanyPage | Client Admin → Merchant Services |
| Business Address | CompanyPage | Client Admin → Merchant Services |
| Company Phone | CompanyPage | Communications tab data |
| Website URL | CompanyPage | Client Admin or web scrape |
| Authorized Rep | CompanyPage | Client Admin |
| Property list (52 properties) | All tabs | Entrata property DB |
| Email connections per property | EmailPage | Entrata email/inbox data |

### Simulated flows (no real backend needed in prototype, but needs real integration in prod)

| Flow | Current approach | Real integration |
|---|---|---|
| Website privacy policy scan | Simulated 1.6s timeout → "not found" | HTTP GET to website URL, look for `/privacy-policy` link |
| Brand/profile submission to Twilio | Simulated spinner → success | Twilio Brand Registration API |
| Carrier rejection handling | Simulation buttons | Twilio webhook → parse rejection reason per field |
| SMS number assignment | Hardcoded 16 properties | Twilio Messaging API — purchase numbers by area code |
| Email integration status | Hardcoded mock data | Entrata email/inbox service |
| Privacy policy "Publish to website" | State toggle | CMS/website integration or Entrata-hosted page |

### State that lives in component state (needs real persistence in prod)

- `privacyPublished` — whether privacy policy has been published
- `emailComplete` — whether email integration is done
- `commsComplete` — whether carrier compliance + SMS setup is done
- `ivrComplete` — whether IVR code has been set
- `simMode` — carrier simulation state ("none" | "missing" | "rejected")
- All per-property settings (rent charge dates, payment options, escalation numbers, etc.)

---

## Key architectural decisions

### 1. Everything in one component tree
All ELI+ Setup state is lifted to `index.tsx`. Tabs communicate via props, not a state library. This was intentional for prototype speed — production would use a state manager or server state (React Query / SWR).

### 2. Right-sidebar pattern for action items
Overview action cards open sidebars (`TaskSheet`) instead of navigating to the relevant tab. This keeps the user in context and reduces "where am I?" confusion. The sidebar contains exactly the fields needed to complete that specific action.

### 3. SimMode is lifted to parent
`simMode` state lives in `index.tsx`, not `CompanyPage`. This allows `OverviewPage` and `HybridShell` to react to the simulation state (showing sim action cards on Overview, updating the sidebar badge count).

### 4. Privacy policy requires active engagement
`messageFrequency` and all 5 `retention` fields start empty with no defaults. This is intentional — legal requires active user engagement for these fields. The Publish/Copy buttons are disabled until both are completed.

---

## Acceptance criteria (from Jira Epic DEV-283088)

### Priority 1 — Foundational
- [ ] Navigation: "AI and Agent Configuration" under Configure sidebar → "Eli Plus Setup"
- [ ] Default landing: Overview tab on load
- [ ] Global progress header: portfolio progress bar + pending count
- [ ] Product cards: 4 cards showing property-level live status

### Priority 2 — Action items
- [ ] Dynamic action cards based on incomplete settings
- [ ] Sidebar interactivity: action card → right sidebar with only missing fields
- [ ] Status mirroring: saving in sidebar updates the deep-link tab and vice versa
- [ ] Priority sorting: Carrier Compliance cards pin to top

### Priority 3 — Carrier Compliance
- [ ] Auto-populate: pull legal name, EIN, address, phone, website, rep from Merchant Services / Communications tables
- [ ] Blank state only if data is missing in entire Entrata DB
- [ ] Auto-scan website URL for existing privacy policy

### Priority 4 — Privacy Policy generator
- [ ] Template pre-populated with Carrier Compliance data
- [ ] User must manually select texting frequency + data retention (required, no defaults)
- [ ] Entrata-hosted: "Publish to my website" button
- [ ] Third-party: "Copy policy text" + "Verify my site" (requires re-scan)

### Priority 5 — Twilio automation
- [ ] Auto-submit brands, profiles, campaigns to Twilio when Carrier Compliance 100% complete
- [ ] Error handling: display Twilio rejection reason per field + "I've updated this" retry
- [ ] SMS number table: properties × products grid
- [ ] Area code matching: auto-provision numbers matching property local area code

### Priority 6 — Final integrations
- [ ] Email tab mirrors OXP email integration settings
- [ ] IVR code action card (Leasing Center Team)
- [ ] Complete state: Twilio campaigns active + IVR/Email verified

---

## How to use Cursor on this project

Open this folder in Cursor. The `AGENTS.md` file at the root gives Cursor context about the project. You can ask:

- "Where is the privacy policy flow implemented?"
- "What mock data would need to be replaced with real APIs?"
- "Show me how SimMode works"
- "What's the acceptance criteria for Priority 3?"
- "How does the TaskSheet sidebar get triggered from an action card?"

The codebase is TypeScript with strict types — Cursor can navigate it very effectively.

---

## Deployment

The prototype deploys to GitHub Pages automatically on every merge to `main`.

| What | Where |
|---|---|
| Repo | `github.com/entrata-product/oxp-prototype-product` |
| Live URL | `https://probable-dollop-7ppnpwg.pages.github.io/getting-started` |
| Deploy trigger | Push/merge to `main` |
| Build | GitHub Actions (`proto.yml`) — runs `next build`, deploys `./out/` |

> **Note:** The Pages site is private (requires GitHub org membership to view).

---

## Questions?

Ask Brandon Bayles (brandon.bayles@entrata.com) or open a comment on [DEV-283088](https://entrata.atlassian.net/browse/DEV-283088).
