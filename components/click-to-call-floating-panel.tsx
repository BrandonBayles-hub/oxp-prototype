"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  GripVertical,
  Headphones,
  Phone,
  PhoneForwarded,
  PhoneOff,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_CONVERSATION_ACTIVITY_ACTOR,
  useConversations,
} from "@/lib/conversations-context";
import { cn } from "@/lib/utils";

export type ClickToCallOrigin = "voip" | "callback";

export type ClickToCallSessionInput = {
  conversationId: string;
  residentName: string;
  propertyName: string;
  /** Display line e.g. +1 720-555-1234 */
  phoneDisplay: string;
  /**
   * How the call was initiated:
   *  - "voip": agent is on computer audio
   *  - "callback": platform rings the agent's other number first, then connects
   */
  origin?: ClickToCallOrigin;
  /** When origin = "callback", the number the platform should ring first. */
  callbackNumberDisplay?: string;
  /**
   * Number chosen by the property to use for callback dialing (routing/vanity line).
   * Pre-filled in the callback UI so the agent doesn't have to type it.
   */
  propertyRingNumberDisplay?: string;
  /** Whether the contact is a prospect lead or an existing resident — tailors dialog copy. */
  contactRole?: "lead" | "resident";
};

type CallPhase = "dialing" | "connected" | "failed";

type Props = {
  session: ClickToCallSessionInput | null;
  onDismiss: () => void;
};

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const CALL_PANEL_MAX_W = 320;
const CALL_PANEL_MARGIN = 16;
/** Below Entrata-style top chrome (~76px) with small gap. */
const CALL_PANEL_TOP_OFFSET = 80;

function getCallPanelTopRightPosition(): { x: number; y: number } {
  if (typeof window === "undefined") {
    return { x: 24, y: CALL_PANEL_TOP_OFFSET };
  }
  const panelW = Math.min(window.innerWidth - CALL_PANEL_MARGIN * 2, CALL_PANEL_MAX_W);
  return {
    x: window.innerWidth - panelW,
    y: CALL_PANEL_TOP_OFFSET,
  };
}

function clampPanelPosition(x: number, y: number): { x: number; y: number } {
  if (typeof window === "undefined") return { x, y };
  const panelW = Math.min(window.innerWidth, CALL_PANEL_MAX_W);
  const maxX = Math.max(0, window.innerWidth - panelW);
  const maxY = Math.max(CALL_PANEL_MARGIN, window.innerHeight - 120);
  return {
    x: Math.min(Math.max(0, x), maxX),
    y: Math.min(Math.max(CALL_PANEL_MARGIN, y), maxY),
  };
}

