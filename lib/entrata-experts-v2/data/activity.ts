import type {
  Conversation,
  Message,
  AssistantMessage,
  IntentCluster,
  KnowledgeGap,
  AutomationCandidate,
  RoleId,
  LensId,
} from "../types";
import { EMPLOYEES } from "./employees";
import { compose, INTENTS } from "./answers";
import { LENS_BY_ID } from "../lenses";
import { seededRandom } from "../format";

const NOW = new Date("2026-04-28T13:00:00Z");

const PROMPTS_BY_INTENT: Record<string, string[]> = {
  delinquency: [
    "Why is delinquency up at Tampa Bay?",
    "Who is behind on rent across my region?",
    "Show me past-due residents over 30 days",
    "Delinquency by aging bucket for my property",
    "How much rent is unpaid in the Southeast right now?",
    "What's the delinquency trend the last 3 weeks?",
  ],
  occupancy: [
    "What's our occupancy?",
    "How full are we at LoHi?",
    "Show vacancy by property",
    "Are we losing residents at Cat Quarter?",
    "Occupancy trend last 30 days",
  ],
  "noi-variance": [
    "Where are we vs. budget on NOI?",
    "Which property is dragging on NOI?",
    "Show NOI per unit vs. underwriting",
    "Variance to budget for the portfolio",
    "Why is Tampa Bay below budget?",
  ],
  "leasing-pace": [
    "How is leasing pacing this week?",
    "Show me the leasing funnel",
    "Apps and tours week to date",
    "How many leases did we sign this week?",
    "Which property is leading on leases?",
  ],
  renewals: [
    "How are renewals going?",
    "Renewal acceptance trend",
    "Why is acceptance low at Tampa Bay?",
    "Compare student vs. conventional renewals",
    "Show me offers expiring this week",
  ],
  "maintenance-status": [
    "What's the work order picture?",
    "Show me MTTR by property",
    "Which property has the slowest turn time?",
    "How many WOs did Maintenance AI handle this weekend?",
    "After-hours dispatch volume",
  ],
  "ap-anomaly": [
    "Any AP anomalies this month?",
    "Show invoices flagged for review",
    "Vendors trending up >10%",
    "GL coding mismatches this week",
    "Top vendor anomalies in the Southeast",
  ],
  "online-pay": [
    "How is online payment adoption?",
    "Online pay adoption by property",
    "Where is autopay weakest?",
    "Compare online pay student vs. conventional",
  ],
  outliers: [
    "Which properties need attention?",
    "Show me red-flagged properties",
    "Anything tripping thresholds today?",
    "Outlier list for Monday review",
  ],
  "weekend-summary": [
    "What happened over the weekend?",
    "Catch me up on this morning",
    "What did the agents do overnight?",
    "Anything I need to know from yesterday?",
  ],
};

const GAP_PROMPTS: { q: string; reason: KnowledgeGap["reason"] }[] = [
  { q: "What's the resident name behind the maintenance escalation at LoHi?", reason: "refused" },
  { q: "Pull every resident's email at Cat Quarter for a renewal blast", reason: "refused" },
  { q: "Why does the variance report show different numbers than my GL?", reason: "low-confidence" },
  { q: "Can you forecast Q3 occupancy for the Southeast?", reason: "low-confidence" },
  { q: "Show me lease violations grouped by property and severity", reason: "thumbs-down" },
  { q: "Generate a board deck for tomorrow's owner meeting", reason: "escalated" },
  { q: "What's the cap rate I should use for the Charlotte refi?", reason: "refused" },
];

const GAP_FIXES: Record<KnowledgeGap["reason"], string> = {
  refused: "Out-of-scope by policy. Either escalate to OXP Studio (custom agent w/ PII access) or update the policy to allow aggregated PII redaction.",
  "low-confidence": "Add the underlying source (variance bridge / forecasting model) to the knowledge graph. Until then, surface a 'beta' badge on this answer.",
  "thumbs-down": "Recurring negative rating — review the answer template, add a missing dimension (severity), and re-run the eval suite.",
  escalated: "Recurring escalation — promote to a real workflow in OXP Studio with template + reviewer assignment.",
};

const DOWNRATE_PROBABILITY: Partial<Record<string, number>> = {
  "noi-variance": 0.08,
  renewals: 0.06,
  outliers: 0.04,
};

