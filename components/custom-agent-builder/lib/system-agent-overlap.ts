/**
 * Detect when a custom agent's prompt / Super Agent routing overlaps with
 * Entrata system agents (Leasing, Maintenance, Renewals, Payments AI).
 *
 * Keyword scan only produces *candidates*. UI warnings should call
 * `confirmSystemAgentOverlaps` so the LLM can reject false positives
 * (e.g. a move-in checklist agent that mentions "lease" but does not answer
 * Leasing AI questions).
 */

import { callClientLLM, isClientLLMConfigured } from "@/lib/llm-client";

export type SystemAgentDomain =
  | "leasing"
  | "maintenance"
  | "renewals"
  | "payments";

export type SystemAgentOverlap = {
  domain: SystemAgentDomain;
  systemAgentName: string;
  /** Short reason shown in the warning banner. */
  reason: string;
  /** Example resident questions that would hit this custom agent instead of the system agent. */
  exampleQuestions: string[];
};

const DOMAIN_DEFS: Array<{
  domain: SystemAgentDomain;
  systemAgentName: string;
  keywords: RegExp[];
  reason: string;
  exampleQuestions: string[];
}> = [
  {
    domain: "payments",
    systemAgentName: "Payments AI",
    keywords: [
      /\bbalance\b/i,
      /\bpayment(s)?\b/i,
      /\brent\s*(due|amount|payment)?\b/i,
      /\blate\s*fee/i,
      /\bdelinquen/i,
      /\bledger\b/i,
      /\bmake\s+a\s+payment\b/i,
      /\bpay\s+(my\s+)?rent\b/i,
      /\bautopay\b/i,
      /\bpayment\s+plan\b/i,
    ],
    reason:
      "This agent appears to handle balance or payment questions that Payments AI already covers for residents.",
    exampleQuestions: [
      "What's my current balance?",
      "How do I make a rent payment?",
      "Why was I charged a late fee?",
      "Can I set up a payment plan?",
    ],
  },
  {
    domain: "leasing",
    systemAgentName: "Leasing AI",
    keywords: [
      /\bleasing\b/i,
      /\btour(s)?\b/i,
      /\bavailability\b/i,
      /\bavailable\s+(unit|apartment|floor\s*plan)/i,
      /\bfloor\s*plan/i,
      /\bprospect\b/i,
      /\blead\b/i,
      /\bschedule\s+(a\s+)?(tour|showing|visit)/i,
      /\bapplication\b/i,
      /\bmove[\s-]?in\s+(special|date|process)/i,
      /\bunit\s+availability\b/i,
    ],
    reason:
      "This agent appears to answer leasing, tour scheduling, or availability questions that Leasing AI already covers.",
    exampleQuestions: [
      "Do you have any 2-bedrooms available?",
      "Can I schedule a tour this weekend?",
      "What's the rent on the A1 floor plan?",
      "How do I start an application?",
    ],
  },
  {
    domain: "maintenance",
    systemAgentName: "Maintenance AI",
    keywords: [
      /\bmaintenance\b/i,
      /\bwork\s*order/i,
      /\brepair\b/i,
      /\bservice\s+request/i,
      /\bmaintenance\s+request/i,
      /\bbroken\b/i,
      /\bhvac\b/i,
      /\bplumbing\b/i,
      /\blockout\b/i,
      /\bmake[\s-]?ready\b/i,
    ],
    reason:
      "This agent appears to handle maintenance or work-order questions that Maintenance AI already covers.",
    exampleQuestions: [
      "My AC isn't working — can you put in a work order?",
      "What's the status of my maintenance request?",
      "Who do I call for a lockout?",
      "The dishwasher is leaking.",
    ],
  },
  {
    domain: "renewals",
    systemAgentName: "Renewals AI",
    keywords: [
      /\brenewal(s)?\b/i,
      /\brenew\s+(my\s+)?lease\b/i,
      /\blease\s+renewal\b/i,
      /\brenewal\s+offer\b/i,
      /\baccept\s+(the\s+)?renewal\b/i,
      /\brenewal\s+(rate|pricing|notice)\b/i,
      /\blease\s+expir/i,
    ],
    reason:
      "This agent appears to handle renewals or renewal-offer questions that Renewals AI already covers.",
    exampleQuestions: [
      "What's my renewal offer?",
      "Can I accept my renewal online?",
      "When does my lease expire?",
      "Is there a special if I renew early?",
    ],
  },
];

function haystackFrom(
  prompt: string,
  superAgentDescription?: string,
  superAgentRoutingHints?: string,
): string {
  return [prompt, superAgentDescription ?? "", superAgentRoutingHints ?? ""]
    .join("\n")
    .trim();
}

/**
 * Cheap keyword scan — candidates only. Prefer `confirmSystemAgentOverlaps`
 * before showing warnings in the UI.
 */
