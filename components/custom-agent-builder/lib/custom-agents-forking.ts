/**
 * Fork a native ("Entrata") system agent into a pre-filled custom agent draft.
 *
 * When a PMC decides they want to customize a system agent, we don't force them
 * to rebuild it from scratch. We take everything we know about the system agent
 * — its name, description, system prompt, guardrails, guardrail phrases,
 * channels, and skill/data signals inferred from its prompt — and seed a new
 * CustomAgent draft with it. They then land in the Agent Builder wizard with
 * all fields pre-populated, ready to edit.
 *
 * We also stamp `forkedFromEntrataId` so we can (a) hide the native card on
 * the Agent Roster (the fork replaces it) and (b) diff the PMC's edits against
 * the original system prompt to learn how to improve the system agent itself.
 */
import type { Agent } from "./agents-context";
import {
  DATA_CATALOG,
  SKILL_CATALOG,
  VOICE_CATALOG,
} from "./custom-agents-catalog";
import type {
  AgentVersion,
  CommunicationCfg,
  Trigger,
} from "./custom-agents-context";
import {
  inferFromPrompt,
  inferSuccessMetrics,
} from "./custom-agents-inference";

/** Pull out the best available system prompt from a native agent. */
function extractSystemPrompt(agent: Agent): string {
  return (
    agent.systemPrompt?.trim() ||
    agent.prompt?.trim() ||
    // Fallback: synthesize a starter prompt from what we know so the user has
    // something to edit rather than an empty box.
    [
      `You are ${agent.name}, an AI agent for a property management company.`,
      agent.goal ? `Your goal: ${agent.goal.trim()}` : "",
      agent.description ? `\nWhat you do: ${agent.description.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n")
  );
}

/** Pull guardrails out of whatever the native agent declares. */
function extractGuardrails(agent: Agent): string {
  const lines: string[] = [];
  if (agent.guardrails) lines.push(agent.guardrails.trim());
  if (agent.fairHousingEnabled) {
    lines.push(
      "Comply with Fair Housing regulations. Never discriminate based on protected classes (race, color, religion, sex, familial status, national origin, disability)."
    );
  }
  if (agent.escalationKeywords && agent.escalationKeywords.length > 0) {
    lines.push(
      `Immediately escalate to a human teammate if the caller says any of: ${agent.escalationKeywords.join(", ")}.`
    );
  }
  if (agent.prohibitedPhrases && agent.prohibitedPhrases.length > 0) {
    lines.push(
      `Never say: ${agent.prohibitedPhrases.join("; ")}.`
    );
  }
  if (agent.requiredDisclosures && agent.requiredDisclosures.length > 0) {
    lines.push(
      `Always include these disclosures when relevant: ${agent.requiredDisclosures.join("; ")}.`
    );
  }
  return lines.join("\n\n");
}

/** Pick a reasonable default trigger set based on what the native agent does. */
function inferTriggers(agent: Agent): Trigger[] {
  const channels = (agent.channels ?? []).map((c) => c.toLowerCase());
  const isConversational = agent.type === "autonomous" || agent.type === "fully_autonomous";

  // Conversational agents → reply to inbound messages on whatever channels
  // the native agent supports. This is the closest analog to how Leasing AI,
  // Maintenance AI, etc. actually run today.
  if (isConversational) {
    const triggers: Trigger[] = [];
    const push = (channel: "sms" | "email" | "voice") => {
      triggers.push({
        id: `trg_${channel}_${Math.random().toString(36).slice(2, 8)}`,
        kind: "inbound_message",
        channel,
      });
    };
    if (channels.some((c) => c.includes("sms") || c.includes("text") || c.includes("chat"))) push("sms");
    if (channels.some((c) => c.includes("email"))) push("email");
    if (channels.some((c) => c.includes("voice") || c.includes("phone") || c.includes("call"))) push("voice");
    if (triggers.length === 0) {
      // Native agent didn't declare channels — default to SMS so the user has
      // something to deploy without reconfiguring everything.
      push("sms");
    }
    return triggers;
  }

  // Intelligence / operations agents → schedule-driven. Honor the agent's
  // declared schedule if we can parse it, otherwise fall back to daily.
  const freq = (agent.schedule || agent.analysisFrequency || "daily").toLowerCase();
  const mapped =
    freq.includes("hour") ? "hourly" :
    freq.includes("week") ? "weekly" :
    freq.includes("month") ? "monthly" :
    freq.includes("real") || freq.includes("continuous") ? "hourly" :
    "daily";

  return [
    {
      id: `trg_sched_${Math.random().toString(36).slice(2, 8)}`,
      kind: "schedule",
      frequency: mapped as Trigger extends { kind: "schedule"; frequency: infer F } ? F : never,
      timeOfDay: "09:00",
    },
  ];
}

/** Seed a communication config that reflects whatever the native agent runs on. */
function inferCommunication(agent: Agent, triggers: Trigger[]): CommunicationCfg {
  const inboundChannels = triggers
    .filter((t): t is Extract<Trigger, { kind: "inbound_message" }> => t.kind === "inbound_message")
    .map((t) => t.channel);

  const wantsVoice = inboundChannels.includes("voice");
  const wantsSms = inboundChannels.includes("sms");
  const wantsEmail = inboundChannels.includes("email");

  const channels: CommunicationCfg["channels"] = [];
  if (wantsSms) channels.push("sms");
  if (wantsEmail) channels.push("email");
  if (wantsVoice) channels.push("voice");

  const firstMessage = wantsVoice
    ? `Hi, this is ${agent.name}. How can I help you today?`
    : wantsSms || wantsEmail
    ? `Hi, this is ${agent.name}. I can help — what do you need?`
    : undefined;

  return {
    enabled: channels.length > 0,
    channels,
    firstMessage,
    voiceId: wantsVoice ? VOICE_CATALOG[0]?.id : undefined,
    recordingConsent: wantsVoice
      ? "This call may be recorded for quality and training purposes."
      : undefined,
    phoneBehavior: channels.length > 0 ? "dedicated" : undefined,
  };
}

export type ForkResult = {
  /** The seeded first version of the new custom agent. */
  version: AgentVersion;
  /** Display name for the custom agent (same as the native agent, editable). */
  name: string;
  description: string;
  capabilityTags: string[];
};

/**
 * Produce a seeded version payload from a native Entrata agent. The caller
 * (typically a context action like `createForkedDraft`) wraps this into a
 * full CustomAgent record with ids, timestamps, and lifecycle=draft.
 */
export function forkFromEntrataAgent(agent: Agent): ForkResult {
  const prompt = extractSystemPrompt(agent);
  const guardrails = extractGuardrails(agent);
  const triggers = inferTriggers(agent);

  // Run the same prompt inference engine we use elsewhere so the forked
  // draft's data/skills feel AI-picked rather than empty.
  const inference = inferFromPrompt(prompt, triggers);
  const dataIds = inference.dataIds.slice();
  const skillIds = inference.skillIds.slice();

  // Augment with extra data sources hinted by the native agent's dataSources
  // array, when we can match them back to the catalog by keyword.
  for (const ds of agent.dataSources ?? []) {
    const match = DATA_CATALOG.find(
      (d) =>
        d.keywords.some((k) => ds.toLowerCase().includes(k)) ||
        ds.toLowerCase().includes(d.id.split(".")[1] ?? "")
    );
    if (match && !dataIds.includes(match.id)) dataIds.push(match.id);
  }

  // Same trick for tools the native agent is allowed to use.
  for (const tool of agent.toolsAllowed ?? []) {
    const match = SKILL_CATALOG.find((s) =>
      s.keywords.some((k) => tool.toLowerCase().includes(k)) ||
      tool.toLowerCase().includes(s.id.split(".")[1] ?? "")
    );
    if (match && !skillIds.includes(match.id)) skillIds.push(match.id);
  }

  const communication = inferCommunication(agent, triggers);
  const metrics = inferSuccessMetrics(prompt, agent.description ?? "").map((m, i) => ({
    ...m,
    primary: i === 0,
    aiInferred: true,
  }));

  const version: AgentVersion = {
    versionNumber: 1,
    createdAt: new Date().toISOString(),
    createdBy: "Current user",
    name: agent.name,
    prompt,
    guardrails,
    triggers,
    dataIds,
    skillIds,
    aiInferredDataIds: dataIds.slice(),
    aiInferredSkillIds: skillIds.slice(),
    properties: [],
    communication,
    memory: { enabled: false, lastN: 3, retentionDays: 30 },
    compilation: { status: "none" },
    costEstimate: null,
    successDescription: agent.goal ?? "",
    successMetrics: metrics,
    evals: [],
    escalationPolicy:
      agent.escalationKeywords && agent.escalationKeywords.length > 0
        ? {
            enabled: true,
            when: `Caller mentions any of: ${agent.escalationKeywords.join(", ")}`,
            to: agent.escalationDefault ? [agent.escalationDefault] : ["On-call teammate"],
            channel: "sms",
            slaMinutes: 15,
          }
        : undefined,
  };

  return {
    version,
    name: agent.name,
    description: agent.description ?? "",
    capabilityTags: (agent.labels ?? []).slice(),
  };
}
