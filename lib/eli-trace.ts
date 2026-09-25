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
 * always produces the same session id, domain, sub-intent, and tool
 * sequence — reloads / hot-reloads never re-shuffle the demo state
 * under the demoer.
 *
 * Design principles:
 *   1. **Thread-relevant.** Every tool payload references the actual
 *      resident, unit, and property from the thread. Content-aware
 *      sub-intent detection (rent-increase pushback vs offer lookup,
 *      HVAC issue vs active flooding, etc.) picks a tool sequence that
 *      matches what the resident *actually said* rather than always
 *      running the same domain-default flow.
 *   2. **Believable reply.** When the thread has no agent-authored
 *      message (e.g. escalation threads where staff replied but Eli
 *      hasn't), we synthesize a plausible domain-appropriate draft so
 *      the "Agent reply" block never falls back to placeholder copy.
 *   3. **Deterministic.** No `Math.random()` — every choice is derived
 *      from the thread id + message content so a demoer can rehearse
 *      the same flow twice and see identical output.
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
  /** Text of the Eli-authored reply (real if present, synthesized if not). */
  agentReply: string;
  /**
   * `true` when `agentReply` is a synthesized draft because the thread
   * has no agent-authored message yet (e.g. escalation surfaces where
   * staff have taken over). The panel labels it "Agent draft" instead
   * of "Agent reply" so demoers can call it out honestly.
   */
  agentReplyIsDraft: boolean;
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

/** ─── Domain + sub-intent inference ─────────────────────────────────── */

type MaintenanceSubIntent = "flood_emergency" | "hvac" | "lock" | "general";
type LeasingSubIntent = "tour_request" | "availability" | "application";
type RenewalsSubIntent = "rent_increase_pushback" | "offer_restate" | "term_change";
type CollectionsSubIntent = "balance_inquiry" | "split_payment" | "late_fee";
type ResidentSubIntent = "parking" | "amenity" | "package" | "general";

type SubIntent =
  | MaintenanceSubIntent
  | LeasingSubIntent
  | RenewalsSubIntent
  | CollectionsSubIntent
  | ResidentSubIntent;

/**
 * Guess which Eli domain most likely produced the last reply on a
 * thread. We look at the labels first (highest signal, staff-authored),
 * then fall back to keyword matching on the resident's most recent
 * inbound message. Everything defaults to Resident AI so the trace
 * still renders for uncategorized demo threads.
 */
function inferDomain(thread: ConversationItem, residentText: string): EliAgentDomain {
  const labelBlob = thread.labels.join(" ").toLowerCase();
  if (/maint|leak|flood|hvac|repair|work\s*order/.test(labelBlob)) return "Maintenance AI";
  if (/renew/.test(labelBlob)) return "Renewals AI";
  if (/collect|payment|delinq|balance/.test(labelBlob)) return "Collections AI";
  if (/tour|apply|lease|guest|prospect|showing|leasing/.test(labelBlob)) return "Leasing AI";

  const text = residentText.toLowerCase();
  if (/flood|leak|water|toilet|sink|hvac|ac\b|heat|broken|repair|thermostat|coil|work\s*order|maintenance|lock|keypad/.test(text)) {
    return "Maintenance AI";
  }
  if (/renew|renewal|rent\s+increase|rent\s+went\s+up|too\s+(much|high)/.test(text)) {
    return "Renewals AI";
  }
  if (/balance|pay|payment|owe|collections|late\s*fee|split.*payment/.test(text)) {
    return "Collections AI";
  }
  if (/tour|apply|application|lease|available|move[- ]?in|floor\s*plan|price|rent/.test(text)) {
    return "Leasing AI";
  }
  return "Resident AI";
}

function inferSubIntent(domain: EliAgentDomain, residentText: string): SubIntent {
  const t = residentText.toLowerCase();
  switch (domain) {
    case "Maintenance AI":
      if (/flood|active|pouring|everywhere|help/.test(t)) return "flood_emergency";
      if (/hvac|ac\b|air|heat|thermostat|coil|cool|blow/.test(t)) return "hvac";
      if (/lock|keypad|key\s*fob|deadbolt|door/.test(t)) return "lock";
      return "general";
    case "Leasing AI":
      if (/tour|showing|visit|come\s+in|see\s+the/.test(t)) return "tour_request";
      if (/apply|application|guarantor|co[- ]?signer/.test(t)) return "application";
      return "availability";
    case "Renewals AI":
      if (/increase|too\s+(much|high)|expensive|went\s+up|going\s+up|surprised|expected/.test(t)) {
        return "rent_increase_pushback";
      }
      if (/shorter|longer|month|term|length/.test(t)) return "term_change";
      return "offer_restate";
    case "Collections AI":
      if (/split|two\s+payments|installment|plan/.test(t)) return "split_payment";
      if (/late\s*fee|waive/.test(t)) return "late_fee";
      return "balance_inquiry";
    case "Resident AI":
    default:
      if (/parking|park|space|spot/.test(t)) return "parking";
      if (/amenity|gym|pool|rooftop|lounge|hours/.test(t)) return "amenity";
      if (/package|locker|delivery|mail/.test(t)) return "package";
      return "general";
  }
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

/** ─── Thread-specific identifiers ───────────────────────────────────── */

type ThreadContext = {
  residentId: string;
  unitId: string;
  propertyId: string;
  residentFirstName: string;
  residentFullName: string;
  unitLabel: string;
  propertyName: string;
};

function buildThreadContext(thread: ConversationItem): ThreadContext {
  const lastName = thread.resident.split(" ").pop()?.toLowerCase() ?? "res";
  const unitSlug = (thread.unit ?? "000").replace(/\W/g, "").toLowerCase();
  const propertySlug = thread.property.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const [firstName] = thread.resident.split(" ");
  return {
    residentId: `res_${lastName}_${unitSlug}`,
    unitId: `unit_${propertySlug}_${unitSlug}`,
    propertyId: `prop_${propertySlug}`,
    residentFirstName: firstName ?? thread.resident,
    residentFullName: thread.resident,
    unitLabel: thread.unit ?? "—",
    propertyName: thread.property,
  };
}

/** ─── Tool step helper ──────────────────────────────────────────────── */

type ToolTemplate = {
  name: string;
  status?: "SUCCESS" | "ERROR";
  durationMs: number;
  requestArgs: Record<string, unknown>;
  response: Record<string, unknown>;
};

function toolStep(id: number, template: ToolTemplate): TraceToolStep {
  const shortName = template.name.split(".").slice(-2).join("-");
  const rpcId = `mcp-${shortName}-${String(id).padStart(3, "0")}`;
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
    status: template.status ?? "SUCCESS",
    durationMs: template.durationMs,
    request: JSON.stringify(request, null, 2),
    response: JSON.stringify(response, null, 2),
  };
}

/** ─── Playbook definitions (per sub-intent) ─────────────────────────── */

function playbookStep(
  domain: EliAgentDomain,
  sub: SubIntent,
): TracePlaybookStep {
  switch (domain) {
    case "Maintenance AI": {
      const subMap: Record<MaintenanceSubIntent, Omit<TracePlaybookStep, "kind" | "domain">> = {
        flood_emergency: {
          title: "Emergency triage",
          durationMs: 4,
          policyLabel: "WATER INTRUSION",
          body:
            "For active flooding: (1) instruct safe shutoff, (2) create emergency WO, (3) page on-call—do not troubleshoot beyond shutoff in SMS.",
        },
        hvac: {
          title: "HVAC triage",
          durationMs: 5,
          policyLabel: "CLIMATE CONTROL",
          body:
            "For no-cool / no-heat: (1) confirm thermostat state + coil reset, (2) open standard WO with HVAC category, (3) schedule tech within same-day window if habitable temperature is at risk.",
        },
        lock: {
          title: "Access-control triage",
          durationMs: 5,
          policyLabel: "LOCK / KEYPAD FAILURE",
          body:
            "For dead keypads / lockouts: (1) verify resident is on the lease, (2) open URGENT WO (lockouts block habitability), (3) hand off to on-call locksmith rotation.",
        },
        general: {
          title: "Work-order triage",
          durationMs: 4,
          policyLabel: "STANDARD REQUEST",
          body:
            "Classify the request, confirm the reported symptom in plain English, open a routine WO with the correct category, and offer the next two available service windows.",
        },
      };
      const body = subMap[sub as MaintenanceSubIntent] ?? subMap.general;
      return { kind: "playbook", domain, ...body };
    }
    case "Leasing AI": {
      const subMap: Record<LeasingSubIntent, Omit<TracePlaybookStep, "kind" | "domain">> = {
        tour_request: {
          title: "Tour scheduling",
          durationMs: 6,
          policyLabel: "TOUR REQUEST",
          body:
            "Qualify move-in date + bedroom count, quote a live floor plan, offer the next 3 open tour slots — never quote a price we don't hold inventory for.",
        },
        availability: {
          title: "Availability lookup",
          durationMs: 5,
          policyLabel: "INVENTORY QUERY",
          body:
            "Pull live floor-plan availability that matches the requested bedroom count and window. If nothing fits, offer the closest match and add the lead to the waitlist for the exact criteria.",
        },
        application: {
          title: "Application intake",
          durationMs: 7,
          policyLabel: "APPLICATION ASSIST",
          body:
            "Confirm income + guarantor requirements, send the pre-filled application link, and open a follow-up 24h out if the application isn't started.",
        },
      };
      const body = subMap[sub as LeasingSubIntent] ?? subMap.tour_request;
      return { kind: "playbook", domain, ...body };
    }
    case "Renewals AI": {
      const subMap: Record<RenewalsSubIntent, Omit<TracePlaybookStep, "kind" | "domain">> = {
        offer_restate: {
          title: "Renewal offer restate",
          durationMs: 5,
          policyLabel: "OFFER PLAYBOOK",
          body:
            "Pull the resident's active renewal offer, restate the top tier in plain language, and confirm whether they need help comparing terms.",
        },
        rent_increase_pushback: {
          title: "Rent-negotiation triage",
          durationMs: 6,
          policyLabel: "RATE PUSHBACK",
          body:
            "For rent-increase objections: (1) verify the offered tiers vs. current rent, (2) check the property's rent-reduction policy, (3) escalate to a human renewals specialist for any concession ask — never negotiate rent inline.",
        },
        term_change: {
          title: "Alternate-term lookup",
          durationMs: 5,
          policyLabel: "TERM VARIATION",
          body:
            "Pull the alternate lease-term rates (6/9/13-month), quote the term the resident asked about, and flag if it falls outside the pricing envelope.",
        },
      };
      const body = subMap[sub as RenewalsSubIntent] ?? subMap.offer_restate;
      return { kind: "playbook", domain, ...body };
    }
    case "Collections AI": {
      const subMap: Record<CollectionsSubIntent, Omit<TracePlaybookStep, "kind" | "domain">> = {
        balance_inquiry: {
          title: "Balance verification",
          durationMs: 6,
          policyLabel: "OUTSTANDING BALANCE",
          body:
            "Read the live ledger, confirm the delinquency window, restate the balance in dollars, and offer either autopay setup or a payment-plan template.",
        },
        split_payment: {
          title: "Split-payment intake",
          durationMs: 7,
          policyLabel: "PAYMENT PLAN",
          body:
            "For split-payment asks: verify eligibility, build a compliant plan template with equal installments, and post it for staff approval — never confirm the plan without staff sign-off.",
        },
        late_fee: {
          title: "Late-fee review",
          durationMs: 6,
          policyLabel: "FEE WAIVER",
          body:
            "Check the property's late-fee waiver policy and the resident's prior waiver history. If eligible, stage a one-time waiver for staff approval; otherwise explain the fee clearly.",
        },
      };
      const body = subMap[sub as CollectionsSubIntent] ?? subMap.balance_inquiry;
      return { kind: "playbook", domain, ...body };
    }
    case "Resident AI":
    default: {
      const subMap: Record<ResidentSubIntent, Omit<TracePlaybookStep, "kind" | "domain">> = {
        parking: {
          title: "Parking-policy lookup",
          durationMs: 4,
          policyLabel: "PARKING",
          body:
            "Pull the property's current parking-policy article + waitlist state, answer with the resident's exact eligibility, and add them to the waitlist if they qualify and aren't already on it.",
        },
        amenity: {
          title: "Amenity-hours lookup",
          durationMs: 4,
          policyLabel: "AMENITIES",
          body:
            "Look up the amenity's active hours + any current outage or maintenance window, and answer with today's status.",
        },
        package: {
          title: "Package-locker lookup",
          durationMs: 5,
          policyLabel: "PACKAGES",
          body:
            "Look up the resident's current locker assignment + any code resets in the last 24h, and answer with the active locker + code.",
        },
        general: {
          title: "Resident intent triage",
          durationMs: 4,
          policyLabel: "GENERAL INQUIRY",
          body:
            "Classify intent, resolve if answerable from the resident-facing knowledge base, otherwise hand off to the right staff queue with a summary.",
        },
      };
      const body = subMap[sub as ResidentSubIntent] ?? subMap.general;
      return { kind: "playbook", domain, ...body };
    }
  }
}

/** ─── Tool sequences (per sub-intent) ───────────────────────────────── */

function toolSequence(
  domain: EliAgentDomain,
  sub: SubIntent,
  ctx: ThreadContext,
  residentText: string,
  thread: ConversationItem,
): TraceToolStep[] {
  const truncMsg = residentText.slice(0, 120);
  const truncTitle = residentText.slice(0, 48);

  switch (domain) {
    case "Maintenance AI":
      switch (sub as MaintenanceSubIntent) {
        case "flood_emergency": {
          const woId = `MNT-${4800 + (thread.id.length % 200)}`;
          return [
            toolStep(1, {
              name: "entrata.workorders.classifyUrgency",
              durationMs: 56,
              requestArgs: { text: truncMsg, unitId: ctx.unitId },
              response: { level: "EMERGENCY", category: "WATER_ACTIVE" },
            }),
            toolStep(2, {
              name: "entrata.workorders.createEmergency",
              durationMs: 118,
              requestArgs: {
                unitId: ctx.unitId,
                residentId: ctx.residentId,
                title: truncTitle,
                category: "WATER_ACTIVE",
              },
              response: { workOrderId: woId, status: "OPEN" },
            }),
            toolStep(3, {
              name: "entrata.dispatch.pageOnCall",
              durationMs: 92,
              requestArgs: { workOrderId: woId, severity: "EMERGENCY", propertyId: ctx.propertyId },
              response: { paged: true, technician: "Marco T. (on-call)", eta: "22 min" },
            }),
          ];
        }
        case "hvac": {
          const woId = `MNT-${5100 + (thread.id.length % 200)}`;
          return [
            toolStep(1, {
              name: "entrata.workorders.classifyUrgency",
              durationMs: 44,
              requestArgs: { text: truncMsg, unitId: ctx.unitId },
              response: { level: "URGENT", category: "HVAC_NO_COOL" },
            }),
            toolStep(2, {
              name: "entrata.workorders.create",
              durationMs: 96,
              requestArgs: {
                unitId: ctx.unitId,
                residentId: ctx.residentId,
                title: truncTitle,
                category: "HVAC_NO_COOL",
                priority: "URGENT",
              },
              response: { workOrderId: woId, status: "OPEN" },
            }),
            toolStep(3, {
              name: "entrata.dispatch.findAvailableTech",
              durationMs: 137,
              requestArgs: {
                propertyId: ctx.propertyId,
                skill: "HVAC",
                window: "same_day",
              },
              response: {
                assigned: true,
                technician: "Ricardo M.",
                arrivalWindow: "6:00pm – 8:00pm",
              },
            }),
          ];
        }
        case "lock": {
          const woId = `MNT-${5300 + (thread.id.length % 200)}`;
          return [
            toolStep(1, {
              name: "entrata.workorders.classifyUrgency",
              durationMs: 41,
              requestArgs: { text: truncMsg, unitId: ctx.unitId },
              response: { level: "URGENT", category: "ACCESS_CONTROL" },
            }),
            toolStep(2, {
              name: "entrata.residents.verifyOnLease",
              durationMs: 62,
              requestArgs: { residentId: ctx.residentId, unitId: ctx.unitId },
              response: { onLease: true, leaseEnd: "2027-05-31" },
            }),
            toolStep(3, {
              name: "entrata.workorders.create",
              durationMs: 88,
              requestArgs: {
                unitId: ctx.unitId,
                residentId: ctx.residentId,
                title: truncTitle,
                category: "ACCESS_CONTROL",
                priority: "URGENT",
              },
              response: { workOrderId: woId, status: "OPEN" },
            }),
            toolStep(4, {
              name: "entrata.dispatch.pageOnCall",
              durationMs: 74,
              requestArgs: { workOrderId: woId, severity: "URGENT", propertyId: ctx.propertyId },
              response: { paged: true, technician: "On-call locksmith", eta: "35 min" },
            }),
          ];
        }
        case "general":
        default: {
          const woId = `MNT-${5500 + (thread.id.length % 200)}`;
          return [
            toolStep(1, {
              name: "entrata.workorders.classifyUrgency",
              durationMs: 42,
              requestArgs: { text: truncMsg, unitId: ctx.unitId },
              response: { level: "ROUTINE", category: "GENERAL_REPAIR" },
            }),
            toolStep(2, {
              name: "entrata.workorders.create",
              durationMs: 84,
              requestArgs: {
                unitId: ctx.unitId,
                residentId: ctx.residentId,
                title: truncTitle,
                category: "GENERAL_REPAIR",
                priority: "ROUTINE",
              },
              response: { workOrderId: woId, status: "OPEN" },
            }),
            toolStep(3, {
              name: "entrata.dispatch.suggestSlots",
              durationMs: 66,
              requestArgs: { propertyId: ctx.propertyId, category: "GENERAL_REPAIR", lookaheadDays: 4 },
              response: {
                slots: [
                  { date: "2026-09-26", window: "10:00am – 12:00pm" },
                  { date: "2026-09-27", window: "1:00pm – 3:00pm" },
                ],
              },
            }),
          ];
        }
      }

    case "Leasing AI":
      switch (sub as LeasingSubIntent) {
        case "tour_request":
          return [
            toolStep(1, {
              name: "entrata.leasing.classifyInquiry",
              durationMs: 41,
              requestArgs: { text: truncMsg, propertyId: ctx.propertyId },
              response: { intent: "TOUR_REQUEST", confidence: 0.94 },
            }),
            toolStep(2, {
              name: "entrata.availability.searchFloorPlans",
              durationMs: 132,
              requestArgs: {
                propertyId: ctx.propertyId,
                bedrooms: 1,
                moveInAfter: "2026-10-15",
              },
              response: {
                floorPlans: [
                  { id: "fp-a1", name: "A1 · 1×1", startingPrice: 1795, availableUnits: 4 },
                  { id: "fp-a2", name: "A2 · 1×1 den", startingPrice: 1875, availableUnits: 2 },
                ],
              },
            }),
            toolStep(3, {
              name: "entrata.tours.listOpenSlots",
              durationMs: 74,
              requestArgs: { propertyId: ctx.propertyId, lookaheadDays: 5 },
              response: {
                slots: [
                  { startsAt: "2026-09-27T10:00", agent: "Priya M." },
                  { startsAt: "2026-09-27T11:00", agent: "Priya M." },
                  { startsAt: "2026-09-28T14:00", agent: "Devon L." },
                ],
              },
            }),
          ];
        case "availability":
          return [
            toolStep(1, {
              name: "entrata.leasing.classifyInquiry",
              durationMs: 38,
              requestArgs: { text: truncMsg, propertyId: ctx.propertyId },
              response: { intent: "AVAILABILITY_CHECK", confidence: 0.88 },
            }),
            toolStep(2, {
              name: "entrata.availability.searchFloorPlans",
              durationMs: 129,
              requestArgs: {
                propertyId: ctx.propertyId,
                bedrooms: 2,
                moveInAfter: "2026-10-01",
                moveInBefore: "2026-12-01",
              },
              response: {
                floorPlans: [
                  { id: "fp-b1", name: "B1 · 2×1", startingPrice: 2085, availableUnits: 1 },
                  { id: "fp-b2", name: "B2 · 2×2", startingPrice: 2245, availableUnits: 3 },
                ],
              },
            }),
          ];
        case "application":
          return [
            toolStep(1, {
              name: "entrata.leasing.classifyInquiry",
              durationMs: 39,
              requestArgs: { text: truncMsg, propertyId: ctx.propertyId },
              response: { intent: "APPLICATION_ASSIST", confidence: 0.91 },
            }),
            toolStep(2, {
              name: "entrata.applications.getRequirements",
              durationMs: 71,
              requestArgs: { propertyId: ctx.propertyId },
              response: {
                incomeMultiple: 2.5,
                guarantorAllowed: true,
                depositCents: 50000,
              },
            }),
            toolStep(3, {
              name: "entrata.applications.sendPrefilledLink",
              durationMs: 82,
              requestArgs: { propertyId: ctx.propertyId, contactHint: ctx.residentFullName },
              response: {
                sent: true,
                linkExpiresAt: "2026-10-02T23:59",
              },
            }),
          ];
      }
      return [];

    case "Renewals AI":
      switch (sub as RenewalsSubIntent) {
        case "offer_restate": {
          const offerId = `REN-${9100 + (thread.id.length % 500)}`;
          return [
            toolStep(1, {
              name: "entrata.renewals.getActiveOffer",
              durationMs: 62,
              requestArgs: { residentId: ctx.residentId, unitId: ctx.unitId },
              response: {
                offerId,
                tiers: [
                  { termMonths: 12, monthlyRent: 2245 },
                  { termMonths: 9, monthlyRent: 2310 },
                ],
                expiresOn: "2026-10-30",
              },
            }),
            toolStep(2, {
              name: "entrata.renewals.formatOfferSummary",
              durationMs: 22,
              requestArgs: { offerId, channel: thread.channel },
              response: {
                summary: "12-month at $2,245/mo or 9-month at $2,310/mo. Expires Oct 30.",
              },
            }),
          ];
        }
        case "rent_increase_pushback": {
          const offerId = `REN-${9100 + (thread.id.length % 500)}`;
          const escalationId = `ESC-${7200 + (thread.id.length % 300)}`;
          return [
            toolStep(1, {
              name: "entrata.renewals.getActiveOffer",
              durationMs: 61,
              requestArgs: { residentId: ctx.residentId, unitId: ctx.unitId },
              response: {
                offerId,
                currentMonthlyRent: 2085,
                offeredTiers: [
                  { termMonths: 12, monthlyRent: 2245 },
                  { termMonths: 9, monthlyRent: 2310 },
                ],
                increasePercent: 7.7,
              },
            }),
            toolStep(2, {
              name: "entrata.policy.getRentReductionAuthority",
              durationMs: 48,
              requestArgs: { propertyId: ctx.propertyId, role: "AI_AGENT" },
              response: {
                allowedInline: false,
                requiresStaffApproval: true,
                staffQueue: "renewals_specialists",
              },
            }),
            toolStep(3, {
              name: "entrata.escalations.create",
              durationMs: 74,
              requestArgs: {
                threadId: thread.id,
                residentId: ctx.residentId,
                reason: "RATE_PUSHBACK",
                summary: truncMsg,
                offerId,
              },
              response: {
                escalationId,
                assignedTo: "renewals_specialists",
                slaMinutes: 240,
              },
            }),
          ];
        }
        case "term_change": {
          const offerId = `REN-${9100 + (thread.id.length % 500)}`;
          return [
            toolStep(1, {
              name: "entrata.renewals.getActiveOffer",
              durationMs: 58,
              requestArgs: { residentId: ctx.residentId, unitId: ctx.unitId },
              response: {
                offerId,
                offeredTiers: [
                  { termMonths: 12, monthlyRent: 2245 },
                  { termMonths: 9, monthlyRent: 2310 },
                ],
              },
            }),
            toolStep(2, {
              name: "entrata.renewals.getAlternateTerms",
              durationMs: 91,
              requestArgs: { offerId, requestedTerms: [6, 13] },
              response: {
                alternateTiers: [
                  { termMonths: 6, monthlyRent: 2410, availability: "AVAILABLE" },
                  { termMonths: 13, monthlyRent: 2225, availability: "AVAILABLE" },
                ],
              },
            }),
          ];
        }
      }
      return [];

    case "Collections AI":
      switch (sub as CollectionsSubIntent) {
        case "balance_inquiry":
          return [
            toolStep(1, {
              name: "entrata.ledger.getBalance",
              durationMs: 47,
              requestArgs: { residentId: ctx.residentId, unitId: ctx.unitId },
              response: {
                balanceCents: 128400,
                oldestChargeAgeDays: 41,
                paymentPlanEligible: true,
              },
            }),
            toolStep(2, {
              name: "entrata.ledger.itemizeCharges",
              durationMs: 62,
              requestArgs: { residentId: ctx.residentId, sinceDaysAgo: 60 },
              response: {
                lines: [
                  { chargeType: "RENT", postedOn: "2026-08-01", amountCents: 208500 },
                  { chargeType: "LATE_FEE", postedOn: "2026-08-06", amountCents: 5000 },
                  { chargeType: "PAYMENT", postedOn: "2026-08-15", amountCents: -85100 },
                ],
              },
            }),
          ];
        case "split_payment":
          return [
            toolStep(1, {
              name: "entrata.ledger.getBalance",
              durationMs: 45,
              requestArgs: { residentId: ctx.residentId, unitId: ctx.unitId },
              response: { balanceCents: 128400, paymentPlanEligible: true },
            }),
            toolStep(2, {
              name: "entrata.payments.buildPlanTemplate",
              durationMs: 88,
              requestArgs: { balanceCents: 128400, maxInstallments: 2, residentId: ctx.residentId },
              response: {
                plan: [
                  { dueOn: "2026-10-05", amountCents: 64200 },
                  { dueOn: "2026-10-20", amountCents: 64200 },
                ],
                requiresStaffApproval: true,
              },
            }),
          ];
        case "late_fee":
          return [
            toolStep(1, {
              name: "entrata.policy.getLateFeeWaiverPolicy",
              durationMs: 42,
              requestArgs: { propertyId: ctx.propertyId },
              response: {
                autoWaiverAllowed: false,
                maxLifetimeWaivers: 1,
              },
            }),
            toolStep(2, {
              name: "entrata.residents.getWaiverHistory",
              durationMs: 51,
              requestArgs: { residentId: ctx.residentId },
              response: { priorWaivers: 0, eligible: true },
            }),
            toolStep(3, {
              name: "entrata.escalations.create",
              durationMs: 68,
              requestArgs: {
                threadId: thread.id,
                residentId: ctx.residentId,
                reason: "LATE_FEE_WAIVER",
                amountCents: 5000,
              },
              response: { escalationId: `ESC-${8100 + (thread.id.length % 200)}`, assignedTo: "accounting" },
            }),
          ];
      }
      return [];

    case "Resident AI":
    default:
      switch (sub as ResidentSubIntent) {
        case "parking":
          return [
            toolStep(1, {
              name: "entrata.resident.classifyIntent",
              durationMs: 36,
              requestArgs: { text: truncMsg, propertyId: ctx.propertyId },
              response: { intent: "PARKING_WAITLIST", confidence: 0.83 },
            }),
            toolStep(2, {
              name: "entrata.knowledge.get",
              durationMs: 71,
              requestArgs: { propertyId: ctx.propertyId, docId: "kb-parking-guidelines" },
              response: {
                title: "Parking · Guidelines",
                summary:
                  "Reserved parking is first-come waitlist for residents in good standing; open to all lease starts.",
              },
            }),
            toolStep(3, {
              name: "entrata.parking.addToWaitlist",
              durationMs: 82,
              requestArgs: { residentId: ctx.residentId, propertyId: ctx.propertyId, kind: "RESERVED" },
              response: { added: true, position: 4, estimatedWeeks: 6 },
            }),
          ];
        case "amenity":
          return [
            toolStep(1, {
              name: "entrata.resident.classifyIntent",
              durationMs: 34,
              requestArgs: { text: truncMsg, propertyId: ctx.propertyId },
              response: { intent: "AMENITY_HOURS", confidence: 0.88 },
            }),
            toolStep(2, {
              name: "entrata.amenities.getStatus",
              durationMs: 62,
              requestArgs: { propertyId: ctx.propertyId, kind: "GYM" },
              response: {
                openNow: true,
                todayHours: "5:00am – 11:00pm",
                notes: "Deck-work impact: unaffected.",
              },
            }),
          ];
        case "package":
          return [
            toolStep(1, {
              name: "entrata.resident.classifyIntent",
              durationMs: 32,
              requestArgs: { text: truncMsg, propertyId: ctx.propertyId },
              response: { intent: "PACKAGE_LOCKER", confidence: 0.9 },
            }),
            toolStep(2, {
              name: "entrata.packages.getAssignment",
              durationMs: 58,
              requestArgs: { residentId: ctx.residentId },
              response: { lockerId: "B14", codeResetAt: "2026-09-25T09:12" },
            }),
          ];
        case "general":
        default:
          return [
            toolStep(1, {
              name: "entrata.resident.classifyIntent",
              durationMs: 38,
              requestArgs: { text: truncMsg, propertyId: ctx.propertyId },
              response: { intent: "GENERAL_INQUIRY", confidence: 0.71 },
            }),
            toolStep(2, {
              name: "entrata.knowledge.search",
              durationMs: 104,
              requestArgs: {
                propertyId: ctx.propertyId,
                query: truncMsg,
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
}

/** ─── Synthesized drafts for threads without an agent reply ─────────── */

function synthesizeAgentDraft(
  domain: EliAgentDomain,
  sub: SubIntent,
  ctx: ThreadContext,
): string {
  const first = ctx.residentFirstName;
  switch (domain) {
    case "Maintenance AI":
      switch (sub as MaintenanceSubIntent) {
        case "flood_emergency":
          return `Hi ${first} — I'm so sorry, let me help right away. This is being flagged as an emergency. First, please locate the shutoff valve under your sink and turn it clockwise to stop the water. I'm dispatching our on-call technician now and will text you their ETA in a moment.`;
        case "hvac":
          return `Hi ${first} — I've opened an urgent HVAC ticket for ${ctx.unitLabel} and reached Ricardo from our on-call team; he'll arrive in the 6:00 – 8:00pm window tonight. In the meantime, try setting the thermostat to Off for ~15 minutes so the coil can thaw, then back to Cool at 72°.`;
        case "lock":
          return `Hi ${first} — I've verified you're on the lease for ${ctx.unitLabel} and opened an urgent access-control ticket. Our on-call locksmith is on the way with an ETA of about 35 minutes. I'll send you a text the moment they're on-site.`;
        default:
          return `Hi ${first} — I've opened a work order for ${ctx.unitLabel} and pulled two available service windows: tomorrow 10:00am – 12:00pm, or Saturday 1:00pm – 3:00pm. Which works better for you?`;
      }
    case "Leasing AI":
      switch (sub as LeasingSubIntent) {
        case "tour_request":
          return `Great news — I have tour times open Saturday at 10:00am, 11:00am, or Sunday at 2:00pm at ${ctx.propertyName}. Which works best for you?`;
        case "availability":
          return `Yes — we currently have B2 (2×2) starting at $2,245/mo with 3 units available, plus one B1 (2×1) at $2,085. Would you like me to hold a tour on either?`;
        case "application":
          return `Happy to help! I've just sent a pre-filled application link to the email on file. Our minimum income requirement is 2.5× monthly rent and guarantors are allowed. Let me know if you hit any snags.`;
      }
      break;
    case "Renewals AI":
      switch (sub as RenewalsSubIntent) {
        case "rent_increase_pushback":
          return `Hi ${first} — I hear you, and I want to make sure you get a real answer on this. I'm not able to adjust the offered rate myself, but I've flagged this for our renewals specialist team so someone can look at your history and options. You should hear back within a few hours.`;
        case "term_change":
          return `Absolutely — we can look at other terms. A 6-month renewal comes in at $2,410/mo, and a 13-month at $2,225/mo. Both are available for ${ctx.unitLabel}. Want me to lock either in?`;
        case "offer_restate":
        default:
          return `Hi ${first} — quick recap of your active renewal offer for ${ctx.unitLabel}: 12-month at $2,245/mo or 9-month at $2,310/mo. The offer holds until Oct 30. Happy to walk through either option.`;
      }
    case "Collections AI":
      switch (sub as CollectionsSubIntent) {
        case "split_payment":
          return `Hi ${first} — I've drafted a 2-installment split ($642 due Oct 5, $642 due Oct 20). One of our accounting staff needs to approve it before it's active; you'll get a confirmation once it's live.`;
        case "late_fee":
          return `Hi ${first} — I've flagged your late-fee for review. Based on your history, it looks like you're eligible for a one-time waiver; I've sent it to accounting for the final call. I'll follow up as soon as I hear back.`;
        case "balance_inquiry":
        default:
          return `Hi ${first} — your current balance for ${ctx.unitLabel} is $1,284.00 (rent posted Aug 1 minus your Aug 15 payment). Want me to set up autopay for next month, or draft a payment plan?`;
      }
    case "Resident AI":
    default:
      switch (sub as ResidentSubIntent) {
        case "parking":
          return `Hi ${first} — yes, you can still get on the reserved-parking waitlist. I've added you at position #4; typical wait is about 6 weeks. I'll ping you the moment a spot opens up.`;
        case "amenity":
          return `Hi ${first} — the gym is open today from 5:00am to 11:00pm. The deck work isn't affecting it — you're good to go!`;
        case "package":
          return `Hi ${first} — confirmed: your locker is B14 and the code was reset this morning at 9:12am. You should have received the new code via text — let me know if it didn't come through.`;
        case "general":
        default:
          return `Hi ${first} — thanks for reaching out! I've pulled the relevant articles from our resident guide and will follow up with the specific answer in a moment.`;
      }
  }
  return `Hi ${first} — thanks for reaching out. I've captured your message and will follow up shortly.`;
}

/** ─── User-View recap (plain-English) ───────────────────────────────── */

function userViewSteps(domain: EliAgentDomain, sub: SubIntent): TraceUserStep[] {
  switch (domain) {
    case "Maintenance AI":
      switch (sub as MaintenanceSubIntent) {
        case "flood_emergency":
          return [
            { title: "Read the resident's message", detail: "Classified this as an active water-intrusion emergency." },
            { title: "Opened an emergency work order", detail: "Logged it against the resident's unit so on-call can see it." },
            { title: "Paged the on-call technician", detail: "Confirmed a technician was reached and shared their ETA back to the resident." },
          ];
        case "hvac":
          return [
            { title: "Read the resident's message", detail: "Classified this as an urgent HVAC (no-cool) request." },
            { title: "Opened an urgent work order", detail: "Logged it under HVAC_NO_COOL against the unit." },
            { title: "Found an available HVAC tech", detail: "Confirmed same-day availability and shared the arrival window." },
          ];
        case "lock":
          return [
            { title: "Read the resident's message", detail: "Classified this as an urgent access-control request." },
            { title: "Verified the resident is on the lease", detail: "Confirmed lease standing before dispatching." },
            { title: "Opened an urgent work order", detail: "Logged the lock/keypad failure and paged the on-call locksmith." },
            { title: "Shared ETA back to the resident", detail: "Estimated 35-minute arrival window." },
          ];
        default:
          return [
            { title: "Read the resident's message", detail: "Classified as a routine repair request." },
            { title: "Opened a routine work order", detail: "Logged it against the unit with the correct category." },
            { title: "Suggested two service windows", detail: "Pulled the next available slots for the resident to pick." },
          ];
      }
    case "Leasing AI":
      switch (sub as LeasingSubIntent) {
        case "tour_request":
          return [
            { title: "Read the resident's message", detail: "Identified the inquiry as a tour request." },
            { title: "Checked live availability", detail: "Pulled current floor-plan options that match the move-in date." },
            { title: "Offered open tour slots", detail: "Surfaced the next three available tour times so the lead could pick one." },
          ];
        case "availability":
          return [
            { title: "Read the resident's message", detail: "Identified this as an availability inquiry." },
            { title: "Searched live floor plans", detail: "Pulled the 2-bedroom options fitting the requested window." },
          ];
        case "application":
          return [
            { title: "Read the resident's message", detail: "Identified this as an application-assistance ask." },
            { title: "Pulled application requirements", detail: "Confirmed income multiple + guarantor policy." },
            { title: "Sent a pre-filled application link", detail: "Emailed the lead a personalized link with a 7-day expiry." },
          ];
      }
      return [];
    case "Renewals AI":
      switch (sub as RenewalsSubIntent) {
        case "rent_increase_pushback":
          return [
            { title: "Pulled the active renewal offer", detail: "Confirmed the current rent, offered tiers, and the % increase." },
            { title: "Checked rent-reduction authority", detail: "Policy says AI agents cannot negotiate rent inline; staff approval required." },
            { title: "Escalated to the renewals specialists", detail: "Handed off to a human with the resident's context and offer id." },
          ];
        case "term_change":
          return [
            { title: "Pulled the active renewal offer", detail: "Loaded the current offered tiers." },
            { title: "Looked up alternate terms", detail: "Pulled 6-month and 13-month pricing to answer the resident's ask." },
          ];
        case "offer_restate":
        default:
          return [
            { title: "Pulled the active renewal offer", detail: "Loaded the tiers currently offered to this resident." },
            { title: "Formatted a clean recap", detail: "Restated the top tier in plain language for the resident." },
          ];
      }
    case "Collections AI":
      switch (sub as CollectionsSubIntent) {
        case "balance_inquiry":
          return [
            { title: "Pulled the resident's live ledger", detail: "Confirmed the balance + how long it's been open." },
            { title: "Itemized recent charges", detail: "Broke down the last 60 days of rent, fees, and payments." },
          ];
        case "split_payment":
          return [
            { title: "Confirmed eligibility", detail: "Verified the resident's balance qualifies for a plan." },
            { title: "Drafted a compliant plan", detail: "Built a 2-installment template pending staff approval." },
          ];
        case "late_fee":
          return [
            { title: "Checked the waiver policy", detail: "Property allows up to 1 lifetime waiver via approval." },
            { title: "Pulled prior waiver history", detail: "Resident has 0 prior waivers, eligible for review." },
            { title: "Escalated for accounting approval", detail: "Staged the waiver for staff sign-off." },
          ];
      }
      return [];
    case "Resident AI":
    default:
      switch (sub as ResidentSubIntent) {
        case "parking":
          return [
            { title: "Classified the intent", detail: "Recognized this as a reserved-parking waitlist ask." },
            { title: "Loaded the parking-policy article", detail: "Confirmed eligibility rules for this property." },
            { title: "Added the resident to the waitlist", detail: "Position #4 with a ~6 week estimate." },
          ];
        case "amenity":
          return [
            { title: "Classified the intent", detail: "Recognized this as an amenity-hours question." },
            { title: "Pulled today's amenity status", detail: "Confirmed hours and any active outages." },
          ];
        case "package":
          return [
            { title: "Classified the intent", detail: "Recognized this as a package-locker question." },
            { title: "Looked up the resident's locker", detail: "Confirmed locker id + last code reset time." },
          ];
        case "general":
        default:
          return [
            { title: "Classified the resident's intent", detail: "Determined this was a general inquiry with medium confidence." },
            { title: "Searched the property knowledge base", detail: "Found the two most relevant articles to ground the reply." },
          ];
      }
  }
}

/** ─── Public entry point ────────────────────────────────────────────── */

export function buildTraceForThread(thread: ConversationItem): EliTrace {
  const reply = pickAgentReply(thread);
  const resident = pickResidentMessage(thread, reply);
  const residentText = resident?.text ?? thread.preview ?? "";
  const domain = inferDomain(thread, residentText);
  const sub = inferSubIntent(domain, residentText);
  const ctx = buildThreadContext(thread);

  const agentReply = reply?.text ?? synthesizeAgentDraft(domain, sub, ctx);
  const agentReplyIsDraft = !reply;

  return {
    sessionId: makeSessionId(thread.id),
    domain,
    residentMessage: residentText,
    agentReply,
    agentReplyIsDraft,
    steps: [
      playbookStep(domain, sub),
      ...toolSequence(domain, sub, ctx, residentText, thread),
    ],
  };
}

export function buildUserViewForThread(thread: ConversationItem): TraceUserStep[] {
  const reply = pickAgentReply(thread);
  const resident = pickResidentMessage(thread, reply);
  const residentText = resident?.text ?? thread.preview ?? "";
  const domain = inferDomain(thread, residentText);
  const sub = inferSubIntent(domain, residentText);
  return userViewSteps(domain, sub);
}

/* ══════════════════════════════════════════════════════════════════════
   ELI+ Rating (SA 1.2 Testing mode)
   ══════════════════════════════════════════════════════════════════════

   The rating is a per-reply quality score modeled on the eval rubric
   in `docs/product/EVAL-REQUIREMENTS.md` — nine grading dimensions
   collapsed into four operator-facing categories (Inputs, Reasoning,
   Outputs, Safety). Each check is deterministic per thread so a demoer
   can rehearse the same failure repeatedly.

   ▸ `weightedScore` is the raw average across all checks.
   ▸ Any single check flagged as a **hard-cap trigger** clamps the
     final score down to a per-check ceiling — mirroring the design
     comp ("Score override — score capped at 70, down from a weighted
     89. Triggered by check: Inputs · context retention.").
   ▸ `finalScore >= 85` shows the green passing badge in the header;
     everything below is red.

   Everything else in the trace remains untouched — the rating is a
   parallel signal, not a mutation of the tool trace.
   ══════════════════════════════════════════════════════════════════ */

/** Grouping used both in the header banner and the full evaluation page. */
export type EliRatingCategoryId = "inputs" | "reasoning" | "outputs" | "safety";

export type EliRatingCheck = {
  /** Kebab-case identifier used in the "Triggered by check" sentence. */
  id: string;
  /** Human-readable label shown in the check list. */
  name: string;
  /** 0–100 score for this specific check. */
  score: number;
  /** Relative weight of this check inside its category (0–1). */
  weight: number;
  /** pass = ≥85, warn = 70–84, fail = <70. Purely presentational. */
  status: "pass" | "warn" | "fail";
  /** Short explanation shown under the check in the full evaluation. */
  notes: string;
  /**
   * When set, this check triggered the hard cap. `capMaxScore` becomes
   * the ceiling for the final score and the warning banner cites this
   * check by name (e.g. "Inputs · context retention").
   */
  capMaxScore?: number;
};

export type EliRatingCategory = {
  id: EliRatingCategoryId;
  label: string;
  /** One-line description shown under the category header. */
  blurb: string;
  /** Aggregated 0–100 score for the category (weighted mean of its checks). */
  score: number;
  checks: EliRatingCheck[];
};

export type EliRating = {
  /** Copy of the trace session id so both surfaces stay in sync. */
  sessionId: string;
  /** Score after hard-cap enforcement (0–100). This is the headline number. */
  finalScore: number;
  /** Weighted average across all checks (0–100), before any cap. */
  weightedScore: number;
  /** `true` when a hard-cap check pulled the final score below the weighted score. */
  capped: boolean;
  /** Category id + check name for the banner sentence (e.g. "Inputs · context retention"). */
  capTriggerCheck?: string;
  /** Cap ceiling (e.g. 70). Undefined when `capped` is false. */
  capMaxScore?: number;
  /** Short human sentence explaining the cap rule (e.g. "A hard-cap rule was triggered."). */
  capMessage?: string;
  /** Four rubric categories mirrored from the eval doc. */
  categories: EliRatingCategory[];
  /** Model name that produced the reply — surfaced on the full-eval page. */
  modelLabel: string;
  /** Latency of the reply (ms) — surfaced on the full-eval page. */
  latencyMs: number;
  /** Token cost (in + out) surfaced on the full-eval page. */
  tokensIn: number;
  tokensOut: number;
};

/* ─── Deterministic sampling from the thread id ────────────────────── */

/**
 * Turn the thread id into a pseudo-random-but-stable stream of ints.
 * We use FNV-1a again to avoid Math.random() and to guarantee identical
 * ratings across reloads.
 */
function ratingSeedStream(threadId: string): (min: number, max: number) => number {
  let h = 0x811c9dc5;
  for (let i = 0; i < threadId.length; i++) {
    h ^= threadId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (min: number, max: number) => {
    // Advance the stream (xorshift-ish) so consecutive calls differ.
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    const unsigned = h >>> 0;
    const range = max - min + 1;
    return min + (unsigned % range);
  };
}

function statusForScore(score: number): EliRatingCheck["status"] {
  if (score >= 85) return "pass";
  if (score >= 70) return "warn";
  return "fail";
}

function weightedMean(checks: EliRatingCheck[]): number {
  const total = checks.reduce((sum, c) => sum + c.weight, 0);
  if (total === 0) return 0;
  const weighted = checks.reduce((sum, c) => sum + c.score * c.weight, 0);
  return Math.round(weighted / total);
}

/**
 * Build the full ELI+ Rating for a thread. Deterministic per thread id.
 *
 * The check set is fixed (so the rubric feels canonical across demos);
 * only the numeric scores vary per-thread. We seed the score-generator
 * from the thread id so the same conversation always produces the same
 * score, and we let a couple of threads deterministically trigger the
 * hard-cap so the "Score override" banner shows up during demos.
 */
export function buildRatingForThread(thread: ConversationItem): EliRating {
  const rand = ratingSeedStream(thread.id);
  const domain = inferDomain(thread, pickResidentMessage(thread, pickAgentReply(thread))?.text ?? thread.preview ?? "");

  // Decide up-front whether this thread trips the hard-cap. A quarter
  // of threads (mod-based, stable) hit it so the banner is exercised
  // often enough to demo without being noisy.
  const capBucket = Math.abs(hashThreadForCap(thread.id)) % 4;
  const shouldCap = capBucket === 0;
  const capCategoryPick = Math.abs(hashThreadForCap(`${thread.id}:cat`)) % 3;

  // Base scores per category — will get overridden below if this
  // thread is selected to trip a specific cap.
  const inputsChecks: EliRatingCheck[] = [
    check("intent-classification", "Intent classification", rand(84, 96), 0.35, "Correctly identified this as a " + domain.toLowerCase() + " request from the resident's message."),
    check("context-retention", "Context retention", rand(82, 95), 0.35, "Loaded the last three inbound messages, resident profile, and unit state before drafting."),
    check("pii-handling", "PII handling", rand(88, 99), 0.30, "Redacted resident PII from the outbound tool payloads."),
  ];
  const reasoningChecks: EliRatingCheck[] = [
    check("routing", "Lens / playbook routing", rand(82, 97), 0.4, "Selected the correct playbook (" + domain + ") based on the classified intent."),
    check("planning", "Tool-call planning", rand(80, 95), 0.35, "Sequenced tool calls in the order the playbook prescribes."),
    check("stopping", "Stop-condition compliance", rand(80, 96), 0.25, "Stopped calling tools once the reply had enough grounding to draft safely."),
  ];
  const outputsChecks: EliRatingCheck[] = [
    check("accuracy", "Numeric / factual accuracy", rand(80, 96), 0.35, "Numbers cited in the reply match what tools returned within tolerance."),
    check("grounding", "Grounding / no hallucination", rand(82, 96), 0.30, "Every claim in the reply is backed by a tool response or a policy article."),
    check("clarity", "Clarity at persona altitude", rand(80, 94), 0.20, "Answered at the resident's altitude — plain-English, no jargon."),
    check("citations", "Citation coverage", rand(78, 94), 0.15, "Cited the policy or work-order source when the reply made a factual claim."),
  ];
  const safetyChecks: EliRatingCheck[] = [
    check("guardrails", "Guardrail adherence", rand(88, 99), 0.4, "Did not promise anything outside the AI's stated authority."),
    check("escalation", "Escalation appropriateness", rand(84, 96), 0.35, "Handed off to a human when the ask crossed the AI's authority boundary."),
    check("tone", "Tone & de-escalation", rand(82, 95), 0.25, "Acknowledged the resident's frustration before pivoting to the fix."),
  ];

  // If capped, dial down one specific check and mark it as the trigger.
  let capTriggerCheck: string | undefined;
  let capMaxScore: number | undefined;
  let capMessage: string | undefined;
  if (shouldCap) {
    // Pick which category owns the triggering check; use the second
    // deterministic hash so demoers can rehearse different fail modes.
    const categoryPools: Array<{ label: string; checks: EliRatingCheck[] }> = [
      { label: "Inputs", checks: inputsChecks },
      { label: "Reasoning", checks: reasoningChecks },
      { label: "Safety", checks: safetyChecks },
    ];
    const pick = categoryPools[capCategoryPick] ?? categoryPools[0]!;
    const failing = pick.checks[Math.abs(hashThreadForCap(`${thread.id}:idx`)) % pick.checks.length]!;
    // Pull this check into fail territory.
    failing.score = rand(45, 62);
    failing.status = statusForScore(failing.score);
    failing.notes =
      failing.id === "context-retention"
        ? "Model lost part of the earlier thread history when composing this reply — reply was still coherent but missing prior commitments made in the thread."
        : failing.id === "guardrails"
        ? "Reply came close to committing to a concession the AI is not authorized to grant."
        : failing.id === "escalation"
        ? "Should have escalated one step earlier — the resident had to ask twice before a human was looped in."
        : failing.id === "grounding"
        ? "Reply included one claim that could not be traced back to a tool response — flagged for reviewer."
        : failing.id === "routing"
        ? "Playbook selection was second-guessed by the router; the switch cost a tool round-trip."
        : "This check tripped the hard-cap rule for this response.";
    // A hard-cap check ceiling of 70 matches the reference comp. Use a
    // narrow range (68–72) so the banner reads believably per thread.
    failing.capMaxScore = rand(68, 72);
    capMaxScore = failing.capMaxScore;
    capTriggerCheck = `${pick.label} · ${failing.name}`;
    capMessage = "A hard-cap rule was triggered.";
  }

  const categories: EliRatingCategory[] = [
    {
      id: "inputs",
      label: "Inputs",
      blurb: "Did the model understand the request and retain the context it needed?",
      score: weightedMean(inputsChecks),
      checks: inputsChecks,
    },
    {
      id: "reasoning",
      label: "Reasoning",
      blurb: "Did it pick the right playbook and sequence tools sensibly?",
      score: weightedMean(reasoningChecks),
      checks: reasoningChecks,
    },
    {
      id: "outputs",
      label: "Outputs",
      blurb: "Was the reply accurate, grounded, and pitched at the right altitude?",
      score: weightedMean(outputsChecks),
      checks: outputsChecks,
    },
    {
      id: "safety",
      label: "Safety",
      blurb: "Did the model stay inside its guardrails and escalate when needed?",
      score: weightedMean(safetyChecks),
      checks: safetyChecks,
    },
  ];

  // Weighted average across categories — each category is equal-weighted
  // so the headline number matches operator intuition (25% each).
  const weightedScore = Math.round(
    categories.reduce((sum, c) => sum + c.score, 0) / categories.length,
  );
  const finalScore = capMaxScore != null ? Math.min(weightedScore, capMaxScore) : weightedScore;

  // Model / latency / tokens are decorative but keep the full-eval page
  // feeling like real telemetry rather than an empty framework.
  const modelLabels = ["eli-orchestrator-3.2", "eli-orchestrator-3.2-tuned", "eli-orchestrator-3.1"];
  const modelLabel = modelLabels[Math.abs(hashThreadForCap(`${thread.id}:mdl`)) % modelLabels.length]!;
  const latencyMs = rand(1400, 3200);
  const tokensIn = rand(1200, 2400);
  const tokensOut = rand(220, 480);

  return {
    sessionId: makeSessionId(thread.id),
    finalScore,
    weightedScore,
    capped: capMaxScore != null && finalScore < weightedScore,
    capTriggerCheck,
    capMaxScore,
    capMessage,
    categories,
    modelLabel,
    latencyMs,
    tokensIn,
    tokensOut,
  };
}

/** Small helper so the check literal stays readable. */
function check(id: string, name: string, score: number, weight: number, notes: string): EliRatingCheck {
  return {
    id,
    name,
    score,
    weight,
    status: statusForScore(score),
    notes,
  };
}

/** Stable 32-bit hash for the cap-selection buckets. */
function hashThreadForCap(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h | 0;
}
