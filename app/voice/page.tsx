"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import {
  useVoice,
  type PropertyOverride,
  type AgentVoiceTuning,
  type VerticalOverride,
} from "@/lib/voice-context";
import { useAgents } from "@/lib/agents-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Building2, Layers, Home,
  ChevronRight, Plus, Pencil, X, Trash2,
  GraduationCap, Heart, Briefcase,
  RotateCcw,
} from "lucide-react";

/* ─── Constants ─── */

const VERTICALS = ["Conventional", "Student", "Affordable", "Commercial"] as const;

const VERTICAL_CONFIG: Record<string, { icon: typeof Building2; color: string; bgColor: string; description: string }> = {
  Conventional: { icon: Building2, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30", description: "Market-rate multifamily apartments" },
  Student: { icon: GraduationCap, color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950/30", description: "University and college housing" },
  Affordable: { icon: Heart, color: "text-rose-600", bgColor: "bg-rose-50 dark:bg-rose-950/30", description: "Income-restricted housing communities" },
  Commercial: { icon: Briefcase, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30", description: "Office and retail properties" },
};

const MOCK_PROPERTIES = [
  { name: "Sunset Ridge Apartments", vertical: "Conventional", units: 240 },
  { name: "The Reserve at Millcreek", vertical: "Conventional", units: 180 },
  { name: "Parkside Lofts", vertical: "Conventional", units: 96 },
  { name: "University Commons", vertical: "Student", units: 320 },
  { name: "Campus Edge", vertical: "Student", units: 200 },
  { name: "Oakwood Terrace", vertical: "Affordable", units: 150 },
  { name: "Heritage Place", vertical: "Affordable", units: 88 },
  { name: "Metro Business Center", vertical: "Commercial", units: 45 },
];


/* ─── Main Page ─── */

export default function VoicePage() {
  const voice = useVoice();
  const { agents } = useAgents();
  const [activeTab, setActiveTab] = useState("company");
  const [editingVertical, setEditingVertical] = useState<string | null>(null);
  const [propertyDialogOpen, setPropertyDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<string | null>(null);

  const autonomousAgents = useMemo(
    () => agents.filter((a) => a.type === "autonomous"),
    [agents],
  );

  return (
    <>
      <PageHeader
        title="Voice & Brand"
        description="Define how your AI agents communicate — set the tone, personality, and brand guidelines at every level from company-wide defaults down to individual agents."
      />

          <CascadeVisual activeLevel={activeTab} onLevelClick={setActiveTab} />

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="company">Company Defaults</TabsTrigger>
              <TabsTrigger value="verticals">Verticals</TabsTrigger>
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="agents">Agent Tuning</TabsTrigger>
            </TabsList>

            {/* ── COMPANY DEFAULTS ── */}
            <TabsContent value="company" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Brand Identity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">AI Persona</label>
                      <input
                        type="text"
                        value={voice.persona}
                        onChange={(e) => voice.update({ persona: e.target.value })}
                        className="input-base"
                        placeholder="e.g. Helpful property assistant"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">How your AI agents identify themselves in conversations.</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">Brand & Tone Guidelines</label>
                      <textarea
                        value={voice.brandingTone}
                        onChange={(e) => voice.update({ brandingTone: e.target.value })}
                        rows={6}
                        className="input-base resize-y"
                        placeholder="e.g. Professional and friendly. Always identify as an assistant for the property."
                      />
                      <p className="mt-1 text-xs text-muted-foreground">These guidelines apply as defaults across all agents and properties.</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Tone Profile</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <ToneSliders
                      formality={voice.toneFormality}
                      warmth={voice.toneWarmth}
                      urgency={voice.toneUrgency}
                      onChange={(key, value) => voice.update({ [key]: value })}
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-emerald-700 dark:text-emerald-400">Do</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {voice.doExamples.map((ex, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="mt-0.5 text-emerald-600">&#10003;</span>
                          <input
                            type="text"
                            value={ex}
                            onChange={(e) => {
                              const next = [...voice.doExamples];
                              next[i] = e.target.value;
                              voice.update({ doExamples: next });
                            }}
                            className="input-base h-8 flex-1 text-sm"
                          />
                          <button type="button" onClick={() => voice.update({ doExamples: voice.doExamples.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-foreground">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => voice.update({ doExamples: [...voice.doExamples, ""] })}>
                      <Plus className="h-3.5 w-3.5" /> Add
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-red-700 dark:text-red-400">Don&apos;t</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {voice.dontExamples.map((ex, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="mt-0.5 text-red-600">&#10007;</span>
                          <input
                            type="text"
                            value={ex}
                            onChange={(e) => {
                              const next = [...voice.dontExamples];
                              next[i] = e.target.value;
                              voice.update({ dontExamples: next });
                            }}
                            className="input-base h-8 flex-1 text-sm"
                          />
                          <button type="button" onClick={() => voice.update({ dontExamples: voice.dontExamples.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-foreground">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => voice.update({ dontExamples: [...voice.dontExamples, ""] })}>
                      <Plus className="h-3.5 w-3.5" /> Add
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── VERTICALS ── */}
            <TabsContent value="verticals" className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Customize voice and tone for different property types. Vertical-level settings override company defaults for all properties within that vertical.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                {VERTICALS.map((v) => {
                  const config = VERTICAL_CONFIG[v];
                  const override = voice.verticalOverrides.find((o) => o.vertical === v);
                  const Icon = config.icon;
                  const propertyCount = MOCK_PROPERTIES.filter((p) => p.vertical === v).length;

                  return (
                    <Card key={v} className={cn("transition-colors", override?.enabled && "border-primary/30")}>
                      <CardContent className="py-5">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", config.bgColor)}>
                              <Icon className={cn("h-5 w-5", config.color)} />
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-foreground">{v}</h3>
                              <p className="text-xs text-muted-foreground">{config.description}</p>
                              <p className="mt-1 text-[10px] text-muted-foreground">{propertyCount} {propertyCount === 1 ? "property" : "properties"}</p>
                            </div>
                          </div>
                          <Badge variant={override?.enabled ? "default" : "secondary"} className="text-[10px]">
                            {override?.enabled ? "Custom" : "Inherited"}
                          </Badge>
                        </div>

                        {override?.enabled ? (
                          <div className="mt-4 space-y-2 rounded-lg bg-muted/50 p-3">
                            <p className="text-xs">
                              <span className="font-medium text-foreground">Persona:</span>{" "}
                              <span className="text-muted-foreground">{override.persona || "—"}</span>
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{override.brandingTone || "—"}</p>
                            <div className="flex gap-3 pt-1">
                              {[
                                { label: "Formality", value: override.toneFormality },
                                { label: "Warmth", value: override.toneWarmth },
                                { label: "Urgency", value: override.toneUrgency },
                              ].map(({ label, value }) => (
                                <span key={label} className="text-[10px] text-muted-foreground">
                                  {label}: <span className="font-medium text-foreground">{value ?? "—"}%</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="mt-4 text-xs italic text-muted-foreground">
                            Inherits all settings from company defaults.
                          </p>
                        )}

                        <div className="mt-4 flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingVertical(v)}>
                            {override?.enabled ? (
                              <><Pencil className="h-3 w-3" /> Edit</>
                            ) : (
                              <><Plus className="h-3 w-3" /> Customize</>
                            )}
                          </Button>
                          {override?.enabled && (
                            <Button variant="ghost" size="sm" onClick={() => voice.resetVerticalOverride(v)}>
                              <RotateCcw className="h-3 w-3" /> Reset
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* ── PROPERTIES ── */}
            <TabsContent value="properties" className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  Override voice settings for individual properties. Properties without overrides inherit from their vertical or company defaults.
                </p>
                <Button size="sm" onClick={() => { setEditingProperty(null); setPropertyDialogOpen(true); }}>
                  <Plus className="h-3.5 w-3.5" /> Add override
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="table-borderless w-full min-w-[600px]">
                  <thead>
                    <tr>
                      <th>Property</th>
                      <th>Vertical</th>
                      <th>Voice Source</th>
                      <th className="w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_PROPERTIES.map((prop) => {
                      const override = voice.propertyOverrides.find((o) => o.property === prop.name);
                      const verticalOverride = voice.verticalOverrides.find((v) => v.vertical === prop.vertical && v.enabled);
                      const source = override
                        ? "Custom"
                        : verticalOverride
                          ? `Vertical: ${prop.vertical}`
                          : "Company Default";
                      const config = VERTICAL_CONFIG[prop.vertical];

                      return (
                        <tr key={prop.name} className="table-row-hover">
                          <td>
                            <div>
                              <p className="text-sm font-medium text-foreground">{prop.name}</p>
                              <p className="text-[10px] text-muted-foreground">{prop.units} units</p>
                            </div>
                          </td>
                          <td>
                            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", config?.bgColor, config?.color)}>
                              {prop.vertical}
                            </span>
                          </td>
                          <td>
                            <span className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
                              override ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                            )}>
                              {source}
                            </span>
                          </td>
                          <td>
                            <div className="flex gap-1">
                              {override ? (
                                <>
                                  <button type="button" onClick={() => { setEditingProperty(prop.name); setPropertyDialogOpen(true); }} className="text-muted-foreground hover:text-foreground">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button type="button" onClick={() => voice.removePropertyOverride(prop.name)} className="text-muted-foreground hover:text-red-600">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              ) : (
                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditingProperty(prop.name); setPropertyDialogOpen(true); }}>
                                  Customize
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {voice.propertyOverrides.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Active Overrides</h3>
                  {voice.propertyOverrides.map((ov) => {
                    const config = ov.vertical ? VERTICAL_CONFIG[ov.vertical] : undefined;
                    return (
                      <Card key={ov.property} className="border-primary/20">
                        <CardContent className="py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold text-foreground">{ov.property}</h4>
                                {ov.vertical && config && (
                                  <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-medium", config.bgColor, config.color)}>
                                    {ov.vertical}
                                  </span>
                                )}
                              </div>
                              {ov.persona && <p className="mt-0.5 text-xs text-muted-foreground">Persona: {ov.persona}</p>}
                            </div>
                            <div className="flex gap-1.5">
                              <Button variant="ghost" size="sm" onClick={() => { setEditingProperty(ov.property); setPropertyDialogOpen(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => voice.removePropertyOverride(ov.property)}>
                                <Trash2 className="h-3.5 w-3.5 text-red-600" />
                              </Button>
                            </div>
                          </div>
                          {ov.brandingTone && <p className="mt-2 text-sm text-muted-foreground">{ov.brandingTone}</p>}
                          {(ov.toneFormality !== undefined || ov.toneWarmth !== undefined || ov.toneUrgency !== undefined) && (
                            <div className="mt-2 flex gap-4">
                              {ov.toneFormality !== undefined && (
                                <span className="text-[10px] text-muted-foreground">Formality: <span className="font-medium text-foreground">{ov.toneFormality}%</span></span>
                              )}
                              {ov.toneWarmth !== undefined && (
                                <span className="text-[10px] text-muted-foreground">Warmth: <span className="font-medium text-foreground">{ov.toneWarmth}%</span></span>
                              )}
                              {ov.toneUrgency !== undefined && (
                                <span className="text-[10px] text-muted-foreground">Urgency: <span className="font-medium text-foreground">{ov.toneUrgency}%</span></span>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ── AGENT TUNING ── */}
            <TabsContent value="agents" className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Fine-tune how individual ELI+ agents communicate. Agent-level settings take the highest priority in the cascade, overriding company, vertical, and property defaults.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                {voice.agentTuning.map((tuning) => {
                  const agent = autonomousAgents.find((a) => a.id === tuning.agentId);
                  return (
                    <AgentTuningCard
                      key={tuning.agentId}
                      tuning={tuning}
                      agentStatus={agent?.status}
                      onUpdate={(updates) => voice.updateAgentTuning(tuning.agentId, updates)}
                    />
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>

          {/* Vertical Edit Dialog */}
          {editingVertical && (() => {
            const override = voice.verticalOverrides.find((v) => v.vertical === editingVertical);
            return (
              <VerticalEditDialog
                vertical={editingVertical}
                override={override ?? { vertical: editingVertical, enabled: false }}
                companyDefaults={{
                  persona: voice.persona,
                  brandingTone: voice.brandingTone,
                  toneFormality: voice.toneFormality,
                  toneWarmth: voice.toneWarmth,
                  toneUrgency: voice.toneUrgency,
                }}
                onClose={() => setEditingVertical(null)}
                onSave={(updates) => {
                  voice.updateVerticalOverride(editingVertical, { ...updates, enabled: true });
                  setEditingVertical(null);
                }}
              />
            );
          })()}

          {/* Property Override Dialog */}
          {propertyDialogOpen && (() => {
            const existing = editingProperty
              ? voice.propertyOverrides.find((o) => o.property === editingProperty)
              : undefined;
            return (
              <PropertyOverrideDialog
                override={existing}
                preselectedProperty={editingProperty}
                existingProperties={voice.propertyOverrides.map((o) => o.property)}
                onClose={() => { setPropertyDialogOpen(false); setEditingProperty(null); }}
                onSave={(data) => {
                  if (existing) {
                    voice.updatePropertyOverride(editingProperty!, data);
                  } else {
                    voice.addPropertyOverride(data as PropertyOverride);
                  }
                  setPropertyDialogOpen(false);
                  setEditingProperty(null);
                }}
              />
            );
          })()}
    </>
  );
}

/* ─── Cascade Visualization ─── */

function CascadeVisual({ activeLevel, onLevelClick }: { activeLevel: string; onLevelClick: (level: string) => void }) {
  const levels = [
    { id: "company", label: "Company", desc: "Portfolio defaults", icon: Building2 },
    { id: "verticals", label: "Vertical", desc: "By property type", icon: Layers },
    { id: "properties", label: "Property", desc: "Individual overrides", icon: Home },
    { id: "agents", label: "Agent", desc: "Per-agent tuning", icon: null },
  ];

  return (
    <div className="mb-6 flex items-center gap-1 overflow-x-auto pb-1">
      {levels.map((level, i) => {
        const Icon = level.icon;
        const isActive = activeLevel === level.id;
        return (
          <div key={level.id} className="flex items-center">
            <button
              type="button"
              onClick={() => onLevelClick(level.id)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border px-4 py-2.5 transition-all",
                isActive
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/30 hover:bg-muted/50",
              )}
            >
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md",
                isActive ? "bg-primary/10" : "bg-muted",
              )}>
                {level.id === "agents" ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src="/eli-cube.svg" alt="" width={18} height={18} className="shrink-0" />
                ) : Icon ? (
                  <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                ) : null}
              </div>
              <div className="text-left">
                <p className={cn("text-sm font-medium", isActive ? "text-primary" : "text-foreground")}>{level.label}</p>
                <p className="text-[10px] text-muted-foreground">{level.desc}</p>
              </div>
            </button>
            {i < levels.length - 1 && (
              <ChevronRight className="mx-1 h-4 w-4 shrink-0 text-muted-foreground/50" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Tone Sliders (reusable) ─── */

function ToneSliders({
  formality,
  warmth,
  urgency,
  onChange,
  disabled,
}: {
  formality: number;
  warmth: number;
  urgency: number;
  onChange: (key: string, value: number) => void;
  disabled?: boolean;
}) {
  const sliders = [
    { key: "toneFormality", label: "Formality", value: formality, low: "Casual", high: "Formal" },
    { key: "toneWarmth", label: "Warmth", value: warmth, low: "Neutral", high: "Warm" },
    { key: "toneUrgency", label: "Urgency", value: urgency, low: "Relaxed", high: "Urgent" },
  ];

  return (
    <>
      {sliders.map(({ key, label, value, low, high }) => (
        <div key={key}>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{label}</span>
            <span className="text-xs text-muted-foreground">{value}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={value}
            onChange={(e) => onChange(key, Number(e.target.value))}
            className="w-full accent-primary"
            disabled={disabled}
          />
          <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
            <span>{low}</span>
            <span>{high}</span>
          </div>
        </div>
      ))}
    </>
  );
}

/* ─── Agent Tuning Card ─── */

function AgentTuningCard({
  tuning,
  agentStatus,
  onUpdate,
}: {
  tuning: AgentVoiceTuning;
  agentStatus?: string;
  onUpdate: (updates: Partial<AgentVoiceTuning>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [tone, setTone] = useState(tuning.toneOverride ?? "");
  const [personality, setPersonality] = useState(tuning.personality ?? "");
  const [instructions, setInstructions] = useState(tuning.customInstructions ?? "");
  const [responseLength, setResponseLength] = useState(tuning.responseLength ?? "standard");
  const [allowEmoji, setAllowEmoji] = useState(tuning.allowEmoji ?? false);

  const handleSave = () => {
    onUpdate({
      toneOverride: tone,
      personality,
      customInstructions: instructions,
      responseLength: responseLength as AgentVoiceTuning["responseLength"],
      allowEmoji,
    });
    setEditing(false);
  };

  const status = agentStatus || "Active";
  const isOff = status === "Off";
  const displayName = `ELI+ ${tuning.agentName}`;

  return (
    <Card className={cn(isOff && "opacity-70")}>
      <CardContent className="py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/eli-cube.svg" alt="" width={22} height={22} className="shrink-0" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">{displayName}</h3>
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[9px] font-medium",
                  isOff ? "bg-muted text-muted-foreground" : "bg-[#B3FFCC] text-green-800",
                )}>
                  {status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {tuning.toneOverride || "Using default tone"} · {tuning.responseLength ?? "standard"} responses
              </p>
            </div>
          </div>
          {!editing ? (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          ) : (
            <div className="flex gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave}>Save</Button>
            </div>
          )}
        </div>

        {!editing ? (
          <div className="mt-3 space-y-2 text-sm">
            {tuning.personality && (
              <p><span className="font-medium text-foreground">Personality:</span> <span className="text-muted-foreground">{tuning.personality}</span></p>
            )}
            {tuning.customInstructions && (
              <p><span className="font-medium text-foreground">Instructions:</span> <span className="text-muted-foreground">{tuning.customInstructions}</span></p>
            )}
            <div className="flex items-center gap-3">
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                tuning.allowEmoji ? "bg-[#B3FFCC] text-black" : "bg-muted text-muted-foreground",
              )}>
                Emoji: {tuning.allowEmoji ? "On" : "Off"}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Tone override</label>
              <input type="text" value={tone} onChange={(e) => setTone(e.target.value)} className="input-base h-8 text-sm" placeholder="e.g. Enthusiastic and sales-oriented" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Personality</label>
              <input type="text" value={personality} onChange={(e) => setPersonality(e.target.value)} className="input-base h-8 text-sm" placeholder="e.g. Excited about helping people find their new home" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Custom instructions</label>
              <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} className="input-base resize-y text-sm" placeholder="e.g. Always mention current specials." />
            </div>
            <div className="flex items-center gap-6">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Response length</label>
                <select value={responseLength} onChange={(e) => setResponseLength(e.target.value as "concise" | "standard" | "detailed")} className="select-base h-8 text-sm">
                  <option value="concise">Concise</option>
                  <option value="standard">Standard</option>
                  <option value="detailed">Detailed</option>
                </select>
              </div>
              <label className="flex items-center gap-2 pt-4">
                <input type="checkbox" checked={allowEmoji} onChange={(e) => setAllowEmoji(e.target.checked)} className="h-4 w-4 rounded border-border" />
                <span className="text-sm text-foreground">Allow emoji</span>
              </label>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Vertical Edit Dialog ─── */

function VerticalEditDialog({
  vertical,
  override,
  companyDefaults,
  onClose,
  onSave,
}: {
  vertical: string;
  override: VerticalOverride;
  companyDefaults: { persona: string; brandingTone: string; toneFormality: number; toneWarmth: number; toneUrgency: number };
  onClose: () => void;
  onSave: (updates: Partial<VerticalOverride>) => void;
}) {
  const [persona, setPersona] = useState(override.persona ?? companyDefaults.persona);
  const [brandingTone, setBrandingTone] = useState(override.brandingTone ?? companyDefaults.brandingTone);
  const [toneFormality, setToneFormality] = useState(override.toneFormality ?? companyDefaults.toneFormality);
  const [toneWarmth, setToneWarmth] = useState(override.toneWarmth ?? companyDefaults.toneWarmth);
  const [toneUrgency, setToneUrgency] = useState(override.toneUrgency ?? companyDefaults.toneUrgency);

  const config = VERTICAL_CONFIG[vertical];
  const Icon = config?.icon || Building2;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", config?.bgColor)}>
              <Icon className={cn("h-4 w-4", config?.color)} />
            </div>
            <div>
              <DialogTitle>Customize {vertical} Voice</DialogTitle>
              <DialogDescription>{config?.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Persona</label>
            <input type="text" value={persona} onChange={(e) => setPersona(e.target.value)} className="input-base text-sm" placeholder="e.g. Friendly campus guide" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Brand & Tone Guidelines</label>
            <textarea value={brandingTone} onChange={(e) => setBrandingTone(e.target.value)} rows={3} className="input-base resize-y text-sm" />
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="mb-3 text-xs font-medium text-foreground">Tone Profile</p>
            <ToneSliders
              formality={toneFormality}
              warmth={toneWarmth}
              urgency={toneUrgency}
              onChange={(key, value) => {
                if (key === "toneFormality") setToneFormality(value);
                else if (key === "toneWarmth") setToneWarmth(value);
                else if (key === "toneUrgency") setToneUrgency(value);
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ persona, brandingTone, toneFormality, toneWarmth, toneUrgency })}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Property Override Dialog ─── */

function PropertyOverrideDialog({
  override,
  preselectedProperty,
  existingProperties,
  onClose,
  onSave,
}: {
  override?: PropertyOverride;
  preselectedProperty?: string | null;
  existingProperties: string[];
  onClose: () => void;
  onSave: (data: PropertyOverride | Partial<PropertyOverride>) => void;
}) {
  const isEditing = !!override;
  const available = MOCK_PROPERTIES.filter((p) => !existingProperties.includes(p.name) || p.name === override?.property || p.name === preselectedProperty);
  const [property, setProperty] = useState(override?.property ?? preselectedProperty ?? available[0]?.name ?? "");
  const [persona, setPersona] = useState(override?.persona ?? "");
  const [brandingTone, setBrandingTone] = useState(override?.brandingTone ?? "");
  const [toneFormality, setToneFormality] = useState(override?.toneFormality ?? 65);
  const [toneWarmth, setToneWarmth] = useState(override?.toneWarmth ?? 75);
  const [toneUrgency, setToneUrgency] = useState(override?.toneUrgency ?? 40);

  const selectedProperty = MOCK_PROPERTIES.find((p) => p.name === property);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit ${override.property}` : "Add Property Override"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modify voice settings for this property."
              : "Customize voice settings for a specific property. This overrides vertical and company defaults."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isEditing && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Property</label>
              <select value={property} onChange={(e) => setProperty(e.target.value)} className="select-base w-full text-sm">
                {available.map((p) => (
                  <option key={p.name} value={p.name}>{p.name} ({p.vertical})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Persona override</label>
            <input type="text" value={persona} onChange={(e) => setPersona(e.target.value)} className="input-base text-sm" placeholder="e.g. Luxury concierge" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Brand & tone override</label>
            <textarea value={brandingTone} onChange={(e) => setBrandingTone(e.target.value)} rows={3} className="input-base resize-y text-sm" placeholder="e.g. Upscale and sophisticated." />
          </div>

          <div className="rounded-lg border border-border p-4">
            <p className="mb-3 text-xs font-medium text-foreground">Tone Profile</p>
            <ToneSliders
              formality={toneFormality}
              warmth={toneWarmth}
              urgency={toneUrgency}
              onChange={(key, value) => {
                if (key === "toneFormality") setToneFormality(value);
                else if (key === "toneWarmth") setToneWarmth(value);
                else if (key === "toneUrgency") setToneUrgency(value);
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onSave({
              property,
              vertical: selectedProperty?.vertical,
              persona: persona || undefined,
              brandingTone: brandingTone || undefined,
              toneFormality,
              toneWarmth,
              toneUrgency,
            })}
            disabled={!property}
          >
            {isEditing ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
