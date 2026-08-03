"use client";

import * as React from "react";

import { ReportSection } from "./section-banner";
import { StatCard, StatGrid } from "./stat-card";
import type { Tone } from "./tokens";

export interface EscalationStat {
  label: string;
  value: React.ReactNode;
  delta?: string;
  deltaTone?: Tone;
  /** True when a fall is the win — escalation rate, resolution time. */
  lowerIsBetter?: boolean;
  sub?: string;
  action?: React.ReactNode;
}

/**
 * The escalations block, identical across every agent report.
 *
 * Escalations were previously presented three different ways: a banner + stat
 * row + charts on renewals and payments, unlabelled metrics on leasing, and
 * not at all on maintenance. Since "how often does this agent hand off to a
 * human?" is the question users compare across agents, it needs the same shape
 * and the same stat order everywhere.
 *
 * The canonical stat order is rate → volume → open → resolution time. Pass
 * `stats` in that order; charts and any agent-specific breakdown go in
 * `children` below the row.
 */
export function EscalationsSection({
  stats,
  description = "Escalation rate, volume, resolution status, and response times",
  children,
  emptyMessage,
}: {
  stats: EscalationStat[];
  description?: string;
  children?: React.ReactNode;
  /**
   * Shown instead of the stat row when an agent genuinely has no escalation
   * concept. Stating that explicitly beats omitting the section, which reads
   * as an oversight when every sibling report has one.
   */
  emptyMessage?: string;
}) {
  return (
    <ReportSection title="Escalations" description={description}>
      {stats.length > 0 ? (
        <StatGrid columns={4}>
          {stats.map((s) => (
            <StatCard
              key={s.label}
              label={s.label}
              value={s.value}
              delta={s.delta}
              deltaTone={s.deltaTone}
              lowerIsBetter={s.lowerIsBetter}
              sub={s.sub}
              action={s.action}
            />
          ))}
        </StatGrid>
      ) : (
        <div className="rounded-md border border-dashed border-border px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            {emptyMessage ?? "No escalations recorded for this period."}
          </p>
        </div>
      )}
      {children ? <div className="mt-3">{children}</div> : null}
    </ReportSection>
  );
}
