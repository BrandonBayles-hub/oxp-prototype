"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * SA 1.2 per-thread Eli mode. Independent of escalation state — an escalated
 * thread can have Eli in either mode, and a non-escalated thread can also be
 * Off (e.g. staff explicitly turned Eli off from the thread header).
 *
 * Encoding:
 *   • `{ kind: "on" }`
 *       — Eli is actively responding on the thread.
 *   • `{ kind: "off", policy: "until-resolved" }`
 *       — Eli is off *for now*. As soon as the last active AI escalation on
 *         the thread is resolved, Eli auto-resumes (see the auto-resume
 *         effect in `app/conversations/page.tsx`). This is the flavor the
 *         Eli Prompt modal and the AI On/Off popover set when staff picks
 *         "Turn off Eli."
 *   • `{ kind: "off", policy: "indefinite" }`
 *       — Eli is off *permanently* until someone manually flips it back
 *         on. Auto-resume is skipped. Used by the Resolve-conversation
 *         dialog's "Keep Eli off indefinitely" option so a future message
 *         on the thread routes to Property Threads instead of Eli picking
 *         it back up.
 */
export type EliMode =
  | { kind: "on" }
  | { kind: "off"; policy: "until-resolved" | "indefinite" };

export const DEFAULT_ELI_MODE: EliMode = { kind: "on" };

/**
 * Convert an Eli-prompt cadence value (in whichever unit the setting UI
 * uses) into total minutes. All internal storage/comparison uses minutes
 * for a single source of truth; the unit is a display-only concern.
 */
export type EliPromptCadenceUnit = "minutes" | "hours" | "days";
export function cadenceToMinutes(value: number, unit: EliPromptCadenceUnit): number {
  if (unit === "hours") return value * 60;
  if (unit === "days") return value * 60 * 24;
  return value;
}

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
   * Auto-close: when enabled, threads with no *message activity* for
   * `autoCloseDays` days are automatically closed and moved to Closed
   * Threads. Only real inbound messages from the lead/resident and outbound
   * messages from staff (including replies Eli sends on staff's behalf)
   * reset the idle clock — non-message activity such as escalation labels,
   * Eli mode changes, private notes, or read receipts does NOT.
   *
   * When the sweep fires, an activity note is written to the affected
   * thread's timeline naming the "Auto-close idle threads" setting and the
   * idle window that triggered it, so staff can always trace exactly why a
   * conversation was closed.
   *
   * Configured per-workspace on the Manage Inbox screen. In the prototype,
   * no real day-counting is done — the flag alone drives the eventual close
   * (nothing runs on a timer here).
   */
  autoCloseEnabled: boolean;
  setAutoCloseEnabled: (v: boolean) => void;
  autoCloseDays: number;
  setAutoCloseDays: (n: number) => void;
  /**
   * Sort mode for the thread list in every SA 1.2 inbox (Open, Property, Eli,
   * Closed). Configured on Thread Settings → Sorting. Live-applied so switching
   * the setting immediately re-orders the list.
   *   - "newest" : most recent activity first
   *   - "oldest" : longest-waiting threads first
   * A "priority" sort used to live here too, but it was folded away when
   * SA 1.2's Needs Action / No Action Needed collapsible groups replaced
   * the flat priority-first ordering.
   */
  threadSortMode: "newest" | "oldest";
  setThreadSortMode: (m: "newest" | "oldest") => void;
  /**
   * SA 1.2 Thread Automation → Eli Prompt.
   *
   * When active, staff replying to an escalated thread (Eli mode = On,
   * public message — private notes never trigger) sees a modal asking whether
   * to Turn Eli off indefinitely or resolve the escalation and keep Eli on.
   * Only the first public reply per escalation triggers it — subsequent
   * replies within the cadence window (see `eliPromptCadenceMinutes`) don't
   * re-prompt.
   *
   * If staff dismisses the modal (X close) we treat that as "decide later" —
   * Eli mode stays On, and the cadence window governs when we nudge again on
   * a later message.
   *
   * When *deactivated*, staff replies to escalated threads leave Eli mode
   * untouched — staff must manage Eli manually from the AI On/Off popover.
   */
  eliPromptEnabled: boolean;
  setEliPromptEnabled: (v: boolean) => void;
  /**
   * Per-option visibility inside the Eli Prompt modal. Toggling one off
   * removes that row entirely so staff can't pick it. At least one must
   * stay on — the UI enforces this by disabling the toggle for the last
   * enabled option.
   */
  promptOptionOffEnabled: boolean;
  setPromptOptionOffEnabled: (v: boolean) => void;
  promptOptionKeepOnEnabled: boolean;
  setPromptOptionKeepOnEnabled: (v: boolean) => void;
  /**
   * Re-prompt cadence, stored in minutes (internal source of truth). The
   * settings UI edits `eliPromptCadenceValue` in the currently selected
   * `eliPromptCadenceUnit`; both are combined into minutes on save.
   */
  eliPromptCadenceMinutes: number;
  setEliPromptCadenceMinutes: (n: number) => void;
  /** Display-only: which unit staff picked for the cadence value. */
  eliPromptCadenceUnit: EliPromptCadenceUnit;
  setEliPromptCadenceUnit: (u: EliPromptCadenceUnit) => void;
  /**
   * Which of the two Eli Prompt options is pre-selected when the modal
   * opens. Staff can still swap the choice inline. If the configured
   * default has been disabled via `promptOption*Enabled`, the modal falls
   * back to the other still-enabled option so the workspace never ends up
   * with a "default" that isn't shown.
   */
  eliPromptDefaultOption: "off" | "on";
  setEliPromptDefaultOption: (choice: "off" | "on") => void;
  /**
   * Per-thread Eli mode. Absent = default `{ kind: "on" }`.
   */
  eliModeByThreadId: Record<string, EliMode>;
  setEliMode: (threadId: string, mode: EliMode) => void;
  /**
   * Per-thread epoch-ms timestamp of the last time we surfaced the Eli
   * Prompt modal. Used to enforce `eliPromptCadenceMinutes` — we only
   * re-prompt after that many minutes have passed since the last showing.
   */
  eliPromptShownAt: Record<string, number>;
  markEliPromptShown: (threadId: string) => void;
};

