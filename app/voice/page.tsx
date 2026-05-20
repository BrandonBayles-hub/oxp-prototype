"use client";

/**
 * Agent Voice & Tone — Option E (single-page, stacked overrides)
 *
 * IA:
 *   1. Pick an agent
 *   2. See the Default voice & tone card for that agent
 *   3. Below it, two stacked sections: Vertical Overrides + Property Overrides
 *      Each section starts as an empty state with an "Add … override" button.
 *   4. Adding an override progressively reveals the editor inside a dialog.
 *      Saving stamps the override into a stacked card list on the page.
 *
 * Implementation notes:
 *   - Wired to the shared voice-context via additive per-agent state slices
 *   - Conflict policy: property overrides win over vertical overrides
 *   - Flyout deep links can land here with ?agent=...&property=...
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { PropertySelector } from "@/components/property-filter";
import {
  VERTICALS,
  MOCK_PROPERTIES,
  PROPERTY_FILTER_DATA,
  type Vertical,
} from "@/lib/voice-properties";
import {
  useVoice,
  AGENT_TONE_SEED_DEFAULTS,
  type AgentToneId,
  type ToneSettings,
  type AgentVerticalToneOverride,
  type AgentPropertyToneOverride,
} from "@/lib/voice-context";
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  GraduationCap,
  Home,
  Layers,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Briefcase,
  Trash2,
  X,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  CreditCard,
  Wrench,
  Sparkles,
  ChevronDown,
} from "lucide-react";

/* ─────────────────────────────────────────────
 * Constants
 * ─────────────────────────────────────────── */

type AgentMeta = {
  id: AgentToneId;
  name: string;
  tagline: string;
  icon: typeof Sparkles;
  accent: string;
};

const AGENTS: AgentMeta[] = [
  {
    id: "leasing",
    name: "Leasing AI",
    tagline: "Refined and consultative · detailed responses",
    icon: Sparkles,
    accent: "indigo",
  },
  {
    id: "renewal",
    name: "Renewal AI",
    tagline: "Warm and appreciative · standard responses",
    icon: RotateCcw,
    accent: "emerald",
  },
  {
    id: "payments",
    name: "Payments AI",
    tagline: "Empathetic and solution-focused · standard responses",
    icon: CreditCard,
    accent: "amber",
  },
  {
    id: "maintenance",
    name: "Maintenance AI",
    tagline: "Efficient and reassuring · concise responses",
    icon: Wrench,
    accent: "sky",
  },
];

