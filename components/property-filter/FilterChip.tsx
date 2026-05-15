// Local fork (oxp-prototype-product): only relative imports were rewritten
// to `@/components/*` / `@/lib/*` to match this app's path alias. No other
// behavioral changes — keep this file in lockstep with the sandbox.
// Original: ../../prototype-sandbox/src/components/composite/FilterChip.tsx

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X, ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverAnchor,
} from "@/components/ui/popover";
import {
  MultiSelect,
  type MultiSelectGroup,
} from "./MultiSelect";

export interface FilterChipProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode; // Primary way to define content
  filterName?: string; // Optional: used for aria-label and fallback
  selectedCount?: number;
  onRemove?: () => void; // Make optional
  active?: boolean; // Add active state for toggling
  onClick?: () => void; // Add onClick handler for toggling
  // Props for multi-select functionality
  multiSelectOptions?: MultiSelectGroup[];
  multiSelectValues?: string[];
  onMultiSelectChange?: (values: string[]) => void;
  multiSelectPlaceholder?: string;
  multiSelectSearchable?: boolean;
  onMultiSelectAddOption?: (
    option: string,
    groupLabel?: string,
  ) => void;
}

const FilterChip = React.forwardRef<
  HTMLDivElement,
  FilterChipProps
>(
  (
    {
      className,
      children, // Destructure children
      filterName, // Still destructure optional filterName
      selectedCount,
      onRemove, // Destructure optional onRemove
      active = false, // Add active state with default false
      onClick, // Add onClick handler
      multiSelectOptions = [],
      multiSelectValues = [],
      onMultiSelectChange,
      multiSelectPlaceholder = "Select items...",
      multiSelectSearchable = true,
      onMultiSelectAddOption,
      ...props
    },
    ref,
  ) => {
    const isMulti =
      typeof selectedCount === "number" && selectedCount >= 0;
    const showCount =
      typeof selectedCount === "number" && selectedCount > 0;

    // Determine if this is a toggle chip (has both active state and click handler)
    const isToggleChip =
      active !== undefined && onClick !== undefined;

    // Only show remove button if it's provided AND this is not a toggle chip
    const showRemoveButton = onRemove && !isToggleChip;

    // Determine label for accessibility and potential fallback
    const accessibilityLabel =
      filterName || (isMulti ? "Items" : "Filter");

    // Determine the content to render: prioritize children
    const chipContent = children ?? (
      // Fallback using filterName or default
      <span className="inline-flex items-center gap-2">
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <span className="font-medium text-xs">
            {accessibilityLabel}
            {showCount ? ":" : ""}
          </span>
          {showCount && (
            <span className="font-normal text-xs whitespace-nowrap">
              {selectedCount} Selected
            </span>
          )}
        </span>
        {isMulti && (
          <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
        )}
      </span>
    );

    return (
      // Wrap the entire component logic within the Popover context if it's multi-select
      // For non-multi, we render just the div.
      isMulti ? (
        <Popover>
          {/* Anchor is the outer div */}
          <PopoverAnchor asChild>
            <div
              ref={ref} // Ref is now on the anchor div
              className={cn(
                "inline-flex items-center h-8 rounded-md border border-transparent bg-blue-100 px-2.5 text-xs text-blue-800 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:bg-blue-800 dark:text-blue-100",
                showRemoveButton && "pr-0", // Only remove right padding if there's a remove button
                // Toggle chip inactive state: gray background
                isToggleChip &&
                  !active &&
                  "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100",
                // Toggle chip active state: default blue (no additional classes needed, uses base styles)
                isToggleChip && "cursor-pointer", // Add cursor-pointer for toggle chips
                className,
              )}
              {...props}
            >
              {/* Trigger is the button inside */}
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1 focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1 rounded-sm mr-1 text-xs",
                    // Toggle chip inactive state: gray text
                    isToggleChip &&
                      !active &&
                      "[&_*]:text-gray-800 [&_svg]:text-gray-800 dark:[&_*]:text-gray-100",
                  )}
                  aria-label={`Open ${accessibilityLabel} filter options`}
                >
                  {chipContent}
                </button>
              </PopoverTrigger>

              {/* Conditionally render Remove Button INSIDE the anchor div */}
              {showRemoveButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 p-0 text-blue-700 hover:bg-blue-200 hover:text-blue-900 dark:text-blue-300 dark:hover:bg-blue-800 dark:hover:text-white rounded-r-md rounded-l-none",
                    // Toggle chip inactive state: gray remove button
                    isToggleChip &&
                      !active &&
                      "text-gray-700 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-600",
                  )}
                  onClick={onRemove}
                  aria-label={`Remove ${accessibilityLabel} filter`}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </PopoverAnchor>

          {/* Content with styled dropdown */}
          <PopoverContent
            className="p-0 w-[260px] shadow-md border" // Fixed width to match screenshot
            align="start"
            sideOffset={5}
          >
            <MultiSelect
              groups={multiSelectOptions}
              value={multiSelectValues}
              onValueChange={onMultiSelectChange}
              placeholder={multiSelectPlaceholder}
              searchable={multiSelectSearchable}
              onAddOption={onMultiSelectAddOption}
              contentOnly={true}
            />
          </PopoverContent>
        </Popover>
      ) : (
        // Non-multi-select rendering remains the same
        <div
          ref={ref}
          className={cn(
            "inline-flex items-center h-8 rounded-md border border-transparent bg-blue-100 px-2.5 text-xs text-blue-800 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:bg-blue-800 dark:text-blue-100",
            showRemoveButton && "pr-0", // Only remove right padding if there's a remove button
            // Toggle chip inactive state: gray background
            isToggleChip &&
              !active &&
              "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100",
            // Toggle chip active state: default blue (no additional classes needed, uses base styles)
            isToggleChip && "cursor-pointer", // Add cursor-pointer for toggle chips
            className,
          )}
          onClick={onClick}
          {...props}
        >
          <span
            className={cn(
              "mr-1 flex items-center gap-1 text-xs",
              // Toggle chip inactive state: gray text
              isToggleChip &&
                !active &&
                "text-gray-800 [&_*]:text-gray-800 [&_svg]:text-gray-800 dark:text-gray-100",
            )}
          >
            {chipContent}
          </span>
          {showRemoveButton && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 p-0 text-blue-700 hover:bg-blue-200 hover:text-blue-900 dark:text-blue-300 dark:hover:bg-blue-800 dark:hover:text-white rounded-r-md rounded-l-none",
                // Toggle chip inactive state: gray remove button
                isToggleChip &&
                  !active &&
                  "text-gray-700 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-600",
              )}
              onClick={onRemove}
              aria-label={`Remove ${accessibilityLabel} filter`}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )
    );
  },
);
FilterChip.displayName = "FilterChip";

/**
 * FilterChip component used for filtering UI elements
 *
 * Basic usage:
 * <FilterChip>Basic Chip</FilterChip>
 *
 * With remove button:
 * <FilterChip onRemove={() => console.log('removed')}>Removable Chip</FilterChip>
 *
 * Toggle chip (inactive = gray, active = blue like default chip):
 * <FilterChip active={isActive} onClick={() => setIsActive(!isActive)}>Toggle Chip</FilterChip>
 *
 * Note: When used as a toggle (with both active and onClick props):
 * - Inactive state: bg-gray-100, text-gray-800 (visually distinct from default chips)
 * - Active state: bg-blue-100, text-blue-800 (same as default chip appearance)
 * - The remove button will not be shown even if onRemove is provided
 *
 * With multi-select functionality:
 * <FilterChip
 *   filterName="Status"
 *   selectedCount={2}
 *   multiSelectOptions={[{ label: "Status", items: ["Active", "Inactive"] }]}
 *   multiSelectValues={["Active"]}
 *   onMultiSelectChange={(values) => setValues(values)}
 * />
 */
export { FilterChip };
