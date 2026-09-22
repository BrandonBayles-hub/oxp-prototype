"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Check,
  GripVertical,
  Headphones,
  Phone,
  PhoneIncoming,
  PhoneOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type InboundCallSessionInput = {
  id: string;
  callerName: string;
  callerPhone: string;
  propertyName: string;
  propertyLine: string;
  callerType: "resident" | "prospect" | "lead" | "unknown";
  unit?: string;
  leaseEnd?: string;
  balance?: string;
  autoPay?: boolean;
  openWorkOrders?: number;
  lastPayment?: string;
  tourScheduled?: string;
  applicationStatus?: string;
  leadSource?: string;
  preferredFloorPlan?: string;
  moveInDate?: string;
  ivrSelection?: string;
  aiContextNote?: string;
  /** Routing metadata populated by `GlobalInboundCallHandler`. */
  routing?: {
    routeLabel: string; // e.g. "Hillside Living — Main"
    queueId: string;
    queueName: string;
    ivrPressed?: string; // "Press 1 — Leasing & Tours"
    positionInQueue: number;
    estimatedWaitSec: number;
    assignedAgentName?: string;
    assignedAgentRole?: string;
    assignedAgentInitials?: string;
    strategyLabel: string; // "Longest idle"
    slaTargetPct: number;
    slaTargetSec: number;
  };
};

type CallPhase = "ringing" | "connected" | "ended" | "missed";

const PANEL_MAX_W = 320;
const PANEL_MARGIN = 16;
const PANEL_TOP_OFFSET = 80;
function getPanelTopRightPosition(): { x: number; y: number } {
  if (typeof window === "undefined") return { x: 24, y: PANEL_TOP_OFFSET };
  const panelW = Math.min(window.innerWidth, PANEL_MAX_W);
  return {
    x: window.innerWidth - panelW,
    y: PANEL_TOP_OFFSET,
  };
}

