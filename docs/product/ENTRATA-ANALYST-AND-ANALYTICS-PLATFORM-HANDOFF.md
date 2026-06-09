# Entrata Analyst → Analytics Platform: Generative Analytics & Library Handoff

**Status:** design draft for review
**Owner:** Devon Christensen
**Last updated:** 2026-05-30
**Audience:** Entrata Analyst (OXP) team + Analytics Platform team + engineering handoff

---

## Why this doc exists

Two things, captured in one place:

1. **Restore the generative capability.** A prior version of Entrata Analyst
   was powered by **TextQL** — ask a question about Entrata data or a report,
   and it generates a **table, a visualization, or a whole dashboard**. We want
   Entrata Analyst to have that capability again, and we want it written down as
   part of the handoff.
2. **Define the hand-off to the Analytics Platform.** We now have a separate
   product — the **Analytics Platform** (running locally at
   `http://127.0.0.1:3001`) — with a real "create report" agent, a governed
   report **Library**, a personal **My Workspace**, and a **Company Menu**.
   When Entrata Analyst builds a dashboard or table, a user should be able to
   run a **command or click a button** and have that artifact **land in the
   Analytics Platform library** — in My Workspace or the Company Menu.

This doc answers: *what does that hand-off look like, and how do we actually
wire it up?* It is grounded in the real Analytics Platform code, not a sketch.

---

## Part 1 — Entrata Analyst as a generative analyst (the TextQL capability)

### The lineage

TextQL's model: a natural-language question →  a semantic/SQL query against the
customer's data → a rendered **answer artifact** (a table, a chart, or a
multi-block dashboard), with the underlying query kept inspectable. Entrata
Analyst should present the same arc to the user:

> "How did delinquency trend across the Sun Belt region this quarter?"
> → Analyst resolves the metric + scope → returns a **line chart + a table** →
> the user can keep it, reshape it, or **send it to the Analytics Platform**.

### What Analyst does today

Analyst already renders answer **artifacts** inside the chat bubble. The
renderer is `components/entrata-experts-v2/chat/artifact.tsx`, and the artifact
kinds are defined in `lib/entrata-experts-v2/types.ts`:

| Artifact kind  | Renders as                          | Handoff-eligible? |
|----------------|-------------------------------------|-------------------|
| `table`        | sortable data table                 | ✅ yes            |
| `bar-chart`    | Recharts bar                        | ✅ yes            |
| `line-chart`   | Recharts line                       | ✅ yes            |
| `kpi-strip`    | KPI tiles with deltas               | ✅ yes            |
| `draft-email`  | email draft                         | ❌ no (not analytics) |

Each artifact already has a header action row (`Save to Insights`, `Copy`,
`Export`) — that row is the natural home for a **"Send to Analytics Platform"**
action (see Part 3).

### The gap to close (target capability)

| | Today | Target (TextQL parity) |
|---|---|---|
| Output | one artifact per answer | **compose multiple blocks into one dashboard** (KPIs + chart + table) |
| Data | composed/mocked from the lens answer builders (`lib/entrata-experts-v2/data/answers.ts`) | resolved from the **Analytics Platform data sources + data dictionary** (shared at **V1.3** — see Part 6) |
| Persistence | lives in the chat thread only | **promotable** to a governed, re-runnable report in the Analytics Platform |
| Inspect | citations + trace | citations + trace **+ the query/spec behind it** |

The handoff (Parts 3–4) is what closes the **persistence** row — and the
Analytics Platform is where the "compose a dashboard" and "governed,
re-runnable" capabilities already live. So rather than rebuild dashboard
authoring inside Analyst, **Analyst generates the answer and hands the build
job to the platform that already does it.**

---

## Part 2 — The two products and the boundary

| | **Entrata Analyst** (OXP, `:3020`) | **Analytics Platform** (`:3001`) |
|---|---|---|
| Verb | **Ask** — answer a question, draft an artifact | **Build / Keep / Govern** — compose, save, schedule, share |
| Surface | conversational chat | Report Composer (`/create`) + Library (`/library`) + Workspace (`/workspace`) |
| Persistence | the thread | Prisma DB (`CustomerReport`, `ReportTemplate`, `ReportFolder`) |
| Homes | — | **My Workspace** (personal), **Company Menu** (`/my-reports`), **Library** catalog |
| Backend reality | mock/composed answers | real API routes, dashboard DSL, semantic layer, scheduling, releases/governance |

