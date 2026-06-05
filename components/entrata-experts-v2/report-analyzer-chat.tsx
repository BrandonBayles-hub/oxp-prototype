"use client";

import * as React from "react";
import { ArrowUp, Sparkles, FileBarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackBar } from "./back-bar";
import {
  REPORT_BY_ID,
  REPORT_CATEGORY_BY_ID,
  startersFor,
} from "@/lib/entrata-experts-v2/reports";
import { useAssistantChatStore } from "@/lib/entrata-experts-v2/assistant-chat-store";
import { cn } from "@/lib/utils";

// =============================================================================
// Report Analyzer chat
// -----------------------------------------------------------------------------
// Opened when a user picks a report from the Report Analyzer module. The view
// keeps the same visual rhythm as AssistantChat (so the back-bar / composer
// pattern is consistent) but inverts the framing — the *report* is the
// subject, and the assistant is implicit. Threads are persisted per-report
// using a "rpt-" prefix on the assistant-chat store key.
// =============================================================================

const ACCENT = "#4338ca";
const HEADING_FONT =
  "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif";

interface ReportAnalyzerChatProps {
  reportId: string;
  onBack: () => void;
  hideBack?: boolean;
  hideNew?: boolean;
}

export function ReportAnalyzerChat({
  reportId,
  onBack,
  hideBack = false,
  hideNew = false,
}: ReportAnalyzerChatProps) {
  const report = REPORT_BY_ID[reportId];
  // Threads keyed per-report so each report has its own conversation history.
  const store = useAssistantChatStore(`rpt-${reportId}`);
  const activeThread = store.threads.find((t) => t.id === store.activeId) ?? null;
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeThread?.messages.length, store.isThinking]);

  if (!report) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center rounded-lg border border-border bg-background text-sm text-muted-foreground">
        <p>Unknown report.</p>
        <Button variant="outline" className="mt-3" onClick={onBack}>
          Back
        </Button>
      </div>
    );
  }

  const cat = REPORT_CATEGORY_BY_ID[report.category];
  const Icon = report.icon;

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[600px] overflow-hidden rounded-lg border border-border bg-background shadow-sm">
      <main className="flex min-w-0 flex-1 flex-col">
        <BackBar
          title={
            <span className="inline-flex items-center gap-2">
              <span
                className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                style={{ fontFamily: HEADING_FONT }}
              >
                Report Analyzer
              </span>
              <span className="text-muted-foreground/50">/</span>
              <span className="text-foreground">{report.name}</span>
              <span className="hidden font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70 sm:inline">
                {report.code}
              </span>
            </span>
          }
          subtitle={
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: cat.hue }}
              />
              <span>{cat.label}</span>
              <span>·</span>
              <span>Last run {report.lastRun}</span>
            </span>
          }
          onBack={onBack}
          hideBack={hideBack}
          hideNew={hideNew}
          onNew={store.newThread}
          newLabel="Start a new analysis"
        />

        {!activeThread ? (
          <EmptyState
            reportName={report.name}
            description={report.description}
            Icon={Icon}
            starters={startersFor(report.id)}
            isThinking={store.isThinking}
            onSend={store.send}
          />
        ) : (
          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hover">
            <div className="mx-auto max-w-[760px] space-y-4 px-6 py-6">
              {/* Thin context card at the top of every conversation so the
                  user always remembers which report this chat is grounded in. */}
              <ContextCard
                reportName={report.name}
                code={report.code}
                categoryLabel={cat.label}
                categoryHue={cat.hue}
              />
              {activeThread.messages.map((m) => (
                <Bubble key={m.id} role={m.role} text={m.body} />
              ))}
              {store.isThinking && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span
                    className="inline-flex h-2 w-2 animate-pulse rounded-full"
                    style={{ background: ACCENT }}
                  />
                  <span>Analyzing {report.name}…</span>
                </div>
              )}
            </div>
          </div>
        )}

        <Composer
          onSend={store.send}
          isThinking={store.isThinking}
          placeholder={`Ask anything about ${report.name}…`}
        />
      </main>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Empty state — large hero with report context + starter chips
