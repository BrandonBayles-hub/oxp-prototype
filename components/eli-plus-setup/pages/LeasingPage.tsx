"use client"

import type { PageId } from "../index"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowLeft } from "lucide-react"
import type { TourPropertySettings } from "../components/TourTypesSheetContent"
import type { LeasingPoliciesState } from "../components/LeasingPoliciesSheetContent"

interface Props {
  navigate: (to: PageId) => void
  showToast: (message: string) => void
  agentGoals: Record<string, string>
  onAgentGoalChange: (id: string, val: string) => void
  modelUnits: Record<string, string>
  onModelUnitChange: (id: string, val: string) => void
  tourSettings: Record<string, TourPropertySettings>
  onTourSettingChange: (id: string, field: keyof TourPropertySettings, val: string | boolean) => void
  tourPriority: Record<string, string[]>
  onTourPriorityChange: (propId: string, priority: string[]) => void
  leasingPolicies: LeasingPoliciesState
  onLeasingPolicyChange: (policyId: string, propertyId: string, val: string) => void
  campusProximity: Record<string, string>
  onCampusProximityChange: (id: string, val: string) => void
  studySpaces: Record<string, string>
  onStudySpacesChange: (id: string, val: string) => void
  semesterLeases: Record<string, string>
  onSemesterLeasesChange: (id: string, val: string) => void
  immediateMovein: Record<string, string>
  onImmediateMoveinChange: (id: string, val: string) => void
}

export function LeasingPage({ navigate }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 md:px-8 pt-6 pb-4 border-b border-border">
        <h1 className="text-2xl font-bold tracking-tight">Leasing AI</h1>
        <p className="text-sm text-muted-foreground mt-1">AI-powered leasing settings and tour configuration.</p>
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
