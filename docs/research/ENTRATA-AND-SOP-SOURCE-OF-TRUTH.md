# Entrata Integration & SOPs as Source of Truth for Operations and Settings

**Purpose:** Capture two vital platform constraints: (1) the AI platform is **bolted on top of Entrata** (PHP backend), using Entrata’s functionality via **APIs and MCP tools**; (2) **SOPs are the source of truth** for both **operations** (the procedures the workforce does) and **settings** (SOPs access and control the settings). Research below supports integration patterns and document-driven operations/settings.

**Architecture:** SOPs live in the **Vault** (unified document store). The Vault holds SOPs and all other operational documents; SOPs are document type `sop` with versioning, approval, and settings extraction. See **docs/architecture/TDD-ARCHITECTURE.md §4.1** for the full Vault + SOP design and build order.

---

## 1. Platform Position: “Bolted On Top of Entrata”

### 1.1 What This Means

- **Entrata** is the existing property management system (PMS): leases, residents, work orders, accounting, leasing, etc. It has a **PHP backend** and remains the system of record.
- The **AI platform does not replace Entrata.** It sits **on top** and adds:
  - AI agents (autonomous, intelligence, operations)
  - Orchestration, escalations, workflows, documents
  - Voice/channels and staff assist
- Entrata’s functionality is used by the platform through:
  - **APIs** — direct integration to read/write data and trigger actions in Entrata.
  - **MCP tools** — Entrata capabilities exposed as tools so agents can discover and call them in a standardized way (role, goal, functions → MCP tool calls that hit Entrata under the hood).

So: **one system of record (Entrata), one AI layer on top that uses it via APIs and MCP.**

### 1.2 Entrata API Context (Research)

**Documentation and gateway**

- Entrata provides **API documentation** at **docs.entrata.com/api/v1/documentation** (and **developer.entrata.com** for the modernized gateway as of April 2025).
- **Request format:** XML and JSON; **authentication:** basic auth (and newer gateway offers improved security).
- **Code snippets** are available for **PHP**, .NET, and Java — so PHP aligns with Entrata’s backend and is a natural fit for server-side integration.

**API organization (indicative)**

- **API Health** — status monitoring  
- **Applications** — applicant and application management  
- **AR Codes & Payments** — accounts receivable  
- **Customers** — customer/resident data  
- **Financial** — GL, budgets, bank accounts, job costing  
- **Leases** — lease management, updates, scheduled charges (e.g. `sendLeases`, `updateScheduledCharges`)  
- **Communications** — marketing preferences  
- Additional categories cover residents, work orders, and other PMS functions (full method list in official docs).

**Backend context**

- Entrata supports **PHP** as a development language and provides PHP examples for API integration. Entrata’s own development (e.g. Entrata India) uses PHP at scale. So the “bolt-on” layer can be implemented in PHP (same stack) or in another stack that calls Entrata via HTTP/API and exposes MCP for the agent layer.

*Sources: docs.entrata.com API documentation; Entrata India / PHP; developer.entrata.com notice (modernized gateway).*

---

## 2. Using Entrata via APIs and MCP Tools

### 2.1 Why Both APIs and MCP

- **APIs:** Direct, stable integration for the platform’s own services (sync data, run workflows, enforce business rules). The platform backend talks to Entrata via its REST/API.
- **MCP tools:** Give **agents** a uniform way to “use Entrata” without each agent knowing Entrata’s API details. Agents see **tools** (e.g. “get_lease”, “create_work_order”, “update_resident_contact”); an **MCP server** (or adapter) translates those tool calls into Entrata API requests. So:
  - Agents stay portable and protocol-based.
  - Entrata’s surface area is exposed in a controlled, schema-defined way (inputs/outputs, permissions).
  - One Entrata integration can serve many agents and functions.

### 2.2 Research: Wrapping REST/API Backends with MCP

**Pattern**

- An **MCP wrapper** turns existing REST (or other) endpoints into **MCP tools** so AI agents can call them natively.
- The wrapper:
  - Exposes API endpoints as **tools** with clear input/output schemas (e.g. JSON Schema).
  - Maps REST parameters to tool parameters and tool results back to a consistent response shape.
  - Can add retries, error handling, and response shaping (e.g. summarizing large payloads for the agent context).
