"use client";

import { useState, useMemo, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText, FilePlus, FolderOpen, FolderPlus, Pencil, Send, CheckCircle, Upload, Building2,
  Search, Clock, AlertTriangle, ChevronRight, X, CornerDownRight, BookOpen, Plus, MoreHorizontal, MoreVertical, Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  useVault, COMPLIANCE_ITEMS,
  type VaultItem, type ApprovalStatus, type AgentTrainingStatus,
} from "@/lib/vault-context";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAgents } from "@/lib/agents-context";
import { useWorkforce } from "@/lib/workforce-context";
import { useEscalations } from "@/lib/escalations-context";
import { EscalationDetailSheet } from "@/components/escalation-detail-sheet";
import { Shield, ShieldCheck, FileCheck, Users, Activity } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Chat, type ChatMessage } from "@/components/ui/chat";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DOC_TYPES = ["All", "sop", "policy", "lease", "other"] as const;
const APPROVAL_STATUSES = ["All", "review", "approved", "needs_review"] as const;
const PROPERTIES = ["All", "Portfolio", "Property A", "Property B", "Property C"];

const TRAIN_SOP_METRICS_STORAGE_KEY = "janet-poc-trainings-sop-metrics-prev";

type TrainSopMetricsSnapshot = {
  docCount: number;
  complianceLinked: number;
  sopsPending: number;
  agentsTrained: number;
  savedAt: string;
};

function getPreviousMetrics(): TrainSopMetricsSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TRAIN_SOP_METRICS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TrainSopMetricsSnapshot;
    if (parsed && typeof parsed.docCount === "number" && parsed.savedAt) return parsed;
  } catch { /* ignore */ }
  return null;
}

function formatTrendDelta(
  current: number,
  previous: number,
  options: { lowerIsBetter?: boolean; suffix?: string; lastVisitAt?: string }
): { text: string; variant: "positive" | "neutral" | "negative" } {
  const delta = current - previous;
  const { lowerIsBetter = false, suffix = "since last visit", lastVisitAt } = options;
  const ago =
    lastVisitAt &&
    (() => {
      try {
        const d = new Date(lastVisitAt);
        const days = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
        if (days === 0) return "today";
        if (days === 1) return "yesterday";
        if (days < 7) return `${days} days ago`;
        if (days < 30) return `${Math.floor(days / 7)} wk ago`;
        return `${Math.floor(days / 30)} mo ago`;
      } catch { return ""; }
    })();
  const visitNote = ago ? ` (${ago})` : "";
  if (delta === 0) return { text: `No change since last visit${visitNote}`, variant: "neutral" };
  const sign = delta > 0 ? "+" : "";
  const good = lowerIsBetter ? delta < 0 : delta > 0;
  return { text: `${sign}${delta} ${suffix}${visitNote}`, variant: good ? "positive" : "negative" };
}

// Mock AI answer generation for "Ask a question"
function generateMockAnswer(question: string, docs: VaultItem[]): string {
  const q = question.toLowerCase();
  const matches = docs.filter((d) => {
    const name = d.fileName.toLowerCase();
    const body = (d.body ?? "").toLowerCase();
    const tags = (d.tags ?? []).join(" ").toLowerCase();
    return name.includes(q) || body.includes(q) || q.split(/\s+/).some((w) => w.length > 3 && (name.includes(w) || body.includes(w) || tags.includes(w)));
  });
  if (matches.length === 0) {
    return "I couldn't find any documents matching your question. Try uploading a relevant SOP or policy first.";
  }
  const docNames = matches.slice(0, 3).map((d) => `"${d.fileName}"`).join(", ");
  const first = matches[0];
  const snippet = first.body ? first.body.replace(/<[^>]+>/g, "").slice(0, 200).trim() + "..." : "";
  return `Based on ${docNames}:\n\n${snippet || `Refer to ${first.fileName} for detailed guidance on this topic.`}`;
}

// Mock bulk summarize
function generateMockSummary(docs: VaultItem[]): string {
  return docs.map((d) => {
    const body = (d.body ?? "").replace(/<[^>]+>/g, "").trim();
    const snippet = body ? body.slice(0, 120) + "..." : "No content.";
    return `• ${d.fileName}: ${snippet}`;
  }).join("\n");
}

// Compliance coverage SVG ring
function CoverageRing({ filled, total, size = 64 }: { filled: number; total: number; size?: number }) {
  const pct = total > 0 ? filled / total : 0;
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={pct >= 1 ? "hsl(var(--primary))" : "hsl(142.1 76.2% 36.3%)"}
        strokeWidth={6} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-700"
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="fill-foreground text-sm font-semibold">
        {filled}/{total}
      </text>
    </svg>
  );
}

