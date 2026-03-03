# Research: How Metrics Drive Staffing Models and the Use of AI to Retain Bottom Line

**Purpose:** Make explicit how PMCs and asset managers look at metrics, how those metrics affect staffing decisions, and how AI is used to retain bottom line. This is **key to the platform’s value proposition**: the product exists so operators can see the connection between work, outcomes, and cost — and act on it (including with AI) instead of cutting blindly.

**Anchored in TDD:** **docs/architecture/TDD-ARCHITECTURE.md** §4.11 (Outcome Metrics and Value Narrative), §4.11.0 (Asset manager goals, causation, why health metrics matter), §4.12 (Command Center). The platform surfaces the metrics and insights described below; this doc explains the **why** and the **chain** so build and product stay aligned.

**Related research:** **PMC-ORGANIZATION-WORKFORCE-RESEARCH.md** (staffing ratios, units per employee, centralization, labor cost); **DEEP-RESEARCH-PLATFORM-PARTS.md** (outcome loop, performance/insights). User-provided product context (asset manager goals, renewal vs new lease, causation, “reduce staff or cut software”) is captured in TDD §4.11.0 and synthesized here.

---

## 0. Two ways AI provides value (must be implemented)

AI delivers value in **two distinct ways**. The platform must surface and attribute both so operators see the full picture:

1. **Saves staff time** — Labor displaced; same or fewer staff supporting more units (units per staff, effective capacity). AI handles routine conversations and tasks so humans can focus on higher-value or escalated work. Metrics: labor hours displaced, agent vs human task split, units per staff with/without AI.

2. **Increases asset value** — By driving outcomes that **directly affect property value**: **renewals** (retention, rent growth with less turn and vacancy), **leasing** (conversions, time-to-lease, cost per lease), and **maintenance** (work orders handled, resident experience, property condition). When AI handles renewal conversations, leasing response, or maintenance triage/follow-up, it is not only saving time but **improving the metrics that determine asset performance** (renewal rate, occupancy, rent growth, cost per lease, work order resolution). Metrics: revenue impact, renewal/lease/maintenance outcomes attributed to or influenced by agents.

Implementation: Outcome metrics (§4.11) and the value narrative ("value you're missing," Performance, Command Center) must include **both** dimensions — efficiency (staff time) **and** asset impact (renewals, leasing, maintenance) — so AI is clearly an **efficiency lever** and an **asset-value lever**.

---

## 1. How they look at metrics

- **Top-down goals:** The **asset manager** (corporate) sets **goals** for properties: **sell** or **keep**. If **keep**, the focus is **increasing yield** (e.g. raising rent) or **having to raise rent** to fund preventative maintenance and operations. Goals flow down the org (property → regional → asset manager → CEO).
- **Property and portfolio KPIs:** Operators look at **business-outcome** metrics that tie directly to those goals: **renewal rate**, **occupancy**, **rent growth**, **delinquency**, **turnover**, **cost per lease** (or cost to acquire a resident), **preventative maintenance** (or work order resolution), and — where data exists — **resident satisfaction** or **time-to-lease** as leading indicators. These are sourced from Entrata (or the data layer) and answer “how is the property/portfolio performing against the asset manager’s intent?”
- **Workforce and output metrics:** They also need to see **operational** metrics: **conversations resolved**, **escalation rate**, **agent vs human task split**, **units per staff**, **effective capacity** (humans + AI). These answer “is work getting done, and by whom?”
- **The connection they must see:** There is a **real causal link** between **work getting done** (maintenance completed, leasing response time, resident experience, follow-up) and **whether a resident renews or a lead leases**. So the platform must surface **both** the business-outcome layer (renewal, occupancy, cost per lease) **and** the workforce/output layer (resolution rate, escalation rate, units per staff, agent share) and make the **chain visible**: work done → renewal/lease outcomes → property and portfolio goals. That is what “correlation and causation” and “insights, not only BI” mean in practice (TDD §4.11.0, §4.11.3).
- **Where to look:** Command Center and Performance should answer “where should I focus?” (e.g. most escalations this week: Maintenance at Property A; leasing resolution rate low here — consider X). So they look at metrics in a **goal-driven, actionable** way, not only as dashboards.

---

## 2. How metrics affect staffing models