// -----------------------------------------------------------------------------

function EmptyState({
  reportName,
  description,
  Icon,
  starters,
  isThinking,
  onSend,
}: {
  reportName: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
  starters: string[];
  isThinking: boolean;
  onSend: (text: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-12 text-center">
      {/* Stacked icon to communicate "report + analyzer" — file icon with an
          indigo sparkle stamp. Matches the module's signature accent. */}
      <div className="relative">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: `${ACCENT}1f`, color: ACCENT }}
        >
          <Icon className="h-6 w-6" />
        </div>
        <span
          className="absolute -bottom-0.5 -right-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-background"
          style={{ background: ACCENT, color: "white" }}
        >
          <Sparkles className="h-2.5 w-2.5" />
        </span>
      </div>

      <div className="max-w-md space-y-1.5">
        <div
          className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: ACCENT, fontFamily: HEADING_FONT }}
        >
          Analyzing
        </div>
        <h2
          className="text-2xl font-semibold tracking-tight text-foreground"
          style={{ fontFamily: HEADING_FONT }}
        >
          {reportName}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="flex w-full max-w-[640px] flex-wrap justify-center gap-2">
        {starters.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => !isThinking && onSend(s)}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// In-thread context card — anchors every conversation to the source report.
// -----------------------------------------------------------------------------

function ContextCard({
  reportName,
  code,
  categoryLabel,
  categoryHue,
}: {
  reportName: string;
  code: string;
  categoryLabel: string;
  categoryHue: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-indigo-200/60 bg-indigo-50/40 px-3 py-2">
      <FileBarChart className="h-3.5 w-3.5" style={{ color: ACCENT }} />
      <span className="text-[12px] text-foreground">
        Grounded in <span className="font-medium">{reportName}</span>
      </span>
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
        {code}
      </span>
      <span className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: categoryHue }}
        />
        {categoryLabel}
      </span>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Bubble + Composer + ThreadRail — mirrors AssistantChat for visual consistency
// -----------------------------------------------------------------------------

function Bubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-muted px-4 py-2.5 text-[15px] leading-relaxed text-foreground">
          {text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl border border-border bg-background px-4 py-2.5 text-[15px] leading-relaxed text-foreground">
        {renderInlineBold(text)}
      </div>
    </div>
  );
}

function renderInlineBold(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(<React.Fragment key={key++}>{text.slice(last, m.index)}</React.Fragment>);
    }
    parts.push(
      <strong key={key++} className="font-semibold text-foreground">
        {m[1]}
      </strong>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    parts.push(<React.Fragment key={key++}>{text.slice(last)}</React.Fragment>);
  }
  return parts;
}

function Composer({
  onSend,
  isThinking,
  placeholder,
}: {
  onSend: (text: string) => void;
  isThinking: boolean;
  placeholder: string;
}) {
  const [value, setValue] = React.useState("");
  const ref = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "0px";
    ref.current.style.height = Math.min(ref.current.scrollHeight, 220) + "px";
  }, [value]);

  function send() {
    const t = value.trim();
    if (!t || isThinking) return;
    onSend(t);
    setValue("");
  }

  return (
    <div className="border-t border-border bg-background">
      <div className="mx-auto max-w-[760px] px-6 py-3">
        <div className="rounded-xl border border-border bg-background shadow-sm transition-colors focus-within:border-indigo-400/60">
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder={placeholder}
            className={cn(
              "w-full resize-none bg-transparent px-4 pb-1 pt-3 text-[15px] leading-relaxed text-foreground",
              "placeholder:text-muted-foreground focus:outline-none",
            )}
          />
          <div className="flex items-center gap-1.5 px-3 py-2">
            <span className="text-[11px] text-muted-foreground">
              Prototype reply — no live model
            </span>
            <div className="flex-1" />
            <Button
              size="icon"
              className="h-7 w-7"
              onClick={send}
              disabled={!value.trim() || isThinking}
              title="Send"
              style={{ background: ACCENT }}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

