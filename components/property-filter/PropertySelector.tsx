// Local fork (oxp-prototype-product): relative imports rewritten to `@/`
// aliases AND a small controlled-mode extension was added (the optional
// `selectedPropertyIds` + `onSelectedIdsChange` prop pair) so the voice
// AddPropertyOverride dialog can pre-select a property when the URL
// `?property=…` query param drives editing an existing override. When
// `selectedPropertyIds` is provided, the prop wins on every change and
// the component fires `onSelectedIdsChange` on selection updates.
// Original: ../../prototype-sandbox/src/components/composite/PropertySelector.tsx

"use client";

import * as React from "react";
import { Building, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  PropertyFilter,
  buildSelectionStateForOption,
  getPropertyOptionsForOption,
  type FilterSelectionState,
  type PropertyFilterDataConfig,
  type SelectedProperty,
  type SelectionSummaryItem,
} from "./PropertyFilter";
import { PropertyFilterChips } from "./PropertyFilterChips";

export type {
  SelectedProperty,
  FilterSelectionState,
  SelectionSummaryItem,
  PropertyFilterDataConfig,
};

interface PropertySelectorProps {
  /** Flat list of selected leaf properties (id + name). Fires on every change. */
  onSelectionChange?: (selectedProperties: SelectedProperty[]) => void;
  /** Full filter selection state — dropdown option, summary items, counts. */
  onFilterChange?: (state: FilterSelectionState) => void;
  /** Which dropdown option to start on (e.g. "Property List", "States"). */
  defaultDropdownOption?: string;
  /** Trigger button width. Defaults to 300px to match prior behavior. */
  triggerWidthClassName?: string;
  /** Fixed height of the dropdown panel in px. */
  panelHeight?: number;
  /** Render a row of removable filter chips alongside the trigger. Default: false. */
  showChips?: boolean;
  /** Where chips render relative to the trigger. Default: "below". */
  chipsPosition?: "below" | "right";
  /** Extra classes applied to the root wrapper when chips are shown. */
  containerClassName?: string;
  /** Extra classes applied to the chips row. */
  chipsClassName?: string;
  /** Max chips to show before collapsing the rest into "+N more". */
  chipsMaxVisible?: number;
  /** Show a "Clear all" action next to the chips when there are any selections. */
  chipsClearAll?: boolean;
  /**
   * Data configuration for the underlying `PropertyFilter` — dropdown
   * sections, tree data resolver, flat-list views, labels. Defaults to the
   * built-in demo data; pass your own `PropertyFilterDataConfig` in
   * production to wire real properties and groups.
   */
  data?: PropertyFilterDataConfig;
  /**
   * Fork delta (oxp-prototype-product): optional controlled selection.
   * When provided, the component syncs its internal selection state to
   * this list on every render and fires `onSelectedIdsChange` whenever
   * the user changes the selection.
   */
  selectedPropertyIds?: string[];
  /** Fork delta: change handler for controlled selection. */
  onSelectedIdsChange?: (ids: string[]) => void;
}

