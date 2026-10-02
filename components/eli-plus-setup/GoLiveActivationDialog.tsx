"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Zap,
  Phone,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { GoLiveChannels } from "@/lib/conversations-demo-context";

/** Minimal property shape shared by Agent Roster and ELI+ Setup. */
export interface GoLiveProperty {
  id: string;
  name: string;
  city?: string;
  state?: string;
}

export interface EliNumberOption {
  value: string;
  isDefault?: boolean;
  /** Short note shown next to the number, e.g. "Current property number". */
  note?: string;
}

interface Props {
  property: GoLiveProperty | null;
  onOpenChange: (open: boolean) => void;
  /** Fires with the channels the user left checked. None of them block confirm. */
  onConfirm: (property: GoLiveProperty, selection: GoLiveChannels) => void;
  /**
   * Optional override for the number list. When omitted we generate a
   * deterministic mock pool in the property's area code.
   */
  numberOptions?: EliNumberOption[];
  /** Extra classes for DialogContent (e.g. z-index when nested in a Sheet). */
  contentClassName?: string;
  overlayClassName?: string;
  /** Extra classes for the Select dropdown (must sit above the dialog). */
  selectContentClassName?: string;
  /**
   * Opens the ELI+ Setup Email Integration page. The dialog closes first.
   * Optional: the review link still closes the dialog when omitted.
   */
  onReviewEmail?: () => void;
}

// ── Mock number pool ────────────────────────────────────────────────────────
// Area codes for the ELI+ Setup property cities; roster properties (no city)
// fall back to a hash-picked code so each property gets a stable pool.
const AREA_CODES: Record<string, string> = {
  Austin: "512", Dallas: "214", Houston: "713", "San Antonio": "210",
  Waco: "254", "Fort Worth": "817", "El Paso": "915", Lubbock: "806",
  Amarillo: "806", "Corpus Christi": "361", Arlington: "817",
  "Los Angeles": "213", "San Francisco": "415", "San Diego": "619",
  Oakland: "510", Riverside: "951", Sacramento: "916", Fresno: "559",
  Phoenix: "602", Tucson: "520", Tempe: "480", Chandler: "480",
  Scottsdale: "480", Mesa: "480", Denver: "720", Chicago: "312",
  Minneapolis: "612", Columbus: "614", Detroit: "313", Seattle: "206",
  Portland: "503", "Salt Lake City": "801",
};
const FALLBACK_AREA_CODES = ["512", "720", "602", "214", "206", "312", "801", "503"];
const EXCHANGES = ["423", "315", "891", "763", "542", "677", "483", "721", "856", "934"];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function buildEliNumberOptions(property: GoLiveProperty): EliNumberOption[] {
  const h = hash(property.id);
  const areaCode =
    (property.city && AREA_CODES[property.city]) ||
    FALLBACK_AREA_CODES[h % FALLBACK_AREA_CODES.length];
  const exchange = EXCHANGES[h % EXCHANGES.length];
  const base = 1100 + (h % 80) * 100;
  const pool = Array.from({ length: 4 }, (_, i) => ({
    value: `(${areaCode}) ${exchange}-${String(base + i * 11).padStart(4, "0")}`,
    isDefault: i === 0,
  }));
  return pool;
}

function ChannelRow({
  checked,
  onCheckedChange,
  title,
  children,
  testId,
  icon,
  extra,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  title: string;
  children: React.ReactNode;
  testId: string;
  icon?: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <li className="py-2.5">
      <label className="flex cursor-pointer items-start gap-3">
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          className="mt-0.5"
          data-testid={testId}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm font-semibold leading-5 text-foreground">
            {icon}
            {title}
          </span>
          <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">{children}</span>
        </span>
      </label>
      {extra && <div className="pl-7 pt-2">{extra}</div>}
    </li>
  );
}

