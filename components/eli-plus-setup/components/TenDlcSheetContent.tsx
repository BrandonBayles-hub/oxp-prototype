"use client"

import { useState, useEffect, useRef } from "react"
import {
  CheckCircle2, XCircle, Loader2, Globe, Copy, Check,
  RefreshCw, TriangleAlert, ChevronDown, ChevronUp, Info,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types & template ──────────────────────────────────────────────────────────

interface PolicyFields {
  messageFrequency: string
  retentionApplication: string
  retentionResident: string
  retentionComms: string
  retentionWebActivity: string
  retentionBackground: string
}

const DEFAULT_FIELDS: PolicyFields = {
  messageFrequency: "",
  retentionApplication: "",
  retentionResident: "",
  retentionComms: "",
  retentionWebActivity: "",
  retentionBackground: "",
}

// Pre-filled company data (comes from carrier compliance form values)
const COMPANY_NAME = "Sunset Properties LLC"
const COMPANY_ADDRESS = "4821 Oak Creek Drive, Austin, TX 78741"
const COMPANY_PHONE = "(512) 555-0182"
const CONTACT_EMAIL = "sarah.johnson@sunsetproperties.com"
const REP_NAME = "Sarah Johnson"
const CHATBOT_NAME = "ELI"
const EFFECTIVE_DATE = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

function POLICY_TEMPLATE(f: PolicyFields) {
  const freq = f.messageFrequency
    ? ({
        "varies": "a varying number of messages per month (frequency changes month to month)",
        "1": "approximately 1 message per month",
        "2": "approximately 2 messages per month",
        "4": "approximately 4 messages per month",
        "8": "approximately 8 messages per month",
      }[f.messageFrequency] ?? f.messageFrequency)
    : "[message frequency not specified]"

  return `PRIVACY POLICY
${COMPANY_NAME}
Effective Date: ${EFFECTIVE_DATE}

1. INTRODUCTION
${COMPANY_NAME} ("we," "us," or "our") operates residential property management services. This Privacy Policy describes how we collect, use, disclose, and protect your information.

2. INFORMATION WE COLLECT
We collect information you provide directly, including name, contact details, financial information for lease applications and payments, and identification documents.

3. SMS / TEXT MESSAGE COMMUNICATIONS
By providing your phone number and opting in, you consent to receive text messages from ${COMPANY_NAME} regarding your tenancy. Message frequency: ${freq}. Message and data rates may apply. Reply STOP to opt out at any time.

4. DATA RETENTION
- Rental applications: ${f.retentionApplication || "[not specified]"}
- Resident records: ${f.retentionResident || "[not specified]"}
- Communications logs: ${f.retentionComms || "[not specified]"}
- Web activity / analytics: ${f.retentionWebActivity || "[not specified]"}
- Background check records: ${f.retentionBackground || "[not specified]"}

5. HOW WE USE YOUR INFORMATION
We use your information to process applications, manage tenancy, send service communications via ${CHATBOT_NAME}, and comply with legal obligations.

6. CONTACT US
${COMPANY_NAME} | ${COMPANY_ADDRESS}
Phone: ${COMPANY_PHONE} | Email: ${CONTACT_EMAIL}
Authorized Representative: ${REP_NAME}`.trim()
}

// ── Retention accordion ───────────────────────────────────────────────────────

const RETENTION_FIELDS = [
  { key: "retentionApplication" as const, label: "Rental applications", placeholder: "e.g. 3 years" },
  { key: "retentionResident" as const, label: "Resident records", placeholder: "e.g. 7 years" },
  { key: "retentionComms" as const, label: "Communications logs", placeholder: "e.g. 2 years" },
  { key: "retentionWebActivity" as const, label: "Web activity / analytics", placeholder: "e.g. 1 year" },
  { key: "retentionBackground" as const, label: "Background check records", placeholder: "e.g. 5 years" },
]

function RetentionAccordion({
  fields,
  setField,
}: {
  fields: PolicyFields
  setField: (k: keyof PolicyFields, v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const allFilled = RETENTION_FIELDS.every((f) => fields[f.key] !== "")

  return (
    <div className="rounded-lg border border-amber-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-amber-50/60 text-left hover:bg-amber-50 transition-colors"
      >
        <span className="text-[11px] font-semibold text-amber-900">
          <span className="text-red-500 mr-1">*</span>Data retention periods
          {allFilled && <span className="ml-2 text-emerald-700 font-medium">✓ Complete</span>}
          {!allFilled && (
            <span className="ml-2 text-amber-700 font-normal">
              {RETENTION_FIELDS.filter((f) => fields[f.key] === "").length} remaining
            </span>
          )}
        </span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-amber-700 shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-amber-700 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 py-3 bg-white space-y-2.5">
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Required for legal compliance. Enter how long you retain each data type (e.g. "3 years"). Carriers require explicit retention periods in your policy.
          </p>
          {RETENTION_FIELDS.map(({ key, label, placeholder }) => (
            <div key={key} className="flex items-center gap-3">
              <label className="text-[11px] font-medium text-zinc-700 w-40 shrink-0">{label}</label>
              <input
                type="text"
                value={fields[key]}
                onChange={(e) => setField(key, e.target.value)}
                placeholder={placeholder}
                className={cn(
                  "flex-1 h-7 rounded-md border px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/30 bg-white",
                  fields[key] === "" ? "border-amber-300" : "border-amber-200 text-foreground",
                )}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Disclaimer ────────────────────────────────────────────────────────────────

function Disclaimer() {
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleEnter() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setOpen(true)
  }
  function handleLeave() {
    timerRef.current = setTimeout(() => setOpen(false), 120)
  }

  return (
    <div
      className="relative flex items-center gap-1 cursor-default"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <Info className="h-3.5 w-3.5 text-zinc-700" />
      <span className="text-[11px] font-medium text-zinc-700">Disclaimer</span>
      {open && (
        <div
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          className="absolute bottom-full right-0 mb-2.5 w-96 rounded-xl border border-zinc-200 bg-white shadow-2xl z-50 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-zinc-100">
            <p className="text-xs font-bold text-zinc-800 uppercase tracking-wide">Legal Disclaimer</p>
          </div>
          <div className="px-5 py-4 space-y-3 max-h-72 overflow-y-auto">
            <p className="text-xs text-zinc-600 leading-relaxed">
              This template was created by a general purpose large language model for informational purposes only and is{" "}
              <span className="font-semibold text-zinc-800">not legal advice</span>. It is intended as a starting point only and should not be relied upon as a substitute for consultation with qualified legal counsel. Use is at your own risk. Entrata shall not be liable for any damages, losses, or other consequences arising from its use or adaptation.
            </p>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Each organization's privacy practices, data processing activities, and regulatory obligations are unique. Applicable privacy laws and regulations vary by jurisdiction, industry, and the nature of personal data collected and processed. This template may not address all legal requirements applicable to your organization.
            </p>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Before using or adapting this template, you should conduct a thorough review of your organization's specific data collection and processing activities, assess all applicable legal and regulatory requirements, and consult with legal counsel to ensure compliance.
            </p>
          </div>
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-zinc-200" />
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  onPublish: () => void
  alreadyPublished: boolean
}

export function TenDlcSheetContent({ onPublish, alreadyPublished }: Props) {
  const [websiteUrl, setWebsiteUrl] = useState("https://www.sunsetproperties.com")
  const [scanning, setScanning] = useState(true)
  const [fields, setFields] = useState<PolicyFields>(DEFAULT_FIELDS)
  const [copied, setCopied] = useState(false)
  const [awaitingConfirm, setAwaitingConfirm] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const retentionKeys: (keyof PolicyFields)[] = [
    "retentionApplication", "retentionResident", "retentionComms",
    "retentionWebActivity", "retentionBackground",
  ]
  const policyReady =
    fields.messageFrequency !== "" && retentionKeys.every((k) => fields[k] !== "")

  const generatedPolicy = POLICY_TEMPLATE(fields)

  function setField(key: keyof PolicyFields, val: string) {
    setFields((p) => ({ ...p, [key]: val }))
  }

  // Auto-scan on mount
  useEffect(() => {
    const t = setTimeout(() => setScanning(false), 1600)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleUrlChange(val: string) {
    setWebsiteUrl(val)
    setScanning(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setScanning(false), 900)
  }

  function handleCopy() {
    navigator.clipboard?.writeText(generatedPolicy).catch(() => {})
    setCopied(true)
    setAwaitingConfirm(true)
    setTimeout(() => setCopied(false), 2200)
  }

  function handleVerify() {
    setVerifying(true)
    setTimeout(() => {
      setVerifying(false)
      onPublish()
    }, 2200)
  }

  if (alreadyPublished) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-emerald-900">Privacy policy published</p>
          <p className="text-xs text-emerald-700 mt-0.5">
            Your website is compliant. Your privacy policy is on file and verified by our carrier.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Website URL */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">
          <span className="text-red-500 mr-1">*</span>Website URL
        </label>
        <input
          type="text"
          value={websiteUrl}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="https://www.yourcompany.com"
          className="w-full h-11 rounded-lg border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          We scan this URL automatically for an existing privacy policy. Update it to re-scan.
        </p>
      </div>

      {/* Privacy Policy URL — read-only scan result */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">
          <span className="text-red-500 mr-1">*</span>Privacy Policy URL
          <span className="ml-2 text-xs font-normal text-muted-foreground">— scanned from your website</span>
        </label>
        <div className="relative">
          <input
            type="text"
            readOnly
            value={scanning ? "" : ""}
            placeholder={scanning ? "Scanning…" : "No privacy policy detected"}
            className={cn(
              "w-full h-11 rounded-lg border px-3 pr-10 text-sm focus:outline-none transition-colors",
              scanning
                ? "border-border bg-zinc-50 placeholder:text-muted-foreground/40"
                : "border-amber-300 bg-amber-50/40 placeholder:text-muted-foreground/60",
            )}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {scanning
              ? <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
              : <TriangleAlert className="h-4 w-4 text-amber-500" />}
          </span>
        </div>
      </div>

      {/* Resolution form — shown after scan finishes with no policy found */}
      {!scanning && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 px-5 py-4 space-y-5">
          {/* Notice */}
          <div className="flex items-start gap-2.5">
            <TriangleAlert className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">No privacy policy found</p>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                We scanned <span className="font-medium">{websiteUrl}</span> but didn't find a privacy policy page. Fill in the details below to generate one.
              </p>
            </div>
          </div>

          {/* Pre-filled callout */}
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-white px-4 py-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-700 leading-relaxed">
              We've pre-filled parts of this policy using the details you entered in Carrier Compliance. To update any of those details, edit the fields on this page and your policy will reflect the changes automatically.
            </p>
          </div>

          {/* Required: message frequency */}
          <div>
            <label className="block text-[11px] font-semibold text-amber-900 mb-1.5">
              <span className="text-red-500 mr-1">*</span>How often will you send text messages?
            </label>
            <select
              value={fields.messageFrequency}
              onChange={(e) => setField("messageFrequency", e.target.value)}
              className={cn(
                "h-8 rounded-md border px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/30 bg-white",
                fields.messageFrequency === ""
                  ? "border-amber-300 text-muted-foreground"
                  : "border-amber-200 text-foreground",
              )}
            >
              <option value="" disabled>Select frequency…</option>
              <option value="varies">Varies — frequency changes month to month</option>
              <option value="1">~1 message per month</option>
              <option value="2">~2 messages per month</option>
              <option value="4">~4 messages per month</option>
              <option value="8">~8 messages per month</option>
            </select>
            <p className="text-[11px] text-amber-700 mt-1">
              Required by carriers. This appears in your policy's SMS section.
            </p>
          </div>

          {/* Required: retention periods */}
          <RetentionAccordion fields={fields} setField={setField} />

          {/* Live template preview — always visible */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-amber-900">Generated policy</p>
              <Disclaimer />
            </div>
            <div className="rounded-lg border border-amber-200 bg-white p-3 max-h-52 overflow-y-auto">
              <pre className="text-[11px] text-foreground/75 leading-relaxed whitespace-pre-wrap font-sans">
                {generatedPolicy}
              </pre>
            </div>
          </div>

          {/* Action buttons */}
          <div className="border-t border-amber-200 pt-4 space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              {/* Publish button */}
              <div className="relative group">
                <button
                  type="button"
                  onClick={policyReady ? onPublish : undefined}
                  disabled={!policyReady}
                  className={cn(
                    "h-9 px-4 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors",
                    policyReady
                      ? "bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer"
                      : "bg-zinc-200 text-zinc-400 cursor-not-allowed",
                  )}
                >
                  <Globe className="h-3.5 w-3.5" />
                  Publish to my website
                </button>
                {!policyReady && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-lg border border-zinc-200 bg-white shadow-xl px-3.5 py-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                    <p className="text-[11px] text-zinc-700 leading-relaxed">
                      Complete <span className="font-semibold">message frequency</span> and all{" "}
                      <span className="font-semibold">data retention periods</span> above to unlock.
                    </p>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-zinc-200" />
                  </div>
                )}
              </div>

              {/* Copy button */}
              <div className="relative group">
                <button
                  type="button"
                  onClick={policyReady ? handleCopy : undefined}
                  disabled={!policyReady}
                  className={cn(
                    "h-9 px-4 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors",
                    policyReady
                      ? "border-amber-300 bg-white text-amber-900 hover:border-amber-400 hover:bg-amber-50 cursor-pointer"
                      : "border-zinc-200 bg-zinc-50 text-zinc-400 cursor-not-allowed",
                  )}
                >
                  {copied
                    ? <><Check className="h-3.5 w-3.5 text-emerald-600" /> Copied!</>
                    : <><Copy className="h-3.5 w-3.5" /> Copy policy text</>}
                </button>
                {!policyReady && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-lg border border-zinc-200 bg-white shadow-xl px-3.5 py-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                    <p className="text-[11px] text-zinc-700 leading-relaxed">
                      Complete <span className="font-semibold">message frequency</span> and all{" "}
                      <span className="font-semibold">data retention periods</span> above to unlock.
                    </p>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-zinc-200" />
                  </div>
                )}
              </div>

              {/* Verify button — always visible, enabled only after copy */}
              <div className="relative group">
                <button
                  type="button"
                  onClick={awaitingConfirm && !verifying ? handleVerify : undefined}
                  disabled={!awaitingConfirm || verifying}
                  className={cn(
                    "h-9 px-4 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors",
                    awaitingConfirm && !verifying
                      ? "border-zinc-300 bg-white text-foreground hover:border-zinc-400 cursor-pointer"
                      : "border-zinc-200 bg-zinc-50 text-zinc-400 cursor-not-allowed",
                  )}
                >
                  {verifying
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying…</>
                    : <><RefreshCw className="h-3.5 w-3.5" /> I've added it — verify my site</>}
                </button>
                {!awaitingConfirm && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-lg border border-zinc-200 bg-white shadow-xl px-3.5 py-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                    <p className="text-[11px] text-zinc-700 leading-relaxed">
                      First, <span className="font-semibold">copy the policy text</span> using the button to the left, then paste it into your website. Once it's live, come back here and click to verify.
                    </p>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-zinc-200" />
                  </div>
                )}
              </div>
            </div>

            <p className="text-[11px] text-amber-700 leading-relaxed">
              <span className="font-medium">Publish to my website</span> adds a{" "}
              <span className="font-mono bg-amber-100 px-1 rounded">/privacy-policy</span> page automatically for Entrata-hosted sites.{" "}
              <span className="font-medium">Copy policy text</span> lets you paste it into your own CMS or third-party website.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
