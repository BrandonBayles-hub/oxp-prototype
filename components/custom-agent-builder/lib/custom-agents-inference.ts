import {
  DATA_CATALOG,
  EVENT_CATALOG,
  SKILL_CATALOG,
  type CatalogDataSource,
  type CatalogEvent,
  type CatalogSkill,
} from "./custom-agents-catalog";
import type { Trigger, SuccessMetric, SuccessMetricUnit } from "./custom-agents-context";

export type InferenceResult = {
  dataIds: string[];
  skillIds: string[];
  needsCommunication: boolean;
  recommendedChannels: Array<"sms" | "email" | "voice">;
  recommendedPhoneBehavior: "dedicated" | "shared" | "none";
  rationale: string[];
};

const COMMS_SIGNALS = [
  "text",
  "sms",
  "message",
  "email",
  "call",
  "phone",
  "reply",
  "respond",
  "notify",
  "send",
];

function matchKeywords(haystack: string, keywords: string[]): boolean {
  return keywords.some((kw) => haystack.includes(kw.toLowerCase()));
}

export function inferDataSources(prompt: string): CatalogDataSource[] {
  const p = prompt.toLowerCase();
  return DATA_CATALOG.filter((d) => matchKeywords(p, d.keywords));
}

export function inferSkills(prompt: string): CatalogSkill[] {
  const p = prompt.toLowerCase();
  return SKILL_CATALOG.filter((s) => matchKeywords(p, s.keywords));
}

export function inferEvents(prompt: string): CatalogEvent[] {
  const p = prompt.toLowerCase();
  return EVENT_CATALOG.filter((e) => matchKeywords(p, e.keywords));
}

function needsCommsFromTriggers(triggers: Trigger[]): boolean {
  return triggers.some((t) => {
    if (t.kind === "event") {
      const ev = EVENT_CATALOG.find((e) => e.id === t.eventId);
      return ev?.category === "Communication";
    }
    return false;
  });
}

function needsCommsFromPrompt(prompt: string): boolean {
  const p = prompt.toLowerCase();
  return COMMS_SIGNALS.some((s) => p.includes(s));
}

export function inferFromPrompt(
  prompt: string,
  triggers: Trigger[]
): InferenceResult {
  const rationale: string[] = [];
  const data = inferDataSources(prompt);
  const skills = inferSkills(prompt);

  const needsCommunication =
    needsCommsFromTriggers(triggers) || needsCommsFromPrompt(prompt);

  const recommendedChannels: Array<"sms" | "email" | "voice"> = [];
  const p = prompt.toLowerCase();
  if (p.includes("text") || p.includes("sms")) recommendedChannels.push("sms");
  if (p.includes("email")) recommendedChannels.push("email");
  if (p.includes("call") || p.includes("phone")) recommendedChannels.push("voice");
  if (needsCommunication && recommendedChannels.length === 0) {
    recommendedChannels.push("sms");
  }

  let recommendedPhoneBehavior: "dedicated" | "shared" | "none" = "none";
  if (recommendedChannels.includes("sms") || recommendedChannels.includes("voice")) {
    const ongoingConversation =
      p.includes("reply") ||
      p.includes("respond") ||
      p.includes("back and forth") ||
      p.includes("conversation") ||
      triggers.some((t) => t.kind === "event" && t.eventId === "evt.message_received");
    recommendedPhoneBehavior = ongoingConversation ? "dedicated" : "shared";
  }

  if (data.length > 0) {
    rationale.push(
      `Detected ${data.length} data reference${data.length === 1 ? "" : "s"} in the prompt.`
    );
  } else {
    rationale.push("No specific data sources detected from the prompt.");
  }
  if (skills.length > 0) {
    rationale.push(
      `Detected ${skills.length} action${skills.length === 1 ? "" : "s"} the agent will need to perform.`
    );
  }
  if (needsCommunication) {
    rationale.push("This agent appears to send or receive messages, so communication is enabled.");
  } else {
    rationale.push("No communication needed — the agent will act on data and internal skills only.");
  }
  if (recommendedPhoneBehavior === "dedicated") {
    rationale.push("Recommend a dedicated phone number to keep conversations clean.");
  } else if (recommendedPhoneBehavior === "shared") {
    rationale.push("A shared phone number is fine for one-way outbound messages.");
  }

  return {
    dataIds: data.map((d) => d.id),
    skillIds: skills.map((s) => s.id),
    needsCommunication,
    recommendedChannels,
    recommendedPhoneBehavior,
    rationale,
  };
}

/**
 * Infer 1–3 success metrics from the prompt + optional success description.
 * Uses keyword heuristics (mocked AI); returns reasonable mock current/previous
 * values so the prototype feels populated. First metric is marked primary.
 */
export function inferSuccessMetrics(
  prompt: string,
  description: string
): SuccessMetric[] {
  const haystack = `${description} ${prompt}`.toLowerCase();
  const metrics: Array<Omit<SuccessMetric, "id" | "primary" | "aiInferred">> = [];

  const push = (
    label: string,
    unit: SuccessMetricUnit,
    currentValue: number,
    previousValue: number,
    opts: Partial<SuccessMetric> = {}
  ) => {
    metrics.push({
      label,
      description: opts.description,
      unit,
      direction: opts.direction ?? "up",
      windowDays: 30,
      currentValue,
      previousValue,
    });
  };

  // Pre-bill / approval patterns
  if (haystack.match(/\b(approve|auto[- ]?approve|pre[- ]?bill)\b/)) {
    push("Items auto-approved", "count", 124, 96, {
      description: "Items approved automatically without human review.",
    });
    push("Ops time saved", "minutes", 3600, 2700, {
      description: "Estimated minutes saved vs. manual review.",
    });
  }

  // Messaging / reminder patterns
  if (haystack.match(/\b(text|sms|remind|reminder|send)\b/)) {
    push("Messages delivered", "count", 78, 64, {
      description: "Messages successfully delivered on time.",
    });
  }

  // Reply / lead update patterns
  if (haystack.match(/\b(reply|respond|update|lead)\b/)) {
    push("Records updated from replies", "count", 36, 22, {
      description: "Records updated in response to inbound messages.",
    });
  }

  // Completion / checklist / move-in patterns
  if (haystack.match(/\b(complet|checklist|move[- ]?in|onboard)\b/)) {
    push("Completion rate", "percent", 72, 58, {
      description: "Share of items completed in the target window.",
    });
  }

  // Delinquency / collection patterns
  if (haystack.match(/\b(delinqu|collect|past[- ]?due|overdue|balance)\b/)) {
    push("Amount collected", "dollars", 18200, 12400, {
      description: "Dollar amount recovered during the window.",
    });
  }

  // Time-to-action / response time patterns
  if (haystack.match(/\b(respond in|respond within|time to|within \d+ ?(min|minute|hour))\b/)) {
    push("Median response time", "minutes", 6, 11, {
      direction: "down",
      description: "How quickly the agent acts after the trigger.",
    });
  }

  // Fallback — generic "successful runs"
  if (metrics.length === 0) {
    push("Successful runs", "count", 48, 32, {
      description: "Runs that completed without escalation.",
    });
  }

  // De-dupe by label, cap at 3, and add ids + primary flag
  const seen = new Set<string>();
  const deduped = metrics.filter((m) => {
    if (seen.has(m.label)) return false;
    seen.add(m.label);
    return true;
  });

  return deduped.slice(0, 3).map((m, i) => ({
    ...m,
    id: `sm_ai_${i}_${Math.random().toString(36).slice(2, 8)}`,
    aiInferred: true,
    primary: i === 0,
  }));
}

