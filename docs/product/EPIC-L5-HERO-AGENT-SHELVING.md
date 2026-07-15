# OXP Studio — L5 Autonomous Lead To Lease: Hero Banner & Agent Shelving

## Part 1: JIRA Epic Description

---

### Epic: L5 Hero Agent Banner & Lead To Lease Agent Shelving

**Epic Key:** OXP-AR-L5-SHELVING
**Product Area:** OXP Studio — Agent Roster
**Owner:** [PM Owner]
**Target Release:** [TBD]
**Priority:** High
**Labels:** `agent-roster`, `l5-agent`, `lead-to-lease`, `hero-banner`, `platform-shelving`, `oxp-studio-web`
**Team:** OXP Studio Web (Platform)

---

#### Summary

Build the platform-level UI shelving in the Agent Roster for the L5 "Autonomous Lead To Lease" agent — the first and only L5-tier agent in the system. This includes the hero banner component that promotes the L5 agent above the standard agent card grid, the dedicated full-page shell at `/agent-roster/autonomous-leasing-plus` that hosts the agent's configuration experience, the activation dialog, and all routing/navigation infrastructure. The OXP Studio Web platform team owns the container; the Online Applications team owns all functional content rendered inside the agent's detail page.

#### Context: What Is the Autonomous Lead To Lease Agent?

The **Autonomous Lead To Lease** agent is a unified leasing intelligence system — an L5 (fully autonomous) orchestrator that coordinates the entire prospect-to-resident journey through four pipeline stages:

| Stage | Name | What It Does |
|-------|------|-------------|
| 1 | **Guest Cards** | Lead capture, qualification, tour booking, reminders, nurture |
| 2 | **Applications** | Availability check, application intake, co-applicant coordination, fees & payment |
| 3 | **Screening** | Background & credit screening, income verification, conditional approval |
| 4 | **Lease Execution** | Lease generation, signing ceremony, move-in readiness |

Under the hood, the orchestrator coordinates **15 L3 sub-agents** (one per "job to be done" above) and **8 L4 ELI+ conversational agents** (two per stage handling resident-facing conversations). Each sub-agent has its own configuration — autonomy settings, policy rules, and per-property overrides across 11+ properties.

**Why L5 is different from other agents:**
- **L1–L4 agents** are individual, single-purpose agents displayed as standard cards in the Agent Roster grid. They open in side sheets or dialogs.
- **The L5 agent** is a multi-agent orchestrator that manages an entire business process end-to-end. It requires a dedicated full-page experience (not a sheet) and is visually elevated in the roster via a hero banner to communicate its scope and strategic importance.

**This epic is about the shell, not the engine.** The Online Applications team will build all stage configuration, sub-agent settings, autonomy controls, per-property overrides, and orchestrator logic inside the L5 detail page. The OXP Platform team needs to build the shelf it sits on — the hero banner in the roster, the page frame, the activation flow, and the routing infrastructure.

#### Problem Statement

The Agent Roster currently treats all agents uniformly — flat cards in a grid. The L5 Autonomous Lead To Lease agent is fundamentally different: it is an orchestrator managing 23 sub-agents across 4 pipeline stages with per-property configuration. Without dedicated platform shelving, the L5 agent would either be buried in the grid (misrepresenting its scope) or require ad-hoc UI workarounds that don't scale to future L5 agents. The platform needs a first-class L5 hero pattern and a dedicated page shell that the Online Applications team can build inside.

#### Business Value

- **Elevates the flagship agent:** The hero banner gives the L5 agent the visual prominence it deserves as the most capable and strategically important agent in the roster, driving awareness and adoption.
- **Unlocks Online Applications delivery:** The Online Applications team is blocked on building the L5 agent's configuration experience until the platform shelving (page shell, routing, activation dialog) exists. This epic unblocks that parallel workstream.
- **Establishes the L5 pattern:** This is the first L5 agent but not the last. Building a reusable hero banner pattern and full-page agent shell creates a scalable foundation for future L5 orchestrators (e.g., Autonomous Maintenance, Autonomous Renewals).
- **Drives ELI+ adoption:** The hero banner prominently surfaces the L5 agent's activation state, coverage metrics, and stage counts — creating a natural on-ramp from awareness to activation that drives ELI+ upsell.

#### User Stories