**The boundary, stated plainly:** Analyst is where you *discover the answer*.
The Analytics Platform is where an answer becomes a *durable, governed, shareable
report*. The hand-off is the bridge across that boundary — and it only ever goes
in the "promote this answer into the platform" direction.

The Analytics Platform's create-report agent (`/create`, the `ComposerShell` in
`apps/analytics-platform/src/components/agent-chat/`) already authors dashboards
from chat and saves them via `POST /api/agent/dashboard/save`. **That same
endpoint is our hand-off target** — we are not inventing a new ingestion path,
we're calling the one the platform's own composer uses.

---

## Part 3 — The hand-off experience (the ask)

### Trigger: a button *and* a command (same action)

Two ways to fire the same hand-off, so it's discoverable and keyboard-friendly:

1. **Button on the artifact.** Every handoff-eligible artifact gets a
   **`Send to Analytics Platform ↗`** action in its header row (next to
   `Save to Insights` / `Export` in `artifact.tsx`). This is the "button that
   gets added to a dashboard or a table that gets built" the ask calls for.
2. **Chat command.** Typing **`/send-to-analytics`** (or natural language like
   *"save this to my workspace"* / *"add this to the company menu"*) targets the
   **most recent eligible artifact** in the thread and opens the same dialog.

### The destination picker (mirrors the platform's own Save dialog)

Clicking either trigger opens a small dialog — intentionally identical in shape
to the Analytics Platform's own `SaveDialog`
(`apps/analytics-platform/src/components/agent-chat/save-dialog.tsx`), so the two
products feel like one system:

```
┌─ Send to Analytics Platform ───────────────────────────────┐
│                                                             │
│  Name                                                       │
│  [ Sun Belt delinquency — Q2 ]                              │
│                                                             │
│  Where should this live?                                    │
│  ( ) My Workspace      — only you            → tier PERSONAL │
│  ( ) My Team           — your team           → tier TEAM     │
│  (•) Company Menu      — everyone            → tier COMPANY  │
│        Folder: [ Operations ▾ ]   (company menu only)       │
│                                                             │
│  Preview: KPI strip + line chart + table                    │
│                                                             │
│             [ Cancel ]   [ Send to Analytics Platform ↗ ]   │
└─────────────────────────────────────────────────────────────┘
```

The three destinations map 1:1 to the platform's `tier` field — so "My
Workspace" and "Company Menu" aren't new concepts we invent, they're the
platform's existing audience tiers under friendly labels.

### UX states

1. **Built** — artifact rendered in the thread, `Send to Analytics Platform`
   visible.
2. **Picker** — name + destination (+ folder for Company Menu) + a preview of
   what will be created.
3. **Sending** — button spinner; POST in flight.
4. **Success** — toast: *"Added to your Company Menu → Operations"* with a
   primary link **"Open in Analytics Platform ↗"** → `/workspace/reports/{id}`,
   and a secondary **"View library"** → `/library`.
5. **Error** — inline message (compile failure, no customer context, network) —
   the artifact stays put so nothing is lost.

---

## Part 4 — The technical contract

### Endpoint (the hand-off target)

```
POST {ANALYTICS_PLATFORM_URL}/api/agent/dashboard/save
Content-Type: application/json

{
  "name":            "Sun Belt delinquency — Q2",
  "tier":            "COMPANY",          // PERSONAL | TEAM | COMPANY
  "dashboardSource": "<dashboard.py DSL>",  // see below
  "sessionId":       null                 // optional; links a chat session
}
```

Source of truth: `apps/analytics-platform/src/app/api/agent/dashboard/save/route.ts`.
It compiles the DSL server-side, creates a `CustomerReport` against the synthetic
`ai-composer` template, and responds:

```
201 { "id": "<reportId>", "slug": "ai-composer" }
```

### Where it lands (tier → library home)

| Picker label   | `tier`     | Shows up in                                   |
|----------------|------------|-----------------------------------------------|
| My Workspace   | `PERSONAL` | personal Workspace / My Reports               |
| My Team        | `TEAM`     | team-scoped reports                           |
| Company Menu   | `COMPANY`  | **Company Menu** (`/my-reports`), grouped by `menuFolder` |

The Company Menu groups reports into `ReportFolder`s by `menuFolder` slug
(`apps/analytics-platform/src/app/api/company-menu/route.ts`). To drop a report
directly into a named folder, set `menuFolder` (or call
`POST /api/company-menu/assign` after save).

### `dashboardSource` — the dashboard DSL

