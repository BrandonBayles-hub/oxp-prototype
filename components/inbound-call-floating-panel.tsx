"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Building,
  Calendar,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  CreditCard,
  GripVertical,
  Headphones,
  Home,
  Mic,
  MicOff,
  Pause,
  Phone,
  PhoneForwarded,
  PhoneIncoming,
  PhoneOff,
  Play,
  Search,
  UserMinus,
  Users,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type InboundCallSessionInput = {
  id: string;
  callerName: string;
  callerPhone: string;
  propertyName: string;
  propertyLine: string;
  callerType: "resident" | "prospect" | "unknown";
  unit?: string;
  leaseEnd?: string;
  balance?: string;
  autoPay?: boolean;
  openWorkOrders?: number;
  lastPayment?: string;
  tourScheduled?: string;
  applicationStatus?: string;
  ivrSelection?: string;
  aiContextNote?: string;
};

type CallPhase = "ringing" | "connected" | "ended" | "missed";

const PANEL_MAX_W = 400;
const PANEL_MARGIN = 16;
const PANEL_TOP_OFFSET = 80;

function getPanelTopRightPosition(): { x: number; y: number } {
  if (typeof window === "undefined") return { x: 24, y: PANEL_TOP_OFFSET };
  const panelW = Math.min(window.innerWidth - PANEL_MARGIN * 2, PANEL_MAX_W);
  return {
    x: Math.max(PANEL_MARGIN, window.innerWidth - panelW - PANEL_MARGIN),
    y: PANEL_TOP_OFFSET,
  };
}

