"use client";

import * as React from "react";
import { Calendar, ChevronDown, Filter, Search, SlidersHorizontal, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { ReportPropertyFilter } from "./report-property-filter";
import {
  DEFAULT_PERIOD_ID,
  PERIOD_OPTIONS,
  periodLabel,
  type ReportFilters,
  type ReportViewMode,
} from "./tokens";

// -----------------------------------------------------------------------------
// Popover shell — one open/close + click-away behaviour for every filter
// -----------------------------------------------------------------------------

function FilterPopover({
  label,
  value,
  icon,
  width = "18rem",
  children,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  width?: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);

  // Escape closes, matching every other dismissible surface in the app.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          open ? "border-foreground/40 ring-1 ring-border" : "border-border",
        )}
      >
        {icon}
        <span className="text-muted-foreground">{label}:</span>
        <span className="font-semibold text-foreground">{value}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div
            className="absolute left-0 top-full z-20 mt-1 max-w-[calc(100vw-2rem)] rounded-md border border-border bg-popover p-2 shadow-lg"
            style={{ width }}
          >
            {children(close)}
          </div>
        </>
      ) : null}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Period
// -----------------------------------------------------------------------------

export function PeriodFilter({
  filters,
  onChange,
}: {
  filters: ReportFilters;
  onChange: (next: ReportFilters) => void;
}) {
  return (
    <FilterPopover
      label="Period"
      value={periodLabel(filters.periodId)}
      width="22rem"
      icon={<Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
    >
      {(close) => (
        <>
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onChange({ ...filters, periodId: opt.id });
                close();
              }}
              className={cn(
                "block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-muted",
                filters.periodId === opt.id && "bg-muted font-medium",
              )}
            >
              {opt.label}
            </button>
          ))}
          <div className="mt-1 border-t border-border pt-2">
            <label className="flex items-center gap-2 px-3 py-1.5 text-sm">
              <input
                type="checkbox"
                checked={filters.periodId === "custom"}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    periodId: e.target.checked ? "custom" : "12m",
                  })
                }
                className="h-4 w-4 rounded border-border"
              />
              Custom Range
            </label>
            {filters.periodId === "custom" ? (
              <div className="space-y-2 px-2 pb-2">
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                  <input
                    type="month"
                    aria-label="From month"
                    value={filters.customFrom}
                    onChange={(e) =>
                      onChange({ ...filters, customFrom: e.target.value })
                    }
                    className="min-w-0 rounded-md border border-border bg-background px-2 py-1 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <input
                    type="month"
                    aria-label="To month"
                    value={filters.customTo}
                    onChange={(e) =>
                      onChange({ ...filters, customTo: e.target.value })
                    }
                    className="min-w-0 rounded-md border border-border bg-background px-2 py-1 text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="w-full rounded-md bg-foreground py-1.5 text-xs font-medium text-background hover:bg-foreground/90"
                >
                  Apply Custom Range
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </FilterPopover>
  );
}

// -----------------------------------------------------------------------------
// Multi-select — properties and every agent-specific dimension
// -----------------------------------------------------------------------------

function selectionLabel(selected: Set<string>, total: number): string {
  if (selected.size === total) return "All";
  if (selected.size === 0) return "None";
  return `${selected.size} selected`;
}

