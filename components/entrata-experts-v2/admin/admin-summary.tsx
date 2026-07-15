"use client";
import * as React from "react";
import Link from "next/link";
import type { Conversation, AssistantMessage } from "@/lib/entrata-experts-v2/types";
import { summaryStats, buildGaps } from "@/lib/entrata-experts-v2/data/activity";
import { EMPLOYEE_BY_ID, avatarColor, initials } from "@/lib/entrata-experts-v2/data/employees";
import { LENS_BY_ID } from "@/lib/entrata-experts-v2/lenses";
import { formatRelative } from "@/lib/entrata-experts-v2/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Users,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  ShieldX,
  ThumbsDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminSummary({ activity }: { activity: Conversation[] }) {
  const stats = React.useMemo(() => summaryStats(activity), [activity]);
  const gaps = React.useMemo(() => buildGaps(activity), [activity]);
  const recentConvos = activity.slice(0, 5);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Admin · Quick overview
        </div>
        <h2
          className="text-lg font-semibold tracking-tight text-foreground"
          style={{
            fontFamily:
              "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif",
          }}
        >
          Entrata Experts at a glance
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          A snapshot of how your team is using Entrata Analyst. For full
          activity logs, question clusters, and automation candidates, visit
          Admin Insights.
        </p>
      </div>

      {/* Compact health stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CompactStat
          icon={<MessageCircle className="h-3.5 w-3.5" />}
          label="Questions · 7d"
          value={stats.questions7d.toString()}
          delta={`${activity.length} all-time`}
        />
        <CompactStat
          icon={<Users className="h-3.5 w-3.5" />}
          label="Active employees · 7d"
          value={stats.activeEmployees7d.toString()}
          delta="of 12 seats"
        />
        <CompactStat
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="Deflection rate · 7d"
          value={`${stats.deflectionPct.toFixed(0)}%`}
          delta="answered without escalation"
          tone="good"
        />
        <CompactStat
          icon={<Sparkles className="h-3.5 w-3.5" />}
          label="Top lenses"
          value={stats.topLenses.map((t) => t.label).join(" · ") || "—"}
          valueIsBody
          delta={stats.topLenses.map((t) => `${t.count}`).join(" / ")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent activity mini-table */}
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Recent conversations
            </span>
            <span className="text-[11px] text-muted-foreground">
              Last {recentConvos.length} of {activity.length}
            </span>
          </div>
          <div className="divide-y divide-border/60">
            {recentConvos.map((c) => {
              const employee = EMPLOYEE_BY_ID[c.userId];
              const a = c.messages[1] as AssistantMessage | undefined;
              const lensDef = LENS_BY_ID[c.lens];
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <span
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium text-white"
                    style={{
                      backgroundColor: avatarColor(
                        employee?.avatarSeed ?? 0
                      ),
                    }}
                    title={employee?.name}
                  >
                    {initials(employee?.name ?? "?")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] text-foreground">
                      {c.messages[0].body}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{employee?.name}</span>
                      <span>·</span>
                      <span>{formatRelative(c.createdAt)}</span>
                      {lensDef && (
                        <>
                          <span>·</span>
                          <span>{lensDef.label}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {a?.outcome === "answered" && (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  )}
                  {a?.outcome === "low-confidence" && (
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  )}
                  {a?.outcome === "refused" && (
                    <ShieldX className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                  )}
                  {a?.outcome === "escalated" && (
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Knowledge gaps snapshot */}
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Knowledge gaps
            </span>
            <Badge variant="yellow" className="text-[10px]">
              {gaps.length} {gaps.length === 1 ? "gap" : "gaps"}
            </Badge>
          </div>
          {gaps.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No gaps detected — every question was answered above threshold.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {gaps.slice(0, 4).map((g) => (
                <div key={g.id} className="flex items-start gap-3 px-4 py-2.5">
                  <div className="mt-0.5 shrink-0">
                    {g.reason === "refused" && (
                      <ShieldX className="h-3.5 w-3.5 text-rose-500" />
                    )}
                    {g.reason === "low-confidence" && (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    )}
                    {g.reason === "thumbs-down" && (
                      <ThumbsDown className="h-3.5 w-3.5 text-amber-500" />
                    )}
                    {g.reason === "escalated" && (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] text-foreground">
                      &ldquo;{g.question}&rdquo;
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      Asked {g.count}× ·{" "}
                      {g.exampleAskers.slice(0, 2).join(", ")}
                    </div>
                  </div>
                </div>
              ))}
              {gaps.length > 4 && (
                <div className="px-4 py-2 text-[11px] text-muted-foreground">
                  + {gaps.length - 4} more
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CTA to full Admin Insights */}
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-foreground">
            Need the full picture?
          </div>
          <div className="mt-0.5 text-[13px] text-muted-foreground">
            View the complete activity log, question clusters, and automation
            candidates in Admin Insights.
          </div>
        </div>
        <Link href="/entrata-experts/?view=insights">
          <Button className="gap-1.5">
            Open Admin Insights
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

function CompactStat({
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
          tone ? toneClasses[tone] : "text-foreground"
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
      {delta && (
        <div className="mt-0.5 text-xs text-muted-foreground">{delta}</div>
      )}
    </div>
  );
}
