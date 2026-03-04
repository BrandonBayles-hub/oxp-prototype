# OXP Studio — Jira Initiative, Epics & Stories

**Purpose:** Single source of truth for the Jira work hierarchy. One initiative, ten epics — one epic per active side-nav page. Each page is represented as a story under its epic so the epic can later expand with additional stories as scope grows.

**Relationship:** Pages and goals live in **APP-PAGES-AND-GOALS.md**; architecture in **docs/architecture/TDD-ARCHITECTURE.md**. This doc is the project-management layer on top of both.

---

## Initiative

### AI-Native Multifamily Property Management Platform

> Deliver the OXP Studio: a centralized, role-aware platform where multifamily property management companies configure, operate, and govern a blended human-AI workforce — from first-time setup through daily operations, performance measurement, and regulatory compliance.

**Business value:** Reduces resident response time by routing issues to AI agents first. Maximizes AI ROI through continuous performance measurement alongside human staff. Provides the configuration, knowledge management, and governance framework required to operate responsibly in a regulated industry. Gives every role — from site-level IC to regional admin — a clear, actionable view of what needs attention.

---

## Epics & Stories

---

### Epic 1 — Command Center

*The default landing page after setup. A role-aware operations dashboard that answers "what needs attention right now" and "how is the workforce performing" in a single view.*

**Story · Command Center Page** `/command-center` · **TDD §4.12**

As a user, I need a role-based operational dashboard so I can immediately see what needs attention and how the workforce is performing without navigating to multiple pages.

**IC (individual contributor) view:**

- Personalized greeting with count of open items and overdue items
- 4 KPI cards: My Open Items, Resolved This Week, Avg Response Time, My Resolution Rate
- My Queue — scrollable list of escalations assigned to the logged-in user; clicking any item opens the `EscalationDetailSheet` with full context, notes, and actions
- Tips panel — best-practice guidance cards for handling escalations

**Admin / Regional / Property Manager view:**

- "Value You're Missing" banner — highlights unrealized revenue or capacity gains
- 4 KPI cards: Revenue Impact, Active Agents, Effective Capacity (hidden for property role), Open Escalations
- Needs Attention — first 10 open escalations with summary, priority, and due date; click opens `EscalationDetailSheet`; "View all" navigates to `/escalations`
- Live Conversations — active resident conversations showing resident name, unit, and message preview; click opens a conversation sheet with embedded `Chat` component for real-time staff assist
- Insights & Recommendations — dismissible insight cards with actions (Review Claims, Dismiss, View Trace)
- Your Team — lists autonomous agents and property staff with key metrics; "View workforce" links to `/workforce`

**Key interactions:** Escalation detail sheet, live conversation sheet with chat, dismissible insight cards, role-based conditional rendering.

---

### Epic 2 — Escalations

*A focused triage queue for everything the AI could not resolve on its own. Designed for fast scanning, bulk action, and individual deep-dives.*

**Story · Escalations Page** `/escalations` · **TDD §4.6**

As a user, I need a filterable, searchable escalation queue so I can quickly identify, prioritize, assign, and resolve the items that require human intervention.

**Stat cards (5):**

- Open — total unresolved escalations
- Urgent / High — count of high-priority items
- Overdue — items past their SLA due date
- Handed Back — escalations returned by a staff member
- Resolved — total closed this period

**Search and filters:**

- Full-text search across summary, resident name, category, property, agent, labels, and notes
- 5 filter dropdowns: Type, Category, Property, Status, Priority
- All filters and search work together; clear button resets

**Table:**

- Columns: Checkbox (for bulk select), Summary (sticky), Type, Category, Property, Priority, Due, Status, Assignee
- Inline assignee select per row — reassign without opening the detail view
- Row click opens `EscalationDetailSheet` with full escalation context, conversation history, notes, and resolution actions

**Bulk actions:**

- Visible when one or more rows are selected
- "Assign to…" — bulk reassign selected escalations to a staff member or agent
- "Set status…" — bulk update status (e.g., mark resolved, mark in-progress)

