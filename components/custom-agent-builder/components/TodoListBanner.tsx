"use client";

import { useEffect, useState } from "react";
import { CheckSquare, ChevronDown, ChevronUp, ListChecks } from "lucide-react";

/**
 * Product / build-out todo list shown at the top of the Agent Builder
 * section. This is intentionally static content (not pulled from a store)
 * because the items being tracked are open design / security questions,
 * not user-facing work. The banner is dismiss-persisted per-browser so it
 * doesn't stay visible forever once the team has acknowledged it.
 *
 * Contents are curated by the product owner — edit `AGENT_BUILDER_TODOS`
 * below when priorities shift.
 */

type TodoKind =
  | "security"
  | "legal"
  | "compliance"
  | "naming"
  | "scope"
  | "telephony"
  | "escalation"
  | "conversational"
  | "marketplace"
  | "provisioning"
  | "versioning"
  | "entry-points"
  | "cost"
  | "system-agent"
  | "data-safety";

type TodoItem = {
  id: string;
  kind: TodoKind;
  text: string;
};

const AGENT_BUILDER_TODOS: ReadonlyArray<TodoItem> = Object.freeze([
  {
    id: "property-api-provisioning",
    kind: "provisioning",
    text:
      "Account for properties that are permissioned for the APIs the agent will call. APIs are provisioned per property — we should validate or guide authors so they do not ship an agent that fails at runtime because the target properties were never provisioned for the Entrata APIs the workflow uses.",
  },
  {
    id: "version-strategy",
    kind: "versioning",
    text:
      "Evaluate whether we want to support explicit versioning for custom agents or if authors should simply create a new agent or edit the existing one each time they want to make changes. The Versions tab is hidden from the UI pending this decision — if we keep versions, define the lifecycle (draft → dry-run → live) and per-property rollout UX; if we drop them, simplify the data model to a single mutable config.",
  },
  {
    id: "entry-point-api",
    kind: "entry-points",
    text:
      "Build the Platform API endpoint POST /v1/agents/{agentId}/run that the embeddable widget calls. The endpoint must: (1) validate the JWT signature and expiry, (2) check the agent:execute RBAC permission, (3) verify the agent is owned by the caller's CID, (4) confirm the agent is provisioned for the requested property, (5) audit-log the run with source=widget, originating module, user ID, and property ID. Until this endpoint exists, the widget renders a button but the actual execution is a no-op.",
  },
  {
    id: "entry-point-rbac",
    kind: "entry-points",
    text:
      "Create a new RBAC permission slug agent:execute (separate from agent_builder which controls authoring). This permission should be assignable per-role so property managers can run agents without being able to modify them. The widget checks this permission client-side for fast UX, but the API must enforce it server-side as the authoritative gate.",
  },
  {
    id: "entry-point-smarty-done",
    kind: "entry-points",
    text:
      "DONE — Smarty template includes are in place for all 13 supported modules (6 resident dashboards via dashboard.tpl, 3 general dashboards via dashboard2/general/dashboard.tpl, leasing center, maintenance work orders, utility dashboard, and pricing dashboard). The widget reads the entry-point registry from localStorage (published by the React Agent Builder) and renders Eli-style deploy buttons. When existing Eli deploy buttons are found on the page, custom agents are appended as additional dropdown items. Clicking a button navigates to OXP Studio — once the POST /v1/agents/{agentId}/run API is built, the widget will call it directly instead.",
  },
  {
    id: "db-safe-user",
    kind: "security",
    text:
      "Need to ensure the agent connects to the database for all data and skills using a user that cannot make malicious schema changes and only has access to do what the API already is able to do.",
  },
  {
    id: "rename-roster-to-lab",
    kind: "naming",
    text: "Probably need to rename Agent Roster to Agent Lab (not sure on this).",
  },
  {
    id: "disabled-tabs-review",
    kind: "scope",
    text:
      "Revisit the tabs we've temporarily commented out of the Agent Builder and decide whether to bring any back. Currently disabled: Prompt (merged into Name), Properties (already shown on the agent detail's Properties tab), Review, Cost & Dry-run, and Success.",
  },
  {
    id: "phone-number-selection",
    kind: "telephony",
    text:
      "Circle back on phone-number selection in the Communication tab. Decide whether the phone number field should be a dropdown of numbers the PMC already has reserved, offer to auto-procure a new number (with area-code selection and monthly cost shown), or both. Also define what happens when the agent is reassigned to a new property.",
  },
  {
    id: "l4-conversational-builder",
    kind: "conversational",
    text:
      "Evaluate how the Agent Builder should change for an L4 conversational agent (real back-and-forth with residents) vs. L1–L3 task automations. We need a way to explicitly designate an agent as conversational — and when we do, surface the fields that only matter there (turn-taking style, barge-in behavior, knowledge-base scope, refusal handling, tone calibration, multi-turn memory depth, hand-off script, etc.).",
  },
  {
    id: "external-data-and-tools",
    kind: "marketplace",
    text:
      "Decide how (and when) to let authors bring in external data sources and tools beyond the Entrata API catalog. Two directions to weigh: (1) a Tools / Integrations Marketplace where customers can plug in vetted third-party APIs — but we may want to hold this back until we have a marketplace story strong enough to differentiate us, and (2) a customer-owned Knowledge Base for uploading their own documents / URLs the agent can retrieve from (similar to ElevenLabs' knowledge base), which is lower risk and probably unlocks real value sooner.",
  },
  {
    id: "cost-display-decision",
    kind: "cost",
    text:
      "Confirm whether we want to display cost-per-run, cost-per-month, or both to the user in the agent builder. Need to decide the right level of cost transparency — showing per-run cost helps power users optimize, but monthly projections may be more actionable for most PMCs. Also decide if we want to show cost comparison between LLM models side-by-side.",
  },
  {
    id: "system-agent-replacement",
    kind: "system-agent",
    text:
      "Decide on the UX for allowing a PMC to replace one of Entrata's system L4 agents (Leasing AI, Maintenance AI, Renewals AI, etc.) with a custom agent they have built. Key questions: (1) Should this be an explicit 'Replace' action on the system agent detail page, or a setting in the custom agent's properties? (2) What happens to in-flight conversations when the swap happens? (3) Should we support per-property replacement (some properties use custom, others keep system)? (4) How do we handle rollback if the custom agent underperforms?",
  },
  {
    id: "nexus-tcpa-enforcement",
    kind: "legal",
    text:
      "TCPA enforcement integration — when an agent initiates SMS or AI voice calls, Nexus must verify consent status, opt-out status, message type classification, and quiet hours compliance before anything is sent. The TCPA guardrail declares intent but runtime enforcement must be handled by the Nexus integration layer. Define the handshake between Agent Builder and Nexus so that no outbound communication bypasses consent verification.",
  },
  {
    id: "ai-disclosure-enforcement",
    kind: "legal",
    text:
      "AI disclosure enforcement — the locked guardrail requires proactive AI identification at the start of initial interactions. Engineering must hardcode this introduction (similar to ELI+ approach) so it cannot be overridden by the agent\u2019s prompt or customer configuration. Confirm the exact disclosure language with legal and determine whether it varies by state or uses a single compliant-everywhere version.",
  },
  {
    id: "call-recording-enforcement",
    kind: "legal",
    text:
      "Call recording disclosure enforcement — when voice is enabled and calls are recorded, a static Entrata-controlled recording disclosure must play before conversation begins. This must not be customer-configurable. Confirm the disclosure language with legal, ensure it covers two-party consent states, and verify the technical integration with the telephony provider to inject the disclosure before the agent speaks.",
  },
  {
    id: "housing-decision-enforcement",
    kind: "compliance",
    text:
      "Housing decision enforcement — the locked guardrail prohibits autonomous housing decisions, but we need platform-level enforcement. Define which MCP tool combinations trigger housing-decision detection (e.g., applicant screening + status updates). When detected, the platform must enforce: (1) mandatory human review before action, (2) adverse action notice generation if applicable, (3) explainability documentation for audit trail, (4) compliance with local AI-in-housing-decisions laws.",
  },
  {
    id: "pricing-algorithm-enforcement",
    kind: "compliance",
    text:
      "Pricing algorithm enforcement — the locked guardrail prohibits rent optimization agents, but runtime enforcement is needed. Define detection heuristics for when an agent\u2019s prompt + tool access pattern resembles a pricing algorithm (e.g., using get_market_rent + create_renewal_offer to set rents programmatically). Consider blocking specific tool combinations or requiring legal team approval for agents that access pricing data and have write access to renewal offers.",
  },
  {
    id: "data-access-scope-review",
    kind: "data-safety",
    text:
      "Broader data safety review — legal raised concern about open-ended data access creating situations where customers use data in unintended ways (viewing sensitive resident/applicant data to take discriminatory action, accidental data disclosure, etc.). Evaluate: (1) Should certain MCP tools require elevated permissions beyond what Agent Builder grants? (2) Should we add data-sensitivity labels to MCP tools so authors understand what data they are granting access to? (3) Should agents accessing sensitive data (screening, financials, identity) require additional approval workflows or audit-enhanced logging?",
  },
  {
    id: "compliance-layer-architecture",
    kind: "compliance",
    text:
      "Compliance layer architecture — legal suggested that system-level guardrails should be a shared compliance layer that supports not just Agent Builder but also ELI+, and any other GenAI tool. Evaluate building a centralized compliance service that all AI products consume, rather than implementing guardrails independently in each product. This would ensure consistent enforcement and reduce the risk of gaps between products.",
  },
]);

