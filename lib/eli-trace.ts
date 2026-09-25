/**
 * SA 1.2 "Testing" mode — Eli reply trace generator.
 *
 * Given a conversation thread, this returns a deterministic, plausible
 * execution trace for the *last* Eli-authored reply on that thread —
 * modeled after the Maintenance-AI kitchen-flooding example from the
 * design comp. Real Eli traces would come from the orchestrator's
 * telemetry; here we synthesize them so every SA 1.2 demo thread has
 * a self-consistent trace surface for walk-throughs.
 *
 * Everything is derived from the thread id + content so a given thread
 * always produces the same session id, agent domain, and tool sequence
 * — reloads / hot-reloads never re-shuffle the demo state under the
 * demoer.
 */

import type { ConversationItem, ConversationMessage } from "./conversations-context";

/** Small, stable string hash → hex — enough for demo-only session ids. */
function stableHashHex(input: string): string {
  // FNV-1a 32-bit; deterministic across runs.
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Force unsigned + pad to 8 hex chars.
  const unsigned = h >>> 0;
  return unsigned.toString(16).padStart(8, "0");
}

/**
 * Compact human-readable session id shown in the header chip and the
 * Trace panel header. Deterministic per thread — same thread = same id
 * every time. Formatted `sess_<8-hex>-<4-hex>` (14 chars body) so it
 * reads as an opaque handle without being intimidatingly long.
 */
export function makeSessionId(threadId: string): string {
  const a = stableHashHex(threadId);
  const b = stableHashHex(`${threadId}:msg`).slice(0, 4);
  return `sess_${a}-${b}`;
}

/**
 * The five Eli agent domains we surface in the trace header. Which one
 * a given thread lands in is inferred from the last Eli reply's content
 * (kitchen flood → Maintenance, tour → Leasing, etc.).
 */
export type EliAgentDomain =
  | "Maintenance AI"
  | "Leasing AI"
  | "Resident AI"
  | "Collections AI"
  | "Renewals AI";

/** Playbook / policy card shown at the top of the execution trace. */
export type TracePlaybookStep = {
  kind: "playbook";
  /** Card title shown before the playbook body (e.g. "Emergency triage"). */
  title: string;
  /** Milliseconds shown next to the title (fake but stable). */
  durationMs: number;
  /** Agent domain shown in the pill above the body. */
  domain: EliAgentDomain;
  /** Sub-title shown in the pill row (e.g. "WATER INTRUSION"). */
  policyLabel: string;
  /** The italic policy body inside the card. */
  body: string;
};

/** MCP tool invocation with request + response payload. */
export type TraceToolStep = {
  kind: "tool";
  /** Fully-qualified tool name (e.g. "entrata.workorders.classifyUrgency"). */
  name: string;
  /** Free-form status label shown at the right of the card header. */
  status: "SUCCESS" | "ERROR";
  /** Milliseconds shown next to the tool name (fake but stable). */
  durationMs: number;
  /** JSON-RPC request body (already prettified). */
  request: string;
  /** JSON-RPC response body (already prettified). */
  response: string;
};

export type TraceStep = TracePlaybookStep | TraceToolStep;

export type EliTrace = {
  sessionId: string;
  domain: EliAgentDomain;
  /** Text of the resident message that prompted the reply. */
  residentMessage: string;
  /** Text of the Eli-authored reply. */
  agentReply: string;
  /** Ordered execution trace: playbook first, then tool calls. */
  steps: TraceStep[];
};

/**
 * User-View card — the plain-English recap staff / residents can read
 * without the JSON-RPC noise. Rendered in the Trace panel's "User View"
 * tab: title + one-line explanation of what Eli did in this step.
 */
export type TraceUserStep = {
  title: string;
  detail: string;
};

/** ─── Domain inference ──────────────────────────────────────────────── */

/**
 * Guess which Eli domain most likely produced the last reply on a
 * thread. We look at the labels first (highest signal, staff-authored),
 * then fall back to keyword matching on the resident's most recent
 * inbound message. Everything defaults to Resident AI so the trace
 * still renders for uncategorized demo threads.
 */