The platform's canonical format is a narrow Python surface (`dashboard.py`),
defined in `apps/analytics-platform/src/lib/dashboard-dsl/spec.ts`. Each
`dash.<verb>(...)` compiles 1:1 to a dashboard block:

```python
import ap
dash = ap.Dashboard(title="Sun Belt delinquency — Q2",
                    description="Imported from Entrata Analyst")
dash.kpi(metric="delinquency_rate", compare="prior_period")
dash.line(metrics=["delinquency_rate"], group_by="property", width="half")
dash.table(metrics=["delinquency_rate", "balance_owed"], group_by="property")
```

### Artifact → DSL verb mapping

| Analyst artifact (`ArtifactKind`) | Analytics Platform DSL verb            |
|-----------------------------------|----------------------------------------|
| `kpi-strip`                       | `dash.kpi_strip(...)` / repeated `dash.kpi(...)` |
| `line-chart`                      | `dash.line(...)`                       |
| `bar-chart`                       | `dash.bar(...)` / `dash.horizontal_bar(...)` |
| `table`                           | `dash.table(...)` (or `dash.pivot(...)`) |
| _multi-artifact answer_           | one `ap.Dashboard()` with several blocks + `dash.section(...)` headers |
| `draft-email`                     | — (not handed off)                     |

(The DSL also supports `area`, `donut`, `funnel`, `treemap`, `heatmap`, `map`,
`forecast`, `sparklines`, `text`, `divider`, `html`, `embed` — room to grow.)

### Cross-app configuration

```
ANALYTICS_PLATFORM_URL = http://127.0.0.1:3001   # default for local demo
NEXT_PUBLIC_ANALYTICS_PLATFORM_URL = <prod URL>  # override
```

Deep links after a successful save:
- Open the new report: `{AP}/workspace/reports/{id}`
- Company Menu: `{AP}/my-reports`
- Library catalog: `{AP}/library`

---

## Part 5 — Two hand-off modes

| | **Mode A — Publish to library** (recommended) | **Mode B — Continue building** |
|---|---|---|
| What | POST the built artifact to `/api/agent/dashboard/save`; it appears in the library | Deep-link to `{AP}/create` seeded with the question, keep iterating in the composer |
| Matches the ask? | ✅ "what the agent created gets **added into** the library / My Workspace / Company Menu" | partial — it's "go finish it over there" |
| User effort after | none — it's saved | finish + save in the platform |
| AP work needed | none (endpoint exists) | small: have `/create` read a seed prompt from the URL (not wired today) |

**Recommendation: build Mode A first.** It's the literal ask, the endpoint
already exists, and the artifact the user already approved in chat is preserved
exactly. Mode B is a fast follow for the "I want to keep shaping it" case.

---

## Part 6 — Data sources & the data dictionary (the V1.3 relationship)

The metric-mapping problem isn't a permanent gap — it's a function of *where
each product gets its data today*, and the roadmap already closes it.

**Today (Entrata Experts v1.0–v1.2 / "Full"):** Analyst answers are composed
from its own lens answer builders (`lib/entrata-experts-v2/data/answers.ts`) —
effectively a self-contained mock. The two products do **not** share a data
plane yet, and **that relationship is intentionally left undefined in these
early versions.** This is *why* the Phase-1 hand-off carries a **snapshot**
(see the build order below): there is no shared dictionary to bind to.

**By V1.3:** Entrata Experts will reference **all data sources and the data
dictionary in the Analytics Platform** — the same governed metric catalog /
semantic layer exposed by the platform's Data Sources (`/data/sources`) and
its semantic-layer + metrics APIs
(`apps/analytics-platform/src/app/api/semantic-layer/`, `.../api/metrics/`).
When that lands:

- Analyst's lenses resolve against **the platform's metric ids**, not local
  mocks — so an answer's metrics are already platform-native.
- The hand-off stops being a snapshot and becomes a **live** dashboard: the
  `dashboardSource` references real metric ids (`occupancy_rate`,
  `delinquency_rate`, …) that the platform re-queries on open.
- The "metric mapping" open question (Part 7, item 1) **goes away** — there's
  one dictionary, shared by both products.

**Why this matters for the design now:** building the hand-off against the
snapshot path today is forward-compatible. The trigger (button/command), the
destination picker (tier → My Workspace / Company Menu), the endpoint
(`/api/agent/dashboard/save`), and the deep links are all **unchanged** by
V1.3 — only the *body* of `dashboardSource` upgrades from "snapshot block" to
"live metric blocks." Nothing we ship in Phase 1 gets thrown away.

