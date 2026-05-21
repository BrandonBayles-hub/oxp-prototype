"use client";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ASSISTANTS } from "@/lib/entrata-experts-v2/assistants";
import { ChatHistoryRail } from "./chat-history-rail";
import { ReportAnalyzerModule } from "./report-analyzer-module";
import { ArrowRight, BarChart3, Sparkles } from "lucide-react";

interface HubCardsProps {
  onLaunchAnalyst: () => void;
  onLaunchAssistant: (assistantId: string) => void;
  onLaunchReport: (reportId: string) => void;
}

export function HubCards({
  onLaunchAnalyst,
  onLaunchAssistant,
  onLaunchReport,
}: HubCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          Select an expert to chat
        </div>

        <AnalystCard onLaunch={onLaunchAnalyst} />

        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2
              className="text-lg font-semibold tracking-tight text-foreground"
              style={{
                fontFamily:
                  "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif",
              }}
            >
              Entrata Assistants
            </h2>
            <span className="text-xs text-muted-foreground">
              Pick a report to analyze, or a pre-built GPT to chat with
            </span>
          </div>

          {/* The grid mixes Report Analyzer (a 2-cell-wide tile) with the 7
              GPT assistants. 2 + 7 = 9 cells = exactly 3 rows in a 3-col grid. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <ReportAnalyzerModule
              onLaunchReport={onLaunchReport}
              className="sm:col-span-2 xl:col-span-2"
            />
            {ASSISTANTS.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onLaunchAssistant(a.id)}
                  className="group flex h-full flex-col items-start gap-2 rounded-lg border border-border bg-background p-4 text-left transition-all hover:border-foreground/30 hover:shadow-sm"
                >
                  <span
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md"
                    style={{ background: `${a.hue}1a`, color: a.hue }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-semibold leading-tight text-foreground">
                    {a.name}
                  </h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {a.description}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-1 pt-1 text-[12px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                    Open
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <ChatHistoryRail />
    </div>
  );
}

function AnalystCard({ onLaunch }: { onLaunch: () => void }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md"
          style={{ background: "#3b7a9e1a", color: "#3b7a9e" }}
        >
          <BarChart3 className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              className="text-lg font-semibold leading-tight text-foreground"
              style={{
                fontFamily:
                  "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif",
              }}
            >
              Entrata Analyst
            </h2>
            <Badge variant="yellow" className="text-[10px]">Beta</Badge>
            <Badge variant="gray" className="text-[10px]">Data-connected</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            AI assistant powered by your live Entrata property data. Translates
            natural-language questions into governed SQL through TextQL — every
            answer is cited and scoped to the properties you have access to.
          </p>
        </div>
        <div className="shrink-0">
          <Button onClick={onLaunch} className="gap-2">
            Launch
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
