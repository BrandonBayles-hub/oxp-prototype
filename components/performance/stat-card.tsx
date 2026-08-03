"use client";

import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TONE_TEXT, type Tone } from "./tokens";

// -----------------------------------------------------------------------------
// DeltaPill
// -----------------------------------------------------------------------------

/**
 * The trend indicator that sits beside a stat's value.
 *
 * Was declared four times across the report pages with drifting icon sizes
 * (14px on three pages, 12px on maintenance — the latter off the sanctioned
 * icon scale) and raw emerald-600/rose-600 text that measured 3.77:1 against
 * a 4.5:1 AA requirement. One declaration, semantic tokens, 14px icons.
 */
export function DeltaPill({
  value,
  tone = "neutral",
  className,
}: {
  value: string;
  tone?: Tone;
  className?: string;
}) {
  const Icon =
    tone === "positive" ? ArrowUpRight : tone === "negative" ? ArrowDownRight : Minus;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 whitespace-nowrap text-xs font-medium",
        TONE_TEXT[tone],
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {value}
    </span>
  );
}

// -----------------------------------------------------------------------------
// StatCard
// -----------------------------------------------------------------------------

/**
 * `default` — the standard KPI tile used in report grids
 * `hero`    — a single emphasised stat (one per section at most)
 * `compact` — dense rows where many stats share a band
 */
export type StatCardSize = "compact" | "default" | "hero";

const VALUE_SIZE: Record<StatCardSize, string> = {
  compact: "text-xl",
  default: "text-2xl",
  hero: "text-4xl",
};

const PADDING: Record<StatCardSize, string> = {
  compact: "px-3 py-2.5",
  default: "px-4 py-3.5",
  hero: "px-5 py-4",
};

/**
 * The one stat tile for every reporting surface.
 *
 * Replaces four separate `KpiCard`/`KpiTile` declarations that had drifted to
 * three label sizes (10px/11px), four value sizes (20/24/30/36px), two font
 * weights and two border treatments. Size is chosen from the variant scale
 * rather than by hand-tuning classes per page.
 */
export function StatCard({
  label,
  value,
  delta,
  deltaTone = "neutral",
  sub,
  subItalic,
  action,
  size = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  delta?: string;
  deltaTone?: Tone;
  /** Supporting line under the value — units, denominator, scope. */
  sub?: string;
  /** Secondary note, e.g. the arithmetic behind a derived figure. */
  subItalic?: string;
  /** Optional trailing control (a drill-in link, an info tooltip). */
  action?: React.ReactNode;
  size?: StatCardSize;
  className?: string;
}) {
  return (
    <Card className={cn("border-border/60", className)}>
      <CardContent className={cn("h-full", PADDING[size])}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-xxs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p
            className={cn(
              "font-bold tracking-tight tabular-nums text-foreground",
              VALUE_SIZE[size],
            )}
          >
            {value}
          </p>
          {delta ? <DeltaPill value={delta} tone={deltaTone} /> : null}
        </div>
        {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
        {subItalic ? (
          <p className="mt-0.5 text-xxs italic text-muted-foreground">{subItalic}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// StatGrid
// -----------------------------------------------------------------------------

/**
 * The standard responsive grid for a row of stats, so tile widths and the
 * breakpoints they reflow at are the same on every report. Previously each
 * page hand-wrote its own `grid-cols-*` string and maintenance ended up with
 * four different tile widths on a single page.
 */
export function StatGrid({
  columns = 4,
  children,
  className,
}: {
  columns?: 2 | 3 | 4 | 5;
  children: React.ReactNode;
  className?: string;
}) {
  const cols = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
    5: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
  }[columns];

  return <div className={cn("grid gap-3", cols, className)}>{children}</div>;
}
