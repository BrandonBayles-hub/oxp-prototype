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

/**
 * Every property the reports cover.
 *
 * All four agents now report on the same portfolio. They previously did not —
 * Maintenance carried its own 14-property seed set — which meant
 * "Properties: All" silently described a different portfolio depending on
 * which agent you were looking at, and a selection made on one agent could not
 * be honoured on another.
 */
export const ALL_REPORT_PROPERTIES = [
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
] as const satisfies readonly string[];

const leaf = (name: string): Property => ({ id: name, name, type: "property" });

const PROPERTY_LIST: Property[] = [...ALL_REPORT_PROPERTIES].sort().map(leaf);

const REPORT_PROPERTY_DATA: PropertyFilterDataConfig = {
  dropdownSections: [{ label: "Views", options: ["Property List"] }],
  getDataForOption: () => PROPERTY_LIST,
  flatListOptions: ["Property List"],
  getSearchPlaceholder: () => "Search properties",
  getSectionTitle: () => "Select Properties",
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
