"use client";

/**
 * Call Routing + Queue context.
 *
 * This is the single source of truth for the Call System settings surfaces
 * (Call Queue tab + Call Routing tab in `CallSystemSettingsPanel`) AND the
 * inbound-call simulator (`GlobalInboundCallHandler`). Everything a
 * multifamily contact center needs to answer a call correctly lives here:
 *
 *   • Call queues — named skill/property buckets that agents belong to. A
 *     queue spans one or more properties and has its own hours, SLA, routing
 *     strategy, overflow chain, and callback policy. This is the "which
 *     humans and Eli agents pick up the phone?" layer.
 *   • Routing rules — one row per DID (dialed number). Each DID belongs to a
 *     property, has an optional IVR menu (DTMF → destination), and a default
 *     queue for calls that skip the menu. This is the "what happens when the
 *     phone actually rings?" layer.
 *   • Priority rules — cross-cutting rules that jump callers ahead in a
 *     queue (VIP, repeat caller, emergency keywords) so the operations team
 *     doesn't have to hard-code these into every queue.
 *
 * State is persisted to localStorage so demo edits survive reloads. The
 * default seed intentionally covers the "3 demo properties → 6 queues"
 * happy path the user asked for (queues that span multiple properties,
 * agents assigned to queues), plus the market-standard gaps that make an
 * enterprise call center actually work: skills-based routing, SLA targets,
 * business hours, holiday exceptions, overflow chains, callback,
 * position/ETA announcements, and after-hours behavior.
 *
 * Market inspirations (Five9 / Talkdesk / Genesys Cloud / Aircall /
 * RingCentral / NICE CXone / Zendesk Talk):
 *   – Routing strategies: longest-idle, round-robin, most-idle, ring-all,
 *     skills-based, top-down.
 *   – Per-agent tier (primary / secondary / backup) so a queue can "fall
 *     over" to a backup pool if all primaries are busy.
 *   – Skills as tags matched against agent specialties.
 *   – SLA target expressed as "X% answered within Y seconds" (Erlang C
 *     shorthand).
 *   – Overflow chain: queue → queue → voicemail / AI voice / external #.
 *   – Callback (Fonolo-style: caller keeps their place in queue).
 *   – Position-in-queue + ETA announcements.
 *   – Business hours per queue + timezone + holiday calendar overrides.
 *   – DID → IVR → queue mapping with a fallback "operator" (0) branch.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// ─── Types ─────────────────────────────────────────────────────────────────

/**
 * Routing strategy — how the queue picks the next agent to ring when a
 * call arrives (or when the previous ring times out).
 *
 * These match the vocabulary used by Five9, Talkdesk, Genesys Cloud, and
 * Aircall so a customer moving from one of those platforms sees terms they
 * already recognize.
 */
export type QueueRoutingStrategy =
  | "longest-idle" // Ring the agent who has been available the longest — the industry default.
  | "round-robin" // Rotate through the pool in order; simplest and fairest for small teams.
  | "most-idle" // Prefer the agent with the lowest handled-count today; balances load.
  | "ring-all" // Ring every available agent simultaneously; first to answer wins.
  | "skills-based" // Rank agents by matching skill tags; ties broken by longest-idle.
  | "top-down"; // Always start at the top of the ordered list; used for VIP/escalation queues.

/**
 * Agent tier within a queue. Primaries always ring first; secondaries only
 * ring if every primary is busy/away; backups fill in when both are gone.
 *
 * Modeling this explicitly (rather than one flat pool) lets us build the
 * "leasing team spills over to the assistant PMs after 60s" pattern that
 * multifamily supervisors set up in every real call center.
 */
export type QueueAgentTier = "primary" | "secondary" | "backup";

export type QueueAgentMembership = {
  /** Workforce member id (see `lib/workforce-context.tsx`). */
  memberId: string;
  tier: QueueAgentTier;
};

/**
 * Bulk group membership — assigns an Entrata user group (see
 * `lib/entrata-groups.ts`) to a queue at a given tier. Mirrors the
 * "Add Group" pattern from the Workforce Roles & Access surface: a
 * group behaves like a role-based rule that resolves to every user
 * inside it, so a supervisor can attach "Leasing Team" or "Regional
 * Operations" instead of hand-picking each agent. Groups ring alongside
 * individual `members` at the same tier.
 */
export type QueueGroupMembership = {
  /** Matches `ENTRATA_GROUPS.id`. */
  groupId: string;
  tier: QueueAgentTier;
};

export type BusinessHours = {
  /** ISO day-of-week numbers (0 = Sunday … 6 = Saturday). */
  days: number[];
  /** "HH:MM" 24-hour. */
  startTime: string;
  endTime: string;
  /** IANA tz (e.g. "America/Denver"). */
  timezone: string;
  /** Full-day exceptions (holidays, community events). ISO date "YYYY-MM-DD". */
  holidays?: { date: string; label: string }[];
};

export type AfterHoursAction =
  | { type: "voicemail" }
  | { type: "ai-voice" }
  | { type: "queue"; queueId: string }
  | { type: "external"; phone: string; label?: string };

