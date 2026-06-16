"use client";

/**
 * Agent Knowledge Hub
 * ───────────────────
 * Origin: Slack signal from CRO Chase via CPO Catherine Wong (Jun 2026).
 *
 * The customer pain this surface targets:
 *   1. Escalations resolved by staff today are one-shot. Customers want to
 *      review escalations *thematically*, promote a universally-approved
 *      answer back into the agent's working knowledge, and reduce future
 *      escalations of the same kind.
 *   2. The "Knowledge Base" needs to be far less rigid than PMS field data.
 *      Customers running bolt-on AI agents have built ~30–40k lines of
 *      unstructured property-specific knowledge (e.g. "what is the height
 *      of the bedroom window") that no PMS captures, and they need a
 *      frictionless way to keep adding to it.
 *   3. Knowledge gaps (questions agents couldn't answer) should be surfaced
 *      proactively — similar to EntrataGPT Admin > Knowledge Gaps — and tied
 *      into the Knowledge Base so admins can close them in one place.
 *
 * Scope of this prototype page is to demonstrate the IA & key flows; the
 * data is mocked locally and intentionally illustrative.
 */

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Upload,
  Search,
  Sparkles,
  AlertCircle,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  ShieldCheck,
  Layers,
  Building2,
  Mail,
  FileText,
  Database,
  Link2,
  CircleHelp,
  Wand2,
  ChevronRight,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────
 * Mock data
 * ──────────────────────────────────────────────────────────── */