export function PropertySelector({
  onSelectionChange,
  onFilterChange,
  defaultDropdownOption,
  triggerWidthClassName = "w-[300px]",
  panelHeight = 560,
  showChips = false,
  chipsPosition = "below",
  containerClassName,
  chipsClassName,
  chipsMaxVisible,
  chipsClearAll = false,
  data,
  selectedPropertyIds,
  onSelectedIdsChange,
}: PropertySelectorProps) {
  const resolvedDefaultOption =
    defaultDropdownOption ??
    data?.defaultOption ??
    data?.dropdownSections[0]?.options[0] ??
    "Property List";
  const [selectedIds, setSelectedIds] = React.useState<string[]>(
    selectedPropertyIds ?? [],
  );
  const [selectedProperties, setSelectedProperties] = React.useState<
    SelectedProperty[]
  >([]);
  const [summaryItems, setSummaryItems] = React.useState<
    SelectionSummaryItem[]
  >([]);
  const [dropdownOption, setDropdownOptionState] = React.useState(
    resolvedDefaultOption,
  );
  // Remembers groups that were fully selected at least once in the current
  // view, with the original full leaf set. Lets a partially-deselected group
  // keep rendering as a single group chip instead of fragmenting into individual
  // property chips when one leaf is removed from its popover.
  const [persistentGroups, setPersistentGroups] = React.useState<
    Map<string, SelectionSummaryItem>
  >(() => new Map());

  const applyState = React.useCallback(
    (state: FilterSelectionState) => {
      setSelectedIds(state.selectedPropertyIds);
      setSelectedProperties(state.selectedProperties);
      setSummaryItems(state.summaryItems);
      onSelectionChange?.(state.selectedProperties);
      onFilterChange?.(state);
      // Fork delta (oxp-prototype-product): mirror the new ids out to the
      // controlled-mode handler so consumers can drive selection externally.
      onSelectedIdsChange?.(state.selectedPropertyIds);
    },
    [onSelectionChange, onFilterChange, onSelectedIdsChange],
  );

  // Fork delta (oxp-prototype-product): when the parent passes a controlled
  // `selectedPropertyIds` list, sync internal selection state to match it.
  // Recomputes selectedProperties / summaryItems through the same
  // `buildSelectionStateForOption` that `PropertyFilter` uses, so chips stay
  // accurate.
  React.useEffect(() => {
    if (selectedPropertyIds === undefined) return;
    const incoming = selectedPropertyIds;
    setSelectedIds((prev) => {
      if (
        prev.length === incoming.length &&
        prev.every((id, idx) => id === incoming[idx])
      ) {
        return prev;
      }
      return incoming;
    });
    const state = buildSelectionStateForOption(
      dropdownOption,
      incoming,
      data,
    );
    setSelectedProperties(state.selectedProperties);
    setSummaryItems(state.summaryItems);
  }, [selectedPropertyIds, dropdownOption, data]);

  // Wrap setDropdownOption so changing views clears persistent groups — they
  // only make sense in the context of the view that spawned them.
  const setDropdownOption = React.useCallback((option: string) => {
    setDropdownOptionState(option);
    setPersistentGroups(new Map());
  }, []);

  // Keep persistentGroups in sync with current selection state:
  //  1. Capture any newly-fully-selected group so it "pins" as a chip
  //  2. Drop entries whose leaves have all been deselected
  React.useEffect(() => {
    setPersistentGroups((prev) => {
      const next = new Map(prev);
      let changed = false;

      for (const item of summaryItems) {
        if (item.type !== "property" && !next.has(item.id)) {
          next.set(item.id, item);
          changed = true;
        }
      }

      const selectedIdSet = new Set(selectedIds);
      for (const [id, item] of Array.from(next.entries())) {
        const stillSelected = item.leafIds.some((lid) =>
          selectedIdSet.has(lid),
        );
        if (!stillSelected) {
          next.delete(id);
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [summaryItems, selectedIds]);

  // Merge persistent groups with the tree's current summaryItems. A persistent
  // group wins over the individual property entries that would otherwise
  // appear for its still-selected leaves.
  const displayItems = React.useMemo<SelectionSummaryItem[]>(() => {
    if (persistentGroups.size === 0) return summaryItems;
    const result: SelectionSummaryItem[] = [];
    const selectedIdSet = new Set(selectedIds);
    const coveredByGroup = new Set<string>();

    for (const [, original] of persistentGroups) {
      const stillSelected = original.leafIds.filter((id) =>
        selectedIdSet.has(id),
      );
      if (stillSelected.length === 0) continue;
      result.push({
        ...original,
        leafIds: stillSelected,
        propertyCount: stillSelected.length,
      });
      stillSelected.forEach((id) => coveredByGroup.add(id));
    }

    for (const item of summaryItems) {
      if (persistentGroups.has(item.id)) continue;
      if (item.type === "property" && coveredByGroup.has(item.id)) continue;
      result.push(item);
    }

    return result;
  }, [summaryItems, persistentGroups, selectedIds]);

  const handleRemoveSummaryItem = React.useCallback(
    (item: SelectionSummaryItem) => {
      // Use the original (full) leaf set when dropping a persistent group so
      // removing the chip wipes every leaf the group ever owned, even if
      // some have already been deselected individually.
      const persistent = persistentGroups.get(item.id);
      const leavesToRemove = persistent ? persistent.leafIds : item.leafIds;
      const leafSet = new Set(leavesToRemove);
      const nextIds = selectedIds.filter((id) => !leafSet.has(id));
      const nextState = buildSelectionStateForOption(
        dropdownOption,
        nextIds,
        data,
      );
      applyState(nextState);
      if (persistent) {
        setPersistentGroups((prev) => {
          if (!prev.has(item.id)) return prev;
          const next = new Map(prev);
          next.delete(item.id);
          return next;
        });
      }
    },
    [selectedIds, dropdownOption, applyState, persistentGroups, data],
  );

  const handleClearAll = React.useCallback(() => {
    const nextState = buildSelectionStateForOption(dropdownOption, [], data);
    applyState(nextState);
    setPersistentGroups(new Map());
  }, [dropdownOption, applyState, data]);

  const propertyOptionsForView = React.useMemo(
    () => getPropertyOptionsForOption(dropdownOption, data),
    [dropdownOption, data],
  );

  const getGroupLeaves = React.useCallback(
    (item: SelectionSummaryItem): SelectedProperty[] => {
      // For a persistent group, expose the full original leaf set so the chip
      // popover shows every leaf (including unchecked ones) for re-selection.
      const persistent = persistentGroups.get(item.id);
      const leafIds = persistent ? persistent.leafIds : item.leafIds;
      const leafIdSet = new Set(leafIds);
      return propertyOptionsForView.filter((leaf) => leafIdSet.has(leaf.id));
    },
    [propertyOptionsForView, persistentGroups],
  );

  const handleGroupLeafChange = React.useCallback(
    (item: SelectionSummaryItem, activeLeafIds: string[]) => {
      // Resolve against the original leaf set so re-checking a previously
      // removed leaf re-adds it instead of being filtered out.
      const persistent = persistentGroups.get(item.id);
      const originalLeafIds = persistent ? persistent.leafIds : item.leafIds;
      const originalSet = new Set(originalLeafIds);
      // Strip every leaf belonging to this group, then re-add the active set.
      const withoutGroup = selectedIds.filter((id) => !originalSet.has(id));
      const nextIds = [...withoutGroup, ...activeLeafIds];
      const nextState = buildSelectionStateForOption(
        dropdownOption,
        nextIds,
        data,
      );
      applyState(nextState);
    },
    [selectedIds, dropdownOption, applyState, persistentGroups, data],
  );

  const triggerText =
    selectedProperties.length === 0
      ? "Select Properties"
      : selectedProperties.length === 1
        ? selectedProperties[0].name
        : `${selectedProperties.length} properties selected`;

  const triggerAriaLabel =
    selectedProperties.length === 0
      ? "Select properties. No properties selected."
      : `Select properties. ${selectedProperties.length} of ${selectedProperties.length === 1 ? selectedProperties[0].name : "multiple properties"} currently selected.`;

  const popover = (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label={triggerAriaLabel}
          data-component="property-selector-trigger"
          data-selected-count={selectedProperties.length}
          className={`${triggerWidthClassName} !justify-between`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Building className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{triggerText}</span>
          </div>
          <ChevronDown
            className="h-4 w-4 opacity-50 ml-2 flex-shrink-0"
            aria-hidden="true"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[440px] p-0 border-0 shadow-none bg-transparent"
        align="start"
        sideOffset={8}
        aria-labelledby="property-filter-heading"
      >
        <PropertyFilter
          collapsible={false}
          maxHeight={panelHeight}
          data={data}
          defaultDropdownOption={resolvedDefaultOption}
          selectedDropdownOption={dropdownOption}
          onDropdownOptionChange={setDropdownOption}
          selectedPropertyIds={selectedIds}
          onSelectionChange={applyState}
        />
      </PopoverContent>
    </Popover>
  );

  if (!showChips) {
    return popover;
  }

  const chips = (
    <PropertyFilterChips
      items={displayItems}
      onRemove={handleRemoveSummaryItem}
      getGroupLeaves={getGroupLeaves}
      onGroupLeafChange={handleGroupLeafChange}
      onClearAll={chipsClearAll ? handleClearAll : undefined}
      maxVisible={chipsMaxVisible}
      className={chipsClassName}
    />
  );

  const layoutClass =
    chipsPosition === "right"
      ? "flex flex-wrap items-center gap-3"
      : "flex flex-col items-start gap-3";

  return (
    <div
      className={`${layoutClass}${containerClassName ? ` ${containerClassName}` : ""}`}
      data-component="property-selector"
      data-chips-position={chipsPosition}
    >
      {popover}
      {chips}
    </div>
  );
}
