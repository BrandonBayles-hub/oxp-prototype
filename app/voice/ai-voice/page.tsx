"use client";

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
import {
  useVoice,
  DEFAULT_NOVA2_VOICE_ID,
  getNova2Voice,
  getNova2VoicesByGender,
  type AgentToneId,
  type VoiceSettings,
  type AgentVerticalVoiceOverride,
  type AgentPropertyVoiceOverride,
} from "@/lib/voice-context";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Globe,
  GraduationCap,
  Home,
  Info,
  Layers,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Briefcase,
  Trash2,
  AlertTriangle,
  Wrench,
  Sparkles,
} from "lucide-react";
import { PropertySelector } from "@/components/property-filter";
import {
  VERTICALS,
  MOCK_PROPERTIES,
  PROPERTY_FILTER_DATA,
  type Vertical,
} from "@/lib/voice-properties";

const ALL_LANGUAGES = ["English", "Spanish", "French", "German", "Italian", "Portuguese", "Hindi"];

const LANGUAGE_FLAGS: Record<string, string> = {
  English: "🇺🇸",
  Spanish: "🇪🇸",
  French: "🇫🇷",
  German: "🇩🇪",
  Italian: "🇮🇹",
  Portuguese: "🇧🇷",
  Hindi: "🇮🇳",
};

type AgentMeta = {
  id: AgentToneId;
  name: string;
  description: string;
  icon: typeof Sparkles;
  accent: string;
};

const AGENTS: AgentMeta[] = [
  {
    id: "leasing",
    name: "Leasing AI",
    description: "Engages prospects, schedules tours, and answers application questions.",
    icon: Sparkles,
    accent: "indigo",
  },
  {
    id: "renewal",
    name: "Renewal AI",
    description: "Drives renewal conversations, retention offers, and outreach.",
    icon: RotateCcw,
    accent: "emerald",
  },
  {
    id: "payments",
    name: "Payments AI",
    description: "Handles rent, fees, and payment-related questions for residents.",
    icon: CreditCard,
    accent: "amber",
  },
  {
    id: "maintenance",
    name: "Maintenance AI",
    description: "Manages work orders, follow-up scheduling, and resident updates.",
    icon: Wrench,
    accent: "sky",
  },
];

