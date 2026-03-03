"use client";

import { Suspense, useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
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
import { useRole, isPropertyInScope } from "@/lib/role-context";
import { useContract } from "@/lib/contract-context";
import { cn } from "@/lib/utils";
import { useVault } from "@/lib/vault-context";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useTools } from "@/lib/tools-context";
import { Tag, X, DollarSign, Megaphone, Users, Wrench, ShieldCheck, Power, Activity, AlertCircle, Play, Clock, CheckCircle, XCircle, Calendar, Lightbulb, Target, Database, BarChart3, Pencil, Save, ArrowLeft, ArrowRight, Sparkles, BookOpen, Cog, Bot, MessageSquare, Shield, Zap, Eye, EyeOff, Globe, Mail, Phone, Volume2, Lock, ExternalLink } from "lucide-react";
import { Chat, type ChatMessage } from "@/components/ui/chat";

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
  { name: "Leasing AI", bucket: "Leasing & Marketing", type: "l4" },
  { name: "Renewal AI", bucket: "Resident Relations & Retention", type: "l4" },
  { name: "Maintenance AI", bucket: "Operations & Maintenance", type: "l4" },
  { name: "Payments AI", bucket: "Revenue & Financial Management", type: "l4" },
  { name: "Custom (from scratch)", bucket: BUCKETS[0], type: "l3" },
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
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <AgentRosterContent />
    </Suspense>
  );
}

