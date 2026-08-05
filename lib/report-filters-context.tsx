"use client";

import * as React from "react";

import {
  PERIOD_OPTIONS,
  DEFAULT_PERIOD_ID,
  type PeriodId,
} from "@/components/performance/tokens";

/**
 * Report filter scope, shared across every ELI+ performance surface.
 *
 * Filters used to be per-page component state, so moving from one agent report
 * to another silently reset the period and the property selection — a user
 * comparing two agents over the same window had to re-apply the scope on each
 * page, and nothing told them the scope had changed. Scope is a property of the
 * question being asked, not of the page, so it lives above the pages and
 * survives navigation and reloads.
 */

export interface ReportScope {
  periodId: PeriodId;
  customFrom: string;
  customTo: string;
  /**
   * Selected property NAMES. Empty set means "all" — an explicit empty
   * selection is not a meaningful report scope, and treating it as "none"
   * would render every page blank.
   */
  properties: Set<string>;
}

interface ReportFiltersValue extends ReportScope {
  setPeriod: (periodId: PeriodId) => void;
  setCustomRange: (from: string, to: string) => void;
  setProperties: (properties: Set<string>) => void;
  /** True when any dimension is narrowed from its default. */
  isFiltered: boolean;
  /** Number of narrowed dimensions, for the filter-count badge. */
  activeCount: number;
  clearAll: () => void;
}

const STORAGE_KEY = "oxp.performance.filters.v1";

const DEFAULT_SCOPE: ReportScope = {
  periodId: DEFAULT_PERIOD_ID,
  customFrom: "2025-06",
  customTo: "2026-05",
  properties: new Set<string>(),
};

const ReportFiltersContext = React.createContext<ReportFiltersValue | null>(null);

function readStored(): ReportScope {
  if (typeof window === "undefined") return DEFAULT_SCOPE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SCOPE;
    const parsed = JSON.parse(raw) as {
      periodId?: PeriodId;
      customFrom?: string;
      customTo?: string;
      properties?: string[];
    };
    return {
      // A previously-stored id the options no longer offer ("2y"/"3y"/"all"
      // predate the one-year cap) falls back to the default rather than
      // rendering a filter no control can change.
      periodId:
        parsed.periodId === "custom" ||
        PERIOD_OPTIONS.some((p) => p.id === parsed.periodId)
          ? (parsed.periodId as PeriodId)
          : DEFAULT_SCOPE.periodId,
      customFrom: parsed.customFrom ?? DEFAULT_SCOPE.customFrom,
      customTo: parsed.customTo ?? DEFAULT_SCOPE.customTo,
      properties: new Set(parsed.properties ?? []),
    };
  } catch {
    // A malformed or unavailable store should never break the reports.
    return DEFAULT_SCOPE;
  }
}

export function ReportFiltersProvider({ children }: { children: React.ReactNode }) {
  // Start from the default on both server and first client render so hydration
  // matches, then adopt the stored scope in an effect.
  const [scope, setScope] = React.useState<ReportScope>(DEFAULT_SCOPE);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setScope(readStored());
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          periodId: scope.periodId,
          customFrom: scope.customFrom,
          customTo: scope.customTo,
          properties: [...scope.properties],
        }),
      );
    } catch {
      // Storage can be full or blocked; the filters still work in-session.
    }
  }, [scope, hydrated]);

  const value = React.useMemo<ReportFiltersValue>(() => {
    const periodNarrowed = scope.periodId !== DEFAULT_SCOPE.periodId;
    const propertiesNarrowed = scope.properties.size > 0;
    const activeCount = (periodNarrowed ? 1 : 0) + (propertiesNarrowed ? 1 : 0);

    return {
      ...scope,
      setPeriod: (periodId) => setScope((s) => ({ ...s, periodId })),
      setCustomRange: (customFrom, customTo) =>
        setScope((s) => ({ ...s, customFrom, customTo })),
      setProperties: (properties) => setScope((s) => ({ ...s, properties })),
      isFiltered: activeCount > 0,
      activeCount,
      clearAll: () => setScope({ ...DEFAULT_SCOPE, properties: new Set<string>() }),
    };
  }, [scope]);

  return (
    <ReportFiltersContext.Provider value={value}>
      {children}
    </ReportFiltersContext.Provider>
  );
}

export function useReportFilters(): ReportFiltersValue {
  const ctx = React.useContext(ReportFiltersContext);
  if (!ctx) {
    throw new Error("useReportFilters must be used within a ReportFiltersProvider");
  }
  return ctx;
}

/**
 * Resolve the shared scope against one report's own property universe.
 *
 * The reports don't all cover the same portfolio — Maintenance's seed data uses
 * a different set of properties from the other three — so a shared selection
 * has to be intersected with what each page actually knows about rather than
 * applied blind. A selection with no overlap falls back to the page's full set
 * and reports that it did, so the page never silently renders as empty.
 */
export function resolveScopedProperties(
  selected: Set<string>,
  available: readonly string[],
): { properties: Set<string>; scoped: boolean; unmatched: string[] } {
  if (selected.size === 0) {
    return { properties: new Set(available), scoped: false, unmatched: [] };
  }
  const availableSet = new Set(available);
  const matched = [...selected].filter((p) => availableSet.has(p));
  const unmatched = [...selected].filter((p) => !availableSet.has(p));

  if (matched.length === 0) {
    return { properties: new Set(available), scoped: false, unmatched };
  }
  return { properties: new Set(matched), scoped: true, unmatched };
}
