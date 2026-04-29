"use client"

import { useState } from "react"
import type { PageId } from "../index"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  ExternalLink,
  ChevronDown,
  GripVertical,
  ArrowRight,
  Copy,
  X,
} from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import type { TourPropertySettings } from "../components/TourTypesSheetContent"
import type { LeasingPoliciesState } from "../components/LeasingPoliciesSheetContent"
import { PROPERTIES } from "../data/properties"
import { Search } from "lucide-react"

type LeasingTab = "general" | "property" | "tours" | "policies" | "marketing"

const LEASING_TABS: { id: LeasingTab; label: string }[] = [
  { id: "general", label: "General Info" },
  { id: "property", label: "Property Info" },
  { id: "tours", label: "Tours" },
  { id: "policies", label: "Policies" },
  { id: "marketing", label: "Marketing" },
]

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const DEFAULT_OFFICE_HOURS: Record<string, { enabled: boolean; open: string; openPeriod: string; close: string; closePeriod: string }> = {
  Sunday:    { enabled: false, open: "",    openPeriod: "AM", close: "",    closePeriod: "AM" },
  Monday:    { enabled: true,  open: "08",  openPeriod: "AM", close: "06",  closePeriod: "PM" },
  Tuesday:   { enabled: true,  open: "08",  openPeriod: "AM", close: "05",  closePeriod: "PM" },
  Wednesday: { enabled: true,  open: "08",  openPeriod: "AM", close: "05",  closePeriod: "PM" },
  Thursday:  { enabled: true,  open: "08",  openPeriod: "AM", close: "05",  closePeriod: "PM" },
  Friday:    { enabled: true,  open: "08",  openPeriod: "AM", close: "05",  closePeriod: "PM" },
  Saturday:  { enabled: false, open: "",    openPeriod: "AM", close: "",    closePeriod: "AM" },
}

const TOUR_SCHEDULE_HOURS: Record<string, { enabled: boolean; open: string; openPeriod: string; close: string; closePeriod: string }> = {
  Sunday:    { enabled: false, open: "",    openPeriod: "AM", close: "",    closePeriod: "AM" },
  Monday:    { enabled: true,  open: "08",  openPeriod: "AM", close: "06",  closePeriod: "PM" },
  Tuesday:   { enabled: true,  open: "08",  openPeriod: "AM", close: "05",  closePeriod: "PM" },
  Wednesday: { enabled: true,  open: "08",  openPeriod: "AM", close: "05",  closePeriod: "PM" },
  Thursday:  { enabled: true,  open: "08",  openPeriod: "AM", close: "05",  closePeriod: "PM" },
  Friday:    { enabled: true,  open: "08",  openPeriod: "AM", close: "05",  closePeriod: "PM" },
  Saturday:  { enabled: false, open: "",    openPeriod: "AM", close: "",    closePeriod: "AM" },
}

const MODEL_UNIT_OPTIONS = [
  { value: "t10-d", label: "T10 - D" },
  { value: "t10-a", label: "T10 - A" },
  { value: "t20-b", label: "T20 - B" },
  { value: "t30-c", label: "T30 - C" },
]

const ADDITIONAL_PROPERTY_SETTINGS = [
  { id: "contact-points", label: "Contact Points", description: "Status Change and Appointment contact points were disabled for Lead and Applicant contact points to enable your agent to handle those tasks." },
  { id: "eli-permissions", label: "ELI+ Dashboard Permissions", description: "This feature is only required for users who directly manage the ELI+ console. Permission users for the Dashboard." },
  { id: "ivr", label: "IVR", description: "" },
  { id: "notifications", label: "Notifications", description: "" },
  { id: "primary-phones", label: "Primary Phone Numbers", description: "" },
  { id: "property-amenities", label: "Property Amenities", description: "" },
]

const TOUR_ADDITIONAL_SETTINGS = [
  { id: "manage-tours", label: "Manage Tours" },
  { id: "manage-calendar", label: "Manage Calendar" },
]

interface Props {
  navigate: (to: PageId) => void
  showToast: (message: string) => void
  agentGoals: Record<string, string>
  onAgentGoalChange: (id: string, val: string) => void
  modelUnits: Record<string, string>
  onModelUnitChange: (id: string, val: string) => void
  tourSettings: Record<string, TourPropertySettings>
  onTourSettingChange: (id: string, field: keyof TourPropertySettings, val: string | boolean) => void
  tourPriority: Record<string, string[]>
  onTourPriorityChange: (propId: string, priority: string[]) => void
  leasingPolicies: LeasingPoliciesState
  onLeasingPolicyChange: (policyId: string, propertyId: string, val: string) => void
  campusProximity: Record<string, string>
  onCampusProximityChange: (id: string, val: string) => void
  studySpaces: Record<string, string>
  onStudySpacesChange: (id: string, val: string) => void
  semesterLeases: Record<string, string>
  onSemesterLeasesChange: (id: string, val: string) => void
  immediateMovein: Record<string, string>
  onImmediateMoveinChange: (id: string, val: string) => void
}

