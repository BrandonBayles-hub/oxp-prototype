import { Card, CardContent, CardHeader, CardTitle } from "@sandbox-components/ui/card"
import { Badge } from "@sandbox-components/ui/badge"
import { EmptyState } from "@sandbox-components/composite/EmptyState"
import { Skeleton } from "@sandbox-components/ui/skeleton"
import { Lock, Users } from "lucide-react"
import type { AgentAdoptionRow, AdoptionStatus, AdoptionRole, ViewState } from "../types"

interface AdoptionAgentTableProps {
  rows: AgentAdoptionRow[]
  role: AdoptionRole
  viewState: ViewState
}

const STATUS_BADGE: Record<AdoptionStatus, { label: string; variant: "green" | "yellow" | "orange" | "red" }> = {
  strong:         { label: "Strong",   variant: "green" },
  watch:          { label: "Watch",    variant: "yellow" },
  needs_coaching: { label: "Coaching", variant: "orange" },
  at_risk:        { label: "At Risk",  variant: "red" },
}

const AGENT_VISIBLE_ROLES: AdoptionRole[] = ["property_manager", "regional_manager", "corporate_admin"]

export function AdoptionAgentTable({ rows, role, viewState }: AdoptionAgentTableProps) {
  const canSeeAgents = AGENT_VISIBLE_ROLES.includes(role)

  if (!canSeeAgents) {
    return (
      <Card>
        <CardHeader><CardTitle>Agent / Team Breakdown</CardTitle></CardHeader>
        <CardContent>
          <EmptyState
            icon={Lock}
            title="Agent-level data restricted"
            description="Your current role only shows your own activity. Contact your administrator to enable team-level reporting."
          />
        </CardContent>
      </Card>
    )
  }

  if (viewState === "loading") {
    return (
      <Card>
        <CardHeader><CardTitle>Agent / Team Breakdown</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (viewState === "empty" || rows.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Agent / Team Breakdown</CardTitle></CardHeader>
        <CardContent>
          <EmptyState
            icon={Users}
            title="No agent data available"
            description="No activity recorded for agents in the selected filters and date range."
          />
        </CardContent>
      </Card>
    )
  }

  const visibleRows = role === "property_manager"
    ? rows.filter(r => r.propertyName === rows[0]?.propertyName)
    : rows

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Agent / Team Breakdown</CardTitle>
        <span className="text-xs text-muted-foreground">{visibleRows.length} agents</span>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Agent</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Score</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Active Days</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Prospects</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Convos</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Emails</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">SMS</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Calls</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Tasks Done</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Overdue</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Median Time</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(agent => {
                const status = STATUS_BADGE[agent.adoptionStatus]
                return (
                  <tr key={agent.agentId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium">{agent.agentName}</div>
                      <div className="text-xs text-muted-foreground">{agent.propertyName}</div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold">{agent.adoptionScore}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{agent.activeUsageDays}/30</td>
                    <td className="px-3 py-3 text-right tabular-nums">{agent.prospectsAssisted}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{agent.conversationsTouched}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{agent.emailsSent}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{agent.smsSent}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{agent.callsDialed}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{agent.tasksCompleted}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <span className={agent.overdueTaskCount > 8 ? "text-destructive font-semibold" : ""}>
                        {agent.overdueTaskCount}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{agent.medianTimeHrs} hrs</td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
