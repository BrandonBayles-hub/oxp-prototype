"use client";
import * as React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MessageInput } from "./message-input";
import { SuggestedPrompts } from "./suggested-prompts";
import { AssistantBubble, UserBubble } from "./message-bubble";
import { ThinkingBubble } from "./thinking-bubble";
import type { ChatState } from "@/lib/entrata-experts-v2/store";
import type { AssistantMessage } from "@/lib/entrata-experts-v2/types";
import { useAnalyticsHandoff } from "@/lib/analytics-handoff-context";
import { isHandoffEligible } from "@/lib/entrata-experts-v2/analytics-handoff";

// `/send-to-analytics` (and a couple of forgiving spellings), plus natural
// language like "save this to my workspace" / "add this to the company menu".
const HANDOFF_SLASH = /^\/send[-\s]?to[-\s]?analytics\b/i;
const HANDOFF_NL =
  /\b(send|add|publish|save|push)\b.*\b(analytics platform|company menu|my workspace|workspace|library)\b/i;

export function ChatView({ store }: { store: ChatState }) {
  const activeConv = store.conversations.find((c) => c.id === store.activeId) ?? null;
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const { handoffEnabled, openHandoff } = useAnalyticsHandoff();

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeConv?.messages.length, store.isThinking]);

  // Intercept the handoff command before it's sent as a normal prompt. Targets
  // the most recent eligible artifact in the active thread and opens the dialog.
  function handleSend(text: string) {
    const t = text.trim();
    if (handoffEnabled && (HANDOFF_SLASH.test(t) || HANDOFF_NL.test(t)) && activeConv) {
      for (let i = activeConv.messages.length - 1; i >= 0; i--) {
        const m = activeConv.messages[i];
        if (m.role !== "assistant") continue;
        const eligible = m.artifacts.filter(isHandoffEligible);
        if (eligible.length === 0) continue;
        let prompt: string | undefined;
        for (let j = i - 1; j >= 0; j--) {
          if (activeConv.messages[j].role === "user") {
            prompt = activeConv.messages[j].body;
            break;
          }
        }
        openHandoff(eligible[eligible.length - 1], {
          scopeLabel: m.scope.label,
          prompt,
        });
        return;
      }
      // No eligible artifact yet — fall through so the user still gets an answer.
    }
    store.send(text);
  }

  return (
    <TooltipProvider delayDuration={120}>
      <div className="flex min-h-0 flex-1 overflow-hidden bg-background">
        <main className="flex min-w-0 flex-1 flex-col">
          {!activeConv ? (
            <EmptyState
              role={store.role}
              onPick={(p) => store.send(p)}
              lens={store.lens}
              depth={store.depth}
              model={store.model}
              scope={store.scope}
              onChangeLens={store.setLensDepth}
              onChangeScope={store.setScope}
              isThinking={store.isThinking}
              onSend={store.send}
            />
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hover">
                <div className="mx-auto max-w-[820px] space-y-6 px-6 py-8">
                  {activeConv.messages.map((m, idx) =>
                    m.role === "user" ? (
                      <UserBubble key={m.id} message={m} />
                    ) : (
                      <AssistantBubble
                        key={m.id}
                        message={m as AssistantMessage}
                        onFollowUp={(t) => store.send(t)}
                        priorPrompt={findPriorPrompt(activeConv.messages, idx)}
                      />
                    ),
                  )}
                  {store.isThinking && (
                    <ThinkingBubble lens={store.lens === "auto" ? "auto" : store.lens} />
                  )}
                </div>
              </div>
              <div className="border-t border-border bg-background">
                <div className="mx-auto max-w-[820px] px-6 py-3">
                  <MessageInput
                    lens={store.lens}
                    depth={store.depth}
                    model={store.model}
                    scope={store.scope}
                    onChangeLens={store.setLensDepth}
                    onChangeScope={store.setScope}
                    onSend={handleSend}
                    isThinking={store.isThinking}
                  />
                  <div className="mt-2 text-center text-[11px] text-muted-foreground">
                    Entrata Analyst cites every claim. Always verify before acting on resident-specific information.
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </TooltipProvider>
  );
}

function findPriorPrompt(
  messages: { role: string; body: string }[],
  idx: number,
): string | undefined {
  for (let j = idx - 1; j >= 0; j--) {
    if (messages[j].role === "user") return messages[j].body;
  }
  return undefined;
}

function EmptyState(props: {
  role: ChatState["role"];
  lens: ChatState["lens"];
  depth: ChatState["depth"];
  model: ChatState["model"];
  scope: ChatState["scope"];
  isThinking: boolean;
  onChangeLens: ChatState["setLensDepth"];
  onChangeScope: ChatState["setScope"];
  onSend: (t: string) => void;
  onPick: (t: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-[680px] space-y-7">
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Connected to Wynbrook Living
          </div>
          <h1
            className="text-3xl font-semibold tracking-tight text-foreground"
            style={{
              fontFamily:
                "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif",
            }}
          >
            What do you want to know?
          </h1>
          <p className="text-[15px] text-muted-foreground">
            Ask anything about your portfolio. Cited, scoped, remembered.
          </p>
        </div>

        <MessageInput
          lens={props.lens}
          depth={props.depth}
          model={props.model}
          scope={props.scope}
          onChangeLens={props.onChangeLens}
          onChangeScope={props.onChangeScope}
          onSend={props.onSend}
          isThinking={props.isThinking}
          autoFocus
        />

        <SuggestedPrompts role={props.role} onPick={props.onPick} />
      </div>
    </div>
  );
}
