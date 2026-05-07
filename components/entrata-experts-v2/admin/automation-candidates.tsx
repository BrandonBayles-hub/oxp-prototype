"use client";
import * as React from "react";
import type { Conversation, AutomationCandidate } from "@/lib/entrata-experts-v2/types";
import { buildClusters, buildAutomationCandidates } from "@/lib/entrata-experts-v2/data/activity";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Bookmark, Workflow, ArrowUpRight, Users, MessageCircle, Clock } from "lucide-react";

const KIND_META: Record<AutomationCandidate["graduateTo"], { icon: React.ComponentType<{ className?: string }>; label: string; description: string; variant: "secondary" | "green" | "yellow" }> = {
  "scheduled-digest": {
    icon: Calendar,
    label: "Scheduled digest",
    description: "Promote to an automatic Monday-morning narrative — no one has to ask.",
    variant: "secondary",
  },
  "saved-insight": {
    icon: Bookmark,
    label: "Saved insight",
    description: "One-click rerun on demand. Caches the answer + artifact for the team.",
    variant: "green",
  },
  "l3-agent": {
    icon: Workflow,
    label: "L3 agent draft",
    description: "Send to OXP Studio as a structured agent that takes action, not just answers.",
    variant: "yellow",
  },
};

export function AutomationCandidates({ activity }: { activity: Conversation[] }) {
  const clusters = React.useMemo(() => buildClusters(activity), [activity]);
  const candidates = React.useMemo(
    () => buildAutomationCandidates(activity, clusters),
    [activity, clusters],
  );

  if (candidates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
        <div className="text-sm">No automation candidates yet.</div>
        <div className="mt-1 text-xs">Patterns will surface once you&apos;ve crossed ~10 questions on a single intent.</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Recurring questions that should graduate from &ldquo;ask the GPT&rdquo; to a
        saved insight, a scheduled digest, or an L3 agent. Each one is a
        candidate for OXP Studio.
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {candidates.map((c) => {
          const meta = KIND_META[c.graduateTo];
          const Icon = meta.icon;
          return (
            <div key={c.id} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <Badge variant={meta.variant} className="gap-1 text-[10px]">
                  <Icon className="h-3 w-3" />
                  {meta.label}
                </Badge>
                <span className="text-[11px] text-muted-foreground">{meta.description}</span>
              </div>

              <div>
                <div
                  className="text-base font-semibold leading-tight text-foreground"
                  style={{
                    fontFamily:
                      "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif",
                  }}
                >
                  {c.pattern}
                </div>
                <div className="mt-1 text-[12px] italic text-muted-foreground">&ldquo;{c.example}&rdquo;</div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <Stat icon={<MessageCircle className="h-3 w-3" />} value={c.count.toString()} label="asks (14d)" />
                <Stat icon={<Users className="h-3 w-3" />} value={c.distinctAskers.toString()} label="askers" />
                <Stat icon={<Clock className="h-3 w-3" />} value={`${c.estTimeSavedHrs}h`} label="est. saved/wk" />
              </div>

              <div className="mt-auto flex items-center gap-2 pt-1">
                <Button size="sm" className="gap-1.5">
                  {c.graduateLabel}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm">Snooze</Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-2 py-1.5">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-base font-semibold leading-tight tabular-nums text-foreground">{value}</div>
    </div>
  );
}