- The **underlying API does not need to change**; the wrapper is the translation layer.

**Implementations**

- **RestMCP:** Converts OpenAPI schemas to MCP servers; can reduce response bloat (e.g. “AI distiller”) so agents get concise context.
- **Stainless MCP:** Generates MCP from OpenAPI with schema conversion and protocol handling.
- **Azure API Management:** Exposes managed REST APIs as MCP with policy (auth, access).
- **Open source:** e.g. api-wrapper-mcp (Go) to create MCP servers for any API.

**When it fits**

- API is stable, documented, versioned. Ideal for legacy/core systems where you want to expose **key functionality** to agents without rewriting the backend. Fits “bolt on top of Entrata”: Entrata stays the source of truth; the platform exposes a subset of Entrata as MCP tools for agents.

*Sources: RestMCP; ScaleKit “Wrap MCP around your existing API”; Stainless “From REST API to MCP”; Microsoft “Export REST API as MCP server”; api-wrapper-mcp (GitHub).*

### 2.3 Implications for the Platform

- **Entrata MCP server(s):** One or more MCP servers that wrap Entrata’s API (or a curated subset). Each **tool** = one or more Entrata operations (e.g. “create_work_order” → Entrata work order API). Schemas define what agents can pass in and get back.
- **Platform backend:** Can still call Entrata **directly via API** for non-agent flows (syncs, batch jobs, workflow engine, settings read/write). MCP is for **agent-invokable** capabilities.
- **PHP:** The bolt-on can be PHP (same as Entrata) or another language; MCP servers can be implemented in any language that speaks the protocol (stdio/SSE/WebSocket/HTTP). What matters is a clear boundary: Entrata API ↔ platform ↔ MCP tools ↔ agents.

---

## 3. SOPs as Source of Truth for Operations and Settings

### 3.1 What This Means (Platform Requirement)

- **SOPs** are not only “what we train agents on” or “what we show to staff.” They are the **source of truth** for:
  1. **Operations** — The **procedures** the workforce does (how we handle a maintenance request, how we qualify a lead, how we process a renewal).
  2. **Settings** — The **settings** that control how the system behaves. SOPs **access and control** these settings: i.e. the authoritative definition of “how things are configured” (e.g. escalation rules, approval thresholds, which workflows run for which property type) lives in or is derived from the SOPs, so that operations and configuration stay aligned.

So: **one source of truth (SOPs) for both “what people do” and “how the system is set.”** Procedures and settings are not split across separate silos; the SOP drives or governs both.

### 3.2 Research: Document- and Policy-Driven Configuration

**Single source of truth (SSOT)**

- In enterprise architecture, a **single source of truth** is a centralized, versioned repository for configuration and procedural information so that all consumers (systems, teams, docs) stay aligned. Benefits: no conflicting versions across workgroups, automated synchronization, auditability, consistency across environments. The main challenge is **keeping procedures and configuration aligned** when one changes — which is exactly why making SOPs the source for both operations and settings is powerful: change the SOP, and both the “what to do” and the “how the system is set” can be updated together (with appropriate workflows and access control).

*Sources: Red Hat “Single source of truth in enterprise architecture”; AWS Operational Excellence (configuration management); Google Config Sync; Databricks SSOT.*

**Policy as code / document-driven configuration**

- **Policy as code** means policies (and often configuration) are expressed in a defined format (code, YAML, or structured documents) and managed in version control. Enforcement is consistent and auditable. **Open Policy Agent (OPA)** is a common pattern: policy decisions are made by evaluating structured data against policies (e.g. Rego); policies can govern access, resource rules, and configuration. **Pulumi policy packs** allow a single policy pack to be reused with **different configurations per group** (e.g. stricter in production); configuration schemas (e.g. JSON Schema) define what can be set. So “policy/document” and “configuration” are explicitly linked.

*Sources: Open Policy Agent (OPA) concepts and configuration; Pulumi policy packs and configuration; AWS Resilience Hub SOPs (prescriptive steps + configuration association).*

**SOPs that specify both procedure and configuration**

- In operational resilience and configuration management, **SOPs** can be:
  - **Prescriptive steps** for what humans/systems do (the procedure).
  - **Associated with configuration parameters** so the correct procedure and the correct settings are tied together (e.g. “when you deploy this application, you deploy this SOP and these config values”).
