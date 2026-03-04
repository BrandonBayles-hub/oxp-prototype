# Architecture

Technical design and build plan for the AI-native multifamily platform.

## Contents

- **TDD-ARCHITECTURE.md** — **Technical Design Document (TDD)** and architecture. Single source of truth for what we build and in what order. Fills all gaps identified in HARVEY-GAP-ANALYSIS-MULTIFAMILY.md:
  - **Vault** (§4.1): Unified document store; **SOPs are a document type** in the Vault (versioning, approval, settings extraction); bulk operations, review tables, Vault-triggered workflows.
  - **Workflow Builder** (§4.2): **Workato** embedded and white-label; platform connector; trigger from Vault; document-in/document-out via recipes.
  - **Knowledge** (§4.3), **source citation** (§4.5), **Academy** (§4.6), **Ecosystem** (§4.4), **Collaboration** (§4.7), **Trust** (§4.8), **segment solutions** (§4.9).
  - **AI-native foundations** (§5), **Cross-Cutting** (§6), **Build phases** (§7), **Dependency graph** (§8), **Gap closure checklist** (§9).

- **CODEBASE-GUIDE.md** — **How the code works.** Folder structure, app shell, context tree (all 13 providers with nesting order and localStorage keys), data flow, page anatomy, role system, component conventions, and step-by-step guides for adding new pages and contexts. Read this first if you're picking up the codebase.

- **POC-TO-PRODUCTION.md** — **Migration guide.** What's mocked and where, how to swap in real APIs, context-by-context migration paths, Entrata/Workato integration, feature flags (Voice, Governance), and auth.

- **TDD-GAPS-AND-CLARIFICATIONS.md** — **What’s still missing or unclear:** open decisions (model, RAG, voice, auth), under-specified areas (Escalations, Workforce, internal tools catalog, tenant hierarchy), and scope clarifications (Phase 1 agents, Knowledge, staff assist, Entrata widget fallback, outcome metrics). Use as a pre-build and in-build checklist; update as gaps are closed.

**Build rule:** No feature work starts without a defined place in the TDD. Implement in the order of §7 (Build Phases) and §8 (Dependency Graph). Close items in TDD-GAPS-AND-CLARIFICATIONS.md before or during build.

**POC:** For a navigable UI proof-of-concept (all pages, mock data, no backend), use **docs/poc/POC-BUILD-PLAN.md** — chunked plan and checklist so nothing is missed.
