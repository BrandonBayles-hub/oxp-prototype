/** Shared property list used across all per-property sheet content panels. */

export type PropertyGroup = "All" | "Midwest" | "Southwest" | "Mountain West" | "Pacific Northwest"

export const PROPERTY_GROUPS: PropertyGroup[] = [
  "All",
  "Midwest",
  "Southwest",
  "Mountain West",
  "Pacific Northwest",
]

export interface Property {
  id: string
  name: string
  city: string
  state: string
  group: Exclude<PropertyGroup, "All">
}

export const PROPERTIES: Property[] = [
  { id: "p1",  name: "Sunset Ridge",       city: "Austin",       state: "TX", group: "Southwest"        },
  { id: "p2",  name: "Harbor View",         city: "Denver",       state: "CO", group: "Mountain West"    },
  { id: "p3",  name: "Maple Commons",       city: "Phoenix",      state: "AZ", group: "Southwest"        },
  { id: "p4",  name: "The Edison",          city: "Dallas",       state: "TX", group: "Southwest"        },
  { id: "p5",  name: "Parkside Lofts",      city: "Houston",      state: "TX", group: "Southwest"        },
  { id: "p6",  name: "River North Plaza",   city: "Chicago",      state: "IL", group: "Midwest"          },
  { id: "p7",  name: "Cedar Glen",          city: "Minneapolis",  state: "MN", group: "Midwest"          },
  { id: "p8",  name: "Oakwood Terrace",     city: "Columbus",     state: "OH", group: "Midwest"          },
  { id: "p9",  name: "The Reserve",         city: "Detroit",      state: "MI", group: "Midwest"          },
  { id: "p10", name: "Summit Pointe",       city: "Seattle",      state: "WA", group: "Pacific Northwest" },
  { id: "p11", name: "Willow Creek",        city: "Portland",     state: "OR", group: "Pacific Northwest" },
  { id: "p12", name: "Aspen Heights",       city: "Salt Lake City", state: "UT", group: "Mountain West"  },
]
