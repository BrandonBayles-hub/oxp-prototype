"use client";

import { useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import type { Agent } from "@/lib/agents-context";

const ELI_PLUS_PROPERTIES = [
  { name: "Harvest Peak Capital", status: "Active", vertical: "Conventional", complete: 94 },
  { name: "Skyline Apartments", status: "Active", vertical: "Conventional", complete: 87 },
  { name: "The Meridian", status: "Setup", vertical: "Affordable", complete: 42 },
];

export function AutonomousAgentSheet({
  agent,
  open,
  onOpenChange,
  onUpdate,
}: {
  agent: Agent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updates: Partial<Agent>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [promptDraft, setPromptDraft] = useState(agent.systemPrompt ?? "");
  const [goalDraft, setGoalDraft] = useState(agent.goal ?? "");

  const isActive = agent.status === "Active";
  const isShadow = agent.deploymentMode === "shadow" || agent.status === "Training";
  const pending = agent.pendingChanges;

  const stageOrApply = (updates: Partial<Agent>) => {
    if (!isActive && !isShadow) {
      onUpdate(updates);
      return;
    }
    const configKeys = ["systemPrompt", "goal"] as const;
    const configUpdates: Record<string, string | undefined> = {};
    let hasConfigChange = false;
    for (const key of configKeys) {
      if (key in updates) {
        configUpdates[key] = updates[key] as string | undefined;
        hasConfigChange = true;
      }
    }
    if (hasConfigChange) {
      onUpdate({
        pendingChanges: {
          ...(pending ?? { changedAt: new Date().toISOString() }),
          ...configUpdates,
          changedAt: new Date().toISOString(),
        },
      });
    }
    const nonConfigUpdates = Object.fromEntries(
      Object.entries(updates).filter(([k]) => !(configKeys as readonly string[]).includes(k))
    );
    if (Object.keys(nonConfigUpdates).length > 0) onUpdate(nonConfigUpdates);
  };

  const handlePublish = () => {
    if (!pending) return;
    const applied: Partial<Agent> = {};
    if (pending.systemPrompt !== undefined) applied.systemPrompt = pending.systemPrompt;
    if (pending.goal !== undefined) applied.goal = pending.goal;
    onUpdate({ ...applied, pendingChanges: undefined });
    setPromptDraft(pending.systemPrompt ?? agent.systemPrompt ?? "");
    setGoalDraft(pending.goal ?? agent.goal ?? "");
  };

  const handleDiscard = () => onUpdate({ pendingChanges: undefined });

  void editing; void promptDraft; void goalDraft; void setEditing; void setPromptDraft; void setGoalDraft; void stageOrApply;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <img src="/eli-cube.svg" alt="" width={20} height={20} />
              <SheetTitle>{agent.name}</SheetTitle>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isActive ? "bg-[#B3FFCC] text-black" : "bg-muted text-muted-foreground"
              }`}
            >
              {isActive ? "Active" : agent.status}
            </span>
          </div>
          <SheetDescription>{agent.bucket}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <p className="text-sm text-foreground">{agent.description}</p>

          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <img src="/eli-cube.svg" alt="" width={16} height={16} />
              <span className="text-sm font-medium text-foreground">Open ELI+ Settings in Entrata</span>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </button>

          <Button variant="outline" size="sm">View Help Article</Button>

          <div>
            <select className="select-base mb-4 w-auto min-w-[10rem]">
              <option>All Properties</option>
            </select>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Property</th>
                  <th className="pb-2 font-medium text-muted-foreground">Status</th>
                  <th className="pb-2 font-medium text-muted-foreground">Vertical</th>
                  <th className="pb-2 font-medium text-muted-foreground">Complete</th>
                </tr>
              </thead>
              <tbody>
                {ELI_PLUS_PROPERTIES.map((prop) => (
                  <tr key={prop.name} className="border-b border-border/50">
                    <td className="py-3 font-medium text-foreground">{prop.name}</td>
                    <td className="py-3">
                      <span className={`text-sm font-medium ${prop.status === "Active" ? "text-green-600" : "text-amber-600"}`}>
                        {prop.status}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground">{prop.vertical}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${prop.complete >= 80 ? "bg-green-500" : prop.complete >= 50 ? "bg-amber-400" : "bg-muted-foreground/40"}`}
                            style={{ width: `${prop.complete}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground">{prop.complete}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pending && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
              <div>
                <p className="text-sm font-medium text-foreground">Unpublished changes</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Changes are staged and won&apos;t affect the live agent until published.
                </p>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={handlePublish}>Publish</Button>
                <Button variant="ghost" size="sm" onClick={handleDiscard}>Discard</Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
