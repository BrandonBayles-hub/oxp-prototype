"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const CONFIRMATION_GROUPS = [
  { label: "Rent charge & due dates", count: 24, status: "needs_review" as const },
  { label: "Payment block day", count: 24, status: "needs_review" as const },
  { label: "Grace period & late fees", count: 24, status: "prefilled" as const },
  { label: "Payment methods accepted", count: 24, status: "prefilled" as const },
  { label: "Payment plan availability", count: 18, status: "prefilled" as const },
  { label: "Resident portal URL", count: 22, status: "needs_review" as const },
  { label: "Auto-pay settings", count: 24, status: "prefilled" as const },
]

export function PaymentsSheetContent() {
  const needsReview = CONFIRMATION_GROUPS.filter((g) => g.status === "needs_review").length

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">
          Most settings were pre-filled from your existing Entrata configuration. Review and confirm before activation.
        </p>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border bg-card px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground">Setting groups</p>
          <p className="text-lg font-semibold mt-0.5">{CONFIRMATION_GROUPS.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground">Needs review</p>
          <p className="text-lg font-semibold mt-0.5 text-amber-600">{needsReview}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground">Properties</p>
          <p className="text-lg font-semibold mt-0.5">24</p>
        </div>
      </div>

      {/* Configuration groups */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Configuration Groups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 pt-0 px-0">
          {CONFIRMATION_GROUPS.map((g) => (
            <div key={g.label} className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 last:border-0">
              <div className="flex items-center gap-2.5">
                <Badge variant={g.status === "needs_review" ? "yellow" : "gray"} className="text-[11px]">
                  {g.status === "needs_review" ? "Review" : "Pre-filled"}
                </Badge>
                <span className="text-sm text-foreground">{g.label}</span>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">{g.count} props</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* (Advanced view removed) */}
    </div>
  )
}
