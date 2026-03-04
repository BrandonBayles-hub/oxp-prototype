"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { useSetup } from "@/lib/setup-context";
import { useVault } from "@/lib/vault-context";
import { useAgents } from "@/lib/agents-context";
import { useWorkflows } from "@/lib/workflows-context";
import { useVoice } from "@/lib/voice-context";
import { useWorkforce, getAvailability } from "@/lib/workforce-context";
import {
  useGovernance,
  HIGH_REGULATION_ACTIVITIES,
  RISK_COLORS,
  type RiskLevel,
} from "@/lib/governance-context";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Bot,
  GitBranch,
  Mic,
  Shield,
  Rocket,
  Zap,
  MessageSquare,
  Phone,
  Smartphone,
  Globe,
  Cpu,
  Users,
  Megaphone,
  Settings,
  Radio,
  Download,
  Mail,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════
   Steps definition
   ═══════════════════════════════════════════════════════════════════════ */

const STEPS = [
  { id: "train-workforce",     title: "Train Your Workforce — Upload Documents & SOPs", href: "/trainings-sop" },
  { id: "eli-plus",            title: "Activate ELI Plus Agents",                        href: "/agent-roster" },
  { id: "ops-efficiency",      title: "Activate Operational & Efficiency Agents",         href: "/agent-roster" },
  { id: "eli-essentials",      title: "Activate ELI Essentials",                          href: "/agent-roster" },
  { id: "live-conversations",  title: "Activate Live Conversations & Centralized Communications", href: "/command-center" },
  { id: "voice-brand",         title: "Configure Voice & Brand",                          href: "/voice" },
  { id: "workflows",           title: "Set up Workflows",                                 href: "/workflows" },
  { id: "workforce",           title: "Configure Your Workforce",                         href: "/workforce" },
  { id: "governance",          title: "Set up Governance",                                 href: "/governance" },
  { id: "brief-team",          title: "Brief Your Team",                                   href: null },
  { id: "review-golive",       title: "Review & Go Live",                                  href: null },
] as const;

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "train-workforce":    FileText,
  "eli-plus":           Bot,
  "ops-efficiency":     Cpu,
  "eli-essentials":     Zap,
  "live-conversations": Radio,
  "voice-brand":        Mic,
  workflows:            GitBranch,
  workforce:            Users,
  governance:           Shield,
  "brief-team":         Megaphone,
  "review-golive":      Rocket,
};

/* ═══════════════════════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════════════════════ */

