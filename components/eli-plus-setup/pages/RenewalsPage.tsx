"use client"

import { useState } from "react"
import type { PageId } from "../index"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowLeft, CalendarDays, CheckCircle2, Sparkles } from "lucide-react"
import { PROPERTIES } from "../data/properties"
import { PropertyFilter, usePropertyFilter } from "../components/PropertyFilter"
import { isValidDays, RENEWAL_DEFAULT_DAYS } from "../components/RenewalLeadTimeSheetContent"
import { AgentTabBar, VoiceTab, TestAgentTab, PromptTab, EscalationsTab, ReportingTab, VOICES, type AgentTopTab, type ChatScenario } from "../components/AgentTabs"

const RENEWALS_SCENARIOS: ChatScenario[] = [
  {
    label: "Renewal inquiry",
    messages: [
      { role: "eli",      text: "Hi! I'm ELI from Sunset Property Group. Your lease is coming up for renewal in about 4 months and I wanted to reach out early. Are you thinking about renewing?" },
      { role: "prospect", text: "I'm not sure yet. What would my new rent be?" },
      { role: "eli",      text: "Your renewal offer will be ready about 90 days before your lease ends. I can flag you to receive it the moment it's available. Would that be helpful?" },
      { role: "prospect", text: "Yes, please do that." },
      { role: "eli",      text: "Done — I've noted your interest and you'll be notified as soon as the renewal offer is generated. In the meantime, is there anything about your current unit or community that's on your mind?" },
    ],
  },
  {
    label: "Renewal terms question",
    messages: [
      { role: "eli",      text: "Hi! I'm ELI. I'm reaching out because your lease renewal is coming up. Have you had a chance to review the offer we sent?" },
      { role: "prospect", text: "I got it. The rent increase feels high — is that negotiable?" },
      { role: "eli",      text: "I understand — rent adjustments can be surprising. I'm not able to modify the offer directly, but I can connect you with your leasing manager who handles renewal negotiations. Would you like me to set that up?" },
      { role: "prospect", text: "Yes, please." },
      { role: "eli",      text: "I'll reach out to your leasing manager and ask them to contact you within 1 business day to discuss your renewal terms. You'll hear from them at the number on file." },
    ],
  },
  {
    label: "Move-out notice",
    messages: [
      { role: "eli",      text: "Hi! I'm ELI. I'm reaching out about your upcoming lease renewal. Is now a good time?" },
      { role: "prospect", text: "Actually, I've decided not to renew. I'm moving out." },
      { role: "eli",      text: "Thanks for letting me know. I'll note your intent to vacate. To make the move-out process smooth, your lease requires a written notice — typically 30–60 days in advance. Would you like me to connect you with your property manager to confirm the exact notice requirement?" },
      { role: "prospect", text: "Yes, and I want to know about my security deposit." },
      { role: "eli",      text: "Your property manager can walk you through the move-out checklist and security deposit timeline. I'll send them a note now to reach out within 24 hours. Is the number on file the best way to reach you?" },
    ],
  },
]

interface Props {
  navigate: (to: PageId) => void
  days: Record<string, string>
  onChange: (id: string, val: string) => void
}

function DaysTable({ days, onChange }: { days: Record<string, string>; onChange: (id: string, val: string) => void }) {
  const { search, setSearch, group, setGroup, filtered } = usePropertyFilter()
  const filledCount = Object.values(days).filter(isValidDays).length

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <PropertyFilter
          search={search}
          onSearchChange={setSearch}
          group={group}
          onGroupChange={setGroup}
          resultCount={filtered.length}
          totalCount={PROPERTIES.length}
        />
        <span className="text-xs text-muted-foreground tabular-nums shrink-0 ml-2">
          {filledCount} / {PROPERTIES.length}
        </span>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">No properties match.</div>
        ) : (
          filtered.map((prop, idx) => {
            const val = days[prop.id] ?? ""
            const valid = isValidDays(val)
            return (
              <div
                key={prop.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 border-b border-border last:border-0",
                  idx % 2 === 0 ? "bg-white" : "bg-zinc-50/50",
                )}
              >
                <div className="w-36 shrink-0">
                  <p className="text-sm font-medium text-foreground truncate">{prop.name}</p>
                  <p className="text-xs text-muted-foreground">{prop.city}, {prop.state}</p>
                </div>
                <div className="relative flex-1 flex items-center gap-2">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" aria-hidden />
                  <input
                    type="number"
                    min="1"
                    max="365"
                    placeholder="120"
                    value={val}
                    onChange={(e) => onChange(prop.id, e.target.value)}
                    className="w-full h-8 rounded-lg border border-border bg-white pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                  <span className="text-xs text-muted-foreground shrink-0">days</span>
                </div>
                <div className="w-6 shrink-0 flex justify-center">
                  {valid && <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export function RenewalsPage({ navigate, days, onChange }: Props) {
  const [saved, setSaved] = useState(false)
  const [topTab, setTopTab] = useState<AgentTopTab>("configure")
  const [selectedVoice, setSelectedVoice] = useState("riley")
  const voiceName = VOICES.find(v => v.id === selectedVoice)?.name ?? "Riley"
  const filledCount = Object.values(days).filter(isValidDays).length
  const allFilled = filledCount === PROPERTIES.length
  const pct = Math.round((filledCount / PROPERTIES.length) * 100)

  function handleSave() { setSaved(true) }

  return (
    <div className="p-6 md:p-8 space-y-5">
      <div>
        <button
          type="button"
          onClick={() => navigate("overview")}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1 -ml-2 text-muted-foreground mb-3")}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Overview
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Renewals AI</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure renewal outreach timing, select a voice, and test how ELI handles renewal conversations.
        </p>
      </div>

      {/* Coming Soon Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
        <span className="text-amber-500 mt-0.5 shrink-0">🚧</span>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-amber-900">Coming soon — new updates to settings</p>
          <p className="text-sm text-amber-800">
            In the meantime, you can{" "}
            <a href="#" className="underline underline-offset-2 font-medium hover:text-amber-900">
              update your settings here
            </a>
            .
          </p>
        </div>
      </div>

      {/* Tab content — hidden while coming soon banner is active */}
    </div>
  )
}
