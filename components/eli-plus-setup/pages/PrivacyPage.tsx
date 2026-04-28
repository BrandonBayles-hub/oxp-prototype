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
} from "lucide-react"
import { generatePrivacyPolicy, type TemplateFields } from "../components/PrivacySheetContent"
import { GlobalToast } from "../components/GlobalToast"
import { PROPERTIES } from "../data/properties"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { LegalAckModal, useLegalAck } from "../components/LegalAckModal"

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

const INITIALLY_COVERED = new Set(["p1", "p2", "p3", "p4", "p5", "p7", "p10", "p12"])

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

const CORE_REQUIRED: (keyof UserFields)[] = ["messageFreq", "privacyEmail"]
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

type FilterTab  = "all" | "needs-action" | "covered"
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
    fields.messageFreq,
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

export const DISCLAIMER_PARAGRAPHS = [
  "THIS TEMPLATE WAS CREATED BY A GENERAL PURPOSE LARGE LANGUAGE MODEL FOR INFORMATIONAL PURPOSES ONLY AND IS NOT LEGAL ADVICE. This template is intended to serve as a starting point for organizations developing their own privacy notices and should not be relied upon as a substitute for consultation with qualified legal counsel. Use of this template is at your own risk. Entrata shall not be liable for any damages, losses, or other consequences arising from its use or adaptation.",
  "Each organization's privacy practices, data processing activities, and regulatory obligations are unique. Applicable privacy laws and regulations vary by jurisdiction, industry, and the nature of personal data collected and processed.",
  "Before using or adapting this template, conduct a thorough review of your organization's specific data collection and processing activities and consult with legal counsel.",
  "Privacy laws are subject to frequent amendment and evolving regulatory guidance; accordingly, periodically review and update any privacy notice derived from this template.",
]

// Versioned key — bump LEGAL_ACK_VERSION whenever DISCLAIMER_PARAGRAPHS changes
// in a way that legal wants users to re-acknowledge. Real implementation would
// persist the ack record (user_id + version + timestamp) to a backend audit log.
export const LEGAL_ACK_KEY = "eli-plus:legal-ack:privacy-policy"
export const LEGAL_ACK_VERSION = "v1"

// DEMO MODE — when true, the modal shows on every click and is never persisted.
// Set to false to enable real one-time-acknowledgement behavior.
const LEGAL_ACK_DEMO_MODE = true

function formatAckDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

function DisclaimerLink() {
  const { record } = useLegalAck(LEGAL_ACK_KEY, LEGAL_ACK_VERSION)
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
        {record && (
          <div className="pt-2 mt-1 border-t border-border">
            <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
              <span className="font-medium text-foreground/80">Last acknowledged:</span>{" "}
              {formatAckDate(record.timestamp)}
              <span className="text-muted-foreground/60"> · {record.version}</span>
            </p>
          </div>
        )}
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
    }, 1800)
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
              <p className="text-xs">
                {filledRequired < totalRequired
                  ? <span className="text-amber-600 font-medium">{filledRequired} of {totalRequired} required fields filled.</span>
                  : <span className="text-emerald-600 font-medium">All {totalRequired} required fields complete.</span>}
              </p>

              {/* Required user fields */}
              <div className="space-y-5">
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

// ── Main page ─────────────────────────────────────────────────────────────────

