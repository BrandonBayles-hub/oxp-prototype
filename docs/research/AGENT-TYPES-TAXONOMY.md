# Agent Types: Taxonomy & Research

**Purpose:** Define the three agent types used in the platform (Autonomous / ELI+, Intelligence, Operations) and ground them in research on how such systems are built. This is the single source of truth for “what kind of agent is this?”

---

## 1. The Three Types (Platform Definitions)

### 1.1 Autonomous Agents (ELI+)

- **What:** Agents with a **role**, a **goal**, and **functions**. Each **function** is a set task with a goal and outcome in mind; the agent can use **MCP tools** (or equivalent) to accomplish the function. In other systems these are sometimes called **skills** or **executions**.
- **Training / knowledge:** Can use **SOP documents** to be trained on (or grounded in) company policy and process.
- **Learning:** **Self-learning** — they improve from feedback and experience over time (like Claude in production: feedback loops, evaluation, iteration).
- **Action:** They **take actions** in the world (tool calls, creating work orders, sending messages, etc.) within their bounded functions.

### 1.2 Intelligence Agents

- **What:** Agents that **consume data** and **give recommendations** based on what they see in the data. Behind the scenes they have a **prompt and goal**, but they **do not action themselves** — they advise, suggest, and inform.
- **Action:** **No execution.** Output is insight, recommendation, or decision support only. A human or another system decides whether and how to act.
- **Role:** Often described as **advisory**, **analytical**, or **decision-support** systems.

### 1.3 Operations Agents

- **What:** **Classic automation.** They do **not** learn and do **not** have a prompt. They behave like **traditional workflow automation**: trigger → condition → action, rule-based and deterministic.
- **Action:** They **execute** predefined steps (e.g. “when X, do Y”) but with no LLM reasoning and no adaptation from data or feedback.
- **Role:** Reliable, auditable, low-cost execution of well-defined processes.

---

## 2. Research: How Each Type Is Built

### 2.1 Autonomous Agents (ELI+) — Systems Behind Them

**Role, goal, functions, and tools**

- Production agent frameworks treat **functions** (or skills) as **bounded capabilities**: a set task with a goal and outcome, implemented via **tools** the agent can call. The agent reasons about *when* and *how* to use them; the tools define *what* is allowed.
- **MCP (Model Context Protocol)** is the standard way to expose tools to agents without baking integration into the agent itself:
  - **MCP Server** exposes tools (and optionally resources, prompts) with input/output schemas; enforces permissions and boundaries.
  - **MCP Client** sits between the agent and servers; handles discovery (`list_tools()`), invocation (`call_tool()`), and structured request/response.
  - **Host** runs the agent and configures which servers are allowed. The agent stays portable and doesn’t need to know where tools live or how they’re implemented.
- Separation of concerns: the **model focuses on reasoning**; **MCP governs how actions are executed, validated, and constrained**. Tools can be reused across agents and hosts.
- “Functions” in your terms map to **tools** (or tool groups) in MCP; each tool is a typed capability with a clear contract. Naming in the industry varies: **skills**, **executions**, **capabilities**, **tools**.

*Sources: AI Handbook “MCP Explained for AI Agents”; Anthropic “Code execution with MCP”; mcp-agent docs (tools, resources, discovery); Microsoft “Using MCP Tools.”*

**SOP documents as knowledge**

- Autonomous agents are **grounded** in approved documents (SOPs, policies). Documents are retrieved at runtime (RAG) or attached to the agent/function; the agent uses them to answer and to decide what to do, but **only within** the scope of its functions and tools.
- Best practice: **observability** of which document chunks were used per response/action (see DEEP-RESEARCH-PLATFORM-PARTS.md) so behavior is auditable and “lost in the middle” can be detected.

**Self-learning**

- “Self-learning” in production usually means **continuous improvement from feedback**, not unbounded online learning of weights:
  - **Agent-in-the-loop (AITL):** Embed feedback into live operations (e.g. pairwise preferences, adoption rationales, knowledge relevance, missing knowledge). Can shorten retraining/iteration from months to weeks; reported gains in retrieval recall, helpfulness, adoption.
  - **Real-time feedback:** Binary or preference feedback during interactions used as reward signal (e.g. contextual bandit); improves instruction-following over time.
  - **Human evaluation + optional LLM-as-judge:** Production agents rely heavily on human-in-the-loop evaluation; LLM-as-judge is used but with human verification. Feedback flows into prompt/config updates, tooling, or (less often) fine-tuning.
- So “self-learning like Claude” fits: **feedback loops, evaluation, and iteration** that improve behavior over time, with humans in the loop and guardrails in place.

