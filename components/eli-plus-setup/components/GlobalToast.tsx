"use client"

import { cn } from "@/lib/utils"
import { CheckCircle2 } from "lucide-react"

interface ToastProps { message: string; visible: boolean }

export function GlobalToast({ message, visible }: ToastProps) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 rounded-xl border border-emerald-200 bg-white px-5 py-3.5 shadow-xl w-max max-w-sm transition-all duration-300",
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none",
      )}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" aria-hidden />
      </span>
      <p className="text-sm font-medium text-foreground leading-snug">{message}</p>
    </div>
  )
}
