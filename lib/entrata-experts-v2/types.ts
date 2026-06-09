export type LensId =
  | "auto"
  | "leasing"
  | "renewals"
  | "payments"
  | "maintenance"
  | "accounting"
  | "portfolio";

export type Depth = "auto" | "fast" | "reasoning";

// "auto" + the legacy curated ids are kept for autocomplete and back-compat.
// Live selections from the LiteLLM /models catalog use their raw proxy id, so
// any string is also accepted — the `(string & {})` preserves literal hints.
export type ModelId =
  | "auto"
  | "opus-4-7"
  | "gpt-5-5"
  | "kimi-k2-5"
  | (string & {});

export type RoleId =
  | "vp-ops"
  | "regional"
  | "onsite-pm"
  | "asset-mgr"
  | "accounting";

export type ScopeKind =
  | "portfolio"
  | "region"
  | "property"
  | "group"
  | "segment"
  | "custom";

/**
 * One discrete selection inside a (possibly multi-pick) scope.
 *
 * In the multi-select picker, the user can combine selections of *different*
 * kinds (e.g. "Southeast region + Sun Devil property"). Each click adds one
 * ScopeSelection; the composed Scope carries the full list.
 */
export interface ScopeSelection {
  kind: "portfolio" | "region" | "property" | "group" | "segment";
  id: string;
  label: string;
}

export interface Scope {
  /**
   * Coarse kind for display + analytics.
   * - "portfolio" — default / nothing else selected
   * - "region" | "property" | "group" | "segment" — exactly one selection of that kind
   * - "custom"   — multiple selections (possibly mixed kinds)
   */
  kind: ScopeKind;
  /**
   * Stable id. For single-selection scopes this is the selection's own id.
   * For "custom" multi-selection scopes this is a synthetic key
   * ("custom:<comma-joined-ids>") used for caching and equality checks.
   */
  id: string;
  /** Human-readable label rendered on the picker trigger and message bubbles. */
  label: string;
  /** Legacy hint, preserved for older message records. */
  segment?: string;
  /** Full selection list. Empty / undefined ⇒ whole portfolio. */
  selections?: ScopeSelection[];
  /** Pre-resolved, deduplicated property ids covered by this scope. */
  propertyIds?: string[];
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

/**
 * A condensed, parameterized prompt the user can re-run on demand from chat
 * (via the `/insight-name` slash command) or hand off to the Analytics
 * Platform (as a new dashboard, a packet entry, or — once AP exposes the
 * readable endpoint — added to an existing dashboard).
 *
 * Saved Insights are *not* dashboards. They re-run the original ask against
 * the live model with the original lens/depth/model/scope every time, so the
 * answer is always fresh. `lastResult` is just an optional preview cache —
 * the source of truth is the prompt + params.
 */
export interface SavedInsight {
  id: string;
  /** URL- and command-safe slug used by the `/insight-name` form. */
  slug: string;
  name: string;
  prompt: string;
  lens: LensId;
  depth: Depth;
  model: ModelId;
  scope: Scope;
  /** Where this insight was created (chat artifact vs. admin graduation). */
  source: "chat" | "admin";
  createdAt: string;
  updatedAt: string;
  /** Optional cached preview of the most recent run (display-only). */
  lastResult?: Artifact[];
}
