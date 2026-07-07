"use client";

import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Version Two sortable table header cell — the canonical `<th>` with a
 * keyboard-reachable sort button and an `ArrowUpDown` indicator, shared by the
 * My Tasks / escalations-v2 and Playbook tables (formerly the per-file `EscTh`
 * / `PbTh` helpers). Use it for every sortable column header on a V2 grid.
 *
 * Generic over the sort-field union so each table keeps its own typed fields:
 *
 *   <V2SortHeader<EscSortField>
 *     field="summary" label="Task"
 *     sortField={sortField} sortDir={sortDir} onSort={toggleSort}
 *     className={cn("w-[26%]", "sticky-col sticky left-9 z-20", FROZEN_COL_BG)} />
 */
export function V2SortHeader<T extends string>({
  field,
  label,
  sortField,
  sortDir,
  onSort,
  className,
  align = "left",
}: {
  field: T;
  label: string;
  sortField: T | null;
  sortDir: "asc" | "desc";
  onSort: (field: T) => void;
  className?: string;
  align?: "left" | "right";
}) {
  return (
    <th
      aria-sort={sortField === field ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
      className={cn("whitespace-nowrap px-4 py-3 text-left", className)}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          "inline-flex select-none items-center rounded-sm text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          align === "right" && "flex-row-reverse",
        )}
      >
        {label}
        <ArrowUpDown
          className={cn(
            "inline h-3.5 w-3.5 shrink-0",
            align === "right" ? "mr-1" : "ml-1",
            sortField === field ? "text-foreground" : "text-muted-foreground/40",
          )}
        />
      </button>
    </th>
  );
}
