"use client";

import * as React from "react";
import { useVault, COMPLIANCE_ITEMS } from "@/lib/vault-context";
import { useAgents } from "@/lib/agents-context";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  BookOpen,
  RefreshCw,
  ChevronRight,
  Cpu,
} from "lucide-react";

export function TrainingsSopInsights() {
  const { documents, activityLog, complianceSubjectDocumentIds } = useVault();
  const { agents } = useAgents();

  const files = React.useMemo(
    () => documents.filter((d) => d.type === "file" && !d.isTemplate),
    [documents]
  );

  const stats = React.useMemo(() => {
    const approved = files.filter((f) => f.approvalStatus === "approved").length;
    const pendingReview = files.filter(
      (f) => f.approvalStatus === "review" || f.approvalStatus === "needs_review"
    ).length;

    const complianceLinked = COMPLIANCE_ITEMS.filter(
      (s) => (complianceSubjectDocumentIds[s]?.length ?? 0) > 0
    ).length;

    const agentsWithTraining = agents.filter((a) =>
      files.some((f) => (f.linkedAgentIds ?? []).includes(a.id))
    ).length;

    const outOfDateCount = files.reduce((acc, f) => {
      const ood = (f.trainingRecords ?? []).filter((r) => r.status === "out_of_date").length;
      return acc + ood;
    }, 0);

    const overdue = files.filter((f) => {
      if (!f.nextReviewDate) return false;
      return new Date(f.nextReviewDate) < new Date();
    }).length;

    return {
      totalDocs: files.length,
      approved,
      pendingReview,
      complianceLinked,
      complianceTotal: COMPLIANCE_ITEMS.length,
      agentsWithTraining,
      totalAgents: agents.length,
      outOfDateCount,
      overdue,
    };
  }, [files, complianceSubjectDocumentIds, agents]);

  const byType = React.useMemo(() => {
    const map: Record<string, number> = {};
    files.forEach((f) => {
      map[f.documentType] = (map[f.documentType] ?? 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [files]);

  const byScope = React.useMemo(() => {
    const map: Record<string, number> = {};
    files.forEach((f) => {
      const scope = f.scopeLevel ?? "company";
      map[scope] = (map[scope] ?? 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [files]);

  const recentActivity = React.useMemo(
    () => activityLog.slice(0, 10),
    [activityLog]
  );

  const [tab, setTab] = React.useState<"health" | "compliance" | "training" | "activity">("health");

  return (
    <div className="space-y-5">
      {/* Health strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<FileText className="h-3.5 w-3.5" />}
          label="Total documents"
          value={stats.totalDocs.toString()}
          delta={`${stats.approved} approved · ${stats.pendingReview} pending review`}
        />
        <StatCard
          icon={<ShieldCheck className="h-3.5 w-3.5" />}
          label="Compliance coverage"
          value={`${stats.complianceLinked} / ${stats.complianceTotal}`}
          delta={
            stats.complianceLinked === stats.complianceTotal
              ? "All areas linked"
              : `${stats.complianceTotal - stats.complianceLinked} area(s) need SOPs`
          }
          tone={stats.complianceLinked === stats.complianceTotal ? "good" : "warn"}
        />
        <StatCard
          icon={<Cpu className="h-3.5 w-3.5" />}
          label="Agents trained"
          value={`${stats.agentsWithTraining} / ${stats.totalAgents}`}
          delta={
            stats.outOfDateCount > 0
              ? `${stats.outOfDateCount} out-of-date binding(s)`
              : "All bindings current"
          }
          tone={stats.outOfDateCount > 0 ? "warn" : "good"}
        />
        <StatCard
          icon={<Clock className="h-3.5 w-3.5" />}
          label="Pending review"
          value={stats.pendingReview.toString()}
          delta={
            stats.overdue > 0
              ? `${stats.overdue} past review date`
              : "None overdue"
          }
          tone={stats.pendingReview > 0 ? "warn" : "good"}
        />
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-0.5">
        {(
          [
            { id: "health", label: "Document health" },
            { id: "compliance", label: "Compliance coverage" },
            { id: "training", label: "Agent training" },
            { id: "activity", label: "Activity log" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "health" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Document inventory by type, scope, and approval status.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* By type */}
            <div className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                By document type
              </div>
              <div className="divide-y divide-border/60">
                {byType.map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm capitalize text-foreground">{type}</span>
                    <span className="text-sm font-medium tabular-nums text-foreground">{count}</span>
                  </div>
                ))}
                {byType.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">No documents yet</div>
                )}
              </div>
            </div>

            {/* By scope */}
            <div className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                By scope level
              </div>
              <div className="divide-y divide-border/60">
                {byScope.map(([scope, count]) => (
                  <div key={scope} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm capitalize text-foreground">{scope}</span>
                    <span className="text-sm font-medium tabular-nums text-foreground">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Documents needing attention */}
          {stats.pendingReview > 0 && (
            <div className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Documents needing attention
              </div>
              <div className="divide-y divide-border/60">
                {files
                  .filter(
                    (f) =>
                      f.approvalStatus === "review" ||
                      f.approvalStatus === "needs_review"
                  )
                  .map((f) => (
                    <div key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-foreground">{f.fileName}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {f.property} · {f.documentType} · Owner: {f.owner}
                        </div>
                      </div>
                      <Badge variant="yellow" className="text-[10px]">
                        {f.approvalStatus === "needs_review" ? "Needs review" : "Pending review"}
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "compliance" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Compliance area coverage — each area should have at least one approved SOP linked.
          </p>
          <div className="rounded-lg border border-border bg-card">
            <div className="divide-y divide-border/60">
              {COMPLIANCE_ITEMS.map((subject) => {
                const docIds = complianceSubjectDocumentIds[subject] ?? [];
                const linkedDocs = docIds
                  .map((id) => files.find((f) => f.id === id))
                  .filter(Boolean);
                const hasApproved = linkedDocs.some(
                  (d) => d!.approvalStatus === "approved"
                );
                return (
                  <div key={subject} className="flex items-center gap-3 px-4 py-3">
                    {linkedDocs.length > 0 ? (
                      hasApproved ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                      )
                    ) : (
                      <div className="h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-foreground">{subject}</div>
                      {linkedDocs.length > 0 ? (
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {linkedDocs.map((d) => d!.fileName).join(", ")}
                        </div>
                      ) : (
                        <div className="mt-0.5 text-[11px] text-muted-foreground/60">
                          No SOP linked
                        </div>
                      )}
                    </div>
                    <Badge
                      variant={linkedDocs.length > 0 ? (hasApproved ? "green" : "yellow") : "secondary"}
                      className="text-[10px]"
                    >
                      {linkedDocs.length > 0
                        ? hasApproved
                          ? "Covered"
                          : "Pending approval"
                        : "Gap"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === "training" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Which agents are linked to which SOPs, and whether their training is current.
          </p>
          {files.every((f) => !(f.linkedAgentIds?.length)) ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
              <div className="text-sm">No agent-SOP bindings yet.</div>
              <div className="mt-1 text-xs">
                Link agents to SOPs in Agent Roster or the SOP detail page.
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card">
              <div className="divide-y divide-border/60">
                {agents
                  .filter((a) =>
                    a.type === "fully_autonomous" ||
                    a.type === "autonomous" ||
                    a.type === "efficiency"
                  )
                  .map((agent) => {
                    const linkedFiles = files.filter((f) =>
                      (f.linkedAgentIds ?? []).includes(agent.id)
                    );
                    if (linkedFiles.length === 0) return null;

                    return (
                      <div key={agent.id} className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">
                            {agent.name}
                          </span>
                          <Badge variant="secondary" className="text-[10px]">
                            {agent.type.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <div className="mt-2 space-y-1 pl-5">
                          {linkedFiles.map((f) => {
                            const record = (f.trainingRecords ?? []).find(
                              (r) => r.agentId === agent.id
                            );
                            const status = record?.status ?? "pending";
                            return (
                              <div
                                key={f.id}
                                className="flex items-center gap-2 text-[13px]"
                              >
                                {status === "trained" && (
                                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                )}
                                {status === "out_of_date" && (
                                  <RefreshCw className="h-3 w-3 text-amber-500" />
                                )}
                                {status === "pending" && (
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                )}
                                <span className="text-foreground">{f.fileName}</span>
                                <Badge
                                  variant={
                                    status === "trained"
                                      ? "green"
                                      : status === "out_of_date"
                                      ? "yellow"
                                      : "secondary"
                                  }
                                  className="text-[10px]"
                                >
                                  {status === "trained"
                                    ? `Trained (v${record?.trainedOnVersion ?? "?"})`
                                    : status === "out_of_date"
                                    ? "Out of date"
                                    : "Pending"}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                  .filter(Boolean)}
                {agents.filter((a) =>
                    (a.type === "fully_autonomous" ||
                    a.type === "autonomous" ||
                    a.type === "efficiency") &&
                    files.some((f) => (f.linkedAgentIds ?? []).includes(a.id))
                  ).length === 0 && (
                  <div className="px-4 py-4 text-center text-sm text-muted-foreground">
                    Link agents to SOPs to see training status here.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "activity" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Recent actions across the SOP library — uploads, approvals, edits, and agent training events.
          </p>
          {recentActivity.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
              <div className="text-sm">No activity recorded yet.</div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card">
              <div className="divide-y divide-border/60">
                {recentActivity.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 px-4 py-2.5">
                    <div className="mt-0.5 shrink-0">
                      <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] text-foreground">
                        <span className="font-medium">{entry.action}</span>
                        {entry.documentName && (
                          <> — {entry.documentName}</>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                        {entry.by && <span>{entry.by}</span>}
                        <span>·</span>
                        <span>{new Date(entry.at).toLocaleDateString()}</span>
                        {entry.detail && (
                          <>
                            <span>·</span>
                            <span>{entry.detail}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  delta,
  tone,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  delta?: string;
  tone?: "good" | "warn";
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div
        className={cn(
          "mt-1 text-2xl font-semibold leading-tight",
          tone === "good"
            ? "text-emerald-700"
            : tone === "warn"
            ? "text-amber-700"
            : "text-foreground"
        )}
        style={{
          fontFamily: "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {value}
      </div>
      {delta && <div className="mt-0.5 text-xs text-muted-foreground">{delta}</div>}
    </div>
  );
}
