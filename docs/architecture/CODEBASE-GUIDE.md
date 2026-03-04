# Codebase Guide

**Purpose:** Explain how the OXP Studio code works so a new developer can get productive in a day. This bridges the gap between the TDD (what we're building) and the actual codebase (how it's built).

**Audience:** Engineers picking up this codebase for the first time.

---

## 1. Folder Structure

```
Janet/
├── app/                    # Next.js App Router — one folder per route
│   ├── layout.tsx          # Root layout: provider tree + app shell
│   ├── page.tsx            # / — redirects based on setup state
│   ├── globals.css         # Tailwind base, theme variables, fonts
│   ├── error.tsx           # Error boundary
│   ├── not-found.tsx       # 404 page
│   ├── command-center/
│   ├── escalations/
│   ├── performance/
│   ├── agent-roster/
│   ├── workforce/
│   ├── getting-started/
│   ├── workflows/
│   ├── trainings-sop/      # Includes [id]/ dynamic route for doc detail
│   ├── voice/
│   ├── governance/
│   ├── conversations/
│   └── tools/
│
├── components/
│   ├── app-shell/          # Layout chrome: sidebar.tsx, mobile-nav.tsx, entrata-top-nav.tsx
│   ├── ui/                 # shadcn primitives (button, card, dialog, sheet, etc.)
│   └── *.tsx               # Shared components: page-header, escalation-detail-sheet, etc.
│
├── lib/
│   ├── *-context.tsx       # 13 React context providers (all state lives here)
│   ├── mock-data.ts        # Seed data consumed by contexts
│   ├── utils.ts            # cn() utility
│   ├── use-nav-badges.ts   # Derived badge counts for sidebar
│   └── use-agent-compliance.ts  # Agent compliance derivation
│
├── docs/                   # Product, architecture, design, research, POC docs
├── assets/                 # Source SVGs
├── public/                 # Static files served by Next.js
└── scripts/                # One-off utility scripts
```

**Key rule:** Pages go in `app/`. Shared components go in `components/`. All state and data logic goes in `lib/`. No business logic in page files — pages compose components and consume context hooks.

---

## 2. App Shell

The app shell renders on every page and is defined in `app/layout.tsx`.

### Layout structure

```
<EntrataTopNav />        ← fixed top bar (role switcher, notifications)
<MobileNav />            ← visible < lg: hamburger → Sheet with nav
<div flex>
  <Sidebar />            ← visible >= lg: left nav column (14rem)
  <main>
    <RouteGuard>         ← checks role access, redirects if unauthorized
      {children}         ← page content
    </RouteGuard>
  </main>
</div>
<NotificationToast />    ← floating toast notifications
```

### Sidebar navigation

Defined in `components/app-shell/sidebar.tsx`. Navigation items are hardcoded in `navGroups`:

- **To Do:** Command Center, Escalations
- **My Workforce:** Performance, Agent Roster, Workforce
- **Configure:** Activation, Workflows, Trainings & SOP, Voice, Governance

Items are filtered at render time:
1. `isRouteAllowed(item.href)` removes items the current role can't access
2. `goLiveComplete` hides the Activation item after setup is done

The mobile nav (`components/app-shell/mobile-nav.tsx`) mirrors this in a Sheet (drawer).

### Route guard

`components/route-guard.tsx` wraps all page content. If the current role doesn't have access to the current pathname, it shows an "Access restricted" message and redirects to `/command-center`.

---

## 3. Context Tree (State Management)

All application state lives in React context providers. There is no external state library. Each provider follows the same pattern:

1. `useState` for data
2. `useEffect` to hydrate from `localStorage` on mount
3. `useEffect` to persist to `localStorage` on change
4. Exported `use*` hook for consuming components

### Provider nesting order

Defined in `app/layout.tsx` lines 67–107. Order matters — inner providers can consume outer ones:

```
RoleProvider                    ← role, isRouteAllowed, roleProperties
└─ SetupProvider                ← setup wizard state, goLiveComplete
   └─ VaultProvider             ← documents, folders, approval state
      └─ AgentsProvider         ← agent list, config, status
         └─ WorkforceProvider   ← org structure, members, teams
            └─ WorkflowsProvider    ← recipes, template state
               └─ VoiceProvider     ← voice config (flagged off)
                  └─ EscalationsProvider ← escalations, routing, SLA timer
                     └─ ConversationsProvider ← live conversations
                        └─ ToolsProvider     ← MCP tool config
                           └─ GovernanceProvider ← guardrails, lifecycle
                              └─ FeedbackProvider   ← feedback items
                                 └─ NotificationsProvider ← toasts
```

