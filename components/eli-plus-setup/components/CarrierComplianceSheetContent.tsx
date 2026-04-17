"use client"

import { useState } from "react"
import { CheckCircle2, AlertTriangle, Loader2, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

export type CarrierSheetMode = "missing" | "rejected"

interface CarrierFields {
  legalName: string
  addressStreet: string
  addressCity: string
  addressState: string
  addressZip: string
  phone: string
  website: string
  repFirstName: string
  repLastName: string
  repEmail: string
  repPhone: string
  repTitle: string
}

// Values pre-loaded for "rejected" mode — submitted but flagged by carrier
const REJECTED_VALUES: CarrierFields = {
  legalName: "Sunset Properties",           // missing "LLC" — won't match EIN
  addressStreet: "123 Main St",
  addressCity: "Austin",
  addressState: "TX",
  addressZip: "78701",
  phone: "(512) 555-0123",
  website: "https://www.sunsetproperties.com",
  repFirstName: "Sarah",
  repLastName: "Johnson",
  repEmail: "sarah@gmail.com",              // wrong domain
  repPhone: "(512) 555-9876",
  repTitle: "Manager",                       // too vague
}

const EMPTY_VALUES: CarrierFields = {
  legalName: "", addressStreet: "", addressCity: "",
  addressState: "", addressZip: "", phone: "", website: "",
  repFirstName: "", repLastName: "", repEmail: "", repPhone: "", repTitle: "",
}

// Which fields are flagged in "rejected" mode and why
const REJECTION_REASONS: Partial<Record<keyof CarrierFields, string>> = {
  legalName:  "Name didn't match the EIN on file. Must include the full legal entity name (e.g. \"LLC\", \"Inc.\").",
  phone:      "Number returned as unverifiable. Use a registered business landline or VoIP number.",
  website:    "Site was unreachable at time of carrier review. Confirm the URL is live and publicly accessible.",
  repEmail:   "Domain doesn't match your business website. Use an email from your company domain (e.g. sarah@sunsetproperties.com).",
  repTitle:   "Title was flagged as too generic. Use a specific role (e.g. \"Director of Operations\" or \"VP of Leasing\").",
}

const REQUIRED_KEYS: (keyof CarrierFields)[] = [
  "legalName", "addressStreet", "addressCity", "addressState", "addressZip",
  "phone", "website", "repFirstName", "repLastName", "repEmail", "repPhone", "repTitle",
]

interface Props {
  mode: CarrierSheetMode
  onComplete: () => void
}

export function CarrierComplianceSheetContent({ mode, onComplete }: Props) {
  const [fields, setFields] = useState<CarrierFields>(
    mode === "rejected" ? REJECTED_VALUES : EMPTY_VALUES,
  )
  // Track which rejected fields the user has updated (dismisses their rejection card)
  const [updated, setUpdated] = useState<Set<keyof CarrierFields>>(new Set())
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "success">("idle")

  const rejectedKeys = Object.keys(REJECTION_REASONS) as (keyof CarrierFields)[]
  const allRejectedFixed = mode === "rejected"
    ? rejectedKeys.every(k => updated.has(k))
    : true
  const allRequiredFilled = REQUIRED_KEYS.every(k => fields[k].trim() !== "")
  const canSubmit = allRequiredFilled && allRejectedFixed && submitState === "idle"

  function setField(key: keyof CarrierFields, val: string) {
    setFields(p => ({ ...p, [key]: val }))
    if (mode === "rejected" && key in REJECTION_REASONS) {
      setUpdated(p => new Set([...p, key]))
    }
  }

  function handleSubmit() {
    setSubmitState("submitting")
    setTimeout(() => {
      setSubmitState("success")
      setTimeout(() => onComplete(), 1800)
    }, 1800)
  }

  if (submitState === "success") {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </span>
        <div>
          <p className="text-base font-semibold text-foreground">Registration submitted</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs leading-relaxed">
            {mode === "rejected"
              ? "Your updated details have been resubmitted. Carrier review typically takes 1–3 business days."
              : "Your details have been submitted for carrier review. This typically takes 1–3 business days."}
          </p>
        </div>
      </div>
    )
  }

  if (submitState === "submitting") {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {mode === "rejected" ? "Restarting registration…" : "Submitting your registration…"}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {mode === "missing" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-900 leading-relaxed">
            We couldn't find the fields below automatically. Fill them in to complete your carrier registration and activate SMS.
          </p>
        </div>
      )}

      {mode === "rejected" && (
        <div className="rounded-lg border border-red-200 bg-red-50/60 px-4 py-3 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-900 leading-relaxed">
            Our carrier rejected your registration. Update the flagged fields below and resubmit.
          </p>
        </div>
      )}

      {/* Legal Business Name */}
      <Field
        label="Legal Business Name"
        required
        hint="Must exactly match your EIN registration."
        value={fields.legalName}
        onChange={v => setField("legalName", v)}
        missing={mode === "missing" && !fields.legalName}
        rejection={mode === "rejected" && !updated.has("legalName") ? REJECTION_REASONS.legalName : undefined}
      />

      {/* Address */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-foreground">
          <span className="text-red-500 mr-1">*</span>Business Address
        </label>
        <input
          type="text"
          value={fields.addressStreet}
          onChange={e => setField("addressStreet", e.target.value)}
          placeholder="Street address"
          className={cn(
            "w-full h-10 rounded-lg border px-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 bg-white",
            mode === "missing" && !fields.addressStreet ? "border-red-400" : "border-border",
          )}
        />
        <div className="grid grid-cols-3 gap-2">
          <input
            type="text"
            value={fields.addressCity}
            onChange={e => setField("addressCity", e.target.value)}
            placeholder="City"
            className={cn(
              "h-10 rounded-lg border px-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 bg-white col-span-1",
              mode === "missing" && !fields.addressCity ? "border-red-400" : "border-border",
            )}
          />
          <input
            type="text"
            value={fields.addressState}
            onChange={e => setField("addressState", e.target.value)}
            placeholder="State"
            className={cn(
              "h-10 rounded-lg border px-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 bg-white",
              mode === "missing" && !fields.addressState ? "border-red-400" : "border-border",
            )}
          />
          <input
            type="text"
            value={fields.addressZip}
            onChange={e => setField("addressZip", e.target.value)}
            placeholder="ZIP"
            className={cn(
              "h-10 rounded-lg border px-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 bg-white",
              mode === "missing" && !fields.addressZip ? "border-red-400" : "border-border",
            )}
          />
        </div>
        {mode === "missing" && (!fields.addressStreet || !fields.addressCity || !fields.addressState || !fields.addressZip) && (
          <p className="text-xs text-red-600">Full address required for carrier registration</p>
        )}
      </div>

      {/* Phone */}
      <Field
        label="Company Phone"
        required
        hint="A reachable business phone number."
        value={fields.phone}
        onChange={v => setField("phone", v)}
        placeholder="(555) 555-0100"
        missing={mode === "missing" && !fields.phone}
        rejection={mode === "rejected" && !updated.has("phone") ? REJECTION_REASONS.phone : undefined}
      />

      {/* Website */}
      <Field
        label="Website URL"
        required
        hint="Your public-facing business website."
        value={fields.website}
        onChange={v => setField("website", v)}
        placeholder="https://www.yourcompany.com"
        missing={mode === "missing" && !fields.website}
        rejection={mode === "rejected" && !updated.has("website") ? REJECTION_REASONS.website : undefined}
      />

      <div className="border-t border-border pt-1" />
      <p className="text-sm font-semibold text-foreground">Authorized Representative</p>

      {/* Rep name */}
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="First Name"
          required
          value={fields.repFirstName}
          onChange={v => setField("repFirstName", v)}
          missing={mode === "missing" && !fields.repFirstName}
        />
        <Field
          label="Last Name"
          required
          value={fields.repLastName}
          onChange={v => setField("repLastName", v)}
          missing={mode === "missing" && !fields.repLastName}
        />
      </div>

      {/* Rep email */}
      <Field
        label="Rep Email"
        required
        hint="Use your company domain email."
        value={fields.repEmail}
        onChange={v => setField("repEmail", v)}
        placeholder="name@yourcompany.com"
        missing={mode === "missing" && !fields.repEmail}
        rejection={mode === "rejected" && !updated.has("repEmail") ? REJECTION_REASONS.repEmail : undefined}
      />

      {/* Rep phone */}
      <Field
        label="Rep Phone"
        required
        value={fields.repPhone}
        onChange={v => setField("repPhone", v)}
        placeholder="(555) 555-0100"
        missing={mode === "missing" && !fields.repPhone}
      />

      {/* Rep title */}
      <Field
        label="Job Title"
        required
        hint="Use a specific title, not a generic one."
        value={fields.repTitle}
        onChange={v => setField("repTitle", v)}
        placeholder="e.g. Director of Operations"
        missing={mode === "missing" && !fields.repTitle}
        rejection={mode === "rejected" && !updated.has("repTitle") ? REJECTION_REASONS.repTitle : undefined}
      />

      {/* Submit */}
      <div className="border-t border-border pt-4">
        <button
          type="button"
          onClick={canSubmit ? handleSubmit : undefined}
          disabled={!canSubmit}
          className={cn(
            "w-full h-10 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors",
            canSubmit
              ? "bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer"
              : "bg-zinc-100 text-zinc-400 cursor-not-allowed",
          )}
        >
          <RefreshCw className="h-4 w-4" />
          {mode === "rejected" ? "Resubmit Registration" : "Submit Registration"}
        </button>
        {!canSubmit && allRequiredFilled && mode === "rejected" && (
          <p className="text-xs text-muted-foreground text-center mt-2">Update all flagged fields to enable resubmission</p>
        )}
        {!canSubmit && !allRequiredFilled && (
          <p className="text-xs text-muted-foreground text-center mt-2">Fill in all required fields to continue</p>
        )}
      </div>
    </div>
  )
}

// ── Field helper ──────────────────────────────────────────────────────────────

interface FieldProps {
  label: string
  required?: boolean
  hint?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  missing?: boolean
  rejection?: string
}

function Field({ label, required, hint, value, onChange, placeholder, missing, rejection }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-foreground">
        {required && <span className="text-red-500 mr-1">*</span>}
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full h-10 rounded-lg border px-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 bg-white transition-colors",
          rejection  ? "border-red-400 focus:ring-red-400/20"
          : missing  ? "border-red-400 focus:ring-red-400/20"
          : "border-border focus:ring-zinc-900/20",
        )}
      />
      {missing && (
        <p className="text-xs text-red-600">Required for carrier registration</p>
      )}
      {rejection && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700 leading-relaxed">{rejection}</p>
        </div>
      )}
      {hint && !missing && !rejection && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}
