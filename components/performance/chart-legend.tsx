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