- Best practice: SOPs are **tested** and **version-controlled**; they are **associated with configuration** so that procedure and settings deploy or update together. That aligns with “SOPs access and control the settings”: the SOP document (or a structured derivative) defines or references the settings that the system uses.

*Sources: AWS Resilience Hub (SOPs, association with config, deployment); Cisco SSOT network automation (procedures and config from one authoritative source).*

### 3.3 Interpretation for the Platform

- **Operations (procedures):** SOPs define the procedures the workforce follows. Agents and staff assist use these same SOPs to answer questions, suggest actions, and escalate. So SOPs = source of truth for **what we do**.
- **Settings (configuration):** SOPs **access and control** settings. Concretely this can mean:
  - **Structured sections in SOPs** that are machine-readable and map to platform/Entrata settings (e.g. “Escalation: maintenance → always human if damage suspected”; “Lead response SLA: 15 minutes”).
  - **Approval workflows** so that when an SOP (and its associated settings) is updated, both procedure and configuration change together, with versioning and audit.
  - **Governance:** Only approved SOPs drive behavior; the platform (and optionally Entrata, where applicable) is configured from the same source so that “what the doc says” and “what the system does” match.
- **Single source:** One place (the SOP) to change both “our procedure” and “our settings,” reducing drift between documentation and system behavior and keeping compliance and operations aligned.

---

## 4. How It Fits With the Rest of the Platform

- **Entrata** = system of record (data and core PMS functions). **APIs** = how the platform backend and workflows talk to Entrata. **MCP tools** = how agents invoke Entrata capabilities in a bounded, schema-driven way.
- **SOPs** = source of truth for **operations** (workforce procedures) and **settings** (configuration the platform and agents use). Agents and staff assist are grounded in SOPs; settings that control behavior (escalation, SLAs, which tools are allowed, etc.) are derived from or controlled by SOPs so procedure and configuration stay in sync.
- **Documents/SOPs** in DEEP-RESEARCH-PLATFORM-PARTS.md remain central; this doc adds that (1) the platform sits on top of Entrata (APIs + MCP), and (2) SOPs extend from “grounding for agents” to “source of truth for operations and settings.”

---

## 5. Summary

| Topic | Platform requirement | Research support |
|-------|----------------------|------------------|
| **Entrata** | Underlying PMS; PHP backend. Platform bolts on top. | Entrata API (docs.entrata.com, developer.entrata.com); PHP support and snippets; API categories (leases, residents, applications, financial, etc.). |
| **APIs** | Use Entrata functionality via APIs. | Entrata API v1 (XML/JSON, auth); use for direct integration, sync, workflows. |
| **MCP tools** | Expose Entrata to agents via MCP. | Wrap REST/API as MCP (RestMCP, Stainless, Azure, OSS); stable API + wrapper = agent-facing tools; no need to change Entrata. |
| **SOPs = operations** | SOPs = source of truth for procedures workforce does. | SSOT for procedures + config; policy as code; SOPs as prescriptive steps tied to deployment/config. |
| **SOPs = settings** | SOPs access and control settings. | Policy/docs drive configuration; OPA/Pulumi-style config from policy; SOP–config association so procedure and settings stay aligned. |

---

## 6. Sources (Consolidated)

- **Entrata:** docs.entrata.com/api/v1/documentation; developer.entrata.com (modernized gateway); code snippets (PHP/.NET/Java); Entrata India / PHP.
- **MCP wrapping APIs:** RestMCP; ScaleKit “Wrap MCP around your existing API”; Stainless “From REST API to MCP”; Microsoft Azure API Management export REST as MCP; api-wrapper-mcp (GitHub).
- **SSOT / policy / config:** Red Hat SSOT enterprise architecture; AWS Operational Excellence (config management), Resilience Hub (SOPs, config association); Google Config Sync; Open Policy Agent (OPA); Pulumi policy packs; Cisco SSOT network automation.
- **Integration layer on PMS:** Propexo/unified API pattern; anti-corruption layer; legacy integration patterns.

*Last updated: Feb 2025. Extend as Entrata API or SOP–settings design evolves.*

---

## 7. Deep Dive: SOP–Settings Schema

