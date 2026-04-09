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
} from "lucide-react"

// ── Original privacy policy data ─────────────────────────────────────────────
const COMPLIANT_PROPERTIES = [
  { id: "p1", name: "Sunset Lofts",          city: "Phoenix, AZ" },
  { id: "p2", name: "Harbor View",            city: "San Diego, CA" },
  { id: "p3", name: "The Meridian",           city: "Austin, TX" },
  { id: "p4", name: "Park Place Residences",  city: "Denver, CO" },
  { id: "p5", name: "Riverwalk Commons",      city: "Nashville, TN" },
]

interface TemplateFields { companyName: string; contactEmail: string; stateList: string }

// ── Third-party website data ─────────────────────────────────────────────────
const THIRD_PARTY_PROPERTIES = [
  { id: "p6",  name: "River North Plaza", city: "Chicago",  state: "IL", website: "rivernorthplaza.com" },
  { id: "p9",  name: "The Reserve",       city: "Detroit",  state: "MI", website: "thereservedetroit.com" },
  { id: "p11", name: "Willow Creek",      city: "Portland", state: "OR", website: "willowcreekpdx.com" },
]

const getConsentLanguage = (name: string) =>
  `By providing your phone number, you agree to receive automated text messages from ${name} — including leasing updates, payment reminders, maintenance notifications, and renewal information. Message frequency varies. Message and data rates may apply. Reply HELP for assistance or STOP to opt out at any time. View our Privacy Policy and Terms of Use at ${name.toLowerCase().replace(/\s+/g, "")}.com/legal.`

// ── Shared sub-components ────────────────────────────────────────────────────
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

function VerbageBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <CopyBtn text={text} />
      </div>
      <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2.5 text-xs text-zinc-700 leading-relaxed">
        {text}
      </div>
    </div>
  )
}

function ThirdPartyRow({
  property, confirmed, onConfirm,
}: {
  property: typeof THIRD_PARTY_PROPERTIES[number]
  confirmed: boolean
  onConfirm: (id: string, val: boolean) => void
}) {
  const consentText = getConsentLanguage(property.name)
  return (
    <div className={cn(
      "rounded-xl border overflow-hidden transition-all",
      confirmed ? "border-emerald-200 bg-emerald-50/30" : "border-zinc-200 bg-white",
    )}>
      {/* Property header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
        <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{property.name}</p>
          <p className="text-xs text-muted-foreground">{property.website} · {property.city}, {property.state}</p>
        </div>
        {confirmed && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden />}
      </div>

      {/* Consent language + confirmation */}
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

// ── Page ─────────────────────────────────────────────────────────────────────
export function PrivacyPage({ navigate, completedTasks, onComplete }: BasePageProps) {
  const isConfigured = completedTasks?.has("privacy") ?? false

  // Privacy policy fix state
  const [mode, setMode] = useState<null | "copy" | "template">(null)
  const [selectedProperty, setSelectedProperty] = useState("")
  const [fields, setFields] = useState<TemplateFields>({
    companyName: "Sunset Property Group LLC",
    contactEmail: "privacy@sunsetproperties.com",
    stateList: "Arizona, California, Texas",
  })

  // Third-party confirmation state
  const [thirdPartyConfirmed, setThirdPartyConfirmed] = useState<Record<string, boolean>>({})

  const policyValid =
    (mode === "copy" && selectedProperty !== "") ||
    (mode === "template" &&
      fields.companyName.trim() !== "" &&
      fields.contactEmail.trim() !== "" &&
      fields.stateList.trim() !== "")

  const allThirdPartyConfirmed = THIRD_PARTY_PROPERTIES.every(p => !!thirdPartyConfirmed[p.id])
  const confirmedCount = THIRD_PARTY_PROPERTIES.filter(p => !!thirdPartyConfirmed[p.id]).length
  const isValid = policyValid && allThirdPartyConfirmed

  function handleSave() {
    onComplete?.("privacy")
    navigate("overview")
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl space-y-6">
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

      {/* ── Section 1: Privacy Policy Status & Fix ─────────────────────── */}
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

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
            {isConfigured ? "Update Policy — Choose an Option" : "Fix 8 Properties — Choose an Option"}
          </p>
          <div className="space-y-2">
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

            <OptionCard
              icon={FileText}
              title="Fill in the Entrata template"
              description="Complete a short form and we'll generate a compliant privacy policy applied to all properties."
              active={mode === "template"}
              onSelect={() => setMode(mode === "template" ? null : "template")}
            >
              <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/60 px-4 py-3 text-sm text-zinc-600 leading-relaxed">
                <span className="text-foreground font-medium">"</span>
                {" "}By providing your phone number, you consent to receive SMS messages from{" "}
                <span className="inline-block border-b border-zinc-400 text-foreground font-medium min-w-[80px]">{fields.companyName || "___"}</span>
                {" "}regarding your tenancy. Message and data rates may apply. Contact{" "}
                <span className="inline-block border-b border-zinc-400 text-foreground font-medium min-w-[80px]">{fields.contactEmail || "___"}</span>
                {" "}to opt out. Applies in:{" "}
                <span className="inline-block border-b border-zinc-400 text-foreground font-medium min-w-[80px]">{fields.stateList || "___"}</span>
                .<span className="text-foreground font-medium">"</span>
              </div>
              <div className="space-y-2.5">
                {([
                  { key: "companyName" as const, label: "Legal company name" },
                  { key: "contactEmail" as const, label: "Privacy contact email" },
                  { key: "stateList" as const, label: "States where this applies" },
                ]).map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
                    <input
                      type="text"
                      value={fields[key]}
                      onChange={e => setFields(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>
                ))}
              </div>
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
