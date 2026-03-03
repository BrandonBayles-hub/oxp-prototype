# Deep Research: Platform Parts & How They Fit Together

**Purpose:** Deep research on each major part of the AI-native multi-family platform (from the Platform Prompt), with citations and patterns from production systems, then synthesis of **how the parts fit together**. No build yet—research only.

**Relationship to other docs:** Use with `HARVEY-SIERRA-RESEARCH.md` (reference models) and the Platform Prompt (features, vision, research principles). This doc goes deeper on each capability area and integration. **Architecture and build plan:** **docs/architecture/TDD-ARCHITECTURE.md** defines the Vault (unified document store with SOPs), Workato as Workflow Builder, Knowledge, citation, Academy, and other gap-closing components and phases.

---

## Part 1 — AI Agents

### 1.1 What the Platform Prompt Asks For

- Agents with a clear **role**, **goal**, **functions** (discrete skills), **tools** (typed capabilities), and **documents** (SOPs that ground answers).
- Answer/triage/suggest/run workflows using **only** approved docs and tools.
- **Escalate** to human with enough context to avoid re-asking.
- **Test** agents, compare responses, **submit feedback**; human evaluation as first-class path.
- **Short, scoped** agents (e.g. ≤10 steps before human step); prompting + external knowledge; human evaluation (+ optional LLM-as-judge).

### 1.2 Research: Success Pattern (OpenClaw-Style)

**Bounded autonomy:** OpenClaw and similar production frameworks use multiple layers of control so agents cannot act beyond intended scope:

- **Tool policies:** Global allow/deny lists so disallowed tools never reach the model.
- **Tool profiles:** Base allowlists (e.g. full, messaging, coding, minimal) by use case.
- **Provider-specific and per-agent overrides:** Further restrictions per provider or per agent.

**Tools vs. skills:** Tools are first-class, typed capabilities (file, web, memory, messaging, etc.) organized by function; policy is applied at the tool boundary, not only in the prompt. “Skills” are prompt-level behavior (how to behave); keeping capabilities in tools makes behavior auditable and prevents “everything in the prompt.”

**External knowledge:** Context is assembled from bootstrap files and workspace; memory is persistent (e.g. Markdown) with explicit search/retrieval tools. Knowledge is externalized rather than encoded only in weights.

**Observable execution:** Agent loop is serialized (intake → context assembly → inference → tool execution → persistence); queueing modes avoid tool races and keep session consistency. This supports audit and debugging.

*Source: OpenClaw docs (clawdocs.org, docs.openclaw.ai), “How OpenClaw Works” (Medium, Feb 2026).*

### 1.3 Research: Failure Pattern (Agentforce/Doomprompting) — What to Avoid

**Unbounded LLM-only planning:** Relying on the model to decide “next step” every time creates latency, nondeterminism, and limited control. Same scenario can yield different paths on different runs.

**Doomprompting:** Loading the system prompt with many “always/only” conditionals does not fix this:

- Each instruction adds complexity and latency.
- Models follow instructions only ~95% of the time; 5% failure on critical workflows (e.g. returns) is unacceptable.
- The approach is brittle and not reliably configurable.

**Prompt-only control for safety/compliance:** In regulated or customer-facing contexts, prompts alone are insufficient; control must be structural (tool policies, step limits, approval gates).

**Vague roles/goals:** “Help with everything” leads to unpredictable, hard-to-audit behavior.

**Salesforce’s response:** Agent Script + configurable graph: deterministic logic (topic classification, action sequencing, conditionals) defined in script/config; LLM used where creativity adds value. “Creativity toggle”: deterministic when reliability matters, generative when it helps.

*Sources: Salesforce “Doomprompting” blog (Oct 2025), Agentforce “Five Levels of Determinism,” Agent Script / Flow of Control docs, “Agent Graph: Guided Determinism with Hybrid Reasoning” (Salesforce Engineering).*

### 1.4 Research: Production Reality (Measuring Agents in Production — MAP)

**Large-scale study:** 306 practitioners, 20 in-depth case studies, 26 domains; filtered to 86 deployed (production/pilot) agents.

**Step bounds:**

