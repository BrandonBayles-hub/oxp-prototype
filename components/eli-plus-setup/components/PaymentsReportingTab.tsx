"use client"

/**
 * Enhanced Reporting & Evolution tab for Payments AI.
 *
 * Replaces the generic ReportingTab with payment-specific outcome metrics,
 * a weekly check-in banner, and a staged improvement review queue.
 */
import { useState } from "react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  MessageSquare, CheckCircle2, TrendingUp, AlertTriangle, Zap,
  Brain, DollarSign, CreditCard, Clock, ArrowUpRight, ArrowDownRight,
  Minus, ChevronDown, ChevronUp, Eye, Sparkles, CalendarDays,
  ShieldCheck, Lightbulb,
} from "lucide-react"

// ── Weekly Check-in Banner ─────────────────────────────────────────────────────

const WEEKLY_INSIGHTS = [
  { text: "Late fee conversations down 18% after grace period reminder change", trend: "up" as const },
  { text: "3 residents completed payment plans this week (vs 1 last week)", trend: "up" as const },
  { text: "1 suggested improvement ready for your review", trend: "neutral" as const },
]

function WeeklyBanner() {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <CalendarDays className="h-4 w-4 text-emerald-700" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">This Week with ELI</p>
            <p className="text-xs text-emerald-700 font-medium">
              Week of Apr 1–7 &middot; Collection rate up 4.2%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <ArrowUpRight className="h-3 w-3" aria-hidden />
            Improving
          </span>
          {expanded
            ? <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />}
        </div>
      </button>
      {expanded && (
        <div className="px-5 pb-4 space-y-2 border-t border-emerald-100">
          <p className="text-xs text-muted-foreground pt-3 pb-1 font-medium uppercase tracking-wide">Key insights</p>
          {WEEKLY_INSIGHTS.map((insight, i) => (
            <div key={i} className="flex items-start gap-2.5">
              {insight.trend === "up" && <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" aria-hidden />}
              {insight.trend === "neutral" && <Minus className="h-3.5 w-3.5 text-zinc-400 shrink-0 mt-0.5" aria-hidden />}
              <p className="text-sm text-foreground leading-snug">{insight.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Outcome Confidence Section ─────────────────────────────────────────────────

interface OutcomeMetric {
  label: string
  value: string
  subtext: string
  trend: "up" | "down" | "flat"
  trendLabel: string
  icon: typeof DollarSign
  attribution?: string
}

const OUTCOME_METRICS: OutcomeMetric[] = [
  {
    label: "Collection Influence",
    value: "$47,200",
    subtext: "payments within 48h of ELI conversation",
    trend: "up",
    trendLabel: "+12% vs last month",
    icon: DollarSign,
    attribution: "Improved after grace period language update on Mar 25",
  },
  {
    label: "Payment Plan Completion",
    value: "6 of 8",
    subtext: "active plans on track",
    trend: "up",
    trendLabel: "75% completion rate",
    icon: CreditCard,
    attribution: "Softer tone in plan setup conversations is driving follow-through",
  },
  {
    label: "Late Fee Resolution",
    value: "72%",
    subtext: "resolved without escalation",
    trend: "up",
    trendLabel: "+8pp vs last month",
    icon: ShieldCheck,
    attribution: "Proactive reminder language reduced escalation triggers",
  },
  {
    label: "Avg Resolution Time",
    value: "2.4 min",
    subtext: "per payment conversation",
    trend: "flat",
    trendLabel: "Stable",
    icon: Clock,
  },
]

function OutcomeCard({ metric }: { metric: OutcomeMetric }) {
  const [showAttribution, setShowAttribution] = useState(false)
  const Icon = metric.icon

  return (
    <div className="rounded-xl border border-border bg-white p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-zinc-600" aria-hidden />
        </div>
        <span className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border",
          metric.trend === "up" && "bg-emerald-50 text-emerald-700 border-emerald-200",
          metric.trend === "down" && "bg-red-50 text-red-700 border-red-200",
          metric.trend === "flat" && "bg-zinc-50 text-zinc-600 border-zinc-200",
        )}>
          {metric.trend === "up" && <ArrowUpRight className="h-3 w-3" aria-hidden />}
          {metric.trend === "down" && <ArrowDownRight className="h-3 w-3" aria-hidden />}
          {metric.trend === "flat" && <Minus className="h-3 w-3" aria-hidden />}
          {metric.trendLabel}
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{metric.value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{metric.subtext}</p>
      </div>
      {metric.attribution && (
        <button
          type="button"
          onClick={() => setShowAttribution(s => !s)}
          className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-medium"
        >
          <Lightbulb className="h-3 w-3" aria-hidden />
          {showAttribution ? "Hide attribution" : "Why is this improving?"}
        </button>
      )}
      {showAttribution && metric.attribution && (
        <p className="text-xs text-blue-800 bg-blue-50 rounded-lg px-3 py-2 leading-relaxed border border-blue-100">
          {metric.attribution}
        </p>
      )}
    </div>
  )
}

function OutcomeConfidence() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-zinc-600" aria-hidden />
        <p className="text-xs font-semibold text-muted-foreground tracking-wide">Is It Working?</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {OUTCOME_METRICS.map(m => <OutcomeCard key={m.label} metric={m} />)}
      </div>
    </div>
  )
}

// ── Suggested Improvements Queue ───────────────────────────────────────────────

interface SuggestedImprovement {
  id: string
  title: string
  reason: string
  confidence: number
  before: string
  after: string
  impact: string
  status: "pending" | "applied" | "dismissed"
}

const SUGGESTED_IMPROVEMENTS: SuggestedImprovement[] = [
  {
    id: "si-1",
    title: "Soften NSF / returned payment language",
    reason: "3 escalations this week traced to residents feeling accused when ELI mentions returned payments. Sentiment analysis shows negative spikes at the NSF mention.",
    confidence: 87,
    before: "Your payment was returned by your bank. A returned payment fee has been applied to your account.",
    after: "It looks like there was an issue processing your recent payment — your bank returned it. I know that can be frustrating. Let me help you get this sorted out.",
    impact: "Estimated -40% escalation rate for NSF conversations",
    status: "pending",
  },
  {
    id: "si-2",
    title: "Add payment confirmation reassurance",
    reason: "22% of residents who pay via the portal call back within 24h asking 'did my payment go through?' Adding proactive confirmation language could reduce these follow-up calls.",
    confidence: 79,
    before: "I've sent the portal link to your email. Let me know if you need anything else.",
    after: "I've sent the portal link to your email. Once your payment processes, you'll receive a confirmation receipt automatically. Payments typically post within 1-2 business days and you can check your balance anytime in the portal.",
    impact: "Estimated -20% follow-up call volume",
    status: "pending",
  },
  {
    id: "si-3",
    title: "Proactive grace period reminder in late fee conversations",
    reason: "Residents who are told about the grace period upfront are 3x less likely to escalate. Currently ELI only mentions it when asked.",
    confidence: 92,
    before: "Late fees are applied when payment is received after the grace period date.",
    after: "Just so you know, your community offers a grace period — payments received by the 4th of the month won't incur a late fee. If you can get your payment in by then, you're all set.",
    impact: "Applied Mar 25 — already showing -18% escalation rate",
    status: "applied",
  },
]

function ImprovementCard({ item, onApply, onDismiss }: {
  item: SuggestedImprovement
  onApply: () => void
  onDismiss: () => void
}) {
  const [showDiff, setShowDiff] = useState(false)

  return (
    <div className={cn(
      "rounded-xl border bg-white overflow-hidden",
      item.status === "applied" ? "border-emerald-200" : "border-border",
    )}>
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">{item.title}</span>
              {item.status === "applied" && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3" aria-hidden />
                  Applied
                </span>
              )}
              {item.status === "dismissed" && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-zinc-100 text-zinc-500 border border-zinc-200">
                  Dismissed
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{item.reason}</p>
          </div>
          <div className="shrink-0 flex items-center gap-1.5">
            <div className="text-right">
              <p className="text-lg font-bold text-foreground">{item.confidence}%</p>
              <p className="text-[10px] text-muted-foreground">confidence</p>
            </div>
          </div>
        </div>

        {item.status === "applied" && item.impact && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 border border-emerald-100">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600 shrink-0" aria-hidden />
            <p className="text-xs text-emerald-800 font-medium">{item.impact}</p>
          </div>
        )}

        {item.status === "pending" && (
          <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
            <span className="font-medium">Projected impact:</span> {item.impact}
          </p>
        )}

        <button
          type="button"
          onClick={() => setShowDiff(s => !s)}
          className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-foreground font-medium"
        >
          <Eye className="h-3 w-3" aria-hidden />
          {showDiff ? "Hide before/after" : "Show before/after"}
          {showDiff ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {showDiff && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="rounded-lg bg-red-50 border border-red-100 p-3 space-y-1">
              <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wide">Before</p>
              <p className="text-xs text-red-900 leading-relaxed italic">"{item.before}"</p>
            </div>
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 space-y-1">
              <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">After</p>
              <p className="text-xs text-emerald-900 leading-relaxed italic">"{item.after}"</p>
            </div>
          </div>
        )}
      </div>

      {item.status === "pending" && (
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-zinc-50/60">
          <button
            type="button"
            onClick={onDismiss}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-xs")}
          >
            Dismiss
          </button>
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-xs gap-1")}
          >
            <Eye className="h-3 w-3" aria-hidden />
            Preview in Test
          </button>
          <button
            type="button"
            onClick={onApply}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-colors"
          >
            <CheckCircle2 className="h-3 w-3" aria-hidden />
            Apply Change
          </button>
        </div>
      )}
    </div>
  )
}

// ── Summary Metrics (kept from original) ───────────────────────────────────────

const SUMMARY_METRICS = [
  { label: "Conversations (30d)", value: "986", icon: MessageSquare, color: "text-blue-600" },
  { label: "CSAT Score",          value: "4.3 / 5.0", icon: CheckCircle2,  color: "text-emerald-600" },
  { label: "Self-Resolved",       value: "79%",        icon: TrendingUp,    color: "text-purple-600" },
  { label: "Escalation Rate",     value: "12%",        icon: AlertTriangle, color: "text-amber-600" },
]

const TOP_TOPICS = [
  { topic: "Balance inquiry", pct: 38 },
  { topic: "Late fee questions", pct: 25 },
  { topic: "Payment portal help", pct: 19 },
  { topic: "Payment plans", pct: 11 },
  { topic: "Other", pct: 7 },
]

// ── What We've Learned Log ─────────────────────────────────────────────────────

const LEARNED_LOG = [
  {
    date: "Apr 3",
    title: "Softer tone reduces escalations",
    description: "After adjusting late payment conversation tone, CSAT improved by 0.4 points and escalation rate dropped from 15% to 12%.",
    impact: "+0.4 CSAT, -3pp escalation",
    category: "tone" as const,
  },
  {
    date: "Mar 25",
    title: "Grace period reminders work",
    description: "Adding proactive grace period language to late fee conversations reduced follow-up calls by 18% and improved resident sentiment scores.",
    impact: "-18% escalation rate",
    category: "prompt" as const,
  },
  {
    date: "Mar 17",
    title: "Mobile payment link delivery improved",
    description: "Optimized payment portal link format for mobile devices. Direct payment completions via ELI-sent links increased by 22%.",
    impact: "+22% direct payments",
    category: "integration" as const,
  },
]

const CATEGORY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  tone: { bg: "bg-purple-50 border-purple-200", text: "text-purple-700", label: "Tone" },
  prompt: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", label: "Prompt" },
  integration: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", label: "Integration" },
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function PaymentsReportingTab() {
  const [improvements, setImprovements] = useState(SUGGESTED_IMPROVEMENTS)

  function handleApply(id: string) {
    setImprovements(prev => prev.map(item =>
      item.id === id ? { ...item, status: "applied" as const } : item
    ))
  }

  function handleDismiss(id: string) {
    setImprovements(prev => prev.map(item =>
      item.id === id ? { ...item, status: "dismissed" as const } : item
    ))
  }

  const pendingCount = improvements.filter(i => i.status === "pending").length

  return (
    <div className="max-w-6xl space-y-8">
      {/* Weekly check-in */}
      <WeeklyBanner />

      {/* Outcome confidence */}
      <OutcomeConfidence />

      {/* Summary metrics row (from original) */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground tracking-wide mb-3">Conversation Volume</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SUMMARY_METRICS.map(m => {
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
      </div>

      {/* Top topics */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground tracking-wide mb-3">Top Topics</p>
        <div className="rounded-xl border border-border bg-white overflow-hidden divide-y divide-border">
          {TOP_TOPICS.map(t => (
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

      {/* Suggested improvements queue */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-zinc-600" aria-hidden />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Suggested Improvements
            </p>
            {pendingCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] rounded-full bg-blue-500 text-[10px] font-bold text-white px-1">
                {pendingCount}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Based on conversation analysis &middot; Updated weekly
          </p>
        </div>
        {improvements.map(item => (
          <ImprovementCard
            key={item.id}
            item={item}
            onApply={() => handleApply(item.id)}
            onDismiss={() => handleDismiss(item.id)}
          />
        ))}
      </div>

      {/* What We've Learned */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-zinc-600" aria-hidden />
          <p className="text-xs font-semibold text-muted-foreground tracking-wide">What We've Learned</p>
        </div>
        {LEARNED_LOG.map(entry => {
          const cat = CATEGORY_STYLES[entry.category]
          return (
            <div key={entry.date} className="rounded-xl border border-border bg-white overflow-hidden">
              <div className="px-4 py-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-0.5 h-7 w-7 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                      <Brain className="h-3.5 w-3.5 text-zinc-600" aria-hidden />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{entry.title}</p>
                        <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium", cat.bg, cat.text)}>
                          {cat.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{entry.description}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{entry.date}</span>
                </div>
                <div className="flex items-center gap-2 ml-10">
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                    <ArrowUpRight className="h-3 w-3" aria-hidden />
                    {entry.impact}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Auto-Evolve CTA */}
      <div className="rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
            <Zap className="h-4 w-4 text-white" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Auto-Analyze & Evolve</p>
            <p className="text-xs text-muted-foreground">ELI reviews conversation outcomes weekly and suggests prompt improvements</p>
          </div>
        </div>
        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" aria-hidden />
            <span className="text-xs font-medium text-emerald-800">Active — reviewing weekly</span>
          </div>
          <span className="text-xs text-emerald-600">All changes require your approval</span>
        </div>
      </div>
    </div>
  )
}