const KIND_STYLE: Record<TodoKind, string> = {
  security: "bg-red-50 text-red-700 border-red-200",
  legal: "bg-red-100 text-red-800 border-red-300",
  compliance: "bg-orange-50 text-orange-700 border-orange-200",
  naming: "bg-amber-50 text-amber-800 border-amber-200",
  scope: "bg-slate-50 text-slate-700 border-slate-200",
  telephony: "bg-sky-50 text-sky-700 border-sky-200",
  escalation: "bg-orange-50 text-orange-800 border-orange-200",
  conversational: "bg-violet-50 text-violet-700 border-violet-200",
  marketplace: "bg-emerald-50 text-emerald-700 border-emerald-200",
  provisioning: "bg-teal-50 text-teal-800 border-teal-200",
  versioning: "bg-purple-50 text-purple-800 border-purple-200",
  "entry-points": "bg-indigo-50 text-indigo-800 border-indigo-200",
  cost: "bg-green-50 text-green-700 border-green-200",
  "system-agent": "bg-rose-50 text-rose-800 border-rose-200",
  "data-safety": "bg-yellow-50 text-yellow-800 border-yellow-200",
};

const KIND_LABEL: Record<TodoKind, string> = {
  security: "Security",
  legal: "Legal",
  compliance: "Compliance",
  naming: "Naming",
  scope: "Scope",
  telephony: "Telephony",
  escalation: "Escalation",
  conversational: "L4 conversational",
  marketplace: "Marketplace & KB",
  provisioning: "API provisioning",
  versioning: "Version strategy",
  "entry-points": "Entry points",
  cost: "Cost",
  "system-agent": "System agent",
  "data-safety": "Data safety",
};

