"use client";

/**
 * Shared building blocks for the Call Queue and Call Routing settings
 * panels. Both surfaces need the same tiny primitives (property chip
 * cluster, agent avatar row, live-metric badge, sla dot), so they live in
 * one file to avoid drift between the two panels.
 */

import { useMemo } from "react";
import { Building, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  ALL_PROPERTIES,
  formatWait,
  propertyDisplay,
  type CallQueue,
  type QueueMetrics,
} from "@/lib/call-routing-context";
import { useWorkforce } from "@/lib/workforce-context";
import { cn } from "@/lib/utils";

/** Compact list of property chips — collapses to "All" when the queue is wildcard. */
export function PropertyChips({
  properties,
  max = 3,
  className,
}: {
  properties: string[];
  max?: number;
  className?: string;
}) {
  if (!properties.length) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        No properties
      </span>
    );
  }
  if (properties.includes(ALL_PROPERTIES)) {
    return (
      <Badge variant="secondary" className={cn("gap-1 text-[10px]", className)}>
        <Building className="h-3 w-3" aria-hidden />
        All properties
      </Badge>
    );
  }
  const shown = properties.slice(0, max);
  const overflow = properties.length - shown.length;
  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {shown.map((p) => (
        <Badge key={p} variant="secondary" className="gap-1 text-[10px]">
          <Building className="h-3 w-3" aria-hidden />
          {p}
        </Badge>
      ))}
      {overflow > 0 && (
        <Badge variant="outline" className="text-[10px]">
          +{overflow}
        </Badge>
      )}
    </div>
  );
}

/** Property display line ("All properties" / "N properties") for compact contexts. */
export function PropertyCountLine({ properties }: { properties: string[] }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Building className="h-3 w-3" aria-hidden />
      {propertyDisplay(properties)}
    </span>
  );
}

/**
 * Cluster of avatar-style initials for the first N agents assigned to a
 * queue, followed by a "+X" chip. Reads from workforce context so it's
 * always consistent with the org roster.
 */
export function AgentAvatarStack({
  memberIds,
  max = 5,
  className,
}: {
  memberIds: string[];
  max?: number;
  className?: string;
}) {
  const { members } = useWorkforce();
  const resolved = useMemo(() => {
    return memberIds
      .map((id) => members.find((m) => m.id === id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m));
  }, [memberIds, members]);

  const shown = resolved.slice(0, max);
  const overflow = resolved.length - shown.length;

  if (!resolved.length) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}>
        <User className="h-3 w-3" aria-hidden />
        No agents assigned
      </span>
    );
  }

  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex -space-x-1.5">
        {shown.map((m) => (
          <div
            key={m.id}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full border-2 border-background text-[9px] font-semibold uppercase",
              m.type === "agent"
                ? "bg-eli-warm-bg text-eli-warm-bg-foreground"
                : "bg-primary/10 text-primary",
            )}
            title={`${m.name} · ${m.role}`}
          >
            {m.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)}
          </div>
        ))}
        {overflow > 0 && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[9px] font-semibold text-muted-foreground">
            +{overflow}
          </div>
        )}
      </div>
      <span className="ml-2 text-xs text-muted-foreground">
        {resolved.length} agent{resolved.length === 1 ? "" : "s"}
      </span>
    </div>
  );
}

/**
 * Live-metric row for a queue card. Emits at-a-glance operational KPIs so
 * a supervisor can spot a burning queue without opening the detail sheet.
 */
export function QueueLiveMetrics({
  queue,
}: {
  queue: CallQueue;
}) {
  const m = queue.metrics;
  return (
    <div className="grid grid-cols-4 gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px]">
      <MetricCell label="In queue" value={String(m.inQueue)} tone={m.inQueue > 3 ? "warning" : m.inQueue > 0 ? "info" : "muted"} />
      <MetricCell label="On call" value={String(m.onCall)} tone="muted" />
      <MetricCell label="Longest wait" value={m.longestWaitSec ? formatWait(m.longestWaitSec) : "—"} tone={m.longestWaitSec > queue.slaTargetSec ? "warning" : "muted"} />
      <MetricCell label="SLA today" value={`${Math.round(m.slaTodayPct * 100)}%`} tone={slaTone(m.slaTodayPct, queue.slaTargetPct / 100)} />
    </div>
  );
}

function MetricCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "muted" | "info" | "warning" | "success" | "error";
}) {
  const toneClass =
    tone === "warning"
      ? "text-status-warning-foreground"
      : tone === "error"
      ? "text-status-error-foreground"
      : tone === "success"
      ? "text-status-success-foreground"
      : tone === "info"
      ? "text-status-info-foreground"
      : "text-foreground";
  return (
    <div className="min-w-0">
      <p className="truncate text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-0.5 truncate text-[13px] font-semibold tabular-nums", toneClass)}>
        {value}
      </p>
    </div>
  );
}

function slaTone(actual: number, target: number): "success" | "warning" | "error" {
  if (actual >= target) return "success";
  if (actual >= target - 0.1) return "warning";
  return "error";
}

/**
 * Overview strip that sums metrics across an array of queues. Used as the
 * "Live activity" bar at the top of the Call Queue tab so an operator can
 * see the whole call center at once before drilling in.
 */
export function AggregateOverview({
  queues,
}: {
  queues: CallQueue[];
}) {
  const agg = useMemo(() => {
    return queues.reduce<QueueMetrics & { activeQueues: number; totalQueues: number }>(
      (acc, q) => ({
        inQueue: acc.inQueue + q.metrics.inQueue,
        onCall: acc.onCall + q.metrics.onCall,
        availableAgents: acc.availableAgents + q.metrics.availableAgents,
        longestWaitSec: Math.max(acc.longestWaitSec, q.metrics.longestWaitSec),
        slaTodayPct:
          acc.callsToday + q.metrics.callsToday === 0
            ? acc.slaTodayPct
            : (acc.slaTodayPct * acc.callsToday +
                q.metrics.slaTodayPct * q.metrics.callsToday) /
              (acc.callsToday + q.metrics.callsToday),
        callsToday: acc.callsToday + q.metrics.callsToday,
        answeredTodayPct:
          acc.callsToday + q.metrics.callsToday === 0
            ? acc.answeredTodayPct
            : (acc.answeredTodayPct * acc.callsToday +
                q.metrics.answeredTodayPct * q.metrics.callsToday) /
              (acc.callsToday + q.metrics.callsToday),
        avgHandleSec:
          acc.callsToday + q.metrics.callsToday === 0
            ? acc.avgHandleSec
            : (acc.avgHandleSec * acc.callsToday +
                q.metrics.avgHandleSec * q.metrics.callsToday) /
              (acc.callsToday + q.metrics.callsToday),
        activeQueues: acc.activeQueues + (q.paused ? 0 : 1),
        totalQueues: acc.totalQueues + 1,
      }),
      {
        inQueue: 0,
        onCall: 0,
        availableAgents: 0,
        longestWaitSec: 0,
        slaTodayPct: 0,
        callsToday: 0,
        answeredTodayPct: 0,
        avgHandleSec: 0,
        activeQueues: 0,
        totalQueues: 0,
      },
    );
  }, [queues]);

  return (
    <div className="grid gap-2 rounded-lg border border-border bg-background p-3 sm:grid-cols-6">
      <OverviewCell label="Active queues" value={`${agg.activeQueues} / ${agg.totalQueues}`} />
      <OverviewCell label="Callers in queue" value={String(agg.inQueue)} tone={agg.inQueue > 5 ? "warning" : "muted"} />
      <OverviewCell label="On call" value={String(agg.onCall)} />
      <OverviewCell label="Agents available" value={String(agg.availableAgents)} />
      <OverviewCell label="Longest wait" value={agg.longestWaitSec ? formatWait(agg.longestWaitSec) : "—"} />
      <OverviewCell label="Portfolio SLA" value={`${Math.round(agg.slaTodayPct * 100)}%`} tone={agg.slaTodayPct >= 0.8 ? "success" : "warning"} />
    </div>
  );
}

function OverviewCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "muted" | "warning" | "success";
}) {
  const toneClass =
    tone === "warning"
      ? "text-status-warning-foreground"
      : tone === "success"
      ? "text-status-success-foreground"
      : "text-foreground";
  return (
    <div>
      <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-0.5 text-lg font-semibold tabular-nums", toneClass)}>
        {value}
      </p>
    </div>
  );
}
