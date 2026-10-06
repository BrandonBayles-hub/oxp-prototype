"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GlobalToast } from "./components/GlobalToast";
import {
  Zap,
  CheckCircle2,
  Copy,
  Check,
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
import { Switch } from "@/components/ui/switch";
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
  /** Shown under the number, e.g. "Outbound default" or "Next best". */
  note: string;
}

export type SetupStatus = "done" | "not_done";

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
  /** Opens the ELI+ Setup IVR page. The dialog closes first. */
  onReviewIvr?: () => void;
  /** Opens agent settings, where voice, tone, and simulation live. The dialog closes first. */
  onReviewAgentSettings?: () => void;
  /** Opens Property Websites, where the chat snippet also lives. The dialog closes first. */
  onReviewPropertyWebsites?: () => void;
  /** Whether email setup is finished. Falls back to mock data per property. */
  emailStatus?: SetupStatus;
  /** Whether IVR setup is finished. Falls back to mock data per property. */
  ivrStatus?: SetupStatus;
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
  const local = (i: number) => `(${areaCode}) ${exchange}-${String(base + i * 11).padStart(4, "0")}`;
  // About a third of properties have no outbound number yet, so the
  // recommendation falls back to the next best local number.
  const hasOutbound = h % 3 !== 0;
  return Array.from({ length: 4 }, (_, i) => ({
    value: local(i),
    isDefault: i === 0,
    note: i === 0 ? (hasOutbound ? "Outbound default" : "Next best") : "Local",
  }));
}

/** Draft of the dialog's choices, kept in sessionStorage so leaving and returning restores them. */
interface GoLiveDraft {
  selectedNumber: string;
  prospectPortal: boolean;
  residentPortal: boolean;
  staffTrained: boolean;
}

function readDraft(key: string): GoLiveDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as GoLiveDraft) : null;
  } catch {
    return null;
  }
}

function writeDraft(key: string, draft: GoLiveDraft) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(draft));
  } catch {}
}

function clearDraft(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {}
}

/** Mock setup status so the demo shows both states across properties. */
function mockStatus(property: GoLiveProperty, salt: string): SetupStatus {
  return hash(property.id + salt) % 2 === 0 ? "done" : "not_done";
}

function StatusBadge({ status }: { status: SetupStatus }) {
  return status === "done" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0 text-[10px] font-semibold text-emerald-700">
      <CheckCircle2 className="h-2.5 w-2.5" />
      Complete
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-blue-50 px-1.5 py-0 text-[10px] font-semibold text-blue-700">
      Optional
    </span>
  );
}

function RowIcon({ children, tone = "emerald" }: { children: React.ReactNode; tone?: "emerald" | "slate" | "amber" }) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    slate: "bg-slate-100 text-slate-600",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", tones[tone])}>
      {children}
    </span>
  );
}

