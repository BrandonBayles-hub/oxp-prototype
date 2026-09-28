"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

// Bumped to v5 when voiceAccent changed from accent literals (american|british|...) to
// Amazon Nova 2 Sonic voice IDs (tiffany|matthew|...). Stale keys would otherwise leave
// the voice picker unhighlighted.
// Bumped to v6 when the legal disclosure default copy was shortened.
// Bumped to v7 when the per-agent voice & tone editor moved onto its own
// agentToneDefaults / agentVerticalToneOverrides / agentPropertyToneOverrides
// state slices.
// Bumped to v8 when voice settings adopted the same per-agent cascade model.
const STORAGE_KEY = "janet-poc-voice-v8";
const LEGACY_STORAGE_KEY = "janet-poc-voice-v7";

export type PhrasingRule = {
  id: string;
  area: string;
  type: "avoid" | "require" | "replace";
  phrase: string;
  replacement?: string;
};

export type VoiceSettings = {
  aiVoiceEnabled: boolean;
  voiceGender: "female" | "male";
  /** Voice ID from the Amazon Nova 2 Sonic catalog (e.g. "tiffany", "matthew"). */
  voiceAccent: string;
  voiceLanguages: string[];
  autoDetectLanguage: boolean;
  recordAudio: boolean;
  generateTranscripts: boolean;
  recordAudioOutbound: boolean;
  generateTranscriptsOutbound: boolean;
  legalDisclosureEnabled: boolean;
  legalDisclosureText: string;
  legalDisclosureTextOutbound: string;
  greeting: string;
  holdPhrase: string;
  maxCallLength: number;
  aiDisclosureEnabled: boolean;
};

/**
 * Amazon Nova 2 Sonic voice catalog.
 * Source: https://docs.aws.amazon.com/nova/latest/userguide/available-voices.html
 *
 * Each option exposes the voice ID we store on `VoiceSettings.voiceAccent`,
 * a friendly label, the speaker's gender (used to filter options by the
 * selected voiceGender), the accent/locale, and a short descriptor.
 */
export type Nova2Voice = {
  id: string;
  label: string;
  gender: "female" | "male";
  accent: string;
  desc: string;
};

export const NOVA2_VOICES: readonly Nova2Voice[] = [
  { id: "tiffany", label: "Tiffany", gender: "female", accent: "American (en-US)", desc: "US English · speaks every supported language" },
  { id: "amy",     label: "Amy",     gender: "female", accent: "British (en-GB)",  desc: "UK English" },
  { id: "olivia",  label: "Olivia",  gender: "female", accent: "Australian (en-AU)", desc: "Australian English" },
  { id: "kiara",   label: "Kiara",   gender: "female", accent: "Indian (en-IN)",   desc: "Indian English" },
  { id: "lupe",    label: "Lupe",    gender: "female", accent: "Spanish (es-US)",  desc: "Bilingual US Spanish" },
  { id: "ambre",   label: "Ambre",   gender: "female", accent: "French (fr-FR)",   desc: "French" },
  { id: "tina",    label: "Tina",    gender: "female", accent: "German (de-DE)",   desc: "German" },
  { id: "beatrice",label: "Beatrice",gender: "female", accent: "Italian (it-IT)",  desc: "Italian" },
  { id: "carolina",label: "Carolina",gender: "female", accent: "Portuguese (pt-BR)", desc: "Brazilian Portuguese" },
  { id: "matthew", label: "Matthew", gender: "male",   accent: "American (en-US)", desc: "US English · speaks every supported language" },
  { id: "arjun",   label: "Arjun",   gender: "male",   accent: "Indian (en-IN)",   desc: "Indian English" },
  { id: "carlos",  label: "Carlos",  gender: "male",   accent: "Spanish (es-US)",  desc: "Bilingual US Spanish" },
  { id: "florian", label: "Florian", gender: "male",   accent: "French (fr-FR)",   desc: "French" },
  { id: "lennart", label: "Lennart", gender: "male",   accent: "German (de-DE)",   desc: "German" },
  { id: "lorenzo", label: "Lorenzo", gender: "male",   accent: "Italian (it-IT)",  desc: "Italian" },
  { id: "leo",     label: "Leo",     gender: "male",   accent: "Portuguese (pt-BR)", desc: "Brazilian Portuguese" },
];

export const DEFAULT_NOVA2_VOICE_ID: Record<"female" | "male", string> = {
  female: "tiffany",
  male: "matthew",
};

export function getNova2Voice(id: string): Nova2Voice | undefined {
  return NOVA2_VOICES.find((v) => v.id === id);
}

export function getNova2VoicesByGender(gender: "female" | "male"): Nova2Voice[] {
  return NOVA2_VOICES.filter((v) => v.gender === gender);
}

export type BrandColors = {
  primary: string;
  secondary: string;
  accent: string;
};

export type BrandSettings = {
  colors: BrandColors;
  logoUrl: string;
  fontFamily: string;
};

export type VerticalOverride = {
  vertical: string;
  enabled: boolean;
  persona?: string;
  brandingTone?: string;
  toneFormality?: number;
  toneWarmth?: number;
  toneUrgency?: number;
  doExamples?: string[];
  dontExamples?: string[];
  voiceSettings?: Partial<VoiceSettings>;
  brandSettings?: Partial<BrandSettings>;
};