**US-1: L5 Hero Banner in Agent Roster**
> As an admin browsing the Agent Roster, I need the L5 Autonomous Lead To Lease agent to appear as a prominent hero banner above the standard agent card grid, so I can immediately see the flagship orchestrator agent, its status, and a summary of its scope — without it being lost among 100+ individual agent cards.

**US-2: Hero Banner — Active State**
> As an admin with the L5 agent activated, I need the hero banner to show the agent's name, L5 level badge, "Active" status, a brief description, stage count ("4 Stages"), sub-agent count ("15 L3 + 8 L4 agents"), and a coverage indicator, so I can assess the orchestrator's scope and navigate into its configuration.

**US-3: Hero Banner — Paused/Inactive State**
> As an admin whose L5 agent is paused or inactive, I need the hero banner to reflect the inactive state with appropriate visual treatment (e.g., muted styling, "Paused" badge) and provide a clear path to reactivation, so I understand the agent is not running and can take action.

**US-4: L5 Agent Detail Page Shell**
> As an admin, when I click the hero banner, I need to navigate to a dedicated full-page experience at `/agent-roster/autonomous-leasing-plus` with a back link to the Agent Roster and a content area where the Online Applications team's L5 configuration UI renders, so I can configure the orchestrator in a purpose-built layout — not a cramped side sheet.

**US-5: L5 Activation Dialog**
> As an admin viewing the hero banner when the L5 agent is inactive, I need an activation dialog that presents the value proposition of the Autonomous Lead To Lease agent (capabilities, impact metrics, stages) and provides a clear "Activate" action, so I can understand the agent's value and enable it in one step.

**US-6: Deep Link Support**
> As an admin arriving via a deep link (`?agent=32`), I need the Agent Roster to detect that this is the L5 agent and route me appropriately — to the detail page if active, or to the activation dialog if inactive — so that links from Command Center, notifications, or external systems resolve correctly.

**US-7: Filter Interaction**
> As an admin using Agent Roster filters (subcategory, level, status), I need the hero banner to respect active filters — hiding when the L5 agent doesn't match the filter criteria — so the hero doesn't persist when I'm searching for something specific.

#### Scope

**In scope (OXP Studio Web platform team):**

| Area | Description |
|------|-------------|
| **Hero banner component** | Full-width banner above the agent card grid. Renders L5 agent name, icon, level badge, status badge, description, stage count, sub-agent count, and coverage summary. Supports active and paused visual states. |
| **Hero banner click routing** | Active → navigate to `/agent-roster/autonomous-leasing-plus`. Inactive → open activation dialog. |
| **L5 detail page shell** | Page at `/agent-roster/autonomous-leasing-plus` with back navigation to `/agent-roster`, page header area, and a content slot/container where the Online Applications team renders their configuration UI. |
| **Activation dialog** | Modal dialog presenting L5 agent value proposition, capability summary, impact metrics, and "Activate" CTA. On activate: update agent status, navigate to detail page. |
| **Deep link routing** | Handle `?agent=<l5-agent-id>` in the Agent Roster page and route to the correct destination (detail page or activation dialog). |
| **Filter integration** | Ensure the hero banner respects sidebar filters (subcategory, level, status) and search — hiding when the L5 agent doesn't match. |
| **Coverage summary display** | Render a coverage bar or indicator on the hero banner sourced from data provided by the Online Applications team (the platform team renders it; the OA team computes it). |
| **L5 hero pattern (reusable)** | Build the hero banner in a way that can be reused for future L5 agents without one-off code per orchestrator. |

**Out of scope (owned by Online Applications team):**

| Area | Reason |
|------|--------|
| Stage configuration (Guest Cards, Applications, Screening, Lease Execution) | Core L5 agent functionality — Online Applications team |
| L3 sub-agent settings (15 sub-agents with policies, autonomy pickers) | Internal agent logic — Online Applications team |
| L4 ELI+ conversational agent settings (8 agents) | Internal agent logic — Online Applications team |
| Per-property autonomy overrides and coverage computation | Business logic — Online Applications team |
| Orchestrator pause/resume logic (beyond status toggle) | Orchestrator behavior — Online Applications team |
| Pipeline visualization and stage progress | L5 internal UI — Online Applications team |
| Autonomy rollup calculations | Business logic — Online Applications team (exposes data for platform to render) |