export default function GettingStartedPage() {
  const router = useRouter();
  const {
    goLiveComplete,
    completedSteps,
    setStepComplete,
    setGoLiveComplete,
    testRunDone,
    setTestRunDone,
  } = useSetup();
  const { docCount } = useVault();
  const { agents, agentsEnabledCount, updateAgent } = useAgents();
  const { recipes, atLeastOneEnabled, toggleRecipe, addRecipe } = useWorkflows();
  const { configured: voiceConfigured, channels, persona, update: updateVoice } = useVoice();
  const { humanMembers } = useWorkforce();
  const { state: govState, updateActivity: updateGovActivity, enabledGuardrailCount } = useGovernance();

  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const l4Agents = useMemo(() => agents.filter((a) => a.type === "autonomous"), [agents]);
  const l2l3Agents = useMemo(() => agents.filter((a) => a.type === "intelligence" || a.type === "efficiency"), [agents]);
  const l1Agents = useMemo(() => agents.filter((a) => a.type === "operations"), [agents]);

  const autoDetected: Record<string, boolean> = useMemo(() => ({
    "train-workforce":   docCount > 0,
    "eli-plus":          l4Agents.some((a) => a.status === "Active"),
    "ops-efficiency":    l2l3Agents.some((a) => a.status === "Active"),
    "eli-essentials":    l1Agents.some((a) => a.status === "Active"),
    "live-conversations": false,
    "voice-brand":       voiceConfigured,
    workflows:           atLeastOneEnabled,
    workforce:           humanMembers.length > 0,
    governance:          enabledGuardrailCount > 0,
    "brief-team":        false,
    "review-golive":     false,
  }), [docCount, l4Agents, l2l3Agents, l1Agents, voiceConfigured, atLeastOneEnabled, humanMembers, enabledGuardrailCount]);

  const isStepDone = (id: string, i: number) => completedSteps.includes(i) || autoDetected[id];

  const doneCount = STEPS.reduce((n, step, i) => n + (isStepDone(step.id, i) ? 1 : 0), 0);

  const goLiveChecklist = {
    docs: docCount > 0,
    eliPlus: l4Agents.some((a) => a.status === "Active"),
    opsAgents: l2l3Agents.some((a) => a.status === "Active"),
    essentials: l1Agents.some((a) => a.status === "Active"),
    voiceOrChannel: voiceConfigured,
    governance: enabledGuardrailCount > 0 || completedSteps.includes(8),
    testRun: testRunDone,
  };
  const goLiveSatisfied = Object.values(goLiveChecklist).every(Boolean);

  const handleGoLive = () => {
    setGoLiveComplete(true);
    router.push("/command-center");
  };

  return (
    <>
      <PageHeader
        title="AI & Agent Activation"
        description="Complete each step to fully activate OXP Studio. Progress updates automatically as you configure the platform."
      />

      {/* Progress bar */}
      <div className="mb-8 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
          <div
            className="h-full rounded-full bg-emerald-600 transition-all duration-500"
            style={{ width: `${(doneCount / STEPS.length) * 100}%` }}
          />
        </div>
        <span className="text-sm font-medium tabular-nums text-[hsl(var(--muted-foreground))]">
          {doneCount}/{STEPS.length}
        </span>
      </div>

      {/* Steps accordion */}
      <div className="space-y-0 rounded-lg border border-[hsl(var(--border))] bg-white">
        {STEPS.map((step, idx) => {
          const done = isStepDone(step.id, idx);
          const isExpanded = expandedStep === idx;
          const Icon = STEP_ICONS[step.id];
          return (
            <div key={step.id} className="border-b border-[hsl(var(--border))]/40 last:border-0">
              <button
                type="button"
                onClick={() => setExpandedStep(isExpanded ? null : idx)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[hsl(var(--muted))]/30"
              >
                <span
                  role="checkbox"
                  aria-checked={done}
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); setStepComplete(idx, !completedSteps.includes(idx)); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setStepComplete(idx, !completedSteps.includes(idx)); }
                  }}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors cursor-pointer ${
                    done ? "border-emerald-600 bg-emerald-600 text-white" : "border-[hsl(var(--border))] bg-white hover:border-[hsl(var(--muted-foreground))]"
                  }`}
                  aria-label={done ? "Mark incomplete" : "Mark complete"}
                >
                  {done ? (
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))]">{idx + 1}</span>
                  )}
                </span>
                {Icon && <Icon className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />}
                <span className={`flex-1 text-sm ${done ? "text-[hsl(var(--muted-foreground))]" : "font-medium text-[hsl(var(--foreground))]"}`}>
                  {step.title}
                </span>
                {done && !isExpanded && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Complete</span>
                )}
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-[hsl(var(--border))]/30 bg-[hsl(var(--muted))]/20 px-4 pb-6 pl-[3.25rem] pr-6 pt-4">
                  {step.id === "train-workforce" && <StepTrainWorkforce />}
                  {step.id === "eli-plus" && <StepEliPlus />}
                  {step.id === "ops-efficiency" && <StepOpsEfficiency />}
                  {step.id === "eli-essentials" && <StepEliEssentials />}
                  {step.id === "live-conversations" && <StepLiveConversations />}
                  {step.id === "voice-brand" && <StepVoiceBrand />}
                  {step.id === "workflows" && <StepWorkflows />}
                  {step.id === "workforce" && <StepWorkforce />}
                  {step.id === "governance" && <StepGovernance />}
                  {step.id === "brief-team" && <StepBriefTeam />}
                  {step.id === "review-golive" && (
                    <StepGoLive
                      checklist={goLiveChecklist}
                      onGoLive={handleGoLive}
                      canGoLive={goLiveSatisfied}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom go-live CTA */}
      <div className="mt-8 flex items-center gap-4">
        <button type="button" onClick={handleGoLive} disabled={!goLiveSatisfied} className="btn-primary disabled:pointer-events-none disabled:opacity-50">
          Go live
        </button>
        {!goLiveSatisfied && (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Complete the go-live checklist in step {STEPS.length} to enable this button.
          </p>
        )}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Shared helpers
   ═══════════════════════════════════════════════════════════════════════ */

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${ok ? "bg-[#B3FFCC] text-black" : "bg-amber-400 text-amber-950"}`}>
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
      {label}
    </span>
  );
}