type AgentKey = "leasing" | "renewal" | "payments" | "maintenance" | "all";
const AGENT_LABEL: Record<AgentKey, string> = {
  leasing: "Leasing AI",
  renewal: "Renewal AI",
  payments: "Payments AI",
  maintenance: "Maintenance AI",
  all: "All agents",
};
const AGENT_TONE: Record<AgentKey, string> = {
  leasing: "bg-indigo-50 text-indigo-700 border-indigo-200",
  renewal: "bg-emerald-50 text-emerald-700 border-emerald-200",
  payments: "bg-amber-50 text-amber-800 border-amber-200",
  maintenance: "bg-sky-50 text-sky-700 border-sky-200",
  all: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

type Confidence = "high" | "medium" | "low";

type KnowledgeItem = {
  id: string;
  question: string;
  answer: string;
  agents: AgentKey[];
  scope: string; // property scope
  source: string;
  updated: string;
  confidence: Confidence;
  approved: boolean;
  usage30d: number;
};

const KNOWLEDGE_ITEMS: KnowledgeItem[] = [
  {
    id: "k-1",
    question: "What is the height of the bedroom window in 2-bed units at Hillside?",
    answer:
      "Bedroom windows in 2-bed floorplans (B1 / B2) at Hillside Living measure 48\" tall × 36\" wide, sill 30\" off the floor. Verified Mar 2026 by site team.",
    agents: ["leasing"],
    scope: "Hillside Living",
    source: "Manual entry · J. Patel",
    updated: "2 days ago",
    confidence: "high",
    approved: true,
    usage30d: 18,
  },
  {
    id: "k-2",
    question: "How do we handle a resident asking to break their lease for a job relocation?",
    answer:
      "Offer the standard 60-day military/job-relocation buyout (2 months' rent) when relocation is ≥ 50 miles and documented by an employer letter. Always escalate to Property Manager before confirming in writing.",
    agents: ["leasing", "renewal"],
    scope: "Portfolio",
    source: "Promoted from escalation theme · May 2026",
    updated: "1 week ago",
    confidence: "high",
    approved: true,
    usage30d: 47,
  },
  {
    id: "k-3",
    question: "Are EV chargers available at Jamison Apartments?",
    answer:
      "Yes — 8 Level-2 ChargePoint stations in the north garage (P2). $15/mo add-on; first-come reservation via the resident portal.",
    agents: ["leasing"],
    scope: "Jamison Apartments",
    source: "Email-scan harvest · Jan–Mar 2026",
    updated: "3 weeks ago",
    confidence: "medium",
    approved: true,
    usage30d: 31,
  },
  {
    id: "k-4",
    question: "What is the late fee policy after the 5th of the month?",
    answer:
      "Flat $50 late fee assessed on the 6th, plus $10/day from the 11th onward, capped at $200. Payments AI applies automatically; waivers require Property Manager approval.",
    agents: ["payments"],
    scope: "Portfolio",
    source: "Lease addendum · Section 4.2",
    updated: "5 weeks ago",
    confidence: "high",
    approved: true,
    usage30d: 122,
  },
  {
    id: "k-5",
    question: "Which appliances does the standard work-order scope cover for in-unit repair?",
    answer:
      "Refrigerator, dishwasher, oven, microwave, and in-unit washer/dryer when builder-installed. Tenant-owned appliances are out of scope; route to vendor referrals.",
    agents: ["maintenance"],
    scope: "Portfolio",
    source: "Maintenance SOP-014",
    updated: "Today",
    confidence: "high",
    approved: false,
    usage30d: 9,
  },
  {
    id: "k-6",
    question: "Do we accept ESA (emotional support animal) documentation from any provider?",
    answer:
      "We accept ESA letters from a licensed mental health professional dated within the last 12 months. Do not commit in writing without Compliance review — escalate.",
    agents: ["leasing"],
    scope: "Portfolio",
    source: "Promoted from escalation theme · Apr 2026",
    updated: "2 months ago",
    confidence: "medium",
    approved: true,
    usage30d: 14,
  },
];

type EscalationTheme = {
  id: string;
  title: string;
  count: number;
  agents: AgentKey[];
  trend: "up" | "down" | "flat";
  trendPct: number;
  exampleQuestion: string;
  status: "needs-canonical" | "drafted" | "promoted";
};

const ESCALATION_THEMES: EscalationTheme[] = [
  {
    id: "t-1",
    title: "Pet policy exceptions for breed-restricted dogs",
    count: 38,
    agents: ["leasing"],
    trend: "up",
    trendPct: 26,
    exampleQuestion: "Will you make an exception for a 65-lb Pit-mix on a doctor's note?",
    status: "needs-canonical",
  },
  {
    id: "t-2",
    title: "Move-out charges for normal wear & tear",
    count: 27,
    agents: ["renewal", "payments"],
    trend: "up",
    trendPct: 12,
    exampleQuestion: "Why was I charged $185 for carpet replacement after a 2-year lease?",
    status: "drafted",
  },
  {
    id: "t-3",
    title: "Parking spot reassignment after lease signing",
    count: 19,
    agents: ["leasing"],
    trend: "flat",
    trendPct: 0,
    exampleQuestion: "Can I switch from spot 142 to a covered space when one opens?",
    status: "needs-canonical",
  },
  {
    id: "t-4",
    title: "Maintenance entry consent for pet-only households",
    count: 14,
    agents: ["maintenance"],
    trend: "down",
    trendPct: 18,
    exampleQuestion: "Can the tech still enter if my dog is crated and I'm not home?",
    status: "promoted",
  },
];

type KnowledgeGap = {
  id: string;
  question: string;
  asked: number;
  lastAsked: string;
  agent: AgentKey;
  scope: string;
  suggestedSource: string;
};

const KNOWLEDGE_GAPS: KnowledgeGap[] = [
  {
    id: "g-1",
    question: "Are short-term (3-month) leases available at Hillside Living?",
    asked: 22,
    lastAsked: "Today",
    agent: "leasing",
    scope: "Hillside Living",
    suggestedSource: "Property Manager · Hillside",
  },
  {
    id: "g-2",
    question: "What is the actual square footage of the den in C2 floorplans?",
    asked: 11,
    lastAsked: "Yesterday",
    agent: "leasing",
    scope: "Jamison Apartments",
    suggestedSource: "Floorplan archive · CAD-2024",
  },
  {
    id: "g-3",
    question: "Can residents pay rent in two split installments mid-month?",
    asked: 17,
    lastAsked: "2 days ago",
    agent: "payments",
    scope: "Portfolio",
    suggestedSource: "Finance policy · A/R",
  },
  {
    id: "g-4",
    question: "What's the SLA for an after-hours plumbing leak in a flat-roof building?",
    asked: 8,
    lastAsked: "3 days ago",
    agent: "maintenance",
    scope: "Hillside Living",
    suggestedSource: "Maintenance SOP-022",
  },
];

type KnowledgeSource = {
  id: string;
  name: string;
  description: string;
  status: "connected" | "scanning" | "needs-attention" | "available";
  itemsContributed: number;
  lastSync: string;
  icon: typeof Database;
};

const KNOWLEDGE_SOURCES: KnowledgeSource[] = [
  {
    id: "s-1",
    name: "PMS field data",
    description: "Structured data from Entrata PMS (rent, lease dates, charges, work orders).",
    status: "connected",
    itemsContributed: 612,
    lastSync: "Live",
    icon: Database,
  },
  {
    id: "s-2",
    name: "Uploaded documents",
    description: "PDFs, spreadsheets, and onboarding docs added from SOPs & Knowledge.",
    status: "connected",
    itemsContributed: 284,
    lastSync: "12 min ago",
    icon: FileText,
  },
  {
    id: "s-3",
    name: "Leasing email scanning",
    description: "Harvests canonical answers from leasing-agent email replies (opt-in per property).",
    status: "scanning",
    itemsContributed: 197,
    lastSync: "Indexing 412 threads",
    icon: Mail,
  },
  {
    id: "s-4",
    name: "Manual entries",
    description: "One-off facts captured by site staff via Quick add — covers the unstructured cases PMS can't.",
    status: "connected",
    itemsContributed: 154,
    lastSync: "8 min ago",
    icon: Pencil,
  },
  {
    id: "s-5",
    name: "3rd-party knowledge import",
    description: "Bring over canonical answers from a previous bolt-on AI provider (CSV / API).",
    status: "available",
    itemsContributed: 0,
    lastSync: "—",
    icon: Link2,
  },
];

/* ──────────────────────────────────────────────────────────────
 * Small helpers
 * ──────────────────────────────────────────────────────────── */

function AgentChip({ agent }: { agent: AgentKey }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        AGENT_TONE[agent]
      )}
    >
      {AGENT_LABEL[agent]}
    </span>
  );
}