export type PropertyOverride = {
  property: string;
  vertical?: string;
  brandingTone?: string;
  persona?: string;
  toneFormality?: number;
  toneWarmth?: number;
  toneUrgency?: number;
  doExamples?: string[];
  dontExamples?: string[];
  channels?: { voice: boolean; chat: boolean; sms: boolean; portal: boolean };
  phrasingRules?: PhrasingRule[];
  voiceSettings?: Partial<VoiceSettings>;
  brandSettings?: Partial<BrandSettings>;
};

export type AgentVoiceOverrides = Partial<VoiceSettings>;

export type AgentVoiceTuning = {
  agentId: string;
  agentName: string;
  propertyName?: string;
  toneOverride?: string;
  responseLength?: "concise" | "standard" | "detailed";
  personality?: string;
  customInstructions?: string;
  allowEmoji?: boolean;
  doExamples?: string[];
  dontExamples?: string[];
  voiceOverrides?: AgentVoiceOverrides;
};

export type ToneSettings = {
  persona: string;
  guidelines: string;
  additionalInstructions: string;
  doExamples: string[];
  dontExamples: string[];
};

export type AgentToneId = "leasing" | "renewal" | "payments" | "maintenance";

export const AGENT_TONE_IDS: readonly AgentToneId[] = [
  "leasing",
  "renewal",
  "payments",
  "maintenance",
];

export const AGENT_TONE_NAMES: Record<AgentToneId, string> = {
  leasing: "Leasing AI",
  renewal: "Renewal AI",
  payments: "Payments AI",
  maintenance: "Maintenance AI",
};

export const AGENT_TONE_SEED_DEFAULTS: Record<AgentToneId, ToneSettings> = {
  leasing: {
    persona: "Enthusiastic leasing assistant",
    guidelines:
      "Excited about helping people find their new home. Always mention current specials. Proactively offer tour scheduling. Stay warm and conversational without pressuring prospects.",
    additionalInstructions: "",
    doExamples: [
      "Highlight current specials and promotions",
      "Proactively suggest tour scheduling",
      "Emphasize unique property features",
    ],
    dontExamples: [
      "Pressure prospects into decisions",
      "Disparage competing properties",
      "Guarantee availability without checking",
    ],
  },
  renewal: {
    persona: "Warm renewal advocate",
    guidelines:
      "Grateful for the resident's continued tenancy. Lead with appreciation. Highlight community improvements since move-in. Offer flexible renewal terms.",
    additionalInstructions: "",
    doExamples: [
      "Lead with gratitude for their residency",
      "Mention community improvements",
      "Offer flexible renewal terms",
    ],
    dontExamples: [
      "Threaten lease non-renewal",
      "Rush renewal decisions",
      "Ignore resident concerns or complaints",
    ],
  },
  payments: {
    persona: "Empathetic, solution-focused payments specialist",
    guidelines:
      "Direct and clear, but never judgmental. Always explain fees and deadlines plainly. Offer payment plan options proactively when applicable. No humor or levity — this is collections.",
    additionalInstructions: "",
    doExamples: [
      "Offer payment plan options proactively",
      "Show empathy for financial situations",
      "Clearly explain fees and deadlines",
    ],
    dontExamples: [
      "Be judgmental about late payments",
      "Use threatening language about collections",
      "Discuss other residents' payment history",
    ],
  },
  maintenance: {
    persona: "Efficient, reassuring maintenance coordinator",
    guidelines:
      "Focused on getting things fixed fast. Always provide an estimated timeline. Confirm the issue has been understood. Follow up after resolution.",
    additionalInstructions: "",
    doExamples: [
      "Provide clear estimated timelines",
      "Confirm the issue has been understood",
      "Follow up after resolution",
    ],
    dontExamples: [
      "Blame the resident for the issue",
      "Promise exact completion times",
      "Dismiss concerns as minor",
    ],
  },
};

export type AgentVerticalToneOverride = {
  id: string;
  agentId: AgentToneId;
  vertical: string;
  settings: ToneSettings;
};

export type AgentPropertyToneOverride = {
  id: string;
  agentId: AgentToneId;
  propertyName: string;
  vertical: string;
  settings: ToneSettings;
};

export type AgentVerticalVoiceOverride = {
  id: string;
  agentId: AgentToneId;
  vertical: string;
  settings: VoiceSettings;
};

export type AgentPropertyVoiceOverride = {
  id: string;
  agentId: AgentToneId;
  propertyName: string;
  vertical: string;
  settings: VoiceSettings;
};