- **Staffing model** = how many people, in what roles, at what scope (property, portfolio, region). PMCs already face **cost pressure** (labor often 30–50% of controllable expenses; see PMC-ORGANIZATION-WORKFORCE-RESEARCH §5), **centralization** (“do more with less”), and **units-per-employee** variation (e.g. 35–77 by market; 1:100 legacy rule under strain). Staffing structure **directly determines** how many properties or doors one employee can manage.
- **Metrics inform the model:**
  - **Units per staff** (and **effective capacity** with AI) — Am I over- or under-staffed for the portfolio? Can I support more units with the same headcount if AI handles routine work?
  - **Resolution rate and escalation rate** — Is work getting done? Do I need more focus (or more capacity) in leasing, maintenance, or a specific property?
  - **Agent vs human task split** — How much capacity is AI adding? Where can I reallocate humans to higher-value or escalated work?
  - **Business-outcome metrics** (renewal rate, occupancy, cost per lease) — If these slip, is it because work isn’t getting done (operational) or because of market/config (strategic)? That dictates whether to change staffing, process, or AI coverage.
- **Decisions they can make with the platform:** Add or reduce headcount; reallocate roles (e.g. more leasing, less admin); centralize further (portfolio/regional) and rely on tech + AI to cover; **adopt or tune AI** to maintain outcomes with same or fewer staff. The platform must give them the data to make those decisions instead of guessing or cutting blindly.

---

## 3. Use of AI to retain bottom line

- **Pressure:** As **rent and costs rise**, PMCs’ two main levers to protect margins are **reduce staff** or **cut software** (their largest expenses). They need to **understand and manage their workforce** (AI + human) so they can preserve or improve outcomes without unsustainable headcount.
- **AI as the lever — two ways it adds value:** AI handles **routine** work (resident conversations, triage, follow-up, answers grounded in SOPs and Entrata). That means:
  - **Saves staff time:** Same or fewer staff can support **more units** (units per staff and effective capacity go up). Labor displaced and agent vs human split are visible.
  - **Increases asset value:** By driving **renewals**, **leasing**, and **maintenance** outcomes — renewal rate, occupancy, time-to-lease, cost per lease, work order resolution — AI directly affects the metrics that determine property value. The platform must attribute or surface the link (e.g. revenue impact, renewal/lease/maintenance outcomes influenced by agents) so they see AI as both an efficiency lever and an **asset-value lever**.
  - They see **ROI** on both dimensions: labor displaced **and** revenue/asset impact; “value you’re missing” when an agent is off or under-configured, so they can **justify and tune AI** instead of cutting it or leaving it underused.
- **Bottom line:** The platform exists so they can **retain bottom line** by making the workforce (AI + human) **visible and manageable**. They don’t have to choose blindly between “cut staff” or “cut software”; they can **optimize the mix** (Command Center, Performance, Agent Roster, Workforce) with data.

---

## 4. Summary: Platform role

| What they need | What the platform does |
|----------------|-------------------------|
| See **two ways AI adds value** | (1) **Staff time saved**: labor displaced, units per staff, effective capacity. (2) **Asset value increased**: renewals, leasing, maintenance outcomes (renewal rate, occupancy, cost per lease, work order resolution) attributed to or influenced by agents. Both must be in metrics and value narrative (§4.11). |
| See goals → outcomes → work | Asset manager goals (§4.11.0); health metrics (renewal, occupancy, cost per lease, etc.) + workforce metrics (units per staff, effective capacity, agent vs human) in one place (Performance, Command Center). |
| See causation (work → outcomes) | Insights-oriented Performance: correlation/causation narrative, “where to look,” guidance to change trajectory (§4.11.0, §4.11.3). |
| Decide staffing and AI mix | Units per staff, effective capacity, resolution rate, escalation rate, agent vs human split; filters by property, portfolio, region. “Value you’re missing” and Agent Roster so they can enable/tune AI. |
| Retain bottom line with AI | AI saves staff time **and** increases asset value (renewals, leasing, maintenance); ROI and both dimensions visible so they can manage workforce (AI + human) instead of cutting blindly. |

---

*Last updated: Feb 2025. Use when defining or reviewing outcome metrics, Performance, Command Center, and the platform’s value narrative. Keep in sync with TDD §4.11 and §4.12.*
