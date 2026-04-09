"use client"

import { useState, useEffect, useRef } from "react"
import { CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp, Globe } from "lucide-react"

interface PolicyFields {
  companyName: string
  contactEmail: string
  state: string
  dataTypes: string
  purpose: string
  retentionPeriod: string
  lastUpdated: string
}

const POLICY_TEMPLATE = (websiteUrl: string, f: PolicyFields) => `
${f.companyName} Privacy Policy
Last updated: ${f.lastUpdated}

${f.companyName} ("we," "us," or "our") operates ${websiteUrl}. We are committed to protecting your personal information and your right to privacy.

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

${f.companyName} | ${f.state}
`.trim()

interface Props {
  onPublish: () => void
  alreadyPublished: boolean
}

export function TenDlcSheetContent({ onPublish, alreadyPublished }: Props) {
  const [websiteUrl, setWebsiteUrl] = useState("https://www.sunsetproperties.com")
  const [scanning, setScanning] = useState(true)
  const [policyPreviewOpen, setPolicyPreviewOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [fields, setFields] = useState<PolicyFields>({
    companyName: "Sunset Properties LLC",
    contactEmail: "sarah.johnson@sunsetproperties.com",
    state: "TX",
    dataTypes: "name, email address, phone number, mailing address, payment information",
    purpose: "process lease applications and rental payments, communicate service updates",
    retentionPeriod: "3 years",
    lastUpdated: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  })

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

  const generatedPolicy = POLICY_TEMPLATE(websiteUrl, fields)

  if (alreadyPublished) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-emerald-900">Privacy policy published</p>
          <p className="text-xs text-emerald-700 mt-0.5">Your website is compliant. Your privacy policy is on file and verified by our carrier.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
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
          We scan this URL automatically for a privacy policy. Update it to re-scan.
        </p>
      </div>

      <div className="border-t border-border" />

      <p className="text-sm font-semibold text-foreground">Privacy Policy</p>

      {/* Scanning */}
      {scanning && (
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-zinc-50 px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">Scanning for a privacy policy…</p>
        </div>
      )}

      {/* After scan — show not-found state */}
      {!scanning && (
        <>
          {/* ❌ No privacy policy detected */}
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 space-y-4">
            <div className="flex items-start gap-2.5">
              <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-900">No privacy policy detected</p>
                <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                  A publicly accessible privacy policy is required to keep your business compliant. Fill in the details below to generate one.
                </p>
              </div>
            </div>

            {/* Mad-lib fields */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-red-900 uppercase tracking-wide">Generate a privacy policy</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { label: "Company name",  key: "companyName" as const,  placeholder: "Your company name" },
                  { label: "Contact email", key: "contactEmail" as const, placeholder: "privacy@yourcompany.com" },
                  { label: "State",         key: "state" as const,        placeholder: "e.g. TX" },
                ] as const).map(({ label, key, placeholder }) => (
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
              <div className="w-1/2">
                <label className="block text-[11px] font-medium text-red-800 mb-1">Data retention period</label>
                <select value={fields.retentionPeriod} onChange={(e) => setField("retentionPeriod", e.target.value)}
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

            {/* Preview toggle */}
            <div className="border-t border-red-200 pt-3">
              <button type="button" onClick={() => setPolicyPreviewOpen((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-medium text-red-800 hover:text-red-900 transition-colors"
              >
                {policyPreviewOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {policyPreviewOpen ? "Hide preview" : "Preview generated policy"}
              </button>
              {policyPreviewOpen && (
                <div className="mt-2 rounded-md border border-red-200 bg-white p-3 max-h-40 overflow-y-auto">
                  <pre className="text-[11px] text-foreground/80 leading-relaxed whitespace-pre-wrap font-sans">{generatedPolicy}</pre>
                </div>
              )}
            </div>

            {/* Publish CTA */}
            <div className="border-t border-red-200 pt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-red-700 leading-snug">
                Adds a <code className="font-mono bg-red-100 px-1 rounded">/privacy-policy</code> page to your website and submits it to carriers.
              </p>
              <button type="button" onClick={onPublish}
                className="h-8 px-3.5 rounded-md bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800 transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Globe className="h-3.5 w-3.5" />
                Publish to website
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
