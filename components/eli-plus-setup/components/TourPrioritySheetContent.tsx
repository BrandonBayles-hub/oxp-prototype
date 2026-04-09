"use client"

import { useState } from "react"
import { GripVertical, Users, MapPin, Video, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export interface TourType {
  id: string
  label: string
  description: string
  icon: React.ElementType
}

export const TOUR_TYPES: TourType[] = [
  { id: "agent",       label: "Agent Tour",       description: "Guided tour led by a leasing agent", icon: Users },
  { id: "self-guided", label: "Self-Guided Tour",  description: "Resident explores independently with access code", icon: MapPin },
  { id: "virtual",     label: "Virtual Tour",      description: "Remote tour via video or 3D walkthrough", icon: Video },
]

export const DEFAULT_TOUR_PRIORITY = ["agent", "self-guided", "virtual"]

interface Props {
  priority: string[]
  onChange: (priority: string[]) => void
  onValidChange: (valid: boolean) => void
}

export function TourPrioritySheetContent({ priority, onChange, onValidChange }: Props) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  onValidChange(true)

  function handleDragStart(id: string) {
    setDraggedId(id)
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault()
    if (id !== draggedId) setDragOverId(id)
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) return
    const newOrder = [...priority]
    const fromIdx = newOrder.indexOf(draggedId)
    const toIdx = newOrder.indexOf(targetId)
    newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, draggedId)
    onChange(newOrder)
    setDraggedId(null)
    setDragOverId(null)
  }

  function handleDragEnd() {
    setDraggedId(null)
    setDragOverId(null)
  }

  const isDefault = JSON.stringify(priority) === JSON.stringify(DEFAULT_TOUR_PRIORITY)

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" aria-hidden />
        <p className="text-xs text-blue-900 leading-relaxed">
          <strong>Default applied: Agent → Self-Guided → Virtual.</strong> When a prospect is eligible for multiple tour types, ELI recommends them in this order. Drag to change the priority.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Priority Order</p>
          {isDefault && (
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
              <Sparkles className="h-2.5 w-2.5" aria-hidden />
              Default Applied
            </span>
          )}
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          {priority.map((id, idx) => {
            const type = TOUR_TYPES.find((t) => t.id === id)
            if (!type) return null
            const Icon = type.icon
            const isDragging = draggedId === id
            const isDragOver = dragOverId === id
            return (
              <div
                key={id}
                draggable
                onDragStart={() => handleDragStart(id)}
                onDragOver={(e) => handleDragOver(e, id)}
                onDrop={(e) => handleDrop(e, id)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "flex items-center gap-3 px-4 py-4 border-b border-border last:border-0 cursor-grab active:cursor-grabbing select-none transition-colors",
                  isDragging ? "opacity-40 bg-zinc-50" : "bg-white",
                  isDragOver && !isDragging ? "bg-blue-50 border-l-2 border-l-blue-400" : "",
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
        <p className="text-xs text-muted-foreground">Drag rows to reorder. This applies portfolio-wide.</p>
      </div>
    </div>
  )
}
