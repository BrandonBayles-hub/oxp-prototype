import {
  EVENT_BUS_DOMAINS,
  EVENT_BUS_EVENTS,
  getEventBusDomain,
  type EventBusEvent,
} from "./event-bus-events.generated";

export type CatalogEvent = {
  id: string;
  label: string;
  description: string;
  category: "Leasing" | "Resident" | "Accounting" | "Operations" | "Communication";
  /**
   * Average events per month. For bus events this is unknown at build time
   * (real volume comes from telemetry), so we default to 0 and let the cost
   * calculator treat it as "unestimated" rather than inventing a number.
   */
  avgPerMonth: number;
  /**
   * Keyword tokens used by `custom-agents-inference.ts` to match a prompt to
   * likely events. For bus events we derive these from the event value,
   * label, and domain name — not a hand-written list.
   */
  keywords: string[];
  /**
   * Business Event Bus metadata (only set for entries backed by the
   * authoritative Kafka catalog in `event-bus-events.generated.ts`).
   */
  bus?: {
    value: string;
    caseName: string;
    domainId: string;
    domainName: string;
    kafkaTopicBase: string;
    sourceFile: string;
  };
};

export type CatalogDataSource = {
  id: string;
  label: string;
  description: string;
  category: "Leasing" | "Resident" | "Accounting" | "Operations" | "Property" | "Communication";
  keywords: string[];
  sensitivity: "low" | "medium" | "high";
};

export type CatalogSkill = {
  id: string;
  label: string;
  description: string;
  category: "Leasing" | "Resident" | "Accounting" | "Operations" | "Communication";
  keywords: string[];
  requiresApproval: boolean;
};

/**
 * Build the keyword list for an event-bus event by tokenizing its value,
 * label, and domain name. This replaces the previously hand-written keyword
 * lists, which made claims about specific events that do not exist on the bus.
 */
function keywordsFor(event: EventBusEvent, domainName: string): string[] {
  const tokens = new Set<string>();
  const add = (s: string) => {
    const t = s.trim().toLowerCase();
    if (t.length >= 3) tokens.add(t);
  };
  add(event.value);
  add(event.value.replace(/-/g, " "));
  add(event.label.toLowerCase());
  for (const part of event.value.split("-")) add(part);
  for (const part of event.label.split(/\s+/)) add(part);
  add(domainName.toLowerCase());
  return Array.from(tokens);
}

/**
 * EVENT_CATALOG — the set of events the Agent Builder offers as triggers.
 *
 * Sourced entirely from the Kafka Business Event Bus catalog generated from
 * the authoritative PHP enums (`event-bus-events.generated.ts`). The shape of
 * this array is preserved so existing call-sites continue to work, but every
 * entry is a real event published to the bus — no fabricated data.
 *
 * Regenerate the underlying catalog with: `npm run gen:event-bus-catalog`.
 */
export const EVENT_CATALOG: CatalogEvent[] = EVENT_BUS_EVENTS.map((e) => {
  const domain = getEventBusDomain(e.domainId);
  const domainName = domain?.name ?? e.domainId;
  return {
    id: e.id,
    label: e.label,
    description: `Published to Kafka topic \`${e.kafkaTopicBase}\` by ${domainName}.`,
    category: domain?.uiCategory ?? "Operations",
    avgPerMonth: 0,
    keywords: keywordsFor(e, domainName),
    bus: {
      value: e.value,
      caseName: e.caseName,
      domainId: e.domainId,
      domainName,
      kafkaTopicBase: e.kafkaTopicBase,
      sourceFile: domain?.sourceFile ?? "",
    },
  };
});

/** Re-export the raw domain list so UI components can group events. */
export { EVENT_BUS_DOMAINS };

