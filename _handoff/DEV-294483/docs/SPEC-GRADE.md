# Spec Handoff Grade: B

**Score:** 83/100 (base) | PCG: 5/10 | POR: 3/10
**Verdict:** Solid foundation. Some gaps to address before handoff, but nothing fundamental is wrong.
**Spec:** DEV-294483 — L3 Agent — Post Recurring Charges
**Graded:** 2026-05-21
**Handoff Type:** prototype | **Archetype:** retrofit | **L-Level:** L3

---

## Artifact Inventory

| Artifact | Found? | Notes |
|----------|--------|-------|
| Problem statement / "Why" | Y | Quantified: 1,842+ properties, deeply nested path |
| Workflows / user journeys | Y | 2 flows with ASCII step diagrams |
| User stories with ACs | Y | 4 stories with checkbox-style ACs |
| API / integration spec | N | Explicitly out of scope for prototype |
| Test plan / SDET section | Y | 10 Given/When/Then test cases |
| Amplitude / telemetry plan | Y | 10 events with required + optional properties |
| Video walkthrough | N | Transcript exists; recording not yet done |
| Prototype | Y | Running code in oxp-prototype-product |
| Feature flag / rollout plan | Y | `oxp_l3_agent_post_recurring_charges`, internal → pilot → GA |
| Permissions / roles | Y | OXP access + property write; read-only view |
| Vertical impact | Y | All verticals, no differences |
| Handoff Type | prototype | Detected from pipeline state |
| L-Level | L3 | Deterministic automation, not AI |
| Named Client Evidence | N | Quantified scale (1,842+ properties) but no named client |
| EP Quality | 54 lines (<80) | Below threshold — Critical flag |
| Naming Consistency | Clean | "Post Recurring Charges" consistent across all surfaces |

---

## What's Working

- **Problem quantification:** The problem statement quantifies the automation's scale — "1,842+ properties" with the deeply nested path (`Setup >> Properties >> Financial >> Charges >> General`) clearly articulated. Engineering immediately understands the scope and why centralized visibility matters.

- **Backend grounding:** All 4 database columns are verified from the actual `CBasePropertyChargeSetting.class.php` source with exact member variable names, types, and defaults. The engineering standards document even notes the discrepancy between Jira's label (`scheduled_charge_auto_post_date`) and the actual column (`scheduled_charge_auto_post_day`). This saves engineering from chasing a phantom column.

- **Derived settings logic precision:** The conditional business logic (day=1 → Current Month, day≠1 → Next Month) is specified exactly, demonstrated in the prototype, and tested across 3 SDET test cases (TC-4, TC-5, and the derived settings display). No ambiguity for engineering.

- **Test and telemetry coverage:** 10 SDET test cases and 10 Amplitude events — both exceed the minimum thresholds. AARRR metrics all have numeric targets (500 users, 40% activation, 25% retention, 70% coverage). The 3-step funnel is well-defined.

- **Scope discipline:** Six explicit out-of-scope items draw hard boundaries. The distinction between L2 (manual bulk) and L3 (automated) agents is documented and resolved.

---

## Critical: Must Fix Before Handoff

| # | Issue | Dimension | What's Missing | Suggested Fix |
|---|-------|-----------|----------------|---------------|
| 1 | ENGINEERING-PROMPT.md is 54 lines (below 80-line threshold) | Engineering Handoff | Architecture decisions, implementation sequence, and Definition of Done are thin. Engineering is guessing at the OXP API bridge architecture. | Expand EP to ≥80 lines: add OXP API endpoint design (method, path, request/response shape), implementation sequence (1. rename, 2. wire API, 3. feature flag, 4. permission gate), and explicit DoD checklist. |
| 2 | No rollback strategy | Engineering Handoff | If the feature flag is enabled and something breaks, how does the team revert? What happens to properties toggled during rollout? | Add a rollback section: "Disable feature flag reverts to pre-OXP behavior. Property settings remain unchanged in `property_charge_settings` — the flag only hides the OXP surface." |

---

## Polish: Would Improve the Handoff

