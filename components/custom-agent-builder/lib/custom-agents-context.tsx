"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PMC_NAME, PMC_PROPERTIES } from "./pmc-identity";
import { EVENT_CATALOG, TIME_FREQUENCIES } from "./custom-agents-catalog";
import type { TimeFrequency } from "./custom-agents-catalog";
import { compileAgent } from "./custom-agents-compiler";
import { estimateCost, type CostEstimate } from "./custom-agents-cost";
import { buildMigratedAgents } from "./custom-agents-migrated";
import { forkFromEntrataAgent } from "./custom-agents-forking";
import type { Agent as NativeAgent } from "./agents-context";

// Re-export from the standalone module so call-sites can still import
// CUSTOM_AGENTS_STORAGE_KEY from here if they already depend on the context.
// Lightweight consumers should import from `./custom-agents-storage` directly
// to avoid pulling the whole provider into their bundle.
export { CUSTOM_AGENTS_STORAGE_KEY } from "./custom-agents-storage";
import { CUSTOM_AGENTS_STORAGE_KEY as STORAGE_KEY_CONST } from "./custom-agents-storage";
const STORAGE_KEY = STORAGE_KEY_CONST;

export type Lifecycle =
  | "draft"
  | "setting_up"
  | "dry_run"
  | "live"
  | "paused"
  | "error";

export type TriggerScheduleFreq = TimeFrequency;

export type Trigger =
  | {
      id: string;
      kind: "schedule";
      frequency: TriggerScheduleFreq;
      /** HH:MM in 24h format. Applies to daily, weekly, monthly, annually, once. */
      timeOfDay?: string;
      /** "mon" | "tue" | ... | "sun". Applies to weekly. */
      dayOfWeek?: string;
      /** 1–28, or -1 for "last day of month". Applies to monthly. */
      dayOfMonth?: number;
      /** 1–12. Applies to annually. */
      monthOfYear?: number;
      /** ISO date (YYYY-MM-DD). Applies to once. */
      date?: string;
    }
  | {
      id: string;
      kind: "event";
      eventId: string;
      /** Multiple event IDs — when set, any of these events will trigger the agent. */
      eventIds?: string[];
    }
  | {
      id: string;
      kind: "inbound_message";
      channel: "sms" | "email" | "voice";
    };

