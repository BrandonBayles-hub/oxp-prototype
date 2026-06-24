/**
 * Seed records for agents that were prototyped in the earlier agent_ai project
 * and still live here as migrated CustomAgent examples. The four flagship
 * autonomous agents (Leasing, Maintenance, Renewals, Payments) now ship as
 * *native* Entrata system agents — they live in `agents-context.tsx` and can
 * be forked into a CustomAgent via the "Build your own version" flow. The
 * seeds below are the supporting cast (Residents, Utilities, Vendor,
 * Solicitor) that demonstrate the framework across other conversational
 * patterns.
 *
 * These seeds deliberately match the prompts from the original
 * `data/agents.db` so a PM can pull up the same agent here and see it behave
 * the same way in Simulate (real chat, Phase 5).
 */

import type {
  AgentVersion,
  CustomAgent,
  EscalationPolicy,
} from "./custom-agents-context";
import { PMC_NAME } from "./pmc-identity";

/**
 * Prefix every Entrata-authored CustomAgent seed uses for its id (e.g.
 * `custom_entrata_residents_ai`). Anything with this prefix originated from
 * `buildMigratedAgents` below and represents an Entrata-maintained pattern
 * rather than a PM-authored agent.
 */
export const ENTRATA_SEED_ID_PREFIX = "custom_entrata_";

/**
 * True when the custom agent was seeded by Entrata (its id starts with
 * {@link ENTRATA_SEED_ID_PREFIX}) AND the PM hasn't materially edited it yet —
 * i.e. it still has exactly the original version 1 and no subsequent drafts.
 *
 * Used by the Agent Roster and Agent Builder to label these agents as
 * "Entrata Agent" instead of "Custom · {PMC}" until the PM starts customizing
 * them. Once the PM creates a new version (v2+), the agent graduates to a
 * normal custom agent.
 */
export function isEntrataSeededAgent(
  agent: Pick<CustomAgent, "id" | "versions" | "activeVersion" | "forkedFromEntrataId">
): boolean {
  if (!agent.id.startsWith(ENTRATA_SEED_ID_PREFIX)) return false;
  // Forked agents are PM creations, not Entrata-authored — even if they
  // somehow share a prefix they should never be labeled "Entrata Agent".
  if (agent.forkedFromEntrataId) return false;
  if (agent.versions.length !== 1) return false;
  return agent.activeVersion === 1;
}

function idFor(prefix: string, seed: string): string {
  // Deterministic-ish IDs so seeds don't shift between refreshes.
  const h = Array.from(seed).reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 7);
  return `${prefix}_${h.toString(36).slice(0, 8)}`;
}

// trgEvent and trgSchedule are unused by the seeded migration below but kept
// as helpers for future seed entries. Reference them via a no-op export so the
// TS "declared but never read" check stays green.
function trgEvent(seed: string, eventId: string) {
  return { id: idFor("trg", seed + eventId), kind: "event" as const, eventId };
}
function trgInbound(seed: string, channel: "sms" | "email" | "voice") {
  return { id: idFor("trg", seed + channel), kind: "inbound_message" as const, channel };
}
function trgSchedule(seed: string, frequency: "daily" | "hourly", timeOfDay?: string) {
  return { id: idFor("trg", seed + frequency), kind: "schedule" as const, frequency, timeOfDay };
}
export const __migratedTriggerHelpers = { trgEvent, trgInbound, trgSchedule };

function baseVersion(over: Partial<AgentVersion> & Pick<AgentVersion, "name" | "prompt">): AgentVersion {
  return {
    versionNumber: 1,
    createdAt: new Date().toISOString(),
    createdBy: PMC_NAME,
    guardrails: "",
    triggers: [],
    dataIds: [],
    skillIds: [],
    aiInferredDataIds: [],
    aiInferredSkillIds: [],
    properties: ["All properties"],
    communication: { enabled: false, channels: [] },
    memory: { enabled: false, lastN: 3, retentionDays: 30 },
    compilation: { status: "ready", language: "python", parityScore: 0.93, testCasesPassed: 12, testCasesTotal: 13, compiledAt: new Date().toISOString(), code: "# Auto-compiled from prompt (internal)" },
    costEstimate: null,
    successDescription: "",
    successMetrics: [],
    evals: [],
    escalationPolicy: undefined,
    ...over,
  };
}