> **Sequencing:** the shared data-source / data-dictionary relationship is a
> **V1.3** capability. v1.0–v1.2 keep Analyst's data self-contained; the
> hand-off snapshot is the bridge until then.

---

## Part 7 — Hard problems & open questions

1. **Metric mapping is the crux** *(resolved at V1.3 — see Part 6).* The DSL
   references metrics by **id** (`delinquency_rate`, `occupancy_rate`) that
   resolve against the platform's semantic layer. Analyst's artifacts today
   carry **literal rows/series**, not platform metric ids. Until the V1.3 data
   relationship lands, the options are:
   - **(a) Snapshot block (Phase 1, no mapping needed):** emit a `dash.table(...)`
     / `dash.html(...)` carrying the literal data Analyst already computed,
     labeled *"Imported snapshot — rebind to live metrics."* Proves the
     end-to-end add-to-library immediately.
   - **(b) Mapping table (Phase 2):** maintain Analyst-concept → AP-metric-slug
     map for the common lenses (payments, leasing, renewals, portfolio) so
     handed-off blocks are **live** in the platform.
   - **(c) Hybrid:** map what's known, snapshot the rest.
2. **Data freshness.** The platform **re-queries** against governed metrics; a
   chat snapshot is the wrong long-term source of truth. The hand-off should
   carry the **spec** (what to show), with the literal snapshot only as the
   Phase-1 fallback above.
3. **Auth / customer context across two apps.** The save endpoint resolves the
   customer from the `activeCustomerId` cookie. For the local demo (same
   browser, same customer) this just works; production needs SSO + explicit
   customer-id propagation in the hand-off.
4. **Governance.** Company-tier reports may need approval. The platform already
   has governance/approvals — decide whether a `COMPANY` hand-off lands as
   `DRAFT` pending review vs. immediately visible.
5. **Round-trip.** Out of scope here, but worth noting: an "Ask Analyst about
   this report" affordance back inside the platform would close the loop.

---

## Part 8 — Recommended build order

- **Phase 0 — this doc.** Align on the experience and the contract. ✅
- **Phase 1 (v1.0–v1.2) — Mode A, snapshot block, behind a demo toggle.** ✅ built.
  Adds the `Send to Analytics Platform` button + `/send-to-analytics` command +
  the destination dialog in Analyst. Translates the artifact to a `dash.text`
  markdown snapshot, delivers it to the platform's save endpoint, and shows a
  success state with deep links to the library / Company Menu. Proves "answer in
  Analyst → lands in the library" before the two products share a data plane.
- **Phase 2 (V1.3) — live metrics.** ✅ built (preview). The destination dialog
  exposes a **Data binding** choice: *Snapshot (v1.0–v1.2)* vs *Live metrics
  (V1.3 preview)*. In live mode the artifact's labels resolve to **real
  Analytics Platform metric slugs** (`lib/entrata-experts-v2/metric-map.ts`,
  every slug verified against the live catalog) and emit native
  `dash.kpi_strip` / `dash.line` / `dash.bar` / `dash.table` blocks the platform
  re-queries. When V1.3 lands, the metric map collapses into the shared
  dictionary; the trigger, picker, endpoint, and deep links are unchanged.
- **Phase 3 — Mode B.** ✅ built (Analyst side). The dialog's **Continue
  building** action deep-links to `{AP}/create?source=entrata-analyst&prompt=…`.
  Remaining: have the platform's `/create` read the seed prompt from the URL
  (small AP-side change, noted below).

---

## Part 9 — Implementation status (what shipped)

**Trigger + UX.** Every handoff-eligible artifact (`table`, `bar-chart`,
`line-chart`, `kpi-strip`) gets a **Send to Analytics Platform** action in its
header row; the **`/send-to-analytics`** command (and forgiving natural language
like *"save this to my workspace"*) targets the most recent eligible artifact in
the thread. Both open one shared dialog that mirrors the platform's own Save
dialog: **Name**, destination (**My Workspace / My Team / Company Menu** → tier
`PERSONAL`/`TEAM`/`COMPANY`), a Company-Menu folder picker, the snapshot/live
binding choice, a live **Preview dashboard source**, and success/error states.
Everything is gated behind a **Demo → "Send to Analytics Platform"** toggle
(default OFF, persisted to `localStorage`).

