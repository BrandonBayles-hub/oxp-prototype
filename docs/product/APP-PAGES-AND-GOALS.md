# App Pages and Goals (by Section)

**Purpose:** Define the app’s **sections** and **pages** and the **goal of each page** so we can map to the TDD, spot gaps, and drive navigation and build order. This is the product view of “where users go and what they accomplish”; the TDD describes the components that power each page.

**Relationship:** **docs/architecture/TDD-ARCHITECTURE.md** implements these pages. Each page below maps to one or more TDD sections; gaps are called out so the TDD or this doc can be updated.

---

## Section 1: To Do

**Good looks like:** One clear place to land (Command Center), a focused task list (Escalations), and minimal chrome — same open look as Trainings & SOP (see **docs/design/UI-UX-GUIDELINES.md**).

*Related pages: landing and task completion. User intent = “what needs doing and how to get it done.”*

### Getting Started

- **Goal:** Where the user lands if they don’t have anything set up or haven’t completed enough setup to see the value of the platform. Once they complete the basic steps, this tab (or section) **disappears**.
- **TDD:** **§4.7** Academy / Get-Started. Step order (account, Entrata, Vault upload + train + compliance, agents, workflows, voice/channels, go-live) and progress persistence are specified.
- **Gap / addition:** TDD doesn’t yet state that (1) **Getting Started is the default landing** when setup is incomplete, and (2) the **Getting Started tab/section is hidden** once basic steps are complete. Recommend adding to TDD §4.7: “When setup is incomplete (e.g. go-live checklist not satisfied), users land on Getting Started; when complete, that entry point is hidden and users land on Command Center (or home).”

---

### Command Center

- **Goal:** If Getting Started is complete, this is the **page users land on** when opening the app. Centered on **insights on what needs to get done** and **how the workforce is performing**. Lets the user **orchestrate the workforce** and **focus effort**. A big part of this page is **getting insights on where to look**.
- **TDD:** **§4.11** Outcome metrics (conversation count, escalation rate, agent vs human task split, units per staff, effective capacity, etc.); **§4.6** Escalations (items that need human attention). The TDD describes *data* and *metrics* but not a dedicated **landing dashboard** that combines “what needs doing” (Escalations summary, priority, “where to look”) with “how workforce is performing” (outcome metrics).
- **Gap:** Add a **Command Center** (or “Home” / “Dashboard”) concept in the TDD: the default post-setup landing page that aggregates (1) **what needs doing** — e.g. escalation counts by category/property, high-priority items, suggested “where to look”; (2) **workforce performance** — key outcome metrics and trends; (3) **orchestration** — focus effort (e.g. links into Escalations, Performance). Could be a new subsection under §4.11 or a short §4.12 “Command Center (landing dashboard).”

---

### Escalations

- **Goal:** Where the user goes to **complete tasks** that need to be done. This includes: (1) tasks agents couldn’t complete and escalated; (2) **training tasks** where AI agents are asking for clarity on how to respond to a situation; (3) **policy/documentation improvements** (e.g. suggested changes to policy docs that need to be reviewed or applied).
- **TDD:** **§4.6** Escalations. Covers conversation-based escalations, approval/workflow escalations, routing, staff assist, summary + suggested category. Escalation *types* are mentioned (conversation, approval, workflow) but “training” (AI asking for clarity) and “policy/doc improvement” are not called out explicitly.
- **Gap:** Explicitly include **escalation types**: (a) **agent couldn’t resolve** (existing); (b) **training / clarity** — agent asking how to respond; (c) **policy or documentation improvement** — suggested SOP/doc change for human review. Ensures the data model and UI support these so they’re routable and visible. Add one bullet to TDD §4.6.1 or build order.

---

## Section 2: My Workforce

**Good looks like:** Clear sections and status (Agent Roster pattern), insights without clutter — same open look and restraint as the reference screens (see **docs/design/UI-UX-GUIDELINES.md**).

*Related pages: performance, agents, org. User intent = “understand and manage who does what and how it rolls up.”*

### Performance