/**
 * One overflow step — evaluated in order until a queue answers the call.
 * Empty array = no overflow, call sticks in the queue until max-wait, then
 * falls to `afterMaxWait`.
 */
export type OverflowStep =
  | { type: "queue"; queueId: string }
  | { type: "ai-voice" }
  | { type: "voicemail" }
  | { type: "external"; phone: string; label?: string };

export type CallbackPolicy = {
  enabled: boolean;
  /** After N seconds of waiting, offer callback. */
  offerAfterSec: number;
  /** Max attempts to reach the caller back. */
  maxAttempts: number;
};

export type QueueMetrics = {
  /** Callers waiting right now. */
  inQueue: number;
  /** Agents currently on a live call from this queue. */
  onCall: number;
  /** Agents available (logged in + status = Available). */
  availableAgents: number;
  /** Longest current wait, seconds. */
  longestWaitSec: number;
  /** Rolling 8-hour SLA hit rate (0..1). */
  slaTodayPct: number;
  /** Calls received today. */
  callsToday: number;
  /** Answer rate today (0..1). */
  answeredTodayPct: number;
  /** Avg handle time in seconds. */
  avgHandleSec: number;
};

export type CallQueue = {
  id: string;
  name: string;
  /** Short human description shown in the list card. */
  description: string;
  /** Property names this queue serves. `["*"]` means "all properties". */
  properties: string[];
  /** Agents in this queue, with per-member tier. */
  members: QueueAgentMembership[];
  /**
   * Bulk group memberships — e.g. "Leasing Team", "Regional Operations".
   * Resolved to individual agents via `ENTRATA_GROUPS`. Rings alongside
   * `members` at the matching tier.
   */
  groups: QueueGroupMembership[];
  /** Skill tags required (matched against `WorkforceMember.specialties`). */
  skills: string[];
  routingStrategy: QueueRoutingStrategy;
  /**
   * 1..10 — 1 is highest priority. If an agent is a member of multiple
   * queues, the higher-priority queue rings first. This matters when e.g. a
   * leasing consultant is also on the after-hours emergency queue.
   */
  priority: number;
  /** Max ring time per agent before falling through to the next. */
  maxAgentRingSec: number;
  /** Max time a caller sits in the queue before overflow kicks in. */
  maxWaitSec: number;
  /**
   * SLA target — "answer X% of calls within Y seconds". Industry default is
   * 80/20 (Erlang C shorthand). Shown live on the queue card.
   */
  slaTargetPct: number;
  slaTargetSec: number;
  /**
   * Hard cap on concurrent callers in queue. Extra callers hit overflow
   * immediately instead of joining a huge line. Zero = no cap.
   */
  maxCallersInQueue: number;
  /** Ordered fallback chain, evaluated when a call breaches `maxWaitSec`. */
  overflow: OverflowStep[];
  /** What to do when the queue is outside `businessHours`. */
  afterHoursAction: AfterHoursAction;
  businessHours: BusinessHours;
  callback: CallbackPolicy;
  /** Whether AI voice picks up when no human is available inside hours. */
  aiVoiceEnabled: boolean;
  /** Voice agent identity when `aiVoiceEnabled`. */
  aiVoiceAgentName: string;
  /** Greeting/hold-music description. */
  greeting: string;
  /** "You are caller N…" toggle. */
  announcePosition: boolean;
  /** "Estimated wait time is X…" toggle. */
  announceEta: boolean;
  /** Whisper the queue name to the agent before connecting. */
  whisperEnabled: boolean;
  /** Whether the queue itself is paused (no new calls, existing calls drain). */
  paused: boolean;
  createdAt: string;
  updatedAt: string;
  /**
   * Live-ish metrics — regenerated once per session to feel realistic.
   * The queue card and Call System overview both read from here.
   */
  metrics: QueueMetrics;
};

/** IVR menu option — DTMF digit → action. */
export type IvrAction =
  | { type: "queue"; queueId: string }
  | { type: "ai-voice"; agentName: string }
  | { type: "voicemail" }
  | { type: "submenu"; menuId: string }
  | { type: "external"; phone: string; label?: string };

export type IvrOption = {
  dtmf: "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
  label: string;
  action: IvrAction;
};

export type CallRoute = {
  id: string;
  /** E.164 or display DID this route matches. */
  did: string;
  /** Short friendly label ("Hillside Living – Main"). */
  label: string;
  /** Property this route belongs to. */
  property: string;
  /** Language of the greeting/menu — helps a supervisor pick the right script. */
  language: "en" | "es" | "multi";
  /** Optional greeting played before the IVR menu. */
  greeting: string;
  /** IVR menu items. Empty = no menu, calls fall straight to `defaultQueueId`. */
  ivrMenu: IvrOption[];
  /** Queue that catches calls that skip the menu (timeout / invalid digit). */
  defaultQueueId: string;
  /** After-hours override for this DID. If unset, we use the target queue's setting. */
  afterHoursOverride?: AfterHoursAction;
  /** Whether the route is currently active. */
  enabled: boolean;
};