export function LeasingPage({ navigate, showToast }: Props) {
  const [activeTab, setActiveTab] = useState<LeasingTab>("general")
  const [propertyPickerOpen, setPropertyPickerOpen] = useState(false)
  const [selectedProperties, setSelectedProperties] = useState<string[]>(() => PROPERTIES.map(p => p.id))
  const [agentGoal, setAgentGoal] = useState("schedule-tour")
  const [officeHours, setOfficeHours] = useState(DEFAULT_OFFICE_HOURS)
  const [tourHoursMode, setTourHoursMode] = useState<"business" | "custom">("business")
  const [tourScheduleHours, setTourScheduleHours] = useState(TOUR_SCHEDULE_HOURS)
  const [selectedModelUnits, setSelectedModelUnits] = useState<string[]>(["t10-d"])
  const [modelUnitDropdownOpen, setModelUnitDropdownOpen] = useState(false)

  const [agentTourEnabled, setAgentTourEnabled] = useState(true)
  const [agentTourLength, setAgentTourLength] = useState("45")
  const [agentTourInstructions, setAgentTourInstructions] = useState("")

  const [selfGuidedEnabled, setSelfGuidedEnabled] = useState(true)
  const [selfGuidedProvider, setSelfGuidedProvider] = useState<"entrata" | "external">("external")
  const [selfGuidedLink, setSelfGuidedLink] = useState("https://1155bartonspringsv2.prospectportal.com/")
  const [selfGuidedLength, setSelfGuidedLength] = useState("60")
  const [selfGuidedInstructions, setSelfGuidedInstructions] = useState("")

  const [virtualTourEnabled, setVirtualTourEnabled] = useState(true)
  const [virtualProvider, setVirtualProvider] = useState<"entrata" | "external">("entrata")

  const [tourPriorityOrder, setTourPriorityOrder] = useState(["self-guided", "agent", "virtual"])
  const [draggedTourId, setDraggedTourId] = useState<string | null>(null)
  const [dragOverTourId, setDragOverTourId] = useState<string | null>(null)

  const [propertyAddress] = useState({
    country: "United States",
    address1: "4205 Chapel Ridge Road",
    address2: "",
    address3: "",
    city: "Lehi",
    state: "Utah",
    zip: "84043",
    timezone: "Mountain Time (GMT -0700)",
  })

  function updateOfficeHour(day: string, field: string, value: string | boolean) {
    setOfficeHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }))
  }

  function updateTourScheduleHour(day: string, field: string, value: string | boolean) {
    setTourScheduleHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }))
  }

  function handleTourDragStart(id: string) { setDraggedTourId(id) }
  function handleTourDragEnd() { setDraggedTourId(null); setDragOverTourId(null) }
  function handleTourDragOver(e: React.DragEvent, id: string) {
    e.preventDefault()
    if (id !== draggedTourId) setDragOverTourId(id)
  }
  function handleTourDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    if (!draggedTourId || draggedTourId === targetId) return
    const newOrder = [...tourPriorityOrder]
    const fromIdx = newOrder.indexOf(draggedTourId)
    const toIdx = newOrder.indexOf(targetId)
    newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, draggedTourId)
    setTourPriorityOrder(newOrder)
    setDraggedTourId(null)
    setDragOverTourId(null)
  }

  const TOUR_TYPE_LABELS: Record<string, string> = {
    "self-guided": "Self Guided Tour",
    agent: "Agent Tour",
    virtual: "Virtual tour",
  }

  function toggleModelUnit(unitId: string) {
    setSelectedModelUnits(prev =>
      prev.includes(unitId) ? prev.filter(u => u !== unitId) : [...prev, unitId]
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top header with back link + tab bar */}
      <div className="shrink-0 border-b border-border bg-card">
        <div className="px-6 md:px-8 pt-4 pb-0 space-y-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("leasing")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3 w-3" aria-hidden />
              Leasing AI
            </button>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-sm font-semibold text-foreground">API Support</span>
            <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Active</span>
          </div>
          <nav className="flex items-center gap-0" aria-label="Leasing AI settings">
            {LEASING_TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium transition-colors relative",
                  activeTab === tab.id
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 rounded-full" />
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Property selector */}
      <div className="shrink-0 px-6 md:px-8 py-3 border-b border-border bg-zinc-50/50">
        <div className="relative inline-block">
          <button
            type="button"
            onClick={() => setPropertyPickerOpen(true)}
            className="h-9 flex items-center gap-2 rounded-lg border border-border bg-white pl-3 pr-3 text-sm text-foreground hover:border-zinc-400 transition-colors"
          >
            <span>
              {selectedProperties.length === PROPERTIES.length
                ? "All Properties"
                : `${selectedProperties.length} Properties`}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          </button>
        </div>
      </div>

      {/* Property picker modal */}
      {propertyPickerOpen && (
        <PropertyPickerModal
          selected={selectedProperties}
          onApply={(ids) => { setSelectedProperties(ids); setPropertyPickerOpen(false) }}
          onClose={() => setPropertyPickerOpen(false)}
        />
      )}

      {/* Scrollable content area */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {activeTab === "general" && <GeneralInfoTab agentGoal={agentGoal} onAgentGoalChange={setAgentGoal} officeHours={officeHours} onOfficeHourChange={updateOfficeHour} />}
        {activeTab === "property" && <PropertyInfoTab address={propertyAddress} />}
        {activeTab === "tours" && (
          <ToursTab
            tourHoursMode={tourHoursMode}
            onTourHoursModeChange={setTourHoursMode}
            tourScheduleHours={tourScheduleHours}
            onTourScheduleHourChange={updateTourScheduleHour}
            selectedModelUnits={selectedModelUnits}
            modelUnitDropdownOpen={modelUnitDropdownOpen}
            onModelUnitDropdownToggle={() => setModelUnitDropdownOpen(!modelUnitDropdownOpen)}
            onToggleModelUnit={toggleModelUnit}
            agentTourEnabled={agentTourEnabled}
            onAgentTourToggle={() => setAgentTourEnabled(!agentTourEnabled)}
            agentTourLength={agentTourLength}
            onAgentTourLengthChange={setAgentTourLength}
            agentTourInstructions={agentTourInstructions}
            onAgentTourInstructionsChange={setAgentTourInstructions}
            selfGuidedEnabled={selfGuidedEnabled}
            onSelfGuidedToggle={() => setSelfGuidedEnabled(!selfGuidedEnabled)}
            selfGuidedProvider={selfGuidedProvider}
            onSelfGuidedProviderChange={setSelfGuidedProvider}
            selfGuidedLink={selfGuidedLink}
            onSelfGuidedLinkChange={setSelfGuidedLink}
            selfGuidedLength={selfGuidedLength}
            onSelfGuidedLengthChange={setSelfGuidedLength}
            selfGuidedInstructions={selfGuidedInstructions}
            onSelfGuidedInstructionsChange={setSelfGuidedInstructions}
            virtualTourEnabled={virtualTourEnabled}
            onVirtualTourToggle={() => setVirtualTourEnabled(!virtualTourEnabled)}
            virtualProvider={virtualProvider}
            onVirtualProviderChange={setVirtualProvider}
            tourPriorityOrder={tourPriorityOrder}
            tourTypeLabels={TOUR_TYPE_LABELS}
            draggedTourId={draggedTourId}
            dragOverTourId={dragOverTourId}
            onTourDragStart={handleTourDragStart}
            onTourDragEnd={handleTourDragEnd}
            onTourDragOver={handleTourDragOver}
            onTourDrop={handleTourDrop}
          />
        )}
        {activeTab === "policies" && <PoliciesTab />}
        {activeTab === "marketing" && <MarketingTab />}
      </div>
    </div>
  )
}

