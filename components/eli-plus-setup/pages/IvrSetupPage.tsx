"use client"

import { Fragment, useState, useEffect } from "react"
import type { PageId } from "../index"
import { cn } from "@/lib/utils"
import {
  Phone,
  ChevronDown,
  ChevronUp,
  CornerDownRight,
  TrendingDown,
  Users,
  PhoneOff,
  AlertTriangle,
  Voicemail,
  ArrowRight,
  Info,
} from "lucide-react"

export type IvrChoice = null | "preferred" | "existing" | "thirdparty"

// ── Preferred menu data ───────────────────────────────────────────────────────

interface SubMenuOption { id: string; press: number; title: string; action: string }
interface IvrOption { id: string; press: number; title: string; action: string; subMenu?: SubMenuOption[] }

const DEFAULT_IVR: IvrOption[] = [
  {
    id: "d1", press: 1, title: "Leasing", action: "Send to Secondary Menu",
    subMenu: [
      { id: "d1s1", press: 1, title: "Text Assistant", action: "Forward to Leasing AI" },
      { id: "d1s2", press: 2, title: "Voice Assistant", action: "Forward to Leasing AI" },
    ],
  },
  {
    id: "d2", press: 2, title: "Resident for Work Order", action: "Send to Secondary Menu",
    subMenu: [
      { id: "d2s1", press: 1, title: "Emergency Work Order", action: "Forward as Resident – Maintenance Emergency" },
      { id: "d2s2", press: 2, title: "Work Order", action: "Forward to Maintenance AI" },
    ],
  },
  { id: "d3", press: 3, title: "Resident Non Work Order", action: "Forward as Resident – Non-Maintenance" },
  { id: "d4", press: 4, title: "Other", action: "Forward as Resident – Non-Maintenance" },
  { id: "d5", press: 5, title: "Repeat", action: "Repeat Options" },
]

// ── Menu preview accordion ────────────────────────────────────────────────────

