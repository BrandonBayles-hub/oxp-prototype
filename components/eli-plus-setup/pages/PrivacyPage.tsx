"use client"
import { useState } from "react"
import type { BasePageProps } from "../index"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Copy,
  FileText,
  ChevronRight,
  ChevronDown,
  Globe,
  Eye,
  EyeOff,
  Info,
} from "lucide-react"
import {
  type TemplateFields,
  generatePrivacyPolicy,
} from "../components/PrivacySheetContent"

// ── Data ──────────────────────────────────────────────────────────────────────
const COMPLIANT_PROPERTIES = [
  { id: "p1", name: "Sunset Lofts",          city: "Phoenix, AZ" },
  { id: "p2", name: "Harbor View",            city: "San Diego, CA" },
  { id: "p3", name: "The Meridian",           city: "Austin, TX" },
  { id: "p4", name: "Park Place Residences",  city: "Denver, CO" },
  { id: "p5", name: "Riverwalk Commons",      city: "Nashville, TN" },
]

const THIRD_PARTY_PROPERTIES = [
  { id: "p6",  name: "River North Plaza", city: "Chicago",  state: "IL", website: "rivernorthplaza.com" },
  { id: "p9",  name: "The Reserve",       city: "Detroit",  state: "MI", website: "thereservedetroit.com" },
  { id: "p11", name: "Willow Creek",      city: "Portland", state: "OR", website: "willowcreekpdx.com" },
]

const DEFAULT_FIELDS: TemplateFields = {
  companyName: "Sunset Property Group LLC",
  effectiveDate: "April 15, 2026",
  lastUpdated: "April 15, 2026",
  smsPhone: "(602) 555-0100",
  smsEmail: "sms@sunsetproperties.com",
  messageFrequency: "4",
  chatbotProvider: "Entrata",
  privacyEmail: "privacy@sunsetproperties.com",
  companyAddress: "123 Main St, Phoenix, AZ 85001",
  appealContact: "privacy@sunsetproperties.com",
  privacyFormUrl: "sunsetproperties.com/privacy-request",
  tollFreeNumber: "(800) 555-0100",
  retentionApplication: "3",
  retentionResident: "7",
  retentionComms: "3",
  retentionWebsite: "13",
  retentionBackground: "5",
  doNotSellMethod: 'clicking the "Do Not Sell or Share My Personal Information" link on our website',
  privacyOfficerName: "Jane Smith",
  privacyOfficerEmail: "privacy@sunsetproperties.com",
  privacyOfficerPhone: "(800) 555-0100",
}

const REQUIRED_FIELDS: (keyof TemplateFields)[] = [
  "companyName", "effectiveDate", "smsPhone", "smsEmail",
  "messageFrequency", "chatbotProvider", "privacyEmail",
  "companyAddress", "appealContact",
]

type SectionId = "company" | "sms" | "contact" | "california" | "minnesota"

const FIELD_SECTIONS: Array<{
  id: SectionId
  label: string
  required: boolean
  badge?: string
  fields: Array<{
    key: keyof TemplateFields
    label: string
    placeholder: string
    optional?: boolean
    hint?: string
  }>
}> = [
  {
    id: "company",
    label: "Company Information",
    required: true,
    fields: [
      { key: "companyName", label: "Legal company name", placeholder: "Acme Property Group LLC" },
      { key: "effectiveDate", label: "Effective date", placeholder: "April 15, 2026" },
      { key: "lastUpdated", label: "Last updated", placeholder: "April 15, 2026" },
    ],
  },
  {
    id: "sms",
    label: "SMS & Communications",
    required: true,
    fields: [
      { key: "smsPhone", label: "Help / opt-out phone number", placeholder: "(602) 555-0100", hint: "Disclosed to residents for SMS opt-out" },
      { key: "smsEmail", label: "Help / opt-out email", placeholder: "sms@company.com" },
      { key: "messageFrequency", label: "Approx. messages per month", placeholder: "4", hint: "Required by carriers (FCC)" },
      { key: "chatbotProvider", label: "Chatbot provider name", placeholder: "Entrata", hint: "Operator of your leasing chatbot" },
    ],
  },
  {
    id: "contact",
    label: "Privacy Contact & Rights",
    required: true,
    fields: [
      { key: "privacyEmail", label: "Privacy contact email", placeholder: "privacy@company.com" },
      { key: "companyAddress", label: "Mailing address", placeholder: "123 Main St, Phoenix, AZ 85001" },
      { key: "appealContact", label: "Appeal contact (email or URL)", placeholder: "privacy@company.com" },
      { key: "privacyFormUrl", label: "Online privacy request form URL", placeholder: "company.com/privacy-request", optional: true },
      { key: "tollFreeNumber", label: "Toll-free number", placeholder: "(800) 555-0100", optional: true },
    ],
  },
  {
    id: "california",
    label: "California Supplement",
    required: false,
    badge: "CCPA / CPRA",
    fields: [
      { key: "retentionApplication", label: "Application data retention (years)", placeholder: "3" },
      { key: "retentionResident", label: "Resident data retention, post-lease (years)", placeholder: "7" },
      { key: "retentionComms", label: "Communications records retention (years)", placeholder: "3" },
      { key: "retentionWebsite", label: "Website activity retention (months)", placeholder: "13" },
      { key: "retentionBackground", label: "Background screening retention (years)", placeholder: "5", hint: "Subject to FCRA requirements" },
      { key: "doNotSellMethod", label: "Do Not Sell opt-out method", placeholder: 'clicking the "Do Not Sell" link on our website' },
    ],
  },
  {
    id: "minnesota",
    label: "Minnesota Supplement",
    required: false,
    badge: "Minn. Stat. § 325M",
    fields: [
      { key: "privacyOfficerName", label: "Privacy Officer name", placeholder: "Jane Smith" },
      { key: "privacyOfficerEmail", label: "Privacy Officer email", placeholder: "privacy@company.com" },
      { key: "privacyOfficerPhone", label: "Privacy Officer phone", placeholder: "(800) 555-0100" },
    ],
  },
]

