export interface PropertyNode {
  id: string;
  name: string;
  type: "portfolio" | "region" | "group" | "property";
  count?: number;
  children?: PropertyNode[];
  hasInfo?: boolean;
}

export type PropertyViewMode = "Property List" | "States" | "Owners" | "Property Type";

export const PROPERTY_VIEW_MODES: PropertyViewMode[] = [
  "Property List",
  "States",
  "Owners",
  "Property Type",
];

// --- Property List (Portfolio → Region → Group → Property) ---

export const portfolioData: PropertyNode[] = [
  {
    id: "cambridge-living",
    name: "Cambridge Living",
    type: "portfolio",
    count: 19,
    children: [
      {
        id: "region-a",
        name: "Region A",
        type: "region",
        count: 7,
        children: [
          {
            id: "campus-model-1",
            name: "Campus Model 1",
            type: "group",
            count: 2,
            children: [
              { id: "summit-park", name: "Summit Park", type: "property" },
              { id: "victoria-place", name: "Victoria Place", type: "property", hasInfo: true },
            ],
          },
          {
            id: "urban-living-1",
            name: "Urban Living 1",
            type: "group",
            count: 2,
            children: [
              { id: "metro-heights", name: "Metro Heights", type: "property" },
              { id: "downtown-lofts", name: "Downtown Lofts", type: "property" },
            ],
          },
          {
            id: "oxp-studio-demo",
            name: "OXP Studio (demo)",
            type: "group",
            count: 3,
            children: [
              { id: "oxp-hillside-living", name: "Hillside Living", type: "property" },
              { id: "oxp-jamison-apartments", name: "Jamison Apartments", type: "property" },
              { id: "oxp-property-c", name: "Property C", type: "property" },
            ],
          },
        ],
      },
      {
        id: "region-b",
        name: "Region B",
        type: "region",
        count: 6,
        children: [
          {
            id: "campus-model-2",
            name: "Campus Model 2",
            type: "group",
            count: 3,
            children: [
              { id: "university-park", name: "University Park", type: "property" },
              { id: "student-commons", name: "Student Commons", type: "property" },
              { id: "academic-village", name: "Academic Village", type: "property" },
            ],
          },
          {
            id: "luxury-estates",
            name: "Luxury Estates",
            type: "group",
            count: 3,
            children: [
              { id: "royal-gardens", name: "Royal Gardens", type: "property", hasInfo: true },
              { id: "pristine-manor", name: "Pristine Manor", type: "property" },
              { id: "elite-residences", name: "Elite Residences", type: "property" },
            ],
          },
        ],
      },
      {
        id: "region-c",
        name: "Region C",
        type: "region",
        count: 6,
        children: [
          {
            id: "suburban-model",
            name: "Suburban Model",
            type: "group",
            count: 4,
            children: [
              { id: "family-homes", name: "Family Homes", type: "property" },
              { id: "green-meadows", name: "Green Meadows", type: "property" },
              { id: "oak-terrace", name: "Oak Terrace", type: "property" },
              { id: "maple-grove", name: "Maple Grove", type: "property" },
            ],
          },
          {
            id: "townhouse-complex",
            name: "Townhouse Complex",
            type: "group",
            count: 2,
            children: [
              { id: "heritage-row", name: "Heritage Row", type: "property" },
              { id: "community-square", name: "Community Square", type: "property" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "hailey-communities",
    name: "Hailey Communities",
    type: "portfolio",
    count: 36,
    children: [
      {
        id: "hailey-north",
        name: "Hailey North Region",
        type: "region",
        count: 18,
        children: [
          {
            id: "modern-living",
            name: "Modern Living",
            type: "group",
            count: 9,
            children: [
              { id: "skyline-towers", name: "Skyline Towers", type: "property" },
              { id: "urban-edge", name: "Urban Edge", type: "property" },
              { id: "city-view", name: "City View", type: "property" },
              { id: "modern-square", name: "Modern Square", type: "property" },
              { id: "glass-house", name: "Glass House", type: "property" },
              { id: "steel-frames", name: "Steel Frames", type: "property" },
              { id: "concrete-gardens", name: "Concrete Gardens", type: "property" },
              { id: "metro-plaza", name: "Metro Plaza", type: "property" },
              { id: "innovation-hub", name: "Innovation Hub", type: "property" },
            ],
          },
          {
            id: "eco-friendly",
            name: "Eco-Friendly",
            type: "group",
            count: 9,
            children: [
              { id: "green-towers", name: "Green Towers", type: "property", hasInfo: true },
              { id: "solar-village", name: "Solar Village", type: "property" },
              { id: "eco-gardens", name: "Eco Gardens", type: "property" },
              { id: "renewable-ridge", name: "Renewable Ridge", type: "property" },
              { id: "sustainable-square", name: "Sustainable Square", type: "property" },
              { id: "earth-homes", name: "Earth Homes", type: "property" },
              { id: "wind-meadows", name: "Wind Meadows", type: "property" },
              { id: "nature-preserve", name: "Nature Preserve", type: "property" },
              { id: "bio-complex", name: "Bio Complex", type: "property" },
            ],
          },
        ],
      },
      {
        id: "hailey-south",
        name: "Hailey South Region",
        type: "region",
        count: 18,
        children: [
          {
            id: "coastal-properties",
            name: "Coastal Properties",
            type: "group",
            count: 9,
            children: [
              { id: "ocean-view", name: "Ocean View", type: "property" },
              { id: "beach-front", name: "Beach Front", type: "property" },
              { id: "sea-breeze", name: "Sea Breeze", type: "property" },
              { id: "marina-bay", name: "Marina Bay", type: "property" },
              { id: "coastal-heights", name: "Coastal Heights", type: "property" },
              { id: "lighthouse-point", name: "Lighthouse Point", type: "property" },
              { id: "harbor-views", name: "Harbor Views", type: "property" },
              { id: "seaside-retreat", name: "Seaside Retreat", type: "property" },
              { id: "wave-crest", name: "Wave Crest", type: "property" },
            ],
          },
          {
            id: "mountain-properties",
            name: "Mountain Properties",
            type: "group",
            count: 9,
            children: [
              { id: "peak-view", name: "Peak View", type: "property" },
              { id: "alpine-lodge", name: "Alpine Lodge", type: "property" },
              { id: "summit-ridge", name: "Summit Ridge", type: "property" },
              { id: "forest-edge", name: "Forest Edge", type: "property" },
              { id: "valley-homes", name: "Valley Homes", type: "property" },
              { id: "pine-crest", name: "Pine Crest", type: "property" },
              { id: "rocky-point", name: "Rocky Point", type: "property" },
              { id: "wilderness-retreat", name: "Wilderness Retreat", type: "property" },
              { id: "mountain-vista", name: "Mountain Vista", type: "property", hasInfo: true },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "hillshire-realty",
    name: "Hillshire Realty Partners",
    type: "portfolio",
    count: 36,
    children: [
      {
        id: "hillshire-east",
        name: "Hillshire East Region",
        type: "region",
        count: 18,
        children: [
          {
            id: "executive-properties",
            name: "Executive Properties",
            type: "group",
            count: 9,
            children: [
              { id: "executive-plaza", name: "Executive Plaza", type: "property" },
              { id: "corporate-heights", name: "Corporate Heights", type: "property" },
              { id: "business-district", name: "Business District", type: "property" },
              { id: "professional-park", name: "Professional Park", type: "property" },
              { id: "commerce-center", name: "Commerce Center", type: "property" },
              { id: "trade-towers", name: "Trade Towers", type: "property" },
              { id: "financial-square", name: "Financial Square", type: "property" },
              { id: "office-complex", name: "Office Complex", type: "property" },
              { id: "enterprise-hub", name: "Enterprise Hub", type: "property" },
            ],
          },
          {
            id: "residential-estates",
            name: "Residential Estates",
            type: "group",
            count: 9,
            children: [
              { id: "hillshire-manor", name: "Hillshire Manor", type: "property" },
              { id: "countryside-estates", name: "Countryside Estates", type: "property" },
              { id: "garden-villas", name: "Garden Villas", type: "property" },
              { id: "heritage-homes", name: "Heritage Homes", type: "property" },
              { id: "classic-residences", name: "Classic Residences", type: "property" },
              { id: "villa-gardens", name: "Villa Gardens", type: "property" },
              { id: "estate-properties", name: "Estate Properties", type: "property" },
              { id: "manor-house", name: "Manor House", type: "property" },
              { id: "grand-estates", name: "Grand Estates", type: "property", hasInfo: true },
            ],
          },
        ],
      },
      {
        id: "hillshire-west",
        name: "Hillshire West Region",
        type: "region",
        count: 18,
        children: [
          {
            id: "luxury-condos",
            name: "Luxury Condos",
            type: "group",
            count: 9,
            children: [
              { id: "penthouse-suites", name: "Penthouse Suites", type: "property" },
              { id: "luxury-towers", name: "Luxury Towers", type: "property" },
              { id: "premium-residences", name: "Premium Residences", type: "property" },
              { id: "exclusive-condos", name: "Exclusive Condos", type: "property" },
              { id: "high-rise-luxury", name: "High-Rise Luxury", type: "property" },
              { id: "upscale-living", name: "Upscale Living", type: "property" },
              { id: "elite-towers", name: "Elite Towers", type: "property" },
              { id: "prestige-point", name: "Prestige Point", type: "property" },
              { id: "platinum-place", name: "Platinum Place", type: "property" },
            ],
          },
          {
            id: "mixed-use",
            name: "Mixed-Use Development",
            type: "group",
            count: 9,
            children: [
              { id: "lifestyle-center", name: "Lifestyle Center", type: "property" },
              { id: "urban-village", name: "Urban Village", type: "property" },
              { id: "community-hub", name: "Community Hub", type: "property" },
              { id: "retail-residential", name: "Retail Residential", type: "property" },
              { id: "mixed-plaza", name: "Mixed Plaza", type: "property" },
              { id: "live-work-play", name: "Live Work Play", type: "property" },
              { id: "integrated-living", name: "Integrated Living", type: "property" },
              { id: "downtown-district", name: "Downtown District", type: "property" },
              { id: "multipurpose-complex", name: "Multipurpose Complex", type: "property" },
            ],
          },
        ],
      },
    ],
  },
];

// --- States view (State → flat properties) ---

export const statesData: PropertyNode[] = [
  {
    id: "california",
    name: "California",
    type: "portfolio",
    count: 28,
    children: [
      { id: "summit-park-ca", name: "Summit Park", type: "property" },
      { id: "victoria-place-ca", name: "Victoria Place", type: "property", hasInfo: true },
      { id: "metro-heights-ca", name: "Metro Heights", type: "property" },
      { id: "downtown-lofts-ca", name: "Downtown Lofts", type: "property" },
      { id: "university-park-ca", name: "University Park", type: "property" },
      { id: "skyline-towers-ca", name: "Skyline Towers", type: "property" },
      { id: "urban-edge-ca", name: "Urban Edge", type: "property" },
      { id: "green-towers-ca", name: "Green Towers", type: "property", hasInfo: true },
    ],
  },
  {
    id: "delaware",
    name: "Delaware",
    type: "portfolio",
    count: 25,
    children: [
      { id: "renewable-ridge-de", name: "Renewable Ridge", type: "property" },
      { id: "ocean-view-de", name: "Ocean View", type: "property" },
      { id: "beach-front-de", name: "Beach Front", type: "property" },
      { id: "mountain-vista-de", name: "Mountain Vista", type: "property", hasInfo: true },
      { id: "executive-plaza-de", name: "Executive Plaza", type: "property" },
    ],
  },
  {
    id: "texas",
    name: "Texas",
    type: "portfolio",
    count: 30,
    children: [
      { id: "corporate-heights-tx", name: "Corporate Heights", type: "property" },
      { id: "business-district-tx", name: "Business District", type: "property" },
      { id: "grand-estates-tx", name: "Grand Estates", type: "property", hasInfo: true },
      { id: "penthouse-suites-tx", name: "Penthouse Suites", type: "property" },
      { id: "luxury-towers-tx", name: "Luxury Towers", type: "property" },
    ],
  },
  {
    id: "florida",
    name: "Florida",
    type: "portfolio",
    count: 25,
    children: [
      { id: "tropical-gardens-fl", name: "Tropical Gardens", type: "property" },
      { id: "palm-breeze-fl", name: "Palm Breeze", type: "property" },
      { id: "sunshine-towers-fl", name: "Sunshine Towers", type: "property" },
      { id: "fort-lauderdale-fl", name: "Fort Lauderdale", type: "property", hasInfo: true },
      { id: "naples-luxury-fl", name: "Naples Luxury", type: "property" },
    ],
  },
];

// --- Property Type view (Type → Portfolio → Region → Group → Property) ---

export const propertyTypesData: PropertyNode[] = [
  {
    id: "apartments",
    name: "Apartments",
    type: "portfolio",
    count: 52,
    children: [
      {
        id: "cambridge-living-apt",
        name: "Cambridge Living",
        type: "portfolio",
        count: 16,
        children: [
          {
            id: "region-a-apt",
            name: "Region A",
            type: "region",
            count: 4,
            children: [
              { id: "summit-park-apt", name: "Summit Park", type: "property" },
              { id: "victoria-place-apt", name: "Victoria Place", type: "property", hasInfo: true },
              { id: "metro-heights-apt", name: "Metro Heights", type: "property" },
              { id: "downtown-lofts-apt", name: "Downtown Lofts", type: "property" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "office",
    name: "Office",
    type: "portfolio",
    count: 18,
    children: [
      {
        id: "hillshire-realty-office",
        name: "Hillshire Realty Partners",
        type: "portfolio",
        count: 18,
        children: [
          {
            id: "hillshire-east-office",
            name: "Hillshire East Region",
            type: "region",
            count: 9,
            children: [
              { id: "executive-plaza-office", name: "Executive Plaza", type: "property" },
              { id: "corporate-heights-office", name: "Corporate Heights", type: "property" },
              { id: "business-district-office", name: "Business District", type: "property" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "retail",
    name: "Retail",
    type: "portfolio",
    count: 9,
    children: [
      { id: "lifestyle-center-retail", name: "Lifestyle Center", type: "property" },
      { id: "urban-village-retail", name: "Urban Village", type: "property" },
      { id: "community-hub-retail", name: "Community Hub", type: "property" },
    ],
  },
  {
    id: "senior",
    name: "Senior",
    type: "portfolio",
    count: 9,
    children: [
      { id: "hillshire-manor-senior", name: "Hillshire Manor", type: "property" },
      { id: "countryside-estates-senior", name: "Countryside Estates", type: "property" },
      { id: "grand-estates-senior", name: "Grand Estates", type: "property", hasInfo: true },
    ],
  },
  {
    id: "single-family",
    name: "Single Family",
    type: "portfolio",
    count: 18,
    children: [
      { id: "ocean-view-sf", name: "Ocean View", type: "property" },
      { id: "beach-front-sf", name: "Beach Front", type: "property" },
      { id: "peak-view-sf", name: "Peak View", type: "property" },
      { id: "mountain-vista-sf", name: "Mountain Vista", type: "property", hasInfo: true },
    ],
  },
];

export function getDataForView(view: PropertyViewMode): PropertyNode[] {
  switch (view) {
    case "States":
      return statesData;
    case "Property Type":
      return propertyTypesData;
    case "Property List":
    default:
      return portfolioData;
  }
}

export function getSearchPlaceholder(view: PropertyViewMode): string {
  switch (view) {
    case "States":
      return "Search states...";
    case "Property Type":
      return "Search property types...";
    default:
      return "Search portfolios, regions, properties...";
  }
}

/** Collect all descendant IDs (inclusive) for cascading selection */
export function collectDescendantIds(node: PropertyNode): string[] {
  const ids = [node.id];
  if (node.children) {
    for (const child of node.children) {
      ids.push(...collectDescendantIds(child));
    }
  }
  return ids;
}

/** Resolve a set of selected IDs to leaf property names from a data tree */
export function getSelectedPropertyNames(
  data: PropertyNode[],
  selectedIds: Set<string>
): string[] {
  const names: string[] = [];
  function walk(nodes: PropertyNode[]) {
    for (const node of nodes) {
      if (selectedIds.has(node.id) && node.type === "property") {
        names.push(node.name);
      }
      if (node.children) walk(node.children);
    }
  }
  walk(data);
  return names;
}

/** Every leaf property name in a tree (for matching workforce strings to selector leaves). */
export function collectLeafPropertyNames(nodes: PropertyNode[]): Set<string> {
  const s = new Set<string>();
  function walk(ns: PropertyNode[]) {
    for (const n of ns) {
      if (n.type === "property") s.add(n.name);
      if (n.children) walk(n.children);
    }
  }
  walk(nodes);
  return s;
}

/** Member-facing property names → Property List leaf IDs for `PropertySelector`. */
export function propertyNamesToIdsFromList(names: string[], data: PropertyNode[]): Set<string> {
  const ids = new Set<string>();
  const want = new Set(names.map((n) => n.trim()).filter(Boolean));
  function walk(ns: PropertyNode[]) {
    for (const n of ns) {
      if (n.type === "property" && want.has(n.name)) ids.add(n.id);
      if (n.children) walk(n.children);
    }
  }
  walk(data);
  return ids;
}

/** Toolbar filter: selected node IDs (any view) → leaf property display names for workforce matching. */
export function resolveSelectedIdsToLeafPropertyNames(selectedIds: Set<string>): Set<string> {
  const names = new Set<string>();
  for (const mode of PROPERTY_VIEW_MODES) {
    const data = getDataForView(mode);
    function walk(ns: PropertyNode[]) {
      for (const n of ns) {
        if (n.type === "property" && selectedIds.has(n.id)) names.add(n.name);
        if (n.children) walk(n.children);
      }
    }
    walk(data);
  }
  return names;
}

/** Check if any node in a subtree matches the search term */
export function matchesSearch(node: PropertyNode, term: string): boolean {
  if (!term) return true;
  const lower = term.toLowerCase();
  if (node.name.toLowerCase().includes(lower)) return true;
  return node.children?.some((child) => matchesSearch(child, lower)) ?? false;
}