function PreferredPreview({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-50 hover:bg-zinc-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <span className="text-xs font-semibold text-foreground">Preferred Menu Preview</span>
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t border-b border-border bg-zinc-50/50">
              <th className="text-left px-4 py-2 text-[11px] font-medium text-muted-foreground w-16">Press</th>
              <th className="text-left px-4 py-2 text-[11px] font-medium text-muted-foreground">Title</th>
              <th className="text-left px-4 py-2 text-[11px] font-medium text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody>
            {DEFAULT_IVR.map((opt, optIdx) => (
              <Fragment key={opt.id}>
                <tr className={cn("border-b border-border bg-white", optIdx === DEFAULT_IVR.length - 1 && !opt.subMenu && "border-0")}>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-zinc-100 text-xs font-semibold text-foreground">{opt.press}</span>
                  </td>
                  <td className="px-4 py-2.5 text-sm font-medium text-foreground">{opt.title}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{opt.action}</td>
                </tr>
                {opt.subMenu?.map((sub, subIdx) => (
                  <tr
                    key={sub.id}
                    className={cn(
                      "border-b border-border bg-zinc-50/70",
                      optIdx === DEFAULT_IVR.length - 1 && subIdx === (opt.subMenu?.length ?? 0) - 1 && "border-0",
                    )}
                  >
                    <td className="px-4 py-2 pl-8">
                      <div className="flex items-center gap-1.5">
                        <CornerDownRight className="h-3 w-3 text-zinc-400" aria-hidden />
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-zinc-200 text-[10px] font-semibold text-zinc-600">{sub.press}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-sm text-zinc-600">{sub.title}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{sub.action}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({ icon: Icon, value, label, source, iconCls }: {
  icon: typeof PhoneOff; value: string; label: string; source: string; iconCls?: string
}) {
  return (
    <div className="p-4 flex flex-col gap-1.5">
      <Icon className={cn("h-4 w-4", iconCls ?? "text-zinc-500")} aria-hidden />
      <p className="text-2xl font-bold tracking-tight text-foreground leading-none">{value}</p>
      <p className="text-xs text-muted-foreground leading-snug">{label}</p>
      <p className="text-[10px] text-muted-foreground/70 mt-auto pt-1">{source}</p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

interface Props {
  navigate: (to: PageId) => void
  ivrChoice: IvrChoice
  onSave: (choice: IvrChoice) => void
  showToast?: (msg: string) => void
}

export function IvrSetupPage({ onSave, showToast }: Props) {
  const [previewOpen, setPreviewOpen] = useState(true)

  // Auto-complete on mount — IVR setup requires no user action for the preferred template
  useEffect(() => {
    onSave("preferred")
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col min-h-full bg-stone-50">
      <div className="flex-1 w-full max-w-3xl p-6 md:p-8 space-y-8">

        {/* ── Header ── */}
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">IVR Setup</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              This tab shows how AI calls will be routed at go-live and flags anything in your existing setup that
              may need attention.{" "}
              <strong className="text-foreground">
                At go-live, we'll apply our default IVR template unless a custom IVR is already in place.
              </strong>
            </p>
          </div>
          <button
            type="button"
            onClick={() => showToast?.("Opening IVR Settings…")}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors"
          >
            Open IVR Settings
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {/* ── Custom IVR warning ── */}
        <div className="rounded-xl border-2 border-amber-400/60 bg-amber-50 overflow-hidden">
          <div className="px-5 pt-5 pb-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-1">
                  Heads up — Custom IVR Detected
                </p>
                <p className="text-base font-bold text-foreground leading-snug">
                  Your existing IVR may interfere with AI call routing
                </p>
                <p className="text-sm text-amber-700 mt-1.5 leading-relaxed">
                  When custom IVRs run alongside AI products, these are the kinds of issues that come up most.
                  You can keep your custom IVR; just know what to watch for.
                </p>
              </div>
            </div>

            <div className="space-y-2 mt-2">
              {[
                {
                  icon: Phone,
                  title: "Calls don't reach Leasing AI",
                  body: "Custom menus can skip the path that forwards leasing calls to AI, so prospects may not get answered.",
                },
                {
                  icon: Voicemail,
                  title: "Calls drop into voicemail",
                  body: "Overflow and after-hours paths sometimes land in property voicemail instead of routing to the assistant.",
                },
                {
                  icon: Phone,
                  title: "Vanity numbers and IVR routing break",
                  body: "Custom forwarding numbers and vanity lines can collide with AI forwarding and create routing loops.",
                },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex items-start gap-3 rounded-lg border border-amber-200/80 bg-white px-4 py-3">
                  <Icon className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" aria-hidden />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Default routing ── */}
        <div className="space-y-5">
          <div>
            <h2 className="text-base font-bold text-foreground">Default routing — Preferred Entrata IVR</h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              A two-level call menu optimized for leasing, maintenance, and resident calls. Routes directly to
              Leasing AI, Maintenance AI, Payments AI, and Renewals AI — no per-property setup required. This is
              what callers will hear the moment your AI products activate.
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            A convoluted IVR is the #1 reason AI deflection, tour-booking, and maintenance-triage KPIs
            underperform post-launch. The data is consistent across industry research:
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-border bg-white overflow-hidden divide-x divide-border">
            <StatTile icon={PhoneOff}     value="67%"   label="of callers have hung up on an IVR out of frustration"    source="WifiTalents, 2026"  iconCls="text-red-500" />
            <StatTile icon={TrendingDown} value="8–12%" label="of callers drop off per extra menu level added"           source="ViciStack, 2026"    iconCls="text-amber-500" />
            <StatTile icon={Users}        value="52%"   label="of users find typical IVR menus confusing"                source="WorldMetrics, 2026" iconCls="text-zinc-500" />
            <StatTile icon={AlertTriangle}value="50%"   label="will switch providers after one bad IVR experience"       source="WifiTalents, 2026"  iconCls="text-red-500" />
          </div>
        </div>

        {/* ── What callers will hear ── */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">What callers will hear</p>
          <PreferredPreview expanded={previewOpen} onToggle={() => setPreviewOpen(v => !v)} />
        </div>

        {/* ── Alternative options (reference only) ── */}
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-foreground">If you'd prefer a different setup</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                These are the alternatives we support. Switching away from the preferred menu doesn't happen
                here — talk to your consultant and they'll set it up with you.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                title: "Use Existing Entrata IVR",
                body: "Keep an IVR you already built in Entrata. Each property's AI forwarding number gets added as a destination in your existing menu.",
                where: "Where it lives: Company › Communication › Call Handling › Call Menu. Per-property AI forwarding numbers are on the Communications tab.",
              },
              {
                title: "Use 3rd-party IVR",
                body: "Already running an external IVR provider? You'll wire each property's AI forwarding number into that system's routing config.",
                where: "Once your A2P 10DLC campaigns are approved, copy the per-property forwarding numbers from the Communications tab into your provider's destinations.",
              },
            ].map(({ title, body, where }) => (
              <div key={title} className="rounded-xl border border-border bg-white p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
                    Reference
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
                <p className="text-[11px] text-muted-foreground/70 leading-relaxed border-t border-border pt-2">{where}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