// ── Sub-components ────────────────────────────────────────────────────────────
interface OptionCardProps {
  icon: React.ElementType; title: string; description: string
  active: boolean; onSelect: () => void; children?: React.ReactNode
}
function OptionCard({ icon: Icon, title, description, active, onSelect, children }: OptionCardProps) {
  return (
    <div className={cn("rounded-xl border transition-all bg-white", active ? "border-zinc-900" : "border-border")}>
      <button type="button" onClick={onSelect} className="w-full flex items-start gap-3 p-4 text-left">
        <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="h-4 w-4 text-zinc-600" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        {active
          ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" aria-hidden />
          : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" aria-hidden />}
      </button>
      {active && children && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/60 pt-3 bg-white rounded-b-xl">
          {children}
        </div>
      )}
    </div>
  )
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1800) }}
      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
    >
      <Copy className="h-3 w-3" />
      {copied ? "Copied!" : "Copy"}
    </button>
  )
}

function ThirdPartyRow({
  property, confirmed, onConfirm,
}: {
  property: typeof THIRD_PARTY_PROPERTIES[number]
  confirmed: boolean
  onConfirm: (id: string, val: boolean) => void
}) {
  const consentText = `By providing your phone number, you agree to receive automated text messages from ${property.name} — including leasing updates, payment reminders, maintenance notifications, and renewal information. Message frequency varies. Message and data rates may apply. Reply HELP for assistance or STOP to opt out at any time. View our Privacy Policy and Terms of Use at ${property.website}/legal.`
  return (
    <div className={cn(
      "rounded-xl border overflow-hidden transition-all",
      confirmed ? "border-emerald-200 bg-emerald-50/30" : "border-zinc-200 bg-white",
    )}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
        <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{property.name}</p>
          <p className="text-xs text-muted-foreground">{property.website} · {property.city}, {property.state}</p>
        </div>
        {confirmed && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden />}
      </div>
      <div className="px-4 py-3 space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          Add this as a checkbox disclosure on your contact form at <strong>{property.website}</strong>. The checkbox must be unchecked by default.
        </p>
        <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2.5 text-xs text-zinc-700 leading-relaxed">
          {consentText}
        </div>
        <div className="flex justify-end">
          <CopyBtn text={consentText} />
        </div>
        <label className={cn(
          "flex items-center gap-3 rounded-lg border px-3.5 py-3 cursor-pointer transition-all",
          confirmed ? "border-emerald-300 bg-emerald-50" : "border-border bg-card hover:border-zinc-300",
        )}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => onConfirm(property.id, e.target.checked)}
            className="accent-zinc-900 h-4 w-4 shrink-0"
          />
          <p className="text-sm text-foreground">I've added this disclosure to the contact form on <strong>{property.website}</strong></p>
          {confirmed && <CheckCircle2 className="h-4 w-4 text-emerald-600 ml-auto shrink-0" aria-hidden />}
        </label>
      </div>
    </div>
  )
}