function AgentRosterContent() {
  const searchParams = useSearchParams();
  const { agents: allAgents, addAgent, updateAgent } = useAgents();
  const { roleProperties } = useRole();
  const { contracted } = useContract();
  const agents = useMemo(() => {
    if (roleProperties === "all") return allAgents;
    return allAgents.filter((a) => isPropertyInScope(a.scope, roleProperties));
  }, [allAgents, roleProperties]);
  const { allLabels: workforceLabels } = useWorkforce();
  const { documents } = useVault();
  const [bucketFilter, setBucketFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState<AgentType | "All">("All");
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateAuto, setShowCreateAuto] = useState(false);
  const [opsAgentId, setOpsAgentId] = useState<string | null>(null);
  const [intelAgentId, setIntelAgentId] = useState<string | null>(null);
  const [autoAgentId, setAutoAgentId] = useState<string | null>(null);
  const [expandedBucket, setExpandedBucket] = useState<string | null>(null);
  const [showUnlockEli, setShowUnlockEli] = useState(false);

  const selectedId = opsAgentId ?? intelAgentId ?? autoAgentId;

  useEffect(() => {
    const agentId = searchParams.get("agent");
    if (!agentId) return;
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;
    if (agent.type === "l1") setOpsAgentId(agentId);
    else if (agent.type === "l2") setIntelAgentId(agentId);
    else setAutoAgentId(agentId); // l3, l4, l5 all use autonomous sheet
  }, [searchParams, agents]);

  const filtered = useMemo(() => {
    return agents.filter((a) => {
      if (bucketFilter !== "All" && a.bucket !== bucketFilter) return false;
      if (statusFilter !== "All" && a.status !== statusFilter) return false;
      if (typeFilter !== "All" && a.type !== typeFilter) return false;
      return true;
    });
  }, [agents, bucketFilter, statusFilter, typeFilter]);

  const byBucket = useMemo(() => {
    const map: Record<string, Agent[]> = {};
    BUCKETS.forEach((b) => { map[b] = []; });
    filtered.forEach((a) => {
      if (map[a.bucket]) map[a.bucket].push(a);
    });
    for (const bk of BUCKETS) {
      map[bk].sort((x, y) => (TYPE_LEVEL[y.type] ?? 0) - (TYPE_LEVEL[x.type] ?? 0));
    }
    return map;
  }, [filtered]);

  return (
    <>
      <PageHeader
        title="Agent Roster"
        description="Create, find, and manage AI agents. View config and performance per agent."
      />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select
          value={bucketFilter}
          onChange={(e) => setBucketFilter(e.target.value)}
          className="select-base w-auto min-w-[11rem]"
        >
          <option value="All">All domains</option>
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
            <option key={t.value} value={t.value}>{t.label}</option>
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
        <Button onClick={() => setShowTypeSelector(true)}>
          <Sparkles className="mr-1.5 h-4 w-4" /> Create Agent
        </Button>
      </div>

      <div>
        <div className="space-y-8">
          {BUCKETS.map((bucket) => {
            const items = byBucket[bucket] ?? [];
            const isExpanded = expandedBucket === bucket;
            const showCount = isExpanded ? items.length : Math.min(3, items.length);
            const visibleItems = items.slice(0, showCount);
            const hasMore = items.length > 3;

            return (
              <section key={bucket} className="rounded-lg border border-[hsl(var(--border))]/50 bg-white">
                <div className="border-b border-[hsl(var(--border))]/50 px-4 py-3">
                  <h2 className="section-title mb-0 flex items-center gap-2">
                    {(() => { const Icon = BUCKET_ICONS[bucket]; return Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null; })()}
                    {bucket} <span className="font-normal text-[hsl(var(--muted-foreground))]">({items.length})</span>
                  </h2>
                </div>
                <ul className="divide-y divide-[hsl(var(--border))]/50">
                  {items.length === 0 ? (
                    <li className="px-4 py-4 text-[length:var(--text-body)] text-[hsl(var(--muted-foreground))]">
                      No agents in this bucket.
                    </li>
                  ) : (
                    visibleItems.map((agent) => {
                      const needsContract = !contracted && (agent.type === "l4" || agent.type === "l3");
                      const isInactiveL4 = agent.type === "l4" && agent.status !== "Active" && agent.status !== "Shadow";
                      const isLocked = needsContract || isInactiveL4;
                      return (
                      <li
                        key={agent.id}
                        className={`relative flex cursor-pointer items-center justify-between gap-4 px-4 py-3 ${
                          isLocked
                            ? "bg-gray-50 dark:bg-gray-900/50"
                            : selectedId === agent.id ? "bg-[hsl(var(--muted))]/50" : "hover:bg-[hsl(var(--muted))]/30"
                        }`}
                        onClick={() => {
                          if (isLocked) {
                            setShowUnlockEli(true);
                            return;
                          }
                          if (needsContract) {
                            return;
                          }
                          agent.type === "l1" ? setOpsAgentId(agent.id) : agent.type === "l2" ? setIntelAgentId(agent.id) : setAutoAgentId(agent.id);
                        }}
                      >
                        <div className={`flex min-w-0 items-center gap-3 ${isLocked ? "opacity-50" : ""}`}>
                          {agent.type === "l1" && (
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
                              <Cog className="h-3.5 w-3.5 text-gray-400" />
                            </span>
                          )}
                          {agent.type === "l2" && (
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-50 dark:bg-amber-950/40">
                              <BarChart3 className="h-3.5 w-3.5 text-amber-400" />
                            </span>
                          )}
                          {agent.type === "l3" && (
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-50 dark:bg-emerald-950/40">
                              <Bot className="h-3.5 w-3.5 text-emerald-400" />
                            </span>
                          )}
                          {agent.type === "l4" && (
                            <Image src="/eli-plus-cube.svg" alt="ELI+" width={20} height={20} className="shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-[length:var(--text-body)] font-medium text-[hsl(var(--foreground))] truncate">{agent.name}</p>
                            <p className="text-[length:var(--text-caption)] text-[hsl(var(--muted-foreground))] truncate">{agent.description}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          {isLocked ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                              <Lock className="h-3 w-3" />
                              Unlock ELI+ Agents
                            </span>
                          ) : needsContract ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                              <Lock className="h-3 w-3" />
                              Unlock Intelligence Agents
                            </span>
                          ) : (
                            <>
                              <span className="text-[length:var(--text-caption)] text-[hsl(var(--muted-foreground))]">
                                {AGENT_TYPES.find((t) => t.value === agent.type)?.label ?? agent.type}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                  agent.status === "Active"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-muted text-muted-foreground"
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
                {hasMore && (
                  <div className="border-t border-[hsl(var(--border))]/50 px-4 py-2">
                    <button
                      type="button"
                      onClick={() => setExpandedBucket(isExpanded ? null : bucket)}
                      className="text-sm font-medium text-[hsl(var(--primary))] hover:underline"
                    >
                      {isExpanded ? "Show less" : `View all (${items.length})`}
                    </button>
                  </div>
                )}
              </section>
            );
          })}
        </div>

      </div>

      {opsAgentId && (() => {
        const opsAgent = agents.find((a) => a.id === opsAgentId);
        if (!opsAgent) return null;
        return (
          <OperationsAgentModal
            agent={opsAgent}
            onClose={() => setOpsAgentId(null)}
            onToggle={(status) => updateAgent(opsAgent.id, { status })}
          />
        );
      })()}

      {intelAgentId && (() => {
        const intelAgent = agents.find((a) => a.id === intelAgentId);
        if (!intelAgent) return null;
        return (
          <IntelligenceAgentSheet
            agent={intelAgent}
            open={!!intelAgentId}
            onOpenChange={(open) => { if (!open) setIntelAgentId(null); }}
            onToggle={(status) => updateAgent(intelAgent.id, { status })}
          />
        );
      })()}

      <Dialog open={showUnlockEli} onOpenChange={setShowUnlockEli}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Image src="/eli-plus-cube.svg" alt="ELI+" width={36} height={36} />
              <div>
                <DialogTitle className="text-xl">ELI+ Agents</DialogTitle>
                <DialogDescription>Autonomous AI agents for your properties</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">What ELI+ agents do</p>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />Handle resident conversations autonomously across chat, SMS, and voice</li>
                <li className="flex items-start gap-2"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />Schedule tours, process applications, and sign leases automatically</li>
                <li className="flex items-start gap-2"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />Collect rent, follow up on late payments, and manage renewals</li>
                <li className="flex items-start gap-2"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />Escalate complex issues to your team with full context</li>
              </ul>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900/50 dark:bg-green-950/30">
              <p className="text-sm font-semibold text-green-800 dark:text-green-200">Impact from similar properties</p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">386 hrs</p>
                  <p className="text-[11px] text-green-600 dark:text-green-400">Staff hours saved</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">$42K</p>
                  <p className="text-[11px] text-green-600 dark:text-green-400">Revenue impact</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">89%</p>
                  <p className="text-[11px] text-green-600 dark:text-green-400">Resolution rate</p>
                </div>
              </div>
            </div>
            <a
              href="https://www.entrata.com/products/eli-plus/request-access"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Request Access to ELI+ Agents
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </DialogContent>
      </Dialog>

      <AgentTypeSelectorDialog
        open={showTypeSelector}
        onOpenChange={setShowTypeSelector}
        onSelect={(type) => {
          setShowTypeSelector(false);
          if (type === "l1" || type === "l2") setShowCreate(true);
          else setShowCreateAuto(true);
        }}
      />

      <CreateAgentDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onSave={(agent) => {
          addAgent(agent);
        }}
      />

      <CreateAutonomousAgentDialog
        open={showCreateAuto}
        onOpenChange={setShowCreateAuto}
        onSave={(agent) => {
          addAgent(agent);
        }}
      />

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
    onSave({
      name: name.trim(),
      description: description.trim(),
      status: "Active",
      bucket,
      type: "l2",
      scope: "All properties",
      vaultBinding: selectedDocs.length > 0 ? `SOPs: ${selectedDocs.join(", ")}` : "—",
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
                    const selected = selectedDocs.includes(doc.fileName);
                    return (
                      <label key={doc.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 hover:bg-muted/30">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleDoc(doc.fileName)}
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
                    {selectedDocs.map((d) => <Badge key={d} variant="outline" className="text-[10px]">{d}</Badge>)}
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

function OperationsAgentModal({
  agent,
  onClose,
  onToggle,
}: {
  agent: Agent;
  onClose: () => void;
  onToggle: (status: string) => void;
}) {
  const isActive = agent.status === "Active";
  const hasRuns = (agent.runsCompleted ?? 0) > 0;
  const lastRunDate = agent.lastRunAt ? new Date(agent.lastRunAt) : null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle>{agent.name}</DialogTitle>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isActive ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"
              }`}
            >
              {isActive ? "Active" : "Off"}
            </span>
          </div>
          <DialogDescription>{agent.bucket}</DialogDescription>
        </DialogHeader>

        <p className="text-sm text-foreground">{agent.description}</p>

        {agent.schedule && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Schedule: {agent.schedule}</span>
          </div>
        )}

        {hasRuns ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                <Play className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                <p className="text-lg font-semibold text-foreground">{agent.runsCompleted}</p>
                <p className="text-[11px] text-muted-foreground">Runs</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                <AlertCircle className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                <p className="text-lg font-semibold text-foreground">{agent.errorCount ?? 0}</p>
                <p className="text-[11px] text-muted-foreground">Errors</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                <Clock className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                <p className="text-lg font-semibold text-foreground">{agent.avgRunDuration ?? "—"}</p>
                <p className="text-[11px] text-muted-foreground">Avg duration</p>
              </div>
            </div>
            {lastRunDate && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-3 text-sm">
                {agent.lastRunStatus === "success" ? (
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : agent.lastRunStatus === "error" ? (
                  <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                ) : (
                  <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium text-foreground">Last run: {agent.lastRunStatus}</p>
                  <p className="text-xs text-muted-foreground">{lastRunDate.toLocaleString()}</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-lg border border-border bg-muted/20 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {isActive ? "No runs yet. This agent will execute on its next scheduled trigger." : "Turn this agent on to start running."}
            </p>
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button
            variant={isActive ? "destructive" : "default"}
            onClick={() => onToggle(isActive ? "Off" : "Active")}
          >
            <Power className="h-4 w-4" />
            {isActive ? "Turn off" : "Turn on"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IntelligenceAgentSheet({
  agent,
  open,
  onOpenChange,
  onToggle,
}: {
  agent: Agent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggle: (status: string) => void;
}) {
  const isActive = agent.status === "Active";
  const runs = agent.runsCompleted ?? agent.insightsGenerated ?? 0;
  const hasRuns = runs > 0;
  const lastRunDate = (agent.lastRunAt ?? agent.lastInsightAt) ? new Date(agent.lastRunAt ?? agent.lastInsightAt!) : null;
  const lastRunStatus = agent.lastRunStatus ?? "success";

  const [propertyStatuses, setPropertyStatuses] = useState<Record<string, string>>({
    "Harvest Peak Capital": "Active",
    "Skyline Apartments": "Active",
    "The Meridian": "Off",
  });

  const [showToggleConfirm, setShowToggleConfirm] = useState(false);

  const propertyRows = [
    { property: "Harvest Peak Capital", vertical: "Conventional", runs: Math.round(runs * 0.45) || 0, errors: Math.round((agent.errorCount ?? 0) * 0.2), avgDuration: agent.avgRunDuration ?? "—", lastRunOk: true },
    { property: "Skyline Apartments", vertical: "Conventional", runs: Math.round(runs * 0.35) || 0, errors: Math.round((agent.errorCount ?? 0) * 0.3), avgDuration: agent.avgRunDuration ?? "—", lastRunOk: true },
    { property: "The Meridian", vertical: "Affordable", runs: Math.round(runs * 0.2) || 0, errors: Math.round((agent.errorCount ?? 0) * 0.5), avgDuration: agent.avgRunDuration ?? "—", lastRunOk: false },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-50 dark:bg-amber-950/40">
                <BarChart3 className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <SheetTitle>{agent.name}</SheetTitle>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isActive ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"
              }`}
            >
              {isActive ? "Active" : "Off"}
            </span>
          </div>
          <SheetDescription>{agent.bucket}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <p className="text-sm text-foreground">{agent.description}</p>

          <a
            href={`https://app.entrata.com/agents/${agent.id}/settings`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            <span className="flex items-center gap-2">
              Open Agent Settings in Entrata
            </span>
            <ExternalLink className="h-4 w-4" />
          </a>

          {hasRuns && (
            <>
              <div className="grid grid-cols-4 gap-2">
                <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center">
                  <p className="text-lg font-semibold text-foreground">{runs}</p>
                  <p className="text-[10px] text-muted-foreground">Runs</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center">
                  <p className="text-lg font-semibold text-foreground">{agent.errorCount ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Errors</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center">
                  <p className="text-lg font-semibold text-foreground">{agent.avgRunDuration ?? "—"}</p>
                  <p className="text-[10px] text-muted-foreground">Avg Duration</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center">
                  {lastRunStatus === "success" ? (
                    <p className="text-lg font-semibold text-emerald-600">✓</p>
                  ) : lastRunStatus === "error" ? (
                    <p className="text-lg font-semibold text-red-600">✗</p>
                  ) : (
                    <p className="text-lg font-semibold text-muted-foreground">—</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">Last Run</p>
                </div>
              </div>

              {lastRunDate && (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-3 text-sm">
                  {lastRunStatus === "success" ? (
                    <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : lastRunStatus === "error" ? (
                    <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                  ) : (
                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium text-foreground">Last run: {lastRunStatus}</p>
                    <p className="text-xs text-muted-foreground">{lastRunDate.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {!hasRuns && (
            <div className="rounded-lg border border-border bg-muted/20 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                {isActive ? "No runs yet. This agent will execute on its next scheduled trigger." : "Turn this agent on to start running."}
              </p>
            </div>
          )}

          <div>
            <select className="select-base w-auto min-w-[10rem] text-sm" defaultValue="all">
              <option value="all">All Properties</option>
              <option value="prop-a">Harvest Peak Capital</option>
              <option value="prop-b">Skyline Apartments</option>
              <option value="prop-c">The Meridian</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2.5 text-left text-xs font-medium text-muted-foreground">Property</th>
                  <th className="pb-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="pb-2.5 text-left text-xs font-medium text-muted-foreground">Vertical</th>
                  <th className="pb-2.5 text-right text-xs font-medium text-muted-foreground">Runs</th>
                  <th className="pb-2.5 text-right text-xs font-medium text-muted-foreground">Errors</th>
                  <th className="pb-2.5 text-right text-xs font-medium text-muted-foreground">Avg Duration</th>
                  <th className="pb-2.5 text-center text-xs font-medium text-muted-foreground">Last Run</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {propertyRows.map((row) => (
                  <tr key={row.property}>
                    <td className="py-3 font-medium text-foreground">{row.property}</td>
                    <td className="py-3">
                      <select
                        className="h-7 w-24 rounded-md border border-border bg-background px-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                        value={propertyStatuses[row.property] ?? "Off"}
                        onChange={(e) => setPropertyStatuses((prev) => ({ ...prev, [row.property]: e.target.value }))}
                      >
                        <option value="Active">Active</option>
                        <option value="Off">Off</option>
                      </select>
                    </td>
                    <td className="py-3 text-muted-foreground">{row.vertical}</td>
                    <td className="py-3 text-right font-medium text-foreground">{row.runs}</td>
                    <td className="py-3 text-right">
                      <span className={row.errors > 0 ? "font-medium text-red-600" : "text-muted-foreground"}>{row.errors}</span>
                    </td>
                    <td className="py-3 text-right text-muted-foreground">{row.avgDuration}</td>
                    <td className="py-3 text-center">
                      {row.lastRunOk ? (
                        <CheckCircle className="mx-auto h-4 w-4 text-emerald-600" />
                      ) : (
                        <XCircle className="mx-auto h-4 w-4 text-red-500" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">Agent status (all properties)</span>
            <Button
              variant={isActive ? "destructive" : "default"}
              size="sm"
              onClick={() => setShowToggleConfirm(true)}
            >
              <Power className="h-4 w-4" />
              {isActive ? "Turn off" : "Turn on"}
            </Button>
          </div>
        </div>
      </SheetContent>

      <Dialog open={showToggleConfirm} onOpenChange={setShowToggleConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{isActive ? "Turn off" : "Turn on"} {agent.name}?</DialogTitle>
            <DialogDescription>
              You are {isActive ? "turning off" : "turning on"} {agent.name} for all properties. This will {isActive ? "stop" : "start"} the agent across every property in your portfolio.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowToggleConfirm(false)}>
              No, cancel
            </Button>
            <Button
              variant={isActive ? "destructive" : "default"}
              size="sm"
              onClick={() => {
                onToggle(isActive ? "Off" : "Active");
                const newStatus = isActive ? "Off" : "Active";
                setPropertyStatuses((prev) => {
                  const updated = { ...prev };
                  for (const key of Object.keys(updated)) updated[key] = newStatus;
                  return updated;
                });
                setShowToggleConfirm(false);
              }}
            >
              Yes, {isActive ? "turn off" : "turn on"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}

function generateAgentChatResponse(
  message: string,
  agent: Agent
): { text: string; updates?: Partial<Agent> } {
  const lower = message.toLowerCase();
  const staged = agent.status === "Active" ? "\n\nThis change has been staged — publish it from the banner above to make it live." : "";

  if (lower.includes("data source") || lower.includes("what data") || lower.includes("where do you get")) {
    const sources = agent.dataSources?.join(", ") || "No data sources configured";
    return { text: `I'm currently pulling from: ${sources}. Would you like me to add or remove any data sources?` };
  }

  if (lower.includes("what is your goal") || lower.includes("what's your goal") || lower.includes("your objective")) {
    return { text: agent.goal ? `My current goal is: ${agent.goal}` : "I don't have a goal set yet. Tell me what you'd like me to optimize for and I'll update it." };
  }

  if (lower.includes("what is your prompt") || lower.includes("what are your instructions") || lower.includes("how do you analyze")) {
    return { text: agent.prompt ? `Here's my current analysis prompt:\n\n"${agent.prompt}"` : "I don't have an analysis prompt yet. Tell me what you'd like me to focus on." };
  }

  if (lower.includes("how often") || lower.includes("frequency") || lower.includes("how frequently") || lower.includes("schedule")) {
    return { text: `I currently run ${agent.analysisFrequency?.toLowerCase() ?? "on no set schedule"}. Would you like me to change that? You can say "run daily" or "run monthly".` };
  }

  if (lower.includes("run daily") || lower.includes("change to daily") || lower.includes("switch to daily")) {
    return { text: `Done — I've updated my analysis frequency to daily.${staged}`, updates: { analysisFrequency: "Daily" } };
  }
  if (lower.includes("run weekly") || lower.includes("change to weekly") || lower.includes("switch to weekly")) {
    return { text: `Done — I've updated my analysis frequency to weekly.${staged}`, updates: { analysisFrequency: "Weekly" } };
  }
  if (lower.includes("run monthly") || lower.includes("change to monthly") || lower.includes("switch to monthly")) {
    return { text: `Done — I've updated my analysis frequency to monthly.${staged}`, updates: { analysisFrequency: "Monthly" } };
  }
  if (lower.includes("run hourly") || lower.includes("change to hourly")) {
    return { text: `Done — I've updated my analysis frequency to hourly. Note: this will generate a high volume of insights.${staged}`, updates: { analysisFrequency: "Hourly" } };
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
    };
  }

  if (lower.includes("change goal") || lower.includes("update goal") || lower.includes("new goal") || lower.includes("set goal")) {
    const goalText = message.replace(/^.*?(change|update|new|set)\s*goal\s*(to)?\s*/i, "").replace(/[.!?]+$/, "").trim();
    if (goalText.length > 5) {
      return { text: `Goal updated to: "${goalText}"${staged}`, updates: { goal: goalText } };
    }
    return { text: "What would you like the new goal to be? For example: 'Set goal to reduce delinquency by 20% this quarter.'" };
  }

  if (lower.includes("latest insight") || lower.includes("recent insight") || lower.includes("what did you find") || lower.includes("any findings")) {
    if (agent.recentInsights && agent.recentInsights.length > 0) {
      const latest = agent.recentInsights[0];
      return { text: `My most recent insight (${new Date(latest.at).toLocaleDateString()}):\n\n**${latest.title}**\n${latest.summary}` };
    }
    return { text: "I haven't generated any insights yet. Once I run my next analysis cycle, I'll have findings to share." };
  }

  if (lower.includes("how many insight") || lower.includes("stats") || lower.includes("performance") || lower.includes("how are you doing")) {
    const total = agent.insightsGenerated ?? 0;
    const acted = agent.recommendationsActedOn ?? 0;
    const rate = total > 0 ? Math.round((acted / total) * 100) : 0;
    return { text: `Here's my performance summary:\n• ${total} insights generated\n• ${acted} recommendations acted on\n• ${rate}% action rate\n\nWant me to adjust my focus to improve these numbers?` };
  }

  if (lower.includes("turn off") || lower.includes("disable") || lower.includes("stop running")) {
    return { text: "I've turned myself off. No new insights will be generated until you turn me back on.", updates: { status: "Off" } };
  }
  if (lower.includes("turn on") || lower.includes("enable") || lower.includes("start running") || lower.includes("activate")) {
    return { text: "I'm now active. I'll start generating insights on my next scheduled cycle.", updates: { status: "Active" } };
  }

  return {
    text: `I understand you're asking about "${message}". Here's what I can help with:\n\n• **Update my focus** — "Focus on late payments" or "Prioritize vendor costs"\n• **Change my goal** — "Set goal to reduce costs by 10%"\n• **Adjust frequency** — "Run daily" or "Switch to monthly"\n• **Ask about my work** — "Latest insights", "How are you performing?"\n• **Check my config** — "What data sources?", "What's your prompt?"\n\nWhat would you like to do?`,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   Agent Type Selector
   ═══════════════════════════════════════════════════════════════════════ */

function AgentTypeSelectorDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: AgentType) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        <div className="relative">
          <DialogHeader>
            <DialogTitle>What type of agent?</DialogTitle>
            <DialogDescription>
              Choose the agent type that matches your use case.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {([
              { type: "l4" as AgentType, desc: "Cross-functional orchestration. Coordinates multiple agents across departments to optimize outcomes holistically." },
              { type: "l3" as AgentType, desc: "Resident-facing autonomy. Interacts directly with residents across channels using MCP tools within bounded guardrails." },
              { type: "l2" as AgentType, desc: "Data analysis and insights. Analyzes patterns, generates recommendations, and surfaces actionable intelligence." },
              { type: "l1" as AgentType, desc: "Automated operations. Runs scheduled tasks, processes data, and executes rule-based workflows." },
            ]).map((item) => (
              <div
                key={item.type}
                className="flex w-full items-start gap-4 rounded-lg border border-border p-4 text-left"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-foreground text-background text-sm font-bold">
                  {item.type.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{item.type.toUpperCase()}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            ))}
          </div>

          {/* Coming soon overlay */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-white/80 backdrop-blur-[2px] dark:bg-background/80">
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">Coming Soon</span>
              <h3 className="text-lg font-semibold text-foreground">Custom Agent Builder</h3>
              <p className="max-w-xs text-sm text-muted-foreground">
                Build and deploy your own custom agents tailored to your portfolio. Contact your CSM or Entrata for early access and more information.
              </p>
              <Button variant="outline" size="sm" className="mt-1" onClick={() => onOpenChange(false)}>
                Got it
              </Button>
            </div>
          </div>
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
    onSave({
      name: name.trim(),
      description: description.trim(),
      status: deploymentMode === "shadow" ? "Off" : "Active",
      bucket,
      type: "l3",
      scope,
      vaultBinding: selectedDocs.length > 0 ? `SOPs: ${selectedDocs.join(", ")}` : "",
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
          <DialogTitle>
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
                  placeholder="e.g. Property A, Property B"
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
                    const sel = selectedDocs.includes(doc.fileName);
                    return (
                      <label key={doc.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 hover:bg-muted/30">
                        <input type="checkbox" checked={sel} onChange={() => toggleDoc(doc.fileName)} className="h-4 w-4 rounded border-border" />
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
                            tool.risk === "high" ? "bg-red-50 text-red-700" :
                            tool.risk === "medium" ? "bg-amber-50 text-amber-700" :
                            "bg-emerald-50 text-emerald-700"
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
                              ? "bg-amber-50 text-amber-700"
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
                  <h4 className="font-semibold">{name || "Untitled Agent"}</h4>
                </div>
                <Badge variant="secondary" className="text-[10px]">L3</Badge>
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

  const isActive = agent.status === "Active";
  const isShadow = agent.deploymentMode === "shadow";
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {agent.type === "l4" && (
                <Image src="/eli-plus-cube.svg" alt="ELI+" width={18} height={18} />
              )}
              <SheetTitle>{agent.name}</SheetTitle>
            </div>
            <div className="flex items-center gap-1.5">
              {isShadow && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Shadow</span>
              )}
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isActive ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"
                }`}
              >
                {isActive ? "Active" : agent.status}
              </span>
            </div>
          </div>
          <SheetDescription>{agent.bucket}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <p className="text-sm text-foreground">{agent.description}</p>

          {agent.type === "l4" && (
            <a
              href={`https://app.entrata.com/eli-plus/agents/${agent.id}/settings`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              <span className="flex items-center gap-2">
                <Image src="/eli-plus-cube.svg" alt="" width={16} height={16} />
                Open ELI+ Settings in Entrata
              </span>
              <ExternalLink className="h-4 w-4" />
            </a>
          )}

          {agent.type === "l4" ? (
            <>
              {/* Entrata-style property settings for L4/ELI+ agents */}
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://help.entrata.com/eli-plus/${agent.name.toLowerCase().replace(/\s+/g, "-")}`} target="_blank" rel="noopener noreferrer">
                    View Help Article
                  </a>
                </Button>
              </div>

              <div>
                <select className="select-base w-auto min-w-[10rem] text-sm" defaultValue="all">
                  <option value="all">All Properties</option>
                  <option value="prop-a">Property A</option>
                  <option value="prop-b">Property B</option>
                  <option value="prop-c">Property C</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-2.5 text-left text-xs font-medium text-muted-foreground">Property</th>
                      <th className="pb-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                      <th className="pb-2.5 text-left text-xs font-medium text-muted-foreground">Vertical</th>
                      <th className="pb-2.5 text-left text-xs font-medium text-muted-foreground">Complete</th>
                      <th className="pb-2.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      { property: "Harvest Peak Capital", status: "Active", vertical: "Conventional", complete: 94 },
                      { property: "Skyline Apartments", status: "Active", vertical: "Conventional", complete: 87 },
                      { property: "The Meridian", status: "Setup", vertical: "Affordable", complete: 42 },
                    ].map((row) => (
                      <tr key={row.property}>
                        <td className="py-3 font-medium text-foreground">{row.property}</td>
                        <td className="py-3">
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            row.status === "Active" && "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
                            row.status === "Setup" && "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
                            row.status === "Off" && "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
                          )}>
                            {row.status}
                          </span>
                        </td>
                        <td className="py-3 text-muted-foreground">{row.vertical}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full rounded-full transition-all ${row.complete >= 80 ? "bg-green-600" : row.complete >= 50 ? "bg-amber-500" : "bg-muted-foreground/40"}`}
                                style={{ width: `${row.complete}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{row.complete}%</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              {/* L3 agent settings — keep existing pattern */}
              {/* Pending changes banner */}
              {pending && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                  <div>
                    <p className="text-sm font-medium text-foreground">Unpublished changes</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Changes are staged and won&apos;t affect the live agent until published.
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-foreground">
                      {pending.systemPrompt !== undefined && pending.systemPrompt !== agent.systemPrompt && <li>System prompt updated</li>}
                      {pending.goal !== undefined && pending.goal !== agent.goal && <li>Goal updated</li>}
                    </ul>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={handlePublish}>Publish</Button>
                    <Button variant="ghost" size="sm" onClick={handleDiscard}>Discard</Button>
                  </div>
                </div>
              )}

              {/* Performance metrics */}
              <div className="grid grid-cols-4 gap-2">
                <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center">
                  <p className="text-lg font-semibold text-foreground">{agent.conversationCount}</p>
                  <p className="text-[10px] text-muted-foreground">Conversations</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center">
                  <p className="text-lg font-semibold text-foreground">{agent.resolutionRate}</p>
                  <p className="text-[10px] text-muted-foreground">Resolution</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center">
                  <p className="text-lg font-semibold text-foreground">{agent.escalationsCount}</p>
                  <p className="text-[10px] text-muted-foreground">Escalations</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center">
                  <p className="text-lg font-semibold text-foreground">{agent.revenueImpact}</p>
                  <p className="text-[10px] text-muted-foreground">Revenue</p>
                </div>
              </div>

              {/* System Prompt */}
              <div className="space-y-3 rounded-lg border border-border p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">System Prompt</h4>
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
                {editing ? (
                  <>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={aiAssisting}
                        onClick={() => {
                          setAiAssisting(true);
                          setTimeout(() => {
                            setPromptDraft((prev) => generateSystemPrompt(agent.name, agent.bucket, agent.persona ?? "professional", prev));
                            setAiAssisting(false);
                          }, 600);
                        }}
                        className="h-7 gap-1.5 text-xs"
                      >
                        {aiAssisting ? (
                          <><Sparkles className="h-3.5 w-3.5 animate-spin" /> Generating…</>
                        ) : (
                          <><Sparkles className="h-3.5 w-3.5" /> {promptDraft ? "Improve with AI" : "Generate with AI"}</>
                        )}
                      </Button>
                    </div>
                    <textarea
                      value={promptDraft}
                      onChange={(e) => setPromptDraft(e.target.value)}
                      rows={12}
                      className="input-base w-full resize-y text-sm font-mono"
                      placeholder="Define the agent's core behavior..."
                    />
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Goal</label>
                      <textarea
                        value={goalDraft}
                        onChange={(e) => setGoalDraft(e.target.value)}
                        rows={2}
                        className="input-base w-full resize-y text-sm"
                        placeholder="What is the measurable goal?"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {agent.systemPrompt || "No system prompt configured. Click Edit to add one."}
                    </p>
                    {agent.goal && (
                      <div className="flex items-start gap-2 pt-2 border-t border-border">
                        <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <p className="text-sm text-foreground">{agent.goal}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Persona & Voice */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Persona & Voice</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg border border-border p-2.5">
                    <span className="text-[10px] text-muted-foreground">Tone</span>
                    <p className="font-medium capitalize">{agent.persona ?? "professional"}</p>
                  </div>
                  <div className="rounded-lg border border-border p-2.5">
                    <span className="text-[10px] text-muted-foreground">Channels</span>
                    <p className="font-medium">{agent.channels.join(", ") || "None"}</p>
                  </div>
                </div>
              </div>

              {/* Guardrails */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground" /> Guardrails
                </h4>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-lg border border-border p-2.5">
                    <span className="text-[10px] text-muted-foreground">Max steps</span>
                    <p className="font-semibold">{agent.maxSteps ?? 10}</p>
                  </div>
                  <div className="rounded-lg border border-border p-2.5">
                    <span className="text-[10px] text-muted-foreground">Fair housing</span>
                    <p className="font-semibold">{agent.fairHousingEnabled !== false ? "On" : "Off"}</p>
                  </div>
                  <div className="rounded-lg border border-border p-2.5">
                    <span className="text-[10px] text-muted-foreground">Confidence</span>
                    <p className="font-semibold">{agent.confidenceThreshold ?? 70}%</p>
                  </div>
                </div>
              </div>

              {/* Escalation */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-muted-foreground" /> Escalation Rules
                </h4>
                <div className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Default behavior</span>
                    <span className="font-medium capitalize">{(agent.escalationDefault ?? "agent_handles").replace("_", " ")}</span>
                  </div>
                </div>
              </div>

              {/* SLA */}
              {(agent.slaFirstResponseMinutes || agent.slaResolutionHours) && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" /> SLA
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="rounded-lg border border-border p-2.5">
                      <span className="text-[10px] text-muted-foreground">First response</span>
                      <p className="font-semibold">{agent.slaFirstResponseMinutes} min</p>
                    </div>
                    <div className="rounded-lg border border-border p-2.5">
                      <span className="text-[10px] text-muted-foreground">Resolution</span>
                      <p className="font-semibold">{agent.slaResolutionHours} hrs</p>
                    </div>
                    <div className="rounded-lg border border-border p-2.5">
                      <span className="text-[10px] text-muted-foreground">Hours</span>
                      <p className="font-semibold">{agent.slaBusinessHoursOnly ? "Business" : "24/7"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Configuration summary */}
              <div className="space-y-2">
                <Link href="/voice" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                  Configuration <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Scope</dt>
                    <dd className="font-medium">{agent.scope}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Routing labels</dt>
                    <dd className="font-medium">{(agent.labels?.length ?? 0) > 0 ? agent.labels!.join(", ") : "None"}</dd>
                  </div>
                </dl>
              </div>

              {/* Chat */}
              <div>
                <h4 className="mb-2 text-sm font-semibold text-foreground">Configure via chat</h4>
                {chatMessages.length === 0 && (
                  <p className="mb-2 text-xs text-muted-foreground">
                    Use natural language to update this agent. For example: &ldquo;Add SMS channel&rdquo;, &ldquo;Escalate anything about mold&rdquo;, or &ldquo;What tools are you using?&rdquo;
                  </p>
                )}
                <Chat
                  messages={chatMessages}
                  onSend={handleChatSend}
                  disabled={chatDisabled}
                  placeholder="Give an instruction or ask a question..."
                  roleLabels={{ user: "You", assistant: agent.name }}
                  roleVariant={{ user: "inbound", assistant: "outbound" }}
                  showAttach={false}
                  messageListHeight={240}
                />
              </div>

              {/* Status controls */}
              <div className="flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm text-muted-foreground">Agent status</span>
                <Button
                  variant={isActive || isShadow ? "destructive" : "default"}
                  size="sm"
                  onClick={() => onUpdate({ status: isActive || isShadow ? "Off" : "Active" })}
                >
                  <Power className="h-4 w-4" />
                  {isActive || isShadow ? "Turn off" : "Turn on"}
                </Button>
              </div>
            </>
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
    return { text: "I've switched to shadow mode. My responses will be reviewed before sending.", updates: { deploymentMode: "shadow", status: "Off" } };
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
