import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import {
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Copy,
  FileText,
  Globe,
  Eye,
  EyeOff,
  Info,
} from "lucide-react"

// ── Privacy policy template fields (v2 — legal template) ─────────────────────
export interface TemplateFields {
  // Company
  companyName: string
  effectiveDate: string
  lastUpdated: string
  // SMS & Communications
  messageFrequency: string
  chatbotProvider: string
  // Privacy Contact
  privacyEmail: string
  companyAddress: string
  appealContact: string
  privacyFormUrl: string
  tollFreeNumber: string
  // California Supplement
  retentionApplication: string
  retentionResident: string
  retentionComms: string
  retentionWebsite: string
  retentionBackground: string
  doNotSellMethod: string
  // Minnesota Supplement
  privacyOfficerName: string
  privacyOfficerEmail: string
  privacyOfficerPhone: string
}

const DEFAULT_FIELDS: TemplateFields = {
  companyName: "Sunset Property Group LLC",
  effectiveDate: "April 15, 2026",
  lastUpdated: "April 15, 2026",
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
  "companyName", "effectiveDate",
  "messageFrequency", "chatbotProvider", "privacyEmail",
  "companyAddress", "appealContact",
]

type SectionId = "company" | "sms" | "contact" | "california" | "minnesota"

interface FieldDef {
  key: keyof TemplateFields
  label: string
  placeholder: string
  optional?: boolean
  hint?: string
}