function StepLink({ href, label }: { href: string; label: string }) {
  return (
    <div className="pt-1">
      <Link
        href={href}
        className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--foreground))] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[hsl(var(--foreground))]/90"
      >
        {label}
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{children}</p>;
}

function InlineToggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-[hsl(var(--border))]/50 bg-white px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[hsl(var(--foreground))]">{label}</p>
        {description && <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${checked ? "bg-emerald-600" : "bg-[hsl(var(--border))]"}`}
      >
        <span className={`pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 1: Train Your Workforce — Upload Documents & SOPs
   ═══════════════════════════════════════════════════════════════════════ */

function StepTrainWorkforce() {
  const { docCount } = useVault();

  return (
    <div className="space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Your AI agents are only as good as the knowledge they&apos;re trained on. Upload your SOPs, policies, lease templates, and property guides so agents can answer questions accurately, stay compliant, and follow your organization&apos;s exact procedures.
      </p>

      <div className="rounded-lg border border-[hsl(var(--border))]/50 bg-white p-4">
        <SectionLabel>Why this matters</SectionLabel>
        <ul className="mt-2 space-y-2">
          {[
            "Agents reference your documents in real time to give accurate, policy-aligned answers to residents and prospects.",
            "Uploaded SOPs serve as the compliance backbone — every AI action is traceable back to your approved procedures.",
            "Documents power governance and audit trails, so your team always knows what the AI said and why.",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span className="text-[13px] text-[hsl(var(--foreground))]">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <StatusPill ok={docCount > 0} label={docCount > 0 ? `${docCount} document(s) uploaded` : "No documents uploaded yet"} />

      <Link
        href="/trainings-sop"
        className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--foreground))] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[hsl(var(--foreground))]/90"
      >
        <FileText className="h-4 w-4" />
        Go to Trainings &amp; SOPs
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 2: Activate ELI Plus Agents (L4)
   ═══════════════════════════════════════════════════════════════════════ */

function StepEliPlus() {
  const { agents } = useAgents();
  const l4Agents = useMemo(() => agents.filter((a) => a.type === "autonomous"), [agents]);
  const activeCount = l4Agents.filter((a) => a.status === "Active").length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        ELI Plus agents are your highest-tier conversational AI agents. They handle end-to-end resident interactions for leasing, renewals, maintenance, and payments autonomously. Activate the agents your organization is contracted for.
      </p>

      <div className="flex flex-wrap gap-2">
        <StatusPill ok={activeCount > 0} label={`${activeCount} of ${l4Agents.length} ELI Plus agent(s) active`} />
      </div>

      {l4Agents.length > 0 ? (
        <>
          <SectionLabel>ELI Plus agents</SectionLabel>
          <div className="space-y-1.5">
            {l4Agents.map((agent) => {
              const isActive = agent.status === "Active";
              return (
                <div
                  key={agent.id}
                  className="flex items-center gap-3 rounded-md border border-[hsl(var(--border))]/50 bg-white px-3 py-2.5"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/eli-cube.svg"
                    alt=""
                    width={24}
                    height={24}
                    className={isActive ? "" : "grayscale opacity-40"}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                      ELI Plus {agent.name}
                    </p>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{agent.description}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      isActive
                        ? "bg-[#B3FFCC] text-emerald-800"
                        : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                    }`}
                  >
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
          <p className="text-sm text-amber-800">No ELI Plus agents found. Visit the Agent Roster to add and configure L4 conversational agents.</p>
        </div>
      )}

      <Link
        href="/agent-roster"
        className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--foreground))] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[hsl(var(--foreground))]/90"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/eli-cube.svg" alt="" width={16} height={16} />
        Manage Agents in Agent Roster
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 3: Activate Operational & Efficiency Agents (L2 / L3)
   ═══════════════════════════════════════════════════════════════════════ */

function StepOpsEfficiency() {
  const { agents } = useAgents();
  const l2Agents = useMemo(() => agents.filter((a) => a.type === "intelligence"), [agents]);
  const l3Agents = useMemo(() => agents.filter((a) => a.type === "efficiency"), [agents]);
  const combined = useMemo(() => [...l3Agents, ...l2Agents], [l3Agents, l2Agents]);
  const activeCount = combined.filter((a) => a.status === "Active").length;

  const [showAll, setShowAll] = useState(false);
  const displayAgents = showAll ? combined : combined.slice(0, 8);

  return (
    <div className="space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        L2 Operational agents handle data processing, batch automations, and intelligence tasks. L3 Efficiency agents orchestrate complex multi-step workflows. Activate the agents relevant to your operations.
      </p>

      <div className="flex flex-wrap gap-2">
        <StatusPill ok={activeCount > 0} label={`${activeCount} of ${combined.length} agent(s) active`} />
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-medium text-blue-700">
          {l3Agents.length} L3 · {l2Agents.length} L2
        </span>
      </div>

      {combined.length > 0 ? (
        <>
          <SectionLabel>Operational &amp; efficiency agents</SectionLabel>
          <div className="space-y-1.5">
            {displayAgents.map((agent) => {
              const isActive = agent.status === "Active";
              const typeLabel = agent.type === "efficiency" ? "L3 · Processing at Scale" : "L2 · Operational Efficiency";
              const iconSrc = agent.type === "efficiency" ? "/icon-l3-efficiency.svg" : "/icon-l2-operational.svg";
              return (
                <div
                  key={agent.id}
                  className="flex items-center gap-3 rounded-md border border-[hsl(var(--border))]/50 bg-white px-3 py-2.5"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={iconSrc}
                    alt=""
                    width={24}
                    height={24}
                    className={isActive ? "" : "grayscale opacity-40"}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">{agent.name}</p>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                      {typeLabel} — {agent.description}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      isActive
                        ? "bg-[#B3FFCC] text-emerald-800"
                        : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                    }`}
                  >
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              );
            })}
          </div>
          {combined.length > 8 && (
            <button type="button" onClick={() => setShowAll(!showAll)} className="text-sm font-medium text-[hsl(var(--foreground))] underline underline-offset-4">
              {showAll ? "Show less" : `Show all ${combined.length} agents`}
            </button>
          )}
        </>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
          <p className="text-sm text-amber-800">No L2/L3 agents found. Visit the Agent Roster to add operational and efficiency agents.</p>
        </div>
      )}

      <div className="pt-1">
        <Link
          href="/agent-roster"
          className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--foreground))] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[hsl(var(--foreground))]/90"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/eli-cube.svg" alt="" width={16} height={16} />
          Activate Agents in Agent Roster
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 4: Activate ELI Essentials (L1)
   ═══════════════════════════════════════════════════════════════════════ */

