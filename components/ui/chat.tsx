"use client";

/**
 * Shared Chat component — use consistently across the app for any conversation UI.
 *
 * Use cases (configure via roleLabels, roleVariant, placeholder):
 * - Escalations: reply to resident (resident = inbound bubble, agent = outbound unbubbled, staff = outbound)
 * - Agent instruction: human clarifies when AI is blocked (agent asks, you reply; same pattern)
 * - AI Q&A / Intelligence hub: ask AI questions, prompt to create agents, etc. (user = inbound bubble, assistant = outbound unbubbled)
 *
 * Visual pattern: gray message feed, white bubbles for “inbound” (e.g. resident/user), unbubbled black text for “outbound” (e.g. agent/assistant), white input box on gray strip.
 * Prefer this component over custom chat UIs so the experience stays consistent.
 */

import * as React from "react";
import { Paperclip, ArrowUp, FileText, Wrench, ChevronDown, ChevronRight, Clock, Cpu, ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChatSource = {
  title: string;
  snippet: string;
  docId?: string;
};

export type ChatToolCall = {
  name: string;
  status: "success" | "error";
  detail?: string;
};

export type ChatMessage = {
  id?: string;
  role: string;
  text: string;
  sources?: ChatSource[];
  toolCalls?: ChatToolCall[];
  tokensUsed?: number;
  latencyMs?: number;
  feedback?: "positive" | "negative";
};

type ChatProps = {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Map role to display label (e.g. { resident: "Jamie Chen", agent: "Agent", user: "You" }) */
  roleLabels?: Record<string, string>;
  /** inbound = left, white bubble (e.g. resident/user). outbound = left, unbubbled text (e.g. agent/assistant). system = centered, subtle. */
  roleVariant?: Record<string, "inbound" | "outbound" | "system">;
  className?: string;
  /** Max height of the message list (default 280px) */
  messageListHeight?: number | string;
  /** Show attach button (default true; click not wired by default) */
  showAttach?: boolean;
  /** When set, fills the message input with this text (e.g. from a suggested reply); call onInjectApplied after applying so caller can clear. */
  injectDraft?: string;
  /** Called after injectDraft has been applied to the input, so the caller can clear injectDraft. */
  onInjectApplied?: () => void;
  /** Called when user clicks thumbs up/down on a message. Only shown for roles listed in feedbackRoles. */
  onFeedback?: (messageIndex: number, rating: "positive" | "negative") => void;
  /** Roles that should show feedback buttons (default: ["assistant"]) */
  feedbackRoles?: string[];
  /** Quick-reply suggestions shown as chips above the input. Clicking one fills the draft (or calls onSuggestionClick if provided). */
  suggestions?: string[];
  onSuggestionClick?: (text: string) => void;
};

const defaultRoleLabels: Record<string, string> = {
  resident: "Resident",
  agent: "Agent",
  staff: "Staff",
  user: "You",
  assistant: "Assistant",
};

export function Chat({
  messages,
  onSend,
  placeholder = "Ask a question",
  disabled = false,
  roleLabels = defaultRoleLabels,
  roleVariant,
  className,
  messageListHeight = 280,
  showAttach = true,
  injectDraft,
  onInjectApplied,
  onFeedback,
  feedbackRoles = ["assistant"],
  suggestions,
  onSuggestionClick,
}: ChatProps) {
  const [draft, setDraft] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  React.useEffect(() => {
    if (injectDraft != null && injectDraft !== "") {
      setDraft(injectDraft);
      onInjectApplied?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when injectDraft changes so we don't re-apply on parent re-render
  }, [injectDraft]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || disabled) return;
    onSend(text);
    setDraft("");
  };

  const label = (role: string) => roleLabels[role] ?? role;
  const variant = (role: string) => roleVariant?.[role] ?? "inbound";

  return (
    <div className={cn("flex flex-col rounded-lg border border-border bg-muted overflow-hidden", className)}>
      <div
        ref={scrollRef}
        className={cn("scrollbar-hide overflow-y-auto bg-muted px-3 py-3", !messageListHeight && "flex-1 min-h-0")}
        style={messageListHeight ? { maxHeight: typeof messageListHeight === "number" ? `${messageListHeight}px` : messageListHeight } : undefined}
      >
        <div className="space-y-3">
          {messages.map((msg, idx) => {
            const v = variant(msg.role);
            const isOutbound = v === "outbound";
            const isSystem = v === "system";
            const hasMeta = msg.toolCalls?.length || msg.sources?.length || msg.tokensUsed || msg.latencyMs;
            return (
              <div
                key={msg.id ?? idx}
                className={cn(
                  "flex flex-col gap-0.5 items-start",
                  isSystem && "items-center"
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-medium tracking-wider",
                    "text-muted-foreground"
                  )}
                >
                  {label(msg.role)}
                </span>
                <div
                  className={cn(
                    "text-sm",
                    isSystem && "max-w-[85%] rounded-2xl px-3 py-2 bg-muted/80 text-muted-foreground",
                    !isSystem && isOutbound && "max-w-full py-1 text-foreground",
                    !isSystem && !isOutbound && "max-w-[85%] rounded-2xl px-3 py-2 bg-background text-foreground border border-border shadow-sm"
                  )}
                >
                  {msg.text}
                </div>
                {(hasMeta || (onFeedback && feedbackRoles.includes(msg.role))) && (
                  <div className="mt-1 flex flex-col gap-1.5 max-w-full">
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {msg.toolCalls.map((tc, ti) => (
                          <span
                            key={ti}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                              tc.status === "success" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-red-500/10 text-red-700 dark:text-red-400"
                            )}
                            title={tc.detail}
                          >
                            <Wrench className="h-2.5 w-2.5" />
                            {tc.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {msg.sources && msg.sources.length > 0 && (
                      <SourcesList sources={msg.sources} />
                    )}
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {msg.latencyMs != null && (
                        <span className="inline-flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {msg.latencyMs}ms
                        </span>
                      )}
                      {msg.tokensUsed != null && (
                        <span className="inline-flex items-center gap-0.5">
                          <Cpu className="h-2.5 w-2.5" />
                          {msg.tokensUsed} tokens
                        </span>
                      )}
                      {onFeedback && feedbackRoles.includes(msg.role) && (
                        <span className="inline-flex items-center gap-0.5 ml-auto">
                          <button
                            type="button"
                            className={cn(
                              "rounded p-0.5 transition-colors",
                              msg.feedback === "positive" ? "text-emerald-600 bg-emerald-500/10" : "hover:text-foreground"
                            )}
                            onClick={() => onFeedback(idx, "positive")}
                            aria-label="Helpful"
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            className={cn(
                              "rounded p-0.5 transition-colors",
                              msg.feedback === "negative" ? "text-red-600 bg-red-500/10" : "hover:text-foreground"
                            )}
                            onClick={() => onFeedback(idx, "negative")}
                            aria-label="Not helpful"
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </button>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {suggestions && suggestions.length > 0 && (
        <div className="mt-auto flex flex-col gap-1.5 bg-muted px-3 pt-3">
          <p className="text-[10px] font-semibold tracking-wider text-muted-foreground">SUGGESTED REPLIES</p>
          {suggestions.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => {
                if (onSuggestionClick) {
                  onSuggestionClick(text);
                } else {
                  setDraft(text);
                }
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 line-clamp-2"
            >
              {text}
            </button>
          ))}
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className={cn("bg-muted p-3", !(suggestions && suggestions.length > 0) && "mt-auto")}
      >
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2 shadow-sm transition-shadow focus-within:border-primary/40 focus-within:shadow-md">
          {showAttach && (
            <button
              type="button"
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-muted/60 px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Attach file"
            >
              <Paperclip className="h-4 w-4" />
              <span className="hidden sm:inline">Attach</span>
            </button>
          )}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={placeholder}
            rows={1}
            disabled={disabled}
            className="min-h-[40px] max-h-32 flex-1 resize-none bg-transparent py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed"
            aria-label="Message"
          />
          <button
            type="submit"
            disabled={!draft.trim() || disabled}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Send"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function SourcesList({ sources }: { sources: ChatSource[] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="rounded-md border border-border bg-background/50">
      <button
        type="button"
        className="flex w-full items-center gap-1 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground"
        onClick={() => setOpen((o) => !o)}
      >
        <FileText className="h-2.5 w-2.5" />
        {sources.length} source{sources.length !== 1 ? "s" : ""} cited
        {open ? <ChevronDown className="ml-auto h-2.5 w-2.5" /> : <ChevronRight className="ml-auto h-2.5 w-2.5" />}
      </button>
      {open && (
        <div className="border-t border-border px-2 py-1.5 space-y-1.5">
          {sources.map((s, i) => (
            <div key={i} className="text-[10px]">
              <p className="font-medium text-foreground">{s.title}</p>
              <p className="text-muted-foreground leading-relaxed">{s.snippet}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
