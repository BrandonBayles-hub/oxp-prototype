"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import {
  useAgentBuilder,
  AGENT_LEVEL_OPTIONS,
  type AgentDomain,
  type AgentStatus,
  type AgentLevel,
  type SubmissionAttachment,
  type AgentSubmission,
} from "@/lib/agent-builder-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Sparkles,
  Send,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle2,
  Home,
  Calculator,
  Wrench,
  RefreshCw,
  Shield,
  Layers,
  BookOpen,
  Paperclip,
  Mic,
  MicOff,
  X,
  FileText,
  Video,
  Image as ImageIcon,
  File,
  Bot,
  MessageSquare,
  AlertCircle,
  ChevronUp,
  ArrowRight,
  Lock,
  UserCog,
  Users,
} from "lucide-react";

const EXAMPLE_PROMPTS = [
  "Monitor lease expirations and send renewal offers with market-rate pricing",
  "Process incoming vendor invoices and flag exceptions over $5,000",
  "Respond to after-hours maintenance requests and auto-dispatch vendors",
  "Scan month-to-month leases weekly and recommend rent adjustments",
];

type BlueprintDomain = AgentDomain | "all";

const DOMAIN_FILTERS: { value: BlueprintDomain; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "all", label: "All", icon: Layers },
  { value: "leasing", label: "Leasing", icon: Home },
  { value: "accounting", label: "Accounting", icon: Calculator },
  { value: "maintenance", label: "Maintenance", icon: Wrench },
  { value: "renewals", label: "Renewals", icon: RefreshCw },
  { value: "compliance", label: "Compliance", icon: Shield },
];

const BLUEPRINTS: {
  id: string;
  name: string;
  domain: AgentDomain;
  description: string;
  impact: string;
  connects: string;
}[] = [
  {
    id: "bp-lead",
    name: "Lead Response",
    domain: "leasing",
    description: "When a new lead arrives in Entrata, create a task, notify the leasing team, and begin automated follow-up within 5 minutes.",
    impact: "~2 hrs/day saved on lead routing",
    connects: "Leads, Tasks, Notifications",
  },
  {
    id: "bp-app-review",
    name: "Application Review",
    domain: "leasing",
    description: "Automatically screen incoming applications against your criteria, flag exceptions for human review, and fast-track qualifying applicants.",
    impact: "78% of applications auto-processed",
    connects: "Applications, Screening, Approvals",
  },
  {
    id: "bp-invoice",
    name: "Invoice Processing",
    domain: "accounting",
    description: "Read incoming vendor invoices, map GL codes based on historical patterns, detect pricing anomalies, and route for approval.",
    impact: "$5K+/mo in caught discrepancies",
    connects: "AP, GL, Vendor Records",
  },
  {
    id: "bp-delinquency",
    name: "Delinquency Follow-Up",
    domain: "accounting",
    description: "Monitor outstanding balances, send graduated payment reminders, and escalate to collections workflow based on aging thresholds.",
    impact: "40% improvement in collections",
    connects: "Ledger, Payments, Notifications",
  },
  {
    id: "bp-maint",
    name: "Maintenance Triage",
    domain: "maintenance",
    description: "When a new work order arrives, classify urgency, auto-notify the resident of expected timeline, and route to the right vendor.",
    impact: "15% faster resolution time",
    connects: "Work Orders, Vendors, Notifications",
  },
  {
    id: "bp-maint-predict",
    name: "Preventive Maintenance",
    domain: "maintenance",
    description: "Analyze work order patterns across units to identify recurring issues and recommend preventive maintenance schedules before failures occur.",
    impact: "Reduce emergency WOs by 20%",
    connects: "Work Orders, Units, Vendor History",
  },
  {
    id: "bp-renewal",
    name: "Renewal Offer Generation",
    domain: "renewals",
    description: "Scan leases expiring in N days, generate renewal offers with market-rate adjustments, and send to residents with configurable escalation.",
    impact: "92% retention rate on auto-renewals",
    connects: "Leases, Rent Optimization, Notifications",
  },
  {
    id: "bp-rent-opt",
    name: "Rent Optimization Scanner",
    domain: "renewals",
    description: "Weekly scan of all month-to-month leases. Compare current rent to market, recommend adjustments within compliance constraints, and surface opportunities.",
    impact: "$2,100/mo avg revenue uplift",
    connects: "Leases, Market Data, Compliance",
  },
  {
    id: "bp-hud",
    name: "HUD Special Claims Review",
    domain: "compliance",
    description: "Review every document against HUD regulations, identify eligible special claims, and prepare submission packages with audit trail.",
    impact: "$14K+ avg recoverable per quarter",
    connects: "Documents, HUD Regulations, Claims",
  },
  {
    id: "bp-fair-housing",
    name: "Fair Housing Audit",
    domain: "compliance",
    description: "Monitor all outgoing communications and leasing interactions for fair housing compliance, flagging potential violations before they become issues.",
    impact: "Continuous compliance monitoring",
    connects: "Communications, Leasing, Policies",
  },
  {
    id: "bp-deposit",
    name: "Security Deposit Returns",
    domain: "compliance",
    description: "Track move-out dates, calculate deposit returns against state-specific timelines, and auto-generate itemized statements to meet regulatory deadlines.",
    impact: "Zero missed deposit deadlines",
    connects: "Move-outs, Ledger, State Regs",
  },
];

const STATUS_STYLES: Record<AgentStatus, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-[hsl(var(--muted))]", text: "text-[hsl(var(--muted-foreground))]", label: "Draft" },
  submitted: { bg: "bg-blue-50", text: "text-blue-700", label: "Submitted" },
  in_review: { bg: "bg-amber-50", text: "text-amber-700", label: "In Review" },
  live: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Active" },
  paused: { bg: "bg-[hsl(var(--muted))]", text: "text-[hsl(var(--muted-foreground))]", label: "Paused" },
};

const SUBMISSION_STATUS_STYLES: Record<string, { bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  submitted: { bg: "bg-blue-50", text: "text-blue-700", icon: Send },
  in_review: { bg: "bg-amber-50", text: "text-amber-700", icon: Clock },
  needs_info: { bg: "bg-orange-50", text: "text-orange-700", icon: AlertCircle },
  approved: { bg: "bg-emerald-50", text: "text-emerald-700", icon: CheckCircle2 },
  live: { bg: "bg-emerald-50", text: "text-emerald-700", icon: CheckCircle2 },
};

