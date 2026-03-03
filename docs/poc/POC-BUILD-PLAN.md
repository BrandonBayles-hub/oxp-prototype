# POC Build Plan: AI-Native Multifamily Platform

**Purpose:** A meticulous, chunked plan to build a **proof-of-concept** that lets you **view and access most functionality** — one navigable app with all major pages and patterns from our research and TDD, using **mock data** and **no real backend** (no Entrata, Workato, or live agents yet). Each chunk is sized to avoid timeouts and can be completed in one focused session.

**Scope:** Implement the **app shell**, **routing**, and **all pages** from **docs/product/APP-PAGES-AND-GOALS.md** with placeholder or mock content, following **docs/design/UI-UX-GUIDELINES.md** and **docs/design/SHADCN-COMPONENT-MAPPING.md**. Nothing from the planned sections is skipped; the checklist at the end ensures every piece is accounted for.

**Tech stack (POC):** Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui. Fonts: Nohemi (page headers), Inter (body). Assets: `assets/entrata-cube.svg`, `assets/eli-plus-cube.svg`. No database or real API in POC; mock data in code or static JSON.

---

## Build order (chunks)

Work in this order. Complete one chunk fully (run build, verify) before starting the next. If a chunk feels too large, split it into (a) and (b) and do (a) first.

| # | Chunk | What to do | Done when |
|---|--------|------------|-----------|
| **0** | **Scaffold** | Create Next.js app (App Router), add Tailwind, add shadcn/ui, configure Nohemi + Inter (e.g. Google Fonts or local), add theme (neutrals, minimal). Ensure `npm run build` and `npm run dev` work. | App runs; fonts and shadcn available; no pages yet. |
| **1** | **App shell (layout + sidebar)** | Single root layout: two-column (sidebar + main). Sidebar: Entrata cube logo (top), nav groups **To Do** (Getting Started, Command Center, Escalations), **My Workforce** (Performance, Agent Roster, Workforce), **Configure** (Workflows, Trainings & SOP, Voice, Tools, Governance). Nav items as links; active state (e.g. light grey bg). Bottom: user avatar + name (mock). Main: `<main>` with padding. Use shadcn where applicable (e.g. Button for nav, Avatar). | Every nav item present; clicking goes nowhere until Chunk 2. |
| **2** | **Responsive sidebar** | Below `lg`: hide sidebar, show hamburger/menu; clicking opens **Sheet** (drawer) with same nav. Main full-width when sheet closed. | Resize to mobile breakpoint; menu opens sheet with full nav. |
| **3** | **Routes + placeholder pages** | Define routes for every nav target. One route = one page component. Each page: minimal content (e.g. `<h1>Page Name</h1><p>Placeholder</p>`). Use Nohemi for h1. Route list: `/` (redirect or Command Center), `/getting-started`, `/command-center`, `/escalations`, `/performance`, `/agent-roster`, `/workforce`, `/workflows`, `/trainings-sop`, `/voice`, `/tools`, `/governance`. | Every link in sidebar works; every URL shows a distinct page with correct title. |
| **4** | **Getting Started page** | Page structure: title "Getting Started", short description. List or stepper for steps 1–7 (Account, Connect Entrata, Upload to Vault, Enable agents, Workflows, Voice/channels, Go live). Mock state: e.g. steps 1–2 "complete", rest incomplete. Progress indicator (checkmarks or progress bar). No real forms; labels only. | Page matches TDD §4.7 step order; visual progress. |
| **5** | **Command Center page** | Title "Command Center", description. Two areas: (1) **What needs doing** — e.g. card or list with mock escalation summary (counts by category, 1–2 sample items). (2) **Workforce performance** — e.g. 2–3 mock metrics (conversation count, escalation rate, agent vs human). Links/buttons to Escalations and Performance. Open layout, minimal chrome. | Landing-style dashboard with placeholders for §4.12 content. |
| **6** | **Escalations page** | Title "Escalations", description. Table or list of mock escalation items (columns or fields: summary, category, status, assignee). 3–5 mock rows. No borders on table rows; spacing between rows (per design). Optional: filter dropdown (mock). | Task-list pattern; data from mock array. |
| **7** | **Performance page** | Title "Performance", description. Placeholder for insights: e.g. 2–3 metric cards or a simple table (renewal rate, occupancy, units per staff — mock values). Optional short "insight" line (e.g. "Leasing resolution rate low at Property A — consider X"). | §4.11 / insights-oriented placeholder. |
| **8** | **Agent Roster page** | Title "Agent Roster". Sectioned list by bucket (e.g. Leasing & Marketing, Resident Relations & Retention) with mock agents. Each item: name, short description, status (e.g. Active, Training). Use ELI+ cube icon where appropriate. "View All" link per section. Action bar: Filter, Create Agent (buttons, no behavior). | §4.13 pattern; mock agents per bucket. |
| **9** | **Workforce page** | Title "Workforce", description. Placeholder for org chart / AI + human view: e.g. simple list or card grid of mock "team" (2–3 agents, 2–3 people). No real org tree; just enough to show the concept. | §6 Workforce surface placeholder. |
| **10** | **Trainings & SOP (Vault) page** | Title "Trainings & SOP", description. Action bar: search (Input), "New Folder", "Add Document" (buttons). Table: columns FILE NAME, Trained on, Modified, Owner (avatar + name). 4–6 mock rows; no grid lines; spacing between rows. Optional: floating "Ask a question" input at bottom-right. | §4.1 / reference screen pattern. |
| **11** | **Workflows page** | Title "Workflows", description. Placeholder for Workato embed: e.g. message "Workflow builder (Workato) will be embedded here" or an iframe placeholder. Link or button "Open Workato" (no-op). | §4.2.1 placeholder. |
| **12** | **Voice page** | Title "Voice", description. Placeholder for voice config: e.g. 2–3 mock sections (Unified vs per-property; Communication methods; Controlled phrasing). Labels only or minimal form fields. | §4.14 placeholder. |
| **13** | **Tools page** | Title "Tools", description. List or table of mock MCP tools (e.g. Entrata MCP, 2–3 tool names). Toggle or "Enabled" column (mock). | §4.15 placeholder. |
| **14** | **Governance page** | Title "Governance", description. Placeholder for guardrails/config: e.g. list of mock areas (Approval gates, Required docs, Policy checks). No real config. | §4.16 placeholder. |
| **15** | **Landing redirect + polish** | Root `/`: redirect to `/getting-started` (or, if "go-live" is complete in mock state, redirect to `/command-center`). Optional: mock "go-live complete" flag to switch. Check all links work; check fonts (Nohemi on all h1s, Inter body); check responsive (sidebar → sheet). Fix any broken links or missing nav items. | Navigating to `/` lands on correct default; no broken routes; design checklist satisfied. |

