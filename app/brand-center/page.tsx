"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useVoice, type BrandSettings, type BrandColors } from "@/lib/voice-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Building2, Layers, Home, ChevronRight, Info, Palette,
  Upload, Image as ImageIcon, Type, Pencil, RotateCcw,
  GraduationCap, ShieldCheck, Briefcase,
} from "lucide-react";

const FONT_OPTIONS = [
  "Inter", "Roboto", "Open Sans", "Lato", "Montserrat",
  "Poppins", "Nunito", "Raleway", "Source Sans 3", "DM Sans",
];

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

export default function BrandCenterPage() {
  const voice = useVoice();
  const [activeTab, setActiveTab] = useState("company");
  const bs = voice.brandSettings;

  const updateBS = (updates: Partial<BrandSettings>) => {
    voice.update({ brandSettings: { ...bs, ...updates } });
  };

  const updateColors = (updates: Partial<BrandColors>) => {
    voice.update({ brandSettings: { ...bs, colors: { ...bs.colors, ...updates } } });
  };

  return (
    <>
      <PageHeader
        title="Brand Center"
        description="Manage your visual brand identity — color palettes, logos, and typography — applied across websites and system-generated content at every level."
      />

      <BrandCascadeVisual activeLevel={activeTab} onLevelClick={setActiveTab} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="company">Company Defaults</TabsTrigger>
          <TabsTrigger value="verticals">Verticals</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-8">
          {/* Color Palette */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Color Palette</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">Define your brand colors. These are used across resident-facing websites, emails, and system-generated content.</p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-3">
                <ColorPicker label="Primary" value={bs.colors.primary} onChange={(v) => updateColors({ primary: v })} />
                <ColorPicker label="Secondary" value={bs.colors.secondary} onChange={(v) => updateColors({ secondary: v })} />
                <ColorPicker label="Accent" value={bs.colors.accent} onChange={(v) => updateColors({ accent: v })} />
              </div>

              <div className="mt-6">
                <p className="mb-3 text-xs font-medium text-muted-foreground">Preview</p>
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="h-12" style={{ background: bs.colors.primary }} />
                  <div className="flex">
                    <div className="h-6 flex-1" style={{ background: bs.colors.secondary }} />
                    <div className="h-6 flex-1" style={{ background: bs.colors.accent }} />
                  </div>
                  <div className="px-5 py-4 bg-white dark:bg-zinc-900">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg" style={{ background: bs.colors.primary }} />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: bs.colors.primary }}>Your Property Name</p>
                        <p className="text-xs text-muted-foreground">Welcome to your new home</p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        className="rounded-md px-4 py-1.5 text-xs font-medium text-white"
                        style={{ background: bs.colors.primary }}
                      >
                        Schedule a Tour
                      </button>
                      <button
                        type="button"
                        className="rounded-md border px-4 py-1.5 text-xs font-medium"
                        style={{ borderColor: bs.colors.secondary, color: bs.colors.secondary }}
                      >
                        Learn More
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logo & Assets */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Logo & Assets</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">Upload your company logo and brand assets for use across the platform.</p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/30 hover:bg-muted/30">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-3 text-sm font-medium text-foreground">Company Logo</p>
                  <p className="mt-1 text-xs text-muted-foreground">SVG, PNG, or JPG up to 2MB</p>
                  <Button variant="outline" size="sm" className="mt-3">
                    <Upload className="h-3 w-3" /> Upload
                  </Button>
                </div>
                <div className="rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/30 hover:bg-muted/30">
                  <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-3 text-sm font-medium text-foreground">App Icon</p>
                  <p className="mt-1 text-xs text-muted-foreground">Square format, 512x512px recommended</p>
                  <Button variant="outline" size="sm" className="mt-3">
                    <Upload className="h-3 w-3" /> Upload
                  </Button>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Asset Library</p>
                  <Button variant="outline" size="sm">
                    <Upload className="h-3 w-3" /> Add assets
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-lg border border-border bg-muted/30 flex items-center justify-center"
                    >
                      <ImageIcon className="h-5 w-5 text-muted-foreground/30" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Typography */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Typography</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">Choose the font family used in resident-facing content.</p>
            </CardHeader>
            <CardContent>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Font Family</label>
                <select
                  value={bs.fontFamily}
                  onChange={(e) => updateBS({ fontFamily: e.target.value })}
                  className="select-base w-full max-w-xs text-sm"
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font} value={font}>{font}</option>
                  ))}
                </select>
              </div>

              <div className="mt-5 rounded-lg border border-border p-5" style={{ fontFamily: bs.fontFamily }}>
                <p className="text-2xl font-bold text-foreground">Heading Preview</p>
                <p className="mt-1 text-lg font-semibold text-foreground">Subheading Text</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Body text preview — this is how resident-facing content will appear with the selected font family.
                  The quick brown fox jumps over the lazy dog.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Caption text · Small print · Fine details
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verticals" className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Customize brand settings for different property types. Vertical-level settings override company defaults for all properties within that vertical.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {VERTICALS.map((v) => {
              const config = VERTICAL_CONFIG[v];
              const override = voice.verticalOverrides.find((o) => o.vertical === v);
              const hasBrand = override?.brandSettings && Object.keys(override.brandSettings).length > 0;
              const Icon = config.icon;

              return (
                <Card key={v} className={cn("transition-colors", hasBrand && "border-primary/30")}>
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
                      <Badge variant={hasBrand ? "default" : "secondary"} className="text-[10px]">
                        {hasBrand ? "Custom" : "Inherited"}
                      </Badge>
                    </div>

                    {hasBrand && override?.brandSettings ? (
                      <div className="mt-4 rounded-lg bg-muted/50 p-3">
                        {override.brandSettings.colors && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-foreground">Colors:</span>
                            <div className="flex gap-1">
                              {Object.values(override.brandSettings.colors).map((color, i) => (
                                <div key={i} className="h-5 w-5 rounded-full border border-border" style={{ background: color }} />
                              ))}
                            </div>
                          </div>
                        )}
                        {override.brandSettings.fontFamily && (
                          <p className="mt-1 text-xs"><span className="font-medium text-foreground">Font:</span> <span className="text-muted-foreground">{override.brandSettings.fontFamily}</span></p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-4 text-xs italic text-muted-foreground">Inherits brand settings from company defaults.</p>
                    )}

                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        const current = override?.brandSettings || {};
                        const newBrand: Partial<BrandSettings> = {
                          ...current,
                          colors: current.colors || bs.colors,
                          fontFamily: current.fontFamily || bs.fontFamily,
                        };
                        voice.updateVerticalOverride(v, { brandSettings: newBrand, enabled: override?.enabled ?? true });
                      }}>
                        <Pencil className="h-3 w-3" /> {hasBrand ? "Edit" : "Customize"}
                      </Button>
                      {hasBrand && (
                        <Button variant="ghost" size="sm" onClick={() => {
                          voice.updateVerticalOverride(v, { brandSettings: undefined });
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

        <TabsContent value="properties" className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Override brand settings for individual properties. Properties without overrides inherit from their vertical or company defaults.
          </p>
          <div className="overflow-x-auto">
            <table className="table-borderless w-full min-w-[600px]">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Vertical</th>
                  <th>Brand Source</th>
                  <th className="w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_PROPERTIES.map((prop) => {
                  const override = voice.propertyOverrides.find((o) => o.property === prop.name);
                  const hasBrand = override?.brandSettings && Object.keys(override.brandSettings).length > 0;
                  const verticalOverride = voice.verticalOverrides.find((v) => v.vertical === prop.vertical && v.enabled && v.brandSettings);
                  const source = hasBrand ? "Custom" : verticalOverride ? `Vertical: ${prop.vertical}` : "Company Default";
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
                          hasBrand ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                        )}>
                          {source}
                        </span>
                      </td>
                      <td>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => {
                          const current = override?.brandSettings || {};
                          const newBrand: Partial<BrandSettings> = { ...current, colors: current.colors || bs.colors };
                          if (override) {
                            voice.updatePropertyOverride(prop.name, { brandSettings: newBrand });
                          } else {
                            voice.addPropertyOverride({ property: prop.name, vertical: prop.vertical, brandSettings: newBrand });
                          }
                        }}>
                          {hasBrand ? "Edit" : "Customize"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

/* ─── Color Picker ─── */

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-10 cursor-pointer rounded-lg border border-border p-0.5"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-base h-10 w-28 font-mono text-sm uppercase"
        />
      </div>
    </div>
  );
}