export type PriorityRule = {
  id: string;
  /** What triggers the boost. */
  condition:
    | { type: "vip" }
    | { type: "repeat-caller"; withinHours: number; minCalls: number }
    | { type: "emergency-keyword"; keywords: string[] }
    | { type: "lead-source"; source: string }
    | { type: "current-resident" }
    | { type: "language"; code: "en" | "es" };
  /** What happens when the condition matches. */
  action:
    | { type: "boost-priority"; queueId?: string } // jump to front of matched queue (or every queue if omitted)
    | { type: "route-to-queue"; queueId: string } // override queue selection entirely
    | { type: "skip-ivr" };
  /** Rules fire in order; higher `weight` first. */
  weight: number;
  enabled: boolean;
  label: string; // human-readable summary
};

// ─── Defaults ──────────────────────────────────────────────────────────────

/** Wildcard for "all properties" — mirrors WorkforceMember.properties convention. */
export const ALL_PROPERTIES = "*";

/**
 * Convenience for building business hours. All queues in the seed default
 * to Denver time — matches the workforce context and the mock property
 * addresses.
 */
const HOURS_MF_9_6: BusinessHours = {
  days: [1, 2, 3, 4, 5],
  startTime: "09:00",
  endTime: "18:00",
  timezone: "America/Denver",
};
const HOURS_7DAY_10_6: BusinessHours = {
  days: [0, 1, 2, 3, 4, 5, 6],
  startTime: "10:00",
  endTime: "18:00",
  timezone: "America/Denver",
};
const HOURS_24_7: BusinessHours = {
  days: [0, 1, 2, 3, 4, 5, 6],
  startTime: "00:00",
  endTime: "23:59",
  timezone: "America/Denver",
};
const HOURS_MF_8_5: BusinessHours = {
  days: [1, 2, 3, 4, 5],
  startTime: "08:00",
  endTime: "17:00",
  timezone: "America/Denver",
};

/** Predictable, non-random metrics for the seed so screenshots are stable. */
function seedMetrics(
  inQueue: number,
  onCall: number,
  availableAgents: number,
  longestWaitSec: number,
  slaTodayPct: number,
  callsToday: number,
  answeredTodayPct: number,
  avgHandleSec: number,
): QueueMetrics {
  return {
    inQueue,
    onCall,
    availableAgents,
    longestWaitSec,
    slaTodayPct,
    callsToday,
    answeredTodayPct,
    avgHandleSec,
  };
}

const nowIso = () => new Date().toISOString();

/**
 * Default seed. Six queues covering the multifamily happy path — three
 * property-focused ("Leasing over 3 communities", "Regional Maintenance
 * Sweep") and three cross-cutting (After-Hours Emergency, Spanish Line,
 * Payments). Every queue lists real workforce member ids from
 * `lib/workforce-context.tsx` so the "Agents & Skills" tab is not empty on
 * first load.
 */