export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  searchable = true,
}: {
  label: string;
  options: readonly string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  searchable?: boolean;
}) {
  const [search, setSearch] = React.useState("");
  const allSelected = selected.size === options.length;
  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <FilterPopover label={label} value={selectionLabel(selected, options.length)}>
      {() => (
        <>
          {searchable && options.length > 8 ? (
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}...`}
                aria-label={`Search ${label}`}
                className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-2 text-sm"
              />
            </div>
          ) : null}
          <div className="max-h-[18rem] overflow-y-auto">
            <label className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() =>
                  onChange(allSelected ? new Set() : new Set(options))
                }
                className="h-4 w-4 rounded border-border"
              />
              <span className="text-sm font-medium">All {label}</span>
            </label>
            {filtered.map((o) => (
              <label
                key={o}
                className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={selected.has(o)}
                  onChange={() => {
                    const next = new Set(selected);
                    if (next.has(o)) next.delete(o);
                    else next.add(o);
                    onChange(next);
                  }}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="text-sm">{o}</span>
              </label>
            ))}
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                No matches for “{search}”
              </p>
            ) : null}
          </div>
        </>
      )}
    </FilterPopover>
  );
}

// -----------------------------------------------------------------------------
// View toggle
// -----------------------------------------------------------------------------

/**
 * Segmented control for the chart view.
 *
 * Follows the platform's toggle canon (entrata-3.0 `ToggleButtonGroup`): a
 * quiet recessed well holds the options and the selected segment is an
 * elevated white chip — never a primary/black button. Selection is a *state*,
 * not an action, and the near-black treatment this used to carry gave a simple
 * view filter the visual weight of the page's primary action.
 *
 * The well is pinned to h-9 so the control matches the Period and Properties
 * controls beside it by construction rather than by padding arithmetic.
 */
export function ViewToggle({
  view,
  onChange,
}: {
  view: ReportViewMode;
  onChange: (v: ReportViewMode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Chart view"
      className="inline-flex h-9 items-center gap-1 rounded-lg border border-input bg-muted px-1"
    >
      {(["global", "perProperty"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={view === v}
          className={cn(
            "inline-flex h-7 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-xs font-medium transition-all",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            view === v
              ? "bg-card text-foreground shadow-sm"
              // foreground/70, not muted-foreground: on the muted well the
              // standard muted text measures 4.35:1, just under AA.
              : "bg-transparent text-foreground/70 hover:text-foreground",
          )}
        >
          {v === "global" ? "Global View" : "Per-Property"}
        </button>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// ReportFilterBar
// -----------------------------------------------------------------------------

export interface ExtraFilter {
  /** Key into `filters.extras`. */
  id: string;
  label: string;
  options: readonly string[];
}

/**
 * The single filter bar for every ELI+ report.
 *
 * Slot order is fixed — Period, Properties, [View toggle], then agent-specific
 * dimensions — so the control a user reaches for is in the same place on every
 * agent. Agent-specific filters beyond the first two collapse behind a "More
 * filters" disclosure rather than wrapping the bar onto a second row, which is
 * what maintenance's six filters were doing.
 *
 * Rendered in-flow at a fixed position under the page header so the bar does
 * not jump vertically between pages (it previously sat at 280 / 309 / 340px on
 * different reports).
 */
export function ReportFilterBar({
  filters,
  onChange,
  properties,
  extraFilters = [],
  showViewToggle = false,
  unmatchedProperties = [],
  className,
}: {
  filters: ReportFilters;
  onChange: (next: ReportFilters) => void;
  properties: readonly string[];
  extraFilters?: ExtraFilter[];
  showViewToggle?: boolean;
  /** Selected properties this agent has no data for. */
  unmatchedProperties?: string[];
  className?: string;
}) {
  const [showMore, setShowMore] = React.useState(false);

  const setExtra = (id: string, next: Set<string>) =>
    onChange({ ...filters, extras: { ...filters.extras, [id]: next } });

  const narrowedExtras = extraFilters.filter((f) => {
    const sel = filters.extras[f.id];
    return sel && sel.size !== f.options.length;
  });

  const propertiesNarrowed = filters.properties.size !== properties.length;
  const periodNarrowed = filters.periodId !== DEFAULT_PERIOD_ID;
  const activeCount =
    (propertiesNarrowed ? 1 : 0) + (periodNarrowed ? 1 : 0) + narrowedExtras.length;

  const clearAll = () =>
    onChange({
      ...filters,
      periodId: DEFAULT_PERIOD_ID,
      properties: new Set(properties),
      extras: Object.fromEntries(extraFilters.map((f) => [f.id, new Set(f.options)])),
    });

  return (
    <div
      className={cn(
        // Sticky so the active period/property scope stays visible while
        // reading a long report — these pages scroll well past the bar, and a
        // number means nothing without the scope it was computed under.
        "sticky top-0 z-30 -mx-6 mb-5 border-b border-border bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <PeriodFilter filters={filters} onChange={onChange} />

        <ReportPropertyFilter
          selected={filters.propertySelection ?? new Set()}
          onChange={(next) => onChange({ ...filters, propertySelection: next })}
        />

        {showViewToggle ? (
          <ViewToggle
            view={filters.view}
            onChange={(v) => onChange({ ...filters, view: v })}
          />
        ) : null}

        {extraFilters.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            aria-expanded={showMore}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              showMore ? "border-foreground/40" : "border-border",
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">More filters</span>
            {narrowedExtras.length > 0 ? (
              <span className="rounded-full bg-foreground px-1.5 text-xxs font-semibold text-background">
                {narrowedExtras.length}
              </span>
            ) : null}
          </button>
        ) : null}

        {/* Applied-filter state: a count plus an explicit clear. Without this
            the only cue that a report is scoped was the control labels
            themselves, which read the same whether or not anything is applied. */}
        {activeCount > 0 ? (
          <div className="ml-auto flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-status-info px-2 py-0.5 text-xxs font-semibold text-status-info-foreground ring-1 ring-status-info-border"
              role="status"
            >
              <Filter className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {activeCount} filter{activeCount === 1 ? "" : "s"} applied
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Clear filters
            </button>
          </div>
        ) : null}
      </div>

      {unmatchedProperties.length > 0 &&
      unmatchedProperties.length === (filters.propertySelection?.size ?? 0) ? (
        <p className="mt-2 text-xs text-foreground/70">
          This agent has no data for{" "}
          <span className="font-medium">{unmatchedProperties.join(", ")}</span> — showing
          all of its properties instead.
        </p>
      ) : null}

      {showMore && extraFilters.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/30 p-2">
          {extraFilters.map((f) => (
            <MultiSelectFilter
              key={f.id}
              label={f.label}
              options={f.options}
              selected={filters.extras[f.id] ?? new Set(f.options)}
              onChange={(next) => setExtra(f.id, next)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
