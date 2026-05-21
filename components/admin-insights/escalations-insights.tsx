"use client";

import * as React from "react";
import { useEscalations, useEscalationAnalytics } from "@/lib/escalations-context";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  BarChart3,
  AlertTriangle,
  ArrowUpRight,
  ChevronRight,
  Zap,
  Timer,
} from "lucide-react";

function formatMs(ms: number): string {
  if (ms <= 0) return "—";
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

export function EscalationsInsights() {
  const { items } = useEscalations();
  const analytics = useEscalationAnalytics();

  const stats = React.useMemo(() => {
    const open = items.filter((i) => i.status !== "Done").length;
    const urgent = items.filter(
      (i) => i.status !== "Done" && (i.priority === "urgent" || i.priority === "high")
    ).length;
    const overdue = items.filter((i) => {
      if (i.status === "Done" || !i.dueAt) return false;
      return new Date(i.dueAt) < new Date();
    }).length;
    const handedBack = items.filter(
      (i) => i.status === "Handed back to agent"
    ).length;
    const done = items.filter((i) => i.status === "Done").length;
    const unassigned = items.filter(
      (i) => i.status !== "Done" && !i.assignee
    ).length;

    return { open, urgent, overdue, handedBack, done, unassigned, total: items.length };
  }, [items]);

  const byStatus = React.useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((i) => {
      map[i.status] = (map[i.status] ?? 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const byPriority = React.useMemo(() => {
    const order = ["urgent", "high", "medium", "low", "none"];
    const map: Record<string, number> = {};
    items.forEach((i) => {
      const p = i.priority ?? "none";
      map[p] = (map[p] ?? 0) + 1;
    });
    return order
      .filter((p) => map[p])
      .map((p) => [p, map[p]!] as [string, number]);
  }, [items]);

  const topAssignees = React.useMemo(() => {
    const map: Record<string, { open: number; done: number }> = {};
    items.forEach((i) => {
      const name = i.assignee || "Unassigned";
      if (!map[name]) map[name] = { open: 0, done: 0 };
      if (i.status === "Done") map[name].done++;
      else map[name].open++;
    });
    return Object.entries(map)
      .map(([name, counts]) => ({ name, ...counts, total: counts.open + counts.done }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [items]);

  const [tab, setTab] = React.useState<"queue" | "volume" | "assignees" | "patterns">("queue");

  return (
    <div className="space-y-5">
      {/* Health strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<AlertCircle className="h-3.5 w-3.5" />}
          label="Open escalations"
          value={stats.open.toString()}
          delta={`${stats.total} total · ${stats.done} resolved`}
        />
        <StatCard
          icon={<Zap className="h-3.5 w-3.5" />}
          label="Urgent / High"
          value={stats.urgent.toString()}
          delta={stats.overdue > 0 ? `${stats.overdue} overdue` : "None overdue"}
          tone={stats.urgent > 3 ? "warn" : undefined}
        />
        <StatCard
          icon={<Timer className="h-3.5 w-3.5" />}
          label="Avg first response"
          value={formatMs(analytics.avgFirstResponseMs)}
          delta="from creation to first action"
        />
        <StatCard
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="Avg resolution time"
          value={formatMs(analytics.avgResolutionMs)}
          delta={`${stats.handedBack} handed back to agent`}
          tone={analytics.avgResolutionMs > 0 ? "good" : undefined}
        />
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-0.5">
        {(
          [
            { id: "queue", label: "Queue health" },
            { id: "volume", label: "Volume breakdown" },
            { id: "assignees", label: "Workload by assignee" },
            { id: "patterns", label: "Patterns & alerts" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "queue" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Current queue status distribution and priority breakdown.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                By status
              </div>
              <div className="divide-y divide-border/60">
                {byStatus.map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <StatusDot status={status} />
                      <span className="text-sm text-foreground">{status}</span>
                    </div>
                    <span className="text-sm font-medium tabular-nums text-foreground">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                By priority
              </div>
              <div className="divide-y divide-border/60">
                {byPriority.map(([priority, count]) => (
                  <div key={priority} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <PriorityIndicator priority={priority} />
                      <span className="text-sm capitalize text-foreground">{priority}</span>
                    </div>
                    <span className="text-sm font-medium tabular-nums text-foreground">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent items needing attention */}
          {(stats.overdue > 0 || stats.unassigned > 0) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/20">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                Attention needed
              </div>
              <div className="mt-1 text-[13px] text-amber-700 dark:text-amber-400">
                {stats.overdue > 0 && <span>{stats.overdue} overdue escalation(s). </span>}
                {stats.unassigned > 0 && <span>{stats.unassigned} unassigned item(s).</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "volume" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Escalation volume by category, type, property, and originating agent.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <BreakdownCard title="By category" data={analytics.byCategory} />
            <BreakdownCard title="By type" data={analytics.byType} />
            <BreakdownCard title="By property" data={analytics.byProperty} />
            <BreakdownCard title="By originating agent" data={analytics.byAgent} />
          </div>
        </div>
      )}

      {tab === "assignees" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            How escalation workload is distributed across your team.
          </p>
          <div className="rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr className="text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2">Assignee</th>
                  <th className="px-4 py-2 text-right">Open</th>
                  <th className="px-4 py-2 text-right">Resolved</th>
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {topAssignees.map((a) => (
                  <tr key={a.name} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-foreground">{a.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-foreground">
                      {a.open > 0 ? a.open : <span className="text-muted-foreground/60">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-foreground">
                      {a.done > 0 ? a.done : <span className="text-muted-foreground/60">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium text-foreground">
                      {a.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "patterns" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Automatically detected patterns that may indicate SOP gaps, training needs, or configuration issues.
          </p>
          {analytics.patterns.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
              <div className="text-sm">No patterns detected.</div>
              <div className="mt-1 text-xs">
                Patterns surface when an agent, category, or property shows unusually high escalation volume.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.patterns.map((pattern, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3"
                >
                  <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-foreground">{pattern}</div>
                  </div>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  delta,
  tone,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  delta?: string;
  tone?: "good" | "warn";
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div
        className={cn(
          "mt-1 text-2xl font-semibold leading-tight",
          tone === "good"
            ? "text-emerald-700"
            : tone === "warn"
            ? "text-amber-700"
            : "text-foreground"
        )}
        style={{
          fontFamily: "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {value}
      </div>
      {delta && <div className="mt-0.5 text-xs text-muted-foreground">{delta}</div>}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "Done"
      ? "bg-emerald-500"
      : status === "Open"
      ? "bg-blue-500"
      : status === "In progress"
      ? "bg-sky-500"
      : status === "Blocked"
      ? "bg-rose-500"
      : "bg-amber-500";
  return <span className={cn("inline-block h-2 w-2 rounded-full", color)} />;
}

function PriorityIndicator({ priority }: { priority: string }) {
  const color =
    priority === "urgent"
      ? "bg-rose-500"
      : priority === "high"
      ? "bg-amber-500"
      : priority === "medium"
      ? "bg-sky-500"
      : "bg-muted-foreground/30";
  return <span className={cn("inline-block h-2 w-2 rounded-full", color)} />;
}

function BreakdownCard({
  title,
  data,
}: {
  title: string;
  data: { label: string; count: number }[];
}) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="divide-y divide-border/60">
        {data.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">No data</div>
        ) : (
          data.map((d) => (
            <div key={d.label} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm text-foreground">{d.label}</span>
              <span className="text-sm font-medium tabular-nums text-foreground">{d.count}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
