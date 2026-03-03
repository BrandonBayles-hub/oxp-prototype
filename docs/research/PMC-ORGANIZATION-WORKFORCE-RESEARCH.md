# Research: How Large Property Management Companies Are Organized

**Purpose:** Understand how large property management companies (PMCs) structure their organizations so the platform’s **Workforce** (roles, teams, permissions, performance) aligns with how they actually operate.

**Anchored in TDD:** The design that implements this research is in **docs/architecture/TDD-ARCHITECTURE.md**: escalation categories and routing by function (including compliance/legal) → **§4.6**; regulation alignment and region/portfolio scope → **§4.9.2**; outcome metrics (units per staff, effective capacity, workforce breakdown) → **§4.11**; Workforce and HRIS (roles, teams, org chart) → **§6** Cross-Cutting. When updating this research, update those TDD sections if routing, scope, or metrics must change.

---

## 1. Core Functions (What PMCs Organize Around)

Regardless of size or structure type, PMCs organize around **six core functional areas** (with minor naming variation by source):

| Function | Typical scope |
|----------|----------------|
| **Sales / Business development** | Client acquisition, investor relations |
| **Operations management** | Oversight of processes, coordination, company-wide standards |
| **Property management** | Day-to-day operations, resident relations, asset performance |
| **Leasing** | Marketing, tours, applications, move-in, lease administration |
| **Maintenance** | Work orders, vendors, turnovers, capital projects |
| **Accounting / Finance / Bookkeeping** | Rent collection, payables, financial reporting, budgeting |

Additional functions often present in larger firms: **Compliance/Legal**, **Human Resources**, **IT/Technology**. For multifamily specifically, **Tenant/Resident Relations** is sometimes called out separately from Property Management.

**Platform implication:** Roles and permissions should map to these functions (and combinations). Escalation routing and performance views should filter by function (e.g. leasing vs maintenance vs accounting).

*Sources: Second Nature “How to Structure a Property Management Company” (Kelli Segretto, K Segretto Consulting); Property Management Consulting “Structuring Your Property Management Staff”; BetterWho “How to Organize A Property Management Company”; industry summaries (six key focus areas).*

---

## 2. Leadership Tiers (Typical Org Depth)

A **three-deep (or four-deep) leadership cascade** is common:

| Tier | Role level | Examples |
|------|------------|----------|
| **Tier 1** | Owner / Broker | Executive; often Principal Broker (required in many states to operate a PMC). |
| **Tier 2** | Management | Operations, Sales, Finance, Maintenance, Leasing *managers*; oversee their function and direct reports. |
| **Tier 3** | Coordinators | Property management, Maintenance, Leasing, Bookkeeping *coordinators*; report to managers. |
| **Tier 4** | Assistants | Support roles under coordinators or managers (more common in larger orgs). |

Titles vary by structure (portfolio vs departmental vs pod), but the “buckets” (owner, management, coordination, support) remain. Small PMCs may have one person covering multiple tiers; growth adds specialization and clearer reporting lines.

**Platform implication:** “Admin,” “Team Lead,” “Teammate” (or similar) should align with these tiers. Permissions (who can configure agents, approve SOPs, see Escalations, see performance) should follow tier and function.

*Source: Second Nature “How to Structure a PMC” (Segretto).*

---

## 3. Three Common Structure Types

PMCs typically adopt one of three organizational models (or a hybrid):

### 3.1 Portfolio management structure

- **One dedicated property manager (PM) per portfolio** (set of properties/accounts). That PM is responsible for *all* aspects: maintenance, resident relations, leasing, financials, etc.
- Supported by shared or dedicated administrative, leasing, maintenance, and accounting staff.
- **Pros:** Single point of contact for clients and residents; nimble decisions; premium experience.
- **Cons:** Requires strong cross-skills; risk if PM leaves; harder to enforce operational consistency across portfolios.

**Platform implication:** Teams may be **portfolio-based**. Routing and performance should support “by portfolio” as well as by property.

### 3.2 Departmentalized (functional) structure

- Company is split into **departments by function**: e.g. Accounting/Finance, Leasing/Marketing, Maintenance, Resident Relations.
- Each department has a department manager and staff; work is grouped by role, not by property.
- **Pros:** Specialization, efficiency, scalability; clear accountability by function.
- **Cons:** Multiple points of contact for clients/residents; no single owner of “whole property” performance; communication and handoffs must be explicit.

