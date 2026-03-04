# Product

Product view of the app: sections, pages, and goals. The architecture (TDD) implements these; this folder holds the “what the user sees and accomplishes” so we can map to components and spot gaps.

**Terminology:** The industry uses **resident** (not "tenant") for the person living at the property. Use **resident** in all product and customer-facing copy. In the TDD, "tenant" = our customer (the PMC). See TDD §2 Terminology.

## Contents

- **APP-PAGES-AND-GOALS.md** — **Sections and pages** with the **goal of each page** and mapping to **TDD-ARCHITECTURE.md**. Sections: **To Do** (Getting Started, Command Center, Escalations); **My Workforce** (Performance, Agent Roster, Workforce); **Configure** (Workflows, Voice, Tools, Governance). Use for navigation design, information architecture, and build-order alignment; update TDD where the doc identifies gaps.

- **PAGE-CONCEPTS-RESEARCH-AND-TDD-COVERAGE.md** — **Do we have research and clear understanding?** For every concept mentioned in the page outline (orchestration, “where to look,” training escalations, occupancy, correlation/causation, JTBD, unified vs per-property voice, general AI liability, etc.), this doc maps **TDD coverage** and **research** (which docs back it). Surfaces gaps (e.g. PM health metrics source, general AI governance research) and recommendations. Use when validating that the outline is backed by research and TDD.

- **JIRA-INITIATIVES-AND-EPICS.md** — **Jira work hierarchy.** One initiative, ten epics (one per active side-nav page), each with a detailed story covering every UI section, interaction, filter, modal, and role-based behavior. Use when creating or triaging Jira items; aligns 1-to-1 with the pages in APP-PAGES-AND-GOALS.md.

- **UI/UX consistency:** **docs/design/** — Design system and UI guidelines. **shadcn** is the component library; **Nohemi** (page headers) and **Inter** (body). Principles: open layout, simple and clean, minimal icons/outlines. See **UI-UX-GUIDELINES.md** and **SHADCN-COMPONENT-MAPPING.md** so every page shares the same elements and feels consistent.
