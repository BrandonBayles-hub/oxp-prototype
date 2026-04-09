"use client"

import { useState, useMemo } from "react"
import { Search, ChevronDown } from "lucide-react"
import { PROPERTIES, PROPERTY_GROUPS } from "../data/properties"
import type { Property, PropertyGroup } from "../data/properties"

export type { Property }

interface PropertyFilterProps {
  search: string
  onSearchChange: (v: string) => void
  group: PropertyGroup
  onGroupChange: (g: PropertyGroup) => void
  resultCount: number
  totalCount: number
}

export function PropertyFilter({
  search,
  onSearchChange,
  group,
  onGroupChange,
  resultCount,
  totalCount,
}: PropertyFilterProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[160px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" aria-hidden />
        <input
          type="text"
          placeholder="Search properties…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-8 rounded-lg border border-border bg-white pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
        />
      </div>

      {/* Group picker */}
      <div className="relative">
        <select
          value={group}
          onChange={(e) => onGroupChange(e.target.value as PropertyGroup)}
          className="h-8 appearance-none rounded-lg border border-border bg-white pl-3 pr-9 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
        >
          {PROPERTY_GROUPS.map((g) => (
            <option key={g} value={g}>{g === "All" ? "All Groups" : g}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      </div>

      {/* Result count */}
      {(search || group !== "All") && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {resultCount} of {totalCount}
        </span>
      )}
    </div>
  )
}

/** Hook that owns filter state and returns filtered properties. */
export function usePropertyFilter() {
  const [search, setSearch] = useState("")
  const [group, setGroup] = useState<PropertyGroup>("All")

  const filtered = useMemo<Property[]>(() => {
    let result = PROPERTIES
    if (group !== "All") result = result.filter((p) => p.group === group)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q),
      )
    }
    return result
  }, [search, group])

  return { search, setSearch, group, setGroup, filtered, total: PROPERTIES.length }
}