function ConfidenceDot({ confidence }: { confidence: Confidence }) {
  const map = {
    high: { color: "bg-emerald-500", label: "High confidence" },
    medium: { color: "bg-amber-500", label: "Needs review" },
    low: { color: "bg-rose-500", label: "Low confidence" },
  };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("h-1.5 w-1.5 rounded-full", map[confidence].color)} />
      {map[confidence].label}
    </span>
  );
}

function MetricTile({
  label,
  value,
  delta,
  deltaTone = "neutral",
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "positive" | "negative" | "neutral";
  hint?: string;
  icon: typeof Sparkles;
}) {
  const deltaClass =
    deltaTone === "positive"
      ? "text-emerald-700"
      : deltaTone === "negative"
      ? "text-rose-700"
      : "text-muted-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold leading-none text-foreground">{value}</p>
            {delta && (
              <p className={cn("mt-2 text-xs font-medium", deltaClass)}>
                {delta}
              </p>
            )}
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          <div className="rounded-lg bg-muted p-2 text-muted-foreground">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────
 * Page
 * ──────────────────────────────────────────────────────────── */

export default function AgentKnowledgeHubPage() {
  const [search, setSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState<AgentKey | "all">("all");
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const filteredItems = useMemo(() => {
    return KNOWLEDGE_ITEMS.filter((item) => {
      const matchesAgent =
        agentFilter === "all" || item.agents.includes(agentFilter);
      const matchesQuery =
        search.trim().length === 0 ||
        item.question.toLowerCase().includes(search.toLowerCase()) ||
        item.answer.toLowerCase().includes(search.toLowerCase());
      return matchesAgent && matchesQuery;
    });
  }, [search, agentFilter]);

  return (
    <div className="page-content space-y-6 pb-12">
      <PageHeader
        title="Agent Knowledge Hub"
        description="One place to capture canonical answers, fill knowledge gaps, and turn escalations into reusable knowledge for every agent — including the unstructured details PMS can't hold."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Upload className="mr-1.5 h-4 w-4" />
              Import
            </Button>
            <Button size="sm" onClick={() => setQuickAddOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Quick add knowledge
            </Button>
          </div>
        }
      />

      {/* Origin / context callout — anchors the page in Chase's signal */}
      <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-white">
        <CardContent className="flex items-start gap-3 p-4">
          <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex-1 text-sm">
            <p className="font-medium text-foreground">
              Why this is separate from SOPs &amp; Knowledge
            </p>
            <p className="mt-1 text-muted-foreground">
              SOPs &amp; Knowledge holds your structured policy library. The Hub is for the
              <span className="font-medium text-foreground"> unstructured, frictionless knowledge</span> agents
              actually need — window dimensions, parking nuances, breed exceptions, EV chargers — plus the
              feedback loop for promoting one-off escalation answers into universal knowledge.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Top metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label="Knowledge items"
          value="1,247"
          hint="612 PMS · 635 unstructured"
          icon={Layers}
        />
        <MetricTile
          label="Escalation coverage"
          value="72%"
          delta="+9 pts vs. last month"
          deltaTone="positive"
          hint="Escalations w/ a canonical answer"
          icon={ShieldCheck}
        />
        <MetricTile
          label="Open knowledge gaps"
          value="24"
          delta="6 high-volume · needs an owner"
          deltaTone="negative"
          icon={AlertCircle}
        />
        <MetricTile
          label="Escalation reduction"
          value="−18%"
          delta="Last 30 days"
          deltaTone="positive"
          hint="From promoted answers"
          icon={TrendingDown}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="items" className="w-full">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="items">Knowledge items</TabsTrigger>
          <TabsTrigger value="themes">
            Escalation themes
            <Badge variant="destructive" className="ml-2 h-4 px-1.5 text-[10px]">
              3 to review
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="gaps">
            Knowledge gaps
            <Badge variant="destructive" className="ml-2 h-4 px-1.5 text-[10px]">
              24
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
        </TabsList>

        {/* ── Knowledge items ── */}
        <TabsContent value="items" className="space-y-4">
          {/* Filter bar */}
          <Card>
            <CardContent className="flex flex-wrap items-center gap-3 p-3">
              <div className="relative min-w-[260px] flex-1">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search canonical answers, e.g. window height, ESA, late fee…"
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(["all", "leasing", "renewal", "payments", "maintenance"] as AgentKey[]).map((a) => (
                  <button
                    key={a}
                    onClick={() => setAgentFilter(a)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      agentFilter === a
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {AGENT_LABEL[a]}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Items list */}
          <div className="space-y-3">
            {filteredItems.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  No knowledge items match your filters.
                </CardContent>
              </Card>
            )}
            {filteredItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-start gap-2">
                        <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <h3 className="text-sm font-semibold leading-snug text-foreground">
                          {item.question}
                        </h3>
                      </div>
                      <p className="ml-6 text-sm leading-relaxed text-muted-foreground">
                        {item.answer}
                      </p>
                      <div className="ml-6 flex flex-wrap items-center gap-2 pt-1">
                        {item.agents.map((a) => (
                          <AgentChip key={a} agent={a} />
                        ))}
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          {item.scope}
                        </span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{item.source}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">Updated {item.updated}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {item.approved ? (
                        <Badge variant="green" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Approved
                        </Badge>
                      ) : (
                        <Badge variant="yellow">Pending review</Badge>
                      )}
                      <ConfidenceDot confidence={item.confidence} />
                      <span className="text-[11px] text-muted-foreground">
                        Used {item.usage30d}× / 30d
                      </span>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                        <Pencil className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Escalation themes ── */}
        <TabsContent value="themes" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Themes detected from recent escalations</CardTitle>
              <p className="text-sm text-muted-foreground">
                Clusters of similar escalated questions resolved by your team. Promote a universal
                answer here and every agent stops escalating the next one.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {ESCALATION_THEMES.map((theme) => (
                <div
                  key={theme.id}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-start gap-2">
                      <h4 className="text-sm font-semibold text-foreground">{theme.title}</h4>
                      {theme.status === "promoted" && (
                        <Badge variant="green" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Promoted
                        </Badge>
                      )}
                      {theme.status === "drafted" && (
                        <Badge variant="yellow">Draft answer</Badge>
                      )}
                      {theme.status === "needs-canonical" && (
                        <Badge variant="destructive">Needs canonical answer</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className="italic">"{theme.exampleQuestion}"</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <span className="text-xs font-medium text-foreground">
                        {theme.count} escalations · 30d
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-xs font-medium",
                          theme.trend === "up"
                            ? "text-rose-700"
                            : theme.trend === "down"
                            ? "text-emerald-700"
                            : "text-muted-foreground"
                        )}
                      >
                        {theme.trend === "up" ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : theme.trend === "down" ? (
                          <TrendingDown className="h-3 w-3" />
                        ) : null}
                        {theme.trend === "flat" ? "flat" : `${theme.trendPct}% ${theme.trend === "up" ? "more" : "fewer"}`}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      {theme.agents.map((a) => (
                        <AgentChip key={a} agent={a} />
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button variant="outline" size="sm">
                      View escalations
                    </Button>
                    <Button size="sm" disabled={theme.status === "promoted"}>
                      <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                      {theme.status === "drafted" ? "Review draft" : "Promote to knowledge"}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Knowledge gaps ── */}
        <TabsContent value="gaps" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Questions agents couldn't answer</CardTitle>
              <p className="text-sm text-muted-foreground">
                Detected from agent transcripts and Entrata Experts queries that returned no
                confident answer. Close the gap once and every agent benefits.
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {KNOWLEDGE_GAPS.map((gap) => (
                <div
                  key={gap.id}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start gap-2">
                      <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                      <h4 className="text-sm font-semibold text-foreground">{gap.question}</h4>
                    </div>
                    <div className="ml-6 flex flex-wrap items-center gap-2">
                      <Badge variant="gray">Asked {gap.asked}×</Badge>
                      <span className="text-xs text-muted-foreground">Last asked {gap.lastAsked}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <AgentChip agent={gap.agent} />
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        {gap.scope}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">
                        Suggested source: {gap.suggestedSource}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button variant="ghost" size="sm">
                      Assign owner
                    </Button>
                    <Button size="sm">
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Add answer
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Sources ── */}
        <TabsContent value="sources" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {KNOWLEDGE_SOURCES.map((src) => {
              const Icon = src.icon;
              const statusBadge = (() => {
                switch (src.status) {
                  case "connected":
                    return <Badge variant="green">Connected</Badge>;
                  case "scanning":
                    return <Badge variant="yellow">Scanning</Badge>;
                  case "needs-attention":
                    return <Badge variant="destructive">Needs attention</Badge>;
                  case "available":
                    return <Badge variant="gray">Not connected</Badge>;
                }
              })();
              return (
                <Card key={src.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold text-foreground">{src.name}</h3>
                          <p className="text-sm text-muted-foreground">{src.description}</p>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {statusBadge}
                            {src.itemsContributed > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {src.itemsContributed.toLocaleString()} items
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">· {src.lastSync}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant={src.status === "available" ? "default" : "ghost"}
                        size="sm"
                        className="shrink-0"
                      >
                        {src.status === "available" ? (
                          <>
                            Connect
                            <ChevronRight className="ml-1 h-3.5 w-3.5" />
                          </>
                        ) : (
                          <>
                            Manage
                            <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick add modal — frictionless capture */}
      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick add knowledge</DialogTitle>
            <DialogDescription>
              A short, plain-language fact agents can use. Agents will normalize phrasing and
              attach scope automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Question or topic</label>
              <Input placeholder='e.g. "Window height in 2-bed bedroom"' />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Canonical answer</label>
              <textarea
                className="min-h-[100px] w-full rounded-md border border-border bg-background p-2 text-sm"
                placeholder="The plain-language answer agents should give."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Applies to</label>
                <Input placeholder="All agents" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Property scope</label>
                <Input placeholder="Hillside Living" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setQuickAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setQuickAddOpen(false)}>Save knowledge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
