"use client"

import { useState, useEffect } from "react"
import type { PageId } from "../index"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ArrowLeft, Lock, CheckCircle2, XCircle, Loader2, ExternalLink,
  Code2, Globe, ChevronDown, ChevronUp, Zap, MessageSquare, X, TriangleAlert,
} from "lucide-react"
import type { BrandStatus } from "../index"

interface Props {
  navigate: (to: PageId) => void
  privacyPublished: boolean
  onPrivacyPublish: () => void
  brandStatus: BrandStatus
}

const PREFILLED_EIN = "98-7654321"
const maskedEin = `••-•••${PREFILLED_EIN.slice(-4)}`

// Privacy policy Mad-lib template — fields in [brackets] are replaced with user values
const POLICY_TEMPLATE = (f: PolicyFields) => `
${f.companyName} Privacy Policy
Last updated: ${f.lastUpdated}

${f.companyName} ("we," "us," or "our") operates ${f.websiteUrl}. We are committed to protecting your personal information and your right to privacy.

Information We Collect
We may collect the following types of personal information: ${f.dataTypes || "[data types]"}.

How We Use Your Information
We use the information we collect to ${f.purpose || "[describe purpose]"} and to communicate with you about our services.

Data Retention
We retain your personal information for ${f.retentionPeriod} unless a longer retention period is required by law.

Your Rights
You have the right to access, correct, or delete your personal data at any time.

Contact Us
If you have questions about this Privacy Policy, please contact us at ${f.contactEmail}.

${f.companyName} | ${f.address} | ${f.state}
`.trim()

interface PolicyFields {
  companyName: string
  websiteUrl: string
  contactEmail: string
  address: string
  state: string
  dataTypes: string
  purpose: string
  retentionPeriod: string
  lastUpdated: string
}

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-foreground mb-1.5">
      <span className="text-red-500 mr-1">*</span>{children}
    </label>
  )
}

function Field({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("space-y-0", className)}>{children}</div>
}

function TextInput({ id, defaultValue, placeholder, className, fieldLabel, onAutoSave }: {
  id?: string; defaultValue?: string; placeholder?: string; className?: string
  fieldLabel?: string; onAutoSave?: (label: string) => void
}) {
  return (
    <input id={id} type="text" defaultValue={defaultValue} placeholder={placeholder}
      onBlur={() => fieldLabel && onAutoSave?.(fieldLabel)}
      className={cn("w-full h-11 rounded-lg border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 transition-colors", className)}
    />
  )
}

type RejectedField = "legal" | "ein" | "website"

function RejectionCard({ reason, onDismiss }: { reason: string; onDismiss: () => void }) {
  return (
    <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 space-y-3">
      <div className="flex items-start gap-2.5">
        <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-red-900">Our carrier could not verify this</p>
          <p className="text-xs text-red-700 mt-0.5 leading-relaxed">{reason}</p>
        </div>
      </div>
      <div className="border-t border-red-200 pt-2.5 flex justify-end">
        <button type="button" onClick={onDismiss}
          className="text-xs font-medium text-red-800 hover:text-red-900 transition-colors"
        >
          I've updated this →
        </button>
      </div>
    </div>
  )
}

