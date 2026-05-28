export type SegmentId =
  | "conventional"
  | "student"
  | "commercial"
  | "military"
  | "affordable"
  | "senior";

export const SEGMENTS: { id: SegmentId; label: string }[] = [
  { id: "conventional", label: "Conventional" },
  { id: "student", label: "Student" },
  { id: "commercial", label: "Commercial" },
  { id: "military", label: "Military" },
  { id: "affordable", label: "Affordable" },
  { id: "senior", label: "Senior" },
];

export interface Property {
  id: string;
  name: string;
  shortName: string;
  region: "southeast" | "mountain-west";
  city: string;
  state: string;
  segment: SegmentId;
  units: number;
  occupancyPct: number;
  delinquencyPct: number;
  ytdNoiPerUnit: number;
  ytdNoiBudgetPerUnit: number;
  rentGrowthPct: number;
  workOrdersOpen: number;
  workOrderMTTRDays: number;
  appsThisWeek: number;
  toursThisWeek: number;
  leasesThisWeek: number;
  renewalsAcceptancePct: number;
  onlinePaymentPct: number;
}

export const REGIONS = [
  { id: "southeast", label: "Southeast" },
  { id: "mountain-west", label: "Mountain West" },
] as const;

export const PROPERTIES: Property[] = [
  {
    id: "wb-tampa-1",
    name: "Wynbrook Tampa Bay",
    shortName: "Tampa Bay",
    region: "southeast",
    city: "Tampa",
    state: "FL",
    segment: "conventional",
    units: 312,
    occupancyPct: 93.4,
    delinquencyPct: 6.8,
    ytdNoiPerUnit: 9410,
    ytdNoiBudgetPerUnit: 9820,
    rentGrowthPct: 1.4,
    workOrdersOpen: 21,
    workOrderMTTRDays: 3.1,
    appsThisWeek: 18,
    toursThisWeek: 27,
    leasesThisWeek: 6,
    renewalsAcceptancePct: 51.2,
    onlinePaymentPct: 78.4,
  },
  {
    id: "wb-tampa-2",
    name: "Wynbrook Westshore",
    shortName: "Westshore",
    region: "southeast",
    city: "Tampa",
    state: "FL",
    segment: "conventional",
    units: 224,
    occupancyPct: 95.1,
    delinquencyPct: 5.4,
    ytdNoiPerUnit: 11220,
    ytdNoiBudgetPerUnit: 10940,
    rentGrowthPct: 2.7,
    workOrdersOpen: 12,
    workOrderMTTRDays: 1.9,
    appsThisWeek: 14,
    toursThisWeek: 22,
    leasesThisWeek: 5,
    renewalsAcceptancePct: 58.9,
    onlinePaymentPct: 84.1,
  },
  {
    id: "wb-charlotte",
    name: "Wynbrook Charlotte Crossings",
    shortName: "Charlotte",
    region: "southeast",
    city: "Charlotte",
    state: "NC",
    segment: "conventional",
    units: 268,
    occupancyPct: 96.3,
    delinquencyPct: 3.2,
    ytdNoiPerUnit: 12180,
    ytdNoiBudgetPerUnit: 11520,
    rentGrowthPct: 3.1,
    workOrdersOpen: 8,
    workOrderMTTRDays: 1.4,
    appsThisWeek: 11,
    toursThisWeek: 19,
    leasesThisWeek: 7,
    renewalsAcceptancePct: 62.1,
    onlinePaymentPct: 86.4,
  },
  {
    id: "wb-denver",
    name: "Wynbrook LoHi",
    shortName: "LoHi",
    region: "mountain-west",
    city: "Denver",
    state: "CO",
    segment: "conventional",
    units: 198,
    occupancyPct: 94.4,
    delinquencyPct: 4.7,
    ytdNoiPerUnit: 13150,
    ytdNoiBudgetPerUnit: 12810,
    rentGrowthPct: 2.2,
    workOrdersOpen: 14,
    workOrderMTTRDays: 2.4,
    appsThisWeek: 9,
    toursThisWeek: 16,
    leasesThisWeek: 4,
    renewalsAcceptancePct: 55.8,
    onlinePaymentPct: 81.2,
  },
  {
    id: "wb-tucson",
    name: "Wynbrook Cat Quarter",
    shortName: "Cat Quarter",
    region: "mountain-west",
    city: "Tucson",
    state: "AZ",
    segment: "student",
    units: 612,
    occupancyPct: 97.1,
    delinquencyPct: 2.4,
    ytdNoiPerUnit: 8420,
    ytdNoiBudgetPerUnit: 8210,
    rentGrowthPct: 4.1,
    workOrdersOpen: 18,
    workOrderMTTRDays: 1.2,
    appsThisWeek: 26,
    toursThisWeek: 38,
    leasesThisWeek: 12,
    renewalsAcceptancePct: 46.4,
    onlinePaymentPct: 91.8,
  },
  {
    id: "wb-asu",
    name: "Wynbrook Sun Devil Commons",
    shortName: "Sun Devil",
    region: "mountain-west",
    city: "Tempe",
    state: "AZ",
    segment: "student",
    units: 488,
    occupancyPct: 98.6,
    delinquencyPct: 1.9,
    ytdNoiPerUnit: 9180,
    ytdNoiBudgetPerUnit: 8830,
    rentGrowthPct: 4.9,
    workOrdersOpen: 22,
    workOrderMTTRDays: 1.0,
    appsThisWeek: 31,
    toursThisWeek: 44,
    leasesThisWeek: 14,
    renewalsAcceptancePct: 43.8,
    onlinePaymentPct: 93.2,
  },
  {
    id: "wb-mia-commercial",
    name: "Wynbrook Brickell Tower",
    shortName: "Brickell Tower",
    region: "southeast",
    city: "Miami",
    state: "FL",
    segment: "commercial",
    units: 84,
    occupancyPct: 91.7,
    delinquencyPct: 4.1,
    ytdNoiPerUnit: 22480,
    ytdNoiBudgetPerUnit: 23120,
    rentGrowthPct: 3.6,
    workOrdersOpen: 6,
    workOrderMTTRDays: 2.2,
    appsThisWeek: 4,
    toursThisWeek: 9,
    leasesThisWeek: 2,
    renewalsAcceptancePct: 71.4,
    onlinePaymentPct: 96.1,
  },
  {
    id: "wb-bragg-military",
    name: "Wynbrook Bragg Reserve",
    shortName: "Bragg Reserve",
    region: "southeast",
    city: "Fayetteville",
    state: "NC",
    segment: "military",
    units: 416,
    occupancyPct: 99.2,
    delinquencyPct: 1.1,
    ytdNoiPerUnit: 7840,
    ytdNoiBudgetPerUnit: 7910,
    rentGrowthPct: 1.8,
    workOrdersOpen: 24,
    workOrderMTTRDays: 1.6,
    appsThisWeek: 12,
    toursThisWeek: 15,
    leasesThisWeek: 9,
    renewalsAcceptancePct: 68.3,
    onlinePaymentPct: 88.7,
  },
  {
    id: "wb-slc-affordable",
    name: "Wynbrook Pioneer Place",
    shortName: "Pioneer Place",
    region: "mountain-west",
    city: "Salt Lake City",
    state: "UT",
    segment: "affordable",
    units: 142,
    occupancyPct: 99.6,
    delinquencyPct: 3.4,
    ytdNoiPerUnit: 5620,
    ytdNoiBudgetPerUnit: 5740,
    rentGrowthPct: 0.9,
    workOrdersOpen: 11,
    workOrderMTTRDays: 2.8,
    appsThisWeek: 7,
    toursThisWeek: 11,
    leasesThisWeek: 3,
    renewalsAcceptancePct: 81.2,
    onlinePaymentPct: 72.9,
  },
];