*Sources: “Agent-in-the-Loop: Data Flywheel for Continuous Improvement” (arXiv:2510.06674); “Continual Learning from Realtime Feedback” (arXiv:2212.09710); “Measuring Agents in Production” (MAP) on human eval and LLM-as-judge; “SuperIntelliAgent” / “StreamBench” (continual learning benchmarks).*

---

### 2.2 Intelligence Agents — Systems Behind Them

**Consume data, recommend, don’t act**

- Intelligence agents are **advisory**: they analyze data (and sometimes live context), synthesize patterns, and produce **recommendations or insights**. They do **not** execute actions on production systems.
- **Read-only architecture** is common: no write access to infrastructure; analyze and suggest only. The human or an operations process decides and acts.
- **Behind the scenes:** They still have a **prompt and goal** (e.g. “Given this dataset and question, produce a recommendation and explain which data supports it”). The difference from autonomous agents is **no tool-calling that changes state** — only queries, retrieval, and generated text/charts.

**Patterns in the wild**

- **Skill-adaptive analytics:** Identify and apply analytical “skills” (clustering, forecasting, NLP) to data; generate queries and executable analysis code; output is **insight and recommendation**, not an executed business action.
- **Structured reasoning for analysis:** Modular sub-tasks: interpret goal → ground in context → construct plan → adapt from intermediate results. Output is **interpretation and recommendation**.
- **Decision support:** “What happened,” “why,” “what if,” “what to do next” — all as **recommendations** with transparent reasoning (which data supports the insight vs. assumption). Users validate before acting.
- **Governance:** Advisory systems often emphasize **explainability** (show supporting data) and **privacy** (e.g. AI never directly touching raw PII; metadata-only or aggregated views).

*Sources: “AgentAda: Skill-Adaptive Data Analytics” (arXiv:2504.07421); “I2I-STRADA: Structured Reasoning for Data Analysis” (arXiv:2507.17874); “AInsight: Augmenting Expert Decision-Making” (arXiv:2507.09100); “Insights Assistant” (MathCo); “AI Advisor” (Kentik – read-only); AskEdi (governance-first analytics).*

**When to use**

- When the value is **better decisions** (e.g. pricing, occupancy, maintenance prioritization, lead scoring) and the **human or a separate automation** must execute. Keeps risk and accountability clear: the intelligence agent advises; something else acts.

---

### 2.3 Operations Agents — Systems Behind Them

**Classic automation: no learning, no prompt**

- **Deterministic workflows:** Rule-based, predefined logic. No LLM deciding “what to do next.” Trigger → conditions → actions. Same input → same path every time (modulo explicit branching rules).
- **No learning:** Behavior is fully specified by configuration (rules, flow, mappings). No model weights, no prompt, no feedback loop that changes behavior.
- **No prompt:** No natural-language instructions driving behavior. Logic is in the workflow definition (e.g. “when lead status = New and source = Website, create task for leasing and send template email”).

**When the industry uses this**

- **Well-defined tasks:** Clear inputs, outputs, success criteria; path can be flowcharted.
- **Predictability and audit:** Compliance and audit need transparent, traceable processes. Rules engines give consistency and clarity.
- **Cost and control:** No per-request LLM cost; execution is cheap and bounded. Resource use is predictable.
- **Examples:** Invoice processing, form filling, ETL, report generation, “when X then create Y and notify Z.”

**How it’s built**

- **Triggers:** Event or schedule (e.g. new lead, status change, daily 9am). Conditions (e.g. field values, approval status) gate execution.
- **Actions:** Call APIs, create records, send messages, update fields. Defined in the workflow, not by an LLM.
- **Rules engines:** Business logic in explicit rules; re-evaluated on data refresh; low-code so non-developers can change logic without redeploying code.

*Sources: “When to Use Agents vs Deterministic Workflows” (Rotascale); “AI Workflows vs AI Agents” (Datagrid, Retool); “Beyond Prompt-and-Pray” (O’Reilly); UiPath/Power Automate/Logic Apps (rule-based triggers, conditions); Azure Logic Apps Rules Engine.*

**When to use**

- When the process is **stable, enumerable, and must be identical every time**. Use operations agents (classic automation) for that; use autonomous or intelligence agents where judgment, language, or adaptation is required.

---

## 3. How the Three Types Relate

