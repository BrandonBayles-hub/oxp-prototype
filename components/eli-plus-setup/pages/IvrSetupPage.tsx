"use client"

import { Fragment, useEffect, useState } from "react"
import type { PageId } from "../index"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CornerDownRight,
  Info,
  Phone,
  PhoneForwarded,
  PhoneOff,
  Sparkles,
  TrendingDown,
  Users,
  Voicemail,
} from "lucide-react"

// Kept for backwards compat with parent (index.tsx still imports this type).
// IVR is now referential only — selection always defaults to "preferred".
export type IvrChoice = null | "preferred" | "existing" | "thirdparty"

// ── Preferred menu preview ───────────────────────────────────────────────────

interface SubMenuOption {
  id: string
  press: number
  title: string
  action: string
}

interface IvrOption {
  id: string
  press: number
  title: string
  action: string
  subMenu?: SubMenuOption[]
}

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
                <tr
                  className={cn(
                    "border-b border-border bg-white",
                    optIdx === DEFAULT_IVR.length - 1 && !opt.subMenu && "border-0",
                  )}
                >
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

// ── Proof-point tile ─────────────────────────────────────────────────────────

function StatTile({
  icon: Icon,
  value,
  label,
  source,
  tone,
}: {
  icon: typeof PhoneOff
  value: string
  label: string
  source: string
  tone?: "red" | "amber" | "zinc"
}) {
  const iconColor =
    tone === "red" ? "text-red-600"
    : tone === "amber" ? "text-amber-600"
    : "text-zinc-500"
  return (
    <div className="rounded-lg border border-border bg-white p-4 flex flex-col gap-1.5">
      <Icon className={cn("h-4 w-4", iconColor)} aria-hidden />
      <p className="text-2xl font-bold tracking-tight text-foreground leading-none">{value}</p>
      <p className="text-xs text-muted-foreground leading-snug">{label}</p>
      <p className="text-[10px] text-muted-foreground/70 mt-auto pt-1">{source}</p>
    </div>
  )
}

// ── Custom IVR risk callout (vague themes — no tickets, no specifics) ───────

interface CustomIvrTheme {
  icon: typeof PhoneOff
  title: string
  description: string
}

const CUSTOM_IVR_THEMES: CustomIvrTheme[] = [
  {
    icon: PhoneForwarded,
    title: "Calls don't reach Leasing AI",
    description:
      "Custom menus can skip the path that forwards leasing calls to AI, so prospects may not get answered.",
  },
  {
    icon: Voicemail,
    title: "Calls drop into voicemail",
    description:
      "Overflow and after-hours paths sometimes land in property voicemail instead of routing to the assistant.",
  },
  {
    icon: Phone,
    title: "Vanity numbers and IVR routing break",
    description:
      "Custom forwarding numbers and vanity lines can collide with AI forwarding and create routing loops.",
  },
]

