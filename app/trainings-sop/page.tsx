"use client";

import { useState, useMemo, useEffect, useRef, useCallback, Suspense, useId } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText, FilePlus, FolderOpen, FolderPlus, Pencil, Send, CheckCircle, Upload, Building2,
  Search, Clock, AlertTriangle, ChevronRight, X, CornerDownRight, BookOpen, Plus, MoreHorizontal, MoreVertical, Trash2, Link2, Blocks, Download
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  useVault,
  COMPLIANCE_ITEMS,
  DEFAULT_VIEWER_ACCESS,
  approvalStatusDisplayLabel,
  type VaultItem,
  type ApprovalStatus,
  type AgentTrainingStatus,
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
import { PropertySelector } from "@/components/property-selector";
import { getSelectedPropertyNames, getDataForView } from "@/lib/property-selector-data";
import { ChevronDown } from "lucide-react";
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

/** Library filter values; `pending_review` matches both `review` and `needs_review`. */
const APPROVAL_FILTERS = ["All", "pending_review", "approved"] as const;
const PROPERTIES = ["All", "Portfolio", "Hillside Living", "Jamison Apartments", "Property C"];

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

  const [pageTab, setPageTab] = useState<"sops" | "trainings">("sops");
  const [activeTab, setActiveTab] = useState<"compliance" | "library" | "activity">("library");
  const [search, setSearch] = useState("");
  const [activitySearch, setActivitySearch] = useState("");
  const [activityActionFilter, setActivityActionFilter] = useState("All");
  const [activityDateFilter, setActivityDateFilter] = useState("All Time");
  const [approvalFilter, setApprovalFilter] = useState<string>("All");
  const [propertyFilter, setPropertyFilter] = useState("All");
  const [addDocMode, setAddDocMode] = useState<null | "choice" | "upload" | "entrata">(null);
  /** When set, opening Upload doc modal pre-fills from Connect Library import */
  const [libraryUploadPrefill, setLibraryUploadPrefill] = useState<{ displayName: string; body: string } | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "templates">("list");
  const [showExploreSops, setShowExploreSops] = useState(false);
  const [showConnectLibrary, setShowConnectLibrary] = useState(false);
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

  useEffect(() => {
    const connect = searchParams.get("connect");
    if (connect) {
      setShowConnectLibrary(true);
      router.replace("/trainings-sop", { scroll: false });
    }
  }, [searchParams, router]);

  const fileDocuments = useMemo(() => items.filter((i) => i.type === "file" && !i.isTemplate) as VaultItem[], [items]);
  const templateDocuments = useMemo(() => items.filter((i) => i.type === "file" && i.isTemplate) as VaultItem[], [items]);
  const folders = useMemo(() => items.filter((i) => i.type === "folder"), [items]);
  const currentFolder = useMemo(() => currentFolderId ? folders.find((f) => f.id === currentFolderId) : null, [currentFolderId, folders]);

  const getOwnerForProperty = useCallback((propName: string) => {
    if (propName === "Hillside Living") return "Smith Investments";
    if (propName === "Jamison Apartments") return "Jones Portfolio";
    if (propName === "Property C") return "Capital Group";
    return "Smith Investments";
  }, []);

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
          !(i.source ?? "").toLowerCase().includes(q)
        ) return false;
      }
      if (approvalFilter !== "All" && i.type === "file") {
        if (approvalFilter === "pending_review") {
          if (i.approvalStatus !== "review" && i.approvalStatus !== "needs_review") return false;
        } else if (i.approvalStatus !== approvalFilter) {
          return false;
        }
      }
      
      // Hierarchy Resolution Logic
      if (propertyFilter !== "All") {
        const isTargetProperty = i.scopeLevel === "property" && i.propertyId === propertyFilter;
        // Lookup the owner of the currently filtered property
        const targetOwnerId = getOwnerForProperty(propertyFilter); 
        const isTargetOwner = i.scopeLevel === "owner" && i.ownerId === targetOwnerId;
        const isCompanyLevel = i.scopeLevel === "company" || !i.scopeLevel; // fallback for legacy

        // Show the document if it falls into any of the cascading buckets
        if (!isTargetProperty && !isTargetOwner && !isCompanyLevel) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (a.type === "folder" && b.type !== "folder") return -1;
      if (a.type !== "folder" && b.type === "folder") return 1;
      return 0;
    });
  }, [items, search, approvalFilter, propertyFilter, viewMode, currentFolderId, getOwnerForProperty]);

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
    sopsPending: items.filter(
      (i) => i.type === "file" && !i.isTemplate && (i.approvalStatus === "review" || i.approvalStatus === "needs_review")
    ).length,
    agentsTrained: agentsWithComplianceTraining.filter(({ areas }) => areas.length > 0).length,
    savedAt: new Date().toISOString(),
  };

  const addDocument = (
    fileName: string,
    documentType: VaultItem["documentType"] = "sop",
    property?: string,
    effectiveDate?: string,
    source: "upload" | "entrata" = "upload",
    body?: string,
    options?: { scopeLevel?: string; ownerId?: string; propertyId?: string; isInternalOnly?: boolean }
  ) => {
    const docProperty = property ?? "Portfolio";
    const category = documentType === "lease" ? "Leasing" : "Compliance";
    const newId = addDocToVault({
      fileName, documentType,
      property: docProperty,
      scopeLevel: options?.scopeLevel as any,
      ownerId: options?.ownerId,
      propertyId: options?.propertyId,
      isInternalOnly: options?.isInternalOnly,
      approvalStatus: "review",
      trainedOn: "No",
      owner: "Admin", type: "file",
      source, version: "1.0",
      effectiveDate: effectiveDate || undefined,
      body,
      folderId: currentFolderId ?? undefined,
      viewerAccess: DEFAULT_VIEWER_ACCESS,
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
    const needsReview = selectedDocs.filter(
      (d) => d.approvalStatus === "review" || d.approvalStatus === "needs_review"
    ).length;
    const noBody = selectedDocs.filter((d) => !d.body?.trim()).length;
    setBulkActionResult(
      `Analysis of ${count} document(s). ` +
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
    : { text: sopsPendingReviewCount === 0 ? "None pending" : "Needs review", variant: sopsPendingReviewCount === 0 ? ("positive" as const) : ("neutral" as const) };
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

  // Derived state for activity log
  const filteredActivityLog = useMemo(() => {
    const now = new Date();
    return activityLog.filter((entry) => {
      // Action filter
      if (activityActionFilter !== "All" && entry.action !== activityActionFilter) return false;
      
      // Date filter
      if (activityDateFilter !== "All Time") {
        const entryDate = new Date(entry.at);
        const diffTime = Math.abs(now.getTime() - entryDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (activityDateFilter === "Last 7 Days" && diffDays > 7) return false;
        if (activityDateFilter === "Last 30 Days" && diffDays > 30) return false;
        if (activityDateFilter === "Last 90 Days" && diffDays > 90) return false;
      }

      // Search filter
      if (activitySearch) {
        const term = activitySearch.toLowerCase();
        if (
          !entry.action.toLowerCase().includes(term) &&
          !entry.by?.toLowerCase().includes(term) &&
          !entry.documentName?.toLowerCase().includes(term) &&
          !entry.detail?.toLowerCase().includes(term)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [activityLog, activitySearch, activityActionFilter, activityDateFilter]);

  const uniqueActivityActions = useMemo(() => {
    const actions = new Set(activityLog.map((e) => e.action));
    // Ensure standard actions are always available as filter options
    ["Document rejected", "Connection updated", "Label added", "Label removed"].forEach(action => actions.add(action));
    return ["All", ...Array.from(actions).sort()];
  }, [activityLog]);

  const handleExportCsv = () => {
    const headers = ["Date", "Action", "Performed By", "Document", "Details"];
    const rows = filteredActivityLog.map(entry => [
      new Date(entry.at).toLocaleString(),
      entry.action,
      entry.by || "",
      entry.documentName || "",
      entry.detail || ""
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `activity_feed_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        <>
          <div className="-mt-2 mb-3 flex justify-center py-2">
            <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => setPageTab("trainings")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  pageTab === "trainings"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Trainings
              </button>
              <button
                type="button"
                onClick={() => setPageTab("sops")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  pageTab === "sops"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                SOPs
              </button>
            </div>
          </div>
          <PageHeader
            title="Trainings & SOP"
            description="Your single source for SOPs and operational documents. Upload or add from Entrata to train and ground agents; tag for compliance. SOPs drive how your team and AI operate."
          />
        </>
      )}

      {pageTab === "trainings" && !currentFolder && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <BookOpen className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Trainings</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Create and manage training programs for your team and AI agents. Assign documents, track completion, and ensure everyone is up to date.
          </p>
          <span className="mt-4 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Coming Soon
          </span>
        </div>
      )}

      {pageTab === "sops" && (
      <>
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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="mb-6">
        {!currentFolderId && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <TabsList className="h-auto rounded-none border-0 border-b border-border bg-transparent p-0 gap-4">
              <TabsTrigger value="library" className="rounded-none border-b-2 border-transparent bg-transparent px-0 pb-2.5 pt-1 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground">Document library</TabsTrigger>
              <TabsTrigger value="compliance" className="rounded-none border-b-2 border-transparent bg-transparent px-0 pb-2.5 pt-1 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground">Compliance</TabsTrigger>
              <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent bg-transparent px-0 pb-2.5 pt-1 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground">Activity</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowExploreSops(true)}>
                <BookOpen className="mr-1.5 h-3.5 w-3.5" /> Explore SOPs
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowConnectLibrary(true)}>
                <Blocks className="mr-1.5 h-3.5 w-3.5" /> Connect Library
              </Button>
            </div>
          </div>
        )}

        {/* ── COMPLIANCE TAB ── */}
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
                                  <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-medium text-amber-950 dark:bg-amber-900/40 dark:text-amber-300">
                                    {approvalStatusDisplayLabel(doc.approvalStatus)}
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

          {/* My Drafts — same Card style as Awaiting Review */}
          {(() => {
            const drafts = fileDocuments.filter((d) => d.draftBody);
            if (drafts.length === 0 || viewMode !== "list" || currentFolderId) return null;
            return (
              <Card className="mb-6">
                <CardHeader className="pb-3">
                  <CardTitle>My Drafts</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {drafts.length} unsaved draft{drafts.length !== 1 ? "s" : ""} in progress
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="scrollbar-hide overflow-y-auto" style={{ maxHeight: "248px" }}>
                    <ul className="flex flex-col gap-2">
                      {drafts.map((d) => (
                        <li key={d.id}>
                          <Link
                            href={`/trainings-sop/${d.id}`}
                            className="flex w-full gap-3 rounded-lg border border-border bg-muted/50 p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted dark:bg-muted/50 dark:hover:bg-muted"
                          >
                            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <span className="truncate text-sm font-medium text-foreground" title={d.fileName}>{d.fileName}</span>
                                <span className="shrink-0 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-medium text-amber-950 dark:bg-amber-900/40 dark:text-amber-300">Draft</span>
                              </div>
                              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="truncate">{d.property ?? "Portfolio"}</span>
                                <span aria-hidden>·</span>
                                <span>v{d.version ?? "1.0"}</span>
                                {d.modified && (
                                  <>
                                    <span aria-hidden>·</span>
                                    <span className="truncate">{d.modified}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <input type="search" placeholder="Search files or owners" value={search} onChange={(e) => setSearch(e.target.value)} className="input-base w-64 min-w-[12rem]" />
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <button type="button" className={cn(
                    "select-base w-auto min-w-[8rem] flex items-center justify-between gap-1",
                    propertyFilter === "All" && "text-muted-foreground"
                  )}>
                    <span className="truncate">{propertyFilter === "All" ? "Property: All" : propertyFilter}</span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0 z-[200]" align="start" sideOffset={4}>
                  <div className="border-b border-border px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setPropertyFilter("All")}
                      className={cn("w-full rounded-sm px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted", propertyFilter === "All" && "font-medium bg-muted")}
                    >
                      All Properties
                    </button>
                  </div>
                  <PropertySelector
                    selected={(() => {
                      if (propertyFilter === "All") return new Set<string>();
                      const data = getDataForView("Property List");
                      let foundId = "";
                      const walk = (nodes: typeof data): void => {
                        for (const n of nodes) {
                          if (n.type === "property" && n.name === propertyFilter) { foundId = n.id; return; }
                          if (n.children) walk(n.children);
                        }
                      };
                      walk(data);
                      return foundId ? new Set([foundId]) : new Set<string>();
                    })()}
                    onSelectionChange={(ids) => {
                      const data = getDataForView("Property List");
                      const names = getSelectedPropertyNames(data, ids);
                      setPropertyFilter(names[0] ?? "All");
                    }}
                    className="h-[340px] border-0 shadow-none rounded-md"
                  />
                </PopoverContent>
              </Popover>
              <select value={approvalFilter} onChange={(e) => setApprovalFilter(e.target.value)} className="select-base w-auto min-w-[8rem]">
                <option value="All">Approval: All</option>
                {APPROVAL_FILTERS.filter((a) => a !== "All").map((a) => (
                  <option key={a} value={a}>{a === "pending_review" ? "Needs review" : "Approved"}</option>
                ))}
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
                  <th>Scope</th>
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
                    <td>
                      {row.type === "file" && (
                        <div className="flex items-center gap-2">
                          {(!row.scopeLevel || row.scopeLevel === "company") && (
                            <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">Company</span>
                          )}
                          {row.scopeLevel === "owner" && (
                            <span className="inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">Owner</span>
                          )}
                          {row.scopeLevel === "property" && (
                            <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">Property</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="text-muted-foreground">
                      {row.scopeLevel === "owner" && row.ownerId ? row.ownerId : (row.property || "—")}
                    </td>
                    <td>
                      {row.type === "file" ? (
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.approvalStatus === "approved"
                            ? "bg-[#B3FFCC] text-black dark:bg-emerald-900/40 dark:text-emerald-300"
                            : row.approvalStatus === "review" || row.approvalStatus === "needs_review"
                              ? "bg-amber-400 text-amber-950 dark:bg-amber-900/40 dark:text-amber-300"
                              : "bg-muted text-muted-foreground"
                        }`}>{approvalStatusDisplayLabel(row.approvalStatus)}</span>
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
                                <CheckCircle className="mr-2 h-3.5 w-3.5" /> Open approval
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
        <TabsContent value="activity" className="mt-6">
          <section>
            <div className="mb-6">
              <h2 className="section-title mb-1">Activity feed</h2>
              <p className="text-sm text-muted-foreground">
                Recent actions across your document vault — uploads, approvals, training, and more.
              </p>
            </div>
            
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="search"
                  placeholder="Search activity..."
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  className="input-base w-64 min-w-[12rem]"
                />
                <select
                  value={activityActionFilter}
                  onChange={(e) => setActivityActionFilter(e.target.value)}
                  className="select-base w-auto min-w-[8rem]"
                >
                  {uniqueActivityActions.map((action) => (
                    <option key={action} value={action}>
                      {action === "All" ? "Action: All" : action}
                    </option>
                  ))}
                </select>
                <select
                  value={activityDateFilter}
                  onChange={(e) => setActivityDateFilter(e.target.value)}
                  className="select-base w-auto min-w-[8rem]"
                >
                  {["All Time", "Last 7 Days", "Last 30 Days", "Last 90 Days"].map((range) => (
                    <option key={range} value={range}>
                      {range}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportCsv} className="h-9 shrink-0">
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>

            {filteredActivityLog.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No activity matches your filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-borderless w-full min-w-[800px]">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Action</th>
                      <th>User</th>
                      <th>Document</th>
                      <th>Scope</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActivityLog.slice(0, 50).map((entry) => {
                      const doc = entry.documentId ? items.find(d => d.id === entry.documentId) : null;
                      return (
                        <tr key={entry.id} className="table-row-hover">
                          <td className="whitespace-nowrap text-muted-foreground">
                            {new Date(entry.at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                          </td>
                          <td className="font-medium text-foreground">
                            {entry.action}
                            {entry.detail && (
                              <span className="block text-[10px] font-normal text-muted-foreground mt-0.5">
                                {entry.detail}
                              </span>
                            )}
                          </td>
                          <td className="text-muted-foreground">
                            {entry.by ? (
                              <div className="flex items-center gap-1.5">
                                <Avatar className="h-5 w-5 text-[9px]">
                                  <AvatarFallback className="bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-200">
                                    {entry.by.slice(0, 1).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                {entry.by}
                              </div>
                            ) : "—"}
                          </td>
                          <td className="max-w-[200px] truncate">
                            {entry.documentName ? (
                              entry.documentId ? (
                                <Link href={`/trainings-sop/${entry.documentId}`} className="font-medium text-primary hover:underline">
                                  {entry.documentName}
                                </Link>
                              ) : (
                                <span className="font-medium">{entry.documentName}</span>
                              )
                            ) : "—"}
                          </td>
                          <td className="text-muted-foreground">
                            {doc ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {(!doc.scopeLevel || doc.scopeLevel === "company") && (
                                    <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">Company</span>
                                  )}
                                  {doc.scopeLevel === "owner" && (
                                    <span className="inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">Owner</span>
                                  )}
                                  {doc.scopeLevel === "property" && (
                                    <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">Property</span>
                                  )}
                                </div>
                                {(doc.scopeLevel === "owner" || doc.scopeLevel === "property") && (
                                  <span className="text-[10px]">
                                    {doc.scopeLevel === "owner" ? (doc.ownerId || "—") : (doc.property || "—")}
                                  </span>
                                )}
                              </div>
                            ) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </TabsContent>
      </Tabs>
      </>
      )}

      {/* ── MODALS ── */}
      {addDocMode === "choice" && (
        <AddDocChoiceModal
          onClose={() => setAddDocMode(null)}
          onUpload={() => setAddDocMode("upload")}
          onFromEntrata={() => setAddDocMode("entrata")}
          onGoogleDrive={() => { setAddDocMode(null); setShowConnectLibrary(true); }}
          onMicrosoft365={() => { setAddDocMode(null); setShowConnectLibrary(true); }}
        />
      )}
      {addDocMode === "upload" && (
        <UploadDocModal
          onClose={() => {
            setAddDocMode(null);
            setLibraryUploadPrefill(null);
          }}
          onSave={addDocument}
          properties={PROPERTIES.filter((p) => p !== "All")}
          fileInputRef={fileInputRef}
          libraryPrefill={libraryUploadPrefill}
          onClearLibraryPrefill={() => setLibraryUploadPrefill(null)}
        />
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
      
      <ConnectLibraryDialog
        open={showConnectLibrary}
        onOpenChange={setShowConnectLibrary}
        onImportComplete={(displayName, body) => {
          setLibraryUploadPrefill({ displayName, body });
          setShowConnectLibrary(false);
          setAddDocMode("upload");
        }}
      />
    </>
  );
}

/* ── SUB-COMPONENTS ── */

function GoogleDriveIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M12.01 1.485c-2.082 0-3.754.02-3.743.047.01.02 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.005-.02-1.708-3.001-3.775-6.62l-3.76-6.574zm-4.76 1.73a789.828 789.861 0 0 0-3.63 6.319L0 15.868l1.89 3.298 1.885 3.297 3.62-6.335 3.618-6.33-1.88-3.287C8.1 4.704 7.255 3.22 7.25 3.214zm2.259 12.653-.203.348c-.114.198-.96 1.672-1.88 3.287a423.93 423.948 0 0 1-1.698 2.97c-.01.026 3.24.042 7.222.042h7.244l1.796-3.157c.992-1.734 1.85-3.23 1.906-3.323l.104-.167h-7.249z" fill="currentColor"/>
    </svg>
  );
}

function MicrosoftSharePointIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M24 13.5q0 1.242-.475 2.332-.474 1.09-1.289 1.904-.814.815-1.904 1.29-1.09.474-2.332.474-.762 0-1.523-.2-.106.997-.557 1.858-.451.862-1.154 1.494-.704.633-1.606.99-.902.358-1.91.358-1.09 0-2.045-.416-.955-.416-1.664-1.125-.709-.709-1.125-1.664Q6 19.84 6 18.75q0-.188.018-.375.017-.188.04-.375H.997q-.41 0-.703-.293T0 17.004V6.996q0-.41.293-.703T.996 6h3.54q.14-1.277.726-2.373.586-1.096 1.488-1.904Q7.652.914 8.807.457 9.96 0 11.25 0q1.395 0 2.625.533T16.02 1.98q.914.915 1.447 2.145T18 6.75q0 .188-.012.375-.011.188-.035.375 1.242 0 2.344.469 1.101.468 1.928 1.277.826.809 1.3 1.904Q24 12.246 24 13.5zm-12.75-12q-.973 0-1.857.34-.885.34-1.577.943-.691.604-1.154 1.43Q6.2 5.039 6.06 6h4.945q.41 0 .703.293t.293.703v4.945l.21-.035q.212-.75.61-1.424.399-.673.944-1.218.545-.545 1.213-.944.668-.398 1.43-.61.093-.503.093-.96 0-1.09-.416-2.045-.416-.955-1.125-1.664-.709-.709-1.664-1.125Q12.34 1.5 11.25 1.5zM6.117 15.902q.54 0 1.06-.111.522-.111.932-.37.41-.257.662-.679.252-.422.252-1.055 0-.632-.263-1.054-.264-.422-.662-.703-.399-.282-.856-.463l-.855-.34q-.399-.158-.662-.334-.264-.176-.264-.445 0-.2.14-.323.141-.123.335-.193.193-.07.404-.094.21-.023.351-.023.598 0 1.055.152.457.153.95.457V8.543q-.282-.082-.522-.14-.24-.06-.475-.1-.234-.041-.486-.059-.252-.017-.557-.017-.515 0-1.054.117-.54.117-.979.375-.44.258-.715.68-.275.421-.275 1.03 0 .598.263.997.264.398.663.68.398.28.855.474l.856.363q.398.17.662.358.263.187.263.457 0 .222-.123.351-.123.13-.31.2-.188.07-.393.087-.205.018-.369.018-.703 0-1.248-.234-.545-.235-1.107-.621v1.875q1.195.468 2.472.468zM11.25 22.5q.773 0 1.453-.293t1.19-.803q.51-.51.808-1.195.299-.686.299-1.459 0-.668-.223-1.277-.222-.61-.62-1.096-.4-.486-.95-.826-.55-.34-1.207-.48v1.933q0 .41-.293.703t-.703.293H7.57q-.07.375-.07.75 0 .773.293 1.459t.803 1.195q.51.51 1.195.803.686.293 1.459.293zM18 18q.926 0 1.746-.352.82-.351 1.436-.966.615-.616.966-1.43.352-.815.352-1.752 0-.926-.352-1.746-.351-.82-.966-1.436-.616-.615-1.436-.966Q18.926 9 18 9t-1.74.357q-.815.358-1.43.973t-.973 1.43q-.357.814-.357 1.74 0 .129.006.258t.017.258q.551.27 1.02.65t.838.855q.369.475.627 1.026.258.55.387 1.148Q17.18 18 18 18Z" fill="currentColor"/>
    </svg>
  );
}

function ConnectLibraryDialog({
  open,
  onOpenChange,
  onImportComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after mock import; parent should open the add-document / upload details flow */
  onImportComplete: (displayName: string, body: string) => void;
}) {
  const [integration, setIntegration] = useState<string | null>(null);
  const [connected, setConnected] = useState<Record<string, boolean>>({
    "google-drive": false,
    "ms-teams": false,
  });
  const [importing, setImporting] = useState<string | null>(null);
  
  const handleConnect = (id: string) => {
    setTimeout(() => {
      setConnected(prev => ({ ...prev, [id]: true }));
    }, 1000);
  };

  const handleImport = (name: string) => {
    setImporting(name);
    setTimeout(() => {
      onImportComplete(name, `<p>Imported content for ${name}</p>`);
      setImporting(null);
      onOpenChange(false);
      setIntegration(null);
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Connect Library</DialogTitle>
          <DialogDescription>
            Connect an external system to sync folders and files directly into your Vault.
          </DialogDescription>
        </DialogHeader>

        {!integration ? (
          <div className="grid grid-cols-2 gap-4 py-4">
            <button type="button" onClick={() => setIntegration("google-drive")} className="group flex flex-col items-center gap-3 rounded-lg border border-border p-6 text-center hover:border-primary hover:bg-primary/5 transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
                <GoogleDriveIcon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div>
                <p className="font-medium text-foreground">Google Drive</p>
                <p className="text-xs text-muted-foreground mt-1">{connected["google-drive"] ? "Connected" : "Not connected"}</p>
              </div>
            </button>
            <button type="button" onClick={() => setIntegration("ms-teams")} className="group flex flex-col items-center gap-3 rounded-lg border border-border p-6 text-center hover:border-primary hover:bg-primary/5 transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
                <MicrosoftSharePointIcon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div>
                <p className="font-medium text-foreground">Microsoft Teams / SharePoint</p>
                <p className="text-xs text-muted-foreground mt-1">{connected["ms-teams"] ? "Connected" : "Not connected"}</p>
              </div>
            </button>
          </div>
        ) : !connected[integration] ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Blocks className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-foreground">Connect {integration === "google-drive" ? "Google Drive" : "Microsoft Teams"}</h3>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">
              Authenticate with your account to browse and sync folders directly into the Vault.
            </p>
            <Button onClick={() => handleConnect(integration)}>Connect Account</Button>
            <Button variant="ghost" className="mt-2" onClick={() => setIntegration(null)}>Back to integrations</Button>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between py-2 mb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setIntegration(null)}>
                  <ChevronRight className="h-4 w-4 rotate-180" />
                </Button>
                <span className="font-medium">{integration === "google-drive" ? "Google Drive" : "Microsoft Teams"}</span>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-none">Connected</Badge>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2">
              <p className="text-xs text-muted-foreground mb-3">Select files to import into your Vault:</p>
              <div className="space-y-2">
                {["Employee Handbook 2025.pdf", "Maintenance Protocols v2.docx", "Leasing Addendums Folder", "Emergency Evacuation Plan"].map(name => (
                  <div key={name} className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      {name.includes("Folder") ? <FolderOpen className="h-4 w-4 text-muted-foreground" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
                      <span className="text-sm font-medium">{name}</span>
                    </div>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => handleImport(name)}
                      disabled={importing === name}
                    >
                      {importing === name ? "Importing..." : "Import"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const ENTRATA_PREMADE_DOCS: { id: string; name: string; documentType: VaultItem["documentType"]; description: string; body?: string }[] = [
  { id: "entrata-leasing-app", name: "Leasing Application", documentType: "policy", description: "Standard application form and criteria", body: "<p>Entrata leasing application template. Configure in Entrata under Leasing > Applications.</p>" },
  { id: "entrata-movein", name: "Move-in Checklist", documentType: "sop", description: "Pre-move-in and day-of steps", body: "<p>Move-in checklist (Entrata). Covers unit walk, keys, paperwork, and portal setup.</p>" },
  { id: "entrata-fair-housing", name: "Fair housing & anti-discrimination", documentType: "policy", description: "Fair housing and advertising compliance", body: "<p>Fair housing policy template from Entrata. Align with your jurisdiction and HUD guidance.</p>" },
  { id: "entrata-security-deposit", name: "Security deposit handling", documentType: "policy", description: "Deposit collection, holding, and refund rules", body: "<p>Security deposit policy. Configure deposit amounts and return timelines in Entrata.</p>" },
  { id: "entrata-screening", name: "Tenant screening & background checks", documentType: "policy", description: "Applicant screening and approval criteria", body: "<p>Screening criteria (Entrata). Define credit, income, and criminal criteria per property.</p>" },
  { id: "entrata-eviction", name: "Eviction & lease termination", documentType: "sop", description: "Legal process and notice requirements", body: "<p>Eviction procedures. Follow state and local requirements; configure notices in Entrata.</p>" },
  { id: "entrata-accommodation", name: "Reasonable accommodation & assistive animals", documentType: "sop", description: "Request handling and documentation", body: "<p>Reasonable accommodation process. Document requests and outcomes in Entrata.</p>" },
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
  const [approvalFilter, setApprovalFilter] = useState<string>("All");
  const [propertyFilter, setPropertyFilter] = useState("All");

  const filtered = useMemo(() => {
    return documents.filter((i) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!i.fileName.toLowerCase().includes(q) && !i.owner.toLowerCase().includes(q) && !(i.source ?? "").toLowerCase().includes(q)) return false;
      }
      if (approvalFilter !== "All") {
        if (approvalFilter === "pending_review") {
          if (i.approvalStatus !== "review" && i.approvalStatus !== "needs_review") return false;
        } else if (i.approvalStatus !== approvalFilter) {
          return false;
        }
      }
      if (propertyFilter !== "All" && i.property !== propertyFilter) return false;
      return true;
    });
  }, [documents, search, approvalFilter, propertyFilter]);

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
            <select value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)} className="select-base h-8 w-auto min-w-[7rem] text-sm">
              <option value="All">Property: All</option>
              {PROPERTIES.filter((p) => p !== "All").map((p) => (<option key={p} value={p}>{p}</option>))}
            </select>
            <select value={approvalFilter} onChange={(e) => setApprovalFilter(e.target.value)} className="select-base h-8 w-auto min-w-[7rem] text-sm">
              <option value="All">Approval: All</option>
              {APPROVAL_FILTERS.filter((a) => a !== "All").map((a) => (
                <option key={a} value={a}>{a === "pending_review" ? "Needs review" : "Approved"}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex-1 overflow-auto min-h-0">
          <table className="table-borderless w-full min-w-[700px]">
            <thead><tr><th>File name</th><th>Property</th><th>Approval</th><th>Modified</th><th className="w-20">Select</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">{documents.length === 0 ? "No documents in the Vault yet." : "No documents match the filters."}</td></tr>
              ) : filtered.map((row) => (
                <tr key={row.id} className="table-row-hover cursor-pointer" onClick={() => onSelect(row.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(row.id); } }}>
                  <td className="font-medium text-foreground"><span className="inline-flex items-center gap-1.5"><FileText className="h-4 w-4 shrink-0 text-muted-foreground" />{row.fileName}</span></td>
                  <td className="text-muted-foreground">{row.property}</td>
                  <td><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${row.approvalStatus === "approved" ? "bg-[#B3FFCC] text-black" : row.approvalStatus === "review" || row.approvalStatus === "needs_review" ? "bg-amber-400 text-amber-950" : "bg-muted text-muted-foreground"}`}>{approvalStatusDisplayLabel(row.approvalStatus)}</span></td>
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

function AddDocChoiceModal({ onClose, onUpload, onFromEntrata, onGoogleDrive, onMicrosoft365 }: { onClose: () => void; onUpload: () => void; onFromEntrata: () => void; onGoogleDrive: () => void; onMicrosoft365: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="section-title">Add document</h3>
        <p className="mt-1 text-sm text-muted-foreground">Upload your own file or import from a connected source.</p>
        <div className="mt-6 flex flex-col gap-3">
          <Button variant="outline" className="justify-start gap-3 py-6" onClick={onUpload}>
            <Upload className="h-5 w-5 shrink-0" />
            <span className="text-left"><strong>Upload my document</strong><br /><span className="text-xs font-normal text-muted-foreground">Add a file from your device (PDF, DOC, TXT)</span></span>
          </Button>
          <Button variant="outline" className="justify-start gap-3 py-6" onClick={onFromEntrata}>
            <Building2 className="h-5 w-5 shrink-0" />
            <span className="text-left"><strong>Select from Entrata</strong><br /><span className="text-xs font-normal text-muted-foreground">Choose from premade Entrata templates and policies</span></span>
          </Button>
          <Button variant="outline" className="justify-start gap-3 py-6" onClick={onGoogleDrive}>
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853"/><path d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.72.12-1.42.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84Z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" fill="#EA4335"/></svg>
            <span className="text-left"><strong>Google Drive</strong><br /><span className="text-xs font-normal text-muted-foreground">Import from Google Docs or Google Drive</span></span>
          </Button>
          <Button variant="outline" className="justify-start gap-3 py-6" onClick={onMicrosoft365}>
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 23 23" fill="none"><path d="M1 1h10v10H1z" fill="#F25022"/><path d="M12 1h10v10H12z" fill="#7FBA00"/><path d="M1 12h10v10H1z" fill="#00A4EF"/><path d="M12 12h10v10H12z" fill="#FFB900"/></svg>
            <span className="text-left"><strong>Microsoft 365</strong><br /><span className="text-xs font-normal text-muted-foreground">Import from SharePoint, OneDrive, or Word</span></span>
          </Button>
        </div>
        <div className="mt-5 flex justify-end"><Button variant="ghost" onClick={onClose}>Cancel</Button></div>
      </div>
    </div>
  );
}

function UploadDocModal({
  onClose,
  onSave,
  properties,
  fileInputRef,
  libraryPrefill,
  onClearLibraryPrefill,
}: {
  onClose: () => void;
  onSave: (fileName: string, documentType: VaultItem["documentType"], property?: string, effectiveDate?: string, source?: "upload" | "entrata", body?: string, options?: { scopeLevel?: string; ownerId?: string; propertyId?: string; isInternalOnly?: boolean }) => void;
  properties: string[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  libraryPrefill?: { displayName: string; body: string } | null;
  onClearLibraryPrefill?: () => void;
}) {
  const [fileName, setFileName] = useState("");
  const [property, setProperty] = useState(properties[0] ?? "Portfolio");
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set());
  const [fileBody, setFileBody] = useState("");
  const [pickedFileName, setPickedFileName] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const fileInputId = useId();
  const libraryPrefillAppliedRef = useRef(false);

  const [scopeLevel, setScopeLevel] = useState<"company" | "owner" | "property">("company");
  const [ownerId, setOwnerId] = useState("");
  const [propertyId, setPropertyId] = useState("");

  // Mock owner data
  const OWNERS = ["Smith Investments", "Jones Portfolio", "Capital Group"];

  const selectedPropertyNames = useMemo(
    () => getSelectedPropertyNames(getDataForView("Property List"), selectedPropertyIds),
    [selectedPropertyIds]
  );

  useEffect(() => {
    if (selectedPropertyNames.length > 0) {
      setProperty(selectedPropertyNames[0]);
    }
  }, [selectedPropertyNames]);

  useEffect(() => {
    if (!libraryPrefill) {
      libraryPrefillAppliedRef.current = false;
      return;
    }
    if (libraryPrefillAppliedRef.current) return;
    libraryPrefillAppliedRef.current = true;
    setPickedFileName(libraryPrefill.displayName);
    const base = libraryPrefill.displayName.replace(/\.[^.]+$/, "");
    setFileName(base.trim() || libraryPrefill.displayName);
    setFileBody(libraryPrefill.body);
  }, [libraryPrefill]);

  const clearPickedFile = useCallback(() => {
    setPickedFileName(null);
    setFileBody("");
    setFileName("");
    setFileInputKey((k) => k + 1);
    onClearLibraryPrefill?.();
  }, [onClearLibraryPrefill]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPickedFileName(file.name);
      const base = file.name.replace(/\.[^.]+$/, "");
      setFileName(base.trim() || file.name);
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
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="section-title">{libraryPrefill ? "Add document" : "Upload my document"}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {libraryPrefill
            ? "Your file was imported from the connected library. Confirm the name, type, and scope, then add it to the Vault."
            : "Add a document from your device. For .txt files, content is extracted automatically."}
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor={fileInputId} className="mb-1 block text-xs font-medium text-foreground">File</label>
            <input
              key={fileInputKey}
              id={fileInputId}
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileChange}
              className="sr-only"
              tabIndex={-1}
              aria-label="Choose file"
            />
            {pickedFileName ? (
              <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground" title={pickedFileName}>
                  {pickedFileName}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 shrink-0 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change file
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={clearPickedFile}
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" className="h-9 w-full gap-2" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" />
                Choose file
              </Button>
            )}
            <p className="mt-1 text-[10px] text-muted-foreground">PDF, DOC, DOCX, or TXT. Text content is extracted from .txt files.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Document name</label>
            <input type="text" value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="e.g. Leasing SOP" className="input-base w-full" autoFocus />
          </div>
          <div className="rounded-md border border-border bg-muted/20 p-3 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Where should this apply?</label>
              <select 
                value={scopeLevel} 
                onChange={(e) => setScopeLevel(e.target.value as any)} 
                className="select-base w-full"
              >
                <option value="company">All Properties (Company Policy)</option>
                <option value="owner">Specific Owner Portfolio</option>
                <option value="property">Specific Property</option>
              </select>
            </div>

            {scopeLevel === "owner" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">Select Owner</label>
                <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="select-base w-full">
                  <option value="">Select an owner...</option>
                  {OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            )}

            {scopeLevel === "property" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">Select Properties</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <span className="text-muted-foreground truncate mr-2">
                        {selectedPropertyNames.length > 0 ? selectedPropertyNames.join(", ") : "Select properties..."}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0 z-[60]" align="start" sideOffset={4}>
                    <PropertySelector
                      className="h-[350px] border-0 shadow-none rounded-md"
                      onSelectionChange={(ids) => {
                        setSelectedPropertyIds(ids);
                        const names = getSelectedPropertyNames(getDataForView("Property List"), ids);
                        if (names.length > 0) setPropertyId(names[0]);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() =>
              pickedFileName &&
              fileName.trim() &&
              onSave(fileName.trim(), "sop", property, undefined, "upload", fileBody || undefined, { scopeLevel, ownerId, propertyId })
            }
            disabled={!pickedFileName || !fileName.trim()}
          >
            Upload &amp; add to Vault
          </Button>
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
  const [property, setProperty] = useState("");
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>("review");
  const [body, setBody] = useState("");
  const [nextReviewDate, setNextReviewDate] = useState("");
  const [isTemplate, setIsTemplate] = useState(false);
  const open = !!item;

  useEffect(() => {
    if (item) {
      setFileName(item.fileName);
      setProperty(item.property);
      setApprovalStatus(item.approvalStatus);
      setBody(item.body ?? "");
      setNextReviewDate(item.nextReviewDate ?? "");
      setIsTemplate(item.isTemplate ?? false);
    }
  }, [item?.id, item?.fileName, item?.property, item?.approvalStatus, item?.body, item?.nextReviewDate, item?.isTemplate]);

  const handleSave = () => {
    if (!item) return;
    onSave(item.id, {
      fileName: fileName.trim() || item.fileName,
      property: property || item.property,
      approvalStatus,
      body,
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
              <label className="mb-1 block text-xs font-medium text-foreground">Property</label>
              <select value={property} onChange={(e) => setProperty(e.target.value)} className="select-base w-full">
                {PROPERTIES.filter((p) => p !== "All").map((p) => (<option key={p} value={p}>{p}</option>))}
              </select>
            </div>
            <div><label className="mb-1 block text-xs font-medium text-foreground">Version</label><p className="text-sm text-muted-foreground">{item.version ?? "1.0"} (auto-incremented on approval)</p></div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Approval status</label>
              <select value={approvalStatus} onChange={(e) => setApprovalStatus(e.target.value as ApprovalStatus)} className="select-base w-full">
                <option value="review">Needs review (in approval)</option>
                <option value="needs_review">Needs review (past review date)</option>
                <option value="approved">Approved</option>
              </select>
            </div>
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
  { id: "t-1", name: "Fair Housing Policy", category: "Compliance", documentType: "policy", description: "Outlines fair housing obligations, protected classes, and prohibited practices for all staff and AI agents.", tags: ["compliance", "fair-housing"], body: "<h2>Fair Housing Policy</h2><p>This policy establishes the organization's commitment to compliance with the Fair Housing Act, ensuring all prospects and residents receive equal treatment regardless of protected class status.</p><h3>Protected Classes</h3><p>Federal: Race, color, national origin, religion, sex, familial status, disability.</p><p>Additional state/local classes may apply per property jurisdiction.</p><h3>Prohibited Practices</h3><ul><li>Refusing to rent or negotiate based on protected class</li><li>Imposing different terms, conditions, or privileges</li><li>Advertising with discriminatory preference or limitation</li><li>Steering prospects toward or away from certain units or communities</li></ul><h3>AI Agent Requirements</h3><p>All AI-generated communications must be reviewed against fair housing language guidelines. Agents must not reference protected class information in screening or communication.</p>" },
  { id: "t-2", name: "Screening & Application SOP", category: "Compliance", documentType: "sop", description: "Standard procedure for applicant screening, criteria disclosure, and adverse action notices.", tags: ["compliance", "screening"], body: "<h2>Screening & Application SOP</h2><p>This SOP governs the end-to-end applicant screening process from application intake through final decision notification.</p><h3>Application Intake</h3><ol><li>Collect completed application with required identification</li><li>Verify application fee payment</li><li>Confirm unit availability and hold status</li></ol><h3>Screening Criteria</h3><p>All applicants are evaluated against published criteria including credit score minimums, income-to-rent ratio (typically 3:1), rental history, and criminal background per applicable law.</p><h3>Adverse Action Notices</h3><p>When an application is denied, an adverse action notice must be issued within 5 business days including the specific reason(s) for denial and the applicant's right to dispute.</p>" },
  { id: "t-3", name: "Reasonable Accommodation SOP", category: "Compliance", documentType: "sop", description: "Process for handling accommodation and modification requests under the Fair Housing Act and ADA.", tags: ["compliance", "accommodation"], body: "<h2>Reasonable Accommodation SOP</h2><p>Procedures for receiving, evaluating, and responding to reasonable accommodation and modification requests.</p><h3>Request Intake</h3><p>All requests—verbal or written—must be documented and acknowledged within 2 business days. No specific form or language is required from the requestor.</p><h3>Evaluation Process</h3><ol><li>Verify the individual has a qualifying disability (if not obvious)</li><li>Determine if the requested accommodation is necessary and reasonable</li><li>Engage in interactive process if modification to request is needed</li></ol><h3>Response Timeline</h3><p>Final response within 10 business days. If additional information is needed, request it promptly and document all communication.</p>" },
  { id: "t-4", name: "Leasing & Move-In SOP", category: "Leasing", documentType: "sop", description: "End-to-end leasing workflow from inquiry through lease execution and move-in coordination.", tags: ["leasing"], body: "<h2>Leasing & Move-In SOP</h2><h3>Inquiry & Tour</h3><p>Respond to all inquiries within 1 business hour. Schedule tours within 24 hours of request. Follow up within 48 hours if no application received.</p><h3>Application & Approval</h3><ol><li>Send application invitation with screening criteria disclosure</li><li>Process application within 48 hours of completion</li><li>Issue approval/denial notification with next steps</li></ol><h3>Lease Execution</h3><p>Generate lease documents within 24 hours of approval. Allow 72 hours for applicant review and signature. Collect move-in funds per property policy.</p><h3>Move-In Coordination</h3><ul><li>Schedule move-in inspection</li><li>Prepare welcome packet and key distribution</li><li>Set up utility transfers and parking assignments</li></ul>" },
  { id: "t-5", name: "Renewal & Retention SOP", category: "Leasing", documentType: "sop", description: "Renewal offer timing, retention strategies, rent increase communication, and lease extension handling.", tags: ["leasing", "retention"], body: "<h2>Renewal & Retention SOP</h2><h3>Renewal Timeline</h3><p>Begin renewal outreach 90 days before lease expiration. Send formal offer at 60 days. Final follow-up at 30 days.</p><h3>Retention Strategies</h3><ul><li>Personalized renewal offers based on resident history</li><li>Loyalty incentives for multi-year renewals</li><li>Address maintenance concerns proactively before renewal period</li></ul><h3>Rent Increase Communication</h3><p>Provide written notice per state-required timeline (typically 30-60 days). Include market comparison data when available. Offer to discuss in person.</p>" },
  { id: "t-6", name: "Notice to Vacate SOP", category: "Leasing", documentType: "sop", description: "Procedures for processing move-out notices, scheduling inspections, and final account settlement.", tags: ["leasing", "move-out"], body: "<h2>Notice to Vacate SOP</h2><h3>Notice Processing</h3><p>Log notice date, intended move-out date, and forwarding address. Confirm required notice period is met per lease terms.</p><h3>Pre-Move-Out Inspection</h3><p>Schedule walkthrough 7-10 days before move-out. Document existing conditions and discuss potential charges.</p><h3>Final Account Settlement</h3><ol><li>Complete move-out inspection within 24 hours of key return</li><li>Calculate final charges and deposit disposition</li><li>Send itemized statement within state-required timeframe</li></ol>" },
  { id: "t-7", name: "Maintenance Request SOP", category: "Maintenance", documentType: "sop", description: "Work order intake, prioritization, vendor dispatch, resident communication, and completion tracking.", tags: ["maintenance"], body: "<h2>Maintenance Request SOP</h2><h3>Work Order Intake</h3><p>Accept requests via portal, phone, email, or in-person. Log all requests in the work order system within 1 hour.</p><h3>Prioritization</h3><ul><li><strong>Emergency (P0):</strong> Life safety, flooding, no heat in winter — respond within 1 hour</li><li><strong>Urgent (P1):</strong> No hot water, HVAC failure, appliance leak — respond within 4 hours</li><li><strong>Routine (P2):</strong> Cosmetic repairs, minor appliance issues — respond within 48 hours</li></ul><h3>Resident Communication</h3><p>Send confirmation when work order is created. Notify when tech is dispatched. Confirm completion and request satisfaction feedback.</p>" },
  { id: "t-8", name: "Emergency Maintenance SOP", category: "Maintenance", documentType: "sop", description: "After-hours emergency response procedures for floods, fires, lock-outs, and HVAC failures.", tags: ["maintenance", "emergency"], body: "<h2>Emergency Maintenance SOP</h2><h3>Emergency Classification</h3><p>The following qualify as after-hours emergencies: active water leaks or flooding, fire or smoke, gas leak or odor, no heat when below 50°F, complete electrical outage, lock-out (safety concern), sewer backup.</p><h3>Response Protocol</h3><ol><li>Instruct resident on immediate safety steps (evacuate if fire/gas)</li><li>Dispatch on-call technician within 30 minutes</li><li>Contact vendor if specialized response needed</li><li>Notify property manager for any incident requiring insurance claim</li></ol><h3>Documentation</h3><p>Complete incident report within 24 hours. Include photos, timeline, and remediation steps.</p>" },
  { id: "t-9", name: "Unit Turn & Make-Ready SOP", category: "Maintenance", documentType: "sop", description: "Checklist and timeline for turning units between residents, including inspection and punch list.", tags: ["maintenance", "turns"], body: "<h2>Unit Turn & Make-Ready SOP</h2><h3>Turn Timeline</h3><p>Target: 5-7 day turn for standard units. Begin within 24 hours of move-out inspection completion.</p><h3>Inspection Checklist</h3><ul><li>Walls, ceilings, trim — patch, paint, clean</li><li>Flooring — clean, repair, or replace</li><li>Appliances — clean, test, replace filters</li><li>Plumbing — test fixtures, clear drains, check for leaks</li><li>HVAC — replace filter, test operation</li><li>Safety — test smoke/CO detectors, check locks and deadbolts</li></ul><h3>Final Walkthrough</h3><p>Property manager signs off on completed punch list before unit is listed as available.</p>" },
  { id: "t-10", name: "Rent Collection & Delinquency SOP", category: "Payments", documentType: "sop", description: "Payment processing, late fee policies, delinquency follow-up cadence, and payment plan procedures.", tags: ["payments"], body: "<h2>Rent Collection & Delinquency SOP</h2><h3>Payment Processing</h3><p>Rent is due on the 1st. Grace period through the 5th (per lease). Late fees applied automatically on the 6th.</p><h3>Delinquency Follow-Up</h3><ol><li>Day 6: Automated late notice + late fee posting</li><li>Day 10: Personal outreach (call or email) to discuss payment</li><li>Day 15: Formal demand letter with payment plan option</li><li>Day 20: Final notice before legal/eviction proceedings</li></ol><h3>Payment Plans</h3><p>Available at manager discretion for residents with good payment history. Maximum 3-month repayment term. Must be documented in writing.</p>" },
  { id: "t-11", name: "Refund & Credit Policy", category: "Payments", documentType: "policy", description: "Guidelines for issuing refunds, concessions, and account credits with approval thresholds.", tags: ["payments"], body: "<h2>Refund & Credit Policy</h2><h3>Approval Thresholds</h3><ul><li>Under $100: Property Manager approval</li><li>$100–$500: Regional Manager approval</li><li>Over $500: VP of Operations approval</li></ul><h3>Processing</h3><p>Refunds processed within 5 business days of approval. Credits applied to resident ledger same day. All refunds require documented justification.</p>" },
  { id: "t-12", name: "Resident Complaint Escalation SOP", category: "Resident Relations", documentType: "sop", description: "How to receive, log, escalate, and resolve resident complaints across all channels.", tags: ["resident-relations", "escalation"], body: "<h2>Resident Complaint Escalation SOP</h2><h3>Intake</h3><p>All complaints logged in the escalation system regardless of channel (in-person, phone, email, portal, social media). Acknowledge receipt within 4 hours.</p><h3>Escalation Tiers</h3><ol><li><strong>Tier 1:</strong> On-site staff — resolve within 24 hours</li><li><strong>Tier 2:</strong> Property Manager — if unresolved after 48 hours or resident requests escalation</li><li><strong>Tier 3:</strong> Regional Manager — recurring complaints or legal/liability concerns</li></ol><h3>Resolution & Follow-Up</h3><p>Document resolution. Follow up with resident within 48 hours of resolution to confirm satisfaction. Log outcome for reporting.</p>" },
  { id: "t-13", name: "Pet & Animal Policy", category: "General", documentType: "policy", description: "Pet policies, breed restrictions, pet deposits, and assistance animal verification procedures.", tags: ["policy"], body: "<h2>Pet & Animal Policy</h2><h3>Pet Policy</h3><p>Maximum 2 pets per unit. Pet deposit and monthly pet rent per lease addendum. Breed and weight restrictions per property.</p><h3>Assistance Animals</h3><p>Assistance animals (service animals and emotional support animals) are NOT pets. No pet deposit, pet rent, or breed/weight restrictions apply. Reasonable documentation of disability-related need may be requested per HUD guidance.</p><h3>Violations</h3><p>Unauthorized pets subject to lease violation notice and applicable fees. Repeated violations may result in lease non-renewal.</p>" },
  { id: "t-14", name: "Vendor Management SOP", category: "General", documentType: "sop", description: "Vendor onboarding, insurance verification, performance tracking, and invoice approval workflows.", tags: ["operations", "vendors"], body: "<h2>Vendor Management SOP</h2><h3>Onboarding</h3><p>All vendors must provide: W-9, certificate of insurance (minimum $1M general liability), business license, and signed vendor agreement.</p><h3>Insurance Verification</h3><p>Verify COI annually. Set calendar reminders 30 days before expiration. Suspend vendor access if lapsed.</p><h3>Performance Tracking</h3><ul><li>Response time to dispatch</li><li>Quality of work (callback rate)</li><li>Invoice accuracy</li><li>Resident satisfaction scores</li></ul><h3>Invoice Approval</h3><p>Invoices matched to PO/work order. Under $1,000: auto-approved if within estimate. Over $1,000: Property Manager review required.</p>" },
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
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewTemplate = previewId ? SOP_TEMPLATES.find((t) => t.id === previewId) : null;

  const filtered = categoryFilter === "All"
    ? SOP_TEMPLATES
    : SOP_TEMPLATES.filter((t) => t.category === categoryFilter);

  const handleAdd = (template: (typeof SOP_TEMPLATES)[0]) => {
    onAdd(template);
    setAddedIds((prev) => new Set(prev).add(template.id));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setPreviewId(null); }}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        {previewTemplate ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPreviewId(null)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <ChevronRight className="h-4 w-4 rotate-180" />
                </button>
                <div>
                  <DialogTitle>{previewTemplate.name}</DialogTitle>
                  <DialogDescription>{previewTemplate.category} · {previewTemplate.documentType}</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto -mx-6 px-6">
              <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: previewTemplate.body ?? "<p>No preview content available.</p>" }} />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setPreviewId(null)}>Back to list</Button>
              {existingDocNames.some((n) => n.toLowerCase() === previewTemplate.name.toLowerCase()) || addedIds.has(previewTemplate.id) ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 px-3">
                  <CheckCircle className="h-3.5 w-3.5" /> {addedIds.has(previewTemplate.id) ? "Added" : "In library"}
                </span>
              ) : (
                <Button size="sm" onClick={() => handleAdd(previewTemplate)}>
                  <Plus className="h-3 w-3" /> Add to library
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Explore SOP Templates
              </DialogTitle>
              <DialogDescription>
                Browse templates to jumpstart your document library. Preview any template, then add it for review and customize for your portfolio.
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
                          <button type="button" onClick={() => setPreviewId(template.id)} className="text-sm font-medium text-foreground hover:text-primary hover:underline text-left">
                            {template.name}
                          </button>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{template.description}</p>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5 pt-0.5">
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => setPreviewId(template.id)}>
                          Preview
                        </Button>
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
          </>
        )}
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
