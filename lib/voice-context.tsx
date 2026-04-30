"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "janet-poc-voice-v3";

export type PhrasingRule = {
  id: string;
  area: string;
  type: "avoid" | "require" | "replace";
  phrase: string;
  replacement?: string;
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
};

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
  configured: boolean;
};

const VoiceContext = createContext<VoiceContextValue | null>(null);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<VoiceState>(DEFAULT_STATE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        setState((prev) => ({ ...prev, ...data }));
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