const COLLAPSE_STORAGE_KEY = "oxp-agent-builder-todo-collapsed";

export function TodoListBanner() {
  const [collapsed, setCollapsed] = useState<boolean>(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
      if (raw === "1") setCollapsed(true);
    } catch {
      // ignore
    }
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <section
      className="mb-6 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 to-violet-50/80 px-4 py-3"
      aria-label="Agent Builder to-do list"
    >
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={!collapsed}
        aria-controls="agent-builder-todo-list"
      >
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-indigo-700" />
          <span className="text-sm font-semibold text-indigo-900">
            Agent Builder to-do
          </span>
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
            {AGENT_BUILDER_TODOS.length}
          </span>
        </div>
        <span className="flex items-center gap-1 text-[11px] text-indigo-700">
          {collapsed ? "Show" : "Hide"}
          {collapsed ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5" />
          )}
        </span>
      </button>

      {!collapsed && (
        <ul id="agent-builder-todo-list" className="mt-3 space-y-2">
          {AGENT_BUILDER_TODOS.map((todo) => (
            <li
              key={todo.id}
              className="flex items-start gap-2 rounded-lg border border-indigo-100 bg-white px-3 py-2"
            >
              <CheckSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-500" />
              <div className="min-w-0 flex-1">
                <span
                  className={`mr-2 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${KIND_STYLE[todo.kind]}`}
                >
                  {KIND_LABEL[todo.kind]}
                </span>
                <span className="text-[13px] leading-snug text-foreground">
                  {todo.text}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
