"use client";

import * as React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TONE_BADGE, type Tone } from "./tokens";

// -----------------------------------------------------------------------------
// DeltaPill
// -----------------------------------------------------------------------------

/** Which way the number moved — a fact about the digits, not about meaning. */
type Direction = "up" | "down" | "flat";

function directionOf(value: string): Direction {
  const v = value.trim();
  if (/^[+▲↑]/.test(v)) return "up";
  if (/^[-−–▼↓]/.test(v)) return "down";
  return "flat";
}

/**
 * Resolve a delta to a semantic tone.
 *
 * Colour has to track whether the outcome is GOOD, not whether the number
 * went up: "avg response time −2 sec" and "late payers −44" are decreases and
 * both are wins, but colouring by sign paints them red and tells the reader
 * the opposite of the truth.
 *
 * So the metric declares its polarity via `lowerIsBetter`, and the sign only
 * decides which side of that polarity we're on. `tone` remains available as a
 * direct override for cases that are neither (a flat or purely informational
 * delta).
 */
function resolveTone(value: string, lowerIsBetter: boolean): Tone {
  const dir = directionOf(value);
  if (dir === "flat") return "neutral";
  const good = lowerIsBetter ? dir === "down" : dir === "up";
  return good ? "positive" : "negative";
}

/**
 * The trend indicator beside a stat's value, rendered as a badge.
 *
 * It used to be bare text with a leading icon, which put a dash directly in
 * front of the number — "— +0.6 pts" reads as a minus sign fighting a plus
 * sign. A bounded badge makes the delta one self-contained object, so its own
 * sign is the only sign in it.
 *
 * Direction is carried by the arrow as well as the color, so the meaning
 * survives for readers who can't distinguish the hues. Neutral gets no arrow
 * at all rather than a dash.
 */
export function DeltaPill({
  value,
  tone,
  lowerIsBetter = false,
  className,
}: {
  value: string;
  /** Explicit override. Omit and the tone follows the sign + `lowerIsBetter`. */
  tone?: Tone;
  /**
   * Set for metrics where a fall is the win — response times, days to
   * complete, delinquency, cost, late payers.
   */
  lowerIsBetter?: boolean;
  className?: string;
}) {
  const resolved = tone ?? resolveTone(value, lowerIsBetter);
  // The arrow reports the DIRECTION the number moved; the colour reports
  // whether that is good. Keeping them independent means "−2 sec" reads as a
  // down-arrow in green — an improvement, honestly described.
  const dir = directionOf(value);
  const Icon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full px-1.5 py-0.5 text-xxs font-semibold",
        TONE_BADGE[resolved],
        className,
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
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
  deltaTone,
  lowerIsBetter,
  sub,
  subItalic,
  action,
  size = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  delta?: string;
  /** Explicit override; usually `lowerIsBetter` is the clearer signal. */
  deltaTone?: Tone;
  /** True when a decrease is the good outcome (times, costs, delinquency). */
  lowerIsBetter?: boolean;
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
          {delta ? (
            <DeltaPill value={delta} tone={deltaTone} lowerIsBetter={lowerIsBetter} />
          ) : null}
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
