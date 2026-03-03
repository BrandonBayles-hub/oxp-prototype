# Research: Multifamily Regulation and Duties — Where It’s Regulated and How the Workforce (AI + Human) Must Comply

**Purpose:** (1) Understand **where** multifamily and property management are regulated (federal, state, local) and **how** those regulations apply. (2) Catalog the **duties and functions** that happen within multifamily operations. (3) Clarify how both **AI and human** workforce must operate within those regulations so the platform can design guardrails, escalation, and compliance-by-design.

**Relationship to other docs:** Complements **PMC-ORGANIZATION-WORKFORCE-RESEARCH.md** (org structure); **DEEP-RESEARCH-PLATFORM-PARTS.md** Part 6 (Governance, Fair Housing); **ENTRATA-AND-SOP-SOURCE-OF-TRUTH.md** (SOPs as source of truth). Use when defining jurisdiction, Knowledge filters, agent guardrails, and which duties are high-risk.

**Anchored in TDD:** The design that implements this research is in **docs/architecture/TDD-ARCHITECTURE.md**: high-regulation activities and guardrails → **§4.9.2**; escalation categories (including compliance/legal) → **§4.6**; compliance checklist (screening, eviction, accommodation) → **§4.7**; jurisdiction + segment for policies/Knowledge → **§4.3**, **§4.9.2**, **§4.10**; audit and citation → **§4.5**; agent buckets and duties → **§6** (Cross-Cutting). When updating this research, update those TDD sections if behavior must change.

---

## 1. Where Multifamily Is Regulated

Multifamily property management is regulated at **federal**, **state**, and **local** levels. The same activity (e.g. tenant screening, lease terms, eviction) may be governed by more than one layer.

### 1.1 Federal

| Area | What applies | Who it affects |
|------|----------------|----------------|
| **Fair Housing Act (FHA)** | Prohibits discrimination in housing based on **race, color, religion, sex, national origin, disability, familial status**. Applies to advertising, marketing, screening, leasing, terms, and services. Applies **regardless of technology** (including AI). | All housing providers; screening companies; anyone making housing decisions. |
| **Title VI (Civil Rights)** | Prohibits discrimination based on **race, color, national origin** in programs receiving federal financial assistance. Covers both intentional discrimination and **discriminatory effects**. | Properties receiving federal assistance (HUD programs, etc.). |
| **HUD-assisted / FHA-insured** | HUD regulations govern asset management, compliance monitoring, Management and Occupancy Reviews (MORs), physical inspections, and standards for owners and management agents. | Multifamily properties with HUD financing or assistance. |
| **LIHTC (Low-Income Housing Tax Credit)** | Income eligibility, rent limits, tenant selection plans, fair housing marketing, annual certifications, recordkeeping (e.g. 6+ years), monitoring and inspections by allocating agencies. | Affordable/LIHTC properties. |
| **Other federal** | ADA (accessibility for public accommodations); FCC (e.g. robocalls); federal tax and reporting. | Varies by program and activity. |

*Sources: HUD FHEO Guidance; HUD Multifamily Housing Policy Quick Reference; LIHTC compliance manuals (state agencies); DOJ Fair Housing Act; Multifamily Dive (state regulation report).*

### 1.2 State

| Area | What applies | Notes |
|------|----------------|------|
| **Landlord-tenant law** | Lease terms, security deposits, habitability, eviction procedures, notice requirements, retaliation protections, application denial reasons. | **Primary regulator of landlord-tenant relationship.** Every state + DC has its own statutes; many follow URLTA or a model code. |
| **Security deposits** | Amount limits, when/how to return, interest (in some states), disclosure requirements. | State-by-state; some cities add rules. |
| **Eviction** | Grounds, notice periods, court process, self-help (mostly prohibited). | State law controls; no single national rule. |
| **Habitability** | Implied warranty of habitability, building/housing code compliance, repair obligations; tenant remedies (repair-and-deduct, withhold rent, sue). | All states except IL and NJ have minimum habitability requirements (per recent surveys). |
| **Rent control / rent increase** | Only a few states have statewide rent increase limits (e.g. California, Oregon, DC). Others preempt local rent control or allow it in limited ways. | Highly state-dependent. |
| **Property management / broker licensing** | Many states require a **real estate license** (salesperson or broker) to manage property for compensation. Some have separate property-manager licenses or exemptions (e.g. on-site managers, employees). | Varies by state; pre-licensing often includes fair housing, tenant screening, leases, maintenance standards. |

