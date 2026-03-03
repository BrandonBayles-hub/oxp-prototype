# Page Concepts: Research and TDD Coverage

**Purpose:** Map every concept you mentioned in the **app pages outline** to (1) **TDD coverage** (do we specify it?) and (2) **research** (do we have a clear, documented understanding?). Surfaces gaps where we’re designing from product intent without research, or where the TDD is thin so we should add a sentence or a research note.

**Source:** User-provided sections and page goals (APP-PAGES-AND-GOALS.md). This doc is the single place to answer: “Do we have research and clear understanding of how all of that plays into what we’ve already outlined?”

---

## Section 1: To Do

### Getting Started

| Concept | TDD | Research | Notes |
|--------|-----|----------|--------|
| Land when nothing / not enough set up | §4.7.1 (landing when incomplete) | GETTING-STARTED-SETUP-RESEARCH: time-to-value, activation, first outcome | **Covered.** |
| Tab/section disappears when basic steps complete | §4.7.1 (tab hidden when complete → land on Command Center) | Not explicitly researched (“hide when complete”) | **TDD clear;** no separate research on “progressive disclosure” of Getting Started. Optional: one sentence in GETTING-STARTED research. |

### Command Center

| Concept | TDD | Research | Notes |
|--------|-----|----------|--------|
| Land here when setup complete | §4.12 (default landing when go-live satisfied) | — | **TDD covered.** |
| Insights on what needs to get done | §4.12 (what needs doing: Escalations summary, “where to look”) | DEEP-RESEARCH Part 7: escalation summary + category; handoff with context | **Covered.** Escalation summary + category is researched; “where to look” is product intent, implemented in TDD. |
| How workforce is performing | §4.12 (workforce performance: key metrics); §4.11 (outcome metrics) | DEEP-RESEARCH: “Performance/insights fed by task outcomes, escalation resolution, escalation rate, feedback”; PMC-ORGANIZATION §8 (units per staff, effective capacity) | **Covered.** |
| Orchestrate workforce, focus effort | §4.12 (orchestration: links to Escalations, Performance, Agent Roster, Workforce) | HARVEY-SIERRA: “orchestrates humans and AI as unified workforce”; DEEP-RESEARCH: “OrchVis… orchestration for human oversight,” workflows with human steps | **Covered.** “Orchestration” appears in research; TDD makes it concrete (links, entry points). |
| “Where to look” (insights on where to look) | §4.12 (“where to look” logic, e.g. top categories/properties by volume or SLA) | Not a dedicated research topic | **TDD specifies behavior;** no separate “command center UX” or “where to look” research. Acceptable to ship from TDD; add research later if we want patterns from other dashboards. |

### Escalations

| Concept | TDD | Research | Notes |
|--------|-----|----------|--------|
| Complete tasks agents couldn’t complete (escalated) | §4.6 (agent escalations, conversation couldn’t resolve, guardrail hit) | DEEP-RESEARCH Part 7: escalation triggers (confidence, complexity, sentiment, regulatory); summary + category | **Covered.** |
| Training tasks: AI asking for clarity on how to respond | §4.6.1 (type: training/clarity) | Not in DEEP-RESEARCH escalation triggers | **TDD added from product intent.** No prior research on “agent asks human for guidance” as escalation type. Clear enough to build; optional: add to DEEP-RESEARCH Part 7 as an escalation trigger/type. |
| Policy/documentation improvement (suggested doc changes) | §4.6.1 (type: policy/doc improvement) | Not in research | **TDD added from product intent.** No research on “suggested SOP/doc change → human review” as escalation. Clear to build; optional: note in ENTRATA-AND-SOP or DEEP-RESEARCH (doc lifecycle, feedback into Vault). |

---

## Section 2: My Workforce

### Performance