### What each context manages

| Context | Key state | localStorage key | Notes |
|---|---|---|---|
| `RoleProvider` | `role` | none (in-memory) | Drives route access and data visibility |
| `SetupProvider` | Step completion, `goLiveComplete` | `janet-setup` | Controls Activation page and landing redirect |
| `VaultProvider` | Documents, folders, approval queue | `janet-vault` | Consumed by Trainings & SOP, agent training |
| `AgentsProvider` | Agent list, configs, statuses | `janet-agents` | Consumed by Agent Roster, setup, compliance |
| `WorkforceProvider` | Members, org tree, teams | `janet-workforce` | Consumed by Workforce, escalation routing |
| `WorkflowsProvider` | Recipes, templates | `janet-workflows` | Consumed by Workflows page |
| `VoiceProvider` | Voice config, channels, guardrails | `janet-voice` | Feature-flagged off in the UI |
| `EscalationsProvider` | Escalations, routing rules, SLA timer | `janet-escalations` | Consumed by Escalations, Command Center |
| `ConversationsProvider` | Conversations, messages | `janet-conversations` | Consumed by Conversations, Command Center |
| `ToolsProvider` | MCP tool config | `janet-tools` | Tools page (hidden from nav) |
| `GovernanceProvider` | Guardrails, lifecycle stages, audit | `janet-governance` | Feature-flagged off in the UI |
| `FeedbackProvider` | Feedback items | `janet-feedback` | Consumed by Performance page |
| `NotificationsProvider` | Toast queue | none (in-memory) | Transient notifications |

### Data flow

```
mock-data.ts / hardcoded seeds
       │
       ▼
Context provider (useState + localStorage)
       │
       ▼
use* hook (e.g. useEscalations)
       │
       ▼
Page component / shared component
```

Pages never fetch data directly. They call context hooks (`useEscalations()`, `useVault()`, etc.) and render what comes back. When migrating to a real backend, swap the data source inside each context provider — the page code doesn't change.

---

## 4. Page Anatomy

Every page follows the same pattern:

```tsx
export default function SomePage() {
  const { data, actions } = useSomeContext();
  const { role } = useRole();

  return (
    <>
      <PageHeader
        title="Page Name"
        description="One-line description"
        actions={<Button>Primary Action</Button>}
      />

      {/* Page content: stats, filters, tables, charts */}

      {/* Optional: Sheet or Dialog for detail views */}
      <SomeDetailSheet />
    </>
  );
}
```

**`PageHeader`** (`components/page-header.tsx`) is used on every page. It takes `title`, optional `description`, and optional `actions` (buttons rendered top-right).

**Role-based rendering:** Pages check `role` from `useRole()` and conditionally show/hide sections. For example, Performance hides certain metrics for the `property` role, and Command Center renders a completely different component for `ic` vs admin roles.

**Detail views:** Most pages open a Sheet (slide-over panel) or Dialog (modal) for detail views rather than navigating to a new route. The `EscalationDetailSheet` is reused across Command Center, Escalations, and Trainings & SOP.

---

## 5. Role System

### Roles

| Role | Label | Page access | Property scope |
|---|---|---|---|
| `admin` | Corporate Admin | All pages | All properties |
| `regional` | Regional Manager | Command Center, Escalations, Conversations, Performance, Agent Roster, Workforce | Property A, Property B |
| `property` | Property Manager | Same as regional | Property A |
| `ic` | Site Staff | Command Center, Escalations, Conversations, Workforce | Property A |

Defined in `lib/role-context.tsx`. The `ALLOWED_ROUTES` map controls page access. `ROLE_PROPERTIES` controls which properties appear in filters and data.

### How it works

1. `RoleProvider` exposes `role`, `setRole`, `isRouteAllowed`, and `roleProperties`
2. `EntrataTopNav` renders a role switcher dropdown (for POC demo purposes)
3. `Sidebar` filters nav items via `isRouteAllowed`
4. `RouteGuard` blocks unauthorized page access
5. Individual pages read `role` or `roleProperties` to show/hide sections

---

## 6. Component Conventions

