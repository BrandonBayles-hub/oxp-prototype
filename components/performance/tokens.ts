/**
 * Shared reporting tokens for the ELI+ performance surfaces.
 *
 * Why this file exists: the five report pages each declared their own colors,
 * period lists and type sizes, so "positive" rendered in five different greens
 * and the same Period menu offered different options per agent. Everything a
 * report needs to look like the rest of the family lives here.
 *
 * Rules enforced here (see CLAUDE.md):
 *  - one hue = one meaning; semantic color comes from --status-* tokens only
 *  - named type tokens only (text-xxs / text-xs / ...), never text-[Npx]
 *  - icons at 14/16/20px (h-3.5 / h-4 / h-5), no 12px tier
 */

// -----------------------------------------------------------------------------
// Semantic tone — the only sanctioned mapping of meaning to color
// -----------------------------------------------------------------------------

/**
 * `positive`  — an outcome improved (renewals up, days-to-complete down)
 * `negative`  — an outcome worsened
 * `neutral`   — no meaningful change, or a value with no inherent direction
 *
 * Note that tone is about the *outcome*, not the arrow direction: "avg days to
 * complete: 6.8d → 4.2d" is a decrease and a positive tone. Callers pass tone
 * explicitly for that reason.
 */
export type Tone = "positive" | "negative" | "neutral";

/**
 * Text colors for trend/delta values.
 *
 * These use the --status-*-foreground tokens rather than raw Tailwind palette
 * classes. Besides being the one sanctioned source, they clear WCAG AA at the
 * 11–12px sizes deltas render at, which emerald-600/rose-600 did not
 * (measured 3.77:1 against a 4.5:1 requirement).
 */
export const TONE_TEXT: Record<Tone, string> = {
  positive: "text-status-success-foreground",
  negative: "text-status-error-foreground",
  neutral: "text-muted-foreground",
};

/** Soft badge treatment (bg + fg + ring) for the same three tones. */
export const TONE_BADGE: Record<Tone, string> = {
  positive:
    "bg-status-success text-status-success-foreground ring-1 ring-status-success-border",
  negative:
    "bg-status-error text-status-error-foreground ring-1 ring-status-error-border",
  neutral: "bg-muted text-muted-foreground ring-1 ring-border",
};

/**
 * Four-step urgency ladder for statuses that carry time pressure.
 * The ladder is monotonic — breach > warning > info > settled — so the colors
 * rank in the same direction as the severity.
 */
export const URGENCY_BADGE = {
  breach:
    "bg-status-error text-status-error-foreground ring-1 ring-status-error-border",
  warning:
    "bg-status-warning text-status-warning-foreground ring-1 ring-status-warning-border",
  info: "bg-status-info text-status-info-foreground ring-1 ring-status-info-border",
  settled:
    "bg-status-success text-status-success-foreground ring-1 ring-status-success-border",
  muted: "bg-muted text-muted-foreground ring-1 ring-border",
} as const;

export type Urgency = keyof typeof URGENCY_BADGE;

// -----------------------------------------------------------------------------
// Chart series palette
// -----------------------------------------------------------------------------

/**
 * One ordered categorical palette for every chart in the reporting family.
 *
 * Previously each page picked its own hexes (renewals `#3b82f6…`, maintenance
 * `#22c55e…`, the library dashboards a third HSL set), so the same property or
 * source changed color between pages. Series colors are assigned by index —
 * use `seriesColor(i)` rather than reaching for a specific entry.
 *
 * Ordered so the first four are maximally distinguishable, including for the
 * most common forms of color-vision deficiency.
 */
export const SERIES_COLORS = [
  "hsl(211 76% 46%)", // blue
  "hsl(160 63% 33%)", // green
  "hsl(31 90% 45%)", // orange
  "hsl(280 52% 50%)", // purple
  "hsl(190 70% 36%)", // teal
  "hsl(340 62% 48%)", // magenta
  "hsl(50 82% 38%)", // ochre
  "hsl(222 20% 45%)", // slate
] as const;