const DOW_LABEL: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const MONTH_LABEL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ordinalLabel(n: number) {
  if (n === -1) return "last day";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Turn a schedule trigger into a natural-language label, e.g.:
 *   - "Daily at 09:00"
 *   - "Weekly on Monday at 09:00"
 *   - "Monthly on the 1st at 09:00"
 *   - "Annually on March 15th at 09:00"
 *   - "Once on 2026-05-01 at 09:00"
 *   - "Hourly"
 */
export function formatScheduleTrigger(t: Extract<Trigger, { kind: "schedule" }>): string {
  const time = t.timeOfDay ? ` at ${t.timeOfDay}` : "";
  switch (t.frequency) {
    case "once":
      return `Once${t.date ? ` on ${t.date}` : ""}${time}`;
    case "hourly":
      return "Hourly";
    case "daily":
      return `Daily${time}`;
    case "weekly": {
      const day = t.dayOfWeek ? DOW_LABEL[t.dayOfWeek] ?? t.dayOfWeek : "Monday";
      return `Weekly on ${day}${time}`;
    }
    case "monthly": {
      const day = t.dayOfMonth ?? 1;
      return `Monthly on the ${ordinalLabel(day)}${time}`;
    }
    case "annually": {
      const month = t.monthOfYear ? MONTH_LABEL[t.monthOfYear - 1] : "January";
      const day = t.dayOfMonth ?? 1;
      return `Annually on ${month} ${ordinalLabel(day)}${time}`;
    }
    default:
      return "Schedule";
  }
}

export type MemoryCfg = {
  enabled: boolean;
  lastN: number;
  retentionDays: number;
};

export type Compilation = {
  status: "none" | "compiling" | "ready" | "failed";
  language?: "python" | "php";
  code?: string;
  parityScore?: number;
  testCasesPassed?: number;
  testCasesTotal?: number;
  compiledAt?: string;
  error?: string;
};

/**
 * Determines whether the agent uses a single phone number (and single email
 * alias) for every associated property, or one per property. When this is
 * "per_property", `perPropertyPhoneNumbers` / `perPropertyEmailAliases` carry
 * the overrides keyed by property *name*.
 */
export type PhoneAssignmentMode = "same" | "per_property";

/**
 * Communication channels the agent can run on.
 *
 *   - `sms`    — 10DLC SMS through a property-registered number.
 *   - `email`  — property mailbox / alias.
 *   - `voice`  — inbound / outbound phone through the property's voice provider.
 *   - `chat`   — in-product chat surfaces (resident portal chat, web-site
 *                widget, Entrata inbox threads). Text-based like SMS but not
 *                subject to telephony / 10DLC constraints, which is why it
 *                has its own channel rather than being folded into SMS.
 */
export type CommunicationChannel = "sms" | "email" | "voice" | "chat";

/**
 * Where the agent's brand voice, tone, and persona originate. `"inherit"`
 * pulls settings from an existing platform configuration (e.g. the
 * resident portal chatbot, the website live-chat widget, or a message
 * center template). `"custom"` means the author configures everything
 * directly in this step. Default is `"custom"` for backward compat.
 */
export type BrandVoiceSource = "inherit" | "custom";

/**
 * Platform areas that already have a brand & voice setup the agent can
 * inherit from. `id` maps to a config entity (not a module key); `label`
 * is shown in the selector dropdown.
 */
export type BrandVoiceInheritOption = {
  id: string;
  label: string;
  description: string;
  /** Module the source config lives in — shown as a link to "view original". */
  moduleKey?: string;
};

export const BRAND_VOICE_INHERIT_OPTIONS: ReadonlyArray<BrandVoiceInheritOption> =
  Object.freeze([
    {
      id: "resident_portal_chatbot",
      label: "Resident Portal — Chatbot",
      description:
        "Uses the brand name, greeting tone, and persona already configured for the resident portal chatbot.",
      moduleKey: "resident_portal_setupxxx",
    },
    {
      id: "website_live_chat",
      label: "Website — Live Chat Widget",
      description:
        "Inherits the tone, avatar, and greeting from your website live-chat configuration.",
      moduleKey: "website_setupxxx",
    },
    {
      id: "message_center_default",
      label: "Message Center — Default Template",
      description:
        "Matches the brand voice and sign-off style from your message center default email template.",
      moduleKey: "message_centerxxx",
    },
    {
      id: "leasing_center_voice",
      label: "Leasing Center — IVR / Voice",
      description:
        "Inherits the greeting script, hold music preference, and IVR persona from the leasing center phone tree.",
      moduleKey: "leasing_center_setupxxx",
    },
  ]);

export type CommunicationCfg = {
  enabled: boolean;
  channels: CommunicationChannel[];

  /**
   * Preferred order for reaching a resident when multiple channels are enabled.
   * Example: `["sms", "email", "voice"]` means try SMS first, then email, then voice.
   * Residents who opted out of a channel are skipped at runtime; this list is the
   * agent-level preference. Only channels present in `channels` should appear here.
   */
  channelPriority?: CommunicationChannel[];

  /**
   * Whether this agent inherits its brand voice from an existing platform
   * config or defines its own. When `"inherit"`, the agent pulls persona
   * name, tone, language, voice preset, and opening lines from
   * `brandVoiceInheritFrom`. When `"custom"` (or undefined for backward
   * compat), the author configures everything in this step.
   */
  brandVoiceSource?: BrandVoiceSource;

  /**
   * Which platform configuration to inherit from. Only read when
   * `brandVoiceSource === "inherit"`. Maps to an entry in
   * `BRAND_VOICE_INHERIT_OPTIONS`.
   */
  brandVoiceInheritFrom?: string;

  /**
   * The display name the agent uses when interacting with customers —
   * "Hi, this is *Riley* from Harvest Peak…". Distinct from `AgentVersion.name`
   * which is the internal label authors see in the roster.
   *
   * Stored on CommunicationCfg (not the version directly) because this is
   * the name residents see across SMS, email, voice, and chat — and
   * historically the voice block was the only place authors could influence
   * it. Pulling it up makes the persona a first-class, channel-agnostic
   * identity setting. Falls back to `AgentVersion.name` when unset so
   * legacy agents keep working.
   */
  personaName?: string;


  /** Applies to both phone + email when per-property customization is picked. */
  phoneAssignment?: PhoneAssignmentMode;

  /**
   * Shared phone number used when phoneAssignment === "same" (or unset).
   * Falls back here when per_property override is empty.
   */
  phoneNumber?: string;
  /** Map of propertyName → phoneNumber for per_property mode. */
  perPropertyPhoneNumbers?: Record<string, string>;

  phoneBehavior?: "dedicated" | "shared";

  /** Shared email alias when phoneAssignment === "same" (or unset). */
  emailAlias?: string;
  /** Per-property email alias overrides, keyed by propertyName. */
  perPropertyEmailAliases?: Record<string, string>;

  /**
   * @deprecated Use `twilioCampaignIds` (multi-select). Kept on the type for
   * backward compatibility with agents created before the multi-campaign UI.
   */
  twilioCampaign?: string;

  /** Twilio campaigns registered for outbound SMS (multi-select). */
  twilioCampaignIds?: string[];

  /**
   * @deprecated Use `firstMessageByChannel`. Retained for backward compat — if
   * populated and a channel-specific value is missing, UI falls back to this.
   */
  firstMessage?: string;

  /**
   * Opening line, controlled separately per channel. All three can use merge
   * fields like `{{property.name}}`, `{{property.address}}`, etc.
   *
   * Historically called "first message" in the UI. See the design note on
   * `letLlmComposeOpening` below for why it's pinned for voice and optional
   * for SMS/email.
   */
  firstMessageByChannel?: {
    email?: string;
    sms?: string;
    voice?: string;
    /**
     * In-product chat opens with this line the moment a resident joins the
     * thread. Like SMS it's optional — authors who'd rather let the LLM
     * compose a context-aware greeting can opt out via `letLlmComposeOpening`.
     */
    chat?: string;
  };

  /**
   * Per-channel opt-out from the scripted opening line. When `true` for a
   * channel, the agent composes its own first reply from the system prompt
   * instead of sending the pinned opening-line template. Only honored for
   * SMS and email — voice always uses the opening line because:
   *   1. Voice latency: the greeting must play before the LLM finishes
   *      generating, or callers hear silence on pickup and think the call
   *      dropped.
   *   2. Compliance: recording-consent / identity-disclosure language needs
   *      exact wording and must be auditable, not LLM-authored.
   */
  letLlmComposeOpening?: {
    email?: boolean;
    sms?: boolean;
    /**
     * Chat behaves like SMS here — async, text-based, and the conversation
     * context is already visible on-screen so an LLM-authored first line
     * reads naturally. Voice is intentionally still excluded (see note
     * above on voice latency + recording-consent compliance).
     */
    chat?: boolean;
  };

  /** Voice preset ID from VOICE_CATALOG — selected when channels includes "voice". */
  voiceId?: string;
  /** Required on voice channels in most states. Shown as a banner to the caller. */
  recordingConsent?: string;
  /** Phone number used for warm transfers to a human teammate. */
  transferNumber?: string;

  /**
   * Default conversation language. `auto` lets the runtime detect the caller's
   * language on first turn and respond in-kind. Specific codes pin the agent
   * to that language even if the caller switches. Applies to SMS, email, and
   * voice equally — it's a single setting so authors don't have to pick it
   * three times.
   */
  language?: LanguageCode;

  /**
   * Voice-runtime tuning — barge-in and voicemail behavior. Only meaningful
   * when the "voice" channel is enabled. Defaults are chosen so an author
   * can leave this alone and still ship a usable voice agent.
   */
  voiceRuntime?: VoiceRuntimeCfg;
};

/**
 * Supported default conversation languages. `auto` is the pragmatic default —
 * most L4 agents run on multi-language properties and don't need to be
 * hard-coded. The list is intentionally short (major US-market languages)
 * rather than exhaustive; adding more requires voice-model coverage on the
 * backend so we keep it in lockstep with what's actually available.
 */
export type LanguageCode = "auto" | "en" | "es" | "fr" | "de" | "pt" | "zh" | "vi";

export type LanguageOption = { value: LanguageCode; label: string };

export const LANGUAGE_OPTIONS: ReadonlyArray<LanguageOption> = Object.freeze([
  { value: "auto", label: "Auto-detect (recommended)" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "zh", label: "Mandarin Chinese" },
  { value: "vi", label: "Vietnamese" },
]);

/**
 * Voice-specific runtime tuning. These settings only affect the voice
 * channel — on SMS and email they're ignored. Kept as a sub-object so the
 * CommunicationCfg stays flat for the two channels that don't need them.
 */
export type VoiceRuntimeCfg = {
  /**
   * Whether the caller can interrupt the agent mid-sentence. Defaults to
   * `true` because humans expect it; turning it off is only appropriate for
   * scripted disclosures (e.g. legal recordings) where the agent must finish
   * speaking before the caller is allowed to respond.
   */
  bargeInEnabled?: boolean;
  /**
   * How aggressively we detect an interruption. `low` waits for a clear
   * sentence from the caller; `high` cuts the agent off on a single "yeah".
   * Most agents should use `medium`.
   */
  bargeInSensitivity?: "low" | "medium" | "high";

  /**
   * Whether the runtime attempts to detect when a human voicemail greeting
   * played instead of a live person. When off, the agent treats voicemail as
   * a live call and starts talking.
   */
  detectVoicemail?: boolean;
  /**
   * What to do once voicemail is detected. `hang_up` ends the call silently,
   * `leave_message` plays `voicemailScript` (or a default) after the beep.
   */
  voicemailAction?: "hang_up" | "leave_message";
  /**
   * Script read when `voicemailAction === "leave_message"`. Supports the same
   * merge fields as the opening line. Falls back to a generic "we'll try
   * again" message if left blank.
   */
  voicemailScript?: string;
};

/**
 * LLM model selection. `auto` lets Entrata pick the best model for the tier
 * (L3 gets a cheaper model, L4 gets a better one for conversation quality) —
 * most authors should leave it on auto. Specific model IDs are exposed for
 * power users who need deterministic model behavior for compliance or
 * benchmarking. The string identifiers match the model families the
 * production runtime already supports; we do not expose every minor version
 * because the runtime routes minor versions transparently.
 */
export type LlmModelId =
  | "auto"
  | "gpt-4o-mini"
  | "gpt-4o"
  | "claude-3-5-haiku"
  | "claude-3-5-sonnet";

export type LlmModelOption = {
  value: LlmModelId;
  label: string;
  subtext: string;
  costPer1kTokens: { input: number; output: number };
  bestFor: string[];
  speed: "fast" | "medium" | "slow";
  quality: "good" | "great" | "best";
};

export const LLM_MODEL_OPTIONS: ReadonlyArray<LlmModelOption> = Object.freeze([
  {
    value: "auto",
    label: "Auto (recommended)",
    subtext:
      "We pick the right model for your classification. Faster, cheaper model for L3; higher-quality model for L4 conversations.",
    costPer1kTokens: { input: 0, output: 0 },
    bestFor: ["all-purpose"],
    speed: "fast",
    quality: "great",
  },
  {
    value: "gpt-4o-mini",
    label: "GPT-4o mini",
    subtext:
      "Best when speed and price matter more than nuance. Great for high-volume L3 workflows with clear rules.",
    costPer1kTokens: { input: 0.15, output: 0.6 },
    bestFor: ["high-volume tasks", "simple rules", "data lookups", "status checks"],
    speed: "fast",
    quality: "good",
  },
  {
    value: "gpt-4o",
    label: "GPT-4o",
    subtext:
      "Balanced cost and quality. Solid default for L4 conversations where tone and reasoning matter.",
    costPer1kTokens: { input: 2.5, output: 10.0 },
    bestFor: ["conversations", "nuanced reasoning", "multi-step workflows", "resident interactions"],
    speed: "medium",
    quality: "great",
  },
  {
    value: "claude-3-5-haiku",
    label: "Claude 3.5 Haiku",
    subtext:
      "Anthropic\u2019s fast model. Strong at following guardrails exactly \u2014 good when compliance wording has to land verbatim.",
    costPer1kTokens: { input: 0.8, output: 4.0 },
    bestFor: ["compliance-heavy tasks", "exact wording", "guardrail adherence", "form processing"],
    speed: "fast",
    quality: "great",
  },
  {
    value: "claude-3-5-sonnet",
    label: "Claude 3.5 Sonnet",
    subtext:
      "Best conversational quality in the roster today. Slower and more expensive \u2014 use for premium L4 voice agents.",
    costPer1kTokens: { input: 3.0, output: 15.0 },
    bestFor: ["premium voice agents", "complex reasoning", "sensitive resident topics", "empathetic conversations"],
    speed: "slow",
    quality: "best",
  },
]);

/**
 * An individual item that feeds the agent's private knowledge base. Three
 * shapes are supported on purpose — each corresponds to a common source of
 * truth a PM might want the agent to quote from:
 *   - `document`: uploaded file (PDF, DOCX, TXT). Prototype records metadata only.
 *   - `url`: a public or authenticated URL the runtime will scrape on a cadence.
 *   - `snippet`: ad-hoc text typed directly by the author (e.g. "our pet policy is…").
 *
 * `status` / `chunkCount` are display-only here — production populates them
 * from the indexer pipeline and we mirror the shape so UI state doesn't need
 * to change when the backend lands.
 */
export type KnowledgeBaseSourceKind = "document" | "url" | "snippet";

export type KnowledgeBaseSource = {
  id: string;
  kind: KnowledgeBaseSourceKind;
  label: string;
  /** Snippet body or free-form notes; unused for `url` / `document`. */
  content?: string;
  /** Only for `kind: "url"`. */
  url?: string;
  /** Only for `kind: "document"`. Filename shown in the UI; no bytes persisted. */
  fileName?: string;
  /** Bytes. Only for `kind: "document"` — used to warn on oversize uploads. */
  sizeBytes?: number;
  addedAt: string;
  addedBy: string;
  /**
   * Indexing status. Defaults to `pending` immediately after add; the
   * prototype flips to `ready` after a short timeout to give authors
   * feedback. Production replaces this with real indexer telemetry.
   */
  status?: "pending" | "indexing" | "ready" | "failed";
  /** How many chunks the indexer produced. Purely informational in the UI. */
  chunkCount?: number;
};

/**
 * Agent's knowledge base configuration. Enabled per-agent so L3 workflow
 * agents don't carry unused configuration. When disabled, the runtime never
 * reaches for these sources — even if they're populated — so an author can
 * stage content without turning it on.
 */
export type KnowledgeBaseCfg = {
  enabled: boolean;
  sources: KnowledgeBaseSource[];
  /**
   * What to do when no KB source is a confident match to the caller's
   * question. `answer_from_prompt` lets the LLM fall back to the system
   * prompt (risk: hallucination on property specifics). `escalate` hands the
   * conversation off to a human per the agent's escalation policy. `say_not_sure`
   * has the agent explicitly tell the caller it doesn't know and offer to
   * take a message. Defaults to `say_not_sure` for conservative behavior.
   */
  fallbackBehavior?: "answer_from_prompt" | "escalate" | "say_not_sure";
};

/**
 * A single structured data point the agent should extract at the end of a
 * conversation. Keeping this lightweight (one field = one row in the UI)
 * lets authors build up their schema incrementally without a schema editor.
 *
 * `name` is the machine-readable key used by downstream actions and shows
 * up as a chip in the UI; `label` is the human-friendly prompt the LLM sees
 * when it's asked to populate the field. Both default to a slug of the
 * user's first keystrokes so the common case is one click.
 */
export type ExtractionFieldType = "text" | "number" | "boolean" | "choice" | "date";

export type ExtractionField = {
  id: string;
  name: string;
  label: string;
  type: ExtractionFieldType;
  /** Natural-language instruction to the LLM: "extract the caller's move-in date". */
  description: string;
  required: boolean;
  /** Only used when `type === "choice"`. Empty means "free-form". */
  choices?: string[];
};

/**
 * Where the extracted payload lands at the end of the conversation. The
 * destinations are an enum on purpose — each maps to a concrete Entrata
 * skill the runtime already knows how to execute — so authors can't accidentally
 * route data somewhere we can't deliver it. `when` is a plain-English
 * predicate the LLM evaluates; it's not a formal expression language.
 */
export type ExtractionActionDestination =
  | "create_work_order"
  | "update_lead"
  | "create_crm_task"
  | "send_summary_email"
  | "post_note";

export type ExtractionAction = {
  id: string;
  destination: ExtractionActionDestination;
  /** Short description surfaced in the UI, e.g. "Create maintenance ticket". */
  label: string;
  /** Optional natural-language condition. Blank runs the action on every conversation. */
  when?: string;
};

export type ExtractionCfg = {
  enabled: boolean;
  fields: ExtractionField[];
  actions: ExtractionAction[];
  /**
   * Whether to also generate a short LLM-written summary alongside the
   * structured fields. On by default — the summary is what shows up in the
   * conversation transcript header and in downstream notifications.
   */
  summaryEnabled: boolean;
};

/**
 * One turn in a conversation transcript. `at` is the offset from the start
 * of the conversation ("00:14") for voice, or undefined for SMS/email where
 * the wall-clock timestamp on the parent action is precise enough. `system`
 * turns record runtime events (e.g. voicemail detected, warm-transfer
 * initiated) that aren't spoken by either party.
 */
export type TranscriptTurn = {
  role: "agent" | "caller" | "system";
  at?: string;
  text: string;
};

/**
 * Full conversation transcript attached to a run. Only produced for L4
 * conversational agents — L3 runs have no transcript to attach. The
 * transcript always includes its channel so the UI can render the right
 * iconography (phone vs SMS vs mail) even if the run's metadata is stale.
 *
 * `extraction` holds the post-conversation output so the transcript is
 * self-contained: one row in the runs list is everything you need to audit
 * what was said and what was done about it.
 */
export type RunTranscript = {
  channel: "sms" | "email" | "voice";
  turns: TranscriptTurn[];
  /** For voice runs — how long the call ran (seconds). Optional. */
  durationSeconds?: number;
  /**
   * Opaque URL to the call recording. Blank in the prototype; production
   * populates this with a signed CDN URL. The UI only shows a "Play
   * recording" button when this is present.
   */
  recordingUrl?: string;
  extraction?: {
    summary?: string;
    /** Extracted field values keyed by `ExtractionField.name`. */
    fields?: Record<string, string | number | boolean | null>;
    /** Labels of `ExtractionAction`s that actually ran on this conversation. */
    actionsTaken?: string[];
  };
};

/**
 * A single eval case. Applies to both conversational and workflow agents:
 *   - Conversational: `input` is what the caller/user says, `expected` is the
 *     behavior / content the agent's response should include or avoid.
 *   - Workflow: `input` is a description of the trigger payload, `expected` is
 *     the action the agent should (or should not) take.
 */
export type EvalCaseSeverity = "critical" | "major" | "minor";

/**
 * Where the eval's grounding data comes from.
 *   - "none"     — no dataset; pure prompt/guardrail eval.
 *   - "inline"   — author pastes the data directly into `context`.
 *   - "snapshot" — auto-generated from the agent's configured data sources
 *                  (Phase 5: hit the real APIs in read-only mode and cache).
 *   - "fixture"  — uploaded JSON fixture file, stored as `dataFixture`.
 */
export type EvalDataStrategy = "none" | "inline" | "snapshot" | "fixture";

/**
 * A tool/skill call the agent is *expected* to make (or explicitly avoid)
 * when processing this eval. Compared against the action trace produced by
 * the sandbox run. The trace captures intent without executing side effects.
 */
export type ExpectedToolCall = {
  /** Skill id from SKILL_CATALOG, e.g. "skill.schedule_tour". */
  skillId: string;
  /** "call" = agent must invoke this; "must_not_call" = fails if invoked. */
  assertion: "call" | "must_not_call";
  /** Optional: key/value pairs the call arguments should contain. */
  expectedArgs?: Record<string, string>;
};

export type EvalCase = {
  id: string;
  input: string;
  expected: string;
  /** Optional free-form notes for the author. */
  notes?: string;
  /** Grounding context fed to the agent for this eval (simulates property data, lease terms, etc.). */
  context?: string;
  /** How the eval's grounding data is sourced. Defaults to "none". */
  dataStrategy?: EvalDataStrategy;
  /**
   * Structured fixture data uploaded as JSON. Used when `dataStrategy` is "fixture".
   * Shape is intentionally `unknown` — the runtime deserializes it based on the
   * agent's configured data sources.
   */
  dataFixture?: Record<string, unknown>;
  /** Freeform tags for grouping/filtering (e.g. "pet-policy", "maintenance"). */
  tags?: string[];
  /** How important it is that this eval passes. Defaults to "major". */
  severity?: EvalCaseSeverity;
  /**
   * Multi-turn conversation flow. When present, the eval replays these turns
   * in sequence instead of the single `input`. Each turn alternates between
   * a user message and an expected agent behavior.
   */
  conversationTurns?: Array<{
    role: "user" | "expected";
    content: string;
  }>;
  /**
   * Tool calls the agent should (or should not) make for this eval.
   * Validated against the sandbox action trace — no live side effects.
   */
  expectedToolCalls?: ExpectedToolCall[];
  /** Most recent run result, if any. Recorded when the author hits "Run evals". */
  lastResult?: {
    passed: boolean;
    at: string;
    actualResponse?: string;
    reasoning?: string;
    /** Per-criterion scores (0–1) from the judge. */
    scores?: {
      correctness?: number;
      completeness?: number;
      safety?: number;
      tone?: number;
    };
    /** Tool calls the agent attempted during the sandbox run. */
    actionTrace?: Array<{
      skillId: string;
      args: Record<string, string>;
      /** "blocked" = sandbox intercepted; "simulated" = returned mock response. */
      outcome: "blocked" | "simulated";
    }>;
  };
};

/**
 * Runtime scenarios that cause the agent to escalate instead of continuing.
 * Each trigger is a discrete product decision — we intentionally ship a
 * small, fixed set rather than a free-text rule builder because:
 *   1. L3/L4 PMC authors are not engineers and will not write rules; they
 *      will leave the defaults and trust them.
 *   2. Every trigger corresponds to a signal we already capture on the
 *      runtime side (intent detection, model confidence, repeated failure
 *      counters, guardrail classifiers). Shipping a user-configurable
 *      rule would require exposing those internals to the author.
 *   3. Having a fixed list lets us ship safe defaults — `caller_requests_human`
 *      and `guardrail_hit` are on by default, `low_confidence` is off
 *      because it's too noisy without tuning.
 */
export type EscalationTriggerId =
  | "caller_requests_human"
  | "low_confidence"
  | "repeated_failure"
  | "guardrail_hit"
  | "sensitive_topic";

export type EscalationTrigger = {
  id: EscalationTriggerId;
  enabled: boolean;
  /**
   * Scenario-specific tuning:
   *   - `low_confidence`: percentage (0–100). Below this, escalate.
   *   - `repeated_failure`: number of consecutive unsuccessful turns.
   * Ignored for other triggers.
   */
  threshold?: number;
};

/**
 * Where an escalation goes. We deliberately keep a small, closed set of
 * destination kinds because each one corresponds to a runtime resolver:
 *   - `property_main_line` / `property_manager` / `portal_task` resolve per
 *     property at runtime, so the author picks once and the right number /
 *     email / queue is used for each property the agent is associated with.
 *   - `oncall_rotation` hooks into whatever the PMC configures in Entrata
 *     for that property (today a simple phone tree; later: PagerDuty, etc).
 *   - `specific_phone` / `specific_email` are explicit overrides for the
 *     rare case where the author wants to bypass the property's defaults.
 */
export type EscalationDestinationKind =
  | "property_main_line"
  | "property_manager"
  | "oncall_rotation"
  | "specific_phone"
  | "specific_email"
  | "portal_task";

export type EscalationDestination = {
  kind: EscalationDestinationKind;
  /** Phone or email value — only used when `kind` is a `specific_*` variant. */
  value?: string;
  /**
   * Display label. Populated by the UI and persisted so logs stay
   * readable even if the underlying resolution changes (e.g. the property
   * main line is updated after the escalation fires).
   */
  label?: string;
};

/**
 * What the agent does on voice when escalation is triggered.
 *   - `warm_transfer`: announce the context, then bridge.
 *   - `cold_transfer`: straight bridge (no announcement).
 *   - `take_message`: collect details, create a ticket, end the call.
 *   - `schedule_callback`: offer a time window, end the call.
 *   - `end_politely`: acknowledge, end the call (e.g. after-hours).
 */
export type EscalationVoiceAction =
  | "warm_transfer"
  | "cold_transfer"
  | "take_message"
  | "schedule_callback"
  | "end_politely";

/**
 * What the agent does on an asynchronous channel (SMS / email) when
 * escalation is triggered. SMS and email share the same action set
 * because the runtime semantics are the same: the agent stops replying
 * and a human picks it up.
 */
export type EscalationAsyncAction =
  | "reply_handoff"
  | "create_ticket"
  | "forward_to_team"
  | "none";

export type EscalationVoiceHandoff = {
  action: EscalationVoiceAction;
  destination: EscalationDestination;
  /** Optional line the agent reads before transferring / hanging up. */
  handoffScript?: string;
};

export type EscalationAsyncHandoff = {
  action: EscalationAsyncAction;
  destination: EscalationDestination;
  /** Optional reply the agent sends before handing off. */
  acknowledgment?: string;
};

/**
 * After-hours override. If `overrideEnabled` is true, the runtime swaps
 * the primary voice/async actions for these alternate ones when the
 * property is outside its configured business hours. Destinations and
 * triggers are *not* overridden — only the action (e.g. voice normally
 * warm-transfers, after hours takes a message instead).
 */
export type EscalationAfterHoursOverride = {
  overrideEnabled: boolean;
  voiceAction?: EscalationVoiceAction;
  asyncAction?: EscalationAsyncAction;
  /** Line the agent uses before the after-hours handoff. */
  message?: string;
};

/**
 * What the agent does when it hits a case it can't or shouldn't handle itself.
 * Used at runtime to decide who gets pinged, on what channel, with what SLA.
 *
 * This type has two generations of fields:
 *   - Legacy fields (`when`, `to`, `channel`) from the first prototype. Kept
 *     optional for backward compatibility with seeded agents in
 *     `custom-agents-migrated.ts`. New authoring flows should populate the
 *     structured fields below instead.
 *   - Structured fields (`triggers`, `voice`, `sms`, `email`, `afterHours`)
 *     which are what the Escalation wizard step writes.
 */
export type EscalationPolicy = {
  enabled: boolean;
  /** @deprecated Prefer `triggers`. Kept for legacy seeded agents. */
  when?: string;
  /** @deprecated Prefer per-channel handoff destinations. */
  to?: string[];
  /** @deprecated Prefer per-channel handoff. */
  channel?: "sms" | "email" | "portal_task" | "phone_call";
  /** Target first-response time, in minutes. Applies across channels. */
  slaMinutes?: number;
  /** Optional one-line note attached to every escalation. */
  note?: string;

  /** First-class trigger list. When a trigger fires, the channel-specific handoff runs. */
  triggers?: EscalationTrigger[];
  /** Voice-specific handoff. Consulted when the conversation channel is voice. */
  voice?: EscalationVoiceHandoff;
  /** SMS-specific handoff. */
  sms?: EscalationAsyncHandoff;
  /** Email-specific handoff. */
  email?: EscalationAsyncHandoff;
  /** Alternate behavior outside the property's business hours. */
  afterHours?: EscalationAfterHoursOverride;
};

/**
 * Canonical display metadata for trigger scenarios. Colocated with the
 * type so any UI that renders the trigger list can share the copy and
 * stay consistent. Order matters — it's the order triggers render in
 * the Escalation step.
 */
export const ESCALATION_TRIGGER_CATALOG: ReadonlyArray<{
  id: EscalationTriggerId;
  label: string;
  subtext: string;
  /** Default threshold when the trigger is first added (if applicable). */
  defaultThreshold?: number;
  /** Unit shown next to the threshold input. */
  thresholdUnit?: "percent" | "turns";
  /** Whether the trigger is on by default for new agents. */
  defaultEnabled: boolean;
}> = Object.freeze([
  {
    id: "caller_requests_human",
    label: "Caller asks for a human",
    subtext:
      "Any version of \"can I talk to a person\", \"let me speak to the manager\", \"transfer me\". Highly recommended — callers who ask should always get one.",
    defaultEnabled: true,
  },
  {
    id: "guardrail_hit",
    label: "A guardrail would be crossed",
    subtext:
      "The agent is about to do something the Guardrails tab says it shouldn't. Safer to hand off than push through.",
    defaultEnabled: true,
  },
  {
    id: "sensitive_topic",
    label: "Sensitive topic comes up",
    subtext:
      "Safety, legal, fair-housing, or discrimination topics. These always belong with a human.",
    defaultEnabled: true,
  },
  {
    id: "low_confidence",
    label: "Agent isn't confident in its answer",
    subtext:
      "Escalate when the model's confidence drops below the threshold. Useful but noisy — start high and tune down.",
    defaultThreshold: 60,
    thresholdUnit: "percent",
    defaultEnabled: false,
  },
  {
    id: "repeated_failure",
    label: "Caller repeats themselves",
    subtext:
      "The caller has had to rephrase or correct the agent this many times. A good sign to hand off instead of looping.",
    defaultThreshold: 3,
    thresholdUnit: "turns",
    defaultEnabled: true,
  },
]);

/**
 * Default policy for a brand-new agent. Safe, resident-friendly choices:
 * warm-transfer voice to the property's main line, reply + create a ticket
 * for SMS/email, SLA of 30 minutes. After-hours takes a message instead.
 */
export function defaultEscalationPolicy(): EscalationPolicy {
  return {
    enabled: true,
    triggers: ESCALATION_TRIGGER_CATALOG.map((t) => ({
      id: t.id,
      enabled: t.defaultEnabled,
      threshold: t.defaultThreshold,
    })),
    voice: {
      action: "warm_transfer",
      destination: { kind: "property_main_line", label: "Property main line" },
      handoffScript:
        "Hang on just a moment while I get someone from the office on the line.",
    },
    sms: {
      action: "reply_handoff",
      destination: { kind: "property_manager", label: "Property manager" },
      acknowledgment:
        "I'm going to have someone from the office follow up with you shortly.",
    },
    email: {
      action: "forward_to_team",
      destination: { kind: "property_manager", label: "Property manager" },
      acknowledgment:
        "Thanks for reaching out — I've flagged this for the property team and someone will be in touch.",
    },
    slaMinutes: 30,
    afterHours: {
      overrideEnabled: true,
      voiceAction: "take_message",
      asyncAction: "reply_handoff",
      message:
        "The office is closed right now, but I can take a message and someone will get back to you first thing.",
    },
  };
}

export type SuccessMetricUnit = "count" | "percent" | "rate" | "minutes" | "dollars";

export type SuccessMetric = {
  id: string;
  label: string;
  description?: string;
  unit: SuccessMetricUnit;
  direction: "up" | "down";
  windowDays: 7 | 30 | 90;
  aiInferred: boolean;
  primary: boolean;
  currentValue: number;
  previousValue?: number;
  target?: number;
};

/**
 * Agent classification tier, matching the L1–L5 scheme used by the Agent
 * Roster (see `AGENT_TYPES` in agents-context.tsx and `AGENT_TYPES_OPTIONS`
 * in services/agentsApi.ts — those are the canonical labels). Exposed on
 * the Agent Builder first-step form so the author picks the right
 * expectation envelope up-front; this influences how the agent is
 * reviewed and which runtime guardrails are applied.
 *
 * Only L3–L5 are offered in the builder:
 *   L1 (ELI Essentials) and L2 (Operational Efficiency) are pre-built,
 *   Entrata-maintained agents that customers opt into, not something
 *   PMCs author from scratch. Keeping the full L1–L5 type in place keeps
 *   forward/backward compatibility with any existing saved agent version.
 */
export type AgentClassification = "L1" | "L2" | "L3" | "L4" | "L5";

export type AgentClassificationOption = {
  value: AgentClassification;
  label: string;
  subtext: string;
  /**
   * Whether the option should be selectable in the builder dropdown. L5 is
   * shown so authors see the tier exists, but is not yet available for
   * self-service creation.
   */
  disabled?: boolean;
};

export const AGENT_CLASSIFICATION_OPTIONS: ReadonlyArray<AgentClassificationOption> =
  Object.freeze([
    {
      value: "L3",
      label: "L3 · Processing at Scale",
      subtext:
        "Automates high-volume, repeatable workflows — bulk updates, back-office processing, daily operations. Acts inside the rules you set in Guardrails and flags anything unusual to a human.",
    },
    {
      value: "L4",
      label: "L4 · Conversational",
      subtext:
        "Has real back-and-forth conversations with residents or prospects over SMS, email, or voice. Handles Q&A, scheduling, and simple escalations on its own.",
    },
    {
      value: "L5",
      label: "L5 · Autonomous (Coming Soon)",
      subtext:
        "End-to-end autonomous workflows that can orchestrate other agents. Not yet available for self-serve creation — check back soon.",
      disabled: true,
    },
  ]);

export type StructuredGuardrail = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  /** If true, this guardrail is always on and cannot be disabled by the user. */
  locked: boolean;
  category: "compliance" | "security" | "safety" | "custom";
  /** If true, disabling requires explicit acknowledgment. */
  requiresAcknowledgment?: boolean;
};