- **68%** of production agents run **at most 10 steps** before human intervention; **47%** run **fewer than 5 steps**.
- **46.7%** use **fewer than 5 model calls** per subtask; **66.7%** use fewer than 10.
- Prototypes/research agents tend to have higher step counts; production teams “aggressively cap or refactor” as they move to deployment.

**Why:** Problem complexity, nondeterminism in self-planning, latency, and cost. Teams “deliberately constrain agent autonomy to maintain reliability” and “trade capability for controllability.”

**Models and prompting:**

- **70%** of case-study systems use **off-the-shelf models** (no weight tuning); prompting is the main lever.
- **79%** of deployed agents rely heavily on **manual prompt construction**; prompts can exceed 10K tokens.
- Automated prompt optimization is rare; humans prioritize controllability and fast iteration.

**Evaluation:**

- **74%** depend primarily on **human-in-the-loop** evaluation.
- **52%** use **LLM-as-a-judge**; every team using LLM-as-judge **also** uses human verification.
- Production tasks are domain-specific; public benchmarks rarely apply; 75% of case-study teams evaluate without formal benchmarks (A/B, expert/user feedback).

**Control flow:** **80%** of case studies use **structured control flow**; agents operate in “well-scoped action spaces.” Open-ended autonomy is rare; one case had it in a sandbox with strict CI/CD on outputs.

*Source: “Measuring Agents in Production” (MAP), Pan et al., arXiv:2512.04123, 2025 — UC Berkeley, Stanford, IBM Research, etc.*

### 1.5 Research: Tool-Use and Hallucination Risks

**Tool-use hallucinations** include: calling the right tool with wrong/missing/fabricated parameters; selecting irrelevant or non-existent tools; claiming a query is solvable when it isn’t; answering without calling tools (“simulating” results); over-relying on tool output instead of reasoning.

**Production impact:** In one study, **68%** of tool-calling errors were **parameter errors** (wrong values, wrong records). Real-world API complexity (e.g. noisy specs) can reduce strong model performance by **27%**. Mitigations that have reduced hallucination from ~23% to ~1.4% in production include: **structured output enforcement**, **parameter validation**, **two-LLM verification**, **standardized tool return formats**, and **defensive error handling**—never let the agent treat HTTP status as “task done” without explicit handling.

*Sources: “Beyond Perfect APIs: Evaluation of LLM Agents Under Real-World API Complexity” (arXiv:2601.00268); “Tool-Use Hallucinations in LLM Agents” (emergentmind.com); “Advanced Function Calling, Tool Composition, Production Agents 2026” (Iterathon).*

### 1.6 Synthesis: Agents in the Platform

- **One primary goal per agent;** discrete **functions** with instructions and tools; **documents** as SOPs attached at agent or function level.
- **Step limits or explicit escalation** (e.g. max steps or “escalate to Escalations / create task”) visible in config and runtime; design for **≤10 steps** before a human step as the default.
- **Typed, validated tool/API contracts** and **structured errors**; validate at the service layer; no free-form tool args or silent failures.
- **Testing and feedback:** Human-in-the-loop testing and feedback as first-class; optional LLM-as-judge with human verification; compare responses and iterate on prompts/config, not on “do everything” autonomy.

---

## Part 2 — Documents, Training & SOPs

### 2.1 What the Platform Prompt Asks For

- **Document library:** SOPs, policies, training materials; **versioned**; **approval flows**.
- **Single source of truth** for what agents (and staff assist) may say and do.
- Documents attach at **agent** or **function** level; for high-risk functions, **explicit binding** of specific docs (or doc sets) per step.
- **Observability:** record and show **which document chunks (or doc IDs)** were used for a given answer or action (combat “lost in the middle,” support audits).
- **Compliance and fair housing:** tag/filter documents; scope which docs apply to sensitive flows.

### 2.2 Research: Lost in the Middle (RAG / Long Context)

**Phenomenon:** LLMs with long context often use information at the **start and end** of the context well, but **underuse or ignore information in the middle**—accuracy can drop by **30%+** when relevant info is mid-context. In RAG, the retriever may find the right doc but the model still ignores it.

**Mitigations:**

