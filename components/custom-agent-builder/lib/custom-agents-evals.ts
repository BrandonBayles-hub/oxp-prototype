import type { AgentVersion, EvalCase, ExpectedToolCall } from "./custom-agents-context";
import { SKILL_CATALOG } from "./custom-agents-catalog";

/* ═══════════════════════════════════════════════════════════════════════════
 * Types
 * ═══════════════════════════════════════════════════════════════════════════ */

export type TracedToolCall = {
  skillId: string;
  args: Record<string, string>;
  outcome: "blocked" | "simulated";
};

export type EvalRunResult = {
  caseId: string;
  passed: boolean;
  actualResponse: string;
  reasoning: string;
  latencyMs: number;
  scores?: {
    correctness?: number;
    completeness?: number;
    safety?: number;
    tone?: number;
  };
  /** Every tool the agent attempted — sandbox intercepted all writes. */
  actionTrace: TracedToolCall[];
  /** Per-assertion pass/fail for expected tool calls. */
  toolCallResults?: Array<{
    skillId: string;
    assertion: "call" | "must_not_call";
    passed: boolean;
    detail: string;
  }>;
  /** Where the grounding data came from for this run. */
  dataStrategyUsed: "none" | "inline" | "snapshot" | "fixture";
};

/* ═══════════════════════════════════════════════════════════════════════════
 * Public API
 * ═══════════════════════════════════════════════════════════════════════════ */

export async function runEvals(version: AgentVersion): Promise<EvalRunResult[]> {
  await new Promise((r) => setTimeout(r, 400));
  return version.evals.map((c) => runSingleEval(version, c));
}

/**
 * Generate a snapshot-style fixture from the agent's configured data sources.
 * Phase 5 will hit the real Entrata APIs in read-only mode and cache the
 * result. For now, we synthesize representative mock rows per data source.
 */
export function generateSnapshotFixture(
  dataSourceIds: string[]
): Record<string, unknown> {
  const fixture: Record<string, unknown> = {};
  for (const id of dataSourceIds) {
    fixture[id] = MOCK_DATA_GENERATORS[id]?.() ?? { _note: `Mock data for ${id}` };
  }
  return fixture;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Internals
 * ═══════════════════════════════════════════════════════════════════════════ */

function runSingleEval(version: AgentVersion, c: EvalCase): EvalRunResult {
  const expected = c.expected.toLowerCase();
  const dataStrategy = c.dataStrategy ?? "none";

  const groundingData = resolveGroundingData(version, c);
  const groundingStr = typeof groundingData === "string"
    ? groundingData
    : JSON.stringify(groundingData);

  const prompt = (
    version.prompt + "\n" + version.guardrails + "\n" + groundingStr
  ).toLowerCase();
  const input = c.input.toLowerCase();

  const keywords = expected
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));

  const covered = keywords.filter(
    (k) =>
      prompt.includes(k) ||
      skillsCoverKeyword(version, k) ||
      groundingStr.toLowerCase().includes(k)
  );
  const coverage = keywords.length === 0 ? 1 : covered.length / keywords.length;

  const negative = /\b(should not|shouldn['']t|never|avoid|do not|don['']t)\b/.test(expected);
  let responsePass = negative ? coverage < 0.4 : coverage >= 0.5;

  const actionTrace = simulateToolCalls(version, c, covered);
  const toolCallResults = validateToolCalls(actionTrace, c.expectedToolCalls ?? []);
  const toolsPass = toolCallResults.every((r) => r.passed);

  const passed = responsePass && toolsPass;

  const actualResponse = synthesizeResponse(version, c.input, covered, groundingStr);

  const parts: string[] = [];
  if (!responsePass) {
    parts.push(
      negative
        ? `Prompt includes language (${covered.slice(0, 3).join(", ")}) that conflicts with expectation.`
        : `Prompt/skills cover ${covered.length}/${keywords.length} key terms — likely miss.`
    );
  } else {
    parts.push(
      negative
        ? `Guardrails cover ${covered.length}/${keywords.length} key terms — no conflicting instructions.`
        : `Prompt/skills cover ${covered.length}/${keywords.length} key terms.`
    );
  }
  if (!toolsPass) {
    const failures = toolCallResults.filter((r) => !r.passed);
    parts.push(`Tool validation: ${failures.map((f) => f.detail).join("; ")}`);
  }
  if (actionTrace.length > 0) {
    const blocked = actionTrace.filter((t) => t.outcome === "blocked").length;
    parts.push(
      `Sandbox traced ${actionTrace.length} tool call(s)` +
      (blocked > 0 ? ` (${blocked} write(s) intercepted, no data saved).` : ".")
    );
  }

  const correctness = coverage;
  const completeness = Math.min(1, coverage + 0.1);
  const safety = negative && !responsePass ? 0.3 : 0.95;
  const tone = 0.85 + Math.random() * 0.15;

  return {
    caseId: c.id,
    passed,
    actualResponse,
    reasoning: parts.join(" "),
    latencyMs: 220 + Math.round(Math.random() * 380),
    scores: {
      correctness: Math.round(correctness * 100) / 100,
      completeness: Math.round(completeness * 100) / 100,
      safety: Math.round(safety * 100) / 100,
      tone: Math.round(tone * 100) / 100,
    },
    actionTrace,
    toolCallResults,
    dataStrategyUsed: dataStrategy,
  };
}

