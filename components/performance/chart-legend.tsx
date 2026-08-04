"use client";

import * as React from "react";

/**
 * Legend label renderer for recharts.
 *
 * By default recharts paints the legend *text* in the series color. At the
 * 11px legend size that put every label under WCAG AA — measured 2.15:1 for
 * the amber series and 2.54:1 for the green, against a 4.5:1 requirement.
 *
 * The colored icon already carries the series identity, so the label itself
 * is rendered in foreground text. Pass as `<Legend formatter={legendLabel} />`.
 */
export function legendLabel(value: React.ReactNode) {
  return <span className="text-xs text-foreground">{value}</span>;
}

/** The props every report legend should spread, so they match everywhere. */
export const LEGEND_PROPS = {
  verticalAlign: "bottom" as const,
  iconType: "circle" as const,
  wrapperStyle: { fontSize: "11px", paddingTop: "6px" },
  formatter: legendLabel,
};

export interface SeriesKey {
  label: string;
  color: string;
}

/**
 * A compact swatch legend for charts whose series would otherwise be
 * unidentifiable — a multi-line chart with no legend leaves the reader unable
 * to tell which line is which, which is the whole point of plotting two.
 *
 * Sits on the title row so the key is visible before the eye reaches the
 * plot, rather than below it.
 */
export function SeriesKeyLegend({ series }: { series: SeriesKey[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {series.map((s) => (
        <li key={s.label} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: s.color }}
          />
          <span className="text-xs text-muted-foreground">{s.label}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Title row for a chart: label on the left, series key on the right.
 */
export function ChartTitleRow({
  title,
  series,
  className,
}: {
  title: React.ReactNode;
  series?: SeriesKey[];
  className?: string;
}) {
  return (
    <div
      className={[
        "mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="text-xs font-medium tracking-wider text-muted-foreground">{title}</p>
      {series?.length ? <SeriesKeyLegend series={series} /> : null}
    </div>
  );
}
