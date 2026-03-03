# Harvey-for-Multifamily: Gap Analysis

**Purpose:** Map our current platform design against Harvey AI’s pillars and capabilities to identify **key areas we are missing or underemphasizing** when building a system similar to Harvey for multifamily.

**Status:** All gaps below are **addressed in the Technical Design Document (TDD)**. Before building, the architecture and build plan are defined in **`docs/architecture/TDD-ARCHITECTURE.md`**. That doc specifies: **Vault** (unified document store with SOPs as a document type, bulk ops, review tables, Vault-triggered workflows); **Workflow Builder** via **Workato** (embedded, white-label); **Knowledge**, **source citation**, **Academy**, **Ecosystem**, **Collaboration**, **Trust**, and **segment solutions**. Use the TDD as the single technical source of truth; this gap analysis remains the reference for *what* we had to close and *where* in the TDD it is closed.

---

## 1. Harvey’s Pillars (Quick Reference)

| Pillar | What Harvey does |
|--------|-------------------|
| **Assistant** | Domain-specific AI: Q&A, document analysis, drafting. Every answer linked to source materials. |
| **Vault** | Secure storage, organization, **bulk analysis** of documents (workflows, **review tables**, Q&A, **bulk summarization**). |
| **Knowledge** | **Research** across legal, regulatory, tax—**multiple domains and sources**; **400+ regional knowledge sources**; jurisdiction-specific. |
| **Workflows** | Pre-built and **custom** workflows; **Workflow Builder** so firms design and deploy **firm-specific** workflows. |
| **Ecosystem** | Harvey **inside existing tools**: Word, Outlook, SharePoint, iManage. Answers grounded in trusted sources (LexisNexis, NetDocuments, etc.). |

Plus: **Collaboration** (internal + external, secure shared spaces); **Academy** (training, expert workflows, step-by-step guidance); **source citation** (every answer → sources; History Export, query forensics); **solutions by practice area** (transactional, litigation, in-house, mid-sized); **enterprise security** (SOC2, ISO 27001, GDPR).

---

## 2. Gap Analysis: What We Have vs What We’re Missing

### 2.1 Assistant

| Harvey | Our design | Gap? |
|--------|------------|------|
| Domain-specific Q&A, document analysis, drafting | Autonomous agents (ELI+) with role, goal, functions; grounded in SOPs; answer/triage/suggest/act | **Largely covered** — agents are our “assistant.” |
| Every answer linked to source materials | SOP usage observability (which chunks used); audit | **Partially covered** — we have observability and audit, but we don’t yet emphasize **surfacing sources to the user** in the UI (e.g. “Answer: X. Sources: [doc A, chunk 2], [doc B]”). Staff and auditors need to *see* sources at a glance, not only in logs. |
| Drafting | Agents can suggest/create (e.g. work order, message); staff assist suggests replies | **Partially covered** — we don’t yet call out **document drafting** as a first-class use case (e.g. draft notice, draft lease addendum, draft renewal letter from templates + SOPs). |

**Gaps:**  
- **Source citation in the UI** — Show which documents/chunks supported each answer or action to the human (not only in audit).  
- **Drafting as a first-class capability** — Explicit “draft from template + SOP” flows (notices, letters, addendums) with human review before send.

---

### 2.2 Vault

| Harvey | Our design | Gap? |
|--------|------------|------|
| Secure storage, organization of documents | Document library; SOPs versioned and approved | **Partially covered** — we have a library and SOPs; we don’t yet treat “all portfolio documents” (leases, addendums, vendor contracts, inspections, work order attachments) as a first-class **Vault** with its own model (folders, matter/property/unit, tags). |
| **Bulk analysis** of documents | — | **Missing.** We have no explicit “run analysis across many documents” (e.g. 50 leases, 100 work orders). |
| **Review tables** | Inbox and task lists | **Underemphasized.** Harvey-style review tables = structured view of many items (e.g. 30 leases up for renewal) with columns (expiry, unit, status, notes), bulk actions (tag, assign, summarize), and one-click workflows. Our Inbox is per-item; we don’t have “table of N items + bulk workflow.” |
| **Bulk summarization** | — | **Missing.** “Summarize all leases expiring in Q2” or “Summarize work orders by category for Property X” as a first-class workflow. |
| One-click workflows from the doc store | Workflows exist; not yet “from Vault” | **Gap.** “Select 20 leases → run lease review workflow” or “Select all maintenance docs for Unit 4 → summarize” is not yet designed. |

