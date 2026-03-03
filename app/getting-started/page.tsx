"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { useSetup } from "@/lib/setup-context";
import { useContract } from "@/lib/contract-context";
import { ContractGate, R1ComingSoon } from "@/components/contract-overlay";
import { useVault, COMPLIANCE_ITEMS } from "@/lib/vault-context";
import { useAgents, AGENT_TYPES, type Agent } from "@/lib/agents-context";
import { useWorkflows } from "@/lib/workflows-context";
import { useVoice } from "@/lib/voice-context";
import { useTools } from "@/lib/tools-context";
import { useWorkforce } from "@/lib/workforce-context";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Plug,
  FileText,
  Bot,
  GitBranch,
  Mic,
  Shield,
  Wrench,
  Rocket,
  Building2,
  Zap,
  BarChart3,
  Users,
  Download,
  Mail,
  Calendar,
  Lock,
} from "lucide-react";

const STEPS = [
  { id: "vault", title: "Train Your Workforce — Upload Documents to the Vault", href: "/trainings-sop" },
  { id: "voice", title: "Configure voice & brand", href: "/voice" },
  { id: "eli-activate", title: "Activate Autonomous Agents (ELI+ Suite)", href: "/agent-roster" },
  { id: "intel-activate", title: "Activate Intelligence & Operations Agents", href: "/agent-roster" },
  // { id: "account", title: "Account & organization", href: null },
  // { id: "entrata", title: "Connect Entrata", href: null },
  // { id: "tools", title: "Configure tools", href: "/tools" },
  // { id: "agents", title: "Create & configure agents", href: "/agent-roster" },
  { id: "workflows", title: "Set up workflows", href: "/workflows" },
  { id: "governance", title: "Set up governance", href: "/governance" },
  { id: "brief", title: "Brief Your Team", href: null },
  { id: "golive", title: "Review & go live", href: null },
] as const;

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  account: Building2,
  entrata: Plug,
  tools: Wrench,
  vault: FileText,
  "eli-activate": Zap,
  "intel-activate": BarChart3,
  agents: Bot,
  workflows: GitBranch,
  voice: Mic,
  governance: Shield,
  brief: Users,
  golive: Rocket,
};

const ENTRATA_CONTEXT = {
  orgName: "Greystar Real Estate Partners",
  adminEmail: "jmiller@greystar.com",
  adminName: "Jordan Miller",
  properties: 12,
  units: 3_480,
  region: "Southeast US",
};

