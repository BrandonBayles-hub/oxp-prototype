"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  ArrowUp,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  CornerDownRight,
  DollarSign,
  FileCheck,
  FileText as FileTextIcon,
  Gauge,
  Image as ImageIcon,
  Lightbulb,
  Mail,
  MessageCircle,
  MessageSquare,
  Paperclip,
  Phone,
  ReceiptText,
  Search,
  RefreshCw,
  StickyNote,
  Tag,
  Target,
  User,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEscalations } from "@/lib/escalations-context";
import {
  useConversations,
  CONVERSATION_UNASSIGNED_ASSIGNEE,
  type BulkOutboundEmailRef,
  type ConversationMessage,
  type EmailAttachmentRef,
} from "@/lib/conversations-context";
import { getEmailThreadRoutingAddresses } from "@/lib/email-signature";
import { useAgents } from "@/lib/agents-context";
import { useWorkforce } from "@/lib/workforce-context";
import { useRole, matchesRoleProperties } from "@/lib/role-context";
import { useR1Release } from "@/lib/r1-release-context";
import { EscalationDetailSheet } from "@/components/escalation-detail-sheet";
import { ConversationThreadActivityRow } from "@/components/conversation-thread-activity-row";
import {
  ConversationBulkEmailCard,
  ConversationBulkEmailModal,
} from "@/components/conversation-bulk-email";
import { ValueYoureMissingBanner } from "@/components/value-youre-missing-banner";
import { MetricDetailDialog, type MetricDetailConfig } from "@/components/metric-detail-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn, assetPath } from "@/lib/utils";
import { AutonomousAgentSheet } from "@/components/autonomous-agent-sheet";
import { OperationsAgentSheet } from "@/components/operations-agent-sheet";

/* ═══════════════════════════════════════════════════════════════════════
   Shared types & data
   ═══════════════════════════════════════════════════════════════════════ */

type KpiTrend = "positive" | "neutral" | "negative";

const IC_PERSONA = { name: "Sarah", fullName: "Sarah Chen" };

const IC_TIPS = [
  {
    title: "Respond within 15 minutes",
    body: "Residents who get a response within 15 min report 2x higher satisfaction than those who wait an hour.",
  },
  {
    title: "Use the reply field to instruct the AI",
    body: "When you resolve an escalation, leave a reply. The AI learns from your guidance and handles similar cases next time.",
  },
  {
    title: "Add labels for better routing",
    body: "Tagging escalations with the right labels ensures future similar issues get routed to the right person automatically.",
  },
  {
    title: "Check for overdue items first",
    body: "Items past their due date affect SLA metrics. Prioritize red badges before working new items.",
  },
];



/* ═══════════════════════════════════════════════════════════════════════
   Page entry point — routes to IC or Admin view based on role
   ═══════════════════════════════════════════════════════════════════════ */

export default function CommandCenterPage() {
  const { role } = useRole();

  return role === "ic" ? <ICCommandCenter /> : <AdminCommandCenter />;
}

/* ═══════════════════════════════════════════════════════════════════════
   IC Command Center — personal queue-focused view
   ═══════════════════════════════════════════════════════════════════════ */

