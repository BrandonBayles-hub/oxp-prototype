// Local fork (oxp-prototype-product): only relative imports were rewritten
// to `@/lib/*` to match this app's path alias. No other behavioral
// changes — keep this file in lockstep with the sandbox.
// Original: ../../prototype-sandbox/src/components/composite/PropertyFilterChips.tsx

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FilterChip } from "./FilterChip";
import type {
  SelectedProperty,
  SelectionSummaryItem,
} from "./PropertyFilter";

export interface PropertyFilterChipsProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Summary items from `FilterSelectionState.summaryItems` — groups collapse when fully selected. */
  items: SelectionSummaryItem[];
  /** Called when a property-type chip's × is clicked, or when a group chip is removed in full. */
  onRemove?: (item: SelectionSummaryItem) => void;
  /**
   * Resolver that returns the leaf `{ id, name }` entries for a group summary item.
   * When provided, group chips render as a "select menu" chip: clicking opens a
   * popover with checkboxes for each leaf, and unchecking one fires `onGroupLeafChange`.
   */
  getGroupLeaves?: (item: SelectionSummaryItem) => SelectedProperty[];
  /**
   * Called when the user toggles leaves inside a group chip's popover. `activeLeafIds`
   * are the leaves that remain selected after the interaction. The consumer is
   * expected to reconcile the diff with its own selection state.
   */
  onGroupLeafChange?: (
    item: SelectionSummaryItem,
    activeLeafIds: string[],
  ) => void;
  /** Called when the consumer wants to clear every chip at once. If provided, renders a "Clear all" action. */
  onClearAll?: () => void;
  /** Override overflow collapsing. Default: show all. */
  maxVisible?: number;
  /** Visible when no chips are rendered — useful for filter bar placeholders. */
  emptyState?: React.ReactNode;
}

export function PropertyFilterChips({
  items,
  onRemove,
  getGroupLeaves,
  onGroupLeafChange,
  onClearAll,
  maxVisible,
  emptyState,
  className,
  ...props
}: PropertyFilterChipsProps) {
  if (items.length === 0) {
    return emptyState ? (
      <div
        className={cn("flex flex-wrap items-center gap-2", className)}
        data-component="property-filter-chips"
        data-empty="true"
        {...props}
      >
        {emptyState}
      </div>
    ) : null;
  }

  const visible =
    typeof maxVisible === "number" && maxVisible >= 0
      ? items.slice(0, maxVisible)
      : items;
  const overflowCount =
    typeof maxVisible === "number" ? items.length - visible.length : 0;

  return (
    <div
      role="list"
      aria-label="Selected property filters"
      className={cn("flex flex-wrap items-center gap-2", className)}
      data-component="property-filter-chips"
      data-count={items.length}
      {...props}
    >
      {visible.map((item) => {
        const isGroup = item.type !== "property";

        if (isGroup && getGroupLeaves) {
          const leaves = getGroupLeaves(item);
          const nameToId = new Map<string, string>();
          const idToName = new Map<string, string>();
          for (const leaf of leaves) {
            nameToId.set(leaf.name, leaf.id);
            idToName.set(leaf.id, leaf.name);
          }
          const selectedLeafNames = item.leafIds
            .map((id) => idToName.get(id))
            .filter((name): name is string => Boolean(name));

          return (
            <div role="listitem" key={item.id}>
              <FilterChip
                filterName={item.name}
                selectedCount={item.propertyCount}
                multiSelectOptions={[
                  {
                    label: item.name,
                    items: leaves.map((leaf) => leaf.name),
                  },
                ]}
                multiSelectValues={selectedLeafNames}
                multiSelectPlaceholder={`${item.name} properties`}
                multiSelectSearchable={leaves.length > 8}
                onMultiSelectChange={(values) => {
                  if (!onGroupLeafChange) return;
                  const activeLeafIds = values
                    .map((name) => nameToId.get(name))
                    .filter((id): id is string => Boolean(id));
                  onGroupLeafChange(item, activeLeafIds);
                }}
                onRemove={onRemove ? () => onRemove(item) : undefined}
                data-chip-node-id={item.id}
                data-chip-node-type={item.type}
                data-chip-property-count={item.propertyCount}
                data-chip-variant="group"
              />
            </div>
          );
        }

        return (
          <div role="listitem" key={item.id}>
            <FilterChip
              filterName={item.name}
              onRemove={onRemove ? () => onRemove(item) : undefined}
              data-chip-node-id={item.id}
              data-chip-node-type={item.type}
              data-chip-property-count={item.propertyCount}
              data-chip-variant="property"
            >
              <span className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-xs">
                {item.name}
              </span>
            </FilterChip>
          </div>
        );
      })}

      {overflowCount > 0 && (
        <div role="listitem">
          <FilterChip
            filterName={`${overflowCount} more filters`}
            data-chip-overflow="true"
          >
            <span className="inline-flex items-center whitespace-nowrap font-medium text-xs">
              +{overflowCount} more
            </span>
          </FilterChip>
        </div>
      )}

      {onClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-[#007aff] hover:underline rounded px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007aff]/40"
          data-action="clear-all-chips"
          aria-label="Clear all selected properties"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
