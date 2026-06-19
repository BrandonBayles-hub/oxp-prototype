# Entrata Experts — One Pager

**The conversational front door to Autonomous Property Management:** a governed, chat-first AI hub embedded in OXP where every operator asks plain-language questions about their portfolio and gets cited, real-time answers and artifacts — with pre-built Assistants, admin observability, spend governance, and a loop that graduates the best questions into Saved Insights, scheduled digests, and autonomous agents.

---

## 1. Executive Summary & Problem Statement

**The Problem:** Operators sit on top of a rich PMS but can't get a straight answer out of it. A simple question — *"Why is delinquency up at Tampa Bay?"* — means hunting across PMS reports, Domo dashboards, and spreadsheets, or filing a custom-report SOW and waiting. Insight is trapped in static dashboards: there's no natural-language way in, no portfolio-scoped Q&A, and no shared view of **what the whole team is asking**. Recurring questions get re-answered by hand, over and over. Meanwhile, the AI tools that *are* creeping in are ungoverned point solutions — no spend caps, no model policy, no PII guardrails, no audit trail, and no path from a one-off answer to a durable, trusted asset. Competitors are racing to put a conversational layer on property data; an ungoverned chatbot is not a defensible answer.

**The Solution:** A unified, chat-first AI surface embedded in the OXP shell where operators land directly in **Entrata Analyst** — a data-connected, cited Q&A experience scoped to their portfolio — and switch between pre-built **Assistants** and a **Report Analyzer** without leaving the page. Every answer is grounded in governed portfolio context, carries citations and an inspectable reasoning trace, and can attach live artifacts (tables, charts, KPI strips, drafts). Admins get cross-platform observability (what people ask, where the AI fails, what it costs) plus policy controls (surfaces, spend caps, model allow-lists). And a built-in **graduation loop** turns proven, high-demand questions into **Saved Insights**, **scheduled digests**, or **L3 agents in OXP Studio** — and routes artifacts into the **Analytics Platform**. Entrata Experts rolls out incrementally behind feature flags, so customers see value early and governance lands before scale.

---

## 2. Strategic Objectives

- **Be the front door to APM:** make natural-language Q&A the default way operators interact with their portfolio, so the AI workforce has one governed, observable entry point instead of a dozen disconnected chatbots.
- **Deflect manual reporting demand:** absorb the ad-hoc questions that today become Domo digging or custom-report SOWs, with session-level deflection/resolution as the headline metric.
- **Feed the agent flywheel:** every conversation is a signal — recurring patterns surface as **automation candidates** that graduate into Saved Insights, digests, or autonomous OXP Studio agents.
- **Govern AI by default:** per-org and per-scope spend caps, model allow-lists, PII refusal, and a full activity/audit trail — trust is a feature, not an afterthought.
- **Monetize usage:** token metering and an AI attach motion turn heavy adoption into packaged platform revenue rather than uncapped cost.

---

## 3. Financial Outlook

- **Platform base** included with OXP: Entrata Analyst, the pre-built Assistants library, Report Analyzer, and Admin Insights observability.
- **Usage-metered consumption:** a **Tokens & Usage** meter tracks spend by expert and by model. The **Entrata Experts (Beta)** plan includes a **50M-token** allotment with an **on-demand overage** cap (default **$250**), enabling both packaging and chargeback.
- **AI attach / governance SKU:** scoped spend limits, model access policy, and admin observability are the levers for an entitlement-gated upsell.
- **Cost avoidance:** every deflected question is reporting/SOW labor that doesn't happen; automation graduation compounds that over time.
- Pricing and margin targets to be finalized with the Pricing Committee.

---

## 4. Key Features (by Release)

Entrata Experts ships in incremental, feature-flagged releases (`v1.0 → v1.1 → v1.2 → full`) so customers see value early and governance lands before scale.

