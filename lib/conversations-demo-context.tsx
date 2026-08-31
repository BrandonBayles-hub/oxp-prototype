"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ConversationsDemoContextValue = {
  /** Increments each time the demo should open the Entrata profile without the threads panel. */
  profileCommsPopupRequest: number;
  requestProfileCommsPopup: () => void;
  /** When true, Super Agent 2.0 conversations are visible in the thread list. */
  superAgentEnabled: boolean;
  toggleSuperAgentEnabled: () => void;
  /** When true, Super Agent 1.0 conversations are visible in the thread list. */
  superAgent1Enabled: boolean;
  toggleSuperAgent1Enabled: () => void;
  /**
   * Super Agent 1.2 — inbox re-org (All / Escalated / Property / Closed Threads,
   * channel sub-filters, ownership indicators, take-over-thread flow).
   * Isolated behind this flag so it does not disturb the SA 1.0 / 2.0 demos.
   */
  superAgent12Enabled: boolean;
  toggleSuperAgent12Enabled: () => void;
  /** Per-thread staff takeover (SA 1.2 only). Threads in this set are property-owned, AI paused. */
  propertyOwnedThreadIds: Set<string>;
  setThreadPropertyOwned: (id: string, owned: boolean) => void;
  /**
   * When true, hide admin surfaces (Custom Inboxes, Settings sections) from the
   * conversations sidebar so the view resembles a regular staff user's experience.
   */
  simulateUserEnabled: boolean;
  toggleSimulateUserEnabled: () => void;
  /**
   * Follow-up: when enabled, SMS/Email threads where staff sent the last public
   * message get a "needs-follow-up" marker on the thread card once the wait
   * exceeds any threshold in `followUpDaysList`. Multiple thresholds can be
   * configured (e.g. 3, 7, 10 days) so a client can nudge staff more than once
   * as a thread ages. Configured per-workspace on the Thread Settings screen.
   * In the prototype, no real day-counting is done — the flag alone drives the
   * marker, and the shortest threshold is what the card badge displays.
   */
  followUpEnabled: boolean;
  setFollowUpEnabled: (v: boolean) => void;
  followUpDaysList: number[];
  /** Replace the entire list. Values are clamped to 1–30 and de-duped/sorted. */
  setFollowUpDaysList: (days: number[]) => void;
  /**
   * Auto-close: when enabled, threads with no activity from anyone (staff, AI,
   * lead, or resident) for `autoCloseDays` days are automatically resolved and
   * moved to Closed Threads. Configured per-workspace on the Manage Inbox
   * screen. In the prototype, no real day-counting is done — the flag alone
   * drives the eventual close (nothing runs on a timer here).
   */
  autoCloseEnabled: boolean;
  setAutoCloseEnabled: (v: boolean) => void;
  autoCloseDays: number;
  setAutoCloseDays: (n: number) => void;
  /**
   * Sort mode for the thread list in every SA 1.2 inbox (Open, Property, Eli,
   * Closed). Configured on Thread Settings → Sorting. Live-applied so switching
   * the setting immediately re-orders the list.
   *   - "newest"   : most recent activity first
   *   - "oldest"   : longest-waiting threads first
   *   - "priority" : needs-action threads first, then by recency
   */
  threadSortMode: "newest" | "oldest" | "priority";
  setThreadSortMode: (m: "newest" | "oldest" | "priority") => void;
};

const ConversationsDemoContext = createContext<ConversationsDemoContextValue | null>(null);