| Dimension           | Autonomous (ELI+)     | Intelligence           | Operations              |
|---------------------|------------------------|------------------------|-------------------------|
| **Has role/goal**   | Yes                    | Yes (prompt + goal)    | No                      |
| **Has prompt**      | Yes                    | Yes                    | No                      |
| **Learns / improves** | Yes (feedback, iteration) | Optional (e.g. better models) | No                      |
| **Uses tools/MCP**  | Yes (to accomplish functions) | Typically read-only (query, retrieve) | N/A (workflow steps)    |
| **Takes actions**   | Yes (bounded by functions/tools) | No (recommendations only) | Yes (predefined steps)  |
| **Determinism**     | No (reasoning + tools) | No (generation)        | Yes (rule-based)        |
| **Best for**       | Conversation, triage, multi-step tasks needing judgment | Recommendations, analytics, decision support | Repeatable, auditable workflows |

**In the platform**

- **Autonomous (ELI+):** Resident-facing and internal agents that answer, triage, and act (e.g. create work order, send message) using SOPs and MCP tools; self-learning via feedback and evaluation.
- **Intelligence:** Analytics and recommendation surfaces (e.g. “suggested next best action,” “risk score,” “capacity insight”); feed humans or workflows but don’t execute themselves.
- **Operations:** Scheduled and event-driven automations (e.g. “new lead → create task + send template”); no LLM, no learning, full audit trail.

---

## 4. Agent Buckets and Initial ELI+ Agents (Platform)

**Five buckets:** Every agent (ELI+, Intelligence, or Operations) belongs to one of these categories for product organization, permissions, and segment/template mapping:

| Bucket | Purpose |
|--------|---------|
| **Revenue & Financial Management** | Rent, fees, payments, financial reporting, revenue operations |
| **Leasing & Marketing** | Leads, tours, applications, move-in, marketing campaigns |
| **Resident Relations & Retention** | Resident communication, satisfaction, retention, renewals |
| **Operations & Maintenance** | Work orders, maintenance, vendors, property operations |
| **Risk Management & Compliance** | Fair housing, compliance, risk, audit, policy enforcement |

**Initial ELI+ agents (four):** At launch the platform ships four autonomous (ELI+) agents. Additional agents (ELI+, Intelligence, or Operations) can be added within the five buckets over time.

| Agent | Bucket | Role |
|-------|--------|------|
| **Leasing AI** | Leasing & Marketing | Lead response, tour scheduling, application guidance, move-in |
| **Renewal AI** | Resident Relations & Retention | Renewal conversations, lease terms, retention offers |
| **Maintenance AI** | Operations & Maintenance | Request intake, triage, work order creation, status updates |
| **Payments AI** | Revenue & Financial Management | Payment questions, balance, payment plans, fee explanations |

---

## 5. Research Summary: Building Each Type

**Autonomous (ELI+)**  
- Give a **role**, **goal**, and **functions**; implement each function as **MCP tools** (or equivalent) with clear contracts.  
- Ground in **SOP documents**; observe **which chunks** were used.  
- Support **self-learning** via feedback (human eval, preferences, AITL), with step limits and escalation so improvement is safe and controllable.

**Intelligence**  
- **Prompt + goal** for “given data/context, produce recommendation and support.”  
- **Read-only** access to data; output is **insight/recommendation**; no state-changing tools.  
- Design for **explainability** (what data supports the recommendation) and **governance** (e.g. no raw PII in the model if required).

**Operations**  
- **Triggers + conditions + actions** in a workflow engine; no LLM, no prompt.  
- Use when the path is **fully known and must be repeatable**; combine with autonomous or intelligence agents when you need judgment or recommendation first.

---

## 6. Sources (Consolidated)

- **MCP:** AI Handbook “MCP Explained”; Anthropic “Code execution with MCP”; mcp-agent (tools, resources, discovery); Microsoft “Using MCP Tools.”
- **Self-learning / continuous improvement:** “Agent-in-the-Loop” (arXiv:2510.06674); “Continual Learning from Realtime Feedback” (arXiv:2212.09710); MAP (human eval, LLM-as-judge); StreamBench, SuperIntelliAgent.
- **Intelligence / advisory:** AgentAda (arXiv:2504.07421); I2I-STRADA (arXiv:2507.17874); AInsight (arXiv:2507.09100); MathCo Insights Assistant; Kentik AI Advisor; AskEdi.
- **Operations / deterministic:** Rotascale, Datagrid, Retool (agents vs workflows); O’Reilly “Beyond Prompt-and-Pray”; UiPath, Power Automate, Logic Apps (triggers, conditions, rules).
- **Taxonomy / modalities:** “STRIDE: Selecting AI Modalities” (arXiv:2512.02228); Agentic AI surveys (architectures, applications); BDI/capabilities, bounded optimality.

*Last updated: Feb 2025. Extend with new types or subtypes as the platform evolves.*
