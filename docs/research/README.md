# Research

Reference and competitive research for the multi-family AI platform.

## Contents

- **HARVEY-SIERRA-RESEARCH.md** — Harvey AI and Sierra AI as reference models: what they do, how they blend humans and AI, and how that maps to multi-family. Structured so you can add more companies or patterns.

- **DEEP-RESEARCH-PLATFORM-PARTS.md** — Deep research on each platform part (AI Agents, Documents/SOPs, Workflows, Voice & Channels, Workforce, Governance, Escalations) with citations from production systems (e.g. MAP, OpenClaw, Agentforce, Harvey, Sierra, fair housing). Ends with how the parts fit together (single source of truth, handoff chain, governance, outcome loop, data flow) and a summary table.

- **AGENT-TYPES-TAXONOMY.md** — Defines the three platform agent types (Autonomous/ELI+, Intelligence, Operations) and research on how each is built: ELI+ (role, goal, functions, MCP tools, SOPs, self-learning); Intelligence (data → recommendations, no execution, prompt+goal); Operations (classic automation, no prompt/learning). Includes comparison table and when to use which.

- **PMC-ORGANIZATION-WORKFORCE-RESEARCH.md** — **How large property management companies are organized:** core functions, leadership tiers, three structure types (portfolio, departmental, pod), centralization trend (on-site vs portfolio/regional), staffing ratios and units-per-employee. Informs Workforce design (roles, teams, property/portfolio/regional scope, performance, Escalations routing). Referenced by DEEP-RESEARCH Part 5.

- **METRICS-STAFFING-AI-VALUE.md** — **How metrics drive staffing models and the use of AI to retain bottom line.** How PMCs/asset managers look at metrics (goals → property KPIs → workforce/output metrics); how those metrics affect staffing decisions; how AI is used to preserve margins when costs rise (same or fewer staff, outcomes maintained, ROI visible). Key to the platform value proposition. Anchored in TDD §4.11, §4.12.

- **MULTIFAMILY-REGULATION-AND-DUTIES-RESEARCH.md** — **Where multifamily is regulated** (federal FHA/HUD/LIHTC, state landlord-tenant/licensing, local rent control/codes) and **how regulation applies by activity** (screening, advertising, leasing, eviction, deposits, etc.). **Duties and functions** within multifamily (leasing, resident relations, maintenance, revenue, compliance) with regulation touch points. **AI and human workforce** must both operate within the same rules; HUD May 2024 AI/screening guidance; platform implications (jurisdiction, guardrails, audit, human-in-the-loop). Use when defining Knowledge filters, agent guardrails, and which duties are high-risk. Complements DEEP-RESEARCH Part 6 (Governance).

- **ENTRATA-AND-SOP-SOURCE-OF-TRUTH.md** — Platform is bolted on top of **Entrata** (PHP backend); Entrata functionality is used via **APIs** and **MCP tools**. **SOPs** are the source of truth for both **operations** (procedures the workforce does) and **settings** (SOPs access and control settings). Includes **deep dives:** (7) SOP–settings schema (embedded vs linked vs registry, YAML schema, taxonomy of settings, versioning, validation, PMC examples); (8) Entrata + MCP architecture (layer diagram, when backend vs MCP, server design, tool naming, auth, rate limit, data flow, security).

- **GETTING-STARTED-SETUP-RESEARCH.md** — Research on what belongs in a **Getting Started** / setup experience: document upload (train agents + compliance), enabling agents, workflows, voice, go-live. Covers time-to-value, AI platform onboarding, compliance document flows, PM go-live, iPaaS first workflow, and voice setup. Recommends step order and content for a setup-oriented Getting Started page; feeds into TDD §4.6 (Academy / Get-Started).

- **AI-NATIVE-PLATFORM-REQUIREMENTS.md** — **What you’re missing to make the platform work as AI-native.** Ten areas that are implied or underspecified in the product/architecture docs: (1) model & inference layer, (2) RAG pipeline, (3) agent runtime & sessions, (4) observability & evaluation, (5) safety & reliability, (6) identity & scoping, (7) prompt management, (8) voice stack, (9) events & extensibility, (10) continuous improvement loop. Use as a pre-build and ongoing checklist; resolve in TDD or linked specs.

- **HARVEY-GAP-ANALYSIS-MULTIFAMILY.md** — **Gap analysis** vs Harvey AI when building “Harvey for multifamily”: what we have vs what we’re missing for Assistant, Vault, Knowledge, Workflows, Ecosystem, Collaboration, Academy, source citation, segment solutions, and trust. All gaps are addressed in the TDD. Workflow Builder = **Workato** (embedded, white-label). Build per **docs/architecture/TDD-ARCHITECTURE.md**.

## How to add to the research

1. **New competitor or pattern:** Add a subsection under **§5. Additional Research** using: Overview → Core Capabilities → Human–AI Model → Relevance to Multi-Family.
2. **New use cases:** Flesh out **§6. Use Cases to Develop** in HARVEY-SIERRA-RESEARCH.md or add a separate doc (e.g. `USE-CASES.md`) and link it from the main research doc.
3. **New sources:** Add entries and dates in **§7. Sources & Dates** (HARVEY-SIERRA) or **Sources (Consolidated)** (DEEP-RESEARCH) when you pull in new data.
4. **Deep research:** In DEEP-RESEARCH-PLATFORM-PARTS.md you can add new subsections under each Part (e.g. new failure modes, new studies), extend “How the Parts Fit Together,” or add rows to the Summary Table.
5. **Agent types:** In AGENT-TYPES-TAXONOMY.md you can add subtypes, new “how it’s built” references, or a fourth type; keep the comparison table and platform definitions in sync.
6. **Entrata / SOPs:** In ENTRATA-AND-SOP-SOURCE-OF-TRUTH.md you can add Entrata API details, MCP server design notes, or SOP–settings schema examples as the design solidifies.
7. **Architecture / TDD:** **docs/architecture/TDD-ARCHITECTURE.md** is the Technical Design Document and build plan; all Harvey gaps are closed there. Update the TDD when changing architecture or phase order.
8. **Getting Started / setup:** In GETTING-STARTED-SETUP-RESEARCH.md you can add more steps, segment-specific checklists, or references to other onboarding research; keep the TDD §4.6 step list in sync if the recommended order changes.

Keep the doc in Markdown so it’s easy to version and share.
