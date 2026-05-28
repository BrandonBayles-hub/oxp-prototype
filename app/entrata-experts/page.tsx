"use client";

import * as React from "react";
import { PageHeader } from "@/components/page-header";
import { HubCards } from "@/components/entrata-experts-v2/hub-cards";
import { AnalystChat } from "@/components/entrata-experts-v2/analyst-chat";
import { AssistantChat } from "@/components/entrata-experts-v2/assistant-chat";
import { ReportAnalyzerChat } from "@/components/entrata-experts-v2/report-analyzer-chat";
import { ChatFirstHub } from "@/components/entrata-experts-v2/chat-first-hub";
import { cn } from "@/lib/utils";

type ExpertView =
  | { kind: "hub" }
  | { kind: "analyst" }
  | { kind: "assistant"; id: string }
  | { kind: "report"; id: string };

// Layout test — flipping between the original "hub-first" landing (Analyst
// card + assistants grid) and the "chat-first" Gems-style layout where the
// user lands directly in Entrata Analyst. The toggle stays visible in both
// layouts so we can collect feedback before committing.
type LayoutMode = "hub" | "chat-first";

const STORAGE_KEY = "oxp:experts-v2:view";
const LAYOUT_STORAGE_KEY = "oxp:experts-v2:layout";

interface PersistedView {
  expert: ExpertView;
}

const DEFAULT_VIEW: PersistedView = {
  expert: { kind: "hub" },
};

const DEFAULT_LAYOUT: LayoutMode = "hub";

function loadLayout(): LayoutMode {
  if (typeof window === "undefined") return DEFAULT_LAYOUT;
  try {
    const raw = window.sessionStorage.getItem(LAYOUT_STORAGE_KEY);
    if (raw === "hub" || raw === "chat-first") return raw;
    return DEFAULT_LAYOUT;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function loadView(): PersistedView {
  if (typeof window === "undefined") return DEFAULT_VIEW;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VIEW;
    const parsed = JSON.parse(raw) as PersistedView;
    if (!parsed || typeof parsed !== "object") return DEFAULT_VIEW;
    if (
      !parsed.expert ||
      (parsed.expert.kind !== "hub" &&
        parsed.expert.kind !== "analyst" &&
        parsed.expert.kind !== "assistant" &&
        parsed.expert.kind !== "report")
    ) {
      return DEFAULT_VIEW;
    }
    // Strip any legacy fields (e.g. `tab`) that are no longer part of the
    // persisted shape — we used to store a top-level Experts/Credits tab
    // before Tokens & Usage moved under Admin Insights.
    return { expert: parsed.expert };
  } catch {
    return DEFAULT_VIEW;
  }
}

export default function EntrataExpertsPage() {
  const [view, setView] = React.useState<PersistedView>(DEFAULT_VIEW);
  const [layout, setLayout] = React.useState<LayoutMode>(DEFAULT_LAYOUT);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setView(loadView());
    setLayout(loadLayout());
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

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.sessionStorage.setItem(LAYOUT_STORAGE_KEY, layout);
    } catch {
      /* ignore */
    }
  }, [layout, hydrated]);

  const launchAnalyst = () => setView({ expert: { kind: "analyst" } });
  const launchAssistant = (id: string) =>
    setView({ expert: { kind: "assistant", id } });
  const launchReport = (id: string) =>
    setView({ expert: { kind: "report", id } });
  const backToHub = () => setView({ expert: { kind: "hub" } });

  return (
    <div className="-mt-8">
      <PageHeader
        title="Entrata Experts"
        description="AI-powered assistants for property management — from data analysis to content creation, leasing support, and more."
        actions={<LayoutToggle value={layout} onChange={setLayout} />}
      />

      <div className="mt-2">
        {layout === "chat-first" ? (
          <ChatFirstHub />
        ) : (
          <>
            {view.expert.kind === "hub" && (
              <HubCards
                onLaunchAnalyst={launchAnalyst}
                onLaunchAssistant={launchAssistant}
                onLaunchReport={launchReport}
              />
            )}
            {view.expert.kind === "analyst" && (
              <AnalystChat onBack={backToHub} />
            )}
            {view.expert.kind === "assistant" && (
              <AssistantChat assistantId={view.expert.id} onBack={backToHub} />
            )}
            {view.expert.kind === "report" && (
              <ReportAnalyzerChat
                reportId={view.expert.id}
                onBack={backToHub}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Layout toggle — segmented control in the page header. Stays visible in both
// layouts so we can collect feedback by flipping back and forth.
// -----------------------------------------------------------------------------

function LayoutToggle({
  value,
  onChange,
}: {
  value: LayoutMode;
  onChange: (v: LayoutMode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Experts page layout"
      className="inline-flex items-center gap-0.5 rounded-md border border-border bg-muted/40 p-0.5"
    >
      <span className="pl-1.5 pr-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        Layout
      </span>
      <LayoutOption
        active={value === "hub"}
        onClick={() => onChange("hub")}
        label="Hub"
        title="Original landing — Analyst card + assistants grid"
      />
      <LayoutOption
        active={value === "chat-first"}
        onClick={() => onChange("chat-first")}
        label="Chat-first"
        title="Gems-style — land in Analyst, switch experts from a left rail"
      />
    </div>
  );
}

function LayoutOption({
  active,
  onClick,
  label,
  title,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        "rounded px-2 py-1 text-[11px] font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