**Quick reference:** §7.1 Where settings live (embedded / linked / registry) → §7.2 Schema format (YAML frontmatter example) → §7.3 Taxonomy of settings (scope, escalation, SLA, tools, guardrails, etc.) → §7.4 Versioning & audit → §7.5 Validation → §7.6 PMC examples → §7.7 End-to-end flow.

This section specifies how SOPs **access** (read) and **control** (write) settings: structure of the schema, taxonomy of settings, versioning, validation, and PMC-specific examples. The goal is a single, machine-readable source so that procedure and configuration stay aligned.

### 7.1 Where Settings Live Relative to the SOP

Three patterns (can be combined):

| Pattern | Description | Pros | Cons |
|--------|-------------|------|------|
| **A. Embedded in SOP** | Settings live inside the SOP document in a structured block (e.g. YAML/JSON frontmatter or a fenced block). One file = procedure + config. | Single artifact; version together; easy to deploy as one. | SOP doc format must support parsing; risk of large docs if many settings. |
| **B. Linked config file** | SOP has an ID or path; a separate config file (e.g. `sop-{id}.settings.yaml`) is the “settings view” for that SOP. Config file references SOP version. | Clear separation; config can be validated by JSON Schema alone. | Two artifacts to keep in sync; need process so updating SOP can update/link config. |
| **C. Registry / database** | Settings stored in a registry keyed by SOP ID (and optionally version). SOP content is procedure text; “settings” are stored records derived from or approved with the SOP. | Flexible; can support UI over settings; audit trail in DB. | SOP doc itself doesn’t “contain” settings; need governance so only approved SOP versions drive registry. |

**Recommendation for platform:** Prefer **A (embedded)** for simplicity and “one source of truth” in a single artifact, with an **optional export** to a registry (C) for runtime so the platform and Entrata don’t parse docs on every request. When an SOP is approved, a job **extracts** the settings block and writes to the settings registry; runtime reads from the registry. So: **SOP = source**, **registry = cached, validated view** for execution.

### 7.2 Schema Format for Embedded Settings (Pattern A)

**Placement:** At the top of the SOP (frontmatter) or in a dedicated section (e.g. `## Platform settings` with a fenced code block). Delimited so a parser can extract without parsing the whole narrative.

**Format:** YAML or JSON. YAML is compact and readable for ops; JSON is easier for strict schema validation and tooling.

**Example frontmatter (YAML):**

```yaml
---
sop_id: MAINT-001
sop_version: "2.1"
title: Maintenance request triage and dispatch
effective_date: 2025-02-01
approval_status: approved

# Platform settings (extracted and applied when SOP is approved)
settings:
  scope:
    property_types: [multifamily, student]
    roles: [maintenance_triage_agent, resident_agent]

  escalation:
    always_escalate_to_human:
      - keywords: [water damage, ceiling, mold, structural]
        category: maintenance
        reason: possible_property_damage
      - keywords: [emergency, no heat, no water]
        category: maintenance
        reason: emergency
    default: agent_handles

  sla:
    first_response_minutes: 15
    business_hours_only: true
    timezone: property

  tools_allowed:
    - entrata/create_work_order
    - entrata/get_work_order_status
    - entrata/get_unit_details
  tools_require_approval: []  # e.g. entrata/waive_fee

  guardrails:
    fair_housing_tag: true
    max_agent_steps: 10
---
```

**Narrative procedure follows below the frontmatter** (Markdown). So the same file contains “what staff do” (narrative) and “how the system is set” (settings block).

### 7.3 Taxonomy of Settings (What SOPs Can Access and Control)

Categories of settings that SOPs can **read** (access) and **write** (control) once approved:

| Category | Purpose | Examples | Read by | Written by |
|----------|---------|----------|---------|------------|
| **Scope** | Which agents, properties, roles this SOP applies to | property_types, portfolio_ids, agent_roles | Platform when selecting which SOP(s) apply to a request | SOP author; approval updates registry |
| **Escalation** | When to escalate to human, and how | always_escalate_to_human (keywords, category, reason), default (agent_handles / always_human), routing rules | Agent runtime, workflow engine, Escalations router | SOP |
| **SLA** | Response and resolution targets | first_response_minutes, next_reply_minutes, resolution_hours, business_hours_only, timezone | Workflow, reporting, escalation rules | SOP |
| **Tools (MCP)** | Which Entrata/platform tools the agent may call for this procedure | tools_allowed, tools_require_approval (human-in-the-loop before call) | MCP gateway / agent runtime | SOP |
| **Guardrails** | Safety and compliance knobs | fair_housing_tag, max_agent_steps, required_doc_ids (must cite these docs), no_refund_without_approval | Agent runtime, governance layer | SOP |
| **Workflows** | Which workflow templates run for this procedure | workflow_id, trigger_conditions (e.g. channel, property_type) | Workflow engine | SOP |
| **Messaging** | Defaults for resident-facing messages | template_ids, tone, required_disclosures | Agent, staff assist | SOP |
| **Entrata-specific** | Entrata API behavior where the platform proxies or configures | work_order_priority_default, lease_sync_behavior | Platform backend when calling Entrata API | SOP (via platform config derived from SOP) |

**Access (read):** At runtime, the platform **reads** from the settings registry (which was populated from the SOP). So “SOPs access settings” = the procedure document is the source; the system **uses** those settings to decide escalation, SLA, tools, guardrails.

**Control (write):** When an SOP is **approved** (or a version is promoted), the platform **extracts** the settings block, validates it, and **writes** into the settings registry (overwriting the previous config for that SOP ID/scope). So “SOPs control settings” = approval of the SOP is the gate for changing operational configuration.

### 7.4 Versioning and Audit

- **SOP version** (e.g. 2.1) is the natural version for the combined procedure + settings. When the SOP is edited, version bumps; approval creates a new **settings snapshot** tied to that SOP version.
- **Effective date** and **approval_status** in the SOP (or registry) support “when did this config go live?” and “is this draft or approved?”
- **Audit:** Every time settings are applied from an SOP, log: sop_id, sop_version, effective_date, who approved, timestamp. So you can trace any runtime behavior back to a specific SOP version.

### 7.5 Validation (Schema and Rules)

- **JSON Schema** (or equivalent) for the `settings` block so that invalid config cannot be applied. Required fields (e.g. scope, escalation), allowed enums (e.g. category: leasing | maintenance | accounting), and numeric bounds (e.g. first_response_minutes between 5 and 1440).
- **Cross-field rules:** E.g. if `tools_require_approval` lists a tool, that tool must appear in `tools_allowed`; if `fair_housing_tag` is true, `required_doc_ids` must include the fair-housing SOP.
- **Validation on approve:** When an SOP is submitted for approval, run validation; if it fails, block approval and surface errors to the author. So only valid settings ever reach the registry.

### 7.6 PMC-Specific Examples (Settings in SOPs)

**Leasing SOP (e.g. LEASE-001)**

- **Scope:** leasing_agent, prospect_agent; property_types: multifamily.
- **Escalation:** always_escalate for “application denial,” “reasonable accommodation,” “lease buyout”; default agent_handles for availability, pricing, application status.
- **SLA:** first_response_minutes: 15 (lead response).
- **Tools:** entrata/get_availability, entrata/get_floor_plans, entrata/create_lead, entrata/schedule_tour; tools_require_approval: [] or entrata/send_lease_document depending on policy.
- **Guardrails:** fair_housing_tag: true; required_doc_ids: [fair-housing-policy, lease-terms-summary]; max_agent_steps: 8.

**Maintenance SOP (e.g. MAINT-001)** — as in the YAML example above.

**Accounting / Refunds SOP (e.g. ACCT-002)**

- **Escalation:** always_escalate_to_human for any refund or fee waiver (reason: financial_decision).
- **Tools_allowed:** entrata/get_balance, entrata/get_payment_history; no entrata/refund or entrata/waive_fee in tools_allowed (or only in tools_require_approval with human step).
- **Guardrails:** no_refund_without_approval: true; required_doc_ids: [refund-policy].

### 7.7 Summary: SOP–Settings Flow

1. **Author** writes/edits SOP (narrative + settings block).
2. **Validation** runs on the settings block; errors block approval.
3. **Approval** promotes the SOP version; **extract job** writes settings to the **settings registry** (keyed by sop_id, scope, version).
4. **Runtime** (agents, workflows, Escalations) **reads** from the registry to decide escalation, SLA, tools, guardrails. SOP narrative is still used for **grounding** (RAG) and staff assist.
5. **Audit** ties every applied config to an SOP version and approval event.

---

