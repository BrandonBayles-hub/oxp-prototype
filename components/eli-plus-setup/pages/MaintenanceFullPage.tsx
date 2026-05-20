"use client"

import { useState } from "react"
import type { PageId } from "../index"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  ChevronDown,
  ArrowRight,
  X,
  Search,
  Link as LinkIcon,
  Copy,
} from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { PROPERTIES } from "../data/properties"

type MaintenanceTab = "property" | "maintenance-info" | "marketing"

const MAINTENANCE_TABS: { id: MaintenanceTab; label: string }[] = [
  { id: "property", label: "Property Info" },
  { id: "maintenance-info", label: "Maintenance Info" },
  { id: "marketing", label: "Marketing" },
]

const ADDITIONAL_PROPERTY_SETTINGS = [
  { id: "contact-points", label: "Contact Points", description: "Review your maintenance related contact points to avoid sending duplicate communications to residents." },
  { id: "eli-permissions", label: "ELI+ Dashboard Permissions", description: "This feature is only required for users who directly manage the ELI+ console. Permission users for the Dashboard." },
  { id: "business-hours", label: "Business Hours", description: "" },
  { id: "ivr", label: "IVR", description: "" },
]

interface Props {
  navigate: (to: PageId) => void
  showToast: (message: string) => void
  variant?: "flyout"
  propertyName?: string
  agentLabel?: string
  onBack?: () => void
}

