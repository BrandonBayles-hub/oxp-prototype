export type AdoptionStatus = "strong" | "watch" | "needs_coaching" | "at_risk"

export type AdoptionRole = "agent" | "property_manager" | "regional_manager" | "corporate_admin" | "executive"

export type ViewState = "normal" | "loading" | "error" | "empty" | "success" | "warning"

export interface AdoptionMetrics {
  adoptionScore: number
  adoptionStatus: AdoptionStatus
  adoptionScoreDelta: number
  humanFollowUpRate: number
  humanFollowUpRateDelta: number
  humanFollowUpRateSlaTarget: number
  taskCompletionRate: number
  taskCompletionRateDelta: number
  taskCompletionRateSlaTarget: number
  medianTimeToFirstActionHrs: number
  medianTimeToFirstActionSlaHrs: number
  medianTimeToFirstActionDelta: number
  agentAssistedProspects: number
  totalActiveProspects: number
  agentAssistedProspectRate: number
  emailsSent: number
  emailsSentDelta: number
  smsSent: number
  smsSentDelta: number
  callsDialed: number
  callsDialedDelta: number
  callsConnected: number
  overdueTaskCount: number
  overdueTaskCountDelta: number
  aiGeneratedTasksCompleted: number
  aiGeneratedTasksAssigned: number
  conversationsTouched: number
  totalActiveConversations: number
  agentTouchedConversationRate: number
  activeUsageDays: number
  totalPossibleDays: number
}

export interface OutboundTrendPoint {
  date: string
  emails?: number
  sms?: number
  calls?: number
  followUpRate?: number
  slaTarget?: number
}

export interface TaskAgingBucket {
  label: string
  count: number
  color: "warning" | "error"
}

export interface PropertyAdoptionRow {
  propertyId: string
  propertyName: string
  region: string
  agentCount: number
  adoptionScore: number
  adoptionStatus: AdoptionStatus
  humanFollowUpRate: number
  taskCompletionRate: number
  medianTimeHrs: number
  agentAssistedProspects: number
  emailsSent: number
  smsSent: number
  callsDialed: number
  overdueTaskCount: number
  activeUsers: number
}

export interface AgentAdoptionRow {
  agentId: string
  agentName: string
  propertyName: string
  adoptionScore: number
  adoptionStatus: AdoptionStatus
  activeUsageDays: number
  prospectsAssisted: number
  conversationsTouched: number
  emailsSent: number
  smsSent: number
  callsDialed: number
  tasksCompleted: number
  overdueTaskCount: number
  medianTimeHrs: number
}

export interface StaleHandoff {
  handoffId: string
  conversationId: string
  prospectName: string
  propertyName: string
  handoffReason: string
  hoursStale: number
  assignedAgent: string
}
