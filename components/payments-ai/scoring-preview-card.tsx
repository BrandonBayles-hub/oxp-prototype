"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  computeEligibilityScore,
  FACTOR_LABELS,
  resolveEligibilityAction,
  SCORING_PREVIEW_PROFILES,
  type EligibilityAction,
  type EligibilityFactors,
  type PreviewProfileId,
  type ScoreBand,
} from "@/lib/payments-ai-eligibility";
import { cn } from "@/lib/utils";

const BAND_LABELS: Record<ScoreBand, string> = {
  low: "Low Risk",
  high: "High Risk",
};

const ACTION_LABELS: Record<EligibilityAction, string> = {
  continue: "Continue outreach",
  skip: "Skip outreach",
};

type Props = {
  factors: EligibilityFactors;
  highRiskThreshold: number;
  scenarioLabel: string;
  scenarioRules: Record<ScoreBand, EligibilityAction>;
  className?: string;
};

export function ScoringPreviewCard({
  factors,
  highRiskThreshold,
  scenarioLabel,
  scenarioRules,
  className,
}: Props) {
  const [profileId, setProfileId] = useState<PreviewProfileId>("good_payer");
  const profile = SCORING_PREVIEW_PROFILES.find((p) => p.id === profileId)!;

  const result = useMemo(
    () =>
      computeEligibilityScore(
        profile.signals,
        factors,
        highRiskThreshold,
      ),
    [profile, factors, highRiskThreshold],
  );

  const action = resolveEligibilityAction(result.band, scenarioRules);
  const weightedSum = result.contributions
    .filter((c) => c.enabled)
    .reduce((sum, c) => sum + c.weighted, 0);

  return (
    <div className={cn("rounded-lg border border-border bg-muted/20 p-4", className)}>
      <p className="text-sm font-semibold text-foreground">Sample scoring preview</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Composite = Σ (weight × sub-score) ÷ Σ weight, then bucketed by threshold.
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
                : "border-border bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{profile.description}</p>

      <div className="mt-3 flex flex-wrap items-center gap-4 rounded-md border border-border bg-background px-3 py-2.5">
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
          <p className="text-xs font-medium text-foreground">{ACTION_LABELS[action]}</p>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-md border border-border/60 bg-background/60">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-2 py-1.5 font-medium">Factor</th>
              <th className="px-2 py-1.5 text-right font-medium">Sub-score</th>
              <th className="px-2 py-1.5 text-right font-medium">Weight</th>
              <th className="px-2 py-1.5 text-right font-medium">Weighted</th>
            </tr>
          </thead>
          <tbody>
            {result.contributions.map((c) => (
              <tr
                key={c.key}
                className={cn(
                  "border-t border-border/40",
                  !c.enabled && "text-muted-foreground/60",
                )}
              >
                <td className="px-2 py-1.5 text-foreground">
                  {FACTOR_LABELS[c.key]}
                  {!c.enabled && <span className="ml-1 italic">(off)</span>}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">{c.subScore}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{c.weight}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{c.weighted}</td>
              </tr>
            ))}
            <tr className="border-t border-border/60 bg-muted/20 font-medium">
              <td className="px-2 py-1.5 text-foreground">Composite</td>
              <td className="px-2 py-1.5" />
              <td className="px-2 py-1.5 text-right tabular-nums">{result.totalWeight}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                {result.totalWeight > 0
                  ? `${weightedSum} ÷ ${result.totalWeight} = ${result.score}`
                  : "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Band: score &lt; {highRiskThreshold} → Low Risk · score ≥ {highRiskThreshold} → High Risk.
      </p>
    </div>
  );
}
