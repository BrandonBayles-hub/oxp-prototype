# Entrata Experts — Prototype Knowledge Base

**Last updated:** June 2026  
**Audience:** Product managers, design, and engineering partners working on Entrata Experts inside OXP Studio

This document is an internal reference for **what the OXP prototype implements today** across Entrata Experts (chat/analyst), Admin Insights, token spend, and the Analytics Platform handoff. It compresses behavior from the actual codebase — not a roadmap wish list — so PMs can answer “what do we have?” without spelunking the repo.

---

## How this prototype is built

| Aspect | Detail |
|--------|--------|
| **Stack** | Next.js app with **`output: "export"`** (static export) — see `next.config.ts` |
| **Entrata Experts route** | `/entrata-experts` → `app/entrata-experts/page.tsx` renders `ChatFirstHub` |
| **Admin Insights route** | `/admin-insights` → `app/admin-insights/page.tsx` |
| **Setup / activation** | `/entrata-experts-setup` (linked from **AI & Agent Activation** at `/getting-started`) |
| **Core feature dirs** | `components/entrata-experts-v2/**`, `lib/entrata-experts-v2/**` |
| **Demo customer** | Wynbrook Living (portfolio data in `lib/entrata-experts-v2/data/portfolio.ts`) |
| **No real LLM** | Answers are composed client-side via `lib/entrata-experts-v2/data/answers.ts` (`compose()`), with simulated “thinking” delays |

### Release-gating model

`lib/entrata-experts-release-context.tsx` defines **`EntrataExpertsVersion`**: `v1.0` → `v1.1` → `v1.2` → `full`.

Components call **`useEntrataExpertsRelease()`** and **`atLeast("v1.x")`** to show/hide surfaces. Default version is **`full`** (complete prototype). The demo selector in **`components/app-shell/entrata-top-nav.tsx`** lets internal users downgrade to simulate staged releases. Version persists in `localStorage` key `oxp:entrata-experts-release`.

| Version | What unlocks |
|---------|----------------|
| **v1.0** | Chat-first hub, Entrata Analyst, Assistants, Report Analyzer, threads sidebar, suggested prompts, citations, artifacts |
| **v1.1** | Admin Insights → Entrata Experts source, memory chip, **Lens picker** |
| **v1.2** | **Tokens & Usage** tab on Entrata Experts page; Admin Insights clusters + automation candidates sub-tabs |
| **full** | Everything above + future roadmap surfaces |

---

## 1. Entrata Experts / Entrata Analyst (chat experience)

### What it is

A **chat-first AI hub** (Gemini Gems–inspired) where operators land directly in **Entrata Analyst** — a data-connected, cited Q&A surface scoped to their portfolio. A left **Experts rail** switches between Analyst, pre-built **Assistants**, and **Report Analyzer** without leaving the page.

**Entry:** `app/entrata-experts/page.tsx` → `components/entrata-experts-v2/chat-first-hub.tsx`

The OXP main sidebar is hidden on this route (`NO_SIDEBAR_ROUTES` / full-bleed layout). **← OXP Studio** in the hub top bar returns to `/command-center`.

### Key files

| Area | Path |
|------|------|
| Hub shell + rail + Tokens toggle | `components/entrata-experts-v2/chat-first-hub.tsx` |
| Analyst wrapper | `components/entrata-experts-v2/analyst-chat.tsx` |
| Chat layout + threads | `components/entrata-experts-v2/chat/chat-view.tsx`, `threads-sidebar.tsx` |
| Composer | `components/entrata-experts-v2/chat/message-input.tsx`, `composer-controls.tsx` |
| Messages + artifacts | `message-bubble.tsx`, `message-body.tsx`, `artifact.tsx`, `citation-chip.tsx` |
| Thinking / trace | `thinking-bubble.tsx`, `trace-view.tsx` |
| Role + memory | `role-switcher.tsx`, `memory-chip.tsx` |
| Scope (disabled in UI) | `scope-picker.tsx` |
| Assistants | `assistant-chat.tsx`, `lib/entrata-experts-v2/assistants.ts` |
| Report Analyzer | `report-analyzer-module.tsx`, `report-analyzer-chat.tsx`, `lib/entrata-experts-v2/reports.ts` |
| State + answer engine | `lib/entrata-experts-v2/store.ts`, `data/answers.ts` |
| Types + lenses | `lib/entrata-experts-v2/types.ts`, `lenses.ts` |
| Analytics handoff UI | `chat/send-to-analytics-dialog.tsx`, `lib/analytics-handoff-context.tsx` |