export const DATA_CATALOG: CatalogDataSource[] = [
  { id: "data.pre_bill_batch", label: "Pre-bill batch data", description: "Utility batch line items, totals, and gross recapture.", category: "Accounting", keywords: ["pre bill", "prebill", "utility", "recapture", "batch"], sensitivity: "medium" },
  { id: "data.invoice_ledger", label: "Invoice & AP ledger", description: "Vendor invoices, GL coding, payment history.", category: "Accounting", keywords: ["invoice", "ap", "ledger", "gl"], sensitivity: "medium" },
  { id: "data.rent_roll", label: "Rent roll", description: "Current residents, rent, lease dates.", category: "Resident", keywords: ["rent roll", "resident", "lease"], sensitivity: "medium" },
  { id: "data.lead_profile", label: "Lead profile", description: "Lead source, preferences, contact info, activity history.", category: "Leasing", keywords: ["lead", "prospect", "guest card"], sensitivity: "medium" },
  { id: "data.tour_schedule", label: "Tour schedule", description: "Upcoming and historical tour appointments.", category: "Leasing", keywords: ["tour", "schedule", "appointment"], sensitivity: "low" },
  { id: "data.leasing_agent_directory", label: "Leasing agent directory", description: "On-site staff contact info and schedules.", category: "Leasing", keywords: ["leasing agent", "staff", "on-site"], sensitivity: "low" },
  { id: "data.property_info", label: "Property info & amenities", description: "Floorplans, pricing, amenities, pet policy, office hours.", category: "Property", keywords: ["property", "amenity", "pet", "hours", "floorplan", "pricing"], sensitivity: "low" },
  { id: "data.work_orders", label: "Work orders", description: "Maintenance tickets, status, history.", category: "Operations", keywords: ["work order", "maintenance"], sensitivity: "low" },
  { id: "data.resident_accounts", label: "Resident ledger", description: "Per-resident charges, credits, balances.", category: "Resident", keywords: ["ledger", "balance", "resident account"], sensitivity: "medium" },
  { id: "data.comms_history", label: "Communication history", description: "Prior messages, calls, and email threads.", category: "Communication", keywords: ["message", "email", "call", "history"], sensitivity: "medium" },
  { id: "data.lease_docs", label: "Lease documents", description: "Lease PDFs and renewal offers.", category: "Resident", keywords: ["lease", "document", "renewal"], sensitivity: "high" },
  { id: "data.screening_results", label: "Screening results", description: "Background and credit screening outcomes.", category: "Leasing", keywords: ["screening", "background", "credit"], sensitivity: "high" },
  { id: "data.property_knowledge", label: "Property knowledge base", description: "Address, office hours, phone, utilities, policies, application requirements, special offers.", category: "Property", keywords: ["property", "office hours", "address", "phone", "application", "utilities"], sensitivity: "low" },
  { id: "data.amenities", label: "Amenities", description: "Community and in-unit amenities (pool, fitness center, smart home, etc.).", category: "Property", keywords: ["amenity", "amenities", "pool", "fitness", "clubhouse", "feature"], sensitivity: "low" },
  { id: "data.floorplans", label: "Floorplans", description: "Available floorplans, bedroom/bath counts, square footage, layouts.", category: "Property", keywords: ["floorplan", "floor plan", "bedroom", "bathroom", "layout", "sqft"], sensitivity: "low" },
  { id: "data.pricing_availability", label: "Pricing & availability", description: "Current rent, availability, move-in windows, specials.", category: "Property", keywords: ["pricing", "price", "rent", "availability", "available", "move-in"], sensitivity: "low" },
  { id: "data.policies", label: "Property policies", description: "Pet, smoking, parking, guest, renters-insurance, Section 8.", category: "Property", keywords: ["policy", "pet", "smoking", "parking", "insurance", "section 8", "breed"], sensitivity: "low" },
  { id: "data.fee_schedule", label: "Fee schedule", description: "All recurring and one-time fees: admin, pet, parking, utility service fees, late fees.", category: "Property", keywords: ["fee", "charge", "service fee", "admin fee", "pet fee", "vcr", "vacant cost recovery"], sensitivity: "low" },
  { id: "data.resident_profile", label: "Resident profile", description: "Current resident identity, contact info, unit, household.", category: "Resident", keywords: ["resident profile", "resident", "unit number", "household"], sensitivity: "medium" },
  { id: "data.workorder_history", label: "Resident work-order history", description: "Prior maintenance tickets for a resident or unit.", category: "Operations", keywords: ["work order history", "past tickets", "maintenance history"], sensitivity: "low" },
  { id: "data.problems_catalog", label: "Problems catalog", description: "Common maintenance issues with troubleshooting steps.", category: "Operations", keywords: ["problem", "issue", "troubleshoot", "leak", "hvac", "appliance"], sensitivity: "low" },
  { id: "data.locations_map", label: "Locations / unit map", description: "Building, floor, and unit layout references.", category: "Operations", keywords: ["location", "building", "unit map", "where"], sensitivity: "low" },
  { id: "data.vcr_invoice", label: "VCR invoice data", description: "Vacant Cost Recovery invoice line items, service periods, prorations.", category: "Accounting", keywords: ["vcr", "vacant cost recovery", "invoice"], sensitivity: "medium" },
];