## 8. Deep Dive: Entrata + MCP Architecture (Text Diagram and Design)

**Quick reference:** §8.1 Layer diagram (users → channels → agents/escalations → MCP → backend → Entrata) → §8.2 When backend vs MCP → §8.3 MCP server design (tools, naming, auth, rate limit, policy) → §8.4 Data flow example → §8.5 Security → §8.6 SOPs in the architecture.

This section describes how the AI platform sits on top of Entrata, how Entrata is exposed via APIs and MCP, and how data and control flow through the layers. It is a one-page-style architecture in text form, with enough detail to guide implementation.

### 8.1 Layer Diagram (Top to Bottom)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  USERS                                                                      │
│  Residents / Prospects (chat, SMS, voice, portal)  │  Staff (Escalations, assist) │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  CHANNELS & GATEWAY                                                         │
│  Voice, chat, SMS, portal; auth; rate limit; route to agent or Escalations         │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
│  AUTONOMOUS AGENTS    │ │  INBOX / WORKFLOWS    │ │  INTELLIGENCE AGENTS  │
│  (ELI+)               │ │  Human tasks;         │ │  Recommendations only │
│  Role, goal,          │ │  workflow engine      │ │  (no Entrata writes)  │
│  functions → MCP tools│ │  (may call API or     │ │  Read-only data       │
│  Grounded in SOPs     │ │   MCP for steps)      │ │  sources              │
└───────────────────────┘ └───────────────────────┘ └───────────────────────┘
                    │                   │                   │
                    │    Agent / workflow needs to call     │
                    │    Entrata (e.g. create work order)   │
                    ▼                   ▼                   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  MCP LAYER (Agent-facing)                                                    │
