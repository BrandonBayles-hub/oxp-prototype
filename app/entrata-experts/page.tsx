"use client";

import * as React from "react";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { HubCards } from "@/components/entrata-experts-v2/hub-cards";
import { AnalystChat } from "@/components/entrata-experts-v2/analyst-chat";
import { AssistantChat } from "@/components/entrata-experts-v2/assistant-chat";
import { AdminView } from "@/components/entrata-experts-v2/admin/admin-view";
import { CreditsUsage } from "@/components/entrata-experts-v2/credits-usage";

type TabId = "experts" | "admin" | "credits";

type ExpertView =
  | { kind: "hub" }
  | { kind: "analyst" }
  | { kind: "assistant"; id: string };

const STORAGE_KEY = "oxp:experts-v2:view";

interface PersistedView {
  tab: TabId;
  expert: ExpertView;
}

const DEFAULT_VIEW: PersistedView = {
  tab: "experts",
  expert: { kind: "hub" },
};

function loadView(): PersistedView {
  if (typeof window === "undefined") return DEFAULT_VIEW;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VIEW;
    const parsed = JSON.parse(raw) as PersistedView;
    if (!parsed || typeof parsed !== "object") return DEFAULT_VIEW;
    if (parsed.tab !== "experts" && parsed.tab !== "admin" && parsed.tab !== "credits") {
      return DEFAULT_VIEW;
    }
    if (!parsed.expert || (parsed.expert.kind !== "hub" && parsed.expert.kind !== "analyst" && parsed.expert.kind !== "assistant")) {
      return DEFAULT_VIEW;
    }
    return parsed;
  } catch {
    return DEFAULT_VIEW;
  }
}

export default function EntrataExpertsPage() {
  const [view, setView] = React.useState<PersistedView>(DEFAULT_VIEW);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setView(loadView());
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(view));
    } catch {
      /* ignore */
    }
  }, [view, hydrated]);

  const setTab = (tab: TabId) =>
    setView((v) => ({ ...v, tab, expert: tab === "experts" ? v.expert : v.expert }));
  const launchAnalyst = () =>
    setView({ tab: "experts", expert: { kind: "analyst" } });
  const launchAssistant = (id: string) =>
    setView({ tab: "experts", expert: { kind: "assistant", id } });
  const backToHub = () =>
    setView((v) => ({ ...v, expert: { kind: "hub" } }));

  return (
    <>
      <PageHeader
        title="Entrata Experts"
        description="AI-powered assistants for property management — from data analysis to content creation, leasing support, and more."
      />

      <Tabs
        value={view.tab}
        onValueChange={(v) => setTab(v as TabId)}
        className="mt-2 space-y-4"
      >
        <TabsList>
          <TabsTrigger value="experts">Experts</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
          <TabsTrigger value="credits">Credits &amp; Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="experts" className="mt-4">
          {view.expert.kind === "hub" && (
            <HubCards
              onLaunchAnalyst={launchAnalyst}
              onLaunchAssistant={launchAssistant}
            />
          )}
          {view.expert.kind === "analyst" && <AnalystChat onBack={backToHub} />}
          {view.expert.kind === "assistant" && (
            <AssistantChat assistantId={view.expert.id} onBack={backToHub} />
          )}
        </TabsContent>

        <TabsContent value="admin" className="mt-4">
          <AdminView />
        </TabsContent>

        <TabsContent value="credits" className="mt-4">
          <CreditsUsage />
        </TabsContent>
      </Tabs>
    </>
  );
}