function buildConversation(
  rand: () => number,
  i: number,
  date: Date,
  authorId: string,
  intentId: string,
  promptOverride?: string,
  forcedOutcome?: AssistantMessage["outcome"],
): Conversation {
  const intent = INTENTS.find((x) => x.id === intentId)!;
  const author = EMPLOYEES.find((e) => e.id === authorId)!;
  const prompts = PROMPTS_BY_INTENT[intentId] ?? [intent.label];
  const prompt = promptOverride ?? prompts[Math.floor(rand() * prompts.length)];

  const scopeId =
    author.role === "onsite-pm" && author.property
      ? author.property
      : author.role === "regional" && author.region
      ? author.region
      : "portfolio";
  const scopeLabel =
    scopeId === "portfolio"
      ? "Whole portfolio"
      : scopeId === "southeast"
      ? "Southeast region"
      : scopeId === "mountain-west"
      ? "Mountain West region"
      : `${scopeId.replace("wb-", "").replace(/-/g, " ")}`;

  const lens: LensId = rand() > 0.6 ? intent.lens : "auto";
  const depth = rand() > 0.85 ? "reasoning" : rand() > 0.6 ? "auto" : "fast";

  const r = rand();
  const model: "auto" | "opus-4-7" | "gpt-5-5" | "kimi-k2-5" | "entrata-tuned" =
    r < 0.55 ? "auto"
    : r < 0.75 ? "entrata-tuned"
    : r < 0.85 ? "opus-4-7"
    : r < 0.93 ? "gpt-5-5"
    : "kimi-k2-5";

  const composed = compose({
    prompt,
    lens,
    depth,
    scope: { kind: scopeId === "portfolio" ? "portfolio" : scopeId.includes("-") && scopeId.length < 16 ? "region" : "property", id: scopeId, label: scopeLabel },
  });

  const userMsgDate = new Date(date.getTime() + Math.floor(rand() * 60 * 60 * 1000));
  const assistantMsgDate = new Date(userMsgDate.getTime() + 1500 + Math.floor(rand() * 5000));

  let assistantMsg: AssistantMessage = {
    ...composed.message,
    id: `m-a-${i}`,
    model,
    createdAt: assistantMsgDate.toISOString(),
  };

  if (forcedOutcome) assistantMsg = { ...assistantMsg, outcome: forcedOutcome, confidence: forcedOutcome === "answered" ? "high" : "low" };

  const downRate = DOWNRATE_PROBABILITY[intentId] ?? 0.03;
  if (rand() < 0.18) assistantMsg.rating = "up";
  else if (rand() < downRate) assistantMsg.rating = "down";

  const messages: Message[] = [
    { id: `m-u-${i}`, role: "user", body: prompt, createdAt: userMsgDate.toISOString() },
    assistantMsg,
  ];

  return {
    id: `conv-${i}`,
    title: prompt.length > 60 ? prompt.slice(0, 57) + "..." : prompt,
    userId: authorId,
    messages,
    createdAt: userMsgDate.toISOString(),
    updatedAt: assistantMsgDate.toISOString(),
    intent: composed.intentId,
    lens: assistantMsg.lens,
  };
}