| # | Suggestion | Dimension | Why It Helps |
|---|------------|-----------|--------------|
| 1 | Add named client evidence | Problem Definition | "1,842+ properties" quantifies scale but doesn't name who asked. Even "based on N CS tickets" or "requested by [client type]" strengthens the case. |
| 2 | Add first-principles math | Problem Definition | "X minutes per property × 50 properties × 12 months = Y hours saved" makes the ROI concrete for engineering and stakeholders. |
| 3 | Record the video walkthrough | Presentation | Transcript exists and is well-grounded; recording it would give engineering a visual reference and complete the FE Doc video field. |
| 4 | Add cross-cutting accessibility assertions to test cases | Testability | TC-1 through TC-10 cover functional behavior but none include keyboard nav or ARIA checks. Adding one `AND the element is keyboard-focusable` assertion to TC-3 and TC-4 covers it. |
| 5 | Document error states for production | Solution Spec | What happens if the OXP API call to write `property_charge_settings` fails? Toast error? Retry? The prototype uses local state only. |
| 6 | Add OXP API ↔ Core bridge owner | Engineering Handoff | The cross-repo dependency is noted but no team owner is named. Adding "Owner: [OXP Platform team]" prevents ownership ambiguity. |

---

## Dimension Breakdown

| Dimension | Score | Notes |
|-----------|-------|-------|
| Problem Definition | 17/20 | Strong: quantified scale (1,842+ properties), clear before/after, 6 scope exclusions, L3 classification. Missing: no first-principles math formula and no named client evidence. |
| Solution Specification | 18/20 | Excellent: exact derived settings logic, 4-column data model with types/defaults, 2 documented flows, plain-language FE sections. Minor: no error state documentation for API failures. |
| Engineering Handoff | 14/20 | Feature flag, rollout phases, and build location are solid. EP is thin at 54 lines (must fix). No API contracts (appropriate for prototype, but production needs them). No rollback strategy. No named owner for OXP API bridge dependency. |
| Testability & Quality | 18/20 | 10 SDET test cases (2× minimum), 10 Amplitude events (1.25× minimum), AARRR with numeric targets. No cross-cutting accessibility assertions and no formalized test data fixtures. |
| Presentation & Completeness | 16/20 | Well-structured: PROJECT-DETAILS (10 sections), spec, engineering standards, signal intake, task file, video transcript (14 sections + decision table), 8 FE Doc fields pushed to Jira. Missing: no recorded video, edge-case review not run. |

---

## PCG: Production-Code Grounding (5/10)

| Sub-criterion | Score | Evidence |
|---|---|---|
| PCG-A: Verified anchors | 1/2 | Anchors exist (CBasePropertyChargeSetting path, member vars, getters/setters) but no commit-hash permalinks |
| PCG-B: Pattern coverage (A1-A4) | 1/2 | Schema topology audited (4 columns), naming conventions noted; no formal anchoring-audit.md |
| PCG-C: Convention map | 1/2 | Getters/setters documented, file paths noted; not a full convention map of the target module |
| PCG-D: Implementation shapes | 0/2 | No PHP/SQL sketches at target paths |
| PCG-E: Honest disclosure | 2/2 | Prototype vs production divergences documented, out-of-scope items explicit, Jira label discrepancy noted |

## POR: Production-Operational Risk (3/10)

| Sub-criterion | Score | Evidence |
|---|---|---|
| POR-A: Entry-point enumeration | 1/2 | Entry points identified (flyout, property toggle, settings save) but no bypass paths |
| POR-B: Rollback under concurrent writes | 0/2 | **No rollback analysis** (VETO-ELIGIBLE — but base grade is already B, below B+ cap) |
| POR-C: Dependency walks | 0/1 | No bidirectional walks for shared abstractions |
| POR-D: Observability | 0/1 | No SLOs, alerts, or trace spans documented |
| POR-E: Data migration safety | 1/1 | No migrations needed for prototype; production migration plan scoped (read/write existing columns) |
| POR-F: Cross-team sign-off | 0/2 | **No named owner for OXP API ↔ Core bridge** (VETO-ELIGIBLE) |
| POR-G: Canary/rollout plan | 1/1 | Internal (CID 17211, 235) → pilot → GA at R2 |

---

## Recommended Next Steps

1. **Expand ENGINEERING-PROMPT.md to ≥80 lines** — add OXP API endpoint design, implementation sequence, and Definition of Done checklist. This is the highest-impact fix (moves Dim 3 from 14 to 16+).
2. **Add rollback strategy** — one paragraph explaining feature flag revert behavior and property settings persistence.
3. **Name the OXP API bridge team owner** — resolves POR-F and clarifies the cross-repo dependency.
4. **Record the video walkthrough** — the transcript is complete and grounded; recording completes Dim 5.
5. **Add first-principles math to the problem statement** — optional but pushes Dim 1 from 17 to 18+.
