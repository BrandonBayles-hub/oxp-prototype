"use client";
import * as React from "react";
import type { Conversation } from "@/lib/entrata-experts-v2/types";
import { summaryStats } from "@/lib/entrata-experts-v2/data/activity";
import { MessageCircle, Users, CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function HealthStrip({ activity }: { activity: Conversation[] }) {
  const stats = React.useMemo(() => summaryStats(activity), [activity]);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat
        icon={<MessageCircle className="h-3.5 w-3.5" />}
        label="Questions · last 7d"
        value={stats.questions7d.toString()}
        delta={`${activity.length} all-time`}
      />
      <Stat
        icon={<Users className="h-3.5 w-3.5" />}
        label="Active employees · 7d"
        value={stats.activeEmployees7d.toString()}
        delta="of 12 seats"
      />
      <Stat
        icon={<CheckCircle2 className="h-3.5 w-3.5" />}
        label="Deflection rate · 7d"
        value={`${stats.deflectionPct.toFixed(0)}%`}
        delta="answered without escalation"
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
        style={
          !valueIsBody
            ? {
                fontFamily:
                  "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif",
              }
            : undefined
        }
      >
        {value}
      </div>
      {delta && <div className="mt-0.5 text-xs text-muted-foreground">{delta}</div>}
    </div>
  );
}
