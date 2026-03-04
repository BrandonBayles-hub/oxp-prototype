# OXP Studio

Proof-of-concept for an **AI-native multifamily property management platform**. Janet gives property management companies a single place to configure, operate, and govern a blended human-AI workforce — from onboarding and agent setup through daily operations, performance measurement, and regulatory compliance.

This is a **navigable UI** with all major pages, mock data, role-based views, and no real backend. It exists to validate the product surface area before engineering begins.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19, TypeScript (strict), Tailwind CSS |
| Components | shadcn/ui (Radix primitives) |
| Charts | Recharts |
| Rich text | TipTap |
| Icons | Lucide React |
| Fonts | Nohemi (page headers), Inter (body) |

---

## Quick Start

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://127.0.0.1:3000`). You'll land on **Getting Started** or **Command Center** depending on setup state.

**Other scripts:**

| Script | Purpose |
|---|---|
| `npm run dev:clean` | Delete `.next` cache and start fresh (fixes blank screens) |
| `npm run dev:fresh` | Kill port 3000, clear cache, and start |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | ESLint |
| `npm test` | Vitest |

**Common issue — blank screen or stale UI:** Delete `.next` and restart. See [RUN.md](RUN.md) for detailed troubleshooting.

---

## Project Structure

```
Janet/
├── app/                    # Next.js App Router — pages and layouts
│   ├── layout.tsx          # Root layout: provider tree, app shell, route guard
│   ├── page.tsx            # / — redirects to command-center or getting-started
│   ├── command-center/     # Dashboard (role-aware: IC vs Admin view)
│   ├── escalations/        # Escalation triage queue
│   ├── performance/        # Analytics and insights
│   ├── agent-roster/       # AI agent management
│   ├── workforce/          # Org structure (humans + AI)
│   ├── getting-started/    # Setup wizard (Activation)
│   ├── workflows/          # Workflow automation
│   ├── trainings-sop/      # Document library
│   ├── voice/              # Brand voice config (coming soon)
│   ├── governance/         # Guardrails and audit (coming soon)
│   ├── conversations/      # Live conversations inbox
│   └── tools/              # MCP tools (hidden from nav)
│
├── components/
│   ├── app-shell/          # Sidebar, mobile nav, top nav
│   ├── ui/                 # shadcn primitives (button, card, dialog, etc.)
│   ├── page-header.tsx     # Shared page header component
│   ├── escalation-detail-sheet.tsx  # Reused across multiple pages
│   ├── route-guard.tsx     # Redirects unauthorized roles
│   └── ...                 # Other shared components
│
├── lib/
│   ├── *-context.tsx       # 13 React context providers (state + localStorage)
│   ├── role-context.tsx    # Role system: admin, regional, property, ic
│   ├── mock-data.ts        # Seed data for escalations, agents, vault docs
│   ├── utils.ts            # cn() — Tailwind class merging
│   ├── use-nav-badges.ts   # Sidebar badge counts
│   └── use-agent-compliance.ts  # Agent compliance checks
│
├── docs/
│   ├── architecture/       # TDD, codebase guide, gaps, migration
│   ├── design/             # UI/UX guidelines, shadcn component mapping
│   ├── product/            # Page goals, Jira hierarchy, concept coverage
│   ├── research/           # 9 research docs (agents, regulations, Entrata, etc.)
│   └── poc/                # POC build plan and checklist
│
├── assets/                 # Source SVGs (Entrata cube, ELI+ cube)
└── public/                 # Static assets served by Next.js
```

---

## Documentation Map

Start here. Read in the order that matches your role.

### For everyone (start here)

| Doc | What it covers |
|---|---|
| [docs/architecture/CODEBASE-GUIDE.md](docs/architecture/CODEBASE-GUIDE.md) | How the code works: folder structure, context tree, data flow, page anatomy, role system, how to add pages/contexts |
| [docs/architecture/POC-TO-PRODUCTION.md](docs/architecture/POC-TO-PRODUCTION.md) | Migration guide: what's mocked, where to plug in real APIs, feature flags, auth |

### Product