export const DEFAULT_QUEUES: CallQueue[] = [
  {
    id: "queue-leasing-all",
    name: "Leasing — All Communities",
    description:
      "Prospect and lead inquiries across every property. Skills-based over the leasing pool with the Leasing AI as an overflow.",
    properties: ["Hillside Living", "Jamison Apartments", "Property C"],
    members: [
      { memberId: "h-leasing-mgr-a", tier: "primary" },
      { memberId: "h-leasing-a1", tier: "primary" },
      { memberId: "h-leasing-b1", tier: "primary" },
      { memberId: "h-leasing-c1", tier: "primary" },
      { memberId: "h-abe", tier: "secondary" },
      { memberId: "h-apm-b", tier: "secondary" },
      { memberId: "a-leasing", tier: "backup" },
    ],
    groups: [
      { groupId: "eg-leasing", tier: "primary" },
    ],
    skills: ["Tours", "Applications", "Move-In Coordination"],
    routingStrategy: "skills-based",
    priority: 2,
    maxAgentRingSec: 25,
    maxWaitSec: 180,
    slaTargetPct: 80,
    slaTargetSec: 20,
    maxCallersInQueue: 25,
    overflow: [
      { type: "queue", queueId: "queue-front-desk" },
      { type: "ai-voice" },
      { type: "voicemail" },
    ],
    afterHoursAction: { type: "ai-voice" },
    businessHours: HOURS_7DAY_10_6,
    callback: { enabled: true, offerAfterSec: 90, maxAttempts: 2 },
    aiVoiceEnabled: true,
    aiVoiceAgentName: "Eli — Leasing",
    greeting: "Thanks for calling our leasing team. Please hold — a specialist will be right with you.",
    announcePosition: true,
    announceEta: true,
    whisperEnabled: true,
    paused: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    metrics: seedMetrics(2, 3, 4, 42, 0.87, 38, 0.94, 254),
  },
  {
    id: "queue-resident-hillside",
    name: "Resident Services — Hillside Living",
    description:
      "Current resident support for Hillside Living. Property-first routing so callers get the team that knows their community.",
    properties: ["Hillside Living"],
    members: [
      { memberId: "h-pm-a", tier: "primary" },
      { memberId: "h-res-mgr-a", tier: "primary" },
      { memberId: "h-abe", tier: "secondary" },
      { memberId: "a-renewal", tier: "backup" },
    ],
    groups: [
      { groupId: "eg-resident-svc", tier: "secondary" },
    ],
    skills: ["Resident Retention", "Conflict Resolution", "Lease Renewals"],
    routingStrategy: "longest-idle",
    priority: 3,
    maxAgentRingSec: 25,
    maxWaitSec: 240,
    slaTargetPct: 80,
    slaTargetSec: 30,
    maxCallersInQueue: 15,
    overflow: [
      { type: "queue", queueId: "queue-front-desk" },
      { type: "voicemail" },
    ],
    afterHoursAction: { type: "queue", queueId: "queue-after-hours-emergency" },
    businessHours: HOURS_MF_9_6,
    callback: { enabled: true, offerAfterSec: 120, maxAttempts: 2 },
    aiVoiceEnabled: false,
    aiVoiceAgentName: "Eli — Resident Services",
    greeting: "Welcome home. All of our residents are important — please hold and someone will be right with you.",
    announcePosition: true,
    announceEta: true,
    whisperEnabled: false,
    paused: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    metrics: seedMetrics(0, 1, 3, 0, 0.92, 22, 0.96, 312),
  },
  {
    id: "queue-maintenance-regional",
    name: "Maintenance — Regional Sweep",
    description:
      "Work-order calls for Hillside Living and Jamison Apartments. Most-idle routing keeps the technician workload balanced.",
    properties: ["Hillside Living", "Jamison Apartments"],
    members: [
      { memberId: "h-maint-sup-a", tier: "primary" },
      { memberId: "h-maint-sup-b", tier: "primary" },
      { memberId: "h-maint-tech-a1", tier: "secondary" },
      { memberId: "h-maint-tech-a2", tier: "secondary" },
      { memberId: "h-maint-tech-b1", tier: "secondary" },
      { memberId: "a-maint", tier: "backup" },
    ],
    groups: [
      { groupId: "eg-maintenance", tier: "primary" },
    ],
    skills: ["HVAC", "Plumbing", "Electrical", "Appliance Repair"],
    routingStrategy: "most-idle",
    priority: 4,
    maxAgentRingSec: 30,
    maxWaitSec: 300,
    slaTargetPct: 70,
    slaTargetSec: 45,
    maxCallersInQueue: 20,
    overflow: [
      { type: "ai-voice" },
      { type: "voicemail" },
    ],
    afterHoursAction: { type: "queue", queueId: "queue-after-hours-emergency" },
    businessHours: HOURS_MF_8_5,
    callback: { enabled: true, offerAfterSec: 120, maxAttempts: 3 },
    aiVoiceEnabled: true,
    aiVoiceAgentName: "Eli — Maintenance",
    greeting: "Thanks for calling maintenance. If this is a life-safety emergency, please hang up and dial 911.",
    announcePosition: true,
    announceEta: true,
    whisperEnabled: true,
    paused: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    metrics: seedMetrics(1, 2, 3, 68, 0.74, 41, 0.9, 402),
  },
  {
    id: "queue-after-hours-emergency",
    name: "After-Hours Emergency",
    description:
      "24/7 escalation line for life-safety and property emergencies across every community. Top-down: rings the on-call supervisor first, then the director chain.",
    properties: [ALL_PROPERTIES],
    members: [
      { memberId: "h-maint-sup-a", tier: "primary" },
      { memberId: "h-maint-sup-b", tier: "primary" },
      { memberId: "h-maint-dir", tier: "secondary" },
      { memberId: "h-regional", tier: "backup" },
    ],
    groups: [
      { groupId: "eg-regional-ops", tier: "backup" },
    ],
    skills: ["Emergency Response", "Life Safety"],
    routingStrategy: "top-down",
    priority: 1,
    maxAgentRingSec: 45,
    maxWaitSec: 90,
    slaTargetPct: 95,
    slaTargetSec: 15,
    maxCallersInQueue: 10,
    overflow: [
      { type: "external", phone: "+1 (855) 555-0911", label: "Answering service" },
      { type: "ai-voice" },
    ],
    afterHoursAction: { type: "external", phone: "+1 (855) 555-0911", label: "Answering service" },
    businessHours: HOURS_24_7,
    callback: { enabled: false, offerAfterSec: 0, maxAttempts: 0 },
    aiVoiceEnabled: true,
    aiVoiceAgentName: "Eli — Emergency Triage",
    greeting: "You've reached the after-hours emergency line. If this is a life-threatening emergency, hang up and dial 911.",
    announcePosition: false,
    announceEta: false,
    whisperEnabled: true,
    paused: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    metrics: seedMetrics(0, 0, 2, 0, 0.99, 6, 1.0, 486),
  },
  {
    id: "queue-spanish",
    name: "Spanish Line — All Communities",
    description:
      "Callers routed via language selection or Spanish-only DID. Skills-based against agents flagged with the Spanish specialty.",
    properties: [ALL_PROPERTIES],
    members: [
      { memberId: "h-leasing-b1", tier: "primary" },
      { memberId: "h-res-b", tier: "primary" },
      { memberId: "a-leasing", tier: "backup" },
    ],
    groups: [],
    skills: ["Spanish"],
    routingStrategy: "skills-based",
    priority: 3,
    maxAgentRingSec: 25,
    maxWaitSec: 210,
    slaTargetPct: 75,
    slaTargetSec: 25,
    maxCallersInQueue: 15,
    overflow: [
      { type: "queue", queueId: "queue-leasing-all" },
      { type: "ai-voice" },
    ],
    afterHoursAction: { type: "ai-voice" },
    businessHours: HOURS_7DAY_10_6,
    callback: { enabled: true, offerAfterSec: 90, maxAttempts: 2 },
    aiVoiceEnabled: true,
    aiVoiceAgentName: "Eli — Español",
    greeting: "Gracias por llamar. Un agente estará con usted en breve.",
    announcePosition: true,
    announceEta: true,
    whisperEnabled: true,
    paused: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    metrics: seedMetrics(0, 1, 2, 0, 0.82, 11, 0.95, 288),
  },
  {
    id: "queue-payments",
    name: "Payments & Collections",
    description:
      "Rent, ledger, refund and collections inquiries. Round-robin across the revenue team.",
    properties: [ALL_PROPERTIES],
    members: [
      { memberId: "h-rev-1", tier: "primary" },
      { memberId: "h-rev-2", tier: "primary" },
      { memberId: "h-rev-dir", tier: "secondary" },
      { memberId: "a-payments", tier: "backup" },
    ],
    groups: [
      { groupId: "eg-accounting", tier: "primary" },
    ],
    skills: ["Late Fees", "Delinquency Management", "Refunds"],
    routingStrategy: "round-robin",
    priority: 3,
    maxAgentRingSec: 25,
    maxWaitSec: 240,
    slaTargetPct: 80,
    slaTargetSec: 30,
    maxCallersInQueue: 20,
    overflow: [
      { type: "queue", queueId: "queue-front-desk" },
      { type: "voicemail" },
    ],
    afterHoursAction: { type: "voicemail" },
    businessHours: HOURS_MF_9_6,
    callback: { enabled: true, offerAfterSec: 120, maxAttempts: 2 },
    aiVoiceEnabled: true,
    aiVoiceAgentName: "Eli — Payments",
    greeting: "Thanks for calling. A member of our revenue team will be right with you.",
    announcePosition: true,
    announceEta: false,
    whisperEnabled: true,
    paused: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    metrics: seedMetrics(1, 1, 2, 24, 0.86, 19, 0.93, 356),
  },
  {
    id: "queue-front-desk",
    name: "General / Front Desk",
    description:
      "Catch-all queue for calls that dial 0 or hit the operator branch of an IVR. Rings every available property manager and coordinator.",
    properties: [ALL_PROPERTIES],
    members: [
      { memberId: "h-pm-a", tier: "primary" },
      { memberId: "h-pm-b", tier: "primary" },
      { memberId: "h-pm-c", tier: "primary" },
      { memberId: "h-apm-b", tier: "secondary" },
      { memberId: "h-res-mgr-a", tier: "secondary" },
    ],
    groups: [],
    skills: [],
    routingStrategy: "longest-idle",
    priority: 5,
    maxAgentRingSec: 20,
    maxWaitSec: 180,
    slaTargetPct: 70,
    slaTargetSec: 30,
    maxCallersInQueue: 20,
    overflow: [{ type: "voicemail" }],
    afterHoursAction: { type: "voicemail" },
    businessHours: HOURS_MF_9_6,
    callback: { enabled: true, offerAfterSec: 120, maxAttempts: 2 },
    aiVoiceEnabled: false,
    aiVoiceAgentName: "Eli — Front Desk",
    greeting: "Thanks for calling. One moment while we find someone to help.",
    announcePosition: true,
    announceEta: true,
    whisperEnabled: false,
    paused: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    metrics: seedMetrics(0, 0, 4, 0, 0.9, 14, 0.97, 224),
  },
];

