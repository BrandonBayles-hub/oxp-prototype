# POC to Production — Migration Guide

**Purpose:** Document exactly what is mocked in the OXP Studio, where the seams are, and how to replace mock data with real backends. This is the engineer's playbook for turning the navigable prototype into a production application.

**Prerequisite reading:** [CODEBASE-GUIDE.md](CODEBASE-GUIDE.md) for how the code is structured.

---

## 1. What's Mocked

The POC has **no backend, no database, no API calls, and no authentication**. All state lives in React context providers backed by `localStorage`. The table below maps every context to its data source and persistence.

| Context | localStorage key | What's in it | Seed data source | Persisted? |
|---|---|---|---|---|
| **Role** | none | Current role (`admin` default) | Hardcoded in `role-context.tsx` | Session only |
| **Setup** | `janet-poc-go-live` | Wizard step completion, goLiveComplete | Defaults (all false) | Yes |
| **Vault** | `janet-poc-vault` + 2 others | Documents, folders, approval queue, activity log | Hardcoded seeds in provider | Yes |
| **Agents** | `janet-poc-agents` | Agent configs, statuses, settings | Hardcoded seeds in provider | Yes |
| **Workforce** | `janet-poc-workforce-v3` | Org tree, members, teams, schedules, availability | Hardcoded seeds in provider | Yes |
| **Workflows** | `janet-poc-workflows` | Recipes, templates | Hardcoded seeds in provider | Yes |
| **Voice** | `janet-poc-voice` | Voice config, phrasing rules, channel settings | Hardcoded seeds in provider | Yes |
| **Escalations** | `janet-poc-routing-rules-v3` | Routing rules only; **escalation items are in-memory** | Hardcoded seeds; rules persisted | Partial |
| **Conversations** | none | Conversations, messages | Hardcoded seeds in provider | Session only |
| **Tools** | `janet-poc-tools-v2` | MCP tool configs, Entrata modules | Hardcoded seeds in provider | Yes |
| **Governance** | `janet-poc-governance-v2` | Guardrails, lifecycle stages, audit settings | Hardcoded seeds in provider | Yes |
| **Feedback** | `janet-poc-feedback` | Feedback items | Hardcoded seeds in provider | Yes |
| **Notifications** | none | Toast queue | Triggered by escalation events | Session only |

### Mock data file

`lib/mock-data.ts` exports `mockEscalations`, `mockAgentSections`, and `mockVaultDocs`. These are the original seeds from early POC development. Most contexts now carry their own richer seed data inline in the provider file.

---

## 2. Recommended API Integration Pattern

### Approach: Context providers as the integration layer

The cleanest migration path keeps the existing context provider pattern and swaps the data source **inside** each provider. Page components and shared components continue to call `use*()` hooks — they never know whether data comes from localStorage or a real API.

```
Before (POC):
  localStorage → useState → useEffect (hydrate/persist) → use* hook → component

After (production):
  API (fetch / SWR / TanStack Query) → useState → use* hook → component
```

### Step-by-step for each context

1. **Remove the localStorage hydration** (`useEffect` that reads from `localStorage`).
2. **Replace with an API fetch** on mount (or use SWR / TanStack Query for caching and revalidation).
3. **Remove the localStorage persistence** (`useEffect` that writes to `localStorage`).
4. **Add mutation functions** that call the API (POST/PUT/DELETE) and update local state on success.
5. **Keep the exported hook interface identical** so page code doesn't change.

### API route handlers

Next.js App Router supports API route handlers in `app/api/`. For the production backend, either:

- **Use `app/api/` route handlers** as a BFF (backend-for-frontend) that proxy to the real backend
- **Call the backend directly** from context providers (if CORS and auth allow it)
- **Use a data-fetching library** (SWR or TanStack Query) inside context providers for caching, deduplication, and revalidation

### Suggested data-fetching library

**TanStack Query** (React Query) is recommended over SWR for this codebase because:
- The app has many write operations (escalation assignment, agent config, document CRUD)
- TanStack Query has better mutation support with optimistic updates
- Cache invalidation is more granular

Install: `npm install @tanstack/react-query`

---

## 3. Context-by-Context Migration

### RoleProvider → Auth + RBAC

| Now | Production |
|---|---|
| In-memory `role` state, switchable via dropdown | Auth provider (NextAuth / Clerk / custom JWT) |
| `ALLOWED_ROUTES` hardcoded | Roles and permissions from user record / RBAC service |
| `ROLE_PROPERTIES` hardcoded | Property access from HRIS or assignment service |
| Role switcher in top nav | Remove switcher; role comes from authenticated session |

