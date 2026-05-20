/**
 * Shared property data + PropertyFilter config used by both the Tone &
 * Guidelines (`app/voice/page.tsx`) and Voice settings
 * (`app/voice/ai-voice/page.tsx`) screens so the AddPropertyOverride dialogs
 * stay in lockstep.
 *
 * Mirrors the `demoPropertyFilterData` pattern from the sandbox
 * PropertySelector — multi-grouping dropdown sections, flat Property List
 * view, search placeholders + section titles per view — so we use all the
 * defaults the property selector component ships with.
 */

import type { Property, PropertyFilterDataConfig } from "@/components/property-filter";

export const VERTICALS = ["Conventional", "Student", "Affordable"] as const;
export type Vertical = (typeof VERTICALS)[number];

export type PropertyMeta = {
  name: string;
  vertical: Vertical;
  units: number;
  state: string;
  owner: string;
  portfolio: string;
};

export const MOCK_PROPERTIES: PropertyMeta[] = [
  // Conventional
  { name: "Sunset Ridge Apartments", vertical: "Conventional", units: 240, state: "California", owner: "Pacific Realty LLC", portfolio: "Coastal Holdings" },
  { name: "The Reserve at Millcreek", vertical: "Conventional", units: 180, state: "Utah", owner: "Cambridge Holdings LLC", portfolio: "Cambridge Living" },
  { name: "Parkside Lofts", vertical: "Conventional", units: 96, state: "Oregon", owner: "Pacific Realty LLC", portfolio: "Coastal Holdings" },
  { name: "Aspen Ridge", vertical: "Conventional", units: 156, state: "Colorado", owner: "Mountain View Trust", portfolio: "Summit Portfolio" },
  { name: "Cedar Park Commons", vertical: "Conventional", units: 220, state: "Texas", owner: "Lone Star Capital", portfolio: "Texas Portfolio" },
  { name: "Riverwalk Terrace", vertical: "Conventional", units: 168, state: "Florida", owner: "Sunshine Properties", portfolio: "Florida Portfolio" },
  { name: "Harbor View Apartments", vertical: "Conventional", units: 200, state: "Massachusetts", owner: "Bay State Holdings", portfolio: "East Coast Portfolio" },
  { name: "Brookhaven Estates", vertical: "Conventional", units: 140, state: "Georgia", owner: "Southern Heritage", portfolio: "Southeast Portfolio" },
  { name: "Willow Creek Apartments", vertical: "Conventional", units: 192, state: "North Carolina", owner: "Southern Heritage", portfolio: "Southeast Portfolio" },
  { name: "Maple Crossing", vertical: "Conventional", units: 128, state: "Minnesota", owner: "Northern Star Realty", portfolio: "Heartland Portfolio" },

  // Student
  { name: "University Commons", vertical: "Student", units: 320, state: "California", owner: "Campus Living Group", portfolio: "College Portfolio" },
  { name: "Campus Edge", vertical: "Student", units: 200, state: "Texas", owner: "Lone Star Capital", portfolio: "College Portfolio" },
  { name: "The Academy at Oak Park", vertical: "Student", units: 280, state: "Illinois", owner: "Midwest Student Living", portfolio: "Big Ten Holdings" },
  { name: "Scholar's Run", vertical: "Student", units: 240, state: "North Carolina", owner: "Tarheel Student Communities", portfolio: "Southeast Portfolio" },
  { name: "The Quad on Elm", vertical: "Student", units: 220, state: "Michigan", owner: "Midwest Student Living", portfolio: "Big Ten Holdings" },
  { name: "Tiger Town Lofts", vertical: "Student", units: 180, state: "Louisiana", owner: "Bayou Campus Realty", portfolio: "College Portfolio" },
  { name: "Crimson Crossing", vertical: "Student", units: 264, state: "Alabama", owner: "Southern Heritage", portfolio: "Southeast Portfolio" },
  { name: "Husky Heights", vertical: "Student", units: 196, state: "Washington", owner: "Pacific Realty LLC", portfolio: "Coastal Holdings" },

  // Affordable
  { name: "Oakwood Terrace", vertical: "Affordable", units: 150, state: "California", owner: "Equity Housing Trust", portfolio: "Equity Housing Portfolio" },
  { name: "Heritage Place", vertical: "Affordable", units: 88, state: "Texas", owner: "Equity Housing Trust", portfolio: "Equity Housing Portfolio" },
  { name: "Maple Grove Commons", vertical: "Affordable", units: 112, state: "Ohio", owner: "Heartland Housing", portfolio: "Heartland Portfolio" },
  { name: "Cedar Creek Villas", vertical: "Affordable", units: 96, state: "New Mexico", owner: "Southwest Affordable Trust", portfolio: "Southwest Portfolio" },
  { name: "Crescent Court", vertical: "Affordable", units: 124, state: "Louisiana", owner: "Bayou Campus Realty", portfolio: "Southeast Portfolio" },
  { name: "Riverbend Commons", vertical: "Affordable", units: 80, state: "Tennessee", owner: "Southern Heritage", portfolio: "Southeast Portfolio" },

];