│  • MCP client (in platform) ← agents call tools via client                  │
│  • Entrata MCP server(s): expose Entrata API as tools                        │
│  • Tool schema: name, description, input/output JSON Schema                 │
│  • Auth: platform authenticates to MCP server; server uses Entrata API creds │
│  • Rate limit: per agent / per property / global                             │
│  • Policy: which tools an agent can see comes from SOP settings (registry)   │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PLATFORM BACKEND (Non-agent)                                                │
│  • Sync jobs, batch, reporting: call Entrata API directly (no MCP)          │
│  • Workflow engine: may call Entrata API or trigger MCP tools                │
│  • Settings registry: populated from SOPs; used for escalation, SLA, tools   │
│  • Document store: SOPs; RAG for agents and staff assist                    │
│  • Can be PHP (same as Entrata) or other (Node, Go, etc.)                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                           ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│  ENTRATA API (HTTP/JSON-XML)  │               │  ENTRATA (PMS)                │
│  Leases, residents, work      │               │  PHP backend; system of      │
│  orders, applications,        │◀──────────────│  record for properties,       │
│  financial, communications    │               │  units, leases, residents      │
└───────────────────────────────┘               └───────────────────────────────┘
```

### 8.2 When Platform Backend Calls Entrata vs When Agents Call via MCP

| Caller | Use case | Path | Why |
|--------|----------|------|-----|
| **Platform backend** | Scheduled sync (e.g. residents, units from Entrata) | Backend → Entrata API | No agent; batch job; same credentials and rate limits as other server-side use. |
| **Platform backend** | Workflow step “create work order” (triggered by human or timer) | Backend → Entrata API | Workflow engine is deterministic; no need for MCP. |
| **Platform backend** | Apply settings from approved SOP (write to registry) | Backend → Settings registry (no Entrata) | Settings are platform-owned; may later push a subset to Entrata if Entrata supports config API. |
| **Autonomous agent** | Resident says “my sink is leaking” → agent creates work order | Agent → MCP client → Entrata MCP server → Entrata API | Agent has no Entrata credentials; MCP server does. Tool schema bounds what the agent can pass. |
| **Autonomous agent** | Agent looks up lease end date to answer resident | Agent → MCP client → Entrata MCP server → Entrata API (read) | Same as above; read-only tool. |
| **Intelligence agent** | “Recommend which work orders to prioritize” | Agent → platform data layer / analytics (read-only) or read-only MCP tool | No write to Entrata; recommendations only. |

So: **agents never call Entrata directly**; they only call **MCP tools**. The **platform backend** may call **Entrata API** directly for sync, workflows, and any non-agent automation.

### 8.2.1 Internal vs External Entrata Tools (Guide Rails and Governance)

We expose two kinds of Entrata-related tools to agents:

| Kind | Description | Governance |
|------|-------------|------------|
| **Internal (platform) Entrata tools** | MCP tools **exclusive to our platform** that connect to Entrata **through our platform’s workflows and APIs**. The agent calls a platform tool (e.g. `platform/work_order/create`); our backend validates, audits, and optionally runs approval or workflow steps, then calls Entrata (or our Workato recipes that call Entrata). | **Guide rails and governance live here:** validation, scoping (property/tenant), audit logging, approval gates (e.g. `tools_require_approval`), rate limits, and policy enforced before any request reaches Entrata. |
| **External Entrata tools** | MCP tools that wrap or call **Entrata more directly** (e.g. a standard Entrata MCP server: `entrata/work_orders/create`, `entrata/leases/get`). Still no agent-held credentials; the MCP server holds Entrata auth. | Useful for read-heavy or lower-risk operations; policy (e.g. `tools_allowed` from SOPs) still applies, but the path does not go through our workflow layer. |

**Rationale:** By having **internal** tools that sit in front of Entrata, we create a controlled path: agents use platform-exclusive tools for sensitive or high-governance actions, and we enforce guardrails (approval, scope, audit) in one place. External Entrata tools can still be used where we want simpler, direct read/write with policy applied at the MCP layer only. Design: prefer **internal** tools for writes and high-risk operations; **external** for reads or when governance is handled elsewhere (e.g. SOP-driven allowlists only).

### 8.3 Entrata MCP Server Design

**Internal vs external (recap):** The tools below are **external** Entrata tools (direct Entrata MCP server). The platform also exposes **internal** MCP tools (e.g. `platform/work_order/create`) that go through our backend/workflows first for guide rails and governance; see §8.2.1. Agents can be configured with a mix of internal and external tools per SOP settings.

**One server vs many:** One option is a single **Entrata MCP server** that exposes many tools (e.g. `entrata/leases/get`, `entrata/work_orders/create`). Another is **multiple servers** by domain (e.g. Entrata Leasing, Entrata Maintenance, Entrata Residents) so that tool namespaces and permissions can be scoped per agent (e.g. maintenance agent only gets the Maintenance server). Recommendation: start with **one server** with **namespaced tool names** (see below); split into multiple servers if auth or deployment boundaries require it.

**Tool naming (MCP best practice):** 1–64 chars; letters, digits, underscore, hyphen, dot, slash; case-sensitive; no spaces. Use **action-verb + resource**: e.g. `entrata/work_orders/create`, `entrata/leases/get`, `entrata/residents/get_contact`. Hierarchical namespacing (`entrata/...`) keeps tools organized and allows policy to allow/deny by prefix (e.g. allow `entrata/work_orders/*`, deny `entrata/financial/*` for a given agent).

**Tool list (illustrative):**

| Tool name | Description | Entrata API (conceptual) | Risk |
|-----------|-------------|---------------------------|------|
| entrata/work_orders/create | Create a work order with unit, type, description. Returns work order ID. | Work order create endpoint | Medium (write) |
| entrata/work_orders/get | Get work order status and details by ID. | Work order get | Low (read) |
| entrata/leases/get | Get lease details for a unit or resident (dates, terms). | Leases API | Low (read) |
| entrata/residents/get_contact | Get resident contact info (for context in conversation). | Customers/Residents API | Low (read) |
| entrata/availability/get | Get unit availability for a property. | Leasing API | Low (read) |
| entrata/leads/create | Create or update lead. | Lead/Application API | Medium (write) |
| entrata/tours/schedule | Schedule a tour. | Leasing API | Medium (write) |

High-risk or financial tools (e.g. refund, fee waiver) can be **excluded** from agent-facing MCP or exposed only as **tools_require_approval** in SOP settings so a human step is required before the call.

**Auth:** The **MCP server** holds credentials (or a token) for the Entrata API. Agents do not. The platform authenticates **to** the MCP server (e.g. JWT or API key per deployment); the MCP server uses **Entrata API credentials** (e.g. basic auth or OAuth per Entrata’s gateway) when calling Entrata. So there is a **double hop**: User/Agent → Platform → MCP server → Entrata.

**Rate limiting:** Per MCP server (or per tool) to avoid overwhelming Entrata and to control cost. Token bucket or fixed window; e.g. 120 req/min sustained, with bursts. Apply limits in the MCP server or in an MCP gateway in front of it.

**Policy (which tools an agent sees):** At session start (or per request), the platform consults the **settings registry** (derived from SOPs) for that agent’s role and scope. The registry lists **tools_allowed** (and optionally **tools_require_approval**). The MCP client or gateway only exposes that subset to the agent. So **SOPs control settings**, and settings control **which Entrata capabilities** the agent can use.

### 8.4 Data Flow (Example: Resident Asks for Work Order)

1. **Resident** sends “My sink is leaking” via chat.
2. **Channel** authenticates resident, resolves property/unit (from session or Entrata), forwards to **autonomous agent** (e.g. maintenance triage agent).
3. **Agent** (grounded in Maintenance SOP) decides to create a work order. It has **tools_allowed** from the SOP-derived settings (e.g. `entrata/work_orders/create`, `entrata/work_orders/get`). It calls **MCP tool** `entrata/work_orders/create` with parameters { unit_id, type: "plumbing", description: "Sink leaking" }.
4. **MCP client** (in platform) sends the call to **Entrata MCP server**. Server validates params (and optionally checks **tools_require_approval** — if this tool required approval, the server would not call Entrata yet; would return “pending_approval” and platform would create escalation item first).
5. **Entrata MCP server** maps the call to **Entrata API** (e.g. work order create), authenticates with Entrata, sends request.
6. **Entrata** creates the work order, returns ID and status.
7. **MCP server** returns a **concise result** to the agent (e.g. work order ID, status, “created”). Optionally “AI distiller” or similar trims payload so the agent context stays small.
8. **Agent** replies to resident: “I’ve created a work order #12345. Our team will reach out to schedule.”
9. If the SOP had **always_escalate_to_human** for “water damage,” the agent would **also** create an escalation item with summary and category so a human can follow up (e.g. for possible ceiling damage).

### 8.5 Security and Boundaries

- **No Entrata credentials in the agent or in the client.** Only the MCP server (or a dedicated integration service) holds Entrata API credentials.
- **Scoped tools:** Per-agent tool allowlist from SOP settings; deny by default. High-risk tools (refund, waiver, lease document send) either not exposed to agents or behind **tools_require_approval** (human-in-the-loop).
- **Auth chain:** User → platform (user/session auth); platform → MCP server (service auth); MCP server → Entrata (Entrata API auth). Each hop is authenticated and, where needed, authorized (e.g. property-level scope so an agent for Property A cannot create work orders for Property B if the backend enforces it).
- **Rate limit:** At MCP server (or gateway) to protect Entrata and to avoid runaway agent loops.
- **Audit:** Log every MCP tool call (tool name, params redacted if PII), result (success/failure), and associated SOP/agent/session for compliance and debugging.

### 8.6 SOPs in the Architecture

- **Procedure text:** Stored in document store; used for **RAG** so agents and staff assist get answers and suggestions from the same SOP narrative.
- **Settings block:** Extracted on SOP approval and written to **settings registry**. Registry is read by:
  - **Agent runtime** — escalation rules, max steps, tools_allowed, tools_require_approval.
  - **Workflow engine** — which workflows run, SLA targets.
  - **Escalations / routing** — suggested category, SLA escalation.
- So **SOPs sit above both “what we do” (narrative) and “how the system is set” (registry)**; the architecture uses both the narrative and the derived settings at the right layers.

---

## 9. References for Deep Dives

- **Frontmatter / embedded config:** GitHub Docs YAML frontmatter; Hugo front matter; Front Matter (VS Code) settings and schemas.
- **SLA / escalation config:** Zendesk SLA policies; IBM Control Desk escalations; ConductorOne SLA escalation; Sage CRM escalation rules.
- **MCP architecture:** Zeo “MCP Server Architecture”; CData “Secure MCP Server for Multi-Agent”; Fast.io “MCP Server Rate Limiting”; MCP Best Practice (mcp-best-practice.github.io); Bix “MCP Servers Done Right” (auth, isolation).
- **MCP tool naming:** SEP-986 (tool name format); Redpanda MCP tool design; MCP spec (tools concept).