export type VoiceState = {
  unified: boolean;
  brandingTone: string;
  persona: string;
  toneFormality: number;
  toneWarmth: number;
  toneUrgency: number;
  doExamples: string[];
  dontExamples: string[];
  channels: { voice: boolean; chat: boolean; sms: boolean; portal: boolean };
  /** @deprecated Use channelAgentId — kept for display compatibility */
  channelAgent: Record<string, string>;
  /** Source of truth: maps channel key to agent ID */
  channelAgentId: Record<string, string>;
  channelSettings: Record<string, { greeting?: string; signoff?: string }>;
  phrasingRules: PhrasingRule[];
  verticalOverrides: VerticalOverride[];
  propertyOverrides: PropertyOverride[];
  agentTuning: AgentVoiceTuning[];
  agentToneDefaults: Record<AgentToneId, ToneSettings>;
  agentVerticalToneOverrides: AgentVerticalToneOverride[];
  agentPropertyToneOverrides: AgentPropertyToneOverride[];
  agentVoiceDefaults: Record<AgentToneId, VoiceSettings>;
  agentVerticalVoiceOverrides: AgentVerticalVoiceOverride[];
  agentPropertyVoiceOverrides: AgentPropertyVoiceOverride[];
  voiceSettings: VoiceSettings;
  brandSettings: BrandSettings;
};

export const AGENT_TONE_VERTICAL_SEEDS: AgentVerticalToneOverride[] = [
  {
    id: "leasing-student",
    agentId: "leasing",
    vertical: "Student",
    settings: {
      persona: "Friendly campus guide",
      guidelines:
        "Casual, upbeat, and approachable. Use conversational language that resonates with college-age residents. Reference campus life and student-friendly amenities.",
      additionalInstructions: "",
      doExamples: [
        "Use casual, relatable language",
        "Reference campus events and deadlines",
        "Mention roommate-matching options",
      ],
      dontExamples: [
        "Use overly formal or corporate tone",
        "Assume financial independence",
        "Ignore academic calendar timing",
      ],
    },
  },
];

export const AGENT_TONE_PROPERTY_SEEDS: AgentPropertyToneOverride[] = [
  {
    id: "leasing-sunset-ridge",
    agentId: "leasing",
    propertyName: "Sunset Ridge Apartments",
    vertical: "Conventional",
    settings: {
      persona: "Luxury concierge",
      guidelines:
        "Upscale and sophisticated. Use luxury language. Address residents formally. Highlight exclusive amenities and concierge-level service.",
      additionalInstructions: "",
      doExamples: [
        "Use luxury and premium language",
        "Address residents by title and last name",
        "Highlight exclusive amenities",
      ],
      dontExamples: [
        "Use generic or budget-oriented phrasing",
        "Be overly casual or use slang",
        "Compare to other properties",
      ],
    },
  },
];

function cloneToneSettings(settings: ToneSettings): ToneSettings {
  return {
    persona: settings.persona,
    guidelines: settings.guidelines,
    additionalInstructions: settings.additionalInstructions ?? "",
    doExamples: [...settings.doExamples],
    dontExamples: [...settings.dontExamples],
  };
}

function cloneAgentToneDefaults(): Record<AgentToneId, ToneSettings> {
  return AGENT_TONE_IDS.reduce((acc, agentId) => {
    acc[agentId] = cloneToneSettings(AGENT_TONE_SEED_DEFAULTS[agentId]);
    return acc;
  }, {} as Record<AgentToneId, ToneSettings>);
}

function cloneVoiceSettings(settings: VoiceSettings): VoiceSettings {
  return {
    ...settings,
    voiceLanguages: [...settings.voiceLanguages],
  };
}

function cloneAgentVoiceDefaults(
  base: VoiceSettings,
): Record<AgentToneId, VoiceSettings> {
  return AGENT_TONE_IDS.reduce((acc, agentId) => {
    acc[agentId] = cloneVoiceSettings(base);
    return acc;
  }, {} as Record<AgentToneId, VoiceSettings>);
}

function hasVoiceSettingOverrides(value?: Partial<VoiceSettings>): boolean {
  return Boolean(value && Object.keys(value).length > 0);
}

function mapTuningAgentIdToToneId(agentId: string): AgentToneId | null {
  switch (agentId) {
    case "4":
      return "leasing";
    case "7":
      return "renewal";
    case "10":
      return "maintenance";
    case "1":
      return "payments";
    default:
      return null;
  }
}

function buildAgentVoiceSlicesFromLegacy(
  source: Pick<
    VoiceState,
    "voiceSettings" | "verticalOverrides" | "propertyOverrides" | "agentTuning"
  >,
): Pick<
  VoiceState,
  "agentVoiceDefaults" | "agentVerticalVoiceOverrides" | "agentPropertyVoiceOverrides"