**Key interactions:** Multi-select, bulk assign, bulk status, inline assignee, detail sheet, search with clear, filter dropdowns.

---

### Epic 3 — Performance

*An insights-oriented analytics surface. Not just charts and tables — designed to help managers understand correlation, causation, and where to change trajectory.*

**Story · Performance Page** `/performance` · **TDD §4.11**

As a manager, I need a performance dashboard that goes beyond raw metrics to show how AI and human output is affecting property outcomes, where trends are heading, and what to do about it.

**Filters:** Period selector (7 / 30 / 90 days), Property dropdown. Both apply globally across all sections.

**Asset & revenue impact:**

- Total AI Value — aggregate dollar impact
- Hidden Revenue — unrealized revenue the AI has identified
- Cost vs Labor — AI cost compared to displaced labor cost (hidden for property role)

**How AI drives asset value:**

- 3 value-chain cards: Renewals, Leasing, Maintenance
- Each card breaks down the steps in the value chain and the dollar value contributed at each step

**Efficiency & capacity:**

- Metrics: Conversations handled, Escalation Rate, Agent Accuracy, Agent vs Human task split (%), Labor Displaced, Effective Capacity, Units per Staff
- Property role hides some metrics (Effective Capacity, Labor Displaced)

**Trends (charts):**

- Area chart — conversation volume over time
- Line chart — escalation rate trend
- Bar chart — task distribution by type (hidden for property role)

**PM health:**

- 10 property-management KPIs: renewal rate, occupancy, rent growth, collections rate, turnover cost, work-order completion, resident satisfaction, lease-up velocity, delinquency rate, maintenance response time
- Trend chart for renewal rate and occupancy over time

**Agent performance:**

- Top 3 agents ranked by impact
- AI vs Human comparison table (hidden for property role)

**Insights & next steps:**

- Outcome narrative cards explaining what the data means
- Actionable insight cards with recommended next steps

**Feedback review:**

- Collapsible section with status filters (All, New, Reviewed, Actioned, Dismissed)
- Triage actions per feedback item: Edit prompt, Update SOP, Mark reviewed, Dismiss

**Key interactions:** Period/property filters, feedback triage, collapsible sections, role-based visibility.

---

### Epic 4 — Agent Roster

*The central registry for creating, finding, and managing AI agents. Where admins deploy agents with the right persona, tools, guardrails, and escalation behavior.*

**Story · Agent Roster Page** `/agent-roster` · **TDD §4.13**

As an admin, I need to view, create, and configure AI agents organized by capability bucket so I can deploy the right agent with the right configuration for each property and function.

**Filters:** Bucket, Type (Autonomous / Intelligence / Operations), Status (Active / Training / Draft / Suspended)

**Agent list:**

- Organized by 5 buckets: Revenue & Financial Management, Leasing & Marketing, Resident Relations & Retention, Operations & Maintenance, Risk Management & Compliance
- Each bucket is collapsible with an agent count
- Agents listed with name, type badge, status badge, and key metrics

**Create Agent:** Button opens a dialog (currently shows "Coming soon"); underlying `CreateAgentDialog` and `CreateAutonomousAgentDialog` components exist but are not yet wired into the main flow.

**Agent detail views (type-specific):**

- **Autonomous agents** → `AutonomousAgentSheet`: Full configuration panel with channels (email, chat, SMS, voice, portal), persona and tone, MCP tools (toggles per tool), vault document binding, routing labels, SLA settings (response time, resolution time, escalation threshold), escalation behavior, compliance checks, and an embedded `Chat` preview for testing the agent's responses
- **Intelligence agents** → `IntelligenceAgentSheet`: Pending changes indicator, editable prompt and goal, embedded `Chat` for testing, metrics (insights generated, acted on, action rate)
- **Operations agents** → `OperationsAgentModal`: Run history, error count, average duration, last run timestamp, enable/disable toggle

**Key interactions:** Bucket expand/collapse, type-specific detail views, filter dropdowns, chat preview, configuration toggles, create agent flow (placeholder).