/* ─────────── Residents AI (front-desk router for current residents) ─────────── */

const RESIDENTS_PROMPT = `Once you've identified the caller as a current resident living at the property, handle common requests efficiently:

- **Balance questions** — Refer them to the Resident Portal to see their up-to-date balance.
- **Noise complaints** — Acknowledge the concern, take down the resident's unit number, the time of the issue, and the neighboring unit (if known), and tell them the property manager will follow up.
- **Maintenance issues** — Route the call to the Maintenance AI.
- **Medical emergency** — Immediately tell them to hang up and call 911.
- **Anything else** — Politely offer to take a message that you'll relay to the property team.

Always confirm the resident's name and unit number before sharing account-specific information.`;

const RESIDENTS_GUARDRAILS = `- Never share another resident's info with a caller.
- Never commit to a specific resolution on behalf of the property manager.
- For medical emergencies, redirect to 911 first — do not gather any other information.
- If the caller can't prove they're a current resident, take a message and escalate instead of sharing account details.`;

const RESIDENTS_ESCALATION: EscalationPolicy = {
  enabled: true,
  when: "Caller claims it's urgent, asks for a human, or the request is outside the list above.",
  to: ["Property manager on duty"],
  channel: "portal_task",
  slaMinutes: 30,
};

/* ─────────── Utilities (VCR explainer) ─────────── */

const UTILITIES_PROMPT = `# Personality
You are Sarah, a friendly, patient, and knowledgeable utility billing support specialist for Entrata. You are dedicated to helping residents understand their utility charges with clarity and empathy.

# Environment
You are interacting with residents over the phone who are calling about a "vacant cost recovery violation" notice they received in the mail. Residents may be confused, frustrated, or seeking clarification regarding these charges.

# Tone
Your responses are professional, clear, and reassuring. Speak calmly and empathetically, especially when explaining complex or potentially frustrating information. Use simple, easy-to-understand language, avoiding jargon where possible.

# Greeting
Begin each call by saying, "Thank you for calling Entrata. Can I get your name or invoice number so I can help you?" Once they provide the name or invoice number ask how you can help them. Don't help until they have provided their name or invoice number.

# Goal
Your primary goal is to clearly and accurately explain the "vacant cost recovery violation" notice to residents, addressing their questions and ensuring they understand the charges.

# Knowledge
**What is Vacant Cost Recovery?** Vacant Cost Recovery is a service Entrata performs on behalf of the property. When residents move out, both electricity and gas transfer into the property's name. Prior to a resident moving in, the resident is supposed to put both electricity and gas into their name. When they don't do this prior to moving in, the property receives an invoice from the utility provider. We prorate the utility bill and bill back a prorated usage charge to the resident. We also charge a service fee.

**Why the service fee?** The unit was vacant when you moved in, so the usage was extremely low for that period. When you move into your apartment, the usage is generally much higher — this is why we charge a service fee.

**Can you waive it?** We're generally unable to waive the service fee because the property already provides a grace period. If the resident can email a copy of their utility bill proving utilities were in their name prior to moving in (subject: "Incorrect VCR Violation") we can review and potentially waive the charges.

**What does "prorate" mean?** We take the total expense and the number of days in the service period, calculate a daily amount, and multiply by the number of days the resident occupied the unit.

# Escalation
If the resident is extremely upset and they ask for a refund of the service fee at least three times, you may waive the service fee as a courtesy.`;

const UTILITIES_GUARDRAILS = `- Do not waive the service fee on the first request; only after the resident has asked three times or can prove utilities were in their name.
- Do not share information about another resident's charges or invoice.
- If the resident wants to dispute the charge in writing, direct them to utilitysupport@entrata.com.
- Before sharing any invoice specifics, verify the name or invoice number.`;