export interface Region {
  id: "southeast" | "mountain-west" | "all";
  label: string;
  propertyIds: string[];
}

export const REGION_DEFS: Region[] = [
  {
    id: "all",
    label: "All regions",
    propertyIds: PROPERTIES.map((p) => p.id),
  },
  {
    id: "southeast",
    label: "Southeast",
    propertyIds: PROPERTIES.filter((p) => p.region === "southeast").map((p) => p.id),
  },
  {
    id: "mountain-west",
    label: "Mountain West",
    propertyIds: PROPERTIES.filter((p) => p.region === "mountain-west").map((p) => p.id),
  },
];

export function getProperty(id: string) {
  return PROPERTIES.find((p) => p.id === id);
}

// ---------------------------------------------------------------------------
// Property Groups
//
// In production these live in the Entrata platform (Properties → Groups) and
// are read-only from the Experts UI. Seeded here for the prototype.
// ---------------------------------------------------------------------------

export interface PropertyGroup {
  id: string;
  label: string;
  description: string;
  propertyIds: string[];
}

export const PROPERTY_GROUPS: PropertyGroup[] = [
  {
    id: "grp-top-noi",
    label: "Top NOI",
    description: "Highest YTD NOI per unit",
    propertyIds: ["wb-mia-commercial", "wb-denver", "wb-charlotte", "wb-tampa-2", "wb-tampa-1"],
  },
  {
    id: "grp-south-fl",
    label: "South Florida",
    description: "Tampa + Miami portfolio",
    propertyIds: ["wb-tampa-1", "wb-tampa-2", "wb-mia-commercial"],
  },
  {
    id: "grp-mara-watch",
    label: "Mara's Weekly Watch",
    description: "VP Ops focus list",
    propertyIds: ["wb-tampa-1", "wb-charlotte", "wb-asu", "wb-bragg-military"],
  },
  {
    id: "grp-student-q2",
    label: "Student Q2 Focus",
    description: "Student lease-up cohort",
    propertyIds: ["wb-tucson", "wb-asu"],
  },
];

