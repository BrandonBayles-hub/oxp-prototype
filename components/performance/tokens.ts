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
// Type scale — one ladder for every reporting surface
// -----------------------------------------------------------------------------

/**
 * The reporting type hierarchy, as named tokens.
 *
 * Measured before this existed, the five surfaces rendered: two page-title
 * sizes (24 and 30), two section-heading sizes (14 and 18), FOUR stat-value
 * sizes (20/24/30/36) across two weights, and four table-header
 * size+weight combinations. Nothing was arbitrary-valued — the sizes were all
 * legal Tailwind tokens — but "legal" is not the same as "one ladder", and a
 * reader can't tell rank from a set of sizes that overlap between roles.
 *
 * The ladder, top to bottom:
 *
 *   30/600  page title            PageTop
 *   30/700  stat value, hero      at most one per section
 *   24/700  stat value, default   the standard KPI tile
 *   20/700  stat value, compact   dense rows
 *   16/600  section heading       SectionBanner
 *   14/600  card title
 *   14/400  body, descriptions
 *   12/400  secondary, sub-labels, table cells
 *   12/600  table headers
 *   11/600  stat labels, meta
 *   11/400  chart axes and legends
 *
 * Two rules fall out of it:
 *  - a stat value never exceeds the page title (36px did, so a number
 *    out-shouted the name of the page it sat on);
 *  - every role has exactly ONE size+weight, so rank is legible without
 *    reading content.
 */
export const TYPE = {
  sectionHeading: "text-base font-semibold",
  cardTitle: "text-sm font-semibold",
  body: "text-sm",
  secondary: "text-xs",
  label: "text-xxs font-semibold",
  tableHeader: "text-xs font-semibold",
  tableCell: "text-xs",
} as const;

/**
 * Chart type is set numerically by recharts, so it lives outside Tailwind.
 *
 * 12 matches the `text-xs` that `ChartContainer` already puts on its wrapper.
 * Axes that carry no explicit size inherit that, so any other value here would
 * make the axes WITH a prop disagree with the axes without one — which is
 * exactly what was happening (11px on eight axes, 12px on the rest).
 */
export const CHART_FONT_SIZE = 12;

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
  // foreground/75 rather than muted-foreground: the standard muted text
  // measured 4.35:1 on the muted badge surface, just under AA.
  muted: "bg-muted text-foreground/75 ring-1 ring-border",
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

/** The same series colour at a given alpha — for area fills under a line. */
export function seriesColorAlpha(index: number, alpha: number): string {
  return seriesColor(index).replace(/\)$/, ` / ${alpha})`);
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

/**
 * Chart fills for lifecycle states, ranked the same way `URGENCY_BADGE` ranks
 * its badges so a status reads identically whether it appears as a pill or as
 * a bar.
 *
 * This exists because status charts were using raw hex picked per chart: on
 * one page "Completed" was green in the donut and light blue in the stacked
 * bar directly beside it, and "Submitted" was purple — a hue reserved for ELI
 * context.
 */
export const STATUS_FILL = {
  /** Newly arrived, nothing wrong yet. */
  open: "hsl(207 60% 45%)",
  /** Being worked. Same hue as open, stepped lighter. */
  inProgress: "hsl(207 45% 62%)",
  /** Waiting on something external. */
  blocked: "hsl(43 80% 40%)",
  /** Past due — the only state that earns the alarm hue. */
  overdue: "hsl(357 64% 42%)",
  /** Finished well. */
  completed: "hsl(160 45% 35%)",
  /** Closed without an outcome, or no longer relevant. Recedes. */
  cancelled: "hsl(222 12% 62%)",
  /** Awaiting triage/assignment. */
  unassigned: "hsl(222 20% 45%)",
} as const;

/** Grid/axis stroke, so charts don't each pick their own gray. */
export const CHART_GRID_STROKE = "hsl(var(--border))";

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
  // Tyler 08/05/2026: reporting windows cap at ONE YEAR — "Last 2 Years",
  // "Last 3 Years" and "All Time" are gone, and a custom range clamps to a
  // 12-month span (see MAX_CUSTOM_RANGE_MONTHS / clampCustomRange).
] as const;

export type PeriodId = (typeof PERIOD_OPTIONS)[number]["id"] | "custom";

/** The shared default. Every report opens on the same window. */
export const DEFAULT_PERIOD_ID: PeriodId = "12m";

/** The longest window any report offers — presets and custom alike. */
export const MAX_CUSTOM_RANGE_MONTHS = 12;

/** Whole-month span of a custom range, inclusive of both endpoint months. */
export function customRangeSpan(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  if (!fy || !fm || !ty || !tm) return 0;
  return (ty - fy) * 12 + (tm - fm) + 1;
}

/**
 * Clamp a custom range to the one-year cap by moving the end the user did
 * NOT just touch — editing `from` pulls `to` in, and vice versa — so the
 * hand that made the change always wins.
 */
export function clampCustomRange(
  from: string,
  to: string,
  edited: "from" | "to",
): { customFrom: string; customTo: string } {
  const span = customRangeSpan(from, to);
  if (span <= MAX_CUSTOM_RANGE_MONTHS && span > 0) return { customFrom: from, customTo: to };
  const shift = (ym: string, months: number): string => {
    const [y, m] = ym.split("-").map(Number);
    const total = y * 12 + (m - 1) + months;
    const ny = Math.floor(total / 12);
    const nm = (total % 12) + 1;
    return `${ny}-${String(nm).padStart(2, "0")}`;
  };
  if (span <= 0) {
    // Inverted or unparsable — collapse onto the edited end.
    return edited === "from"
      ? { customFrom: from, customTo: from }
      : { customFrom: to, customTo: to };
  }
  return edited === "from"
    ? { customFrom: from, customTo: shift(from, MAX_CUSTOM_RANGE_MONTHS - 1) }
    : { customFrom: shift(to, -(MAX_CUSTOM_RANGE_MONTHS - 1)), customTo: to };
}

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
  /**
   * Properties this page reports on — already intersected with the page's own
   * portfolio, so it is never empty.
   */
  properties: Set<string>;
  /**
   * The user's raw cross-report property selection, by name. Empty means
   * "all". Kept separate from `properties` because the selection spans every
   * agent while `properties` is scoped to the one being viewed.
   */
  propertySelection?: Set<string>;
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

// -----------------------------------------------------------------------------
// Time axis
// -----------------------------------------------------------------------------

export const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/**
 * One month-label format for every chart in the family.
 *
 * Reports previously mixed three formats — bare "Jan", ISO "2026-07", and
 * "Jul '26" (two of them inside a single page). Bare month names are also
 * ambiguous on the 2- and 3-year ranges, where the same name appears twice.
 * Always ascending, oldest → most recent.
 */
export function formatMonthLabel(date: Date): string {
  return `${MONTH_LABELS[date.getMonth()]} '${String(date.getFullYear()).slice(-2)}`;
}

/** Month labels for the N months ending with the current month, ascending. */
export function monthLabelsForPeriod(months: number, endingAt = new Date()): string[] {
  return Array.from({ length: Math.max(1, months) }, (_, i) => {
    const d = new Date(endingAt);
    d.setMonth(d.getMonth() - (months - 1 - i));
    return formatMonthLabel(d);
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