- **Reranking:** Two-stage retrieval (e.g. broad vector search + cross-encoder rerank) so the most relevant content is placed at **beginning and end** of context.
- **Reduce volume:** Limit to the most relevant 3–5 documents when possible.
- **Hybrid search:** Semantic + lexical (e.g. BM25) for better retrieval.

**Platform implication:** “Which chunks were used” is not enough if the model then ignores them. Observability should support **both** retrieval (what was fetched) **and** usage (what the model actually attended to / cited). Reranking and positioning of critical SOP snippets matter.

*Sources: “Lost in the Middle: How Language Models Use Long Contexts” (arXiv:2307.03172); “Solving the Lost in the Middle Problem” (GetMaxim); Nelson-Liu et al. replications.*

### 2.3 Research: Document Versioning, Approval, and Compliance

**Versioning:** Major versions (1, 2, 3) or major/minor (1.0, 1.1, 2.0) for draft vs. published; retention limits to manage storage and lifecycle.

**Approval workflows:** Draft → review (assigned reviewers) → edit (tracked revisions) → approval (formal sign-off) → archive. Centralized platform avoids approvals scattered across email/chat and preserves a single current version.

**Traceability:** Role-based permissions (who can review/approve); version control (which iteration was approved); audit trail (timestamps, comments, decision evidence); change authorization and lifecycle states. Essential for regulatory and legal disputes.

*Sources: SharePoint versioning/approval planning; Athento “Document Approval Workflows”; Process.st document control; Moxo approval workflow templates.*

### 2.4 Research: Harvey-Style Grounding and Audit

**Source citation:** Harvey links every answer to the **exact sources** used; responses are grounded in curated, jurisdiction-specific materials. Regional Knowledge limits search/citations to a defined set of authoritative sources per jurisdiction.

**Audit trail:** History Export APIs support “query forensics”: exact prompts, outputs, and **source fields** so organizations can trace which materials were used for a given output and verify grounding. The `documents` and `source` fields enable citation-path tracing.

**Platform implication:** Implement “which document chunks (or doc IDs) were used” at response time and in exports; support deep-dive and compliance reviews. For PMC, “approved docs only” and “sources you trust” is the trust narrative.

*Sources: Harvey platform/blog (BigLaw Bench – Sources); Harvey History Exports / Query History API; Regional Knowledge Sources Overview.*

### 2.5 SOPs as Source of Truth for Operations and Settings

- **SOPs** are the source of truth for both **operations** (the procedures the workforce does) and **settings** (SOPs access and control platform/operational settings). So procedure and configuration stay aligned: one place to change “what we do” and “how the system is set.” See **ENTRATA-AND-SOP-SOURCE-OF-TRUTH.md** for research on document-driven configuration, policy-as-code patterns, and integration with Entrata.

### 2.6 Synthesis: Documents & SOPs in the Platform

- **Versioned document library** with **approval workflow** (draft → review → approval → published); single source of truth; no scattered approvals.
- **Binding:** Documents at agent or function level; for high-risk (e.g. leasing, screening, refunds), **explicit doc (or doc set) per step** where possible.
- **SOP usage observability:** Record and expose **which chunks/doc IDs** were retrieved **and** used for each answer/action; support audit and “lost in the middle” diagnosis.
- **Compliance tagging:** Tag/filter docs for fair housing, lease terms, deposits; scope which docs are in context for sensitive flows.
- **SOPs drive operations and settings:** Procedures and settings that control behavior (escalation, SLAs, workflows, etc.) are derived from or controlled by approved SOPs so that “what the doc says” and “what the system does” match.

---

## Part 3 — Workflows

### 3.1 What the Platform Prompt Asks For

- **Workflows** chain agents and/or steps (e.g. lead-to-lease, maintenance triage, renewal outreach); first-class unit of value.
- Users see **which agents participate** in which workflows; **workflow templates** (e.g. PMC-specific) to clone and configure.

### 3.2 Research: Workflow Design and Human Steps

**Human-in-the-loop (HITL):** Workflows pause at decision points to collect human input before proceeding; essential when AI output must be reviewed or approved. Patterns: signal handlers, request/response payloads, durable timers (e.g. 5-minute approval timeout) that survive restarts.

