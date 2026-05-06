"use client";
import * as React from "react";
import type { Conversation, KnowledgeGap } from "@/lib/entrata-experts-v2/types";
import { buildGaps } from "@/lib/entrata-experts-v2/data/activity";
import { ROLE_BY_ID } from "@/lib/entrata-experts-v2/lenses";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldX,
  AlertTriangle,
  ThumbsDown,
  MessageCircle,
  ChevronRight,
  BookOpen,
  Wrench,
} from "lucide-react";

const REASON_META: Record<KnowledgeGap["reason"], { icon: React.ComponentType<{ className?: string }>; label: string; variant: "destructive" | "yellow" | "secondary" }> = {
  refused: {
    icon: ShieldX,
    label: "Out of scope",
    variant: "destructive",
  },
  "low-confidence": {
    icon: AlertTriangle,
    label: "Low confidence",
    variant: "yellow",
  },
  "thumbs-down": {
    icon: ThumbsDown,
    label: "Thumbs down",
    variant: "yellow",
  },
  escalated: {
    icon: MessageCircle,
    label: "Escalated",
    variant: "yellow",
  },
};

export function GapList({ activity }: { activity: Conversation[] }) {
  const gaps = React.useMemo(() => buildGaps(activity), [activity]);

  if (gaps.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
        <div className="text-sm">No gaps in the last 14 days.</div>
        <div className="mt-1 text-xs">Every question got an answer above threshold.</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Questions where Entrata Analyst refused, returned low-confidence, was thumbs-downed, or got escalated to a human.
        Each row is one to fix.
      </div>

      <div className="space-y-3">
        {gaps.map((g) => {
          const meta = REASON_META[g.reason];
          const Icon = meta.icon;
          return (
            <div key={g.id} className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="flex items-start gap-3 border-b border-border/60 px-4 py-3">
                <div className="mt-1 shrink-0">
                  <Badge variant={meta.variant} className="gap-1 text-[10px]">
                    <Icon className="h-3 w-3" />
                    {meta.label}
                  </Badge>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm leading-snug text-foreground">&ldquo;{g.question}&rdquo;</div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    <span><span className="font-medium text-foreground">Asked {g.count}×</span></span>
                    <span>
                      by {g.exampleAskers.slice(0, 2).join(", ")}
                      {g.count > g.exampleAskers.length ? ` + ${g.count - g.exampleAskers.length} more` : ""}
                    </span>
                    <span>
                      · Roles: {g.affectedRoles.map((r) => ROLE_BY_ID[r]?.label).filter(Boolean).join(", ")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-muted/30 px-4 py-3">
                <div className="mt-0.5 shrink-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-foreground">
                    <Wrench className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Suggested fix
                  </div>
                  <div className="mt-0.5 text-[13px] leading-relaxed text-foreground">{g.suggestedFix}</div>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <Button size="sm" className="h-7 gap-1 px-2 text-xs">
                    <BookOpen className="h-3 w-3" />
                    Add SOP
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
                    Send to Studio
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
