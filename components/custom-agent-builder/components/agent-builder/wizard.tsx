"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  useCustomAgents,
  formatScheduleTrigger,
  AGENT_CLASSIFICATION_OPTIONS,
  ESCALATION_TRIGGER_CATALOG,
  LANGUAGE_OPTIONS,
  LLM_MODEL_OPTIONS,
  defaultEscalationPolicy,
  type AgentClassification,
  type Trigger,
  type AgentVersion,
  type CommunicationCfg,
  type CommunicationChannel,
  type EscalationAsyncAction,
  type EscalationAsyncHandoff,
  type EscalationDestinationKind,
  type EscalationPolicy,
  type EscalationTrigger,
  type EscalationTriggerId,
  type EscalationVoiceAction,
  type EscalationVoiceHandoff,
  type ExtractionAction,
  type ExtractionActionDestination,
  type ExtractionCfg,
  type ExtractionField,
  type ExtractionFieldType,
  type KnowledgeBaseCfg,
  type KnowledgeBaseSource,
  type KnowledgeBaseSourceKind,
  type LanguageCode,
  type LlmModelId,
  type MemoryCfg,
  type PhoneAssignmentMode,
  type SuccessMetric,
  type SuccessMetricUnit,
  type VoiceRuntimeCfg,
  ENTRY_POINT_MODULES,
  type AgentEntryPoint,
  type BrandVoiceSource,
  BRAND_VOICE_INHERIT_OPTIONS,
} from "../../lib/custom-agents-context";
import { TWILIO_CAMPAIGNS, FIRST_MESSAGE_MERGE_FIELDS } from "../../lib/twilio-campaigns";
import {
  DATA_CATALOG,
  EVENT_CATALOG,
  SKILL_CATALOG,
  VOICE_CATALOG,
} from "../../lib/custom-agents-catalog";
import {
  ENTRATA_API_CATALOG,
  ENTRATA_API_CATEGORIES,
  filterApis,
  type ApiCategory,
  type ApiExposure,
  type EntrataApiEntry,
} from "../../lib/entrata-apis-catalog";
import { TriggerEditor, newTrigger } from "./trigger-editor";
import { ThresholdWarning, ContextBar } from "./threshold-warning";
import { ThresholdConfirmDialog } from "./threshold-confirm-dialog";
import { evaluateContextUsage } from "../../lib/custom-agents-thresholds";
import {
  PMC_PROPERTIES,
  PMC_PROPERTY_RECORDS,
  getPropertyPrimaryEmail,
} from "../../lib/pmc-identity";
import { inferFromPrompt, inferSuccessMetrics } from "../../lib/custom-agents-inference";
import { formatCurrency } from "../../lib/custom-agents-cost";
import { DEFAULT_GUARDRAILS } from "../../lib/default-guardrails";
import { MCP_SERVER_CATALOG, type McpServerDefinition, type McpTool } from "../../lib/mcp-server-catalog";
import { formatMetricValue, computeTrend } from "../../lib/success-metrics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SettingUpOverlay } from "./setting-up-overlay";
import {
  Sparkles,
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  Clock,
  Zap,
  MessageSquare,
  Shield,
  Database,
  Wrench,
  Building2,
  Radio,
  DollarSign,
  ClipboardCheck,
  Trash2,
  AlertTriangle,
  Brain,
  Info,
  Target,
  TrendingUp,
  TrendingDown,
  Star,
  FileEdit,
  Search,
  Lock,
  Globe,
  Play,
  Square,
  Volume2,
  BookOpen,
  ClipboardList,
  FileText,
  Link as LinkIcon,
  Type,
  Upload,
  Sliders,
  ChevronDown,
  ChevronUp,
  LifeBuoy,
  PhoneForwarded,
  Moon,
  UserRound,
  ExternalLink,
  Repeat,
  Users,
} from "lucide-react";

type WizardProps = {
  agentId: string;
  /** The specific version being edited. For drafts, this is v1; for edits it's the pending clone. */
  versionNumber: number;
  /** When provided, exit actions call this instead of router.push (modal mode). */
  onClose?: () => void;
};

type StepDef = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  show: (v: AgentVersion) => boolean;
};

/**
 * Compliance-safe default opening line pre-populated into the voice
 * channel the first time the author turns voice on. Keeps the
 * recording-consent clause in place so an agent can't accidentally ship
 * without it — authors can always edit or strip it (US states differ in
 * what's required), but the starting point is audit-friendly.
 */
const DEFAULT_VOICE_OPENING_LINE =
  "Hi, this is {{agent.persona}} from {{property.name}}. This call may be recorded for quality purposes — how can I help you today?";

/**
 * True when Knowledge + Wrap-up (extraction) apply. L4 is the primary
 * conversational tier; L3 workflow agents lean on Data & Skills instead;
 * L5 inherits the richer wrap-up path. Unclassified drafts default to "yes"
 * so older drafts do not lose tabs mid-edit.
 *
 * Note: the Communication tab uses {@link showsCommunicationStep} instead,
 * so L3 authors still configure SMS / email / chat / voice when they need it.
 */
function isConversationalAgent(v: AgentVersion): boolean {
  if (v.classification === "L4") return true;
  if (v.classification === "L3") return false;
  return true;
}

/**
 * Communication is offered for every authoring tier we support in this
 * builder (L3–L5). L1 / L2 are roster-only tiers and never appear here.
 * Undefined classification (brand-new draft) still shows the tab so the
 * author can configure channels before the classification control "sticks".
 */
function showsCommunicationStep(v: AgentVersion): boolean {
  const c = v.classification;
  if (c === "L1" || c === "L2") return false;
  return true;
}

/**
 * Escalations only matter when the agent can actually talk to residents on
 * a channel — i.e. communication is turned on and at least one medium is
 * selected. Pure workflow agents with comms off skip the step entirely.
 */
function showsEscalationStep(v: AgentVersion): boolean {
  const cfg = v.communication;
  if (!cfg?.enabled) return false;
  return (cfg.channels?.length ?? 0) > 0;
}

const STEPS: StepDef[] = [
  { id: "name", label: "Name & prompt", icon: Sparkles, show: () => true },
  { id: "triggers", label: "Triggers & Entry Points", icon: Zap, show: () => true },
  // { id: "prompt", label: "Prompt", icon: MessageSquare, show: () => true },
  // { id: "success", label: "Success", icon: Target, show: () => true },
  { id: "data-skills", label: "Data & Skills", icon: Database, show: () => true },
  { id: "properties", label: "Properties", icon: Building2, show: () => true },
  {
    id: "knowledge",
    label: "Knowledge",
    icon: BookOpen,
    show: isConversationalAgent,
  },
  {
    id: "communication",
    label: "Conversational Abilities",
    icon: Radio,
    show: showsCommunicationStep,
  },
  {
    id: "extraction",
    label: "Wrap-up",
    icon: ClipboardList,
    show: isConversationalAgent,
  },
  {
    id: "escalation",
    label: "Escalation",
    icon: LifeBuoy,
    show: showsEscalationStep,
  },
  // Entry Points merged into Triggers step above.
  // { id: "entry-points", label: "Entry Points", icon: ExternalLink, show: () => true },
  { id: "cost", label: "Cost Forecast", icon: DollarSign, show: () => true },
  // { id: "review", label: "Review", icon: ClipboardCheck, show: () => true },
];

