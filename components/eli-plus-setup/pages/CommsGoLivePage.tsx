"use client";

import { useState, useMemo } from "react";
import { Zap, AlertCircle, Info } from "lucide-react";
import type { PageId } from "../index";
import { PROPERTIES } from "../data/properties";
import { useConversationsDemo } from "@/lib/conversations-demo-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  navigate: (to: PageId) => void;
}

export function CommsGoLivePage({ navigate: _navigate }: Props) {
  const { activatedPropertyIds, activateProperty } = useConversationsDemo();
  const [modalProp, setModalProp] = useState<typeof PROPERTIES[0] | null>(null);
  const [staffTrained, setStaffTrained] = useState(false);

  // Only show inactive properties (never activated via Go Live).
  // Once activated, the property drops out of this list.
  const inactiveProperties = useMemo(() => {
    return PROPERTIES.filter((p) => !activatedPropertyIds.has(p.id));
  }, [activatedPropertyIds]);

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Go Live</h1>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Activate Eli Orchestrator for each property individually. Once
            activated, the property is moved to the OXP Communications area
            for staff-managed replies and escalations.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {inactiveProperties.length} inactive
        </span>
      </div>

      {/* Properties list */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border bg-muted/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Property
        </div>
        <ul className="divide-y divide-border/60">
          {inactiveProperties.map((prop) => (
            <li
              key={prop.id}
              className="flex items-center justify-between gap-4 px-4 py-2.5 transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {prop.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {prop.city}, {prop.state}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStaffTrained(false);
                  setModalProp(prop);
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
              >
                <Zap className="h-3 w-3" />
                Go Live
              </button>
            </li>
          ))}
          {inactiveProperties.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-muted-foreground">
              🎉 All properties are live! No inactive properties remaining.
            </li>
          )}
        </ul>
      </div>

      {/* ── Go Live Confirmation Modal (mirrors agent-roster modal) ── */}
      <Dialog
        open={!!modalProp}
        onOpenChange={(open) => {
          if (!open) {
            setModalProp(null);
            setStaffTrained(false);
          }
        }}
      >
        <DialogContent
          className="max-w-lg gap-0 p-0 z-[10001]"
          overlayClassName="z-[10000]"
        >
          <DialogHeader className="space-y-1 border-b px-6 py-5">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Zap className="h-4 w-4 text-emerald-600" />
              Activate Eli Orchestrator
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              You are about to activate Eli Orchestrator for{" "}
              <strong className="text-foreground">{modalProp?.name}</strong>.
              Please review the changes below before confirming.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[65vh] space-y-5 overflow-y-auto px-6 py-5">
            {/* What will change */}
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                What will change
              </h4>
              <ul className="space-y-1.5 pl-5 text-sm text-muted-foreground">
                <li className="list-disc">
                  Automated messages from contact points and the message center
                  will switch to the new{" "}
                  <strong className="text-foreground">
                    Eli Orchestrator vanity number
                  </strong>
                  .
                </li>
                <li className="list-disc">
                  A <strong className="text-foreground">chatbot</strong> will
                  be added to the prospect portal website for this property.
                </li>
                <li className="list-disc">
                  Residents using{" "}
                  <strong className="text-foreground">
                    Resident Portal or Homebody
                  </strong>{" "}
                  will see the chatbot in their app.
                </li>
                <li className="list-disc">
                  All <strong className="text-foreground">escalations</strong>{" "}
                  will begin routing to the OXP Communications area for staff
                  resolution.
                </li>
              </ul>
            </div>

            {/* Optional customizations — informational */}
            <div>
              <h4 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Info className="h-3.5 w-3.5 text-blue-500" />
                Optional customizations
              </h4>
              <p className="mb-2 text-xs text-muted-foreground">
                These aren&apos;t required to go live, but if you already use
                IVR or custom email, you&apos;ll want to review them so those
                flows behave the way you expect.
              </p>
              <ul className="space-y-1.5 pl-5 text-sm text-muted-foreground">
                <li className="list-disc">
                  <strong className="text-foreground">IVR flow:</strong> If
                  you use voice, you can route the Eli Orchestrator vanity
                  number behind your Leasing AI and Maintenance AI options so
                  inbound calls reach the AI.
                </li>
                <li className="list-disc">
                  <strong className="text-foreground">AI-powered email:</strong>{" "}
                  Integrate your custom email in OXP Communications Settings
                  to enable Eli Orchestrator AI emails. Otherwise, your
                  existing non-AI email flow continues to work as it does
                  today.
                </li>
              </ul>
            </div>

            {/* Staff readiness — required with acknowledgment */}
            <div className="rounded-lg border border-red-300 bg-red-50 p-4">
              <h4 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-red-800">
                <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                Staff readiness (required)
              </h4>
              <p className="mb-3 text-sm text-red-800">
                Your team must be trained and prepared to handle all
                communication replies from leads and residents — including
                escalations — in the OXP Communications area before going
                live.
              </p>
              <p className="mb-3 text-xs font-medium text-red-700">
                ⚠ Going live without a trained staff can lead to lead and
                resident conversations going unmanaged, missed escalations,
                and lost leases.
              </p>
              <label className="flex cursor-pointer items-start gap-2 rounded-md border border-red-300 bg-white p-2.5 hover:bg-red-100/40">
                <Checkbox
                  checked={staffTrained}
                  onCheckedChange={(checked) =>
                    setStaffTrained(checked === true)
                  }
                  className="mt-0.5 border-red-400 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                />
                <span className="text-sm font-medium text-red-900">
                  I confirm my staff is trained and ready to manage lead and
                  resident communications, including escalations, in the OXP
                  Communications area.
                </span>
              </label>
            </div>
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button
              variant="outline"
              onClick={() => {
                setModalProp(null);
                setStaffTrained(false);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!staffTrained}
              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-600/40"
              onClick={() => {
                if (modalProp) {
                  activateProperty(modalProp.id);
                }
                setModalProp(null);
                setStaffTrained(false);
              }}
              title={
                !staffTrained ? "Confirm staff readiness to enable" : undefined
              }
            >
              <Zap className="h-3.5 w-3.5" />
              Confirm &amp; Go Live
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