### shadcn/ui

All UI primitives come from shadcn. Add new components with:

```bash
npx shadcn@latest add <component>
```

Components live in `components/ui/`. Do not modify them unless necessary (prefer wrapping). Do not introduce another component library.

### Sheet vs Dialog vs Modal

- **Sheet** (`components/ui/sheet.tsx`): Slide-over panel from the right. Used for detail views that need lots of space (escalation details, agent config, member details). The standard choice for detail views.
- **Dialog** (`components/ui/dialog.tsx`): Centered modal. Used for confirmations, small forms, and "coming soon" messages.
- **Custom modals**: Some pages define their own modal components (e.g., `AddDocChoiceModal`, `UploadDocModal` in Trainings & SOP). These are page-specific and live alongside the page.

### Reusable components

| Component | Used by | Purpose |
|---|---|---|
| `PageHeader` | All pages | Title, description, actions |
| `EscalationDetailSheet` | Escalations, Command Center, Trainings & SOP | Full escalation detail view |
| `Chat` (`components/ui/chat.tsx`) | Command Center, Agent Roster | Embedded chat interface |
| `ComingSoon` | Voice, Governance, Workforce (Compliance tab) | Placeholder for unbuilt features |
| `ValueYoureMissingBanner` | Command Center, Performance | Revenue opportunity banner |
| `NotificationToast` | Global (layout) | Toast notifications |

---

## 7. How To: Add a New Page

1. **Create the route:** Add `app/<route-name>/page.tsx` with a default export.

2. **Add to sidebar:** In `components/app-shell/sidebar.tsx`, add an entry to the appropriate `navGroups` section:
   ```tsx
   { href: "/<route-name>", label: "Page Label", icon: SomeIcon }
   ```

3. **Add to mobile nav:** In `components/app-shell/mobile-nav.tsx`, add the same entry.

4. **Set role access:** In `lib/role-context.tsx`, add the route to each role's array in `ALLOWED_ROUTES` (or it defaults to admin-only).

5. **Follow the pattern:** Use `PageHeader` at the top. Consume context hooks for data. Use shadcn components for UI. Reference [UI-UX-GUIDELINES.md](../design/UI-UX-GUIDELINES.md) for design decisions.

---

## 8. How To: Add a New Context

Follow the existing pattern:

```tsx
"use client";

import { createContext, useContext, useState, useEffect } from "react";

type MyState = { /* ... */ };
type MyContextValue = {
  state: MyState;
  doSomething: (arg: string) => void;
};

const STORAGE_KEY = "janet-my-feature";
const MyContext = createContext<MyContextValue | null>(null);

export function MyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MyState>(/* initial */);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setState(JSON.parse(stored));
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const doSomething = (arg: string) => { /* ... */ };

  return (
    <MyContext.Provider value={{ state, doSomething }}>
      {children}
    </MyContext.Provider>
  );
}

export function useMyFeature() {
  const ctx = useContext(MyContext);
  if (!ctx) throw new Error("useMyFeature must be used within MyProvider");
  return ctx;
}
```

Then add `<MyProvider>` to the provider tree in `app/layout.tsx`. Place it at the appropriate nesting level (inner providers can consume outer ones).

---

## 9. Escalation Routing (Complex System)

The escalation system is the most complex part of the codebase. It lives in `lib/escalations-context.tsx` (~1000 lines) and has its own cursor rule at `.cursor/rules/escalation-routing.mdc`.

**Routing pipeline (in order):**

1. **Label + property matching:** Find workforce members whose labels and property assignments overlap with the escalation. Among matches, prefer: available > highest label score > lowest workload.
2. **Explicit routing rules:** If no label match, evaluate rules from the Workforce Routing tab. Most-specific rule wins (most non-null conditions). Assignee pool is scored the same way.
3. If neither matches, the escalation stays unassigned.

**SLA enforcement:** Runs every 30 seconds in `applySlaChecks`. Only fires for items with `dueAt` in the past.

- Stage 0 → 1: After `reassignAfterMinutes`, try a peer reassignment.
- Stage 1+: After `escalateToManagerAfterMinutes`, walk the `reportsTo` chain to the manager.
- Ceiling: Stops if the next manager's tier exceeds `maxEscalationTier`.

See the cursor rule file for implementation gotchas and edge cases.

---

*Last updated: Feb 2026.*
