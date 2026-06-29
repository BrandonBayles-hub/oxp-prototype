"use client";

import * as React from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Version Two filter-pill trigger — the rounded-full pill button that opens a
 * filter popover (property selector, etc.). This is the canonical affordance
 * shared with `MultiCheckList` and `SingleSelectPill` so every filter control
 * reads as the same control (v2-redesign skill / CLAUDE.md filter-pill rule).
 *
 * Drop it inside a `<PopoverTrigger asChild>` — it forwards its ref and props.
 *
 * Selected state (per the skill): the filter NAME stays visible (pass
 * `selectedLabel` for a single inline selection), a `bg-primary` count badge
 * appears once >1 is selected, and the pill tints its border `border-primary/40`.
 * Never relabel the pill to "N selected"; never use a filled selected state
 * (that's the segmented/toggle family — see `V2_SEGMENTED_ON`).
 *
 * Canonical reference: the property pill in `app/escalations/escalations-v2.tsx`.
 */
export const V2FilterPill = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    /** Resting label, e.g. "Property". */
    label: string;
    /** Single-selection inline label shown in place of `label` when set. */
    selectedLabel?: string;
    /** Optional leading icon (e.g. `Building`). */
    icon?: LucideIcon;
    /** Whether any value is selected (drives the `border-primary/40` tint). */
    active?: boolean;
    /** Count badge shown only when > 1. */
    count?: number;
  }
>(function V2FilterPill(
  { label, selectedLabel, icon: Icon, active = false, count, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cn(
        "flex h-7 items-center gap-1.5 rounded-full border border-input bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "border-primary/40",
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      <span className="max-w-[10rem] truncate">{selectedLabel ?? label}</span>
      {typeof count === "number" && count > 1 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1.5 text-xxs font-semibold leading-none text-primary-foreground">
          {count}
        </span>
      )}
      <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
    </button>
  );
});