const sortAlpha = <T extends string>(values: T[]): T[] =>
  Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));

const propertiesToLeafNodes = (properties: PropertyMeta[]): Property[] =>
  [...properties]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map<Property>((property) => ({ id: property.name, name: property.name, type: "property" }));

export const PROPERTY_FILTER_DATA: PropertyFilterDataConfig = {
  dropdownSections: [
    { label: "Smart Groups", options: ["Property List", "Verticals", "States", "Owners"] },
    { label: "Custom Groups", options: ["Portfolios"] },
  ],
  defaultOption: "Property List",
  flatListOptions: ["Property List"],
  getDataForOption: (option) => {
    switch (option) {
      case "Property List":
        return propertiesToLeafNodes(MOCK_PROPERTIES);
      case "Verticals":
        return VERTICALS.map<Property>((vertical) => {
          const matches = MOCK_PROPERTIES.filter((property) => property.vertical === vertical);
          return {
            id: `vertical-${vertical}`,
            name: vertical,
            type: "region",
            count: matches.length,
            children: propertiesToLeafNodes(matches),
          };
        });
      case "States":
        return sortAlpha(MOCK_PROPERTIES.map((property) => property.state)).map<Property>((state) => {
          const matches = MOCK_PROPERTIES.filter((property) => property.state === state);
          return {
            id: `state-${state}`,
            name: state,
            type: "portfolio",
            count: matches.length,
            children: propertiesToLeafNodes(matches),
          };
        });
      case "Owners":
        return sortAlpha(MOCK_PROPERTIES.map((property) => property.owner)).map<Property>((owner) => {
          const matches = MOCK_PROPERTIES.filter((property) => property.owner === owner);
          return {
            id: `owner-${owner}`,
            name: owner,
            type: "portfolio",
            count: matches.length,
            children: propertiesToLeafNodes(matches),
          };
        });
      case "Portfolios":
        return sortAlpha(MOCK_PROPERTIES.map((property) => property.portfolio)).map<Property>((portfolio) => {
          const matches = MOCK_PROPERTIES.filter((property) => property.portfolio === portfolio);
          return {
            id: `portfolio-${portfolio}`,
            name: portfolio,
            type: "portfolio",
            count: matches.length,
            children: propertiesToLeafNodes(matches),
          };
        });
      default:
        return propertiesToLeafNodes(MOCK_PROPERTIES);
    }
  },
  getSearchPlaceholder: (option) => {
    switch (option) {
      case "Verticals":
        return "Search verticals";
      case "States":
        return "Search states";
      case "Owners":
        return "Search owners";
      case "Portfolios":
        return "Search portfolios";
      default:
        return "Search properties";
    }
  },
  getSectionTitle: (option) => {
    switch (option) {
      case "Verticals":
        return "Properties by vertical";
      case "States":
        return "Properties by state";
      case "Owners":
        return "Properties by owner";
      case "Portfolios":
        return "Properties by portfolio";
      default:
        return "Select properties";
    }
  },
};