function inferDomain(thread: ConversationItem): EliAgentDomain {
  const labelBlob = thread.labels.join(" ").toLowerCase();
  if (/maint|leak|flood|hvac|repair|work\s*order/.test(labelBlob)) return "Maintenance AI";
  if (/tour|apply|lease|guest|prospect|showing/.test(labelBlob)) return "Leasing AI";
  if (/renew/.test(labelBlob)) return "Renewals AI";
  if (/collect|balance|payment|delinq/.test(labelBlob)) return "Collections AI";

  const lastInbound = [...thread.messages]
    .reverse()
    .find((m) => m.role === "resident" && (m.type === "message" || !m.type));
  const text = (lastInbound?.text ?? thread.preview ?? "").toLowerCase();

  if (/flood|leak|water|toilet|sink|hvac|ac\b|heat|broken|repair|work\s*order|maintenance/.test(text)) {
    return "Maintenance AI";
  }
  if (/tour|apply|application|lease|available|move[- ]?in|floor\s*plan|price|rent/.test(text)) {
    return "Leasing AI";
  }
  if (/renew|renewal/.test(text)) return "Renewals AI";
  if (/balance|pay|payment|owe|collections|late\s*fee/.test(text)) return "Collections AI";

  return "Resident AI";
}

/** ─── Picking the resident message + agent reply ────────────────────── */

function pickAgentReply(thread: ConversationItem): ConversationMessage | null {
  return (
    [...thread.messages]
      .reverse()
      .find((m) => m.role === "agent" && (m.type === "message" || !m.type)) ?? null
  );
}

function pickResidentMessage(
  thread: ConversationItem,
  reply: ConversationMessage | null,
): ConversationMessage | null {
  // The resident message we care about is the last resident message
  // *before* the picked Eli reply. If we can't align on the reply, fall
  // back to the newest resident message on the thread.
  if (!reply) {
    return (
      [...thread.messages]
        .reverse()
        .find((m) => m.role === "resident" && (m.type === "message" || !m.type)) ?? null
    );
  }
  const replyIdx = thread.messages.indexOf(reply);
  for (let i = replyIdx - 1; i >= 0; i--) {
    const m = thread.messages[i]!;
    if (m.role === "resident" && (m.type === "message" || !m.type)) return m;
  }
  return null;
}

/** ─── Domain-specific tool sequences (mock) ─────────────────────────── */

type ToolTemplate = {
  name: string;
  status: "SUCCESS" | "ERROR";
  durationMs: number;
  requestArgs: Record<string, unknown>;
  response: Record<string, unknown>;
};

function toolStep(id: number, template: ToolTemplate): TraceToolStep {
  const rpcId = `mcp-${template.name.split(".").slice(0, 2).join("-").replace(/\./g, "-")}-${String(id).padStart(3, "0")}`;
  const request = {
    jsonrpc: "2.0",
    id: rpcId,
    method: "tools/call",
    params: {
      name: template.name,
      arguments: template.requestArgs,
    },
  };
  const response = {
    jsonrpc: "2.0",
    result: template.response,
  };
  return {
    kind: "tool",
    name: template.name,
    status: template.status,
    durationMs: template.durationMs,
    request: JSON.stringify(request, null, 2),
    response: JSON.stringify(response, null, 2),
  };
}

function playbookStep(domain: EliAgentDomain, thread: ConversationItem): TracePlaybookStep {
  switch (domain) {
    case "Maintenance AI":
      return {
        kind: "playbook",
        title: "Emergency triage",
        durationMs: 4,
        domain,
        policyLabel: "WATER INTRUSION",
        body:
          "For active flooding: (1) instruct safe shutoff, (2) create emergency WO, (3) page on-call—do not troubleshoot beyond shutoff in SMS.",
      };
    case "Leasing AI":
      return {
        kind: "playbook",
        title: "Lead qualification",
        durationMs: 6,
        domain,
        policyLabel: "TOUR REQUEST",
        body:
          "Qualify move-in date + bedroom count, quote a live floor plan, offer the next 3 open tour slots — never quote a price we don't hold inventory for.",
      };
    case "Renewals AI":
      return {
        kind: "playbook",
        title: "Renewal offer lookup",
        durationMs: 5,
        domain,
        policyLabel: "OFFER PLAYBOOK",
        body:
          "Pull the resident's active renewal offer, restate the top tier, and confirm whether they need help comparing terms — escalate to staff for any rent-reduction ask.",
      };
    case "Collections AI":
      return {
        kind: "playbook",
        title: "Balance verification",
        durationMs: 7,
        domain,
        policyLabel: "OUTSTANDING BALANCE",
        body:
          "Read live ledger, confirm delinquency window, offer a compliant payment-plan template — never negotiate off-plan without staff approval.",
      };
    case "Resident AI":
    default:
      return {
        kind: "playbook",
        title: "Resident intent triage",
        durationMs: 4,
        domain,
        policyLabel: thread.preview ? "GENERAL INQUIRY" : "GENERAL",
        body:
          "Classify intent, resolve if answerable from resident-facing knowledge base, otherwise hand off to the right staff queue with a summary.",
      };
  }
}

