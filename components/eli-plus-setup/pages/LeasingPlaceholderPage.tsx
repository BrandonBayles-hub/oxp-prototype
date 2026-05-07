"use client"

import type { PageId } from "../index"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react"

interface Props { navigate: (to: PageId) => void }

export function LeasingPlaceholderPage({ navigate }: Props) {
  return (
    <div className="p-6 md:p-8 max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leasing AI</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure lead routing, response templates, and qualification criteria for AI-assisted leasing.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Setting groups</p>
          <p className="text-xl font-semibold mt-1">6</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Needs review</p>
          <p className="text-xl font-semibold mt-1 text-amber-600">2</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Properties</p>
          <p className="text-xl font-semibold mt-1">52</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration groups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 pt-0">
          {[
            { label: "Lead source routing", status: "prefilled" },
            { label: "Response time targets", status: "needs_review" },
            { label: "Qualification criteria", status: "prefilled" },
            { label: "Handoff triggers", status: "needs_review" },
            { label: "Appointment scheduling", status: "prefilled" },
            { label: "Follow-up cadence", status: "prefilled" },
          ].map((g) => (
            <div key={g.label} className="flex items-center gap-3 py-2 border-b border-border/60 last:border-0">
              <Badge variant={g.status === "needs_review" ? "yellow" : "gray"}>
                {g.status === "needs_review" ? "Review" : "Pre-filled"}
              </Badge>
              <span className="text-sm text-foreground">{g.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
