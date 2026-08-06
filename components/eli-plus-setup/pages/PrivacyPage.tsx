"use client"
import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import type { BasePageProps } from "../index"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Copy,
  ChevronDown,
  ChevronRight,
  Info,
  Loader2,
  X,
  Lock,
  ExternalLink,
  WandSparkles,
  LinkIcon,
  Pencil,
  RotateCcw,
  Clock,
  Search,
} from "lucide-react"
import { generatePrivacyPolicy, type TemplateFields } from "../components/PrivacySheetContent"
import { GlobalToast } from "../components/GlobalToast"
import { PROPERTIES } from "../data/properties"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// ── Property meta ─────────────────────────────────────────────────────────────

type SiteType = "prospect-portal" | "third-party"
interface PropertyMeta {
  id: string
  siteType: SiteType
  detectedUrl: string | null   // null = no website found; client must provide
}

// Third-party site IDs
const TP_IDS = new Set(["p6", "p9", "p11", "p29", "p35", "p48", "p52", "p66", "p69"])
// IDs where no URL was auto-detected (must be entered by client)
const MISSING_URL_IDS = new Set(["p13", "p19", "p22", "p31"])

// Properties with more than one Prospect Portal site — client must pick which
// one Eli+ should use. Typically only a handful of properties hit this case.
const MULTI_SITE_OPTIONS: Record<string, string[]> = {
  p20: ["lonestarflats.prospectportal.entrata.com",  "lsflatsapartments.prospectportal.entrata.com"],
  p17: ["citrusgrove.prospectportal.entrata.com",    "citrusgroveapts.prospectportal.entrata.com"],
  p41: ["sonoranheights.prospectportal.entrata.com", "sonoranhts.prospectportal.entrata.com"],
  p55: ["greatlakeslofts.prospectportal.entrata.com","gllofts.prospectportal.entrata.com"],
  p67: ["savannahoaks.prospectportal.entrata.com",   "savannahoaksapts.prospectportal.entrata.com"],
}
const MULTI_SITE_IDS = new Set(Object.keys(MULTI_SITE_OPTIONS))

function makeUrl(prop: { id: string; name: string }, isTP: boolean): string | null {
  if (MISSING_URL_IDS.has(prop.id)) return null
  const slug = prop.name.toLowerCase().replace(/[^a-z0-9]+/g, "")
  return isTP ? `${slug}.com` : `${slug}.prospectportal.entrata.com`
}

const PROPERTY_META: PropertyMeta[] = PROPERTIES.map(p => {
  const isTP = TP_IDS.has(p.id)
  return { id: p.id, siteType: isTP ? "third-party" : "prospect-portal", detectedUrl: makeUrl(p, isTP) }
})
const META_MAP = Object.fromEntries(PROPERTY_META.map(m => [m.id, m]))

function normalizeSiteInput(s: string): string {
  return s.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "")
}
/** Enough structure to show policy row without premature noise */
function isLikelyValidWebsite(s: string): boolean {
  const t = normalizeSiteInput(s)
  if (t.length < 4) return false
  return t.includes(".") || t.startsWith("localhost")
}
function isEntrataProspectPortalHost(host: string): boolean {
  return normalizeSiteInput(host).includes("prospectportal.entrata.com")
}
/** Swap policy URL onto another Entrata portal hostname (prototype heuristic). */
function adaptPrivacyUrlToHost(ppUrl: string, targetWebsiteNoProto: string): string {
  const target = normalizeSiteInput(targetWebsiteNoProto)
  const raw = ppUrl.trim().startsWith("http") ? ppUrl.trim() : `https://${ppUrl.trim()}`
  try {
    const u = new URL(raw)
    u.hostname = target.split("/")[0]
    return u.toString()
  } catch {
    return `https://${target}/privacy-policy`
  }
}

// ── Privacy policy status per property ────────────────────────────────────────
type PPStatus = "needs-pp" | "review-in-progress" | "failed" | "completed"

// "Policy approved" = carrier accepted the privacy policy URL; number purchase is tracked in Communications tab
const INITIALLY_COMPLETED = new Set(["p1", "p2", "p3", "p4", "p5", "p7", "p10", "p12"])
// "Carrier review in progress" — submitted to Twilio, awaiting approval (2–3 days)
const INITIALLY_REVIEW = new Set(["p14", "p15", "p16", "p18", "p21", "p23", "p25", "p28"])
// "Failed" — carrier rejected
const INITIALLY_FAILED = new Set(["p6", "p30"])
// Legacy alias used elsewhere in the file
const INITIALLY_COVERED = INITIALLY_COMPLETED

// Carrier rejection reasons per property (for failed state)
const FAILED_REASONS: Record<string, string> = {
  p6:  "We couldn't find a page at this link. Double-check the spelling, or copy the URL directly from your browser's address bar.",
  p30: "The page took too long to respond. Make sure the URL is publicly accessible — not behind a login, password prompt, or firewall — then try again.",
}

// Carrier rejection reasons for the property's Terms & Conditions URL.
// Mirrors real carrier feedback (Twilio/TCR error 30882 / brand-match rules):
// terms that reference a different brand than the registered A2P brand get
// rejected until the "doing business as" relationship is made explicit.
const TC_FAILED_REASONS: Record<string, string> = {
  p6: "We couldn't confirm this property is part of your registered company.",
}

// ── State supplement detection ────────────────────────────────────────────────

const CA_PROPS = PROPERTIES.filter(p => p.state === "CA")
const MN_PROPS = PROPERTIES.filter(p => p.state === "MN")
const CA_REQUIRED = CA_PROPS.length > 0
const MN_REQUIRED = MN_PROPS.length > 0

// ── Carrier Compliance pre-fill ───────────────────────────────────────────────

const CARRIER_DATA = {
  companyName:   "Sunset Properties LLC",
  address:       "123 Main Street, Suite 200, Austin, TX 78701",
  phone:         "(512) 555-0123",
  email:         "sarah.johnson@sunsetproperties.com",
  effectiveDate: "April 23, 2026",
  chatbot:       "Entrata",
}

// ── User-supplied fields ──────────────────────────────────────────────────────

interface UserFields {
  smsPhone:        string
  smsEmail:        string
  messageFreq:     string
  privacyEmail:    string
  retentionApp:    string
  retentionRes:    string
  retentionComms:  string
  retentionWeb:    string
  retentionBg:     string
  doNotSell:       string
  poName:          string
  poEmail:         string
  poPhone:         string
}

const DEFAULT_USER: UserFields = {
  smsPhone:       CARRIER_DATA.phone,           // pre-filled from Carrier Compliance — overrideable
  smsEmail:       "sms@sunsetproperties.com",
  messageFreq:    "4",
  privacyEmail:   CARRIER_DATA.email,           // pre-filled from Carrier Compliance — overrideable
  retentionApp:   CA_REQUIRED ? "3" : "3",
  retentionRes:   CA_REQUIRED ? "7" : "7",
  retentionComms: CA_REQUIRED ? "3" : "3",
  retentionWeb:   CA_REQUIRED ? "13" : "13",
  retentionBg:    CA_REQUIRED ? "5" : "5",
  doNotSell:      'clicking the "Do Not Sell or Share My Personal Information" link on our website',
  poName:         "Sarah Johnson",
  poEmail:        "privacy@sunsetproperties.com",
  poPhone:        "(512) 555-0123",
}

const CORE_REQUIRED: (keyof UserFields)[] = ["smsPhone", "smsEmail", "messageFreq", "privacyEmail"]
const CA_REQUIRED_KEYS: (keyof UserFields)[] = CA_REQUIRED
  ? ["retentionApp", "retentionRes", "retentionComms", "retentionWeb", "retentionBg"] : []
const MN_REQUIRED_KEYS: (keyof UserFields)[] = MN_REQUIRED
  ? ["poName", "poEmail", "poPhone"] : []
const ALL_REQUIRED_KEYS: (keyof UserFields)[] = [...CORE_REQUIRED, ...CA_REQUIRED_KEYS, ...MN_REQUIRED_KEYS]

function userFieldsToTemplate(u: UserFields): TemplateFields {
  return {
    companyName:          CARRIER_DATA.companyName,
    effectiveDate:        CARRIER_DATA.effectiveDate,
    lastUpdated:          CARRIER_DATA.effectiveDate,
    smsPhone:             u.smsPhone,
    smsEmail:             u.smsEmail,
    messageFrequency:     u.messageFreq,
    chatbotProvider:      CARRIER_DATA.chatbot,
    privacyEmail:         u.privacyEmail || CARRIER_DATA.email,
    companyAddress:       CARRIER_DATA.address,
    appealContact:        u.privacyEmail || CARRIER_DATA.email,
    privacyFormUrl:       "",
    tollFreeNumber:       CARRIER_DATA.phone,
    retentionApplication: u.retentionApp  || "3",
    retentionResident:    u.retentionRes  || "7",
    retentionComms:       u.retentionComms || "3",
    retentionWebsite:     u.retentionWeb  || "13",
    retentionBackground:  u.retentionBg   || "5",
    doNotSellMethod:      u.doNotSell,
    privacyOfficerName:   u.poName,
    privacyOfficerEmail:  u.poEmail,
    privacyOfficerPhone:  u.poPhone,
  }
}

type FilterTab  = "all" | "needs-action" | "failed" | "pending" | "covered"
type StepId     = "form" | "template" | "third-party" | "publish"

const STEP_LABELS: Record<StepId, string> = {
  form:          "Form",
  template:      "Template",
  "third-party": "Third-party sites",
  publish:       "Publish",
}

// ── Policy highlight ──────────────────────────────────────────────────────────

type Segment = { text: string; hl: boolean }

