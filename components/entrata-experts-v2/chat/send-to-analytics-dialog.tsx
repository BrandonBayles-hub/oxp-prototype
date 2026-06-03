"use client";
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpRight,
  Check,
  Loader2,
  AlertCircle,
  Camera,
  Database,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Artifact } from "@/lib/entrata-experts-v2/types";
import {
  DESTINATIONS,
  COMPANY_FOLDERS,
  type Tier,
  type HandoffMode,
  artifactToDashboardSource,
  describeArtifact,
  deliverHandoff,
  continueBuildingUrl,
  libraryUrl,
  companyMenuUrl,
  ANALYTICS_PLATFORM_URL,
} from "@/lib/entrata-experts-v2/analytics-handoff";

export interface HandoffContext {
  scopeLabel?: string;
  prompt?: string;
}

type Step = "form" | "success";

export function SendToAnalyticsDialog({
  open,
  artifact,
  context,
  onClose,
}: {
  open: boolean;
  artifact: Artifact;
  context?: HandoffContext;
  onClose: () => void;
}) {
  const defaultName = React.useMemo(() => suggestName(artifact, context), [artifact, context]);

  const [step, setStep] = React.useState<Step>("form");
  const [name, setName] = React.useState(defaultName);
  const [tier, setTier] = React.useState<Tier>("PERSONAL");
  const [folder, setFolder] = React.useState<string>(COMPANY_FOLDERS[0]);
  const [mode, setMode] = React.useState<HandoffMode>("snapshot");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [baseUrl, setBaseUrl] = React.useState<string>(ANALYTICS_PLATFORM_URL);

  // Reset whenever a new artifact is targeted.
  React.useEffect(() => {
    if (open) {
      setStep("form");
      setName(defaultName);
      setTier("PERSONAL");
      setFolder(COMPANY_FOLDERS[0]);
      setMode("snapshot");
      setSending(false);
      setError(null);
    }
  }, [open, defaultName]);

  const built = React.useMemo(
    () => artifactToDashboardSource(artifact, { mode, title: name }),
    [artifact, mode, name],
  );
  const bindingSummary = React.useMemo(() => describeArtifact(artifact, mode), [artifact, mode]);

  const destLabel = DESTINATIONS.find((d) => d.tier === tier)?.label ?? "Analytics Platform";

  async function handleSend() {
    setSending(true);
    setError(null);
    const res = await deliverHandoff({
      name: name.trim() || defaultName,
      tier,
      dashboardSource: built.source,
      menuFolder: tier === "COMPANY" ? folder : undefined,
    });
    setSending(false);
    if (res.delivered) {
      setBaseUrl(res.baseUrl);
      setStep("success");
    } else {
      setError(res.error ?? "Delivery failed.");
    }
  }

  function handleContinueBuilding() {
    const url = continueBuildingUrl(ANALYTICS_PLATFORM_URL, {
      prompt: context?.prompt,
      title: name.trim() || defaultName,
    });
    if (typeof window !== "undefined") window.open(url, "_blank", "noopener");
  }

  const successHref = tier === "COMPANY" ? companyMenuUrl(baseUrl) : libraryUrl(baseUrl);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>Send to Analytics Platform</DialogTitle>
              <DialogDescription>
                Publish this answer as a governed, re-runnable report.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-1">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="handoff-name">Name</Label>
                <Input
                  id="handoff-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Report name"
                />
              </div>

              {/* Destination */}
              <div className="space-y-1.5">
                <Label>Where should this live?</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {DESTINATIONS.map((d) => {
                    const active = d.tier === tier;
                    return (
                      <button
                        key={d.tier}
                        type="button"
                        onClick={() => setTier(d.tier)}
                        className={cn(
                          "rounded-md border px-2.5 py-2 text-left transition-colors",
                          active
                            ? "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-300"
                            : "border-border bg-background hover:bg-muted/50",
                        )}
                      >
                        <div className="text-[13px] font-medium text-foreground">{d.label}</div>
                        <div className="text-[11px] text-muted-foreground">{d.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Company Menu folder */}
              {tier === "COMPANY" && (
                <div className="space-y-1.5">
                  <Label htmlFor="handoff-folder">Company Menu folder</Label>
                  <Select value={folder} onValueChange={setFolder}>
                    <SelectTrigger id="handoff-folder">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_FOLDERS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Data binding (Phase 1 snapshot vs Phase 2 live) */}
              <div className="space-y-1.5">
                <Label>Data binding</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  <BindingOption
                    active={mode === "snapshot"}
                    onClick={() => setMode("snapshot")}
                    icon={<Camera className="h-3.5 w-3.5" />}
                    title="Snapshot"
                    sub="v1.0–v1.2"
                  />
                  <BindingOption
                    active={mode === "live"}
                    onClick={() => setMode("live")}
                    icon={<Database className="h-3.5 w-3.5" />}
                    title="Live metrics"
                    sub="V1.3 preview"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">{bindingSummary}</p>
                {mode === "live" && built.live && built.mappedMetrics.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {built.mappedMetrics.map((m) => (
                      <span
                        key={m}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                )}
                {mode === "live" && built.unmappedLabels.length > 0 && (
                  <p className="text-[11px] text-amber-600">
                    Not yet in the shared dictionary: {built.unmappedLabels.join(", ")}
                  </p>
                )}
              </div>

              {/* Preview */}
              <details className="group rounded-md border border-border bg-muted/30">
                <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
                  Preview dashboard source
                </summary>
                <pre className="max-h-44 overflow-auto border-t border-border px-3 py-2 text-[11px] leading-relaxed text-foreground">
                  {built.source}
                </pre>
              </details>

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleContinueBuilding}
                className="text-muted-foreground"
                title="Open the Analytics Platform composer seeded with this question"
              >
                Continue building <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Button>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={sending}>
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={handleSend} disabled={sending || !name.trim()}>
                  {sending ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      Send to Analytics Platform <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-5 w-5 text-emerald-600" />
              </div>
              <DialogTitle className="text-center">Sent to {destLabel}</DialogTitle>
              <DialogDescription className="text-center">
                <span className="font-medium text-foreground">{name.trim() || defaultName}</span> will
                appear in your {destLabel}
                {tier === "COMPANY" ? ` → ${folder}` : ""}.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2 py-2">
              <a href={successHref} target="_blank" rel="noopener noreferrer" className="w-full">
                <Button type="button" className="w-full">
                  Open in Analytics Platform <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </a>
              <a href={libraryUrl(baseUrl)} target="_blank" rel="noopener noreferrer" className="w-full">
                <Button type="button" variant="outline" className="w-full">
                  View library
                </Button>
              </a>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" onClick={onClose} className="mx-auto">
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BindingOption({
  active,
  onClick,
  icon,
  title,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors",
        active
          ? "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-300"
          : "border-border bg-background hover:bg-muted/50",
      )}
    >
      <span className={cn("shrink-0", active ? "text-indigo-600" : "text-muted-foreground")}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-foreground">{title}</span>
        <span className="block text-[11px] text-muted-foreground">{sub}</span>
      </span>
    </button>
  );
}

function suggestName(artifact: Artifact, context?: HandoffContext): string {
  const base = artifact.title?.trim() || "Entrata Analyst report";
  const scope = context?.scopeLabel?.trim();
  if (scope && scope !== "Whole portfolio" && !base.toLowerCase().includes(scope.toLowerCase())) {
    return `${base} — ${scope}`;
  }
  return base;
}