### Chat / Analyst view

- **Empty state:** “What do you want to know?” with composer, role-based **Suggested Prompts** (`suggested-prompts.tsx`, seeded from `SUGGESTED_PROMPTS` in `answers.ts`).
- **Active thread:** User/assistant bubbles, **ThinkingBubble** while `store.isThinking`, footer disclaimer about verifying resident-specific info.
- **Assistant messages** show lens/mode/model badges, **citations** (inline `[#n]` markers), **artifacts**, expandable **trace**, thumbs up/down, follow-up chips, and outcome badges (answered / low-confidence / refused / escalated).
- **PII guard:** Prompts matching resident PII patterns get a **refused** answer (`compose()` in `answers.ts`).

### Composer controls (Lens / Mode / Model)

Three Perplexity-style pill dropdowns in `composer-controls.tsx`:

| Control | Maps to | Options |
|---------|---------|---------|
| **Lens** | `LensId` | Portfolio, Leasing, Renewals, Payments, Maintenance, Accounting — **not** Auto |
| **Mode** | `Depth` | Auto, Fast, Reasoning |
| **Model** | `ModelId` | Claude Opus 4.7, GPT-5.5, Kimi K2.5 — **not** Auto |

**Product decisions:**

- **Focus → Lens** rename in UI copy (`title="Lens"`).
- **“Auto” removed from Lens & Model picklists** — when store value is still `"auto"`, the pill shows placeholder text **“Lens”** or **“Model”** until the user picks a concrete option. System still auto-routes internally when values are `"auto"`.
- **Default Lens = Leasing** (`store.ts` initializes `lens` to `"leasing"`; role changes do **not** override the user’s lens).
- **Lens picker gated at v1.1** — below v1.1 the picker is hidden (`LensPicker` returns `null`).
- **Scope picker temporarily removed** from composer — import commented out in `message-input.tsx`; `scope` state still exists in the store for answer composition.

### Threads sidebar

`threads-sidebar.tsx` — 260px left column inside Analyst chat:

- **New conversation** button
- Groups: Today / Yesterday / Earlier
- Each row shows title, relative time, lens icon
- Footer: “Entrata Analyst · L1 · Knowledge”

**Gated at v1.0+** (`showThreadsSidebar = atLeast("v1.0")`).

**Limitation:** **In-memory only** — conversations live in React state (`store.ts` `useState<Conversation[]>`). No persistence across refresh; no server sync. Admin activity log uses a **separate** synthetic dataset (`generateActivity()`).

### Roles / personas

Demo **RoleSwitcher** (`role-switcher.tsx`) — five roles from `lib/entrata-experts-v2/lenses.ts`:

| Role ID | Label | Default lens (informational) |
|---------|-------|------------------------------|
| `vp-ops` | VP of Operations | portfolio |
| `regional` | Regional Manager | portfolio |
| `onsite-pm` | On-site Property Manager | auto |
| `asset-mgr` | Asset Manager / Owner | portfolio |
| `accounting` | Accounting / AP | accounting |

Role drives **suggested prompts** and **memory chip** content (`REMEMBERED_BY_ROLE` in `store.ts`). Memory chip is **v1.1+** (`analyst-chat.tsx`).

### Lenses, depths, models (definitions)

All defined in `lib/entrata-experts-v2/lenses.ts`. Lens-specific prompt stubs live in `lib/entrata-experts-v2/lens-prompts/*.md`.

### Pre-built Assistants (7)

From `assistants.ts`: Everyday Assistant, Ad Writing, Document Analyzer, Event Planning, Multifamily Research, Portfolio Strategy, Resident Writing. Each has production SVG badges under `/public/experts/`.

### Report Analyzer

