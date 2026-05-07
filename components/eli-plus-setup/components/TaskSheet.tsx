"use client"

import { useEffect } from "react"
import { X } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface TaskSheetProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  onSave: () => void
  saveLabel?: string
  saveDisabled?: boolean
  hideFooter?: boolean
  children: React.ReactNode
}

export function TaskSheet({ open, title, description, onClose, onSave, saveLabel = "Confirm & Save", saveDisabled = false, hideFooter = false, children }: TaskSheetProps) {
  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 bg-black/25 z-40 transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      />

      {/* Sheet panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "fixed top-0 right-0 h-full w-full max-w-[680px] bg-background z-50 flex flex-col",
          "transition-transform duration-250 ease-in-out",
          open ? "translate-x-0 shadow-2xl" : "translate-x-full shadow-none",
        )}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">{title}</h2>
              {description && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close without saving"
              className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {children}
        </div>

        {/* Footer */}
        {!hideFooter && (
        <div className="shrink-0 border-t border-border px-6 py-4 flex items-center justify-between bg-background">
          <button
            type="button"
            onClick={onClose}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saveDisabled}
            className={cn(buttonVariants({ variant: "eli" }), saveDisabled && "opacity-40 cursor-not-allowed")}
          >
            {saveLabel}
          </button>
        </div>
        )}
      </div>
    </>
  )
}
