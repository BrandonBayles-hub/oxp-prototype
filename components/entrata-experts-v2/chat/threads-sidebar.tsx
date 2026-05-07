"use client";
import * as React from "react";
import type { Conversation } from "@/lib/entrata-experts-v2/types";
import { Plus, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LENS_BY_ID } from "@/lib/entrata-experts-v2/lenses";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/entrata-experts-v2/format";

export function ThreadsSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const groups: { label: string; items: Conversation[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Earlier", items: [] },
  ];
  const now = new Date();
  conversations.forEach((c) => {
    const d = new Date(c.updatedAt);
    const diffMs = now.getTime() - d.getTime();
    const day = 24 * 3600 * 1000;
    if (diffMs < day) groups[0].items.push(c);
    else if (diffMs < 2 * day) groups[1].items.push(c);
    else groups[2].items.push(c);
  });

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-border bg-muted/30">
      <div className="border-b border-border px-3 py-3">
        <Button onClick={onNew} variant="outline" className="w-full justify-start gap-2">
          <Plus className="h-4 w-4" />
          New conversation
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hover px-2 py-2">
        {groups.filter((g) => g.items.length > 0).map((g) => (
          <div key={g.label} className="mb-3">
            <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {g.label}
            </div>
            {g.items.map((c) => {
              const lens = LENS_BY_ID[c.lens];
              const Icon = lens?.icon ?? MessageSquare;
              return (
                <button
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  className={cn(
                    "group flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/60",
                    activeId === c.id && "bg-muted",
                  )}
                >
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: lens?.hue ?? "hsl(var(--muted-foreground))" }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] leading-tight text-foreground">{c.title}</div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">{formatRelative(c.updatedAt)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
        {conversations.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            No conversations yet. Ask anything to get started.
          </div>
        )}
      </div>

      <div className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" />
          <span>Entrata Analyst · L1 · Knowledge</span>
        </div>
      </div>
    </aside>
  );
}
