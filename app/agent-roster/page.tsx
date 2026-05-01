"use client";

import { Suspense, useState, useMemo, useEffect, useRef } from "react";
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
import { Tag, X, Search, DollarSign, Megaphone, Users, Wrench, ShieldCheck, Power, Activity, AlertCircle, Play, Clock, CheckCircle, CheckCircle2, XCircle, Calendar, Lightbulb, Target, Database, BarChart3, Pencil, Save, ArrowLeft, ArrowRight, Sparkles, BookOpen, Cog, Bot, Box, MessageSquare, Shield, Zap, Eye, EyeOff, Globe, Mail, Phone, Volume2, History, RotateCcw, Lock, ExternalLink, CirclePlay, TrendingUp, TrendingDown, Minus, ArrowUpDown, ChevronDown, Building2, Layers, Home, Plus, Info } from "lucide-react";
import { useVoice, type AgentVoiceTuning } from "@/lib/voice-context";
import { Chat, type ChatMessage, type ChatSource, type ChatToolCall } from "@/components/ui/chat";

const AGENT_TYPE_ICON: Record<AgentType, string> = {
  operations: "/eli-cube.svg",
  intelligence: "/eli-cube.svg",
  efficiency: "/eli-cube.svg",
  autonomous: "/eli-cube.svg",
  fully_autonomous: "/eli-cube.svg",
};
import { useFeedback } from "@/lib/feedback-context";
import { LeasingPage } from "@/components/eli-plus-setup/pages/LeasingPage";
import { PaymentsPage } from "@/components/eli-plus-setup/pages/PaymentsPage";
import { MaintenanceFullPage } from "@/components/eli-plus-setup/pages/MaintenanceFullPage";
import { RenewalsFullPage } from "@/components/eli-plus-setup/pages/RenewalsFullPage";
import { LeasingAISettingsPanel } from "@/components/leasing-ai-settings-panel";

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
   ELI+ Settings page mapping for L4 conversational agents
   ═══════════════════════════════════════════════════════════════════════ */

type FlyoutPageProps = { navigate: (to: string) => void; showToast: (msg: string) => void; variant?: "flyout"; propertyName?: string; agentLabel?: string; onBack?: () => void };

const ELI_PLUS_SETTINGS_MAP: Record<string, React.ComponentType<FlyoutPageProps>> = {
  "Leasing AI": LeasingPage as React.ComponentType<FlyoutPageProps>,
  "Payments AI": PaymentsPage as React.ComponentType<FlyoutPageProps>,
  "Maintenance AI": MaintenanceFullPage as React.ComponentType<FlyoutPageProps>,
  "Renewal AI": RenewalsFullPage as React.ComponentType<FlyoutPageProps>,
};

type SettingItem = { name: string; description: string };
type TabDef = { id: string; label: string; settings: SettingItem[] };

const AGENT_SETTINGS_TABS: Record<string, TabDef[]> = {
  "Leasing AI": [
    { id: "general", label: "General Info", settings: [
      { name: "Agent Goal", description: "Define the primary objective for the leasing AI agent at this property." },
      { name: "Office Hours", description: "Set the business hours when the agent should be actively responding to prospects." },
    ]},
    { id: "property", label: "Property Info", settings: [
      { name: "Primary Address", description: "The property's physical address used in prospect communications." },
      { name: "Contact Points", description: "Review delinquency contact points to ensure residents don't receive duplicate communication." },
      { name: "ELI+ Dashboard Permissions", description: "Permission users who directly manage the ELI+ console for this property." },
      { name: "IVR", description: "Configure interactive voice response routing for inbound calls." },
      { name: "Notifications", description: "Manage notification preferences for leasing activity at this property." },
      { name: "Primary Phone Numbers", description: "Set the primary phone numbers used for outbound leasing communications." },
      { name: "Property Amenities", description: "Review and update the amenity list shared with prospects during conversations." },
    ]},
    { id: "tours", label: "Tours", settings: [
      { name: "Tour Schedule Hours", description: "Define hours of availability for scheduling tours at this property." },
      { name: "Model Units", description: "Select which model units are available for prospect tour scheduling." },
      { name: "Tour Types", description: "Configure available tour types — Agent Tour, Self Guided, and Virtual tours." },
      { name: "Tour Priority", description: "Set the preferred priority order for tour types when scheduling." },
      { name: "Manage Tours", description: "View and manage all scheduled tours for this property." },
      { name: "Manage Calendar", description: "Configure the property calendar and availability for tour bookings." },
    ]},
    { id: "policies", label: "Policies", settings: [
      { name: "Pet Policy", description: "Define pet restrictions, deposits, and breed limitations for prospects." },
      { name: "Parking Policy", description: "Outline parking availability, assigned spots, and associated fees." },
      { name: "Smoking Policy", description: "Specify smoking restrictions for the property and common areas." },
      { name: "Renters Insurance", description: "Set renters insurance requirements and accepted providers." },
      { name: "Utility Policy", description: "Detail which utilities are included and tenant responsibilities." },
      { name: "Background Checks", description: "Define background check criteria and screening requirements." },
      { name: "Deposit Policy", description: "Set deposit amounts, refund conditions, and payment terms." },
      { name: "Application Policy", description: "Configure application requirements, fees, and processing details." },
      { name: "Income Requirements", description: "Set minimum income-to-rent ratios and verification requirements." },
      { name: "Section 8", description: "Define Section 8 voucher acceptance and related policies." },
    ]},
    { id: "marketing", label: "Marketing", settings: [
      { name: "Prospect Portal", description: "Configure the prospect-facing portal used for this property." },
      { name: "Property Website", description: "Set the property website URL shared in marketing communications." },
      { name: "Privacy Policy", description: "Link to the privacy policy displayed to prospects during interactions." },
      { name: "Application Page", description: "Set the URL for the online application landing page." },
      { name: "Floor Plan Page", description: "Configure the floor plan gallery page shared with prospects." },
    ]},
  ],
  "Payments AI": [
    { id: "property", label: "Property Info", settings: [
      { name: "Primary Address", description: "The property's physical address used in resident communications." },
      { name: "Business Hours", description: "Set operating hours for payment-related support at this property." },
      { name: "Contact Points", description: "Review contact points to ensure residents don't receive duplicate communication." },
      { name: "ELI+ Dashboard Permissions", description: "Permission users who directly manage the ELI+ console for this property." },
    ]},
    { id: "payment-info", label: "Payment Info", settings: [
      { name: "Rent Charge Date", description: "The day of the month when rent charges are posted to resident accounts." },
      { name: "Rent Due Date", description: "The day of the month when rent payment is due." },
      { name: "Payment Plans", description: "Configure whether the community accepts payment plan arrangements." },
      { name: "Payment Block Day", description: "Set the date after which payments are blocked for the billing period." },
      { name: "Payment Link", description: "Configure the online payment portal link shared with residents." },
      { name: "Grace Period Date", description: "Define the number of grace days after the due date before late fees apply." },
      { name: "Balance Reminder Date", description: "Set when automated balance reminders are sent to residents." },
      { name: "Outstanding Balance Amount", description: "Configure the threshold amount that triggers collection notifications." },
      { name: "Eviction Month", description: "Set the month in which eviction proceedings may begin for non-payment." },
      { name: "Eviction Date", description: "Define the specific date when eviction filings are initiated." },
    ]},
    { id: "payment-options", label: "Payment Options", settings: [
      { name: "Accepted Payment Methods", description: "Select which payment methods are accepted — online, cash, check, money order, etc." },
      { name: "Installment Options", description: "Configure whether residents can pay in installments or full payments only." },
      { name: "Address Recipient", description: "Set the payable-to name and address for mailed payments." },
    ]},
    { id: "policies", label: "Policies", settings: [
      { name: "Late Fee Policy", description: "Define late fee amounts, calculation methods, and escalation rules." },
      { name: "Payment Plan Policy", description: "Set payment plan terms, eligibility criteria, and agreement details." },
    ]},
    { id: "marketing", label: "Marketing", settings: [
      { name: "Prospect Portal", description: "Configure the prospect-facing portal used for this property." },
      { name: "Property Website", description: "Set the property website URL shared in resident communications." },
      { name: "Privacy Policy", description: "Link to the privacy policy displayed to residents during interactions." },
    ]},
  ],
  "Maintenance AI": [
    { id: "property", label: "Property Info", settings: [
      { name: "Primary Address", description: "The property's physical address used in maintenance communications." },
      { name: "Contact Points", description: "Review contact points for maintenance to avoid duplicate communication." },
      { name: "ELI+ Dashboard Permissions", description: "Permission users who directly manage the ELI+ console for this property." },
      { name: "Business Hours", description: "Set operating hours for the maintenance team at this property." },
      { name: "IVR", description: "Configure interactive voice response routing for maintenance calls." },
    ]},
    { id: "maintenance-info", label: "Maintenance Info", settings: [
      { name: "During Hours Escalation Phone", description: "Set the phone number for maintenance emergencies during business hours." },
      { name: "After Hours Escalation Phone", description: "Set the phone number for maintenance emergencies after business hours." },
    ]},
    { id: "marketing", label: "Marketing", settings: [
      { name: "Prospect Portal", description: "Configure the prospect-facing portal used for this property." },
      { name: "Property Website", description: "Set the property website URL shared in maintenance communications." },
      { name: "Privacy Policy", description: "Link to the privacy policy displayed during maintenance interactions." },
    ]},
  ],
  "Renewal AI": [
    { id: "property", label: "Property Info", settings: [
      { name: "Primary Address", description: "The property's physical address used in renewal communications." },
      { name: "Business Hours", description: "Set operating hours for renewal-related support at this property." },
      { name: "Contact Points", description: "Configure renewal notification triggers — offer generated, accepted, lease approved, etc." },
      { name: "ELI+ Dashboard Permissions", description: "Permission users who directly manage the ELI+ console for this property." },
    ]},
    { id: "renewal-info", label: "Renewal Info", settings: [
      { name: "Renewal Lead Time", description: "Set how many days before lease end the initial renewal notification is sent." },
    ]},
    { id: "marketing", label: "Marketing", settings: [
      { name: "Prospect Portal", description: "Configure the prospect-facing portal used for this property." },
      { name: "Property Website", description: "Set the property website URL shared in renewal communications." },
      { name: "Privacy Policy", description: "Link to the privacy policy displayed during renewal interactions." },
    ]},
  ],
};

/* ═══════════════════════════════════════════════════════════════════════
   Agent Simulation — scenario data & response engine
   ═══════════════════════════════════════════════════════════════════════ */

type SimScenario = {
  id: string;
  title: string;
  description: string;
  channel: "SMS" | "Chat" | "Email";
  openingMessage: string;
  suggestions: string[];
};

