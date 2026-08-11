/**
 * Golden Prototype metric export stubs.
 *
 * Downloads conversation-level CSV samples so PMs and engineering can validate
 * the raw grain behind each billboard metric. Values are deterministic mock
 * data — not live warehouse extracts.
 */

const PROPERTIES = [
  "Cedar Hills",
  "Hillside Living",
  "Jamison Apartments",
  "Lakewood",
  "Maple Court",
  "Oak Terrace",
  "Parkview Flats",
  "Pine Valley",
  "Summit Ridge",
  "The Beacon",
] as const;

const FIRST_NAMES = [
  "Avery",
  "Jordan",
  "Casey",
  "Riley",
  "Morgan",
  "Quinn",
  "Taylor",
  "Cameron",
  "Harper",
  "Reese",
  "Skyler",
  "Jamie",
  "Drew",
  "Alex",
  "Parker",
];

const LAST_NAMES = [
  "Nguyen",
  "Patel",
  "Garcia",
  "Johnson",
  "Kim",
  "Wright",
  "Lopez",
  "Brooks",
  "Chen",
  "Adams",
  "Singh",
  "Torres",
  "Bennett",
  "Clark",
  "Rivera",
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const HOUR_BUCKETS = ["12a–4a", "4a–8a", "8a–12p", "12p–4p", "4p–8p", "8p–12a"] as const;

type AgentKey = "renewals" | "leasing" | "payments" | "maintenance";

type CsvRow = Record<string, string | number | boolean>;

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
}

function seededRand(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length) % items.length];
}

function pad(n: number, width = 2) {
  return String(n).padStart(width, "0");
}

function isoDate(rand: () => number, daysBackMax = 60) {
  const daysBack = Math.floor(rand() * daysBackMax);
  const hours = Math.floor(rand() * 24);
  const mins = Math.floor(rand() * 60);
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysBack);
  d.setUTCHours(hours, mins, Math.floor(rand() * 60), 0);
  return d.toISOString().replace(".000Z", "Z");
}

function addHours(iso: string, hours: number) {
  const d = new Date(iso);
  d.setUTCHours(d.getUTCHours() + hours);
  return d.toISOString().replace(".000Z", "Z");
}

function addDays(iso: string, days: number) {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().replace(".000Z", "Z");
}

function personName(rand: () => number) {
  return `${pick(rand, FIRST_NAMES)} ${pick(rand, LAST_NAMES)}`;
}

function unitLabel(rand: () => number) {
  return `${100 + Math.floor(rand() * 400)}`;
}

function conversationId(agent: AgentKey, rand: () => number, index: number) {
  const prefix = agent.slice(0, 3).toUpperCase();
  return `${prefix}-${pad(Math.floor(rand() * 9000) + 1000, 4)}-${pad(index + 1, 3)}`;
}