export function AgentBuilderWizard({ agentId, versionNumber, onClose }: WizardProps) {
  const router = useRouter();
  const exit = onClose ?? (() => router.push("/agent-builder"));
  const {
    getAgent,
    updateDraftVersion,
    deployDryRun,
    deployLive,
    deleteAgent,
    promoteDryRunToLive,
    deleteVersion,
  } = useCustomAgents();
  const agent = getAgent(agentId);
  const [activeStep, setActiveStep] = useState(0);
  const [settingUp, setSettingUp] = useState<null | "dry" | "live">(null);
  const [pendingDeployMode, setPendingDeployMode] = useState<null | "dry" | "live">(null);

  const version = useMemo<AgentVersion | undefined>(
    () => agent?.versions.find((v) => v.versionNumber === versionNumber),
    [agent, versionNumber]
  );

  const visibleSteps = useMemo(() => {
    if (!version) return STEPS.filter((s) => s.show({} as AgentVersion));
    return STEPS.filter((s) => s.show(version));
  }, [version]);

  useEffect(() => {
    if (activeStep > visibleSteps.length - 1) setActiveStep(visibleSteps.length - 1);
  }, [activeStep, visibleSteps.length]);

  if (!agent || !version) {
    return (
      <div className="page-content">
        <p className="text-muted-foreground">Agent not found.</p>
      </div>
    );
  }

  // "Editing" means we're staging a new version on top of an already-deployed agent.
  // If the agent is still a draft, or we happen to be editing the active version (brand-new
  // draft path), it's the initial build, not an edit.
  const isEditing = agent.lifecycle !== "draft" && versionNumber !== agent.activeVersion;
  const current = visibleSteps[activeStep];

  const patch = (p: Partial<AgentVersion>) => updateDraftVersion(agentId, versionNumber, p);

  const stepIsValid = (): boolean => {
    switch (current?.id) {
      case "name":
        // Merged step now hosts name + classification + prompt + guardrails,
        // but we only hard-gate on the agent name so the author can hop
        // around the wizard freely. Classification and prompt are soft
        // nudges surfaced inline in the step; we re-validate them on the
        // final deploy screens. Blocking Next on every field frustrated
        // authors coming back to existing drafts that pre-date those
        // fields.
        return version.name.trim().length > 2;
      case "triggers":
        return (version.triggers?.length ?? 0) > 0;
      // Kept for when we re-enable the standalone Prompt / Properties steps.
      case "prompt":
        return version.prompt.trim().length > 10;
      case "properties":
        return (version.properties?.length ?? 0) > 0;
      default:
        return true;
    }
  };

  const next = () => setActiveStep((s) => Math.min(visibleSteps.length - 1, s + 1));
  const prev = () => setActiveStep((s) => Math.max(0, s - 1));

  const runDeploy = async (mode: "dry" | "live") => {
    setSettingUp(mode);
    if (mode === "dry") {
      // Dry-run save: compile and start logging THIS version in parallel with
      // whatever's currently live (if anything).
      await deployDryRun(agentId, versionNumber);
    } else if (isEditing) {
      // Promote this pending version to live. Whatever was live before becomes
      // historical; other dry-run versions keep running.
      await promoteDryRunToLive(agentId, versionNumber);
    } else {
      await deployLive(agentId, versionNumber);
    }
  };

  const onDeploy = async (mode: "dry" | "live") => {
    // Only block when we're deep enough into the context window that
    // hallucination risk is real (>= 50%). Amber zone shows inline warnings
    // but doesn't interrupt the flow.
    if (evaluateContextUsage(version).zone === "red") {
      setPendingDeployMode(mode);
      return;
    }
    await runDeploy(mode);
  };

  // "Save as draft" keeps all the edits in place but doesn't compile or start
  // logging. The version stays as a draft — the user can resume from the detail
  // view (or landing page, for brand-new agents) whenever they're ready.
  const saveDraft = () => {
    // Edits already persist on every keystroke via updateDraftVersion, so this
    // is really just a framed exit. For brand-new agents, send the user to the
    // landing page where the draft is visible in the Drafts section. Otherwise,
    // return to the agent detail view where the draft shows up in Versions.
    if (onClose) {
      onClose();
    } else if (isEditing) {
      router.push(`/agent-builder?view=detail&id=${agentId}`);
    } else {
      router.push("/agent-builder");
    }
  };

  return (
    <div className="page-content pb-10">
      {settingUp && (
        <SettingUpOverlay
          onDone={() => {
            setSettingUp(null);
            if (onClose) { onClose(); } else { router.push(`/agent-builder?view=detail&id=${agentId}`); }
          }}
        />
      )}

      <ThresholdConfirmDialog
        open={pendingDeployMode !== null}
        onOpenChange={(open) => { if (!open) setPendingDeployMode(null); }}
        version={version}
        cost={version.costEstimate}
        confirmLabel={
          pendingDeployMode === "live"
            ? isEditing
              ? `Save v${versionNumber} · deploy live`
              : "Deploy live"
            : isEditing
              ? `Save v${versionNumber} · run in dry-run`
              : "Deploy to dry-run"
        }
        onConfirm={() => {
          const mode = pendingDeployMode;
          setPendingDeployMode(null);
          if (mode) void runDeploy(mode);
        }}
      />

      <div className="flex items-start justify-between gap-4 pb-6">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            {isEditing
              ? `Editing v${versionNumber} · v${agent.activeVersion} still live`
              : "Agent Builder"}
          </p>
          <h1 className="font-heading text-2xl text-foreground">
            {version.name || "Build Your Own Agent"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isEditing
              ? "Your changes won't affect the running agent until you save. When you save, we'll record this as a new version."
              : "Describe what you want, and we'll build it for you."}
          </p>
        </div>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={saveDraft}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              <FileEdit className="h-3.5 w-3.5" />
              Save as draft
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  confirm(
                    `Discard v${versionNumber} and everything you've changed? This version will be removed entirely. v${agent.activeVersion} will keep running as-is.`
                  )
                ) {
                  deleteVersion(agentId, versionNumber);
                  if (onClose) { onClose(); } else { router.push(`/agent-builder?view=detail&id=${agentId}`); }
                }
              }}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Discard changes
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={saveDraft}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              <FileEdit className="h-3.5 w-3.5" />
              Save as draft
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm("Discard this draft?")) {
                  deleteAgent(agentId);
                  if (onClose) { onClose(); } else { router.push("/agent-builder"); }
                }
              }}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Discard
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <ol className="space-y-1">
            {visibleSteps.map((step, idx) => {
              const active = idx === activeStep;
              const done = idx < activeStep;
              const Icon = step.icon;
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => setActiveStep(idx)}
                    className={`flex w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left text-[13px] font-medium transition-colors ${
                      active
                        ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                        : done
                        ? "border-transparent bg-transparent text-foreground hover:bg-muted"
                        : "border-transparent bg-transparent text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                        active
                          ? "bg-indigo-600 text-white"
                          : done
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {done ? <Check className="h-3 w-3" /> : idx + 1}
                    </span>
                    <Icon className="h-3.5 w-3.5" />
                    {step.label}
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="rounded-xl border border-border bg-white p-6">
            {current?.id === "name" && <NameStep version={version} patch={patch} />}
            {current?.id === "triggers" && <TriggersStep version={version} patch={patch} agentId={agentId} />}
            {/* {current?.id === "prompt" && <PromptStep version={version} patch={patch} />} */}
            {/* {current?.id === "success" && <SuccessStep version={version} patch={patch} />} */}
            {current?.id === "data-skills" && <DataSkillsStep version={version} patch={patch} />}
            {current?.id === "properties" && <PropertiesStep version={version} patch={patch} />}
            {current?.id === "knowledge" && <KnowledgeStep version={version} patch={patch} />}
            {current?.id === "communication" && <CommunicationStep version={version} patch={patch} />}
            {current?.id === "extraction" && <ExtractionStep version={version} patch={patch} />}
            {current?.id === "escalation" && <EscalationStep version={version} patch={patch} />}
            {current?.id === "cost" && <CostDryRunStep version={version} patch={patch} />}
            {/* {current?.id === "review" && <ReviewStep version={version} />} */}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <Button variant="outline" onClick={prev} disabled={activeStep === 0} size="sm">
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            {activeStep < visibleSteps.length - 1 ? (
              <Button onClick={next} disabled={!stepIsValid()} size="sm">
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={saveDraft}>
                  <FileEdit className="mr-1 h-3.5 w-3.5" />
                  {isEditing ? `Save v${versionNumber} as draft` : "Save as draft"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => onDeploy("dry")}>
                  {isEditing
                    ? `Save v${versionNumber} · run in dry-run`
                    : "Deploy to dry-run"}
                </Button>
                <Button size="sm" onClick={() => onDeploy("live")}>
                  {isEditing
                    ? `Save v${versionNumber} · deploy live`
                    : "Deploy live"}
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ─────────── Step 1: Name + classification + prompt + guardrails ─────────── */

function NameStep({ version, patch }: { version: AgentVersion; patch: (p: Partial<AgentVersion>) => void }) {
  const selectedClassification = AGENT_CLASSIFICATION_OPTIONS.find(
    (o) => o.value === version.classification
  );
  const [aiHelperOpen, setAiHelperOpen] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [disableConfirmId, setDisableConfirmId] = useState<string | null>(null);

  const guardrails = version.structuredGuardrails ?? DEFAULT_GUARDRAILS.map((g) => ({ ...g }));
  if (!version.structuredGuardrails) {
    patch({ structuredGuardrails: guardrails });
  }

  const toggleGuardrail = (id: string) => {
    const guard = guardrails.find((g) => g.id === id);
    if (!guard || guard.locked) return;
    if (guard.enabled && guard.requiresAcknowledgment) {
      setDisableConfirmId(id);
      return;
    }
    patch({
      structuredGuardrails: guardrails.map((g) =>
        g.id === id ? { ...g, enabled: !g.enabled } : g
      ),
    });
  };

  const confirmDisable = () => {
    if (!disableConfirmId) return;
    patch({
      structuredGuardrails: guardrails.map((g) =>
        g.id === disableConfirmId ? { ...g, enabled: false } : g
      ),
    });
    setDisableConfirmId(null);
  };

  const generateAiSuggestion = () => {
    setAiLoading(true);
    setTimeout(() => {
      const name = version.name || "your agent";
      const cls = version.classification ?? "L3";
      let suggestion = "";
      if (cls === "L3") {
        suggestion = `You are ${name}, a workflow automation agent for Entrata property management.\n\n## Core Behavior\n- Execute the assigned task autonomously when triggered\n- Follow the decision rules exactly as configured\n- Log every action taken for audit purposes\n\n## Decision Framework\n- [DESCRIBE: What data should the agent check?]\n- [DESCRIBE: What thresholds or conditions trigger action?]\n- [DESCRIBE: What should happen when conditions are met vs. not met?]\n\n## Escalation Rules\n- Escalate to a human reviewer when:\n  - The data falls outside expected ranges\n  - Multiple conflicting signals are present\n  - The task involves an amount exceeding [THRESHOLD]\n\n## Constraints\n- Never modify data outside the scope of this task\n- Always include the reason for each decision in the audit log\n- Process records in order of priority, not arrival time`;
      } else {
        suggestion = `You are ${name}, a conversational AI assistant for Entrata property management.\n\n## Personality & Tone\n- Professional, helpful, and empathetic\n- Match the resident's communication style (formal/casual)\n- Keep responses concise but thorough\n\n## Core Responsibilities\n- [DESCRIBE: What topics should this agent handle?]\n- [DESCRIBE: What information can it access?]\n- [DESCRIBE: What actions can it take?]\n\n## Conversation Guidelines\n- Greet the resident and confirm their identity before sharing account details\n- Ask clarifying questions when the request is ambiguous\n- Summarize actions taken at the end of the conversation\n\n## Boundaries\n- Never provide legal advice or interpret lease terms as legal guidance\n- Do not share information about other residents\n- Escalate to a human when:\n  - The resident is upset or frustrated\n  - The request involves lease modifications\n  - You are unsure about the correct answer\n\n## Knowledge Sources\n- Property knowledge base for FAQs and policies\n- Resident ledger for account-specific questions\n- Work order system for maintenance requests`;
      }
      setAiSuggestion(suggestion);
      setAiLoading(false);
    }, 1200);
  };

  const applyAiSuggestion = () => {
    patch({ prompt: aiSuggestion });
    setAiHelperOpen(false);
    setAiSuggestion("");
  };

  const inferredModel = useMemo(() => {
    const prompt = version.prompt.toLowerCase();
    if (prompt.includes("voice") || prompt.includes("call") || prompt.includes("empathy") || prompt.includes("sensitive")) return "claude-3-5-sonnet";
    if (prompt.includes("compliance") || prompt.includes("fair housing") || prompt.includes("verbatim") || prompt.includes("exact wording")) return "claude-3-5-haiku";
    if (prompt.includes("conversation") || prompt.includes("chat") || prompt.includes("resident")) return "gpt-4o";
    if (prompt.includes("approve") || prompt.includes("workflow") || prompt.includes("batch") || prompt.includes("automate")) return "gpt-4o-mini";
    return "auto";
  }, [version.prompt]);

  const lockedGuardrails = guardrails.filter((g) => g.locked);
  const complianceGuardrails = guardrails.filter((g) => !g.locked && g.category === "compliance");
  const safetyGuardrails = guardrails.filter((g) => !g.locked && g.category === "safety");

  const confirmGuard = disableConfirmId ? guardrails.find((g) => g.id === disableConfirmId) : null;

  return (
    <section className="max-w-3xl">
      <h2 className="font-heading text-lg text-foreground">Name your agent</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick something short and descriptive, tell us what it should do, and set any hard rules.
      </p>

      <div className="mt-6">
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="agent-name">
          Agent name
        </label>
        <Input
          id="agent-name"
          value={version.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="e.g. Auto-approve clean pre-bills"
          autoFocus
        />
      </div>

      <div className="mt-5">
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="agent-classification">
          Classification
        </label>
        <select
          id="agent-classification"
          value={version.classification ?? ""}
          onChange={(e) =>
            patch({ classification: (e.target.value || undefined) as AgentClassification | undefined })
          }
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="" disabled>How autonomous should this agent be?</option>
          {AGENT_CLASSIFICATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
          ))}
        </select>
        {selectedClassification ? (
          <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{selectedClassification.subtext}</p>
        ) : (
          <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">Pick a tier and we&apos;ll explain what it means right here.</p>
        )}
      </div>

      {/* ── Prompt with AI Helper ── */}
      <div className="mt-6">
        <div className="mb-1.5 flex items-center justify-between">
          <label className="block text-xs font-medium text-muted-foreground" htmlFor="agent-prompt">Prompt</label>
          <button
            type="button"
            onClick={() => { setAiHelperOpen(!aiHelperOpen); if (!aiHelperOpen && !aiSuggestion) generateAiSuggestion(); }}
            className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            <Sparkles className="h-3 w-3" />
            AI prompt helper
          </button>
        </div>
        <p className="mb-1.5 text-[11px] leading-snug text-muted-foreground">
          The prompt is the instructions that tell the agent what it should do, what it shouldn&apos;t do, and when it should escalate to a human. Be specific about how you want it to behave in different scenarios.
        </p>

        {aiHelperOpen && (
          <div className="mb-3 rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <h4 className="text-sm font-semibold text-indigo-900">AI Prompt Helper</h4>
            </div>
            <p className="text-[11px] text-indigo-800/80 mb-3">
              We generated a structured prompt template based on your agent&apos;s name and classification. Review it, customize the [DESCRIBE] sections, then apply it to your prompt.
            </p>
            {aiLoading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-indigo-600">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
                Generating prompt template...
              </div>
            ) : (
              <>
                <textarea
                  value={aiSuggestion}
                  onChange={(e) => setAiSuggestion(e.target.value)}
                  rows={10}
                  className="w-full rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm text-foreground font-mono text-[12px] focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
                <div className="mt-2 flex items-center gap-2">
                  <Button size="sm" onClick={applyAiSuggestion}>Apply to prompt</Button>
                  <Button size="sm" variant="outline" onClick={generateAiSuggestion}>Regenerate</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAiHelperOpen(false)}>Cancel</Button>
                </div>
              </>
            )}
          </div>
        )}

        <textarea
          id="agent-prompt"
          value={version.prompt}
          onChange={(e) => patch({ prompt: e.target.value })}
          rows={7}
          placeholder="When a utility pre-bill is pending approval, check the gross recapture percentage. If gross recapture is above 95%, approve the pre-bill. Otherwise, leave it for a human to review."
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* ── Security Guardrails (locked — always on) ── */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/50 p-5">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200 text-slate-600">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Entrata Security Guardrails</h3>
            <p className="text-[11px] text-slate-600">
              These guardrails are always enforced and cannot be disabled.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {lockedGuardrails.map((g) => (
            <div key={g.id} className="flex items-start gap-3 rounded-md bg-white/60 px-3 py-2">
              <div className="mt-0.5 flex h-4 w-4 items-center justify-center rounded border border-slate-300 bg-slate-100">
                <Check className="h-3 w-3 text-slate-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-700">{g.label}</p>
                <p className="text-[11px] text-slate-500">{g.description}</p>
              </div>
              <Badge variant="outline" className="ml-auto shrink-0 text-[10px] border-slate-300 text-slate-500">Always on</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* ── Compliance Guardrails (can be disabled with acknowledgment) ── */}
      <div className="mt-4 rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50/80 to-orange-50/40 p-5">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-amber-900">Compliance Guardrails</h3>
            <p className="text-[11px] text-amber-800/80">
              Enabled by default. Disabling requires explicit acknowledgment of the risk.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {complianceGuardrails.map((g) => (
            <label key={g.id} className="flex cursor-pointer items-start gap-3 rounded-md bg-white/60 px-3 py-2 hover:bg-white/80 transition-colors">
              <input
                type="checkbox"
                checked={g.enabled}
                onChange={() => toggleGuardrail(g.id)}
                className="mt-0.5 h-4 w-4 rounded border-amber-300 accent-amber-600"
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-amber-900">{g.label}</p>
                <p className="text-[11px] text-amber-800/70">{g.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* ── Safety Guardrails ── */}
      <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/40 p-5">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-blue-900">Safety Guardrails</h3>
            <p className="text-[11px] text-blue-800/80">
              Recommended defaults. Toggle off only if you have a specific reason.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {safetyGuardrails.map((g) => (
            <label key={g.id} className="flex cursor-pointer items-start gap-3 rounded-md bg-white/60 px-3 py-2 hover:bg-white/80 transition-colors">
              <input
                type="checkbox"
                checked={g.enabled}
                onChange={() => toggleGuardrail(g.id)}
                className="mt-0.5 h-4 w-4 rounded border-blue-300 accent-blue-600"
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-blue-900">{g.label}</p>
                <p className="text-[11px] text-blue-800/70">{g.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* ── Custom Guardrails (free-form, backward compatible) ── */}
      <div className="mt-4 rounded-xl border border-border bg-muted/20 p-5">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <FileEdit className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Custom Guardrails</h3>
            <p className="text-[11px] text-muted-foreground">
              Additional rules specific to this agent. One per line.
            </p>
          </div>
        </div>
        <textarea
          value={version.guardrails}
          onChange={(e) => patch({ guardrails: e.target.value })}
          rows={4}
          placeholder="Never approve a pre-bill with missing meter readings.&#10;Always escalate to a human if anything looks unusual."
          className="mt-2 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
      </div>

      {/* ── Disable Guardrail Confirmation Dialog ── */}
      {confirmGuard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-2 text-amber-600 mb-3">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-base font-semibold">Disable {confirmGuard.label}?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{confirmGuard.description}</p>
            <p className="text-sm text-amber-800 font-medium mb-4">
              Disabling this guardrail may expose your organization to compliance risk. Please confirm you understand the implications.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDisableConfirmId(null)}>Keep enabled</Button>
              <Button variant="destructive" size="sm" onClick={confirmDisable}>
                I understand, disable
              </Button>
            </div>
          </div>
        </div>
      )}

      <AdvancedAgentSettings version={version} patch={patch} inferredModel={inferredModel} />
    </section>
  );
}

/**
 * LLM model selection with cost, task suitability, and auto-detection.
 */
function AdvancedAgentSettings({
  version,
  patch,
  inferredModel,
}: {
  version: AgentVersion;
  patch: (p: Partial<AgentVersion>) => void;
  inferredModel: LlmModelId;
}) {
  const hasExplicitAdvanced = version.llmModel !== undefined && version.llmModel !== "auto";
  const [expanded, setExpanded] = useState<boolean>(hasExplicitAdvanced);

  const model = version.llmModel ?? "auto";
  const selectedModel = LLM_MODEL_OPTIONS.find((m) => m.value === model);
  const inferredOption = LLM_MODEL_OPTIONS.find((m) => m.value === inferredModel);

  return (
    <div className="mt-6 rounded-xl border border-border bg-muted/20">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold text-foreground">LLM Model Selection</p>
            <p className="text-[11px] text-muted-foreground">
              {model === "auto" ? "Auto-detected based on your prompt" : `Using ${selectedModel?.label ?? model}`}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-4">
          {inferredModel !== "auto" && model === "auto" && inferredOption && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-indigo-200 bg-indigo-50/50 p-3">
              <Brain className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
              <div className="text-[12px] text-indigo-900">
                <p className="font-medium">Auto-detected: {inferredOption.label}</p>
                <p className="mt-0.5 text-indigo-800/80">Based on your prompt, we recommend this model. You can override below.</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {LLM_MODEL_OPTIONS.map((opt) => {
              const isSelected = model === opt.value;
              const isInferred = opt.value === inferredModel && model === "auto";
              return (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    isSelected ? "border-indigo-300 bg-indigo-50/50" : "border-border bg-white hover:bg-muted/30"
                  } ${isInferred ? "ring-1 ring-indigo-300" : ""}`}
                >
                  <input
                    type="radio"
                    name="llm-model"
                    value={opt.value}
                    checked={isSelected}
                    onChange={() => patch({ llmModel: opt.value === "auto" ? undefined : (opt.value as LlmModelId) })}
                    className="mt-1 h-4 w-4 accent-indigo-600"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{opt.label}</p>
                      {isInferred && <Badge className="bg-indigo-100 text-indigo-700 text-[10px]">Recommended</Badge>}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{opt.subtext}</p>
                    {opt.value !== "auto" && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          <DollarSign className="h-3 w-3" />
                          ${opt.costPer1kTokens.input}/{opt.costPer1kTokens.output} per 1K tokens
                        </span>
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          opt.speed === "fast" ? "bg-green-50 text-green-700" : opt.speed === "medium" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                        }`}>
                          {opt.speed === "fast" ? "Fast" : opt.speed === "medium" ? "Medium speed" : "Slower"}
                        </span>
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          opt.quality === "best" ? "bg-indigo-50 text-indigo-700" : opt.quality === "great" ? "bg-blue-50 text-blue-700" : "bg-slate-50 text-slate-700"
                        }`}>
                          {opt.quality === "best" ? "Highest quality" : opt.quality === "great" ? "Great quality" : "Good quality"}
                        </span>
                      </div>
                    )}
                    {opt.value !== "auto" && opt.bestFor.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {opt.bestFor.map((tag) => (
                          <span key={tag} className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── Step 2: Triggers & Entry Points ─────────── */

function TriggersStep({ version, patch, agentId }: { version: AgentVersion; patch: (p: Partial<AgentVersion>) => void; agentId: string }) {
  const triggers = version.triggers ?? [];
  const { getAgent, updateEntryPoints } = useCustomAgents();
  const agent = getAgent(agentId);
  const entryPoints = agent?.entryPoints ?? [];
  const [manualEnabled, setManualEnabled] = useState(entryPoints.some((ep) => ep.enabled));
  const [entryQuery, setEntryQuery] = useState("");

  const addTrigger = (kind: Trigger["kind"]) => {
    patch({ triggers: [...triggers, newTrigger(kind)] });
  };

  const updateTrigger = (id: string, updater: (t: Trigger) => Trigger) => {
    patch({ triggers: triggers.map((t) => (t.id === id ? updater(t) : t)) });
  };

  const removeTrigger = (id: string) => patch({ triggers: triggers.filter((t) => t.id !== id) });

  const enabledKeys = new Set(entryPoints.filter((ep) => ep.enabled).map((ep) => ep.moduleKey));

  const categories = useMemo(() => {
    const grouped = new Map<string, typeof ENTRY_POINT_MODULES[number][]>();
    for (const mod of ENTRY_POINT_MODULES) {
      const list = grouped.get(mod.category) ?? [];
      list.push(mod);
      grouped.set(mod.category, list);
    }
    return Array.from(grouped.entries());
  }, []);

  const toggleEntryPoint = (moduleKey: string) => {
    const existing = entryPoints.find((ep) => ep.moduleKey === moduleKey);
    let next: AgentEntryPoint[];
    if (existing) {
      next = entryPoints.map((ep) =>
        ep.moduleKey === moduleKey ? { ...ep, enabled: !ep.enabled } : ep
      );
    } else {
      next = [
        ...entryPoints,
        { id: `ep-${moduleKey}`, moduleKey, label: `Run ${agent?.name ?? "Agent"}`, enabled: true },
      ];
    }
    updateEntryPoints(agentId, next);
  };

  const filteredModules = entryQuery.trim()
    ? ENTRY_POINT_MODULES.filter(
        (m) =>
          m.label.toLowerCase().includes(entryQuery.toLowerCase()) ||
          m.moduleKey.toLowerCase().includes(entryQuery.toLowerCase())
      )
    : null;

  return (
    <section>
      <h2 className="font-heading text-lg text-foreground">When should this agent run?</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Add automated triggers, or enable manual invocation from specific pages in the platform.
      </p>

      {/* ── Automated Triggers ── */}
      <div className="mt-5">
        <h3 className="text-sm font-semibold text-foreground mb-2">Automated triggers</h3>
        <p className="text-[11px] text-muted-foreground mb-3">The agent runs automatically whenever any trigger fires.</p>

        <div className="space-y-3">
          {triggers.map((t) => (
            <div key={t.id} className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <TriggerEditor trigger={t} onChange={(next) => updateTrigger(t.id, () => next)} />
                </div>
                <button
                  type="button"
                  onClick={() => removeTrigger(t.id)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Remove trigger"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {triggers.length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center">
              <p className="text-sm text-muted-foreground">No automated triggers yet.</p>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => addTrigger("schedule")} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted">
            <Clock className="h-3.5 w-3.5" /><Plus className="h-3 w-3" /> Schedule
          </button>
          <button type="button" onClick={() => addTrigger("event")} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted">
            <Zap className="h-3.5 w-3.5" /><Plus className="h-3 w-3" /> Event
          </button>
          <button type="button" onClick={() => addTrigger("inbound_message")} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted">
            <MessageSquare className="h-3.5 w-3.5" /><Plus className="h-3 w-3" /> Inbound message
          </button>
        </div>
      </div>

      {/* ── Manual Invocation (merged from Entry Points) ── */}
      <div className="mt-8 rounded-xl border border-border bg-muted/10 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <ExternalLink className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Manual Invocation</h3>
              <p className="text-[11px] text-muted-foreground">
                Let users trigger this agent manually from specific pages in the platform.
              </p>
            </div>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={manualEnabled}
              onChange={(e) => setManualEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-indigo-600"
            />
            <span className="text-xs font-medium text-foreground">Enable</span>
          </label>
        </div>

        {manualEnabled && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-[11px] text-muted-foreground mb-3">
              Users with the <code className="rounded bg-muted px-1 py-0.5 text-[11px]">agent:execute</code> permission will see a &ldquo;Run Agent&rdquo; button on each enabled page.
            </p>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search pages..." value={entryQuery} onChange={(e) => setEntryQuery(e.target.value)} className="pl-9 text-sm" />
            </div>

            {enabledKeys.size > 0 && (
              <div className="mb-3 rounded-lg border border-green-200 bg-green-50/50 p-3">
                <p className="text-[11px] font-medium text-green-800 mb-1">Enabled on {enabledKeys.size} page{enabledKeys.size !== 1 ? "s" : ""}</p>
                <div className="flex flex-wrap gap-1">
                  {entryPoints.filter((ep) => ep.enabled).map((ep) => {
                    const mod = ENTRY_POINT_MODULES.find((m) => m.moduleKey === ep.moduleKey);
                    return (
                      <Badge key={ep.id} variant="outline" className="text-[10px] bg-white">
                        {mod?.label ?? ep.moduleKey}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="max-h-60 overflow-y-auto space-y-1">
              {(filteredModules ?? ENTRY_POINT_MODULES).map((mod) => {
                const enabled = enabledKeys.has(mod.moduleKey);
                return (
                  <label key={mod.moduleKey} className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors ${enabled ? "bg-indigo-50/50" : "hover:bg-muted/30"}`}>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => toggleEntryPoint(mod.moduleKey)}
                      className="h-3.5 w-3.5 rounded border-border accent-indigo-600"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">{mod.label}</p>
                      <p className="text-[10px] text-muted-foreground">{mod.category}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─────────── Step 3: Prompt + Guardrails (separate box) ─────────── */

function PromptStep({ version, patch }: { version: AgentVersion; patch: (p: Partial<AgentVersion>) => void }) {
  return (
    <section className="max-w-3xl">
      <h2 className="font-heading text-lg text-foreground">Tell us what the agent should do</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Write this like you&apos;re briefing a new hire. Be specific about what you want, and what the decision should be.
      </p>

      <div className="mt-5">
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Prompt</label>
        <textarea
          value={version.prompt}
          onChange={(e) => patch({ prompt: e.target.value })}
          rows={8}
          placeholder="When a utility pre-bill is pending approval, check the gross recapture percentage. If gross recapture is above 95%, approve the pre-bill. Otherwise, leave it for a human to review."
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="mt-6 rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50/80 to-orange-50/40 p-5">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-amber-900">Guardrails</h3>
            <p className="text-[11px] text-amber-800/80">
              Rules the agent should always follow — or never cross. We give these extra weight.
            </p>
          </div>
        </div>
        <textarea
          value={version.guardrails}
          onChange={(e) => patch({ guardrails: e.target.value })}
          rows={5}
          placeholder="Never approve a pre-bill with missing meter readings.&#10;Always escalate to a human if anything looks unusual.&#10;Never include sensitive screening data in text messages."
          className="mt-2 w-full rounded-md border border-amber-200 bg-white/80 px-3 py-2 text-sm text-foreground placeholder:text-amber-700/40 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
        />
        <p className="mt-2 text-[11px] text-amber-800/70">
          One rule per line. Leave blank if there aren&apos;t any hard rules.
        </p>
      </div>
    </section>
  );
}

/* ─────────── Step 4: Success metrics (AI-inferred) ─────────── */

const METRIC_UNITS: Array<{ value: SuccessMetricUnit; label: string }> = [
  { value: "count", label: "Count" },
  { value: "percent", label: "Percent" },
  { value: "minutes", label: "Minutes" },
  { value: "dollars", label: "Dollars" },
  { value: "rate", label: "Rate" },
];

function SuccessStep({ version, patch }: { version: AgentVersion; patch: (p: Partial<AgentVersion>) => void }) {
  const metrics = version.successMetrics ?? [];
  const description = version.successDescription ?? "";

  const regenerate = () => {
    const inferred = inferSuccessMetrics(version.prompt, description);
    patch({ successMetrics: inferred });
  };

  // Seed metrics on first visit if none yet and we have some prompt to work with
  useEffect(() => {
    if (metrics.length === 0 && version.prompt.trim().length > 10) {
      const inferred = inferSuccessMetrics(version.prompt, description);
      patch({ successMetrics: inferred });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateMetric = (id: string, changes: Partial<SuccessMetric>) => {
    patch({ successMetrics: metrics.map((m) => (m.id === id ? { ...m, ...changes } : m)) });
  };

  const removeMetric = (id: string) => {
    const next = metrics.filter((m) => m.id !== id);
    // ensure at least one remains primary
    if (!next.some((m) => m.primary) && next.length > 0) next[0].primary = true;
    patch({ successMetrics: next });
  };

  const setPrimary = (id: string) => {
    patch({
      successMetrics: metrics.map((m) => ({ ...m, primary: m.id === id })),
    });
  };

  const addBlank = () => {
    const id = `sm_custom_${Math.random().toString(36).slice(2, 8)}`;
    patch({
      successMetrics: [
        ...metrics,
        {
          id,
          label: "New metric",
          unit: "count",
          direction: "up",
          windowDays: 30,
          aiInferred: false,
          primary: metrics.length === 0,
          currentValue: 0,
          previousValue: undefined,
        },
      ],
    });
  };

  return (
    <section className="max-w-3xl">
      <h2 className="font-heading text-lg text-foreground">What does success look like?</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Describe how you&apos;ll know this agent is doing its job. We&apos;ll turn your description into metrics you can track — and surface the primary one on your roster.
      </p>

      <div className="mt-5">
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Describe success in your own words</label>
        <textarea
          value={description}
          onChange={(e) => patch({ successDescription: e.target.value })}
          onBlur={regenerate}
          rows={4}
          placeholder="e.g. Success is sending tour reminders 30 minutes before every scheduled tour, and updating lead preferences whenever the leasing agent replies."
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            Tip: include words like &quot;approved&quot;, &quot;sent&quot;, &quot;completed&quot;, &quot;updated&quot;, or &quot;reduced&quot;.
          </p>
          <button
            type="button"
            onClick={regenerate}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
          >
            <Sparkles className="h-3 w-3" />
            Regenerate metrics
          </button>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Metrics to track</h3>
            <span className="text-[11px] text-muted-foreground">({metrics.length})</span>
          </div>
          <button
            type="button"
            onClick={addBlank}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
          >
            <Plus className="h-3 w-3" />
            Add metric
          </button>
        </div>

        {metrics.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Describe success above and we&apos;ll suggest metrics automatically.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {metrics.map((m) => {
              const trend = computeTrend(m);
              return (
                <li
                  key={m.id}
                  className={`rounded-lg border p-3 ${
                    m.primary ? "border-indigo-300 bg-indigo-50/40" : "border-border bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => setPrimary(m.id)}
                      title={m.primary ? "Primary metric" : "Make primary"}
                      className={`mt-0.5 rounded-md p-1 ${
                        m.primary ? "text-indigo-600" : "text-muted-foreground hover:text-foreground"
                      }`}
                      aria-label={m.primary ? "Primary metric" : "Make primary"}
                    >
                      <Star className={`h-4 w-4 ${m.primary ? "fill-indigo-500 text-indigo-500" : ""}`} />
                    </button>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          value={m.label}
                          onChange={(e) => updateMetric(m.id, { label: e.target.value })}
                          className="h-7 max-w-sm text-[13px] font-medium"
                        />
                        {m.aiInferred && (
                          <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">
                            <Sparkles className="mr-0.5 h-2.5 w-2.5" />
                            AI picked
                          </Badge>
                        )}
                        {m.primary && (
                          <Badge variant="secondary" className="h-4 bg-indigo-100 px-1.5 text-[9px] text-indigo-800">
                            Primary
                          </Badge>
                        )}
                      </div>
                      {m.description && (
                        <p className="text-[11px] text-muted-foreground">{m.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <label className="flex items-center gap-1 text-muted-foreground">
                          Unit
                          <select
                            value={m.unit}
                            onChange={(e) => updateMetric(m.id, { unit: e.target.value as SuccessMetricUnit })}
                            className="rounded-md border border-border bg-white px-1.5 py-0.5 text-[11px]"
                          >
                            {METRIC_UNITS.map((u) => (
                              <option key={u.value} value={u.value}>
                                {u.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex items-center gap-1 text-muted-foreground">
                          Better when
                          <select
                            value={m.direction}
                            onChange={(e) => updateMetric(m.id, { direction: e.target.value as "up" | "down" })}
                            className="rounded-md border border-border bg-white px-1.5 py-0.5 text-[11px]"
                          >
                            <option value="up">Higher</option>
                            <option value="down">Lower</option>
                          </select>
                        </label>
                        <label className="flex items-center gap-1 text-muted-foreground">
                          Window
                          <select
                            value={m.windowDays}
                            onChange={(e) =>
                              updateMetric(m.id, { windowDays: Number(e.target.value) as 7 | 30 | 90 })
                            }
                            className="rounded-md border border-border bg-white px-1.5 py-0.5 text-[11px]"
                          >
                            <option value={7}>7 days</option>
                            <option value={30}>30 days</option>
                            <option value={90}>90 days</option>
                          </select>
                        </label>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-1.5 text-[11px]">
                        <span className="font-medium text-foreground">
                          {formatMetricValue(m.currentValue, m.unit)}{" "}
                          <span className="text-muted-foreground">this {m.windowDays}d</span>
                        </span>
                        {trend.label && trend.improving !== null && (
                          <span
                            className={`inline-flex items-center gap-0.5 font-medium ${
                              trend.improving ? "text-emerald-700" : "text-red-700"
                            }`}
                          >
                            {trend.improving ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {trend.label}
                          </span>
                        )}
                        <span className="text-muted-foreground">(mock baseline)</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMetric(m.id)}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Remove metric"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          The primary metric (starred) shows up on your Agent Roster and Agent Builder list.
        </p>
      </div>
    </section>
  );
}

/* ─────────── Step 5: Data & Skills (MCP Servers) ─────────── */

function DataSkillsStep({ version, patch }: { version: AgentVersion; patch: (p: Partial<AgentVersion>) => void }) {
  const mcpServers = version.mcpServers ?? [];
  const [expandedServer, setExpandedServer] = useState<string | null>(null);
  const [toolQuery, setToolQuery] = useState("");

  const toggleServer = (serverId: string) => {
    const existing = mcpServers.find((s) => s.id === serverId);
    const serverDef = MCP_SERVER_CATALOG.find((s) => s.id === serverId);
    if (!serverDef) return;

    if (existing) {
      patch({
        mcpServers: mcpServers.map((s) =>
          s.id === serverId ? { ...s, enabled: !s.enabled } : s
        ),
      });
    } else {
      patch({
        mcpServers: [
          ...mcpServers,
          {
            id: serverId,
            name: serverDef.name,
            description: serverDef.description,
            icon: serverDef.icon,
            category: serverDef.category,
            enabled: true,
          },
        ],
      });
    }
  };

  const isServerEnabled = (serverId: string) => mcpServers.find((s) => s.id === serverId)?.enabled ?? false;

  const getRestrictedTools = (serverId: string) => mcpServers.find((s) => s.id === serverId)?.restrictedToolIds;

  const toggleTool = (serverId: string, toolId: string) => {
    const server = mcpServers.find((s) => s.id === serverId);
    const serverDef = MCP_SERVER_CATALOG.find((s) => s.id === serverId);
    if (!server || !serverDef) return;

    const allToolIds = serverDef.tools.map((t) => t.id);
    const current = server.restrictedToolIds ?? allToolIds;
    const isEnabled = current.includes(toolId);

    const next = isEnabled
      ? current.filter((id) => id !== toolId)
      : [...current, toolId];

    const isAll = next.length === allToolIds.length;

    patch({
      mcpServers: mcpServers.map((s) =>
        s.id === serverId ? { ...s, restrictedToolIds: isAll ? undefined : next } : s
      ),
    });
  };

  const isToolEnabled = (serverId: string, toolId: string) => {
    const restricted = getRestrictedTools(serverId);
    if (!restricted) return true;
    return restricted.includes(toolId);
  };

  const enabledCount = mcpServers.filter((s) => s.enabled).length;

  return (
    <section>
      <h2 className="font-heading text-lg text-foreground">Data &amp; Skills</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Connect MCP servers to give your agent access to Entrata data and capabilities. You can restrict access to specific tools within each server.
      </p>

      <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
        <div className="flex items-start gap-2 text-[12px] text-indigo-900">
          <Brain className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <p className="font-medium">MCP (Model Context Protocol)</p>
            <p className="mt-0.5 text-indigo-800/80">
              Each MCP server exposes a set of tools the agent can call. Enable a server to grant access, then optionally restrict to specific tools for fine-grained control.
            </p>
          </div>
        </div>
      </div>

      {enabledCount > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <Badge className="bg-green-50 text-green-700 border-green-200">{enabledCount} server{enabledCount !== 1 ? "s" : ""} connected</Badge>
          <span className="text-[11px] text-muted-foreground">
            {mcpServers.filter((s) => s.enabled).reduce((acc, s) => {
              const def = MCP_SERVER_CATALOG.find((d) => d.id === s.id);
              const total = def?.tools.length ?? 0;
              const restricted = s.restrictedToolIds;
              return acc + (restricted ? restricted.length : total);
            }, 0)} tools available
          </span>
        </div>
      )}

      <div className="mt-4">
        <ThresholdWarning version={version} />
      </div>

      <div className="mt-5 space-y-3">
        {MCP_SERVER_CATALOG.map((serverDef) => {
          const enabled = isServerEnabled(serverDef.id);
          const isExpanded = expandedServer === serverDef.id;
          const restrictedTools = getRestrictedTools(serverDef.id);
          const activeToolCount = restrictedTools ? restrictedTools.length : serverDef.tools.length;
          const readTools = serverDef.tools.filter((t) => !t.mutates);
          const writeTools = serverDef.tools.filter((t) => t.mutates);
          const toolCategories = Array.from(new Set(serverDef.tools.map((t) => t.category)));

          const filteredTools = toolQuery.trim()
            ? serverDef.tools.filter((t) =>
                t.name.toLowerCase().includes(toolQuery.toLowerCase()) ||
                t.description.toLowerCase().includes(toolQuery.toLowerCase())
              )
            : serverDef.tools;

          return (
            <div key={serverDef.id} className={`rounded-xl border transition-colors ${enabled ? "border-indigo-200 bg-indigo-50/20" : "border-border bg-white"}`}>
              <div className="flex items-center gap-3 px-4 py-3">
                <label className="flex cursor-pointer items-center gap-3 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => toggleServer(serverDef.id)}
                    className="h-4 w-4 rounded border-border accent-indigo-600"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{serverDef.name}</p>
                      <Badge variant="outline" className="text-[10px]">{serverDef.category}</Badge>
                      {enabled && (
                        <span className="text-[10px] text-muted-foreground">
                          {activeToolCount}/{serverDef.tools.length} tools
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{serverDef.description}</p>
                  </div>
                </label>
                {enabled && (
                  <button
                    type="button"
                    onClick={() => setExpandedServer(isExpanded ? null : serverDef.id)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                )}
              </div>

              {enabled && isExpanded && (
                <div className="border-t border-border px-4 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">
                      {restrictedTools ? `${activeToolCount} of ${serverDef.tools.length} tools enabled` : "All tools enabled"}
                    </p>
                    {restrictedTools ? (
                      <button
                        type="button"
                        onClick={() => patch({ mcpServers: mcpServers.map((s) => s.id === serverDef.id ? { ...s, restrictedToolIds: undefined } : s) })}
                        className="text-[11px] text-indigo-600 hover:underline"
                      >Enable all</button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => patch({ mcpServers: mcpServers.map((s) => s.id === serverDef.id ? { ...s, restrictedToolIds: [] } : s) })}
                        className="text-[11px] text-muted-foreground hover:underline"
                      >Restrict tools</button>
                    )}
                  </div>

                  {serverDef.tools.length > 8 && (
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Search tools..." value={toolQuery} onChange={(e) => setToolQuery(e.target.value)} className="pl-9 text-sm h-8" />
                    </div>
                  )}

                  <div className="space-y-3">
                    {/* Read-only tools */}
                    {readTools.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                          <Database className="h-3 w-3" /> Read-only ({readTools.filter((t) => filteredTools.includes(t)).length})
                        </p>
                        <div className="grid grid-cols-1 gap-1">
                          {readTools.filter((t) => filteredTools.includes(t)).map((tool) => {
                            const active = isToolEnabled(serverDef.id, tool.id);
                            return (
                              <label key={tool.id} className={`flex cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-1.5 text-[12px] transition-colors ${active ? "bg-green-50/50" : "opacity-50"}`}>
                                <input
                                  type="checkbox"
                                  checked={active}
                                  onChange={() => toggleTool(serverDef.id, tool.id)}
                                  className="mt-0.5 h-3.5 w-3.5 rounded border-border accent-indigo-600"
                                />
                                <div>
                                  <span className="font-medium text-foreground">{tool.name}</span>
                                  <span className="ml-1.5 text-muted-foreground">{tool.description}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Write/action tools */}
                    {writeTools.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                          <Wrench className="h-3 w-3" /> Actions ({writeTools.filter((t) => filteredTools.includes(t)).length})
                          {writeTools.some((t) => t.requiresApproval) && (
                            <span className="ml-1 text-amber-600">&middot; some require approval</span>
                          )}
                        </p>
                        <div className="grid grid-cols-1 gap-1">
                          {writeTools.filter((t) => filteredTools.includes(t)).map((tool) => {
                            const active = isToolEnabled(serverDef.id, tool.id);
                            return (
                              <label key={tool.id} className={`flex cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-1.5 text-[12px] transition-colors ${active ? "bg-amber-50/50" : "opacity-50"}`}>
                                <input
                                  type="checkbox"
                                  checked={active}
                                  onChange={() => toggleTool(serverDef.id, tool.id)}
                                  className="mt-0.5 h-3.5 w-3.5 rounded border-border accent-indigo-600"
                                />
                                <div className="flex items-start gap-1.5">
                                  <div>
                                    <span className="font-medium text-foreground">{tool.name}</span>
                                    {tool.requiresApproval && <Badge variant="outline" className="ml-1.5 text-[9px] border-amber-300 text-amber-700">Requires approval</Badge>}
                                    <span className="ml-1.5 text-muted-foreground">{tool.description}</span>
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AudienceBuilderSection version={version} patch={patch} />
    </section>
  );
}

/* ─────────── Audience Builder (optional scope limiter) ─────────── */

const AUDIENCE_BUILDER_PRESETS: ReadonlyArray<{
  id: string;
  name: string;
  description: string;
  memberCount: number;
}> = [
  {
    id: "aud_renewal_eligible",
    name: "Renewal-Eligible Residents",
    description: "Current residents with leases expiring in the next 90 days who have not yet received a renewal offer.",
    memberCount: 342,
  },
  {
    id: "aud_delinquent_30",
    name: "30+ Day Delinquent",
    description: "Residents with an outstanding balance older than 30 days.",
    memberCount: 87,
  },
  {
    id: "aud_move_in_next_14",
    name: "Upcoming Move-ins (14 days)",
    description: "Approved applicants with a move-in date in the next 14 days.",
    memberCount: 29,
  },
  {
    id: "aud_leads_uncontacted",
    name: "Uncontacted Leads",
    description: "Leads created in the last 7 days with zero contact attempts.",
    memberCount: 156,
  },
  {
    id: "aud_expiring_insurance",
    name: "Expiring Insurance Policies",
    description: "Residents whose renters insurance policy expires within 30 days.",
    memberCount: 63,
  },
];

function AudienceBuilderSection({
  version,
  patch,
}: {
  version: AgentVersion;
  patch: (p: Partial<AgentVersion>) => void;
}) {
  const [expanded, setExpanded] = useState(!!version.audienceId);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return AUDIENCE_BUILDER_PRESETS;
    const q = query.toLowerCase();
    return AUDIENCE_BUILDER_PRESETS.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
    );
  }, [query]);

  const selected = AUDIENCE_BUILDER_PRESETS.find((a) => a.id === version.audienceId);

  return (
    <div className="mt-8 rounded-xl border border-border bg-muted/10 p-4">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Target Audience</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Optional
          </span>
        </div>
        <div className="flex items-center gap-2">
          {selected && (
            <span className="text-[11px] text-emerald-700 font-medium">
              {selected.name}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="mt-3">
          <p className="text-[12px] text-muted-foreground">
            Optionally scope this agent to a specific audience segment from the{" "}
            <a
              href="/?module=audience_builderxxx"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 hover:underline"
            >
              Audience Builder
            </a>
            . When set, the agent only processes records matching the audience criteria.
            Leave unset to run against all records defined by the agent&apos;s triggers and properties.
          </p>

          {version.audienceId && selected && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <Check className="h-4 w-4 text-emerald-600" />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-emerald-900">{selected.name}</p>
                <p className="text-[11px] text-emerald-700">{selected.description}</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                {selected.memberCount.toLocaleString()} members
              </span>
              <button
                type="button"
                onClick={() => patch({ audienceId: undefined, audienceName: undefined })}
                className="ml-1 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Remove audience"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {!version.audienceId && (
            <>
              <div className="mt-3 relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search audiences…"
                  className="h-8 pl-8 text-[12px]"
                />
              </div>
              <div className="mt-2 max-h-[260px] space-y-1.5 overflow-y-auto">
                {filtered.map((aud) => (
                  <button
                    key={aud.id}
                    type="button"
                    onClick={() =>
                      patch({ audienceId: aud.id, audienceName: aud.name })
                    }
                    className="flex w-full items-start gap-3 rounded-lg border border-border bg-white px-3 py-2.5 text-left transition-colors hover:border-indigo-200 hover:bg-indigo-50/30"
                  >
                    <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-foreground">{aud.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{aud.description}</p>
                    </div>
                    <span className="mt-0.5 whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {aud.memberCount.toLocaleString()}
                    </span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center">
                    <p className="text-[12px] text-muted-foreground">No audiences match your search.</p>
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-indigo-200 bg-indigo-50/30 px-3 py-2">
                <ExternalLink className="h-3.5 w-3.5 text-indigo-600" />
                <p className="text-[11px] text-indigo-800">
                  Need a custom audience?{" "}
                  <a
                    href="/?module=audience_builderxxx"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium underline"
                  >
                    Open the Audience Builder
                  </a>{" "}
                  to create one, then return here to select it.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────── Reusable API catalog picker panel ─────────── */

function ApiCatalogPanel({
  title,
  titleIcon: TitleIcon,
  operation,
  selectedIds,
  aiInferredIds,
  onToggle,
  emptyHint,
}: {
  title: string;
  titleIcon: React.ComponentType<{ className?: string }>;
  operation: "read" | "action";
  selectedIds: string[];
  aiInferredIds: string[];
  onToggle: (id: string) => void;
  emptyHint: string;
}) {
  const [query, setQuery] = useState("");
  const [exposure, setExposure] = useState<ApiExposure | "all">("all");
  const [category, setCategory] = useState<ApiCategory | "all">("all");

  const filtered = useMemo(
    () => filterApis(operation, { query, exposure, category }),
    [operation, query, exposure, category]
  );

  // Grouped by category, preserving the canonical category order.
  const grouped = useMemo(() => {
    const byCat = new Map<ApiCategory, EntrataApiEntry[]>();
    for (const e of filtered) {
      if (!byCat.has(e.category)) byCat.set(e.category, []);
      byCat.get(e.category)!.push(e);
    }
    return ENTRATA_API_CATEGORIES.filter((c) => byCat.has(c)).map((c) => ({
      category: c,
      entries: byCat.get(c)!,
    }));
  }, [filtered]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const aiSet = useMemo(() => new Set(aiInferredIds), [aiInferredIds]);

  const totalForOperation = useMemo(
    () => ENTRATA_API_CATALOG.filter((e) => e.operation === operation).length,
    [operation]
  );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TitleIcon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <span className="text-[10px] text-muted-foreground">
            ({filtered.length} of {totalForOperation})
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground">{selectedIds.length} selected</span>
      </div>

      <div className="mb-2 flex flex-col gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${totalForOperation} Entrata APIs…`}
            className="h-8 pl-8 text-[12px]"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={exposure === "all"} onClick={() => setExposure("all")}>
            All
          </FilterChip>
          <FilterChip active={exposure === "public"} onClick={() => setExposure("public")}>
            <Globe className="mr-1 h-3 w-3" /> Public
          </FilterChip>
          <FilterChip active={exposure === "private"} onClick={() => setExposure("private")}>
            <Lock className="mr-1 h-3 w-3" /> Private
          </FilterChip>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ApiCategory | "all")}
            className="rounded-md border border-border bg-white px-2 py-1 text-[11px]"
          >
            <option value="all">All categories</option>
            {ENTRATA_API_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mb-2 text-[10px] italic text-muted-foreground">{emptyHint}</p>

      <div className="max-h-[520px] space-y-4 overflow-y-auto pr-1">
        {grouped.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-[12px] text-muted-foreground">
            No APIs match your filters.
          </div>
        )}
        {grouped.map(({ category: cat, entries }) => (
          <div key={cat}>
            <div className="mb-1 flex items-center gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {cat}
              </p>
              <span className="text-[10px] text-muted-foreground">({entries.length})</span>
            </div>
            <ul className="space-y-1.5">
              {entries.map((e) => {
                const selected = selectedSet.has(e.id);
                const aiPicked = aiSet.has(e.id);
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => onToggle(e.id)}
                      className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                        selected ? "border-indigo-300 bg-indigo-50/60" : "border-border bg-white hover:bg-muted/30"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {}}
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-border accent-indigo-600"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[13px] font-medium text-foreground">{e.label}</p>
                          <ApiExposureBadge exposure={e.exposure} />
                          {aiPicked && (
                            <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">
                              <Sparkles className="mr-0.5 h-2.5 w-2.5" />
                              AI picked
                            </Badge>
                          )}
                          {e.requiresApproval && (
                            <Badge variant="outline" className="h-4 px-1.5 text-[9px]">
                              Sensitive
                            </Badge>
                          )}
                          {e.sensitivity === "high" && (
                            <Badge variant="outline" className="h-4 border-red-200 px-1.5 text-[9px] text-red-700">
                              PII / high
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{e.description}</p>
                        {e.method && (
                          <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground/80">
                            {e.method}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
        active
          ? "border-indigo-300 bg-indigo-100 text-indigo-800"
          : "border-border bg-white text-muted-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

function ApiExposureBadge({ exposure }: { exposure: ApiExposure }) {
  if (exposure === "public") {
    return (
      <Badge variant="outline" className="h-4 border-emerald-200 bg-emerald-50 px-1.5 text-[9px] text-emerald-800">
        <Globe className="mr-0.5 h-2.5 w-2.5" />
        Public
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="h-4 border-slate-200 bg-slate-50 px-1.5 text-[9px] text-slate-700">
      <Lock className="mr-0.5 h-2.5 w-2.5" />
      Private
    </Badge>
  );
}

/* ─────────── Step 5: Properties (mrdn-style dual-pane selector) ─────────── */

function PropertiesStep({ version, patch }: { version: AgentVersion; patch: (p: Partial<AgentVersion>) => void }) {
  const all = version.properties.includes("All properties");

  /**
   * Selected names (excluding the "All properties" sentinel). We normalize
   * storage to a plain list of property names — "All properties" is treated as
   * a shortcut that expands to every record.
   */
  const selectedNames = useMemo(
    () => (all ? PMC_PROPERTIES : version.properties.filter((p) => p !== "All properties")),
    [all, version.properties]
  );

  const [availableQuery, setAvailableQuery] = useState("");
  const [selectedQuery, setSelectedQuery] = useState("");

  const availableRecords = useMemo(() => {
    const q = availableQuery.trim().toLowerCase();
    return PMC_PROPERTY_RECORDS.filter((p) => !selectedNames.includes(p.name)).filter((p) => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.lookupCode.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q) ||
        p.group.toLowerCase().includes(q)
      );
    });
  }, [availableQuery, selectedNames]);

  const selectedRecords = useMemo(() => {
    const q = selectedQuery.trim().toLowerCase();
    const recs = selectedNames
      .map((n) => PMC_PROPERTY_RECORDS.find((p) => p.name === n))
      .filter((p): p is (typeof PMC_PROPERTY_RECORDS)[number] => Boolean(p));
    if (!q) return recs;
    return recs.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.lookupCode.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q) ||
        p.group.toLowerCase().includes(q)
    );
  }, [selectedQuery, selectedNames]);

  const addOne = (name: string) => {
    const next = new Set(selectedNames);
    next.add(name);
    patch({ properties: [...next] });
  };
  const removeOne = (name: string) => {
    const next = new Set(selectedNames);
    next.delete(name);
    patch({ properties: [...next] });
  };
  const addAll = () => {
    const all = new Set(selectedNames);
    availableRecords.forEach((r) => all.add(r.name));
    patch({ properties: [...all] });
  };
  const removeAll = () => {
    const remaining = new Set(selectedNames);
    selectedRecords.forEach((r) => remaining.delete(r.name));
    patch({ properties: [...remaining] });
  };
  const selectAllPortfolio = () => {
    patch({ properties: ["All properties"] });
  };
  const clearAll = () => {
    patch({ properties: [] });
  };

  const headerLabel = all
    ? "All Properties"
    : selectedNames.length === 0
      ? "Select Properties"
      : `${selectedNames.length} ${selectedNames.length === 1 ? "Property" : "Properties"} Selected`;

  return (
    <section>
      <h2 className="font-heading text-lg text-foreground">Which properties should this agent run on?</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Use the Available and Selected lists below — search, add one at a time, or add everything in view.
      </p>

      <div className="mt-4 flex items-center gap-2">
        <div className="flex flex-1 items-center justify-between rounded-md border border-border bg-white px-3 py-2 text-[13px] text-foreground">
          <span className="font-medium">{headerLabel}</span>
          <span className="text-[11px] text-muted-foreground">{PMC_PROPERTY_RECORDS.length} in portfolio</span>
        </div>
        <button
          type="button"
          onClick={selectAllPortfolio}
          className="whitespace-nowrap rounded-md border border-border bg-white px-3 py-2 text-[12px] font-medium text-foreground hover:bg-muted"
        >
          Select all properties
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="whitespace-nowrap rounded-md border border-border bg-white px-3 py-2 text-[12px] text-muted-foreground hover:bg-muted"
        >
          Clear
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Available */}
        <div className="rounded-lg border border-border bg-white">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <h3 className="text-[13px] font-semibold text-foreground">Available Properties</h3>
            <span className="text-[11px] text-muted-foreground">{availableRecords.length}</span>
          </div>
          <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-3 py-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={availableQuery}
                onChange={(e) => setAvailableQuery(e.target.value)}
                placeholder="Search"
                className="h-8 pl-8 text-[12px]"
              />
            </div>
            <button
              type="button"
              onClick={addAll}
              disabled={availableRecords.length === 0}
              className="whitespace-nowrap rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-40"
            >
              Add All
            </button>
          </div>
          <ul className="max-h-[380px] overflow-y-auto">
            {availableRecords.length === 0 && (
              <li className="px-3 py-6 text-center text-[12px] text-muted-foreground">
                {all ? "All properties are selected." : "No properties match your search."}
              </li>
            )}
            {availableRecords.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => addOne(p.name)}
                  className="group flex w-full items-center justify-between border-b border-border/60 px-3 py-2 text-left transition-colors hover:bg-emerald-50/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-foreground">{p.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {p.lookupCode} · {p.city}, {p.state} · {p.group}
                    </p>
                  </div>
                  <Plus className="h-4 w-4 shrink-0 text-emerald-600 opacity-60 group-hover:opacity-100" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Selected */}
        <div className="rounded-lg border border-border bg-white">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <h3 className="text-[13px] font-semibold text-foreground">Selected Properties</h3>
            <span className="text-[11px] text-muted-foreground">{selectedRecords.length}</span>
          </div>
          <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-3 py-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={selectedQuery}
                onChange={(e) => setSelectedQuery(e.target.value)}
                placeholder="Search"
                className="h-8 pl-8 text-[12px]"
              />
            </div>
            <button
              type="button"
              onClick={removeAll}
              disabled={selectedRecords.length === 0}
              className="whitespace-nowrap rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-medium text-red-800 hover:bg-red-100 disabled:opacity-40"
            >
              Remove All
            </button>
          </div>
          <ul className="max-h-[380px] overflow-y-auto">
            {selectedRecords.length === 0 && (
              <li className="px-3 py-6 text-center text-[12px] text-muted-foreground">
                No properties selected yet.
              </li>
            )}
            {selectedRecords.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => removeOne(p.name)}
                  className="group flex w-full items-center justify-between border-b border-border/60 px-3 py-2 text-left transition-colors hover:bg-red-50/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-foreground">{p.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {p.lookupCode} · {p.city}, {p.state} · {getPropertyPrimaryEmail(p.name)}
                    </p>
                  </div>
                  <X className="h-4 w-4 shrink-0 text-red-600 opacity-60 group-hover:opacity-100" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ─────────── Step 6: Communication (conditional) ─────────── */

function CommunicationStep({ version, patch }: { version: AgentVersion; patch: (p: Partial<AgentVersion>) => void }) {
  const inference = useMemo(
    () => inferFromPrompt(version.prompt, version.triggers ?? []),
    [version.prompt, version.triggers]
  );
  const comms: CommunicationCfg = version.communication ?? { enabled: false, channels: [] };
  const phoneAssignment: PhoneAssignmentMode = comms.phoneAssignment ?? "same";

  /** Properties this agent is associated with (ignores the "All properties" sentinel). */
  const associatedProperties = useMemo<string[]>(() => {
    if (version.properties.includes("All properties")) return [...PMC_PROPERTIES];
    return version.properties.filter((p) => p !== "All properties");
  }, [version.properties]);

  useEffect(() => {
    if (!comms.enabled && inference.needsCommunication) {
      patch({
        communication: {
          enabled: true,
          channels: inference.recommendedChannels,
          phoneAssignment: "same",
          phoneBehavior:
            inference.recommendedPhoneBehavior === "none" ? undefined : inference.recommendedPhoneBehavior,
          phoneNumber:
            inference.recommendedChannels.includes("sms") || inference.recommendedChannels.includes("voice")
              ? "+1 (555) 901-0423"
              : undefined,
          twilioCampaignIds: inference.recommendedChannels.includes("sms")
            ? ["camp.oxp-custom-agents"]
            : undefined,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Seed the voice opening line with a compliance-safe default the first
   * time the author turns voice on. We only populate when the voice field
   * is `undefined` (never set) — not just empty — so a manual clear isn't
   * silently overwritten. The legacy top-level `firstMessage` counts as a
   * populated value so older agents don't double-seed.
   */
  useEffect(() => {
    if (!comms.channels.includes("voice")) return;
    const voiceAlreadySet =
      comms.firstMessageByChannel?.voice !== undefined ||
      (comms.firstMessage !== undefined && comms.firstMessage !== "");
    if (voiceAlreadySet) return;
    setField({
      firstMessageByChannel: {
        ...(comms.firstMessageByChannel ?? {}),
        voice: DEFAULT_VOICE_OPENING_LINE,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comms.channels.includes("voice")]);

  const setField = (p: Partial<CommunicationCfg>) => patch({ communication: { ...comms, ...p } });
  const toggleChannel = (ch: CommunicationChannel) => {
    const set = new Set<CommunicationChannel>(comms.channels);
    if (set.has(ch)) set.delete(ch);
    else set.add(ch);
    setField({ channels: [...set] });
  };

  const setPerPropertyPhone = (propertyName: string, value: string) => {
    setField({
      perPropertyPhoneNumbers: {
        ...(comms.perPropertyPhoneNumbers ?? {}),
        [propertyName]: value,
      },
    });
  };
  const setPerPropertyEmail = (propertyName: string, value: string) => {
    setField({
      perPropertyEmailAliases: {
        ...(comms.perPropertyEmailAliases ?? {}),
        [propertyName]: value,
      },
    });
  };

  const hasPhoneChannel = comms.channels.includes("sms") || comms.channels.includes("voice");
  const hasEmailChannel = comms.channels.includes("email");
  const hasAnyChannel = comms.channels.length > 0;

  const brandSource: BrandVoiceSource = comms.brandVoiceSource ?? "custom";
  const isInheriting = brandSource === "inherit";
  const selectedInherit = BRAND_VOICE_INHERIT_OPTIONS.find(
    (o) => o.id === comms.brandVoiceInheritFrom
  );

  return (
    <section>
      <h2 className="font-heading text-lg text-foreground">Conversational Abilities</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        It looks like this agent will send or receive messages. Confirm how it should reach people across each associated property.
      </p>

      {/* ── Brand & Voice Source Toggle ── */}
      <div className="mt-5 rounded-xl border border-border bg-muted/20 p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Brand &amp; voice source
        </p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setField({ brandVoiceSource: "inherit" })}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
              isInheriting
                ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200"
                : "border-border bg-white hover:bg-muted/40"
            }`}
          >
            <Repeat className={`mt-0.5 h-4 w-4 shrink-0 ${isInheriting ? "text-indigo-600" : "text-muted-foreground"}`} />
            <div>
              <p className={`text-sm font-medium ${isInheriting ? "text-indigo-900" : "text-foreground"}`}>
                Inherit from platform
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Use the brand name, tone, voice preset, and opening lines already configured in another area of Entrata.
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setField({ brandVoiceSource: "custom" })}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
              !isInheriting
                ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200"
                : "border-border bg-white hover:bg-muted/40"
            }`}
          >
            <Sliders className={`mt-0.5 h-4 w-4 shrink-0 ${!isInheriting ? "text-indigo-600" : "text-muted-foreground"}`} />
            <div>
              <p className={`text-sm font-medium ${!isInheriting ? "text-indigo-900" : "text-foreground"}`}>
                Custom configuration
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Define the agent&apos;s persona, tone, voice, and opening lines from scratch in this step.
              </p>
            </div>
          </button>
        </div>

        {/* ── Inherit source selector ── */}
        {isInheriting && (
          <div className="mt-4">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Inherit from
            </label>
            <div className="space-y-2">
              {BRAND_VOICE_INHERIT_OPTIONS.map((opt) => {
                const active = comms.brandVoiceInheritFrom === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setField({ brandVoiceInheritFrom: opt.id })}
                    className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      active
                        ? "border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200"
                        : "border-border bg-white hover:bg-muted/30"
                    }`}
                  >
                    <div className={`mt-1 h-3 w-3 shrink-0 rounded-full border-2 ${
                      active ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground/40"
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-[13px] font-medium ${active ? "text-emerald-900" : "text-foreground"}`}>
                        {opt.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{opt.description}</p>
                    </div>
                    {opt.moduleKey && (
                      <a
                        href={`/?module=${opt.moduleKey}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 text-[10px] text-indigo-600 hover:underline"
                      >
                        View source
                      </a>
                    )}
                  </button>
                );
              })}
            </div>
            {selectedInherit && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2">
                <p className="text-[12px] text-emerald-800">
                  <Check className="mr-1 inline h-3.5 w-3.5" />
                  Inheriting brand &amp; voice from <strong>{selectedInherit.label}</strong>.
                  The agent will use the same persona name, tone, and voice settings.
                  You can switch to &ldquo;Custom configuration&rdquo; at any time to override individual settings.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Channels (always visible) ── */}
      <div className="mt-5 flex flex-wrap gap-2">
        {CHANNEL_TOGGLE_OPTIONS.map((opt) => {
          const selected = comms.channels.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleChannel(opt.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                selected ? "border-indigo-300 bg-indigo-100 text-indigo-800" : "border-border bg-white text-foreground hover:bg-muted"
              }`}
              title={opt.helper}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* ── Custom config: persona name, voice, opening lines ── */}
      {/* Hidden when inheriting — the inherited source provides these */}
      {isInheriting && hasAnyChannel && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5">
          <p className="text-[12px] text-amber-800">
            <Info className="mr-1 inline h-3.5 w-3.5" />
            Persona name, voice preset, tone, and opening lines are inherited from{" "}
            <strong>{selectedInherit?.label ?? "the selected source"}</strong>.
            Switch to &ldquo;Custom configuration&rdquo; above to override them.
          </p>
        </div>
      )}

      {!isInheriting && hasAnyChannel && (
        <div className="mt-5 rounded-lg border border-border bg-muted/20 p-4">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Agent name (what customers see)
          </label>
          <Input
            value={comms.personaName ?? ""}
            onChange={(e) => setField({ personaName: e.target.value })}
            placeholder={version.name ? `e.g. Riley — falls back to "${version.name}" when blank` : "e.g. Riley"}
          />
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            This is the name the agent signs off with across every channel. Leave blank to use the agent&apos;s internal name ({version.name || "untitled"}).
            Referenced as <code className="rounded bg-muted px-1 text-[10px]">{"{{agent.persona}}"}</code> in opening lines and the prompt.
          </p>
        </div>
      )}

      {/*
        ────────────────────────────────────────────────────────────────────
        TEMPORARILY DISABLED — phone-number / Twilio campaign / email alias
        configuration has been pulled out of the Agent Builder. These
        decisions are being moved to a property-scoped surface (TBD) so
        each property controls its own numbers, 10DLC registration, and
        inbox routing without having to edit every agent.
        ────────────────────────────────────────────────────────────────────

        The code below is preserved exactly as it was — wrapped in
        `{false && (...)}` so TypeScript keeps type-checking it and it
        doesn't bit-rot. When the new home for this config is decided,
        lift these blocks over rather than re-deriving them.

        Helpers referenced inside (`PhoneBehaviorPicker`,
        `TwilioCampaignMultiSelect`, `getPropertyPrimaryEmail`,
        `setPerPropertyPhone`, `setPerPropertyEmail`, and the
        `phoneAssignment` / `hasPhoneChannel` / `hasEmailChannel`
        derived values) are intentionally still computed at the top of
        CommunicationStep so those imports stay referenced.
      */}
      {false && (
        <>
          {/* Per-property assignment picker */}
          {hasAnyChannel && associatedProperties.length > 1 && (
            <div className="mt-5 rounded-lg border border-border bg-muted/20 p-4">
              <label className="mb-2 block text-xs font-medium text-muted-foreground">
                This agent runs on <span className="font-semibold text-foreground">{associatedProperties.length} properties</span>.
                Do you want to use the same phone number &amp; email alias for each property, or give each property their own?
              </label>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setField({ phoneAssignment: "same" })}
                  className={`rounded-md border px-3 py-2 text-left text-xs ${
                    phoneAssignment === "same" ? "border-indigo-300 bg-indigo-50" : "border-border bg-white hover:bg-muted"
                  }`}
                >
                  <p className="font-medium text-foreground">Use the same for all properties</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    One number, one inbox. Simpler to manage.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setField({ phoneAssignment: "per_property" })}
                  className={`rounded-md border px-3 py-2 text-left text-xs ${
                    phoneAssignment === "per_property" ? "border-indigo-300 bg-indigo-50" : "border-border bg-white hover:bg-muted"
                  }`}
                >
                  <p className="font-medium text-foreground">Customize per property</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Each property gets its own phone number &amp; email alias.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* ===== Same-for-all phone block ===== */}
          {hasPhoneChannel && phoneAssignment === "same" && (
            <div className="mt-5 space-y-4 rounded-lg border border-border bg-muted/20 p-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Phone number (all properties)</label>
                <Input
                  value={comms.phoneNumber ?? ""}
                  onChange={(e) => setField({ phoneNumber: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <PhoneBehaviorPicker comms={comms} setField={setField} />
            </div>
          )}

          {/* ===== Per-property phone block ===== */}
          {hasPhoneChannel && phoneAssignment === "per_property" && (
            <div className="mt-5 rounded-lg border border-border bg-muted/20 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-foreground">Phone numbers per property</p>
                  <p className="text-[11px] text-muted-foreground">
                    Assign a dedicated Twilio-provisioned number to each property this agent runs on.
                  </p>
                </div>
                <span className="text-[11px] text-muted-foreground">{associatedProperties.length} properties</span>
              </div>
              {associatedProperties.length === 0 ? (
                <div className="rounded-md border border-dashed border-border bg-white p-3 text-[12px] text-muted-foreground">
                  Attach properties to this agent first (on the agent&apos;s Properties tab) to configure phone numbers per property.
                </div>
              ) : (
                <div className="max-h-[320px] space-y-1.5 overflow-y-auto rounded-md border border-border bg-white p-2">
                  {associatedProperties.map((name) => (
                    <div key={name} className="grid grid-cols-[1fr_minmax(0,220px)] items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40">
                      <p className="truncate text-[13px] text-foreground">{name}</p>
                      <Input
                        value={comms.perPropertyPhoneNumbers?.[name] ?? ""}
                        onChange={(e) => setPerPropertyPhone(name, e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="h-8 text-[12px]"
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3">
                <PhoneBehaviorPicker comms={comms} setField={setField} />
              </div>
            </div>
          )}

          {/* ===== Twilio campaigns (multi-select searchable) ===== */}
          {comms.channels.includes("sms") && (
            <div className="mt-5 space-y-2 rounded-lg border border-border bg-muted/20 p-4">
              <label className="block text-xs font-medium text-muted-foreground">Twilio campaigns</label>
              <p className="text-[11px] text-muted-foreground">
                Select one or more registered 10DLC campaigns that this agent is allowed to send on.
              </p>
              <TwilioCampaignMultiSelect
                value={comms.twilioCampaignIds ?? []}
                onChange={(ids) => setField({ twilioCampaignIds: ids })}
              />
            </div>
          )}

          {/* ===== Email: same-for-all ===== */}
          {hasEmailChannel && phoneAssignment === "same" && (
            <div className="mt-5 rounded-lg border border-border bg-muted/20 p-4">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email alias (all properties)</label>
              <Input
                value={comms.emailAlias ?? ""}
                onChange={(e) => setField({ emailAlias: e.target.value })}
                placeholder="agent@yourcompany.com"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                By default we&apos;ll use each property&apos;s primary email address. Enter a different one here if you&apos;d rather route replies somewhere else.
              </p>
            </div>
          )}

          {/* ===== Email: per-property overrides, defaulted from property_email_addresses ===== */}
          {hasEmailChannel && phoneAssignment === "per_property" && (
            <div className="mt-5 rounded-lg border border-border bg-muted/20 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-foreground">Email aliases per property</p>
                  <p className="text-[11px] text-muted-foreground">
                    By default we&apos;ll use each property&apos;s primary email address. Override any row below if you&apos;d rather route replies to a different mailbox.
                  </p>
                </div>
                <span className="text-[11px] text-muted-foreground">{associatedProperties.length} properties</span>
              </div>
              {associatedProperties.length === 0 ? (
                <div className="rounded-md border border-dashed border-border bg-white p-3 text-[12px] text-muted-foreground">
                  Attach properties to this agent first (on the agent&apos;s Properties tab) to configure email aliases per property.
                </div>
              ) : (
                <div className="max-h-[320px] space-y-1.5 overflow-y-auto rounded-md border border-border bg-white p-2">
                  {associatedProperties.map((name) => {
                    const defaultEmail = getPropertyPrimaryEmail(name);
                    const overrideValue = comms.perPropertyEmailAliases?.[name] ?? defaultEmail;
                    const isOverridden = (comms.perPropertyEmailAliases?.[name] ?? "").length > 0 && comms.perPropertyEmailAliases?.[name] !== defaultEmail;
                    return (
                      <div
                        key={name}
                        className="grid grid-cols-[1fr_minmax(0,280px)] items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13px] text-foreground">{name}</p>
                          {!isOverridden && (
                            <p className="truncate text-[10px] text-muted-foreground">
                              default · property primary email
                            </p>
                          )}
                          {isOverridden && (
                            <p className="truncate text-[10px] text-amber-700">overridden</p>
                          )}
                        </div>
                        <Input
                          value={overrideValue}
                          onChange={(e) => setPerPropertyEmail(name, e.target.value)}
                          className="h-8 text-[12px]"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ===== Voice (hidden when inheriting) ===== */}
      {!isInheriting && comms.channels.includes("voice") && (
        <div className="mt-5 space-y-4 rounded-lg border border-border bg-muted/20 p-4">
          <VoicePickerWithPreview
            selectedVoiceId={comms.voiceId ?? ""}
            onSelect={(id) => setField({ voiceId: id })}
          />
          {/*
            Transfer number previously lived here. Removed because warm-/
            cold-transfer destinations are now a first-class part of the
            Escalation step, which lets authors pick per-property resolution
            (main line / manager / on-call) instead of typing one number.
            The `transferNumber` field remains on CommunicationCfg so any
            legacy agent data keeps loading cleanly.
          */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Recording consent</label>
            <textarea
              value={comms.recordingConsent ?? ""}
              onChange={(e) => setField({ recordingConsent: e.target.value })}
              rows={2}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-xs text-foreground"
              placeholder="This call may be recorded for quality and training purposes."
            />
          </div>

          <VoiceRuntimePanel
            runtime={comms.voiceRuntime}
            onChange={(next) => setField({ voiceRuntime: next })}
          />
        </div>
      )}

      {/* ===== Opening line (hidden when inheriting) ===== */}
      {!isInheriting && hasAnyChannel && (
        <div className="mt-5 rounded-lg border border-border bg-muted/20 p-4">
          <div className="mb-2">
            <p className="text-[13px] font-semibold text-foreground">Opening line</p>
            <p className="text-[11px] text-muted-foreground">
              The scripted start of a conversation — not the whole first turn. For channels where the agent reaches out first, or where brand voice and compliance language matter, pin the wording here. Merge fields like <code className="rounded bg-muted px-1 text-[10px]">{"{{property.name}}"}</code> keep it personalized across properties.
            </p>
          </div>

          <MergeFieldHelper />

          <div className="mt-3 space-y-3">
            {comms.channels.includes("email") && (
              <FirstMessageField
                channel="email"
                label="Email — opening greeting"
                subtext="Useful when the agent sends the first message (outbound campaigns, renewal offers, notifications). For inbound-only email agents you can let the LLM compose the reply from your prompt instead."
                placeholder={"Hi {{customer.first_name}}, this is the leasing team at {{property.name}}. …"}
                value={comms.firstMessageByChannel?.email ?? comms.firstMessage ?? ""}
                onChange={(v) =>
                  setField({
                    firstMessageByChannel: {
                      ...(comms.firstMessageByChannel ?? {}),
                      email: v,
                    },
                  })
                }
                allowSkipToPrompt
                skipped={comms.letLlmComposeOpening?.email ?? false}
                onSkipChange={(skipped) =>
                  setField({
                    letLlmComposeOpening: {
                      ...(comms.letLlmComposeOpening ?? {}),
                      email: skipped,
                    },
                  })
                }
              />
            )}
            {comms.channels.includes("sms") && (
              <FirstMessageField
                channel="sms"
                label="SMS — first text message"
                subtext="Required when the agent texts first (outbound). Optional when the agent only replies to resident-initiated texts — then the LLM can compose a natural reply from the prompt."
                placeholder={"Hi! This is {{agent.persona}} from {{property.name}}. Quick question…"}
                value={comms.firstMessageByChannel?.sms ?? comms.firstMessage ?? ""}
                onChange={(v) =>
                  setField({
                    firstMessageByChannel: {
                      ...(comms.firstMessageByChannel ?? {}),
                      sms: v,
                    },
                  })
                }
                allowSkipToPrompt
                skipped={comms.letLlmComposeOpening?.sms ?? false}
                onSkipChange={(skipped) =>
                  setField({
                    letLlmComposeOpening: {
                      ...(comms.letLlmComposeOpening ?? {}),
                      sms: skipped,
                    },
                  })
                }
              />
            )}
            {comms.channels.includes("voice") && (
              <FirstMessageField
                channel="voice"
                label="Voice — opening line on calls"
                subtext="Required for voice. This plays before the LLM starts generating — silence on pickup feels like a dropped call — and is where recording-consent and identity-disclosure language belong so Legal can audit the exact wording."
                placeholder={"Thanks for calling {{property.name}}, this is {{agent.persona}} — how can I help today?"}
                value={comms.firstMessageByChannel?.voice ?? comms.firstMessage ?? ""}
                onChange={(v) =>
                  setField({
                    firstMessageByChannel: {
                      ...(comms.firstMessageByChannel ?? {}),
                      voice: v,
                    },
                  })
                }
              />
            )}
            {comms.channels.includes("chat") && (
              <FirstMessageField
                channel="chat"
                label="Chat — first message in the thread"
                subtext="Shown the moment a resident opens a chat thread. Useful for announcing scope (what this agent can help with) and setting expectations. Optional — you can let the LLM compose a context-aware opener from your prompt instead."
                placeholder={"Hi {{customer.first_name}}! This is {{agent.persona}} from {{property.name}} — how can I help today?"}
                value={comms.firstMessageByChannel?.chat ?? comms.firstMessage ?? ""}
                onChange={(v) =>
                  setField({
                    firstMessageByChannel: {
                      ...(comms.firstMessageByChannel ?? {}),
                      chat: v,
                    },
                  })
                }
                allowSkipToPrompt
                skipped={comms.letLlmComposeOpening?.chat ?? false}
                onSkipChange={(skipped) =>
                  setField({
                    letLlmComposeOpening: {
                      ...(comms.letLlmComposeOpening ?? {}),
                      chat: skipped,
                    },
                  })
                }
              />
            )}
          </div>
        </div>
      )}

      {/* ── Super Agent Delegation ── */}
      <div className="mt-8 rounded-xl border border-purple-200 bg-purple-50/30 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-purple-900">Super Agent Delegation</h3>
              <p className="text-[11px] text-purple-800/80">
                Allow Entrata&apos;s Super Agent to route questions to this agent based on its capabilities.
              </p>
            </div>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={version.superAgentEnabled ?? false}
              onChange={(e) => patch({ superAgentEnabled: e.target.checked })}
              className="h-4 w-4 rounded border-purple-300 accent-purple-600"
            />
            <span className="text-xs font-medium text-foreground">Enable</span>
          </label>
        </div>

        {version.superAgentEnabled && (
          <div className="mt-4 space-y-4 border-t border-purple-200 pt-4">
            <div className="rounded-lg border border-purple-100 bg-white/60 p-3">
              <div className="flex items-start gap-2 text-[11px] text-purple-800">
                <Brain className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-600" />
                <p>
                  Super Agent is Entrata&apos;s unified conversational AI that handles a wide range of topics.
                  When enabled, Super Agent can delegate specific questions to this agent based on the description
                  and routing hints you provide below.
                </p>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-purple-900" htmlFor="super-agent-desc">
                Agent capability description
              </label>
              <p className="mb-1 text-[11px] text-purple-800/70">
                Describe what this agent does so Super Agent knows when to route questions here.
              </p>
              <textarea
                id="super-agent-desc"
                value={version.superAgentDescription ?? ""}
                onChange={(e) => patch({ superAgentDescription: e.target.value })}
                rows={3}
                placeholder="This agent handles utility pre-bill approvals. It can review gross recapture percentages, approve or reject pre-bills, and answer questions about utility billing."
                className="w-full rounded-md border border-purple-200 bg-white px-3 py-2 text-sm text-foreground placeholder:text-purple-400/60 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-purple-900" htmlFor="super-agent-hints">
                Routing hints
              </label>
              <p className="mb-1 text-[11px] text-purple-800/70">
                Keywords, topics, or question patterns that should trigger delegation to this agent.
              </p>
              <textarea
                id="super-agent-hints"
                value={version.superAgentRoutingHints ?? ""}
                onChange={(e) => patch({ superAgentRoutingHints: e.target.value })}
                rows={2}
                placeholder="utility billing, pre-bill approval, gross recapture, utility pre-bills, VCR invoices"
                className="w-full rounded-md border border-purple-200 bg-white px-3 py-2 text-sm text-foreground placeholder:text-purple-400/60 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
            </div>

            {(!version.superAgentDescription || version.superAgentDescription.trim().length < 20) && (
              <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 p-2.5">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <p className="text-[11px] text-amber-800">
                  A detailed description helps Super Agent route accurately. Aim for at least a couple sentences describing this agent&apos;s domain and capabilities.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Channels shown in the CommunicationStep pill row. Declared as a constant
 * (rather than `["sms","email","voice","chat"] as const` inline) so the
 * helper strings are colocated with the toggle UI — authors need the "what
 * is chat exactly?" context inline, not buried in docs elsewhere.
 */
const CHANNEL_TOGGLE_OPTIONS: ReadonlyArray<{
  value: CommunicationChannel;
  label: string;
  helper: string;
}> = Object.freeze([
  {
    value: "sms",
    label: "SMS",
    helper: "Texting through a 10DLC-registered property phone number.",
  },
  {
    value: "email",
    label: "Email",
    helper: "Inbound and outbound email through the property's mailbox.",
  },
  {
    value: "voice",
    label: "Voice",
    helper: "Phone calls via the property's voice provider.",
  },
  {
    value: "chat",
    label: "Chat",
    helper:
      "In-product chat — resident portal messages and website chat threads. Text-based like SMS but without 10DLC/number constraints.",
  },
]);

/* ─────────── Communication helper components ─────────── */

function PhoneBehaviorPicker({
  comms,
  setField,
}: {
  comms: CommunicationCfg;
  setField: (p: Partial<CommunicationCfg>) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Number assignment</label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setField({ phoneBehavior: "dedicated" })}
          className={`flex-1 rounded-md border px-3 py-2 text-left text-xs ${
            comms.phoneBehavior === "dedicated" ? "border-indigo-300 bg-indigo-50" : "border-border bg-white hover:bg-muted"
          }`}
        >
          <p className="font-medium text-foreground">Dedicated to this agent</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Best for back-and-forth conversations.</p>
        </button>
        <button
          type="button"
          onClick={() => setField({ phoneBehavior: "shared" })}
          className={`flex-1 rounded-md border px-3 py-2 text-left text-xs ${
            comms.phoneBehavior === "shared" ? "border-indigo-300 bg-indigo-50" : "border-border bg-white hover:bg-muted"
          }`}
        >
          <p className="font-medium text-foreground">Shared</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Fine for one-way outbound only.</p>
        </button>
      </div>
      {comms.phoneBehavior === "shared" && (
        <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            Sharing a number can lead to messy SMS threads if multiple agents respond to the same contact. Prefer a dedicated number if this agent has ongoing conversations.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Voice selector with per-voice preview playback.
 *
 * Preview strategy (prototype):
 *   Production eventually streams an ElevenLabs preview for the configured
 *   `elevenlabsVoiceId`, but that requires signed URLs and a CORS-friendly
 *   proxy that isn't wired up for this demo. To give builders real auditory
 *   feedback today, we fall back to the browser's built-in
 *   `speechSynthesis` API with a voice chosen to roughly match the
 *   catalog's gender / accent hints. The sample line uses the persona so
 *   authors can A/B the voices side-by-side.
 *
 * The UI renders each voice as a card (radio-button-selectable row) with a
 * Play/Stop button. Selecting a row still updates the agent's `voiceId`.
 */
function VoicePickerWithPreview({
  selectedVoiceId,
  onSelect,
}: {
  selectedVoiceId: string;
  onSelect: (voiceId: string) => void;
}) {
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [synthVoices, setSynthVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSpeechSupported(false);
      return;
    }
    const loadVoices = () => {
      setSynthVoices(window.speechSynthesis.getVoices());
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      // Don't leave a half-played sample behind when the component unmounts.
      window.speechSynthesis.cancel();
    };
  }, []);

  const stop = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setPlayingVoiceId(null);
  };

  const play = (voice: (typeof VOICE_CATALOG)[number]) => {
    if (!speechSupported) return;
    window.speechSynthesis.cancel();

    const sample =
      `Hi, this is ${voice.persona} calling from your property management team. ` +
      `I just wanted to follow up on your recent request — do you have a minute to chat?`;

    const utterance = new SpeechSynthesisUtterance(sample);
    // Best-effort match: prefer a SpeechSynthesis voice whose lang starts with
    // the catalog accent (e.g. "en-US", "en-GB"), and whose name hints at a
    // matching gender. Browsers don't expose a gender field, so we guess from
    // common voice-name heuristics; if nothing matches we just let the
    // platform pick.
    const accentPrefix = voice.accent.split("-")[0];
    const genderHints: Record<(typeof voice)["gender"], RegExp> = {
      feminine: /(female|woman|samantha|victoria|karen|tessa|moira|fiona|zira|sarah|maya|harper|olivia)/i,
      masculine: /(male|man|daniel|alex|fred|eric|diego|oliver)/i,
      neutral: /./,
    };
    const accentMatches = synthVoices.filter((v) =>
      v.lang.toLowerCase().startsWith(accentPrefix.toLowerCase())
    );
    const genderMatch = accentMatches.find((v) =>
      genderHints[voice.gender].test(v.name)
    );
    const fallback = accentMatches[0] ?? synthVoices[0];
    const chosen = genderMatch ?? fallback;
    if (chosen) utterance.voice = chosen;
    utterance.rate = 1;
    utterance.pitch = voice.gender === "feminine" ? 1.05 : voice.gender === "masculine" ? 0.95 : 1;

    utterance.onend = () => {
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null;
        setPlayingVoiceId(null);
      }
    };
    utterance.onerror = () => {
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null;
        setPlayingVoiceId(null);
      }
    };

    utteranceRef.current = utterance;
    setPlayingVoiceId(voice.id);
    window.speechSynthesis.speak(utterance);
  };

  const handleToggle = (voice: (typeof VOICE_CATALOG)[number]) => {
    if (playingVoiceId === voice.id) {
      stop();
    } else {
      play(voice);
    }
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">Voice</label>
        {!speechSupported && (
          <span className="text-[10px] text-muted-foreground">
            Previews not supported in this browser.
          </span>
        )}
      </div>

      <ul className="space-y-1.5" role="radiogroup" aria-label="Voice">
        {VOICE_CATALOG.map((voice) => {
          const selected = selectedVoiceId === voice.id;
          const isPlaying = playingVoiceId === voice.id;
          return (
            <li key={voice.id}>
              <div
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                  selected
                    ? "border-indigo-300 bg-indigo-50"
                    : "border-border bg-white hover:bg-muted"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(voice.id)}
                  role="radio"
                  aria-checked={selected}
                  className="flex min-w-0 flex-1 items-start gap-2 text-left"
                >
                  <span
                    className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                      selected
                        ? "border-indigo-500 bg-indigo-500"
                        : "border-muted-foreground bg-white"
                    }`}
                    aria-hidden="true"
                  >
                    {selected && (
                      <span className="block h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-foreground">
                      {voice.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {voice.description}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle(voice)}
                  disabled={!speechSupported}
                  aria-label={
                    isPlaying
                      ? `Stop preview of ${voice.persona}`
                      : `Play sample of ${voice.persona}`
                  }
                  aria-pressed={isPlaying}
                  className={`flex h-8 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-colors ${
                    isPlaying
                      ? "border-indigo-300 bg-indigo-100 text-indigo-700"
                      : "border-border bg-white text-foreground hover:bg-muted"
                  } ${!speechSupported ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  {isPlaying ? (
                    <>
                      <Square className="h-3 w-3 fill-current" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 fill-current" />
                      Sample
                    </>
                  )}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Volume2 className="h-3 w-3" /> Previews use your device&apos;s speech engine; production uses the agent&apos;s ElevenLabs voice.
      </p>
    </div>
  );
}

function TwilioCampaignMultiSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selectedSet = useMemo(() => new Set(value), [value]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TWILIO_CAMPAIGNS;
    return TWILIO_CAMPAIGNS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.useCase.toLowerCase().includes(q) ||
        c.campaignId.toLowerCase().includes(q)
    );
  }, [query]);

  const toggle = (id: string) => {
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };

  const selectedChips = useMemo(
    () => TWILIO_CAMPAIGNS.filter((c) => selectedSet.has(c.id)),
    [selectedSet]
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full flex-wrap items-center gap-1.5 rounded-md border border-border bg-white px-2 py-1.5 text-left text-[12px] hover:bg-muted/40"
      >
        {selectedChips.length === 0 && (
          <span className="py-0.5 text-muted-foreground">Search and select Twilio campaigns…</span>
        )}
        {selectedChips.map((c) => (
          <span
            key={c.id}
            className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-800"
          >
            {c.name}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                toggle(c.id);
              }}
              className="rounded-full p-0.5 hover:bg-indigo-200/60"
              aria-label={`Remove ${c.name}`}
            >
              <X className="h-3 w-3" />
            </span>
          </span>
        ))}
        <ChevronRight className={`ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-white shadow-lg">
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search campaigns by name, use case, or ID"
                className="h-8 pl-8 text-[12px]"
              />
            </div>
          </div>
          <ul className="max-h-[280px] overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-[12px] text-muted-foreground">
                No campaigns match your search.
              </li>
            )}
            {filtered.map((c) => {
              const checked = selectedSet.has(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => toggle(c.id)}
                    className={`flex w-full items-start gap-2 border-b border-border/60 px-3 py-2 text-left text-[12px] transition-colors ${
                      checked ? "bg-indigo-50/60" : "hover:bg-muted/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-border accent-indigo-600"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[13px] font-medium text-foreground">{c.name}</p>
                        <Badge variant="outline" className="h-4 px-1.5 text-[9px]">
                          {c.useCase}
                        </Badge>
                        {c.status === "pending" && (
                          <Badge variant="outline" className="h-4 border-amber-200 px-1.5 text-[9px] text-amber-700">
                            Pending
                          </Badge>
                        )}
                      </div>
                      <p className="truncate font-mono text-[10px] text-muted-foreground/80">
                        {c.campaignId} · {c.messagesPerDay.toLocaleString()} msgs/day
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between border-t border-border p-2 text-[11px] text-muted-foreground">
            <span>{selectedChips.length} selected</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-border bg-white px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MergeFieldHelper() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border border-border bg-white p-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-[11px] font-medium text-foreground">Merge fields</span>
        <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {FIRST_MESSAGE_MERGE_FIELDS.map((f) => (
            <button
              key={f.token}
              type="button"
              title={`Example: ${f.example}`}
              onClick={() => {
                try {
                  void navigator.clipboard?.writeText(f.token);
                } catch {
                  /* clipboard is best-effort */
                }
              }}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 font-mono text-[10px] text-foreground hover:bg-muted"
            >
              {f.token}
              <span className="font-sans text-[9px] text-muted-foreground">· {f.label}</span>
            </button>
          ))}
        </div>
      )}
      {!open && (
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          Click to expand. Tap a token to copy it; paste into any channel below.
        </p>
      )}
    </div>
  );
}

/**
 * Per-channel opening-line editor used inside CommunicationStep.
 *
 * Subtext explains *why* this channel has its own field. When
 * `allowSkipToPrompt` is set, authors can collapse the textarea away with
 * a checkbox so the LLM composes the first reply from the system prompt
 * instead. Voice intentionally never gets that escape hatch — see the
 * comment on `letLlmComposeOpening` in custom-agents-context.tsx.
 */
function FirstMessageField({
  channel,
  label,
  subtext,
  placeholder,
  value,
  onChange,
  allowSkipToPrompt,
  skipped,
  onSkipChange,
}: {
  channel: "email" | "sms" | "voice" | "chat";
  label: string;
  subtext?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  allowSkipToPrompt?: boolean;
  skipped?: boolean;
  onSkipChange?: (skipped: boolean) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const insertAtCursor = (token: string) => {
    const el = textareaRef.current;
    if (!el) {
      onChange((value ?? "") + token);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + token.length;
    });
  };

  const accentClass =
    channel === "email"
      ? "border-sky-200 bg-sky-50/40"
      : channel === "sms"
        ? "border-indigo-200 bg-indigo-50/40"
        : "border-violet-200 bg-violet-50/40";

  const isSkipped = Boolean(allowSkipToPrompt && skipped);

  return (
    <div className={`rounded-md border p-3 ${accentClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </label>
          {subtext && (
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              {subtext}
            </p>
          )}
        </div>
        {!isSkipped && (
          <div className="flex flex-wrap gap-1">
            {FIRST_MESSAGE_MERGE_FIELDS.slice(0, 4).map((f) => (
              <button
                key={f.token}
                type="button"
                onClick={() => insertAtCursor(f.token)}
                className="rounded border border-border bg-white px-1.5 py-0.5 font-mono text-[9px] text-foreground hover:bg-muted"
                title={`Insert ${f.label}`}
              >
                {f.token.replace(/[{}]/g, "")}
              </button>
            ))}
          </div>
        )}
      </div>

      {allowSkipToPrompt && (
        <label className="mt-2 flex items-start gap-2 text-[11px] text-muted-foreground">
          <input
            type="checkbox"
            checked={isSkipped}
            onChange={(e) => onSkipChange?.(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 rounded border-border"
          />
          <span>
            Let the agent compose its own opening from the prompt
            {isSkipped && (
              <span className="ml-1 text-muted-foreground/70">
                — the LLM will reply to the first inbound message on its own, guided by your Name &amp; prompt step.
              </span>
            )}
          </span>
        </label>
      )}

      {!isSkipped && (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="mt-2 w-full rounded-md border border-border bg-white px-3 py-2 text-xs text-foreground"
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

/* ─────────── Step 7: Cost & Dry-run ─────────── */

function ExpectedRunsAndCost({
  version,
  patch,
  cost,
  isRed,
  isAmber,
}: {
  version: AgentVersion;
  patch: (p: Partial<AgentVersion>) => void;
  cost: AgentVersion["costEstimate"];
  isRed: boolean;
  isAmber: boolean;
}) {
  const computedRuns = cost?.runsPerMonth ?? 0;
  const override = version.expectedRunsOverride;
  const runs = override ?? computedRuns;
  const perRunCost = cost?.perRunCost ?? 0;
  const monthly = runs * perRunCost;

  const [rawInput, setRawInput] = useState<string>(() =>
    (override ?? computedRuns).toString()
  );

  useEffect(() => {
    // Keep the text field in sync when the underlying value changes externally
    // (e.g. user edits triggers on a different step and comes back).
    setRawInput((override ?? computedRuns).toString());
  }, [override, computedRuns]);

  const commitInput = (raw: string) => {
    const parsed = Math.max(0, Math.round(Number(raw.replace(/[,\s]/g, "")) || 0));
    if (!Number.isFinite(parsed)) return;
    patch({ expectedRunsOverride: parsed });
  };

  const resetToComputed = () => {
    patch({ expectedRunsOverride: undefined });
    setRawInput(computedRuns.toString());
  };

  const isOverridden = override !== undefined && override !== computedRuns;

  return (
    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="rounded-lg border border-border bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Expected runs
          </p>
          {isOverridden && (
            <button
              type="button"
              onClick={resetToComputed}
              className="text-[10px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
              title={`Reset to computed value (${computedRuns.toLocaleString()})`}
            >
              reset
            </button>
          )}
        </div>
        <Input
          inputMode="numeric"
          pattern="[0-9,]*"
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          onBlur={() => commitInput(rawInput)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          className="mt-1 h-9 font-heading text-2xl"
          aria-label="Expected runs per month"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          {isOverridden
            ? `per month · computed ${computedRuns.toLocaleString()}`
            : "per month · estimated from triggers"}
        </p>
      </div>
      <div className={`rounded-lg border p-4 ${isRed ? "border-amber-300 bg-amber-50" : "border-border bg-white"}`}>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Estimated Cost Per Run
        </p>
        <p className={`mt-1 font-heading text-2xl ${isRed ? "text-amber-900" : "text-foreground"}`}>
          {cost ? formatCurrency(perRunCost) : "—"}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {isRed ? "× 1.4 retry surcharge" : isAmber ? "grows with context size" : "avg cost"}
        </p>
      </div>
      <div
        className={`rounded-lg border p-4 ${
          isRed ? "border-amber-300 bg-amber-50" : "border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50"
        }`}
      >
        <p
          className={`text-[11px] font-medium uppercase tracking-wider ${
            isRed ? "text-amber-700" : "text-indigo-700"
          }`}
        >
          Monthly estimate
        </p>
        <p className={`mt-1 font-heading text-2xl ${isRed ? "text-amber-900" : "text-indigo-900"}`}>
          {cost ? formatCurrency(monthly) : "—"}
        </p>
        <p className={`text-[11px] ${isRed ? "text-amber-700/80" : "text-indigo-700/80"}`}>
          {isRed ? "hallucination risk at this size" : "runs × per-run cost"}
        </p>
      </div>
    </div>
  );
}

function CostDryRunStep({ version, patch }: { version: AgentVersion; patch: (p: Partial<AgentVersion>) => void }) {
  const cost = version.costEstimate;
  const usage = evaluateContextUsage(version);
  const memory: MemoryCfg = version.memory ?? { enabled: false, lastN: 3, retentionDays: 30 };

  const zone = cost?.zone ?? usage.zone;
  const isAmber = zone === "amber";
  const isRed = zone === "red";

  return (
    <section>
      <h2 className="font-heading text-lg text-foreground">Cost and memory</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        This scales with how often the agent runs, how long the prompt is, and how many data sources + skills you&apos;ve attached.
      </p>

      <ExpectedRunsAndCost version={version} patch={patch} cost={cost} isRed={isRed} isAmber={isAmber} />

      <div className="mt-4 rounded-lg border border-border bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Context window usage
          </p>
          <span className="text-[11px] text-muted-foreground">
            {usage.inputTokens.toLocaleString()} / {(128_000).toLocaleString()} tokens
          </span>
        </div>
        <div className="mt-2">
          <ContextBar usage={usage} />
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          {usage.breakdown.map((b) => (
            <li key={b.label} className="flex items-center justify-between">
              <span>{b.label}</span>
              <span className="tabular-nums text-foreground">{b.tokens.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>

      {zone !== "green" && (
        <div className="mt-3">
          <ThresholdWarning version={version} />
        </div>
      )}

      {cost && cost.breakdown.length > 0 && (
        <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Breakdown</p>
          <ul className="space-y-1 text-[12px] text-foreground">
            {cost.breakdown.map((b, i) => (
              <li key={i} className="flex items-center justify-between">
                <span>{b.label}</span>
                <span className="font-medium">{b.runs.toLocaleString()} runs/mo</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 rounded-lg border border-border bg-white p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Cross-run memory</h3>
            </div>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Let this agent remember context from previous runs so it can build on earlier actions.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={memory.enabled}
              onChange={(e) => patch({ memory: { ...memory, enabled: e.target.checked } })}
              className="h-4 w-4 rounded border-border accent-indigo-600"
            />
            <span className="text-xs font-medium text-foreground">On</span>
          </label>
        </div>
        {memory.enabled && (
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Remember last</label>
              <Input
                type="number"
                min={1}
                max={20}
                value={memory.lastN}
                onChange={(e) => patch({ memory: { ...memory, lastN: Number(e.target.value) || 1 } })}
              />
              <p className="mt-1 text-[10px] text-muted-foreground">runs</p>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">For up to</label>
              <Input
                type="number"
                min={1}
                max={365}
                value={memory.retentionDays}
                onChange={(e) => patch({ memory: { ...memory, retentionDays: Number(e.target.value) || 1 } })}
              />
              <p className="mt-1 text-[10px] text-muted-foreground">days</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/10 p-4">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="text-[12px] text-muted-foreground">
            <p className="font-medium text-foreground">Try it safely with dry-run.</p>
            <p className="mt-0.5">
              Deploy this agent in dry-run mode and it will log what it <em>would</em> have done without actually doing it. Come back in a few days, review the runs, and promote to live when you&apos;re confident.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────── Step 8: Review ─────────── */

function ReviewStep({ version }: { version: AgentVersion }) {
  const cost = version.costEstimate;
  return (
    <section>
      <h2 className="font-heading text-lg text-foreground">Review your agent</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Here&apos;s everything we&apos;re about to set up. Use Back to tweak anything.
      </p>

      <div className="mt-5 space-y-4">
        <SummaryRow label="Name" value={version.name || "(unnamed)"} />
        <SummaryRow
          label="Triggers"
          value={
            version.triggers.length === 0
              ? "None"
              : version.triggers
                  .map((t) => {
                    if (t.kind === "schedule") return formatScheduleTrigger(t);
                    if (t.kind === "event")
                      return `Event · ${EVENT_CATALOG.find((e) => e.id === t.eventId)?.label}`;
                    return `Inbound · ${t.channel.toUpperCase()}`;
                  })
                  .join(", ")
          }
        />
        <SummaryRow label="Prompt" value={version.prompt || "—"} multiline />
        {version.guardrails && (
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-900">
              <Shield className="h-3.5 w-3.5" />
              Guardrails
            </div>
            <p className="whitespace-pre-line text-[13px] text-amber-950">{version.guardrails}</p>
          </div>
        )}
        <SummaryRow
          label="Data access"
          value={
            version.dataIds
              .map(
                (id) =>
                  DATA_CATALOG.find((d) => d.id === id)?.label ??
                  ENTRATA_API_CATALOG.find((a) => a.id === id)?.label
              )
              .filter(Boolean)
              .join(", ") || "None"
          }
        />
        <SummaryRow
          label="Skills"
          value={
            version.skillIds
              .map(
                (id) =>
                  SKILL_CATALOG.find((s) => s.id === id)?.label ??
                  ENTRATA_API_CATALOG.find((a) => a.id === id)?.label
              )
              .filter(Boolean)
              .join(", ") || "None"
          }
        />
        <SummaryRow label="Properties" value={version.properties.join(", ") || "None"} />
        {version.successMetrics && version.successMetrics.length > 0 && (
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <Target className="h-3 w-3" />
              Success metrics
            </div>
            <ul className="space-y-1 text-[12px] text-foreground">
              {version.successMetrics.map((m) => (
                <li key={m.id} className="flex items-center gap-2">
                  {m.primary && <Star className="h-3 w-3 fill-indigo-500 text-indigo-500" />}
                  <span className="font-medium">{m.label}</span>
                  <span className="text-muted-foreground">
                    · {formatMetricValue(m.currentValue, m.unit)} / {m.windowDays}d · better {m.direction === "up" ? "higher" : "lower"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {version.audienceId && version.audienceName && (
          <SummaryRow
            label="Target Audience"
            value={version.audienceName}
          />
        )}
        {version.communication?.enabled && (
          <SummaryRow
            label="Conversational Abilities"
            value={`${
              version.communication.brandVoiceSource === "inherit"
                ? `Inheriting from ${BRAND_VOICE_INHERIT_OPTIONS.find((o) => o.id === version.communication.brandVoiceInheritFrom)?.label ?? "platform"} · `
                : ""
            }${version.communication.channels.join(", ").toUpperCase()}${
              version.communication.phoneNumber ? ` · ${version.communication.phoneNumber}` : ""
            }${version.communication.phoneBehavior ? ` (${version.communication.phoneBehavior})` : ""}`}
          />
        )}
        {version.memory?.enabled && (
          <SummaryRow
            label="Memory"
            value={`On · last ${version.memory.lastN} runs · ${version.memory.retentionDays} days`}
          />
        )}
        {cost && (
          <SummaryRow
            label="Cost"
            value={`${formatCurrency(cost.perRunCost)} per run · ~${formatCurrency(cost.monthlyCost)}/mo`}
          />
        )}
      </div>
    </section>
  );
}

function SummaryRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className={`grid gap-2 ${multiline ? "" : "grid-cols-[140px_1fr]"}`}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      {multiline ? (
        <p className="whitespace-pre-line rounded-md border border-border bg-muted/30 px-3 py-2 text-[13px] text-foreground">{value}</p>
      ) : (
        <p className="text-[13px] text-foreground">{value}</p>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// TEMPORARILY DISABLED COMPONENTS — preserved for future re-enablement.
// The "Success" and "Cost & Dry-run" wizard steps were removed from the
// visible flow per product request. Their components (SuccessStep,
// CostDryRunStep) remain defined above so we can bring them back simply by
// uncommenting their entries in the STEPS array and the corresponding
// renderers in the main render area. This reference keeps the components
// retained by the compiler without affecting runtime behavior.
/* ─────────── Voice runtime tuning (barge-in + voicemail) ─────────── */

/**
 * Compact panel inside the Voice block of CommunicationStep. These runtime
 * behaviors only matter for voice and were causing noise when they lived at
 * the top level of the comms config. Each control has a sensible default so
 * authors who never open this panel still ship with barge-in on and
 * voicemail detection on — which is what ElevenLabs/Twilio defaults do in
 * practice.
 */
function VoiceRuntimePanel({
  runtime,
  onChange,
}: {
  runtime: VoiceRuntimeCfg | undefined;
  onChange: (next: VoiceRuntimeCfg) => void;
}) {
  const current: Required<VoiceRuntimeCfg> = {
    bargeInEnabled: runtime?.bargeInEnabled ?? true,
    bargeInSensitivity: runtime?.bargeInSensitivity ?? "medium",
    detectVoicemail: runtime?.detectVoicemail ?? true,
    voicemailAction: runtime?.voicemailAction ?? "leave_message",
    voicemailScript: runtime?.voicemailScript ?? "",
  };

  const patch = (p: Partial<VoiceRuntimeCfg>) => onChange({ ...current, ...p });

  return (
    <div className="rounded-md border border-border bg-white p-3">
      <div className="flex items-center gap-2">
        <Sliders className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-[12px] font-semibold text-foreground">Voice runtime</p>
      </div>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        How the agent handles real-time calling behaviors. Defaults work well for most agents.
      </p>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 flex items-center gap-2 text-[11px] font-medium text-foreground">
            <input
              type="checkbox"
              checked={current.bargeInEnabled}
              onChange={(e) => patch({ bargeInEnabled: e.target.checked })}
              className="h-3.5 w-3.5 rounded border-border accent-indigo-600"
            />
            Let callers interrupt the agent
          </label>
          <p className="ml-5 text-[10px] leading-snug text-muted-foreground">
            Feels natural. Turn off only for scripted disclosures that must be read in full.
          </p>
          {current.bargeInEnabled && (
            <div className="ml-5 mt-1.5">
              <label className="mb-0.5 block text-[10px] text-muted-foreground">Interruption sensitivity</label>
              <select
                value={current.bargeInSensitivity}
                onChange={(e) =>
                  patch({
                    bargeInSensitivity: e.target.value as VoiceRuntimeCfg["bargeInSensitivity"],
                  })
                }
                className="w-full rounded-md border border-border bg-white px-2 py-1 text-[11px] text-foreground"
              >
                <option value="low">Low — wait for a full thought</option>
                <option value="medium">Medium — default</option>
                <option value="high">High — stop on any sound</option>
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 flex items-center gap-2 text-[11px] font-medium text-foreground">
            <input
              type="checkbox"
              checked={current.detectVoicemail}
              onChange={(e) => patch({ detectVoicemail: e.target.checked })}
              className="h-3.5 w-3.5 rounded border-border accent-indigo-600"
            />
            Detect voicemail greetings
          </label>
          <p className="ml-5 text-[10px] leading-snug text-muted-foreground">
            Skip the opening line when the agent reaches a voicemail and do the right thing.
          </p>
          {current.detectVoicemail && (
            <div className="ml-5 mt-1.5 space-y-2">
              <div>
                <label className="mb-0.5 block text-[10px] text-muted-foreground">When voicemail is detected</label>
                <select
                  value={current.voicemailAction}
                  onChange={(e) =>
                    patch({
                      voicemailAction: e.target.value as VoiceRuntimeCfg["voicemailAction"],
                    })
                  }
                  className="w-full rounded-md border border-border bg-white px-2 py-1 text-[11px] text-foreground"
                >
                  <option value="hang_up">Hang up silently</option>
                  <option value="leave_message">Leave a short message</option>
                </select>
              </div>
              {current.voicemailAction === "leave_message" && (
                <div>
                  <label className="mb-0.5 block text-[10px] text-muted-foreground">
                    Voicemail script
                  </label>
                  <textarea
                    value={current.voicemailScript}
                    onChange={(e) => patch({ voicemailScript: e.target.value })}
                    rows={2}
                    placeholder="Hi, this is {{agent.persona}} from {{property.name}}. I'll try you again later — thanks!"
                    className="w-full rounded-md border border-border bg-white px-2 py-1 text-[11px] text-foreground"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────── Step: Knowledge Base (L4 only) ─────────── */

/**
 * Simple knowledge-base editor. We intentionally shipped three source kinds
 * (file / URL / snippet) and nothing else so the UI stays uncluttered — the
 * 80% use case for a PMC is uploading their policy PDF and pasting in a few
 * one-liners ("pet policy is…"). Anything more advanced (crawl schedules,
 * embedding-model selection, chunk-size tuning) is intentionally hidden and
 * inherits sensible defaults on the backend.
 */
function KnowledgeStep({
  version,
  patch,
}: {
  version: AgentVersion;
  patch: (p: Partial<AgentVersion>) => void;
}) {
  const kb: KnowledgeBaseCfg =
    version.knowledgeBase ?? { enabled: false, sources: [] };

  const setKb = (p: Partial<KnowledgeBaseCfg>) =>
    patch({ knowledgeBase: { ...kb, ...p } });

  const addSource = (source: Omit<KnowledgeBaseSource, "id" | "addedAt" | "addedBy" | "status">) => {
    const next: KnowledgeBaseSource = {
      ...source,
      id: `kb_${Math.random().toString(36).slice(2, 10)}`,
      addedAt: new Date().toISOString(),
      addedBy: "Current user",
      status: "pending",
    };
    setKb({ enabled: true, sources: [next, ...kb.sources] });
    // Simulate indexer progress so authors get immediate feedback that the
    // source was picked up. In production the indexer emits real telemetry
    // which would replace this timer-based transition.
    setTimeout(() => {
      setKb({
        sources: (kb.sources ?? []).some((s) => s.id === next.id)
          ? kb.sources
          : [
              { ...next, status: "indexing" },
              ...kb.sources,
            ],
      });
    }, 400);
    setTimeout(() => {
      setKb({
        sources: [
          {
            ...next,
            status: "ready",
            chunkCount:
              source.kind === "snippet"
                ? Math.max(1, Math.ceil((source.content ?? "").length / 400))
                : source.kind === "url"
                ? 8
                : 24,
          },
          ...kb.sources,
        ],
      });
    }, 1600);
  };

  const removeSource = (id: string) => {
    setKb({ sources: kb.sources.filter((s) => s.id !== id) });
  };

  return (
    <section className="max-w-3xl">
      <h2 className="font-heading text-lg text-foreground">Knowledge base</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Give this agent its own reference library so it can answer questions from your exact wording — policies, floorplans, office hours, community FAQs. The agent quotes these sources before falling back to the general prompt.
      </p>

      <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
        <div className="flex items-center gap-3">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">Use the knowledge base</p>
            <p className="text-[11px] text-muted-foreground">
              When off, the agent ignores these sources even if they&apos;re populated.
            </p>
          </div>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={kb.enabled}
            onChange={(e) => setKb({ enabled: e.target.checked })}
            className="h-4 w-4 rounded border-border accent-indigo-600"
          />
          <span className="text-xs font-medium text-foreground">{kb.enabled ? "On" : "Off"}</span>
        </label>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Add a source
        </p>
        <KnowledgeAddRow onAdd={addSource} />
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Sources
          </p>
          <span className="text-[11px] text-muted-foreground">
            {kb.sources.length} source{kb.sources.length === 1 ? "" : "s"}
          </span>
        </div>
        {kb.sources.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No sources yet. Upload a document, link a webpage, or paste a snippet above.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {kb.sources.map((s) => (
              <KnowledgeSourceRow key={s.id} source={s} onRemove={() => removeSource(s.id)} />
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-border bg-white p-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          When the agent can&apos;t find a match
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          If none of your sources answer the caller&apos;s question, the agent:
        </p>
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
          {([
            {
              value: "say_not_sure",
              title: "Says it&apos;s not sure",
              body: "Admits it doesn&apos;t know and offers to take a message. Safest.",
            },
            {
              value: "escalate",
              title: "Escalates to a human",
              body: "Hands off per your escalation policy. Great for voice.",
            },
            {
              value: "answer_from_prompt",
              title: "Answers from the prompt",
              body: "Leans on the system prompt. Can hallucinate on property specifics.",
            },
          ] as const).map((opt) => {
            const selected = (kb.fallbackBehavior ?? "say_not_sure") === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setKb({ fallbackBehavior: opt.value })}
                className={`rounded-md border px-3 py-2 text-left text-xs ${
                  selected ? "border-indigo-300 bg-indigo-50" : "border-border bg-white hover:bg-muted"
                }`}
              >
                <p
                  className="font-medium text-foreground"
                  dangerouslySetInnerHTML={{ __html: opt.title }}
                />
                <p className="mt-0.5 text-[10px] text-muted-foreground">{opt.body}</p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/**
 * Single compact row with the three ways to add a KB source. We keep the
 * three kinds in tabs inside one row (rather than three sections) so the
 * list of existing sources stays the visual anchor of the page.
 */
function KnowledgeAddRow({
  onAdd,
}: {
  onAdd: (
    source: Omit<KnowledgeBaseSource, "id" | "addedAt" | "addedBy" | "status">
  ) => void;
}) {
  const [tab, setTab] = useState<KnowledgeBaseSourceKind>("document");
  const [label, setLabel] = useState<string>("");
  const [url, setUrl] = useState<string>("");
  const [snippet, setSnippet] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canSubmit =
    (tab === "url" && url.trim().length > 0) ||
    (tab === "snippet" && snippet.trim().length > 0) ||
    (tab === "document" && label.trim().length > 0);

  const reset = () => {
    setLabel("");
    setUrl("");
    setSnippet("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submit = () => {
    if (!canSubmit) return;
    if (tab === "document") {
      onAdd({ kind: "document", label: label.trim(), fileName: label.trim() });
    } else if (tab === "url") {
      const trimmed = url.trim();
      onAdd({
        kind: "url",
        label: label.trim() || trimmed,
        url: trimmed,
      });
    } else {
      onAdd({
        kind: "snippet",
        label: label.trim() || snippet.trim().slice(0, 60),
        content: snippet.trim(),
      });
    }
    reset();
  };

  return (
    <div className="rounded-lg border border-border bg-white p-3">
      <div className="mb-2 flex gap-1 border-b border-border">
        {(
          [
            { value: "document", label: "Document", icon: FileText },
            { value: "url", label: "URL", icon: LinkIcon },
            { value: "snippet", label: "Snippet", icon: Type },
          ] as const
        ).map((opt) => {
          const selected = tab === opt.value;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTab(opt.value)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium transition-colors ${
                selected ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3 w-3" />
              {opt.label}
              {selected && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-indigo-600" />}
            </button>
          );
        })}
      </div>

      {tab === "document" && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground hover:bg-muted">
            <Upload className="h-3.5 w-3.5" />
            <span>Choose a PDF, DOCX, or TXT file</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setLabel(file.name);
              }}
              className="sr-only"
            />
            {label && <span className="ml-auto font-mono text-[11px] text-foreground">{label}</span>}
          </label>
          <p className="text-[10px] text-muted-foreground">
            The file name becomes the source label. Bytes aren&apos;t uploaded in this preview — your IT team will wire the real uploader before launch.
          </p>
        </div>
      )}

      {tab === "url" && (
        <div className="space-y-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-property.example.com/faq"
            className="text-[12px]"
          />
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Optional display name"
            className="text-[12px]"
          />
        </div>
      )}

      {tab === "snippet" && (
        <div className="space-y-2">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Short label (e.g. 'Pet policy')"
            className="text-[12px]"
          />
          <textarea
            value={snippet}
            onChange={(e) => setSnippet(e.target.value)}
            rows={4}
            placeholder="Paste a policy, FAQ entry, or any plain-text knowledge the agent should quote…"
            className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs text-foreground"
          />
        </div>
      )}

      <div className="mt-2 flex items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={reset}
          disabled={!(label || url || snippet)}
        >
          Clear
        </Button>
        <Button type="button" size="sm" onClick={submit} disabled={!canSubmit}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add source
        </Button>
      </div>
    </div>
  );
}

function KnowledgeSourceRow({
  source,
  onRemove,
}: {
  source: KnowledgeBaseSource;
  onRemove: () => void;
}) {
  const Icon =
    source.kind === "document"
      ? FileText
      : source.kind === "url"
      ? LinkIcon
      : Type;
  const statusLabel: Record<NonNullable<KnowledgeBaseSource["status"]>, { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "bg-slate-100 text-slate-700" },
    indexing: { label: "Indexing…", cls: "bg-amber-100 text-amber-800" },
    ready: { label: "Ready", cls: "bg-emerald-100 text-emerald-700" },
    failed: { label: "Failed", cls: "bg-red-100 text-red-700" },
  };
  const status = statusLabel[source.status ?? "pending"];
  return (
    <li className="flex items-start gap-3 rounded-md border border-border bg-white px-3 py-2">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-[13px] font-medium text-foreground">{source.label}</p>
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${status.cls}`}>
            {status.label}
          </span>
          {source.chunkCount !== undefined && source.status === "ready" && (
            <span className="text-[10px] text-muted-foreground">{source.chunkCount} chunks</span>
          )}
        </div>
        {source.kind === "url" && source.url && (
          <p className="truncate text-[11px] text-muted-foreground">{source.url}</p>
        )}
        {source.kind === "snippet" && source.content && (
          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{source.content}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove source"
        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

/* ─────────── Step: Wrap-up / End-of-conversation extraction (L4 only) ─────────── */

/**
 * Single-screen editor for the end-of-conversation extraction schema plus
 * the downstream actions those extracted values feed. Deliberately visual —
 * one row per field, one row per action — because PMCs are not engineers
 * and JSON-Schema-style editors push them straight to Support.
 *
 * "Keep it simple" here means: no nested fields, no custom destinations, no
 * conditional logic builder. If the author can't fit it into one row, it
 * belongs in the prompt.
 */
const EXTRACTION_FIELD_TYPES: Array<{ value: ExtractionFieldType; label: string }> = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Yes / No" },
  { value: "choice", label: "Choice" },
  { value: "date", label: "Date" },
];

const EXTRACTION_ACTION_OPTIONS: Array<{
  value: ExtractionActionDestination;
  label: string;
  subtext: string;
}> = [
  {
    value: "create_work_order",
    label: "Create a maintenance work order",
    subtext: "Opens a new ticket with the extracted details.",
  },
  {
    value: "update_lead",
    label: "Update the lead record",
    subtext: "Saves extracted preferences and notes to the prospect.",
  },
  {
    value: "create_crm_task",
    label: "Create a CRM task",
    subtext: "Assigns follow-up to the right team member.",
  },
  {
    value: "send_summary_email",
    label: "Email a summary to the property",
    subtext: "Sends the on-site team a one-paragraph recap.",
  },
  {
    value: "post_note",
    label: "Post a note on the resident",
    subtext: "Drops a dated note on the resident&apos;s profile.",
  },
];

function ExtractionStep({
  version,
  patch,
}: {
  version: AgentVersion;
  patch: (p: Partial<AgentVersion>) => void;
}) {
  const cfg: ExtractionCfg =
    version.extraction ?? {
      enabled: false,
      fields: [],
      actions: [],
      summaryEnabled: true,
    };

  const setCfg = (p: Partial<ExtractionCfg>) =>
    patch({ extraction: { ...cfg, ...p } });

  const addField = () => {
    const id = `exf_${Math.random().toString(36).slice(2, 8)}`;
    setCfg({
      enabled: true,
      fields: [
        ...cfg.fields,
        {
          id,
          name: "",
          label: "",
          type: "text",
          description: "",
          required: false,
        },
      ],
    });
  };

  const updateField = (id: string, patchField: Partial<ExtractionField>) => {
    setCfg({
      fields: cfg.fields.map((f) =>
        f.id === id
          ? {
              ...f,
              ...patchField,
              // Keep `name` url-friendly so it's safe as a payload key.
              name:
                patchField.name !== undefined
                  ? patchField.name
                      .toLowerCase()
                      .replace(/[^a-z0-9_]+/g, "_")
                      .replace(/^_+|_+$/g, "")
                  : f.name,
            }
          : f
      ),
    });
  };

  const removeField = (id: string) =>
    setCfg({ fields: cfg.fields.filter((f) => f.id !== id) });

  const addAction = () => {
    const id = `exa_${Math.random().toString(36).slice(2, 8)}`;
    setCfg({
      enabled: true,
      actions: [
        ...cfg.actions,
        {
          id,
          destination: "send_summary_email",
          label: "Email a summary to the property",
        },
      ],
    });
  };

  const updateAction = (id: string, patchAction: Partial<ExtractionAction>) => {
    setCfg({
      actions: cfg.actions.map((a) => (a.id === id ? { ...a, ...patchAction } : a)),
    });
  };

  const removeAction = (id: string) =>
    setCfg({ actions: cfg.actions.filter((a) => a.id !== id) });

  return (
    <section className="max-w-3xl">
      <h2 className="font-heading text-lg text-foreground">Wrap-up</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        When a conversation ends, have the agent pull out the important details and send them somewhere useful — create a ticket, update a lead, email a summary. This is how voice calls turn into work orders and CRM entries automatically.
      </p>

      <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">Extract details at the end of each conversation</p>
            <p className="text-[11px] text-muted-foreground">
              When off, nothing runs after the conversation ends.
            </p>
          </div>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={cfg.enabled}
            onChange={(e) => setCfg({ enabled: e.target.checked })}
            className="h-4 w-4 rounded border-border accent-indigo-600"
          />
          <span className="text-xs font-medium text-foreground">{cfg.enabled ? "On" : "Off"}</span>
        </label>
      </div>

      <div className="mt-5 rounded-lg border border-border bg-white">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">What to pull out</p>
            <p className="text-[11px] text-muted-foreground">
              One row per piece of information you want the agent to capture.
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addField}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add field
          </Button>
        </div>
        {cfg.fields.length === 0 ? (
          <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">
            No fields yet. Click <span className="font-medium text-foreground">Add field</span> to start — most agents capture 2–5 fields.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {cfg.fields.map((f) => (
              <li key={f.id} className="p-3">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_140px_auto]">
                  <div className="space-y-1.5">
                    <Input
                      value={f.label}
                      onChange={(e) =>
                        updateField(f.id, {
                          label: e.target.value,
                          // Auto-derive `name` from the label on first type so
                          // authors get a usable payload key for free.
                          name: f.name || e.target.value,
                        })
                      }
                      placeholder="Field label (e.g. Reason for call)"
                      className="text-[13px] font-medium"
                    />
                    <Input
                      value={f.description}
                      onChange={(e) => updateField(f.id, { description: e.target.value })}
                      placeholder="Tell the agent what to extract (e.g. 'Why the resident is calling')"
                      className="text-[12px]"
                    />
                    {f.type === "choice" && (
                      <Input
                        value={(f.choices ?? []).join(", ")}
                        onChange={(e) =>
                          updateField(f.id, {
                            choices: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter((s) => s.length > 0),
                          })
                        }
                        placeholder="Choices, comma-separated (e.g. plumbing, electrical, appliance)"
                        className="text-[11px]"
                      />
                    )}
                    {f.name && (
                      <p className="text-[10px] text-muted-foreground">
                        Payload key:{" "}
                        <code className="rounded bg-muted px-1 font-mono text-[10px] text-foreground">
                          {f.name}
                        </code>
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <select
                      value={f.type}
                      onChange={(e) =>
                        updateField(f.id, { type: e.target.value as ExtractionFieldType })
                      }
                      className="w-full rounded-md border border-border bg-white px-2 py-1 text-[12px]"
                    >
                      {EXTRACTION_FIELD_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={f.required}
                        onChange={(e) => updateField(f.id, { required: e.target.checked })}
                        className="h-3.5 w-3.5 rounded border-border accent-indigo-600"
                      />
                      Required
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeField(f.id)}
                    aria-label="Remove field"
                    className="self-start rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-5 rounded-lg border border-border bg-white">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">What to do with it</p>
            <p className="text-[11px] text-muted-foreground">
              Actions that run after the conversation, using the captured fields.
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addAction}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add action
          </Button>
        </div>
        {cfg.actions.length === 0 ? (
          <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">
            No actions yet. Add one to have the agent do something with the extracted details — otherwise they&apos;ll just be logged on the conversation.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {cfg.actions.map((a) => (
              <li key={a.id} className="p-3">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
                  <div className="space-y-1.5">
                    <select
                      value={a.destination}
                      onChange={(e) => {
                        const value = e.target.value as ExtractionActionDestination;
                        const option = EXTRACTION_ACTION_OPTIONS.find((o) => o.value === value);
                        updateAction(a.id, {
                          destination: value,
                          label: option?.label ?? a.label,
                        });
                      }}
                      className="w-full rounded-md border border-border bg-white px-2 py-1 text-[13px]"
                    >
                      {EXTRACTION_ACTION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <Input
                      value={a.when ?? ""}
                      onChange={(e) => updateAction(a.id, { when: e.target.value })}
                      placeholder="Only run when… (optional, plain English — e.g. 'category is maintenance')"
                      className="text-[12px]"
                    />
                    {(() => {
                      const opt = EXTRACTION_ACTION_OPTIONS.find((o) => o.value === a.destination);
                      return opt ? (
                        <p
                          className="text-[10px] text-muted-foreground"
                          dangerouslySetInnerHTML={{ __html: opt.subtext }}
                        />
                      ) : null;
                    })()}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAction(a.id)}
                    aria-label="Remove action"
                    className="self-start rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className="mt-5 flex items-start gap-2 rounded-lg border border-border bg-muted/20 p-3 text-[12px] text-foreground">
        <input
          type="checkbox"
          checked={cfg.summaryEnabled}
          onChange={(e) => setCfg({ summaryEnabled: e.target.checked })}
          className="mt-0.5 h-4 w-4 rounded border-border accent-indigo-600"
        />
        <span>
          <span className="font-medium">Also generate a plain-English summary</span>
          <span className="block text-[11px] text-muted-foreground">
            A one-paragraph recap is saved with every conversation and included in the action payloads. Recommended.
          </span>
        </span>
      </label>
    </section>
  );
}

/* ─────────── Step: Escalation ───────────
 *
 * Design notes (keep these accurate — they drive the UX):
 *
 * 1. One step, not many. Earlier drafts tried to split triggers and
 *    per-channel actions into separate steps. That broke the mental model
 *    (authors couldn't see their triggers while editing the actions). We
 *    keep everything on one scroll surface with clear section headings.
 *
 * 2. Defaults-first. We seed every new agent with a reasonable policy
 *    (see `defaultEscalationPolicy`). The UI surfaces those defaults
 *    clearly — the most common edit is "leave it alone" and the second-
 *    most is "change the voice destination to a specific on-call number".
 *
 * 3. Destinations are resolved at runtime per property. The UI shows
 *    placeholders like "Property main line" (always resolves to the
 *    specific property's main line when the agent runs there). Explicit
 *    overrides (`specific_phone`, `specific_email`) are available but
 *    carry a subtext warning so authors understand they're bypassing the
 *    per-property resolution.
 *
 * 4. Per-channel sections render only when the channel is enabled on the
 *    Communication step. This is the classification-driven pattern used
 *    elsewhere — workflow (L3) agents see a "Catch-all handoff" block
 *    because they have no conversational channel.
 */

/** Catalog of voice actions for the dropdown, with subtext. */
const ESCALATION_VOICE_ACTIONS: Array<{
  value: EscalationVoiceAction;
  label: string;
  subtext: string;
}> = [
  {
    value: "warm_transfer",
    label: "Warm transfer (recommended)",
    subtext:
      "Give the team member a quick heads-up (who's calling, why), then bridge the call.",
  },
  {
    value: "cold_transfer",
    label: "Cold transfer",
    subtext: "Bridge the call immediately with no announcement.",
  },
  {
    value: "take_message",
    label: "Take a message",
    subtext:
      "Collect the caller's details, create a ticket, end the call. No transfer.",
  },
  {
    value: "schedule_callback",
    label: "Offer a callback",
    subtext:
      "Ask the caller for a good time, log it, end the call. The office follows up.",
  },
  {
    value: "end_politely",
    label: "End the call politely",
    subtext:
      "Acknowledge and hang up. Useful for after-hours when nobody can answer.",
  },
];

const ESCALATION_ASYNC_ACTIONS: Array<{
  value: EscalationAsyncAction;
  label: string;
  subtext: string;
}> = [
  {
    value: "reply_handoff",
    label: "Reply that a human will follow up (recommended)",
    subtext:
      "Send a short acknowledgment, stop the agent, hand the thread to a person.",
  },
  {
    value: "create_ticket",
    label: "Silent ticket (no reply)",
    subtext:
      "Don't message the resident back — just create a ticket for the team. Use sparingly.",
  },
  {
    value: "forward_to_team",
    label: "Forward to the property team",
    subtext:
      "Send the thread + summary to the destination below. Best for email.",
  },
  {
    value: "none",
    label: "Stop replying (no notification)",
    subtext:
      "The agent stops — no ticket, no email. Only use when you've wired something else downstream.",
  },
];

/** Every destination option, with which channel(s) it can be picked for. */
const ESCALATION_DESTINATIONS: Array<{
  kind: EscalationDestinationKind;
  label: string;
  subtext: string;
  channels: Array<"voice" | "sms" | "email">;
  needsValue: boolean;
  valueType?: "phone" | "email";
}> = [
  {
    kind: "property_main_line",
    label: "Property main line",
    subtext: "Resolves per property — each property uses its own main line.",
    channels: ["voice"],
    needsValue: false,
  },
  {
    kind: "property_manager",
    label: "Property manager",
    subtext: "Resolves per property — uses that property's primary manager contact.",
    channels: ["voice", "sms", "email"],
    needsValue: false,
  },
  {
    kind: "oncall_rotation",
    label: "On-call rotation",
    subtext: "Uses whoever the property has on rotation right now.",
    channels: ["voice", "sms", "email"],
    needsValue: false,
  },
  {
    kind: "portal_task",
    label: "Portal task (no notification)",
    subtext: "Creates a task in Entrata — team reviews on their own schedule.",
    channels: ["sms", "email"],
    needsValue: false,
  },
  {
    kind: "specific_phone",
    label: "Specific phone number…",
    subtext:
      "Overrides per-property resolution. Use only if this agent should always hand off to the same number regardless of property.",
    channels: ["voice"],
    needsValue: true,
    valueType: "phone",
  },
  {
    kind: "specific_email",
    label: "Specific email…",
    subtext:
      "Overrides per-property resolution. Use only if this agent should always hand off to the same mailbox.",
    channels: ["sms", "email"],
    needsValue: true,
    valueType: "email",
  },
];

function findDestinationMeta(kind: EscalationDestinationKind) {
  return ESCALATION_DESTINATIONS.find((d) => d.kind === kind);
}

function EscalationStep({
  version,
  patch,
}: {
  version: AgentVersion;
  patch: (p: Partial<AgentVersion>) => void;
}) {
  // Work off the version's policy or a defaulted one so the UI has
  // something to render even for legacy agents without any policy.
  const policy: EscalationPolicy =
    version.escalationPolicy ?? defaultEscalationPolicy();

  const setPolicy = (p: Partial<EscalationPolicy>) =>
    patch({ escalationPolicy: { ...policy, ...p } });

  const channelsEnabled = useMemo(
    () => new Set(version.communication?.channels ?? []),
    [version.communication?.channels]
  );
  const hasVoice = channelsEnabled.has("voice");
  const hasSms = channelsEnabled.has("sms");
  const hasEmail = channelsEnabled.has("email");
  const hasAnyChannel = hasVoice || hasSms || hasEmail;

  const triggers: EscalationTrigger[] = useMemo(() => {
    // Merge stored triggers with the catalog so a new trigger added to the
    // catalog shows up for existing agents with its default enabled state.
    const byId = new Map<EscalationTriggerId, EscalationTrigger>(
      (policy.triggers ?? []).map((t) => [t.id, t])
    );
    return ESCALATION_TRIGGER_CATALOG.map(
      (meta): EscalationTrigger =>
        byId.get(meta.id) ?? {
          id: meta.id,
          enabled: meta.defaultEnabled,
          threshold: meta.defaultThreshold,
        }
    );
  }, [policy.triggers]);

  const setTriggers = (next: EscalationTrigger[]) =>
    setPolicy({ triggers: next });

  const toggleTrigger = (id: EscalationTriggerId, enabled: boolean) =>
    setTriggers(triggers.map((t) => (t.id === id ? { ...t, enabled } : t)));

  const setTriggerThreshold = (id: EscalationTriggerId, threshold: number) =>
    setTriggers(triggers.map((t) => (t.id === id ? { ...t, threshold } : t)));

  return (
    <section className="max-w-3xl">
      <h2 className="font-heading text-lg text-foreground">Escalation</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        What the agent does when it can&apos;t — or shouldn&apos;t — handle something on its own. Defaults are safe for resident-facing agents; tune per channel if you need to.
      </p>

      <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
        <div className="flex items-center gap-3">
          <LifeBuoy className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">Let the agent escalate</p>
            <p className="text-[11px] text-muted-foreground">
              When off, the agent never hands off — it will try to answer no matter what. Not recommended for resident-facing agents.
            </p>
          </div>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={policy.enabled}
            onChange={(e) => setPolicy({ enabled: e.target.checked })}
            className="h-4 w-4 rounded border-border accent-indigo-600"
          />
          <span className="text-xs font-medium text-foreground">
            {policy.enabled ? "On" : "Off"}
          </span>
        </label>
      </div>

      {policy.enabled && (
        <>
          {/* Triggers */}
          <div className="mt-5 rounded-lg border border-border bg-white">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">When to escalate</p>
              <p className="text-[11px] text-muted-foreground">
                The agent hands off as soon as any of the checked scenarios happen.
              </p>
            </div>
            <ul className="divide-y divide-border">
              {ESCALATION_TRIGGER_CATALOG.map((meta) => {
                const t = triggers.find((x) => x.id === meta.id)!;
                return (
                  <li key={meta.id} className="p-3">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={t.enabled}
                        onChange={(e) => toggleTrigger(meta.id, e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-border accent-indigo-600"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-foreground">{meta.label}</p>
                        <p className="text-[11px] leading-snug text-muted-foreground">{meta.subtext}</p>
                        {t.enabled && meta.thresholdUnit && (
                          <div className="mt-2 flex items-center gap-2">
                            <label className="text-[11px] text-muted-foreground">
                              {meta.thresholdUnit === "percent"
                                ? "Escalate below"
                                : "After"}
                            </label>
                            <Input
                              type="number"
                              min={meta.thresholdUnit === "percent" ? 10 : 2}
                              max={meta.thresholdUnit === "percent" ? 95 : 10}
                              value={t.threshold ?? meta.defaultThreshold ?? 0}
                              onChange={(e) =>
                                setTriggerThreshold(meta.id, Number(e.target.value) || 0)
                              }
                              className="h-7 w-16 text-[12px]"
                            />
                            <span className="text-[11px] text-muted-foreground">
                              {meta.thresholdUnit === "percent" ? "%" : "back-and-forths"}
                            </span>
                          </div>
                        )}
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Per-channel handoff */}
          <div className="mt-5">
            <div className="mb-2">
              <p className="text-sm font-semibold text-foreground">What happens when it escalates</p>
              <p className="text-[11px] text-muted-foreground">
                The action depends on how the resident reached the agent. Showing only the channels enabled in Conversational Abilities.
              </p>
            </div>

            {!hasAnyChannel && (
              <CatchAllHandoffPanel policy={policy} setPolicy={setPolicy} />
            )}

            {hasVoice && (
              <VoiceHandoffPanel
                handoff={
                  policy.voice ?? defaultEscalationPolicy().voice!
                }
                onChange={(h) => setPolicy({ voice: h })}
              />
            )}

            {hasSms && (
              <AsyncHandoffPanel
                channel="sms"
                handoff={
                  policy.sms ?? defaultEscalationPolicy().sms!
                }
                onChange={(h) => setPolicy({ sms: h })}
              />
            )}

            {hasEmail && (
              <AsyncHandoffPanel
                channel="email"
                handoff={
                  policy.email ?? defaultEscalationPolicy().email!
                }
                onChange={(h) => setPolicy({ email: h })}
              />
            )}
          </div>

          {/* SLA + Note */}
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-white p-4">
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Response time target
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={1440}
                  value={policy.slaMinutes ?? 30}
                  onChange={(e) =>
                    setPolicy({ slaMinutes: Number(e.target.value) || 30 })
                  }
                  className="h-8 w-24 text-[13px]"
                />
                <span className="text-[12px] text-muted-foreground">minutes</span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                How fast the team should respond after a handoff. Used for on-call routing and SLA reporting.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-white p-4">
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Note to include
              </label>
              <Input
                value={policy.note ?? ""}
                onChange={(e) => setPolicy({ note: e.target.value })}
                placeholder="Optional — e.g. 'Include invoice number and resident's claim.'"
                className="h-8 text-[12px]"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Appended to every escalation ticket / email. Leave blank if you don&apos;t need one.
              </p>
            </div>
          </div>

          {/* After-hours override */}
          <AfterHoursPanel policy={policy} setPolicy={setPolicy} hasVoice={hasVoice} />
        </>
      )}
    </section>
  );
}

/**
 * Shown for L3 / workflow agents with no conversational channel. It
 * captures the single question "when you can't do the thing, who
 * should we bother?" without forcing the author through the per-channel
 * UI that doesn't apply to them.
 */
function CatchAllHandoffPanel({
  policy,
  setPolicy,
}: {
  policy: EscalationPolicy;
  setPolicy: (p: Partial<EscalationPolicy>) => void;
}) {
  // Use the SMS handoff slot for catch-all storage — async action + portal
  // task destination is the right shape, and reusing the slot keeps the
  // schema from sprouting a sixth variant.
  const handoff: EscalationAsyncHandoff =
    policy.sms ?? {
      action: "forward_to_team",
      destination: { kind: "property_manager", label: "Property manager" },
    };
  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <UserRound className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-semibold text-foreground">Catch-all handoff</p>
          <p className="text-[11px] text-muted-foreground">
            This agent doesn&apos;t talk to residents directly, so there&apos;s just one handoff: who should pick it up.
          </p>
        </div>
      </div>
      <AsyncHandoffControls
        handoff={handoff}
        onChange={(h) => setPolicy({ sms: h })}
      />
    </div>
  );
}

function VoiceHandoffPanel({
  handoff,
  onChange,
}: {
  handoff: EscalationVoiceHandoff;
  onChange: (next: EscalationVoiceHandoff) => void;
}) {
  const actionMeta = ESCALATION_VOICE_ACTIONS.find((a) => a.value === handoff.action);
  const needsDestination =
    handoff.action === "warm_transfer" || handoff.action === "cold_transfer";
  const destMeta = findDestinationMeta(handoff.destination.kind);
  const voiceDestinations = ESCALATION_DESTINATIONS.filter((d) =>
    d.channels.includes("voice")
  );

  const setAction = (action: EscalationVoiceAction) => onChange({ ...handoff, action });
  const setDestination = (kind: EscalationDestinationKind) => {
    const meta = findDestinationMeta(kind);
    onChange({
      ...handoff,
      destination: {
        kind,
        label: meta?.label,
        value: meta?.needsValue ? handoff.destination.value ?? "" : undefined,
      },
    });
  };

  return (
    <div className="mt-3 rounded-lg border border-border bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <PhoneForwarded className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">Voice</p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
            When it escalates on a call, do this
          </label>
          <select
            value={handoff.action}
            onChange={(e) => setAction(e.target.value as EscalationVoiceAction)}
            className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-[13px]"
          >
            {ESCALATION_VOICE_ACTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {actionMeta && (
            <p className="mt-1 text-[10px] text-muted-foreground">{actionMeta.subtext}</p>
          )}
        </div>
        {needsDestination && (
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
              Transfer to
            </label>
            <select
              value={handoff.destination.kind}
              onChange={(e) => setDestination(e.target.value as EscalationDestinationKind)}
              className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-[13px]"
            >
              {voiceDestinations.map((d) => (
                <option key={d.kind} value={d.kind}>
                  {d.label}
                </option>
              ))}
            </select>
            {destMeta && (
              <p className="mt-1 text-[10px] text-muted-foreground">{destMeta.subtext}</p>
            )}
            {destMeta?.needsValue && (
              <Input
                type={destMeta.valueType === "phone" ? "tel" : "text"}
                value={handoff.destination.value ?? ""}
                onChange={(e) =>
                  onChange({
                    ...handoff,
                    destination: { ...handoff.destination, value: e.target.value },
                  })
                }
                placeholder={
                  destMeta.valueType === "phone" ? "+1 (555) 555-1234" : ""
                }
                className="mt-1 h-7 text-[12px]"
              />
            )}
          </div>
        )}
      </div>
      <div className="mt-3">
        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
          {handoff.action === "warm_transfer" || handoff.action === "cold_transfer"
            ? "Line the agent says before transferring"
            : "Closing line"}
        </label>
        <textarea
          value={handoff.handoffScript ?? ""}
          onChange={(e) => onChange({ ...handoff, handoffScript: e.target.value })}
          rows={2}
          placeholder="Hang on just a moment while I get someone from the office on the line."
          className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs text-foreground"
        />
      </div>
    </div>
  );
}

function AsyncHandoffPanel({
  channel,
  handoff,
  onChange,
}: {
  channel: "sms" | "email";
  handoff: EscalationAsyncHandoff;
  onChange: (next: EscalationAsyncHandoff) => void;
}) {
  const title = channel === "sms" ? "SMS" : "Email";
  const Icon = channel === "sms" ? MessageSquare : Radio;
  return (
    <div className="mt-3 rounded-lg border border-border bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <AsyncHandoffControls
        handoff={handoff}
        onChange={onChange}
        channel={channel}
      />
    </div>
  );
}

/**
 * Shared form controls for any async handoff (SMS, email, or the
 * catch-all workflow-agent slot). Broken out so the field ordering stays
 * identical everywhere — authors shouldn't have to re-learn the layout
 * when switching between channels.
 */
function AsyncHandoffControls({
  handoff,
  onChange,
  channel,
}: {
  handoff: EscalationAsyncHandoff;
  onChange: (next: EscalationAsyncHandoff) => void;
  channel?: "sms" | "email";
}) {
  const actionMeta = ESCALATION_ASYNC_ACTIONS.find((a) => a.value === handoff.action);
  const needsDestination =
    handoff.action === "reply_handoff" ||
    handoff.action === "create_ticket" ||
    handoff.action === "forward_to_team";
  const showAcknowledgment =
    handoff.action === "reply_handoff" || handoff.action === "forward_to_team";

  const destinationOptions = ESCALATION_DESTINATIONS.filter((d) =>
    channel ? d.channels.includes(channel) : d.channels.length > 1
  );
  const destMeta = findDestinationMeta(handoff.destination.kind);

  const setDestination = (kind: EscalationDestinationKind) => {
    const meta = findDestinationMeta(kind);
    onChange({
      ...handoff,
      destination: {
        kind,
        label: meta?.label,
        value: meta?.needsValue ? handoff.destination.value ?? "" : undefined,
      },
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
            When it escalates, do this
          </label>
          <select
            value={handoff.action}
            onChange={(e) =>
              onChange({ ...handoff, action: e.target.value as EscalationAsyncAction })
            }
            className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-[13px]"
          >
            {ESCALATION_ASYNC_ACTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {actionMeta && (
            <p className="mt-1 text-[10px] text-muted-foreground">{actionMeta.subtext}</p>
          )}
        </div>
        {needsDestination && (
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
              Send to
            </label>
            <select
              value={handoff.destination.kind}
              onChange={(e) => setDestination(e.target.value as EscalationDestinationKind)}
              className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-[13px]"
            >
              {destinationOptions.map((d) => (
                <option key={d.kind} value={d.kind}>
                  {d.label}
                </option>
              ))}
            </select>
            {destMeta && (
              <p className="mt-1 text-[10px] text-muted-foreground">{destMeta.subtext}</p>
            )}
            {destMeta?.needsValue && (
              <Input
                type={destMeta.valueType === "phone" ? "tel" : "email"}
                value={handoff.destination.value ?? ""}
                onChange={(e) =>
                  onChange({
                    ...handoff,
                    destination: { ...handoff.destination, value: e.target.value },
                  })
                }
                placeholder={
                  destMeta.valueType === "phone"
                    ? "+1 (555) 555-1234"
                    : "team@example.com"
                }
                className="mt-1 h-7 text-[12px]"
              />
            )}
          </div>
        )}
      </div>
      {showAcknowledgment && (
        <div className="mt-3">
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
            What the agent replies before handing off
          </label>
          <textarea
            value={handoff.acknowledgment ?? ""}
            onChange={(e) => onChange({ ...handoff, acknowledgment: e.target.value })}
            rows={2}
            placeholder="I'm going to have someone from the office follow up with you shortly."
            className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs text-foreground"
          />
        </div>
      )}
    </>
  );
}

function AfterHoursPanel({
  policy,
  setPolicy,
  hasVoice,
}: {
  policy: EscalationPolicy;
  setPolicy: (p: Partial<EscalationPolicy>) => void;
  hasVoice: boolean;
}) {
  const ah = policy.afterHours ?? {
    overrideEnabled: false,
    voiceAction: "take_message" as EscalationVoiceAction,
    asyncAction: "reply_handoff" as EscalationAsyncAction,
    message: "",
  };
  const setAh = (p: Partial<typeof ah>) =>
    setPolicy({ afterHours: { ...ah, ...p } });

  return (
    <div className="mt-5 rounded-lg border border-border bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <Moon className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold text-foreground">After hours</p>
            <p className="text-[11px] text-muted-foreground">
              Swap the escalation actions when the property is closed. Uses the property&apos;s configured hours.
            </p>
          </div>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={ah.overrideEnabled}
            onChange={(e) => setAh({ overrideEnabled: e.target.checked })}
            className="h-4 w-4 rounded border-border accent-indigo-600"
          />
          <span className="text-xs font-medium text-foreground">
            {ah.overrideEnabled ? "On" : "Off"}
          </span>
        </label>
      </div>
      {ah.overrideEnabled && (
        <div className="mt-3 grid grid-cols-1 gap-3 border-t border-border pt-3 md:grid-cols-2">
          {hasVoice && (
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                Voice
              </label>
              <select
                value={ah.voiceAction ?? "take_message"}
                onChange={(e) =>
                  setAh({ voiceAction: e.target.value as EscalationVoiceAction })
                }
                className="w-full rounded-md border border-border bg-white px-2 py-1 text-[12px]"
              >
                {ESCALATION_VOICE_ACTIONS.filter(
                  (a) => a.value !== "warm_transfer" && a.value !== "cold_transfer"
                ).map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
              SMS / Email
            </label>
            <select
              value={ah.asyncAction ?? "reply_handoff"}
              onChange={(e) =>
                setAh({ asyncAction: e.target.value as EscalationAsyncAction })
              }
              className="w-full rounded-md border border-border bg-white px-2 py-1 text-[12px]"
            >
              {ESCALATION_ASYNC_ACTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
              After-hours message
            </label>
            <textarea
              value={ah.message ?? ""}
              onChange={(e) => setAh({ message: e.target.value })}
              rows={2}
              placeholder="The office is closed right now, but I can take a message and someone will get back to you first thing."
              className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs text-foreground"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── Step: Entry Points ─────────── */

function EntryPointsStep({ agentId }: { agentId: string }) {
  const { getAgent, updateEntryPoints } = useCustomAgents();
  const agent = getAgent(agentId);
  const entryPoints = agent?.entryPoints ?? [];
  const [query, setQuery] = useState("");

  const enabledKeys = new Set(entryPoints.filter((ep) => ep.enabled).map((ep) => ep.moduleKey));

  const categories = useMemo(() => {
    const grouped = new Map<string, typeof ENTRY_POINT_MODULES[number][]>();
    for (const mod of ENTRY_POINT_MODULES) {
      const list = grouped.get(mod.category) ?? [];
      list.push(mod);
      grouped.set(mod.category, list);
    }
    return Array.from(grouped.entries());
  }, []);

  const toggle = (moduleKey: string, label: string) => {
    const existing = entryPoints.find((ep) => ep.moduleKey === moduleKey);
    let next: AgentEntryPoint[];
    if (existing) {
      next = entryPoints.map((ep) =>
        ep.moduleKey === moduleKey ? { ...ep, enabled: !ep.enabled } : ep
      );
    } else {
      next = [
        ...entryPoints,
        {
          id: `ep-${moduleKey}`,
          moduleKey,
          label: `Run ${agent?.name ?? "Agent"}`,
          enabled: true,
        },
      ];
    }
    updateEntryPoints(agentId, next);
  };

  const updateLabel = (moduleKey: string, label: string) => {
    updateEntryPoints(
      agentId,
      entryPoints.map((ep) => (ep.moduleKey === moduleKey ? { ...ep, label } : ep))
    );
  };

  const filtered = query.trim()
    ? ENTRY_POINT_MODULES.filter(
        (m) =>
          m.label.toLowerCase().includes(query.toLowerCase()) ||
          m.moduleKey.toLowerCase().includes(query.toLowerCase())
      )
    : null;

  return (
    <section className="max-w-3xl">
      <h2 className="font-heading text-lg text-foreground">Entry Points</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Surface this agent on other pages in the platform. Users with the <code className="rounded bg-muted px-1 py-0.5 text-[11px]">agent:execute</code> permission
        will see a &ldquo;Run Agent&rdquo; button on each enabled page.
      </p>

      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/60 p-3">
        <div className="flex items-start gap-2">
          <Shield className="mt-0.5 h-4 w-4 text-blue-700" />
          <div className="text-[11px] text-blue-800">
            <p className="font-semibold">Security model</p>
            <ul className="mt-1 space-y-0.5 list-disc pl-4">
              <li>The widget validates the user&apos;s JWT and checks <code className="rounded bg-blue-100 px-0.5">agent:execute</code> RBAC permission</li>
              <li>The agent only runs on properties it&apos;s provisioned for (see Properties tab)</li>
              <li>Every widget-initiated run is audit-logged with module, user, and property</li>
              <li>The widget is served from the platform CDN — no third-party scripts</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search modules..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
      </div>

      {enabledKeys.size > 0 && (
        <div className="mt-4 rounded-lg border border-border bg-white p-4">
          <h3 className="text-[12px] font-semibold text-foreground mb-2">
            Enabled entry points ({enabledKeys.size})
          </h3>
          <div className="space-y-2">
            {entryPoints.filter((ep) => ep.enabled).map((ep) => {
              const mod = ENTRY_POINT_MODULES.find((m) => m.moduleKey === ep.moduleKey);
              return (
                <div key={ep.moduleKey} className="flex items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50/40 px-3 py-2">
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-foreground">{mod?.label ?? ep.moduleKey}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <label className="text-[10px] text-muted-foreground shrink-0">Button label:</label>
                      <Input
                        value={ep.label}
                        onChange={(e) => updateLabel(ep.moduleKey, e.target.value)}
                        className="h-6 text-[11px] px-2 max-w-[200px]"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(ep.moduleKey, mod?.label ?? ep.moduleKey)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-4">
        {(filtered ? [["Search results", filtered] as const] : categories).map(([cat, modules]) => (
          <div key={cat}>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{cat}</h3>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {(modules as typeof ENTRY_POINT_MODULES[number][]).map((mod) => {
                const on = enabledKeys.has(mod.moduleKey);
                return (
                  <button
                    key={mod.moduleKey}
                    type="button"
                    onClick={() => toggle(mod.moduleKey, mod.label)}
                    className={`flex items-center gap-2.5 rounded-md border px-3 py-2 text-left text-[12px] transition-colors ${
                      on
                        ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                        : "border-border bg-white text-foreground hover:bg-muted"
                    }`}
                  >
                    <div className={`flex h-4 w-4 items-center justify-center rounded-full ${on ? "bg-emerald-600 text-white" : "bg-muted"}`}>
                      {on && <Check className="h-2.5 w-2.5" />}
                    </div>
                    <span className="font-medium">{mod.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-border bg-slate-50 p-4">
        <h3 className="flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
          <Info className="h-3.5 w-3.5" /> Integration snippet
        </h3>
        <p className="mt-1 text-[11px] text-muted-foreground">
          To add this agent to a Smarty template, include the following:
        </p>
        <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-[10px] text-emerald-300 leading-relaxed">
{`<div data-oxp-agent
     data-agent-id="${agent?.id ?? "{$agent_id}"}"
     data-action="run">
</div>
<script src="{\\$mfe_base_url}/oxp-agent-widget.js" defer></script>`}
        </pre>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Preserved-but-unreferenced components. Several wizard steps are hidden
// from the active flow (see STEPS array at the top of the file) but we keep
// their implementations intact so product can toggle them back on without a
// re-implementation. TypeScript would otherwise flag them as unused.
const __AGENT_BUILDER_PRESERVED_STEPS__ = [
  SuccessStep,
  CostDryRunStep,
  DollarSign,
  PromptStep,
  PropertiesStep,
  ReviewStep,
  Building2,
  ClipboardCheck,
  MessageSquare,
];
void __AGENT_BUILDER_PRESERVED_STEPS__;
