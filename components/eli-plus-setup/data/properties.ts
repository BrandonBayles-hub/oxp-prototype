/** Shared property list used across all per-property sheet content panels. */

export type PropertyGroup =
  | "All"
  | "Midwest"
  | "Southwest"
  | "Mountain West"
  | "Pacific Northwest"
  | "Southeast"
  | "Northeast"

export const PROPERTY_GROUPS: PropertyGroup[] = [
  "All",
  "Southwest",
  "Mountain West",
  "Midwest",
  "Pacific Northwest",
  "Southeast",
  "Northeast",
]

export interface Property {
  id: string
  name: string
  city: string
  state: string
  group: Exclude<PropertyGroup, "All">
}

export const PROPERTIES: Property[] = [
  // ── Southwest — TX ───────────────────────────────────────────────────────────
  { id: "p1",  name: "Sunset Ridge",          city: "Austin",           state: "TX", group: "Southwest"         },
  { id: "p4",  name: "The Edison",             city: "Dallas",           state: "TX", group: "Southwest"         },
  { id: "p5",  name: "Parkside Lofts",         city: "Houston",          state: "TX", group: "Southwest"         },
  { id: "p20", name: "Lone Star Flats",         city: "San Antonio",      state: "TX", group: "Southwest"         },
  { id: "p21", name: "Brazos Commons",          city: "Waco",             state: "TX", group: "Southwest"         },
  { id: "p22", name: "Trinity Heights",         city: "Fort Worth",       state: "TX", group: "Southwest"         },
  { id: "p23", name: "Pecan Grove",             city: "El Paso",          state: "TX", group: "Southwest"         },
  { id: "p24", name: "Mesa Verde",              city: "Lubbock",          state: "TX", group: "Southwest"         },
  { id: "p25", name: "Bluebonnet Ridge",        city: "Amarillo",         state: "TX", group: "Southwest"         },
  { id: "p26", name: "Alamo Court",             city: "Corpus Christi",   state: "TX", group: "Southwest"         },
  { id: "p27", name: "Lakeview Flats",          city: "Arlington",        state: "TX", group: "Southwest"         },

  // ── Southwest — CA ───────────────────────────────────────────────────────────
  { id: "p13", name: "Pacific Crest",           city: "Los Angeles",      state: "CA", group: "Southwest"         },
  { id: "p14", name: "Bay Breeze",              city: "San Francisco",    state: "CA", group: "Southwest"         },
  { id: "p15", name: "Coastal View",            city: "San Diego",        state: "CA", group: "Southwest"         },
  { id: "p16", name: "The Collective",          city: "Oakland",          state: "CA", group: "Southwest"         },
  { id: "p17", name: "Citrus Grove",            city: "Riverside",        state: "CA", group: "Southwest"         },
  { id: "p18", name: "Sycamore Park",           city: "Sacramento",       state: "CA", group: "Southwest"         },
  { id: "p19", name: "Vineyard Terrace",        city: "Fresno",           state: "CA", group: "Southwest"         },

  // ── Southwest — AZ ───────────────────────────────────────────────────────────
  { id: "p3",  name: "Maple Commons",           city: "Phoenix",          state: "AZ", group: "Southwest"         },
  { id: "p40", name: "Desert Bloom",            city: "Tucson",           state: "AZ", group: "Southwest"         },
  { id: "p41", name: "Sonoran Heights",         city: "Tempe",            state: "AZ", group: "Southwest"         },
  { id: "p42", name: "Saguaro Flats",           city: "Chandler",         state: "AZ", group: "Southwest"         },
  { id: "p43", name: "Red Rock Residences",     city: "Scottsdale",       state: "AZ", group: "Southwest"         },
  { id: "p44", name: "Agave Park",              city: "Mesa",             state: "AZ", group: "Southwest"         },

  // ── Southwest — NV ───────────────────────────────────────────────────────────
  { id: "p69", name: "Mojave Flats",            city: "Las Vegas",        state: "NV", group: "Southwest"         },
  { id: "p70", name: "Sierra View",             city: "Reno",             state: "NV", group: "Southwest"         },

  // ── Mountain West ─────────────────────────────────────────────────────────────
  { id: "p2",  name: "Harbor View",             city: "Denver",           state: "CO", group: "Mountain West"     },
  { id: "p45", name: "Alpine Ridge",            city: "Boulder",          state: "CO", group: "Mountain West"     },
  { id: "p46", name: "Snowcap Flats",           city: "Colorado Springs", state: "CO", group: "Mountain West"     },
  { id: "p47", name: "Pines at Breck",          city: "Fort Collins",     state: "CO", group: "Mountain West"     },
  { id: "p12", name: "Aspen Heights",           city: "Salt Lake City",   state: "UT", group: "Mountain West"     },
  { id: "p61", name: "Wasatch Flats",           city: "Ogden",            state: "UT", group: "Mountain West"     },
  { id: "p62", name: "Zion View",               city: "St. George",       state: "UT", group: "Mountain West"     },

  // ── Midwest — IL ─────────────────────────────────────────────────────────────
  { id: "p6",  name: "River North Plaza",       city: "Chicago",          state: "IL", group: "Midwest"           },
  { id: "p48", name: "Lakeshore East",          city: "Chicago",          state: "IL", group: "Midwest"           },
  { id: "p49", name: "Wicker Park Flats",       city: "Chicago",          state: "IL", group: "Midwest"           },
  { id: "p50", name: "Springfield Commons",     city: "Springfield",      state: "IL", group: "Midwest"           },
  { id: "p51", name: "Peoria Heights",          city: "Peoria",           state: "IL", group: "Midwest"           },

  // ── Midwest — OH ─────────────────────────────────────────────────────────────
  { id: "p8",  name: "Oakwood Terrace",         city: "Columbus",         state: "OH", group: "Midwest"           },
  { id: "p52", name: "Cuyahoga Flats",          city: "Cleveland",        state: "OH", group: "Midwest"           },
  { id: "p53", name: "Cincinnati Rise",         city: "Cincinnati",       state: "OH", group: "Midwest"           },
  { id: "p54", name: "Buckeye Commons",         city: "Toledo",           state: "OH", group: "Midwest"           },

  // ── Midwest — MI ─────────────────────────────────────────────────────────────
  { id: "p9",  name: "The Reserve",             city: "Detroit",          state: "MI", group: "Midwest"           },
  { id: "p55", name: "Great Lakes Lofts",       city: "Grand Rapids",     state: "MI", group: "Midwest"           },
  { id: "p56", name: "Mitten Residences",       city: "Lansing",          state: "MI", group: "Midwest"           },

  // ── Midwest — MN ─────────────────────────────────────────────────────────────
  { id: "p7",  name: "Cedar Glen",              city: "Minneapolis",      state: "MN", group: "Midwest"           },
  { id: "p63", name: "North Star Lofts",        city: "St. Paul",         state: "MN", group: "Midwest"           },
  { id: "p64", name: "Boundary Waters Flats",   city: "Duluth",           state: "MN", group: "Midwest"           },
  { id: "p65", name: "Prairie Commons",         city: "Rochester",        state: "MN", group: "Midwest"           },

  // ── Pacific Northwest — WA ───────────────────────────────────────────────────
  { id: "p10", name: "Summit Pointe",           city: "Seattle",          state: "WA", group: "Pacific Northwest" },
  { id: "p57", name: "Rainier View",            city: "Tacoma",           state: "WA", group: "Pacific Northwest" },
  { id: "p58", name: "Puget Sound Flats",       city: "Bellevue",         state: "WA", group: "Pacific Northwest" },

  // ── Pacific Northwest — OR ───────────────────────────────────────────────────
  { id: "p11", name: "Willow Creek",            city: "Portland",         state: "OR", group: "Pacific Northwest" },
  { id: "p59", name: "Cascade Park",            city: "Eugene",           state: "OR", group: "Pacific Northwest" },
  { id: "p60", name: "Crater Lake Commons",     city: "Bend",             state: "OR", group: "Pacific Northwest" },

  // ── Southeast — FL ───────────────────────────────────────────────────────────
  { id: "p28", name: "Palm Bay Residences",     city: "Miami",            state: "FL", group: "Southeast"         },
  { id: "p29", name: "Oceanfront Villas",       city: "Tampa",            state: "FL", group: "Southeast"         },
  { id: "p30", name: "The Palms",               city: "Orlando",          state: "FL", group: "Southeast"         },
  { id: "p31", name: "Cypress Landing",         city: "Jacksonville",     state: "FL", group: "Southeast"         },
  { id: "p32", name: "Sunset Bay",              city: "Fort Lauderdale",  state: "FL", group: "Southeast"         },
  { id: "p33", name: "Gulf Shore",              city: "Naples",           state: "FL", group: "Southeast"         },
  { id: "p34", name: "Coral Ridge",             city: "Sarasota",         state: "FL", group: "Southeast"         },

  // ── Southeast — GA ───────────────────────────────────────────────────────────
  { id: "p66", name: "Peach Tree Residences",   city: "Atlanta",          state: "GA", group: "Southeast"         },
  { id: "p67", name: "Savannah Oaks",           city: "Savannah",         state: "GA", group: "Southeast"         },
  { id: "p68", name: "Auburn Commons",          city: "Augusta",          state: "GA", group: "Southeast"         },

  // ── Northeast — NY ───────────────────────────────────────────────────────────
  { id: "p35", name: "Hudson Yards Flats",      city: "New York",         state: "NY", group: "Northeast"         },
  { id: "p36", name: "Brooklyn Commons",        city: "Brooklyn",         state: "NY", group: "Northeast"         },
  { id: "p37", name: "Elmwood Residences",      city: "Buffalo",          state: "NY", group: "Northeast"         },
  { id: "p38", name: "Saratoga Glen",           city: "Albany",           state: "NY", group: "Northeast"         },
  { id: "p39", name: "Catskill Views",          city: "Rochester",        state: "NY", group: "Northeast"         },
]
