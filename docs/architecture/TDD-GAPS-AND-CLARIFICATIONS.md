# What’s Still Missing or Unclear (TDD & Related Docs)

**Purpose:** A single checklist of gaps, open decisions, and under-specified areas so you can close them before or during build. Use with **docs/architecture/TDD-ARCHITECTURE.md** and **docs/research/AI-NATIVE-PLATFORM-REQUIREMENTS.md**.

---

## 1. Decisions Still Open (Lock Before or Early in Build)

These are called out in the TDD or AI-Native Requirements but not yet **decided**; they block or risk rework if deferred.

| Area | What’s missing | Where it’s referenced | Action |
|------|----------------|------------------------|--------|
| **Model & inference** | No specific **provider(s)** or **model(s)** (e.g. Claude, GPT, Gemini). TDD §5.1 says “define” but doesn’t name one. | TDD §5.1; AI-Native §1 | Lock provider + model per use case (agents, routing if any); document in TDD or runbook. |
| **RAG** | No **embedding model** or **vector store** chosen (e.g. OpenAI embeddings + Pinecone, or pgvector). | TDD §5.2; AI-Native §2 | Choose embed model + vector store; document and add to build order. |
| **Voice stack** | No **telephony** or **STT/TTS** provider (e.g. Twilio, Vapi, Retell). | TDD §5.8; AI-Native §8 | Choose provider(s); document routing, latency budget, and test path. |
| **Auth & RBAC** | “Auth, RBAC” appear in the architecture diagram but there is **no platform auth spec**: SSO vs username/password, tenant vs user identity, role model (admin, staff, compliance, etc.). | TDD §2–3 diagram; §4.6 Getting Started | Add short “Auth & access” subsection (e.g. under §6 or new §4.10): tenant hierarchy, user roles, how residents/prospects are identified. |

---

## 2. Under-Specified (Need a Short Spec or Subsection)

These are referenced and in scope but don’t have a clear **data model** or **component spec** in the TDD.

| Area | What’s missing | Why it matters | Action |
|------|----------------|----------------|--------|
| **Escalations** | ~~No dedicated TDD component section~~ Inbox appears in Phase 1 (“Escalations + handoff”) and in research (summary + category, routing), but there is no §4.x for Inbox: data model (item, status, assignment), routing rules, SLA fields, link to conversation. | Build and product need a single place to read “what is an Inbox item, what fields, how does routing work.” | Add **§4.x Inbox (Escalation & human handoff)**: item model (conversation_id, summary, suggested_category, assignee, status, SLA); routing (by category, property, team); staff assist as part of Inbox UX. |
| **Workforce** | “Workforce (roles, teams, performance)” is in the diagram and in DEEP-RESEARCH; no TDD **component section**. Roles, teams, property-level permissions, and performance (task completion, inbox resolution, escalation rate) are not specified. | Permissions and performance drive who sees what in Escalations/Vault and how we report outcomes. | Add short **§4.x Workforce** (or fold into Escalations): roles, teams, property scope; how performance is sourced (Escalations resolution, escalation rate, feedback); or explicitly defer to Phase 2 and note “Phase 1: single role per tenant.” |
| **Internal platform tools** | Only the **pattern** is described (platform tools → our APIs/workflows → Entrata). No **catalog** of internal tools for Phase 1 (e.g. `platform/work_order/create`, `platform/lease/get`). | Engineering needs to implement a bounded set; agents need to know which tools exist. | Add **catalog or appendix** (TDD or ENTRATA-AND-SOP): list of internal MCP tools for launch (name, description, when to use vs external). |
| **Tenant / org hierarchy** | “Tenant,” “property,” “portfolio” are used throughout but not **formally defined** (e.g. one tenant = one PMC? one tenant = one portfolio? can one tenant have multiple Entrata connections?). | Affects multi-tenancy, billing, and scoping of data and agents. | **Addressed.** TDD **§2.1**: residents → units → property; property staff; roll-up (property → regional → asset manager → CEO); **CID** = one PMC in Entrata, multiple properties; **one tenant (SaaS) = one PMC = one CID = one Entrata account**. |

---

## 3. Unclear or Ambiguous (Resolved)

All items below are resolved in TDD v0.5: Phase 1 = all four ELI+ agents; Knowledge = Phase 3 (Vault only in Phase 1); staff assist = Escalations UX (§4.6); Entrata = unfettered access, no widget required (§4.4); outcome metrics = §4.11. See TDD §4.6, §4.11, §4.4 and GETTING-STARTED-SETUP-RESEARCH.

