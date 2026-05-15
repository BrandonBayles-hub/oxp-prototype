// Local fork (oxp-prototype-product): only relative `../ui/*` imports were
// rewritten to `@/components/ui/*` to match this app's path alias. No other
// behavioral changes — keep this file in lockstep with the sandbox.
// Original: ../../prototype-sandbox/src/components/composite/PropertyFilter.tsx

"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import {
  Blocks,
  Building,
  ChevronDown,
  ChevronUp,
  Info,
  LayoutGrid,
  Search,
  Ungroup,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

// Types
export interface Property {
  id: string;
  name: string;
  type: 'portfolio' | 'region' | 'group' | 'property';
  count?: number;
  hasInfo?: boolean;
  children?: Property[];
}

export interface SelectedProperty {
  id: string;
  name: string;
}

export interface SelectionSummaryItem {
  id: string;
  name: string;
  type: Property['type'];
  propertyCount: number;
  leafIds: string[];
}

export interface FilterSelectionState {
  selectedDropdownOption: string;
  selectedPropertyIds: string[];
  selectedProperties: SelectedProperty[];
  summaryItems: SelectionSummaryItem[];
  selectedPropertyCount: number;
  selectedGroupCount: number;
  selectedIndividualPropertyCount: number;
}

/**
 * A section in the property group dropdown (label + list of option values).
 * Consumers provide these to group their views in the select menu.
 */
export interface PropertyFilterDropdownGroup {
  label: string;
  options: string[];
}

/**
 * Data configuration for `PropertyFilter`. Consumers pass this via the `data`
 * prop to feed in their own properties, groups, and views. The built-in
 * `demoPropertyFilterData` export provides a realistic fallback for demos,
 * Storybook, and initial integration — replace it in production.
 */
export interface PropertyFilterDataConfig {
  /** Sections shown in the group selector. First section's first option is
   *  used as the default view when `defaultOption` is not set. */
  dropdownSections: PropertyFilterDropdownGroup[];
  /** Returns the tree data for a given dropdown option value. */
  getDataForOption: (option: string) => Property[];
  /** Option values that render as a flat list with a "Select All" row. */
  flatListOptions?: string[];
  /** Search placeholder text by option. Falls back to "Search". */
  getSearchPlaceholder?: (option: string) => string;
  /** Section heading above the tree by option. Falls back to "Select Properties". */
  getSectionTitle?: (option: string) => string;
  /** Initial selected option. Falls back to the first option in the first section. */
  defaultOption?: string;
}