**Delivery mechanism (important constraint).** Analyst ships as a Next.js
**static export** (`output: "export"`), so it has **no server routes** — and the
Analytics Platform exposes **no CORS** headers. The browser therefore POSTs
directly to `{AP}/api/agent/dashboard/save` as a CORS-safelisted *simple
request* (`Content-Type: text/plain`, `mode: "no-cors"`): the request reaches the
platform and the report is **genuinely created**, but the response is opaque
cross-origin, so we deep-link to the **library / Company Menu** (where the new
report appears) rather than to the specific `/workspace/reports/{id}` URL.
Verified end-to-end against the running platform — both a snapshot payload and a
live-metric payload returned `201` and created reports.

**AP-side follow-ups to upgrade (not done here, separate repo):**
- Add permissive **CORS** (or an `OPTIONS` handler + `Access-Control-Allow-Origin`)
  to `/api/agent/dashboard/save` so Analyst can read back `{ id }` and deep-link
  straight to `/workspace/reports/{id}`.
- Have `/api/agent/dashboard/save` honor a `menuFolder` field (today it's
  cosmetic in the Analyst dialog) — or call `POST /api/company-menu/assign`.
- Have `{AP}/create` read `?prompt=` / `?source=` to complete Phase 3 Mode B.

---

## Appendix — file references

**Entrata Analyst (OXP, this repo) — added/changed:**
- Handoff helpers (URL, eligibility, artifact→DSL, delivery): `lib/entrata-experts-v2/analytics-handoff.ts`
- Metric dictionary bridge (label → AP slug): `lib/entrata-experts-v2/metric-map.ts`
- Demo flag + dialog host (provider): `lib/analytics-handoff-context.tsx`
- Destination dialog: `components/entrata-experts-v2/chat/send-to-analytics-dialog.tsx`
- Artifact button: `components/entrata-experts-v2/chat/artifact.tsx`
- Command interception + prior-prompt wiring: `components/entrata-experts-v2/chat/chat-view.tsx`, `components/entrata-experts-v2/chat/message-bubble.tsx`
- Demo toggle: `components/app-shell/entrata-top-nav.tsx`
- Provider mount: `app/layout.tsx`
- Artifact types: `lib/entrata-experts-v2/types.ts`
- Answer composition: `lib/entrata-experts-v2/data/answers.ts`, `lib/entrata-experts-v2/store.ts`

**Analytics Platform (`:3001`):**
- Hand-off endpoint: `apps/analytics-platform/src/app/api/agent/dashboard/save/route.ts`
- Generic report save: `apps/analytics-platform/src/app/api/reports/save/route.ts`
- Company Menu API: `apps/analytics-platform/src/app/api/company-menu/route.ts` (+ `assign`)
- Save dialog (UX to mirror): `apps/analytics-platform/src/components/agent-chat/save-dialog.tsx`
- Dashboard DSL: `apps/analytics-platform/src/lib/dashboard-dsl/spec.ts`
- Data model: `apps/analytics-platform/prisma/schema.prisma` (`CustomerReport`, `ReportTemplate`, `ReportFolder`)
- Create/composer entry: `apps/analytics-platform/src/app/create/page.tsx`
- Library / Workspace / Company Menu pages: `/library`, `/workspace`, `/my-reports`

**Out of scope (noting, not doing here):** rebuilding dashboard authoring inside
Analyst; real cross-app SSO; the lens-prompt report-name corrections (separate
task).

---

## Part 10 — Saved Insights → Analytics Platform handoff (contract)

This part extends the handoff to cover the **Saved Insights** library. Entrata
Experts owns the library locally (`localStorage`); the Analytics Platform is
the composition home reached through this handoff. **No Analytics Platform
code changes are made in this Experts-side change set** — this section
documents the contract the platform should implement.

### 10.1 What changed in the handoff payload

`HandoffPayload` (lib/entrata-experts-v2/analytics-handoff.ts) now carries
three additional fields. All are optional → existing callers stay on the
"new dashboard" path with no change in behavior.

| Field | Type | Purpose |
|---|---|---|
| `target` | `"dashboard" \| "packet" \| "existing-dashboard"` | Where the handoff lands. Defaults to `"dashboard"`. |
| `packet` | `{ id: "new" \| string; name?: string }` | Required when `target === "packet"`. `"new"` creates a packet; an existing id PATCHes that packet. |
| `existingDashboardId` | `string` | Required when `target === "existing-dashboard"` (pending AP endpoint). |
| `savedInsight` | `SavedInsightRef` | When set, AP can link back to the source Saved Insight and re-pull it. |

`SavedInsightRef` is the minimal back-link metadata:

```ts
interface SavedInsightRef {
  id: string;          // Local Saved Insight id (unique per browser)
  slug: string;        // URL-safe slug; the `/` command name in chat
  name: string;        // Display name
  prompt: string;      // Captured prompt that re-runs the insight
  lens: string;        // Lens id, so AP can render an icon/chip
  scopeLabel: string;  // e.g. "Whole portfolio"
}
```

### 10.2 Endpoint routing matrix

The Experts client routes by `target`. All requests stay `mode: "no-cors"` +
`text/plain` to remain CORS-safelisted (same constraint as Part 9).

| Target | Method | Endpoint | Used today? |
|---|---|---|---|
| `dashboard` | `POST` | `/api/agent/dashboard/save` | ✅ existing |
| `packet` (new) | `POST` | `/api/packets` | ✅ existing |
| `packet` (existing) | `PATCH` | `/api/packets/[id]` | ✅ existing |
| `existing-dashboard` | — | **pending** | ❌ blocked (see 10.4) |

### 10.3 Body shapes

**`POST /api/agent/dashboard/save`** (unchanged, with optional `savedInsight`):

```json
{
  "name": "Delinquency by aging bucket",
  "tier": "PERSONAL",
  "dashboardSource": "<python source>",
  "sessionId": null,
  "savedInsight": { /* SavedInsightRef, optional */ }
}
```

**`POST /api/packets`** (matches AP's existing `PacketReport[]` shape):

```json
{
  "name": "Delinquency packet",
  "reports": [
    {
      "name": "Delinquency by aging bucket",
      "dashboardSource": "<python source>",
      "savedInsight": { /* SavedInsightRef, optional */ }
    }
  ],
  "savedInsight": { /* SavedInsightRef, optional */ }
}
```

**`PATCH /api/packets/[id]`** appends to an existing packet by sending a new
`reports` array (AP today replaces; a real implementation likely needs an
append-only `addReport` semantic — see 10.4).

### 10.4 One **new** endpoint AP must add

The "Add to existing dashboard" target ships as a **spec only**. AP's current
write endpoints are `no-cors` / opaque, so the client cannot read back a list
of dashboards to pick from. The Experts dialog gates this option off until
AP adds a readable lister:

```
GET /api/dashboards
→ 200 { dashboards: Array<{ id: string; name: string; tier: Tier; updatedAt: string }> }
```

Requirements:
- **CORS-readable** (`Access-Control-Allow-Origin: *` or an allow-list
  including the Entrata Analyst origin). Today's `/api/agent/dashboard/save`
  is `no-cors`; this listing must be true CORS so the Experts dialog can
  render the dropdown.
- Returns the user's accessible dashboards across `PERSONAL`/`TEAM`/`COMPANY`
  with stable ids the client can pass back in `existingDashboardId`.
- Once present, Experts will also send the corresponding write:
  `PATCH /api/dashboards/[id]` with `{ append: { /* dashboard block */ }, savedInsight }`.

Until that endpoint exists, the Experts dialog continues to allow **New
dashboard** and **Packet** targets; **Existing dashboard** stays disabled
with an inline "Coming soon" hint.

### 10.5 What AP should do with `savedInsight`

Treat it as opaque link-back metadata for now:
- Store on the saved dashboard/report/packet entry as `sourceSavedInsight`
  (or equivalent) — useful for "where did this come from?" attribution.
- Optionally show a small "Saved insight: {name}" chip on the rendered
  dashboard so the user knows it's traceable.
- (Future) Provide a "Re-pull from Entrata Analyst" affordance that deep-links
  back to `${ANALYST_URL}/?run=/${slug}` (Experts already routes `/slug`
  commands via the composer slash menu).

### 10.6 Status & follow-ups (Experts side, this change set)

**Shipped (Experts):**
- Target picker (New dashboard / Packet / Existing dashboard) in the handoff
  dialog (`send-to-analytics-dialog.tsx`).
- Packet payload + endpoint routing in `analytics-handoff.ts`.
- Saved Insights library panel under Experts → Library → Saved Insights with
  a "Send to Analytics Platform" action that prefills `savedInsight`.
- `savedInsight` carried through to every handoff destination.

**Pending (AP side):**
- `GET /api/dashboards` readable listing (see 10.4).
- Decide append semantics for `PATCH /api/packets/[id]` (Experts currently
  replaces `reports[]` — AP may want a dedicated `addReport` payload).
- Decide whether to surface `savedInsight` in the AP UI (recommended).