/**
 * Default DID → route mapping. Each property gets one main line plus a
 * Spanish overflow line at Hillside. Everything routes through an IVR
 * unless flagged (Spanish line is a direct queue jump).
 */
export const DEFAULT_ROUTES: CallRoute[] = [
  {
    id: "route-hillside-main",
    did: "+1 (801) 423-1100",
    label: "Hillside Living — Main",
    property: "Hillside Living",
    language: "en",
    greeting: "Thanks for calling Hillside Living.",
    ivrMenu: [
      { dtmf: "1", label: "Leasing & Tours", action: { type: "queue", queueId: "queue-leasing-all" } },
      { dtmf: "2", label: "Current Residents", action: { type: "queue", queueId: "queue-resident-hillside" } },
      { dtmf: "3", label: "Maintenance", action: { type: "queue", queueId: "queue-maintenance-regional" } },
      { dtmf: "4", label: "Payments & Billing", action: { type: "queue", queueId: "queue-payments" } },
      { dtmf: "9", label: "Español", action: { type: "queue", queueId: "queue-spanish" } },
      { dtmf: "0", label: "Operator", action: { type: "queue", queueId: "queue-front-desk" } },
    ],
    defaultQueueId: "queue-front-desk",
    enabled: true,
  },
  {
    id: "route-jamison-main",
    did: "+1 (720) 315-1100",
    label: "Jamison Apartments — Main",
    property: "Jamison Apartments",
    language: "en",
    greeting: "Thanks for calling Jamison Apartments.",
    ivrMenu: [
      { dtmf: "1", label: "Leasing & Tours", action: { type: "queue", queueId: "queue-leasing-all" } },
      { dtmf: "2", label: "Current Residents", action: { type: "queue", queueId: "queue-resident-hillside" } },
      { dtmf: "3", label: "Maintenance", action: { type: "queue", queueId: "queue-maintenance-regional" } },
      { dtmf: "4", label: "Payments & Billing", action: { type: "queue", queueId: "queue-payments" } },
      { dtmf: "9", label: "Español", action: { type: "queue", queueId: "queue-spanish" } },
      { dtmf: "0", label: "Operator", action: { type: "queue", queueId: "queue-front-desk" } },
    ],
    defaultQueueId: "queue-front-desk",
    enabled: true,
  },
  {
    id: "route-property-c-main",
    did: "+1 (720) 315-2200",
    label: "Property C — Main",
    property: "Property C",
    language: "en",
    greeting: "Thanks for calling.",
    ivrMenu: [
      { dtmf: "1", label: "Leasing & Tours", action: { type: "queue", queueId: "queue-leasing-all" } },
      { dtmf: "3", label: "Maintenance", action: { type: "queue", queueId: "queue-maintenance-regional" } },
      { dtmf: "4", label: "Payments & Billing", action: { type: "queue", queueId: "queue-payments" } },
      { dtmf: "0", label: "Operator", action: { type: "queue", queueId: "queue-front-desk" } },
    ],
    defaultQueueId: "queue-front-desk",
    enabled: true,
  },
  {
    id: "route-spanish-direct",
    did: "+1 (801) 423-1101",
    label: "Spanish Line — Portfolio",
    property: "Hillside Living",
    language: "es",
    greeting: "Gracias por llamar.",
    ivrMenu: [],
    defaultQueueId: "queue-spanish",
    enabled: true,
  },
  {
    id: "route-after-hours",
    did: "+1 (855) 555-0911",
    label: "After-Hours Emergency",
    property: ALL_PROPERTIES,
    language: "en",
    greeting: "You've reached the after-hours emergency line.",
    ivrMenu: [],
    defaultQueueId: "queue-after-hours-emergency",
    enabled: true,
  },
];