**Structured request handling:** Workflow emits a request event with payload; app collects human response; workflow resumes with response mapped to request ID. All human decisions logged for compliance.

**Conflict resolution:** When agents disagree or edge cases arise, systems can flag and escalate to humans with high-level rationale, proposed resolution, and predicted next state.

**Step limits and recovery:** Configurable timeouts per step, retry limits, and recovery strategies; on failure, retry until limit then error handling. Aligns with MAP: production workflows are short and bounded.

*Sources: “OrchVis: Hierarchical Multi-Agent Orchestration for Human Oversight” (arXiv:2510.24937); Microsoft “Human-in-the-Loop Workflows”; Temporal “Human-in-the-Loop AI Agent”; Akka workflow/orchestration docs.*

### 3.3 Research: Deterministic Control (Salesforce / Agent Script)

**Hybrid reasoning:** Deterministic logic (topic classification, action sequencing, conditionals) plus agentic steps. “Crack open the agent graph”: users configure order of actions, insert logic between classification and execution, and define deterministic sequences (e.g. “always run account lookup immediately”) in script/config rather than prompt.

**Platform implication:** Workflows should allow **deterministic segments** (fixed sequence, branching rules) and **agentic segments** (LLM decides within a bounded set of actions). Templates can encode PMC best practices (e.g. “lead → qualify → schedule showing → follow-up”) with clear human steps (e.g. “escalate to leasing if X”).

### 3.4 Synthesis: Workflows in the Platform

- **First-class workflows:** Named, template-able (e.g. Leasing, Maintenance triage, Renewal); show which agents and steps participate.
- **Bounded, human-aware design:** Short chains (aligned with ≤10 steps before human); explicit **human steps** (approval, escalation, review) with clear handoff and audit.
- **Deterministic + agentic:** Where order and branching are fixed, use config/script; where judgment is needed, use scoped agent with step limits and approved tools/docs.

---

## Part 4 — Voice & Channels

### 4.1 What the Platform Prompt Asks For

- **Voice** (calls) and **channels** (chat, SMS, etc.); same agent logic and **same document set** across channels.
- **Staff assist:** when a human handles an escalated conversation, suggest replies or policy snippets from the same document set.

### 4.2 Research: Handoff With Context (Sierra / Contact Center)

**Problem:** ~**68%** of bot-to-agent transfers **lose context**, forcing customers to repeat themselves; handle time increases (~23 seconds on average) and CSAT drops (~31%) when escalation requires repetition.

**What to pass on handoff:**

- Full conversation history (with timestamps).
- Customer profile / CRM data.
- AI’s understanding and what it tried.
- Sentiment and escalation reason.
- **3–5 sentence agent-facing summary** so the rep can act without reading the full thread.

**Routing:** By intent, complexity, customer tier, agent specialization, availability. Target handoff time &lt;30 seconds; acknowledge escalation immediately.

**Categories:** Always Human (complaints, legal, VIP), Preferred Human (complex), AI-First (standard). Monitor escalation patterns to improve the agent.

*Sources: “AI to Human Escalation: Designing Seamless Handoffs” (Pertama Partners); “AI-Human Call Handoff Protocols” (Smith.ai); “How To Enable Contextual Handoff” (Frejun); “The AI Handoff Problem” (ETSLabs); “Human-AI handoff playbook 2025” (Thread Transfer).*

### 4.3 Research: Staff Augmentation (Live Assist–Style)

Sierra’s **Live Assist** gives reps: real-time guidance (next steps in chat/call), auto-drafted on-brand responses grounded in company knowledge, one-click workflow start without losing context, and automatic capture/update of customer info. Same knowledge and brand as the agent; human stays in control.

**Platform implication:** When a conversation is escalated, the escalation item should include **summary + suggested category**; when the rep is in the conversation, the UI can suggest **replies and policy snippets** from the same SOP set the agent used, with one-click actions (e.g. create work order).

### 4.4 Synthesis: Voice & Channels in the Platform

