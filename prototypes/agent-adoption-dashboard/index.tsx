import { useSearchParams } from "react-router-dom"
import { EntrataLayout } from "@sandbox/layouts/EntrataLayout"
import { PageHeader } from "@sandbox-components/composite/PageHeader"
import { usePrototypeControls } from "@sandbox/components/prototype"
import { Badge } from "@sandbox-components/ui/badge"
import { UserCheck } from "lucide-react"

import type { ViewState, AdoptionRole } from "./types"
import { AdoptionView } from "./components/AdoptionView"

const stateOptions = [
  { value: "normal",  label: "Normal" },
  { value: "loading", label: "Loading" },
  { value: "error",   label: "Error" },
  { value: "empty",   label: "Empty" },
]

const roleOptions = [
  { value: "agent",             label: "Agent" },
  { value: "property_manager",  label: "Property Manager" },
  { value: "regional_manager",  label: "Regional Manager (default)" },
  { value: "corporate_admin",   label: "Corporate Admin" },
  { value: "executive",         label: "Executive" },
]

export default function AgentAdoptionDashboard() {
  const [searchParams] = useSearchParams()
  void searchParams

  const { value } = usePrototypeControls({
    groups: [
      {
        key: "viewState",
        label: "Dashboard State",
        defaultValue: "normal",
        options: stateOptions,
      },
      {
        key: "role",
        label: "Role",
        defaultValue: "regional_manager",
        options: roleOptions,
      },
    ],
  })

  const viewState = (value("viewState") as ViewState) || "normal"
  const role = (value("role") as AdoptionRole) || "regional_manager"

  return (
    <EntrataLayout activeTab="Leasing">
      <div className="max-w-7xl mx-auto py-2 space-y-6">
        <PageHeader
          title="Agent Adoption"
          subtitle="Track human engagement, task follow-through, and AI handoff responsiveness"
          actions={
            <Badge variant="outline">
              <UserCheck className="h-3 w-3" />
              DEV-301196
            </Badge>
          }
        />
        <AdoptionView viewState={viewState} role={role} />
      </div>
    </EntrataLayout>
  )
}
