"use client";

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { V2_SEGMENTED_ON } from "./table";

export type V2SegmentedOption<T extends string> = {
  value: T;
  icon: LucideIcon;
  /** Tooltip + a11y label, e.g. "Tree view". */
  label: string;
};

/**
 * Version Two segmented (dual-view) toggle — the icon view-switcher used in the
 * Workforce toolbar (tree vs. table). Use this for view MODES that show the same
 * data differently; it is NOT for sibling surfaces (those belong in the
 * secondary-nav rail — see the v2-redesign skill).
 *
 * This is the toggle/segmented family: the active button takes the light-blue
 * `V2_SEGMENTED_ON` fill, NOT the filter-pill border tint.
 *
 * Canonical reference: `app/workforce/workforce-v2.tsx`.
 */
export function V2SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: V2SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("inline-flex h-9 shrink-0 rounded-md border border-input", className)}>
        {options.map((opt, i) => {
          const Icon = opt.icon;
          const active = value === opt.value;
          return (
            <Tooltip key={opt.value}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onChange(opt.value)}
                  className={cn(
                    "flex h-full w-9 shrink-0 items-center justify-center transition-colors",
                    i === 0 ? "rounded-l-md" : "rounded-r-md border-l border-input",
                    active ? V2_SEGMENTED_ON : "text-muted-foreground hover:text-foreground",
                  )}
                  style={{ width: 36, minWidth: 36, maxWidth: 36 }}
                  aria-label={opt.label}
                  aria-pressed={active}
                >
                  <Icon className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{opt.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