export function seriesColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

/** Build a stable name→color map so a given series keeps its color per page. */
export function seriesColorMap<T extends string>(keys: readonly T[]): Record<T, string> {
  return keys.reduce(
    (acc, key, i) => {
      acc[key] = seriesColor(i);
      return acc;
    },
    {} as Record<T, string>,
  );
}

/** Neutral color for the "current period" reference line/series. */
export const SERIES_NEUTRAL = "hsl(222 20% 45%)";

// -----------------------------------------------------------------------------
// Period options — one list for every report
// -----------------------------------------------------------------------------

/** Months elapsed in the current calendar year, inclusive of this month. */
const YTD_MONTHS = new Date().getMonth() + 1;

/**
 * Previously renewals/maintenance offered five options and leasing/payments
 * six; "All Time" meant 36 months on one page and 48 on another; and "Year To
 * Date" existed only on maintenance. One list, one meaning — every agent
 * offers the same windows.
 */
export const PERIOD_OPTIONS = [
  { id: "3m", label: "Last 3 Months", months: 3 },
  { id: "6m", label: "Last 6 Months", months: 6 },
  { id: "12m", label: "Last 12 Months", months: 12 },
  { id: "ytd", label: "Year To Date", months: YTD_MONTHS },
  { id: "2y", label: "Last 2 Years", months: 24 },
  { id: "3y", label: "Last 3 Years", months: 36 },
  { id: "all", label: "All Time", months: 36 },
] as const;

export type PeriodId = (typeof PERIOD_OPTIONS)[number]["id"] | "custom";

/** The shared default. Every report opens on the same window. */
export const DEFAULT_PERIOD_ID: PeriodId = "12m";

export function monthsForPeriod(periodId: PeriodId): number {
  if (periodId === "custom") return 12;
  return PERIOD_OPTIONS.find((p) => p.id === periodId)?.months ?? 12;
}

export function periodLabel(periodId: PeriodId): string {
  if (periodId === "custom") return "Custom Range";
  return (
    PERIOD_OPTIONS.find((p) => p.id === periodId)?.label ?? "Last 12 Months"
  );
}

// -----------------------------------------------------------------------------
// Shared filter state
// -----------------------------------------------------------------------------

export interface ReportFilters {
  periodId: PeriodId;
  customFrom: string;
  customTo: string;
  /** Selected properties. Empty set = none; full set = all. */
  properties: Set<string>;
  /** Charts render one portfolio line, or one line per selected property. */
  view: ReportViewMode;
  /** Agent-specific dimensions, keyed by filter id (e.g. "technicians"). */
  extras: Record<string, Set<string>>;
}

export type ReportViewMode = "global" | "perProperty";

export function createReportFilters(
  properties: readonly string[],
  extras: Record<string, readonly string[]> = {},
): ReportFilters {
  return {
    periodId: DEFAULT_PERIOD_ID,
    customFrom: "2025-06",
    customTo: "2026-05",
    properties: new Set(properties),
    view: "global",
    extras: Object.fromEntries(
      Object.entries(extras).map(([k, v]) => [k, new Set(v)]),
    ),
  };
}

/** Stable fingerprint of the filter state, for memo/effect dependencies. */
export function serializeFilters(f: ReportFilters): string {
  return JSON.stringify({
    periodId: f.periodId,
    customFrom: f.customFrom,
    customTo: f.customTo,
    properties: [...f.properties].sort(),
    view: f.view,
    extras: Object.fromEntries(
      Object.entries(f.extras).map(([k, v]) => [k, [...v].sort()]),
    ),
  });
}

/**
 * Fraction of a dimension that is selected, used to scale seeded demo metrics
 * so the numbers actually respond to the filters.
 */
export function selectionRatio(selected: Set<string>, total: number): number {
  if (total <= 0) return 1;
  if (selected.size === 0) return 0;
  return selected.size / total;
}