export const SKILL_CATALOG: CatalogSkill[] = [
  { id: "skill.approve_pre_bill", label: "Approve pre-bill", description: "Mark a utility pre-bill as approved.", category: "Accounting", keywords: ["approve pre bill", "auto approve", "prebill approve"], requiresApproval: true },
  { id: "skill.reject_pre_bill", label: "Reject pre-bill", description: "Reject a utility pre-bill with reason.", category: "Accounting", keywords: ["reject pre bill", "deny prebill"], requiresApproval: true },
  { id: "skill.post_invoice", label: "Post invoice", description: "Code and post an AP invoice to the ledger.", category: "Accounting", keywords: ["post invoice", "ap post"], requiresApproval: true },
  { id: "skill.send_sms", label: "Send SMS", description: "Send a text message to a phone number.", category: "Communication", keywords: ["text", "sms", "send text", "send sms", "message the"], requiresApproval: false },
  { id: "skill.send_email", label: "Send email", description: "Send an email from the agent mailbox.", category: "Communication", keywords: ["email", "send email"], requiresApproval: false },
  { id: "skill.reply_message", label: "Reply to inbound message", description: "Respond to an inbound text or email.", category: "Communication", keywords: ["reply", "respond", "message back"], requiresApproval: false },
  { id: "skill.update_lead", label: "Update lead", description: "Update lead fields (preferences, stage, notes).", category: "Leasing", keywords: ["update lead", "edit lead", "floorplan preference"], requiresApproval: false },
  { id: "skill.send_application_link", label: "Send application link", description: "Email or text an application link to a lead.", category: "Leasing", keywords: ["application link", "send application", "apply"], requiresApproval: false },
  { id: "skill.schedule_tour", label: "Schedule tour", description: "Book a tour on the calendar.", category: "Leasing", keywords: ["schedule tour", "book tour"], requiresApproval: false },
  { id: "skill.create_work_order", label: "Create work order", description: "Open a maintenance ticket.", category: "Operations", keywords: ["create work order", "open ticket"], requiresApproval: false },
  { id: "skill.close_work_order", label: "Close work order", description: "Mark a maintenance ticket complete.", category: "Operations", keywords: ["close work order", "resolve ticket"], requiresApproval: false },
  { id: "skill.create_renewal_offer", label: "Create renewal offer", description: "Generate a renewal offer for a resident.", category: "Resident", keywords: ["renewal offer", "renew lease"], requiresApproval: true },
  { id: "skill.post_note", label: "Post note", description: "Add a note to a record.", category: "Operations", keywords: ["note", "log", "record"], requiresApproval: false },
  { id: "skill.escalate_to_human", label: "Escalate to human", description: "Send task to a human reviewer.", category: "Operations", keywords: ["escalate", "review", "human"], requiresApproval: false },
  { id: "skill.get_tour_availability", label: "Get tour availability", description: "Look up open tour slots for the property in a date window.", category: "Leasing", keywords: ["tour availability", "tour times", "open tour", "tour slot"], requiresApproval: false },
  { id: "skill.get_pricing_availability", label: "Get pricing & availability", description: "Look up current rent and available units for a move-in window.", category: "Leasing", keywords: ["pricing", "availability", "rent", "available unit", "move-in"], requiresApproval: false },
  { id: "skill.get_floorplans", label: "Get floorplans", description: "Retrieve floorplan details for the property.", category: "Leasing", keywords: ["floorplan", "floor plan", "layout"], requiresApproval: false },
  { id: "skill.fee_transparency", label: "Explain fees", description: "Explain a charge or fee line using the property's fee schedule.", category: "Leasing", keywords: ["explain fee", "fee transparency", "service fee", "vcr"], requiresApproval: false },
  { id: "skill.resident_verification", label: "Verify resident identity", description: "Confirm a caller is a current resident before sharing account details.", category: "Resident", keywords: ["verify resident", "resident verification", "identify resident", "confirm identity"], requiresApproval: false },
  { id: "skill.work_order_status", label: "Look up work order status", description: "Retrieve the status of an existing maintenance ticket.", category: "Operations", keywords: ["work order status", "ticket status", "wo status", "check work order"], requiresApproval: false },
  { id: "skill.warm_transfer", label: "Warm transfer to human", description: "Transfer a live call to a teammate with context.", category: "Communication", keywords: ["transfer", "warm transfer", "connect me", "speak to a person"], requiresApproval: false },
  { id: "skill.take_message", label: "Take a message", description: "Capture a voicemail-style message and route to the property.", category: "Communication", keywords: ["take a message", "voicemail", "message for"], requiresApproval: false },
  { id: "skill.add_to_dnc", label: "Add to do-not-call list", description: "Flag a phone number so we never call it again.", category: "Communication", keywords: ["do not call", "dnc", "stop calling"], requiresApproval: false },
  { id: "skill.waive_fee", label: "Waive fee", description: "Waive a charge on a resident's ledger (may require approval).", category: "Accounting", keywords: ["waive fee", "credit", "refund"], requiresApproval: true },
];