/* ── Grounding data resolution ── */

function resolveGroundingData(
  version: AgentVersion,
  c: EvalCase
): string | Record<string, unknown> {
  const strategy = c.dataStrategy ?? "none";
  switch (strategy) {
    case "inline":
      return c.context ?? "";
    case "fixture":
      return c.dataFixture ?? {};
    case "snapshot":
      return generateSnapshotFixture(version.dataIds);
    case "none":
    default:
      return c.context ?? "";
  }
}

/* ── Sandbox tool-call simulation ── */

/**
 * Simulate which tools the agent would invoke for this eval. In production
 * (Phase 5), the LLM orchestrator runs in sandbox mode where every write
 * API is intercepted — the call is recorded in the trace but the HTTP
 * request is never sent. Read-only calls return cached/mock data.
 *
 * For the prototype, we infer likely tool calls from the input + expected
 * behavior by matching against SKILL_CATALOG keywords.
 */
function simulateToolCalls(
  version: AgentVersion,
  c: EvalCase,
  coveredKeywords: string[]
): TracedToolCall[] {
  const trace: TracedToolCall[] = [];
  const combined = `${c.input} ${c.expected}`.toLowerCase();

  for (const skillId of version.skillIds) {
    const skill = SKILL_CATALOG.find((s) => s.id === skillId);
    if (!skill) continue;

    const match = skill.keywords.some((kw) => combined.includes(kw));
    if (!match && !coveredKeywords.some((k) => skill.keywords.some((kw) => kw.includes(k)))) {
      continue;
    }

    const isWrite = skill.requiresApproval ||
      ["send", "create", "post", "update", "close", "approve", "reject", "waive", "add"].some(
        (verb) => skill.id.includes(verb)
      );

    trace.push({
      skillId: skill.id,
      args: synthesizeArgs(skill.id, c),
      outcome: isWrite ? "blocked" : "simulated",
    });
  }

  return trace;
}

function synthesizeArgs(skillId: string, c: EvalCase): Record<string, string> {
  const args: Record<string, string> = {};
  if (skillId.includes("tour")) args.date = "2026-05-15";
  if (skillId.includes("email") || skillId.includes("sms")) {
    args.to = "resident@example.com";
    args.body = shorten(c.input, 80);
  }
  if (skillId.includes("work_order")) args.description = shorten(c.input, 80);
  if (skillId.includes("lead")) args.notes = shorten(c.expected, 80);
  return args;
}

/* ── Tool call assertion validation ── */

function validateToolCalls(
  trace: TracedToolCall[],
  expectations: ExpectedToolCall[]
): Array<{ skillId: string; assertion: "call" | "must_not_call"; passed: boolean; detail: string }> {
  return expectations.map((exp) => {
    const found = trace.find((t) => t.skillId === exp.skillId);
    if (exp.assertion === "call") {
      if (!found) {
        return {
          skillId: exp.skillId,
          assertion: exp.assertion,
          passed: false,
          detail: `Expected ${labelForSkill(exp.skillId)} to be called but it was not.`,
        };
      }
      if (exp.expectedArgs) {
        const mismatches = Object.entries(exp.expectedArgs).filter(
          ([k, v]) => found.args[k] !== v
        );
        if (mismatches.length > 0) {
          return {
            skillId: exp.skillId,
            assertion: exp.assertion,
            passed: false,
            detail: `${labelForSkill(exp.skillId)} called but args differ: ${mismatches.map(([k]) => k).join(", ")}.`,
          };
        }
      }
      return {
        skillId: exp.skillId,
        assertion: exp.assertion,
        passed: true,
        detail: `${labelForSkill(exp.skillId)} called as expected (${found.outcome}).`,
      };
    } else {
      return {
        skillId: exp.skillId,
        assertion: exp.assertion,
        passed: !found,
        detail: found
          ? `${labelForSkill(exp.skillId)} was called but should not have been.`
          : `${labelForSkill(exp.skillId)} correctly not called.`,
      };
    }
  });
}

function labelForSkill(id: string): string {
  return SKILL_CATALOG.find((s) => s.id === id)?.label ?? id;
}

/* ── Response synthesis ── */

