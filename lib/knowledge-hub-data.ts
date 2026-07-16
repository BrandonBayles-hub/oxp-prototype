/**
 * Agent Knowledge Hub — shared types + seed data.
 *
 * Extracted from app/agent-knowledge-hub/page.tsx so lightweight consumers
 * (e.g. the sidebar nav-badge hook) can read the knowledge entries without
 * pulling the full page bundle into their module graph.
 */

// Knowledge entries are one of three kinds: plain "general" knowledge the AI
// draws on when answering, "rules" — short procedural directions that steer how
// the agent behaves — or a "suppression" guardrail. ("factual" and "procedure"
// were folded into "general" — older data using those values is migrated on read.)
export type EntryType = "general" | "rules" | "suppression";
/** Legacy entry types that have been collapsed into "general". */
export type LegacyEntryType = "factual" | "procedure";
/** Normalizes any (possibly legacy) entry type to the current three-type model. */
export function normalizeEntryType(t: EntryType | LegacyEntryType | string): EntryType {
  if (t === "suppression") return "suppression";
  if (t === "rules") return "rules";
  return "general";
}
export type EntryStatus = "approved" | "in_review" | "draft" | "suppressed" | "archived";
export type EntrySource = "manual" | "ai_suggested" | "from_conversation" | "pms";

export type AgentName = "Leasing AI" | "Renewals AI" | "Maintenance AI" | "Payments AI";

export interface KnowledgeVersion {
  version: number;
  date: string;
  author: string;
  note: string;
  /** Snapshot of the entry's content at this version (when available). */
  title?: string;
  body?: string;
}

/**
 * Optional location targeting for property-scoped knowledge. When any list has
 * entries, the knowledge applies ONLY to those locations rather than the whole
 * property. Empty (or undefined) means it applies to the entire property.
 */
export interface PropertyLocationTargets {
  floorPlans: string[];
  unitTypes: string[];
  units: string[];
}

export interface KnowledgeEntry {
  id: string;
  type: EntryType;
  title: string;
  body: string;
  status: EntryStatus;
  source: EntrySource;
  scope: "portfolio" | "property";
  /**
   * For scope "property", the property this entry belongs to. Legacy/seed
   * entries without this field are treated as the default property.
   */
  property?: string;
  /** When scope is "property", optionally narrows to specific locations. */
  appliesTo?: PropertyLocationTargets;
  overridesPortfolio?: { label: string; portfolioValue: string };
  owner: string;
  version: number;
  history: KnowledgeVersion[];
  usageCount: number;
  updatedAt: string;
  agents: AgentName[];
  expiresAt?: string;
  entrataSetting?: { name: string; value: string };
  suppressReason?: string;
  redirectMessage?: string;
  triggers?: string[];
  steps?: string[];
  tag?: string;
}

