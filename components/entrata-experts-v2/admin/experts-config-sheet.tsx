"use client";

import * as React from "react";
import {
  BarChart3,
  Bot,
  Check,
  Cpu,
  DollarSign,
  FileBarChart,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScopeOverrideTable } from "./scope-override-table";
import { MODELS } from "@/lib/entrata-experts-v2/lenses";
import type { ModelId } from "@/lib/entrata-experts-v2/types";
import {
  DEFAULT_EXPERTS_POLICY,
  useExpertsPolicy,
  type ExpertsPolicy,
  type ModelPolicy,
  type SpendPolicy,
  type SurfacePolicy,
} from "@/lib/entrata-experts-v2/admin-policy-context";
import { cn } from "@/lib/utils";

// =============================================================================
// Experts Config Sheet
// -----------------------------------------------------------------------------
// Right-side admin sheet opened from the Agent Roster when the Entrata Experts
// agent row is clicked. Three sections, ordered by frequency of admin use:
//
//   1. Surfaces — turn Analyst, Assistants, Report Analyzer on/off globally
//   2. Spend limits — org default + scoped overrides (token + on-demand $)
//   3. Model access — org default allow-list + scoped overrides
//
// Edits are buffered in local state until the admin clicks Save; Discard
// reverts to the policy currently in context. This matches the staging
// pattern used in the Intelligence agent sheet (see app/agent-roster/page.tsx
// IntelligenceAgentSheet) so behavior is consistent.
// =============================================================================

const HEADING_FONT =
  "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif";

export interface ExpertsConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpertsConfigSheet({
  open,
  onOpenChange,
}: ExpertsConfigSheetProps) {
  const { policy, savePolicy, resetPolicy } = useExpertsPolicy();
  const [draft, setDraft] = React.useState<ExpertsPolicy>(policy);

  // Reset the draft whenever the sheet (re)opens or the persisted policy
  // changes externally — keeps Save/Discard meaningful.
  React.useEffect(() => {
    if (open) setDraft(policy);
  }, [open, policy]);

  const dirty = React.useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(policy),
    [draft, policy],
  );

  const onSave = () => {
    savePolicy(draft);
    onOpenChange(false);
  };

  const onDiscard = () => setDraft(policy);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full flex flex-col overflow-hidden p-0 sm:max-w-[75vw]">
        <SheetHeader className="sr-only">
          <SheetTitle>Configure Entrata Experts</SheetTitle>
          <SheetDescription>
            Manage surfaces, spend limits, and model access for Entrata Experts.
          </SheetDescription>
        </SheetHeader>

        {/* Header bar */}
        <div className="flex items-center gap-3 border-b border-border bg-card px-5 py-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
            style={{ background: "#3b7a9e1a", color: "#3b7a9e" }}
          >
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2
                className="text-base font-semibold leading-tight text-foreground"
                style={{ fontFamily: HEADING_FONT }}
              >
                Entrata Experts
              </h2>
              <Badge variant="green" className="text-[10px]">
                Active
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              AI hub — Analyst, Assistants, Report Analyzer · governance and
              cost controls
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (
                  window.confirm(
                    "Reset all Experts policy to defaults? This removes every override.",
                  )
                ) {
                  resetPolicy();
                  setDraft(DEFAULT_EXPERTS_POLICY);
                }
              }}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              title="Reset to seeded defaults"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
            {dirty && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onDiscard}
                className="h-8 text-xs"
              >
                Discard
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={onSave}
              disabled={!dirty}
              className="h-8 gap-1.5 text-xs"
            >
              <Check className="h-3 w-3" />
              Save changes
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-muted/30 p-5">
          <div className="mx-auto flex max-w-[920px] flex-col gap-5">
            <SurfacesSection
              value={draft.surfaces}
              onChange={(next) =>
                setDraft((d) => ({ ...d, surfaces: next }))
              }
            />
            <SpendSection
              value={draft.spend}
              onChange={(next) => setDraft((d) => ({ ...d, spend: next }))}
            />
            <ModelAccessSection
              value={draft.models}
              onChange={(next) => setDraft((d) => ({ ...d, models: next }))}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// -----------------------------------------------------------------------------
