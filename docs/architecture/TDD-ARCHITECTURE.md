# Technical Design Document (TDD) & Architecture

**Owner:** CTO / Engineering  
**Purpose:** Define the architecture and build plan for the AI-native multifamily platform so that **all identified gaps (vs Harvey-for-multifamily) are filled before and during build**. This doc is the single technical source of truth for what we build, in what order, and how components integrate.

**Relationship to other docs:**  
- **Research:** HARVEY-SIERRA-RESEARCH.md, DEEP-RESEARCH-PLATFORM-PARTS.md, ENTRATA-AND-SOP-SOURCE-OF-TRUTH.md, AGENT-TYPES-TAXONOMY.md, **MULTIFAMILY-REGULATION-AND-DUTIES-RESEARCH.md** (where regulated, duties/functions, AI+human compliance), **PMC-ORGANIZATION-WORKFORCE-RESEARCH.md** (org structure, functions, routing). Design is **anchored** to these two: TDD sections below cite specific research sections (§1, §2, …); each of those research docs has an “Anchored in TDD” note listing which TDD sections implement it.  
- **Gaps:** HARVEY-GAP-ANALYSIS-MULTIFAMILY.md — every gap listed there is **addressed in this TDD** (see §9 and §10).  
- **Product intent:** Platform Prompt (features, vision, research principles).  
- **AI-native foundations:** **docs/research/AI-NATIVE-PLATFORM-REQUIREMENTS.md** lists what must be defined and built for the platform to *work* as an AI-native system (model layer, RAG, agent runtime, observability, safety, identity, prompt management, voice stack, events, improvement loop). Resolve these in the TDD or linked specs before or during build.  
- **Open gaps and clarifications:** **docs/architecture/TDD-GAPS-AND-CLARIFICATIONS.md** — decisions still open, under-specified areas (Escalations, Workforce, internal tools, tenant hierarchy), and ambiguous scope (Phase 1 agents, Knowledge, staff assist, Entrata widget fallback). Use as a pre-build and in-build checklist.
- **App structure:** **docs/product/APP-PAGES-AND-GOALS.md** — sections and pages (To Do: Getting Started, Command Center, Escalations; My Workforce: Performance, Agent Roster, Workforce; Configure: Workflows, Voice, Tools, Governance) with page goals and TDD mapping. Use for navigation, IA, and to ensure each page has a defined place in this TDD.

---

## 1. Principles

1. **Gaps closed before build.** No feature is built without a defined place in this architecture; Vault, Knowledge, source citation, Workflow Builder (Workato), Academy, Collaboration, and Ecosystem are first-class components from day one (or explicitly phased).
2. **SOPs are the source of truth.** Operations (procedures) and settings (configuration) are defined or controlled by SOPs; the Vault holds SOPs alongside all other operational documents in one unified store.
3. **One document store: the Vault.** SOPs are not a separate “library”; they are a **document type** in the Vault with special lifecycle (versioning, approval, settings extraction). All document-centric features (bulk analysis, review tables, workflows) operate on the Vault.
4. **Workflow Builder = Workato.** Custom workflows are built and run via **Workato** (embedded, white-label). We do not build a custom workflow engine for authoring; we integrate Workato and define how recipes invoke our agents, MCP, and Entrata.
5. **Build order is dependency-aware.** Foundation (Vault + SOPs, Entrata + MCP, agents) first; then Knowledge, citation, Academy, Ecosystem, Collaboration; segment solutions and advanced trust later.

---

## 2. System Context

- **Upstream:** Entrata (PMS, PHP, system of record); **HRIS** (one or more HR platforms per customer org) for **reporting structures** (org chart, manager hierarchy); optional external sources (regional regulations, HUD) for Knowledge.
- **Users:** **Residents**/prospects (chat, SMS, voice, portal); staff (Escalations, staff assist, Vault, Workato); admins (agents, SOPs, settings, Academy).
- **Platform:** AI layer on top of Entrata: agents, Vault (documents + SOPs), Knowledge, workflows (Workato), channels, Escalations, governance. We use Entrata via **APIs** (backend) and **MCP tools** (agents).

**Terminology (resident vs tenant):** In multifamily, the industry uses **resident** (not “tenant”) for the person living at the property. We use **resident** in product, UI, and customer-facing content for that person. In this TDD, **tenant** is used only in the **SaaS sense** = one customer organization (one PMC, one billing account). So: **resident** = person in the unit; **tenant** = our customer (the PMC). Where wording could be ambiguous in customer-facing material, prefer **resident** for the person in the unit and **customer** or **organization** for the PMC.

**2.1 Tenant, property, and org hierarchy**

- **Residents** live in **units**. Units plus amenities make up a **property**. **Property staff** (employees of the PMC) do the day-to-day work to run the property.
- **Roll-up:** Property → regional manager → … → asset manager → CEO. Reporting and goals flow down this chain; performance and outcomes flow up.
- **CID (Entrata):** In Entrata, a **CID** is one company (one PMC) that can manage **multiple properties**. For the platform: **one tenant (SaaS) = one PMC = one CID = one Entrata account**. That account can have multiple properties. We have one billing/organization boundary per tenant and one Entrata connection per tenant (one CID).

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  USERS: Residents / Prospects │ Staff │ Admins                                    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                          │
┌─────────────────────────────────────────────────────────────────────────────────┐
│  CHANNELS & ACCESS                                                               │
│  Portal, chat, SMS, voice │ Entrata/email/widget (Ecosystem) │ Auth, RBAC       │
└─────────────────────────────────────────────────────────────────────────────────┘
                                          │
┌──────────────────┬──────────────────┬──────────────────┬──────────────────────┐
│  ASSISTANT       │  VAULT           │  KNOWLEDGE       │  WORKFLOWS (Workato)  │
│  Agents (ELI+,   │  Unified doc     │  External/        │  Embedded white-label │
│  Intelligence,   │  store: SOPs +   │  regional        │  Recipe authoring +   │
│  Operations)     │  leases,         │  sources +       │  execution; triggers  │
│  + Source        │  addendums,      │  jurisdiction    │  from Vault, Escalations,   │
│  citation in UI │  contracts,      │  + research UI   │  events               │
│                  │  inspections     │                  │                       │
│                  │  Bulk ops,       │                  │                       │
│                  │  review tables   │                  │                       │
└──────────────────┴──────────────────┴──────────────────┴──────────────────────┘
                                          │
┌─────────────────────────────────────────────────────────────────────────────────┐
│  CORE SERVICES                                                                   │
│  Escalations │ Workforce (roles, teams, performance) │ Settings registry (from SOPs)   │
│  MCP layer (Entrata tools) │ Platform backend (sync, API to Entrata)            │
└─────────────────────────────────────────────────────────────────────────────────┘
                                          │
┌─────────────────────────────────────────────────────────────────────────────────┐
│  DATA & INTEGRATIONS                                                             │
│  Entrata API │ HRIS (HR platforms, reporting structure) │ Vault │ Knowledge index │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Component Specifications (Gap-Filling)

### 4.1 Vault (Unified Document Store — Including SOPs)

**Requirement:** First-class document store for all operational documents **and** SOPs. Closes the Harvey “Vault” gap and unifies “SOP library” with “portfolio documents.”

**4.1.1 Model**

- **Single store:** The **Vault** is the only document store. It holds:
  - **SOPs** (document type `sop`): versioned, approval workflow, optional embedded settings block (see ENTRATA-AND-SOP-SOURCE-OF-TRUTH.md §7). SOPs are the source of truth for operations and settings; they are also searchable, filterable, and subject to bulk operations like other docs.
  - **Operational documents** (leases, addendums, vendor contracts, inspections, work order attachments, notices, etc.): typed by `document_type`; organized by **property**, **unit**, **matter** (e.g. lease_id), **date**, **tags**; ingested from uploads, Entrata sync, or workflow outputs.