**Migration:** Replace `RoleProvider` internals with a session-based auth provider. Keep `isRouteAllowed` and `roleProperties` in the API surface so the rest of the app doesn't change. Add Next.js middleware for server-side route protection.

### SetupProvider → Onboarding API

| Now | Production |
|---|---|
| Step completion in localStorage | Onboarding progress stored server-side per org |
| `goLiveComplete` flag | Derived from org status in the backend |

**Migration:** Replace localStorage with API calls to an onboarding service. `goLiveComplete` should come from the org record.

### VaultProvider → Document API

| Now | Production |
|---|---|
| Documents, folders, approvals in localStorage | Document storage service (S3 + metadata DB) |
| File upload is mock (no real file handling) | Real upload to S3/GCS with metadata in DB |
| Entrata doc import is mock | Entrata API integration for document sync |

**Migration:** Build a document API (`app/api/documents/`). Upload to object storage, metadata to DB. Approval workflow becomes a real state machine. RAG search connects to a vector store.

### AgentsProvider → Agent Configuration API

| Now | Production |
|---|---|
| Agent configs in localStorage | Agent configuration service / DB |
| Agent status is static mock | Agent runtime reports real status |

**Migration:** Agent configs become DB records. Status comes from the agent runtime (active, error, training). The chat preview connects to a real LLM endpoint.

### WorkforceProvider → HRIS Integration

| Now | Production |
|---|---|
| Org tree hardcoded | HRIS sync (Workday, BambooHR, etc.) |
| Member availability is mock | Real availability from HRIS / scheduling system |

**Migration:** Import org structure from HRIS. Availability comes from the scheduling system. The routing labels stay as platform-managed metadata on top of HRIS data.

### WorkflowsProvider → Workato API

| Now | Production |
|---|---|
| Recipes in localStorage | Workato recipes via Workato API |
| Workato embed is a placeholder | Real Workato embedded iframe |

**Migration:** Use Workato's embedded integration API to render the real workflow builder. Recipe state comes from Workato. See [ENTRATA-AND-SOP-SOURCE-OF-TRUTH.md](../research/ENTRATA-AND-SOP-SOURCE-OF-TRUTH.md) for the Workato architecture.

### VoiceProvider → Voice Configuration API

| Now | Production |
|---|---|
| Voice settings in localStorage | Voice config service / DB |
| UI is feature-flagged off | Enable when voice stack is ready |

**Migration:** Build a voice configuration API. Connect to the voice stack (TDD §5.8) for telephony, STT/TTS. Per-property overrides and phrasing rules become DB records.

### EscalationsProvider → Escalation Service

| Now | Production |
|---|---|
| Escalation items in-memory (not persisted) | Escalation service / DB with real-time updates |
| Routing rules in localStorage | Routing rules in DB per org |
| SLA timer runs client-side (30s interval) | Server-side SLA enforcement |
| Routing depends on WorkforceProvider | Routing service reads org data from HRIS/workforce API |

**Migration:** This is the most complex migration. Build an escalation service that handles creation (from agent handoffs), routing, SLA enforcement, and status management. The 30-second client-side SLA timer must move server-side. Real-time updates via WebSocket or SSE for the dashboard.

### ConversationsProvider → Messaging Service

| Now | Production |
|---|---|
| Mock conversations, session-only | Real-time messaging service |
| No WebSocket | WebSocket / SSE for live updates |

**Migration:** Connect to the agent runtime's conversation stream. Staff messages go through the same channel. Live Conversations in Command Center becomes a real-time view.

### ToolsProvider → MCP Registry

| Now | Production |
|---|---|
| Tool configs in localStorage | MCP server registry / configuration service |

**Migration:** Connect to MCP server discovery (`list_tools()`). Tool enable/disable becomes real MCP configuration. See [ENTRATA-AND-SOP-SOURCE-OF-TRUTH.md](../research/ENTRATA-AND-SOP-SOURCE-OF-TRUTH.md) §8 for MCP architecture.

### GovernanceProvider → Governance Service

| Now | Production |
|---|---|
| Guardrail settings in localStorage | Governance configuration service / DB |
| Audit log is mock | Real audit events from agent runtime |
| UI is feature-flagged off | Enable when governance service is ready |

