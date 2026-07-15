"use client";
import * as React from "react";
import type { LensId, Message } from "./types";

// =============================================================================
// Shared Entrata Experts history
// -----------------------------------------------------------------------------
// Single source of truth for *every* conversation in the Experts workspace,
// regardless of which surface produced it — Entrata Analyst, a pre-built
// Assistant, or the Report Analyzer. Each surface used to own its own thread
// store (and therefore its own sidebar), so history was siloed per-expert.
//
// This provider unifies them: every thread carries a `source` tag, all threads
// live in one list, and one shared sidebar renders the union. Persisted to
// sessionStorage so the history survives in-tab navigation (matching the old
// per-assistant behavior).
// =============================================================================

export type ThreadSource =
  | { kind: "analyst" }
  | { kind: "assistant"; id: string }
  | { kind: "report"; id: string };

export interface HistoryThread {
  id: string;
  source: ThreadSource;
  title: string;
  /** Lens of the most recent Analyst answer — drives the sidebar icon/hue. */
  lens?: LensId;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

/** Stable string key for a source, used for equality + filtering. */
export function sourceKey(s: ThreadSource): string {
  return s.kind === "analyst" ? "analyst" : `${s.kind}:${s.id}`;
}

export function sameSource(a: ThreadSource, b: ThreadSource): boolean {
  return sourceKey(a) === sourceKey(b);
}

interface CreateThreadInput {
  source: ThreadSource;
  title: string;
  lens?: LensId;
  message: Message;
}

interface AppendPatch {
  lens?: LensId;
  title?: string;
}

export interface ExpertsHistoryValue {
  /** All threads, newest-updated first. */
  threads: HistoryThread[];
  /** Currently open thread across all surfaces (or null = new conversation). */
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  getThread: (id: string) => HistoryThread | undefined;
  /** Start a new thread with its first message; returns the new thread id and selects it. */
  createThread: (input: CreateThreadInput) => string;
  /** Append a message to an existing thread (idempotent on message id). */
  appendMessage: (threadId: string, message: Message, patch?: AppendPatch) => void;
  /** Clear the active selection so the current surface shows its empty state. */
  newThread: () => void;
  clearAll: () => void;
}

const Ctx = React.createContext<ExpertsHistoryValue | null>(null);

const STORAGE_KEY = "oxp:experts-v2:shared-history";

function loadPersisted(): { threads: HistoryThread[]; activeId: string | null } {
  if (typeof window === "undefined") return { threads: [], activeId: null };
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
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

export function ExpertsHistoryProvider({ children }: { children: React.ReactNode }) {
  const [threads, setThreads] = React.useState<HistoryThread[]>([]);
  const [activeId, setActiveIdState] = React.useState<string | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  // Hydrate from sessionStorage on mount.
  React.useEffect(() => {
    const { threads: t, activeId: a } = loadPersisted();
    setThreads(t);
    setActiveIdState(a);
    setHydrated(true);
  }, []);

  // Persist whenever the store changes (after hydration so we don't clobber
  // existing data with the initial empty state).
  React.useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ threads, activeId }),
      );
    } catch {
      // ignore quota / privacy-mode errors
    }
  }, [threads, activeId, hydrated]);

  const setActiveId = React.useCallback((id: string | null) => {
    setActiveIdState(id);
  }, []);

  const newThread = React.useCallback(() => setActiveIdState(null), []);

  const getThread = React.useCallback(
    (id: string) => threads.find((t) => t.id === id),
    [threads],
  );

  const createThread = React.useCallback((input: CreateThreadInput) => {
    const id = `th-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = input.message.createdAt ?? new Date().toISOString();
    const thread: HistoryThread = {
      id,
      source: input.source,
      title: input.title,
      lens: input.lens,
      createdAt: now,
      updatedAt: now,
      messages: [input.message],
    };
    setThreads((prev) => [thread, ...prev]);
    setActiveIdState(id);
    return id;
  }, []);

  const appendMessage = React.useCallback(
    (threadId: string, message: Message, patch?: AppendPatch) => {
      setThreads((prev) => {
        const idx = prev.findIndex((t) => t.id === threadId);
        if (idx === -1) return prev;
        const t = prev[idx];
        if (t.messages.some((m) => m.id === message.id)) return prev;
        const updated: HistoryThread = {
          ...t,
          messages: [...t.messages, message],
          updatedAt: message.createdAt ?? new Date().toISOString(),
          lens: patch?.lens ?? t.lens,
          title: patch?.title ?? t.title,
        };
        // Float the touched thread to the top so "most recent" ordering holds.
        const rest = prev.filter((_, i) => i !== idx);
        return [updated, ...rest];
      });
    },
    [],
  );

  const clearAll = React.useCallback(() => {
    setThreads([]);
    setActiveIdState(null);
  }, []);

  const value = React.useMemo<ExpertsHistoryValue>(
    () => ({
      threads,
      activeId,
      setActiveId,
      getThread,
      createThread,
      appendMessage,
      newThread,
      clearAll,
    }),
    [
      threads,
      activeId,
      setActiveId,
      getThread,
      createThread,
      appendMessage,
      newThread,
      clearAll,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useExpertsHistory(): ExpertsHistoryValue {
  const v = React.useContext(Ctx);
  if (!v) {
    throw new Error(
      "useExpertsHistory must be used within an ExpertsHistoryProvider",
    );
  }
  return v;
}
