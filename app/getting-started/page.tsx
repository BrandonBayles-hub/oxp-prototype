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
import { useR1Release } from "@/lib/r1-release-context";
import { useR1_2Release } from "@/lib/r1-2-release-context";
import dynamic from "next/dynamic";
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
  Download,
  Mail,
  ClipboardList,
} from "lucide-react";

const EliPlusSetup = dynamic(() => import("@/components/eli-plus-setup"), { ssr: false });

/* ═══════════════════════════════════════════════════════════════════════
   Steps definition
   ═══════════════════════════════════════════════════════════════════════ */

const STEPS = [
  { id: "eli-essentials",      title: "Activate ELI Essentials",                                    href: "/agent-roster" },
  { id: "ops-efficiency",      title: "Activate Operational & Efficiency Agents",                   href: "/agent-roster" },
  { id: "train-workforce",     title: "Train Your Workforce — Upload Documents & SOPs",             href: "/trainings-sop" },
  { id: "playbooks-tasks",     title: "Create Playbooks & Tasks",                                   href: "/escalations" },
  { id: "workforce",           title: "Configure Your Workforce",                                   href: "/workforce" },
  { id: "eli-plus",            title: "Activate ELI Plus Agents",                                    href: "/agent-roster" },
  { id: "workflows",           title: "Set up Agent Builder",                                        href: "/workflows" },
  { id: "voice-brand",         title: "Configure Voice & Brand",                                     href: "/voice" },
  { id: "governance",          title: "Set up Governance",                                           href: "/governance" },
  { id: "brief-team",          title: "Brief Your Team",                                             href: null },
  { id: "review-golive",       title: "Review & Go Live",                                            href: null },
] as const;

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "eli-essentials":      Zap,
  "ops-efficiency":      Cpu,
  "train-workforce":     FileText,
  "playbooks-tasks":     ClipboardList,
  workforce:             Users,
  "eli-plus":            Bot,
  "activate-ai-agents":  Bot,
  workflows:             GitBranch,
  "voice-brand":         Mic,
  governance:            Shield,
  "brief-team":          Megaphone,
  "review-golive":       Rocket,
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
  const { isR1Release } = useR1Release();
  const { isR1_2Release } = useR1_2Release();
  const isFullVersion = !isR1Release && !isR1_2Release;
  const [activeTab, setActiveTab] = useState<"activation" | "eli-plus">("activation");

  useEffect(() => {
    if (isFullVersion && activeTab === "eli-plus") {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isFullVersion, activeTab]);

  const R1_HIDDEN_STEPS = ["governance", "voice-brand", "eli-essentials", "ops-efficiency", "eli-plus"];

  const visibleSteps = useMemo(() => {
    if (!isR1Release) return STEPS.map(s => ({ ...s }));
    const filtered = STEPS
      .filter(s => !R1_HIDDEN_STEPS.includes(s.id))
      .map(s => s.id === "review-golive" ? { ...s, title: "Review Activation Steps" } : { ...s });
    return [
      { id: "activate-ai-agents", title: "Activate AI Agents", href: "/agent-roster" as const },
      ...filtered,
    ];
  }, [isR1Release]);

  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const resetOnFocus = () => setExpandedStep(null);
    window.addEventListener("focus", resetOnFocus);
    return () => window.removeEventListener("focus", resetOnFocus);
  }, []);

  const l4Agents = useMemo(() => agents.filter((a) => a.type === "autonomous"), [agents]);
  const l2l3Agents = useMemo(() => agents.filter((a) => a.type === "intelligence" || a.type === "efficiency"), [agents]);
  const l1Agents = useMemo(() => agents.filter((a) => a.type === "operations"), [agents]);

  const autoDetected: Record<string, boolean> = useMemo(() => ({
    "eli-essentials":     l1Agents.some((a) => a.status === "Active"),
    "ops-efficiency":     l2l3Agents.some((a) => a.status === "Active"),
    "train-workforce":    false,
    "playbooks-tasks":    false,
    workforce:            false,
    "eli-plus":           l4Agents.some((a) => a.status === "Active"),
    "activate-ai-agents": l4Agents.some((a) => a.status === "Active"),
    workflows:            atLeastOneEnabled,
    "voice-brand":        voiceConfigured,
    governance:           enabledGuardrailCount > 0,
    "brief-team":         false,
    "review-golive":      false,
  }), [docCount, l4Agents, l2l3Agents, l1Agents, voiceConfigured, atLeastOneEnabled, humanMembers, enabledGuardrailCount]);

  const isStepDone = (id: string, i: number) => completedSteps.includes(i) || autoDetected[id];

  const doneCount = visibleSteps.reduce((n, step, i) => n + (isStepDone(step.id, i) ? 1 : 0), 0);

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

  if (isFullVersion && activeTab === "eli-plus") {
    return (
      <div className="fixed inset-0 flex flex-col bg-white" style={{ top: 76, zIndex: 9999 }}>
        {/* Back bar */}
        <div className="flex items-center gap-3 border-b border-[hsl(var(--border))] bg-white px-5 py-2.5">
          <button
            type="button"
            onClick={() => setActiveTab("activation")}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
          >
            <ChevronRight className="h-3.5 w-3.5 rotate-180" />
            AI &amp; Agent Activation
          </button>
          <span className="text-[hsl(var(--border))]">|</span>
          <span className="text-sm font-semibold text-[hsl(var(--foreground))]">ELI Plus Setup</span>
        </div>
        {/* Full-bleed ELI Plus content */}
        <div className="flex-1 overflow-hidden">
          <EliPlusSetup />
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="AI & Agent Activation"
        description="Complete each step to fully activate OXP Studio. Progress updates automatically as you configure the platform."
      />

      {isFullVersion && (
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setActiveTab("eli-plus")}
            className="flex w-full items-center gap-4 rounded-xl border border-[hsl(var(--border))] bg-white p-4 text-left transition-all hover:border-zinc-400 hover:shadow-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900">
              <Rocket className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[hsl(var(--foreground))]">ELI Plus Setup</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Configure and activate ELI Plus agents across your portfolio — leasing, payments, maintenance, and renewals</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-[hsl(var(--muted-foreground))]" />
          </button>
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-8 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
          <div
            className="h-full rounded-full bg-emerald-600 transition-all duration-500"
            style={{ width: `${(doneCount / visibleSteps.length) * 100}%` }}
          />
        </div>
        <span className="text-sm font-medium tabular-nums text-[hsl(var(--muted-foreground))]">
          {doneCount}/{visibleSteps.length}
        </span>
      </div>

      {/* Steps accordion */}
      <div className="space-y-0 rounded-lg border border-[hsl(var(--border))] bg-white">
        {visibleSteps.map((step, idx) => {
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
                  {step.id === "activate-ai-agents" && <StepActivateAIAgents />}
                  {step.id === "eli-essentials" && <StepEliEssentials />}
                  {step.id === "ops-efficiency" && <StepOpsEfficiency />}
                  {step.id === "train-workforce" && <StepTrainWorkforce />}
                  {step.id === "playbooks-tasks" && <StepPlaybooksTasks />}
                  {step.id === "workforce" && <StepWorkforce />}
                  {step.id === "eli-plus" && <StepEliPlus />}
                  {step.id === "workflows" && <StepWorkflows />}
                  {step.id === "voice-brand" && <StepVoiceBrand />}
                  {step.id === "governance" && <StepGovernance />}
                  {step.id === "brief-team" && <StepBriefTeam />}
                  {step.id === "review-golive" && (
                    <StepGoLive
                      checklist={goLiveChecklist}
                      onGoLive={handleGoLive}
                      canGoLive={goLiveSatisfied}
                      hideGoLive={isR1Release}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom go-live CTA */}
      {!isR1Release && (
        <div className="mt-8 flex items-center gap-4">
          <button type="button" onClick={handleGoLive} disabled={!goLiveSatisfied} className="btn-primary disabled:pointer-events-none disabled:opacity-50">
            Go live
          </button>
          {!goLiveSatisfied && (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Complete the go-live checklist in step {visibleSteps.length} to enable this button.
            </p>
          )}
        </div>
      )}
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
  const { isR1Release } = useR1Release();

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

      {!isR1Release && <StatusPill ok={docCount > 0} label={docCount > 0 ? `${docCount} document(s) uploaded` : "No documents uploaded yet"} />}

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
   Step 4: Create Playbooks & Tasks
   ═══════════════════════════════════════════════════════════════════════ */

function StepPlaybooksTasks() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Playbooks define how your team and AI agents handle specific escalation scenarios — from maintenance emergencies to lease violations and resident complaints. Tasks are the individual action items that get created and assigned when a playbook is triggered.
      </p>

      <div className="rounded-lg border border-[hsl(var(--border))]/50 bg-white p-4">
        <SectionLabel>Why this matters</SectionLabel>
        <ul className="mt-2 space-y-2">
          {[
            "Playbooks ensure consistent, repeatable responses to common escalation types so nothing falls through the cracks.",
            "Tasks are automatically created and routed to the right team members or AI agents based on playbook rules, reducing manual coordination.",
            "Every escalation gets a clear resolution path with defined steps, owners, and SLAs — giving leadership full visibility into response quality.",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span className="text-[13px] text-[hsl(var(--foreground))]">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <Link
        href="/escalations"
        className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--foreground))] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[hsl(var(--foreground))]/90"
      >
        <ClipboardList className="h-4 w-4" />
        Go to Escalations Setup
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   R1: Activate AI Agents (combined step)
   ═══════════════════════════════════════════════════════════════════════ */

function StepActivateAIAgents() {
  const { agents } = useAgents();
  const l4Agents = useMemo(() => agents.filter((a) => a.type === "autonomous"), [agents]);
  const activeCount = l4Agents.filter((a) => a.status === "Active").length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        AI agents work around the clock to drive outcomes across your portfolio — from engaging prospects and signing leases to collecting rent and resolving maintenance requests. Activating your AI agents is the single most impactful step to reducing manual work and improving performance across your properties.
      </p>

      <div className="flex flex-wrap gap-2">
        <StatusPill ok={activeCount > 0} label={`${activeCount} AI agent${activeCount !== 1 ? "s" : ""} active`} />
      </div>

      {l4Agents.length > 0 && (
        <>
          <SectionLabel>AI Agents</SectionLabel>
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
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">{agent.name}</p>
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
   Activate ELI Plus Agents (L4)
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
  const { agents } = useAgents();
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
            {displayAgents.map((agent) => {
              const isActive = agent.status === "Active";
              return (
                <div
                  key={agent.id}
                  className="flex items-center gap-3 rounded-md border border-[hsl(var(--border))]/50 bg-white px-3 py-2.5"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icon-l1-essentials.svg"
                    alt=""
                    width={24}
                    height={24}
                    className={isActive ? "" : "grayscale opacity-40"}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">{agent.name}</p>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                      L1 · ELI Essentials — {agent.description}
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

      <div className="pt-1">
        <Link
          href="/agent-roster"
          className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--foreground))] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[hsl(var(--foreground))]/90"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/eli-cube.svg" alt="" width={16} height={16} />
          Activate ELI Essentials
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Configure Voice & Brand
   ═══════════════════════════════════════════════════════════════════════ */

function StepVoiceBrand() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Define how your AI agents communicate with residents and prospects. Set your brand voice, tone, and personality guidelines so every interaction reflects your organization&apos;s identity.
      </p>

      <StepLink href="/voice" label="Configure Voice & Brand" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 7: Set up Agent Builder
   ═══════════════════════════════════════════════════════════════════════ */

function StepWorkflows() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Automate multi-step processes across your organization. Set up recipes for lead response, maintenance triage, renewals, and more to connect your agents and teams.
      </p>

      <div className="rounded-lg border border-[hsl(var(--border))]/50 bg-white p-4">
        <SectionLabel>Why this matters</SectionLabel>
        <ul className="mt-2 space-y-2">
          {[
            "Agent Builder lets you automate complex, multi-step workflows — reducing manual handoffs and ensuring consistency across your portfolio.",
            "Pre-built recipes for leasing, maintenance, and renewals give you a head start so your team can focus on higher-value work.",
            "Connected workflows ensure AI agents and staff work together seamlessly, with clear triggers, actions, and escalation paths.",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span className="text-[13px] text-[hsl(var(--foreground))]">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <StepLink href="/workflows" label="Set up Agent Builder" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 8: Configure Your Workforce
   ═══════════════════════════════════════════════════════════════════════ */

function StepWorkforce() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Configure your human workforce so the platform can route escalations, balance workloads, and pair the right team member with each task. Set up team assignments, skills/labels, availability schedules, and escalation routing rules.
      </p>

      <div className="rounded-lg border border-[hsl(var(--border))]/50 bg-white p-4">
        <SectionLabel>Why this matters</SectionLabel>
        <ul className="mt-2 space-y-2">
          {[
            "AI agents need to know who to escalate to — configuring your workforce ensures the right person gets the right issue at the right time.",
            "Team assignments and availability schedules prevent bottlenecks and ensure coverage across properties and time zones.",
            "Clear roles and routing rules reduce response times and give your team confidence in how AI and human work is divided.",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span className="text-[13px] text-[hsl(var(--foreground))]">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <StepLink href="/workforce" label="Configure Your Workforce" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 9: Set up Governance
   ═══════════════════════════════════════════════════════════════════════ */

function StepGovernance() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Configure guardrails for high-regulation activities. Enable approval gates and policy checks to ensure your AI agents operate within compliance boundaries and organizational policies.
      </p>

      <StepLink href="/governance" label="Set up Governance" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 10: Brief Your Team
   ═══════════════════════════════════════════════════════════════════════ */

const BRIEF_ITEMS = [
  { label: "Confirm 10DLC carrier compliance is approved", description: "Your privacy policy must be live on your website and the 10DLC registration approved by The Campaign Registry before any SMS texts can send. Check status in the Carrier Compliance tab." },
  { label: "Assign phone numbers to every property", description: "Each property needs a dedicated Entrata compliance phone number before IVR routing activates. Open the Communications tab and confirm every property shows a phone number assigned." },
  { label: "Complete IVR routing configuration", description: "Once phone numbers are assigned, select your IVR mode (Preferred Entrata, Existing Entrata, or 3rd Party) and confirm call routing for leasing, maintenance, and other departments." },
  { label: "Walk leasing staff through AI handoffs", description: "Show your leasing team what happens when ELI Leasing AI escalates a prospect to a human. Run a live walkthrough in the Command Center before agents go live." },
  { label: "Confirm Payments AI go-live date with your billing team", description: "Payments AI can only activate on the 2nd or 8th of each month to align with billing cycles. Activating outside this window causes incorrect resident charge notifications — coordinate the date with your billing team now." },
  { label: "Set maintenance escalation contacts for every property", description: "Maintenance AI requires a during-hours and after-hours escalation phone number for each property. Missing contacts block activation on that property. Complete this before the go-live review." },
];

function StepBriefTeam() {
  const { isR1Release } = useR1Release();
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const visibleBriefItems = useMemo(() => {
    if (!isR1Release) return BRIEF_ITEMS;
    return BRIEF_ITEMS.filter(item => item.label !== "Share governance policies");
  }, [isR1Release]);

  const doneCount = visibleBriefItems.filter(item => checked[item.label]).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Before going live, make sure your team is briefed on the platform, understands their role alongside AI agents, and knows how to handle escalations and overrides.
      </p>

      <StatusPill ok={doneCount === visibleBriefItems.length} label={`${doneCount}/${visibleBriefItems.length} briefing items complete`} />

      <SectionLabel>Team briefing checklist</SectionLabel>
      <div className="space-y-1.5">
        {visibleBriefItems.map((item) => (
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

      {!isR1Release && (
        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="button"
            onClick={() => {
              const content = [
                "ELI+ Go-Live Checklist — Team Brief",
                "=" .repeat(40),
                "",
                "Complete these items before activating any ELI+ AI agents. Each item maps to a blocker in the ELI+ Setup workflow.",
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
              const subject = encodeURIComponent("ELI+ Go-Live Checklist — Pre-Launch Actions Required");
              const body = encodeURIComponent(
                [
                  "Hi team,",
                  "",
                  "We are preparing to go live with ELI+ AI agents. Please complete the following before our activation date:",
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
      )}
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
  hideGoLive = false,
}: {
  checklist: Record<string, boolean>;
  onGoLive: () => void;
  canGoLive: boolean;
  hideGoLive?: boolean;
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

      {!hideGoLive && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={onGoLive} disabled={!canGoLive} className="btn-primary disabled:pointer-events-none disabled:opacity-50">
            Go live
          </button>
        </div>
      )}
    </div>
  );
}