const VERTICAL_META: Record<Vertical, { icon: typeof Building2; color: string; bg: string; description: string }> = {
  Conventional: { icon: Building2, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", description: "Market-rate multifamily apartments" },
  Student: { icon: GraduationCap, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30", description: "University and college housing" },
  Affordable: { icon: ShieldCheck, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/30", description: "Income-restricted housing communities" },
};

type VerticalOverrideRecord = Omit<AgentVerticalVoiceOverride, "agentId"> & { vertical: Vertical };
type PropertyOverrideRecord = Omit<AgentPropertyVoiceOverride, "agentId"> & { vertical: Vertical };

const BLANK_VOICE: VoiceSettings = {
  aiVoiceEnabled: true,
  voiceGender: "female",
  voiceAccent: DEFAULT_NOVA2_VOICE_ID.female,
  voiceLanguages: [],
  autoDetectLanguage: false,
  recordAudio: false,
  generateTranscripts: false,
  legalDisclosureEnabled: false,
  legalDisclosureText: "",
  greeting: "",
  holdPhrase: "",
  maxCallLength: 10,
  aiDisclosureEnabled: false,
};

function isAgentToneId(value: string | null): value is AgentToneId {
  return value === "leasing" || value === "renewal" || value === "payments" || value === "maintenance";
}

function cloneVoiceSettings(settings: VoiceSettings): VoiceSettings {
  return { ...settings, voiceLanguages: [...settings.voiceLanguages] };
}

function voiceSettingsEqual(a: VoiceSettings, b: VoiceSettings): boolean {
  const aLangs = [...a.voiceLanguages].sort();
  const bLangs = [...b.voiceLanguages].sort();
  return (
    a.aiVoiceEnabled === b.aiVoiceEnabled &&
    a.voiceGender === b.voiceGender &&
    a.voiceAccent === b.voiceAccent &&
    a.autoDetectLanguage === b.autoDetectLanguage &&
    a.recordAudio === b.recordAudio &&
    a.generateTranscripts === b.generateTranscripts &&
    a.legalDisclosureEnabled === b.legalDisclosureEnabled &&
    a.legalDisclosureText === b.legalDisclosureText &&
    a.greeting === b.greeting &&
    a.holdPhrase === b.holdPhrase &&
    a.maxCallLength === b.maxCallLength &&
    a.aiDisclosureEnabled === b.aiDisclosureEnabled &&
    aLangs.length === bLangs.length &&
    aLangs.every((lang, idx) => lang === bLangs[idx])
  );
}

function computeVoiceSelectionMode(
  selectedNames: string[],
  overridesByProperty: Map<string, PropertyOverrideRecord>,
): { mode: "empty" | "shared" | "mixed"; sharedSettings?: VoiceSettings; overriddenCount: number } {
  if (selectedNames.length === 0) {
    return { mode: "empty", overriddenCount: 0 };
  }
  const matching = selectedNames
    .map((name) => overridesByProperty.get(name))
    .filter((override): override is PropertyOverrideRecord => Boolean(override));

  if (matching.length === 0) {
    return { mode: "empty", overriddenCount: 0 };
  }
  if (matching.length !== selectedNames.length) {
    return { mode: "mixed", overriddenCount: matching.length };
  }
  const [first, ...rest] = matching;
  if (rest.every((override) => voiceSettingsEqual(override.settings, first.settings))) {
    return { mode: "shared", sharedSettings: first.settings, overriddenCount: matching.length };
  }
  return { mode: "mixed", overriddenCount: matching.length };
}

export default function AIVoicePage() {
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
        defaults={voice.agentVoiceDefaults}
        verticalOverrides={voice.agentVerticalVoiceOverrides}
        propertyOverrides={voice.agentPropertyVoiceOverrides}
        onPick={selectAgent}
      />
    );
  }

  const defaultSettings = voice.agentVoiceDefaults[selectedAgentId] ?? voice.voiceSettings;
  const verticalOverrides = voice.agentVerticalVoiceOverrides.filter(
    (override) => override.agentId === selectedAgentId,
  ) as VerticalOverrideRecord[];
  const propertyOverrides = voice.agentPropertyVoiceOverrides.filter(
    (override) => override.agentId === selectedAgentId,
  ) as PropertyOverrideRecord[];

  return (
    <AgentDetailView
      agent={AGENTS.find((agent) => agent.id === selectedAgentId)!}
      defaultSettings={defaultSettings}
      verticalOverrides={verticalOverrides}
      propertyOverrides={propertyOverrides}
      pendingProperty={queryProperty}
      pendingScrollTo={queryScrollTo}
      onBack={clearSelectedAgent}
      onUpdateDefault={(next) => voice.updateAgentVoiceDefault(selectedAgentId, next)}
      onResetDefault={() => voice.resetAgentVoiceDefault(selectedAgentId)}
      onAddVertical={(record) => voice.addAgentVerticalVoiceOverride({ ...record, agentId: selectedAgentId })}
      onUpdateVertical={(id, next) => voice.updateAgentVerticalVoiceOverride(id, { settings: next })}
      onRemoveVertical={(id) => voice.removeAgentVerticalVoiceOverride(id)}
      onAddProperties={(records) =>
        voice.addAgentPropertyVoiceOverrides(records.map((record) => ({ ...record, agentId: selectedAgentId })))
      }
      onUpdateProperty={(id, next) => voice.updateAgentPropertyVoiceOverride(id, { settings: next })}
      onRemoveProperty={(id) => voice.removeAgentPropertyVoiceOverride(id)}
    />
  );
}

function AgentPickerView({
  defaults,
  verticalOverrides,
  propertyOverrides,
  onPick,
}: {
  defaults: Record<AgentToneId, VoiceSettings>;
  verticalOverrides: AgentVerticalVoiceOverride[];
  propertyOverrides: AgentPropertyVoiceOverride[];
  onPick: (agentId: AgentToneId) => void;
}) {
  return (
    <div>
      <p className="mb-6 text-sm text-muted-foreground">
        Choose an agent to configure voice settings. Each agent has its own portfolio default plus vertical and property overrides.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {AGENTS.map((agent) => {
          const Icon = agent.icon;
          const defaultVoice = defaults[agent.id];
          const verticalCount = verticalOverrides.filter((override) => override.agentId === agent.id).length;
          const propertyCount = propertyOverrides.filter((override) => override.agentId === agent.id).length;
          return (
            <button
              key={agent.id}
              type="button"
              onClick={() => onPick(agent.id)}
              className="group rounded-xl border border-border bg-white p-5 text-left transition-all hover:border-zinc-400 hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <img src="/eli-cube.svg" alt="" width={40} height={40} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-foreground">ELI+ {agent.name}</h3>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{agent.description}</p>
                  <div className="mt-3 rounded-md bg-muted/40 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Default voice</p>
                    <p className="mt-0.5 text-xs text-foreground line-clamp-2">
                      {(getNova2Voice(defaultVoice.voiceAccent)?.label ?? defaultVoice.voiceAccent)} • {defaultVoice.voiceGender} • {defaultVoice.voiceLanguages[0] ?? "No language"}
                      {defaultVoice.voiceLanguages.length > 1 ? ` +${defaultVoice.voiceLanguages.length - 1}` : ""}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-[10px]">
                    <Badge variant="secondary" className="font-normal">{verticalCount} vertical override{verticalCount === 1 ? "" : "s"}</Badge>
                    <Badge variant="secondary" className="font-normal">{propertyCount} property override{propertyCount === 1 ? "" : "s"}</Badge>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AgentDetailView({
  agent,
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
  defaultSettings: VoiceSettings;
  verticalOverrides: VerticalOverrideRecord[];
  propertyOverrides: PropertyOverrideRecord[];
  pendingProperty?: string | null;
  pendingScrollTo?: string | null;
  onBack: () => void;
  onUpdateDefault: (next: VoiceSettings) => void;
  onResetDefault: () => void;
  onAddVertical: (record: VerticalOverrideRecord) => void;
  onUpdateVertical: (id: string, next: VoiceSettings) => void;
  onRemoveVertical: (id: string) => void;
  onAddProperties: (records: PropertyOverrideRecord[]) => void;
  onUpdateProperty: (id: string, next: VoiceSettings) => void;
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
    if (handledDeepLinkProperty.current === pendingProperty) return;
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
      window.setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    }
  }, [pendingScrollTo]);

  return (
    <div className="space-y-8">
      <div>
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> All agents
        </button>
        <div className="mt-3 flex items-start gap-4">
          <img src="/eli-cube.svg" alt="" width={40} height={40} className="shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-foreground">ELI+ {agent.name}</h2>
            <p className="text-sm text-muted-foreground">{agent.description}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Settings cascade <span className="font-medium text-foreground">Portfolio default → Vertical → Property</span>. More specific scopes win.
            </p>
          </div>
        </div>
      </div>

      <StickyAnchorStrip
        counts={{ vertical: verticalOverrides.length, property: propertyOverrides.length }}
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

      <section ref={defaultSectionRef} className="scroll-mt-32">
        <SectionHeader
          icon={<Layers className="h-4 w-4 text-muted-foreground" />}
          title="Portfolio default"
          subtitle="Applies to every property unless overridden below."
        />
        <DefaultVoiceCard settings={defaultSettings} onChange={onUpdateDefault} onReset={onResetDefault} />
      </section>

      <section ref={verticalSectionRef} className="scroll-mt-32">
        <SectionHeader
          icon={<Layers className="h-4 w-4 text-muted-foreground" />}
          title="Vertical overrides"
          subtitle="Customize this agent's voice for a specific property type."
          countLabel={`${verticalOverrides.length}`}
        />
        {verticalOverrides.length === 0 ? (
          <EmptyOverrideState label="No vertical overrides yet." actionLabel="Add vertical override" onAction={() => setAddVerticalOpen(true)} />
        ) : (
          <div className="space-y-3">
            {verticalOverrides.map((override) => (
              <VerticalOverrideCard
                key={override.id}
                record={override}
                shadowingPropertyOverrides={propertyOverrides.filter((property) => property.vertical === override.vertical)}
                onChange={(next) => onUpdateVertical(override.id, next)}
                onRemove={() => onRemoveVertical(override.id)}
              />
            ))}
            <Button variant="outline" size="sm" onClick={() => setAddVerticalOpen(true)} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Add another vertical override
            </Button>
          </div>
        )}
      </section>

      <section ref={propertySectionRef} className="scroll-mt-32">
        <SectionHeader
          icon={<Home className="h-4 w-4 text-muted-foreground" />}
          title="Property overrides"
          subtitle="Customize this agent's voice for one or more individual properties."
          countLabel={`${propertyOverrides.length}`}
        />
        {propertyOverrides.length === 0 ? (
          <EmptyOverrideState label="No property overrides yet." actionLabel="Add property override" onAction={() => setAddPropertyOpen(true)} />
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

      <AddVerticalOverrideDialog
        open={addVerticalOpen}
        onClose={() => setAddVerticalOpen(false)}
        existingVerticals={verticalOverrides.map((override) => override.vertical)}
        propertyOverrides={propertyOverrides}
        defaultSettings={defaultSettings}
        onSave={(record) => {
          onAddVertical(record);
          setAddVerticalOpen(false);
        }}
      />

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
        <Button variant="outline" size="sm" onClick={() => onJump("default")}>Default</Button>
        <Button variant="outline" size="sm" onClick={() => onJump("verticals")}>Verticals ({counts.vertical})</Button>
        <Button variant="outline" size="sm" onClick={() => onJump("properties")}>Properties ({counts.property})</Button>
      </div>
    </div>
  );
}

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
        {countLabel !== undefined && <span className="text-xs text-muted-foreground">({countLabel})</span>}
      </div>
      {subtitle && <p className="hidden text-xs text-muted-foreground sm:block">{subtitle}</p>}
    </div>
  );
}

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

function DefaultVoiceCard({
  settings,
  onChange,
  onReset,
}: {
  settings: VoiceSettings;
  onChange: (next: VoiceSettings) => void;
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
              <CardTitle className="text-base">Default voice</CardTitle>
              <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", expanded && "rotate-180")} />
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Starts from your company voice settings. Edit for agent-level defaults, or reset to the company baseline.
            </p>
          </button>
          <div className="flex items-center gap-1.5">
            {expanded && !editing ? (
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
            ) : expanded ? (
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Done</Button>
            ) : null}
            {expanded && (
              <Button variant="ghost" size="sm" onClick={() => setConfirmResetOpen(true)} className="gap-1 text-muted-foreground hover:text-foreground">
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          <VoiceSettingsEditor settings={settings} editing={editing} onChange={onChange} />
        </CardContent>
      )}
      <Dialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset to company voice baseline?</DialogTitle>
            <DialogDescription>
              This replaces your agent-level default with the current company-level voice settings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmResetOpen(false)}>Cancel</Button>
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

function VerticalOverrideCard({
  record,
  shadowingPropertyOverrides,
  onChange,
  onRemove,
}: {
  record: VerticalOverrideRecord;
  shadowingPropertyOverrides: PropertyOverrideRecord[];
  onChange: (next: VoiceSettings) => void;
  onRemove: () => void;
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
          <button type="button" onClick={() => setExpanded((value) => !value)} className="flex flex-1 items-start gap-3 text-left min-w-0">
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", meta.bg)}>
              <Icon className={cn("h-4 w-4", meta.color)} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{record.vertical}</CardTitle>
                <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", expanded && "rotate-180")} />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                {getNova2Voice(record.settings.voiceAccent)?.label ?? record.settings.voiceAccent} • {record.settings.voiceGender}
              </p>
            </div>
          </button>
          <div className="flex items-center gap-1.5">
            {expanded && !editing && <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1"><Pencil className="h-3.5 w-3.5" /> Edit</Button>}
            {expanded && editing && <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Done</Button>}
            <Button variant="ghost" size="sm" onClick={() => setConfirmRemoveOpen(true)} className="text-red-600 hover:text-red-700">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {expanded && shadowingPropertyOverrides.length > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/30">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            <div className="text-xs text-amber-900 dark:text-amber-200">
              <p className="font-medium">
                {shadowingPropertyOverrides.length} {shadowingPropertyOverrides.length === 1 ? "property" : "properties"} in {record.vertical} already have a property-level voice override and will continue to take precedence.
              </p>
            </div>
          </div>
        )}
      </CardHeader>
      {expanded && (
        <CardContent>
          <VoiceSettingsEditor settings={record.settings} editing={editing} onChange={onChange} />
        </CardContent>
      )}
      <Dialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove vertical override?</DialogTitle>
            <DialogDescription>
              This removes the {record.vertical} voice override for this agent.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemoveOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { setEditing(false); setConfirmRemoveOpen(false); onRemove(); }}>
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

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
  onChange: (next: VoiceSettings) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const meta = VERTICAL_META[record.vertical];

  useEffect(() => {
    if (autoExpand) setExpanded(true);
  }, [autoExpand]);

  return (
    <div ref={cardRef}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <button type="button" onClick={() => setExpanded((value) => !value)} className="flex flex-1 items-start gap-3 text-left min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Home className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{record.propertyName}</CardTitle>
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", meta.bg, meta.color)}>{record.vertical}</span>
                  <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", expanded && "rotate-180")} />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                  {getNova2Voice(record.settings.voiceAccent)?.label ?? record.settings.voiceAccent} • {record.settings.voiceGender}
                </p>
              </div>
            </button>
            <div className="flex items-center gap-1.5">
              {expanded && !editing && <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1"><Pencil className="h-3.5 w-3.5" /> Edit</Button>}
              {expanded && editing && <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Done</Button>}
              <Button variant="ghost" size="sm" onClick={() => setConfirmRemoveOpen(true)} className="text-red-600 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        </CardHeader>
        {expanded && (
          <CardContent>
            <VoiceSettingsEditor settings={record.settings} editing={editing} onChange={onChange} />
          </CardContent>
        )}
        <Dialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Remove property override?</DialogTitle>
              <DialogDescription>
                This removes the voice override for {record.propertyName}. It will inherit from its vertical override, then portfolio default.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmRemoveOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => { setEditing(false); setConfirmRemoveOpen(false); onRemove(); }}>
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
}

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
  defaultSettings: VoiceSettings;
  onSave: (record: VerticalOverrideRecord) => void;
}) {
  const [vertical, setVertical] = useState<Vertical | null>(null);
  const [settings, setSettings] = useState<VoiceSettings>(cloneVoiceSettings(BLANK_VOICE));
  const available = VERTICALS.filter((item) => !existingVerticals.includes(item));
  const shadowing = vertical ? propertyOverrides.filter((property) => property.vertical === vertical) : [];

  const reset = () => {
    setVertical(null);
    setSettings(cloneVoiceSettings(BLANK_VOICE));
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePickVertical = (value: Vertical) => {
    setVertical(value);
    setSettings(cloneVoiceSettings(defaultSettings));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add vertical override</DialogTitle>
          <DialogDescription>Override this agent&apos;s default voice for one property type.</DialogDescription>
        </DialogHeader>
        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">Vertical</label>
          {available.length === 0 ? (
            <p className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              All verticals already have overrides. Edit existing cards below.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {available.map((item) => {
                const meta = VERTICAL_META[item];
                const Icon = meta.icon;
                const active = vertical === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handlePickVertical(item)}
                    className={cn("flex items-start gap-3 rounded-lg border p-3 text-left transition-all", active ? "border-primary bg-primary/5" : "border-border hover:border-zinc-400")}
                  >
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", meta.bg)}>
                      <Icon className={cn("h-4 w-4", meta.color)} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item}</p>
                      <p className="text-[11px] text-muted-foreground">{meta.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {vertical && (
          <>
            {shadowing.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/30">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <div className="text-xs text-amber-900 dark:text-amber-200">
                  <p className="font-medium">
                    Heads up — {shadowing.length} {shadowing.length === 1 ? "property" : "properties"} in {vertical} already have property-level voice overrides and will continue to take precedence.
                  </p>
                </div>
              </div>
            )}
            <div className="rounded-lg border border-border p-4">
              <p className="mb-3 text-xs text-muted-foreground">
                Pre-filled with this agent&apos;s portfolio default. Edit any field to customize {vertical}.
              </p>
              <VoiceSettingsEditor settings={settings} editing={true} onChange={setSettings} />
            </div>
          </>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={() => {
              if (!vertical) return;
              onSave({
                id: `voice-vertical-${vertical.toLowerCase()}-${Date.now()}`,
                vertical,
                settings: cloneVoiceSettings(settings),
              });
              reset();
            }}
            disabled={!vertical}
          >
            Save vertical override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
  defaultSettings: VoiceSettings;
  preselectedPropertyName?: string | null;
  onSave: (records: PropertyOverrideRecord[]) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [settings, setSettings] = useState<VoiceSettings>(cloneVoiceSettings(BLANK_VOICE));
  const selectedNames = selectedIds;

  const overridesByProperty = useMemo(
    () => new Map(existingPropertyOverrides.map((override) => [override.propertyName, override])),
    [existingPropertyOverrides],
  );
  const selectionAnalysis = useMemo(
    () => computeVoiceSelectionMode(selectedNames, overridesByProperty),
    [selectedNames, overridesByProperty],
  );
  const selectedExistingNames = useMemo(
    () => selectedNames.filter((name) => overridesByProperty.has(name)),
    [selectedNames, overridesByProperty],
  );

  useEffect(() => {
    if (!open || !preselectedPropertyName) return;
    if (!MOCK_PROPERTIES.some((property) => property.name === preselectedPropertyName)) return;
    setSelectedIds([preselectedPropertyName]);
  }, [open, preselectedPropertyName]);

  useEffect(() => {
    if (!open || selectedNames.length === 0) return;
    if (selectionAnalysis.mode === "shared" && selectionAnalysis.sharedSettings) {
      setSettings(cloneVoiceSettings(selectionAnalysis.sharedSettings));
      return;
    }
    if (selectionAnalysis.mode === "mixed") {
      setSettings(cloneVoiceSettings(BLANK_VOICE));
      return;
    }
    setSettings(cloneVoiceSettings(defaultSettings));
  }, [open, selectedNames, selectionAnalysis, defaultSettings]);

  const reset = () => {
    setSelectedIds([]);
    setSettings(cloneVoiceSettings(BLANK_VOICE));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && (reset(), onClose())}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add property override{selectedNames.length > 1 ? "s" : ""}</DialogTitle>
          <DialogDescription>
            Select one or more properties. Saving applies these settings as individual property overrides.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {selectedExistingNames.length > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/30">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              <div className="text-xs text-amber-900 dark:text-amber-200">
                <p className="font-medium">
                  {selectedExistingNames.length} of {selectedNames.length} selected {selectedNames.length === 1 ? "property already has" : "properties already have"} a voice override and will be replaced when you save:
                </p>
                <ul className="mt-1 list-inside list-disc">
                  {selectedExistingNames.map((name) => (
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

        {selectedNames.length > 0 && (
          <div className="rounded-lg border border-border p-4">
            {selectionAnalysis.mode === "shared" && (
              <div className="mb-3 flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-900/40 dark:bg-blue-950/30">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                <p className="text-xs text-blue-900 dark:text-blue-200">
                  Editing the existing override shared by these {selectedNames.length} {selectedNames.length === 1 ? "property" : "properties"}. Saving updates all of them.
                </p>
              </div>
            )}
            {selectionAnalysis.mode === "mixed" && (
              <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/30">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <p className="text-xs text-amber-900 dark:text-amber-200">
                  These properties currently have different (or no) voice settings. Saving will completely replace whatever is currently set on each selected property.
                </p>
              </div>
            )}
            <p className="mb-3 text-xs text-muted-foreground">
              {selectionAnalysis.mode === "shared"
                ? "Pre-filled from the shared existing override."
                : selectionAnalysis.mode === "mixed"
                  ? "Starts blank because selected properties do not share one exact override."
                  : "Pre-filled from this agent's portfolio default."}
            </p>
            <VoiceSettingsEditor settings={settings} editing={true} onChange={setSettings} />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button
            onClick={() => {
              if (selectedNames.length === 0) return;
              const now = Date.now();
              const records: PropertyOverrideRecord[] = selectedNames.map((name, index) => {
                const property = MOCK_PROPERTIES.find((item) => item.name === name)!;
                return {
                  id: `voice-property-${name.toLowerCase().replace(/\s+/g, "-")}-${now}-${index}`,
                  propertyName: name,
                  vertical: property.vertical,
                  settings: cloneVoiceSettings(settings),
                };
              });
              onSave(records);
              reset();
            }}
            disabled={selectedNames.length === 0}
          >
            Save {selectedNames.length > 0 ? `${selectedNames.length} ` : ""}property override{selectedNames.length === 1 ? "" : "s"}
            {selectionAnalysis.overriddenCount > 0 ? " (replaces existing)" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VoiceSettingsEditor({
  settings,
  editing,
  onChange,
}: {
  settings: VoiceSettings;
  editing: boolean;
  onChange: (next: VoiceSettings) => void;
}) {
  const update = (patch: Partial<VoiceSettings>) => {
    onChange({
      ...settings,
      ...patch,
      voiceLanguages: patch.voiceLanguages !== undefined ? [...patch.voiceLanguages] : settings.voiceLanguages,
    });
  };

  if (!editing) {
    return (
      <div className="space-y-4 text-sm">
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <p className="text-xs font-medium text-muted-foreground">How it sounds</p>
          <p className="mt-1 text-foreground">{getNova2Voice(settings.voiceAccent)?.label ?? settings.voiceAccent} • {settings.voiceGender}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <p className="text-xs font-medium text-muted-foreground">Languages</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {settings.voiceLanguages.length === 0 ? (
              <span className="text-xs italic text-muted-foreground">None selected</span>
            ) : (
              settings.voiceLanguages.map((language) => (
                <span key={language} className="inline-flex rounded-full border border-border bg-background px-2 py-0.5 text-[10px]">
                  {LANGUAGE_FLAGS[language]} {language}
                </span>
              ))
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Auto-detect: {settings.autoDetectLanguage ? "On" : "Off"}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <p className="text-xs font-medium text-muted-foreground">Call handling</p>
          <p className="mt-1 text-xs text-foreground">Record audio: {settings.recordAudio ? "On" : "Off"} • Transcripts: {settings.generateTranscripts ? "On" : "Off"} • AI disclosure: {settings.aiDisclosureEnabled ? "On" : "Off"}</p>
          <p className="mt-1 text-xs text-foreground">Max call length: {settings.maxCallLength} minutes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Voice gender</p>
        <div className="grid grid-cols-2 gap-2">
          {(["female", "male"] as const).map((gender) => (
            <button
              key={gender}
              type="button"
              onClick={() => {
                update({ voiceGender: gender });
                const current = getNova2Voice(settings.voiceAccent);
                if (!current || current.gender !== gender) {
                  update({ voiceAccent: DEFAULT_NOVA2_VOICE_ID[gender] });
                }
              }}
              className={cn("rounded-lg border-2 px-3 py-2 text-xs font-medium capitalize transition-all", settings.voiceGender === gender ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-primary/30")}
            >
              {gender}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Voice • Amazon Nova 2 Sonic</p>
        <div className="grid grid-cols-2 gap-2">
          {getNova2VoicesByGender(settings.voiceGender).map((voice) => (
            <button
              key={voice.id}
              type="button"
              onClick={() => update({ voiceAccent: voice.id })}
              className={cn("rounded-lg border-2 px-3 py-2 text-left text-xs transition-all", settings.voiceAccent === voice.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")}
            >
              <p className="font-semibold text-foreground">{voice.label}</p>
              <p className="text-[10px] text-muted-foreground">{voice.accent}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Languages</p>
          <button
            type="button"
            onClick={() => update({ autoDetectLanguage: !settings.autoDetectLanguage })}
            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
          >
            <Globe className="h-3 w-3" /> Auto-detect: {settings.autoDetectLanguage ? "On" : "Off"}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ALL_LANGUAGES.map((language) => {
            const enabled = settings.voiceLanguages.includes(language);
            return (
              <button
                key={language}
                type="button"
                onClick={() => {
                  update({
                    voiceLanguages: enabled
                      ? settings.voiceLanguages.filter((item) => item !== language)
                      : [...settings.voiceLanguages, language],
                  });
                }}
                className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors", enabled ? "border-primary/30 bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-primary/20")}
              >
                {LANGUAGE_FLAGS[language]} {language}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Recording and legal</p>
        <ToggleRow title="Record audio" checked={settings.recordAudio} onChange={(value) => update({ recordAudio: value })} />
        <ToggleRow title="Generate transcripts" checked={settings.generateTranscripts} onChange={(value) => update({ generateTranscripts: value })} />
        <ToggleRow title="Legal disclosure" checked={settings.legalDisclosureEnabled} onChange={(value) => update({ legalDisclosureEnabled: value })} />
        {settings.legalDisclosureEnabled && (
          <textarea
            value={settings.legalDisclosureText}
            onChange={(event) => update({ legalDisclosureText: event.target.value })}
            rows={2}
            className="input-base resize-y text-xs"
            placeholder="This call may be recorded for quality assurance..."
          />
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Advanced</p>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Greeting</label>
          <input value={settings.greeting} onChange={(event) => update({ greeting: event.target.value })} className="input-base text-xs" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Hold phrase</label>
          <input value={settings.holdPhrase} onChange={(event) => update({ holdPhrase: event.target.value })} className="input-base text-xs" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Max call length: {settings.maxCallLength} min</label>
          <input type="range" min={1} max={60} value={settings.maxCallLength} onChange={(event) => update({ maxCallLength: Number(event.target.value) })} className="w-full accent-primary" />
        </div>
        <ToggleRow title="AI disclosure" checked={settings.aiDisclosureEnabled} onChange={(value) => update({ aiDisclosureEnabled: value })} />
      </div>
    </div>
  );
}

function ToggleRow({
  title,
  checked,
  onChange,
}: {
  title: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
      <p className="text-xs text-foreground">{title}</p>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn("relative inline-flex h-5 w-9 items-center rounded-full transition-colors", checked ? "bg-primary" : "bg-muted")}
      >
        <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", checked ? "translate-x-4" : "translate-x-1")} />
      </button>
    </div>
  );
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
