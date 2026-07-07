"use client";

/**
 * Read-only detail view for Entrata-maintained system agents (Leasing AI,
 * Maintenance AI, Renewal AI, Payments AI, etc.). Mirrors the layout of the
 * custom agent detail page — same tabs, same panels — so PMs get a
 * consistent experience everywhere. The only meaningful difference is that
 * the edit affordances are replaced by a single prominent "Build Your Own
 * Agent" liquid-glass CTA, which forks the system agent into a custom
 * version the PM owns.
 *
 * We never persist a CustomAgent record for the preview — the page
 * synthesizes one in memory from the native agent using the fork helpers,
 * then reuses the existing {@link OverviewTab} component to render it.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  History,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
  Square,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LiquidGlassButton } from "../ui/liquid-glass-button";
import { EntrataAgentBadge } from "../custom-agents/EntrataAgentBadge";
import { OverviewTab } from "./detail";
import { SimulateMenu } from "./simulate-menu";
import { useAgents, type Agent } from "../../lib/agents-context";

/**
 * Status → display mapping for native system agents. We piggy-back on the
 * existing `Agent.status: string` field (so "Active" remains the roster-wide
 * signal for a running agent) and add "Dry run" and "Paused" as additional
 * values the PM can move the agent through. Any other value falls through
 * to `Off`.
 */
const SYSTEM_LIFECYCLE_STYLE: Record<
  "Active" | "Dry run" | "Paused" | "Off",
  { label: string; className: string }
> = {
  Active: { label: "Live", className: "bg-[#B3FFCC] text-black" },
  "Dry run": { label: "Dry-run", className: "bg-amber-100 text-amber-800" },
  Paused: { label: "Paused", className: "bg-slate-200 text-slate-700" },
  Off: { label: "Off", className: "bg-muted text-muted-foreground" },
};

type SystemLifecycle = keyof typeof SYSTEM_LIFECYCLE_STYLE;

function normalizeLifecycle(status: string): SystemLifecycle {
  if (status === "Active") return "Active";
  if (status === "Dry run") return "Dry run";
  // Older seeds use "Suspended"; surface it to the PM as "Paused".
  if (status === "Paused" || status === "Suspended") return "Paused";
  return "Off";
}
import {
  useCustomAgents,
  type AgentVersion,
  type CustomAgent,
} from "../../lib/custom-agents-context";
import { forkFromEntrataAgent } from "../../lib/custom-agents-forking";
import { estimateCost } from "../../lib/custom-agents-cost";
import { canAccessCustomAgentBuilder } from "../../clientGuard";

type Tab = "overview" | "runs" | "evals" | "versions" | "delegation";

export function SystemAgentDetail({ agentId }: { agentId: string }) {
  const { agents } = useAgents();
  const agent = agents.find((a) => a.id === agentId);

  if (!agent) {
    return (
      <div className="page-content">
        <Link
          href="/agent-roster"
          className="mb-3 inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> All agents
        </Link>
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t find that Entrata agent.
        </p>
      </div>
    );
  }

  return <SystemAgentDetailInner agent={agent} />;
}

