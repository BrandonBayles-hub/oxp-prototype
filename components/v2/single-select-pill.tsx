"use client";

import { useState } from "react";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Version Two single-select filter pill — the single-select sibling of
 * `MultiCheckList`. Matches the `V2FilterPill` / property-pill affordance
 * (rounded-full, hover/focus states, name-stays-visible selected treatment with
 * a `border-primary/40` tint) but keeps single-select semantics: a leading check
 * mark on the selected row only (CLAUDE.md single-select menu rule), closing the
 * popover on choose. Use it for Approval / Action / Date style filters.
 *
 * Canonical reference: the SOPs & Knowledge toolbars in
 * `app/trainings-sop/page.tsx`.
 */
export function SingleSelectPill({
  label,
  value,
  options,
  onChange,
  defaultValue = "All",
}: {
  label: string;
  value: string;
  /**
   * Each option may carry an optional leading `icon` (e.g. the row's type icon).
   * When any option in the list supplies one, the menu reserves an aligned icon
   * column (options without an icon get a matching spacer); menus with no icons
   * are unchanged.
   */
  options: { value: string; label: string; icon?: LucideIcon }[];
  onChange: (value: string) => void;
  /** Value treated as "no filter" — keeps the pill in its resting (untinted) state. */
  defaultValue?: string;
}) {
  const [open, setOpen] = useState(false);
  const isDefault = value === defaultValue;
  const selectedLabel = options.find((o) => o.value === value)?.label;
  const triggerLabel = !isDefault && selectedLabel ? selectedLabel : label;
  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "flex h-7 items-center gap-1.5 rounded-full border border-input bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !isDefault && "border-primary/40",
          )}
        >
          <span className="max-w-[10rem] truncate">{triggerLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="z-[200] w-52 p-1" align="start">
        <div className="max-h-60 overflow-y-auto" role="listbox" aria-label={label}>
          {(() => {
            const hasIcons = options.some((o) => o.icon);
            return options.map((o) => {
              const isSelected = o.value === value;
              const Icon = o.icon;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-muted",
                    isSelected && "font-medium",
                  )}
                >
                  <Check className={cn("h-3.5 w-3.5 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                  {hasIcons &&
                    (Icon ? (
                      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <span className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    ))}
                  {o.label}
                </button>
              );
            });
          })()}
        </div>
      </PopoverContent>
    </Popover>
  );
}
