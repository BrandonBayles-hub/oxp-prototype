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
  Info,
  Link as LinkIcon,
  Copy,
  Sparkles,
} from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { PROPERTIES } from "../data/properties"

type PaymentsTab = "property" | "payment-info" | "payment-options" | "policies" | "marketing"

const PAYMENTS_TABS: { id: PaymentsTab; label: string }[] = [
  { id: "property", label: "Property Info" },
  { id: "payment-info", label: "Payment Info" },
  { id: "payment-options", label: "Payment Options" },
  { id: "policies", label: "Policies" },
  { id: "marketing", label: "Marketing" },
]

const ADDITIONAL_PROPERTY_SETTINGS = [
  { id: "business-hours", label: "Business Hours", description: "" },
  { id: "contact-points", label: "Contact Points", description: "Review your delinquency contact points to ensure residents don't receive duplicate communication." },
  { id: "eli-permissions", label: "ELI+ Dashboard Permissions", description: "This feature is only required for users who directly manage the ELI+ console. Permission users for the Dashboard." },
]

interface Props {
  navigate: (to: PageId) => void
  showToast: (message: string) => void
}

export function PaymentsPage({ navigate, showToast }: Props) {
  const [activeTab, setActiveTab] = useState<PaymentsTab>("property")
  const [propertyPickerOpen, setPropertyPickerOpen] = useState(false)
  const [selectedProperties, setSelectedProperties] = useState<string[]>(() => PROPERTIES.map(p => p.id))

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

  return (
    <div className="flex flex-col h-full">
      {/* Top header with back link + tab bar */}
      <div className="shrink-0 border-b border-border bg-card">
        <div className="px-6 md:px-8 pt-4 pb-0 space-y-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("payments")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3 w-3" aria-hidden />
              Payments AI
            </button>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-sm font-semibold text-foreground">API Support</span>
            <span className="inline-flex items-center rounded-full bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-500">Inactive</span>
          </div>
          <nav className="flex items-center gap-0" aria-label="Payments AI settings">
            {PAYMENTS_TABS.map(tab => (
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
        {activeTab === "property" && <PropertyInfoTab address={propertyAddress} />}
        {activeTab === "payment-info" && <PaymentInfoTab />}
        {activeTab === "payment-options" && <PaymentOptionsTab />}
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

/* ─── Payment Info Tab ──────────────────────────────────────────────── */

const DAY_OPTIONS = [
  "1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th",
  "11th","12th","13th","14th","15th","16th","17th","18th","19th","20th",
  "21st","22nd","23rd","24th","25th","26th","27th","28th","29th","30th","31st",
]

function PaymentInfoTab() {
  const [rentChargeDate, setRentChargeDate] = useState("23rd")
  const [rentDueDate, setRentDueDate] = useState("3rd")
  const [acceptPaymentPlans, setAcceptPaymentPlans] = useState(true)
  const [paymentBlockDay, setPaymentBlockDay] = useState("3rd")
  const [paymentLink, setPaymentLink] = useState("https://1155bartonspringsv2.prospectportal.com/")
  const [gracePeriodDate, setGracePeriodDate] = useState("3rd")
  const [balanceReminderDate, setBalanceReminderDate] = useState("3rd")
  const [outstandingBalance, setOutstandingBalance] = useState("100")
  const [evictionMonth, setEvictionMonth] = useState("Current Month")
  const [evictionDate, setEvictionDate] = useState("4th")
  const [copied, setCopied] = useState(false)

  function handleCopyLink() {
    navigator.clipboard.writeText(paymentLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl space-y-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Info</h1>
        </div>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          View Help Article
        </button>
      </div>

      {/* Rent Due and Payment Start Dates */}
      <div className="space-y-6">
        <h2 className="text-base font-semibold text-foreground">Rent Due and Payment Start Dates</h2>

        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-foreground">Rent Charge Date</p>
            <p className="text-xs text-muted-foreground mt-0.5">Select the day of the month when rent payments become active.</p>
            <div className="relative mt-2">
              <select
                value={rentChargeDate}
                onChange={(e) => setRentChargeDate(e.target.value)}
                className="w-full max-w-[140px] h-10 appearance-none rounded-lg border border-border bg-white pl-3 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
              >
                {DAY_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Rent Due Date</p>
            <p className="text-xs text-muted-foreground mt-0.5">Select the day of the month when rent payments are due.</p>
            <div className="relative mt-2">
              <select
                value={rentDueDate}
                onChange={(e) => setRentDueDate(e.target.value)}
                className="w-full max-w-[140px] h-10 appearance-none rounded-lg border border-border bg-white pl-3 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
              >
                {DAY_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Does the Community Accept Payment Plans?</p>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <span className={cn(
                  "h-4 w-4 rounded-full border-2 flex items-center justify-center",
                  acceptPaymentPlans ? "border-emerald-500" : "border-zinc-300"
                )}>
                  {acceptPaymentPlans && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
                </span>
                <span className="text-sm text-foreground">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className={cn(
                  "h-4 w-4 rounded-full border-2 flex items-center justify-center",
                  !acceptPaymentPlans ? "border-zinc-900" : "border-zinc-300"
                )}>
                  {!acceptPaymentPlans && <span className="h-2 w-2 rounded-full bg-zinc-900" />}
                </span>
                <span className="text-sm text-foreground">No</span>
              </label>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Payment Block Day</p>
            <p className="text-xs text-muted-foreground mt-0.5">Specify the day of the month after which payments are no longer accepted.</p>
            <div className="relative mt-2">
              <select
                value={paymentBlockDay}
                onChange={(e) => setPaymentBlockDay(e.target.value)}
                className="w-full max-w-[140px] h-10 appearance-none rounded-lg border border-border bg-white pl-3 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
              >
                {DAY_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Payment Link</p>
            <div className="mt-2 flex items-center gap-0 w-full max-w-lg">
              <div className="flex-1 flex items-center gap-2 h-10 rounded-lg border border-border bg-zinc-50 pl-3 pr-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                <input
                  type="text"
                  value={paymentLink}
                  onChange={(e) => setPaymentLink(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-foreground focus:outline-none min-w-0"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy link"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grace Period & Late Fees */}
      <div className="space-y-6">
        <h2 className="text-base font-semibold text-foreground">Grace Period &amp; Late Fees</h2>

        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-foreground">Grace Period Date</p>
            <p className="text-xs text-muted-foreground mt-0.5">This is the final date you can pay rent without a late fee</p>
            <div className="relative mt-2">
              <select
                value={gracePeriodDate}
                onChange={(e) => setGracePeriodDate(e.target.value)}
                className="w-full max-w-[140px] h-10 appearance-none rounded-lg border border-border bg-white pl-3 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
              >
                {DAY_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Balance Reminder Date</p>
            <p className="text-xs text-muted-foreground mt-0.5">Which day of the month should the bot begin sending balance reminders to residents?</p>
            <div className="relative mt-2">
              <select
                value={balanceReminderDate}
                onChange={(e) => setBalanceReminderDate(e.target.value)}
                className="w-full max-w-[140px] h-10 appearance-none rounded-lg border border-border bg-white pl-3 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
              >
                {DAY_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              Outstanding Balance Amount
              <Info className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">What is the minimum outstanding balance for ELI to approach residents?</p>
            <input
              type="text"
              value={outstandingBalance}
              onChange={(e) => setOutstandingBalance(e.target.value)}
              className="mt-2 w-full max-w-[140px] h-10 rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
            />
          </div>
        </div>
      </div>

      {/* Evictions */}
      <div className="space-y-6">
        <h2 className="text-base font-semibold text-foreground">Evictions</h2>

        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-foreground">Eviction Month</p>
            <p className="text-xs text-muted-foreground mt-0.5">Select the month when eviction processes begin.</p>
            <div className="relative mt-2">
              <select
                value={evictionMonth}
                onChange={(e) => setEvictionMonth(e.target.value)}
                className="w-full max-w-[180px] h-10 appearance-none rounded-lg border border-border bg-white pl-3 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
              >
                <option>Current Month</option>
                <option>Next Month</option>
                <option>January</option>
                <option>February</option>
                <option>March</option>
                <option>April</option>
                <option>May</option>
                <option>June</option>
                <option>July</option>
                <option>August</option>
                <option>September</option>
                <option>October</option>
                <option>November</option>
                <option>December</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Eviction Date</p>
            <p className="text-xs text-muted-foreground mt-0.5">{"Enter the specific day of the month for eviction (e.g., '1' for the 1st)."}</p>
            <div className="relative mt-2">
              <select
                value={evictionDate}
                onChange={(e) => setEvictionDate(e.target.value)}
                className="w-full max-w-[140px] h-10 appearance-none rounded-lg border border-border bg-white pl-3 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
              >
                {DAY_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Payment Options Tab ───────────────────────────────────────────── */

const PAYMENT_METHOD_OPTIONS = [
  { id: "online-payments", label: "Online Payments", defaultChecked: true },
  { id: "money-order", label: "Money Order", defaultChecked: true },
  { id: "cash", label: "Cash", defaultChecked: false },
  { id: "bank-check", label: "Bank Check", defaultChecked: false },
  { id: "cashiers-check", label: "Cashiers Check", defaultChecked: false },
  { id: "personal-check", label: "Personal Check", defaultChecked: false },
  { id: "wips", label: "WIPS", defaultChecked: false },
  { id: "paylease", label: "Paylease", defaultChecked: false },
  { id: "flex", label: "Flex", defaultChecked: false },
  { id: "pay-near-me", label: "Pay Near Me", defaultChecked: false },
  { id: "money-gram", label: "Money Gram", defaultChecked: false },
]

function PaymentOptionsTab() {
  const [methods, setMethods] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PAYMENT_METHOD_OPTIONS.map(m => [m.id, m.defaultChecked]))
  )
  const [installmentMode, setInstallmentMode] = useState<"installments" | "full">("full")
  const [addressRecipient, setAddressRecipient] = useState("Brandon Test")

  function toggleMethod(id: string) {
    setMethods(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl space-y-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Options</h1>
        </div>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          View Help Article
        </button>
      </div>

      {/* Payment Options checklist */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Payment Options</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Select what payment options are available at your property.</p>
        </div>

        <div className="space-y-2.5">
          {PAYMENT_METHOD_OPTIONS.map(method => (
            <label key={method.id} className="flex items-center gap-2.5 cursor-pointer">
              <span
                className={cn(
                  "h-4.5 w-4.5 rounded flex items-center justify-center border transition-colors",
                  methods[method.id]
                    ? "bg-emerald-500 border-emerald-500"
                    : "border-zinc-300 bg-white"
                )}
                onClick={() => toggleMethod(method.id)}
              >
                {methods[method.id] && (
                  <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="text-sm text-foreground">{method.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Installments */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Installments</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Can the Residents pay via Installment or do you require full payments?</p>
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <span className={cn(
              "h-4 w-4 rounded-full border-2 flex items-center justify-center",
              installmentMode === "installments" ? "border-zinc-900" : "border-zinc-300"
            )}>
              {installmentMode === "installments" && <span className="h-2 w-2 rounded-full bg-zinc-900" />}
            </span>
            <span className="text-sm text-foreground">Installments</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className={cn(
              "h-4 w-4 rounded-full border-2 flex items-center justify-center",
              installmentMode === "full" ? "border-emerald-500" : "border-zinc-300"
            )}>
              {installmentMode === "full" && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
            </span>
            <span className="text-sm text-foreground">Full payments only</span>
          </label>
        </div>
      </div>

      {/* Address Recipient */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Address Recipient</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Who does the resident address the money order to?</p>
        </div>

        <input
          type="text"
          value={addressRecipient}
          onChange={(e) => setAddressRecipient(e.target.value)}
          className="w-full max-w-md h-10 rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
        />
      </div>
    </div>
  )
}

/* ─── Policies Tab ──────────────────────────────────────────────────── */

function PoliciesTab() {
  const [lateFeeText, setLateFeeText] = useState("Test")
  const [paymentPlanText, setPaymentPlanText] = useState("Test")

  return (
    <div className="p-6 md:p-8 max-w-3xl space-y-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Policies</h1>
        </div>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          View Help Article
        </button>
      </div>

      {/* Late Fee */}
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Late Fee</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Communicate late fee amounts and grace period policies to residents.</p>
          </div>
          <button
            type="button"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-100 transition-colors"
            title="Generate with AI"
          >
            <Sparkles className="h-4.5 w-4.5" />
          </button>
        </div>
        <textarea
          value={lateFeeText}
          onChange={(e) => setLateFeeText(e.target.value)}
          rows={4}
          className="w-full max-w-lg rounded-lg border border-border bg-zinc-50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 resize-none"
        />
      </div>

      {/* Payment Plan */}
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Payment Plan</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Explain payment plan terms, eligibility, and requirements to residents.</p>
          </div>
          <button
            type="button"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-100 transition-colors"
            title="Generate with AI"
          >
            <Sparkles className="h-4.5 w-4.5" />
          </button>
        </div>
        <textarea
          value={paymentPlanText}
          onChange={(e) => setPaymentPlanText(e.target.value)}
          rows={4}
          className="w-full max-w-lg rounded-lg border border-border bg-zinc-50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 resize-none"
        />
      </div>
    </div>
  )
}

/* ─── Marketing Tab ─────────────────────────────────────────────────── */

function MarketingTab() {
  const [websiteSource, setWebsiteSource] = useState<"prospect-portal" | "3rd-party">("3rd-party")
  const [propertyWebsite, setPropertyWebsite] = useState("https://1155bartonspringsv2.prospectportal.com/")
  const [privacyPolicy, setPrivacyPolicy] = useState("https://www.greystar.com/renters-rights-resources")

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl space-y-10">
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

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <span className={cn(
              "h-4 w-4 rounded-full border-2 flex items-center justify-center",
              websiteSource === "prospect-portal" ? "border-zinc-900" : "border-zinc-300"
            )}>
              {websiteSource === "prospect-portal" && <span className="h-2 w-2 rounded-full bg-zinc-900" />}
            </span>
            <span className="text-sm text-foreground" onClick={() => setWebsiteSource("prospect-portal")}>Prospect Portal</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className={cn(
              "h-4 w-4 rounded-full border-2 flex items-center justify-center",
              websiteSource === "3rd-party" ? "border-emerald-500" : "border-zinc-300"
            )}>
              {websiteSource === "3rd-party" && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
            </span>
            <span className="text-sm text-foreground" onClick={() => setWebsiteSource("3rd-party")}>3rd Party</span>
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
                <button
                  type="button"
                  onClick={() => handleCopy(propertyWebsite)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy link"
                >
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
                <button
                  type="button"
                  onClick={() => handleCopy(privacyPolicy)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy link"
                >
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