export default function GettingStartedPage() {
  const router = useRouter();
  const {
    goLiveComplete,
    completedSteps,
    setStepComplete,
    setGoLiveComplete,
    entrataConnected,
    setEntrataConnected,
    testRunDone,
    setTestRunDone,
  } = useSetup();
  const { docCount, complianceChecked, setComplianceChecked } = useVault();
  const { agents, agentsEnabledCount } = useAgents();
  const { recipes, atLeastOneEnabled } = useWorkflows();
  const { configured: voiceConfigured } = useVoice();
  const { entrataModules, availableToolNames } = useTools();
  const { contracted } = useContract();

  const UNGATED_STEPS = new Set(["eli-activate", "intel-activate"]);

  const [expandedStep, setExpandedStep] = useState<number | null>(2);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setEntrataConnected(true);
    for (let i = 2; i < STEPS.length; i++) setStepComplete(i, false);
    setMounted(true);
  }, [setEntrataConnected, setStepComplete]);

  useEffect(() => {
    if (goLiveComplete) router.replace("/command-center");
  }, [goLiveComplete, router]);

  const toggleCompliance = (item: string) => {
    setComplianceChecked((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  const toolsReady = availableToolNames.length > 0;

  const autoDetected: Record<string, boolean> = useMemo(() => ({
    account: true,
    entrata: true,
    tools: toolsReady,
    vault: docCount > 0,
    voice: voiceConfigured,
    "eli-activate": false,
    "intel-activate": false,
    agents: false,
    workflows: false,
    governance: false,
    brief: false,
    golive: false,
  }), [toolsReady, docCount, voiceConfigured]);

  const isStepDone = (i: number) => completedSteps.includes(i) || autoDetected[STEPS[i].id];

  const doneCount = STEPS.reduce((n, _, i) => n + (isStepDone(i) ? 1 : 0), 0);

  const goLiveChecklist = {
    // account: true,
    // entrata: true,
    // tools: toolsReady,
    docs: docCount > 0,
    eliActivate: agents.filter((a) => a.type === "l4" && a.status === "Active").length > 0,
    intelActivate: agents.filter((a) => (a.type === "l2" || a.type === "l3") && a.status === "Active").length > 0,
    // agents: agentsEnabledCount > 0,
    workflow: atLeastOneEnabled,
    voiceOrChannel: voiceConfigured,
    governance: completedSteps.includes(STEPS.findIndex((s) => s.id === "governance")),
    brief: completedSteps.includes(STEPS.findIndex((s) => s.id === "brief")),
    testRun: testRunDone,
  };
  const goLiveSatisfied = Object.values(goLiveChecklist).every(Boolean);

  const handleGoLive = () => {
    setGoLiveComplete(true);
    router.push("/command-center");
  };

  const toolStats = useMemo(() => {
    const contracted = entrataModules.filter((m) => m.contracted).length;
    const enabled = availableToolNames.length;
    const approvalGated = entrataModules
      .flatMap((m) => m.tools)
      .filter((t) => t.enabled && t.requiresApproval).length;
    return { contracted, enabled, approvalGated };
  }, [entrataModules, availableToolNames]);

  const agentStats = useMemo(() => {
    const byType: Record<string, number> = {};
    agents.forEach((a) => {
      if (a.status === "Active") byType[a.type] = (byType[a.type] ?? 0) + 1;
    });
    return { total: agents.length, active: agentsEnabledCount, byType };
  }, [agents, agentsEnabledCount]);

  const workflowStats = useMemo(() => {
    const enabled = recipes.filter((r) => r.enabled).length;
    return { total: recipes.length, enabled };
  }, [recipes]);

  return (
    <ContractGate featureName="Agent Activation">
    <R1ComingSoon featureName="Agent Activation" description="Guided setup wizard to connect your Entrata account, configure AI agents, and go live across your properties.">
    <>
      <PageHeader
        title="Activation"
        description="Complete each step to configure the platform end-to-end. Progress updates automatically as you set things up."
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

      {/* Steps */}
      <div className="space-y-0 rounded-lg border border-[hsl(var(--border))] bg-white">
        {STEPS.map((step, i) => {
          const done = isStepDone(i);
          const isExpanded = expandedStep === i;
          const Icon = STEP_ICONS[step.id];
          const isLocked = !contracted && !UNGATED_STEPS.has(step.id);
          return (
            <div
              key={step.id}
              className={`border-b border-[hsl(var(--border))]/40 last:border-0 ${isLocked ? "relative" : ""}`}
            >
              <button
                type="button"
                onClick={() => {
                  if (isLocked) return;
                  setExpandedStep(isExpanded ? null : i);
                }}
                className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                  isLocked ? "cursor-default opacity-40" : "hover:bg-[hsl(var(--muted))]/30"
                }`}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isLocked) return;
                    setStepComplete(i, !completedSteps.includes(i));
                  }}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    done
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-[hsl(var(--border))] bg-white hover:border-[hsl(var(--muted-foreground))]"
                  }`}
                  aria-label={done ? "Mark incomplete" : "Mark complete"}
                >
                  {done ? (
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))]">{i + 1}</span>
                  )}
                </button>
                {Icon && <Icon className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />}
                <span
                  className={`flex-1 text-sm ${
                    done ? "text-[hsl(var(--muted-foreground))]" : "font-medium text-[hsl(var(--foreground))]"
                  }`}
                >
                  {step.title}
                </span>
                {isLocked ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[10px] font-medium text-gray-400">
                    <Lock className="h-3 w-3" />
                    Requires contract
                  </span>
                ) : (
                  <>
                    {done && !isExpanded && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        Complete
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
                    )}
                  </>
                )}
              </button>

              {isExpanded && !isLocked && (
                <div className="border-t border-[hsl(var(--border))]/30 bg-[hsl(var(--muted))]/20 px-4 pb-6 pl-[3.25rem] pr-6 pt-4">
                  {step.id === "vault" && (
                    <StepVault
                      docCount={docCount}
                      complianceChecked={complianceChecked}
                      onToggleCompliance={toggleCompliance}
                    />
                  )}
                  {step.id === "eli-activate" && (
                    <StepEliActivate agents={agents} />
                  )}
                  {step.id === "intel-activate" && (
                    <StepIntelActivate agents={agents} />
                  )}
                  {step.id === "workflows" && (
                    <StepWorkflows stats={workflowStats} />
                  )}
                  {step.id === "voice" && (
                    <StepVoice configured={voiceConfigured} />
                  )}
                  {step.id === "governance" && (
                    <StepGovernance />
                  )}
                  {step.id === "brief" && (
                    <StepBriefTeam />
                  )}
                  {step.id === "golive" && (
                    <StepGoLive
                      checklist={goLiveChecklist}
                      testRunDone={testRunDone}
                      onTestRun={() => setTestRunDone(true)}
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
        <button
          type="button"
          onClick={handleGoLive}
          disabled={!goLiveSatisfied}
          className="btn-primary disabled:pointer-events-none disabled:opacity-50"
        >
          Go live
        </button>
        {!goLiveSatisfied && (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Complete the checklist in step {STEPS.length} to enable this button.
          </p>
        )}
      </div>
    </>
    </R1ComingSoon>
    </ContractGate>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step: Status pill helper
   ═══════════════════════════════════════════════════════════════════════ */

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
      }`}
    >
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
      {label}
    </span>
  );
}

function StepLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-md bg-[hsl(var(--foreground))] px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-[hsl(var(--foreground))]/90"
    >
      {label}
      <ExternalLink className="h-3.5 w-3.5" />
    </Link>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 1: Account & Organization (inherited from Entrata)
   ═══════════════════════════════════════════════════════════════════════ */

type EntrataContext = typeof ENTRATA_CONTEXT;

function StepAccount({ context }: { context: EntrataContext }) {
  return (
    <div className="max-w-lg space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Your organization details are inherited from Entrata. These are used across the platform for branding, routing, and admin access.
      </p>
      <div className="rounded-lg border border-[hsl(var(--border))]/50 bg-white p-4">
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Organization</dt>
            <dd className="mt-0.5 font-medium text-[hsl(var(--foreground))]">{context.orgName}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Admin</dt>
            <dd className="mt-0.5 font-medium text-[hsl(var(--foreground))]">{context.adminName}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Email</dt>
            <dd className="mt-0.5 text-[hsl(var(--foreground))]">{context.adminEmail}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Region</dt>
            <dd className="mt-0.5 text-[hsl(var(--foreground))]">{context.region}</dd>
          </div>
        </dl>
      </div>
      <StatusPill ok label="Inherited from Entrata" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 2: Entrata Connection (auto-connected)
   ═══════════════════════════════════════════════════════════════════════ */

function StepEntrata({ context }: { context: EntrataContext }) {
  return (
    <div className="max-w-lg space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Janet is running inside your Entrata environment. Property data, leases, residents, and work orders are already accessible.
      </p>
      <div className="rounded-lg border border-[hsl(var(--border))]/50 bg-white p-4">
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Properties</dt>
            <dd className="mt-0.5 text-lg font-semibold text-[hsl(var(--foreground))]">{context.properties.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Units</dt>
            <dd className="mt-0.5 text-lg font-semibold text-[hsl(var(--foreground))]">{context.units.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Connection</dt>
            <dd className="mt-0.5 text-lg font-semibold text-emerald-600">Active</dd>
          </div>
        </dl>
      </div>
      <StatusPill ok label="Entrata connected — all data accessible" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 3: Configure Tools (NEW)
   ═══════════════════════════════════════════════════════════════════════ */

function StepTools({
  stats,
}: {
  stats: { contracted: number; enabled: number; approvalGated: number };
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Choose which Entrata modules and tools your agents can use. Set approval gates on high-risk actions like posting ledger entries or running screening.
      </p>
      <div className="flex flex-wrap gap-2">
        <StatusPill ok={stats.contracted > 0} label={`${stats.contracted} module(s) contracted`} />
        <StatusPill ok={stats.enabled > 0} label={`${stats.enabled} tool(s) enabled`} />
        {stats.approvalGated > 0 && (
          <StatusPill ok label={`${stats.approvalGated} tool(s) gated for approval`} />
        )}
      </div>
      <StepLink href="/tools" label="Open Tools" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 4: Upload Documents to the Vault
   ═══════════════════════════════════════════════════════════════════════ */

function StepVault({
  docCount,
  complianceChecked,
  onToggleCompliance,
}: {
  docCount: number;
  complianceChecked: Record<string, boolean>;
  onToggleCompliance: (item: string) => void;
}) {
  const checkedCount = Object.values(complianceChecked).filter(Boolean).length;
  return (
    <div className="space-y-5">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Upload SOPs, policies, and property guides so agents are grounded in your procedures. Documents also serve as the compliance backbone for audits and governance.
      </p>
      <div className="flex flex-wrap gap-2">
        <StatusPill ok={docCount > 0} label={`${docCount} document(s) uploaded`} />
        {checkedCount > 0 && (
          <StatusPill ok label={`${checkedCount}/${COMPLIANCE_ITEMS.length} compliance items checked`} />
        )}
      </div>
      <StepLink href="/trainings-sop" label="Open Trainings & SOP" />
      <div className="mt-2 rounded-lg border border-[hsl(var(--border))]/50 p-4">
        <p className="mb-3 text-xs font-medium text-[hsl(var(--foreground))]">Compliance checklist (optional)</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {COMPLIANCE_ITEMS.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`compliance-${item}`}
                checked={complianceChecked[item] ?? false}
                onChange={() => onToggleCompliance(item)}
                className="h-4 w-4 rounded border-[hsl(var(--border))] text-[hsl(var(--ring))]"
              />
              <label htmlFor={`compliance-${item}`} className="text-xs text-[hsl(var(--foreground))]">
                {item}
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 3: Activate Autonomous Agents (ELI+ Suite)
   ═══════════════════════════════════════════════════════════════════════ */

function StepEliActivate({ agents }: { agents: Agent[] }) {
  const l4Agents = agents.filter((a) => a.type === "l4");
  const activeL4 = l4Agents.filter((a) => a.status === "Active");
  const propertySet = new Set(
    activeL4.flatMap((a) => a.scope?.split(",").map((s) => s.trim()) ?? []).filter(Boolean)
  );
  const propertyCount = propertySet.size;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Turn on ELI+ Leasing AI, Payments AI, Renewals AI, and Maintenance AI. These agents are the most visible — they interact with your residents and prospects directly. Start with one property to build confidence, then roll out.
      </p>
      <div className="flex flex-wrap gap-2">
        <StatusPill ok={activeL4.length > 0} label={`${activeL4.length} agent(s) active`} />
        {propertyCount > 0 && (
          <StatusPill ok label={`${propertyCount} propert${propertyCount === 1 ? "y" : "ies"}`} />
        )}
      </div>
      <StepLink href="/agent-roster" label="Open Agent Roster" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 4: Activate Intelligence & Operations Agents
   ═══════════════════════════════════════════════════════════════════════ */

function StepIntelActivate({ agents }: { agents: Agent[] }) {
  const intelOpsAgents = agents.filter((a) => (a.type === "l2" || a.type === "l3") && a.status === "Active");
  const totalL2L3 = agents.filter((a) => a.type === "l2" || a.type === "l3").length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Turn on agents that surface hidden revenue and risk — invoice processing, rent optimization, compliance monitoring, special claims. These run in the background and surface recommendations for your team to review. Lower risk to activate because they recommend, not act.
      </p>
      <div className="flex flex-wrap gap-2">
        <StatusPill ok={intelOpsAgents.length > 0} label={`${intelOpsAgents.length} of ${totalL2L3} agents ready`} />
      </div>
      <StepLink href="/agent-roster" label="Open Agent Roster" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 5: Create & Configure Agents
   ═══════════════════════════════════════════════════════════════════════ */

function StepAgents({
  stats,
}: {
  stats: { total: number; active: number; byType: Record<string, number> };
}) {
  const typeBreakdown = AGENT_TYPES
    .map((t) => ({ label: t.label, count: stats.byType[t.value] ?? 0 }))
    .filter((t) => t.count > 0);
  return (
    <div className="space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Create AI agents for leasing, renewals, maintenance, payments, and more. Each agent gets its own system prompt, tools, guardrails, and deployment scope.
      </p>
      <div className="flex flex-wrap gap-2">
        <StatusPill ok={stats.active > 0} label={`${stats.active} of ${stats.total} agent(s) active`} />
        {typeBreakdown.map((t) => (
          <span key={t.label} className="inline-flex items-center rounded-full bg-[hsl(var(--muted))] px-2.5 py-1 text-xs font-medium text-[hsl(var(--foreground))]">
            {t.count} {t.label}
          </span>
        ))}
      </div>
      <StepLink href="/agent-roster" label="Open Agent Roster" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 6: Set Up Workflows
   ═══════════════════════════════════════════════════════════════════════ */

function StepWorkflows({
  stats,
}: {
  stats: { total: number; enabled: number };
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Enable workflow recipes to automate multi-step processes like lead response, maintenance triage, and lease renewal batches. Start from templates or build custom.
      </p>
      <div className="flex flex-wrap gap-2">
        <StatusPill ok={stats.enabled > 0} label={`${stats.enabled} of ${stats.total} workflow(s) active`} />
      </div>
      <StepLink href="/workflows" label="Open Workflows" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 7: Configure Voice & Channels
   ═══════════════════════════════════════════════════════════════════════ */

function StepVoice({ configured }: { configured: boolean }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Set your brand voice and tone, enable communication channels (chat, SMS, voice, email, portal), and tune per-agent personality settings.
      </p>
      <StatusPill ok={configured} label={configured ? "Voice & channels configured" : "Not yet configured"} />
      <StepLink href="/voice" label="Open Voice & Channels" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 8: Set Up Governance (NEW)
   ═══════════════════════════════════════════════════════════════════════ */

function StepGovernance() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Review governance rules for high-regulation activities like tenant screening, eviction notices, and financial postings. Set approval gates, policy checks, and required documentation to ensure agents operate within compliance boundaries.
      </p>
      <div className="rounded-lg border border-[hsl(var(--border))]/50 p-4">
        <p className="text-xs font-medium text-[hsl(var(--foreground))]">Key areas to review</p>
        <ul className="mt-2 grid gap-1.5 text-xs text-[hsl(var(--muted-foreground))] sm:grid-cols-2">
          <li className="flex items-center gap-1.5"><Shield className="h-3 w-3 shrink-0" /> Tenant screening approval gates</li>
          <li className="flex items-center gap-1.5"><Shield className="h-3 w-3 shrink-0" /> Eviction & notice safeguards</li>
          <li className="flex items-center gap-1.5"><Shield className="h-3 w-3 shrink-0" /> Financial posting controls</li>
          <li className="flex items-center gap-1.5"><Shield className="h-3 w-3 shrink-0" /> Fair housing compliance rules</li>
          <li className="flex items-center gap-1.5"><Shield className="h-3 w-3 shrink-0" /> Per-agent governance overrides</li>
          <li className="flex items-center gap-1.5"><Shield className="h-3 w-3 shrink-0" /> Audit trail & change history</li>
        </ul>
      </div>
      <StepLink href="/governance" label="Open Governance" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 8: Brief Your Team
   ═══════════════════════════════════════════════════════════════════════ */

function StepBriefTeam() {
  const { humanMembers } = useWorkforce();
  const staffCount = humanMembers.length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Your staff needs to understand how to work alongside agents. Share the &quot;Working with AI&quot; guide with your on-site team. Key topics: how to review escalations, when to take over from an agent, how to provide feedback that improves agent behavior, and how their role evolves (more high-value work, less repetitive tasks).
      </p>
      <div className="flex flex-wrap gap-2">
        <StatusPill ok={false} label={`0 of ${staffCount} staff briefed`} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md bg-[hsl(var(--foreground))] px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-[hsl(var(--foreground))]/90"
        >
          <Download className="h-3.5 w-3.5" />
          Download Team Brief
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] bg-white px-3.5 py-2 text-sm font-medium text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]/50"
        >
          <Mail className="h-3.5 w-3.5" />
          Send to Team via Email
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] bg-white px-3.5 py-2 text-sm font-medium text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]/50"
        >
          <Calendar className="h-3.5 w-3.5" />
          Schedule Training Session
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 9: Review & Go Live
   ═══════════════════════════════════════════════════════════════════════ */

function StepGoLive({
  checklist,
  testRunDone,
  onTestRun,
  onGoLive,
  canGoLive,
}: {
  checklist: Record<string, boolean>;
  testRunDone: boolean;
  onTestRun: () => void;
  onGoLive: () => void;
  canGoLive: boolean;
}) {
  const items = [
    // { key: "account", label: "Account & organization set up" },
    // { key: "entrata", label: "Entrata connected" },
    // { key: "tools", label: "Tools reviewed and configured" },
    { key: "docs", label: "Documents uploaded to the Vault" },
    { key: "eliActivate", label: "ELI+ autonomous agents activated" },
    { key: "intelActivate", label: "Intelligence & operations agents activated" },
    // { key: "agents", label: "At least one agent enabled" },
    { key: "workflow", label: "At least one workflow active" },
    { key: "voiceOrChannel", label: "Voice or channel configured" },
    { key: "governance", label: "Governance rules reviewed" },
    { key: "brief", label: "Team briefed on working with AI agents" },
    { key: "testRun", label: "Run a test (sample question or workflow)" },
  ];
  const doneItems = items.filter(({ key }) => checklist[key]).length;
  return (
    <div className="space-y-5">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Final checklist before going live. Each item reflects real platform state from the steps above.
      </p>
      <div className="rounded-lg border border-[hsl(var(--border))]/50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium text-[hsl(var(--foreground))]">Go-live readiness</p>
          <span className="text-xs font-medium tabular-nums text-[hsl(var(--muted-foreground))]">
            {doneItems}/{items.length}
          </span>
        </div>
        <ul className="space-y-2">
          {items.map(({ key, label }) => (
            <li key={key} className="flex items-center gap-2.5">
              {checklist[key] ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-[hsl(var(--border))]" />
              )}
              <span className={`text-sm ${checklist[key] ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--foreground))]"}`}>
                {label}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {!testRunDone ? (
          <button type="button" onClick={onTestRun} className="btn-secondary">
            Run a test
          </button>
        ) : (
          <StatusPill ok label="Test run completed" />
        )}
        <button
          type="button"
          onClick={onGoLive}
          disabled={!canGoLive}
          className="btn-primary disabled:pointer-events-none disabled:opacity-50"
        >
          Go live
        </button>
      </div>
    </div>
  );
}
