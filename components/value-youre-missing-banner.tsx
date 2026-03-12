"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAgents } from "@/lib/agents-context";
import { useR1Release } from "@/lib/r1-release-context";

/**
 * Banner that surfaces "value you're missing" when autonomous agents are off
 * or under-configured (TDD §4.11.2 — value narrative).
 * Always renders — shows actionable recommendations even when all agents are active.
 */
export function ValueYoureMissingBanner() {
  const { agents } = useAgents();
  const { isR1Release } = useR1Release();

  const { headline, description, extra, suggestions, ctaLabel } = useMemo(() => {
    if (isR1Release) {
      return {
        headline: "You\u2019re missing value \u2014 here\u2019s where to focus",
        description:
          "Similar properties see significantly better outcomes with AI agents. Entrata has 100+ agents ready to deploy across your portfolio.",
        extra: null,
        suggestions: [
          {
            label: "ELI+ Conversational Agents",
            text: "\u2014 Own key workflows end-to-end: leasing, renewals, maintenance & payments.",
          },
          {
            label: "Operational & Efficiency Agents",
            text: "\u2014 Automate hundreds of day-to-day workflows and reduce manual effort.",
          },
          {
            label: "ELI Essentials",
            text: "\u2014 On-demand AI assistance: answers, drafts, summaries & explanations.",
          },
        ],
        ctaLabel: "Explore & configure all agents",
      };
    }

    const autonomous = agents.filter((a) => a.type === "autonomous");
    const inactive = autonomous.filter((a) => a.status !== "Active");
    const active = autonomous.filter((a) => a.status === "Active");

    if (inactive.length > 0) {
      const names = inactive.map((a) => a.name);
      const nameStr =
        names.length === 1
          ? names[0]
          : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

      const valuePhrases: Record<string, string> = {
        "Maintenance AI": "15% faster work order resolution and 92% resident satisfaction",
        "Payments AI": "20% faster rent collection and 3.1% lower delinquency rates",
        "Leasing AI": "+12 leads/week and 2x more tour bookings",
        "Renewal AI": "15% higher retention rates",
      };

      const valueList = inactive
        .map((a) => valuePhrases[a.name] ? `${a.name} (${valuePhrases[a.name]})` : a.name)
        .join("; ");

      return {
        headline: "You\u2019re missing value \u2014 here\u2019s where to focus",
        description:
          `Similar properties see significantly better outcomes when ${nameStr} ${inactive.length === 1 ? "is" : "are"} enabled. Activate ${inactive.length === 1 ? "this agent" : "these agents"} to capture that value.`,
        extra: null,
        suggestions: [
          {
            label: "Suggested focus:",
            text: `Enable ${nameStr} \u2014 similar properties see ${valueList}.`,
          },
          {
            label: "Top recommendation:",
            text: inactive.some((a) => a.name === "Maintenance AI")
              ? "Work order resolution is slower than similar properties. Enable Maintenance AI to automate triage, vendor dispatch, and resident follow-up."
              : `Enable ${names[0]} to start capturing value immediately.`,
          },
        ],
        ctaLabel: "Configure agents",
      };
    }

    const lowestResolution = [...active]
      .filter((a) => parseFloat(a.resolutionRate) > 0)
      .sort((a, b) => parseFloat(a.resolutionRate) - parseFloat(b.resolutionRate))[0];

    return {
      headline: "You\u2019re missing value \u2014 here\u2019s where to focus",
      description:
        `All ${active.length} autonomous agents are active. Look for tuning opportunities to increase impact.`,
      extra: null,
      suggestions: [
        {
          label: "Suggested focus:",
          text: lowestResolution
            ? `${lowestResolution.name} has the lowest resolution rate (${lowestResolution.resolutionRate}). Review its SOP or prompt to improve outcomes.`
            : "All agents are performing well. Monitor weekly to maintain trajectory.",
        },
        {
          label: "Top recommendation:",
          text: `Occupancy is down at Property A (92%); review leasing agent configuration or enable additional coverage there.`,
        },
      ],
      ctaLabel: "Configure agents",
    };
  }, [agents, isR1Release]);

  return (
    <Card className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30">
      <CardContent className="py-5">
        <div className="flex items-start gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
            <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{headline}</p>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            {extra && (
              <p className="mt-2 text-sm text-muted-foreground">{extra}</p>
            )}
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              {suggestions.map((s) => (
                <li key={s.label} className="flex gap-1">
                  <span>&bull;</span>
                  <span>
                    <span className="font-semibold text-foreground">{s.label}</span>{" "}
                    {s.text}
                  </span>
                </li>
              ))}
            </ul>
            <Button asChild variant="default" size="sm" className="mt-4">
              <Link href="/agent-roster">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/eli-cube.svg" alt="" width={14} height={14} />
                {ctaLabel}
                {isR1Release && <ArrowRight className="ml-1 h-3.5 w-3.5" />}
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
