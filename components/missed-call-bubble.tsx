"use client";

import { PhoneMissed } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  fromNumber: string;
  attemptCount?: number;
  rangForSec?: number;
  onCallBack?: () => void;
};

function formatSecs(seconds?: number): string | null {
  if (seconds == null) return null;
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

export function MissedCallBubble({ fromNumber, attemptCount, rangForSec, onCallBack }: Props) {
  const rang = formatSecs(rangForSec);
  const hasMeta = attemptCount != null || rang;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
        <PhoneMissed className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Missed call</p>
        <p className="mt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
          {fromNumber}
        </p>
        {hasMeta && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            {attemptCount != null && attemptCount > 1 ? (
              <>
                <span className="font-semibold text-destructive">
                  {attemptCount} attempts
                </span>
                {rang ? ` · rang ${rang} each` : null}
              </>
            ) : rang ? (
              <>Rang for {rang} · no voicemail left</>
            ) : null}
          </p>
        )}
      </div>
      {onCallBack ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 shrink-0 gap-1.5 text-xs"
          onClick={onCallBack}
        >
          Call back
        </Button>
      ) : null}
    </div>
  );
}