> {
  const agentVoiceDefaults = cloneAgentVoiceDefaults(source.voiceSettings);
  const verticalByName = new Map(source.verticalOverrides.map((override) => [override.vertical, override]));
  const propertyByName = new Map(source.propertyOverrides.map((override) => [override.property, override]));

  const agentVerticalVoiceOverrides: AgentVerticalVoiceOverride[] = [];
  source.verticalOverrides.forEach((override) => {
    if (!hasVoiceSettingOverrides(override.voiceSettings)) return;
    AGENT_TONE_IDS.forEach((agentId) => {
      agentVerticalVoiceOverrides.push({
        id: `voice-${agentId}-${override.vertical.toLowerCase()}-${agentVerticalVoiceOverrides.length}`,
        agentId,
        vertical: override.vertical,
        settings: {
          ...cloneVoiceSettings(agentVoiceDefaults[agentId]),
          ...(override.voiceSettings as Partial<VoiceSettings>),
        },
      });
    });
  });

  const keyedPropertyOverrides = new Map<string, AgentPropertyVoiceOverride>();

  source.propertyOverrides.forEach((override) => {
    if (!hasVoiceSettingOverrides(override.voiceSettings)) return;
    AGENT_TONE_IDS.forEach((agentId) => {
      const verticalSettings = override.vertical
        ? verticalByName.get(override.vertical)?.voiceSettings
        : undefined;
      const settings: VoiceSettings = {
        ...cloneVoiceSettings(agentVoiceDefaults[agentId]),
        ...(verticalSettings as Partial<VoiceSettings> | undefined),
        ...(override.voiceSettings as Partial<VoiceSettings>),
      };
      const key = `${agentId}::${override.property}`;
      keyedPropertyOverrides.set(key, {
        id: `voice-${agentId}-${override.property.toLowerCase().replace(/\s+/g, "-")}-${keyedPropertyOverrides.size}`,
        agentId,
        propertyName: override.property,
        vertical: override.vertical ?? "",
        settings,
      });
    });
  });

  source.agentTuning.forEach((tuning) => {
    if (!tuning.propertyName || !hasVoiceSettingOverrides(tuning.voiceOverrides)) return;
    const agentId = mapTuningAgentIdToToneId(tuning.agentId);
    if (!agentId) return;
    const key = `${agentId}::${tuning.propertyName}`;
    const existing = keyedPropertyOverrides.get(key);
    const legacyProperty = propertyByName.get(tuning.propertyName);
    const fallbackVerticalSettings = legacyProperty?.vertical
      ? verticalByName.get(legacyProperty.vertical)?.voiceSettings
      : undefined;
    const baseSettings = existing?.settings ?? {
      ...cloneVoiceSettings(agentVoiceDefaults[agentId]),
      ...(fallbackVerticalSettings as Partial<VoiceSettings> | undefined),
      ...(legacyProperty?.voiceSettings as Partial<VoiceSettings> | undefined),
    };

    keyedPropertyOverrides.set(key, {
      id:
        existing?.id ??
        `voice-${agentId}-${tuning.propertyName.toLowerCase().replace(/\s+/g, "-")}-${keyedPropertyOverrides.size}`,
      agentId,
      propertyName: tuning.propertyName,
      vertical: existing?.vertical ?? legacyProperty?.vertical ?? "",
      settings: {
        ...baseSettings,
        ...(tuning.voiceOverrides as Partial<VoiceSettings>),
      },
    });
  });

  return {
    agentVoiceDefaults,
    agentVerticalVoiceOverrides,
    agentPropertyVoiceOverrides: Array.from(keyedPropertyOverrides.values()),
  };
}

const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  aiVoiceEnabled: true,
  voiceGender: "female",
  voiceAccent: "tiffany",
  voiceLanguages: ["English", "Spanish", "French", "German", "Italian", "Portuguese", "Hindi"],
  autoDetectLanguage: true,
  recordAudio: true,
  generateTranscripts: true,
  recordAudioOutbound: true,
  generateTranscriptsOutbound: true,
  legalDisclosureEnabled: true,
  legalDisclosureText: "This call is being recorded and transcribed for quality assurance and training purposes.",
  legalDisclosureTextOutbound: "This call may be recorded for quality and training purposes.",
  greeting: "Thank you for calling {property}. How can I help you today?",
  holdPhrase: "One moment while I pull that up for you.",
  maxCallLength: 10,
  aiDisclosureEnabled: true,
};