const SIMULATION_SCENARIOS: Record<string, SimScenario[]> = {
  "Leasing AI": [
    { id: "tour", title: "Tour Scheduling", description: "A prospect wants to schedule an in-person tour of a unit.", channel: "Chat", openingMessage: "Hi! I saw your listing online and I'd love to schedule a tour. Do you have anything available this weekend?", suggestions: ["What times work?", "Can I bring a pet?", "What's the application fee?"] },
    { id: "pricing", title: "Pricing & Availability", description: "A prospect asks about current pricing, floor plans, and move-in specials.", channel: "Chat", openingMessage: "Hey, I'm looking for a 2-bedroom apartment. What do you have available and what's the price range?", suggestions: ["Any move-in specials?", "Is parking included?", "When can I move in?"] },
    { id: "application", title: "Application Questions", description: "A prospect has questions about the application process and requirements.", channel: "SMS", openingMessage: "I want to apply but I have a few questions first. What documents do I need and what are the income requirements?", suggestions: ["How long does approval take?", "Is there a co-signer option?", "What's the deposit?"] },
    { id: "pet-policy", title: "Pet Policy Inquiry", description: "A prospect asks about pet restrictions, deposits, and breed limitations.", channel: "SMS", openingMessage: "I have a 60-pound German Shepherd mix. Are dogs allowed? What's your pet policy?", suggestions: ["Any breed restrictions?", "What's the pet deposit?", "Is there a weight limit?"] },
  ],
  "Payments AI": [
    { id: "late-rent", title: "Late Rent Reminder", description: "A resident receives a late rent reminder and responds with questions.", channel: "SMS", openingMessage: "I got a message about my rent being past due. I thought I already paid — can you check?", suggestions: ["When is the late fee applied?", "Can I get an extension?", "How do I pay online?"] },
    { id: "payment-plan", title: "Payment Plan Request", description: "A resident asks about setting up a payment plan for their balance.", channel: "Chat", openingMessage: "I'm having trouble paying my full rent this month. Is there any way I can set up a payment plan?", suggestions: ["What are the terms?", "How many payments?", "Will this affect my record?"] },
    { id: "balance", title: "Balance Inquiry", description: "A resident wants to know their current balance and recent charges.", channel: "SMS", openingMessage: "Can you tell me my current balance? I want to make sure I'm caught up on everything.", suggestions: ["What was the last charge?", "Do I have any credits?", "When is the next charge?"] },
    { id: "payment-method", title: "Payment Method Help", description: "A resident needs help changing or adding a payment method.", channel: "Chat", openingMessage: "I need to switch my payment method to a different bank account. How do I do that?", suggestions: ["Can I use a credit card?", "Is autopay available?", "When does the change take effect?"] },
  ],
  "Maintenance AI": [
    { id: "emergency", title: "Emergency Work Order", description: "A resident reports an urgent maintenance issue that needs immediate attention.", channel: "SMS", openingMessage: "My kitchen sink is flooding! Water is leaking everywhere and I can't get it to stop. I need help immediately!", suggestions: ["Did you turn off the valve?", "Is it still leaking?", "Can someone come now?"] },
    { id: "routine", title: "Routine Repair Request", description: "A resident submits a standard maintenance request for a non-urgent repair.", channel: "Chat", openingMessage: "The light in my bathroom has been flickering for a few days. It's not urgent but could someone come take a look?", suggestions: ["When are you available?", "Is it just one light?", "Have you tried the bulb?"] },
    { id: "status", title: "Status Follow-Up", description: "A resident follows up on a previously submitted work order.", channel: "SMS", openingMessage: "Hi, I submitted a work order about my dishwasher last week and haven't heard back. Any update on when someone can fix it?", suggestions: ["What's the work order number?", "When was it submitted?", "Is it still broken?"] },
    { id: "troubleshoot", title: "Troubleshooting Help", description: "A resident needs help diagnosing an issue before submitting a work order.", channel: "Chat", openingMessage: "My AC isn't cooling properly. It turns on but the air coming out isn't cold. Any idea what might be wrong?", suggestions: ["Check the filter", "What's the thermostat set to?", "How old is the unit?"] },
  ],
  "Renewal AI": [
    { id: "review", title: "Renewal Offer Review", description: "A resident receives a renewal offer and wants to understand the terms.", channel: "Email", openingMessage: "I received my renewal offer for next year. The rent increase seems high — can you walk me through the details?", suggestions: ["What's the new rate?", "Are there other options?", "When do I need to decide?"] },
    { id: "negotiate", title: "Negotiate Terms", description: "A resident wants to negotiate their renewal terms or rent amount.", channel: "Chat", openingMessage: "I've been a great tenant for 3 years and always pay on time. Is there any flexibility on the renewal rate?", suggestions: ["What if I sign longer?", "Any loyalty discounts?", "Can I keep the same rate?"] },
    { id: "extension", title: "Lease Extension Question", description: "A resident asks about short-term or month-to-month extension options.", channel: "SMS", openingMessage: "I'm not sure if I want to commit to another full year. Do you offer month-to-month or shorter lease terms?", suggestions: ["What's the MTM rate?", "How much notice to leave?", "Can I switch to annual later?"] },
    { id: "moveout", title: "Move-Out Intent", description: "A resident indicates they may not renew and is considering moving out.", channel: "Chat", openingMessage: "I've been thinking about it and I'm leaning towards not renewing. What do I need to do to move out?", suggestions: ["What's the move-out process?", "Any early termination?", "When is my lease end date?"] },
  ],
};