**Gaps (closed in TDD):**  
- **Vault as a first-class product surface** — The **Vault** is the **single document store**. It holds **SOPs** (document type `sop`, with versioning and approval) **and** all operational documents (leases, addendums, contracts, inspections) with organization (property, unit, matter, type, date), search, and filters. SOPs are not a separate library; they live in the Vault and remain the source of truth for operations and settings. **TDD-ARCHITECTURE.md §4.1**.  
- **Bulk operations** — Bulk analysis, bulk summarization, bulk tag/assign over selected Vault documents. §4.1.3.  
- **Review tables** — Structured view of many items (Vault docs or Entrata-backed records) with columns, bulk actions, and one-click workflows. §4.1.4.  
- **Vault-triggered workflows** — User selects documents (or table rows) and triggers a **Workato** recipe; platform passes selection to Workato. §4.1.5, §4.2.

---

### 2.3 Knowledge

| Harvey | Our design | Gap? |
|--------|------------|------|
| Research across **multiple domains and sources** | SOPs + agents grounded in SOPs | **Narrow.** We ground in **internal** SOPs and (via Entrata) internal data. We do not yet have a **research / knowledge** layer that pulls from **external** or **regional** sources. |
| **400+ regional knowledge sources** | — | **Missing.** No curated, jurisdiction-specific knowledge base (state/city landlord-tenant law, fair housing, local ordinances, affordable housing rules). |
| Complex questions across domains | Agents can answer from SOPs; intelligence agents from data | **Partially covered** for internal; no “research mode” that combines internal docs + external regulatory/legal knowledge. |

**Gaps:**  
- **External / regional knowledge** — A **Knowledge** layer: curated, jurisdiction-specific sources (state/city regulations, HUD guidance, local ordinances) that the assistant can query in addition to internal SOPs. Without this, “What’s the security deposit rule in Texas?” may only be answerable from internal SOPs, not from authoritative external sources.  
- **Jurisdiction awareness** — Model **jurisdiction** (state, city, property type) and filter knowledge + policies by region so answers and workflows respect local rules.  
- **Research experience** — Explicit “research” flow for complex, multi-source questions (e.g. “What do we need to do for move-out in California for an affordable property?”) with cited internal + external sources.

---

### 2.4 Workflows

| Harvey | Our design | Gap? |
|--------|------------|------|
| Pre-built workflows | Workflow templates (e.g. Leasing, Maintenance, Renewal) | **Covered.** |
| **Custom** workflows | Templates + config; SOP–settings drive behavior | **Partially covered** — we have config and templates; we don’t yet have a **Workflow Builder** (no-code/low-code) for PMCs to **design and deploy their own** workflows. |
| **Workflow Builder** — firms design and deploy firm-specific workflows | — | **Missing.** Harvey lets users build custom workflows (steps, logic, document binding). We have “templates to clone and configure,” not “build a new workflow from scratch” with a visual or declarative builder. |
| Document-centric workflows (analysis, translation, extraction) | Agent + human steps; some doc binding | **Partially covered** — we don’t emphasize **document-in, document-out** workflows (e.g. “upload 10 leases → extract key terms → output review table”) as a standard pattern. |

**Gaps (closed in TDD):**  
- **Workflow Builder** — **Solved by Workato.** We use a **Workato** license; Workato is **embedded and white-label** in our product. Customers build and run **custom** workflows (recipes) in Workato; we provide the platform connector (agent run, Vault read, Inbox create, bulk ops) and trigger-from-Vault so “select docs → run workflow” is first-class. See **TDD-ARCHITECTURE.md §4.2**.  
- **Document-in/document-out workflows** — Workato recipes receive Vault document selection as input and call our bulk analysis/summarize APIs; output can be review table or report. Vault + Workato together. TDD §4.2, §4.1.5.

---

### 2.5 Ecosystem

| Harvey | Our design | Gap? |
|--------|------------|------|
| Harvey **inside existing tools** (Word, Outlook, SharePoint, iManage) | Platform has its own UI (channels, Inbox, agents); Entrata integration via API + MCP | **Gap.** We are “a platform that uses Entrata” and “channels” (chat, SMS, voice, portal). We do not yet design for **“AI inside the tools you already use”** — e.g. inside Entrata’s UI (if extensible), inside email (Outlook/Gmail add-in), inside a PMIS dashboard widget, or inside a shared drive. |
| Answers grounded in trusted sources (internal + external) | Grounded in SOPs + Entrata data | **Partially covered** for internal; external/knowledge gap as above. |

**Gaps:**  
- **Ecosystem / “where you work”** — Strategy and design for **surfacing the assistant (and optionally workflows) inside existing tools**: e.g. Entrata sidebar or widget, email add-in (“draft reply using policy”), calendar integration, or “ask from SharePoint/OneDrive.” So PMs don’t have to leave their daily tools to get answers or run workflows.  
- **Integrations as first-class** — Document which “trusted sources” we connect to (Entrata, document store, future: regional knowledge, accounting) and how they feed the assistant and workflows.