function toolSequence(
  domain: EliAgentDomain,
  thread: ConversationItem,
  residentText: string,
): TraceToolStep[] {
  const unitId = `u-${thread.resident.split(" ").pop()?.toLowerCase() ?? "res"}-${(thread.unit ?? "000").replace(/\W/g, "").toLowerCase()}`;

  switch (domain) {
    case "Maintenance AI":
      return [
        toolStep(1, {
          name: "entrata.workorders.classifyUrgency",
          status: "SUCCESS",
          durationMs: 56,
          requestArgs: { text: residentText },
          response: { level: "EMERGENCY", category: "WATER_ACTIVE" },
        }),
        toolStep(2, {
          name: "entrata.workorders.createEmergency",
          status: "SUCCESS",
          durationMs: 118,
          requestArgs: {
            unitId,
            title: residentText.slice(0, 48),
            category: "WATER_ACTIVE",
          },
          response: {
            workOrderId: `MNT-${4800 + (thread.id.length % 200)}`,
          },
        }),
        toolStep(3, {
          name: "entrata.dispatch.pageOnCall",
          status: "SUCCESS",
          durationMs: 92,
          requestArgs: {
            workOrderId: `MNT-${4800 + (thread.id.length % 200)}`,
            severity: "EMERGENCY",
          },
          response: {
            paged: true,
            technician: "Marco T. (on-call)",
            eta: "22 min",
          },
        }),
      ];
    case "Leasing AI":
      return [
        toolStep(1, {
          name: "entrata.leasing.classifyInquiry",
          status: "SUCCESS",
          durationMs: 41,
          requestArgs: { text: residentText },
          response: { intent: "TOUR_REQUEST", confidence: 0.94 },
        }),
        toolStep(2, {
          name: "entrata.availability.searchFloorPlans",
          status: "SUCCESS",
          durationMs: 132,
          requestArgs: {
            propertyId: thread.property.toLowerCase().replace(/\W/g, "-"),
            bedrooms: 2,
            moveInAfter: "2026-10-15",
          },
          response: {
            floorPlans: [
              { id: "fp-b2", name: "B2 · 2×2", startingPrice: 2185, availableUnits: 3 },
            ],
          },
        }),
        toolStep(3, {
          name: "entrata.tours.listOpenSlots",
          status: "SUCCESS",
          durationMs: 74,
          requestArgs: { propertyId: thread.property.toLowerCase().replace(/\W/g, "-"), lookaheadDays: 5 },
          response: {
            slots: [
              { startsAt: "2026-09-27T15:00", agent: "Priya M." },
              { startsAt: "2026-09-28T11:30", agent: "Priya M." },
              { startsAt: "2026-09-28T16:00", agent: "Devon L." },
            ],
          },
        }),
      ];
    case "Renewals AI":
      return [
        toolStep(1, {
          name: "entrata.renewals.getActiveOffer",
          status: "SUCCESS",
          durationMs: 62,
          requestArgs: { residentId: unitId },
          response: {
            offerId: `REN-${9100 + (thread.id.length % 500)}`,
            tiers: [
              { termMonths: 12, monthlyRent: 2245 },
              { termMonths: 9, monthlyRent: 2310 },
            ],
            expiresOn: "2026-10-30",
          },
        }),
        toolStep(2, {
          name: "entrata.renewals.formatOfferSummary",
          status: "SUCCESS",
          durationMs: 22,
          requestArgs: { offerId: `REN-${9100 + (thread.id.length % 500)}`, channel: thread.channel },
          response: {
            summary: "12-month at $2,245/mo or 9-month at $2,310/mo. Expires Oct 30.",
          },
        }),
      ];
    case "Collections AI":
      return [
        toolStep(1, {
          name: "entrata.ledger.getBalance",
          status: "SUCCESS",
          durationMs: 47,
          requestArgs: { residentId: unitId },
          response: {
            balanceCents: 128400,
            oldestChargeAgeDays: 41,
            paymentPlanEligible: true,
          },
        }),
        toolStep(2, {
          name: "entrata.payments.buildPlanTemplate",
          status: "SUCCESS",
          durationMs: 88,
          requestArgs: { balanceCents: 128400, maxInstallments: 3 },
          response: {
            plan: [
              { dueOn: "2026-10-05", amountCents: 42800 },
              { dueOn: "2026-10-20", amountCents: 42800 },
              { dueOn: "2026-11-05", amountCents: 42800 },
            ],
          },
        }),
      ];
    case "Resident AI":
    default:
      return [
        toolStep(1, {
          name: "entrata.resident.classifyIntent",
          status: "SUCCESS",
          durationMs: 38,
          requestArgs: { text: residentText },
          response: { intent: "GENERAL_INQUIRY", confidence: 0.71 },
        }),
        toolStep(2, {
          name: "entrata.knowledge.search",
          status: "SUCCESS",
          durationMs: 104,
          requestArgs: {
            propertyId: thread.property.toLowerCase().replace(/\W/g, "-"),
            query: residentText.slice(0, 80),
            topK: 3,
          },
          response: {
            hits: [
              { docId: "kb-parking-guidelines", score: 0.87 },
              { docId: "kb-quiet-hours", score: 0.55 },
            ],
          },
        }),
      ];
  }
}