---

## Execution rules (avoid timeouts)

1. **One chunk per session.** Do not combine chunks. Finish Chunk N (including `npm run build` and a quick manual check) before starting N+1.
2. **If a chunk is too big,** split it: e.g. Chunk 1 = layout + sidebar only; then a new Chunk 1b = responsive Sheet. Or Chunk 10 = table only; Chunk 10b = floating input.
3. **No backend in POC.** All data is mock (in-component state, or a single `lib/mock-data.ts` / `data/mock.json`). No API routes unless they only return static mock JSON.
4. **Prefer placeholder over perfection.** Each page needs to show the **right structure** and **navigation**; copy and styling should match design guidelines but don’t spend more than one chunk’s time on polish per page.
5. **After each chunk:** run `npm run build`; fix build errors before proceeding.

---

## Checklist: No piece missed

Use this to verify every planned surface and requirement is touched. Tick when the POC implements the item (even as placeholder).

### Pages (APP-PAGES-AND-GOALS)

| Section | Page | Route (POC) | In nav? | Chunk |
|---------|------|-------------|---------|--------|
| To Do | Getting Started | `/getting-started` | ✓ | 4 |
| To Do | Command Center | `/command-center` | ✓ | 5 |
| To Do | Escalations | `/escalations` | ✓ | 6 |
| My Workforce | Performance | `/performance` | ✓ | 7 |
| My Workforce | Agent Roster | `/agent-roster` | ✓ | 8 |
| My Workforce | Workforce | `/workforce` | ✓ | 9 |
| Configure | Workflows | `/workflows` | ✓ | 11 |
| Configure | Trainings & SOP | `/trainings-sop` | ✓ | 10 |
| Configure | Voice | `/voice` | ✓ | 12 |
| Configure | Tools | `/tools` | ✓ | 13 |
| Configure | Governance | `/governance` | ✓ | 14 |