**Migration:** Build a governance API. Guardrails become enforceable rules in the agent runtime. Audit events stream from agent actions. Lifecycle management connects to agent deployment pipeline.

### FeedbackProvider → Feedback API

| Now | Production |
|---|---|
| Feedback items in localStorage | Feedback service / DB |

**Migration:** Feedback items come from agent interactions (thumbs up/down, corrections). Connect to the agent runtime's feedback loop.

### NotificationsProvider → Push Notifications

| Now | Production |
|---|---|
| In-memory toast queue | WebSocket / SSE push + toast |

**Migration:** Notifications triggered by server events (new escalation, SLA breach, agent error). Connect via WebSocket or SSE. Optionally add browser push notifications.

---

## 4. Feature Flags (Voice & Governance)

Voice and Governance pages show "Coming soon" messages, but the **full UI is already built** and wrapped in a feature flag:

```tsx
// In voice/page.tsx and governance/page.tsx:
{false && (
  // Full UI lives here — tabs, forms, tables, everything
)}
```

**To enable:** Change `false` to `true` (or replace with a real feature flag check). The UI will render immediately. Both pages are fully interactive with their respective context providers.

**Files:**
- `app/voice/page.tsx` — Voice configuration UI
- `app/governance/page.tsx` — Governance dashboard UI

---

## 5. Authentication

The POC has **no authentication**. Here's where it needs to go:

### Recommended approach

Use **NextAuth.js** (Auth.js) or a managed service (Clerk, Auth0) with the Next.js App Router:

1. **Add auth middleware** in `middleware.ts` at the project root to protect all routes server-side.
2. **Replace `RoleProvider`** internals to derive `role` and `roleProperties` from the authenticated user's session instead of in-memory state.
3. **Remove the role-switcher dropdown** from `EntrataTopNav` (it exists for POC demo purposes).
4. **Keep `isRouteAllowed`** — it still controls sidebar visibility and client-side route guarding. Feed it from the session.

### Where auth touches the codebase

| File | Current behavior | Production |
|---|---|---|
| `lib/role-context.tsx` | In-memory role, switcher | Session-derived role |
| `components/app-shell/entrata-top-nav.tsx` | Role dropdown | User name, avatar, logout |
| `components/route-guard.tsx` | Client-side redirect | Server middleware + client fallback |
| `app/layout.tsx` | `RoleProvider` wraps everything | Auth session provider wraps everything |

---

## 6. Entrata Integration

The POC has mock Entrata data (properties, units, connection status). Production needs:

1. **Entrata API client** — REST calls to Entrata's backend (PHP) for property data, resident data, work orders, leases, etc.
2. **MCP tools** — Platform MCP servers that wrap Entrata operations with governance and validation. See [ENTRATA-AND-SOP-SOURCE-OF-TRUTH.md](../research/ENTRATA-AND-SOP-SOURCE-OF-TRUTH.md) §8 for the full MCP architecture (layer diagram, server design, auth, rate limiting, data flow).
3. **Data sync** — Background jobs to sync property, unit, and resident data from Entrata into the platform's data layer.

The `SetupProvider` step 2 ("Connect Entrata") is where the Entrata connection is established. In production, this step would authenticate with Entrata's API and initiate the initial data sync.

---

## 7. Migration Priority

Suggested order based on dependency and user value:

| Priority | What | Why |
|---|---|---|
| 1 | Auth + RoleProvider | Everything depends on knowing who the user is |
| 2 | Entrata integration | Core data source for properties, residents, leases |
| 3 | VaultProvider → Document API | Agents need documents to function |
| 4 | AgentsProvider → Agent config API | Core value: AI agents |
| 5 | EscalationsProvider → Escalation service | Core workflow: human-AI handoff |
| 6 | ConversationsProvider → Messaging | Live interactions |
| 7 | WorkforceProvider → HRIS | Org structure for routing |
| 8 | WorkflowsProvider → Workato | Automation layer |
| 9 | FeedbackProvider → Feedback API | Improvement loop |
| 10 | ToolsProvider → MCP registry | Agent capabilities |
| 11 | GovernanceProvider → Governance service | Compliance layer |
| 12 | VoiceProvider → Voice config API | Enable Voice page |
| 13 | SetupProvider → Onboarding API | Can wait until multi-tenant |
| 14 | NotificationsProvider → Push | Nice-to-have |

---

*Last updated: Feb 2026.*