function StepEliEssentials() {
  const { agents, updateAgent } = useAgents();
  const l1Agents = useMemo(() => agents.filter((a) => a.type === "operations"), [agents]);
  const activeCount = l1Agents.filter((a) => a.status === "Active").length;

  const [showAll, setShowAll] = useState(false);
  const displayAgents = showAll ? l1Agents : l1Agents.slice(0, 6);

  return (
    <div className="space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        ELI Essentials are foundational L1 agents that handle automated operations — scheduled runs, batch processing, and system-level tasks. These agents are managed through ELI Essentials settings in Entrata and provide the operational backbone for your AI ecosystem.
      </p>

      <div className="flex flex-wrap gap-2">
        <StatusPill ok={activeCount > 0} label={`${activeCount} of ${l1Agents.length} ELI Essentials agent(s) active`} />
      </div>

      {l1Agents.length > 0 ? (
        <>
          <SectionLabel>ELI Essentials agents</SectionLabel>
          <div className="space-y-1.5">
            {displayAgents.map((agent) => (
              <InlineToggle
                key={agent.id}
                checked={agent.status === "Active"}
                onChange={(on) => updateAgent(agent.id, { status: on ? "Active" : "Off" })}
                label={agent.name}
                description={agent.description}
              />
            ))}
          </div>
          {l1Agents.length > 6 && (
            <button type="button" onClick={() => setShowAll(!showAll)} className="text-sm font-medium text-[hsl(var(--foreground))] underline underline-offset-4">
              {showAll ? "Show less" : `Show all ${l1Agents.length} agents`}
            </button>
          )}
        </>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
          <p className="text-sm text-amber-800">No ELI Essentials agents found. Visit the Agent Roster to add L1 operational agents.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <StepLink href="/agent-roster" label="Manage agents in Agent Roster" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 5: Activate Live Conversations & Centralized Communications
   ═══════════════════════════════════════════════════════════════════════ */

const COMM_CHANNELS = [
  { label: "Website Chat", icon: MessageSquare, description: "Embed AI-powered chat on your property websites", configLabel: "Configure Website Chat" },
  { label: "Voice / Phone", icon: Phone, description: "AI-assisted phone interactions and call handling", configLabel: "Configure Voice & Phone" },
  { label: "SMS / Text", icon: Smartphone, description: "Two-way texting with residents and prospects", configLabel: "Configure SMS & Text" },
  { label: "Contact Points", icon: Globe, description: "Resident portal, email, and additional communication touch points", configLabel: "Configure Contact Points" },
];

function StepLiveConversations() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Enable the communication channels that your AI agents will use to handle live conversations. Once activated, the Command Center will show a centralized inbox of all live conversations across these channels, giving your team full visibility and control.
      </p>

      <SectionLabel>Communication channels</SectionLabel>
      <div className="grid gap-2 sm:grid-cols-2">
        {COMM_CHANNELS.map(({ label, icon: ChannelIcon, description, configLabel }) => (
          <Link
            key={label}
            href="/voice"
            className="group flex items-start gap-3 rounded-lg border border-[hsl(var(--border))]/50 bg-white p-4 transition-colors hover:border-[hsl(var(--foreground))]/20 hover:bg-[hsl(var(--muted))]/30"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--muted))]">
              <ChannelIcon className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">{label}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-[hsl(var(--muted-foreground))]">{description}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[hsl(var(--foreground))] underline decoration-[hsl(var(--border))] underline-offset-4 transition-colors group-hover:decoration-[hsl(var(--foreground))]">
                {configLabel}
                <ExternalLink className="h-3 w-3" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      <StepLink href="/command-center" label="View live conversations in Command Center" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 6: Configure Voice & Brand
   ═══════════════════════════════════════════════════════════════════════ */

function StepVoiceBrand() {
  const { persona, update, configured } = useVoice();
  const [localPersona, setLocalPersona] = useState(persona);

  const handlePersonaBlur = () => {
    if (localPersona !== persona) update({ persona: localPersona });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Define how your AI agents communicate with residents and prospects. Set your brand voice, tone, and personality guidelines so every interaction reflects your organization&apos;s identity.
      </p>

      <StatusPill ok={configured} label={configured ? "Voice & brand configured" : "Not yet configured"} />

      <SectionLabel>Brand persona</SectionLabel>
      <div className="rounded-md border border-[hsl(var(--border))]/50 bg-white p-3">
        <input
          type="text"
          value={localPersona}
          onChange={(e) => setLocalPersona(e.target.value)}
          onBlur={handlePersonaBlur}
          placeholder="e.g. Helpful property assistant"
          className="w-full bg-transparent text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/60 focus:outline-none"
        />
        <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">Describes how your agents should present themselves</p>
      </div>

      <StepLink href="/voice" label="Full voice & brand configuration" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 7: Set up Workflows
   ═══════════════════════════════════════════════════════════════════════ */

const WORKFLOW_TEMPLATES = [
  { name: "Lead response", description: "New lead → create task and notify leasing team", recipeName: "New lead → create task" },
  { name: "Maintenance triage", description: "Work order → categorize, assign vendor, notify resident", recipeName: "Work order → notify resident" },
  { name: "Lease renewal batch", description: "Upcoming expirations → generate offers and queue outreach", recipeName: "Lease renewal reminder" },
];

function StepWorkflows() {
  const { recipes, toggleRecipe, addRecipe, atLeastOneEnabled } = useWorkflows();
  const existingTemplates = new Set(recipes.map((r) => r.fromTemplate).filter(Boolean));
  const enabled = recipes.filter((r) => r.enabled).length;

  const handleAddTemplate = (tmpl: typeof WORKFLOW_TEMPLATES[number]) => {
    if (existingTemplates.has(tmpl.name)) return;
    addRecipe({ name: tmpl.recipeName, enabled: true, fromTemplate: tmpl.name });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Workflows automate multi-step processes across your organization. Set up recipes for lead response, maintenance triage, renewals, and more to connect your agents and teams.
      </p>

      <div className="flex flex-wrap gap-2">
        <StatusPill ok={atLeastOneEnabled} label={`${enabled} of ${recipes.length} workflow(s) active`} />
      </div>

      <SectionLabel>Quick setup — add from template</SectionLabel>
      <div className="space-y-1.5">
        {WORKFLOW_TEMPLATES.map((tmpl) => {
          const exists = existingTemplates.has(tmpl.name);
          return (
            <div key={tmpl.name} className={`flex items-center gap-3 rounded-lg border bg-white p-3 ${exists ? "border-emerald-200 bg-emerald-50/30" : "border-[hsl(var(--border))]/50"}`}>
              <Zap className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">{tmpl.name}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{tmpl.description}</p>
              </div>
              {exists ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Added</span>
              ) : (
                <button type="button" onClick={() => handleAddTemplate(tmpl)} className="rounded-md bg-[hsl(var(--foreground))] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[hsl(var(--foreground))]/90">
                  Add
                </button>
              )}
            </div>
          );
        })}
      </div>

      {recipes.length > 0 && (
        <>
          <SectionLabel>Your workflows</SectionLabel>
          <div className="space-y-1.5">
            {recipes.map((recipe) => (
              <InlineToggle key={recipe.id} checked={recipe.enabled} onChange={() => toggleRecipe(recipe.id)} label={recipe.name} description={recipe.fromTemplate ? `From template: ${recipe.fromTemplate}` : undefined} />
            ))}
          </div>
        </>
      )}

      <StepLink href="/workflows" label="Advanced workflow configuration" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 8: Configure Your Workforce
   ═══════════════════════════════════════════════════════════════════════ */

function StepWorkforce() {
  const { humanMembers, allLabels } = useWorkforce();
  const teamCount = new Set(humanMembers.map((m) => m.team).filter(Boolean)).size;
  const availableCount = humanMembers.filter((m) => {
    const a = getAvailability(m);
    return a === "available" || a === "on_shift";
  }).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Configure your human workforce so the platform can route escalations, balance workloads, and pair the right team member with each task. Set up team assignments, skills/labels, availability schedules, and escalation routing rules.
      </p>

      <div className="flex flex-wrap gap-2">
        <StatusPill ok={humanMembers.length > 0} label={`${humanMembers.length} team member(s) configured`} />
        {teamCount > 0 && <StatusPill ok label={`${teamCount} team(s)`} />}
        <StatusPill ok={availableCount > 0} label={`${availableCount} currently available`} />
      </div>

      <SectionLabel>What to configure</SectionLabel>
      <div className="space-y-2">
        {[
          { label: "Team members & org structure", description: "Add team members, set roles, and define reporting lines" },
          { label: "Skills & labels", description: "Tag team members with skills so escalations route to the right person" },
          { label: "Availability & schedules", description: "Set working hours, shifts, and time-off so routing is schedule-aware" },
          { label: "Escalation routing rules", description: "Define how escalations are assigned, reassigned, and escalated to managers" },
        ].map((item) => (
          <div key={item.label} className="flex items-start gap-2.5 rounded-md border border-[hsl(var(--border))]/50 bg-white px-3 py-2.5">
            <Settings className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
            <div>
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">{item.label}</p>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{item.description}</p>
            </div>
          </div>
        ))}
      </div>

      <StepLink href="/workforce" label="Configure workforce" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 9: Set up Governance
   ═══════════════════════════════════════════════════════════════════════ */

function StepGovernance() {
  const { state, updateActivity, enabledGuardrailCount } = useGovernance();

  return (
    <div className="space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Configure guardrails for high-regulation activities. Enable approval gates and policy checks to ensure your AI agents operate within compliance boundaries and organizational policies.
      </p>

      <StatusPill ok={enabledGuardrailCount > 0} label={`${enabledGuardrailCount}/${HIGH_REGULATION_ACTIVITIES.length} guardrails active`} />

      <SectionLabel>Quick setup — configure guardrails</SectionLabel>
      <div className="space-y-1.5">
        {HIGH_REGULATION_ACTIVITIES.map((activity) => {
          const guardrail = state.activities[activity.id];
          if (!guardrail) return null;
          return (
            <div key={activity.id} className="rounded-md border border-[hsl(var(--border))]/50 bg-white px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">{activity.label}</p>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${RISK_COLORS[activity.risk as RiskLevel]}`}>{activity.risk}</span>
                  </div>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{activity.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={guardrail.enabled}
                  onClick={() => updateActivity(activity.id, { enabled: !guardrail.enabled })}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${guardrail.enabled ? "bg-emerald-600" : "bg-[hsl(var(--border))]"}`}
                >
                  <span className={`pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${guardrail.enabled ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
                </button>
              </div>
              {guardrail.enabled && (
                <div className="mt-2 flex gap-3 border-t border-[hsl(var(--border))]/30 pt-2">
                  <label className="flex items-center gap-1.5 text-xs text-[hsl(var(--foreground))]">
                    <input type="checkbox" checked={guardrail.approvalGate} onChange={() => updateActivity(activity.id, { approvalGate: !guardrail.approvalGate })} className="h-3.5 w-3.5 rounded border-[hsl(var(--border))]" />
                    Approval gate
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-[hsl(var(--foreground))]">
                    <input type="checkbox" checked={guardrail.policyCheck} onChange={() => updateActivity(activity.id, { policyCheck: !guardrail.policyCheck })} className="h-3.5 w-3.5 rounded border-[hsl(var(--border))]" />
                    Policy check
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <StepLink href="/governance" label="Full governance configuration" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 10: Brief Your Team
   ═══════════════════════════════════════════════════════════════════════ */

const BRIEF_ITEMS = [
  { label: "Share overview of OXP Studio with your team", description: "Walk through what the platform does and how it will support daily operations" },
  { label: "Review escalation procedures", description: "Ensure team members understand how AI escalations work and their role in the process" },
  { label: "Explain agent capabilities & limitations", description: "Set clear expectations about what AI agents can and cannot do independently" },
  { label: "Demonstrate the Command Center", description: "Show your team how to monitor live conversations, metrics, and escalations" },
  { label: "Share governance policies", description: "Brief the team on compliance guardrails, approval gates, and audit procedures" },
  { label: "Assign team roles & responsibilities", description: "Clarify who handles what — routing, escalations, reviews, and overrides" },
];

function StepBriefTeam() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const doneCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Before going live, make sure your team is briefed on the platform, understands their role alongside AI agents, and knows how to handle escalations and overrides.
      </p>

      <StatusPill ok={doneCount === BRIEF_ITEMS.length} label={`${doneCount}/${BRIEF_ITEMS.length} briefing items complete`} />

      <SectionLabel>Team briefing checklist</SectionLabel>
      <div className="space-y-1.5">
        {BRIEF_ITEMS.map((item) => (
          <div key={item.label} className="flex items-start gap-3 rounded-md border border-[hsl(var(--border))]/50 bg-white px-3 py-2.5">
            <input
              type="checkbox"
              checked={checked[item.label] ?? false}
              onChange={() => setChecked((p) => ({ ...p, [item.label]: !p[item.label] }))}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-[hsl(var(--border))] text-emerald-600"
            />
            <div>
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">{item.label}</p>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{item.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 pt-1">
        <button
          type="button"
          onClick={() => {
            const content = [
              "OXP Studio — Team Brief",
              "=" .repeat(40),
              "",
              "This document outlines the key information your team needs before going live with OXP Studio.",
              "",
              ...BRIEF_ITEMS.map((item, i) => `${i + 1}. ${item.label}\n   ${item.description}`),
              "",
              "—",
              "Generated from OXP Studio AI & Agent Activation",
            ].join("\n");
            const blob = new Blob([content], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "OXP-Studio-Team-Brief.txt";
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--foreground))] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[hsl(var(--foreground))]/90"
        >
          <Download className="h-4 w-4" />
          Download Team Brief
        </button>
        <button
          type="button"
          onClick={() => {
            const subject = encodeURIComponent("OXP Studio — Team Brief");
            const body = encodeURIComponent(
              [
                "Hi team,",
                "",
                "We are preparing to go live with OXP Studio. Please review the following briefing items before launch:",
                "",
                ...BRIEF_ITEMS.map((item, i) => `${i + 1}. ${item.label} — ${item.description}`),
                "",
                "Please reach out if you have any questions.",
                "",
                "Thanks!",
              ].join("\n")
            );
            window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-white px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]/50"
        >
          <Mail className="h-4 w-4" />
          Send to Team via Email
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 11: Review & Go Live
   ═══════════════════════════════════════════════════════════════════════ */

function StepGoLive({
  checklist,
  onGoLive,
  canGoLive,
}: {
  checklist: Record<string, boolean>;
  onGoLive: () => void;
  canGoLive: boolean;
}) {
  const items = [
    { key: "docs", label: "Documents & SOPs uploaded" },
    { key: "eliPlus", label: "At least one ELI Plus agent activated" },
    { key: "opsAgents", label: "Operational & efficiency agents reviewed" },
    { key: "essentials", label: "ELI Essentials agents activated" },
    { key: "voiceOrChannel", label: "Communication channels configured" },
    { key: "governance", label: "Governance guardrails reviewed" },
    { key: "testRun", label: "Run a test (sample conversation or workflow)" },
  ];
  const doneItems = items.filter(({ key }) => checklist[key]).length;

  return (
    <div className="space-y-5">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Final checklist before going live. Each item reflects the real platform state from the steps above.
      </p>

      <div className="rounded-lg border border-[hsl(var(--border))]/50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium text-[hsl(var(--foreground))]">Go-live readiness</p>
          <span className="text-xs font-medium tabular-nums text-[hsl(var(--muted-foreground))]">{doneItems}/{items.length}</span>
        </div>
        <ul className="space-y-2">
          {items.map(({ key, label }) => (
            <li key={key} className="flex items-center gap-2.5">
              {checklist[key] ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <Circle className="h-4 w-4 shrink-0 text-[hsl(var(--border))]" />}
              <span className={`text-sm ${checklist[key] ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--foreground))]"}`}>{label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onGoLive} disabled={!canGoLive} className="btn-primary disabled:pointer-events-none disabled:opacity-50">
          Go live
        </button>
      </div>
    </div>
  );
}
