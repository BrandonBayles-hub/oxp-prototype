"use client";

import { Suspense, useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import {
  useAgents,
  AGENT_BUCKETS as BUCKETS,
  AGENT_TYPES,
  TYPE_LEVEL,
  type Agent,
  type AgentType,
} from "@/lib/agents-context";
import { useWorkforce } from "@/lib/workforce-context";
import { useVault } from "@/lib/vault-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  videoDialogOverlayClassName,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useTools } from "@/lib/tools-context";
import { useGovernance } from "@/lib/governance-context";
import { useAgentCompliance } from "@/lib/use-agent-compliance";
import { useR1Release } from "@/lib/r1-release-context";
import { useR1_2Release } from "@/lib/r1-2-release-context";
import { Tag, X, Search, DollarSign, Megaphone, Users, Wrench, ShieldCheck, Power, Activity, AlertCircle, Play, Clock, CheckCircle, CheckCircle2, XCircle, Calendar, Lightbulb, Target, Database, BarChart3, Pencil, Save, ArrowLeft, ArrowRight, Sparkles, BookOpen, Cog, Bot, Box, MessageSquare, Shield, Zap, Eye, EyeOff, Globe, Mail, Phone, Volume2, History, RotateCcw, Lock, ExternalLink, CirclePlay, TrendingUp, TrendingDown, Minus, ArrowUpDown } from "lucide-react";
import { Chat, type ChatMessage, type ChatSource, type ChatToolCall } from "@/components/ui/chat";

const AGENT_TYPE_ICON: Record<AgentType, string> = {
  operations: "/eli-cube.svg",
  intelligence: "/eli-cube.svg",
  efficiency: "/eli-cube.svg",
  autonomous: "/eli-cube.svg",
  fully_autonomous: "/eli-cube.svg",
};
import { useFeedback } from "@/lib/feedback-context";

const DATA_SOURCE_OPTIONS = [
  "Entrata Ledger",
  "Payment History",
  "Resident Accounts",
  "Entrata CRM",
  "Lead Activity",
  "Work Orders",
  "Lease Data",
  "Maintenance Requests",
  "Screening Results",
  "Communication Logs",
  "Survey Results",
  "Market Comps",
  "Vendor Invoices",
  "Equipment Registry",
];

const BUCKET_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Revenue & Financial Management": DollarSign,
  "Leasing & Marketing": Megaphone,
  "Resident Relations & Retention": Users,
  "Operations & Maintenance": Wrench,
  "Risk Management & Compliance": ShieldCheck,
};

const TEMPLATES: { name: string; bucket: (typeof BUCKETS)[number]; type: AgentType }[] = [
  { name: "Leasing AI", bucket: "Leasing & Marketing", type: "autonomous" },
  { name: "Renewal AI", bucket: "Resident Relations & Retention", type: "autonomous" },
  { name: "Maintenance AI", bucket: "Operations & Maintenance", type: "operations" },
  { name: "Payments AI", bucket: "Revenue & Financial Management", type: "autonomous" },
  { name: "Custom (from scratch)", bucket: BUCKETS[0], type: "autonomous" },
];

const CHANNEL_OPTIONS = [
  { value: "Chat", icon: MessageSquare },
  { value: "SMS", icon: Phone },
  { value: "Voice", icon: Volume2 },
  { value: "Email", icon: Mail },
  { value: "Portal", icon: Globe },
];

const PERSONA_OPTIONS = [
  { value: "professional", label: "Professional", description: "Clear, precise, and business-appropriate" },
  { value: "friendly", label: "Friendly & Warm", description: "Approachable, conversational, and welcoming" },
  { value: "empathetic", label: "Empathetic", description: "Understanding, patient, and supportive" },
  { value: "direct", label: "Direct & Concise", description: "Brief, action-oriented, minimal pleasantries" },
];

const PERSONA_TONE_MAP: Record<string, string> = {
  professional: "Be clear, precise, and business-appropriate. Maintain a professional tone at all times.",
  friendly: "Be approachable, conversational, and welcoming. Use a warm, personable tone.",
  empathetic: "Be understanding, patient, and supportive. Acknowledge concerns before solving them.",
  direct: "Be brief, action-oriented, and concise. Minimize pleasantries—get straight to the point.",
};

const BUCKET_ROLE_MAP: Record<string, { role: string; responsibilities: string[] }> = {
  "Revenue & Financial Management": {
    role: "financial operations assistant specializing in rent collection, payment processing, and revenue optimization",
    responsibilities: [
      "Process and track rent payments, late fees, and account balances",
      "Answer resident questions about charges, ledger entries, and payment history",
      "Identify delinquent accounts and initiate collection workflows",
      "Generate financial summaries and flag revenue anomalies",
    ],
  },
  "Leasing & Marketing": {
    role: "leasing assistant focused on converting prospects into residents",
    responsibilities: [
      "Answer questions about available units, pricing, floor plans, and amenities",
      "Schedule property tours and send follow-up communications",
      "Guide qualified prospects through the application process",
      "Track lead sources and conversion metrics to optimize outreach",
    ],
  },
  "Resident Relations & Retention": {
    role: "resident relations specialist focused on satisfaction and lease renewals",
    responsibilities: [
      "Proactively engage residents approaching lease expiration with renewal offers",
      "Address resident concerns, complaints, and service requests promptly",
      "Coordinate move-in/move-out processes and communications",
      "Monitor resident satisfaction signals and flag at-risk residents",
    ],
  },
  "Operations & Maintenance": {
    role: "maintenance operations coordinator managing work orders and vendor activity",
    responsibilities: [
      "Triage and prioritize incoming maintenance requests",
      "Dispatch work orders to on-site staff or third-party vendors",
      "Provide residents with status updates on open requests",
      "Track preventive maintenance schedules and equipment lifecycles",
    ],
  },
  "Risk Management & Compliance": {
    role: "compliance and risk management assistant ensuring regulatory adherence",
    responsibilities: [
      "Monitor communications for fair housing compliance",
      "Flag potential lease violations or liability risks",
      "Ensure all resident-facing language meets legal requirements",
      "Track regulatory deadlines, certifications, and audit readiness",
    ],
  },
};

function generateSystemPrompt(agentName: string, bucket: string, persona: string, existingPrompt?: string): string {
  const roleInfo = BUCKET_ROLE_MAP[bucket] ?? {
    role: "property management AI assistant",
    responsibilities: [
      "Respond to inquiries accurately and helpfully",
      "Follow company policies and escalation procedures",
      "Log all interactions for audit and quality review",
    ],
  };
  const toneGuide = PERSONA_TONE_MAP[persona] ?? PERSONA_TONE_MAP.professional;

  if (existingPrompt && existingPrompt.trim().length > 20) {
    const lines = existingPrompt.trim().split("\n");
    const hasRole = lines.some((l) => /role|you are/i.test(l));
    const hasGuidelines = lines.some((l) => /guideline|rule|must|never|always/i.test(l));
    const additions: string[] = [];
    if (!hasRole) additions.push(`\nYou are ${agentName}, a ${roleInfo.role}.`);
    if (!hasGuidelines) {
      additions.push("\n\nGuidelines:");
      additions.push("- " + toneGuide);
      additions.push("- Always verify information before sharing with residents or prospects");
      additions.push("- Escalate to a human when you are unsure or the request is outside your scope");
    }
    return existingPrompt.trim() + (additions.length ? "\n" + additions.join("\n") : "");
  }

  return [
    `You are ${agentName || "[Agent Name]"}, a ${roleInfo.role} at [Company].`,
    "",
    "Core responsibilities:",
    ...roleInfo.responsibilities.map((r) => `- ${r}`),
    "",
    "Guidelines:",
    `- ${toneGuide}`,
    "- Always verify information against system data before responding",
    "- Never make promises that are not confirmed in the system",
    "- Cite specific data (e.g. unit numbers, dates, amounts) when answering questions",
    "- Escalate to a human when unsure or when the request is outside your scope",
    "- Log every interaction for audit and quality review",
  ].join("\n");
}

export default function AgentRosterPage() {
  return (
    <Suspense>
      <AgentRosterContent />
    </Suspense>
  );
}

