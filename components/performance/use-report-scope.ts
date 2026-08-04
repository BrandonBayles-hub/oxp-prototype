"use client";

import * as React from "react";

import {
  resolveScopedProperties,
  useReportFilters,
} from "@/lib/report-filters-context";
import { createReportFilters, type ReportFilters } from "./tokens";

/**
 * Binds one report page to the shared filter scope.
 *
 * Period and the property selection live in `ReportFiltersProvider` so they
 * survive navigation between agents — scope is a property of the question the
 * user is asking, not of the page they happen to be on. View mode and the
 * agent-specific "extra" dimensions stay local, because they only mean
 * anything on the page that defines them.
 *
 * Returns the same `[filters, setFilters]` shape the pages already used, so a
 * page adopts the shared scope by swapping one `useState` call.
 */
export function useReportScope(
  pageProperties: readonly string[],
  extraDefaults: Record<string, readonly string[]> = {},
): [ReportFilters, (next: ReportFilters) => void, { unmatched: string[] }] {
  const shared = useReportFilters();

  // View + extras are page-local; seeded once from the page's own defaults.
  const [local, setLocal] = React.useState(() =>
    createReportFilters(pageProperties, extraDefaults),
  );

  const scoped = React.useMemo(
    () => resolveScopedProperties(shared.properties, pageProperties),
    [shared.properties, pageProperties],
  );

  const filters = React.useMemo<ReportFilters>(
    () => ({
      periodId: shared.periodId,
      customFrom: shared.customFrom,
      customTo: shared.customTo,
      properties: scoped.properties,
      propertySelection: shared.properties,
      view: local.view,
      extras: local.extras,
    }),
    [shared.periodId, shared.customFrom, shared.customTo, shared.properties, scoped.properties, local.view, local.extras],
  );

  const setFilters = React.useCallback(
    (next: ReportFilters) => {
      if (next.periodId !== shared.periodId) shared.setPeriod(next.periodId);
      if (next.customFrom !== shared.customFrom || next.customTo !== shared.customTo) {
        shared.setCustomRange(next.customFrom, next.customTo);
      }
      // Compare by content: `clearAll` passes a fresh empty Set, and an
      // identity check alone would still fire, but a caller reusing the same
      // Set instance would not. Content comparison covers both.
      if (next.propertySelection) {
        const a = [...next.propertySelection].sort().join("\u0000");
        const b = [...shared.properties].sort().join("\u0000");
        if (a !== b) shared.setProperties(next.propertySelection);
      }
      setLocal((prev) =>
        prev.view === next.view && prev.extras === next.extras
          ? prev
          : { ...prev, view: next.view, extras: next.extras },
      );
    },
    [shared],
  );

  // Surfaced so the bar can say when a shared selection doesn't apply here.
  // The agents don't all cover the same portfolio, and silently showing the
  // full set under a picker that reads "Ashford Crescent Oaks" would be the
  // report describing a scope it isn't using.
  return [filters, setFilters, { unmatched: scoped.unmatched }];
}
