"use client";
import * as React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MessageInput, type SlashCommand } from "./message-input";
import { SuggestedPrompts } from "./suggested-prompts";
import { AssistantBubble, UserBubble } from "./message-bubble";
import { ThinkingBubble } from "./thinking-bubble";
import type { ChatState } from "@/lib/entrata-experts-v2/store";
import type { AssistantMessage, SavedInsight } from "@/lib/entrata-experts-v2/types";
import { useAnalyticsHandoff } from "@/lib/analytics-handoff-context";
import { isHandoffEligible } from "@/lib/entrata-experts-v2/analytics-handoff";
import { useSavedInsights } from "@/lib/entrata-experts-v2/saved-insights-store";
import { LENS_BY_ID } from "@/lib/entrata-experts-v2/lenses";
import { Share2, Bookmark } from "lucide-react";

// `/send-to-analytics` (and a couple of forgiving spellings), plus natural
// language like "save this to my workspace" / "add this to the company menu".
const HANDOFF_SLASH = /^\/send[-\s]?to[-\s]?analytics\b/i;
const HANDOFF_NL =
  /\b(send|add|publish|save|push)\b.*\b(analytics platform|company menu|my workspace|workspace|library)\b/i;

export function ChatView({ store }: { store: ChatState }) {
  const activeConv = store.conversations.find((c) => c.id === store.activeId) ?? null;
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const { handoffEnabled, openHandoff } = useAnalyticsHandoff();
  const { insights, consumePendingRun } = useSavedInsights();

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeConv?.messages.length, store.isThinking]);

  // Re-run a Saved Insight: feed its stored prompt + params to `store.send`,
  // bypassing the composer's current state. Each insight is its own
  // self-contained ask.
  const runInsight = React.useCallback(
    (insight: SavedInsight) => {
      store.send(insight.prompt, {
        lens: insight.lens,
        depth: insight.depth,
        model: insight.model,
        scope: insight.scope,
      });
    },
    [store],
  );

  // Drain any insight the Saved Insights library queued while it navigated
  // us here. Runs once whenever a new pendingRun lands, then clears it so
  // the same insight doesn't replay on every re-render.
  React.useEffect(() => {
    const queued = consumePendingRun();
    if (queued) runInsight(queued);
    // Re-check whenever the consumer would return a non-null value. We
    // intentionally depend on the function identity (which only changes
    // when pendingRun changes inside the provider).
  }, [consumePendingRun, runInsight]);

  // Try to trigger the Send-to-Analytics handoff against the most recent
  // eligible artifact in the active thread. Returns true if the dialog opened.
  function tryOpenHandoff(): boolean {
    if (!handoffEnabled || !activeConv) return false;
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
      return true;
    }
    return false;
  }

  // Intercept the handoff command (and natural-language equivalents) before
  // they're sent as a normal prompt. Targets the most recent eligible
  // artifact in the active thread and opens the dialog. The slash menu
  // surfaces this same command for discoverability.
  function handleSend(text: string) {
    const t = text.trim();
    if ((HANDOFF_SLASH.test(t) || HANDOFF_NL.test(t)) && tryOpenHandoff()) {
      return;
    }
    store.send(text);
  }

  // Build the `/` slash menu: every Saved Insight (with the most-recent at
  // the top — already the order the store returns them), plus the
  // /send-to-analytics system command when handoff is enabled.
  const slashCommands: SlashCommand[] = React.useMemo(() => {
    const list: SlashCommand[] = insights.map((i) => {
      const lensDef = LENS_BY_ID[i.lens];
      return {
        slug: i.slug,
        label: i.name,
        hint: `Saved insight · ${lensDef?.label ?? i.lens} · ${i.scope.label}`,
        icon: <Bookmark className="h-3.5 w-3.5 text-indigo-600" />,
        run: () => runInsight(i),
      };
    });
    if (handoffEnabled) {
      list.push({
        slug: "send-to-analytics",
        label: "Send latest answer to Analytics Platform",
        hint: "Publish as a governed dashboard or add to a packet",
        icon: <Share2 className="h-3.5 w-3.5 text-indigo-600" />,
        run: () => {
          tryOpenHandoff();
        },
      });
    }
    return list;
    // tryOpenHandoff + runInsight close over activeConv / store / openHandoff;
    // include just the inputs that actually affect the menu's payload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insights, handoffEnabled, activeConv]);

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
              onSend={handleSend}
              slashCommands={slashCommands}
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
                    slashCommands={slashCommands}
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
  slashCommands?: SlashCommand[];
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
          slashCommands={props.slashCommands}
        />

        <SuggestedPrompts role={props.role} onPick={props.onPick} />
      </div>
    </div>
  );
}
