"use client";
import * as React from "react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
  LineChart,
  Line,
  Cell,
} from "recharts";
import type { Artifact as ArtifactType } from "@/lib/entrata-experts-v2/types";
import { Mail, Download, Copy, BookmarkPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TONE_BG: Record<string, string> = {
  good: "bg-emerald-50 text-emerald-900 border-emerald-200",
  warn: "bg-amber-50 text-amber-900 border-amber-200",
  alert: "bg-rose-50 text-rose-900 border-rose-200",
  info: "bg-sky-50 text-sky-900 border-sky-200",
};

export function Artifact({ artifact, compact = false }: { artifact: ArtifactType; compact?: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">{artifact.title}</div>
          {artifact.subtitle && (
            <div className="mt-0.5 truncate text-xs text-muted-foreground">{artifact.subtitle}</div>
          )}
        </div>
        {!compact && (
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Save to Insights">
              <BookmarkPlus className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Copy">
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Export">
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
      <div className="p-4">
        {artifact.kind === "table" && <TableArtifact a={artifact} />}
        {artifact.kind === "bar-chart" && <BarArtifact a={artifact} />}
        {artifact.kind === "line-chart" && <LineArtifact a={artifact} />}
        {artifact.kind === "kpi-strip" && <KpiStrip a={artifact} />}
        {artifact.kind === "draft-email" && <EmailArtifact a={artifact} />}
      </div>
    </div>
  );
}

function TableArtifact({ a }: { a: ArtifactType }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {a.columns?.map((c) => (
              <th key={c} className="whitespace-nowrap pb-2 pr-4 last:pr-0">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {a.rows?.map((row, i) => (
            <tr key={i} className="border-t border-border/60">
              {row.map((cell, j) => (
                <td key={j} className={cn("whitespace-nowrap py-2 pr-4 last:pr-0", j === 0 && "font-medium")}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const CHART_PRIMARY = "hsl(var(--chart-3))";
const CHART_NEGATIVE = "hsl(var(--chart-1))";
const CHART_LINE = "hsl(var(--chart-2))";
const AXIS_COLOR = "hsl(var(--muted-foreground))";

function BarArtifact({ a }: { a: ArtifactType }) {
  const data = a.series?.[0]?.data ?? [];
  return (
    <div className="-ml-4 h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 4 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="x"
            tick={{ fontSize: 11, fill: AXIS_COLOR }}
            interval={0}
            angle={-15}
            textAnchor="end"
            height={48}
          />
          <YAxis tick={{ fontSize: 11, fill: AXIS_COLOR }} width={50} />
          <RTooltip
            cursor={{ fill: "hsl(var(--muted))" }}
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
          />
          <Bar dataKey="y" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.y < 0 ? CHART_NEGATIVE : CHART_PRIMARY} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function LineArtifact({ a }: { a: ArtifactType }) {
  const data = a.series?.[0]?.data ?? [];
  return (
    <div className="-ml-4 h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 4 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="x" tick={{ fontSize: 11, fill: AXIS_COLOR }} />
          <YAxis tick={{ fontSize: 11, fill: AXIS_COLOR }} width={50} />
          <RTooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
          <Line
            type="monotone"
            dataKey="y"
            stroke={CHART_LINE}
            strokeWidth={2}
            dot={{ r: 3, fill: CHART_LINE }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function KpiStrip({ a }: { a: ArtifactType }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {a.kpis?.map((k, i) => (
        <div key={i} className={cn("rounded-md border px-3 py-2", TONE_BG[k.tone ?? "info"])}>
          <div className="text-[11px] uppercase tracking-wider opacity-80">{k.label}</div>
          <div className="mt-0.5 text-base font-semibold leading-tight">{k.value}</div>
          {k.delta && <div className="mt-0.5 text-[11px] opacity-75">{k.delta}</div>}
        </div>
      ))}
    </div>
  );
}

function EmailArtifact({ a }: { a: ArtifactType }) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Mail className="h-3.5 w-3.5" />
        <span>Draft</span>
      </div>
      <div className="border-b border-border pb-2">
        <div className="text-xs text-muted-foreground">To</div>
        <div className="font-medium">{a.emailTo}</div>
      </div>
      <div className="border-b border-border pb-2">
        <div className="text-xs text-muted-foreground">Subject</div>
        <div className="font-medium">{a.emailSubject}</div>
      </div>
      <div className="whitespace-pre-wrap text-[14px] leading-relaxed">{a.emailBody}</div>
    </div>
  );
}
