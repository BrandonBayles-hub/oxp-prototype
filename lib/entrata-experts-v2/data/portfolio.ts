export interface Property {
  id: string;
  name: string;
  shortName: string;
  region: "southeast" | "mountain-west";
  city: string;
  state: string;
  segment: "conventional" | "student";
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

export function propertiesForScope(scopeId: string): Property[] {
  if (scopeId === "portfolio" || scopeId === "all") return PROPERTIES;
  const region = REGION_DEFS.find((r) => r.id === scopeId);
  if (region) return PROPERTIES.filter((p) => region.propertyIds.includes(p.id));
  const property = PROPERTIES.find((p) => p.id === scopeId);
  return property ? [property] : PROPERTIES;
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
