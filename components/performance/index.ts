/**
 * Shared reporting kit for the ELI+ performance surfaces.
 *
 * Import report primitives from here rather than declaring local copies — the
 * duplication this replaces is what let the five report pages drift apart
 * (five greens for "positive", four stat-card specs, three filter bars).
 */

export {
  DEFAULT_PERIOD_ID,
  MONTH_LABELS,
  PERIOD_OPTIONS,
  SERIES_COLORS,
  SERIES_NEUTRAL,
  STATUS_FILL,
  CHART_FONT_SIZE,
  CHART_GRID_STROKE,
  TONE_BADGE,
  TYPE,
  TONE_TEXT,
  URGENCY_BADGE,
  createReportFilters,
  formatMonthLabel,
  monthLabelsForPeriod,
  monthsForPeriod,
  periodLabel,
  selectionRatio,
  seriesColor,
  seriesColorAlpha,
  seriesColorMap,
  serializeFilters,
  type PeriodId,
  type ReportFilters,
  type ReportViewMode,
  type Tone,
  type Urgency,
} from "./tokens";

export { DeltaPill, StatCard, StatGrid, type StatCardSize } from "./stat-card";

export { ReportSection, SectionBanner } from "./section-banner";

export { ReportPageHeader } from "./report-page-header";

export {
  MultiSelectFilter,
  PeriodFilter,
  ReportFilterBar,
  ViewToggle,
  type ExtraFilter,
} from "./report-filter-bar";

export { EscalationsSection, type EscalationStat } from "./escalations-section";

export {
  ChartTitleRow,
  LEGEND_PROPS,
  SeriesKeyLegend,
  legendLabel,
  type SeriesKey,
} from "./chart-legend";

export { useReportScope } from "./use-report-scope";
export { ReportPropertyFilter, ALL_REPORT_PROPERTIES } from "./report-property-filter";

export { SegmentedToggle, type SegmentedOption } from "./segmented-toggle";
