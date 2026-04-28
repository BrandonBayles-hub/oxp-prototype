"use client"

import { useEffect, useState } from "react"
import { buttonVariants } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { ScrollText } from "lucide-react"

// ── Storage helpers ──────────────────────────────────────────────────────────
// Versioned record so legal can bump the disclaimer text and force a re-ack.
// Real implementation would persist to a backend audit log keyed by user_id.

export interface LegalAckRecord {
  acknowledged: true
  version: string
  timestamp: string // ISO
}

export function readAck(storageKey: string): LegalAckRecord | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as LegalAckRecord
    if (parsed?.acknowledged && parsed.version && parsed.timestamp) return parsed
    return null
  } catch {
    return null
  }
}

export function writeAck(storageKey: string, version: string): LegalAckRecord {
  const record: LegalAckRecord = {
    acknowledged: true,
    version,
    timestamp: new Date().toISOString(),
  }
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(record))
    } catch {
      // localStorage unavailable — silently no-op; real backend would handle this
    }
  }
  return record
}

export function readValidAck(
  storageKey: string,
  version: string,
): LegalAckRecord | null {
  const record = readAck(storageKey)
  if (!record) return null
  if (record.version !== version) return null
  return record
}

// ── Hook (shared) ────────────────────────────────────────────────────────────

const ACK_EVENT = "legal-ack:updated"

export function useLegalAck(storageKey: string, version: string) {
  const [record, setRecord] = useState<LegalAckRecord | null>(null)

  useEffect(() => {
    setRecord(readValidAck(storageKey, version))
  }, [storageKey, version])

  useEffect(() => {
    if (typeof window === "undefined") return
    function handler(e: Event) {
      const detail = (e as CustomEvent<{ key: string }>).detail
      if (detail?.key === storageKey) {
        setRecord(readValidAck(storageKey, version))
      }
    }
    window.addEventListener(ACK_EVENT, handler)
    return () => window.removeEventListener(ACK_EVENT, handler)
  }, [storageKey, version])

  function acknowledge(): LegalAckRecord {
    const next = writeAck(storageKey, version)
    setRecord(next)
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(ACK_EVENT, { detail: { key: storageKey } }),
      )
    }
    return next
  }

  return { record, acknowledge }
}

// ── Modal (custom, no Radix) ─────────────────────────────────────────────────

interface LegalAckModalProps {
  open: boolean
  storageKey: string
  version: string
  title?: string
  intro?: string
  paragraphs: string[]
  acknowledgeLabel?: string
  continueLabel?: string
  isUpdate?: boolean
  onAcknowledged: (record: LegalAckRecord) => void
}

export function LegalAckModal({
  open,
  storageKey,
  version,
  title = "Before you continue — read this",
  intro = "This is a one-time acknowledgement. We'll record it so you won't see this again unless the disclaimer changes.",
  paragraphs,
  acknowledgeLabel = "I have read and understood the disclaimer above.",
  continueLabel = "Continue",
  isUpdate = false,
  onAcknowledged,
}: LegalAckModalProps) {
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (open) setChecked(false)
  }, [open, version])

  // Lock body scroll while modal is open (matches TemplateSheet behavior)
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  function handleContinue() {
    if (!checked) return
    const record = writeAck(storageKey, version)
    onAcknowledged(record)
  }

  return (
    <>
      {/* Backdrop — clicks are swallowed (modal is unskippable until ack) */}
      <div
        aria-hidden
        className="fixed inset-0 bg-black/60 z-[200]"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Modal content */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-ack-title"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-[calc(100vw-2rem)] max-w-xl max-h-[min(85vh,42rem)] bg-white rounded-lg shadow-2xl border border-border flex flex-col overflow-hidden"
      >
        <div className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <ScrollText className="h-4 w-4 text-amber-700" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              {isUpdate && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 mb-1">
                  Disclaimer updated · re-acknowledgement required
                </p>
              )}
              <h2
                id="legal-ack-title"
                className="text-base font-semibold leading-snug text-foreground"
              >
                {title}
              </h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {intro}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 flex-1 min-h-0 overflow-y-auto space-y-3 bg-stone-50/40">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-xs text-foreground/90 leading-relaxed">
              {p}
            </p>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-border bg-white space-y-4 shrink-0">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <Checkbox
              checked={checked}
              onCheckedChange={(v) => setChecked(v === true)}
              className="mt-0.5"
              aria-label={acknowledgeLabel}
            />
            <span className="text-sm text-foreground leading-snug">
              {acknowledgeLabel}
            </span>
          </label>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleContinue}
              disabled={!checked}
              className={cn(
                buttonVariants({ variant: "eli", size: "sm" }),
                "disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              {continueLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