export function ConversationsDemoProvider({ children }: { children: ReactNode }) {
  const [profileCommsPopupRequest, setProfileCommsPopupRequest] = useState(0);
  const [superAgentEnabled, setSuperAgentEnabled] = useState(false);
  const [superAgent1Enabled, setSuperAgent1Enabled] = useState(false);
  const [superAgent12Enabled, setSuperAgent12Enabled] = useState(false);
  const [propertyOwnedThreadIds, setPropertyOwnedThreadIds] = useState<Set<string>>(() => new Set());
  const [simulateUserEnabled, setSimulateUserEnabled] = useState(false);
  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpDaysList, setFollowUpDaysListState] = useState<number[]>([3]);
  const setFollowUpDaysList = useCallback((days: number[]) => {
    // Clamp each entry to 1–30 days, drop invalid/duplicate values, sort asc.
    // Always keep at least one threshold so the UI never renders an empty rule list.
    const cleaned = Array.from(
      new Set(
        days
          .map((d) => Math.max(1, Math.min(30, Math.round(d) || 1)))
          .filter((d) => Number.isFinite(d)),
      ),
    ).sort((a, b) => a - b);
    setFollowUpDaysListState(cleaned.length > 0 ? cleaned : [3]);
  }, []);
  const [autoCloseEnabled, setAutoCloseEnabled] = useState(false);
  const [autoCloseDays, setAutoCloseDaysState] = useState(14);
  const setAutoCloseDays = useCallback((n: number) => {
    const bounded = Math.max(1, Math.min(90, Math.round(n) || 1));
    setAutoCloseDaysState(bounded);
  }, []);
  const [threadSortMode, setThreadSortMode] = useState<"newest" | "oldest" | "priority">("newest");

  const requestProfileCommsPopup = useCallback(() => {
    setProfileCommsPopupRequest((n) => n + 1);
  }, []);

  const toggleSuperAgentEnabled = useCallback(() => {
    setSuperAgentEnabled((v) => !v);
  }, []);

  const toggleSuperAgent1Enabled = useCallback(() => {
    setSuperAgent1Enabled((v) => !v);
  }, []);

  const toggleSuperAgent12Enabled = useCallback(() => {
    setSuperAgent12Enabled((v) => !v);
  }, []);

  const toggleSimulateUserEnabled = useCallback(() => {
    setSimulateUserEnabled((v) => !v);
  }, []);

  const setThreadPropertyOwned = useCallback((id: string, owned: boolean) => {
    setPropertyOwnedThreadIds((prev) => {
      const next = new Set(prev);
      if (owned) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      profileCommsPopupRequest,
      requestProfileCommsPopup,
      superAgentEnabled,
      toggleSuperAgentEnabled,
      superAgent1Enabled,
      toggleSuperAgent1Enabled,
      superAgent12Enabled,
      toggleSuperAgent12Enabled,
      propertyOwnedThreadIds,
      setThreadPropertyOwned,
      simulateUserEnabled,
      toggleSimulateUserEnabled,
      followUpEnabled,
      setFollowUpEnabled,
      followUpDaysList,
      setFollowUpDaysList,
      autoCloseEnabled,
      setAutoCloseEnabled,
      autoCloseDays,
      setAutoCloseDays,
      threadSortMode,
      setThreadSortMode,
    }),
    [
      profileCommsPopupRequest,
      requestProfileCommsPopup,
      superAgentEnabled,
      toggleSuperAgentEnabled,
      superAgent1Enabled,
      toggleSuperAgent1Enabled,
      superAgent12Enabled,
      toggleSuperAgent12Enabled,
      propertyOwnedThreadIds,
      setThreadPropertyOwned,
      simulateUserEnabled,
      toggleSimulateUserEnabled,
      followUpEnabled,
      followUpDaysList,
      setFollowUpDaysList,
      autoCloseEnabled,
      autoCloseDays,
      setAutoCloseDays,
      threadSortMode,
    ]
  );

  return (
    <ConversationsDemoContext.Provider value={value}>{children}</ConversationsDemoContext.Provider>
  );
}

export function useConversationsDemo() {
  const ctx = useContext(ConversationsDemoContext);
  if (!ctx) {
    throw new Error("useConversationsDemo must be used within ConversationsDemoProvider");
  }
  return ctx;
}
