"use client"

import { useState } from "react"
import type { PageId } from "../index"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, Pencil, XCircle, Globe } from "lucide-react"

// ── Connected email accounts ──────────────────────────────────────────────────

type EmailProvider = "google" | "microsoft" | "imap"

interface ConnectedAccount {
  id: string
  email: string
  provider: EmailProvider
  imapConfigured?: boolean
  smtpConfigured?: boolean
  verified?: boolean
  properties: string[]
  serviceType: string
}

const CONNECTED_ACCOUNTS: ConnectedAccount[] = [
  {
    id: "a1",
    email: "spidyamit@zohomail.com",
    provider: "imap",
    imapConfigured: true,
    smtpConfigured: true,
    verified: true,
    properties: ["Skyline Apartments", "Brandon's Buildings"],
    serviceType: "ELI+ Leasing AI",
  },
  {
    id: "a2",
    email: "test1@gmail.com",
    provider: "google",
    properties: ["Azure Heights", "Pine Valley Estates"],
    serviceType: "ELI+ Leasing AI",
  },
  {
    id: "a3",
    email: "test2@gmail.com",
    provider: "microsoft",
    properties: ["Cambridge Suites", "Sunset Ridge"],
    serviceType: "ELI+ Payments AI",
  },
]

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
      <path fill="#F25022" d="M1 1h10v10H1z"/>
      <path fill="#7FBA00" d="M13 1h10v10H13z"/>
      <path fill="#00A4EF" d="M1 13h10v10H1z"/>
      <path fill="#FFB900" d="M13 13h10v10H13z"/>
    </svg>
  )
}

function ProviderLabel({ provider }: { provider: EmailProvider }) {
  if (provider === "google") return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <GoogleIcon />Google
    </span>
  )
  if (provider === "microsoft") return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <MicrosoftIcon />Microsoft
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Globe className="h-3.5 w-3.5" />IMAP/SMTP
    </span>
  )
}

function ConfigBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[11px] font-medium",
      ok ? "text-teal-600" : "text-muted-foreground",
    )}>
      <CheckCircle2 className="h-3 w-3" aria-hidden />
      {label}
    </span>
  )
}

function ServiceChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
      {label}
    </span>
  )
}

interface EmailProperty {
  id: string
  name: string
  connectedEmail: string | null
  leasing: "done" | "pending" | "na"
  maintenance: "done" | "pending" | "na"
  payments: "done" | "pending" | "na"
  renewals: "done" | "pending" | "na"
  entrataEmail: "done" | "pending" | "na"
}