function DevNote({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-2.5">
        <div className="flex items-center justify-center h-5 w-5 rounded-full bg-amber-400 text-[10px] font-bold text-white shrink-0 mt-0.5">
          {number}
        </div>
        <div className="text-xs text-amber-900 leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

export function CompanyPage({ navigate, privacyPublished, onPrivacyPublish, brandStatus }: Props) {
  const [einRevealed, setEinRevealed] = useState(false)
  const [scanning, setScanning] = useState(true)
  const [foundPrivacyUrl, setFoundPrivacyUrl] = useState("")

  // Mad-lib form state — pre-populated from "Entrata system"
  const [fields, setFields] = useState<PolicyFields>({
    companyName: "Sunset Properties LLC",
    websiteUrl: "https://www.sunsetproperties.com",
    contactEmail: "sarah.johnson@sunsetproperties.com",
    address: "123 Main Street, Suite 200, Austin",
    state: "TX",
    dataTypes: "name, email address, phone number, mailing address, payment information",
    purpose: "process lease applications and rental payments, communicate service updates",
    retentionPeriod: "3 years",
    lastUpdated: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  })
  const [policyPreviewOpen, setPolicyPreviewOpen] = useState(false)
  // Fades the green privacy policy success state back to a plain white input
  const [privacyFaded, setPrivacyFaded] = useState(false)
  // Toast for brand & profile approved
  const [toastVisible, setToastVisible] = useState(false)
  // Twilio rejection simulation
  const [rejectedFields, setRejectedFields] = useState<Set<RejectedField>>(new Set())
  // Auto-save toast
  const [savedLabel, setSavedLabel] = useState<string | null>(null)

  function triggerAutoSave(label: string) {
    setSavedLabel(label)
    setTimeout(() => setSavedLabel(null), 2200)
  }

  function dismissRejection(field: RejectedField) {
    setRejectedFields((prev) => { const s = new Set(prev); s.delete(field); return s })
  }
  function simulateRejection() {
    setRejectedFields(new Set<RejectedField>(["legal", "ein", "website"]))
  }

  function setField(key: keyof PolicyFields, val: string) {
    setFields((p) => ({ ...p, [key]: val }))
  }

  // Auto-scan on mount — simulates "not found" so the Mad-lib builder is shown
  useEffect(() => {
    const t = setTimeout(() => setScanning(false), 1800)
    return () => clearTimeout(t)
  }, [])

  // After publishing: briefly show green, then fade to plain white
  useEffect(() => {
    if (!privacyPublished) return
    const t = setTimeout(() => setPrivacyFaded(true), 1500)
    return () => clearTimeout(t)
  }, [privacyPublished])

  // Show toast when brand is approved; auto-dismiss after 3s
  useEffect(() => {
    if (brandStatus !== "approved") return
    setToastVisible(true)
    const t = setTimeout(() => setToastVisible(false), 3000)
    return () => clearTimeout(t)
  }, [brandStatus])

  const generatedPolicy = POLICY_TEMPLATE(fields)

  return (
    <div className="p-6 md:p-8">
      {/* ── Toast — auto-save confirmation ───────────────────────────────── */}
      {savedLabel && (
        <div className="fixed top-4 right-6 z-50 flex items-center gap-2.5 bg-white border border-border rounded-xl shadow-lg px-4 py-3 min-w-[260px] animate-in fade-in slide-in-from-top-2 duration-150">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <p className="text-sm font-medium text-foreground">{savedLabel} updated</p>
        </div>
      )}

      {/* ── Toast — brand & profile approved ────────────────────────────── */}
      {toastVisible && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white border border-border rounded-xl shadow-lg px-4 py-3 min-w-[320px] animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Carrier registration approved</p>
            <p className="text-xs text-muted-foreground mt-0.5">Your business is verified. We're setting up your phone numbers now.</p>
          </div>
          <button type="button" onClick={() => setToastVisible(false)}
            className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-zinc-100 transition-colors shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => navigate("overview")}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1 -ml-2 text-muted-foreground")}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Overview
        </button>
        <button
          type="button"
          onClick={simulateRejection}
          className="flex items-center gap-1.5 h-8 px-3 rounded-md border border-dashed border-red-300 bg-white text-xs font-medium text-red-600 hover:bg-red-50 hover:border-red-400 transition-colors"
        >
          <TriangleAlert className="h-3.5 w-3.5" />
          Simulate carrier rejection
        </button>
      </div>

      <div className="flex gap-8 items-start">
        {/* ── Main form ─────────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 max-w-6xl space-y-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Carrier Compliance</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Confirm your business details so we can register your company with our carrier. This keeps your texts and calls compliant — without it, your messages can be blocked or result in fines.
            </p>
          </div>

          {/* Company Information */}
          <div className="space-y-5">
            <Field>
              <RequiredLabel>Legal Business Name</RequiredLabel>
              <TextInput
                id="legal"
                defaultValue="Sunset Properties LLC"
                fieldLabel="Legal Business Name"
                onAutoSave={triggerAutoSave}
                className={rejectedFields.has("legal") ? "border-red-400 focus:ring-red-400/20" : undefined}
              />
              {rejectedFields.has("legal") && (
                <RejectionCard
                  reason="Our carrier could not match this name against official registration records. Update it to exactly match your official state or federal business registration."
                  onDismiss={() => dismissRejection("legal")}
                />
              )}
            </Field>

            <Field>
              <RequiredLabel>EIN (Federal Tax ID)</RequiredLabel>
              <div className="relative">
                <input id="ein" type="text" readOnly
                  value={einRevealed ? PREFILLED_EIN : maskedEin}
                  className={cn(
                    "w-full h-11 rounded-lg border bg-zinc-50 px-3 pr-10 text-sm text-muted-foreground cursor-default focus:outline-none",
                    rejectedFields.has("ein") ? "border-red-400" : "border-border",
                  )}
                />
                <button type="button" onClick={() => setEinRevealed((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  aria-label={einRevealed ? "Hide EIN" : "Reveal EIN"}
                >
                  <Lock className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">Pulled from your Entrata account. Contact support to update.</p>
              {rejectedFields.has("ein") && (
                <RejectionCard
                  reason="Our carrier could not verify this EIN against IRS records. Make sure it matches your official IRS registration exactly (format: XX-XXXXXXX)."
                  onDismiss={() => dismissRejection("ein")}
                />
              )}
            </Field>

            <Field>
              <RequiredLabel>Business Address</RequiredLabel>
              <TextInput id="address-street" defaultValue="123 Main Street, Suite 200" className="mb-2"
                fieldLabel="Business Address" onAutoSave={triggerAutoSave} />
              <div className="grid grid-cols-3 gap-2">
                <TextInput id="address-city" defaultValue="Austin" placeholder="City"
                  fieldLabel="City" onAutoSave={triggerAutoSave} />
                <TextInput id="address-state" defaultValue="TX" placeholder="State"
                  fieldLabel="State" onAutoSave={triggerAutoSave} />
                <TextInput id="address-zip" defaultValue="78701" placeholder="ZIP"
                  fieldLabel="ZIP Code" onAutoSave={triggerAutoSave} />
              </div>
            </Field>

            <Field>
              <RequiredLabel>Company Phone Number</RequiredLabel>
              <TextInput id="company-phone" defaultValue="(512) 555-0123"
                fieldLabel="Company Phone Number" onAutoSave={triggerAutoSave} />
            </Field>

            {/* Website URL */}
            <Field>
              <RequiredLabel>Website URL</RequiredLabel>
              <TextInput
                id="website"
                defaultValue="https://www.sunsetproperties.com"
                fieldLabel="Website URL"
                onAutoSave={triggerAutoSave}
                className={rejectedFields.has("website") ? "border-red-400 focus:ring-red-400/20" : undefined}
              />
              {scanning && (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  Scanning for a privacy policy…
                </div>
              )}
              {rejectedFields.has("website") && (
                <RejectionCard
                  reason="Our carrier could not verify this website. Make sure the URL is publicly accessible, belongs to your registered business, and doesn't redirect to an error or parked page."
                  onDismiss={() => dismissRejection("website")}
                />
              )}
            </Field>

            {/* Privacy Policy URL — appears after scan */}
            {!scanning && (
              <Field>
                <RequiredLabel>Privacy Policy URL</RequiredLabel>

                {/* Input — briefly green on publish, fades to white */}
                <div className="relative">
                  <input
                    type="text"
                    readOnly={privacyPublished}
                    value={privacyPublished ? `${fields.websiteUrl}/privacy-policy` : foundPrivacyUrl}
                    onChange={(e) => setFoundPrivacyUrl(e.target.value)}
                    placeholder="No privacy policy detected"
                    className={cn(
                      "w-full h-11 rounded-lg border px-3 pr-10 text-sm focus:outline-none focus:ring-2 transition-colors duration-1000",
                      privacyPublished && !privacyFaded
                        ? "border-emerald-300 bg-emerald-50 text-foreground focus:ring-emerald-500/20"
                        : privacyPublished && privacyFaded
                        ? "border-border bg-white text-foreground focus:ring-zinc-900/20"
                        : "border-red-300 bg-white text-foreground placeholder:text-red-400 focus:ring-red-400/20",
                    )}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    {privacyPublished
                      ? <CheckCircle2 className={cn("h-4 w-4 transition-colors duration-1000", privacyFaded ? "text-emerald-600/40" : "text-emerald-600")} />
                      : <XCircle className="h-4 w-4 text-red-500" />}
                  </span>
                </div>

                {/* Inline success — fades out */}
                {privacyPublished && !privacyFaded && (
                  <p className="mt-1.5 text-xs text-emerald-700 flex items-center gap-1.5 transition-opacity duration-700">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    Valid privacy policy published and verified
                  </p>
                )}

                {/* Error + Mad-lib builder */}
                {!privacyPublished && (
                  <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 space-y-4">
                    <div className="flex items-start gap-2.5">
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-900">No valid privacy policy detected</p>
                        <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                          A publicly accessible privacy policy is required to keep your business compliant. Fill in the details below to generate one for your website.
                        </p>
                      </div>
                    </div>

                    {/* Mad-lib fields */}
                    <div className="space-y-3 pt-1">
                      <p className="text-xs font-semibold text-red-900 uppercase tracking-wide">Generate a privacy policy</p>

                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: "Company name", key: "companyName" as const, placeholder: "Your company name" },
                          { label: "Website URL", key: "websiteUrl" as const, placeholder: "https://yoursite.com" },
                          { label: "Contact email", key: "contactEmail" as const, placeholder: "privacy@yourcompany.com" },
                          { label: "State", key: "state" as const, placeholder: "e.g. TX" },
                        ].map(({ label, key, placeholder }) => (
                          <div key={key}>
                            <label className="block text-[11px] font-medium text-red-800 mb-1">{label}</label>
                            <input type="text" value={fields[key]} placeholder={placeholder}
                              onChange={(e) => setField(key, e.target.value)}
                              className="w-full h-8 rounded-md border border-red-200 bg-white px-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-red-400/20"
                            />
                          </div>
                        ))}
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-red-800 mb-1">Types of data you collect</label>
                        <input type="text" value={fields.dataTypes}
                          onChange={(e) => setField("dataTypes", e.target.value)}
                          placeholder="e.g. name, email, phone number, payment info"
                          className="w-full h-8 rounded-md border border-red-200 bg-white px-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-red-400/20"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-red-800 mb-1">Purpose of data collection</label>
                        <input type="text" value={fields.purpose}
                          onChange={(e) => setField("purpose", e.target.value)}
                          placeholder="e.g. process applications and payments"
                          className="w-full h-8 rounded-md border border-red-200 bg-white px-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-red-400/20"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-red-800 mb-1">Data retention period</label>
                          <select value={fields.retentionPeriod}
                            onChange={(e) => setField("retentionPeriod", e.target.value)}
                            className="w-full h-8 rounded-md border border-red-200 bg-white px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-red-400/20"
                          >
                            <option>1 year</option>
                            <option>2 years</option>
                            <option>3 years</option>
                            <option>5 years</option>
                            <option>7 years</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Policy preview toggle */}
                    <div className="border-t border-red-200 pt-3">
                      <button type="button"
                        onClick={() => setPolicyPreviewOpen((v) => !v)}
                        className="flex items-center gap-1.5 text-xs font-medium text-red-800 hover:text-red-900 transition-colors"
                      >
                        {policyPreviewOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        {policyPreviewOpen ? "Hide preview" : "Preview generated policy"}
                      </button>
                      {policyPreviewOpen && (
                        <div className="mt-2 rounded-md border border-red-200 bg-white p-3 max-h-48 overflow-y-auto">
                          <pre className="text-[11px] text-foreground/80 leading-relaxed whitespace-pre-wrap font-sans">
                            {generatedPolicy}
                          </pre>
                        </div>
                      )}
                    </div>

                    {/* Publish action */}
                    <div className="border-t border-red-200 pt-3 flex items-center justify-between gap-3">
                      <p className="text-xs text-red-700 leading-snug">
                        This will add a <code className="font-mono bg-red-100 px-1 rounded">/privacy-policy</code> page to your website and submit it to carriers.
                      </p>
                      <button type="button" onClick={onPrivacyPublish}
                        className="h-8 px-3.5 rounded-md bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800 transition-colors flex items-center gap-1.5 shrink-0"
                      >
                        <Globe className="h-3.5 w-3.5" />
                        Publish to website
                      </button>
                    </div>
                  </div>
                )}
              </Field>
            )}
          </div>

          {/* Authorized Representative */}
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold tracking-tight">Authorized Representative</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Contact person authorized to manage this account</p>
            </div>
            <Field>
              <RequiredLabel>Full Name</RequiredLabel>
              <TextInput id="rep-name" defaultValue="Sarah Johnson"
                fieldLabel="Full Name" onAutoSave={triggerAutoSave} />
            </Field>
            <Field>
              <RequiredLabel>Email Address</RequiredLabel>
              <TextInput id="rep-email" defaultValue="sarah.johnson@sunsetproperties.com"
                fieldLabel="Email Address" onAutoSave={triggerAutoSave} />
            </Field>
            <Field>
              <RequiredLabel>Phone Number</RequiredLabel>
              <TextInput id="rep-phone" defaultValue="(512) 555-0124"
                fieldLabel="Phone Number" onAutoSave={triggerAutoSave} />
            </Field>
          </div>

          {/* Brand submission progress — inline card only while submitting */}
          {brandStatus === "submitting" && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">Registering your business with our carrier…</p>
                  <p className="text-xs text-blue-700 mt-0.5">This usually takes around 15 minutes. We'll notify you when it's approved.</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── Developer notes sidebar ────────────────────────────────────────── */}
        <div className="w-[380px] shrink-0 space-y-3 sticky top-6 self-start">
          <div className="flex items-center gap-2 mb-1">
            <Code2 className="h-4 w-4 text-amber-600" />
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">Developer notes</p>
          </div>

          <DevNote number={1}>
            <p className="font-semibold mb-1">Auto-fill the form — don't make the user type</p>
            We already have most of this in Entrata. Pull company name, EIN, and address from <span className="font-medium">Client Admin → Merchant Services</span>. Pull contact details from the <span className="font-medium">Communications tab</span> (Patrick Muir's team). If a field isn't found, leave it blank and let the user fill it in. This page should almost never be empty for an active customer.
          </DevNote>

          <DevNote number={2}>
            <p className="font-semibold mb-1">Find the website and privacy policy automatically</p>
            Two HTTP calls: (1) take the company name + address we already have → web search → grab the first result that looks like their real website → save it to the Website URL field. (2) visit that website → look for any link that says "privacy" → if found, mark yes. If either call fails, show the field and ask the user to fill it in manually.
          </DevNote>

          <DevNote number={3}>
            <p className="font-semibold mb-1">Submit to Twilio as soon as the form is complete</p>
            The moment all required fields are filled, automatically submit a brand &amp; profile to Twilio in the background — no button needed. Takes about 15 minutes. Almost always approved. Note: Entrata has two Twilio environments today (Colleen and Entrata). Engineering decides which one to use — that's an open question for that team.
          </DevNote>

          <DevNote number={4}>
            <p className="font-semibold mb-1">Handle rejections with a self-serve loop</p>
            If Twilio rejects a field (wrong EIN, bad website URL, etc.), we need Twilio to send back which field failed and why. Show that reason as a red error on the exact field. User fixes it → we resubmit automatically. Repeat until approved. Once approved, the Communications tab takes over: 4 campaigns are created, numbers are purchased, and properties get assigned — all automatic.
          </DevNote>
        </div>
      </div>
    </div>
  )
}