export function getGroup(id: string) {
  return PROPERTY_GROUPS.find((g) => g.id === id);
}

// ---------------------------------------------------------------------------
// Segments
// ---------------------------------------------------------------------------

export function propertiesForSegment(segment: SegmentId): Property[] {
  return PROPERTIES.filter((p) => p.segment === segment);
}

export function segmentCounts(): { id: SegmentId; label: string; count: number }[] {
  return SEGMENTS.map((s) => ({
    id: s.id,
    label: s.label,
    count: PROPERTIES.filter((p) => p.segment === s.id).length,
  }));
}

// ---------------------------------------------------------------------------
// Scope resolution
//
// Two entry points:
//   propertiesForScope(scopeId)   — legacy single-pick (string id)
//   propertiesForScopeIds(ids[])  — multi-select (mixed selection ids)
//
// Both return a *de-duplicated* set of Property objects.
// ---------------------------------------------------------------------------

export function propertiesForScope(scopeId: string): Property[] {
  if (scopeId === "portfolio" || scopeId === "all") return PROPERTIES;
  const region = REGION_DEFS.find((r) => r.id === scopeId);
  if (region) return PROPERTIES.filter((p) => region.propertyIds.includes(p.id));
  const group = PROPERTY_GROUPS.find((g) => g.id === scopeId);
  if (group) return PROPERTIES.filter((p) => group.propertyIds.includes(p.id));
  const segment = SEGMENTS.find((s) => s.id === scopeId);
  if (segment) return propertiesForSegment(segment.id);
  const property = PROPERTIES.find((p) => p.id === scopeId);
  return property ? [property] : PROPERTIES;
}

/**
 * Resolve a list of selection ids (any mix of portfolio / region / group /
 * segment / property) to a deduplicated Property[]. Used by the multi-select
 * scope picker.
 */
export function propertiesForScopeIds(ids: string[]): Property[] {
  if (ids.length === 0 || ids.includes("portfolio") || ids.includes("all")) {
    return PROPERTIES;
  }
  const seen = new Set<string>();
  for (const id of ids) {
    for (const p of propertiesForScope(id)) {
      seen.add(p.id);
    }
  }
  return PROPERTIES.filter((p) => seen.has(p.id));
}

export function portfolioTotals() {
  const total = PROPERTIES.reduce(
    (acc, p) => {
      acc.units += p.units;
      acc.occupiedUnits += p.units * (p.occupancyPct / 100);
      acc.delinquentUnits += p.units * (p.delinquencyPct / 100);
      acc.workOrdersOpen += p.workOrdersOpen;
      acc.appsThisWeek += p.appsThisWeek;
      acc.leasesThisWeek += p.leasesThisWeek;
      acc.toursThisWeek += p.toursThisWeek;
      return acc;
    },
    {
      units: 0,
      occupiedUnits: 0,
      delinquentUnits: 0,
      workOrdersOpen: 0,
      appsThisWeek: 0,
      leasesThisWeek: 0,
      toursThisWeek: 0,
    },
  );
  return {
    ...total,
    occupancyPct: (total.occupiedUnits / total.units) * 100,
    delinquencyPct: (total.delinquentUnits / total.units) * 100,
  };
}