- **Goal:** Where the user gets a **true understanding of how output is affecting outcome**. Mix of (1) **key health metrics** for property management (e.g. occupancy and other KPIs) and (2) **workforce performance** (AI agents and humans). Important: this is **not just a BI tool** but an **insights** area that helps the user understand **correlation and causation** and **ways to change trajectory toward a goal**.
- **TDD:** **§4.11** Outcome metrics (revenue impact, labor displaced, agent accuracy, units per staff, effective capacity, etc.) and “value you’re missing” narrative. The TDD is metric-focused; it doesn’t position a **Performance page** as an **insights** experience (correlation, causation, trajectory, recommendations).
- **Gap:** Add that the **Performance** surface is **insights-oriented**: not only charts and tables but correlation/causation and guidance to change trajectory (e.g. “occupancy down here; leasing resolution rate is low — consider X”). Could be a short addition to §4.11 (e.g. “Presented in a Performance page aimed at insights and trajectory, not only raw BI”) or a product note in this doc that implementation should favor insights over pure reporting.

---

### Agent Roster

- **Goal:** Where the user can **create, find, and manage AI agents**. View across **categories**, **status**, and **types** of agents. This is where they **manage and set up** agents. When viewing an **individual agent**, they should see **performance and value** for that agent.
- **TDD:** **§6** Cross-Cutting (agent buckets, four ELI+ agents, settings from SOPs); **§4.7** “Enable and configure agents” in Getting Started. There is no dedicated **Agent Roster** (or “Agent management”) **page** spec: list/filter by category/status/type, create/edit agents, per-agent detail with performance and value.
- **Gap:** Add an **Agent Roster** (or agent management) **surface** in the TDD: list of agents with filters (category, status, type); create/configure agents; **per-agent view** with config + **performance and value** (e.g. resolution rate, conversations, revenue impact for that agent). Could be a new subsection under §4 (e.g. §4.x Agent Roster / Agent Management) or explicitly under §6 with a “Product surface” bullet.

---

### Workforce

- **Goal:** Where the user sees the **“org chart of the future”**: **AI agents and human staff** together — both **team-focused** and an **org chart**. Key: **JTBD** — who is working on what problem and how that rolls up as an organization.
- **TDD:** **§6** Workforce and HRIS (roles, teams, property/portfolio scope, org from HRIS); **§4.6** routing by team/role. The TDD does not describe an **org-chart view** or a **unified view of AI + human** placement, or a **JTBD** lens (who is working on what problem, roll-up).
- **Gap:** Add that **Workforce** includes an **org-chart view** (from HRIS + agent assignment) showing **AI and humans** together, **team-focused**, with a **JTBD** orientation (who works on what problem, how it rolls up). Aligns with PMC-ORGANIZATION-WORKFORCE-RESEARCH (structure types, functions). Could be a short “Workforce surface” bullet in TDD §6 or in the under-specified “Workforce” area in TDD-GAPS §2.

---

## Section 3: Configure

**Good looks like:** Clear groupings (Workflows, Voice, Tools, Governance), forms and lists with minimal decoration — same open look as Trainings & SOP and Agent Roster (see **docs/design/UI-UX-GUIDELINES.md**).

*Related pages: workflows, voice, tools, governance. User intent = “set up and control how the system and agents behave.”*

### Workflows

- **Goal:** Where the user sets up **workflows and automations** that run across **Entrata** and any **other connectors** they have set up.
- **TDD:** **§4.2** Workflow Builder (Workato). Embed, platform connector, triggers from Vault, document-in/document-out, templates. Strong match.
- **TDD:** **§4.2.1** states the **Workflows** page is the primary place users open Workato (embedded) and manage recipes across Entrata and other connectors.

---

### Voice

