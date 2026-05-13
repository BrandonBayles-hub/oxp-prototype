"use client";
import * as React from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { LENSES, LENS_BY_ID, DEPTHS, DEPTH_BY_ID, MODELS, MODEL_BY_ID } from "@/lib/entrata-experts-v2/lenses";
import type { LensId, Depth, ModelId } from "@/lib/entrata-experts-v2/types";
import { ChevronDown, Zap, Brain, Sparkles, Cpu, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface LensPickerProps {
  lens: LensId;
  depth: Depth;
  model: ModelId;
  onChange: (lens: LensId, depth: Depth, model: ModelId) => void;
}

export function LensPicker({ lens, depth, model, onChange }: LensPickerProps) {
  const [open, setOpen] = React.useState(false);
  const lensDef = LENS_BY_ID[lens];
  const depthDef = DEPTH_BY_ID[depth];
  const modelDef = MODEL_BY_ID[model];
  const LIcon = lensDef.icon;
  const DIcon = depth === "fast" ? Zap : depth === "reasoning" ? Brain : Sparkles;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-7 max-w-full items-center gap-1.5 rounded-md border border-border bg-background px-2 hover:bg-muted/60",
            "text-[12px] font-medium text-foreground transition-colors",
          )}
          title={`${lensDef.label} · ${depthDef.label} · ${modelDef.label}`}
        >
          <LIcon className="h-3.5 w-3.5 shrink-0" style={{ color: lensDef.hue }} />
          <span className="truncate">{lensDef.short}</span>
          <span className="shrink-0 text-muted-foreground/60">·</span>
          <DIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="hidden truncate text-muted-foreground sm:inline">{depthDef.label}</span>
          {model !== "auto" && (
            <>
              <span className="shrink-0 text-muted-foreground/60">·</span>
              <span
                className="hidden truncate rounded px-1 text-[11px] md:inline"
                style={{ background: `${modelDef.hue}1a`, color: modelDef.hue }}
              >
                {modelDef.short}
              </span>
            </>
          )}
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={8}
        collisionPadding={16}
        className="w-[360px] p-0"
      >
        <div className="border-b border-border px-3 py-2">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            How to answer
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            Lens scopes the data · Mode tunes the response · Model picks the brain
          </div>
        </div>

        <div className="max-h-[460px] overflow-y-auto scrollbar-hover">
          <Section title="Lens">
            {LENSES.map((l) => {
              const Icon = l.icon;
              const active = l.id === lens;
              return (
                <CompactRow
                  key={l.id}
                  active={active}
                  onClick={() => {
                    onChange(l.id, depth, model);
                    setOpen(false);
                  }}
                  icon={<Icon className="h-3.5 w-3.5" style={{ color: l.hue }} />}
                  iconBg={`${l.hue}1a`}
                  label={l.label}
                  blurb={l.blurb}
                />
              );
            })}
          </Section>

          <Section title="Mode">
            {DEPTHS.map((d) => {
              const Icon = d.id === "fast" ? Zap : d.id === "reasoning" ? Brain : Sparkles;
              const active = d.id === depth;
              return (
                <CompactRow
                  key={d.id}
                  active={active}
                  onClick={() => {
                    onChange(lens, d.id, model);
                    setOpen(false);
                  }}
                  icon={<Icon className="h-3.5 w-3.5 text-foreground" />}
                  iconBg="hsl(var(--secondary))"
                  label={d.label}
                  blurb={d.blurb}
                />
              );
            })}
          </Section>

          <Section title="Model">
            {MODELS.map((m) => {
              const active = m.id === model;
              return (
                <CompactRow
                  key={m.id}
                  active={active}
                  onClick={() => {
                    onChange(lens, depth, m.id);
                    setOpen(false);
                  }}
                  icon={<Cpu className="h-3.5 w-3.5" style={{ color: m.hue }} />}
                  iconBg={`${m.hue}1a`}
                  label={m.label}
                  blurb={m.blurb}
                  rightChip={m.provider}
                  rightChipColor={m.hue}
                  paid={m.paid}
                />
              );
            })}
          </Section>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border last:border-0">
      <div className="sticky top-0 z-10 bg-popover px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="p-1 pt-0">{children}</div>
    </div>
  );
}

function CompactRow({
  active,
  onClick,
  icon,
  iconBg,
  label,
  blurb,
  rightChip,
  rightChipColor,
  paid,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  blurb: string;
  rightChip?: string;
  rightChipColor?: string;
  paid?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
        "hover:bg-muted/60",
        active && "bg-muted",
      )}
    >
      <div
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: iconBg }}
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
        <div className="truncate text-[11px] leading-snug text-muted-foreground">{blurb}</div>
      </div>
      {rightChip && (
        <span
          className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
          style={{
            background: rightChipColor ? `${rightChipColor}14` : "var(--secondary)",
            color: rightChipColor ?? "currentColor",
          }}
        >
          {rightChip}
        </span>
      )}
    </button>
  );
}
