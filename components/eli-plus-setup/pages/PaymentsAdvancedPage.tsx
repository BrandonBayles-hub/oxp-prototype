"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { PageId } from "../index"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { buildSettingRows, type PropertySettingRow } from "../data/mock"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"

const PAGE_SIZE = 8

interface Props { navigate: (to: PageId) => void }

export function PaymentsAdvancedPage({ navigate }: Props) {
  const allRows = useMemo(() => buildSettingRows(), [])
  const [rows, setRows] = useState<PropertySettingRow[]>(allRows)
  const [dirty, setDirty] = useState(false)
  const [page, setPage] = useState(0)
  const [q, setQ] = useState("")
  const [filter, setFilter] = useState<"all" | "needs_input">("needs_input")

  const filtered = useMemo(() => {
    let r = rows
    if (filter === "needs_input") r = r.filter((x) => x.status === "needs_input")
    if (q.trim()) {
      const s = q.toLowerCase()
      r = r.filter(
        (x) =>
          x.propertyName.toLowerCase().includes(s) ||
          x.setting.toLowerCase().includes(s) ||
          x.city.toLowerCase().includes(s),
      )
    }
    return r
  }, [rows, q, filter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageSafe = Math.min(page, totalPages - 1)
  const slice = filtered.slice(pageSafe * PAGE_SIZE, pageSafe * PAGE_SIZE + PAGE_SIZE)

  const updateValue = useCallback((id: string, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, value, status: value && value !== "—" ? "applied" : "needs_input" } : r)))
    setDirty(true)
  }, [])

  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [dirty])

  const handleNavigate = (to: PageId) => {
    if (dirty && !window.confirm("You have unsaved changes. Leave without saving?")) return
    navigate(to)
  }

  const save = () => setDirty(false)

  return (
    <div className="flex flex-col min-h-[calc(100vh-10rem)]">
      <div className="p-4 md:px-6 border-b border-border bg-muted/20 space-y-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <button type="button" onClick={() => handleNavigate("payments")} className="hover:text-foreground transition-colors">Payments AI</button>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Advanced settings</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Advanced — Payments AI</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Edit individual property settings, search, filter, and save changes in bulk.
            </p>
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">
            {filtered.length} rows · {rows.filter((r) => r.status === "needs_input").length} need input
          </p>
        </div>
      </div>

      <div className="p-4 md:px-6 flex flex-wrap gap-3 border-b border-border bg-background">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            placeholder="Search property, city, setting…"
            className="pl-9"
            value={q}
            onChange={(e) => { setPage(0); setQ(e.target.value) }}
          />
        </div>
        <Select value={filter} onValueChange={(v) => { setFilter(v as "all" | "needs_input"); setPage(0) }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="needs_input">Needs input only</SelectItem>
            <SelectItem value="all">All rows</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-auto p-4 md:px-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Setting</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Value</TableHead>
              <TableHead className="hidden lg:table-cell">Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.propertyName}</TableCell>
                <TableCell className="text-muted-foreground">{r.city}</TableCell>
                <TableCell className="max-w-[200px]">{r.setting}</TableCell>
                <TableCell>
                  {r.status === "needs_input" ? (
                    <Badge variant="yellow">Needs input</Badge>
                  ) : r.status === "verified" ? (
                    <Badge variant="green">Verified</Badge>
                  ) : (
                    <Badge variant="gray">Applied</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    className="h-8 max-w-[140px]"
                    value={r.value === "—" ? "" : r.value}
                    placeholder="—"
                    onChange={(e) => updateValue(r.id, e.target.value || "—")}
                  />
                </TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{r.source}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="sticky bottom-0 border-t border-border bg-background px-4 md:px-6 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button type="button" variant="outline" size="sm" disabled={pageSafe <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <span className="tabular-nums text-xs">Page {pageSafe + 1} of {totalPages} · {slice.length} of {filtered.length}</span>
          <Button type="button" variant="outline" size="sm" disabled={pageSafe >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={!dirty} onClick={() => { setRows(allRows); setDirty(false); setPage(0) }}>
            Discard
          </Button>
          <Button type="button" variant="default" disabled={!dirty} onClick={save}>
            Save changes
          </Button>
        </div>
      </div>
    </div>
  )
}