function synthesizeResponse(
  version: AgentVersion,
  input: string,
  coveredKeywords: string[],
  groundingData: string,
): string {
  const first = version.communication.firstMessage;
  const intro = first && first.length < 120 ? first : "Thanks for reaching out —";
  if (coveredKeywords.length === 0) {
    return `${intro} I'm not sure I have enough information to answer "${shorten(input, 40)}". Let me connect you with a teammate.`;
  }
  const hasData = groundingData.length > 10;
  const dataNote = hasData ? " Using the provided data," : "";
  return `${intro}${dataNote} regarding "${shorten(input, 40)}" — based on our policies (${coveredKeywords.slice(0, 3).join(", ")}) here's what I can share...`;
}

function shorten(s: string, n = 60): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function skillsCoverKeyword(v: AgentVersion, kw: string): boolean {
  return v.skillIds.some((id) => id.toLowerCase().includes(kw));
}

/* ── Mock data generators (prototype; Phase 5 replaces with real API calls) ── */

const MOCK_DATA_GENERATORS: Record<string, () => unknown> = {
  "data.property_info": () => ({
    name: "Summit Park Apartments",
    address: "1200 Summit Park Dr, Denver, CO 80220",
    units: 186,
    officeHours: "Mon–Fri 9am–6pm, Sat 10am–4pm",
    phone: "(303) 555-0142",
    amenities: ["Pool", "Fitness center", "Clubhouse", "Dog park", "Package lockers"],
  }),
  "data.policies": () => ({
    petPolicy: { allowed: true, breeds: "No aggressive breeds (pit bull, rottweiler)", deposit: 300, monthlyRent: 35, limit: 2 },
    smokingPolicy: "Non-smoking community. Designated smoking areas in parking lot.",
    parkingPolicy: { covered: 75, garagePerMonth: 100, uncoveredFree: true },
    guestPolicy: "Guests may stay up to 14 consecutive days without prior approval.",
  }),
  "data.pricing_availability": () => ({
    floorplans: [
      { name: "The Alpine", beds: 1, baths: 1, sqft: 720, rent: 1450, available: 3, moveInDate: "2026-06-01" },
      { name: "The Summit", beds: 2, baths: 2, sqft: 1080, rent: 1895, available: 1, moveInDate: "2026-05-15" },
      { name: "The Ridge", beds: 3, baths: 2, sqft: 1340, rent: 2350, available: 0, moveInDate: null },
    ],
  }),
  "data.fee_schedule": () => ({
    adminFee: 250,
    applicationFee: 50,
    petDeposit: 300,
    petMonthly: 35,
    coveredParking: 100,
    lateFee: 75,
    nsf: 50,
    vcr: { label: "Vacant Cost Recovery", monthly: 42, description: "Utility recovery for vacant units." },
  }),
  "data.resident_profile": () => ({
    name: "Jane Doe",
    unit: "B-204",
    leaseStart: "2025-08-01",
    leaseEnd: "2026-07-31",
    balance: 0,
    pets: [{ type: "dog", breed: "Golden Retriever", name: "Cooper" }],
  }),
  "data.work_orders": () => ({
    open: [
      { id: "WO-4012", unit: "B-204", issue: "Garbage disposal jammed", status: "In Progress", created: "2026-04-25" },
    ],
    recent: [
      { id: "WO-3987", unit: "B-204", issue: "Bathroom faucet leak", status: "Completed", resolved: "2026-04-18" },
    ],
  }),
  "data.lead_profile": () => ({
    name: "Alex Rivera",
    email: "alex.rivera@example.com",
    phone: "(720) 555-0199",
    source: "Apartments.com",
    preferredBeds: 2,
    moveInWindow: "June 2026",
    tourScheduled: null,
    notes: "Interested in pet-friendly, ground-floor unit.",
  }),
  "data.tour_schedule": () => ({
    upcoming: [
      { date: "2026-05-01", time: "2:00 PM", lead: "Alex Rivera", floorplan: "The Summit" },
      { date: "2026-05-03", time: "10:30 AM", lead: "Chris Taylor", floorplan: "The Alpine" },
    ],
  }),
  "data.rent_roll": () => ({
    totalUnits: 186,
    occupied: 178,
    occupancyRate: 0.957,
    totalMonthlyRent: 312450,
    delinquent: 4,
    delinquentAmount: 6200,
  }),
  "data.comms_history": () => ({
    recentMessages: [
      { date: "2026-04-26", channel: "email", direction: "inbound", preview: "When will my garbage disposal be fixed?" },
      { date: "2026-04-25", channel: "email", direction: "outbound", preview: "We've submitted your work order and a technician..." },
    ],
  }),
};

const STOPWORDS = new Set<string>([
  "should", "would", "could", "state", "clearly", "that", "this", "with",
  "from", "into", "about", "there", "their", "they", "them", "than", "then",
  "will", "have", "does", "allow", "allows", "allowed", "start", "starts",
  "begin", "begins", "response", "responds", "responding", "say", "says",
  "saying", "include", "includes", "including", "provide", "provides",
  "providing", "ensure", "ensures", "ensuring",
]);