const PROPERTIES: EmailProperty[] = [
  { id: "p1",  name: "Harvest Peak Capital",   connectedEmail: null,                    leasing: "pending", maintenance: "pending", payments: "pending", renewals: "pending", entrataEmail: "na" },
  { id: "p2",  name: "Skyline Apartments",      connectedEmail: "spidyamit@zohomail.com", leasing: "done",    maintenance: "pending", payments: "pending", renewals: "pending", entrataEmail: "na" },
  { id: "p3",  name: "The Meridian",            connectedEmail: null,                    leasing: "pending", maintenance: "pending", payments: "pending", renewals: "na",      entrataEmail: "na" },
  { id: "p4",  name: "Azure Heights",           connectedEmail: "test1@gmail.com",        leasing: "done",    maintenance: "pending", payments: "na",      renewals: "na",      entrataEmail: "na" },
  { id: "p5",  name: "Cambridge Suites",        connectedEmail: "test2@gmail.com",        leasing: "pending", maintenance: "na",      payments: "done",    renewals: "pending", entrataEmail: "na" },
  { id: "p6",  name: "Sunset Ridge",            connectedEmail: null,                    leasing: "pending", maintenance: "pending", payments: "pending", renewals: "pending", entrataEmail: "na" },
  { id: "p7",  name: "Harbor View",             connectedEmail: null,                    leasing: "pending", maintenance: "na",      payments: "pending", renewals: "na",      entrataEmail: "na" },
  { id: "p8",  name: "Maple Commons",           connectedEmail: "maple@mgmt.com",         leasing: "done",    maintenance: "done",    payments: "pending", renewals: "na",      entrataEmail: "na" },
  { id: "p9",  name: "The Edison",              connectedEmail: null,                    leasing: "pending", maintenance: "pending", payments: "na",      renewals: "pending", entrataEmail: "na" },
  { id: "p10", name: "Parkside Lofts",          connectedEmail: "parkside@mgmt.com",      leasing: "done",    maintenance: "pending", payments: "done",    renewals: "done",    entrataEmail: "na" },
  { id: "p11", name: "River North Plaza",       connectedEmail: null,                    leasing: "pending", maintenance: "na",      payments: "pending", renewals: "na",      entrataEmail: "na" },
  { id: "p12", name: "Cedar Glen",              connectedEmail: null,                    leasing: "pending", maintenance: "pending", payments: "pending", renewals: "pending", entrataEmail: "na" },
  { id: "p13", name: "Oakwood Terrace",         connectedEmail: "oakwood@rentals.com",    leasing: "done",    maintenance: "pending", payments: "na",      renewals: "pending", entrataEmail: "na" },
  { id: "p14", name: "Lakeside Villas",         connectedEmail: null,                    leasing: "pending", maintenance: "na",      payments: "pending", renewals: "na",      entrataEmail: "na" },
  { id: "p15", name: "Metro 1200",              connectedEmail: "metro@mgmt.com",         leasing: "done",    maintenance: "done",    payments: "pending", renewals: "done",    entrataEmail: "na" },
  { id: "p16", name: "Summit Pointe",           connectedEmail: null,                    leasing: "pending", maintenance: "pending", payments: "pending", renewals: "pending", entrataEmail: "na" },
]

const PAGE_SIZE = 5

type ServiceStatus = "done" | "pending" | "na"

function StatusCell({ status }: { status: ServiceStatus }) {
  if (status === "na") {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-xs text-muted-foreground">N/A</span>
      </div>
    )
  }
  if (status === "done") {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <CheckCircle2 className="h-5 w-5 text-teal-500" aria-hidden />
        <span className="text-[11px] font-medium text-teal-600">Done</span>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="h-5 w-5 rounded-full border-2 border-amber-400" aria-hidden />
      <span className="text-[11px] font-medium text-amber-600">Pending</span>
    </div>
  )
}

function isEliComplete(p: EmailProperty) {
  const contracted = (["leasing", "maintenance", "payments", "renewals"] as const).filter(
    (k) => p[k] !== "na",
  )
  return contracted.length > 0 && contracted.every((k) => p[k] === "done")
}


interface Props { navigate: (to: PageId) => void }

