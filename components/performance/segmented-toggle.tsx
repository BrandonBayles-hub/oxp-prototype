"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Segmented control for exclusive selection.
 *
 * Follows the platform's toggle canon (entrata-3.0 `ToggleButtonGroup`): a
 * quiet recessed well holds the options, and the selected segment is an
 * elevated white chip — never a primary/black/coloured button. Selection is a
 * *state*, not an action, and the near-black treatment these controls used to
 * carry gave a simple view filter the visual weight of a page's primary action.
 *
 * The well is pinned to h-9 so it lines up with the Period and Properties
 * controls by construction rather than by padding arithmetic.
 *
 * Requires ≥2 options — a one-option group is a dead control that implies
 * alternatives which do not exist.
 */
export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

export function SegmentedToggle<T extends string>({
  value,
  onChange,
  options,
  "aria-label": ariaLabel,
  className,
}: {
  value: T;
  onChange: (next: T) => void;
  options: readonly SegmentedOption<T>[];
  "aria-label": string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-input bg-muted px-1",
        className,
      )}
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={selected}
            className={cn(
              "inline-flex h-7 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-xs font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              selected
                ? "bg-card text-foreground shadow-sm"
                // foreground/70, not muted-foreground: on the muted well the
                // standard muted text measures 4.35:1, just under AA.
                : "bg-transparent text-foreground/70 hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
