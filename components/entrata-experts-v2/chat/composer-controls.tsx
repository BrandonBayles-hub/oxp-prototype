"use client";
import * as React from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  LENSES,
  LENS_BY_ID,
  DEPTHS,
  DEPTH_BY_ID,
} from "@/lib/entrata-experts-v2/lenses";
import type { LensId, Depth, ModelId } from "@/lib/entrata-experts-v2/types";
import { ChevronDown, Zap, Brain, Sparkles, Cpu, Check, Aperture } from "lucide-react";
import { useEntrataExpertsRelease } from "@/lib/entrata-experts-release-context";
import { useModelCatalog } from "@/lib/entrata-experts-v2/use-model-catalog";
import { describeModel } from "@/lib/entrata-experts-v2/llm/model-catalog";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────────────────────────────────
// Composer controls — Perplexity-style Mode / Focus / Model selectors
// -----------------------------------------------------------------------------
// Three distinct pill dropdowns in the message composer, mirroring Perplexity's
// model selector + mode + focus pattern (our "focus" is the Lens):
//   • Lens   — which data the answer draws on (maps to Lens; unlocks at v1.1)
//   • Mode   — how hard the model thinks   (maps to Depth: Auto / Fast / Reasoning)
//   • Model  — which model answers          (maps to ModelId)
//
// They all write through the store's single `onChangeLens(lens, depth, model)`
// callback, so each picker updates its own dimension and leaves the others.
// ──────────────────────────────────────────────────────────────────────────

const depthIcon = (id: Depth) => (id === "fast" ? Zap : id === "reasoning" ? Brain : Sparkles);

interface Option {
  id: string;
  label: string;
  blurb?: string;
  icon: React.ReactNode;
  iconBg?: string;
  rightChip?: string;
  rightChipColor?: string;
  paid?: boolean;
}

// ── Shared pill + dropdown ─────────────────────────────────────────────────