function AgentRosterContent() {
  const searchParams = useSearchParams();
  const { agents, addAgent, updateAgent } = useAgents();
  const { allLabels: workforceLabels } = useWorkforce();
  const { documents, updateDocument } = useVault();
  const { state: govState } = useGovernance();
  const complianceWarnings = useAgentCompliance(agents, govState, documents);
  const syncVaultLinkedAgents = (docIds?: string[]) => {
    if (!docIds?.length) return;
    const newAgentId = String(Date.now());
    for (const docId of docIds) {
      const doc = documents.find((d) => d.id === docId);
      if (!doc) continue;
      const existing = doc.linkedAgentIds ?? [];
      if (!existing.includes(newAgentId)) {
        updateDocument(docId, { linkedAgentIds: [...existing, newAgentId] });
      }
    }
  };
  const [bucketFilter, setBucketFilter] = useState("All");
  const { isR1Release } = useR1Release();
  const { isR1_2Release } = useR1_2Release();
  const isFullVersion = !isR1Release && !isR1_2Release;
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState<AgentType | "All">("All");
  const [sortBy, setSortBy] = useState<"level" | "most_used" | "trending">("level");
  const [search, setSearch] = useState("");
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateAuto, setShowCreateAuto] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [eliPlusActivateAgent, setEliPlusActivateAgent] = useState<string | null>(null);
  const [opsAgentId, setOpsAgentId] = useState<string | null>(null);
  const [intelAgentId, setIntelAgentId] = useState<string | null>(null);
  const [autoAgentId, setAutoAgentId] = useState<string | null>(null);
  const [expandedBucket, setExpandedBucket] = useState<string | null>(null);
  const [videoAgentName, setVideoAgentName] = useState<string | null>(null);
  const [cardSortBy, setCardSortBy] = useState<"recently_added" | "name" | "level">("recently_added");
  const [selectedBuckets, setSelectedBuckets] = useState<Set<string>>(new Set());
  const [selectedLevels, setSelectedLevels] = useState<Set<string>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());

  const toggleSetItem = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const cardFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return agents.filter((a) => {
      if (selectedBuckets.size > 0 && !selectedBuckets.has(a.bucket)) return false;
      if (selectedStatuses.size > 0 && !selectedStatuses.has(a.status)) return false;
      if (selectedLevels.size > 0) {
        const agentLevel = AGENT_TYPES.find((t) => t.value === a.type);
        if (agentLevel && !selectedLevels.has(agentLevel.label)) return false;
      }
      if (q) {
        const haystack = [a.name, a.description, a.bucket, ...(a.labels ?? [])].join(" ").toLowerCase();
        if (!q.split(/\s+/).every((word) => haystack.includes(word))) return false;
      }
      return true;
    });
  }, [agents, selectedBuckets, selectedStatuses, selectedLevels, search]);

  const cardSorted = useMemo(() => {
    const arr = [...cardFiltered];
    if (cardSortBy === "name") arr.sort((a, b) => a.name.localeCompare(b.name));
    else if (cardSortBy === "level") arr.sort((a, b) => (TYPE_LEVEL[b.type] ?? 0) - (TYPE_LEVEL[a.type] ?? 0));
    return arr;
  }, [cardFiltered, cardSortBy]);

  const activeFilterPills = useMemo(() => {
    const pills: { label: string; group: string; value: string }[] = [];
    selectedBuckets.forEach((b) => pills.push({ label: b, group: "bucket", value: b }));
    selectedLevels.forEach((l) => pills.push({ label: l, group: "level", value: l }));
    selectedStatuses.forEach((s) => pills.push({ label: s, group: "status", value: s }));
    return pills;
  }, [selectedBuckets, selectedLevels, selectedStatuses]);

  const removeFilterPill = (group: string, value: string) => {
    if (group === "bucket") toggleSetItem(setSelectedBuckets, value);
    else if (group === "level") toggleSetItem(setSelectedLevels, value);
    else if (group === "status") toggleSetItem(setSelectedStatuses, value);
  };

  const clearAllFilters = () => {
    setSelectedBuckets(new Set());
    setSelectedLevels(new Set());
    setSelectedStatuses(new Set());
  };

  const selectedId = opsAgentId ?? intelAgentId ?? autoAgentId;

  useEffect(() => {
    const agentId = searchParams.get("agent");
    if (!agentId) return;
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;
    if (agent.type === "operations" || agent.type === "intelligence" || agent.type === "efficiency") setOpsAgentId(agentId);
    else setAutoAgentId(agentId);
  }, [searchParams, agents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return agents.filter((a) => {
      if (bucketFilter !== "All" && a.bucket !== bucketFilter) return false;
      if (statusFilter !== "All" && a.status !== statusFilter) return false;
      if (typeFilter !== "All" && a.type !== typeFilter) return false;
      if (q) {
        const haystack = [a.name, a.description, a.bucket, ...(a.labels ?? [])].join(" ").toLowerCase();
        if (!q.split(/\s+/).every((word) => haystack.includes(word))) return false;
      }
      return true;
    });
  }, [agents, bucketFilter, statusFilter, typeFilter, search]);

  const byBucket = useMemo(() => {
    const map: Record<string, Agent[]> = {};
    BUCKETS.forEach((b) => { map[b] = []; });
    filtered.forEach((a) => {
      if (map[a.bucket]) map[a.bucket].push(a);
    });
    for (const bk of BUCKETS) {
      if (sortBy === "most_used") {
        map[bk].sort((x, y) => (y.weeklyUsage ?? 0) - (x.weeklyUsage ?? 0));
      } else if (sortBy === "trending") {
        const rank = { up: 2, flat: 1, down: 0 };
        map[bk].sort((x, y) => {
          const d = rank[y.trendDirection ?? "flat"] - rank[x.trendDirection ?? "flat"];
          return d !== 0 ? d : (y.weeklyUsage ?? 0) - (x.weeklyUsage ?? 0);
        });
      } else {
        map[bk].sort((x, y) => (TYPE_LEVEL[y.type] ?? 0) - (TYPE_LEVEL[x.type] ?? 0));
      }
    }
    return map;
  }, [filtered, sortBy]);

  return (
    <>
      <PageHeader
        title="Agent Roster"
        description="Enable, find, and manage AI agents. View config and performance per agent."
      />
      {isFullVersion ? (
        /* ═══════════════ CARD VIEW (Full Version) ═══════════════ */
        <div className="flex gap-6">
          {/* Left sidebar filters */}
          <aside className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-0 space-y-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Tag className="h-4 w-4" />
                Filters
              </div>

              {/* Subcategory */}
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Subcategory</p>
                <div className="space-y-1.5">
                  {BUCKETS.map((b) => (
                    <label key={b} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-sm text-foreground transition-colors hover:bg-muted/50">
                      <input
                        type="checkbox"
                        checked={selectedBuckets.has(b)}
                        onChange={() => toggleSetItem(setSelectedBuckets, b)}
                        className="h-3.5 w-3.5 rounded border-border accent-[#6366f1]"
                      />
                      <span className="truncate text-[13px]">{b}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Level */}
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Level</p>
                <div className="space-y-1.5">
                  {AGENT_TYPES.filter((t) => t.value !== "fully_autonomous").map((t) => (
                    <label key={t.value} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-sm text-foreground transition-colors hover:bg-muted/50">
                      <input
                        type="checkbox"
                        checked={selectedLevels.has(t.label)}
                        onChange={() => toggleSetItem(setSelectedLevels, t.label)}
                        className="h-3.5 w-3.5 rounded border-border accent-[#6366f1]"
                      />
                      <span className="truncate text-[13px]">{t.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</p>
                <div className="space-y-1.5">
                  {["Active", "Off"].map((s) => (
                    <label key={s} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-sm text-foreground transition-colors hover:bg-muted/50">
                      <input
                        type="checkbox"
                        checked={selectedStatuses.has(s)}
                        onChange={() => toggleSetItem(setSelectedStatuses, s)}
                        className="h-3.5 w-3.5 rounded border-border accent-[#6366f1]"
                      />
                      <span className="text-[13px]">{s}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="min-w-0 flex-1">
            {/* Top bar: search + count + sort */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search agents…"
                  className="select-base pl-8 w-64"
                />
                {search && (
                  <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{cardSorted.length} agents</span>
                <select
                  value={cardSortBy}
                  onChange={(e) => setCardSortBy(e.target.value as "recently_added" | "name" | "level")}
                  className="select-base w-auto min-w-[10rem]"
                >
                  <option value="recently_added">Recently Added</option>
                  <option value="name">Name</option>
                  <option value="level">Agent Level</option>
                </select>
              </div>
            </div>

            {/* Active filter pills */}
            {activeFilterPills.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {activeFilterPills.map((pill) => (
                  <button
                    key={`${pill.group}-${pill.value}`}
                    type="button"
                    onClick={() => removeFilterPill(pill.group, pill.value)}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {pill.label}
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Card grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {cardSorted.map((agent) => {
                const isOffEliPlus = agent.type === "autonomous" && agent.status === "Off";
                const typeInfo = AGENT_TYPES.find((t) => t.value === agent.type);
                const levelLabel = typeInfo?.label ?? "L1 · ELI Essentials";
                const levelShort = levelLabel.split("·")[0].trim();
                const levelName = levelLabel.split("·")[1]?.trim() ?? "";

                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => {
                      if (isOffEliPlus) { setEliPlusActivateAgent(agent.name); return; }
                      if (agent.type === "operations" || agent.type === "efficiency" || agent.type === "intelligence") setOpsAgentId(agent.id);
                      else setAutoAgentId(agent.id);
                    }}
                    className={`group relative flex flex-col rounded-xl border bg-white p-4 text-left transition-all hover:shadow-md ${
                      selectedId === agent.id
                        ? "border-[#6366f1]/40 shadow-md ring-1 ring-[#6366f1]/20"
                        : "border-border hover:border-border/80"
                    }`}
                  >
                    {/* Header: icon + name + video button */}
                    <div className="mb-3 flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50">
                        <img src={AGENT_TYPE_ICON[agent.type] ?? "/icon-l1-essentials.svg"} alt="" width={22} height={22} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold leading-tight text-foreground truncate">
                          {agent.type === "autonomous" ? `ELI+ ${agent.name}` : agent.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">Entrata</p>
                      </div>
                      {agent.type === "intelligence" && (
                        <button
                          type="button"
                          title="Watch agent walkthrough"
                          className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          onClick={(e) => { e.stopPropagation(); setVideoAgentName(agent.name); }}
                        >
                          <CirclePlay className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Description */}
                    <p className="mb-4 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                      {agent.description}
                    </p>

                    {/* Footer: level + status */}
                    <div className="mt-auto flex items-center justify-between gap-2">
                      <span className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {levelShort}{levelName ? ` · ${levelName}` : ""}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          agent.status === "Active"
                            ? "bg-[#B3FFCC] text-black"
                            : "bg-amber-400 text-amber-950"
                        }`}
                      >
                        {agent.status}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {cardSorted.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
                <Search className="mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm font-medium text-foreground">No agents found</p>
                <p className="mt-1 text-xs text-muted-foreground">Try adjusting your filters or search query.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ═══════════════ LIST VIEW (R1 / R1.2) ═══════════════ */
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search agents…"
                  className="select-base pl-8 w-52"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "level" | "most_used" | "trending")}
                className="select-base w-auto min-w-[11rem]"
              >
                <option value="level">View by: Agent Level</option>
                <option value="most_used">View by: Most Used</option>
                <option value="trending">View by: Trending</option>
              </select>
              <select
                value={bucketFilter}
                onChange={(e) => setBucketFilter(e.target.value)}
                className="select-base w-auto min-w-[11rem]"
              >
                <option value="All">All buckets</option>
                {BUCKETS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as AgentType | "All")}
                className="select-base w-auto min-w-[10rem]"
              >
                <option value="All">All types</option>
                {AGENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}{t.value === "fully_autonomous" ? " (Coming Soon)" : ""}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="select-base w-auto min-w-[10rem]"
              >
                <option value="All">All statuses</option>
                <option value="Active">Active</option>
                <option value="Off">Off</option>
              </select>
            </div>
          </div>

          <div>
            {typeFilter === "fully_autonomous" && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-purple-300 bg-purple-50/50 py-16 text-center dark:border-purple-800/40 dark:bg-purple-950/10">
                <img src="/eli-cube.svg" alt="" width={48} height={48} className="mb-4" />
                <h3 className="text-lg font-semibold text-foreground">L5 · Autonomous Agents</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Fully autonomous agents that independently manage end-to-end workflows, make decisions, and take action across your portfolio with minimal human oversight.
                </p>
                <Badge variant="outline" className="mt-4 border-purple-300 bg-purple-100 text-purple-800 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                  Coming Soon
                </Badge>
              </div>
            )}
            <div className={`space-y-8 ${typeFilter === "fully_autonomous" ? "hidden" : ""}`}>
              {BUCKETS.map((bucket) => {
                const items = byBucket[bucket] ?? [];

                return (
                  <section key={bucket} className="rounded-lg border border-[hsl(var(--border))]/50 bg-white">
                    <div className="px-4 py-4">
                      <h2 className="section-title mb-0 flex items-center gap-3 text-base">
                        {(() => { const Icon = BUCKET_ICONS[bucket]; return Icon ? <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted"><Icon className="h-4.5 w-4.5 text-foreground" /></span> : null; })()}
                        {bucket} <span className="font-normal text-[hsl(var(--muted-foreground))]">({items.length})</span>
                      </h2>
                    </div>
                    <ul>
                      {items.length === 0 ? (
                        <li className="px-4 py-4 text-[length:var(--text-body)] text-[hsl(var(--muted-foreground))]">
                          No agents in this bucket.
                        </li>
                      ) : (
                        items.map((agent, idx) => {
                          const isOffEliPlus = agent.type === "autonomous" && agent.status === "Off";
                          return (
                            <li
                              key={agent.id}
                              className={`flex items-center justify-between gap-4 px-4 py-3 ${
                                idx < items.length - 1 ? "border-b border-[hsl(var(--border))]/50 mx-4 px-0" : "mx-4 px-0"
                              } ${
                                isOffEliPlus
                                  ? "cursor-default"
                                  : selectedId === agent.id ? "bg-[hsl(var(--muted))]/50 cursor-pointer" : "hover:bg-[hsl(var(--muted))]/30 cursor-pointer"
                              }`}
                              onClick={() => {
                                if (isOffEliPlus) return;
                                if (agent.type === "operations" || agent.type === "efficiency" || agent.type === "intelligence") setOpsAgentId(agent.id);
                                else setAutoAgentId(agent.id);
                              }}
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <img src={AGENT_TYPE_ICON[agent.type] ?? "/icon-l1-essentials.svg"} alt="" width={20} height={20} className="shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-[length:var(--text-body)] font-medium text-[hsl(var(--foreground))] truncate">{agent.type === "autonomous" ? `ELI+ ${agent.name}` : agent.name}</p>
                                  <p className="text-[length:var(--text-caption)] text-[hsl(var(--muted-foreground))] truncate">{agent.description}</p>
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-3">
                                {!isR1Release && !isOffEliPlus && complianceWarnings[agent.id] && (
                                  <span
                                    className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-red-500 text-white dark:bg-red-900/30 dark:text-red-300"
                                    title={complianceWarnings[agent.id].map((w) => w.message).join("; ")}
                                  >
                                    <AlertCircle className="h-3 w-3" />
                                    {complianceWarnings[agent.id].length}
                                  </span>
                                )}
                                {isOffEliPlus ? (
                                  <Button
                                    size="sm"
                                    className="shrink-0 gap-1.5 bg-primary text-primary-foreground shadow-md opacity-100 hover:bg-primary/90"
                                    onClick={(e) => { e.stopPropagation(); setEliPlusActivateAgent(agent.name); }}
                                  >
                                    <Lock className="h-3 w-3" />
                                    Unlock ELI+ Agents
                                  </Button>
                                ) : (
                                  <>
                                    {agent.type === "intelligence" && (
                                      <button
                                        type="button"
                                        title="Watch agent walkthrough"
                                        className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                        onClick={(e) => { e.stopPropagation(); setVideoAgentName(agent.name); }}
                                      >
                                        <CirclePlay className="h-4 w-4" />
                                      </button>
                                    )}
                                    
                                    <span className="text-[length:var(--text-caption)] text-[hsl(var(--muted-foreground))]">
                                      {(() => {
                                        const label = AGENT_TYPES.find((t) => t.value === agent.type)?.label ?? "L1 · ELI Essentials";
                                        const dotIdx = label.indexOf("·");
                                        if (dotIdx === -1) return label;
                                        return <><span className="font-medium text-foreground">{label.slice(0, dotIdx).trim()}</span>{" · "}{label.slice(dotIdx + 1).trim()}</>;
                                      })()}
                                    </span>
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                        agent.status === "Active"
                                          ? "bg-[#B3FFCC] text-black"
                                          : "bg-amber-400 text-amber-950"
                                      }`}
                                    >
                                      {agent.status}
                                    </span>
                                  </>
                                )}
                              </div>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </section>
                );
              })}
            </div>
          </div>
        </>
      )}

      {opsAgentId && (() => {
        const opsAgent = agents.find((a) => a.id === opsAgentId);
        if (!opsAgent) return null;
        return (
          <OperationsAgentSheet
            agent={opsAgent}
            open
            onOpenChange={(open) => { if (!open) setOpsAgentId(null); }}
            onToggle={(status) => updateAgent(opsAgent.id, { status })}
            onVideoClick={setVideoAgentName}
          />
        );
      })()}

      {intelAgentId && (() => {
        const intelAgent = agents.find((a) => a.id === intelAgentId);
        if (!intelAgent) return null;
        return (
          <IntelligenceAgentSheet
            agent={intelAgent}
            open
            onOpenChange={(open) => { if (!open) setIntelAgentId(null); }}
            onUpdate={(updates) => updateAgent(intelAgent.id, updates)}
          />
        );
      })()}

      <AgentTypeSelectorDialog
        open={showTypeSelector}
        onOpenChange={setShowTypeSelector}
        onSelect={(type) => {
          setShowTypeSelector(false);
          if (type === "intelligence") setShowCreate(true);
          else if (type === "autonomous") setShowCreateAuto(true);
        }}
      />

      <CreateAgentDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onSave={(agent) => {
          addAgent(agent);
          syncVaultLinkedAgents(agent.vaultDocIds);
        }}
      />

      <CreateAutonomousAgentDialog
        open={showCreateAuto}
        onOpenChange={setShowCreateAuto}
        onSave={(agent) => {
          addAgent(agent);
          syncVaultLinkedAgents(agent.vaultDocIds);
        }}
      />

      <Dialog open={showComingSoon} onOpenChange={setShowComingSoon}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Box className="h-5 w-5 text-primary" /> Create Agent
            </DialogTitle>
            <DialogDescription>
              Agent creation is coming soon. You&apos;ll be able to build custom Intelligence, Operations, and Autonomous agents tailored to your portfolio&apos;s needs.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowComingSoon(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ELI+ Agent-Specific Activation Dialog */}
      <Dialog open={!!eliPlusActivateAgent} onOpenChange={(o) => !o && setEliPlusActivateAgent(null)}>
        {(() => {
          const eliPlusCtaConfigs: Record<string, {
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
          const cfg = eliPlusActivateAgent ? eliPlusCtaConfigs[eliPlusActivateAgent] : null;
          if (!cfg) return null;
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
                  <p className="mb-3 text-sm font-semibold text-foreground">What {eliPlusActivateAgent} does</p>
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
                  <div className={`grid gap-4 text-center ${cfg.impactMetrics.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
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
                <Button className="w-full" onClick={() => setEliPlusActivateAgent(null)}>
                  Set Up {cfg.title}
                </Button>
              </div>
            </DialogContent>
          );
        })()}
      </Dialog>

      {/* Agent Walkthrough Video Dialog */}
      <Dialog open={!!videoAgentName} onOpenChange={(o) => !o && setVideoAgentName(null)}>
        <DialogContent
          overlayClassName={videoDialogOverlayClassName}
          className="sm:max-w-2xl"
        >
          <DialogHeader>
            <DialogTitle>{videoAgentName}</DialogTitle>
            <DialogDescription>Agent walkthrough video</DialogDescription>
          </DialogHeader>
          <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-muted/50 border border-border">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <CirclePlay className="h-8 w-8" />
              </div>
              <p className="text-sm font-medium">Video coming soon</p>
              <p className="text-xs text-muted-foreground/70">A walkthrough demo of this agent will be available here</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {autoAgentId && (() => {
        const autoAgent = agents.find((a) => a.id === autoAgentId);
        if (!autoAgent) return null;
        return (
          <AutonomousAgentSheet
            agent={autoAgent}
            open
            onOpenChange={(open) => { if (!open) setAutoAgentId(null); }}
            onUpdate={(updates) => updateAgent(autoAgent.id, updates)}
          />
        );
      })()}
    </>
  );
}

function normalizeLabel(t: string): string {
  return t.trim().toLowerCase();
}


function CreateAgentDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (agent: Omit<Agent, "id">) => void;
}) {
  const { documents } = useVault();
  const { entrataModules, availableToolNames } = useTools();
  const [step, setStep] = useState(0);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bucket, setBucket] = useState<(typeof BUCKETS)[number]>(BUCKETS[0]);
  const [prompt, setPrompt] = useState("");
  const [goal, setGoal] = useState("");
  const [frequency, setFrequency] = useState("Weekly");
  const [dataSources, setDataSources] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState("");

  const approvedDocs = useMemo(
    () => documents.filter((d) => d.approvalStatus === "approved"),
    [documents]
  );

  const contractedToolNames = useMemo(
    () => entrataModules.filter((m) => m.contracted).flatMap((m) => m.tools.filter((t) => t.enabled).map((t) => ({ name: t.name, label: t.label }))),
    [entrataModules]
  );

  const reset = () => {
    setStep(0);
    setName("");
    setDescription("");
    setBucket(BUCKETS[0]);
    setPrompt("");
    setGoal("");
    setFrequency("Weekly");
    setDataSources([]);
    setSelectedTools([]);
    setSelectedDocs([]);
    setLabels([]);
    setLabelInput("");
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    const docNames = selectedDocs.map((id) => approvedDocs.find((d) => d.id === id)?.fileName).filter(Boolean);
    onSave({
      name: name.trim(),
      description: description.trim(),
      status: "Active",
      bucket,
      type: "intelligence",
      scope: "All properties",
      vaultBinding: docNames.length > 0 ? `SOPs: ${docNames.join(", ")}` : "—",
      vaultDocIds: selectedDocs,
      channels: [],
      toolsAllowed: selectedTools.length > 0 ? selectedTools : ["Entrata MCP"],
      guardrails: "",
      conversationCount: 0,
      resolutionRate: "—",
      escalationsCount: 0,
      revenueImpact: "—",
      labels,
      prompt: prompt.trim(),
      goal: goal.trim(),
      dataSources,
      analysisFrequency: frequency,
      insightsGenerated: 0,
      recommendationsActedOn: 0,
    });
    reset();
    onOpenChange(false);
  };

  const toggleDataSource = (ds: string) =>
    setDataSources((prev) => (prev.includes(ds) ? prev.filter((d) => d !== ds) : [...prev, ds]));

  const toggleTool = (tool: string) =>
    setSelectedTools((prev) => (prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]));

  const toggleDoc = (doc: string) =>
    setSelectedDocs((prev) => (prev.includes(doc) ? prev.filter((d) => d !== doc) : [...prev, doc]));

  const addLabel = () => {
    const t = labelInput.trim();
    if (t && !labels.includes(t)) setLabels((prev) => [...prev, t]);
    setLabelInput("");
  };

  const STEPS = ["Identity", "Behavior", "Knowledge", "Tools & Labels", "Review"];
  const canNext = step === 0 ? name.trim().length > 0 : true;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Intelligence Agent</DialogTitle>
          <DialogDescription>
            Build a custom agent that analyzes data and delivers insights and recommendations.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 py-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              {i > 0 && <div className="h-px w-4 bg-border" />}
              <button
                type="button"
                onClick={() => i <= step && setStep(i)}
                className={`flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[10px] font-bold transition-colors ${
                  i === step
                    ? "bg-foreground text-background"
                    : i < step
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </button>
              <span className={`hidden text-xs sm:inline ${i === step ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                {s}
              </span>
            </div>
          ))}
        </div>

        {/* Step 0: Identity */}
        {step === 0 && (
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Agent name</label>
              <Input placeholder="e.g. Delinquency Analyst" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Description</label>
              <Input placeholder="What does this agent analyze?" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Category</label>
              <select value={bucket} onChange={(e) => setBucket(e.target.value as (typeof BUCKETS)[number])} className="input-base w-full">
                {BUCKETS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Intelligence agent</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                This agent analyzes data, generates insights, and makes recommendations. It does not take actions or interact with residents directly.
              </p>
            </div>
          </div>
        )}

        {/* Step 1: Behavior */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Analysis prompt</label>
              <textarea
                className="input-base w-full resize-y text-sm"
                rows={4}
                placeholder="Tell the agent what to analyze and look for..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Describe the data patterns, trends, or anomalies this agent should focus on.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Goal</label>
              <textarea
                className="input-base w-full resize-y text-sm"
                rows={2}
                placeholder="e.g. Reduce delinquency rate by 15% and identify $50K+ in recoverable revenue"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                A measurable objective that defines success for this agent.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Analysis frequency</label>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="input-base w-full">
                <option value="Hourly">Hourly</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Knowledge */}
        {step === 2 && (
          <div className="space-y-5 py-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Data sources</label>
              <p className="mb-2 text-xs text-muted-foreground">Select the data this agent should analyze.</p>
              <div className="flex flex-wrap gap-1.5">
                {DATA_SOURCE_OPTIONS.map((ds) => {
                  const selected = dataSources.includes(ds);
                  return (
                    <button
                      key={ds}
                      type="button"
                      onClick={() => toggleDataSource(ds)}
                      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                        selected
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:border-foreground/40"
                      }`}
                    >
                      {ds}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Vault documents (SOPs & policies)</label>
              <p className="mb-2 text-xs text-muted-foreground">
                Ground the agent in approved documents from your Vault. Only approved documents are shown.
              </p>
              {approvedDocs.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No approved documents in the Vault yet.</p>
              ) : (
                <div className="max-h-48 space-y-1.5 overflow-y-auto">
                  {approvedDocs.map((doc) => {
                    const selected = selectedDocs.includes(doc.id);
                    return (
                      <label key={doc.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 hover:bg-muted/30">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleDoc(doc.id)}
                          className="h-4 w-4 rounded border-border"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{doc.fileName}</p>
                          {doc.tags && doc.tags.length > 0 && (
                            <div className="flex gap-1 mt-0.5">
                              {doc.tags.slice(0, 3).map((t) => (
                                <span key={t} className="text-[10px] text-muted-foreground">{t}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Tools & Labels */}
        {step === 3 && (
          <div className="space-y-5 py-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Tools</label>
              <p className="mb-2 text-xs text-muted-foreground">
                Select which Entrata MCP tools this agent can query for data. Only read tools are typical for intelligence agents.
              </p>
              <div className="max-h-48 space-y-1.5 overflow-y-auto">
                {contractedToolNames.map((tool) => {
                  const selected = selectedTools.includes(tool.name);
                  return (
                    <label key={tool.name} className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 hover:bg-muted/30">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleTool(tool.name)}
                        className="h-4 w-4 rounded border-border"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{tool.label}</p>
                        <code className="text-[10px] text-muted-foreground">{tool.name}</code>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Routing labels</label>
              <p className="mb-2 text-xs text-muted-foreground">
                Labels help route relevant escalations to this agent for analysis context.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {labels.map((l) => (
                  <span key={l} className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium">
                    {l}
                    <button type="button" onClick={() => setLabels((prev) => prev.filter((x) => x !== l))}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  placeholder="Add a label..."
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  className="h-8 text-xs"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLabel(); } }}
                />
                <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={addLabel}>Add</Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-4 py-2">
            <div className="rounded-md border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{name || "Untitled Agent"}</h4>
                <Badge variant="secondary" className="text-[10px]">Intelligence</Badge>
              </div>
              {description && <p className="text-sm text-muted-foreground">{description}</p>}

              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Category</span>
                  <p className="font-medium">{bucket}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Frequency</span>
                  <p className="font-medium">{frequency}</p>
                </div>
              </div>

              {prompt && (
                <div>
                  <span className="text-xs text-muted-foreground">Prompt</span>
                  <p className="mt-0.5 text-sm whitespace-pre-wrap">{prompt}</p>
                </div>
              )}
              {goal && (
                <div>
                  <span className="text-xs text-muted-foreground">Goal</span>
                  <p className="mt-0.5 text-sm">{goal}</p>
                </div>
              )}

              {dataSources.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">Data sources ({dataSources.length})</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {dataSources.map((ds) => <Badge key={ds} variant="secondary" className="text-[10px]">{ds}</Badge>)}
                  </div>
                </div>
              )}
              {selectedDocs.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">Vault documents ({selectedDocs.length})</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedDocs.map((id) => {
                      const doc = approvedDocs.find((d) => d.id === id);
                      return <Badge key={id} variant="outline" className="text-[10px]">{doc?.fileName ?? id}</Badge>;
                    })}
                  </div>
                </div>
              )}
              {selectedTools.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">Tools ({selectedTools.length})</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedTools.map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                  </div>
                </div>
              )}
              {labels.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">Labels</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {labels.map((l) => <Badge key={l} variant="secondary" className="text-[10px]">{l}</Badge>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div>
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { onOpenChange(false); reset(); }}>
              Cancel
            </Button>
            {step < STEPS.length - 1 ? (
              <Button size="sm" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
                Next <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleCreate} disabled={!name.trim()}>
                <Sparkles className="mr-1 h-3.5 w-3.5" /> Create Agent
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const L2_PROPERTY_DATA = [
  { name: "Harvest Peak Capital", vertical: "Conventional", runs: 21, errors: 0, avgDuration: "3m 45s", lastRun: "success" as const },
  { name: "Skyline Apartments", vertical: "Conventional", runs: 16, errors: 1, avgDuration: "3m 45s", lastRun: "success" as const },
  { name: "The Meridian", vertical: "Affordable", runs: 9, errors: 1, avgDuration: "3m 45s", lastRun: "error" as const },
];

function OperationsAgentSheet({
  agent,
  open,
  onOpenChange,
  onToggle,
  onVideoClick,
}: {
  agent: Agent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggle: (status: string) => void;
  onVideoClick?: (agentName: string) => void;
}) {
  const isActive = agent.status === "Active";
  const hasRuns = (agent.runsCompleted ?? 0) > 0;
  const lastRunDate = agent.lastRunAt ? new Date(agent.lastRunAt) : null;
  const [propertyStatuses, setPropertyStatuses] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    L2_PROPERTY_DATA.forEach((p) => { init[p.name] = p.name === "The Meridian" ? "Off" : "Active"; });
    return init;
  });
  const [showTurnOnAllConfirm, setShowTurnOnAllConfirm] = useState(false);
  const allActive = Object.values(propertyStatuses).every((s) => s === "Active");
  const [savedProperty, setSavedProperty] = useState<string | null>(null);

  const handlePropertyStatusChange = (propName: string, value: string) => {
    setPropertyStatuses((prev) => ({ ...prev, [propName]: value }));
    setSavedProperty(propName);
    setTimeout(() => setSavedProperty((cur) => cur === propName ? null : cur), 1500);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-4xl">
        <SheetHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <img src={AGENT_TYPE_ICON[agent.type] ?? "/icon-l1-essentials.svg"} alt="" width={20} height={20} />
              <SheetTitle>{agent.name}</SheetTitle>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isActive ? "bg-[#B3FFCC] text-black" : "bg-muted text-muted-foreground"
              }`}
            >
              {isActive ? "Active" : "Off"}
            </span>
          </div>
          <SheetDescription>{agent.bucket}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <p className="text-sm text-foreground">{agent.description}</p>

          {agent.type === "intelligence" && onVideoClick && (
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/50"
              onClick={() => onVideoClick(agent.name)}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <CirclePlay className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Watch Agent Walkthrough</p>
                <p className="text-xs text-muted-foreground">See how this agent works step by step</p>
              </div>
            </button>
          )}

          {/* Open Agent/ELI Essentials Settings link */}
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/50"
          >
            <span className="text-sm font-medium text-foreground">
              {agent.type === "operations" ? "Navigate to ELI Essentials in Entrata" : "Navigate to AI Agent in Entrata"}
            </span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* L1 agents only show name, category, description, and settings link */}
          {agent.type !== "operations" && <>

          {/* Performance metrics */}
          {hasRuns ? (
            <>
              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                  <p className="text-2xl font-semibold text-foreground">{agent.runsCompleted}</p>
                  <p className="text-xs text-muted-foreground">Runs</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                  <p className="text-2xl font-semibold text-foreground">{agent.errorCount ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                  <p className="text-2xl font-semibold text-foreground">{agent.avgRunDuration ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">Avg Duration</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-center flex flex-col items-center justify-center">
                  {agent.lastRunStatus === "success" ? (
                    <CheckCircle className="h-6 w-6 text-emerald-600" />
                  ) : agent.lastRunStatus === "error" ? (
                    <XCircle className="h-6 w-6 text-red-600" />
                  ) : (
                    <Clock className="h-6 w-6 text-muted-foreground" />
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Last Run</p>
                </div>
              </div>

              {lastRunDate && (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-3 text-sm">
                  {agent.lastRunStatus === "success" ? (
                    <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                  )}
                  <div>
                    <p className="font-medium text-foreground">Last run: {agent.lastRunStatus}</p>
                    <p className="text-xs text-muted-foreground">{lastRunDate.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </>
          ) : null}

          {/* Property Configuration */}
          <div className="rounded-xl border border-border bg-white">
            <div className="border-b border-border px-5 py-4">
              <h3 className="text-sm font-semibold text-foreground">Property Configuration</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Enable or disable this agent for individual properties. Changes are saved automatically.</p>
            </div>
            <div className="px-5 pt-3 pb-1">
              <select className="select-base mb-3 w-auto min-w-[10rem]">
                <option>All Properties</option>
              </select>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 font-medium text-muted-foreground">Property</th>
                    <th className="pb-2 font-medium text-muted-foreground">Status</th>
                    <th className="pb-2 font-medium text-muted-foreground">Vertical</th>
                    <th className="pb-2 font-medium text-muted-foreground text-right">Runs</th>
                    <th className="pb-2 font-medium text-muted-foreground text-right">Errors</th>
                    <th className="pb-2 font-medium text-muted-foreground">Avg Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {L2_PROPERTY_DATA.map((prop) => {
                    const propStatus = propertyStatuses[prop.name];
                    const justSaved = savedProperty === prop.name;
                    return (
                      <tr key={prop.name} className="border-b border-border/50">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${propStatus === "Active" ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                            <span className="font-medium text-foreground">{prop.name}</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <select
                              className="select-base h-8 w-[5.5rem] text-xs"
                              value={propStatus}
                              onChange={(e) => handlePropertyStatusChange(prop.name, e.target.value)}
                            >
                              <option value="Active">Active</option>
                              <option value="Off">Off</option>
                            </select>
                            <span
                              className={`text-[11px] font-medium text-emerald-600 transition-opacity duration-300 ${justSaved ? "opacity-100" : "opacity-0"}`}
                            >
                              Saved
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-muted-foreground">{prop.vertical}</td>
                        <td className="py-3 text-right font-medium text-foreground">{prop.runs}</td>
                        <td className="py-3 text-right">
                          <span className={prop.errors > 0 ? "font-medium text-red-600" : "text-foreground"}>{prop.errors}</span>
                        </td>
                        <td className="py-3 text-muted-foreground">{prop.avgDuration}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bulk Action */}
          <div className="rounded-xl border border-border bg-muted/30 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">All Properties</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {allActive
                    ? "This agent is currently active on all properties. Turn off to disable across your entire portfolio."
                    : "Enable this agent across all properties at once."}
                </p>
              </div>
              <Button
                variant={allActive ? "destructive" : "default"}
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() => setShowTurnOnAllConfirm(true)}
              >
                <Power className="h-3.5 w-3.5" />
                {allActive ? "Turn off all" : "Turn on all"}
              </Button>
            </div>
          </div>

          </>}
        </div>
      </SheetContent>

      {/* Confirmation dialog */}
      <Dialog open={showTurnOnAllConfirm} onOpenChange={setShowTurnOnAllConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{allActive ? "Turn off" : "Turn on"} {agent.name}?</DialogTitle>
            <DialogDescription>
              You are {allActive ? "turning off" : "turning on"} {agent.name} for all properties. This will {allActive ? "stop" : "start"} the agent across every property in your portfolio.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-end gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setShowTurnOnAllConfirm(false)}>No, cancel</Button>
            <Button
              onClick={() => {
                const newStatus = allActive ? "Off" : "Active";
                setPropertyStatuses((prev) => {
                  const updated: Record<string, string> = {};
                  for (const key of Object.keys(prev)) updated[key] = newStatus;
                  return updated;
                });
                onToggle(newStatus);
                setShowTurnOnAllConfirm(false);
              }}
            >
              Yes, {allActive ? "turn off" : "turn on"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}

function IntelligenceAgentSheet({
  agent,
  open,
  onOpenChange,
  onUpdate,
}: {
  agent: Agent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updates: Partial<Agent>) => void;
}) {
  const { documents } = useVault();
  const vaultDocs = useMemo(() => documents.filter((d) => d.type === "file").map((d) => ({ id: d.id, fileName: d.fileName, body: d.body })), [documents]);
  const agentDocs = useMemo(() => vaultDocs.filter((d) => agent.vaultDocIds?.includes(d.id)), [vaultDocs, agent.vaultDocIds]);
  const [editing, setEditing] = useState(false);
  const [promptDraft, setPromptDraft] = useState(agent.prompt ?? "");
  const [goalDraft, setGoalDraft] = useState(agent.goal ?? "");
  const [frequencyDraft, setFrequencyDraft] = useState(agent.analysisFrequency ?? "Weekly");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatDisabled, setChatDisabled] = useState(false);
  const { addFeedback } = useFeedback();

  const isActive = agent.status === "Active";
  const hasInsights = (agent.insightsGenerated ?? 0) > 0;
  const pending = agent.pendingChanges;

  const stageOrApply = (updates: Partial<Agent>) => {
    if (!isActive) {
      onUpdate(updates);
      return;
    }
    const configKeys = ["prompt", "goal", "analysisFrequency"] as const;
    const configUpdates: Record<string, string | undefined> = {};
    let hasConfigChange = false;
    for (const key of configKeys) {
      if (key in updates) {
        configUpdates[key] = updates[key] as string | undefined;
        hasConfigChange = true;
      }
    }
    if (hasConfigChange) {
      onUpdate({
        pendingChanges: {
          ...(pending ?? { changedAt: new Date().toISOString() }),
          ...configUpdates,
          changedAt: new Date().toISOString(),
        },
      });
    }
    const nonConfigUpdates = Object.fromEntries(
      Object.entries(updates).filter(([k]) => !(configKeys as readonly string[]).includes(k))
    );
    if (Object.keys(nonConfigUpdates).length > 0) onUpdate(nonConfigUpdates);
  };

  const handlePublish = () => {
    if (!pending) return;
    const applied: Partial<Agent> = {};
    if (pending.prompt !== undefined) applied.prompt = pending.prompt;
    if (pending.goal !== undefined) applied.goal = pending.goal;
    if (pending.analysisFrequency !== undefined) applied.analysisFrequency = pending.analysisFrequency;
    if (pending.prompt !== undefined && pending.prompt !== agent.prompt) {
      const history = agent.promptHistory ?? [];
      const nextVersion = history.length > 0 ? Math.max(...history.map((h) => h.version)) + 1 : 1;
      applied.promptHistory = [...history, { version: nextVersion, prompt: agent.prompt ?? "", changedAt: new Date().toISOString(), changedBy: "Admin", note: "Published from staging" }];
    }
    onUpdate({ ...applied, pendingChanges: undefined });
    setPromptDraft(pending.prompt ?? agent.prompt ?? "");
    setGoalDraft(pending.goal ?? agent.goal ?? "");
    setFrequencyDraft(pending.analysisFrequency ?? agent.analysisFrequency ?? "Weekly");
  };

  const handleDiscard = () => {
    onUpdate({ pendingChanges: undefined });
  };

  const handleSave = () => {
    stageOrApply({ prompt: promptDraft, goal: goalDraft, analysisFrequency: frequencyDraft });
    setEditing(false);
  };

  const handleCancel = () => {
    setPromptDraft(agent.prompt ?? "");
    setGoalDraft(agent.goal ?? "");
    setFrequencyDraft(agent.analysisFrequency ?? "Weekly");
    setEditing(false);
  };

  const handleFeedback = (messageIndex: number, rating: "positive" | "negative") => {
    const msg = chatMessages[messageIndex];
    if (!msg || msg.role !== "assistant") return;
    setChatMessages((prev) => prev.map((m, i) => i === messageIndex ? { ...m, feedback: rating } : m));
    addFeedback({ agentId: agent.id, agentName: agent.name, rating, messageText: msg.text });
  };

  const handleChatSend = (text: string) => {
    setChatMessages((prev) => [...prev, { role: "user", text }]);
    setChatDisabled(true);

    setTimeout(() => {
      const response = generateAgentChatResponse(text, agent, vaultDocs);
      if (response.updates) stageOrApply(response.updates);
      setChatMessages((prev) => [...prev, {
        role: "assistant",
        text: response.text,
        sources: response.sources,
        toolCalls: response.toolCalls,
        tokensUsed: response.tokensUsed,
        latencyMs: response.latencyMs,
      }]);
      setChatDisabled(false);
    }, 800 + Math.random() * 600);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="flex items-center gap-2">
              <img src={AGENT_TYPE_ICON[agent.type] ?? "/icon-l1-essentials.svg"} alt="" width={18} height={18} />
              {agent.name}
            </SheetTitle>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isActive ? "bg-[#B3FFCC] text-black" : "bg-muted text-muted-foreground"
              }`}
            >
              {isActive ? "Active" : "Off"}
            </span>
          </div>
          <SheetDescription>{agent.bucket}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <p className="text-sm text-foreground">{agent.description}</p>

          {/* Pending changes banner */}
          {pending && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Unpublished changes</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    These changes are staged and won&apos;t affect the live agent until you publish.
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-foreground">
                    {pending.prompt !== undefined && pending.prompt !== agent.prompt && (
                      <li>Prompt updated</li>
                    )}
                    {pending.goal !== undefined && pending.goal !== agent.goal && (
                      <li>Goal updated</li>
                    )}
                    {pending.analysisFrequency !== undefined && pending.analysisFrequency !== agent.analysisFrequency && (
                      <li>Frequency changed to {pending.analysisFrequency}</li>
                    )}
                  </ul>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={handlePublish}>Publish</Button>
                <Button variant="ghost" size="sm" onClick={handleDiscard}>Discard</Button>
              </div>
            </div>
          )}

          {/* Metrics */}
          {hasInsights ? (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                <Lightbulb className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                <p className="text-lg font-semibold text-foreground">{agent.insightsGenerated}</p>
                <p className="text-[11px] text-muted-foreground">Insights</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                <CheckCircle className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                <p className="text-lg font-semibold text-foreground">{agent.recommendationsActedOn ?? 0}</p>
                <p className="text-[11px] text-muted-foreground">Acted on</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                <BarChart3 className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                <p className="text-lg font-semibold text-foreground">
                  {agent.insightsGenerated && agent.recommendationsActedOn
                    ? `${Math.round((agent.recommendationsActedOn / agent.insightsGenerated) * 100)}%`
                    : "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">Action rate</p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/20 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                {isActive ? "No insights yet. This agent will generate insights on its next analysis cycle." : "Turn this agent on to start generating insights."}
              </p>
            </div>
          )}

          {/* Prompt & Goal */}
          <div className="space-y-4 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">Prompt & Goal</h4>
              {!editing ? (
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
              ) : (
                <div className="flex gap-1.5">
                  <Button variant="ghost" size="sm" onClick={handleCancel}>Cancel</Button>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="h-3.5 w-3.5" /> Save
                  </Button>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Analysis prompt</label>
              {editing ? (
                <textarea
                  value={promptDraft}
                  onChange={(e) => setPromptDraft(e.target.value)}
                  rows={4}
                  className="input-base w-full resize-y text-sm"
                  placeholder="Tell the agent how to analyze the data..."
                />
              ) : (
                <p className="text-sm text-foreground whitespace-pre-wrap">{agent.prompt || "No prompt configured."}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Goal</label>
              {editing ? (
                <textarea
                  value={goalDraft}
                  onChange={(e) => setGoalDraft(e.target.value)}
                  rows={2}
                  className="input-base w-full resize-y text-sm"
                  placeholder="What is the measurable goal for this agent?"
                />
              ) : (
                <div className="flex items-start gap-2">
                  <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <p className="text-sm text-foreground">{agent.goal || "No goal set."}</p>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Analysis frequency</label>
              {editing ? (
                <select
                  value={frequencyDraft}
                  onChange={(e) => setFrequencyDraft(e.target.value)}
                  className="select-base w-full text-sm"
                >
                  <option value="Hourly">Hourly</option>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-foreground">{agent.analysisFrequency ?? "Not set"}</span>
                </div>
              )}
            </div>
          </div>

          {/* Data Sources */}
          {(agent.dataSources?.length ?? 0) > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-muted-foreground" /> Data sources
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {agent.dataSources!.map((ds) => (
                  <span key={ds} className="inline-flex rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium">{ds}</span>
                ))}
              </div>
            </div>
          )}

          {/* Tools */}
          {agent.toolsAllowed.length > 0 && agent.toolsAllowed[0] !== "Entrata MCP" && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                <Cog className="h-3.5 w-3.5 text-muted-foreground" /> Tools
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {agent.toolsAllowed.map((t) => (
                  <span key={t} className="inline-flex rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium">
                    <code className="text-[10px]">{t}</code>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Knowledge / Vault binding */}
          {agent.vaultBinding && agent.vaultBinding !== "—" && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground" /> Knowledge
              </h4>
              <p className="text-sm text-foreground">{agent.vaultBinding}</p>
            </div>
          )}

          {/* Prompt Version History */}
          {(agent.promptHistory?.length ?? 0) > 0 && (
            <PromptVersionHistory
              history={agent.promptHistory!}
              currentPrompt={agent.prompt ?? ""}
              onRestore={(prompt) => {
                stageOrApply({ prompt });
                setPromptDraft(prompt);
              }}
            />
          )}

          {/* Recent Insights */}
          {(agent.recentInsights?.length ?? 0) > 0 && (
            <div>
              <h4 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
                <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" /> Recent insights
              </h4>
              <ul className="space-y-3">
                {agent.recentInsights!.map((insight, i) => (
                  <li key={i} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{insight.title}</p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {new Date(insight.at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{insight.summary}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Context Assembly Panel */}
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Cog className="h-3 w-3" /> Context Assembly
            </h4>
            <div className="grid gap-2 text-[11px]">
              <div className="flex items-start gap-2">
                <span className="shrink-0 font-medium text-muted-foreground w-20">Prompt</span>
                <span className="text-foreground truncate">{agent.prompt ? `"${agent.prompt.slice(0, 80)}${agent.prompt.length > 80 ? "…" : ""}"` : "Not set"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="shrink-0 font-medium text-muted-foreground w-20">Vault docs</span>
                <span className="text-foreground">{agentDocs.length > 0 ? agentDocs.map((d) => d.fileName).join(", ") : "None bound"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="shrink-0 font-medium text-muted-foreground w-20">Tools</span>
                <span className="text-foreground">{agent.toolsAllowed.length > 0 ? agent.toolsAllowed.join(", ") : "None"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="shrink-0 font-medium text-muted-foreground w-20">Data sources</span>
                <span className="text-foreground">{agent.dataSources?.join(", ") ?? "None"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="shrink-0 font-medium text-muted-foreground w-20">History</span>
                <span className="text-foreground">{chatMessages.length} turn{chatMessages.length !== 1 ? "s" : ""} in session</span>
              </div>
            </div>
          </div>

          {/* Chat */}
          <div>
            <h4 className="mb-2 text-sm font-semibold text-foreground">Ask or update this agent</h4>
            {chatMessages.length === 0 && (
              <p className="mb-2 text-xs text-muted-foreground">
                Use natural language to ask questions or give instructions. For example: &ldquo;Focus more on delinquency trends&rdquo; or &ldquo;What data sources are you using?&rdquo;
              </p>
            )}
            <Chat
              messages={chatMessages}
              onSend={handleChatSend}
              disabled={chatDisabled}
              placeholder="Ask a question or give an instruction..."
              roleLabels={{ user: "You", assistant: agent.name }}
              roleVariant={{ user: "inbound", assistant: "outbound" }}
              showAttach={false}
              messageListHeight={240}
              onFeedback={handleFeedback}
            />
          </div>

          {/* On/Off toggle */}
          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">Agent status</span>
            <Button
              variant={isActive ? "destructive" : "default"}
              size="sm"
              onClick={() => onUpdate({ status: isActive ? "Off" : "Active" })}
            >
              <Power className="h-4 w-4" />
              {isActive ? "Turn off" : "Turn on"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PromptVersionHistory({
  history,
  currentPrompt,
  onRestore,
}: {
  history: { version: number; prompt: string; changedAt: string; changedBy: string; note?: string }[];
  currentPrompt: string;
  onRestore: (prompt: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...history].sort((a, b) => b.version - a.version);

  return (
    <div>
      <button
        type="button"
        className="mb-2 flex w-full items-center gap-2 text-sm font-semibold text-foreground"
        onClick={() => setExpanded(!expanded)}
      >
        <History className="h-3.5 w-3.5 text-muted-foreground" />
        Prompt version history ({history.length})
        <span className="ml-auto text-[10px] text-muted-foreground">{expanded ? "collapse" : "expand"}</span>
      </button>
      {expanded && (
        <div className="space-y-2">
          {sorted.map((entry) => {
            const isCurrent = entry.prompt === currentPrompt;
            return (
              <div key={entry.version} className="rounded-lg border border-border p-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-semibold bg-muted rounded px-1.5 py-0.5">v{entry.version}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(entry.changedAt).toLocaleString()}</span>
                  <span className="text-[10px] text-muted-foreground">by {entry.changedBy}</span>
                  {isCurrent && <span className="text-[10px] font-medium text-emerald-600">current</span>}
                  {!isCurrent && (
                    <button
                      type="button"
                      className="ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-foreground bg-muted hover:bg-muted/80"
                      onClick={() => onRestore(entry.prompt)}
                    >
                      <RotateCcw className="h-2.5 w-2.5" /> Restore
                    </button>
                  )}
                </div>
                {entry.note && <p className="text-[10px] text-muted-foreground mb-1">{entry.note}</p>}
                <p className="text-xs text-foreground line-clamp-2 font-mono bg-muted/50 rounded p-1.5">{entry.prompt}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type EnrichedResponse = {
  text: string;
  updates?: Partial<Agent>;
  sources?: ChatSource[];
  toolCalls?: ChatToolCall[];
  tokensUsed?: number;
  latencyMs?: number;
};

function generateAgentChatResponse(
  message: string,
  agent: Agent,
  vaultDocs?: { id: string; fileName: string; body?: string }[]
): EnrichedResponse {
  const lower = message.toLowerCase();
  const staged = agent.status === "Active" ? "\n\nThis change has been staged — publish it from the banner above to make it live." : "";

  const agentDocs = vaultDocs?.filter((d) => agent.vaultDocIds?.includes(d.id)) ?? [];
  const makeSources = (count?: number): ChatSource[] => {
    const docs = agentDocs.length > 0 ? agentDocs : (vaultDocs ?? []).slice(0, 2);
    return docs.slice(0, count ?? 2).map((d) => ({
      title: d.fileName,
      snippet: d.body ? d.body.slice(0, 120) + "…" : `Operational document: ${d.fileName}`,
      docId: d.id,
    }));
  };
  const makeTools = (names?: string[]): ChatToolCall[] =>
    (names ?? agent.toolsAllowed ?? []).slice(0, 2).map((n) => ({ name: n, status: "success" as const }));
  const simLatency = () => 200 + Math.floor(Math.random() * 800);
  const simTokens = () => 80 + Math.floor(Math.random() * 300);

  if (lower.includes("data source") || lower.includes("what data") || lower.includes("where do you get")) {
    const sources = agent.dataSources?.join(", ") || "No data sources configured";
    return { text: `I'm currently pulling from: ${sources}. Would you like me to add or remove any data sources?`, sources: makeSources(1), tokensUsed: simTokens(), latencyMs: simLatency() };
  }

  if (lower.includes("what is your goal") || lower.includes("what's your goal") || lower.includes("your objective")) {
    return { text: agent.goal ? `My current goal is: ${agent.goal}` : "I don't have a goal set yet. Tell me what you'd like me to optimize for and I'll update it.", tokensUsed: simTokens(), latencyMs: simLatency() };
  }

  if (lower.includes("what is your prompt") || lower.includes("what are your instructions") || lower.includes("how do you analyze")) {
    return { text: agent.prompt ? `Here's my current analysis prompt:\n\n"${agent.prompt}"` : "I don't have an analysis prompt yet. Tell me what you'd like me to focus on.", tokensUsed: simTokens(), latencyMs: simLatency() };
  }

  if (lower.includes("how often") || lower.includes("frequency") || lower.includes("how frequently") || lower.includes("schedule")) {
    return { text: `I currently run ${agent.analysisFrequency?.toLowerCase() ?? "on no set schedule"}. Would you like me to change that? You can say "run daily" or "run monthly".`, tokensUsed: simTokens(), latencyMs: simLatency() };
  }

  if (lower.includes("run daily") || lower.includes("change to daily") || lower.includes("switch to daily")) {
    return { text: `Done — I've updated my analysis frequency to daily.${staged}`, updates: { analysisFrequency: "Daily" }, toolCalls: makeTools(["config.updateAgent"]), tokensUsed: simTokens(), latencyMs: simLatency() };
  }
  if (lower.includes("run weekly") || lower.includes("change to weekly") || lower.includes("switch to weekly")) {
    return { text: `Done — I've updated my analysis frequency to weekly.${staged}`, updates: { analysisFrequency: "Weekly" }, toolCalls: makeTools(["config.updateAgent"]), tokensUsed: simTokens(), latencyMs: simLatency() };
  }
  if (lower.includes("run monthly") || lower.includes("change to monthly") || lower.includes("switch to monthly")) {
    return { text: `Done — I've updated my analysis frequency to monthly.${staged}`, updates: { analysisFrequency: "Monthly" }, toolCalls: makeTools(["config.updateAgent"]), tokensUsed: simTokens(), latencyMs: simLatency() };
  }
  if (lower.includes("run hourly") || lower.includes("change to hourly")) {
    return { text: `Done — I've updated my analysis frequency to hourly. Note: this will generate a high volume of insights.${staged}`, updates: { analysisFrequency: "Hourly" }, toolCalls: makeTools(["config.updateAgent"]), tokensUsed: simTokens(), latencyMs: simLatency() };
  }

  if (lower.includes("focus on") || lower.includes("prioritize") || lower.includes("pay attention to") || lower.includes("look at")) {
    const focus = message.replace(/^.*?(focus on|prioritize|pay attention to|look at)\s*/i, "").replace(/[.!?]+$/, "").trim();
    const currentPrompt = agent.prompt ?? "";
    const updatedPrompt = currentPrompt
      ? `${currentPrompt}\n\nAdditional focus: ${focus}.`
      : `Focus on: ${focus}.`;
    return {
      text: `Got it — I've updated my prompt to include a focus on "${focus}".${staged}`,
      updates: { prompt: updatedPrompt },
      toolCalls: makeTools(["config.updateAgent"]),
      sources: makeSources(),
      tokensUsed: simTokens(),
      latencyMs: simLatency(),
    };
  }

  if (lower.includes("change goal") || lower.includes("update goal") || lower.includes("new goal") || lower.includes("set goal")) {
    const goalText = message.replace(/^.*?(change|update|new|set)\s*goal\s*(to)?\s*/i, "").replace(/[.!?]+$/, "").trim();
    if (goalText.length > 5) {
      return { text: `Goal updated to: "${goalText}"${staged}`, updates: { goal: goalText }, toolCalls: makeTools(["config.updateAgent"]), tokensUsed: simTokens(), latencyMs: simLatency() };
    }
    return { text: "What would you like the new goal to be? For example: 'Set goal to reduce delinquency by 20% this quarter.'", tokensUsed: simTokens(), latencyMs: simLatency() };
  }

  if (lower.includes("latest insight") || lower.includes("recent insight") || lower.includes("what did you find") || lower.includes("any findings")) {
    if (agent.recentInsights && agent.recentInsights.length > 0) {
      const latest = agent.recentInsights[0];
      return { text: `My most recent insight (${new Date(latest.at).toLocaleDateString()}):\n\n**${latest.title}**\n${latest.summary}`, sources: makeSources(), toolCalls: makeTools(), tokensUsed: simTokens(), latencyMs: simLatency() };
    }
    return { text: "I haven't generated any insights yet. Once I run my next analysis cycle, I'll have findings to share.", tokensUsed: simTokens(), latencyMs: simLatency() };
  }

  if (lower.includes("how many insight") || lower.includes("stats") || lower.includes("performance") || lower.includes("how are you doing")) {
    const total = agent.insightsGenerated ?? 0;
    const acted = agent.recommendationsActedOn ?? 0;
    const rate = total > 0 ? Math.round((acted / total) * 100) : 0;
    return { text: `Here's my performance summary:\n• ${total} insights generated\n• ${acted} recommendations acted on\n• ${rate}% action rate\n\nWant me to adjust my focus to improve these numbers?`, toolCalls: makeTools(["analytics.getAgentStats"]), tokensUsed: simTokens(), latencyMs: simLatency() };
  }

  if (lower.includes("turn off") || lower.includes("disable") || lower.includes("stop running")) {
    return { text: "I've turned myself off. No new insights will be generated until you turn me back on.", updates: { status: "Off" }, toolCalls: makeTools(["config.updateAgent"]), tokensUsed: simTokens(), latencyMs: simLatency() };
  }
  if (lower.includes("turn on") || lower.includes("enable") || lower.includes("start running") || lower.includes("activate")) {
    return { text: "I'm now active. I'll start generating insights on my next scheduled cycle.", updates: { status: "Active" }, toolCalls: makeTools(["config.updateAgent"]), tokensUsed: simTokens(), latencyMs: simLatency() };
  }

  return {
    text: `I understand you're asking about "${message}". Here's what I can help with:\n\n• **Update my focus** — "Focus on late payments" or "Prioritize vendor costs"\n• **Change my goal** — "Set goal to reduce costs by 10%"\n• **Adjust frequency** — "Run daily" or "Switch to monthly"\n• **Ask about my work** — "Latest insights", "How are you performing?"\n• **Check my config** — "What data sources?", "What's your prompt?"\n\nWhat would you like to do?`,
    sources: makeSources(1),
    tokensUsed: simTokens(),
    latencyMs: simLatency(),
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   Agent Type Selector
   ═══════════════════════════════════════════════════════════════════════ */

function AgentTypeSelectorDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: AgentType) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>What type of agent?</DialogTitle>
          <DialogDescription>
            Choose the agent type that matches your use case.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <button
            type="button"
            className="flex w-full items-start gap-4 rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted/50"
            onClick={() => onSelect("autonomous")}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">L4 · Conversational (ELI+)</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Interacts with residents directly across channels. Uses MCP tools to take actions within bounded autonomy and configurable guardrails.
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {["Chat", "SMS", "Voice", "Portal"].map((ch) => (
                  <span key={ch} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{ch}</span>
                ))}
              </div>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
          </button>

          <button
            type="button"
            className="flex w-full items-start gap-4 rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted/50"
            onClick={() => onSelect("intelligence")}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">L2 · Operational Efficiency</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Analyzes data, generates insights, and makes recommendations. Does not interact with residents or take actions directly.
              </p>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Create Autonomous Agent Dialog (5-step wizard)
   ═══════════════════════════════════════════════════════════════════════ */

function CreateAutonomousAgentDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (agent: Omit<Agent, "id">) => void;
}) {
  const { documents } = useVault();
  const { entrataModules } = useTools();
  const [step, setStep] = useState(0);

  // Step 1: Identity & Channels
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bucket, setBucket] = useState<(typeof BUCKETS)[number]>(BUCKETS[0]);
  const [channels, setChannels] = useState<string[]>(["Chat"]);
  const [scope, setScope] = useState("All properties");

  // Step 2: Persona & Instructions
  const [systemPrompt, setSystemPrompt] = useState("");
  const [persona, setPersona] = useState("professional");
  const [goal, setGoal] = useState("");
  const [aiAssisting, setAiAssisting] = useState(false);
  const [prohibitedPhrases, setProhibitedPhrases] = useState("");
  const [requiredDisclosures, setRequiredDisclosures] = useState("");

  // Step 3: Knowledge & Tools
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [approvalTools, setApprovalTools] = useState<string[]>([]);

  // Step 4: Guardrails & Escalation
  const [maxSteps, setMaxSteps] = useState(10);
  const [fairHousing, setFairHousing] = useState(true);
  const [escalationKeywords, setEscalationKeywords] = useState("");
  const [escalationDefault, setEscalationDefault] = useState("agent_handles");
  const [confidenceThreshold, setConfidenceThreshold] = useState(70);
  const [slaResponse, setSlaResponse] = useState(15);
  const [slaResolution, setSlaResolution] = useState(24);
  const [slaBusinessHours, setSlaBusinessHours] = useState(true);

  // Step 5: Review
  const [deploymentMode, setDeploymentMode] = useState<"shadow" | "active">("shadow");

  const approvedDocs = useMemo(
    () => documents.filter((d) => d.approvalStatus === "approved"),
    [documents]
  );

  const contractedTools = useMemo(
    () =>
      entrataModules
        .filter((m) => m.contracted)
        .flatMap((m) =>
          m.tools
            .filter((t) => t.enabled)
            .map((t) => ({ name: t.name, label: t.label, risk: t.risk, defaultApproval: t.requiresApproval }))
        ),
    [entrataModules]
  );

  const reset = () => {
    setStep(0);
    setName("");
    setDescription("");
    setBucket(BUCKETS[0]);
    setChannels(["Chat"]);
    setScope("All properties");
    setSystemPrompt("");
    setPersona("professional");
    setGoal("");
    setProhibitedPhrases("");
    setRequiredDisclosures("");
    setSelectedDocs([]);
    setSelectedTools([]);
    setApprovalTools([]);
    setMaxSteps(10);
    setFairHousing(true);
    setEscalationKeywords("");
    setEscalationDefault("agent_handles");
    setConfidenceThreshold(70);
    setSlaResponse(15);
    setSlaResolution(24);
    setSlaBusinessHours(true);
    setDeploymentMode("shadow");
  };

  const toggleChannel = (ch: string) =>
    setChannels((prev) => (prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]));

  const toggleTool = (tool: string) =>
    setSelectedTools((prev) => (prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]));

  const toggleApproval = (tool: string) =>
    setApprovalTools((prev) => (prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]));

  const toggleDoc = (doc: string) =>
    setSelectedDocs((prev) => (prev.includes(doc) ? prev.filter((d) => d !== doc) : [...prev, doc]));

  const parsedEscalationKeywords = escalationKeywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const parsedProhibited = prohibitedPhrases
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const parsedDisclosures = requiredDisclosures
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);

  const handleCreate = () => {
    if (!name.trim()) return;
    const docNames = selectedDocs.map((id) => approvedDocs.find((d) => d.id === id)?.fileName).filter(Boolean);
    onSave({
      name: name.trim(),
      description: description.trim(),
      status: deploymentMode === "shadow" ? "Training" : "Active",
      bucket,
      type: "autonomous",
      scope,
      vaultBinding: docNames.length > 0 ? `SOPs: ${docNames.join(", ")}` : "",
      vaultDocIds: selectedDocs,
      channels,
      toolsAllowed: selectedTools.length > 0 ? selectedTools : ["Entrata MCP"],
      guardrails: [
        fairHousing ? "Fair housing compliance" : "",
        `Max ${maxSteps} steps`,
        approvalTools.length > 0 ? `${approvalTools.length} tools require approval` : "",
      ].filter(Boolean).join("; "),
      conversationCount: 0,
      resolutionRate: "—",
      escalationsCount: 0,
      revenueImpact: "—",
      labels: [],
      systemPrompt: systemPrompt.trim(),
      persona,
      maxSteps,
      fairHousingEnabled: fairHousing,
      escalationKeywords: parsedEscalationKeywords,
      escalationDefault,
      confidenceThreshold,
      toolsRequireApproval: approvalTools,
      deploymentMode,
      prohibitedPhrases: parsedProhibited,
      requiredDisclosures: parsedDisclosures,
      slaFirstResponseMinutes: slaResponse,
      slaResolutionHours: slaResolution,
      slaBusinessHoursOnly: slaBusinessHours,
      goal: goal.trim(),
    });
    reset();
    onOpenChange(false);
  };

  const STEPS = ["Identity", "Persona", "Knowledge", "Guardrails", "Review"];
  const canNext = step === 0 ? name.trim().length > 0 : true;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src="/eli-cube.svg" alt="" width={20} height={20} />
            Create Autonomous Agent
          </DialogTitle>
          <DialogDescription>
            Build a conversational AI agent that interacts with residents and takes actions using MCP tools.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 py-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              {i > 0 && <div className="h-px w-4 bg-border" />}
              <button
                type="button"
                onClick={() => i <= step && setStep(i)}
                className={`flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[10px] font-bold transition-colors ${
                  i === step
                    ? "bg-foreground text-background"
                    : i < step
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </button>
              <span className={`hidden text-xs sm:inline ${i === step ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                {s}
              </span>
            </div>
          ))}
        </div>

        {/* ── Step 0: Identity & Channels ── */}
        {step === 0 && (
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Agent name</label>
              <Input placeholder="e.g. Leasing AI, Renewal Specialist" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Description</label>
              <Input placeholder="What does this agent do?" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Category</label>
              <select value={bucket} onChange={(e) => setBucket(e.target.value as (typeof BUCKETS)[number])} className="input-base w-full">
                {BUCKETS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Channels</label>
              <p className="mb-2 text-xs text-muted-foreground">Select which channels this agent operates on.</p>
              <div className="flex flex-wrap gap-2">
                {CHANNEL_OPTIONS.map((ch) => {
                  const active = channels.includes(ch.value);
                  const Icon = ch.icon;
                  return (
                    <button
                      key={ch.value}
                      type="button"
                      onClick={() => toggleChannel(ch.value)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:border-foreground/40"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {ch.value}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Scope</label>
              <select value={scope} onChange={(e) => setScope(e.target.value)} className="input-base w-full">
                <option value="All properties">All properties</option>
                <option value="Custom">Custom (specific properties)</option>
              </select>
              {scope === "Custom" && (
                <Input
                  className="mt-2"
                  placeholder="e.g. Hillside Living, Jamison Apartments"
                  onChange={(e) => setScope(e.target.value || "Custom")}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Step 1: Persona & Instructions ── */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">System prompt</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={aiAssisting}
                  onClick={() => {
                    setAiAssisting(true);
                    setTimeout(() => {
                      setSystemPrompt((prev) => generateSystemPrompt(name, bucket, persona, prev));
                      setAiAssisting(false);
                    }, 600);
                  }}
                  className="h-7 gap-1.5 text-xs"
                >
                  {aiAssisting ? (
                    <><Sparkles className="h-3.5 w-3.5 animate-spin" /> Generating…</>
                  ) : (
                    <><Sparkles className="h-3.5 w-3.5" /> {systemPrompt ? "Improve with AI" : "Generate with AI"}</>
                  )}
                </Button>
              </div>
              <textarea
                className="input-base w-full resize-y text-sm font-mono"
                rows={12}
                placeholder={"You are a leasing assistant for [Company]. Your role is to help prospective residents find their perfect home.\n\nCore responsibilities:\n- Answer questions about available units, pricing, and amenities\n- Schedule property tours and follow up with prospects\n- Guide qualified prospects through the application process\n\nGuidelines:\n- Always be helpful and accurate\n- Never make promises not confirmed in the system\n- Cite specific data when answering questions"}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                The core instructions that define this agent&apos;s behavior, personality, and boundaries. This is the equivalent of a Claude system prompt.
              </p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Persona</label>
              <div className="grid grid-cols-2 gap-2">
                {PERSONA_OPTIONS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPersona(p.value)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      persona === p.value
                        ? "border-foreground bg-foreground/5"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <p className="text-sm font-medium">{p.label}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{p.description}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Goal</label>
              <textarea
                className="input-base w-full resize-y text-sm"
                rows={2}
                placeholder="e.g. Resolve 85% of inquiries without escalation and schedule tours for 60% of qualified prospects"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Prohibited phrases</label>
                <Input
                  placeholder="competitor names, guaranteed..."
                  value={prohibitedPhrases}
                  onChange={(e) => setProhibitedPhrases(e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">Comma-separated</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Required disclosures</label>
                <Input
                  placeholder="pet policy, fair housing..."
                  value={requiredDisclosures}
                  onChange={(e) => setRequiredDisclosures(e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">Comma-separated</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Knowledge & Tools ── */}
        {step === 2 && (
          <div className="space-y-5 py-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Vault documents (SOPs & policies)</label>
              <p className="mb-2 text-xs text-muted-foreground">
                Ground the agent in approved documents. The agent will cite these when answering.
              </p>
              {approvedDocs.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No approved documents in the Vault yet.</p>
              ) : (
                <div className="max-h-36 space-y-1.5 overflow-y-auto">
                  {approvedDocs.map((doc) => {
                    const sel = selectedDocs.includes(doc.id);
                    return (
                      <label key={doc.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 hover:bg-muted/30">
                        <input type="checkbox" checked={sel} onChange={() => toggleDoc(doc.id)} className="h-4 w-4 rounded border-border" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{doc.fileName}</p>
                          {doc.tags && doc.tags.length > 0 && (
                            <div className="flex gap-1 mt-0.5">
                              {doc.tags.slice(0, 3).map((t) => <span key={t} className="text-[10px] text-muted-foreground">{t}</span>)}
                            </div>
                          )}
                        </div>
                        <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">MCP Tools</label>
              <p className="mb-2 text-xs text-muted-foreground">
                Select which tools this agent can use. Toggle the shield to require human approval before execution.
              </p>
              <div className="max-h-56 space-y-1.5 overflow-y-auto">
                {contractedTools.map((tool) => {
                  const sel = selectedTools.includes(tool.name);
                  const needsApproval = approvalTools.includes(tool.name);
                  return (
                    <div key={tool.name} className="flex items-center gap-2 rounded-md border border-border p-2">
                      <input
                        type="checkbox"
                        checked={sel}
                        onChange={() => toggleTool(tool.name)}
                        className="h-4 w-4 shrink-0 rounded border-border"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{tool.label}</p>
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            tool.risk === "high" ? "bg-red-500 text-white" :
                            tool.risk === "medium" ? "bg-amber-400 text-amber-950" :
                            "bg-[#B3FFCC] text-black"
                          }`}>
                            {tool.risk}
                          </span>
                        </div>
                        <code className="text-[10px] text-muted-foreground">{tool.name}</code>
                      </div>
                      {sel && (
                        <button
                          type="button"
                          onClick={() => toggleApproval(tool.name)}
                          className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                            needsApproval
                              ? "bg-amber-400 text-amber-950"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                          title={needsApproval ? "Human approval required" : "No approval needed"}
                        >
                          {needsApproval ? <ShieldCheck className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                          {needsApproval ? "Approval on" : "No approval"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Guardrails & Escalation ── */}
        {step === 3 && (
          <div className="space-y-5 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Max agent steps</label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={maxSteps}
                  onChange={(e) => setMaxSteps(Number(e.target.value) || 10)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Industry best practice: &le;10 steps before human intervention.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Confidence threshold</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(Number(e.target.value) || 70)}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Below this confidence, escalate to a human.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Fair housing compliance</p>
                <p className="text-xs text-muted-foreground">Enforce fair housing guardrails and consistent policy checks</p>
              </div>
              <button
                type="button"
                onClick={() => setFairHousing(!fairHousing)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${fairHousing ? "bg-foreground" : "bg-muted"}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition-transform ${fairHousing ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Escalation keywords</label>
              <Input
                placeholder="mold, water damage, emergency, legal, complaint, discrimination..."
                value={escalationKeywords}
                onChange={(e) => setEscalationKeywords(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Conversations containing these keywords always route to a human. Comma-separated.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Default escalation behavior</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEscalationDefault("agent_handles")}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    escalationDefault === "agent_handles" ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/30"
                  }`}
                >
                  <p className="text-sm font-medium">Agent handles</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Agent resolves unless a trigger fires</p>
                </button>
                <button
                  type="button"
                  onClick={() => setEscalationDefault("always_human")}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    escalationDefault === "always_human" ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/30"
                  }`}
                >
                  <p className="text-sm font-medium">Always human</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Every conversation goes to staff</p>
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">SLA targets</label>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">First response</label>
                  <div className="flex items-center gap-1">
                    <Input type="number" min={1} value={slaResponse} onChange={(e) => setSlaResponse(Number(e.target.value) || 15)} />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">min</span>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Resolution target</label>
                  <div className="flex items-center gap-1">
                    <Input type="number" min={1} value={slaResolution} onChange={(e) => setSlaResolution(Number(e.target.value) || 24)} />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">hrs</span>
                  </div>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={slaBusinessHours}
                      onChange={() => setSlaBusinessHours(!slaBusinessHours)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <span className="text-xs">Business hours only</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4: Review & Deploy ── */}
        {step === 4 && (
          <div className="space-y-4 py-2">
            <div className="rounded-md border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src="/eli-cube.svg" alt="" width={16} height={16} />
                  <h4 className="font-semibold">{name || "Untitled Agent"}</h4>
                </div>
                <Badge variant="secondary" className="text-[10px]">Autonomous</Badge>
              </div>
              {description && <p className="text-sm text-muted-foreground">{description}</p>}

              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Category</span>
                  <p className="font-medium">{bucket}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Persona</span>
                  <p className="font-medium">{PERSONA_OPTIONS.find((p) => p.value === persona)?.label}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Channels</span>
                  <p className="font-medium">{channels.join(", ") || "None"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Scope</span>
                  <p className="font-medium">{scope}</p>
                </div>
              </div>

              {systemPrompt && (
                <div>
                  <span className="text-xs text-muted-foreground">System prompt</span>
                  <p className="mt-0.5 text-sm whitespace-pre-wrap line-clamp-3">{systemPrompt}</p>
                </div>
              )}
              {goal && (
                <div>
                  <span className="text-xs text-muted-foreground">Goal</span>
                  <p className="mt-0.5 text-sm">{goal}</p>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Tools ({selectedTools.length})</span>
                  {selectedTools.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedTools.slice(0, 4).map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t.split("/").pop()}</Badge>)}
                      {selectedTools.length > 4 && <Badge variant="secondary" className="text-[10px]">+{selectedTools.length - 4}</Badge>}
                    </div>
                  ) : <p className="font-medium">None</p>}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Require approval ({approvalTools.length})</span>
                  {approvalTools.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {approvalTools.map((t) => <Badge key={t} variant="outline" className="text-[10px] border-amber-300 text-amber-700">{t.split("/").pop()}</Badge>)}
                    </div>
                  ) : <p className="font-medium">None</p>}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Max steps</span>
                  <p className="font-medium">{maxSteps}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Fair housing</span>
                  <p className="font-medium">{fairHousing ? "Enabled" : "Disabled"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Confidence</span>
                  <p className="font-medium">{confidenceThreshold}%</p>
                </div>
              </div>

              {parsedEscalationKeywords.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">Escalation keywords</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {parsedEscalationKeywords.map((k) => <Badge key={k} variant="secondary" className="text-[10px]">{k}</Badge>)}
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">SLA response</span>
                  <p className="font-medium">{slaResponse} min</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">SLA resolution</span>
                  <p className="font-medium">{slaResolution} hrs</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Business hours</span>
                  <p className="font-medium">{slaBusinessHours ? "Yes" : "No"}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Deployment mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeploymentMode("shadow")}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    deploymentMode === "shadow" ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    <p className="text-sm font-medium">Shadow</p>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Agent processes conversations but responses are reviewed before sending. Recommended for new agents.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setDeploymentMode("active")}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    deploymentMode === "active" ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    <p className="text-sm font-medium">Active</p>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Agent responds to residents directly within its configured guardrails and tools.
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div>
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { onOpenChange(false); reset(); }}>
              Cancel
            </Button>
            {step < STEPS.length - 1 ? (
              <Button size="sm" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
                Next <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleCreate} disabled={!name.trim()}>
                <Bot className="mr-1 h-3.5 w-3.5" /> Deploy Agent
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Autonomous Agent Sheet (view/edit/chat with a deployed autonomous agent)
   ═══════════════════════════════════════════════════════════════════════ */

function AutonomousAgentSheet({
  agent,
  open,
  onOpenChange,
  onUpdate,
}: {
  agent: Agent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updates: Partial<Agent>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [promptDraft, setPromptDraft] = useState(agent.systemPrompt ?? "");
  const [goalDraft, setGoalDraft] = useState(agent.goal ?? "");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatDisabled, setChatDisabled] = useState(false);
  const [aiAssisting, setAiAssisting] = useState(false);
  const [viewMode, setViewMode] = useState<"config" | "simulate">("config");
  const [simMessages, setSimMessages] = useState<ChatMessage[]>([]);
  const [simDisabled, setSimDisabled] = useState(false);
  const { addFeedback } = useFeedback();

  const isActive = agent.status === "Active";
  const isShadow = agent.deploymentMode === "shadow" || agent.status === "Training";
  const pending = agent.pendingChanges;

  const stageOrApply = (updates: Partial<Agent>) => {
    if (!isActive && !isShadow) {
      onUpdate(updates);
      return;
    }
    const configKeys = ["systemPrompt", "goal"] as const;
    const configUpdates: Record<string, string | undefined> = {};
    let hasConfigChange = false;
    for (const key of configKeys) {
      if (key in updates) {
        configUpdates[key] = updates[key] as string | undefined;
        hasConfigChange = true;
      }
    }
    if (hasConfigChange) {
      onUpdate({
        pendingChanges: {
          ...(pending ?? { changedAt: new Date().toISOString() }),
          ...configUpdates,
          changedAt: new Date().toISOString(),
        },
      });
    }
    const nonConfigUpdates = Object.fromEntries(
      Object.entries(updates).filter(([k]) => !(configKeys as readonly string[]).includes(k))
    );
    if (Object.keys(nonConfigUpdates).length > 0) onUpdate(nonConfigUpdates);
  };

  const handlePublish = () => {
    if (!pending) return;
    const applied: Partial<Agent> = {};
    if (pending.systemPrompt !== undefined) applied.systemPrompt = pending.systemPrompt;
    if (pending.goal !== undefined) applied.goal = pending.goal;
    onUpdate({ ...applied, pendingChanges: undefined });
    setPromptDraft(pending.systemPrompt ?? agent.systemPrompt ?? "");
    setGoalDraft(pending.goal ?? agent.goal ?? "");
  };

  const handleDiscard = () => onUpdate({ pendingChanges: undefined });

  const handleSave = () => {
    stageOrApply({ systemPrompt: promptDraft, goal: goalDraft });
    setEditing(false);
  };

  const handleCancel = () => {
    setPromptDraft(agent.systemPrompt ?? "");
    setGoalDraft(agent.goal ?? "");
    setEditing(false);
  };

  const handleChatSend = (text: string) => {
    setChatMessages((prev) => [...prev, { role: "user", text }]);
    setChatDisabled(true);
    setTimeout(() => {
      const response = generateAutonomousAgentChatResponse(text, agent);
      if (response.updates) stageOrApply(response.updates);
      setChatMessages((prev) => [...prev, { role: "assistant", text: response.text }]);
      setChatDisabled(false);
    }, 800 + Math.random() * 600);
  };

  const ELI_PLUS_PROPERTIES = [
    { name: "Harvest Peak Capital", status: "Active", vertical: "Conventional", complete: 94 },
    { name: "Skyline Apartments", status: "Active", vertical: "Conventional", complete: 87 },
    { name: "The Meridian", status: "Setup", vertical: "Affordable", complete: 42 },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <img src="/eli-cube.svg" alt="" width={20} height={20} />
              <SheetTitle>{agent.name}</SheetTitle>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isActive ? "bg-[#B3FFCC] text-black" : "bg-muted text-muted-foreground"
              }`}
            >
              {isActive ? "Active" : agent.status}
            </span>
          </div>
          <SheetDescription>{agent.bucket}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <p className="text-sm text-foreground">{agent.description}</p>

          {/* Open ELI+ Settings link */}
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <img src="/eli-cube.svg" alt="" width={16} height={16} />
              <span className="text-sm font-medium text-foreground">Open ELI+ Settings in Entrata</span>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* View Help Article */}
          <Button variant="outline" size="sm">View Help Article</Button>

          {/* Properties Table */}
          <div>
            <select className="select-base mb-4 w-auto min-w-[10rem]">
              <option>All Properties</option>
            </select>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Property</th>
                  <th className="pb-2 font-medium text-muted-foreground">Status</th>
                  <th className="pb-2 font-medium text-muted-foreground">Vertical</th>
                  <th className="pb-2 font-medium text-muted-foreground">Complete</th>
                </tr>
              </thead>
              <tbody>
                {ELI_PLUS_PROPERTIES.map((prop) => (
                  <tr key={prop.name} className="border-b border-border/50">
                    <td className="py-3 font-medium text-foreground">{prop.name}</td>
                    <td className="py-3">
                      <span className={`text-sm font-medium ${prop.status === "Active" ? "text-green-600" : "text-amber-600"}`}>
                        {prop.status}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground">{prop.vertical}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${prop.complete >= 80 ? "bg-green-500" : prop.complete >= 50 ? "bg-amber-400" : "bg-muted-foreground/40"}`}
                            style={{ width: `${prop.complete}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground">{prop.complete}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pending changes banner */}
          {pending && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
              <div>
                <p className="text-sm font-medium text-foreground">Unpublished changes</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Changes are staged and won&apos;t affect the live agent until published.
                </p>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={handlePublish}>Publish</Button>
                <Button variant="ghost" size="sm" onClick={handleDiscard}>Discard</Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function generateAutonomousAgentChatResponse(
  message: string,
  agent: Agent
): { text: string; updates?: Partial<Agent> } {
  const lower = message.toLowerCase();
  const staged = (agent.status === "Active" || agent.deploymentMode === "shadow")
    ? "\n\nThis change has been staged — publish it from the banner above to make it live."
    : "";

  if (lower.includes("what tools") || lower.includes("which tools") || lower.includes("my tools")) {
    const tools = agent.toolsAllowed.join(", ") || "No tools configured";
    const approvals = agent.toolsRequireApproval?.length ?? 0;
    return { text: `I currently have access to: ${tools}.${approvals > 0 ? ` ${approvals} of these require human approval before execution.` : ""} Want to add or remove any?` };
  }

  if (lower.includes("what channel") || lower.includes("which channel") || lower.includes("my channel")) {
    return { text: `I'm currently operating on: ${agent.channels.join(", ") || "No channels configured"}. Would you like to add or remove any?` };
  }

  if (lower.includes("add") && (lower.includes("sms") || lower.includes("voice") || lower.includes("email") || lower.includes("chat") || lower.includes("portal"))) {
    const channelMap: Record<string, string> = { sms: "SMS", voice: "Voice", email: "Email", chat: "Chat", portal: "Portal" };
    const newChannels: string[] = [];
    for (const [key, value] of Object.entries(channelMap)) {
      if (lower.includes(key) && !agent.channels.includes(value)) newChannels.push(value);
    }
    if (newChannels.length > 0) {
      return { text: `Added ${newChannels.join(", ")} to my channels.`, updates: { channels: [...agent.channels, ...newChannels] } };
    }
    return { text: "Those channels are already enabled." };
  }

  if (lower.includes("escalat") && (lower.includes("keyword") || lower.includes("add") || lower.includes("about"))) {
    const existing = agent.escalationKeywords ?? [];
    const words = message.replace(/^.*?(escalat[e]?|add|about)\s*/i, "").replace(/[.!?]+$/, "").split(",").map((w) => w.trim().toLowerCase()).filter(Boolean);
    const newKeywords = words.filter((w) => !existing.includes(w));
    if (newKeywords.length > 0) {
      return {
        text: `Added escalation keywords: ${newKeywords.join(", ")}. Conversations with these topics will route to a human.`,
        updates: { escalationKeywords: [...existing, ...newKeywords] },
      };
    }
    return { text: `Current escalation keywords: ${existing.join(", ") || "None configured"}.` };
  }

  if (lower.includes("what is your prompt") || lower.includes("system prompt") || lower.includes("your instructions") || lower.includes("how do you behave")) {
    return { text: agent.systemPrompt ? `Here's my current system prompt:\n\n"${agent.systemPrompt}"` : "I don't have a system prompt configured yet. Click Edit above to add one, or tell me what you'd like me to do." };
  }

  if (lower.includes("what is your goal") || lower.includes("what's your goal") || lower.includes("your objective")) {
    return { text: agent.goal ? `My current goal is: ${agent.goal}` : "No goal set. Tell me what you'd like me to optimize for." };
  }

  if (lower.includes("change goal") || lower.includes("update goal") || lower.includes("set goal") || lower.includes("new goal")) {
    const goalText = message.replace(/^.*?(change|update|set|new)\s*goal\s*(to)?\s*/i, "").replace(/[.!?]+$/, "").trim();
    if (goalText.length > 5) {
      return { text: `Goal updated to: "${goalText}"${staged}`, updates: { goal: goalText } };
    }
    return { text: "What should the new goal be? For example: 'Set goal to resolve 90% of inquiries without escalation.'" };
  }

  if (lower.includes("max step") || lower.includes("step limit") || lower.includes("how many step")) {
    return { text: `My current step limit is ${agent.maxSteps ?? 10}. Industry best practice is ≤10 steps before human intervention. Want to change it?` };
  }

  if (lower.includes("don't") || lower.includes("never") || lower.includes("prohibit") || lower.includes("stop saying")) {
    const phrase = message.replace(/^.*?(don't|never|prohibit|stop saying)\s*/i, "").replace(/[.!?]+$/, "").trim();
    if (phrase.length > 2) {
      const existing = agent.prohibitedPhrases ?? [];
      return {
        text: `Added "${phrase}" to my prohibited phrases. I'll never use this in conversations.`,
        updates: { prohibitedPhrases: [...existing, phrase] },
      };
    }
    return { text: `Current prohibited phrases: ${(agent.prohibitedPhrases ?? []).join(", ") || "None"}` };
  }

  if (lower.includes("always mention") || lower.includes("always disclose") || lower.includes("required disclosure")) {
    const disclosure = message.replace(/^.*?(always mention|always disclose|required disclosure)\s*/i, "").replace(/[.!?]+$/, "").trim();
    if (disclosure.length > 2) {
      const existing = agent.requiredDisclosures ?? [];
      return {
        text: `Added "${disclosure}" as a required disclosure. I'll include this when relevant.`,
        updates: { requiredDisclosures: [...existing, disclosure] },
      };
    }
    return { text: `Current required disclosures: ${(agent.requiredDisclosures ?? []).join(", ") || "None"}` };
  }

  if (lower.includes("scope") || lower.includes("which propert") || lower.includes("my propert")) {
    return { text: `My current scope is: ${agent.scope}. This determines which properties I operate on.` };
  }

  if (lower.includes("guardrail") || lower.includes("safety") || lower.includes("compliance")) {
    const fh = agent.fairHousingEnabled !== false ? "enabled" : "disabled";
    return { text: `Here's my safety config:\n• Max steps: ${agent.maxSteps ?? 10}\n• Fair housing: ${fh}\n• Confidence threshold: ${agent.confidenceThreshold ?? 70}%\n• Escalation keywords: ${(agent.escalationKeywords ?? []).join(", ") || "None"}\n• Default: ${(agent.escalationDefault ?? "agent_handles").replace("_", " ")}` };
  }

  if (lower.includes("performance") || lower.includes("how are you doing") || lower.includes("stats") || lower.includes("metrics")) {
    return { text: `Here's my performance:\n• ${agent.conversationCount} conversations\n• ${agent.resolutionRate} resolution rate\n• ${agent.escalationsCount} escalations\n• ${agent.revenueImpact} revenue impact\n\nWant me to adjust anything to improve these numbers?` };
  }

  if (lower.includes("shadow") || lower.includes("go live")) {
    if (lower.includes("go live") || lower.includes("activate") || lower.includes("active")) {
      return { text: "I've switched to active mode. I'll now respond to residents directly.", updates: { deploymentMode: "active", status: "Active" } };
    }
    return { text: "I've switched to shadow mode. My responses will be reviewed before sending.", updates: { deploymentMode: "shadow", status: "Training" } };
  }

  if (lower.includes("turn off") || lower.includes("disable") || lower.includes("stop")) {
    return { text: "I've turned off. No conversations will be handled until you turn me back on.", updates: { status: "Off" } };
  }

  if (lower.includes("turn on") || lower.includes("enable") || lower.includes("start")) {
    return { text: "I'm now active and ready to handle conversations.", updates: { status: "Active" } };
  }

  return {
    text: `I can help you configure me. Here's what I can do:\n\n• **System prompt** — "What's your prompt?" or click Edit above\n• **Channels** — "Add SMS channel" or "What channels?"\n• **Escalation** — "Escalate anything about mold" or "Add escalation keyword"\n• **Guardrails** — "What are your guardrails?" or "Set max steps to 8"\n• **Tools** — "What tools do you have?"\n• **Prohibited phrases** — "Don't ever say guaranteed"\n• **Disclosures** — "Always mention pet policy"\n• **Deployment** — "Go live" or "Switch to shadow"\n\nWhat would you like to configure?`,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   Conversation Simulator — shows agent handling a mock resident interaction
   ═══════════════════════════════════════════════════════════════════════ */

const MOCK_RESIDENT = {
  name: "Jane Smith",
  unit: "Unit 204",
  property: "Oakwood Apartments",
  leaseExpires: "March 15, 2026",
  type: "resident" as const,
};

const MOCK_SCOPE = {
  tenant: "Acme Property Management",
  property: "Oakwood Apartments",
  channel: "Chat",
};

const SIM_RESPONSES: Record<string, { text: string; sources: ChatSource[]; toolCalls: ChatToolCall[] }> = {
  default: {
    text: `Hello! I'm here to help with anything related to your apartment at ${MOCK_RESIDENT.property}. I can see your lease for ${MOCK_RESIDENT.unit}. How can I assist you today?`,
    sources: [{ title: "Lease Terms SOP", snippet: "Standard greeting protocol: acknowledge resident by unit and confirm identity before proceeding." }],
    toolCalls: [{ name: "Entrata MCP: getResidentProfile", status: "success", detail: "Retrieved profile for Jane Smith, Unit 204" }],
  },
  tour: {
    text: `We'd love to show you around! We have availability for tours this week. Our one-bedrooms at ${MOCK_RESIDENT.property} start at $1,450/month with a $300 pet deposit. Would you like to schedule a time?`,
    sources: [{ title: "Leasing SOP", snippet: "Always provide pricing upfront when asked about tours. Include pet deposit if applicable." }, { title: "Current Availability", snippet: "3 one-bedroom units available, starting at $1,450/mo." }],
    toolCalls: [{ name: "Entrata MCP: getAvailableUnits", status: "success" }, { name: "Entrata MCP: getPropertyPricing", status: "success" }],
  },
  maintenance: {
    text: `I'm sorry to hear about that! I've created a work order for your ${MOCK_RESIDENT.unit}. A maintenance technician will be assigned within 4 hours during business hours. You'll receive a text when they're on their way. Is this an emergency?`,
    sources: [{ title: "Maintenance Escalation SOP", snippet: "Standard work orders: 4hr assignment SLA during business hours. Emergency: immediate dispatch." }],
    toolCalls: [{ name: "Entrata MCP: createWorkOrder", status: "success", detail: "WO-4521 created for Unit 204" }],
  },
  payment: {
    text: `I can see your account for ${MOCK_RESIDENT.unit}. Your current balance is $1,450.00, due on March 1st. Your last payment of $1,450.00 was received on February 1st. Would you like to make a payment now or set up autopay?`,
    sources: [{ title: "Payment Policy SOP", snippet: "Always confirm current balance and due date before processing payments." }],
    toolCalls: [{ name: "Entrata MCP: getResidentLedger", status: "success", detail: "Retrieved ledger for Unit 204" }],
  },
  renewal: {
    text: `Great question! Your lease for ${MOCK_RESIDENT.unit} expires on ${MOCK_RESIDENT.leaseExpires}. Based on current market rates and your 2-year tenure, I'd recommend a renewal at $1,495/month — that's a 3.1% increase, which is below the market average of 4.2% for comparable units. Would you like me to prepare a renewal offer?`,
    sources: [{ title: "Renewal Process SOP", snippet: "Factor in tenure, payment history, and market comps when suggesting renewal terms." }, { title: "Market Comps", snippet: "Avg 1BR rent in area: $1,520/mo. Avg increase: 4.2%." }],
    toolCalls: [{ name: "Entrata MCP: getLeaseDetails", status: "success" }, { name: "analytics.getMarketComps", status: "success" }],
  },
};

function getSimResponse(text: string): { text: string; sources: ChatSource[]; toolCalls: ChatToolCall[] } {
  const lower = text.toLowerCase();
  if (lower.includes("tour") || lower.includes("visit") || lower.includes("look")) return SIM_RESPONSES.tour;
  if (lower.includes("maintenance") || lower.includes("repair") || lower.includes("broken") || lower.includes("fix") || lower.includes("leak")) return SIM_RESPONSES.maintenance;
  if (lower.includes("payment") || lower.includes("pay") || lower.includes("rent") || lower.includes("balance")) return SIM_RESPONSES.payment;
  if (lower.includes("renew") || lower.includes("lease") || lower.includes("expir")) return SIM_RESPONSES.renewal;
  return SIM_RESPONSES.default;
}

function ConversationSimulator({
  agent,
  messages,
  setMessages,
  disabled,
  setDisabled,
  onFeedback,
}: {
  agent: Agent;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  disabled: boolean;
  setDisabled: React.Dispatch<React.SetStateAction<boolean>>;
  onFeedback: (idx: number, rating: "positive" | "negative") => void;
}) {
  const handleSend = (text: string) => {
    setMessages((prev) => [...prev, { role: "user", text }]);
    setDisabled(true);
    setTimeout(() => {
      const response = getSimResponse(text);
      setMessages((prev) => [...prev, {
        role: "assistant",
        text: response.text,
        sources: response.sources,
        toolCalls: response.toolCalls,
        tokensUsed: 150 + Math.floor(Math.random() * 200),
        latencyMs: 300 + Math.floor(Math.random() * 600),
      }]);
      setDisabled(false);
    }, 600 + Math.random() * 800);
  };

  return (
    <div className="space-y-3">
      {/* Identity & Scope Context */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border bg-muted/30 p-2.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Resident Identity</p>
          <p className="text-xs font-medium">{MOCK_RESIDENT.name}</p>
          <p className="text-[10px] text-muted-foreground">{MOCK_RESIDENT.unit} · {MOCK_RESIDENT.property}</p>
          <p className="text-[10px] text-muted-foreground">Lease expires: {MOCK_RESIDENT.leaseExpires}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-2.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Request Scope</p>
          <p className="text-xs font-medium">{MOCK_SCOPE.tenant}</p>
          <p className="text-[10px] text-muted-foreground">{MOCK_SCOPE.property}</p>
          <p className="text-[10px] text-muted-foreground">Channel: {MOCK_SCOPE.channel}</p>
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold text-foreground">Simulated resident conversation</h4>
        {messages.length === 0 && (
          <p className="mb-2 text-xs text-muted-foreground">
            Type as a resident would. Try: &ldquo;I need maintenance for a leak&rdquo;, &ldquo;When does my lease expire?&rdquo;, or &ldquo;How do I pay rent?&rdquo;
          </p>
        )}
        <Chat
          messages={messages}
          onSend={handleSend}
          disabled={disabled}
          placeholder="Type as a resident..."
          roleLabels={{ user: MOCK_RESIDENT.name, assistant: agent.name }}
          roleVariant={{ user: "inbound", assistant: "outbound" }}
          showAttach={false}
          messageListHeight={240}
          onFeedback={onFeedback}
        />
      </div>
    </div>
  );
}