export const SEED_ENTRIES: KnowledgeEntry[] = [
  {
    id: "gk-portfolio",
    type: "general",
    title: "Coastal Holdings resident experience playbook",
    body:
      "This is the shared reference every Coastal Holdings community draws on. Treat it as background the AI can pull from when no more specific property answer exists.\n\nWho we are: Coastal Holdings manages conventional multifamily communities across the West Coast. We compete on responsiveness and warmth, not the lowest price. When in doubt, be helpful, concrete, and human.\n\nVoice & tone: Friendly, professional, and concise. Use the resident's first name when known. Avoid jargon and never sound like a form letter. It's fine to show a little personality.\n\nService standards: Acknowledge every inbound message, even if the full answer takes longer. Tours and leasing questions get a same-day reply. Maintenance requests are confirmed with a ticket number. Anything involving safety, legal, or money disputes is escalated to onsite staff rather than answered with a guess.\n\nWhat we promise residents: Transparent pricing with no surprise fees, flexible self-guided and live tour options, and a 24/7 path to reach a human for emergencies. We honor quoted prices for 48 hours.\n\nWhat we never do: Make up policies, quote availability we can't confirm, or discuss another resident's account. If a question touches fair housing, income qualification, or accommodations, stay neutral and route to staff.",
    status: "approved",
    source: "manual",
    scope: "portfolio",
    owner: "Corporate",
    version: 2,
    history: [
      {
        version: 2,
        date: "Jun 02, 2026",
        author: "Corporate",
        note: "Added 48-hour price-hold and escalation guidance.",
        title: "Coastal Holdings resident experience playbook",
        body: "Shared brand voice, service standards, and guardrails for every Coastal Holdings community.",
      },
      {
        version: 1,
        date: "Jan 15, 2026",
        author: "Corporate",
        note: "Initial portfolio playbook.",
        title: "Coastal Holdings resident experience playbook",
        body: "Shared brand voice and service standards for every Coastal Holdings community.",
      },
    ],
    usageCount: 63,
    updatedAt: "Jun 02, 2026",
    agents: ["Leasing AI", "Renewals AI", "Maintenance AI", "Payments AI"],
  },
  {
    id: "gk-sunset",
    type: "general",
    title: "Sunset Ridge community & neighborhood guide",
    body:
      "Background the agents can draw on for prospect and resident questions about Sunset Ridge Apartments and the surrounding area.\n\nThe community: 240 units in California, a mix of studios through 3-bedrooms set around two landscaped courtyards. The vibe is quiet and professional — a lot of remote workers and young families. Built in 2019, so finishes are modern (quartz counters, stainless appliances, in-unit washer/dryer in most homes).\n\nAmenities residents love: resort-style pool and spa, a 24/7 fitness center, two co-working lounges with fast Wi-Fi, a dog park and on-site pet spa, and a package room with smart lockers. Covered and reserved parking are available for an added fee.\n\nNeighborhood: Walkable to the Ridgeline shopping center (grocery, coffee, a handful of restaurants) about 8 minutes on foot. The 24 bus stops at the corner and connects to the downtown transit hub in ~20 minutes. Highway 101 is a 5-minute drive.\n\nSchools & families: Zoned for Oakmont Elementary, Pinecrest Middle, and Sunset High — all rated well. The library and a large community park are within a mile.\n\nGood to know: The leasing office is open Mon–Sat; tours can also be self-guided after hours. The community is smoke-free, and quiet hours run 10pm–7am.",
    status: "approved",
    source: "manual",
    scope: "property",
    property: "Sunset Ridge Apartments",
    owner: "J. Ruiz",
    version: 1,
    history: [
      {
        version: 1,
        date: "May 28, 2026",
        author: "J. Ruiz",
        note: "Initial community & neighborhood guide.",
        title: "Sunset Ridge community & neighborhood guide",
        body: "Property overview, amenities, neighborhood, and schools for Sunset Ridge Apartments.",
      },
    ],
    usageCount: 38,
    updatedAt: "May 28, 2026",
    agents: ["Leasing AI", "Renewals AI"],
  },
  {
    id: "gk-reserve",
    type: "general",
    title: "The Reserve at Millcreek — property overview & local area",
    body:
      "Reference material for prospects and residents asking about The Reserve at Millcreek.\n\nThe community: 180 units in Millcreek, Utah, tucked against the foothills. Newer garden-style buildings with mountain views from the upper floors. Popular with outdoor enthusiasts and commuters into Salt Lake City.\n\nAmenities: heated saltwater pool, clubhouse with a coffee bar, EV charging stations in the main lot, ski/bike storage rooms, and a fenced bark park. Many homes have private balconies and gas fireplaces.\n\nNeighborhood: Five minutes from the Millcreek Common shops and dining. Quick canyon access for hiking and skiing — Brighton and Solitude are roughly a 35–45 minute drive. I-215 is close for the commute downtown (about 20 minutes off-peak).\n\nSeasonal notes: Winters bring snow; the community plows lots and sidewalks by 7am and salts entries. Remind residents about winter parking rules during storms so plows can clear the lots.\n\nGood to know: Pet-friendly with breed and weight specifics handled by staff. The office is open Mon–Fri plus Saturday mornings.",
    status: "approved",
    source: "manual",
    scope: "property",
    property: "The Reserve at Millcreek",
    owner: "M. Olsen",
    version: 1,
    history: [
      {
        version: 1,
        date: "Jun 05, 2026",
        author: "M. Olsen",
        note: "Initial overview for The Reserve at Millcreek.",
        title: "The Reserve at Millcreek — property overview & local area",
        body: "Property overview, amenities, and local-area context for The Reserve at Millcreek.",
      },
    ],
    usageCount: 21,
    updatedAt: "Jun 05, 2026",
    agents: ["Leasing AI", "Renewals AI", "Maintenance AI"],
  },
  {
    id: "gk-parkside",
    type: "general",
    title: "Parkside Lofts building guide & resident know-how",
    body:
      "Background for questions about living at Parkside Lofts.\n\nThe community: 96 loft-style units in a converted warehouse in Portland, Oregon. High ceilings, exposed brick, oversized windows, and polished concrete floors. Draws creatives and professionals who want a true loft feel close to downtown.\n\nBuilding quirks worth knowing: It's an adaptive-reuse building, so layouts vary unit to unit and a few homes have sleeping lofts reached by ladder or open stairs. Sound carries more than in standard wood-frame construction — worth mentioning to noise-sensitive prospects.\n\nAmenities: rooftop deck with skyline views, secure bike room and repair station, a small fitness studio, and ground-floor retail (a cafe and a bakery). Parking is limited; the building uses a waitlist for the underground garage and there's metered street parking nearby.\n\nNeighborhood: Steps from the Parkside light-rail stop, the riverfront path, and Sunday farmers' market. Walk Score is high — most errands are done on foot.\n\nGood to know: No central AC in the original units; portable units are allowed per the lease. The freight elevator is the move-in path and must be reserved with the office.",
    status: "approved",
    source: "manual",
    scope: "property",
    property: "Parkside Lofts",
    owner: "D. Nguyen",
    version: 1,
    history: [
      {
        version: 1,
        date: "Jun 09, 2026",
        author: "D. Nguyen",
        note: "Initial building guide for Parkside Lofts.",
        title: "Parkside Lofts building guide & resident know-how",
        body: "Building character, amenities, and neighborhood context for Parkside Lofts.",
      },
    ],
    usageCount: 12,
    updatedAt: "Jun 09, 2026",
    agents: ["Leasing AI", "Maintenance AI"],
  },
  {
    id: "e-1",
    type: "general",
    title: "Pet rent waived for current employees",
    body:
      "Pet rent is $35/mo in the PMS, but waived for current employees as a perk. Verify employment first via HR portal before quoting.",
    status: "approved",
    source: "manual",
    scope: "property",
    owner: "J. Ruiz",
    version: 3,
    history: [
      {
        version: 3,
        date: "May 12, 2026",
        author: "J. Ruiz",
        note: "Added HR-portal verification step.",
        title: "Pet rent waived for current employees",
        body: "Pet rent is $35/mo in the PMS, but waived for current employees as a perk. Verify employment first via HR portal before quoting.",
      },
      {
        version: 2,
        date: "Apr 02, 2026",
        author: "J. Ruiz",
        note: "Clarified that this is a perk, not a discount.",
        title: "Pet rent waived for current employees",
        body: "Pet rent is $35/mo in the PMS, but waived for current employees as a perk.",
      },
      {
        version: 1,
        date: "Feb 18, 2026",
        author: "J. Ruiz",
        note: "Submitted for review.",
        title: "Pet rent waived for employees",
        body: "Pet rent is waived for current employees.",
      },
    ],
    usageCount: 41,
    updatedAt: "May 12, 2026",
    agents: ["Leasing AI", "Renewals AI"],
    entrataSetting: { name: "Pet rent (monthly)", value: "$35.00" },
  },
  {
    id: "e-2",
    type: "general",
    title: "Guest parking — portfolio standard",
    body:
      "Guests may park in any unmarked spot. No permit required. Overnight parking is allowed up to 3 consecutive nights.",
    status: "approved",
    source: "pms",
    scope: "portfolio",
    owner: "Corporate",
    version: 2,
    history: [
      {
        version: 2,
        date: "Mar 22, 2026",
        author: "Corporate",
        note: "Extended overnight allowance from 1 to 3 nights.",
        title: "Guest parking — portfolio standard",
        body: "Guests may park in any unmarked spot. No permit required. Overnight parking is allowed up to 3 consecutive nights.",
      },
      {
        version: 1,
        date: "Jan 06, 2026",
        author: "Corporate",
        note: "Initial portfolio standard.",
        title: "Guest parking — portfolio standard",
        body: "Guests may park in any unmarked spot. No permit required. Overnight parking is allowed for 1 night.",
      },
    ],
    usageCount: 27,
    updatedAt: "Mar 22, 2026",
    agents: ["Leasing AI"],
  },
  {
    id: "e-3",
    type: "general",
    title: "Guest parking requires a permit at this property",
    body:
      "The lot is shared with ground-floor retail, so guests must get a permit from the office. No overnight guest parking.",
    status: "approved",
    source: "manual",
    scope: "property",
    owner: "J. Ruiz",
    version: 1,
    history: [
      {
        version: 1,
        date: "Apr 18, 2026",
        author: "J. Ruiz",
        note: "Submitted for review.",
        title: "Guest parking requires a permit at this property",
        body: "The lot is shared with ground-floor retail, so guests must get a permit from the office. No overnight guest parking.",
      },
    ],
    usageCount: 14,
    updatedAt: "Apr 18, 2026",
    agents: ["Leasing AI"],
    overridesPortfolio: {
      label: "Guest parking — portfolio standard",
      portfolioValue:
        "Guests may park in any unmarked spot. No permit required. Overnight allowed up to 3 consecutive nights.",
    },
  },
  {
    id: "e-4",
    type: "general",
    title: "Main office entrance is around the back",
    body:
      "Main entrance is around the back, off the Camelback Rd lot. The front door is locked, staff-only. Tell prospects to park in the lot, not the street — street parking is metered M–F 8a–6p.",
    status: "approved",
    source: "manual",
    scope: "property",
    owner: "J. Ruiz",
    version: 2,
    history: [
      {
        version: 2,
        date: "May 02, 2026",
        author: "J. Ruiz",
        note: "Added street-parking detail.",
        title: "Main office entrance is around the back",
        body: "Main entrance is around the back, off the Camelback Rd lot. The front door is locked, staff-only. Tell prospects to park in the lot, not the street — street parking is metered M–F 8a–6p.",
      },
      {
        version: 1,
        date: "Feb 11, 2026",
        author: "J. Ruiz",
        note: "Submitted for review.",
        title: "Main office entrance is around the back",
        body: "Main entrance is around the back, off the Camelback Rd lot. The front door is locked, staff-only.",
      },
    ],
    usageCount: 240,
    updatedAt: "May 02, 2026",
    agents: ["Leasing AI", "Maintenance AI"],
  },
  {
    id: "e-5",
    type: "general",
    title: 'Bedroom window heights (A1 floor plan)',
    body:
      'In the A1 one-bedroom, the window sill sits 30" off the floor and the window is 48" tall. Prospects ask to check if nightstands fit.',
    status: "approved",
    source: "manual",
    scope: "property",
    owner: "M. Chen",
    version: 1,
    history: [
      {
        version: 1,
        date: "Mar 04, 2026",
        author: "M. Chen",
        note: "Submitted for review.",
        title: "Bedroom window heights (A1 floor plan)",
        body: 'In the A1 one-bedroom, the window sill sits 30" off the floor and the window is 48" tall. Prospects ask to check if nightstands fit.',
      },
    ],
    usageCount: 12,
    updatedAt: "Mar 04, 2026",
    agents: ["Leasing AI"],
  },
  {
    id: "e-6",
    type: "suppression",
    title: "Don't discuss the property smoking policy",
    body: "Smoking policy is under legal review. The AI must not state or speculate on the current policy.",
    status: "suppressed",
    source: "manual",
    scope: "property",
    owner: "Legal / Corporate",
    version: 1,
    history: [
      {
        version: 1,
        date: "Jun 01, 2026",
        author: "Legal / Corporate",
        note: "Suppression activated pending legal review.",
        title: "Don't discuss the property smoking policy",
        body: "Smoking policy is under legal review. The AI must not state or speculate on the current policy.",
      },
    ],
    usageCount: 12,
    updatedAt: "Jun 01, 2026",
    agents: ["Leasing AI", "Renewals AI"],
    suppressReason:
      "Under legal review pending a city ordinance change. No agent should state the policy until counsel signs off.",
    redirectMessage:
      "Great question — let me connect you with a leasing agent who can give you the most up-to-date details.",
  },
  {
    id: "e-7",
    type: "rules",
    title: "March water leak — units 305–315",
    body: "Anyone asking about the March water leak in units 305–315 should be handled with care — don't give specifics.",
    status: "approved",
    source: "manual",
    scope: "property",
    owner: "M. Chen",
    version: 2,
    history: [
      {
        version: 2,
        date: "Apr 28, 2026",
        author: "M. Chen",
        note: "Added the 'tag the conversation' step.",
        title: "March water leak — units 305–315",
        body: "Anyone asking about the March water leak in units 305–315 should be handled with care — don't give specifics. Acknowledge, apologize, hand off to the onsite team within the hour, and tag the conversation 'water-leak' for legal review.",
      },
      {
        version: 1,
        date: "Mar 30, 2026",
        author: "M. Chen",
        note: "Submitted for review.",
        title: "March water leak — units 305–315",
        body: "Anyone asking about the March water leak in units 305–315 should be handled with care — don't give specifics. Acknowledge, apologize, and hand off to the onsite team within the hour.",
      },
    ],
    usageCount: 7,
    updatedAt: "Apr 28, 2026",
    agents: ["Maintenance AI", "Leasing AI"],
    triggers: ["water leak", "units 305-315", "mold", "ceiling damage"],
    tag: "water-leak",
    steps: [
      "Don't answer with specifics about cause, scope, or repair status.",
      "Acknowledge warmly and apologize for the inconvenience.",
      "Hand off to the onsite team within the hour.",
      "Tag the conversation 'water-leak' so legal can review.",
    ],
  },
  {
    id: "e-8",
    type: "general",
    title: "Pool closed for resurfacing",
    body:
      "Pool closed for resurfacing Jun 10 – Jul 15. Hot tub and gym remain open. Give the reopening date and apologize for the inconvenience.",
    status: "approved",
    source: "manual",
    scope: "property",
    owner: "J. Ruiz",
    version: 1,
    history: [
      {
        version: 1,
        date: "Jun 08, 2026",
        author: "J. Ruiz",
        note: "Submitted for review.",
        title: "Pool closed for resurfacing",
        body: "Pool closed for resurfacing Jun 10 – Jul 15. Hot tub and gym remain open. Give the reopening date and apologize for the inconvenience.",
      },
    ],
    usageCount: 34,
    updatedAt: "Jun 08, 2026",
    expiresAt: "Jul 15, 2026",
    agents: ["Leasing AI", "Maintenance AI"],
  },
  {
    id: "e-9",
    type: "rules",
    title: "Resident gate code procedure",
    body:
      "Residents get the gate code at move-in via the welcome email. Never give prospects the code — direct them to the call box (#2201).",
    status: "in_review",
    source: "manual",
    scope: "property",
    owner: "A. Patel",
    version: 1,
    history: [
      {
        version: 1,
        date: "Jun 14, 2026",
        author: "A. Patel",
        note: "Submitted for review.",
        title: "Resident gate code procedure",
        body: "Residents get the gate code at move-in via the welcome email. Never give prospects the code — direct them to the call box (#2201).",
      },
    ],
    usageCount: 0,
    updatedAt: "Jun 14, 2026",
    agents: ["Leasing AI", "Maintenance AI"],
  },
  {
    id: "e-10",
    type: "general",
    title: "Closest coffee + walk-up breakfast",
    body:
      "Cartel Roasting Co. (5 min walk, north on Central). Matt's Big Breakfast is 10 min by car. Prospects on tours often ask.",
    status: "approved",
    source: "from_conversation",
    scope: "property",
    owner: "M. Chen",
    version: 1,
    history: [
      {
        version: 1,
        date: "Apr 11, 2026",
        author: "M. Chen",
        note: "Approved from a conversation suggestion.",
        title: "Closest coffee + walk-up breakfast",
        body: "Cartel Roasting Co. (5 min walk, north on Central). Matt's Big Breakfast is 10 min by car. Prospects on tours often ask.",
      },
    ],
    usageCount: 18,
    updatedAt: "Apr 11, 2026",
    agents: ["Leasing AI"],
  },
];