const DEFAULT_STATE: VoiceState = {
  unified: true,
  brandingTone: "",
  persona: "Helpful property assistant",
  toneFormality: 65,
  toneWarmth: 75,
  toneUrgency: 40,
  doExamples: [
    "Use resident's first name",
    "Offer next steps clearly",
    "Acknowledge concerns before solving",
  ],
  dontExamples: [
    "Use the word 'tenant'",
    "Make promises about timelines",
    "Discuss other residents' situations",
  ],
  channels: { voice: false, chat: false, sms: false, portal: false },
  channelAgent: { voice: "Leasing AI", chat: "Leasing AI", sms: "Leasing AI", portal: "Leasing AI" },
  channelAgentId: { voice: "4", chat: "4", sms: "4", portal: "4" },
  channelSettings: {
    chat: { greeting: "Hi! How can I help you today?", signoff: "Thanks for reaching out!" },
    sms: { greeting: "Hi {name}, this is {property}.", signoff: "" },
    voice: { greeting: "Thank you for calling {property}. How can I assist you?", signoff: "" },
    portal: { greeting: "Welcome back! How can I help?", signoff: "" },
  },
  phrasingRules: [
    { id: "pr-1", area: "Fair housing", type: "avoid", phrase: "tenant", replacement: "resident" },
    { id: "pr-2", area: "Fair housing", type: "avoid", phrase: "handicapped", replacement: "person with a disability" },
    { id: "pr-3", area: "Fair housing", type: "require", phrase: "We evaluate all applications using the same criteria" },
    { id: "pr-4", area: "Screening", type: "avoid", phrase: "We don't accept people with…" },
    { id: "pr-5", area: "Accommodation", type: "require", phrase: "We're happy to discuss reasonable accommodations" },
    { id: "pr-6", area: "Lease terms", type: "avoid", phrase: "You have to" , replacement: "The lease requires" },
    { id: "pr-7", area: "Advertising", type: "avoid", phrase: "perfect for families" },
    { id: "pr-8", area: "Advertising", type: "avoid", phrase: "great for young professionals" },
  ],
  verticalOverrides: [
    { vertical: "Conventional", enabled: false },
    { vertical: "Student", enabled: true, persona: "Friendly campus guide", brandingTone: "Casual, upbeat, and approachable. Use conversational language that resonates with college-age residents. Reference campus life and student-friendly amenities.", toneFormality: 35, toneWarmth: 85, toneUrgency: 30, doExamples: ["Use casual, relatable language", "Reference campus events and deadlines", "Mention roommate-matching options"], dontExamples: ["Use overly formal or corporate tone", "Assume financial independence", "Ignore academic calendar timing"] },
    { vertical: "Affordable", enabled: true, persona: "Supportive community assistant", brandingTone: "Warm, empathetic, and clear. Use simple, accessible language. Be sensitive to financial concerns and emphasize available resources and community support.", toneFormality: 55, toneWarmth: 90, toneUrgency: 35, doExamples: ["Use simple, accessible language", "Highlight available assistance programs", "Show empathy for financial concerns"], dontExamples: ["Use jargon or complex terminology", "Make assumptions about income", "Rush conversations about eligibility"] },
    { vertical: "Commercial", enabled: true, persona: "Professional property consultant", brandingTone: "Polished, efficient, and business-focused. Use industry terminology appropriately. Prioritize ROI, business outcomes, and professional service.", toneFormality: 85, toneWarmth: 50, toneUrgency: 55, doExamples: ["Use professional business terminology", "Lead with ROI and value propositions", "Reference market data and comparables"], dontExamples: ["Use casual or overly friendly tone", "Discuss non-business topics", "Provide unsubstantiated market claims"] },
  ],
  propertyOverrides: [
    {
      property: "Sunset Ridge Apartments",
      vertical: "Conventional",
      brandingTone: "Upscale and sophisticated. Use luxury language. Address residents formally.",
      persona: "Luxury concierge",
      toneFormality: 80,
      toneWarmth: 70,
      toneUrgency: 35,
      doExamples: ["Use luxury and premium language", "Address residents by title and last name", "Highlight exclusive amenities"],
      dontExamples: ["Use generic or budget-oriented phrasing", "Be overly casual or use slang", "Compare to other properties"],
      channels: { voice: true, chat: true, sms: true, portal: true },
    },
  ],
  agentTuning: [
    { agentId: "4", agentName: "Leasing AI", toneOverride: "Enthusiastic and sales-oriented", responseLength: "detailed", personality: "Excited about helping people find their new home", customInstructions: "Always mention current specials. Proactively offer tour scheduling.", allowEmoji: true, doExamples: ["Highlight current specials and promotions", "Proactively suggest tour scheduling", "Emphasize unique property features"], dontExamples: ["Pressure prospects into decisions", "Disparage competing properties", "Guarantee availability without checking"] },
    { agentId: "7", agentName: "Renewal AI", toneOverride: "Warm and appreciative", responseLength: "standard", personality: "Grateful for the resident's continued tenancy", customInstructions: "Lead with appreciation. Highlight community improvements since move-in.", allowEmoji: false, doExamples: ["Lead with gratitude for their residency", "Mention community improvements", "Offer flexible renewal terms"], dontExamples: ["Threaten lease non-renewal", "Rush renewal decisions", "Ignore resident concerns or complaints"] },
    { agentId: "10", agentName: "Maintenance AI", toneOverride: "Efficient and reassuring", responseLength: "concise", personality: "Focused on getting things fixed fast", customInstructions: "Always provide an estimated timeline. Follow up after resolution.", allowEmoji: false, doExamples: ["Provide clear estimated timelines", "Confirm the issue has been understood", "Follow up after resolution"], dontExamples: ["Blame the resident for the issue", "Promise exact completion times", "Dismiss concerns as minor"] },
    { agentId: "1", agentName: "Payments AI", toneOverride: "Empathetic and solution-focused", responseLength: "standard", personality: "Understanding about financial situations", customInstructions: "Never be judgmental about late payments. Always offer payment plan options when applicable.", allowEmoji: false, doExamples: ["Offer payment plan options proactively", "Show empathy for financial situations", "Clearly explain fees and deadlines"], dontExamples: ["Be judgmental about late payments", "Use threatening language about collections", "Discuss other residents' payment history"] },
    { agentId: "4", agentName: "Leasing AI", propertyName: "Sunset Ridge Apartments", toneOverride: "Refined and consultative", responseLength: "detailed", personality: "Luxury lifestyle advisor", customInstructions: "Emphasize exclusivity and premium amenities. Use aspirational language. Reference concierge services.", allowEmoji: false, doExamples: ["Use aspirational, luxury language", "Reference concierge-level services", "Highlight exclusive resident perks"], dontExamples: ["Mention pricing before value", "Use generic apartment terminology", "Compare to non-luxury competitors"] },
    { agentId: "4", agentName: "Leasing AI", propertyName: "University Commons", toneOverride: "Fun and relatable", responseLength: "concise", personality: "Campus life enthusiast", customInstructions: "Reference campus proximity, student discounts, and roommate matching. Keep it casual.", allowEmoji: true, doExamples: ["Mention roommate matching options", "Reference campus shuttle and proximity", "Highlight student-specific amenities"], dontExamples: ["Use formal corporate language", "Assume parental involvement", "Ignore move-in/move-out academic schedules"] },
  ],
  agentToneDefaults: cloneAgentToneDefaults(),
  agentVerticalToneOverrides: AGENT_TONE_VERTICAL_SEEDS.map((override) => ({
    ...override,
    settings: cloneToneSettings(override.settings),
  })),
  agentPropertyToneOverrides: AGENT_TONE_PROPERTY_SEEDS.map((override) => ({
    ...override,
    settings: cloneToneSettings(override.settings),
  })),
  agentVoiceDefaults: cloneAgentVoiceDefaults(DEFAULT_VOICE_SETTINGS),
  agentVerticalVoiceOverrides: [],
  agentPropertyVoiceOverrides: [],
  voiceSettings: cloneVoiceSettings(DEFAULT_VOICE_SETTINGS),
  brandSettings: {
    colors: {
      primary: "#6366f1",
      secondary: "#0ea5e9",
      accent: "#10b981",
    },
    logoUrl: "",
    fontFamily: "Inter",
  },
};