**Platform implication:** Teams are **function-based** (e.g. Leasing team, Maintenance team). Escalation routing by **category** (leasing, maintenance, accounting) maps naturally; property/portfolio filters still needed for scope.

*Sources: Second Nature “How to Structure a PMC”; BetterWho; Property Management Consulting.*

### 3.3 Pod (process-driven) structure

- **Small cross-functional pods** (e.g. 3–5 people) each serving a slice of the portfolio (e.g. 150–200 units per pod). Typical pod: portfolio manager, leasing agent, maintenance tech, admin.
- Combines single-point-of-contact benefits with some specialization inside the pod.
- **Pros:** Collaboration, agility, resident experience; flexibility.
- **Cons:** Can be costly until scaled; risk of knowledge silos between pods.

**Platform implication:** Teams may be **pod-based** (small team = one “team” in the system). Permissions and performance can be scoped to pod (e.g. “Pod A” = properties 1–3).

*Sources: Second Nature “Pod-style management”; BetterWho “Pod Structure” (3 employees per 150–200 units).*

---

## 4. Centralization Trend: On-Site vs Portfolio-Level vs Regional

Many **multifamily** operators are shifting from **on-property teams** to **centralized (portfolio-level or regional)** structures.

| Model | Description |
|-------|-------------|
| **Traditional on-site** | Dedicated staff at each property (e.g. site manager, leasing, maintenance). |
| **Centralized / portfolio-level** | Staff work from a “home office” (or remote) and serve **multiple properties** in a portfolio. Roles become **portfolio-specific** rather than property-specific. One connected tech stack and one set of processes across the portfolio. |
| **Regional** | Large operators use **regional divisions** with **satellite offices**. E.g. Director of Multifamily [Region]; regional operations officers, management analysts; offices in several cities. |

**Why centralize:** Staffing shortages, cost pressure, and efficiency goals. Centralization reduces duplicate roles, standardizes processes, improves data visibility, and can “do more with less.” Self-service and technology (e.g. resident portals, AI) help compensate for less on-site presence.

**Challenges:** Change management (teams used to on-site model); need for strong culture and clear communication; **rethinking “personalized” service** when not face-to-face; reliance on **one connected platform** so centralization works.

**Platform implication:** Workforce must support **property**, **portfolio**, and **regional** scope. Escalation routing and performance views should filter by region, portfolio, and property. “Units per staff” and “effective capacity” (TDD §4.11) matter more when teams are centralized and span many units.

*Sources: AppFolio “Centralizing Multifamily Property Management Teams”; Northeast Multifamily Organizational Chart (regional example); CONAM (11 regional locations, 26+ markets); Second Nature; Property Management Consulting (staffing structure determines properties per employee).*

---

## 5. Staffing Ratios and Units per Employee

- **Traditional rule of thumb:** **1 onsite employee per 100 units** (cost-control standard, often cited as 20+ years old). Many argue this is **no longer sustainable** due to resident expectations, post-pandemic coverage issues, and workload despite technology.
- **By property size (guidelines):**  
  - &lt;100 units: e.g. 1 PM + 1 maintenance (+ part-time office).  
  - 100–200 units: minimum 2 full-time staff.  
- **Labor cost:** Often **30–50% of controllable expenses** in property management.
- **Market variation:** Units per employee varies widely by market—e.g. **35–77 units per employee** across U.S. metros, with a **national average around 54 units per employee**. Larger complexes and high-growth markets often maintain **lower** unit-to-employee ratios for service quality.
- **Growth:** Staffing structure **directly determines how many properties (or doors) one employee can manage**. Companies with clear org charts and roles are more likely to scale; structure impacts business growth.

**Platform implication:** **Units per staff** and **effective capacity** (TDD §4.11) are meaningful metrics. Support filters by property, portfolio, and region so operators can compare ratios and capacity across their org.

*Sources: NAA “Changing the Paradigm of Staffing Ratios”; Multifamily Insiders “1 employee per 100 unit rule”; Property Management Consulting “How Many Properties Can One Employee Manage?”; Moxie “Optimize Staffing Levels”; AppFolio Quarterly Market Update (3Q 2025).*

---

## 6. Critical Roles (Multifamily)

Often-cited **operational roles** in multifamily:

- **Leasing agents / consultants** — Tenant acquisition, lease management, tours, applications.
- **Property / community managers** — Day-to-day operations, resident relations, performance of the asset.
- **Asset managers** — Financial performance, strategic decisions, investor reporting (often above property/portfolio level).
- **Maintenance / facilities** — Technicians, supervisors, vendors; work orders, turnovers, capital.

Career progression (e.g. NAA/NMHC) often includes: Leasing Consultant → Leasing Manager; Assistant Community Manager → Community Manager; district and regional management above property level.

**Platform implication:** Role types should align with these so that **routing** (e.g. “maintenance escalation → maintenance team”) and **performance** (e.g. “leasing team resolution rate”) match how PMCs think about their workforce.

*Sources: Smartland “Managing a Multifamily Property Management Team”; NMHC “Careers in Multifamily” / “Property Operations”; NAA Career Map.*

---

## 7. HRIS and Reporting Structure

The platform will **not** maintain a separate, manually entered org chart. We plan for an **HRIS (Human Resource Information System)** integration so that **reporting structures** come from the tenant’s existing HR system(s).

- **Multiple HR platforms:** Different tenants (and sometimes different portfolios or regions within a tenant) may use different HR platforms (e.g. Workday, BambooHR, Rippling, ADP, Paylocity, or others). The platform must support **more than one HRIS** via connectors or a **normalized API** so we can consume a common model: person, role, team, manager, and (where available) location/property/portfolio.
- **What we consume:** Org hierarchy (who reports to whom), role and title, department/team membership, and optionally cost center or location so we can map to property/portfolio. This drives Escalations routing (“route to this person’s manager” or “to this team”), permissions, and performance (e.g. by manager, by team).
- **Source of truth:** HRIS is the **source of truth for reporting structure**; the platform syncs or queries as needed and applies it to Workforce (roles, teams, scope). PMC-organization research (sections 1–6) describes *what* structure we need to support; HRIS integration describes *where* we get it from.

*This is planned in the TDD: upstream systems include HRIS; Cross-Cutting includes “Workforce and HRIS” (connector/normalized API, multiple HR platforms).*

---

## 8. Summary: Implications for Platform Workforce

| PMC reality | Platform design |
|-------------|------------------|
| **Six core functions** (Operations, PM, Leasing, Maintenance, Accounting, Sales + Compliance/HR) | Roles and permissions map to functions; escalation category and routing by function. |
| **Tiers:** Owner/Broker → Management → Coordinators → Assistants | Admin / Team Lead / Teammate (or equivalent) align with tier; permission levels follow. |
| **Three structure types:** Portfolio, Departmental, Pod | Teams can be **property**, **portfolio**, or **regional**; support all three scoping levels. |
| **Centralization:** Portfolio-level and regional teams common | Filters and reporting by property, portfolio, region; “units per staff” and capacity across scope. |
| **Staffing ratios:** Units per employee varies (e.g. 35–77 by market); 1:100 legacy | Outcome metrics (§4.11): units per staff, effective capacity, workforce breakdown (agents + humans). |
| **Clear roles and org charts** drive growth and efficiency | Workforce model (roles, teams, directories) must be first-class so Escalations routing and performance match the customer’s org. |

---

## 9. Sources (Consolidated)

- **Second Nature:** “How to Structure a Property Management Company” (Apr 2023), Kelli Segretto / K Segretto Consulting — six focus areas, tiers, portfolio vs departmental vs pod.
- **AppFolio:** “Centralizing Multifamily Property Management Teams” — centralization benefits and challenges, portfolio-level roles, one connected platform.
- **Property Management Consulting:** “Structuring Your Property Management Staff for Success” (Feb 2022 / Jun 2024) — staffing structure and growth, hiring, org structures.
- **BetterWho:** “How to Organize A Property Management Company” — department vs pod, roles.
- **NAA:** “Changing the Paradigm of Staffing Ratios”; NAAEI Career Map.
- **NMHC:** Careers in Multifamily, Property Operations.
- **Multifamily Insiders / Moxie / Smartland:** Staffing ratios, units per employee, multifamily team roles.
- **Northeast Multifamily Organizational Chart (PDF):** Regional structure example (Director, regional offices, management analysts).
- **CONAM:** Regional presence (11 locations, 26+ markets) as example of large-operator geography.

*Last updated: Feb 2025. Use this doc when defining the Workforce component (roles, teams, property/portfolio/regional scope, performance) in the TDD or a dedicated Workforce spec.*