function ComposerSelect({
  title,
  subtitle,
  options,
  value,
  onSelect,
  triggerIcon,
  triggerLabel,
  triggerActive,
  triggerTitle,
  contentClassName = "w-[300px]",
}: {
  title: string;
  subtitle?: string;
  options: Option[];
  value: string;
  onSelect: (id: string) => void;
  triggerIcon: React.ReactNode;
  triggerLabel: string;
  /** Subtle accent when a non-default value is chosen. */
  triggerActive?: boolean;
  /** Optional override for the native tooltip (defaults to "<title>: <label>"). */
  triggerTitle?: string;
  contentClassName?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={triggerTitle ?? `${title}: ${triggerLabel}`}
          className={cn(
            "inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium transition-colors",
            open
              ? "border-foreground/30 bg-muted text-foreground"
              : triggerActive
                ? "border-border bg-muted/40 text-foreground hover:bg-muted/70"
                : "border-border bg-background text-foreground hover:bg-muted/60",
          )}
        >
          <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">{triggerIcon}</span>
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={8}
        collisionPadding={16}
        className={cn("p-0", contentClassName)}
      >
        <div className="border-b border-border px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </div>
          {subtitle && <div className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</div>}
        </div>
        <div className="max-h-[420px] overflow-y-auto scrollbar-hover p-1">
          {options.map((o) => (
            <OptionRow
              key={o.id}
              active={o.id === value}
              onClick={() => {
                onSelect(o.id);
                setOpen(false);
              }}
              {...o}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function OptionRow({
  active,
  onClick,
  icon,
  iconBg,
  label,
  blurb,
  rightChip,
  rightChipColor,
  paid,
}: Option & { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/60",
        active && "bg-muted",
      )}
    >
      <div
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: iconBg ?? "hsl(var(--secondary))" }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-medium text-foreground">{label}</span>
          {paid && (
            <span className="rounded border border-amber-200 bg-amber-50 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-700">
              pro
            </span>
          )}
          {active && <Check className="h-3 w-3 shrink-0 text-foreground" />}
        </div>
        {blurb && (
          <div className="truncate text-[11px] leading-snug text-muted-foreground">{blurb}</div>
        )}
      </div>
      {rightChip && (
        <span
          className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
          style={{
            background: rightChipColor ? `${rightChipColor}14` : "hsl(var(--secondary))",
            color: rightChipColor ?? "currentColor",
          }}
        >
          {rightChip}
        </span>
      )}
    </button>
  );
}

// ── Option builders ─────────────────────────────────────────────────────────

function depthOptions(): Option[] {
  return DEPTHS.map((d) => {
    const Icon = depthIcon(d.id);
    return {
      id: d.id,
      label: d.label,
      blurb: d.blurb,
      icon: <Icon className="h-3.5 w-3.5 text-foreground" />,
      iconBg: "hsl(var(--secondary))",
    };
  });
}

function lensOptions(): Option[] {
  // "auto" is not a user-pickable focus — the composer offers concrete lenses
  // only (the system still auto-routes when no focus is chosen).
  return LENSES.filter((l) => l.id !== "auto").map((l) => {
    const Icon = l.icon;
    return {
      id: l.id,
      label: l.label,
      blurb: l.blurb,
      icon: <Icon className="h-3.5 w-3.5" style={{ color: l.hue }} />,
      iconBg: `${l.hue}1a`,
    };
  });
}

// ── Public pickers ────────────────────────────────────────────────────────

export function ModePicker({ depth, onSelect }: { depth: Depth; onSelect: (d: Depth) => void }) {
  const Icon = depthIcon(depth);
  return (
    <ComposerSelect
      title="Mode"
      subtitle="How hard the model thinks"
      triggerIcon={<Icon className="h-3.5 w-3.5 text-muted-foreground" />}
      triggerLabel={DEPTH_BY_ID[depth].label}
      triggerActive={depth !== "auto"}
      value={depth}
      onSelect={(id) => onSelect(id as Depth)}
      options={depthOptions()}
      contentClassName="w-[300px]"
    />
  );
}

export function LensPicker({ lens, onSelect }: { lens: LensId; onSelect: (l: LensId) => void }) {
  const { atLeast } = useEntrataExpertsRelease();
  // Lens unlocks at v1.1; below that it stays on "Auto" (system-routed).
  if (!atLeast("v1.1")) return null;
  // With "auto" no longer a pickable lens, the pill reads as a "Lens"
  // placeholder until the user picks a concrete lens.
  const isAuto = lens === "auto";
  const def = LENS_BY_ID[lens];
  const Icon = isAuto ? Aperture : def.icon;
  return (
    <ComposerSelect
      title="Lens"
      subtitle="Which data the answer draws on"
      triggerIcon={
        <Icon className="h-3.5 w-3.5" style={{ color: isAuto ? "hsl(var(--muted-foreground))" : def.hue }} />
      }
      triggerLabel={isAuto ? "Lens" : def.short}
      triggerTitle={isAuto ? "Lens — choose a data lens" : `Lens: ${def.label}`}
      triggerActive={!isAuto}
      value={lens}
      onSelect={(id) => onSelect(id as LensId)}
      options={lensOptions()}
      contentClassName="w-[320px]"
    />
  );
}

export function ModelPicker({ model, onSelect }: { model: ModelId; onSelect: (m: ModelId) => void }) {
  // Models come live from the LiteLLM proxy (with a static fallback). "auto" is
  // not a user-pickable model — the pill reads as a "Model" placeholder until
  // the user picks a concrete one (the system still auto-routes otherwise).
  const { models, byId, source } = useModelCatalog();
  const isAuto = model === "auto" || !model;
  const def = byId[model] ?? describeModel(model);

  const options: Option[] = models
    .filter((m) => m.id !== "auto")
    .map((m) => ({
      id: m.id,
      label: m.label,
      blurb: m.blurb,
      icon: <Cpu className="h-3.5 w-3.5" style={{ color: m.hue }} />,
      iconBg: `${m.hue}1a`,
      rightChip: m.provider,
      rightChipColor: m.hue,
      paid: m.paid,
    }));

  return (
    <ComposerSelect
      title="Model"
      subtitle={source === "live" ? "Live from LiteLLM" : "Which model answers"}
      triggerIcon={
        <Cpu className="h-3.5 w-3.5" style={{ color: isAuto ? "hsl(var(--muted-foreground))" : def.hue }} />
      }
      triggerLabel={isAuto ? "Model" : def.short}
      triggerTitle={isAuto ? "Model — choose a model" : `Model: ${def.label}`}
      triggerActive={!isAuto}
      value={model}
      onSelect={(id) => onSelect(id as ModelId)}
      options={options}
      contentClassName="w-[340px]"
    />
  );
}