| Issue | Where | Status |
|-------|--------|--------|
| **Phase 1 agent scope** | Phase 1 says “four ELI+ agents (Leasing, Renewal, Maintenance, Payments); Escalations + handoff.” | **Resolved.** All four ELI+ agents ship in Phase 1, or Phase 1 = framework + 1–2 agents and the rest in Phase 2? If all four, are they equal in depth (same tool set, same SOP binding) or “Leasing + Maintenance first, Renewal + Payments lighter”? |
| **Knowledge in Phase 1** | Getting Started says “bind to Vault (and Knowledge when available)”; Phase 3 is “Knowledge + Academy.” | Clarify: **Knowledge is Phase 3**; Phase 1 agents use **Vault only**. Update Getting Started step 4 to “bind to Vault” (no “and Knowledge when available”) for Phase 1, or state “Knowledge optional in Phase 1 if we ship a minimal index.” |
| **Staff assist** | Research and handoff chain say staff get “suggested replies and policy snippets” from the same docs. | Confirm: is **staff assist** part of the **Escalations** UI (suggestions when viewing an escalated item) or a separate surface? Either way, add one sentence to TDD (e.g. Inbox or Channels): “Staff assist: when handling an Inbox item, suggest replies/snippets from the same SOP set.” |
| **Entrata widget** | §4.4 says “if Entrata supports widgets or extensibility, we provide a sidebar or widget.” | State **fallback**: e.g. “If Entrata does not support embedding, we provide a standalone portal link and deep-link from Entrata (e.g. from a menu) so PMs can open the assistant in a new tab.” |
| **Success / outcome metrics** | DEEP-RESEARCH mentions “outcome metrics (conversion, time to first response, escalation rate, hours saved) should be visible.” | TDD doesn’t say **where** these are shown or **what we commit to** for v1. Add one line: e.g. “Outcome metrics: Phase 1 we expose escalation rate and conversation count per property/agent; Phase 2+ add conversion, time-to-response, hours-saved (sourced from Escalations + workflow data).” |

---

## 4. AI-Native Foundations: “Resolved” vs “Open”

§5 lists **what must be defined**. Many items are still “define X” without a concrete choice. Helpful to track:

- **Resolved:** Decision made and documented (e.g. “Embedding: OpenAI text-embedding-3-small; vector store: Pinecone”).
- **Open:** Not yet decided; assign owner and target (e.g. “Model: CTO by end of Phase 0”).

Suggest adding a **short table or appendix** in the TDD (or a separate “Decisions” doc) with rows for: Model, Embedding, Vector store, Voice provider, Auth provider (if any), and mark Resolved / Open + link to where the decision is written.

---

## 5. Nice to Have (Can Defer)

- **Pilot/rollout:** How we roll out to first customer (e.g. single-tenant first, feature flags per agent). Can be a short “Go-to-market / pilot” note.
- **Public/partner API:** TDD §5.9 says “if third parties or Entrata will call the platform” — defer until there’s a concrete use case.
- **Webhooks:** Optional; add when a customer or Workato recipe needs “on escalation, POST here.”

---

## 6. Platform accommodations (regulation + org research)

After **MULTIFAMILY-REGULATION-AND-DUTIES-RESEARCH.md** and **PMC-ORGANIZATION-WORKFORCE-RESEARCH.md**, the following TDD updates were made so the platform explicitly accommodates where multifamily is regulated and how PMCs are organized. The design is **anchored** to that research in both directions:

| Change | TDD location | Research anchor (TDD → research) | Research doc (research → TDD) |
|--------|--------------|-----------------------------------|-------------------------------|
| **Regulation and high-risk activities** | §4.9.2 | Cites regulation doc **§2** (activity table), **§4.3** (platform implications) | Regulation doc “Anchored in TDD”: §4.9.2, §4.6, §4.7, §4.3, §4.5, §4.10, §6 |
| **Escalation categories include compliance/legal** | §4.6 | Cites PMC doc **§1** (core functions), **§8**; regulation doc **§3** (duties) | PMC doc “Anchored in TDD”: §4.6, §4.9.2, §4.11, §6 |
| **Compliance checklist items** | §4.7 | Cites regulation doc **§2**, **§3** | Regulation doc “Anchored in TDD”: §4.7 |
| **Workforce scope: region** | §4.9.2 | Cites PMC doc **§4** (centralization), **§8** | PMC doc “Anchored in TDD”: §4.9.2 |
| **Bidirectional anchoring** | TDD header | States that TDD cites research sections and research docs list implementing TDD sections | Each research doc has “Anchored in TDD” paragraph with section list |

No change to the **core problem** (AI-native platform on Entrata, SOPs as source of truth, agents + Escalations + Knowledge + governance). The design already had agent buckets aligned with duties, jurisdiction in Knowledge, segment, and guardrails; these edits make the mapping **explicit** and **traceable** so that (1) reading the TDD you know which research backs each decision, and (2) updating the research you know which TDD sections to revisit.

---

## 7. Current Gaps: Consolidated View

