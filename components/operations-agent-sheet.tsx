"use client";

import { useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Power, CheckCircle, XCircle, Clock, ExternalLink, CirclePlay } from "lucide-react";
import type { Agent } from "@/lib/agents-context";

const L2_PROPERTY_DATA = [
  { name: "Harvest Peak Capital", vertical: "Conventional", runs: 21, errors: 0, avgDuration: "3m 45s", lastRun: "success" as const },
  { name: "Skyline Apartments", vertical: "Conventional", runs: 16, errors: 1, avgDuration: "3m 45s", lastRun: "success" as const },
  { name: "The Meridian", vertical: "Affordable", runs: 9, errors: 1, avgDuration: "3m 45s", lastRun: "error" as const },
];

export function OperationsAgentSheet({
  agent,
  open,
  onOpenChange,
  onToggle,
  onVideoClick,
}: {
  agent: Agent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggle: (status: string) => void;
  onVideoClick?: (agentName: string) => void;
}) {
  const isActive = agent.status === "Active";
  const hasRuns = (agent.runsCompleted ?? 0) > 0;
  const lastRunDate = agent.lastRunAt ? new Date(agent.lastRunAt) : null;
  const [propertyStatuses, setPropertyStatuses] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    L2_PROPERTY_DATA.forEach((p) => { init[p.name] = p.name === "The Meridian" ? "Off" : "Active"; });
    return init;
  });
  const [showTurnOnAllConfirm, setShowTurnOnAllConfirm] = useState(false);
  const allActive = Object.values(propertyStatuses).every((s) => s === "Active");

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
              {isActive ? "Active" : "Off"}
            </span>
          </div>
          <SheetDescription>{agent.bucket}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <p className="text-sm text-foreground">{agent.description}</p>

          {agent.type === "intelligence" && onVideoClick && (
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/50"
              onClick={() => onVideoClick(agent.name)}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <CirclePlay className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Watch Agent Walkthrough</p>
                <p className="text-xs text-muted-foreground">See how this agent works step by step</p>
              </div>
            </button>
          )}

          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/50"
          >
            <span className="text-sm font-medium text-foreground">
              {agent.type === "operations" ? "Open ELI Essentials Settings in Entrata" : "Open Agent Settings in Entrata"}
            </span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </button>

          {agent.type !== "operations" && <>

          {hasRuns ? (
            <>
              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                  <p className="text-2xl font-semibold text-foreground">{agent.runsCompleted}</p>
                  <p className="text-xs text-muted-foreground">Runs</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                  <p className="text-2xl font-semibold text-foreground">{agent.errorCount ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                  <p className="text-2xl font-semibold text-foreground">{agent.avgRunDuration ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">Avg Duration</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-center flex flex-col items-center justify-center">
                  {agent.lastRunStatus === "success" ? (
                    <CheckCircle className="h-6 w-6 text-emerald-600" />
                  ) : agent.lastRunStatus === "error" ? (
                    <XCircle className="h-6 w-6 text-red-600" />
                  ) : (
                    <Clock className="h-6 w-6 text-muted-foreground" />
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Last Run</p>
                </div>
              </div>

              {lastRunDate && (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-3 text-sm">
                  {agent.lastRunStatus === "success" ? (
                    <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                  )}
                  <div>
                    <p className="font-medium text-foreground">Last run: {agent.lastRunStatus}</p>
                    <p className="text-xs text-muted-foreground">{lastRunDate.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-border bg-muted/20 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                {isActive ? "No runs yet. This agent will execute on its next scheduled trigger." : "Turn this agent on to start running."}
              </p>
            </div>
          )}

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
                  <th className="pb-2 font-medium text-muted-foreground text-right">Runs</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">Errors</th>
                  <th className="pb-2 font-medium text-muted-foreground">Avg Duration</th>
                  <th className="pb-2 font-medium text-muted-foreground text-center">Last Run</th>
                </tr>
              </thead>
              <tbody>
                {L2_PROPERTY_DATA.map((prop) => (
                  <tr key={prop.name} className="border-b border-border/50">
                    <td className="py-3 font-medium text-foreground">{prop.name}</td>
                    <td className="py-3">
                      <select
                        className="select-base h-8 w-[5.5rem] text-xs"
                        value={propertyStatuses[prop.name]}
                        onChange={(e) => setPropertyStatuses((prev) => ({ ...prev, [prop.name]: e.target.value }))}
                      >
                        <option value="Active">Active</option>
                        <option value="Off">Off</option>
                      </select>
                    </td>
                    <td className="py-3 text-muted-foreground">{prop.vertical}</td>
                    <td className="py-3 text-right font-medium text-foreground">{prop.runs}</td>
                    <td className="py-3 text-right">
                      <span className={prop.errors > 0 ? "font-medium text-red-600" : "text-foreground"}>{prop.errors}</span>
                    </td>
                    <td className="py-3 text-muted-foreground">{prop.avgDuration}</td>
                    <td className="py-3 text-center">
                      {prop.lastRun === "success" ? (
                        <CheckCircle className="mx-auto h-4 w-4 text-emerald-600" />
                      ) : (
                        <XCircle className="mx-auto h-4 w-4 text-red-600" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">Agent status (all properties)</span>
            <Button
              variant={allActive ? "destructive" : "default"}
              size="sm"
              onClick={() => setShowTurnOnAllConfirm(true)}
            >
              <Power className="h-4 w-4" />
              {allActive ? "Turn off" : "Turn on"}
            </Button>
          </div>

          </>}
        </div>
      </SheetContent>

      <Dialog open={showTurnOnAllConfirm} onOpenChange={setShowTurnOnAllConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{allActive ? "Turn off" : "Turn on"} {agent.name}?</DialogTitle>
            <DialogDescription>
              You are {allActive ? "turning off" : "turning on"} {agent.name} for all properties. This will {allActive ? "stop" : "start"} the agent across every property in your portfolio.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-end gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setShowTurnOnAllConfirm(false)}>No, cancel</Button>
            <Button
              onClick={() => {
                const newStatus = allActive ? "Off" : "Active";
                setPropertyStatuses((prev) => {
                  const updated: Record<string, string> = {};
                  for (const key of Object.keys(prev)) updated[key] = newStatus;
                  return updated;
                });
                onToggle(newStatus);
                setShowTurnOnAllConfirm(false);
              }}
            >
              Yes, {allActive ? "turn off" : "turn on"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
