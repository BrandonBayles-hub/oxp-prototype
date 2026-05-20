"use client";
import * as React from "react";
import { generateActivity } from "@/lib/entrata-experts-v2/data/activity";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { HealthStrip } from "./health-strip";
import { ActivityLog } from "./activity-log";
import { ClusterList } from "./cluster-list";
import { GapList } from "./gap-list";
import { AutomationCandidates } from "./automation-candidates";

export function AdminView() {
  const activity = React.useMemo(() => generateActivity(), []);
  const [tab, setTab] = React.useState("activity");

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Admin · Wynbrook Living
        </div>
        <h2
          className="text-lg font-semibold tracking-tight text-foreground"
          style={{
            fontFamily:
              "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif",
          }}
        >
          What your team is doing with Entrata Analyst
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Every conversation, who asked, what they got, and where the gaps
          are. Use this view to grow your knowledge base, retire unused
          lenses, and graduate recurring questions into automated workflows.
        </p>
      </div>

      <HealthStrip activity={activity} />

      <Tabs value={tab} onValueChange={setTab} className="space-y-3">
        <TabsList className="h-auto flex-wrap justify-start gap-0 p-0.5">
          <TabsTrigger value="activity" className="text-xs">
            Activity log
          </TabsTrigger>
          <TabsTrigger value="clusters" className="text-xs">
            What people are asking
          </TabsTrigger>
          <TabsTrigger value="gaps" className="text-xs">
            Knowledge gaps
          </TabsTrigger>
          <TabsTrigger value="automation" className="text-xs">
            Automation candidates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-2">
          <ActivityLog activity={activity} />
        </TabsContent>
        <TabsContent value="clusters" className="mt-2">
          <ClusterList activity={activity} />
        </TabsContent>
        <TabsContent value="gaps" className="mt-2">
          <GapList activity={activity} />
        </TabsContent>
        <TabsContent value="automation" className="mt-2">
          <AutomationCandidates activity={activity} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