Rail entry opens a **report picker** (`ReportPickerView`) then per-report chat (`ReportAnalyzerChat`). Recent reports pinned under the rail item.

### Artifacts

Types in `types.ts`: `table`, `bar-chart`, `line-chart`, `kpi-strip`, `draft-email`.

Rendered in `artifact.tsx` (Recharts for charts). Header actions: **Send to Analytics Platform** (when handoff demo enabled), Save to Insights, Copy, Export.

Intent-matched answers in `answers.ts` attach realistic artifacts (e.g. delinquency → table + bar chart).

### Generative / TextQL-style capability

The prototype simulates **TextQL-style generative analytics**:

1. User asks a natural-language question.
2. `classifyIntent()` matches keywords to ~10 intents (delinquency, occupancy, NOI, leasing, renewals, maintenance, AP, etc.).
3. `compose()` builds scoped answers from **Wynbrook portfolio mock data**, attaching citations, trace steps, and artifacts.
4. **Reasoning mode** adds an extra trace step (“Double-checked against company policy”).

**Target (not fully built):** multi-block dashboards, live metric binding, persistence in Analytics Platform — see handoff section and `docs/product/ENTRATA-ANALYST-AND-ANALYTICS-PLATFORM-HANDOFF.md`.

### Current state & limitations

| ✅ Implemented | ⚠️ Limitation |
|---------------|---------------|
| Full chat-first hub with Analyst + Assistants + Report Analyzer | No real backend / LLM — all answers mocked |
| Composer Lens/Mode/Model | Scope picker UI removed (data layer still supports scope) |
| Threads sidebar (session) | No thread persistence |
| Citations, trace, artifacts, follow-ups | Admin activity data is separate synthetic set |
| Role switcher + memory (v1.1+) | Memory is static per role, not learned |
| Release gating via demo selector | Default `full` — must downgrade to see MVP slices |
| Analytics handoff (demo-gated) | Requires Analytics Platform running locally; CORS opaque response |

---

## 2. Admin Insights

### What it is

**Cross-platform observability** at `/admin-insights` — one page with **source selectors** for multiple OXP AI surfaces. The **Entrata Experts** source is the admin view for conversation health, gaps, and automation graduation.

### Key files

| Area | Path |
|------|------|
| Page shell + source tabs | `app/admin-insights/page.tsx` |
| Standalone Experts admin (unused on page) | `components/entrata-experts-v2/admin/admin-view.tsx` |
| Health KPIs | `admin/health-strip.tsx` |
| Activity log | `admin/activity-log.tsx` |
| Intent clusters | `admin/cluster-list.tsx` |
| Knowledge gaps | `admin/gap-list.tsx` |
| Automation candidates | `admin/automation-candidates.tsx` |
| Experts admin config | `admin/experts-config-sheet.tsx`, `scope-override-table.tsx` |
| Synthetic session data | `lib/entrata-experts-v2/data/activity.ts` |
| Admin spend/model policy | `lib/entrata-experts-v2/admin-policy-context.tsx` |

### Entrata Experts source — what each view shows

**Health strip** (`health-strip.tsx`) — rollup KPIs from `summaryStats(activity)`:

- Sessions / active employees / resolution rate / top lenses (primary row)
- Avg turns per session, abandonment %, escalation %, regressed sessions (secondary row)

**Sub-tabs** (release-gated):

| Tab | Version | Purpose |
|-----|---------|---------|
| **Activity log** | v1.1+ | Searchable, filterable session table with expandable turn timeline (lens, role, intent, resolution, ratings, regression) |
| **What people are asking** (clusters) | v1.2+ | Intent clusters by volume — deflection %, distinct askers, example questions |
| **Knowledge gaps** | v1.1+ | Failed/low-confidence/refused/escalated patterns translated into admin actions: connect data, add policy, add document, new expert |
| **Automation candidates** | v1.2+ | Recurring questions that should graduate to saved insight, scheduled digest, or L3 agent draft |

**Entire Experts source hidden below v1.1** (`showExpertsSource = atLeast("v1.1")`).

### Other Admin Insights sources (context)