/**
 * Voice presets used by the communication section. IDs map to ElevenLabs voice
 * IDs in production; for the prototype they're opaque strings that feed the
 * voice selector + the simulated call experience.
 */
export type VoicePreset = {
  id: string;
  label: string;
  /** Caller-facing name (used in first-message templates, prompts, transcripts). */
  persona: string;
  gender: "feminine" | "masculine" | "neutral";
  accent: string;
  description: string;
  /** Synthetic ElevenLabs-style voice id. */
  elevenlabsVoiceId: string;
};

export const VOICE_CATALOG: VoicePreset[] = [
  { id: "voice.sarah",   label: "Sarah — warm, patient (en-US)",      persona: "Sarah",   gender: "feminine",  accent: "en-US", description: "Warm, patient, great for billing or sensitive topics.",            elevenlabsVoiceId: "21m00Tcm4TlvDq8ikWAM" },
  { id: "voice.eric",    label: "Eric — friendly, upbeat (en-US)",    persona: "Eric",    gender: "masculine", accent: "en-US", description: "Friendly, upbeat, natural for leasing and tours.",                elevenlabsVoiceId: "onwK4e9ZLuTAKqWW03F9" },
  { id: "voice.maya",    label: "Maya — calm, professional (en-US)",  persona: "Maya",    gender: "feminine",  accent: "en-US", description: "Calm, professional, confident. Good default for most agents.",    elevenlabsVoiceId: "EXAVITQu4vr4xnSDxMaL" },
  { id: "voice.diego",   label: "Diego — bilingual EN/ES (en-US)",    persona: "Diego",   gender: "masculine", accent: "en-US", description: "Fluent in English and Spanish. Great for mixed-language properties.", elevenlabsVoiceId: "TxGEqnHWrfWFTfGW9XjX" },
  { id: "voice.harper",  label: "Harper — neutral, gender-free",      persona: "Harper",  gender: "neutral",   accent: "en-US", description: "Neutral, modern, gender-free.",                                   elevenlabsVoiceId: "JBFqnCBsd6RMkjVDRZzb" },
  { id: "voice.olivia",  label: "Olivia — British, polished (en-GB)", persona: "Olivia",  gender: "feminine",  accent: "en-GB", description: "Polished British accent; premium feel.",                          elevenlabsVoiceId: "pMsXgVXv3BLzUgSXRplE" },
];

export const TIME_FREQUENCIES = [
  { value: "once", label: "Once", runsPerMonth: 0.03 },
  { value: "hourly", label: "Hourly", runsPerMonth: 720 },
  { value: "daily", label: "Daily", runsPerMonth: 30 },
  { value: "weekly", label: "Weekly", runsPerMonth: 4.3 },
  { value: "monthly", label: "Monthly", runsPerMonth: 1 },
  { value: "annually", label: "Annually", runsPerMonth: 0.083 },
] as const;

export type TimeFrequency = (typeof TIME_FREQUENCIES)[number]["value"];