function clampPosition(x: number, y: number): { x: number; y: number } {
  if (typeof window === "undefined") return { x, y };
  const panelW = Math.min(window.innerWidth, PANEL_MAX_W);
  const maxX = Math.max(0, window.innerWidth - panelW);
  const maxY = Math.max(PANEL_MARGIN, window.innerHeight - 120);
  return {
    x: Math.min(Math.max(0, x), maxX),
    y: Math.min(Math.max(PANEL_MARGIN, y), maxY),
  };
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type Props = {
  session: InboundCallSessionInput | null;
  onDismiss: () => void;
  onAnswered?: (session: InboundCallSessionInput) => void;
};

export function InboundCallFloatingPanel({ session, onDismiss, onAnswered }: Props) {
  const [position, setPosition] = useState(() => ({ x: 0, y: PANEL_TOP_OFFSET }));
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const [phase, setPhase] = useState<CallPhase>("ringing");
  const [durationSec, setDurationSec] = useState(0);
  const [callNotes, setCallNotes] = useState("");
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [ringCount, setRingCount] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (ringTimerRef.current) { clearInterval(ringTimerRef.current); ringTimerRef.current = null; }
  }, []);

  useLayoutEffect(() => {
    if (!session) return;
    setPosition(getPanelTopRightPosition());
  }, [session?.id]);

  useEffect(() => {
    if (!session) return;
    setPhase("ringing");
    setDurationSec(0);
    setCallNotes("");
    setIsAnimatingOut(false);
    setRingCount(0);
    clearTimers();

    ringTimerRef.current = setInterval(() => {
      setRingCount((n) => n + 1);
    }, 3000);

    return clearTimers;
  }, [session, clearTimers]);

  useEffect(() => {
    if (phase === "ringing" && ringCount >= 10) {
      clearTimers();
      setPhase("missed");
    }
  }, [phase, ringCount, clearTimers]);

  const answerCall = () => {
    clearTimers();
    setPhase("connected");
    timerRef.current = setInterval(() => {
      setDurationSec((n) => n + 1);
    }, 1000);
    if (session && onAnswered) onAnswered(session);
  };

  const declineCall = () => {
    clearTimers();
    setPhase("missed");
  };

  const hangUp = () => {
    clearTimers();
    setPhase("ended");
  };

  const dismissPanel = () => {
    setIsAnimatingOut(true);
    setTimeout(() => onDismiss(), 300);
  };

  const handlePointerDownHeader = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: position.x, origY: position.y };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPosition(clampPosition(dragRef.current.origX + dx, dragRef.current.origY + dy));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    dragRef.current = null;
  };

  if (!session) return null;

  const callEnded = phase === "ended" || phase === "missed";

  const statusLabel =
    phase === "ringing" ? "Incoming call…"
    : phase === "connected" ? `On call · ${formatDuration(durationSec)}`
    : phase === "missed" ? "Missed call"
    : "Call ended";

  const callerTypeLabel =
    session.callerType === "resident" ? "Resident"
    : session.callerType === "lead" ? "Lead"
    : session.callerType === "prospect" ? "Prospect"
    : "Unknown";

  return (
    <div className="pointer-events-none fixed inset-0 z-[100]" aria-hidden={false}>
      <div
        key={session.id}
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
          className={cn(
            "flex cursor-grab items-center gap-2 border-b px-3 py-2.5 active:cursor-grabbing",
            phase === "ringing"
              ? "border-emerald-300 bg-emerald-600 text-white"
              : "border-border bg-muted/40"
          )}
          onPointerDown={handlePointerDownHeader}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <GripVertical className={cn("h-4 w-4 shrink-0", phase === "ringing" ? "text-white/60" : "text-muted-foreground")} aria-hidden />
          <div className="relative flex items-center justify-center">
            <PhoneIncoming className={cn("h-4 w-4 shrink-0", phase === "ringing" ? "text-white animate-pulse" : "text-muted-foreground")} aria-hidden />
            {phase === "ringing" && (
              <span className="absolute -inset-1.5 animate-ping rounded-full bg-white/20" />
            )}
          </div>
          <span className={cn("min-w-0 flex-1 truncate text-sm font-semibold", phase === "ringing" ? "text-white" : "text-foreground")}>
            {phase === "ringing" ? "Incoming Call" : session.propertyName}
          </span>
          {phase === "connected" && (
            <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
              <Headphones className="h-3 w-3" />
              <span className="italic">{statusLabel}</span>
            </div>
          )}
          {phase !== "connected" && (
            <span className={cn(
              "shrink-0 text-[11px] italic",
              phase === "ringing" ? "text-white/80 font-medium" : "text-muted-foreground",
              phase === "missed" && "text-destructive"
            )}>
              {statusLabel}
            </span>
          )}
        </div>

        <div className="max-h-[min(90vh,900px)] overflow-y-auto">
          {/* Ringing state — urgent incoming call UI */}
          {phase === "ringing" && (
            <div className="px-3 pt-3 pb-1">
              <div className="flex items-center gap-3">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 shrink-0">
                  <Phone className="h-5 w-5 text-emerald-600" />
                  <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" style={{ animationDuration: "1.5s" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-foreground leading-tight">{session.callerName}</p>
                  <p className="font-mono text-xs text-muted-foreground">{session.callerPhone}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{session.propertyName}{session.ivrSelection && <> · {session.ivrSelection}</>}</p>
                </div>
                <div className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 shrink-0">
                  {callerTypeLabel}
                </div>
              </div>

              {/* Routing card — shows the queue that picked up this call,
                  which IVR option the caller pressed, their position in the
                  queue, and the agent we'll ring first. Only rendered when
                  the global handler populated `session.routing` (i.e. the
                  Call System settings are wired up); otherwise we fall back
                  to the plain caller-only ringing UI above. */}
              {session.routing && (
                <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-emerald-900">
                        {session.routing.queueName}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-emerald-800/80">
                        {session.routing.routeLabel}
                        {session.routing.ivrPressed && (
                          <> · {session.routing.ivrPressed}</>
                        )}
                      </p>
                    </div>
                    <div className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                      #{session.routing.positionInQueue} in queue
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-emerald-900/80">
                    <span>
                      Strategy: <span className="font-semibold">{session.routing.strategyLabel}</span>
                    </span>
                    <span>
                      SLA: <span className="font-semibold">{session.routing.slaTargetPct}% / {session.routing.slaTargetSec}s</span>
                    </span>
                    {session.routing.estimatedWaitSec > 0 && (
                      <span>
                        Est wait:{" "}
                        <span className="font-semibold">{Math.round(session.routing.estimatedWaitSec / 60) || 1}m</span>
                      </span>
                    )}
                  </div>
                  {session.routing.assignedAgentName && (
                    <div className="mt-1.5 flex items-center gap-2 border-t border-emerald-200 pt-1.5">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white">
                        {session.routing.assignedAgentInitials || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold text-emerald-900">
                          Ringing {session.routing.assignedAgentName}
                        </p>
                        {session.routing.assignedAgentRole && (
                          <p className="truncate text-[10px] text-emerald-800/80">
                            {session.routing.assignedAgentRole}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <Button
                  type="button"
                  className="flex-1 gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={answerCall}
                >
                  <Phone className="h-4 w-4" />
                  Answer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 gap-2 text-muted-foreground"
                  onClick={declineCall}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          {/* Connected / ended — dark contact card matching click-to-call */}
          {phase !== "ringing" && (
            <div className="mx-3 mt-3 rounded-md bg-primary px-3 py-3 text-primary-foreground">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight">{session.callerName}</p>
                  <p className="mt-0.5 font-mono text-xs tabular-nums text-primary-foreground/85">
                    {session.callerPhone}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/15 px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                      <PhoneIncoming className="h-3 w-3 shrink-0" aria-hidden />
                      Inbound · {callerTypeLabel}
                    </span>
                    {session.routing && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/25 px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                        Queue · {session.routing.queueName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {phase === "connected" && (
                    <Button type="button" size="sm" variant="destructive" className="h-8 gap-1.5" onClick={hangUp}>
                      <PhoneOff className="h-3.5 w-3.5 shrink-0" />
                      Hang up
                    </Button>
                  )}
                  {phase === "ended" && (
                    <div className="flex max-w-[9rem] flex-col items-end gap-0.5 text-right">
                      <span className="text-xs font-semibold leading-tight text-primary-foreground">
                        Call ended
                      </span>
                      <span className="text-[10px] leading-snug text-primary-foreground/80 tabular-nums">
                        Duration {formatDuration(durationSec)}
                      </span>
                    </div>
                  )}
                  {phase === "missed" && (
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="text-right">
                        <span className="text-xs font-semibold leading-tight text-primary-foreground">Missed</span>
                        <p className="text-[10px] leading-snug text-primary-foreground/80">Routed to voicemail</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={() => {
                          if (onAnswered && session) onAnswered(session);
                        }}
                      >
                        <Phone className="h-3 w-3" />
                        Call Back
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3 px-3 py-3">
            {/* Screen pop info */}
            {session.callerType === "resident" && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Screen Pop</p>
                <div className="grid grid-cols-2 gap-2">
                  {session.unit && (
                    <div className="rounded border border-border bg-background px-2.5 py-1.5">
                      <p className="text-[10px] text-muted-foreground">Unit</p>
                      <p className="text-sm font-medium">{session.unit}</p>
                    </div>
                  )}
                  {session.leaseEnd && (
                    <div className="rounded border border-border bg-background px-2.5 py-1.5">
                      <p className="text-[10px] text-muted-foreground">Lease End</p>
                      <p className="text-sm font-medium">{session.leaseEnd}</p>
                    </div>
                  )}
                  {session.balance && (
                    <div className="rounded border border-border bg-background px-2.5 py-1.5">
                      <p className="text-[10px] text-muted-foreground">Balance</p>
                      <p className={cn("text-sm font-medium", session.balance !== "$0.00" && "text-amber-600")}>
                        {session.balance}
                      </p>
                    </div>
                  )}
                  {session.openWorkOrders !== undefined && (
                    <div className="rounded border border-border bg-background px-2.5 py-1.5">
                      <p className="text-[10px] text-muted-foreground">Work Orders</p>
                      <p className={cn("text-sm font-medium", session.openWorkOrders > 0 && "text-amber-600")}>
                        {session.openWorkOrders}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {session.callerType === "lead" && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Screen Pop</p>
                <div className="grid grid-cols-2 gap-2">
                  {session.leadSource && (
                    <div className="rounded border border-border bg-background px-2.5 py-1.5">
                      <p className="text-[10px] text-muted-foreground">Lead Source</p>
                      <p className="text-sm font-medium">{session.leadSource}</p>
                    </div>
                  )}
                  {session.preferredFloorPlan && (
                    <div className="rounded border border-border bg-background px-2.5 py-1.5">
                      <p className="text-[10px] text-muted-foreground">Floor Plan</p>
                      <p className="text-sm font-medium">{session.preferredFloorPlan}</p>
                    </div>
                  )}
                  {session.moveInDate && (
                    <div className="rounded border border-border bg-background px-2.5 py-1.5">
                      <p className="text-[10px] text-muted-foreground">Move-in</p>
                      <p className="text-sm font-medium">{session.moveInDate}</p>
                    </div>
                  )}
                  {session.tourScheduled && (
                    <div className="rounded border border-border bg-background px-2.5 py-1.5">
                      <p className="text-[10px] text-muted-foreground">Tour</p>
                      <p className="text-sm font-medium">{session.tourScheduled}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {session.callerType === "prospect" && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Caller Info</p>
                <p className="text-xs text-muted-foreground">
                  No matching record found for {session.callerPhone}
                </p>
              </div>
            )}

            {session.aiContextNote && (
              <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-900/40 dark:bg-blue-950/30">
                <p className="text-[10px] font-medium text-blue-700 dark:text-blue-300">AI Context</p>
                <p className="mt-0.5 text-xs leading-snug text-blue-800 dark:text-blue-200">{session.aiContextNote}</p>
              </div>
            )}

            {/* Call notes */}
            <div>
              <p className="text-sm font-semibold text-foreground">Call Notes</p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                Optional. Add notes during or after the call.
              </p>
              <textarea
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                placeholder="Add a note (optional)…"
                rows={3}
                className="mt-2 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>

          {/* Footer */}
          {(callEnded || phase === "ringing") && (
            <div className="border-t border-border bg-muted/40 px-3 py-3">
              {callEnded ? (
                <Button type="button" size="sm" className="w-full gap-2 sm:w-auto" onClick={dismissPanel}>
                  <Check className="h-3.5 w-3.5" />
                  Save &amp; close
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Routing via <span className="font-medium">{session.propertyLine}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
