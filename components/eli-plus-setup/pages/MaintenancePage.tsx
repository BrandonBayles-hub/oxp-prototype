"use client"

import type { PageId } from "../index"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowLeft } from "lucide-react"

interface Props {
  navigate: (to: PageId) => void
  showToast: (message: string) => void
  duringPhones: Record<string, string>
  onDuringPhoneChange: (id: string, val: string) => void
  afterPhones: Record<string, string>
  onAfterPhoneChange: (id: string, val: string) => void
}

export function MaintenancePage({ navigate }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 md:px-8 pt-6 pb-4 border-b border-border">
        <h1 className="text-2xl font-bold tracking-tight">Maintenance AI</h1>
        <p className="text-sm text-muted-foreground mt-1">Escalation phone routing per property.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 md:px-8 py-10">
        <h2 className="text-xl font-semibold text-foreground">Coming Soon</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-prose">
          Hello! We are currently migrating your settings to OXP. In the meantime, you can still manage your updates{" "}
          <a
            href="https://entrata.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            here
          </a>
          .
        </p>
      </div>
    </div>
  )
}