function buildHighlightedSegments(text: string, fields: UserFields): Segment[] {
  const values = [
    CARRIER_DATA.companyName, CARRIER_DATA.address, CARRIER_DATA.phone,
    CARRIER_DATA.email, CARRIER_DATA.effectiveDate, CARRIER_DATA.chatbot,
    fields.smsPhone, fields.smsEmail, fields.messageFreq,
    fields.privacyEmail || CARRIER_DATA.email,
    fields.retentionApp || "3", fields.retentionRes || "7",
    fields.retentionComms || "3", fields.retentionWeb || "13",
    fields.retentionBg || "5", fields.doNotSell,
    fields.poName, fields.poEmail, fields.poPhone,
  ].filter(v => v && v.trim().length > 1)

  const unique = [...new Set(values)].sort((a, b) => b.length - a.length)
  if (unique.length === 0) return [{ text, hl: false }]

  const pattern = new RegExp(
    unique.map(v => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g",
  )
  const segments: Segment[] = []
  let last = 0; let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) segments.push({ text: text.slice(last, match.index), hl: false })
    segments.push({ text: match[0], hl: true })
    last = pattern.lastIndex
  }
  if (last < text.length) segments.push({ text: text.slice(last), hl: false })
  return segments
}

// ── Disclaimer ────────────────────────────────────────────────────────────────

const DISCLAIMER_PARAGRAPHS = [
  "THIS TEMPLATE WAS CREATED BY A GENERAL PURPOSE LARGE LANGUAGE MODEL FOR INFORMATIONAL PURPOSES ONLY AND IS NOT LEGAL ADVICE. This template is intended to serve as a starting point for organizations developing their own privacy notices and should not be relied upon as a substitute for consultation with qualified legal counsel. Use of this template is at your own risk. Entrata shall not be liable for any damages, losses, or other consequences arising from its use or adaptation.",
  "Each organization's privacy practices, data processing activities, and regulatory obligations are unique. Applicable privacy laws and regulations vary by jurisdiction, industry, and the nature of personal data collected and processed.",
  "Before using or adapting this template, conduct a thorough review of your organization's specific data collection and processing activities and consult with legal counsel.",
  "Privacy laws are subject to frequent amendment and evolving regulatory guidance; accordingly, periodically review and update any privacy notice derived from this template.",
]

function DisclaimerLink() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="View legal disclaimer"
          className="inline-flex items-center gap-1 rounded text-xs text-blue-600 hover:text-blue-700 font-medium px-1 -mx-1 py-0.5 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 cursor-pointer transition-colors">
          <Info className="h-3 w-3" />
          <span>Disclaimer</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        collisionPadding={16}
        className="z-[70] w-[22rem] max-w-[calc(100vw-2rem)] max-h-[min(70vh,32rem)] overflow-y-auto p-4 space-y-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">Legal Disclaimer</p>
        {DISCLAIMER_PARAGRAPHS.map((p, i) => (
          <p key={i} className="text-[11px] text-muted-foreground leading-relaxed">{p}</p>
        ))}
      </PopoverContent>
    </Popover>
  )
}