function csvEscape(value: string | number | boolean) {
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function downloadCsv(filename: string, rows: CsvRow[]) {
  if (typeof window === "undefined" || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => csvEscape(row[h] ?? "")).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function slug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function channelsForAgent(agent: AgentKey): string[] {
  if (agent === "maintenance") return ["Voice", "Chat", "SMS"];
  if (agent === "leasing") return ["Voice", "Chat", "SMS", "Email"];
  if (agent === "renewals") return ["SMS", "Chat", "Email"];
  return ["SMS", "Email"];
}

function basePartyColumns(agent: AgentKey, rand: () => number) {
  const isProspect = agent === "leasing";
  return {
    property: pick(rand, PROPERTIES),
    unit: unitLabel(rand),
    [isProspect ? "prospect_name" : "resident_name"]: personName(rand),
  };
}

function buildMessageRows(agent: AgentKey, count: number, rand: () => number): CsvRow[] {
  const channels = channelsForAgent(agent);
  return Array.from({ length: count }, (_, i) => {
    const sentAt = isoDate(rand);
    const channel = pick(rand, channels);
    const day = pick(rand, DAY_LABELS);
    const hourBucket = pick(rand, HOUR_BUCKETS);
    return {
      conversation_id: conversationId(agent, rand, i),
      message_id: `MSG-${pad(i + 1, 4)}`,
      ...basePartyColumns(agent, rand),
      channel,
      // Voice exports count one row per completed call (= one "message").
      is_voice_conversation: channel === "Voice" ? "Y" : "N",
      sent_at: sentAt,
      day_of_week: day,
      hour_local: `${pad(8 + Math.floor(rand() * 12))}:00`,
      hour_bucket: hourBucket,
      property_timezone: pick(rand, ["America/Denver", "America/Chicago", "America/Los_Angeles", "America/New_York"]),
      direction: "outbound",
      sub_agent: `${agent[0].toUpperCase()}${agent.slice(1)} AI`,
      character_count: channel === "Voice" ? "" : 40 + Math.floor(rand() * 220),
      call_duration_seconds: channel === "Voice" ? 45 + Math.floor(rand() * 480) : "",
    };
  });
}

function buildEscalationRows(agent: AgentKey, count: number, rand: () => number): CsvRow[] {
  const statuses = ["Open", "Resolved", "Resolved", "Resolved"] as const;
  const reasons = [
    "Price exception requested",
    "Policy clarification",
    "Angry resident",
    "Payment arrangement",
    "Emergency maintenance",
    "Lease language question",
  ];
  return Array.from({ length: count }, (_, i) => {
    const escalatedAt = isoDate(rand);
    const status = pick(rand, statuses);
    const resolvedAt = status === "Resolved" ? addHours(escalatedAt, 2 + rand() * 48) : "";
    return {
      conversation_id: conversationId(agent, rand, i),
      escalation_id: `ESC-${pad(i + 1, 4)}`,
      ...basePartyColumns(agent, rand),
      channel: pick(rand, channelsForAgent(agent)),
      escalated_at: escalatedAt,
      escalation_status: status,
      escalation_reason: pick(rand, reasons),
      resolved_at: resolvedAt,
      assigned_staff: status === "Open" ? "" : pick(rand, ["M. Allen", "T. Brooks", "L. Greene", "D. Murphy"]),
      sub_agent: `${agent[0].toUpperCase()}${agent.slice(1)} AI`,
    };
  });
}

function buildOptOutRows(agent: AgentKey, count: number, rand: () => number): CsvRow[] {
  // Resident response / opt-out channel splits exclude Chat (& Voice where noted).
  const channels =
    agent === "maintenance" ? ["Voice", "SMS"] : agent === "leasing" ? ["Voice", "SMS", "Email"] : ["SMS", "Email"];
  return Array.from({ length: count }, (_, i) => {
    const lastAgentAt = isoDate(rand);
    const hoursSince = Math.round((2 + rand() * 40) * 10) / 10;
    return {
      conversation_id: conversationId(agent, rand, i),
      ...basePartyColumns(agent, rand),
      channel: pick(rand, channels),
      opt_out_at: addHours(lastAgentAt, hoursSince),
      last_agent_message_at: lastAgentAt,
      hours_since_last_agent_message: hoursSince,
      attributed_to_sub_agent: `${agent[0].toUpperCase()}${agent.slice(1)} AI`,
      opt_out_keyword: pick(rand, ["STOP", "UNSUBSCRIBE", "STOPALL"]),
    };
  });
}

function buildAgentResponseRows(agent: AgentKey, count: number, rand: () => number): CsvRow[] {
  return Array.from({ length: count }, (_, i) => {
    const residentAt = isoDate(rand);
    const seconds = Math.max(2, Math.round(3 + rand() * 25));
    const excluded = rand() < 0.08;
    return {
      conversation_id: conversationId(agent, rand, i),
      turn_id: `TURN-${pad(i + 1, 4)}`,
      ...basePartyColumns(agent, rand),
      channel: pick(rand, channelsForAgent(agent)),
      resident_message_at: residentAt,
      agent_reply_at: excluded ? "" : addHours(residentAt, seconds / 3600),
      response_time_seconds: excluded ? "" : seconds,
      included_in_average: excluded ? "N" : "Y",
      exclusion_reason: excluded ? pick(rand, ["Blocking escalation", "No agent reply yet"]) : "",
      sub_agent: `${agent[0].toUpperCase()}${agent.slice(1)} AI`,
    };
  });
}

function buildResidentResponseRows(agent: AgentKey, count: number, rand: () => number): CsvRow[] {
  const channels = ["SMS", "Email"];
  return Array.from({ length: count }, (_, i) => {
    const proactiveAt = isoDate(rand);
    const replied = rand() < 0.4;
    const hoursToReply = replied ? Math.round((0.5 + rand() * 40) * 10) / 10 : "";
    return {
      conversation_id: conversationId(agent, rand, i),
      outreach_message_id: `OUT-${pad(i + 1, 4)}`,
      ...basePartyColumns(agent, rand),
      channel: pick(rand, channels),
      proactive_message_at: proactiveAt,
      resident_replied_within_48h: replied ? "Y" : "N",
      resident_reply_at: replied ? addHours(proactiveAt, Number(hoursToReply)) : "",
      hours_to_reply: hoursToReply,
      included_in_response_time_average: replied ? "Y" : "N",
      sub_agent: `${agent[0].toUpperCase()}${agent.slice(1)} AI`,
    };
  });
}

function buildRenewalVelocityRows(count: number, rand: () => number): CsvRow[] {
  return Array.from({ length: count }, (_, i) => {
    const offerAt = isoDate(rand, 90);
    const daysToSign = Math.round((4 + rand() * 18) * 10) / 10;
    const signedAt = addDays(offerAt, daysToSign);
    const daysBeforeLeaseEnd = Math.round(30 + rand() * 90);
    return {
      conversation_id: conversationId("renewals", rand, i),
      ...basePartyColumns("renewals", rand),
      channel: pick(rand, ["SMS", "Chat", "Email"]),
      offer_generated_at: offerAt,
      lease_signed_at: signedAt,
      days_offer_to_signature: daysToSign,
      lease_end_date: addDays(signedAt, daysBeforeLeaseEnd).slice(0, 10),
      days_before_lease_end: daysBeforeLeaseEnd,
      signed_60_plus_days_early: daysBeforeLeaseEnd >= 60 ? "Y" : "N",
      interacted_with_renewals_ai: "Y",
    };
  });
}

function buildLeadConversionRows(count: number, rand: () => number): CsvRow[] {
  return Array.from({ length: count }, (_, i) => {
    const firstAt = isoDate(rand, 120);
    const converted = rand() < 0.28;
    const days = converted ? Math.round((2 + rand() * 20) * 10) / 10 : "";
    return {
      conversation_id: conversationId("leasing", rand, i),
      ...basePartyColumns("leasing", rand),
      channel: pick(rand, ["Voice", "Chat", "SMS", "Email"]),
      first_leasing_ai_engagement_at: firstAt,
      converted_to_lease: converted ? "Y" : "N",
      lease_signed_at: converted ? addDays(firstAt, Number(days)) : "",
      days_to_signed_lease: days,
      lead_source: pick(rand, ["ILS", "Website", "Referral", "Walk-in", "Chatbot"]),
    };
  });
}

function buildWorkOrderRows(count: number, rand: () => number, emergencyOnly = false): CsvRow[] {
  return Array.from({ length: count }, (_, i) => {
    const createdAt = isoDate(rand);
    const emergency = emergencyOnly || rand() < 0.15;
    const resolved = rand() < 0.85;
    const hours = Math.round((4 + rand() * (emergency ? 18 : 40)) * 10) / 10;
    return {
      conversation_id: conversationId("maintenance", rand, i),
      work_order_id: `WO-${pad(2000 + i, 5)}`,
      ...basePartyColumns("maintenance", rand),
      channel: pick(rand, ["Voice", "Chat", "SMS"]),
      created_at: createdAt,
      priority: emergency ? "Emergency" : pick(rand, ["Normal", "Normal", "High"]),
      status: resolved ? "Resolved" : "Open",
      resolved_at: resolved ? addHours(createdAt, hours) : "",
      resolution_hours: resolved ? hours : "",
      category: pick(rand, ["Plumbing", "HVAC", "Electrical", "Appliance", "Access"]),
      created_by_maintenance_ai: "Y",
    };
  });
}

function buildPaymentCollectionRows(count: number, rand: () => number): CsvRow[] {
  return Array.from({ length: count }, (_, i) => {
    const due = isoDate(rand, 45).slice(0, 10);
    const onTime = rand() < 0.93;
    const daysOffset = onTime ? -Math.floor(rand() * 3) : 1 + Math.floor(rand() * 12);
    const received = addDays(`${due}T12:00:00Z`, daysOffset).slice(0, 10);
    return {
      conversation_id: conversationId("payments", rand, i),
      ...basePartyColumns("payments", rand),
      channel: pick(rand, ["SMS", "Email"]),
      payment_due_date: due,
      payment_received_date: received,
      on_time: onTime ? "Y" : "N",
      balance_amount: (850 + Math.floor(rand() * 1200)).toFixed(2),
      deflected_without_staff: rand() < 0.68 ? "Y" : "N",
      outreach_count: 1 + Math.floor(rand() * 4),
      sub_agent: "Payments AI",
    };
  });
}

function buildFunnelRows(count: number, rand: () => number): CsvRow[] {
  return Array.from({ length: count }, (_, i) => {
    const started = isoDate(rand, 75);
    const accepted = rand() < 0.48;
    const signed = accepted && rand() < 0.84;
    return {
      conversation_id: conversationId("renewals", rand, i),
      ...basePartyColumns("renewals", rand),
      channel: pick(rand, ["SMS", "Chat", "Email"]),
      conversation_started_at: started,
      unique_resident_in_denominator: "Y",
      offer_accepted: accepted ? "Y" : "N",
      offer_accepted_at: accepted ? addDays(started, 1 + Math.floor(rand() * 10)) : "",
      lease_signed: signed ? "Y" : "N",
      lease_signed_at: signed ? addDays(started, 3 + Math.floor(rand() * 20)) : "",
      accept_method: accepted ? pick(rand, ["In-conversation", "Portal", "Staff-assisted"]) : "",
      sign_method: signed ? pick(rand, ["E-sign", "In-office", "Portal"]) : "",
    };
  });
}

function rowsForMetric(agent: AgentKey, metric: string, rand: () => number): CsvRow[] {
  const normalized = metric.toLowerCase();

  if (normalized.includes("messages sent by day") || normalized.includes("messages sent by hour") || normalized === "total messages sent") {
    return buildMessageRows(agent, 40, rand);
  }
  if (normalized.includes("escalation")) {
    return buildEscalationRows(agent, 30, rand);
  }
  if (normalized.includes("opt out")) {
    return buildOptOutRows(agent, 25, rand);
  }
  if (normalized.includes("agent response time")) {
    return buildAgentResponseRows(agent, 35, rand);
  }
  if (normalized.includes("resident response")) {
    return buildResidentResponseRows(agent, 35, rand);
  }
  if (normalized.includes("renewal velocity")) {
    return buildRenewalVelocityRows(30, rand);
  }
  if (normalized.includes("lead conversion")) {
    return buildLeadConversionRows(30, rand);
  }
  if (normalized.includes("emergency work")) {
    return buildWorkOrderRows(25, rand, true);
  }
  if (normalized.includes("work order") || normalized.includes("resolution time")) {
    return buildWorkOrderRows(30, rand, false);
  }
  if (normalized.includes("payment collection")) {
    return buildPaymentCollectionRows(30, rand);
  }
  if (normalized.includes("conversations") && normalized.includes("offers")) {
    return buildFunnelRows(35, rand);
  }

  // Safe fallback: conversation-level message extract.
  return buildMessageRows(agent, 30, rand);
}

export function exportAgentMetricCsv({
  agent,
  metric,
}: {
  agent: AgentKey;
  metric: string;
}) {
  const rand = seededRand(hashSeed(`${agent}:${metric}:export-v1`));
  const rows = rowsForMetric(agent, metric, rand);
  const filename = `${agent}-${slug(metric)}-raw-export.csv`;
  downloadCsv(filename, rows);
}

export type { AgentKey };