export type McpServerConfig = {
  id: string;
  name: string;
  description: string;
  icon?: string;
  category: string;
  enabled: boolean;
  /** When set, only these specific tools are available (not all tools on the server). */
  restrictedToolIds?: string[];
};

export type ManualInvocationPoint = {
  id: string;
  moduleKey: string;
  label: string;
  enabled: boolean;
};

export type AgentVersion = {
  versionNumber: number;
  createdAt: string;
  createdBy: string;
  name: string;
  /** Builder-selected classification (L1–L5). Undefined while the author has not yet picked. */
  classification?: AgentClassification;
  prompt: string;
  guardrails: string;
  triggers: Trigger[];
  dataIds: string[];
  skillIds: string[];
  aiInferredDataIds: string[];
  aiInferredSkillIds: string[];
  properties: string[];

  /**
   * Optional reference to an Audience Builder segment
   * (`?module=audience_builderxxx`). When set, the agent's execution scope
   * is limited to residents / prospects in this audience — the runtime
   * filters eligible records before the agent processes them. `undefined`
   * means the agent works on the full population defined by its triggers
   * and properties.
   */
  audienceId?: string;
  /** Display label for the selected audience, cached for offline rendering. */
  audienceName?: string;

  communication: CommunicationCfg;
  memory: MemoryCfg;
  compilation: Compilation;
  costEstimate: CostEstimate | null;
  /**
   * User-editable override for the expected monthly run count on the Cost &
   * Dry-run step. When present, the UI uses this instead of the computed
   * `costEstimate.runsPerMonth` projection; computed cost per run stays as-is.
   */
  expectedRunsOverride?: number;
  successDescription: string;
  successMetrics: SuccessMetric[];
  /** When to escalate and to whom. Optional but recommended for resident-facing agents. */
  escalationPolicy?: EscalationPolicy;
  /** Regression test cases. Empty by default; filled by the author and run on demand. */
  evals: EvalCase[];
  /**
   * Which underlying LLM to use for this version. `undefined` === "auto" and
   * is what the vast majority of agents will ship with. Exposed so power
   * users can benchmark or pin behavior.
   */
  llmModel?: LlmModelId;
  /**
   * Private knowledge base the agent can retrieve from during a
   * conversation. Primarily an L4 concern — L3 workflow agents lean on
   * structured Entrata data via `dataIds` and don't need unstructured KB
   * retrieval. Optional so existing saved agents keep working.
   */
  knowledgeBase?: KnowledgeBaseCfg;
  /**
   * Structured output schema applied at the end of each conversation. Used
   * to create work orders, update leads, post notes, etc. without requiring
   * the LLM to call those skills mid-conversation. L4-only; L3 agents act
   * within a single run and don't have an "end of conversation" moment.
   */
  extraction?: ExtractionCfg;
  /** Structured guardrails with individual enable/disable tracking. */
  structuredGuardrails?: StructuredGuardrail[];
  /** MCP servers the agent can access, with optional skill-level restrictions. */
  mcpServers?: McpServerConfig[];
  /** Whether Super Agent can delegate to this agent. */
  superAgentEnabled?: boolean;
  /** Description for Super Agent routing — what this agent does and when to route to it. */
  superAgentDescription?: string;
  /** Keywords/topics Super Agent should use to identify when to delegate. */
  superAgentRoutingHints?: string;
  /** Manual invocation entry points merged into triggers. */
  manualInvocationPoints?: ManualInvocationPoint[];
};

/**
 * A concrete thing the agent did (or, on a dry-run, *would have* done) during
 * a single execution. On live runs these are real side-effects: messages sent,
 * records updated, transactions posted. On dry-runs they are the exact same
 * intended outcomes, rendered from the compiled plan — but nothing is actually
 * sent or persisted. The UI uses `run.mode` to label each action as either
 * "Executed" or "Would have…".
 */
export type RunActionKind =
  | "send_sms"
  | "send_email"
  | "send_voice"
  | "approve"
  | "update_record"
  | "create_record"
  | "post_transaction"
  | "escalate"
  | "delegate"
  | "skip"
  | "note";

export type RunAction = {
  id: string;
  kind: RunActionKind;
  /** Short headline, e.g. "Approved pre-bill batch #4881" or "Send SMS to Amy Nguyen". */
  label: string;
  /** Optional recipient / record id / phone number / email. */
  target?: string;
  /** Free-form details: message body, change diff, reasoning, failure notes. */
  details?: string;
};