// ── Shared Field wrapper ──────────────────────────────────────────────────────
//
// Information architecture per field:
//   1. Subheading (setting title) — bold dark text, treated as a small heading
//   2. Description (the "why") — smaller, lighter prose, sits directly under the title
//   3. Input — visually separated from the title block
//
// This is intentionally distinct from the section eyebrow (small caps blue)
// so users can scan section → field → description → input.

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="space-y-0.5">
        <label className="block text-sm font-semibold text-foreground tracking-tight">{label}</label>
        {hint && <p className="text-[11px] text-zinc-500 leading-relaxed">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

// ── Supplement section header ─────────────────────────────────────────────────

function SupplementHeader({ open, onToggle, title, stateName, stateProps, statute }: {
  open: boolean; onToggle: () => void; title: string
  stateName: string; stateProps: typeof PROPERTIES; statute: string
}) {
  const required = stateProps.length > 0
  return (
    <button type="button" onClick={onToggle}
      className={cn("flex w-full items-center gap-2 text-base font-semibold tracking-tight transition-colors hover:text-foreground",
        required ? "text-foreground" : "text-muted-foreground")}>
      {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
      {title}
      {required
        ? <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 whitespace-nowrap normal-case">
            Required · {stateProps.length} {stateName} {stateProps.length === 1 ? "property" : "properties"}
          </span>
        : <span className="ml-auto text-[10px] font-medium text-muted-foreground/60 normal-case">Optional · {statute}</span>}
    </button>
  )
}

// ── Template sheet (step wizard) ─────────────────────────────────────────────

interface TemplateSheetProps {
  open: boolean
  fields: UserFields
  onChange: (key: keyof UserFields, val: string) => void
  ppPendingProps: Array<{ id: string; name: string; city: string; state: string }>
  publishingCount: number
  templateReady: boolean
  tpUncoveredProps: Array<{ id: string; name: string; url: string }>
  onPublish: (selectedIds: string[]) => void
  onConfirmTp: (id: string) => void
  onClose: () => void
  onNavigateToCarrier: () => void
}

function TemplateSheet({
  open, fields, onChange,
  ppPendingProps, publishingCount, templateReady,
  tpUncoveredProps,
  onPublish, onConfirmTp, onClose, onNavigateToCarrier,
}: TemplateSheetProps) {
  // ── Step state ──────────────────────────────────────────────────────────────
  const [stepIdx, setStepIdx] = useState(0)
  // Snapshot TP props when sheet opens so cards don't disappear after verify
  const [localTpProps, setLocalTpProps] = useState(tpUncoveredProps)

  const hasTpSites = localTpProps.length > 0
  const hasPpSites = ppPendingProps.length > 0

  const STEPS = useMemo<StepId[]>(() => [
    "form",
    "template",
    ...(hasTpSites ? ["third-party" as StepId] : []),
    ...(hasPpSites ? ["publish"     as StepId] : []),
  ], [hasTpSites, hasPpSites])

  const currentStep = STEPS[stepIdx] ?? "form"
  const isFirst = stepIdx === 0
  const isLast  = stepIdx === STEPS.length - 1

  // ── Form UI state ───────────────────────────────────────────────────────────
  const [caOpen, setCaOpen] = useState(CA_REQUIRED)
  const [mnOpen, setMnOpen] = useState(MN_REQUIRED)
  const [copiedPolicy, setCopiedPolicy] = useState(false)

  // ── Template edit state ─────────────────────────────────────────────────────
  // null = use auto-generated text from form fields. Once user saves edits,
  // their version becomes the source of truth for copy/publish actions.
  const [customPolicyText, setCustomPolicyText] = useState<string | null>(null)
  const [templateEditing, setTemplateEditing]   = useState(false)
  const [editDraft, setEditDraft]               = useState("")

  // ── TP state ────────────────────────────────────────────────────────────────
  const [tpCopied, setTpCopied]     = useState(false)
  const [tpUnlocked, setTpUnlocked] = useState(false)
  const [tpVerifyStatus, setTpVerifyStatus] = useState<Record<string, "idle" | "checking" | "verified" | "failed">>({})

  // ── PP state ────────────────────────────────────────────────────────────────
  const [selectedPpIds, setSelectedPpIds] = useState<Set<string>>(() => new Set(ppPendingProps.map(p => p.id)))
  const [ppSearch, setPpSearch]           = useState("")
  const [ppSectionOpen, setPpSectionOpen] = useState(false)   // collapsed by default — "Publish to all" is the happy path

  // Re-sync PP selection when list changes
  useEffect(() => {
    setSelectedPpIds(new Set(ppPendingProps.map(p => p.id)))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ppPendingProps.length])

  // Reset everything when sheet opens
  useEffect(() => {
    if (open) {
      setStepIdx(0)
      setLocalTpProps(tpUncoveredProps)
      setTpCopied(false); setTpUnlocked(false); setTpVerifyStatus({})
      setPpSearch(""); setPpSectionOpen(false)
      setCustomPolicyText(null); setTemplateEditing(false); setEditDraft("")
      p6FailedOnce.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Scroll lock + keyboard
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", h)
    return () => document.removeEventListener("keydown", h)
  }, [open, onClose])

  const generatedPolicyText = generatePrivacyPolicy(userFieldsToTemplate(fields))
  // Effective policy = user's edits if they saved any, otherwise the auto-generated text
  const policyText          = customPolicyText ?? generatedPolicyText
  const hasManualEdits      = customPolicyText !== null
  const segments            = useMemo(() => buildHighlightedSegments(policyText, fields), [policyText, fields])
  const filledRequired      = ALL_REQUIRED_KEYS.filter(k => fields[k].trim() !== "").length
  const totalRequired       = ALL_REQUIRED_KEYS.length

  const filteredPpProps = ppPendingProps.filter(p =>
    ppSearch === "" || p.name.toLowerCase().includes(ppSearch.toLowerCase()) ||
    p.city.toLowerCase().includes(ppSearch.toLowerCase()) || p.state.toLowerCase().includes(ppSearch.toLowerCase())
  )
  const allPpSelected  = ppPendingProps.length > 0 && ppPendingProps.every(p => selectedPpIds.has(p.id))
  const nonePpSelected = ppPendingProps.every(p => !selectedPpIds.has(p.id))

  function togglePp(id: string) { setSelectedPpIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  function selectAllPp() { setSelectedPpIds(new Set(ppPendingProps.map(p => p.id))) }
  function clearAllPp()  { setSelectedPpIds(new Set()) }

  function handleCopyPreview() {
    navigator.clipboard.writeText(policyText).catch(() => {})
    setCopiedPolicy(true); setTimeout(() => setCopiedPolicy(false), 2000)
  }
  function handleStartEdit() {
    setEditDraft(policyText)
    setTemplateEditing(true)
  }
  function handleSaveEdit() {
    setCustomPolicyText(editDraft)
    setTemplateEditing(false)
  }
  function handleCancelEdit() {
    setTemplateEditing(false)
    setEditDraft("")
  }
  function handleResetTemplate() {
    setCustomPolicyText(null)
    setTemplateEditing(false)
  }
  function handleTpCopy() {
    navigator.clipboard.writeText(policyText).catch(() => {})
    setTpCopied(true); setTpUnlocked(true)
    setTimeout(() => setTpCopied(false), 2000)
  }
  // River North Plaza (p6) fails on first attempt, succeeds on retry
  const p6FailedOnce = useRef(false)
  function handleVerify(id: string) {
    setTpVerifyStatus(prev => ({ ...prev, [id]: "checking" }))
    setTimeout(() => {
      const shouldFail = id === "p6" && !p6FailedOnce.current
      if (shouldFail) {
        p6FailedOnce.current = true
        setTpVerifyStatus(prev => ({ ...prev, [id]: "failed" }))
      } else {
        setTpVerifyStatus(prev => ({ ...prev, [id]: "verified" }))
        onConfirmTp(id)
      }
    }, 900)
  }
  function handleVerifyAll() {
    if (!tpUnlocked) return
    // Verify any TP that isn't already verified or actively checking.
    // Stagger by 120ms so the spinners cascade visually instead of firing simultaneously.
    const targets = localTpProps.filter(tp => {
      const s = tpVerifyStatus[tp.id] ?? "idle"
      return s !== "verified" && s !== "checking"
    })
    targets.forEach((tp, i) => {
      setTimeout(() => handleVerify(tp.id), i * 120)
    })
  }

  const inputCls = (filled: boolean) => cn(
    "w-full h-10 rounded-lg border bg-background px-3 text-sm text-foreground",
    "placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 transition-colors",
    filled ? "border-border" : "border-amber-300",
  )
  const MSG_FREQ_OPTIONS = [
    { value: "",       label: "Select…" },
    { value: "varies", label: "Varies — changes month to month" },
    { value: "1",      label: "~1 message per month" },
    { value: "2",      label: "~2 messages per month" },
    { value: "4",      label: "~4 messages per month" },
    { value: "8",      label: "~8 messages per month" },
  ]

  // ── TP card renderer (used in step 3) ────────────────────────────────────────
  function TpCard({ tp }: { tp: { id: string; name: string; url: string } }) {
    const status = tpVerifyStatus[tp.id] ?? "idle"
    const cardLocked = !tpUnlocked && status === "idle"
    return (
      <div className={cn(
        "rounded-xl border px-4 py-3 transition-all duration-200",
        status === "verified" ? "border-emerald-300 bg-emerald-50" :
        status === "checking" ? "border-zinc-200 bg-zinc-50" :
        status === "failed"   ? "border-red-200 bg-red-50" :
        cardLocked            ? "border-border bg-zinc-50/60 opacity-60" : "border-border bg-white",
      )}>
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className={cn("text-xs font-semibold", cardLocked ? "text-muted-foreground" : "text-foreground")}>{tp.name}</p>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">{tp.url}/privacy-policy</p>
          </div>
          {cardLocked && (
            <span className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border bg-zinc-100 px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
              <Lock className="h-3 w-3" />Verify
            </span>
          )}
          {!cardLocked && status === "idle" && (
            <button type="button" onClick={() => handleVerify(tp.id)}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 text-white px-3.5 py-1.5 text-xs font-semibold hover:bg-zinc-700 transition-colors whitespace-nowrap">
              <Globe className="h-3.5 w-3.5" />Verify
            </button>
          )}
          {status === "checking" && (
            <span className="shrink-0 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />Checking…
            </span>
          )}
          {status === "verified" && (
            <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />Live ✓
            </span>
          )}
          {status === "failed" && (
            <button type="button" onClick={() => handleVerify(tp.id)}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors whitespace-nowrap">
              <AlertTriangle className="h-3.5 w-3.5" />Retry
            </button>
          )}
        </div>
        {status === "failed" && (
          <p className="mt-2 text-xs text-red-600 leading-relaxed">
            We weren't able to find your privacy policy. Please add it to your website and re-verify.
          </p>
        )}
      </div>
    )
  }

  return (
    <>
      <div aria-hidden onClick={onClose}
        className={cn("fixed inset-0 bg-black/25 z-40 transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")} />

      <div role="dialog" aria-modal="true" aria-label="Privacy Policy Template"
        className={cn(
          "fixed top-0 right-0 h-full w-full max-w-[680px] bg-background z-50 flex flex-col",
          "transition-transform duration-250 ease-in-out",
          open ? "translate-x-0 shadow-2xl" : "translate-x-full shadow-none",
        )}>

        {/* ── Header ── */}
        <div className="px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">Privacy Policy Template</h2>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Fill in the form, review the template, then publish to your properties.
                </p>
                <DisclaimerLink />
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Close"
              className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-0.5">
            {STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-1.5 shrink-0">
                {i > 0 && <div className="w-5 h-px bg-border shrink-0" />}
                <div className={cn("flex items-center gap-1.5 text-[11px] font-medium",
                  i === stepIdx ? "text-foreground" : i < stepIdx ? "text-emerald-700" : "text-muted-foreground/50")}>
                  <span className={cn("inline-flex items-center justify-center h-[18px] w-[18px] rounded-full text-[10px] font-bold shrink-0",
                    i === stepIdx ? "bg-zinc-900 text-white" :
                    i < stepIdx  ? "bg-emerald-100 text-emerald-700" :
                    "bg-zinc-100 text-muted-foreground/60")}>
                    {i < stepIdx ? "✓" : i + 1}
                  </span>
                  {STEP_LABELS[step]}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* Step 1 — Form */}
          {currentStep === "form" && (
            <div className="px-6 py-5 space-y-6">
              {/* Company-level banner */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-2.5">
                <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">This policy applies to your entire company</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Fill these fields out once. The same policy text publishes to every property's website.
                  </p>
                </div>
              </div>

              <p className="text-xs">
                {filledRequired < totalRequired
                  ? <span className="text-amber-600 font-medium">{filledRequired} of {totalRequired} required fields filled.</span>
                  : <span className="text-emerald-600 font-medium">All {totalRequired} required fields complete.</span>}
              </p>

              {/* Required user fields */}
              <div className="space-y-5">
                <Field label="Support phone for SMS HELP/STOP" hint="One company-wide number for the whole portfolio. Pre-filled from your business phone — change it if you have a dedicated SMS line.">
                  <input type="text" value={fields.smsPhone} onChange={e => onChange("smsPhone", e.target.value)}
                    placeholder="(602) 555-0100" className={inputCls(fields.smsPhone.trim() !== "")} />
                </Field>
                <Field label="Support email for SMS HELP/STOP" hint="Generic shared inbox is best (e.g. sms@). Same address for every property.">
                  <input type="text" value={fields.smsEmail} onChange={e => onChange("smsEmail", e.target.value)}
                    placeholder="sms@yourcompany.com" className={inputCls(fields.smsEmail.trim() !== "")} />
                </Field>
                <Field label="Approximate message frequency" hint="Required by carriers (FCC). One company-wide estimate across all properties.">
                  <select value={fields.messageFreq} onChange={e => onChange("messageFreq", e.target.value)}
                    className={cn("w-full h-10 rounded-lg border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/20 transition-colors appearance-none",
                      fields.messageFreq !== "" ? "border-border" : "border-amber-300")}>
                    {MSG_FREQ_OPTIONS.map(o => <option key={o.value} value={o.value} disabled={o.value === ""}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label="Privacy contact email" hint="Where residents send privacy rights requests and appeals. Pre-filled from your business contact email — change it if you have a dedicated privacy inbox.">
                  <input type="text" value={fields.privacyEmail} onChange={e => onChange("privacyEmail", e.target.value)}
                    placeholder="privacy@yourcompany.com" className={inputCls(fields.privacyEmail.trim() !== "")} />
                </Field>
              </div>

              {/* California supplement — only when company has CA properties */}
              {CA_REQUIRED && (
                <div className="border-t border-border pt-5 space-y-4">
                  <SupplementHeader open={caOpen} onToggle={() => setCaOpen(v => !v)}
                    title="California Supplement" stateName="CA" stateProps={CA_PROPS} statute="CCPA / CPRA" />
                  {caOpen && (
                    <div className="space-y-5 pt-1">
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 leading-relaxed">
                        Required because you operate {CA_PROPS.length} CA {CA_PROPS.length === 1 ? "property" : "properties"}. The CCPA (Cal. Civ. Code § 1798.100) requires retention disclosures — these values fill in <span className="font-semibold">Section 14.1</span> of your template.
                      </p>
                      {([
                        { key: "retentionApp"   as keyof UserFields, label: "Lease application data (years)",   placeholder: "3"  },
                        { key: "retentionRes"   as keyof UserFields, label: "Resident data post-lease (years)", placeholder: "7"  },
                        { key: "retentionComms" as keyof UserFields, label: "Communications records (years)",   placeholder: "3"  },
                        { key: "retentionWeb"   as keyof UserFields, label: "Website activity data (months)",   placeholder: "13" },
                        { key: "retentionBg"    as keyof UserFields, label: "Background screening (years)",     placeholder: "5"  },
                      ] as const).map(f => (
                        <Field key={f.key} label={f.label}>
                          <input type="text" value={fields[f.key]} onChange={e => onChange(f.key, e.target.value)}
                            placeholder={f.placeholder} className={inputCls(fields[f.key].trim() !== "")} />
                        </Field>
                      ))}
                      <Field label="Do Not Sell opt-out method">
                        <input type="text" value={fields.doNotSell} onChange={e => onChange("doNotSell", e.target.value)}
                          placeholder='clicking the "Do Not Sell" link on our website'
                          className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-zinc-900/20" />
                      </Field>
                    </div>
                  )}
                </div>
              )}

              {/* Minnesota supplement — only when company has MN properties */}
              {MN_REQUIRED && (
                <div className="border-t border-border pt-5 space-y-4">
                  <SupplementHeader open={mnOpen} onToggle={() => setMnOpen(v => !v)}
                    title="Minnesota Supplement" stateName="MN" stateProps={MN_PROPS} statute="Minn. Stat. § 325M" />
                  {mnOpen && (
                    <div className="space-y-5 pt-1">
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 leading-relaxed">
                        Required because you operate {MN_PROPS.length} MN {MN_PROPS.length === 1 ? "property" : "properties"}. Minn. Stat. § 325M requires a designated Privacy Officer — this contact fills in <span className="font-semibold">Section 14.2</span> of your template.
                      </p>
                      {([
                        { key: "poName"  as keyof UserFields, label: "Privacy Officer name",  placeholder: "Jane Smith"             },
                        { key: "poEmail" as keyof UserFields, label: "Privacy Officer email", placeholder: "privacy@yourcompany.com" },
                        { key: "poPhone" as keyof UserFields, label: "Privacy Officer phone", placeholder: "(800) 555-0100"          },
                      ] as const).map(f => (
                        <Field key={f.key} label={f.label}>
                          <input type="text" value={fields[f.key]} onChange={e => onChange(f.key, e.target.value)}
                            placeholder={f.placeholder} className={inputCls(fields[f.key].trim() !== "")} />
                        </Field>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Template preview / editor */}
          {currentStep === "template" && (
            <div className="flex flex-col h-full">
              <div className="px-6 py-3 border-b border-border bg-blue-50/40 shrink-0">
                <p className="text-xs text-foreground leading-relaxed">
                  <span className="font-semibold">One policy for your whole company.</span>{" "}
                  <span className="text-muted-foreground">This same text publishes to every property — you don't write a different version per property. Review or edit, then continue.</span>
                </p>
              </div>

              {/* Toolbar */}
              <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-border bg-zinc-50/60 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  {templateEditing ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                      <Pencil className="h-2.5 w-2.5" />Editing template
                    </span>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        <WandSparkles className="h-2.5 w-2.5" />Your inputs are highlighted
                      </span>
                      {hasManualEdits && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                          <Pencil className="h-2.5 w-2.5" />Edited
                        </span>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {templateEditing ? (
                    <>
                      <button type="button" onClick={handleCancelEdit}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                        Cancel
                      </button>
                      <button type="button" onClick={handleSaveEdit}
                        className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 transition-colors">
                        Save edits
                      </button>
                    </>
                  ) : (
                    <>
                      {hasManualEdits && (
                        <button type="button" onClick={handleResetTemplate}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium">
                          <RotateCcw className="h-3 w-3" />Reset to template
                        </button>
                      )}
                      <button type="button" onClick={handleStartEdit}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                        <Pencil className="h-3 w-3" />Edit
                      </button>
                      <button type="button" onClick={handleCopyPreview}
                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
                        <Copy className="h-3 w-3" />{copiedPolicy ? "Copied!" : "Copy full policy"}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Body */}
              {templateEditing ? (
                <div className="flex-1 overflow-y-auto p-4">
                  <textarea
                    value={editDraft}
                    onChange={e => setEditDraft(e.target.value)}
                    spellCheck={false}
                    className="w-full h-full min-h-[55vh] text-[11px] text-zinc-700 leading-relaxed font-sans rounded-md border border-border bg-white p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
                  />
                  <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                    Tip — edits override the auto-generated template. Going back to step 1 and changing form fields after saving will <span className="font-medium text-foreground">overwrite your edits</span>; use Reset to template to restore the auto-generated version.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <div className="text-[11px] text-zinc-700 whitespace-pre-wrap leading-relaxed font-sans">
                    {segments.map((seg, i) =>
                      seg.hl
                        ? <mark key={i} className="bg-amber-100 text-amber-900 rounded px-0.5">{seg.text}</mark>
                        : <span key={i}>{seg.text}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3 — Third-party sites */}
          {currentStep === "third-party" && (() => {
            const verifiedTpCount = localTpProps.filter(tp => tpVerifyStatus[tp.id] === "verified").length
            const checkingTpCount = localTpProps.filter(tp => tpVerifyStatus[tp.id] === "checking").length
            const totalTp         = localTpProps.length
            const remainingTp     = totalTp - verifiedTpCount
            const allTpVerified   = totalTp > 0 && verifiedTpCount === totalTp
            const verifyAllDisabled = !tpUnlocked || allTpVerified || checkingTpCount > 0
            return (
              <div className="px-6 py-5 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">Third-party sites</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    These properties don't run on Entrata's Prospect Portal, so we can't publish for you. The <span className="font-medium text-foreground">same company-wide policy</span> goes on every site — copy it once, paste it onto each privacy page, then <strong className="text-foreground">Verify</strong>.
                  </p>
                </div>

                {/* Toolbar: Copy + Verify all + progress */}
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={handleTpCopy}
                    className={cn("inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors",
                      tpCopied
                        ? "bg-emerald-50 border border-emerald-300 text-emerald-700"
                        : "bg-zinc-900 text-white hover:bg-zinc-700")}>
                    <Copy className="h-3.5 w-3.5" />
                    {tpCopied ? "Policy copied!" : "Copy policy"}
                  </button>
                  <button type="button" onClick={handleVerifyAll}
                    disabled={verifyAllDisabled}
                    title={!tpUnlocked ? "Copy the policy first" : allTpVerified ? "All sites verified" : checkingTpCount > 0 ? "Verification in progress" : ""}
                    className={cn("inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition-colors",
                      verifyAllDisabled
                        ? "border-border bg-zinc-50 text-muted-foreground cursor-not-allowed"
                        : "border-zinc-300 bg-white text-foreground hover:bg-zinc-50")}>
                    {checkingTpCount > 0
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Verifying {checkingTpCount} {checkingTpCount === 1 ? "site" : "sites"}…</>
                      : allTpVerified
                        ? <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />All verified</>
                        : <><Globe className="h-3.5 w-3.5" />Verify all{remainingTp > 0 && tpUnlocked ? ` (${remainingTp})` : ""}</>}
                  </button>
                  {totalTp > 0 && (
                    <span className="text-[11px] text-muted-foreground ml-auto">
                      <span className={cn("font-semibold", allTpVerified ? "text-emerald-700" : "text-foreground")}>{verifiedTpCount}</span>
                      {" "}of {totalTp} sites verified
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {localTpProps.map(tp => <TpCard key={tp.id} tp={tp} />)}
                </div>
              </div>
            )
          })()}

          {/* Step 4 — Publish to Entrata / Prospect Portal sites */}
          {currentStep === "publish" && (
            <div className="px-6 py-5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Publish to your Prospect Portal sites</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  One company-wide policy publishes to every Prospect Portal property at once. We default to <span className="font-medium text-foreground">all properties</span> — only customize the list if you have a specific reason to exclude some.
                </p>
              </div>
              {ppPendingProps.length > 0 ? (
                <div className="space-y-3">
                  {/* Publish-to-all summary card */}
                  <div className={cn(
                    "rounded-lg border px-4 py-3 flex items-center gap-3",
                    nonePpSelected ? "border-amber-200 bg-amber-50/40" :
                    allPpSelected  ? "border-blue-200 bg-blue-50/40" :
                                     "border-zinc-200 bg-zinc-50/60",
                  )}>
                    {nonePpSelected
                      ? <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      : <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">
                        {nonePpSelected
                          ? "No properties selected"
                          : allPpSelected
                            ? `Publishing to all ${ppPendingProps.length} ${ppPendingProps.length === 1 ? "property" : "properties"}`
                            : `Publishing to ${selectedPpIds.size} of ${ppPendingProps.length} ${ppPendingProps.length === 1 ? "property" : "properties"}`}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {nonePpSelected
                          ? "Pick at least one property to continue."
                          : allPpSelected
                            ? "Default — every Prospect Portal site gets the same policy."
                            : "Custom selection — some properties excluded."}
                      </p>
                    </div>
                    <button type="button" onClick={() => setPpSectionOpen(v => !v)}
                      className="shrink-0 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap">
                      {ppSectionOpen ? <>Hide list <ChevronDown className="h-3 w-3" /></> : <>Customize <ChevronRight className="h-3 w-3" /></>}
                    </button>
                  </div>

                  {ppSectionOpen && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input type="text" value={ppSearch} onChange={e => setPpSearch(e.target.value)}
                          placeholder="Search properties…"
                          className="flex-1 h-8 rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-zinc-900/20" />
                        <button type="button" onClick={allPpSelected ? clearAllPp : selectAllPp}
                          className="shrink-0 text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap">
                          {allPpSelected ? "Deselect all" : "Select all"}
                        </button>
                      </div>
                      <div className="max-h-[420px] overflow-y-auto space-y-1 pr-0.5">
                        {filteredPpProps.length === 0 && (
                          <p className="text-xs text-muted-foreground py-2 text-center">No properties match your search.</p>
                        )}
                        {filteredPpProps.map(prop => {
                          const selected = selectedPpIds.has(prop.id)
                          return (
                            <label key={prop.id}
                              className={cn("flex items-center gap-2.5 rounded-md border px-3 py-2 cursor-pointer transition-all",
                                selected ? "border-emerald-300 bg-emerald-50" : "border-border bg-white hover:border-zinc-300")}>
                              <input type="checkbox" checked={selected} onChange={() => togglePp(prop.id)}
                                className="accent-zinc-900 h-3.5 w-3.5 shrink-0" />
                              <span className="flex-1 min-w-0 text-xs font-medium text-foreground truncate">{prop.name}</span>
                              <span className="text-[11px] text-muted-foreground shrink-0">{prop.city}, {prop.state}</span>
                              {selected && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />All Prospect Portal properties are already covered
                </span>
              )}
            </div>
          )}

        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-border px-6 py-4 bg-background">
          <div className="flex items-center justify-between gap-3">

            {/* Left: Close (step 1) or Back */}
            {isFirst ? (
              <button type="button" onClick={onClose} className={cn(buttonVariants({ variant: "outline" }))}>
                Close
              </button>
            ) : (
              <button type="button" disabled={templateEditing}
                onClick={() => setStepIdx(i => i - 1)}
                className={cn(buttonVariants({ variant: "outline" }), "gap-2", templateEditing && "opacity-40 cursor-not-allowed")}>
                ← Back
              </button>
            )}

            {/* Right: Publish (final PP step), Done (final non-PP step), or Next */}
            {currentStep === "publish" ? (
              <button type="button"
                disabled={publishingCount > 0 || nonePpSelected}
                onClick={() => onPublish([...selectedPpIds])}
                className={cn(buttonVariants({ variant: "eli" }), (publishingCount > 0 || nonePpSelected) && "opacity-40 cursor-not-allowed")}>
                {publishingCount > 0
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Publishing…</>
                  : nonePpSelected
                    ? <>Select at least one property</>
                    : <>Publish to {selectedPpIds.size} {selectedPpIds.size === 1 ? "property" : "properties"}</>}
              </button>
            ) : isLast ? (
              <button type="button" onClick={onClose}
                disabled={templateEditing}
                className={cn(buttonVariants({ variant: "eli" }), templateEditing && "opacity-40 cursor-not-allowed")}>
                Done
              </button>
            ) : (
              <button type="button"
                disabled={(currentStep === "form" && !templateReady) || templateEditing}
                onClick={() => setStepIdx(i => i + 1)}
                className={cn(buttonVariants({ variant: "eli" }), "gap-2",
                  ((currentStep === "form" && !templateReady) || templateEditing) && "opacity-40 cursor-not-allowed")}>
                {currentStep === "form" && !templateReady
                  ? <>Fill all required fields</>
                  : templateEditing
                    ? <>Save edits to continue</>
                    : <>Next <ChevronRight className="h-4 w-4" /></>}
              </button>
            )}

          </div>
        </div>
      </div>
    </>
  )
}


// ── Terms & Conditions rejection info ─────────────────────────────────────────

// Public Twilio doc specifically for Terms & Conditions campaign rejection (A2P 10DLC error 30882).
const TWILIO_TC_ARTICLE = "https://www.twilio.com/docs/api/errors/30882"

function TermsErrorInfo() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Why were the terms & conditions rejected?"
          className="inline-flex shrink-0 items-center rounded text-red-600 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 cursor-pointer">
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        collisionPadding={16}
        className="z-[70] w-[22rem] max-w-[calc(100vw-2rem)] p-4 space-y-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">Why was this rejected?</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Carriers must see that your registered company and this property are the same business — across your website, logo, campaign description, and consent pages. When that link isn&rsquo;t clear, the campaign is rejected. State the relationship in your campaign (e.g. <span className="font-medium text-foreground">&ldquo;[Company] is doing business as [Property]&rdquo;</span>) and/or add your company logo to the property site — the more that line up, the smoother the approval.
        </p>
        <a
          href={TWILIO_TC_ARTICLE}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700">
          Twilio: Terms &amp; Conditions rejection (A2P 10DLC)
          <ExternalLink className="h-3 w-3" />
        </a>
      </PopoverContent>
    </Popover>
  )
}

// ── Action card (Zone 1 — always-visible form per property) ──────────────────

interface ActionCardProps {
  prop: typeof PROPERTIES[0]
  status: PPStatus
  ppUrl: string
  websiteUrl: string
  isMissing: boolean
  isMultiUnresolved: boolean
  multiOptions: string[]
  failReason?: string
  /** Carrier rejection reason for the Terms & Conditions URL (mock/demo). */
  tcFailReason?: string
  submitted?: boolean
  submittedPpUrl?: string
  onSubmit: (propId: string, website: string, ppUrl: string) => void
  onDismiss: (propId: string) => void
  onViewPending: () => void
  /** Fires when heartbeat says carrier-ready and required edits exist — powers Submit All. */
  onCardReadyChange?: (id: string, meta: { ready: boolean; website: string; ppUrl: string }) => void
}

function ActionCard({
  prop, status, ppUrl, websiteUrl, isMissing, isMultiUnresolved,
  multiOptions, failReason, tcFailReason, submitted, submittedPpUrl,
  onSubmit, onDismiss, onViewPending, onCardReadyChange,
}: ActionCardProps) {
  const isFailed = status === "failed"

  const [websiteDraft, setWebsiteDraft] = useState(websiteUrl)
  const [multiDraft, setMultiDraft]     = useState("")
  const [useCustom, setUseCustom]       = useState(false)
  const [customUrl, setCustomUrl]       = useState("")
  const [multiOpen, setMultiOpen]       = useState(false)
  const [multiQ, setMultiQ]             = useState("")
  const [ppDraft, setPpDraft]           = useState(() => (isFailed ? ppUrl : ""))
  const [tcDraft, setTcDraft]           = useState("")
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "checking" | "ok" | "fail">("idle")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resolvedWebsite = isMultiUnresolved
    ? (useCustom ? customUrl : multiDraft)
    : (websiteDraft.trim() || websiteUrl)
  const websiteReadyForPolicy = isFailed
    || (!isMissing && !isMultiUnresolved)
    || (isMissing && isLikelyValidWebsite(websiteDraft))
    || (isMultiUnresolved && !!normalizeSiteInput(resolvedWebsite))

  const showPolicyColumn = websiteReadyForPolicy && (normalizeSiteInput(resolvedWebsite).length > 0 || isFailed)

  const ppChanged = isFailed
    ? ppDraft.trim() !== "" && ppDraft.trim() !== ppUrl.trim()
    : ppDraft.trim() !== ""
  const canSubmit = !!(resolvedWebsite.trim()) && ppChanged

  const filteredMulti = useMemo(() => {
    const q = multiQ.trim().toLowerCase()
    if (!q) return multiOptions
    return multiOptions.filter(u => u.toLowerCase().includes(q))
  }, [multiOptions, multiQ])

  useEffect(() => { setWebsiteDraft(websiteUrl) }, [websiteUrl])

  // Auto-scrape disabled for demo — policy URL stays blank until user types it

  // Heartbeat / carrier-ready ping — debounced, no manual Verify
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!ppDraft.trim() || !showPolicyColumn) { setVerifyStatus("idle"); return }
    if (isFailed && ppDraft.trim() === ppUrl.trim()) { setVerifyStatus("idle"); return }
    setVerifyStatus("checking")
    debounceRef.current = setTimeout(() => {
      // Carrier rejection copy lives below the field — keep heartbeat at idle for unchanged reject URL
      setVerifyStatus("ok")
    }, 800)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ppDraft, showPolicyColumn, isFailed, ppUrl])

  useEffect(() => {
    const ready = verifyStatus === "ok" && canSubmit
    onCardReadyChange?.(prop.id, {
      ready,
      website: resolvedWebsite.trim(),
      ppUrl: ppDraft.trim(),
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifyStatus, canSubmit, prop.id, resolvedWebsite, ppDraft, onCardReadyChange])

  useEffect(() => {
    if (!submitted) return
    const t = setTimeout(() => onDismiss(prop.id), 1500)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted])

  /** One line height for inputs, dropdown trigger, and submit (grid-aligned). */
  const ROW_H = "min-h-[2.5rem] h-10"
  // 10 px text + mb-1.5 (6 px) = 16 px label block. Col-3 button uses pt-4 to match.
  const labelCls = "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90 leading-none mb-1.5 block"
  const rowInput = cn(
    "w-full rounded-md border px-3.5 py-2.5 text-sm leading-snug transition-colors focus:outline-none focus:ring-2",
    ROW_H, "flex items-center",
    "bg-white text-foreground placeholder:text-muted-foreground/45 focus:ring-zinc-900/15",
  )

  const showCarrierRejectBelow = isFailed && failReason && verifyStatus === "idle" && ppDraft.trim() === ppUrl.trim()
  const showWebsiteMissing = isMissing && !websiteDraft.trim()

  const websiteBorder = cn(
    rowInput,
    showWebsiteMissing ? "border-amber-300 focus:ring-amber-400/25" : "border-border",
  )
  const ppInputHasCarrierError = !!(showCarrierRejectBelow && failReason)

  const ppBorder = cn(
    rowInput, "min-w-0",
    verifyStatus === "ok"  ? "border-emerald-500 focus:ring-emerald-500/25" :
    ppInputHasCarrierError ? "border-red-400 focus:ring-red-400/20" :
                             "border-border focus:ring-zinc-900/15",
  )

  // Terms & Conditions URL — carrier rejection shown until the URL is changed
  const showTcError = !!(tcFailReason && !tcDraft.trim())
  const tcBorder = cn(
    rowInput, "min-w-0",
    showTcError ? "border-red-400 focus:ring-red-400/20" : "border-border focus:ring-zinc-900/15",
  )

  const submitIsPrimary = canSubmit && verifyStatus === "ok"

  function doSubmit() {
    if (!canSubmit || verifyStatus !== "ok") return
    onSubmit(prop.id, resolvedWebsite.trim(), ppDraft.trim())
  }

  // ── Success state (compressed) ─────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden">
        <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <p className="text-sm font-semibold text-emerald-900 truncate">{prop.name}</p>
            <span className="text-xs text-emerald-700 shrink-0">· Submitted</span>
          </div>
          <button type="button" onClick={() => onDismiss(prop.id)} className="shrink-0 rounded p-1 text-emerald-600 hover:bg-emerald-100" aria-label="Dismiss">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="px-4 py-2 flex items-center gap-2 border-t border-emerald-100">
          <p className="font-mono text-[11px] text-muted-foreground truncate flex-1">{submittedPpUrl}</p>
          <button type="button" onClick={() => { onViewPending(); onDismiss(prop.id) }}
            className="shrink-0 text-[11px] font-semibold text-emerald-800 hover:underline whitespace-nowrap">
            View in Carrier Review →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="bg-white rounded-xl border border-border outline-none"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key !== "Enter") return
        const t = e.target as HTMLElement
        if (t.tagName === "TEXTAREA") return
        if (t.tagName === "BUTTON" || t.closest("button")) return
        if (canSubmit && verifyStatus === "ok") {
          e.preventDefault()
          doSubmit()
        }
      }}
    >
      {/* ── Property header (single horizontal rule separates it from inputs) ── */}
      <div className="px-4 py-2 flex items-center gap-2 border-b border-border">
        <p className="text-sm font-semibold text-foreground truncate">{prop.name}</p>
        <span className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0",
          isFailed ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700",
        )}>
          <span className={cn("h-1.5 w-1.5 rounded-full", isFailed ? "bg-red-500" : "bg-amber-400")} />
          {isFailed ? "Failed" : "Needs action"}
        </span>
        <span className="text-muted-foreground/30 text-xs shrink-0">·</span>
        <span className="text-xs text-muted-foreground truncate">{prop.city}, {prop.state}</span>
      </div>

      {/*
        ── 3-column grid: 30% / 50% / 20% ──────────────────────────────────────
        • No vertical dividers — columns defined by alignment alone
        • No "Action" label in col 3 — button is the anchor
        • Col 3 button uses pt-4 to skip past label height and lock to input row
        • Error wells weld to the bottom of their input (rounded-t-none, no top border)
        • Middle column expands when an error appears; col 1 & col 3 never move
      */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-[5fr_5fr_2fr] gap-x-6 items-start">

          {/* ── Col 1: Website URL ── */}
          <div className="min-w-0">
            <span className={labelCls}>Website URL</span>

            {isMultiUnresolved ? (
              <div className="relative w-full">
                <button
                  type="button"
                  onClick={() => setMultiOpen(o => !o)}
                  className={cn(rowInput, "border-border w-full text-left justify-between gap-2")}
                >
                  <span className="truncate text-sm">
                    {normalizeSiteInput(useCustom ? customUrl : multiDraft) || "Select website…"}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", multiOpen && "rotate-180")} />
                </button>
                {multiOpen && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1 rounded-md border border-border bg-white shadow-lg overflow-hidden max-h-44 flex flex-col">
                    <div className="flex items-center gap-1.5 border-b border-border px-2.5 py-1.5 bg-zinc-50">
                      <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <input
                        value={multiQ}
                        onChange={e => setMultiQ(e.target.value)}
                        placeholder="Search domains…"
                        className="flex-1 min-w-0 bg-transparent text-xs py-0.5 outline-none"
                      />
                    </div>
                    <div className="overflow-y-auto max-h-36 p-1 space-y-0.5">
                      {filteredMulti.map(url => (
                        <button
                          key={url}
                          type="button"
                          onClick={() => { setMultiDraft(url); setUseCustom(false); setMultiOpen(false); setMultiQ("") }}
                          className={cn(
                            "w-full text-left rounded px-2.5 py-2 text-[11px] font-mono truncate hover:bg-zinc-100",
                            multiDraft === url && !useCustom && "bg-blue-50 text-blue-900",
                          )}
                        >
                          {url}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => { setUseCustom(true); setMultiDraft(""); setMultiOpen(false) }}
                        className="w-full text-left rounded px-2.5 py-2 text-[11px] text-muted-foreground hover:bg-zinc-100 italic"
                      >
                        None of these — custom URL
                      </button>
                    </div>
                  </div>
                )}
                {useCustom && (
                  <input
                    type="text"
                    value={customUrl}
                    onChange={e => setCustomUrl(e.target.value)}
                    placeholder="yoursite.com"
                    className={cn(rowInput, "border-border mt-1.5 w-full")}
                  />
                )}
              </div>
            ) : isMissing ? (
              <>
                <input
                  type="text"
                  value={websiteDraft}
                  onChange={e => setWebsiteDraft(e.target.value)}
                  placeholder="yoursite.com"
                  className={websiteBorder}
                />
                {showWebsiteMissing && (
                  <div className="mt-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] leading-snug text-amber-900">
                    <span className="font-semibold">Website required.</span>{" "}
                    Privacy policy field unlocks once a site is entered.
                  </div>
                )}
              </>
            ) : (
              <div className={cn(rowInput, "border-border justify-between gap-2")}>
                <span className="truncate text-sm text-foreground">{websiteUrl}</span>
                <a
                  href={`https://${normalizeSiteInput(websiteUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-muted-foreground/60 hover:text-muted-foreground"
                  title="Open site"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}
          </div>

          {/* ── Col 2: Privacy policy URL ── */}
          <div className="min-w-0">
            <div className={cn(labelCls, "flex flex-wrap items-center gap-x-1.5 gap-y-0 !mb-1.5")}>
              <span>Privacy policy URL</span>
              {verifyStatus === "ok" && ppDraft.trim() && (
                <span className="font-medium normal-case text-emerald-600">· Carrier-ready</span>
              )}
            </div>

            {showPolicyColumn ? (
              <>
                {/* Input row: text field only */}
                <input
                  type="text"
                  value={ppDraft}
                  onChange={e => setPpDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && canSubmit && verifyStatus === "ok") {
                      e.preventDefault()
                      doSubmit()
                    }
                  }}
                  placeholder={resolvedWebsite.trim() ? `https://${normalizeSiteInput(resolvedWebsite)}/privacy-policy` : "https://…/privacy-policy"}
                  className={cn(ppBorder, "w-full")}
                />
                {/* Warning — policy URL not yet entered */}
                {!ppDraft.trim() && (
                  <div className="mt-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] leading-snug text-amber-900">
                    <span className="font-semibold">Privacy policy URL required.</span>{" "}
                    Paste the link to your property's privacy policy page.
                  </div>
                )}
                {/* Error well — carrier rejection */}
                {ppInputHasCarrierError && failReason && (
                  <div className="mt-1.5 rounded-md border border-red-300 bg-red-50 px-2.5 py-1.5 text-[11px] leading-snug text-red-900">
                    <span className="font-semibold">Carrier rejected this URL.</span>{" "}
                    {failReason}
                  </div>
                )}
              </>
            ) : (
              /* Locked placeholder — maintains column height without italic prose */
              <div className={cn(rowInput, "border-dashed border-zinc-200 bg-zinc-50/80 pointer-events-none justify-start gap-2")}>
                <span className="text-xs italic text-muted-foreground/70 truncate">
                  {isMissing ? "Unlocks after website is entered" : "—"}
                </span>
              </div>
            )}

            {/* ── Terms & Conditions URL — sits directly under the privacy policy field ── */}
            {showPolicyColumn && (
              <div className="mt-3">
                <span className={labelCls}>Terms &amp; Conditions URL</span>
                <input
                  type="text"
                  value={tcDraft}
                  onChange={e => setTcDraft(e.target.value)}
                  placeholder="https://…/terms-of-use"
                  className={cn(tcBorder, "w-full")}
                />
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground/80">
                  You can update this URL or fix the page and resubmit.
                </p>
                {/* Error well — carrier rejection (Terms & Conditions) */}
                {showTcError && tcFailReason && (
                  <div className="mt-1.5 rounded-md border border-red-300 bg-red-50 px-2.5 py-1.5 text-[11px] leading-snug text-red-900">
                    <div className="flex items-start gap-1.5">
                      <span className="min-w-0">
                        <span className="font-semibold">Carrier rejected this URL.</span>{" "}
                        {tcFailReason}
                      </span>
                      <TermsErrorInfo />
                    </div>
                    <p className="mt-1.5 font-medium">Show the carrier this property belongs to your company — do one or both, then resubmit:</p>
                    <ul className="mt-0.5 list-disc space-y-0.5 pl-4">
                      <li>State the relationship in your campaign description — e.g. &ldquo;[Company] is doing business as [Property]&rdquo;.</li>
                      <li>Add your company logo to the property website so the brand connection is clear.</li>
                    </ul>
                    <a
                      href={TWILIO_TC_ARTICLE}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 font-medium text-red-700 underline underline-offset-2 hover:text-red-800">
                      Learn more at Twilio
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Col 3: Action button — the anchor ── */}
          {/* pt-4 offsets past the 16 px label block above, locking button to input row */}
          <div className="min-w-0 pt-4">
            <button
              type="button"
              disabled={!submitIsPrimary}
              onClick={doSubmit}
              className={cn(
                ROW_H,
                "w-full rounded-md border text-xs font-semibold transition-colors",
                submitIsPrimary
                  ? "border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm"
                  : "border-zinc-200 bg-zinc-100 text-zinc-400 cursor-not-allowed",
              )}
            >
              {verifyStatus === "checking" ? "Checking…" : isFailed ? "Resubmit" : "Submit"}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Empty state when a property search returns no matches ─────────────────────

function NoSearchMatch({ query }: { query: string }) {
  return (
    <div className="rounded-xl border border-border bg-white px-5 py-10 flex flex-col items-center text-center gap-2">
      <Search className="h-6 w-6 text-muted-foreground/40" />
      <p className="text-sm font-semibold text-foreground">No properties match &ldquo;{query}&rdquo;</p>
      <p className="text-xs text-muted-foreground">Try a different property name, city, or state.</p>
    </div>
  )
}

// ── Loading state (shown for ~10s when the page mounts) ───────────────────────

function PropertyWebsitesLoading() {
  const bar = "animate-pulse rounded bg-zinc-200/80"
  return (
    <div className="flex flex-col min-h-full bg-stone-50">
      <div className="flex-1 p-6 md:p-8">
        <div className="space-y-5 max-w-5xl">

          {/* Header stays visible while the data loads */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Property Websites</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Each property&rsquo;s website needs a carrier-approved privacy policy before a vanity phone number can be assigned.
              Confirm the website and privacy policy URL for each property below.
            </p>
          </div>

          {/* Spinner + status line */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Hold tight. This can take a few minutes.</span>
          </div>

          {/* Progress area skeleton */}
          <div className="space-y-1.5">
            <div className={cn(bar, "h-3 w-56")} />
            <div className={cn(bar, "h-1.5 w-full rounded-full")} />
          </div>

          {/* Filter row skeleton (four tiles) */}
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={cn(bar, "h-16 rounded-lg")} />
            ))}
          </div>

          {/* Search bar skeleton */}
          <div className={cn(bar, "h-10 w-full rounded-md")} />

          {/* One property card skeleton */}
          <div className="rounded-xl border border-border bg-white p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className={cn(bar, "h-4 w-40")} />
              <div className={cn(bar, "h-4 w-16 rounded-full")} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className={cn(bar, "h-3 w-24")} />
                <div className={cn(bar, "h-9 w-full rounded-md")} />
              </div>
              <div className="space-y-2">
                <div className={cn(bar, "h-3 w-24")} />
                <div className={cn(bar, "h-9 w-full rounded-md")} />
              </div>
              <div className="space-y-2 pt-4">
                <div className={cn(bar, "h-9 w-full rounded-md")} />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function PrivacyPage({ navigate, onComplete, onActionCountChange }: BasePageProps) {
  const [ppStatuses, setPpStatuses] = useState<Record<string, PPStatus>>(() => {
    const m: Record<string, PPStatus> = {}
    PROPERTIES.forEach(p => {
      if (INITIALLY_COMPLETED.has(p.id))   m[p.id] = "completed"
      else if (INITIALLY_REVIEW.has(p.id)) m[p.id] = "review-in-progress"
      else if (INITIALLY_FAILED.has(p.id)) m[p.id] = "failed"
      else                                 m[p.id] = "needs-pp"
    })
    return m
  })

  const [ppUrls, setPpUrls] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    PROPERTIES.forEach(p => {
      const url = META_MAP[p.id]?.detectedUrl
      if (url && (INITIALLY_COMPLETED.has(p.id) || INITIALLY_REVIEW.has(p.id) || INITIALLY_FAILED.has(p.id))) {
        m[p.id] = `${url}/privacy-policy`
      }
    })
    return m
  })

  const [providedUrls, setProvidedUrls]       = useState<Record<string, string>>({})
  const [selectedSiteUrl, setSelectedSiteUrl] = useState<Record<string, string>>({})
  const [userFields, setUserFields]           = useState<UserFields>(DEFAULT_USER)
  const [sheetOpen, setSheetOpen]             = useState(false)

  type FilterView = "needs-action" | "pending" | "approved" | "all"
  const [filterView, setFilterView] = useState<FilterView>("needs-action")

  // Cards in "submitted" success state — status not moved to review-in-progress until dismissed
  const [submittedIds, setSubmittedIds]   = useState<Set<string>>(new Set())
  const [submittedUrls, setSubmittedUrls] = useState<Record<string, string>>({})

  /** Cards reporting heartbeat OK + submittable — powers global "Submit all verified". */
  const [readyToSubmit, setReadyToSubmit] = useState<Record<string, { website: string; ppUrl: string }>>({})
  const [bulkOffer, setBulkOffer] = useState<null | {
    templatePp: string
    sourceHost: string
    targets: { id: string; website: string }[]
  }>(null)

  const [toastMsg, setToastMsg]         = useState("")
  const [toastVisible, setToastVisible] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToastMsg(msg); setToastVisible(true)
    toastTimer.current = setTimeout(() => setToastVisible(false), 3500)
  }

  function effectiveUrl(id: string): string | null {
    if (selectedSiteUrl[id]) return selectedSiteUrl[id]
    if (MULTI_SITE_IDS.has(id)) return null
    return providedUrls[id] ?? META_MAP[id]?.detectedUrl ?? null
  }

  // Derived counts
  const completedCount = PROPERTIES.filter(p => ppStatuses[p.id] === "completed").length
  const reviewCount    = PROPERTIES.filter(p => ppStatuses[p.id] === "review-in-progress").length
  const failedCount    = PROPERTIES.filter(p => ppStatuses[p.id] === "failed").length
  const totalCount     = PROPERTIES.length
  const progressPct    = Math.round((completedCount / totalCount) * 100)
  const allDone        = completedCount === totalCount

  // Zone 1: action-required + submitted-but-not-yet-dismissed
  const actionProperties = PROPERTIES
    .filter(p => {
      const s = ppStatuses[p.id] ?? "needs-pp"
      return s === "needs-pp" || s === "failed" || submittedIds.has(p.id)
    })
    .sort((a, b) => {
      // Failed first, then submitted (success state), then needs-pp
      const rank = (p: typeof PROPERTIES[0]) =>
        ppStatuses[p.id] === "failed" ? 0 : submittedIds.has(p.id) ? 1 : 2
      return rank(a) - rank(b)
    })

  useEffect(() => {
    onActionCountChange?.(actionProperties.length)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionProperties.length])

  const completedRef = useRef(false)
  useEffect(() => {
    if (allDone && !completedRef.current) {
      completedRef.current = true
      onComplete?.("privacy")
      showToast("All privacy policies approved — phone number assignment is in progress in Communications")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone])

  const onCardReadyChange = useCallback((id: string, meta: { ready: boolean; website: string; ppUrl: string }) => {
    setReadyToSubmit(prev => {
      const next = { ...prev }
      if (meta.ready) next[id] = { website: meta.website, ppUrl: meta.ppUrl }
      else delete next[id]
      return next
    })
  }, [])

  function handleCardSubmit(
    propId: string,
    website: string,
    ppUrl: string,
    opts?: { silentBulk?: boolean },
  ) {
    const host = normalizeSiteInput(website)
    if (!opts?.silentBulk && isEntrataProspectPortalHost(host)) {
      const siblings = PROPERTIES.filter(p => {
        if (p.id === propId) return false
        const st = ppStatuses[p.id]
        if (st !== "needs-pp" && st !== "failed") return false
        if (submittedIds.has(p.id)) return false
        let eff: string | null = null
        if (selectedSiteUrl[p.id]) eff = selectedSiteUrl[p.id]
        else if (MULTI_SITE_IDS.has(p.id)) eff = MULTI_SITE_OPTIONS[p.id]?.[0] ?? null
        else eff = providedUrls[p.id] ?? META_MAP[p.id]?.detectedUrl ?? null
        return !!eff && isEntrataProspectPortalHost(eff)
      })
      if (siblings.length > 0) {
        setBulkOffer({
          templatePp: ppUrl,
          sourceHost: host,
          targets: siblings.map(p => ({
            id: p.id,
            website: normalizeSiteInput(
              selectedSiteUrl[p.id] ?? providedUrls[p.id] ?? META_MAP[p.id]?.detectedUrl ?? "",
            ),
          })).filter(t => t.website),
        })
      }
    }

    const current = effectiveUrl(propId)
    if (website && website !== current) {
      setProvidedUrls(prev => ({ ...prev, [propId]: website }))
      setSelectedSiteUrl(prev => ({ ...prev, [propId]: website }))
    }
    setPpUrls(prev => ({ ...prev, [propId]: ppUrl }))
    setSubmittedUrls(prev => ({ ...prev, [propId]: ppUrl }))
    setSubmittedIds(prev => new Set([...prev, propId]))
    setReadyToSubmit(prev => {
      const next = { ...prev }
      delete next[propId]
      return next
    })
  }

  function applyBulkOffer() {
    if (!bulkOffer || bulkOffer.targets.length === 0) return
    const snap = bulkOffer
    setBulkOffer(null)
    snap.targets.forEach(t => {
      const adapted = adaptPrivacyUrlToHost(snap.templatePp, t.website)
      handleCardSubmit(t.id, t.website, adapted, { silentBulk: true })
    })
    showToast(`Bulk-applied carrier-ready URL to ${snap.targets.length} matching Entrata Prospect Portal ${snap.targets.length === 1 ? "site" : "sites"}`)
  }

  function submitAllVerified() {
    const entries = Object.entries(readyToSubmit)
    if (entries.length === 0) return
    entries.forEach(([id, v]) => handleCardSubmit(id, v.website, v.ppUrl, { silentBulk: true }))
    setReadyToSubmit({})
    showToast(`Submitted ${entries.length} ${entries.length === 1 ? "property" : "properties"} for carrier review`)
  }

  function handleCardDismiss(propId: string) {
    setPpStatuses(prev => ({ ...prev, [propId]: "review-in-progress" }))
    setSubmittedIds(prev => { const n = new Set(prev); n.delete(propId); return n })
  }

  const handleConfirmTp = useCallback((id: string) => {
    const prop = PROPERTIES.find(p => p.id === id)
    showToast(`${prop?.name ?? "Third-party"} privacy policy updated`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Derived property lists per filter
  const reviewProperties   = PROPERTIES.filter(p => ppStatuses[p.id] === "review-in-progress")
  const approvedProperties = PROPERTIES.filter(p => ppStatuses[p.id] === "completed")

  // Auto-switch to needs-action when a submit lands from another filter
  const needsActionCount = actionProperties.length

  const verifiedReadyCount = Object.keys(readyToSubmit).length

  // ── Property search (the list under the filter tiles) ───────────────────────
  const [search, setSearch] = useState("")

  // Show a loading state for 10s when the page mounts (tab opened), then reveal content
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 10000)
    return () => clearTimeout(t)
  }, [])

  const matchesSearch = (p: typeof PROPERTIES[0]) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      p.name.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q) ||
      p.state.toLowerCase().includes(q)
    )
  }

  // Source list for the active filter, narrowed by the search query (full list, no paging)
  const searchBase =
    filterView === "needs-action" ? actionProperties  :
    filterView === "pending"      ? reviewProperties   :
    filterView === "approved"     ? approvedProperties :
                                    PROPERTIES
  const activeList  = searchBase.filter(matchesSearch)

  if (loading) return <PropertyWebsitesLoading />

  return (
    <TooltipProvider delayDuration={200}>
    <div className="flex flex-col min-h-full bg-stone-50">
      <div className="flex-1 p-6 md:p-8">
        <div className="space-y-5 max-w-5xl">

        {/* ── Page header ── */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Property Websites</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Each property&rsquo;s website needs a carrier-approved privacy policy before a vanity phone number can be assigned.
            Confirm the website and privacy policy URL for each property below.
          </p>
        </div>

        {/* ── Progress bar (Submit all lives in sticky footer) ── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs gap-2">
            <span className="text-muted-foreground">{completedCount} of {totalCount} properties — policy approved</span>
            <span className={cn("font-semibold shrink-0", allDone ? "text-emerald-700" : "text-foreground")}>{progressPct}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-zinc-200 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* ── Filter strip (~40% smaller than default metric tiles) ── */}
        <div className="grid grid-cols-4 gap-2">
          {([
            {
              id: "needs-action" as FilterView,
              label: "Needs action",
              count: needsActionCount,
              // Red when failures exist, amber otherwise — failures are a subset of needs-action
              dot:         failedCount > 0 ? "bg-red-500"     : "bg-amber-400",
              activeBg:    failedCount > 0 ? "bg-red-50"      : "bg-amber-50",
              activeBorder:failedCount > 0 ? "border-red-300" : "border-amber-300",
              activeLine:  failedCount > 0 ? "#f87171"        : "#fbbf24",
              countColor:  failedCount > 0 ? "text-red-700"   : "text-amber-700",
              labelColor:  failedCount > 0 ? "text-red-800"   : "text-amber-800",
            },
            {
              id: "pending" as FilterView,
              label: "Carrier review",
              count: reviewCount,
              dot: "bg-blue-400", activeBg: "bg-blue-50", activeBorder: "border-blue-300",
              activeLine: "#60a5fa", countColor: "text-blue-700", labelColor: "text-blue-800",
            },
            {
              id: "approved" as FilterView,
              label: "Policy approved",
              count: completedCount,
              dot: "bg-emerald-500", activeBg: "bg-emerald-50", activeBorder: "border-emerald-300",
              activeLine: "#34d399", countColor: "text-emerald-700", labelColor: "text-emerald-800",
            },
            {
              id: "all" as FilterView,
              label: "All properties",
              count: totalCount,
              dot: "bg-zinc-400", activeBg: "bg-zinc-100", activeBorder: "border-zinc-400",
              activeLine: "#a1a1aa", countColor: "text-zinc-700", labelColor: "text-zinc-700",
            },
          ]).map(tile => {
            const isActive = filterView === tile.id
            return (
              <button key={tile.id} type="button"
                onClick={() => setFilterView(tile.id)}
                style={isActive ? { borderBottomColor: tile.activeLine, borderBottomWidth: '2px' } : {}}
                className={cn(
                  "rounded-lg border px-2.5 py-2 text-left transition-all",
                  isActive
                    ? `${tile.activeBg} ${tile.activeBorder} shadow-sm`
                    : "border-border bg-white hover:border-zinc-300",
                )}>
                <p className={cn("text-xl font-bold leading-none mb-1 tabular-nums",
                  isActive ? tile.countColor : "text-foreground")}>
                  {tile.count}
                </p>
                <div className="flex items-center gap-1">
                  <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", tile.dot)} />
                  <span className={cn("text-[10px] font-semibold uppercase tracking-wide leading-tight",
                    isActive ? tile.labelColor : "text-muted-foreground")}>
                    {tile.label}
                  </span>
                </div>
                {tile.id === "needs-action" && failedCount > 0 && (
                  <p className="text-[9px] font-medium mt-1 text-red-600 leading-tight">
                    {failedCount} failed · {needsActionCount - failedCount} awaiting
                  </p>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Property search (filters the list under the tiles) ── */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search properties by name, city, or state…"
              aria-label="Search properties"
              className="w-full h-9 rounded-lg border border-border bg-white pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-zinc-900/15"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground/60 hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {search.trim() && (
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {activeList.length} {activeList.length === 1 ? "match" : "matches"}
            </span>
          )}
        </div>

        {/* ── Content area (switches per filter) ── */}

        {/* Needs action */}
        {filterView === "needs-action" && (
          <div className="space-y-4">
            {activeList.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {failedCount > 0
                    ? `${failedCount} failed carrier review · ${needsActionCount - failedCount} awaiting submission`
                    : `${needsActionCount} ${needsActionCount === 1 ? "property needs" : "properties need"} a privacy policy URL`}
                </p>
                {activeList.map(prop => (
                  <ActionCard
                    key={prop.id}
                    prop={prop}
                    status={ppStatuses[prop.id] ?? "needs-pp"}
                    ppUrl={ppUrls[prop.id] ?? ""}
                    websiteUrl={effectiveUrl(prop.id) ?? ""}
                    isMissing={!MULTI_SITE_IDS.has(prop.id) && effectiveUrl(prop.id) === null}
                    isMultiUnresolved={MULTI_SITE_IDS.has(prop.id) && !selectedSiteUrl[prop.id]}
                    multiOptions={MULTI_SITE_OPTIONS[prop.id] ?? []}
                    failReason={FAILED_REASONS[prop.id]}
                    tcFailReason={TC_FAILED_REASONS[prop.id]}
                    submitted={submittedIds.has(prop.id)}
                    submittedPpUrl={submittedUrls[prop.id]}
                    onSubmit={handleCardSubmit}
                    onDismiss={handleCardDismiss}
                    onViewPending={() => setFilterView("pending")}
                    onCardReadyChange={onCardReadyChange}
                  />
                ))}
              </>
            ) : actionProperties.length > 0 ? (
              <NoSearchMatch query={search} />
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-5 py-10 flex flex-col items-center text-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Nothing needs attention</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {reviewCount > 0
                      ? `${reviewCount} ${reviewCount === 1 ? "property is" : "properties are"} awaiting carrier review.`
                      : "All privacy policies have been approved."}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Carrier review */}
        {filterView === "pending" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {reviewCount > 0
                ? `${reviewCount} ${reviewCount === 1 ? "property" : "properties"} submitted — carrier review typically takes 2–3 business days.`
                : "No properties are currently in carrier review."}
            </p>
            {activeList.length > 0 ? (
              <div className="rounded-xl border border-border overflow-hidden bg-white">
                <table className="w-full text-xs border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-zinc-50">
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border w-[220px]">Property</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-l border-border w-[32%]">
                        <span className="flex items-center gap-1.5"><Globe className="h-3 w-3" />Website URL</span>
                      </th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-l border-border">Privacy Policy URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeList.map(prop => (
                      <tr key={prop.id} className="bg-white hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-3 border-b border-border">
                          <p className="font-medium text-foreground text-xs leading-tight">{prop.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{prop.city}, {prop.state}</p>
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-blue-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />Carrier review
                          </span>
                        </td>
                        <td className="px-4 py-3 border-b border-l border-border">
                          <span className="font-mono text-[11px] text-foreground block truncate">{effectiveUrl(prop.id) ?? "—"}</span>
                        </td>
                        <td className="px-4 py-3 border-b border-l border-border">
                          <span className="font-mono text-[11px] text-foreground block truncate">{ppUrls[prop.id] ?? "—"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : reviewCount > 0 ? (
              <NoSearchMatch query={search} />
            ) : null}
          </div>
        )}

        {/* Policy approved */}
        {filterView === "approved" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {completedCount > 0
                ? `${completedCount} ${completedCount === 1 ? "property has" : "properties have"} a carrier-approved privacy policy. Phone number assignment is handled in the Communications tab.`
                : "No properties have been approved yet."}
            </p>
            {activeList.length > 0 ? (
              <div className="rounded-xl border border-border overflow-hidden bg-white">
                <table className="w-full text-xs border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-zinc-50">
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border w-[220px]">Property</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-l border-border w-[32%]">
                        <span className="flex items-center gap-1.5"><Globe className="h-3 w-3" />Website URL</span>
                      </th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-l border-border">Privacy Policy URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeList.map(prop => (
                      <tr key={prop.id} className="bg-white hover:bg-emerald-50/30 transition-colors">
                        <td className="px-4 py-3 border-b border-border">
                          <p className="font-medium text-foreground text-xs leading-tight">{prop.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{prop.city}, {prop.state}</p>
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-emerald-700">
                            <CheckCircle2 className="h-3 w-3 shrink-0" />Policy approved
                          </span>
                        </td>
                        <td className="px-4 py-3 border-b border-l border-border">
                          <span className="font-mono text-[11px] text-foreground block truncate">{effectiveUrl(prop.id) ?? "—"}</span>
                        </td>
                        <td className="px-4 py-3 border-b border-l border-border">
                          <span className="font-mono text-[11px] text-foreground block truncate">{ppUrls[prop.id] ?? "—"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : completedCount > 0 ? (
              <NoSearchMatch query={search} />
            ) : null}
          </div>
        )}

        {/* All properties */}
        {filterView === "all" && (
          activeList.length > 0 ? (
          <div className="rounded-xl border border-border overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-separate border-spacing-0">
                <thead>
                  <tr className="bg-zinc-50">
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border w-[220px]">Property</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-l border-border w-[28%]">
                      <span className="flex items-center gap-1.5"><Globe className="h-3 w-3" />Website URL</span>
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-l border-border">Privacy Policy URL</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-l border-border w-[140px]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeList.map(prop => {
                    const status     = ppStatuses[prop.id] ?? "needs-pp"
                    const ppUrl      = ppUrls[prop.id] ?? ""
                    const websiteUrl = effectiveUrl(prop.id) ?? ""
                    return (
                      <tr key={prop.id} className="bg-white hover:bg-zinc-50/80 transition-colors">
                        <td className="px-4 py-2.5 border-b border-border">
                          <p className="font-medium text-foreground text-xs leading-tight">{prop.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{prop.city}, {prop.state}</p>
                        </td>
                        <td className="px-4 py-2.5 border-b border-l border-border">
                          {websiteUrl
                            ? <span className="font-mono text-[11px] text-foreground block truncate">{websiteUrl}</span>
                            : <span className="text-[11px] text-muted-foreground/50 italic">Not set</span>}
                        </td>
                        <td className="px-4 py-2.5 border-b border-l border-border">
                          {ppUrl
                            ? <span className={cn("font-mono text-[11px] block truncate", status === "failed" ? "text-red-400 line-through" : "text-foreground")}>{ppUrl}</span>
                            : <span className="text-[11px] text-muted-foreground/50 italic">Not submitted</span>}
                        </td>
                        <td className="px-4 py-2.5 border-b border-l border-border">
                          <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium",
                            status === "completed"          ? "text-emerald-700" :
                            status === "review-in-progress" ? "text-blue-600" :
                            status === "failed"             ? "text-red-600" : "text-amber-600",
                          )}>
                            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0",
                              status === "completed"          ? "bg-emerald-500" :
                              status === "review-in-progress" ? "bg-blue-400" :
                              status === "failed"             ? "bg-red-500" : "bg-amber-400",
                            )} />
                            {status === "completed"          ? "Approved" :
                             status === "review-in-progress" ? "In review" :
                             status === "failed"             ? "Failed" : "Needs action"}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          ) : (
            <NoSearchMatch query={search} />
          )
        )}

      </div>
        </div>

      <GlobalToast message={toastMsg} visible={toastVisible} />

      {/* TemplateSheet — entry point hidden for Phase 1 */}
      <TemplateSheet
        open={sheetOpen}
        fields={userFields}
        onChange={(k, v) => setUserFields(prev => ({ ...prev, [k]: v }))}
        ppPendingProps={[]}
        publishingCount={0}
        templateReady={ALL_REQUIRED_KEYS.every(k => userFields[k].trim() !== "")}
        tpUncoveredProps={[]}
        onPublish={() => {}}
        onConfirmTp={handleConfirmTp}
        onClose={() => setSheetOpen(false)}
        onNavigateToCarrier={() => navigate("company")}
      />
    </div>
    </TooltipProvider>
  )
}