---

### 2.6 Collaboration

| Harvey | Our design | Gap? |
|--------|------------|------|
| One platform for **firms and corporations** to collaborate **securely across documents, workflows, and email** — **internally and externally** | Teams, roles, property permissions; Inbox and workflows | **Partially covered** for **internal** (teams, roles, properties). We do not yet model **external** collaboration or **shared spaces**. |
| Secure shared spaces (e.g. with outside counsel, client) | — | **Missing.** No explicit “shared space” or “shared matter” with external parties (e.g. owner, operator, third-party manager) with restricted visibility and actions. |

**Gaps:**  
- **External collaboration** — Support for **cross-organization** or **external party** collaboration: e.g. owner + operator, or corporate + site team, with clear boundaries (what they can see, what they can do, audit).  
- **Shared spaces / shared matters** — Optional “space” or “matter” (e.g. per property, per deal) where selected internal and external users can share documents, workflows, and thread context with defined permissions.

---

### 2.7 Academy / Onboarding / Get-Started

| Harvey | Our design | Gap? |
|--------|------------|------|
| **Harvey Academy** — on-demand training, expert workflows, step-by-step guidance | Mentioned: “templates and onboarding,” “light Academy” (get started, checklists, short guides) | **Underemphasized.** We reference it in principles but don’t treat it as a **product area** with clear scope. |
| Get started quickly; learn by doing | — | **Gap.** No explicit “Academy” or “Get started” experience: guided setup (first SOP, first agent, first workflow), checklists, short training modules, or “expert workflow” library with step-by-step instructions. |

**Gaps:**  
- **Academy as a product surface** — Onboarding and training: **guided setup** (e.g. “Add your first SOP,” “Connect Entrata,” “Deploy your first agent”), **checklists** (e.g. “Fair housing compliance”), **short training content** (videos or guides on policies, workflows, best practices), and **expert workflow library** (pre-built, documented workflows PMCs can adopt and adapt).  
- **First-run experience** — So new customers can go from signup to “first value” (e.g. first resident question answered by the agent, or first workflow run) with minimal guesswork.

---

### 2.8 Source Citation and Query Forensics (for Humans)

| Harvey | Our design | Gap? |
|--------|------------|------|
| **Every answer** linked to source materials in the product | Observability: we record which chunks were used; audit trail | **Gap for human-facing UX.** We have **backend** observability and audit; we don’t yet specify that **every answer or suggestion** shown to a user (staff or resident, where appropriate) is **displayed with its sources** (e.g. “Based on: [SOP Leasing, section 2], [Lease terms summary]”). |
| History Export / query forensics (prompts, outputs, sources) | Audit logging (traces, tool calls, docs used) | **Partially covered** — we have audit; we don’t yet call out **export** (e.g. for compliance, client, or internal review) in the same way Harvey does (History Export API, deep dive on exact prompts/outputs/sources). |

**Gaps:**  
- **Show sources in the UI** — When the assistant (or staff assist) returns an answer or suggestion, show **which documents/chunks** were used, so staff can verify and so compliance can review.  
- **Export and forensics** — Ability to **export** interaction history (query, answer, sources, timestamp) for a given period, user, or matter for compliance and dispute resolution.

---

### 2.9 Solutions by Segment / Practice Area

| Harvey | Our design | Gap? |
|--------|------------|------|
| **Solutions by practice area** (transactional, litigation, in-house, mid-sized) | Use cases (leasing, maintenance, renewals, etc.); PMC tailoring in research | **Underemphasized.** We have use cases and “PMC tailoring” but we don’t structure **product** as “solutions” by **segment**: e.g. Affordable (LIHTC, compliance), Student, Military, Single-portfolio vs large operator. Each segment has different regulations, workflows, and knowledge needs. |
| Tailored workflows and knowledge per segment | — | **Missing.** No explicit “solution pack” or “segment mode” that pre-configures workflows, knowledge sources, and guardrails for a given segment (e.g. affordable housing bundle: LIHTC docs, income-certification workflow, HUD sources). |

**Gaps:**  
- **Segment-aware product** — Define **solutions** or **modes** by multifamily segment (affordable, student, military, conventional, single-portfolio, large operator) with tailored: workflows, knowledge sources, compliance tags, and guardrails.  
- **Segment-specific bundles** — Optional “solution packs” (e.g. affordable housing) that include segment-specific SOP templates, workflows, and (when we have Knowledge) regional/regulatory sources.

---

### 2.10 Enterprise Security and Trust Narrative