---

### Epic 5 — Workforce

*The "org chart of the future." AI agents and human staff displayed together — team-focused, with routing rules and compliance readiness.*

**Story · Workforce Page** `/workforce` · **TDD §6**

As a manager, I need to see the full organizational structure — humans and AI agents together — so I can understand who is working on what, manage escalation routing, and ensure compliance.

**Stat cards (5):**

- Total Workforce — combined human + AI count
- Human Staff — headcount
- AI Agents — active agent count
- Teams with AI — number of teams that include at least one AI agent
- Open Escalations — current unresolved escalation count

**Tab 1 · Org Structure:**

- View toggle: Tree view / Table view
- Search by name, Property filter dropdown, Label filter dropdown, Clear all
- Tree view — hierarchical display with leaders at the top, team sections with expandable `MemberNode` components showing each person/agent, their role, and direct reports
- Table view — `OrgTable` with expandable rows showing the same data in a flat, sortable format
- Click any member → `MemberDetailSheet` with overview (department, role, key metric, reports-to), assigned properties (editable via `PropertyPicker`), routing labels (add/remove), and direct reports list

**Tab 2 · Routing:**

- Routing rules table: Condition (category + type), Assignees, Reassign threshold (minutes), Escalate threshold (minutes), Ceiling
- Add rule form: select category, type, assignees, and SLA fields
- Inline add/remove assignees per rule

**Tab 3 · Compliance:** Coming soon placeholder.

**Key interactions:** Tree/table toggle, search and filters, member detail sheet, property picker, routing rule CRUD, label management.

---

### Epic 6 — Activation

*The guided setup wizard. Walks new admins through every required configuration step — from account setup through go-live — with clear progress and auto-detection.*

**Story · Activation Page** `/getting-started` · **TDD §4.7**

As an admin setting up Janet for the first time, I need a step-by-step wizard so I can configure every part of the platform and go live with confidence that nothing was missed.

**Progress bar:** Shows X of 9 steps completed.

**9 expandable steps:**

1. **Account & organization** — Confirm Entrata context (org name, properties, units)
2. **Connect Entrata** — View connected properties, unit counts, connection status
3. **Configure tools** — Toggle Entrata modules on/off; link to `/tools` for detailed configuration
4. **Upload documents** — Drag-and-drop or click to upload SOPs and policies; recent documents list; compliance checklist with checkboxes (e.g., fair housing policy uploaded, screening criteria documented)
5. **Create & configure agents** — Agent templates with toggles to enable each; link to `/agent-roster` for detailed config
6. **Set up workflows** — Workflow templates with toggles; link to `/workflows`
7. **Configure voice & channels** — Channel toggles (voice, chat, SMS, portal), persona settings
8. **Set up governance** — Guardrail toggles for key areas; link to `/governance`
9. **Review & go live** — Go-live checklist derived from platform state (all steps reflected), "Run test" button, "Go live" button

**Auto-detection:** Steps reflect current platform state (e.g., if documents already uploaded, step 4 shows them; if agents already configured, step 5 reflects that).

**Post-completion:** Page redirects to Command Center after go-live. The "Activation" nav item is hidden once `goLiveComplete` is true.

**Key interactions:** Step expand/collapse, manual step checkboxes, module/agent/recipe toggles, document upload (drag-and-drop), compliance checkboxes, run test, go live.

---

### Epic 7 — Workflows

*Workflow automation powered by Workato. Connect AI agent actions to Entrata and external systems so routine processes run without manual intervention.*

**Story · Workflows Page** `/workflows` · **TDD §4.2**

As an admin, I need to set up and manage automated workflows across Entrata and any other connected systems so that routine property management processes execute automatically.

**Vault docs banner:** When navigated to with `?docs=` query parameter (e.g., from Trainings & SOP bulk action), displays the selected documents and a "Run workflow" context so the user can trigger a workflow against specific docs.