function TrainingsSopContent() {
  const {
    documents: items, setDocuments: setItems,
    addDocument: addDocToVault, updateDocument, addFolder: addFolderToVault,
    complianceChecked, setComplianceChecked,
    complianceSubjectDocumentIds, setComplianceSubjectDocumentId,
    docCount, activityLog, addActivity,
    workforceAcks, addWorkforceAck, removeWorkforceAck,
    approveDocument, markAgentTrained, moveToFolder, deleteDocument,
  } = useVault();
  const { agents } = useAgents();
  const { members: workforceMembers, humanMembers } = useWorkforce();

  const [activeTab, setActiveTab] = useState<"compliance" | "library" | "activity">("library");
  const [search, setSearch] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState<string>("All");
  const [approvalFilter, setApprovalFilter] = useState<string>("All");
  const [propertyFilter, setPropertyFilter] = useState("All");
  const [addDocMode, setAddDocMode] = useState<null | "choice" | "upload" | "entrata">(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "templates">("list");
  const [showExploreSops, setShowExploreSops] = useState(false);
  const [bulkActionResult, setBulkActionResult] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [complianceSelectSubject, setComplianceSelectSubject] = useState<string | null>(null);
  const [previousMetrics, setPreviousMetrics] = useState<TrainSopMetricsSnapshot | null>(null);
  const metricsSnapshotRef = useRef<TrainSopMetricsSnapshot | null>(null);
  const [askChatOpen, setAskChatOpen] = useState(false);
  const [askChatMessages, setAskChatMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", text: "Hi! Ask me anything about your documents, SOPs, or policies." },
  ]);
  const [bulkTagInput, setBulkTagInput] = useState("");
  const [showBulkTagInput, setShowBulkTagInput] = useState(false);
  const [bulkSummaryResult, setBulkSummaryResult] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentFolderId, setCurrentFolderIdRaw] = useState<string | null>(searchParams.get("folder"));
  const setCurrentFolderId = useCallback((id: string | null) => {
    setCurrentFolderIdRaw(id);
    const url = id ? `/trainings-sop?folder=${id}` : "/trainings-sop";
    router.push(url, { scroll: false });
  }, [router]);
  const [moveDocId, setMoveDocId] = useState<string | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [reviewDocId, setReviewDocId] = useState<string | null>(null);
  const { items: escalationItems, addEscalation } = useEscalations();
  const handleReviewDoc = useCallback((doc: VaultItem) => {
    const existing = escalationItems.find(
      (e) => e.type === "approval" && e.documentApprovalContext?.documentId === doc.id && e.status !== "Done"
    );
    if (existing) {
      setReviewDocId(existing.id);
      return;
    }
    const category = doc.documentType === "lease" ? "Leasing" : "Compliance";
    const newId = addEscalation({
      type: "approval",
      name: `Document review: ${doc.fileName}`,
      summary: "Document submitted for approval.",
      status: "Open",
      category,
      property: doc.property ?? "Portfolio",
      labels: [],
      notes: [],
      assignee: "",
      documentApprovalContext: {
        documentId: doc.id,
        documentName: doc.fileName,
        changeSummary: `Review requested for ${doc.fileName}.`,
        proposedBody: doc.body ?? "",
        previousBody: "",
      },
    });
    setReviewDocId(newId);
  }, [escalationItems, addEscalation]);

  const reviewEscalationItem = useMemo(() => {
    if (!reviewDocId) return null;
    return escalationItems.find((e) => e.id === reviewDocId) ?? null;
  }, [reviewDocId, escalationItems]);

  const pendingReviewDocs = useMemo(() => {
    return items.filter(
      (d) => d.type === "file" && !d.isTemplate &&
        (d.approvalStatus === "review" || d.approvalStatus === "needs_review")
    );
  }, [items]);

  const approvalEscalations = useMemo(() => {
    return escalationItems.filter(
      (e) => e.type === "approval" && e.status !== "Done" && e.documentApprovalContext
    );
  }, [escalationItems]);

  useEffect(() => { setPreviousMetrics(getPreviousMetrics()); }, []);

  useEffect(() => {
    return () => {
      try {
        const snapshot = metricsSnapshotRef.current;
        if (snapshot) localStorage.setItem(TRAIN_SOP_METRICS_STORAGE_KEY, JSON.stringify(snapshot));
      } catch { /* ignore */ }
    };
  }, []);

  const fileDocuments = useMemo(() => items.filter((i) => i.type === "file" && !i.isTemplate) as VaultItem[], [items]);
  const templateDocuments = useMemo(() => items.filter((i) => i.type === "file" && i.isTemplate) as VaultItem[], [items]);
  const folders = useMemo(() => items.filter((i) => i.type === "folder"), [items]);
  const currentFolder = useMemo(() => currentFolderId ? folders.find((f) => f.id === currentFolderId) : null, [currentFolderId, folders]);

  const filtered = useMemo(() => {
    let list = items;
    if (viewMode === "templates") {
      list = list.filter((i) => i.type === "file" && i.isTemplate);
    } else {
      // Normal list: filter by current folder
      list = list.filter((i) => {
        if (i.isTemplate) return false;
        if (currentFolderId) return i.folderId === currentFolderId;
        return !i.folderId || i.type === "folder";
      });
    }
    return list.filter((i) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !i.fileName.toLowerCase().includes(q) &&
          !i.owner.toLowerCase().includes(q) &&
          !i.documentType.toLowerCase().includes(q) &&
          !(i.source ?? "").toLowerCase().includes(q)
        ) return false;
      }
      if (docTypeFilter !== "All" && i.documentType !== docTypeFilter) return false;
      if (approvalFilter !== "All" && i.type === "file" && i.approvalStatus !== approvalFilter) return false;
      if (propertyFilter !== "All" && i.property !== propertyFilter) return false;
      return true;
    }).sort((a, b) => {
      if (a.type === "folder" && b.type !== "folder") return -1;
      if (a.type !== "folder" && b.type === "folder") return 1;
      return 0;
    });
  }, [items, search, docTypeFilter, approvalFilter, propertyFilter, viewMode, currentFolderId]);

  const linkedDocForSubject = (subject: string) => {
    const id = complianceSubjectDocumentIds[subject];
    return id ? fileDocuments.find((d) => d.id === id) : null;
  };
  const agentsForDocumentId = (documentId: string) => {
    const doc = fileDocuments.find((d) => d.id === documentId);
    const ids = doc?.linkedAgentIds ?? [];
    return agents.filter((a) => ids.includes(a.id));
  };
  const agentsWithComplianceTraining = useMemo(() => {
    return agents.map((agent) => {
      const areas: { subject: string; doc: VaultItem }[] = [];
      for (const subject of COMPLIANCE_ITEMS) {
        const docId = complianceSubjectDocumentIds[subject];
        if (!docId) continue;
        const doc = fileDocuments.find((d) => d.id === docId);
        if (doc?.linkedAgentIds?.includes(agent.id)) areas.push({ subject, doc });
      }
      return { agent, areas };
    });
  }, [agents, complianceSubjectDocumentIds, fileDocuments]);

  metricsSnapshotRef.current = {
    docCount: items.filter((i) => i.type === "file" && !i.isTemplate).length,
    complianceLinked: COMPLIANCE_ITEMS.filter((s) => complianceSubjectDocumentIds[s]).length,
    sopsPending: items.filter((i) => i.type === "file" && !i.isTemplate && i.approvalStatus === "review").length,
    agentsTrained: agentsWithComplianceTraining.filter(({ areas }) => areas.length > 0).length,
    savedAt: new Date().toISOString(),
  };

  const addDocument = (
    fileName: string,
    documentType: VaultItem["documentType"] = "sop",
    property?: string,
    effectiveDate?: string,
    source: "upload" | "entrata" = "upload",
    body?: string
  ) => {
    const docProperty = property ?? "Portfolio";
    const category = documentType === "lease" ? "Leasing" : "Compliance";
    const newId = addDocToVault({
      fileName, documentType,
      property: docProperty,
      approvalStatus: "review",
      trainedOn: "No",
      owner: "Admin", type: "file",
      source, version: "1.0",
      effectiveDate: effectiveDate || undefined,
      body,
      folderId: currentFolderId ?? undefined,
      history: [{ at: new Date().toISOString(), action: "submitted" as const, by: "Admin", summary: "New document submitted for review." }],
    });
    const escId = addEscalation({
      type: "approval",
      name: `Document review: ${fileName}`,
      summary: "New document submitted for review.",
      status: "Open",
      category,
      property: docProperty,
      assignee: "",
      linkToSource: `/trainings-sop/${newId}`,
      labels: [],
      documentApprovalContext: {
        documentId: newId,
        documentName: fileName,
        changeSummary: "New document submitted for review.",
        proposedBody: body ?? "",
        previousBody: "",
      },
    });
    setReviewDocId(escId);
    setAddDocMode(null);
  };

  const addFolder = (fileName: string) => { addFolderToVault(fileName); setShowNewFolder(false); };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const selectAll = () => {
    if (selectedIds.size === filtered.filter((i) => i.type === "file").length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.filter((i) => i.type === "file").map((i) => i.id)));
  };

  const selectedDocs = useMemo(() => items.filter((i) => selectedIds.has(i.id) && i.type === "file"), [items, selectedIds]);

  const runBulkAnalysis = () => {
    const count = selectedDocs.length;
    const types = Array.from(new Set(selectedDocs.map((d) => d.documentType)));
    const needsReview = selectedDocs.filter((d) => d.approvalStatus === "review").length;
    const noBody = selectedDocs.filter((d) => !d.body?.trim()).length;
    setBulkActionResult(
      `Analysis of ${count} document(s): Types: ${types.join(", ")}. ` +
      `${needsReview} pending review. ${noBody} missing content. ` +
      `${count - noBody} ready for training.`
    );
    addActivity({ action: "Bulk analysis", by: "Admin", detail: `Analyzed ${count} document(s)` });
  };

  const runBulkSummarize = () => {
    const summary = generateMockSummary(selectedDocs);
    setBulkSummaryResult(summary);
    setBulkActionResult(null);
    addActivity({ action: "Bulk summarize", by: "Admin", detail: `Summarized ${selectedDocs.length} document(s)` });
  };

  const runBulkTag = () => {
    setShowBulkTagInput(true);
    setBulkActionResult(null);
  };

  const applyBulkTag = () => {
    const tag = bulkTagInput.trim();
    if (!tag) return;
    selectedDocs.forEach((doc) => {
      const existing = doc.tags ?? [];
      if (!existing.map((t) => t.toLowerCase()).includes(tag.toLowerCase())) {
        updateDocument(doc.id, { tags: [...existing, tag] });
      }
    });
    setBulkActionResult(`Tag "${tag}" applied to ${selectedDocs.length} document(s).`);
    setShowBulkTagInput(false);
    setBulkTagInput("");
    addActivity({ action: "Bulk tag", by: "Admin", detail: `Applied tag "${tag}" to ${selectedDocs.length} document(s)` });
  };

  const setApproval = (id: string, status: ApprovalStatus) => {
    if (status === "approved") {
      approveDocument(id, "Admin");
    } else {
      updateDocument(id, { approvalStatus: status });
    }
    if (status === "approved") setEditingId(null);
  };

  const editingItem = editingId ? (items.find((i) => i.id === editingId) ?? null) : null;

  const handleAskChatSend = useCallback((text: string) => {
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text };
    setAskChatMessages((prev) => [...prev, userMsg]);
    addActivity({ action: "Question asked", by: "Admin", detail: text });
    setTimeout(() => {
      const answer = generateMockAnswer(text, fileDocuments);
      const assistantMsg: ChatMessage = { id: `a-${Date.now()}`, role: "assistant", text: answer };
      setAskChatMessages((prev) => [...prev, assistantMsg]);
    }, 600);
  }, [fileDocuments, addActivity]);

  const complianceLinkedCount = useMemo(
    () => COMPLIANCE_ITEMS.filter((s) => complianceSubjectDocumentIds[s]).length,
    [complianceSubjectDocumentIds]
  );
  const sopsPendingReviewCount = useMemo(
    () => items.filter((i) => i.type === "file" && !i.isTemplate && (i.approvalStatus === "review" || i.approvalStatus === "needs_review")).length,
    [items]
  );
  const agentsTrainedOnComplianceCount = useMemo(
    () => agentsWithComplianceTraining.filter(({ areas }) => areas.length > 0).length,
    [agentsWithComplianceTraining]
  );

  // Workforce ack helpers
  const getAcksForSubject = useCallback(
    (subject: string) => workforceAcks.filter((a) => a.subject === subject),
    [workforceAcks]
  );

  type KpiTrend = "positive" | "neutral" | "negative";
  const docTrend = previousMetrics
    ? formatTrendDelta(docCount, previousMetrics.docCount, { suffix: "added since last visit", lastVisitAt: previousMetrics.savedAt })
    : { text: "Add docs in Document library", variant: "neutral" as const };
  const complianceTrend = previousMetrics
    ? formatTrendDelta(complianceLinkedCount, previousMetrics.complianceLinked, { suffix: "linked since last visit", lastVisitAt: previousMetrics.savedAt })
    : { text: complianceLinkedCount === COMPLIANCE_ITEMS.length ? "All areas linked" : "Link SOPs in Compliance tab", variant: complianceLinkedCount === COMPLIANCE_ITEMS.length ? ("positive" as const) : ("neutral" as const) };
  const sopsPendingTrend = previousMetrics
    ? formatTrendDelta(sopsPendingReviewCount, previousMetrics.sopsPending, { lowerIsBetter: true, suffix: "since last visit", lastVisitAt: previousMetrics.savedAt })
    : { text: sopsPendingReviewCount === 0 ? "None pending" : "In review", variant: sopsPendingReviewCount === 0 ? ("positive" as const) : ("neutral" as const) };
  const agentsTrainedTrend = previousMetrics
    ? formatTrendDelta(agentsTrainedOnComplianceCount, previousMetrics.agentsTrained, { suffix: "since last visit", lastVisitAt: previousMetrics.savedAt })
    : { text: "Link agents to docs in Agent Roster", variant: "neutral" as const };

  const trainSopKpis: Array<{
    label: string; value: React.ReactNode; href: string;
    icon: React.ComponentType<{ className?: string }>;
    trendText: string; trendVariant: KpiTrend;
  }> = [
    { label: "Documents in Vault", value: docCount, href: "/trainings-sop", icon: FileText, trendText: docTrend.text, trendVariant: docTrend.variant },
    { label: "Compliance areas linked", value: `${complianceLinkedCount} of ${COMPLIANCE_ITEMS.length}`, href: "/trainings-sop", icon: Shield, trendText: complianceTrend.text, trendVariant: complianceTrend.variant },
    { label: "SOPs pending review", value: sopsPendingReviewCount, href: "/trainings-sop", icon: FileCheck, trendText: sopsPendingTrend.text, trendVariant: sopsPendingTrend.variant },
    { label: "Agents trained on compliance", value: `${agentsTrainedOnComplianceCount} of ${agents.length}`, href: "/trainings-sop", icon: Users, trendText: agentsTrainedTrend.text, trendVariant: agentsTrainedTrend.variant },
  ];

  // Training status helpers
  const getTrainingStatus = (docId: string, agentId: string): AgentTrainingStatus => {
    const doc = items.find((d) => d.id === docId);
    const record = doc?.trainingRecords?.find((r) => r.agentId === agentId);
    if (!record) return "pending";
    return record.status;
  };

  const trainingStatusBadge = (status: AgentTrainingStatus) => {
    const cls =
      status === "trained"
        ? "bg-[#B3FFCC] text-black dark:bg-emerald-900/40 dark:text-emerald-300"
        : status === "out_of_date"
          ? "bg-amber-400 text-amber-950 dark:bg-amber-900/40 dark:text-amber-300"
          : "bg-muted text-muted-foreground";
    const label = status === "out_of_date" ? "Out of date" : status === "trained" ? "Trained" : "Pending";
    return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>{label}</span>;
  };

  // Documents needing review (past nextReviewDate)
  const docsNeedingReview = useMemo(
    () => fileDocuments.filter((d) => d.approvalStatus === "needs_review"),
    [fileDocuments]
  );

  return (
    <>
      {currentFolder ? (
        <header className="page-header">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-1 text-sm text-muted-foreground">
                <button type="button" onClick={() => setCurrentFolderId(null)} className="hover:underline text-primary">Trainings & SOP</button>
                <ChevronRight className="h-3 w-3" />
                <span className="font-medium text-foreground">{currentFolder.fileName}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                </span>
                <h1 className="font-heading text-[hsl(var(--foreground))]">{currentFolder.fileName}</h1>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-44 p-1" align="start">
                    <button
                      type="button"
                      onClick={() => setRenamingFolderId(currentFolder.id)}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => setMoveDocId(currentFolder.id)}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      <CornerDownRight className="h-3.5 w-3.5" /> Move
                    </button>
                    <button
                      type="button"
                      onClick={() => { deleteDocument(currentFolder.id); setCurrentFolderId(null); }}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </header>
      ) : (
        <PageHeader
          title="Trainings & SOP"
          description="Your single source for SOPs and operational documents. Upload or add from Entrata to train and ground agents; tag for compliance. SOPs drive how your team and AI operate."
        />
      )}


      {/* Training gaps banner (hidden until compliance tab is reintroduced) */}
      {false && (() => {
        const unlinkedAreas = COMPLIANCE_ITEMS.filter((s) => !complianceSubjectDocumentIds[s]);
        const outOfDateAgents = agentsWithComplianceTraining.filter(({ agent, areas }) =>
          areas.some((a) => {
            const rec = a.doc.trainingRecords?.find((r) => r.agentId === agent.id);
            return rec?.status === "out_of_date";
          })
        );
        const reviewCount = pendingReviewDocs.length;
        const gaps: string[] = [];
        if (unlinkedAreas.length > 0) gaps.push(`${unlinkedAreas.length} compliance area${unlinkedAreas.length !== 1 ? "s" : ""} missing an SOP`);
        if (outOfDateAgents.length > 0) gaps.push(`${outOfDateAgents.length} agent${outOfDateAgents.length !== 1 ? "s" : ""} need retraining on updated documents`);
        if (reviewCount > 0) gaps.push(`${reviewCount} document${reviewCount !== 1 ? "s" : ""} awaiting review`);
        if (gaps.length === 0) return null;
        return (
          <Card className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30">
            <CardContent className="flex flex-col items-start gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Training gaps detected</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{gaps.join(" · ")}</p>
                </div>
              </div>
              <Button variant="default" size="sm" className="shrink-0" onClick={() => setActiveTab("compliance")}>
                Review gaps
              </Button>
            </CardContent>
          </Card>
        );
      })()}

      {/* Compliance coverage dashboard (hidden until compliance tab is reintroduced) */}
      {false && <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {trainSopKpis.map(({ label, value, href, icon: Icon, trendText, trendVariant }) => (
          <Link key={label} href={href}>
            <Card className="h-full transition-colors hover:border-primary/40 hover:bg-muted/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-0 pt-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4 py-1.5">
                <span className="text-xl font-semibold tracking-tight">{value}</span>
              </CardContent>
              {trendText && (
                <CardFooter className="px-4 pb-4 pt-0">
                  <p className={cn("text-xs",
                    trendVariant === "positive" && "text-green-600 dark:text-green-400",
                    trendVariant === "negative" && "text-red-600 dark:text-red-400",
                    (trendVariant === "neutral" || trendVariant == null) && "text-muted-foreground"
                  )}>{trendText}</p>
                </CardFooter>
              )}
            </Card>
          </Link>
        ))}
        {/* Coverage ring card */}
        <Card className="flex h-full items-center gap-3 px-4 py-4">
          <CoverageRing filled={complianceLinkedCount} total={COMPLIANCE_ITEMS.length} />
          <div>
            <p className="text-sm font-medium text-foreground">Compliance Coverage</p>
            <p className="text-xs text-muted-foreground">
              {complianceLinkedCount === COMPLIANCE_ITEMS.length ? "All areas have linked SOPs" : `${COMPLIANCE_ITEMS.length - complianceLinkedCount} area(s) need SOPs`}
            </p>
          </div>
        </Card>
      </div>}

      {/* Documents needing review alert */}
      {docsNeedingReview.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{docsNeedingReview.length} document(s) past review date</p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {docsNeedingReview.map((d) => d.fileName).join(", ")} — these need to be reviewed and re-approved to stay compliant.
            </p>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="mb-6">
        {!currentFolderId && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="library">Document library</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            <Button variant="outline" size="sm" onClick={() => setShowExploreSops(true)}>
              <BookOpen className="mr-1.5 h-3.5 w-3.5" /> Explore SOPs
            </Button>
          </div>
        )}

        {/* ── COMPLIANCE TAB ── */}
        <TabsContent value="compliance" className="mt-0">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted">
              <ShieldCheck className="h-6 w-6 text-foreground" />
            </span>
            <h3 className="text-lg font-semibold text-foreground">Coming soon</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Compliance tracking is on the way. You&apos;ll be able to link SOPs to compliance areas, track agent training status, and manage audit readiness from here.
            </p>
          </div>
        </TabsContent>

        {/* ── COMPLIANCE TAB (preserved for reintroduction) ── */}
        {false && (
        <TabsContent value="compliance" className="mt-0">
          <section>
            <h2 className="section-title mb-1">Compliance areas</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Required areas for our regulated industry. Link an SOP to each subject so your AI is trained on it and liability is reduced.
            </p>
            <div className="overflow-x-auto">
              <table className="table-borderless w-full min-w-[600px]">
                <thead>
                  <tr>
                    <th>Compliance area</th>
                    <th>Linked document</th>
                    <th className="w-40">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPLIANCE_ITEMS.map((subject) => {
                    const linkedDoc = linkedDocForSubject(subject);
                    return (
                      <tr key={subject} className="table-row-hover">
                        <td className="font-medium text-foreground">{subject}</td>
                        <td>
                          {linkedDoc ? (
                            <Link href={`/trainings-sop/${linkedDoc.id}`} className="text-sm text-primary hover:underline">
                              {linkedDoc.fileName}
                            </Link>
                          ) : (
                            <span className="text-sm text-muted-foreground">No document linked</span>
                          )}
                        </td>
                        <td>
                          <Button variant="secondary" size="sm" className="shrink-0 bg-white border border-border hover:bg-muted/80" onClick={() => setComplianceSelectSubject(subject)}>
                            {linkedDoc ? "Change" : "Select document"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Link one document per subject. Add documents in the Document library tab, or{" "}
              <button type="button" onClick={() => { setAddDocMode("choice"); setActiveTab("library"); }} className="font-medium text-primary hover:underline">+ Add Document</button>.
            </p>
          </section>

          {/* Agents & how they're trained */}
          <section className="mt-10">
            <h2 className="section-title mb-1">Agents & how they&apos;re trained</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              AI agents use compliance documents to ground their responses. Training status shows whether agents are current with the latest approved version.{" "}
              <Link href="/workforce" className="font-medium text-primary underline hover:no-underline">Workforce</Link> staff can acknowledge SOPs above.
            </p>
            <div className="overflow-x-auto">
              <table className="table-borderless w-full min-w-[700px]">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Trained on (compliance areas)</th>
                    <th>Training status</th>
                    <th>Document(s)</th>
                    <th className="w-28">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {agentsWithComplianceTraining.map(({ agent, areas }) => (
                    <tr key={agent.id} className="table-row-hover">
                      <td className="font-medium text-foreground">
                        <Link href="/agent-roster" className="text-primary hover:underline">{agent.name}</Link>
                      </td>
                      <td className="text-muted-foreground">
                        {areas.length > 0 ? areas.map((a) => a.subject).join(", ") : "—"}
                      </td>
                      <td>
                        {areas.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {areas.map(({ subject, doc }) => {
                              const status = getTrainingStatus(doc.id, agent.id);
                              return <span key={subject} className="flex items-center gap-1 text-xs">{trainingStatusBadge(status)}</span>;
                            })}
                          </div>
                        ) : "—"}
                      </td>
                      <td className="text-muted-foreground">
                        {areas.length > 0 ? (
                          <span className="flex flex-wrap gap-x-2 gap-y-0.5">
                            {areas.map(({ doc }) => (
                              <Link key={doc.id} href={`/trainings-sop/${doc.id}`} className="text-primary hover:underline">{doc.fileName}</Link>
                            ))}
                          </span>
                        ) : "—"}
                      </td>
                      <td onClick={(e) => e.stopPropagation()} className="space-x-1">
                        {areas.length > 0 && areas.some(({ doc }) => getTrainingStatus(doc.id, agent.id) !== "trained") && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px]"
                            onClick={() => {
                              areas.forEach(({ doc }) => markAgentTrained(doc.id, agent.id));
                              addActivity({ action: "Agent trained", by: "Admin", detail: `${agent.name} marked trained on ${areas.map((a) => a.subject).join(", ")}` });
                            }}
                          >
                            Mark trained
                          </Button>
                        )}
                        <Button variant="secondary" size="sm" className="h-7 bg-white border border-border hover:bg-muted/80 text-[11px]" asChild>
                          <Link href={`/agent-roster?agent=${agent.id}`}>Edit</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </TabsContent>
        )}

        {/* ── DOCUMENT LIBRARY TAB ── */}
        <TabsContent value="library" className="mt-0">
          {/* Documents awaiting review — reuses Command Center escalation card pattern */}
          {pendingReviewDocs.length > 0 && viewMode === "list" && !currentFolderId && (
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle>Awaiting Review</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {pendingReviewDocs.length} document{pendingReviewDocs.length !== 1 ? "s" : ""} pending review
                </p>
              </CardHeader>
              <CardContent>
                <div className="scrollbar-hide overflow-y-auto" style={{ maxHeight: "248px" }}>
                  <ul className="flex flex-col gap-2">
                    {pendingReviewDocs.map((doc) => {
                      const esc = approvalEscalations.find((e) => e.documentApprovalContext?.documentId === doc.id);
                      const isOverdue = doc.nextReviewDate && new Date(doc.nextReviewDate) < new Date();
                      const statusLabel = doc.approvalStatus === "needs_review" ? "Needs review" : "In review";
                      return (
                        <li key={doc.id}>
                          <button
                            type="button"
                            onClick={() => handleReviewDoc(doc)}
                            className="flex w-full gap-3 rounded-lg border border-border bg-muted/50 p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted dark:bg-muted/50 dark:hover:bg-muted"
                          >
                            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background"><FileText className="h-3.5 w-3.5 text-muted-foreground" /></span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <span className="truncate text-sm font-medium text-foreground" title={doc.fileName}>{doc.fileName}</span>
                                <div className="flex shrink-0 items-center gap-1.5">
                                  {isOverdue && (
                                    <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-800 dark:bg-red-900/40 dark:text-red-200">Overdue</span>
                                  )}
                                  <span className={cn(
                                    "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                                    doc.approvalStatus === "needs_review"
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                                      : "bg-amber-400 text-amber-950 dark:bg-amber-900/40 dark:text-amber-300"
                                  )}>
                                    {statusLabel}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="truncate">{doc.property ?? "Portfolio"}</span>
                                <span aria-hidden>·</span>
                                <span>v{doc.version ?? "1.0"}</span>
                                {doc.modified && (
                                  <>
                                    <span aria-hidden>·</span>
                                    <span className="truncate">{doc.modified}</span>
                                  </>
                                )}
                              </div>
                              {esc && (
                                <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                                  {esc.assignee && <span className="truncate">Assigned to {esc.assignee}</span>}
                                  {esc.assignee && esc.status && <span aria-hidden>·</span>}
                                  {esc.status && <span>{esc.status}</span>}
                                  {(esc.labels?.length ?? 0) > 0 && (
                                    <>
                                      <span aria-hidden>·</span>
                                      {esc.labels!.slice(0, 2).map((l) => (
                                        <span key={l} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{l}</span>
                                      ))}
                                      {esc.labels!.length > 2 && <span className="text-[10px]">+{esc.labels!.length - 2}</span>}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <input type="search" placeholder="Search files, type, or owners" value={search} onChange={(e) => setSearch(e.target.value)} className="input-base w-64 min-w-[12rem]" />
              <select value={docTypeFilter} onChange={(e) => setDocTypeFilter(e.target.value)} className="select-base w-auto min-w-[8rem]">
                <option value="All">Type: All</option>
                {DOC_TYPES.filter((d) => d !== "All").map((d) => (<option key={d} value={d}>{d}</option>))}
              </select>
              <select value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)} className="select-base w-auto min-w-[8rem]">
                {PROPERTIES.map((p) => (<option key={p} value={p}>{p === "All" ? "Property: All" : p}</option>))}
              </select>
              <select value={approvalFilter} onChange={(e) => setApprovalFilter(e.target.value)} className="select-base w-auto min-w-[8rem]">
                <option value="All">Approval: All</option>
                {APPROVAL_STATUSES.filter((a) => a !== "All").map((a) => (<option key={a} value={a}>{a === "needs_review" ? "Needs review" : a}</option>))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowNewFolder(true)}><FolderPlus className="h-4 w-4" /> New Folder</Button>
              <Button variant="outline" size="sm" onClick={() => setAddDocMode("choice")}><FilePlus className="h-4 w-4" /> Add Document</Button>
            </div>
          </div>

          {/* Bulk actions */}
          {selectedIds.size > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/30 p-3">
              <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
              <Button variant="secondary" size="sm" onClick={runBulkAnalysis}>Run analysis</Button>
              <Button variant="secondary" size="sm" onClick={runBulkSummarize}>Summarize</Button>
              <Button variant="secondary" size="sm" onClick={runBulkTag}>Tag</Button>
              <Button asChild size="sm"><Link href={`/workflows?docs=${Array.from(selectedIds).join(",")}`}>Run workflow</Link></Button>
              <button type="button" onClick={() => { setSelectedIds(new Set()); setShowBulkTagInput(false); setBulkActionResult(null); setBulkSummaryResult(null); }} className="text-sm text-muted-foreground hover:underline">Clear</button>
            </div>
          )}

          {showBulkTagInput && (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-border bg-muted/20 p-3">
              <input type="text" value={bulkTagInput} onChange={(e) => setBulkTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") applyBulkTag(); }} placeholder="Enter tag to apply" className="input-base h-8 w-48 text-sm" autoFocus />
              <Button size="sm" onClick={applyBulkTag} disabled={!bulkTagInput.trim()}>Apply tag</Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowBulkTagInput(false); setBulkTagInput(""); }}>Cancel</Button>
            </div>
          )}

          {bulkActionResult && <p className="mb-4 text-sm text-muted-foreground">{bulkActionResult}</p>}

          {bulkSummaryResult && (
            <div className="mb-4 rounded-md border border-border bg-muted/20 p-3">
              <p className="mb-1 text-xs font-medium text-foreground">Summary</p>
              <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{bulkSummaryResult}</pre>
              <button type="button" onClick={() => setBulkSummaryResult(null)} className="mt-2 text-xs text-primary hover:underline">Dismiss</button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="table-borderless w-full min-w-[800px]">
              <thead>
                <tr>
                  <th className="w-10"><input type="checkbox" checked={filtered.filter((i) => i.type === "file").length > 0 && selectedIds.size === filtered.filter((i) => i.type === "file").length} onChange={selectAll} className="h-4 w-4 rounded border-border" /></th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Property</th>
                  <th>Approval</th>
                  <th>Modified</th>
                  <th>Owner</th>
                  <th className="w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="table-row-hover"
                    onClick={row.type === "file" ? (e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest("button") || target.closest("a") || target.closest('input[type="checkbox"]')) return;
                      router.push(`/trainings-sop/${row.id}`);
                    } : row.type === "folder" ? () => setCurrentFolderId(row.id) : undefined}
                    role={row.type === "file" || row.type === "folder" ? "button" : undefined}
                    tabIndex={row.type === "file" || row.type === "folder" ? 0 : undefined}
                    onKeyDown={(row.type === "file" || row.type === "folder") ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (row.type === "folder") setCurrentFolderId(row.id); else router.push(`/trainings-sop/${row.id}`); } } : undefined}
                  >
                    {row.type === "folder" ? (
                      <td colSpan={2} className="font-medium text-foreground">
                        <span className="inline-flex items-center gap-1.5 cursor-pointer"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-500 dark:bg-gray-500"><FolderOpen className="h-3.5 w-3.5 text-white" /></span> {row.fileName}</span>
                      </td>
                    ) : (
                      <>
                        <td onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelect(row.id)} className="h-4 w-4 rounded border-border" />
                        </td>
                        <td className="font-medium text-foreground">
                          <Link href={`/trainings-sop/${row.id}`} className="inline-flex items-center gap-1.5 text-foreground hover:underline" onClick={(e) => e.stopPropagation()}>
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background"><FileText className="h-3.5 w-3.5 text-muted-foreground" /></span>
                            {row.fileName}
                            {row.isTemplate && <span className="ml-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">Template</span>}
                          </Link>
                        </td>
                      </>
                    )}
                    <td className="capitalize text-muted-foreground">{row.documentType}</td>
                    <td className="text-muted-foreground">{row.property}</td>
                    <td>
                      {row.type === "file" ? (
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.approvalStatus === "approved"
                            ? "bg-[#B3FFCC] text-black dark:bg-emerald-900/40 dark:text-emerald-300"
                            : row.approvalStatus === "review"
                              ? "bg-amber-400 text-amber-950 dark:bg-amber-900/40 dark:text-amber-300"
                              : row.approvalStatus === "needs_review"
                                ? "bg-red-500 text-white dark:bg-red-900/40 dark:text-red-300"
                                : "bg-muted text-muted-foreground"
                        }`}>{row.approvalStatus === "needs_review" ? "Needs review" : row.approvalStatus}</span>
                      ) : "—"}
                    </td>
                    <td className="text-muted-foreground">{row.modified}</td>
                    <td className="text-muted-foreground">
                      <Avatar className="inline-flex h-6 w-6 text-[10px]">
                        <AvatarFallback className="bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-200">{(row.owner ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>{" "}{row.owner}
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      {row.type === "file" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem onClick={() => router.push(`/trainings-sop/${row.id}?action=edit`)}>
                              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/trainings-sop/${row.id}?action=upload`)} className="whitespace-nowrap">
                              <Upload className="mr-2 h-3.5 w-3.5 shrink-0" /> Upload New Version
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setMoveDocId(row.id)}>
                              <CornerDownRight className="mr-2 h-3.5 w-3.5" /> Move
                            </DropdownMenuItem>
                            {(row.approvalStatus === "review" || row.approvalStatus === "needs_review") && (
                              <DropdownMenuItem onClick={() => handleReviewDoc(row)}>
                                <CheckCircle className="mr-2 h-3.5 w-3.5" /> Review
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteDocument(row.id)}>
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="mt-8 flex flex-col items-center justify-center py-12 text-center">
              {currentFolderId ? (
                <>
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/50">
                    <FolderOpen className="h-6 w-6 text-muted-foreground" />
                  </span>
                  <p className="text-sm font-medium text-foreground">This folder is empty</p>
                  <p className="mt-1 text-sm text-muted-foreground">Move documents into this folder or add a new one.</p>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setAddDocMode("choice")}><FilePlus className="h-4 w-4" /> Add Document</Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {viewMode === "templates" ? "No templates yet. Save a document as a template from the document detail page." : "No documents match. Try a different search or add a document."}
                </p>
              )}
            </div>
          )}

          {/* AI Document Assistant FAB + Chat Panel — hidden for now */}
        </TabsContent>

        {/* ── ACTIVITY TAB ── */}
        <TabsContent value="activity" className="mt-0">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted">
              <Activity className="h-6 w-6 text-foreground" />
            </span>
            <h3 className="text-lg font-semibold text-foreground">Coming soon</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              The activity feed is on the way. You&apos;ll be able to see uploads, approvals, training events, and other document actions here.
            </p>
          </div>
        </TabsContent>

        {/* ── ACTIVITY TAB (preserved for reintroduction) ── */}
        {false && (
        <TabsContent value="activity" className="mt-0">
          <section>
            <h2 className="section-title mb-1">Activity feed</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Recent actions across your document vault — uploads, approvals, training, and more.
            </p>
            {activityLog.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No activity yet. Actions like uploads, approvals, and training will appear here.</p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {activityLog.slice(0, 50).map((entry) => (
                  <li key={entry.id} className="flex items-start gap-3 px-4 py-3">
                    <Activity className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{entry.action}</span>
                        {entry.by && <span className="text-xs text-muted-foreground">by {entry.by}</span>}
                        <span className="text-xs text-muted-foreground">
                          {new Date(entry.at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      </div>
                      {entry.documentName && (
                        <p className="text-xs text-muted-foreground">
                          {entry.documentId ? (
                            <Link href={`/trainings-sop/${entry.documentId}`} className="text-primary hover:underline">{entry.documentName}</Link>
                          ) : entry.documentName}
                        </p>
                      )}
                      {entry.detail && <p className="text-xs text-muted-foreground">{entry.detail}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </TabsContent>
        )}
      </Tabs>

      {/* ── MODALS ── */}
      {addDocMode === "choice" && (
        <AddDocChoiceModal onClose={() => setAddDocMode(null)} onUpload={() => setAddDocMode("upload")} onFromEntrata={() => setAddDocMode("entrata")} />
      )}
      {addDocMode === "upload" && (
        <UploadDocModal onClose={() => setAddDocMode(null)} onSave={addDocument} properties={PROPERTIES.filter((p) => p !== "All")} fileInputRef={fileInputRef} />
      )}
      {addDocMode === "entrata" && (
        <EntrataDocsModal onClose={() => setAddDocMode(null)} onSelect={addDocument} properties={PROPERTIES.filter((p) => p !== "All")} />
      )}
      {showNewFolder && (
        <SimpleModal title="New Folder" placeholder="Folder name" onClose={() => setShowNewFolder(false)} onSave={addFolder} />
      )}
      {renamingFolderId && (
        <SimpleModal
          title="Rename Folder"
          placeholder="Folder name"
          initialValue={folders.find((f) => f.id === renamingFolderId)?.fileName ?? ""}
          onClose={() => setRenamingFolderId(null)}
          onSave={(name) => { updateDocument(renamingFolderId, { fileName: name }); setRenamingFolderId(null); }}
        />
      )}

      <EditDocSheet
        item={editingItem}
        onClose={() => setEditingId(null)}
        onSave={(id, updates) => { updateDocument(id, updates); setEditingId(null); }}
      />
      {complianceSelectSubject && (
        <ComplianceSelectDocumentModal
          subject={complianceSelectSubject}
          documents={fileDocuments}
          currentDocumentId={complianceSubjectDocumentIds[complianceSelectSubject] ?? null}
          onClose={() => setComplianceSelectSubject(null)}
          onSelect={(documentId) => {
            setComplianceSubjectDocumentId(complianceSelectSubject, documentId);
            setComplianceSelectSubject(null);
          }}
        />
      )}
      {moveDocId && (
        <MoveToFolderModal
          folders={folders}
          currentFolderId={items.find((d) => d.id === moveDocId)?.folderId ?? null}
          onClose={() => setMoveDocId(null)}
          onMove={(folderId) => { moveToFolder(moveDocId, folderId); setMoveDocId(null); }}
        />
      )}

      <EscalationDetailSheet
        item={reviewEscalationItem}
        open={!!reviewEscalationItem}
        onOpenChange={(open) => { if (!open) setReviewDocId(null); }}
      />

      <ExploreSopsDialog
        open={showExploreSops}
        onOpenChange={setShowExploreSops}
        existingDocNames={items.filter((d) => d.type === "file").map((d) => d.fileName)}
        onAdd={(template) => {
          const templateId = addDocToVault({
            fileName: template.name,
            documentType: template.documentType,
            property: "Portfolio",
            approvalStatus: "review",
            trainedOn: "No",
            owner: "Admin",
            type: "file",
            source: "upload",
            body: template.body,
            tags: template.tags,
            version: "1.0",
            history: [{ at: new Date().toISOString(), action: "submitted" as const, by: "Admin", summary: "New document submitted for review." }],
          });
          const escId = addEscalation({
            type: "approval",
            name: `Document review: ${template.name}`,
            summary: "New document submitted for review.",
            status: "Open",
            category: "Compliance",
            property: "Portfolio",
            assignee: "",
            linkToSource: `/trainings-sop/${templateId}`,
            labels: [],
            documentApprovalContext: {
              documentId: templateId,
              documentName: template.name,
              changeSummary: "New document submitted for review.",
              proposedBody: template.body ?? "",
              previousBody: "",
            },
          });
          setReviewDocId(escId);
        }}
      />
    </>
  );
}

/* ── SUB-COMPONENTS ── */

const ENTRATA_PREMADE_DOCS: { id: string; name: string; documentType: VaultItem["documentType"]; description: string; body?: string }[] = [
  { id: "entrata-leasing-app", name: "Leasing Application", documentType: "policy", description: "Standard application form and criteria", body: "<p>Entrata leasing application template. Configure in Entrata under Leasing > Applications.</p>" },
  { id: "entrata-movein", name: "Move-in Checklist", documentType: "sop", description: "Pre-move-in and day-of steps", body: "<p>Move-in checklist (Entrata). Covers unit walk, keys, paperwork, and portal setup.</p>" },
  { id: "entrata-fair-housing", name: "Fair Housing Policy", documentType: "policy", description: "Fair housing and advertising compliance", body: "<p>Fair housing policy template from Entrata. Align with your jurisdiction and HUD guidance.</p>" },
  { id: "entrata-security-deposit", name: "Security Deposit Policy", documentType: "policy", description: "Deposit collection, holding, and refund rules", body: "<p>Security deposit policy. Configure deposit amounts and return timelines in Entrata.</p>" },
  { id: "entrata-screening", name: "Screening Criteria", documentType: "policy", description: "Applicant screening and approval criteria", body: "<p>Screening criteria (Entrata). Define credit, income, and criminal criteria per property.</p>" },
  { id: "entrata-eviction", name: "Eviction Procedures", documentType: "sop", description: "Legal process and notice requirements", body: "<p>Eviction procedures. Follow state and local requirements; configure notices in Entrata.</p>" },
  { id: "entrata-accommodation", name: "Reasonable Accommodation Process", documentType: "sop", description: "Request handling and documentation", body: "<p>Reasonable accommodation process. Document requests and outcomes in Entrata.</p>" },
  { id: "entrata-lease-addendum", name: "Lease Addendum Template", documentType: "lease", description: "Standard addendum for lease changes", body: "<p>Lease addendum template. Use for pets, parking, or other lease modifications.</p>" },
  { id: "entrata-rent-collection", name: "Rent Collection SOP", documentType: "sop", description: "Due dates, late fees, and payment methods", body: "<p>Rent collection SOP. Align with Entrata charge codes and late fee settings.</p>" },
  { id: "entrata-maintenance-request", name: "Maintenance Request Form", documentType: "other", description: "How residents submit and track work orders", body: "<p>Maintenance request process. Residents use Entrata portal or front office.</p>" },
];

function MoveToFolderModal({
  folders, currentFolderId, onClose, onMove,
}: {
  folders: VaultItem[]; currentFolderId: string | null; onClose: () => void; onMove: (folderId: string | null) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="section-title">Move to folder</h3>
        <ul className="mt-4 space-y-1">
          <li>
            <button type="button" onClick={() => onMove(null)} className={cn("w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted", !currentFolderId && "bg-muted font-medium")}>
              Root (no folder)
            </button>
          </li>
          {folders.map((f) => (
            <li key={f.id}>
              <button type="button" onClick={() => onMove(f.id)} className={cn("w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2", currentFolderId === f.id && "bg-muted font-medium")}>
                <FolderOpen className="h-4 w-4 text-muted-foreground" />{f.fileName}
              </button>
            </li>
          ))}
        </ul>
        {folders.length === 0 && <p className="mt-2 text-xs text-muted-foreground">No folders yet. Create one first.</p>}
        <div className="mt-5 flex justify-end"><Button variant="outline" onClick={onClose}>Cancel</Button></div>
      </div>
    </div>
  );
}

function ComplianceSelectDocumentModal({
  subject, documents, currentDocumentId, onClose, onSelect,
}: {
  subject: string; documents: VaultItem[]; currentDocumentId: string | null; onClose: () => void; onSelect: (documentId: string | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState<string>("All");
  const [approvalFilter, setApprovalFilter] = useState<string>("All");
  const [propertyFilter, setPropertyFilter] = useState("All");

  const filtered = useMemo(() => {
    return documents.filter((i) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!i.fileName.toLowerCase().includes(q) && !i.owner.toLowerCase().includes(q) && !i.documentType.toLowerCase().includes(q) && !(i.source ?? "").toLowerCase().includes(q)) return false;
      }
      if (docTypeFilter !== "All" && i.documentType !== docTypeFilter) return false;
      if (approvalFilter !== "All" && i.approvalStatus !== approvalFilter) return false;
      if (propertyFilter !== "All" && i.property !== propertyFilter) return false;
      return true;
    });
  }, [documents, search, docTypeFilter, approvalFilter, propertyFilter]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg border border-border bg-card shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-border p-4">
          <h3 className="font-semibold text-foreground">Select document for training</h3>
          <p className="mt-1 text-sm text-muted-foreground">Choose which document to use for <strong>{subject}</strong>.</p>
        </div>
        <div className="border-b border-border px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <input type="search" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="input-base h-8 w-48 min-w-0 text-sm" />
            <select value={docTypeFilter} onChange={(e) => setDocTypeFilter(e.target.value)} className="select-base h-8 w-auto min-w-[7rem] text-sm">
              <option value="All">Type: All</option>
              {DOC_TYPES.filter((d) => d !== "All").map((d) => (<option key={d} value={d}>{d}</option>))}
            </select>
            <select value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)} className="select-base h-8 w-auto min-w-[7rem] text-sm">
              <option value="All">Property: All</option>
              {PROPERTIES.filter((p) => p !== "All").map((p) => (<option key={p} value={p}>{p}</option>))}
            </select>
            <select value={approvalFilter} onChange={(e) => setApprovalFilter(e.target.value)} className="select-base h-8 w-auto min-w-[7rem] text-sm">
              <option value="All">Approval: All</option>
              {APPROVAL_STATUSES.filter((a) => a !== "All").map((a) => (<option key={a} value={a}>{a === "needs_review" ? "Needs review" : a}</option>))}
            </select>
          </div>
        </div>
        <div className="flex-1 overflow-auto min-h-0">
          <table className="table-borderless w-full min-w-[700px]">
            <thead><tr><th>File name</th><th>Type</th><th>Property</th><th>Approval</th><th>Modified</th><th className="w-20">Select</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">{documents.length === 0 ? "No documents in the Vault yet." : "No documents match the filters."}</td></tr>
              ) : filtered.map((row) => (
                <tr key={row.id} className="table-row-hover cursor-pointer" onClick={() => onSelect(row.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(row.id); } }}>
                  <td className="font-medium text-foreground"><span className="inline-flex items-center gap-1.5"><FileText className="h-4 w-4 shrink-0 text-muted-foreground" />{row.fileName}</span></td>
                  <td className="capitalize text-muted-foreground">{row.documentType}</td>
                  <td className="text-muted-foreground">{row.property}</td>
                  <td><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${row.approvalStatus === "approved" ? "bg-[#B3FFCC] text-black" : row.approvalStatus === "review" ? "bg-amber-400 text-amber-950" : row.approvalStatus === "needs_review" ? "bg-red-500 text-white" : "bg-muted text-muted-foreground"}`}>{row.approvalStatus === "needs_review" ? "Needs review" : row.approvalStatus}</span></td>
                  <td className="text-muted-foreground">{row.modified}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <Button variant="secondary" size="sm" className="h-7 bg-white border border-border hover:bg-muted/80" onClick={() => onSelect(row.id)}>
                      {currentDocumentId === row.id ? "Selected" : "Select"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between gap-2 border-t border-border p-4">
          <div>{currentDocumentId && (<Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => onSelect(null)}>Clear selection</Button>)}</div>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

function AddDocChoiceModal({ onClose, onUpload, onFromEntrata }: { onClose: () => void; onUpload: () => void; onFromEntrata: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="section-title">Add document</h3>
        <p className="mt-1 text-sm text-muted-foreground">Upload your own file or select a premade document from Entrata.</p>
        <div className="mt-6 flex flex-col gap-3">
          <Button variant="outline" className="justify-start gap-3 py-6" onClick={onUpload}>
            <Upload className="h-5 w-5 shrink-0" />
            <span className="text-left"><strong>Upload my document</strong><br /><span className="text-xs font-normal text-muted-foreground">Add a file from your device (PDF, DOC, TXT)</span></span>
          </Button>
          <Button variant="outline" className="justify-start gap-3 py-6" onClick={onFromEntrata}>
            <Building2 className="h-5 w-5 shrink-0" />
            <span className="text-left"><strong>Select from Entrata</strong><br /><span className="text-xs font-normal text-muted-foreground">Choose from premade Entrata templates and policies</span></span>
          </Button>
        </div>
        <div className="mt-5 flex justify-end"><Button variant="ghost" onClick={onClose}>Cancel</Button></div>
      </div>
    </div>
  );
}

function UploadDocModal({
  onClose, onSave, properties, fileInputRef,
}: {
  onClose: () => void;
  onSave: (fileName: string, documentType: VaultItem["documentType"], property?: string, effectiveDate?: string, source?: "upload" | "entrata", body?: string) => void;
  properties: string[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [fileName, setFileName] = useState("");
  const [documentType, setDocumentType] = useState<VaultItem["documentType"]>("sop");
  const [property, setProperty] = useState(properties[0] ?? "Portfolio");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [fileBody, setFileBody] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base = file.name.replace(/\.[^.]+$/, "");
      setFileName(base.trim() || file.name);
      // Read file content for .txt files
      if (file.name.endsWith(".txt") || file.type === "text/plain") {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = ev.target?.result;
          if (typeof text === "string") setFileBody(text);
        };
        reader.readAsText(file);
      } else {
        setFileBody(`[Uploaded file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]`);
      }
    }
    e.target.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="section-title">Upload my document</h3>
        <p className="mt-1 text-xs text-muted-foreground">Add a document from your device. For .txt files, content is extracted automatically.</p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">File</label>
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFileChange} className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground file:cursor-pointer" aria-label="Choose file" />
            <p className="mt-1 text-[10px] text-muted-foreground">PDF, DOC, DOCX, or TXT. Text content is extracted from .txt files.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Document name</label>
            <input type="text" value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="e.g. Leasing SOP" className="input-base w-full" autoFocus />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Document type</label>
            <select value={documentType} onChange={(e) => setDocumentType(e.target.value as VaultItem["documentType"])} className="select-base w-full">
              <option value="sop">SOP</option><option value="policy">Policy</option><option value="lease">Lease</option><option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Property</label>
            <select value={property} onChange={(e) => setProperty(e.target.value)} className="select-base w-full">
              {properties.map((p) => (<option key={p} value={p}>{p}</option>))}
            </select>
          </div>
          {documentType === "sop" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Effective date (optional)</label>
              <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="input-base w-full" />
            </div>
          )}
          {fileBody && (
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Content preview</label>
              <pre className="max-h-32 overflow-auto rounded-md border border-border bg-muted/30 p-2 text-xs text-muted-foreground">{fileBody.slice(0, 500)}{fileBody.length > 500 ? "..." : ""}</pre>
            </div>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => fileName.trim() && onSave(fileName.trim(), documentType, property, effectiveDate || undefined, "upload", fileBody || undefined)} disabled={!fileName.trim()}>Upload &amp; add to Vault</Button>
        </div>
      </div>
    </div>
  );
}

function EntrataDocsModal({
  onClose, onSelect, properties,
}: {
  onClose: () => void;
  onSelect: (fileName: string, documentType: VaultItem["documentType"], property?: string, effectiveDate?: string, source?: "upload" | "entrata", body?: string) => void;
  properties: string[];
}) {
  const [property, setProperty] = useState(properties[0] ?? "Portfolio");
  const [effectiveDate, setEffectiveDate] = useState("");
  const handleSelect = (doc: (typeof ENTRATA_PREMADE_DOCS)[number]) => {
    onSelect(doc.name, doc.documentType, property, effectiveDate || undefined, "entrata", doc.body);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg border border-border bg-card shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-border p-4">
          <h3 className="section-title">Select from Entrata</h3>
          <p className="mt-1 text-sm text-muted-foreground">Premade documents and templates from Entrata.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Property</label>
              <select value={property} onChange={(e) => setProperty(e.target.value)} className="select-base h-8 text-sm">
                {properties.map((p) => (<option key={p} value={p}>{p}</option>))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Effective date (optional)</label>
              <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="input-base h-8 text-sm" />
            </div>
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto p-4 space-y-2">
          {ENTRATA_PREMADE_DOCS.map((doc) => (
            <li key={doc.id}>
              <button type="button" onClick={() => handleSelect(doc)} className="flex w-full items-start gap-3 rounded-lg border border-border bg-background p-3 text-left transition-colors hover:bg-muted/50">
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">{doc.description}</p>
                  <span className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">{doc.documentType}</span>
                </div>
                <span className="shrink-0 text-xs text-primary">Add to Vault</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex justify-end border-t border-border p-4"><Button variant="ghost" onClick={onClose}>Cancel</Button></div>
      </div>
    </div>
  );
}

function SimpleModal({ title, placeholder, onClose, onSave, initialValue = "" }: { title: string; placeholder: string; onClose: () => void; onSave: (value: string) => void; initialValue?: string }) {
  const [value, setValue] = useState(initialValue);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="section-title">{title}</h3>
        <input type="text" value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className="input-base mt-4 w-full" autoFocus />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => value.trim() && onSave(value.trim())} disabled={!value.trim()}>Save</Button>
        </div>
      </div>
    </div>
  );
}

function EditDocSheet({
  item, onClose, onSave,
}: {
  item: VaultItem | null; onClose: () => void;
  onSave: (id: string, updates: Partial<Pick<VaultItem, "fileName" | "documentType" | "property" | "approvalStatus" | "version" | "effectiveDate" | "body" | "nextReviewDate" | "isTemplate">>) => void;
}) {
  const [fileName, setFileName] = useState("");
  const [documentType, setDocumentType] = useState<VaultItem["documentType"]>("sop");
  const [property, setProperty] = useState("");
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>("review");
  const [body, setBody] = useState("");
  const [nextReviewDate, setNextReviewDate] = useState("");
  const [isTemplate, setIsTemplate] = useState(false);
  const open = !!item;

  useEffect(() => {
    if (item) {
      setFileName(item.fileName);
      setDocumentType(item.documentType);
      setProperty(item.property);
      setApprovalStatus(item.approvalStatus);
      setBody(item.body ?? "");
      setNextReviewDate(item.nextReviewDate ?? "");
      setIsTemplate(item.isTemplate ?? false);
    }
  }, [item?.id, item?.fileName, item?.documentType, item?.property, item?.approvalStatus, item?.body, item?.nextReviewDate, item?.isTemplate]);

  const handleSave = () => {
    if (!item) return;
    onSave(item.id, {
      fileName: fileName.trim() || item.fileName, documentType,
      property: property || item.property, approvalStatus, body,
      nextReviewDate: nextReviewDate || undefined,
      isTemplate: isTemplate || undefined,
    });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit document</SheetTitle>
          <SheetDescription>Document lifecycle: review → approved. Set a review date to be reminded when this document needs re-review.</SheetDescription>
        </SheetHeader>
        {item && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">File name</label>
              <input type="text" value={fileName} onChange={(e) => setFileName(e.target.value)} className="input-base w-full" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Document type</label>
              <select value={documentType} onChange={(e) => setDocumentType(e.target.value as VaultItem["documentType"])} className="select-base w-full">
                <option value="sop">SOP</option><option value="policy">Policy</option><option value="lease">Lease</option><option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Property</label>
              <select value={property} onChange={(e) => setProperty(e.target.value)} className="select-base w-full">
                {PROPERTIES.filter((p) => p !== "All").map((p) => (<option key={p} value={p}>{p}</option>))}
              </select>
            </div>
            {documentType === "sop" && (
              <>
                <div><label className="mb-1 block text-xs font-medium text-foreground">Version</label><p className="text-sm text-muted-foreground">{item.version ?? "1.0"} (auto-incremented on approval)</p></div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">Approval status</label>
                  <select value={approvalStatus} onChange={(e) => setApprovalStatus(e.target.value as ApprovalStatus)} className="select-base w-full">
                    <option value="review">review</option><option value="approved">approved</option><option value="needs_review">needs review</option>
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Next review date</label>
              <input type="date" value={nextReviewDate} onChange={(e) => setNextReviewDate(e.target.value)} className="input-base w-full" />
              <p className="mt-1 text-[10px] text-muted-foreground">Document is flagged &quot;Needs review&quot; after this date.</p>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isTemplate" checked={isTemplate} onChange={(e) => setIsTemplate(e.target.checked)} className="h-4 w-4 rounded border-border" />
              <label htmlFor="isTemplate" className="text-xs font-medium text-foreground">Save as template (not an active document)</label>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Content (body)</label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Enter or paste document content here." className="input-base min-h-[120px] w-full resize-y py-2" rows={5} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave}>Save</Button>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ── Explore SOPs Dialog ── */

const SOP_TEMPLATES: { id: string; name: string; category: string; documentType: VaultItem["documentType"]; description: string; tags?: string[]; body?: string }[] = [
  { id: "t-1", name: "Fair Housing Policy", category: "Compliance", documentType: "policy", description: "Outlines fair housing obligations, protected classes, and prohibited practices for all staff and AI agents.", tags: ["compliance", "fair-housing"] },
  { id: "t-2", name: "Screening & Application SOP", category: "Compliance", documentType: "sop", description: "Standard procedure for applicant screening, criteria disclosure, and adverse action notices.", tags: ["compliance", "screening"] },
  { id: "t-3", name: "Reasonable Accommodation SOP", category: "Compliance", documentType: "sop", description: "Process for handling accommodation and modification requests under the Fair Housing Act and ADA.", tags: ["compliance", "accommodation"] },
  { id: "t-4", name: "Leasing & Move-In SOP", category: "Leasing", documentType: "sop", description: "End-to-end leasing workflow from inquiry through lease execution and move-in coordination.", tags: ["leasing"] },
  { id: "t-5", name: "Renewal & Retention SOP", category: "Leasing", documentType: "sop", description: "Renewal offer timing, retention strategies, rent increase communication, and lease extension handling.", tags: ["leasing", "retention"] },
  { id: "t-6", name: "Notice to Vacate SOP", category: "Leasing", documentType: "sop", description: "Procedures for processing move-out notices, scheduling inspections, and final account settlement.", tags: ["leasing", "move-out"] },
  { id: "t-7", name: "Maintenance Request SOP", category: "Maintenance", documentType: "sop", description: "Work order intake, prioritization, vendor dispatch, resident communication, and completion tracking.", tags: ["maintenance"] },
  { id: "t-8", name: "Emergency Maintenance SOP", category: "Maintenance", documentType: "sop", description: "After-hours emergency response procedures for floods, fires, lock-outs, and HVAC failures.", tags: ["maintenance", "emergency"] },
  { id: "t-9", name: "Unit Turn & Make-Ready SOP", category: "Maintenance", documentType: "sop", description: "Checklist and timeline for turning units between residents, including inspection and punch list.", tags: ["maintenance", "turns"] },
  { id: "t-10", name: "Rent Collection & Delinquency SOP", category: "Payments", documentType: "sop", description: "Payment processing, late fee policies, delinquency follow-up cadence, and payment plan procedures.", tags: ["payments"] },
  { id: "t-11", name: "Refund & Credit Policy", category: "Payments", documentType: "policy", description: "Guidelines for issuing refunds, concessions, and account credits with approval thresholds.", tags: ["payments"] },
  { id: "t-12", name: "Resident Complaint Escalation SOP", category: "Resident Relations", documentType: "sop", description: "How to receive, log, escalate, and resolve resident complaints across all channels.", tags: ["resident-relations", "escalation"] },
  { id: "t-13", name: "Pet & Animal Policy", category: "General", documentType: "policy", description: "Pet policies, breed restrictions, pet deposits, and assistance animal verification procedures.", tags: ["policy"] },
  { id: "t-14", name: "Vendor Management SOP", category: "General", documentType: "sop", description: "Vendor onboarding, insurance verification, performance tracking, and invoice approval workflows.", tags: ["operations", "vendors"] },
];

const SOP_TEMPLATE_CATEGORIES = [...new Set(SOP_TEMPLATES.map((t) => t.category))];

function ExploreSopsDialog({
  open,
  onOpenChange,
  existingDocNames,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingDocNames: string[];
  onAdd: (template: (typeof SOP_TEMPLATES)[0]) => void;
}) {
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const filtered = categoryFilter === "All"
    ? SOP_TEMPLATES
    : SOP_TEMPLATES.filter((t) => t.category === categoryFilter);

  const handleAdd = (template: (typeof SOP_TEMPLATES)[0]) => {
    onAdd(template);
    setAddedIds((prev) => new Set(prev).add(template.id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Explore SOP Templates
          </DialogTitle>
          <DialogDescription>
            Browse templates to jumpstart your document library. Add any template for review, then customize it for your portfolio.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5 pb-2">
          <button
            type="button"
            onClick={() => setCategoryFilter("All")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              categoryFilter === "All" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            All
          </button>
          {SOP_TEMPLATE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                categoryFilter === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          <div className="divide-y divide-border pb-2">
            {filtered.map((template) => {
              const alreadyInVault = existingDocNames.some((n) => n.toLowerCase() === template.name.toLowerCase());
              const justAdded = addedIds.has(template.id);
              return (
                <div key={template.id} className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <FileText className="h-4 w-4 text-foreground" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{template.name}</p>
                      <Badge variant="secondary" className="text-[10px]">{template.documentType}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{template.description}</p>
                  </div>
                  <div className="shrink-0 pt-0.5">
                    {alreadyInVault || justAdded ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle className="h-3.5 w-3.5" /> {justAdded ? "Added" : "In library"}
                      </span>
                    ) : (
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleAdd(template)}>
                        <Plus className="h-3 w-3" /> Add
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TrainingsSopPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <TrainingsSopContent />
    </Suspense>
  );
}
