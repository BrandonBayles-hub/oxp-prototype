"use client";
import * as React from "react";
import type { Conversation, IntentCluster, Scope } from "@/lib/entrata-experts-v2/types";
import { buildClusters } from "@/lib/entrata-experts-v2/data/activity";
import { LENS_BY_ID } from "@/lib/entrata-experts-v2/lenses";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Users, MessageCircle, BookmarkPlus, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SaveAsInsightDialog,
  type InsightDraft,
} from "../chat/save-as-insight-dialog";

// Default scope for admin-promoted insights — the admin doesn't have a
// composer-side scope picker, so we save against the whole portfolio and let
// the user adjust later.
const PORTFOLIO_SCOPE: Scope = {
  kind: "portfolio",
  id: "portfolio",
  label: "Whole portfolio",
};

export function ClusterList({ activity }: { activity: Conversation[] }) {
  const clusters = React.useMemo(() => buildClusters(activity), [activity]);
  const [open, setOpen] = React.useState<string | null>(clusters[0]?.intent ?? null);
  const [promoting, setPromoting] = React.useState<IntentCluster | null>(null);
  const [justSaved, setJustSaved] = React.useState<string | null>(null);

  const draft: InsightDraft | null = React.useMemo(() => {
    if (!promoting) return null;
    return {
      prompt: promoting.exampleQuestions[0] ?? promoting.label,
      lens: promoting.topLens,
      depth: "auto",
      model: "auto",
      scope: PORTFOLIO_SCOPE,
      source: "admin",
      suggestedName: promoting.label,
    };
  }, [promoting]);

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        {clusters.length} intent clusters across {activity.length} conversations.
        Sorted by volume.
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
        {clusters.map((c) => {
          const lens = LENS_BY_ID[c.topLens];
          const LIcon = lens?.icon;
          const isOpen = open === c.intent;
          return (
            <div key={c.intent}>
              <button
                onClick={() => setOpen(isOpen ? null : c.intent)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                  isOpen && "bg-muted/40",
                )}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: `${lens?.hue ?? "#525252"}1a`, color: lens?.hue ?? "#525252" }}
                >
                  {LIcon && <LIcon className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground">{c.label}</div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">{c.description}</div>
                </div>
                <div className="hidden shrink-0 items-center gap-3 text-xs text-muted-foreground sm:flex">
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    {c.count}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {c.distinctAskers}
                  </span>
                  <Badge
                    variant={c.deflectionPct >= 90 ? "green" : c.deflectionPct >= 70 ? "secondary" : "yellow"}
                    className="text-[10px]"
                  >
                    {c.deflectionPct.toFixed(0)}% deflected
                  </Badge>
                  <AutomationScore score={c.automationScore} />
                </div>
                <ChevronRight className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
              </button>

              {isOpen && (
                // Inline detail panel — renders the cluster's example questions
                // and the graduation CTAs.
                <div className="border-t border-border/40 bg-muted/20 px-4 pb-4 pt-1">
                  <div className="mb-1.5 mt-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Example questions
                  </div>
                  <ul className="space-y-1">
                    {c.exampleQuestions.map((q) => (
                      <li
                        key={q}
                        className="rounded-md border border-border bg-card px-3 py-1.5 text-[13px] text-foreground"
                      >
                        &ldquo;{q}&rdquo;
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        setPromoting(c);
                        setJustSaved(null);
                      }}
                    >
                      <BookmarkPlus className="h-3.5 w-3.5" />
                      Promote to a Saved Insight
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      Open in chat
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                    {justSaved === c.intent && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                        <Check className="h-3 w-3" />
                        Saved
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <SaveAsInsightDialog
        open={!!promoting}
        draft={draft}
        onClose={() => setPromoting(null)}
        onSaved={() => {
          setJustSaved(promoting?.intent ?? null);
          setPromoting(null);
        }}
      />
    </div>
  );
}

function AutomationScore({ score }: { score: number }) {
  const variant: "green" | "secondary" | "gray" =
    score >= 80 ? "green" : score >= 60 ? "secondary" : "gray";
  return (
    <Badge variant={variant} className="text-[10px]">
      Auto-score {score}
    </Badge>
  );
}