#### Acceptance Criteria

1. **Hero banner renders** above the agent card grid when the L5 agent exists and matches active filters.
2. **Hero banner is excluded from the grid** — the L5 agent does not also appear as a standard card.
3. **Active state** shows purple/branded styling, "Active" badge, L5 level badge, and an arrow CTA.
4. **Paused state** shows muted/amber styling, "Paused" badge, and an activation prompt.
5. **Clicking the active hero** navigates to `/agent-roster/autonomous-leasing-plus`.
6. **Clicking the paused hero** opens the activation dialog.
7. **Detail page shell** renders at `/agent-roster/autonomous-leasing-plus` with a back link and a content area.
8. **The Online Applications team's `LeadToLeaseSettings` component** (or equivalent) renders inside the content area.
9. **Activation dialog** shows value prop content and an "Activate" button that toggles agent status and navigates to the detail page.
10. **Deep link** (`?agent=<l5-id>`) routes correctly to detail page or activation dialog.
11. **Filters** hide the hero when the L5 agent doesn't match (e.g., filtering by "L4" level hides the hero).
12. **Search** includes the L5 agent in search matching (name, description, labels).
13. **Coverage bar** on the hero displays data from the Online Applications team's coverage API/computation.
14. **The hero pattern is generalizable** — adding a second L5 agent in the future should not require structural changes to the hero component.

#### Dependencies

| Dependency | Owner | Status |
|------------|-------|--------|
| Agent data model: `type === "fully_autonomous"` | Agent Roster / Platform | Exists — defined in `AGENT_TYPES` |
| L5 agent seed/configuration data | Online Applications team | Required — agent metadata (name, description, stages, sub-agent counts) |
| `LeadToLeaseSettings` component (or production equivalent) | Online Applications team | Required — the content that renders inside the page shell |
| Coverage data API / computation | Online Applications team | Required — the platform renders coverage; OA computes it |
| Agent Roster filter infrastructure | Platform | Exists — sidebar filters already operational |
| Agent status management (`updateAgent`) | Platform | Exists — `AgentsProvider` context |

#### Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Online Applications team delivery timeline misaligned | Medium — empty page shell with no content is poor UX | Coordinate milestones; ship hero banner first (value even without detail page); provide loading/placeholder state in shell |
| Future L5 agents have different hero requirements | Low-Medium — could require hero rework | Build hero as a configurable component (not hardcoded to Lead to Lease) with props for name, description, stage count, coverage, CTA |
| Coverage data contract not finalized | Medium — hero can't show coverage without OA data | Define interface contract early; platform team can stub with placeholder until OA delivers |
| L5 pattern may need list-view variant | Low — R1/R1.2 list view exists alongside card view | Account for list-view L5 representation in design (likely a promoted row rather than a hero); may be separate story |

#### Stories Breakdown

| Story | Scope | Points Est. |
|-------|-------|-------------|
| **S-1: L5 Hero Banner Component** | Full-width banner with active/paused states, level badge, status badge, stage/sub-agent counts, coverage bar, click routing | [TBD] |
| **S-2: L5 Detail Page Shell** | Route, page layout, back navigation, content slot for OA team component | [TBD] |
| **S-3: Activation Dialog** | Modal with value prop, capabilities, impact metrics, activate CTA, status update, navigation | [TBD] |
| **S-4: Deep Link & Filter Integration** | `?agent=` routing for L5, filter/search interaction with hero visibility | [TBD] |
| **S-5: Coverage Bar Integration** | Render coverage indicator on hero using data from OA team; define interface contract | [TBD] |
| **S-6: L5 Hero Pattern Generalization** | Ensure hero component is reusable for future L5 agents; extract configurable props | [TBD] |

---
---

## Part 2: Product Requirements Document (PRD)

---

### PRD: L5 Hero Agent Banner & Lead To Lease Agent Shelving

**Document Version:** 1.0
**Last Updated:** May 2026
**Author:** [PM Owner]
**Stakeholders:** OXP Studio Web (Platform), Online Applications, Product, Design, Engineering
**Team:** OXP Studio Web (Platform)

---

### 1. Executive Summary

