export const DEMO_PROFILES = [
  {
    id: "greystar",
    name: "Greystar",
    segment: "Enterprise",
    units: 50_000,
    description: "50,000 units",
    company: "Greystar Real Estate Partners",
    verticals: ["Market-rate", "Affordable"],
    platformTier: "Enterprise",
  },
  {
    id: "trinity",
    name: "Trinity",
    segment: "Mid-Market",
    units: 14_000,
    description: "14,000 units, Student",
    company: "Trinity Property Consultants",
    verticals: ["Student"],
    platformTier: "Plus",
  },
  {
    id: "boutique",
    name: "Boutique PMC",
    segment: "Small",
    units: 500,
    description: "500 units",
    company: "Boutique Property Management",
    verticals: ["Market-rate"],
    platformTier: "Standard",
  },
] as const;

export type DemoProfile = (typeof DEMO_PROFILES)[number];

export const DEFAULT_PROFILE_ID = "greystar";

export function getProfileById(id: string) {
  return DEMO_PROFILES.find((p) => p.id === id) ?? DEMO_PROFILES[0];
}
