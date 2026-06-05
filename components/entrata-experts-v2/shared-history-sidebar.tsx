"use client";
import * as React from "react";
import { Plus, Sparkles, BarChart3, FileBarChart, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/entrata-experts-v2/format";
import type { HistoryThread } from "@/lib/entrata-experts-v2/history-store";
import { ASSISTANT_BY_ID } from "@/lib/entrata-experts-v2/assistants";
import { REPORT_BY_ID } from "@/lib/entrata-experts-v2/reports";
import { LENS_BY_ID } from "@/lib/entrata-experts-v2/lenses";

// =============================================================================
// SharedHistorySidebar — one history list for the whole Experts workspace.
// -----------------------------------------------------------------------------
// Renders the union of every conversation across Entrata Analyst, the
// Assistants, and the Report Analyzer. Each row is tagged with the expert that
// produced it (icon + hue + label) so the shared list still reads at a glance.
// Clicking a row reopens that thread on its source surface.
// =============================================================================

const REPORT_HUE = "#4338ca";

interface RowMeta {
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  hue: string;
  label: string;
}

function describe(thread: HistoryThread): RowMeta {
  const s = thread.source;
  if (s.kind === "analyst") {
    const lens = LENS_BY_ID[thread.lens ?? "portfolio"];
    return {
      Icon: lens?.icon ?? BarChart3,
      hue: lens?.hue ?? "#3b7a9e",
      label: "Entrata Analyst",
    };
  }
  if (s.kind === "assistant") {
    const a = ASSISTANT_BY_ID[s.id];
    return {
      Icon: a?.icon ?? Sparkles,
      hue: a?.hue ?? "#7c3aed",
      label: a?.shortName ?? "Assistant",
    };
  }
  const r = REPORT_BY_ID[s.id];
  return {
    Icon: r?.icon ?? FileBarChart,
    hue: REPORT_HUE,
    label: r ? `Report · ${r.name}` : "Report Analyzer",
  };
}

function groupByRecency(threads: HistoryThread[]) {
  const groups: { label: string; items: HistoryThread[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Earlier", items: [] },
  ];
  const now = Date.now();
  const day = 24 * 3600 * 1000;
  // Newest-updated first within each bucket.
  [...threads]
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .forEach((t) => {
      const diff = now - new Date(t.updatedAt).getTime();
      if (diff < day) groups[0].items.push(t);
      else if (diff < 2 * day) groups[1].items.push(t);
      else groups[2].items.push(t);
    });
  return groups.filter((g) => g.items.length > 0);
}

export function SharedHistorySidebar({
  threads,
  activeId,
  onOpen,
  onNew,
}: {
  threads: HistoryThread[];
  activeId: string | null;
  onOpen: (thread: HistoryThread) => void;
  onNew: () => void;
}) {
  const groups = groupByRecency(threads);

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-border bg-muted/30">
      <div className="border-b border-border px-3 py-3">
        <Button onClick={onNew} variant="outline" className="w-full justify-start gap-2">
          <Plus className="h-4 w-4" />
          New conversation
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hover px-2 py-2">
        {groups.map((g) => (
          <div key={g.label} className="mb-3">
            <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {g.label}
            </div>
            {g.items.map((t) => {
              const { Icon, hue, label } = describe(t);
              return (
                <button
                  key={t.id}
                  onClick={() => onOpen(t)}
                  className={cn(
                    "group flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/60",
                    activeId === t.id && "bg-muted",
                  )}
                >
                  <span
                    className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
                    style={{ background: `${hue}1a`, color: hue }}
                  >
                    <Icon className="h-3 w-3" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] leading-tight text-foreground">
                      {t.title}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="truncate" style={{ color: hue }}>
                        {label}
                      </span>
                      <span>·</span>
                      <span className="shrink-0">{formatRelative(t.updatedAt)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
        {threads.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            No conversations yet. Ask anything to get started.
          </div>
        )}
      </div>

      <div className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="h-3 w-3" />
          <span>Shared history · all experts</span>
        </div>
      </div>
    </aside>
  );
}