export function EmailPage({ navigate }: Props) {
  const [page, setPage] = useState(0)

  const totalPages = Math.ceil(PROPERTIES.length / PAGE_SIZE)
  const paged = PROPERTIES.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const completeCount = PROPERTIES.filter(isEliComplete).length

  const start = page * PAGE_SIZE + 1
  const end = Math.min((page + 1) * PAGE_SIZE, PROPERTIES.length)

  return (
    <div className="p-6 md:p-8 flex gap-8 items-start">
    {/* ── Main content ─────────────────────────────────────────────────── */}
    <div className="flex-1 min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Setup Email Integration for Communications</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-6xl">
          Configure email address integrations for ELI+ AI services and the centralized Communication Inbox. Connect custom email addresses so automated and staff-managed conversations are sent from your own domain, ensuring residents receive messages from a familiar, branded address.
        </p>
      </div>

      {/* Status card */}
      <div className="rounded-xl border border-border bg-white overflow-hidden">
        {/* Card header */}
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border">
          <div>
            <p className="text-sm font-semibold">Status of Custom Email Integration</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              All contracted ELI+ AI service email integrations must be completed for each property before they can operate within the new Communications Inbox. Entrata Email is optional and not required for ELI+ activation. Services marked N/A are not contracted for that property.
            </p>
          </div>
          <span className="shrink-0 inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 whitespace-nowrap">
            {completeCount}/{PROPERTIES.length} ELI+ Complete
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground w-44">Property</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-44">Connected Email</th>
                {[
                  { label: "Leasing AI",       sub: "Required" },
                  { label: "Maintenance AI",   sub: "Required" },
                  { label: "Payments AI",      sub: "Required" },
                  { label: "Renewals AI",      sub: "Required" },
                  { label: "Entrata Email",    sub: "Optional" },
                ].map(({ label, sub }) => (
                  <th key={label} className="text-center px-3 py-3 text-xs font-medium text-muted-foreground">
                    <div>{label}</div>
                    <div className="text-[10px] font-normal text-muted-foreground/70">{sub}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.map((prop) => (
                <tr key={prop.id} className="bg-white hover:bg-zinc-50 transition-colors">
                  <td className="px-5 py-4 font-semibold text-sm">{prop.name}</td>
                  <td className="px-4 py-4 text-xs text-muted-foreground">
                    {prop.connectedEmail
                      ? <span className="truncate max-w-[140px] inline-block" title={prop.connectedEmail}>{prop.connectedEmail.length > 22 ? prop.connectedEmail.slice(0, 20) + "…" : prop.connectedEmail}</span>
                      : <span>—</span>}
                  </td>
                  <td className="px-3 py-4 text-center"><StatusCell status={prop.leasing} /></td>
                  <td className="px-3 py-4 text-center"><StatusCell status={prop.maintenance} /></td>
                  <td className="px-3 py-4 text-center"><StatusCell status={prop.payments} /></td>
                  <td className="px-3 py-4 text-center"><StatusCell status={prop.renewals} /></td>
                  <td className="px-3 py-4 text-center"><StatusCell status={prop.entrataEmail} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-white">
          <span className="text-xs text-muted-foreground">{start}–{end} of {PROPERTIES.length}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
              className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-medium tabular-nums">{page + 1}/{totalPages}</span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
              className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Email Integration Setup ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-white overflow-hidden">
        <div className="px-5 py-5 border-b border-border">
          <h2 className="text-base font-semibold">Email Integration Setup</h2>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-6xl">
            Set up ELI+ for the new Communication Inbox and Conversation Panel. If you previously configured email integration with Colleen AI Agents, you will need to re-integrate that email address here. If you are setting up ELI+ for the first time, this is where to begin. Each property's AI service may only have one connected email address.
          </p>

          {/* OAuth buttons */}
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              type="button"
              className="inline-flex items-center gap-2.5 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 transition-colors shadow-sm"
            >
              <GoogleIcon />
              Sign in with Google
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2.5 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 transition-colors shadow-sm"
            >
              <MicrosoftIcon />
              Sign in with Microsoft
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2.5 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 transition-colors shadow-sm"
            >
              <Globe className="h-4 w-4 text-muted-foreground" />
              Other Service Providers
            </button>
          </div>
        </div>

        {/* Connected accounts */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Connected Email Addresses</h3>
            <span className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700">
              {CONNECTED_ACCOUNTS.length} connected
            </span>
          </div>

          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            {CONNECTED_ACCOUNTS.map((acct) => (
              <div key={acct.id} className="px-4 py-3 bg-white">
                {/* Top row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{acct.email}</span>
                    <ProviderLabel provider={acct.provider} />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" className="text-muted-foreground hover:text-red-500 transition-colors" aria-label="Remove">
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* IMAP/SMTP config badges */}
                {acct.provider === "imap" && (
                  <div className="flex items-center justify-between mt-1.5 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <ConfigBadge label="IMAP Configured" ok={acct.imapConfigured ?? false} />
                      <ConfigBadge label="SMTP Configured" ok={acct.smtpConfigured ?? false} />
                    </div>
                    {acct.verified && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-600">
                        <CheckCircle2 className="h-3 w-3" aria-hidden />
                        Verified
                      </span>
                    )}
                  </div>
                )}

                {/* Properties + service type */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Properties:</span>
                  {acct.properties.map((p) => (
                    <span key={p} className="inline-flex items-center rounded border border-border bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-foreground">
                      {p}
                    </span>
                  ))}
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground ml-2">Service Types:</span>
                  <ServiceChip label={acct.serviceType} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    </div>
  )
}
