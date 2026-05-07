"use client"

import { useState } from "react"
import { GripVertical, Users, MapPin, Video, Sparkles, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { PROPERTIES } from "../data/properties"
import { PropertyFilter, usePropertyFilter } from "./PropertyFilter"

export interface TourType {
  id: string
  label: string
  description: string
  icon: React.ElementType
}

export const TOUR_TYPES: TourType[] = [
  { id: "agent",       label: "Agent Tour",       description: "Guided tour led by a leasing agent",                icon: Users  },
  { id: "self-guided", label: "Self-Guided Tour",  description: "Resident explores independently with access code", icon: MapPin },
  { id: "virtual",     label: "Virtual Tour",      description: "Remote tour via video or 3D walkthrough",          icon: Video  },
]

export const DEFAULT_TOUR_PRIORITY = ["agent", "self-guided", "virtual"]

interface Props {
  priority: Record<string, string[]>
  onChange: (propId: string, priority: string[]) => void
  onValidChange: (valid: boolean) => void
}

function orderLabel(order: string[]) {
  return order
    .map((id, i) => {
      const t = TOUR_TYPES.find(t => t.id === id)
      return t ? `${i + 1}. ${t.label}` : null
    })
    .filter(Boolean)
    .join(" · ")
}

function isDefault(order: string[]) {
  return JSON.stringify(order) === JSON.stringify(DEFAULT_TOUR_PRIORITY)
}

export function TourPrioritySheetContent({ priority, onChange, onValidChange }: Props) {
  onValidChange(true)

  const [selectedPropId, setSelectedPropId] = useState<string>(PROPERTIES[0]?.id ?? "")
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const { search, setSearch, group, setGroup, filtered } = usePropertyFilter()

  const selectedProp = PROPERTIES.find(p => p.id === selectedPropId)
  const currentOrder = priority[selectedPropId] ?? DEFAULT_TOUR_PRIORITY

  function handleDragStart(id: string) { setDraggedId(id) }
  function handleDragEnd() { setDraggedId(null); setDragOverId(null) }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault()
    if (id !== draggedId) setDragOverId(id)
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) return
    const newOrder = [...currentOrder]
    const fromIdx = newOrder.indexOf(draggedId)
    const toIdx = newOrder.indexOf(targetId)
    newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, draggedId)
    onChange(selectedPropId, newOrder)
    setDraggedId(null)
    setDragOverId(null)
  }

  function applyToAll() {
    PROPERTIES.forEach(p => onChange(p.id, [...currentOrder]))
  }

  const customCount = PROPERTIES.filter(p =>
    !isDefault(priority[p.id] ?? DEFAULT_TOUR_PRIORITY)
  ).length

  return (
    <div className="flex h-full min-h-0 divide-x divide-border">

      {/* ── Left: property list ─────────────────────────────────────── */}
      <div className="w-52 shrink-0 flex flex-col">
        <div className="px-3 pt-4 pb-2 space-y-2 border-b border-border">
          <PropertyFilter
            search={search}
            onSearchChange={setSearch}
            group={group}
            onGroupChange={setGroup}
            resultCount={filtered.length}
            totalCount={PROPERTIES.length}
          />
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {filtered.map(prop => {
            const order = priority[prop.id] ?? DEFAULT_TOUR_PRIORITY
            const custom = !isDefault(order)
            const active = prop.id === selectedPropId
            return (
              <button
                key={prop.id}
                type="button"
                onClick={() => setSelectedPropId(prop.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 flex items-center gap-2 transition-colors",
                  active ? "bg-accent" : "hover:bg-accent/60",
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{prop.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {order.map(id => TOUR_TYPES.find(t => t.id === id)?.label.replace(" Tour", "")).join(" → ")}
                  </p>
                </div>
                {custom && (
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                )}
                <ChevronRight className={cn("h-3 w-3 shrink-0 text-muted-foreground", active && "text-foreground")} aria-hidden />
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Right: drag reorder for selected property ───────────────── */}
      <div className="flex-1 flex flex-col p-5 space-y-4 overflow-y-auto">
        {/* Header */}
        <div>
          <p className="text-sm font-semibold text-foreground">{selectedProp?.name ?? "Select a property"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{selectedProp?.city}, {selectedProp?.state}</p>
        </div>

        {/* Default callout */}
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" aria-hidden />
          <p className="text-xs text-blue-900 leading-relaxed">
            When a prospect qualifies for multiple tour types at this property, ELI recommends them in this order.{" "}
            {isDefault(currentOrder) ? <span className="font-semibold">Default applied — Agent → Self-Guided → Virtual.</span> : <span className="font-semibold">Custom order applied.</span>}
          </p>
        </div>

        {/* Drag list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Priority Order</p>
            {!isDefault(currentOrder) && (
              <button
                type="button"
                onClick={() => onChange(selectedPropId, [...DEFAULT_TOUR_PRIORITY])}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Reset to default
              </button>
            )}
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            {currentOrder.map((id, idx) => {
              const type = TOUR_TYPES.find(t => t.id === id)
              if (!type) return null
              const Icon = type.icon
              return (
                <div
                  key={id}
                  draggable
                  onDragStart={() => handleDragStart(id)}
                  onDragOver={(e) => handleDragOver(e, id)}
                  onDrop={(e) => handleDrop(e, id)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-0 cursor-grab active:cursor-grabbing select-none transition-colors",
                    draggedId === id ? "opacity-40 bg-zinc-50" : "bg-white",
                    dragOverId === id && draggedId !== id ? "bg-blue-50 border-l-2 border-l-blue-400" : "",
                  )}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" aria-hidden />
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-zinc-900 text-white text-xs font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <div className="h-8 w-8 rounded-lg border border-border bg-zinc-50 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-zinc-600" aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{type.label}</p>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground">Drag to reorder for this property.</p>
        </div>

        {/* Apply to all */}
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {customCount === 0
              ? "All properties using the default order."
              : `${customCount} ${customCount === 1 ? "property has" : "properties have"} a custom order.`}
          </p>
          <button
            type="button"
            onClick={applyToAll}
            className="text-xs font-medium text-foreground hover:underline underline-offset-2 transition-colors whitespace-nowrap"
          >
            Apply this order to all properties
          </button>
        </div>
      </div>

    </div>
  )
}