export const DEFAULT_PRIORITY_RULES: PriorityRule[] = [
  {
    id: "rule-vip",
    label: "VIP residents skip the queue",
    condition: { type: "vip" },
    action: { type: "boost-priority" },
    weight: 100,
    enabled: true,
  },
  {
    id: "rule-repeat-caller",
    label: "Repeat caller (3+ in 24h) — priority in queue",
    condition: { type: "repeat-caller", withinHours: 24, minCalls: 3 },
    action: { type: "boost-priority" },
    weight: 80,
    enabled: true,
  },
  {
    id: "rule-emergency-keyword",
    label: "Emergency keywords route to After-Hours Emergency queue",
    condition: {
      type: "emergency-keyword",
      keywords: ["flood", "fire", "smoke", "leak", "no heat", "no water", "gas smell", "break-in"],
    },
    action: { type: "route-to-queue", queueId: "queue-after-hours-emergency" },
    weight: 90,
    enabled: true,
  },
  {
    id: "rule-current-resident",
    label: "Current resident → skip leasing IVR branch",
    condition: { type: "current-resident" },
    action: { type: "skip-ivr" },
    weight: 60,
    enabled: false,
  },
];

// ─── Context ──────────────────────────────────────────────────────────────

type CallRoutingContextValue = {
  queues: CallQueue[];
  routes: CallRoute[];
  priorityRules: PriorityRule[];

  // Queue CRUD
  createQueue: (partial: Partial<CallQueue>) => CallQueue;
  updateQueue: (id: string, updates: Partial<CallQueue>) => void;
  deleteQueue: (id: string) => void;
  duplicateQueue: (id: string) => CallQueue | null;

  // Route CRUD
  createRoute: (partial: Partial<CallRoute>) => CallRoute;
  updateRoute: (id: string, updates: Partial<CallRoute>) => void;
  deleteRoute: (id: string) => void;

  // Priority rule CRUD
  updatePriorityRule: (id: string, updates: Partial<PriorityRule>) => void;
  togglePriorityRule: (id: string) => void;

  // Lookups
  getQueueById: (id: string) => CallQueue | undefined;
  getRouteByDid: (did: string) => CallRoute | undefined;

  // Reset the whole thing back to seed (demo control uses this).
  resetToDefaults: () => void;
};

const CallRoutingContext = createContext<CallRoutingContextValue | null>(null);

const STORAGE_KEY = "oxp-call-routing-v1";

type PersistedShape = {
  queues: CallQueue[];
  routes: CallRoute[];
  priorityRules: PriorityRule[];
};

function loadPersisted(): PersistedShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedShape;
    if (!parsed || !Array.isArray(parsed.queues) || !Array.isArray(parsed.routes)) return null;
    // Backfill fields added after the initial persisted shape so v1 payloads
    // upgrade cleanly to the current model:
    parsed.queues = parsed.queues.map((q) => ({
      ...q,
      groups: Array.isArray(q.groups) ? q.groups : [],
    }));
    return parsed;
  } catch {
    return null;
  }
}