| Concept | TDD | Research | Notes |
|--------|-----|----------|--------|
| Output effecting outcome | §4.11 (outcome metrics: revenue impact, labor displaced, etc.) | DEEP-RESEARCH: “Performance/insights… task outcomes, escalation resolution, feedback”; PMC-ORGANIZATION: units per staff, effective capacity | **Covered.** |
| Key health metrics for property management (e.g. occupancy) | §4.11.3 example (“occupancy down; leasing resolution rate low”) | AGENT-TYPES: Intelligence agents for “pricing, **occupancy**, maintenance prioritization” as recommendations | **Partial.** TDD gives an example; we do **not** have a list of “PM health metrics we surface” or where they come from (e.g. Entrata KPIs: occupancy, rent growth, delinquency, etc.). **Gap:** Add one TDD bullet or product note: which PM health metrics we expose (and source, e.g. Entrata) so Performance page is defined. |
| Workforce performance (AI + humans) | §4.11 (agent vs human task split, workforce breakdown, effective capacity); §4.12 | PMC-ORGANIZATION, DEEP-RESEARCH (roles, teams, performance) | **Covered.** |
| Not just BI — insights (correlation, causation, trajectory) | §4.11.3 (insights-oriented; correlation/causation; guidance to change trajectory) | AGENT-TYPES: Intelligence agents = “insight and recommendation,” “what to do next”; DEEP-RESEARCH: “insights” from task/escalation/feedback data | **Partial.** We have the **intent** and agent-type support for “recommendations.” We do **not** have research on **how** to deliver “correlation/causation” or “trajectory” UX (e.g. causal inference, recommendation engines, narrative insights). **Gap:** Either (a) add a short research note or product assumption (“we surface narrative insights and recommendations where data allows; method TBD”), or (b) accept TDD as sufficient and implement heuristics (e.g. “top movers,” “suggested focus”) until we invest in deeper analytics. |

### Agent Roster

| Concept | TDD | Research | Notes |
|--------|-----|----------|--------|
| Create, find, manage AI agents | §4.13 (list, filters, create, per-agent view) | AGENT-TYPES (ELI+, Intelligence, Operations); §6 (buckets, four ELI+) | **Covered.** |
| Categories, status, types | §4.13 (filters: category, status, type); §6 (buckets, agent types) | AGENT-TYPES taxonomy; DEEP-RESEARCH | **Covered.** |
| Per-agent performance and value | §4.13 (per-agent: conversation count, resolution rate, escalations, revenue impact) | §4.11 outcome metrics (per-agent breakdown implied) | **Covered.** |

### Workforce

| Concept | TDD | Research | Notes |
|--------|-----|----------|--------|
| Org chart of the future | §6 (Workforce page: org chart, AI + human) | PMC-ORGANIZATION: structure types, tiers, “org charts drive growth”; HRIS as source of truth | **Covered.** |
| AI agents + human staff together | §6 (AI and human placement, team roll-up) | PMC-ORGANIZATION (functions, teams); HARVEY-SIERRA (unified workforce) | **Covered.** |
| Team-focused and org chart | §6 (team-focused, org chart, roll-up by team/function) | PMC-ORGANIZATION §3 (portfolio, departmental, pod); §4 (centralization) | **Covered.** |
| JTBD: who is working on what problem, how it rolls up | §6 (JTBD emphasis; who works on what, how it rolls up) | PMC-ORGANIZATION: functions (who does what), routing by function; no explicit “JTBD” framing in research | **TDD captures intent.** Research supports “function” and “routing by role/team”; JTBD is product language. **Clear.** |

---

## Section 3: Configure

### Workflows

| Concept | TDD | Research | Notes |
|--------|-----|----------|--------|
| Workflows and automations across Entrata and other connectors | §4.2 (Workato, platform connector, Entrata); §4.2.1 (Workflows page) | ENTRATA-AND-SOP (MCP, APIs); GETTING-STARTED (iPaaS first workflow); DEEP-RESEARCH (workflows, human steps) | **Covered.** |

### Voice

| Concept | TDD | Research | Notes |
|--------|-----|----------|--------|
| Branding: how agents talk and behave | §4.14 (branding, tone, how agents identify company) | No dedicated “voice branding” research | **TDD specifies.** Optional: later research on tenant branding for AI. |
| Communication methods | §4.14 (channels, numbers, which agent handles which channel); §5.8 (voice stack) | GETTING-STARTED (voice/channels step); DEEP-RESEARCH (voice & channels) | **Covered.** |
| Unified vs per-property Voice | §4.14 (unified voice vs per-property voice; configurable per tenant) | §4.10 Segment (tenant/property-level attributes); no research on “one voice vs per-property” strategy | **TDD specifies.** Product decision; no prior research needed. |
| Controlled phrasing/terms (don’t misspeak, especially regulated) | §4.14 (controlled phrasing; prohibited/required; tagging for regulated areas) | MULTIFAMILY-REGULATION: advertising, screening (no discriminatory content); FHA applies to messaging; DEEP-RESEARCH Part 6 (guardrails) | **Covered.** Regulation research backs “don’t misspeak” in regulated areas; TDD adds config surface. |

