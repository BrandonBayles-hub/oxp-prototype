"use client";

import * as React from "react";

import {
  PropertySelector,
  type PropertyFilterDataConfig,
} from "@/components/property-filter/PropertySelector";
import type { Property } from "@/components/property-filter/PropertyFilter";

/**
 * The property picker for every ELI+ report.
 *
 * The reports previously used a bespoke checkbox list, while the rest of the
 * product (Escalations, Workforce, Voice, Agent Roster, …) uses the shared
 * `PropertySelector` with its grouped views and search. Reports were the
 * outlier, so a user who learned the picker elsewhere met a different control
 * here.
 *
 * Property NAMES are used as the selector's ids on purpose. The reports key
 * their seed data on names, and feeding the picker opaque ids would reintroduce
 * exactly the id-vs-name mismatch that makes a selection silently match nothing.
 */

/** The two seed portfolios the reports draw from. */
const CORE_PORTFOLIO = [
  "Cedar Hills",
  "Hillside Living",
  "Jamison Apartments",
  "Lakewood",
  "Maple Court",
  "Oak Terrace",
  "Parkview Flats",
  "Pine Valley",
  "Summit Ridge",
  "The Beacon",
] as const;

const MAINTENANCE_PORTFOLIO = [
  "Ashford Crescent Oaks",
  "Bearkat Cottages",
  "Courtyard Apartments",
  "Harvest Peak Heights",
  "Maverick Trails Apartments",
  "Stonewater at the Riverbend",
  "Summerville Station",
  "Sunset Ridge",
  "The Landing at Briarcliff",
  "The Residences at Newbury",
  "Trails at Corinthian Creek",
  "Wayfare — Cumberland",
  "Westland Apts — Bldg 2",
  "Westland Apts — Bldg 5",
] as const;

/**
 * Every property any report can show. The picker offers the union so one
 * selection carries across agents; each page then intersects it with its own
 * list (see `resolveScopedProperties`).
 */
export const ALL_REPORT_PROPERTIES: readonly string[] = [
  ...CORE_PORTFOLIO,
  ...MAINTENANCE_PORTFOLIO,
];

const leaf = (name: string): Property => ({ id: name, name, type: "property" });

const PROPERTY_LIST: Property[] = [...ALL_REPORT_PROPERTIES].sort().map(leaf);

const BY_PORTFOLIO: Property[] = [
  {
    id: "portfolio-core",
    name: "Core Portfolio",
    type: "group",
    count: CORE_PORTFOLIO.length,
    children: [...CORE_PORTFOLIO].sort().map(leaf),
  },
  {
    id: "portfolio-maintenance",
    name: "Facilities Portfolio",
    type: "group",
    count: MAINTENANCE_PORTFOLIO.length,
    children: [...MAINTENANCE_PORTFOLIO].sort().map(leaf),
  },
];

const REPORT_PROPERTY_DATA: PropertyFilterDataConfig = {
  dropdownSections: [{ label: "Views", options: ["Property List", "Portfolios"] }],
  getDataForOption: (option) =>
    option === "Portfolios" ? BY_PORTFOLIO : PROPERTY_LIST,
  flatListOptions: ["Property List"],
  getSearchPlaceholder: () => "Search properties",
  getSectionTitle: (option) =>
    option === "Portfolios" ? "Select Portfolios" : "Select Properties",
  defaultOption: "Property List",
};

export function ReportPropertyFilter({
  selected,
  onChange,
}: {
  /** Selected property names. Empty means "all". */
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const selectedIds = React.useMemo(() => [...selected], [selected]);

  return (
    <PropertySelector
      data={REPORT_PROPERTY_DATA}
      selectedPropertyIds={selectedIds}
      onSelectedIdsChange={(ids) => onChange(new Set(ids))}
      triggerWidthClassName="w-[15rem]"
      panelHeight={460}
    />
  );
}