- **One agent definition, many channels:** Same goals, tools, and **document set** for chat, SMS, voice, portal; consistent behavior and policy.
- **Handoff with context:** Summary + suggested category (e.g. leasing, maintenance); full thread and customer context available; design so the customer doesn’t repeat.
- **Staff assist:** For escalated conversations, suggest replies and policy snippets from the same SOP set; one-click actions; real-time guidance from the same knowledge base.

---

## Part 5 — Workforce, Roles & Teams

### 5.1 What the Platform Prompt Asks For

- **Teams**, **roles** (e.g. Admin, Team Lead, Teammate), **directories**, **performance** (training data, task data, escalations data → insights). Property permissions apply throughout.

### 5.2 Research: PMC Organization

**Full research:** **docs/research/PMC-ORGANIZATION-WORKFORCE-RESEARCH.md** — how large PMCs are organized (core functions, tiers, portfolio vs departmental vs pod structures, centralization trend, staffing ratios). Use when defining Workforce (roles, teams, scope, performance).

**Typical functions:** Operations, Property Management, Leasing, Maintenance, Accounting/Finance, Compliance/Legal. Structure varies by portfolio size (e.g. 500-unit portfolio has specific role distributions).

**Trend:** Shift from **on-site per property** to **centralized/portfolio-level** teams: specialists work across properties with standardized processes, reducing duplication and enabling data-driven decisions. Scaling requires clear roles and reporting (org charts).

**Platform implication:** **Roles** map to these functions (and to platform permissions); **teams** can be property, portfolio, or regional. **Performance** should consume task completion, escalation resolution, escalation rate, and—where applicable—training/feedback data, with property/portfolio filters.

*Sources: Property management consulting org/structure posts; Second Nature “How to Structure a PMC”; AppFolio “Centralizing Multifamily Teams.”*

### 5.3 Synthesis: Workforce in the Platform

- **Roles and teams** aligned with PMC structure (Admin, Team Lead, Teammate, plus functional specialties); **property/portfolio permissions** applied consistently to agents, tasks, and escalations.
- **Performance/insights** fed by: task outcomes, escalation resolution, escalation rate, and human feedback; support accountability and improvement.

---

## Part 6 — Governance, Trust & Compliance

### 6.1 What the Platform Prompt Asks For

- **Governance:** trust and compliance settings (e.g. fair housing safeguards, human-review toggles, required-docs checklist, audit logging).
- Users understand: data isolation, what is logged (traces, tool calls, which docs were used), and how the platform stays within policy.

### 6.2 Research: Deterministic Guardrails

**Layers:** (1) **Milliseconds:** regex/rule-based (blocklists, format, rate limits); (2) **100–500ms:** lightweight model-based classification for nuanced safety; (3) **Seconds:** full verification for high-stakes decisions. Deterministic checks are fast, predictable, and not bypassable by prompt injection.

**Approval gates:** Human-in-the-loop at the **execution layer**—pause before high-risk actions; require explicit approve/deny. Enforcement at tool boundary, not prompt; decisions cryptographically bound to the action. Best for irreversible or context-dependent risks.

*Sources: “GuardAgent: Safeguard LLM Agents” (arXiv:2406.09187); Claw EA “Step-up approvals”; LangChain/OpenAI guardrails docs; “Agent Guardrails” (self.md).*

### 6.3 Research: Fair Housing and PMC Compliance

**HUD guidance (May 2024):** Fair Housing Act applies to AI-based tenant screening and housing-related advertising. Discrimination is prohibited regardless of whether AI is used. Requirements:

- **Consistent policy:** Screening policies transparent, in writing, publicly available before application; criteria applied consistently and only within stated scope (e.g. felonies only if policy says so).
- **Transparency and accountability:** Housing providers and third-party screeners share responsibility; providers can have vicarious liability. Applicants get screening reports and chance to dispute.
- **Best practices:** Design and test AI for FHA compliance; screen only for information relevant to tenancy obligations; ensure accuracy (inaccuracies can disproportionately affect protected groups); caution with credit, criminal, eviction history.

**Platform implication:** Resident-facing agents need **stronger guardrails** and **clear escalation** (e.g. to Escalations/task). Leasing/screening workflows should use **deterministic policy checks** and **approved-docs-only** grounding; optional “does this contradict policy?” check before sending; full audit trail of what was said and which docs were used.

