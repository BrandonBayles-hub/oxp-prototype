// Entrata user groups — directory-style groupings used for role assignment
// (Roles & Access tab) and scoped policy overrides (e.g. Entrata Experts admin
// model/spend caps). These are the same groups the customer would import via
// SCIM/SAML in production; for the prototype we hand-curate a representative
// set covering the most common operator team shapes.

export interface EntrataGroup {
  id: string;
  name: string;
  memberCount: number;
}

export const ENTRATA_GROUPS: EntrataGroup[] = [
  { id: "eg-leasing", name: "Leasing Team", memberCount: 6 },
  { id: "eg-maintenance", name: "Maintenance Staff", memberCount: 12 },
  { id: "eg-accounting", name: "Accounting", memberCount: 4 },
  { id: "eg-regional-ops", name: "Regional Operations", memberCount: 8 },
  { id: "eg-compliance", name: "Compliance Officers", memberCount: 3 },
  { id: "eg-resident-svc", name: "Resident Services", memberCount: 9 },
];

export const ENTRATA_GROUP_BY_ID: Record<string, EntrataGroup> =
  ENTRATA_GROUPS.reduce(
    (acc, g) => ({ ...acc, [g.id]: g }),
    {} as Record<string, EntrataGroup>,
  );
