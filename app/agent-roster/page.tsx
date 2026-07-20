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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTools } from "@/lib/tools-context";
import { useGovernance } from "@/lib/governance-context";
import { useAgentCompliance } from "@/lib/use-agent-compliance";
import { useR1Release } from "@/lib/r1-release-context";
import { Tag, X, Search, DollarSign, Megaphone, Users, Wrench, ShieldCheck, Power, Activity, AlertCircle, Play, Clock, CheckCircle, CheckCircle2, XCircle, Calendar, Lightbulb, Target, Database, BarChart3, Pencil, Save, ArrowLeft, ArrowRight, Sparkles, BookOpen, Cog, Bot, Box, MessageSquare, Shield, Zap, Eye, EyeOff, Globe, Mail, Phone, Volume2, History, RotateCcw, Lock, ExternalLink, CirclePlay, TrendingUp, TrendingDown, Minus, ArrowUpDown, ChevronDown, ChevronUp, Building2, Layers, Home, Plus, Info, Trash2, Copy, Star } from "lucide-react";
import {
  useVoice,
  NOVA2_VOICES,
  DEFAULT_NOVA2_VOICE_ID,
  getNova2Voice,
  getNova2VoicesByGender,
  type AgentToneId,
  type AgentVoiceTuning,
  type VoiceSettings,
  type ToneSettings,
} from "@/lib/voice-context";
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
import { MaintenanceAISettingsPanel } from "@/components/maintenance-ai-settings-panel";
import { RenewalsAISettingsPanel } from "@/components/renewals-ai-settings-panel";
import { PaymentsAISettingsPanel } from "@/components/payments-ai-settings-panel";
import { PaymentsAIBulkPropertySelector } from "@/components/payments-ai/bulk-property-selector";
import {
  buildPaymentsAIBulkCategories,
  getSelectedGroupLabels,
  type BulkSelectionScope,
} from "@/lib/payments-ai-property-groups";
import {
  getSettingValueByName,
  resolvePropertySettings,
} from "@/lib/payments-ai-property-settings";
import { InternalDemoPanel } from "@/components/internal-demo-panel";
import { LeadToLeaseSettings } from "@/components/lead-to-lease-settings";
import { L3AgentSheet, getL3AgentConfig } from "@/components/l3-agent-flyout";
import { ExpertsConfigSheet } from "@/components/entrata-experts-v2/admin/experts-config-sheet";

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

// Four ELI+ L4 agents that are always anchored at the top of the roster,
// just below the L5 "Autonomous Lease Progression" hero. Order is intentional.
const PINNED_ELI_PLUS_ORDER = [
  "Maintenance AI",
  "Payments AI",
  "Leasing AI",
  "Renewal AI",
] as const;
const PINNED_ELI_PLUS_NAMES = new Set<string>(PINNED_ELI_PLUS_ORDER);

// Curated section ordering for the default (unfiltered) roster view. These drive
// the "Trending" and "Most Popular" groupings shown when no filters/search are
// active. Names must match agent names in agents-context.tsx exactly.
const TRENDING_AGENT_NAMES = [
  "Rebuild Renewal Offers When Pricing Changes",
  "Create Draw Request",
  "Countersign Individual Docs",
  "Advance Period Select All AP Agent",
  "Installation Complete Update",
  "Business License Bulk Update",
] as const;