const FIELD_SECTIONS: Array<{
  id: SectionId
  label: string
  required: boolean
  badge?: string
  fields: FieldDef[]
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

// ── Policy generator ──────────────────────────────────────────────────────────
export function generatePrivacyPolicy(f: TemplateFields): string {
  const optionalPhone = f.tollFreeNumber ? `\n• Phone: ${f.tollFreeNumber}` : ""
  const optionalForm  = f.privacyFormUrl ? `\n• Online: ${f.privacyFormUrl}` : ""

  return `PRIVACY POLICY
${f.companyName}
Effective Date: ${f.effectiveDate}
Last Updated: ${f.lastUpdated}

NOTICE: This policy was generated from the Entrata PMC Privacy Policy Template (v2). Review with qualified legal counsel before publishing.

1. Introduction
This Privacy Policy describes how ${f.companyName} ("we," "us," or "our") collects, uses, discloses, and otherwise processes personal information in connection with our websites, mobile applications, text messaging and chatbot services, email communications, and the leasing, management, and operation of our residential apartment communities (collectively, the "Services"). This Privacy Policy applies to prospective residents, current residents, former residents, website visitors, and other individuals who interact with us through the Services.

2. Information We Collect
We collect the following categories of personal information:

A. Identifiers and Contact Information. Name, email address, phone number, mailing address, date of birth, and government-issued identification numbers (such as Social Security number, driver's license number, or passport number).

B. Financial and Payment Information. Bank account numbers, credit or debit card numbers, income and employment verification records, credit history and credit scores, and payment history.

C. Background Screening Information. Criminal background check results, eviction history, and credit reports obtained in connection with lease applications, subject to applicable law, including the Fair Credit Reporting Act.

D. Lease and Tenancy Information. Lease terms, unit number, move-in and move-out dates, rent payment records, maintenance request details, and other information related to your tenancy.

E. Communications Data. Transcripts and records of communications with us, including chatbot conversations, text messages, emails, and telephone call records.

F. Device and Online Activity Information. IP address, browser type and version, device identifiers, operating system, referring URLs, pages visited on our website, clickstream data, cookies, and similar tracking technologies.

G. Smart Home and IoT Device Data. Data generated by smart home devices installed in our communities, including smart lock access logs, thermostat usage, and connected device activity.

H. Inferences. Inferences drawn from the categories above to create a profile reflecting your preferences, characteristics, or behavior.

I. Sensitive Personal Information. Certain information we collect may be classified as sensitive under applicable state law, including Social Security number, government-issued identification numbers, financial account information with credentials, background screening and credit check data, and precise geolocation data (if collected through smart home or IoT devices). We will provide notice and, where required by applicable law, obtain your consent or provide an opportunity to opt out before processing sensitive personal information.

3. Sources of Personal Information
We collect personal information from the following sources:
• Directly from you, when you submit a lease application, sign a lease, make a payment, submit a maintenance request, communicate with us via chat, text, email, or phone, or otherwise interact with us.
• From third-party service providers, including consumer reporting agencies (for background and credit checks), payment processors, and identity verification services.
• Automatically, through cookies, pixels, and similar tracking technologies when you visit our website or interact with our online Services.
• From our technology platform providers, which operate our property management platform, chatbot, and text messaging services on our behalf.

4. How We Use Your Information
We use personal information for the following purposes:
• Leasing operations: Evaluating lease applications, conducting background and credit checks, executing and managing leases, and processing move-ins and move-outs.
• Rent collection and financial management: Processing rent payments, managing accounts receivable, and enforcing payment obligations.
• Maintenance and property operations: Responding to and tracking maintenance requests, managing smart home devices, and operating building systems.
• Communications: Responding to inquiries, sending transactional communications related to your lease, delivering service notifications, and communicating through chatbot, text, and email.
• Marketing and advertising: Sending promotional communications (where permitted and where you have opted in), operating targeted advertising campaigns, and analyzing the effectiveness of marketing efforts.
• Compliance and legal obligations: Complying with applicable laws, regulations, and legal processes, including fair housing laws, FCRA requirements, and billing disclosure requirements.
• Safety and security: Protecting the safety and security of our communities, residents, staff, and property.
• Business operations: Conducting internal analytics, improving our Services, and managing vendor relationships.

5. How We Share Your Information
We share personal information with the following categories of third parties: background screening providers, payment processors, maintenance vendors, insurance providers, smart lock and IoT providers, technology platform providers (including our property management platform, chatbot, and text messaging operators), advertising networks, analytics providers, law enforcement and government entities (as required by law), and professional advisors.

Sale and Sharing of Personal Information. We may share personal information with advertising networks through cookies, pixels, and similar tracking technologies. Under certain state laws, this may constitute a "sale" or "sharing" for targeted advertising. You have the right to opt out as described in Section 8.

6. Text Messaging, Chatbot, and Email Communications
By providing your phone number and consenting to receive text messages, you agree to receive transactional and, where you have separately opted in, promotional text messages from ${f.companyName} or our service providers, including through automated means.

Opt-in consent for text messaging is voluntary. You are not required to consent to text messaging as a condition of entering into a lease.

Opt-out. You may opt out of promotional text messages at any time by replying STOP to any message. Opting out of promotional messages will not affect transactional messages related to your lease.

Message frequency. You will receive approximately ${f.messageFrequency} messages per month. Message and data rates may apply. Carriers are not liable for delayed or undelivered messages.

No mobile information will be shared with third parties or affiliates for marketing or promotional purposes.

Our chatbot is operated by ${f.chatbotProvider} on our behalf. Communications through the chatbot are collected and processed in accordance with this Privacy Policy. Standard message and data rates may apply.

7. Cookies and Tracking Technologies
Our website uses cookies, web beacons, pixels, and similar tracking technologies for: strictly necessary functions (e.g., session management), analytics (understanding visitor behavior), and advertising (targeted ads and measurement). You may manage cookie preferences through your browser settings.

8. Your Privacy Rights
Depending on your state of residence, you may have rights including: right to know and access, right to correct, right to delete, right to portability, right to opt out of sale or targeted advertising, right to opt out of profiling, right to limit use of sensitive personal information, and right to non-discrimination.

How to exercise your rights. Contact us at:
• Email: ${f.privacyEmail}
• Mail: ${f.companyAddress}${optionalPhone}${optionalForm}

You may designate an authorized agent to submit a request on your behalf. We will verify your identity before processing requests. We will respond within the timeframe required by applicable law (generally 45 days).

Appeal. If we deny your request, you may appeal by contacting us at ${f.appealContact}. We will respond within the timeframe required by applicable law.

9. Data Security
We maintain reasonable administrative, technical, and physical safeguards designed to protect personal information, including encryption in transit and at rest, access controls, employee training, and periodic security assessments.

10. Children's Privacy
We do not knowingly collect personal information from individuals under the age of 16 and do not sell or share such information from individuals under 18.

11. Third-Party Links
Our website may contain links to third-party websites. We are not responsible for their privacy practices.

12. Changes to This Privacy Policy
We may update this Privacy Policy from time to time. When we make material changes, we will post the updated policy with a revised "Last Updated" date.

13. Contact Us
${f.companyName}
${f.companyAddress}
${f.tollFreeNumber || ""}
${f.privacyEmail}

14. State-Specific Supplements

14.1 California Residents (CCPA / CPRA — Cal. Civ. Code § 1798.100 et seq.)
Categories of personal information collected, sources, business purposes, and third-party disclosures are as identified in Sections 2–5 above.

Retention periods:
• Lease application data (non-residents): ${f.retentionApplication} years from date of application.
• Resident data: Duration of lease plus ${f.retentionResident} years following lease termination.
• Communications records (text, chatbot, email): ${f.retentionComms} years.
• Website activity data (cookies, analytics): ${f.retentionWebsite} months.
• Background screening reports: ${f.retentionBackground} years, subject to FCRA requirements.

Sensitive personal information: We collect Social Security numbers, government-issued IDs, financial account information, and background screening data. You have the right to limit our use to purposes necessary to perform the Services.

Do Not Sell or Share My Personal Information: You may opt out by ${f.doNotSellMethod}.

Financial incentive programs: We do not offer financial incentive programs related to the collection of personal information.

14.2 Minnesota Residents (Minn. Stat. § 325M et seq.)
Privacy Officer: ${f.privacyOfficerName}, ${f.privacyOfficerEmail}, ${f.privacyOfficerPhone}.
This Privacy Policy is accessible via a conspicuous hyperlink using the word "privacy" on our website homepage. We honor universal opt-out mechanisms, including the Global Privacy Control, for Minnesota residents.

14.3 Maryland Residents (Md. Code, Com. Law § 14-4601 et seq.)
We process sensitive personal information only when strictly necessary to provide the Services. We do not sell sensitive personal information or the personal information of consumers under 18. We do not use geofencing within 1,750 feet of any mental health or reproductive health facility.

14.4 Colorado Residents (Colo. Rev. Stat. § 6-1-1301 et seq.)
We honor universal opt-out mechanisms, including the Global Privacy Control. We obtain consent before processing sensitive personal information.

14.5 Oregon Residents (Or. Rev. Stat. § 646A.570 et seq.)
We honor universal opt-out mechanisms. We do not sell geolocation data accurate within 1,750 feet or the personal information of consumers under 16.

14.6 Connecticut Residents (Conn. Gen. Stat. § 42-515 et seq.)
We honor universal opt-out mechanisms. We obtain consent before processing sensitive personal information.

14.7 Virginia, Texas, Delaware, Montana, New Hampshire, New Jersey, Nebraska, Iowa, Tennessee, Indiana, Kentucky, Rhode Island, Utah, and Florida Residents
Residents of these states have the rights described in Section 8 above, subject to the specific scope and limitations of each state's law. To exercise your rights, contact us at ${f.privacyEmail}. Where applicable law provides a cure period, we will comply with such requirements.`
}

// ── Original privacy policy data ─────────────────────────────────────────────
const STATUS_CARDS = [
  {
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
    count: 40,
    label: "Valid Policy Found",
    detail: "Compliant and ready for ELI+",
  },
  {
    icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    count: 8,
    label: "Needs Update",
    detail: "Missing required SMS consent language",
  },
]

const COMPLIANT_PROPERTIES = [
  { id: "p1", name: "Sunset Lofts",         city: "Phoenix, AZ" },
  { id: "p2", name: "Harbor View",           city: "San Diego, CA" },
  { id: "p3", name: "The Meridian",          city: "Austin, TX" },
  { id: "p4", name: "Park Place Residences", city: "Denver, CO" },
  { id: "p5", name: "Riverwalk Commons",     city: "Nashville, TN" },
]

const THIRD_PARTY_PROPERTIES = [
  { id: "p6",  name: "River North Plaza", city: "Chicago",  state: "IL", website: "rivernorthplaza.com" },
  { id: "p9",  name: "The Reserve",       city: "Detroit",  state: "MI", website: "thereservedetroit.com" },
  { id: "p11", name: "Willow Creek",      city: "Portland", state: "OR", website: "willowcreekpdx.com" },
]

const getConsentLanguage = (propertyName: string) =>
  `By providing your phone number, you agree to receive automated text messages from ${propertyName} — including leasing updates, payment reminders, maintenance notifications, and renewal information. Message frequency varies. Message and data rates may apply. Reply HELP for assistance or STOP to opt out at any time. View our Privacy Policy and Terms of Use at ${propertyName.toLowerCase().replace(/\s+/g, "")}.com/legal.`

// ── Shared sub-components ────────────────────────────────────────────────────
interface OptionCardProps {
  icon: React.ElementType
  title: string
  description: string
  active: boolean
  onSelect: () => void
  children?: React.ReactNode
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
  property,
  confirmed,
  onConfirm,
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
function TemplateSectionHeader({
  label,
  badge,
  required,
  open,
  onToggle,
  isComplete,
}: {
  label: string
  badge?: string
  required: boolean
  open: boolean
  onToggle: () => void
  isComplete: boolean
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors",
        open ? "bg-zinc-100" : "hover:bg-zinc-50",
      )}
    >
      {isComplete
        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" aria-hidden />
        : <div className="h-3.5 w-3.5 rounded-full border border-zinc-300 shrink-0" />}
      <span className="flex-1 text-xs font-semibold text-foreground">{label}</span>
      {badge && (
        <span className="text-[10px] font-medium text-muted-foreground bg-zinc-100 border border-border rounded px-1.5 py-0.5">
          {badge}
        </span>
      )}
      {!required && (
        <span className="text-[10px] text-muted-foreground">Optional</span>
      )}
      {open
        ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
    </button>
  )
}

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
    return section.fields
      .filter(f => !f.optional)
      .every(f => fields[f.key].trim() !== "")
  }

  return (
    <div className="space-y-1">
      {FIELD_SECTIONS.map(section => {
        const isOpen = openSections.has(section.id)
        const isComplete = isSectionComplete(section)
        return (
          <div key={section.id} className="rounded-lg border border-border overflow-hidden">
            <TemplateSectionHeader
              label={section.label}
              badge={section.badge}
              required={section.required}
              open={isOpen}
              onToggle={() => toggleSection(section.id)}
              isComplete={isComplete}
            />
            {isOpen && (
              <div className="px-3 pb-3 pt-2 space-y-2.5 bg-zinc-50/50">
                {section.fields.map(f => (
                  <div key={f.key}>
                    <label className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground mb-1">
                      {f.label}
                      {f.optional && <span className="text-muted-foreground/60">(optional)</span>}
                      {f.hint && (
                        <span title={f.hint}>
                          <Info className="h-3 w-3 text-muted-foreground/50" aria-label={f.hint} />
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={fields[f.key]}
                      onChange={e => onChange(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-zinc-900"
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

// ── Policy preview overlay ────────────────────────────────────────────────────
function PolicyPreview({ fields, onClose }: { fields: TemplateFields; onClose: () => void }) {
  const policyText = generatePrivacyPolicy(fields)
  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-zinc-50">
        <p className="text-xs font-semibold text-foreground">Full Policy Preview</p>
        <div className="flex items-center gap-2">
          <CopyBtn text={policyText} />
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <EyeOff className="h-3 w-3" />
            Close
          </button>
        </div>
      </div>
      <div className="max-h-72 overflow-y-auto px-4 py-3">
        <pre className="text-[10px] text-zinc-700 whitespace-pre-wrap leading-relaxed font-sans">
          {policyText}
        </pre>
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export function PrivacySheetContent({ onValidChange }: { onValidChange: (valid: boolean) => void }) {
  const [mode, setMode] = useState<null | "copy" | "template">(null)
  const [selectedProperty, setSelectedProperty] = useState("")
  const [fields, setFields] = useState<TemplateFields>(DEFAULT_FIELDS)
  const [thirdPartyConfirmed, setThirdPartyConfirmed] = useState<Record<string, boolean>>({})
  const [showPreview, setShowPreview] = useState(false)

  const templateFieldsValid = REQUIRED_FIELDS.every(k => fields[k].trim() !== "")

  const policyValid =
    (mode === "copy" && selectedProperty !== "") ||
    (mode === "template" && templateFieldsValid)

  const allThirdPartyConfirmed =
    THIRD_PARTY_PROPERTIES.every(p => !!thirdPartyConfirmed[p.id])

  useEffect(() => {
    onValidChange(policyValid && allThirdPartyConfirmed)
  }, [policyValid, allThirdPartyConfirmed, onValidChange])

  const confirmedCount = THIRD_PARTY_PROPERTIES.filter(p => !!thirdPartyConfirmed[p.id]).length

  function handleFieldChange(key: keyof TemplateFields, value: string) {
    setFields(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">

      {/* ── Section 1: Privacy Policy Status ──────────────────────────── */}
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
            What We Found
          </p>
          <div className="space-y-2">
            {STATUS_CARDS.map(({ icon: Icon, color, bg, count, label, detail }) => (
              <div key={label} className={cn("flex items-center gap-3 rounded-lg border px-3.5 py-3", bg)}>
                <Icon className={cn("h-4 w-4 shrink-0", color)} aria-hidden />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{count} properties</p>
                  <p className="text-xs text-muted-foreground">{detail}</p>
                </div>
                <span className={cn("text-xs font-medium shrink-0", color)}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
            Fix 8 Properties — Choose an Option
          </p>
          <div className="space-y-2">
            <OptionCard
              icon={Copy}
              title="Copy from a compliant property"
              description="Select one of your 40 valid properties and apply its privacy policy to all 8 non-compliant sites."
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
                    {selectedProperty === p.id && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 ml-auto shrink-0" aria-hidden />
                    )}
                  </label>
                ))}
              </div>
              {selectedProperty && (
                <p className="text-xs text-muted-foreground pt-1">
                  "Publish" will apply{" "}
                  <strong className="text-foreground">
                    {COMPLIANT_PROPERTIES.find(p => p.id === selectedProperty)?.name}
                  </strong>
                  's policy to all 8 non-compliant properties.
                </p>
              )}
            </OptionCard>

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
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  <strong>Not legal advice.</strong> This template was created for informational purposes only. Review with qualified legal counsel before publishing. Customize all bracketed fields for your organization.
                </p>
              </div>

              {/* Accordion field form */}
              <TemplateForm fields={fields} onChange={handleFieldChange} />

              {/* Progress indicator */}
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

              {/* Full policy preview */}
              {showPreview && (
                <PolicyPreview fields={fields} onClose={() => setShowPreview(false)} />
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

      {/* ── Section 2: Third-party website opt-in requirement ─────────── */}
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

    </div>
  )
}
