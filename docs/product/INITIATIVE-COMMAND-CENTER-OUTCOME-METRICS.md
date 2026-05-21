# OXP Studio — Command Center ELI+ Outcome Metrics

## Part 1: JIRA Initiative Description

---

### Initiative: Command Center ELI+ Outcome Metrics

**Initiative Key:** OXP-CC-METRICS
**Product Area:** OXP Studio — Command Center
**Owner:** [PM Owner]
**Target Release:** [TBD]
**Priority:** High
**Labels:** `command-center`, `eli-plus`, `metrics`, `outcome-metrics`, `ai-agents`

---

#### Summary

Deliver the outcome-metrics layer of the Command Center — the default landing page of OXP Studio — so that property management operators can see, at a glance, how ELI+ AI agents are performing and what real-world business outcomes they are driving across the portfolio. This initiative covers the snapshot KPIs ("Today's Snapshot"), the five ELI+ outcome metric cards ("Outcomes Achieved by AI Agents"), the drill-down detail dialogs with property-level filtering, trend analysis, and contextual alerts, and the agent-linked storytelling that connects each metric to the autonomous agent responsible for producing it.

#### Problem Statement

Property management operators today lack a single, authoritative view that answers two questions simultaneously: **"What is my AI workforce actually accomplishing?"** and **"Where should I focus my attention to improve outcomes?"** Without this, operators must manually correlate data across multiple reports, cannot attribute business outcomes to specific AI agents, and miss opportunities to tune agent configurations — leaving value unrealized.

AI in multifamily property management delivers value in two distinct ways: (1) **saving staff time** (labor displaced, capacity increased) and (2) **increasing asset value** (renewals, leases signed, rent collected, work orders resolved). Both must be surfaced so operators see the full picture and can justify, tune, or expand AI coverage based on real outcomes — not guesswork.

#### Business Value

- **Operator confidence:** Gives admins, regional managers, and property managers a clear, data-driven view of AI-driven outcomes — builds trust and accelerates adoption.
- **Revenue visibility:** Surfaces the direct link between ELI+ agents and revenue-impacting metrics (leases, renewals, rent collection), enabling operators to see ROI and "value they're missing" when agents are inactive.
- **Actionable insights:** Contextual alerts and property-level drill-downs turn passive dashboards into action-oriented tools — operators know what to do, not just what happened.
- **Retention and expansion:** Demonstrating measurable value through outcome metrics is the primary lever for customer retention and upsell to additional ELI+ agents.

#### User Stories

**US-1: Today's Snapshot KPIs**
> As an admin or regional manager, I need to see a top-level snapshot of Active Agents and Conversations Handled so I can quickly assess the health and activity of my AI workforce without drilling into individual agents.

**US-2: ELI+ Outcome Metric Cards**
> As an admin, I need to see five outcome metric cards — Tours Scheduled, Leases Signed, Renewals Generated, Work Orders Closed, and Rent Collected — each attributed to its responsible ELI+ agent, so I can understand the real-world business outcomes my AI agents are producing.

**US-3: Trend and Comparison Data**
> As a manager, I need each metric to display week-over-week or month-over-month trend data (directional indicator and comparison text) so I can quickly identify metrics that are improving, stable, or declining.

**US-4: Metric Detail Drill-Down**
> As an admin, I need to click any metric card and see a detail dialog containing summary sub-metrics, an 8-week trend chart, property-level breakdowns, and contextual alerts, so I can diagnose what is driving a metric and take action at the property level.

**US-5: Property-Level Filtering**
> As a property or regional manager, I need to filter metric detail views by individual property so I can compare performance across properties and focus on underperformers.

**US-6: Contextual Alerts and Recommendations**
> As an admin, I need the metric detail view to surface contextual alerts when a metric is underperforming (e.g., "Tour bookings dipped this week — lead response time at Property C increased"), with actionable recommendations and links to the relevant configuration surface, so I can remediate issues without additional investigation.

