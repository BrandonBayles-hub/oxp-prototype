"use client"

import { Fragment, useState } from "react"
import type { PageId } from "../index"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  Phone,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CornerDownRight,
  CheckCircle2,
  ShieldCheck,
  TrendingDown,
  Users,
  PhoneOff,
  ArrowRight,
  Sparkles,
} from "lucide-react"

export type IvrChoice = null | "preferred" | "existing" | "thirdparty"
type IvrSelection = Exclude<IvrChoice, null>

const CHOICE_LABEL: Record<IvrSelection, string> = {
  preferred: "Preferred Entrata IVR",
  existing: "Existing Entrata IVR",
  thirdparty: "3rd-party IVR",
}

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
    <div className="p-4 flex flex-col gap-1.5">
      <Icon className={cn("h-4 w-4", iconColor)} aria-hidden />
      <p className="text-2xl font-bold tracking-tight text-foreground leading-none">{value}</p>
      <p className="text-xs text-muted-foreground leading-snug">{label}</p>
      <p className="text-[10px] text-muted-foreground/70 mt-auto pt-1">{source}</p>
    </div>
  )
}

// ── Selection cards ──────────────────────────────────────────────────────────

function SelectionCards({
  selection,
  setSelection,
  previewOpen,
  setPreviewOpen,
}: {
  selection: IvrSelection
  setSelection: (s: IvrSelection) => void
  previewOpen: boolean
  setPreviewOpen: (v: boolean) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {/* Preferred */}
      <button
        type="button"
        onClick={() => setSelection("preferred")}
        className={cn(
          "rounded-xl border p-4 text-left transition-all",
          selection === "preferred"
            ? "border-zinc-900 bg-white ring-1 ring-zinc-900"
            : "border-border bg-white hover:border-zinc-400",
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
            selection === "preferred" ? "border-zinc-900" : "border-zinc-300",
          )}>
            {selection === "preferred" && <div className="h-2 w-2 rounded-full bg-zinc-900" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">Use Preferred Entrata IVR</p>
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-3 w-3" aria-hidden />
                Recommended
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Two-level menu optimized for leasing, maintenance, and resident calls. Routes directly to Leasing AI and Maintenance AI — no manual per-property setup needed.
            </p>
            {selection === "preferred" && (
              <div className="mt-3">
                <PreferredPreview expanded={previewOpen} onToggle={() => setPreviewOpen(!previewOpen)} />
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Existing Entrata */}
      <button
        type="button"
        onClick={() => setSelection("existing")}
        className={cn(
          "rounded-xl border p-4 text-left transition-all",
          selection === "existing"
            ? "border-zinc-900 bg-white ring-1 ring-zinc-900"
            : "border-border bg-white hover:border-zinc-400",
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
            selection === "existing" ? "border-zinc-900" : "border-zinc-300",
          )}>
            {selection === "existing" && <div className="h-2 w-2 rounded-full bg-zinc-900" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">Use Existing Entrata IVR</p>
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle className="h-3 w-3" aria-hidden />
                Not recommended
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Keep an IVR you already built in Entrata. You'll need to add each property's AI forwarding number to that IVR manually.
            </p>
            {selection === "existing" && (
              <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-3 space-y-3">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Each property has a unique AI forwarding number — find them on the Communications tab, then add them as destinations in your existing IVR.
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); window.open("#", "_blank") }}
                  className={cn(buttonVariants({ variant: "eli", size: "sm" }), "w-full justify-center")}
                >
                  Open Existing IVR Settings
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </button>
                <p className="text-[10px] text-muted-foreground text-center">
                  Company › Communication › Call Handling › Call Menu
                </p>
              </div>
            )}
          </div>
        </div>
      </button>

      {/* 3rd-party */}
      <button
        type="button"
        onClick={() => setSelection("thirdparty")}
        className={cn(
          "rounded-xl border p-4 text-left transition-all",
          selection === "thirdparty"
            ? "border-zinc-900 bg-white ring-1 ring-zinc-900"
            : "border-border bg-white hover:border-zinc-400",
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
            selection === "thirdparty" ? "border-zinc-900" : "border-zinc-300",
          )}>
            {selection === "thirdparty" && <div className="h-2 w-2 rounded-full bg-zinc-900" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">Use 3rd-party IVR</p>
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle className="h-3 w-3" aria-hidden />
                Not recommended
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Using an external IVR provider? You'll need to wire each property's AI forwarding number into that system on your own.
            </p>
            {selection === "thirdparty" && (
              <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-3">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Per-property AI forwarding numbers live on the Communications tab. Once your campaigns are approved, copy them into your 3rd-party IVR's routing configuration.
                </p>
              </div>
            )}
          </div>
        </div>
      </button>
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

export function IvrSetupPage({ ivrChoice, onSave, showToast }: Props) {
  const [selection, setSelection] = useState<IvrSelection>(ivrChoice ?? "preferred")
  const [previewOpen, setPreviewOpen] = useState(true)

  const saved = ivrChoice !== null
  const pendingChanges = saved && selection !== ivrChoice
  const deviating = selection !== "preferred"

  function handleSave() {
    onSave(selection)
    showToast?.(
      ivrChoice === null
        ? `IVR routing saved — ${CHOICE_LABEL[selection]}`
        : `IVR routing updated — ${CHOICE_LABEL[selection]}`,
    )
  }

  return (
    <div className="flex flex-col min-h-full bg-stone-50">
      <div className="flex-1 w-full max-w-5xl p-6 md:p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">IVR Setup</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Tell us how callers should be routed when an AI product goes live. We'll apply your selection automatically the moment Leasing AI, Maintenance AI, Payments AI, or Renewals AI activate — you can revisit this at any time.
          </p>
        </div>

        {/* Saved banner */}
        {saved && !pendingChanges && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-3">
            <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-700 shrink-0" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-900">
                Selection saved — {CHOICE_LABEL[selection]}
              </p>
              <p className="text-xs text-emerald-800/80 mt-0.5">
                This routing will be applied automatically at go-live. Update it anytime below.
              </p>
            </div>
          </div>
        )}

        {pendingChanges && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
            <Sparkles className="h-4 w-4 mt-0.5 text-amber-700 shrink-0" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">
                Unsaved changes
              </p>
              <p className="text-xs text-amber-800/80 mt-0.5">
                You've picked {CHOICE_LABEL[selection]}. Save changes to make it active.
              </p>
            </div>
          </div>
        )}

        {/* Proof-point card */}
        <section className="rounded-xl border border-border bg-white overflow-hidden">
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-zinc-900" aria-hidden />
              <h2 className="text-sm font-semibold text-foreground">Why we recommend the preferred menu</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-prose">
              A convoluted IVR is the #1 reason AI deflection, tour-booking, and maintenance-triage KPIs underperform post-launch. The data is consistent across industry research:
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-border divide-x divide-border">
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

          <div className="px-5 py-3 bg-stone-50/70 border-t border-border">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Our preferred menu resolves calls in at most two levels and routes directly to the right AI — benchmarked against real Entrata implementations for tour-booking conversion and maintenance-triage accuracy.
            </p>
          </div>
        </section>

        {/* Selection */}
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Choose your go-live routing</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pick how calls should be handled when your AI products activate. You can change this later.
            </p>
          </div>

          <SelectionCards
            selection={selection}
            setSelection={setSelection}
            previewOpen={previewOpen}
            setPreviewOpen={setPreviewOpen}
          />

          {deviating && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-700 shrink-0" aria-hidden />
              <div className="text-xs text-amber-900 leading-relaxed">
                <p className="font-semibold mb-1">Heads up — deviating from the preferred menu can hurt your KPIs.</p>
                <p>
                  Every additional menu layer drops 8–12% of callers, and misrouted calls never reach{" "}
                  {selection === "existing" ? "Leasing AI or Maintenance AI" : "your Entrata AI products"}.
                  You'll also need to manually configure AI forwarding numbers for each property in your{" "}
                  {selection === "existing" ? "existing Entrata IVR" : "3rd-party IVR"},
                  which typically adds days to the implementation timeline.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 border-t border-border bg-white/90 backdrop-blur px-6 md:px-8 py-3.5 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground min-w-0 truncate">
          {saved
            ? pendingChanges
              ? `Active routing: ${CHOICE_LABEL[ivrChoice as IvrSelection]} · pending update to ${CHOICE_LABEL[selection]}`
              : `Active routing: ${CHOICE_LABEL[selection]}`
            : "One selection — we'll apply it automatically at go-live."}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {pendingChanges && (
            <button
              type="button"
              onClick={() => setSelection(ivrChoice as IvrSelection)}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saved && !pendingChanges}
            className={cn(buttonVariants({ variant: "eli", size: "sm" }))}
          >
            {saved
              ? pendingChanges ? "Save changes" : "Saved"
              : "Confirm selection"}
          </button>
        </div>
      </div>
    </div>
  )
}