export function detectSystemAgentOverlap(
  prompt: string,
  superAgentDescription?: string,
  superAgentRoutingHints?: string,
): SystemAgentOverlap[] {
  const haystack = haystackFrom(prompt, superAgentDescription, superAgentRoutingHints);
  if (!haystack) return [];

  const hits: SystemAgentOverlap[] = [];
  for (const def of DOMAIN_DEFS) {
    const matchCount = def.keywords.filter((re) => re.test(haystack)).length;
    if (matchCount === 0) continue;
    hits.push({
      domain: def.domain,
      systemAgentName: def.systemAgentName,
      reason: def.reason,
      exampleQuestions: def.exampleQuestions,
    });
  }
  return hits;
}

/**
 * Without an LLM, only keep domains with multiple independent keyword hits.
 * Single-keyword hits (e.g. "application" in a checklist agent) are too noisy.
 */
export function strongKeywordOverlaps(candidates: SystemAgentOverlap[], haystack: string): SystemAgentOverlap[] {
  return candidates.filter((c) => {
    const def = DOMAIN_DEFS.find((d) => d.domain === c.domain);
    if (!def) return false;
    return def.keywords.filter((re) => re.test(haystack)).length >= 2;
  });
}

/**
 * Ask the LLM which candidate system-agent overlaps are real conflicts
 * (resident questions that Super Agent might mis-route). Returns [] when
 * there is no real overlap.
 */
export async function confirmSystemAgentOverlaps(
  prompt: string,
  superAgentDescription?: string,
  superAgentRoutingHints?: string,
): Promise<SystemAgentOverlap[]> {
  const haystack = haystackFrom(prompt, superAgentDescription, superAgentRoutingHints);
  if (!haystack) return [];

  const candidates = detectSystemAgentOverlap(prompt, superAgentDescription, superAgentRoutingHints);
  if (candidates.length === 0) return [];

  if (!isClientLLMConfigured()) {
    return strongKeywordOverlaps(candidates, haystack);
  }

  try {
    const result = await callClientLLM(
      [
        {
          role: "system",
          content: `You decide whether a custom Entrata agent truly conflicts with system agents that residents already talk to.

System agents and what they own:
- leasing / Leasing AI: tours, availability, floor plans, prospects/leads, starting applications, unit pricing questions
- maintenance / Maintenance AI: work orders, repairs, lockouts, service requests
- renewals / Renewals AI: renewal offers, accepting renewals, lease expiration / renewal pricing
- payments / Payments AI: balance, making rent payments, late fees, autopay, payment plans

A REAL overlap means Super Agent could send a resident's conversational question to this custom agent INSTEAD of the system agent.

NOT overlap (return empty domains):
- Back-office / scheduled / staff workflow agents (checklists, batch jobs, ops coordination)
- Agents that only mention domain words (lease, application, move-in) while doing a different job
- Agents that escalate TO a system topic but do not answer those questions themselves

Return JSON only:
{ "domains": ["leasing"|"maintenance"|"renewals"|"payments"], "reasons": { "<domain>": "one sentence" } }
Use only domains from the candidate list. If none truly overlap, return { "domains": [], "reasons": {} }.`,
        },
        {
          role: "user",
          content: `Candidate domains: ${candidates.map((c) => c.domain).join(", ")}

Super Agent description:
${superAgentDescription ?? "(none)"}

Routing hints:
${superAgentRoutingHints ?? "(none)"}

Custom agent prompt:
${prompt.slice(0, 6000)}`,
        },
      ],
      { temperature: 0, maxTokens: 400 },
    );

    const parsed = JSON.parse(result.content.match(/\{[\s\S]*\}/)?.[0] ?? result.content) as {
      domains?: string[];
      reasons?: Record<string, string>;
    };
    const allowed = new Set((parsed.domains ?? []).map((d) => d.toLowerCase()));
    return candidates
      .filter((c) => allowed.has(c.domain))
      .map((c) => ({
        ...c,
        reason: parsed.reasons?.[c.domain]?.trim() || c.reason,
      }));
  } catch (err) {
    console.error("System agent overlap LLM confirm failed:", err);
    return strongKeywordOverlaps(candidates, haystack);
  }
}

export type DelegationDraft = {
  superAgentDescription: string;
  superAgentRoutingHints: string;
};

/** Local fallback when the LLM isn't available. */
export function buildDelegationDraftLocally(
  name: string,
  prompt: string,
): DelegationDraft {
  const trimmed = prompt.trim().replace(/\s+/g, " ");
  const snippet = trimmed.length > 280 ? `${trimmed.slice(0, 277)}…` : trimmed;
  const description =
    snippet.length > 0
      ? `${name} handles: ${snippet}`
      : `${name} is a custom Entrata agent. Route resident questions that match this agent's specialty here.`;

  const words = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .slice(0, 12);
  const hints = Array.from(new Set([name.toLowerCase(), ...words])).join(", ");

  return {
    superAgentDescription: description,
    superAgentRoutingHints: hints,
  };
}