export function PrivacyPage({ navigate, onComplete, onActionCountChange }: BasePageProps) {
  const [filter, setFilter]             = useState<FilterTab>("needs-action")
  const [userFields, setUserFields]     = useState<UserFields>(DEFAULT_USER)
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set(INITIALLY_COVERED))
  const [publishingIds, setPublishingIds] = useState<Set<string>>(new Set())
  const [tpConfirmedIds, setTpConfirmedIds] = useState<Set<string>>(new Set())
  const [sheetOpen, setSheetOpen]       = useState(false)
  // URLs provided by client for properties where none was auto-detected
  const [providedUrls, setProvidedUrls] = useState<Record<string, string>>({})
  const [urlInputs, setUrlInputs]       = useState<Record<string, string>>({
    p13: "https://pacificcrest.com",
    p19: "https://vineyardterrace.com",
    p22: "https://trinityheights.com",
    p31: "https://cypresslanding.com",
  })
  // For properties with multiple Prospect Portal sites: client's chosen URL
  const [selectedSiteUrl, setSelectedSiteUrl] = useState<Record<string, string>>({})
  // Pending radio selection (before Confirm is clicked)
  const [draftSiteSelection, setDraftSiteSelection] = useState<Record<string, string>>({})

  // Toast
  const [toastMsg, setToastMsg]       = useState("")
  const [toastVisible, setToastVisible] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToastMsg(msg)
    setToastVisible(true)
    toastTimer.current = setTimeout(() => setToastVisible(false), 3500)
  }

  // ── Legal acknowledgement gate ─────────────────────────────────────────────
  // Show the disclaimer modal the first time a user enters the editing flow.
  // Once acknowledged for the current version, never shown again unless legal
  // bumps LEGAL_ACK_VERSION. In demo mode (LEGAL_ACK_DEMO_MODE), we clear the
  // record on mount so the modal shows every demo run.
  const { record: legalAckRecord, acknowledge: acknowledgeLegal } = useLegalAck(
    LEGAL_ACK_KEY,
    LEGAL_ACK_VERSION,
  )
  const [showLegalModal, setShowLegalModal] = useState(false)

  useEffect(() => {
    if (LEGAL_ACK_DEMO_MODE && typeof window !== "undefined") {
      window.localStorage.removeItem(LEGAL_ACK_KEY)
    }
  }, [])

  function openSheet() {
    // In demo mode, always show the modal on click (never persist).
    // In real mode, only show it the first time per version.
    if (LEGAL_ACK_DEMO_MODE || !legalAckRecord) {
      setShowLegalModal(true)
    } else {
      setSheetOpen(true)
    }
  }

  function handleLegalAcknowledged() {
    if (!LEGAL_ACK_DEMO_MODE) acknowledgeLegal()
    setShowLegalModal(false)
    setSheetOpen(true)
  }

  function effectiveUrl(id: string): string | null {
    if (selectedSiteUrl[id]) return selectedSiteUrl[id]
    if (MULTI_SITE_IDS.has(id)) return null   // pending site selection
    return providedUrls[id] ?? META_MAP[id]?.detectedUrl ?? null
  }

  // Properties still missing a website URL (auto-detection failed, no candidates)
  const missingUrlProperties = PROPERTIES.filter(p => !MULTI_SITE_IDS.has(p.id) && effectiveUrl(p.id) === null)
  // Properties with multiple Prospect Portal sites that haven't been chosen yet
  const multiSiteProperties  = PROPERTIES.filter(p => MULTI_SITE_IDS.has(p.id) && !selectedSiteUrl[p.id])
  // Properties with a known URL — these appear in the main table
  const knownUrlProperties   = PROPERTIES.filter(p => effectiveUrl(p.id) !== null)

  const templateReady = ALL_REQUIRED_KEYS.every(k => userFields[k].trim() !== "")
  const policyText    = generatePrivacyPolicy(userFieldsToTemplate(userFields))

  const ppPending      = knownUrlProperties.filter(p => META_MAP[p.id]?.siteType === "prospect-portal" && !publishedIds.has(p.id) && !publishingIds.has(p.id))
  const tpProperties   = knownUrlProperties.filter(p => META_MAP[p.id]?.siteType === "third-party")
  const tpCoveredCount = tpProperties.filter(p => tpConfirmedIds.has(p.id)).length
  const coveredCount   = publishedIds.size + tpCoveredCount
  const totalCount     = PROPERTIES.length
  const needsActionCount = totalCount - coveredCount - missingUrlProperties.length - multiSiteProperties.length
  const allDone        = coveredCount === totalCount
  const progressPct    = Math.round((coveredCount / totalCount) * 100)

  // Emit total action count (uncovered + missing URL + multi-site) to parent for sidebar badge
  const privacyBadgeCount = needsActionCount + missingUrlProperties.length + multiSiteProperties.length
  useEffect(() => {
    onActionCountChange?.(privacyBadgeCount)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [privacyBadgeCount])

  // Auto-complete when all properties are covered (must be after allDone is declared)
  const completedRef = useRef(false)
  useEffect(() => {
    if (allDone && !completedRef.current) {
      completedRef.current = true
      onComplete?.("privacy")
      setFilter("covered")
      showToast("Congrats! All property privacy policies are now live 🎉")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone])

  // Uncovered TP properties with known URLs — passed to template sheet for bulk confirm
  const tpUncoveredForSheet = tpProperties
    .filter(p => !tpConfirmedIds.has(p.id))
    .map(p => ({ id: p.id, name: p.name, url: effectiveUrl(p.id) ?? "" }))

  const filteredProperties = knownUrlProperties.filter(p => {
    const meta = META_MAP[p.id]; if (!meta) return false
    const isCovered = meta.siteType === "prospect-portal" ? publishedIds.has(p.id) : tpConfirmedIds.has(p.id)
    if (filter === "needs-action") return !isCovered
    if (filter === "covered") return isCovered
    return true
  })

  function handleFieldChange(key: keyof UserFields, val: string) {
    setUserFields(prev => ({ ...prev, [key]: val }))
  }
  function handlePublishAll(selectedIds: string[]) {
    setPublishingIds(new Set(selectedIds))
    setTimeout(() => {
      setPublishedIds(prev => new Set([...prev, ...selectedIds]))
      setPublishingIds(new Set())
      showToast(`Congrats! Privacy policies published to ${selectedIds.length} ${selectedIds.length === 1 ? "property" : "properties"}`)
      setSheetOpen(false)
    }, 2000)
  }
  const handleConfirmTp = useCallback((id: string) => {
    setTpConfirmedIds(prev => new Set([...prev, id]))
    const prop = PROPERTIES.find(p => p.id === id)
    showToast(`Congrats! ${prop?.name ?? "Third-party"} privacy policy updated`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  function handleConfirmUrl(id: string) {
    const url = urlInputs[id]?.trim()
    if (!url) return
    const prop = PROPERTIES.find(p => p.id === id)
    setProvidedUrls(prev => ({ ...prev, [id]: url }))
    setUrlInputs(prev => { const next = { ...prev }; delete next[id]; return next })
    showToast(`${prop?.name ?? "Property"} website confirmed — it's now in the table below`)
  }
  function handleConfirmSiteSelection(id: string) {
    const url = draftSiteSelection[id]
    if (!url) return
    const prop = PROPERTIES.find(p => p.id === id)
    setSelectedSiteUrl(prev => ({ ...prev, [id]: url }))
    setDraftSiteSelection(prev => { const next = { ...prev }; delete next[id]; return next })
    showToast(`${prop?.name ?? "Property"} site set — Eli+ will use ${url}`)
  }

  const FILTER_TABS: Array<{ id: FilterTab; label: string; count: number }> = [
    { id: "needs-action", label: "Needs action", count: needsActionCount              },
    { id: "covered",      label: "Completed",    count: coveredCount                  },
    { id: "all",          label: "All",          count: knownUrlProperties.length     },
  ]

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 md:p-8 space-y-6 max-w-4xl">

        <div>
          <h1 className="text-2xl font-bold tracking-tight">Privacy Policies</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl leading-relaxed">
            Each property needs its own privacy policy for Twilio carrier compliance.
            Campaigns submit per-property. When applicable, these updates will reflect
            and sync under your current Prospect Portal settings.
          </p>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => window.open("#", "_blank")}
              className={cn(buttonVariants({ variant: "eli", size: "sm" }))}
            >
              Open Prospect Portal Settings
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>

        {/* ── Missing website URLs callout ── */}
        {missingUrlProperties.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Website URL required — {missingUrlProperties.length} {missingUrlProperties.length === 1 ? "property" : "properties"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  We couldn't find a website for these properties. A URL is required before a privacy policy can be published.
                </p>
              </div>
            </div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-amber-100/80">
                {missingUrlProperties.map(prop => (
                  <tr key={prop.id} className="bg-white/60">
                    <td className="px-4 py-3 w-[200px]">
                      <p className="font-medium text-foreground">{prop.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{prop.city}, {prop.state}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <LinkIcon className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                        <input type="text"
                          value={urlInputs[prop.id] ?? ""}
                          onChange={e => setUrlInputs(prev => ({ ...prev, [prop.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === "Enter") handleConfirmUrl(prop.id) }}
                          placeholder="https://yourproperty.com"
                          className="h-8 flex-1 rounded-md border border-amber-300 bg-white px-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition-colors" />
                        <button type="button"
                          disabled={!urlInputs[prop.id]?.trim()}
                          onClick={() => handleConfirmUrl(prop.id)}
                          className="h-8 rounded-md bg-zinc-900 px-3 text-[11px] font-semibold text-white hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
                          Confirm URL
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Multiple Prospect Portal sites callout ── */}
        {multiSiteProperties.length > 0 && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/40 overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Multiple websites detected — {multiSiteProperties.length} {multiSiteProperties.length === 1 ? "property" : "properties"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  We found more than one Prospect Portal site for these properties. Pick which one Eli+ should use.
                </p>
              </div>
            </div>
            <div className="divide-y divide-blue-100/80">
              {multiSiteProperties.map(prop => {
                const options = MULTI_SITE_OPTIONS[prop.id] ?? []
                const draft = draftSiteSelection[prop.id]
                return (
                  <div key={prop.id} className="bg-white/60 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="w-[180px] shrink-0 pt-0.5">
                        <p className="text-xs font-medium text-foreground">{prop.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{prop.city}, {prop.state}</p>
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        {options.map(url => {
                          const checked = draft === url
                          return (
                            <label key={url}
                              className={cn(
                                "flex items-center gap-2 cursor-pointer rounded-md border px-2.5 py-1.5 transition-colors",
                                checked ? "border-blue-300 bg-blue-50" : "border-border bg-white hover:border-zinc-300",
                              )}>
                              <input type="radio" name={`site-${prop.id}`} checked={checked}
                                onChange={() => setDraftSiteSelection(prev => ({ ...prev, [prop.id]: url }))}
                                className="accent-zinc-900 h-3.5 w-3.5 shrink-0" />
                              <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className="text-[11px] font-mono text-foreground truncate">{url}</span>
                            </label>
                          )
                        })}
                      </div>
                      <button type="button"
                        disabled={!draft}
                        onClick={() => handleConfirmSiteSelection(prop.id)}
                        className="h-8 shrink-0 rounded-md bg-zinc-900 px-3 text-[11px] font-semibold text-white hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
                        Confirm
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{coveredCount} of {totalCount} properties have a privacy policy</span>
            <span className={cn("font-semibold", allDone ? "text-emerald-700" : "text-foreground")}>{progressPct}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-zinc-100 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Filter tabs + primary action */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1">
            {FILTER_TABS.map(tab => (
              <button key={tab.id} type="button" onClick={() => setFilter(tab.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors border",
                  filter === tab.id ? "bg-zinc-900 text-white border-zinc-900"
                    : "bg-white text-muted-foreground border-border hover:border-zinc-400 hover:text-foreground",
                )}>
                {tab.label}
                <span className={cn("text-[10px] font-semibold", filter === tab.id ? "text-white/60" : "text-muted-foreground/60")}>{tab.count}</span>
              </button>
            ))}
          </div>
          {!allDone && (
            <button type="button" onClick={() => openSheet()}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700 transition-colors whitespace-nowrap">
              Update privacy policies
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-zinc-50">
                  <th className="text-left px-4 py-3 font-semibold text-foreground w-[175px]">Property</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground w-[195px]">
                    <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-muted-foreground" />Website</span>
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground w-[120px]">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground w-[130px]">Privacy policy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredProperties.map(prop => {
                  const meta = META_MAP[prop.id]; if (!meta) return null
                  const url        = effectiveUrl(prop.id) ?? ""
                  const isPublishing = publishingIds.has(prop.id)
                  const isTP         = meta.siteType === "third-party"
                  const isCovered    = isTP ? tpConfirmedIds.has(prop.id) : publishedIds.has(prop.id)

                  return (
                    <tr key={prop.id} className="bg-white hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-foreground leading-tight">{prop.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{prop.city}, {prop.state}</p>
                      </td>
                      <td className="px-4 py-2.5 max-w-[195px]">
                        <span className="font-mono text-[11px] text-muted-foreground block truncate" title={url}>{url}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs text-muted-foreground">{isTP ? "Third-party" : "Prospect Portal"}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        {isCovered ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 whitespace-nowrap">
                            <CheckCircle2 className="h-3.5 w-3.5" />Covered
                          </span>
                        ) : isPublishing ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 whitespace-nowrap">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />Publishing…
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 whitespace-nowrap">
                            <AlertTriangle className="h-3.5 w-3.5" />Needs coverage
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Complete */}
        <div className="pt-1 border-t border-border">
          {allDone && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium">
              <CheckCircle2 className="h-4 w-4" />All {totalCount} property privacy policies are live.
            </div>
          )}
        </div>
      </div>

      <GlobalToast message={toastMsg} visible={toastVisible} />

      <TemplateSheet
        open={sheetOpen}
        fields={userFields}
        onChange={handleFieldChange}
        ppPendingProps={ppPending}
        publishingCount={publishingIds.size}
        templateReady={templateReady}
        tpUncoveredProps={tpUncoveredForSheet}
        onPublish={handlePublishAll}
        onConfirmTp={handleConfirmTp}
        onClose={() => setSheetOpen(false)}
        onNavigateToCarrier={() => navigate("company")}
      />

      <LegalAckModal
        open={showLegalModal}
        storageKey={LEGAL_ACK_KEY}
        version={LEGAL_ACK_VERSION}
        title="Before you edit privacy policy text"
        intro="This is a one-time acknowledgement. We'll record it so you won't see this again unless the disclaimer changes."
        paragraphs={DISCLAIMER_PARAGRAPHS}
        acknowledgeLabel="I have read and understood the disclaimer above."
        continueLabel="Continue to privacy policy"
        onAcknowledged={handleLegalAcknowledged}
      />
    </div>
  )
}