function generateSimulationResponse(
  agentName: string,
  scenarioId: string,
  message: string,
  turnIndex: number,
  propertyName: string,
): { text: string; toolCalls?: ChatToolCall[]; latencyMs: number } {
  const lower = message.toLowerCase();

  if (agentName === "Leasing AI") {
    if (scenarioId === "tour") {
      if (turnIndex === 0) return { text: `Thanks for your interest in ${propertyName}! We'd love to show you around. We have availability this Saturday at 10am, 1pm, and 3pm. Would any of those work for you?`, toolCalls: [{ name: "Check Calendar Availability", status: "success" }], latencyMs: 420 };
      if (lower.includes("10") || lower.includes("morning")) return { text: "Perfect — I've got you down for Saturday at 10:00 AM. You'll meet our leasing agent at the main office. Would you like a self-guided tour or a guided walkthrough?", toolCalls: [{ name: "Schedule Tour", status: "success" }], latencyMs: 380 };
      if (lower.includes("pet") || lower.includes("dog") || lower.includes("cat")) return { text: `Great question! ${propertyName} is pet-friendly. We allow cats and dogs up to 50 lbs with a $300 refundable pet deposit and $25/month pet rent. Some breed restrictions apply. Would you like me to send you the full pet policy?`, toolCalls: [{ name: "Lookup Pet Policy", status: "success" }], latencyMs: 350 };
      return { text: "I'd be happy to help with that! To make sure I give you the best information, could you tell me a bit more about what you're looking for — number of bedrooms, move-in timeline, and any must-haves?", latencyMs: 310 };
    }
    if (scenarioId === "pricing") {
      if (turnIndex === 0) return { text: `Great news — we have several 2-bedroom options at ${propertyName}! Our 2BR/2BA units start at $1,650/mo and our 2BR/2BA with den starts at $1,850/mo. We're currently offering one month free on select units for move-ins before the end of the month. Want me to send you floor plans?`, toolCalls: [{ name: "Query Unit Availability", status: "success" }, { name: "Check Active Specials", status: "success" }], latencyMs: 480 };
      if (lower.includes("floor plan") || lower.includes("send")) return { text: "I've sent the floor plans for our available 2-bedroom units to your email. You'll see photos, square footage, and pricing for each layout. Let me know if any catch your eye and we can schedule a tour!", toolCalls: [{ name: "Send Floor Plans Email", status: "success" }], latencyMs: 390 };
      return { text: "Absolutely! Parking is included with one reserved spot per unit, and additional spots are available for $75/month. The earliest move-in we have would be the 1st of next month. Would you like to come see the property?", latencyMs: 340 };
    }
    if (scenarioId === "application") {
      if (turnIndex === 0) return { text: `For ${propertyName}, you'll need a valid government-issued ID, proof of income (last 2 pay stubs or offer letter), and we'll run a credit and background check. Income requirement is 3x the monthly rent. The application fee is $50 per applicant. Shall I send you the application link?`, toolCalls: [{ name: "Lookup Application Requirements", status: "success" }], latencyMs: 410 };
      return { text: "Approval typically takes 24-48 business hours once we have all documents. Yes, we do accept co-signers — they'll need to fill out a separate application. Would you like me to email you the application link?", latencyMs: 360 };
    }
    if (turnIndex === 0) return { text: `Thanks for asking! At ${propertyName}, we welcome pets with some guidelines. Dogs and cats are allowed with a refundable deposit. There are breed restrictions on certain aggressive breeds, and we have a 50 lb weight limit. The pet deposit is $300 with $25/month pet rent. Would you like the complete policy document?`, toolCalls: [{ name: "Lookup Pet Policy", status: "success" }], latencyMs: 370 };
    return { text: "That's a great question! Let me look into that for you. Is there anything else about the property you'd like to know?", latencyMs: 290 };
  }

  if (agentName === "Payments AI") {
    if (scenarioId === "late-rent") {
      if (turnIndex === 0) return { text: `I checked your account and it looks like your payment of $1,650 posted on the 3rd but was returned by your bank on the 5th due to insufficient funds. Your current balance is $1,650 plus a $25 returned payment fee. The late fee grace period ends on the 5th, so a $75 late fee will be assessed tomorrow if the balance isn't paid.`, toolCalls: [{ name: "Check Payment History", status: "success" }, { name: "Query Account Balance", status: "success" }], latencyMs: 520 };
      if (lower.includes("extension") || lower.includes("more time")) return { text: "I understand. Unfortunately I can't override the late fee policy, but I can connect you with the property manager to discuss options. In the meantime, paying the base rent today would prevent additional fees from accruing. Would you like me to send you the payment link?", latencyMs: 380 };
      return { text: "You can pay online through your resident portal, or I can text you a direct payment link right now. We accept ACH, debit, and credit card (2.5% processing fee for credit). Which would you prefer?", toolCalls: [{ name: "Generate Payment Link", status: "success" }], latencyMs: 400 };
    }
    if (scenarioId === "payment-plan") {
      if (turnIndex === 0) return { text: `I'm sorry to hear that. ${propertyName} does offer payment plans for qualifying residents. Based on your account, you may be eligible for a 2-installment plan. The first payment of $825 would be due by the 5th and the second by the 20th. Would you like me to set that up?`, toolCalls: [{ name: "Check Payment Plan Eligibility", status: "success" }], latencyMs: 460 };
      return { text: "The payment plan agreement would be noted on your account. It won't affect your rental history as long as both payments are received on time. I'll send the agreement to your email for your signature. Sound good?", toolCalls: [{ name: "Draft Payment Plan Agreement", status: "success" }], latencyMs: 410 };
    }
    if (scenarioId === "balance") {
      if (turnIndex === 0) return { text: `Your current balance at ${propertyName} is $0.00 — you're all caught up! Your last payment of $1,650 was received on April 1st. Your next rent charge of $1,650 will post on May 1st with a due date of May 3rd.`, toolCalls: [{ name: "Query Account Balance", status: "success" }, { name: "Check Next Charge Date", status: "success" }], latencyMs: 440 };
      return { text: "Your last charge was the May rent of $1,650. No credits on the account currently. Your next charge will be June 1st for $1,650. Would you like to set up autopay so you never miss a payment?", latencyMs: 350 };
    }
    if (turnIndex === 0) return { text: `Sure thing! To update your payment method, you can log into your resident portal and go to Payment Methods. I can also send you a direct link. The change will take effect immediately for any future payments, including autopay.`, toolCalls: [{ name: "Generate Portal Link", status: "success" }], latencyMs: 380 };
    return { text: "Yes, we accept credit cards, debit cards, and ACH bank transfers. Credit cards have a 2.5% processing fee. The change takes effect immediately. Would you like me to walk you through the steps?", latencyMs: 320 };
  }

  if (agentName === "Maintenance AI") {
    if (scenarioId === "emergency") {
      if (turnIndex === 0) return { text: `I'm sorry to hear about the flooding! This is being flagged as an emergency work order. First, please try to locate the shutoff valve under the sink and turn it clockwise to stop the water. I'm dispatching our on-call maintenance technician right now — they should arrive within 30-45 minutes.`, toolCalls: [{ name: "Create Emergency Work Order", status: "success" }, { name: "Page On-Call Technician", status: "success" }, { name: "Notify Property Manager", status: "success" }], latencyMs: 280 };
      if (lower.includes("valve") || lower.includes("off") || lower.includes("stopped")) return { text: "Great, that should help minimize the damage. Our technician Marcus is on his way and should be there within 20 minutes. In the meantime, if you can place towels around the area to contain the water, that would help. He'll call you when he arrives. Work order #MNT-4892 has been created.", latencyMs: 310 };
      return { text: "Our technician is en route. If the situation worsens before they arrive, please call our emergency line at (555) 123-4567. Is there anything else you need in the meantime?", toolCalls: [{ name: "Send ETA Update", status: "success" }], latencyMs: 290 };
    }
    if (scenarioId === "routine") {
      if (turnIndex === 0) return { text: `Thanks for letting us know! I've created a work order for the flickering bathroom light in your unit. Our maintenance team has availability on Tuesday between 9am-12pm or Wednesday between 1pm-5pm. Which works better for you? You don't need to be home — we can use our master key with your permission.`, toolCalls: [{ name: "Create Work Order", status: "success" }, { name: "Check Technician Availability", status: "success" }], latencyMs: 420 };
      return { text: "You're all set for Tuesday morning. Work order #MNT-4893 is confirmed. Our tech will knock first and leave a door tag when the job is complete. We'll text you when they're on the way. Anything else I can help with?", toolCalls: [{ name: "Schedule Appointment", status: "success" }], latencyMs: 350 };
    }
    if (scenarioId === "status") {
      if (turnIndex === 0) return { text: `I found your work order #MNT-4856 for the dishwasher repair, submitted last Tuesday. The part we need (drain pump assembly) was on backorder but has arrived as of yesterday. I've moved your appointment up — our technician can come this Thursday between 10am-2pm. Does that work?`, toolCalls: [{ name: "Lookup Work Order", status: "success" }, { name: "Check Parts Inventory", status: "success" }], latencyMs: 490 };
      return { text: "Thursday is confirmed. The repair should take about 45 minutes. Our tech will have the replacement part on hand. I'll send you a text reminder the morning of. Is there anything else?", toolCalls: [{ name: "Update Work Order Schedule", status: "success" }], latencyMs: 360 };
    }
    if (turnIndex === 0) return { text: `Let's try a few things! First, check if your AC filter is clean — a clogged filter is the most common cause. It's located behind the return vent, usually in the hallway. If it's dirty, try replacing it (we have spare filters at the office). Also, make sure your thermostat is set to "Cool" and not "Auto" or "Fan Only."`, toolCalls: [{ name: "Pull Unit HVAC History", status: "success" }], latencyMs: 400 };
    return { text: "If the filter change didn't help, it could be low refrigerant or a compressor issue. I'll create a work order and have our HVAC specialist take a look. They can usually come out within 24 hours for cooling issues. Want me to schedule that?", toolCalls: [{ name: "Create Work Order", status: "success" }], latencyMs: 370 };
  }

  if (agentName === "Renewal AI") {
    if (scenarioId === "review") {
      if (turnIndex === 0) return { text: `I understand your concern. Let me walk you through the details. Your current rate is $1,650/mo and the renewal offer is $1,725/mo — that's a 4.5% increase. For context, market rates for comparable units in the area are currently $1,800-$1,900. We're also offering a 14-month lease option at $1,695/mo if you're interested in locking in a lower rate for a longer term.`, toolCalls: [{ name: "Pull Renewal Offer Details", status: "success" }, { name: "Run Market Comparison", status: "success" }], latencyMs: 510 };
      if (lower.includes("14") || lower.includes("longer") || lower.includes("lock")) return { text: "Great choice! The 14-month lease at $1,695/mo would save you $360 over the lease term compared to the 12-month rate. I'll update your offer and send the revised agreement to your email. You'll have 7 days to review and sign. Sound good?", toolCalls: [{ name: "Update Renewal Offer", status: "success" }, { name: "Send Lease Agreement", status: "success" }], latencyMs: 430 };
      return { text: "Your renewal decision deadline is 60 days before your lease ends, which is July 15th. After that, the offer may change based on availability. Would you like to compare the lease term options side by side?", latencyMs: 340 };
    }
    if (scenarioId === "negotiate") {
      if (turnIndex === 0) return { text: `We really value you as a resident — 3 years is great! I've checked with our renewal team, and we can offer you a loyalty adjustment. Instead of $1,725/mo, we can do $1,695/mo on a 12-month renewal. That's only a 2.7% increase. We can also include a complimentary carpet cleaning as a thank you. Would that work for you?`, toolCalls: [{ name: "Check Loyalty Discount Eligibility", status: "success" }, { name: "Calculate Adjusted Offer", status: "success" }], latencyMs: 480 };
      return { text: "I'm glad that works! I'll send the updated renewal agreement at $1,695/mo to your email today. Once you sign, we'll schedule the complimentary carpet cleaning. Thank you for continuing to be part of our community!", toolCalls: [{ name: "Generate Renewal Agreement", status: "success" }], latencyMs: 390 };
    }
    if (scenarioId === "extension") {
      if (turnIndex === 0) return { text: `Absolutely, we offer flexible options! Month-to-month is available at $1,950/mo (a premium over the annual rate). We also have 6-month leases at $1,795/mo. You can switch from month-to-month to an annual lease at any time — just give us 30 days notice. The month-to-month requires 60 days notice to vacate.`, toolCalls: [{ name: "Lookup Lease Term Options", status: "success" }], latencyMs: 420 };
      return { text: "Yes, you can absolutely switch from month-to-month to an annual lease later. Many residents do that while they decide. Just let us know 30 days before you want the annual to start and we'll lock in the rate at that time. Want me to set you up on month-to-month for now?", latencyMs: 350 };
    }
    if (turnIndex === 0) return { text: `I'm sorry to hear you might be leaving! Here's what you need to know: you need to provide written 60-day notice before your lease end date (September 14th), so the deadline is July 15th. You'll need to schedule a pre-move-out inspection, return all keys, and ensure the unit meets our move-out condition standards. Would you like me to send you the full move-out checklist?`, toolCalls: [{ name: "Pull Lease End Date", status: "success" }, { name: "Calculate Notice Deadline", status: "success" }], latencyMs: 450 };
    return { text: "Before you make a final decision, I'd love to share some options we might have. Would you be open to discussing what might make you want to stay? We may be able to offer a rate adjustment or address any concerns about the property.", latencyMs: 320 };
  }

  return { text: "Thanks for your message! Let me look into that for you and get back to you shortly.", latencyMs: 300 };
}

/* ═══════════════════════════════════════════════════════════════════════ */

