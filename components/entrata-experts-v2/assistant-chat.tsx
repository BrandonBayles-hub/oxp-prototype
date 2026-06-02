"use client";
import * as React from "react";
import { BackBar } from "./back-bar";
import { MessageInput } from "./chat/message-input";
import { SuggestedStarters } from "./chat/suggested-starters";
import { ASSISTANT_BY_ID } from "@/lib/entrata-experts-v2/assistants";
import { useAssistantChatStore, type AssistantThread } from "@/lib/entrata-experts-v2/assistant-chat-store";
import { Button } from "@/components/ui/button";
import { PROPERTIES } from "@/lib/entrata-experts-v2/data/portfolio";
import type { Scope } from "@/lib/entrata-experts-v2/types";
import { Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/entrata-experts-v2/format";
import { TooltipProvider } from "@/components/ui/tooltip";

// ---------------------------------------------------------------------------
// AssistantChat — visual sibling of AnalystChat / ChatView.
//
// Reuses the same empty-state hero (badge → title → subtitle → composer →
// starter prompts), the same MessageInput component, and the same active-
// conversation layout. Differences vs Analyst that are intentional:
//   - No Lens picker. Lenses route Analyst queries to a specific ontology;
//     fixed-purpose assistants don't route.
//   - Scope picker is decorative for v1 — the assistant reply is a stub,
//     scope isn't consumed in the response. Kept for visual consistency and
//     so the affordance is in place when the engine learns to use it.
//   - Message bubbles are simple text (no citations, no artifacts) because
//     assistants are generative, not data-connected.
// ---------------------------------------------------------------------------

const DEFAULT_SCOPE: Scope = {
  kind: "portfolio",
  id: "portfolio",
  label: "Whole portfolio",
  propertyIds: PROPERTIES.map((p) => p.id),
};

export function AssistantChat({
  assistantId,
  onBack,
  hideBack = false,
  hideNew = false,
}: {
  assistantId: string;
  onBack: () => void;
  hideBack?: boolean;
  hideNew?: boolean;
}) {
  const def = ASSISTANT_BY_ID[assistantId];
  const store = useAssistantChatStore(assistantId);
  const [scope, setScope] = React.useState<Scope>(DEFAULT_SCOPE);
  const activeThread = store.threads.find((t) => t.id === store.activeId) ?? null;
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeThread?.messages.length, store.isThinking]);

  if (!def) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center rounded-lg border border-border bg-background text-sm text-muted-foreground">
        <p>Unknown assistant.</p>
        <Button variant="outline" className="mt-3" onClick={onBack}>
          Back
        </Button>
      </div>
    );
  }

  const Icon = def.icon;

  return (
    <TooltipProvider delayDuration={120}>
      <div className="flex h-[calc(100vh-12rem)] min-h-[600px] flex-col overflow-hidden rounded-lg border border-border bg-background shadow-sm">
        <BackBar
          title={def.name}
          subtitle={def.description}
          onBack={onBack}
          hideBack={hideBack}
          hideNew={hideNew}
          onNew={store.newThread}
          newLabel="Start a new conversation"
        />

        <div className="flex min-h-0 flex-1 overflow-hidden bg-background">
          <AssistantThreadsSidebar
            threads={store.threads}
            activeId={store.activeId}
            onSelect={store.selectThread}
            onNew={store.newThread}
            assistantName={def.shortName}
            assistantHue={def.hue}
            AssistantIcon={Icon}
          />

          <main className="flex min-w-0 flex-1 flex-col">
            {!activeThread ? (
              <EmptyState
                def={def}
                isThinking={store.isThinking}
                scope={scope}
                onChangeScope={setScope}
                onSend={store.send}
              />
            ) : (
              <>
                <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hover">
                  <div className="mx-auto max-w-[820px] space-y-6 px-6 py-8">
                    {activeThread.messages.map((m) => (
                      <Bubble key={m.id} role={m.role} text={m.body} />
                    ))}
                    {store.isThinking && (
                      <ComposingIndicator
                        name={def.shortName}
                        hue={def.hue}
                      />
                    )}
                  </div>
                </div>
                <div className="border-t border-border bg-background">
                  <div className="mx-auto max-w-[820px] px-6 py-3">
                    <MessageInput
                      scope={scope}
                      onChangeScope={setScope}
                      onSend={store.send}
                      isThinking={store.isThinking}
                      placeholder={`Chat with ${def.name}…`}
                    />
                    <div className="mt-2 text-center text-[11px] text-muted-foreground">
                      Prototype reply — no live model
                    </div>
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Empty state — mirrors ChatView's EmptyState structure.
// ---------------------------------------------------------------------------

function EmptyState({
  def,
  isThinking,
  scope,
  onChangeScope,
  onSend,
}: {
  def: { name: string; blurb: string; hue: string; image: string; exampleStarters: string[] };
  isThinking: boolean;
  scope: Scope;
  onChangeScope: (s: Scope) => void;
  onSend: (text: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-[680px] space-y-7">
        <div className="flex flex-col items-center space-y-3 text-center">
          {/* Production expert badge — carries its own gradient bg + shadow. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={def.image} alt={def.name} className="h-14 w-14" />
          <div className="space-y-1.5">
            <h1
              className="text-3xl font-semibold tracking-tight text-foreground"
              style={{
                fontFamily:
                  "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif",
              }}
            >
              {def.name}
            </h1>
            <p className="text-[15px] text-muted-foreground">{def.blurb}</p>
          </div>
        </div>

        <MessageInput
          scope={scope}
          onChangeScope={onChangeScope}
          onSend={onSend}
          isThinking={isThinking}
          placeholder={`Chat with ${def.name}…`}
          autoFocus
        />

        <SuggestedStarters
          title={`Try a starting prompt · ${def.name}`}
          prompts={def.exampleStarters}
          onPick={(p) => !isThinking && onSend(p)}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composing indicator — Assistant-themed (vs Analyst's lens-themed ThinkingBubble).
// ---------------------------------------------------------------------------

function ComposingIndicator({ name, hue }: { name: string; hue: string }) {
  return (
    <div className="flex items-center gap-3 py-2 text-sm text-muted-foreground">
      <span
        className="inline-block h-2 w-2 animate-pulse rounded-full"
        style={{ background: hue }}
      />
      <span className="font-medium text-foreground">{name}</span>
      <span className="text-border">·</span>
      <span className="font-mono text-[12px]">Composing…</span>
      <span className="ml-1 inline-flex gap-1">
        <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-muted-foreground" style={{ animationDelay: "0ms" }} />
        <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-muted-foreground" style={{ animationDelay: "150ms" }} />
        <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-muted-foreground" style={{ animationDelay: "300ms" }} />
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message bubble — kept lightweight (no citations / artifacts apply to a
// generative assistant). Matches the visual treatment of UserBubble /
// AssistantBubble from the Analyst chat.
// ---------------------------------------------------------------------------

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
    if (m.index > last) parts.push(<React.Fragment key={key++}>{text.slice(last, m.index)}</React.Fragment>);
    parts.push(
      <strong key={key++} className="font-semibold text-foreground">
        {m[1]}
      </strong>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<React.Fragment key={key++}>{text.slice(last)}</React.Fragment>);
  return parts;
}

// ---------------------------------------------------------------------------
// Threads sidebar — same visual treatment as Analyst's ThreadsSidebar:
// full-width New button, grouped by Today / Yesterday / Earlier, footer.
// Per-thread icon uses the assistant's hue so the rail reads as "this
// assistant" without us needing a lens concept.
// ---------------------------------------------------------------------------

function AssistantThreadsSidebar({
  threads,
  activeId,
  onSelect,
  onNew,
  assistantName,
  assistantHue,
  AssistantIcon,
}: {
  threads: AssistantThread[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  assistantName: string;
  assistantHue: string;
  AssistantIcon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}) {
  const groups: { label: string; items: AssistantThread[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Earlier", items: [] },
  ];
  const now = new Date();
  threads.forEach((t) => {
    const d = new Date(t.updatedAt);
    const diffMs = now.getTime() - d.getTime();
    const day = 24 * 3600 * 1000;
    if (diffMs < day) groups[0].items.push(t);
    else if (diffMs < 2 * day) groups[1].items.push(t);
    else groups[2].items.push(t);
  });

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-border bg-muted/30">
      <div className="border-b border-border px-3 py-3">
        <Button
          onClick={onNew}
          variant="outline"
          className="w-full justify-start gap-2"
        >
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
            {g.items.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelect(t.id)}
                className={cn(
                  "group flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/60",
                  activeId === t.id && "bg-muted",
                )}
              >
                <AssistantIcon
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  style={{ color: assistantHue }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] leading-tight text-foreground">
                    {t.title}
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    {formatRelative(t.updatedAt)}
                  </div>
                </div>
              </button>
            ))}
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
          <Sparkles className="h-3 w-3" />
          <span>{assistantName} · Assistant</span>
        </div>
      </div>
    </aside>
  );
}
