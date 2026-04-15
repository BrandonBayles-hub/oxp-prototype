"use client"

import { useState } from "react"
import type { PageId } from "../index"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowLeft, Phone, AlertTriangle, CheckCircle2, Database } from "lucide-react"
import { PROPERTIES } from "../data/properties"
import { PropertyFilter, usePropertyFilter } from "../components/PropertyFilter"
import {
  ENTRATA_DURING_PHONES,
  ENTRATA_AFTER_PHONES,
  ENTRATA_DURING_PATH,
  ENTRATA_AFTER_PATH,
} from "../data/entrata-imports"
import { formatPhone, isValidPhone } from "../components/PhoneNumberSheetContent"
import { AgentTabBar, VoiceTab, TestAgentTab, PromptTab, EscalationsTab, ReportingTab, VOICES, type AgentTopTab, type ChatScenario } from "../components/AgentTabs"

const MAINTENANCE_SCENARIOS: ChatScenario[] = [
  {
    label: "Emergency request",
    messages: [
      { role: "eli",      text: "Hi, this is ELI from Sunset Property Group. I see you submitted an urgent maintenance request. Can you describe what's happening?" },
      { role: "prospect", text: "There's water pouring from my ceiling — it's coming from the unit above me." },
      { role: "eli",      text: "That sounds like a serious leak and I'm escalating this right now. I'm connecting you to your emergency maintenance line. Please stay on and gather anything valuable away from the area while we get someone out." },
      { role: "prospect", text: "How long will it take?" },
      { role: "eli",      text: "Emergency response targets within 2 hours. I'm sending your contact info and unit details to the on-call tech now. You'll get a call or text within 15 minutes to confirm arrival time." },
    ],
  },
  {
    label: "Repair status check",
    messages: [
      { role: "eli",      text: "Hi! I'm ELI. I can help you check the status of an open work order. Can you give me your name or unit number?" },
      { role: "prospect", text: "It's unit 214. I put in a request about my dishwasher two days ago." },
      { role: "eli",      text: "I see your work order for unit 214 — dishwasher not draining, submitted Tuesday. It's currently scheduled for Thursday between 10 AM and 2 PM. Does that work for you, or would you like to reschedule?" },
      { role: "prospect", text: "Thursday works. Do I need to be home?" },
      { role: "eli",      text: "For appliance repairs, our team does need access to the unit. If you can't be there, we can note that you've given permission to enter. Would you like me to add a permission to enter to the work order?" },
    ],
  },
  {
    label: "Non-emergency issue",
    messages: [
      { role: "eli",      text: "Hi! I'm ELI. What maintenance issue can I help you report today?" },
      { role: "prospect", text: "My bathroom faucet has been dripping for a few days." },
      { role: "eli",      text: "Got it — a dripping faucet in your bathroom. I'll create a work order for that right now. Would you prefer morning, afternoon, or no preference for scheduling?" },
      { role: "prospect", text: "Afternoons work best." },
      { role: "eli",      text: "I've logged the work order and noted afternoon availability. You'll get a confirmation with the scheduled window once it's assigned — typically within 1–2 business days for non-emergency requests." },
    ],
  },
]

interface Props {
  navigate: (to: PageId) => void
  duringPhones: Record<string, string>
  onDuringPhoneChange: (id: string, val: string) => void
  afterPhones: Record<string, string>
  onAfterPhoneChange: (id: string, val: string) => void
}

type TabId = "during" | "after"

const TABS: { id: TabId; label: string; hint: string; description: string; entrataValues: Record<string, string>; entrataPath: string }[] = [
  {
    id: "during",
    label: "During Escalation",
    hint: "Typically a 24/7 emergency maintenance line.",
    description: "The phone number ELI connects residents to while a maintenance escalation is actively in progress.",
    entrataValues: ENTRATA_DURING_PHONES,
    entrataPath: ENTRATA_DURING_PATH,
  },
  {
    id: "after",
    label: "After Escalation",
    hint: "Typically the property's main office or maintenance line.",
    description: "The phone number ELI uses for follow-up contacts after a maintenance escalation has been resolved.",
    entrataValues: ENTRATA_AFTER_PHONES,
    entrataPath: ENTRATA_AFTER_PATH,
  },
]

function PhoneTable({
  phones,
  onChange,
  entrataValues,
}: {
  phones: Record<string, string>
  onChange: (id: string, val: string) => void
  entrataValues: Record<string, string>
}) {
  const { search, setSearch, group, setGroup, filtered } = usePropertyFilter()
  const filledCount = Object.values(phones).filter(isValidPhone).length

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
            const val = phones[prop.id] ?? ""
            const valid = isValidPhone(val)
            const fromEntrata = entrataValues[prop.id] !== undefined
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
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" aria-hidden />
                  <input
                    type="tel"
                    placeholder="(555) 000-0000"
                    value={val}
                    onChange={(e) => onChange(prop.id, formatPhone(e.target.value))}
                    className={cn(
                      "w-full h-8 rounded-lg border bg-white pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2",
                      fromEntrata && valid
                        ? "border-indigo-300 focus:ring-indigo-400/30"
                        : "border-border focus:ring-zinc-900/20",
                    )}
                  />
                </div>
                <div className="w-28 shrink-0 flex justify-end">
                  {fromEntrata && valid ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 whitespace-nowrap">
                      <Database className="h-2.5 w-2.5" aria-hidden />
                      From Entrata
                    </span>
                  ) : valid ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
                  ) : null}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export function MaintenancePage({ navigate, duringPhones, onDuringPhoneChange, afterPhones, onAfterPhoneChange }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("during")
  const [topTab, setTopTab] = useState<AgentTopTab>("configure")
  const [selectedVoice, setSelectedVoice] = useState("morgan")
  const voiceName = VOICES.find(v => v.id === selectedVoice)?.name ?? "Morgan"

  const duringFilled = Object.values(duringPhones).filter(isValidPhone).length
  const afterFilled = Object.values(afterPhones).filter(isValidPhone).length
  const totalRequired = PROPERTIES.length * 2
  const totalFilled = duringFilled + afterFilled

  const activeTabData = TABS.find((t) => t.id === activeTab)!
  const phones = activeTab === "during" ? duringPhones : afterPhones
  const onPhoneChange = activeTab === "during" ? onDuringPhoneChange : onAfterPhoneChange

  const duringPending = PROPERTIES.length - duringFilled
  const afterPending = PROPERTIES.length - afterFilled

  const entrataCount = Object.keys(activeTabData.entrataValues).length

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
        <h1 className="text-2xl font-bold tracking-tight">Maintenance AI</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure escalation routing, select a voice, and test how ELI handles maintenance requests.
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