The OXP Studio Agent Roster is the central registry where admins find, enable, and configure all AI agents. Today, the roster treats every agent as an equal — a card in a grid. The **Autonomous Lead To Lease** agent is not equal. It is the platform's first **L5 (fully autonomous) orchestrator** — a multi-agent system that coordinates 15 L3 sub-agents and 8 L4 conversational agents across 4 pipeline stages to manage the entire prospect-to-resident leasing journey.

This PRD defines the **platform shelving** that the OXP Studio Web team will build to give this agent the elevated treatment it requires: a hero banner in the roster, a dedicated full-page shell, an activation dialog, and the routing infrastructure to tie it all together. The shelving is the stage; the Online Applications team builds the show that runs on it.

**What this team builds:** The frame, the shelf, the container.
**What the Online Applications team builds:** Everything inside the container — stage configuration, sub-agent settings, autonomy controls, per-property overrides, pipeline visualization.

---

### 2. Problem & Opportunity

#### The Problem

The Agent Roster grid has 113 agents. Without visual differentiation, the L5 orchestrator — which coordinates 23 sub-agents across 4 leasing stages — would appear as just another card. This creates three problems:

1. **Discoverability:** Admins can't quickly find the most strategic and capable agent in the roster.
2. **Comprehension:** A standard card can't communicate the scope of an orchestrator that manages an entire business process pipeline.
3. **Navigation:** The L5 agent requires a full-page configuration experience (4 stages × 15 sub-agents × per-property settings). A side sheet — used for L1–L4 agents — is insufficient. The platform needs a dedicated route and page shell.

Additionally, the Online Applications team is building the L5 agent's internal configuration experience. They need a page shell to render into and a contract for how the platform exposes the agent's presence in the roster.

#### The Opportunity

- **First-class L5 pattern:** Establish a hero banner + full-page shell pattern that scales to future L5 orchestrators (Autonomous Maintenance, Autonomous Renewals, etc.).
- **Unblock parallel delivery:** Platform shelving and OA functionality can be built in parallel once the interface contract is agreed.
- **Drive flagship adoption:** The hero banner is prime real estate — it puts the L5 agent's value proposition, activation state, and coverage metrics front and center every time an admin visits the roster.

---

### 3. Goals & Success Criteria

| Goal | How We Measure | Target |
|------|----------------|--------|
| Admins find the L5 agent without scrolling | Usability test: time to locate L5 agent on Agent Roster | < 3 seconds |
| Admins understand the L5 agent's scope from the roster | Usability test: can user describe what the agent does from the hero alone | 80% of participants |
| Admins can navigate to L5 configuration in one click | Click-depth from Agent Roster to L5 detail page | 1 click |
| Hero banner drives activation of inactive L5 agent | Conversion: hero click → activation dialog → activate | > 20% |
| Online Applications team can render their UI in the shell | Integration test: OA component mounts in page shell without platform changes | Pass/fail |
| Pattern supports future L5 agents | Code review: hero component accepts configurable props, not hardcoded to Lead to Lease | Pass/fail |

---

### 4. User Personas & Roles

| Persona | Interaction with L5 Hero | Interaction with L5 Detail Page |
|---------|-------------------------|-------------------------------|
| **Portfolio Admin** | Sees hero banner; can activate, pause, and configure L5 agent | Full access to all stages and sub-agent configuration |
| **Regional Manager** | Sees hero banner; can view L5 status and coverage | View access; may configure properties in their region |
| **Property Manager** | May see hero banner (role-gated, TBD) | Limited or no access (configuration is admin-level) |
| **IC** | No access to Agent Roster | No access |

---

### 5. Detailed Functional Specification

#### 5.1 L5 Hero Banner Component

The hero banner is a full-width, visually elevated component rendered **above** the standard agent card grid in the Agent Roster. It is only visible in the card view layout (not the R1/R1.2 list view, which uses a separate promoted row pattern).

