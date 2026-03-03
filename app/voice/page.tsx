"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import {
  useVoice,
  type PhrasingRule,
  type PropertyOverride,
  type AgentVoiceTuning,
} from "@/lib/voice-context";
import { useAgents, AGENT_BUCKETS } from "@/lib/agents-context";
import { COMPLIANCE_ITEMS } from "@/lib/vault-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useContract } from "@/lib/contract-context";
import { ContractGate, R1ComingSoon } from "@/components/contract-overlay";
import {
  Palette, Radio, ShieldCheck, Building2, SlidersHorizontal,
  Plus, Trash2, X, AlertTriangle, Pencil, Lock,
} from "lucide-react";

const REGULATED_AREAS = ["Fair housing", "Screening", "Accommodation", "Lease terms", "Advertising"];
const PROPERTIES = ["Property A", "Property B", "Property C", "Property D"];
const CHANNELS = ["voice", "chat", "sms", "portal"] as const;
const CHANNEL_LABELS: Record<string, string> = { voice: "Voice (Phone)", chat: "Chat", sms: "SMS", portal: "Resident Portal" };

export default function VoicePage() {
  const voice = useVoice();
  const { agents } = useAgents();
  const autonomousAgents = useMemo(() => agents.filter((a) => a.type === "autonomous"), [agents]);

  const [activeTab, setActiveTab] = useState("brand");
  const [addRuleOpen, setAddRuleOpen] = useState(false);
  const [addOverrideOpen, setAddOverrideOpen] = useState(false);
  const [editingOverride, setEditingOverride] = useState<string | null>(null);

  const complianceRuleCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of voice.phrasingRules) {
      counts[r.area] = (counts[r.area] || 0) + 1;
    }
    return counts;
  }, [voice.phrasingRules]);

  return (
    <R1ComingSoon featureName="Voice & Brand" description="Configure your brand voice, tone, and communication style across all AI agents and channels.">
    <ContractGate featureName="Voice & Brand">
    <>
      <PageHeader
        title="Voice"
        description="How your AI agents talk and behave — branding, channels, compliance guardrails, and per-property or per-agent tuning."
      />

      {/* Unified vs per-property toggle */}
      <Card className="mb-6">
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div>
            <p className="text-sm font-medium text-foreground">Voice scope</p>
            <p className="text-xs text-muted-foreground">
              Use one voice across your portfolio, or customize per property.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant={voice.unified ? "default" : "outline"}
              size="sm"
              onClick={() => voice.update({ unified: true })}
            >
              Unified
            </Button>
            <Button
              variant={!voice.unified ? "default" : "outline"}
              size="sm"
              onClick={() => voice.update({ unified: false })}
            >
              Per-property
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="brand"><Palette className="mr-1.5 h-3.5 w-3.5" /> Brand & Tone</TabsTrigger>
          <TabsTrigger value="channels"><Radio className="mr-1.5 h-3.5 w-3.5" /> Channels</TabsTrigger>
          <TabsTrigger value="guardrails"><ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Compliance Guardrails</TabsTrigger>
          {!voice.unified && <TabsTrigger value="properties"><Building2 className="mr-1.5 h-3.5 w-3.5" /> Property Overrides</TabsTrigger>}
          <TabsTrigger value="agents"><SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" /> Agent Tuning</TabsTrigger>
        </TabsList>

        {/* ── BRAND & TONE ── */}
        <TabsContent value="brand" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Persona</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Agent persona</label>
                <input
                  type="text"
                  value={voice.persona}
                  onChange={(e) => voice.update({ persona: e.target.value })}
                  className="input-base"
                  placeholder="e.g. Helpful property assistant"
                />
                <p className="mt-1 text-xs text-muted-foreground">How the AI identifies itself in conversations.</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Branding & tone instructions</label>
                <textarea
                  value={voice.brandingTone}
                  onChange={(e) => voice.update({ brandingTone: e.target.value })}
                  rows={3}
                  className="input-base resize-y"
                  placeholder="e.g. Professional and friendly. Always identify as an assistant for the property."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Tone sliders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {([
                { key: "toneFormality" as const, label: "Formality", low: "Casual", high: "Formal" },
                { key: "toneWarmth" as const, label: "Warmth", low: "Neutral", high: "Warm" },
                { key: "toneUrgency" as const, label: "Urgency", low: "Relaxed", high: "Urgent" },
              ]).map(({ key, label, low, high }) => (
                <div key={key}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    <span className="text-xs text-muted-foreground">{voice[key]}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={voice[key]}
                    onChange={(e) => voice.update({ [key]: Number(e.target.value) })}
                    className="w-full accent-primary"
                  />
                  <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
                    <span>{low}</span>
                    <span>{high}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-emerald-700">Do</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {voice.doExamples.map((ex, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 text-emerald-600">✓</span>
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
                <CardTitle className="text-red-700">Don&apos;t</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {voice.dontExamples.map((ex, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 text-red-600">✗</span>
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

        {/* ── CHANNELS ── */}
        <TabsContent value="channels" className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Configure which communication channels are active and which agent handles each one.
          </p>
          {CHANNELS.map((ch) => {
            const enabled = voice.channels[ch];
            const settings = voice.channelSettings[ch] ?? {};
            return (
              <Card key={ch} className={cn(!enabled && "opacity-60")}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => voice.update({ channels: { ...voice.channels, [ch]: e.target.checked } })}
                          className="h-4 w-4 rounded border-border"
                        />
                        <span className="text-sm font-medium text-foreground">{CHANNEL_LABELS[ch]}</span>
                      </label>
                    </div>
                    {enabled && (
                      <select
                        value={voice.channelAgent[ch] ?? ""}
                        onChange={(e) => voice.update({ channelAgent: { ...voice.channelAgent, [ch]: e.target.value } })}
                        className="select-base h-8 w-44 text-sm"
                      >
                        {autonomousAgents.map((a) => (
                          <option key={a.id} value={a.name}>{a.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  {enabled && (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Greeting</label>
                        <input
                          type="text"
                          value={settings.greeting ?? ""}
                          onChange={(e) => voice.update({
                            channelSettings: { ...voice.channelSettings, [ch]: { ...settings, greeting: e.target.value } },
                          })}
                          className="input-base h-8 text-sm"
                          placeholder="e.g. Hi! How can I help you today?"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Sign-off</label>
                        <input
                          type="text"
                          value={settings.signoff ?? ""}
                          onChange={(e) => voice.update({
                            channelSettings: { ...voice.channelSettings, [ch]: { ...settings, signoff: e.target.value } },
                          })}
                          className="input-base h-8 text-sm"
                          placeholder="e.g. Thanks for reaching out!"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ── COMPLIANCE GUARDRAILS ── */}
        <TabsContent value="guardrails" className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Controlled phrasing rules ensure AI agents never misspeak in regulated areas. These feed directly into agent prompts as guardrails.
              </p>
            </div>
            <Button size="sm" onClick={() => setAddRuleOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Add rule
            </Button>
          </div>

          {/* Coverage by compliance area */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {REGULATED_AREAS.map((area) => {
              const count = complianceRuleCount[area] ?? 0;
              const linked = COMPLIANCE_ITEMS.some((c) => c.toLowerCase().includes(area.toLowerCase()));
              return (
                <div key={area} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={cn("h-4 w-4", count > 0 ? "text-emerald-600" : "text-muted-foreground")} />
                    <span className="text-sm font-medium text-foreground">{area}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {linked && <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">SOP linked</span>}
                    <span className="text-xs text-muted-foreground">{count} rule{count !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rules table */}
          <div className="overflow-x-auto">
            <table className="table-borderless w-full min-w-[600px]">
              <thead>
                <tr>
                  <th>Area</th>
                  <th>Type</th>
                  <th>Phrase</th>
                  <th>Replacement</th>
                  <th className="w-16">Actions</th>
                </tr>
              </thead>
              <tbody>
                {voice.phrasingRules.length === 0 ? (
                  <tr><td colSpan={5} className="text-sm text-muted-foreground">No phrasing rules yet.</td></tr>
                ) : (
                  voice.phrasingRules.map((rule) => (
                    <tr key={rule.id} className="table-row-hover">
                      <td>
                        <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{rule.area}</span>
                      </td>
                      <td>
                        <span className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          rule.type === "avoid" && "bg-red-50 text-red-700",
                          rule.type === "require" && "bg-emerald-50 text-emerald-700",
                          rule.type === "replace" && "bg-amber-50 text-amber-700",
                        )}>
                          {rule.type}
                        </span>
                      </td>
                      <td className="text-sm text-foreground">{rule.phrase}</td>
                      <td className="text-sm text-muted-foreground">{rule.replacement || "—"}</td>
                      <td>
                        <button type="button" onClick={() => voice.removePhrasingRule(rule.id)} className="text-muted-foreground hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── PROPERTY OVERRIDES ── */}
        {!voice.unified && (
          <TabsContent value="properties" className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Override the company defaults for specific properties. Only properties with overrides are listed below — all others use the default voice.
              </p>
              <Button size="sm" onClick={() => setAddOverrideOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Add override
              </Button>
            </div>

            {voice.propertyOverrides.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Building2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No property overrides. All properties use the default voice.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {voice.propertyOverrides.map((ov) => (
                  <Card key={ov.property}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">{ov.property}</h3>
                          {ov.persona && <p className="text-xs text-muted-foreground">Persona: {ov.persona}</p>}
                        </div>
                        <div className="flex gap-1.5">
                          <Button variant="ghost" size="sm" onClick={() => setEditingOverride(ov.property)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => voice.removePropertyOverride(ov.property)}>
                            <Trash2 className="h-3.5 w-3.5 text-red-600" />
                          </Button>
                        </div>
                      </div>
                      {ov.brandingTone && (
                        <p className="mt-2 text-sm text-foreground">{ov.brandingTone}</p>
                      )}
                      {ov.channels && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {CHANNELS.map((ch) => (
                            <span
                              key={ch}
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                                ov.channels?.[ch]
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {CHANNEL_LABELS[ch]}: {ov.channels?.[ch] ? "On" : "Off"}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* ── AGENT TUNING ── */}
        <TabsContent value="agents" className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Fine-tune how individual agents communicate. These settings override the company defaults for each specific agent.
          </p>

          {voice.agentTuning.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <SlidersHorizontal className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No agent-specific tuning configured.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {voice.agentTuning.map((tuning) => {
                const matchedAgent = agents.find((a) => String(a.id) === tuning.agentId);
                const agentType = matchedAgent?.type;
                return (
                  <AgentTuningCard
                    key={tuning.agentId}
                    tuning={tuning}
                    agentType={agentType}
                    onUpdate={(updates) => voice.updateAgentTuning(tuning.agentId, updates)}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add phrasing rule dialog */}
      {addRuleOpen && (
        <AddPhrasingRuleDialog
          onClose={() => setAddRuleOpen(false)}
          onAdd={(rule) => { voice.addPhrasingRule(rule); setAddRuleOpen(false); }}
        />
      )}

      {/* Add property override dialog */}
      {addOverrideOpen && (
        <AddPropertyOverrideDialog
          existingProperties={voice.propertyOverrides.map((o) => o.property)}
          onClose={() => setAddOverrideOpen(false)}
          onAdd={(ov) => { voice.addPropertyOverride(ov); setAddOverrideOpen(false); }}
        />
      )}

      {/* Edit property override dialog */}
      {editingOverride && (() => {
        const ov = voice.propertyOverrides.find((o) => o.property === editingOverride);
        if (!ov) return null;
        return (
          <EditPropertyOverrideDialog
            override={ov}
            onClose={() => setEditingOverride(null)}
            onSave={(updates) => { voice.updatePropertyOverride(editingOverride, updates); setEditingOverride(null); }}
          />
        );
      })()}
    </>
    </ContractGate>
    </R1ComingSoon>
  );
}

/* ── Agent Tuning Card ── */

function AgentTuningCard({
  tuning,
  agentType,
  onUpdate,
}: {
  tuning: AgentVoiceTuning;
  agentType?: string;
  onUpdate: (updates: Partial<AgentVoiceTuning>) => void;
}) {
  const { contracted } = useContract();
  const needsContract = !contracted && (agentType === "l4" || agentType === "l3");
  const [editing, setEditing] = useState(false);
  const [tone, setTone] = useState(tuning.toneOverride ?? "");
  const [personality, setPersonality] = useState(tuning.personality ?? "");
  const [instructions, setInstructions] = useState(tuning.customInstructions ?? "");
  const [responseLength, setResponseLength] = useState(tuning.responseLength ?? "standard");
  const [allowEmoji, setAllowEmoji] = useState(tuning.allowEmoji ?? false);

  const handleSave = () => {
    onUpdate({ toneOverride: tone, personality, customInstructions: instructions, responseLength: responseLength as AgentVoiceTuning["responseLength"], allowEmoji });
    setEditing(false);
  };

  if (needsContract) {
    return (
      <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-950/20">
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
              <Lock className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{tuning.agentName}</h3>
              <p className="text-xs text-muted-foreground">
                Enable ELI+ Agents to configure voice tuning for this agent.
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <Lock className="h-3 w-3" />
            Unlock ELI+ Agents
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{tuning.agentName}</h3>
            <p className="text-xs text-muted-foreground">
              {tuning.toneOverride || "Using default tone"} · {tuning.responseLength ?? "standard"} responses
            </p>
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
            {tuning.personality && <p><span className="font-medium text-foreground">Personality:</span> <span className="text-muted-foreground">{tuning.personality}</span></p>}
            {tuning.customInstructions && <p><span className="font-medium text-foreground">Instructions:</span> <span className="text-muted-foreground">{tuning.customInstructions}</span></p>}
            <div className="flex items-center gap-3">
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", tuning.allowEmoji ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground")}>
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
                <select value={responseLength} onChange={(e) => setResponseLength(e.target.value)} className="select-base h-8 text-sm">
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

/* ── Add Phrasing Rule Dialog ── */

function AddPhrasingRuleDialog({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (rule: Omit<PhrasingRule, "id">) => void;
}) {
  const [area, setArea] = useState(REGULATED_AREAS[0]);
  const [type, setType] = useState<PhrasingRule["type"]>("avoid");
  const [phrase, setPhrase] = useState("");
  const [replacement, setReplacement] = useState("");

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add phrasing rule</DialogTitle>
          <DialogDescription>Define a phrase to avoid, require, or replace in a regulated area.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Regulated area</label>
            <select value={area} onChange={(e) => setArea(e.target.value)} className="select-base w-full text-sm">
              {REGULATED_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Rule type</label>
            <select value={type} onChange={(e) => setType(e.target.value as PhrasingRule["type"])} className="select-base w-full text-sm">
              <option value="avoid">Avoid (never say this)</option>
              <option value="require">Require (always include)</option>
              <option value="replace">Replace (swap for alternative)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Phrase</label>
            <input type="text" value={phrase} onChange={(e) => setPhrase(e.target.value)} className="input-base text-sm" placeholder="e.g. tenant" />
          </div>
          {(type === "avoid" || type === "replace") && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Replacement {type === "avoid" ? "(optional)" : ""}</label>
              <input type="text" value={replacement} onChange={(e) => setReplacement(e.target.value)} className="input-base text-sm" placeholder="e.g. resident" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onAdd({ area, type, phrase, replacement: replacement || undefined })} disabled={!phrase.trim()}>Add rule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Add Property Override Dialog ── */

function AddPropertyOverrideDialog({
  existingProperties,
  onClose,
  onAdd,
}: {
  existingProperties: string[];
  onClose: () => void;
  onAdd: (override: PropertyOverride) => void;
}) {
  const available = PROPERTIES.filter((p) => !existingProperties.includes(p));
  const [property, setProperty] = useState(available[0] ?? "");
  const [brandingTone, setBrandingTone] = useState("");
  const [persona, setPersona] = useState("");

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add property override</DialogTitle>
          <DialogDescription>Customize voice settings for a specific property.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Property</label>
            <select value={property} onChange={(e) => setProperty(e.target.value)} className="select-base w-full text-sm">
              {available.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Persona override</label>
            <input type="text" value={persona} onChange={(e) => setPersona(e.target.value)} className="input-base text-sm" placeholder="e.g. Luxury concierge" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Branding & tone override</label>
            <textarea value={brandingTone} onChange={(e) => setBrandingTone(e.target.value)} rows={2} className="input-base resize-y text-sm" placeholder="e.g. Upscale and sophisticated." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onAdd({ property, brandingTone: brandingTone || undefined, persona: persona || undefined, channels: { voice: true, chat: true, sms: false, portal: true } })} disabled={!property}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Edit Property Override Dialog ── */

function EditPropertyOverrideDialog({
  override,
  onClose,
  onSave,
}: {
  override: PropertyOverride;
  onClose: () => void;
  onSave: (updates: Partial<PropertyOverride>) => void;
}) {
  const [brandingTone, setBrandingTone] = useState(override.brandingTone ?? "");
  const [persona, setPersona] = useState(override.persona ?? "");
  const [channels, setChannels] = useState(override.channels ?? { voice: true, chat: true, sms: false, portal: true });

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {override.property}</DialogTitle>
          <DialogDescription>Modify voice settings for this property.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Persona</label>
            <input type="text" value={persona} onChange={(e) => setPersona(e.target.value)} className="input-base text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Branding & tone</label>
            <textarea value={brandingTone} onChange={(e) => setBrandingTone(e.target.value)} rows={2} className="input-base resize-y text-sm" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Channels</label>
            <div className="flex flex-wrap gap-4">
              {CHANNELS.map((ch) => (
                <label key={ch} className="flex items-center gap-2">
                  <input type="checkbox" checked={channels[ch]} onChange={(e) => setChannels({ ...channels, [ch]: e.target.checked })} className="h-4 w-4 rounded border-border" />
                  <span className="text-sm text-foreground">{CHANNEL_LABELS[ch]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ brandingTone: brandingTone || undefined, persona: persona || undefined, channels })}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