const CREATED_FROM_LABELS: Record<string, string> = {
  prompt: "From prompt",
  blueprint: "Blueprint",
  custom: "Custom build",
};

const DOMAIN_LABELS: Record<AgentDomain, string> = {
  leasing: "Leasing",
  accounting: "Accounting",
  maintenance: "Maintenance",
  renewals: "Renewals",
  compliance: "Compliance",
  general: "General",
};

const LEVEL_LABELS: Record<AgentLevel, string> = {
  l1: "L1",
  l2: "L2",
  l3: "L3",
  l4: "L4",
  l5: "L5",
};

const ATTACHMENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  document: FileText,
  video: Video,
  image: ImageIcon,
  other: File,
};

function getFileType(name: string): SubmissionAttachment["type"] {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf", "doc", "docx", "txt", "rtf", "xls", "xlsx", "csv"].includes(ext)) return "document";
  if (["mp4", "mov", "avi", "webm", "mkv"].includes(ext)) return "video";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "image";
  return "other";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Infer an agent level from the prompt text and agent name.
 * L4 = conversational / customer-facing / autonomous interaction
 * L3 = orchestration / coordination across multiple agents or workflows
 * L2 = task automation, scheduled jobs, monitors, scanners (default)
 * L1 = backend ops, data sync, reconciliation, ETL, posting
 * L5 = platform-level (very rare from user input)
 */
function inferAgentLevel(prompt: string, name: string): AgentLevel {
  const text = `${prompt} ${name}`.toLowerCase();

  const l4Keywords = [
    "chat", "conversation", "respond to", "answer", "talk to",
    "interact", "assist resident", "assist prospect", "customer-facing",
    "help resident", "help prospect", "greet", "guide",
    "onboard", "offboard", "renewal conversation", "handle calls",
    "voice agent", "virtual assistant", "concierge", "support agent",
  ];
  const l3Keywords = [
    "coordinate", "orchestrat", "manage multiple", "cross-functional",
    "oversee", "balance", "prioritize across", "multi-agent",
    "end-to-end workflow", "pipeline",
  ];
  const l1Keywords = [
    "sync", "reconcil", "ledger post", "data import", "data export",
    "etl", "migration", "nightly batch", "archive", "backup",
    "xml report", "file transfer", "database",
  ];
  // L2 is the default — automation keywords confirm it but aren't required

  const score = (keywords: string[]) =>
    keywords.reduce((n, kw) => n + (text.includes(kw) ? 1 : 0), 0);

  const l4Score = score(l4Keywords);
  const l3Score = score(l3Keywords);
  const l1Score = score(l1Keywords);

  const best = Math.max(l4Score, l3Score, l1Score);
  if (best === 0) return "l2";
  if (best === l4Score) return "l4";
  if (best === l3Score) return "l3";
  if (best === l1Score) return "l1";
  return "l2";
}

/* ── Blueprint Request Modal ── */
function BlueprintRequestModal({
  blueprint,
  open,
  onClose,
  onSubmit,
}: {
  blueprint: (typeof BLUEPRINTS)[number] | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (details: string, attachments: SubmissionAttachment[]) => void;
}) {
  const [details, setDetails] = useState("");
  const [modalAttachments, setModalAttachments] = useState<SubmissionAttachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  const handleModalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newAttachments: SubmissionAttachment[] = Array.from(files).map((f) => ({
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: f.name,
      type: getFileType(f.name),
      size: formatFileSize(f.size),
    }));
    setModalAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = "";
  };

  const removeModalAttachment = (id: string) => {
    setModalAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const toggleModalRecording = () => {
    setIsRecording((prev) => !prev);
    if (!isRecording) {
      setTimeout(() => {
        setIsRecording(false);
        setDetails((prev) =>
          prev
            ? prev + " [Voice input would be transcribed here]"
            : "Apply this to all properties in the West region. Contact the property managers directly for any escalations."
        );
      }, 3000);
    }
  };

  const handleSubmit = () => {
    onSubmit(details.trim(), modalAttachments);
    setDetails("");
    setModalAttachments([]);
    setIsRecording(false);
  };

  const handleCancel = () => {
    setDetails("");
    setModalAttachments([]);
    setIsRecording(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleCancel(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Agent Request Details</DialogTitle>
          <DialogDescription>
            What should we know before setting this up? For example: which properties it should apply to, specific contacts to notify, or preferred messaging frequency. Provide as much detail as you&apos;d like, and attach any SOPs or recordings for additional context.
          </DialogDescription>
        </DialogHeader>

        {blueprint && (
          <div className="flex items-center gap-2 rounded-md bg-[hsl(var(--muted))]/40 px-3 py-2 text-sm">
            <Bot className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <span className="font-medium text-[hsl(var(--foreground))]">{blueprint.name}</span>
          </div>
        )}

        <div className="relative">
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="e.g. Apply to Sunset Ridge and Parkview properties only. For renewal communications, CC the regional manager. Send offers on the first of each month..."
            rows={5}
            className="w-full resize-none overflow-y-auto rounded-lg border border-[hsl(var(--border))] bg-white px-4 py-3 pb-11 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/60 focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20"
          />

          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <input
                ref={modalFileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.rtf,.xls,.xlsx,.csv,.mp4,.mov,.avi,.webm,.png,.jpg,.jpeg,.gif,.webp"
                onChange={handleModalFileSelect}
                className="hidden"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => modalFileInputRef.current?.click()}
                title="Attach files (SOPs, documents, videos)"
                className="h-auto gap-1 px-2 py-1.5 text-muted-foreground"
              >
                <Paperclip className="h-4 w-4" />
                <span className="text-[11px] font-medium">Attach</span>
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleModalRecording}
              title={isRecording ? "Stop recording" : "Describe with your voice"}
              className={`h-8 w-8 ${
                isRecording
                  ? "animate-pulse bg-red-100 text-red-600 hover:bg-red-100 hover:text-red-600"
                  : "text-muted-foreground"
              }`}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {isRecording && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
            </span>
            Listening... describe your requirements and we&apos;ll transcribe them.
          </div>
        )}

        {modalAttachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {modalAttachments.map((att) => {
              const Icon = ATTACHMENT_ICONS[att.type] ?? File;
              return (
                <span key={att.id} className="flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 py-1 pl-2 pr-1 text-[11px] text-[hsl(var(--foreground))]">
                  <Icon className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
                  {att.name}
                  <span className="text-[hsl(var(--muted-foreground))]">({att.size})</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeModalAttachment(att.id)}
                    className="ml-0.5 h-5 w-5 text-muted-foreground"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </span>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            <Send className="h-3.5 w-3.5" />
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Submission Card with message thread ── */
function SubmissionCard({ sub, onReply }: { sub: AgentSubmission; onReply: (id: string, text: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState("");
  const style = SUBMISSION_STATUS_STYLES[sub.status] ?? SUBMISSION_STATUS_STYLES.submitted;
  const StatusIcon = style.icon;
  const hasMessages = (sub.messages?.length ?? 0) > 0;
  const needsResponse = sub.status === "needs_info";
  const lastEntrataMsg = sub.messages?.filter((m) => m.from === "entrata").pop();

  const handleReply = () => {
    if (!replyText.trim()) return;
    onReply(sub.id, replyText.trim());
    setReplyText("");
  };

  return (
    <div className={`rounded-lg border bg-white transition-shadow ${needsResponse ? "border-orange-300 shadow-sm shadow-orange-100" : "border-[hsl(var(--border))]"}`}>
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-3 p-3 text-left"
      >
        <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${style.bg}`}>
          <StatusIcon className={`h-3.5 w-3.5 ${style.text}`} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {sub.suggestedName && (
              <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{sub.suggestedName}</span>
            )}
            {sub.agentLevel && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                {LEVEL_LABELS[sub.agentLevel]}
              </Badge>
            )}
          </div>
          <p className="text-sm text-foreground line-clamp-2">
            &ldquo;{sub.prompt}&rdquo;
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-muted-foreground">
              {new Date(sub.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            {sub.attachments && sub.attachments.length > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Paperclip className="h-3 w-3" />
                {sub.attachments.length} file{sub.attachments.length > 1 ? "s" : ""}
              </span>
            )}
            {hasMessages && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                {sub.messages!.length}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline" className={`rounded-full border-transparent text-[10px] capitalize ${style.bg} ${style.text}`}>
            {sub.status === "needs_info" ? "Needs Info" : sub.status.replace("_", " ")}
          </Badge>
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border/50 px-3 pb-3">
          {/* Details row */}
          {(sub.agentLevel || sub.deployLocation) && (
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              {sub.agentLevel && (
                <div>
                  <span className="text-[hsl(var(--muted-foreground))]">Level: </span>
                  <span className="font-medium text-[hsl(var(--foreground))]">{AGENT_LEVEL_OPTIONS.find((o) => o.value === sub.agentLevel)?.label ?? sub.agentLevel}</span>
                </div>
              )}
              {sub.deployLocation && (
                <div>
                  <span className="text-[hsl(var(--muted-foreground))]">Deploy at: </span>
                  <span className="font-medium text-[hsl(var(--foreground))]">{sub.deployLocation}</span>
                </div>
              )}
            </div>
          )}

          {/* Additional Details */}
          {sub.additionalDetails && (
            <div className="mt-3">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Additional Details</p>
              <p className="whitespace-pre-wrap rounded-md bg-[hsl(var(--muted))]/30 px-3 py-2 text-sm text-[hsl(var(--foreground))]">
                {sub.additionalDetails}
              </p>
            </div>
          )}

          {/* Attachments */}
          {sub.attachments && sub.attachments.length > 0 && (
            <div className="mt-3">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Attachments</p>
              <div className="flex flex-wrap gap-1.5">
                {sub.attachments.map((att) => {
                  const Icon = ATTACHMENT_ICONS[att.type] ?? File;
                  return (
                    <span key={att.id} className="flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 px-2 py-1 text-[11px] text-[hsl(var(--foreground))]">
                      <Icon className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
                      {att.name}
                      <span className="text-[hsl(var(--muted-foreground))]">({att.size})</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Message thread */}
          {hasMessages && (
            <div className="mt-3">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Conversation</p>
              <div className="space-y-2">
                {sub.messages!.map((msg) => (
                  <div key={msg.id} className={`rounded-lg px-3 py-2 text-sm ${msg.from === "entrata" ? "bg-blue-50 text-blue-900" : "bg-[hsl(var(--muted))]/40 text-[hsl(var(--foreground))]"}`}>
                    <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold">
                      {msg.from === "entrata" ? (
                        <>
                          <Bot className="h-3 w-3" />
                          Entrata Team
                        </>
                      ) : (
                        "You"
                      )}
                      <span className="font-normal text-[hsl(var(--muted-foreground))]">
                        · {new Date(msg.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} at {new Date(msg.sentAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reply box for needs_info */}
          {needsResponse && (
            <div className="mt-3">
              <div className="flex gap-2">
                <Input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleReply()}
                  placeholder="Type your reply..."
                  className="flex-1 border-orange-200"
                />
                <Button
                  size="sm"
                  onClick={handleReply}
                  disabled={!replyText.trim()}
                >
                  <Send className="h-3 w-3" />
                  Reply
                </Button>
              </div>
            </div>
          )}

          {/* Roster link for approved/live */}
          {(sub.status === "approved" || sub.status === "live") && sub.suggestedName && (
            <div className="mt-3 flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>
                {sub.status === "live" ? "Live" : "Approved"} — linked to Agent Roster
                {sub.agentLevel && ` as ${LEVEL_LABELS[sub.agentLevel]}`}
              </span>
              <Link href="/agent-roster" className="ml-auto flex items-center gap-0.5 font-semibold hover:underline">
                View in Roster <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Admin team member mock list ── */
const TEAM_MEMBERS = ["Sarah Chen", "Marcus Rivera", "Jordan Park", "Alex Kim", "Taylor Brooks"];

const SUBMISSION_STATUSES: { value: AgentSubmission["status"]; label: string }[] = [
  { value: "submitted", label: "Submitted" },
  { value: "in_review", label: "In Review" },
  { value: "needs_info", label: "Needs Info" },
  { value: "approved", label: "Approved" },
  { value: "live", label: "Live" },
];

/* ── Admin Submission Card ── */
function AdminSubmissionCard({
  sub,
  onSendMessage,
  onStatusChange,
  onMetaChange,
}: {
  sub: AgentSubmission;
  onSendMessage: (id: string, text: string) => void;
  onStatusChange: (id: string, status: AgentSubmission["status"]) => void;
  onMetaChange: (id: string, meta: Partial<Pick<AgentSubmission, "assignedTo" | "priority" | "estimatedCompletion" | "internalNotes">>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [noteDraft, setNoteDraft] = useState(sub.internalNotes ?? "");
  const style = SUBMISSION_STATUS_STYLES[sub.status] ?? SUBMISSION_STATUS_STYLES.submitted;
  const StatusIcon = style.icon;
  const hasMessages = (sub.messages?.length ?? 0) > 0;
  const lastCustomerMsg = sub.messages?.filter((m) => m.from === "customer").pop();
  const waitingOnCustomer = sub.status === "needs_info";

  const handleSendMessage = () => {
    if (!replyText.trim()) return;
    onSendMessage(sub.id, replyText.trim());
    setReplyText("");
  };

  const handleSaveNotes = () => {
    onMetaChange(sub.id, { internalNotes: noteDraft.trim() || undefined });
  };

  return (
    <div className={`rounded-lg border bg-white transition-shadow ${waitingOnCustomer ? "border-orange-300 shadow-sm shadow-orange-100" : "border-[hsl(var(--border))]"}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-3 p-3 text-left"
      >
        <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${style.bg}`}>
          <StatusIcon className={`h-3.5 w-3.5 ${style.text}`} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {sub.suggestedName && (
              <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{sub.suggestedName}</span>
            )}
            {sub.agentLevel && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                {LEVEL_LABELS[sub.agentLevel]}
              </Badge>
            )}
            {sub.priority === "urgent" && (
              <Badge variant="destructive" className="rounded-full text-[10px] px-1.5 py-0.5">Urgent</Badge>
            )}
            {sub.priority === "high" && (
              <Badge variant="outline" className="rounded-full border-transparent bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5">High</Badge>
            )}
          </div>
          <p className="text-sm text-[hsl(var(--foreground))] line-clamp-2">&ldquo;{sub.prompt}&rdquo;</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-[hsl(var(--muted-foreground))]">
            {sub.customerOrg && <span className="font-medium text-[hsl(var(--foreground))]">{sub.customerOrg}</span>}
            <span>{new Date(sub.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            {sub.assignedTo && <span>Assigned: {sub.assignedTo}</span>}
            {hasMessages && (
              <span className="flex items-center gap-0.5">
                <MessageSquare className="h-3 w-3" />
                {sub.messages!.length}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline" className={`rounded-full border-transparent text-[10px] capitalize ${style.bg} ${style.text}`}>
            {sub.status === "needs_info" ? "Needs Info" : sub.status.replace("_", " ")}
          </Badge>
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/50 px-3 pb-3">
          {/* Admin controls row */}
          <div className="mt-3 grid gap-3 rounded-lg border border-[hsl(var(--border))]/50 bg-[hsl(var(--muted))]/20 p-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
              <Select value={sub.status} onValueChange={(v) => onStatusChange(sub.id, v as AgentSubmission["status"])}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBMISSION_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Assigned To</label>
              <Select value={sub.assignedTo ?? "__unassigned"} onValueChange={(v) => onMetaChange(sub.id, { assignedTo: v === "__unassigned" ? undefined : v })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unassigned">Unassigned</SelectItem>
                  {TEAM_MEMBERS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Priority</label>
              <Select value={sub.priority ?? "normal"} onValueChange={(v) => onMetaChange(sub.id, { priority: v as "normal" | "high" | "urgent" })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Est. Completion</label>
              <Input
                type="date"
                value={sub.estimatedCompletion ? sub.estimatedCompletion.split("T")[0] : ""}
                onChange={(e) => onMetaChange(sub.id, { estimatedCompletion: e.target.value ? `${e.target.value}T00:00:00Z` : undefined })}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Details */}
          {(sub.agentLevel || sub.deployLocation) && (
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              {sub.agentLevel && (
                <div>
                  <span className="text-[hsl(var(--muted-foreground))]">Level: </span>
                  <span className="font-medium text-[hsl(var(--foreground))]">{AGENT_LEVEL_OPTIONS.find((o) => o.value === sub.agentLevel)?.label ?? sub.agentLevel}</span>
                </div>
              )}
              {sub.deployLocation && (
                <div>
                  <span className="text-[hsl(var(--muted-foreground))]">Deploy at: </span>
                  <span className="font-medium text-[hsl(var(--foreground))]">{sub.deployLocation}</span>
                </div>
              )}
            </div>
          )}

          {/* Attachments */}
          {sub.attachments && sub.attachments.length > 0 && (
            <div className="mt-3">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Attachments</p>
              <div className="flex flex-wrap gap-1.5">
                {sub.attachments.map((att) => {
                  const Icon = ATTACHMENT_ICONS[att.type] ?? File;
                  return (
                    <span key={att.id} className="flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 px-2 py-1 text-[11px] text-[hsl(var(--foreground))]">
                      <Icon className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
                      {att.name}
                      <span className="text-[hsl(var(--muted-foreground))]">({att.size})</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Message thread */}
          {hasMessages && (
            <div className="mt-3">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Conversation</p>
              <div className="space-y-2">
                {sub.messages!.map((msg) => (
                  <div key={msg.id} className={`rounded-lg px-3 py-2 text-sm ${msg.from === "entrata" ? "bg-blue-50 text-blue-900" : "bg-[hsl(var(--muted))]/40 text-[hsl(var(--foreground))]"}`}>
                    <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold">
                      {msg.from === "entrata" ? (
                        <><Bot className="h-3 w-3" /> Entrata Team</>
                      ) : (
                        <>{sub.customerOrg ?? "Customer"}</>
                      )}
                      <span className="font-normal text-[hsl(var(--muted-foreground))]">
                        · {new Date(msg.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} at {new Date(msg.sentAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Send message to customer */}
          <div className="mt-3">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              {waitingOnCustomer ? "Waiting for customer response" : "Message customer"}
            </p>
            <div className="flex gap-2">
              <Input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={waitingOnCustomer ? "Send a follow-up..." : "Ask for more details..."}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleSendMessage}
                disabled={!replyText.trim()}
              >
                <Send className="h-3 w-3" />
                Send
              </Button>
            </div>
            {waitingOnCustomer && (
              <p className="mt-1 text-[10px] text-orange-600">
                Customer was asked for more information on {lastCustomerMsg ? new Date(sub.messages![sub.messages!.length - 1].sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}.
              </p>
            )}
          </div>

          {/* Internal notes */}
          <div className="mt-3">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Internal Notes (not visible to customer)</p>
            <div className="flex gap-2">
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={2}
                placeholder="Add internal notes about this request..."
                className="flex-1 resize-none rounded-md border border-[hsl(var(--border))] bg-white px-3 py-1.5 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/60 focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20"
              />
              <Button variant="outline" size="sm" onClick={handleSaveNotes} className="self-end">
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type BuilderTab = "request" | "blueprints" | "your-agents" | "designer";

const BUILDER_TABS: { value: BuilderTab; label: string }[] = [
  { value: "request", label: "Agent Request" },
  { value: "blueprints", label: "Agent Blueprints" },
  { value: "your-agents", label: "Your Agents Status" },
  { value: "designer", label: "Your Agents Workflows" },
];

export default function AgentBuilderPage() {
  const { agents, submissions, toggleAgent, addAgentFromBlueprint, submitPrompt, addMessageToSubmission, updateSubmissionStatus, updateSubmissionMeta, atLeastOneActive } = useAgentBuilder();
  const [promptText, setPromptText] = useState("");
  const [promptSubmitted, setPromptSubmitted] = useState(false);
  const [domainFilter, setDomainFilter] = useState<BlueprintDomain>("all");
  const [adminMode, setAdminMode] = useState(false);
  const [activeTab, setActiveTab] = useState<BuilderTab>("request");

  // New state for enhanced submission
  const [attachments, setAttachments] = useState<SubmissionAttachment[]>([]);
  const [suggestedName, setSuggestedName] = useState("");
  const [agentLevel, setAgentLevel] = useState<AgentLevel | "">("");
  const [levelOverridden, setLevelOverridden] = useState(false);
  const [deployLocation, setDeployLocation] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [deployedBlueprints, setDeployedBlueprints] = useState<Set<string>>(new Set());
  const [blueprintModalOpen, setBlueprintModalOpen] = useState(false);
  const [selectedBlueprint, setSelectedBlueprint] = useState<(typeof BLUEPRINTS)[number] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-infer agent level from prompt + name (debounced via useMemo)
  const inferredLevel = useMemo(
    () => (promptText.trim() || suggestedName.trim()) ? inferAgentLevel(promptText, suggestedName) : ("" as AgentLevel | ""),
    [promptText, suggestedName]
  );

  // Auto-set the level when inference changes, unless user manually overrode
  useEffect(() => {
    if (!levelOverridden && inferredLevel) {
      setAgentLevel(inferredLevel);
    }
  }, [inferredLevel, levelOverridden]);

  const nameValid = suggestedName.trim().length > 0;
  const promptValid = promptText.trim().length > 0;
  const canSubmit = promptValid && nameValid;

  const filteredBlueprints = domainFilter === "all"
    ? BLUEPRINTS
    : BLUEPRINTS.filter((bp) => bp.domain === domainFilter);

  const handleSubmitPrompt = () => {
    setTriedSubmit(true);
    if (!canSubmit) return;
    submitPrompt({
      prompt: promptText.trim(),
      suggestedName: suggestedName.trim(),
      agentLevel: (inferredLevel || "l2") as AgentLevel,
      deployLocation: deployLocation.trim() || undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    setPromptText("");
    setSuggestedName("");
    setAgentLevel("");
    setLevelOverridden(false);
    setDeployLocation("");
    setAttachments([]);
    setTriedSubmit(false);
    setPromptSubmitted(true);
    setTimeout(() => setPromptSubmitted(false), 4000);
  };

  const handleUseExample = (example: string) => {
    setPromptText(example);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newAttachments: SubmissionAttachment[] = Array.from(files).map((f) => ({
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: f.name,
      type: getFileType(f.name),
      size: formatFileSize(f.size),
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const toggleRecording = () => {
    setIsRecording((prev) => !prev);
    if (!isRecording) {
      setTimeout(() => {
        setIsRecording(false);
        setPromptText((prev) =>
          prev
            ? prev + " [Voice input would be transcribed here]"
            : "I want an agent that helps with offboarding — handling move-out notices, scheduling final inspections, and calculating deposit returns automatically."
        );
      }, 3000);
    }
  };

  const handleOpenBlueprintModal = (bp: (typeof BLUEPRINTS)[number]) => {
    if (deployedBlueprints.has(bp.id)) return;
    setSelectedBlueprint(bp);
    setBlueprintModalOpen(true);
  };

  const handleBlueprintModalSubmit = (details: string, modalAttachments: SubmissionAttachment[]) => {
    if (!selectedBlueprint) return;
    const bp = selectedBlueprint;
    addAgentFromBlueprint({
      name: bp.name,
      status: "draft",
      domain: bp.domain,
      createdFrom: "blueprint",
      blueprintName: bp.name,
      description: bp.description,
    });
    submitPrompt({
      prompt: bp.description,
      suggestedName: bp.name,
      agentLevel: "l2",
      additionalDetails: details || undefined,
      attachments: modalAttachments.length > 0 ? modalAttachments : undefined,
    });
    setDeployedBlueprints((prev) => new Set(prev).add(bp.id));
    setBlueprintModalOpen(false);
    setSelectedBlueprint(null);
  };

  const handleReply = (submissionId: string, text: string) => {
    addMessageToSubmission(submissionId, text, "customer");
  };

  return (
    <>
        <PageHeader
          title={adminMode ? "Agent Requests — Internal Review" : "Agent Builder"}
          description={adminMode ? "Review, triage, and respond to customer agent requests. Messages sent here go directly to the customer." : "Build agents that work across Entrata on your behalf — from a simple description to a fully custom design."}
        />

        {/* Admin mode toggle */}
        <div className="mb-6 flex items-center justify-end">
          <Button
            variant={adminMode ? "secondary" : "outline"}
            size="sm"
            onClick={() => setAdminMode(!adminMode)}
            className={`rounded-full ${adminMode ? "border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100" : ""}`}
          >
            <UserCog className="h-3.5 w-3.5" />
            {adminMode ? "Switch to Customer View" : "Internal Team View"}
          </Button>
        </div>

        {adminMode ? (
          /* ── Admin View: Request Management Dashboard ── */
          <section className="section-block">
            {/* Summary stats */}
            <div className="mb-6 grid gap-3 sm:grid-cols-5">
              {SUBMISSION_STATUSES.map((s) => {
                const count = submissions.filter((sub) => sub.status === s.value).length;
                const statusStyle = SUBMISSION_STATUS_STYLES[s.value] ?? SUBMISSION_STATUS_STYLES.submitted;
                return (
                  <Card key={s.value} className="p-3 text-center">
                    <p className="text-xl font-semibold text-foreground">{count}</p>
                    <p className={`text-[10px] font-semibold ${statusStyle.text}`}>{s.label}</p>
                  </Card>
                );
              })}
            </div>

            {/* Submissions list */}
            <div className="mb-2 flex items-center justify-between">
              <h2 className="section-title flex items-center gap-2">
                <Users className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                All Customer Requests
              </h2>
              <span className="text-[length:var(--text-caption)] text-[hsl(var(--muted-foreground))]">
                {submissions.length} total
              </span>
            </div>

            {submissions.length === 0 ? (
              <p className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">No requests yet.</p>
            ) : (
              <div className="space-y-2">
                {submissions.map((sub) => (
                  <AdminSubmissionCard
                    key={sub.id}
                    sub={sub}
                    onSendMessage={(id, text) => addMessageToSubmission(id, text, "entrata")}
                    onStatusChange={updateSubmissionStatus}
                    onMetaChange={updateSubmissionMeta}
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
        <>

        {/* ── Tab bar ── */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BuilderTab)} className="mb-6">
          <TabsList className="h-auto rounded-full p-1">
            {BUILDER_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="rounded-full px-4 py-2">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

        {/* ── Tab: Agent Request ── */}
        <TabsContent value="request">
        <section className="section-block">
          <div className="rounded-xl border border-[hsl(var(--border))] bg-gradient-to-b from-white to-[hsl(var(--muted))]/30 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">
                  Describe the agent you&apos;d like to build
                </h2>
                <p className="text-[length:var(--text-caption)] text-[hsl(var(--muted-foreground))]">
                  Tell us what you need in plain English. Attach SOPs or recordings to give us more context.
                </p>
              </div>
            </div>

            <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-indigo-200 bg-indigo-50/80 px-4 py-2.5 text-sm text-indigo-800">
              <Lock className="h-4 w-4 shrink-0 text-indigo-600" />
              <span>
                Agents you request here are built <strong>exclusively for your properties</strong>. They won&apos;t be visible to or shared with other Entrata customers.
              </span>
            </div>

            {/* Textarea with attachment + mic helpers */}
            <div className="relative">
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="e.g. I want an agent that monitors lease expirations within 90 days, sends the resident a renewal offer based on market rent, and escalates to the property manager if no response in 7 days..."
                rows={3}
                className={`w-full resize-none rounded-lg border bg-white px-4 py-3 pb-11 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/60 focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 ${
                  triedSubmit && !promptValid ? "border-red-400" : "border-[hsl(var(--border))]"
                }`}
              />

              {/* Bottom toolbar inside textarea — input helpers only */}
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.rtf,.xls,.xlsx,.csv,.mp4,.mov,.avi,.webm,.png,.jpg,.jpeg,.gif,.webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach files (SOPs, documents, videos)"
                    className="h-auto gap-1 px-2 py-1.5 text-muted-foreground"
                  >
                    <Paperclip className="h-4 w-4" />
                    <span className="text-[11px] font-medium">Attach</span>
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleRecording}
                  title={isRecording ? "Stop recording" : "Describe with your voice"}
                  className={`h-8 w-8 ${
                    isRecording
                      ? "animate-pulse bg-red-100 text-red-600 hover:bg-red-100 hover:text-red-600"
                      : "text-muted-foreground"
                  }`}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Recording indicator */}
            {isRecording && (
              <div className="mt-2 flex items-center gap-2 rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-700">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
                </span>
                Listening... describe your agent and we&apos;ll transcribe it.
              </div>
            )}

            {/* Attached files chips */}
            {attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {attachments.map((att) => {
                  const Icon = ATTACHMENT_ICONS[att.type] ?? File;
                  return (
                    <span key={att.id} className="flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 py-1 pl-2 pr-1 text-[11px] text-[hsl(var(--foreground))]">
                      <Icon className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
                      {att.name}
                      <span className="text-[hsl(var(--muted-foreground))]">({att.size})</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAttachment(att.id)}
                        className="ml-0.5 h-5 w-5 text-muted-foreground"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Agent Name */}
            <div className="mt-4">
              <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Agent Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Bot className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={suggestedName}
                  onChange={(e) => setSuggestedName(e.target.value)}
                  placeholder="e.g. Offboarding Assistant"
                  className={`pl-8 ${triedSubmit && !nameValid ? "border-red-400" : ""}`}
                />
              </div>
              {triedSubmit && !nameValid && (
                <p className="mt-0.5 text-[10px] font-medium text-red-500">Agent name is required</p>
              )}
            </div>

            {/* Deploy location — shown for L1 or L2 */}
            {(agentLevel === "l1" || agentLevel === "l2") && (
              <div className="mt-3">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Where should &quot;Deploy Agent&quot; appear?
                </label>
                <Input
                  value={deployLocation}
                  onChange={(e) => setDeployLocation(e.target.value)}
                  placeholder="e.g. Renewals workflow — after lease expiration scan"
                />
                <p className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">
                  Tell us where in the Entrata workflow this {LEVEL_LABELS[agentLevel]} agent&apos;s deploy action should be surfaced.
                </p>
              </div>
            )}

            {/* Roster linkage hint */}
            {nameValid && (
              <div className="mt-3 flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-[11px] text-blue-700">
                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                Once approved, <strong>{suggestedName}</strong> will be added to the{" "}
                <Link href="/agent-roster" className="font-semibold underline hover:no-underline">Agent Roster</Link>
                {" "}as a private agent for your properties.
              </div>
            )}

            {/* Validation summary */}
            {triedSubmit && !canSubmit && (
              <div className="mt-3 flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Please fill in all required fields{!promptValid ? " — include a description" : ""}{!nameValid ? " — add an agent name" : ""}.
              </div>
            )}

            {/* Submit button — at the bottom of the form */}
            <Button
              onClick={handleSubmitPrompt}
              className="mt-4 w-full"
              size="lg"
              disabled={!canSubmit}
            >
              <Send className="h-4 w-4" />
              Submit Agent Request
            </Button>

            {promptSubmitted && (
              <div className="mt-3 flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Thanks for submitting your request! Our team will review it and may reach out with follow-up questions. We appreciate every idea — keep them coming!
              </div>
            )}
          </div>

          {/* Submissions queue */}
          {submissions.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Your submissions
              </h3>
              <div className="space-y-2">
                {submissions.map((sub) => (
                  <SubmissionCard key={sub.id} sub={sub} onReply={handleReply} />
                ))}
              </div>
            </div>
          )}
        </section>
        </TabsContent>

        {/* ── Tab: Agent Blueprints ── */}
        <TabsContent value="blueprints">
          <section>
            <div className="mb-1 flex items-center justify-between">
              <h2 className="section-title">Agent Blueprints</h2>
              <span className="text-[length:var(--text-caption)] text-[hsl(var(--muted-foreground))]">
                {filteredBlueprints.length} available
              </span>
            </div>
            <p className="mb-4 text-[length:var(--text-body)] text-[hsl(var(--muted-foreground))]">
              Pre-built agent patterns organized by domain. Deploy one to get started quickly, or use it as a starting point.
            </p>

            {/* Domain filter tabs */}
            <div className="mb-4 flex flex-wrap gap-1">
              {DOMAIN_FILTERS.map((f) => {
                const Icon = f.icon;
                const isActive = domainFilter === f.value;
                return (
                  <Button
                    key={f.value}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDomainFilter(f.value)}
                    className="rounded-full"
                  >
                    <Icon className="h-3 w-3" />
                    {f.label}
                  </Button>
                );
              })}
            </div>

            {/* Blueprint cards — 2 columns */}
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredBlueprints.map((bp) => {
                const domainColor: Record<AgentDomain, string> = {
                  leasing: "bg-blue-50 text-blue-700",
                  accounting: "bg-purple-50 text-purple-700",
                  maintenance: "bg-orange-50 text-orange-700",
                  renewals: "bg-emerald-50 text-emerald-700",
                  compliance: "bg-red-50 text-red-700",
                  general: "bg-gray-50 text-gray-700",
                };
                return (
                  <Card key={bp.id} className="flex flex-col transition-shadow hover:shadow-md">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{bp.name}</CardTitle>
                        <Badge variant="outline" className={`rounded-full border-transparent text-[10px] ${domainColor[bp.domain]}`}>
                          {DOMAIN_LABELS[bp.domain]}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="text-[length:var(--text-caption)] leading-relaxed text-muted-foreground">
                        {bp.description}
                      </p>
                      <div className="mt-3 space-y-1.5 border-t border-border/50 pt-3">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">Impact</span>
                          <span className="font-medium text-emerald-600">{bp.impact}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">Connects to</span>
                          <span className="font-medium text-foreground">{bp.connects}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        variant={deployedBlueprints.has(bp.id) ? "outline" : "secondary"}
                        onClick={() => handleOpenBlueprintModal(bp)}
                        disabled={deployedBlueprints.has(bp.id)}
                        className={`w-full ${
                          deployedBlueprints.has(bp.id)
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                            : ""
                        }`}
                      >
                        {deployedBlueprints.has(bp.id) ? "Blueprint Requested" : "Request this Blueprint"}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </section>
        </TabsContent>

        {/* ── Tab: Your Agents ── */}
        <TabsContent value="your-agents">
          <section className="section-block">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <h2 className="section-title">Your Agents</h2>
                <span className="text-[length:var(--text-caption)] text-[hsl(var(--muted-foreground))]">
                  {agents.filter((a) => a.status === "live").length} active · {agents.length} total
                </span>
              </div>
              <p className="mb-4 text-[length:var(--text-body)] text-[hsl(var(--muted-foreground))]">
                Agents you&apos;ve created or deployed. Activate or pause them as needed.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Created from</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((a) => {
                    const style = STATUS_STYLES[a.status] ?? STATUS_STYLES.draft;
                    const actionLabel = a.status === "live" ? "Pause" : "Activate";
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell className="text-muted-foreground">{DOMAIN_LABELS[a.domain] ?? a.domain ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {CREATED_FROM_LABELS[a.createdFrom] ?? a.createdFrom ?? "—"}
                          {a.blueprintName && <span className="opacity-60"> · {a.blueprintName}</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`rounded-full border-transparent ${style.bg} ${style.text}`}>
                            {style.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant={a.status === "live" ? "secondary" : "default"}
                            onClick={() => toggleAgent(a.id)}
                            className={a.status === "live"
                              ? "bg-gray-600 text-white hover:bg-gray-700"
                              : "bg-emerald-700 text-white hover:bg-emerald-800"
                            }
                          >
                            {actionLabel}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* SOP Callout */}
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-[hsl(var(--border))] bg-gradient-to-r from-[hsl(var(--muted))]/40 to-white p-4">
              <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--muted-foreground))]" />
              <div>
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                  Your agents are only as good as the knowledge you give them
                </p>
                <p className="mt-0.5 text-[length:var(--text-caption)] text-[hsl(var(--muted-foreground))]">
                  Upload your SOPs and training documents to make your agents smarter. When you upload SOPs, those train your humans AND your digital workforce.
                </p>
                <Link
                  href="/trainings-sop"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[hsl(var(--primary))] hover:underline"
                >
                  Go to Training &amp; SOPs
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </section>
        </TabsContent>

        {/* ── Tab: Custom Agent Designer ── */}
        <TabsContent value="designer" className="-mx-4 -mb-6 sm:-mx-6 lg:-mx-10">
        <section>
          <div className="flex min-h-[calc(100vh-12rem)] overflow-hidden border-t border-[hsl(var(--border))] bg-white">
            {/* ── Left sidebar ── */}
            <aside className="w-[200px] shrink-0 border-r border-[hsl(var(--border))] bg-[#fafafa]">
              {/* Assets section */}
              <div className="border-b border-[hsl(var(--border))]">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    <ChevronDown className="h-3 w-3" />
                    Assets
                  </span>
                  <span className="flex h-5 w-5 items-center justify-center rounded text-gray-400">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  </span>
                </div>
                <nav className="space-y-0.5 px-2 pb-2">
                  <div className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/></svg>
                    Recipes
                    <span className="ml-auto rounded bg-gray-200 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500">8</span>
                  </div>
                  <div className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v6m0 8v6M4.93 4.93l4.24 4.24m5.66 5.66l4.24 4.24M2 12h6m8 0h6M4.93 19.07l4.24-4.24m5.66-5.66l4.24-4.24"/></svg>
                    Connections
                    <span className="ml-auto rounded bg-gray-200 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500">5</span>
                  </div>
                  <div className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100">
                    <Wrench className="h-3.5 w-3.5" />
                    Tools
                    <span className="ml-auto rounded bg-gray-200 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500">3</span>
                  </div>
                </nav>
              </div>

              {/* Projects section */}
              <div>
                <div className="flex items-center justify-between bg-[#e8e3ff] px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5b47a5]">
                    Projects
                  </span>
                  <X className="h-3 w-3 text-[#5b47a5]" />
                </div>
                <nav className="space-y-0.5 px-2 py-2">
                  {["Application and Screening", "Drip Campaigns", "Installed Workflows", "Move In"].map((name) => (
                    <div key={name} className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100">
                      <ChevronRight className="h-3 w-3 text-gray-400" />
                      <span className="truncate">{name}</span>
                    </div>
                  ))}
                </nav>
              </div>
            </aside>

            {/* ── Main content ── */}
            <div className="flex-1 p-6">
              {/* Header row */}
              <div className="mb-4 flex items-start justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
                <span className="text-[10px] text-gray-400">
                  Sort by: <span className="text-gray-600">Latest activity</span> ▾
                </span>
              </div>

              {/* Search */}
              <div className="mb-5 w-48">
                <div className="flex items-center gap-2 rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-400">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  Search projects
                </div>
              </div>

              {/* Project cards grid */}
              <div className="grid gap-4 sm:grid-cols-3">
                {/* Drip Campaigns */}
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="mb-1 flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Drip Campaigns</p>
                      <p className="text-[10px] text-gray-400">
                        Edit &middot; <span className="text-blue-500">description</span>
                      </p>
                    </div>
                    <span className="text-gray-400">&middot;&middot;&middot;</span>
                  </div>
                  <div className="mt-4 flex items-center gap-1">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#c8372d] text-[9px] font-bold text-white">E</span>
                  </div>
                  <p className="mt-3 text-[9px] text-gray-400">
                    Last updated by <span className="text-gray-500">Danner Banks</span> on Feb 19, 2025, 5:44 PM
                  </p>
                </div>

                {/* Installed Workflows */}
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="mb-1 flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Installed Workflows</p>
                      <p className="text-[10px] text-gray-400">
                        Edit &middot; <span className="text-blue-500">description</span>
                      </p>
                    </div>
                    <span className="text-gray-400">&middot;&middot;&middot;</span>
                  </div>
                  <div className="mt-4 flex items-center gap-1">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#6d3fc0] text-[9px] font-bold text-white">W</span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#c8372d] text-[9px] font-bold text-white">E</span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2d7ff9] text-[9px] font-bold text-white">C</span>
                  </div>
                  <p className="mt-3 text-[9px] text-gray-400">
                    Last exported to <span className="text-gray-500">Paul Danford</span> on Dec 3, 2025, 4:39 PM
                  </p>
                </div>

                {/* Application and Screening */}
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="mb-1 flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Application and Screening</p>
                      <p className="text-[10px] text-gray-400">
                        Edit &middot; <span className="text-blue-500">description</span>
                      </p>
                    </div>
                    <span className="text-gray-400">&middot;&middot;&middot;</span>
                  </div>
                  <div className="mt-4 flex items-center gap-1">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#c8372d] text-[9px] font-bold text-white">E</span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e8a317] text-[9px] font-bold text-white">S</span>
                  </div>
                  <p className="mt-3 text-[9px] text-gray-400">
                    Last updated by <span className="text-gray-500">Paul Danford</span> on Nov 13, 2025, 2:28 PM
                  </p>
                </div>

                {/* Move In */}
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="mb-1 flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Move In</p>
                      <p className="text-[10px] text-gray-400">
                        Edit &middot; <span className="text-blue-500">description</span>
                      </p>
                    </div>
                    <span className="text-gray-400">&middot;&middot;&middot;</span>
                  </div>
                  <div className="mt-4 flex items-center gap-1">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-gray-300 text-[8px] text-gray-500">→</span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#c8372d] text-[9px] font-bold text-white">E</span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2d7ff9] text-[9px] font-bold text-white">C</span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e8a317] text-[9px] font-bold text-white">S</span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#6d3fc0] text-[9px] font-bold text-white">W</span>
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-gray-300 text-[8px] text-gray-500">→</span>
                  </div>
                  <p className="mt-3 text-[9px] text-gray-400">
                    Last updated by <span className="text-gray-500">Entrata_3582</span> on Aug 7, 2025, 9:36 AM
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        </TabsContent>

        </Tabs>
        </>
        )}

        <BlueprintRequestModal
          blueprint={selectedBlueprint}
          open={blueprintModalOpen}
          onClose={() => { setBlueprintModalOpen(false); setSelectedBlueprint(null); }}
          onSubmit={handleBlueprintModalSubmit}
        />
    </>
  );
}
