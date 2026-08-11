import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@sandbox-components/ui/card"
import { Badge } from "@sandbox-components/ui/badge"
import { Button } from "@sandbox-components/ui/button"
import { EmptyState } from "@sandbox-components/composite/EmptyState"
import { Skeleton } from "@sandbox-components/ui/skeleton"
import { Building2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import type { PropertyAdoptionRow, AdoptionStatus, ViewState } from "../types"

interface AdoptionPropertyTableProps {
  rows: PropertyAdoptionRow[]
  viewState: ViewState
  onPropertyClick?: (propertyId: string) => void
}

type SortKey = keyof Pick<PropertyAdoptionRow, "adoptionScore" | "humanFollowUpRate" | "taskCompletionRate" | "medianTimeHrs" | "overdueTaskCount">
type SortDir = "asc" | "desc"

const STATUS_BADGE: Record<AdoptionStatus, { label: string; variant: "green" | "yellow" | "orange" | "red" }> = {
  strong:         { label: "Strong",   variant: "green" },
  watch:          { label: "Watch",    variant: "yellow" },
  needs_coaching: { label: "Coaching", variant: "orange" },
  at_risk:        { label: "At Risk",  variant: "red" },
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="h-3 w-3 opacity-40" />
  return sortDir === "asc"
    ? <ArrowUp className="h-3 w-3 text-primary" />
    : <ArrowDown className="h-3 w-3 text-primary" />
}

export function AdoptionPropertyTable({ rows, viewState, onPropertyClick }: AdoptionPropertyTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("adoptionScore")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => d === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  if (viewState === "loading") {
    return (
      <Card>
        <CardHeader><CardTitle>Property Comparison</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (viewState === "empty" || rows.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Property Comparison</CardTitle></CardHeader>
        <CardContent>
          <EmptyState
            icon={Building2}
            title="No properties to compare"
            description="No adoption data available for the selected filters and date range."
          />
        </CardContent>
      </Card>
    )
  }

  const sorted = [...rows].sort((a, b) => {
    const aVal = a[sortKey]
    const bVal = b[sortKey]
    const dir = sortDir === "asc" ? 1 : -1
    return (aVal < bVal ? -1 : aVal > bVal ? 1 : 0) * dir
  })

  const cols: { key: SortKey; label: string; align: "left" | "right" }[] = [
    { key: "adoptionScore",      label: "Score",       align: "right" },
    { key: "humanFollowUpRate",  label: "Follow-Up",   align: "right" },
    { key: "taskCompletionRate", label: "Task Rate",   align: "right" },
    { key: "medianTimeHrs",      label: "Median Time", align: "right" },
    { key: "overdueTaskCount",   label: "Overdue",     align: "right" },
  ]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Property Comparison</CardTitle>
        <span className="text-xs text-muted-foreground">{rows.length} properties</span>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Property</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Emails</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">SMS</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Calls</th>
                {cols.map(col => (
                  <th key={col.key} className="px-3 py-3 text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground gap-1"
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                      <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                    </Button>
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(row => {
                const status = STATUS_BADGE[row.adoptionStatus]
                return (
                  <tr
                    key={row.propertyId}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => onPropertyClick?.(row.propertyId)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.propertyName}</div>
                      <div className="text-xs text-muted-foreground">{row.region} · {row.agentCount} agents</div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{row.emailsSent.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{row.smsSent.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{row.callsDialed}</td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold">{row.adoptionScore}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <span className={row.humanFollowUpRate < 75 ? "text-destructive font-medium" : ""}>
                        {row.humanFollowUpRate}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <span className={row.taskCompletionRate >= 80 ? "text-success" : "text-warning"}>
                        {row.taskCompletionRate}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{row.medianTimeHrs} hrs</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <span className={row.overdueTaskCount > 15 ? "text-destructive font-semibold" : ""}>
                        {row.overdueTaskCount}
                      </span>
                    </td>
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
