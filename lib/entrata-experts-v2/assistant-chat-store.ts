"use client";
import * as React from "react";
import { ASSISTANT_BY_ID } from "./assistants";
import {
  useExpertsHistory,
  sameSource,
  type HistoryThread,
  type ThreadSource,
} from "./history-store";
import type { AssistantMessage, ModelId, Scope, UserMessage } from "./types";

// =============================================================================
// Assistant / Report chat store — thin adapter over the shared history.
// -----------------------------------------------------------------------------
// Both the pre-built Assistants and the Report Analyzer call this hook. They
// no longer keep their own per-surface thread list; instead they read and
// write the one shared ExpertsHistory store so every conversation shows up in
// the single shared sidebar regardless of which expert produced it.
//
// The `assistantId` argument doubles as the source key:
//   - "rpt-<reportId>"  → a Report Analyzer thread   ({ kind: "report", id })
//   - anything else     → a pre-built Assistant       ({ kind: "assistant", id })
// =============================================================================

export interface AssistantThreadMessage {
  id: string;
  role: "user" | "assistant";
  body: string;
  createdAt: string;
}

export interface AssistantThread {
  id: string;
  title: string;
  messages: AssistantThreadMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AssistantChatState {
  threads: AssistantThread[];
  activeId: string | null;
  isThinking: boolean;
  newThread: () => void;
  selectThread: (id: string) => void;
  /**
   * Send a turn. `model` records which model produced the reply so the bubble
   * and history reflect the real selection. Surfaces with no picker (the
   * pre-built Assistants) omit it and fall back to "auto".
   */
  send: (text: string, model?: ModelId) => void;
}

const DEFAULT_SCOPE: Scope = {
  kind: "portfolio",
  id: "portfolio",
  label: "Whole portfolio",
};

function parseSource(assistantId: string): ThreadSource {
  if (assistantId.startsWith("rpt-")) {
    return { kind: "report", id: assistantId.slice("rpt-".length) };
  }
  return { kind: "assistant", id: assistantId };
}

function toAssistantThread(t: HistoryThread): AssistantThread {
  return {
    id: t.id,
    title: t.title,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    messages: t.messages.map((m) => ({
      id: m.id,
      role: m.role,
      body: m.body,
      createdAt: m.createdAt,
    })),
  };
}

function makeReply(assistantId: string, prompt: string): string {
  const def = ASSISTANT_BY_ID[assistantId];
  const name = def?.shortName ?? "Assistant";
  const trimmed = prompt.trim();
  const head = trimmed.length > 220 ? trimmed.slice(0, 220) + "…" : trimmed;
  return `**${name}** · prototype response\n\nThanks — here's a starting point for: "${head}". In the live product I'd draft a structured answer with examples and follow-up suggestions tailored to your portfolio. For now this is an in-browser echo so you can preview the flow.`;
}

// Wrap a plain text reply in the shared AssistantMessage shape. Generative
// assistants have no citations / artifacts, so those stay empty.
function makeAssistantMessage(body: string, model: ModelId = "auto"): AssistantMessage {
  return {
    id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    role: "assistant",
    body,
    lens: "auto",
    depth: "auto",
    model,
    scope: DEFAULT_SCOPE,
    citations: [],
    artifacts: [],
    trace: [],
    confidence: "medium",
    followUps: [],
    outcome: "answered",
    createdAt: new Date().toISOString(),
  };
}

export function useAssistantChatStore(assistantId: string): AssistantChatState {
  const history = useExpertsHistory();
  const source = React.useMemo(() => parseSource(assistantId), [assistantId]);
  const [isThinking, setIsThinking] = React.useState(false);

  const threads = React.useMemo(
    () =>
      history.threads
        .filter((t) => sameSource(t.source, source))
        .map(toAssistantThread),
    [history.threads, source],
  );

  const active = history.activeId ? history.getThread(history.activeId) : undefined;
  const activeId = active && sameSource(active.source, source) ? active.id : null;

  const newThread = React.useCallback(() => history.newThread(), [history]);
  const selectThread = React.useCallback(
    (id: string) => history.setActiveId(id),
    [history],
  );

  const send = React.useCallback(
    (text: string, model: ModelId = "auto") => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const now = Date.now();
      const userMsg: UserMessage = {
        id: `u-${now}`,
        role: "user",
        body: trimmed,
        createdAt: new Date(now).toISOString(),
      };

      const current = history.activeId ? history.getThread(history.activeId) : undefined;
      const continuing = current && sameSource(current.source, source);

      let threadId: string;
      if (continuing) {
        threadId = current!.id;
        history.appendMessage(threadId, userMsg);
      } else {
        threadId = history.createThread({
          source,
          title: trimmed.length > 60 ? trimmed.slice(0, 57) + "…" : trimmed,
          message: userMsg,
        });
      }

      setIsThinking(true);
      setTimeout(() => {
        history.appendMessage(
          threadId,
          makeAssistantMessage(makeReply(assistantId, trimmed), model),
        );
        setIsThinking(false);
      }, 700);
    },
    [assistantId, history, source],
  );

  return { threads, activeId, isThinking, newThread, selectThread, send };
}
