"use client";
import * as React from "react";
import { BackBar } from "./back-bar";
import { ASSISTANT_BY_ID } from "@/lib/entrata-experts-v2/assistants";
import { useAssistantChatStore } from "@/lib/entrata-experts-v2/assistant-chat-store";
import { Button } from "@/components/ui/button";
import { ArrowUp, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/entrata-experts-v2/format";

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
  const Icon = def?.icon ?? Sparkles;
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

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[600px] overflow-hidden rounded-lg border border-border bg-background shadow-sm">
      <main className="flex min-w-0 flex-1 flex-col">
        <BackBar
          title={def.name}
          subtitle={def.description}
          onBack={onBack}
          hideBack={hideBack}
          hideNew={hideNew}
          onNew={store.newThread}
          newLabel="Start a new chat"
        />

        {!activeThread ? (
          <EmptyState
            assistantName={def.name}
            blurb={def.blurb}
            hue={def.hue}
            Icon={Icon}
            starters={def.exampleStarters}
            isThinking={store.isThinking}
            onSend={store.send}
          />
        ) : (
          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hover">
            <div className="mx-auto max-w-[760px] space-y-4 px-6 py-6">
              {activeThread.messages.map((m) => (
                <Bubble key={m.id} role={m.role} text={m.body} />
              ))}
              {store.isThinking && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span
                    className="inline-flex h-2 w-2 animate-pulse rounded-full"
                    style={{ background: def.hue }}
                  />
                  <span>{def.shortName} is composing…</span>
                </div>
              )}
            </div>
          </div>
        )}

        <Composer
          onSend={store.send}
          isThinking={store.isThinking}
          placeholder={`Chat with ${def.name}…`}
        />
      </main>

      <ThreadRail
        title="Chat history"
        threads={store.threads.map((t) => ({
          id: t.id,
          title: t.title,
          updatedAt: t.updatedAt,
        }))}
        activeId={store.activeId}
        onSelect={store.selectThread}
        onNew={store.newThread}
      />
    </div>
  );
}

function EmptyState({
  assistantName,
  blurb,
  hue,
  Icon,
  starters,
  isThinking,
  onSend,
}: {
  assistantName: string;
  blurb: string;
  hue: string;
  Icon: React.ComponentType<{ className?: string }>;
  starters: string[];
  isThinking: boolean;
  onSend: (t: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-12 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: `${hue}1f`, color: hue }}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="max-w-md space-y-1.5">
        <h2
          className="text-2xl font-semibold tracking-tight text-foreground"
          style={{
            fontFamily:
              "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif",
          }}
        >
          {assistantName}
        </h2>
        <p className="text-sm text-muted-foreground">{blurb}</p>
      </div>
      <div className="flex w-full max-w-[640px] flex-wrap justify-center gap-2">
        {starters.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => !isThinking && onSend(s)}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

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
        <div className="rounded-xl border border-border bg-background shadow-sm transition-colors focus-within:border-foreground/40">
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
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThreadRail({
  title,
  threads,
  activeId,
  onSelect,
  onNew,
}: {
  title: string;
  threads: { id: string; title: string; updatedAt: string }[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <aside className="hidden w-[260px] shrink-0 flex-col border-l border-border bg-muted/30 lg:flex">
      <div className="flex items-center justify-between border-b border-border px-3 py-3">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onNew}
          aria-label="New chat"
          title="New chat"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hover px-2 py-2">
        {threads.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            No conversations yet.
          </div>
        ) : (
          threads.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              className={cn(
                "flex w-full flex-col items-start rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/60",
                activeId === t.id && "bg-muted",
              )}
            >
              <span className="line-clamp-2 text-[13px] leading-tight text-foreground">
                {t.title}
              </span>
              <span className="mt-0.5 text-[10px] text-muted-foreground">
                {formatRelative(t.updatedAt)}
              </span>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