### App shell (UI-UX-GUIDELINES §3, SHADCN-COMPONENT-MAPPING)

| Item | Done |
|------|------|
| Two-column layout (sidebar + main) | Chunk 1 |
| Entrata cube logo top of sidebar (40×40) | Chunk 1 |
| Nav groups: To Do, My Workforce, Configure | Chunk 1 |
| All nav items with labels | Chunk 1 |
| Active state (e.g. light grey bg) | Chunk 1 |
| User avatar + name at bottom of sidebar | Chunk 1 |
| Responsive: Sheet/drawer for nav below lg | Chunk 2 |

### Design system

| Item | Done |
|------|------|
| Nohemi for page titles (h1) | Chunk 3+ |
| Inter for body/nav/labels | Chunk 0 |
| Neutrals (white, greys, black); color sparingly | Chunk 0 theme |
| shadcn components only (no second library) | Chunk 0 |
| Open layout; spacing over borders | Per-page |

### TDD Phase 1 surfaces (reference)

| TDD section | POC surface | Chunk |
|-------------|-------------|--------|
| §4.7 Getting Started | Getting Started page, steps 1–7 | 4 |
| §4.12 Command Center | Command Center page | 5 |
| §4.6 Escalations | Escalations page | 6 |
| §4.11 Outcome metrics / Performance | Performance page | 7 |
| §4.13 Agent Roster | Agent Roster page | 8 |
| §6 Workforce | Workforce page | 9 |
| §4.1 Vault | Trainings & SOP page | 10 |
| §4.2 Workflows | Workflows page | 11 |
| §4.14 Voice | Voice page | 12 |
| §4.15 Tools | Tools page | 13 |
| §4.16 Governance | Governance page | 14 |

### Reference patterns (UI-UX-GUIDELINES §4, §7)

| Pattern | Where | Chunk |
|---------|--------|--------|
| Page header block (title + optional description) | Every page | 3+ |
| Action bar (search, primary buttons) | Trainings & SOP, Agent Roster | 8, 10 |
| Borderless table (spacing between rows) | Trainings & SOP, Escalations | 6, 10 |
| Sectioned list (bucket + items + View All) | Agent Roster | 8 |
| Optional floating "Ask a question" | Trainings & SOP | 10 |

---

## File structure (suggested)

```
Janet/
├── app/
│   ├── layout.tsx           # Root layout: shell (sidebar + main)
│   ├── page.tsx             # Redirect to getting-started or command-center
│   ├── getting-started/
│   │   └── page.tsx
│   ├── command-center/
│   │   └── page.tsx
│   ├── escalations/
│   │   └── page.tsx
│   ├── performance/
│   │   └── page.tsx
│   ├── agent-roster/
│   │   └── page.tsx
│   ├── workforce/
│   │   └── page.tsx
│   ├── workflows/
│   │   └── page.tsx
│   ├── trainings-sop/
│   │   └── page.tsx
│   ├── voice/
│   │   └── page.tsx
│   ├── tools/
│   │   └── page.tsx
│   └── governance/
│       └── page.tsx
├── components/
│   ├── app-shell/
│   │   ├── sidebar.tsx
│   │   ├── mobile-nav-sheet.tsx
│   │   └── user-menu.tsx
│   ├── ui/                  # shadcn (generated)
│   └── ...                  # Optional: page-header.tsx, action-bar.tsx
├── lib/
│   └── mock-data.ts         # Mock arrays for escalations, agents, docs, etc.
├── assets/                  # Existing: entrata-cube.svg, eli-plus-cube.svg
├── docs/                    # Existing
└── package.json
```

---

## Out of scope for POC

- Real Entrata API or MCP
- Real Workato embed or recipes
- Real agent runtime or RAG
- Auth (SSO, login)
- Database or persistence (progress in Getting Started can be in-memory or localStorage for demo only)
- HRIS or real org data
- Source citation UI, History Export, Knowledge, Spaces, Segment, Trust page content

These remain in the TDD for later phases; the POC only needs **navigable UI and placeholder content** so you can view and access every major area.

---

*Last updated: Feb 2025. Execute chunks in order; tick the checklist as you go. When all chunks and checklist items are done, the POC is complete.*