**Workflow builder:** Placeholder for the embedded Workato iframe. Shows an "Integration pending" message with a dismiss action. This is where the full Workato workflow builder will render once the integration is connected.

**Recipe templates (4):**

- New lead received → Create follow-up task
- Work order completed → Notify resident
- Lease renewal approaching → Send reminder
- Document approved → Retrain agents

Each template has a "Use template" button that adds it to the user's recipe list.

**Your recipes:** Table listing all active and inactive recipes with columns: Recipe name, Source template, Status (Enabled / Disabled toggle). Users toggle recipes on/off inline.

**Key interactions:** Use template, enable/disable toggle, dismiss Workato hint, vault docs context banner.

---

### Epic 8 — Trainings & SOP

*The centralized document library. Where teams upload, organize, and govern the SOPs, training materials, and policies that AI agents and staff rely on for every decision.*

**Story · Trainings & SOP Page** `/trainings-sop` · **TDD §4.3 – §4.5**

As a user, I need a full-featured document library so I can manage SOPs, training materials, and Entrata-sourced docs with AI-powered analysis, folder organization, approval workflows, and a natural-language search interface.

**Header:** "Explore SOPs" button opens a dialog for browsing the SOP collection.

**Documents needing review:** Alert banner shown when any documents are past their review-by date.

**Tab 1 · Document library:**

- Breadcrumb navigation when inside a folder
- Filters: Search (full text), Type, Property, Approval status
- Actions: New Folder, Add Document
- Awaiting Review card — highlights documents pending human review
- Document table: Checkbox, Name, Type, Property, Approval status, Version, Review by date, Last modified, Owner, Source (uploaded / Entrata), row actions
- Row actions: Edit (opens `EditDocSheet`), Move to folder, Submit for review, Open review (creates or opens an escalation)

**Bulk actions (shown when rows selected):**

- Run analysis — AI-powered analysis across selected documents
- Summarize — generate summaries
- Tag — open bulk tag input to apply labels
- Run workflow — navigates to `/workflows?docs=` with selected doc IDs

**Add Document flow:**

- `AddDocChoiceModal` — choose between Upload or Import from Entrata
- `UploadDocModal` — drag-and-drop or click file upload with metadata fields
- `EntrataDocsModal` — browse and select documents from connected Entrata instance

**Additional modals/sheets:**

- `SimpleModal` — new folder creation
- `EditDocSheet` — rich text editor (TipTap) with document metadata, tags, approval status, agent training status, and version history
- `MoveToFolderModal` — relocate documents between folders
- `ExploreSopsDialog` — browse and search the SOP collection
- `ComplianceSelectDocumentModal` — select documents for compliance workflows
- `EscalationDetailSheet` — opens when reviewing a document that has an associated review escalation

**"Ask a question" floater:** Fixed bottom-right input. Users type a natural-language question and receive a mock RAG-style answer sourced from the document library.

**Tab 2 · Compliance:** Coming soon placeholder.

**Tab 3 · Activity:** Coming soon placeholder.

**Key interactions:** Folder navigation, search and multi-filter, row selection, bulk actions (analyze, summarize, tag, run workflow), document upload, Entrata import, approval workflow, review escalation, rich text editing, RAG search.

---

### Epic 9 — Voice

*Brand voice and communication standards. Configure how agents talk, which channels they use, and what language is required or prohibited — especially in regulated areas.*

**Story · Voice Page** `/voice` · **TDD §4.14** · `future`

As an admin, I need to define and enforce brand voice, communication standards, and controlled phrasing so that every AI agent interaction reflects our brand and complies with fair housing and other regulations.

**Current state:** Displays a "Coming soon" message. The full UI is built but wrapped in a feature flag (`false &&`).

**Intended scope (UI exists, hidden):**