*Sources: Nolo state-by-state landlord-tenant charts; Cornell LII landlord-tenant; state real estate commissions (Oregon, Ohio, Arizona); Showami property management license guide.*

### 1.3 Local

| Area | What applies | Notes |
|------|----------------|------|
| **Rent control / stabilization** | Where allowed by state, cities may set rent caps, just-cause eviction, registration. | States like NY, NJ, MD, MN, ME may allow local rent control; many states preempt. |
| **Tenant protections** | Notice periods, relocation assistance, source-of-income protections, etc. | Growing in many cities. |
| **Building and housing codes** | Fire, safety, habitability, inspections. | Often local (city/county) enforcement. |
| **Business / license** | Local business licenses, rental registration, inspection requirements. | Common in larger cities. |

*Sources: Multifamily Dive (state vs local rent control); HUD/local housing agency materials.*

---

## 2. How Regulation Applies by Activity (and Who Must Comply)

The following **activities** are directly in the regulatory spotlight. Both **humans and AI** involved in these activities must stay within the rules; liability can attach to the housing provider even when third parties or algorithms are used.

| Activity | Federal | State / local | AI & human obligation |
|----------|---------|----------------|------------------------|
| **Advertising / marketing** | FHA (no discriminatory statements or targeting); Title VI for HUD-assisted. | State consumer protection; local rules. | Content and targeting must be neutral; AI-generated or AI-targeted ads are subject to FHA. |
| **Tenant screening / applications** | FHA; HUD guidance (May 2024) on AI and algorithms. Criteria must be nondiscriminatory, in writing, publicly available; applicants must be able to dispute. | State limits on what can be considered (e.g. criminal, credit, eviction). | Housing provider **responsible** even if screening is outsourced or automated; design and test for FHA compliance; avoid overbroad or inaccurate criteria. |
| **Lease terms and enforcement** | FHA (reasonable accommodations, no discrimination in terms). | State landlord-tenant (deposits, notices, termination, eviction process). | Terms and enforcement actions must be consistent and within written policy; human and AI must not deviate in a discriminatory way. |
| **Rent setting and increases** | Limited federal (e.g. HUD-assisted, LIHTC limits). | State and local rent control where applicable. | Must follow jurisdiction rules; AI or tools that recommend or set rent must respect caps and notice rules. |
| **Maintenance / habitability** | HUD physical standards for assisted housing. | State habitability, repair obligations, tenant remedies. | Repairs and responses must meet code and lease; record-keeping for compliance. |
| **Eviction and notices** | FHA (no retaliatory eviction; reasonable accommodation). | State eviction procedure, notice periods, court process. | Highly regulated; human oversight and legal review typically required; AI should not execute eviction decisions without guardrails. |
| **Reasonable accommodation / disability** | FHA; ADA where applicable. | State disability rights. | Requests must be processed per FHA; documentation and consistency; human judgment often required. |
| **Refunds / fees / deposits** | FHA (no discriminatory fees). | State deposit limits, return timing, interest. | Must follow state and lease; financial decisions often need approval gates. |
| **Income certification (affordable)** | HUD; LIHTC program rules. | State LIHTC compliance. | Only in affordable segment; strict documentation and audit trail. |

**Takeaway:** For each **duty or function** (below), the platform must know which **activities** are high-regulation and ensure both AI agents and human workflows use **approved policies**, **audit trails**, and **human-in-the-loop** where the law or risk requires it.

---

## 3. Duties and Functions Within Multifamily (What Actually Happens)

These are the **duties and functions** that occur in multifamily operations. They map to our **agent buckets** and to **where regulation touches** the workforce.

### 3.1 Leasing & Marketing

| Duty / function | Description | Regulation touch |
|-----------------|-------------|-------------------|
| **Marketing and advertising** | Listings, ads, social, SEO; targeting and messaging. | FHA (no discriminatory content or targeting); state/local ad rules. |
| **Lead intake and follow-up** | Inquiries, tour scheduling, follow-up. | Fair housing (consistent treatment; no steering). |
| **Applications and screening** | Collect application; run credit/criminal/eviction checks; approve/deny. | **High.** FHA, HUD AI guidance; state limits on criteria; dispute rights. |
| **Lease execution** | Prepare lease, sign, deliver; lease terms and addenda. | State landlord-tenant; FHA (terms must be nondiscriminatory; reasonable accommodation). |
| **Move-in** | Inspections, keys, utilities, orientation. | Lease and state rules; documentation. |

