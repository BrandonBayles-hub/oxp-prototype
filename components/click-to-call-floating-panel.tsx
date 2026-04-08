"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, GripVertical, Phone, PhoneOff, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_CONVERSATION_ACTIVITY_ACTOR,
  useConversations,
} from "@/lib/conversations-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ClickToCallSessionInput = {
  conversationId: string;
  residentName: string;
  propertyName: string;
  /** Display line e.g. +1 720-555-1234 */
  phoneDisplay: string;
};

type CallPhase = "dialing" | "connected" | "failed";

type Props = {
  session: ClickToCallSessionInput | null;
  onDismiss: () => void;
  assigneeOptions: { value: string; label: string }[];
  defaultAssigneeValue: string;
};

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ClickToCallFloatingPanel({
  session,
  onDismiss,
  assigneeOptions,
  defaultAssigneeValue,
}: Props) {
  const { recordThreadActivity } = useConversations();

  const [position, setPosition] = useState({ x: 80, y: 100 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(
    null
  );

  const [phase, setPhase] = useState<CallPhase>("dialing");
  const [callLegEnded, setCallLegEnded] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [followAssignee, setFollowAssignee] = useState(defaultAssigneeValue);
  const [followDue, setFollowDue] = useState("");
  const [callNotes, setCallNotes] = useState("");
  const [callOutcome, setCallOutcome] = useState<"connected" | "failed" | "cancelled" | null>(null);
  const [durationAtHangup, setDurationAtHangup] = useState<number | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    if (!session) return;
    setPhase("dialing");
    setCallLegEnded(false);
    setDurationSec(0);
    setFollowAssignee(defaultAssigneeValue);
    setFollowDue("");
    setCallNotes("");
    setCallOutcome(null);
    setDurationAtHangup(null);
    setSaveSuccess(false);
    setSaveError(null);
    clearTimers();

    connectTimerRef.current = setTimeout(() => {
      connectTimerRef.current = null;
      const fail = Math.random() < 0.35;
      if (fail) setPhase("failed");
      else {
        setPhase("connected");
        timerRef.current = setInterval(() => {
          setDurationSec((n) => n + 1);
        }, 1000);
      }
    }, 2000);

    return () => clearTimers();
  }, [session, defaultAssigneeValue, clearTimers]);

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
    const maxX = typeof window !== "undefined" ? window.innerWidth - 340 : 800;
    const maxY = typeof window !== "undefined" ? window.innerHeight - 120 : 600;
    setPosition({
      x: Math.min(Math.max(8, dragRef.current.origX + dx), maxX),
      y: Math.min(Math.max(8, dragRef.current.origY + dy), maxY),
    });
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
    connectTimerRef.current = setTimeout(() => {
      connectTimerRef.current = null;
      const fail = Math.random() < 0.35;
      if (fail) setPhase("failed");
      else {
        setPhase("connected");
        timerRef.current = setInterval(() => {
          setDurationSec((n) => n + 1);
        }, 1000);
      }
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
    if (!notesTrim) {
      setSaveError("Add call notes before saving — they are stored on the activity log entry.");
      return;
    }
    setSaveError(null);
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
      followUpAssignee: followAssignee,
      followUpDue: followDue || undefined,
    });
    setSaveSuccess(true);
    window.setTimeout(() => {
      onDismiss();
    }, 2200);
  };

  if (!session) return null;

  const statusLabel =
    phase === "dialing"
      ? "Connecting…"
      : phase === "failed"
        ? "Call failed"
        : callLegEnded
          ? "Call ended"
          : `On call · ${formatDuration(durationSec)}`;

  const notesOk = callNotes.trim().length > 0;
  const canSaveOrClose = callLegEnded && notesOk && !saveSuccess;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[100]"
      aria-hidden={false}
    >
      <div
        className="pointer-events-auto absolute w-[min(100vw-1rem,380px)] overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-lg"
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

        <div className="max-h-[min(85vh,640px)] overflow-y-auto">
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
                  <span className="text-[10px] text-primary-foreground/70">Line cleared</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 px-3 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Schedule Follow Up</p>
              <div className="mt-2 space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="ctc-assignee" className="text-xs font-medium text-muted-foreground">
                    Assignee
                  </label>
                  <Select value={followAssignee} onValueChange={setFollowAssignee}>
                    <SelectTrigger id="ctc-assignee" className="h-9 text-xs">
                      <SelectValue placeholder="Assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      {assigneeOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-xs">
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="ctc-due" className="text-xs font-medium text-muted-foreground">
                    Due Date
                  </label>
                  <Input
                    id="ctc-due"
                    type="date"
                    value={followDue}
                    onChange={(e) => setFollowDue(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground">Call Notes</p>
              <textarea
                value={callNotes}
                onChange={(e) => {
                  setCallNotes(e.target.value);
                  if (saveError) setSaveError(null);
                }}
                placeholder="Add a note…"
                rows={4}
                aria-invalid={Boolean(saveError)}
                className={cn(
                  "mt-2 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  saveError ? "border-destructive" : "border-input"
                )}
              />
              {saveError ? (
                <p className="mt-1.5 text-xs text-destructive" role="alert">
                  {saveError}
                </p>
              ) : (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Notes are required and appear on the conversation activity log when you save.
                </p>
              )}
            </div>

            {!callLegEnded && (
              <p className="text-[10px] leading-snug text-amber-800/90">
                Hang up, cancel while connecting, or end a failed session before you can save and close.
              </p>
            )}
            {callLegEnded && !notesOk && !saveSuccess && (
              <p className="text-[10px] leading-snug text-muted-foreground">
                Enter call notes above to enable Save &amp; close.
              </p>
            )}
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
                    This call and your notes were added to the thread timeline. Closing…
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
