"use client";

import type { FeatureId } from "@/lib/feature-entitlements-context";
import { useRole } from "@/lib/role-context";
import { getPlgMessage, getFeatureDisplayName, type PlgBenefit } from "@/lib/plg-messaging";
import {
  Zap, DollarSign, TrendingUp, Clock, Users, BarChart3, MessageSquare,
  Target, Shield, CheckCircle, GitBranch, Plug, Building2, Bell, Mic,
  SlidersHorizontal, ScrollText, Eye, AlertTriangle, Cog, BookOpen,
  FileCheck, Search, Lightbulb, Brain,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Zap, DollarSign, TrendingUp, Clock, Users, BarChart3, MessageSquare,
  Target, Shield, CheckCircle, GitBranch, Plug, Building2, Bell, Mic,
  SlidersHorizontal, ScrollText, Eye, AlertTriangle, Cog, BookOpen,
  FileCheck, Search, Lightbulb, Brain,
};

function BenefitIcon({ name }: { name: string }) {
  const Icon = ICON_MAP[name] ?? Zap;
  return <Icon className="h-5 w-5" />;
}

type PlgFeaturePanelProps = {
  featureId: FeatureId;
};

export function PlgFeaturePanel({ featureId }: PlgFeaturePanelProps) {
  const { role } = useRole();
  const message = getPlgMessage(featureId, role);
  const featureName = getFeatureDisplayName(featureId);

  if (!message) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-muted-foreground">
          {featureName} is not part of your current contract.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl py-8">
      {/* Hero */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {message.headline}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          {message.description}
        </p>
      </div>

      {/* Metric callout */}
      <div className="mb-8 flex justify-center">
        <div className="inline-flex items-center gap-3 rounded-xl border border-border bg-muted/50 px-6 py-4">
          <span className="text-3xl font-bold tracking-tight text-foreground">
            {message.metric.value}
          </span>
          <span className="max-w-[14rem] text-sm leading-snug text-muted-foreground">
            {message.metric.label}
          </span>
        </div>
      </div>

      {/* Benefit cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {message.benefits.map((benefit: PlgBenefit) => (
          <div
            key={benefit.title}
            className="rounded-xl border border-border bg-background p-5 shadow-sm"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BenefitIcon name={benefit.icon} />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              {benefit.title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {benefit.body}
            </p>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-md bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
        >
          Request a demo
        </button>
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-6 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Learn more
        </button>
      </div>

      {/* Subtle footer */}
      <p className="mt-8 text-center text-xs text-muted-foreground">
        Interested in adding {featureName} to your contract?
        Contact your account manager or reach out to our team.
      </p>
    </div>
  );
}