| Doc | What it covers |
|---|---|
| [docs/product/APP-PAGES-AND-GOALS.md](docs/product/APP-PAGES-AND-GOALS.md) | Every page, its goal, and TDD mapping |
| [docs/product/JIRA-INITIATIVES-AND-EPICS.md](docs/product/JIRA-INITIATIVES-AND-EPICS.md) | Jira hierarchy: 1 initiative, 10 epics, 10 stories with detailed acceptance criteria |
| [docs/product/PAGE-CONCEPTS-RESEARCH-AND-TDD-COVERAGE.md](docs/product/PAGE-CONCEPTS-RESEARCH-AND-TDD-COVERAGE.md) | Research coverage for every concept in the page outline |

### Design

| Doc | What it covers |
|---|---|
| [docs/design/UI-UX-GUIDELINES.md](docs/design/UI-UX-GUIDELINES.md) | Design principles, typography, color, app shell, page patterns, responsive behavior |
| [docs/design/SHADCN-COMPONENT-MAPPING.md](docs/design/SHADCN-COMPONENT-MAPPING.md) | Which shadcn component to use for each UI element |

### Architecture

| Doc | What it covers |
|---|---|
| [docs/architecture/TDD-ARCHITECTURE.md](docs/architecture/TDD-ARCHITECTURE.md) | Full technical design: every subsystem, build phases, dependency graph |
| [docs/architecture/TDD-GAPS-AND-CLARIFICATIONS.md](docs/architecture/TDD-GAPS-AND-CLARIFICATIONS.md) | Open decisions and under-specified areas |

### Research (reference)

| Doc | What it covers |
|---|---|
| [docs/research/AGENT-TYPES-TAXONOMY.md](docs/research/AGENT-TYPES-TAXONOMY.md) | Three agent types: Autonomous (ELI+), Intelligence, Operations |
| [docs/research/DEEP-RESEARCH-PLATFORM-PARTS.md](docs/research/DEEP-RESEARCH-PLATFORM-PARTS.md) | Deep research on each platform part with citations |
| [docs/research/ENTRATA-AND-SOP-SOURCE-OF-TRUTH.md](docs/research/ENTRATA-AND-SOP-SOURCE-OF-TRUTH.md) | Entrata API/MCP architecture, SOP-as-settings schema |
| [docs/research/PMC-ORGANIZATION-WORKFORCE-RESEARCH.md](docs/research/PMC-ORGANIZATION-WORKFORCE-RESEARCH.md) | How PMCs are organized: functions, tiers, staffing |
| [docs/research/MULTIFAMILY-REGULATION-AND-DUTIES-RESEARCH.md](docs/research/MULTIFAMILY-REGULATION-AND-DUTIES-RESEARCH.md) | Regulations by activity (FHA, screening, leasing, etc.) |
| [docs/research/METRICS-STAFFING-AI-VALUE.md](docs/research/METRICS-STAFFING-AI-VALUE.md) | How metrics drive staffing and AI ROI |
| [docs/research/AI-NATIVE-PLATFORM-REQUIREMENTS.md](docs/research/AI-NATIVE-PLATFORM-REQUIREMENTS.md) | 10 areas needed for AI-native (model layer, RAG, runtime, etc.) |
| [docs/research/HARVEY-GAP-ANALYSIS-MULTIFAMILY.md](docs/research/HARVEY-GAP-ANALYSIS-MULTIFAMILY.md) | Gap analysis vs Harvey AI |
| [docs/research/HARVEY-SIERRA-RESEARCH.md](docs/research/HARVEY-SIERRA-RESEARCH.md) | Harvey and Sierra as reference models |
| [docs/research/GETTING-STARTED-SETUP-RESEARCH.md](docs/research/GETTING-STARTED-SETUP-RESEARCH.md) | Onboarding and setup research |

---

## Key Conventions

- **Terminology:** Use **resident** (not "tenant") for the person living at a property. In the TDD, "tenant" means our customer (the PMC).
- **Components:** shadcn/ui only. Add with `npx shadcn@latest add <component>`. Do not introduce another component library.
- **Fonts:** Nohemi for page headers (`font-display`), Inter for everything else (`font-sans`).
- **State:** React Context + `useState` + `localStorage` for persistence. 13 providers nested in `app/layout.tsx`. No external state library.
- **Roles:** 4 roles (admin, regional, property, ic) control page access and data visibility. Switch via the top nav dropdown.
- **Design:** Open, minimal, neutral palette. See [UI-UX-GUIDELINES.md](docs/design/UI-UX-GUIDELINES.md).