*Sources: HUD “Fair Housing Act Guidance on AI” (No. 24_098); Consumer Financial Services Law Monitor; NMHC/NCHM white papers on AI and resident screening.*

### 6.4 Synthesis: Governance in the Platform

- **Deterministic guardrails** for PMC-sensitive actions (leasing, screening, refunds, legal language): policy checks, approval gates, required-docs checklist; not only “be polite” in prompts.
- **Audit:** Log traces, tool calls, which docs were used; data isolation and retention clear to buyers.
- **Trust/compliance narrative:** Fair housing posture, lease-term consistency, approved docs only, human-review toggles, and clear escalation paths.

**Full research:** **docs/research/MULTIFAMILY-REGULATION-AND-DUTIES-RESEARCH.md** — where multifamily is regulated (federal/state/local), how regulation applies by activity, duties and functions in multifamily with regulation touch points, and how both AI and human workforce must stay within those regulations. Use when defining jurisdiction scope, Knowledge filters, and which agent actions need guardrails or human-in-the-loop.

---

## Part 7 — Escalations & Escalation

### 7.1 What the Platform Prompt Asks For

- **Escalations** (or equivalent) for items needing human attention. On escalation: **conversation summary** + **suggested category** (e.g. leasing, maintenance, accounting) so staff can act without re-reading the whole thread.

### 7.2 Research Already Covered

- Handoff with context (Section 4.2): summary, category, full thread, customer context; avoid “customer repeats.”
- Staff assist (Section 4.3): same doc set for suggested replies and one-click actions.

### 7.3 Escalation Triggers (From Research)

- Customer requests human.
- Confidence below threshold (e.g. 60–70%).
- Conversation complexity (nuance, policy exception).
- Negative sentiment, loop detection, regulatory/security requirements.

**Platform implication:** Escalation rules (triggers) should be configurable; every escalated item must carry **summary + suggested category** and link to full context. Escalations should support filtering by category, property, and team so work is routed and visible for performance.

### 7.4 Synthesis: Escalations in the Platform

- **Escalations** as first-class surface for escalated conversations and tasks; **summary + suggested category** attached on every escalation.
- **Routing** by category, property, team, specialty; integrate with Workforce (roles, teams, performance).
- **No “drop the user”:** Handoff = hand off **with context** so the human can resolve quickly and the resident doesn’t repeat.

---

## How the Parts Fit Together

### A. Single Source of Truth and Shared Context

- **Documents/SOPs** are the single source of truth. They feed:
  - **Agents** (retrieval + grounding per agent/function; observability of which chunks were used).
  - **Staff assist** (same docs for suggested replies and policy snippets).
  - **Governance** (required-docs checklist, compliance tagging, audit of “what was used”).
- **Workflows** reference the same doc sets and agents; templates (e.g. Leasing, Maintenance) encode which docs and which human steps apply.

### B. Agent → Human Handoff Chain

- **Agents** run bounded steps (e.g. ≤10) with typed tools and approved docs; when they can’t resolve or hit a guardrail, they **escalate**.
- Escalation creates an **escalation** item with **summary + suggested category** and full conversation + customer context.
- **Workforce** (roles, teams, property permissions) determines who sees what in Escalations and who gets credit in **performance**.
- **Staff assist** uses the **same document set** to suggest replies and one-click actions, so the human continues in policy.

### C. Governance and Trust Across the Stack

- **Documents:** Versioning + approval + compliance tags; binding at agent/function/step for high-risk flows.
- **Agents:** Step limits, tool policies, deterministic guardrails for sensitive actions; SOP usage observability.
- **Workflows:** Human steps and approval gates; audit trail of decisions.
- **Voice & channels:** Same agent and docs; handoff with context; staff assist from same knowledge.
- **Escalations:** Every escalation categorized and summarized; routing and performance visible.
- **Governance:** Fair housing and compliance posture; audit logging (traces, tool calls, docs used); human-review toggles and required-docs.

### D. Outcome-Oriented Loop