type VoiceContextValue = VoiceState & {
  update: (updates: Partial<VoiceState>) => void;
  addPhrasingRule: (rule: Omit<PhrasingRule, "id">) => void;
  removePhrasingRule: (id: string) => void;
  addPropertyOverride: (override: PropertyOverride) => void;
  updatePropertyOverride: (property: string, updates: Partial<PropertyOverride>) => void;
  removePropertyOverride: (property: string) => void;
  updateAgentTuning: (agentId: string, updates: Partial<AgentVoiceTuning>, propertyName?: string) => void;
  addAgentTuning: (entry: AgentVoiceTuning) => void;
  removeAgentTuning: (agentId: string, propertyName: string) => void;
  updateVerticalOverride: (vertical: string, updates: Partial<VerticalOverride>) => void;
  resetVerticalOverride: (vertical: string) => void;
  updateAgentToneDefault: (agentId: AgentToneId, partial: Partial<ToneSettings>) => void;
  resetAgentToneDefault: (agentId: AgentToneId) => void;
  addAgentVerticalToneOverride: (record: AgentVerticalToneOverride) => void;
  updateAgentVerticalToneOverride: (id: string, partial: Partial<AgentVerticalToneOverride>) => void;
  removeAgentVerticalToneOverride: (id: string) => void;
  addAgentPropertyToneOverrides: (records: AgentPropertyToneOverride[]) => void;
  updateAgentPropertyToneOverride: (id: string, partial: Partial<AgentPropertyToneOverride>) => void;
  removeAgentPropertyToneOverride: (id: string) => void;
  updateAgentVoiceDefault: (agentId: AgentToneId, partial: Partial<VoiceSettings>) => void;
  resetAgentVoiceDefault: (agentId: AgentToneId) => void;
  addAgentVerticalVoiceOverride: (record: AgentVerticalVoiceOverride) => void;
  updateAgentVerticalVoiceOverride: (id: string, partial: Partial<AgentVerticalVoiceOverride>) => void;
  removeAgentVerticalVoiceOverride: (id: string) => void;
  addAgentPropertyVoiceOverrides: (records: AgentPropertyVoiceOverride[]) => void;
  updateAgentPropertyVoiceOverride: (id: string, partial: Partial<AgentPropertyVoiceOverride>) => void;
  removeAgentPropertyVoiceOverride: (id: string) => void;
  configured: boolean;
};