/**
 * Read the effective Eli mode for a thread at the current instant.
 *   - Absent entry → `{ kind: "on" }` (default)
 *   - Everything else → the stored value verbatim.
 */
export function getEffectiveEliMode(
  eliModeByThreadId: Record<string, EliMode>,
  threadId: string,
): EliMode {
  const stored = eliModeByThreadId[threadId];
  if (!stored) return DEFAULT_ELI_MODE;
  return stored;
}

const ConversationsDemoContext = createContext<ConversationsDemoContextValue | null>(null);

export function ConversationsDemoProvider({ children }: { children: ReactNode }) {
  const [profileCommsPopupRequest, setProfileCommsPopupRequest] = useState(0);
  const [superAgentEnabled, setSuperAgentEnabled] = useState(false);
  const [superAgent1Enabled, setSuperAgent1Enabled] = useState(false);
  const [superAgent12Enabled, setSuperAgent12Enabled] = useState(false);
  // Seed the "staff took over this thread" set with the SA 1.2 demo threads
  // that need to land in Property Threads → Non-Escalated without an
  // Escalation label. The rest is empty; staff can flip additional threads
  // over at runtime via the AI On/Off popover.
  const [propertyOwnedThreadIds, setPropertyOwnedThreadIds] = useState<Set<string>>(
    () => new Set([
      // Canonical SA 1.2 "staff took over the thread" demo threads.
      "sa12-prop-amber",
      "sa12-prop-devon",
      // Marcus + Priya used to live here because Eli was
      // snoozed/off on those threads. Now that Eli "off" means "off
      // until the escalation is resolved" (auto-resume), we seed them
      // via explicit ownership so they still land in Property Threads
      // without the Eli-mode override forcing a state that would
      // immediately auto-resume back to On.
      "sa12-prop-marcus",
      "sa12-prop-priya",
      // Additional "No Action Needed in Property Threads" demo threads —
      // resolved, staff-handled touchpoints without escalation labels.
      // Explicitly seeded here so `isPropertyOwnedSA12` treats them as
      // property-owned even though they don't carry an escalation label
      // and Eli is still "on" on the thread.
      "sa12-prop-jocelyn",
      "sa12-prop-hector",
      "sa12-prop-natasha",
      "sa12-prop-owen",
    ]),
  );
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
  const [threadSortMode, setThreadSortMode] = useState<"newest" | "oldest">("newest");
  // Default ON so SA 1.2 threads surface the post-send Eli Prompt without
  // requiring staff to opt into Thread Automation → Eli Prompt first. The
  // toggle in Thread Settings can still turn it off.
  const [eliPromptEnabled, setEliPromptEnabled] = useState(true);
  // Per-option visibility in the Eli Prompt modal. Both default ON.
  // The Manage Inbox UI enforces "at least one must stay on" so staff can't
  // accidentally paint themselves into a corner where the modal has no
  // actionable choices.
  const [promptOptionOffEnabled, setPromptOptionOffEnabled] = useState(true);
  const [promptOptionKeepOnEnabled, setPromptOptionKeepOnEnabled] = useState(true);
  // Sensible default cadence: 6 hours. Keeps re-prompts unobtrusive without
  // making the setting feel like "one prompt per day forever." Staff will
  // still see it more often if the setting is edited.
  const [eliPromptCadenceMinutes, setEliPromptCadenceMinutesState] = useState<number>(6 * 60);
  const setEliPromptCadenceMinutes = useCallback((n: number) => {
    // Clamp to 1 minute .. 30 days. Anything shorter would loop, anything
    // longer stops being an automation.
    const bounded = Math.max(1, Math.min(60 * 24 * 30, Math.round(n) || 1));
    setEliPromptCadenceMinutesState(bounded);
  }, []);
  const [eliPromptCadenceUnit, setEliPromptCadenceUnit] =
    useState<EliPromptCadenceUnit>("hours");
  // Which of the two modal options is pre-selected. "on" is the recommended
  // default — the staff reply typically resolves the escalation, so a single
  // click closes the loop and Eli picks the thread back up automatically.
  const [eliPromptDefaultOption, setEliPromptDefaultOption] =
    useState<"off" | "on">("on");
  // Eli mode is a per-thread override — SA 1.2 threads default to Eli On.
  // Demo threads that used to seed `{ kind: "off" }` (Marcus, Priya) now
  // land in Property Threads via `propertyOwnedThreadIds` instead, because
  // Eli "off" now carries the semantic "off until the escalation is
  // resolved" (auto-resume) — a seeded off state on a thread with no
  // active escalations would immediately auto-resume, which would flap
  // the demo UI.
  const [eliModeByThreadId, setEliModeByThreadId] = useState<Record<string, EliMode>>(
    () => ({}),
  );
  const setEliMode = useCallback((threadId: string, mode: EliMode) => {
    setEliModeByThreadId((prev) => {
      // Keep the map small: dropping back to the default "on" state means we
      // can just delete the entry.
      if (mode.kind === "on") {
        if (!(threadId in prev)) return prev;
        const next = { ...prev };
        delete next[threadId];
        return next;
      }
      return { ...prev, [threadId]: mode };
    });
  }, []);
  const [eliPromptShownAt, setEliPromptShownAt] = useState<Record<string, number>>({});
  const markEliPromptShown = useCallback((threadId: string) => {
    setEliPromptShownAt((prev) => ({ ...prev, [threadId]: Date.now() }));
  }, []);

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
      eliPromptEnabled,
      setEliPromptEnabled,
      promptOptionOffEnabled,
      setPromptOptionOffEnabled,
      promptOptionKeepOnEnabled,
      setPromptOptionKeepOnEnabled,
      eliPromptCadenceMinutes,
      setEliPromptCadenceMinutes,
      eliPromptCadenceUnit,
      setEliPromptCadenceUnit,
      eliPromptDefaultOption,
      setEliPromptDefaultOption,
      eliModeByThreadId,
      setEliMode,
      eliPromptShownAt,
      markEliPromptShown,
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
      eliPromptEnabled,
      promptOptionOffEnabled,
      promptOptionKeepOnEnabled,
      eliPromptCadenceMinutes,
      setEliPromptCadenceMinutes,
      eliPromptCadenceUnit,
      eliPromptDefaultOption,
      eliModeByThreadId,
      setEliMode,
      eliPromptShownAt,
      markEliPromptShown,
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
