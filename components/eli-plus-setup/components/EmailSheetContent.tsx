"use client"

import { useState } from "react"
import { CheckCircle2, ChevronLeft, ChevronRight, Globe } from "lucide-react"
import { cn } from "@/lib/utils"

type EmailProvider = "google" | "microsoft" | "imap"
type ServiceStatus = "done" | "pending" | "na"

interface EmailProperty {
  id: string
  name: string
  connectedEmail: string | null
  leasing: ServiceStatus
  maintenance: ServiceStatus
  payments: ServiceStatus
  renewals: ServiceStatus
}

const PROPERTIES: EmailProperty[] = [
  { id: "p1",  name: "Harvest Peak Capital",  connectedEmail: null,                    leasing: "pending", maintenance: "pending", payments: "pending", renewals: "pending" },
  { id: "p2",  name: "Skyline Apartments",     connectedEmail: "spidyamit@zohomail.com", leasing: "done",    maintenance: "pending", payments: "pending", renewals: "pending" },
  { id: "p3",  name: "The Meridian",           connectedEmail: null,                    leasing: "pending", maintenance: "pending", payments: "pending", renewals: "na"      },
  { id: "p4",  name: "Azure Heights",          connectedEmail: "test1@gmail.com",        leasing: "done",    maintenance: "pending", payments: "na",      renewals: "na"      },
  { id: "p5",  name: "Cambridge Suites",       connectedEmail: "test2@gmail.com",        leasing: "pending", maintenance: "na",      payments: "done",    renewals: "pending" },
  { id: "p6",  name: "Sunset Ridge",           connectedEmail: null,                    leasing: "pending", maintenance: "pending", payments: "pending", renewals: "pending" },
  { id: "p7",  name: "Harbor View",            connectedEmail: null,                    leasing: "pending", maintenance: "na",      payments: "pending", renewals: "na"      },
  { id: "p8",  name: "Maple Commons",          connectedEmail: "maple@mgmt.com",         leasing: "done",    maintenance: "done",    payments: "pending", renewals: "na"      },
  { id: "p9",  name: "The Edison",             connectedEmail: null,                    leasing: "pending", maintenance: "pending", payments: "na",      renewals: "pending" },
  { id: "p10", name: "Parkside Lofts",         connectedEmail: "parkside@mgmt.com",      leasing: "done",    maintenance: "pending", payments: "done",    renewals: "done"    },
  { id: "p11", name: "River North Plaza",      connectedEmail: null,                    leasing: "pending", maintenance: "na",      payments: "pending", renewals: "na"      },
  { id: "p12", name: "Cedar Glen",             connectedEmail: null,                    leasing: "pending", maintenance: "pending", payments: "pending", renewals: "pending" },
  { id: "p13", name: "Oakwood Terrace",        connectedEmail: "oakwood@rentals.com",    leasing: "done",    maintenance: "pending", payments: "na",      renewals: "pending" },
  { id: "p14", name: "Lakeside Villas",        connectedEmail: null,                    leasing: "pending", maintenance: "na",      payments: "pending", renewals: "na"      },
  { id: "p15", name: "Metro 1200",             connectedEmail: "metro@mgmt.com",         leasing: "done",    maintenance: "done",    payments: "pending", renewals: "done"    },
  { id: "p16", name: "Summit Pointe",          connectedEmail: null,                    leasing: "pending", maintenance: "pending", payments: "pending", renewals: "pending" },
]

const PAGE_SIZE = 6

function isEliComplete(p: EmailProperty) {
  const contracted = (["leasing", "maintenance", "payments", "renewals"] as const).filter((k) => p[k] !== "na")
  return contracted.length > 0 && contracted.every((k) => p[k] === "done")
}

function ProviderDot({ provider }: { provider: EmailProvider }) {
  if (provider === "google") return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
  if (provider === "microsoft") return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" aria-hidden>
      <path fill="#F25022" d="M1 1h10v10H1z"/>
      <path fill="#7FBA00" d="M13 1h10v10H13z"/>
      <path fill="#00A4EF" d="M1 13h10v10H1z"/>
      <path fill="#FFB900" d="M13 13h10v10H13z"/>
    </svg>
  )
  return <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
}

function StatusDot({ status }: { status: ServiceStatus }) {
  if (status === "na") return <span className="text-[10px] text-muted-foreground">N/A</span>
  if (status === "done") return <CheckCircle2 className="h-4 w-4 text-teal-500 mx-auto" aria-hidden />
  return <div className="h-4 w-4 rounded-full border-2 border-amber-400 mx-auto" aria-hidden />
}

function getProvider(email: string): EmailProvider {
  if (email.includes("gmail")) return "google"
  if (email.includes("outlook") || email.includes("hotmail") || email.includes("microsoft")) return "microsoft"
  return "imap"
}

interface Props { alreadyComplete: boolean }

export function EmailSheetContent({ alreadyComplete }: Props) {
  const [page, setPage] = useState(0)
  const totalPages = Math.ceil(PROPERTIES.length / PAGE_SIZE)
  const paged = PROPERTIES.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const connectedCount = PROPERTIES.filter((p) => p.connectedEmail !== null).length
  const completeCount = PROPERTIES.filter(isEliComplete).length

  if (alreadyComplete) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-emerald-900">Email integration confirmed</p>
          <p className="text-xs text-emerald-700 mt-0.5">All properties have been reviewed and email connections are in progress.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          {connectedCount}/{PROPERTIES.length} email addresses connected
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
          <CheckCircle2 className="h-3 w-3" />
          {completeCount}/{PROPERTIES.length} ELI+ complete
        </span>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Connect email addresses for each property so ELI+ can send automated and staff-managed messages from your own domain. All contracted AI services must be configured before go-live.
      </p>

      {/* Property table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-zinc-50">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Property</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Email</th>
              <th className="text-center px-2 py-2 font-medium text-muted-foreground">Leasing</th>
              <th className="text-center px-2 py-2 font-medium text-muted-foreground">Maint.</th>
              <th className="text-center px-2 py-2 font-medium text-muted-foreground">Payments</th>
              <th className="text-center px-2 py-2 font-medium text-muted-foreground">Renewals</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paged.map((p) => (
              <tr key={p.id} className={cn("transition-colors", isEliComplete(p) ? "bg-teal-50/40" : "bg-white hover:bg-zinc-50")}>
                <td className="px-3 py-2.5 font-medium text-foreground leading-tight">{p.name}</td>
                <td className="px-3 py-2.5">
                  {p.connectedEmail ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-foreground">
                      <ProviderDot provider={getProvider(p.connectedEmail)} />
                      <span className="truncate max-w-[120px]">{p.connectedEmail}</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground italic">Not connected</span>
                  )}
                </td>
                <td className="px-2 py-2.5 text-center"><StatusDot status={p.leasing} /></td>
                <td className="px-2 py-2.5 text-center"><StatusDot status={p.maintenance} /></td>
                <td className="px-2 py-2.5 text-center"><StatusDot status={p.payments} /></td>
                <td className="px-2 py-2.5 text-center"><StatusDot status={p.renewals} /></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-zinc-50">
            <span className="text-[11px] text-muted-foreground">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, PROPERTIES.length)} of {PROPERTIES.length}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
