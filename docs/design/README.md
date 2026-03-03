# Design

UI/UX guidelines and design system for the platform. Everything is built with **shadcn/ui** and follows the same layout, typography, and patterns so every page feels consistent.

**What good looks like:** Calm, open, and purposeful — like Harvey, Claude, or Linear. Not a busy, card-heavy, colorful dashboard. See **UI-UX-GUIDELINES.md §6.1** for a short checklist.

## Contents

- **UI-UX-GUIDELINES.md** — Single source of truth for design: principles (open layout, simple and clean, minimal icons/outlines), typography (Nohemi for page headers, Inter for body), app shell (sidebar nav + main content), page patterns (header block, action bar, tables/lists), shadcn usage, micro-interactions and loading, and mapping from reference screens to app pages.
- **SHADCN-COMPONENT-MAPPING.md** — Which shadcn components to use for each UI element (app shell, action bar, tables, sectioned lists, floating input, loading). Use when building so every page shares the same components.

## Reference screens

Two screens define the target look (a third — e.g. Command Center or Escalations — can be added when available; same open, minimal pattern):

1. **Trainings & SOP** — Document list: open layout, borderless table, search + actions, floating “Ask a question” input.
2. **Agent Roster** — Sectioned lists by bucket (Leasing & Marketing, Resident Relations & Retention, etc.) with counts, status tags, and View All.

Use these as the standard for spacing, type, and restraint (icons and outlines only when needed). Optional: an **annotated** version of one reference (with callouts explaining why it's good) can live in `assets/`; see **UI-UX-GUIDELINES.md §6.1**. A **"what to avoid"** reference (card-heavy, high-color dashboard) is in **UI-UX-GUIDELINES.md §7.1** — we want simple like Harvey, Claude, OpenAI, not a busy dashboard.

## Quick rules

- **Library:** shadcn only; add components with `npx shadcn@latest add <component>`.
- **Fonts:** Nohemi (page headers), Inter (everything else).
- **Layout:** One app shell (sidebar + main); same on every page.
- **Restraint:** Only show what’s necessary; minimal icons and borders; separate with spacing.
- **Color:** Use **very sparingly**. In the mocks it appears rarely; when it does it’s intentional (e.g. status). Default to neutrals (white, greys, black); no decorative color.
- **Copy:** Friendly but professional; **short and concise** — no long sentences or descriptions. See **UI-UX-GUIDELINES.md §2.2**.
- **Responsive:** App works across screen sizes; sidebar becomes a Sheet/drawer on small viewports; tables and action bars adapt. See **UI-UX-GUIDELINES.md §3.1** and **SHADCN-COMPONENT-MAPPING.md** (Responsive behavior).
