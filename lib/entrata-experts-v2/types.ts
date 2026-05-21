export type LensId =
  | "auto"
  | "leasing"
  | "renewals"
  | "payments"
  | "maintenance"
  | "accounting"
  | "portfolio";

export type Depth = "auto" | "fast" | "reasoning";

export type ModelId = "auto" | "opus-4-7" | "gpt-5-5" | "kimi-k2-5" | "entrata-tuned";

export type RoleId =
  | "vp-ops"
  | "regional"
  | "onsite-pm"
  | "asset-mgr"
  | "accounting";

export type ScopeKind = "portfolio" | "region" | "property";

export interface Scope {
  kind: ScopeKind;
  id: string;
  label: string;
  segment?: string;
}

export interface Citation {
  id: string;
  label: string;
  source: string;
  type: "report" | "ledger" | "work-order" | "lease" | "nps" | "ticket" | "policy";
  deeplink?: string;
}

export type ArtifactKind =
  | "table"
  | "bar-chart"
  | "line-chart"
  | "kpi-strip"
  | "draft-email";

export interface Artifact {
  id: string;
  kind: ArtifactKind;
  title: string;
  subtitle?: string;
  columns?: string[];
  rows?: (string | number)[][];
  series?: { name: string; data: { x: string; y: number }[] }[];
  kpis?: { label: string; value: string; delta?: string; tone?: "good" | "warn" | "alert" | "info" }[];
  emailTo?: string;
  emailSubject?: string;
  emailBody?: string;
}

export interface TraceStep {
  label: string;
  detail?: string;
  durationMs?: number;
  cited?: string[];
}

export interface AssistantMessage {
  id: string;
  role: "assistant";
  body: string;
  lens: LensId;
  depth: Depth;
  model: ModelId;
  scope: Scope;
  citations: Citation[];
  artifacts: Artifact[];
  trace: TraceStep[];
  confidence: "high" | "medium" | "low";
  followUps: string[];
  outcome: "answered" | "low-confidence" | "refused" | "escalated";
  rating?: "up" | "down";
  createdAt: string;
}

export interface UserMessage {
  id: string;
  role: "user";
  body: string;
  createdAt: string;
}

export type Message = UserMessage | AssistantMessage;

/**
 * Resolution of a multi-turn session, computed at generation time.
 *
 * - resolved:  user got an answer they didn't reject and didn't escalate
 * - abandoned: thread ended with refusal, low-confidence, or thumbs-down
 *              and the user didn't follow up (gave up)
 * - escalated: at least one assistant turn marked outcome === "escalated"
 * - ongoing:   the most recent message is from the user (waiting on AI)
 */
export type Resolution = "resolved" | "abandoned" | "escalated" | "ongoing";

export interface Conversation {
  id: string;
  title: string;
  userId: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  /** primary intent classification (intent of the first user turn) */
  intent: string;
  /** lens used (most-recent assistant message) */
  lens: LensId;

  // ---------------------------------------------------------------------------
  // Session-level rollups (added when sessions can span multiple turns).
  // Computed at generation time from messages[]. Always derivable, but cached
  // here so the Activity Log doesn't have to recompute on every render.
  // ---------------------------------------------------------------------------

  /** Number of *user* turns in the session (≥ 1). */
  turnCount: number;
  /** Wall-clock duration in ms from first user turn to last assistant reply. */
  durationMs: number;
  /** Final session disposition. See Resolution doc. */
  resolution: Resolution;
  /** All distinct lenses observed across assistant turns (in order of first use). */
  lensesUsed: LensId[];
  /** All distinct scope labels observed across assistant turns. */
  scopesUsed: string[];
  /** Rating on the *final* assistant turn (the one that matters most for sentiment). */
  finalRating?: "up" | "down";
  /** True if any assistant turn got 👎. */
  everDownvoted: boolean;
  /** True if any assistant turn ended in outcome === "refused". */
  everRefused: boolean;
  /** True if any assistant turn ended in outcome === "escalated". */
  everEscalated: boolean;
  /** True if first turn was 👍 but final turn was 👎 (signal of degradation). */
  regressed: boolean;
}

export interface Employee {
  id: string;
  name: string;
  role: RoleId;
  roleLabel: string;
  property?: string;
  region?: string;
  avatarSeed: number;
}

export interface IntentCluster {
  intent: string;
  label: string;
  description: string;
  count: number;
  distinctAskers: number;
  exampleQuestions: string[];
  topLens: LensId;
  deflectionPct: number;
  rating: "good" | "warn" | "alert";
  automationScore: number;
}

export interface KnowledgeGap {
  id: string;
  question: string;
  count: number;
  reason: "low-confidence" | "refused" | "thumbs-down" | "escalated";
  suggestedFix: string;
  affectedRoles: RoleId[];
  exampleAskers: string[];
}

export interface AutomationCandidate {
  id: string;
  pattern: string;
  count: number;
  distinctAskers: number;
  estTimeSavedHrs: number;
  graduateTo: "saved-insight" | "scheduled-digest" | "l3-agent";
  graduateLabel: string;
  example: string;
}
