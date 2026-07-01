"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  computeMockEligibilityScore,
  SCORING_PREVIEW_PROFILES,
  type EligibilityFactors,
  type PreviewProfileId,
} from "@/lib/payments-ai-eligibility";
import { cn } from "@/lib/utils";

type ScoreBand = "good" | "moderate" | "poor";
type EligibilityAction = "continue" | "skip" | "route_human";

const BAND_LABELS: Record<ScoreBand, string> = {
  good: "Good standing",
  moderate: "Moderate risk",
  poor: "High risk",
};

const ACTION_LABELS: Record<EligibilityAction, string> = {
  continue: "Continue outreach",
  skip: "Skip outreach",
  route_human: "Route to human",
};

type Props = {
  factors: EligibilityFactors;
  thresholdModerate: number;
  thresholdPoor: number;
  scenarioLabel: string;
  scenarioAction: EligibilityAction;
  className?: string;
};

export function ScoringPreviewCard({
  factors,
  thresholdModerate,
  thresholdPoor,
  scenarioLabel,
  scenarioAction,
  className,
}: Props) {
  const [profileId, setProfileId] = useState<PreviewProfileId>("good_payer");
  const profile = SCORING_PREVIEW_PROFILES.find((p) => p.id === profileId)!;

  const result = useMemo(
    () => computeMockEligibilityScore(profile, factors, thresholdModerate, thresholdPoor),
    [profile, factors, thresholdModerate, thresholdPoor]
  );

  return (
    <div className={cn("rounded-lg border border-border bg-muted/20 p-4", className)}>
      <p className="text-sm font-semibold text-foreground">Sample scoring preview</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        See how weights translate to a score and band. Algorithm is platform-defined; weights are property-configurable.
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {SCORING_PREVIEW_PROFILES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setProfileId(p.id)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
              profileId === p.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{profile.description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-border bg-background px-3 py-2.5">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Score</p>
          <p className="text-lg font-bold text-foreground">{result.score}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Band</p>
          <Badge variant="gray" className="mt-0.5 text-[10px]">
            {BAND_LABELS[result.band]}
          </Badge>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{scenarioLabel} action</p>
          <p className="text-xs font-medium text-foreground">{ACTION_LABELS[scenarioAction]}</p>
        </div>
      </div>
    </div>
  );
}
