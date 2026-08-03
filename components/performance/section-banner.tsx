"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The section header used by every report section.
 *
 * Three of the four agent pages already rendered this exact markup from their
 * own local copy; leasing rendered no heading element at all, so that page had
 * no document outline and its section labels were styled identically to KPI
 * card labels. One declaration, and it emits a real heading.
 *
 * The description sits on a muted band, where the standard muted foreground
 * measured 4.35:1 — just under AA. `text-foreground/70` resolves darker and
 * clears it while staying visibly secondary.
 */
export function SectionBanner({
  title,
  description,
  action,
  headingLevel = 2,
  id,
  className,
}: {
  title: string;
  description?: string;
  /** Optional trailing control — a slice selector, a drill-in link. */
  action?: React.ReactNode;
  /** 2 for top-level report sections, 3 for nested groups. */
  headingLevel?: 2 | 3;
  id?: string;
  className?: string;
}) {
  const Heading = (headingLevel === 3 ? "h3" : "h2") as "h2" | "h3";

  return (
    <div
      className={cn(
        "mb-3 flex items-start justify-between gap-3 rounded-md bg-muted/60 px-4 py-3",
        className,
      )}
    >
      <div className="min-w-0">
        <Heading id={id} className="text-sm font-semibold text-foreground">
          {title}
        </Heading>
        {description ? (
          <p className="mt-0.5 text-xs text-foreground/70">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/**
 * A whole report section: banner + content, with consistent vertical rhythm.
 * Using this instead of a bare <section> keeps section spacing identical
 * across pages (they previously ranged from mb-6 to mb-8 to nothing).
 */
export function ReportSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const headingId = React.useId();

  return (
    <section aria-labelledby={headingId} className={cn("mb-6", className)}>
      <SectionBanner
        id={headingId}
        title={title}
        description={description}
        action={action}
      />
      {children}
    </section>
  );
}
