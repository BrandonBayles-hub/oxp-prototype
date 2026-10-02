"use client";

import { useState, useMemo } from "react";
import { Zap, CheckCircle2 } from "lucide-react";
import type { PageId } from "../index";
import { PROPERTIES } from "../data/properties";
import { useConversationsDemo, type GoLiveChannels } from "@/lib/conversations-demo-context";
import { GoLiveActivationDialog } from "../GoLiveActivationDialog";

interface Props {
  navigate: (to: PageId) => void;
}

export function CommsGoLivePage({ navigate }: Props) {
  const {
    activatedPropertyIds,
    activatedPropertyNumbers,
    activatedPropertyChannels,
    activateProperty,
  } = useConversationsDemo();

  const [goLiveModalProp, setGoLiveModalProp] = useState<
    typeof PROPERTIES[0] | null
  >(null);

  // Show ALL contracted Eli Orchestrator properties, sorted so live
  // properties bubble to the top (staff usually wants to see the active
  // ones at a glance) and inactive ones stay in original order below.
  const sortedProperties = useMemo(() => {
    const live: typeof PROPERTIES = [];
    const inactive: typeof PROPERTIES = [];
    for (const p of PROPERTIES) {
      if (activatedPropertyIds.has(p.id)) live.push(p);
      else inactive.push(p);
    }
    return [...live, ...inactive];
  }, [activatedPropertyIds]);

  const liveCount = activatedPropertyIds.size;
  const inactiveCount = PROPERTIES.length - liveCount;

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Go Live</h1>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Choose what goes live for each property. After you confirm, this
            list only shows what is on. Turn a channel off later from Agent Roster.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            {liveCount} live
          </span>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {inactiveCount} inactive
          </span>
        </div>
      </div>

      {/* Properties list */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border bg-muted/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Property
        </div>
        <ul className="divide-y divide-border/60">
          {sortedProperties.map((prop) => {
            const isLive = activatedPropertyIds.has(prop.id);
            return (
              <li
                key={prop.id}
                className="flex items-center justify-between gap-4 px-4 py-2.5 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {prop.name}
                    </p>
                    {isLive && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Live
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {prop.city}, {prop.state}
                    {isLive && <LiveChannelSummary channels={activatedPropertyChannels[prop.id]} number={activatedPropertyNumbers[prop.id]} />}
                  </p>
                </div>
                {isLive ? (
                  <span className="shrink-0 text-[11px] text-muted-foreground">On</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setGoLiveModalProp(prop)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
                  >
                    <Zap className="h-3 w-3" />
                    Go Live
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── Go Live Confirmation Modal (shared with Agent Roster) ── */}
      <GoLiveActivationDialog
        property={goLiveModalProp}
        onOpenChange={(open) => {
          if (!open) setGoLiveModalProp(null);
        }}
        onConfirm={(prop, selection) => activateProperty(prop.id, selection)}
        onReviewEmail={() => navigate("email")}
        contentClassName="z-[10001]"
        overlayClassName="z-[10000]"
        selectContentClassName="z-[10002]"
      />

    </div>
  );
}

function LiveChannelSummary({
  channels,
  number,
}: {
  channels?: GoLiveChannels;
  number?: string;
}) {
  const parts = [
    channels?.prospectPortal !== false ? "Prospect portal" : null,
    channels?.residentPortal !== false ? "Resident portal" : null,
    channels?.sms !== false && number ? `SMS ${number}` : channels?.sms !== false ? "SMS" : null,
    channels?.email ? "Email" : "Email not connected",
  ].filter(Boolean);
  return <span className="tabular-nums"> · {parts.join(" · ")}</span>;
}
