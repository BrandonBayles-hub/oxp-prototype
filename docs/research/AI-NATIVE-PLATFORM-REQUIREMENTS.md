# What You're Missing to Make This Work as an AI-Native Platform

**Purpose:** The product and architecture docs describe *what* the platform does and *how* the pieces fit. This doc lists **concrete requirements** that are implied or underspecified—the things you need to define and build so the platform actually *works* as an AI-native system. Treat this as a pre-build and ongoing checklist.

**Authoritative list:** The canonical list of AI-native foundations is **docs/architecture/TDD-ARCHITECTURE.md §5 (AI-Native Foundations)**. This research doc provides rationale, “what’s missing,” and actions; the TDD is the single source of truth for what must be defined and built.

---

## 1. Model & Inference Layer

**What we have in docs:** Agents use LLMs; MCP tools; step limits; off-the-shelf models (per research).

**What’s missing to make it work:**

- **Model strategy:** Which provider(s) and model(s) per use case (e.g. Claude/GPT for agents, possibly smaller/cheaper for routing or classification). Who hosts—you call provider APIs; no “we’ll pick later.”
- **Fallbacks and retries:** What happens when the model is down or rate-limited (retry, fallback model, or graceful “try again later” to user).
- **Timeouts:** Max wait per LLM call and per full turn so conversations don’t hang.
- **Cost and rate controls:** Per-tenant or per-user limits (e.g. requests/month), and/or budget alerts so one tenant can’t blow the bill.

**Action:** Document “Model strategy” (providers, models, fallbacks, timeouts, cost/rate limits) and own it in the TDD or a dedicated runbook.

---

## 2. RAG Pipeline (Vault & Knowledge)

**What we have in docs:** Vault and Knowledge are retrieved for agents; chunking and embedding; “which chunks used” for citation.

**What’s missing to make it work:**

- **Embedding model:** Which model (and provider) for embeddings; same for Knowledge and Vault or separate if needed.
- **Chunking:** Strategy (size, overlap, by section/heading for SOPs) and who runs it (on ingest vs on demand).
- **Vector store:** Where vectors live (e.g. Pinecone, pgvector, vendor vector DB), and how it’s scoped (e.g. per tenant or tagged by tenant).
- **Retrieval:** Top-k (or equivalent), reranking (e.g. cross-encoder) to fight “lost in the middle,” and any filters (property, doc type, approval status).
- **Invalidation:** When a Vault or Knowledge doc is updated or deleted, how and when embeddings/indices are refreshed so agents don’t use stale content.

**Action:** Specify RAG pipeline (embed model, chunking, vector store, retrieval params, invalidation) and add to TDD or an “AI infrastructure” section.

---

## 3. Agent Runtime & Sessions

**What we have in docs:** Agent loop (intake → context → inference → tools → persistence); MCP tools; step limits; escalation.

**What’s missing to make it work:**

- **Where the loop runs:** Your backend service that runs the agent loop (orchestrates LLM + MCP + RAG). Not “the frontend” or “Workato”—a dedicated runtime.
- **Session and conversation persistence:** Storing conversation history (per resident, per staff thread) so multi-turn works and handoff has full context. Where it’s stored and how long it’s kept.
- **Context assembly:** Per request, what’s in the payload: system prompt, which SOPs/chunks, last N turns, current user/resident/property, tool results. So the model gets a consistent, bounded context every time.
- **Long-conversation handling:** Context pinning (re-inject critical rules/SOPs near the latest turn) so the model doesn’t “forget” after many exchanges. When to summarize or truncate history.

**Action:** Define agent runtime (host, session store, context assembly, long-conversation policy) in the TDD.

---

## 4. Observability & Evaluation

**What we have in docs:** Audit logging; source citation; History Export; human-in-the-loop evaluation in research.

**What’s missing to make it work:**

- **Tracing:** Every LLM request (model, tokens in/out, latency), every tool call (name, params, result, errors). Trace ID that ties a full conversation or task so you can debug and audit.
- **Metrics and alerting:** Success/failure rate, latency p50/p99, token usage per tenant/agent. Alerts when error rate or latency crosses a threshold.
- **Evaluation pipeline:** Where feedback (thumbs up/down, “submit feedback”) is stored; who reviews it; how it drives changes (prompt edit, SOP update, or “flag for training”). Optional: regression or smoke tests before deploying agent/prompt changes.
- **Logging:** Structured logs (request id, tenant, user, agent, outcome) with PII handling (redact or hash in logs).

**Action:** Add “Observability & evaluation” to the TDD: tracing, metrics, alerts, feedback pipeline, and optional agent regression tests.

---

## 5. Safety & Reliability

**What we have in docs:** Deterministic guardrails; tool policies; human-review toggles; fair housing.

**What’s missing to make it work:**

- **PII handling:** Policy for PII in logs, in traces, and in context sent to models (e.g. redact or tokenize in non-production; tenant data never in training if you use a vendor).
- **Prompt injection:** Detection or mitigation (e.g. user input sanitization, or model instructions to ignore “ignore previous instructions”). At least a stated approach.
- **Output filters:** Optional blocklist or content filter on model output (e.g. never say “I’m not sure we have a policy” in a way that implies no policy; or block specific phrases).
- **Circuit breaker / kill switch:** Ability to disable an agent or a tenant’s agents quickly if something goes wrong (abuse, quality collapse, or incident).

**Action:** Document safety and reliability (PII, prompt injection, output filters, circuit breaker) and reference in governance/trust.

---