- Unified vs per-property toggle — choose whether all properties share one voice or each property has its own
- **Brand & Tone tab** — persona name, branding tone description, tone sliders (e.g., formal ↔ casual, concise ↔ detailed), Do / Don't example phrases
- **Channels tab** — configuration per channel (Voice, Chat, SMS, Portal) with agent assignment, greeting text, and sign-off text
- **Compliance Guardrails tab** — phrasing rules table with add/remove; define required phrases, prohibited phrases, and regulated-language rules (e.g., fair housing terms)
- **Property Overrides tab** — per-property overrides for tone, channel settings, or guardrails
- **Agent Tuning tab** — per-agent voice adjustments that override the global or property-level settings

**Key interactions (when enabled):** Unified/per-property toggle, tone sliders, per-channel config, phrasing rule CRUD, property override management, per-agent tuning.

---

### Epic 10 — Governance

*Guardrails, audit, and agent lifecycle controls. The regulatory and operational safety net for running AI in a heavily regulated industry.*

**Story · Governance Page** `/governance` · **TDD §4.16** · `future`

As an admin, I need a governance dashboard so I can configure guardrails, audit agent behavior, manage the agent lifecycle, and enforce AI best practices — covering both multifamily-specific regulations and general AI liability.

**Current state:** Displays a "Coming soon" message. The full UI is built but wrapped in a feature flag (`false &&`).

**Intended scope (UI exists, hidden):**

- Stat cards: Active Guardrails, Audit Events (30d), Active Agents, Approved SOPs
- **Guardrails tab** — per-activity cards (e.g., lease signing, maintenance dispatch, screening) with toggles for: enable/disable, approval gate required, policy check required, scope (all properties or selected), and required documents
- **Required Docs tab** — table mapping documents to activities and showing vault status (uploaded, approved, missing)
- **Agent Lifecycle tab** — stage management with defined stages: Draft → Training → Shadow → Active → Suspended → Retired. Controls for promoting or demoting agents through stages
- **Audit & Transparency tab** — event type toggles (e.g., which actions generate audit entries), mock audit log with timestamps, and a trace detail sheet for inspecting individual agent decisions
- **General AI tab** — framework toggles for broad AI governance: human oversight requirements, output safety filters, fair housing compliance, data retention policies, and liability-reduction best practices

**Key interactions (when enabled):** Guardrail toggles, approval gate configuration, required docs mapping, lifecycle stage promotion, audit log inspection, trace detail sheet, governance framework toggles.

---

## Quick Reference

```
Initiative
└─ AI-Native Multifamily Property Management Platform

   Epic 1  · Command Center ·········· /command-center ····· built
   Epic 2  · Escalations ············· /escalations ········ built
   Epic 3  · Performance ············· /performance ········ built
   Epic 4  · Agent Roster ············ /agent-roster ······· built
   Epic 5  · Workforce ··············· /workforce ·········· built (2/3 tabs)
   Epic 6  · Activation ·············· /getting-started ···· built
   Epic 7  · Workflows ··············· /workflows ·········· built (embed placeholder)
   Epic 8  · Trainings & SOP ········· /trainings-sop ······ built (1/3 tabs)
   Epic 9  · Voice ··················· /voice ·············· future (UI exists, flagged off)
   Epic 10 · Governance ·············· /governance ········· future (UI exists, flagged off)
```

---

## Notes

- **Conversations** (`/conversations`) is not in the side nav but is tightly coupled to Command Center. If included, add as Epic 11.
- **Tools** (`/tools`) is commented out of the nav. If re-enabled, add as Epic 12.
- **Voice and Governance** are marked `future` — the full UI is built and ready but feature-flagged off. Enabling them is a config change, not a build.
- **Role access** — Admin sees all pages. Regional / Property sees To Do + My Workforce. IC sees Command Center, Escalations, Conversations, and Workforce only. Epics may need role-scoped acceptance criteria as stories are refined.
- **Story expansion** — each epic currently has one story (the page itself). As scope grows, break pages into additional stories (e.g., "Escalation Email Notifications," "Agent Roster — Bulk Import," "Performance — Custom KPI Builder").

---

*Last updated: Feb 2026. Source: page components in `app/`, sidebar in `components/app-shell/sidebar.tsx`, and product docs in `docs/product/`.*