*Platform:* **Leasing AI** and related workflows touch screening and lease terms; must use approved criteria, audit trail, and human review where required.

### 3.2 Resident Relations & Retention

| Duty / function | Description | Regulation touch |
|-----------------|-------------|-------------------|
| **Resident communication** | Questions, complaints, requests; tone and consistency. | FHA (no discriminatory treatment); lease and state obligations. |
| **Reasonable accommodation requests** | Disability-related requests; documentation and approval. | **High.** FHA; interactive process; human judgment required. |
| **Lease renewals** | Renewal offers, rent changes, notices. | State notice and rent-increase rules; FHA. |
| **Move-out** | Notice, inspection, deposit disposition, turnover. | State deposit and notice law; documentation. |

*Platform:* **Renewal AI** and staff assist; accommodation and deposit decisions need guardrails and often human approval.

### 3.3 Operations & Maintenance

| Duty / function | Description | Regulation touch |
|-----------------|-------------|-------------------|
| **Work order intake and triage** | Log requests; prioritize; assign. | Habitability and lease; no discriminatory delay or denial. |
| **Repairs and maintenance** | Schedule and complete repairs; vendors; inspections. | State habitability; HUD physical standards for assisted. |
| **Capital and projects** | Larger repairs, renovations; permits. | Building codes; permits; contract and insurance. |
| **Safety and inspections** | Fire, safety, compliance inspections. | Local codes; HUD MOR for assisted. |

*Platform:* **Maintenance AI** and workflows; ensure consistent response and documentation; no steering or delay by protected class.

### 3.4 Revenue & Financial Management

| Duty / function | Description | Regulation touch |
|-----------------|-------------|-------------------|
| **Rent collection** | Collect rent; late fees; payment plans. | State limits on fees; FHA (no discriminatory fees); lease terms. |
| **Refunds and fee waivers** | Refunds, waivers, concessions. | **Sensitive.** Often requires approval; FHA (nondiscriminatory). |
| **Security deposit handling** | Hold, interest, deductions, return. | **State-specific.** Amount, timing, itemization, disputes. |
| **Financial reporting** | Owner reports; budgets; tax-related. | Contract and tax; LIHTC reporting for affordable. |

*Platform:* **Payments AI** and accounting workflows; refunds and waivers typically need human approval or strict policy.

### 3.5 Risk Management & Compliance

| Duty / function | Description | Regulation touch |
|-----------------|-------------|-------------------|
| **Fair housing and compliance** | Policies, training, audits, responses to complaints. | FHA; Title VI; state; internal accountability. |
| **Eviction and legal** | Notices, filings, court, lockouts. | **High.** State eviction law; FHA (no retaliation); legal review. |
| **Insurance and claims** | Claims, coverage, vendor compliance. | Contract and insurance law. |
| **Recordkeeping and audits** | Retain records; respond to audits; LIHTC/annual certs. | HUD; LIHTC; state; 6+ year retention common. |

*Platform:* Escalation to human and audit trail for eviction and high-stakes compliance; Knowledge and docs for jurisdiction-specific rules.

---

## 4. AI and Human Workforce: Shared Obligation to Stay Within Regulations

### 4.1 Housing Provider Responsibility

- **Housing providers remain responsible** for Fair Housing (and other) compliance even when they use **third-party screening**, **vendors**, or **AI**. **Vicarious liability** can apply: if a screening company or an AI tool discriminates, the housing provider can be held accountable.
- Therefore **both AI and humans** in the workforce must operate within the same regulatory bounds. The platform must ensure that **agent actions** (e.g. screening, messaging, lease terms, refunds) are **consistent with approved policies**, **auditable**, and **subject to human oversight** where the law or risk requires it.

### 4.2 HUD Guidance on AI (May 2024) — Screening and Advertising

- **FHA applies regardless of technology.** Discrimination is prohibited whether decisions are made by humans or by AI/algorithms.
- **Screening:** Policies should be **transparent**, **in writing**, **publicly available before application**. Criteria applied **consistently** and **only within stated scope**. Applicants must be able to **challenge disqualifying information** and **dispute inaccuracies**. **Design and test** AI/models for FHA compliance. **Screen only for information relevant to lease compliance**; avoid overbroad criteria (especially credit, criminal, eviction history) that can have unjustified discriminatory effects.
- **Advertising:** Housing-related advertising that uses algorithms or AI must not discriminate or have discriminatory effects.
- **Accountability:** Both housing providers and screening companies must avoid discriminatory use of AI; providers cannot outsource away responsibility.

