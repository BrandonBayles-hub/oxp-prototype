"use client"

/**
 * Shared Voice selector and Test Agent chat panel used across all product pages
 * (Leasing AI, Payments AI, Maintenance AI, Renewals AI).
 */
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  Play, Check, Volume2, ChevronRight, Bot, User, RefreshCw, Send,
  Settings2, Mic2, MessageSquare, FileCode2, GitMerge, BarChart3,
  ChevronDown, ChevronUp, Brain, ArrowRight, PhoneCall, Mail, Ticket,
  TrendingUp, CheckCircle2, AlertTriangle, Zap,
} from "lucide-react"

// ── Shared types ───────────────────────────────────────────────────────────────

export type AgentTopTab = "configure" | "voices" | "prompt" | "test" | "escalations" | "reporting"
export type ProductId = "leasing" | "payments" | "maintenance" | "renewals"

export const AGENT_TOP_TABS: { id: AgentTopTab; label: string; icon: typeof Settings2 }[] = [
  { id: "configure",   label: "Configure",            icon: Settings2     },
  { id: "voices",      label: "Voice & Name",         icon: Mic2          },
  { id: "prompt",      label: "Prompt Config",        icon: FileCode2     },
  { id: "test",        label: "Agent Testing",        icon: MessageSquare },
  { id: "escalations", label: "Escalations",          icon: GitMerge      },
  { id: "reporting",   label: "Reporting & Evolution",icon: BarChart3     },
]

// ── Voice data (shared across all products) ────────────────────────────────────

export interface Voice {
  id: string
  name: string
  descriptor: string
  accent?: string
  avatar: string
  avatarColor: string
}

export const VOICES: Voice[] = [
  { id: "jordan",  name: "Jordan",  descriptor: "Professional",       accent: "American",   avatar: "JO", avatarColor: "bg-violet-500"  },
  { id: "maya",    name: "Maya",    descriptor: "Warm & Friendly",    accent: "American",   avatar: "MA", avatarColor: "bg-pink-500"    },
  { id: "alex",    name: "Alex",    descriptor: "Crisp & Clear",      accent: "American",   avatar: "AL", avatarColor: "bg-blue-500"    },
  { id: "sam",     name: "Sam",     descriptor: "Conversational",     accent: "American",   avatar: "SA", avatarColor: "bg-amber-500"   },
  { id: "riley",   name: "Riley",   descriptor: "Energetic",          accent: "American",   avatar: "RI", avatarColor: "bg-emerald-500" },
  { id: "morgan",  name: "Morgan",  descriptor: "Calm & Reassuring",  accent: "British",    avatar: "MO", avatarColor: "bg-indigo-500"  },
  { id: "taylor",  name: "Taylor",  descriptor: "Direct & Efficient", accent: "American",   avatar: "TA", avatarColor: "bg-orange-500"  },
  { id: "casey",   name: "Casey",   descriptor: "Approachable",       accent: "Australian", avatar: "CA", avatarColor: "bg-cyan-500"    },
]

// ── TopTab bar (reusable header strip) ─────────────────────────────────────────

export function AgentTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: AgentTopTab
  onTabChange: (t: AgentTopTab) => void
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-white px-1.5 py-1.5 w-fit">
      {AGENT_TOP_TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onTabChange(id)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            activeTab === id
              ? "bg-zinc-900 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-zinc-50",
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  )
}

// ── Voice selector tab ─────────────────────────────────────────────────────────