**US-7: Disabled-Agent Awareness**
> As an admin, when an ELI+ agent mapped to an outcome metric is inactive (status = "Off"), I need the outcome card to show an "Enable [Agent]" call-to-action instead of the metric value, so I am aware of unrealized value and can activate the agent directly.

**US-8: Agent Impact Storytelling**
> As an operator, I need each outcome card to include a value-proposition caption (e.g., "Clients with Leasing AI see 2x more tour bookings") so I can contextualize the metric against industry benchmarks and understand the agent's value contribution.

#### Scope

**In scope:**

| Area | Description |
|------|-------------|
| **Today's Snapshot** | 2 top-level KPI cards: Active Agents (live count from Agent Roster), Conversations Handled (aggregate across all agents). Trend captions with directional indicators. |
| **Outcomes Achieved by AI Agents** | 5 outcome metric cards, each mapped to an ELI+ autonomous agent: Tours Scheduled (Leasing AI), Leases Signed (Leasing AI), Renewals Generated (Renewal AI), Work Orders Closed (Maintenance AI), Rent Collected (Payments AI). |
| **Metric Detail Dialog** | Full-screen modal per metric containing: description, summary sub-cards (3–4 per metric), 8-week trend area chart, property-level breakdown grid, property filter (All / per-property), contextual alert with actionable CTA, breakdown by agent and by channel (where applicable). |
| **Trend Data** | Week-over-week and month-over-month comparison captions on each card. Positive/negative/neutral color-coded indicators. |
| **Agent Linkage** | Each outcome card references its responsible ELI+ agent. Disabled-agent state replaces the metric with an activation CTA. |
| **Role-Based Visibility** | Admin and regional roles see all metrics. Property managers see a reduced set (no Today's Snapshot, no outcome cards). IC role sees a separate personal-queue KPI strip. |
| **Contextual Alerts** | Alert banners within metric detail dialogs for underperforming metrics (e.g., Tours dipping, Rent Collection slipping) with property-specific context and links to remediation. |
| **"Updated just now" Freshness** | Timestamp indicating when metrics were last refreshed. |

**Out of scope (this initiative):**

| Area | Reason |
|------|--------|
| Performance page analytics | Covered by separate Performance initiative |
| Agent Roster configuration | Covered by Agent Roster initiative |
| Live Conversations panel | Covered by Communications initiative |
| Escalations / Needs Attention panel | Covered by Escalations initiative |
| Workforce / Your Team section | Covered by Workforce initiative |
| "Value You're Missing" banner | May be separate initiative or folded in later |
| Date range selector | Not in current scope; future enhancement |
| Custom KPI builder | Future enhancement |

#### Metrics (Success Criteria)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Metric card click-through rate | > 40% of active admin sessions | Analytics: clicks on outcome cards / sessions |
| Time-to-action on underperforming metric | < 3 min from landing on Command Center | User research / prototype testing |
| Agent activation from disabled-card CTA | > 15% conversion | Analytics: "Enable [Agent]" clicks → agent activated |
| Property drill-down usage | > 25% of metric detail views use property filter | Analytics: property filter selections |
| Operator confidence in AI ROI (survey) | > 4.0 / 5.0 | Post-launch survey |

#### Dependencies

| Dependency | Owner | Status |
|------------|-------|--------|
| Agent Roster data (agent status, active count) | Agent Roster team | Required — live `agentsEnabledCount` |
| Entrata data layer (conversations, leasing, maintenance, payments, renewals) | Platform / Data team | Required — outcome metric values must be sourced from Entrata data or intermediate analytics layer |
| ELI+ agent attribution model | AI / Data Science | Required — attributing outcomes to specific agents |
| MetricDetailDialog component | Frontend / Design System | Exists in prototype — needs production hardening |
| StatCard component | Frontend / Design System | Exists in prototype — needs production hardening |

#### Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Outcome metric attribution accuracy | High — operators lose trust if numbers don't match Entrata source | Validate attribution model with real data before launch; show data source provenance |
| Data latency | Medium — stale metrics undermine urgency | Show "Updated X min ago" freshness stamp; define refresh SLA |
| Role-based gating complexity | Medium — wrong metrics shown to wrong role | Comprehensive role matrix and E2E tests per role |
| Property-level data availability | Medium — not all properties may have sufficient data | Graceful "no data" states; minimum data threshold for metric display |

#### Epics Breakdown

| Epic | Scope |
|------|-------|
| **Epic 1: Snapshot KPIs** | Active Agents + Conversations Handled cards with live data, trend captions, click-to-detail |
| **Epic 2: Outcome Metric Cards** | 5 cards with values, trends, agent attribution, disabled-agent state, value-prop captions |
| **Epic 3: Metric Detail Dialog** | Reusable dialog with summary cards, chart, property filter, breakdowns, alerts |
| **Epic 4: Data Integration** | Connect metrics to Entrata data layer / analytics; agent attribution; refresh mechanism |
| **Epic 5: Role-Based Visibility** | Admin/regional/property/IC conditional rendering and data scoping |
| **Epic 6: Contextual Alerts** | Alert engine for underperforming metrics; property-specific alert targeting; CTA routing |

---
---

## Part 2: Initiative Essentials Document (IED)

---

### Initiative Essentials: Command Center ELI+ Outcome Metrics

**Document Version:** 1.0
**Last Updated:** May 2026
**Author:** [PM Owner]
**Stakeholders:** Product, Engineering, Design, Data Science, Customer Success

---

### 1. Executive Summary

The Command Center is the default landing page of OXP Studio — the centralized platform where multifamily property management companies configure, operate, and govern a blended human-AI workforce. The **ELI+ Outcome Metrics** initiative delivers the metrics layer of this dashboard: a set of snapshot KPIs and outcome metric cards that surface the real-world business results achieved by ELI+ autonomous AI agents (Leasing AI, Renewal AI, Maintenance AI, Payments AI).

This is not a reporting dashboard. It is an **action-oriented operations console** that answers two questions every time an operator opens OXP Studio:
1. **"What is my AI workforce accomplishing?"** — outcome metrics tied to specific agents
2. **"Where should I focus to improve?"** — contextual alerts, property-level drill-downs, and actionable recommendations

The initiative is strategically critical because it is the primary surface through which operators perceive and evaluate the value of ELI+ agents — making it the key driver of adoption, retention, and expansion.

---

### 2. Problem & Opportunity

#### The Problem

Property management operators are under constant pressure to do more with less. Labor represents 30–50% of controllable expenses, and the industry is centralizing aggressively (units per employee ratios rising from 35 to 77+ depending on market). When AI agents are deployed, operators have no unified view of what those agents are actually accomplishing in business terms. They cannot:

- See at a glance whether AI agents are driving tours, leases, renewals, collections, or work order resolution
- Attribute specific business outcomes to specific AI agents
- Identify underperforming properties or agents quickly enough to intervene
- Justify AI investment to asset managers or leadership with concrete outcome data
- Know whether an inactive agent represents missed value

#### The Opportunity

By delivering outcome metrics directly on the Command Center landing page — the first thing operators see when they open OXP Studio — we can:

- **Make AI value undeniable:** Every login reinforces the connection between ELI+ agents and business results
- **Drive proactive action:** Contextual alerts surface problems before they compound (e.g., "Collections dipping at Property C — 3 accounts need review")
- **Accelerate adoption:** "Enable [Agent]" CTAs on disabled-agent cards create a natural path from awareness to activation
- **Enable data-driven staffing decisions:** Operators can see AI contribution alongside traditional metrics to optimize the human-AI workforce mix

---

### 3. Goals & Success Criteria

| Goal | How We Measure | Target |
|------|----------------|--------|
| Operators understand AI value within 30 seconds of login | Usability testing: can user identify top-performing and underperforming metrics in < 30s | 80% of test participants |
| Operators take action on underperforming metrics | Click-through rate on metric cards and alert CTAs | > 40% of admin sessions |
| Operators activate idle agents from Command Center | Conversion rate on "Enable [Agent]" CTA | > 15% |
| Operators drill down to property-level data | Property filter usage within Metric Detail Dialogs | > 25% of detail views |
| Operators report confidence in AI ROI | Post-launch NPS-style survey question | > 4.0 / 5.0 |
| Reduced time to diagnose a declining metric | Time from Command Center landing to identifying root cause | < 3 minutes |

---

### 4. User Personas & Roles

| Persona | Role in OXP Studio | Metrics Visibility |
|---------|--------------------|--------------------|
| **Portfolio Admin** | Full platform access. Manages multiple properties and the entire AI workforce. | Full: Snapshot KPIs + all 5 outcome cards + detail dialogs with all properties |
| **Regional Manager** | Manages a subset of properties. Limited configure access. | Full: Same as admin, scoped to their properties |
| **Property Manager** | Single-property focus. Operational, not strategic. | Reduced: No Today's Snapshot or Outcome cards (sees escalations, conversations, team) |
| **Individual Contributor (IC)** | Site-level staff handling escalations. | Separate view: Personal KPI strip (Open Items, Resolved, Response Time, Resolution Rate) |

---

### 5. Detailed Functional Specification

#### 5.1 Today's Snapshot (Top KPIs)

Two large KPI cards displayed at the top of the Command Center for admin and regional roles:

**Active Agents**
- **Value:** Live count of AI agents with `status === "Active"` (sourced from Agent Roster / AgentsProvider)
- **Trend:** Week-over-week delta caption (e.g., "+1 since last week")
- **Icon:** ELI cube (brand icon for AI agents)
- **Click action:** Opens Metric Detail Dialog showing all active agents, grouped by function, with per-agent conversation count, resolution rate, and revenue impact
- **Detail view:** Summary cards (Total Active, Total Conversations, Avg Resolution Rate), scrollable agent list with status badges, property filter

**Conversations Handled**
- **Value:** Aggregate conversation count across all active AI agents (all channels: chat, SMS, voice, portal)
- **Trend:** Percentage change from last week (e.g., "+12% from last week")
- **Icon:** Message square
- **Click action:** Opens Metric Detail Dialog
- **Detail view:** Summary cards (Total Conversations, Avg Resolution Time, Satisfaction Score, Escalation Rate), 8-week volume trend chart, breakdowns by agent and by channel, property filter

#### 5.2 Outcomes Achieved by AI Agents

Five outcome metric cards displayed in a row below the snapshot, under the section heading "OUTCOMES ACHIEVED BY AI AGENTS":

| Metric | Responsible Agent | Key Sub-Metrics (Detail Dialog) | Alert Conditions |
|--------|-------------------|--------------------------------|------------------|
| **Tours Scheduled** | Leasing AI | Total Tours, Show Rate, Tour-to-Lease conversion, Avg Booking Time (2.3 min vs 18 min manual) | Tours dipping: alerts when lead response time increases at a property, suggests reviewing Leasing AI settings |
| **Leases Signed** | Leasing AI | Total Leases, Avg Days to Sign (3.2 days vs 8.5 days manual), Conversion Rate, Avg Lease Value | N/A in initial scope |
| **Renewals Generated** | Renewal AI | Total Renewals, Retention Rate, Avg Rent Increase per renewal, Revenue Retained (annual value) | N/A in initial scope |
| **Work Orders Closed** | Maintenance AI | Total Closed, Avg Resolution Time (4.1 hrs vs 12 hrs manual), First-Contact Fix Rate, Resident Satisfaction | N/A in initial scope |
| **Rent Collected** | Payments AI | Total Collected, Collection Rate, Outstanding amount + account count, Avg Days to Pay (4.2 days vs 7.8 days pre-AI) | Collection rate declining: alerts on properties with accounts past 15 days; suggests reviewing outstanding accounts and payment settings |

**Each card displays:**
- Metric label
- Primary value (large, bold — the most prominent element)
- Trend caption with directional coloring: green for positive, amber for negative, neutral for informational
- Category icon (top-right)
- Value-proposition caption (footer text, e.g., "Clients with Leasing AI see 2x more tour bookings")

**Disabled-agent behavior:**
When the ELI+ agent mapped to an outcome card has `status === "Off"`, the card transforms into a branded activation card:
- ELI branding replaces the metric value
- "Enable [Agent Name]" CTA replaces the value display
- Clicking navigates to the Agent Roster for activation

#### 5.3 Metric Detail Dialog

A reusable modal component (`MetricDetailDialog`) that opens when any metric card is clicked. Structure:

1. **Header:** Metric icon + title + description text
2. **Property Filter:** Dropdown — All Properties, [Property A], [Property B], [Property C]... Selecting a property re-renders all content below to show property-specific data.
3. **Contextual Alert (conditional):** Amber-tinted banner with:
   - Insight description (non-alarming, helpful tone: "We've noticed an area where there may be room for improvement...")
   - Specific diagnosis (e.g., "Lead response time at Property C has increased to 8 minutes")
   - One or more action buttons linking to the relevant configuration surface
4. **Summary Cards (3–4):** Key sub-metrics for this metric, each showing: label, value, comparison subtext with positive/negative/neutral coloring
5. **Trend Chart:** 8-week area chart (Recharts) showing the metric's trajectory. Supports value prefix (e.g., "$"), semantic coloring (positive/warning/neutral), and property-level scaling via `chartMultiplier`.
6. **Breakdowns:** One or more breakdown sections in either "side-by-side" or "stacked" layout:
   - **List breakdown:** Ranked items (e.g., "By Agent" or "By Channel") with name, detail, value, percentage, trend
   - **Agent list:** All active agents with per-agent metrics and status badges
   - **Property grid:** Per-property cards showing key stats, with optional highlight callout for underperformers

**Property override system:** Each metric config supports per-property overrides for summary cards, chart multipliers, and alert presence/absence — enabling targeted, property-specific storytelling within the same dialog.

#### 5.4 Trend Data Model

Each metric card supports two trend display modes:
- **Percentage trend:** Numeric `trend` value (e.g., `12`) with configurable `trendFootnote` (e.g., "since last week"). Rendered as "+12% since last week" with green/amber coloring.
- **Caption trend:** Free-text `trendCaption` (e.g., "−6 since last week", "92% retention rate"). The component infers positive/negative from the leading character (+/−) and applies coloring.

Default comparison period: **week-over-week** for operational metrics, **month-over-month** for financial metrics (Rent Collected). The detail dialog includes **quarter-over-quarter** comparisons for sub-metrics like Avg Lease Value and Retention Rate.

#### 5.5 Agent CTA Flyout

When an outcome card's agent name is clicked (or via the "Your Team — Autonomous Agents" section), a flyout panel opens with:
- Agent title and description
- Capability list (4 bullet points per agent)
- Impact metrics with industry benchmark data (e.g., "49% reduction in cancelled applications", "99% conversations handled autonomously")

This reinforces the value narrative and connects the outcome metric to the agent's full capability story.

#### 5.6 Role-Based Conditional Rendering

| Element | Admin | Regional | Property Manager | IC |
|---------|-------|----------|------------------|----|
| Today's Snapshot (Active Agents, Conversations Handled) | Visible | Hidden | Hidden | Hidden |
| Outcomes Achieved by AI Agents (5 cards) | Visible | Hidden | Hidden | Hidden |
| IC personal KPI strip | Hidden | Hidden | Hidden | Visible |
| Metric Detail Dialog | Accessible | Accessible | N/A | N/A |
| "Value You're Missing" Banner | Visible | Hidden | Hidden | Hidden |

*Note: Regional/property visibility for outcome metrics is gated by `isManagerRole` in the current prototype. Production implementation should refine this based on organizational hierarchy.*

---

### 6. Data Architecture

#### 6.1 Data Sources

| Metric | Source | Refresh Cadence |
|--------|--------|-----------------|
| Active Agents | AgentsProvider (client state synced with Agent Roster) | Real-time (state change) |
| Conversations Handled | Entrata data layer / conversation analytics | [TBD — target: 15-min refresh] |
| Tours Scheduled | Entrata leasing module / Leasing AI event log | [TBD — target: 15-min refresh] |
| Leases Signed | Entrata leasing module | [TBD — target: hourly] |
| Renewals Generated | Entrata renewals module / Renewal AI event log | [TBD — target: hourly] |
| Work Orders Closed | Entrata maintenance module / Maintenance AI event log | [TBD — target: 15-min refresh] |
| Rent Collected | Entrata payments module | [TBD — target: daily] |

#### 6.2 Agent Attribution Model

Each outcome must be attributable to the specific ELI+ agent that produced it. Attribution logic:
- **Direct attribution:** The AI agent initiated and completed the action (e.g., Leasing AI booked a tour, Payments AI sent a reminder that resulted in payment)
- **Assisted attribution:** The AI agent was involved in the conversation flow that led to the outcome (e.g., Leasing AI answered questions that led to a self-scheduled tour)
- **Scope:** Attribution is per-property, per-agent, enabling the property-level drill-down

#### 6.3 Comparison Period Calculation

- **Week-over-week:** Current rolling 7 days vs prior rolling 7 days
- **Month-over-month:** Current calendar month vs prior calendar month
- **Quarter-over-quarter:** Current rolling 90 days vs prior rolling 90 days
- **8-week trend:** Rolling 8-week window for trend chart data points

---

### 7. Design Specifications

#### 7.1 Layout

- **Snapshot KPIs:** 2-column row (equal width at desktop; stack to single column on mobile)
- **Outcome cards:** 5-column row at desktop (stack to 2-column + 1 at tablet; single column on mobile)
- **Section heading:** All-caps tracking label "OUTCOMES ACHIEVED BY AI AGENTS"
- **Card dimensions:** Consistent card chrome across snapshot and outcome cards (border, padding, icon position)

#### 7.2 Card Hierarchy (from design critique)

The metric **value** (e.g., "124", "$218K") must be the **largest, heaviest** element in each card. The trend caption is secondary — smaller, lighter weight, colored for direction. This inverts the current prototype hierarchy where the trend dominates the value.

Recommended hierarchy:
1. **Label** — small, muted (top)
2. **Value** — large, bold, primary (center)
3. **Trend** — small, colored, with directional glyph ▲/▼ (bottom)

#### 7.3 Accessibility Requirements

- All section headings ("Outcomes Achieved by AI Agents", etc.) must be semantic `<h2>` / `<h3>` elements
- Trend direction must not rely solely on color — include ▲/▼ glyphs alongside +/−
- All interactive cards must have visible focus states and `aria-label` descriptions
- Metric Detail Dialog must trap focus and support keyboard navigation
- Chart must have an accessible text alternative (summary table or `aria-label` describing the trend)

#### 7.4 Color Semantics

| Semantic | Usage | Color |
|----------|-------|-------|
| Positive | Metric improving, good trend | Green (`text-green-600`) |
| Negative / Warning | Metric declining, needs attention | Amber (`text-amber-600`) |
| Neutral | Informational, no directional signal | Muted gray (`text-muted-foreground`) |

---

### 8. Technical Architecture

#### 8.1 Component Map

| Component | Path | Responsibility |
|-----------|------|----------------|
| `AdminCommandCenter` | `app/command-center/page.tsx` | Orchestrates snapshot KPIs, outcome cards, metric details, role gating |
| `StatCard` | `components/ui/stat-card.tsx` | Reusable KPI tile — supports trend %, caption, icon, click handler, `statType` color |
| `MetricDetailDialog` | `components/metric-detail-dialog.tsx` | Full drill-down modal: summary cards, chart, property filter, breakdowns, alerts |
| `AgentsProvider` | `lib/agents-context.tsx` | Agent state (status, counts, metrics); provides `agentsEnabledCount` |
| `STAT_TYPE_COLORS` | `lib/icon-avatar-colors.ts` | Maps `statType` → icon tint color for outcome cards |

#### 8.2 State Management

- **Metrics data:** Currently inline mock data in `page.tsx`. Production: move to API-backed state (React Query or server components) with a `MetricsProvider` context.
- **Active metric selection:** `useState<string | null>` — the label of the clicked metric card drives which `MetricDetailConfig` the dialog renders.
- **Property filter:** Local state within `MetricDetailDialog` — resets to "All Properties" when the metric changes.
- **Agent status:** Sourced from `useAgents()` — determines whether outcome cards show metrics or disabled-agent CTAs.

#### 8.3 Type System

```typescript
type TopKpi = {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color?: IconAvatarColor;
  trend?: number;           // percentage trend (e.g., 12 → "+12%")
  trendCaption?: string;    // free-text trend (e.g., "−6 since last week")
  trendFootnote?: string;   // suffix for percentage trend (e.g., "since last week")
};

type OutcomeCard = TopKpi & {
  agentName?: string;       // ELI+ agent responsible for this outcome
  ctaText: string;          // value-proposition caption
  statType?: string;        // maps to icon color via STAT_TYPE_COLORS
};

type MetricDetailConfig = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  summaryCards: SummaryCardData[];
  alert?: AlertData;
  chart?: ChartData;
  breakdownLayout?: "side-by-side" | "stacked";
  breakdowns: BreakdownSection[];
  byProperty?: Record<string, PropertyOverride>;
};
```

---

### 9. Metric Detail Configurations (Per Outcome)

#### 9.1 Tours Scheduled (Leasing AI)

| Sub-Metric | Example Value | Comparison |
|------------|---------------|------------|
| Total Tours | 124 | −6 from last week |
| Show Rate | 78% | +5% from last month |
| Tour-to-Lease Conversion | 34% | +3% from last month |
| Avg Booking Time | 2.3 min | vs 18 min manual |

**Alert trigger:** Tour bookings decline week-over-week. Alert identifies the property with the largest decline and suggests reviewing Leasing AI settings and lead source routing.

**Property breakdown:** Grid with Tours, Show Rate, and Conversion per property. Underperforming properties highlighted with "Room to improve" callout.

#### 9.2 Leases Signed (Leasing AI)

| Sub-Metric | Example Value | Comparison |
|------------|---------------|------------|
| Total Leases | 37 | +5 from last week |
| Avg Days to Sign | 3.2 days | vs 8.5 days manual |
| Conversion Rate | 34% | +2% from last month |
| Avg Lease Value | $1,450/mo | +$35 from last quarter |

**Property breakdown:** Grid with Leases, Avg Rent, and Conversion per property.

#### 9.3 Renewals Generated (Renewal AI)

| Sub-Metric | Example Value | Comparison |
|------------|---------------|------------|
| Total Renewals | 28 | This period |
| Retention Rate | 92% | +3% from last quarter |
| Avg Rent Increase | $289/mo | Per renewed lease |
| Revenue Retained | $162K | Annual value of renewed leases |

**Property breakdown:** Grid with Renewals, Retention Rate, and Avg Increase per property.

#### 9.4 Work Orders Closed (Maintenance AI)

| Sub-Metric | Example Value | Comparison |
|------------|---------------|------------|
| Total Closed | 156 | +8 from last week |
| Avg Resolution Time | 4.1 hrs | vs 12 hrs manual |
| First-Contact Fix Rate | 68% | +4% from last month |
| Resident Satisfaction | 4.7/5 | +0.3 from last quarter |

**Property breakdown:** Grid with Closed count, Avg Time, and Satisfaction per property.

#### 9.5 Rent Collected (Payments AI)

| Sub-Metric | Example Value | Comparison |
|------------|---------------|------------|
| Total Collected | $218K | This period |
| Collection Rate | 90.6% | Down 1.2% from last month |
| Outstanding | $23K | Across 12 accounts |
| Avg Days to Pay | 4.2 days | vs 7.8 days pre-AI |

**Alert trigger:** Collection rate declines month-over-month. Alert identifies properties with accounts past 15 days and suggests reviewing outstanding accounts and payment settings. Provides two CTAs: "Review Outstanding" (→ Escalations) and "View Payment Settings" (→ Agent Roster).

**Property breakdown:** Grid with Collected amount, Collection Rate, and Outstanding per property. Underperforming properties highlighted.

---

### 10. ELI+ Agent Impact Data (Value Proposition)

Each ELI+ agent has associated benchmark/impact data used in the agent CTA flyout and outcome card captions:

**Leasing AI**
- 49% reduction in cancelled applications
- 38% increase in applications by early adopters
- 99% conversations handled autonomously
- Card caption: "Clients with Leasing AI see 2x more tour bookings" / "convert 30% more leads to signed leases"

**Renewal AI**
- 10% increase in renewal conversion rates
- 24 days earlier renewals signed on average
- 80% reduction in manual renewal management
- Card caption: "Clients with Renewal AI achieve 15% higher retention rates"

**Maintenance AI**
- 10% faster work order resolution time
- 58% improvement in work order resolutions by early adopters
- Card caption: "Clients with Maintenance AI see 15% faster work order resolution time"

**Payments AI**
- 7.5% increase in on-time rent payments (portfolio-wide)
- 40% increase in portfolio-wide collections for adopters
- Card caption: "Clients with Payments AI collect rent 20% faster"

---

### 11. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | What is the refresh cadence for each metric (real-time, 15-min, hourly, daily)? | Engineering / Data | Open |
| 2 | Should regional/property managers see outcome cards (currently gated off)? | Product | Open |
| 3 | How are AI-attributed outcomes defined vs. total outcomes (e.g., AI-booked tours vs. all tours)? | Data Science | Open |
| 4 | Should the metric detail dialog support date range selection beyond the fixed 8-week window? | Product / Design | Open |
| 5 | What is the minimum data threshold before a metric card is displayed (avoid misleading small-sample metrics)? | Data Science | Open |
| 6 | Should outcome cards link to Performance page in addition to opening the detail dialog? | Product / Design | Open |
| 7 | How should the "Conversations Handled" metric handle multi-agent conversations (conversation touches multiple agents)? | Data Science | Open |

---

### 12. Milestones & Phasing

| Phase | Scope | Target |
|-------|-------|--------|
| **Phase 1: Static Metrics** | Outcome cards with values sourced from Entrata (or intermediate analytics). Trend captions computed from period comparisons. StatCard and MetricDetailDialog components production-ready. | [TBD] |
| **Phase 2: Live Data + Drill-Down** | Real-time (or near-real-time) data refresh. Property filter operational against real property data. 8-week trend charts populated from time-series data. | [TBD] |
| **Phase 3: Contextual Alerts** | Alert engine evaluating metric thresholds. Property-specific alert targeting. Actionable CTA routing to correct configuration surface. | [TBD] |
| **Phase 4: Agent Attribution** | Attribution model live — outcomes tied to specific agent actions/conversations. "Value You're Missing" calculation for inactive agents. | [TBD] |

---

### 13. References

| Document | Path |
|----------|------|
| JIRA Initiatives and Epics | `docs/product/JIRA-INITIATIVES-AND-EPICS.md` |
| App Pages and Goals | `docs/product/APP-PAGES-AND-GOALS.md` |
| Metrics, Staffing & AI Value Research | `docs/research/METRICS-STAFFING-AI-VALUE.md` |
| TDD Architecture (§4.11, §4.12) | `docs/architecture/TDD-ARCHITECTURE.md` |
| Command Center Design Critique | `design-audits/single-page/command-center-05042026.md` |
| Command Center Prototype | `app/command-center/page.tsx` |
| MetricDetailDialog Component | `components/metric-detail-dialog.tsx` |
| StatCard Component | `components/ui/stat-card.tsx` |
| Agents Context | `lib/agents-context.tsx` |

---

*Last updated: May 2026. Source: OXP Studio prototype (`app/command-center/page.tsx`), product docs, design audits, and metrics research.*
