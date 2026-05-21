// Generates ~80 multi-turn sessions across 14 days. Each session is a
// `Conversation` with N user→assistant turns. The mix is realistic: most asks
// are single-turn, but some are deep investigations that span 4-7 turns and
// may pivot lenses or scopes. Session-level rollups (turnCount, durationMs,
// resolution, lensesUsed, etc.) are computed at generation time so the
// Activity Log can render without re-walking messages.

import type {
  Conversation,
  Message,
  AssistantMessage,
  IntentCluster,
  KnowledgeGap,
  AutomationCandidate,
  Resolution,
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

// ---------------------------------------------------------------------------
// Session-shape distribution
// ---------------------------------------------------------------------------
// Realistic spread of turns per session. Drawn from chat-product analytics
// patterns (Sierra/Fin/Decagon all show heavy 1-turn skew with long tail).
//
//   1 turn   →  60%  (quick lookup, weekend-summary, "what's our occupancy")
//   2-3      →  25%  (one follow-up, "and at Tampa?")
//   4-6      →  12%  (real investigation: pivot scope, pivot lens, drill in)
//   7+       →   3%  (deep dive: 8-10 turn forensic thread)
function pickTurnCount(rand: () => number): number {
  const r = rand();
  if (r < 0.60) return 1;
  if (r < 0.85) return 2 + Math.floor(rand() * 2);
  if (r < 0.97) return 4 + Math.floor(rand() * 3);
  return 7 + Math.floor(rand() * 3);
}

// Hand-curated follow-up patterns. When a session has more than 1 turn, the
// follow-ups are picked from this pool. Keeps demo data feeling like real
// chat threads rather than 5 disconnected questions in a row.
const FOLLOWUPS_BY_INTENT: Record<string, string[]> = {
  delinquency: [
    "Show me just the >30 day bucket",
    "Which property is dragging?",
    "Compare to last month",
    "What's our auto-pay penetration there?",
    "Send a reminder to the top 5",
  ],
  occupancy: [
    "Break that down by property",
    "What about student properties only?",
    "How does that compare to last year?",
    "Which property is leaking residents?",
  ],
  "noi-variance": [
    "Drill into Tampa Bay",
    "Is it on the revenue or expense side?",
    "Which line item is biggest?",
    "Show me last 90 days trend",
  ],
  "leasing-pace": [
    "Property-level breakdown",
    "What's the conversion rate?",
    "Are tours up or down?",
    "Compare to last week",
    "Why is Tampa Bay low?",
  ],
  renewals: [
    "Why is acceptance low at Tampa Bay?",
    "Compare student vs. conventional",
    "Show me the ones expiring next week",
    "What's our offer ratio?",
    "Send the at-risk list",
  ],
  "maintenance-status": [
    "Which property has slowest MTTR?",
    "Break out emergency vs. routine",
    "How many did the AI close?",
    "After-hours volume?",
  ],
  "ap-anomaly": [
    "Show me the top 3",
    "Which vendor?",
    "Compare to last month",
    "Flag for review",
  ],
  "online-pay": [
    "Where is autopay weakest?",
    "Compare student vs. conventional",
    "What's our current rate?",
    "Which property to focus on?",
  ],
  outliers: [
    "Tell me more about the top one",
    "Which threshold tripped?",
    "What changed?",
    "Send to the regional",
  ],
  "weekend-summary": [
    "What about this morning specifically?",
    "Anything overnight?",
    "What did the agents handle?",
    "Anything I should escalate?",
  ],
};

function pickFollowUp(rand: () => number, intentId: string, used: Set<string>): string {
  const pool = FOLLOWUPS_BY_INTENT[intentId] ?? [];
  const fresh = pool.filter((p) => !used.has(p));
  if (fresh.length === 0) return pool[Math.floor(rand() * Math.max(pool.length, 1))] ?? "Tell me more";
  return fresh[Math.floor(rand() * fresh.length)];
}

function defaultScopeForAuthor(authorId: string): { id: string; label: string; kind: "portfolio" | "region" | "property" } {
  const author = EMPLOYEES.find((e) => e.id === authorId)!;
  if (author.role === "onsite-pm" && author.property) {
    return { id: author.property, label: author.property.replace("wb-", "").replace(/-/g, " "), kind: "property" };
  }
  if (author.role === "regional" && author.region) {
    return {
      id: author.region,
      label:
        author.region === "southeast"
          ? "Southeast region"
          : author.region === "mountain-west"
          ? "Mountain West region"
          : author.region,
      kind: "region",
    };
  }
  return { id: "portfolio", label: "Whole portfolio", kind: "portfolio" };
}

function pickModel(rand: () => number) {
  const r = rand();
  if (r < 0.55) return "auto" as const;
  if (r < 0.75) return "entrata-tuned" as const;
  if (r < 0.85) return "opus-4-7" as const;
  if (r < 0.93) return "gpt-5-5" as const;
  return "kimi-k2-5" as const;
}

/**
 * Build a multi-turn session. Each turn is a (user prompt → assistant reply)
 * pair. Turns share the same author and scope by default, but the user may
 * pivot lens/scope on later turns to simulate real investigation behavior.
 */
function buildSession(
  rand: () => number,
  i: number,
  date: Date,
  authorId: string,
  intentId: string,
  promptOverride?: string,
  forcedOutcome?: AssistantMessage["outcome"],
  forcedTurnCount?: number,
): Conversation {
  const intent = INTENTS.find((x) => x.id === intentId)!;
  const prompts = PROMPTS_BY_INTENT[intentId] ?? [intent.label];
  const firstPrompt = promptOverride ?? prompts[Math.floor(rand() * prompts.length)];

  const turnCount = forcedTurnCount ?? pickTurnCount(rand);
  const scope = defaultScopeForAuthor(authorId);
  const model = pickModel(rand);

  const messages: Message[] = [];
  const lensesUsed: LensId[] = [];
  const scopesUsed: string[] = [scope.label];
  const usedFollowUps = new Set<string>();
  let everDownvoted = false;
  let everRefused = false;
  let everEscalated = false;
  let firstRating: "up" | "down" | undefined;
  let finalRating: "up" | "down" | undefined;

  const sessionStart = new Date(date.getTime() + Math.floor(rand() * 60 * 60 * 1000));
  let cursor = sessionStart;

  for (let t = 0; t < turnCount; t++) {
    const isFirstTurn = t === 0;
    const prompt = isFirstTurn ? firstPrompt : pickFollowUp(rand, intentId, usedFollowUps);
    if (!isFirstTurn) usedFollowUps.add(prompt);

    const lens: LensId = rand() > 0.6 ? intent.lens : "auto";
    const depth = rand() > 0.85 ? "reasoning" : rand() > 0.6 ? "auto" : "fast";

    const composed = compose({
      prompt,
      lens,
      depth,
      scope: { kind: scope.kind, id: scope.id, label: scope.label },
    });

    // Each turn separated by 30s-3min "user think time"
    const userPause = isFirstTurn ? 0 : 30_000 + Math.floor(rand() * 150_000);
    const userMsgDate = new Date(cursor.getTime() + userPause);
    const aiResponseTime = 1500 + Math.floor(rand() * 5000);
    const assistantMsgDate = new Date(userMsgDate.getTime() + aiResponseTime);

    let assistantMsg: AssistantMessage = {
      ...composed.message,
      id: `m-a-${i}-${t}`,
      model,
      createdAt: assistantMsgDate.toISOString(),
    };

    // Forced outcome only applies to the *last* turn — earlier turns of a
    // "refused" session still answered normally before the user hit the wall.
    if (forcedOutcome && t === turnCount - 1) {
      assistantMsg = {
        ...assistantMsg,
        outcome: forcedOutcome,
        confidence: forcedOutcome === "answered" ? "high" : "low",
      };
    }

    const downRate = DOWNRATE_PROBABILITY[intentId] ?? 0.03;
    if (rand() < 0.18) assistantMsg.rating = "up";
    else if (rand() < downRate) assistantMsg.rating = "down";

    if (assistantMsg.rating === "down") everDownvoted = true;
    if (assistantMsg.outcome === "refused") everRefused = true;
    if (assistantMsg.outcome === "escalated") everEscalated = true;
    if (isFirstTurn && assistantMsg.rating) firstRating = assistantMsg.rating;
    if (t === turnCount - 1 && assistantMsg.rating) finalRating = assistantMsg.rating;

    if (!lensesUsed.includes(assistantMsg.lens)) lensesUsed.push(assistantMsg.lens);

    messages.push({ id: `m-u-${i}-${t}`, role: "user", body: prompt, createdAt: userMsgDate.toISOString() });
    messages.push(assistantMsg);

    cursor = assistantMsgDate;
  }

  const finalAssistant = messages[messages.length - 1] as AssistantMessage;
  const resolution: Resolution =
    everEscalated
      ? "escalated"
      : finalAssistant.outcome === "refused" ||
        finalAssistant.outcome === "low-confidence" ||
        finalAssistant.rating === "down"
      ? "abandoned"
      : "resolved";
  const regressed = firstRating === "up" && finalRating === "down";

  return {
    id: `conv-${i}`,
    title: firstPrompt.length > 60 ? firstPrompt.slice(0, 57) + "..." : firstPrompt,
    userId: authorId,
    messages,
    createdAt: sessionStart.toISOString(),
    updatedAt: cursor.toISOString(),
    intent: intentId,
    lens: finalAssistant.lens,
    turnCount,
    durationMs: cursor.getTime() - sessionStart.getTime(),
    resolution,
    lensesUsed,
    scopesUsed,
    finalRating,
    everDownvoted,
    everRefused,
    everEscalated,
    regressed,
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

      out.push(buildSession(rand, ++i, day, employee.id, intentId));
    }

    // Inject knowledge-gap conversations sparingly. Gaps are usually short
    // sessions (1-2 turns) — the user hits the wall and stops. Force 1-turn
    // for refused outcomes (user got blocked immediately), 1-3 for the rest.
    if (rand() < 0.35) {
      const gap = GAP_PROMPTS[Math.floor(rand() * GAP_PROMPTS.length)];
      const employee = EMPLOYEES[Math.floor(rand() * EMPLOYEES.length)];
      const baseIntent = "weekend-summary";
      const gapTurnCount = gap.reason === "refused" ? 1 : 1 + Math.floor(rand() * 3);
      const conv = buildSession(rand, ++i, day, employee.id, baseIntent, gap.q,
        gap.reason === "refused" ? "refused"
        : gap.reason === "low-confidence" ? "low-confidence"
        : gap.reason === "escalated" ? "escalated"
        : "answered",
        gapTurnCount,
      );
      // Force a thumbs-down on the *last* assistant turn so it shows up as
      // the session's finalRating and the "thumbs-down" gap surfaces.
      if (gap.reason === "thumbs-down") {
        const lastAssistantIdx = conv.messages.length - 1;
        const last = conv.messages[lastAssistantIdx] as AssistantMessage;
        last.rating = "down";
        conv.finalRating = "down";
        conv.everDownvoted = true;
        const earlier = conv.messages.slice(0, -1).find(
          (m) => m.role === "assistant" && (m as AssistantMessage).rating === "up",
        );
        if (earlier) conv.regressed = true;
        conv.resolution = "abandoned";
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
      // Session-level deflection: a session counts as "deflected" if its
      // resolution is "resolved" (final turn answered cleanly, no escalation
      // or abandonment). More meaningful than per-turn "answered".
      const resolved = list.filter((c) => c.resolution === "resolved").length;
      // Session-level downvotes: any 👎 anywhere in the session counts.
      const downvotes = list.filter((c) => c.everDownvoted).length;
      const lensCounts = new Map<LensId, number>();
      list.forEach((c) => lensCounts.set(c.lens, (lensCounts.get(c.lens) ?? 0) + 1));
      const topLens = Array.from(lensCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "auto";
      // Pull example questions from the *first* user turn of each session.
      const examples = Array.from(new Set(list.map((c) => c.messages[0].body))).slice(0, 4);

      return {
        intent: id,
        label: intent?.label ?? id,
        description: intent?.description ?? "",
        count: list.length,
        distinctAskers: askers,
        exampleQuestions: examples,
        topLens,
        deflectionPct: list.length === 0 ? 0 : (resolved / list.length) * 100,
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

/**
 * Find the "worst" assistant turn in a session — the one that defines the
 * gap reason. For multi-turn sessions, we want the turn that actually
 * blocked or frustrated the user, not the first one (which may have answered
 * fine before the user pushed into a refused area).
 *
 * Priority: refused > escalated > low-confidence > thumbs-down.
 */
function worstAssistantTurn(conv: Conversation): AssistantMessage | undefined {
  const assistants = conv.messages.filter((m) => m.role === "assistant") as AssistantMessage[];
  return (
    assistants.find((a) => a.outcome === "refused") ??
    assistants.find((a) => a.outcome === "escalated") ??
    assistants.find((a) => a.outcome === "low-confidence") ??
    assistants.find((a) => a.rating === "down") ??
    assistants[assistants.length - 1]
  );
}

export function buildGaps(convs: Conversation[]): KnowledgeGap[] {
  // A session is a gap candidate if any turn refused/escalated/low-conf, or
  // any turn got 👎. Session-level flags make this O(1).
  const sessionsWithGaps = convs.filter(
    (c) => c.everRefused || c.everEscalated || c.everDownvoted || c.resolution === "abandoned",
  );

  const byQuestion = new Map<string, Conversation[]>();
  sessionsWithGaps.forEach((c) => {
    // Group by the *first user prompt* — the topic that triggered the
    // session. Two users hitting the same wall on the same opening question
    // is the strongest signal of a real gap.
    const key = c.messages[0].body.toLowerCase().slice(0, 80);
    const list = byQuestion.get(key) ?? [];
    list.push(c);
    byQuestion.set(key, list);
  });

  return Array.from(byQuestion.values())
    .filter((list) => list.length > 0)
    .map((list, idx) => {
      const rep = list[0];
      const worst = worstAssistantTurn(rep);
      const reason: KnowledgeGap["reason"] =
        worst?.outcome === "refused" ? "refused"
        : worst?.outcome === "low-confidence" ? "low-confidence"
        : worst?.outcome === "escalated" ? "escalated"
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

  // Session-level rollups
  const sessions7d = recent.length;
  const turnsTotal7d = recent.reduce((sum, c) => sum + c.turnCount, 0);
  const avgTurnsPerSession = sessions7d === 0 ? 0 : turnsTotal7d / sessions7d;
  const resolved = recent.filter((c) => c.resolution === "resolved").length;
  const abandoned = recent.filter((c) => c.resolution === "abandoned").length;
  const escalated = recent.filter((c) => c.resolution === "escalated").length;
  const longSessions = recent.filter((c) => c.turnCount >= 5 || c.durationMs >= 5 * 60 * 1000).length;
  const regressed = recent.filter((c) => c.regressed).length;

  const lensCounts = new Map<LensId, number>();
  recent.forEach((c) => lensCounts.set(c.lens, (lensCounts.get(c.lens) ?? 0) + 1));
  const topLenses = Array.from(lensCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([lens, count]) => ({ lens, count, label: LENS_BY_ID[lens]?.label ?? lens }));

  return {
    // Legacy: total user *turns* in the window. Kept for backwards
    // compatibility; HealthStrip should prefer sessions7d.
    questions7d: turnsTotal7d,
    activeEmployees7d: askers.size,
    // Session-level deflection: % of sessions that ended in `resolved`.
    deflectionPct: sessions7d === 0 ? 0 : (resolved / sessions7d) * 100,
    topLenses,
    // New session-level metrics
    sessions7d,
    avgTurnsPerSession,
    resolutionRate: sessions7d === 0 ? 0 : (resolved / sessions7d) * 100,
    abandonmentRate: sessions7d === 0 ? 0 : (abandoned / sessions7d) * 100,
    escalationRate: sessions7d === 0 ? 0 : (escalated / sessions7d) * 100,
    longSessionRate: sessions7d === 0 ? 0 : (longSessions / sessions7d) * 100,
    regressedCount: regressed,
  };
}
