"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, Sparkles, Voicemail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatClock(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type Props = {
  durationSec: number;
  transcript: string;
  fromNumber?: string;
  onCallBack?: () => void;
};

/**
 * Prototype voicemail card: a simulated audio player (no real file) that plays
 * a short synthesized tone via the Web Audio API so the "Play" button produces
 * audible feedback, and animates a progress bar across the stated duration.
 * The AI transcript is rendered inline beneath the player.
 */
export function VoicemailPlayer({ durationSec, transcript, fromNumber, onCallBack }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);

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

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Voicemail className="h-3.5 w-3.5" aria-hidden />
        </span>
        <span className="text-xs font-semibold text-foreground">Voicemail</span>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          · {formatClock(durationSec)}
        </span>
        {fromNumber ? (
          <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
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
          <div className="mt-1 flex items-center justify-between text-[10px] tabular-nums text-muted-foreground">
            <span>{formatClock(elapsed)}</span>
            <span>-{formatClock(Math.max(0, durationSec - elapsed))}</span>
          </div>
        </div>

        {elapsed > 0 && !isPlaying && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[10px]"
            onClick={handleScrubStart}
          >
            Restart
          </Button>
        )}
      </div>

      <div className="border-t border-border bg-background/40 px-3 py-2.5">
        <div className="mb-1 flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 shrink-0 text-primary" aria-hidden />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            AI transcript
          </span>
        </div>
        <p className="text-sm leading-relaxed text-foreground">{transcript}</p>
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