Same page also hosts **Trainings & SOP**, **Escalations**, **Communications**, and **Entrata Academy** (admin-only Academy tab with persona pinning). These are outside Entrata Experts scope but share the page chrome.

### Experts admin config (policy)

`ExpertsConfigPanel` in `experts-config-sheet.tsx` — opened from:

- **Agent Roster** → Entrata Experts row (`app/agent-roster/page.tsx`)
- **AI & Agent Activation** → Entrata Experts card → `/entrata-experts-setup`

Three sections:

1. **Surfaces** — toggle Analyst / Assistants / Report Analyzer globally
2. **Spend limits** — org default + scoped overrides (monthly token cap, on-demand $ cap, alert thresholds) via `ScopeOverrideTable`
3. **Model access** — org allow-list + scoped overrides per user/group/property

Policy persists via `useExpertsPolicy()` (`admin-policy-context.tsx`); defaults mirror `CreditsUsage` caps (50M tokens, $250 on-demand).

### Current state & limitations

| ✅ Implemented | ⚠️ Limitation |
|---------------|---------------|
| Full Experts observability UI | Activity/clusters/gaps driven by **`generateActivity()`** mock data, not live chat store |
| Release-gated sub-tabs | Tokens & Usage **moved off** this page (now on Entrata Experts hub) |
| Actionable gap taxonomy | CTAs are prototype links, not wired integrations |
| Scope override table | Resolution helpers exist; runtime enforcement not hooked to chat |

---

## 3. Credit / token spend (“Tokens & Usage”)

### What it is

Usage metering and spend visualization for Entrata Experts. UI label is **Tokens & Usage** (component file remains `credits-usage.tsx` — **Credits → Tokens** rename in product copy only).

### Where it lives

| Surface | Path | Gating |
|---------|------|--------|
| **Primary** | Entrata Experts hub top bar toggle → `TokensView` in `chat-first-hub.tsx` | `atLeast("v1.2")` |
| **Admin policy defaults** | `admin-policy-context.tsx` | Mirrors caps in usage UI |
| **Activation entry** | `/getting-started` → “Entrata Experts” card → `/entrata-experts-setup` | Full OXP version only (`isFullVersion`) |

**AI & Agent Activation** (`app/getting-started/page.tsx`) is the parent hub at `/getting-started`. The Entrata Experts setup card describes configuring **surfaces, spend limits, and model access** — not the usage dashboard itself.

### Key file

`components/entrata-experts-v2/credits-usage.tsx` — exports **`CreditsUsage`** component.

### How spend/usage is modeled (prototype)

All **sample data** — comments in file say “real data wires in production.”

**Sub-tabs:**

| Tab | Contents |
|-----|----------|
| **Analytics** | Headline stats (total tokens, conversations, active users, most-used expert); stacked bar chart by expert over time; **token usage by model** line chart (Opus / GPT-5.5 / Kimi); usage leaderboard |
| **Usage** | Included tokens progress (50M cap, “Entrata Experts (Beta)” plan); on-demand $ spend ($250 cap); cumulative spend area chart; recent activity table |
| **Conversation Insights** | Donut charts — tokens by expert, intent distribution, top categories, task complexity |

**Constants:** `TOKEN_CAP = 50_000_000`, `ON_DEMAND_CAP = 250` — aligned with `DEFAULT_SPEND_POLICY` in admin policy.

**Experts tracked:** Entrata Analyst, Everyday Assistant, Multifamily Research, Report Analyzer (colors in `EXPERT_COLORS`).

### Feature gating summary

| Feature | Gate |
|---------|------|
| Tokens & Usage page toggle | Entrata Experts release **v1.2+** |
| Entrata Experts setup card on Activation | OXP **full version** (not R1-only) |
| Spend/model policy editor | Agent Roster or `/entrata-experts-setup` (no release gate on the panel itself) |

### Current state & limitations

| ✅ Implemented | ⚠️ Limitation |
|---------------|---------------|
| Rich usage dashboard UI | **No connection** to real chat sessions or billing |
| Model-level consumption story | Deterministic fake daily series |
| Export CSV / Settings buttons | Presentational only |
| Policy caps in admin sheet | Not enforced in chat composer |