export type RunRecord = {
  id: string;
  versionNumber: number;
  at: string;
  mode: "dry_run" | "live";
  triggerId: string;
  triggerSummary: string;
  status: "success" | "escalated" | "skipped" | "error";
  summary: string;
  skillsCalled: string[];
  /** Concrete actions taken (live) or simulated (dry_run). */
  actions: RunAction[];
  tokensUsed: number;
  cost: number;
  memoryContextUsed?: number;
  /**
   * Full conversation transcript for L4 runs. Absent on L3 (workflow) runs —
   * those are represented entirely by `actions` and `summary`. See
   * `RunTranscript` for the shape.
   */
  transcript?: RunTranscript;
};

/**
 * A surface in the Entrata platform where the agent can be triggered via
 * the embeddable widget (`oxp-agent-widget.js`). The module key maps to an
 * entry in AssignApplicationModules.php so the widget only renders on the
 * correct page. `label` is what the user sees on the button; `description`
 * explains why the agent is useful on that page.
 */
export type AgentEntryPoint = {
  id: string;
  moduleKey: string;
  label: string;
  description?: string;
  enabled: boolean;
};

/**
 * Catalog of Entrata modules where agents can be surfaced. Each entry
 * corresponds to a registered module in AssignApplicationModules.php.
 */
export const ENTRY_POINT_MODULES: ReadonlyArray<{
  moduleKey: string;
  label: string;
  category: string;
}> = [
  { moduleKey: "dashboard_residents_renewalsxxx", label: "Renewals Dashboard", category: "Residents" },
  { moduleKey: "dashboard_residents_move_insxxx", label: "Move-ins Dashboard", category: "Residents" },
  { moduleKey: "dashboard_residents_move_outsxxx", label: "Move-outs Dashboard", category: "Residents" },
  { moduleKey: "dashboard_residents_evictionsxxx", label: "Evictions Dashboard", category: "Residents" },
  { moduleKey: "dashboard_residents_transfersxxx", label: "Transfers Dashboard", category: "Residents" },
  { moduleKey: "dashboard_residents_insurancexxx", label: "Insurance Dashboard", category: "Residents" },
  { moduleKey: "leads_dashboardxxx", label: "Leads Dashboard", category: "Leasing" },
  { moduleKey: "leasing_center_dashboard_systemxxx", label: "Leasing Center Dashboard", category: "Leasing" },
  { moduleKey: "customer_maintenance_work_ordersxxx", label: "Maintenance Work Orders", category: "Maintenance" },
  { moduleKey: "maintenance_request_filters_newxxx", label: "Maintenance Requests", category: "Maintenance" },
  { moduleKey: "ar_payments_dashboardxxx", label: "AR Payments Dashboard", category: "Accounting" },
  { moduleKey: "dashboardxxx", label: "Main Dashboard", category: "General" },
  { moduleKey: "general_dashboardxxx", label: "General Dashboard", category: "General" },
  { moduleKey: "utility_dashboardxxx", label: "Utility Dashboard", category: "Utilities" },
  { moduleKey: "pricing_new_conventional_dashboardxxx", label: "Pricing Dashboard", category: "Pricing" },
];

export type CustomAgent = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lifecycle: Lifecycle;
  activeVersion: number;
  /** Versions currently running in dry-run (logging) mode in parallel with the active version. */
  dryRunVersions: number[];
  /**
   * Per-property explicit overrides for which version is live at a given
   * property. Maps property name → version number. Any property NOT present
   * in this map inherits `activeVersion`. A property name can only map to a
   * single version, which enforces the "never run multiple versions of the
   * same agent at one property" invariant at the type level (setPropertyVersion
   * is the only way to mutate it and guarantees single-version assignment).
   */
  propertyVersionMap?: Record<string, number>;
  versions: AgentVersion[];
  runs: RunRecord[];
  delegationEnabled: boolean;
  capabilityTags: string[];
  /**
   * When this agent was created by "forking" an Entrata-maintained system agent,
   * we stamp the native agent's id here. Used to (a) hide the original on the
   * Agent Roster (the forked version replaces it), and (b) let us diff the
   * PMC's customizations against the system prompt — which is useful signal
   * for improving the system agent itself.
   */
  forkedFromEntrataId?: string;
  /** Human-readable name of the Entrata agent this was forked from, at fork time. */
  forkedFromEntrataName?: string;
  /**
   * When this agent was "adopted" from an Agent Roster entry (an L4/L5 row
   * clicked from `/agent-roster`), we stamp the roster agent's id here so
   * subsequent clicks of the same roster row resolve back to this custom
   * agent instead of spawning a duplicate draft. The roster is the source
   * of the triggering UX — `forkedFromEntrataId` is reserved for the
   * Entrata-maintained native-agent fork flow.
   */
  adoptedFromRosterId?: string;
  /**
   * Snapshot of the Entrata-maintained agent's configuration at the moment this
   * custom agent was forked. Preserved forever so the PM can compare their edits
   * against the system baseline and, if they want, revert back to it from the
   * Versions tab. Only populated on forked agents; undefined for agents created
   * from scratch.
   *
   * This baseline is treated as read-only — restoring it clones the snapshot
   * into a brand-new version so the immutable history of the baseline stays
   * intact.
   */
  systemBaseline?: AgentVersion;
  /**
   * Surfaces in the Entrata platform where users can trigger this agent
   * via the embeddable widget, outside of the OXP dashboard. Each entry
   * maps to a module in AssignApplicationModules.php and renders a "Run
   * Agent" button on that page. The widget validates the user's JWT,
   * checks RBAC (`agent:execute`), and confirms the agent is provisioned
   * for the active property before allowing execution.
   */
  entryPoints?: AgentEntryPoint[];
};

type CustomAgentsContextValue = {
  agents: CustomAgent[];
  getAgent: (id: string) => CustomAgent | undefined;
  /**
   * Create a new blank draft. Optional `seed` pre-populates top-level
   * metadata — used when the user enters the builder from the Agent Roster
   * (clicking an L4/L5 row), so the draft opens with the name/description
   * they saw on the roster row already filled in.
   */
  createDraft: (seed?: {
    name?: string;
    description?: string;
    adoptedFromRosterId?: string;
  }) => CustomAgent;
  /**
   * Create a new draft custom agent seeded from an existing Entrata (system)
   * agent. Copies name, description, prompt, guardrails, channels, inferred
   * data + skills, etc. The returned agent's `forkedFromEntrataId` is set so
   * the Agent Roster hides the original in favor of this custom version.
   */
  createForkedDraft: (source: NativeAgent) => CustomAgent;
  /**
   * Update the contents of a specific version. If `versionNumber` is omitted,
   * falls back to the active version (used by the draft-creation flow).
   */
  updateDraftVersion: (
    id: string,
    versionNumber: number | undefined,
    patch: Partial<AgentVersion>
  ) => void;
  deleteAgent: (id: string) => void;
  /** Compile + start logging the given version in dry-run, in parallel with the active version. */
  deployDryRun: (id: string, versionNumber?: number) => Promise<void>;
  /** Compile + promote a version to the live slot (replaces whoever was live). */
  deployLive: (id: string, versionNumber?: number) => Promise<void>;
  pause: (id: string) => void;
  resume: (id: string) => void;
  stop: (id: string) => void;
  /** Clone a version into a new pending version (or clone the active version if omitted). */
  createNewVersion: (id: string, fromVersion?: number) => number | undefined;
  /** Stop logging a dry-run version. Removes the version entirely if it was never compiled or run. */
  discardDryRunVersion: (id: string, versionNumber: number) => void;
  /**
   * Unconditionally remove a version — its config, its runs, and its dry-run registration.
   * Used when the user explicitly discards edits in the wizard, or discards a draft from
   * the Versions tab. Refuses to delete the active (live/paused) version.
   */
  deleteVersion: (id: string, versionNumber: number) => void;
  /** Promote a dry-run version to the live slot; the previously-live version moves to history. */
  promoteDryRunToLive: (id: string, versionNumber: number) => Promise<void>;
  revertToVersion: (
    id: string,
    versionNumber: number,
    mode: "live" | "edit"
  ) => Promise<number | undefined>;
  /**
   * Clone the Entrata system baseline into a new version. For forked agents
   * only — no-op for anything else. With `mode: "live"` we also promote the
   * new version to the live slot, effectively "switching back to the Entrata
   * agent" (with the user's edits preserved as historical versions in case
   * they want to compare). Returns the newly-created version number, or
   * undefined if there's no baseline to restore from.
   */
  restoreSystemBaseline: (
    id: string,
    mode: "live" | "edit"
  ) => Promise<number | undefined>;
  seedSimulatedRuns: (id: string, count?: number) => void;
  /**
   * Replay synthetic triggers over a historical window so the user can see how the
   * agent *would* have performed without waiting for real time to pass. Returns the
   * number of dry-run records generated. Works for schedule- and event-triggered
   * agents; for inbound-message-only agents this will generate 0 runs.
   */
  simulateHistory: (
    id: string,
    options: { versionNumber?: number; windowDays: number }
  ) => Promise<number>;
  /** Preview the expected run count for a history simulation without generating runs. */
  estimateHistoryRunCount: (
    id: string,
    options: { versionNumber?: number; windowDays: number }
  ) => number;
  /**
   * Pipe a single synthetic inbound message (SMS / email / voice) through the agent
   * and record the resulting dry-run. Nothing is actually sent or received — this is
   * the "try it on a sample input" pattern for communication-driven agents. Returns
   * the newly-created run record.
   */
  simulateTestMessage: (
    id: string,
    options: {
      versionNumber?: number;
      channel: "sms" | "email" | "voice";
      body: string;
      from?: string;
    }
  ) => Promise<RunRecord>;
  /**
   * Assign a specific version to a single property. Pass `versionNumber = null`
   * to clear the override (the property will then inherit `activeVersion`).
   * Silently no-ops if the version is not eligible (i.e., is currently in
   * dry-run, or does not exist on the agent). See `getEligibleLiveVersions`
   * for the definition of "eligible".
   */
  setPropertyVersion: (
    id: string,
    property: string,
    versionNumber: number | null
  ) => void;
  /** Replace the full entry-points list for an agent. */
  updateEntryPoints: (id: string, entryPoints: AgentEntryPoint[]) => void;
};

const CustomAgentsContext = createContext<CustomAgentsContextValue | null>(null);

/**
 * Returns the version number that is currently live at a given property, taking
 * any explicit per-property override into account. Falls back to the agent's
 * default `activeVersion` when no override is set.
 */
export function getEffectiveVersionForProperty(
  agent: CustomAgent,
  property: string
): number {
  const override = agent.propertyVersionMap?.[property];
  return override ?? agent.activeVersion;
}

/**
 * Returns the list of versions that are eligible to be assigned to a property,
 * in descending version order (newest first). "Eligible" means the version is
 * effectively *live* somewhere on the agent: either it is the default active
 * version, it is currently running at some property via the override map, or
 * it has been live in the past (evidenced by a recorded `mode: "live"` run).
 *
 * Explicitly excluded:
 *   - Versions currently in dry-run (`agent.dryRunVersions`)
 *   - Versions that never compiled / were never promoted to live
 *   - Versions that have been deleted (they simply aren't in `agent.versions`)
 *
 * This is the set shown in the per-property version dropdown.
 */
export function getEligibleLiveVersions(agent: CustomAgent): AgentVersion[] {
  const dry = new Set(agent.dryRunVersions);
  const liveish = new Set<number>([agent.activeVersion]);
  if (agent.propertyVersionMap) {
    for (const v of Object.values(agent.propertyVersionMap)) liveish.add(v);
  }
  for (const r of agent.runs) {
    if (r.mode === "live") liveish.add(r.versionNumber);
  }
  return agent.versions
    .filter((v) => liveish.has(v.versionNumber) && !dry.has(v.versionNumber))
    .sort((a, b) => b.versionNumber - a.versionNumber);
}

/**
 * Returns the union of properties this agent is deployed to, derived from the
 * `properties` list on every live-eligible version. This is the set of rows
 * shown in the per-property version picker UI.
 */
