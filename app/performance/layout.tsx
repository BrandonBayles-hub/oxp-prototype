"use client";

import { ReportFiltersProvider } from "@/lib/report-filters-context";

// The layout used to render an Overview / ELI+ Legacy Library tab strip here.
// Removed (Tyler 08/05/2026, matching entrata-3.0): a two-item tab strip
// spends a full navigation row on a secondary archive destination. The library
// is now reached through a link button in the overview header's action
// cluster, and carries a breadcrumb as the way back — the same
// header-button + crumb grammar every other sub-page here already uses.
export default function PerformanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ReportFiltersProvider>{children}</ReportFiltersProvider>;
}