/* ─── Property Picker Modal ─────────────────────────────────────────── */

function PropertyPickerModal({
  selected,
  onApply,
  onClose,
}: {
  selected: string[]
  onApply: (ids: string[]) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState("")
  const [draft, setDraft] = useState<Set<string>>(() => new Set(selected))

  const available = PROPERTIES.filter(
    p => !draft.has(p.id) && p.name.toLowerCase().includes(search.toLowerCase())
  )
  const selectedProps = PROPERTIES.filter(p => draft.has(p.id))

  function addProperty(id: string) { setDraft(prev => new Set([...prev, id])) }
  function removeProperty(id: string) { setDraft(prev => { const n = new Set(prev); n.delete(id); return n }) }
  function addAll() { setDraft(new Set(PROPERTIES.map(p => p.id))) }
  function removeAll() { setDraft(new Set()) }

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className="fixed inset-0 bg-black/25 z-40"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-border w-full max-w-2xl max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4">
            <h2 className="text-lg font-bold text-foreground">Properties</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search */}
          <div className="px-6 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden />
              <input
                type="text"
                placeholder="Search Properties"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-white pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
              />
            </div>
          </div>

          {/* Two-column layout */}
          <div className="flex-1 min-h-0 px-6 pb-4 flex gap-4">
            {/* Available */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground">Available Properties</p>
                <button
                  type="button"
                  onClick={addAll}
                  className="flex items-center gap-1 text-xs font-bold text-foreground hover:underline"
                >
                  Add All <span className="text-xs">+</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-zinc-50/50 min-h-[200px]">
                {available.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                    {search ? "No matching properties" : "All properties selected"}
                  </div>
                ) : (
                  available.map(prop => (
                    <button
                      key={prop.id}
                      type="button"
                      onClick={() => addProperty(prop.id)}
                      className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-white border-b border-border last:border-0 transition-colors"
                    >
                      {prop.name}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Selected */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground">Selected Properties</p>
                <button
                  type="button"
                  onClick={removeAll}
                  className="flex items-center gap-1 text-xs font-bold text-foreground hover:underline"
                >
                  Remove All <X className="h-3 w-3" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto rounded-lg border border-border min-h-[200px]">
                {selectedProps.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-muted-foreground">No properties selected</div>
                ) : (
                  selectedProps.map(prop => (
                    <div
                      key={prop.id}
                      className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0"
                    >
                      <span className="text-sm text-foreground">{prop.name}</span>
                      <button
                        type="button"
                        onClick={() => removeProperty(prop.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 px-6 py-4 border-t border-border flex justify-end">
            <button
              type="button"
              onClick={() => onApply([...draft])}
              className={cn(buttonVariants({ variant: "default" }), "bg-zinc-900 hover:bg-zinc-800 text-white rounded-full px-6")}
            >
              Apply Filter
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ─── General Info Tab ──────────────────────────────────────────────── */

function GeneralInfoTab({
  agentGoal,
  onAgentGoalChange,
  officeHours,
  onOfficeHourChange,
}: {
  agentGoal: string
  onAgentGoalChange: (val: string) => void
  officeHours: Record<string, { enabled: boolean; open: string; openPeriod: string; close: string; closePeriod: string }>
  onOfficeHourChange: (day: string, field: string, value: string | boolean) => void
}) {
  return (
    <div className="p-6 md:p-8 max-w-3xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">General Info</h1>
          <p className="text-sm text-muted-foreground mt-1">General settings specific to the AI Agent.</p>
        </div>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          View Help Article
        </button>
      </div>

      {/* Agent Goal */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Agent Goal</h2>
        <p className="text-sm text-muted-foreground">Primary focus</p>
        <div className="relative max-w-sm">
          <select
            value={agentGoal}
            onChange={(e) => onAgentGoalChange(e.target.value)}
            className="w-full h-10 appearance-none rounded-lg border border-border bg-white pl-3 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
          >
            <option value="schedule-tour">Schedule a Tour</option>
            <option value="fill-application">Fill Application</option>
            <option value="answer-questions">Answer Questions</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
      </div>

      {/* Office Hours */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Office Hours</h2>
          <button type="button" className="p-1.5 rounded-md hover:bg-accent transition-colors" aria-label="Copy hours">
            <Copy className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-zinc-50/60">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-36"></th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-8"></th>
                <th className="text-center text-xs font-medium text-muted-foreground px-4 py-2.5">Opens</th>
                <th className="text-center text-xs font-medium text-muted-foreground px-4 py-2.5">Closes</th>
              </tr>
            </thead>
            <tbody>
              {DAYS_OF_WEEK.map(day => {
                const h = officeHours[day]
                return (
                  <tr key={day} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-sm text-foreground">{day}</td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        onClick={() => onOfficeHourChange(day, "enabled", !h.enabled)}
                        className={cn(
                          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0",
                          h.enabled ? "bg-blue-500" : "bg-zinc-200",
                        )}
                      >
                        <span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform", h.enabled ? "translate-x-4" : "translate-x-0.5")} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-center">
                        <input
                          type="text"
                          placeholder="hh"
                          maxLength={2}
                          value={h.open}
                          onChange={(e) => onOfficeHourChange(day, "open", e.target.value)}
                          disabled={!h.enabled}
                          className={cn(
                            "w-10 h-8 text-center rounded-md border border-border text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20",
                            !h.enabled && "bg-zinc-100 text-muted-foreground/50"
                          )}
                        />
                        <span className="text-muted-foreground text-xs">:</span>
                        <input
                          type="text"
                          placeholder="mm"
                          maxLength={2}
                          value="00"
                          disabled={!h.enabled}
                          className={cn(
                            "w-10 h-8 text-center rounded-md border border-border text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20",
                            !h.enabled && "bg-zinc-100 text-muted-foreground/50"
                          )}
                          readOnly
                        />
                        <span className={cn(
                          "text-xs font-medium px-1.5 py-0.5 rounded",
                          h.enabled ? "text-blue-600 bg-blue-50" : "text-muted-foreground/50 bg-zinc-100"
                        )}>
                          {h.openPeriod}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-center">
                        <input
                          type="text"
                          placeholder="hh"
                          maxLength={2}
                          value={h.close}
                          onChange={(e) => onOfficeHourChange(day, "close", e.target.value)}
                          disabled={!h.enabled}
                          className={cn(
                            "w-10 h-8 text-center rounded-md border border-border text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20",
                            !h.enabled && "bg-zinc-100 text-muted-foreground/50"
                          )}
                        />
                        <span className="text-muted-foreground text-xs">:</span>
                        <input
                          type="text"
                          placeholder="mm"
                          maxLength={2}
                          value="00"
                          disabled={!h.enabled}
                          className={cn(
                            "w-10 h-8 text-center rounded-md border border-border text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20",
                            !h.enabled && "bg-zinc-100 text-muted-foreground/50"
                          )}
                          readOnly
                        />
                        <span className={cn(
                          "text-xs font-medium px-1.5 py-0.5 rounded",
                          h.enabled ? "text-blue-600 bg-blue-50" : "text-muted-foreground/50 bg-zinc-100"
                        )}>
                          {h.closePeriod}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ─── Property Info Tab ─────────────────────────────────────────────── */

function PropertyInfoTab({
  address,
}: {
  address: {
    country: string
    address1: string
    address2: string
    address3: string
    city: string
    state: string
    zip: string
    timezone: string
  }
}) {
  return (
    <div className="p-6 md:p-8 max-w-3xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Property Info</h1>
          <p className="text-sm text-muted-foreground mt-1">General property settings</p>
        </div>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          View Help Article
        </button>
      </div>

      {/* Primary Address */}
      <div className="space-y-5">
        <h2 className="text-base font-semibold text-foreground">Primary Address</h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground">
              <span className="text-red-500">*</span> Country
            </label>
            <div className="relative mt-1.5">
              <select
                defaultValue={address.country}
                className="w-full max-w-sm h-10 appearance-none rounded-lg border border-border bg-white pl-3 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
              >
                <option>United States</option>
                <option>Canada</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">
              <span className="text-red-500">*</span> Address Line 1
            </label>
            <input
              type="text"
              defaultValue={address.address1}
              className="mt-1.5 w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">Address Line 2</label>
            <input
              type="text"
              placeholder="Enter address line 2"
              defaultValue={address.address2}
              className="mt-1.5 w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">Address Line 3</label>
            <input
              type="text"
              placeholder="Enter address line 3"
              defaultValue={address.address3}
              className="mt-1.5 w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">
              <span className="text-red-500">*</span> City
            </label>
            <input
              type="text"
              defaultValue={address.city}
              className="mt-1.5 w-full max-w-xs h-10 rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1 max-w-[180px]">
              <label className="text-xs font-medium text-foreground">
                <span className="text-red-500">*</span> State
              </label>
              <div className="relative mt-1.5">
                <select
                  defaultValue={address.state}
                  className="w-full h-10 appearance-none rounded-lg border border-border bg-white pl-3 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                >
                  <option>Utah</option>
                  <option>California</option>
                  <option>Texas</option>
                  <option>Colorado</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
              </div>
            </div>
            <div className="flex-1 max-w-[120px]">
              <label className="text-xs font-medium text-foreground">
                <span className="text-red-500">*</span> Zip Code
              </label>
              <input
                type="text"
                defaultValue={address.zip}
                className="mt-1.5 w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">
              <span className="text-red-500">*</span> Timezone
            </label>
            <div className="relative mt-1.5">
              <select
                defaultValue={address.timezone}
                className="w-full max-w-sm h-10 appearance-none rounded-lg border border-border bg-white pl-3 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
              >
                <option>Mountain Time (GMT -0700)</option>
                <option>Pacific Time (GMT -0800)</option>
                <option>Central Time (GMT -0600)</option>
                <option>Eastern Time (GMT -0500)</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            </div>
          </div>
        </div>
      </div>

      {/* Additional Settings */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Additional Settings</h2>
        <p className="text-sm text-muted-foreground">
          To help ELI+ to preform to the next level review and configure communication &amp; amenity settings.
        </p>

        <div className="space-y-3">
          {ADDITIONAL_PROPERTY_SETTINGS.map(setting => (
            <div key={setting.id} className="rounded-xl border border-border bg-white overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-zinc-50/60 transition-colors"
              >
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">{setting.label}</p>
                  {setting.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-lg">{setting.description}</p>
                  )}
                </div>
                <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 ml-3">
                  <ArrowRight className="h-4 w-4 text-white" />
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Tours Tab ─────────────────────────────────────────────────────── */

function ToursTab({
  tourHoursMode,
  onTourHoursModeChange,
  tourScheduleHours,
  onTourScheduleHourChange,
  selectedModelUnits,
  modelUnitDropdownOpen,
  onModelUnitDropdownToggle,
  onToggleModelUnit,
  agentTourEnabled,
  onAgentTourToggle,
  agentTourLength,
  onAgentTourLengthChange,
  agentTourInstructions,
  onAgentTourInstructionsChange,
  selfGuidedEnabled,
  onSelfGuidedToggle,
  selfGuidedProvider,
  onSelfGuidedProviderChange,
  selfGuidedLink,
  onSelfGuidedLinkChange,
  selfGuidedLength,
  onSelfGuidedLengthChange,
  selfGuidedInstructions,
  onSelfGuidedInstructionsChange,
  virtualTourEnabled,
  onVirtualTourToggle,
  virtualProvider,
  onVirtualProviderChange,
  tourPriorityOrder,
  tourTypeLabels,
  draggedTourId,
  dragOverTourId,
  onTourDragStart,
  onTourDragEnd,
  onTourDragOver,
  onTourDrop,
}: {
  tourHoursMode: "business" | "custom"
  onTourHoursModeChange: (mode: "business" | "custom") => void
  tourScheduleHours: Record<string, { enabled: boolean; open: string; openPeriod: string; close: string; closePeriod: string }>
  onTourScheduleHourChange: (day: string, field: string, value: string | boolean) => void
  selectedModelUnits: string[]
  modelUnitDropdownOpen: boolean
  onModelUnitDropdownToggle: () => void
  onToggleModelUnit: (unitId: string) => void
  agentTourEnabled: boolean
  onAgentTourToggle: () => void
  agentTourLength: string
  onAgentTourLengthChange: (val: string) => void
  agentTourInstructions: string
  onAgentTourInstructionsChange: (val: string) => void
  selfGuidedEnabled: boolean
  onSelfGuidedToggle: () => void
  selfGuidedProvider: "entrata" | "external"
  onSelfGuidedProviderChange: (val: "entrata" | "external") => void
  selfGuidedLink: string
  onSelfGuidedLinkChange: (val: string) => void
  selfGuidedLength: string
  onSelfGuidedLengthChange: (val: string) => void
  selfGuidedInstructions: string
  onSelfGuidedInstructionsChange: (val: string) => void
  virtualTourEnabled: boolean
  onVirtualTourToggle: () => void
  virtualProvider: "entrata" | "external"
  onVirtualProviderChange: (val: "entrata" | "external") => void
  tourPriorityOrder: string[]
  tourTypeLabels: Record<string, string>
  draggedTourId: string | null
  dragOverTourId: string | null
  onTourDragStart: (id: string) => void
  onTourDragEnd: () => void
  onTourDragOver: (e: React.DragEvent, id: string) => void
  onTourDrop: (e: React.DragEvent, id: string) => void
}) {
  const LENGTH_OPTIONS = ["15", "20", "30", "45", "60", "75", "90", "120"]

  return (
    <div className="p-6 md:p-8 max-w-3xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tours</h1>
        </div>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          View Help Article
        </button>
      </div>

      {/* Tour Schedule Hours */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Tour Schedule Hours</h2>
        <p className="text-sm text-muted-foreground">These are the hours that tours can be scheduled.</p>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Hours of Availability</p>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="tour-hours-mode"
                checked={tourHoursMode === "business"}
                onChange={() => onTourHoursModeChange("business")}
                className="h-3.5 w-3.5 accent-emerald-600"
              />
              <span className="text-sm text-foreground">Use Business Hours</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="tour-hours-mode"
                checked={tourHoursMode === "custom"}
                onChange={() => onTourHoursModeChange("custom")}
                className="h-3.5 w-3.5 accent-emerald-600"
              />
              <span className="text-sm text-foreground">Set Custom Hours</span>
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-zinc-50/60 transition-colors"
          >
            <p className="text-sm font-semibold text-foreground">Manage Business Hours</p>
            <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
              <ArrowRight className="h-4 w-4 text-white" />
            </div>
          </button>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-zinc-50/60">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-36"></th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-8"></th>
                <th className="text-center text-xs font-medium text-muted-foreground px-4 py-2.5">Opens</th>
                <th className="text-center text-xs font-medium text-muted-foreground px-4 py-2.5">Closes</th>
              </tr>
            </thead>
            <tbody>
              {DAYS_OF_WEEK.map(day => {
                const h = tourScheduleHours[day]
                return (
                  <tr key={day} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-sm text-foreground">{day}</td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        onClick={() => onTourScheduleHourChange(day, "enabled", !h.enabled)}
                        className={cn(
                          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0",
                          h.enabled ? "bg-blue-500" : "bg-zinc-200",
                        )}
                      >
                        <span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform", h.enabled ? "translate-x-4" : "translate-x-0.5")} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-center">
                        <input
                          type="text"
                          placeholder="hh"
                          maxLength={2}
                          value={h.open}
                          onChange={(e) => onTourScheduleHourChange(day, "open", e.target.value)}
                          disabled={!h.enabled}
                          className={cn(
                            "w-10 h-8 text-center rounded-md border border-border text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20",
                            !h.enabled && "bg-zinc-100 text-muted-foreground/50"
                          )}
                        />
                        <span className="text-muted-foreground text-xs">:</span>
                        <input
                          type="text"
                          placeholder="mm"
                          maxLength={2}
                          value="00"
                          disabled={!h.enabled}
                          className={cn(
                            "w-10 h-8 text-center rounded-md border border-border text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20",
                            !h.enabled && "bg-zinc-100 text-muted-foreground/50"
                          )}
                          readOnly
                        />
                        <span className={cn(
                          "text-xs font-medium px-1.5 py-0.5 rounded",
                          h.enabled ? "text-blue-600 bg-blue-50" : "text-muted-foreground/50 bg-zinc-100"
                        )}>
                          {h.openPeriod}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-center">
                        <input
                          type="text"
                          placeholder="hh"
                          maxLength={2}
                          value={h.close}
                          onChange={(e) => onTourScheduleHourChange(day, "close", e.target.value)}
                          disabled={!h.enabled}
                          className={cn(
                            "w-10 h-8 text-center rounded-md border border-border text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20",
                            !h.enabled && "bg-zinc-100 text-muted-foreground/50"
                          )}
                        />
                        <span className="text-muted-foreground text-xs">:</span>
                        <input
                          type="text"
                          placeholder="mm"
                          maxLength={2}
                          value="00"
                          disabled={!h.enabled}
                          className={cn(
                            "w-10 h-8 text-center rounded-md border border-border text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20",
                            !h.enabled && "bg-zinc-100 text-muted-foreground/50"
                          )}
                          readOnly
                        />
                        <span className={cn(
                          "text-xs font-medium px-1.5 py-0.5 rounded",
                          h.enabled ? "text-blue-600 bg-blue-50" : "text-muted-foreground/50 bg-zinc-100"
                        )}>
                          {h.closePeriod}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground italic">Note: Tours will be scheduled during these hours.</p>
      </div>

      {/* Model Units */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Model Units</h2>
        <p className="text-sm text-muted-foreground">
          These are units that will be used for tours scheduled by your agent.
        </p>

        <div className="relative max-w-sm">
          <button
            type="button"
            onClick={onModelUnitDropdownToggle}
            className="w-full h-10 flex items-center justify-between rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
          >
            <span>{selectedModelUnits.length} units selected</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
          </button>
          {modelUnitDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-full bg-white border border-border rounded-lg shadow-lg z-10 py-1">
              {MODEL_UNIT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onToggleModelUnit(opt.value)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 text-sm text-left"
                >
                  <input
                    type="checkbox"
                    checked={selectedModelUnits.includes(opt.value)}
                    readOnly
                    className="h-3.5 w-3.5 accent-zinc-900"
                  />
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {selectedModelUnits.map(unitId => {
            const label = MODEL_UNIT_OPTIONS.find(o => o.value === unitId)?.label ?? unitId
            return (
              <span
                key={unitId}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-zinc-50 px-2 py-1 text-xs text-foreground"
              >
                {label}
                <button type="button" onClick={() => onToggleModelUnit(unitId)} className="hover:text-red-500 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          })}
        </div>
      </div>

      {/* Tour Types */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Tour Types</h2>
        <p className="text-sm text-muted-foreground">
          Types of tours that Leasing AI will help schedule for each property
        </p>

        {/* Agent Tour */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onAgentTourToggle}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0",
                  agentTourEnabled ? "bg-emerald-500" : "bg-zinc-200",
                )}
              >
                <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow transition-transform", agentTourEnabled ? "translate-x-5.5" : "translate-x-0.5")} />
              </button>
              <span className="text-sm font-semibold text-foreground">Agent Tour</span>
            </div>
            <button type="button" className="p-1.5 rounded-md hover:bg-accent transition-colors" aria-label="Sync">
              <Copy className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {agentTourEnabled && (
            <div className="ml-14 space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground">
                  <span className="text-red-500">*</span>Tour Length
                </label>
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    type="text"
                    value={agentTourLength}
                    onChange={(e) => onAgentTourLengthChange(e.target.value)}
                    className="w-16 h-10 text-center rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                  <div className="relative">
                    <select
                      defaultValue="minutes"
                      className="h-10 appearance-none rounded-lg border border-border bg-white pl-3 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">
                  <span className="text-red-500">*</span>Guided tour instructions <span className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full border border-muted-foreground/40 text-[9px] text-muted-foreground cursor-help">i</span>
                </label>
                <textarea
                  value={agentTourInstructions}
                  onChange={(e) => onAgentTourInstructionsChange(e.target.value)}
                  placeholder="Enter guided tour instructions"
                  rows={4}
                  className={cn(
                    "mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 resize-none",
                    !agentTourInstructions ? "border-red-300" : "border-border"
                  )}
                />
                {!agentTourInstructions && (
                  <p className="text-xs text-red-500 mt-1">Guided tour instructions are required</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Self Guided Tour */}
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onSelfGuidedToggle}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0",
                  selfGuidedEnabled ? "bg-emerald-500" : "bg-zinc-200",
                )}
              >
                <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow transition-transform", selfGuidedEnabled ? "translate-x-5.5" : "translate-x-0.5")} />
              </button>
              <span className="text-sm font-semibold text-foreground">Self Guided Tour</span>
            </div>
            <button type="button" className="p-1.5 rounded-md hover:bg-accent transition-colors" aria-label="Sync">
              <Copy className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {selfGuidedEnabled && (
            <div className="ml-14 space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="self-guided-provider"
                    checked={selfGuidedProvider === "entrata"}
                    onChange={() => onSelfGuidedProviderChange("entrata")}
                    className="h-3.5 w-3.5 accent-emerald-600"
                  />
                  <span className="text-sm text-foreground">Entrata</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="self-guided-provider"
                    checked={selfGuidedProvider === "external"}
                    onChange={() => onSelfGuidedProviderChange("external")}
                    className="h-3.5 w-3.5 accent-emerald-600"
                  />
                  <span className="text-sm text-foreground">External Company</span>
                </label>
              </div>

              {selfGuidedProvider === "external" && (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-zinc-50 px-3 py-2">
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
                  <input
                    type="url"
                    value={selfGuidedLink}
                    onChange={(e) => onSelfGuidedLinkChange(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-foreground focus:outline-none"
                  />
                  <button type="button" className="p-1 hover:bg-accent rounded transition-colors" aria-label="Copy link">
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-foreground">
                  <span className="text-red-500">*</span>Tour Length
                </label>
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    type="text"
                    value={selfGuidedLength}
                    onChange={(e) => onSelfGuidedLengthChange(e.target.value)}
                    className="w-16 h-10 text-center rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                  <div className="relative">
                    <select
                      defaultValue="minutes"
                      className="h-10 appearance-none rounded-lg border border-border bg-white pl-3 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">
                  <span className="text-red-500">*</span>Guided tour instructions <span className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full border border-muted-foreground/40 text-[9px] text-muted-foreground cursor-help">i</span>
                </label>
                <textarea
                  value={selfGuidedInstructions}
                  onChange={(e) => onSelfGuidedInstructionsChange(e.target.value)}
                  placeholder="Enter guided tour instructions"
                  rows={4}
                  className={cn(
                    "mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 resize-none",
                    !selfGuidedInstructions ? "border-red-300" : "border-border"
                  )}
                />
                {!selfGuidedInstructions && (
                  <p className="text-xs text-red-500 mt-1">Guided tour instructions are required</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Virtual Tour */}
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onVirtualTourToggle}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0",
                  virtualTourEnabled ? "bg-emerald-500" : "bg-zinc-200",
                )}
              >
                <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow transition-transform", virtualTourEnabled ? "translate-x-5.5" : "translate-x-0.5")} />
              </button>
              <span className="text-sm font-semibold text-foreground">Virtual Tour</span>
            </div>
            <button type="button" className="p-1.5 rounded-md hover:bg-accent transition-colors" aria-label="Sync">
              <Copy className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {virtualTourEnabled && (
            <div className="ml-14 space-y-3">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="virtual-provider"
                    checked={virtualProvider === "entrata"}
                    onChange={() => onVirtualProviderChange("entrata")}
                    className="h-3.5 w-3.5 accent-emerald-600"
                  />
                  <span className="text-sm text-foreground">Entrata</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="virtual-provider"
                    checked={virtualProvider === "external"}
                    onChange={() => onVirtualProviderChange("external")}
                    className="h-3.5 w-3.5 accent-emerald-600"
                  />
                  <span className="text-sm text-foreground">External Company</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tour Priority */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Tour Priority</h2>
        <p className="text-sm text-muted-foreground">
          Top card being the highest priority bottom card being the lowest
        </p>

        <div className="rounded-xl border border-border overflow-hidden">
          {tourPriorityOrder.map((id) => (
            <div
              key={id}
              draggable
              onDragStart={() => onTourDragStart(id)}
              onDragOver={(e) => onTourDragOver(e, id)}
              onDrop={(e) => onTourDrop(e, id)}
              onDragEnd={onTourDragEnd}
              className={cn(
                "flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-0 cursor-grab active:cursor-grabbing select-none transition-colors bg-white",
                draggedTourId === id && "opacity-40 bg-zinc-50",
                dragOverTourId === id && draggedTourId !== id && "bg-blue-50 border-l-2 border-l-blue-400",
              )}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" aria-hidden />
              <span className="text-sm text-foreground">{tourTypeLabels[id] ?? id}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Settings */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Additional Settings</h2>
        <p className="text-sm text-muted-foreground">
          To help ELI+ to preform to the next level review and configure all tour and calendar settings.
        </p>

        <div className="space-y-3">
          {TOUR_ADDITIONAL_SETTINGS.map(setting => (
            <div key={setting.id} className="rounded-xl border border-border bg-white overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-zinc-50/60 transition-colors"
              >
                <p className="text-sm font-semibold text-foreground">{setting.label}</p>
                <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
                  <ArrowRight className="h-4 w-4 text-white" />
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Policies Tab ──────────────────────────────────────────────────── */

const LEASING_POLICIES_CONFIG = [
  { id: "pet",                 label: "Pet",                  description: "Communicate pet fees, restrictions, and breed policies to prospects.",        defaultValue: "Pet policy = 50 dollars" },
  { id: "parking",             label: "Parking",              description: "Answer questions about parking availability and costs.",                      defaultValue: "Test" },
  { id: "smoking",             label: "Smoking",              description: "Communicate smoking restrictions and related fees.",                          defaultValue: "Test" },
  { id: "renters-insurance",   label: "Renters Insurance",    description: "Explain insurance requirements and coverage amounts to prospects.",           defaultValue: "Test" },
  { id: "utility-policy",      label: "Utility Policy",       description: "Inform tenants which utilities are included in rent.",                       defaultValue: "Test" },
  { id: "background-checks",   label: "Background Checks",    description: "Set clear expectations about the screening process.",                        defaultValue: "Test" },
  { id: "deposit",             label: "Deposit",              description: "Communicate deposit amounts and refund policies.",                           defaultValue: "Test" },
  { id: "application",         label: "Application",          description: "Guide prospects through the application process.",                           defaultValue: "Test" },
  { id: "income-requirements", label: "Income Requirements",  description: "Qualify prospects based on income-to-rent ratios.",                          defaultValue: "Test" },
  { id: "section-8",           label: "Section 8",            description: "Communicate voucher acceptance and coordination process.",                   defaultValue: "Test" },
]

function PoliciesTab() {
  const [policyValues, setPolicyValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(LEASING_POLICIES_CONFIG.map(p => [p.id, p.defaultValue]))
  )

  return (
    <div className="p-6 md:p-8 max-w-3xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Policies</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage the policies your agent will reference</p>
        </div>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          View Help Article
        </button>
      </div>

      {LEASING_POLICIES_CONFIG.map(policy => (
        <div key={policy.id} className="space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">{policy.label}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{policy.description}</p>
            </div>
            <button type="button" className="p-1.5 rounded-md hover:bg-accent transition-colors shrink-0 mt-0.5" aria-label="Broadcast setting">
              <Copy className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <textarea
            value={policyValues[policy.id] ?? ""}
            onChange={(e) => setPolicyValues(prev => ({ ...prev, [policy.id]: e.target.value }))}
            rows={3}
            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 resize-none"
          />
        </div>
      ))}
    </div>
  )
}

/* ─── Marketing Tab ─────────────────────────────────────────────────── */

function MarketingTab() {
  const [websiteSource, setWebsiteSource] = useState<"prospect-portal" | "3rd-party">("3rd-party")
  const [propertyWebsite, setPropertyWebsite] = useState("https://1155bartonspringsv2.prospectportal.com/")
  const [privacyPolicy, setPrivacyPolicy] = useState("https://www.greystar.com/renters-rights-resources")
  const [applicationPage, setApplicationPage] = useState("")
  const [floorPlanPage, setFloorPlanPage] = useState("https://1155bartonspringsv2.prospectportal.com/")

  return (
    <div className="p-6 md:p-8 max-w-3xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Marketing</h1>
        </div>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          View Help Article
        </button>
      </div>

      {/* Websites */}
      <div className="space-y-5">
        <h2 className="text-base font-semibold text-foreground">Websites</h2>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="website-source"
              checked={websiteSource === "prospect-portal"}
              onChange={() => setWebsiteSource("prospect-portal")}
              className="h-3.5 w-3.5 accent-emerald-600"
            />
            <span className="text-sm text-foreground">Prospect Portal</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="website-source"
              checked={websiteSource === "3rd-party"}
              onChange={() => setWebsiteSource("3rd-party")}
              className="h-3.5 w-3.5 accent-emerald-600"
            />
            <span className="text-sm text-foreground">3rd Party</span>
          </label>
        </div>

        {/* Property Website */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">
            <span className="text-red-500">*</span> Property Website
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-zinc-50 px-3 py-2">
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
            <input
              type="url"
              value={propertyWebsite}
              onChange={(e) => setPropertyWebsite(e.target.value)}
              className="flex-1 bg-transparent text-sm text-foreground focus:outline-none"
            />
            <button type="button" className="p-1 hover:bg-accent rounded transition-colors" aria-label="Clear">
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Privacy Policy */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">
            <span className="text-red-500">*</span> Privacy Policy
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-zinc-50 px-3 py-2">
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
            <input
              type="url"
              value={privacyPolicy}
              onChange={(e) => setPrivacyPolicy(e.target.value)}
              className="flex-1 bg-transparent text-sm text-foreground focus:outline-none"
            />
            <button type="button" className="p-1 hover:bg-accent rounded transition-colors" aria-label="Clear">
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Application Page */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Application Page</label>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2">
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
            <input
              type="url"
              value={applicationPage}
              onChange={(e) => setApplicationPage(e.target.value)}
              placeholder="Enter Application Page url"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
          </div>
        </div>

        {/* Floor Plan Page */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Floor plan Page</label>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-zinc-50 px-3 py-2">
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
            <input
              type="url"
              value={floorPlanPage}
              onChange={(e) => setFloorPlanPage(e.target.value)}
              className="flex-1 bg-transparent text-sm text-foreground focus:outline-none"
            />
            <button type="button" className="p-1 hover:bg-accent rounded transition-colors" aria-label="Clear">
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Copy Code */}
        <div className="space-y-3 pt-2">
          <p className="text-sm text-muted-foreground">Copy this code and use it so chat can show on your 3rd party website</p>
          <button
            type="button"
            className={cn(buttonVariants({ variant: "default" }), "bg-zinc-900 hover:bg-zinc-800 text-white rounded-full px-5 gap-2")}
          >
            Copy Code
            <Copy className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