export function getAllPropertiesForAgent(agent: CustomAgent): string[] {
  const seen = new Set<string>();
  for (const v of getEligibleLiveVersions(agent)) {
    for (const p of v.properties) seen.add(p);
  }
  // Also include any properties referenced by the override map, in case
  // a property was pinned to a version whose property list has since changed.
  if (agent.propertyVersionMap) {
    for (const p of Object.keys(agent.propertyVersionMap)) seen.add(p);
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

function emptyVersion(versionNumber: number): AgentVersion {
  return {
    versionNumber,
    createdAt: new Date().toISOString(),
    createdBy: "Current user",
    name: "",
    prompt: "",
    guardrails: "",
    triggers: [],
    dataIds: [],
    skillIds: [],
    aiInferredDataIds: [],
    aiInferredSkillIds: [],
    properties: [],
    communication: { enabled: false, channels: [] },
    memory: { enabled: false, lastN: 3, retentionDays: 30 },
    compilation: { status: "none" },
    costEstimate: null,
    successDescription: "",
    successMetrics: [],
    evals: [],
    // Seed every new agent with the default escalation policy so authors
    // can't accidentally ship an agent with no handoff behavior. They can
    // still turn it off explicitly in the Escalation wizard step.
    escalationPolicy: defaultEscalationPolicy(),
    llmModel: undefined,
    structuredGuardrails: undefined,
    mcpServers: undefined,
    superAgentEnabled: false,
    superAgentDescription: "",
    superAgentRoutingHints: "",
    manualInvocationPoints: [],
    knowledgeBase: undefined,
    extraction: undefined,
  };
}

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

type PreBillTemplate = {
  hour: number;
  status: RunRecord["status"];
  summary: string;
  batch?: number;
  recapture?: number;
  vacancy?: number;
};

function buildPreBillRun(
  t: PreBillTemplate,
  versionNumber: number,
  hoursAgo: (h: number) => string,
  agentCtx: { name: string },
  version: AgentVersion
): RunRecord {
  return {
    id: makeId("run"),
    versionNumber,
    at: hoursAgo(t.hour),
    mode: "live",
    triggerId: "seed-trg",
    triggerSummary: "Pre-bill pending approval",
    status: t.status,
    summary: t.summary,
    skillsCalled:
      t.status === "success"
        ? ["skill.approve_pre_bill"]
        : t.status === "escalated"
        ? ["skill.escalate_to_human", "skill.send_email"]
        : ["skill.escalate_to_human"],
    actions: actionsFor(agentCtx, version, t.status, {
      batchNumber: t.batch,
      grossRecapture: t.recapture,
      propertyVacancy: t.vacancy,
    }),
    tokensUsed: versionNumber === 1 ? 720 : 740,
    cost: 0.00054,
  };
}

function seedRunsForPreBill(
  hoursAgo: (h: number) => string,
  agentCtx: { name: string },
  v1: AgentVersion,
  v2: AgentVersion
): RunRecord[] {
  // v1 had stricter 98% threshold — caught fewer but higher success rate.
  // v2 has looser 95% — approves more but has more escalations.
  const v1Templates: PreBillTemplate[] = [
    { hour: 216, status: "success", summary: "Gross recapture 99.1%. Approved batch #4822.", batch: 4822, recapture: 99.1 },
    { hour: 204, status: "success", summary: "Gross recapture 98.7%. Approved batch #4835.", batch: 4835, recapture: 98.7 },
    { hour: 192, status: "skipped", summary: "Gross recapture 96.4% — below 98% threshold. Left for human review.", batch: 4840, recapture: 96.4 },
    { hour: 180, status: "success", summary: "Gross recapture 99.3%. Approved batch #4848.", batch: 4848, recapture: 99.3 },
    { hour: 168, status: "skipped", summary: "Gross recapture 97.2% — below 98% threshold. Left for human review.", batch: 4855, recapture: 97.2 },
    { hour: 156, status: "success", summary: "Gross recapture 98.5%. Approved batch #4860.", batch: 4860, recapture: 98.5 },
    { hour: 144, status: "skipped", summary: "Gross recapture 97.8% — below 98% threshold. Left for human review.", batch: 4866, recapture: 97.8 },
    { hour: 132, status: "success", summary: "Gross recapture 99.0%. Approved batch #4871.", batch: 4871, recapture: 99.0 },
    { hour: 120, status: "skipped", summary: "Gross recapture 96.1% — below 98% threshold. Left for human review.", batch: 4877, recapture: 96.1 },
  ];

  // v2 runs (last 4 days, much more active)
  const v2Templates: PreBillTemplate[] = [
    { hour: 94, status: "success", summary: "Gross recapture 96.4%. Approved batch #4881.", batch: 4881, recapture: 96.4 },
    { hour: 88, status: "success", summary: "Gross recapture 97.1%. Approved batch #4884.", batch: 4884, recapture: 97.1 },
    { hour: 80, status: "escalated", summary: "Gross recapture 91.2% — below threshold. Escalated to human.", batch: 4889, recapture: 91.2 },
    { hour: 72, status: "success", summary: "Gross recapture 98.2%. Approved batch #4893.", batch: 4893, recapture: 98.2 },
    { hour: 64, status: "success", summary: "Gross recapture 95.8%. Approved batch #4902.", batch: 4902, recapture: 95.8 },
    { hour: 56, status: "skipped", summary: "Meter reading missing on 2 units. Skipped.", batch: 4907 },
    { hour: 48, status: "success", summary: "Gross recapture 96.9%. Approved batch #4911.", batch: 4911, recapture: 96.9 },
    { hour: 40, status: "success", summary: "Gross recapture 97.5%. Approved batch #4922.", batch: 4922, recapture: 97.5 },
    { hour: 32, status: "escalated", summary: "Property is 53% vacant — guardrail triggered. Escalated.", batch: 4928, vacancy: 53 },
    { hour: 24, status: "success", summary: "Gross recapture 98.0%. Approved batch #4935.", batch: 4935, recapture: 98.0 },
    { hour: 16, status: "success", summary: "Gross recapture 95.2%. Approved batch #4948.", batch: 4948, recapture: 95.2 },
    { hour: 8, status: "success", summary: "Gross recapture 96.6%. Approved batch #4957.", batch: 4957, recapture: 96.6 },
  ];

  return [
    ...v1Templates.map((t) => buildPreBillRun(t, 1, hoursAgo, agentCtx, v1)),
    ...v2Templates.map((t) => buildPreBillRun(t, 2, hoursAgo, agentCtx, v2)),
  ];
}

function seedAgents(): CustomAgent[] {
  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString();

  const preBillAgent: CustomAgent = {
    id: "custom_example_pre_bill",
    name: "Auto-approve clean pre-bills",
    description: "Approve pre-bill batches when gross recapture is above 95%.",
    createdAt: hoursAgo(216),
    updatedAt: hoursAgo(8),
    createdBy: PMC_NAME,
    lifecycle: "live",
    activeVersion: 2,
    dryRunVersions: [],
    delegationEnabled: true,
    capabilityTags: ["approve_pre_bill", "pre_bill_analysis"],
    versions: [
      {
        ...emptyVersion(1),
        createdAt: hoursAgo(216),
        createdBy: PMC_NAME,
        name: "Auto-approve clean pre-bills",
        prompt:
          "When a utility pre-bill is pending approval, check the gross recapture percentage. If gross recapture is above 98%, approve the pre-bill. Otherwise, leave it for a human to review.",
        guardrails:
          "Never approve a pre-bill with missing meter readings.\nIf anything looks unusual, escalate to a human.",
        triggers: [{ id: makeId("trg"), kind: "event", eventId: "evt.pre_bill_pending" }],
        dataIds: ["data.pre_bill_batch"],
        skillIds: ["skill.approve_pre_bill", "skill.escalate_to_human"],
        aiInferredDataIds: ["data.pre_bill_batch"],
        aiInferredSkillIds: ["skill.approve_pre_bill", "skill.escalate_to_human"],
        properties: ["All properties"],
        communication: { enabled: false, channels: [] },
        memory: { enabled: false, lastN: 3, retentionDays: 30 },
        compilation: {
          status: "ready",
          language: "python",
          parityScore: 0.97,
          testCasesPassed: 20,
          testCasesTotal: 20,
          compiledAt: hoursAgo(215),
          code: "# Auto-compiled from prompt (internal)",
        },
        costEstimate: null,
        successDescription:
          "Success is auto-approving clean pre-bills quickly and reducing ops review time.",
        successMetrics: [
          {
            id: "sm_pb_count_v1",
            label: "Pre-bills auto-approved",
            description: "Batches approved automatically without human review.",
            unit: "count",
            direction: "up",
            windowDays: 30,
            aiInferred: true,
            primary: true,
            currentValue: 64,
            previousValue: 52,
          },
        ],
      },
      {
        ...emptyVersion(2),
        createdAt: hoursAgo(96),
        createdBy: PMC_NAME,
        name: "Auto-approve clean pre-bills",
        prompt:
          "When a utility pre-bill is pending approval, check the gross recapture percentage. If gross recapture is above 95%, approve the pre-bill. Otherwise, leave it for a human to review.",
        guardrails:
          "Never approve a pre-bill with missing meter readings.\nNever approve a pre-bill for a property that is more than 50% vacant.\nIf anything looks unusual, escalate to a human.",
        triggers: [{ id: makeId("trg"), kind: "event", eventId: "evt.pre_bill_pending" }],
        dataIds: ["data.pre_bill_batch", "data.property_info"],
        skillIds: ["skill.approve_pre_bill", "skill.escalate_to_human"],
        aiInferredDataIds: ["data.pre_bill_batch", "data.property_info"],
        aiInferredSkillIds: ["skill.approve_pre_bill", "skill.escalate_to_human"],
        properties: ["All properties"],
        communication: { enabled: false, channels: [] },
        memory: { enabled: false, lastN: 3, retentionDays: 30 },
        compilation: {
          status: "ready",
          language: "python",
          parityScore: 0.98,
          testCasesPassed: 22,
          testCasesTotal: 22,
          compiledAt: hoursAgo(95),
          code: "# Auto-compiled from prompt (internal)",
        },
        costEstimate: null,
        successDescription:
          "Success is auto-approving clean pre-bills quickly, reducing the time my operations team spends on routine approvals.",
        successMetrics: [
          {
            id: "sm_pb_count",
            label: "Pre-bills auto-approved",
            description: "Batches approved automatically without human review.",
            unit: "count",
            direction: "up",
            windowDays: 30,
            aiInferred: true,
            primary: true,
            currentValue: 142,
            previousValue: 108,
          },
          {
            id: "sm_pb_time",
            label: "Ops time saved",
            description: "Estimated minutes saved vs. manual approval.",
            unit: "minutes",
            direction: "up",
            windowDays: 30,
            aiInferred: true,
            primary: false,
            currentValue: 4260,
            previousValue: 3240,
          },
        ],
      },
    ],
    runs: [],
    entryPoints: [
      {
        id: "ep-utility_dashboardxxx",
        moduleKey: "utility_dashboardxxx",
        label: "Run Pre-bill Agent",
        enabled: true,
      },
      {
        id: "ep-ar_payments_dashboardxxx",
        moduleKey: "ar_payments_dashboardxxx",
        label: "Auto-approve Pre-bills",
        enabled: true,
      },
    ],
  };
  preBillAgent.runs = seedRunsForPreBill(
    hoursAgo,
    { name: preBillAgent.name },
    preBillAgent.versions[0],
    preBillAgent.versions[1]
  );

  const tourAgent: CustomAgent = {
    id: "custom_example_tour_reminder",
    name: "Tour reminder to leasing agent",
    description: "Text the leasing agent with lead details 30 minutes before a tour.",
    createdAt: hoursAgo(48),
    updatedAt: hoursAgo(2),
    createdBy: PMC_NAME,
    lifecycle: "dry_run",
    activeVersion: 1,
    dryRunVersions: [],
    delegationEnabled: true,
    capabilityTags: ["send_sms", "update_lead"],
    versions: [
      {
        ...emptyVersion(1),
        createdAt: hoursAgo(48),
        createdBy: PMC_NAME,
        name: "Tour reminder to leasing agent",
        prompt:
          "30 minutes before a scheduled tour, send a text message to the leasing agent with the lead's name, phone number, and floorplan preferences. If the leasing agent replies with tour details, update the lead record accordingly.",
        guardrails:
          "Only text leasing agents during business hours (7am–8pm local).\nNever include sensitive screening data in the text.",
        triggers: [
          { id: makeId("trg"), kind: "event", eventId: "evt.tour_upcoming_30m" },
          { id: makeId("trg"), kind: "inbound_message", channel: "sms" },
        ],
        dataIds: ["data.lead_profile", "data.tour_schedule", "data.leasing_agent_directory"],
        skillIds: ["skill.send_sms", "skill.reply_message", "skill.update_lead"],
        aiInferredDataIds: ["data.lead_profile", "data.tour_schedule", "data.leasing_agent_directory"],
        aiInferredSkillIds: ["skill.send_sms", "skill.reply_message", "skill.update_lead"],
        properties: ["Hillside Living", "Jamison Apartments"],
        communication: {
          enabled: true,
          channels: ["sms"],
          phoneNumber: "+1 (555) 901-0423",
          phoneBehavior: "dedicated",
          twilioCampaign: "OXP-Tour-Reminders",
        },
        memory: { enabled: true, lastN: 3, retentionDays: 14 },
        compilation: {
          status: "ready",
          language: "python",
          parityScore: 0.94,
          testCasesPassed: 16,
          testCasesTotal: 17,
          compiledAt: hoursAgo(47),
          code: "# Auto-compiled from prompt (internal)",
        },
        costEstimate: null,
        successDescription:
          "Success is getting tour reminders to leasing agents 30 minutes before every tour, and capturing lead preferences when the agent texts back.",
        successMetrics: [
          {
            id: "sm_tr_delivered",
            label: "Tour reminders delivered",
            description: "SMS reminders sent 30 minutes before a scheduled tour.",
            unit: "count",
            direction: "up",
            windowDays: 30,
            aiInferred: true,
            primary: true,
            currentValue: 87,
            previousValue: 74,
          },
          {
            id: "sm_tr_updates",
            label: "Leads updated from replies",
            description: "Lead records updated based on leasing-agent replies.",
            unit: "count",
            direction: "up",
            windowDays: 30,
            aiInferred: true,
            primary: false,
            currentValue: 42,
            previousValue: 28,
          },
        ],
      },
    ],
    runs: [],
    entryPoints: [
      {
        id: "ep-leads_dashboardxxx",
        moduleKey: "leads_dashboardxxx",
        label: "Tour Reminder Agent",
        enabled: true,
      },
      {
        id: "ep-leasing_center_dashboard_systemxxx",
        moduleKey: "leasing_center_dashboard_systemxxx",
        label: "Send Tour Reminders",
        enabled: true,
      },
    ],
  };

  const migrated = buildMigratedAgents(hoursAgo);
  return [preBillAgent, tourAgent, ...migrated];
}

function hydrateCostEstimates(agents: CustomAgent[]): CustomAgent[] {
  return agents.map((a) => {
    // Migrate older payloads that used a single `dryRunVersion` pointer.
    const legacy = (a as CustomAgent & { dryRunVersion?: number }).dryRunVersion;
    const dryRunVersions = a.dryRunVersions ?? (legacy !== undefined ? [legacy] : []);
    return {
      ...a,
      dryRunVersions,
      propertyVersionMap: a.propertyVersionMap ?? {},
      versions: a.versions.map((v) => ({
        ...v,
        successDescription: v.successDescription ?? "",
        successMetrics: v.successMetrics ?? [],
        evals: v.evals ?? [],
        escalationPolicy: v.escalationPolicy,
        costEstimate: estimateCost(v),
      })),
      // Older payloads predate RunRecord.actions — default to an empty list so
      // the UI doesn't crash on undefined access.
      runs: (a.runs ?? []).map((r) => ({
        ...r,
        actions: r.actions ?? [],
      })),
    };
  });
}

function simulatedRunsFor(
  agent: CustomAgent,
  count = 6,
  versionNumber?: number,
  forceMode?: "live" | "dry_run"
): RunRecord[] {
  const targetVersionNumber = versionNumber ?? agent.activeVersion;
  const targetVersion =
    agent.versions.find((v) => v.versionNumber === targetVersionNumber) ?? agent.versions[0];
  if (!targetVersion) return [];
  const now = Date.now();
  const modes: Array<RunRecord["mode"]> = forceMode
    ? [forceMode]
    : agent.lifecycle === "live" && targetVersion.versionNumber === agent.activeVersion
    ? ["live", "live", "live", "dry_run"]
    : ["dry_run"];
  const results: RunRecord[] = [];
  for (let i = 0; i < count; i++) {
    const version = targetVersion;
    const trigger = version.triggers[i % Math.max(1, version.triggers.length)];
    const triggerSummary = trigger
      ? trigger.kind === "event"
        ? EVENT_CATALOG.find((e) => e.id === trigger.eventId)?.label ?? "Event"
        : trigger.kind === "schedule"
        ? formatScheduleTrigger(trigger)
        : `Inbound ${trigger.channel}`
      : "Trigger fired";
    const status: RunRecord["status"] = i === 2 ? "escalated" : i === 5 ? "skipped" : "success";
    const summary = pickRunSummary(agent.name, status);
    results.push({
      id: makeId("run"),
      versionNumber: version.versionNumber,
      at: new Date(now - i * 1800_000 - Math.random() * 400_000).toISOString(),
      mode: modes[i % modes.length],
      triggerId: trigger?.id ?? "unknown",
      triggerSummary,
      status,
      summary,
      skillsCalled: version.skillIds.slice(0, status === "success" ? 2 : 1),
      actions: actionsFor(agent, version, status, { batchNumber: 4881 + i }),
      tokensUsed: 600 + Math.floor(Math.random() * 400),
      cost: 0.00054 + Math.random() * 0.00015,
      memoryContextUsed: version.memory.enabled ? Math.min(version.memory.lastN, i) : 0,
    });
  }
  return results;
}

/**
 * Build a realistic batch of dry-run records distributed across the last `windowDays`
 * days. The number of runs is driven by the version's own trigger frequency (so a
 * daily agent over 30 days produces ~30 runs, a monthly agent over 90 days produces
 * ~3 runs, etc.), capped to keep the UI snappy.
 */
function historySimulationRunsFor(
  agent: CustomAgent,
  targetVersionNumber: number,
  windowDays: number,
  maxRuns = 200
): RunRecord[] {
  const version =
    agent.versions.find((v) => v.versionNumber === targetVersionNumber) ?? agent.versions[0];
  if (!version) return [];

  const expected = estimatedHistoryCount(version, windowDays);
  const count = Math.max(0, Math.min(expected, maxRuns));
  if (count === 0) return [];

  const now = Date.now();
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const results: RunRecord[] = [];

  for (let i = 0; i < count; i++) {
    const trigger = version.triggers[i % Math.max(1, version.triggers.length)];
    const triggerSummary = trigger
      ? trigger.kind === "event"
        ? EVENT_CATALOG.find((e) => e.id === trigger.eventId)?.label ?? "Event"
        : trigger.kind === "schedule"
        ? formatScheduleTrigger(trigger)
        : `Inbound ${trigger.channel}`
      : "Trigger fired";

    // Distribute timestamps evenly across the window, oldest first, with jitter so
    // they don't look artificially regular.
    const fraction = count === 1 ? 0.5 : i / (count - 1);
    const jitter = (Math.random() - 0.5) * (windowMs / Math.max(count, 1)) * 0.6;
    const at = new Date(now - windowMs + fraction * windowMs + jitter).toISOString();

    // Status mix: ~78% success, ~10% escalated, ~7% skipped, ~5% error.
    const roll = Math.random();
    const status: RunRecord["status"] =
      roll < 0.78 ? "success" : roll < 0.88 ? "escalated" : roll < 0.95 ? "skipped" : "error";

    results.push({
      id: makeId("run"),
      versionNumber: version.versionNumber,
      at,
      mode: "dry_run",
      triggerId: trigger?.id ?? "unknown",
      triggerSummary,
      status,
      summary: pickRunSummary(agent.name, status),
      skillsCalled: version.skillIds.slice(0, status === "success" ? 2 : 1),
      actions: actionsFor(agent, version, status, { batchNumber: 5000 + i }),
      tokensUsed: 600 + Math.floor(Math.random() * 400),
      cost: 0.00054 + Math.random() * 0.00015,
      memoryContextUsed: version.memory.enabled
        ? Math.min(version.memory.lastN, Math.floor(i / 2))
        : 0,
    });
  }

  // Sort descending so newest runs appear first, matching the Runs tab's expectation.
  return results.sort((a, b) => (a.at < b.at ? 1 : -1));
}

function estimatedHistoryCount(version: AgentVersion, windowDays: number): number {
  // Prefer the version's own cost estimate if present; otherwise do a quick
  // estimate from its triggers so the preview works for fresh drafts too.
  const runsPerMonth =
    version.costEstimate?.runsPerMonth ??
    version.triggers.reduce((sum, t) => {
      if (t.kind === "schedule") {
        const f = TIME_FREQUENCIES.find((x) => x.value === t.frequency);
        return sum + (f?.runsPerMonth ?? 0);
      }
      if (t.kind === "event") {
        const ev = EVENT_CATALOG.find((e) => e.id === t.eventId);
        return sum + (ev?.avgPerMonth ?? 0);
      }
      return sum + 40;
    }, 0);
  const raw = runsPerMonth * (windowDays / 30);
  return Math.max(0, Math.round(raw));
}

type ActionHints = {
  batchNumber?: number;
  grossRecapture?: number;
  propertyVacancy?: number;
  leadName?: string;
  leadPhone?: string;
  leasingAgentName?: string;
  leasingAgentPhone?: string;
  propertyName?: string;
  residentName?: string;
  checklistItems?: number;
};

const FIRST_NAMES = ["Jason", "Maria", "Priya", "Andre", "Beatrice", "Diego", "Kenji", "Lena"];
const LAST_NAMES = ["Lee", "Vasquez", "Patel", "Nguyen", "Okafor", "Silva", "Park", "Hughes"];
const LEASING_AGENT_NAMES = ["Amy Nguyen", "Marcus Hill", "Devon Park", "Rachel Ortiz"];
const PROPERTY_LIST = ["Hillside Living", "Jamison Apartments", "Elm Ridge", "Copper Creek"];

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function fakePhone(seed: number): string {
  const a = 200 + (Math.abs(seed * 37) % 800);
  const b = 100 + (Math.abs(seed * 91) % 900);
  const c = 1000 + (Math.abs(seed * 53) % 9000);
  return `+1 (555) ${a.toString().padStart(3, "0")}-${b.toString().padStart(3, "0").slice(0, 3)}${c.toString().slice(0, 1)}`;
}

/**
 * Generate the concrete actions for a run. Agent-name and prompt heuristics
 * pick a realistic shape (pre-bill approval, tour SMS, move-in nudge, generic).
 * For live runs these represent real executions; for dry-runs the renderer
 * flips them to "would have…" phrasing. The underlying data is identical —
 * a dry-run executes the same compiled code but short-circuits side effects.
 */
function actionsFor(
  agent: CustomAgent | { name: string },
  version: AgentVersion,
  status: RunRecord["status"],
  hints: ActionHints = {}
): RunAction[] {
  const name = (agent.name || "").toLowerCase();
  const prompt = (version.prompt || "").toLowerCase();
  const isPreBill =
    name.includes("pre-bill") || name.includes("pre bill") ||
    prompt.includes("pre-bill") || prompt.includes("pre bill") ||
    prompt.includes("gross recapture");
  const isTour = name.includes("tour") || prompt.includes("tour");
  const isMoveIn = name.includes("move") || prompt.includes("move-in") || prompt.includes("move in");

  if (isPreBill) {
    if (status === "success") {
      const batch = hints.batchNumber ?? 4881;
      const recap = hints.grossRecapture ?? 96.4;
      const amount = 9000 + ((batch * 37) % 5000);
      return [
        {
          id: makeId("act"),
          kind: "approve",
          label: `Approved pre-bill batch #${batch}`,
          target: `batch #${batch}`,
          details: `Gross recapture ${recap.toFixed(1)}% — above 95% threshold. Approved 142 line items totaling $${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} and released to billing.`,
        },
        {
          id: makeId("act"),
          kind: "note",
          label: "Logged approval reasoning",
          details: `Recapture ${recap.toFixed(1)}% ≥ 95% threshold · no missing meter readings · property vacancy within guardrail.`,
        },
      ];
    }
    if (status === "escalated") {
      const batch = hints.batchNumber ?? 4881;
      const recap = hints.grossRecapture ?? 91.2;
      const vacancy = hints.propertyVacancy;
      const reason =
        vacancy !== undefined
          ? `Property ${vacancy}% vacant — exceeds 50% guardrail.`
          : `Gross recapture ${recap.toFixed(1)}% below 95% threshold.`;
      return [
        {
          id: makeId("act"),
          kind: "escalate",
          label: `Escalated batch #${batch} to AP reviewer`,
          target: "Dana Chen (AP Lead)",
          details: `${reason} Assigned batch with note and expected SLA of 4 business hours.`,
        },
        {
          id: makeId("act"),
          kind: "send_email",
          label: "Sent notification email",
          target: "dana.chen@harvestpeak.example",
          details: `Subject: Pre-bill batch #${batch} needs review\n\nA batch was held back from auto-approval. ${reason} Please review and confirm whether to approve or adjust.`,
        },
      ];
    }
    if (status === "skipped") {
      const batch = hints.batchNumber ?? 4881;
      // If we have a recapture number, the skip was threshold-based (left for
      // human review). Otherwise it's treated as a data-quality skip.
      if (hints.grossRecapture !== undefined) {
        return [
          {
            id: makeId("act"),
            kind: "skip",
            label: `Left batch #${batch} for human review`,
            details: `Gross recapture ${hints.grossRecapture.toFixed(1)}% below approval threshold. Batch flagged as pending and assigned to the AP review queue — no approval made.`,
          },
        ];
      }
      return [
        {
          id: makeId("act"),
          kind: "skip",
          label: `Skipped batch #${batch} — data incomplete`,
          details: "Meter reading missing on 2 units (12B, 14C). Left the batch pending. Will retry on next trigger.",
        },
      ];
    }
    return [
      {
        id: makeId("act"),
        kind: "note",
        label: "Could not evaluate batch",
        details: "Pre-bill data endpoint returned HTTP 503. No changes made; alert raised to monitoring.",
      },
    ];
  }

  if (isTour) {
    const seed = hints.batchNumber ?? Math.floor(Math.random() * 10000);
    const lead =
      hints.leadName ?? `${pick(FIRST_NAMES, seed)} ${pick(LAST_NAMES, seed + 1)}`;
    const leadPhone = hints.leadPhone ?? fakePhone(seed);
    const agentName = hints.leasingAgentName ?? pick(LEASING_AGENT_NAMES, seed + 2);
    const agentPhone = hints.leasingAgentPhone ?? fakePhone(seed + 10);
    const property = hints.propertyName ?? pick(PROPERTY_LIST, seed + 3);

    if (status === "success") {
      return [
        {
          id: makeId("act"),
          kind: "send_sms",
          label: `Sent SMS to ${agentName}`,
          target: agentPhone,
          details: `Hi ${agentName.split(" ")[0]} — ${lead} is scheduled for a 2BR tour at ${property} in ~30 minutes. Phone: ${leadPhone}. Notes: has pets, prefers high floor. Reply after the tour and I'll update the lead record.`,
        },
      ];
    }
    if (status === "escalated") {
      return [
        {
          id: makeId("act"),
          kind: "send_sms",
          label: `Sent SMS to ${agentName}`,
          target: agentPhone,
          details: `Reminder for ${lead}'s 2BR tour at ${property} in ~30 min. Phone: ${leadPhone}.`,
        },
        {
          id: makeId("act"),
          kind: "delegate",
          label: "Delegated application send to Leasing AI",
          target: "Leasing AI",
          details: `${agentName} replied asking us to send ${lead} an application. That's outside our skill scope — passed to Leasing AI with full lead context (floorplan: 2BR, move-in target: next month).`,
        },
      ];
    }
    if (status === "skipped") {
      return [
        {
          id: makeId("act"),
          kind: "skip",
          label: "Skipped — tour canceled before reminder window",
          details: `${lead}'s tour was canceled 45 minutes before reminder. No SMS sent.`,
        },
      ];
    }
    return [
      {
        id: makeId("act"),
        kind: "note",
        label: "SMS delivery failed",
        target: agentPhone,
        details: "Twilio returned error 30008 (unknown error). No retry attempted; alert raised to monitoring.",
      },
    ];
  }

  if (isMoveIn) {
    const seed = hints.batchNumber ?? Math.floor(Math.random() * 10000);
    const resident =
      hints.residentName ?? `${pick(FIRST_NAMES, seed)} ${pick(LAST_NAMES, seed + 1)}`;
    const items = hints.checklistItems ?? 3;
    if (status === "success") {
      return [
        {
          id: makeId("act"),
          kind: "send_email",
          label: `Sent move-in nudge email to ${resident}`,
          target: `${resident.toLowerCase().replace(" ", ".")}@example.com`,
          details: `Reminded resident about ${items} outstanding checklist items (renter's insurance, utility transfer, move-in inspection). Included direct links to complete each in the resident portal.`,
        },
      ];
    }
    if (status === "escalated") {
      return [
        {
          id: makeId("act"),
          kind: "escalate",
          label: `Escalated ${resident} to on-site leasing office`,
          details: "Resident has not completed renter's insurance 3 days before move-in. Assigned to office lead for direct outreach.",
        },
      ];
    }
    if (status === "skipped") {
      return [
        {
          id: makeId("act"),
          kind: "skip",
          label: `Skipped — ${resident} already completed all items`,
          details: "No remaining checklist items; no message sent.",
        },
      ];
    }
    return [
      {
        id: makeId("act"),
        kind: "note",
        label: "Email delivery failed",
        details: "Resident email bounced. Queued a follow-up SMS attempt for the next run.",
      },
    ];
  }

  // Generic fallback — derive actions from the agent's declared skills.
  const skillCount = status === "success" ? 2 : 1;
  const picked = version.skillIds.slice(0, skillCount);
  if (picked.length > 0) {
    return picked.map((s) => ({
      id: makeId("act"),
      kind: "note" as RunActionKind,
      label: `Called skill: ${s.replace(/^skill\./, "").replace(/_/g, " ")}`,
    }));
  }
  return [
    {
      id: makeId("act"),
      kind: "note",
      label: status === "success" ? "Completed successfully" : "No action taken",
    },
  ];
}

/**
 * Build a short, plausible transcript for a test-message simulation. For
 * voice we include a system turn noting recording consent; for SMS/email
 * we only show the text turns. This stays deliberately short — the goal is
 * to demonstrate what the transcript UI looks like, not to mock a full
 * 20-turn conversation.
 *
 * If the agent has an extraction schema defined, we also populate a
 * stub extraction payload so the Runs tab has something to render for the
 * end-of-conversation summary. Field values are invented; that's fine for
 * the prototype and flagged via `summary` wording.
 */
function buildSyntheticTranscript({
  channel,
  callerLabel,
  inboundBody,
  version,
}: {
  channel: "sms" | "email" | "voice";
  callerLabel: string;
  inboundBody: string;
  version: AgentVersion;
}): RunTranscript {
  const turns: TranscriptTurn[] = [];
  if (channel === "voice") {
    turns.push({
      role: "system",
      at: "00:00",
      text: "Call connected. Recording consent played.",
    });
  }
  turns.push({
    role: "caller",
    at: channel === "voice" ? "00:02" : undefined,
    text: inboundBody,
  });
  // Agent's first response — reflects back the caller's message and offers
  // the next logical step. Keeping this brand-neutral so it reads OK for
  // both leasing and resident agents.
  turns.push({
    role: "agent",
    at: channel === "voice" ? "00:06" : undefined,
    text:
      `Thanks ${callerLabel.split(" ")[0] || "there"} — let me take a look. ` +
      `I'll pull up the details and get back to you in a moment.`,
  });
  turns.push({
    role: "caller",
    at: channel === "voice" ? "00:18" : undefined,
    text: "Sounds good, thanks.",
  });
  turns.push({
    role: "agent",
    at: channel === "voice" ? "00:22" : undefined,
    text:
      `I have what I need. I'll make sure someone from the team follows up ` +
      `with you today if there's anything else you'd like to know.`,
  });

  const extraction = version.extraction?.enabled
    ? buildStubExtraction(version.extraction, callerLabel, inboundBody)
    : undefined;

  return {
    channel,
    turns,
    durationSeconds: channel === "voice" ? 42 : undefined,
    recordingUrl: undefined,
    extraction,
  };
}

/**
 * Populate the extraction payload with plausible-but-obviously-synthetic
 * values. Real values come from the LLM at runtime; this just mirrors the
 * schema shape so the UI has something to show.
 */
function buildStubExtraction(
  cfg: ExtractionCfg,
  callerLabel: string,
  inboundBody: string
): NonNullable<RunTranscript["extraction"]> {
  const fields: Record<string, string | number | boolean | null> = {};
  for (const f of cfg.fields) {
    switch (f.type) {
      case "boolean":
        fields[f.name] = true;
        break;
      case "number":
        fields[f.name] = 1;
        break;
      case "choice":
        fields[f.name] = f.choices?.[0] ?? null;
        break;
      case "date":
        fields[f.name] = new Date().toISOString().slice(0, 10);
        break;
      default:
        fields[f.name] =
          f.name.toLowerCase().includes("name") ? callerLabel :
          inboundBody.trim().slice(0, 60);
    }
  }
  const summary = cfg.summaryEnabled
    ? `Test run: caller ${callerLabel} reached out about "${inboundBody.trim().slice(0, 40)}…". Agent acknowledged and offered follow-up.`
    : undefined;
  return {
    summary,
    fields,
    // Run every action on the test message so authors can see the full
    // downstream effect in one shot.
    actionsTaken: cfg.actions.map((a) => a.label),
  };
}

function pickRunSummary(agentName: string, status: RunRecord["status"]): string {
  if (agentName.includes("pre-bill") || agentName.includes("pre bill")) {
    if (status === "success") return "Gross recapture 96.4%. Approved batch #4881.";
    if (status === "escalated") return "Gross recapture 91.2% — below threshold. Escalated to human.";
    if (status === "skipped") return "Meter reading missing on 2 units. Skipped.";
    return "Unable to evaluate batch.";
  }
  if (agentName.includes("Tour")) {
    if (status === "success") return "Texted Amy Nguyen re: Jason Lee (2BR, pets). Agent confirmed.";
    if (status === "escalated") return "Lead requested application — delegated to Leasing AI.";
    if (status === "skipped") return "Tour canceled before reminder window. No message sent.";
    return "SMS delivery failed.";
  }
  return status === "success" ? "Completed successfully." : "Did not complete.";
}

export function CustomAgentsProvider({ children }: { children: React.ReactNode }) {
  const [agents, setAgents] = useState<CustomAgent[]>([]);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    const freshSeeds = hydrateCostEstimates(seedAgents()).map((a) =>
      a.runs && a.runs.length > 0 ? a : { ...a, runs: simulatedRunsFor(a) }
    );

    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as CustomAgent[];
        const existing = hydrateCostEstimates(parsed);
        // Merge in any seeded agents (e.g. the migrated Leasing/Maintenance/etc.)
        // that aren't present in the user's stored payload yet. We key on id so
        // the user's own edits are preserved while newly-added canonical agents
        // still appear in the roster.
        const existingIds = new Set(existing.map((a) => a.id));
        const missingSeeds = freshSeeds.filter((s) => !existingIds.has(s.id));
        if (missingSeeds.length > 0) {
          setAgents([...missingSeeds, ...existing]);
        } else {
          setAgents(existing);
        }
        return;
      }
    } catch {
      // ignore
    }
    setAgents(freshSeeds);
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
    } catch {
      // ignore
    }
  }, [agents]);

  // Publish a lightweight entry-point registry to localStorage so the
  // oxp-agent-widget.js on legacy Smarty pages can discover which agents
  // target each module — no backend API required for this prototype phase.
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      const registry: Array<{
        id: string;
        name: string;
        moduleKey: string;
        label: string;
        lifecycle: string;
      }> = [];

      for (const agent of agents) {
        if (!agent.entryPoints) continue;
        if (agent.lifecycle !== "live" && agent.lifecycle !== "paused" && agent.lifecycle !== "dry_run") continue;
        for (const ep of agent.entryPoints) {
          if (!ep.enabled) continue;
          registry.push({
            id: agent.id,
            name: agent.name,
            moduleKey: ep.moduleKey,
            label: ep.label || agent.name,
            lifecycle: agent.lifecycle,
          });
        }
      }

      window.localStorage.setItem(
        "oxp-agent-entry-points",
        JSON.stringify(registry)
      );
    } catch {
      // ignore
    }
  }, [agents]);

  const updateAgent = useCallback((id: string, updater: (a: CustomAgent) => CustomAgent) => {
    setAgents((prev) => prev.map((a) => (a.id === id ? updater(a) : a)));
  }, []);

  const getAgent = useCallback((id: string) => agents.find((a) => a.id === id), [agents]);

  const createDraft = useCallback<CustomAgentsContextValue["createDraft"]>((seed) => {
    const id = makeId("custom");
    const version: AgentVersion = {
      ...emptyVersion(1),
      name: seed?.name ?? "",
    };
    const agent: CustomAgent = {
      id,
      name: seed?.name ?? "",
      description: seed?.description ?? "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: PMC_NAME,
      lifecycle: "draft",
      activeVersion: 1,
      dryRunVersions: [],
      delegationEnabled: true,
      capabilityTags: [],
      versions: [version],
      runs: [],
      adoptedFromRosterId: seed?.adoptedFromRosterId,
    };
    setAgents((prev) => [agent, ...prev]);
    return agent;
  }, []);

  const createForkedDraft = useCallback<CustomAgentsContextValue["createForkedDraft"]>(
    (source) => {
      const id = makeId("custom");
      const forked = forkFromEntrataAgent(source);
      const seededVersion: AgentVersion = {
        ...forked.version,
        costEstimate: estimateCost(forked.version),
      };
      // Capture the Entrata-maintained configuration at fork time so the PM
      // can revert back to it later from the Versions tab. We deep-clone so
      // nothing the user later edits on v1 leaks back into the baseline.
      const baselineSnapshot: AgentVersion = JSON.parse(
        JSON.stringify(seededVersion)
      );
      baselineSnapshot.createdBy = "Entrata";
      const agent: CustomAgent = {
        id,
        name: forked.name,
        description: forked.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: PMC_NAME,
        lifecycle: "draft",
        activeVersion: 1,
        dryRunVersions: [],
        delegationEnabled: true,
        capabilityTags: forked.capabilityTags,
        versions: [seededVersion],
        runs: [],
        forkedFromEntrataId: source.id,
        forkedFromEntrataName: source.name,
        systemBaseline: baselineSnapshot,
      };
      setAgents((prev) => [agent, ...prev]);
      return agent;
    },
    []
  );

  const updateDraftVersion = useCallback<CustomAgentsContextValue["updateDraftVersion"]>(
    (id, versionNumber, patch) => {
      updateAgent(id, (agent) => {
        const targetVersionNumber = versionNumber ?? agent.activeVersion;
        const versions = agent.versions.map((v) => {
          if (v.versionNumber !== targetVersionNumber) return v;
          const next: AgentVersion = { ...v, ...patch };
          next.costEstimate = estimateCost(next);
          return next;
        });
        // Only reflect name/description from the active version, never from a pending
        // edit — so a half-written dry-run clone never overwrites the agent card.
        const activeVersion =
          versions.find((v) => v.versionNumber === agent.activeVersion) ?? versions[0];
        return {
          ...agent,
          name: activeVersion.name || agent.name,
          description: activeVersion.prompt.slice(0, 140) || agent.description,
          versions,
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [updateAgent]
  );

  const deleteAgent = useCallback<CustomAgentsContextValue["deleteAgent"]>((id) => {
    setAgents((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const runSilentCompile = useCallback(
    async (id: string, versionNumber: number) => {
      updateAgent(id, (agent) => ({
        ...agent,
        lifecycle: "setting_up",
        versions: agent.versions.map((v) =>
          v.versionNumber === versionNumber
            ? { ...v, compilation: { ...v.compilation, status: "compiling" } }
            : v
        ),
      }));
      const agentSnap = agents.find((a) => a.id === id);
      const versionSnap =
        agentSnap?.versions.find((v) => v.versionNumber === versionNumber) ??
        emptyVersion(versionNumber);
      const compilation = await compileAgent(versionSnap);
      updateAgent(id, (agent) => ({
        ...agent,
        versions: agent.versions.map((v) =>
          v.versionNumber === versionNumber ? { ...v, compilation } : v
        ),
      }));
    },
    [agents, updateAgent]
  );

  const deployDryRun = useCallback<CustomAgentsContextValue["deployDryRun"]>(
    async (id, versionNumber) => {
      const agent = agents.find((a) => a.id === id);
      if (!agent) return;
      // If a version wasn't specified, pick the newest pending version; if none, use the active.
      const target =
        versionNumber ??
        (agent.dryRunVersions.length > 0
          ? Math.max(...agent.dryRunVersions)
          : agent.activeVersion);

      // If this is a brand-new draft going into dry-run for the first time, flip the
      // agent-level lifecycle to dry_run (the active version itself is in dry-run).
      // If the agent is already live/paused, keep that lifecycle — dry-run versions
      // run in parallel with whatever the active version is doing.
      const isDraftFirstDryRun = agent.lifecycle === "draft" && target === agent.activeVersion;

      await runSilentCompile(id, target);
      updateAgent(id, (a) => ({
        ...a,
        lifecycle: isDraftFirstDryRun ? "dry_run" : a.lifecycle,
        // Record this version as running in dry-run, unless it's already the active version
        // (in which case the lifecycle itself tracks that state).
        dryRunVersions:
          target === a.activeVersion
            ? a.dryRunVersions.filter((v) => v !== target)
            : Array.from(new Set([...a.dryRunVersions, target])),
        capabilityTags: Array.from(
          new Set([
            ...a.capabilityTags,
            ...(a.versions.find((v) => v.versionNumber === target)?.skillIds ?? []).map(
              (s) => s.replace(/^skill\./, "")
            ),
          ])
        ),
      }));
      setTimeout(() => {
        updateAgent(id, (a) => ({
          ...a,
          runs: [...simulatedRunsFor(a, 4, target, "dry_run"), ...a.runs].slice(0, 60),
        }));
      }, 600);
    },
    [agents, runSilentCompile, updateAgent]
  );

  const deployLive = useCallback<CustomAgentsContextValue["deployLive"]>(
    async (id, versionNumber) => {
      const agent = agents.find((a) => a.id === id);
      if (!agent) return;
      const target = versionNumber ?? agent.activeVersion;
      await runSilentCompile(id, target);
      updateAgent(id, (a) => ({
        ...a,
        lifecycle: "live",
        activeVersion: target,
        // Whichever version just went live is no longer "in dry-run" — it IS the live version.
        dryRunVersions: a.dryRunVersions.filter((v) => v !== target),
        capabilityTags: Array.from(
          new Set([
            ...a.capabilityTags,
            ...(a.versions.find((v) => v.versionNumber === target)?.skillIds ?? []).map(
              (s) => s.replace(/^skill\./, "")
            ),
          ])
        ),
      }));
      setTimeout(() => {
        updateAgent(id, (a) => ({
          ...a,
          runs: [...simulatedRunsFor(a, 3, target, "live"), ...a.runs].slice(0, 60),
        }));
      }, 600);
    },
    [agents, runSilentCompile, updateAgent]
  );

  const pause = useCallback<CustomAgentsContextValue["pause"]>(
    (id) => updateAgent(id, (a) => ({ ...a, lifecycle: "paused" })),
    [updateAgent]
  );

  const resume = useCallback<CustomAgentsContextValue["resume"]>(
    (id) =>
      updateAgent(id, (a) => ({
        ...a,
        // Resuming a paused agent returns it to live. Dry-run versions keep running independently.
        lifecycle: "live",
      })),
    [updateAgent]
  );

  const stop = useCallback<CustomAgentsContextValue["stop"]>(
    (id) => updateAgent(id, (a) => ({ ...a, lifecycle: "paused" })),
    [updateAgent]
  );

  const createNewVersion = useCallback<CustomAgentsContextValue["createNewVersion"]>(
    (id, fromVersion) => {
      let created: number | undefined;
      updateAgent(id, (agent) => {
        const nextNumber = Math.max(...agent.versions.map((v) => v.versionNumber)) + 1;
        // Clone from the caller-specified version, otherwise from whatever's live.
        const base =
          (fromVersion !== undefined
            ? agent.versions.find((v) => v.versionNumber === fromVersion)
            : undefined) ??
          agent.versions.find((v) => v.versionNumber === agent.activeVersion) ??
          agent.versions[agent.versions.length - 1];
        const next: AgentVersion = {
          ...base,
          versionNumber: nextNumber,
          createdAt: new Date().toISOString(),
          createdBy: "Current user",
          compilation: { status: "none" },
        };
        created = nextNumber;
        // New versions start as pending edits — they're NOT added to dryRunVersions
        // until the user explicitly saves them as dry-run via deployDryRun().
        return {
          ...agent,
          versions: [...agent.versions, next],
          updatedAt: new Date().toISOString(),
        };
      });
      return created;
    },
    [updateAgent]
  );

  const discardDryRunVersion = useCallback<CustomAgentsContextValue["discardDryRunVersion"]>(
    (id, versionNumber) => {
      updateAgent(id, (agent) => {
        const target = versionNumber;
        const targetVersion = agent.versions.find((v) => v.versionNumber === target);
        if (!targetVersion) return agent;
        // Only discard versions that were never deployed (no runs, no successful compilation).
        const hasRuns = agent.runs.some((r) => r.versionNumber === target);
        const compiled = targetVersion.compilation.status === "ready";
        if (hasRuns || compiled) {
          // Version has artifacts — keep it in history, just stop logging it in dry-run.
          return {
            ...agent,
            dryRunVersions: agent.dryRunVersions.filter((v) => v !== target),
            updatedAt: new Date().toISOString(),
          };
        }
        // Pristine pending version — remove it entirely.
        return {
          ...agent,
          dryRunVersions: agent.dryRunVersions.filter((v) => v !== target),
          versions: agent.versions.filter((v) => v.versionNumber !== target),
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [updateAgent]
  );

  const deleteVersion = useCallback<CustomAgentsContextValue["deleteVersion"]>(
    (id, versionNumber) => {
      updateAgent(id, (agent) => {
        // Safety: never delete the live/paused version — we'd leave the agent broken.
        if (versionNumber === agent.activeVersion) return agent;
        // Safety: never delete the last remaining version.
        if (agent.versions.length <= 1) return agent;
        const nextMap = { ...(agent.propertyVersionMap ?? {}) };
        for (const [prop, ver] of Object.entries(nextMap)) {
          if (ver === versionNumber) delete nextMap[prop];
        }
        return {
          ...agent,
          versions: agent.versions.filter((v) => v.versionNumber !== versionNumber),
          runs: agent.runs.filter((r) => r.versionNumber !== versionNumber),
          dryRunVersions: agent.dryRunVersions.filter((v) => v !== versionNumber),
          propertyVersionMap: nextMap,
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [updateAgent]
  );

  const promoteDryRunToLive = useCallback<CustomAgentsContextValue["promoteDryRunToLive"]>(
    async (id, versionNumber) => {
      const agent = agents.find((a) => a.id === id);
      if (!agent) return;
      const target = versionNumber;
      await runSilentCompile(id, target);
      updateAgent(id, (a) => ({
        ...a,
        activeVersion: target,
        // The promoted version is no longer in dry-run — it's the live one now.
        // Other dry-run versions keep running independently.
        dryRunVersions: a.dryRunVersions.filter((v) => v !== target),
        lifecycle: "live",
      }));
    },
    [agents, runSilentCompile, updateAgent]
  );

  const revertToVersion = useCallback<CustomAgentsContextValue["revertToVersion"]>(
    async (id, versionNumber, mode) => {
      const agent = agents.find((a) => a.id === id);
      if (!agent) return undefined;
      const source = agent.versions.find((v) => v.versionNumber === versionNumber);
      if (!source) return undefined;

      // Clone the historical version into a new version number so history stays immutable.
      let cloneNumber: number | undefined;
      updateAgent(id, (a) => {
        const nextNumber = Math.max(...a.versions.map((v) => v.versionNumber)) + 1;
        cloneNumber = nextNumber;
        const clone: AgentVersion = {
          ...source,
          versionNumber: nextNumber,
          createdAt: new Date().toISOString(),
          createdBy: "Current user",
          compilation: { status: "none" },
        };
        return {
          ...a,
          versions: [...a.versions, clone],
          updatedAt: new Date().toISOString(),
        };
      });

      if (!cloneNumber) return undefined;

      if (mode === "live") {
        await runSilentCompile(id, cloneNumber);
        updateAgent(id, (a) => ({
          ...a,
          activeVersion: cloneNumber!,
          dryRunVersions: a.dryRunVersions.filter((v) => v !== cloneNumber),
          lifecycle: "live",
        }));
      }
      return cloneNumber;
    },
    [agents, runSilentCompile, updateAgent]
  );

  const restoreSystemBaseline = useCallback<CustomAgentsContextValue["restoreSystemBaseline"]>(
    async (id, mode) => {
      const agent = agents.find((a) => a.id === id);
      if (!agent || !agent.systemBaseline) return undefined;

      let cloneNumber: number | undefined;
      updateAgent(id, (a) => {
        if (!a.systemBaseline) return a;
        const nextNumber = Math.max(...a.versions.map((v) => v.versionNumber)) + 1;
        cloneNumber = nextNumber;
        const clone: AgentVersion = {
          ...JSON.parse(JSON.stringify(a.systemBaseline)),
          versionNumber: nextNumber,
          createdAt: new Date().toISOString(),
          createdBy: "Current user (restored from Entrata)",
          compilation: { status: "none" },
        };
        return {
          ...a,
          versions: [...a.versions, clone],
          updatedAt: new Date().toISOString(),
        };
      });

      if (!cloneNumber) return undefined;

      if (mode === "live") {
        await runSilentCompile(id, cloneNumber);
        updateAgent(id, (a) => ({
          ...a,
          activeVersion: cloneNumber!,
          dryRunVersions: a.dryRunVersions.filter((v) => v !== cloneNumber),
          lifecycle: "live",
        }));
      }
      return cloneNumber;
    },
    [agents, runSilentCompile, updateAgent]
  );

  const seedSimulatedRuns = useCallback<CustomAgentsContextValue["seedSimulatedRuns"]>(
    (id, count = 4) =>
      updateAgent(id, (a) => ({
        ...a,
        runs: [...simulatedRunsFor(a, count), ...a.runs].slice(0, 40),
      })),
    [updateAgent]
  );

  const estimateHistoryRunCount = useCallback<CustomAgentsContextValue["estimateHistoryRunCount"]>(
    (id, { versionNumber, windowDays }) => {
      const a = agents.find((x) => x.id === id);
      if (!a) return 0;
      const v =
        a.versions.find(
          (x) => x.versionNumber === (versionNumber ?? a.activeVersion)
        ) ?? a.versions[0];
      if (!v) return 0;
      return Math.min(estimatedHistoryCount(v, windowDays), 200);
    },
    [agents]
  );

  const simulateHistory = useCallback<CustomAgentsContextValue["simulateHistory"]>(
    async (id, { versionNumber, windowDays }) => {
      // Small artificial delay so the "Simulating..." overlay has something to show —
      // mirrors the feel of a real backend doing the work. Not user-configurable.
      await new Promise((r) => setTimeout(r, 900));
      let generated = 0;
      updateAgent(id, (a) => {
        const targetV = versionNumber ?? a.activeVersion;
        const newRuns = historySimulationRunsFor(a, targetV, windowDays);
        generated = newRuns.length;
        // Keep plenty of history for simulations (bump past the 40-run cap used for one-off sims).
        return {
          ...a,
          runs: [...newRuns, ...a.runs].slice(0, 500),
        };
      });
      return generated;
    },
    [updateAgent]
  );

  const simulateTestMessage = useCallback<CustomAgentsContextValue["simulateTestMessage"]>(
    async (id, { versionNumber, channel, body, from }) => {
      // Brief delay so the UI can render a "Simulating…" state.
      await new Promise((r) => setTimeout(r, 500));
      const a = agents.find((x) => x.id === id);
      if (!a) throw new Error("Agent not found");
      const targetV = versionNumber ?? a.activeVersion;
      const version =
        a.versions.find((v) => v.versionNumber === targetV) ?? a.versions[0];
      const channelLabel =
        channel === "sms" ? "SMS" : channel === "email" ? "email" : "voice call";
      const fromLabel = from?.trim() || "Test sender";
      const snippet = body.trim().slice(0, 72) + (body.trim().length > 72 ? "…" : "");

      const inboundAction: RunAction = {
        id: makeId("act"),
        kind: channel === "sms" ? "send_sms" : channel === "email" ? "send_email" : "send_voice",
        // We flip the label so the action reads as "received" rather than "sent" —
        // the action tray's verb prefix will say "Would …", which makes sense because
        // in a real run this would be a real inbound event.
        label: `Received ${channelLabel} from ${fromLabel}`,
        target: from?.trim() || undefined,
        details: body,
      };

      const followUpActions = actionsFor(a, version, "success", {
        leadName: from?.trim(),
      });

      // Build a short synthetic transcript so the conversation log is
      // populated from the first test message — the Runs tab won't render
      // the transcript viewer if this is absent. We only emit a transcript
      // for L4 agents (or unclassified drafts that have voice/SMS on) so we
      // don't invent conversations for workflow-style L3 agents.
      const isConversational =
        version.classification === "L4" ||
        (version.classification === undefined &&
          (version.communication?.channels ?? []).length > 0);
      const transcript: RunTranscript | undefined = isConversational
        ? buildSyntheticTranscript({
            channel,
            callerLabel: fromLabel,
            inboundBody: body,
            version,
          })
        : undefined;

      const run: RunRecord = {
        id: makeId("run"),
        versionNumber: version.versionNumber,
        at: new Date().toISOString(),
        mode: "dry_run",
        triggerId: "test-message",
        triggerSummary: `Test ${channelLabel} from ${fromLabel}`,
        status: "success",
        summary: `Processed test ${channelLabel}: "${snippet}"`,
        skillsCalled: version.skillIds.slice(0, 2),
        actions: [inboundAction, ...followUpActions],
        tokensUsed: 600 + Math.floor(Math.random() * 400),
        cost: 0.00054 + Math.random() * 0.00015,
        memoryContextUsed: 0,
        transcript,
      };

      updateAgent(id, (current) => ({
        ...current,
        runs: [run, ...current.runs].slice(0, 500),
      }));
      return run;
    },
    [agents, updateAgent]
  );

  const setPropertyVersion = useCallback<CustomAgentsContextValue["setPropertyVersion"]>(
    (id, property, versionNumber) => {
      updateAgent(id, (agent) => {
        const current = { ...(agent.propertyVersionMap ?? {}) };
        if (versionNumber === null) {
          if (!(property in current)) return agent;
          delete current[property];
        } else {
          // Guardrail: only allow eligible (active, non-dry-run, existing) versions.
          const eligible = new Set(
            getEligibleLiveVersions(agent).map((v) => v.versionNumber)
          );
          if (!eligible.has(versionNumber)) return agent;
          // If the user picks the agent's default active version, drop the
          // override — keeps the map minimal and semantically equivalent.
          if (versionNumber === agent.activeVersion) {
            if (!(property in current)) return agent;
            delete current[property];
          } else {
            if (current[property] === versionNumber) return agent;
            current[property] = versionNumber;
          }
        }
        return {
          ...agent,
          propertyVersionMap: current,
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [updateAgent]
  );

  const updateEntryPoints = useCallback<CustomAgentsContextValue["updateEntryPoints"]>(
    (id, entryPoints) => {
      updateAgent(id, (a) => ({ ...a, entryPoints, updatedAt: new Date().toISOString() }));
    },
    [updateAgent]
  );

  const value = useMemo<CustomAgentsContextValue>(
    () => ({
      agents,
      getAgent,
      createDraft,
      createForkedDraft,
      updateDraftVersion,
      deleteAgent,
      deployDryRun,
      deployLive,
      pause,
      resume,
      stop,
      createNewVersion,
      discardDryRunVersion,
      deleteVersion,
      promoteDryRunToLive,
      revertToVersion,
      restoreSystemBaseline,
      seedSimulatedRuns,
      simulateHistory,
      estimateHistoryRunCount,
      simulateTestMessage,
      setPropertyVersion,
      updateEntryPoints,
    }),
    [
      agents,
      getAgent,
      createDraft,
      createForkedDraft,
      updateDraftVersion,
      deleteAgent,
      deployDryRun,
      deployLive,
      pause,
      resume,
      stop,
      createNewVersion,
      discardDryRunVersion,
      deleteVersion,
      promoteDryRunToLive,
      revertToVersion,
      restoreSystemBaseline,
      seedSimulatedRuns,
      simulateHistory,
      estimateHistoryRunCount,
      simulateTestMessage,
      setPropertyVersion,
      updateEntryPoints,
    ]
  );

  return (
    <CustomAgentsContext.Provider value={value}>{children}</CustomAgentsContext.Provider>
  );
}

export function useCustomAgents() {
  const ctx = useContext(CustomAgentsContext);
  if (!ctx) throw new Error("useCustomAgents must be used within CustomAgentsProvider");
  return ctx;
}

export { PMC_NAME, PMC_PROPERTIES };