export function MaintenanceFullPage({ navigate, showToast, variant, propertyName, agentLabel, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<MaintenanceTab>("property")
  const [propertyPickerOpen, setPropertyPickerOpen] = useState(false)
  const [selectedProperties, setSelectedProperties] = useState<string[]>(() => PROPERTIES.map(p => p.id))

  const [propertyAddress] = useState({
    country: "United States",
    address1: "4205 Chapel Ridge Road",
    address2: "test address line Gonny and Yuriy 12",
    address3: "",
    city: "Lehi",
    state: "Utah",
    zip: "12341",
    timezone: "Eastern Time (GMT -0500)",
  })

  const tabContent = (
    <>
      {activeTab === "property" && <PropertyInfoTab address={propertyAddress} />}
      {activeTab === "maintenance-info" && <MaintenanceInfoTab />}
      {activeTab === "marketing" && <MarketingTab />}
    </>
  )

  if (variant === "flyout") {
    return (
      <div className="flex h-full">
        <aside className="w-52 shrink-0 border-r border-border bg-white overflow-y-auto">
          <div className="p-5">
            <button type="button" onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-3 w-3" aria-hidden />
              {agentLabel}
            </button>
            <div className="mt-4">
              <p className="text-base font-bold text-foreground">{propertyName}</p>
              <p className="text-xs text-emerald-600 mt-0.5">Active</p>
            </div>
            <nav className="mt-6 space-y-0.5">
              {MAINTENANCE_TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                    activeTab === tab.id
                      ? "bg-zinc-100 font-medium text-foreground"
                      : "text-muted-foreground hover:bg-zinc-50 hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>
        <main className="flex-1 min-w-0 overflow-y-auto">{tabContent}</main>
      </div>
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
              onClick={() => navigate("maintenance")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3 w-3" aria-hidden />
              Maintenance AI
            </button>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-sm font-semibold text-foreground">Colleen Conventional</span>
            <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Active</span>
          </div>
          <nav className="flex items-center gap-0" aria-label="Maintenance AI settings">
            {MAINTENANCE_TABS.map(tab => (
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
      <div className="flex-1 min-w-0 overflow-y-auto">{tabContent}</div>
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

          <div className="flex-1 min-h-0 px-6 pb-4 flex gap-4">
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground">Available Properties</p>
                <button type="button" onClick={addAll} className="flex items-center gap-1 text-xs font-bold text-foreground hover:underline">
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
                    <button key={prop.id} type="button" onClick={() => addProperty(prop.id)} className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-white border-b border-border last:border-0 transition-colors">
                      {prop.name}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground">Selected Properties</p>
                <button type="button" onClick={removeAll} className="flex items-center gap-1 text-xs font-bold text-foreground hover:underline">
                  Remove All <X className="h-3 w-3" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto rounded-lg border border-border min-h-[200px]">
                {selectedProps.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-muted-foreground">No properties selected</div>
                ) : (
                  selectedProps.map(prop => (
                    <div key={prop.id} className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0">
                      <span className="text-sm text-foreground">{prop.name}</span>
                      <button type="button" onClick={() => removeProperty(prop.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

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

/* ─── Maintenance Info Tab ──────────────────────────────────────────── */

function MaintenanceInfoTab() {
  const [duringHours, setDuringHours] = useState("8019007015")
  const [afterHours, setAfterHours] = useState("8019007015")

  return (
    <div className="p-6 md:p-8 max-w-3xl space-y-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Maintenance Info</h1>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">Maintenance Emergency</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Enter the phone numbers residents should call for maintenance requests during different times.</p>
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-foreground">During Hours</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-medium">+1</span>
              <input
                type="tel"
                value={duringHours}
                onChange={(e) => setDuringHours(e.target.value)}
                placeholder="Enter phone number"
                className="w-full max-w-xs h-10 rounded-lg border border-border bg-zinc-50 px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">After Hours</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-medium">+1</span>
              <input
                type="tel"
                value={afterHours}
                onChange={(e) => setAfterHours(e.target.value)}
                placeholder="Enter phone number"
                className="w-full max-w-xs h-10 rounded-lg border border-border bg-zinc-50 px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Marketing Tab ─────────────────────────────────────────────────── */

function MarketingTab() {
  const [websiteSource, setWebsiteSource] = useState<"prospect-portal" | "3rd-party">("3rd-party")
  const [propertyWebsite, setPropertyWebsite] = useState("https://aiontest.com")
  const [privacyPolicy, setPrivacyPolicy] = useState("https://elio5534534r.com")

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl space-y-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Marketing</h1>
        </div>
      </div>

      <div className="space-y-5">
        <h2 className="text-base font-semibold text-foreground">Websites</h2>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer" onClick={() => setWebsiteSource("prospect-portal")}>
            <span className={cn(
              "h-4 w-4 rounded-full border-2 flex items-center justify-center",
              websiteSource === "prospect-portal" ? "border-zinc-900" : "border-zinc-300"
            )}>
              {websiteSource === "prospect-portal" && <span className="h-2 w-2 rounded-full bg-zinc-900" />}
            </span>
            <span className="text-sm text-foreground">Prospect Portal</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer" onClick={() => setWebsiteSource("3rd-party")}>
            <span className={cn(
              "h-4 w-4 rounded-full border-2 flex items-center justify-center",
              websiteSource === "3rd-party" ? "border-emerald-500" : "border-zinc-300"
            )}>
              {websiteSource === "3rd-party" && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
            </span>
            <span className="text-sm text-foreground">3rd Party</span>
          </label>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-xs font-medium text-foreground">
              <span className="text-red-500">*</span>Property Website
            </label>
            <div className="mt-1.5 flex items-center gap-0 w-full max-w-lg">
              <div className="flex-1 flex items-center gap-2 h-10 rounded-lg border border-border bg-zinc-50 pl-3 pr-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                <input
                  type="text"
                  value={propertyWebsite}
                  onChange={(e) => setPropertyWebsite(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-foreground focus:outline-none min-w-0"
                />
                <button type="button" onClick={() => handleCopy(propertyWebsite)} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors" title="Copy link">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">
              <span className="text-red-500">*</span>Privacy Policy
            </label>
            <div className="mt-1.5 flex items-center gap-0 w-full max-w-lg">
              <div className="flex-1 flex items-center gap-2 h-10 rounded-lg border border-border bg-zinc-50 pl-3 pr-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                <input
                  type="text"
                  value={privacyPolicy}
                  onChange={(e) => setPrivacyPolicy(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-foreground focus:outline-none min-w-0"
                />
                <button type="button" onClick={() => handleCopy(privacyPolicy)} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors" title="Copy link">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
