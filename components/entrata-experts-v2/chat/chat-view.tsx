"use client";
import * as React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThreadsSidebar } from "./threads-sidebar";
import { MessageInput } from "./message-input";
import { SuggestedPrompts } from "./suggested-prompts";
import { AssistantBubble, UserBubble } from "./message-bubble";
import { ThinkingBubble } from "./thinking-bubble";
import type { ChatState } from "@/lib/entrata-experts-v2/store";
import type { AssistantMessage } from "@/lib/entrata-experts-v2/types";
import { useEntrataExpertsRelease } from "@/lib/entrata-experts-release-context";

export function ChatView({ store }: { store: ChatState }) {
  const activeConv = store.conversations.find((c) => c.id === store.activeId) ?? null;
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const { atLeast } = useEntrataExpertsRelease();
  const showThreadsSidebar = atLeast("v1.0");

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeConv?.messages.length, store.isThinking]);

  return (
    <TooltipProvider delayDuration={120}>
      <div className="flex min-h-0 flex-1 overflow-hidden bg-background">
        {showThreadsSidebar && (
          <ThreadsSidebar
            conversations={store.conversations}
            activeId={store.activeId}
            onSelect={store.selectConversation}
            onNew={store.newConversation}
          />
        )}

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
                  {activeConv.messages.map((m) =>
                    m.role === "user" ? (
                      <UserBubble key={m.id} message={m} />
                    ) : (
                      <AssistantBubble
                        key={m.id}
                        message={m as AssistantMessage}
                        onFollowUp={(t) => store.send(t)}
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
                    onSend={store.send}
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