// Section 1: Surfaces — Analyst / Assistants / Report Analyzer toggles
// -----------------------------------------------------------------------------

function SurfacesSection({
  value,
  onChange,
}: {
  value: SurfacePolicy;
  onChange: (next: SurfacePolicy) => void;
}) {
  const surfaces: {
    key: keyof SurfacePolicy;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    hue: string;
  }[] = [
    {
      key: "analyst",
      label: "Entrata Analyst",
      description:
        "Data-connected portfolio chat. Translates natural-language questions into governed SQL.",
      icon: BarChart3,
      hue: "#3b7a9e",
    },
    {
      key: "assistants",
      label: "Assistants",
      description:
        "Pre-built GPT assistants — Everyday, Ad Writing, Document Analyzer, and more.",
      icon: Bot,
      hue: "#0f766e",
    },
    {
      key: "reportAnalyzer",
      label: "Report Analyzer",
      description:
        "AI summary, trend, and anomaly detection layered on top of standard Entrata reports.",
      icon: FileBarChart,
      hue: "#4338ca",
    },
  ];

  return (
    <SectionShell
      title="Surfaces"
      description="Turn whole Entrata Experts surfaces on or off for your tenant. Per-user / per-property control comes from Roles & Access and the override tables below."
    >
      <div className="divide-y divide-border">
        {surfaces.map(({ key, label, description, icon: Icon, hue }) => (
          <div
            key={key}
            className="flex items-start gap-3 px-4 py-3"
          >
            <span
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
              style={{ background: `${hue}1a`, color: hue }}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground">{label}</div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </p>
            </div>
            <Switch
              checked={value[key]}
              onCheckedChange={(checked) =>
                onChange({ ...value, [key]: checked })
              }
              aria-label={`Toggle ${label}`}
            />
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

// -----------------------------------------------------------------------------
// Section 2: Spend limits
// -----------------------------------------------------------------------------

function SpendSection({
  value,
  onChange,
}: {
  value: ExpertsPolicy["spend"];
  onChange: (next: ExpertsPolicy["spend"]) => void;
}) {
  return (
    <SectionShell
      title="Spend limits"
      description="Cap monthly token consumption and on-demand spend. Overrides cascade narrowest-first: user beats group beats property beats org default."
      icon={DollarSign}
      hue="#0f766e"
    >
      <ScopeOverrideTable<SpendPolicy>
        title="Monthly caps"
        description="Set a default for everyone, then add overrides for the users / groups / properties that need different limits."
        defaultValue={value.default}
        // The override table works in `T` not `Partial<T>`, so we coerce in
        // and out: rendered editor always sees a full SpendPolicy seeded by
        // the org default for missing fields.
        overrides={Object.fromEntries(
          Object.entries(value.overrides).map(([k, v]) => [
            k,
            { ...value.default, ...v },
          ]),
        )}
        onDefaultChange={(next) => onChange({ ...value, default: next })}
        onOverrideChange={(key, next) =>
          onChange({
            ...value,
            overrides: { ...value.overrides, [key]: diffSpend(value.default, next) },
          })
        }
        onOverrideRemove={(key) => {
          const { [key]: _, ...rest } = value.overrides;
          void _;
          onChange({ ...value, overrides: rest });
        }}
        renderSummary={(v) => spendSummary(v)}
        renderEditor={(v, set) => <SpendEditor value={v} onChange={set} />}
      />
    </SectionShell>
  );
}

/** Drop fields that match the org default so we don't bloat persisted overrides. */
function diffSpend(
  base: SpendPolicy,
  next: SpendPolicy,
): Partial<SpendPolicy> {
  const out: Partial<SpendPolicy> = {};
  if (next.monthlyTokenCap !== base.monthlyTokenCap) {
    out.monthlyTokenCap = next.monthlyTokenCap;
  }
  if (next.monthlyDollarCap !== base.monthlyDollarCap) {
    out.monthlyDollarCap = next.monthlyDollarCap;
  }
  if (
    JSON.stringify(next.alertThresholds) !==
    JSON.stringify(base.alertThresholds)
  ) {
    out.alertThresholds = next.alertThresholds;
  }
  return out;
}

function SpendEditor({
  value,
  onChange,
}: {
  value: SpendPolicy;
  onChange: (next: SpendPolicy) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <CapInput
        label="Tokens / mo"
        value={value.monthlyTokenCap}
        onChange={(v) => onChange({ ...value, monthlyTokenCap: v })}
        unit="tokens"
        humanize="compact"
      />
      <CapInput
        label="On-demand $ / mo"
        value={value.monthlyDollarCap}
        onChange={(v) => onChange({ ...value, monthlyDollarCap: v })}
        unit="dollars"
      />
    </div>
  );
}

function CapInput({
  label,
  value,
  onChange,
  unit,
  humanize,
}: {
  label: string;
  value: number | null;
  onChange: (next: number | null) => void;
  unit: "tokens" | "dollars";
  humanize?: "compact";
}) {
  const [text, setText] = React.useState<string>(
    value === null ? "" : String(value),
  );
  React.useEffect(() => {
    setText(value === null ? "" : String(value));
  }, [value]);

  const commit = () => {
    const trimmed = text.trim();
    if (trimmed === "" || trimmed.toLowerCase() === "unlimited") {
      onChange(null);
      return;
    }
    // Accept "5m", "50k", "1.5b" as compact tokens.
    const compact = /^(\d+(?:\.\d+)?)([kmb])$/i.exec(trimmed);
    if (compact) {
      const n = parseFloat(compact[1]);
      const mul = compact[2].toLowerCase() === "k" ? 1e3 : compact[2].toLowerCase() === "m" ? 1e6 : 1e9;
      onChange(Math.round(n * mul));
      return;
    }
    const numeric = Number(trimmed.replace(/[$,\s]/g, ""));
    if (!Number.isFinite(numeric) || numeric < 0) {
      // Reject invalid input — revert text to last valid value.
      setText(value === null ? "" : String(value));
      return;
    }
    onChange(Math.round(numeric));
  };

  return (
    <label className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <span className="text-[12px] text-muted-foreground">
        {unit === "dollars" ? "$" : ""}
      </span>
      <input
        type="text"
        inputMode={humanize === "compact" ? "text" : "decimal"}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder="Unlimited"
        className="w-24 bg-transparent text-[12px] tabular-nums text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
      />
      {value !== null && humanize === "compact" && (
        <span className="font-mono text-[10px] text-muted-foreground/70">
          {compactFormat(value)}
        </span>
      )}
    </label>
  );
}

function compactFormat(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

function spendSummary(v: SpendPolicy): string {
  const parts: string[] = [];
  if (v.monthlyTokenCap !== null)
    parts.push(`${compactFormat(v.monthlyTokenCap)} tok`);
  if (v.monthlyDollarCap !== null) parts.push(`$${v.monthlyDollarCap}`);
  return parts.join(" · ") || "Unlimited";
}

// -----------------------------------------------------------------------------
// Section 3: Model access
// -----------------------------------------------------------------------------

function ModelAccessSection({
  value,
  onChange,
}: {
  value: ExpertsPolicy["models"];
  onChange: (next: ExpertsPolicy["models"]) => void;
}) {
  return (
    <SectionShell
      title="Model access"
      description="Choose which AI models each scope can select inside Experts. Frontier models can be reserved for corporate roles while leasing staff get a cheaper default — exactly the pattern Cursor enterprise uses."
      icon={Cpu}
      hue="#7c3aed"
    >
      <ScopeOverrideTable<ModelPolicy>
        title="Allowed models"
        description="Org default applies to anyone without an override."
        defaultValue={value.default}
        overrides={value.overrides}
        // Default for new overrides: start with the org default's allow-list.
        newOverrideValue={{ allowedModels: [...value.default.allowedModels] }}
        onDefaultChange={(next) => onChange({ ...value, default: next })}
        onOverrideChange={(key, next) =>
          onChange({
            ...value,
            overrides: { ...value.overrides, [key]: next },
          })
        }
        onOverrideRemove={(key) => {
          const { [key]: _, ...rest } = value.overrides;
          void _;
          onChange({ ...value, overrides: rest });
        }}
        renderSummary={(v) => modelsSummary(v)}
        renderEditor={(v, set) => <ModelAllowEditor value={v} onChange={set} />}
      />
    </SectionShell>
  );
}

function ModelAllowEditor({
  value,
  onChange,
}: {
  value: ModelPolicy;
  onChange: (next: ModelPolicy) => void;
}) {
  const [open, setOpen] = React.useState(false);

  const toggleModel = (id: ModelId) => {
    const set = new Set(value.allowedModels);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange({ allowedModels: Array.from(set) });
  };

  const allowAll = () =>
    onChange({ allowedModels: MODELS.map((m) => m.id) });
  const allowNone = () => onChange({ allowedModels: [] });

  const allowedSet = new Set(value.allowedModels);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Inline chip preview of currently-allowed models */}
      <div className="flex flex-wrap items-center gap-1">
        {MODELS.length === value.allowedModels.length ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            All models
          </span>
        ) : value.allowedModels.length === 0 ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-amber-700">
            No access
          </span>
        ) : (
          MODELS.filter((m) => allowedSet.has(m.id)).map((m) => (
            <span
              key={m.id}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium"
              style={{ background: `${m.hue}14`, color: m.hue }}
            >
              {m.short}
            </span>
          ))
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
          >
            Edit
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={6}
          collisionPadding={16}
          className="w-[320px] p-0"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Allowed models
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={allowAll}
                className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              >
                All
              </button>
              <span className="text-muted-foreground/40">·</span>
              <button
                type="button"
                onClick={allowNone}
                className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              >
                None
              </button>
            </div>
          </div>
          <div className="max-h-[280px] overflow-y-auto py-1">
            {MODELS.map((m) => {
              const allowed = allowedSet.has(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleModel(m.id)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left transition-colors",
                    allowed ? "bg-muted/40" : "hover:bg-muted/30",
                  )}
                >
                  <Cpu
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: m.hue }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium text-foreground">
                        {m.label}
                      </span>
                      {m.paid && (
                        <span className="rounded border border-amber-200 bg-amber-50 px-1 py-px text-[9px] font-semibold uppercase tracking-wider text-amber-700">
                          Paid
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {m.provider} · {m.blurb}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "ml-2 flex h-4 w-4 items-center justify-center rounded border",
                      allowed
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background",
                    )}
                  >
                    {allowed && <Check className="h-3 w-3" />}
                  </span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function modelsSummary(v: ModelPolicy): string {
  if (v.allowedModels.length === 0) return "No models";
  if (v.allowedModels.length === MODELS.length) return "All models";
  return `${v.allowedModels.length} of ${MODELS.length}`;
}

// -----------------------------------------------------------------------------
// SectionShell — common header + body wrapper used by the three sections.
// -----------------------------------------------------------------------------

function SectionShell({
  title,
  description,
  icon: Icon,
  hue,
  children,
}: {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  hue?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-start gap-3 border-b border-border px-4 py-3">
        {Icon ? (
          <span
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
            style={{
              background: hue ? `${hue}14` : "hsl(var(--muted))",
              color: hue ?? "hsl(var(--foreground))",
            }}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2
            className="text-sm font-semibold text-foreground"
            style={{ fontFamily: HEADING_FONT }}
          >
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
}
