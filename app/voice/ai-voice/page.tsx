"use client";

import { useState, useMemo } from "react";
import {
  useVoice,
  NOVA2_VOICES,
  DEFAULT_NOVA2_VOICE_ID,
  getNova2Voice,
  getNova2VoicesByGender,
  type VoiceSettings,
  type AgentVoiceTuning,
} from "@/lib/voice-context";
import { useAgents } from "@/lib/agents-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Building2, Layers, Home, ChevronRight, ChevronDown, ChevronUp,
  Info, Phone, Volume2, Globe, ShieldCheck, Pencil, RotateCcw,
  GraduationCap, Briefcase, Filter, Plus, X,
} from "lucide-react";

// Voice catalog comes from `NOVA2_VOICES` in lib/voice-context. The catalog is
// filtered by the currently-selected gender so users only see voices that
// match their persona choice.

const ALL_LANGUAGES = ["English", "Spanish", "French", "German", "Italian", "Portuguese", "Hindi"];

const LANGUAGE_FLAGS: Record<string, string> = {
  English: "🇺🇸", Spanish: "🇪🇸", French: "🇫🇷", German: "🇩🇪",
  Italian: "🇮🇹", Portuguese: "🇧🇷", Hindi: "🇮🇳",
};

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

export default function AIVoicePage() {
  const voice = useVoice();
  const { agents } = useAgents();
  const [activeTab, setActiveTab] = useState("company");
  const [agentPropertyFilter, setAgentPropertyFilter] = useState<string>("__all__");
  const vs = voice.voiceSettings;

  const autonomousAgents = useMemo(
    () => agents.filter((a) => a.type === "autonomous"),
    [agents],
  );

  const updateVS = (updates: Partial<VoiceSettings>) => {
    voice.update({ voiceSettings: { ...vs, ...updates } });
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTarget, setDialogTarget] = useState<{ type: "vertical" | "property"; name: string; vertical?: string } | null>(null);
  const [dialogGender, setDialogGender] = useState<"female" | "male">("female");
  const [dialogAccent, setDialogAccent] = useState<string>(DEFAULT_NOVA2_VOICE_ID.female);
  const [dialogLanguages, setDialogLanguages] = useState<string[]>(["English"]);
  const [dialogAutoDetect, setDialogAutoDetect] = useState(false);
  const [dialogRecordAudio, setDialogRecordAudio] = useState(false);
  const [dialogGenerateTranscripts, setDialogGenerateTranscripts] = useState(false);
  const [dialogLegalEnabled, setDialogLegalEnabled] = useState(false);
  const [dialogLegalText, setDialogLegalText] = useState("");
  const [dialogGreeting, setDialogGreeting] = useState("");
  const [dialogHoldPhrase, setDialogHoldPhrase] = useState("");
  const [dialogMaxCallLength, setDialogMaxCallLength] = useState(15);
  const [dialogAiDisclosure, setDialogAiDisclosure] = useState(false);

  const openOverrideDialog = (type: "vertical" | "property", name: string, currentOverride?: Partial<VoiceSettings>, vertical?: string) => {
    setDialogTarget({ type, name, vertical });
    setDialogGender(currentOverride?.voiceGender ?? vs.voiceGender);
    setDialogAccent(currentOverride?.voiceAccent ?? vs.voiceAccent);
    setDialogLanguages(currentOverride?.voiceLanguages ?? [...vs.voiceLanguages]);
    setDialogAutoDetect(currentOverride?.autoDetectLanguage ?? vs.autoDetectLanguage);
    setDialogRecordAudio(currentOverride?.recordAudio ?? vs.recordAudio);
    setDialogGenerateTranscripts(currentOverride?.generateTranscripts ?? vs.generateTranscripts);
    setDialogLegalEnabled(currentOverride?.legalDisclosureEnabled ?? vs.legalDisclosureEnabled);
    setDialogLegalText(currentOverride?.legalDisclosureText ?? vs.legalDisclosureText);
    setDialogGreeting(currentOverride?.greeting ?? vs.greeting);
    setDialogHoldPhrase(currentOverride?.holdPhrase ?? vs.holdPhrase);
    setDialogMaxCallLength(currentOverride?.maxCallLength ?? vs.maxCallLength);
    setDialogAiDisclosure(currentOverride?.aiDisclosureEnabled ?? vs.aiDisclosureEnabled);
    setDialogOpen(true);
  };

  const handleDialogSave = () => {
    if (!dialogTarget) return;
    const newVoice: Partial<VoiceSettings> = {
      voiceGender: dialogGender,
      voiceAccent: dialogAccent,
      voiceLanguages: dialogLanguages,
      autoDetectLanguage: dialogAutoDetect,
      recordAudio: dialogRecordAudio,
      generateTranscripts: dialogGenerateTranscripts,
      legalDisclosureEnabled: dialogLegalEnabled,
      legalDisclosureText: dialogLegalText,
      greeting: dialogGreeting,
      holdPhrase: dialogHoldPhrase,
      maxCallLength: dialogMaxCallLength,
      aiDisclosureEnabled: dialogAiDisclosure,
    };
    if (dialogTarget.type === "vertical") {
      voice.updateVerticalOverride(dialogTarget.name, { voiceSettings: newVoice, enabled: true });
    } else {
      const existing = voice.propertyOverrides.find((o) => o.property === dialogTarget.name);
      if (existing) {
        voice.updatePropertyOverride(dialogTarget.name, { voiceSettings: newVoice });
      } else {
        voice.addPropertyOverride({ property: dialogTarget.name, vertical: dialogTarget.vertical, voiceSettings: newVoice });
      }
    }
    setDialogOpen(false);
  };

  return (
    <>
      <p className="mb-6 text-sm text-muted-foreground">
        Configure how your AI sounds on the phone — choose a voice, accent, languages, and call settings at every cascade level.
      </p>

      <VoiceCascadeVisual activeLevel={activeTab} onLevelClick={setActiveTab} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsContent value="company" className="space-y-8 pb-12">
          <CompanyVoiceSettings settings={vs} onUpdate={updateVS} />
        </TabsContent>

        <TabsContent value="verticals" className="space-y-6 pb-12">
          <p className="text-sm text-muted-foreground">
            Override voice settings for different property types. Vertical-level settings override company defaults for all properties within that vertical.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {VERTICALS.map((v) => {
              const config = VERTICAL_CONFIG[v];
              const override = voice.verticalOverrides.find((o) => o.vertical === v);
              const hasVoice = override?.voiceSettings && Object.keys(override.voiceSettings).length > 0;
              const Icon = config.icon;

              return (
                <Card key={v} className={cn("transition-colors", hasVoice && "border-primary/30")}>
                  <CardContent className="py-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", config.bgColor)}>
                          <Icon className={cn("h-5 w-5", config.color)} />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">{v}</h3>
                          <p className="text-xs text-muted-foreground">{config.description}</p>
                        </div>
                      </div>
                      <Badge variant={hasVoice ? "default" : "secondary"} className="text-[10px]">
                        {hasVoice ? "Custom" : "Inherited"}
                      </Badge>
                    </div>
                    {hasVoice && override?.voiceSettings ? (
                      <div className="mt-4 space-y-1 rounded-lg bg-muted/50 p-3">
                        {override.voiceSettings.voiceGender && (
                          <p className="text-xs"><span className="font-medium text-foreground">Gender:</span> <span className="text-muted-foreground capitalize">{override.voiceSettings.voiceGender}</span></p>
                        )}
                        {override.voiceSettings.voiceAccent && (
                          <p className="text-xs"><span className="font-medium text-foreground">Voice:</span> <span className="text-muted-foreground">{getNova2Voice(override.voiceSettings.voiceAccent)?.label ?? override.voiceSettings.voiceAccent}</span></p>
                        )}
                        {override.voiceSettings.voiceLanguages && override.voiceSettings.voiceLanguages.length > 0 && (
                          <p className="text-xs"><span className="font-medium text-foreground">Languages:</span> <span className="text-muted-foreground">{override.voiceSettings.voiceLanguages.join(", ")}</span></p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-4 text-xs italic text-muted-foreground">Inherits voice settings from company defaults.</p>
                    )}
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openOverrideDialog("vertical", v, override?.voiceSettings)}>
                        <Pencil className="h-3 w-3" /> {hasVoice ? "Edit" : "Customize"}
                      </Button>
                      {hasVoice && (
                        <Button variant="ghost" size="sm" onClick={() => {
                          voice.updateVerticalOverride(v, { voiceSettings: undefined });
                        }}>
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

        <TabsContent value="properties" className="space-y-6 pb-12">
          <p className="text-sm text-muted-foreground">
            Override voice settings for individual properties. Properties without overrides inherit from their vertical or company defaults.
          </p>
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
                  const hasVoice = override?.voiceSettings && Object.keys(override.voiceSettings).length > 0;
                  const verticalOverride = voice.verticalOverrides.find((v) => v.vertical === prop.vertical && v.enabled && v.voiceSettings);
                  const source = hasVoice ? "Custom" : verticalOverride ? `Vertical: ${prop.vertical}` : "Company Default";
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
                          hasVoice ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                        )}>
                          {source}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openOverrideDialog("property", prop.name, override?.voiceSettings, prop.vertical)}>
                            <Pencil className="h-3 w-3" /> {hasVoice ? "Edit" : "Customize"}
                          </Button>
                          {hasVoice && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => {
                              voice.updatePropertyOverride(prop.name, { voiceSettings: undefined });
                            }}>
                              <RotateCcw className="h-3 w-3" /> Reset
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
        </TabsContent>

        <TabsContent value="agents" className="space-y-6 pb-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Fine-tune voice settings for individual ELI+ agents. Agent-level settings take the highest priority in the cascade.
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
                    const hasVoiceOverride = !!propertyTuning?.voiceOverrides;
                    const agent = autonomousAgents.find((a) => a.id === agentId);

                    if (!effectiveTuning) return null;

                    const propOverride = voice.propertyOverrides.find((o) => o.property === prop.name);
                    const vertOverride = voice.verticalOverrides.find((vo) => vo.vertical === prop.vertical && vo.enabled);
                    const inheritedGender = propOverride?.voiceSettings?.voiceGender || vertOverride?.voiceSettings?.voiceGender || vs.voiceGender;
                    const inheritedAccent = propOverride?.voiceSettings?.voiceAccent || vertOverride?.voiceSettings?.voiceAccent || vs.voiceAccent;
                    const inheritedLanguages = propOverride?.voiceSettings?.voiceLanguages || vertOverride?.voiceSettings?.voiceLanguages || vs.voiceLanguages;
                    const mergedInherited: VoiceSettings = {
                      ...vs,
                      ...(vertOverride?.voiceSettings ?? {}),
                      ...(propOverride?.voiceSettings ?? {}),
                    } as VoiceSettings;

                    return (
                      <AgentVoiceTuningCard
                        key={`${prop.name}-${agentId}`}
                        tuning={effectiveTuning}
                        agentStatus={agent?.status}
                        hasVoiceOverride={hasVoiceOverride}
                        propertyName={prop.name}
                        inheritedGender={inheritedGender}
                        inheritedAccent={inheritedAccent}
                        inheritedLanguages={inheritedLanguages}
                        inheritedSettings={mergedInherited}
                        onSaveVoiceOverride={(overrides) => {
                          if (propertyTuning) {
                            voice.updateAgentTuning(agentId, { voiceOverrides: overrides }, prop.name);
                          } else {
                            voice.addAgentTuning({
                              ...effectiveTuning,
                              propertyName: prop.name,
                              voiceOverrides: overrides,
                            });
                          }
                        }}
                        onResetVoiceOverride={hasVoiceOverride ? () => {
                          voice.updateAgentTuning(agentId, { voiceOverrides: undefined }, prop.name);
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

      <VoiceOverrideDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={dialogTarget ? `Voice Settings — ${dialogTarget.name}` : ""}
        description={
          dialogTarget?.type === "vertical"
            ? `Override voice settings for all ${dialogTarget.name} properties.`
            : `Override voice settings for ${dialogTarget?.name || ""}.`
        }
        gender={dialogGender}
        onGenderChange={setDialogGender}
        accent={dialogAccent}
        onAccentChange={setDialogAccent}
        languages={dialogLanguages}
        onLanguagesChange={setDialogLanguages}
        autoDetect={dialogAutoDetect}
        onAutoDetectChange={setDialogAutoDetect}
        recordAudio={dialogRecordAudio}
        onRecordAudioChange={setDialogRecordAudio}
        generateTranscripts={dialogGenerateTranscripts}
        onGenerateTranscriptsChange={setDialogGenerateTranscripts}
        legalEnabled={dialogLegalEnabled}
        onLegalEnabledChange={setDialogLegalEnabled}
        legalText={dialogLegalText}
        onLegalTextChange={setDialogLegalText}
        greeting={dialogGreeting}
        onGreetingChange={setDialogGreeting}
        holdPhrase={dialogHoldPhrase}
        onHoldPhraseChange={setDialogHoldPhrase}
        maxCallLength={dialogMaxCallLength}
        onMaxCallLengthChange={setDialogMaxCallLength}
        aiDisclosure={dialogAiDisclosure}
        onAiDisclosureChange={setDialogAiDisclosure}
        onSave={handleDialogSave}
      />
    </>
  );
}

/* ─── Voice Override Dialog ─── */

function VoiceOverrideDialog({
  open,
  onOpenChange,
  title,
  description,
  gender,
  onGenderChange,
  accent,
  onAccentChange,
  languages,
  onLanguagesChange,
  autoDetect,
  onAutoDetectChange,
  recordAudio,
  onRecordAudioChange,
  generateTranscripts,
  onGenerateTranscriptsChange,
  legalEnabled,
  onLegalEnabledChange,
  legalText,
  onLegalTextChange,
  greeting,
  onGreetingChange,
  holdPhrase,
  onHoldPhraseChange,
  maxCallLength,
  onMaxCallLengthChange,
  aiDisclosure,
  onAiDisclosureChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  gender: "female" | "male";
  onGenderChange: (g: "female" | "male") => void;
  accent: string;
  onAccentChange: (a: string) => void;
  languages: string[];
  onLanguagesChange: (l: string[]) => void;
  autoDetect: boolean;
  onAutoDetectChange: (v: boolean) => void;
  recordAudio: boolean;
  onRecordAudioChange: (v: boolean) => void;
  generateTranscripts: boolean;
  onGenerateTranscriptsChange: (v: boolean) => void;
  legalEnabled: boolean;
  onLegalEnabledChange: (v: boolean) => void;
  legalText: string;
  onLegalTextChange: (v: string) => void;
  greeting: string;
  onGreetingChange: (v: string) => void;
  holdPhrase: string;
  onHoldPhraseChange: (v: string) => void;
  maxCallLength: number;
  onMaxCallLengthChange: (v: number) => void;
  aiDisclosure: boolean;
  onAiDisclosureChange: (v: boolean) => void;
  onSave: () => void;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Step 1: How it sounds */}
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Step 1</p>
              <p className="text-sm font-semibold text-foreground">How it sounds</p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Voice Gender</p>
              <div className="grid grid-cols-2 gap-3">
                {(["female", "male"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      onGenderChange(g);
                      const current = getNova2Voice(accent);
                      if (!current || current.gender !== g) {
                        onAccentChange(DEFAULT_NOVA2_VOICE_ID[g]);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all",
                      gender === g ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30",
                    )}
                  >
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                      gender === g ? "bg-primary text-white" : "bg-muted text-muted-foreground",
                    )}>
                      A
                    </div>
                    <div>
                      <p className="text-sm font-semibold capitalize text-foreground">{g}</p>
                      <p className="text-[11px] text-muted-foreground">{g === "female" ? "Warm, approachable" : "Confident, professional"}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Voice <span className="text-xs font-normal text-muted-foreground">· Amazon Nova 2 Sonic</span></p>
              <div className="grid grid-cols-2 gap-2">
                {getNova2VoicesByGender(gender).map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onAccentChange(v.id)}
                    className={cn(
                      "rounded-lg border-2 px-3 py-2.5 text-left transition-all",
                      accent === v.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30",
                    )}
                  >
                    <p className="text-sm font-semibold text-foreground">{v.label}</p>
                    <p className="text-[11px] text-muted-foreground">{v.accent}</p>
                    <p className="text-[11px] text-muted-foreground">{v.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Volume2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {getNova2Voice(accent)?.label ?? "Tiffany"} — {gender === "male" ? "Male" : "Female"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getNova2Voice(accent)?.accent ?? "American (en-US)"} · {getNova2Voice(accent)?.desc ?? "Warm polyglot"}
                </p>
              </div>
              <Button variant="outline" size="sm" className="ml-auto shrink-0">
                <Volume2 className="h-3 w-3" /> Listen
              </Button>
            </div>
          </div>

          {/* Step 2: Languages */}
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Step 2</p>
              <p className="text-sm font-semibold text-foreground">Languages</p>
            </div>

            <div className="flex items-center gap-3">
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={autoDetect}
                  onChange={(e) => onAutoDetectChange(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-primary transition-colors" />
                <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
              </label>
              <div>
                <p className="text-sm font-medium text-foreground">Auto-detect caller language</p>
                <p className="text-xs text-muted-foreground">Replies in the caller&apos;s language automatically.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {ALL_LANGUAGES.map((lang) => {
                const enabled = languages.includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => {
                      const next = enabled ? languages.filter((l) => l !== lang) : [...languages, lang];
                      onLanguagesChange(next);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                      enabled
                        ? "border-primary/30 bg-primary/5 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/20",
                    )}
                  >
                    <span>{LANGUAGE_FLAGS[lang]}</span>
                    {lang}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Recording, transcripts & legal */}
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Step 3</p>
              <p className="text-sm font-semibold text-foreground">Recording, transcripts & legal</p>
            </div>

            <ToggleRow
              icon={<div className="h-2 w-2 rounded-full bg-red-500" />}
              title="Record audio"
              description="Save call audio for quality assurance, training, and dispute resolution."
              checked={recordAudio}
              onChange={onRecordAudioChange}
            />

            <ToggleRow
              icon={<div className="h-2 w-2 rounded-full bg-blue-500" />}
              title="Generate transcripts"
              description="Searchable text transcripts of every call."
              checked={generateTranscripts}
              onChange={onGenerateTranscriptsChange}
            />

            <div className={cn("rounded-xl border px-5 py-4 space-y-3", legalEnabled && "border-emerald-200 dark:border-emerald-800")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Legal disclosure</p>
                    <p className="text-xs text-muted-foreground">Two-party consent compliance.</p>
                  </div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={legalEnabled}
                    onChange={(e) => onLegalEnabledChange(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-primary transition-colors" />
                  <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                </label>
              </div>
              {legalEnabled && (
                <textarea
                  value={legalText}
                  onChange={(e) => onLegalTextChange(e.target.value)}
                  rows={3}
                  className="input-base resize-y text-sm"
                  placeholder="This call may be recorded for quality assurance..."
                />
              )}
            </div>
          </div>

          {/* Advanced */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
            >
              <p className="text-sm font-semibold text-foreground">Advanced</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Greeting, hold phrase, call limits</span>
                {advancedOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </button>

            {advancedOpen && (
              <div className="space-y-4 rounded-lg border border-border p-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Greeting</label>
                  <input
                    type="text"
                    value={greeting}
                    onChange={(e) => onGreetingChange(e.target.value)}
                    className="input-base text-sm"
                    placeholder="Hi, thank you for calling {property}..."
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Use <code className="rounded bg-muted px-1 py-0.5 text-[10px]">{"{property}"}</code> to insert the property name.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Hold phrase</label>
                  <input
                    type="text"
                    value={holdPhrase}
                    onChange={(e) => onHoldPhraseChange(e.target.value)}
                    className="input-base text-sm"
                    placeholder="One moment while I look that up..."
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Max call length: {maxCallLength} min
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={60}
                    value={maxCallLength}
                    onChange={(e) => onMaxCallLengthChange(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>1 min</span>
                    <span>60 min</span>
                  </div>
                </div>

                <ToggleRow
                  icon={<div className="h-2 w-2 rounded-full bg-emerald-500" />}
                  title="AI disclosure"
                  description="Tell callers they're speaking with an AI."
                  checked={aiDisclosure}
                  onChange={onAiDisclosureChange}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Company Voice Settings ─── */

function CompanyVoiceSettings({
  settings,
  onUpdate,
}: {
  settings: VoiceSettings;
  onUpdate: (updates: Partial<VoiceSettings>) => void;
}) {
  return (
    <div className="space-y-8">
          {/* Step 1: How it sounds */}
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Step 1</p>
              <h3 className="text-base font-semibold text-foreground">How it sounds</h3>
              <p className="text-sm text-muted-foreground">Pick a voice and accent — that&apos;s it.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  const next: Partial<VoiceSettings> = { voiceGender: "female" };
                  const current = getNova2Voice(settings.voiceAccent);
                  if (!current || current.gender !== "female") {
                    next.voiceAccent = DEFAULT_NOVA2_VOICE_ID.female;
                  }
                  onUpdate(next);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-xl border-2 px-5 py-4 text-left transition-all",
                  settings.voiceGender === "female"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/30",
                )}
              >
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
                  settings.voiceGender === "female" ? "bg-primary text-white" : "bg-muted text-muted-foreground",
                )}>
                  A
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Female</p>
                  <p className="text-xs text-muted-foreground">Warm, approachable</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  const next: Partial<VoiceSettings> = { voiceGender: "male" };
                  const current = getNova2Voice(settings.voiceAccent);
                  if (!current || current.gender !== "male") {
                    next.voiceAccent = DEFAULT_NOVA2_VOICE_ID.male;
                  }
                  onUpdate(next);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-xl border-2 px-5 py-4 text-left transition-all",
                  settings.voiceGender === "male"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/30",
                )}
              >
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
                  settings.voiceGender === "male" ? "bg-primary text-white" : "bg-muted text-muted-foreground",
                )}>
                  A
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Male</p>
                  <p className="text-xs text-muted-foreground">Confident, professional</p>
                </div>
              </button>
            </div>

            <div>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-foreground">Voice</p>
                <p className="text-[11px] text-muted-foreground">
                  Amazon Nova 2 Sonic · {settings.voiceGender === "male" ? "male" : "female"} voices
                </p>
              </div>
              {(() => {
                const selectedVoice = getNova2Voice(settings.voiceAccent);
                return (
                  <div className="flex items-stretch gap-2">
                    <Select
                      value={settings.voiceAccent}
                      onValueChange={(value) => onUpdate({ voiceAccent: value })}
                    >
                      <SelectTrigger
                        aria-label="Select voice"
                        className="h-auto min-h-[3.25rem] flex-1 items-center gap-3 py-2.5 pr-3 text-left [&>span]:flex-1 [&>span]:text-left [&>svg]:h-5 [&>svg]:w-5 [&>svg]:shrink-0 [&>svg]:rounded-md [&>svg]:border [&>svg]:border-border [&>svg]:bg-muted/50 [&>svg]:p-0.5 [&>svg]:text-muted-foreground [&>svg]:opacity-100"
                      >
                        <SelectValue placeholder="Select a voice">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-foreground">
                              {selectedVoice?.label ?? "Select a voice"}
                              {selectedVoice && (
                                <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                                  {selectedVoice.accent}
                                </span>
                              )}
                            </span>
                            {selectedVoice && (
                              <span className="text-[11px] text-muted-foreground">
                                {selectedVoice.desc}
                              </span>
                            )}
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-[320px] w-[var(--radix-select-trigger-width)]">
                        {getNova2VoicesByGender(settings.voiceGender).map((voice) => (
                          <SelectItem
                            key={voice.id}
                            value={voice.id}
                            className="py-2 [&>span:last-child]:flex-1"
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-foreground">
                                {voice.label}
                                <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                                  {voice.accent}
                                </span>
                              </span>
                              <span className="text-[11px] text-muted-foreground">{voice.desc}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-auto self-stretch px-3"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      <span className="ml-1.5">Listen</span>
                    </Button>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Step 2: Languages */}
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Step 2</p>
              <h3 className="text-base font-semibold text-foreground">Languages</h3>
              <p className="text-sm text-muted-foreground">Which languages your AI understands and can reply in.</p>
            </div>

            <div className="flex items-center gap-3">
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={settings.autoDetectLanguage}
                  onChange={(e) => onUpdate({ autoDetectLanguage: e.target.checked })}
                  className="peer sr-only"
                />
                <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-primary transition-colors" />
                <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
              </label>
              <div>
                <p className="text-sm font-medium text-foreground">Speaks the caller&apos;s language automatically</p>
                <p className="text-xs text-muted-foreground">Available with the American accent only — switch to Ellery or Matthew to enable multilingual replies.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {ALL_LANGUAGES.map((lang) => {
                const enabled = settings.voiceLanguages.includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => {
                      const next = enabled
                        ? settings.voiceLanguages.filter((l) => l !== lang)
                        : [...settings.voiceLanguages, lang];
                      onUpdate({ voiceLanguages: next });
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                      enabled
                        ? "border-primary/30 bg-primary/5 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/20",
                    )}
                  >
                    <span>{LANGUAGE_FLAGS[lang]}</span>
                    {lang}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Recording, transcripts & legal */}
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Step 3</p>
              <h3 className="text-base font-semibold text-foreground">Recording, transcripts & legal</h3>
              <p className="text-sm text-muted-foreground">Capture calls for QA — and stay compliant automatically.</p>
            </div>

            <ToggleRow
              icon={<div className="h-2 w-2 rounded-full bg-red-500" />}
              title="Record audio"
              description="Save call audio for quality assurance, training, and dispute resolution."
              checked={settings.recordAudio}
              onChange={(v) => onUpdate({ recordAudio: v })}
            />

            <ToggleRow
              icon={<div className="h-2 w-2 rounded-full bg-blue-500" />}
              title="Generate transcripts"
              description="Searchable text transcripts of every call, attached to the lead/resident profile."
              checked={settings.generateTranscripts}
              onChange={(v) => onUpdate({ generateTranscripts: v })}
            />

            <Card className={cn(settings.legalDisclosureEnabled && "border-emerald-200 dark:border-emerald-800")}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Played automatically before every call connects</p>
                      <p className="text-xs text-muted-foreground">Two-party consent compliance for CA, CT, IL, MA, MD, MT, NH, PA, WA, and others.</p>
                    </div>
                  </div>
                </div>
                <textarea
                  value={settings.legalDisclosureText}
                  readOnly
                  rows={2}
                  aria-readonly="true"
                  className="input-base mt-3 resize-none bg-muted/30 text-sm leading-relaxed text-foreground/90 cursor-text"
                />
                <p className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                  Auto-played in the AI voice you selected above.
                </p>
              </CardContent>
            </Card>
          </div>

    </div>
  );
}

/* ─── Agent Voice Tuning Card ─── */

function AgentVoiceTuningCard({
  tuning,
  agentStatus,
  hasVoiceOverride,
  propertyName,
  inheritedGender,
  inheritedAccent,
  inheritedLanguages,
  inheritedSettings,
  onSaveVoiceOverride,
  onResetVoiceOverride,
}: {
  tuning: AgentVoiceTuning;
  agentStatus?: string;
  hasVoiceOverride: boolean;
  propertyName: string;
  inheritedGender: VoiceSettings["voiceGender"];
  inheritedAccent: VoiceSettings["voiceAccent"];
  inheritedLanguages: string[];
  inheritedSettings: VoiceSettings;
  onSaveVoiceOverride: (overrides: Partial<VoiceSettings>) => void;
  onResetVoiceOverride?: () => void;
}) {
  const ovr = tuning.voiceOverrides;

  const [editing, setEditing] = useState(false);
  const [draftGender, setDraftGender] = useState<VoiceSettings["voiceGender"]>(ovr?.voiceGender ?? inheritedGender);
  const [draftAccent, setDraftAccent] = useState<VoiceSettings["voiceAccent"]>(ovr?.voiceAccent ?? inheritedAccent);
  const [draftLanguages, setDraftLanguages] = useState<string[]>(ovr?.voiceLanguages ?? [...inheritedLanguages]);
  const [draftAutoDetect, setDraftAutoDetect] = useState(ovr?.autoDetectLanguage ?? inheritedSettings.autoDetectLanguage);
  const [draftRecordAudio, setDraftRecordAudio] = useState(ovr?.recordAudio ?? inheritedSettings.recordAudio);
  const [draftGenerateTranscripts, setDraftGenerateTranscripts] = useState(ovr?.generateTranscripts ?? inheritedSettings.generateTranscripts);
  const [draftLegalEnabled, setDraftLegalEnabled] = useState(ovr?.legalDisclosureEnabled ?? inheritedSettings.legalDisclosureEnabled);
  const [draftLegalText, setDraftLegalText] = useState(ovr?.legalDisclosureText ?? inheritedSettings.legalDisclosureText);
  const [draftGreeting, setDraftGreeting] = useState(ovr?.greeting ?? inheritedSettings.greeting);
  const [draftHoldPhrase, setDraftHoldPhrase] = useState(ovr?.holdPhrase ?? inheritedSettings.holdPhrase);
  const [draftMaxCallLength, setDraftMaxCallLength] = useState(ovr?.maxCallLength ?? inheritedSettings.maxCallLength);
  const [draftAiDisclosure, setDraftAiDisclosure] = useState(ovr?.aiDisclosureEnabled ?? inheritedSettings.aiDisclosureEnabled);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const status = agentStatus || "Active";
  const isOff = status === "Off";
  const displayName = `ELI+ ${tuning.agentName}`;

  const effectiveGender = ovr?.voiceGender ?? inheritedGender;
  const effectiveAccent = ovr?.voiceAccent ?? inheritedAccent;
  const effectiveLanguages = ovr?.voiceLanguages ?? inheritedLanguages;

  const handleSave = () => {
    onSaveVoiceOverride({
      voiceGender: draftGender,
      voiceAccent: draftAccent,
      voiceLanguages: draftLanguages,
      autoDetectLanguage: draftAutoDetect,
      recordAudio: draftRecordAudio,
      generateTranscripts: draftGenerateTranscripts,
      legalDisclosureEnabled: draftLegalEnabled,
      legalDisclosureText: draftLegalText,
      greeting: draftGreeting,
      holdPhrase: draftHoldPhrase,
      maxCallLength: draftMaxCallLength,
      aiDisclosureEnabled: draftAiDisclosure,
    });
    setEditing(false);
  };

  const startEditing = () => {
    setDraftGender(ovr?.voiceGender ?? inheritedGender);
    setDraftAccent(ovr?.voiceAccent ?? inheritedAccent);
    setDraftLanguages(ovr?.voiceLanguages ?? [...inheritedLanguages]);
    setDraftAutoDetect(ovr?.autoDetectLanguage ?? inheritedSettings.autoDetectLanguage);
    setDraftRecordAudio(ovr?.recordAudio ?? inheritedSettings.recordAudio);
    setDraftGenerateTranscripts(ovr?.generateTranscripts ?? inheritedSettings.generateTranscripts);
    setDraftLegalEnabled(ovr?.legalDisclosureEnabled ?? inheritedSettings.legalDisclosureEnabled);
    setDraftLegalText(ovr?.legalDisclosureText ?? inheritedSettings.legalDisclosureText);
    setDraftGreeting(ovr?.greeting ?? inheritedSettings.greeting);
    setDraftHoldPhrase(ovr?.holdPhrase ?? inheritedSettings.holdPhrase);
    setDraftMaxCallLength(ovr?.maxCallLength ?? inheritedSettings.maxCallLength);
    setDraftAiDisclosure(ovr?.aiDisclosureEnabled ?? inheritedSettings.aiDisclosureEnabled);
    setAdvancedOpen(false);
    setEditing(true);
  };

  const overriddenFields = ovr
    ? Object.keys(ovr).filter((k) => ovr[k as keyof typeof ovr] !== undefined)
    : [];

  return (
    <Card className={cn(isOff && "opacity-70", hasVoiceOverride && "border-primary/30")}>
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
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[9px] font-medium",
                  hasVoiceOverride ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                )}>
                  {hasVoiceOverride ? "Custom" : "Inherited"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground capitalize">
                {getNova2Voice(effectiveAccent)?.label ?? effectiveAccent} — {effectiveGender}
              </p>
              {!hasVoiceOverride && (
                <p className="mt-0.5 text-[10px] text-muted-foreground italic">Using inherited voice — customize to override for this property</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {!editing ? (
              <>
                {hasVoiceOverride ? (
                  <Button variant="ghost" size="sm" onClick={startEditing}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={startEditing}>
                    <Plus className="h-3 w-3" /> Customize
                  </Button>
                )}
                {onResetVoiceOverride && (
                  <Button variant="ghost" size="sm" onClick={onResetVoiceOverride}>
                    <RotateCcw className="h-3 w-3" /> Reset
                  </Button>
                )}
              </>
            ) : (
              <div className="flex gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSave}>{hasVoiceOverride ? "Save" : "Create Override"}</Button>
              </div>
            )}
          </div>
        </div>

        {!editing ? (
          <div className="mt-3 space-y-2 text-sm">
            {hasVoiceOverride && (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {effectiveLanguages.map((lang) => (
                    <span key={lang} className="inline-flex rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {LANGUAGE_FLAGS[lang]} {lang}
                    </span>
                  ))}
                </div>
                {overriddenFields.length > 3 && (
                  <p className="text-[10px] text-muted-foreground">
                    {overriddenFields.length} fields overridden
                    {ovr?.recordAudio !== undefined && ` · Recording ${ovr.recordAudio ? "on" : "off"}`}
                    {ovr?.maxCallLength !== undefined && ` · ${ovr.maxCallLength}min max`}
                  </p>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground">Voice Gender</label>
              <div className="flex gap-2">
                {(["female", "male"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      setDraftGender(g);
                      const current = getNova2Voice(draftAccent);
                      if (!current || current.gender !== g) {
                        setDraftAccent(DEFAULT_NOVA2_VOICE_ID[g]);
                      }
                    }}
                    className={cn(
                      "flex-1 rounded-lg border-2 px-3 py-2 text-xs font-medium capitalize transition-all",
                      draftGender === g ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-primary/30",
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground">Voice <span className="text-[10px] font-normal">· Nova 2 Sonic</span></label>
              <div className="grid grid-cols-2 gap-2">
                {getNova2VoicesByGender(draftGender).map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setDraftAccent(v.id)}
                    className={cn(
                      "rounded-lg border-2 px-3 py-2 text-left text-xs font-medium transition-all",
                      draftAccent === v.id ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-primary/30",
                    )}
                  >
                    <span className="block font-semibold text-foreground">{v.label}</span>
                    <span className="block text-[10px] font-normal text-muted-foreground">{v.accent}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Languages</label>
                <label className="relative inline-flex cursor-pointer items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Auto-detect</span>
                  <div className="relative">
                    <input type="checkbox" checked={draftAutoDetect} onChange={(e) => setDraftAutoDetect(e.target.checked)} className="peer sr-only" />
                    <div className="h-4 w-7 rounded-full bg-muted peer-checked:bg-primary transition-colors" />
                    <div className="absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform peer-checked:translate-x-3" />
                  </div>
                </label>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ALL_LANGUAGES.map((lang) => {
                  const enabled = draftLanguages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setDraftLanguages(prev => enabled ? prev.filter(l => l !== lang) : [...prev, lang]);
                      }}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                        enabled ? "border-primary/30 bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-primary/20",
                      )}
                    >
                      {LANGUAGE_FLAGS[lang]} {lang}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-muted-foreground">Recording & Transcripts</label>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span className="text-xs text-foreground">Record audio</span>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" checked={draftRecordAudio} onChange={(e) => setDraftRecordAudio(e.target.checked)} className="peer sr-only" />
                  <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-primary transition-colors" />
                  <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                </label>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span className="text-xs text-foreground">Generate transcripts</span>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" checked={draftGenerateTranscripts} onChange={(e) => setDraftGenerateTranscripts(e.target.checked)} className="peer sr-only" />
                  <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-primary transition-colors" />
                  <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Legal disclosure</label>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" checked={draftLegalEnabled} onChange={(e) => setDraftLegalEnabled(e.target.checked)} className="peer sr-only" />
                  <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-primary transition-colors" />
                  <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                </label>
              </div>
              {draftLegalEnabled && (
                <textarea
                  value={draftLegalText}
                  onChange={(e) => setDraftLegalText(e.target.value)}
                  rows={2}
                  className="input-base resize-y text-xs"
                  placeholder="This call may be recorded..."
                />
              )}
            </div>

            <button
              type="button"
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left transition-colors hover:bg-muted/50"
            >
              <span className="text-xs font-medium text-muted-foreground">Advanced</span>
              {advancedOpen ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
            </button>

            {advancedOpen && (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Greeting</label>
                  <input type="text" value={draftGreeting} onChange={(e) => setDraftGreeting(e.target.value)} className="input-base text-xs" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Hold phrase</label>
                  <input type="text" value={draftHoldPhrase} onChange={(e) => setDraftHoldPhrase(e.target.value)} className="input-base text-xs" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Max call length: {draftMaxCallLength} min</label>
                  <input type="range" min={1} max={60} value={draftMaxCallLength} onChange={(e) => setDraftMaxCallLength(Number(e.target.value))} className="w-full accent-primary" />
                  <div className="flex justify-between text-[10px] text-muted-foreground"><span>1 min</span><span>60 min</span></div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="text-xs text-foreground">AI disclosure</span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" checked={draftAiDisclosure} onChange={(e) => setDraftAiDisclosure(e.target.checked)} className="peer sr-only" />
                    <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-primary transition-colors" />
                    <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Toggle Row ─── */

function ToggleRow({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <label className="relative inline-flex cursor-pointer items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-primary transition-colors" />
        <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </label>
    </div>
  );
}

/* ─── Cascade Visualization ─── */

function VoiceCascadeVisual({ activeLevel, onLevelClick }: { activeLevel: string; onLevelClick: (level: string) => void }) {
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
            <p className="text-sm font-semibold text-foreground">How Voice Settings Cascade</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Lower levels inherit from above and can override as needed.</p>
          </div>
          <div className="space-y-3 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted"><Building2 className="h-3.5 w-3.5 text-muted-foreground" /></div>
              <div>
                <p className="text-xs font-medium text-foreground">Company Defaults</p>
                <p className="text-[11px] text-muted-foreground">The baseline voice, accent, languages, and call settings that apply everywhere unless overridden.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted"><Layers className="h-3.5 w-3.5 text-muted-foreground" /></div>
              <div>
                <p className="text-xs font-medium text-foreground">Vertical Overrides</p>
                <p className="text-[11px] text-muted-foreground">Different property types can use different voices or accents.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted"><Home className="h-3.5 w-3.5 text-muted-foreground" /></div>
              <div>
                <p className="text-xs font-medium text-foreground">Property Overrides</p>
                <p className="text-[11px] text-muted-foreground">Fine-tune voice settings for a specific property.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/eli-cube.svg" alt="" width={14} height={14} className="shrink-0" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Agent Overrides</p>
                <p className="text-[11px] text-muted-foreground">Individual agents can use a unique voice. Takes highest priority.</p>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