// ── Template form ─────────────────────────────────────────────────────────────
function TemplateForm({
  fields,
  onChange,
}: {
  fields: TemplateFields
  onChange: (key: keyof TemplateFields, value: string) => void
}) {
  const [openSections, setOpenSections] = useState<Set<SectionId>>(new Set(["company", "sms", "contact"]))

  function toggleSection(id: SectionId) {
    setOpenSections(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function isSectionComplete(section: typeof FIELD_SECTIONS[number]) {
    return section.fields.filter(f => !f.optional).every(f => fields[f.key].trim() !== "")
  }

  return (
    <div className="space-y-1.5">
      {FIELD_SECTIONS.map(section => {
        const isOpen = openSections.has(section.id)
        const isComplete = isSectionComplete(section)
        return (
          <div key={section.id} className="rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors",
                isOpen ? "bg-zinc-100" : "hover:bg-zinc-50",
              )}
            >
              {isComplete
                ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" aria-hidden />
                : <div className="h-3.5 w-3.5 rounded-full border border-zinc-300 shrink-0" />}
              <span className="flex-1 text-xs font-semibold text-foreground">{section.label}</span>
              {section.badge && (
                <span className="text-[10px] font-medium text-muted-foreground bg-zinc-100 border border-border rounded px-1.5 py-0.5">
                  {section.badge}
                </span>
              )}
              {!section.required && (
                <span className="text-[10px] text-muted-foreground">Optional</span>
              )}
              {isOpen
                ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            </button>
            {isOpen && (
              <div className="px-3 pb-3 pt-2 space-y-3 bg-zinc-50/50">
                {section.fields.map(f => (
                  <div key={f.key}>
                    <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                      {f.label}
                      {f.optional && <span className="text-muted-foreground/60 text-[11px]">(optional)</span>}
                      {f.hint && (
                        <span title={f.hint} className="cursor-help">
                          <Info className="h-3 w-3 text-muted-foreground/50" aria-label={f.hint} />
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={fields[f.key]}
                      onChange={e => onChange(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export function PrivacyPage({ navigate, completedTasks, onComplete }: BasePageProps) {
  const isConfigured = completedTasks?.has("privacy") ?? false

  const [mode, setMode] = useState<null | "copy" | "template">(null)
  const [selectedProperty, setSelectedProperty] = useState("")
  const [fields, setFields] = useState<TemplateFields>(DEFAULT_FIELDS)
  const [thirdPartyConfirmed, setThirdPartyConfirmed] = useState<Record<string, boolean>>({})
  const [showPreview, setShowPreview] = useState(false)

  const templateFieldsValid = REQUIRED_FIELDS.every(k => fields[k].trim() !== "")

  const policyValid =
    (mode === "copy" && selectedProperty !== "") ||
    (mode === "template" && templateFieldsValid)

  const allThirdPartyConfirmed = THIRD_PARTY_PROPERTIES.every(p => !!thirdPartyConfirmed[p.id])
  const confirmedCount = THIRD_PARTY_PROPERTIES.filter(p => !!thirdPartyConfirmed[p.id]).length
  const isValid = policyValid && allThirdPartyConfirmed

  function handleSave() {
    onComplete?.("privacy")
    navigate("overview")
  }

  function handleFieldChange(key: keyof TemplateFields, value: string) {
    setFields(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl space-y-6">
      <button
        type="button"
        onClick={() => navigate("overview")}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1 -ml-2 text-muted-foreground")}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Overview
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Privacy Policy Coverage</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Verify consent language is present on all property websites before sending texts and calls.
          </p>
        </div>
        {isConfigured && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 shrink-0 mt-1">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Configured
          </span>
        )}
      </div>

      {isConfigured && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden />
          <p className="text-sm text-emerald-800">
            Previously completed. You can update the policy or re-confirm third-party websites below at any time.
          </p>
        </div>
      )}

      {/* ── Section 1: What We Found ──────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
            What We Found
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{isConfigured ? 48 : 40} properties</p>
                <p className="text-xs text-muted-foreground">SMS consent language confirmed on property website</p>
              </div>
              <span className="text-xs font-medium text-emerald-600 shrink-0">Compliant</span>
            </div>
            {!isConfigured && (
              <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" aria-hidden />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">8 properties</p>
                  <p className="text-xs text-muted-foreground">Missing required SMS consent language</p>
                </div>
                <span className="text-xs font-medium text-amber-600 shrink-0">Needs Update</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Fix options ──────────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
            {isConfigured ? "Update Policy — Choose an Option" : "Fix 8 Properties — Choose an Option"}
          </p>
          <div className="space-y-2">

            {/* Option A: Copy */}
            <OptionCard
              icon={Copy}
              title="Copy from a compliant property"
              description="Select one of your valid properties and apply its privacy policy to all non-compliant sites."
              active={mode === "copy"}
              onSelect={() => setMode(mode === "copy" ? null : "copy")}
            >
              <p className="text-sm text-muted-foreground">Select a property with a valid, graded privacy policy.</p>
              <div className="space-y-1.5">
                {COMPLIANT_PROPERTIES.map(p => (
                  <label
                    key={p.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3.5 py-3 cursor-pointer transition-all bg-card",
                      selectedProperty === p.id ? "border-zinc-900" : "border-border hover:border-zinc-300",
                    )}
                  >
                    <input
                      type="radio"
                      name="source-property"
                      value={p.id}
                      checked={selectedProperty === p.id}
                      onChange={() => setSelectedProperty(p.id)}
                      className="accent-zinc-900 h-3.5 w-3.5 shrink-0"
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.city}</p>
                    </div>
                    {selectedProperty === p.id && <CheckCircle2 className="h-4 w-4 text-emerald-600 ml-auto shrink-0" aria-hidden />}
                  </label>
                ))}
              </div>
              {selectedProperty && (
                <p className="text-xs text-muted-foreground pt-1">
                  Will apply{" "}
                  <strong className="text-foreground">
                    {COMPLIANT_PROPERTIES.find(p => p.id === selectedProperty)?.name}
                  </strong>
                  's policy to all non-compliant properties.
                </p>
              )}
            </OptionCard>

            {/* Option B: Template v2 madlib */}
            <OptionCard
              icon={FileText}
              title="Fill in the Entrata template (v2)"
              description="Complete the legal privacy policy template — all required fields in one place. We'll publish it to all 8 properties."
              active={mode === "template"}
              onSelect={() => setMode(mode === "template" ? null : "template")}
            >
              {/* Legal disclaimer */}
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" aria-hidden />
                <p className="text-xs text-amber-800 leading-relaxed">
                  <strong>Not legal advice.</strong> This template was created for informational purposes only (Entrata PMC Privacy Policy Template v2). Review with qualified legal counsel before publishing. Customize all fields for your organization.
                </p>
              </div>

              {/* Accordion form */}
              <TemplateForm fields={fields} onChange={handleFieldChange} />

              {/* Footer row: progress + preview */}
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-muted-foreground">
                  {REQUIRED_FIELDS.filter(k => fields[k].trim() !== "").length}/{REQUIRED_FIELDS.length} required fields complete
                </p>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {showPreview ? "Hide preview" : "Preview full policy"}
                </button>
              </div>

              {/* Policy preview */}
              {showPreview && (
                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-zinc-50">
                    <p className="text-xs font-semibold text-foreground">Full Policy Preview</p>
                    <CopyBtn text={generatePrivacyPolicy(fields)} />
                  </div>
                  <div className="max-h-80 overflow-y-auto px-4 py-3">
                    <pre className="text-[10px] text-zinc-700 whitespace-pre-wrap leading-relaxed font-sans">
                      {generatePrivacyPolicy(fields)}
                    </pre>
                  </div>
                </div>
              )}

              {templateFieldsValid && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" aria-hidden />
                  <p className="text-xs text-emerald-800">All required fields complete. Ready to publish.</p>
                </div>
              )}
            </OptionCard>
          </div>
        </div>
      </div>

      {/* ── Section 2: Third-party website opt-in requirement ──────────── */}
      <div className="border-t border-border pt-5 space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 mb-0.5">
            Additional Requirement — Third-Party Websites
          </p>
          <p className="text-xs text-muted-foreground">
            3 of your properties use a third-party website (not ProspectPortal). Their contact forms also need an opt-in consent checkbox before ELI+ can go live.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-lg border px-3.5 py-3 bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">3 properties on third-party websites</p>
            <p className="text-xs text-muted-foreground">Opt-in checkbox language must be added to each contact form</p>
          </div>
          <span className={cn("text-xs font-medium shrink-0", confirmedCount === 3 ? "text-emerald-600" : "text-amber-600")}>
            {confirmedCount}/3 confirmed
          </span>
        </div>

        <div className="space-y-3">
          {THIRD_PARTY_PROPERTIES.map(prop => (
            <ThirdPartyRow
              key={prop.id}
              property={prop}
              confirmed={!!thirdPartyConfirmed[prop.id]}
              onConfirm={(id, val) => setThirdPartyConfirmed(prev => ({ ...prev, [id]: val }))}
            />
          ))}
        </div>
      </div>

      {/* ── Save ─────────────────────────────────────────────────────────── */}
      <div className="pt-2 border-t border-border">
        <button
          type="button"
          disabled={!isValid}
          onClick={handleSave}
          className={cn(buttonVariants({ variant: "eli" }), !isValid && "opacity-40 cursor-not-allowed")}
        >
          {isConfigured ? "Re-publish & Confirm" : "Publish to 8 Websites & Confirm All"}
        </button>
        {!policyValid && (
          <p className="text-xs text-muted-foreground mt-2">Choose a privacy policy option above to continue.</p>
        )}
        {policyValid && !allThirdPartyConfirmed && (
          <p className="text-xs text-muted-foreground mt-2">Also confirm the opt-in checkbox for all 3 third-party websites above.</p>
        )}
      </div>
    </div>
  )
}