- **Metadata (all documents):** `id`, `document_type`, `property_id`, `unit_id` (optional), `matter_id` (optional), `title`, `created_at`, `updated_at`, `version` (for SOPs), `approval_status` (for SOPs), `tags`, `source` (upload / entrata / workflow). For SOPs only: `effective_date`, `settings_block` (extracted for registry).

**4.1.2 Organization and Search**

- **Folders/views:** By property, by type (SOP, lease, contract, …), by matter (e.g. “Lease #12345”). Filters: date range, tags, approval status (SOPs).
- **Full-text and semantic search:** So agents and users can find “all SOPs about maintenance escalation” or “all leases for Property X expiring in Q2.”
- **RAG:** Chunking and embedding for Vault documents; agents and staff assist retrieve from the Vault (SOPs + other docs as allowed by scope). **Which chunks were used** is recorded for source citation (see §4.5).

**4.1.3 Bulk Operations**

- **Bulk analysis:** “Run analysis across selected documents” (e.g. 50 leases): user selects N docs, chooses analysis type (e.g. “extract key dates,” “compliance check”), system runs agent or workflow and returns a structured result (e.g. table, report).
- **Bulk summarization:** “Summarize selected documents” or “Summarize all work orders for Property X this month”: same selection model, output is summary (and optionally review table).
- **Bulk tag / assign:** Apply tags or assign to person/team for selected items (for documents that support it).

**4.1.4 Review Tables**

- **Review table** = a structured view of **many items** (documents or records) with configurable columns (e.g. expiry, unit, status, notes), **bulk actions** (tag, assign, run workflow), and optional **one-click workflow** (e.g. “Lease renewal review”).
- Items can be **Vault documents** (e.g. “all leases expiring in Q2”) or **records from Entrata** (e.g. work orders, applications) surfaced in the platform. Review tables are a **UI + API** surface; workflows (Workato) can consume “selected items” as input.
- SOPs can appear in review tables when the view is “SOPs pending approval” or “SOPs by category.”

**4.1.5 Vault-Triggered Workflows**

- User selects a set of documents (and/or table rows) in the Vault (or a review table) and triggers a **Workato recipe** (e.g. “Lease review,” “Summarize selected,” “Bulk compliance check”). Platform passes selection (document IDs, context) to Workato; recipe can call back into platform (agents, MCP, APIs) or Entrata. So “select 20 leases → run workflow” is a first-class flow.

**4.1.6 SOPs Inside the Vault — Lifecycle**

- **Create/edit:** SOP is a document in the Vault with `document_type: sop` and optional YAML/JSON settings block (see ENTRATA-AND-SOP-SOURCE-OF-TRUTH.md §7).
- **Versioning:** Each save or approval creates a new version; history is retained.
- **Approval:** Approval workflow (draft → review → approved) is part of the Vault document lifecycle for type `sop`. On **approval**, the platform **extracts** the settings block and **writes** to the **settings registry** (so agents, workflows, and Escalations use the new config).
- **Consumption:** Agents and staff assist retrieve SOPs from the Vault via RAG (same as other docs); **only approved** SOPs (or versions) are used for grounding and for settings. Observability: which SOP chunks were used per response is stored for source citation.

**4.1.7 Document editor (create/edit)**

- **Editor:** [Tiptap](https://tiptap.dev/) is the specified **open-source rich text editor** for creating and editing documents in the Vault (including SOPs). Tiptap is headless, extension-based, and framework-agnostic (React, Vue, etc.), which fits embedding in the platform UI and optional future use for AI-in-editor flows (e.g. Tiptap AI Toolkit).
- **Rationale:** One unified editor for SOPs and other editable docs; full control over markup and behavior; strong DX and ProseMirror-based stability; optional paid features (Collaboration, Content AI, Documents) if needed later.
- **Scope:** In-app create/edit experience for Vault documents (SOP body, rich text content). Upload/import of existing files (e.g. DOCX) is separate (see Conversion/Documents if Tiptap Platform is adopted).

**4.1.8 Build Order**

- Vault data model and storage (document types, metadata, property/unit/matter).
- SOP as document type + versioning + approval workflow + settings extraction → registry.
- Search and filters; RAG pipeline for Vault (chunking, embedding, retrieval).
- Bulk operations (analysis, summarization) as workflows or agent runs over selected docs.
- Review tables (API + UI): define table types (e.g. leases expiring, work orders, SOPs pending).
- Document editor: integrate Tiptap for Vault create/edit (SOPs and other rich-text docs).
- Vault-triggered workflows: “selection + recipe” API and UI (integrate with Workato).

---

### 4.2 Workflow Builder: Workato (Embedded, White-Label)

**Requirement:** Customers design and deploy **custom** workflows without us building a custom workflow engine. **Workato** is the Workflow Builder: we hold a Workato license and **embed and white-label** it.

**4.2.1 Role of Workato**

- **Authoring:** Users build and edit **recipes** (workflows) in the Workato UI, embedded in our product (full-page iframe or widget as needed). White-label so the experience is our brand. The **Workflows** page is the primary place users open Workato (embedded), manage recipes, and set up automations across Entrata and other connectors.
- **Execution:** Workato runs the recipes; recipes can:
  - Call **our platform APIs** (e.g. “run agent,” “get Vault doc,” “create escalation item,” “trigger bulk analysis”).
  - Call **Entrata** (via our MCP or our backend API wrapper) for consistent auth and rate limits.
  - Use **lookup tables**, **connections** (we manage via Workato Embedded APIs), and **triggers** (schedule, webhook, or “trigger from platform” when user clicks “Run workflow” from Vault/review table).
- **Templates:** We ship **pre-built Workato recipes** (e.g. “Lead response,” “Maintenance triage,” “Lease renewal batch”) as templates customers can clone and adapt. Templates align with our agent types, MCP tools, and SOP–settings.

**4.2.2 Integration Points**

- **Auth:** JWT or Workato Embedded auth so that embedded UI is scoped to the current tenant/user. Workato docs: embedded connections, JWT, partner program.
- **Triggers from platform:** When a user selects documents in the Vault and clicks “Run workflow,” we pass the selection (and optional recipe ID) to Workato (webhook or Workato API) so the recipe runs with that context.
- **Platform as “connector”:** We expose a **Platform connector** (or REST app in Workato) so recipes can invoke: “run agent with prompt/context,” “retrieve Vault docs,” “write to settings registry” (admin only), “create task/escalation item.” This keeps workflow logic in Workato while core capabilities live in our backend.
- **Entrata:** Recipes do not call Entrata directly from Workato unless we expose Entrata as a connected app (e.g. via our backend proxy). Prefer: recipe calls **our API** → we call Entrata (or MCP) so credentials and policy stay in our control.

**4.2.3 Document-in / Document-out**

- Workato recipes can implement **document-in, document-out** flows: input = list of Vault document IDs (from Vault selection or review table); recipe calls our “bulk analysis” or “bulk summarize” API; output = report, review table, or updated docs. So Harvey-style “upload 10 leases → extract → review table” is a **recipe + platform API**, not custom engine.

**4.2.4 Build Order**

- Workato tenant and embedding (iframe, white-label, JWT/auth).
- Platform connector (REST app) for Workato: agent run, Vault read, Escalations/task create, bulk ops.
- Trigger-from-Vault: “selection + recipe” → webhook/API to Workato.
- Curate initial recipe templates (2–3) and document in Academy.

---

### 4.3 Knowledge (External / Regional Sources)

**Requirement:** Close the “Knowledge” gap: research across **internal** (Vault/SOPs) **and external** (state/city law, HUD, ordinances) with **jurisdiction awareness** and a **research** experience.

**4.3.1 Model**

- **Knowledge base** = indexed set of **external** (and optionally internal) documents that are **curated** and **jurisdiction-tagged**. Internal SOPs remain in the Vault and are also queryable; “Knowledge” here is the **external/regional** layer.
- **Jurisdiction:** Model (state, city, property_type, segment e.g. affordable). Every knowledge document (and every property in our system) has jurisdiction. Retrieval can be **scoped by jurisdiction** so “What’s the security deposit rule?” returns state/city-appropriate sources.
- **Sources (examples):** State landlord-tenant statutes, HUD guidance, local ordinances, fair housing materials. Ingested and chunked; metadata includes source URL, jurisdiction, effective date. We do not build “400 sources” on day one; we define the **schema and pipeline** and seed with one state + HUD + fair housing, then expand.

**4.3.2 Research Experience**

- **Research UI/flow:** User (or agent) asks a complex question (e.g. “What do we need to do for move-out in California for an affordable property?”). System queries **Vault** (SOPs, internal docs) **and** **Knowledge** (external, jurisdiction-filtered); combines and cites both in the answer. **Sources** are shown (internal doc + chunk; external doc + URL/section). So “research” = multi-source retrieval + citation, not a separate product.
- **Agent use:** Autonomous and intelligence agents can be **allowed** to query Knowledge (via a dedicated MCP tool or RAG endpoint) when the question scope is “research” or “compliance.” Settings (from SOPs) can enable/disable Knowledge per agent or function.

**4.3.3 Build Order**

- Jurisdiction model (state, city, property_type) in schema and in property/portfolio data.
- Knowledge document model and ingestion pipeline (chunk, embed, tag jurisdiction).
- Seed content: one state + HUD + fair housing.
- Retrieval API: query Vault + Knowledge with optional jurisdiction filter; return chunks + provenance.
- Research UX: “Ask” with source citation (see §4.5); agents allowed to use Knowledge when configured.

---

### 4.4 Ecosystem (“Where You Work”)

**Requirement:** Surface assistant (and key workflows) **inside existing tools** so PMs don’t have to leave their daily environment.

**4.4.1 Strategy**

- **Primary:** Our portal (web) for full experience (Vault, agents, Escalations, Workato, Academy).
- **Ecosystem (phased):**
  - **Goal: true unfettered access to Entrata.** We do not depend on a widget; the end state is full, integrated access. **Phase 1:** Entrata — integrate so PMs get assistant and workflows where they work (widget, sidebar, or portal deep-link per Entrata capabilities) (e.g. “Ask” or “Quick actions”) that calls our API with context (property, user). Same auth (SSO or token) so user is identified.
  - **Phase 2:** Email — optional **add-in** (Outlook/Gmail) so “draft reply using policy” or “create work order from this email” is available in the inbox.
  - **Phase 3:** Calendar or drive (e.g. “ask from SharePoint”) if demand and APIs allow.
- **Trusted sources narrative:** We document which systems we connect to (Entrata, Vault, Knowledge, Workato) and that answers are grounded only in designated sources (SOPs + Knowledge + Entrata as configured).

**4.4.2 Build Order**

- Document **Ecosystem roadmap** (Entrata first, then email) in product backlog.
- Entrata integration: API for “contextual ask” and “quick action”; lightweight embeddable UI; auth and tenant isolation.

---

### 4.5 Source Citation in UI and Export (Forensics)

**Requirement:** Every assistant/staff-assist answer or suggestion shows **which documents/chunks** supported it; **export** of interaction history for compliance and disputes.

**4.5.1 In-Product Citation**

- **Contract:** For every response from an agent or staff-assist suggestion, the backend already records **which Vault/Knowledge chunks were used** (from RAG). We **expose** this in the UI:
  - **Staff-facing:** Each answer or suggestion shows a “Sources” section: e.g. “Based on: [SOP Maintenance, §2], [Lease terms summary, chunk 3]” with links to open the doc (or chunk) in the Vault.
  - **Resident-facing:** Optional (per tenant): “Answer based on your community’s policies” with no need to list internal doc names; or “Policy summary” link if we generate a safe summary.
- **Implementation:** API returns `response` + `sources[]` (doc_id, doc_title, chunk_id or section, snippet); UI renders sources below the answer. Same for staff-assist suggestions in Escalations.

**4.5.2 Export and Forensics**

- **History Export API (or UI):** Filter by date range, user, property, or conversation. Export: prompt/query, response, sources (doc IDs, chunks), timestamp, agent_id. Format: JSON or CSV for compliance and “query forensics.” Access controlled (e.g. admin or compliance role).
- **Audit log:** All agent calls, tool calls, and doc retrievals are already in scope; ensure they are queryable and exportable for the same filters.

**4.5.3 Build Order**

- Backend: ensure every agent/staff-assist response includes `sources[]` in the payload.
- UI: “Sources” block in chat/Escalations for every answer/suggestion; link to Vault doc.
- Export: History Export API + UI (admin): filter, export prompts/outputs/sources.

---

### 4.6 Escalations (Human-in-the-Loop)

**Requirement:** **Escalations** is the surface for items that need human attention—from agents, workflows, or other triggers. Not all escalations are communication-based (e.g. some may be approval requests, workflow handoffs, or exception reviews). Every escalation reaches the right person; for conversation-based escalations, some require the human to **respond in-thread** (e.g. when the agent was confused). Catalog and design so **routing** (category, property, role, team) and **escalation type** are first-class.

**4.6.1 Model (aligned with Harvey/Sierra and DEEP-RESEARCH Part 7)**

- **Escalations = surface for escalated items.** Items can be **agent escalations** (conversation couldn't be resolved, guardrail hit, human requested), **workflow escalations** (approval, exception, handoff), **training / clarity** (agent asking for human guidance on how to respond to a situation), **policy or documentation improvement** (suggested SOP or doc change for human review), or other types. Each item has: **type** (e.g. conversation, approval, workflow, training, doc_improvement), **summary**, **suggested category** (e.g. leasing, maintenance, payments), context (conversation + customer, or workflow payload), and link to source (thread, workflow run, etc.).
- **Routing:** **Right escalation → right person.** Routing rules use category, property, team, role, escalation type, and (where configured) skills or availability so the right staff see the right work. **Categories** align with PMC functions (leasing, maintenance, payments, accounting, **compliance/legal**) so high-regulation items (e.g. eviction, accommodation, screening dispute) route to the correct function — **PMC-ORGANIZATION-WORKFORCE-RESEARCH.md §1** (core functions), **§8**; **MULTIFAMILY-REGULATION-AND-DUTIES-RESEARCH.md §3** (duties/functions with regulation touch). Workforce (roles, teams, property permissions) drives who sees what; configurable per tenant (e.g. by SOP-derived settings).
- **Human-in-the-loop (HIL) responses:** For **conversation-based** escalations, some require the human to **reply to a message that confused the agent** (e.g. clarify intent, provide a policy exception). The escalation item supports **continuing the conversation** (reply in thread) with **staff assist**: suggested replies and policy snippets from the same SOP set, one-click actions (e.g. create work order). Other escalation types (e.g. approval) have their own resolution flow.
- **Staff assist:** When a staff member is handling an **escalation item** (especially conversation-based), the UI suggests **replies and policy snippets** from the same Vault/SOP set the agent used, plus one-click actions (e.g. create work order, send notice). Same pattern as Sierra **Live Assist** (real-time guidance, drafts, one-click workflows) and DEEP-RESEARCH Part 7 (suggested replies from same doc set).

**4.6.2 Reference: Harvey and Sierra**

- **Harvey:** Document- and workflow-centric; escalation/handoff pattern is more relevant for resident-facing flows (our case).
- **Sierra:** **Live Assist** = when a human is in the loop, AI gives next-step guidance, auto-drafted responses, one-click workflows. Escalation uses **intent-based routing** and **conversation summaries** so handoff is smooth. Escalations (surface) + routing + staff assist = Sierra-style unified workforce. See HARVEY-SIERRA-RESEARCH.md §2 (Sierra) and DEEP-RESEARCH-PLATFORM-PARTS.md Part 7 (Escalations).

**4.6.3 Build Order**

- Phase 1: Escalations data model (item, type, summary, category, status, assignment); routing rules (category, property, team, type); staff assist (suggested replies/snippets when viewing conversation-based item). Ensure every agent escalation creates an escalation item with summary + category and is routable to the right person or team. Support escalation types: conversation, approval, workflow, **training/clarity** (agent asking how to respond), **policy/doc improvement** (suggested SOP or doc change). Extend for additional types as needed.

---

### 4.7 Academy / Get-Started — Including “Getting Started” Setup Page

**Requirement:** A **Getting Started** experience oriented around **system setup** so someone can get the system running easily: upload documents (train agents + compliance), connect Entrata, enable agents, set up workflows, configure voice and channels, and go live. Plus guided onboarding, checklists, short training, and expert workflow library so customers reach “first value” quickly.

**Research:** See **docs/research/GETTING-STARTED-SETUP-RESEARCH.md** for time-to-value, AI/platform onboarding, compliance document flows, PM go-live, and iPaaS first-workflow patterns. The step order and content below align with that research.

**4.7.1 Getting Started Page (Setup-Oriented)**

The **Getting Started** page (or wizard) is the primary in-product surface for setup. **Landing and visibility:** When setup is incomplete (e.g. go-live checklist not satisfied), users **land on Getting Started** as the default entry point. When the basic steps are complete (go-live checklist satisfied), the **Getting Started tab or section is hidden** and users land on **Command Center** (see §4.12) when opening the app.

Recommended step order:

1. **Account & organization** — Tenant, org name, admin, optional property/portfolio or Entrata link.
2. **Connect Entrata** — API credentials or OAuth; test connection; confirm properties/data available.
3. **Upload documents to the Vault** — Two goals made explicit:
   - **Train/ground agents:** SOPs and policies so agents answer and act according to procedures; SOPs also drive settings (per ENTRATA-AND-SOP-SOURCE-OF-TRUTH). Upload to Vault; for SOPs, versioning and approval apply.
   - **Compliance:** Tag docs for compliance (e.g. fair housing, lease terms, refund policy); optional **compliance checklist** (“Fair housing policy,” “Security deposit policy,” “Screening policy,” “Eviction procedures,” “Reasonable accommodation process,” etc.) so user sees what’s uploaded and what’s missing. Checklist items align with **MULTIFAMILY-REGULATION-AND-DUTIES-RESEARCH.md §2** (regulated activities), **§3** (duties with regulation touch); one upload flow serves both training and compliance.
4. **Enable and configure agents** — Choose which agents to turn on (Leasing AI, Renewal AI, Maintenance AI, Payments AI). Per agent: bind to **Vault** (Knowledge is available in Phase 3; see §4.3), set scope (properties/channels), optional template; test with sample question.
5. **Set up workflows** — Open Workato (embedded); create or enable first recipe (e.g. from template: “New lead → create task”); connect Platform + Entrata; test and activate.
6. **Set up voice (and channels)** — Configure voice: number/channel, greeting, voice (TTS) settings, which agent(s) handle voice. Enable other channels (chat, SMS, portal) and map to same agents. Optional test call.
7. **Review and go live** — **Go-live checklist**: Entrata connected, documents in place (and compliance checklist satisfied if used), at least one agent enabled, at least one workflow active, voice or another channel configured. “Run a test” (sample question or recipe); then “Go live” (e.g. make assistant available to residents/staff).

Progress is saved so the user can leave and return; progress indicator (e.g. steps 1–7 with checkmarks). Defaults and templates (e.g. one agent template, one Workato recipe template) so first value is reachable without building from scratch.

**4.7.2 Academy Scope (Training and Reference)**

- **Guided setup:** Same steps as Getting Started page; optional deeper checklist in dashboard (e.g. “Fair housing compliance,” “Go-live readiness”) with links to Vault, agents, Workato.
- **Short training:** Text or short video per topic (e.g. “Why connect Entrata,” “How SOPs control your agents,” “Using the Vault,” “Your first Workato recipe”). Hosted in-product or linked; linked from relevant Getting Started steps.
- **Expert workflow library:** Curated **Workato recipe templates** (and agent templates) with descriptions and “Use this” (clone and adapt). Documented so PMCs can adopt and adapt.

**4.7.3 Build Order**

- Define “first value” (e.g. first resident question answered by agent, or first recipe run).
- **Getting Started page:** Step order 1–7; progress persistence; per-step UI (account, Entrata connection, Vault upload with train + compliance, agents enable, Workato first recipe, voice/channels, go-live checklist).
- Compliance checklist (optional): list of recommended docs; tag and tick as uploaded.
- Academy content structure (pages or links); 2–3 initial checklists and 3–5 training topics; link from Getting Started steps.
- Expert workflow library: list of template recipes + docs; “Use this” clones recipe in Workato.

---

### 4.8 Collaboration (External, Shared Spaces)

**Requirement:** Support **external** collaboration (e.g. owner + operator) and **shared spaces** (shared matter/space with defined visibility and actions).

**4.8.1 Model**

- **Spaces:** A **space** is a named container (e.g. “Property Alpha – Owner view,” “Deal 2025-01”) with:
  - **Members:** Internal (our platform users) and/or **external** (invited by email, limited role).
  - **Permissions:** What members can see (e.g. Vault docs in this space, Escalation items for this space) and do (view, comment, run workflow, or admin).
  - **Contents:** Optional association of Vault folders, Escalations views, or workflows to the space so that “everything for this property” or “this deal” is in one place.
- **Audit:** All access and actions in a space are audited (who saw what, who ran what).

**4.8.2 Build Order**

- Phase 2 after core (Vault, agents, Workato, Knowledge, citation). Schema: spaces, members, roles, permissions; UI: create space, invite external, manage permissions.
- Associate Vault views and Escalations filters to spaces; enforce visibility in APIs.

---

### 4.9 Trust and Security Narrative

**Requirement:** Trust/Security as a **product surface**: certifications (or roadmap), data handling, “sources you trust.” The platform must also align with **multifamily regulation** and **PMC org structure** so that both AI and human workforce operate within the same rules and routing matches how customers organize.

**4.9.1 Content**

- **Trust page (or section):** (1) Certifications — SOC2, ISO 27001, GDPR alignment (or “in progress” with roadmap). (2) Data — where data is stored, encrypted, retention. (3) “Sources you trust” — answers grounded only in your approved SOPs (Vault), designated Knowledge, and Entrata data; no training on your content.
- **In-product:** Short “How we protect your data” and “How answers are grounded” in settings or help.

**4.9.2 Regulation and high-risk activities**

Multifamily is regulated at federal (FHA, HUD, LIHTC), state (landlord-tenant, deposits, eviction, licensing), and local levels. **Both AI and humans** must stay within those regulations; housing providers remain responsible even when using AI or third parties.

- **High-regulation activities** (screening, eviction, reasonable accommodation, refunds/waivers, lease terms, advertising) get **deterministic guardrails** (policy checks, required-docs) and **human approval or escalation** where the law or risk requires it. Activity list and AI/human obligation: **MULTIFAMILY-REGULATION-AND-DUTIES-RESEARCH.md §2** (table) and **§4.3** (platform implications). Settings (from SOPs) and **jurisdiction** (state, local) + **segment** (e.g. affordable) determine which policies and Knowledge apply per property.
- **Escalation categories** align with PMC functions (leasing, maintenance, payments, **compliance/legal**) so high-risk items (e.g. eviction, accommodation denial, screening dispute) route to the right team and receive human review. Functions and routing: **PMC-ORGANIZATION-WORKFORCE-RESEARCH.md §1** (core functions), **§8** (summary table).
- **Workforce scope:** Roles, teams, and routing support **property**, **portfolio**, and (where needed) **region**; “region” can be represented as a portfolio or group of portfolios so reporting and routing match centralized and regional PMC structures. **PMC-ORGANIZATION-WORKFORCE-RESEARCH.md §4** (centralization), **§8** (platform design).

**4.9.3 Build Order**

- Copy and roadmap for Trust page; publish as doc or in-product page. Security and compliance work (certifications) tracked separately; architecture supports audit and isolation (tenant, encryption, no training on customer data). Guardrails and approval gates for high-regulation actions are implemented per agent and workflow (Phase 1–2).

---

### 4.10 Segment Solutions (Affordable, Student, Military, etc.)

**Requirement:** Product can be **segment-aware**: different workflows, knowledge, and guardrails per segment (affordable, student, military, conventional, single-portfolio, large operator).

**4.10.1 Model**

- **Segment** = a tenant-level or property-level attribute (e.g. `affordable`, `student`, `military`). Used to:
  - Filter **Knowledge** (e.g. LIHTC, HUD for affordable).
  - Recommend **recipe templates** and **SOP templates** (e.g. “Affordable housing pack”).
  - Apply **guardrails** or **required docs** (e.g. fair housing + income certification for affordable).
- **Solution packs (optional):** Bundles of SOP templates, Workato recipes, and Knowledge filters that we ship per segment; customer enables and adapts.

**4.10.2 Build Order**

- After core and Knowledge: add segment to tenant/property schema; filter Knowledge and templates by segment. Solution packs = curated content (SOPs, recipes) per segment; can be Phase 3.

---

### 4.11 Outcome Metrics and Value Narrative

**Requirement:** Expose **outcome metrics** so operators see the value of AI agents and can be urged to configure agents they are not yet using. If we can quantify the value an agent brings, we can tell the user the value they are missing and prompt them to enable or tune that agent.

**Dual value of AI (must be implemented):** AI provides value in **two ways**, and the platform must surface both: (1) **Saves staff time** — labor displaced, units per staff, effective capacity (same or fewer people supporting more units). (2) **Increases asset value** — by driving outcomes that directly affect property value: **renewals** (retention, rent growth with less turn/vacancy), **leasing** (conversions, time-to-lease, cost per lease), and **maintenance** (work orders handled, resident experience, condition of the property). So metrics and the value narrative must include both labor/efficiency and revenue/asset-impact (renewal rate, occupancy, rent growth, cost per lease, maintenance resolution) so operators see that AI is not only an efficiency lever but an **asset-value lever**.

**4.11.0 Asset manager goals, causation, and why health metrics matter**

*Full narrative (how metrics drive staffing and AI value): **docs/research/METRICS-STAFFING-AI-VALUE.md**.*

- **Goals at the top:** The **asset manager** (corporate) sets **goals** for properties based on strategy: **sell** or **keep**. If **keep**, they focus on **increasing yield** (e.g. raising rent) or **must raise rent** to fund **preventative maintenance** and operations.
- **Renewal vs new lease:** The best way to raise rent is **renewing current residents** — it avoids unit turn, vacancy (lost rent), and cost to acquire a new resident. If renewal terms are not accepted, the property must secure a **new lease**, which is more expensive (turn cost, vacancy, acquisition cost). So **renewal rate** and **cost per lease** are directly tied to economics.
- **Causation and correlation:** There is a **real connection** between **work getting done** (maintenance completed, leasing response time, resident experience, follow-up) and **whether a resident renews or a lead decides to lease**. That flows into the **asset manager’s goal** (yield, occupancy, rent growth). The Performance surface and outcome metrics should make this chain visible: work done → renewal/lease outcomes → property and portfolio goals.
- **Health metrics to surface:** Informed by the above: **renewal rate**, **occupancy**, **rent growth**, **delinquency**, **turnover**, **cost per lease** (or cost to acquire), **preventative maintenance** (or work order resolution), and — where data allows — **resident satisfaction** or **time-to-lease** as leading indicators. These are sourced from **Entrata** (or synced data layer); exact list and attribution remain product backlog. Architecture assumes we can query Entrata for these KPIs.
- **Why workforce and this platform:** As **rent and costs rise**, PMCs’ two main levers to protect margins are **reduce staff** or **cut software** (their largest expenses). They need to **understand and manage their workforce** (AI + human) so they can preserve or improve outcomes without unsustainable headcount. The platform exists to help them see that connection and act on it (Command Center, Performance, Agent Roster, Workforce).

**4.11.1 Metrics to Expose (product backlog)**

- **Revenue impact of AI agents** — Revenue attributed to or influenced by agent-handled conversations (e.g. leases, renewals, upsells).
- **Labor hours displaced** — Estimated staff time saved by agents (e.g. from resolved conversations, automated tasks).
- **Hidden revenue found** — Revenue recovered or identified by agents (e.g. fees, renewals, follow-ups that would otherwise be missed).
- **Agent accuracy** — Correctness or appropriateness of agent responses (e.g. from feedback, spot checks, or evaluation pipeline).
- **Impact by agent type** — Breakdown by ELI+, Intelligence, and Operations agents (e.g. volume, resolution rate, revenue impact per type).
- **Top performing agents** — Ranked by outcome (resolution rate, revenue impact, satisfaction, or tenant-defined KPIs).
- **Task distribution: humans vs AI agents** — Share of tasks or conversations handled by agents vs staff (and trend over time).
- **Workforce breakdown** — Count of **active AI agents** (by type and by bucket) and **active humans** (by role/team); effective capacity view.
- **Effective capacity** — Combined capacity of humans + agents (e.g. units or conversations per FTE equivalent).
- **Units per staff** — Operational efficiency (units/residents per staff member), with and without agent contribution.
- **Agent cost vs labor** — Cost of running agents (e.g. inference, platform) vs comparable labor cost to illustrate ROI.

**4.11.2 Value narrative and “configure this agent”**

- Use metrics to **surface “value you’re missing”** when an agent is off or under-configured (e.g. “Leasing AI is off at Property X; similar properties see N leads/week and $Y impact”).
- In-product prompts or Academy content to **urge configuration** of agents that would add the most value for that tenant or property.

**4.11.3 Performance surface (insights, not only BI)**

- The **Performance** page presents outcome metrics in an **insights-oriented** way: not only charts and tables but **correlation and causation** (e.g. why a metric moved) and **guidance to change trajectory** toward a goal (e.g. “occupancy down; leasing resolution rate is low — consider X”). Implementation should favor insights and recommendations over raw BI where data and attribution allow.
- **Key PM health metrics** (e.g. occupancy, rent growth, delinquency, turnover) are surfaced alongside workforce outcome metrics; sourced from **Entrata** (or data layer) so the Performance page combines property-management KPIs with AI/human performance. Exact list and attribution are product-backlog; architecture assumes we can query Entrata (or synced data) for these KPIs.

**4.11.4 Build Order**

- Phase 1: Define which metrics are in scope for v1 (e.g. conversation count, escalation rate, agent vs human task split); implement data collection and a first reporting surface. Expand to full list (revenue impact, labor displaced, accuracy, etc.) in Phase 2–3 as data and attribution are available.

---

### 4.12 Command Center (Landing Dashboard)

**Requirement:** When Getting Started is complete, **Command Center** is the **default landing page** when users open the app. It aggregates **what needs to get done** and **how the workforce is performing** so the user can **orchestrate the workforce** and **focus effort**. A key goal is **insights on where to look**.

**4.12.1 Content**

- **What needs doing:** Summary of Escalations (e.g. counts by category, property, or priority; high-priority or overdue items); **suggested “where to look”** (e.g. “Most escalations this week: Maintenance at Property A”) so the user can direct attention.
- **Workforce performance:** Key outcome metrics (from §4.11): conversation count, escalation rate, agent vs human task split, units per staff, effective capacity, or tenant-selected KPIs. Trends and comparisons (e.g. vs last period, vs similar properties) where available.
- **Orchestration:** Links or entry points into Escalations (to act on items), Performance (deeper metrics and insights), and Agent Roster or Workforce so the user can focus effort and adjust configuration.

**4.12.2 Build Order**

- After Escalations and outcome-metrics data: Command Center page (or dashboard); aggregation of escalation summary + key metrics; “where to look” logic (e.g. top categories or properties by volume or SLA). Default landing when go-live checklist is satisfied (see §4.7.1).

---

### 4.13 Agent Roster (Agent Management)

**Requirement:** A dedicated **Agent Roster** (or agent management) surface where users **create, find, and manage AI agents**. View across **categories**, **status**, and **types**; **manage and set up** agents; when viewing an **individual agent**, see **performance and value** for that agent.

**4.13.1 Model**

- **List view:** All agents (ELI+, Intelligence, Operations) with filters by **bucket/category** (Revenue, Leasing, Resident Relations, Maintenance, Compliance), **status** (active, paused, draft), and **type** (autonomous, intelligence, operations). Create new agent (from template or from scratch).
- **Per-agent view:** Configuration (scope, Vault/Knowledge binding, channels, tools_allowed, guardrails) plus **performance and value** for that agent: e.g. conversation count, resolution rate, escalations, revenue impact (when available), so the user can assess and tune.

**4.13.2 Build Order**

- With Phase 1 agents: Agent Roster list (filters, create); per-agent detail (config + performance). Expand performance metrics as §4.11 data and attribution mature.

---

### 4.14 Voice (Configuration)

**Requirement:** A **Voice** configuration surface for **how agents talk and behave** and **communication methods**. Support **unified** (one voice for the tenant) or **per-property** voice. **Controlled phrasing and terms** — e.g. terms to avoid or require — especially for **regulated areas** (screening, accommodations, advertising) so the AI does not misspeak.

**4.14.1 Model**

- **Scope:** Tenant-level **unified voice** (one branding/tone for all properties) or **per-property voice** (each property can have its own voice settings). Configurable per tenant.
- **Content:** Branding and tone (how agents identify the company, tone of voice); communication methods (channels, numbers, which agent handles which channel); **controlled phrasing** — prohibited or required phrases, terms, or disclosures, with optional tagging for regulated areas (fair housing, lease terms, etc.). Feeds into agent prompts and output filters (see §5.5, §5.7).

**4.14.2 Build Order**

- With voice stack (§5.8) and segment/property scope (§4.10): Voice config page; unified vs per-property; phrasing/terms list and tagging. Integrate with prompt and config management (§5.7) so Voice settings apply at runtime.

---

### 4.15 Tools (MCP Configuration)

**Requirement:** A **Tools** page where users **set up and activate** **Entrata MCP tools** and **external MCP tools** for use when creating or configuring agents. Enables “create your own agents” with the right tool set.

**4.15.1 Model**

- **Available tools:** List of MCP tool servers (or connectors): **Entrata** (internal platform tools and/or external Entrata MCP) and **external MCP** (customer or third-party). Per tool: enable/disable, scope (which agents or properties can use it), connection status.
- **Agent assignment:** When configuring an agent (Agent Roster), user selects which tools that agent can call; Tools page is where the tenant enables and configures the underlying MCP servers and connections. See §6 (internal vs external Entrata tools) and ENTRATA-AND-SOP-SOURCE-OF-TRUTH.md §8.

**4.15.2 Build Order**

- With Agent Roster and MCP layer: Tools page (list of MCP servers/connectors, enable/configure, scope). Phase 1 can ship with Entrata-only; external MCP as connector model is defined.

---

### 4.16 Governance (Configuration Page)

**Requirement:** A **Governance** page to **configure guardrails** and **reduce liability** — both **multifamily-specific** (regulated activities) and **general AI** best practices. Users set guardrails, required-docs, approval rules, and (where applicable) general AI governance settings in one place.

**4.16.1 Model**

- **Guardrails by activity or agent:** Configure which high-regulation activities (screening, eviction, reasonable accommodation, refunds, lease terms, advertising) require **approval gates**, **required-docs**, or **deterministic policy checks**. Can be scoped by agent, property, or segment. Implements §4.9.2 (regulation and high-risk activities) in a **config UI**.
- **Required-docs checklist:** Per activity or per agent, require that certain doc types (e.g. screening policy, fair housing policy) are in the Vault and approved before the agent can act. Surfaces and extends the compliance checklist from Getting Started (§4.7).
- **General AI governance:** Optional settings for general AI liability best practices (e.g. human-review toggles, audit retention, output filters). Complements multifamily-specific guardrails.

**4.16.2 Build Order**

- After §4.9.2 and guardrail implementation: Governance page (guardrails by activity/agent, required-docs, approval rules). Can be Phase 2–3 as guardrail engine and settings mature.

---

## 5. AI-Native Foundations

These are the **technical and operational foundations** that must be defined and built for the platform to run reliably as an AI-native system. They are the single source of truth for “how AI runs” in this doc; details and rationale live in **docs/research/AI-NATIVE-PLATFORM-REQUIREMENTS.md**.

### 5.1 Model & Inference Layer

- **Model strategy:** Define provider(s) and model(s) per use case (e.g. primary model for agents; optional smaller model for routing/classification). Document in TDD or runbook; no “decide later.”
- **Fallbacks and retries:** Behavior when the model is down or rate-limited (retry with backoff, fallback model, or graceful “try again later” to user).
- **Timeouts:** Max wait per LLM call and per full turn so conversations don’t hang.
- **Cost and rate controls:** Per-tenant or per-user limits (e.g. requests/month) and/or budget alerts; one tenant cannot exhaust capacity.

### 5.2 RAG Pipeline (Vault & Knowledge)

- **Embedding model:** Which model (and provider) for embeddings; same for Vault and Knowledge or separate if needed.
- **Chunking:** Strategy (size, overlap, by section/heading for SOPs); run on ingest (preferred) or on demand.
- **Vector store:** Where vectors live (e.g. Pinecone, pgvector, vendor DB); scoped per tenant or tagged by tenant.
- **Retrieval:** Top-k (or equivalent), reranking (e.g. cross-encoder) to mitigate “lost in the middle”; filters (property, doc type, approval status).
- **Invalidation:** When a Vault or Knowledge doc is updated or deleted, refresh or invalidate embeddings/indices so agents never use stale content.

### 5.3 Agent Runtime & Sessions

- **Runtime host:** A dedicated backend service runs the agent loop (orchestrates LLM + MCP + RAG). Not the frontend or Workato.
- **Session and conversation persistence:** Store conversation history per resident and per staff thread; define where (DB/store) and retention so multi-turn and handoff have full context.
- **Context assembly:** Per request, define what is in the payload: system prompt, selected SOPs/chunks, last N turns, current user/resident/property, tool results. Bounded and consistent every time.
- **Long-conversation handling:** Context pinning (re-inject critical rules/SOPs near the latest turn); policy for when to summarize or truncate history so the model doesn’t “forget.”

### 5.4 Observability & Evaluation

- **Tracing:** Every LLM request (model, tokens in/out, latency) and every tool call (name, params, result, errors). Trace ID ties a full conversation or task for debug and audit.
- **Metrics and alerting:** Success/failure rate, latency (e.g. p50/p99), token usage per tenant/agent. Alerts when error rate or latency crosses a threshold.
- **Evaluation pipeline:** Where feedback (thumbs up/down, “submit feedback”) is stored; who reviews it; how it drives changes (prompt edit, SOP update, or flag for training). Optional: regression or smoke tests before deploying agent/prompt changes.
- **Logging:** Structured logs (request id, tenant, user, agent, outcome) with PII handling (redact or hash in logs).

### 5.5 Safety & Reliability

- **PII handling:** Policy for PII in logs, traces, and context sent to models (e.g. redact in non-production; tenant data never in vendor training).
- **Prompt injection:** Stated approach (e.g. input sanitization, model instructions to ignore “ignore previous instructions,” or both).
- **Output filters:** Optional blocklist or content filter on model output (e.g. block phrases that imply “we have no policy” when policy exists).
- **Circuit breaker / kill switch:** Ability to disable an agent or a tenant’s agents quickly (abuse, quality collapse, or incident).

### 5.6 Identity & Scoping at Runtime

- **Resident/guest identity:** How the system knows who is chatting (e.g. portal → Entrata resident ID; SMS → phone → link to resident or “unknown”). Enables “your lease” and correct data scope.
- **Request-level scope:** Every agent request tagged with tenant, property (if known), resident or user, channel. Used for: which SOPs/docs are in scope, which Entrata data the agent can see, and audit.
- **Multi-tenant isolation:** Guarantee that data, documents, and agent config are strictly isolated by tenant (no cross-tenant leakage in RAG, MCP, or logs).

### 5.7 Prompt & Config Management

- **Where prompts live:** System prompts and per-function instructions stored in DB or config, not only in code, so “how the agent talks” can change without a code deploy.
- **Versioning:** When a prompt or agent config is changed, version it; optional A/B test before full rollout.
- **Update workflow:** Change prompt → run tests or comparison → deploy to production. So feedback and “self-learning” lead to prompt updates in a controlled way.

### 5.8 Voice Stack

- **Telephony:** Provider (e.g. Twilio, Vapi, Retell) and how calls are routed to the platform (webhook or SDK).
- **STT and TTS:** Who provides speech-to-text and text-to-speech; latency budget (e.g. &lt;500 ms for TTS) so conversations feel natural.
- **Voice-specific UX:** Interruption (barge-in), hold music, transfer to human (how handoff is signaled to the telephony layer).
- **Testing:** How to test voice (e.g. test number, “test call” in Getting Started) before go-live.

### 5.9 Events & Extensibility

- **Outbound events:** What the platform emits (e.g. `conversation.ended`, `work_order.created`, `escalation.created`) and payload/auth so other systems or Workato can react without polling.
- **Public or partner API:** If third parties or Entrata will call the platform (e.g. “run agent with context,” “return suggested reply”), define stable API and auth.
- **Webhooks:** Optional webhooks for key actions (e.g. “when agent escalates, POST to this URL”) for custom integrations.

### 5.10 Continuous Improvement Loop

- **Feedback capture:** Where feedback is stored (e.g. thumbs down + conversation id + optional comment) and linked to the trace (prompt, chunks, tool calls).
- **Review and triage:** Who reviews feedback (e.g. ops or customer success) and how they decide “change prompt,” “add SOP,” or “escalate to eng.”
- **Deploying changes:** How a prompt or SOP change goes from “approved” to production (e.g. edit in UI → version → test → promote). Loop: feedback → change → deploy → measure.
- **LLM-as-judge:** If used, only in addition to human review (per MAP research), not as the only gate.

---

## 6. Cross-Cutting: Agents, Entrata, MCP, Settings

- **Agents:** As in AGENT-TYPES-TAXONOMY.md and DEEP-RESEARCH-PLATFORM-PARTS.md. They consume **Vault** (RAG) and **Knowledge** (when enabled); **settings** (from SOPs in the Vault) control escalation, SLA, tools_allowed, guardrails. **Source citation** is required for every response (§4.5).
- **Agent buckets (five):** All agents are grouped under one of: **Revenue & Financial Management**, **Leasing & Marketing**, **Resident Relations & Retention**, **Operations & Maintenance**, **Risk Management & Compliance**. Used for product organization, permissions, and segment/template mapping.
- **Initial ELI+ agents (four):** At launch we ship four autonomous (ELI+) agents: **Leasing AI**, **Renewal AI**, **Maintenance AI**, **Payments AI**. Additional ELI+, Intelligence, and Operations agents can be added within the five buckets over time.
- **Agent tools: internal vs external Entrata:** Agents can use **internal** and **external** Entrata-related tools. **Internal (platform) tools** are MCP tools exclusive to our platform that connect to Entrata through our workflows and APIs; they provide **guide rails and governance** (validation, audit, approval flows, scoping) before any action reaches Entrata. **External Entrata tools** wrap or call Entrata more directly (e.g. standard Entrata MCP server). Prefer internal tools where governance and policy enforcement matter; external tools can be exposed for read-heavy or lower-risk use. See ENTRATA-AND-SOP-SOURCE-OF-TRUTH.md §8.
- **Entrata:** Backend uses Entrata API for sync and non-agent workflows; agents use **MCP tools** (internal platform tools and/or Entrata MCP server) as above. See ENTRATA-AND-SOP-SOURCE-OF-TRUTH.md §8.
- **Settings registry:** Populated from **approved SOPs** in the Vault (settings block extraction). Consumed by agent runtime, Workato (via our API), and Escalations. See ENTRATA-AND-SOP-SOURCE-OF-TRUTH.md §7.
- **Workforce and HRIS:** We plan for an **HRIS** integration so the platform can consume **reporting structures** (org chart, manager hierarchy, role/team membership). Tenants may use **different HR platforms** (e.g. Workday, BambooHR, Rippling, ADP, or others); we support a **connector or normalized API** so roles, teams, and “who reports to whom” are available for Escalations routing, permissions, and performance (e.g. units per manager, team). HRIS is the source of truth for reporting structure; platform syncs or queries as needed and applies it to Workforce (roles, teams, property/portfolio scope).

- **Workforce page (org chart view):** A **Workforce** surface shows the **org chart of the future**: **AI agents and human staff** together, **team-focused** and as an **org chart**. Emphasis on **JTBD** (jobs to be done): who is working on what problem and how that rolls up as an organization. Supports property, portfolio, and (where represented) region. Implements PMC-ORGANIZATION-WORKFORCE-RESEARCH (structure types, functions, centralization). Build: after HRIS and agent assignment; org-chart UI with AI and human placement and roll-up by team/function.

---

## 7. Build Phases (Summary)

| Phase | Focus | Delivers |
|-------|--------|----------|
| **1 – Foundation** | Vault (model, SOPs as doc type, versioning, approval, settings extraction); Entrata API + MCP; four ELI+ agents (Leasing, Renewal, Maintenance, Payments); Escalations + handoff | Single doc store with SOPs; agents grounded in Vault; settings from SOPs; Entrata via API + MCP |
| **2 – Vault complete + Workato** | Bulk ops, review tables, Vault-triggered workflows; Workato embed, platform connector, trigger-from-Vault; source citation in UI + export | Full Vault (Harvey-like); custom workflows via Workato; citation and export |
| **3 – Knowledge + Academy** | Knowledge model, jurisdiction, seed content, research flow; Academy (guided setup, checklists, templates, expert library) | External/regional knowledge; research experience; onboarding and training |
| **4 – Ecosystem + Collaboration** | Entrata widget (or first “where you work”); Spaces and external collaboration | AI/workflows in existing tools; shared spaces and external parties |
| **5 – Segment + Trust** | Segment attribute; solution packs; Trust page and narrative | Segment-aware product; trust and security as product |

---

## 8. Dependency Graph (What Must Exist Before What)

- **Vault (base) + SOPs + settings extraction** → before agents can use “SOPs as source of truth” and before Workato recipes can reference “Vault selection.”
- **Entrata API + MCP** → before agents can perform Entrata actions and before Workato can orchestrate Entrata via our API.
- **Agents (at least one)** → before Workato “run agent” step and before source citation has a consumer.
- **Source citation (backend)** → before we can show sources in UI and before History Export.
- **Workato embed + platform connector** → before Vault-triggered workflows and before “Workflow Builder” is done.
- **Knowledge index + jurisdiction** → before research experience and segment filtering of knowledge.
- **Spaces model** → before external collaboration and shared spaces.

---

## 9. Gap Closure Checklist (vs HARVEY-GAP-ANALYSIS-MULTIFAMILY.md)

| Gap | How TDD addresses it | Section |
|-----|----------------------|---------|
| **Vault + bulk** | Vault is the single document store; SOPs are a document type in it. Bulk analysis, bulk summarization, review tables, Vault-triggered workflows are specified. | §4.1 |
| **Knowledge** | Knowledge layer (external/regional, jurisdiction, research experience) is specified; build order and integration with agents and citation. | §4.3 |
| **Source citation in UI + export** | Every response includes sources; UI shows them; History Export API/UI for forensics. | §4.5 |
| **Workflow Builder** | Workato embedded and white-label; platform connector; trigger from Vault; document-in/document-out via recipes + our API. | §4.2 |
| **Ecosystem** | Roadmap: Entrata widget first, then email add-in; “where you work” strategy. | §4.4 |
| **Escalations** | Surface for escalated items (multiple types: conversation, approval, workflow); routing; HIL; staff assist. | §4.6 |
| **Academy / Get-started** | Guided setup, checklists, training, expert workflow library (Workato templates). | §4.7 |
| **Collaboration** | Spaces, external members, permissions, audit. | §4.8 |
| **Trust narrative** | Trust page/section: certifications, data, “sources you trust.” | §4.8 |
| **Segment solutions** | Segment attribute; filter Knowledge and templates; solution packs. | §4.10 |
| **Drafting** | Can be implemented as a Workato recipe + “draft from template” API using Vault docs; or a dedicated flow in Phase 2/3. | §4.2, backlog |

---

## 10. Workato Reference

- **Embedding:** Workato Fully Embedded (docs.workato.com/oem/workato-embedded); white-label integration experience (workato.com/the-connector/white-label-integration).
- **Auth:** JWT-based auth for embedded UI; deep linking (docs.workato.com/oem/embedded-connections).
- **APIs:** Customer account creation, recipe management, connections, execution jobs (docs.workato.com).
- **Embed Partner Program:** Referral and recipe compliance (docs.workato.com/oem/partner-program).

---

## 11. Document History

| Version | Date | Change |
|---------|------|--------|
| 0.1 | Feb 2025 | Initial TDD: architecture, Vault+SOPs, Workato, Knowledge, citation, Academy, Collaboration, Ecosystem, Trust, segments; build phases; gap closure. |
| 0.2 | Feb 2025 | Added §5 AI-Native Foundations (model & inference, RAG, agent runtime & sessions, observability, safety, identity & scoping, prompt management, voice stack, events & extensibility, continuous improvement). Renumbered former §5–§10 to §6–§11. |
| 0.3 | Feb 2025 | §4.1.7 Document editor: specified Tiptap as open-source rich text editor for Vault create/edit (SOPs and other docs); added to build order. |
| 0.4 | Feb 2025 | §6 Cross-Cutting: internal vs external Entrata tools — platform-exclusive (internal) tools for guide rails and governance; external Entrata MCP for direct path. ENTRATA-AND-SOP-SOURCE-OF-TRUTH.md §8.2.1 and §8.3 updated. |
| 0.5 | Feb 2025 | Phase 1: all four ELI+ agents confirmed. §4.6 Escalations added (escalation types, routing, HIL, staff assist; Harvey/Sierra ref). Academy renumbered to §4.7; Collaboration §4.8, Trust §4.9, Segment §4.10. §4.11 Outcome Metrics and Value Narrative (full list + "value you're missing"). Ecosystem §4.4: goal = unfettered Entrata access (not widget-dependent). Getting Started step 4: Vault only for Phase 1 (Knowledge = Phase 3). GETTING-STARTED-SETUP-RESEARCH and TDD-GAPS-AND-CLARIFICATIONS updated. |
| 0.6 | Feb 2025 | Renamed "Inbox" to **Escalations** throughout; §4.6 title and body; event `escalation.created`; diagram, Cross-Cutting, Gap Closure, phases; ENTRATA-AND-SOP, DEEP-RESEARCH, TDD-GAPS, READMEs updated. |
| 0.7 | Feb 2025 | **HRIS:** Upstream and Data & Integrations include HRIS (multiple HR platforms) for reporting structures. §6 Cross-Cutting: Workforce and HRIS (connector/normalized API for org chart, roles, teams). PMC-ORGANIZATION-WORKFORCE-RESEARCH §7 added (HRIS as source of truth for reporting structure). |
| 0.8 | Feb 2025 | **Regulation and org alignment:** §4.9.2 Regulation and high-risk activities (reference MULTIFAMILY-REGULATION-AND-DUTIES-RESEARCH; guardrails and approval for screening, eviction, accommodation, refunds; jurisdiction + segment; escalation categories include compliance/legal; region as portfolio/group). §4.6 routing categories align with PMC functions. §4.7 compliance checklist adds screening, eviction, accommodation. Research refs in header. TDD-GAPS §6 Platform accommodations. |
| 0.9 | Feb 2025 | **App pages and goals (docs/product/APP-PAGES-AND-GOALS.md):** §4.7.1 Getting Started = default landing when setup incomplete, tab hidden when complete. §4.6 escalation types: training/clarity, policy/doc improvement. §4.11.3 Performance surface = insights-oriented (correlation, causation, trajectory). **§4.12 Command Center** (landing dashboard: what needs doing + workforce performance + where to look). **§4.13 Agent Roster** (list, filters, per-agent config + performance). **§4.14 Voice** (config: unified vs per-property, controlled phrasing/terms for regulated areas). **§4.15 Tools** (MCP config page). **§4.16 Governance** (config page: guardrails, required-docs, approval, liability). §6 Workforce page (org chart: AI + human, JTBD, team roll-up). §4.2.1 Workflows page = primary Workato embed. |

*Keep this doc updated as we lock stack choices, APIs, and phase scope.*