const getSelectedPropertiesForData = (
  items: Property[],
  selectedIds: Set<string>
): SelectedProperty[] => {
  const selectedLeaves = new Map<string, SelectedProperty>();

  const collectLeaves = (nodes: Property[]) => {
    for (const node of nodes) {
      if (node.type === 'property' && selectedIds.has(node.id)) {
        selectedLeaves.set(node.id, { id: node.id, name: node.name });
      }

      if (node.children) {
        collectLeaves(node.children);
      }
    }
  };

  collectLeaves(items);

  return Array.from(selectedLeaves.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
};

const getPropertyOptionsForData = (items: Property[]): SelectedProperty[] => {
  const propertyOptions = new Map<string, SelectedProperty>();

  const collectLeaves = (nodes: Property[]) => {
    for (const node of nodes) {
      if (node.type === 'property') {
        propertyOptions.set(node.id, { id: node.id, name: node.name });
      }

      if (node.children) {
        collectLeaves(node.children);
      }
    }
  };

  collectLeaves(items);

  return Array.from(propertyOptions.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
};

const getLeafIdsForNode = (node: Property): string[] => {
  if (!node.children || node.children.length === 0) {
    return node.type === 'property' ? [node.id] : [];
  }

  return node.children.flatMap(getLeafIdsForNode);
};

const getSelectedLeafIds = (items: Property[], selected: Set<string>): string[] => {
  const ids = new Set<string>();

  const collect = (nodes: Property[]) => {
    for (const node of nodes) {
      if (node.type === 'property' && selected.has(node.id)) {
        ids.add(node.id);
      }

      if (node.children) {
        collect(node.children);
      }
    }
  };

  collect(items);
  return Array.from(ids);
};

const areSetsEqual = (left: Set<string>, right: Set<string>) => {
  if (left.size !== right.size) return false;

  for (const value of left) {
    if (!right.has(value)) return false;
  }

  return true;
};

const buildSelectedSetFromLeafIds = (
  items: Property[],
  selectedLeafIds: Set<string>
) => {
  const nextSelected = new Set<string>();

  const visit = (
    item: Property
  ): { hasLeaves: boolean; allLeavesSelected: boolean } => {
    if (!item.children || item.children.length === 0) {
      const isLeaf = item.type === 'property';
      const isSelectedLeaf = isLeaf && selectedLeafIds.has(item.id);

      if (isSelectedLeaf) {
        nextSelected.add(item.id);
      }

      return {
        hasLeaves: isLeaf,
        allLeavesSelected: isSelectedLeaf,
      };
    }

    let hasLeaves = false;
    let allLeavesSelected = true;

    for (const child of item.children) {
      const result = visit(child);

      if (!result.hasLeaves) {
        continue;
      }

      hasLeaves = true;
      allLeavesSelected = allLeavesSelected && result.allLeavesSelected;
    }

    if (hasLeaves && allLeavesSelected) {
      nextSelected.add(item.id);
    }

    return { hasLeaves, allLeavesSelected: hasLeaves && allLeavesSelected };
  };

  items.forEach(visit);
  return nextSelected;
};

const buildSelectionSummaryItems = (
  items: Property[],
  selectedIds: Set<string>
): SelectionSummaryItem[] => {
  const summaryItems: SelectionSummaryItem[] = [];
  const coveredLeafIds = new Set<string>();

  const visitBranches = (node: Property) => {
    const leafIds = getLeafIdsForNode(node);

    if (leafIds.length === 0) {
      return;
    }

    const selectedLeafIds = leafIds.filter((leafId) => selectedIds.has(leafId));

    if (selectedLeafIds.length === 0) {
      return;
    }

    if (node.type === 'property') {
      return;
    }

    if (selectedIds.has(node.id)) {
      summaryItems.push({
        id: node.id,
        name: node.name,
        type: node.type,
        propertyCount: selectedLeafIds.length,
        leafIds: selectedLeafIds,
      });
      selectedLeafIds.forEach((leafId) => coveredLeafIds.add(leafId));
      return;
    }

    node.children?.forEach(visitBranches);
  };

  items.forEach(visitBranches);

  const uncoveredProperties = getSelectedPropertiesForData(items, selectedIds)
    .filter((property) => !coveredLeafIds.has(property.id))
    .map<SelectionSummaryItem>((property) => ({
      id: property.id,
      name: property.name,
      type: 'property',
      propertyCount: 1,
      leafIds: [property.id],
    }));

  return [...summaryItems, ...uncoveredProperties];
};

const sortDataAlpha = (items: Property[]): Property[] =>
  [...items].sort((a, b) => a.name.localeCompare(b.name)).map((item) => ({
    ...item,
    children: item.children ? sortDataAlpha(item.children) : undefined,
  }));

// Sample data structure for Property List view
const portfolioData: Property[] = [
  {
    id: 'cambridge-living',
    name: 'Cambridge Living',
    type: 'portfolio',
    count: 16,
    children: [
      {
        id: 'region-a',
        name: 'Region A',
        type: 'region',
        count: 4,
        children: [
          {
            id: 'campus-model-1',
            name: 'Campus Model 1',
            type: 'group',
            count: 2,
            children: [
              { id: 'summit-park', name: 'Summit Park', type: 'property' },
              { id: 'victoria-place', name: 'Victoria Place', type: 'property', hasInfo: true }
            ]
          },
          {
            id: 'urban-living-1',
            name: 'Urban Living 1',
            type: 'group',
            count: 2,
            children: [
              { id: 'metro-heights', name: 'Metro Heights', type: 'property' },
              { id: 'downtown-lofts', name: 'Downtown Lofts', type: 'property' }
            ]
          }
        ]
      },
      {
        id: 'region-b',
        name: 'Region B',
        type: 'region',
        count: 6,
        children: [
          {
            id: 'campus-model-2',
            name: 'Campus Model 2',
            type: 'group',
            count: 3,
            children: [
              { id: 'university-park', name: 'University Park', type: 'property' },
              { id: 'student-commons', name: 'Student Commons', type: 'property' },
              { id: 'academic-village', name: 'Academic Village', type: 'property' }
            ]
          },
          {
            id: 'luxury-estates',
            name: 'Luxury Estates',
            type: 'group',
            count: 3,
            children: [
              { id: 'royal-gardens', name: 'Royal Gardens', type: 'property', hasInfo: true },
              { id: 'pristine-manor', name: 'Pristine Manor', type: 'property' },
              { id: 'elite-residences', name: 'Elite Residences', type: 'property' }
            ]
          }
        ]
      },
      {
        id: 'region-c',
        name: 'Region C',
        type: 'region',
        count: 6,
        children: [
          {
            id: 'suburban-model',
            name: 'Suburban Model',
            type: 'group',
            count: 4,
            children: [
              { id: 'family-homes', name: 'Family Homes', type: 'property' },
              { id: 'green-meadows', name: 'Green Meadows', type: 'property' },
              { id: 'oak-terrace', name: 'Oak Terrace', type: 'property' },
              { id: 'maple-grove', name: 'Maple Grove', type: 'property' }
            ]
          },
          {
            id: 'townhouse-complex',
            name: 'Townhouse Complex',
            type: 'group',
            count: 2,
            children: [
              { id: 'heritage-row', name: 'Heritage Row', type: 'property' },
              { id: 'community-square', name: 'Community Square', type: 'property' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'hailey-communities',
    name: 'Hailey Communities',
    type: 'portfolio',
    count: 36,
    children: [
      {
        id: 'hailey-north',
        name: 'Hailey North Region',
        type: 'region',
        count: 18,
        children: [
          {
            id: 'modern-living',
            name: 'Modern Living',
            type: 'group',
            count: 9,
            children: [
              { id: 'skyline-towers', name: 'Skyline Towers', type: 'property' },
              { id: 'urban-edge', name: 'Urban Edge', type: 'property' },
              { id: 'city-view', name: 'City View', type: 'property' },
              { id: 'modern-square', name: 'Modern Square', type: 'property' },
              { id: 'glass-house', name: 'Glass House', type: 'property' },
              { id: 'steel-frames', name: 'Steel Frames', type: 'property' },
              { id: 'concrete-gardens', name: 'Concrete Gardens', type: 'property' },
              { id: 'metro-plaza', name: 'Metro Plaza', type: 'property' },
              { id: 'innovation-hub', name: 'Innovation Hub', type: 'property' }
            ]
          },
          {
            id: 'eco-friendly',
            name: 'Eco-Friendly',
            type: 'group',
            count: 9,
            children: [
              { id: 'green-towers', name: 'Green Towers', type: 'property', hasInfo: true },
              { id: 'solar-village', name: 'Solar Village', type: 'property' },
              { id: 'eco-gardens', name: 'Eco Gardens', type: 'property' },
              { id: 'renewable-ridge', name: 'Renewable Ridge', type: 'property' },
              { id: 'sustainable-square', name: 'Sustainable Square', type: 'property' },
              { id: 'earth-homes', name: 'Earth Homes', type: 'property' },
              { id: 'wind-meadows', name: 'Wind Meadows', type: 'property' },
              { id: 'nature-preserve', name: 'Nature Preserve', type: 'property' },
              { id: 'bio-complex', name: 'Bio Complex', type: 'property' }
            ]
          }
        ]
      },
      {
        id: 'hailey-south',
        name: 'Hailey South Region',
        type: 'region',
        count: 18,
        children: [
          {
            id: 'coastal-properties',
            name: 'Coastal Properties',
            type: 'group',
            count: 9,
            children: [
              { id: 'ocean-view', name: 'Ocean View', type: 'property' },
              { id: 'beach-front', name: 'Beach Front', type: 'property' },
              { id: 'sea-breeze', name: 'Sea Breeze', type: 'property' },
              { id: 'marina-bay', name: 'Marina Bay', type: 'property' },
              { id: 'coastal-heights', name: 'Coastal Heights', type: 'property' },
              { id: 'lighthouse-point', name: 'Lighthouse Point', type: 'property' },
              { id: 'harbor-views', name: 'Harbor Views', type: 'property' },
              { id: 'seaside-retreat', name: 'Seaside Retreat', type: 'property' },
              { id: 'wave-crest', name: 'Wave Crest', type: 'property' }
            ]
          },
          {
            id: 'mountain-properties',
            name: 'Mountain Properties',
            type: 'group',
            count: 9,
            children: [
              { id: 'peak-view', name: 'Peak View', type: 'property' },
              { id: 'alpine-lodge', name: 'Alpine Lodge', type: 'property' },
              { id: 'summit-ridge', name: 'Summit Ridge', type: 'property' },
              { id: 'forest-edge', name: 'Forest Edge', type: 'property' },
              { id: 'valley-homes', name: 'Valley Homes', type: 'property' },
              { id: 'pine-crest', name: 'Pine Crest', type: 'property' },
              { id: 'rocky-point', name: 'Rocky Point', type: 'property' },
              { id: 'wilderness-retreat', name: 'Wilderness Retreat', type: 'property' },
              { id: 'mountain-vista', name: 'Mountain Vista', type: 'property', hasInfo: true }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'hillshire-realty',
    name: 'Hillshire Realty Partners',
    type: 'portfolio',
    count: 36,
    children: [
      {
        id: 'hillshire-east',
        name: 'Hillshire East Region',
        type: 'region',
        count: 18,
        children: [
          {
            id: 'executive-properties',
            name: 'Executive Properties',
            type: 'group',
            count: 9,
            children: [
              { id: 'executive-plaza', name: 'Executive Plaza', type: 'property' },
              { id: 'corporate-heights', name: 'Corporate Heights', type: 'property' },
              { id: 'business-district', name: 'Business District', type: 'property' },
              { id: 'professional-park', name: 'Professional Park', type: 'property' },
              { id: 'commerce-center', name: 'Commerce Center', type: 'property' },
              { id: 'trade-towers', name: 'Trade Towers', type: 'property' },
              { id: 'financial-square', name: 'Financial Square', type: 'property' },
              { id: 'office-complex', name: 'Office Complex', type: 'property' },
              { id: 'enterprise-hub', name: 'Enterprise Hub', type: 'property' }
            ]
          },
          {
            id: 'residential-estates',
            name: 'Residential Estates',
            type: 'group',
            count: 9,
            children: [
              { id: 'hillshire-manor', name: 'Hillshire Manor', type: 'property' },
              { id: 'countryside-estates', name: 'Countryside Estates', type: 'property' },
              { id: 'garden-villas', name: 'Garden Villas', type: 'property' },
              { id: 'heritage-homes', name: 'Heritage Homes', type: 'property' },
              { id: 'classic-residences', name: 'Classic Residences', type: 'property' },
              { id: 'villa-gardens', name: 'Villa Gardens', type: 'property' },
              { id: 'estate-properties', name: 'Estate Properties', type: 'property' },
              { id: 'manor-house', name: 'Manor House', type: 'property' },
              { id: 'grand-estates', name: 'Grand Estates', type: 'property', hasInfo: true }
            ]
          }
        ]
      },
      {
        id: 'hillshire-west',
        name: 'Hillshire West Region',
        type: 'region',
        count: 18,
        children: [
          {
            id: 'luxury-condos',
            name: 'Luxury Condos',
            type: 'group',
            count: 9,
            children: [
              { id: 'penthouse-suites', name: 'Penthouse Suites', type: 'property' },
              { id: 'luxury-towers', name: 'Luxury Towers', type: 'property' },
              { id: 'premium-residences', name: 'Premium Residences', type: 'property' },
              { id: 'exclusive-condos', name: 'Exclusive Condos', type: 'property' },
              { id: 'high-rise-luxury', name: 'High-Rise Luxury', type: 'property' },
              { id: 'upscale-living', name: 'Upscale Living', type: 'property' },
              { id: 'elite-towers', name: 'Elite Towers', type: 'property' },
              { id: 'prestige-point', name: 'Prestige Point', type: 'property' },
              { id: 'platinum-place', name: 'Platinum Place', type: 'property' }
            ]
          },
          {
            id: 'mixed-use',
            name: 'Mixed-Use Development',
            type: 'group',
            count: 9,
            children: [
              { id: 'lifestyle-center', name: 'Lifestyle Center', type: 'property' },
              { id: 'urban-village', name: 'Urban Village', type: 'property' },
              { id: 'community-hub', name: 'Community Hub', type: 'property' },
              { id: 'retail-residential', name: 'Retail Residential', type: 'property' },
              { id: 'mixed-plaza', name: 'Mixed Plaza', type: 'property' },
              { id: 'live-work-play', name: 'Live Work Play', type: 'property' },
              { id: 'integrated-living', name: 'Integrated Living', type: 'property' },
              { id: 'downtown-district', name: 'Downtown District', type: 'property' },
              { id: 'multipurpose-complex', name: 'Multipurpose Complex', type: 'property' }
            ]
          }
        ]
      }
    ]
  }
];

// Flat property list: extracts all leaf properties from the hierarchy
const flattenProperties = (items: Property[]): Property[] => {
  const result: Property[] = [];
  const extract = (item: Property) => {
    if (item.type === 'property') {
      result.push({ ...item, id: `pl-${item.id}` });
    }
    item.children?.forEach(extract);
  };
  items.forEach(extract);
  return result.sort((a, b) => a.name.localeCompare(b.name));
};

const propertyListData: Property[] = flattenProperties(portfolioData);

// Sample data structure for States view
const statesData: Property[] = [
  {
    id: 'california',
    name: 'California',
    type: 'portfolio', // Reusing 'portfolio' type for states to get the same styling
    count: 28,
    children: [
      { id: 'summit-park-ca', name: 'Summit Park', type: 'property' },
      { id: 'victoria-place-ca', name: 'Victoria Place', type: 'property', hasInfo: true },
      { id: 'metro-heights-ca', name: 'Metro Heights', type: 'property' },
      { id: 'downtown-lofts-ca', name: 'Downtown Lofts', type: 'property' },
      { id: 'university-park-ca', name: 'University Park', type: 'property' },
      { id: 'student-commons-ca', name: 'Student Commons', type: 'property' },
      { id: 'academic-village-ca', name: 'Academic Village', type: 'property' },
      { id: 'royal-gardens-ca', name: 'Royal Gardens', type: 'property', hasInfo: true },
      { id: 'pristine-manor-ca', name: 'Pristine Manor', type: 'property' },
      { id: 'elite-residences-ca', name: 'Elite Residences', type: 'property' },
      { id: 'family-homes-ca', name: 'Family Homes', type: 'property' },
      { id: 'green-meadows-ca', name: 'Green Meadows', type: 'property' },
      { id: 'oak-terrace-ca', name: 'Oak Terrace', type: 'property' },
      { id: 'maple-grove-ca', name: 'Maple Grove', type: 'property' },
      { id: 'heritage-row-ca', name: 'Heritage Row', type: 'property' },
      { id: 'community-square-ca', name: 'Community Square', type: 'property' },
      { id: 'skyline-towers-ca', name: 'Skyline Towers', type: 'property' },
      { id: 'urban-edge-ca', name: 'Urban Edge', type: 'property' },
      { id: 'city-view-ca', name: 'City View', type: 'property' },
      { id: 'modern-square-ca', name: 'Modern Square', type: 'property' },
      { id: 'glass-house-ca', name: 'Glass House', type: 'property' },
      { id: 'steel-frames-ca', name: 'Steel Frames', type: 'property' },
      { id: 'concrete-gardens-ca', name: 'Concrete Gardens', type: 'property' },
      { id: 'metro-plaza-ca', name: 'Metro Plaza', type: 'property' },
      { id: 'innovation-hub-ca', name: 'Innovation Hub', type: 'property' },
      { id: 'green-towers-ca', name: 'Green Towers', type: 'property', hasInfo: true },
      { id: 'solar-village-ca', name: 'Solar Village', type: 'property' },
      { id: 'eco-gardens-ca', name: 'Eco Gardens', type: 'property' }
    ]
  },
  {
    id: 'delaware',
    name: 'Delaware',
    type: 'portfolio',
    count: 25,
    children: [
      { id: 'renewable-ridge-de', name: 'Renewable Ridge', type: 'property' },
      { id: 'sustainable-square-de', name: 'Sustainable Square', type: 'property' },
      { id: 'earth-homes-de', name: 'Earth Homes', type: 'property' },
      { id: 'wind-meadows-de', name: 'Wind Meadows', type: 'property' },
      { id: 'nature-preserve-de', name: 'Nature Preserve', type: 'property' },
      { id: 'bio-complex-de', name: 'Bio Complex', type: 'property' },
      { id: 'ocean-view-de', name: 'Ocean View', type: 'property' },
      { id: 'beach-front-de', name: 'Beach Front', type: 'property' },
      { id: 'sea-breeze-de', name: 'Sea Breeze', type: 'property' },
      { id: 'marina-bay-de', name: 'Marina Bay', type: 'property' },
      { id: 'coastal-heights-de', name: 'Coastal Heights', type: 'property' },
      { id: 'lighthouse-point-de', name: 'Lighthouse Point', type: 'property' },
      { id: 'harbor-views-de', name: 'Harbor Views', type: 'property' },
      { id: 'seaside-retreat-de', name: 'Seaside Retreat', type: 'property' },
      { id: 'wave-crest-de', name: 'Wave Crest', type: 'property' },
      { id: 'peak-view-de', name: 'Peak View', type: 'property' },
      { id: 'alpine-lodge-de', name: 'Alpine Lodge', type: 'property' },
      { id: 'summit-ridge-de', name: 'Summit Ridge', type: 'property' },
      { id: 'forest-edge-de', name: 'Forest Edge', type: 'property' },
      { id: 'valley-homes-de', name: 'Valley Homes', type: 'property' },
      { id: 'pine-crest-de', name: 'Pine Crest', type: 'property' },
      { id: 'rocky-point-de', name: 'Rocky Point', type: 'property' },
      { id: 'wilderness-retreat-de', name: 'Wilderness Retreat', type: 'property' },
      { id: 'mountain-vista-de', name: 'Mountain Vista', type: 'property', hasInfo: true },
      { id: 'executive-plaza-de', name: 'Executive Plaza', type: 'property' }
    ]
  },
  {
    id: 'texas',
    name: 'Texas',
    type: 'portfolio',
    count: 30,
    children: [
      { id: 'corporate-heights-tx', name: 'Corporate Heights', type: 'property' },
      { id: 'business-district-tx', name: 'Business District', type: 'property' },
      { id: 'professional-park-tx', name: 'Professional Park', type: 'property' },
      { id: 'commerce-center-tx', name: 'Commerce Center', type: 'property' },
      { id: 'trade-towers-tx', name: 'Trade Towers', type: 'property' },
      { id: 'financial-square-tx', name: 'Financial Square', type: 'property' },
      { id: 'office-complex-tx', name: 'Office Complex', type: 'property' },
      { id: 'enterprise-hub-tx', name: 'Enterprise Hub', type: 'property' },
      { id: 'hillshire-manor-tx', name: 'Hillshire Manor', type: 'property' },
      { id: 'countryside-estates-tx', name: 'Countryside Estates', type: 'property' },
      { id: 'garden-villas-tx', name: 'Garden Villas', type: 'property' },
      { id: 'heritage-homes-tx', name: 'Heritage Homes', type: 'property' },
      { id: 'classic-residences-tx', name: 'Classic Residences', type: 'property' },
      { id: 'villa-gardens-tx', name: 'Villa Gardens', type: 'property' },
      { id: 'estate-properties-tx', name: 'Estate Properties', type: 'property' },
      { id: 'manor-house-tx', name: 'Manor House', type: 'property' },
      { id: 'grand-estates-tx', name: 'Grand Estates', type: 'property', hasInfo: true },
      { id: 'penthouse-suites-tx', name: 'Penthouse Suites', type: 'property' },
      { id: 'luxury-towers-tx', name: 'Luxury Towers', type: 'property' },
      { id: 'premium-residences-tx', name: 'Premium Residences', type: 'property' },
      { id: 'exclusive-condos-tx', name: 'Exclusive Condos', type: 'property' },
      { id: 'high-rise-luxury-tx', name: 'High-Rise Luxury', type: 'property' },
      { id: 'upscale-living-tx', name: 'Upscale Living', type: 'property' },
      { id: 'elite-towers-tx', name: 'Elite Towers', type: 'property' },
      { id: 'prestige-point-tx', name: 'Prestige Point', type: 'property' },
      { id: 'platinum-place-tx', name: 'Platinum Place', type: 'property' },
      { id: 'lifestyle-center-tx', name: 'Lifestyle Center', type: 'property' },
      { id: 'urban-village-tx', name: 'Urban Village', type: 'property' },
      { id: 'community-hub-tx', name: 'Community Hub', type: 'property' },
      { id: 'retail-residential-tx', name: 'Retail Residential', type: 'property' }
    ]
  },
  {
    id: 'florida',
    name: 'Florida',
    type: 'portfolio',
    count: 25,
    children: [
      { id: 'mixed-plaza-fl', name: 'Mixed Plaza', type: 'property' },
      { id: 'live-work-play-fl', name: 'Live Work Play', type: 'property' },
      { id: 'integrated-living-fl', name: 'Integrated Living', type: 'property' },
      { id: 'downtown-district-fl', name: 'Downtown District', type: 'property' },
      { id: 'multipurpose-complex-fl', name: 'Multipurpose Complex', type: 'property' },
      { id: 'tropical-gardens-fl', name: 'Tropical Gardens', type: 'property' },
      { id: 'palm-breeze-fl', name: 'Palm Breeze', type: 'property' },
      { id: 'sunshine-towers-fl', name: 'Sunshine Towers', type: 'property' },
      { id: 'coral-reef-fl', name: 'Coral Reef', type: 'property' },
      { id: 'everglades-view-fl', name: 'Everglades View', type: 'property' },
      { id: 'miami-modern-fl', name: 'Miami Modern', type: 'property' },
      { id: 'art-deco-district-fl', name: 'Art Deco District', type: 'property' },
      { id: 'key-biscayne-fl', name: 'Key Biscayne', type: 'property' },
      { id: 'south-beach-fl', name: 'South Beach', type: 'property' },
      { id: 'orlando-central-fl', name: 'Orlando Central', type: 'property' },
      { id: 'disney-district-fl', name: 'Disney District', type: 'property' },
      { id: 'universal-plaza-fl', name: 'Universal Plaza', type: 'property' },
      { id: 'tampa-bay-fl', name: 'Tampa Bay', type: 'property' },
      { id: 'clearwater-beach-fl', name: 'Clearwater Beach', type: 'property' },
      { id: 'st-pete-downtown-fl', name: 'St Pete Downtown', type: 'property' },
      { id: 'jacksonville-north-fl', name: 'Jacksonville North', type: 'property' },
      { id: 'tallahassee-hills-fl', name: 'Tallahassee Hills', type: 'property' },
      { id: 'gainesville-campus-fl', name: 'Gainesville Campus', type: 'property' },
      { id: 'fort-lauderdale-fl', name: 'Fort Lauderdale', type: 'property', hasInfo: true },
      { id: 'naples-luxury-fl', name: 'Naples Luxury', type: 'property' }
    ]
  }
];

// Property Types: flat list of properties under each type (per PDF spec)
const propertyTypesData: Property[] = [
  {
    id: 'apartments',
    name: 'Apartments',
    type: 'portfolio',
    count: 16,
    children: [
      { id: 'summit-park-apt', name: 'Summit Park', type: 'property' },
      { id: 'victoria-place-apt', name: 'Victoria Place', type: 'property', hasInfo: true },
      { id: 'metro-heights-apt', name: 'Metro Heights', type: 'property' },
      { id: 'downtown-lofts-apt', name: 'Downtown Lofts', type: 'property' },
      { id: 'university-park-apt', name: 'University Park', type: 'property' },
      { id: 'student-commons-apt', name: 'Student Commons', type: 'property' },
      { id: 'academic-village-apt', name: 'Academic Village', type: 'property' },
      { id: 'royal-gardens-apt', name: 'Royal Gardens', type: 'property', hasInfo: true },
      { id: 'pristine-manor-apt', name: 'Pristine Manor', type: 'property' },
      { id: 'elite-residences-apt', name: 'Elite Residences', type: 'property' },
      { id: 'family-homes-apt', name: 'Family Homes', type: 'property' },
      { id: 'green-meadows-apt', name: 'Green Meadows', type: 'property' },
      { id: 'skyline-towers-apt', name: 'Skyline Towers', type: 'property' },
      { id: 'urban-edge-apt', name: 'Urban Edge', type: 'property' },
      { id: 'glass-house-apt', name: 'Glass House', type: 'property' },
      { id: 'green-towers-apt', name: 'Green Towers', type: 'property', hasInfo: true }
    ]
  },
  {
    id: 'office',
    name: 'Office',
    type: 'portfolio',
    count: 9,
    children: [
      { id: 'executive-plaza-office', name: 'Executive Plaza', type: 'property' },
      { id: 'corporate-heights-office', name: 'Corporate Heights', type: 'property' },
      { id: 'business-district-office', name: 'Business District', type: 'property' },
      { id: 'professional-park-office', name: 'Professional Park', type: 'property' },
      { id: 'commerce-center-office', name: 'Commerce Center', type: 'property' },
      { id: 'trade-towers-office', name: 'Trade Towers', type: 'property' },
      { id: 'financial-square-office', name: 'Financial Square', type: 'property' },
      { id: 'office-complex-office', name: 'Office Complex', type: 'property' },
      { id: 'enterprise-hub-office', name: 'Enterprise Hub', type: 'property' }
    ]
  },
  {
    id: 'retail',
    name: 'Retail',
    type: 'portfolio',
    count: 9,
    children: [
      { id: 'lifestyle-center-retail', name: 'Lifestyle Center', type: 'property' },
      { id: 'urban-village-retail', name: 'Urban Village', type: 'property' },
      { id: 'community-hub-retail', name: 'Community Hub', type: 'property' },
      { id: 'mixed-plaza-retail', name: 'Mixed Plaza', type: 'property' },
      { id: 'live-work-play-retail', name: 'Live Work Play', type: 'property' },
      { id: 'integrated-living-retail', name: 'Integrated Living', type: 'property' },
      { id: 'downtown-district-retail', name: 'Downtown District', type: 'property' },
      { id: 'multipurpose-complex-retail', name: 'Multipurpose Complex', type: 'property' },
      { id: 'retail-residential-retail', name: 'Retail Residential', type: 'property' }
    ]
  },
  {
    id: 'senior',
    name: 'Senior Living',
    type: 'portfolio',
    count: 9,
    children: [
      { id: 'hillshire-manor-senior', name: 'Hillshire Manor', type: 'property' },
      { id: 'countryside-estates-senior', name: 'Countryside Estates', type: 'property' },
      { id: 'garden-villas-senior', name: 'Garden Villas', type: 'property' },
      { id: 'heritage-homes-senior', name: 'Heritage Homes', type: 'property' },
      { id: 'classic-residences-senior', name: 'Classic Residences', type: 'property' },
      { id: 'villa-gardens-senior', name: 'Villa Gardens', type: 'property' },
      { id: 'estate-properties-senior', name: 'Estate Properties', type: 'property' },
      { id: 'manor-house-senior', name: 'Manor House', type: 'property' },
      { id: 'grand-estates-senior', name: 'Grand Estates', type: 'property', hasInfo: true }
    ]
  },
  {
    id: 'single-family',
    name: 'Single Family',
    type: 'portfolio',
    count: 10,
    children: [
      { id: 'ocean-view-sf', name: 'Ocean View', type: 'property' },
      { id: 'beach-front-sf', name: 'Beach Front', type: 'property' },
      { id: 'sea-breeze-sf', name: 'Sea Breeze', type: 'property' },
      { id: 'peak-view-sf', name: 'Peak View', type: 'property' },
      { id: 'alpine-lodge-sf', name: 'Alpine Lodge', type: 'property' },
      { id: 'forest-edge-sf', name: 'Forest Edge', type: 'property' },
      { id: 'valley-homes-sf', name: 'Valley Homes', type: 'property' },
      { id: 'pine-crest-sf', name: 'Pine Crest', type: 'property' },
      { id: 'wilderness-retreat-sf', name: 'Wilderness Retreat', type: 'property' },
      { id: 'mountain-vista-sf', name: 'Mountain Vista', type: 'property', hasInfo: true }
    ]
  },
  {
    id: 'military',
    name: 'Military',
    type: 'portfolio',
    count: 6,
    children: [
      { id: 'liberty-village-pt', name: 'Liberty Village', type: 'property' },
      { id: 'patriot-homes-pt', name: 'Patriot Homes', type: 'property' },
      { id: 'freedom-heights-pt', name: 'Freedom Heights', type: 'property' },
      { id: 'eagle-landing-pt', name: 'Eagle Landing', type: 'property' },
      { id: 'garrison-pointe-pt', name: 'Garrison Pointe', type: 'property' },
      { id: 'cascade-village-pt', name: 'Cascade Village', type: 'property' }
    ]
  }
];

// Owner smart group data
const ownerData: Property[] = [
  {
    id: 'cambridge-holdings',
    name: 'Cambridge Holdings LLC',
    type: 'portfolio',
    count: 16,
    children: [
      { id: 'summit-park', name: 'Summit Park', type: 'property' },
      { id: 'victoria-place', name: 'Victoria Place', type: 'property' },
      { id: 'metro-heights', name: 'Metro Heights', type: 'property' },
      { id: 'downtown-lofts', name: 'Downtown Lofts', type: 'property' },
      { id: 'university-park', name: 'University Park', type: 'property' },
      { id: 'student-commons', name: 'Student Commons', type: 'property' },
      { id: 'academic-village', name: 'Academic Village', type: 'property' },
      { id: 'royal-gardens', name: 'Royal Gardens', type: 'property' },
      { id: 'pristine-manor', name: 'Pristine Manor', type: 'property' },
      { id: 'elite-residences', name: 'Elite Residences', type: 'property' },
      { id: 'family-homes', name: 'Family Homes', type: 'property' },
      { id: 'green-meadows', name: 'Green Meadows', type: 'property' },
      { id: 'oak-terrace', name: 'Oak Terrace', type: 'property' },
      { id: 'maple-grove', name: 'Maple Grove', type: 'property' },
      { id: 'heritage-row', name: 'Heritage Row', type: 'property' },
      { id: 'community-square', name: 'Community Square', type: 'property' }
    ]
  },
  {
    id: 'hailey-investments',
    name: 'Hailey Investments Group',
    type: 'portfolio',
    count: 30,
    children: [
      { id: 'skyline-towers', name: 'Skyline Towers', type: 'property' },
      { id: 'urban-edge', name: 'Urban Edge', type: 'property' },
      { id: 'city-view', name: 'City View', type: 'property' },
      { id: 'modern-square', name: 'Modern Square', type: 'property' },
      { id: 'glass-house', name: 'Glass House', type: 'property' },
      { id: 'steel-frames', name: 'Steel Frames', type: 'property' },
      { id: 'concrete-gardens', name: 'Concrete Gardens', type: 'property' },
      { id: 'metro-plaza', name: 'Metro Plaza', type: 'property' },
      { id: 'innovation-hub', name: 'Innovation Hub', type: 'property' },
      { id: 'royal-gardens', name: 'Royal Gardens', type: 'property' },
      { id: 'solar-village', name: 'Solar Village', type: 'property' },
      { id: 'eco-gardens', name: 'Eco Gardens', type: 'property' },
      { id: 'ocean-view', name: 'Ocean View', type: 'property' },
      { id: 'beach-front', name: 'Beach Front', type: 'property' },
      { id: 'sea-breeze', name: 'Sea Breeze', type: 'property' },
      { id: 'marina-bay', name: 'Marina Bay', type: 'property' },
      { id: 'coastal-heights', name: 'Coastal Heights', type: 'property' },
      { id: 'lighthouse-point', name: 'Lighthouse Point', type: 'property' },
      { id: 'harbor-views', name: 'Harbor Views', type: 'property' },
      { id: 'seaside-retreat', name: 'Seaside Retreat', type: 'property' },
      { id: 'wave-crest', name: 'Wave Crest', type: 'property' },
      { id: 'grand-estates', name: 'Grand Estates', type: 'property' },
      { id: 'alpine-lodge', name: 'Alpine Lodge', type: 'property' },
      { id: 'summit-ridge', name: 'Summit Ridge', type: 'property' },
      { id: 'forest-edge', name: 'Forest Edge', type: 'property' },
      { id: 'valley-homes', name: 'Valley Homes', type: 'property' },
      { id: 'pine-crest', name: 'Pine Crest', type: 'property' },
      { id: 'rocky-point', name: 'Rocky Point', type: 'property' },
      { id: 'wilderness-retreat', name: 'Wilderness Retreat', type: 'property' },
      { id: 'mountain-vista', name: 'Mountain Vista', type: 'property' }
    ]
  },
  {
    id: 'hillshire-capital',
    name: 'Hillshire Capital Partners',
    type: 'portfolio',
    count: 30,
    children: [
      { id: 'executive-plaza', name: 'Executive Plaza', type: 'property' },
      { id: 'corporate-heights', name: 'Corporate Heights', type: 'property' },
      { id: 'business-district', name: 'Business District', type: 'property' },
      { id: 'professional-park', name: 'Professional Park', type: 'property' },
      { id: 'commerce-center', name: 'Commerce Center', type: 'property' },
      { id: 'trade-towers', name: 'Trade Towers', type: 'property' },
      { id: 'financial-square', name: 'Financial Square', type: 'property' },
      { id: 'office-complex', name: 'Office Complex', type: 'property' },
      { id: 'enterprise-hub', name: 'Enterprise Hub', type: 'property' },
      { id: 'victoria-place', name: 'Victoria Place', type: 'property' },
      { id: 'grand-estates', name: 'Grand Estates', type: 'property' },
      { id: 'garden-villas', name: 'Garden Villas', type: 'property' },
      { id: 'heritage-homes', name: 'Heritage Homes', type: 'property' },
      { id: 'classic-residences', name: 'Classic Residences', type: 'property' },
      { id: 'villa-gardens', name: 'Villa Gardens', type: 'property' },
      { id: 'estate-properties', name: 'Estate Properties', type: 'property' },
      { id: 'manor-house', name: 'Manor House', type: 'property' },
      { id: 'hillshire-manor', name: 'Hillshire Manor', type: 'property' },
      { id: 'countryside-estates', name: 'Countryside Estates', type: 'property' },
      { id: 'penthouse-suites', name: 'Penthouse Suites', type: 'property' },
      { id: 'luxury-towers', name: 'Luxury Towers', type: 'property' },
      { id: 'premium-residences', name: 'Premium Residences', type: 'property' },
      { id: 'exclusive-condos', name: 'Exclusive Condos', type: 'property' },
      { id: 'high-rise-luxury', name: 'High-Rise Luxury', type: 'property' },
      { id: 'upscale-living', name: 'Upscale Living', type: 'property' },
      { id: 'elite-towers', name: 'Elite Towers', type: 'property' },
      { id: 'prestige-point', name: 'Prestige Point', type: 'property' },
      { id: 'platinum-place', name: 'Platinum Place', type: 'property' },
      { id: 'lifestyle-center', name: 'Lifestyle Center', type: 'property' },
      { id: 'community-hub', name: 'Community Hub', type: 'property' }
    ]
  }
];

// Military Installations smart group data
const militaryInstallationsData: Property[] = [
  {
    id: 'fort-liberty',
    name: 'Fort Liberty',
    type: 'portfolio',
    count: 6,
    children: [
      { id: 'liberty-village-mil', name: 'Liberty Village', type: 'property' },
      { id: 'patriot-homes-mil', name: 'Patriot Homes', type: 'property' },
      { id: 'freedom-heights-mil', name: 'Freedom Heights', type: 'property' },
      { id: 'eagle-landing-mil', name: 'Eagle Landing', type: 'property' },
      { id: 'veterans-crossing-mil', name: 'Veterans Crossing', type: 'property' },
      { id: 'garrison-pointe-mil', name: 'Garrison Pointe', type: 'property' }
    ]
  },
  {
    id: 'jblm',
    name: 'Joint Base Lewis-McChord',
    type: 'portfolio',
    count: 4,
    children: [
      { id: 'cascade-village-mil', name: 'Cascade Village', type: 'property' },
      { id: 'rainier-heights-mil', name: 'Rainier Heights', type: 'property' },
      { id: 'tacoma-landing-mil', name: 'Tacoma Landing', type: 'property' },
      { id: 'puget-homes-mil', name: 'Puget Homes', type: 'property' }
    ]
  },
  {
    id: 'naval-station-norfolk',
    name: 'Naval Station Norfolk',
    type: 'portfolio',
    count: 5,
    children: [
      { id: 'harbor-point-mil', name: 'Harbor Point', type: 'property' },
      { id: 'chesapeake-landing-mil', name: 'Chesapeake Landing', type: 'property' },
      { id: 'admirals-row-mil', name: 'Admirals Row', type: 'property' },
      { id: 'navy-yard-homes-mil', name: 'Navy Yard Homes', type: 'property' },
      { id: 'tidewater-village-mil', name: 'Tidewater Village', type: 'property' }
    ]
  },
  {
    id: 'fort-hood',
    name: 'Fort Cavazos',
    type: 'portfolio',
    count: 4,
    children: [
      { id: 'cavalry-crossing-mil', name: 'Cavalry Crossing', type: 'property' },
      { id: 'killeen-heights-mil', name: 'Killeen Heights', type: 'property' },
      { id: 'lone-star-village-mil', name: 'Lone Star Village', type: 'property' },
      { id: 'central-texas-homes-mil', name: 'Central Texas Homes', type: 'property' }
    ]
  }
];

// Centralization system group data
const centralizationData: Property[] = [
  {
    id: 'denver-centralized',
    name: 'Denver Centralized Leasing',
    type: 'portfolio',
    count: 8,
    children: [
      { id: 'summit-park-cen', name: 'Summit Park', type: 'property' },
      { id: 'metro-heights-cen', name: 'Metro Heights', type: 'property' },
      { id: 'downtown-lofts-cen', name: 'Downtown Lofts', type: 'property' },
      { id: 'skyline-towers-cen', name: 'Skyline Towers', type: 'property' },
      { id: 'urban-edge-cen', name: 'Urban Edge', type: 'property' },
      { id: 'city-view-cen', name: 'City View', type: 'property' },
      { id: 'modern-square-cen', name: 'Modern Square', type: 'property' },
      { id: 'glass-house-cen', name: 'Glass House', type: 'property' }
    ]
  },
  {
    id: 'austin-centralized',
    name: 'Austin Centralized Leasing',
    type: 'portfolio',
    count: 6,
    children: [
      { id: 'corporate-heights-cen', name: 'Corporate Heights', type: 'property' },
      { id: 'business-district-cen', name: 'Business District', type: 'property' },
      { id: 'professional-park-cen', name: 'Professional Park', type: 'property' },
      { id: 'commerce-center-cen', name: 'Commerce Center', type: 'property' },
      { id: 'lifestyle-center-cen', name: 'Lifestyle Center', type: 'property' },
      { id: 'urban-village-cen', name: 'Urban Village', type: 'property' }
    ]
  },
  {
    id: 'orlando-centralized',
    name: 'Orlando Centralized Leasing',
    type: 'portfolio',
    count: 5,
    children: [
      { id: 'tropical-gardens-cen', name: 'Tropical Gardens', type: 'property' },
      { id: 'palm-breeze-cen', name: 'Palm Breeze', type: 'property' },
      { id: 'sunshine-towers-cen', name: 'Sunshine Towers', type: 'property' },
      { id: 'orlando-central-cen', name: 'Orlando Central', type: 'property' },
      { id: 'disney-district-cen', name: 'Disney District', type: 'property' }
    ]
  }
];

// Historical Access: flat list of contracted properties (per PDF spec)
const historicalAccessData: Property[] = [
  { id: 'heritage-row-hist', name: 'Heritage Row', type: 'property' },
  { id: 'community-square-hist', name: 'Community Square', type: 'property' },
  { id: 'grand-estates-hist', name: 'Grand Estates', type: 'property', hasInfo: true },
  { id: 'manor-house-hist', name: 'Manor House', type: 'property' },
  { id: 'classic-residences-hist', name: 'Classic Residences', type: 'property' },
  { id: 'heritage-homes-hist', name: 'Heritage Homes', type: 'property' },
  { id: 'countryside-estates-hist', name: 'Countryside Estates', type: 'property' },
  { id: 'garden-villas-hist', name: 'Garden Villas', type: 'property' }
];

// Overlays system group data, modeled as a flat list of overlay groups.
const overlaysData: Property[] = [
  {
    id: 'centralized-leasing-west-overlay',
    name: 'Centralized Leasing West',
    type: 'portfolio',
    count: 7,
    children: [
      { id: 'cottonwood-lane-sfr', name: 'Cottonwood Lane', type: 'property' },
      { id: 'signal-ridge-sfr', name: 'Signal Ridge', type: 'property' },
      { id: 'maple-hollow-sfr', name: 'Maple Hollow', type: 'property' },
      { id: 'boulder-creek-sfr', name: 'Boulder Creek', type: 'property' },
      { id: 'riverbend-sfr', name: 'Riverbend', type: 'property' },
      { id: 'silverlake-bungalow-sfr', name: 'Silverlake Bungalow', type: 'property' },
      { id: 'pinehurst-drive-sfr', name: 'Pinehurst Drive', type: 'property' }
    ]
  },
  {
    id: 'resident-care-standard-overlay',
    name: 'Resident Care Standard',
    type: 'portfolio',
    count: 4,
    children: [
      { id: 'cottonwood-lane-sfr', name: 'Cottonwood Lane', type: 'property' },
      { id: 'maple-hollow-sfr', name: 'Maple Hollow', type: 'property' },
      { id: 'boulder-creek-sfr', name: 'Boulder Creek', type: 'property' },
      { id: 'harborview-sfr', name: 'Harborview', type: 'property' }
    ]
  },
  {
    id: 'data-governance-core-overlay',
    name: 'Data Governance Core',
    type: 'portfolio',
    count: 3,
    children: [
      { id: 'cottonwood-lane-sfr', name: 'Cottonwood Lane', type: 'property' },
      { id: 'orbit-street-sfr', name: 'Orbit Street', type: 'property' },
      { id: 'magnolia-court-sfr', name: 'Magnolia Court', type: 'property' }
    ]
  },
  {
    id: 'military-housing-overlay-group',
    name: 'Military Housing Overlay',
    type: 'portfolio',
    count: 2,
    children: [
      { id: 'post-oak-court-sfr', name: 'Post Oak Court', type: 'property' },
      { id: 'pinehurst-drive-sfr', name: 'Pinehurst Drive', type: 'property' }
    ]
  },
  {
    id: 'student-leasing-east-overlay',
    name: 'Student Leasing East',
    type: 'portfolio',
    count: 2,
    children: [
      { id: 'boulder-creek-sfr', name: 'Boulder Creek', type: 'property' },
      { id: 'campus-row-sfr', name: 'Campus Row', type: 'property' }
    ]
  },
  {
    id: 'affordable-compliance-west-overlay',
    name: 'Affordable Compliance West',
    type: 'portfolio',
    count: 2,
    children: [
      { id: 'orbit-street-sfr', name: 'Orbit Street', type: 'property' },
      { id: 'riverbend-sfr', name: 'Riverbend', type: 'property' }
    ]
  }
];

// Custom groups data
const customGroupsData: Property[] = [
  {
    id: 'custom-region-category',
    name: 'Region',
    type: 'portfolio',
    count: 15,
    children: [
      {
        id: 'pacific-northwest-region',
        name: 'Pacific Northwest',
        type: 'region',
        count: 6,
        children: [
          {
            id: 'oregon-properties-group',
            name: 'Oregon Properties',
            type: 'group',
            count: 3,
            children: [
              { id: 'summit-park-cust', name: 'Summit Park', type: 'property' },
              { id: 'green-meadows-cust', name: 'Green Meadows', type: 'property' },
              { id: 'oak-terrace-cust', name: 'Oak Terrace', type: 'property' }
            ]
          },
          {
            id: 'washington-properties-group',
            name: 'Washington Properties',
            type: 'group',
            count: 3,
            children: [
              { id: 'rainier-court-cust', name: 'Rainier Court', type: 'property' },
              { id: 'evergreen-point-cust', name: 'Evergreen Point', type: 'property' },
              { id: 'harbor-heights-cust', name: 'Harbor Heights', type: 'property' }
            ]
          }
        ]
      },
      {
        id: 'southwest-region',
        name: 'Southwest',
        type: 'region',
        count: 4,
        children: [
          {
            id: 'arizona-properties-group',
            name: 'Arizona Properties',
            type: 'group',
            count: 2,
            children: [
              { id: 'desert-bloom-cust', name: 'Desert Bloom', type: 'property' },
              { id: 'mesa-verde-cust', name: 'Mesa Verde', type: 'property' }
            ]
          },
          {
            id: 'nevada-properties-group',
            name: 'Nevada Properties',
            type: 'group',
            count: 2,
            children: [
              { id: 'silver-flats-cust', name: 'Silver Flats', type: 'property' },
              { id: 'red-rock-residence-cust', name: 'Red Rock Residence', type: 'property' }
            ]
          }
        ]
      },
      {
        id: 'southeast-region',
        name: 'Southeast',
        type: 'region',
        count: 5,
        children: [
          {
            id: 'florida-properties-group',
            name: 'Florida Properties',
            type: 'group',
            count: 3,
            children: [
              { id: 'coral-reef-cust', name: 'Coral Reef', type: 'property' },
              { id: 'palm-breeze-cust', name: 'Palm Breeze', type: 'property' },
              { id: 'sunshine-towers-cust', name: 'Sunshine Towers', type: 'property' }
            ]
          },
          {
            id: 'carolinas-properties-group',
            name: 'Carolinas Properties',
            type: 'group',
            count: 2,
            children: [
              { id: 'blue-heron-cust', name: 'Blue Heron', type: 'property' },
              { id: 'seaside-commons-cust', name: 'Seaside Commons', type: 'property' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'custom-delinquency-category',
    name: 'Delinquency Policy',
    type: 'portfolio',
    count: 2,
    children: [
      {
        id: 'strict-delinquency',
        name: 'Strict Delinquency',
        type: 'group',
        count: 5,
        children: [
          { id: 'executive-plaza-cust', name: 'Executive Plaza', type: 'property' },
          { id: 'corporate-heights-cust', name: 'Corporate Heights', type: 'property' },
          { id: 'penthouse-suites-cust', name: 'Penthouse Suites', type: 'property' },
          { id: 'luxury-towers-cust', name: 'Luxury Towers', type: 'property' },
          { id: 'premium-residences-cust', name: 'Premium Residences', type: 'property' }
        ]
      },
      {
        id: 'standard-delinquency',
        name: 'Standard Delinquency',
        type: 'group',
        count: 4,
        children: [
          { id: 'family-homes-cust', name: 'Family Homes', type: 'property' },
          { id: 'heritage-row-cust', name: 'Heritage Row', type: 'property' },
          { id: 'community-square-cust', name: 'Community Square', type: 'property' },
          { id: 'penthouse-suites-cust', name: 'Penthouse Suites', type: 'property' }
        ]
      }
    ]
  },
  {
    id: 'dallas-portfolio-custom',
    name: 'Dallas Portfolio',
    type: 'portfolio',
    count: 6,
    children: [
      { id: 'trade-towers-cust', name: 'Trade Towers', type: 'property' },
      { id: 'financial-square-cust', name: 'Financial Square', type: 'property' },
      { id: 'office-complex-cust', name: 'Office Complex', type: 'property' },
      { id: 'enterprise-hub-cust', name: 'Enterprise Hub', type: 'property' },
      { id: 'hillshire-manor-cust', name: 'Hillshire Manor', type: 'property' },
      { id: 'countryside-estates-cust', name: 'Countryside Estates', type: 'property' }
    ]
  }
];

const ALL_CUSTOM_GROUP_NAMES = customGroupsData.map((group) => group.name);

const getDataForOption = (dropdownOption: string): Property[] => {
  switch (dropdownOption) {
    case 'States':
      return statesData;
    case 'Property Types':
      return propertyTypesData;
    case 'Owner':
      return ownerData;
    case 'Military Installations':
      return militaryInstallationsData;
    case 'Centralization':
      return centralizationData;
    case 'Historical Access':
      return historicalAccessData;
    case 'Overlays':
      return overlaysData;
    case 'Property List':
      return propertyListData;
    default:
      if (ALL_CUSTOM_GROUP_NAMES.includes(dropdownOption)) {
        const match = customGroupsData.find((group) => group.name === dropdownOption);
        return match ? [match] : customGroupsData;
      }
      return propertyListData;
  }
};

const buildSelectionStateForData = (
  dropdownOption: string,
  currentData: Property[],
  selectedIds: Set<string>
): FilterSelectionState => {
  const selectedPropertyIds = getSelectedLeafIds(currentData, selectedIds);
  const selectedProperties = getSelectedPropertiesForData(currentData, selectedIds);
  const summaryItems = buildSelectionSummaryItems(currentData, selectedIds);

  return {
    selectedDropdownOption: dropdownOption,
    selectedPropertyIds,
    selectedProperties,
    summaryItems,
    selectedPropertyCount: selectedPropertyIds.length,
    selectedGroupCount: summaryItems.filter((item) => item.type !== 'property').length,
    selectedIndividualPropertyCount: summaryItems.filter((item) => item.type === 'property').length,
  };
};

export const buildSelectionStateForOption = (
  dropdownOption: string,
  selectedPropertyIds: string[],
  config?: PropertyFilterDataConfig,
): FilterSelectionState => {
  const resolvedConfig = config ?? demoPropertyFilterData;
  const currentData = sortDataAlpha(resolvedConfig.getDataForOption(dropdownOption));
  const canonicalSelected = buildSelectedSetFromLeafIds(
    currentData,
    new Set(selectedPropertyIds)
  );

  return buildSelectionStateForData(dropdownOption, currentData, canonicalSelected);
};

export const getPropertyOptionsForOption = (
  dropdownOption: string,
  config?: PropertyFilterDataConfig,
): SelectedProperty[] => {
  const resolvedConfig = config ?? demoPropertyFilterData;
  return getPropertyOptionsForData(
    sortDataAlpha(resolvedConfig.getDataForOption(dropdownOption)),
  );
};

const demoDropdownSections: PropertyFilterDropdownGroup[] = [
  {
    label: 'Smart Groups',
    options: ['Property List', 'Property Types', 'States', 'Owner', 'Military Installations']
  },
  {
    label: 'System Groups',
    options: ['Centralization', 'Historical Access', 'Overlays']
  },
  {
    label: 'Custom Groups',
    options: ['Region', 'Delinquency Policy', 'Dallas Portfolio']
  }
];

const demoGetSearchPlaceholder = (option: string): string => {
  switch (option) {
    case 'States':
      return 'Search states';
    case 'Property Types':
      return 'Search property types';
    case 'Owner':
      return 'Search owners';
    case 'Military Installations':
      return 'Search installations';
    case 'Centralization':
      return 'Search leasing offices';
    case 'Historical Access':
      return 'Search properties';
    case 'Overlays':
      return 'Search overlays';
    case 'Property List':
      return 'Search properties';
    default:
      return 'Search groups';
  }
};

const demoGetSectionTitle = (option: string): string => {
  switch (option) {
    case 'Historical Access':
      return 'Historical Access Properties';
    case 'Centralization':
      return 'Centralized Leasing Offices';
    case 'Overlays':
      return 'Overlays';
    case 'Military Installations':
      return 'Military Installations';
    case 'Owner':
      return 'Property Owners';
    default:
      return 'Select Properties';
  }
};

/**
 * Built-in demo data for `PropertyFilter`. Realistic but fictional portfolios,
 * regions, groups, and properties that exercise every view (Property List,
 * States, Property Types, Owner, Military Installations, Centralization,
 * Historical Access, Overlays, Custom Groups).
 *
 * Use this for storybook, demos, and while integrating. **Replace it in
 * production** by passing your own `PropertyFilterDataConfig` to
 * `PropertyFilter` / `PropertySelector` via the `data` prop.
 */
export const demoPropertyFilterData: PropertyFilterDataConfig = {
  dropdownSections: demoDropdownSections,
  getDataForOption,
  flatListOptions: ['Property List', 'Historical Access'],
  getSearchPlaceholder: demoGetSearchPlaceholder,
  getSectionTitle: demoGetSectionTitle,
  defaultOption: 'Property List',
};

const ICON_BY_TYPE: Record<
  Property['type'],
  { Icon: React.ComponentType<{ className?: string; color?: string; strokeWidth?: number }>; color: string }
> = {
  portfolio: { Icon: LayoutGrid, color: '#CF9100' },
  region: { Icon: Blocks, color: '#034FC1' },
  group: { Icon: Ungroup, color: '#750000' },
  property: { Icon: Building, color: 'black' },
};

const getIcon = (type: Property['type']) => {
  const entry = ICON_BY_TYPE[type];
  if (!entry) return null;
  const { Icon, color } = entry;
  return <Icon className="size-4 shrink-0" color={color} strokeWidth={1.33} />;
};

const getIconBackground = (type: string) => {
  switch (type) {
    case 'portfolio':
      return 'bg-[#fff8e9]';
    case 'region':
      return 'bg-[#f1f8ff]';
    case 'group':
      return 'bg-[#fff4f2]';
    default:
      return '';
  }
};

type NodeSelectionState = 'checked' | 'indeterminate' | 'unchecked';

interface TreeItemProps {
  item: Property;
  level: number;
  expandedItems: Set<string>;
  selectedItems: Set<string>;
  nodeStateMap: Map<string, NodeSelectionState>;
  onToggleExpand: (id: string) => void;
  onToggleSelect: (id: string) => void;
  searchTerm: string;
  viewType?: string;
  propertyGroupMap: Map<string, string[]>;
  parentGroupName?: string;
}

const TreeItem: React.FC<TreeItemProps> = ({
  item,
  level,
  expandedItems,
  selectedItems,
  nodeStateMap,
  onToggleExpand,
  onToggleSelect,
  searchTerm,
  viewType,
  propertyGroupMap,
  parentGroupName
}) => {
  const isExpanded = expandedItems.has(item.id);
  const nodeState = nodeStateMap.get(item.id) ?? 'unchecked';
  const isSelected = nodeState === 'checked';
  const checkboxValue: boolean | 'indeterminate' =
    nodeState === 'checked' ? true : nodeState === 'indeterminate' ? 'indeterminate' : false;
  const hasChildren = item.children && item.children.length > 0;
  
  const filteredChildren = useMemo(() => {
    if (!item.children || !searchTerm) return item.children;
    
    const filterRecursive = (items: Property[]): Property[] => {
      return items.filter(child => {
        const matchesSearch = child.name.toLowerCase().includes(searchTerm.toLowerCase());
        const hasMatchingChildren = child.children && filterRecursive(child.children).length > 0;
        return matchesSearch || hasMatchingChildren;
      }).map(child => ({
        ...child,
        children: child.children ? filterRecursive(child.children) : undefined
      }));
    };
    
    return filterRecursive(item.children);
  }, [item.children, searchTerm]);

  // Don't render if item doesn't match search and has no matching children
  if (searchTerm) {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const hasMatchingChildren = filteredChildren && filteredChildren.length > 0;
    if (!matchesSearch && !hasMatchingChildren) return null;
  }

  const paddingLeft = level === 0 ? 'pl-4' : level === 1 ? 'pl-4' : level === 2 ? 'pl-4' : 'pl-10';
  const canExpand = hasChildren && level < 3;
  const hoverIndentation = !canExpand ? paddingLeft : 'pl-2';
  const ariaCheckedValue: boolean | 'mixed' =
    nodeState === 'checked' ? true : nodeState === 'indeterminate' ? 'mixed' : false;
  const checkboxArea = (
    <div
      className={`flex h-full min-h-10 w-11 items-center justify-center rounded-xl px-3 shrink-0 cursor-pointer hover:bg-gray-50 focus:outline-none focus:bg-[#007aff]/10 focus:ring-2 focus:ring-[#007aff] focus-visible:outline-none transition-colors ${canExpand ? 'py-3' : 'py-2'}`}
      onClick={(event) => {
        event.stopPropagation();
        onToggleSelect(item.id);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          onToggleSelect(item.id);
        }
      }}
      role="checkbox"
      tabIndex={0}
      aria-checked={ariaCheckedValue}
      aria-label={`${isSelected ? 'Deselect' : 'Select'} ${item.name}`}
      data-action="toggle-selection"
      data-node-id={item.id}
    >
      <Checkbox
        checked={checkboxValue}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none rounded-[4px] border-[#C4C4C4] bg-white shadow-[inset_0_0_0_1px_rgba(196,196,196,1)]"
      />
    </div>
  );

  const nodeCountLabel =
    item.count != null && item.count > 0 ? `, ${item.count} properties` : '';
  const treeItemLabel = `${item.name}${nodeCountLabel}`;

  return (
    <div className="w-full">
      <div
        className="relative w-full box-border flex items-stretch"
        role="treeitem"
        aria-level={level + 1}
        aria-expanded={canExpand ? isExpanded : undefined}
        aria-selected={isSelected}
        aria-label={treeItemLabel}
        data-node-id={item.id}
        data-node-type={item.type}
        data-node-name={item.name}
        data-selection-state={nodeState}
        data-expandable={canExpand ? 'true' : 'false'}
        data-expanded={canExpand ? (isExpanded ? 'true' : 'false') : undefined}
        data-level={level + 1}
      >
        {canExpand ? (
          <div
            className={`flex flex-1 items-stretch gap-3 rounded-xl focus-within:bg-gray-50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-[#007aff]/70 transition-colors ${paddingLeft} pr-3 py-2`}
          >
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left cursor-pointer hover:bg-gray-50 focus:outline-none focus-visible:outline-none transition-colors"
              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${item.name}`}
              aria-expanded={isExpanded}
              data-action="toggle-expand"
              data-node-id={item.id}
              onClick={() => onToggleExpand(item.id)}
            >
              <ChevronDown
                className={`size-4 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                color="#383838"
                strokeWidth={2}
                aria-hidden="true"
              />
              <div className={`box-border content-stretch flex gap-2 items-center justify-start overflow-visible p-3 relative rounded-xl shrink-0 ${item.type !== 'property' ? getIconBackground(item.type) : ''}`}>
                {getIcon(item.type)}
              </div>
              <div className="basis-0 flex flex-col gap-1 grow items-start justify-center min-h-px min-w-px relative shrink-0">
                <div className="text-base text-black leading-[normal] w-full">
                  {item.name}
                </div>
                {item.count != null && item.count > 0 && (
                  <div className="text-xs text-nowrap text-muted-foreground leading-[normal]">
                    {item.count} Properties
                  </div>
                )}
              </div>
            </button>
            {checkboxArea}
          </div>
        ) : (
          <div
            className={`flex-1 flex gap-3 items-center justify-start rounded-xl cursor-pointer hover:bg-gray-50 focus-within:bg-gray-50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-[#007aff]/70 transition-colors ${hoverIndentation} pr-3 py-2`}
            onClick={() => onToggleSelect(item.id)}
          >
            <div className={`box-border content-stretch flex gap-2 items-center justify-start overflow-visible p-3 relative rounded-xl shrink-0 ${item.type !== 'property' ? getIconBackground(item.type) : ''}`}>
              {getIcon(item.type)}
            </div>
            <div className="basis-0 flex flex-col gap-1 grow items-start justify-center min-h-px min-w-px relative shrink-0">
              <div className="text-base text-black leading-[normal] w-full">
                {item.name}
              </div>
              {item.count != null && item.count > 0 && (
                <div className="text-xs text-nowrap text-muted-foreground leading-[normal]">
                  {item.count} Properties
                </div>
              )}
            </div>

            {item.type === 'property' && propertyGroupMap.has(item.id) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`${item.name} belongs to multiple groups`}
                    data-action="show-group-membership"
                    data-node-id={item.id}
                    className="relative rounded-lg shrink-0 p-2 cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007aff]/60"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Info
                      className="relative shrink-0 size-4 block"
                      color="#6092EF"
                      strokeWidth={1.33}
                      aria-hidden="true"
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={4} className="max-w-[260px]">
                  <p className="font-semibold text-xs">This property exists in multiple groups within this category.</p>
                  <p className="text-xs opacity-70 mt-1">
                    Also in: {(propertyGroupMap.get(item.id) || []).filter(g => g !== parentGroupName).join(', ')}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}

            {checkboxArea}
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && filteredChildren && (
        <div
          role="group"
          aria-label={`${item.name} contents`}
          className="content-stretch flex flex-col items-start justify-start relative shrink-0 w-full"
        >
          {filteredChildren.map((child) => (
            <TreeItem
              key={child.id}
              item={child}
              level={level + 1}
              expandedItems={expandedItems}
              selectedItems={selectedItems}
              nodeStateMap={nodeStateMap}
              onToggleExpand={onToggleExpand}
              onToggleSelect={onToggleSelect}
              searchTerm={searchTerm}
              viewType={viewType}
              propertyGroupMap={propertyGroupMap}
              parentGroupName={item.name}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface PropertyFilterProps {
  defaultExpanded?: boolean;
  collapsible?: boolean;
  maxHeight?: number;
  defaultDropdownOption?: string;
  /** Controlled current dropdown option. If provided, syncs to internal state. */
  selectedDropdownOption?: string;
  onDropdownOptionChange?: (option: string) => void;
  selectedPropertyIds?: string[];
  onSelectionChange?: (selectionState: FilterSelectionState) => void;
  /**
   * Data configuration — dropdown sections, tree data resolver, search and
   * section title labels, flat-list view option values. Defaults to
   * `demoPropertyFilterData`. Pass your own `PropertyFilterDataConfig` in
   * production to supply real property / group data.
   */
  data?: PropertyFilterDataConfig;
}

export function PropertyFilter({
  defaultExpanded = true,
  collapsible = true,
  maxHeight,
  defaultDropdownOption,
  selectedDropdownOption: selectedDropdownOptionProp,
  onDropdownOptionChange,
  selectedPropertyIds,
  onSelectionChange,
  data = demoPropertyFilterData,
}: PropertyFilterProps) {
  const fallbackDefaultOption =
    data.defaultOption ?? data.dropdownSections[0]?.options[0] ?? 'Property List';
  const resolvedDefaultOption = defaultDropdownOption ?? fallbackDefaultOption;
  const initialDropdownOption = selectedDropdownOptionProp ?? resolvedDefaultOption;
  const [isExpanded, setIsExpanded] = useState(collapsible ? defaultExpanded : true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(() =>
    buildSelectedSetFromLeafIds(
      sortDataAlpha(data.getDataForOption(initialDropdownOption)),
      new Set(selectedPropertyIds ?? [])
    )
  );
  const [selectedDropdownOption, setSelectedDropdownOption] = useState(initialDropdownOption);

  useEffect(() => {
    if (selectedDropdownOptionProp === undefined) return;
    setSelectedDropdownOption((prev) =>
      prev === selectedDropdownOptionProp ? prev : selectedDropdownOptionProp
    );
  }, [selectedDropdownOptionProp]);

  const handleToggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const findItem = (items: Property[], id: string): Property | undefined => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = findItem(item.children, id);
        if (found) return found;
      }
    }
    return undefined;
  };

  const getAllDescendantIds = (item: Property): string[] => {
    const ids: string[] = [];
    if (item.children) {
      for (const child of item.children) {
        ids.push(child.id);
        ids.push(...getAllDescendantIds(child));
      }
    }
    return ids;
  };

  function commitSelectedItems(nextSelected: Set<string>) {
    const canonicalSelected = buildSelectedSetFromLeafIds(
      currentData,
      new Set(getSelectedLeafIds(currentData, nextSelected))
    );

    setSelectedItems((previous) =>
      areSetsEqual(previous, canonicalSelected) ? previous : canonicalSelected
    );
    onSelectionChange?.(
      buildSelectionStateForData(
        selectedDropdownOption,
        currentData,
        canonicalSelected
      )
    );
  }

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedItems);
    const item = findItem(currentData, id);
    const descendantIds = item ? getAllDescendantIds(item) : [];
    const allIds = [id, ...descendantIds];

    if (newSelected.has(id)) {
      allIds.forEach(i => newSelected.delete(i));
    } else {
      allIds.forEach(i => newSelected.add(i));
    }
    commitSelectedItems(newSelected);
  };

  const handleClear = () => {
    commitSelectedItems(new Set());
    setSearchTerm('');
  };

  const handleDropdownOptionSelect = (option: string) => {
    setSelectedDropdownOption(option);
    setSelectedItems(new Set());
    onDropdownOptionChange?.(option);
    onSelectionChange?.(buildSelectionStateForOption(option, [], data));
    setSearchTerm('');
    setExpandedItems(new Set());
  };

  const currentData = useMemo(() => {
    return sortDataAlpha(data.getDataForOption(selectedDropdownOption));
  }, [data, selectedDropdownOption]);

  useEffect(() => {
    if (selectedPropertyIds === undefined) return;

    const nextSelected = buildSelectedSetFromLeafIds(
      currentData,
      new Set(selectedPropertyIds)
    );

    setSelectedItems((previous) =>
      areSetsEqual(previous, nextSelected) ? previous : nextSelected
    );
  }, [currentData, selectedPropertyIds]);

  const selectionState = useMemo(
    () => buildSelectionStateForData(selectedDropdownOption, currentData, selectedItems),
    [currentData, selectedDropdownOption, selectedItems]
  );

  const propertyGroupMap = useMemo(() => {
    const idToGroups = new Map<string, string[]>();
    const collectFromGroup = (group: Property) => {
      const groupName = group.name;
      const addLeaves = (children: Property[]) => {
        for (const child of children) {
          if (child.type === 'property') {
            const existing = idToGroups.get(child.id) || [];
            if (!existing.includes(groupName)) existing.push(groupName);
            idToGroups.set(child.id, existing);
          }
          if (child.children) addLeaves(child.children);
        }
      };
      if (group.children) addLeaves(group.children);
    };

    for (const item of currentData) {
      if (item.children && item.children.length > 0) {
        const hasSubGroups = item.children.some(c => c.children && c.children.length > 0);
        if (hasSubGroups) {
          for (const subGroup of item.children) {
            if (subGroup.children && subGroup.children.length > 0) {
              collectFromGroup(subGroup);
            }
          }
        } else {
          collectFromGroup(item);
        }
      }
    }

    for (const [id, groups] of idToGroups) {
      if (groups.length < 2) idToGroups.delete(id);
    }
    return idToGroups;
  }, [currentData]);

  const nodeStateMap = useMemo(() => {
    const map = new Map<string, NodeSelectionState>();
    const visit = (node: Property): NodeSelectionState => {
      if (!node.children || node.children.length === 0) {
        const state: NodeSelectionState =
          node.type === 'property' && selectedItems.has(node.id) ? 'checked' : 'unchecked';
        map.set(node.id, state);
        return state;
      }
      let checkedCount = 0;
      let uncheckedCount = 0;
      let hasIndeterminate = false;
      for (const child of node.children) {
        const childState = visit(child);
        if (childState === 'checked') checkedCount++;
        else if (childState === 'unchecked') uncheckedCount++;
        else hasIndeterminate = true;
      }
      let state: NodeSelectionState;
      if (hasIndeterminate || (checkedCount > 0 && uncheckedCount > 0)) {
        state = 'indeterminate';
      } else if (checkedCount > 0 && uncheckedCount === 0) {
        state = 'checked';
      } else {
        state = 'unchecked';
      }
      map.set(node.id, state);
      return state;
    };
    currentData.forEach(visit);
    return map;
  }, [currentData, selectedItems]);

  const isFlatList = data.flatListOptions?.includes(selectedDropdownOption) ?? false;
  const allFlatIds = useMemo(() => isFlatList ? currentData.map(p => p.id) : [], [isFlatList, currentData]);
  const allFlatSelected = isFlatList && allFlatIds.length > 0 && allFlatIds.every(id => selectedItems.has(id));
  const someFlatSelected = isFlatList && allFlatIds.some(id => selectedItems.has(id));
  const flatSelectState: boolean | 'indeterminate' = allFlatSelected
    ? true
    : someFlatSelected
      ? 'indeterminate'
      : false;

  const treeNavRef = useRef<HTMLDivElement>(null);

  const handleTreeArrowNav = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const container = treeNavRef.current;
    if (!container) return;
    const focusables = Array.from(
      container.querySelectorAll<HTMLElement>(
        'button:not([disabled]):not([tabindex="-1"]):not([aria-hidden="true"]), [tabindex]:not([tabindex="-1"])'
      )
    );
    if (focusables.length === 0) return;
    const current = document.activeElement as HTMLElement | null;
    const idx = current ? focusables.indexOf(current) : -1;
    if (idx === -1) return;
    event.preventDefault();
    event.stopPropagation();
    const nextIdx =
      event.key === 'ArrowDown'
        ? Math.min(idx + 1, focusables.length - 1)
        : Math.max(idx - 1, 0);
    const target = focusables[nextIdx];
    if (!target) return;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'nearest' });
  };

  const handleSelectAll = () => {
    if (allFlatSelected) {
      const newSelected = new Set(selectedItems);
      allFlatIds.forEach(id => newSelected.delete(id));
      commitSelectedItems(newSelected);
    } else {
      const newSelected = new Set(selectedItems);
      allFlatIds.forEach(id => newSelected.add(id));
      commitSelectedItems(newSelected);
    }
  };

  const hasActiveFilters = selectedItems.size > 0 || searchTerm.length > 0;
  const selectedPropertyCount = selectionState.selectedPropertyCount;

  const searchPlaceholder =
    data.getSearchPlaceholder?.(selectedDropdownOption) ?? 'Search';
  const sectionTitle =
    data.getSectionTitle?.(selectedDropdownOption) ?? 'Select Properties';

  const collapsedLabel = selectedPropertyCount > 0
    ? `${selectedPropertyCount} ${selectedPropertyCount === 1 ? 'Property' : 'Properties'}`
    : 'Select Properties';

  if (collapsible && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="bg-white relative rounded-full w-full shadow-[0px_2px_6px_0px_rgba(0,0,0,0.12)] border border-[rgba(0,0,0,0.08)] flex items-center gap-3 pl-4 pr-4 py-3 cursor-pointer hover:shadow-[0px_2px_8px_0px_rgba(0,0,0,0.18)] transition-shadow"
      >
        <Building
          className="relative shrink-0 size-[18px]"
          color="#404040"
          strokeWidth={1.33}
          aria-hidden="true"
        />
        <span className="text-sm font-medium text-black leading-[normal]">
          {collapsedLabel}
        </span>
        <ChevronDown
          className="ml-auto relative shrink-0 size-4"
          color="#9CA3AF"
          strokeWidth={2}
          aria-hidden="true"
        />
      </button>
    );
  }

  return (
    <div
      role="region"
      aria-labelledby="property-filter-heading"
      data-component="property-filter"
      data-view={selectedDropdownOption}
      data-selected-count={selectionState.selectedPropertyCount}
      className="bg-white relative rounded-2xl w-full max-h-[600px] overflow-hidden shadow-[0px_6px_8px_0px_rgba(0,0,0,0.25)] border-[0.5px] border-[rgba(0,0,0,0.1)] flex flex-col"
      style={maxHeight ? { height: maxHeight, maxHeight } : undefined}
    >
      
      {/* Collapsible header — click to minimize */}
      {collapsible && (
        <button
          onClick={() => setIsExpanded(false)}
          className="w-full flex items-center gap-3 pl-4 pr-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors rounded-t-2xl border-b border-[rgba(0,0,0,0.06)]"
        >
          <Building
            className="relative shrink-0 size-[18px]"
            color="#404040"
            strokeWidth={1.33}
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-black leading-[normal]">
            {collapsedLabel}
          </span>
          <ChevronUp
            className="ml-auto relative shrink-0 size-4"
            color="#9CA3AF"
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>
      )}

      {/* Fixed Header Section */}
      <div className="relative shrink-0 w-full">
        <div className="relative size-full">
          <div className="box-border content-stretch flex flex-col gap-2 items-start justify-start pb-4 pt-2 px-3 relative w-full">
            
            {/* Menu Top */}
            <div className="box-border content-stretch flex items-center justify-start overflow-clip px-0 py-2 relative shrink-0 w-full">
              <h2
                id="property-filter-heading"
                className="basis-0 grow min-w-px relative shrink-0 text-base font-semibold text-black leading-[normal] m-0"
              >
                Filter Property Groups
              </h2>
              <button
                type="button"
                onClick={handleClear}
                disabled={!hasActiveFilters}
                aria-label="Clear all selected properties and search"
                data-action="clear-filters"
                data-active={hasActiveFilters ? 'true' : 'false'}
                className={`relative shrink-0 text-xs text-nowrap rounded px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007aff]/40 ${
                  hasActiveFilters ? 'text-[#007aff] cursor-pointer' : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                Clear
              </button>
            </div>

            {/* Search Section */}
            <div className="content-stretch flex flex-col gap-4 items-start justify-start relative shrink-0 w-full">
              
              {/* Search Input */}
              <div className="flex items-center relative rounded-lg shrink-0 w-full">
                <div className="bg-gray-50 w-full h-10 relative rounded-lg border-[0.5px] border-[rgba(0,0,0,0.1)] transition-shadow focus-within:border-[#007aff] focus-within:ring-2 focus-within:ring-[#007aff]/30">
                  <div className="flex items-center gap-2 h-full px-3">
                    <Search
                      className="relative shrink-0 size-4"
                      color="#404040"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={searchPlaceholder}
                      aria-label={searchPlaceholder}
                      data-field="filter-search"
                      className="flex-1 min-w-0 bg-transparent outline-none text-[#656e7c] text-sm placeholder:text-[#656e7c]"
                    />
                  </div>
                </div>
              </div>

              {/* Group Selector — native select for reliable value switching */}
              <select
                value={selectedDropdownOption}
                onChange={(e) => handleDropdownOptionSelect(e.target.value)}
                aria-label="Property group"
                data-field="filter-group"
                className="w-full h-10 rounded-lg border-[0.5px] border-[rgba(0,0,0,0.1)] bg-white px-3 text-sm font-medium text-black shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] appearance-none cursor-pointer transition-shadow focus:outline-none focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/30"
                style={{
                  backgroundImage:
                    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 10px center',
                  paddingRight: '32px',
                }}
              >
                {data.dropdownSections.map((section) => (
                  <optgroup key={section.label} label={section.label}>
                    {section.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>

            </div>
          </div>
        </div>
      </div>

      {/* Fixed Section Title */}
      <div className="relative shrink-0 w-full">
        <div className="flex items-center px-4 py-2 w-full">
          <h3
            id="property-filter-section-heading"
            className="text-xs text-muted-foreground m-0"
          >
            {sectionTitle}
          </h3>
        </div>
      </div>

      {/* Scrollable Property Tree Container */}
      <ScrollArea className="flex-1 min-h-0">
        <div ref={treeNavRef} onKeyDown={handleTreeArrowNav}>
          {/* Select All row for flat lists */}
          {isFlatList && (
            <button
              type="button"
              role="checkbox"
              aria-checked={flatSelectState === 'indeterminate' ? 'mixed' : flatSelectState}
              aria-label={`Select all ${currentData.length} properties`}
              data-action="select-all"
              data-selection-state={
                flatSelectState === true
                  ? 'checked'
                  : flatSelectState === 'indeterminate'
                    ? 'indeterminate'
                    : 'unchecked'
              }
              className="w-full text-left box-border flex items-center gap-2 pl-4 pr-3 py-2 cursor-pointer hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#007aff]/50 border-b border-[rgba(0,0,0,0.06)]"
              onClick={handleSelectAll}
            >
              <div className="basis-0 grow text-xs font-medium text-black">
                Select All ({currentData.length})
              </div>
              <div
                className="flex h-full w-11 items-center justify-center rounded-xl px-3 py-2 shrink-0"
                aria-hidden="true"
              >
                <Checkbox
                  checked={flatSelectState}
                  tabIndex={-1}
                  aria-hidden="true"
                  className="pointer-events-none rounded-[4px] border-[#C4C4C4] bg-white shadow-[inset_0_0_0_1px_rgba(196,196,196,1)]"
                />
              </div>
            </button>
          )}
          <div
            role="tree"
            aria-labelledby="property-filter-section-heading"
            aria-multiselectable="true"
            data-tree="properties"
            data-view={selectedDropdownOption}
            data-total-count={currentData.length}
            className="content-stretch flex flex-col items-start justify-start relative shrink-0 w-full"
          >
            {currentData.map((item) => (
              <TreeItem
                key={item.id}
                item={item}
                level={0}
                expandedItems={expandedItems}
                selectedItems={selectedItems}
                nodeStateMap={nodeStateMap}
                onToggleExpand={handleToggleExpand}
                onToggleSelect={handleToggleSelect}
                searchTerm={searchTerm}
                viewType={selectedDropdownOption}
                propertyGroupMap={propertyGroupMap}
              />
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}