const VERTICAL_META: Record<Vertical, { icon: typeof Building2; color: string; bg: string; description: string }> = {
  Conventional: { icon: Building2, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", description: "Market-rate multifamily apartments" },
  Student: { icon: GraduationCap, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30", description: "University and college housing" },
  Affordable: { icon: ShieldCheck, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/30", description: "Income-restricted housing communities" },
};

/* ─────────────────────────────────────────────
 * Types
 * ─────────────────────────────────────────── */

type VerticalOverrideRecord = Omit<AgentVerticalToneOverride, "agentId"> & { vertical: Vertical };
type PropertyOverrideRecord = Omit<AgentPropertyToneOverride, "agentId"> & { vertical: Vertical };

const EMPTY_TONE: ToneSettings = {
  persona: "",
  guidelines: "",
  doExamples: [],
  dontExamples: [],
};

function isAgentToneId(value: string | null): value is AgentToneId {
  return value === "leasing" || value === "renewal" || value === "payments" || value === "maintenance";
}

/* ─────────────────────────────────────────────
 * Main page
 * ─────────────────────────────────────────── */

export default function VoicePage() {
  const voice = useVoice();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedAgentId, setSelectedAgentId] = useState<AgentToneId | null>(null);

  const queryAgent = searchParams.get("agent");
  const queryProperty = searchParams.get("property");
  const queryScrollTo = searchParams.get("scrollTo");

  useEffect(() => {
    if (isAgentToneId(queryAgent)) {
      setSelectedAgentId(queryAgent);
      return;
    }

    if (!queryAgent) {
      setSelectedAgentId(null);
    }
  }, [queryAgent]);

  const selectAgent = (agentId: AgentToneId) => {
    setSelectedAgentId(agentId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("agent", agentId);
    params.delete("property");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const clearSelectedAgent = () => {
    setSelectedAgentId(null);
    router.replace(pathname);
  };

  if (!selectedAgentId) {
    return (
      <AgentPickerView
        defaults={voice.agentToneDefaults}
        verticalOverrides={voice.agentVerticalToneOverrides}
        propertyOverrides={voice.agentPropertyToneOverrides}
        onPick={selectAgent}
      />
    );
  }

  const defaultSettings = voice.agentToneDefaults[selectedAgentId];
  const verticalOverrides = voice.agentVerticalToneOverrides.filter(
    (override) => override.agentId === selectedAgentId,
  ) as VerticalOverrideRecord[];
  const propertyOverrides = voice.agentPropertyToneOverrides.filter(
    (override) => override.agentId === selectedAgentId,
  ) as PropertyOverrideRecord[];

  return (
    <AgentDetailView
      agent={AGENTS.find((a) => a.id === selectedAgentId)!}
      agentId={selectedAgentId}
      defaultSettings={defaultSettings}
      verticalOverrides={verticalOverrides}
      propertyOverrides={propertyOverrides}
      pendingProperty={queryProperty}
      pendingScrollTo={queryScrollTo}
      onBack={clearSelectedAgent}
      onUpdateDefault={(next) => voice.updateAgentToneDefault(selectedAgentId, next)}
      onResetDefault={() => voice.resetAgentToneDefault(selectedAgentId)}
      onAddVertical={(record) => voice.addAgentVerticalToneOverride({ ...record, agentId: selectedAgentId })}
      onUpdateVertical={(id, next) => voice.updateAgentVerticalToneOverride(id, { settings: next })}
      onRemoveVertical={(id) => voice.removeAgentVerticalToneOverride(id)}
      onAddProperties={(records) =>
        voice.addAgentPropertyToneOverrides(
          records.map((record) => ({ ...record, agentId: selectedAgentId })),
        )
      }
      onUpdateProperty={(id, next) => voice.updateAgentPropertyToneOverride(id, { settings: next })}
      onRemoveProperty={(id) => voice.removeAgentPropertyToneOverride(id)}
    />
  );
}

/* ─────────────────────────────────────────────
 * Step 1 — Agent picker
 * ─────────────────────────────────────────── */

function isCustomized(current: ToneSettings, seed: ToneSettings): boolean {
  return (
    current.persona !== seed.persona ||
    current.guidelines !== seed.guidelines ||
    JSON.stringify(current.doExamples) !== JSON.stringify(seed.doExamples) ||
    JSON.stringify(current.dontExamples) !== JSON.stringify(seed.dontExamples)
  );
}

function AgentPickerView({
  defaults,
  verticalOverrides,
  propertyOverrides,
  onPick,
}: {
  defaults: Record<AgentToneId, ToneSettings>;
  verticalOverrides: AgentVerticalToneOverride[];
  propertyOverrides: AgentPropertyToneOverride[];
  onPick: (id: AgentToneId) => void;
}) {
  return (
    <div>
      <p className="mb-6 text-sm text-muted-foreground">
        Choose an agent to configure its voice and tone. Each agent has its own portfolio default plus any vertical or property overrides.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        {AGENTS.map((agent) => {
          const tone = defaults[agent.id];
          const seed = AGENT_TONE_SEED_DEFAULTS[agent.id];
          const custom = isCustomized(tone, seed);
          const verticalCount = verticalOverrides.filter((override) => override.agentId === agent.id).length;
          const propertyCount = propertyOverrides.filter((override) => override.agentId === agent.id).length;

          return (
            <div
              key={agent.id}
              className="rounded-xl border border-border bg-white p-5 text-left transition-all hover:border-zinc-300 hover:shadow-sm"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img src="/eli-cube.svg" alt="" width={26} height={26} className="shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-[15px] font-bold text-foreground">ELI+ {agent.name}</h3>
                      <span className="rounded-full bg-[#B3FFCC] px-2 py-0.5 text-[11px] font-semibold text-black">Active</span>
                      {custom && (
                        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
                          Custom
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{agent.tagline}</p>
                  </div>
                </div>
                {custom ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onPick(agent.id)}
                      className="inline-flex items-center gap-1 text-[13px] font-medium text-foreground hover:text-foreground/80"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onPick(agent.id)}
                      className="inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Reset
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onPick(agent.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-[13px] font-medium text-foreground hover:bg-muted/50 shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" /> Customize
                  </button>
                )}
              </div>


              {/* Details */}
              <div className="mt-4 space-y-2.5">
                <div>
                  <span className="text-[13px] font-semibold text-foreground">Personality: </span>
                  <span className="text-[13px] text-muted-foreground">{tone.persona || "Not configured"}</span>
                </div>
                <div>
                  <span className="text-[13px] font-semibold text-foreground">Agent Tone Instructions: </span>
                  <span className="text-[13px] text-muted-foreground">{tone.guidelines || "Not configured"}</span>
                </div>
              </div>

              {/* Do / Don't */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-1.5 text-[13px] font-semibold text-emerald-700">Do</p>
                  {tone.doExamples.length > 0 ? (
                    <ul className="space-y-1.5">
                      {tone.doExamples.map((item, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[13px] text-muted-foreground">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13px] text-muted-foreground">None</p>
                  )}
                </div>
                <div>
                  <p className="mb-1.5 text-[13px] font-semibold text-red-700">Don&apos;t</p>
                  {tone.dontExamples.length > 0 ? (
                    <ul className="space-y-1.5">
                      {tone.dontExamples.map((item, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[13px] text-muted-foreground">
                          <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13px] text-muted-foreground">None</p>
                  )}
                </div>
              </div>

              {/* Override pills */}
              <div className="mt-4 flex items-center gap-2">
                <Badge variant="secondary" className="text-[11px] font-normal">
                  {verticalCount} vertical override{verticalCount === 1 ? "" : "s"}
                </Badge>
                <Badge variant="secondary" className="text-[11px] font-normal">
                  {propertyCount} property override{propertyCount === 1 ? "" : "s"}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * Step 2 — Agent detail
 * ─────────────────────────────────────────── */

function AgentDetailView({
  agent,
  agentId,
  defaultSettings,
  verticalOverrides,
  propertyOverrides,
  pendingProperty,
  pendingScrollTo,
  onBack,
  onUpdateDefault,
  onResetDefault,
  onAddVertical,
  onUpdateVertical,
  onRemoveVertical,
  onAddProperties,
  onUpdateProperty,
  onRemoveProperty,
}: {
  agent: AgentMeta;
  agentId: AgentToneId;
  defaultSettings: ToneSettings;
  verticalOverrides: VerticalOverrideRecord[];
  propertyOverrides: PropertyOverrideRecord[];
  pendingProperty?: string | null;
  pendingScrollTo?: string | null;
  onBack: () => void;
  onUpdateDefault: (next: ToneSettings) => void;
  onResetDefault: () => void;
  onAddVertical: (record: VerticalOverrideRecord) => void;
  onUpdateVertical: (id: string, next: ToneSettings) => void;
  onRemoveVertical: (id: string) => void;
  onAddProperties: (records: PropertyOverrideRecord[]) => void;
  onUpdateProperty: (id: string, next: ToneSettings) => void;
  onRemoveProperty: (id: string) => void;
}) {
  const [addVerticalOpen, setAddVerticalOpen] = useState(false);
  const [addPropertyOpen, setAddPropertyOpen] = useState(false);
  const [preselectedPropertyName, setPreselectedPropertyName] = useState<string | null>(null);
  const [autoExpandProperty, setAutoExpandProperty] = useState<string | null>(null);
  const defaultSectionRef = useRef<HTMLElement | null>(null);
  const verticalSectionRef = useRef<HTMLElement | null>(null);
  const propertySectionRef = useRef<HTMLElement | null>(null);
  const propertyCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const handledDeepLinkProperty = useRef<string | null>(null);

  const Icon = agent.icon;

  useEffect(() => {
    if (!pendingProperty) {
      handledDeepLinkProperty.current = null;
      return;
    }

    if (handledDeepLinkProperty.current === pendingProperty) {
      return;
    }

    handledDeepLinkProperty.current = pendingProperty;

    const existing = propertyOverrides.find((override) => override.propertyName === pendingProperty);
    if (existing) {
      setAutoExpandProperty(pendingProperty);
      window.setTimeout(() => {
        propertyCardRefs.current[pendingProperty]?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 160);
      return;
    }

    if (MOCK_PROPERTIES.some((property) => property.name === pendingProperty)) {
      setPreselectedPropertyName(pendingProperty);
      setAddPropertyOpen(true);
      window.setTimeout(() => {
        propertySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    }
  }, [pendingProperty, propertyOverrides]);

  useEffect(() => {
    if (!pendingScrollTo) return;

    const target =
      pendingScrollTo === "default"
        ? defaultSectionRef.current
        : pendingScrollTo === "verticals"
          ? verticalSectionRef.current
          : pendingScrollTo === "properties"
            ? propertySectionRef.current
            : null;

    if (target) {
      window.setTimeout(() => {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    }
  }, [pendingScrollTo]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> All agents
        </button>
        <div className="mt-3 flex items-start gap-4">
          <img src="/eli-cube.svg" alt="" width={40} height={40} className="shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-foreground">ELI+ {agent.name}</h2>
            <p className="text-sm text-muted-foreground">{agent.tagline}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Settings cascade <span className="font-medium text-foreground">Portfolio default → Vertical → Property</span>. More specific scopes win.
            </p>
          </div>
        </div>
      </div>

      <StickyAnchorStrip
        counts={{
          vertical: verticalOverrides.length,
          property: propertyOverrides.length,
        }}
        onJump={(section) => {
          const target =
            section === "default"
              ? defaultSectionRef.current
              : section === "verticals"
                ? verticalSectionRef.current
                : propertySectionRef.current;
          target?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />

      {/* Default */}
      <section ref={defaultSectionRef} className="scroll-mt-32">
        <SectionHeader
          icon={<Layers className="h-4 w-4 text-muted-foreground" />}
          title="Portfolio default"
          subtitle="Applies to every property unless overridden below."
        />
        <DefaultCard
          settings={defaultSettings}
          onChange={onUpdateDefault}
          onReset={onResetDefault}
        />
      </section>

      {/* Vertical overrides */}
      <section ref={verticalSectionRef} className="scroll-mt-32">
        <SectionHeader
          icon={<Layers className="h-4 w-4 text-muted-foreground" />}
          title="Vertical overrides"
          subtitle="Customize this agent's voice for a specific property type."
          countLabel={`${verticalOverrides.length}`}
        />
        {verticalOverrides.length === 0 ? (
          <EmptyOverrideState
            label="No vertical overrides yet."
            actionLabel="Add vertical override"
            onAction={() => setAddVerticalOpen(true)}
          />
        ) : (
          <div className="space-y-3">
            {verticalOverrides.map((override) => (
              <VerticalOverrideCard
                key={override.id}
                record={override}
                onChange={(next) => onUpdateVertical(override.id, next)}
                onRemove={() => onRemoveVertical(override.id)}
                shadowingPropertyOverrides={propertyOverrides.filter((p) => p.vertical === override.vertical)}
              />
            ))}
            <Button variant="outline" size="sm" onClick={() => setAddVerticalOpen(true)} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Add another vertical override
            </Button>
          </div>
        )}
      </section>

      {/* Property overrides */}
      <section ref={propertySectionRef} className="scroll-mt-32">
        <SectionHeader
          icon={<Home className="h-4 w-4 text-muted-foreground" />}
          title="Property overrides"
          subtitle="Customize this agent's voice for one or more individual properties."
          countLabel={`${propertyOverrides.length}`}
        />
        {propertyOverrides.length === 0 ? (
          <EmptyOverrideState
            label="No property overrides yet."
            actionLabel="Add property override"
            onAction={() => setAddPropertyOpen(true)}
          />
        ) : (
          <div className="space-y-3">
            {propertyOverrides.map((override) => (
              <PropertyOverrideCard
                key={override.id}
                record={override}
                autoExpand={autoExpandProperty === override.propertyName}
                cardRef={(node) => {
                  propertyCardRefs.current[override.propertyName] = node;
                }}
                onChange={(next) => onUpdateProperty(override.id, next)}
                onRemove={() => onRemoveProperty(override.id)}
              />
            ))}
            <Button variant="outline" size="sm" onClick={() => setAddPropertyOpen(true)} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Add another property override
            </Button>
          </div>
        )}
      </section>

      {/* Add Vertical dialog */}
      <AddVerticalOverrideDialog
        open={addVerticalOpen}
        onClose={() => setAddVerticalOpen(false)}
        existingVerticals={verticalOverrides.map((v) => v.vertical)}
        propertyOverrides={propertyOverrides}
        defaultSettings={defaultSettings}
        onSave={(record) => {
          onAddVertical(record);
          setAddVerticalOpen(false);
        }}
      />

      {/* Add Property dialog */}
      <AddPropertyOverrideDialog
        open={addPropertyOpen}
        onClose={() => {
          setAddPropertyOpen(false);
          setPreselectedPropertyName(null);
        }}
        existingPropertyOverrides={propertyOverrides}
        defaultSettings={defaultSettings}
        preselectedPropertyName={preselectedPropertyName}
        onSave={(records) => {
          onAddProperties(records);
          setAddPropertyOpen(false);
          setPreselectedPropertyName(null);
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
 * Sticky anchor strip
 * ─────────────────────────────────────────── */

function StickyAnchorStrip({
  counts,
  onJump,
}: {
  counts: { vertical: number; property: number };
  onJump: (section: "default" | "verticals" | "properties") => void;
}) {
  return (
    <div className="sticky top-0 z-20 -mx-1 border-y border-border bg-background/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onJump("default")}>
          Default
        </Button>
        <Button variant="outline" size="sm" onClick={() => onJump("verticals")}>
          Verticals ({counts.vertical})
        </Button>
        <Button variant="outline" size="sm" onClick={() => onJump("properties")}>
          Properties ({counts.property})
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * Section header (reused by Default + override sections)
 * ─────────────────────────────────────────── */

function SectionHeader({
  icon,
  title,
  subtitle,
  countLabel,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  countLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <div className="flex items-baseline gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {icon}
          {title}
        </h3>
        {countLabel !== undefined && (
          <span className="text-xs text-muted-foreground">({countLabel})</span>
        )}
      </div>
      {subtitle && <p className="text-xs text-muted-foreground hidden sm:block">{subtitle}</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────
 * Empty state for an overrides section
 * ─────────────────────────────────────────── */

function EmptyOverrideState({
  label,
  actionLabel,
  onAction,
}: {
  label: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
      <Button variant="outline" size="sm" onClick={onAction} className="mt-3 gap-1">
        <Plus className="h-3.5 w-3.5" /> {actionLabel}
      </Button>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * Default card — collapsible, edit-in-place
 * ─────────────────────────────────────────── */

function DefaultCard({
  settings,
  onChange,
  onReset,
}: {
  settings: ToneSettings;
  onChange: (next: ToneSettings) => void;
  onReset: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (expanded && editing) setEditing(false);
              setExpanded((value) => !value);
            }}
            className="flex-1 text-left"
          >
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Default voice & tone</CardTitle>
              <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", expanded && "rotate-180")} />
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Seeded by Entrata. Edit to customize, or reset to start fresh.
            </p>
            {!expanded && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                {settings.persona || "No persona set"}
              </p>
            )}
          </button>
          <div className="flex items-center gap-1.5">
            {expanded && !editing ? (
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            ) : expanded ? (
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Done
              </Button>
            ) : null}
            {expanded && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmResetOpen(true)}
                className="gap-1 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          <ToneEditor settings={settings} editing={editing} onChange={onChange} />
        </CardContent>
      )}

      <Dialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset to Entrata default?</DialogTitle>
            <DialogDescription>
              This will replace your customized portfolio default with the seeded Entrata voice and tone for this agent.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmResetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onReset();
                setEditing(false);
                setConfirmResetOpen(false);
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ─────────────────────────────────────────────
 * Vertical override card — collapsible
 * ─────────────────────────────────────────── */

function VerticalOverrideCard({
  record,
  onChange,
  onRemove,
  shadowingPropertyOverrides,
}: {
  record: VerticalOverrideRecord;
  onChange: (next: ToneSettings) => void;
  onRemove: () => void;
  shadowingPropertyOverrides: PropertyOverrideRecord[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const meta = VERTICAL_META[record.vertical];
  const Icon = meta.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-start gap-3 text-left flex-1 min-w-0"
          >
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", meta.bg)}>
              <Icon className={cn("h-4 w-4", meta.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{record.vertical}</CardTitle>
                <ChevronDown
                  className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", expanded && "rotate-180")}
                />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                {record.settings.persona || "No persona set"} ·{" "}
                {countPropertiesInVertical(record.vertical)} properties
              </p>
            </div>
          </button>
          <div className="flex items-center gap-1.5">
            {expanded && !editing && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            )}
            {expanded && editing && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Done
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmRemoveOpen(true)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Conflict warning (always visible when there are shadowing properties) */}
        {expanded && shadowingPropertyOverrides.length > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/30">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            <div className="text-xs text-amber-900 dark:text-amber-200">
              <p className="font-medium">
                {shadowingPropertyOverrides.length} {shadowingPropertyOverrides.length === 1 ? "property" : "properties"} in {record.vertical} have their own override and will not pick up these vertical settings:
              </p>
              <ul className="mt-1 list-inside list-disc">
                {shadowingPropertyOverrides.map((p) => (
                  <li key={p.id}>{p.propertyName}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardHeader>
      {expanded && (
        <CardContent>
          <ToneEditor settings={record.settings} editing={editing} onChange={onChange} />
        </CardContent>
      )}

      <Dialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove vertical override?</DialogTitle>
            <DialogDescription>
              This will delete the {record.vertical} override for this agent. Properties without their own override will fall back to the portfolio default.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemoveOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setEditing(false);
                setConfirmRemoveOpen(false);
                onRemove();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ─────────────────────────────────────────────
 * Property override card — collapsible
 * ─────────────────────────────────────────── */

function PropertyOverrideCard({
  record,
  autoExpand,
  cardRef,
  onChange,
  onRemove,
}: {
  record: PropertyOverrideRecord;
  autoExpand?: boolean;
  cardRef?: (node: HTMLDivElement | null) => void;
  onChange: (next: ToneSettings) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const meta = VERTICAL_META[record.vertical];

  useEffect(() => {
    if (autoExpand) {
      setExpanded(true);
    }
  }, [autoExpand]);

  return (
    <div ref={cardRef}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-start gap-3 text-left flex-1 min-w-0"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Home className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{record.propertyName}</CardTitle>
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", meta.bg, meta.color)}>
                    {record.vertical}
                  </span>
                  <ChevronDown
                    className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", expanded && "rotate-180")}
                  />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                  {record.settings.persona || "No persona set"}
                </p>
              </div>
            </button>
            <div className="flex items-center gap-1.5">
              {expanded && !editing && (
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
              )}
              {expanded && editing && (
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  Done
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmRemoveOpen(true)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        {expanded && (
          <CardContent>
            <ToneEditor settings={record.settings} editing={editing} onChange={onChange} />
          </CardContent>
        )}

        <Dialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Remove property override?</DialogTitle>
              <DialogDescription>
                This will delete the override for {record.propertyName}. The property will inherit from its vertical override if one exists, otherwise from the portfolio default.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmRemoveOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setEditing(false);
                  setConfirmRemoveOpen(false);
                  onRemove();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * Tone editor (shared form for default + overrides)
 * ─────────────────────────────────────────── */

function ToneEditor({
  settings,
  editing,
  onChange,
}: {
  settings: ToneSettings;
  editing: boolean;
  onChange: (next: ToneSettings) => void;
}) {
  const update = (patch: Partial<ToneSettings>) => onChange({ ...settings, ...patch });

  if (!editing) {
    return (
      <div className="space-y-4 text-sm">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Persona</p>
          <p className="mt-1 text-foreground">{settings.persona || <span className="italic text-muted-foreground">Not set</span>}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Agent tone & instructions</p>
          <p className="mt-1 whitespace-pre-wrap text-foreground">{settings.guidelines || <span className="italic text-muted-foreground">Not set</span>}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ListReadout title="Do" entries={settings.doExamples} icon={<CheckCircle className="h-3.5 w-3.5 text-emerald-500" />} />
          <ListReadout title="Don't" entries={settings.dontExamples} icon={<XCircle className="h-3.5 w-3.5 text-red-500" />} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Persona</label>
        <input
          type="text"
          value={settings.persona}
          onChange={(e) => update({ persona: e.target.value })}
          className="input-base text-sm"
          placeholder="e.g. Empathetic, solution-focused payments specialist"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Agent tone & instructions</label>
        <textarea
          value={settings.guidelines}
          onChange={(e) => update({ guidelines: e.target.value })}
          rows={6}
          className="input-base !h-auto min-h-[140px] resize-y text-sm"
          placeholder="e.g. Direct and clear, but never judgmental..."
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ListEditor
          title="Do"
          entries={settings.doExamples}
          accent="emerald"
          onChange={(doExamples) => update({ doExamples })}
        />
        <ListEditor
          title="Don't"
          entries={settings.dontExamples}
          accent="red"
          onChange={(dontExamples) => update({ dontExamples })}
        />
      </div>
    </div>
  );
}

function ListReadout({ title, entries, icon }: { title: string; entries: string[]; icon: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{title}</p>
      {entries.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">None</p>
      ) : (
        <ul className="space-y-1.5">
          {entries.map((e, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs">
              <span className="mt-0.5">{icon}</span>
              <span className="text-foreground">{e}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ListEditor({
  title,
  entries,
  accent,
  onChange,
}: {
  title: string;
  entries: string[];
  accent: "emerald" | "red";
  onChange: (next: string[]) => void;
}) {
  const accentText = accent === "emerald" ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400";

  return (
    <div className="rounded-lg border border-border p-3">
      <p className={cn("mb-2 text-xs font-semibold", accentText)}>{title}</p>
      <ul className="space-y-2">
        {entries.map((entry, i) => (
          <li key={i} className="flex items-start gap-2">
            <input
              type="text"
              value={entry}
              onChange={(e) => {
                const next = [...entries];
                next[i] = e.target.value;
                onChange(next);
              }}
              className="input-base h-8 flex-1 text-sm"
            />
            <button
              type="button"
              onClick={() => onChange(entries.filter((_, j) => j !== i))}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Remove"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs" onClick={() => onChange([...entries, ""])}>
        <Plus className="h-3 w-3" /> Add
      </Button>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * Add Vertical Override dialog (single-select + progressive disclosure)
 * ─────────────────────────────────────────── */

function AddVerticalOverrideDialog({
  open,
  onClose,
  existingVerticals,
  propertyOverrides,
  defaultSettings,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  existingVerticals: Vertical[];
  propertyOverrides: PropertyOverrideRecord[];
  defaultSettings: ToneSettings;
  onSave: (record: VerticalOverrideRecord) => void;
}) {
  const [vertical, setVertical] = useState<Vertical | null>(null);
  const [settings, setSettings] = useState<ToneSettings>(EMPTY_TONE);

  const available = VERTICALS.filter((v) => !existingVerticals.includes(v));
  const shadowing = vertical ? propertyOverrides.filter((p) => p.vertical === vertical) : [];

  const reset = () => {
    setVertical(null);
    setSettings(EMPTY_TONE);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePickVertical = (v: Vertical) => {
    setVertical(v);
    setSettings(defaultSettings);
  };

  const handleSave = () => {
    if (!vertical) return;
    onSave({
      id: `vertical-${vertical.toLowerCase()}-${Date.now()}`,
      vertical,
      settings,
    });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add vertical override</DialogTitle>
          <DialogDescription>
            Override the portfolio default for one property type. The settings here apply to every property in that vertical, unless that property has its own override.
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: pick vertical */}
        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">Vertical</label>
          {available.length === 0 ? (
            <p className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              All verticals already have overrides. Edit them in the list below or remove one to add a new one.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {available.map((v) => {
                const meta = VERTICAL_META[v];
                const Icon = meta.icon;
                const active = vertical === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handlePickVertical(v)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 text-left transition-all",
                      active ? "border-primary bg-primary/5" : "border-border hover:border-zinc-400",
                    )}
                  >
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", meta.bg)}>
                      <Icon className={cn("h-4 w-4", meta.color)} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{v}</p>
                      <p className="text-[11px] text-muted-foreground">{meta.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 2: progressive disclosure of editor */}
        {vertical && (
          <>
            {shadowing.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/30">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <div className="text-xs text-amber-900 dark:text-amber-200">
                  <p className="font-medium">
                    Heads up — {shadowing.length} {shadowing.length === 1 ? "property" : "properties"} in {vertical} already have a property-level override and will continue to take precedence over this vertical override:
                  </p>
                  <ul className="mt-1 list-inside list-disc">
                    {shadowing.map((p) => (
                      <li key={p.id}>{p.propertyName}</li>
                    ))}
                  </ul>
                  <p className="mt-1.5 text-amber-800/80 dark:text-amber-200/80">
                    Remove a property override later if you want it to inherit from this vertical instead.
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-border p-4">
              <p className="mb-3 text-xs text-muted-foreground">
                Pre-filled with the portfolio default. Edit any field below to override for {vertical}.
              </p>
              <ToneEditor settings={settings} editing={true} onChange={setSettings} />
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!vertical}>
            Save vertical override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────
 * Add Property Override dialog (multi-select + bulk-write)
 * ─────────────────────────────────────────── */

function AddPropertyOverrideDialog({
  open,
  onClose,
  existingPropertyOverrides,
  defaultSettings,
  preselectedPropertyName,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  existingPropertyOverrides: PropertyOverrideRecord[];
  defaultSettings: ToneSettings;
  preselectedPropertyName?: string | null;
  onSave: (records: PropertyOverrideRecord[]) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [settings, setSettings] = useState<ToneSettings>(EMPTY_TONE);
  const selectedNames = selectedIds;
  const existingOverridesByProperty = useMemo(
    () => new Map(existingPropertyOverrides.map((override) => [override.propertyName, override])),
    [existingPropertyOverrides],
  );
  const selectionAnalysis = useMemo(
    () => computePropertySelectionMode(selectedNames, existingOverridesByProperty),
    [selectedNames, existingOverridesByProperty],
  );

  const selectedPropertySummaries = useMemo(
    () =>
      selectedNames.map((propertyName) => ({
        propertyName,
        settings: existingOverridesByProperty.get(propertyName)?.settings ?? null,
      })),
    [selectedNames, existingOverridesByProperty],
  );

  const reset = () => {
    setSelectedIds([]);
    setSettings(EMPTY_TONE);
  };

  useEffect(() => {
    if (!open || !preselectedPropertyName) return;
    if (!MOCK_PROPERTIES.some((property) => property.name === preselectedPropertyName)) return;
    setSelectedIds([preselectedPropertyName]);
  }, [open, preselectedPropertyName]);

  useEffect(() => {
    if (!open || selectedNames.length === 0) return;
    if (selectionAnalysis.mode === "shared" && selectionAnalysis.sharedSettings) {
      setSettings(cloneToneSettingsForDialog(selectionAnalysis.sharedSettings));
      return;
    }
    if (selectionAnalysis.mode === "mixed") {
      setSettings(cloneToneSettingsForDialog(EMPTY_TONE));
      return;
    }
    setSettings(cloneToneSettingsForDialog(defaultSettings));
  }, [open, selectedNames, selectionAnalysis, defaultSettings]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = () => {
    if (selectedNames.length === 0) return;
    const now = Date.now();
    const records: PropertyOverrideRecord[] = selectedNames.map((name, i) => {
      const meta = MOCK_PROPERTIES.find((p) => p.name === name)!;
      return {
        id: `property-${name.toLowerCase().replace(/\s+/g, "-")}-${now}-${i}`,
        propertyName: name,
        vertical: meta.vertical,
        settings,
      };
    });
    onSave(records);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add property override{selectedNames.length > 1 ? "s" : ""}</DialogTitle>
          <DialogDescription>
            Pick one or more properties. The settings you save will be applied to each selected property as its own individual override — they can be edited or removed independently later.
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: multi-select */}
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <label className="block text-xs font-medium text-muted-foreground">Properties</label>
            <span className="text-xs text-muted-foreground">
              {selectedNames.length} selected
            </span>
          </div>
          {selectedNames.filter((name) => existingOverridesByProperty.has(name)).length > 0 && (
            <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/30">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              <div className="text-xs text-amber-900 dark:text-amber-200">
                <p className="font-medium">
                  {selectedNames.filter((name) => existingOverridesByProperty.has(name)).length} of {selectedNames.length} selected {selectedNames.length === 1 ? "property already has" : "properties already have"} an override and will be replaced when you save:
                </p>
                <ul className="mt-1 list-inside list-disc">
                  {selectedNames
                    .filter((name) => existingOverridesByProperty.has(name))
                    .map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                </ul>
              </div>
            </div>
          )}
          <PropertySelector
            data={PROPERTY_FILTER_DATA}
            triggerWidthClassName="w-full"
            panelHeight={420}
            showChips
            chipsPosition="below"
            chipsClearAll
            selectedPropertyIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
          />
        </div>

        {/* Step 2: progressive disclosure of editor */}
        {selectedNames.length > 0 && (
          <div className="rounded-lg border border-border p-4">
            {selectionAnalysis.mode === "shared" && (
              <div className="mb-3 flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-900/40 dark:bg-blue-950/30">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                <p className="text-xs text-blue-900 dark:text-blue-200">
                  Editing the existing override shared by these {selectedNames.length} {selectedNames.length === 1 ? "property" : "properties"}.
                  Saving will update all of them.
                </p>
              </div>
            )}
            {selectionAnalysis.mode === "mixed" && (
              <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/30">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <div className="text-xs text-amber-900 dark:text-amber-200">
                  <p className="font-medium">
                    These {selectedNames.length} properties currently have different (or no) voice & tone settings.
                    Saving will completely replace whatever is set on each selected property.
                  </p>
                  <details className="mt-1.5">
                    <summary className="cursor-pointer text-amber-800/90 dark:text-amber-200/90">See current settings</summary>
                    <ul className="mt-1 list-inside list-disc">
                      {selectedPropertySummaries.map(({ propertyName, settings: currentSettings }) => (
                        <li key={propertyName}>
                          {propertyName}: {currentSettings?.persona?.trim() ? currentSettings.persona : "No override yet"}
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              </div>
            )}
            <p className="mb-3 text-xs text-muted-foreground">
              {selectionAnalysis.mode === "shared"
                ? "Pre-filled from the current shared override. Edit before saving to apply updates to all selected properties."
                : selectionAnalysis.mode === "mixed"
                  ? "Starts blank because selected properties do not share one exact override. Enter the new settings to apply across all selected properties."
                  : "These settings will be saved to each selected property as an individual override. Pre-filled with the portfolio default — edit to customize."}
            </p>
            <ToneEditor settings={settings} editing={true} onChange={setSettings} />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={selectedNames.length === 0}>
            Save {selectedNames.length > 0 ? `${selectedNames.length} ` : ""}property override{selectedNames.length === 1 ? "" : "s"}
            {selectionAnalysis.overriddenCount > 0 ? " (replaces existing)" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────
 * Helpers
 * ─────────────────────────────────────────── */

function countPropertiesInVertical(vertical: Vertical): number {
  return MOCK_PROPERTIES.filter((p) => p.vertical === vertical).length;
}

function cloneToneSettingsForDialog(settings: ToneSettings): ToneSettings {
  return {
    persona: settings.persona,
    guidelines: settings.guidelines,
    doExamples: [...settings.doExamples],
    dontExamples: [...settings.dontExamples],
  };
}

function tonesEqual(a: ToneSettings, b: ToneSettings): boolean {
  return (
    a.persona === b.persona &&
    a.guidelines === b.guidelines &&
    a.doExamples.length === b.doExamples.length &&
    a.doExamples.every((entry, idx) => entry === b.doExamples[idx]) &&
    a.dontExamples.length === b.dontExamples.length &&
    a.dontExamples.every((entry, idx) => entry === b.dontExamples[idx])
  );
}

function computePropertySelectionMode(
  selectedNames: string[],
  overridesByProperty: Map<string, PropertyOverrideRecord>,
): { mode: "empty" | "shared" | "mixed"; sharedSettings?: ToneSettings; overriddenCount: number } {
  if (selectedNames.length === 0) {
    return { mode: "empty", overriddenCount: 0 };
  }

  const matchingOverrides = selectedNames
    .map((name) => overridesByProperty.get(name))
    .filter((override): override is PropertyOverrideRecord => Boolean(override));

  if (matchingOverrides.length === 0) {
    return { mode: "empty", overriddenCount: 0 };
  }

  if (matchingOverrides.length !== selectedNames.length) {
    return { mode: "mixed", overriddenCount: matchingOverrides.length };
  }

  const [first, ...rest] = matchingOverrides;
  if (rest.every((override) => tonesEqual(override.settings, first.settings))) {
    return {
      mode: "shared",
      sharedSettings: first.settings,
      overriddenCount: matchingOverrides.length,
    };
  }

  return { mode: "mixed", overriddenCount: matchingOverrides.length };
}

function agentBgClass(accent: string): string {
  switch (accent) {
    case "indigo":
      return "bg-indigo-50 dark:bg-indigo-950/30";
    case "emerald":
      return "bg-emerald-50 dark:bg-emerald-950/30";
    case "amber":
      return "bg-amber-50 dark:bg-amber-950/30";
    case "sky":
      return "bg-sky-50 dark:bg-sky-950/30";
    default:
      return "bg-muted";
  }
}

function agentTextClass(accent: string): string {
  switch (accent) {
    case "indigo":
      return "text-indigo-600";
    case "emerald":
      return "text-emerald-600";
    case "amber":
      return "text-amber-600";
    case "sky":
      return "text-sky-600";
    default:
      return "text-muted-foreground";
  }
}