/* ─── Cascade Visualization (no Agent level for Brand) ─── */

function BrandCascadeVisual({ activeLevel, onLevelClick }: { activeLevel: string; onLevelClick: (level: string) => void }) {
  const levels = [
    { id: "company", label: "Company", desc: "Portfolio defaults", icon: Building2 },
    { id: "verticals", label: "Vertical", desc: "By property type", icon: Layers },
    { id: "properties", label: "Property", desc: "Individual overrides", icon: Home },
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
                <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
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
            <p className="text-sm font-semibold text-foreground">How Brand Settings Cascade</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Lower levels inherit from above and can override as needed. Brand does not cascade to individual agents.</p>
          </div>
          <div className="space-y-3 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted"><Building2 className="h-3.5 w-3.5 text-muted-foreground" /></div>
              <div>
                <p className="text-xs font-medium text-foreground">Company Defaults</p>
                <p className="text-[11px] text-muted-foreground">The baseline brand colors, logo, and typography that apply everywhere.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted"><Layers className="h-3.5 w-3.5 text-muted-foreground" /></div>
              <div>
                <p className="text-xs font-medium text-foreground">Vertical Overrides</p>
                <p className="text-[11px] text-muted-foreground">Different property types can have distinct brand identities (e.g. student housing vs commercial).</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted"><Home className="h-3.5 w-3.5 text-muted-foreground" /></div>
              <div>
                <p className="text-xs font-medium text-foreground">Property Overrides</p>
                <p className="text-[11px] text-muted-foreground">Individual properties can have their own colors, logo, and typography.</p>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
