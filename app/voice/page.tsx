"use client";

import { useState, useMemo } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Building2, Layers, Home,
  ChevronRight, Plus, Pencil, X, Trash2,
  GraduationCap, ShieldCheck, Briefcase,
  RotateCcw, Filter, Info,
} from "lucide-react";

/* ─── Constants ─── */

const VERTICALS = ["Conventional", "Student", "Affordable", "Commercial"] as const;

const VERTICAL_CONFIG: Record<string, { icon: typeof Building2; color: string; bgColor: string; description: string }> = {
  Conventional: { icon: Building2, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30", description: "Market-rate multifamily apartments" },
  Student: { icon: GraduationCap, color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950/30", description: "University and college housing" },
  Affordable: { icon: ShieldCheck, color: "text-rose-600", bgColor: "bg-rose-50 dark:bg-rose-950/30", description: "Income-restricted housing communities" },
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

const PROPERTY_AGENTS: Record<string, string[]> = {
  "Sunset Ridge Apartments": ["4", "7", "10", "1"],
  "The Reserve at Millcreek": ["4", "7", "1"],
  "Parkside Lofts": ["4", "10"],
  "University Commons": ["4", "7", "10", "1"],
  "Campus Edge": ["4", "10"],
  "Oakwood Terrace": ["4", "1", "10"],
  "Heritage Place": ["4", "1"],
  "Metro Business Center": ["4", "7"],
};

/* ─── Main Page ─── */

export default function VoicePage() {
  const voice = useVoice();
  const { agents } = useAgents();
  const [activeTab, setActiveTab] = useState("company");
  const [editingVertical, setEditingVertical] = useState<string | null>(null);
  const [propertyDialogOpen, setPropertyDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<string | null>(null);
  const [agentPropertyFilter, setAgentPropertyFilter] = useState<string>("__all__");

  const autonomousAgents = useMemo(
    () => agents.filter((a) => a.type === "autonomous"),
    [agents],
  );

  return (
    <>
          <p className="mb-6 text-sm text-muted-foreground">
            Control how your AI agents communicate through text channels like SMS, chat, and resident portal — set the persona, tone guidelines, and do&apos;s and don&apos;ts at every cascade level.
          </p>

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
                        rows={10}
                        className="input-base !h-auto min-h-[240px] resize-y"
                        placeholder="e.g. Professional and friendly. Always identify as an assistant for the property."
                      />
                      <p className="mt-1 text-xs text-muted-foreground">These guidelines apply as defaults across all agents and properties.</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-col gap-6">
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
                            {((override.doExamples?.length ?? 0) > 0 || (override.dontExamples?.length ?? 0) > 0) && (
                              <div className="flex gap-3 pt-1">
                                <span className="text-[10px] text-muted-foreground">
                                  Do&apos;s/Don&apos;ts: <span className="font-medium text-foreground">{override.doExamples?.length ?? 0}/{override.dontExamples?.length ?? 0}</span>
                                </span>
                              </div>
                            )}
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
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ── AGENT TUNING ── */}
            <TabsContent value="agents" className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Fine-tune how individual ELI+ agents communicate. Agent-level settings take the highest priority in the cascade.
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                  <select
                    value={agentPropertyFilter}
                    onChange={(e) => setAgentPropertyFilter(e.target.value)}
                    className="select-base h-9 min-w-[220px] text-sm"
                  >
                    <option value="__all__">All Properties</option>
                    {MOCK_PROPERTIES.map((p) => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(agentPropertyFilter === "__all__" ? MOCK_PROPERTIES : MOCK_PROPERTIES.filter((p) => p.name === agentPropertyFilter)).map((prop) => {
                const enabledAgentIds = PROPERTY_AGENTS[prop.name] ?? [];
                const verticalConfig = VERTICAL_CONFIG[prop.vertical];

                return (
                  <div key={prop.name} className="space-y-3">
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                      {verticalConfig && (() => {
                        const VIcon = verticalConfig.icon;
                        return (
                          <div className={cn("flex h-8 w-8 items-center justify-center rounded-md", verticalConfig.bgColor)}>
                            <VIcon className={cn("h-4 w-4", verticalConfig.color)} />
                          </div>
                        );
                      })()}
                      <div>
                        <p className="text-sm font-medium text-foreground">{prop.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {prop.vertical} · {prop.units} units · {enabledAgentIds.length} agent{enabledAgentIds.length !== 1 ? "s" : ""} enabled
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {enabledAgentIds.map((agentId) => {
                        const propertyTuning = voice.agentTuning.find(
                          (t) => t.agentId === agentId && t.propertyName === prop.name
                        );
                        const defaultTuning = voice.agentTuning.find(
                          (t) => t.agentId === agentId && !t.propertyName
                        );
                        const effectiveTuning = propertyTuning ?? defaultTuning;
                        const isInherited = !propertyTuning;
                        const agent = autonomousAgents.find((a) => a.id === agentId);

                        if (!effectiveTuning) return null;

                        return (
                          <AgentTuningCard
                            key={`${prop.name}-${agentId}`}
                            tuning={effectiveTuning}
                            agentStatus={agent?.status}
                            overrideLevel={isInherited ? "inherited" : "custom"}
                            propertyName={prop.name}
                            onUpdate={(updates) => {
                              if (isInherited) {
                                voice.addAgentTuning({
                                  ...effectiveTuning,
                                  ...updates,
                                  propertyName: prop.name,
                                });
                              } else {
                                voice.updateAgentTuning(agentId, updates, prop.name);
                              }
                            }}
                            onResetToDefault={!isInherited ? () => {
                              voice.removeAgentTuning(agentId, prop.name);
                            } : undefined}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
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
                  doExamples: voice.doExamples,
                  dontExamples: voice.dontExamples,
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

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Info className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[380px] p-0" align="end">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">How Settings Cascade</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Lower levels inherit from above and can override as needed.</p>
          </div>
          <div className="space-y-3 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Company Defaults</p>
                <p className="text-[11px] text-muted-foreground">The baseline. Persona, brand guidelines, and do&apos;s/don&apos;ts set here apply to every property and agent unless overridden below.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Vertical Overrides</p>
                <p className="text-[11px] text-muted-foreground">Customize by property type (Student, Affordable, etc.). Any field you set here replaces the company default for all properties in that vertical.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                <Home className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Property Overrides</p>
                <p className="text-[11px] text-muted-foreground">Fine-tune a specific property. Overrides both company and vertical settings. Properties without overrides continue to inherit.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/eli-cube.svg" alt="" width={14} height={14} className="shrink-0" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Agent Tuning</p>
                <p className="text-[11px] text-muted-foreground">The most specific level. Adjust tone, personality, and rules for a specific agent at a specific property. Agent settings take the highest priority.</p>
              </div>
            </div>
          </div>
          <div className="border-t border-border bg-muted/30 px-4 py-2.5">
            <p className="text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">Tip:</span> You only need to set what&apos;s different. Anything you don&apos;t override will automatically inherit from the level above.
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ─── Agent Tuning Card ─── */

function AgentTuningCard({
  tuning,
  agentStatus,
  overrideLevel = "default",
  propertyName,
  onUpdate,
  onResetToDefault,
}: {
  tuning: AgentVoiceTuning;
  agentStatus?: string;
  overrideLevel?: "default" | "inherited" | "custom";
  propertyName?: string;
  onUpdate: (updates: Partial<AgentVoiceTuning>) => void;
  onResetToDefault?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [tone, setTone] = useState(tuning.toneOverride ?? "");
  const [personality, setPersonality] = useState(tuning.personality ?? "");
  const [instructions, setInstructions] = useState(tuning.customInstructions ?? "");
  const [responseLength, setResponseLength] = useState(tuning.responseLength ?? "standard");
  const [allowEmoji, setAllowEmoji] = useState(tuning.allowEmoji ?? false);
  const [doExamples, setDoExamples] = useState<string[]>(tuning.doExamples ?? []);
  const [dontExamples, setDontExamples] = useState<string[]>(tuning.dontExamples ?? []);

  const handleSave = () => {
    onUpdate({
      toneOverride: tone,
      personality,
      customInstructions: instructions,
      responseLength: responseLength as AgentVoiceTuning["responseLength"],
      allowEmoji,
      doExamples,
      dontExamples,
    });
    setEditing(false);
  };

  const status = agentStatus || "Active";
  const isOff = status === "Off";
  const displayName = `ELI+ ${tuning.agentName}`;

  const levelBadge = {
    default: { label: "Default", className: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" },
    inherited: { label: "Inherited", className: "bg-muted text-muted-foreground" },
    custom: { label: "Custom", className: "bg-primary/10 text-primary" },
  }[overrideLevel];

  return (
    <Card className={cn(isOff && "opacity-70", overrideLevel === "custom" && "border-primary/30")}>
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
                <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-medium", levelBadge.className)}>
                  {levelBadge.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {tuning.toneOverride || "Using default tone"} · {tuning.responseLength ?? "standard"} responses
              </p>
              {propertyName && overrideLevel === "inherited" && (
                <p className="mt-0.5 text-[10px] text-muted-foreground italic">Using global defaults — customize to override for this property</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {!editing ? (
              <>
                {overrideLevel === "inherited" ? (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Plus className="h-3 w-3" /> Customize
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                )}
                {onResetToDefault && (
                  <Button variant="ghost" size="sm" onClick={() => setResetConfirmOpen(true)}>
                    <RotateCcw className="h-3 w-3" /> Reset
                  </Button>
                )}
              </>
            ) : (
              <div className="flex gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSave}>{overrideLevel === "inherited" ? "Create Override" : "Save"}</Button>
              </div>
            )}
          </div>
        </div>

        {onResetToDefault && (
          <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Reset agent tone & guidelines?</DialogTitle>
                <DialogDescription className="space-y-2 pt-1">
                  <span className="block">
                    This will remove all custom tone and guideline settings for <span className="font-medium text-foreground">{displayName}</span>{propertyName ? <> at <span className="font-medium text-foreground">{propertyName}</span></> : ""}.
                  </span>
                  <span className="block">
                    The agent will revert to inheriting settings from the {propertyName ? "property, vertical, or company" : "company"} level — whichever applies. Any custom tone overrides, personality, instructions, and do&apos;s/don&apos;ts you&apos;ve configured at this level will be permanently removed.
                  </span>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setResetConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    onResetToDefault();
                    setResetConfirmOpen(false);
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset to inherited
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

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
            {((tuning.doExamples && tuning.doExamples.length > 0) || (tuning.dontExamples && tuning.dontExamples.length > 0)) && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {tuning.doExamples && tuning.doExamples.length > 0 && (
                  <div className="rounded-md bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5">
                    <p className="mb-1.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">Do</p>
                    <ul className="space-y-1">
                      {tuning.doExamples.map((ex, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <span className="mt-0.5 text-emerald-600">&#10003;</span>
                          {ex}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {tuning.dontExamples && tuning.dontExamples.length > 0 && (
                  <div className="rounded-md bg-red-50/50 dark:bg-red-950/20 p-2.5">
                    <p className="mb-1.5 text-[10px] font-medium text-red-700 dark:text-red-400">Don&apos;t</p>
                    <ul className="space-y-1">
                      {tuning.dontExamples.map((ex, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <span className="mt-0.5 text-red-600">&#10007;</span>
                          {ex}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-3">
                <p className="mb-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">Do</p>
                <ul className="space-y-2">
                  {doExamples.map((ex, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 text-emerald-600">&#10003;</span>
                      <input
                        type="text"
                        value={ex}
                        onChange={(e) => { const next = [...doExamples]; next[i] = e.target.value; setDoExamples(next); }}
                        className="input-base h-7 flex-1 text-xs"
                      />
                      <button type="button" onClick={() => setDoExamples(doExamples.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
                <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs" onClick={() => setDoExamples([...doExamples, ""])}>
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="mb-2 text-xs font-medium text-red-700 dark:text-red-400">Don&apos;t</p>
                <ul className="space-y-2">
                  {dontExamples.map((ex, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 text-red-600">&#10007;</span>
                      <input
                        type="text"
                        value={ex}
                        onChange={(e) => { const next = [...dontExamples]; next[i] = e.target.value; setDontExamples(next); }}
                        className="input-base h-7 flex-1 text-xs"
                      />
                      <button type="button" onClick={() => setDontExamples(dontExamples.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
                <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs" onClick={() => setDontExamples([...dontExamples, ""])}>
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
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
  companyDefaults: { persona: string; brandingTone: string; doExamples: string[]; dontExamples: string[] };
  onClose: () => void;
  onSave: (updates: Partial<VerticalOverride>) => void;
}) {
  const [persona, setPersona] = useState(override.persona ?? companyDefaults.persona);
  const [brandingTone, setBrandingTone] = useState(override.brandingTone ?? companyDefaults.brandingTone);
  const [doExamples, setDoExamples] = useState<string[]>(override.doExamples ?? companyDefaults.doExamples);
  const [dontExamples, setDontExamples] = useState<string[]>(override.dontExamples ?? companyDefaults.dontExamples);

  const config = VERTICAL_CONFIG[vertical];
  const Icon = config?.icon || Building2;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
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
            <textarea value={brandingTone} onChange={(e) => setBrandingTone(e.target.value)} rows={8} className="input-base !h-auto min-h-[200px] resize-y text-sm" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <p className="mb-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">Do</p>
              <ul className="space-y-2">
                {doExamples.map((ex, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 text-emerald-600">&#10003;</span>
                    <input
                      type="text"
                      value={ex}
                      onChange={(e) => { const next = [...doExamples]; next[i] = e.target.value; setDoExamples(next); }}
                      className="input-base h-7 flex-1 text-xs"
                    />
                    <button type="button" onClick={() => setDoExamples(doExamples.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
              <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs" onClick={() => setDoExamples([...doExamples, ""])}>
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="mb-3 text-xs font-medium text-red-700 dark:text-red-400">Don&apos;t</p>
              <ul className="space-y-2">
                {dontExamples.map((ex, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 text-red-600">&#10007;</span>
                    <input
                      type="text"
                      value={ex}
                      onChange={(e) => { const next = [...dontExamples]; next[i] = e.target.value; setDontExamples(next); }}
                      className="input-base h-7 flex-1 text-xs"
                    />
                    <button type="button" onClick={() => setDontExamples(dontExamples.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
              <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs" onClick={() => setDontExamples([...dontExamples, ""])}>
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ persona, brandingTone, doExamples, dontExamples })}>
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
  const [doExamples, setDoExamples] = useState<string[]>(override?.doExamples ?? []);
  const [dontExamples, setDontExamples] = useState<string[]>(override?.dontExamples ?? []);

  const selectedProperty = MOCK_PROPERTIES.find((p) => p.name === property);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
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
            <textarea value={brandingTone} onChange={(e) => setBrandingTone(e.target.value)} rows={8} className="input-base !h-auto min-h-[200px] resize-y text-sm" placeholder="e.g. Upscale and sophisticated." />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <p className="mb-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">Do</p>
              <ul className="space-y-2">
                {doExamples.map((ex, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 text-emerald-600">&#10003;</span>
                    <input
                      type="text"
                      value={ex}
                      onChange={(e) => { const next = [...doExamples]; next[i] = e.target.value; setDoExamples(next); }}
                      className="input-base h-7 flex-1 text-xs"
                    />
                    <button type="button" onClick={() => setDoExamples(doExamples.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
              <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs" onClick={() => setDoExamples([...doExamples, ""])}>
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="mb-3 text-xs font-medium text-red-700 dark:text-red-400">Don&apos;t</p>
              <ul className="space-y-2">
                {dontExamples.map((ex, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 text-red-600">&#10007;</span>
                    <input
                      type="text"
                      value={ex}
                      onChange={(e) => { const next = [...dontExamples]; next[i] = e.target.value; setDontExamples(next); }}
                      className="input-base h-7 flex-1 text-xs"
                    />
                    <button type="button" onClick={() => setDontExamples(dontExamples.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
              <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs" onClick={() => setDontExamples([...dontExamples, ""])}>
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
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
              doExamples: doExamples.length > 0 ? doExamples : undefined,
              dontExamples: dontExamples.length > 0 ? dontExamples : undefined,
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