function AgentSimulationPanel({
  agentName,
  propertyName,
  onSimulationStarted,
}: {
  agentName: string;
  propertyName: string;
  onSimulationStarted?: () => void;
}) {
  const scenarios = SIMULATION_SCENARIOS[agentName] ?? [];
  const [activeScenario, setActiveScenario] = useState<SimScenario | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [disabled, setDisabled] = useState(false);
  const [actions, setActions] = useState<ChatToolCall[]>([]);
  const turnRef = useRef(0);

  const startScenario = (scenario: SimScenario) => {
    setActiveScenario(scenario);
    turnRef.current = 0;
    onSimulationStarted?.();
    const opening: ChatMessage = { role: "resident", text: scenario.openingMessage };
    setMessages([opening]);
    setActions([]);
    setDisabled(true);
    setTimeout(() => {
      const resp = generateSimulationResponse(agentName, scenario.id, scenario.openingMessage, 0, propertyName);
      const agentMsg: ChatMessage = { role: "assistant", text: resp.text, toolCalls: resp.toolCalls, latencyMs: resp.latencyMs };
      setMessages(prev => [...prev, agentMsg]);
      if (resp.toolCalls) setActions(prev => [...prev, ...resp.toolCalls!]);
      turnRef.current = 1;
      setDisabled(false);
    }, 1000 + Math.random() * 500);
  };

  const handleSend = (text: string) => {
    setMessages(prev => [...prev, { role: "resident", text }]);
    setDisabled(true);
    const turn = turnRef.current;
    setTimeout(() => {
      const resp = generateSimulationResponse(agentName, activeScenario?.id ?? "", text, turn, propertyName);
      const agentMsg: ChatMessage = { role: "assistant", text: resp.text, toolCalls: resp.toolCalls, latencyMs: resp.latencyMs };
      setMessages(prev => [...prev, agentMsg]);
      if (resp.toolCalls) setActions(prev => [...prev, ...resp.toolCalls!]);
      turnRef.current = turn + 1;
      setDisabled(false);
    }, 800 + Math.random() * 700);
  };

  const resetSim = () => {
    setActiveScenario(null);
    setMessages([]);
    setActions([]);
    turnRef.current = 0;
    setDisabled(false);
  };

  const channelIcon = (ch: string) => {
    if (ch === "SMS") return <Phone className="h-3 w-3" />;
    if (ch === "Email") return <Mail className="h-3 w-3" />;
    return <MessageSquare className="h-3 w-3" />;
  };

  if (!activeScenario) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-bold text-foreground">Simulation</h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          Test how {agentName} handles real-world conversations at {propertyName}. Pick a scenario to begin.
        </p>
        <div className="grid grid-cols-2 gap-4 mt-8">
          {scenarios.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => startScenario(s)}
              className="flex flex-col items-start gap-2 rounded-xl border border-border bg-white p-5 text-left transition-all hover:border-zinc-400 hover:shadow-md group"
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {channelIcon(s.channel)} {s.channel}
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground">{s.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.description}</p>
              <span className="mt-auto text-xs font-medium text-zinc-500 group-hover:text-foreground transition-colors flex items-center gap-1">
                Start simulation <ArrowRight className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => startScenario({ id: "custom", title: "Custom Scenario", description: "Start a freeform conversation.", channel: "Chat", openingMessage: "", suggestions: ["Ask a question", "Describe a scenario"] })}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-white p-4 text-sm text-muted-foreground hover:border-zinc-400 hover:text-foreground transition-all"
          >
            <MessageSquare className="h-4 w-4" /> Start custom conversation
          </button>
        </div>
      </div>
    );
  }

  const residentTurns = messages.filter(m => m.role === "resident").length;
  const agentTurns = messages.filter(m => m.role === "assistant").length;
  const avgLatency = agentTurns > 0
    ? Math.round(messages.filter(m => m.role === "assistant" && m.latencyMs).reduce((sum, m) => sum + (m.latencyMs ?? 0), 0) / agentTurns)
    : 0;

  return (
    <div className="flex h-full">
      <div className="flex-1 min-w-0 flex flex-col border-r border-border">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-white shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-foreground">{activeScenario.title}</h3>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {channelIcon(activeScenario.channel)} {activeScenario.channel}
            </span>
          </div>
          <button
            type="button"
            onClick={resetSim}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-zinc-50 hover:text-foreground transition-colors"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <Chat
            messages={activeScenario.id === "custom" && messages.length === 0 ? [] : messages}
            onSend={handleSend}
            placeholder={activeScenario.id === "custom" && messages.length === 0 ? "Type a message to start the conversation..." : "Reply as a resident..."}
            disabled={disabled}
            roleLabels={{ resident: agentName.includes("Leasing") ? "Prospect" : "Resident", assistant: agentName }}
            roleVariant={{ resident: "inbound", assistant: "outbound" }}
            messageListHeight={undefined}
            className="h-full border-0 rounded-none"
            showAttach={false}
            suggestions={disabled ? undefined : activeScenario.suggestions}
            onSuggestionClick={handleSend}
            onFeedback={() => {}}
            feedbackRoles={["assistant"]}
          />
        </div>
      </div>
      <aside className="w-72 shrink-0 bg-white overflow-y-auto">
        <div className="p-5 space-y-6">
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3">Scenario</h4>
            <div className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium text-foreground">{activeScenario.title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{activeScenario.description}</p>
            </div>
          </div>
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3">Simulation Details</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Property</span><span className="font-medium text-foreground">{propertyName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Agent</span><span className="font-medium text-foreground">{agentName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Channel</span><span className="font-medium text-foreground">{activeScenario.channel}</span></div>
            </div>
          </div>
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3">Conversation Stats</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Resident turns</span><span className="font-medium text-foreground">{residentTurns}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Agent turns</span><span className="font-medium text-foreground">{agentTurns}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Avg. response time</span><span className="font-medium text-foreground">{avgLatency > 0 ? `${avgLatency}ms` : "—"}</span></div>
            </div>
          </div>
          {actions.length > 0 && (
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3">Agent Actions</h4>
              <div className="space-y-1.5">
                {actions.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 text-xs">
                    <CheckCircle className="h-3 w-3 text-emerald-600 shrink-0" />
                    <span className="text-emerald-800 font-medium">{a.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

const AGENT_FLYOUT_PROPERTIES = [
  { id: "aspen-heights", name: "Aspen Heights", vertical: "Conventional", status: "Active" as const },
  { id: "14th-north-pkwy", name: "14th North Parkway", vertical: "Conventional", status: "Active" as const },
  { id: "rails-on-main", name: "The Rails on Main", vertical: "Conventional", status: "Active" as const },
  { id: "summit-view", name: "Summit View at Lakewood", vertical: "Student", status: "Active" as const },
  { id: "bellamy-place", name: "Bellamy Place", vertical: "Conventional", status: "Active" as const },
  { id: "ivy-gate", name: "Ivy Gate Residences", vertical: "Affordable", status: "Active" as const },
  { id: "copper-ridge", name: "Copper Ridge", vertical: "Conventional", status: "Active" as const },
  { id: "harborstone", name: "Harborstone Landing", vertical: "Conventional", status: "Active" as const },
  { id: "meridian-west", name: "The Meridian West", vertical: "Student", status: "Inactive" as const },
  { id: "cedar-canyon", name: "Cedar Canyon Flats", vertical: "Conventional", status: "Inactive" as const },
  { id: "trailside-co", name: "Trailside at Cherry Creek", vertical: "Affordable", status: "Inactive" as const },
  { id: "magnolia-grove", name: "Magnolia Grove", vertical: "Conventional", status: "Inactive" as const },
  { id: "the-henley", name: "The Henley", vertical: "Student", status: "Inactive" as const },
  { id: "riverwalk-apts", name: "Riverwalk Apartments", vertical: "Affordable", status: "Inactive" as const },
  { id: "broadstone-park", name: "Broadstone Park", vertical: "Conventional", status: "Inactive" as const },
];

/* ═══════════════════════════════════════════════════════════════════════
   Agent History & Logging — conversation logs with trace drill-down
   ═══════════════════════════════════════════════════════════════════════ */

type TraceStep = {
  type: "instruction" | "tool_call" | "knowledge" | "reasoning" | "response";
  label: string;
  detail?: string;
  durationMs: number;
  status?: "success" | "error" | "warning";
};

type ConversationLog = {
  id: string;
  residentName: string;
  channel: "SMS" | "Chat" | "Email";
  topic: string;
  summary: string;
  outcome: "resolved" | "escalated" | "pending";
  sentiment: "positive" | "neutral" | "negative";
  startedAt: string;
  duration: string;
  turns: number;
  messages: { role: "resident" | "agent"; text: string; timestamp: string }[];
  trace: TraceStep[];
  monitors: { label: string; passed: boolean }[];
};

function generateConversationLogs(agentName: string, propertyName: string): ConversationLog[] {
  if (agentName === "Leasing AI") return [
    { id: "conv-l1", residentName: "Sarah Mitchell", channel: "Chat", topic: "Tour Scheduling", summary: "Prospect scheduled a Saturday tour for a 2BR unit.", outcome: "resolved", sentiment: "positive", startedAt: "Today, 2:14 PM", duration: "4m 22s", turns: 6,
      messages: [
        { role: "resident", text: "Hi! I saw your listing for the 2-bedroom on Apartments.com. Do you have any tours available this weekend?", timestamp: "2:14 PM" },
        { role: "agent", text: `Welcome to ${propertyName}! We'd love to show you around. We have availability Saturday at 10am, 1pm, and 3pm. Which works best for you?`, timestamp: "2:14 PM" },
        { role: "resident", text: "1pm would be perfect! Will I get to see the actual unit?", timestamp: "2:15 PM" },
        { role: "agent", text: "Great — you're confirmed for Saturday at 1:00 PM! You'll tour a model unit that matches the 2BR/2BA layout. Our leasing agent will meet you at the main office. I'll send a confirmation email with directions.", timestamp: "2:15 PM" },
        { role: "resident", text: "Awesome, thank you! One more thing — do you allow dogs?", timestamp: "2:16 PM" },
        { role: "agent", text: "Yes! We're pet-friendly. Dogs are welcome with a $300 refundable deposit and $25/month pet rent. There is a 50 lb weight limit and some breed restrictions. I can email you the full policy if you'd like!", timestamp: "2:16 PM" },
      ],
      trace: [
        { type: "instruction", label: "Load agent persona", detail: "Leasing AI — friendly, helpful tone", durationMs: 12 },
        { type: "knowledge", label: "Retrieve property availability", detail: "Queried calendar for Saturday openings", durationMs: 145 },
        { type: "tool_call", label: "Check Calendar Availability", detail: "3 slots found: 10am, 1pm, 3pm", durationMs: 210, status: "success" },
        { type: "reasoning", label: "Determine response", detail: "Prospect asked about weekend tours — present available times", durationMs: 85 },
        { type: "response", label: "Generated reply", detail: "Offered 3 time slots", durationMs: 120 },
        { type: "tool_call", label: "Schedule Tour", detail: "Confirmed Saturday 1:00 PM — 2BR model unit", durationMs: 180, status: "success" },
        { type: "tool_call", label: "Send Confirmation Email", detail: "Email sent to sarah.mitchell@gmail.com", durationMs: 95, status: "success" },
        { type: "knowledge", label: "Lookup Pet Policy", detail: "Dogs allowed, 50lb limit, $300 deposit", durationMs: 130 },
        { type: "response", label: "Generated final reply", detail: "Answered pet policy question", durationMs: 110 },
      ],
      monitors: [{ label: "Coherent response", passed: true }, { label: "Factually grounded", passed: true }, { label: "Positive sentiment", passed: true }, { label: "No repetition", passed: true }],
    },
    { id: "conv-l2", residentName: "David Park", channel: "SMS", topic: "Pricing Inquiry", summary: "Prospect asked about 1BR pricing. Sent floor plans. No tour scheduled yet.", outcome: "pending", sentiment: "neutral", startedAt: "Today, 11:43 AM", duration: "2m 10s", turns: 4,
      messages: [
        { role: "resident", text: "Hey, what's the price for a 1 bedroom?", timestamp: "11:43 AM" },
        { role: "agent", text: `Thanks for reaching out about ${propertyName}! Our 1BR units start at $1,350/mo for the standard layout and $1,475/mo for the upgraded finish package. We're currently offering $500 off the first month. Want me to send you floor plans?`, timestamp: "11:43 AM" },
        { role: "resident", text: "Yeah send them over", timestamp: "11:44 AM" },
        { role: "agent", text: "Done! I just sent the 1BR floor plans and pricing to your email. Let me know when you'd like to schedule a tour — we have availability all week!", timestamp: "11:44 AM" },
      ],
      trace: [
        { type: "instruction", label: "Load agent persona", durationMs: 11 },
        { type: "tool_call", label: "Query Unit Pricing", detail: "1BR: $1,350-$1,475/mo", durationMs: 165, status: "success" },
        { type: "tool_call", label: "Check Active Specials", detail: "$500 off first month", durationMs: 120, status: "success" },
        { type: "response", label: "Generated pricing reply", durationMs: 95 },
        { type: "tool_call", label: "Send Floor Plans Email", detail: "1BR floor plans sent", durationMs: 140, status: "success" },
      ],
      monitors: [{ label: "Coherent response", passed: true }, { label: "Factually grounded", passed: true }, { label: "Positive sentiment", passed: true }, { label: "No repetition", passed: true }],
    },
    { id: "conv-l3", residentName: "Maria Gonzalez", channel: "Chat", topic: "Application Questions", summary: "Prospect had questions about income requirements. Escalated to leasing manager due to Section 8 voucher.", outcome: "escalated", sentiment: "neutral", startedAt: "Yesterday, 4:30 PM", duration: "6m 15s", turns: 8,
      messages: [
        { role: "resident", text: "I want to apply but I have a Section 8 voucher. Do you accept those?", timestamp: "4:30 PM" },
        { role: "agent", text: `Great question! ${propertyName} does accept Section 8 Housing Choice Vouchers. The process is slightly different from a standard application — let me connect you with our leasing manager who can walk you through the specific requirements and timeline.`, timestamp: "4:31 PM" },
        { role: "resident", text: "Okay, how long does that usually take?", timestamp: "4:31 PM" },
        { role: "agent", text: "The Section 8 approval process typically takes 2-4 weeks after your housing authority completes their inspection. Our leasing manager, Jennifer, will be able to give you a more specific timeline. I'm transferring you now — she'll reach out within the hour.", timestamp: "4:32 PM" },
      ],
      trace: [
        { type: "instruction", label: "Load agent persona", durationMs: 12 },
        { type: "knowledge", label: "Lookup Section 8 Policy", detail: "Vouchers accepted — specialized process", durationMs: 175 },
        { type: "reasoning", label: "Escalation decision", detail: "Section 8 requires leasing manager approval — flagging for handoff", durationMs: 90 },
        { type: "tool_call", label: "Create Escalation", detail: "Assigned to Jennifer Torres (Leasing Manager)", durationMs: 155, status: "success" },
        { type: "response", label: "Generated handoff reply", durationMs: 105 },
      ],
      monitors: [{ label: "Coherent response", passed: true }, { label: "Factually grounded", passed: true }, { label: "Positive sentiment", passed: true }, { label: "Appropriate escalation", passed: true }],
    },
  ];

  if (agentName === "Payments AI") return [
    { id: "conv-p1", residentName: "James Wilson", channel: "SMS", topic: "Late Rent Follow-Up", summary: "Resident paid after receiving reminder. Payment confirmed.", outcome: "resolved", sentiment: "neutral", startedAt: "Today, 10:08 AM", duration: "3m 45s", turns: 6,
      messages: [
        { role: "agent", text: `Hi James, this is a friendly reminder from ${propertyName} that your rent payment of $1,650 was due on the 3rd. Your current balance is $1,650. Would you like a link to make a payment?`, timestamp: "10:08 AM" },
        { role: "resident", text: "Oh shoot, I forgot. Yes please send the link", timestamp: "10:10 AM" },
        { role: "agent", text: "No worries! Here's your payment link: pay.entrata.com/aspen-heights/jwilson. You can pay by ACH, debit, or credit card. The grace period ends on the 5th, so paying today avoids any late fees.", timestamp: "10:10 AM" },
        { role: "resident", text: "Just paid. Can you confirm you got it?", timestamp: "10:12 AM" },
        { role: "agent", text: "Payment of $1,650 received and confirmed! Your balance is now $0.00. Thank you, James. Have a great day!", timestamp: "10:12 AM" },
      ],
      trace: [
        { type: "instruction", label: "Load payment reminder template", durationMs: 14 },
        { type: "tool_call", label: "Query Account Balance", detail: "$1,650 outstanding", durationMs: 180, status: "success" },
        { type: "tool_call", label: "Generate Payment Link", detail: "Link created for James Wilson", durationMs: 130, status: "success" },
        { type: "tool_call", label: "Verify Payment", detail: "$1,650 ACH payment received", durationMs: 220, status: "success" },
        { type: "response", label: "Payment confirmation sent", durationMs: 90 },
      ],
      monitors: [{ label: "Coherent response", passed: true }, { label: "Accurate balance", passed: true }, { label: "Positive sentiment", passed: true }, { label: "No repetition", passed: true }],
    },
    { id: "conv-p2", residentName: "Amy Chen", channel: "Chat", topic: "Payment Plan Request", summary: "Resident approved for 2-installment plan. Agreement sent for signature.", outcome: "resolved", sentiment: "positive", startedAt: "Yesterday, 3:22 PM", duration: "5m 30s", turns: 6,
      messages: [
        { role: "resident", text: "I can't pay my full rent this month. Are payment plans an option?", timestamp: "3:22 PM" },
        { role: "agent", text: "I'm sorry to hear that, Amy. Yes, we do offer payment plans. Based on your account, you're eligible for a 2-installment plan: $825 due by the 5th and $825 by the 20th. Would you like me to set that up?", timestamp: "3:22 PM" },
        { role: "resident", text: "Yes please, that would be a huge help.", timestamp: "3:23 PM" },
        { role: "agent", text: "You're all set! I've sent the payment plan agreement to your email at amy.chen@email.com. Please sign it by the 4th and make the first payment of $825 by the 5th. No late fees will apply as long as both payments are on time.", timestamp: "3:24 PM" },
      ],
      trace: [
        { type: "instruction", label: "Load agent persona", durationMs: 12 },
        { type: "tool_call", label: "Check Payment Plan Eligibility", detail: "Eligible — good payment history", durationMs: 195, status: "success" },
        { type: "reasoning", label: "Calculate installments", detail: "$1,650 / 2 = $825 each", durationMs: 45 },
        { type: "tool_call", label: "Create Payment Plan", detail: "2 installments: 5th and 20th", durationMs: 210, status: "success" },
        { type: "tool_call", label: "Send Agreement Email", detail: "Sent to amy.chen@email.com", durationMs: 105, status: "success" },
      ],
      monitors: [{ label: "Coherent response", passed: true }, { label: "Policy compliant", passed: true }, { label: "Positive sentiment", passed: true }, { label: "No repetition", passed: true }],
    },
  ];

  if (agentName === "Maintenance AI") return [
    { id: "conv-m1", residentName: "Tom Bradley", channel: "SMS", topic: "Emergency — Kitchen Flooding", summary: "Emergency work order created. On-call tech dispatched within 5 minutes.", outcome: "resolved", sentiment: "positive", startedAt: "Today, 7:45 AM", duration: "8m 10s", turns: 8,
      messages: [
        { role: "resident", text: "HELP my kitchen is flooding!! Water everywhere!!", timestamp: "7:45 AM" },
        { role: "agent", text: "I'm so sorry — let me help right away! This is being flagged as an emergency. First, please locate the shutoff valve under your sink and turn it clockwise to stop the water. I'm dispatching our on-call technician now.", timestamp: "7:45 AM" },
        { role: "resident", text: "Ok I found it, water is slowing down", timestamp: "7:47 AM" },
        { role: "agent", text: "Great work! Our technician Marcus is on his way — ETA 20 minutes. In the meantime, place towels around the area to contain the water. Work order #MNT-4892 has been created. Marcus will call you when he arrives.", timestamp: "7:47 AM" },
        { role: "resident", text: "He's here now, thank you so much for the fast response!", timestamp: "8:05 AM" },
        { role: "agent", text: "So glad Marcus got there quickly! He'll take it from here. If you need anything else, don't hesitate to reach out. We'll follow up tomorrow to make sure everything is resolved.", timestamp: "8:05 AM" },
      ],
      trace: [
        { type: "instruction", label: "Load emergency protocol", detail: "Priority: Critical — skip queue", durationMs: 8 },
        { type: "reasoning", label: "Classify urgency", detail: "Keywords: flooding, water, everywhere → EMERGENCY", durationMs: 35 },
        { type: "tool_call", label: "Create Emergency Work Order", detail: "WO #MNT-4892 — Kitchen flooding", durationMs: 140, status: "success" },
        { type: "tool_call", label: "Page On-Call Technician", detail: "Marcus Rivera — ETA 20 min", durationMs: 95, status: "success" },
        { type: "tool_call", label: "Notify Property Manager", detail: "Alert sent to Jennifer Torres", durationMs: 80, status: "success" },
        { type: "tool_call", label: "Schedule Follow-Up", detail: "Tomorrow 9 AM — confirm resolution", durationMs: 65, status: "success" },
      ],
      monitors: [{ label: "Emergency detected", passed: true }, { label: "Fast response (<30s)", passed: true }, { label: "Tech dispatched", passed: true }, { label: "Follow-up scheduled", passed: true }],
    },
    { id: "conv-m2", residentName: "Lisa Park", channel: "Chat", topic: "AC Not Cooling", summary: "Guided troubleshooting, then created work order for HVAC technician.", outcome: "resolved", sentiment: "neutral", startedAt: "Yesterday, 2:15 PM", duration: "5m 40s", turns: 6,
      messages: [
        { role: "resident", text: "My AC has been running all day but it's still 80 degrees in here. Something is wrong.", timestamp: "2:15 PM" },
        { role: "agent", text: "I'm sorry about that! Let's try a few things first. Can you check if the air filter is clean? It's behind the return vent, usually in the hallway. A dirty filter is the most common cause of cooling issues.", timestamp: "2:15 PM" },
        { role: "resident", text: "I checked, the filter looks pretty dirty actually", timestamp: "2:17 PM" },
        { role: "agent", text: "That's likely the culprit! We have replacement filters at the leasing office — you can grab one anytime during office hours. If the AC still isn't cooling properly after 2-3 hours with the new filter, let me know and I'll schedule an HVAC tech visit.", timestamp: "2:18 PM" },
      ],
      trace: [
        { type: "instruction", label: "Load maintenance persona", durationMs: 11 },
        { type: "knowledge", label: "Pull HVAC troubleshooting guide", detail: "Step 1: Check filter, Step 2: Thermostat, Step 3: Tech visit", durationMs: 120 },
        { type: "reasoning", label: "Triage decision", detail: "Non-emergency — guide through troubleshooting first", durationMs: 55 },
        { type: "response", label: "Suggested filter check", durationMs: 90 },
        { type: "tool_call", label: "Log Troubleshooting Interaction", detail: "Dirty filter identified — replacement suggested", durationMs: 75, status: "success" },
      ],
      monitors: [{ label: "Coherent response", passed: true }, { label: "Followed troubleshooting protocol", passed: true }, { label: "Appropriate triage", passed: true }, { label: "No repetition", passed: true }],
    },
  ];

  if (agentName === "Renewal AI") return [
    { id: "conv-r1", residentName: "Kevin Pham", channel: "Email", topic: "Renewal Offer Accepted", summary: "Resident accepted renewal at $1,695/mo for 14-month term with loyalty adjustment.", outcome: "resolved", sentiment: "positive", startedAt: "Today, 9:30 AM", duration: "12m 5s", turns: 8,
      messages: [
        { role: "agent", text: "Hi Kevin! Your lease at Aspen Heights is coming up for renewal on September 14. We'd love to have you stay! Here are your options:\n\n• 12-month: $1,725/mo\n• 14-month: $1,695/mo\n• Month-to-month: $1,950/mo\n\nAs a valued 2-year resident, we're also including a complimentary carpet cleaning. Would you like to discuss these options?", timestamp: "9:30 AM" },
        { role: "resident", text: "The increase is more than I expected. Is there any flexibility on the 12-month rate?", timestamp: "9:45 AM" },
        { role: "agent", text: "I completely understand, Kevin. Since you've been with us for 2 years with a great payment history, I've checked with our renewal team and we can offer a loyalty adjustment of $1,695/mo on the 12-month term — that's only a 2.7% increase vs. the standard 4.5%. The 14-month option at $1,695 is also a great value. What do you think?", timestamp: "9:46 AM" },
        { role: "resident", text: "The 14 month at 1695 sounds good. Let's do that.", timestamp: "10:02 AM" },
        { role: "agent", text: "Excellent choice! I've prepared your renewal agreement for 14 months at $1,695/mo starting September 15. The agreement has been sent to your email — please review and sign by August 15. The complimentary carpet cleaning will be scheduled after signing. Thank you for staying with us, Kevin!", timestamp: "10:02 AM" },
      ],
      trace: [
        { type: "instruction", label: "Load renewal outreach template", durationMs: 14 },
        { type: "tool_call", label: "Pull Lease Details", detail: "End date: Sep 14, Current: $1,650/mo", durationMs: 165, status: "success" },
        { type: "tool_call", label: "Run Market Comparison", detail: "Comps: $1,800-$1,900 for similar units", durationMs: 210, status: "success" },
        { type: "tool_call", label: "Calculate Renewal Options", detail: "3 term options generated", durationMs: 95, status: "success" },
        { type: "reasoning", label: "Negotiation assessment", detail: "2-year resident, clean payment record → eligible for loyalty discount", durationMs: 75 },
        { type: "tool_call", label: "Check Loyalty Discount", detail: "Approved: $30/mo reduction", durationMs: 130, status: "success" },
        { type: "tool_call", label: "Generate Renewal Agreement", detail: "14-month at $1,695/mo", durationMs: 185, status: "success" },
        { type: "tool_call", label: "Send Agreement Email", detail: "Sent to kevin.pham@email.com", durationMs: 90, status: "success" },
      ],
      monitors: [{ label: "Coherent response", passed: true }, { label: "Accurate pricing", passed: true }, { label: "Positive sentiment", passed: true }, { label: "Retention outcome", passed: true }],
    },
    { id: "conv-r2", residentName: "Rachel Adams", channel: "SMS", topic: "Move-Out Notice", summary: "Resident decided to move out. Notice processed, move-out checklist sent.", outcome: "resolved", sentiment: "negative", startedAt: "Yesterday, 11:15 AM", duration: "7m 20s", turns: 6,
      messages: [
        { role: "resident", text: "Hi, I've decided not to renew my lease. What do I need to do?", timestamp: "11:15 AM" },
        { role: "agent", text: "I'm sorry to hear you'll be leaving, Rachel. To process your move-out, you'll need to submit written 60-day notice (your deadline is July 15). I can start that process for you now. Would you like me to send you the official notice form and move-out checklist?", timestamp: "11:15 AM" },
        { role: "resident", text: "Yes please. And when is the move-out inspection?", timestamp: "11:17 AM" },
        { role: "agent", text: "I've sent the notice form and move-out checklist to your email. The pre-move-out inspection is typically scheduled 2 weeks before your lease end date. We'll contact you in early September to set that up. Is there anything that might change your mind? We may be able to offer adjusted terms.", timestamp: "11:18 AM" },
        { role: "resident", text: "No, I'm relocating for work. Thanks for the info.", timestamp: "11:20 AM" },
        { role: "agent", text: "Completely understandable! We wish you the best with your move. If anything changes, we're here. I've noted the reason as work relocation. Take care, Rachel!", timestamp: "11:20 AM" },
      ],
      trace: [
        { type: "instruction", label: "Load move-out protocol", durationMs: 12 },
        { type: "tool_call", label: "Pull Lease End Date", detail: "Sep 14, 2026", durationMs: 145, status: "success" },
        { type: "tool_call", label: "Calculate Notice Deadline", detail: "60-day notice: Jul 15, 2026", durationMs: 65, status: "success" },
        { type: "reasoning", label: "Retention attempt", detail: "Offer adjusted terms before processing move-out", durationMs: 55 },
        { type: "tool_call", label: "Send Move-Out Package", detail: "Notice form + checklist emailed", durationMs: 120, status: "success" },
        { type: "tool_call", label: "Log Move-Out Reason", detail: "Work relocation", durationMs: 80, status: "success" },
        { type: "tool_call", label: "Notify Property Manager", detail: "Rachel Adams — move-out Sep 14", durationMs: 75, status: "success" },
      ],
      monitors: [{ label: "Coherent response", passed: true }, { label: "Retention attempted", passed: true }, { label: "Empathetic tone", passed: true }, { label: "Process followed", passed: true }],
    },
  ];

  return [];
}

function AgentHistoryPanel({ agentName, propertyName }: { agentName: string; propertyName: string }) {
  const logs = useMemo(() => generateConversationLogs(agentName, propertyName), [agentName, propertyName]);
  const [selectedLog, setSelectedLog] = useState<ConversationLog | null>(null);
  const [traceExpanded, setTraceExpanded] = useState(true);

  const outcomeBadge = (outcome: ConversationLog["outcome"]) => {
    if (outcome === "resolved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (outcome === "escalated") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-zinc-100 text-zinc-500 border-zinc-200";
  };

  const sentimentBadge = (s: ConversationLog["sentiment"]) => {
    if (s === "positive") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "negative") return "bg-red-50 text-red-700 border-red-200";
    return "bg-zinc-100 text-zinc-500 border-zinc-200";
  };

  const traceIcon = (type: TraceStep["type"]) => {
    if (type === "tool_call") return <Wrench className="h-3 w-3" />;
    if (type === "knowledge") return <Database className="h-3 w-3" />;
    if (type === "reasoning") return <Lightbulb className="h-3 w-3" />;
    if (type === "response") return <MessageSquare className="h-3 w-3" />;
    return <Cog className="h-3 w-3" />;
  };

  if (selectedLog) {
    const totalTraceMs = selectedLog.trace.reduce((sum, s) => sum + s.durationMs, 0);
    return (
      <div className="flex h-full">
        <div className="flex-1 min-w-0 flex flex-col border-r border-border">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-white shrink-0">
            <button type="button" onClick={() => setSelectedLog(null)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-3 w-3" /> All Conversations
            </button>
            <span className="text-xs text-border">|</span>
            <span className="text-sm font-medium text-foreground">{selectedLog.residentName}</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {selectedLog.channel === "SMS" ? <Phone className="h-2.5 w-2.5" /> : selectedLog.channel === "Email" ? <Mail className="h-2.5 w-2.5" /> : <MessageSquare className="h-2.5 w-2.5" />}
              {selectedLog.channel}
            </span>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${outcomeBadge(selectedLog.outcome)}`}>
              {selectedLog.outcome}
            </span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto bg-muted px-5 py-5">
            <div className="space-y-4 max-w-2xl">
              {selectedLog.messages.map((msg, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium tracking-wider text-muted-foreground">
                      {msg.role === "resident" ? selectedLog.residentName : agentName}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">{msg.timestamp}</span>
                  </div>
                  <div className={msg.role === "resident"
                    ? "max-w-[85%] rounded-2xl px-3 py-2 bg-background text-foreground border border-border shadow-sm text-sm"
                    : "max-w-full py-1 text-foreground text-sm whitespace-pre-line"
                  }>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="px-5 py-3 border-t border-border bg-white shrink-0">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{selectedLog.turns} turns</span>
              <span>{selectedLog.duration}</span>
              <span>{selectedLog.startedAt}</span>
            </div>
          </div>
        </div>
        <aside className="w-80 shrink-0 bg-white overflow-y-auto">
          <div className="p-5 space-y-6">
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3">Conversation Summary</h4>
              <p className="text-xs text-foreground leading-relaxed">{selectedLog.summary}</p>
            </div>
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3">Monitors</h4>
              <div className="space-y-1.5">
                {selectedLog.monitors.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {m.passed ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                    <span className={m.passed ? "text-foreground" : "text-red-600 font-medium"}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setTraceExpanded(!traceExpanded)}
                className="flex items-center justify-between w-full mb-3"
              >
                <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Agent Trace ({selectedLog.trace.length} steps)</h4>
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${traceExpanded ? "" : "-rotate-90"}`} />
              </button>
              {traceExpanded && (
                <div className="space-y-0">
                  {selectedLog.trace.map((step, i) => (
                    <div key={i} className="flex gap-3 pb-3 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                          step.type === "tool_call" ? "bg-blue-50 text-blue-600" :
                          step.type === "knowledge" ? "bg-purple-50 text-purple-600" :
                          step.type === "reasoning" ? "bg-amber-50 text-amber-600" :
                          step.type === "response" ? "bg-emerald-50 text-emerald-600" :
                          "bg-zinc-100 text-zinc-500"
                        }`}>
                          {traceIcon(step.type)}
                        </div>
                        {i < selectedLog.trace.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium text-foreground">{step.label}</p>
                          <span className="text-[10px] text-muted-foreground">{step.durationMs}ms</span>
                        </div>
                        {step.detail && <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{step.detail}</p>}
                      </div>
                    </div>
                  ))}
                  <div className="mt-3 pt-3 border-t border-border flex justify-between text-[10px] text-muted-foreground">
                    <span>Total trace time</span>
                    <span className="font-medium text-foreground">{totalTraceMs}ms</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-1.5">
        <h2 className="text-xl font-bold text-foreground">History & Logging</h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">{logs.filter(l => l.outcome === "resolved").length} Resolved</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">{logs.filter(l => l.outcome === "escalated").length} Escalated</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">{logs.filter(l => l.outcome === "pending").length} Pending</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Review past conversations, inspect agent reasoning traces, and monitor quality for {agentName} at {propertyName}.
      </p>
      <div className="space-y-3">
        {logs.map(log => (
          <button
            key={log.id}
            type="button"
            onClick={() => setSelectedLog(log)}
            className="w-full flex items-center gap-4 rounded-xl border border-border bg-white p-4 text-left transition-all hover:border-zinc-400 hover:shadow-md group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-foreground">{log.residentName}</p>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {log.channel === "SMS" ? <Phone className="h-2.5 w-2.5" /> : log.channel === "Email" ? <Mail className="h-2.5 w-2.5" /> : <MessageSquare className="h-2.5 w-2.5" />}
                  {log.channel}
                </span>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${outcomeBadge(log.outcome)}`}>{log.outcome}</span>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${sentimentBadge(log.sentiment)}`}>{log.sentiment}</span>
              </div>
              <p className="text-xs text-muted-foreground">{log.topic} — {log.summary}</p>
              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground/70">
                <span>{log.startedAt}</span>
                <span>{log.turns} turns</span>
                <span>{log.duration}</span>
                <span>{log.trace.length} trace steps</span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Agent Brand & Tone Panel — cascade-aware settings display in flyout
   ═══════════════════════════════════════════════════════════════════════ */

const AGENT_NAME_TO_ID: Record<string, string> = {
  "Leasing AI": "4",
  "Renewal AI": "7",
  "Maintenance AI": "10",
  "Payments AI": "1",
};

type CascadeLevel = "Company" | "Vertical" | "Property" | "Agent";
type ResolvedField<T> = { value: T; source: CascadeLevel };

function resolveListField(
  voice: ReturnType<typeof useVoice>,
  field: "doExamples" | "dontExamples",
  vertOvr: ReturnType<typeof useVoice>["verticalOverrides"][0] | undefined,
  propOvr: ReturnType<typeof useVoice>["propertyOverrides"][0] | undefined,
  agentOvr: AgentVoiceTuning | undefined,
): ResolvedField<string[]> {
  if (agentOvr?.[field]?.length) return { value: agentOvr[field]!, source: "Agent" };
  if (propOvr?.[field]?.length) return { value: propOvr[field]!, source: "Property" };
  if (vertOvr?.[field]?.length) return { value: vertOvr[field]!, source: "Vertical" };
  return { value: voice[field], source: "Company" };
}

const LEVEL_ICONS: Record<CascadeLevel, React.ComponentType<{ className?: string }>> = {
  Company: Building2,
  Vertical: Layers,
  Property: Home,
  Agent: Bot,
};

const LEVEL_COLORS: Record<CascadeLevel, string> = {
  Company: "bg-blue-500",
  Vertical: "bg-purple-500",
  Property: "bg-amber-500",
  Agent: "bg-emerald-500",
};

function SourceBadge({ source }: { source: CascadeLevel }) {
  const Icon = LEVEL_ICONS[source];
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      <Icon className="h-3 w-3" /> From: {source}
    </span>
  );
}

function CascadeDots({ hasVertical, hasProperty, hasAgent }: { hasVertical: boolean; hasProperty: boolean; hasAgent: boolean }) {
  const levels: { label: CascadeLevel; active: boolean }[] = [
    { label: "Company", active: true },
    { label: "Vertical", active: hasVertical },
    { label: "Property", active: hasProperty },
    { label: "Agent", active: hasAgent },
  ];
  return (
    <div className="flex items-center gap-1">
      {levels.map((lvl, i) => {
        const Icon = LEVEL_ICONS[lvl.label];
        return (
          <div key={lvl.label} className="flex items-center gap-1">
            {i > 0 && <div className="w-4 h-px bg-zinc-300" />}
            <div className="relative group">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center ${
                  lvl.active ? LEVEL_COLORS[lvl.label] : "bg-zinc-200"
                }`}
              >
                <Icon className={`h-3 w-3 ${lvl.active ? "text-white" : "text-zinc-400"}`} />
              </div>
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-muted-foreground font-medium">
                {lvl.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AgentBrandTonePanel({ agentName, property }: { agentName: string; property: { name: string; vertical: string } }) {
  const voice = useVoice();
  const agentId = AGENT_NAME_TO_ID[agentName] ?? "0";

  const vertOvr = voice.verticalOverrides.find(v => v.vertical === property.vertical && v.enabled);
  const propOvr = voice.propertyOverrides.find(p => p.property === property.name);
  const agentOvr = voice.agentTuning.find(
    t => t.agentId === agentId && t.propertyName === property.name,
  );

  const persona = (() => {
    if (agentOvr?.personality) return { value: agentOvr.personality, source: "Agent" as CascadeLevel };
    if (propOvr?.persona) return { value: propOvr.persona, source: "Property" as CascadeLevel };
    if (vertOvr?.persona) return { value: vertOvr.persona, source: "Vertical" as CascadeLevel };
    return { value: voice.persona, source: "Company" as CascadeLevel };
  })();

  const guidelines = (() => {
    if (agentOvr?.customInstructions) return { value: agentOvr.customInstructions, source: "Agent" as CascadeLevel };
    if (propOvr?.brandingTone) return { value: propOvr.brandingTone, source: "Property" as CascadeLevel };
    if (vertOvr?.brandingTone) return { value: vertOvr.brandingTone, source: "Vertical" as CascadeLevel };
    return { value: voice.brandingTone, source: "Company" as CascadeLevel };
  })();

  const doList = resolveListField(voice, "doExamples", vertOvr, propOvr, agentOvr);
  const dontList = resolveListField(voice, "dontExamples", vertOvr, propOvr, agentOvr);

  const [editing, setEditing] = useState(false);
  const [draftPersonality, setDraftPersonality] = useState(agentOvr?.personality ?? "");
  const [draftInstructions, setDraftInstructions] = useState(agentOvr?.customInstructions ?? "");
  const [draftTone, setDraftTone] = useState(agentOvr?.toneOverride ?? "");
  const [draftDos, setDraftDos] = useState<string[]>(agentOvr?.doExamples ?? []);
  const [draftDonts, setDraftDonts] = useState<string[]>(agentOvr?.dontExamples ?? []);
  const [newDo, setNewDo] = useState("");
  const [newDont, setNewDont] = useState("");

  const startEditing = () => {
    setDraftPersonality(agentOvr?.personality ?? "");
    setDraftInstructions(agentOvr?.customInstructions ?? "");
    setDraftTone(agentOvr?.toneOverride ?? "");
    setDraftDos(agentOvr?.doExamples ?? []);
    setDraftDonts(agentOvr?.dontExamples ?? []);
    setNewDo("");
    setNewDont("");
    setEditing(true);
  };

  const saveOverride = () => {
    const entry: AgentVoiceTuning = {
      agentId,
      agentName,
      propertyName: property.name,
      personality: draftPersonality || undefined,
      customInstructions: draftInstructions || undefined,
      toneOverride: draftTone || undefined,
      doExamples: draftDos.length > 0 ? draftDos : undefined,
      dontExamples: draftDonts.length > 0 ? draftDonts : undefined,
    };
    if (agentOvr) {
      voice.updateAgentTuning(agentId, entry, property.name);
    } else {
      voice.addAgentTuning(entry);
    }
    setEditing(false);
  };

  const resetOverride = () => {
    voice.removeAgentTuning(agentId, property.name);
    setEditing(false);
  };

  return (
    <div className="p-8 max-w-3xl">
      <h2 className="text-xl font-bold text-foreground">Brand & Tone</h2>
      <p className="text-sm text-muted-foreground mt-1.5">
        How {agentName} communicates at {property.name}. Settings cascade from Company → Vertical → Property → Agent.
      </p>

      {/* Cascade status bar */}
      <div className="mt-6 rounded-xl border border-border bg-zinc-50/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Cascade Inheritance</p>
            <CascadeDots hasVertical={!!vertOvr} hasProperty={!!propOvr} hasAgent={!!agentOvr} />
          </div>
          <div className="flex items-center gap-2">
            {agentOvr ? (
              <>
                <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50 text-xs">Agent Override Active</Badge>
                {!editing && (
                  <Button variant="outline" size="sm" onClick={startEditing} className="gap-1">
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                )}
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={startEditing} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Add Agent Override
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Effective settings (read-only) */}
      {!editing && (
        <div className="mt-6 space-y-4">
          {/* Persona */}
          <div className="rounded-xl border border-border bg-white p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground">AI Persona</p>
              <SourceBadge source={persona.source} />
            </div>
            <p className="text-sm text-muted-foreground">{persona.value || "Not configured"}</p>
          </div>

          {/* Brand & Tone Guidelines */}
          <div className="rounded-xl border border-border bg-white p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground">Brand & Tone Guidelines</p>
              <SourceBadge source={guidelines.source} />
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{guidelines.value || "Not configured"}</p>
          </div>

          {/* Do's and Don'ts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-white p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-emerald-700">Do&apos;s</p>
                <SourceBadge source={doList.source} />
              </div>
              {doList.value.length > 0 ? (
                <ul className="space-y-1.5">
                  {doList.value.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No items configured</p>
              )}
            </div>
            <div className="rounded-xl border border-border bg-white p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-red-700">Don&apos;ts</p>
                <SourceBadge source={dontList.source} />
              </div>
              {dontList.value.length > 0 ? (
                <ul className="space-y-1.5">
                  {dontList.value.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No items configured</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Agent override editor */}
      {editing && (
        <div className="mt-6 space-y-5">
          <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/30 p-5 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Bot className="h-4 w-4 text-emerald-600" />
              <p className="text-sm font-semibold text-foreground">Agent-Level Override</p>
              <span className="text-xs text-muted-foreground">for {agentName} at {property.name}</span>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Personality / Persona</label>
              <input
                className="input-base w-full text-sm"
                placeholder={persona.value || "e.g. Friendly leasing specialist"}
                value={draftPersonality}
                onChange={e => setDraftPersonality(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Inherited: {persona.value} ({persona.source})</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Tone Override</label>
              <input
                className="input-base w-full text-sm"
                placeholder="e.g. Warm and enthusiastic"
                value={draftTone}
                onChange={e => setDraftTone(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Custom Instructions / Guidelines</label>
              <textarea
                className="input-base w-full resize-y text-sm !h-auto min-h-[120px]"
                rows={5}
                placeholder={guidelines.value || "Enter custom brand & tone instructions for this agent at this property..."}
                value={draftInstructions}
                onChange={e => setDraftInstructions(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Inherited: {guidelines.source} level</p>
            </div>

            {/* Do's editor */}
            <div>
              <label className="mb-2 block text-sm font-medium text-emerald-700">Do&apos;s</label>
              <div className="space-y-1.5 mb-2">
                {draftDos.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span className="flex-1 text-sm">{item}</span>
                    <button
                      type="button"
                      onClick={() => setDraftDos(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="input-base flex-1 text-sm"
                  placeholder="Add a do…"
                  value={newDo}
                  onChange={e => setNewDo(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && newDo.trim()) {
                      setDraftDos(prev => [...prev, newDo.trim()]);
                      setNewDo("");
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!newDo.trim()}
                  onClick={() => { setDraftDos(prev => [...prev, newDo.trim()]); setNewDo(""); }}
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Don'ts editor */}
            <div>
              <label className="mb-2 block text-sm font-medium text-red-700">Don&apos;ts</label>
              <div className="space-y-1.5 mb-2">
                {draftDonts.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                    <span className="flex-1 text-sm">{item}</span>
                    <button
                      type="button"
                      onClick={() => setDraftDonts(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="input-base flex-1 text-sm"
                  placeholder="Add a don't…"
                  value={newDont}
                  onChange={e => setNewDont(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && newDont.trim()) {
                      setDraftDonts(prev => [...prev, newDont.trim()]);
                      setNewDont("");
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!newDont.trim()}
                  onClick={() => { setDraftDonts(prev => [...prev, newDont.trim()]); setNewDont(""); }}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={saveOverride} className="gap-1">
              <Save className="h-3.5 w-3.5" /> Save Override
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            {agentOvr && (
              <Button variant="outline" size="sm" onClick={resetOverride} className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto gap-1">
                <RotateCcw className="h-3.5 w-3.5" /> Reset to Inherited
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const AGENT_FLYOUT_DESCRIPTIONS: Record<string, string> = {
  "Leasing AI": "Automate lead nurturing, scheduling tours, and processing application questions.",
  "Payments AI": "Handle rent payments, fees, and payment-related questions automatically.",
  "Maintenance AI": "Manage work orders, follow-up scheduling, and maintenance requests.",
  "Renewal AI": "Automate renewal conversations, offers, and retention outreach.",
};

type SettingsNav = "property" | "agent-settings" | "brand-tone" | "simulation" | "history";

function getAgentSubPages(agentName: string): { id: SettingsNav; label: string }[] {
  return [
    { id: "agent-settings", label: `${agentName} Settings` },
    { id: "brand-tone", label: "Brand & Tone" },
    { id: "simulation", label: "Simulation" },
    { id: "history", label: "History & Logging" },
  ];
}

function SimplifiedSettingsDetail({ agentName, property, onBack }: { agentName: string; property: typeof AGENT_FLYOUT_PROPERTIES[0]; onBack: () => void }) {
  const tabs = AGENT_SETTINGS_TABS[agentName] ?? [];
  const agentSubPages = useMemo(() => getAgentSubPages(agentName), [agentName]);
  const [activeNav, setActiveNav] = useState<SettingsNav>("property");
  // Count simulations the user has started in the Simulation tab for THIS property.
  // Component remounts per property, so the counter is automatically per-property.
  const [simulationCount, setSimulationCount] = useState(0);

  return (
    <div className="flex h-full">
      <aside className="w-52 shrink-0 border-r border-border bg-white overflow-y-auto">
        <div className="p-5">
          <button type="button" onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3 w-3" aria-hidden />
            {agentName}
          </button>
          <div className="mt-4">
            <p className="text-base font-bold text-foreground">{property.name}</p>
            <p className="text-xs text-emerald-600 mt-0.5">Active</p>
          </div>
          <nav className="mt-6 space-y-4">
            <div>
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Property</p>
              <button
                type="button"
                onClick={() => setActiveNav("property")}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  activeNav === "property"
                    ? "bg-zinc-100 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-zinc-50 hover:text-foreground"
                }`}
              >
                Property Settings
              </button>
            </div>
            <div>
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Agent</p>
              <div className="space-y-0.5">
                {agentSubPages.map(page => (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => setActiveNav(page.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      activeNav === page.id
                        ? "bg-zinc-100 font-medium text-foreground"
                        : "text-muted-foreground hover:bg-zinc-50 hover:text-foreground"
                    }`}
                  >
                    {page.label}
                  </button>
                ))}
              </div>
            </div>
          </nav>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-y-auto">
        {activeNav === "property" ? (
          <div className="p-8 max-w-3xl">
            <h2 className="text-xl font-bold text-foreground">Property Settings</h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              To help ELI+ perform to the next level, please review and configure these settings in the Entrata platform.
            </p>
            <div className="mt-8 space-y-10">
              {tabs.map(section => (
                <div key={section.id}>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{section.label}</h3>
                  <div className="space-y-3">
                    {section.settings.map(setting => (
                      <a
                        key={setting.name}
                        href="#"
                        onClick={e => e.preventDefault()}
                        className="flex items-center gap-4 rounded-xl border border-border bg-white p-4 text-left transition-all hover:border-zinc-400 hover:shadow-md group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{setting.name}</p>
                          {setting.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{setting.description}</p>
                          )}
                        </div>
                        <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 group-hover:bg-zinc-700 transition-colors">
                          <ArrowRight className="h-4 w-4 text-white" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeNav === "agent-settings" ? (
          agentName === "Leasing AI" ? (
            <div className="relative h-full">
              <LeasingAISettingsPanel
                propertyName={property.name}
                agentDisplayLabel={`ELI+ ${agentName}`}
                simulationCount={simulationCount}
                onOpenSimulation={() => setActiveNav("simulation")}
              />
            </div>
          ) : (
            <div className="p-8 max-w-3xl">
              <h2 className="text-xl font-bold text-foreground">{agentName} Settings</h2>
              <p className="text-sm text-muted-foreground mt-1.5">
                Configure agent-specific settings that control how {agentName} operates at {property.name}.
              </p>
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="h-14 w-14 rounded-full bg-zinc-100 flex items-center justify-center">
                  <Bot className="h-7 w-7 text-zinc-400" aria-hidden />
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-base font-semibold text-foreground">Coming Soon</p>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Agent-specific settings for {agentName} will allow you to configure escalation rules, response thresholds, operating hours, handoff behavior, and other parameters unique to this agent.
                  </p>
                </div>
              </div>
            </div>
          )
        ) : activeNav === "brand-tone" ? (
          <AgentBrandTonePanel agentName={agentName} property={property} />
        ) : activeNav === "simulation" ? (
          <AgentSimulationPanel
            agentName={agentName}
            propertyName={property.name}
            onSimulationStarted={() => setSimulationCount((n) => n + 1)}
          />
        ) : (
          <AgentHistoryPanel agentName={agentName} propertyName={property.name} />
        )}
      </main>
    </div>
  );
}

function EliPlusSettingsFlyout({ agentName, SettingsPage }: { agentName: string; SettingsPage: React.ComponentType<FlyoutPageProps> }) {
  const [selectedProperty, setSelectedProperty] = useState<typeof AGENT_FLYOUT_PROPERTIES[0] | null>(null);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => new Set(AGENT_FLYOUT_PROPERTIES.map(p => p.id)));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDraft, setPickerDraft] = useState<Set<string>>(() => new Set(visibleIds));
  const [pickerSearch, setPickerSearch] = useState("");
  const [sortField, setSortField] = useState<"name" | "vertical" | "status">("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [activatePopover, setActivatePopover] = useState<string | null>(null);

  const filtered = AGENT_FLYOUT_PROPERTIES
    .filter(p => visibleIds.has(p.id))
    .sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      const cmp = String(valA).localeCompare(String(valB));
      return sortAsc ? cmp : -cmp;
    });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const openPicker = () => { setPickerDraft(new Set(visibleIds)); setPickerSearch(""); setPickerOpen(true); };
  const applyPicker = () => { setVisibleIds(new Set(pickerDraft)); setPickerOpen(false); };

  const availableForPicker = AGENT_FLYOUT_PROPERTIES.filter(p => !pickerDraft.has(p.id) && p.name.toLowerCase().includes(pickerSearch.toLowerCase()));
  const selectedForPicker = AGENT_FLYOUT_PROPERTIES.filter(p => pickerDraft.has(p.id));

  const filterLabel = visibleIds.size === AGENT_FLYOUT_PROPERTIES.length
    ? "All Properties"
    : `${visibleIds.size} Properties`;

  const handleRowClick = (prop: typeof AGENT_FLYOUT_PROPERTIES[0]) => {
    if (prop.status === "Active") {
      setSelectedProperty(prop);
    } else {
      setActivatePopover(prev => prev === prop.id ? null : prop.id);
    }
  };

  if (selectedProperty) {
    return (
      <SimplifiedSettingsDetail
        agentName={agentName}
        property={selectedProperty}
        onBack={() => setSelectedProperty(null)}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto px-8 py-8" onClick={() => activatePopover && setActivatePopover(null)}>
      <div className="flex items-center gap-2.5">
        <img src="/eli-cube.svg" alt="" width={28} height={28} />
        <h1 className="text-2xl font-bold text-foreground">{agentName}</h1>
      </div>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">{AGENT_FLYOUT_DESCRIPTIONS[agentName] ?? ""}</p>

      <div className="mt-8">
        <div className="flex items-center gap-3 mb-5">
          <button
            type="button"
            onClick={openPicker}
            className="h-9 flex items-center gap-2 rounded-lg border border-border bg-white pl-3 pr-3 text-sm text-foreground hover:border-zinc-400 transition-colors"
          >
            {filterLabel} <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-1" />
          </button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-3 font-medium text-muted-foreground">
                <button type="button" onClick={() => toggleSort("name")} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <ArrowUpDown className="h-3 w-3" /> Property
                </button>
              </th>
              <th className="pb-3 font-medium text-muted-foreground">
                <button type="button" onClick={() => toggleSort("vertical")} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <ArrowUpDown className="h-3 w-3" /> Vertical
                </button>
              </th>
              <th className="pb-3 font-medium text-muted-foreground">
                <button type="button" onClick={() => toggleSort("status")} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <ArrowUpDown className="h-3 w-3" /> Status
                </button>
              </th>
              <th className="pb-3 w-12" />
            </tr>
          </thead>
          <tbody>
            {filtered.map(prop => {
              const isActive = prop.status === "Active";
              return (
                <tr
                  key={prop.id}
                  className={`border-b border-border/50 cursor-pointer transition-colors relative ${isActive ? "hover:bg-zinc-100" : "hover:bg-zinc-50"}`}
                  onClick={(e) => { e.stopPropagation(); handleRowClick(prop); }}
                >
                  <td className={`py-3.5 font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{prop.name}</td>
                  <td className="py-3.5 text-muted-foreground">{prop.vertical}</td>
                  <td className="py-3.5">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                      isActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-zinc-100 text-zinc-500 border-zinc-200"
                    }`}>
                      {prop.status}
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    {isActive ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedProperty(prop); }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-zinc-200 hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="inline-flex h-8 w-8 items-center justify-center text-zinc-300">
                        <Pencil className="h-4 w-4" />
                      </span>
                    )}
                  </td>
                  {activatePopover === prop.id && (
                    <td className="absolute right-0 top-full z-50 mt-1" style={{ position: "absolute" }} colSpan={4}>
                      <div className="w-80 rounded-xl border border-border bg-white p-5 shadow-lg" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                          <p className="text-sm font-semibold text-foreground">Activate this property</p>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          Complete the ELI+ Setup activation steps to enable this agent for {prop.name}.
                        </p>
                        <p className="text-xs font-medium text-foreground mb-1.5">Remaining steps:</p>
                        <ul className="space-y-1 mb-4">
                          {["Carrier Compliance", "Privacy Policies", "Email Integration", "IVR Setup", "Communications"].map(step => (
                            <li key={step} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 shrink-0" />
                              {step}
                            </li>
                          ))}
                        </ul>
                        <a
                          href="/getting-started?tab=eli-plus"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 transition-colors"
                        >
                          <img src="/eli-cube.svg" alt="" width={14} height={14} className="brightness-0 invert" />
                          Go to ELI+ Setup
                        </a>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="py-10 text-center text-muted-foreground">No properties match the current filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {pickerOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => setPickerOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 flex flex-col" style={{ maxHeight: "80vh" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h2 className="text-lg font-bold text-foreground">Properties</h2>
              <button type="button" onClick={() => setPickerOpen(false)} className="p-1 rounded-md hover:bg-zinc-100 text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search Properties"
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
                />
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden px-6">
              <div className="grid grid-cols-2 gap-4 h-full">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Available Properties</span>
                    <button
                      type="button"
                      onClick={() => setPickerDraft(new Set(AGENT_FLYOUT_PROPERTIES.map(p => p.id)))}
                      className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-zinc-50 transition-colors"
                    >
                      Add All <span className="text-muted-foreground">+</span>
                    </button>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto border border-border rounded-lg">
                    {availableForPicker.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-sm text-muted-foreground py-8">
                        {pickerSearch ? "No matches" : "All properties selected"}
                      </div>
                    ) : (
                      <div className="p-1">
                        {availableForPicker.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setPickerDraft(prev => new Set([...prev, p.id]))}
                            className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-zinc-50 transition-colors text-foreground"
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Selected Properties</span>
                    <button
                      type="button"
                      onClick={() => setPickerDraft(new Set())}
                      className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-zinc-50 transition-colors"
                    >
                      Remove All <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto border border-border rounded-lg">
                    {selectedForPicker.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-sm text-muted-foreground py-8">No properties selected</div>
                    ) : (
                      <div className="p-1">
                        {selectedForPicker.map(p => (
                          <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-zinc-50 transition-colors">
                            <span className="text-foreground">{p.name}</span>
                            <button type="button" onClick={() => setPickerDraft(prev => { const n = new Set(prev); n.delete(p.id); return n; })} className="p-0.5 rounded hover:bg-zinc-200 text-muted-foreground hover:text-foreground transition-colors">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center px-6 py-4">
              <button
                type="button"
                onClick={applyPicker}
                className="px-6 py-2 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
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

  const SettingsPage = ELI_PLUS_SETTINGS_MAP[agent.name];

  if (SettingsPage) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full flex flex-col overflow-hidden p-0 sm:max-w-[75vw]">
          <SheetHeader className="sr-only">
            <SheetTitle>{agent.name}</SheetTitle>
            <SheetDescription>{agent.bucket}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            <EliPlusSettingsFlyout agentName={agent.name} SettingsPage={SettingsPage} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

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
