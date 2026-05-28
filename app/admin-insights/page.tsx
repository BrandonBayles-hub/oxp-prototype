"use client";

import * as React from "react";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { generateActivity } from "@/lib/entrata-experts-v2/data/activity";
import { HealthStrip } from "@/components/entrata-experts-v2/admin/health-strip";
import { ActivityLog } from "@/components/entrata-experts-v2/admin/activity-log";
import { ClusterList } from "@/components/entrata-experts-v2/admin/cluster-list";
import { GapList } from "@/components/entrata-experts-v2/admin/gap-list";
import { AutomationCandidates } from "@/components/entrata-experts-v2/admin/automation-candidates";
import { CreditsUsage } from "@/components/entrata-experts-v2/credits-usage";
import { TrainingsSopInsights } from "@/components/admin-insights/trainings-sop-insights";
import { EscalationsInsights } from "@/components/admin-insights/escalations-insights";
import { CommunicationsInsights } from "@/components/admin-insights/communications-insights";
import { Badge } from "@/components/ui/badge";
import { Sparkles, BookOpen, AlertCircle, MessageSquare } from "lucide-react";
import { useEntrataExpertsRelease } from "@/lib/entrata-experts-release-context";

type SourceId = "experts" | "trainings" | "escalations" | "communications";

interface SourceMeta {
  id: SourceId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  heading: string;
  description: string;
}

const SOURCES: SourceMeta[] = [
  {
    id: "experts",
    label: "Entrata Experts",
    icon: Sparkles,
    heading: "What your team is doing with Entrata Experts",
    description:
      "Every conversation, who asked, what they got, and where the gaps are. Use this view to grow your knowledge base, retire unused lenses, and graduate recurring questions into automated workflows.",
  },
  {
    id: "trainings",
    label: "Trainings & SOP",
    icon: BookOpen,
    heading: "SOP health, compliance coverage & agent training",
    description:
      "Document inventory, approval pipeline, compliance area coverage, and which agents are trained on which SOPs. Surface gaps before they become audit findings.",
  },
  {
    id: "escalations",
    label: "Escalations",
    icon: AlertCircle,
    heading: "Escalation queue health & handoff patterns",
    description:
      "Queue status, volume by category and agent, workload distribution, SLA performance, and automatically detected patterns that may indicate SOP gaps or training needs.",
  },
  {
    id: "communications",
    label: "Communications",
    icon: MessageSquare,
    heading: "How your team and AI are handling conversations",
    description:
      "Thread volume by channel and property, AI vs. human handling, escalation rates, and threads that need attention — giving you a complete picture of your communication operations.",
  },
];

type ExpertsSubTab =
  | "activity"
  | "clusters"
  | "gaps"
  | "automation"
  | "tokens";

export default function AdminInsightsPage() {
  const activity = React.useMemo(() => generateActivity(), []);
  const [source, setSource] = React.useState<SourceId>("experts");
  const [expertsSubTab, setExpertsSubTab] = React.useState<ExpertsSubTab>("activity");

  // Entrata Experts admin observability lands in v1.1; clusters + automation
  // candidates + tokens sub-tabs land in v1.2. On earlier versions we hide
  // the source entirely (admins won't see it in the source selector).
  const { atLeast } = useEntrataExpertsRelease();
  const showExpertsSource = atLeast("v1.1");
  const showExpertsAdvancedTabs = atLeast("v1.2");
  const showTokensTab = atLeast("v1.2");

  // Filter source list and snap selection away from a hidden source.
  const visibleSources = React.useMemo(
    () => SOURCES.filter((s) => s.id !== "experts" || showExpertsSource),
    [showExpertsSource],
  );
  React.useEffect(() => {
    if (!visibleSources.find((s) => s.id === source)) {
      setSource(visibleSources[0]?.id ?? "trainings");
    }
  }, [visibleSources, source]);
  // If the active sub-tab is gated off, snap back to "activity".
  React.useEffect(() => {
    if (
      !showExpertsAdvancedTabs &&
      (expertsSubTab === "clusters" ||
        expertsSubTab === "automation" ||
        expertsSubTab === "tokens")
    ) {
      setExpertsSubTab("activity");
    }
  }, [showExpertsAdvancedTabs, expertsSubTab]);

  const currentSource = SOURCES.find((s) => s.id === source)!;
  const SourceIcon = currentSource.icon;

  return (
    <>
      <PageHeader
        title="Admin Insights"
        description="Cross-platform observability — see what your team is doing with AI across OXP, surface gaps, and graduate patterns into automation."
      />

      {/* Source selector */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {visibleSources.map((s) => {
          const Icon = s.icon;
          const isActive = source === s.id;
          return (
            <button
              key={s.id}
              onClick={() => {
                setSource(s.id);
                if (s.id === "experts") setExpertsSubTab("activity");
              }}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border-foreground/20 bg-foreground/5 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Source description */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <SourceIcon className="h-3.5 w-3.5" />
          {currentSource.label} · Wynbrook Living
        </div>
        <h2
          className="text-lg font-semibold tracking-tight text-foreground"
          style={{
            fontFamily:
              "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif",
          }}
        >
          {currentSource.heading}
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {currentSource.description}
        </p>
      </div>

      {/* Source-specific content */}
      <div className="mt-5">
        {source === "experts" && (
          <>
            <HealthStrip activity={activity} />

            <Tabs
              value={expertsSubTab}
              onValueChange={(v) => setExpertsSubTab(v as ExpertsSubTab)}
              className="mt-5 space-y-3"
            >
              <TabsList className="h-auto flex-wrap justify-start gap-0 p-0.5">
                <TabsTrigger value="activity" className="text-xs">
                  Activity log
                </TabsTrigger>
                {showExpertsAdvancedTabs && (
                  <TabsTrigger value="clusters" className="text-xs">
                    What people are asking
                  </TabsTrigger>
                )}
                <TabsTrigger value="gaps" className="text-xs">
                  Knowledge gaps
                </TabsTrigger>
                {showExpertsAdvancedTabs && (
                  <TabsTrigger value="automation" className="text-xs">
                    Automation candidates
                  </TabsTrigger>
                )}
                {showTokensTab && (
                  <TabsTrigger value="tokens" className="text-xs">
                    Tokens &amp; Usage
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="activity" className="mt-2">
                <ActivityLog activity={activity} />
              </TabsContent>
              {showExpertsAdvancedTabs && (
                <TabsContent value="clusters" className="mt-2">
                  <ClusterList activity={activity} />
                </TabsContent>
              )}
              <TabsContent value="gaps" className="mt-2">
                <GapList activity={activity} />
              </TabsContent>
              {showExpertsAdvancedTabs && (
                <TabsContent value="automation" className="mt-2">
                  <AutomationCandidates activity={activity} />
                </TabsContent>
              )}
              {showTokensTab && (
                <TabsContent value="tokens" className="mt-2">
                  <CreditsUsage />
                </TabsContent>
              )}
            </Tabs>
          </>
        )}

        {source === "trainings" && <TrainingsSopInsights />}
        {source === "escalations" && <EscalationsInsights />}
        {source === "communications" && <CommunicationsInsights />}
      </div>
    </>
  );
}
