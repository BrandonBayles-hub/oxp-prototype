export type PublisherType = "INTERNAL" | "PARTNER" | "CLIENT";
export type DefaultVisibility = "EXCHANGE" | "PRIVATE";

export interface PartnerOption {
  id: string;
  label: string;
  providerFilter: string | null;
  publisherType: PublisherType;
  providerType: string;
  defaultVisibility: DefaultVisibility;
  ownerClientId: string;
}

export const PARTNER_OPTIONS: readonly PartnerOption[] = [
  {
    id: "entrata",
    label: "Entrata",
    providerFilter: "Entrata",
    publisherType: "INTERNAL",
    providerType: "FIRST_PARTY",
    defaultVisibility: "EXCHANGE",
    ownerClientId: "entrata",
  },
  {
    id: "partner-a",
    label: "LeadCorp",
    providerFilter: "LeadCorp",
    publisherType: "PARTNER",
    providerType: "PARTNER",
    defaultVisibility: "EXCHANGE",
    ownerClientId: "leadcorp",
  },
  {
    id: "partner-b",
    label: "Screening Services Inc.",
    providerFilter: "Screening Services Inc.",
    publisherType: "PARTNER",
    providerType: "VENDOR",
    defaultVisibility: "EXCHANGE",
    ownerClientId: "screening-services",
  },
  {
    id: "client-greystar",
    label: "Greystar (Client Publisher)",
    providerFilter: "Greystar Real Estate Partners",
    publisherType: "CLIENT",
    providerType: "CLIENT",
    defaultVisibility: "PRIVATE",
    ownerClientId: "greystar",
  },
  {
    id: "client-trinity",
    label: "Trinity (Client Publisher)",
    providerFilter: "Trinity Property Consultants",
    publisherType: "CLIENT",
    providerType: "CLIENT",
    defaultVisibility: "PRIVATE",
    ownerClientId: "trinity",
  },
  {
    id: "all",
    label: "Show All",
    providerFilter: null,
    publisherType: "INTERNAL",
    providerType: "FIRST_PARTY",
    defaultVisibility: "EXCHANGE",
    ownerClientId: "entrata",
  },
] as const;

export const DEFAULT_PARTNER_ID = "all";

export function getPartnerById(id: string): PartnerOption {
  return (PARTNER_OPTIONS.find((p) => p.id === id) ?? PARTNER_OPTIONS[PARTNER_OPTIONS.length - 1]) as PartnerOption;
}