function SystemAgentDetailInner({ agent }: { agent: Agent }) {
  const router = useRouter();
  const { agents: customAgents, createForkedDraft } = useCustomAgents();
  const { updateAgent: updateNativeAgent } = useAgents();
  const [tab, setTab] = useState<Tab>("overview");
  const [dialogOpen, setDialogOpen] = useState(false);
  const canAuthor = canAccessCustomAgentBuilder();

  const lifecycle = normalizeLifecycle(agent.status);
  const lifecycleStyle = SYSTEM_LIFECYCLE_STYLE[lifecycle];

  const setLifecycle = (next: SystemLifecycle) => {
    updateNativeAgent(agent.id, { status: next });
  };

  // Synthesize a read-only preview CustomAgent + AgentVersion from the native
  // agent's declared configuration. Not persisted — forking is an explicit PM
  // action (the liquid-glass CTA), not a side-effect of viewing the page.
  const { previewAgent, previewVersion } = useMemo(
    () => buildPreview(agent),
    [agent]
  );

  const existingFork = customAgents.find(
    (ca) => ca.forkedFromEntrataId === agent.id && ca.lifecycle !== "draft"
  );
  const existingDraft = customAgents.find(
    (ca) => ca.forkedFromEntrataId === agent.id && ca.lifecycle === "draft"
  );

  const handleFork = () => {
    if (existingDraft) {
      router.push(
        `/agent-builder?view=new&id=${existingDraft.id}&v=${existingDraft.activeVersion}`
      );
      return;
    }
    const forked = createForkedDraft(agent);
    router.push(
      `/agent-builder?view=new&id=${forked.id}&v=${forked.activeVersion}`
    );
  };

  const handleOpenFork = () => {
    if (!canAuthor) return;
    if (existingFork) {
      router.push(`/agent-builder?view=detail&id=${existingFork.id}`);
      return;
    }
    setDialogOpen(true);
  };

  return (
    <div className="page-content pb-10">
      <Link
        href="/agent-roster"
        className="mb-3 inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> All agents
      </Link>

      {/* Header row */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl text-foreground">{agent.name}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${lifecycleStyle.className}`}
            >
              {lifecycleStyle.label}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <EntrataAgentBadge size="md" />
            <span className="text-[12px] text-muted-foreground">
              Maintained by Entrata — updates ship automatically
            </span>
          </div>
          {agent.description && (
            <p className="mt-2 max-w-2xl text-[13px] text-muted-foreground">
              {agent.description}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <SimulateMenu
              agent={previewAgent}
              versionNumber={previewVersion.versionNumber}
              onStart={() => {}}
              onComplete={() => {}}
              readOnly
            />
            <SystemLifecycleActions
              lifecycle={lifecycle}
              onDeployDry={() => setLifecycle("Dry run")}
              onDeployLive={() => setLifecycle("Active")}
              onPause={() => setLifecycle("Paused")}
              onResume={() => setLifecycle("Active")}
              onStop={() => setLifecycle("Off")}
            />
            {canAuthor &&
              (existingFork ? (
                <Button size="sm" onClick={handleOpenFork}>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Open my version
                </Button>
              ) : (
                <LiquidGlassButton
                  onClick={handleOpenFork}
                  label={existingDraft ? "Resume your draft" : "Build Your Own Agent"}
                  size="md"
                />
              ))}
          </div>
          <p className="max-w-[260px] text-right text-[11px] text-muted-foreground">
            {!canAuthor
              ? "Custom versions are limited to Entrata staff during preview."
              : existingFork
              ? `You already have a custom version on your roster.`
              : existingDraft
              ? `Pick up your draft where you left off.`
              : `Fork ${agent.name} into a custom agent you own.`}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 border-b border-border">
        {(["overview", "versions", "runs", "evals", "delegation"] as Tab[]).map(
          (t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`relative px-4 py-2 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
              {tab === t && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-indigo-600" />
              )}
            </button>
          )
        )}
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50/60 px-3 py-2 text-[12px] text-sky-900">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-700" />
            <p>
              {canAuthor ? (
                <>
                  Everything below is the Entrata-maintained configuration for
                  this agent — read-only. Click &ldquo;Build Your Own Agent&rdquo;
                  to fork it into a version you can edit.
                </>
              ) : (
                <>
                  Everything below is the Entrata-maintained configuration for
                  this agent — read-only. Forking into a custom version is
                  limited to Entrata staff accounts during preview.
                </>
              )}
            </p>
          </div>
          <OverviewTab agent={previewAgent} version={previewVersion} />
        </div>
      )}

      {tab === "versions" && (
        <div className="space-y-4">
          <p className="text-[12px] text-muted-foreground">
            Entrata manages the version history for this agent. When you
            customize it, your own versions start accumulating here.
          </p>
          <ul className="space-y-2">
            <li className="overflow-hidden rounded-lg border border-sky-200 bg-gradient-to-r from-sky-50/60 to-cyan-50/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-sky-900">
                      Entrata system version
                    </span>
                    <Badge className="h-4 px-1.5 text-[9px] bg-sky-100 text-sky-800 hover:bg-sky-100">
                      <ShieldCheck className="mr-0.5 h-2.5 w-2.5" /> Entrata · System
                    </Badge>
                    <span className="text-[11px] text-sky-700/80">
                      · Auto-updated by Entrata
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-[12px] text-sky-900/80">
                    {previewVersion.prompt.slice(0, 240)}
                  </p>
                </div>
                {canAuthor && (
                  <div className="shrink-0">
                    <Button
                      size="sm"
                      onClick={handleOpenFork}
                      className="bg-sky-600 hover:bg-sky-700"
                    >
                      <Sparkles className="mr-1 h-3.5 w-3.5" /> Build your own version
                    </Button>
                  </div>
                )}
              </div>
            </li>
          </ul>
        </div>
      )}

      {tab === "runs" && (
        <EmptyStateCard
          icon={<History className="h-8 w-8 text-muted-foreground/70" />}
          title="Runs aren't surfaced for system agents"
          body="Entrata-maintained agents run across the platform — their activity shows up in Conversations, not here. Build your own version to start tracking runs in Agent Builder."
          onBuild={handleOpenFork}
          buildLabel={existingDraft ? "Resume your draft" : "Build Your Own Agent"}
          existingFork={Boolean(existingFork)}
          allowAuthoring={canAuthor}
        />
      )}

      {tab === "evals" && (
        <EmptyStateCard
          icon={<ShieldCheck className="h-8 w-8 text-muted-foreground/70" />}
          title="Entrata maintains evals for this agent"
          body="We regression-test system agents against thousands of real conversations. When you build your own version, you can add the eval cases that matter most to your portfolio."
          onBuild={handleOpenFork}
          buildLabel={existingDraft ? "Resume your draft" : "Build Your Own Agent"}
          existingFork={Boolean(existingFork)}
          allowAuthoring={canAuthor}
        />
      )}

      {tab === "delegation" && (
        <EmptyStateCard
          icon={<Sparkles className="h-8 w-8 text-muted-foreground/70" />}
          title="Delegation is wired by Entrata"
          body={`${agent.name} automatically hands off to the right agent when a request falls outside its scope. Fork it to override those handoffs yourself.`}
          onBuild={handleOpenFork}
          buildLabel={existingDraft ? "Resume your draft" : "Build Your Own Agent"}
          existingFork={Boolean(existingFork)}
          allowAuthoring={canAuthor}
        />
      )}

      {/* Fork confirmation dialog — same disclosures as CustomizeEntrataAgentPanel */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Take ownership of {agent.name}?</DialogTitle>
            <DialogDescription>
              You&apos;re about to create your own custom version of this
              agent. Before you continue, here&apos;s what changes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm text-foreground">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-primary">•</span>
              <p>
                Your custom version will{" "}
                <span className="font-medium">
                  replace the Entrata-maintained {agent.name}
                </span>{" "}
                on your Agent Roster. You can always restore the system
                version from the Versions tab.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-primary">•</span>
              <p>
                You own the prompt, guardrails, triggers, data, skills, and
                escalations going forward. Nothing about your version updates
                unless you change it.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-amber-600">•</span>
              <p>
                Entrata will keep improving the system {agent.name} — those
                improvements{" "}
                <span className="font-medium">
                  won&apos;t flow into your custom version
                </span>{" "}
                automatically. You&apos;ll need to review and re-apply them
                yourself.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                We recommend using the system agent as-is unless you have a
                specific reason to customize. Custom agents require more
                ongoing maintenance from you.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Never mind
            </Button>
            <Button
              onClick={() => {
                setDialogOpen(false);
                handleFork();
              }}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Build my own version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Lifecycle action cluster for a native system agent. Mirrors the same
 * state machine the custom agent detail page offers so the PM gets the
 * same controls everywhere:
 *
 *   Off         → [Deploy dry-run] [Deploy live]
 *   Dry run     → [Pause] [Promote to live]
 *   Active/Live → [Pause] [Stop]
 *   Paused      → [Resume]
 */
function SystemLifecycleActions({
  lifecycle,
  onDeployDry,
  onDeployLive,
  onPause,
  onResume,
  onStop,
}: {
  lifecycle: SystemLifecycle;
  onDeployDry: () => void;
  onDeployLive: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}) {
  if (lifecycle === "Paused") {
    return (
      <Button size="sm" onClick={onResume}>
        <Play className="mr-1 h-3.5 w-3.5" /> Resume
      </Button>
    );
  }
  if (lifecycle === "Dry run") {
    return (
      <>
        <Button variant="outline" size="sm" onClick={onPause}>
          <Pause className="mr-1 h-3.5 w-3.5" /> Pause
        </Button>
        <Button size="sm" onClick={onDeployLive}>
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Promote to live
        </Button>
      </>
    );
  }
  if (lifecycle === "Active") {
    return (
      <>
        <Button variant="outline" size="sm" onClick={onPause}>
          <Pause className="mr-1 h-3.5 w-3.5" /> Pause
        </Button>
        <Button variant="outline" size="sm" onClick={onStop}>
          <Square className="mr-1 h-3.5 w-3.5" /> Stop
        </Button>
      </>
    );
  }
  // Off
  return (
    <>
      <Button variant="outline" size="sm" onClick={onDeployDry}>
        Deploy to dry-run
      </Button>
      <Button size="sm" onClick={onDeployLive}>
        Deploy live
      </Button>
    </>
  );
}

function EmptyStateCard({
  icon,
  title,
  body,
  onBuild,
  buildLabel,
  existingFork,
  allowAuthoring = true,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  onBuild: () => void;
  buildLabel: string;
  existingFork: boolean;
  /** When false, hide fork/build CTAs (e.g. signed-in user is not Entrata staff). */
  allowAuthoring?: boolean;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/40">
        {icon}
      </div>
      <h3 className="mb-1 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mx-auto max-w-md text-[12px] text-muted-foreground">{body}</p>
      {allowAuthoring && !existingFork && (
        <div className="mt-5 flex justify-center">
          <LiquidGlassButton onClick={onBuild} label={buildLabel} size="sm" />
        </div>
      )}
    </div>
  );
}

/**
 * Build an in-memory CustomAgent + AgentVersion pair that represents the
 * native agent's configuration. Purely for display — never persisted.
 * Reuses {@link forkFromEntrataAgent} so the data shown here is identical
 * to what a real fork would seed, minus the PM's edits.
 */
function buildPreview(agent: Agent): {
  previewAgent: CustomAgent;
  previewVersion: AgentVersion;
} {
  const { version } = forkFromEntrataAgent(agent);
  const previewVersion: AgentVersion = {
    ...version,
    costEstimate: estimateCost(version),
  };
  const previewAgent: CustomAgent = {
    id: `preview:${agent.id}`,
    name: agent.name,
    description: agent.description ?? "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "Entrata",
    lifecycle: "live",
    activeVersion: 1,
    dryRunVersions: [],
    versions: [previewVersion],
    runs: [],
    delegationEnabled: true,
    capabilityTags: (agent.labels ?? []).slice(),
    // Link the preview back to the native agent for fork lineage tracking.
    forkedFromEntrataId: agent.id,
    forkedFromEntrataName: agent.name,
  };
  return { previewAgent, previewVersion };
}
