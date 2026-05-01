"use client";

import { useState } from "react";
import { ArrowRight, ChevronDown, Send, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PROMPTS = [
  "Show me my move-out flow",
  "What's a setup template?",
  "Schedule a call",
];

export function FloatingAria() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div
          role="dialog"
          aria-label="Aria setup assistant"
          className="w-80 origin-bottom-right rounded-xl border border-border bg-white shadow-xl"
        >
          <div className="flex items-center gap-3 rounded-t-xl border-b border-border bg-gradient-to-br from-violet-50 to-white px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white shadow-sm">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Aria</p>
              <p className="text-xs text-muted-foreground">
                Your setup assistant
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close Aria"
            >
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Ask anything. If I can&apos;t answer, I&apos;ll book time with the
              right Entrata team — you don&apos;t need to know who.
            </p>

            <div className="mt-3 space-y-2">
              {PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-white px-3 py-2 text-left text-xs text-foreground transition-colors hover:border-violet-500/40 hover:bg-violet-50/40"
                >
                  <span>{q}</span>
                  <ArrowRight
                    className="h-3 w-3 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border px-3 py-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2">
              <label htmlFor="aria-prompt" className="sr-only">
                Ask Aria
              </label>
              <input
                id="aria-prompt"
                type="text"
                placeholder="Ask Aria anything…"
                className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              />
              <Button
                size="sm"
                className="h-7 bg-violet-600 px-2 hover:bg-violet-700"
                aria-label="Send message"
              >
                <Send className="h-3 w-3" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600/40",
          open && "ring-2 ring-violet-600/40",
        )}
        aria-expanded={open}
        aria-pressed={open}
        aria-label="Toggle Aria assistant"
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        <span>Aria</span>
        <span className="text-xs font-medium opacity-80">setup assistant</span>
      </button>
    </div>
  );
}
