"use client";

import * as React from "react";

import {
  ALL_REPORT_PROPERTIES,
  ReportFilterBar,
  monthsForPeriod,
  selectionRatio,
  useReportScope,
} from "@/components/performance";
import type { DashboardBlock, EliDashboard } from "@/lib/eli-library";
import { LibraryDashboardView } from "./dashboard-view";

/**
 * Filter shell for a library dashboard.
 *
 * The library sits inside `ReportFiltersProvider` (app/performance/layout.tsx)
 * but was the one surface ignoring it, so clicking from an agent report into
 * the library silently dropped the user's period and property scope — and the
 * dashboard offered no way to set one, since every value is static config.
 *
 * Extensive metrics (counts, currency, volumes) scale with the window and the
 * share of properties selected; intensive metrics (rates, percentages,
 * averages, ratios, durations) stay put, because sub-selecting properties
 * shouldn't move a per-unit figure. With the default scope the numbers match
 * the original report exactly.
 *
 * The scaling helpers below were written for a `FilteredEliDashboard` component
 * that nothing ever imported; they are reused here rather than rewritten.
 */

function scaleNumericString(raw: string, factor: number): string {
  const str = raw.trim();

  if (str.includes("/")) {
    const parts = str.split("/");
    if (parts.every((p) => /\d/.test(p))) {
      return parts.map((p) => scaleNumericString(p.trim(), factor)).join(" / ");
    }
  }

  const hasDollar = str.startsWith("$");
  const body = hasDollar ? str.slice(1) : str;
  const match = body.match(/^([\d,.]+)\s*([MKB])?$/i);
  if (!match) return raw;

  const numStr = match[1].replace(/,/g, "");
  const suffix = match[2]?.toUpperCase();
  const n = parseFloat(numStr);
  if (isNaN(n)) return raw;

  const scaled = n * factor;
  let out: string;
  if (suffix) {
    out = `${scaled.toFixed(scaled < 100 ? 1 : 0)}${suffix}`;
  } else if (numStr.includes(".")) {
    out = scaled.toFixed(1);
  } else {
    out = Math.round(scaled).toLocaleString();
  }
  return hasDollar ? `$${out}` : out;
}

function isIntensiveValue(value: string, context: string): boolean {
  const v = value.trim();
  if (v.includes("%")) return true;
  if (v.includes("/5")) return true;
  if (/\b(sec|secs|min|mins|hr|hrs|hour|hours|day|days)\b/i.test(v)) return true;
  if (/^\d+\.\d+$/.test(v)) return true; // ratios / averages like 9.2, 0.68
  if (/avg|average|per property|per unit|per staff|ratio/i.test(context)) return true;
  return false;
}

function isIntensiveChart(title: string): boolean {
  return /%|conversion|\brate\b|ratio|response|engagement|preference|language/i.test(title);
}

function scaleBlock(block: DashboardBlock, factor: number): DashboardBlock {
  const context = `${block.title ?? ""} ${block.mockSub ?? ""}`;

  if (block.type === "kpi-card") {
    if (block.mockValue == null) return block;
    const value = String(block.mockValue);
    if (isIntensiveValue(value, context)) return block;
    return { ...block, mockValue: scaleNumericString(value, factor) };
  }

  if (isIntensiveChart(block.title ?? "")) return block;

  const next: DashboardBlock = { ...block };
  if (block.mockTrend) {
    next.mockTrend = block.mockTrend.map((p) => ({
      ...p,
      value: Math.round(p.value * factor),
      ...(p.baseline !== undefined ? { baseline: Math.round(p.baseline * factor) } : {}),
    }));
  }
  if (block.mockSlices) {
    next.mockSlices = block.mockSlices.map((s) => ({ ...s, value: Math.round(s.value * factor) }));
  }
  if (block.mockStages) {
    next.mockStages = block.mockStages.map((s) => ({ ...s, value: Math.round(s.value * factor) }));
  }
  if (block.mockRows) {
    next.mockRows = block.mockRows.map((r) => ({
      ...r,
      value:
        typeof r.value === "number"
          ? Math.round(r.value * factor)
          : scaleNumericString(String(r.value), factor),
    }));
  }
  return next;
}

function scaleDashboard(dashboard: EliDashboard, factor: number): EliDashboard {
  if (factor === 1) return dashboard;

  const headlineValue = dashboard.headlineKpi.value;
  const headlineContext = dashboard.headlineKpi.label;
  const headlineKpi = isIntensiveValue(headlineValue, headlineContext)
    ? dashboard.headlineKpi
    : { ...dashboard.headlineKpi, value: scaleNumericString(headlineValue, factor) };

  return {
    ...dashboard,
    headlineKpi,
    blocks: dashboard.blocks.map((b) => scaleBlock(b, factor)),
  };
}

export function LibraryDashboardClient({ dashboard }: { dashboard: EliDashboard }) {
  const [filters, setFilters] = useReportScope(ALL_REPORT_PROPERTIES);

  const factor = React.useMemo(() => {
    const period = monthsForPeriod(filters.periodId) / 12;
    const properties = selectionRatio(filters.properties, ALL_REPORT_PROPERTIES.length);
    return Math.max(0.01, period * properties);
  }, [filters.periodId, filters.properties]);

  const scaled = React.useMemo(
    () => scaleDashboard(dashboard, factor),
    [dashboard, factor],
  );

  return (
    <LibraryDashboardView
      dashboard={scaled}
      toolbar={
        <ReportFilterBar
          filters={filters}
          onChange={setFilters}
          properties={ALL_REPORT_PROPERTIES}
        />
      }
    />
  );
}