**Layout (horizontal, single row):**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ┌──────┐                                                              │
│  │ ICON │  Autonomous Lead To Lease   [L5]  [Active]                   │
│  │      │                                                              │
│  └──────┘  Unified leasing intelligence — orchestrates application     │
│            processing, screening decisions, lease execution, and       │  → 
│            resident communications through coordinated autonomous      │
│            agents.                                                     │
│                                                                        │
│            [════════════ Coverage Bar ═══════════]    4 Stages          │
│                                                      15 L3 + 8 L4     │
└─────────────────────────────────────────────────────────────────────────┘
```

**Elements:**

| Element | Description | Source |
|---------|-------------|--------|
| **Agent icon** | 56×56 container with ELI cube / L5 brand icon | Platform — static asset |
| **Agent name** | "Autonomous Lead To Lease" | Agent data (`agent.name`) |
| **L5 level badge** | Gradient pill reading "L5" | Platform — derived from `agent.type === "fully_autonomous"` |
| **Status badge** | "Active" (green) or "Paused" (amber) | Agent data (`agent.status`) |
| **Description** | 1–2 line agent description | Agent data (`agent.description`) |
| **Coverage bar** | Stacked bar showing automation coverage across properties (full / partial / none) | Data from Online Applications team via defined interface |
| **Stage count** | "4 Stages" | Agent metadata (from OA team or static config) |
| **Sub-agent count** | "15 L3 + 8 L4 agents" | Agent metadata (from OA team or static config) |
| **Arrow CTA** | Circle with right arrow — indicates the banner is clickable | Platform — static |

**Visual States:**

| State | Border | Background | Status Badge | Behavior on Click |
|-------|--------|------------|-------------|-------------------|
| **Active** | Purple gradient (`border-[#7c3aed]/30`) | Subtle purple gradient | "Active" — green | Navigate to `/agent-roster/autonomous-leasing-plus` |
| **Paused** | Amber (`border-amber-200`) | Muted amber tint | "Paused" — amber with power icon | Open activation dialog |

**Responsiveness:**
- Desktop: Horizontal layout as shown above
- Tablet: Stack coverage bar below description; maintain single row
- Mobile: Stack all elements vertically; full-width coverage bar

**Filter Behavior:**
- The hero reads from the same filtered/sorted agent list as the grid
- If the L5 agent is excluded by active filters (subcategory, level, status) or search, the hero banner is hidden
- The hero is **always excluded from the grid** — it only appears in the hero slot

#### 5.2 L5 Agent Detail Page Shell

A dedicated page at `/agent-roster/autonomous-leasing-plus` that provides the layout frame for the Online Applications team's configuration UI.

**Page structure:**

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Agent Roster                                        │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │           CONTENT SLOT                                    │  │
│  │           (Online Applications team renders here)         │  │
│  │                                                           │  │
│  │           - LeadToLeaseSettings component                 │  │
│  │           - Stage configuration                           │  │
│  │           - Sub-agent settings                            │  │
│  │           - Per-property overrides                        │  │
│  │           - Autonomy controls                             │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Platform-owned elements:**

| Element | Description |
|---------|-------------|
| **Back link** | "← Back to Agent Roster" — navigates to `/agent-roster` |
| **Page container** | Max-width content area with appropriate padding, consistent with other OXP Studio pages |
| **Loading state** | Skeleton or spinner while the OA component loads |
| **Error boundary** | Catch errors from the OA component; show fallback UI with retry |
| **Route registration** | `/agent-roster/autonomous-leasing-plus` registered in Next.js app router |

**OA team-owned elements (rendered in the content slot):**

| Element | Description |
|---------|-------------|
| **Page header** | Agent name, L5 badge, pause/resume toggle, status |
| **Stage pipeline** | 4-stage stepper with autonomy rollups |
| **Tab navigation** | "Setup & Configuration" / "Compare Properties" |
| **Property selector** | Property dropdown with coverage pills |
| **Stage content** | L3 sub-agent accordions, L4 ELI+ agent settings |
| **Dirty-state footer** | Save/discard bar with impact preview |

#### 5.3 Activation Dialog

A modal dialog that opens when an admin clicks the hero banner while the L5 agent is inactive. Its purpose is to communicate the agent's value and provide a one-click activation path.

**Dialog structure:**

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   [Icon]  Autonomous Lead To Lease                      │
│                                                         │
│   Unified leasing intelligence that orchestrates the    │
│   entire prospect-to-resident journey.                  │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │  4 Pipeline Stages                              │   │
│   │  • Guest Cards  • Applications                  │   │
│   │  • Screening    • Lease Execution               │   │
│   ├─────────────────────────────────────────────────┤   │
│   │  23 Coordinated Sub-Agents                      │   │
│   │  15 L3 processing agents + 8 L4 ELI+           │   │
│   │  conversational agents                          │   │
│   ├─────────────────────────────────────────────────┤   │
│   │  Impact Metrics                                 │   │
│   │  • 49% reduction in cancelled applications      │   │
│   │  • 38% increase in applications                 │   │
│   │  • 99% conversations handled autonomously       │   │
│   └─────────────────────────────────────────────────┘   │
│                                                         │
│            [Cancel]        [Activate Agent]              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Behavior:**
- "Activate Agent" → updates agent status to "Active" via `updateAgent()` → navigates to `/agent-roster/autonomous-leasing-plus`
- "Cancel" → closes dialog, returns to Agent Roster
- Dialog content (stages, sub-agent counts, impact metrics) may be static initially; the OA team can provide dynamic content later

#### 5.4 Deep Link Routing

When the Agent Roster page loads with `?agent=<l5-agent-id>` in the URL:

1. Look up the agent by ID in the agents context
2. Detect that the agent is the L5 agent (`agent.type === "fully_autonomous"` or `agent.name === "Autonomous Lead To Lease"`)
3. If `status === "Active"` → `router.push("/agent-roster/autonomous-leasing-plus")`
4. If `status !== "Active"` → open activation dialog

This ensures links from Command Center, email notifications, Slack integrations, or external tools resolve correctly regardless of agent state.

#### 5.5 Coverage Bar Component

A visual indicator on the hero banner showing the L5 agent's automation coverage across properties.

**Display:**
- Stacked horizontal bar with three segments:
  - **Full autonomy** (purple/green) — properties where all autonomy pickers are set to "autonomous"
  - **Partial autonomy** (amber) — properties with a mix of autonomous and manual settings
  - **No autonomy** (gray) — properties with all pickers set to "manual"
- Text label: e.g., "6 of 11 properties fully autonomous"

**Data contract with Online Applications team:**

```typescript
interface L5CoverageData {
  total: number;          // total property count
  full: number;           // properties at full autonomy
  partial: number;        // properties at partial autonomy
  none: number;           // properties with no autonomy
  label?: string;         // optional display label
}
```

The OA team computes this data based on per-property autonomy settings. The platform team renders it. This contract should be agreed upon before implementation begins.

#### 5.6 L5 Hero Pattern (Generalization)

The hero banner should be built as a configurable component that can support future L5 agents. Rather than hardcoding "Autonomous Lead To Lease" details, the component should accept props:

```typescript
interface L5HeroProps {
  agent: Agent;                          // agent data from context
  coverageData?: L5CoverageData;         // coverage bar data
  stageCount?: number;                   // number of pipeline stages
  subAgentSummary?: string;              // e.g., "15 L3 + 8 L4 agents"
  detailRoute: string;                   // e.g., "/agent-roster/autonomous-leasing-plus"
  onActivate?: () => void;               // activation handler (if not using dialog)
  activationDialog?: React.ReactNode;    // dialog to show when inactive
}
```

This ensures that when a second L5 agent (e.g., "Autonomous Maintenance") is introduced, the platform team can reuse the hero component without structural changes.

---

### 6. Interface Contract: Platform ↔ Online Applications

This section defines the boundary between the two teams.

#### 6.1 What the Platform Provides to Online Applications

| Provided | Description |
|----------|-------------|
| **Page shell at known route** | The route `/agent-roster/autonomous-leasing-plus` exists and renders a content slot |
| **Back navigation** | "← Back to Agent Roster" link in the page shell |
| **Agent context** | Access to `useAgents()` context for reading/updating the L5 agent's status |
| **Activation flow** | The activation dialog handles the initial "Off → Active" transition and navigates to the detail page |
| **Consistent app chrome** | Standard OXP Studio app shell (sidebar, header) wraps the page |

#### 6.2 What Online Applications Provides to the Platform

| Provided | Description |
|----------|-------------|
| **Settings component** | A React component (e.g., `LeadToLeaseSettings`) that renders the full L5 configuration UI. Must accept the content slot's width and handle its own internal state. |
| **Coverage data** | `L5CoverageData` object (or equivalent) for the hero banner's coverage bar |
| **Stage metadata** | Stage count, sub-agent counts, and summary text for the hero banner |
| **Error handling** | The settings component must handle its own loading, error, and empty states gracefully |

#### 6.3 Integration Points

| Integration Point | Contract | Notes |
|-------------------|----------|-------|
| **Hero banner → OA data** | Platform reads coverage data from a shared context, API, or prop. OA team publishes it. | Agree on data shape early; platform can stub with mock data |
| **Detail page → OA component** | Platform imports and renders OA's settings component in the content slot | Component must be exportable and self-contained |
| **Activation → Agent status** | Platform's activation dialog calls `updateAgent({ status: "Active" })` | OA team may need to perform additional setup on activation; define a callback hook if needed |
| **Pause/Resume → Hero state** | When OA's settings component toggles the orchestrator, the hero banner reflects the new status | Both read from the same `useAgents()` context — no special integration needed |

---

### 7. Design Specifications

#### 7.1 Hero Banner Visual Design

| Property | Active State | Paused State |
|----------|-------------|-------------|
| **Border** | 2px, purple gradient (`#7c3aed` at 30% opacity) | 2px, amber (`border-amber-200`) |
| **Background** | Subtle purple gradient (5% opacity) | Muted amber tint |
| **Border radius** | `rounded-2xl` (16px) | Same |
| **Padding** | `p-6` (24px) | Same |
| **Icon container** | 56×56px, purple-tinted background | 56×56px, amber-tinted background |
| **Level badge** | Gradient purple "L5" pill | Same (still purple — L5 is the brand) |
| **Status badge** | Green "Active" pill | Amber "Paused" pill with power icon |
| **CTA** | Purple circle with white right arrow | Amber circle with power icon |

#### 7.2 Typography

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Agent name | Nohemi (heading font) | 20px | Bold | `text-foreground` |
| Description | Inter (body font) | 14px | Normal | `text-muted-foreground` |
| Stage count | Inter | 14px | Semibold | `text-green-700` (active) / `text-muted-foreground` (paused) |
| Sub-agent count | Inter | 12px | Normal | `text-muted-foreground` |

#### 7.3 Spacing

- Hero banner has `mb-6` (24px) margin below, separating it from the card grid
- The hero sits inside the same content column as the grid, below search/sort controls
- No margin above (flush with the search bar area)

#### 7.4 Accessibility

- Hero banner is a `<button>` element (or `<a>` for active state routing) with full keyboard focus support
- `aria-label` describes the action: "Open Autonomous Lead To Lease agent configuration" / "Activate Autonomous Lead To Lease agent"
- Status badge uses both color and text (not color alone)
- Coverage bar includes a text alternative (screen reader label with coverage numbers)
- Activation dialog traps focus and supports `Escape` to close

---

### 8. Technical Architecture

#### 8.1 Component Map

| Component | Path | Owner | Responsibility |
|-----------|------|-------|----------------|
| `L5HeroBanner` | `components/agent-roster/l5-hero-banner.tsx` | **Platform** | Hero banner with active/paused states, coverage bar, click routing |
| `L5ActivationDialog` | `components/agent-roster/l5-activation-dialog.tsx` | **Platform** | Value prop modal with activate CTA |
| `StackedCoverageBar` | `components/ui/coverage-bar.tsx` | **Platform** | Reusable coverage visualization |
| `AutonomousLeasingPlusPage` | `app/agent-roster/autonomous-leasing-plus/page.tsx` | **Platform** | Page shell — back link + content slot |
| `LeadToLeaseSettings` | `components/lead-to-lease-settings.tsx` | **Online Applications** | All L5 configuration UI (stages, sub-agents, autonomy, per-property) |
| `AgentsProvider` | `lib/agents-context.tsx` | **Platform** | Agent state management (status, metadata) |

#### 8.2 Route Structure

```
/agent-roster                              → Agent Roster page (with L5 hero)
/agent-roster?agent=32                     → Deep link → redirects to detail or activation
/agent-roster/autonomous-leasing-plus      → L5 detail page shell + OA content
```

#### 8.3 State Flow

```
AgentsProvider (shared)
├── Agent Roster page
│   ├── reads agents, filters, sorts
│   ├── finds L5 agent (type === "fully_autonomous")
│   ├── renders L5HeroBanner (above grid)
│   └── excludes L5 from card grid
├── L5HeroBanner
│   ├── reads agent.status → active/paused rendering
│   ├── reads coverageData → StackedCoverageBar
│   └── onClick → router.push OR open activation dialog
├── L5ActivationDialog
│   └── onActivate → updateAgent({ status: "Active" }) → router.push
└── AutonomousLeasingPlusPage
    ├── back link → /agent-roster
    └── renders LeadToLeaseSettings (OA team component)
```

#### 8.4 Data Types

```typescript
// Existing — no changes needed
type AgentType = "fully_autonomous" | "autonomous" | "efficiency" | "intelligence" | "operations";

type Agent = {
  id: string;
  name: string;
  description: string;
  status: string;        // "Active" | "Off"
  bucket: string;        // "Leasing & Marketing" for L5
  type: AgentType;       // "fully_autonomous" for L5
  // ... other fields
};

// New — platform defines, OA team populates
interface L5AgentMetadata {
  stageCount: number;
  stages: { id: string; name: string }[];
  l3AgentCount: number;
  l4AgentCount: number;
  subAgentSummary: string;  // "15 L3 + 8 L4 agents"
}

interface L5CoverageData {
  total: number;
  full: number;
  partial: number;
  none: number;
  label?: string;
}
```

---

### 9. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | Should the hero banner also appear in the R1/R1.2 list view, and if so, as what pattern (promoted row, inline hero, banner)? | Product / Design | Open |
| 2 | Should the activation dialog content be static (platform-owned) or dynamic (OA team provides via API/component)? | Product / Engineering | Open |
| 3 | What is the coverage data refresh cadence — real-time (context state), or periodic (API poll)? | Engineering | Open |
| 4 | Should the hero support a "Coming Soon" state for L5 agents that are announced but not yet available? | Product | Open |
| 5 | How should the platform handle the case where the OA team's component is not yet deployed (empty shell)? | Engineering | Open — recommend loading/placeholder state |
| 6 | Should the detail page shell include any platform-level tabs (e.g., "Configuration" / "Performance" / "Audit Log") or is the entire page owned by OA? | Product | Open |
| 7 | When a second L5 agent is added, does the hero section show both as stacked banners or a carousel? | Product / Design | Open |

---

### 10. Milestones & Phasing

| Phase | Scope | Dependency | Target |
|-------|-------|------------|--------|
| **Phase 1: Hero Banner** | L5 hero banner in Agent Roster with active/paused states, click routing, filter integration. No coverage bar yet (stub). | Agent data model (exists) | [TBD] |
| **Phase 2: Detail Page Shell** | Route, page layout, back navigation, content slot. OA team can begin rendering their component. | None (platform-only) | [TBD] |
| **Phase 3: Activation Dialog** | Modal with value prop, activate CTA, status update, navigation. | Agent status management (exists) | [TBD] |
| **Phase 4: Coverage Integration** | Coverage bar on hero using real data from OA team. Define and implement data contract. | OA team coverage API | [TBD] |
| **Phase 5: Deep Link & Polish** | `?agent=` routing, accessibility audit, responsive testing, error boundaries. | Phases 1–3 complete | [TBD] |

---

### 11. References

| Document | Path |
|----------|------|
| JIRA Initiatives and Epics | `docs/product/JIRA-INITIATIVES-AND-EPICS.md` |
| App Pages and Goals | `docs/product/APP-PAGES-AND-GOALS.md` |
| TDD Architecture (§4.13 Agent Roster) | `docs/architecture/TDD-ARCHITECTURE.md` |
| Agent Types Taxonomy | `docs/research/AGENT-TYPES-TAXONOMY.md` |
| Deep Research — Platform Parts | `docs/research/DEEP-RESEARCH-PLATFORM-PARTS.md` |
| UI/UX Guidelines | `docs/design/UI-UX-GUIDELINES.md` |
| Agent Roster Prototype | `app/agent-roster/page.tsx` |
| L5 Detail Page Prototype | `app/agent-roster/autonomous-leasing-plus/page.tsx` |
| Lead To Lease Settings Prototype | `components/lead-to-lease-settings.tsx` |
| Agents Context & Data Model | `lib/agents-context.tsx` |
| Command Center Metrics (reference PRD) | `docs/product/INITIATIVE-COMMAND-CENTER-OUTCOME-METRICS.md` |

---

*Last updated: May 2026. Source: OXP Studio prototype (`app/agent-roster/page.tsx`, `components/lead-to-lease-settings.tsx`), product docs, and architecture docs.*