---

## 4. Analytics Platform handoff (summary)

**Do not duplicate the full spec here.** Detailed design lives in:

- **[ENTRATA-ANALYST-AND-ANALYTICS-PLATFORM-HANDOFF.md](./ENTRATA-ANALYST-AND-ANALYTICS-PLATFORM-HANDOFF.md)** — generative capability lineage (TextQL), artifact eligibility, snapshot vs live binding, API contract
- **[DASHBOARD-HANDOFF-WALKTHROUGH.md](./DASHBOARD-HANDOFF-WALKTHROUGH.md)** — walkthrough doc (created separately)

### High-level flow

1. Entrata Analyst renders an answer **artifact** (`table`, `bar-chart`, `line-chart`, `kpi-strip`).
2. User clicks **Send to Analytics Platform** on the artifact header, or types `/send-to-analytics` / natural-language handoff command in chat (`chat-view.tsx` intercepts before `store.send`).
3. **`SendToAnalyticsDialog`** opens — pick name, tier (My Workspace / My Team / Company Menu), snapshot vs live mode.
4. **`lib/entrata-experts-v2/analytics-handoff.ts`** builds `dashboard.py` source; **`deliverHandoff()`** POSTs to Analytics Platform `POST /api/agent/dashboard/save` (browser `no-cors` simple request).
5. Demo toggle in top nav Demo menu via **`AnalyticsHandoffProvider`** (`lib/analytics-handoff-context.tsx`) — **default OFF**, persisted `oxp:analytics-handoff`.

**Eligible:** table, bar-chart, line-chart, kpi-strip. **Not eligible:** draft-email.

**Modes:** `snapshot` (markdown text block — works today) vs `live` (metric slug binding via `metric-map.ts` — falls back to snapshot if unmapped).

---

## Cross-cutting decisions & terminology

| Decision | Detail |
|----------|--------|
| **Credits → Tokens** | UI says “Tokens & Usage”; component still named `CreditsUsage` |
| **Focus → Lens** | Composer label and docs use “Lens”; code comments may still say “focus” |
| **Default Lens = Leasing** | Store default; not re-derived from role |
| **Auto removed from Lens & Model lists** | User must pick explicitly; internal `"auto"` still valid in types/store |
| **Scope picker removed** | Comment in `message-input.tsx`; `ScopePicker` + portfolio data intact |
| **Threads in-memory only** | No localStorage/server persistence for user threads |
| **Tokens moved to Experts page** | Was Admin Insights sub-tab; now peer toggle on chat-first hub (v1.2+) |
| **Admin activity ≠ user threads** | Admin uses `generateActivity()` synthetic sessions with rich session metadata |
| **Static export constraints** | No Next.js API routes; Analytics handoff posts directly to external platform |
| **Demo customer** | Wynbrook Living throughout Experts + Admin |
| **Release demo selector** | Top nav → Demo menu → Entrata Experts version |

---

## Related docs

| Doc | Purpose |
|-----|---------|
| [ENTRATA-ANALYST-AND-ANALYTICS-PLATFORM-HANDOFF.md](./ENTRATA-ANALYST-AND-ANALYTICS-PLATFORM-HANDOFF.md) | Full handoff design, TextQL parity, API wiring |
| [DASHBOARD-HANDOFF-WALKTHROUGH.md](./DASHBOARD-HANDOFF-WALKTHROUGH.md) | Step-by-step handoff walkthrough |
| [APP-PAGES-AND-GOALS.md](./APP-PAGES-AND-GOALS.md) | OXP page map and goals |
| [JIRA-INITIATIVES-AND-EPICS.md](./JIRA-INITIATIVES-AND-EPICS.md) | Jira hierarchy aligned to pages |
| [EVAL-REQUIREMENTS.md](./EVAL-REQUIREMENTS.md) | Eval framework requirements |
| [EVAL-QUESTIONS.md](./EVAL-QUESTIONS.md) | Eval question catalog |
| [README.md](./README.md) | Index of `docs/product/` |

---

*This knowledge base reflects the prototype as of June 2026. When behavior changes, update the relevant section and the “Last updated” date above.*