- **Goal:** Where the user sets up **branding** around how agents should **talk and behave** and manages **communication methods**. Important: a company might have **one unified “Voice”** or **per-property “Voice.”** There may be **controlled phrasing or terms** so the AI doesn’t misspeak, **especially in regulated areas** of property management.
- **TDD:** **§5.8** Voice stack (telephony, STT/TTS); **§4.7** step 6 “Set up voice (and channels)” (number, greeting, TTS, which agents handle voice, channels). **§4.10** Segment (tenant/property-level attributes). There is no **Voice** as a **configuration area**: unified vs per-property voice, branding/tone, **controlled phrasing and terms** (e.g. prohibited or required language for fair housing).
- **Gap:** Add **Voice** as a **config surface**: (1) **Unified vs per-property** voice (branding, tone, behavior); (2) **Communication methods** (channels, numbers); (3) **Controlled phrasing/terms** — e.g. terms to avoid or require, especially for regulated areas (screening, accommodations, advertising). Could live under §4.10 (segment/property-level) plus a new “Voice configuration” bullet in §4.7 or a short §4.x Voice (config).

---

### Tools

- **Goal:** Where the user can **set up and activate** **Entrata MCP tools** or **external MCP tools** for creating their own agents.
- **TDD:** **§6** internal vs external Entrata tools; **ENTRATA-AND-SOP-SOURCE-OF-TRUTH.md §8** MCP. The TDD does not describe a **Tools** **page** where users enable/configure which MCP tools (Entrata, external) are available to which agents.
- **Gap:** Add a **Tools** (or “Connectors” / “MCP”) **page**: configure and activate **Entrata MCP** and **external MCP** tools; scope to agents or properties as needed. Enables “create your own agents” using available tools. Could be a short subsection under §4 (Configure) or under §6 with a “Product surface” note.

---

### Governance

- **Goal:** Because multifamily is heavily regulated, this page gives a place to **configure and put guardrails** around those things. Should cover **not only multifamily** but **best practices to govern AI** and **reduce liability** more generally.
- **TDD:** **§4.16** Governance (configuration page): guardrails by activity or agent (approval gates, required-docs, policy checks); required-docs checklist; general AI governance (human-review, audit, output filters). Implements §4.9.2 in a config UI.

---

## Summary: TDD Mapping and Gaps

| Section | Page           | Primary TDD | Status |
|---------|----------------|------------|--------|
| 1       | Getting Started | §4.7       | **Addressed.** §4.7.1: landing when incomplete; tab hidden when complete. |
| 1       | Command Center | §4.12      | **Addressed.** §4.12 Command Center (landing dashboard: what needs doing + performance + where to look). |
| 1       | Escalations    | §4.6       | **Addressed.** §4.6.1: types include training/clarity, policy/doc improvement. |
| 2       | Performance    | §4.11      | **Addressed.** §4.11.3: Performance surface = insights-oriented (correlation, causation, trajectory). |
| 2       | Agent Roster   | §4.13      | **Addressed.** §4.13 Agent Roster (list, filters, per-agent config + performance). |
| 2       | Workforce      | §6         | **Addressed.** §6: Workforce page (org chart, AI + human, JTBD, team roll-up). |
| 3       | Workflows      | §4.2       | **Addressed.** §4.2.1: Workflows page = primary Workato embed. |
| 3       | Voice          | §4.14      | **Addressed.** §4.14 Voice (unified vs per-property, phrasing/terms, regulated). |
| 3       | Tools          | §4.15      | **Addressed.** §4.15 Tools (MCP config page). |
| 3       | Governance     | §4.16      | **Addressed.** §4.16 Governance (config: guardrails, required-docs, approval, liability). |

---

## Next steps

1. **TDD updates:** Add the items in the “Gap / action” column above to the TDD (or to TDD-GAPS as “to spec”) so the architecture explicitly supports each page and goal.
2. **Navigation / IA:** Use this section/page list as the source for main nav (e.g. To Do → Getting Started | Command Center | Escalations; My Workforce → Performance | Agent Roster | Workforce; Configure → Workflows | Voice | Tools | Governance).
3. **Build order:** Align phases with which pages ship when (e.g. Phase 1: Getting Started, Escalations, basic Command Center; Agent Roster and Workforce when agents and HRIS are in place).

*Last updated: Feb 2025. Source: product intent (user-provided sections and page goals). TDD v0.9 closes page-level gaps.*