### Tools

| Concept | TDD | Research | Notes |
|--------|-----|----------|--------|
| Set up and activate Entrata MCP and external MCP | §4.15 (Tools page; enable/configure MCP servers; scope to agents) | ENTRATA-AND-SOP §8 (internal vs external tools, MCP); §6 Cross-Cutting | **Covered.** |
| For creating their own agents | §4.13 (create agent); §4.15 (tools available to agents) | AGENT-TYPES (custom agents); ENTRATA-AND-SOP (tool naming, policy) | **Covered.** |

### Governance

| Concept | TDD | Research | Notes |
|--------|-----|----------|--------|
| Configure guardrails around regulated (multifamily) | §4.16, §4.9.2 (guardrails by activity/agent; required-docs; approval) | MULTIFAMILY-REGULATION-AND-DUTIES-RESEARCH (activities, platform implications); DEEP-RESEARCH Part 6 (guardrails, HUD, fair housing) | **Covered.** |
| Not only multifamily — best practices to govern AI, reduce liability | §4.16 (general AI governance: human-review, audit, output filters) | MULTIFAMILY-REGULATION (provider liability, vicarious liability); no dedicated research on **general** AI governance or liability best practices | **Partial.** TDD calls out “general AI” settings; we don’t have a research doc on industry or legal “AI liability best practices” beyond housing. **Gap:** Optional: add a short research note or linked source (e.g. NIST AI RMF, EU AI Act, or internal “AI governance checklist”) so we’re not designing from scratch. |

---

## Summary: Gaps and Recommendations

| Area | Gap | Recommendation |
|------|-----|----------------|
| **Performance: PM health metrics** | We mention “occupancy” as an example but don’t define which PM KPIs we surface or where they come from (e.g. Entrata). | Add to TDD §4.11 or §4.11.3: “Key PM health metrics (e.g. occupancy, rent growth, delinquency) sourced from Entrata or data layer; shown alongside workforce outcome metrics.” Optionally add a short research or product note: “PM KPIs we support (list and source).” |
| **Performance: correlation/causation/trajectory** | We say “insights-oriented” but have no research on *how* (causal inference, recommendation UX). | Accept TDD as sufficient for v1; implement “narrative insights” and “suggested focus” heuristics. If we invest in causal or recommendation engine later, add research then. |
| **Escalations: training / policy-doc types** | Added from product intent; not in DEEP-RESEARCH. | Optional: add “training/clarity” and “policy/doc improvement” to DEEP-RESEARCH Part 7 escalation types so future readers see the full set. |
| **Governance: general AI liability** | TDD has “general AI governance”; no research on non-multifamily AI liability best practices. | Optional: add a “General AI governance” subsection or link (e.g. NIST, or one-pager) to MULTIFAMILY-REGULATION or a new doc so we don’t design from scratch. |
| **Command Center: “where to look”** | TDD specifies; no dashboard/command-center UX research. | Acceptable; ship from TDD. Add research later if we want to refine (e.g. ops dashboards, “where to look” patterns). |
| **Getting Started: hide when complete** | TDD clear; not in GETTING-STARTED research. | Optional: one sentence in GETTING-STARTED: “When go-live checklist is satisfied, Getting Started can be hidden and user lands on Command Center.” |
| **Voice: unified vs per-property** | TDD specifies; no research. | Product decision; no research required. |

---

## Conclusion

- **Most of what you outlined** is either **already in the TDD** with **research backing** (regulation, org structure, escalations, workforce, guardrails, voice phrasing, tools, workflows), or **in the TDD** with **product intent** (training escalation, policy-doc escalation, Command Center “where to look,” JTBD framing, Performance insights).
- **Clear gaps:** (1) **Which PM health metrics** we show and where they come from (e.g. occupancy from Entrata). (2) **How** we deliver “correlation/causation/trajectory” (method left open; we can ship heuristics first). (3) **General AI liability best practices** (optional research or link).
- **Recommendation:** Add the **PM health metrics** bullet to the TDD so Performance page scope is explicit. Treat correlation/causation/trajectory as “insights-oriented UX, method TBD.” Optionally add the small research or doc updates above so everything you mentioned is either specified in the TDD or called out as “intent only” or “optional research.”

*Last updated: Feb 2025. Use when asking “do we have research and clear understanding” for any page concept.*