export function VoiceTab({
  selectedVoice,
  onSelect,
}: {
  selectedVoice: string
  onSelect: (id: string) => void
}) {
  const [playing, setPlaying] = useState<string | null>(null)
  const selected = VOICES.find(v => v.id === selectedVoice) ?? VOICES[0]

  function togglePlay(id: string) {
    setPlaying(prev => (prev === id ? null : id))
    setTimeout(() => setPlaying(null), 3000)
  }

  return (
    <div className="max-w-lg space-y-4">
      {/* Active voice */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Active Voice</p>
        <div className="flex items-center gap-3 rounded-xl border-2 border-zinc-900 bg-white px-4 py-3.5 shadow-sm">
          <div className={cn("h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0", selected.avatarColor)}>
            {selected.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{selected.name}</p>
            <p className="text-xs text-muted-foreground">{selected.descriptor}{selected.accent ? ` · ${selected.accent}` : ""}</p>
          </div>
          <button
            type="button"
            onClick={() => togglePlay(selected.id)}
            className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center transition-colors shrink-0",
              playing === selected.id ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
            )}
          >
            {playing === selected.id ? <Volume2 className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
          </button>
        </div>
      </div>

      {/* Voice list */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Available Voices</p>
        <div className="rounded-xl border border-border bg-white overflow-hidden divide-y divide-border">
          {VOICES.map(voice => {
            const isSelected = voice.id === selectedVoice
            const isPlaying  = playing === voice.id
            return (
              <button
                key={voice.id}
                type="button"
                onClick={() => onSelect(voice.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors",
                  isSelected ? "bg-zinc-50" : "bg-white hover:bg-zinc-50/70",
                )}
              >
                <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0", voice.avatarColor)}>
                  {voice.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{voice.name}</p>
                </div>
                <p className="text-xs text-muted-foreground shrink-0 mr-3">{voice.descriptor}</p>
                {isSelected ? (
                  <Check className="h-4 w-4 text-zinc-900 shrink-0" />
                ) : (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); togglePlay(voice.id) }}
                    className={cn(
                      "h-7 w-7 rounded-full flex items-center justify-center transition-colors shrink-0",
                      isPlaying ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200",
                    )}
                  >
                    {isPlaying ? <Volume2 className="h-3 w-3" /> : <Play className="h-3 w-3 ml-0.5" />}
                  </button>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <button
        type="button"
        className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-zinc-400 transition-colors flex items-center justify-between"
      >
        <span>Explore more voices</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

// ── Test Agent chat tab ────────────────────────────────────────────────────────

export interface ChatScenario {
  label: string
  messages: { role: "eli" | "prospect"; text: string }[]
}

export function TestAgentTab({
  productLabel,
  voiceName,
  scenarios,
}: {
  productLabel: string
  voiceName: string
  scenarios: ChatScenario[]
}) {
  const [scenarioIdx, setScenarioIdx] = useState(0)
  const [visibleCount, setVisibleCount] = useState(0)
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const scenario = scenarios[scenarioIdx]

  function loadScenario(idx: number) {
    setScenarioIdx(idx)
    setVisibleCount(0)
    setInput("")
  }

  useEffect(() => {
    if (visibleCount >= scenario.messages.length) return
    const t = setTimeout(() => setVisibleCount(n => n + 1), visibleCount === 0 ? 300 : 700)
    return () => clearTimeout(t)
  }, [visibleCount, scenario.messages.length])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [visibleCount])

  return (
    <div className="max-w-xl flex flex-col" style={{ height: "calc(100vh - 18rem)" }}>
      <div className="rounded-xl border border-border bg-white overflow-hidden flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-zinc-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-none">ELI — {productLabel}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Voice: {voiceName}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Preview mode
          </span>
        </div>

        {/* Scenario pills */}
        <div className="flex gap-1.5 px-3 py-2 border-b border-border bg-zinc-50/40 shrink-0 overflow-x-auto">
          {scenarios.map((s, i) => (
            <button key={i} type="button" onClick={() => loadScenario(i)}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-medium border transition-colors shrink-0",
                i === scenarioIdx
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-muted-foreground border-border hover:border-zinc-400 hover:text-foreground",
              )}>
              {s.label}
            </button>
          ))}
          <button type="button" onClick={() => loadScenario(scenarioIdx)}
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-medium text-muted-foreground border border-border bg-white hover:border-zinc-400 hover:text-foreground transition-colors shrink-0">
            <RefreshCw className="h-3 w-3" /> Replay
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
          {scenario.messages.slice(0, visibleCount).map((msg, i) => (
            <div key={i} className={cn("flex gap-2.5", msg.role === "prospect" ? "justify-end" : "justify-start")}>
              {msg.role === "eli" && (
                <div className="h-6 w-6 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
              )}
              <div className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed",
                msg.role === "eli"
                  ? "bg-zinc-100 text-foreground rounded-tl-sm"
                  : "bg-zinc-900 text-white rounded-tr-sm",
              )}>
                {msg.text}
              </div>
              {msg.role === "prospect" && (
                <div className="h-6 w-6 rounded-full bg-zinc-200 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5 text-zinc-600" />
                </div>
              )}
            </div>
          ))}
          {visibleCount < scenario.messages.length && (
            <div className="flex gap-2.5">
              <div className="h-6 w-6 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="bg-zinc-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-3 py-3 border-t border-border bg-white shrink-0">
          <p className="text-[10px] text-muted-foreground/60 mb-2 text-center">Type as a resident to continue the conversation</p>
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (input.trim()) setInput("") } }}
              placeholder="Reply as a resident…"
              rows={2}
              className="flex-1 rounded-xl border border-border bg-zinc-50 px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-zinc-900/20 placeholder:text-muted-foreground/60 leading-relaxed"
            />
            <button type="button" className={cn(buttonVariants({ variant: "eli", size: "sm" }), "shrink-0 px-2.5")}>
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Prompt Config tab ──────────────────────────────────────────────────────────

const PROMPT_SECTIONS: Record<ProductId, { section: string; content: string }[]> = {
  leasing: [
    { section: "Brand Introduction", content: "You are ELI, the leasing assistant for {property_name}. You help prospective residents explore available apartments, schedule tours, and answer questions about our communities." },
    { section: "Tone Guidelines", content: "Be warm, upbeat, and professional. Use first names when possible. Avoid jargon. Keep responses concise — no more than 3–4 sentences per reply." },
    { section: "Tour Scheduling", content: "When a prospect asks to schedule a tour, collect their preferred date, time, and tour type (in-person or virtual). Confirm availability and send a calendar invite. If unavailable, offer 2–3 alternatives." },
    { section: "Off-Topic Deflection", content: "If asked about topics outside leasing (e.g., maintenance, billing), politely redirect: 'That's handled by a different team — I can connect you with the right contact.'" },
  ],
  payments: [
    { section: "Brand Introduction", content: "You are ELI, the payments assistant for {property_name}. You help residents understand their account balance, make payments, and resolve billing questions." },
    { section: "Tone Guidelines", content: "Be empathetic and calm — payment conversations can be stressful. Avoid accusatory language. Lead with solutions. Never shame a resident for a late payment." },
    { section: "Payment Handling", content: "When a resident asks to pay rent, provide the payment portal link and available methods. If they report a payment issue, collect their unit number and payment date, then escalate to the accounting team." },
    { section: "Off-Topic Deflection", content: "For non-payment topics, respond: 'I specialize in payments — let me connect you with the right team for that.'" },
  ],
  maintenance: [
    { section: "Brand Introduction", content: "You are ELI, the maintenance coordinator for {property_name}. You help residents submit work orders, track repair status, and handle emergency situations." },
    { section: "Triage Protocol", content: "For every request, determine urgency: Emergency (fire, flood, gas leak, no heat in winter) → emergency line immediately. Urgent (no hot water, broken locks) → 24-hour SLA. Routine → 3–5 day SLA." },
    { section: "Entry Permission", content: "Always ask: 'Does our maintenance team have permission to enter your unit if you're not home?' Record the resident's answer before scheduling." },
    { section: "Off-Topic Deflection", content: "For leasing or billing questions: 'That's outside my area — I'll connect you with the right team right away.'" },
  ],
  renewals: [
    { section: "Brand Introduction", content: "You are ELI, the renewal specialist for {property_name}. You're reaching out because the resident's lease is coming up and you'd love to help them explore their options for staying." },
    { section: "Offer Presentation", content: "Present renewal offers enthusiastically but without pressure. Lead with the best available term. If a resident hesitates, acknowledge their concern and offer to answer questions before they decide." },
    { section: "Objection Handling", content: "'Too expensive' → offer shorter term or mention incentives. 'Not sure yet' → offer to follow up in 1–2 weeks. 'Moving out' → thank them and initiate move-out checklist." },
    { section: "Off-Topic Deflection", content: "For maintenance or billing topics: 'I specialize in renewals — let me make sure the right person helps you with that.'" },
  ],
}

export function PromptTab({ productId }: { productId: ProductId }) {
  const sections = PROMPT_SECTIONS[productId]
  const [expanded, setExpanded] = useState<string | null>(sections[0].section)
  const [editing, setEditing] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(sections.map(s => [s.section, s.content]))
  )

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">View and edit ELI's prompt. Each section controls a specific aspect of the conversation flow and brand voice.</p>
        <button type="button" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
          <Brain className="h-3.5 w-3.5" aria-hidden />
          Rebuild Prompt
        </button>
      </div>
      {sections.map(s => {
        const isOpen = expanded === s.section
        const isEditing = editing === s.section
        return (
          <div key={s.section} className="rounded-xl border border-border bg-white overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-50 transition-colors"
              onClick={() => setExpanded(isOpen ? null : s.section)}
            >
              <span className="text-sm font-medium text-foreground">{s.section}</span>
              {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {isOpen && (
              <div className="px-4 pb-4 border-t border-border space-y-3">
                {isEditing ? (
                  <>
                    <textarea
                      value={values[s.section]}
                      onChange={e => setValues(v => ({ ...v, [s.section]: e.target.value }))}
                      rows={4}
                      className="mt-3 w-full rounded-lg border border-border bg-zinc-50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900/20 resize-none leading-relaxed"
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setEditing(null)} className={cn(buttonVariants({ variant: "eli", size: "sm" }))}>Save</button>
                      <button type="button" onClick={() => setEditing(null)} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{values[s.section]}</p>
                    <button type="button" onClick={() => setEditing(s.section)} className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>Edit Section</button>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
      <div className="rounded-xl border border-dashed border-border bg-zinc-50/50 px-4 py-3 text-center">
        <button type="button" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground")}>+ Add Custom Section</button>
      </div>
    </div>
  )
}

// ── Escalations tab ────────────────────────────────────────────────────────────

type EscalationChannel = "human" | "email" | "ticket"
type EscalationRule = { trigger: string; condition: string; route: string; channel: EscalationChannel }

const ESCALATION_RULES: Record<ProductId, EscalationRule[]> = {
  leasing: [
    { trigger: "Fair Housing / Legal",    condition: "Keywords: discrimination, lawsuit, fair housing, ADA",             route: "Leasing Manager + Legal email",       channel: "human"  },
    { trigger: "Same-Day Tour",           condition: "Tour request within 1 hour of office closing",                     route: "On-call Leasing Agent",               channel: "human"  },
    { trigger: "Corporate / VIP Lead",    condition: "Prospect mentions 5+ units or corporate housing",                  route: "Regional Sales Manager",              channel: "email"  },
    { trigger: "Unresolved After 3 Turns",condition: "3 consecutive turns without resolution",                           route: "Leasing team queue",                  channel: "ticket" },
  ],
  payments: [
    { trigger: "High Balance",            condition: "Outstanding balance > $500",                                       route: "Accounting Team",                     channel: "human"  },
    { trigger: "Payment Dispute",         condition: "Keywords: dispute, wrong charge, refund, didn't pay",              route: "Accounting Manager — ticket created", channel: "ticket" },
    { trigger: "Eviction Risk",           condition: "Keywords: eviction, court, attorney, legal action",                route: "Property Manager + Legal",            channel: "human"  },
    { trigger: "NSF / Returned Payment",  condition: "Keywords: NSF, returned payment, bank error",                     route: "Accounting Team via email",           channel: "email"  },
  ],
  maintenance: [
    { trigger: "Life Safety Emergency",   condition: "Keywords: fire, flood, gas leak, no heat (winter), structural",   route: "Emergency line + 911 advisory",       channel: "human"  },
    { trigger: "Repeat Issue",            condition: "Same category work order 3+ times in 90 days",                    route: "Maintenance Manager review queue",    channel: "ticket" },
    { trigger: "Resident Anger",          condition: "Negative sentiment high for 2+ consecutive turns",                 route: "Property Manager",                    channel: "human"  },
    { trigger: "Vendor Unavailable",      condition: "No vendor available within SLA window",                           route: "Maintenance Manager to source backup",channel: "email"  },
  ],
  renewals: [
    { trigger: "Move-Out Confirmed",      condition: "Resident confirms non-renewal",                                   route: "Leasing team + move-out checklist",   channel: "ticket" },
    { trigger: "Counter-Offer Request",   condition: "Resident asks for price below published rates",                    route: "Leasing Manager for approval",        channel: "human"  },
    { trigger: "Legal / Rent Control",    condition: "Keywords: rent control, attorney, housing authority",              route: "Property Manager + Legal",            channel: "human"  },
    { trigger: "Corporate Lease",         condition: "Resident mentions employer-sponsored housing",                     route: "Regional Sales Manager",              channel: "email"  },
  ],
}

const CHANNEL_META: Record<EscalationChannel, { icon: typeof PhoneCall; label: string; color: string }> = {
  human:  { icon: PhoneCall, label: "Live Agent",     color: "bg-red-50 text-red-700 border-red-200"    },
  email:  { icon: Mail,      label: "Email Alert",    color: "bg-blue-50 text-blue-700 border-blue-200"  },
  ticket: { icon: Ticket,    label: "Create Ticket",  color: "bg-amber-50 text-amber-700 border-amber-200" },
}

export function EscalationsTab({ productId }: { productId: ProductId }) {
  const rules = ESCALATION_RULES[productId]
  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Define when and how ELI hands off conversations. Each rule specifies a trigger, condition, and routing path.</p>
        <button type="button" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>+ Add Rule</button>
      </div>
      {rules.map(rule => {
        const meta = CHANNEL_META[rule.channel]
        const Icon = meta.icon
        return (
          <div key={rule.trigger} className="rounded-xl border border-border bg-white p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", meta.color)}>
                    <Icon className="h-3 w-3" aria-hidden />
                    {meta.label}
                  </span>
                  <span className="text-sm font-semibold text-foreground">{rule.trigger}</span>
                </div>
                <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">When:</span> {rule.condition}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ArrowRight className="h-3 w-3 shrink-0" aria-hidden />
                  {rule.route}
                </div>
              </div>
              <button type="button" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "shrink-0 text-xs")}>Edit</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Reporting & Evolution tab ──────────────────────────────────────────────────

type ReportingData = {
  volume: number; csat: number; resolution: number; escalation: number
  topTopics: { topic: string; pct: number }[]
  evolutionLog: { date: string; change: string; impact: string }[]
}

const REPORTING_DATA: Record<ProductId, ReportingData> = {
  leasing: {
    volume: 1284, csat: 4.6, resolution: 87, escalation: 6,
    topTopics: [
      { topic: "Tour scheduling", pct: 42 }, { topic: "Availability inquiry", pct: 31 },
      { topic: "Pricing questions", pct: 14 }, { topic: "Application status", pct: 8 }, { topic: "Other", pct: 5 },
    ],
    evolutionLog: [
      { date: "Apr 2", change: "Added weekend tour availability language",           impact: "+9% Saturday bookings"          },
      { date: "Mar 28", change: "Improved virtual tour fallback when in-person full", impact: "+14% overall conversion"        },
      { date: "Mar 21", change: "Shortened average response length by 18%",          impact: "+0.2 CSAT score"                },
    ],
  },
  payments: {
    volume: 986, csat: 4.3, resolution: 79, escalation: 12,
    topTopics: [
      { topic: "Balance inquiry", pct: 38 }, { topic: "Late fee questions", pct: 25 },
      { topic: "Payment portal help", pct: 19 }, { topic: "Payment plans", pct: 11 }, { topic: "Other", pct: 7 },
    ],
    evolutionLog: [
      { date: "Apr 3",  change: "Softened tone for late payment conversations",         impact: "+0.4 CSAT score"             },
      { date: "Mar 25", change: "Added proactive grace period reminder language",        impact: "-18% escalation rate"        },
      { date: "Mar 17", change: "Improved payment portal link delivery on mobile",       impact: "+22% direct payment completions" },
    ],
  },
  maintenance: {
    volume: 1547, csat: 4.5, resolution: 83, escalation: 9,
    topTopics: [
      { topic: "Work order submission", pct: 48 }, { topic: "Status updates", pct: 24 },
      { topic: "Emergency triage", pct: 11 }, { topic: "Vendor scheduling", pct: 10 }, { topic: "Other", pct: 7 },
    ],
    evolutionLog: [
      { date: "Apr 4",  change: "Improved emergency keyword detection (12 new phrases)", impact: "-2 min avg emergency response"     },
      { date: "Mar 30", change: "Added entry permission ask to all scheduled visits",     impact: "+31% resident satisfaction on visit day" },
      { date: "Mar 22", change: "Expanded triage category list",                          impact: "-24% unclassified work orders"     },
    ],
  },
  renewals: {
    volume: 612, csat: 4.4, resolution: 74, escalation: 8,
    topTopics: [
      { topic: "Renewal offer review", pct: 44 }, { topic: "Pricing negotiation", pct: 22 },
      { topic: "Move-out confirmed", pct: 17 }, { topic: "Lease term questions", pct: 11 }, { topic: "Other", pct: 6 },
    ],
    evolutionLog: [
      { date: "Apr 1",  change: "Added incentive language for 12-month commitments",    impact: "+11% 12-month selection rate"       },
      { date: "Mar 27", change: "Improved objection handling for price concerns",        impact: "+8% retention after price objection" },
      { date: "Mar 19", change: "Shortened initial outreach message by 30%",             impact: "+16% open-to-response rate"         },
    ],
  },
}

export function ReportingTab({ productId }: { productId: ProductId }) {
  const data = REPORTING_DATA[productId]
  const [autoEvolve, setAutoEvolve] = useState(true)

  return (
    <div className="max-w-6xl space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Conversations (30d)", value: data.volume.toLocaleString(), icon: MessageSquare, color: "text-blue-600"    },
          { label: "CSAT Score",          value: `${data.csat} / 5.0`,         icon: CheckCircle2,  color: "text-emerald-600" },
          { label: "Self-Resolved",       value: `${data.resolution}%`,        icon: TrendingUp,    color: "text-purple-600"  },
          { label: "Escalation Rate",     value: `${data.escalation}%`,        icon: AlertTriangle, color: "text-amber-600"   },
        ].map(m => {
          const Icon = m.icon
          return (
            <div key={m.label} className="rounded-xl border border-border bg-white p-4 space-y-2">
              <Icon className={cn("h-4 w-4", m.color)} aria-hidden />
              <p className="text-xl font-bold text-foreground">{m.value}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
            </div>
          )
        })}
      </div>

      {/* Top topics */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Top Topics</p>
        <div className="rounded-xl border border-border bg-white overflow-hidden divide-y divide-border">
          {data.topTopics.map(t => (
            <div key={t.topic} className="px-4 py-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{t.topic}</span>
                <span className="text-muted-foreground tabular-nums">{t.pct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                <div className="h-full rounded-full bg-zinc-800 transition-all duration-500" style={{ width: `${t.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Auto-Evolve toggle */}
      <div className="rounded-xl border border-border bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-zinc-900" aria-hidden />
            <span className="text-sm font-semibold text-foreground">Auto-Analyze & Evolve</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoEvolve}
            onClick={() => setAutoEvolve(p => !p)}
            className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
              autoEvolve ? "bg-zinc-900" : "bg-zinc-300"
            )}
          >
            <span className={cn(
              "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
              autoEvolve ? "translate-x-4" : "translate-x-1"
            )} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          When enabled, ELI automatically analyzes conversation outcomes, identifies patterns in escalations and low CSAT, and proposes prompt improvements weekly. All changes require your approval before going live.
        </p>
        {autoEvolve && (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" aria-hidden />
            Active — reviewing weekly
          </span>
        )}
      </div>

      {/* Evolution log */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Evolution Log</p>
        <div className="space-y-2">
          {data.evolutionLog.map(entry => (
            <div key={entry.date} className="rounded-xl border border-border bg-white px-4 py-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-6 w-6 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                  <Brain className="h-3 w-3 text-zinc-600" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{entry.change}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{entry.date}</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                {entry.impact}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