function persist(state: PersistedShape) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota errors */
  }
}

export function CallRoutingProvider({ children }: { children: ReactNode }) {
  const [queues, setQueues] = useState<CallQueue[]>(DEFAULT_QUEUES);
  const [routes, setRoutes] = useState<CallRoute[]>(DEFAULT_ROUTES);
  const [priorityRules, setPriorityRules] = useState<PriorityRule[]>(DEFAULT_PRIORITY_RULES);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persisted = loadPersisted();
    if (persisted) {
      setQueues(persisted.queues);
      setRoutes(persisted.routes);
      if (Array.isArray(persisted.priorityRules)) setPriorityRules(persisted.priorityRules);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persist({ queues, routes, priorityRules });
  }, [queues, routes, priorityRules, hydrated]);

  const createQueue = useCallback((partial: Partial<CallQueue>): CallQueue => {
    const template = DEFAULT_QUEUES[0];
    const next: CallQueue = {
      ...template,
      ...partial,
      id: partial.id ?? `queue-${Date.now()}`,
      name: partial.name ?? "New queue",
      description: partial.description ?? "",
      properties: partial.properties ?? [],
      members: partial.members ?? [],
      groups: partial.groups ?? [],
      skills: partial.skills ?? [],
      overflow: partial.overflow ?? [],
      metrics: partial.metrics ?? seedMetrics(0, 0, 0, 0, 1, 0, 1, 0),
      createdAt: partial.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };
    setQueues((prev) => [...prev, next]);
    return next;
  }, []);

  const updateQueue = useCallback((id: string, updates: Partial<CallQueue>) => {
    setQueues((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates, updatedAt: nowIso() } : q)),
    );
  }, []);

  const deleteQueue = useCallback((id: string) => {
    setQueues((prev) => prev.filter((q) => q.id !== id));
  }, []);

  const duplicateQueue = useCallback((id: string): CallQueue | null => {
    let created: CallQueue | null = null;
    setQueues((prev) => {
      const source = prev.find((q) => q.id === id);
      if (!source) return prev;
      created = {
        ...source,
        id: `queue-${Date.now()}`,
        name: `${source.name} (Copy)`,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      return [...prev, created];
    });
    return created;
  }, []);

  const createRoute = useCallback((partial: Partial<CallRoute>): CallRoute => {
    const next: CallRoute = {
      id: partial.id ?? `route-${Date.now()}`,
      did: partial.did ?? "",
      label: partial.label ?? "New route",
      property: partial.property ?? ALL_PROPERTIES,
      language: partial.language ?? "en",
      greeting: partial.greeting ?? "",
      ivrMenu: partial.ivrMenu ?? [],
      defaultQueueId: partial.defaultQueueId ?? DEFAULT_QUEUES[DEFAULT_QUEUES.length - 1].id,
      afterHoursOverride: partial.afterHoursOverride,
      enabled: partial.enabled ?? true,
    };
    setRoutes((prev) => [...prev, next]);
    return next;
  }, []);

  const updateRoute = useCallback((id: string, updates: Partial<CallRoute>) => {
    setRoutes((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }, []);

  const deleteRoute = useCallback((id: string) => {
    setRoutes((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updatePriorityRule = useCallback((id: string, updates: Partial<PriorityRule>) => {
    setPriorityRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }, []);

  const togglePriorityRule = useCallback((id: string) => {
    setPriorityRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  }, []);

  const getQueueById = useCallback((id: string) => queues.find((q) => q.id === id), [queues]);
  const getRouteByDid = useCallback((did: string) => routes.find((r) => r.did === did), [routes]);

  const resetToDefaults = useCallback(() => {
    setQueues(DEFAULT_QUEUES);
    setRoutes(DEFAULT_ROUTES);
    setPriorityRules(DEFAULT_PRIORITY_RULES);
  }, []);

  const value = useMemo<CallRoutingContextValue>(
    () => ({
      queues,
      routes,
      priorityRules,
      createQueue,
      updateQueue,
      deleteQueue,
      duplicateQueue,
      createRoute,
      updateRoute,
      deleteRoute,
      updatePriorityRule,
      togglePriorityRule,
      getQueueById,
      getRouteByDid,
      resetToDefaults,
    }),
    [
      queues,
      routes,
      priorityRules,
      createQueue,
      updateQueue,
      deleteQueue,
      duplicateQueue,
      createRoute,
      updateRoute,
      deleteRoute,
      updatePriorityRule,
      togglePriorityRule,
      getQueueById,
      getRouteByDid,
      resetToDefaults,
    ],
  );

  return <CallRoutingContext.Provider value={value}>{children}</CallRoutingContext.Provider>;
}

export function useCallRouting() {
  const ctx = useContext(CallRoutingContext);
  if (!ctx) {
    throw new Error("useCallRouting must be used within CallRoutingProvider");
  }
  return ctx;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Human-friendly strategy name for chips + descriptions. */
export function strategyLabel(s: QueueRoutingStrategy): string {
  switch (s) {
    case "longest-idle":
      return "Longest idle";
    case "round-robin":
      return "Round robin";
    case "most-idle":
      return "Most idle";
    case "ring-all":
      return "Ring all";
    case "skills-based":
      return "Skills-based";
    case "top-down":
      return "Top down";
  }
}

/** Human-friendly strategy description for tooltips + detail rows. */
export function strategyDescription(s: QueueRoutingStrategy): string {
  switch (s) {
    case "longest-idle":
      return "Rings the agent who has been available the longest. Industry default — best for load balancing across a stable pool.";
    case "round-robin":
      return "Rotates in order through the pool. Simple and fair; predictable ordering for small teams.";
    case "most-idle":
      return "Prefers agents with the fewest handled calls today. Best when call handle time varies widely (e.g. maintenance).";
    case "ring-all":
      return "Rings every available agent at once — first to answer wins. Use sparingly; loud but fastest for VIP/emergency.";
    case "skills-based":
      return "Ranks agents by matching skill tags; ties broken by longest-idle. Use for Spanish, complex renewals, or specialized inquiries.";
    case "top-down":
      return "Always starts at the top of the ordered list. Use for VIP/escalation queues where seniority matters.";
  }
}

/** Return "Open now" / "Closed" / "Paused" status pill copy for a queue. */
export function queueStatus(q: CallQueue, atDate: Date = new Date()): {
  status: "open" | "closed" | "paused";
  label: string;
} {
  if (q.paused) return { status: "paused", label: "Paused" };
  const inHours = isWithinBusinessHours(q.businessHours, atDate);
  return inHours ? { status: "open", label: "Open now" } : { status: "closed", label: "After hours" };
}

/** True if `atDate` falls inside the given business hours (respecting timezone + holidays). */
export function isWithinBusinessHours(bh: BusinessHours, atDate: Date = new Date()): boolean {
  const localStr = atDate.toLocaleString("en-US", { timeZone: bh.timezone });
  const local = new Date(localStr);
  const isoDate = local.toISOString().slice(0, 10);
  if (bh.holidays?.some((h) => h.date === isoDate)) return false;
  const dow = local.getDay();
  if (!bh.days.includes(dow)) return false;
  const [sh, sm] = bh.startTime.split(":").map(Number);
  const [eh, em] = bh.endTime.split(":").map(Number);
  const minutes = local.getHours() * 60 + local.getMinutes();
  return minutes >= sh * 60 + sm && minutes <= eh * 60 + em;
}

/** Format seconds as "1m 20s" / "45s" / "2h 15m". */
export function formatWait(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Format "MM:SS" for live wait timers. */
export function formatWaitMinutes(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Resolve a queue's property list to a display string like "All properties"
 * or "3 properties" or "Hillside Living".
 */
export function propertyDisplay(properties: string[]): string {
  if (!properties.length) return "No properties";
  if (properties.includes(ALL_PROPERTIES)) return "All properties";
  if (properties.length === 1) return properties[0];
  return `${properties.length} properties`;
}

/** Human-friendly weekday abbreviations for a business-hours schedule. */
export function daysDisplay(days: number[]): string {
  if (days.length === 7) return "Every day";
  const dowNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekdays = [1, 2, 3, 4, 5];
  const weekends = [0, 6];
  const setDays = new Set(days);
  const isWeekday = weekdays.every((d) => setDays.has(d));
  const isWeekend = weekends.every((d) => setDays.has(d));
  if (isWeekday && !weekends.some((d) => setDays.has(d))) return "Mon – Fri";
  if (isWeekend && !weekdays.some((d) => setDays.has(d))) return "Weekends";
  return days.map((d) => dowNames[d]).join(" · ");
}

/** Copy for an `AfterHoursAction` chip. */
export function afterHoursDisplay(
  action: AfterHoursAction,
  getQueueName: (id: string) => string | undefined,
): string {
  switch (action.type) {
    case "voicemail":
      return "Voicemail";
    case "ai-voice":
      return "AI voice";
    case "queue":
      return getQueueName(action.queueId) ?? "Queue";
    case "external":
      return action.label || action.phone;
  }
}

/** Copy for an `OverflowStep`. */
export function overflowStepDisplay(
  step: OverflowStep,
  getQueueName: (id: string) => string | undefined,
): string {
  switch (step.type) {
    case "queue":
      return `Queue: ${getQueueName(step.queueId) ?? "—"}`;
    case "voicemail":
      return "Voicemail";
    case "ai-voice":
      return "AI voice";
    case "external":
      return `Forward: ${step.label || step.phone}`;
  }
}

/** Copy for an IVR action. */
export function ivrActionDisplay(
  action: IvrAction,
  getQueueName: (id: string) => string | undefined,
): string {
  switch (action.type) {
    case "queue":
      return getQueueName(action.queueId) ?? "Queue";
    case "voicemail":
      return "Voicemail";
    case "ai-voice":
      return `AI voice · ${action.agentName}`;
    case "submenu":
      return "Sub-menu";
    case "external":
      return `Forward · ${action.label || action.phone}`;
  }
}