function clampPosition(x: number, y: number): { x: number; y: number } {
  if (typeof window === "undefined") return { x, y };
  const panelW = Math.min(window.innerWidth - PANEL_MARGIN * 2, PANEL_MAX_W);
  const maxX = Math.max(PANEL_MARGIN, window.innerWidth - panelW - PANEL_MARGIN);
  const maxY = Math.max(PANEL_MARGIN, window.innerHeight - 120);
  return {
    x: Math.min(Math.max(PANEL_MARGIN, x), maxX),
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
};

export function InboundCallFloatingPanel({ session, onDismiss }: Props) {
  const [position, setPosition] = useState(() => ({ x: 0, y: PANEL_TOP_OFFSET }));
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const [phase, setPhase] = useState<CallPhase>("ringing");
  const [durationSec, setDurationSec] = useState(0);
  const [muted, setMuted] = useState(false);
  const [onHold, setOnHold] = useState(false);
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
    setMuted(false);
    setOnHold(false);
    setCallNotes("");
    setIsAnimatingOut(false);
    setRingCount(0);
    clearTimers();

    ringTimerRef.current = setInterval(() => {
      setRingCount((n) => n + 1);
    }, 3000);

    return clearTimers;
  }, [session, clearTimers]);

  // Auto-miss after ~30s of ringing
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

  const statusLabel =
    phase === "ringing" ? "Incoming call…"
    : phase === "connected" ? (onHold ? `On hold · ${formatDuration(durationSec)}` : `On call · ${formatDuration(durationSec)}`)
    : phase === "missed" ? "Missed call"
    : "Call ended";

  return (
    <div className="pointer-events-none fixed inset-0 z-[100]" aria-hidden={false}>
      <div
        key={session.id}
        className={cn(
          "pointer-events-auto absolute w-[min(100vw-1rem,400px)] overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xl duration-300",
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
            phase === "ringing" ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/40" : "border-border bg-muted/40"
          )}
          onPointerDown={handlePointerDownHeader}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          {phase === "ringing" && (
            <PhoneIncoming className="h-4 w-4 shrink-0 text-emerald-600 animate-pulse" aria-hidden />
          )}
          {phase !== "ringing" && (
            <Phone className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {session.propertyName}
          </span>
          <span className={cn(
            "shrink-0 text-[11px] italic",
            phase === "ringing" ? "text-emerald-700 dark:text-emerald-300 font-medium" : "text-muted-foreground",
            phase === "missed" && "text-amber-600"
          )}>
            {statusLabel}
          </span>
        </div>

        <div className="max-h-[min(85vh,700px)] overflow-y-auto">
          {/* Ringing state - prominent answer/decline */}
          {phase === "ringing" && (
            <div className="px-3 pt-3 pb-2">
              <div className="rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-4 dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-green-950/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                    <PhoneIncoming className="h-6 w-6 text-emerald-600 animate-pulse" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold text-foreground">{session.callerName}</p>
                    <p className="font-mono text-sm text-muted-foreground">{session.callerPhone}</p>
                    {session.ivrSelection && (
                      <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                        IVR: {session.ivrSelection}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
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
                    className="flex-1 gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={declineCall}
                  >
                    <PhoneOff className="h-4 w-4" />
                    Decline
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Screen Pop - Entrata Record (visible on ringing and connected) */}
          {(phase === "ringing" || phase === "connected") && session.callerType !== "unknown" && (
            <div className="px-3 py-2">
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Entrata Record
                  </p>
                  <Badge variant={session.callerType === "resident" ? "default" : "secondary"} className="text-[10px]">
                    {session.callerType === "resident" ? "Resident" : "Prospect"}
                  </Badge>
                </div>

                {session.callerType === "resident" && (
                  <div className="space-y-2">
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
                      {session.autoPay !== undefined && (
                        <div className="rounded border border-border bg-background px-2.5 py-1.5">
                          <p className="text-[10px] text-muted-foreground">Auto-Pay</p>
                          <p className={cn("text-sm font-medium", session.autoPay ? "text-emerald-600" : "text-muted-foreground")}>
                            {session.autoPay ? "Active" : "Off"}
                          </p>
                        </div>
                      )}
                    </div>
                    {(session.openWorkOrders !== undefined || session.lastPayment) && (
                      <div className="grid grid-cols-2 gap-2">
                        {session.openWorkOrders !== undefined && (
                          <div className="rounded border border-border bg-background px-2.5 py-1.5">
                            <p className="text-[10px] text-muted-foreground">Open Work Orders</p>
                            <p className={cn("text-sm font-medium", session.openWorkOrders > 0 && "text-amber-600")}>
                              {session.openWorkOrders}
                            </p>
                          </div>
                        )}
                        {session.lastPayment && (
                          <div className="rounded border border-border bg-background px-2.5 py-1.5">
                            <p className="text-[10px] text-muted-foreground">Last Payment</p>
                            <p className="text-sm font-medium">{session.lastPayment}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {session.aiContextNote && (
                      <div className="rounded border border-blue-200 bg-blue-50 px-2.5 py-2 dark:border-blue-900/40 dark:bg-blue-950/30">
                        <p className="text-[10px] font-medium text-blue-700 dark:text-blue-300">AI Context</p>
                        <p className="mt-0.5 text-xs text-blue-800 dark:text-blue-200">{session.aiContextNote}</p>
                      </div>
                    )}
                  </div>
                )}

                {session.callerType === "prospect" && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {session.tourScheduled && (
                        <div className="rounded border border-border bg-background px-2.5 py-1.5">
                          <p className="text-[10px] text-muted-foreground">Tour Scheduled</p>
                          <p className="text-sm font-medium">{session.tourScheduled}</p>
                        </div>
                      )}
                      {session.applicationStatus && (
                        <div className="rounded border border-border bg-background px-2.5 py-1.5">
                          <p className="text-[10px] text-muted-foreground">Application</p>
                          <p className="text-sm font-medium">{session.applicationStatus}</p>
                        </div>
                      )}
                    </div>
                    {session.aiContextNote && (
                      <div className="rounded border border-blue-200 bg-blue-50 px-2.5 py-2 dark:border-blue-900/40 dark:bg-blue-950/30">
                        <p className="text-[10px] font-medium text-blue-700 dark:text-blue-300">AI Context</p>
                        <p className="mt-0.5 text-xs text-blue-800 dark:text-blue-200">{session.aiContextNote}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Unknown caller */}
          {(phase === "ringing" || phase === "connected") && session.callerType === "unknown" && (
            <div className="px-3 py-2">
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Caller Info
                  </p>
                  <Badge variant="outline" className="text-[10px]">Unknown</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  No matching record found for {session.callerPhone}
                </p>
                <Button variant="outline" size="sm" className="mt-2 h-7 gap-1.5 text-xs">
                  <Search className="h-3 w-3" />
                  Search Records
                </Button>
              </div>
            </div>
          )}

          {/* Active call controls */}
          {phase === "connected" && (
            <div className="px-3 py-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={muted ? "destructive" : "outline"}
                  size="sm"
                  className="h-9 flex-1 gap-1.5 text-xs"
                  onClick={() => setMuted(!muted)}
                >
                  {muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                  {muted ? "Unmute" : "Mute"}
                </Button>
                <Button
                  type="button"
                  variant={onHold ? "secondary" : "outline"}
                  size="sm"
                  className="h-9 flex-1 gap-1.5 text-xs"
                  onClick={() => setOnHold(!onHold)}
                >
                  {onHold ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  {onHold ? "Resume" : "Hold"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 flex-1 gap-1.5 text-xs"
                >
                  <PhoneForwarded className="h-3.5 w-3.5" />
                  Transfer
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="h-9 gap-1.5 text-xs"
                  onClick={hangUp}
                >
                  <PhoneOff className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Live transcription preview (during connected call) */}
          {phase === "connected" && (
            <div className="px-3 py-2">
              <div className="rounded border border-border bg-muted/30 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Live Transcription
                </p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><span className="font-medium text-foreground">{session.callerName}:</span> Hi, I&apos;m calling about…</p>
                  <p className="animate-pulse text-muted-foreground/60">Listening…</p>
                </div>
              </div>
            </div>
          )}

          {/* Call notes (connected and ended) */}
          {(phase === "connected" || phase === "ended") && (
            <div className="px-3 py-2">
              <label className="text-xs font-medium text-muted-foreground">Call Notes</label>
              <textarea
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                placeholder="Add notes during or after the call…"
                rows={3}
                className="mt-1 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          )}

          {/* Missed / ended state */}
          {phase === "missed" && (
            <div className="px-3 py-3">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/30">
                <div className="flex gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100">Missed Call</p>
                    <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
                      {session.callerName} ({session.callerPhone}) — routed to voicemail
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {phase === "ended" && (
            <div className="px-3 py-2">
              <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Call completed</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">Duration: {formatDuration(durationSec)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="border-t border-border bg-muted/40 px-3 py-2.5">
            {phase === "ended" || phase === "missed" ? (
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" className="gap-1.5" onClick={dismissPanel}>
                  <Check className="h-3.5 w-3.5" />
                  Save & Close
                </Button>
                {phase === "missed" && (
                  <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs">
                    <Phone className="h-3.5 w-3.5" />
                    Call Back
                  </Button>
                )}
              </div>
            ) : phase === "ringing" ? (
              <p className="text-xs text-muted-foreground">
                Routing via <span className="font-medium">{session.propertyLine}</span>
                {session.ivrSelection && <> · IVR selection: {session.ivrSelection}</>}
              </p>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Headphones className="h-3.5 w-3.5" />
                  <span>Recording active</span>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {formatDuration(durationSec)}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
