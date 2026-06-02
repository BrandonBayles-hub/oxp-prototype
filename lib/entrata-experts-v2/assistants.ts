import {
  MessageSquareText,
  PenSquare,
  FileSearch,
  CalendarRange,
  Building2,
  TrendingUp,
  Mail,
  type LucideIcon,
} from "lucide-react";

export interface AssistantDef {
  id: string;
  name: string;
  shortName: string;
  description: string;
  blurb: string;
  /** Lucide fallback icon (used if the production logo image is unavailable). */
  icon: LucideIcon;
  /**
   * Production expert logo, extracted from the live EntrataGPT app into
   * /public/experts/. Full-color gradient badge — render as an <img>, not
   * inside a tinted container (the badge carries its own circular bg).
   */
  image: string;
  hue: string;
  exampleStarters: string[];
}

/** Entrata Analyst's production logo (report-intelligence badge). */
export const ANALYST_LOGO = "/experts/analyst.svg";

/**
 * Report Analyzer badge. No 1:1 production logo exists, so this is authored in
 * the same gradient-badge style (indigo circle + white bar-chart glyph) to sit
 * cohesively alongside the production assistant badges in the rail.
 */
export const REPORT_ANALYZER_LOGO = "/experts/report-analyzer.svg";

export const ASSISTANTS: AssistantDef[] = [
  {
    id: "everyday",
    name: "Everyday Assistant",
    shortName: "Everyday Assistant",
    description: "Your general-purpose AI for day-to-day questions and quick research.",
    blurb: "Ask anything from quick math to brainstorming and summaries.",
    icon: MessageSquareText,
    image: "/experts/everyday.svg",
    hue: "#475569",
    exampleStarters: [
      "Summarize the difference between Class A and Class B properties",
      "Explain why NPS is a useful retention metric",
      "Draft a polite reply to a vendor follow-up",
    ],
  },
  {
    id: "ad-writing",
    name: "Ad Writing Assistant",
    shortName: "Ad Writing",
    description: "Generate marketing copy, listing headlines, and digital ad creative.",
    blurb: "Write listings, social posts, and PPC headlines for any property.",
    icon: PenSquare,
    image: "/experts/ad-writing.svg",
    hue: "#c2410c",
    exampleStarters: [
      "Write a Facebook ad for a 2-bed loft in downtown Tampa",
      "5 listing headlines for a luxury student community",
      "Email subject lines for a renewal campaign",
    ],
  },
  {
    id: "document-analyzer",
    name: "Document Analyzer",
    shortName: "Document Analyzer",
    description: "Summarize leases, vendor contracts, policy docs, and PDFs.",
    blurb: "Drop in a document and get a structured summary, risks, and action items.",
    icon: FileSearch,
    image: "/experts/document-analyzer.svg",
    hue: "#0f766e",
    exampleStarters: [
      "Summarize a 12-page commercial lease into 5 bullets",
      "Pull out the renewal options from this vendor contract",
      "Flag clauses that may conflict with our late-fee policy",
    ],
  },
  {
    id: "event-planning",
    name: "Event Planning Assistant",
    shortName: "Event Planning",
    description: "Plan resident events, vendor mix, budget, and timeline.",
    blurb: "Build the run-of-show, budget, and resident invite for any event.",
    icon: CalendarRange,
    image: "/experts/event-planning.svg",
    hue: "#7c3aed",
    exampleStarters: [
      "Plan a Friday-night resident pool party for 80 attendees",
      "Budget breakdown for a Halloween community event",
      "Timeline for a Q3 amenity launch",
    ],
  },
  {
    id: "multifamily-research",
    name: "Multifamily Research Assistant",
    shortName: "Multifamily Research",
    description: "Industry research, market trends, and competitor positioning.",
    blurb: "Research markets, comps, and macro trends for multifamily.",
    icon: Building2,
    image: "/experts/multifamily-research.svg",
    hue: "#3b7a9e",
    exampleStarters: [
      "Top trends in multifamily for 2026",
      "How are operators using AI for leasing today?",
      "Rent growth outlook for the Sun Belt next 12 months",
    ],
  },
  {
    id: "portfolio-strategy",
    name: "Portfolio Strategy Assistant",
    shortName: "Portfolio Strategy",
    description: "Frameworks for capital allocation, hold/sell, and disposition strategy.",
    blurb: "Stress-test pricing, hold/sell, and capital allocation strategy.",
    icon: TrendingUp,
    image: "/experts/portfolio-strategy.svg",
    hue: "#0891b2",
    exampleStarters: [
      "Frameworks for hold vs. sell on a stabilized asset",
      "How should I think about cap-ex prioritization across 10 properties?",
      "Talking points for an LP update on portfolio performance",
    ],
  },
  {
    id: "resident-writing",
    name: "Resident Writing Assistant",
    shortName: "Resident Writing",
    description: "Resident communications: notices, emails, and policy explanations.",
    blurb: "Write resident-friendly notices, reminders, and announcements.",
    icon: Mail,
    image: "/experts/resident-writing.svg",
    hue: "#a16207",
    exampleStarters: [
      "Draft a polite late-rent reminder for a first-time offender",
      "Notice about water shutoff on Tuesday between 9–11 AM",
      "Welcome email for a new resident in a 2-bed unit",
    ],
  },
];

export const ASSISTANT_BY_ID: Record<string, AssistantDef> = ASSISTANTS.reduce(
  (acc, a) => ({ ...acc, [a.id]: a }),
  {},
);