| Harvey | Our design | Gap? |
|--------|------------|------|
| **Enterprise security** (SOC2 II, ISO 27001, GDPR, etc.) prominently communicated | Governance, audit, compliance posture; fair housing | **Partially covered** — we design for governance and audit; we don’t yet call out **certifications and trust** as a **product/marketing** concern (SOC2, ISO, GDPR, data residency, encryption). |
| “Sources you trust” / “ground every answer in designated sources” | SOPs as source of truth; approved docs only | **Covered** in design; could be more explicit in **trust narrative** (e.g. “Only approved SOPs and designated sources drive answers”). |

**Gaps:**  
- **Trust and security as a product surface** — Explicit **Trust** or **Security** page/section: certifications (or roadmap), data handling, encryption, retention, and “how we keep your data and answers within your control.”  
- **“Sources you trust”** — Clear narrative and UI: “Answers are grounded only in your approved SOPs and designated knowledge sources” (and, when we have it, “regional knowledge” with clear provenance).

---

## 3. Summary: Priority Gaps (Harvey-Like) — All Addressed in TDD

| Priority | Gap | TDD section | Status |
|----------|-----|-------------|--------|
| **High** | **Vault + bulk** — First-class document store for all portfolio docs; bulk analysis, review tables, bulk summarization; Vault-triggered workflows | Vault | We stay “SOP + agents” but miss “documents at scale” and batch efficiency that Harvey’s Vault provides. |
| **High** | **Knowledge** — External/regional knowledge (state/city law, HUD, ordinances); jurisdiction awareness; research experience | Knowledge | Answers and workflows rely only on internal SOPs; compliance and “what’s the rule in X?” need external, authoritative sources. |
| **High** | **Source citation in UI** — Show which docs/chunks supported each answer to the user; export/forensics for compliance | Assistant / Trust | Trust and audit are weaker if users can’t see sources in the product or export for review. |
| **Medium** | **Ecosystem** — AI and workflows inside existing tools (Entrata, email, calendar, drive) not only in our portal | Ecosystem | Adoption and daily use are lower if PMs must switch context to “the AI platform” every time. |
| **Medium** | **Workflow Builder** — Custom workflow design by customer (no-code/low-code), not only template clone | Workflows | Flexibility and “firm-specific” workflows are limited without a builder. |
| **Medium** | **Academy / Get-started** — Guided setup, checklists, training, expert workflow library | §4.6 | Addressed |
| **Medium** | **Collaboration** — Spaces, external members, shared spaces | §4.7 | Addressed (Phase 4) |
| **Lower** | **Drafting** as first-class (draft notice, letter, addendum from template + SOP) | Assistant | Nice-to-have for “research, draft, review” parity; can be a workflow type. |
| **Lower** | **Segment solutions** — Affordable, student, military; solution packs | §4.9 | Addressed (Phase 5) |
| **Lower** | **Trust page** — Certifications, data handling, “sources you trust” narrative | §4.8 | Addressed |

---

## 4. Recommended Next Steps (Product / Design)

**All items below are specified and sequenced in the TDD.** Implement per **`docs/architecture/TDD-ARCHITECTURE.md`** (build phases §6, dependency graph §7, gap closure §8).

1. **Vault** — TDD §4.1: single document store; SOPs as document type; bulk ops, review tables, Vault-triggered workflows (Workato).  
2. **Knowledge** — TDD §4.3: external/regional sources, jurisdiction, research experience.  
3. **Source citation in UI + export** — TDD §4.5: sources in every response and in UI; History Export for forensics.  
4. **Ecosystem** — TDD §4.4: Entrata widget first, then email add-in; roadmap.  
5. **Workflow Builder** — TDD §4.2: **Workato** embedded and white-label; platform connector; trigger from Vault; templates.  
6. **Academy / Get-started** — TDD §4.6: guided setup, checklists, training, expert workflow library.  
7. **Collaboration** — TDD §4.7: Spaces, external members, permissions, audit.  
8. **Segment solutions** — TDD §4.9: segment attribute, solution packs; Phase 5.

---

## 5. References

- **Harvey:** HARVEY-SIERRA-RESEARCH.md §1; Harvey platform page (Assistant, Vault, Knowledge, Workflows, Ecosystem); Harvey Academy; History Export / sources.
- **Our design:** DEEP-RESEARCH-PLATFORM-PARTS.md; ENTRATA-AND-SOP-SOURCE-OF-TRUTH.md; Platform Prompt; AGENT-TYPES-TAXONOMY.md.
- **Architecture (gaps closed):** **docs/architecture/TDD-ARCHITECTURE.md** — TDD and build plan; Vault+SOPs, Workato, Knowledge, citation, Academy, Ecosystem, Collaboration, Trust, segments.

*Last updated: Feb 2025. Gaps are closed in the TDD; build per TDD before feature work.*
