"use client";
import * as React from "react";
import { ASSISTANT_BY_ID } from "./assistants";

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
  send: (text: string) => void;
}

const STORAGE_PREFIX = "oxp:experts-v2:assistants:";

function readPersisted(assistantId: string): { threads: AssistantThread[]; activeId: string | null } {
  if (typeof window === "undefined") return { threads: [], activeId: null };
  try {
    const raw = window.sessionStorage.getItem(STORAGE_PREFIX + assistantId);
    if (!raw) return { threads: [], activeId: null };
    const parsed = JSON.parse(raw);
    return {
      threads: Array.isArray(parsed?.threads) ? parsed.threads : [],
      activeId: typeof parsed?.activeId === "string" ? parsed.activeId : null,
    };
  } catch {
    return { threads: [], activeId: null };
  }
}

function writePersisted(assistantId: string, threads: AssistantThread[], activeId: string | null) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      STORAGE_PREFIX + assistantId,
      JSON.stringify({ threads, activeId }),
    );
  } catch {
    // ignore quota / privacy errors
  }
}

function makeReply(assistantId: string, prompt: string): string {
  const def = ASSISTANT_BY_ID[assistantId];
  const name = def?.shortName ?? "Assistant";
  const trimmed = prompt.trim();
  const head = trimmed.length > 220 ? trimmed.slice(0, 220) + "…" : trimmed;
  return `**${name}** · prototype response\n\nThanks — here's a starting point for: "${head}". In the live product I'd draft a structured answer with examples and follow-up suggestions tailored to your portfolio. For now this is an in-browser echo so you can preview the flow.`;
}

export function useAssistantChatStore(assistantId: string): AssistantChatState {
  const [threads, setThreads] = React.useState<AssistantThread[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [isThinking, setIsThinking] = React.useState(false);

  // Load persisted threads on mount / when assistant changes
  React.useEffect(() => {
    const { threads: t, activeId: a } = readPersisted(assistantId);
    setThreads(t);
    setActiveId(a);
    setIsThinking(false);
  }, [assistantId]);

  // Persist whenever threads or active id changes
  React.useEffect(() => {
    writePersisted(assistantId, threads, activeId);
  }, [assistantId, threads, activeId]);

  function newThread() {
    setActiveId(null);
  }

  function selectThread(id: string) {
    setActiveId(id);
  }

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const now = Date.now();
    const userMsg: AssistantThreadMessage = {
      id: `u-${now}`,
      role: "user",
      body: trimmed,
      createdAt: new Date(now).toISOString(),
    };

    const isNew = !activeId;
    const threadId = isNew ? `t-${now}` : (activeId as string);

    if (isNew) {
      const newT: AssistantThread = {
        id: threadId,
        title: trimmed.length > 60 ? trimmed.slice(0, 57) + "…" : trimmed,
        messages: [userMsg],
        createdAt: userMsg.createdAt,
        updatedAt: userMsg.createdAt,
      };
      setThreads((prev) => (prev.some((t) => t.id === threadId) ? prev : [newT, ...prev]));
      setActiveId(threadId);
    } else {
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId
            ? {
                ...t,
                messages: t.messages.some((m) => m.id === userMsg.id)
                  ? t.messages
                  : [...t.messages, userMsg],
                updatedAt: userMsg.createdAt,
              }
            : t,
        ),
      );
    }

    setIsThinking(true);
    setTimeout(() => {
      const replyId = `a-${Date.now()}`;
      const aMsg: AssistantThreadMessage = {
        id: replyId,
        role: "assistant",
        body: makeReply(assistantId, trimmed),
        createdAt: new Date().toISOString(),
      };
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId
            ? {
                ...t,
                messages: t.messages.some((m) => m.id === replyId)
                  ? t.messages
                  : [...t.messages, aMsg],
                updatedAt: aMsg.createdAt,
              }
            : t,
        ),
      );
      setIsThinking(false);
    }, 700);
  }

  return { threads, activeId, isThinking, newThread, selectThread, send };
}