export function GoLiveActivationDialog({
  property,
  onOpenChange,
  onConfirm,
  numberOptions,
  contentClassName,
  overlayClassName,
  selectContentClassName,
  onReviewEmail,
}: Props) {
  const options = useMemo<EliNumberOption[]>(() => {
    if (!property) return [];
    return numberOptions ?? buildEliNumberOptions(property);
  }, [property, numberOptions]);
  const defaultValue = options.find((o) => o.isDefault)?.value ?? options[0]?.value ?? "";

  const [selectedNumber, setSelectedNumber] = useState(defaultValue);
  const [prospectPortal, setProspectPortal] = useState(true);
  const [residentPortal, setResidentPortal] = useState(true);
  const [smsOn, setSmsOn] = useState(true);
  const [staffTrained, setStaffTrained] = useState(false);

  // Reset per-open so each property starts from its default number.
  useEffect(() => {
    setSelectedNumber(defaultValue);
    setProspectPortal(true);
    setResidentPortal(true);
    setSmsOn(true);
    setStaffTrained(false);
  }, [property?.id, defaultValue]);

  const close = () => onOpenChange(false);

  return (
    <Dialog open={!!property} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[calc(100vh-2rem)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[640px]",
          contentClassName
        )}
        overlayClassName={overlayClassName}
        data-testid="go-live-dialog"
      >
        <DialogHeader className="space-y-1 border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Zap className="h-4 w-4 text-emerald-600" />
            Activate Eli Orchestrator
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Review the following checklist before going live at{" "}
            <strong className="font-semibold text-foreground">{property?.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="oxp-visible-scrollbar min-h-0 max-h-[calc(100vh-220px)] flex-1 overflow-y-scroll px-6 py-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Info className="h-4 w-4 text-sky-600" />
            What will change
          </p>
          <ul className="mt-1 divide-y divide-border/60">
            <ChannelRow
              checked={prospectPortal}
              onCheckedChange={setProspectPortal}
              title="Prospect portal"
              testId="channel-prospect"
            >
              A chatbot will be added to the prospect portal website for this property. It answers leasing questions. Uncheck to go live without it.
            </ChannelRow>
            <ChannelRow
              checked={residentPortal}
              onCheckedChange={setResidentPortal}
              title="Resident portal"
              testId="channel-resident"
            >
              Residents using Resident Portal or Homebody will see the chatbot in their app for renewals, payments, and maintenance. Uncheck to go live without it.
            </ChannelRow>
            <ChannelRow
              checked={smsOn}
              onCheckedChange={setSmsOn}
              title="Eli Orchestrator number"
              testId="channel-sms"
              icon={<Phone className="h-4 w-4 text-emerald-600" />}
              extra={
                smsOn ? (
                  <Select value={selectedNumber} onValueChange={setSelectedNumber}>
                    <SelectTrigger
                      className="h-8 w-[210px] text-xs font-medium"
                      aria-label="Eli Orchestrator number"
                      data-testid="eli-number-select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={cn("z-[150]", selectContentClassName)}>
                      {options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          <span className="inline-flex items-center gap-2 tabular-nums">
                            {opt.value}
                            {opt.isDefault && (
                              <Badge variant="green" className="px-1.5 py-0 text-[10px] font-semibold">
                                Default
                              </Badge>
                            )}
                            {!opt.isDefault && opt.note && (
                              <span className="text-[10px] text-muted-foreground">{opt.note}</span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null
              }
            >
              Automated messages from contact points and the message center will switch to this number. Uncheck to go live without texts and calls.
            </ChannelRow>
            <li className="flex items-start gap-3 py-2.5" data-testid="escalations-notice">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-5 text-foreground">Escalations</p>
                <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
                  All escalations will begin routing to the OXP Communications area for staff resolution. This happens when you go live and is not optional.
                </p>
              </div>
            </li>
          </ul>

          <p className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Info className="h-4 w-4 text-sky-600" />
            Optional customizations
          </p>
          <p className="mt-1 text-xs leading-4 text-muted-foreground">
            These aren&apos;t required to go live. If you already use IVR or custom email, review them so those flows behave the way you expect.
          </p>
          <ul className="mt-1 divide-y divide-border/60">
            <li className="py-2.5" data-testid="ivr-optional">
              <p className="text-sm font-semibold leading-5 text-foreground">IVR flow</p>
              <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
                If you use voice, you can route the Eli Orchestrator number behind your Leasing AI and Maintenance AI options so inbound calls reach the AI. This does not block go live.
              </p>
            </li>
            <li className="py-2.5" data-testid="email-integration-review">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-5 text-foreground">AI-powered email</p>
                  <p className="text-xs leading-4 text-muted-foreground">
                    Not connected. Integrate your custom email to enable Eli Orchestrator AI emails. Otherwise your existing non-AI email flow continues as it does today. You can set this up before or after go live.
                  </p>
                  <button
                    type="button"
                    className="mt-1.5 text-xs font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
                    onClick={() => {
                      close();
                      onReviewEmail?.();
                    }}
                    data-testid="review-email-integration"
                  >
                    Review email integration
                  </button>
                </div>
              </div>
            </li>
          </ul>

          <label
            className={cn(
              "mt-3 flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5 transition-colors",
              staffTrained
                ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100/40"
                : "border-red-300 bg-red-50 hover:bg-red-100/40"
            )}
          >
            <Checkbox
              checked={staffTrained}
              onCheckedChange={(checked) => setStaffTrained(checked === true)}
              className={cn(
                "mt-0.5",
                staffTrained
                  ? "border-emerald-500 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white"
                  : "border-red-400 data-[state=checked]:border-red-600 data-[state=checked]:bg-red-600"
              )}
              data-testid="staff-trained-checkbox"
            />
            <span className="min-w-0">
              <span
                className={cn(
                  "block text-sm font-medium leading-5",
                  staffTrained ? "text-emerald-900" : "text-red-900"
                )}
              >
                My staff is trained to handle lead and resident replies and escalations in OXP
                Communications.
              </span>
              {staffTrained ? (
                <span className="mt-0.5 flex items-center gap-1 text-[11px] text-emerald-700">
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />
                  Staff readiness confirmed.
                </span>
              ) : (
                <span className="mt-0.5 flex items-center gap-1 text-[11px] text-red-700">
                  <AlertTriangle className="h-3 w-3 shrink-0 text-red-600" />
                  Required. Untrained staff leads to missed escalations and lost leases.
                </span>
              )}
            </span>
          </label>
        </div>

        <DialogFooter className="border-t px-6 py-3.5">
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button
            disabled={!staffTrained}
            className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-600/40"
            title={!staffTrained ? "Confirm staff readiness to enable" : undefined}
            onClick={() => {
              if (property) {
                onConfirm(property, {
                  prospectPortal,
                  residentPortal,
                  sms: smsOn,
                  email: false,
                  eliNumber: smsOn ? selectedNumber : "",
                });
              }
              close();
            }}
            data-testid="confirm-go-live"
          >
            <Zap className="h-3.5 w-3.5" />
            Confirm &amp; Go Live
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