const VoiceContext = createContext<VoiceContextValue | null>(null);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<VoiceState>(DEFAULT_STATE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        setState((prev) => {
          const merged = { ...prev, ...data } as VoiceState;
          const hasAgentVoiceSlices =
            Boolean(data.agentVoiceDefaults) &&
            Array.isArray(data.agentVerticalVoiceOverrides) &&
            Array.isArray(data.agentPropertyVoiceOverrides);

          if (hasAgentVoiceSlices) {
            return merged;
          }

          const migratedVoiceSlices = buildAgentVoiceSlicesFromLegacy(merged);
          return {
            ...merged,
            ...migratedVoiceSlices,
          };
        });
      }
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state, mounted]);

  const update = useCallback((updates: Partial<VoiceState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const addPhrasingRule = useCallback((rule: Omit<PhrasingRule, "id">) => {
    setState((prev) => ({
      ...prev,
      phrasingRules: [...prev.phrasingRules, { ...rule, id: `pr-${Date.now()}` }],
    }));
  }, []);

  const removePhrasingRule = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      phrasingRules: prev.phrasingRules.filter((r) => r.id !== id),
    }));
  }, []);

  const addPropertyOverride = useCallback((override: PropertyOverride) => {
    setState((prev) => ({
      ...prev,
      propertyOverrides: [...prev.propertyOverrides.filter((o) => o.property !== override.property), override],
    }));
  }, []);

  const updatePropertyOverride = useCallback((property: string, updates: Partial<PropertyOverride>) => {
    setState((prev) => ({
      ...prev,
      propertyOverrides: prev.propertyOverrides.map((o) => o.property === property ? { ...o, ...updates } : o),
    }));
  }, []);

  const removePropertyOverride = useCallback((property: string) => {
    setState((prev) => ({
      ...prev,
      propertyOverrides: prev.propertyOverrides.filter((o) => o.property !== property),
    }));
  }, []);

  const updateAgentTuning = useCallback((agentId: string, updates: Partial<AgentVoiceTuning>, propertyName?: string) => {
    setState((prev) => ({
      ...prev,
      agentTuning: prev.agentTuning.map((t) =>
        t.agentId === agentId && t.propertyName === propertyName ? { ...t, ...updates } : t
      ),
    }));
  }, []);

  const addAgentTuning = useCallback((entry: AgentVoiceTuning) => {
    setState((prev) => ({
      ...prev,
      agentTuning: [...prev.agentTuning.filter((t) => !(t.agentId === entry.agentId && t.propertyName === entry.propertyName)), entry],
    }));
  }, []);

  const removeAgentTuning = useCallback((agentId: string, propertyName: string) => {
    setState((prev) => ({
      ...prev,
      agentTuning: prev.agentTuning.filter((t) => !(t.agentId === agentId && t.propertyName === propertyName)),
    }));
  }, []);

  const updateVerticalOverride = useCallback((vertical: string, updates: Partial<VerticalOverride>) => {
    setState((prev) => ({
      ...prev,
      verticalOverrides: prev.verticalOverrides.map((v) =>
        v.vertical === vertical ? { ...v, ...updates } : v
      ),
    }));
  }, []);

  const resetVerticalOverride = useCallback((vertical: string) => {
    setState((prev) => ({
      ...prev,
      verticalOverrides: prev.verticalOverrides.map((v) =>
        v.vertical === vertical ? { vertical, enabled: false } : v
      ),
    }));
  }, []);

  const updateAgentToneDefault = useCallback((agentId: AgentToneId, partial: Partial<ToneSettings>) => {
    setState((prev) => ({
      ...prev,
      agentToneDefaults: {
        ...prev.agentToneDefaults,
        [agentId]: {
          ...prev.agentToneDefaults[agentId],
          ...partial,
        },
      },
    }));
  }, []);

  const resetAgentToneDefault = useCallback((agentId: AgentToneId) => {
    setState((prev) => ({
      ...prev,
      agentToneDefaults: {
        ...prev.agentToneDefaults,
        [agentId]: cloneToneSettings(AGENT_TONE_SEED_DEFAULTS[agentId]),
      },
    }));
  }, []);

  const addAgentVerticalToneOverride = useCallback((record: AgentVerticalToneOverride) => {
    setState((prev) => ({
      ...prev,
      agentVerticalToneOverrides: [
        ...prev.agentVerticalToneOverrides.filter(
          (override) => !(override.agentId === record.agentId && override.vertical === record.vertical),
        ),
        record,
      ],
    }));
  }, []);

  const updateAgentVerticalToneOverride = useCallback((id: string, partial: Partial<AgentVerticalToneOverride>) => {
    setState((prev) => ({
      ...prev,
      agentVerticalToneOverrides: prev.agentVerticalToneOverrides.map((override) =>
        override.id === id
          ? {
              ...override,
              ...partial,
              settings: partial.settings
                ? { ...override.settings, ...partial.settings }
                : override.settings,
            }
          : override,
      ),
    }));
  }, []);

  const removeAgentVerticalToneOverride = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      agentVerticalToneOverrides: prev.agentVerticalToneOverrides.filter((override) => override.id !== id),
    }));
  }, []);

  const addAgentPropertyToneOverrides = useCallback((records: AgentPropertyToneOverride[]) => {
    setState((prev) => {
      const next = prev.agentPropertyToneOverrides.filter(
        (existing) =>
          !records.some(
            (incoming) =>
              incoming.agentId === existing.agentId &&
              incoming.propertyName === existing.propertyName,
          ),
      );
      return {
        ...prev,
        agentPropertyToneOverrides: [...next, ...records],
      };
    });
  }, []);

  const updateAgentPropertyToneOverride = useCallback((id: string, partial: Partial<AgentPropertyToneOverride>) => {
    setState((prev) => ({
      ...prev,
      agentPropertyToneOverrides: prev.agentPropertyToneOverrides.map((override) =>
        override.id === id
          ? {
              ...override,
              ...partial,
              settings: partial.settings
                ? { ...override.settings, ...partial.settings }
                : override.settings,
            }
          : override,
      ),
    }));
  }, []);

  const removeAgentPropertyToneOverride = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      agentPropertyToneOverrides: prev.agentPropertyToneOverrides.filter((override) => override.id !== id),
    }));
  }, []);

  const updateAgentVoiceDefault = useCallback((agentId: AgentToneId, partial: Partial<VoiceSettings>) => {
    setState((prev) => ({
      ...prev,
      agentVoiceDefaults: {
        ...prev.agentVoiceDefaults,
        [agentId]: {
          ...prev.agentVoiceDefaults[agentId],
          ...partial,
          voiceLanguages:
            partial.voiceLanguages !== undefined
              ? [...partial.voiceLanguages]
              : prev.agentVoiceDefaults[agentId].voiceLanguages,
        },
      },
    }));
  }, []);

  const resetAgentVoiceDefault = useCallback((agentId: AgentToneId) => {
    setState((prev) => ({
      ...prev,
      agentVoiceDefaults: {
        ...prev.agentVoiceDefaults,
        [agentId]: cloneVoiceSettings(prev.voiceSettings),
      },
    }));
  }, []);

  const addAgentVerticalVoiceOverride = useCallback((record: AgentVerticalVoiceOverride) => {
    setState((prev) => ({
      ...prev,
      agentVerticalVoiceOverrides: [
        ...prev.agentVerticalVoiceOverrides.filter(
          (override) => !(override.agentId === record.agentId && override.vertical === record.vertical),
        ),
        {
          ...record,
          settings: cloneVoiceSettings(record.settings),
        },
      ],
    }));
  }, []);

  const updateAgentVerticalVoiceOverride = useCallback((id: string, partial: Partial<AgentVerticalVoiceOverride>) => {
    setState((prev) => ({
      ...prev,
      agentVerticalVoiceOverrides: prev.agentVerticalVoiceOverrides.map((override) =>
        override.id === id
          ? {
              ...override,
              ...partial,
              settings: partial.settings
                ? {
                    ...override.settings,
                    ...partial.settings,
                    voiceLanguages:
                      partial.settings.voiceLanguages !== undefined
                        ? [...partial.settings.voiceLanguages]
                        : override.settings.voiceLanguages,
                  }
                : override.settings,
            }
          : override,
      ),
    }));
  }, []);

  const removeAgentVerticalVoiceOverride = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      agentVerticalVoiceOverrides: prev.agentVerticalVoiceOverrides.filter((override) => override.id !== id),
    }));
  }, []);

  const addAgentPropertyVoiceOverrides = useCallback((records: AgentPropertyVoiceOverride[]) => {
    setState((prev) => {
      const next = prev.agentPropertyVoiceOverrides.filter(
        (existing) =>
          !records.some(
            (incoming) =>
              incoming.agentId === existing.agentId &&
              incoming.propertyName === existing.propertyName,
          ),
      );
      return {
        ...prev,
        agentPropertyVoiceOverrides: [
          ...next,
          ...records.map((record) => ({
            ...record,
            settings: cloneVoiceSettings(record.settings),
          })),
        ],
      };
    });
  }, []);

  const updateAgentPropertyVoiceOverride = useCallback((id: string, partial: Partial<AgentPropertyVoiceOverride>) => {
    setState((prev) => ({
      ...prev,
      agentPropertyVoiceOverrides: prev.agentPropertyVoiceOverrides.map((override) =>
        override.id === id
          ? {
              ...override,
              ...partial,
              settings: partial.settings
                ? {
                    ...override.settings,
                    ...partial.settings,
                    voiceLanguages:
                      partial.settings.voiceLanguages !== undefined
                        ? [...partial.settings.voiceLanguages]
                        : override.settings.voiceLanguages,
                  }
                : override.settings,
            }
          : override,
      ),
    }));
  }, []);

  const removeAgentPropertyVoiceOverride = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      agentPropertyVoiceOverrides: prev.agentPropertyVoiceOverrides.filter((override) => override.id !== id),
    }));
  }, []);

  const configured = state.brandingTone.trim().length > 0 || Object.values(state.channels).some(Boolean);

  return (
    <VoiceContext.Provider
      value={{
        ...state,
        update,
        addPhrasingRule,
        removePhrasingRule,
        addPropertyOverride,
        updatePropertyOverride,
        removePropertyOverride,
        updateAgentTuning,
        addAgentTuning,
        removeAgentTuning,
        updateVerticalOverride,
        resetVerticalOverride,
        updateAgentToneDefault,
        resetAgentToneDefault,
        addAgentVerticalToneOverride,
        updateAgentVerticalToneOverride,
        removeAgentVerticalToneOverride,
        addAgentPropertyToneOverrides,
        updateAgentPropertyToneOverride,
        removeAgentPropertyToneOverride,
        updateAgentVoiceDefault,
        resetAgentVoiceDefault,
        addAgentVerticalVoiceOverride,
        updateAgentVerticalVoiceOverride,
        removeAgentVerticalVoiceOverride,
        addAgentPropertyVoiceOverrides,
        updateAgentPropertyVoiceOverride,
        removeAgentPropertyVoiceOverride,
        configured,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error("useVoice must be used within VoiceProvider");
  return ctx;
}
