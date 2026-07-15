"use client";
import * as React from "react";
import type { Conversation } from "@/lib/entrata-experts-v2/types";
import { summaryStats } from "@/lib/entrata-experts-v2/data/activity";
import {
  MessageCircle,
  Users,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  AlertTriangle,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const HEADING_FONT =
  "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif";

export function HealthStrip({ activity }: { activity: Conversation[] }) {
  const stats = React.useMemo(() => summaryStats(activity), [activity]);

  return (
    <div className="space-y-2">
      {/* Primary row — 4 KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={<MessageCircle className="h-3.5 w-3.5" />}
          label="Sessions · last 7d"
          value={stats.sessions7d.toString()}
          delta={`${stats.questions7d} total turns · ${activity.length} all-time sessions`}
        />
        <Stat
          icon={<Users className="h-3.5 w-3.5" />}
          label="Active employees · 7d"
          value={stats.activeEmployees7d.toString()}
          delta="of 12 seats"
        />
        <Stat
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="Resolution rate · 7d"
          value={`${stats.resolutionRate.toFixed(0)}%`}
          delta="sessions ending in a clean answer"
          tone="good"
        />
        <Stat
          icon={<Sparkles className="h-3.5 w-3.5" />}
          label="Top lenses"
          value={stats.topLenses.map((t) => t.label).join(" · ") || "—"}
          valueIsBody
          delta={stats.topLenses.map((t) => `${t.count}`).join(" / ")}
        />
      </div>

      {/* Secondary row — session-shape signals (smaller, side-by-side). */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SmallStat
          icon={<MessageSquare className="h-3 w-3" />}
          label="Avg turns / session"
          value={stats.avgTurnsPerSession.toFixed(1)}
          hint={
            stats.avgTurnsPerSession > 3
              ? "Trending toward investigation"
              : stats.avgTurnsPerSession < 1.4
              ? "Mostly one-shot lookups"
              : "Healthy mix"
          }
        />
        <SmallStat
          icon={<AlertTriangle className="h-3 w-3" />}
          label="Abandonment · 7d"
          value={`${stats.abandonmentRate.toFixed(0)}%`}
          hint="ended in 👎 / refused / low-conf"
          tone={stats.abandonmentRate > 15 ? "warn" : undefined}
        />
        <SmallStat
          icon={<MessageCircle className="h-3 w-3" />}
          label="Escalation · 7d"
          value={`${stats.escalationRate.toFixed(0)}%`}
          hint="kicked to a human / desk"
          tone={stats.escalationRate > 10 ? "alert" : undefined}
        />
        <SmallStat
          icon={<TrendingDown className="h-3 w-3" />}
          label="Regressed sessions"
          value={stats.regressedCount.toString()}
          hint="started 👍 ended 👎"
          tone={stats.regressedCount > 2 ? "warn" : undefined}
        />
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  delta,
  tone,
  valueIsBody,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  delta?: string;
  tone?: "good" | "warn" | "alert" | "info";
  valueIsBody?: boolean;
}) {
  const toneClasses = {
    good: "text-emerald-700",
    warn: "text-amber-700",
    alert: "text-rose-700",
    info: "text-sky-700",
  } as const;
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div
        className={cn(
          "mt-1 leading-tight",
          valueIsBody ? "text-sm font-medium" : "text-2xl font-semibold",
          tone ? toneClasses[tone] : "text-foreground",
        )}
        style={!valueIsBody ? { fontFamily: HEADING_FONT } : undefined}
      >
        {value}
      </div>
      {delta && <div className="mt-0.5 text-xs text-muted-foreground">{delta}</div>}
    </div>
  );
}

function SmallStat({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "warn" | "alert";
}) {
  const toneClasses = {
    good: "text-emerald-700",
    warn: "text-amber-700",
    alert: "text-rose-700",
  } as const;
  return (
    <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div
        className={cn(
          "mt-0.5 text-base font-semibold leading-tight tabular-nums",
          tone ? toneClasses[tone] : "text-foreground",
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