/** ─── User-View recap (plain-English) ───────────────────────────────── */

function userViewSteps(domain: EliAgentDomain): TraceUserStep[] {
  switch (domain) {
    case "Maintenance AI":
      return [
        { title: "Read the resident's message", detail: "Classified this as an active water-intrusion emergency." },
        { title: "Opened an emergency work order", detail: "Logged it against the resident's unit so on-call can see it." },
        { title: "Paged the on-call technician", detail: "Confirmed a technician was reached and shared their ETA back to the resident." },
      ];
    case "Leasing AI":
      return [
        { title: "Read the resident's message", detail: "Identified the inquiry as a tour request." },
        { title: "Checked live availability", detail: "Pulled current floor-plan options that match the move-in date." },
        { title: "Offered open tour slots", detail: "Surfaced the next three available tour times so the lead could pick one." },
      ];
    case "Renewals AI":
      return [
        { title: "Looked up the active renewal offer", detail: "Pulled the tiers currently offered to this resident." },
        { title: "Composed a clean recap", detail: "Restated the top tier in plain language for the resident." },
      ];
    case "Collections AI":
      return [
        { title: "Pulled the resident's live ledger", detail: "Confirmed the outstanding balance and how long it has been open." },
        { title: "Drafted a compliant payment plan", detail: "Prepared a 3-installment template staff can review before sending." },
      ];
    case "Resident AI":
    default:
      return [
        { title: "Classified the resident's intent", detail: "Determined this was a general inquiry with medium confidence." },
        { title: "Searched the property knowledge base", detail: "Found the two most relevant articles to ground the reply." },
      ];
  }
}

/** ─── Public entry point ────────────────────────────────────────────── */

export function buildTraceForThread(thread: ConversationItem): EliTrace {
  const domain = inferDomain(thread);
  const reply = pickAgentReply(thread);
  const resident = pickResidentMessage(thread, reply);
  const residentText = resident?.text ?? thread.preview ?? "";
  const replyText =
    reply?.text ??
    "This is where the Eli agent's reply on this thread would render — the trace above shows the tools that would have produced it.";
  return {
    sessionId: makeSessionId(thread.id),
    domain,
    residentMessage: residentText,
    agentReply: replyText,
    steps: [playbookStep(domain, thread), ...toolSequence(domain, thread, residentText)],
  };
}

export function buildUserViewForThread(thread: ConversationItem): TraceUserStep[] {
  return userViewSteps(inferDomain(thread));
}
