"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "../components/PageHeaderCustom";
import { LiquidGlassButton } from "../components/ui/liquid-glass-button";
import { CustomAgentBadge } from "../components/custom-agents/CustomAgentBadge";
import { EntrataAgentBadge } from "../components/custom-agents/EntrataAgentBadge";
import { useCustomAgents, formatScheduleTrigger, type CustomAgent } from "../lib/custom-agents-context";
import { isEntrataSeededAgent } from "../lib/custom-agents-migrated";
import { PMC_NAME } from "../lib/pmc-identity";
import { EVENT_CATALOG } from "../lib/custom-agents-catalog";
import { formatCurrency } from "../lib/custom-agents-cost";
import { formatMetricValue, computeTrend, primaryMetric } from "../lib/success-metrics";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Clock, MessageSquare, Layers, Trash2, FileEdit, TrendingUp, TrendingDown, Play } from "lucide-react";

const LIFECYCLE_STYLE: Record<CustomAgent["lifecycle"], { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-foreground" },
  setting_up: { label: "Setting up", className: "bg-indigo-100 text-indigo-700" },
  dry_run: { label: "Dry-run", className: "bg-amber-100 text-amber-800" },
  live: { label: "Live", className: "bg-[#B3FFCC] text-black" },
  paused: { label: "Paused", className: "bg-slate-200 text-slate-700" },
  error: { label: "Error", className: "bg-red-100 text-red-700" },
};

export default function AgentBuilderLandingPage() {
  const router = useRouter();
  const { agents, createDraft, deleteAgent, deployLive } = useCustomAgents();

  const drafts = agents.filter((a) => a.lifecycle === "draft");
  const running = agents.filter((a) => a.lifecycle !== "draft");

  const onNew = () => {
    const draft = createDraft();
    router.push(`/agent-builder?view=new&id=${draft.id}`);
  };

  return (
    <>
      <PageHeader
        title="Build Your Own Agent"
        description="Build agents with natural language. Triggers, data, skills, and guardrails — all from one prompt."
        actions={<LiquidGlassButton onClick={onNew} size="md" />}
      />

      <div className="space-y-10 pb-10">
        {drafts.length > 0 && (
          <section>
            <h2 className="section-title mb-3 flex items-center gap-2 text-base">
              <FileEdit className="h-4 w-4" />
              Drafts <span className="text-muted-foreground font-normal">({drafts.length})</span>
            </h2>
            <ul className="space-y-2">
              {drafts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4 rounded-lg border border-dashed border-border bg-white px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{a.name || "(unnamed draft)"}</p>
                    <p className="truncate text-[12px] text-muted-foreground">
                      {a.versions[0]?.prompt?.slice(0, 140) || "No prompt yet"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/agent-builder?view=new&id=${a.id}`}>Continue</Link>
                    </Button>
                    <button
                      type="button"
                      onClick={() => deleteAgent(a.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Delete draft"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-title mb-0 flex items-center gap-2 text-base">
              <Layers className="h-4 w-4" />
              Your custom agents <span className="text-muted-foreground font-normal">({running.length})</span>
            </h2>
          </div>

          {running.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
                <Sparkles className="h-6 w-6 text-indigo-600" />
              </div>
              <p className="text-sm font-medium text-foreground">No custom agents yet</p>
              <p className="mx-auto mt-1 max-w-md text-[13px] text-muted-foreground">
                Build your first agent. Describe what you want it to do, pick when it should run, and we&apos;ll set it up for you.
              </p>
              <div className="mt-5 flex justify-center">
                <LiquidGlassButton onClick={onNew} size="lg" />
              </div>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {running.map((a) => {
                const version = a.versions.find((v) => v.versionNumber === a.activeVersion) ?? a.versions[0];
                const life = LIFECYCLE_STYLE[a.lifecycle];
                const pm = primaryMetric(version?.successMetrics ?? []);
                const pmTrend = pm ? computeTrend(pm) : null;
                // Drafts = versions that exist but aren't live, aren't in dry-run,
                // haven't been compiled, and haven't logged any runs.
                const draftCount = a.versions.filter(
                  (v) =>
                    v.versionNumber !== a.activeVersion &&
                    !a.dryRunVersions.includes(v.versionNumber) &&
                    v.compilation.status !== "ready" &&
                    !a.runs.some((r) => r.versionNumber === v.versionNumber)
                ).length;
                return (
                  <li key={a.id} className="rounded-xl border border-border bg-white transition-all hover:border-indigo-200 hover:shadow-md">
                    <Link
                      href={`/agent-builder?view=detail&id=${a.id}`}
                      className="group block p-4"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{a.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {isEntrataSeededAgent(a) ? (
                              <EntrataAgentBadge />
                            ) : (
                              <CustomAgentBadge pmcName={PMC_NAME} />
                            )}
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${life.className}`}>
                              {life.label}
                              {a.lifecycle === "live" && ` v${a.activeVersion}`}
                            </span>
                            {a.dryRunVersions.length > 0 && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                +{a.dryRunVersions.length} in dry-run
                              </span>
                            )}
                            {draftCount > 0 && (
                              <span className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-indigo-300 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-800">
                                <FileEdit className="h-2.5 w-2.5" />
                                {draftCount} draft{draftCount === 1 ? "" : "s"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="line-clamp-2 text-[12px] text-muted-foreground">{a.description || version?.prompt?.slice(0, 160)}</p>
                      {pm && (
                        <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/40 px-3 py-2">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="truncate text-[11px] font-medium text-indigo-900/80">{pm.label}</p>
                            {pmTrend?.label && pmTrend.improving !== null && (
                              <span
                                className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${
                                  pmTrend.improving ? "text-emerald-700" : "text-red-700"
                                }`}
                              >
                                {pmTrend.improving ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : (
                                  <TrendingDown className="h-3 w-3" />
                                )}
                                {pmTrend.label}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 font-heading text-xl leading-tight text-indigo-950">
                            {formatMetricValue(pm.currentValue, pm.unit)}
                            <span className="ml-1 text-[10px] font-normal text-indigo-700/70">
                              last {pm.windowDays}d
                            </span>
                          </p>
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                        {version?.triggers?.slice(0, 2).map((t) => {
                          const Icon = t.kind === "schedule" ? Clock : t.kind === "event" ? Zap : MessageSquare;
                          const label =
                            t.kind === "schedule"
                              ? formatScheduleTrigger(t)
                              : t.kind === "event"
                              ? EVENT_CATALOG.find((e) => e.id === t.eventId)?.label?.slice(0, 28) ?? t.eventId
                              : `${t.channel.toUpperCase()} in`;
                          return (
                            <span key={t.id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
                              <Icon className="h-3 w-3" />
                              {label}
                            </span>
                          );
                        })}
                        {(version?.triggers?.length ?? 0) > 2 && (
                          <span className="text-[10px] text-muted-foreground">+{(version!.triggers.length - 2)} more</span>
                        )}
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {version?.costEstimate ? `${formatCurrency(version.costEstimate.monthlyCost)}/mo` : ""}
                        </span>
                      </div>
                    </Link>
                    {(a.lifecycle === "live" || a.lifecycle === "paused" || a.lifecycle === "dry_run") && (
                      <div className="flex items-center border-t border-border/60 px-4 py-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void deployLive(a.id);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                        >
                          <Play className="h-3 w-3" /> Run now
                        </button>
                        <span className="ml-2 text-[10px] text-muted-foreground">
                          Deploy outside of schedule
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