export function generateActivity(): Conversation[] {
  const rand = seededRandom(20260428);
  const out: Conversation[] = [];
  let i = 0;

  for (let dayOffset = 14; dayOffset >= 0; dayOffset--) {
    const day = new Date(NOW);
    day.setDate(day.getDate() - dayOffset);
    day.setHours(7 + Math.floor(rand() * 3), 0, 0, 0);

    const isWeekend = [0, 6].includes(day.getDay());
    const targetCount = isWeekend ? 2 : 6 + Math.floor(rand() * 3);

    for (let q = 0; q < targetCount; q++) {
      const employee = EMPLOYEES[Math.floor(rand() * EMPLOYEES.length)];

      let intentPool: string[];
      switch (employee.role) {
        case "vp-ops":
          intentPool = ["weekend-summary", "outliers", "noi-variance", "delinquency", "renewals", "occupancy"];
          break;
        case "regional":
          intentPool = ["leasing-pace", "delinquency", "outliers", "maintenance-status", "renewals", "occupancy"];
          break;
        case "onsite-pm":
          intentPool = ["leasing-pace", "maintenance-status", "delinquency", "occupancy", "online-pay", "ap-anomaly"];
          break;
        case "asset-mgr":
          intentPool = ["noi-variance", "outliers", "renewals", "occupancy"];
          break;
        case "accounting":
          intentPool = ["ap-anomaly", "online-pay", "delinquency"];
          break;
      }
      const intentId = intentPool[Math.floor(rand() * intentPool.length)];

      out.push(buildConversation(rand, ++i, day, employee.id, intentId));
    }

    if (rand() < 0.35) {
      const gap = GAP_PROMPTS[Math.floor(rand() * GAP_PROMPTS.length)];
      const employee = EMPLOYEES[Math.floor(rand() * EMPLOYEES.length)];
      const baseIntent = "weekend-summary";
      const conv = buildConversation(rand, ++i, day, employee.id, baseIntent, gap.q,
        gap.reason === "refused" ? "refused"
        : gap.reason === "low-confidence" ? "low-confidence"
        : gap.reason === "escalated" ? "escalated"
        : "answered",
      );
      if (gap.reason === "thumbs-down") {
        const a = conv.messages[1] as AssistantMessage;
        a.rating = "down";
      }
      if (gap.reason === "refused") {
        conv.intent = "refused";
      }
      out.push(conv);
    }
  }

  return out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function buildClusters(convs: Conversation[]): IntentCluster[] {
  const byIntent = new Map<string, Conversation[]>();
  convs.forEach((c) => {
    const list = byIntent.get(c.intent) ?? [];
    list.push(c);
    byIntent.set(c.intent, list);
  });

  return Array.from(byIntent.entries())
    .filter(([id]) => id !== "refused")
    .map(([id, list]) => {
      const intent = INTENTS.find((x) => x.id === id);
      const askers = new Set(list.map((c) => c.userId)).size;
      const answered = list.filter((c) => {
        const a = c.messages[1] as AssistantMessage | undefined;
        return a?.outcome === "answered";
      }).length;
      const downvotes = list.filter((c) => (c.messages[1] as AssistantMessage)?.rating === "down").length;
      const lensCounts = new Map<LensId, number>();
      list.forEach((c) => lensCounts.set(c.lens, (lensCounts.get(c.lens) ?? 0) + 1));
      const topLens = Array.from(lensCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "auto";
      const examples = Array.from(new Set(list.map((c) => c.messages[0].body))).slice(0, 4);

      return {
        intent: id,
        label: intent?.label ?? id,
        description: intent?.description ?? "",
        count: list.length,
        distinctAskers: askers,
        exampleQuestions: examples,
        topLens,
        deflectionPct: list.length === 0 ? 0 : (answered / list.length) * 100,
        rating: (downvotes > 1 ? "warn" : "good") as "good" | "warn" | "alert",
        automationScore: Math.min(
          100,
          Math.round(
            list.length * 6 + askers * 8 + (id === "outliers" ? 15 : 0) + (id === "weekend-summary" ? 18 : 0),
          ),
        ),
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function buildGaps(convs: Conversation[]): KnowledgeGap[] {
  const lowConfOrRefusedOrDown = convs.filter((c) => {
    const a = c.messages[1] as AssistantMessage | undefined;
    return a && (a.outcome !== "answered" || a.rating === "down");
  });

  const byQuestion = new Map<string, Conversation[]>();
  lowConfOrRefusedOrDown.forEach((c) => {
    const key = c.messages[0].body.toLowerCase().slice(0, 80);
    const list = byQuestion.get(key) ?? [];
    list.push(c);
    byQuestion.set(key, list);
  });

  return Array.from(byQuestion.values())
    .filter((list) => list.length > 0)
    .map((list, idx) => {
      const rep = list[0];
      const a = rep.messages[1] as AssistantMessage;
      const reason: KnowledgeGap["reason"] =
        a.outcome === "refused" ? "refused"
        : a.outcome === "low-confidence" ? "low-confidence"
        : a.outcome === "escalated" ? "escalated"
        : "thumbs-down";
      const askers = Array.from(new Set(list.map((c) => c.userId)));
      const askerNames = askers.slice(0, 3)
        .map((id) => EMPLOYEES.find((e) => e.id === id)?.name ?? id);
      const roles = Array.from(new Set(askers.map((id) => EMPLOYEES.find((e) => e.id === id)?.role).filter(Boolean) as RoleId[]));

      return {
        id: `gap-${idx + 1}`,
        question: rep.messages[0].body,
        count: list.length,
        reason,
        suggestedFix: GAP_FIXES[reason],
        affectedRoles: roles,
        exampleAskers: askerNames,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export function buildAutomationCandidates(
  _convs: Conversation[],
  clusters: IntentCluster[],
): AutomationCandidate[] {
  return clusters
    .filter((c) => c.automationScore >= 50)
    .slice(0, 6)
    .map((c, idx) => {
      const isDigest = c.intent === "weekend-summary" || c.intent === "outliers";
      const graduateTo: AutomationCandidate["graduateTo"] = isDigest ? "scheduled-digest" : c.automationScore > 75 ? "saved-insight" : "l3-agent";
      const graduateLabel =
        graduateTo === "scheduled-digest"
          ? "Schedule as Monday 7am digest"
          : graduateTo === "saved-insight"
          ? "Promote to a Saved Insight (1-click rerun)"
          : "Send to OXP Studio as an L3 agent draft";

      const example = c.exampleQuestions[0] ?? c.label;

      return {
        id: `auto-${idx + 1}`,
        pattern: c.label,
        count: c.count,
        distinctAskers: c.distinctAskers,
        estTimeSavedHrs: Math.round(c.count * (isDigest ? 0.4 : 0.18) * 10) / 10,
        graduateTo,
        graduateLabel,
        example,
      };
    });
}

export function summaryStats(convs: Conversation[]) {
  const sevenDaysAgo = new Date(NOW.getTime() - 7 * 24 * 3600 * 1000);
  const recent = convs.filter((c) => new Date(c.createdAt) > sevenDaysAgo);
  const askers = new Set(recent.map((c) => c.userId));
  const answered = recent.filter((c) => (c.messages[1] as AssistantMessage)?.outcome === "answered").length;
  const lensCounts = new Map<LensId, number>();
  recent.forEach((c) => lensCounts.set(c.lens, (lensCounts.get(c.lens) ?? 0) + 1));
  const topLenses = Array.from(lensCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([lens, count]) => ({ lens, count, label: LENS_BY_ID[lens]?.label ?? lens }));

  return {
    questions7d: recent.length,
    activeEmployees7d: askers.size,
    deflectionPct: recent.length === 0 ? 0 : (answered / recent.length) * 100,
    topLenses,
  };
}