*Sources: HUD FHEO Guidance on Screening (May 2024); HUD PR 24-098; Consumer Financial Services Law Monitor.*

### 4.3 Implications for Platform (AI + Human Workforce)

| Principle | Implementation |
|-----------|----------------|
| **Single source of truth for policy** | SOPs and approved docs in the Vault; agents and staff assist use only these for regulated activities (screening, lease terms, fees, accommodations). |
| **Jurisdiction awareness** | Know **state and local** (and segment, e.g. LIHTC) so the right rules and docs are in scope; Knowledge and filters by jurisdiction. |
| **Guardrails by activity** | **Deterministic checks** and **approval gates** for screening, refunds, eviction-related actions, reasonable accommodation; not only prompt-based. |
| **Audit and traceability** | Log which docs/chunks were used, which tools were called, and who approved what; export for compliance and disputes. |
| **Human-in-the-loop where required** | Escalation to human for high-risk decisions (e.g. denial of accommodation, eviction, large refunds); AI suggests, human decides where the law expects it. |
| **No discriminatory drift** | Consistent application of written criteria; AI and human both bound by same SOPs and settings; testing and monitoring for disparate impact where feasible. |

---

## 5. Segment Overlay: Conventional vs Affordable (LIHTC / HUD-Assisted)

| Segment | Additional regulation | Duties/functions with extra burden |
|---------|------------------------|-------------------------------------|
| **Conventional** | State landlord-tenant; FHA; local codes; licensing. | Screening, leasing, maintenance, deposits, eviction as above. |
| **Affordable / LIHTC / HUD-assisted** | All of the above **plus**: income eligibility, rent limits, annual certifications, tenant selection plans, affirmative fair housing marketing, MORs, physical inspections, extended record retention (e.g. 6+ years). | **Income certification**, **rent limits**, **TSP compliance**, **reporting**, **monitoring**. |

The platform’s **segment** attribute (**TDD §4.10**) drives **which regulations and which docs** are in scope (e.g. LIHTC manual, HUD handbook for assisted) and which **agent functions** are enabled (e.g. income-cert workflow only in affordable). High-risk activities and jurisdiction/segment application are specified in **TDD §4.9.2**.

---

## 6. Summary: Regulation + Duties → Platform Design

- **Where regulated:** **Federal** (FHA, Title VI, HUD/LIHTC for assisted); **state** (landlord-tenant, deposits, eviction, habitability, licensing); **local** (rent control where allowed, codes, tenant protections).
- **Duties and functions:** **Leasing** (marketing, screening, lease, move-in); **Resident relations** (communication, accommodation, renewals, move-out); **Maintenance** (work orders, repairs, safety); **Revenue** (rent, refunds, deposits, reporting); **Compliance/risk** (fair housing, eviction, insurance, records). Each has regulated activities that require policy-based behavior and audit.
- **AI and human:** Both must operate within the same regulations; provider is responsible even when using AI or vendors. Platform must provide **approved-docs-only** grounding, **jurisdiction-aware** scope, **guardrails and approval gates** for high-risk actions, **audit trail**, and **human-in-the-loop** where the law or risk requires it.

---

## 7. Sources (Consolidated)

- **Federal / FHA:** HUD FHEO Guidance on Screening (May 2024); HUD PR 24-098 (AI and FHA); DOJ Fair Housing Act; HUD Multifamily Housing Policy Quick Reference; HUD Accessibility First.
- **State / local:** Nolo state-by-state landlord-tenant; Cornell LII landlord-tenant; Multifamily Dive (state regulation report); state real estate commissions (OR, OH, AZ); Showami PM license guide.
- **Affordable:** LIHTC compliance manuals (state agencies); HUD HOME compliance guide; HUD asset management lifecycle.
- **Duties:** AllPropertyManagement; Property Management Consulting; Investopedia; Smartland; Robert Weiler Company.
- **Industry:** NMHC/NCHM (AI and screening); Consumer Financial Services Law Monitor (HUD AI guidance).

*Last updated: Feb 2025. Use when defining jurisdiction, Knowledge filters, agent guardrails, required-docs checklists, and escalation rules for regulated activities.*