/** Choice row: copy and an on/off switch. No status icon, so it doesn't look completed. */
function SettingRow({
  title,
  children,
  checked,
  onCheckedChange,
  testId,
  extra,
  warning,
}: {
  title: string;
  children: React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  testId: string;
  extra?: React.ReactNode;
  /** Shown in a yellow box when the switch is off. Replaces the Default tag. */
  warning?: React.ReactNode;
}) {
  const off = !checked && !!warning;
  return (
    <li className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold leading-5 text-foreground">{title}</p>
          {checked && (
            <span className="rounded-full bg-emerald-50 px-1.5 py-0 text-[10px] font-semibold text-emerald-700">
              Recommended Default
            </span>
          )}
          {off && (
            <span className="inline-flex items-center rounded-full bg-blue-50 px-1.5 py-0 text-[10px] font-semibold text-blue-700">
              Optional
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{children}</p>
        {off && <WarningBox>{warning}</WarningBox>}
        {extra && <div className="pt-2">{extra}</div>}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={title}
        className="mt-1 data-[state=checked]:bg-emerald-600"
        data-testid={testId}
      />
    </li>
  );
}

function WarningBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 flex w-[660px] max-w-full items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-2 text-xs leading-4 text-blue-700">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Copy row. Pass an icon only for a status row; choices and statements stay plain. */
function InfoRow({
  icon,
  title,
  children,
  tone = "emerald",
  testId,
  badge,
  extra,
  warning,
  description,
}: {
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  description?: React.ReactNode;
  tone?: "emerald" | "slate" | "amber";
  testId: string;
  badge?: React.ReactNode;
  extra?: React.ReactNode;
  warning?: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3 py-3" data-testid={testId}>
      {icon && <RowIcon tone={tone}>{icon}</RowIcon>}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold leading-5 text-foreground">{title}</p>
          {badge}
        </div>
        {(children ?? description) && (
          <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{children ?? description}</p>
        )}
        {warning && <WarningBox>{warning}</WarningBox>}
        {extra && <div className="pt-1.5">{extra}</div>}
      </div>
    </li>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="pb-1 pt-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{subtitle}</p>
    </div>
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
  onReviewIvr,
  onReviewAgentSettings,
  onReviewPropertyWebsites,
  emailStatus,
  ivrStatus,
}: Props) {
  const email: SetupStatus = emailStatus ?? (property ? mockStatus(property, "email") : "not_done");
  const ivr: SetupStatus = ivrStatus ?? (property ? mockStatus(property, "ivr") : "not_done");
  const agentSettings: SetupStatus = property ? mockStatus(property, "agent-settings") : "not_done";
  const [numberCopied, setNumberCopied] = useState(false);
  const [snippetCopied, setSnippetCopied] = useState(false);
  const [pageToast, setPageToast] = useState("");
  const [pageToastVisible, setPageToastVisible] = useState(false);
  const pageToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showPageToast(message: string) {
    if (pageToastTimer.current) clearTimeout(pageToastTimer.current);
    setPageToast(message);
    setPageToastVisible(true);
    pageToastTimer.current = setTimeout(() => setPageToastVisible(false), 4000);
  }
  const options = useMemo<EliNumberOption[]>(() => {
    if (!property) return [];
    return numberOptions ?? buildEliNumberOptions(property);
  }, [property, numberOptions]);
  const defaultValue = options.find((o) => o.isDefault)?.value ?? options[0]?.value ?? "";

  const [selectedNumber, setSelectedNumber] = useState(defaultValue);
  const [prospectPortal, setProspectPortal] = useState(true);
  const [residentPortal, setResidentPortal] = useState(true);
  const [staffTrained, setStaffTrained] = useState(false);

  // The dialog receives Escape before the number dropdown does, so it closes
  // the dropdown itself instead of closing both at once.
  const [numberMenuOpen, setNumberMenuOpen] = useState(false);
  const numberMenuOpenRef = useRef(false);
  const onNumberMenuOpenChange = (open: boolean) => {
    numberMenuOpenRef.current = open;
    setNumberMenuOpen(open);
  };

  // Per-open: restore the saved draft for this property, or start from defaults.
  // The draft survives leaving the dialog to finish email, IVR, or agent settings.
  const draftKey = property ? `eli-go-live-draft:${property.id}` : null;
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  useEffect(() => {
    const draft = draftKey ? readDraft(draftKey) : null;
    const validNumber = draft?.selectedNumber && options.some((o) => o.value === draft.selectedNumber);
    setSelectedNumber(validNumber ? draft!.selectedNumber : defaultValue);
    setProspectPortal(draft?.prospectPortal ?? true);
    setResidentPortal(draft?.residentPortal ?? true);
    setStaffTrained(draft?.staffTrained ?? false);
    setNumberCopied(false);
    onNumberMenuOpenChange(false);
    setHydratedKey(draftKey);
  }, [draftKey, defaultValue, options]);

  // Save the draft whenever a choice changes while the dialog is open.
  // Only after hydration for this key, so restored values aren't overwritten.
  useEffect(() => {
    if (!draftKey || hydratedKey !== draftKey) return;
    writeDraft(draftKey, { selectedNumber, prospectPortal, residentPortal, staffTrained });
  }, [draftKey, hydratedKey, selectedNumber, prospectPortal, residentPortal, staffTrained]);

  const chatSnippet = `<script src="{$mfe_base_url}/oxp-agent-widget.js" defer></script>`;

  function copySnippet() {
    navigator.clipboard.writeText(chatSnippet).then(() => {
      setSnippetCopied(true);
      showPageToast("Chat snippet copied");
      window.setTimeout(() => setSnippetCopied(false), 1500);
    }).catch(() => {});
  }

  function copyNumber() {
    if (!selectedNumber) return;
    navigator.clipboard.writeText(selectedNumber).then(() => {
      setNumberCopied(true);
      showPageToast("Number copied");
      window.setTimeout(() => setNumberCopied(false), 1500);
    }).catch(() => {});
  }

  const close = () => onOpenChange(false);

  // Hide every scrollbar behind the pop-up. The checklist keeps the only one.
  useEffect(() => {
    if (!property) return;
    const locked: { el: HTMLElement; overflow: string }[] = [];
    document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
      if (el.closest("[data-testid=go-live-dialog]")) return;
      const style = getComputedStyle(el);
      const scrolls =
        (style.overflowY === "auto" || style.overflowY === "scroll") &&
        el.scrollHeight > el.clientHeight + 1;
      if (!scrolls) return;
      locked.push({ el, overflow: el.style.overflowY });
      el.style.overflowY = "hidden";
    });
    return () => {
      locked.forEach(({ el, overflow }) => {
        el.style.overflowY = overflow;
      });
      // Closing the dialog and the number dropdown together leaves Radix's
      // body lock behind, which makes every click on the page do nothing.
      setTimeout(() => {
        if (document.querySelector("[role=dialog]")) return;
        document.body.style.removeProperty("pointer-events");
        document.body.style.removeProperty("overflow");
      }, 300);
    };
  }, [property]);
  return (
    <Dialog open={!!property} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[calc(100vh-2rem)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[760px]",
          contentClassName
        )}
        overlayClassName={overlayClassName}
        onEscapeKeyDown={(e) => {
          if (numberMenuOpenRef.current) {
            e.preventDefault();
            onNumberMenuOpenChange(false);
          }
        }}
        data-testid="go-live-dialog"
      >
        {typeof document !== "undefined" &&
          createPortal(
            <GlobalToast message={pageToast} visible={pageToastVisible} className="z-[10050]" />,
            document.body
          )}
        <DialogHeader className="space-y-1 border-b border-slate-300 bg-slate-50 px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Zap className="h-4 w-4 text-emerald-600" />
            Activate ELI Orchestrator
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Review what goes live at{" "}
            <strong className="font-semibold text-foreground">{property?.name}</strong>.
            {" "}Escalations always go to{" "}
            <strong className="font-semibold text-foreground">OXP Communications</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 max-h-[calc(100vh-220px)] flex-1 overflow-y-auto px-6 py-3 [scrollbar-width:thin]">
          <SectionTitle
            title="What Will Change"
            subtitle="Chatbots are enabled and a phone number is pre-selected by default. You can customize either setting now or update them later after going live."
          />
          <ul className="divide-y divide-border/60">
            <SettingRow
              title="Prospect Portal Chatbot"
              checked={prospectPortal}
              onCheckedChange={setProspectPortal}
              testId="channel-prospect"
              warning={
                <>
                  <p className="font-bold text-blue-700">Chat Snippet</p>
                  <p className="mt-0.5 font-normal text-blue-900">
                    You can still go live now and turn it on later, or embed this snippet into a third-party website:
                  </p>
                  <div className="mt-2 flex items-center gap-2 rounded-md border border-blue-200 bg-white px-2 py-1.5">
                    <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-800">{chatSnippet}</code>
                    <button
                      type="button"
                      onClick={copySnippet}
                      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-300 bg-slate-50 px-2 py-1 font-sans text-[11px] font-medium text-slate-800 hover:bg-slate-100"
                      aria-label="Copy chat snippet"
                      data-testid="copy-chat-snippet"
                    >
                      {snippetCopied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      {snippetCopied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </>
              }
            >
              A chatbot appears on this property&apos;s prospect portal website to answer leasing questions.
              <button
                type="button"
                className="mt-1 block font-medium text-foreground underline underline-offset-2 hover:text-foreground/80"
                onClick={() => {
                  close();
                  onReviewPropertyWebsites?.();
                }}
                data-testid="open-property-websites"
              >
                Open website settings
              </button>
            </SettingRow>
            <SettingRow
              title="Resident Portal Chatbot"
              checked={residentPortal}
              onCheckedChange={setResidentPortal}
              testId="channel-resident"
              warning="You can still go live. Turn it on in Resident Portal and Homebody later from Agent Roster."
            >
              Residents using Resident Portal or Homebody see the chatbot for renewals, payments, and maintenance.
              <button
                type="button"
                className="mt-1 block font-medium text-foreground underline underline-offset-2 hover:text-foreground/80"
                onClick={() => {
                  close();
                  onReviewAgentSettings?.();
                }}
                data-testid="open-agent-roster"
              >
                Open Agent Roster
              </button>
            </SettingRow>
            <InfoRow
              title="ELI Orchestrator Number"
              testId="channel-sms"
              badge={
                selectedNumber === defaultValue ? (
                  <span className="rounded-full bg-emerald-50 px-1.5 py-0 text-[10px] font-semibold text-emerald-700">
                    Recommended Default
                  </span>
                ) : undefined
              }
              extra={
                <div className="flex items-center gap-2">
                <Select value={selectedNumber} onValueChange={setSelectedNumber} open={numberMenuOpen} onOpenChange={onNumberMenuOpenChange}>
                  <SelectTrigger
                    className="h-8 w-[300px] text-xs font-medium"
                    aria-label="ELI Orchestrator number"
                    data-testid="eli-number-select"
                  >
                    <SelectValue>
                      <span className="flex w-full items-center justify-between gap-3 pr-2 tabular-nums">
                        {selectedNumber}
                        <span
                          className={cn(
                            "text-[11px]",
                            selectedNumber === defaultValue ? "font-medium text-emerald-700" : "text-muted-foreground"
                          )}
                          data-testid="eli-number-note"
                        >
                          {options.find((o) => o.value === selectedNumber)?.note}
                        </span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className={cn("z-[150] w-[300px]", selectContentClassName)}>
                    {options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        <span className="flex flex-col tabular-nums">
                          {opt.value}
                          <span
                            className={cn(
                              "text-[10px]",
                              opt.isDefault ? "font-medium text-emerald-700" : "text-muted-foreground"
                            )}
                          >
                            {opt.note}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={copyNumber}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label={numberCopied ? "Number copied" : "Copy ELI Orchestrator number"}
                  data-testid="copy-eli-number"
                >
                  {numberCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                </div>
              }
            >
              Automated messages from contact points and the message center send from this number.
            </InfoRow>
          </ul>

          <div className="mt-8 border-t border-slate-300" />
          <SectionTitle
            title="Setup Status"
            subtitle="We check these for you. Not required to go live — finish anything not done now or later."
          />
          <ul className="divide-y divide-border/60">
            <InfoRow
              title="AI-Powered Email"
              testId="email-integration-review"
              badge={<StatusBadge status={email} />}
              description={
                <>
                  {email === "done"
                    ? "Your email address is connected. ELI Orchestrator answers email for this property."
                    : "No email address is connected yet, so your current non-AI email keeps working as it does today."}
                  <button
                    type="button"
                    className="mt-1 block font-medium text-foreground underline underline-offset-2 hover:text-foreground/80"
                    onClick={() => {
                      close();
                      onReviewEmail?.();
                    }}
                    data-testid="review-email-integration"
                  >
                    Finish email setup
                  </button>
                </>
              }
              warning={
                email === "done" ? undefined : (
                  <>
                    <p className="font-bold text-blue-700">Email setup not done</p>
                    <p className="mt-0.5 font-normal text-blue-700">
                      You can still go live. Finishing email setup is highly recommended.
                    </p>
                  </>
                )
              }
            />
            <InfoRow
              title="IVR Flow"
              testId="channel-ivr"
              badge={<StatusBadge status={ivr} />}
              description={
                <>
                  {ivr === "done"
                    ? "Inbound calls route to the ELI Orchestrator number behind your Leasing AI and Maintenance AI options."
                    : "Calls aren't routed to the ELI Orchestrator number yet. Your current phone menu keeps working as it does today."}
                  <button
                    type="button"
                    className="mt-1 block font-medium text-foreground underline underline-offset-2 hover:text-foreground/80"
                    onClick={() => {
                      close();
                      onReviewIvr?.();
                    }}
                    data-testid="review-ivr-setup"
                  >
                    {ivr === "done" ? "Review IVR setup" : "Finish IVR setup"}
                  </button>
                </>
              }
            />
            <InfoRow
              title="ELI Orchestrator Settings"
              testId="channel-agent-settings"
              badge={<StatusBadge status={agentSettings} />}
              description={
                <>
                  Review Entrata settings, voice, and tone, and simulate a conversation to confirm how the agent responds.
                  <button
                    type="button"
                    className="mt-1 block font-medium text-foreground underline underline-offset-2 hover:text-foreground/80"
                    onClick={() => {
                      close();
                      onReviewAgentSettings?.();
                    }}
                    data-testid="review-agent-settings"
                  >
                    Review agent settings
                  </button>
                </>
              }
            />
          </ul>
        </div>

        <DialogFooter className="items-center justify-between gap-3 border-t border-slate-300 bg-slate-50 px-6 py-3.5 sm:justify-between">
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <div className="flex min-w-0 items-center gap-3">
          <label
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors",
              staffTrained
                ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100/40"
                : "border-red-300 bg-red-50 hover:bg-red-100/40"
            )}
          >
            <Checkbox
              checked={staffTrained}
              onCheckedChange={(checked) => setStaffTrained(checked === true)}
              className={cn(
                staffTrained
                  ? "border-emerald-500 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white"
                  : "border-red-400"
              )}
              data-testid="staff-trained-checkbox"
            />
            <span
              className={cn(
                "whitespace-nowrap text-sm font-medium",
                staffTrained ? "text-emerald-900" : "text-red-900"
              )}
            >
              I confirm staff is trained for OXP Communications
            </span>
          </label>
          <Button
            disabled={!staffTrained}
            className="shrink-0 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:border disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-100 disabled:shadow-none"
            title={!staffTrained ? "Confirm staff training to enable" : undefined}
            onClick={() => {
              if (property) {
                onConfirm(property, {
                  prospectPortal,
                  residentPortal,
                  sms: true,
                  email: email === "done",
                  eliNumber: selectedNumber,
                });
                if (draftKey) clearDraft(draftKey);
              }
              close();
            }}
            data-testid="confirm-go-live"
          >
            <Zap className="h-3.5 w-3.5" />
            Confirm &amp; Go Live
          </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
