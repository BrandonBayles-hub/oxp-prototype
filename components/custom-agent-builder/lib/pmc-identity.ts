export const PMC_NAME = "Harvest Peak Capital";

export const PMC_SHORT_NAME = "Harvest Peak";

/**
 * Representative portfolio of properties used by the wizard's property picker.
 * Grouped by geography so the mrdn-style "Available / Selected" UI has enough
 * realistic data to demonstrate search + pagination behavior.
 */
export type PmcPropertyRecord = {
  id: string;
  name: string;
  lookupCode: string;
  city: string;
  state: string;
  group: "West" | "Mountain" | "Central" | "East" | "South";
};

export const PMC_PROPERTY_RECORDS: PmcPropertyRecord[] = [
  { id: "prop.hillside",       name: "Hillside Living",         lookupCode: "HIL-001", city: "Denver",         state: "CO", group: "Mountain" },
  { id: "prop.jamison",        name: "Jamison Apartments",      lookupCode: "JAM-002", city: "Salt Lake City", state: "UT", group: "Mountain" },
  { id: "prop.summit-park",    name: "Summit Park",             lookupCode: "SUM-003", city: "Park City",      state: "UT", group: "Mountain" },
  { id: "prop.riverstone",     name: "Riverstone Commons",      lookupCode: "RIV-004", city: "Boise",          state: "ID", group: "Mountain" },
  { id: "prop.cedar-ridge",    name: "Cedar Ridge",             lookupCode: "CED-005", city: "Colorado Springs", state: "CO", group: "Mountain" },
  { id: "prop.oakmont",        name: "Oakmont Gardens",         lookupCode: "OAK-006", city: "Portland",       state: "OR", group: "West" },
  { id: "prop.pine-valley",    name: "Pine Valley Apartments",  lookupCode: "PIN-007", city: "Seattle",        state: "WA", group: "West" },
  { id: "prop.redwood-park",   name: "Redwood Park",            lookupCode: "RED-008", city: "San Jose",       state: "CA", group: "West" },
  { id: "prop.harbor-heights", name: "Harbor Heights",          lookupCode: "HAR-009", city: "San Diego",      state: "CA", group: "West" },
  { id: "prop.sunset-ridge",   name: "Sunset Ridge",            lookupCode: "SUN-010", city: "Phoenix",        state: "AZ", group: "West" },
  { id: "prop.mesa-verde",     name: "Mesa Verde",              lookupCode: "MES-011", city: "Tucson",         state: "AZ", group: "West" },
  { id: "prop.prairie-view",   name: "Prairie View",            lookupCode: "PRA-012", city: "Dallas",         state: "TX", group: "Central" },
  { id: "prop.lone-star",      name: "Lone Star Apartments",    lookupCode: "LON-013", city: "Austin",         state: "TX", group: "Central" },
  { id: "prop.bluebonnet",     name: "Bluebonnet Village",      lookupCode: "BLU-014", city: "Houston",        state: "TX", group: "Central" },
  { id: "prop.magnolia",       name: "Magnolia Court",          lookupCode: "MAG-015", city: "Atlanta",        state: "GA", group: "South" },
  { id: "prop.palmetto",       name: "Palmetto Place",          lookupCode: "PAL-016", city: "Charlotte",      state: "NC", group: "South" },
  { id: "prop.savannah",       name: "Savannah Commons",        lookupCode: "SAV-017", city: "Savannah",       state: "GA", group: "South" },
  { id: "prop.liberty-square", name: "Liberty Square",          lookupCode: "LIB-018", city: "Philadelphia",   state: "PA", group: "East" },
  { id: "prop.hudson-yards",   name: "Hudson Yards Residences", lookupCode: "HUD-019", city: "New York",       state: "NY", group: "East" },
  { id: "prop.beacon-hill",    name: "Beacon Hill",             lookupCode: "BEA-020", city: "Boston",         state: "MA", group: "East" },
  { id: "prop.capitol-view",   name: "Capitol View",            lookupCode: "CAP-021", city: "Washington",     state: "DC", group: "East" },
  { id: "prop.great-lakes",    name: "Great Lakes Tower",       lookupCode: "GRT-022", city: "Chicago",        state: "IL", group: "Central" },
];

export const PMC_PROPERTIES = PMC_PROPERTY_RECORDS.map((p) => p.name);

export type PmcProperty = (typeof PMC_PROPERTIES)[number];

/** Look up a property record by its display name (what the wizard stores). */
export function getPropertyRecordByName(name: string): PmcPropertyRecord | undefined {
  return PMC_PROPERTY_RECORDS.find((p) => p.name === name);
}

/** Default primary email address for a property (mock of property_email_addresses.primary). */
export function getPropertyPrimaryEmail(name: string): string {
  const rec = getPropertyRecordByName(name);
  if (!rec) {
    return `leasing+${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}@harvestpeak.com`;
  }
  return `leasing+${rec.lookupCode.toLowerCase()}@harvestpeak.com`;
}
