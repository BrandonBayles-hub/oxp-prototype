"use client";
import * as React from "react";
import { Sparkles, BarChart3, MessageSquareText, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface SampleItem {
  id: string;
  title: string;
  expertLabel: string;
  expertHue: string;
  Icon: React.ComponentType<{ className?: string }>;
  when: string;
}

const SAMPLE_HISTORY: SampleItem[] = [
  {
    id: "h-1",
    title: "Why is delinquency up at Tampa Bay?",
    expertLabel: "Entrata Analyst",
    expertHue: "#3b7a9e",
    Icon: BarChart3,
    when: "2h ago",
  },
  {
    id: "h-2",
    title: "Draft a Friday note to ownership about renewal pacing",
    expertLabel: "Resident Writing",
    expertHue: "#a16207",
    Icon: Mail,
    when: "Yesterday",
  },
  {
    id: "h-3",
    title: "Plan a Halloween resident event for 80 attendees",
    expertLabel: "Event Planning",
    expertHue: "#7c3aed",
    Icon: Sparkles,
    when: "2d ago",
  },
  {
    id: "h-4",
    title: "Headline ideas for a downtown loft listing",
    expertLabel: "Ad Writing",
    expertHue: "#c2410c",
    Icon: MessageSquareText,
    when: "3d ago",
  },
  {
    id: "h-5",
    title: "Where are we vs. budget on NOI?",
    expertLabel: "Entrata Analyst",
    expertHue: "#3b7a9e",
    Icon: BarChart3,
    when: "5d ago",
  },
];

export function ChatHistoryRail() {
  return (
    <aside className="rounded-lg border border-border bg-background">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Chat history</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Recent conversations across your experts
        </p>
      </div>
      <ul className="divide-y divide-border/60">
        {SAMPLE_HISTORY.map((item) => {
          const Icon = item.Icon;
          return (
            <li key={item.id}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                  "hover:bg-muted/40",
                )}
              >
                <span
                  className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                  style={{ background: `${item.expertHue}1a`, color: item.expertHue }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[13px] leading-snug text-foreground">
                    {item.title}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span style={{ color: item.expertHue }}>{item.expertLabel}</span>
                    <span>·</span>
                    <span>{item.when}</span>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-border px-4 py-2 text-center">
        <button
          type="button"
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          View all conversations
        </button>
      </div>
    </aside>
  );
}