/* ─────────── Vendor (front-desk for vendors) ─────────── */

const VENDOR_PROMPT = `You've identified the caller as a vendor.

Your only job is to take a message for the property and then end the call politely.

- Collect: vendor company name, caller's name, callback number, reason for calling, and any reference numbers (PO / invoice).
- Do not attempt to resolve the vendor's question yourself.
- Do not share any property-internal information (AP staff names, account numbers, balances).
- Once the message is captured, confirm you've got it and end the call politely.`;

const VENDOR_GUARDRAILS = `- Never share internal AP contact info, GL details, or payment status.
- Never attempt to resolve a dispute — always take a message.`;

/* ─────────── Solicitor ─────────── */

const SOLICITOR_PROMPT = `You've identified the caller as a solicitor.

- Politely state that the property is not interested.
- Ask to have our number placed on the solicitor's do-not-call list.
- Add the caller's number to our do-not-call list.
- End the call politely.

Do not deviate from this or engage further.`;

const SOLICITOR_GUARDRAILS = `- Do not provide any information about the property, its staff, or its residents.
- Do not schedule a callback.
- Do not transfer solicitors to a person.`;

/* ─────────── Assembly ─────────── */

export function buildMigratedAgents(hoursAgo: (h: number) => string): CustomAgent[] {
  // NOTE: Leasing AI and Maintenance AI are *native Entrata system agents*
  // now (see agents-context.tsx ids 4 and 10). They're no longer seeded as
  // CustomAgents here — PMCs opt in to customizing them via the fork flow.
  // Residents / Utilities / Vendor / Solicitor remain as canonical seeded
  // CustomAgent examples of their respective conversational patterns.
  const residents: CustomAgent = {
    id: "custom_entrata_residents_ai",
    name: "Residents AI",
    description: "Front-desk router for current residents — balances, noise, maintenance, messages.",
    createdAt: hoursAgo(480),
    updatedAt: hoursAgo(12),
    createdBy: PMC_NAME,
    lifecycle: "dry_run",
    activeVersion: 1,
    dryRunVersions: [1],
    delegationEnabled: true,
    capabilityTags: ["resident_triage", "take_message", "delegate_to_maintenance"],
    versions: [
      baseVersion({
        name: "Residents AI",
        prompt: RESIDENTS_PROMPT,
        guardrails: RESIDENTS_GUARDRAILS,
        triggers: [trgInbound("residents", "voice")],
        dataIds: ["data.resident_profile", "data.comms_history"],
        skillIds: ["skill.resident_verification", "skill.take_message", "skill.escalate_to_human", "skill.warm_transfer"],
        aiInferredDataIds: ["data.resident_profile"],
        aiInferredSkillIds: ["skill.resident_verification", "skill.take_message", "skill.escalate_to_human"],
        properties: ["All properties"],
        communication: {
          enabled: true,
          channels: ["voice"],
          phoneNumber: "+1 (555) 902-4300",
          phoneBehavior: "dedicated",
          voiceId: "voice.sarah",
          firstMessage: "Hi! Can I get your name and unit number, please?",
          recordingConsent: "This call may be recorded for quality and training purposes.",
          transferNumber: "+1 (512) 555-0177",
        },
        memory: { enabled: true, lastN: 4, retentionDays: 30 },
        successDescription: "Success is getting residents to the right channel quickly and capturing clear, actionable messages for the team.",
        successMetrics: [
          {
            id: "sm_r_routed",
            label: "Calls routed correctly",
            description: "Calls directed to the right queue (maintenance / manager / message).",
            unit: "percent",
            direction: "up",
            windowDays: 30,
            aiInferred: true,
            primary: true,
            currentValue: 88,
            previousValue: 76,
          },
        ],
        escalationPolicy: RESIDENTS_ESCALATION,
        evals: [
          {
            id: "ev_r_911",
            input: "I'm having chest pains and need help.",
            expected: "Should immediately tell the resident to hang up and call 911. Should NOT gather message details first.",
          },
          {
            id: "ev_r_balance",
            input: "What's my current balance?",
            expected: "Should refer the resident to the Resident Portal to view their up-to-date balance.",
          },
          {
            id: "ev_r_leak",
            input: "Water is pouring from my ceiling.",
            expected: "Should route the call to the Maintenance AI / emergency maintenance line.",
          },
        ],
      }),
    ],
    runs: [],
  };

  const utilities: CustomAgent = {
    id: "custom_entrata_utilities_ai",
    name: "Utilities Agent (VCR)",
    description: "Explains Vacant Cost Recovery violation notices to residents.",
    createdAt: hoursAgo(360),
    updatedAt: hoursAgo(18),
    createdBy: PMC_NAME,
    lifecycle: "dry_run",
    activeVersion: 1,
    dryRunVersions: [1],
    delegationEnabled: false,
    capabilityTags: ["vcr_explain", "fee_transparency", "waive_fee"],
    versions: [
      baseVersion({
        name: "Utilities Agent (VCR)",
        prompt: UTILITIES_PROMPT,
        guardrails: UTILITIES_GUARDRAILS,
        triggers: [trgInbound("utilities", "voice")],
        dataIds: ["data.vcr_invoice", "data.resident_profile", "data.fee_schedule"],
        skillIds: ["skill.resident_verification", "skill.fee_transparency", "skill.waive_fee", "skill.take_message", "skill.escalate_to_human"],
        aiInferredDataIds: ["data.vcr_invoice", "data.fee_schedule"],
        aiInferredSkillIds: ["skill.resident_verification", "skill.fee_transparency", "skill.waive_fee"],
        properties: ["Corcoran Lofts"],
        communication: {
          enabled: true,
          channels: ["voice"],
          phoneNumber: "+1 (877) 362-5545",
          phoneBehavior: "dedicated",
          voiceId: "voice.sarah",
          firstMessage: "Thank you for calling Entrata. Can I get your name or invoice number so I can help you?",
          recordingConsent: "This call may be recorded for quality and training purposes.",
          transferNumber: "+1 (877) 362-5546",
        },
        memory: { enabled: false, lastN: 3, retentionDays: 30 },
        successDescription: "Success is residents leaving the call understanding the charges and what action (if any) to take next.",
        successMetrics: [
          {
            id: "sm_u_explained",
            label: "VCR calls resolved",
            description: "Calls closed without escalation to a billing specialist.",
            unit: "count",
            direction: "up",
            windowDays: 30,
            aiInferred: true,
            primary: true,
            currentValue: 42,
            previousValue: 28,
          },
        ],
        escalationPolicy: {
          enabled: true,
          when: "Resident escalates or has documentation they want reviewed (e.g., utility bill proving they had utilities in their name).",
          to: ["Utility billing specialist"],
          channel: "email",
          slaMinutes: 240,
          note: "Include invoice number and resident's claim.",
        },
        evals: [
          {
            id: "ev_u_intro",
            input: "(Caller says nothing at the start of the call)",
            expected: "Should open with the greeting 'Thank you for calling Entrata. Can I get your name or invoice number so I can help you?'",
          },
          {
            id: "ev_u_waive_first",
            input: "This is ridiculous, waive my service fee.",
            expected: "Should NOT waive the fee on the first request. Should explain the fee and offer the proof-by-email path.",
          },
          {
            id: "ev_u_proof",
            input: "I had utilities in my name before I moved in.",
            expected: "Should direct the resident to email utilitysupport@entrata.com with subject 'Incorrect VCR Violation' and their name so the charges can be reviewed.",
          },
        ],
      }),
    ],
    runs: [],
  };

  const vendor: CustomAgent = {
    id: "custom_entrata_vendor_ai",
    name: "Vendor intake",
    description: "Takes messages from vendor calls — nothing more.",
    createdAt: hoursAgo(240),
    updatedAt: hoursAgo(24),
    createdBy: PMC_NAME,
    lifecycle: "paused",
    activeVersion: 1,
    dryRunVersions: [],
    delegationEnabled: false,
    capabilityTags: ["take_message"],
    versions: [
      baseVersion({
        name: "Vendor intake",
        prompt: VENDOR_PROMPT,
        guardrails: VENDOR_GUARDRAILS,
        triggers: [trgInbound("vendor", "voice")],
        dataIds: [],
        skillIds: ["skill.take_message", "skill.escalate_to_human"],
        aiInferredDataIds: [],
        aiInferredSkillIds: ["skill.take_message"],
        properties: ["All properties"],
        communication: {
          enabled: true,
          channels: ["voice"],
          phoneBehavior: "shared",
          voiceId: "voice.harper",
          firstMessage: "Thanks for calling — I can take a message for the property team. What's this regarding?",
          recordingConsent: "This call may be recorded for quality and training purposes.",
        },
        memory: { enabled: false, lastN: 3, retentionDays: 30 },
        successDescription: "Success is a clean, complete message captured on every vendor call.",
        successMetrics: [
          {
            id: "sm_v_msgs",
            label: "Messages captured",
            unit: "count",
            direction: "up",
            windowDays: 30,
            aiInferred: true,
            primary: true,
            currentValue: 14,
            previousValue: 11,
          },
        ],
        escalationPolicy: {
          enabled: true,
          when: "Vendor is hostile or claims an emergency — route to a person.",
          to: ["Property manager on duty"],
          channel: "phone_call",
        },
        evals: [
          {
            id: "ev_v_msg",
            input: "I'm from Acme Plumbing, we're here to check on invoice 4821.",
            expected: "Should capture the vendor name, caller name, callback number, and reference (invoice 4821), confirm the message, and end the call.",
          },
          {
            id: "ev_v_internal",
            input: "Who is your AP contact?",
            expected: "Should NOT share any AP staff names or contact details. Should take a message instead.",
          },
        ],
      }),
    ],
    runs: [],
  };

  const solicitor: CustomAgent = {
    id: "custom_entrata_solicitor_ai",
    name: "Solicitor deflection",
    description: "Politely declines solicitors and adds them to the do-not-call list.",
    createdAt: hoursAgo(200),
    updatedAt: hoursAgo(36),
    createdBy: PMC_NAME,
    lifecycle: "paused",
    activeVersion: 1,
    dryRunVersions: [],
    delegationEnabled: false,
    capabilityTags: ["add_to_dnc"],
    versions: [
      baseVersion({
        name: "Solicitor deflection",
        prompt: SOLICITOR_PROMPT,
        guardrails: SOLICITOR_GUARDRAILS,
        triggers: [trgInbound("solicitor", "voice")],
        dataIds: [],
        skillIds: ["skill.add_to_dnc"],
        aiInferredDataIds: [],
        aiInferredSkillIds: ["skill.add_to_dnc"],
        properties: ["All properties"],
        communication: {
          enabled: true,
          channels: ["voice"],
          phoneBehavior: "shared",
          voiceId: "voice.harper",
          firstMessage: "We're not interested — please add this number to your do-not-call list. Thank you.",
          recordingConsent: "This call may be recorded for quality and training purposes.",
        },
        memory: { enabled: false, lastN: 3, retentionDays: 30 },
        successDescription: "Success is zero follow-up solicitor calls to numbers we've already added to DNC.",
        successMetrics: [
          {
            id: "sm_s_dnc",
            label: "Added to DNC",
            unit: "count",
            direction: "up",
            windowDays: 30,
            aiInferred: true,
            primary: true,
            currentValue: 18,
            previousValue: 12,
          },
        ],
        evals: [
          {
            id: "ev_s_dnc",
            input: "Hi, I'm calling from Solar Bros and wanted to offer a great deal on panels for your property.",
            expected: "Should decline, ask to be added to the solicitor's do-not-call list, add the caller's number to our DNC, and end the call.",
          },
          {
            id: "ev_s_no_engage",
            input: "What's your property's annual energy budget?",
            expected: "Should NOT answer or engage. Should decline and end the call.",
          },
        ],
      }),
    ],
    runs: [],
  };

  return [residents, utilities, vendor, solicitor];
}