## 6. Identity & Scoping at Runtime

**What we have in docs:** Property/portfolio, roles, teams; resident vs staff.

**What’s missing to make it work:**

- **Resident/guest identity:** How you know who is chatting (e.g. logged-in resident in portal → Entrata resident ID; SMS → phone → link to resident or “unknown”). So the agent can say “your lease” and you can scope data.
- **Request-level scope:** Every agent request tagged with tenant, property (if known), resident or user, and channel. Used for: which SOPs/docs are in scope, which Entrata data the agent can see, and audit.
- **Multi-tenant isolation:** Guarantee that data, documents, and agent config are strictly isolated by tenant (no cross-tenant leakage in RAG, MCP, or logs).

**Action:** Define identity resolution (resident, prospect, staff) and request scoping; state multi-tenant isolation as a requirement in the TDD.

---

## 7. Prompt & Config Management

**What we have in docs:** SOPs drive settings; agents have role, goal, functions.

**What’s missing to make it work:**

- **Where prompts live:** System prompts (and per-function instructions) stored in DB or config, not only in code. So you can change “how the agent talks” without a code deploy.
- **Versioning:** When you change a prompt or agent config, version it and optionally A/B test before full rollout.
- **Update workflow:** Change prompt → run tests or comparison → deploy to production. So “self-learning” and feedback lead to prompt updates in a controlled way.

**Action:** Add prompt/config storage, versioning, and update workflow to the TDD (can live under agents or under a “Configuration” section).

---

## 8. Voice Stack

**What we have in docs:** “Set up voice” in Getting Started; voice as a channel; same agent behind all channels.

**What’s missing to make it work:**

- **Telephony:** Provider (e.g. Twilio, Vapi, Retell) and how calls are routed to your platform (webhook or SDK).
- **STT and TTS:** Who does speech-to-text and text-to-speech (provider or same as telephony). Latency budget (e.g. &lt;500 ms for TTS) so conversations feel natural.
- **Voice-specific UX:** Interruption (barge-in), hold music, transfer to human (how the handoff is signaled to the telephony layer).
- **Testing:** How to test voice (e.g. test number, or “test call” in Getting Started) before go-live.

**Action:** Specify voice stack (telephony, STT, TTS, latency, handoff) and add to TDD or a “Channels” technical spec.

---

## 9. Events & Extensibility

**What we have in docs:** Workato triggers; Vault-triggered workflows; Ecosystem (Entrata widget, email).

**What’s missing to make it work:**

- **Outbound events:** What your platform emits (e.g. “conversation.ended,” “work_order.created,” “escalation.created”) so other systems (or Workato) can react without polling. Event payload and auth.
- **Public or partner API:** If you want third parties or Entrata to call *your* platform (e.g. “run this agent with this context,” “return suggested reply”), you need a stable API and auth model.
- **Webhooks:** Optional webhooks for key actions (e.g. “when agent escalates, POST to this URL”) for custom integrations.

**Action:** Decide which events and APIs you need for v1; document in TDD under “Integrations” or “Ecosystem.”

---

## 10. Continuous Improvement Loop

**What we have in docs:** Self-learning; feedback; human evaluation; “submit feedback.”

**What’s missing to make it work:**

- **Feedback capture:** Where feedback is stored (e.g. “thumbs down” + conversation id + optional comment) and how it’s linked to the trace (prompt, chunks, tool calls).
- **Review and triage:** Who looks at feedback (e.g. ops or customer success), and how they decide “change prompt,” “add SOP,” “escalate to eng.”
- **Deploying changes:** How a prompt or SOP change gets from “approved” to production (e.g. edit in UI → version → test → promote). So the loop closes: feedback → change → deploy → measure again.
- **Optional: LLM-as-judge:** If you use an LLM to score or categorize responses, it must be **in addition to** human review (per MAP research), not the only gate.

**Action:** Describe the feedback → review → update → deploy loop in the TDD (Academy/Get-Started or a dedicated “Improvement” section).

---

## Summary: What You’re Missing

| # | Area | What to add |
|---|------|-------------|
| 1 | **Model & inference** | Model strategy (providers, models, fallbacks, timeouts, cost/rate limits). |
| 2 | **RAG** | Embedding model, chunking, vector store, retrieval params, invalidation on doc change. |
| 3 | **Agent runtime** | Where the loop runs; session/conversation persistence; context assembly; long-conversation handling. |
| 4 | **Observability** | Tracing (LLM + tools), metrics, alerting, feedback pipeline, optional agent regression tests. |
| 5 | **Safety** | PII handling, prompt injection approach, output filters, circuit breaker / kill switch. |
| 6 | **Identity & scope** | Resident/guest identity; request-level scope (tenant, property, user); multi-tenant isolation. |
| 7 | **Prompt management** | Where prompts live, versioning, update workflow (change → test → deploy). |
| 8 | **Voice** | Telephony, STT, TTS, latency, handoff; test path before go-live. |
| 9 | **Events & API** | Outbound events, public/partner API surface, optional webhooks. |
| 10 | **Improvement loop** | Feedback storage and review; how feedback drives prompt/SOP changes and deployment. |

None of these are product “features” in the sense of “Vault” or “Inbox”—they are the **technical and operational foundations** that make an AI-native platform reliable, safe, and improvable. Defining them (even briefly) in the TDD or a linked “AI platform requirements” doc will close the gap between “we have a design” and “we can build and run it.”

*Last updated: Feb 2025. Add items as you discover new requirements; keep the TDD in sync.*