Single list of **what’s still missing or under-defined**, ordered by **must define before build** vs **should define for clarity** vs **optional**. Use this section to answer “where are the current gaps and what needs to be better defined?”

### Must define before (or early in) build

| Gap | What’s missing | Where to fix | § above |
|-----|----------------|--------------|---------|
| **Model & inference** | No provider/model chosen (e.g. Claude, GPT, Gemini). | Lock and document in TDD §5.1 or runbook. | §1 |
| **RAG** | No embedding model or vector store chosen. | Choose and document in TDD §5.2. | §1 |
| **Voice stack** | No telephony or STT/TTS provider chosen. | Choose and document in TDD §5.8. | §1 |
| **Auth & RBAC** | No platform auth spec (SSO vs password, tenant vs user, roles). | Add “Auth & access” subsection (e.g. §6 or new §4.x). | §1 |
| ~~**Tenant / org hierarchy**~~ | ~~Tenant, property, portfolio not formally defined~~ | **Addressed.** TDD §2.1: residents/units/property, roll-up, CID = one PMC = one Entrata account, multiple properties per tenant. | §2 |
| **Internal platform tools catalog** | No list of internal MCP tools for Phase 1 (name, description, when to use). | Add catalog or appendix in TDD or ENTRATA-AND-SOP §8. | §2 |

### Should define for clarity (under-specified)

| Gap | What’s missing | Where to fix | § above |
|-----|----------------|--------------|---------|
| **Workforce** | No dedicated TDD component: roles, teams, property scope, how performance is sourced (resolution, escalation rate, feedback). | Add short Workforce subsection (or fold into Escalations); or state “Phase 1: single role per tenant.” | §2 |
| **Escalations data model** | §4.6 exists but a single “data model” summary (item fields, status, SLA, link to conversation) in one place would help build. | Add §4.6.1 or build-order bullet: item schema (conversation_id, summary, category, assignee, status, SLA, link). | §2 |
| **PM health metrics (exact list)** | TDD §4.11.3 says we surface key PM metrics from Entrata; “exact list” is still product backlog. | Product backlog: map KPIs to Entrata (or data layer) fields. TDD §4.11.0 has rationale and list (renewal rate, occupancy, rent growth, etc.). | PAGE-CONCEPTS |
| **AI-native “Resolved vs Open”** | §5 items are “define X” without a Resolved/Open tracker. | Add table or appendix: Model, Embedding, Vector store, Voice, Auth → Resolved/Open + link to decision. | §4 |

### Optional (can defer or add later)

| Gap | What’s missing | Recommendation |
|-----|----------------|----------------|
| **Performance: correlation/causation method** | No research on *how* we deliver “insights” (causal inference, recommendation UX). | Ship heuristics first (narrative insights, “suggested focus”); add research if we invest in analytics. |
| **Governance: general AI liability** | No research on non-multifamily AI liability best practices. | Optional: add short research or link (e.g. NIST AI RMF) to MULTIFAMILY-REGULATION or new doc. |
| **Training / policy-doc escalation in research** | Types are in TDD; not in DEEP-RESEARCH Part 7. | Optional: add to DEEP-RESEARCH Part 7 so full escalation set is in research. |
| **Getting Started “hide when complete” in research** | TDD clear; not in GETTING-STARTED. | Optional: one sentence in GETTING-STARTED research. |
| **Pilot/rollout, public API, webhooks** | Not specified. | Defer until use case; see §5. |

*Sources: §1–§2 and §4 of this doc; **docs/product/PAGE-CONCEPTS-RESEARCH-AND-TDD-COVERAGE.md**.*

---

## Summary: Recommended Next Steps

1. **Lock:** Model/provider, embedding + vector store, voice provider; add Auth & RBAC subsection.
2. **Spec:** Tenant hierarchy (paragraph or table); internal platform tools catalog (appendix or ENTRATA doc); Workforce (short subsection or Phase 1 deferral); Escalations data model summary if not already clear in §4.6.
3. ~~**Clarify:** Phase 1 = all four agents or 1–2; Knowledge = Phase 3 only for agents; staff assist = part of Escalations; Entrata widget fallback; outcome metrics for v1.~~ **Done.** All four ELI+ in Phase 1; Knowledge = Phase 3; staff assist = Inbox; no widget, goal = unfettered Entrata; §4.11 outcome metrics added.
4. **Track:** Keep a “Resolved vs Open” list for §5 (AI-native) so nothing stays “define later” indefinitely.
5. **Product backlog:** Define exact list of PM health metrics (and Entrata source) for Performance page.
6. **Terminology:** Resident vs tenant is defined in TDD §2: **resident** = person in the unit (use in product/UI); **tenant** = our customer (PMC) in this TDD.

*This doc can live next to the TDD and be updated as gaps are closed; remove or archive items once they’re reflected in the TDD.*
