"use client";

import Link from "next/link";
import { Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Banner that surfaces "value you're missing" when an agent is off or under-configured
 * (TDD §4.11.2 — value narrative; METRICS-STAFFING-AI-VALUE research).
 */
export function ValueYoureMissingBanner() {
  return (
    <Card className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30">
      <CardContent className="flex items-center gap-3 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
          <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">
            You&apos;re missing value by not deploying an AI agent
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Similar properties see more leads per week and higher revenue impact when Leasing AI (or other agents) are enabled. Enable and tune agents to capture that value.
          </p>
        </div>
        <Button asChild variant="default" size="sm" className="shrink-0">
          <Link href="/agent-roster">Configure agents</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
