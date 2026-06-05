"use client";
import * as React from "react";
import type {
  AssistantMessage,
  Conversation,
  Depth,
  LensId,
  ModelId,
  RoleId,
  Scope,
  UserMessage,
} from "./types";
import { compose } from "./data/answers";
import { generateActivity } from "./data/activity";
import { useExpertsHistory, type HistoryThread } from "./history-store";

const REMEMBERED_BY_ROLE: Record<RoleId, string[]> = {
  "vp-ops": [
    "Mara Holloway — VP of Operations",
    "You watch Tampa-area properties closely",
    "You prefer Monday-morning digests over emails",
    "Renewal acceptance is a top KPI for you this quarter",
  ],
  regional: [
    "Marcus Chen — Regional · Southeast",
    "You're working on closing the gap at Tampa Bay",
    "You like leasing-funnel views grouped by source",
  ],
  "onsite-pm": [
    "Jasmin Ortega — PM · Wynbrook Tampa Bay",
    "You start your day at 7:45 am",
    "You prefer drilldowns by unit type, not by floor",
  ],
  "asset-mgr": [
    "Thomas Becker — Asset Manager",
    "You compare every property to its 2026 underwriting",
    "You ignore properties under 200 units in summary views",
  ],
  accounting: [
    "Rina Patel — AP Lead",
    "You batch invoice reviews on Tuesdays + Thursdays",
    "You require a vendor history check on anything > $5k",
  ],
};

export interface ChatState {
  role: RoleId;
  setRole: (r: RoleId) => void;
  scope: Scope;
  setScope: (s: Scope) => void;
  lens: LensId;
  depth: Depth;
  model: ModelId;
  setLensDepth: (l: LensId, d: Depth, m?: ModelId) => void;
  setModel: (m: ModelId) => void;
  conversations: Conversation[];
  activeId: string | null;
  isThinking: boolean;
  remembered: string[];
  newConversation: () => void;
  selectConversation: (id: string) => void;
  send: (prompt: string) => void;
  activity: Conversation[];
}

// Map a shared HistoryThread (analyst source) back into the richer
// Conversation shape the Analyst UI renders. The live conversations are
// display-only — the analytics rollup fields are filled with sane defaults
// (the Activity Log uses generateActivity(), not these live records).
function toConversation(t: HistoryThread): Conversation {
  let lastLens: LensId | undefined;
  for (let i = t.messages.length - 1; i >= 0; i--) {
    const m = t.messages[i];
    if (m.role === "assistant") {
      lastLens = m.lens;
      break;
    }
  }
  const lens = t.lens ?? lastLens ?? "leasing";
  return {
    id: t.id,
    title: t.title,
    userId: "e-analyst",
    messages: t.messages,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    intent: "live",
    lens,
    turnCount: t.messages.filter((m) => m.role === "user").length,
    durationMs: 0,
    resolution: "ongoing",
    lensesUsed: [lens],
    scopesUsed: [],
    everDownvoted: false,
    everRefused: false,
    everEscalated: false,
    regressed: false,
  };
}

export function useChatStore(): ChatState {
  const history = useExpertsHistory();
  const [role, setRole] = React.useState<RoleId>("vp-ops");
  const [scope, setScope] = React.useState<Scope>({ kind: "portfolio", id: "portfolio", label: "Whole portfolio" });
  const [lens, setLens] = React.useState<LensId>("leasing");
  const [depth, setDepth] = React.useState<Depth>("auto");
  const [model, setModel] = React.useState<ModelId>("auto");
  const [isThinking, setIsThinking] = React.useState(false);
  const [activity, setActivity] = React.useState<Conversation[]>([]);

  React.useEffect(() => {
    setActivity(generateActivity());
  }, []);

  const remembered = REMEMBERED_BY_ROLE[role];

  // Analyst conversations are the analyst-sourced slice of the shared history.
  const conversations = React.useMemo<Conversation[]>(
    () =>
      history.threads
        .filter((t) => t.source.kind === "analyst")
        .map(toConversation),
    [history.threads],
  );

  // The shared active thread only counts as "active" here if it belongs to
  // the Analyst — otherwise this surface shows its empty state.
  const activeThread = history.activeId ? history.getThread(history.activeId) : undefined;
  const activeId =
    activeThread && activeThread.source.kind === "analyst" ? activeThread.id : null;

  // Lens defaults to "Leasing" and stays there until the user explicitly picks
  // another. We deliberately don't re-derive it from role, so switching role
  // doesn't silently override the user's selection.

  function setLensDepth(l: LensId, d: Depth, m?: ModelId) {
    setLens(l);
    setDepth(d);
    if (m) setModel(m);
  }

  function newConversation() {
    history.newThread();
  }

  function selectConversation(id: string) {
    history.setActiveId(id);
  }

  function send(prompt: string) {
    const now = Date.now();
    const userMsg: UserMessage = {
      id: `u-${now}`,
      role: "user",
      body: prompt,
      createdAt: new Date(now).toISOString(),
    };

    // Continue the active Analyst thread if one is open; otherwise start fresh.
    const current = history.activeId ? history.getThread(history.activeId) : undefined;
    const continuing = current && current.source.kind === "analyst";

    // Prior turns (for live model context) captured BEFORE the new user
    // message is appended below.
    const priorTurns = continuing
      ? current!.messages.map((m) => ({ role: m.role, content: m.body }))
      : [];

    let convId: string;
    if (continuing) {
      convId = current!.id;
      history.appendMessage(convId, userMsg);
    } else {
      convId = history.createThread({
        source: { kind: "analyst" },
        title: prompt.length > 60 ? prompt.slice(0, 57) + "..." : prompt,
        lens,
        message: userMsg,
      });
    }

    setIsThinking(true);

    const appendAssistant = (
      message: Omit<AssistantMessage, "id" | "createdAt">,
    ) => {
      const aMsg: AssistantMessage = {
        ...message,
        id: `a-${Date.now()}`,
        model,
        createdAt: new Date().toISOString(),
      };
      history.appendMessage(convId, aMsg, { lens: aMsg.lens });
      setIsThinking(false);
    };

    // Built-in mock answer engine — used when LiteLLM isn't configured or the
    // live call fails, so the prototype always responds.
    const runMock = () => {
      const thinkMs = depth === "fast" ? 900 : depth === "reasoning" ? 1900 : 1100;
      setTimeout(() => {
        const composed = compose({ prompt, lens, depth, scope });
        appendAssistant(composed.message);
      }, thinkMs);
    };

    // Try the live LiteLLM proxy first; fall back to the mock on any failure.
    void (async () => {
      try {
        // Trailing slash matches next.config `trailingSlash: true` (avoids a
        // 308 redirect on the POST).
        const res = await fetch("/api/experts/chat/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, lens, depth, model, role, scope, messages: priorTurns }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok && data.message) {
          appendAssistant(data.message as Omit<AssistantMessage, "id" | "createdAt">);
        } else {
          runMock();
        }
      } catch {
        runMock();
      }
    })();
  }

  return {
    role, setRole,
    scope, setScope,
    lens, depth, model,
    setLensDepth,
    setModel,
    conversations,
    activeId,
    isThinking,
    remembered,
    newConversation,
    selectConversation,
    send,
    activity,
  };
}
