"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { generateActivity } from "@/lib/entrata-experts-v2/data/activity";
import { HealthStrip } from "./health-strip";
import { ActivityLog } from "./activity-log";
import { ClusterList } from "./cluster-list";
import { GapList } from "./gap-list";
import { AutomationCandidates } from "./automation-candidates";
import { useEntrataExpertsRelease } from "@/lib/entrata-experts-release-context";

type ExpertsSubTab = "activity" | "clusters" | "gaps" | "automation";

/**
 * Entrata Experts admin observability — conversation health, activity log,
 * intent clusters, knowledge gaps, and automation candidates.
 *
 * Originally the "Entrata Experts" source inside the cross-platform Admin
 * Insights page; now lives on the Entrata Experts hub itself as the "Admin
 * Insights" tab (peer to Tokens & Usage). Requires a SavedInsightsProvider in
 * scope only if a child ever wires "Save to Insights" — the hub already
 * provides one.
 *
 * Clusters + Automation candidates are v1.2 surfaces; on earlier releases the
 * sub-tabs are hidden and selection snaps back to the Activity log.
 */
export function ExpertsInsights() {
  const activity = React.useMemo(() => generateActivity(), []);
  const [subTab, setSubTab] = React.useState<ExpertsSubTab>("activity");

  const { atLeast } = useEntrataExpertsRelease();
  const showAdvancedTabs = atLeast("v1.2");

  React.useEffect(() => {
    if (
      !showAdvancedTabs &&
      (subTab === "clusters" || subTab === "automation")
    ) {
      setSubTab("activity");
    }
  }, [showAdvancedTabs, subTab]);

  return (
    <>
      <HealthStrip activity={activity} />

      <Tabs
        value={subTab}
        onValueChange={(v) => setSubTab(v as ExpertsSubTab)}
        className="mt-5 space-y-3"
      >
        <TabsList className="h-auto flex-wrap justify-start gap-0 p-0.5">
          <TabsTrigger value="activity" className="text-xs">
            Activity log
          </TabsTrigger>
          {showAdvancedTabs && (
            <TabsTrigger value="clusters" className="text-xs">
              What people are asking
            </TabsTrigger>
          )}
          <TabsTrigger value="gaps" className="text-xs">
            Knowledge gaps
          </TabsTrigger>
          {showAdvancedTabs && (
            <TabsTrigger value="automation" className="text-xs">
              Automation candidates
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="activity" className="mt-2">
          <ActivityLog activity={activity} />
        </TabsContent>
        {showAdvancedTabs && (
          <TabsContent value="clusters" className="mt-2">
            <ClusterList activity={activity} />
          </TabsContent>
        )}
        <TabsContent value="gaps" className="mt-2">
          <GapList activity={activity} />
        </TabsContent>
        {showAdvancedTabs && (
          <TabsContent value="automation" className="mt-2">
            <AutomationCandidates activity={activity} />
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}