- **v1.0 — Chat-first hub:** Entrata Analyst with role-aware suggested prompts, cited answers, inspectable reasoning trace, artifacts (table, bar/line chart, KPI strip, draft email), follow-up chips, and outcome badges (answered / low-confidence / refused / escalated). Seven pre-built **Assistants** (Everyday, Ad Writing, Document Analyzer, Event Planning, Multifamily Research, Portfolio Strategy, Resident Writing), a **Report Analyzer**, a shared conversation history sidebar, and a built-in **PII guard**.
- **v1.1 — Lenses, memory & admin:** the **Lens** picker (Portfolio, Leasing, Renewals, Payments, Maintenance, Accounting), a role-aware **memory chip**, and the **Admin Insights → Entrata Experts** source (health KPIs, searchable **Activity Log**, **Knowledge Gaps** taxonomy).
- **v1.2 — Metering & the graduation loop:** **Tokens & Usage** dashboard (spend by expert/model, leaderboard, conversation insights); Admin Insights **"What people are asking"** intent clusters and **Automation Candidates** — recurring questions that graduate to a **Saved Insight**, a **scheduled digest**, or an **L3 agent draft**.
- **full — Governance & platform fabric:** org + per-scope **spend limits** and **model access** policy, scope-override tables, and the **Send to Analytics Platform** handoff (snapshot vs. live binding) that turns a chat artifact into a governed dashboard (My Workspace / My Team / Company Menu).

**Platform-wide capabilities (every release builds on these):**

- **Best-in-class AI, no lock-in:** every expert routes to frontier models through the **Entrata GenAI gateway**, with the flexibility to swap providers as the model landscape evolves. API keys never reach the browser, and a built-in offline fallback keeps demos and field deployments resilient.
- **Grounded, cited answers:** responses are scoped to portfolio context with inline citations and an expandable reasoning trace, so operators can trust — and verify — every claim. The system refuses resident-PII requests by policy.
- **Governed by scope:** spend caps and model access policies resolve per org / group / property; every operator question is observable in the admin activity log, with PII guardrails and a full audit trail.
- **Lifecycle by design:** demand observed in chat is clustered, graduated into a Saved Insight, scheduled digest, or autonomous agent, and measured again. Entrata Experts is a flywheel, not a dead-end chatbot.

---

## 5. Target Audience & Market Fit

Entrata Experts is built around the multifamily operating team — five primary operator personas, each with tailored prompts and memory:

- **VP of Operations** — portfolio outliers, weekend summaries, NOI and delinquency at a glance.
- **Regional Manager** — leasing pace, maintenance status, and renewals across a region.
- **On-site Property Manager** — day-to-day occupancy, leasing, and work-order questions.
- **Asset Manager / Owner** — NOI variance, outliers, and renewal economics.
- **Accounting / AP** — AP anomalies, online-pay adoption, delinquency.

**Segment fit:** White-Glove and Enterprise operators get a governed, observable AI layer over the portfolio they already run in Entrata; Mid-Market gets day-one value with no custom-report project.

**Value proposition:** the first *governed* conversational layer for property operators — cited, real-time, portfolio-scoped answers, with the spend controls, model policy, and audit trail an enterprise requires, and a built-in path from "ask" to "automation."

---

## 6. Rollout & Adoption Roadmap

Entrata Experts ships as incremental, feature-flagged slices so customers see value early and governance lands before scale. Versions map to the OXP release cadence (targets):

- **v1.0 — Chat-first hub** (Analyst + Assistants + Report Analyzer)
- **v1.1 — Lenses, memory, and Admin Insights** (activity log + knowledge gaps)
- **v1.2 — Tokens & Usage metering + the automation graduation loop**
- **full — Governance (spend & model policy) + Analytics Platform handoff**

---

## 7. Child Epics / Workstreams

Tracked under the OXP Initiative. Sequence mirrors the release ladder.

- **Entrata Analyst** — chat-first Q&A, lenses/modes/models, citations, trace, artifacts.
- **Assistants Library** — the seven pre-built experts and their badges/prompts.
- **Report Analyzer** — per-report conversational analysis.
- **Admin Insights — Entrata Experts source** — health, activity log, knowledge gaps, intent clusters, automation candidates.
- **Tokens & Usage** — metering, spend-by-model, leaderboard, conversation insights.
- **Governance & Policy** — surfaces, spend limits, model access, scope overrides.
- **Provider-agnostic AI runtime** — Entrata GenAI gateway (LiteLLM) integration + live model catalog.
- **Analytics Platform handoff** — Send-to-Analytics artifact promotion (snapshot/live).

---

## References

- **Companion strategy:** the Entrata **Analytics Platform** One Pager — Entrata Experts is the conversational front door; the Analytics Platform is the governed BI surface it hands off to.