- **Performance/insights** (workforce) consume: task completion, escalation resolution, escalation rate, feedback.
- **Outcome metrics** (conversion, time to first response, escalation rate, hours saved) should be visible so value is clear and optimizable.
- **Testing and feedback** on agents (human-in-the-loop, compare responses, feedback loop) improve behavior; **templates and onboarding** (PMC agent/workflow templates, light “Academy”) let teams ship quickly and expand.

### E. Data and Control Flow (Conceptual)

```
[Documents: versioned, approved, tagged]
        ↓ (binding + retrieval)
[Agents: role, goal, functions, tools, step limits]
        ↓ (grounded responses; escalation when needed)
[Workflows: chains of agents + human steps; templates]
        ↓ (same agent + docs)
[Voice & Channels: chat, SMS, voice, portal]
        ↓ (handoff with summary + category)
[Escalations: escalated items; routing by team/role/property]
        ↓ (staff assist: same docs → suggestions + actions)
[Workforce: roles, teams, performance]
        ↑
[Governance: guardrails, audit, compliance] —— applies to all layers
```

---

## Summary Table: Research → Platform Part

| Platform Part      | Key Research                                                                 | Design Implication |
|------------------------------------------------------------------------------------|-------------------------------------|
| **AI Agents**       | MAP (68% ≤10 steps, 70% prompting, 74% human eval); OpenClaw (bounded autonomy, tools vs skills); Doomprompting (deterministic anchor); tool hallucination (typed APIs, validation) | One goal per agent; step limits; typed tools; human testing/feedback; no unbounded planning |
| **Documents/SOPs**  | Lost in the middle (rerank, position, observability); Harvey (source citation, audit); versioning/approval (traceability) | Versioned + approved; binding per agent/function/step; record which chunks used |
| **Workflows**       | MAP (structured control); HITL (pause, approve, audit); Agent Script (deterministic + agentic) | First-class workflows; templates; human steps; deterministic segments where possible |
| **Voice & Channels**| Handoff (summary, category, no repeat); Live Assist (same docs, suggestions) | Same agent + docs; handoff with context; staff assist from same SOP set |
| **Workforce**       | PMC structure (centralized, roles, portfolio)                               | Roles/teams; property permissions; performance from task/escalations/feedback |
| **Governance**      | Deterministic guardrails; approval gates; HUD/fair housing                    | Guardrails for sensitive actions; audit; compliance narrative; human-review toggles |
| **Escalations**     | 68% handoffs lose context → CSAT drop; summary + category                    | Summary + suggested category on every escalation; routing; no “drop the user” |

---

## Sources (Consolidated)

- **MAP:** Pan et al., “Measuring Agents in Production,” arXiv:2512.04123 (2025).
- **OpenClaw:** clawdocs.org, docs.openclaw.ai (tools, agent, agent-loop); “How OpenClaw Works” (Medium, Feb 2026).
- **Salesforce:** “Doomprompting” blog (Oct 2025); Agentforce “Five Levels of Determinism,” Agent Script, “Agent Graph: Guided Determinism” (Engineering).
- **Tool hallucination:** “Beyond Perfect APIs” (arXiv:2601.00268); Emergent Mind “Tool-Use Hallucinations”; Iterathon production agents 2026.
- **Lost in the middle:** “Lost in the Middle” (arXiv:2307.03172); GetMaxim; Nelson-Liu replications.
- **Document approval/traceability:** SharePoint; Athento; Process.st; Moxo.
- **Harvey:** Platform, BigLaw Bench – Sources, History Exports / Query History, Regional Knowledge.
- **Workflows/HITL:** OrchVis (arXiv:2510.24937); Microsoft HITL; Temporal; Akka.
- **Handoff:** Pertama Partners; Smith.ai; Frejun; ETSLabs; Thread Transfer playbook 2025.
- **Sierra:** Product (Agent Studio, Live Assist, Voice, Insights).
- **Guardrails:** GuardAgent (arXiv:2406.09187); Claw EA; LangChain/OpenAI guardrails; self.md.
- **Fair housing:** HUD No. 24_098; Consumer Financial Services Law Monitor; NMHC/NCHM.

*Last updated: Feb 2025. Add new sources and dates as you extend.*