function CustomIvrAlert() {
  return (
    <section className="rounded-xl border-2 border-amber-300 bg-amber-50/60 px-5 py-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <AlertTriangle className="h-4 w-4 text-amber-700" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
            Heads up — custom IVR detected
          </p>
          <h2 className="text-base font-semibold text-amber-950 mt-0.5">
            Your existing IVR may interfere with AI call routing
          </h2>
          <p className="text-xs text-amber-900/80 mt-1.5 leading-relaxed">
            When custom IVRs run alongside AI products, these are the kinds of issues that
            come up most. You can keep your custom IVR; just know what to watch for.
          </p>
        </div>
      </div>

      <ul className="space-y-2.5 mt-4">
        {CUSTOM_IVR_THEMES.map((theme) => (
          <li
            key={theme.title}
            className="rounded-lg border border-amber-200 bg-white px-3.5 py-3 flex items-start gap-3"
          >
            <theme.icon className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{theme.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {theme.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ── Reference cards (read-only — replaces the old selectable choice cards) ──

function ReferenceOptionCard({
  title,
  description,
  helper,
  badge,
}: {
  title: string
  description: string
  helper: string
  badge?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {badge && (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
            {badge}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
      <p className="text-[11px] text-muted-foreground/80 mt-2 leading-relaxed">{helper}</p>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

interface Props {
  navigate: (to: PageId) => void
  ivrChoice: IvrChoice
  onSave: (choice: IvrChoice) => void
  showToast?: (msg: string) => void
}

export function IvrSetupPage({ ivrChoice, onSave }: Props) {
  // Prototype-only toggle: simulate a customer who already has a custom IVR.
  const [hasCustomIvr, setHasCustomIvr] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(true)

  // Mark IVR step as complete on view — the page is referential, so visiting
  // it acknowledges the default routing and keeps go-live progress intact.
  useEffect(() => {
    if (ivrChoice === null) {
      onSave("preferred")
    }
  }, [ivrChoice, onSave])

  return (
    <div className="flex flex-col min-h-full bg-stone-50">
      <div className="flex-1 w-full max-w-5xl p-6 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">IVR Setup</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
              This tab shows how AI calls will be routed at go-live and flags anything in
              your existing setup that may need attention.{" "}
              <span className="font-semibold text-foreground">
                At go-live, we'll apply our default IVR template unless a custom IVR is
                already in place.
              </span>
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => window.open("#", "_blank")}
                className={cn(buttonVariants({ variant: "eli", size: "sm" }))}
              >
                Open IVR Settings
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          </div>

          {/* Prototype-only simulation toggle */}
          <div className="hidden lg:flex items-center gap-2 shrink-0 rounded-md border border-dashed border-zinc-300 px-2.5 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
            <span className="text-[11px] font-medium text-muted-foreground">Sim:</span>
            <button
              type="button"
              onClick={() => setHasCustomIvr((v) => !v)}
              className={cn(
                "text-[11px] font-semibold rounded-sm px-2 py-0.5 transition-colors",
                hasCustomIvr
                  ? "bg-amber-100 text-amber-800"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
              )}
              aria-pressed={hasCustomIvr}
            >
              Custom IVR detected
            </button>
          </div>
        </div>

        {/* Custom IVR detected — surfaced first when applicable */}
        {hasCustomIvr && <CustomIvrAlert />}

        {/* Default routing — plain section, no container */}
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Default routing — Preferred Entrata IVR
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-prose leading-relaxed">
              A two-level call menu optimized for leasing, maintenance, and resident calls.
              Routes directly to Leasing AI, Maintenance AI, Payments AI, and Renewals AI —
              no per-property setup required. This is what callers will hear the moment your
              AI products activate.
            </p>
            <p className="text-xs text-muted-foreground mt-3 max-w-prose leading-relaxed">
              A convoluted IVR is the #1 reason AI deflection, tour-booking, and
              maintenance-triage KPIs underperform post-launch. The data is consistent across
              industry research:
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile
              icon={PhoneOff}
              value="67%"
              label="of callers have hung up on an IVR out of frustration"
              source="WifiTalents, 2026"
              tone="red"
            />
            <StatTile
              icon={TrendingDown}
              value="8–12%"
              label="of callers drop off per extra menu level added"
              source="ViciStack, 2026"
              tone="amber"
            />
            <StatTile
              icon={Users}
              value="52%"
              label="of users find typical IVR menus confusing"
              source="WorldMetrics, 2026"
            />
            <StatTile
              icon={AlertTriangle}
              value="50%"
              label="will switch providers after one bad IVR experience"
              source="WifiTalents, 2026"
              tone="red"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              What callers will hear
            </p>
            <PreferredPreview expanded={previewOpen} onToggle={() => setPreviewOpen(!previewOpen)} />
          </div>
        </section>

        {/* Reference: alternative routing options (read-only) */}
        <section className="space-y-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-zinc-900 mt-0.5" aria-hidden />
            <div>
              <h2 className="text-sm font-semibold text-foreground">If you'd prefer a different setup</h2>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-prose">
                These are the alternatives we support. Switching away from the preferred menu
                doesn't happen here — talk to your consultant and they'll set it up with you.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ReferenceOptionCard
              title="Use Existing Entrata IVR"
              badge="Reference"
              description="Keep an IVR you already built in Entrata. Each property's AI forwarding number gets added as a destination in your existing menu."
              helper="Where it lives: Company › Communication › Call Handling › Call Menu. Per-property AI forwarding numbers are on the Communications tab."
            />
            <ReferenceOptionCard
              title="Use 3rd-party IVR"
              badge="Reference"
              description="Already running an external IVR provider? You'll wire each property's AI forwarding number into that system's routing config."
              helper="Once your A2P 10DLC campaigns are approved, copy the per-property forwarding numbers from the Communications tab into your provider's destinations."
            />
          </div>
        </section>
      </div>
    </div>
  )
}