function ICCommandCenter() {
  const { items } = useEscalations();
  const [selectedEscalationId, setSelectedEscalationId] = useState<string | null>(null);

  const myItems = items.filter((i) => i.assignee === IC_PERSONA.name);
  const myOpenItems = myItems.filter((i) => i.status !== "Done");
  const myResolvedCount = myItems.filter((i) => i.status === "Done").length;
  const now = new Date();
  const myOverdueCount = myOpenItems.filter((i) => i.dueAt && new Date(i.dueAt) < now).length;
  const myUrgentCount = myOpenItems.filter((i) => i.priority === "urgent" || i.priority === "high").length;

  const selectedEscalation = selectedEscalationId
    ? items.find((i) => i.id === selectedEscalationId) ?? null
    : null;

  const kpis: Array<{
    label: string;
    value: React.ReactNode;
    icon: React.ComponentType<{ className?: string }>;
    trendText: string;
    trendVariant: KpiTrend;
  }> = [
    {
      label: "My Open Items",
      value: myOpenItems.length,
      icon: AlertCircle,
      trendText: myUrgentCount > 0 ? `${myUrgentCount} urgent` : "None urgent",
      trendVariant: myUrgentCount > 0 ? "negative" : "positive",
    },
    {
      label: "Resolved This Week",
      value: myResolvedCount,
      icon: CheckCircle2,
      trendText: myResolvedCount > 0 ? "Keep it up" : "Get started",
      trendVariant: myResolvedCount > 0 ? "positive" : "neutral",
    },
    {
      label: "Avg Response Time",
      value: "18 min",
      icon: Clock,
      trendText: "−3 min from last week",
      trendVariant: "positive",
    },
    {
      label: "My Resolution Rate",
      value: "91%",
      icon: Target,
      trendText: "+2 pts from last week",
      trendVariant: "positive",
    },
  ];

  return (
    <>
      <PageHeader
        title={`Hi ${IC_PERSONA.fullName}`}
        description={`Here's your queue for today. You have ${myOpenItems.length} open item${myOpenItems.length !== 1 ? "s" : ""}${myOverdueCount > 0 ? ` — ${myOverdueCount} overdue` : ""}.`}
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, trendText, trendVariant }) => (
          <Card key={label} className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-0 pt-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 py-1.5">
              <span className="text-xl font-semibold tracking-tight">{value}</span>
            </CardContent>
            <CardFooter className="px-4 pb-4 pt-0">
              <p
                className={cn(
                  "text-xs",
                  trendVariant === "positive" && "text-green-600 dark:text-green-400",
                  trendVariant === "negative" && "text-red-600 dark:text-red-400",
                  trendVariant === "neutral" && "text-muted-foreground"
                )}
              >
                {trendText}
              </p>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle>My Queue</CardTitle>
            <CardDescription>
              {myOpenItems.length} open
              {myUrgentCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400"> · {myUrgentCount} urgent</span>
              )}
              {myOverdueCount > 0 && (
                <span className="text-red-600 dark:text-red-400"> · {myOverdueCount} overdue</span>
              )}
              {" · "}
              <Link href="/escalations" className="underline hover:no-underline">View all escalations</Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {myOpenItems.length > 0 ? (
              <div className="scrollbar-hide overflow-y-auto" style={{ maxHeight: "440px" }}>
                <ul className="flex flex-col gap-2">
                  {myOpenItems.map((row) => {
                    const isOverdue = row.dueAt && new Date(row.dueAt) < now;
                    return (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedEscalationId(row.id)}
                          className="flex h-[72px] w-full flex-col justify-center rounded-lg border border-border bg-muted/50 p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted dark:bg-muted/50 dark:hover:bg-muted"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="truncate text-sm font-medium text-foreground" title={row.name ?? row.summary}>
                              {row.name ?? row.summary}
                            </span>
                            {(isOverdue || row.priority === "urgent" || row.priority === "high") && (
                              <span
                                className={cn(
                                  "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                                  isOverdue && "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
                                  !isOverdue && row.priority === "urgent" && "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
                                  !isOverdue && row.priority === "high" && "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                                )}
                              >
                                {isOverdue ? "Overdue" : row.priority === "urgent" ? "Urgent" : "High"}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="truncate">{row.escalatedByAgent ?? row.category}</span>
                            {row.property && (
                              <>
                                <span aria-hidden>·</span>
                                <span className="truncate">{row.property}</span>
                              </>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="mb-3 h-8 w-8 text-green-500" />
                <p className="text-sm font-medium text-foreground">All caught up!</p>
                <p className="mt-1 text-xs text-muted-foreground">No open items in your queue right now.</p>
              </div>
            )}
          </CardContent>
          {myOpenItems.length > 10 && (
            <CardFooter>
              <Button asChild variant="outline" size="sm">
                <Link href="/escalations">
                  View all
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardFooter>
          )}
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Tips
            </CardTitle>
            <CardDescription>
              Best practices for working your queue effectively.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {IC_TIPS.map((tip) => (
                <li key={tip.title} className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-sm font-medium text-foreground">{tip.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{tip.body}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <EscalationDetailSheet
        item={selectedEscalation}
        open={!!selectedEscalationId}
        onOpenChange={(o) => !o && setSelectedEscalationId(null)}
      />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Admin / Regional / Property Manager Command Center
   ═══════════════════════════════════════════════════════════════════════ */

function AdminCommandCenter() {
  const { items } = useEscalations();
  const { filteredItems: conversations, propertyCount: convoPropertyCount, addMessage } = useConversations();
  const { agents, agentsEnabledCount } = useAgents();

  const agentsByName = useMemo(() => {
    const map = new Map<string, (typeof agents)[number]>();
    for (const a of agents) map.set(a.name, a);
    return map;
  }, [agents]);
  const { humanMembers } = useWorkforce();
  const { role, roleProperties } = useRole();
  const isPropertyRole = role === "property";
  const isManagerRole = role === "regional" || role === "property";
  const { isR1Release } = useR1Release();

  const derivedKpis = useMemo(() => {
    const autonomousAgents = agents.filter((a) => a.type === "autonomous");
    const activeAgents = agents.filter((a) => a.status === "Active");
    const revenueAgents = autonomousAgents.filter((a) => a.revenueImpact && a.revenueImpact !== "—");
    const totalRevenueRaw = revenueAgents.reduce((s, a) => {
      const match = a.revenueImpact.match(/\$?([\d.]+)K?/i);
      if (!match) return s;
      const val = parseFloat(match[1]);
      return s + (a.revenueImpact.includes("K") ? val * 1000 : val);
    }, 0);
    const totalRevenue = totalRevenueRaw >= 1000
      ? `$${(totalRevenueRaw / 1000).toFixed(1)}K`
      : `$${totalRevenueRaw.toFixed(0)}`;
    const effectiveCapacity = (humanMembers.length + activeAgents.length * 0.8).toFixed(1);
    return { totalRevenue, effectiveCapacity };
  }, [agents, humanMembers]);

  const openItems = items.filter((i) => i.status !== "Done");
  const openCount = openItems.length;
  const now = new Date();
  const overdueCount = openItems.filter((i) => i.dueAt && new Date(i.dueAt) < now).length;
  const urgentCount = openItems.filter((i) => i.priority === "urgent" || i.priority === "high").length;

  const byCategory = openItems.reduce<Record<string, number>>((acc, i) => {
    acc[i.category] = (acc[i.category] || 0) + 1;
    return acc;
  }, {});
  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
  const escalationsHref =
    topCategory && topCategory[1] > 0
      ? `/escalations?category=${encodeURIComponent(topCategory[0])}`
      : "/escalations";

  const topKpis = [
    { label: "Revenue Impact", value: derivedKpis.totalRevenue, trendText: "+8% since last week", trendVariant: "positive" as KpiTrend, icon: DollarSign, href: "/performance" },
    { label: "Active Agents", value: agentsEnabledCount, trendText: "+1 since last week", trendVariant: "positive" as KpiTrend, icon: Users, href: "/agent-roster" },
    { label: "Hours Saved", value: "386 hrs", trendText: "+42 hrs from last week", trendVariant: "positive" as KpiTrend, icon: Clock, href: "/performance" },
  ];

  const outcomeCards = [
    { label: "Tours Scheduled", value: "124", trendText: "\u22126 from last week", trendVariant: "negative" as KpiTrend, icon: CalendarDays, agentName: "Leasing AI", href: "/performance", ctaText: "Clients with Leasing AI see 2x more tour bookings" },
    { label: "Leases Signed", value: "37", trendText: "+5 from last week", trendVariant: "positive" as KpiTrend, icon: ClipboardCheck, agentName: "Leasing AI", href: "/performance", ctaText: "Clients with Leasing AI convert 30% more leads to signed leases" },
    { label: "Renewals Generated", value: "28", trendText: "92% retention rate", trendVariant: "positive" as KpiTrend, icon: RefreshCw, agentName: "Renewal AI", href: "/performance", ctaText: "Clients with Renewal AI achieve 15% higher retention rates" },
    { label: "Work Orders Closed", value: "156", trendText: "+8 from last week", trendVariant: "positive" as KpiTrend, icon: Wrench, agentName: "Maintenance AI", href: "/performance", ctaText: "Clients with Maintenance AI see a 15% faster work order resolution time" },
    { label: "Rent Collected", value: "$218K", trendText: "90.6% collected \u00b7 Down 1.2% from last month", trendVariant: "negative" as KpiTrend, icon: DollarSign, agentName: "Payments AI", href: "/performance", ctaText: "Clients with Payments AI collect rent 20% faster" },
    { label: "Conversations Handled", value: "1,847", trendText: "+12% from last week", trendVariant: "positive" as KpiTrend, icon: MessageSquare, agentName: null as string | null, href: "/conversations", ctaText: "" },
  ];

  const [selectedEscalationId, setSelectedEscalationId] = useState<string | null>(null);
  const selectedEscalation = selectedEscalationId
    ? items.find((i) => i.id === selectedEscalationId) ?? null
    : null;
  const displayList = openItems.slice(0, 10);


  const [convoId, setConvoId] = useState<string | null>(null);
  const convoItem = convoId ? conversations.find((c) => c.id === convoId) ?? null : null;

  const [activeMetric, setActiveMetric] = useState<string | null>(null);
  const [agentCtaOpen, setAgentCtaOpen] = useState<string | null>(null);

  const agentCtaConfigs: Record<string, {
    title: string;
    description: string;
    capabilities: string[];
    impactMetrics: { value: string; label: string }[];
  }> = {
    "Leasing AI": {
      title: "ELI+ Leasing AI",
      description: "Autonomous lead engagement and leasing for your properties",
      capabilities: [
        "Engages every lead instantly via chat, SMS, and voice — 24/7",
        "Answers prospect questions about units, pricing, amenities, and policies",
        "Books and confirms tours automatically based on availability",
        "Guides qualified prospects through the application process to signed leases",
      ],
      impactMetrics: [
        { value: "49%", label: "Reduction in cancelled applications" },
        { value: "38%", label: "Increase in applications by early adopters" },
        { value: "99%", label: "Conversations handled autonomously" },
      ],
    },
    "Renewals AI": {
      title: "ELI+ Renewals AI",
      description: "Autonomous lease renewal management for your properties",
      capabilities: [
        "Proactively contacts residents with personalized renewal offers",
        "Negotiates rent increases based on market data and portfolio strategy",
        "Handles resident questions about renewal terms, timing, and options",
        "Escalates at-risk renewals to staff before residents decide to leave",
      ],
      impactMetrics: [
        { value: "10%", label: "Increase in renewal conversion rates" },
        { value: "24 days", label: "Earlier renewals signed on average" },
        { value: "80%", label: "Reduction in manual renewal management" },
      ],
    },
    "Maintenance AI": {
      title: "ELI+ Maintenance AI",
      description: "Autonomous work order management for your properties",
      capabilities: [
        "Automatically triages and dispatches work orders to the right vendor",
        "Follows up with residents on scheduling and completion",
        "Tracks SLA compliance and escalates overdue orders",
        "Handles resident communication via chat and voice 24/7",
      ],
      impactMetrics: [
        { value: "10%", label: "Faster work order resolution time" },
        { value: "58%", label: "Improvement in work order resolutions by early adopters" },
      ],
    },
    "Payments AI": {
      title: "ELI+ Payments AI",
      description: "Autonomous rent collection and payment management for your properties",
      capabilities: [
        "Sends automated payment reminders and follow-ups to residents",
        "Processes payment plans and manages delinquency workflows",
        "Answers resident questions about balances, fees, and payment options 24/7",
        "Escalates high-risk accounts and coordinates with on-site staff",
      ],
      impactMetrics: [
        { value: "7.5%", label: "Increase in on-time rent payments, on average, portfolio-wide" },
        { value: "40%", label: "Increase in portfolio-wide collections for adopters" },
      ],
    },
  };

  const metricDetails = useMemo<Record<string, MetricDetailConfig>>(() => {
    const agentRows = agents
      .filter((a) => a.status === "Active" || a.status === "Training")
      .map((a) => ({
        name: a.name,
        detail: `${a.bucket} · ${a.type === "autonomous" ? "L4" : a.type === "efficiency" ? "L3" : a.type === "intelligence" ? "L2" : "L1"} · ${a.scope ?? "All properties"}`,
        metrics: [
          ...(a.conversationCount > 0 ? [{ label: "conversations", value: String(a.conversationCount) }] : []),
          ...(a.resolutionRate !== "—" ? [{ label: "resolution", value: a.resolutionRate, variant: "positive" as const }] : []),
          ...(a.revenueImpact !== "—" ? [{ label: "revenue", value: a.revenueImpact }] : []),
        ],
        status: a.status,
      }));

    return {
      "Revenue Impact": {
        title: "Revenue Impact",
        icon: DollarSign,
        description: "Total revenue attributed to AI agent activity across your portfolio over the past 8 weeks.",
        summaryCards: [
          { label: "Total Revenue Impact", value: "$38.7K", subtext: "+8% since last week", subtextVariant: "positive" },
          { label: "Avg Revenue per Agent", value: "$12.9K", subtext: "Across 3 revenue-generating agents" },
          { label: "Revenue per Conversation", value: "$22.74", subtext: "+$3.20 from last month", subtextVariant: "positive" },
          { label: "Projected Monthly", value: "$77.4K", subtext: "Based on current 8-week trend" },
        ],
        byProperty: {
          a: { chartMultiplier: 0.44, summaryCards: [
            { label: "Total Revenue Impact", value: "$18.6K", subtext: "+11% since last week", subtextVariant: "positive" },
            { label: "Avg Revenue per Agent", value: "$4.7K", subtext: "Across 3 revenue-generating agents" },
            { label: "Revenue per Conversation", value: "$24.10", subtext: "+$4.50 from last month", subtextVariant: "positive" },
            { label: "Projected Monthly", value: "$37.2K", subtext: "Based on current 8-week trend" },
          ]},
          b: { chartMultiplier: 0.34, summaryCards: [
            { label: "Total Revenue Impact", value: "$14.2K", subtext: "+7% since last week", subtextVariant: "positive" },
            { label: "Avg Revenue per Agent", value: "$3.6K", subtext: "Across 3 revenue-generating agents" },
            { label: "Revenue per Conversation", value: "$19.80", subtext: "+$2.10 from last month", subtextVariant: "positive" },
            { label: "Projected Monthly", value: "$28.4K", subtext: "Based on current 8-week trend" },
          ]},
          c: { chartMultiplier: 0.22, summaryCards: [
            { label: "Total Revenue Impact", value: "$9.2K", subtext: "+4% since last week", subtextVariant: "positive" },
            { label: "Avg Revenue per Agent", value: "$2.3K", subtext: "Across 3 revenue-generating agents" },
            { label: "Revenue per Conversation", value: "$16.50", subtext: "+$1.40 from last month", subtextVariant: "positive" },
            { label: "Projected Monthly", value: "$18.4K", subtext: "Based on current 8-week trend" },
          ]},
        },
        chart: {
          title: "Revenue Growth Trend",
          data: [
            { name: "Week 1", value: 8200 }, { name: "Week 2", value: 12400 },
            { name: "Week 3", value: 18100 }, { name: "Week 4", value: 22800 },
            { name: "Week 5", value: 28500 }, { name: "Week 6", value: 33200 },
            { name: "Week 7", value: 38900 }, { name: "Week 8", value: 42000 },
          ],
          valuePrefix: "$",
          color: "#22c55e",
        },
        breakdownLayout: "side-by-side",
        breakdowns: [
          {
            type: "list", title: "Revenue by Agent",
            items: [
              { name: "Leasing AI", detail: "37 leases \u00d7 $497 avg commission", value: "$18.4K", percentage: "48%", trend: "+12%", trendVariant: "positive", iconSrc: "/eli-cube.svg" },
              { name: "Payments AI", detail: "$218K collected, recovered $12.2K in late fees", value: "$12.2K", percentage: "31%", trend: "+6%", trendVariant: "positive", iconSrc: "/eli-cube.svg" },
              { name: "Renewal AI", detail: "28 renewals with avg $289 rent increase", value: "$8.1K", percentage: "21%", trend: "+15%", trendVariant: "positive", iconSrc: "/eli-cube.svg" },
            ],
          },
          {
            type: "list", title: "Revenue by Property",
            items: [
              { name: "Property A", detail: "120 units \u00b7 94% occupancy", value: "$18.6K", trend: "+11%", trendVariant: "positive" },
              { name: "Jamison Apartments", detail: "95 units \u00b7 91% occupancy", value: "$14.2K", trend: "+7%", trendVariant: "positive" },
              { name: "Property C", detail: "80 units \u00b7 88% occupancy", value: "$9.2K", trend: "+4%", trendVariant: "positive" },
            ],
          },
        ],
      },

      "Active Agents": {
        title: "Active Agents",
        icon: Users,
        description: `${agentsEnabledCount} AI agents currently active across your properties, organized by function.`,
        summaryCards: [
          { label: "Total Active", value: String(agentsEnabledCount), subtext: "+1 since last week", subtextVariant: "positive" },
          { label: "Total Conversations", value: "491", subtext: "Across all active agents" },
          { label: "Avg Resolution Rate", value: "91%", subtext: "Weighted average" },
        ],
        byProperty: {
          a: { summaryCards: [
            { label: "Total Active", value: String(agentsEnabledCount), subtext: "Serving Property A" },
            { label: "Total Conversations", value: "198", subtext: "Property A only" },
            { label: "Avg Resolution Rate", value: "93%", subtext: "Weighted average", subtextVariant: "positive" },
          ]},
          b: { summaryCards: [
            { label: "Total Active", value: String(agentsEnabledCount), subtext: "Serving Jamison Apartments" },
            { label: "Total Conversations", value: "162", subtext: "Jamison Apartments only" },
            { label: "Avg Resolution Rate", value: "91%", subtext: "Weighted average" },
          ]},
          c: { summaryCards: [
            { label: "Total Active", value: String(agentsEnabledCount), subtext: "Serving Property C" },
            { label: "Total Conversations", value: "131", subtext: "Property C only" },
            { label: "Avg Resolution Rate", value: "88%", subtext: "Below average", subtextVariant: "negative" },
          ]},
        },
        breakdowns: [{ type: "agent-list", title: "All Active Agents", agents: agentRows }],
      },

      "Hours Saved": {
        title: "Hours Saved",
        icon: Clock,
        description: "Staff hours saved by AI agents handling conversations, processing, and analysis autonomously.",
        summaryCards: [
          { label: "Total Hours Saved", value: "386 hrs", subtext: "+42 hrs from last week", subtextVariant: "positive" },
          { label: "Avg per Agent", value: "14 hrs", subtext: "Across active agents" },
          { label: "Cost Savings", value: "$19.3K", subtext: "Based on avg staff cost", subtextVariant: "positive" },
          { label: "Efficiency Rate", value: "94%", subtext: "Tasks completed without staff" },
        ],
        byProperty: {
          a: { chartMultiplier: 0.40, summaryCards: [
            { label: "Total Hours Saved", value: "156 hrs", subtext: "+18 hrs from last week", subtextVariant: "positive" },
            { label: "Avg per Agent", value: "5.6 hrs", subtext: "Property A agents" },
            { label: "Cost Savings", value: "$7.8K", subtext: "Based on avg staff cost", subtextVariant: "positive" },
            { label: "Efficiency Rate", value: "96%", subtext: "Tasks completed without staff" },
          ]},
          b: { chartMultiplier: 0.33, summaryCards: [
            { label: "Total Hours Saved", value: "128 hrs", subtext: "+14 hrs from last week", subtextVariant: "positive" },
            { label: "Avg per Agent", value: "4.6 hrs", subtext: "Jamison Apartments agents" },
            { label: "Cost Savings", value: "$6.4K", subtext: "Based on avg staff cost", subtextVariant: "positive" },
            { label: "Efficiency Rate", value: "94%", subtext: "Tasks completed without staff" },
          ]},
          c: { chartMultiplier: 0.26, summaryCards: [
            { label: "Total Hours Saved", value: "102 hrs", subtext: "+10 hrs from last week", subtextVariant: "positive" },
            { label: "Avg per Agent", value: "3.6 hrs", subtext: "Property C agents" },
            { label: "Cost Savings", value: "$5.1K", subtext: "Based on avg staff cost", subtextVariant: "positive" },
            { label: "Efficiency Rate", value: "91%", subtext: "Tasks completed without staff" },
          ]},
        },
        chart: {
          title: "Hours Saved Trend",
          data: [
            { name: "Week 1", value: 180 }, { name: "Week 2", value: 210 },
            { name: "Week 3", value: 245 }, { name: "Week 4", value: 268 },
            { name: "Week 5", value: 298 }, { name: "Week 6", value: 325 },
            { name: "Week 7", value: 352 }, { name: "Week 8", value: 386 },
          ],
          color: "#22c55e",
        },
        breakdownLayout: "side-by-side",
        breakdowns: [
          {
            type: "list", title: "Hours by Task Type",
            items: [
              { name: "Conversations", detail: "Chat, SMS, and voice interactions", value: "186 hrs", percentage: "48%", trend: "+18%", trendVariant: "positive" },
              { name: "Application Processing", detail: "Screening, approvals, lease generation", value: "89 hrs", percentage: "23%", trend: "+12%", trendVariant: "positive" },
              { name: "Work Order Mgmt", detail: "Dispatch, tracking, follow-up", value: "62 hrs", percentage: "16%", trend: "+8%", trendVariant: "positive" },
              { name: "Analysis & Reporting", detail: "Intelligence agent insights", value: "49 hrs", percentage: "13%", trend: "+22%", trendVariant: "positive" },
            ],
          },
          {
            type: "list", title: "Hours by Agent",
            items: [
              { name: "Leasing AI", detail: "Tours, applications, lease questions", value: "124 hrs", trend: "+15%", trendVariant: "positive", iconSrc: "/eli-cube.svg" },
              { name: "Maintenance AI", detail: "Work orders, scheduling", value: "98 hrs", trend: "+10%", trendVariant: "positive", iconSrc: "/eli-cube.svg" },
              { name: "Payments AI", detail: "Rent, fees, payment questions", value: "86 hrs", trend: "+8%", trendVariant: "positive", iconSrc: "/eli-cube.svg" },
              { name: "Renewal AI", detail: "Renewal conversations, retention", value: "78 hrs", trend: "+12%", trendVariant: "positive", iconSrc: "/eli-cube.svg" },
            ],
          },
        ],
      },

      "Tours Scheduled": {
        title: "Tours Scheduled",
        icon: CalendarDays,
        description: "Tours scheduled autonomously by Leasing AI across all properties.",
        alert: {
          title: "Tour bookings dipped slightly this week",
          description: "It looks like lead response times have increased at Property C, which may be affecting bookings. A quick review of Leasing AI settings and lead source routing could help get things back on track.",
          actions: [
            { label: "Review Leasing AI Settings", href: "/getting-started", primary: true },
          ],
        },
        summaryCards: [
          { label: "Total Tours", value: "124", subtext: "\u22126 from last week", subtextVariant: "negative" },
          { label: "Show Rate", value: "78%", subtext: "+5% from last month", subtextVariant: "positive" },
          { label: "Tour-to-Lease", value: "34%", subtext: "+3% from last month", subtextVariant: "positive" },
          { label: "Avg Booking Time", value: "2.3 min", subtext: "vs 18 min manual" },
        ],
        byProperty: {
          a: { chartMultiplier: 0.42, alert: null, summaryCards: [
            { label: "Total Tours", value: "52", subtext: "+3 from last week", subtextVariant: "positive" },
            { label: "Show Rate", value: "82%", subtext: "+6% from last month", subtextVariant: "positive" },
            { label: "Tour-to-Lease", value: "38%", subtext: "+4% from last month", subtextVariant: "positive" },
            { label: "Avg Booking Time", value: "2.1 min", subtext: "vs 18 min manual" },
          ]},
          b: { chartMultiplier: 0.33, alert: null, summaryCards: [
            { label: "Total Tours", value: "41", subtext: "\u22121 from last week", subtextVariant: "negative" },
            { label: "Show Rate", value: "76%", subtext: "+4% from last month", subtextVariant: "positive" },
            { label: "Tour-to-Lease", value: "32%", subtext: "+2% from last month", subtextVariant: "positive" },
            { label: "Avg Booking Time", value: "2.4 min", subtext: "vs 18 min manual" },
          ]},
          c: { chartMultiplier: 0.25, alert: {
            title: "Property C tours have room to improve",
            description: "Lead response time at Property C has increased to 8 minutes, which may be contributing to fewer bookings. Adjusting response settings or reviewing lead source routing could help improve the conversion rate here.",
            actions: [
              { label: "Review Leasing AI Settings", href: "/getting-started", primary: true },
            ],
          }, summaryCards: [
            { label: "Total Tours", value: "31", subtext: "−8 from last week", subtextVariant: "negative" },
            { label: "Show Rate", value: "74%", subtext: "+2% from last month", subtextVariant: "positive" },
            { label: "Tour-to-Lease", value: "29%", subtext: "\u22121% from last month", subtextVariant: "negative" },
            { label: "Avg Booking Time", value: "2.8 min", subtext: "vs 18 min manual" },
          ]},
        },
        chart: {
          title: "8-Week Trend",
          data: [
            { name: "W1", value: 68 }, { name: "W2", value: 72 },
            { name: "W3", value: 78 }, { name: "W4", value: 85 },
            { name: "W5", value: 92 }, { name: "W6", value: 105 },
            { name: "W7", value: 118 }, { name: "W8", value: 124 },
          ],
          color: "#3b82f6",
        },
        breakdowns: [{
          type: "property-grid",
          items: [
            { name: "Property A", stats: [{ label: "Tours", value: "52" }, { label: "Show rate", value: "82%" }, { label: "Conversion", value: "38%" }] },
            { name: "Jamison Apartments", stats: [{ label: "Tours", value: "41" }, { label: "Show rate", value: "76%" }, { label: "Conversion", value: "32%" }] },
            { name: "Property C", highlight: "Room to improve", stats: [{ label: "Tours", value: "31" }, { label: "Show rate", value: "74%" }, { label: "Conversion", value: "29%" }] },
          ],
        }],
      },

      "Leases Signed": {
        title: "Leases Signed",
        icon: ClipboardCheck,
        description: "Leases executed through the Leasing AI pipeline, from application to signed agreement.",
        summaryCards: [
          { label: "Total Leases", value: "37", subtext: "+5 from last week", subtextVariant: "positive" },
          { label: "Avg Days to Sign", value: "3.2 days", subtext: "vs 8.5 days manual" },
          { label: "Conversion Rate", value: "34%", subtext: "+2% from last month", subtextVariant: "positive" },
          { label: "Avg Lease Value", value: "$1,450/mo", subtext: "+$35 from last quarter", subtextVariant: "positive" },
        ],
        byProperty: {
          a: { chartMultiplier: 0.43, summaryCards: [
            { label: "Total Leases", value: "16", subtext: "+3 from last week", subtextVariant: "positive" },
            { label: "Avg Days to Sign", value: "2.8 days", subtext: "vs 8.5 days manual" },
            { label: "Conversion Rate", value: "38%", subtext: "+3% from last month", subtextVariant: "positive" },
            { label: "Avg Lease Value", value: "$1,520/mo", subtext: "+$45 from last quarter", subtextVariant: "positive" },
          ]},
          b: { chartMultiplier: 0.32, summaryCards: [
            { label: "Total Leases", value: "12", subtext: "+1 from last week", subtextVariant: "positive" },
            { label: "Avg Days to Sign", value: "3.4 days", subtext: "vs 8.5 days manual" },
            { label: "Conversion Rate", value: "32%", subtext: "+1% from last month", subtextVariant: "positive" },
            { label: "Avg Lease Value", value: "$1,410/mo", subtext: "+$25 from last quarter", subtextVariant: "positive" },
          ]},
          c: { chartMultiplier: 0.24, summaryCards: [
            { label: "Total Leases", value: "9", subtext: "+1 from last week", subtextVariant: "positive" },
            { label: "Avg Days to Sign", value: "3.8 days", subtext: "vs 8.5 days manual" },
            { label: "Conversion Rate", value: "29%", subtext: "Flat from last month" },
            { label: "Avg Lease Value", value: "$1,380/mo", subtext: "+$20 from last quarter", subtextVariant: "positive" },
          ]},
        },
        chart: {
          title: "8-Week Trend",
          data: [
            { name: "W1", value: 18 }, { name: "W2", value: 21 },
            { name: "W3", value: 24 }, { name: "W4", value: 26 },
            { name: "W5", value: 29 }, { name: "W6", value: 31 },
            { name: "W7", value: 32 }, { name: "W8", value: 37 },
          ],
          color: "#22c55e",
        },
        breakdowns: [{
          type: "property-grid",
          items: [
            { name: "Property A", stats: [{ label: "Leases", value: "16" }, { label: "Avg rent", value: "$1,520" }, { label: "Conversion", value: "38%" }] },
            { name: "Jamison Apartments", stats: [{ label: "Leases", value: "12" }, { label: "Avg rent", value: "$1,410" }, { label: "Conversion", value: "32%" }] },
            { name: "Property C", stats: [{ label: "Leases", value: "9" }, { label: "Avg rent", value: "$1,380" }, { label: "Conversion", value: "29%" }] },
          ],
        }],
      },

      "Renewals Generated": {
        title: "Renewals Generated",
        icon: RefreshCw,
        description: "Lease renewals processed by the Renewal AI agent, driving retention and revenue growth.",
        summaryCards: [
          { label: "Total Renewals", value: "28", subtext: "This period" },
          { label: "Retention Rate", value: "92%", subtext: "+3% from last quarter", subtextVariant: "positive" },
          { label: "Avg Rent Increase", value: "$289/mo", subtext: "Per renewed lease", subtextVariant: "positive" },
          { label: "Revenue Retained", value: "$162K", subtext: "Annual value of renewed leases" },
        ],
        byProperty: {
          a: { chartMultiplier: 0.43, summaryCards: [
            { label: "Total Renewals", value: "12", subtext: "This period" },
            { label: "Retention Rate", value: "95%", subtext: "+4% from last quarter", subtextVariant: "positive" },
            { label: "Avg Rent Increase", value: "$310/mo", subtext: "Per renewed lease", subtextVariant: "positive" },
            { label: "Revenue Retained", value: "$68K", subtext: "Annual value of renewed leases" },
          ]},
          b: { chartMultiplier: 0.36, summaryCards: [
            { label: "Total Renewals", value: "10", subtext: "This period" },
            { label: "Retention Rate", value: "91%", subtext: "+2% from last quarter", subtextVariant: "positive" },
            { label: "Avg Rent Increase", value: "$275/mo", subtext: "Per renewed lease", subtextVariant: "positive" },
            { label: "Revenue Retained", value: "$52K", subtext: "Annual value of renewed leases" },
          ]},
          c: { chartMultiplier: 0.21, summaryCards: [
            { label: "Total Renewals", value: "6", subtext: "This period" },
            { label: "Retention Rate", value: "88%", subtext: "+1% from last quarter", subtextVariant: "positive" },
            { label: "Avg Rent Increase", value: "$268/mo", subtext: "Per renewed lease", subtextVariant: "positive" },
            { label: "Revenue Retained", value: "$42K", subtext: "Annual value of renewed leases" },
          ]},
        },
        chart: {
          title: "Renewal Trend",
          data: [
            { name: "W1", value: 12 }, { name: "W2", value: 14 },
            { name: "W3", value: 16 }, { name: "W4", value: 18 },
            { name: "W5", value: 21 }, { name: "W6", value: 23 },
            { name: "W7", value: 26 }, { name: "W8", value: 28 },
          ],
          color: "#22c55e",
        },
        breakdowns: [{
          type: "property-grid",
          items: [
            { name: "Property A", stats: [{ label: "Renewals", value: "12" }, { label: "Retention", value: "95%" }, { label: "Avg increase", value: "$310" }] },
            { name: "Jamison Apartments", stats: [{ label: "Renewals", value: "10" }, { label: "Retention", value: "91%" }, { label: "Avg increase", value: "$275" }] },
            { name: "Property C", stats: [{ label: "Renewals", value: "6" }, { label: "Retention", value: "88%" }, { label: "Avg increase", value: "$268" }] },
          ],
        }],
      },

      "Work Orders Closed": {
        title: "Work Orders Closed",
        icon: Wrench,
        description: "Work orders resolved through the Maintenance AI agent, from intake to completion.",
        summaryCards: [
          { label: "Total Closed", value: "156", subtext: "+8 from last week", subtextVariant: "positive" },
          { label: "Avg Resolution Time", value: "4.1 hrs", subtext: "vs 12 hrs manual" },
          { label: "First-Contact Fix", value: "68%", subtext: "+4% from last month", subtextVariant: "positive" },
          { label: "Resident Satisfaction", value: "4.7/5", subtext: "+0.3 from last quarter", subtextVariant: "positive" },
        ],
        byProperty: {
          a: { chartMultiplier: 0.41, summaryCards: [
            { label: "Total Closed", value: "64", subtext: "+4 from last week", subtextVariant: "positive" },
            { label: "Avg Resolution Time", value: "3.8 hrs", subtext: "vs 12 hrs manual" },
            { label: "First-Contact Fix", value: "72%", subtext: "+5% from last month", subtextVariant: "positive" },
            { label: "Resident Satisfaction", value: "4.8/5", subtext: "+0.4 from last quarter", subtextVariant: "positive" },
          ]},
          b: { chartMultiplier: 0.33, summaryCards: [
            { label: "Total Closed", value: "52", subtext: "+3 from last week", subtextVariant: "positive" },
            { label: "Avg Resolution Time", value: "4.2 hrs", subtext: "vs 12 hrs manual" },
            { label: "First-Contact Fix", value: "66%", subtext: "+3% from last month", subtextVariant: "positive" },
            { label: "Resident Satisfaction", value: "4.7/5", subtext: "+0.3 from last quarter", subtextVariant: "positive" },
          ]},
          c: { chartMultiplier: 0.26, summaryCards: [
            { label: "Total Closed", value: "40", subtext: "+1 from last week", subtextVariant: "positive" },
            { label: "Avg Resolution Time", value: "4.5 hrs", subtext: "vs 12 hrs manual" },
            { label: "First-Contact Fix", value: "62%", subtext: "+2% from last month", subtextVariant: "positive" },
            { label: "Resident Satisfaction", value: "4.5/5", subtext: "+0.1 from last quarter", subtextVariant: "positive" },
          ]},
        },
        chart: {
          title: "8-Week Trend",
          data: [
            { name: "W1", value: 82 }, { name: "W2", value: 91 },
            { name: "W3", value: 98 }, { name: "W4", value: 108 },
            { name: "W5", value: 119 }, { name: "W6", value: 132 },
            { name: "W7", value: 145 }, { name: "W8", value: 156 },
          ],
          color: "#22c55e",
        },
        breakdowns: [{
          type: "property-grid",
          items: [
            { name: "Property A", stats: [{ label: "Closed", value: "64" }, { label: "Avg time", value: "3.8 hrs" }, { label: "Satisfaction", value: "4.8/5" }] },
            { name: "Jamison Apartments", stats: [{ label: "Closed", value: "52" }, { label: "Avg time", value: "4.2 hrs" }, { label: "Satisfaction", value: "4.7/5" }] },
            { name: "Property C", stats: [{ label: "Closed", value: "40" }, { label: "Avg time", value: "4.5 hrs" }, { label: "Satisfaction", value: "4.5/5" }] },
          ],
        }],
      },

      "Rent Collected": {
        title: "Rent Collected",
        icon: DollarSign,
        description: "Rent collection managed by Payments AI, including reminders, processing, and reconciliation.",
        alert: {
          title: "Collection rate shifted slightly this month",
          description: "Property C has a few accounts with outstanding balances past 15 days. Payments AI has already sent follow-up reminders — a quick manual review of 3 accounts could help close the gap.",
          actions: [
            { label: "Review Outstanding", href: "/escalations", primary: true },
            { label: "View Payment Settings", href: "/agent-roster" },
          ],
        },
        summaryCards: [
          { label: "Total Collected", value: "$218K", subtext: "This period" },
          { label: "Collection Rate", value: "90.6%", subtext: "Down 1.2% from last month", subtextVariant: "negative" },
          { label: "Outstanding", value: "$23K", subtext: "Across 12 accounts", subtextVariant: "negative" },
          { label: "Avg Days to Pay", value: "4.2 days", subtext: "vs 7.8 days pre-AI" },
        ],
        byProperty: {
          a: { chartMultiplier: 0.39, alert: null, summaryCards: [
            { label: "Total Collected", value: "$86K", subtext: "This period" },
            { label: "Collection Rate", value: "93.2%", subtext: "+0.4% from last month", subtextVariant: "positive" },
            { label: "Outstanding", value: "$6.2K", subtext: "Across 3 accounts" },
            { label: "Avg Days to Pay", value: "3.8 days", subtext: "vs 7.8 days pre-AI" },
          ]},
          b: { chartMultiplier: 0.34, alert: null, summaryCards: [
            { label: "Total Collected", value: "$74K", subtext: "This period" },
            { label: "Collection Rate", value: "91.8%", subtext: "\u22120.3% from last month", subtextVariant: "negative" },
            { label: "Outstanding", value: "$6.5K", subtext: "Across 4 accounts" },
            { label: "Avg Days to Pay", value: "4.1 days", subtext: "vs 7.8 days pre-AI" },
          ]},
          c: { chartMultiplier: 0.27, alert: {
            title: "Property C collections could use some attention",
            description: "The collection rate is at 85.4% with $10.3K outstanding across 5 accounts past 15 days. Reviewing these accounts and adjusting payment plan options could help improve the rate.",
            actions: [
              { label: "Review Outstanding", href: "/escalations", primary: true },
              { label: "View Payment Settings", href: "/agent-roster" },
            ],
          }, summaryCards: [
            { label: "Total Collected", value: "$58K", subtext: "This period" },
            { label: "Collection Rate", value: "85.4%", subtext: "Down 3.1% from last month", subtextVariant: "negative" },
            { label: "Outstanding", value: "$10.3K", subtext: "Across 5 accounts", subtextVariant: "negative" },
            { label: "Avg Days to Pay", value: "5.2 days", subtext: "vs 7.8 days pre-AI" },
          ]},
        },
        chart: {
          title: "Collection Trend",
          data: [
            { name: "W1", value: 195000 }, { name: "W2", value: 198000 },
            { name: "W3", value: 202000 }, { name: "W4", value: 205000 },
            { name: "W5", value: 210000 }, { name: "W6", value: 214000 },
            { name: "W7", value: 216000 }, { name: "W8", value: 218000 },
          ],
          valuePrefix: "$",
          color: "#f59e0b",
        },
        breakdowns: [{
          type: "property-grid",
          items: [
            { name: "Property A", stats: [{ label: "Collected", value: "$86K" }, { label: "Rate", value: "93.2%" }, { label: "Outstanding", value: "$6.2K" }] },
            { name: "Jamison Apartments", stats: [{ label: "Collected", value: "$74K" }, { label: "Rate", value: "91.8%" }, { label: "Outstanding", value: "$6.5K" }] },
            { name: "Property C", highlight: "Room to improve", stats: [{ label: "Collected", value: "$58K" }, { label: "Rate", value: "85.4%" }, { label: "Outstanding", value: "$10.3K" }] },
          ],
        }],
      },

      "Conversations Handled": {
        title: "Conversations Handled",
        icon: MessageSquare,
        description: "Total conversations managed across all AI agents, including chat, SMS, voice, and portal interactions.",
        summaryCards: [
          { label: "Total Conversations", value: "1,847", subtext: "+12% from last week", subtextVariant: "positive" },
          { label: "Avg Resolution Time", value: "4.2 min", subtext: "vs 22 min manual" },
          { label: "Satisfaction Score", value: "4.6/5", subtext: "+0.2 from last month", subtextVariant: "positive" },
          { label: "Escalation Rate", value: "8%", subtext: "\u22122% from last month", subtextVariant: "positive" },
        ],
        byProperty: {
          a: { chartMultiplier: 0.40, summaryCards: [
            { label: "Total Conversations", value: "742", subtext: "+14% from last week", subtextVariant: "positive" },
            { label: "Avg Resolution Time", value: "3.8 min", subtext: "vs 22 min manual" },
            { label: "Satisfaction Score", value: "4.7/5", subtext: "+0.3 from last month", subtextVariant: "positive" },
            { label: "Escalation Rate", value: "6%", subtext: "\u22123% from last month", subtextVariant: "positive" },
          ]},
          b: { chartMultiplier: 0.33, summaryCards: [
            { label: "Total Conversations", value: "612", subtext: "+11% from last week", subtextVariant: "positive" },
            { label: "Avg Resolution Time", value: "4.2 min", subtext: "vs 22 min manual" },
            { label: "Satisfaction Score", value: "4.6/5", subtext: "+0.2 from last month", subtextVariant: "positive" },
            { label: "Escalation Rate", value: "8%", subtext: "\u22121% from last month", subtextVariant: "positive" },
          ]},
          c: { chartMultiplier: 0.27, summaryCards: [
            { label: "Total Conversations", value: "493", subtext: "+8% from last week", subtextVariant: "positive" },
            { label: "Avg Resolution Time", value: "4.8 min", subtext: "vs 22 min manual" },
            { label: "Satisfaction Score", value: "4.4/5", subtext: "Flat from last month" },
            { label: "Escalation Rate", value: "11%", subtext: "+1% from last month", subtextVariant: "negative" },
          ]},
        },
        chart: {
          title: "Conversation Volume Trend",
          data: [
            { name: "W1", value: 980 }, { name: "W2", value: 1050 },
            { name: "W3", value: 1180 }, { name: "W4", value: 1320 },
            { name: "W5", value: 1450 }, { name: "W6", value: 1580 },
            { name: "W7", value: 1690 }, { name: "W8", value: 1847 },
          ],
          color: "#3b82f6",
        },
        breakdownLayout: "side-by-side",
        breakdowns: [
          {
            type: "list", title: "By Agent",
            items: [
              { name: "Leasing AI", detail: "Tours, applications, lease questions", value: "623", percentage: "34%", trend: "+15%", trendVariant: "positive", iconSrc: "/eli-cube.svg" },
              { name: "Payments AI", detail: "Rent, fees, payment questions", value: "412", percentage: "22%", trend: "+8%", trendVariant: "positive", iconSrc: "/eli-cube.svg" },
              { name: "Renewal AI", detail: "Renewal conversations, retention", value: "356", percentage: "19%", trend: "+18%", trendVariant: "positive", iconSrc: "/eli-cube.svg" },
              { name: "Maintenance AI", detail: "Work orders, follow-up", value: "456", percentage: "25%", trend: "+10%", trendVariant: "positive", iconSrc: "/eli-cube.svg" },
            ],
          },
          {
            type: "list", title: "By Channel",
            items: [
              { name: "Chat", detail: "Web and portal chat", value: "812", percentage: "44%", trend: "+20%", trendVariant: "positive" },
              { name: "SMS", detail: "Text message interactions", value: "534", percentage: "29%", trend: "+14%", trendVariant: "positive" },
              { name: "Voice", detail: "Phone call handling", value: "298", percentage: "16%", trend: "+5%", trendVariant: "positive" },
              { name: "Portal", detail: "Resident portal messages", value: "203", percentage: "11%", trend: "+8%", trendVariant: "positive" },
            ],
          },
        ],
      },
    };
  }, [agents, agentsEnabledCount]);

  const agentOutcomeMap: Record<string, { outcome: string; metricValue: string; metricLabel: string }> = {
    "Leasing AI": { outcome: "5 leases signed this week", metricValue: "92%", metricLabel: "resolution" },
    "Renewal AI": { outcome: "28 renewals generated", metricValue: "94%", metricLabel: "resolution" },
    "Maintenance AI": { outcome: "156 work orders closed", metricValue: "89%", metricLabel: "resolution" },
    "Payments AI": { outcome: "$218K rent collected", metricValue: "88%", metricLabel: "resolution" },
  };

  const teamAgents = useMemo(() => {
    return agents
      .filter((a) => a.type === "autonomous")
      .map((a) => {
        const isActive = a.status === "Active";
        const outcomeInfo = agentOutcomeMap[a.name];
        const activity = isR1Release
          ? (isActive ? "Active" : a.status)
          : isActive
            ? a.conversationCount > 0
              ? `${a.conversationCount} conversations · ${outcomeInfo?.outcome ?? ""}`
              : outcomeInfo?.outcome ?? ""
            : a.status;
        return {
          id: a.id,
          name: a.name,
          status: a.status,
          isActive,
          activity,
          metric: outcomeInfo?.metricValue ?? (a.resolutionRate !== "—" ? a.resolutionRate : `${a.conversationCount}`),
          metricLabel: outcomeInfo?.metricLabel ?? (a.resolutionRate !== "—" ? "resolution" : "conversations"),
        };
      })
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [agents, items, isR1Release]);

  const teamStaff = useMemo(() => {
    const humans = humanMembers.filter((m) =>
      (m.properties ?? []).some((p) => matchesRoleProperties(p, roleProperties))
    );
    return humans
      .filter((m) => m.tier !== "leadership")
      .map((m) => {
        const assignedOpen = items.filter(
          (e) => e.assignee === m.name && e.status !== "Done"
        ).length;
        return {
          id: m.id,
          name: m.name,
          role: m.role,
          activity:
            assignedOpen > 0
              ? `${assignedOpen} open escalation${assignedOpen !== 1 ? "s" : ""}`
              : "No open items",
          metric: String(assignedOpen),
          metricLabel: "escalations",
        };
      })
      .sort((a, b) => parseInt(b.metric) - parseInt(a.metric) || a.name.localeCompare(b.name))
      .slice(0, 6);
  }, [humanMembers, items, roleProperties]);

  return (
    <>
      <PageHeader
        title="Command Center"
        description="What needs doing and how the workforce is performing. Orchestrate the workforce and focus effort—with insights on where to look."
      />
      {!isManagerRole && <ValueYoureMissingBanner />}

      {!isR1Release && !isManagerRole && (
        <>
        {/* Top KPI Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topKpis.map(({ label, value, icon: Icon, trendText, trendVariant }) => (
            <button key={label} type="button" className="text-left" onClick={() => setActiveMetric(label)}>
              <Card className="h-full cursor-pointer transition-colors hover:border-primary/40 hover:bg-muted/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-0 pt-4">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-4 py-1.5">
                  <p className={cn(
                    "text-xl font-semibold",
                    trendVariant === "positive" && "text-green-600 dark:text-green-400",
                    trendVariant === "negative" && "text-amber-600 dark:text-amber-400",
                    trendVariant === "neutral" && "text-muted-foreground"
                  )}>
                    {trendText}
                  </p>
                </CardContent>
                <CardFooter className="px-4 pb-4 pt-0">
                  <span className="text-sm font-semibold text-foreground">{value}</span>
                </CardFooter>
              </Card>
            </button>
          ))}
        </div>
        </>
      )}

      {/* Outcomes Achieved by AI Agents */}
      {isManagerRole ? null : isR1Release ? (
        <R1OutcomesSection />
      ) : (
        <div className="mb-8">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Outcomes Achieved by AI Agents
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {outcomeCards.map((card) => {
              const agent = card.agentName
                ? agents.find((a) => a.name === card.agentName && a.type === "autonomous")
                : null;
              const isEnabled = !card.agentName || (agent && agent.status !== "Off");
              const Icon = card.icon;

              if (!isEnabled && card.agentName) {
                return (
                  <Card key={card.label} className="flex h-full flex-col border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-0 pt-4">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="flex-1 px-4 py-3">
                      <div className="mb-2 flex items-center gap-1.5">
                        <img src="/eli-cube.svg" alt="" width={16} height={16} />
                        <span className="text-xs font-semibold">ELI+ {card.agentName}</span>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">{card.ctaText}</p>
                    </CardContent>
                    <CardFooter className="px-4 pb-4 pt-0">
                      <Button size="sm" className="w-full text-xs" onClick={() => setAgentCtaOpen(card.agentName!)}>
                        Enable {card.agentName}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              }

              return (
                <button key={card.label} type="button" className="text-left" onClick={() => setActiveMetric(card.label)}>
                  <Card className="h-full cursor-pointer transition-colors hover:border-primary/40 hover:bg-muted/30">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-0 pt-4">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="px-4 py-1.5">
                      <p className={cn(
                        "text-base font-semibold",
                        card.trendVariant === "positive" && "text-green-600 dark:text-green-400",
                        card.trendVariant === "negative" && "text-amber-600 dark:text-amber-400",
                        card.trendVariant === "neutral" && "text-muted-foreground"
                      )}>
                        {card.trendText}
                      </p>
                    </CardContent>
                    <CardFooter className="px-4 pb-4 pt-0">
                      <span className="text-sm font-semibold text-foreground">{card.value}</span>
                    </CardFooter>
                  </Card>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Agent Enable CTA Dialog */}
      <Dialog open={!!agentCtaOpen} onOpenChange={(o) => !o && setAgentCtaOpen(null)}>
        {agentCtaOpen && agentCtaConfigs[agentCtaOpen] && (() => {
          const cfg = agentCtaConfigs[agentCtaOpen];
          return (
            <DialogContent className="max-w-md p-0">
              <div className="p-6 pb-0">
                <div className="flex items-center gap-3">
                  <img src="/eli-cube.svg" alt="" width={32} height={32} />
                  <div>
                    <DialogTitle className="text-base font-semibold">{cfg.title}</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                      {cfg.description}
                    </DialogDescription>
                  </div>
                </div>
              </div>

              <div className="px-6 pt-4">
                <div className="rounded-lg border border-border p-4">
                  <p className="mb-3 text-sm font-semibold text-foreground">What {agentCtaOpen} does</p>
                  <ul className="space-y-2">
                    {cfg.capabilities.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                        <span className="text-sm text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="px-6 pt-4">
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800/40 dark:bg-amber-950/20">
                  <p className="mb-3 text-sm font-semibold text-foreground">Impact from similar properties</p>
                  <div className={cn("grid gap-4 text-center", cfg.impactMetrics.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
                    {cfg.impactMetrics.map((m) => (
                      <div key={m.label}>
                        <p className="text-xs text-muted-foreground/60 mb-0.5">up to</p>
                        <p className="text-xl font-bold text-foreground">{m.value}</p>
                        <p className="text-xs text-muted-foreground">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6">
                <Button className="w-full" onClick={() => setAgentCtaOpen(null)}>
                  Set Up {cfg.title}
                </Button>
              </div>
            </DialogContent>
          );
        })()}
      </Dialog>

      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        {/* Needs Attention */}
        <Card className={isR1Release && !isManagerRole ? "lg:col-span-2" : ""}>
          <CardHeader className="pb-3">
            <CardTitle>Needs Attention</CardTitle>
            {isR1Release && (
              <p className="text-xs text-muted-foreground">Escalations and tasks that need review and action from your staff</p>
            )}
            <CardDescription>
              {openCount} open
              {urgentCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400"> · {urgentCount} urgent</span>
              )}
              {overdueCount > 0 && (
                <span className="text-red-600 dark:text-red-400"> · {overdueCount} overdue</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {openCount > 0 ? (
              <div className="scrollbar-hide overflow-y-auto" style={{ maxHeight: "248px" }}>
                <ul className="flex flex-col gap-2">
                  {displayList.map((row) => {
                    const isOverdue = row.dueAt && new Date(row.dueAt) < now;
                    return (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedEscalationId(row.id)}
                          className="flex h-[72px] w-full flex-col justify-center rounded-lg border border-border bg-muted/50 p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted dark:bg-muted/50 dark:hover:bg-muted"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="truncate text-sm font-medium text-foreground" title={row.name ?? row.summary}>
                              {row.name ?? row.summary}
                            </span>
                            {(isOverdue || row.priority === "urgent" || row.priority === "high") && (
                              <span
                                className={cn(
                                  "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                                  isOverdue && "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
                                  !isOverdue && row.priority === "urgent" && "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
                                  !isOverdue && row.priority === "high" && "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                                )}
                              >
                                {isOverdue ? "Overdue" : row.priority === "urgent" ? "Urgent" : "High"}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="truncate">{row.escalatedByAgent ?? row.category}</span>
                            {row.property && (
                              <>
                                <span aria-hidden>·</span>
                                <span className="truncate">{row.property}</span>
                              </>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">All caught up.</p>
            )}
          </CardContent>
          {openCount > 0 && (
            <CardFooter>
              <Button asChild variant="outline" size="sm">
                <Link href={escalationsHref}>
                  View all
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Live Conversations */}
        {(!isR1Release || isManagerRole) && <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              Live Conversations
            </CardTitle>
            <CardDescription>
              {conversations.length} active across {convoPropertyCount} {convoPropertyCount === 1 ? "property" : "properties"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {conversations.length > 0 ? (
              <div className="scrollbar-hide overflow-y-auto" style={{ maxHeight: "248px" }}>
                <ul className="flex flex-col gap-2">
                  {conversations.map((convo) => {
                    const resolvedAgent = agentsByName.get(convo.agent);
                    const agentLabel = resolvedAgent
                      ? `${resolvedAgent.type === "autonomous" ? "ELI+ " : ""}${resolvedAgent.name}`
                      : convo.agent;
                    return (
                      <li key={convo.id}>
                        <button
                          type="button"
                          onClick={() => setConvoId(convo.id)}
                          className="flex h-[72px] w-full items-center gap-3 rounded-lg border border-border bg-muted/50 p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted dark:bg-muted/50 dark:hover:bg-muted"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <span className="truncate text-sm font-medium text-foreground">
                                {convo.resident}
                                {convo.unit && <span className="font-normal text-muted-foreground"> · {convo.unit}</span>}
                              </span>
                              <span className="shrink-0 inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                {agentLabel}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              &ldquo;{convo.preview}&rdquo;
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active conversations.</p>
            )}
          </CardContent>
          {conversations.length > 0 && (
            <CardFooter>
              <Button asChild variant="outline" size="sm">
                <Link href="/conversations">
                  View all
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardFooter>
          )}
        </Card>}

        {/* Your Team */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                  </span>
                  Your Team
                </CardTitle>
                <CardDescription>Staff and autonomous agents who own outcomes</CardDescription>
              </div>
              <span className="text-xs text-muted-foreground">
                {teamAgents.length} agent{teamAgents.length !== 1 ? "s" : ""} · {teamStaff.length} staff
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Autonomous Agents
              </p>
              {teamAgents.length > 0 ? (
                <ul className="divide-y divide-border">
                  {teamAgents.map((agent) => (
                    <li key={agent.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <img src="/eli-cube.svg" alt="" className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          {agent.name}
                          {!agent.isActive && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0">{agent.status}</Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{agent.activity}</p>
                      </div>
                      {agent.isActive && !isR1Release ? (
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-foreground">{agent.metric}</p>
                          <p className="text-[10px] text-muted-foreground">{agent.metricLabel}</p>
                        </div>
                      ) : !agent.isActive && agentCtaConfigs[agent.name] ? (
                        <Button
                          size="sm"
                          className="shrink-0 text-xs"
                          onClick={() => setAgentCtaOpen(agent.name)}
                        >
                          Activate Agent
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No autonomous agents.</p>
              )}
            </div>
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Property Staff
              </p>
              {teamStaff.length > 0 ? (
                <ul className="divide-y divide-border">
                  {teamStaff.map((member) => (
                    <li key={member.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                        {member.name.split(" ").map((w: string) => w[0]).join("")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.role} · {member.activity}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-foreground">{member.metric}</p>
                        <p className="text-[10px] text-muted-foreground">{member.metricLabel}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No staff in scope for this role.</p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" size="sm">
              <Link href="/workforce">
                View workforce
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

      </div>

      <EscalationDetailSheet
        item={selectedEscalation}
        open={!!selectedEscalationId}
        onOpenChange={(o) => !o && setSelectedEscalationId(null)}
      />

      <ConversationSheet
        convoItem={convoItem}
        open={!!convoId}
        onClose={() => setConvoId(null)}
        agentsByName={agentsByName}
        onSend={(message) => convoItem && addMessage(convoItem.id, message)}
      />

      <MetricDetailDialog
        config={activeMetric ? metricDetails[activeMetric] ?? null : null}
        open={!!activeMetric}
        onOpenChange={(o) => !o && setActiveMetric(null)}
      />

    </>
  );
}

const R1_AGENT_CARDS: {
  name: string;
  outcome: string;
  description: string;
  valueProp?: string;
  icon: React.ComponentType<{ className?: string }>;
  tier: "ELI+" | "Operational";
  active: boolean;
}[] = [
  {
    name: "Leasing AI",
    outcome: "Tours Scheduled & Leases Signed",
    description: "Engages leads 24/7, books tours, answers questions, and guides prospects through the application process to signed leases.",
    valueProp: "99% of prospect conversations on average are handled autonomously by Leasing AI",
    icon: CalendarDays,
    tier: "ELI+",
    active: true,
  },
  {
    name: "Renewals AI",
    outcome: "Renewals Generated",
    description: "Proactively reaches out to expiring leases with personalized renewal offers, driving retention and rent growth.",
    valueProp: "Properties with Renewals AI sign renewals up to 24 days earlier on average",
    icon: RefreshCw,
    tier: "ELI+",
    active: true,
  },
  {
    name: "Maintenance AI",
    outcome: "Work Orders Closed",
    description: "Handles work order intake, triages urgency, dispatches vendors, and follows up with residents through resolution.",
    valueProp: "Clients with Maintenance AI see up to 10% faster work order resolution time",
    icon: Wrench,
    tier: "ELI+",
    active: false,
  },
  {
    name: "Payments AI",
    outcome: "Rent Collected",
    description: "Sends payment reminders, processes payment plans, answers balance questions, and reduces delinquency across your portfolio.",
    valueProp: "Properties with Payments AI see up to 7.5% more on-time payments",
    icon: DollarSign,
    tier: "ELI+",
    active: false,
  },
  {
    name: "Approve Applications",
    outcome: "Application Approvals",
    description: "Automates the review and approval of rental applications — screening criteria, verifications, and decisioning without manual effort.",
    icon: ClipboardCheck,
    tier: "Operational",
    active: false,
  },
  {
    name: "Renewal Offer Creation",
    outcome: "Renewal Offers",
    description: "Automatically generates and sends renewal offers based on market data, lease terms, and portfolio strategy — no manual pricing required.",
    icon: FileTextIcon,
    tier: "Operational",
    active: false,
  },
  {
    name: "Month-to-Month Rent Increases",
    outcome: "Rent Increases",
    description: "Automates rent increase calculations and notices for month-to-month leases — ensuring compliance, accuracy, and timely delivery.",
    icon: ReceiptText,
    tier: "Operational",
    active: true,
  },
  {
    name: "Move-in Reviews",
    outcome: "Move-in Readiness",
    description: "Automates the review of move-in details — verifying deposits, lease execution, unit readiness, and checklist completion before move-in day.",
    icon: Search,
    tier: "Operational",
    active: false,
  },
];

function R1OutcomesSection() {
  const [ctaOpen, setCtaOpen] = useState<string | null>(null);
  const [flyoutAgentName, setFlyoutAgentName] = useState<string | null>(null);
  const { agents, updateAgent } = useAgents();

  const r1AgentCtaConfigs: Record<string, {
    title: string;
    description: string;
    capabilities: string[];
    impactMetrics: { value: string; label: string }[];
  }> = {
    "Leasing AI": {
      title: "ELI+ Leasing AI",
      description: "Autonomous lead engagement and leasing for your properties",
      capabilities: [
        "Engages every lead instantly via chat, SMS, and voice — 24/7",
        "Answers prospect questions about units, pricing, amenities, and policies",
        "Books and confirms tours automatically based on availability",
        "Guides qualified prospects through the application process to signed leases",
      ],
      impactMetrics: [
        { value: "49%", label: "Reduction in cancelled applications" },
        { value: "38%", label: "Increase in applications by early adopters" },
        { value: "99%", label: "Conversations handled autonomously" },
      ],
    },
    "Renewals AI": {
      title: "ELI+ Renewals AI",
      description: "Autonomous lease renewal management for your properties",
      capabilities: [
        "Proactively contacts residents with personalized renewal offers",
        "Negotiates rent increases based on market data and portfolio strategy",
        "Handles resident questions about renewal terms, timing, and options",
        "Escalates at-risk renewals to staff before residents decide to leave",
      ],
      impactMetrics: [
        { value: "10%", label: "Increase in renewal conversion rates" },
        { value: "24 days", label: "Earlier renewals signed on average" },
        { value: "80%", label: "Reduction in manual renewal management" },
      ],
    },
    "Maintenance AI": {
      title: "ELI+ Maintenance AI",
      description: "Autonomous work order management for your properties",
      capabilities: [
        "Automatically triages and dispatches work orders to the right vendor",
        "Follows up with residents on scheduling and completion",
        "Tracks SLA compliance and escalates overdue orders",
        "Handles resident communication via chat and voice 24/7",
      ],
      impactMetrics: [
        { value: "10%", label: "Faster work order resolution time" },
        { value: "58%", label: "Improvement in work order resolutions by early adopters" },
      ],
    },
    "Payments AI": {
      title: "ELI+ Payments AI",
      description: "Autonomous rent collection and payment management for your properties",
      capabilities: [
        "Sends automated payment reminders and follow-ups to residents",
        "Processes payment plans and manages delinquency workflows",
        "Answers resident questions about balances, fees, and payment options 24/7",
        "Escalates high-risk accounts and coordinates with on-site staff",
      ],
      impactMetrics: [
        { value: "7.5%", label: "Increase in on-time rent payments, on average, portfolio-wide" },
        { value: "40%", label: "Increase in portfolio-wide collections for adopters" },
      ],
    },
  };

  const ctaCfg = ctaOpen ? r1AgentCtaConfigs[ctaOpen] : null;

  return (
    <div className="mb-8">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Recommended Agents
      </p>
      <p className="mb-4 text-sm text-muted-foreground">
        These agents are recommended for your portfolio. Activate them to start capturing value.
      </p>
      <div className="mb-1 flex justify-start">
        <span className="text-[10px] font-medium text-muted-foreground/70 tracking-wide">ELI+ Conversational Agents</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {R1_AGENT_CARDS.filter(c => c.tier === "ELI+").map((card) => {
          const Icon = card.icon;
          const hasCtaConfig = card.tier === "ELI+" && !!r1AgentCtaConfigs[card.name];

          const cardContent = (
            <Card key={card.name} className={cn(
              "flex h-full flex-col",
              !card.active && "border-dashed",
              card.active && "cursor-pointer transition-colors hover:border-primary/40 hover:bg-muted/30"
            )}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-0 pt-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">{card.outcome}</CardTitle>
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardHeader>
              <CardContent className="flex-1 px-4 py-3">
                <div className="mb-2 flex items-center gap-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={assetPath("/eli-cube.svg")}
                    alt=""
                    width={16}
                    height={16}
                    className="shrink-0"
                  />
                  <span className="min-w-0 truncate text-sm font-semibold text-foreground">{card.name}</span>
                  <Badge
                    variant={card.active ? "default" : "outline"}
                    className={cn(
                      "ml-auto shrink-0 whitespace-nowrap text-[9px] px-1.5 py-0",
                      card.active && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800/40"
                    )}
                  >
                    {card.active ? "Active" : "Not Active"}
                  </Badge>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{card.description}</p>
                {!card.active && card.valueProp && (
                  <div className="mt-2 flex items-start gap-1.5">
                    <Zap className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                    <p className="text-xs font-medium text-foreground">{card.valueProp}</p>
                  </div>
                )}
              </CardContent>
              {!card.active ? (
                <CardFooter className="px-4 pb-4 pt-0">
                  {hasCtaConfig ? (
                    <Button
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setCtaOpen(card.name)}
                    >
                      Activate Agent
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  ) : (
                    <Button asChild size="sm" className="w-full text-xs">
                      <Link href="/agent-roster">
                        Activate Agent
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  )}
                </CardFooter>
              ) : (
                <CardFooter className="px-4 pb-4 pt-0 justify-end">
                  <span className="text-[10px] text-muted-foreground/60">View Agent →</span>
                </CardFooter>
              )}
            </Card>
          );

          return card.active ? (
            <div key={card.name} className="text-left cursor-pointer" onClick={() => setFlyoutAgentName(card.name)}>
              {cardContent}
            </div>
          ) : (
            <div key={card.name}>{cardContent}</div>
          );
        })}
      </div>

      <div className="mt-6 mb-1 flex justify-start">
        <span className="text-[10px] font-medium text-muted-foreground/70 tracking-wide">Operational &amp; Efficiency Agents</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {R1_AGENT_CARDS.filter(c => c.tier === "Operational").map((card) => {
          const Icon = card.icon;
          const cardContent = (
            <Card key={card.name} className={cn(
              "flex h-full flex-col cursor-pointer transition-colors hover:border-primary/40 hover:bg-muted/30",
              !card.active && "border-dashed",
            )}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-0 pt-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">{card.outcome}</CardTitle>
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardHeader>
              <CardContent className="flex-1 px-4 py-3">
                <div className="mb-2 flex items-center gap-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={assetPath("/eli-cube.svg")}
                    alt=""
                    width={16}
                    height={16}
                    className="shrink-0"
                  />
                  <span className="min-w-0 truncate text-sm font-semibold text-foreground">{card.name}</span>
                  <Badge
                    variant={card.active ? "default" : "outline"}
                    className={cn(
                      "ml-auto shrink-0 whitespace-nowrap text-[9px] px-1.5 py-0",
                      card.active && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800/40"
                    )}
                  >
                    {card.active ? "Active" : "Not Active"}
                  </Badge>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{card.description}</p>
                {!card.active && card.valueProp && (
                  <div className="mt-2 flex items-start gap-1.5">
                    <Zap className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                    <p className="text-xs font-medium text-foreground">{card.valueProp}</p>
                  </div>
                )}
              </CardContent>
              {!card.active ? (
                <CardFooter className="px-4 pb-4 pt-0">
                  <Button size="sm" className="w-full text-xs" onClick={(e) => { e.stopPropagation(); setFlyoutAgentName(card.name); }}>
                    Activate Agent
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </CardFooter>
              ) : (
                <CardFooter className="px-4 pb-4 pt-0 justify-end">
                  <span className="text-[10px] text-muted-foreground/60">View Agent →</span>
                </CardFooter>
              )}
            </Card>
          );
          return (
            <div key={card.name} className="text-left cursor-pointer" onClick={() => setFlyoutAgentName(card.name)}>
              {cardContent}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex justify-center">
        <Button asChild variant="default" size="sm">
          <Link href="/agent-roster">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={assetPath("/eli-cube.svg")} alt="" width={14} height={14} />
            Explore all 100+ agents
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <Dialog open={!!ctaOpen} onOpenChange={(o) => !o && setCtaOpen(null)}>
        {ctaCfg && (
          <DialogContent className="max-w-md p-0">
            <div className="p-6 pb-0">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/eli-cube.svg" alt="" width={32} height={32} />
                <div>
                  <DialogTitle className="text-base font-semibold">{ctaCfg.title}</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    {ctaCfg.description}
                  </DialogDescription>
                </div>
              </div>
            </div>

            <div className="px-6 pt-4">
              <div className="rounded-lg border border-border p-4">
                <p className="mb-3 text-sm font-semibold text-foreground">What {ctaOpen} does</p>
                <ul className="space-y-2">
                  {ctaCfg.capabilities.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="px-6 pt-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800/40 dark:bg-amber-950/20">
                <p className="mb-3 text-sm font-semibold text-foreground">Impact from similar properties</p>
                <div className={cn("grid gap-4 text-center", ctaCfg.impactMetrics.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
                  {ctaCfg.impactMetrics.map((m) => (
                    <div key={m.label}>
                      <p className="text-xs text-muted-foreground/60 mb-0.5">up to</p>
                      <p className="text-xl font-bold text-foreground">{m.value}</p>
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6">
              <Button className="w-full" onClick={() => setCtaOpen(null)}>
                Set Up {ctaCfg.title}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {(() => {
        if (!flyoutAgentName) return null;
        const cardToAgentName: Record<string, string> = { "Renewals AI": "Renewal AI", "Move-in Reviews": "Move-In Reviews Auto-Process" };
        const agentName = cardToAgentName[flyoutAgentName] ?? flyoutAgentName;
        const flyoutAgent = agents.find((a) => a.name === agentName);
        if (!flyoutAgent) return null;
        if (flyoutAgent.type === "autonomous") {
          return (
            <AutonomousAgentSheet
              agent={flyoutAgent}
              open
              onOpenChange={(o) => { if (!o) setFlyoutAgentName(null); }}
              onUpdate={(updates) => updateAgent(flyoutAgent.id, updates)}
            />
          );
        }
        return (
          <OperationsAgentSheet
            agent={flyoutAgent}
            open
            onOpenChange={(o) => { if (!o) setFlyoutAgentName(null); }}
            onToggle={(status) => updateAgent(flyoutAgent.id, { status })}
          />
        );
      })()}
    </div>
  );
}

const CONVERSATION_SHEET_STAFF = "Abe Kashiwagi";

const SHEET_AVATAR_COLORS = [
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
];

function sheetAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return SHEET_AVATAR_COLORS[Math.abs(hash) % SHEET_AVATAR_COLORS.length];
}

function ConversationSheet({
  convoItem,
  open,
  onClose,
  agentsByName,
  onSend,
}: {
  convoItem: ReturnType<typeof useConversations>["filteredItems"][number] | null;
  open: boolean;
  onClose: () => void;
  agentsByName: Map<string, { name: string; type: string }>;
  onSend: (message: ConversationMessage) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const [inputMode, setInputMode] = useState<"message" | "private_note">("message");
  const [bulkEmailModal, setBulkEmailModal] = useState<BulkOutboundEmailRef | null>(null);
  const [sheetAttachmentPreview, setSheetAttachmentPreview] = useState<EmailAttachmentRef | null>(null);
  const { humanMembers } = useWorkforce();

  const humanNameSet = useMemo(
    () => new Set(humanMembers.map((m) => m.name)),
    [humanMembers]
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [convoItem?.messages.length]);

  useEffect(() => {
    setDraft("");
    setInputMode("message");
    setBulkEmailModal(null);
    setSheetAttachmentPreview(null);
  }, [convoItem?.id]);

  if (!convoItem) return null;

  const nameInitials = (name: string) =>
    name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const resolveAgentLabel = (agentName: string) => {
    const a = agentsByName.get(agentName);
    return a ? `${a.type === "autonomous" ? "ELI+ " : ""}${a.name}` : agentName;
  };

  const isHumanAssignee = (assignee: string) => humanNameSet.has(assignee);

  const handoffAssigneeLabel = (assignee: string) => {
    if (assignee === CONVERSATION_UNASSIGNED_ASSIGNEE) return "Unassigned";
    if (isHumanAssignee(assignee)) return assignee;
    return "Staff";
  };

  const handoffAssigneeInitials = (assignee: string) => {
    if (assignee === CONVERSATION_UNASSIGNED_ASSIGNEE) return "—";
    if (isHumanAssignee(assignee)) return nameInitials(assignee);
    return "AI";
  };

  const emailRouting = getEmailThreadRoutingAddresses(convoItem.resident, convoItem.property);

  const staffTimestamp = () => {
    const now = new Date();
    return now.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });
  };

  const handleSend = () => {
    if (!draft.trim()) return;
    const base = {
      role: "staff" as const,
      text: draft.trim(),
      timestamp: staffTimestamp(),
      type: inputMode,
      ...(inputMode === "private_note" ? { privateNoteAuthor: CONVERSATION_SHEET_STAFF } : {}),
    };
    onSend(base);
    setDraft("");
  };

  const renderChannelMeta = () => (
    <>
      {convoItem.channel === "Email" && (
        <>
          <span className="text-muted-foreground/50">·</span>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0 opacity-70" />
            Email
          </span>
        </>
      )}
      {convoItem.channel === "SMS" && (
        <>
          <span className="text-muted-foreground/50">·</span>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0 opacity-70" />
            SMS
          </span>
        </>
      )}
      {convoItem.channel !== "Email" && convoItem.channel !== "SMS" && (
        <>
          <span className="text-muted-foreground/50">·</span>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
            <MessageCircle className="h-3.5 w-3.5 shrink-0 opacity-70" />
            {convoItem.channel}
          </span>
        </>
      )}
    </>
  );

  const renderMessageBlock = (msg: ConversationMessage, idx: number, emailLayout: boolean) => {
    if (msg.type === "handoff") {
      return (
        <div key={idx} className="flex items-center justify-center gap-2 py-1">
          <CornerDownRight className="h-3 w-3 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">
            Handoff {handoffAssigneeLabel(convoItem.assignee)} · {msg.timestamp}
          </span>
        </div>
      );
    }

    if (msg.type === "thread_activity" && msg.threadActivity) {
      return <ConversationThreadActivityRow key={idx} message={msg} />;
    }

    if (msg.type === "label_activity" && msg.labelActivity) {
      const { actor, labelsAdded } = msg.labelActivity;
      return (
        <div
          key={idx}
          className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border/70 bg-muted/25 py-2.5 px-3"
        >
          <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">{actor}</span>
            {" added "}
            {labelsAdded.length === 1 ? "label " : "labels "}
            <span className="font-medium text-foreground">{labelsAdded.join(", ")}</span>
            {msg.timestamp && (
              <>
                <span className="text-muted-foreground/70"> · </span>
                <span>{msg.timestamp}</span>
              </>
            )}
          </p>
        </div>
      );
    }

    if (msg.type === "private_note") {
      return (
        <div key={idx} className="space-y-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <Avatar className="h-5 w-5">
              <AvatarFallback
                className={cn(
                  "text-[8px]",
                  msg.privateNoteAuthor
                    ? sheetAvatarColor(msg.privateNoteAuthor)
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                )}
              >
                {msg.privateNoteAuthor ? nameInitials(msg.privateNoteAuthor) : <StickyNote className="h-2.5 w-2.5" />}
              </AvatarFallback>
            </Avatar>
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
              Private Note
              {msg.privateNoteAuthor ? (
                <>
                  <span className="font-normal text-muted-foreground"> · </span>
                  <span className="font-medium text-amber-800 dark:text-amber-200">{msg.privateNoteAuthor}</span>
                </>
              ) : null}
            </span>
            {msg.timestamp && <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>}
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            {msg.text}
          </div>
        </div>
      );
    }

    const isAgent = msg.role === "agent";
    const isStaff = msg.role === "staff";

    if (emailLayout) {
      return (
        <div key={idx} className="space-y-2 border-l-2 border-l-primary/25 pl-4">
          <div className="flex items-center gap-2">
            <Avatar className={cn(isAgent || isStaff ? "h-8 w-8" : "h-5 w-5")}>
              {isAgent ? <AvatarImage src="/eli-cube.svg" alt="ELI" className="p-1" /> : null}
              <AvatarFallback
                className={cn(
                  (isAgent || isStaff)
                    ? "bg-muted text-[10px] text-foreground"
                    : "bg-muted text-[8px] text-muted-foreground"
                )}
              >
                {isStaff ? handoffAssigneeInitials(convoItem.assignee) : <User className="h-2.5 w-2.5" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground">
                {isAgent
                  ? resolveAgentLabel(convoItem.agent)
                  : isStaff
                    ? handoffAssigneeLabel(convoItem.assignee)
                    : convoItem.resident}
              </span>
              {msg.timestamp && <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>}
            </div>
          </div>
          <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm leading-relaxed text-foreground">
            {msg.text.split("\n").map((line, li) => (
              <span key={li}>
                {line}
                {li < msg.text.split("\n").length - 1 && <br />}
              </span>
            ))}
          </div>
          {msg.emailAttachments && msg.emailAttachments.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Attachments</p>
              <div className="flex flex-wrap gap-2">
                {msg.emailAttachments.map((att, ai) =>
                  att.kind === "image" ? (
                    <div
                      key={`${att.name}-${ai}`}
                      className="flex w-[min(100%,12rem)] flex-col gap-1.5 rounded-md border border-border bg-card p-2 text-left shadow-sm"
                    >
                      <div className="flex aspect-[4/3] w-full items-center justify-center rounded border border-dashed border-border bg-gradient-to-br from-muted/80 to-muted/40">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/70" aria-hidden />
                      </div>
                      <span className="truncate text-[11px] font-medium text-foreground" title={att.name}>
                        {att.name}
                      </span>
                    </div>
                  ) : (
                    <div
                      key={`${att.name}-${ai}`}
                      className="flex max-w-[14rem] items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-left shadow-sm"
                    >
                      <FileTextIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="truncate text-[11px] font-medium text-foreground" title={att.name}>
                        {att.name}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
          {msg.emailSignature?.trim() && (
            <div className="mt-3 border-t border-border pt-3">
              <div className="flex gap-3">
                {(isStaff || msg.role === "resident") && (
                  <Avatar className="mt-0.5 h-10 w-10 shrink-0 border border-border bg-background">
                    <AvatarFallback
                      className={cn(
                        "text-[10px]",
                        isStaff
                          ? convoItem.assignee === CONVERSATION_UNASSIGNED_ASSIGNEE
                            ? "border border-dashed border-muted-foreground/35 bg-muted/50 text-muted-foreground"
                            : sheetAvatarColor(convoItem.assignee)
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isStaff
                        ? convoItem.assignee === CONVERSATION_UNASSIGNED_ASSIGNEE
                          ? "—"
                          : isHumanAssignee(convoItem.assignee)
                            ? nameInitials(convoItem.assignee)
                            : "ST"
                        : nameInitials(convoItem.resident)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <p className="min-w-0 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                  {msg.emailSignature}
                </p>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div key={idx} className="space-y-2">
        <div className="flex items-center gap-2">
          <Avatar className={cn(isAgent || isStaff ? "h-8 w-8" : "h-5 w-5")}>
            {isAgent ? <AvatarImage src="/eli-cube.svg" alt="ELI" className="p-1" /> : null}
            <AvatarFallback
              className={cn(
                (isAgent || isStaff)
                  ? "bg-blue-100 text-[10px] text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                  : "bg-muted text-[8px] text-muted-foreground"
              )}
            >
              {isStaff ? handoffAssigneeInitials(convoItem.assignee) : <User className="h-2.5 w-2.5" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-foreground">
              {isAgent
                ? resolveAgentLabel(convoItem.agent)
                : isStaff
                  ? handoffAssigneeLabel(convoItem.assignee)
                  : convoItem.resident}
            </span>
            {msg.timestamp && <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>}
          </div>
        </div>
        <div
          className={cn(
            "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            (isAgent || isStaff) && "bg-blue-500 text-white dark:bg-blue-600",
            !isAgent && !isStaff && "border border-border bg-card text-card-foreground shadow-sm"
          )}
        >
          {msg.text.split("\n").map((line, li) => (
            <span key={li}>
              {line}
              {li < msg.text.split("\n").length - 1 && <br />}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col overflow-hidden p-0 sm:max-w-2xl"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Header — matches /conversations detail strip */}
          <div className="shrink-0 border-b border-border bg-card px-5 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-base font-semibold leading-tight text-foreground">{convoItem.resident}</span>
                <span className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                  <span>{convoItem.property}</span>
                  {renderChannelMeta()}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="hidden text-right text-[11px] text-muted-foreground sm:block">
                  <p className="font-medium text-foreground">{resolveAgentLabel(convoItem.agent)}</p>
                  {convoItem.contactType}
                  {convoItem.unit ? ` · ${convoItem.unit}` : ""}
                </div>
                <Avatar className="h-7 w-7">
                  <AvatarFallback
                    className={cn(
                      "text-[10px]",
                      convoItem.assignee === CONVERSATION_UNASSIGNED_ASSIGNEE
                        ? "border border-dashed border-muted-foreground/40 bg-muted/40 text-muted-foreground"
                        : sheetAvatarColor(convoItem.assignee)
                    )}
                  >
                    {convoItem.assignee === CONVERSATION_UNASSIGNED_ASSIGNEE
                      ? "—"
                      : isHumanAssignee(convoItem.assignee)
                        ? nameInitials(convoItem.assignee)
                        : "AI"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-right">
                  <p className="flex items-center justify-end gap-1.5 text-xs font-medium text-green-600">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                    Live
                  </p>
                  <p className="text-[10px] text-muted-foreground">{convoItem.time}</p>
                </div>
              </div>
            </div>

            {convoItem.labels.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {convoItem.labels.map((label) => (
                  <Badge
                    key={label}
                    variant={label.includes("Escalation") ? "destructive" : "outline"}
                    className={cn(
                      "rounded-md text-xs font-normal",
                      label.includes("Escalation")
                        ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                        : "border-border"
                    )}
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Messages — same structure as /conversations */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hover bg-muted/30 px-5 py-4">
            <div className="space-y-4">
              {convoItem.channel === "Email" && (
                <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                  <div className="border-b border-border bg-muted/50 px-4 py-3">
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Subject</p>
                          <p className="text-sm font-semibold leading-snug text-foreground">
                            {convoItem.emailSubject ?? convoItem.preview}
                          </p>
                        </div>
                        <div className="grid gap-1.5 text-xs">
                          <p>
                            <span className="text-muted-foreground">From:</span>{" "}
                            <span className="font-medium text-foreground">
                              {convoItem.resident} &lt;{emailRouting.residentEmail}&gt;
                            </span>
                          </p>
                          <p>
                            <span className="text-muted-foreground">To:</span>{" "}
                            <span className="font-medium text-foreground">
                              {convoItem.property} Leasing &lt;{emailRouting.propertyInboxEmail}&gt;
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 bg-background px-4 py-4">
                    {convoItem.bulkOutboundEmail && (
                      <ConversationBulkEmailCard
                        bulk={convoItem.bulkOutboundEmail}
                        onClick={() => setBulkEmailModal(convoItem.bulkOutboundEmail!)}
                      />
                    )}
                    {convoItem.messages.map((msg, idx) => renderMessageBlock(msg, idx, true))}
                  </div>
                </div>
              )}

              {convoItem.channel !== "Email" &&
                convoItem.messages.map((msg, idx) => renderMessageBlock(msg, idx, false))}
            </div>
          </div>

          {/* Composer — matches /conversations input chrome */}
          <div className="shrink-0 bg-muted/50">
            <div className="flex items-center gap-1 px-5 pt-3 pb-2">
              <Button
                variant={inputMode === "message" ? "default" : "ghost"}
                size="sm"
                className="gap-1.5 rounded-full text-xs"
                onClick={() => setInputMode("message")}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Message
              </Button>
              <Button
                variant={inputMode === "private_note" ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "gap-1.5 rounded-full text-xs",
                  inputMode === "private_note" &&
                    "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300"
                )}
                onClick={() => setInputMode("private_note")}
              >
                <StickyNote className="h-3.5 w-3.5" />
                Private Note
              </Button>
            </div>
            <div className="px-5 pb-4">
              <div
                className={cn(
                  "relative flex flex-col rounded-xl border transition-colors focus-within:ring-1 focus-within:ring-ring",
                  inputMode === "private_note"
                    ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
                    : "border-input bg-background"
                )}
              >
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={inputMode === "private_note" ? "Write a private note…" : "Write a message…"}
                  rows={2}
                  className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none"
                />
                <div className="flex items-center justify-between px-3 pb-2">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground" type="button" disabled>
                    <Paperclip className="h-3.5 w-3.5" />
                    Attach
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-full",
                      inputMode === "private_note" && "bg-amber-600 hover:bg-amber-700"
                    )}
                    disabled={!draft.trim()}
                    onClick={handleSend}
                    aria-label="Send"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
    <ConversationBulkEmailModal
      bulk={bulkEmailModal}
      open={bulkEmailModal !== null}
      onOpenChange={(o) => {
        if (!o) setBulkEmailModal(null);
      }}
      onAttachmentClick={(att) => {
        setBulkEmailModal(null);
        setSheetAttachmentPreview(att);
      }}
    />
    <Dialog
      open={sheetAttachmentPreview !== null}
      onOpenChange={(o) => {
        if (!o) setSheetAttachmentPreview(null);
      }}
    >
      <DialogContent className="flex max-h-[min(90vh,760px)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 space-y-1 border-b border-border px-6 py-4 text-left">
          <DialogTitle className="pr-8 text-base font-semibold leading-snug">
            {sheetAttachmentPreview?.name ?? "Attachment"}
          </DialogTitle>
          <DialogDescription className="sr-only">Prototype attachment preview.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/40 p-6">
          {sheetAttachmentPreview?.kind === "image" ? (
            <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1400&q=80"
                alt=""
                className="block h-auto w-full max-h-[min(65vh,520px)] object-cover"
              />
              <p className="border-t border-border px-4 py-2.5 text-center text-[11px] text-muted-foreground">
                Sample preview for prototype.
              </p>
            </div>
          ) : sheetAttachmentPreview ? (
            <div className="mx-auto max-w-xl rounded-lg border border-border bg-background shadow-sm">
              <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2">
                <FileTextIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span className="truncate text-xs font-medium text-foreground">{sheetAttachmentPreview.name}</span>
              </div>
              <p className="p-6 text-center text-[11px] text-muted-foreground">Sample document preview for prototype.</p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
