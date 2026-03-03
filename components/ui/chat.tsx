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
import { Paperclip, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id?: string;
  role: string;
  text: string;
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
    <div className={cn("flex flex-col rounded-lg border border-border bg-card overflow-hidden", className)}>
      <div
        ref={scrollRef}
        className="scrollbar-hide overflow-y-auto bg-muted px-3 py-3"
        style={{ maxHeight: typeof messageListHeight === "number" ? `${messageListHeight}px` : messageListHeight }}
      >
        <div className="space-y-3">
          {messages.map((msg, idx) => {
            const v = variant(msg.role);
            const isOutbound = v === "outbound";
            const isSystem = v === "system";
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
              </div>
            );
          })}
        </div>
      </div>
      <form
        onSubmit={handleSubmit}
        className="bg-muted p-3"
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