const MOST_POPULAR_AGENT_NAMES = [
  "Lifecycle Status Update",
  "Approve Applications",
  "Approve for Payment",
  "Activate & Sync Templates",
  "Renewal Offer Creation",
  "Advance Accounting Periods",
] as const;

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
  const isFullVersion = !isR1Release;
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
  const [leadToLeaseOpen, setLeadToLeaseOpen] = useState(false);
  const [leadToLeaseActivateOpen, setLeadToLeaseActivateOpen] = useState(false);
  const [l3AgentId, setL3AgentId] = useState<string | null>(null);
  const [expertsConfigOpen, setExpertsConfigOpen] = useState(false);
  const [expandedBucket, setExpandedBucket] = useState<string | null>(null);
  const [videoAgentName, setVideoAgentName] = useState<string | null>(null);
  const [cardSortBy, setCardSortBy] = useState<"recently_added" | "name" | "level">("recently_added");
  const [selectedBuckets, setSelectedBuckets] = useState<Set<string>>(new Set());
  const [selectedLevels, setSelectedLevels] = useState<Set<string>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());
  const [eliPlusOnly, setEliPlusOnly] = useState(false);

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
      if (eliPlusOnly && !PINNED_ELI_PLUS_NAMES.has(a.name)) return false;
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
  }, [agents, eliPlusOnly, selectedBuckets, selectedStatuses, selectedLevels, search]);

  const cardSorted = useMemo(() => {
    const arr = [...cardFiltered];
    if (cardSortBy === "name") arr.sort((a, b) => a.name.localeCompare(b.name));
    else if (cardSortBy === "level") arr.sort((a, b) => (TYPE_LEVEL[b.type] ?? 0) - (TYPE_LEVEL[a.type] ?? 0));
    else {
      arr.sort((a, b) => {
        const aHasConfig = getL3AgentConfig(a.name) ? 1 : 0;
        const bHasConfig = getL3AgentConfig(b.name) ? 1 : 0;
        return bHasConfig - aHasConfig;
      });
    }

    // Always anchor the four ELI+ L4 agents at the top, just below the L5 hero
    const pinnedItems = PINNED_ELI_PLUS_ORDER
      .map((name) => arr.find((a) => a.name === name))
      .filter((a): a is (typeof arr)[number] => Boolean(a));
    const rest = arr.filter((a) => !PINNED_ELI_PLUS_NAMES.has(a.name));
    return [...pinnedItems, ...rest];
  }, [cardFiltered, cardSortBy]);

  const activeFilterPills = useMemo(() => {
    const pills: { label: string; group: string; value: string }[] = [];
    if (eliPlusOnly) pills.push({ label: "ELI+ Agents", group: "eliPlus", value: "eliPlus" });
    selectedBuckets.forEach((b) => pills.push({ label: b, group: "bucket", value: b }));
    selectedLevels.forEach((l) => pills.push({ label: l, group: "level", value: l }));
    selectedStatuses.forEach((s) => pills.push({ label: s, group: "status", value: s }));
    return pills;
  }, [eliPlusOnly, selectedBuckets, selectedLevels, selectedStatuses]);

  const removeFilterPill = (group: string, value: string) => {
    if (group === "eliPlus") setEliPlusOnly(false);
    else if (group === "bucket") toggleSetItem(setSelectedBuckets, value);
    else if (group === "level") toggleSetItem(setSelectedLevels, value);
    else if (group === "status") toggleSetItem(setSelectedStatuses, value);
  };

  const clearAllFilters = () => {
    setEliPlusOnly(false);
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
    if (agent.name === "Autonomous Lease Progression") {
      if (agent.status === "Active") setLeadToLeaseOpen(true);
      else setLeadToLeaseActivateOpen(true);
      return;
    }
    if (agent.name === "Entrata Experts") { setExpertsConfigOpen(true); return; }
    if (getL3AgentConfig(agent.name)) { setL3AgentId(agentId); return; }
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

  // The default (unfiltered) roster groups agents into curated sections. As soon
  // as the user applies any filter or types a search, we fall back to the flat
  // card grid so filtering keeps working exactly as before.
  const hasActiveFilters = activeFilterPills.length > 0 || search.trim().length > 0;

  const rosterSections = useMemo(() => {
    // L5 hero is rendered separately above the sections.
    const pool = cardSorted.filter((a) => a.type !== "fully_autonomous");
    const used = new Set<string>();

    const eliPlus = PINNED_ELI_PLUS_ORDER
      .map((name) => pool.find((a) => a.name === name))
      .filter((a): a is (typeof pool)[number] => Boolean(a));
    eliPlus.forEach((a) => used.add(a.id));

    const pickByNames = (names: readonly string[]) =>
      names
        .map((name) => pool.find((a) => a.name === name && !used.has(a.id)))
        .filter((a): a is (typeof pool)[number] => Boolean(a));

    const trending = pickByNames(TRENDING_AGENT_NAMES);
    trending.forEach((a) => used.add(a.id));

    const mostPopular = pickByNames(MOST_POPULAR_AGENT_NAMES);
    mostPopular.forEach((a) => used.add(a.id));

    const remaining = pool.filter((a) => !used.has(a.id));
    const byCategory = BUCKETS
      .map((bucket) => ({ bucket, items: remaining.filter((a) => a.bucket === bucket) }))
      .filter((g) => g.items.length > 0);

    return { eliPlus, trending, mostPopular, byCategory };
  }, [cardSorted]);

  const renderAgentCard = (agent: Agent) => {
    const isOffEliPlus = agent.type === "autonomous" && agent.status === "Off";
    const isPinnedEliPlus = PINNED_ELI_PLUS_NAMES.has(agent.name);
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
          if (agent.name === "Entrata Experts") { setExpertsConfigOpen(true); return; }
          if (getL3AgentConfig(agent.name)) { setL3AgentId(agent.id); return; }
          if (agent.type === "operations" || agent.type === "efficiency" || agent.type === "intelligence") setOpsAgentId(agent.id);
          else setAutoAgentId(agent.id);
        }}
        className={`group relative flex flex-col rounded-xl border bg-white p-4 text-left transition-all hover:shadow-md ${
          selectedId === agent.id
            ? "border-[#6366f1]/40 shadow-md ring-1 ring-[#6366f1]/20"
            : isPinnedEliPlus
              ? "border-2 border-[#7c3aed]/40 hover:border-[#7c3aed]/60"
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
  };

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
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-sm text-foreground transition-colors hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={eliPlusOnly}
                      onChange={() => setEliPlusOnly((v) => !v)}
                      className="h-3.5 w-3.5 rounded border-border accent-[#7c3aed]"
                    />
                    <span className="truncate text-[13px] font-semibold text-[#7c3aed]">ELI+ Agents</span>
                  </label>
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
                  {AGENT_TYPES.map((t) => (
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

            {/* Featured · L5 Hero Agent */}
            {(() => {
              const l5Agent = cardSorted.find((a) => a.type === "fully_autonomous");
              if (!l5Agent) return null;
              return (
                <div className="mb-6">
                {!hasActiveFilters && (
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#7c3aed]" />
                    <h2 className="text-base font-semibold text-foreground">Featured</h2>
                    <span className="text-sm text-muted-foreground">Your top-tier autonomous agent.</span>
                  </div>
                )}
                <button
                  key={l5Agent.id}
                  type="button"
                  onClick={() => {
                    if (l5Agent.status === "Active") setLeadToLeaseOpen(true);
                    else setLeadToLeaseActivateOpen(true);
                  }}
                  className="w-full rounded-2xl border-2 border-[#7c3aed]/30 bg-gradient-to-r from-[#7c3aed]/[0.04] via-white to-[#7c3aed]/[0.04] p-6 text-left transition-all hover:shadow-lg hover:border-[#7c3aed]/50 group"
                >
                  <div className="flex items-center gap-5">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#7c3aed]/10">
                      <img src="/eli-cube.svg" alt="" width={30} height={30} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="text-lg font-bold text-foreground">Autonomous Lease Progression</p>
                        <span className="rounded-full bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] px-2.5 py-0.5 text-[10px] font-bold text-white tracking-wide">L5</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${l5Agent.status === "Active" ? "bg-[#B3FFCC] text-black" : "bg-amber-400 text-amber-950"}`}>
                          {l5Agent.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
                        {l5Agent.description}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-3">
                      <div className="flex flex-col items-end gap-1 text-right mr-2">
                        <span className="text-xs font-semibold text-[#7c3aed]">4 Stages</span>
                        <span className="text-[11px] text-muted-foreground">15 L3 + 8 L4 agents</span>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7c3aed]/10 group-hover:bg-[#7c3aed]/20 transition-colors">
                        <ArrowRight className="h-5 w-5 text-[#7c3aed]" />
                      </div>
                    </div>
                  </div>
                </button>
                </div>
              );
            })()}

            {hasActiveFilters ? (
              /* ── Filtered / search results: flat grid ── */
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {cardSorted.filter((a) => a.type !== "fully_autonomous").map((agent) => renderAgentCard(agent))}
              </div>
            ) : (
              /* ── Default view: curated sections ── */
              <div className="space-y-8">
                {/* ELI+ · Conversational Agents · L4 */}
                {rosterSections.eliPlus.length > 0 && (
                  <section className="rounded-2xl border border-[#7c3aed]/20 bg-gradient-to-b from-[#7c3aed]/[0.04] to-transparent p-5">
                    <div className="mb-4">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          <Sparkles className="h-3 w-3" /> ELI+
                        </span>
                        <h2 className="text-base font-semibold text-foreground">Conversational Agents · L4</h2>
                        <span className="text-sm text-muted-foreground">{rosterSections.eliPlus.length}</span>
                      </div>
                      <p className="mt-1 text-[13px] text-muted-foreground">Top-tier agents that hold full resident conversations end to end.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {rosterSections.eliPlus.map((agent) => renderAgentCard(agent))}
                    </div>
                  </section>
                )}

                {/* Trending */}
                {rosterSections.trending.length > 0 && (
                  <section>
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-foreground" />
                        <h2 className="text-base font-semibold text-foreground">Trending</h2>
                        <span className="text-sm text-muted-foreground">{rosterSections.trending.length}</span>
                      </div>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">Gaining momentum across Entrata customers right now.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {rosterSections.trending.map((agent) => renderAgentCard(agent))}
                    </div>
                  </section>
                )}

                {/* Most Popular */}
                {rosterSections.mostPopular.length > 0 && (
                  <section>
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-foreground" />
                        <h2 className="text-base font-semibold text-foreground">Most Popular</h2>
                        <span className="text-sm text-muted-foreground">{rosterSections.mostPopular.length}</span>
                      </div>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">The agents teams use most week to week.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {rosterSections.mostPopular.map((agent) => renderAgentCard(agent))}
                    </div>
                  </section>
                )}

                {/* Remaining agents grouped by category */}
                {rosterSections.byCategory.map(({ bucket, items }) => (
                  <section key={bucket}>
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        {(() => { const Icon = BUCKET_ICONS[bucket]; return Icon ? <Icon className="h-4 w-4 text-foreground" /> : null; })()}
                        <h2 className="text-base font-semibold text-foreground">{bucket}</h2>
                        <span className="text-sm text-muted-foreground">{items.length}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {items.map((agent) => renderAgentCard(agent))}
                    </div>
                  </section>
                ))}
              </div>
            )}

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
                    {t.label}
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
            {typeFilter === "fully_autonomous" && !filtered.some(a => a.type === "fully_autonomous") && (
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
            <div className={`space-y-8 ${typeFilter === "fully_autonomous" && !filtered.some(a => a.type === "fully_autonomous") ? "hidden" : ""}`}>
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
                                if (agent.name === "Autonomous Lease Progression") {
                                  if (agent.status === "Active") setLeadToLeaseOpen(true);
                                  else setLeadToLeaseActivateOpen(true);
                                  return;
                                }
                                if (agent.name === "Entrata Experts") { setExpertsConfigOpen(true); return; }
                                if (getL3AgentConfig(agent.name)) { setL3AgentId(agent.id); return; }
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

      {l3AgentId && (() => {
        const l3Agent = agents.find((a) => a.id === l3AgentId);
        if (!l3Agent) return null;
        return (
          <L3AgentSheet
            agent={l3Agent}
            open
            onOpenChange={(open) => { if (!open) setL3AgentId(null); }}
            onToggle={(status) => updateAgent(l3Agent.id, { status })}
            onVideoClick={setVideoAgentName}
          />
        );
      })()}

      <ExpertsConfigSheet
        open={expertsConfigOpen}
        onOpenChange={setExpertsConfigOpen}
      />

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

      {(() => {
        const l2lAgent = agents.find((a) => a.name === "Autonomous Lease Progression");
        const l2lIsActive = l2lAgent?.status === "Active";
        const toggleL2L = () => {
          if (!l2lAgent) return;
          updateAgent(l2lAgent.id, { status: l2lIsActive ? "Off" : "Active" });
        };
        return (
          <>
            <Sheet open={leadToLeaseOpen} onOpenChange={setLeadToLeaseOpen}>
              <SheetContent className="w-full flex flex-col overflow-hidden p-0 sm:max-w-[90vw]">
                <SheetHeader className="sr-only">
                  <SheetTitle>Autonomous Lease Progression</SheetTitle>
                  <SheetDescription>Lead to lease settings and configuration</SheetDescription>
                </SheetHeader>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <LeadToLeaseSettings
                    isActive={l2lIsActive ?? false}
                    onToggleActive={toggleL2L}
                  />
                </div>
              </SheetContent>
            </Sheet>

            <Dialog open={leadToLeaseActivateOpen} onOpenChange={setLeadToLeaseActivateOpen}>
              <DialogContent className="max-w-md p-0">
                <div className="p-6 pb-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7c3aed]/10">
                      <img src="/eli-cube.svg" alt="" width={24} height={24} />
                    </div>
                    <div>
                      <DialogTitle className="text-base font-semibold">Autonomous Lease Progression</DialogTitle>
                      <DialogDescription className="text-sm text-muted-foreground">
                        End-to-end leasing intelligence for your portfolio
                      </DialogDescription>
                    </div>
                  </div>
                </div>

                <div className="px-6 pt-4">
                  <div className="rounded-lg border border-border p-4">
                    <p className="mb-3 text-sm font-semibold text-foreground">What this agent does</p>
                    <ul className="space-y-2">
                      {[
                        "Orchestrates the full lead-to-lease pipeline — from guest card to signed lease",
                        "Configures screening criteria, application rules, and lease execution per property type",
                        "Coordinates Guest Cards, Applications, Screening, and Lease Creation as one unified workflow",
                        "Applies property-type-specific settings across Affordable, Conventional, Student, and more",
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                          <span className="text-sm text-muted-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="px-6 pt-4">
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                    <p className="mb-3 text-sm font-semibold text-foreground">Impact from similar properties</p>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      {[
                        { value: "62%", label: "Faster lease execution time" },
                        { value: "41%", label: "Increase in application completion" },
                        { value: "3.2x", label: "More leads processed per agent" },
                      ].map((m) => (
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
                  <Button
                    className="w-full"
                    onClick={() => {
                      toggleL2L();
                      setLeadToLeaseActivateOpen(false);
                      setLeadToLeaseOpen(true);
                    }}
                  >
                    Activate Autonomous Lease Progression
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
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

type SettingItem = { name: string; description: string; link?: string };
type TabDef = { id: string; label: string; settings: SettingItem[] };

const AGENT_SETTINGS_TABS: Record<string, TabDef[]> = {
  "Leasing AI": [
    { id: "general", label: "General Info", settings: [
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
      { name: "Application Page", description: "Set the URL for the online application landing page." },
      { name: "Floor Plan Page", description: "Configure the floor plan gallery page shared with prospects." },
    ]},
  ],
  "Payments AI": [
    { id: "payment-info", label: "Payment Info", settings: [
      { name: "Rent Charge Date", description: "The day of the month when rent charges are posted to resident accounts." },
      { name: "Payment Block Days", description: "Set the date after which payments are blocked for the billing period." },
      { name: "Accepted Payment Types", description: "Select which payment methods are accepted, including ACH, Card, MoneyGram, etc." },
      { name: "Partial Payments", description: "Configure whether residents may pay less than their full balance and related partial payment rules." },
      { name: "Lease Status Payment Allowances", description: "Define which lease statuses are permitted to make online payments." },
      { name: "Auto Payments", description: "Configure autopay enrollment, scheduling, and related resident portal settings." },
      { name: "Pre Payments", description: "Configure whether and how residents can pay before charges are posted for the billing period." },
      { name: "Late Payments", description: "Configure rules for accepting and processing late payments." },
      { name: "Repayment Agreement Policy", description: "Set repayment agreement terms, eligibility criteria, and agreement details." },
    ]},
    { id: "policies", label: "Policies", settings: [
      { name: "Standard Rent Reminders", description: "Review Rent Reminder contact point settings to determine how standard rent reminders will be delivered." },
      { name: "Delinquency Notices", description: "Review delinquency notice delivery settings to determine how delinquency notices will be delivered" },
      { name: "Collections Policy", description: "Review collections notice settings to determine how collections notices will be delivered." },
      { name: "Eviction Date", description: "The specific date when eviction filings are initiated." },
      { name: "Past Resident Login Window", description: "The number of days a resident with the lease status of Past can login to make online payments." },
      { name: "Late Fee Policy", description: "Define late fee amounts, calculation methods, and escalation rules." },
    ]},
  ],
  "Maintenance AI": [
    { id: "property", label: "Property Info", settings: [
      { name: "Primary Address", description: "The property's physical address used in maintenance communications." },
      { name: "ELI+ Dashboard Permissions", description: "Permission users who directly manage the ELI+ console for this property." },
    ]},
    { id: "maintenance-info", label: "Maintenance Info", settings: [
      { name: "Contact Points", description: "Review contact points for work order creation and status updates to avoid duplicate communication." },
      { name: "Maintenance Availability/Hours", description: "Set operating hours for the maintenance team, including holidays." },
      { name: "Call Handling", description: "Configure your IVR routing for maintenance, office hours, after office hours, and emergencies." },
      { name: "On Call Emergency Back Up", description: "Establish one or more backup phone numbers to be used as alternative contacts if the primary on call technician cannot be reached." },
      { name: "Permission to Enter", description: "Review the default permission for entering a unit when a work order is created by a resident through AI." },
      { name: "Disclose Status to Resident", description: "Control whether the work order status (i.e. new, in progress, on hold) can be given to the resident." },
      { name: "Disclose Scheduled Date to Resident", description: "Determine if the work order schedule date, if available, can be communicated to the resident when they proactively ask." },
      { name: "Disclose Priority to Resident", description: "Control whether the work order priority (i.e. low, normal, emergency) can be communicated to the resident." },
      { name: "Number of Days to Display Work Orders", description: "Defines the lookback window (in days) for which open and closed service requests are displayed for the resident." },
      { name: "Work Order Attachments Allowed", description: "If set to Yes, residents will be able to add photos when submitting work orders." },
      { name: "Work Order Priorities", description: "Review the priorities (Emergency, High, Normal, etc.) you have established for all work orders in Entrata." },
      { name: "Work Order Statuses", description: "Review the statuses that can be assigned to work orders in the system and define the status name for the work order created from the agent." },
      { name: "Locations", description: "Review the Locations and their associated Problems that are available for the agent to select from." },
      { name: "Problems", description: "Review the Problems and the optional Categories available for the agent to select from." },
      { name: "Assignments", description: "Establish any automatic assignment of work orders upon creation." },
    ]},
  ],
  "Renewal AI": [
    { id: "property", label: "Property Info", settings: [
      { name: "Primary Address", description: "The property's physical address used in renewal communications." },
      { name: "Contact Points", description: "Renewal AI handles resident communication directly, but you may still want to configure renewal contact points in Entrata for deterministic notifications such as offer generated, accepted, or lease approved emails.", link: "https://DOMAIN.entrata.com/?module=properties_setupxxx&load_large_dialog=/%3Fmodule%3Dproperty_communication_contact_points_renewals_and_lease_modificationsxxx%26property%5Bid%5D%3DPROPERTYID%26" },
      { name: "ELI+ Dashboard Permissions", description: "Permission users who directly manage the ELI+ console for this property." },
    ]},
    { id: "marketing", label: "Marketing", settings: [
      { name: "Prospect Portal", description: "Configure the prospect-facing portal used for this property." },
      { name: "Property Policies", description: "Review and update the property policies displayed to residents during renewal interactions.", link: "https://DOMAIN.entrata.com/?module=properties_setupxxx&load_large_dialog=%3Fmodule%3Dproperty_details_general_policiesxxx%26property%5Bid%5D%3DPROPERTYID%26" },
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
  type:
    | "instruction"
    | "tool_call"
    | "knowledge"
    | "reasoning"
    | "response"
    | "mcp_tool"
    | "http_api"
    | "prompt_citation";
  label: string;
  detail?: string;
  durationMs: number;
  status?: "success" | "error" | "warning";
  /** MCP tool name as registered on the gateway (e.g. entrata.renewals.getLeaseSnapshot). */
  mcpToolName?: string;
  /** Full MCP JSON-RPC style request payload (prototype demo). */
  mcpRequestJson?: string;
  /** Full MCP JSON-RPC style response payload (prototype demo). */
  mcpResponseJson?: string;
  /** HTTP-style trace when the host still calls REST instead of MCP. */
  httpMethod?: string;
  httpPath?: string;
  httpRequestHeaders?: string;
  httpRequestBody?: string;
  httpResponseStatus?: number;
  httpResponseHeaders?: string;
  httpResponseBody?: string;
  /** Agent chain-of-thought: how tool outputs + policy led to the visible reply. */
  thoughtProcess?: string;
  /** Label for where the excerpt came from (system prompt block, SOP, etc.). */
  promptSourceLabel?: string;
  /** Verbatim or near-verbatim excerpt from the agent prompt / policy pack. */
  promptExcerpt?: string;
};

type ConversationMessage = {
  role: "resident" | "agent";
  text: string;
  timestamp: string;
  /** Per-reply trace (L4 conversational agents — one trace per agent message). */
  trace?: TraceStep[];
};

type ConversationChannel = "SMS" | "Chat" | "Email" | "Voice";

type ConversationLog = {
  id: string;
  residentName: string;
  channel: ConversationChannel;
  topic: string;
  summary: string;
  outcome: "resolved" | "escalated" | "pending";
  sentiment: "positive" | "neutral" | "negative";
  startedAt: string;
  /** Days back from "today" for date-range filtering. 0 = today, 1 = yesterday, etc. */
  daysAgo: number;
  duration: string;
  turns: number;
  messages: ConversationMessage[];
  /** Whole-conversation trace (legacy). L4 agents use `messages[].trace` per agent reply instead. */
  trace: TraceStep[];
  monitors: { label: string; passed: boolean }[];
};

const CONVERSATION_CHANNELS: ConversationChannel[] = ["Chat", "SMS", "Voice", "Email"];

function conversationChannelIcon(channel: ConversationChannel) {
  if (channel === "SMS") return <Phone className="h-2.5 w-2.5" />;
  if (channel === "Email") return <Mail className="h-2.5 w-2.5" />;
  if (channel === "Voice") return <Volume2 className="h-2.5 w-2.5" />;
  return <MessageSquare className="h-2.5 w-2.5" />;
}

const L4_AGENTS_PER_REPLY_TRACE = new Set(["Leasing AI", "Payments AI", "Maintenance AI", "Renewal AI"]);

function countLogTraceSteps(log: ConversationLog, agentName: string): number {
  if (L4_AGENTS_PER_REPLY_TRACE.has(agentName)) {
    return log.messages.reduce((sum, m) => sum + (m.role === "agent" ? (m.trace?.length ?? 0) : 0), 0);
  }
  return log.trace.length;
}

function TracePayloadBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-2 rounded-md border border-border bg-muted/60">
      <p className="border-b border-border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <pre className="max-h-44 overflow-auto whitespace-pre-wrap break-words p-2 font-mono text-[10px] leading-snug text-foreground">{body}</pre>
    </div>
  );
}

function AgentTraceTimeline({ trace }: { trace: TraceStep[] }) {
  const totalTraceMs = trace.reduce((sum, s) => sum + s.durationMs, 0);
  const traceIcon = (type: TraceStep["type"]) => {
    if (type === "mcp_tool") return <Box className="h-3 w-3" />;
    if (type === "http_api") return <Globe className="h-3 w-3" />;
    if (type === "prompt_citation") return <BookOpen className="h-3 w-3" />;
    if (type === "tool_call") return <Wrench className="h-3 w-3" />;
    if (type === "knowledge") return <Database className="h-3 w-3" />;
    if (type === "reasoning") return <Lightbulb className="h-3 w-3" />;
    if (type === "response") return <MessageSquare className="h-3 w-3" />;
    return <Cog className="h-3 w-3" />;
  };
  const iconRing = (step: TraceStep) => {
    if (step.type === "mcp_tool") return "bg-sky-50 text-sky-700";
    if (step.type === "http_api") return "bg-cyan-50 text-cyan-700";
    if (step.type === "prompt_citation") return "bg-violet-50 text-violet-700";
    if (step.type === "tool_call") return "bg-blue-50 text-blue-600";
    if (step.type === "knowledge") return "bg-purple-50 text-purple-600";
    if (step.type === "reasoning") return "bg-amber-50 text-amber-600";
    if (step.type === "response") return "bg-emerald-50 text-emerald-600";
    return "bg-zinc-100 text-zinc-500";
  };
  return (
    <div className="space-y-0">
      {trace.map((step, i) => (
        <div key={i} className="flex gap-3 pb-4 last:pb-0">
          <div className="flex flex-col items-center">
            <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${iconRing(step)}`}>{traceIcon(step.type)}</div>
            {i < trace.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium text-foreground">{step.label}</p>
              {step.mcpToolName && (
                <span className="rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 font-mono text-[9px] font-medium text-sky-800">{step.mcpToolName}</span>
              )}
              <span className="text-[10px] text-muted-foreground">{step.durationMs}ms</span>
              {step.status && (
                <span className="text-[9px] font-medium uppercase text-muted-foreground">{step.status}</span>
              )}
            </div>
            {step.detail && <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{step.detail}</p>}

            {step.promptSourceLabel && step.promptExcerpt && (
              <div className="mt-2 rounded-md border border-violet-200 bg-violet-50/50 p-2">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-violet-800">{step.promptSourceLabel}</p>
                <blockquote className="mt-1 border-l-2 border-violet-400 pl-2 text-[11px] italic leading-relaxed text-foreground">{step.promptExcerpt}</blockquote>
              </div>
            )}

            {step.thoughtProcess && (
              <div className="mt-2 rounded-md border border-amber-200 bg-amber-50/40 p-2">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-amber-900">Agent thought process</p>
                <p className="mt-1 text-[11px] leading-relaxed text-foreground whitespace-pre-wrap">{step.thoughtProcess}</p>
              </div>
            )}

            {(step.type === "mcp_tool" || step.mcpRequestJson || step.mcpResponseJson) && (step.mcpRequestJson || step.mcpResponseJson) ? (
              <div className="mt-1 space-y-2">
                {step.mcpRequestJson ? <TracePayloadBlock title="MCP request (full)" body={step.mcpRequestJson} /> : null}
                {step.mcpResponseJson ? <TracePayloadBlock title="MCP response (full)" body={step.mcpResponseJson} /> : null}
              </div>
            ) : null}

            {step.type === "http_api" || step.httpMethod || step.httpResponseBody ? (
              <div className="mt-1 space-y-2">
                {step.httpMethod && step.httpPath ? (
                  <p className="mt-1 font-mono text-[10px] text-foreground">
                    {step.httpMethod} {step.httpPath}
                    {step.httpResponseStatus != null ? <span className="ml-2 text-muted-foreground">→ {step.httpResponseStatus}</span> : null}
                  </p>
                ) : null}
                {step.httpRequestHeaders ? <TracePayloadBlock title="HTTP request headers" body={step.httpRequestHeaders} /> : null}
                {step.httpRequestBody ? <TracePayloadBlock title="HTTP request body" body={step.httpRequestBody} /> : null}
                {step.httpResponseHeaders ? <TracePayloadBlock title="HTTP response headers" body={step.httpResponseHeaders} /> : null}
                {step.httpResponseBody ? <TracePayloadBlock title="HTTP response body" body={step.httpResponseBody} /> : null}
              </div>
            ) : null}
          </div>
        </div>
      ))}
      <div className="mt-3 flex justify-between border-t border-border pt-3 text-[10px] text-muted-foreground">
        <span>Total trace time</span>
        <span className="font-medium text-foreground">{totalTraceMs}ms</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   User-friendly trace — plain-language, grouped view for non-Entrata
   users. No payloads, schemas, durations, status codes, or the term
   "MCP". Just the phases of how the answer was built.
   ───────────────────────────────────────────────────────────────────── */

function sanitizeFriendly(text: string): string {
  return text
    .replace(/\bMCP\s+(tool\s+call|call|lease snapshot|ledger summary|response|request|tools?)/gi, (_m, g) => g)
    .replace(/\b(via|over|through)\s+MCP\b/gi, "")
    .replace(/\bduring\s+(the\s+)?MCP\s+cutover\b/gi, "")
    .replace(/\bmirrored to REST(\s+for parity)?\b/gi, "logged for parity")
    .replace(/\bMCP\b/gi, "the system")
    .replace(/\bREST\b/gi, "the system")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;])/g, "$1")
    .trim();
}

function friendlyTraceSource(step: TraceStep): string {
  if (step.type === "knowledge") return "Property knowledge base";
  const key = `${step.mcpToolName ?? ""} ${step.label ?? ""}`.toLowerCase();
  const map: { match: string; label: string }[] = [
    { match: "getleasesnapshot", label: "Your lease & renewal terms" },
    { match: "loyalty", label: "Loyalty pricing eligibility" },
    { match: "getcomparables", label: "Market & comparable rents" },
    { match: "market.", label: "Market data" },
    { match: "renewals.", label: "Renewal records" },
    { match: "knowledge.search", label: "Property knowledge base" },
    { match: "createescalation", label: "Staff escalation" },
    { match: "escalation", label: "Staff escalation" },
    { match: "billing", label: "Billing & payment records" },
    { match: "payment", label: "Payment records" },
    { match: "screening", label: "Screening & qualification rules" },
    { match: "tour", label: "Tour scheduling" },
    { match: "amenit", label: "Amenity details" },
    { match: "parking", label: "Parking availability" },
    { match: "petpolicy", label: "Pet policy" },
    { match: "policy", label: "Property policies" },
    { match: "inventory", label: "Unit availability" },
    { match: "furnished", label: "Unit availability" },
    { match: "schooldistrict", label: "Local school district info" },
    { match: "movein", label: "Move-in scheduling" },
    { match: "pricing", label: "Pricing & term options" },
    { match: "term", label: "Lease term options" },
  ];
  for (const m of map) if (key.includes(m.match)) return m.label;
  const seg = (step.mcpToolName ?? "").split(".").pop() ?? "";
  const humanized = seg
    .replace(/^(get|create|evaluate|check|lookup|adjust|start|send|open|refund)/i, "")
    .replace(/([A-Z])/g, " $1")
    .trim();
  return humanized ? humanized.charAt(0).toUpperCase() + humanized.slice(1) : "Information lookup";
}

function FriendlyTraceSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-white">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">{icon}</span>
        <h5 className="text-xs font-semibold text-foreground">{title}</h5>
      </div>
      <div className="divide-y divide-border/60">{children}</div>
    </div>
  );
}

function FriendlyTraceView({ trace, agentName }: { trace: TraceStep[]; agentName: string }) {
  const guidelines = trace.filter((s) => s.type === "instruction" || s.type === "prompt_citation");
  // Exclude legacy/shadow REST parity calls — technical artifacts, not sources.
  const lookups = trace.filter(
    (s) =>
      s.type === "mcp_tool" ||
      s.type === "tool_call" ||
      s.type === "knowledge" ||
      (s.type === "http_api" && !/legacy|shadow/i.test(s.label))
  );
  const reasoning = trace.filter((s) => s.type === "reasoning");
  const hasResponse = trace.some((s) => s.type === "response");

  const seenSources = new Set<string>();
  const friendlyLookups = lookups
    .map((s) => ({ source: friendlyTraceSource(s), detail: s.detail ? sanitizeFriendly(s.detail) : undefined }))
    .filter((l) => {
      if (seenSources.has(l.source)) return false;
      seenSources.add(l.source);
      return true;
    });

  const firstSentence = (text: string) => {
    const trimmed = sanitizeFriendly(text).trim();
    const match = trimmed.match(/^.*?[.!?](\s|$)/);
    const sentence = match ? match[0].trim() : trimmed;
    const capped = sentence.replace(/^([a-z])/, (c) => c.toUpperCase());
    return capped.length > 220 ? `${capped.slice(0, 217)}…` : capped;
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        A plain-language summary of how {agentName} built this reply. Technical details are available in the
        Entrata Internal view.
      </p>

      {guidelines.length > 0 && (
        <FriendlyTraceSection icon={<BookOpen className="h-3 w-3" />} title="Guidelines it followed">
          {guidelines.map((s, i) => (
            <div key={i} className="px-3 py-2.5">
              <p className="text-xs font-medium text-foreground">
                {(s.promptSourceLabel ?? s.label).replace(/\s*·.*$/, "")}
              </p>
              {s.promptExcerpt && (
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{firstSentence(s.promptExcerpt)}</p>
              )}
            </div>
          ))}
        </FriendlyTraceSection>
      )}

      {friendlyLookups.length > 0 && (
        <FriendlyTraceSection icon={<Database className="h-3 w-3" />} title="Information it gathered">
          {friendlyLookups.map((l, i) => (
            <div key={i} className="px-3 py-2.5">
              <p className="text-xs font-medium text-foreground">{l.source}</p>
              {l.detail && <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{l.detail}</p>}
            </div>
          ))}
        </FriendlyTraceSection>
      )}

      {reasoning.length > 0 && (
        <FriendlyTraceSection icon={<Lightbulb className="h-3 w-3" />} title="How it decided what to say">
          {reasoning.map((s, i) => (
            <div key={i} className="px-3 py-2.5">
              <p className="text-[11px] leading-relaxed text-foreground">
                {s.thoughtProcess
                  ? firstSentence(s.thoughtProcess)
                  : "Weighed the information it gathered against the guidelines to compose an accurate, on-brand reply."}
              </p>
            </div>
          ))}
        </FriendlyTraceSection>
      )}

      {hasResponse && (
        <FriendlyTraceSection icon={<MessageSquare className="h-3 w-3" />} title="Reply sent">
          <div className="px-3 py-2.5">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Composed the reply and sent it to the resident.
            </p>
          </div>
        </FriendlyTraceSection>
      )}
    </div>
  );
}

function generateBaseConversationLogs(agentName: string, propertyName: string): ConversationLog[] {
  if (agentName === "Leasing AI") return [
    { id: "conv-l1", residentName: "Sarah Mitchell", channel: "Chat", topic: "Tour Scheduling", summary: "Prospect scheduled a Saturday tour for a 2BR unit.", outcome: "resolved", sentiment: "positive", startedAt: "Today, 2:14 PM", daysAgo: 0, duration: "4m 22s", turns: 6,
      messages: [
        { role: "resident", text: "Hi! I saw your listing for the 2-bedroom on Apartments.com. Do you have any tours available this weekend?", timestamp: "2:14 PM" },
        { role: "agent", text: `Welcome to ${propertyName}! We'd love to show you around. We have availability Saturday at 10am, 1pm, and 3pm. Which works best for you?`, timestamp: "2:14 PM",
          trace: [
            { type: "prompt_citation", label: "Tour slot grounding", durationMs: 6, promptSourceLabel: "System prompt · Leasing AI (guest card v2.1)", promptExcerpt: "Offer tour times only from entrata.tours.getAvailability. Never invent slots. Chat replies: max 3 short paragraphs, one question at the end." },
            { type: "mcp_tool", label: "MCP · entrata.tours.getAvailability", mcpToolName: "entrata.tours.getAvailability", durationMs: 128, status: "success", detail: "Weekend 2BR tour slots for this property.", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-ls-101\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.tours.getAvailability\",\n    \"arguments\": { \"propertyId\": \"prop-14th-north\", \"bedrooms\": 2, \"window\": \"THIS_WEEKEND\" }\n  }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-ls-101\",\n  \"result\": {\n    \"slots\": [\n      { \"start\": \"2025-05-03T10:00:00-06:00\", \"tourType\": \"GROUP\" },\n      { \"start\": \"2025-05-03T13:00:00-06:00\", \"tourType\": \"GROUP\" },\n      { \"start\": \"2025-05-03T15:00:00-06:00\", \"tourType\": \"GROUP\" }\n    ]\n  }\n}" },
            { type: "http_api", label: "Legacy REST (shadow) · GET /api/tours/summary", durationMs: 34, status: "success", httpMethod: "GET", httpPath: "/api/v2/properties/prop-14th-north/tours/summary?weekend=1", httpResponseStatus: 200, httpResponseBody: "{ \"cached\": true, \"slotCount\": 3 }" },
            { type: "reasoning", label: "Wording", durationMs: 52, thoughtProcess: "MCP returned three Saturday slots in local TZ—surface as 10am / 1pm / 3pm. Prospect asked weekend only; no weekday upsell per prompt." },
            { type: "response", label: "Model · chat reply", durationMs: 86 },
          ],
        },
        { role: "resident", text: "1pm would be perfect! Will I get to see the actual unit?", timestamp: "2:15 PM" },
        { role: "agent", text: "Great — you're confirmed for Saturday at 1:00 PM! You'll tour a model unit that matches the 2BR/2BA layout. Our leasing agent will meet you at the main office. I'll send a confirmation email with directions.", timestamp: "2:15 PM",
          trace: [
            { type: "mcp_tool", label: "MCP · entrata.tours.bookTour", mcpToolName: "entrata.tours.bookTour", durationMs: 156, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-ls-102\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.tours.bookTour\",\n    \"arguments\": {\n      \"propertyId\": \"prop-14th-north\",\n      \"slot\": \"2025-05-03T13:00:00-06:00\",\n      \"prospectEmail\": \"sarah.mitchell@gmail.com\",\n      \"tourType\": \"GROUP\"\n    }\n  }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-ls-102\",\n  \"result\": { \"confirmationId\": \"tour-8aa21\", \"unitShown\": \"MODEL_MATCH_2BR2BA\" }\n}" },
            { type: "mcp_tool", label: "MCP · entrata.comms.sendTransactionalEmail", mcpToolName: "entrata.comms.sendTransactionalEmail", durationMs: 98, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-ls-103\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.comms.sendTransactionalEmail\",\n    \"arguments\": { \"templateId\": \"leasing-tour-confirm\", \"to\": \"sarah.mitchell@gmail.com\", \"mergeFields\": { \"TIME\": \"1:00 PM Saturday\", \"PROPERTY\": \"14th North Parkway\" } }\n  }\n}", mcpResponseJson: "{ \"jsonrpc\": \"2.0\", \"id\": \"mcp-ls-103\", \"result\": { \"queued\": true } }" },
            { type: "prompt_citation", label: "Model vs actual unit", durationMs: 4, promptSourceLabel: "Leasing AI · tour disclosure", promptExcerpt: "If the booked tour is a model, say so explicitly and name the layout match (e.g. 2BR/2BA); never claim it is the exact listed unit unless inventory tool confirms it." },
            { type: "reasoning", label: "Copy", durationMs: 44, thoughtProcess: "bookTour returned MODEL_MATCH_2BR2BA—reply must disclose model tour, not actual unit, per disclosure pack." },
            { type: "response", label: "Model · confirmation", durationMs: 91 },
          ],
        },
        { role: "resident", text: "Awesome, thank you! One more thing — do you allow dogs?", timestamp: "2:16 PM" },
        { role: "agent", text: "Yes! We're pet-friendly. Dogs are welcome with a $300 refundable deposit and $25/month pet rent. There is a 50 lb weight limit and some breed restrictions. I can email you the full policy if you'd like!", timestamp: "2:16 PM",
          trace: [
            { type: "mcp_tool", label: "MCP · entrata.policy.getPetPolicy", mcpToolName: "entrata.policy.getPetPolicy", durationMs: 112, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-ls-104\",\n  \"method\": \"tools/call\",\n  \"params\": { \"name\": \"entrata.policy.getPetPolicy\", \"arguments\": { \"propertyId\": \"prop-14th-north\" } }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-ls-104\",\n  \"result\": {\n    \"dogsAllowed\": true,\n    \"deposit\": 300,\n    \"depositRefundable\": true,\n    \"monthlyPetRent\": 25,\n    \"weightLimitLb\": 50,\n    \"breedRestrictions\": [\"AGGRESSIVE_BREED_LIST_V3\"]\n  }\n}" },
            { type: "reasoning", label: "Numbers in reply", durationMs: 38, thoughtProcess: "All dollar amounts and limits come straight from MCP JSON; offer full policy PDF via email to avoid SMS-length breed list." },
            { type: "response", label: "Model · pet policy", durationMs: 74 },
          ],
        },
      ],
      trace: [],
      monitors: [{ label: "Coherent response", passed: true }, { label: "Factually grounded", passed: true }, { label: "Positive sentiment", passed: true }, { label: "No repetition", passed: true }],
    },
    { id: "conv-l2", residentName: "David Park", channel: "SMS", topic: "Pricing Inquiry", summary: "Prospect asked about 1BR pricing. Sent floor plans. No tour scheduled yet.", outcome: "pending", sentiment: "neutral", startedAt: "Today, 11:43 AM", daysAgo: 0, duration: "2m 10s", turns: 4,
      messages: [
        { role: "resident", text: "Hey, what's the price for a 1 bedroom?", timestamp: "11:43 AM" },
        { role: "agent", text: `Thanks for reaching out about ${propertyName}! Our 1BR units start at $1,350/mo for the standard layout and $1,475/mo for the upgraded finish package. We're currently offering $500 off the first month. Want me to send you floor plans?`, timestamp: "11:43 AM",
          trace: [
            { type: "mcp_tool", label: "MCP · entrata.pricing.getUnitBands", mcpToolName: "entrata.pricing.getUnitBands", durationMs: 142, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-ls-201\",\n  \"method\": \"tools/call\",\n  \"params\": { \"name\": \"entrata.pricing.getUnitBands\", \"arguments\": { \"propertyId\": \"prop-rails-main\", \"bedrooms\": 1 } }\n}", mcpResponseJson: "{ \"jsonrpc\": \"2.0\", \"result\": { \"standardFrom\": 1350, \"upgradedFrom\": 1475, \"currency\": \"USD\" } }" },
            { type: "mcp_tool", label: "MCP · entrata.specials.getActive", mcpToolName: "entrata.specials.getActive", durationMs: 101, status: "success", mcpRequestJson: "{}", mcpResponseJson: "{ \"result\": { \"concessions\": [ { \"type\": \"FIRST_MONTH\", \"amount\": 500 } ] } }" },
            { type: "reasoning", label: "SMS brevity", durationMs: 36, thoughtProcess: "Two price anchors + one special; end with single yes/no question for SMS length." },
            { type: "response", label: "Model · pricing SMS", durationMs: 88 },
          ],
        },
        { role: "resident", text: "Yeah send them over", timestamp: "11:44 AM" },
        { role: "agent", text: "Done! I just sent the 1BR floor plans and pricing to your email. Let me know when you'd like to schedule a tour — we have availability all week!", timestamp: "11:44 AM",
          trace: [
            { type: "mcp_tool", label: "MCP · entrata.comms.sendFloorPlans", mcpToolName: "entrata.comms.sendFloorPlans", durationMs: 128, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-ls-202\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.comms.sendFloorPlans\",\n    \"arguments\": { \"prospectPhone\": \"+15551234567\", \"layout\": \"1BR\", \"propertyId\": \"prop-rails-main\" }\n  }\n}", mcpResponseJson: "{ \"jsonrpc\": \"2.0\", \"result\": { \"sent\": true, \"messageId\": \"msg-sms-901\" } }" },
            { type: "http_api", label: "Legacy · POST /api/marketing/attach-pdf", durationMs: 41, status: "success", httpMethod: "POST", httpPath: "/api/marketing/attach-pdf", httpResponseStatus: 200, httpResponseBody: "{ \"bytes\": 842102 }" },
            { type: "response", label: "Model · follow-up CTA", durationMs: 72 },
          ],
        },
      ],
      trace: [],
      monitors: [{ label: "Coherent response", passed: true }, { label: "Factually grounded", passed: true }, { label: "Positive sentiment", passed: true }, { label: "No repetition", passed: true }],
    },
    { id: "conv-l3", residentName: "Maria Gonzalez", channel: "Chat", topic: "Application Questions", summary: "Prospect had questions about income requirements. Escalated to leasing manager due to Section 8 voucher.", outcome: "escalated", sentiment: "neutral", startedAt: "Yesterday, 4:30 PM", daysAgo: 1, duration: "6m 15s", turns: 8,
      messages: [
        { role: "resident", text: "I want to apply but I have a Section 8 voucher. Do you accept those?", timestamp: "4:30 PM" },
        { role: "agent", text: `Great question! ${propertyName} does accept Section 8 Housing Choice Vouchers. The process is slightly different from a standard application — let me connect you with our leasing manager who can walk you through the specific requirements and timeline.`, timestamp: "4:31 PM",
          trace: [
            { type: "mcp_tool", label: "MCP · entrata.compliance.getSubsidyPolicy", mcpToolName: "entrata.compliance.getSubsidyPolicy", durationMs: 118, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-ls-301\",\n  \"method\": \"tools/call\",\n  \"params\": { \"name\": \"entrata.compliance.getSubsidyPolicy\", \"arguments\": { \"propertyId\": \"prop-ivy-gate\", \"program\": \"HCV\" } }\n}", mcpResponseJson: "{ \"jsonrpc\": \"2.0\", \"result\": { \"hcvAccepted\": true, \"requiresManagerBrief\": true } }" },
            { type: "prompt_citation", label: "Escalation when voucher", durationMs: 5, promptSourceLabel: "Leasing AI · affordable / voucher SOP", promptExcerpt: "When HCV or project-based voucher is mentioned and property accepts subsidies, do not quote income math in chat—offer manager handoff and log intent." },
            { type: "reasoning", label: "No DIY income rules", durationMs: 49, thoughtProcess: "MCP says HCV accepted but requiresManagerBrief—reply confirms acceptance and routes to human without improvising income thresholds." },
            { type: "response", label: "Model · handoff intro", durationMs: 81 },
          ],
        },
        { role: "resident", text: "Okay, how long does that usually take?", timestamp: "4:31 PM" },
        { role: "agent", text: "The Section 8 approval process typically takes 2-4 weeks after your housing authority completes their inspection. Our leasing manager, Jennifer, will be able to give you a more specific timeline. I'm transferring you now — she'll reach out within the hour.", timestamp: "4:32 PM",
          trace: [
            { type: "mcp_tool", label: "MCP · entrata.crm.createEscalation", mcpToolName: "entrata.crm.createEscalation", durationMs: 134, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-ls-302\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.crm.createEscalation\",\n    \"arguments\": {\n      \"propertyId\": \"prop-ivy-gate\",\n      \"assignee\": \"jennifer.torres@example.com\",\n      \"topic\": \"HCV_APPLICATION\",\n      \"slaMinutes\": 60\n    }\n  }\n}", mcpResponseJson: "{ \"jsonrpc\": \"2.0\", \"result\": { \"ticketId\": \"esc-4412\", \"status\": \"OPEN\" } }" },
            { type: "knowledge", label: "KB · HCV timeline band", durationMs: 62, detail: "Default messaging: 2–4 weeks post HA inspection when property has no custom SLA text." },
            { type: "reasoning", label: "SLA promise", durationMs: 41, thoughtProcess: "Escalation SLA is 60 minutes from MCP—surface as 'within the hour' to match without overpromising minutes." },
            { type: "response", label: "Model · timeline + transfer", durationMs: 77 },
          ],
        },
      ],
      trace: [],
      monitors: [{ label: "Coherent response", passed: true }, { label: "Factually grounded", passed: true }, { label: "Positive sentiment", passed: true }, { label: "Appropriate escalation", passed: true }],
    },
  ];

  if (agentName === "Payments AI") return [
    { id: "conv-p1", residentName: "James Wilson", channel: "SMS", topic: "Late Rent Follow-Up", summary: "Resident paid after receiving reminder. Payment confirmed.", outcome: "resolved", sentiment: "neutral", startedAt: "Today, 10:08 AM", daysAgo: 0, duration: "3m 45s", turns: 6,
      messages: [
        { role: "agent", text: `Hi James, this is a friendly reminder from ${propertyName} that your rent payment of $1,650 was due on the 3rd. Your current balance is $1,650. Would you like a link to make a payment?`, timestamp: "10:08 AM",
          trace: [
            { type: "prompt_citation", label: "Payment reminder tone", durationMs: 5, promptSourceLabel: "System prompt · Payments AI", promptExcerpt: "Balances and due dates must come from ledger tools only. Keep reminders neutral—no shaming language. Offer one-tap pay link when channel is SMS." },
            { type: "mcp_tool", label: "MCP · entrata.ledger.getBalance", mcpToolName: "entrata.ledger.getBalance", durationMs: 154, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-pay-001\",\n  \"method\": \"tools/call\",\n  \"params\": { \"name\": \"entrata.ledger.getBalance\", \"arguments\": { \"residentId\": \"res-james-wilson\", \"asOf\": \"2025-05-04\" } }\n}", mcpResponseJson: "{ \"jsonrpc\": \"2.0\", \"result\": { \"balance\": 1650, \"currency\": \"USD\", \"dueDate\": \"2025-05-03\" } }" },
            { type: "http_api", label: "Legacy · GET /api/residents/{id}/billing-summary", durationMs: 33, status: "success", httpMethod: "GET", httpPath: "/api/v3/residents/res-james-wilson/billing-summary", httpResponseStatus: 200, httpResponseBody: "{ \"postedRent\": 1650, \"graceUntil\": \"2025-05-05\" }" },
            { type: "reasoning", label: "Proactive cadence", durationMs: 36, thoughtProcess: "Campaign rules triggered day+1 after due with zero payment applied; balance matches both MCP and REST shadow." },
            { type: "response", label: "Model · SMS reminder", durationMs: 79 },
          ],
        },
        { role: "resident", text: "Oh shoot, I forgot. Yes please send the link", timestamp: "10:10 AM" },
        { role: "agent", text: "No worries! Here's your payment link: pay.entrata.com/aspen-heights/jwilson. You can pay by ACH, debit, or credit card. The grace period ends on the 5th, so paying today avoids any late fees.", timestamp: "10:10 AM",
          trace: [
            { type: "mcp_tool", label: "MCP · entrata.payments.createHostedPayLink", mcpToolName: "entrata.payments.createHostedPayLink", durationMs: 121, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-pay-002\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.payments.createHostedPayLink\",\n    \"arguments\": { \"residentId\": \"res-james-wilson\", \"amountDue\": 1650, \"channel\": \"SMS\" }\n  }\n}", mcpResponseJson: "{ \"jsonrpc\": \"2.0\", \"result\": { \"url\": \"https://pay.entrata.com/aspen-heights/jwilson\", \"expiresAt\": \"2025-05-05T23:59:59Z\" } }" },
            { type: "mcp_tool", label: "MCP · entrata.policy.getLateFeeRules", mcpToolName: "entrata.policy.getLateFeeRules", durationMs: 88, status: "success", mcpRequestJson: "{}", mcpResponseJson: "{ \"result\": { \"graceEnd\": \"2025-05-05\", \"feeAfterGrace\": 75 } }" },
            { type: "reasoning", label: "Grace copy", durationMs: 34, thoughtProcess: "Quote grace end from policy tool; do not invent card network fees." },
            { type: "response", label: "Model · pay link SMS", durationMs: 71 },
          ],
        },
        { role: "resident", text: "Just paid. Can you confirm you got it?", timestamp: "10:12 AM" },
        { role: "agent", text: "Payment of $1,650 received and confirmed! Your balance is now $0.00. Thank you, James. Have a great day!", timestamp: "10:12 AM",
          trace: [
            { type: "mcp_tool", label: "MCP · entrata.payments.verifySettlement", mcpToolName: "entrata.payments.verifySettlement", durationMs: 198, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-pay-003\",\n  \"method\": \"tools/call\",\n  \"params\": { \"name\": \"entrata.payments.verifySettlement\", \"arguments\": { \"residentId\": \"res-james-wilson\", \"windowMinutes\": 15 } }\n}", mcpResponseJson: "{ \"jsonrpc\": \"2.0\", \"result\": { \"matchedPayment\": { \"amount\": 1650, \"method\": \"ACH\" }, \"newBalance\": 0 } }" },
            { type: "reasoning", label: "Confirmation safety", durationMs: 28, thoughtProcess: "Only confirm after verifySettlement returns matchedPayment; echo amount and zero balance." },
            { type: "response", label: "Model · receipt tone", durationMs: 62 },
          ],
        },
      ],
      trace: [],
      monitors: [{ label: "Coherent response", passed: true }, { label: "Accurate balance", passed: true }, { label: "Positive sentiment", passed: true }, { label: "No repetition", passed: true }],
    },
    { id: "conv-p2", residentName: "Amy Chen", channel: "Chat", topic: "Payment Plan Request", summary: "Resident approved for 2-installment plan. Agreement sent for signature.", outcome: "resolved", sentiment: "positive", startedAt: "Yesterday, 3:22 PM", daysAgo: 1, duration: "5m 30s", turns: 6,
      messages: [
        { role: "resident", text: "I can't pay my full rent this month. Are payment plans an option?", timestamp: "3:22 PM" },
        { role: "agent", text: "I'm sorry to hear that, Amy. Yes, we do offer payment plans. Based on your account, you're eligible for a 2-installment plan: $825 due by the 5th and $825 by the 20th. Would you like me to set that up?", timestamp: "3:22 PM",
          trace: [
            { type: "mcp_tool", label: "MCP · entrata.paymentPlans.checkEligibility", mcpToolName: "entrata.paymentPlans.checkEligibility", durationMs: 176, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-pay-101\",\n  \"method\": \"tools/call\",\n  \"params\": { \"name\": \"entrata.paymentPlans.checkEligibility\", \"arguments\": { \"residentId\": \"res-amy-chen\" } }\n}", mcpResponseJson: "{ \"jsonrpc\": \"2.0\", \"result\": { \"eligible\": true, \"maxInstallments\": 2, \"historyBand\": \"GOOD\" } }" },
            { type: "mcp_tool", label: "MCP · entrata.ledger.getBalance", mcpToolName: "entrata.ledger.getBalance", durationMs: 91, status: "success", mcpRequestJson: "{}", mcpResponseJson: "{ \"result\": { \"balance\": 1650 } }" },
            { type: "reasoning", label: "Split math", durationMs: 40, thoughtProcess: "Eligible for 2 installments; split 1650/2 = 825; dates from property plan template (5th and 20th)." },
            { type: "response", label: "Model · offer", durationMs: 84 },
          ],
        },
        { role: "resident", text: "Yes please, that would be a huge help.", timestamp: "3:23 PM" },
        { role: "agent", text: "You're all set! I've sent the payment plan agreement to your email at amy.chen@email.com. Please sign it by the 4th and make the first payment of $825 by the 5th. No late fees will apply as long as both payments are on time.", timestamp: "3:24 PM",
          trace: [
            { type: "mcp_tool", label: "MCP · entrata.paymentPlans.createPlan", mcpToolName: "entrata.paymentPlans.createPlan", durationMs: 201, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-pay-102\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.paymentPlans.createPlan\",\n    \"arguments\": {\n      \"residentId\": \"res-amy-chen\",\n      \"installments\": [ { \"due\": \"2025-05-05\", \"amount\": 825 }, { \"due\": \"2025-05-20\", \"amount\": 825 } ],\n      \"waiveLateFeesIfCurrent\": true\n    }\n  }\n}", mcpResponseJson: "{ \"jsonrpc\": \"2.0\", \"result\": { \"planId\": \"pp-8821\", \"agreementDocId\": \"doc-pp-8821\" } }" },
            { type: "mcp_tool", label: "MCP · entrata.comms.sendTransactionalEmail", mcpToolName: "entrata.comms.sendTransactionalEmail", durationMs: 96, status: "success", mcpRequestJson: "{}", mcpResponseJson: "{ \"result\": { \"queued\": true } }" },
            { type: "prompt_citation", label: "Fee waiver wording", durationMs: 3, promptSourceLabel: "Payments AI · plans", promptExcerpt: "State late-fee waiver only when createPlan returns waiveLateFeesIfCurrent true." },
            { type: "response", label: "Model · confirmation", durationMs: 73 },
          ],
        },
      ],
      trace: [],
      monitors: [{ label: "Coherent response", passed: true }, { label: "Policy compliant", passed: true }, { label: "Positive sentiment", passed: true }, { label: "No repetition", passed: true }],
    },
  ];

  if (agentName === "Maintenance AI") return [
    { id: "conv-m1", residentName: "Tom Bradley", channel: "SMS", topic: "Emergency — Kitchen Flooding", summary: "Emergency work order created. On-call tech dispatched within 5 minutes.", outcome: "resolved", sentiment: "positive", startedAt: "Today, 7:45 AM", daysAgo: 0, duration: "8m 10s", turns: 8,
      messages: [
        { role: "resident", text: "HELP my kitchen is flooding!! Water everywhere!!", timestamp: "7:45 AM" },
        { role: "agent", text: "I'm so sorry — let me help right away! This is being flagged as an emergency. First, please locate the shutoff valve under your sink and turn it clockwise to stop the water. I'm dispatching our on-call technician now.", timestamp: "7:45 AM",
          trace: [
            { type: "prompt_citation", label: "Emergency triage", durationMs: 4, promptSourceLabel: "Maintenance AI · water intrusion", promptExcerpt: "For active flooding: (1) instruct safe shutoff, (2) create emergency WO, (3) page on-call—do not troubleshoot beyond shutoff in SMS." },
            { type: "mcp_tool", label: "MCP · entrata.workorders.classifyUrgency", mcpToolName: "entrata.workorders.classifyUrgency", durationMs: 56, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-mnt-001\",\n  \"method\": \"tools/call\",\n  \"params\": { \"name\": \"entrata.workorders.classifyUrgency\", \"arguments\": { \"text\": \"HELP my kitchen is flooding!! Water everywhere!!\" } }\n}", mcpResponseJson: "{ \"jsonrpc\": \"2.0\", \"result\": { \"level\": \"EMERGENCY\", \"category\": \"WATER_ACTIVE\" } }" },
            { type: "mcp_tool", label: "MCP · entrata.workorders.createEmergency", mcpToolName: "entrata.workorders.createEmergency", durationMs: 118, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-mnt-002\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.workorders.createEmergency\",\n    \"arguments\": { \"unitId\": \"u-tom-12b\", \"title\": \"Kitchen flooding\", \"category\": \"WATER_ACTIVE\" }\n  }\n}", mcpResponseJson: "{ \"jsonrpc\": \"2.0\", \"result\": { \"workOrderId\": \"MNT-4892\" } }" },
            { type: "mcp_tool", label: "MCP · entrata.dispatch.pageOnCall", mcpToolName: "entrata.dispatch.pageOnCall", durationMs: 92, status: "success", mcpRequestJson: "{}", mcpResponseJson: "{ \"result\": { \"tech\": \"Marcus Rivera\", \"etaMinutes\": 20 } }" },
            { type: "reasoning", label: "SMS safety order", durationMs: 38, thoughtProcess: "Shutoff first per playbook; then state dispatch without promising arrival second—use ETA from pageOnCall." },
            { type: "response", label: "Model · emergency SMS", durationMs: 81 },
          ],
        },
        { role: "resident", text: "Ok I found it, water is slowing down", timestamp: "7:47 AM" },
        { role: "agent", text: "Great work! Our technician Marcus is on his way — ETA 20 minutes. In the meantime, place towels around the area to contain the water. Work order #MNT-4892 has been created. Marcus will call you when he arrives.", timestamp: "7:47 AM",
          trace: [
            { type: "mcp_tool", label: "MCP · entrata.dispatch.getStatus", mcpToolName: "entrata.dispatch.getStatus", durationMs: 71, status: "success", mcpRequestJson: "{}", mcpResponseJson: "{ \"result\": { \"workOrderId\": \"MNT-4892\", \"assignee\": \"Marcus Rivera\", \"etaMinutes\": 20, \"status\": \"EN_ROUTE\" } }" },
            { type: "http_api", label: "Legacy · POST /api/maintenance/notify-resident", durationMs: 36, status: "success", httpMethod: "POST", httpPath: "/api/maintenance/notify-resident", httpResponseStatus: 204 },
            { type: "response", label: "Model · status update", durationMs: 68 },
          ],
        },
        { role: "resident", text: "He's here now, thank you so much for the fast response!", timestamp: "8:05 AM" },
        { role: "agent", text: "So glad Marcus got there quickly! He'll take it from here. If you need anything else, don't hesitate to reach out. We'll follow up tomorrow to make sure everything is resolved.", timestamp: "8:05 AM",
          trace: [
            { type: "mcp_tool", label: "MCP · entrata.workorders.logResidentUpdate", mcpToolName: "entrata.workorders.logResidentUpdate", durationMs: 64, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-mnt-003\",\n  \"method\": \"tools/call\",\n  \"params\": { \"name\": \"entrata.workorders.logResidentUpdate\", \"arguments\": { \"workOrderId\": \"MNT-4892\", \"note\": \"Tech on site — resident confirmed\" } }\n}", mcpResponseJson: "{ \"jsonrpc\": \"2.0\", \"result\": { \"ok\": true } }" },
            { type: "mcp_tool", label: "MCP · entrata.scheduler.scheduleFollowUp", mcpToolName: "entrata.scheduler.scheduleFollowUp", durationMs: 81, status: "success", mcpRequestJson: "{}", mcpResponseJson: "{ \"result\": { \"when\": \"2025-05-05T09:00:00-06:00\" } }" },
            { type: "reasoning", label: "Closure tone", durationMs: 29, thoughtProcess: "Positive resident signal—acknowledge tech by name, schedule follow-up from tool output." },
            { type: "response", label: "Model · wrap-up", durationMs: 59 },
          ],
        },
      ],
      trace: [],
      monitors: [{ label: "Emergency detected", passed: true }, { label: "Fast response (<30s)", passed: true }, { label: "Tech dispatched", passed: true }, { label: "Follow-up scheduled", passed: true }],
    },
    { id: "conv-m2", residentName: "Lisa Park", channel: "Chat", topic: "AC Not Cooling", summary: "Guided troubleshooting, then created work order for HVAC technician.", outcome: "resolved", sentiment: "neutral", startedAt: "Yesterday, 2:15 PM", daysAgo: 1, duration: "5m 40s", turns: 6,
      messages: [
        { role: "resident", text: "My AC has been running all day but it's still 80 degrees in here. Something is wrong.", timestamp: "2:15 PM" },
        { role: "agent", text: "I'm sorry about that! Let's try a few things first. Can you check if the air filter is clean? It's behind the return vent, usually in the hallway. A dirty filter is the most common cause of cooling issues.", timestamp: "2:15 PM",
          trace: [
            { type: "mcp_tool", label: "MCP · entrata.workorders.classifyUrgency", mcpToolName: "entrata.workorders.classifyUrgency", durationMs: 48, status: "success", mcpRequestJson: "{}", mcpResponseJson: "{ \"result\": { \"level\": \"ROUTINE\", \"category\": \"HVAC_COOLING\" } }" },
            { type: "knowledge", label: "KB · HVAC triage L1", durationMs: 72, detail: "Step 1 filter, step 2 thermostat mode, step 3 schedule tech if unresolved." },
            { type: "reasoning", label: "Non-emergency path", durationMs: 41, thoughtProcess: "No heat-stress keywords for elderly/vulnerable in thread—start with filter check before dispatch." },
            { type: "response", label: "Model · triage chat", durationMs: 86 },
          ],
        },
        { role: "resident", text: "I checked, the filter looks pretty dirty actually", timestamp: "2:17 PM" },
        { role: "agent", text: "That's likely the culprit! We have replacement filters at the leasing office — you can grab one anytime during office hours. If the AC still isn't cooling properly after 2-3 hours with the new filter, let me know and I'll schedule an HVAC tech visit.", timestamp: "2:18 PM",
          trace: [
            { type: "mcp_tool", label: "MCP · entrata.maintenance.logSelfHelp", mcpToolName: "entrata.maintenance.logSelfHelp", durationMs: 69, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-mnt-201\",\n  \"method\": \"tools/call\",\n  \"params\": { \"name\": \"entrata.maintenance.logSelfHelp\", \"arguments\": { \"unitId\": \"u-lisa-4c\", \"step\": \"FILTER_DIRTY\", \"channel\": \"CHAT\" } }\n}", mcpResponseJson: "{ \"jsonrpc\": \"2.0\", \"result\": { \"logged\": true } }" },
            { type: "mcp_tool", label: "MCP · entrata.inventory.getConsumablesLocation", mcpToolName: "entrata.inventory.getConsumablesLocation", durationMs: 58, status: "success", mcpRequestJson: "{}", mcpResponseJson: "{ \"result\": { \"filtersPickup\": \"LEASING_OFFICE\", \"hours\": \"9-6 M-F\" } }" },
            { type: "prompt_citation", label: "When to promise tech", durationMs: 3, promptSourceLabel: "Maintenance AI · HVAC", promptExcerpt: "Offer vendor dispatch only after resident confirms self-help failed or declines—avoid duplicate WO spam." },
            { type: "reasoning", label: "Next step gate", durationMs: 35, thoughtProcess: "Dirty filter confirmed—direct to office stock; conditional tech visit after 2–3h with new filter." },
            { type: "response", label: "Model · guidance", durationMs: 74 },
          ],
        },
      ],
      trace: [],
      monitors: [{ label: "Coherent response", passed: true }, { label: "Followed troubleshooting protocol", passed: true }, { label: "Appropriate triage", passed: true }, { label: "No repetition", passed: true }],
    },
  ];

  if (agentName === "Renewal AI") return [
    { id: "conv-r1", residentName: "Kevin Pham", channel: "Email", topic: "Renewal Offer Accepted", summary: "Resident accepted renewal at $1,695/mo for 14-month term with loyalty adjustment.", outcome: "resolved", sentiment: "positive", startedAt: "Today, 9:30 AM", daysAgo: 0, duration: "12m 5s", turns: 8,
      messages: [
        {
          role: "agent",
          text: "Hi Kevin! Your lease at Aspen Heights is coming up for renewal on September 14. We'd love to have you stay! Here are your options:\n\n• 12-month: $1,725/mo\n• 14-month: $1,695/mo\n• Month-to-month: $1,950/mo\n\nAs a valued 2-year resident, we're also including a complimentary carpet cleaning. Would you like to discuss these options?",
          timestamp: "9:30 AM",
          trace: [
            { type: "prompt_citation", label: "Grounding: renewal voice + disclosure rules", durationMs: 6, promptSourceLabel: "System prompt · Renewal AI (production pack v3.2)", promptExcerpt: "You are Renewal AI for multifamily operators. Always (1) cite current rent and lease end from MCP tools—never invent numbers, (2) present at least two term options when available, (3) include a retention perk only when policy JSON marks the household as eligible, (4) invite dialogue before negotiating, (5) log every MCP tool call id on the trace for audit." },
            { type: "mcp_tool", label: "MCP · entrata.renewals.getLeaseSnapshot", mcpToolName: "entrata.renewals.getLeaseSnapshot", durationMs: 118, status: "success", detail: "Resolved canonical lease + renewal window for Kevin Pham / unit 12-204.", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-7c21-a114\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.renewals.getLeaseSnapshot\",\n    \"arguments\": {\n      \"propertyId\": \"prop-aspen-heights\",\n      \"residentId\": \"res-kevin-pham\",\n      \"includeMarketBands\": true,\n      \"includePerks\": true\n    }\n  }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-7c21-a114\",\n  \"result\": {\n    \"content\": [\n      {\n        \"type\": \"text\",\n        \"text\": {\n          \"leaseId\": \"ls-991204\",\n          \"unit\": \"12-204\",\n          \"currentRent\": 1650,\n          \"currency\": \"USD\",\n          \"leaseEnd\": \"2025-09-14\",\n          \"renewalOfferState\": \"NOT_SENT\",\n          \"eligiblePerks\": [\"COMPLIMENTARY_CARPET_CLEAN\"],\n          \"tenureMonths\": 26,\n          \"ledgerStatus\": \"CURRENT\",\n          \"lastLateFeeDate\": null\n        }\n      }\n    ]\n  }\n}" },
            { type: "mcp_tool", label: "MCP · entrata.market.getComparables", mcpToolName: "entrata.market.getComparables", durationMs: 164, status: "success", detail: "Pulled ILS + internal comps for 2BR in submarket.", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-7c21-a115\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.market.getComparables\",\n    \"arguments\": {\n      \"propertyId\": \"prop-aspen-heights\",\n      \"bedrooms\": 2,\n      \"radiusMiles\": 3,\n      \"asOf\": \"2025-05-04\"\n    }\n  }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-7c21-a115\",\n  \"result\": {\n    \"content\": [\n      {\n        \"type\": \"text\",\n        \"text\": {\n          \"medianAsk\": 1825,\n          \"p25\": 1750,\n          \"p75\": 1900,\n          \"sampleSize\": 38,\n          \"sources\": [\"ILS_AGGREGATE\", \"INTERNAL_LAST_90_LEASES\"]\n        }\n      }\n    ]\n  }\n}" },
            { type: "http_api", label: "Legacy REST (shadow) · POST /api/internal/renewals/pricing-engine", durationMs: 41, status: "success", detail: "Same payload mirrored to REST for parity during MCP cutover.", httpMethod: "POST", httpPath: "/api/internal/renewals/v2/pricing-engine", httpRequestHeaders: "Authorization: Bearer ***redacted***\nContent-Type: application/json\nX-Idempotency-Key: idem-ren-88421-20250504", httpRequestBody: "{\n  \"leaseId\": \"ls-991204\",\n  \"policyPackId\": \"renewals-default-2025Q2\",\n  \"objectives\": [\"RETENTION\", \"MINIMIZE_DISCOUNT_DEPTH\"],\n  \"constraints\": { \"maxMtmPremiumPct\": 18 }\n}", httpResponseStatus: 200, httpResponseHeaders: "content-type: application/json\ncache-control: no-store", httpResponseBody: "{\n  \"options\": [\n    { \"termMonths\": 12, \"rent\": 1725, \"rationale\": \"BASE_TABLE\" },\n    { \"termMonths\": 14, \"rent\": 1695, \"rationale\": \"TERM_DISCOUNT_BAND_B\" },\n    { \"termMonths\": 1, \"rent\": 1950, \"rationale\": \"MTM_PREMIUM_CAP\" }\n  ],\n  \"perks\": [\"COMPLIMENTARY_CARPET_CLEAN\"],\n  \"traceId\": \"rest-9aa0f1\"\n}" },
            { type: "reasoning", label: "Synthesis · offers + tone", durationMs: 72, thoughtProcess: "MCP lease snapshot locks current rent at $1,650 and end date 2025-09-14—so I must anchor any percentage language to those facts, not to rounded marketing numbers.\n\nComps from entrata.market.getComparables show median ask $1,825 for 2BR, which justifies the 12-mo table rate $1,725 as \"below market\" without sounding defensive.\n\nThe REST shadow response matches MCP-derived options (12 @ 1725, 14 @ 1695, MTM @ 1950). Per system prompt §4, I present at least two non-MTM options first and keep MTM as a last line because it is a churn vector.\n\nPerk COMPLIMENTARY_CARPET_CLEAN is present in both MCP and REST payloads and tenure is 26 months with CURRENT ledger—so I am allowed to mention the perk explicitly.\n\nI will structure the email with bullets (readability) and end with an open question to invite negotiation rather than pushing immediate acceptance—matching the prompt's \"invite dialogue before negotiating\" clause." },
            { type: "prompt_citation", label: "Applied constraint from prompt", durationMs: 3, promptSourceLabel: "Policy excerpt · Renewal AI pack", promptExcerpt: "When presenting renewal options, always pair each rent with its term length in the same sentence or bullet, and never imply that MTM is the default continuation path." },
            { type: "response", label: "Model · draft email body", durationMs: 112, detail: "Rendered structured offer block + soft CTA; injected perk only because eligibility flags were true in MCP result." },
          ],
        },
        { role: "resident", text: "The increase is more than I expected. Is there any flexibility on the 12-month rate?", timestamp: "9:45 AM" },
        {
          role: "agent",
          text: "I completely understand, Kevin. Since you've been with us for 2 years with a great payment history, I've checked with our renewal team and we can offer a loyalty adjustment of $1,695/mo on the 12-month term — that's only a 2.7% increase vs. the standard 4.5%. The 14-month option at $1,695 is also a great value. What do you think?",
          timestamp: "9:46 AM",
          trace: [
            { type: "prompt_citation", label: "Negotiation stance", durationMs: 4, promptSourceLabel: "System prompt · Renewal AI §6 (pushback)", promptExcerpt: "If the resident challenges rent, (1) acknowledge first, (2) cite tenure + payment history from MCP ledger facts, (3) only then introduce loyalty adjustments that appear in entrata.renewals.evaluateLoyaltyAdjustment, (4) never promise adjustments not returned by that tool." },
            { type: "mcp_tool", label: "MCP · entrata.ledger.getResidentLedgerSummary", mcpToolName: "entrata.ledger.getResidentLedgerSummary", durationMs: 88, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-7c21-b201\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.ledger.getResidentLedgerSummary\",\n    \"arguments\": { \"residentId\": \"res-kevin-pham\", \"windowDays\": 730 }\n  }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-7c21-b201\",\n  \"result\": {\n    \"content\": [{ \"type\": \"text\", \"text\": {\n      \"onTimePaymentsLast24m\": 24,\n      \"nsfCount\": 0,\n      \"avgDaysPastDue\": 0.0,\n      \"riskBand\": \"LOW\"\n    }}]\n  }\n}" },
            { type: "mcp_tool", label: "MCP · entrata.renewals.evaluateLoyaltyAdjustment", mcpToolName: "entrata.renewals.evaluateLoyaltyAdjustment", durationMs: 134, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-7c21-b202\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.renewals.evaluateLoyaltyAdjustment\",\n    \"arguments\": {\n      \"leaseId\": \"ls-991204\",\n      \"requestedTermMonths\": 12,\n      \"tableRent\": 1725,\n      \"residentRiskBand\": \"LOW\",\n      \"tenureMonths\": 26\n    }\n  }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-7c21-b202\",\n  \"result\": {\n    \"content\": [{ \"type\": \"text\", \"text\": {\n      \"approved\": true,\n      \"adjustedRent\": 1695,\n      \"maxApproverLevel\": \"REGIONAL\",\n      \"reasonCodes\": [\"TENURE_GE_24M\", \"LEDGER_CURRENT\", \"RETENTION_TIER_A\"],\n      \"disclosure\": {\n        \"standardYoYPercent\": 4.5,\n        \"effectiveYoYPercent\": 2.7\n      }\n    }}]\n  }\n}" },
            { type: "reasoning", label: "Why this reply wording", durationMs: 81, thoughtProcess: "Resident objected to the 12-mo increase emotionally (\"more than I expected\"). Prompt §6 requires acknowledgement before numbers—so the reply opens with empathy, not with the discount.\n\nMCP ledger summary confirms LOW risk and perfect payment cadence; I reference \"2 years\" and \"great payment history\" because those phrases are directly supported by ledger facts (not flattery).\n\nevaluateLoyaltyAdjustment returned approved=true with adjustedRent 1695 on the 12-mo line. That is the only number I am allowed to quote as a loyalty price; I therefore anchor the 12-mo offer to 1695 and compute YoY vs prior rent 1650 using the disclosure block (4.5% standard vs 2.7% effective) exactly as returned—no hand-wavy percentages.\n\nI also restate the 14-mo option at 1695 because the pricing engine already showed parity; the prompt encourages transparent comparison when two options collapse to the same rent to avoid cherry-picking confusion." },
            { type: "response", label: "Model · generated reply", durationMs: 98, detail: "Mirrored concern, cited tenure+ledger, quoted only MCP-approved rents and disclosed YoY from tool output." },
          ],
        },
        { role: "resident", text: "The 14 month at 1695 sounds good. Let's do that.", timestamp: "10:02 AM" },
        {
          role: "agent",
          text: "Excellent choice! I've prepared your renewal agreement for 14 months at $1,695/mo starting September 15. The agreement has been sent to your email — please review and sign by August 15. The complimentary carpet cleaning will be scheduled after signing. Thank you for staying with us, Kevin!",
          timestamp: "10:02 AM",
          trace: [
            { type: "mcp_tool", label: "MCP · entrata.renewals.lockSelectedOffer", mcpToolName: "entrata.renewals.lockSelectedOffer", durationMs: 61, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-7c21-c301\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.renewals.lockSelectedOffer\",\n    \"arguments\": {\n      \"leaseId\": \"ls-991204\",\n      \"selectedTermMonths\": 14,\n      \"selectedRent\": 1695,\n      \"residentConfirmationText\": \"The 14 month at 1695 sounds good. Let's do that.\"\n    }\n  }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-7c21-c301\",\n  \"result\": {\n    \"content\": [{ \"type\": \"text\", \"text\": {\n      \"lockId\": \"lock-ren-441b\",\n      \"renewalStart\": \"2025-09-15\",\n      \"signBy\": \"2025-08-15\",\n      \"documentTemplateId\": \"tmpl-ren-2025-standard\"\n    }}]\n  }\n}" },
            { type: "mcp_tool", label: "MCP · entrata.documents.generateRenewalAgreement", mcpToolName: "entrata.documents.generateRenewalAgreement", durationMs: 176, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-7c21-c302\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.documents.generateRenewalAgreement\",\n    \"arguments\": {\n      \"lockId\": \"lock-ren-441b\",\n      \"includePerks\": [\"COMPLIMENTARY_CARPET_CLEAN\"]\n    }\n  }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-7c21-c302\",\n  \"result\": {\n    \"content\": [{ \"type\": \"text\", \"text\": {\n      \"documentId\": \"doc-ren-77812\",\n      \"pdfUri\": \"s3://redacted-bucket/renewals/doc-ren-77812.pdf\",\n      \"sha256\": \"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\"\n    }}]\n  }\n}" },
            { type: "mcp_tool", label: "MCP · entrata.comms.sendTransactionalEmail", mcpToolName: "entrata.comms.sendTransactionalEmail", durationMs: 92, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-7c21-c303\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.comms.sendTransactionalEmail\",\n    \"arguments\": {\n      \"templateId\": \"txn-renewal-agreement-ready\",\n      \"to\": \"kevin.pham@email.com\",\n      \"mergeFields\": {\n        \"TERM_MONTHS\": \"14\",\n        \"RENT\": \"1695\",\n        \"START_DATE\": \"2025-09-15\",\n        \"SIGN_BY\": \"2025-08-15\"\n      },\n      \"attachments\": [\"doc-ren-77812\"]\n    }\n  }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-7c21-c303\",\n  \"result\": {\n    \"content\": [{ \"type\": \"text\", \"text\": { \"queued\": true, \"providerMessageId\": \"sg-aa9912\" }}]\n  }\n}" },
            { type: "prompt_citation", label: "Closing obligations", durationMs: 3, promptSourceLabel: "System prompt · Renewal AI §9 (documents)", promptExcerpt: "After a term selection is locked, always restate sign-by date, start date, and any conditional perks tied to signature—using only fields returned by lock + document tools." },
            { type: "reasoning", label: "Final copy decisions", durationMs: 48, thoughtProcess: "lockSelectedOffer returned renewalStart 2025-09-15 and signBy 2025-08-15; I must surface both dates verbatim.\n\nThe resident already verbally accepted 14 months @ 1695; I treat that as sufficient intent to lock, but I still avoid claiming \"signed\"—only \"prepared\" and \"sent\" per truthfulness rules.\n\nCarpet cleaning is conditional on signature per policy pack; the prompt says to mention scheduling after signing, not before.\n\nI end with gratitude to match voice guidelines without adding new financial commitments." },
            { type: "response", label: "Model · confirmation email", durationMs: 86 },
          ],
        },
      ],
      trace: [],
      monitors: [{ label: "Coherent response", passed: true }, { label: "Accurate pricing", passed: true }, { label: "Positive sentiment", passed: true }, { label: "Retention outcome", passed: true }],
    },
    { id: "conv-r2", residentName: "Rachel Adams", channel: "SMS", topic: "Move-Out Notice", summary: "Resident decided to move out. Notice processed, move-out checklist sent.", outcome: "resolved", sentiment: "negative", startedAt: "Yesterday, 11:15 AM", daysAgo: 1, duration: "7m 20s", turns: 6,
      messages: [
        { role: "resident", text: "Hi, I've decided not to renew my lease. What do I need to do?", timestamp: "11:15 AM" },
        {
          role: "agent",
          text: "I'm sorry to hear you'll be leaving, Rachel. To process your move-out, you'll need to submit written 60-day notice (your deadline is July 15). I can start that process for you now. Would you like me to send you the official notice form and move-out checklist?",
          timestamp: "11:15 AM",
          trace: [
            { type: "prompt_citation", label: "Move-out / churn tone", durationMs: 5, promptSourceLabel: "System prompt · Renewal AI §11 (move-out)", promptExcerpt: "When a resident states non-renewal, open with empathy, cite notice rules from MCP legal calendar only, never threaten, and always offer the official notice artifact through entrata.moveout.sendPacket rather than improvising PDF links." },
            { type: "mcp_tool", label: "MCP · entrata.lease.getNoticeRules", mcpToolName: "entrata.lease.getNoticeRules", durationMs: 102, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-8d02-a001\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.lease.getNoticeRules\",\n    \"arguments\": { \"leaseId\": \"ls-aa4412\", \"jurisdiction\": \"US-CO\" }\n  }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-8d02-a001\",\n  \"result\": {\n    \"content\": [{ \"type\": \"text\", \"text\": {\n      \"minWrittenNoticeDays\": 60,\n      \"noticeCalendar\": \"BUSINESS\",\n      \"latestValidNoticeDate\": \"2025-07-15\",\n      \"leaseEnd\": \"2025-09-14\"\n    }}]\n  }\n}" },
            { type: "http_api", label: "Legacy REST (read-only) · GET /api/leases/{id}/calendar", durationMs: 36, status: "success", httpMethod: "GET", httpPath: "/api/v3/leases/ls-aa4412/calendar", httpResponseStatus: 200, httpResponseBody: "{\n  \"leaseEnd\": \"2025-09-14\",\n  \"noticeDeadline\": \"2025-07-15\",\n  \"timezone\": \"America/Denver\"\n}" },
            { type: "reasoning", label: "SMS framing", durationMs: 58, thoughtProcess: "MCP notice rules returned 60-day written notice with latestValidNoticeDate 2025-07-15. I must present that date as the deadline, not \"about two months\".\n\nChannel is SMS—prompt warns against long URLs; I therefore offer to send forms via email rather than pasting links.\n\nI keep empathy in the first sentence because the resident announced churn; the prompt forbids sounding transactional in the opening clause." },
            { type: "response", label: "Model · SMS reply", durationMs: 91 },
          ],
        },
        { role: "resident", text: "Yes please. And when is the move-out inspection?", timestamp: "11:17 AM" },
        {
          role: "agent",
          text: "I've sent the notice form and move-out checklist to your email. The pre-move-out inspection is typically scheduled 2 weeks before your lease end date. We'll contact you in early September to set that up. Is there anything that might change your mind? We may be able to offer adjusted terms.",
          timestamp: "11:18 AM",
          trace: [
            { type: "mcp_tool", label: "MCP · entrata.moveout.sendPacket", mcpToolName: "entrata.moveout.sendPacket", durationMs: 118, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-8d02-b010\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.moveout.sendPacket\",\n    \"arguments\": {\n      \"residentId\": \"res-rachel-adams\",\n      \"packet\": [\"NOTICE_PDF\", \"MOVEOUT_CHECKLIST\"],\n      \"channel\": \"EMAIL\"\n    }\n  }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-8d02-b010\",\n  \"result\": {\n    \"content\": [{ \"type\": \"text\", \"text\": { \"messageId\": \"msg-ff901\", \"delivered\": true }}]\n  }\n}" },
            { type: "mcp_tool", label: "MCP · entrata.ops.getInspectionPolicy", mcpToolName: "entrata.ops.getInspectionPolicy", durationMs: 84, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-8d02-b011\",\n  \"method\": \"tools/call\",\n  \"params\": { \"name\": \"entrata.ops.getInspectionPolicy\", \"arguments\": { \"propertyId\": \"prop-aspen-heights\" } }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-8d02-b011\",\n  \"result\": {\n    \"content\": [{ \"type\": \"text\", \"text\": {\n      \"preMoveInspectionLeadDays\": 14,\n      \"schedulingWindow\": \"BUSINESS_HOURS\",\n      \"contactTemplate\": \"MAINTENANCE_COORDINATOR\"\n    }}]\n  }\n}" },
            { type: "prompt_citation", label: "Retention boundary", durationMs: 3, promptSourceLabel: "System prompt · Renewal AI §11.3", promptExcerpt: "You may ask exactly one soft retention question per move-out thread after logistics are satisfied, and you must not repeat it if the resident declines." },
            { type: "reasoning", label: "Why retention hook is included", durationMs: 55, thoughtProcess: "sendPacket succeeded, so logistics are handled—this satisfies the prompt gate for a single retention probe.\n\nInspection answer is driven strictly by getInspectionPolicy (14 days before lease end) translated into resident-friendly language (\"early September\" relative to Sep 14 end) without inventing a calendar appointment id.\n\nI include the win-back question once, phrased as optional adjusted terms, matching §11.3." },
            { type: "response", label: "Model · SMS reply", durationMs: 94 },
          ],
        },
        { role: "resident", text: "No, I'm relocating for work. Thanks for the info.", timestamp: "11:20 AM" },
        {
          role: "agent",
          text: "Completely understandable! We wish you the best with your move. If anything changes, we're here. I've noted the reason as work relocation. Take care, Rachel!",
          timestamp: "11:20 AM",
          trace: [
            { type: "prompt_citation", label: "Hard stop after explicit reason", durationMs: 2, promptSourceLabel: "System prompt · Renewal AI §11.4", promptExcerpt: "If the resident gives a concrete relocation/employer-driven reason and declines retention, do not run additional save attempts or inventory new offers in the same session." },
            { type: "mcp_tool", label: "MCP · entrata.crm.logExitSurvey", mcpToolName: "entrata.crm.logExitSurvey", durationMs: 76, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-8d02-c020\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.crm.logExitSurvey\",\n    \"arguments\": {\n      \"residentId\": \"res-rachel-adams\",\n      \"primaryReasonCode\": \"RELOCATION_WORK\",\n      \"verbatim\": \"No, I'm relocating for work. Thanks for the info.\"\n    }\n  }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-8d02-c020\",\n  \"result\": {\n    \"content\": [{ \"type\": \"text\", \"text\": { \"crmNoteId\": \"note-aa901\", \"syncedToPMS\": true }}]\n  }\n}" },
            { type: "mcp_tool", label: "MCP · entrata.notify.propertyManager", mcpToolName: "entrata.notify.propertyManager", durationMs: 71, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-8d02-c021\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.notify.propertyManager\",\n    \"arguments\": {\n      \"propertyId\": \"prop-aspen-heights\",\n      \"subject\": \"Move-out intent logged\",\n      \"body\": \"Rachel Adams — reason RELOCATION_WORK — lease ends 2025-09-14\"\n    }\n  }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-8d02-c021\",\n  \"result\": {\n    \"content\": [{ \"type\": \"text\", \"text\": { \"delivered\": true, \"channel\": \"SLACK_DM\" }}]\n  }\n}" },
            { type: "reasoning", label: "Why no second save attempt", durationMs: 41, thoughtProcess: "The resident cited relocation for work and thanked me—this triggers §11.4 hard stop. CRM log captures verbatim text; manager notification is informational only.\n\nI avoid any new financial offer language because that would violate the stop rule even if models sometimes suggest \"one more promo\"." },
            { type: "response", label: "Model · SMS closing", durationMs: 63 },
          ],
        },
      ],
      trace: [],
      monitors: [{ label: "Coherent response", passed: true }, { label: "Retention attempted", passed: true }, { label: "Empathetic tone", passed: true }, { label: "Process followed", passed: true }],
    },
  ];

  return [];
}

/* ─────────────────────────────────────────────────────────────────────
   Additional preloaded conversation logs for the Eli Plus agents.
   These are intentionally lighter than the hand-crafted baseline entries
   above (a short message exchange + a 3-step trace) — their purpose is to
   give the History & Logging list realistic volume so the filter UI can
   be demoed against ~20 rows per agent.
   ───────────────────────────────────────────────────────────────────── */

type QuickLogSpec = {
  id: string;
  residentName: string;
  channel: ConversationChannel;
  topic: string;
  summary: string;
  outcome: ConversationLog["outcome"];
  sentiment: ConversationLog["sentiment"];
  startedAt: string;
  daysAgo: number;
  duration: string;
  turns: number;
  residentText: string;
  agentText: string;
  toolName: string;
  toolHint?: string;
  monitors?: { label: string; passed: boolean }[];
};

function buildQuickLog(spec: QuickLogSpec): ConversationLog {
  const timestamp = spec.startedAt.includes(", ")
    ? spec.startedAt.slice(spec.startedAt.indexOf(", ") + 2)
    : spec.startedAt;
  const requestId = `mcp-${spec.id}-r1`;
  return {
    id: spec.id,
    residentName: spec.residentName,
    channel: spec.channel,
    topic: spec.topic,
    summary: spec.summary,
    outcome: spec.outcome,
    sentiment: spec.sentiment,
    startedAt: spec.startedAt,
    daysAgo: spec.daysAgo,
    duration: spec.duration,
    turns: spec.turns,
    messages: [
      { role: "resident", text: spec.residentText, timestamp },
      {
        role: "agent",
        text: spec.agentText,
        timestamp,
        trace: [
          {
            type: "mcp_tool",
            label: `MCP · ${spec.toolName}`,
            mcpToolName: spec.toolName,
            durationMs: 112,
            status: "success",
            detail: spec.toolHint,
            mcpRequestJson: `{\n  "jsonrpc": "2.0",\n  "id": "${requestId}",\n  "method": "tools/call",\n  "params": { "name": "${spec.toolName}" }\n}`,
            mcpResponseJson: `{\n  "jsonrpc": "2.0",\n  "id": "${requestId}",\n  "result": { "ok": true }\n}`,
          },
          { type: "reasoning", label: "Reply framing", durationMs: 38 },
          { type: "response", label: "Model · reply", durationMs: 72 },
        ],
      },
    ],
    trace: [],
    monitors: spec.monitors ?? [
      { label: "Coherent response", passed: true },
      { label: "Factually grounded", passed: true },
      { label: spec.outcome === "escalated" ? "Appropriate escalation" : "Appropriate tone", passed: true },
      { label: "No repetition", passed: true },
    ],
  };
}

function generateAdditionalConversationLogs(agentName: string, propertyName: string): ConversationLog[] {
  if (agentName === "Leasing AI") {
    return [
      buildQuickLog({ id: "conv-l4", residentName: "Jordan Reyes", channel: "Voice", topic: "Virtual Tour Request", summary: "Prospect requested a self-guided video tour. Sent personalized walkthrough link.", outcome: "resolved", sentiment: "positive", startedAt: "Today, 9:12 AM", daysAgo: 0, duration: "3m 04s", turns: 4, residentText: "Hi, I'm out of state — can I do a virtual tour of the 2-bedroom before I fly in?", agentText: `Absolutely! I just sent you a self-guided video tour for the 2BR at ${propertyName}, plus a Zoom slot for a live walkthrough Thursday at 11am MT if you'd prefer that.`, toolName: "entrata.tours.sendVirtualPacket" }),
      buildQuickLog({ id: "conv-l5", residentName: "Emily Carter", channel: "Email", topic: "Amenity Questions", summary: "Asked about gym hours and co-working space. Sent amenity sheet.", outcome: "resolved", sentiment: "positive", startedAt: "Today, 8:48 AM", daysAgo: 0, duration: "2m 41s", turns: 4, residentText: "What are the gym hours, and is the co-working space free for residents?", agentText: `Our 24/7 fitness center is open round the clock with a key fob, and the co-working space is free for residents weekdays 7am–10pm. I'm attaching the full amenity sheet for ${propertyName}.`, toolName: "entrata.property.getAmenities" }),
      buildQuickLog({ id: "conv-l6", residentName: "Brandon Lee", channel: "Chat", topic: "Parking Availability", summary: "Confirmed covered parking availability and reserved a spot for move-in.", outcome: "resolved", sentiment: "neutral", startedAt: "Today, 7:33 AM", daysAgo: 0, duration: "3m 18s", turns: 5, residentText: "Do you have covered parking? I drive a truck.", agentText: "Yes! Covered parking is $75/month and we have 4 oversized stalls that fit full-size trucks. I held one for your application on file.", toolName: "entrata.parking.getInventory" }),
      buildQuickLog({ id: "conv-l7", residentName: "Olivia Tran", channel: "SMS", topic: "Lease Term Options", summary: "Asked about 9-month lease. Quoted seasonal premium.", outcome: "pending", sentiment: "neutral", startedAt: "Yesterday, 6:55 PM", daysAgo: 1, duration: "1m 52s", turns: 3, residentText: "Do you offer a 9-month lease? Starting in August.", agentText: "Yes — 9-month leases are available at a $125/mo premium over our 12-month rate. The August 1 move-in 1BR comes to $1,475/mo on a 9-month term.", toolName: "entrata.pricing.getTermOptions" }),
      buildQuickLog({ id: "conv-l8", residentName: "Marcus Johnson", channel: "Chat", topic: "Pet Deposit Question", summary: "Clarified deposit for a second pet. Sent pet addendum.", outcome: "resolved", sentiment: "positive", startedAt: "Yesterday, 5:20 PM", daysAgo: 1, duration: "2m 08s", turns: 4, residentText: "I have two cats — is the deposit per pet or just one fee?", agentText: "It's per pet — $200 refundable + $15/mo per pet. Total for two cats is a $400 refundable deposit + $30/mo. I'll email you the pet addendum to review.", toolName: "entrata.policy.getPetPolicy" }),
      buildQuickLog({ id: "conv-l9", residentName: "Hannah Brooks", channel: "Email", topic: "Application Status", summary: "Resident application stalled on income verification — escalated to leasing.", outcome: "escalated", sentiment: "negative", startedAt: "Yesterday, 3:02 PM", daysAgo: 1, duration: "4m 12s", turns: 6, residentText: "It's been 5 days since I uploaded my paystubs and I haven't heard back. Is something wrong?", agentText: "I'm sorry for the delay, Hannah. I'm escalating this directly to our leasing manager Jennifer — she'll personally review your file within the hour and call you with an update.", toolName: "entrata.crm.createEscalation", monitors: [{ label: "Coherent response", passed: true }, { label: "Appropriate escalation", passed: true }, { label: "Empathetic tone", passed: true }, { label: "SLA on file", passed: true }] }),
      buildQuickLog({ id: "conv-l10", residentName: "Ahmed Khan", channel: "Voice", topic: "Move-In Date Flexibility", summary: "Confirmed unit hold for 10-day delayed move-in.", outcome: "resolved", sentiment: "positive", startedAt: "2 days ago, 1:45 PM", daysAgo: 2, duration: "5m 22s", turns: 6, residentText: "I signed yesterday but my movers can't come until the 17th. Is that OK?", agentText: "No problem — your move-in date is updated to August 17th. There's no proration penalty since you're still in the same month. You'll get your fob and key on the 17th.", toolName: "entrata.leasing.adjustMoveInDate" }),
      buildQuickLog({ id: "conv-l11", residentName: "Priya Patel", channel: "Chat", topic: "School District Inquiry", summary: "Looked up school assignments for the property zip. Linked district website.", outcome: "resolved", sentiment: "neutral", startedAt: "2 days ago, 11:11 AM", daysAgo: 2, duration: "2m 30s", turns: 4, residentText: "We have two kids. What elementary school would they go to?", agentText: `${propertyName} is in the Cherry Creek district — Belleview Elementary for K–5. Here's the district's school locator page so you can confirm the boundary.`, toolName: "entrata.knowledge.lookupSchoolDistrict" }),
      buildQuickLog({ id: "conv-l12", residentName: "Tyler Robinson", channel: "SMS", topic: "Income Requirement", summary: "Quoted 3x rent requirement. Prospect to provide co-signer info.", outcome: "pending", sentiment: "neutral", startedAt: "3 days ago, 4:08 PM", daysAgo: 3, duration: "1m 41s", turns: 3, residentText: "What's the income requirement to qualify?", agentText: "We look for 3x the monthly rent in gross household income, or a qualified co-signer if you're under. For a $1,475 unit that's $4,425/mo combined.", toolName: "entrata.screening.getQualifyingRules" }),
      buildQuickLog({ id: "conv-l13", residentName: "Sophia Nguyen", channel: "Chat", topic: "Furnished Options", summary: "Asked about short-term furnished. Out of inventory; offered waitlist.", outcome: "pending", sentiment: "neutral", startedAt: "3 days ago, 2:36 PM", daysAgo: 3, duration: "2m 19s", turns: 4, residentText: "Do you have any furnished short-term units available?", agentText: "We don't have furnished inventory available right now, but I added you to the waitlist and you'll get a notice as soon as one opens up — usually 2–3 per quarter.", toolName: "entrata.inventory.checkFurnished" }),
      buildQuickLog({ id: "conv-l14", residentName: "Devon Wright", channel: "Email", topic: "Holding Deposit Refund", summary: "Application withdrawn before screening. Refund processed.", outcome: "resolved", sentiment: "neutral", startedAt: "4 days ago, 10:24 AM", daysAgo: 4, duration: "3m 50s", turns: 5, residentText: "I changed my mind on the apartment — can I get my holding deposit back?", agentText: "Since we hadn't run screening yet, your $200 holding deposit is fully refundable. I just initiated the refund — you'll see it back on your card in 3–5 business days.", toolName: "entrata.payments.refundHold" }),
      buildQuickLog({ id: "conv-l15", residentName: "Grace Liu", channel: "Voice", topic: "ADA Unit Inquiry", summary: "Confirmed wheelchair-accessible 1BR availability. Booked priority tour.", outcome: "resolved", sentiment: "positive", startedAt: "5 days ago, 1:09 PM", daysAgo: 5, duration: "4m 33s", turns: 5, residentText: "I use a wheelchair — do you have any ground-floor accessible units coming up?", agentText: "Yes! We have an ADA-compliant 1BR opening August 1 with a roll-in shower and lowered counters. I booked you a priority tour for Saturday at 10am with our community manager.", toolName: "entrata.inventory.getAccessibleUnits" }),
      buildQuickLog({ id: "conv-l16", residentName: "Nathan Reed", channel: "Chat", topic: "Roommate Add to Lease", summary: "Walked prospect through roommate qualification flow.", outcome: "pending", sentiment: "neutral", startedAt: "5 days ago, 11:48 AM", daysAgo: 5, duration: "3m 02s", turns: 5, residentText: "My girlfriend wants to be on the lease too. How does that work?", agentText: "She'll fill out a co-applicant form and run the same screening — $50 app fee. Once approved, we add her to the lease via an amendment. I'll email both you the link.", toolName: "entrata.leasing.startCoApplicant" }),
      buildQuickLog({ id: "conv-l17", residentName: "Isabella Romano", channel: "Email", topic: "Application Denied — Appeal", summary: "Soft denial appealed; routed to compliance for review.", outcome: "escalated", sentiment: "negative", startedAt: "6 days ago, 9:30 AM", daysAgo: 6, duration: "6m 47s", turns: 7, residentText: "My application was denied but I think there's a mistake on the credit report it pulled.", agentText: "I hear you. Per our policy I'm escalating this to our compliance team — they'll review the credit dispute and respond within 2 business days with next steps and the adverse action notice.", toolName: "entrata.compliance.openAppeal", monitors: [{ label: "Coherent response", passed: true }, { label: "Appropriate escalation", passed: true }, { label: "Empathetic tone", passed: true }, { label: "Compliance routed", passed: true }] }),
      buildQuickLog({ id: "conv-l18", residentName: "Carlos Mendoza", channel: "SMS", topic: "Application Approved — Next Steps", summary: "Sent move-in checklist and renter's insurance link.", outcome: "resolved", sentiment: "positive", startedAt: "7 days ago, 3:14 PM", daysAgo: 7, duration: "2m 21s", turns: 3, residentText: "Just saw the approval email! What's next?", agentText: "Congrats Carlos! Next: (1) pay the security deposit, (2) e-sign the lease (link sent), (3) bind renter's insurance before move-in. Want me to walk you through any of these?", toolName: "entrata.leasing.getMoveInChecklist" }),
      buildQuickLog({ id: "conv-l19", residentName: "Megan O'Brien", channel: "Chat", topic: "Specials & Concessions", summary: "Quoted current LMC concession. Prospect to confirm tour.", outcome: "pending", sentiment: "positive", startedAt: "9 days ago, 4:51 PM", daysAgo: 9, duration: "2m 12s", turns: 4, residentText: "Any move-in specials right now?", agentText: "Yes! Sign by August 31 and get $750 off your first full month, plus we waive the $250 admin fee. That applies to the 2BR/2BA you looked at.", toolName: "entrata.specials.getActive" }),
      buildQuickLog({ id: "conv-l20", residentName: "Jamal Williams", channel: "Voice", topic: "Tour No-Show Reschedule", summary: "Rescheduled missed tour. Sent calendar invite.", outcome: "resolved", sentiment: "neutral", startedAt: "11 days ago, 12:02 PM", daysAgo: 11, duration: "3m 25s", turns: 4, residentText: "I'm sorry I missed our tour yesterday — can we reschedule?", agentText: "Of course! I have Saturday at 11am or Sunday at 1pm. I'll send the calendar invite as soon as you confirm.", toolName: "entrata.tours.rescheduleTour" }),
    ];
  }

  if (agentName === "Payments AI") {
    return [
      buildQuickLog({ id: "conv-p3", residentName: "Robert Singh", channel: "Chat", topic: "Autopay Setup", summary: "Resident enrolled in monthly ACH autopay on the 3rd.", outcome: "resolved", sentiment: "positive", startedAt: "Today, 11:32 AM", daysAgo: 0, duration: "3m 08s", turns: 5, residentText: "How do I set up autopay so I stop forgetting?", agentText: "Easy — I'll send you a one-tap setup link. You can pick the 1st, 3rd, or 5th of each month and we'll auto-debit from your bank. You can cancel anytime in resident portal.", toolName: "entrata.payments.startAutopayEnrollment" }),
      buildQuickLog({ id: "conv-p4", residentName: "Linda Thompson", channel: "SMS", topic: "Returned ACH", summary: "Resident's ACH bounced. Sent retry link with fee disclosed.", outcome: "pending", sentiment: "neutral", startedAt: "Today, 9:54 AM", daysAgo: 0, duration: "2m 27s", turns: 4, residentText: "I got a notice my payment bounced. What now?", agentText: "Your bank returned the ACH (likely insufficient funds). The total due with the $35 NSF fee is $1,725. Here's a retry link — you can pay by debit or a different bank.", toolName: "entrata.payments.handleNsf" }),
      buildQuickLog({ id: "conv-p5", residentName: "Marcus Davis", channel: "Voice", topic: "Balance Inquiry", summary: "Read out current balance and recent posting.", outcome: "resolved", sentiment: "neutral", startedAt: "Today, 8:19 AM", daysAgo: 0, duration: "1m 42s", turns: 3, residentText: "What's my current balance?", agentText: "Your balance as of today is $0.00 — your $1,650 payment posted yesterday morning. You're all set for August.", toolName: "entrata.ledger.getBalance" }),
      buildQuickLog({ id: "conv-p6", residentName: "Sofia Martinez", channel: "Email", topic: "Receipt Request", summary: "Sent itemized receipt for tax purposes.", outcome: "resolved", sentiment: "positive", startedAt: "Yesterday, 4:08 PM", daysAgo: 1, duration: "2m 03s", turns: 3, residentText: "Can you send me an itemized receipt for all my rent payments this year?", agentText: "Sent! Your 2025 YTD itemized receipt is in your inbox — $11,550 across 7 monthly payments with confirmation numbers and dates.", toolName: "entrata.ledger.exportItemizedReceipt" }),
      buildQuickLog({ id: "conv-p7", residentName: "William Hayes", channel: "SMS", topic: "Late Fee Dispute", summary: "Late fee waived as one-time courtesy; escalation logged.", outcome: "resolved", sentiment: "neutral", startedAt: "Yesterday, 2:35 PM", daysAgo: 1, duration: "3m 51s", turns: 5, residentText: "I paid on the 5th, why was I charged a late fee?", agentText: "I see — the grace period ended at midnight on the 5th and your payment posted at 12:42am on the 6th. As a one-time courtesy I've waived the $75 fee. Your balance is $0.", toolName: "entrata.policy.waiveLateFee" }),
      buildQuickLog({ id: "conv-p8", residentName: "Emma Garcia", channel: "Chat", topic: "Partial Payment", summary: "Logged $500 partial payment intent; reminder set for balance.", outcome: "pending", sentiment: "neutral", startedAt: "2 days ago, 5:14 PM", daysAgo: 2, duration: "2m 47s", turns: 4, residentText: "I can pay $500 now and the rest on Friday. Can I do that?", agentText: "Yes — I'll log a partial payment intent. Pay $500 today and I'll send a reminder Friday for the remaining $1,150 with a one-tap pay link.", toolName: "entrata.payments.logPartialIntent" }),
      buildQuickLog({ id: "conv-p9", residentName: "Anthony Russo", channel: "Voice", topic: "Credit Card Decline", summary: "Card decline; switched to ACH; payment cleared.", outcome: "resolved", sentiment: "neutral", startedAt: "2 days ago, 1:33 PM", daysAgo: 2, duration: "4m 11s", turns: 6, residentText: "My credit card got declined. Can I use a different way?", agentText: "Of course. You can pay by ACH for free, or use a debit card with a 2.95% fee. I'll send the secure payment link to your phone now.", toolName: "entrata.payments.createHostedPayLink" }),
      buildQuickLog({ id: "conv-p10", residentName: "Natalie Foster", channel: "Email", topic: "Move-Out Refund Status", summary: "Sent SODA timeline and current refund status.", outcome: "resolved", sentiment: "positive", startedAt: "3 days ago, 11:20 AM", daysAgo: 3, duration: "2m 56s", turns: 4, residentText: "I moved out 2 weeks ago — when do I get my security deposit back?", agentText: "Per Colorado law we have 60 days from move-out to send the SODA. Your file shows the unit inspected clean, refund of $1,425 is in the queue for processing on August 25.", toolName: "entrata.moveout.getSodaStatus" }),
      buildQuickLog({ id: "conv-p11", residentName: "Christopher Yang", channel: "SMS", topic: "Pet Rent Adjustment", summary: "Removed pet rent after pet rehoming proof received.", outcome: "resolved", sentiment: "neutral", startedAt: "3 days ago, 9:48 AM", daysAgo: 3, duration: "3m 18s", turns: 5, residentText: "I rehomed my cat last month — can you remove the pet rent?", agentText: "I've removed the $15/mo pet rent going forward. I also credited $30 back for the months since you sent confirmation. Your new monthly is $1,620.", toolName: "entrata.ledger.adjustRecurringCharge" }),
      buildQuickLog({ id: "conv-p12", residentName: "Ashley Cooper", channel: "Chat", topic: "Duplicate Payment", summary: "Identified duplicate ACH; refund initiated.", outcome: "resolved", sentiment: "positive", startedAt: "4 days ago, 3:42 PM", daysAgo: 4, duration: "4m 02s", turns: 5, residentText: "I think I paid twice this month by accident!", agentText: "You did — two ACH posts of $1,650. I just initiated a refund of one to your bank on file; it'll clear in 3–5 business days. Account balance is now $0.", toolName: "entrata.payments.refundDuplicate" }),
      buildQuickLog({ id: "conv-p13", residentName: "Daniel Brooks", channel: "Voice", topic: "Roommate Split Pay", summary: "Set up split-pay between three roommates.", outcome: "resolved", sentiment: "neutral", startedAt: "5 days ago, 1:55 PM", daysAgo: 5, duration: "5m 14s", turns: 6, residentText: "Can my two roommates and I split the rent into thirds?", agentText: "Yes — I just enabled Split Pay on the unit. Each of you will get a portal link to pay your $616.67 share. The full rent is collected when all three pay.", toolName: "entrata.payments.enableSplitPay" }),
      buildQuickLog({ id: "conv-p14", residentName: "Victoria Patel", channel: "Email", topic: "Section 8 Portion Question", summary: "Clarified HCV tenant portion vs. HAP portion.", outcome: "resolved", sentiment: "neutral", startedAt: "6 days ago, 10:32 AM", daysAgo: 6, duration: "3m 37s", turns: 4, residentText: "My voucher covers most of my rent but I'm confused what I actually owe.", agentText: "Your HCV covers $1,150 monthly (paid by the housing authority). Your tenant portion is $385/mo, due on the 1st. The autopay link below is set to that amount.", toolName: "entrata.affordable.getTenantPortion" }),
      buildQuickLog({ id: "conv-p15", residentName: "Brandon Schwartz", channel: "SMS", topic: "Eviction Warning Push-Back", summary: "Resident upset about pre-eviction notice — escalated to property manager.", outcome: "escalated", sentiment: "negative", startedAt: "6 days ago, 8:14 AM", daysAgo: 6, duration: "5m 22s", turns: 6, residentText: "Why am I getting eviction papers?? I told you I'd pay!", agentText: "I hear you Brandon, and I'm sorry this is stressful. I'm pulling our property manager Sarah in directly — she'll call you within the hour to walk through options before anything moves forward.", toolName: "entrata.collections.escalateToManager", monitors: [{ label: "Empathetic tone", passed: true }, { label: "Appropriate escalation", passed: true }, { label: "Manager paged", passed: true }, { label: "De-escalation attempted", passed: true }] }),
      buildQuickLog({ id: "conv-p16", residentName: "Erica Goldberg", channel: "Chat", topic: "Concession Question", summary: "Resident asked why concession was clawed back — explained 12-month minimum.", outcome: "resolved", sentiment: "neutral", startedAt: "7 days ago, 11:18 AM", daysAgo: 7, duration: "3m 49s", turns: 5, residentText: "My first month said $0 rent but now I'm being charged for it?", agentText: "Per your lease, the 1-month concession is amortized over the 12-month term. If you stay the full lease, you net the savings. The line item shows the monthly contra-credit.", toolName: "entrata.leasing.getConcessionTerms" }),
      buildQuickLog({ id: "conv-p17", residentName: "Jonathan Kim", channel: "Voice", topic: "Payment Plan — Rejected", summary: "Resident requested plan; outside grace policy; escalated.", outcome: "escalated", sentiment: "negative", startedAt: "8 days ago, 2:55 PM", daysAgo: 8, duration: "4m 32s", turns: 6, residentText: "Can I split my rent over the next 60 days?", agentText: "I can't approve a 60-day plan automatically — our policy caps at 30 days. I'll route this to our community manager who can review options based on your account history.", toolName: "entrata.collections.routePlanRequest", monitors: [{ label: "Coherent response", passed: true }, { label: "Appropriate escalation", passed: true }, { label: "Policy boundaries respected", passed: true }, { label: "Empathetic tone", passed: true }] }),
      buildQuickLog({ id: "conv-p18", residentName: "Mia Singh", channel: "Email", topic: "Renters Insurance Lapse", summary: "Resident notified of insurance lapse; reinstatement link sent.", outcome: "pending", sentiment: "neutral", startedAt: "9 days ago, 4:18 PM", daysAgo: 9, duration: "2m 41s", turns: 4, residentText: "I got a notice that my renters insurance lapsed — what do I need to do?", agentText: "Your Lemonade policy expired last week. You can either reinstate with them or use our partner program for $12/mo. Either way you'll need active coverage on file by next Friday.", toolName: "entrata.compliance.getInsuranceStatus" }),
      buildQuickLog({ id: "conv-p19", residentName: "Hunter Wallace", channel: "SMS", topic: "Late Payment — Resolved", summary: "Resident paid + late fee. Account current.", outcome: "resolved", sentiment: "neutral", startedAt: "10 days ago, 9:50 AM", daysAgo: 10, duration: "2m 14s", turns: 4, residentText: "Sorry, just paying now. Total with the fee?", agentText: "No worries — total due with the $75 late fee is $1,725. Pay link below. Confirmation will hit your phone the moment it posts.", toolName: "entrata.ledger.getBalance" }),
      buildQuickLog({ id: "conv-p20", residentName: "Lauren Sato", channel: "Chat", topic: "Direct Deposit For Refund", summary: "Confirmed bank account on file for SODA refund.", outcome: "resolved", sentiment: "positive", startedAt: "12 days ago, 1:30 PM", daysAgo: 12, duration: "1m 58s", turns: 3, residentText: "Can my deposit refund go to the same bank I autopay from?", agentText: "Yes — we'll send the refund to the same account ending in •1239 you used for autopay. No action needed on your end.", toolName: "entrata.payments.verifyRefundDestination" }),
    ];
  }

  if (agentName === "Maintenance AI") {
    return [
      buildQuickLog({ id: "conv-m3", residentName: "Greg Hamilton", channel: "Chat", topic: "Garbage Disposal Jammed", summary: "Walked resident through reset. Resolved without dispatch.", outcome: "resolved", sentiment: "positive", startedAt: "Today, 12:18 PM", daysAgo: 0, duration: "4m 02s", turns: 6, residentText: "My garbage disposal is making a weird hum and won't turn.", agentText: "Sounds like a jam — find the red reset button on the bottom of the unit, press it firmly. If that doesn't work, the hex key under the sink turns the impeller manually. Let me know if it spins free!", toolName: "entrata.maintenance.getSelfHelpGuide" }),
      buildQuickLog({ id: "conv-m4", residentName: "Rebecca Chen", channel: "Voice", topic: "Smoke Alarm Beeping", summary: "Resolved low-battery beep without dispatch.", outcome: "resolved", sentiment: "neutral", startedAt: "Today, 10:25 AM", daysAgo: 0, duration: "3m 14s", turns: 5, residentText: "My smoke alarm is beeping every 30 seconds and it's driving me crazy.", agentText: "That's the low-battery chirp. The smoke alarm in the bedroom hallway takes a 9V — you should find spares in the welcome kit. If you don't have one, swing by the office and we'll hand you a fresh battery.", toolName: "entrata.maintenance.classifyAlarm" }),
      buildQuickLog({ id: "conv-m5", residentName: "Kyle Anderson", channel: "SMS", topic: "Toilet Won't Stop Running", summary: "Created routine WO. Plumber scheduled for next morning.", outcome: "resolved", sentiment: "neutral", startedAt: "Today, 7:48 AM", daysAgo: 0, duration: "2m 50s", turns: 5, residentText: "Toilet in master bath has been running constantly since last night.", agentText: "Created work order MNT-5102 — flapper replacement. Our plumber Carlos has you scheduled for tomorrow 9–11am. He'll text 20 min before arrival.", toolName: "entrata.workorders.createRoutine" }),
      buildQuickLog({ id: "conv-m6", residentName: "Vanessa Lopez", channel: "Email", topic: "Dishwasher Not Draining", summary: "Diagnosed clogged filter. WO created for tech if self-help fails.", outcome: "pending", sentiment: "neutral", startedAt: "Yesterday, 6:42 PM", daysAgo: 1, duration: "3m 35s", turns: 5, residentText: "My dishwasher won't drain — there's standing water at the bottom.", agentText: "First try cleaning the bottom filter (twist counterclockwise to remove). Run a hot cycle after. If water remains tomorrow, reply STILL and I'll dispatch our appliance tech.", toolName: "entrata.maintenance.getSelfHelpGuide" }),
      buildQuickLog({ id: "conv-m7", residentName: "Jared Mills", channel: "SMS", topic: "Lockout — After Hours", summary: "Verified identity, dispatched on-call locksmith.", outcome: "resolved", sentiment: "positive", startedAt: "Yesterday, 11:14 PM", daysAgo: 1, duration: "4m 21s", turns: 5, residentText: "I'm locked out of my unit. It's almost midnight, help!", agentText: "I confirmed your identity via account info — our on-call locksmith Terry is on the way, ETA 25 min. He'll meet you at the leasing office door. There's a $75 after-hours service charge billed to your ledger.", toolName: "entrata.dispatch.pageLockoutVendor" }),
      buildQuickLog({ id: "conv-m8", residentName: "Catherine Wells", channel: "Chat", topic: "Cockroach Sighting", summary: "Logged pest sighting. Routine pest treatment scheduled.", outcome: "resolved", sentiment: "negative", startedAt: "Yesterday, 5:08 PM", daysAgo: 1, duration: "3m 19s", turns: 5, residentText: "I just saw a roach in my kitchen!! Is this normal??", agentText: "I'm sorry, that's frustrating. I scheduled our pest control vendor Eco-Tech to treat your unit Friday between 1–3pm. They'll also do common areas as a precaution. Please remove all dishes from sinks/counters before.", toolName: "entrata.workorders.schedulePestTreatment", monitors: [{ label: "Empathetic tone", passed: true }, { label: "Vendor dispatched", passed: true }, { label: "Resident prep instructions sent", passed: true }, { label: "No repetition", passed: true }] }),
      buildQuickLog({ id: "conv-m9", residentName: "Trevor Olson", channel: "Voice", topic: "Hot Water Outage — Building", summary: "Building-wide outage; on-call boiler tech en route.", outcome: "resolved", sentiment: "neutral", startedAt: "2 days ago, 6:15 AM", daysAgo: 2, duration: "2m 47s", turns: 4, residentText: "There's no hot water in any of my faucets.", agentText: "We're tracking a hot water outage in building C — boiler tripped overnight. Our boiler tech is on site, ETA to restore: 2 hours. I'll text the whole building once it's back up.", toolName: "entrata.maintenance.getBuildingOutages" }),
      buildQuickLog({ id: "conv-m10", residentName: "Jasmine Patel", channel: "Chat", topic: "Light Fixture Flickering", summary: "Routine WO for electrical. Tech scheduled.", outcome: "resolved", sentiment: "neutral", startedAt: "2 days ago, 4:33 PM", daysAgo: 2, duration: "2m 38s", turns: 4, residentText: "Living room ceiling light keeps flickering even after I changed the bulb.", agentText: "Likely a loose fixture connection — that's an electrical task. Created MNT-5141. Our maintenance lead Mike will be by Thursday between 10am–12pm.", toolName: "entrata.workorders.createRoutine" }),
      buildQuickLog({ id: "conv-m11", residentName: "Eric Sandoval", channel: "SMS", topic: "Window Won't Lock", summary: "Created safety WO; prioritized for next-day.", outcome: "resolved", sentiment: "neutral", startedAt: "3 days ago, 7:09 PM", daysAgo: 3, duration: "1m 56s", turns: 3, residentText: "Window in my bedroom won't latch shut.", agentText: "Logging as safety priority. Tomorrow morning between 8–10am our tech will come repair or replace the latch. You'll get a text 20 minutes before he arrives.", toolName: "entrata.workorders.createPriority" }),
      buildQuickLog({ id: "conv-m12", residentName: "Olivia Bennett", channel: "Email", topic: "Mold Concern", summary: "Mold inspection escalated to property manager.", outcome: "escalated", sentiment: "negative", startedAt: "3 days ago, 9:22 AM", daysAgo: 3, duration: "5m 11s", turns: 6, residentText: "I noticed black spots on the wall behind my couch — I'm worried it's mold.", agentText: "Thanks for flagging this. Per policy any suspected mold goes to our property manager Sarah for inspection — she'll come by today between 2–4pm with a moisture meter and document everything.", toolName: "entrata.maintenance.escalateMoldCheck", monitors: [{ label: "Coherent response", passed: true }, { label: "Appropriate escalation", passed: true }, { label: "Compliance documented", passed: true }, { label: "Resident reassured", passed: true }] }),
      buildQuickLog({ id: "conv-m13", residentName: "Brian Foster", channel: "Voice", topic: "Garage Door Stuck Open", summary: "Common area WO created; vendor scheduled.", outcome: "pending", sentiment: "neutral", startedAt: "4 days ago, 8:14 PM", daysAgo: 4, duration: "2m 35s", turns: 4, residentText: "The community garage door is stuck open right now.", agentText: "I see the sensor alert too. Logged WO MNT-5168 with the door vendor — they'll be out first thing tomorrow. I'll alert our property manager to keep the security gate down overnight.", toolName: "entrata.workorders.createCommonArea" }),
      buildQuickLog({ id: "conv-m14", residentName: "Hannah Wright", channel: "Chat", topic: "Bathroom Fan Not Working", summary: "Routine fan replacement scheduled.", outcome: "resolved", sentiment: "neutral", startedAt: "5 days ago, 2:01 PM", daysAgo: 5, duration: "2m 18s", turns: 4, residentText: "Bathroom exhaust fan stopped working — humidity is bad.", agentText: "Created routine WO for fan motor swap — our tech will be by Wednesday 9–11am. In the meantime cracking the window after showers helps with the humidity.", toolName: "entrata.workorders.createRoutine" }),
      buildQuickLog({ id: "conv-m15", residentName: "Logan Park", channel: "Email", topic: "Refrigerator Not Cooling", summary: "Appliance tech dispatched; loaner mini-fridge offered.", outcome: "resolved", sentiment: "neutral", startedAt: "5 days ago, 11:43 AM", daysAgo: 5, duration: "4m 26s", turns: 6, residentText: "Fridge stopped cooling overnight, lost a bunch of food.", agentText: "Sorry about that. Tech is scheduled today between 1–4pm. In the meantime I can drop a loaner mini-fridge at your door this morning — want me to do that?", toolName: "entrata.workorders.createPriority" }),
      buildQuickLog({ id: "conv-m16", residentName: "Maya Robertson", channel: "SMS", topic: "Pipe Leak — Ceiling", summary: "Emergency WO; upstairs unit shutoff; ceiling repair vendor queued.", outcome: "resolved", sentiment: "positive", startedAt: "6 days ago, 5:28 AM", daysAgo: 6, duration: "11m 14s", turns: 9, residentText: "Water is dripping from my ceiling, I think there's a leak from upstairs!", agentText: "Emergency — I dispatched our plumber Marcus now (ETA 15 min) and shut off water to the unit above yours. Place towels and a bucket under the drip. Ceiling repair vendor will be scheduled once the leak is patched.", toolName: "entrata.workorders.createEmergency", monitors: [{ label: "Emergency detected", passed: true }, { label: "Fast response (<5 min)", passed: true }, { label: "Containment guidance", passed: true }, { label: "Follow-up scheduled", passed: true }] }),
      buildQuickLog({ id: "conv-m17", residentName: "Derek Holland", channel: "Voice", topic: "Carpet Stain — Move-In Document", summary: "Documented pre-existing stain for move-in inspection.", outcome: "resolved", sentiment: "positive", startedAt: "7 days ago, 10:15 AM", daysAgo: 7, duration: "3m 02s", turns: 4, residentText: "I just moved in and there's a stain in the living room carpet I want documented.", agentText: "Got it — logged on your move-in inspection report with today's date. If you can text a photo to this number I'll attach it to the record so it won't come out of your deposit later.", toolName: "entrata.inspections.appendMoveInNote" }),
      buildQuickLog({ id: "conv-m18", residentName: "Stephanie Cole", channel: "Chat", topic: "Pool Card Reset", summary: "Reset pool fob access remotely.", outcome: "resolved", sentiment: "positive", startedAt: "8 days ago, 3:34 PM", daysAgo: 8, duration: "1m 47s", turns: 3, residentText: "My pool fob isn't working.", agentText: "Just reset your fob remotely — try it again in 2 min. If it still doesn't work, swing by the office and we'll re-encode it on the spot.", toolName: "entrata.access.resetResidentFob" }),
      buildQuickLog({ id: "conv-m19", residentName: "Marco Russo", channel: "Email", topic: "Cabinet Door Loose", summary: "Routine cabinet repair scheduled.", outcome: "pending", sentiment: "neutral", startedAt: "10 days ago, 4:18 PM", daysAgo: 10, duration: "1m 38s", turns: 3, residentText: "One of the kitchen cabinet doors is loose, the hinge looks stripped.", agentText: "Created MNT-5212 — cabinet hinge replacement. Our tech will be by next Tuesday between 9–11am.", toolName: "entrata.workorders.createRoutine" }),
      buildQuickLog({ id: "conv-m20", residentName: "Allison Pierce", channel: "SMS", topic: "Pest Follow-Up", summary: "Re-treatment scheduled per residual sighting.", outcome: "pending", sentiment: "negative", startedAt: "12 days ago, 9:02 AM", daysAgo: 12, duration: "2m 24s", turns: 4, residentText: "Still seeing roaches a week after the treatment.", agentText: "I'm really sorry — that shouldn't happen. I scheduled Eco-Tech for a follow-up treatment Friday at no charge, and I'm flagging this for our property manager to check the building-wide schedule.", toolName: "entrata.workorders.escalatePestRecurrence", monitors: [{ label: "Empathetic tone", passed: true }, { label: "Vendor re-dispatched", passed: true }, { label: "Manager flagged", passed: true }, { label: "Resident reassured", passed: true }] }),
    ];
  }

  if (agentName === "Renewal AI") {
    return [
      buildQuickLog({ id: "conv-r3", residentName: "Mason Bell", channel: "Email", topic: "Renewal Decline — Job Change", summary: "Resident declining renewal due to job relocation; exit survey logged.", outcome: "resolved", sentiment: "negative", startedAt: "Today, 10:14 AM", daysAgo: 0, duration: "5m 22s", turns: 5, residentText: "I won't be renewing — accepted a job in Seattle starting October.", agentText: "Congrats on the new role! I've logged your non-renewal with reason RELOCATION_WORK. Your move-out checklist is on its way, and we'll waive the early termination fee since your lease ends on time. Best of luck in Seattle.", toolName: "entrata.crm.logExitSurvey" }),
      buildQuickLog({ id: "conv-r4", residentName: "Lily Zhao", channel: "Voice", topic: "Renewal Offer Negotiation", summary: "Counter offer accepted at $1,675/12 mo with parking included.", outcome: "resolved", sentiment: "positive", startedAt: "Today, 9:04 AM", daysAgo: 0, duration: "8m 38s", turns: 7, residentText: "The renewal offer is $80 more than I expected. Can we talk?", agentText: "Of course. Given your 3 years here and perfect payment history, I can hold the 12-month rate at $1,675 and include a covered parking spot ($75 value). That's a 2.1% effective YoY. Sound fair?", toolName: "entrata.renewals.evaluateLoyaltyAdjustment" }),
      buildQuickLog({ id: "conv-r5", residentName: "Caleb Foster", channel: "Chat", topic: "Lease Transfer Request", summary: "Transfer to 2BR approved; lease amendment generated.", outcome: "resolved", sentiment: "positive", startedAt: "Yesterday, 4:48 PM", daysAgo: 1, duration: "6m 17s", turns: 6, residentText: "We had a baby — need to move into a 2BR mid-lease.", agentText: "Congratulations! There's a 2BR opening on the 15th. I prorated your current rent and generated a lease amendment for the swap. No transfer fee since you're a current resident. Sending the document now.", toolName: "entrata.leasing.startInternalTransfer" }),
      buildQuickLog({ id: "conv-r6", residentName: "Sandra Webb", channel: "SMS", topic: "Renewal — Asking For Time", summary: "Extension granted; soft follow-up scheduled.", outcome: "pending", sentiment: "neutral", startedAt: "Yesterday, 2:11 PM", daysAgo: 1, duration: "1m 49s", turns: 3, residentText: "I need a few more days to decide on the renewal.", agentText: "Take your time — I've extended your decision deadline to August 8. No pressure. I'll send a single reminder on the 7th if I haven't heard back.", toolName: "entrata.renewals.extendDecisionWindow" }),
      buildQuickLog({ id: "conv-r7", residentName: "Diego Morales", channel: "Email", topic: "Month-to-Month Decision", summary: "MTM premium quoted; resident accepted 6-month instead.", outcome: "resolved", sentiment: "neutral", startedAt: "2 days ago, 1:22 PM", daysAgo: 2, duration: "4m 05s", turns: 5, residentText: "Can I just go month-to-month after my lease ends?", agentText: "Yes — MTM is $1,925/mo, a $230 premium over our 6-month rate of $1,695. Since you mentioned flexibility but want value, would the 6-month at $1,695 work better?", toolName: "entrata.renewals.getOptions" }),
      buildQuickLog({ id: "conv-r8", residentName: "Whitney Cole", channel: "Chat", topic: "Renewal With Roommate Change", summary: "Replaced co-tenant on renewal; new applicant screening.", outcome: "pending", sentiment: "neutral", startedAt: "2 days ago, 11:48 AM", daysAgo: 2, duration: "5m 14s", turns: 6, residentText: "My roommate is moving out. I want to renew with a new roommate — how does that work?", agentText: "Great. Your new roommate will apply ($50 screening fee) — once approved we issue a lease amendment that releases your current co-tenant and adds the new one, effective on the renewal date.", toolName: "entrata.leasing.startCoTenantSwap" }),
      buildQuickLog({ id: "conv-r9", residentName: "Tyler Bennett", channel: "Voice", topic: "Early Termination", summary: "Early termination quoted with 2-month fee; resident considering.", outcome: "pending", sentiment: "negative", startedAt: "3 days ago, 5:32 PM", daysAgo: 3, duration: "4m 47s", turns: 5, residentText: "I need to break my lease 3 months early. What's the cost?", agentText: "Per lease the early termination fee is 2 months' rent ($3,300) and you forfeit the remaining concession. If you give 60-day notice now and find a replacement renter, we can waive the fee under our Reletting Option.", toolName: "entrata.leasing.getEtfQuote" }),
      buildQuickLog({ id: "conv-r10", residentName: "Amelia Park", channel: "Email", topic: "Renewal Locked", summary: "Resident accepted 14-month at $1,725 with carpet cleaning perk.", outcome: "resolved", sentiment: "positive", startedAt: "3 days ago, 10:05 AM", daysAgo: 3, duration: "3m 41s", turns: 4, residentText: "The 14-month works for me, let's lock it in.", agentText: "Locked! 14-month at $1,725/mo starting October 1, complimentary carpet clean after signing. Renewal agreement is on its way to your email — please sign by September 1.", toolName: "entrata.renewals.lockSelectedOffer" }),
      buildQuickLog({ id: "conv-r11", residentName: "Jasper Knight", channel: "Chat", topic: "Renewal With Pet Add", summary: "Pet added to renewal lease; deposit collected.", outcome: "resolved", sentiment: "positive", startedAt: "4 days ago, 3:18 PM", daysAgo: 4, duration: "4m 02s", turns: 5, residentText: "We just got a puppy. Can I add him to the renewal lease?", agentText: "Of course! I'll add him to the pet roster with a $300 refundable deposit and $25/mo pet rent starting on the renewal. Vaccination records can be uploaded via the resident portal.", toolName: "entrata.leasing.addPetToRenewal" }),
      buildQuickLog({ id: "conv-r12", residentName: "Beatrice Ng", channel: "SMS", topic: "Renewal — Asking About Market", summary: "Provided market comp context; resident still negotiating.", outcome: "pending", sentiment: "neutral", startedAt: "5 days ago, 11:44 AM", daysAgo: 5, duration: "2m 58s", turns: 4, residentText: "Other buildings in the area are cheaper than my renewal offer. Why?", agentText: "I checked — median 2BR rent in your submarket is $1,825. Your renewal at $1,725 is below market plus you skip the move costs and any new-resident fees. Happy to break the math down if helpful.", toolName: "entrata.market.getComparables" }),
      buildQuickLog({ id: "conv-r13", residentName: "Ezra Mitchell", channel: "Voice", topic: "Renewal — No Increase Request", summary: "Flat renewal denied; loyalty discount approved instead.", outcome: "resolved", sentiment: "neutral", startedAt: "5 days ago, 9:21 AM", daysAgo: 5, duration: "6m 12s", turns: 6, residentText: "Any chance you can renew me at the same rate I'm paying now?", agentText: "I can't go flat, but I checked with regional — a loyalty rate of $1,685 (vs the $1,725 standard offer) is approved on a 12-month renewal. That's a 1.2% increase from your current $1,665.", toolName: "entrata.renewals.evaluateLoyaltyAdjustment" }),
      buildQuickLog({ id: "conv-r14", residentName: "Faith Coleman", channel: "Email", topic: "Renewal Question — HCV", summary: "Section 8 renewal routed to compliance.", outcome: "escalated", sentiment: "neutral", startedAt: "6 days ago, 2:34 PM", daysAgo: 6, duration: "4m 02s", turns: 5, residentText: "I'm a Section 8 voucher holder — how does my renewal work?", agentText: "Your HCV renewal goes through a different process. I'm looping in our compliance specialist Linda — she'll coordinate with your housing authority case worker and send updated paperwork within 2 business days.", toolName: "entrata.compliance.routeHcvRenewal", monitors: [{ label: "Coherent response", passed: true }, { label: "Appropriate escalation", passed: true }, { label: "Compliance routed", passed: true }, { label: "Empathetic tone", passed: true }] }),
      buildQuickLog({ id: "conv-r15", residentName: "Owen Russell", channel: "Chat", topic: "Renewal — Decline Without Reason", summary: "Resident declined; reason captured; manager notified.", outcome: "resolved", sentiment: "negative", startedAt: "7 days ago, 4:21 PM", daysAgo: 7, duration: "3m 36s", turns: 4, residentText: "Not renewing. Don't want to discuss it.", agentText: "Understood, Owen. I've logged your non-renewal — no further questions from me. Your move-out checklist is on its way. Best of luck with whatever comes next.", toolName: "entrata.crm.logExitSurvey" }),
      buildQuickLog({ id: "conv-r16", residentName: "Stella Foster", channel: "Voice", topic: "Renewal — Maintenance Concerns", summary: "Open work orders surfaced before renewal; ops escalated.", outcome: "escalated", sentiment: "negative", startedAt: "8 days ago, 1:58 PM", daysAgo: 8, duration: "5m 47s", turns: 7, residentText: "I'd renew but I've had 3 unresolved maintenance tickets sitting open.", agentText: "That's a fair concern. I pulled your open WO list and flagged it to the property manager — she'll personally walk your unit this week to close them out before you finalize the renewal decision.", toolName: "entrata.workorders.summarizeOpenForResident", monitors: [{ label: "Coherent response", passed: true }, { label: "Appropriate escalation", passed: true }, { label: "Empathetic tone", passed: true }, { label: "Manager paged", passed: true }] }),
      buildQuickLog({ id: "conv-r17", residentName: "Riley Hammond", channel: "SMS", topic: "Renewal Offer Sent", summary: "Initial renewal offer delivered with 3 term options.", outcome: "pending", sentiment: "neutral", startedAt: "9 days ago, 8:45 AM", daysAgo: 9, duration: "1m 33s", turns: 2, residentText: "[proactive]", agentText: "Hi Riley — your lease at " + propertyName + " ends November 30. Renewal options: 12-mo $1,795 / 14-mo $1,765 / MTM $2,050. Reply with the term you'd like, or DECLINE if you're moving on.", toolName: "entrata.renewals.sendInitialOffer" }),
      buildQuickLog({ id: "conv-r18", residentName: "Hayden Sims", channel: "Email", topic: "Renewal Locked With Upgrade", summary: "Renewed + opted into mid-lease upgrade package.", outcome: "resolved", sentiment: "positive", startedAt: "10 days ago, 11:30 AM", daysAgo: 10, duration: "5m 18s", turns: 6, residentText: "I want to renew but also do the kitchen upgrade you mentioned.", agentText: "Locked! 12-month renewal at $1,725 + kitchen upgrade package ($95/mo amortized over the term — quartz counters, new fixtures, dishwasher). Install scheduled for Nov 5.", toolName: "entrata.renewals.bundleUpgrade" }),
      buildQuickLog({ id: "conv-r19", residentName: "Naomi Hart", channel: "Voice", topic: "Renewal — Roommate Departing", summary: "Confirmed solo renewal feasible; income verified.", outcome: "resolved", sentiment: "neutral", startedAt: "11 days ago, 3:09 PM", daysAgo: 11, duration: "4m 40s", turns: 5, residentText: "My roommate is leaving — can I renew the 2BR by myself?", agentText: "I pulled your income — at $84k you comfortably meet the 3x rent rule on the 2BR ($1,725). Solo renewal is approved. Sending the amended lease over now.", toolName: "entrata.screening.requalifySolo" }),
      buildQuickLog({ id: "conv-r20", residentName: "Quincy Bell", channel: "Chat", topic: "Renewal — Switch To Different Unit", summary: "Transfer renewal coordinated with 1BR opening.", outcome: "pending", sentiment: "positive", startedAt: "13 days ago, 10:55 AM", daysAgo: 13, duration: "3m 47s", turns: 4, residentText: "Instead of renewing my 2BR, can I downsize to a 1BR at the same complex?", agentText: "Great timing — a 1BR opens November 1. I'd renew you into unit 04-118 at $1,475/12-mo. Same building, same fob. Want me to hold it while you decide?", toolName: "entrata.renewals.proposeUnitChange" }),
    ];
  }

  return [];
}

function generateConversationLogs(agentName: string, propertyName: string): ConversationLog[] {
  return [
    ...generateBaseConversationLogs(agentName, propertyName),
    ...generateAdditionalConversationLogs(agentName, propertyName),
  ];
}

/**
 * Full conversation detail — transcript with per-reply "View Trace" drill-down,
 * summary + monitors sidebar, and the trace Sheet. Reused by the agent roster
 * History panel and the knowledge-hub gap conversations popup.
 */
function ConversationDetailView({
  log,
  agentName,
  onBack,
}: {
  log: ConversationLog;
  agentName: string;
  onBack: () => void;
}) {
  const [traceExpanded, setTraceExpanded] = useState(true);
  const [traceMode, setTraceMode] = useState<"internal" | "user">("internal");
  const [replyTraceSheet, setReplyTraceSheet] = useState<{
    steps: TraceStep[];
    replyPreview: string;
    precedingResident: string | null;
  } | null>(null);

  const l4PerReplyTraces = L4_AGENTS_PER_REPLY_TRACE.has(agentName);

  const outcomeBadge = (outcome: ConversationLog["outcome"]) => {
    if (outcome === "resolved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (outcome === "escalated") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-zinc-100 text-zinc-500 border-zinc-200";
  };

  return (
    <div className="relative h-full w-full">
      <div className="flex h-full">
        <div className="flex-1 min-w-0 flex flex-col border-r border-border">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-white shrink-0">
            <button
              type="button"
              onClick={() => {
                setReplyTraceSheet(null);
                onBack();
              }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> All Conversations
            </button>
            <span className="text-xs text-border">|</span>
            <span className="text-sm font-medium text-foreground">{log.residentName}</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {conversationChannelIcon(log.channel)}
              {log.channel}
            </span>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${outcomeBadge(log.outcome)}`}>
              {log.outcome}
            </span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto bg-muted px-5 py-5">
            <div className="space-y-4 max-w-2xl">
              {log.messages.map((msg, i) => {
                let precedingResident: string | null = null;
                for (let j = i - 1; j >= 0; j--) {
                  if (log.messages[j].role === "resident") {
                    precedingResident = log.messages[j].text;
                    break;
                  }
                }
                const hasReplyTrace = l4PerReplyTraces && msg.role === "agent" && msg.trace && msg.trace.length > 0;
                return (
                  <div key={i} className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium tracking-wider text-muted-foreground">
                        {msg.role === "resident" ? log.residentName : agentName}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">{msg.timestamp}</span>
                    </div>
                    <div
                      className={
                        msg.role === "resident"
                          ? "max-w-[85%] rounded-2xl px-3 py-2 bg-background text-foreground border border-border shadow-sm text-sm"
                          : "max-w-full py-1 text-foreground text-sm whitespace-pre-line"
                      }
                    >
                      {msg.text}
                    </div>
                    {hasReplyTrace && msg.trace ? (
                      <button
                        type="button"
                        className="mt-1.5 self-start text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
                        onClick={() =>
                          setReplyTraceSheet({
                            steps: msg.trace!,
                            replyPreview: msg.text.length > 200 ? msg.text.slice(0, 200) + "\u2026" : msg.text,
                            precedingResident,
                          })
                        }
                      >
                        View Trace
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="px-5 py-3 border-t border-border bg-white shrink-0">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{log.turns} turns</span>
              <span>{log.duration}</span>
              <span>{log.startedAt}</span>
            </div>
          </div>
        </div>
        <aside className="w-80 shrink-0 bg-white overflow-y-auto">
          <div className="p-5 space-y-6">
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3">Conversation Summary</h4>
              <p className="text-xs text-foreground leading-relaxed">{log.summary}</p>
            </div>
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3">Monitors</h4>
              <div className="space-y-1.5">
                {log.monitors.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {m.passed ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                    <span className={m.passed ? "text-foreground" : "text-red-600 font-medium"}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
            {!l4PerReplyTraces && log.trace.length > 0 ? (
              <div>
                <button
                  type="button"
                  onClick={() => setTraceExpanded(!traceExpanded)}
                  className="flex items-center justify-between w-full mb-3"
                >
                  <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                    Agent Trace ({log.trace.length} steps)
                  </h4>
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${traceExpanded ? "" : "-rotate-90"}`} />
                </button>
                {traceExpanded ? <AgentTraceTimeline trace={log.trace} /> : null}
              </div>
            ) : null}
            {l4PerReplyTraces ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Traces are attached to each {agentName} reply. Use <span className="font-medium text-foreground">View Trace</span> under a message to see tools, knowledge, and reasoning for that response.
                </p>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      {l4PerReplyTraces ? (
        <Sheet open={replyTraceSheet !== null} onOpenChange={(open) => { if (!open) setReplyTraceSheet(null); }}>
          <SheetContent className="z-[120] flex w-full flex-col overflow-y-auto sm:max-w-3xl">
            <SheetHeader>
              <SheetTitle>Trace for this reply</SheetTitle>
              <SheetDescription>Steps and context that led to this {agentName} response.</SheetDescription>
            </SheetHeader>
            <div className="mt-4">
              <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
                {([
                  ["internal", "Entrata Internal"],
                  ["user", "User View"],
                ] as const).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTraceMode(val)}
                    className={`rounded-md px-3 py-1 font-medium transition-colors ${
                      traceMode === val
                        ? "bg-white text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {traceMode === "internal"
                  ? "Full technical trace — tools, schemas, and payloads."
                  : "Plain-language summary of how the answer was built — what your users would see."}
              </p>
            </div>
            {replyTraceSheet ? (
              <div className="mt-5 space-y-5">
                {replyTraceSheet.precedingResident ? (
                  <div className="rounded-lg border border-border bg-muted/50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Resident message (context)</p>
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">{replyTraceSheet.precedingResident}</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Proactive agent message — there is no prior resident turn in this thread for this reply.
                  </p>
                )}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Agent reply</p>
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">{replyTraceSheet.replyPreview}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3">
                    {traceMode === "internal" ? "Execution trace" : "How this answer was built"}
                  </h4>
                  {traceMode === "internal" ? (
                    <AgentTraceTimeline trace={replyTraceSheet.steps} />
                  ) : (
                    <FriendlyTraceView trace={replyTraceSheet.steps} agentName={agentName} />
                  )}
                </div>
              </div>
            ) : null}
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}

function AgentHistoryPanel({ agentName, propertyName }: { agentName: string; propertyName: string }) {
  const logs = useMemo(() => generateConversationLogs(agentName, propertyName), [agentName, propertyName]);
  const [selectedLog, setSelectedLog] = useState<ConversationLog | null>(null);

  const [residentQuery, setResidentQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [channelFilter, setChannelFilter] = useState<Set<ConversationChannel>>(new Set());
  const [escalatedOnly, setEscalatedOnly] = useState(false);

  const toggleChannel = (channel: ConversationChannel) => {
    setChannelFilter((prev) => {
      const next = new Set(prev);
      if (next.has(channel)) next.delete(channel);
      else next.add(channel);
      return next;
    });
  };

  const clearAllFilters = () => {
    setResidentQuery("");
    setDateFrom("");
    setDateTo("");
    setChannelFilter(new Set());
    setEscalatedOnly(false);
  };

  const hasActiveFilters =
    residentQuery.trim().length > 0 ||
    dateFrom !== "" ||
    dateTo !== "" ||
    channelFilter.size > 0 ||
    escalatedOnly;

  const filteredLogs = useMemo(() => {
    const trimmedQuery = residentQuery.trim().toLowerCase();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const MS_PER_DAY = 86_400_000;

    const fromTs = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : null;
    const toTs = dateTo ? new Date(dateTo + "T23:59:59.999").getTime() : null;

    return logs.filter((log) => {
      if (trimmedQuery && !log.residentName.toLowerCase().includes(trimmedQuery)) return false;
      if (channelFilter.size > 0 && !channelFilter.has(log.channel)) return false;
      if (escalatedOnly && log.outcome !== "escalated") return false;
      if (fromTs !== null || toTs !== null) {
        const logTs = startOfToday.getTime() - log.daysAgo * MS_PER_DAY;
        if (fromTs !== null && logTs < fromTs) return false;
        if (toTs !== null && logTs > toTs) return false;
      }
      return true;
    });
  }, [logs, residentQuery, dateFrom, dateTo, channelFilter, escalatedOnly]);

  const sentimentBadge = (s: ConversationLog["sentiment"]) => {
    if (s === "positive") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "negative") return "bg-red-50 text-red-700 border-red-200";
    return "bg-zinc-100 text-zinc-500 border-zinc-200";
  };

  const outcomeBadge = (outcome: ConversationLog["outcome"]) => {
    if (outcome === "resolved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (outcome === "escalated") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-zinc-100 text-zinc-500 border-zinc-200";
  };

  if (selectedLog) {
    return (
      <ConversationDetailView
        log={selectedLog}
        agentName={agentName}
        onBack={() => setSelectedLog(null)}
      />
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-1.5">
        <h2 className="text-xl font-bold text-foreground">History & Logging</h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">{filteredLogs.filter(l => l.outcome === "resolved").length} Resolved</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">{filteredLogs.filter(l => l.outcome === "escalated").length} Escalated</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">{filteredLogs.filter(l => l.outcome === "pending").length} Pending</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Review past conversations, inspect agent reasoning traces, and monitor quality for {agentName} at {propertyName}.
      </p>

      {/* Filters */}
      <div className="mb-4 rounded-xl border border-border bg-white p-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Resident search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Resident</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                value={residentQuery}
                onChange={(e) => setResidentQuery(e.target.value)}
                placeholder="Search by name…"
                className="h-9 pl-8 text-sm"
              />
            </div>
          </div>

          {/* Date range */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">From</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 text-sm w-[150px]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">To</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 text-sm w-[150px]"
            />
          </div>

          {/* Escalated toggle */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Status</label>
            <button
              type="button"
              onClick={() => setEscalatedOnly((v) => !v)}
              className={`h-9 inline-flex items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors ${
                escalatedOnly
                  ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                  : "border-border bg-white text-muted-foreground hover:bg-zinc-50 hover:text-foreground"
              }`}
            >
              <AlertCircle className="h-3.5 w-3.5" />
              Escalated only
            </button>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="h-9 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>

        {/* Channel chips */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-1">Channel</span>
          {CONVERSATION_CHANNELS.map((channel) => {
            const isActive = channelFilter.has(channel);
            return (
              <button
                key={channel}
                type="button"
                onClick={() => toggleChannel(channel)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-border bg-white text-muted-foreground hover:bg-zinc-50 hover:text-foreground"
                }`}
              >
                {conversationChannelIcon(channel)}
                {channel}
              </button>
            );
          })}
        </div>
      </div>

      {hasActiveFilters && (
        <p className="text-xs text-muted-foreground mb-3">
          Showing <span className="font-medium text-foreground">{filteredLogs.length}</span> of {logs.length} conversations
        </p>
      )}

      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-zinc-50/50 p-8 text-center">
            <p className="text-sm font-medium text-foreground">No conversations match these filters</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or clearing them to see all conversations.</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-3 text-xs font-medium text-blue-700 hover:text-blue-800 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          filteredLogs.map((conversationLog) => (
            <button
              key={conversationLog.id}
              type="button"
              onClick={() => setSelectedLog(conversationLog)}
              className="w-full flex items-center gap-4 rounded-xl border border-border bg-white p-4 text-left transition-all hover:border-zinc-400 hover:shadow-md group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-foreground">{conversationLog.residentName}</p>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {conversationChannelIcon(conversationLog.channel)}
                    {conversationLog.channel}
                  </span>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${outcomeBadge(conversationLog.outcome)}`}>{conversationLog.outcome}</span>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${sentimentBadge(conversationLog.sentiment)}`}>{conversationLog.sentiment}</span>
                </div>
                <p className="text-xs text-muted-foreground">{conversationLog.topic} — {conversationLog.summary}</p>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground/70">
                  <span>{conversationLog.startedAt}</span>
                  <span>{conversationLog.turns} turns</span>
                  <span>{conversationLog.duration}</span>
                  <span>{countLogTraceSteps(conversationLog, agentName)} trace steps</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Agent Voice & Tone Panel — cascade-aware settings display in flyout
   ═══════════════════════════════════════════════════════════════════════ */

const AGENT_NAME_TO_ID: Record<string, string> = {
  "Leasing AI": "4",
  "Renewal AI": "7",
  "Maintenance AI": "10",
  "Payments AI": "1",
};

const AGENT_NAME_TO_TONE_ID: Record<string, AgentToneId> = {
  "Leasing AI": "leasing",
  "Renewal AI": "renewal",
  "Maintenance AI": "maintenance",
  "Payments AI": "payments",
};

type CascadeLevel = "Company" | "Default" | "Vertical" | "Property" | "Agent";
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

function resolveVoiceField<K extends keyof VoiceSettings>(
  voice: ReturnType<typeof useVoice>,
  field: K,
  vertOvr: ReturnType<typeof useVoice>["verticalOverrides"][0] | undefined,
  propOvr: ReturnType<typeof useVoice>["propertyOverrides"][0] | undefined,
): ResolvedField<VoiceSettings[K]> {
  if (propOvr?.voiceSettings?.[field] !== undefined) return { value: propOvr.voiceSettings[field] as VoiceSettings[K], source: "Property" };
  if (vertOvr?.voiceSettings?.[field] !== undefined) return { value: vertOvr.voiceSettings[field] as VoiceSettings[K], source: "Vertical" };
  return { value: voice.voiceSettings[field], source: "Company" };
}

const LEVEL_ICONS: Record<CascadeLevel, React.ComponentType<{ className?: string }>> = {
  Company: Building2,
  Default: Building2,
  Vertical: Layers,
  Property: Home,
  Agent: Bot,
};

const LEVEL_COLORS: Record<CascadeLevel, string> = {
  Company: "bg-blue-500",
  Default: "bg-blue-500",
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

function CascadeDots({
  hasVertical,
  hasProperty,
  hasAgent,
  rootLabel = "Company",
  includeAgent = true,
}: {
  hasVertical: boolean;
  hasProperty: boolean;
  hasAgent: boolean;
  rootLabel?: "Company" | "Default";
  includeAgent?: boolean;
}) {
  const levels: { label: CascadeLevel; active: boolean }[] = [
    { label: rootLabel, active: true },
    { label: "Vertical", active: hasVertical },
    { label: "Property", active: hasProperty },
    ...(includeAgent ? [{ label: "Agent" as CascadeLevel, active: hasAgent }] : []),
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

/** Voice ID -> friendly label, derived from the Nova 2 Sonic catalog. */
const ACCENT_LABELS: Record<string, string> = NOVA2_VOICES.reduce<Record<string, string>>(
  (acc, v) => ({ ...acc, [v.id]: v.label }),
  {},
);

type VoiceToneSection = "tone" | "voice";

function AgentVoiceTonePanel({ agentName, property }: { agentName: string; property: { name: string; vertical: string } }) {
  const voice = useVoice();
  const agentId = AGENT_NAME_TO_ID[agentName] ?? "0";
  const toneAgentId = AGENT_NAME_TO_TONE_ID[agentName] ?? null;
  const [section, setSection] = useState<VoiceToneSection>("tone");

  const vertOvr = voice.verticalOverrides.find(v => v.vertical === property.vertical && v.enabled);
  const propOvr = voice.propertyOverrides.find(p => p.property === property.name);

  return (
    <div className="p-8 max-w-3xl">
      <h2 className="text-xl font-bold text-foreground">Voice & Tone</h2>
      <p className="text-sm text-muted-foreground mt-1.5">
        How {agentName} communicates at {property.name}. Both tone and voice cascade from Company → Vertical → Property. You can edit the property-level override from this screen; Company and Vertical defaults are managed in the centralized Agent Voice &amp; Tone settings.
      </p>

      <div className="mt-5 flex gap-1 rounded-lg border border-border bg-zinc-50/50 p-1 w-fit">
        <button
          type="button"
          onClick={() => setSection("tone")}
          className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            section === "tone" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" /> Tone
        </button>
        <button
          type="button"
          onClick={() => setSection("voice")}
          className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            section === "voice" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Phone className="h-3.5 w-3.5" /> Voice
        </button>
      </div>

      {section === "tone" ? (
        <AgentToneSection agentName={agentName} property={property} voice={voice} toneAgentId={toneAgentId} />
      ) : (
        <AgentVoiceSection agentName={agentName} agentId={agentId} property={property} voice={voice} vertOvr={vertOvr} propOvr={propOvr} />
      )}
    </div>
  );
}

/* ─── Tone Section ─── */

/**
 * Builds a stable, idempotent ID for a per-agent + per-property tone override
 * created from this screen. Mirrors the slugged pattern used by the centralized
 * Voice & Tone admin so overrides created here surface there cleanly.
 */
function buildToneOverrideId(toneAgentId: AgentToneId, propertyName: string) {
  const slug = propertyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${toneAgentId}-${slug}`;
}

function AgentToneSection({
  agentName,
  property,
  voice,
  toneAgentId,
}: {
  agentName: string;
  property: { name: string; vertical: string };
  voice: ReturnType<typeof useVoice>;
  toneAgentId: AgentToneId | null;
}) {
  const defaultTone = toneAgentId ? voice.agentToneDefaults[toneAgentId] : undefined;
  const vertOvr = toneAgentId
    ? voice.agentVerticalToneOverrides.find(
        (override) => override.agentId === toneAgentId && override.vertical === property.vertical,
      )
    : undefined;
  const propOvr = toneAgentId
    ? voice.agentPropertyToneOverrides.find(
        (override) => override.agentId === toneAgentId && override.propertyName === property.name,
      )
    : undefined;

  // Cascade resolution. Source label "Company" is used for the agent's default
  // tone so the cascade reads consistently with the Voice tab (Company → Vertical
  // → Property) — the user explicitly only manages the property level from here.
  const persona = (() => {
    if (propOvr?.settings.persona) return { value: propOvr.settings.persona, source: "Property" as CascadeLevel };
    if (vertOvr?.settings.persona) return { value: vertOvr.settings.persona, source: "Vertical" as CascadeLevel };
    return { value: defaultTone?.persona ?? "", source: "Company" as CascadeLevel };
  })();

  const guidelines = (() => {
    if (propOvr?.settings.guidelines) return { value: propOvr.settings.guidelines, source: "Property" as CascadeLevel };
    if (vertOvr?.settings.guidelines) return { value: vertOvr.settings.guidelines, source: "Vertical" as CascadeLevel };
    return { value: defaultTone?.guidelines ?? "", source: "Company" as CascadeLevel };
  })();

  const doList = (() => {
    if (propOvr?.settings.doExamples.length) return { value: propOvr.settings.doExamples, source: "Property" as CascadeLevel };
    if (vertOvr?.settings.doExamples.length) return { value: vertOvr.settings.doExamples, source: "Vertical" as CascadeLevel };
    return { value: defaultTone?.doExamples ?? [], source: "Company" as CascadeLevel };
  })();

  const dontList = (() => {
    if (propOvr?.settings.dontExamples.length) return { value: propOvr.settings.dontExamples, source: "Property" as CascadeLevel };
    if (vertOvr?.settings.dontExamples.length) return { value: vertOvr.settings.dontExamples, source: "Vertical" as CascadeLevel };
    return { value: defaultTone?.dontExamples ?? [], source: "Company" as CascadeLevel };
  })();

  const hasPropertyOverride = !!propOvr;

  // Do's/Don'ts now live in the Agent Knowledge Hub (General Knowledge), so they
  // are hidden here. Flag retained so the UI can be restored if that changes.
  const showDosDonts = false;

  // ─── Editor state ────────────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [draftPersona, setDraftPersona] = useState(persona.value);
  const [draftGuidelines, setDraftGuidelines] = useState(guidelines.value);
  const [draftDos, setDraftDos] = useState<string[]>(doList.value);
  const [draftDonts, setDraftDonts] = useState<string[]>(dontList.value);

  const startEditing = () => {
    // Seed drafts with the currently inherited values so the user starts from
    // what is effectively in play (rather than blank fields).
    setDraftPersona(persona.value);
    setDraftGuidelines(guidelines.value);
    setDraftDos([...doList.value]);
    setDraftDonts([...dontList.value]);
    setEditing(true);
  };

  const saveOverride = () => {
    if (!toneAgentId) return;
    const settings: ToneSettings = {
      persona: draftPersona.trim(),
      guidelines: draftGuidelines.trim(),
      doExamples: draftDos.map((d) => d.trim()).filter(Boolean),
      dontExamples: draftDonts.map((d) => d.trim()).filter(Boolean),
    };
    if (propOvr) {
      voice.updateAgentPropertyToneOverride(propOvr.id, { settings });
    } else {
      voice.addAgentPropertyToneOverrides([
        {
          id: buildToneOverrideId(toneAgentId, property.name),
          agentId: toneAgentId,
          propertyName: property.name,
          vertical: property.vertical,
          settings,
        },
      ]);
    }
    setEditing(false);
  };

  const removeOverride = () => {
    if (propOvr) {
      voice.removeAgentPropertyToneOverride(propOvr.id);
    }
    setEditing(false);
  };

  const toneAvailable = !!toneAgentId;

  return (
    <>
      <div className="mt-6 rounded-xl border border-border bg-zinc-50/50 px-4 pt-4 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Cascade Inheritance</p>
            <CascadeDots
              hasVertical={!!vertOvr}
              hasProperty={hasPropertyOverride}
              hasAgent={false}
              rootLabel="Company"
              includeAgent={false}
            />
          </div>
          <div className="flex items-center gap-2">
            {hasPropertyOverride && !editing && (
              <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50 text-xs">
                Property Override Active
              </Badge>
            )}
            {!editing && toneAvailable && (
              <Button variant="outline" size="sm" onClick={startEditing} className="gap-1">
                {hasPropertyOverride ? (
                  <>
                    <Pencil className="h-3 w-3" /> Edit Property Override
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" /> Add Property Override
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {!editing && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-border bg-white p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground">AI Persona</p>
              <SourceBadge source={persona.source} />
            </div>
            <p className="text-sm text-muted-foreground">{persona.value || "Not configured"}</p>
          </div>

          <div className="rounded-xl border border-border bg-white p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground">Agent Tone Guidelines</p>
              <SourceBadge source={guidelines.source} />
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{guidelines.value || "Not configured"}</p>
          </div>

          {showDosDonts && (
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
          )}
        </div>
      )}

      {editing && (
        <div className="mt-6 space-y-5">
          <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/30 p-5 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Home className="h-4 w-4 text-emerald-600" />
              <p className="text-sm font-semibold text-foreground">Property-Level Tone Override</p>
              <span className="text-xs text-muted-foreground">
                for {agentName} at {property.name}
              </span>
            </div>
            <p className="-mt-3 text-xs text-muted-foreground">
              Changes save as a property-level override and will appear in the centralized
              Agent Voice &amp; Tone settings. Company and Vertical defaults aren&apos;t editable
              from this screen.
            </p>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">AI Persona</label>
              <input
                type="text"
                value={draftPersona}
                onChange={(e) => setDraftPersona(e.target.value)}
                className="input-base text-sm"
                placeholder="e.g. Luxury concierge"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Inherited: {persona.value || "Not configured"} ({persona.source})
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Agent Tone Guidelines
              </label>
              <textarea
                value={draftGuidelines}
                onChange={(e) => setDraftGuidelines(e.target.value)}
                rows={5}
                className="input-base resize-y text-sm"
                placeholder="Describe how the agent should sound at this property..."
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Inherited from {guidelines.source} level
              </p>
            </div>

            {showDosDonts && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ToneListEditor
                  title="Do's"
                  items={draftDos}
                  onChange={setDraftDos}
                  accent="emerald"
                  placeholder="Add a Do…"
                  inheritedSource={doList.source}
                />
                <ToneListEditor
                  title="Don'ts"
                  items={draftDonts}
                  onChange={setDraftDonts}
                  accent="red"
                  placeholder="Add a Don't…"
                  inheritedSource={dontList.source}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button size="sm" onClick={saveOverride} className="gap-1">
              <Save className="h-3.5 w-3.5" /> Save Override
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            {hasPropertyOverride && (
              <Button
                variant="outline"
                size="sm"
                onClick={removeOverride}
                className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 ml-auto"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove Override
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Editable list (Do's / Don'ts) used inside the property-level tone override
 * editor. Mirrors the read-only list styling so the editor feels like an
 * in-place edit of the same cards.
 */
function ToneListEditor({
  title,
  items,
  onChange,
  accent,
  placeholder,
  inheritedSource,
}: {
  title: string;
  items: string[];
  onChange: (next: string[]) => void;
  accent: "emerald" | "red";
  placeholder: string;
  inheritedSource: CascadeLevel;
}) {
  const [draft, setDraft] = useState("");
  const titleColor = accent === "emerald" ? "text-emerald-700" : "text-red-700";
  const iconColor = accent === "emerald" ? "text-emerald-500" : "text-red-500";
  const Icon = accent === "emerald" ? CheckCircle : XCircle;

  const addItem = () => {
    const value = draft.trim();
    if (!value) return;
    onChange([...items, value]);
    setDraft("");
  };

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <p className={`text-sm font-semibold ${titleColor}`}>{title}</p>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Inherited from {inheritedSource}
        </span>
      </div>
      <ul className="space-y-1.5 mb-3">
        {items.length === 0 && (
          <li className="text-xs text-muted-foreground italic">No items yet — add one below.</li>
        )}
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
            <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${iconColor}`} />
            <span className="flex-1">{item}</span>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-zinc-100 hover:text-red-600 transition-colors"
              aria-label={`Remove ${title} item`}
            >
              <X className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-1.5">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
          className="input-base text-sm flex-1"
          placeholder={placeholder}
        />
        <Button type="button" size="sm" variant="outline" onClick={addItem} className="gap-1 shrink-0">
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>
    </div>
  );
}

/* ─── Voice Section ─── */

const ALL_VOICE_LANGUAGES = ["English", "Spanish", "French", "German", "Italian", "Portuguese", "Hindi"];

function AgentVoiceSection({
  agentName, agentId, property, voice, vertOvr, propOvr,
}: {
  agentName: string;
  agentId: string;
  property: { name: string; vertical: string };
  voice: ReturnType<typeof useVoice>;
  vertOvr: ReturnType<typeof useVoice>["verticalOverrides"][0] | undefined;
  propOvr: ReturnType<typeof useVoice>["propertyOverrides"][0] | undefined;
}) {
  const gender = resolveVoiceField(voice, "voiceGender", vertOvr, propOvr);
  const accent = resolveVoiceField(voice, "voiceAccent", vertOvr, propOvr);
  const languages = resolveVoiceField(voice, "voiceLanguages", vertOvr, propOvr);
  const aiVoiceEnabled = resolveVoiceField(voice, "aiVoiceEnabled", vertOvr, propOvr);
  const autoDetectLanguage = resolveVoiceField(voice, "autoDetectLanguage", vertOvr, propOvr);
  const recordAudio = resolveVoiceField(voice, "recordAudio", vertOvr, propOvr);
  const generateTranscripts = resolveVoiceField(voice, "generateTranscripts", vertOvr, propOvr);
  const legalDisclosureEnabled = resolveVoiceField(voice, "legalDisclosureEnabled", vertOvr, propOvr);
  const legalDisclosureText = resolveVoiceField(voice, "legalDisclosureText", vertOvr, propOvr);
  const greeting = resolveVoiceField(voice, "greeting", vertOvr, propOvr);
  const holdPhrase = resolveVoiceField(voice, "holdPhrase", vertOvr, propOvr);
  const maxCallLength = resolveVoiceField(voice, "maxCallLength", vertOvr, propOvr);
  const aiDisclosure = resolveVoiceField(voice, "aiDisclosureEnabled", vertOvr, propOvr);

  const hasVerticalVoice = vertOvr?.voiceSettings && Object.keys(vertOvr.voiceSettings).length > 0;
  const hasPropertyVoice = propOvr?.voiceSettings && Object.keys(propOvr.voiceSettings).length > 0;

  // The per-agent + per-property override is presented to the user as the
  // "Property" override on this screen — the Agent cascade dot was removed so
  // the inheritance reads consistently with the Tone tab (Company → Vertical
  // → Property). Persistence still goes through `agentTuning` so we don't break
  // existing reads; future cleanup could migrate this to
  // `agentPropertyVoiceOverrides` for a single source of truth.
  const agentOvr = voice.agentTuning.find(
    t => t.agentId === agentId && t.propertyName === property.name,
  );
  const ovr = agentOvr?.voiceOverrides;
  const hasAgentVoiceOverride = !!ovr;
  const hasAnyPropertyOverride = !!hasPropertyVoice || hasAgentVoiceOverride;

  const [editing, setEditing] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [draftGender, setDraftGender] = useState<VoiceSettings["voiceGender"]>(ovr?.voiceGender ?? gender.value);
  const [draftAccent, setDraftAccent] = useState<VoiceSettings["voiceAccent"]>(ovr?.voiceAccent ?? accent.value);
  const [draftLanguages, setDraftLanguages] = useState<string[]>(ovr?.voiceLanguages ?? languages.value);
  const [draftAutoDetect, setDraftAutoDetect] = useState(ovr?.autoDetectLanguage ?? autoDetectLanguage.value);
  const [draftRecordAudio, setDraftRecordAudio] = useState(ovr?.recordAudio ?? recordAudio.value);
  const [draftGenerateTranscripts, setDraftGenerateTranscripts] = useState(ovr?.generateTranscripts ?? generateTranscripts.value);
  const [draftLegalEnabled, setDraftLegalEnabled] = useState(ovr?.legalDisclosureEnabled ?? legalDisclosureEnabled.value);
  const [draftLegalText, setDraftLegalText] = useState(ovr?.legalDisclosureText ?? legalDisclosureText.value);
  const [draftGreeting, setDraftGreeting] = useState(ovr?.greeting ?? greeting.value);
  const [draftHoldPhrase, setDraftHoldPhrase] = useState(ovr?.holdPhrase ?? holdPhrase.value);
  const [draftMaxCallLength, setDraftMaxCallLength] = useState(ovr?.maxCallLength ?? maxCallLength.value);
  const [draftAiDisclosure, setDraftAiDisclosure] = useState(ovr?.aiDisclosureEnabled ?? aiDisclosure.value);

  const startEditing = () => {
    setDraftGender(ovr?.voiceGender ?? gender.value);
    setDraftAccent(ovr?.voiceAccent ?? accent.value);
    setDraftLanguages(ovr?.voiceLanguages ?? [...languages.value]);
    setDraftAutoDetect(ovr?.autoDetectLanguage ?? autoDetectLanguage.value);
    setDraftRecordAudio(ovr?.recordAudio ?? recordAudio.value);
    setDraftGenerateTranscripts(ovr?.generateTranscripts ?? generateTranscripts.value);
    setDraftLegalEnabled(ovr?.legalDisclosureEnabled ?? legalDisclosureEnabled.value);
    setDraftLegalText(ovr?.legalDisclosureText ?? legalDisclosureText.value);
    setDraftGreeting(ovr?.greeting ?? greeting.value);
    setDraftHoldPhrase(ovr?.holdPhrase ?? holdPhrase.value);
    setDraftMaxCallLength(ovr?.maxCallLength ?? maxCallLength.value);
    setDraftAiDisclosure(ovr?.aiDisclosureEnabled ?? aiDisclosure.value);
    setAdvancedOpen(false);
    setEditing(true);
  };

  const saveOverride = () => {
    const voiceOverrides: Partial<VoiceSettings> = {
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
    };
    if (agentOvr) {
      voice.updateAgentTuning(agentId, { voiceOverrides }, property.name);
    } else {
      voice.addAgentTuning({ agentId, agentName, propertyName: property.name, voiceOverrides });
    }
    setEditing(false);
  };

  const resetOverride = () => {
    if (agentOvr) {
      voice.updateAgentTuning(agentId, { voiceOverrides: undefined }, property.name);
    }
    setEditing(false);
  };

  const effectiveGender = hasAgentVoiceOverride ? ovr!.voiceGender ?? gender.value : gender.value;
  const effectiveAccent = hasAgentVoiceOverride ? ovr!.voiceAccent ?? accent.value : accent.value;
  const effectiveLanguages = hasAgentVoiceOverride ? ovr!.voiceLanguages ?? languages.value : languages.value;
  // Per-agent-per-property edits are surfaced as "Property" level overrides on
  // this screen (no separate "Agent" tier in the cascade UI here).
  const genderSource: CascadeLevel = hasAgentVoiceOverride && ovr!.voiceGender ? "Property" : gender.source;
  const accentSource: CascadeLevel = hasAgentVoiceOverride && ovr!.voiceAccent ? "Property" : accent.source;
  const languagesSource: CascadeLevel = hasAgentVoiceOverride && ovr!.voiceLanguages ? "Property" : languages.source;
  const autoDetectSource: CascadeLevel = hasAgentVoiceOverride && ovr!.autoDetectLanguage !== undefined ? "Property" : autoDetectLanguage.source;
  const recordAudioSource: CascadeLevel = hasAgentVoiceOverride && ovr!.recordAudio !== undefined ? "Property" : recordAudio.source;
  const transcriptsSource: CascadeLevel = hasAgentVoiceOverride && ovr!.generateTranscripts !== undefined ? "Property" : generateTranscripts.source;
  const legalSource: CascadeLevel = hasAgentVoiceOverride && ovr!.legalDisclosureEnabled !== undefined ? "Property" : legalDisclosureEnabled.source;
  const greetingSource: CascadeLevel = hasAgentVoiceOverride && ovr!.greeting !== undefined ? "Property" : greeting.source;
  const holdPhraseSource: CascadeLevel = hasAgentVoiceOverride && ovr!.holdPhrase !== undefined ? "Property" : holdPhrase.source;
  const maxCallSource: CascadeLevel = hasAgentVoiceOverride && ovr!.maxCallLength !== undefined ? "Property" : maxCallLength.source;
  const disclosureSource: CascadeLevel = hasAgentVoiceOverride && ovr!.aiDisclosureEnabled !== undefined ? "Property" : aiDisclosure.source;

  const effectiveRecordAudio = hasAgentVoiceOverride && ovr!.recordAudio !== undefined ? ovr!.recordAudio : recordAudio.value;
  const effectiveTranscripts = hasAgentVoiceOverride && ovr!.generateTranscripts !== undefined ? ovr!.generateTranscripts : generateTranscripts.value;
  const effectiveAutoDetect = hasAgentVoiceOverride && ovr!.autoDetectLanguage !== undefined ? ovr!.autoDetectLanguage : autoDetectLanguage.value;
  const effectiveLegalEnabled = hasAgentVoiceOverride && ovr!.legalDisclosureEnabled !== undefined ? ovr!.legalDisclosureEnabled : legalDisclosureEnabled.value;
  const effectiveGreeting = hasAgentVoiceOverride && ovr!.greeting !== undefined ? ovr!.greeting : greeting.value;
  const effectiveHoldPhrase = hasAgentVoiceOverride && ovr!.holdPhrase !== undefined ? ovr!.holdPhrase : holdPhrase.value;
  const effectiveMaxCallLength = hasAgentVoiceOverride && ovr!.maxCallLength !== undefined ? ovr!.maxCallLength : maxCallLength.value;
  const effectiveAiDisclosure = hasAgentVoiceOverride && ovr!.aiDisclosureEnabled !== undefined ? ovr!.aiDisclosureEnabled : aiDisclosure.value;

  return (
    <>
      <div className="mt-6 rounded-xl border border-border bg-zinc-50/50 px-4 pt-4 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Cascade Inheritance</p>
            <CascadeDots
              hasVertical={!!hasVerticalVoice}
              hasProperty={hasAnyPropertyOverride}
              hasAgent={false}
              rootLabel="Company"
              includeAgent={false}
            />
          </div>
          <div className="flex items-center gap-2">
            {hasAgentVoiceOverride ? (
              <>
                <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50 text-xs">Property Override Active</Badge>
                {!editing && (
                  <Button variant="outline" size="sm" onClick={startEditing} className="gap-1">
                    <Pencil className="h-3 w-3" /> Edit Property Override
                  </Button>
                )}
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={startEditing} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Add Property Override
              </Button>
            )}
          </div>
        </div>
      </div>

      {!editing && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-border bg-white p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground">AI Voice</p>
              <SourceBadge source={aiVoiceEnabled.source} />
            </div>
            <p className="text-sm text-muted-foreground">{aiVoiceEnabled.value ? "Enabled" : "Disabled"}</p>
          </div>

          {aiVoiceEnabled.value && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-white p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-foreground">Voice</p>
                    <SourceBadge source={genderSource} />
                  </div>
                  <p className="text-sm text-muted-foreground capitalize">{effectiveGender}</p>
                </div>
                <div className="rounded-xl border border-border bg-white p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-foreground">Voice</p>
                    <SourceBadge source={accentSource} />
                  </div>
                  <p className="text-sm text-muted-foreground">{ACCENT_LABELS[effectiveAccent] ?? effectiveAccent}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-foreground">Languages</p>
                  <SourceBadge source={languagesSource} />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {effectiveLanguages.map((lang) => (
                    <span key={lang} className="inline-flex rounded-full border border-border bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {lang}
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Auto-detect: {effectiveAutoDetect ? "On" : "Off"}</span>
                  <SourceBadge source={autoDetectSource} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-white p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-foreground">Record Audio</p>
                    <SourceBadge source={recordAudioSource} />
                  </div>
                  <p className="text-sm text-muted-foreground">{effectiveRecordAudio ? "On" : "Off"}</p>
                </div>
                <div className="rounded-xl border border-border bg-white p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-foreground">Transcripts</p>
                    <SourceBadge source={transcriptsSource} />
                  </div>
                  <p className="text-sm text-muted-foreground">{effectiveTranscripts ? "On" : "Off"}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-foreground">Legal Disclosure</p>
                  <SourceBadge source={legalSource} />
                </div>
                <p className="text-sm text-muted-foreground">{effectiveLegalEnabled ? "On" : "Off"}</p>
              </div>

              <div className="rounded-xl border border-border bg-white p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-foreground">Greeting</p>
                  <SourceBadge source={greetingSource} />
                </div>
                <p className="text-sm text-muted-foreground">{effectiveGreeting || "Not configured"}</p>
              </div>

              <div className="rounded-xl border border-border bg-white p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-foreground">Hold Phrase</p>
                  <SourceBadge source={holdPhraseSource} />
                </div>
                <p className="text-sm text-muted-foreground">{effectiveHoldPhrase || "Not configured"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-white p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-foreground">Max Call Length</p>
                    <SourceBadge source={maxCallSource} />
                  </div>
                  <p className="text-sm text-muted-foreground">{effectiveMaxCallLength} minutes</p>
                </div>
                <div className="rounded-xl border border-border bg-white p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-foreground">AI Disclosure</p>
                    <SourceBadge source={disclosureSource} />
                  </div>
                  <p className="text-sm text-muted-foreground">{effectiveAiDisclosure ? "On" : "Off"}</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {editing && (
        <div className="mt-6 space-y-5">
          <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/30 p-5 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Home className="h-4 w-4 text-emerald-600" />
              <p className="text-sm font-semibold text-foreground">Property-Level Voice Override</p>
              <span className="text-xs text-muted-foreground">for {agentName} at {property.name}</span>
            </div>
            <p className="-mt-3 text-xs text-muted-foreground">
              Changes save as a property-level override and will appear in the centralized
              Agent Voice &amp; Tone settings. Company and Vertical defaults aren&apos;t editable
              from this screen.
            </p>

            <div>
              <label className="mb-2 block text-sm font-medium">Voice Gender</label>
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
                    className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium capitalize transition-all ${
                      draftGender === g ? "border-emerald-500 bg-emerald-50 text-foreground" : "border-border text-muted-foreground hover:border-emerald-300"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Inherited: {gender.value} ({gender.source})</p>
            </div>

            <div>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <label className="block text-sm font-medium">Voice</label>
                <span className="text-[11px] text-muted-foreground">Nova 2 Sonic · {draftGender} voices</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {getNova2VoicesByGender(draftGender).map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setDraftAccent(v.id)}
                    className={`rounded-lg border-2 px-3 py-2 text-left text-sm font-medium transition-all ${
                      draftAccent === v.id ? "border-emerald-500 bg-emerald-50 text-foreground" : "border-border text-muted-foreground hover:border-emerald-300"
                    }`}
                  >
                    <span className="block font-semibold text-foreground">{v.label}</span>
                    <span className="block text-[10px] font-normal text-muted-foreground">{v.accent}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Inherited: {ACCENT_LABELS[accent.value] ?? accent.value} ({accent.source})</p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium">Languages</label>
                <label className="relative inline-flex cursor-pointer items-center gap-2">
                  <span className="text-xs text-muted-foreground">Auto-detect</span>
                  <div className="relative">
                    <input type="checkbox" checked={draftAutoDetect} onChange={(e) => setDraftAutoDetect(e.target.checked)} className="peer sr-only" />
                    <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-emerald-500 transition-colors" />
                    <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                  </div>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {ALL_VOICE_LANGUAGES.map((lang) => {
                  const enabled = draftLanguages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setDraftLanguages(prev => enabled ? prev.filter(l => l !== lang) : [...prev, lang]);
                      }}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        enabled ? "border-emerald-400 bg-emerald-50 text-foreground" : "border-border text-muted-foreground hover:border-emerald-300"
                      }`}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Inherited: {languages.source} level</p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium">Recording & Transcripts</label>
              <div className="flex items-center justify-between rounded-lg border border-border bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Record audio</p>
                  <p className="text-xs text-muted-foreground">Inherited: {recordAudio.value ? "On" : "Off"} ({recordAudio.source})</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" checked={draftRecordAudio} onChange={(e) => setDraftRecordAudio(e.target.checked)} className="peer sr-only" />
                  <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-emerald-500 transition-colors" />
                  <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                </label>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Generate transcripts</p>
                  <p className="text-xs text-muted-foreground">Inherited: {generateTranscripts.value ? "On" : "Off"} ({generateTranscripts.source})</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" checked={draftGenerateTranscripts} onChange={(e) => setDraftGenerateTranscripts(e.target.checked)} className="peer sr-only" />
                  <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-emerald-500 transition-colors" />
                  <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Legal Disclosure</label>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" checked={draftLegalEnabled} onChange={(e) => setDraftLegalEnabled(e.target.checked)} className="peer sr-only" />
                  <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-emerald-500 transition-colors" />
                  <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                </label>
              </div>
              {draftLegalEnabled && (
                <textarea
                  value={draftLegalText}
                  onChange={(e) => setDraftLegalText(e.target.value)}
                  rows={3}
                  className="input-base resize-y text-sm"
                  placeholder="This call may be recorded for quality assurance..."
                />
              )}
              <p className="text-xs text-muted-foreground">Inherited: {legalDisclosureEnabled.value ? "On" : "Off"} ({legalDisclosureEnabled.source})</p>
            </div>

            <button
              type="button"
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="flex w-full items-center justify-between rounded-lg border border-border bg-white px-4 py-3 text-left transition-colors hover:bg-zinc-50"
            >
              <p className="text-sm font-medium text-foreground">Advanced — greeting, hold phrase, call limits</p>
              {advancedOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {advancedOpen && (
              <div className="space-y-4 rounded-lg border border-border bg-white p-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Greeting</label>
                  <input
                    type="text"
                    value={draftGreeting}
                    onChange={(e) => setDraftGreeting(e.target.value)}
                    className="input-base text-sm"
                    placeholder="Hi, thank you for calling {property}..."
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Inherited: {greeting.source} level</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Hold phrase</label>
                  <input
                    type="text"
                    value={draftHoldPhrase}
                    onChange={(e) => setDraftHoldPhrase(e.target.value)}
                    className="input-base text-sm"
                    placeholder="One moment while I look that up..."
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Inherited: {holdPhrase.source} level</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Max call length: {draftMaxCallLength} min</label>
                  <input
                    type="range"
                    min={1}
                    max={60}
                    value={draftMaxCallLength}
                    onChange={(e) => setDraftMaxCallLength(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground"><span>1 min</span><span>60 min</span></div>
                  <p className="mt-1 text-xs text-muted-foreground">Inherited: {maxCallLength.value} min ({maxCallLength.source})</p>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">AI disclosure</p>
                    <p className="text-xs text-muted-foreground">Inherited: {aiDisclosure.value ? "On" : "Off"} ({aiDisclosure.source})</p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" checked={draftAiDisclosure} onChange={(e) => setDraftAiDisclosure(e.target.checked)} className="peer sr-only" />
                    <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-emerald-500 transition-colors" />
                    <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button size="sm" onClick={saveOverride} className="gap-1">
              <Save className="h-3.5 w-3.5" /> Save Override
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            {hasAgentVoiceOverride && (
              <Button variant="outline" size="sm" onClick={resetOverride} className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto gap-1">
                <RotateCcw className="h-3.5 w-3.5" /> Reset to Inherited
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const AGENT_FLYOUT_DESCRIPTIONS: Record<string, string> = {
  "Leasing AI": "Automate lead nurturing, scheduling tours, and processing application questions.",
  "Payments AI": "Handle rent payments, fees, and payment-related questions automatically.",
  "Maintenance AI": "Manage work orders, follow-up scheduling, and maintenance requests.",
  "Renewal AI": "Automate renewal conversations, offers, and retention outreach.",
};

type SettingsNav = "property" | "agent-settings" | "voice-tone" | "simulation" | "internal-demo" | "history";

const AGENTS_WITH_HISTORY = new Set<string>([
  "Maintenance AI",
  "Payments AI",
  "Leasing AI",
  "Renewal AI",
]);

/**
 * The four ELI+ agents. These all get a "Simulation" tab (formerly named
 * "Internal Demo"). For each agent it embeds the live demo iframe. If an
 * agent's demo URL is not yet configured in INTERNAL_DEMO_AGENTS, the panel
 * falls back to a Coming Soon placeholder.
 */
const ELI_PLUS_AGENTS = new Set<string>([
  "Leasing AI",
  "Renewal AI",
  "Payments AI",
  "Maintenance AI",
]);

function getAgentSubPages(agentName: string): { id: SettingsNav; label: string }[] {
  const pages: { id: SettingsNav; label: string }[] = [
    { id: "agent-settings", label: `${agentName} Settings` },
    { id: "voice-tone", label: "Voice & Tone" },
    // NOTE: legacy "Simulation" tab intentionally hidden from the nav.
    // The "simulation" id, AgentSimulationPanel, and routing branch are kept
    // intact so we can re-enable later without code churn.
    // { id: "simulation", label: "Simulation" },
  ];
  if (AGENTS_WITH_HISTORY.has(agentName)) {
    pages.push({ id: "history", label: "History & Logging" });
  }
  if (ELI_PLUS_AGENTS.has(agentName)) {
    pages.push({ id: "internal-demo", label: "Simulation" });
  }
  return pages;
}

function SimplifiedSettingsDetail({ agentName, property, onBack }: { agentName: string; property: typeof AGENT_FLYOUT_PROPERTIES[0]; onBack: () => void }) {
  const tabs = AGENT_SETTINGS_TABS[agentName] ?? [];
  const agentSubPages = useMemo(() => getAgentSubPages(agentName), [agentName]);
  const [activeNav, setActiveNav] = useState<SettingsNav>("property");
  const isPaymentsAI = agentName === "Payments AI";
  const resolvedPropertySettings = useMemo(
    () => (isPaymentsAI ? resolvePropertySettings(property.id, property.name) : null),
    [isPaymentsAI, property.id, property.name],
  );
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
            {isPaymentsAI && (
              <div className="mt-4 flex gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The settings listed below are a summarized view of this property&apos;s payment configuration. Navigate to{" "}
                  <span className="font-medium text-foreground">Property Settings</span> in Entrata for a comprehensive view of all settings.
                </p>
              </div>
            )}
            <div className="mt-8 space-y-10">
              <TooltipProvider delayDuration={200}>
              {tabs.map(section => (
                <div key={section.id}>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{section.label}</h3>
                  <div className="space-y-3">
                    {section.settings.map(setting => (
                      isPaymentsAI ? (
                      <button
                        key={setting.name}
                        type="button"
                        className="w-full flex items-center gap-4 rounded-xl border border-border bg-white p-4 text-left transition-all hover:border-zinc-400 hover:shadow-md group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-foreground">{setting.name}</p>
                            {setting.description && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className="inline-flex rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.stopPropagation()}
                                    aria-label={`About ${setting.name}`}
                                  >
                                    <Info className="h-3.5 w-3.5" aria-hidden />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs text-left leading-snug">
                                  {setting.description}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          {resolvedPropertySettings && (() => {
                            const resolvedValue = getSettingValueByName(resolvedPropertySettings, setting.name);
                            return resolvedValue ? (
                              <p className="text-xs font-medium text-foreground mt-1 leading-relaxed">{resolvedValue}</p>
                            ) : null;
                          })()}
                        </div>
                        <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 group-hover:bg-zinc-700 transition-colors">
                          {setting.link ? <ExternalLink className="h-4 w-4 text-white" /> : <ArrowRight className="h-4 w-4 text-white" />}
                        </div>
                      </button>
                      ) : (
                      <a
                        key={setting.name}
                        href={setting.link ?? "#"}
                        target={setting.link ? "_blank" : undefined}
                        rel={setting.link ? "noopener noreferrer" : undefined}
                        onClick={setting.link ? undefined : (e => e.preventDefault())}
                        className="flex items-center gap-4 rounded-xl border border-border bg-white p-4 text-left transition-all hover:border-zinc-400 hover:shadow-md group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{setting.name}</p>
                          {setting.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{setting.description}</p>
                          )}
                        </div>
                        <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 group-hover:bg-zinc-700 transition-colors">
                          {setting.link ? <ExternalLink className="h-4 w-4 text-white" /> : <ArrowRight className="h-4 w-4 text-white" />}
                        </div>
                      </a>
                      )
                    ))}
                  </div>
                </div>
              ))}
              </TooltipProvider>
            </div>
          </div>
        ) : activeNav === "agent-settings" ? (
          agentName === "Leasing AI" ? (
            <div className="relative h-full">
              <LeasingAISettingsPanel
                propertyName={property.name}
                agentDisplayLabel={`ELI+ ${agentName}`}
                simulationCount={simulationCount}
                onOpenSimulation={() => setActiveNav("internal-demo")}
              />
            </div>
          ) : agentName === "Payments AI" ? (
            <div className="relative h-full">
              <PaymentsAISettingsPanel
                propertyName={property.name}
                propertyId={property.id}
                agentDisplayLabel={`ELI+ ${agentName}`}
              />
            </div>
          ) : agentName === "Maintenance AI" ? (
            <MaintenanceAISettingsPanel
              propertyName={property.name}
              agentDisplayLabel={`ELI+ ${agentName}`}
            />
          ) : agentName === "Renewal AI" ? (
            <RenewalsAISettingsPanel
              propertyName={property.name}
              propertyId={property.id}
              agentDisplayLabel={`ELI+ ${agentName}`}
            />
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
        ) : activeNav === "voice-tone" ? (
          <AgentVoiceTonePanel agentName={agentName} property={property} />
        ) : activeNav === "simulation" ? (
          <AgentSimulationPanel
            agentName={agentName}
            propertyName={property.name}
            onSimulationStarted={() => setSimulationCount((n) => n + 1)}
          />
        ) : activeNav === "internal-demo" ? (
          <InternalDemoPanel agentName={agentName} propertyName={property.name} />
        ) : (
          <AgentHistoryPanel agentName={agentName} propertyName={property.name} />
        )}
      </main>
    </div>
  );
}

type CloneSettingType = "communication_windows" | "offer_follow_ups" | "lease_follow_ups";

function EliPlusSettingsFlyout({ agentName, SettingsPage }: { agentName: string; SettingsPage: React.ComponentType<FlyoutPageProps> }) {
  const [selectedProperty, setSelectedProperty] = useState<typeof AGENT_FLYOUT_PROPERTIES[0] | null>(null);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => new Set(AGENT_FLYOUT_PROPERTIES.map(p => p.id)));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDraft, setPickerDraft] = useState<Set<string>>(() => new Set(visibleIds));
  const [pickerSearch, setPickerSearch] = useState("");
  const [sortField, setSortField] = useState<"name" | "vertical" | "status">("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [activatePopover, setActivatePopover] = useState<string | null>(null);
  const isPaymentsAI = agentName === "Payments AI";
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkApplied, setBulkApplied] = useState<{ sections: string[]; count: number } | null>(null);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [bulkSelectionScope, setBulkSelectionScope] = useState<BulkSelectionScope>("property-groups");
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(() => new Set());
  const exitBulkSelect = () => {
    setBulkSelectMode(false);
    setBulkSelectionScope("property-groups");
    setBulkSelectedIds(new Set());
  };

  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneSource, setCloneSource] = useState<string | null>(null);
  const [cloneSettings, setCloneSettings] = useState<Set<CloneSettingType>>(new Set(["communication_windows", "offer_follow_ups", "lease_follow_ups"]));
  const [cloneTargets, setCloneTargets] = useState<Set<string>>(new Set());
  const [cloneSuccess, setCloneSuccess] = useState(false);

  const activeProperties = AGENT_FLYOUT_PROPERTIES.filter(p => p.status === "Active");
  const isRenewalAI = agentName === "Renewal AI";

  const openCloneDialog = () => {
    setCloneSource(null);
    setCloneSettings(new Set(["communication_windows", "offer_follow_ups", "lease_follow_ups"]));
    setCloneTargets(new Set());
    setCloneSuccess(false);
    setCloneOpen(true);
  };

  const toggleCloneSetting = (s: CloneSettingType) => {
    setCloneSettings(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  const toggleCloneTarget = (id: string) => {
    setCloneTargets(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllTargets = () => {
    const eligible = activeProperties.filter(p => p.id !== cloneSource).map(p => p.id);
    setCloneTargets(new Set(eligible));
  };

  const deselectAllTargets = () => setCloneTargets(new Set());

  const handleClone = () => setCloneSuccess(true);

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

  const bulkSelectedInFiltered = AGENT_FLYOUT_PROPERTIES.filter((p) => bulkSelectedIds.has(p.id));
  const bulkSelectedGroupLabels = getSelectedGroupLabels(
    buildPaymentsAIBulkCategories(filtered.map((p) => p.id)),
    bulkSelectedIds,
  );

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

  if (bulkEditOpen && isPaymentsAI) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-border bg-white px-6 py-3">
          <button
            type="button"
            onClick={() => setBulkEditOpen(false)}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-zinc-100 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to {agentName}
          </button>
        </div>
        <div className="relative flex-1 min-h-0">
          <PaymentsAISettingsPanel
            propertyName=""
            agentDisplayLabel={`ELI+ ${agentName}`}
            bulkMode
            bulkCount={bulkSelectedInFiltered.length}
            bulkPropertyNames={bulkSelectedInFiltered.map(p => p.name)}
            bulkSelectedGroupLabels={bulkSelectedGroupLabels}
            onBulkApply={(sections) => {
              setBulkApplied({ sections, count: bulkSelectedInFiltered.length });
              setBulkEditOpen(false);
              exitBulkSelect();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col">
    <div className={`h-full overflow-y-auto px-8 py-8 ${bulkSelectMode ? "pb-28" : ""}`} onClick={() => activatePopover && setActivatePopover(null)}>
      <div className="flex items-center gap-2.5">
        <img src="/eli-cube.svg" alt="" width={28} height={28} />
        <h1 className="text-2xl font-bold text-foreground">{agentName}</h1>
      </div>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">{AGENT_FLYOUT_DESCRIPTIONS[agentName] ?? ""}</p>

      <div className="mt-8">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <button
            type="button"
            onClick={openPicker}
            className="h-9 flex items-center gap-2 rounded-lg border border-border bg-white pl-3 pr-3 text-sm text-foreground hover:border-zinc-400 transition-colors"
          >
            {filterLabel} <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-1" />
          </button>
          {isRenewalAI && activeProperties.length > 1 && (
            <button
              type="button"
              onClick={openCloneDialog}
              className="h-9 flex items-center gap-2 rounded-lg border border-border bg-white pl-3 pr-3 text-sm text-foreground hover:border-zinc-400 transition-colors"
            >
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              Clone Settings
            </button>
          )}
          {isPaymentsAI && (
            bulkSelectMode ? (
              <button
                type="button"
                onClick={exitBulkSelect}
                className="h-9 flex items-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-medium text-foreground hover:border-zinc-400 transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setBulkSelectMode(true)}
                disabled={filtered.length === 0}
                className="h-9 flex items-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-medium text-foreground hover:border-zinc-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Pencil className="h-3.5 w-3.5" /> Bulk edit settings
              </button>
            )
          )}
        </div>

        {bulkSelectMode && isPaymentsAI ? (
          <PaymentsAIBulkPropertySelector
            properties={filtered}
            selectedIds={bulkSelectedIds}
            onSelectedIdsChange={setBulkSelectedIds}
            scope={bulkSelectionScope}
            onScopeChange={setBulkSelectionScope}
          />
        ) : (
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
        )}
      </div>

      {bulkApplied && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={() => setBulkApplied(null)}>
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 px-6 pt-6">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-foreground">
                  {bulkApplied.sections.length === 0
                    ? "No changes to apply"
                    : `Applied to ${bulkApplied.count} ${bulkApplied.count === 1 ? "property" : "properties"}`}
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {bulkApplied.sections.length === 0
                    ? "You didn't change any settings, so nothing was applied."
                    : <>These areas were applied to the {bulkApplied.count} selected {bulkApplied.count === 1 ? "property" : "properties"}: <strong className="text-foreground">{bulkApplied.sections.join(", ")}</strong>. Per-property settings you didn&apos;t change were left as-is.</>}
                </p>
              </div>
            </div>
            <div className="flex justify-end px-6 py-5">
              <button
                type="button"
                onClick={() => setBulkApplied(null)}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

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

      {cloneOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => setCloneOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 flex flex-col" style={{ maxHeight: "85vh" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground">Clone Renewal AI Settings</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Copy settings from one property to others.</p>
              </div>
              <button type="button" onClick={() => setCloneOpen(false)} className="p-1 rounded-md hover:bg-zinc-100 text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {cloneSuccess ? (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 mb-4">
                  <CheckCircle className="h-7 w-7 text-emerald-600" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">Settings cloned successfully</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
                  {cloneSettings.size} setting{cloneSettings.size !== 1 ? "s" : ""} from <strong>{activeProperties.find(p => p.id === cloneSource)?.name}</strong> {cloneSettings.size !== 1 ? "have" : "has"} been applied to {cloneTargets.size} propert{cloneTargets.size !== 1 ? "ies" : "y"}.
                </p>
                <button type="button" onClick={() => setCloneOpen(false)} className="px-6 py-2 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors">
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">
                  {/* Step 1: Source property */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white">1</span>
                      <p className="text-sm font-semibold text-foreground">Select source property</p>
                    </div>
                    <p className="text-xs text-muted-foreground ml-7">Choose the property whose settings you want to copy from.</p>
                    <div className="ml-7 grid grid-cols-2 gap-1.5">
                      {activeProperties.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { setCloneSource(p.id); setCloneTargets(prev => { const n = new Set(prev); n.delete(p.id); return n; }); }}
                          className={`text-left px-3 py-2 text-sm rounded-lg border transition-all ${
                            cloneSource === p.id
                              ? "border-zinc-900 bg-zinc-50 font-medium"
                              : "border-border hover:border-zinc-400"
                          }`}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: Which settings */}
                  {cloneSource && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white">2</span>
                        <p className="text-sm font-semibold text-foreground">Choose settings to clone</p>
                      </div>
                      <p className="text-xs text-muted-foreground ml-7">Select which configuration sections to copy.</p>
                      <div className="ml-7 space-y-1.5">
                        {([
                          { id: "communication_windows" as CloneSettingType, label: "Communication Windows", desc: "Send time and allowed days" },
                          { id: "offer_follow_ups" as CloneSettingType, label: "Renewal Offer Follow-Ups", desc: "Follow-up schedule for pending offers" },
                          { id: "lease_follow_ups" as CloneSettingType, label: "Renewal Lease Follow-Ups", desc: "Follow-up schedule for unsigned leases" },
                        ]).map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleCloneSetting(s.id)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all flex items-center gap-3 ${
                              cloneSettings.has(s.id)
                                ? "border-zinc-900 bg-zinc-50"
                                : "border-border hover:border-zinc-400"
                            }`}
                          >
                            <div className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                              cloneSettings.has(s.id) ? "bg-zinc-900 border-zinc-900" : "border-zinc-300"
                            }`}>
                              {cloneSettings.has(s.id) && <CheckCircle2 className="h-3 w-3 text-white" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{s.label}</p>
                              <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 3: Target properties */}
                  {cloneSource && cloneSettings.size > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white">3</span>
                        <p className="text-sm font-semibold text-foreground">Select target properties</p>
                      </div>
                      <div className="ml-7 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">Choose which properties will receive the cloned settings.</p>
                        <div className="flex gap-2">
                          <button type="button" onClick={selectAllTargets} className="text-[11px] font-medium text-foreground hover:underline">Select all</button>
                          <span className="text-zinc-300">|</span>
                          <button type="button" onClick={deselectAllTargets} className="text-[11px] font-medium text-muted-foreground hover:underline">Clear</button>
                        </div>
                      </div>
                      <div className="ml-7 grid grid-cols-2 gap-1.5">
                        {activeProperties.filter(p => p.id !== cloneSource).map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => toggleCloneTarget(p.id)}
                            className={`text-left px-3 py-2 text-sm rounded-lg border transition-all flex items-center gap-2 ${
                              cloneTargets.has(p.id)
                                ? "border-zinc-900 bg-zinc-50 font-medium"
                                : "border-border hover:border-zinc-400"
                            }`}
                          >
                            <div className={`flex h-3.5 w-3.5 items-center justify-center rounded border transition-colors shrink-0 ${
                              cloneTargets.has(p.id) ? "bg-zinc-900 border-zinc-900" : "border-zinc-300"
                            }`}>
                              {cloneTargets.has(p.id) && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                            </div>
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {cloneSource && cloneSettings.size > 0 && cloneTargets.size > 0
                      ? `${cloneSettings.size} setting${cloneSettings.size !== 1 ? "s" : ""} → ${cloneTargets.size} propert${cloneTargets.size !== 1 ? "ies" : "y"}`
                      : "Complete all steps to clone"}
                  </p>
                  <button
                    type="button"
                    onClick={handleClone}
                    disabled={!cloneSource || cloneSettings.size === 0 || cloneTargets.size === 0}
                    className="px-6 py-2 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Clone Settings
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>

    {/* Continue bar — slides up once at least one property is selected. */}
    {isPaymentsAI && (
      <div
        className={`absolute inset-x-0 bottom-0 z-40 border-t border-border bg-white px-8 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] transition-transform duration-300 ease-out ${
          bulkSelectMode && bulkSelectedInFiltered.length > 0 ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{bulkSelectedInFiltered.length}</span>{" "}
            {bulkSelectedInFiltered.length === 1 ? "property" : "properties"} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exitBulkSelect}
              className="h-9 rounded-lg border border-border bg-white px-4 text-sm font-medium text-foreground hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setBulkEditOpen(true)}
              className="h-9 flex items-center gap-2 rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
            >
              Continue <ArrowRight className="h-4 w-4" />
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
