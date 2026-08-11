import { useState } from "react"
import { StatCard } from "@sandbox-components/composite/StatCard"
import { StatsRow } from "@sandbox-components/composite/StatsRow"
import { Card, CardContent, CardHeader, CardTitle } from "@sandbox-components/ui/card"
import { Badge } from "@sandbox-components/ui/badge"
import { Button } from "@sandbox-components/ui/button"
import { Alert, AlertDescription } from "@sandbox-components/ui/alert"
import { EmptyState } from "@sandbox-components/composite/EmptyState"
import { Skeleton } from "@sandbox-components/ui/skeleton"
import {
  AreaChart, Area, BarChart, Bar, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import {
  TrendingUp, Mail, MessageSquare, Phone, CheckSquare,
  AlertTriangle, Clock, Users, Activity, Download,
  BarChart3, RefreshCw, Info,
} from "lucide-react"
import type { ViewState, AdoptionStatus, AdoptionRole } from "../types"
import {
  portfolioAdoptionMetrics,
  outboundTrend,
  taskAgingBuckets,
  followUpTrend,
  propertyRows,
  agentRows,
  staleHandoffs,
} from "../data/adoption-sample-data"
import { AdoptionPropertyTable } from "./AdoptionPropertyTable"
import { AdoptionAgentTable } from "./AdoptionAgentTable"

interface AdoptionViewProps {
  viewState: ViewState
  role: AdoptionRole
}

const ADOPTION_STATUS_CONFIG: Record<AdoptionStatus, { label: string; badgeVariant: "green" | "yellow" | "orange" | "red"; scoreColor: string }> = {
  strong:         { label: "Strong Adoption",  badgeVariant: "green",  scoreColor: "text-success" },
  watch:          { label: "Watch",            badgeVariant: "yellow", scoreColor: "text-warning" },
  needs_coaching: { label: "Needs Coaching",   badgeVariant: "orange", scoreColor: "text-orange-600" },
  at_risk:        { label: "At Risk",          badgeVariant: "red",    scoreColor: "text-destructive" },
}

const TASK_AGING_COLORS = ["hsl(var(--warning))", "hsl(var(--warning))", "hsl(var(--error))", "hsl(var(--error))", "hsl(var(--error))"]

function DeltaLabel({ value, suffix = "%", inverse = false }: { value: number; suffix?: string; inverse?: boolean }) {
  const isPositive = inverse ? value < 0 : value > 0
  const isNegative = inverse ? value > 0 : value < 0
  const color = isPositive ? "text-success" : isNegative ? "text-destructive" : "text-muted-foreground"
  const prefix = value > 0 ? "▲" : value < 0 ? "▼" : "—"
  return (
    <span className={`text-xs font-medium ${color}`}>
      {prefix} {Math.abs(value)}{suffix} vs prior
    </span>
  )
}

export function AdoptionView({ viewState, role }: AdoptionViewProps) {
  const [overdueOpen, setOverdueOpen] = useState(false)
  const [csvToast, setCsvToast] = useState(false)

  const handleExport = () => {
    setCsvToast(true)
    setTimeout(() => setCsvToast(false), 3000)
  }

  if (viewState === "loading") {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  if (viewState === "error") {
    return (
      <Card>
        <CardContent className="py-16">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <div>
              <h3 className="text-lg font-semibold">Failed to load adoption data</h3>
              <p className="text-sm text-muted-foreground mt-1">Could not connect to the analytics service. Please try again.</p>
            </div>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (viewState === "empty") {
    return (
      <EmptyState
        icon={BarChart3}
        title="No adoption data for this period"
        description="No agent activity was recorded for the selected date range and filters. Try expanding the date range or adjusting your filters."
      />
    )
  }

  const m = portfolioAdoptionMetrics
  const statusConfig = ADOPTION_STATUS_CONFIG[m.adoptionStatus]

  return (
    <div className="space-y-6">
      {csvToast && (
        <Alert>
          <Download className="h-4 w-4" />
          <AlertDescription>CSV export downloaded successfully.</AlertDescription>
        </Alert>
      )}

      {/* Adoption Score Hero */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="relative flex-shrink-0">
              <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
                <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <circle
                  cx="40" cy="40" r="34" fill="none"
                  stroke={m.adoptionStatus === "strong" ? "hsl(var(--success))" : m.adoptionStatus === "watch" ? "hsl(var(--warning))" : "hsl(var(--error))"}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${(m.adoptionScore / 100) * 213.6} 213.6`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-bold ${statusConfig.scoreColor}`}>{m.adoptionScore}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-lg font-semibold">Agent Adoption Score</h3>
                <Badge variant={statusConfig.badgeVariant}>{statusConfig.label}</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <DeltaLabel value={m.adoptionScoreDelta} suffix=" pts" />
                <span>·</span>
                <span>{propertyRows.filter(r => r.adoptionStatus === "needs_coaching" || r.adoptionStatus === "at_risk").length} properties need attention</span>
              </div>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wide">Task Completion</span>
                  <div className="font-semibold text-success">{m.taskCompletionRate}%</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wide">Follow-Up Rate</span>
                  <div className={`font-semibold ${m.humanFollowUpRate < m.humanFollowUpRateSlaTarget ? "text-destructive" : "text-success"}`}>
                    {m.humanFollowUpRate}%
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wide">Median Response</span>
                  <div className="font-semibold">{m.medianTimeToFirstActionHrs} hrs</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wide">Active Usage</span>
                  <div className="font-semibold">{m.activeUsageDays}/{m.totalPossibleDays} days</div>
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={handleExport} className="flex-shrink-0">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards — Row 1: Communication */}
      <StatsRow columns={4}>
        <StatCard
          title="Emails Sent"
          value={m.emailsSent.toLocaleString()}
          change={m.emailsSentDelta}
          icon={Mail}
        />
        <StatCard
          title="SMS Sent"
          value={m.smsSent.toLocaleString()}
          change={m.smsSentDelta}
          icon={MessageSquare}
        />
        <StatCard
          title="Calls Dialed"
          value={m.callsDialed.toLocaleString()}
          change={m.callsDialedDelta}
          icon={Phone}
        />
        <StatCard
          title="Agent-Assisted Prospects"
          value={`${m.agentAssistedProspects} (${m.agentAssistedProspectRate}%)`}
          change={0}
          icon={Users}
        />
      </StatsRow>

      {/* KPI Cards — Row 2: Follow-through */}
      <StatsRow columns={4}>
        <StatCard
          title="Task Completion Rate"
          value={`${m.taskCompletionRate}%`}
          change={m.taskCompletionRateDelta}
          icon={CheckSquare}
        />
        <StatCard
          title="Human Follow-Up Rate"
          value={`${m.humanFollowUpRate}%`}
          change={m.humanFollowUpRateDelta}
          icon={Activity}
        />
        <StatCard
          title="Median Time to Action"
          value={`${m.medianTimeToFirstActionHrs} hrs`}
          change={-m.medianTimeToFirstActionDelta}
          icon={Clock}
        />
        <StatCard
          title="Overdue Tasks"
          value={m.overdueTaskCount.toString()}
          change={-m.overdueTaskCountDelta}
          icon={AlertTriangle}
        />
      </StatsRow>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Outbound Activity
              <Badge variant="outline">Email · SMS · Calls</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={outboundTrend} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend iconSize={10} />
                <Area type="monotone" dataKey="emails" name="Emails" stroke="hsl(var(--chart-teal))" fill="hsl(var(--chart-teal))" fillOpacity={0.15} strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="sms"    name="SMS"    stroke="hsl(var(--chart-coral))" fill="hsl(var(--chart-coral))" fillOpacity={0.15} strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="calls"  name="Calls"  stroke="hsl(var(--chart-amber))" fill="hsl(var(--chart-amber))" fillOpacity={0.15} strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Overdue Task Aging
              <Button variant="ghost" size="sm" onClick={() => setOverdueOpen(o => !o)}>
                {overdueOpen ? "Hide detail" : "View tasks"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={taskAgingBuckets} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: number) => [v, "Tasks"]} />
                <Bar dataKey="count" name="Tasks" radius={[4, 4, 0, 0]}>
                  {taskAgingBuckets.map((bucket, i) => (
                    <Cell key={bucket.label} fill={TASK_AGING_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Follow-up rate + Stale handoffs */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Human Follow-Up Rate
              <span className="text-xs font-normal text-muted-foreground">Target: {m.humanFollowUpRateSlaTarget}%</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={followUpTrend} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis domain={[40, 90]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip formatter={(v: number) => [`${v}%`, "Follow-Up Rate"]} />
                <Line type="monotone" dataKey="followUpRate" name="Follow-Up Rate" stroke="hsl(var(--chart-teal))" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="slaTarget" name="Target" stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Info className="h-3 w-3" />
              A low touch rate may indicate healthy AI resolution. Interpret alongside AI automation rates.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Missed / Stale Handoffs
              <Badge variant="red">{staleHandoffs.length} stale</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {staleHandoffs.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No stale handoffs — great work!</div>
            ) : (
              <div className="divide-y">
                {staleHandoffs.map(h => (
                  <div key={h.handoffId} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/30 cursor-pointer transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{h.prospectName}</div>
                      <div className="text-xs text-muted-foreground">{h.propertyName} · {h.assignedAgent}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge variant={h.hoursStale > 8 ? "red" : "orange"} className="text-xs">
                        {h.hoursStale.toFixed(1)} hrs stale
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">{h.handoffReason.replace(/_/g, " ")}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue task drill-down (toggleable) */}
      {overdueOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Overdue Tasks — Detail</span>
              <Button variant="ghost" size="sm" onClick={() => setOverdueOpen(false)}>Close</Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y text-sm">
              {taskAgingBuckets.map(bucket => (
                <div key={bucket.label} className="flex items-center justify-between py-3">
                  <span className="text-muted-foreground">{bucket.label}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(bucket.count / m.overdueTaskCount) * 100}%`,
                          background: bucket.color === "error" ? "hsl(var(--error))" : "hsl(var(--warning))",
                        }}
                      />
                    </div>
                    <span className={`font-semibold w-6 text-right ${bucket.color === "error" ? "text-destructive" : "text-warning"}`}>
                      {bucket.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">Click a task row to open the task detail view.</p>
          </CardContent>
        </Card>
      )}

      {/* Property comparison table */}
      <AdoptionPropertyTable rows={propertyRows} viewState={viewState} />

      {/* Agent table (permission-gated) */}
      <AdoptionAgentTable rows={agentRows} role={role} viewState={viewState} />

      {/* Follow-up rate context note */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-4 flex items-start gap-3">
          <TrendingUp className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Interpreting adoption metrics:</strong> A low human touch rate may indicate healthy AI resolution rather than poor adoption. Always interpret these metrics alongside AI automation rates and escalation trends from the Dashboard tab.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
