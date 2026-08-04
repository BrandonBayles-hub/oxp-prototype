"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Pause, Play, Sparkles, Voicemail } from "lucide-react";
import { AiStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VoicemailTranscriptTurn } from "@/lib/conversations-context";

function formatClock(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type Props = {
  durationSec: number;
  transcript: string;
  turns?: VoicemailTranscriptTurn[];
  fromNumber?: string;
  onCallBack?: () => void;
};

/**
 * Prototype voicemail card: a simulated audio player (no real file) that plays
 * a short synthesized tone via the Web Audio API so the "Play" button produces
 * audible feedback, and animates a progress bar across the stated duration.
 * The AI transcript sits beneath the player — collapsed to a short summary by
 * default, expandable to the full ELI ↔ resident dialog when present.
 */
export function VoicemailPlayer({ durationSec, transcript, turns, fromNumber, onCallBack }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const startAtRef = useRef<number | null>(null);
  const offsetRef = useRef(0);

  const stopTone = useCallback(() => {
    try {
      oscillatorRef.current?.stop();
    } catch {
      /* already stopped */
    }
    oscillatorRef.current?.disconnect();
    gainRef.current?.disconnect();
    oscillatorRef.current = null;
    gainRef.current = null;
  }, []);

  const cancelLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const stopAll = useCallback(() => {
    cancelLoop();
    stopTone();
    startAtRef.current = null;
  }, [cancelLoop, stopTone]);

  useEffect(() => {
    return () => {
      stopAll();
      try {
        audioCtxRef.current?.close();
      } catch {
        /* ignore */
      }
      audioCtxRef.current = null;
    };
  }, [stopAll]);

  const tick = useCallback(
    (now: number) => {
      if (startAtRef.current == null) return;
      const seconds = offsetRef.current + (now - startAtRef.current) / 1000;
      if (seconds >= durationSec) {
        setElapsed(durationSec);
        setIsPlaying(false);
        offsetRef.current = 0;
        stopAll();
        return;
      }
      setElapsed(seconds);
      rafRef.current = requestAnimationFrame(tick);
    },
    [durationSec, stopAll]
  );

  const startTone = useCallback(() => {
    if (typeof window === "undefined") return;
    const AudioCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioCtor();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 220;
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t0 = ctx.currentTime;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.05, t0 + 0.05);
    osc.start();
    oscillatorRef.current = osc;
    gainRef.current = gain;
  }, []);

  const handlePlayToggle = useCallback(() => {
    if (isPlaying) {
      const now = performance.now();
      if (startAtRef.current != null) {
        offsetRef.current += (now - startAtRef.current) / 1000;
      }
      setIsPlaying(false);
      stopAll();
      return;
    }
    startTone();
    setIsPlaying(true);
    startAtRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }, [isPlaying, startTone, stopAll, tick]);

  const handleScrubStart = useCallback(() => {
    offsetRef.current = 0;
    setElapsed(0);
    startAtRef.current = null;
    setIsPlaying(false);
    stopAll();
  }, [stopAll]);

  const progressPct = Math.min(100, (elapsed / Math.max(1, durationSec)) * 100);
  const hasTurns = Boolean(turns && turns.length > 0);
  const turnCount = turns?.length ?? 0;
  const canExpand = hasTurns || transcript.length > 140;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Voicemail className="h-3.5 w-3.5" aria-hidden />
        </span>
        <span className="text-xs font-semibold text-foreground">Voicemail</span>
        <span className="text-xxs tabular-nums text-muted-foreground">
          · {formatClock(durationSec)}
        </span>
        {fromNumber ? (
          <span className="ml-auto font-mono text-xxs tabular-nums text-muted-foreground">
            {fromNumber}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-3 px-3 py-3">
        <Button
          type="button"
          size="icon"
          variant="default"
          className="h-9 w-9 shrink-0 rounded-full"
          onClick={handlePlayToggle}
          aria-label={isPlaying ? "Pause voicemail" : "Play voicemail"}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" aria-hidden />
          ) : (
            <Play className="h-4 w-4 translate-x-[1px]" aria-hidden />
          )}
        </Button>

        <div className="flex-1">
          <div
            className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={Math.round(elapsed)}
            aria-valuemin={0}
            aria-valuemax={durationSec}
            aria-label="Voicemail playback progress"
          >
            <div
              className={cn(
                "h-full rounded-full bg-primary transition-[width]",
                isPlaying ? "duration-75" : "duration-200"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-xxs tabular-nums text-muted-foreground">
            <span>{formatClock(elapsed)}</span>
            <span>-{formatClock(Math.max(0, durationSec - elapsed))}</span>
          </div>
        </div>

        {elapsed > 0 && !isPlaying && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xxs"
            onClick={handleScrubStart}
          >
            Restart
          </Button>
        )}
      </div>

      <div className="border-t border-border px-3 py-2.5">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="text-xxs font-semibold uppercase tracking-wide text-muted-foreground">
              AI transcript
            </span>
          </div>
          <AiStatusBadge status="ELI Generated" className="ml-auto shrink-0" />
        </div>

        {!expanded ? (
          <p className="text-xs leading-relaxed text-foreground/80 line-clamp-2">{transcript}</p>
        ) : hasTurns ? (
          <div className="max-h-52 overflow-y-auto rounded-md border border-border bg-muted/30">
            <div className="divide-y divide-border/70">
              {turns!.map((turn, index) => (
                <TranscriptTurnRow key={`${turn.speaker}-${index}`} turn={turn} />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-foreground">{transcript}</p>
        )}

        {canExpand ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="mt-2 inline-flex items-center gap-1 text-xxs font-medium text-muted-foreground transition-colors hover:text-foreground"
            aria-expanded={expanded}
          >
            {expanded
              ? "Show less"
              : hasTurns
                ? `Show full transcript · ${turnCount} turns`
                : "Show full transcript"}
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")}
              aria-hidden
            />
          </button>
        ) : null}
      </div>

      {onCallBack ? (
        <div className="flex items-center justify-end border-t border-border bg-muted/20 px-3 py-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-xs"
            onClick={onCallBack}
          >
            Call back
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function TranscriptTurnRow({ turn }: { turn: VoicemailTranscriptTurn }) {
  const isAi = turn.speaker === "ai";

  return (
    <div className="flex gap-3 px-2.5 py-2">
      <span className="w-16 shrink-0 pt-px text-xxs font-semibold text-muted-foreground">
        {isAi ? "ELI" : "Resident"}
      </span>
      <p className="min-w-0 flex-1 text-xs leading-relaxed text-foreground">{turn.text}</p>
    </div>
  );
}