export function ClickToCallFloatingPanel({
  session,
  onDismiss,
}: Props) {
  const { recordThreadActivity } = useConversations();

  const [position, setPosition] = useState(() => ({
    x: 0,
    y: CALL_PANEL_TOP_OFFSET,
  }));
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(
    null
  );

  const [phase, setPhase] = useState<CallPhase>("dialing");
  const [callLegEnded, setCallLegEnded] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [callNotes, setCallNotes] = useState("");
  const [callOutcome, setCallOutcome] = useState<"connected" | "failed" | "cancelled" | null>(null);
  const [durationAtHangup, setDurationAtHangup] = useState<number | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** DOM timers use numeric ids; avoids Node `Timeout` vs `number` mismatch in this file. */
  const dismissTimeoutsRef = useRef<{ outer?: number; inner?: number }>({});

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (connectTimerRef.current) {
      clearTimeout(connectTimerRef.current);
      connectTimerRef.current = null;
    }
  }, []);

  const clearDismissSchedule = useCallback(() => {
    const t = dismissTimeoutsRef.current;
    if (t.outer) clearTimeout(t.outer);
    if (t.inner) clearTimeout(t.inner);
    dismissTimeoutsRef.current = {};
  }, []);

  useLayoutEffect(() => {
    if (!session) return;
    setPosition(getCallPanelTopRightPosition());
  }, [session?.conversationId]);

  useEffect(() => {
    if (!session) return;
    setPhase("dialing");
    setCallLegEnded(false);
    setDurationSec(0);
    setCallNotes("");
    setCallOutcome(null);
    setDurationAtHangup(null);
    setSaveSuccess(false);
    setIsAnimatingOut(false);
    clearTimers();
    clearDismissSchedule();

    // Demo-only: always connect after the 2s dialing animation. We
    // previously had a `Math.random() < 0.35` failure roll here that
    // randomly showed the "Call Failed to Connect" state — removed
    // because it derails demos.
    connectTimerRef.current = setTimeout(() => {
      connectTimerRef.current = null;
      setPhase("connected");
      timerRef.current = setInterval(() => {
        setDurationSec((n) => n + 1);
      }, 1000);
    }, 2000);

    return () => {
      clearTimers();
      clearDismissSchedule();
    };
  }, [session, clearTimers, clearDismissSchedule]);

  const handlePointerDownHeader = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: position.x,
      origY: position.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPosition(
      clampPanelPosition(dragRef.current.origX + dx, dragRef.current.origY + dy)
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    dragRef.current = null;
  };

  const hangUp = () => {
    const elapsed = durationSec;
    clearTimers();
    setCallLegEnded(true);
    setCallOutcome("connected");
    setDurationAtHangup(elapsed);
    if (phase === "connected") setPhase("connected");
  };

  const endFailedSession = () => {
    setCallLegEnded(true);
    setCallOutcome("failed");
  };

  const retryCall = () => {
    setPhase("dialing");
    setCallLegEnded(false);
    setDurationSec(0);
    setCallOutcome(null);
    setDurationAtHangup(null);
    clearTimers();
    // Retry always connects — kept as a harmless no-op path since the
    // failed state can no longer be reached (Math.random failure roll
    // was removed). Left in place so the "Call" retry button on the
    // failed UI still resolves cleanly if the failure state is ever
    // reintroduced.
    connectTimerRef.current = setTimeout(() => {
      connectTimerRef.current = null;
      setPhase("connected");
      timerRef.current = setInterval(() => {
        setDurationSec((n) => n + 1);
      }, 1000);
    }, 2000);
  };

  const cancelWhileDialing = () => {
    clearTimers();
    setCallLegEnded(true);
    setCallOutcome("cancelled");
    setDurationAtHangup(null);
  };

  const handleSaveAndClose = () => {
    if (!session || !callLegEnded) return;
    const notesTrim = callNotes.trim();
    const outcome = callOutcome ?? "cancelled";
    const durationLabel =
      outcome === "connected"
        ? formatDuration(durationAtHangup ?? durationSec)
        : undefined;
    recordThreadActivity(session.conversationId, {
      kind: "phone_call",
      actor: DEFAULT_CONVERSATION_ACTIVITY_ACTOR,
      phoneNumber: session.phoneDisplay,
      outcome,
      durationLabel,
      notes: notesTrim,
      origin: session.origin,
      callbackNumber: session.callbackNumberDisplay,
    });
    setSaveSuccess(true);
    dismissTimeoutsRef.current.outer = window.setTimeout(() => {
      dismissTimeoutsRef.current.outer = undefined;
      setIsAnimatingOut(true);
      dismissTimeoutsRef.current.inner = window.setTimeout(() => {
        dismissTimeoutsRef.current.inner = undefined;
        onDismiss();
      }, 300);
    }, 1900);
  };

  if (!session) return null;

  const isCallback = session.origin === "callback";
  const statusLabel =
    phase === "dialing"
      ? isCallback
        ? "Ringing your phone…"
        : "Connecting…"
      : phase === "failed"
        ? "Call failed"
        : callLegEnded
          ? "Call ended"
          : `On call · ${formatDuration(durationSec)}`;

  const canSaveOrClose = callLegEnded && !saveSuccess;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[100]"
      aria-hidden={false}
    >
      <div
        key={session.conversationId}
        className={cn(
          "pointer-events-auto absolute w-[min(100vw,320px)] overflow-hidden rounded-l-lg border border-r-0 border-border bg-card text-card-foreground shadow-lg duration-300",
          isAnimatingOut
            ? "animate-out slide-out-to-right fade-out zoom-out-95"
            : "animate-in slide-in-from-right fade-in zoom-in-95"
        )}
        style={{ left: position.x, top: position.y }}
      >
        {/* Draggable header */}
        <div
          className="flex cursor-grab items-center gap-2 border-b border-border bg-muted/40 px-3 py-2.5 active:cursor-grabbing"
          onPointerDown={handlePointerDownHeader}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <Users className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {session.propertyName}
          </span>
          <span
            className={cn(
              "shrink-0 text-[11px] italic text-muted-foreground",
              phase === "failed" && "text-destructive"
            )}
          >
            {statusLabel}
          </span>
        </div>

        <div className="max-h-[min(90vh,900px)] overflow-y-auto">
          {phase === "failed" && (
            <div className="mx-3 mt-3 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2.5">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-destructive">Call Failed to Connect</p>
                  <p className="mt-1 text-xs leading-snug text-destructive/90">
                    Unable to establish connection with {session.residentName}. Use Call to try again,
                    or end this session when you&apos;re done.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Contact + primary action */}
          <div className="mx-3 mt-3 rounded-md bg-primary px-3 py-3 text-primary-foreground">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">{session.residentName}</p>
                <p className="mt-0.5 font-mono text-xs tabular-nums text-primary-foreground/85">
                  {session.phoneDisplay}
                </p>
                <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary-foreground/15 px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                  {isCallback ? (
                    <>
                      <PhoneForwarded className="h-3 w-3 shrink-0" aria-hidden />
                      Callback
                      {session.callbackNumberDisplay ? (
                        <span className="font-mono tabular-nums opacity-85">
                          · {session.callbackNumberDisplay}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <Headphones className="h-3 w-3 shrink-0" aria-hidden />
                      Computer audio
                    </>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {phase === "dialing" && !callLegEnded && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-8 gap-1.5 border-0 bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25"
                    onClick={cancelWhileDialing}
                  >
                    <PhoneOff className="h-3.5 w-3.5 shrink-0" />
                    Cancel
                  </Button>
                )}
                {phase === "failed" && !callLegEnded && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={retryCall}
                    >
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      Call
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 border-primary-foreground/35 bg-transparent text-xs text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                      onClick={endFailedSession}
                    >
                      End session
                    </Button>
                  </>
                )}
                {phase === "connected" && !callLegEnded && (
                  <Button type="button" size="sm" variant="destructive" className="h-8 gap-1.5" onClick={hangUp}>
                    <PhoneOff className="h-3.5 w-3.5 shrink-0" />
                    Hang up
                  </Button>
                )}
                {phase === "connected" && callLegEnded && (
                  <div className="flex max-w-[9rem] flex-col items-end gap-0.5 text-right">
                    <span className="text-xs font-semibold leading-tight text-primary-foreground">Call ended</span>
                    <span className="text-[10px] leading-snug text-primary-foreground/80 tabular-nums">
                      {durationAtHangup != null
                        ? `Duration ${formatDuration(durationAtHangup)}`
                        : `Duration ${formatDuration(durationSec)}`}
                    </span>
                  </div>
                )}
                {phase === "dialing" && callLegEnded && (
                  <div className="flex max-w-[9rem] flex-col items-end text-right">
                    <span className="text-xs font-semibold leading-tight text-primary-foreground">
                      Call ended
                    </span>
                    <span className="text-[10px] leading-snug text-primary-foreground/80">
                      Cancelled before connect
                    </span>
                  </div>
                )}
                {phase === "failed" && callLegEnded && (
                  <div className="flex max-w-[9rem] flex-col items-end text-right">
                    <span className="text-xs font-semibold leading-tight text-primary-foreground">
                      Session ended
                    </span>
                    <span className="text-[10px] leading-snug text-primary-foreground/80">
                      No active call
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 px-3 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Call Notes</p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                Optional. Notes you add appear on the conversation activity log when you save.
              </p>
              <textarea
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                placeholder="Add a note (optional)…"
                rows={4}
                className={cn(
                  "mt-2 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  saveSuccess &&
                    "border-emerald-300 ring-2 ring-emerald-500/30 dark:border-emerald-700 dark:ring-emerald-500/25",
                  !saveSuccess && "border-input"
                )}
              />
            </div>
          </div>

          <div className="border-t border-border bg-muted/40 px-3 py-3">
            {saveSuccess ? (
              <div
                className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100"
                role="status"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="font-medium">Saved to activity log</p>
                  <p className="mt-0.5 text-xs leading-snug opacity-90">
                    Check the thread for the activity entry. Closing…
                  </p>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                size="sm"
                className="w-full gap-2 sm:w-auto"
                disabled={!canSaveOrClose}
                onClick={handleSaveAndClose}
              >
                Save &amp; close
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Schedule Follow Up UI (FollowUpAssigneePicker + AssigneeOptionRow)
// was removed here — the floating call panel no longer surfaces a
// post-call follow-up scheduler; call notes are the only capture.
// If we bring the scheduler back, pull the picker from git history
// rather than re-implementing the "Unassigned / Assign to me / Other
// users" grouped + searchable list.
